import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import {
  BACK,
  Box,
  CARD,
  FRONT,
  MIN_FONT_SIZE,
  TextLine,
} from './credential-layout';

/** Datos variables que se imprimen sobre el arte preimpreso. */
export interface CredentialPrintData {
  fullName: string;
  /** "DNI 00007342" / "CE 001234567" / "PAS AB123456" */
  document: string;
  /** Delegación y colegio (regulares) o institución (especiales). */
  institution: string;
  copyLabel: string;
  verificationUrl: string;
  /** JPG o PNG; null si no hay foto (el recuadro queda en blanco). */
  photo: Buffer | null;
}

export interface RenderOptions {
  offsetXmm: number;
  offsetYmm: number;
  /** Hoja de prueba: dibuja el contorno y las guías para calibrar en papel común. */
  guides?: boolean;
}

const PT_PER_MM = 72 / 25.4;
const pt = (mm: number) => mm * PT_PER_MM;
const FONT = 'Helvetica-Bold';

/** Una o varias credenciales en un solo PDF: anverso y reverso por ejemplar. */
export async function renderCredentials(
  credentials: CredentialPrintData[],
  options: RenderOptions,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: [pt(CARD.width), pt(CARD.height)],
    margin: 0,
    autoFirstPage: false,
    info: { Title: 'Credenciales JEDPA', Producer: 'JEDPA' },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const at = (mm: number, axis: 'x' | 'y') =>
    pt(mm + (axis === 'x' ? options.offsetXmm : options.offsetYmm));

  for (const credential of credentials) {
    // ── Anverso ──
    doc.addPage();
    if (options.guides) drawGuides(doc, 'Anverso');
    if (credential.photo) drawPhoto(doc, credential.photo, FRONT.photo, at);
    drawLine(doc, credential.fullName, FRONT.name, at);
    drawLine(doc, credential.document, FRONT.document, at);
    drawLine(doc, credential.institution, FRONT.institution, at);

    // ── Reverso ──
    doc.addPage();
    if (options.guides) drawGuides(doc, 'Reverso');
    const qr = await QRCode.toBuffer(credential.verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 0,
      width: 600,
    });
    doc.image(qr, at(BACK.qr.x, 'x'), at(BACK.qr.y, 'y'), {
      width: pt(BACK.qr.width),
      height: pt(BACK.qr.height),
    });
    drawLine(doc, credential.copyLabel, BACK.copy, at);
  }

  doc.end();
  return finished;
}

type At = (mm: number, axis: 'x' | 'y') => number;

/** Texto centrado en su línea; reduce la letra si no entra (nombres largos). */
function drawLine(
  doc: PDFKit.PDFDocument,
  text: string,
  line: TextLine,
  at: At,
) {
  if (!text) return;
  let size = line.fontSize;
  doc.font(FONT);
  while (
    size > MIN_FONT_SIZE &&
    doc.fontSize(size).widthOfString(text) > pt(line.width)
  ) {
    size -= 0.5;
  }
  doc.fontSize(size);
  doc.text(text, at(line.x, 'x'), at(line.y, 'y') - size, {
    width: pt(line.width),
    align: 'center',
    lineBreak: false,
    ellipsis: true,
  });
}

/** Foto recortada para cubrir el recuadro, sin deformarla. */
function drawPhoto(doc: PDFKit.PDFDocument, photo: Buffer, box: Box, at: At) {
  const [x, y, w, h] = [
    at(box.x, 'x'),
    at(box.y, 'y'),
    pt(box.width),
    pt(box.height),
  ];
  try {
    doc.save().rect(x, y, w, h).clip();
    doc.image(photo, x, y, {
      cover: [w, h],
      align: 'center',
      valign: 'center',
    });
  } catch {
    // Imagen ilegible: se deja el recuadro en blanco en vez de fallar todo el lote.
  } finally {
    doc.restore();
  }
}

/** Contorno de la cartulina y recuadros, para la hoja de prueba. */
function drawGuides(doc: PDFKit.PDFDocument, side: string) {
  doc.save().lineWidth(0.5).strokeColor('#999999');
  doc.rect(0.5, 0.5, pt(CARD.width) - 1, pt(CARD.height) - 1).stroke();
  const boxes: Box[] = side === 'Anverso' ? [FRONT.photo] : [BACK.qr];
  for (const b of boxes)
    doc.rect(pt(b.x), pt(b.y), pt(b.width), pt(b.height)).stroke();
  const lines =
    side === 'Anverso'
      ? [FRONT.name, FRONT.document, FRONT.institution]
      : [BACK.copy];
  for (const l of lines) {
    doc
      .moveTo(pt(l.x), pt(l.y))
      .lineTo(pt(l.x + l.width), pt(l.y))
      .dash(2, { space: 2 })
      .stroke()
      .undash();
  }
  doc
    .font('Helvetica')
    .fontSize(6)
    .fillColor('#999999')
    .text(`HOJA DE PRUEBA · ${side} · 120 × 155 mm`, pt(4), pt(4), {
      lineBreak: false,
    });
  doc.restore().fillColor('#000000');
}
