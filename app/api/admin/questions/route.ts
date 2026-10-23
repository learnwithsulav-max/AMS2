import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
const categories = new Set(['nia','reinsurance','life','nonlife','microinsurance','aml_cft','agent_conduct','life_cases','nonlife_cases','micro_cases']);
const clean = (x: unknown, max = 1200) => typeof x === 'string' ? x.trim().slice(0, max) : '';
const norm = (x: string) => x.normalize('NFC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();

export async function GET(request: Request) {
  const { response } = await requireAdmin(request);
  if (response) return response;
  const url = new URL(request.url);
  let query = admin.from('question_bank').select('id,category,language,question_en,question_ne,explanation_en,explanation_ne,active,difficulty,created_at').order('id', { ascending: false }).limit(100);
  const search = url.searchParams.get('search')?.trim().slice(0, 100);
  if (search) query = query.or(`question_en.ilike.%${search.replace(/[,%()]/g, '')}%,question_ne.ilike.%${search.replace(/[,%()]/g, '')}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Question bank could not be loaded.' }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: Request) {
  const { user, response } = await requireAdmin(request);
  if (response) return response;
  const body = await request.json().catch(() => null);
  if (body?.action === 'update') {
    const id = Number(body.id);
    const category = clean(body.category, 60).toLowerCase();
    const language = body.language;
    const difficulty = body.difficulty;
    if (!Number.isSafeInteger(id) || id < 1 || !categories.has(category) || !['en','ne','mixed'].includes(language) || !['easy','medium','hard'].includes(difficulty) || typeof body.active !== 'boolean') return NextResponse.json({ error: 'Provide valid question fields.' }, { status: 400 });
    const questionEn = clean(body.question_en); const questionNe = clean(body.question_ne);
    if (!questionEn && !questionNe) return NextResponse.json({ error: 'A question needs English or Nepali text.' }, { status: 400 });
    const { data, error } = await admin.from('question_bank').update({ category, language, difficulty, question_en: questionEn || null, question_ne: questionNe || null, explanation_en: clean(body.explanation_en, 2000) || null, explanation_ne: clean(body.explanation_ne, 2000) || null, active: body.active, updated_at: new Date().toISOString() }).eq('id', id).select('id').maybeSingle();
    if (error) return NextResponse.json({ error: 'Question could not be updated.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const { error: auditError } = await admin.from('activity_log').insert({ actor: user.email || user.id, actor_id: user.id, action: 'question_updated', meta: { target_id: id, ip: forwarded, user_agent: request.headers.get('user-agent')?.slice(0, 500) || null } });
    if (auditError) return NextResponse.json({ error: 'Question saved, but its audit record could not be written.' }, { status: 500 });
    return NextResponse.json({ ok: true, id });
  }
  if (!Array.isArray(body?.questions) || body.questions.length > 10000) return NextResponse.json({ error: 'Upload a CSV with at most 10,000 question rows.' }, { status: 400 });
  const { data: existing, error: readError } = await admin.from('question_bank').select('question_en,question_ne');
  if (readError) return NextResponse.json({ error: 'Question bank is unavailable. Apply the blueprint migration first.' }, { status: 503 });
  const seen = new Set((existing || []).flatMap((q) => [q.question_en, q.question_ne].filter(Boolean).map(norm)));
  const records: Record<string, unknown>[] = []; let skipped = 0;
  for (const raw of body.questions as Record<string, unknown>[]) {
    const categoryRaw = clean(raw.category, 60).toLowerCase();
    const category = categories.has(categoryRaw) ? categoryRaw : 'nia';
    const en = clean(raw.question || raw.question_en);
    const ne = clean(raw.question_ne);
    const options = ['a','b','c','d'].map((key) => clean(raw[`option_${key}`] || raw[`option_${key}_en`], 500));
    const optionsNe = ['a','b','c','d'].map((key) => clean(raw[`option_${key}_ne`], 500));
    const answer = clean(raw.correct || raw.ans || raw.correct_option, 1).toUpperCase();
    if ((!en && !ne) || options.some((v) => !v) || !/^[ABCD]$/.test(answer)) { skipped++; continue; }
    const identity = norm(en || ne);
    if (seen.has(identity)) { skipped++; continue; }
    seen.add(identity);
    const difficulty = clean(raw.difficulty, 20).toLowerCase();
    records.push({ category, language: en && ne ? 'mixed' : en ? 'en' : 'ne', difficulty: ['easy','medium','hard'].includes(difficulty) ? difficulty : 'medium', question_en: en || null, question_ne: ne || null,
      option_a_en: options[0], option_b_en: options[1], option_c_en: options[2], option_d_en: options[3],
      option_a_ne: optionsNe[0] || null, option_b_ne: optionsNe[1] || null, option_c_ne: optionsNe[2] || null, option_d_ne: optionsNe[3] || null,
      correct_option: answer, explanation_en: clean(raw.explanation, 2000) || null, explanation_ne: clean(raw.explanation_ne, 2000) || null });
  }
  for (let i = 0; i < records.length; i += 500) {
    const { error } = await admin.from('question_bank').insert(records.slice(i, i + 500));
    if (error) { console.error('Question import failed:', error.message); return NextResponse.json({ error: 'Could not save imported questions. The migration may not be applied.' }, { status: 500 }); }
  }
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) || null;
  const { error: auditError } = await admin.from('activity_log').insert({ actor: user.email || user.id, actor_id: user.id, action: 'questions_imported', meta: { imported: records.length, skipped, ip: forwarded, user_agent: userAgent } });
  if (auditError) return NextResponse.json({ error: 'Questions imported, but audit logging failed. Contact an administrator.' }, { status: 500 });
  return NextResponse.json({ imported: records.length, skipped });
}
