import { renderCredentials } from './credential-pdf.renderer';

/** PNG real de 1×1 píxel. */
const PHOTO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const sample = {
  fullName: 'JUAN CARLOS PÉREZ QUISPE',
  document: 'DNI 00007342',
  institution: 'M1-AJD-B-D · IE SAN MARTÍN',
  copyLabel: 'Original',
  verificationUrl: 'http://localhost:3000/verificar/abc',
};

const pageBoxes = (pdf: Buffer) =>
  [...pdf.toString('latin1').matchAll(/\/MediaBox \[([^\]]+)\]/g)].map((m) =>
    m[1].trim().split(/\s+/).map(Number),
  );

describe('renderCredentials', () => {
  it('genera anverso y reverso de 120 × 155 mm por ejemplar', async () => {
    const pdf = await renderCredentials(
      [
        { ...sample, photo: PHOTO },
        { ...sample, copyLabel: 'Duplicado 1', photo: null },
      ],
      { offsetXmm: 0, offsetYmm: 0 },
    );
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const boxes = pageBoxes(pdf);
    expect(boxes).toHaveLength(4);
    for (const [, , width, height] of boxes) {
      expect((width * 25.4) / 72).toBeCloseTo(120, 1);
      expect((height * 25.4) / 72).toBeCloseTo(155, 1);
    }
  });

  it('no falla si la foto es ilegible (deja el recuadro en blanco)', async () => {
    const corrupt = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0,
    ]);
    await expect(
      renderCredentials([{ ...sample, photo: corrupt }], {
        offsetXmm: 2,
        offsetYmm: -1,
        guides: true,
      }),
    ).resolves.toBeInstanceOf(Buffer);
  });
});
