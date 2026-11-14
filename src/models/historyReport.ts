import PDFDocument from "pdfkit";
import type {
  HistoryEvent,
  HistoryFilter,
  HistorySummary,
  HistorySummaryItem,
} from "./history";

/** Teto de linhas do relatório (o PDF não é paginado como a listagem). */
export const REPORT_MAX_EVENTS = 1000;

export interface HistoryReportData {
  userName: string;
  filter: HistoryFilter;
  from: Date | null;
  to: Date | null;
  generatedAt: Date;
  summary: HistorySummary;
  events: HistoryEvent[];
  /** Há mais eventos do que o teto do relatório. */
  truncated: boolean;
}

const TIME_ZONE = process.env.REMINDER_TZ || "America/Sao_Paulo";

// Mesmas cores do front (src/index.css).
const COLORS = {
  forest: "#4f6f52",
  heading: "#334a38",
  muted: "#6b7065",
  faint: "#9aa093",
  sage: "#e3eadd",
  border: "#e6e4da",
};

const FILTER_LABELS: Record<HistoryFilter, string> = {
  all: "Tudo",
  doses: "Doses tomadas",
  alarms: "Alarmes",
  sos: "Ligações SOS",
  finished: "Medicamentos terminados",
};

// TODO(SOS): remover quando o botão SOS existir e gravar eventos SOS_CALL.
const SOS_PENDING = "Sem registro (botão SOS em desenvolvimento)";

const MARGIN = 50;
const FOOTER_SPACE = 30;
const COLUMNS = [
  { title: "Data e hora", width: 95 },
  { title: "Evento", width: 125 },
  { title: "Medicamento", width: 150 },
  { title: "Detalhes", width: 125 },
];
const CELL_PADDING = 6;

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(",", "");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function periodLabel(from: Date | null, to: Date | null) {
  if (from && to) return `${formatDate(from)} a ${formatDate(to)}`;
  if (from) return `A partir de ${formatDate(from)}`;
  if (to) return `Até ${formatDate(to)}`;
  return "Todo o período";
}

function eventLabel(event: HistoryEvent) {
  switch (event.type) {
    case "DOSE_TAKEN":
      return "Dose tomada";
    case "ALARM":
      return "Alarme disparado";
    case "SOS_CALL":
      return "Ligação SOS";
    case "MEDICATION_FINISHED":
      return event.finishedReason === "REMOVED"
        ? "Medicamento removido"
        : "Tratamento concluído";
  }
}

function eventDetails(event: HistoryEvent) {
  const reminder = event.scheduledTime
    ? `Lembrete das ${event.scheduledTime}`
    : null;

  if (event.type === "DOSE_TAKEN") {
    return [event.dosageLabel, reminder].filter(Boolean).join(" · ") || "—";
  }
  if (event.type === "ALARM") return reminder || "—";
  if (event.type === "MEDICATION_FINISHED") return event.dosageLabel || "—";
  return "—";
}

function summaryText(item: HistorySummaryItem | null, empty: string) {
  if (!item) return empty;
  const parts = [formatDateTime(item.occurredAt), item.medicationName];
  if (item.scheduledTime) parts.push(`lembrete das ${item.scheduledTime}`);
  return parts.filter(Boolean).join(" · ");
}

function emptyMessage(filter: HistoryFilter) {
  if (filter === "sos") {
    return "O botão SOS ainda está em desenvolvimento: não há ligações registradas.";
  }
  return "Nenhum registro encontrado para este filtro e período.";
}

/** Monta o PDF do histórico e devolve o arquivo em memória. */
function build(data: HistoryReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      bufferPages: true,
      info: { Title: "Relatório de histórico — sync." },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const contentWidth = doc.page.width - MARGIN * 2;
    const bottomLimit = () => doc.page.height - MARGIN - FOOTER_SPACE;

    // --- Cabeçalho ---
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor(COLORS.forest)
      .text("sync.");
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(COLORS.heading)
      .text("Relatório de histórico");
    doc.moveDown(0.6);

    const meta: [string, string][] = [
      ["Usuário", data.userName],
      ["Período", periodLabel(data.from, data.to)],
      ["Filtro", FILTER_LABELS[data.filter]],
      ["Gerado em", formatDateTime(data.generatedAt)],
    ];
    doc.fontSize(10);
    for (const [label, value] of meta) {
      doc
        .font("Helvetica-Bold")
        .fillColor(COLORS.heading)
        .text(`${label}: `, { continued: true })
        .font("Helvetica")
        .fillColor(COLORS.muted)
        .text(value);
    }

    const sectionTitle = (title: string) => {
      doc.moveDown(1);
      doc
        .moveTo(MARGIN, doc.y)
        .lineTo(MARGIN + contentWidth, doc.y)
        .strokeColor(COLORS.border)
        .stroke();
      doc.moveDown(0.8);
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(COLORS.heading)
        .text(title, MARGIN);
      doc.moveDown(0.5);
    };

    // --- Resumo ---
    sectionTitle("Resumo");
    const summaryLines: [string, string][] = [
      [
        "Última dose tomada",
        summaryText(data.summary.lastDose, "Sem registro"),
      ],
      ["Último alarme", summaryText(data.summary.lastAlarm, "Sem registro")],
      ["Última ligação SOS", summaryText(data.summary.lastSos, SOS_PENDING)],
    ];
    doc.fontSize(10);
    for (const [label, value] of summaryLines) {
      doc
        .font("Helvetica-Bold")
        .fillColor(COLORS.heading)
        .text(`${label}: `, { continued: true })
        .font("Helvetica")
        .fillColor(COLORS.muted)
        .text(value);
      doc.moveDown(0.2);
    }

    // --- Eventos ---
    sectionTitle(`Eventos (${data.events.length})`);

    const drawRow = (cells: string[], header: boolean) => {
      doc.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(9);
      const height =
        Math.max(
          ...cells.map((text, i) =>
            doc.heightOfString(text, {
              width: COLUMNS[i].width - CELL_PADDING * 2,
            }),
          ),
        ) +
        CELL_PADDING * 2;

      if (doc.y + height > bottomLimit()) {
        doc.addPage();
        if (!header) drawHeaderRow();
        doc.font("Helvetica").fontSize(9);
      }

      const top = doc.y;
      if (header) {
        doc.rect(MARGIN, top, contentWidth, height).fill(COLORS.sage);
      }

      let x = MARGIN;
      doc.fillColor(header ? COLORS.heading : COLORS.muted);
      cells.forEach((text, i) => {
        doc.text(text, x + CELL_PADDING, top + CELL_PADDING, {
          width: COLUMNS[i].width - CELL_PADDING * 2,
        });
        x += COLUMNS[i].width;
      });

      doc
        .moveTo(MARGIN, top + height)
        .lineTo(MARGIN + contentWidth, top + height)
        .strokeColor(COLORS.border)
        .stroke();
      doc.x = MARGIN;
      doc.y = top + height;
    };

    function drawHeaderRow() {
      drawRow(
        COLUMNS.map((column) => column.title),
        true,
      );
    }

    if (data.events.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(COLORS.muted)
        .text(emptyMessage(data.filter), MARGIN);
    } else {
      drawHeaderRow();
      for (const event of data.events) {
        drawRow(
          [
            formatDateTime(event.occurredAt),
            eventLabel(event),
            event.medicationName || "—",
            eventDetails(event),
          ],
          false,
        );
      }

      if (data.truncated) {
        doc.moveDown(0.8);
        doc
          .font("Helvetica-Oblique")
          .fontSize(9)
          .fillColor(COLORS.faint)
          .text(
            `Mostrando os ${REPORT_MAX_EVENTS} eventos mais recentes. Reduza o período para ver os demais.`,
            MARGIN,
          );
      }
    }

    // --- Rodapé (número da página) ---
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.page.margins.bottom = 0; // evita página extra ao escrever no rodapé
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.faint)
        .text(
          `sync. — registro de confirmações de dose; não substitui orientação profissional.   Página ${i + 1} de ${range.count}`,
          MARGIN,
          doc.page.height - MARGIN,
          { width: contentWidth, align: "center", lineBreak: false },
        );
    }

    doc.end();
  });
}

const historyReport = {
  build,
};

export default historyReport;
