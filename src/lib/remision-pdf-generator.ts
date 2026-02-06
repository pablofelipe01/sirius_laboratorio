/**
 * Generador de PDF profesional para remisiones
 * Replica fielmente el diseño del documento HTML existente
 * Usa pdf-lib para generar PDFs server-side
 */
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';

export interface ProductoRemisionPDF {
  nombre: string;
  cantidad: number;
  unidad: string;
}

export interface DatosRemisionPDF {
  idRemision: string;
  numeracion: number;
  fechaRemision: string;
  cliente: string;
  idCliente: string;
  idPedido: string;
  productos: ProductoRemisionPDF[];
  responsableEntrega: string;
  transportista?: {
    nombre: string;
    cedula: string;
    fechaFirma?: string;
  };
  receptor?: {
    nombre: string;
    cedula: string;
    fechaFirma?: string;
  };
  areaOrigen: string;
  notas?: string;
}

// ============ COLORES (coinciden con el HTML) ============
const DARK_NAVY = rgb(0.102, 0.102, 0.180);   // #1a1a2e
const DARK_NAVY2 = rgb(0.086, 0.129, 0.243);  // #16213e
const GREEN_MAIN = rgb(0.291, 0.855, 0.502);  // #4ade80
const GREEN_DARK = rgb(0.133, 0.773, 0.369);  // #22c55e
const GREEN_COMPLETED = rgb(0.063, 0.471, 0.341); // #10b981
const TEXT_DARK = rgb(0.118, 0.141, 0.169);   // #1e293b
const TEXT_GRAY = rgb(0.392, 0.455, 0.545);   // #64748b
const BG_LIGHT = rgb(0.973, 0.980, 0.988);    // #f8fafc
const WHITE = rgb(1, 1, 1);
const BORDER_LIGHT = rgb(0.886, 0.910, 0.937); // #e2e8f0

// Notes / amber
const NOTES_BG = rgb(0.996, 0.953, 0.780);    // #fef3c7
const NOTES_BORDER = rgb(0.961, 0.620, 0.043); // #f59e0b
const NOTES_TITLE = rgb(0.706, 0.325, 0.055); // #b45309
const NOTES_TEXT = rgb(0.573, 0.251, 0.055);  // #92400e

// Completed green box
const COMPLETED_BG = rgb(0.820, 0.980, 0.898); // #d1fae5
const COMPLETED_TEXT = rgb(0.016, 0.471, 0.341); // #047857
const COMPLETED_SMALL = rgb(0.024, 0.373, 0.275); // #065f46

const PAGE_WIDTH = 595.28;  // A4
const PAGE_HEIGHT = 841.89; // A4
const MARGIN_H = 40;        // horizontal margin
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN_H;

// ============ HELPERS ============

function sanitize(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u017F]/g, '')
    .trim();
}

function drawRect(page: PDFPage, x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

function drawBorderRect(page: PDFPage, x: number, y: number, w: number, h: number, borderColor: ReturnType<typeof rgb>, borderWidth = 1) {
  page.drawRectangle({ x, y, width: w, height: h, borderColor, borderWidth, color: undefined });
}

function truncateText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && font.widthOfTextAtSize(t + '...', fontSize) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '...';
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function formatDateES(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const [y, m, d] = parts.map(Number);
      return `${d} de ${months[m - 1]} de ${y}`;
    }
  } catch { /* fallback */ }
  return dateStr;
}

// ============ MAIN GENERATOR ============

/**
 * Genera un PDF profesional de la remision
 * Replica el diseño del HTML: header dark, info-grid con cards, tabla de productos,
 * notas, sección completada, footer
 */
export async function generarRemisionPDF(datos: DatosRemisionPDF): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT;

  const fechaGeneracion = new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const horaGeneracion = new Date().toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit'
  });
  const totalCantidad = datos.productos.reduce((sum, p) => sum + p.cantidad, 0);

  // Helper: ensure we have space, add new page if needed
  function ensureSpace(needed: number) {
    if (y - needed < 60) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 30;
    }
  }

  // ─────────────────── HEADER (dark gradient) ───────────────────
  const headerH = 75;
  y -= headerH;
  drawRect(page, 0, y, PAGE_WIDTH, headerH, DARK_NAVY);
  // subtle second layer on right side for gradient effect
  drawRect(page, PAGE_WIDTH * 0.6, y, PAGE_WIDTH * 0.4, headerH, DARK_NAVY2);

  // Company name
  page.drawText('SIRIUS REGENERATIVE SOLUTIONS', {
    x: MARGIN_H, y: y + 45, size: 18, font: fontBold, color: WHITE
  });
  page.drawText(sanitize('S.A.S. ZOMAC | NIT: 901.234.567-8'), {
    x: MARGIN_H, y: y + 28, size: 9, font: fontRegular, color: rgb(0.7, 0.7, 0.8)
  });

  // Remision number (right)
  const remLabel = 'REMISION No.';
  page.drawText(remLabel, {
    x: PAGE_WIDTH - MARGIN_H - fontRegular.widthOfTextAtSize(remLabel, 9),
    y: y + 52, size: 9, font: fontRegular, color: rgb(0.7, 0.7, 0.8)
  });
  const numStr = datos.numeracion.toString().padStart(3, '0');
  page.drawText(numStr, {
    x: PAGE_WIDTH - MARGIN_H - fontBold.widthOfTextAtSize(numStr, 30),
    y: y + 18, size: 30, font: fontBold, color: GREEN_MAIN
  });

  // ─────────────────── CONTENT AREA ───────────────────
  y -= 15; // padding top

  // ─── INFO GRID (2 columns, 4 rows = 8 cards) ───
  const cardW = (CONTENT_WIDTH - 15) / 2;
  const cardH = 48;
  const cardGap = 12;
  const cardPadX = 14;
  const accentW = 4;

  const infoCards = [
    { label: 'CLIENTE', value: sanitize(datos.cliente) },
    { label: 'CODIGO CLIENTE', value: sanitize(datos.idCliente) },
    { label: 'FECHA DE REMISION', value: sanitize(formatDateES(datos.fechaRemision)) },
    { label: 'HORA', value: sanitize(horaGeneracion) },
    { label: 'ID REMISION', value: sanitize(datos.idRemision) },
    { label: 'PEDIDO RELACIONADO', value: sanitize(datos.idPedido) },
    { label: 'AREA DE ORIGEN', value: sanitize(datos.areaOrigen) },
    { label: 'RESPONSABLE DE ENTREGA', value: sanitize(datos.responsableEntrega || 'No especificado') },
  ];

  for (let i = 0; i < infoCards.length; i += 2) {
    y -= (cardH + cardGap);
    for (let j = 0; j < 2 && (i + j) < infoCards.length; j++) {
      const card = infoCards[i + j];
      const cx = MARGIN_H + j * (cardW + 15);
      // Card background
      drawRect(page, cx, y, cardW, cardH, BG_LIGHT);
      // Left green accent
      drawRect(page, cx, y, accentW, cardH, GREEN_MAIN);
      // Label
      page.drawText(card.label, {
        x: cx + cardPadX + accentW, y: y + cardH - 16,
        size: 8, font: fontRegular, color: TEXT_GRAY
      });
      // Value
      const val = truncateText(card.value, fontBold, 12, cardW - cardPadX * 2 - accentW);
      page.drawText(val, {
        x: cx + cardPadX + accentW, y: y + 10,
        size: 12, font: fontBold, color: TEXT_DARK
      });
    }
  }

  // ─── TRANSPORTISTA card (full width) ───
  if (datos.transportista) {
    y -= (cardH + cardGap);
    drawRect(page, MARGIN_H, y, CONTENT_WIDTH, cardH, BG_LIGHT);
    drawRect(page, MARGIN_H, y, accentW, cardH, GREEN_MAIN);
    page.drawText('TRANSPORTISTA', {
      x: MARGIN_H + cardPadX + accentW, y: y + cardH - 16,
      size: 8, font: fontRegular, color: TEXT_GRAY
    });
    const transVal = `${sanitize(datos.transportista.nombre)} - CC: ${sanitize(datos.transportista.cedula)}`;
    page.drawText(truncateText(transVal, fontBold, 12, CONTENT_WIDTH - cardPadX * 2 - accentW), {
      x: MARGIN_H + cardPadX + accentW, y: y + 10,
      size: 12, font: fontBold, color: TEXT_DARK
    });
    if (datos.transportista.fechaFirma) {
      const fTxt = `Firmado el ${formatDateES(datos.transportista.fechaFirma)}`;
      page.drawText(sanitize(fTxt), {
        x: PAGE_WIDTH - MARGIN_H - fontOblique.widthOfTextAtSize(sanitize(fTxt), 8) - 10,
        y: y + 10, size: 8, font: fontOblique, color: GREEN_COMPLETED
      });
    }
  }

  // ─── RECEPTOR card (full width) ───
  if (datos.receptor) {
    y -= (cardH + cardGap);
    drawRect(page, MARGIN_H, y, CONTENT_WIDTH, cardH, BG_LIGHT);
    drawRect(page, MARGIN_H, y, accentW, cardH, GREEN_MAIN);
    page.drawText('RECEPTOR', {
      x: MARGIN_H + cardPadX + accentW, y: y + cardH - 16,
      size: 8, font: fontRegular, color: TEXT_GRAY
    });
    const recVal = `${sanitize(datos.receptor.nombre)} - CC: ${sanitize(datos.receptor.cedula)}`;
    page.drawText(truncateText(recVal, fontBold, 12, CONTENT_WIDTH - cardPadX * 2 - accentW), {
      x: MARGIN_H + cardPadX + accentW, y: y + 10,
      size: 12, font: fontBold, color: TEXT_DARK
    });
    if (datos.receptor.fechaFirma) {
      const rTxt = `Recibido el ${formatDateES(datos.receptor.fechaFirma)}`;
      page.drawText(sanitize(rTxt), {
        x: PAGE_WIDTH - MARGIN_H - fontOblique.widthOfTextAtSize(sanitize(rTxt), 8) - 10,
        y: y + 10, size: 8, font: fontOblique, color: GREEN_COMPLETED
      });
    }
  }

  // ─────────────────── SECTION TITLE: Productos Despachados ───────────────────
  y -= 35;
  ensureSpace(30);
  // Green accent bar
  drawRect(page, MARGIN_H, y, 4, 18, GREEN_MAIN);
  page.drawText('Productos Despachados', {
    x: MARGIN_H + 12, y: y + 2, size: 14, font: fontBold, color: TEXT_DARK
  });
  // Underline
  y -= 8;
  drawRect(page, MARGIN_H, y, CONTENT_WIDTH, 1.5, BORDER_LIGHT);

  // ─────────────────── TABLE ───────────────────
  y -= 10;

  const colWidths = [40, CONTENT_WIDTH - 40 - 90 - 75, 90, 75]; // #, Producto, Cantidad, Unidad
  const headerRowH = 32;
  const dataRowH = 30;

  // Table header
  ensureSpace(headerRowH + dataRowH * datos.productos.length + dataRowH + 10);
  const tableY = y;
  y -= headerRowH;
  drawRect(page, MARGIN_H, y, CONTENT_WIDTH, headerRowH, DARK_NAVY);

  const headers = ['#', 'Producto', 'Cantidad', 'Unidad'];
  let tx = MARGIN_H;
  for (let i = 0; i < headers.length; i++) {
    const align = (i === 0 || i >= 2) ? 'center' : 'left';
    const textW = fontBold.widthOfTextAtSize(headers[i], 9);
    const xText = align === 'center' ? tx + (colWidths[i] - textW) / 2 : tx + 12;
    page.drawText(headers[i], {
      x: xText, y: y + 11, size: 9, font: fontBold, color: WHITE
    });
    tx += colWidths[i];
  }

  // Table rows
  for (let idx = 0; idx < datos.productos.length; idx++) {
    const prod = datos.productos[idx];
    y -= dataRowH;
    ensureSpace(dataRowH);

    // Alternating row bg
    if (idx % 2 === 1) {
      drawRect(page, MARGIN_H, y, CONTENT_WIDTH, dataRowH, BG_LIGHT);
    }
    // Bottom border
    drawRect(page, MARGIN_H, y, CONTENT_WIDTH, 0.5, BORDER_LIGHT);

    tx = MARGIN_H;
    const values = [(idx + 1).toString(), sanitize(prod.nombre), prod.cantidad.toString(), sanitize(prod.unidad)];
    for (let i = 0; i < values.length; i++) {
      const f = fontRegular;
      const sz = 10;
      const align = (i === 0 || i >= 2) ? 'center' : 'left';
      const maxW = colWidths[i] - 24;
      const val = truncateText(values[i], f, sz, maxW);
      const textW = f.widthOfTextAtSize(val, sz);
      const xText = align === 'center' ? tx + (colWidths[i] - textW) / 2 : tx + 12;
      page.drawText(val, {
        x: xText, y: y + 10, size: sz, font: f, color: TEXT_DARK
      });
      tx += colWidths[i];
    }
  }

  // TOTAL row (green gradient)
  y -= dataRowH;
  drawRect(page, MARGIN_H, y, CONTENT_WIDTH, dataRowH, GREEN_MAIN);
  // "TOTAL" label right-aligned in first two cols
  const totalLabel = 'TOTAL';
  const totalLabelW = fontBold.widthOfTextAtSize(totalLabel, 11);
  page.drawText(totalLabel, {
    x: MARGIN_H + colWidths[0] + colWidths[1] - totalLabelW - 12,
    y: y + 9, size: 11, font: fontBold, color: WHITE
  });
  // Total amount centered in Cantidad col
  const totalStr = totalCantidad.toFixed(2);
  const totalStrW = fontBold.widthOfTextAtSize(totalStr, 11);
  page.drawText(totalStr, {
    x: MARGIN_H + colWidths[0] + colWidths[1] + (colWidths[2] - totalStrW) / 2,
    y: y + 9, size: 11, font: fontBold, color: WHITE
  });
  // Dash in Unidad col
  const dashW = fontBold.widthOfTextAtSize('-', 11);
  page.drawText('-', {
    x: MARGIN_H + colWidths[0] + colWidths[1] + colWidths[2] + (colWidths[3] - dashW) / 2,
    y: y + 9, size: 11, font: fontBold, color: WHITE
  });

  // ─────────────────── NOTAS ───────────────────
  if (datos.notas) {
    y -= 20;
    ensureSpace(70);
    const notasText = sanitize(datos.notas);
    const notasLines = wrapText(notasText, fontRegular, 10, CONTENT_WIDTH - 36);
    const notasBoxH = 40 + notasLines.length * 15;

    ensureSpace(notasBoxH);
    drawRect(page, MARGIN_H, y - notasBoxH, CONTENT_WIDTH, notasBoxH, NOTES_BG);
    drawBorderRect(page, MARGIN_H, y - notasBoxH, CONTENT_WIDTH, notasBoxH, NOTES_BORDER, 1);

    page.drawText('Notas', {
      x: MARGIN_H + 18, y: y - 18, size: 11, font: fontBold, color: NOTES_TITLE
    });

    for (let i = 0; i < notasLines.length; i++) {
      page.drawText(notasLines[i], {
        x: MARGIN_H + 18, y: y - 36 - i * 15, size: 10, font: fontRegular, color: NOTES_TEXT
      });
    }
    y -= notasBoxH;
  }

  // ─────────────────── COMPLETED BOX (if receptor signed) ───────────────────
  if (datos.receptor) {
    y -= 20;
    ensureSpace(85);
    const compBoxH = 80;
    drawRect(page, MARGIN_H, y - compBoxH, CONTENT_WIDTH, compBoxH, COMPLETED_BG);
    drawBorderRect(page, MARGIN_H, y - compBoxH, CONTENT_WIDTH, compBoxH, GREEN_COMPLETED, 1.5);

    page.drawText('Remision Completada', {
      x: MARGIN_H + 18, y: y - 20, size: 13, font: fontBold, color: COMPLETED_TEXT
    });

    // Two columns: Receptor info | Fecha
    const midX = MARGIN_H + CONTENT_WIDTH / 2;

    page.drawText('Receptor', {
      x: MARGIN_H + 18, y: y - 40, size: 8, font: fontBold, color: COMPLETED_SMALL
    });
    page.drawText(sanitize(datos.receptor.nombre), {
      x: MARGIN_H + 18, y: y - 55, size: 11, font: fontBold, color: COMPLETED_TEXT
    });
    page.drawText(`CC: ${sanitize(datos.receptor.cedula)}`, {
      x: MARGIN_H + 18, y: y - 68, size: 8, font: fontRegular, color: COMPLETED_SMALL
    });

    page.drawText('Fecha de Recepcion', {
      x: midX + 10, y: y - 40, size: 8, font: fontBold, color: COMPLETED_SMALL
    });
    page.drawText(sanitize(datos.receptor.fechaFirma ? formatDateES(datos.receptor.fechaFirma) : 'N/A'), {
      x: midX + 10, y: y - 55, size: 11, font: fontBold, color: COMPLETED_TEXT
    });

    y -= compBoxH;
  }

  // ─────────────────── SIGNATURES ───────────────────
  y -= 30;
  ensureSpace(90);

  const sigColW = (CONTENT_WIDTH - 50) / 2;
  // Signature line + details (transportista left, receptor right)
  const sigLineY = y - 55;

  // Left: Transportista
  drawRect(page, MARGIN_H, sigLineY, sigColW, 1.5, TEXT_DARK);
  page.drawText(datos.transportista ? sanitize(datos.transportista.nombre) : '', {
    x: MARGIN_H, y: sigLineY - 16, size: 10, font: fontBold, color: TEXT_DARK
  });
  page.drawText(datos.transportista ? `CC: ${sanitize(datos.transportista.cedula)}` : '', {
    x: MARGIN_H, y: sigLineY - 30, size: 8, font: fontRegular, color: TEXT_GRAY
  });
  const transpLabel = 'Transportista';
  page.drawText(transpLabel, {
    x: MARGIN_H + (sigColW - fontRegular.widthOfTextAtSize(transpLabel, 8)) / 2,
    y: sigLineY - 44, size: 8, font: fontRegular, color: TEXT_GRAY
  });

  // Right: Receptor
  const sigX2 = MARGIN_H + sigColW + 50;
  drawRect(page, sigX2, sigLineY, sigColW, 1.5, TEXT_DARK);
  page.drawText(datos.receptor ? sanitize(datos.receptor.nombre) : '', {
    x: sigX2, y: sigLineY - 16, size: 10, font: fontBold, color: TEXT_DARK
  });
  page.drawText(datos.receptor ? `CC: ${sanitize(datos.receptor.cedula)}` : '', {
    x: sigX2, y: sigLineY - 30, size: 8, font: fontRegular, color: TEXT_GRAY
  });
  const recLabel = 'Receptor';
  page.drawText(recLabel, {
    x: sigX2 + (sigColW - fontRegular.widthOfTextAtSize(recLabel, 8)) / 2,
    y: sigLineY - 44, size: 8, font: fontRegular, color: TEXT_GRAY
  });

  // ─────────────────── FOOTER ───────────────────
  const footerY = 25;
  // On current (last) page
  const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
  drawRect(lastPage, 0, footerY, PAGE_WIDTH, 28, BG_LIGHT);
  drawRect(lastPage, 0, footerY + 28, PAGE_WIDTH, 0.5, BORDER_LIGHT);

  lastPage.drawText(`Documento generado automaticamente por DataLab`, {
    x: MARGIN_H, y: footerY + 15, size: 7, font: fontRegular, color: TEXT_GRAY
  });
  lastPage.drawText(`Fecha de generacion: ${sanitize(fechaGeneracion)} - ${sanitize(horaGeneracion)}`, {
    x: MARGIN_H, y: footerY + 5, size: 7, font: fontRegular, color: TEXT_GRAY
  });

  // Badge "Documento Valido"
  const badge = 'Documento Valido';
  const badgeW = fontBold.widthOfTextAtSize(badge, 8) + 18;
  const badgeH = 20;
  const badgeX = PAGE_WIDTH - MARGIN_H - badgeW;
  const badgeY = footerY + 4;
  // Rounded-ish rect for badge
  drawRect(lastPage, badgeX, badgeY, badgeW, badgeH, GREEN_MAIN);
  lastPage.drawText(badge, {
    x: badgeX + 9, y: badgeY + 6, size: 8, font: fontBold, color: WHITE
  });

  return pdfDoc.save();
}
