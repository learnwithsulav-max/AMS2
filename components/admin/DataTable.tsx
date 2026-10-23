'use client';
import { exportCsv } from '@/lib/csv';
import { Btn, Card } from '../ui';

export type Col = { k: string; h: string; render?: (r: any) => any; csv?: (r: any) => any };

export function DataPager({ page, total, pageSize, onPageChange }: { page: number; total: number; pageSize: number; onPageChange: (page: number) => void }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="no-print flex items-center justify-between border-t border-slate-100 px-3 py-2 text-sm text-slate-600">
      <span>{total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}` : '0 records'}</span>
      <div className="flex gap-2">
        <Btn variant="ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Btn>
        <span className="self-center">Page {page} of {pageCount}</span>
        <Btn variant="ghost" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>Next</Btn>
      </div>
    </div>
  );
}

export function DataTable({
  cols, rows, name, empty = 'No records yet.', page, total, pageSize = 100, onPageChange, onSearch,
}: {
  cols: Col[];
  rows: any[];
  name: string;
  empty?: string;
  page?: number;
  total?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onSearch?: (value: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-3">
        {onSearch ? (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); onSearch(new FormData(e.currentTarget).get('search')?.toString() || ''); }}>
            <input name="search" aria-label={`Search ${name}`} placeholder={`Search ${name}...`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <Btn type="submit" variant="ghost">Search</Btn>
          </form>
        ) : <span />}
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => exportCsv(name, cols.map((c) => c.h), rows.map((r) => cols.map((c) => (c.csv ? c.csv(r) : r[c.k]))))}>Export CSV (Excel)</Btn>
          <Btn variant="ghost" onClick={() => window.print()}>Print / Save PDF</Btn>
        </div>
      </div>
      {page !== undefined && total !== undefined && onPageChange && <DataPager page={page} total={total} pageSize={pageSize} onPageChange={onPageChange} />}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr>{cols.map((c) => <th key={c.k} className="px-3 py-2 font-semibold">{c.h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id || i} className="border-t border-slate-100">{cols.map((c) => <td key={c.k} className="px-3 py-2">{c.render ? c.render(r) : r[c.k] ?? '-'}</td>)}</tr>
            ))}
            {!rows.length && <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-slate-500">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
