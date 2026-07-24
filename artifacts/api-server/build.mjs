import * as esbuild from "esbuild";
import { pino } from "esbuild-plugin-pino";

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/index.mjs",
  sourcemap: true,
  packages: "external",
  plugins: [pino({ transports: ["pino-pretty"] })],
});
