/** Código de delegación: macrorregión-disciplina-categoría-género (M1-AJD-B-D). */
export const buildDelegationCode = (parts: {
  macroCode: string;
  sportCode: string;
  category: string;
  gender: string;
}): string =>
  [parts.macroCode, parts.sportCode, parts.category, parts.gender].join('-');
