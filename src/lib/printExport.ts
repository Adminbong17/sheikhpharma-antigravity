// Utility for printing tables (A4 / POS), exporting CSV, and saving as JPG

export interface PrintColumn {
  header: string;
  accessor: (row: any) => string | number;
}

export interface PrintBranding {
  logoUrl?: string | null;
  siteName?: string;
  ceoName?: string;
  officeAddress?: string | null;
  officePhone?: string | null;
  officeEmail?: string | null;
}

type PrintFormat = "a4" | "pos" | "pos56";

const buildLetterhead = (branding: PrintBranding, isPosLike: boolean, isNarrow: boolean = false) => {
  const isPos = isPosLike;
  const logoSize = isNarrow ? "22px" : isPos ? "28px" : "48px";
  const nameSize = isNarrow ? "11px" : isPos ? "13px" : "20px";
  const addrSize = isNarrow ? "8px" : isPos ? "9px" : "11px";
  const logo = branding.logoUrl
    ? `<img src="${branding.logoUrl}" alt="Logo" style="height:${logoSize};width:auto;object-fit:contain;" crossorigin="anonymous" />`
    : "";
  const name = branding.siteName || "";
  const contactParts: string[] = [];
  if (branding.officeAddress) contactParts.push(branding.officeAddress);
  if (branding.officePhone) contactParts.push(`📞 ${branding.officePhone}`);
  if (branding.officeEmail) contactParts.push(`✉ ${branding.officeEmail}`);
  const contactLine = contactParts.length
    ? `<div style="font-size:${addrSize};color:#555;margin-top:2px;">${contactParts.join(" &nbsp;|&nbsp; ")}</div>`
    : "";
  return `<div style="display:flex;align-items:center;gap:${isPos ? "6px" : "12px"};padding-bottom:${isPos ? "6px" : "14px"};border-bottom:2px solid #333;margin-bottom:${isPos ? "8px" : "16px"};">
    ${logo}
    <div>
      <div style="font-weight:700;font-size:${nameSize};letter-spacing:0.5px;">${name}</div>
      ${contactLine}
    </div>
  </div>`;
};

const buildSignature = (branding: PrintBranding, isPos: boolean, isNarrow: boolean = false) => {
  const ceo = branding.ceoName || "CEO";
  const mt = isNarrow ? "14px" : isPos ? "20px" : "48px";
  const fs = isNarrow ? "9px" : isPos ? "10px" : "13px";
  const minW = isNarrow ? "80px" : isPos ? "100px" : "180px";
  const subFs = isNarrow ? "8px" : isPos ? "9px" : "11px";
  return `<div style="margin-top:${mt};text-align:right;font-size:${fs};">
    <div style="border-top:1px solid #333;display:inline-block;padding-top:4px;min-width:${minW};text-align:center;">
      <div style="font-weight:600;">${ceo}</div>
      <div style="color:#666;font-size:${subFs};">Authorized Signature</div>
    </div>
  </div>`;
};

const buildHtml = (title: string, columns: PrintColumn[], data: any[], format: PrintFormat, branding?: PrintBranding) => {
  const isPos56 = format === "pos56";
  const isPos = format === "pos" || isPos56;
  const pageSize = isPos56 ? "56mm auto" : isPos ? "80mm auto" : "A4 portrait";
  const pageWidth = isPos56 ? "56mm" : isPos ? "80mm" : "210mm";
  const pageMargin = isPos56 ? "1mm" : isPos ? "2mm" : "10mm";
  const fontSize = isPos56 ? "10px" : "13px";
  const thPad = isPos56 ? "3px 3px" : isPos ? "5px 6px" : "8px 12px";
  const tdPad = isPos56 ? "2px 3px" : isPos ? "4px 6px" : "8px 12px";
  const bodyPad = isPos56 ? "2px" : isPos ? "4px" : "20px";
  const h1Size = isPos56 ? "12px" : isPos ? "16px" : "20px";
  const h1PrintSize = isPos56 ? "11px" : isPos ? "14px" : "16px";
  const metaSize = isPos56 ? "9px" : isPos ? "11px" : "12px";
  const br = branding || {};

  const rows = data
    .map(
      (row) =>
        `<tr>${columns
          .map(
            (col) =>
              `<td style="border:1px solid #ddd;padding:${tdPad};text-align:left;font-size:${fontSize};white-space:pre-line;">${String(col.accessor(row) ?? "—").replace(/\n/g, "<br>")}</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
  @page { size: ${pageSize}; margin: ${pageMargin}; }
  body { font-family: ${isPos ? "'Courier New', Courier, monospace" : "Arial, sans-serif"}; padding: ${bodyPad}; max-width: ${pageWidth}; margin: 0 auto; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1 { font-size: ${h1Size}; margin-bottom: 4px; font-weight: ${isPos ? "900" : "700"}; }
  p.meta { font-size: ${metaSize}; color: ${isPos ? "#333" : "#666"}; margin-bottom: ${isPos ? "8px" : "16px"}; font-weight: ${isPos ? "600" : "400"}; }
  table { border-collapse: collapse; width: 100%; }
  th { border: ${isPos ? "2px solid #000" : "1px solid #333"}; padding: ${thPad}; background: ${isPos ? "#000" : "#f5f5f5"}; color: ${isPos ? "#fff" : "#000"}; text-align: left; font-size: ${fontSize}; font-weight: ${isPos ? "900" : "600"}; }
  td { border: ${isPos ? "1px solid #333" : "1px solid #ddd"}; padding: ${tdPad}; font-size: ${fontSize}; font-weight: ${isPos ? "700" : "400"}; color: #000; }
  tr:nth-child(even) { background: ${isPos ? "#fff" : "#fafafa"}; }
  @media print {
    body { padding: 0; }
    h1 { font-size: ${h1PrintSize}; }
  }
</style>
</head><body>
${buildLetterhead(br, isPos, isPos56)}
<h1>${title}</h1>
<p class="meta">Printed on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })} — Total: ${data.length} records</p>
<table>
  <thead><tr>${columns.map((c) => `<th>${c.header}</th>`).join("")}</tr></thead>
  <tbody>${rows}</tbody>
</table>
${buildSignature(br, isPos, isPos56)}
</body></html>`;
};

export const printTable = (title: string, columns: PrintColumn[], data: any[], format: PrintFormat = "a4", branding?: PrintBranding) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(buildHtml(title, columns, data, format, branding));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 300);
};

export const saveAsJpg = async (title: string, columns: PrintColumn[], data: any[], format: PrintFormat = "a4", branding?: PrintBranding) => {
  const { default: html2canvas } = await import("html2canvas");

  // Create off-screen container
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;background:white;";
  container.style.width = format === "pos56" ? "212px" : format === "pos" ? "302px" : "794px"; // 56mm ≈ 212px, 80mm ≈ 302px, A4 ≈ 794px
  container.innerHTML = buildHtml(title, columns, data, format, branding)
    .replace(/<!DOCTYPE html>|<\/?html>|<\/?head>|<title>.*?<\/title>|<style>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?body>/gi, "");

  // Re-inject styles inline
  const styleEl = document.createElement("style");
  const isPos56 = format === "pos56";
  const isPos = format === "pos" || isPos56;
  const fontSize = isPos56 ? "9px" : isPos ? "11px" : "13px";
  const thPad = isPos56 ? "2px 3px" : isPos ? "4px 6px" : "8px 12px";
  const tdPad = isPos56 ? "2px 3px" : isPos ? "3px 6px" : "8px 12px";
  styleEl.textContent = `
    h1 { font-family: Arial, sans-serif; font-size: ${isPos56 ? "11px" : isPos ? "14px" : "20px"}; margin-bottom: 4px; }
    p.meta { font-family: Arial, sans-serif; font-size: ${isPos56 ? "8px" : isPos ? "10px" : "12px"}; color: #666; margin-bottom: ${isPos ? "8px" : "16px"}; }
    table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
    th { border: 1px solid #333; padding: ${thPad}; background: #f5f5f5; text-align: left; font-size: ${fontSize}; font-weight: 600; }
    td { border: 1px solid #ddd; padding: ${tdPad}; font-size: ${fontSize}; }
    tr:nth-child(even) { background: #fafafa; }
  `;
  container.prepend(styleEl);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = `${title.replace(/\s+/g, "_")}_${format.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  } finally {
    document.body.removeChild(container);
  }
};

export const exportCSV = (title: string, columns: PrintColumn[], data: any[]) => {
  const header = columns.map((c) => `"${c.header}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = String(col.accessor(row) ?? "").replace(/"/g, '""');
        return `"${val}"`;
      })
      .join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
