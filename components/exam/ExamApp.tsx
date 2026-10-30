'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Btn, Card, Field, LinkBtn, Badge, cx } from '../ui';
import { useI18n } from '@/lib/i18n';
import { BRAND, EXAM } from '@/lib/brand';
import { downloadPdf, downloadPng, renderCertificate } from './certificate';
import { PassPurchase } from './PassPurchase';
import { ExamAccount } from './ExamAccount';
import { useAuth } from '@/lib/auth';

const LETTERS = ['A', 'B', 'C', 'D'];
const read = (k: string, d: any) => { try { return JSON.parse(localStorage.getItem(k) || '') ?? d; } catch { return d; } };

export default function ExamApp() {
  const { t, lang } = useI18n();
  const { session, profile, loading, signOut } = useAuth();
  const [stage, setStage] = useState<'intro' | 'exam' | 'result'>('intro');
  const [access, setAccess] = useState<any>(null);
  const [accessError, setAccessError] = useState('');
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyCertBusy, setHistoryCertBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const offset = useRef(0);
  const submitting = useRef(false);

  useEffect(() => {
    if (!session?.user.id || profile?.portal_type !== 'exam_candidate') return;
    const historyKey = `lsw_exam_history:${session.user.id}`;
    const sessionKey = `lsw_exam_session:${session.user.id}`;
    setHistory(read(historyKey, []));
    void fetch('/api/exam/history', { headers: { Authorization: `Bearer ${session?.access_token || ''}` }, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data.attempts)) {
          const merged = [...data.attempts, ...read(historyKey, [])]
            .filter((item, index, all) => all.findIndex((candidate) =>
              (item.id && candidate.id === item.id)
              || (item.certId && candidate.certId === item.certId)
              || (!item.id && !candidate.id && !item.certId && !candidate.certId
                && item.score === candidate.score && item.max === candidate.max
                && Math.abs(new Date(item.at).getTime() - new Date(candidate.at).getTime()) < 120000)) === index)
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
          setHistory(merged.slice(0, 20));
          try { localStorage.setItem(historyKey, JSON.stringify(merged.slice(0, 20))); } catch {}
        }
      }).catch(() => {});
    const s = read(sessionKey, null);
    if (s && new Date(s.attempt.endsAt).getTime() > Date.now() - 120000) setSaved(s);
    else setSaved(null);
  }, [profile?.portal_type, session?.access_token, session?.user.id]);

  useEffect(() => {
    if (!session?.access_token || profile?.portal_type !== 'exam_candidate') {
      setAccess(null);
      return;
    }
    let active = true;
    setAccessError('');
    fetch('/api/exam/access', {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not check exam access.');
      if (active) setAccess(data);
    }).catch((error) => {
      if (active) setAccessError(error instanceof Error ? error.message : 'Could not check exam access.');
    });
    return () => { active = false; };
  }, [profile?.portal_type, session?.access_token]);

  const begin = (a: any, ans: Record<string, string>, pg: number) => {
    offset.current = a.serverNow - Date.now();
    setAttempt(a); setAnswers(ans); setPage(pg); setStage('exam'); setResult(null);
  };

  async function start(e: any) {
    e.preventDefault();
    if (!session?.access_token || !access?.active) {
      setErr('An active, approved exam pass is required before starting.');
      return;
    }
    setBusy(true); setErr('');
    const r = await fetch('/api/exam/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ language: lang }),
    });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setErr(j.error || 'Something went wrong.');
    localStorage.setItem(`lsw_exam_session:${session.user.id}`, JSON.stringify({ attempt: j, answers: {}, page: 0 }));
    begin(j, {}, 0);
  }

  const persist = (ans: Record<string, string>, pg: number) => {
    if (!session?.user.id) return;
    try { localStorage.setItem(`lsw_exam_session:${session.user.id}`, JSON.stringify({ attempt, answers: ans, page: pg })); } catch {}
  };
  const pick = (qid: number, k: string) => { const a = { ...answers, [qid]: k }; setAnswers(a); persist(a, page); };
  const go = (p: number) => { setPage(p); persist(answers, p); window.scrollTo({ top: 0 }); };

  const submit = useCallback(async () => {
    if (submitting.current || !attempt) return;
    if (!session?.access_token) return alert('Sign in again before submitting the exam.');
    submitting.current = true;
    const r = await fetch('/api/exam/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ attemptId: attempt.attemptId, answers }),
    });
    const j = await r.json();
    submitting.current = false;
    if (!r.ok) return alert(j.error || 'Could not submit. Check your connection and try again.');
    localStorage.removeItem(`lsw_exam_session:${session.user.id}`);
    const historyKey = `lsw_exam_history:${session.user.id}`;
    const h = [{ id: j.attemptId, at: j.issuedAt, name: j.name, score: j.score, max: j.max, passed: j.passed, certId: j.certId }, ...read(historyKey, [])].slice(0, 20);
    localStorage.setItem(historyKey, JSON.stringify(h)); setHistory(h);
    setResult(j); setStage('result');
  }, [attempt, answers, session]);

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
    if (loading) return <p className="p-10 text-center text-slate-500">Loading candidate account...</p>;
    if (!session) return <div className="px-4 py-10"><ExamAccount /></div>;
    if (!profile) return <p className="p-10 text-center text-slate-500">Loading candidate profile...</p>;
    if (profile.portal_type !== 'exam_candidate') {
      return (
        <Card className="mx-auto my-10 max-w-xl p-6 text-center">
          <h1 className="text-xl font-bold">Candidate account required</h1>
          <p className="mt-2 text-slate-600">Sign out and register or log in with an exam candidate account.</p>
          <Btn className="mt-4" onClick={signOut}>Log out</Btn>
        </Card>
      );
    }
      return (
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10">
          <Card className="p-6">
            <h1 className="text-2xl font-extrabold">{t('exam_login_title')}</h1>
            <p className="mt-2 text-slate-600">{t('exam_rules')}</p>
            <p className="mt-2 text-sm text-slate-600">Signed in as <b>{profile.name || session.user.email}</b>.</p>
            <Btn variant="ghost" className="mt-3" onClick={signOut}>Log out</Btn>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm" aria-live="polite">
              {accessError ? <p className="text-red-700">{accessError}</p> : access?.active
                ? <p className="text-emerald-800">Exam pass active until {new Date(access.expiresAt).toLocaleDateString()}.</p>
                : access?.pending ? <p className="text-amber-800">Your payment is being reviewed. You can start after it is approved.</p>
                : <p className="text-slate-700">An approved, paid exam pass is required to start.</p>}
            </div>
            {saved && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm">
                <p className="font-semibold">{saved.attempt.name}</p>
                <Btn className="mt-2" onClick={() => begin(saved.attempt, saved.answers, saved.page)}>{t('resume')}</Btn>
              </div>
            )}
            <form onSubmit={start} className="mt-5 grid gap-4">
              {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
              <Btn type="submit" disabled={busy || !access?.active}>{busy ? 'Starting...' : t('start')}</Btn>
            </form>
          </Card>
          <PassPurchase
            accessToken={session.access_token}
            candidateName={profile.name || session.user.email || 'Candidate'}
            candidatePhone={profile.phone || ''}
          />
          <Card className="p-6">
            <h2 className="font-bold">{t('history')}</h2>
            <ul className="mt-3 grid gap-2 text-sm">
              {history.map((h, i) => (
                <li key={h.id || h.certId || i} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
                  <span className="text-slate-600">{new Date(h.at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-2"><b>{h.score}</b>/{h.max} <Badge tone={h.passed ? 'green' : 'red'}>{h.passed ? 'Pass' : 'Fail'}</Badge></span>
                  {h.passed && h.certId && <div className="flex gap-2">
                    <Btn variant="ghost" disabled={historyCertBusy === h.certId} onClick={() => void downloadPastCertificate(h, 'pdf')}>
                      {historyCertBusy === h.certId ? t('history_cert_preparing') : t('history_cert_download')}
                    </Btn>
                  </div>}
                </li>
              ))}
              {!history.length && <li className="text-slate-500">-</li>}
            </ul>
          </Card>
        </div>
      );
  }

  async function downloadPastCertificate(item: any, format: 'png' | 'pdf') {
    if (!item?.passed || !item.certId || historyCertBusy) return;
    setHistoryCertBusy(item.certId);
    try {
      const certificate = await renderCertificate({
        name: item.name || profile?.name || 'Candidate',
        score: Number(item.score) || 0,
        max: Number(item.max) || 100,
        certId: item.certId,
        passed: true,
        date: new Date(item.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      });
      const filename = `LearnWithSulav-Certificate-${String(item.name || 'Candidate').replace(/[^\p{L}\p{N}-]+/gu, '-')}`;
      if (format === 'png') downloadPng(certificate, filename);
      else await downloadPdf(certificate, filename);
    } catch {
      setErr('Could not prepare the certificate. Please try again.');
    } finally {
      setHistoryCertBusy(null);
    }
  }

  /* ---------- result ---------- */
  if (stage === 'result' && result) return <Result r={result} t={t} accessToken={session?.access_token || ''} onRetake={() => { setStage('intro'); setSaved(null); }} />;

  /* ---------- exam ---------- */
  if (!session?.access_token || !session.user.id) return <p className="p-10 text-center text-red-700">Sign in again to continue the exam.</p>;
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

function Result({ r, t, accessToken, onRetake }: { r: any; t: (k: string) => string; accessToken: string; onRetake: () => void }) {
  const [url, setUrl] = useState('');
  const [reported, setReported] = useState<number[]>([]);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    renderCertificate({ name: r.name, score: r.score, max: r.max, certId: r.certId, passed: r.passed, date: new Date(r.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) })
      .then((c) => { canvas.current = c; setUrl(c.toDataURL('image/jpeg', 0.85)); });
  }, [r]);
  const file = `LearnWithSulav-Certificate-${r.name.replace(/\s+/g, '-')}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Card className={cx('p-6 text-center', r.passed ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50')}>
        <h1 className={cx('text-3xl font-extrabold', r.passed ? 'text-emerald-800' : 'text-red-700')}>{r.passed ? t('pass') : t('fail')}</h1>
        <p className="mt-1 text-slate-700">{r.name}</p>
        <p className="mt-3 text-5xl font-extrabold">{r.score}<span className="text-2xl text-slate-500"> / {r.max}</span></p>
        <p className="text-sm text-slate-600">{t('marks')} · {r.max ? Math.round((r.score / r.max) * 100) : 0}%</p>
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <span>{t('correct')}: <b>{r.correct}</b></span><span>{t('wrong')}: <b>{r.wrong}</b></span><span>{t('skipped')}: <b>{r.skipped}</b></span>
        </div>
        {r.expired && <p className="mt-3 text-sm text-red-700">Time ran out before the answers reached the server.</p>}
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-bold">{t('cert_title')}</h2>
        <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {url ? <img src={url} alt="Certificate preview" className="mt-4 w-full rounded-lg border border-slate-200" /> : <p className="mt-4 text-slate-500">...</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              <Btn disabled={!url} onClick={() => canvas.current && downloadPng(canvas.current, file)}>{t('cert_png')}</Btn>
              <Btn variant="ghost" disabled={!url} onClick={() => canvas.current && downloadPdf(canvas.current, file)}>{t('cert_pdf')}</Btn>
              <LinkBtn variant="gold" href={r.passed ? BRAND.links.pass : BRAND.links.fail} target="_blank" rel="noopener noreferrer">{r.passed ? t('link_pass') : t('link_fail')}</LinkBtn>
            </div>
          </>
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
              <ReportQuestion accessToken={accessToken} attemptId={r.attemptId} questionId={x.id} done={reported.includes(x.id)} onDone={() => setReported((ids)=>[...ids,x.id])}/>
            </Card>
          ))}
        </div>
      </details>
    </div>
  );
}

function ReportQuestion({accessToken,attemptId,questionId,done,onDone}:{accessToken:string;attemptId:string;questionId:number;done:boolean;onDone:()=>void}){const [open,setOpen]=useState(false);const [kind,setKind]=useState('wrong_answer');const [details,setDetails]=useState('');const [error,setError]=useState('');async function send(e:React.FormEvent){e.preventDefault();const r=await fetch('/api/exam/report',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${accessToken}`},body:JSON.stringify({attemptId,questionId,reportType:kind,details})});const j=await r.json();if(!r.ok){setError(j.error||'Could not send report.');return;}onDone();setOpen(false);}return <div className="mt-3">{done?<span className="text-xs text-emerald-700">Report received</span>:!open?<button className="text-xs font-semibold text-[#0A4F8A] underline" onClick={()=>setOpen(true)}>Report question</button>:<form onSubmit={send} className="grid gap-2 sm:grid-cols-[auto_1fr_auto]"><select value={kind} onChange={e=>setKind(e.target.value)} className="rounded border px-2 py-1 text-sm"><option value="wrong_answer">Wrong answer</option><option value="unclear">Unclear question</option><option value="translation">Translation issue</option><option value="other">Other</option></select><input value={details} onChange={e=>setDetails(e.target.value)} maxLength={1000} placeholder="Optional details" className="rounded border px-2 py-1 text-sm"/><Btn type="submit">Send</Btn>{error&&<p className="text-xs text-red-700 sm:col-span-3">{error}</p>}</form>}</div>}
