import { StreamableFile } from '@nestjs/common';

/** Respuesta PDF para abrir en el navegador (inline). El nombre nunca lleva datos personales. */
export const pdfFile = (pdf: Buffer, name: string) =>
  new StreamableFile(pdf, {
    type: 'application/pdf',
    disposition: `inline; filename="${name}"`,
  });
