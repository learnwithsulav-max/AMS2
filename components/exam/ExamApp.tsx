'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Btn, Card, Field, LinkBtn, Badge, cx } from '../ui';
import { useI18n } from '@/lib/i18n';
import { BRAND, EXAM } from '@/lib/brand';
import { downloadPdf, downloadPng, renderCertificate } from './certificate';
import { PassPurchase } from './PassPurchase';

const SESSION = 'lsw_exam_session';
const HISTORY = 'lsw_exam_history';
const LETTERS = ['A', 'B', 'C', 'D'];
const read = (k: string, d: any) => { try { return JSON.parse(localStorage.getItem(k) || '') ?? d; } catch { return d; } };

export default function ExamApp() {
  const { t } = useI18n();
  const [stage, setStage] = useState<'intro' | 'exam' | 'result'>('intro');
  const [who, setWho] = useState({ name: '', phone: '' });
  const [passCode, setPassCode] = useState('');
  const [salesActive, setSalesActive] = useState(false);
  const onPassAvailability = useCallback((active: boolean) => setSalesActive(active), []);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [saved, setSaved] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const offset = useRef(0);
  const submitting = useRef(false);

  useEffect(() => {
    setHistory(read(HISTORY, []));
    const s = read(SESSION, null);
    if (s && new Date(s.attempt.endsAt).getTime() > Date.now() - 120000) setSaved(s);
  }, []);

  const begin = (a: any, ans: Record<string, string>, pg: number) => {
    offset.current = a.serverNow - Date.now();
    setAttempt(a); setAnswers(ans); setPage(pg); setStage('exam'); setResult(null);
  };

  async function start(e: any) {
    e.preventDefault(); setBusy(true); setErr('');
    const r = await fetch('/api/exam/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(salesActive ? { passCode } : who) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setErr(j.error || 'Something went wrong.');
    setPassCode('');
    localStorage.setItem(SESSION, JSON.stringify({ attempt: j, answers: {}, page: 0 }));
    begin(j, {}, 0);
  }

  const persist = (ans: Record<string, string>, pg: number) => {
    try { localStorage.setItem(SESSION, JSON.stringify({ attempt, answers: ans, page: pg })); } catch {}
  };
  const pick = (qid: number, k: string) => { const a = { ...answers, [qid]: k }; setAnswers(a); persist(a, page); };
  const go = (p: number) => { setPage(p); persist(answers, p); window.scrollTo({ top: 0 }); };

  const submit = useCallback(async () => {
    if (submitting.current || !attempt) return;
    submitting.current = true;
    const r = await fetch('/api/exam/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attemptId: attempt.attemptId, answers }) });
    const j = await r.json();
    submitting.current = false;
    if (!r.ok) return alert(j.error || 'Could not submit. Check your connection and try again.');
    localStorage.removeItem(SESSION);
    const h = [{ at: new Date().toISOString(), score: j.score, max: j.max, passed: j.passed }, ...read(HISTORY, [])].slice(0, 10);
    localStorage.setItem(HISTORY, JSON.stringify(h)); setHistory(h);
    setResult(j); setStage('result');
  }, [attempt, answers]);

  // Countdown from the server's clock, auto-submits at zero.
  useEffect(() => {
    if (stage !== 'exam' || !attempt) return;
    const tick = () => {
      const ms = new Date(attempt.endsAt).getTime() - (Date.now() + offset.current);
      setLeft(Math.max(0, Math.floor(ms / 1000)));
      if (ms <= 0) submit();
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [stage, attempt, submit]);

  useEffect(() => {
    if (stage !== 'exam') return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [stage]);

  /* ---------- intro ---------- */
  if (stage === 'intro') {
    return (
      <div className="mx-auto grid max-w-4xl gap-6 px-4 py-10 md:grid-cols-[1.2fr_1fr]">
        <Card className="p-6">
          <h1 className="text-2xl font-extrabold">{t('exam_login_title')}</h1>
          <p className="mt-2 text-slate-600">{t('exam_rules')}</p>
          {saved && (
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm">
              <p className="font-semibold">{saved.attempt.name}</p>
              <Btn className="mt-2" onClick={() => begin(saved.attempt, saved.answers, saved.page)}>{t('resume')}</Btn>
            </div>
          )}
          <form onSubmit={start} className="mt-5 grid gap-4">
            {salesActive ? <Field label="Approved exam pass code" required value={passCode} onChange={(e: any) => setPassCode(e.target.value.toUpperCase())} /> : <><Field label={t('full_name')} required value={who.name} onChange={(e: any) => setWho({ ...who, name: e.target.value })} /><Field label={t('phone')} required inputMode="tel" value={who.phone} onChange={(e: any) => setWho({ ...who, phone: e.target.value })} /></>}            {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
            <Btn type="submit" disabled={busy}>{t('start')}</Btn>
          </form>
        </Card>
        <PassPurchase onPassCode={setPassCode} onAvailability={onPassAvailability} />
        <Card className="p-6">
          <h2 className="font-bold">{t('history')}</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {history.map((h, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="text-slate-600">{new Date(h.at).toLocaleDateString()}</span>
                <span><b>{h.score}</b>/{h.max} <Badge tone={h.passed ? 'green' : 'red'}>{h.passed ? 'Pass' : 'Fail'}</Badge></span>
              </li>
            ))}
            {!history.length && <li className="text-slate-500">-</li>}
          </ul>
        </Card>
      </div>
    );
  }

  /* ---------- result ---------- */
  if (stage === 'result' && result) return <Result r={result} t={t} onRetake={() => { setStage('intro'); setSaved(null); }} />;

  /* ---------- exam ---------- */
  const qs: any[] = attempt.questions;
  const pages = Math.ceil(qs.length / EXAM.perPage);
  const slice = qs.slice(page * EXAM.perPage, page * EXAM.perPage + EXAM.perPage);
  const done = Object.keys(answers).length;
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0');
  const confirmSubmit = () => {
    const open = qs.length - done;
    if (confirm(open ? `${open} questions are unanswered. Submit anyway?` : 'Submit your exam now?')) submit();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm"><b>{t('page')} {page + 1}</b> {t('of')} {pages}<span className="ml-3 text-slate-500">{done}/{qs.length} {t('answered')}</span></div>
          <div className={cx('rounded-lg px-3 py-1.5 text-lg font-extrabold tabular-nums', left < 300 ? 'bg-red-100 text-red-700' : 'bg-slate-100')} aria-live="off">
            <span className="mr-2 text-xs font-medium text-slate-500">{t('time_left')}</span>{mm}:{ss}
          </div>
          <Btn variant="dark" onClick={confirmSubmit}>{t('submit')}</Btn>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: pages }, (_, p) => {
            const ids = qs.slice(p * EXAM.perPage, p * EXAM.perPage + EXAM.perPage).map((q) => q.id);
            const n = ids.filter((id) => answers[id]).length;
            return (
              <button key={p} onClick={() => go(p)} aria-label={`${t('page')} ${p + 1}`} aria-current={p === page}
                className={cx('h-8 w-8 rounded-md border text-sm font-semibold', p === page ? 'border-navy bg-navy text-white' : n === ids.length ? 'border-brand bg-blue-50 text-brand' : n ? 'border-blue-200 bg-white' : 'border-slate-300 bg-white text-slate-600')}>
                {p + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6">
        {slice.map((q, i) => (
          <Card key={q.id} className="p-5 sm:p-6">
            <p className="text-xl font-semibold leading-relaxed sm:text-2xl">
              <span className="mr-2 text-brand">{page * EXAM.perPage + i + 1}.</span>{q.q}
            </p>
            <div className="mt-4 grid gap-3" role="radiogroup">
              {q.options.map((o: any, j: number) => {
                const on = answers[q.id] === o.k;
                return (
                  <button key={o.k} role="radio" aria-checked={on} onClick={() => pick(q.id, o.k)}
                    className={cx('flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left text-lg leading-relaxed transition sm:text-xl',
                      on ? 'border-brand bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-400')}>
                    <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-bold', on ? 'bg-brand text-white' : 'bg-slate-100')}>{LETTERS[j]}</span>
                    <span>{o.text}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <Btn variant="ghost" disabled={page === 0} onClick={() => go(page - 1)}>{t('prev')}</Btn>
        {page < pages - 1 ? <Btn onClick={() => go(page + 1)}>{t('next')}</Btn> : <Btn variant="dark" onClick={confirmSubmit}>{t('submit')}</Btn>}
      </div>
    </div>
  );
}

function Result({ r, t, onRetake }: { r: any; t: (k: string) => string; onRetake: () => void }) {
  const [url, setUrl] = useState('');
  const [reported, setReported] = useState<number[]>([]);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!r.passed) return;
    renderCertificate({ name: r.name, score: r.score, max: r.max, certId: r.certId, date: new Date(r.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) })
      .then((c) => { canvas.current = c; setUrl(c.toDataURL('image/jpeg', 0.85)); });
  }, [r]);
  const file = `LearnWithSulav-Certificate-${r.name.replace(/\s+/g, '-')}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Card className={cx('p-6 text-center', r.passed ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50')}>
        <h1 className={cx('text-3xl font-extrabold', r.passed ? 'text-emerald-800' : 'text-red-700')}>{r.passed ? t('pass') : t('fail')}</h1>
        <p className="mt-1 text-slate-700">{r.name}</p>
        <p className="mt-3 text-5xl font-extrabold">{r.score}<span className="text-2xl text-slate-500"> / {r.max}</span></p>
        <p className="text-sm text-slate-600">{t('marks')}</p>
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <span>{t('correct')}: <b>{r.correct}</b></span><span>{t('wrong')}: <b>{r.wrong}</b></span><span>{t('skipped')}: <b>{r.skipped}</b></span>
        </div>
        {r.expired && <p className="mt-3 text-sm text-red-700">Time ran out before the answers reached the server.</p>}
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-bold">{t('cert_title')}</h2>
        {r.passed ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {url ? <img src={url} alt="Certificate preview" className="mt-4 w-full rounded-lg border border-slate-200" /> : <p className="mt-4 text-slate-500">...</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              <Btn disabled={!url} onClick={() => canvas.current && downloadPng(canvas.current, file)}>{t('cert_png')}</Btn>
              <Btn variant="ghost" disabled={!url} onClick={() => canvas.current && downloadPdf(canvas.current, file)}>{t('cert_pdf')}</Btn>
              <LinkBtn variant="gold" href={BRAND.links.pass} target="_blank" rel="noopener noreferrer">{t('link_pass')}</LinkBtn>
            </div>
          </>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-slate-600">{t('cert_locked')}</p>
            <LinkBtn variant="gold" href={BRAND.links.fail} target="_blank" rel="noopener noreferrer">{t('link_fail')}</LinkBtn>
          </div>
        )}
      </Card>

      <div className="mt-6 flex justify-between">
        <Btn onClick={onRetake}>{t('retake')}</Btn>
      </div>

      <details className="mt-6">
        <summary className="cursor-pointer text-lg font-bold">{t('review')}</summary>
        <div className="mt-3 grid gap-3">
          {r.review.map((x: any, i: number) => (
            <Card key={x.id} className={cx('p-4', x.ok ? 'border-emerald-200' : 'border-red-200')}>
              <p className="font-semibold">{i + 1}. {x.q}</p>
              <p className="mt-2 text-sm">Your answer: <b className={x.ok ? 'text-emerald-700' : 'text-red-700'}>{x.chosen || 'Not answered'}</b></p>
              {!x.ok && <p className="text-sm">Correct answer: <b className="text-emerald-700">{x.right}</b></p>}
              <ReportQuestion attemptId={r.attemptId} questionId={x.id} done={reported.includes(x.id)} onDone={() => setReported((ids)=>[...ids,x.id])}/>
            </Card>
          ))}
        </div>
      </details>
    </div>
  );
}

function ReportQuestion({attemptId,questionId,done,onDone}:{attemptId:string;questionId:number;done:boolean;onDone:()=>void}){const [open,setOpen]=useState(false);const [kind,setKind]=useState('wrong_answer');const [details,setDetails]=useState('');const [error,setError]=useState('');async function send(e:React.FormEvent){e.preventDefault();const r=await fetch('/api/exam/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId,questionId,reportType:kind,details})});const j=await r.json();if(!r.ok){setError(j.error||'Could not send report.');return;}onDone();setOpen(false);}return <div className="mt-3">{done?<span className="text-xs text-emerald-700">Report received</span>:!open?<button className="text-xs font-semibold text-[#0A4F8A] underline" onClick={()=>setOpen(true)}>Report question</button>:<form onSubmit={send} className="grid gap-2 sm:grid-cols-[auto_1fr_auto]"><select value={kind} onChange={e=>setKind(e.target.value)} className="rounded border px-2 py-1 text-sm"><option value="wrong_answer">Wrong answer</option><option value="unclear">Unclear question</option><option value="translation">Translation issue</option><option value="other">Other</option></select><input value={details} onChange={e=>setDetails(e.target.value)} maxLength={1000} placeholder="Optional details" className="rounded border px-2 py-1 text-sm"/><Btn type="submit">Send</Btn>{error&&<p className="text-xs text-red-700 sm:col-span-3">{error}</p>}</form>}</div>}
