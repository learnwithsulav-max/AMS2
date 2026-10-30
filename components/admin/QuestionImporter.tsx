'use client';
import { useEffect, useState } from 'react';
import { adminPost } from '@/lib/admin-api';
import { adminGet } from '@/lib/admin-api';
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
  const [questions, setQuestions] = useState<any[]>([]); const [search, setSearch] = useState('');
  async function refresh() { try { const result = await adminGet<{data:any[]}>('/api/admin/questions?search='+encodeURIComponent(search)); setQuestions(result.data); } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not load questions.'); } }
  useEffect(() => { void refresh(); }, [search]);
  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true); setMessage('');
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Keep question files under 10 MB.');
      let matrix: string[][];
      if (/\.xlsx$/i.test(file.name)) {
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const sheet = workbook.worksheets[0];
        if (!sheet) throw new Error('The workbook has no worksheets.');
        if (sheet.rowCount > 10001 || sheet.columnCount > 40) throw new Error('Use at most 10,000 data rows and 40 columns.');
        matrix = [];
        sheet.eachRow({ includeEmpty: false }, row => {
          const cells: string[] = [];
          row.eachCell({ includeEmpty: true }, (cell, column) => { cells[column - 1] = cell.text?.trim() || ''; });
          matrix.push(cells);
        });
      } else {
        const content = await file.text(); matrix = csvRows(content.replace(/^\uFEFF/, ''));
      }
      const [headers, ...rows] = matrix;
      if (!headers?.length) throw new Error('The spreadsheet file is empty.');
      if (rows.length > 10000) throw new Error('Use no more than 10,000 question rows per import.');
      const keys = headers.map(aliases);
      const parsed = rows.map((cells) => Object.fromEntries(keys.map((key, index) => [key, cells[index] || ''])));
      const result = await adminPost<{ imported: number; skipped: number }>('/api/admin/questions', { questions: parsed });
      setMessage(`Imported ${result.imported} questions. Skipped ${result.skipped} incomplete, duplicate or unverified active rows.`);
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Question import failed.'); }
    finally { setBusy(false); }
  }
  return <Card className="grid gap-4 p-5">
    <div><h2 className="font-bold">Bulk question import</h2><p className="mt-1 text-sm text-slate-600">CSV/XLSX columns: Category, Question, Option A–D, Correct. Include bilingual text/options, difficulty, explanations and Active=true to request activation. Active items need source links in both admin-only explanations, similar option lengths in both languages, and multi-sentence scenarios for case topics.</p></div>
    <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} onChange={(e) => { void importFile(e.target.files?.[0]); e.currentTarget.value = ''; }} />
    {busy && <p role="status" className="text-sm text-slate-600">Validating and importing…</p>}
    {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    <div className="mt-3 grid gap-3 border-t pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Question bank · topic and language management</h3><div className="flex gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search questions" className="rounded-lg border px-3 py-2 text-sm"/><Btn variant="ghost" onClick={()=>void refresh()}>Search</Btn><Btn variant="ghost" onClick={()=>void refresh()}>Refresh</Btn></div></div>
    {questions.map(q=><QuestionRow key={q.id} item={q} onSaved={()=>void refresh()} onMessage={setMessage}/>)}
    {!questions.length&&<p className="text-sm text-slate-500">No questions loaded.</p>}</div>
  </Card>;
}

function QuestionRow({item,onSaved,onMessage}:{item:any;onSaved:()=>void;onMessage:(value:string)=>void}){
 const [open,setOpen]=useState(false);const [saving,setSaving]=useState(false);
 async function save(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);try{const form=new FormData(e.currentTarget);const options=Object.fromEntries(['a','b','c','d'].flatMap(k=>[[`option_${k}_en`,form.get(`option_${k}_en`)],[`option_${k}_ne`,form.get(`option_${k}_ne`)]]));await adminPost('/api/admin/questions',{action:'update',id:item.id,category:form.get('category'),language:form.get('language'),difficulty:form.get('difficulty'),active:form.get('active')==='on',question_en:form.get('question_en'),question_ne:form.get('question_ne'),correct_option:form.get('correct_option'),...options,explanation_en:form.get('explanation_en'),explanation_ne:form.get('explanation_ne')});onMessage('Question updated.');setOpen(false);onSaved();}catch(err){onMessage(err instanceof Error?err.message:'Could not update question.');}finally{setSaving(false);}}
 return <article className="rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="min-w-0 flex-1 text-sm font-medium">{item.question_en||item.question_ne||`Question ${item.id}`}</p><span className="text-xs text-slate-500">{item.category} · {item.language} · {item.difficulty||'medium'} · {item.active?'active':'hidden'}</span><Btn variant="ghost" onClick={()=>setOpen(!open)}>{open?'Close':'Edit'}</Btn></div>{open&&<form onSubmit={save} className="mt-3 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Topic<select name="category" defaultValue={item.category} className="rounded-lg border px-3 py-2">{['nia','reinsurance','life','nonlife','microinsurance','aml_cft','agent_conduct','life_cases','nonlife_cases','micro_cases'].map(v=><option key={v}>{v}</option>)}</select></label><label className="grid gap-1 text-sm">Language<select name="language" defaultValue={item.language} className="rounded-lg border px-3 py-2"><option value="en">English</option><option value="ne">Nepali</option><option value="mixed">Mixed</option></select></label><label className="grid gap-1 text-sm">Difficulty<select name="difficulty" defaultValue={item.difficulty||'medium'} className="rounded-lg border px-3 py-2"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label><label className="grid gap-1 text-sm sm:col-span-2">Question (English)<textarea name="question_en" defaultValue={item.question_en||''} maxLength={1200} className="rounded-lg border px-3 py-2"/></label><label className="grid gap-1 text-sm sm:col-span-2">Question (Nepali)<textarea name="question_ne" defaultValue={item.question_ne||''} maxLength={1200} className="rounded-lg border px-3 py-2"/></label><div key="opts" className="grid gap-3 sm:col-span-2 sm:grid-cols-2">{['a','b','c','d'].map(k=><div key={k} className="grid gap-2 rounded border p-3"><b>Option {k.toUpperCase()}</b><label className="grid gap-1 text-sm">English<input name={`option_${k}_en`} defaultValue={item[`option_${k}_en`]||''} maxLength={500} className="rounded-lg border px-3 py-2"/></label><label className="grid gap-1 text-sm">Nepali<input name={`option_${k}_ne`} defaultValue={item[`option_${k}_ne`]||''} maxLength={500} className="rounded-lg border px-3 py-2"/></label></div>)}</div><label className="grid gap-1 text-sm">Correct answer<select name="correct_option" defaultValue={item.correct_option} className="rounded-lg border px-3 py-2">{['A','B','C','D'].map(k=><option key={k}>{k}</option>)}</select></label><label className="grid gap-1 text-sm">Explanation (English)<textarea name="explanation_en" defaultValue={item.explanation_en||''} maxLength={2000} className="rounded-lg border px-3 py-2"/></label><label className="grid gap-1 text-sm">Explanation (Nepali)<textarea name="explanation_ne" defaultValue={item.explanation_ne||''} maxLength={2000} className="rounded-lg border px-3 py-2"/></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={item.active}/> Included in exams</label><Btn type="submit" disabled={saving}>{saving?'Saving…':'Save question'}</Btn></form>}</article>
}
