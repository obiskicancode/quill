/**
 * CSV export helpers. Cells are quoted and formula-prefixed so exported admin
 * data cannot execute in Excel, Google Sheets or LibreOffice.
 *
 * Escapes one cell and neutralises formula injection. Cells beginning with
 * `=`, `+`, `-`, `@`, tab or carriage return are prefixed with an apostrophe.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';

  let str = String(value);

  // Prevent formula injection in Excel / Google Sheets / LibreOffice
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape double quotes
  if (
    str.includes('"') ||
    str.includes(',') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Builds a CRLF-delimited CSV document from headers and rows. Rows beyond
 * `maxRows` are dropped and reported through `capped`, so callers can warn the
 * operator instead of silently truncating an export.
 */
export function generateCsvStream(params: {
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  maxRows?: number;
}): { csv: string; totalExported: number; capped: boolean } {
  const max = params.maxRows ?? 10_000;
  const isCapped = params.rows.length > max;
  const exportRows = isCapped ? params.rows.slice(0, max) : params.rows;

  const lines: string[] = [];
  lines.push(params.headers.map(sanitizeCsvCell).join(','));

  for (const row of exportRows) {
    lines.push(row.map(sanitizeCsvCell).join(','));
  }

  return {
    csv: lines.join('\r\n'),
    totalExported: exportRows.length,
    capped: isCapped,
  };
}
