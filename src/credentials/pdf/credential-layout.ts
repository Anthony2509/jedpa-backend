/**
 * Posiciones de impresión sobre la cartulina preimpresa (en mm, origen arriba-izquierda).
 * Medidas tomadas de la credencial de muestra del cliente (edición anterior).
 * Ajustar aquí cuando lleguen los artes 2026; la calibración fina por impresora se
 * hace con CREDENTIAL_OFFSET_X_MM / CREDENTIAL_OFFSET_Y_MM.
 */
export const CARD = { width: 120, height: 155 } as const;

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextLine {
  /** Línea base aproximada del texto (mm). */
  y: number;
  x: number;
  width: number;
  fontSize: number;
}

export const FRONT = {
  photo: { x: 77.5, y: 22.5, width: 30.5, height: 35 } satisfies Box,
  /** "Nombres y apellidos" */
  name: { x: 14, y: 70, width: 92, fontSize: 12 } satisfies TextLine,
  /** "DNI / CE / Pas." */
  document: { x: 14, y: 89.5, width: 92, fontSize: 12 } satisfies TextLine,
  /** "Institución" (especiales) o delegación / colegio (regulares) */
  institution: { x: 14, y: 108, width: 92, fontSize: 11 } satisfies TextLine,
} as const;

export const BACK = {
  qr: { x: 37.5, y: 50, width: 45, height: 45 } satisfies Box,
  /** Ejemplar: "Original" / "Duplicado 1" */
  copy: { x: 14, y: 101, width: 92, fontSize: 8 } satisfies TextLine,
} as const;

/** Tamaño mínimo de letra al reducir textos largos para que entren en su línea. */
export const MIN_FONT_SIZE = 7;
