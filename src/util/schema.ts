export function requireColumns(
  columns: string[],
  required: string[],
): string[] {
  return required.filter((c) => !columns.includes(c));
}
