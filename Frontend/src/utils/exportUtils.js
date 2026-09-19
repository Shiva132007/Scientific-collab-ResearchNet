/**
 * exportUtils.js — Professional export utilities (CSV + PDF)
 * Supports client-side CSV/PDF generation and authenticated backend downloads.
 */

// ─────────────────────────────────────────────────────────
// CSV EXPORT (client-side)
// ─────────────────────────────────────────────────────────

/**
 * Export an array of objects to a downloaded CSV file.
 * @param {string} filename - Base file name (no extension)
 * @param {Array<Object>} data - Array of data objects
 * @param {Array<{label: string, key: string}>} columns - Column definitions
 */
export function exportToCSV(filename, data, columns) {
  if (!data || !data.length) {
    alert("No data available to export.");
    return;
  }

  const BOM = "\uFEFF";
  const headers = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(",");
  const rows = data.map((item) =>
    columns
      .map((col) => {
        let val = item[col.key];
        if (val === null || val === undefined) val = "";
        if (typeof val === "object") val = JSON.stringify(val);
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csvContent = BOM + [headers, ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─────────────────────────────────────────────────────────
// PDF EXPORT (client-side via print window)
// ─────────────────────────────────────────────────────────

/**
 * Renders a beautiful, printable HTML report in a new window.
 * @param {string} title - Report title
 * @param {Array<string>} headers - Table column headers
 * @param {Array<Array<string>>} rows - Table data rows
 * @param {Object} [meta] - Optional metadata: { subtitle, stats }
 */
export function triggerPDFPrint(title, headers, rows, meta = {}) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to use the PDF export feature.");
    return;
  }

  const { subtitle = "", stats = [] } = meta;
  const generatedAt = new Date().toLocaleString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const statsHtml = stats.length
    ? `<div class="stats-row">${stats
        .map((s) => `<div class="stat-box"><div class="stat-val">${s.value}</div><div class="stat-lbl">${s.label}</div></div>`)
        .join("")}</div>`
    : "";

  const tableRows = rows
    .map(
      (row, i) =>
        `<tr class="${i % 2 === 0 ? "row-even" : "row-odd"}">${row
          .map((cell) => `<td>${cell != null ? String(cell) : "—"}</td>`)
          .join("")}</tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title} — Scientific Network Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      padding: 0;
    }

    .page-wrapper {
      max-width: 980px;
      margin: 0 auto;
      background: #ffffff;
      min-height: 100vh;
    }

    /* ── Header Banner ── */
    .report-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1a4480 100%);
      color: white;
      padding: 40px 48px 32px;
    }

    .report-org {
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.55);
      margin-bottom: 12px;
    }

    .report-title {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1.2;
      color: #ffffff;
      margin-bottom: 10px;
    }

    .report-subtitle {
      font-size: 0.9rem;
      color: rgba(255,255,255,0.65);
      line-height: 1.5;
    }

    .report-meta-bar {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.15);
      font-size: 0.8rem;
      color: rgba(255,255,255,0.6);
      flex-wrap: wrap;
    }

    .meta-chip {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* ── Stats ── */
    .stats-row {
      display: flex;
      gap: 16px;
      padding: 28px 48px;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      flex-wrap: wrap;
    }

    .stat-box {
      flex: 1;
      min-width: 120px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }

    .stat-val {
      font-size: 1.7rem;
      font-weight: 800;
      color: #1e40af;
      line-height: 1;
      margin-bottom: 4px;
    }

    .stat-lbl {
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    /* ── Content body ── */
    .content-body { padding: 32px 48px 48px; }

    .section-label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 14px;
    }

    /* ── Table ── */
    .data-table-wrap {
      overflow-x: auto;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }

    thead tr {
      background: linear-gradient(90deg, #1e40af, #1d4ed8);
    }

    thead th {
      padding: 12px 16px;
      text-align: left;
      font-weight: 700;
      font-size: 0.72rem;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.9);
      white-space: nowrap;
    }

    .row-even td { background: #ffffff; }
    .row-odd td { background: #f8fafc; }

    td {
      padding: 11px 16px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      vertical-align: middle;
      max-width: 240px;
      word-break: break-word;
    }

    tr:last-child td { border-bottom: none; }

    /* ── Empty state ── */
    .empty-note {
      padding: 40px;
      text-align: center;
      color: #94a3b8;
      font-size: 0.9rem;
    }

    /* ── Footer ── */
    .report-footer {
      background: #0f172a;
      color: rgba(255,255,255,0.45);
      padding: 18px 48px;
      font-size: 0.72rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    /* ── Print button ── */
    .print-toolbar {
      padding: 16px 48px;
      background: #e0f2fe;
      border-bottom: 1px solid #bae6fd;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .print-btn {
      padding: 10px 22px;
      background: linear-gradient(135deg, #1d4ed8, #2563eb);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.88rem;
      font-weight: 700;
      font-family: inherit;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 6px rgba(29,78,216,0.35);
    }

    .print-btn:hover { background: linear-gradient(135deg, #1e40af, #1d4ed8); }

    .print-note {
      font-size: 0.8rem;
      color: #0369a1;
    }

    @media print {
      .print-toolbar { display: none !important; }
      body { background: white; }
      .page-wrapper { max-width: 100%; }
      .report-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div class="page-wrapper">
  <div class="print-toolbar">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <span class="print-note">Use "Save as PDF" in your browser's print dialog to download a PDF file.</span>
  </div>

  <div class="report-header">
    <div class="report-org">Scientific Collaboration Network Analyzer</div>
    <h1 class="report-title">${title}</h1>
    ${subtitle ? `<p class="report-subtitle">${subtitle}</p>` : ""}
    <div class="report-meta-bar">
      <span class="meta-chip">📅 Generated: ${generatedAt}</span>
      <span class="meta-chip">📊 ${rows.length.toLocaleString()} record${rows.length !== 1 ? "s" : ""}</span>
    </div>
  </div>

  ${statsHtml}

  <div class="content-body">
    <div class="section-label">Data Table</div>
    ${
      rows.length === 0
        ? `<div class="empty-note">No data available for this report.</div>`
        : `<div class="data-table-wrap">
        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`
    }
  </div>

  <div class="report-footer">
    <span>Scientific Collaboration Network Analyzer — Confidential Report</span>
    <span>${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
  </div>
</div>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}

// ─────────────────────────────────────────────────────────
// AUTHENTICATED BACKEND DOWNLOAD
// ─────────────────────────────────────────────────────────

/**
 * Downloads a file from a backend endpoint that requires JWT authentication.
 * @param {string} url - Backend URL to fetch
 * @param {string} defaultFilename - Fallback file name
 * @returns {Promise<void>}
 */
export async function downloadFromBackend(url, defaultFilename) {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

  // Determine file name from Content-Disposition header
  const disposition = response.headers.get("content-disposition");
  let filename = defaultFilename;
  if (disposition) {
    const match = disposition.match(/filename[^;=\n]*=(['"]?)([^'";\n]+)\1/);
    if (match) filename = match[2].trim();
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
