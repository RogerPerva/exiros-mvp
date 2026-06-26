/**
 * Saneadores de entrada para los formularios del portal (MVP §3.2, mismas reglas
 * que la app Android). Se aplican en `onChange` para que el carácter inválido nunca
 * llegue a aparecer en el campo.
 */

/** Etiqueta/razón social (destino, proveedor): letras, dígitos, espacios y . , & - */
export function sanitizeLabel(value: string): string {
  return value.replace(/[^\p{L}\p{N} .,&-]/gu, '');
}

/** Nombre de persona (usuario): letras, espacios y . - (sin dígitos ni símbolos basura) */
export function sanitizeName(value: string): string {
  return value.replace(/[^\p{L} .-]/gu, '');
}

/** Formato de correo electrónico válido. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
