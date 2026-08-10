import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ─── Brand constants ───────────────────────────────────────────────────────────
const BRAND_BLACK = "#18181b";
const BRAND_GRAY = "#3f3f46";
const BRAND_LIGHT = "#f4f4f5";
const BRAND_MID = "#a1a1aa";

export interface ExportSheet {
  name: string;
  columns: string[];
  rows: (string | number | null | undefined)[][];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function fmt(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return String(val);
}

function nowStr() {
  return new Date().toLocaleString("en-KE", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

// ─── PDF export ────────────────────────────────────────────────────────────────
export function exportPDF(reportTitle: string, sheets: ExportSheet[]): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  function drawHeader(title: string, subtitle?: string) {
    // Black header band
    doc.setFillColor(...hexToRgb(BRAND_BLACK));
    doc.rect(0, 0, pageW, 22, "F");

    // Logo
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("inndos", margin, 14);

    // Report title in header
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(title, pageW - margin, 14, { align: "right" });

    // Subtitle / date strip
    doc.setFillColor(...hexToRgb(BRAND_LIGHT));
    doc.rect(0, 22, pageW, 8, "F");
    doc.setTextColor(...hexToRgb(BRAND_GRAY));
    doc.setFontSize(7.5);
    if (subtitle) doc.text(subtitle, margin, 27.5);
    doc.text(`Generated: ${nowStr()}`, pageW - margin, 27.5, { align: "right" });

    return 34; // Y position after header
  }

  function drawFooter(pageNum: number, total: number) {
    doc.setTextColor(...hexToRgb(BRAND_MID));
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Confidential – inndos platform`,
      margin,
      pageH - 5
    );
    doc.text(
      `Page ${pageNum} of ${total}`,
      pageW - margin,
      pageH - 5,
      { align: "right" }
    );
  }

  let isFirstSheet = true;

  sheets.forEach((sheet, si) => {
    if (!isFirstSheet) doc.addPage();
    isFirstSheet = false;

    let y = drawHeader(reportTitle, sheet.name);

    // Section heading
    doc.setTextColor(...hexToRgb(BRAND_BLACK));
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(sheet.name, margin, y + 6);
    y += 12;

    // Row count
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexToRgb(BRAND_GRAY));
    doc.text(`${sheet.rows.length} record${sheet.rows.length !== 1 ? "s" : ""}`, margin, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [sheet.columns],
      body: sheet.rows.map((row) => row.map(fmt)),
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        overflow: "linebreak",
        textColor: hexToRgb(BRAND_BLACK),
      },
      headStyles: {
        fillColor: hexToRgb(BRAND_BLACK),
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
      },
      alternateRowStyles: {
        fillColor: hexToRgb(BRAND_LIGHT),
      },
      didDrawPage: (data) => {
        // Redraw header on continuation pages
        if (data.pageNumber > 1) drawHeader(reportTitle, sheet.name);
      },
    });

    // Footers — we don't know total pages yet, so we'll add page numbers post-hoc
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      drawFooter(p, pageCount);
    }
  });

  // Final page numbers pass (covers all pages)
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  const slug = reportTitle.toLowerCase().replace(/\s+/g, "-");
  doc.save(`inndos-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Excel export ──────────────────────────────────────────────────────────────
export function exportExcel(reportTitle: string, sheets: ExportSheet[]): void {
  const wb = XLSX.utils.book_new();

  // Cover sheet
  const coverData = [
    ["inndos Platform Report"],
    [reportTitle],
    [`Generated: ${nowStr()}`],
    [`Total sections: ${sheets.length}`],
    [],
    ["Sections included:"],
    ...sheets.map((s) => [`  • ${s.name} (${s.rows.length} records)`]),
  ];
  const coverWs = XLSX.utils.aoa_to_sheet(coverData);
  coverWs["A1"] = { v: "inndos Platform Report", t: "s" };
  // Style title row bold — xlsx doesn't natively style without xlsx-style but we can set column width
  coverWs["!cols"] = [{ wch: 50 }];
  XLSX.utils.book_append_sheet(wb, coverWs, "Cover");

  // Data sheets
  sheets.forEach((sheet) => {
    const wsData = [
      [`inndos – ${sheet.name}`],
      [`Report: ${reportTitle}`],
      [`Generated: ${nowStr()}`],
      [],
      sheet.columns,
      ...sheet.rows.map((row) => row.map(fmt)),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto column widths
    const colWidths = sheet.columns.map((col, ci) => {
      const dataMax = sheet.rows.reduce((max, row) => {
        const cell = row[ci];
        return Math.max(max, fmt(cell).length);
      }, col.length);
      return { wch: Math.min(Math.max(dataMax, col.length) + 2, 50) };
    });
    ws["!cols"] = colWidths;

    // Truncate sheet name to 31 chars (Excel limit)
    const safeName = sheet.name.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  const slug = reportTitle.toLowerCase().replace(/\s+/g, "-");
  XLSX.writeFile(wb, `inndos-${slug}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Shared data formatters ────────────────────────────────────────────────────
export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", { dateStyle: "medium" });
}
export function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `KES ${Number(n).toLocaleString()}`;
}
export function fmtStatus(s: string | null | undefined): string {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
