// Worker de lembretes: a cada minuto aciona o endpoint que dispara os pushes
// das doses vencidas. Mantido fora do Next (que não tem processo contínuo).
//
// Rodar com as variáveis de ambiente carregadas, por ex.:
//   npm run reminders
//
// Variáveis usadas: PUBLIC_API_URL, CRON_SECRET, REMINDER_TZ.
import cron from "node-cron";

const API_BASE = process.env.PUBLIC_API_URL || "http://localhost:3001/api";
const SECRET = process.env.CRON_SECRET || "";
const TIMEZONE = process.env.REMINDER_TZ || "America/Sao_Paulo";

async function tick() {
  try {
    const response = await fetch(`${API_BASE}/jobs/dispatch-reminders`, {
      method: "POST",
      headers: { "x-cron-secret": SECRET },
    });
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      console.log(`[reminders] ${new Date().toISOString()}`, body);
    } else {
      console.error(`[reminders] HTTP ${response.status}`, body);
    }
  } catch (error) {
    console.error("[reminders] erro ao acionar o endpoint:", error.message);
  }
}

if (!SECRET) {
  console.warn(
    "[reminders] CRON_SECRET vazio — o endpoint vai recusar (401). Defina em .env.development.",
  );
}

console.log(
  `[reminders] worker iniciado (a cada minuto, TZ=${TIMEZONE}). Alvo: ${API_BASE}/jobs/dispatch-reminders`,
);

cron.schedule("* * * * *", tick, { timezone: TIMEZONE });

// Dispara uma vez ao subir, para não esperar o próximo minuto cheio.
tick();
