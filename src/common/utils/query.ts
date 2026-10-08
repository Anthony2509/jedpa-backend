import { TransformFnParams } from 'class-transformer';

/** Convierte "true"/"false" del query string a boolean; deja el resto para que falle la validación. */
export const toBoolean = ({ value }: TransformFnParams): unknown => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};
