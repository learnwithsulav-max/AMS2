'use client';
import { useState } from 'react';
import { adminPost } from '@/lib/admin-api';
import { Btn, Card } from '../ui';

function csvRows(source: string) {
  const rows: string[][] = []; let row: string[] = [], value = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) { if (char === '"' && source[i + 1] === '"') { value += '"'; i++; } else if (char === '"') quoted = false; else value += char; }
    else if (char === '"') quoted = true;
    else if (char === ',') { row.push(value.trim()); value = ''; }
    else if (char === '\n' || char === '\r') { if (char === '\r' && source[i + 1] === '\n') i++; row.push(value.trim()); rows.push(row); row = []; value = ''; }
    else value += char;
  }
  if (value || row.length) { row.push(value.trim()); rows.push(row); }
  return rows.filter((r) => r.some(Boolean));
}

const aliases = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
export function QuestionImporter() {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true); setMessage('');
    try {
      const content = await file.text(); const [headers, ...rows] = csvRows(content.replace(/^\uFEFF/, ''));
      if (!headers?.length) throw new Error('The CSV file is empty.');
      const keys = headers.map(aliases);
      const parsed = rows.map((cells) => Object.fromEntries(keys.map((key, index) => [key, cells[index] || ''])));
      const result = await adminPost<{ imported: number; skipped: number }>('/api/admin/questions', { questions: parsed });
      setMessage(`Imported ${result.imported} questions. Skipped ${result.skipped} incomplete or duplicate rows.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Question import failed.'); }
    finally { setBusy(false); }
  }
  return <Card className="grid gap-4 p-5">
    <div><h2 className="font-bold">Bulk question import</h2><p className="mt-1 text-sm text-slate-600">CSV needs Category, Question, Option A, Option B, Option C, Option D and Correct. Optional bilingual columns: Question NE, Option A NE–Option D NE, Explanation and Explanation NE. Keep your vetted source file.</p></div>
    <input type="file" accept=".csv,text/csv" disabled={busy} onChange={(e) => { void importFile(e.target.files?.[0]); e.currentTarget.value = ''; }} />
    {busy && <p role="status" className="text-sm text-slate-600">Validating and importing…</p>}
    {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
  </Card>;
}
