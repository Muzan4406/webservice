import { logger } from "./logger";

const TELEGRAM_API = "https://api.telegram.org";

function getBotConfig(): { token: string; chatId: string } | null {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  const chatId = process.env["TELEGRAM_CHAT_ID"];
  if (!token || !chatId) return null;
  return { token, chatId };
}

export async function sendAlert(message: string): Promise<void> {
  const config = getBotConfig();
  if (!config) return; // silently skip if not configured

  try {
    const res = await fetch(
      `${TELEGRAM_API}/bot${config.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );
    if (!res.ok) {
      const body = await res.text();
      logger.warn({ status: res.status, body }, "Telegram alert failed");
    }
  } catch (err) {
    logger.warn({ err }, "Telegram alert error");
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const tg = {
  depositCreated(opts: {
    username: string;
    userId: string;
    amount: number;
    type: string;
    operator: string;
    oneXbetAccountId: string;
    country?: string | null;
  }) {
    const flag = countryFlag(opts.country);
    return sendAlert(
      `💰 <b>Nouveau dépôt</b>\n` +
      `👤 ${opts.username} (${opts.userId})\n` +
      `💵 ${fmt(opts.amount)} FCFA\n` +
      `📱 ${opts.operator} • ${opts.type}${flag ? ` • ${flag}` : ""}\n` +
      `🏦 Compte 1xBet : <code>${opts.oneXbetAccountId}</code>`
    );
  },

  depositSendavapay(opts: {
    username: string;
    userId: string;
    amount: number;
    reference: string;
    country?: string | null;
  }) {
    const flag = countryFlag(opts.country);
    return sendAlert(
      `💰 <b>Dépôt SendavaPay confirmé</b>\n` +
      `👤 ${opts.username} (${opts.userId})\n` +
      `💵 ${fmt(opts.amount)} FCFA${flag ? ` • ${flag}` : ""}\n` +
      `🔖 Réf : <code>${opts.reference}</code>`
    );
  },

  depositValidated(opts: {
    username: string;
    userId: string;
    amount: number;
    depositId: number;
  }) {
    return sendAlert(
      `✅ <b>Dépôt validé</b>\n` +
      `👤 ${opts.username} (${opts.userId})\n` +
      `💵 ${fmt(opts.amount)} FCFA\n` +
      `🆔 Dépôt #${opts.depositId}`
    );
  },

  depositRejected(opts: {
    username: string;
    userId: string;
    amount: number;
    depositId: number;
    reason?: string | null;
  }) {
    return sendAlert(
      `❌ <b>Dépôt rejeté</b>\n` +
      `👤 ${opts.username} (${opts.userId})\n` +
      `💵 ${fmt(opts.amount)} FCFA\n` +
      `🆔 Dépôt #${opts.depositId}` +
      (opts.reason ? `\n📝 Motif : ${opts.reason}` : "")
    );
  },

  withdrawalCreated(opts: {
    username: string;
    userId: string;
    amount: number;
    operator: string;
    phone: string;
    country?: string | null;
  }) {
    const flag = countryFlag(opts.country);
    return sendAlert(
      `📤 <b>Nouvelle demande de retrait</b>\n` +
      `👤 ${opts.username} (${opts.userId})\n` +
      `💵 ${fmt(opts.amount)} FCFA\n` +
      `📱 ${opts.operator} • <code>${opts.phone}</code>${flag ? ` • ${flag}` : ""}`
    );
  },

  withdrawalProcessed(opts: {
    username: string;
    userId: string;
    amount: number;
    withdrawalId: number;
  }) {
    return sendAlert(
      `✅ <b>Retrait traité</b>\n` +
      `👤 ${opts.username} (${opts.userId})\n` +
      `💵 ${fmt(opts.amount)} FCFA\n` +
      `🆔 Retrait #${opts.withdrawalId}`
    );
  },

  vipActivated(opts: { username: string; userId: string; amount?: number }) {
    return sendAlert(
      `⭐ <b>VIP activé</b>\n` +
      `👤 ${opts.username} (${opts.userId})` +
      (opts.amount ? `\n💵 ${fmt(opts.amount)} FCFA` : "")
    );
  },

  newUser(opts: {
    username: string;
    userId: string;
    country?: string | null;
    referredBy?: string | null;
  }) {
    const flag = countryFlag(opts.country);
    return sendAlert(
      `🆕 <b>Nouvel utilisateur</b>\n` +
      `👤 ${opts.username} (${opts.userId})${flag ? ` ${flag}` : ""}` +
      (opts.referredBy ? `\n🔗 Parrainé par : ${opts.referredBy}` : "")
    );
  },
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmt(amount: number): string {
  return amount.toLocaleString("fr-FR");
}

function countryFlag(country?: string | null): string {
  if (!country || country.length !== 2) return "";
  return country
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}
