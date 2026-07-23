import { Router, type IRouter } from "express";
import { randomBytes } from "node:crypto";
import { writeFile, readFile, access, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

// Store uploads locally in the uploads/ directory next to the server
const UPLOADS_DIR = join(process.cwd(), "uploads");

// Ensure the uploads directory exists at startup
mkdir(UPLOADS_DIR, { recursive: true }).catch(() => {/* already exists */});

// Upload image — saves to local disk, returns a proxied /api/uploads/ URL
router.post("/upload", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { base64, mimeType } = req.body as { base64?: string; mimeType?: string };
    if (!base64 || !mimeType) {
      res.status(400).json({ error: "base64 and mimeType are required" });
      return;
    }

    const ext = mimeType.includes("png") ? "png" : "jpg";
    const filename = `${randomBytes(16).toString("hex")}.${ext}`;
    const filepath = join(UPLOADS_DIR, filename);

    const buffer = Buffer.from(base64, "base64");
    await writeFile(filepath, buffer);

    res.json({ url: `/api/uploads/${filename}` });
  } catch (err: any) {
    console.error("Upload error:", err);
    // Give the client a useful message instead of a generic 500
    const msg = err?.code === "ENOENT"
      ? "Dossier uploads introuvable sur le serveur"
      : err?.message ?? "Upload failed";
    res.status(500).json({ error: msg });
  }
});

// Serve uploaded files from local disk
router.get("/uploads/:filename", async (req, res): Promise<void> => {
  try {
    const filename = req.params.filename as string;
    // Basic security: no path traversal
    if (filename.includes("..") || filename.includes("/")) {
      res.status(400).json({ error: "Invalid filename" });
      return;
    }

    const filepath = join(UPLOADS_DIR, filename);

    try {
      await access(filepath);
    } catch {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const buffer = await readFile(filepath);
    const ext = filename.split(".").pop()?.toLowerCase();
    const contentType = ext === "png" ? "image/png" : "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch (err) {
    console.error("File serve error:", err);
    res.status(500).json({ error: "Could not serve file" });
  }
});

export default router;
