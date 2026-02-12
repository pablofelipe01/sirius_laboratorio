/**
 * Generador de PDF profesional para Remisiones
 * Sirius Regenerative Solutions - Manual de Marca 2023
 * Usa pdf-lib para generar PDFs server-side con logo embebido
 */
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

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

// ============ COLORES MARCA SIRIUS ============
// Basados en Manual de Marca 2023
const SIRIUS_BLACK = rgb(0.067, 0.067, 0.067);     // #111111
const SIRIUS_DARK = rgb(0.122, 0.137, 0.161);      // #1f2329
const SIRIUS_GREEN = rgb(0.180, 0.741, 0.420);     // #2ebd6b
const SIRIUS_GREEN_LIGHT = rgb(0.216, 0.808, 0.475); // #37ce79
const SIRIUS_GREEN_SOFT = rgb(0.925, 0.980, 0.945);  // #ecfaf1
const TEXT_PRIMARY = rgb(0.133, 0.133, 0.133);      // #222222
const TEXT_SECONDARY = rgb(0.400, 0.420, 0.450);    // #666b73
const TEXT_MUTED = rgb(0.560, 0.580, 0.610);        // #8f949c
const WHITE = rgb(1, 1, 1);
const BG_PAPER = rgb(0.992, 0.992, 0.996);          // #fdfdfe
const BORDER_MAIN = rgb(0.880, 0.890, 0.905);       // #e0e3e7
const BORDER_LIGHT = rgb(0.930, 0.935, 0.945);      // #edeff1
const ROW_ALT = rgb(0.965, 0.970, 0.978);           // #f7f8fa

// Notes
const NOTES_BG = rgb(0.996, 0.973, 0.882);          // #fef8e1
const NOTES_BORDER = rgb(0.910, 0.770, 0.310);      // #e8c44f
const NOTES_TEXT = rgb(0.480, 0.370, 0.060);         // #7a5e0f

// Completed
const COMPLETED_BG = rgb(0.925, 0.980, 0.945);      // #ecfaf1
const COMPLETED_BORDER = rgb(0.180, 0.741, 0.420);  // #2ebd6b
const COMPLETED_TEXT = rgb(0.090, 0.400, 0.200);     // #176633

const PAGE_WIDTH = 595.28;  // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_WIDTH - 2 * MARGIN;

// ============ HELPERS ============
function sanitize(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u017F]/g, '')
    .trim();
}

function rect(page: PDFPage, x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

function borderRect(page: PDFPage, x: number, y: number, w: number, h: number, borderColor: ReturnType<typeof rgb>, borderWidth = 0.75, fillColor?: ReturnType<typeof rgb>) {
  page.drawRectangle({ x, y, width: w, height: h, borderColor, borderWidth, color: fillColor });
}

function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number, color: ReturnType<typeof rgb>, thickness = 0.5) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness });
}

function truncate(text: string, font: PDFFont, size: number, maxW: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxW) return text;
  let t = text;
  while (t.length > 0 && font.widthOfTextAtSize(t + '...', size) > maxW) t = t.slice(0, -1);
  return t + '...';
}

function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
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

function textRight(page: PDFPage, text: string, font: PDFFont, size: number, rightX: number, yPos: number, color: ReturnType<typeof rgb>) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - w, y: yPos, size, font, color });
}

function textCenter(page: PDFPage, text: string, font: PDFFont, size: number, cx: number, colW: number, yPos: number, color: ReturnType<typeof rgb>) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: cx + (colW - w) / 2, y: yPos, size, font, color });
}

// ============ MAIN GENERATOR ============
export async function generarRemisionPDF(datos: DatosRemisionPDF): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Load logo
  let logoImage: any = null;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    const logoBytes = fs.readFileSync(logoPath);
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch (e) {
    console.warn('Logo no encontrado, PDF generado sin logo');
  }

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT;

  const fechaGen = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  const horaGen = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const total = datos.productos.reduce((s, p) => s + p.cantidad, 0);

  function ensureSpace(needed: number) {
    if (y - needed < 65) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 40;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  HEADER — Dark bar with logo + company + remision number
  // ═══════════════════════════════════════════════════════════
  const headerH = 90;
  y -= headerH;
  rect(page, 0, y, PAGE_WIDTH, headerH, SIRIUS_BLACK);

  // Green accent line at bottom of header
  rect(page, 0, y, PAGE_WIDTH, 3, SIRIUS_GREEN);

  // Logo (left side)
  if (logoImage) {
    const logoDims = logoImage.scale(1);
    const logoH = 52;
    const logoW = (logoDims.width / logoDims.height) * logoH;
    page.drawImage(logoImage, {
      x: MARGIN,
      y: y + (headerH - logoH) / 2 + 2,
      width: logoW,
      height: logoH,
    });

    // Company text next to logo
    const textX = MARGIN + logoW + 14;
    page.drawText('SIRIUS', {
      x: textX, y: y + 55, size: 20, font: bold, color: WHITE
    });
    page.drawText('REGENERATIVE SOLUTIONS', {
      x: textX, y: y + 38, size: 10, font: regular, color: rgb(0.75, 0.78, 0.82)
    });
    page.drawText('S.A.S. ZOMAC  |  NIT: 901.234.567-8', {
      x: textX, y: y + 22, size: 7.5, font: regular, color: rgb(0.55, 0.58, 0.62)
    });
  } else {
    // Fallback without logo
    page.drawText('SIRIUS REGENERATIVE SOLUTIONS', {
      x: MARGIN, y: y + 52, size: 18, font: bold, color: WHITE
    });
    page.drawText('S.A.S. ZOMAC  |  NIT: 901.234.567-8', {
      x: MARGIN, y: y + 34, size: 8, font: regular, color: rgb(0.55, 0.58, 0.62)
    });
  }

  // Remision number block (right side)
  const remLabel = 'REMISION DE DESPACHO';
  textRight(page, remLabel, regular, 7.5, PAGE_WIDTH - MARGIN, y + 68, rgb(0.55, 0.58, 0.62));

  const numStr = 'No. ' + datos.idRemision.split('-').pop();
  textRight(page, numStr, bold, 28, PAGE_WIDTH - MARGIN, y + 30, SIRIUS_GREEN);

  const idStr = datos.idRemision;
  textRight(page, sanitize(idStr), regular, 8, PAGE_WIDTH - MARGIN, y + 15, rgb(0.65, 0.68, 0.72));

  // ═══════════════════════════════════════════════════════════
  //  DOCUMENT INFO — 2 columns of label:value pairs
  // ═══════════════════════════════════════════════════════════
  y -= 22;
  ensureSpace(120);

  // Light background card
  const col1X = MARGIN + 18;
  const col2X = MARGIN + CONTENT_W / 2 + 10;
  const labelSz = 7;
  const valueSz = 9.5;
  const rowStep = 24;

  const leftFields = [
    { label: 'CLIENTE', value: sanitize(datos.cliente) },
    { label: 'FECHA DE REMISION', value: sanitize(formatDateES(datos.fechaRemision)) },
    { label: 'PEDIDO RELACIONADO', value: sanitize(datos.idPedido) },
  ];

  const rightFields = [
    { label: 'CODIGO CLIENTE', value: sanitize(datos.idCliente) },
    { label: 'HORA DE GENERACION', value: sanitize(horaGen) },
    { label: 'AREA DE ORIGEN', value: sanitize(datos.areaOrigen) },
  ];

  const rowCount = leftFields.length;
  const infoBoxH = 20 + (rowCount - 1) * rowStep + 16;
  borderRect(page, MARGIN, y - infoBoxH, CONTENT_W, infoBoxH, BORDER_MAIN, 0.75, BG_PAPER);

  // Vertical divider
  const divX = MARGIN + CONTENT_W / 2;
  line(page, divX, y - 10, divX, y - infoBoxH + 10, BORDER_LIGHT, 0.5);

  for (let i = 0; i < rowCount; i++) {
    const rowY = y - 20 - i * rowStep;

    // Left column
    page.drawText(leftFields[i].label, {
      x: col1X, y: rowY, size: labelSz, font: bold, color: TEXT_MUTED
    });
    page.drawText(truncate(leftFields[i].value, bold, valueSz, CONTENT_W / 2 - 40), {
      x: col1X, y: rowY - 12, size: valueSz, font: bold, color: TEXT_PRIMARY
    });

    // Right column
    page.drawText(rightFields[i].label, {
      x: col2X, y: rowY, size: labelSz, font: bold, color: TEXT_MUTED
    });
    page.drawText(truncate(rightFields[i].value, bold, valueSz, CONTENT_W / 2 - 40), {
      x: col2X, y: rowY - 12, size: valueSz, font: bold, color: TEXT_PRIMARY
    });

    // Row separator (except last)
    if (i < rowCount - 1) {
      line(page, MARGIN + 12, rowY - 19, MARGIN + CONTENT_W - 12, rowY - 19, BORDER_LIGHT, 0.3);
    }
  }

  y -= infoBoxH;

  // ═══════════════════════════════════════════════════════════
  //  TRANSPORTE — Transportista / Responsable de Entrega cards
  // ═══════════════════════════════════════════════════════════
  const hasTransport = datos.transportista || datos.responsableEntrega;
  if (hasTransport) {
    y -= 16;
    ensureSpace(65);

    // Section label
    page.drawText('TRANSPORTE Y ENTREGA', {
      x: MARGIN, y: y, size: 7, font: bold, color: TEXT_MUTED
    });
    y -= 8;

    const cardH = 44;
    const gap = 10;
    const showBoth = Boolean(datos.transportista && datos.responsableEntrega);
    const halfW = showBoth ? (CONTENT_W - gap) / 2 : CONTENT_W;

    y -= cardH;

    // Transportista card (left)
    if (datos.transportista) {
      const cx = MARGIN;
      const cw = showBoth ? halfW : CONTENT_W;

      borderRect(page, cx, y, cw, cardH, BORDER_MAIN, 0.5, BG_PAPER);
      rect(page, cx, y, 3, cardH, SIRIUS_GREEN);

      page.drawText('TRANSPORTISTA', {
        x: cx + 14, y: y + cardH - 14, size: 6.5, font: bold, color: TEXT_MUTED
      });

      const tName = sanitize(datos.transportista.nombre);
      page.drawText(truncate(tName, bold, 10, cw - 30), {
        x: cx + 14, y: y + cardH - 28, size: 10, font: bold, color: TEXT_PRIMARY
      });

      const tCC = `C.C. ${sanitize(datos.transportista.cedula)}`;
      page.drawText(tCC, {
        x: cx + 14, y: y + 6, size: 7.5, font: regular, color: TEXT_SECONDARY
      });

      if (datos.transportista.fechaFirma) {
        const fTxt = sanitize(`Firmado el ${formatDateES(datos.transportista.fechaFirma)}`);
        const fW = italic.widthOfTextAtSize(fTxt, 7);
        page.drawText(fTxt, {
          x: cx + cw - fW - 10, y: y + 6, size: 7, font: italic, color: SIRIUS_GREEN
        });
      }
    }

    // Responsable de entrega card (right or full width)
    if (datos.responsableEntrega) {
      const rx = showBoth ? MARGIN + halfW + gap : MARGIN;
      const rw = showBoth ? halfW : CONTENT_W;

      borderRect(page, rx, y, rw, cardH, BORDER_MAIN, 0.5, BG_PAPER);
      rect(page, rx, y, 3, cardH, SIRIUS_GREEN);

      page.drawText('RESPONSABLE DE ENTREGA', {
        x: rx + 14, y: y + cardH - 14, size: 6.5, font: bold, color: TEXT_MUTED
      });

      const rName = sanitize(datos.responsableEntrega);
      page.drawText(truncate(rName, bold, 10, rw - 30), {
        x: rx + 14, y: y + cardH - 28, size: 10, font: bold, color: TEXT_PRIMARY
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  PRODUCTS TABLE
  // ═══════════════════════════════════════════════════════════
  y -= 24;
  ensureSpace(40);

  // Section title with green accent
  rect(page, MARGIN, y - 2, 3, 14, SIRIUS_GREEN);
  page.drawText('PRODUCTOS DESPACHADOS', {
    x: MARGIN + 10, y: y, size: 9, font: bold, color: TEXT_PRIMARY
  });
  y -= 8;

  // Thin separator
  line(page, MARGIN, y, MARGIN + CONTENT_W, y, BORDER_MAIN, 0.5);
  y -= 4;

  const colW = [36, CONTENT_W - 36 - 85 - 70, 85, 70]; // #, Producto, Cantidad, Unidad
  const thH = 28;
  const tdH = 26;

  ensureSpace(thH + tdH * datos.productos.length + tdH + 20);

  // Table header
  y -= thH;
  rect(page, MARGIN, y, CONTENT_W, thH, SIRIUS_DARK);

  const heads = ['#', 'PRODUCTO', 'CANTIDAD', 'UNIDAD'];
  let cx = MARGIN;
  for (let i = 0; i < heads.length; i++) {
    const align = i === 1 ? 'left' : 'center';
    if (align === 'center') {
      textCenter(page, heads[i], bold, 7, cx, colW[i], y + 10, WHITE);
    } else {
      page.drawText(heads[i], { x: cx + 10, y: y + 10, size: 7, font: bold, color: WHITE });
    }
    cx += colW[i];
  }

  // Table rows
  for (let idx = 0; idx < datos.productos.length; idx++) {
    const prod = datos.productos[idx];
    y -= tdH;
    ensureSpace(tdH);

    // Alternating bg
    if (idx % 2 === 0) {
      rect(page, MARGIN, y, CONTENT_W, tdH, ROW_ALT);
    }

    // Bottom border
    line(page, MARGIN, y, MARGIN + CONTENT_W, y, BORDER_LIGHT, 0.3);

    cx = MARGIN;
    const vals = [(idx + 1).toString(), sanitize(prod.nombre), prod.cantidad.toLocaleString('es-CO'), sanitize(prod.unidad)];
    for (let i = 0; i < vals.length; i++) {
      const sz = i === 1 ? 9 : 8.5;
      const f = i === 1 ? regular : regular;
      const align = i === 1 ? 'left' : 'center';
      const v = truncate(vals[i], f, sz, colW[i] - 20);

      if (align === 'center') {
        textCenter(page, v, f, sz, cx, colW[i], y + 8, TEXT_PRIMARY);
      } else {
        page.drawText(v, { x: cx + 10, y: y + 8, size: sz, font: f, color: TEXT_PRIMARY });
      }
      cx += colW[i];
    }
  }

  // TOTAL row
  y -= tdH;
  rect(page, MARGIN, y, CONTENT_W, tdH, SIRIUS_GREEN);

  // "TOTAL" label
  const totalLabel = 'TOTAL';
  const totalLabelW = bold.widthOfTextAtSize(totalLabel, 9);
  page.drawText(totalLabel, {
    x: MARGIN + colW[0] + colW[1] - totalLabelW - 12,
    y: y + 8, size: 9, font: bold, color: WHITE
  });
  // Amount
  textCenter(page, total.toFixed(2), bold, 9, MARGIN + colW[0] + colW[1], colW[2], y + 8, WHITE);
  // Dash
  textCenter(page, '-', bold, 9, MARGIN + colW[0] + colW[1] + colW[2], colW[3], y + 8, WHITE);

  // ═══════════════════════════════════════════════════════════
  //  NOTAS
  // ═══════════════════════════════════════════════════════════
  if (datos.notas) {
    y -= 18;
    const notasText = sanitize(datos.notas);
    const notasLines = wrapText(notasText, regular, 9, CONTENT_W - 30);
    const boxH = 32 + notasLines.length * 14;

    ensureSpace(boxH + 5);
    y -= boxH;
    borderRect(page, MARGIN, y, CONTENT_W, boxH, NOTES_BORDER, 0.75, NOTES_BG);

    page.drawText('OBSERVACIONES', {
      x: MARGIN + 14, y: y + boxH - 16, size: 7, font: bold, color: NOTES_TEXT
    });

    for (let i = 0; i < notasLines.length; i++) {
      page.drawText(notasLines[i], {
        x: MARGIN + 14, y: y + boxH - 30 - i * 14, size: 9, font: regular, color: NOTES_TEXT
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  COMPLETION STATUS (if receptor signed)
  // ═══════════════════════════════════════════════════════════
  if (datos.receptor) {
    y -= 18;
    ensureSpace(70);
    const compH = 62;
    y -= compH;
    borderRect(page, MARGIN, y, CONTENT_W, compH, COMPLETED_BORDER, 1, COMPLETED_BG);

    // Green badge "ENTREGADA"
    const badgeText = 'ENTREGADA';
    const btW = bold.widthOfTextAtSize(badgeText, 7) + 14;
    rect(page, MARGIN + 14, y + compH - 20, btW, 15, SIRIUS_GREEN);
    page.drawText(badgeText, {
      x: MARGIN + 21, y: y + compH - 17, size: 7, font: bold, color: WHITE
    });

    // Two columns
    const midX = MARGIN + CONTENT_W / 2;

    page.drawText('Receptor:', {
      x: MARGIN + 14, y: y + compH - 38, size: 7, font: regular, color: COMPLETED_TEXT
    });
    page.drawText(`${sanitize(datos.receptor.nombre)}  -  C.C. ${sanitize(datos.receptor.cedula)}`, {
      x: MARGIN + 14, y: y + compH - 52, size: 9, font: bold, color: COMPLETED_TEXT
    });

    page.drawText('Fecha de Recepcion:', {
      x: midX + 10, y: y + compH - 38, size: 7, font: regular, color: COMPLETED_TEXT
    });
    page.drawText(sanitize(datos.receptor.fechaFirma ? formatDateES(datos.receptor.fechaFirma) : 'N/A'), {
      x: midX + 10, y: y + compH - 52, size: 9, font: bold, color: COMPLETED_TEXT
    });
  }


  // ═══════════════════════════════════════════════════════════
  //  FOOTER — every page
  // ═══════════════════════════════════════════════════════════
  const pages = pdfDoc.getPages();
  for (let pi = 0; pi < pages.length; pi++) {
    const pg = pages[pi];
    const fY = 22;

    // Thin green line
    line(pg, MARGIN, fY + 18, PAGE_WIDTH - MARGIN, fY + 18, SIRIUS_GREEN, 0.75);

    pg.drawText('Documento generado automaticamente por DataLab  |  Sirius Regenerative Solutions S.A.S.', {
      x: MARGIN, y: fY + 8, size: 6.5, font: regular, color: TEXT_MUTED
    });
    pg.drawText(sanitize(`${fechaGen}  -  ${horaGen}`), {
      x: MARGIN, y: fY - 2, size: 6.5, font: regular, color: TEXT_MUTED
    });

    // Page number
    const pgNum = `${pi + 1} / ${pages.length}`;
    textRight(pg, pgNum, regular, 6.5, PAGE_WIDTH - MARGIN, fY + 8, TEXT_MUTED);

    // "Documento Valido" badge
    const badge = 'DOCUMENTO VALIDO';
    const bW = bold.widthOfTextAtSize(badge, 6.5) + 12;
    const bX = PAGE_WIDTH - MARGIN - bW;
    rect(pg, bX, fY - 5, bW, 13, SIRIUS_GREEN);
    pg.drawText(badge, { x: bX + 6, y: fY - 2, size: 6.5, font: bold, color: WHITE });
  }

  return pdfDoc.save();
}
