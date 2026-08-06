// Tiny CSV writer + browser download (no dependency). Used by the Participants
// page so a creator can pull their list into a spreadsheet or a group platform.

// Excel and Google Sheets run a cell that opens with one of these as a formula.
// Participant names and contact numbers come from the public enrollment form on
// /p/:id, so they're untrusted — prefix those values with a quote and the
// spreadsheet shows the text instead of running it.
const ALWAYS_UNSAFE = /^[=@\t\r]/;
// `+` and `-` also lead international phone numbers ("+63 917 555 0100"), and a
// whole column of '+63... would be junk in the group platform the creator is
// importing into. Bare arithmetic can't do anything anyway — a payload that can
// (HYPERLINK, WEBSERVICE, IMPORTXML, a DDE `cmd|`, a cell reference) always needs
// a function name or a pipe. So only guard sign-led values that contain one.
const SIGN_LED = /^[+-]/;
const CALLABLE = /[a-zA-Z|]/;

function isFormula(value: string): boolean {
  if (ALWAYS_UNSAFE.test(value)) return true;
  return SIGN_LED.test(value) && CALLABLE.test(value);
}

// Byte-order mark, written as an escape so it stays visible in source and
// survives editors that strip stray BOM characters.
const BOM = '\uFEFF';

function escapeField(value: string): string {
  const safe = isFormula(value) ? `'${value}` : value;
  return /["\n\r,]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Serialize a header row + body rows to CSV text (CRLF line endings, as Excel expects). */
export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeField).join(',')).join('\r\n');
}

/**
 * Save CSV text as a file. The leading BOM is what makes Excel render accented
 * names correctly instead of mojibake.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke on the next tick — Safari needs the URL to outlive the click.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
