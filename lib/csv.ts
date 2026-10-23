export function exportCsv(name: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8' }); // BOM keeps Nepali text intact in Excel
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
