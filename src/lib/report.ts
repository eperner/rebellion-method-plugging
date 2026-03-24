import { jsPDF } from "jspdf";
import type { CalculationResult, CalculatorKind, ReportRecord } from "../types";
import { titleFromKind } from "./format";

export async function exportReportPdf(
  kind: CalculatorKind,
  wellName: string,
  result: CalculationResult,
): Promise<ReportRecord> {
  const doc = new jsPDF({
    unit: "pt",
    format: "letter",
  });

  const createdAt = new Date().toISOString();
  const title = wellName ? `${wellName} - ${titleFromKind(kind)}` : titleFromKind(kind);

  let y = 54;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(title, 48, y);

  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(new Date(createdAt).toLocaleString(), 48, y);

  y += 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(result.subtitle, 48, y);

  y += 24;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Primary outputs", 48, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  for (const field of result.primary) {
    doc.text(`${field.label}: ${field.value}`, 48, y);
    y += 14;
  }

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Secondary outputs", 48, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  for (const field of result.secondary) {
    doc.text(`${field.label}: ${field.value}`, 48, y);
    y += 14;
  }

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 48, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  const wrapped = doc.splitTextToSize(result.reportSummary, 520);
  doc.text(wrapped, 48, y);

  const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  doc.save(`${safeName || "res-cement-report"}.pdf`);

  return {
    id: crypto.randomUUID(),
    createdAt,
    calculator: kind,
    title,
    summary: result.reportSummary,
    outputs: result.primary,
  };
}
