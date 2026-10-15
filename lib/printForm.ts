import type { FormSection } from "@/lib/formTemplates";

/** Abre el diálogo de impresión del navegador con un HTML ya armado */
export function printHtml(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) return;
  doc.open(); doc.write(html); doc.close();
  setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 2000); }, 300);
}

/** Plantilla en blanco, con líneas para llenar a mano */
export function blankFormHtml(titulo: string, sections: FormSection[], quien: string): string {
  const cuerpo = sections.map((sec) => `
    <section>
      <h2>${sec.title}</h2>
      ${sec.fields.map((f) => `<p class="campo"><span class="etiqueta">${f.label}:</span> <span class="linea"></span></p>`).join("")}
    </section>`).join("");
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${titulo}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;max-width:760px;margin:30px auto;padding:0 22px;color:#1e293b;line-height:1.7}
    .letterhead{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #7c3aed;padding-bottom:12px;margin-bottom:14px}
    .brand{font-size:20px;font-weight:bold;color:#7c3aed}
    .quien{text-align:right;font-size:11px;color:#475569}
    h1{font-size:17px;margin:14px 0 2px}
    .meta{font-size:12px;color:#64748b;margin-bottom:18px}
    h2{font-size:13px;color:#7c3aed;margin:18px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:3px}
    .campo{margin:6px 0;font-size:12.5px;page-break-inside:avoid;display:flex;gap:6px;align-items:flex-end}
    .etiqueta{font-weight:bold;color:#475569;white-space:nowrap}
    .linea{flex:1;border-bottom:1px solid #94a3b8;min-height:14px}
    section{page-break-inside:avoid}
    @media print{body{margin:12px auto}}
  </style></head><body>
    <div class="letterhead"><div class="brand">TOdo Therapy</div><div class="quien"><strong>${quien}</strong></div></div>
    <h1>${titulo}</h1>
    <div class="meta">Usuario: ______________________________ &nbsp;·&nbsp; Fecha: ____ / ____ / ________</div>
    ${cuerpo}
  </body></html>`;
}
