// A’s Life notifications. pg_cron calls this every 5 minutes (header x-cron-secret); the app calls it with your
// sign-in token to send a test. It reads your lists and only sends a notification when there is something to say.
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are built in.
// Turn off "Verify JWT" for this function: it checks the cron secret or your token itself.
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';
import webpush from 'npm:web-push@3.6.7';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const sb = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || URL_, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, x-cron-secret, apikey', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

// the same defaults the Settings page shows
const DEF: Record<string, { on: boolean; time?: string }> = {
  morning: { on: true, time: '07:30' }, evening: { on: true, time: '21:30' }, bills: { on: true, time: '18:00' },
  payday: { on: true, time: '09:00' }, weekly: { on: true, time: '19:00' }, weekahead: { on: true, time: '19:30' }, reminders: { on: true, time: '10:00' },
  budget: { on: true }, applepay: { on: true }
};
type Rec = Record<string, any> & { id: string; kind: string };

/* ---------- dates ---------- */
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const fromISO = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const addDays = (s: string, n: number) => { const d = fromISO(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const addMonths = (s: string, n: number) => { const d = fromISO(s), day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); d.setUTCDate(Math.min(day, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate())); return iso(d); };
function localNow(tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, mins: Number(p.hour) * 60 + Number(p.minute), wd: String(p.weekday).toLowerCase().slice(0, 3) };
}
const toMins = (t: string) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };

/* ---------- money ---------- */
const num = (v: unknown) => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);
const eur = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);
function billDates(b: Rec, from: string, to: string) {
  if (b.active === false || !b.anchor) return [];
  const out: string[] = [], n = Math.max(1, num(b.every) || 1), ok = (d: string) => d >= from && d <= to && (!b.ends || d <= b.ends);
  if (b.cadence === 'Weekly') { for (let d = b.anchor, i = 0; d <= to && i < 2000; d = addDays(d, 7 * n), i++) if (ok(d)) out.push(d); return out; }
  const step = b.cadence === 'Yearly' ? 12 : b.cadence === 'Every N months' ? n : 1;
  for (let k = 0, d = b.anchor; d <= to && k < 600; k++, d = addMonths(b.anchor, k * step)) if (ok(d)) out.push(d);
  return out;
}
function payPeriod(recs: Rec[], today: string) {
  let p = recs.find(r => r.kind === 'fset')?.payday as string | undefined;
  if (!p) return { start: addDays(today, -30), next: null as string | null };
  for (let i = 0; p <= today && i < 600; i++) p = addMonths(p, 1);
  return { start: addMonths(p, -1), next: p };
}
const everyday = (x: Rec) => !x.bill && !x.debt && !x.transfer;
const catName = (c?: Rec) => c ? [c.emoji, c.name].filter(Boolean).join(' ') : 'Other';

/* ---------- what each notification says ---------- */
const listOf = (a: string[], n = 4) => a.slice(0, n).join(', ') + (a.length > n ? ` +${a.length - n}` : '');
const open = (r: Rec) => r.status !== 'Completed';
function morning(recs: Rec[], today: string, outfit: string) {
  const lines: string[] = [];
  if (outfit) lines.push('Outfit: ' + outfit);
  const sups = recs.filter(r => r.kind === 'supplements' && !r.finished && ([].concat(r.times?.length ? r.times : ['AM']) as string[]).includes('AM')).map(r => r.name);
  if (sups.length) lines.push('Supplements: ' + listOf(sups));
  const rt = recs.filter(r => r.kind === 'routines' && r.routine === 'Morning');
  if (rt.length) lines.push(`Morning routine: ${rt.length} ${rt.length === 1 ? "step" : "steps"}`);
  const tasks = recs.filter(r => r.kind === 'tasks' && open(r) && r.date && r.date <= today);
  if (tasks.length) lines.push(`Tasks: ${listOf(tasks.map(t => t.name + (t.date < today ? ' (late)' : '')), 3)}`);
  const appts = recs.filter(r => r.kind === 'appts' && !r.done && r.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  for (const a of appts.slice(0, 2)) lines.push(`${a.time ? a.time + ' ' : ''}${a.name || 'Appointment'}`);
  return lines.length ? { title: 'Good morning', body: lines.join('\n'), url: './#overview', tag: 'morning' } : null;
}
function evening(recs: Rec[], wd: string) {
  const lines: string[] = [];
  const rt = recs.filter(r => r.kind === 'routines' && r.routine === 'Evening').map(r => r.name);
  if (rt.length) lines.push('Routine: ' + listOf(rt, 5));
  const night = recs.find(r => r.kind === 'bsched')?.[wd];
  const pm = recs.filter(r => r.kind === 'beauty' && r.pm && !r.finished && !r.archived && !r.wish);
  if (night || pm.length) lines.push(`Skincare: ${night ? night.toLowerCase() : 'evening'}${pm.length ? `, ${pm.length} ${pm.length === 1 ? "product" : "products"}` : ''}`);
  const sups = recs.filter(r => r.kind === 'supplements' && !r.finished && ([].concat(r.times || []) as string[]).includes('PM')).map(r => r.name);
  if (sups.length) lines.push('Supplements: ' + listOf(sups));
  return lines.length ? { title: 'Evening routine', body: lines.join('\n'), url: './#care/today', tag: 'evening' } : null;
}
function bills(recs: Rec[], today: string) {
  const tom = addDays(today, 1), paid = new Set(recs.filter(r => r.kind === 'fpaid' && (r.paid || r.skipped)).map(r => r.occ));
  const due = recs.filter(r => r.kind === 'fbills').filter(b => billDates(b, tom, tom).length && !paid.has(b.id + '@' + tom));
  if (!due.length) return null;
  const total = due.reduce((n, b) => n + (num(b.amount) || 0), 0);
  return { title: `Tomorrow: ${eur(total)} goes out`, body: due.map(b => `${b.name} ${eur(num(b.amount) || 0)}`).join('\n'), url: './#money/repeats', tag: 'bills' };
}
function payday(recs: Rec[], today: string) {
  const set = recs.find(r => r.kind === 'fset'); if (!set?.payday) return null;
  const { next } = payPeriod(recs, addDays(today, -1));
  if (next !== today) return null; // payday is today when yesterday's period ends today
  const nextPay = addMonths(today, 1), paid = new Set(recs.filter(r => r.kind === 'fpaid' && (r.paid || r.skipped)).map(r => r.occ));
  const coming = recs.filter(r => r.kind === 'fbills').flatMap(b => billDates(b, today, addDays(nextPay, -1)).filter(d => !paid.has(b.id + '@' + d)).map(() => num(b.amount) || 0)).reduce((a, b) => a + b, 0);
  const pay = num(set.payAmount);
  return { title: 'Payday', body: [pay ? `${eur(pay)} expected today` : 'Your pay comes in today', coming ? `${eur(coming)} in bills before next payday` : '', pay && coming ? `${eur(pay - coming)} left after bills` : ''].filter(Boolean).join('\n'), url: './#money/today', tag: 'payday' };
}
function weekly(recs: Rec[], today: string) {
  const from = addDays(today, -6), cats = new Map(recs.filter(r => r.kind === 'fcats').map(c => [c.id, c]));
  const tx = recs.filter(r => r.kind === 'ftx' && everyday(r) && !cats.get(r.category)?.nospend && r.date >= from && r.date <= today);
  if (!tx.length) return null;
  const by = new Map<string, number>();
  for (const x of tx) by.set(x.category || '', (by.get(x.category || '') || 0) + (num(x.amount) || 0));
  const top = [...by].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${catName(cats.get(k))} ${eur(v)}`);
  return { title: `This week: ${eur(tx.reduce((n, x) => n + (num(x.amount) || 0), 0))} spent`, body: top.join('\n'), url: './#money/reviews', tag: 'weekly' };
}

// Sundays: the week ahead, from meals and appointments to bills and a trip coming up
function weekahead(recs: Rec[], prefs: any, today: string) {
  const from = addDays(today, 1), to = addDays(today, 7), lines: string[] = [];
  const meals = recs.filter(r => r.kind === 'meals' && r.date >= from && r.date <= to);
  const dinners = meals.filter(m => m.slot === 'Dinner' && !m.away).length, away = meals.filter(m => m.away).length;
  if (dinners || away) lines.push([dinners ? `${dinners} dinner${dinners === 1 ? '' : 's'} planned` : 'No dinners planned yet', away ? `${away} meal${away === 1 ? '' : 's'} out` : ''].filter(Boolean).join(', '));
  else lines.push('No meals planned yet');
  const appts = recs.filter(r => r.kind === 'appts' && !r.done && r.date >= from && r.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  if (appts.length) lines.push('Appointments: ' + appts.slice(0, 3).map(a => a.name || a.what || 'appointment').join(', ') + (appts.length > 3 ? ` +${appts.length - 3}` : ''));
  const paid = new Set(recs.filter(r => r.kind === 'fpaid').map(p => p.bill + '@' + p.date));
  const out = recs.filter(r => r.kind === 'fbills' && r.active !== false).flatMap(b => billDates(b, from, to).filter(d => !paid.has(b.id + '@' + d)).map(() => num(b.amount) || 0));
  if (out.length) lines.push(`${out.length} bill${out.length === 1 ? '' : 's'} going out, ${eur(out.reduce((a, b) => a + b, 0))}`);
  const trip = (prefs?.trips || []).filter((t: any) => t.start && t.start > today && t.start <= addDays(today, 21)).sort((a: any, b: any) => a.start.localeCompare(b.start))[0];
  if (trip) { const n = Math.round((fromISO(trip.start).getTime() - fromISO(today).getTime()) / 864e5); lines.push(`${trip.name || trip.dest?.name || 'Your trip'} in ${n} days`); }
  return { title: 'Your week ahead', body: lines.join('\n'), url: './#overview', tag: 'weekahead' };
}
// every morning, only when there is one: a smoke-free milestone, a free trial about to end, a warranty running out
function reminders(recs: Rec[], prefs: any, today: string) {
  const lines: string[] = [], q = prefs?.quit;
  if (q?.date) {
    const d = Math.round((fromISO(today).getTime() - fromISO(q.date).getTime()) / 864e5);
    const ms: Record<number, string> = { 1: '1 day', 3: '3 days', 7: '1 week', 14: '2 weeks', 30: '1 month', 60: '2 months', 90: '3 months', 182: '6 months', 365: '1 year' };
    if (ms[d]) { const saved = d * (num(q.perDay) || 0) / (num(q.perPack) || 20) * (num(q.packPrice) || 0); lines.push(`${ms[d]} smoke-free!${saved ? ` You saved ${eur(saved)}.` : ''}`); }
  }
  for (const b of recs.filter(r => r.kind === 'fbills' && r.trialEnds === addDays(today, 2))) lines.push(`Free trial of ${b.name} ends in 2 days`);
  for (const i of recs.filter(r => r.kind === 'inventory' && r.warranty === addDays(today, 14))) lines.push(`Warranty of ${i.name} ends in 2 weeks`);
  return lines.length ? { title: lines.length === 1 ? 'Reminder' : `${lines.length} reminders`, body: lines.join('\n'), url: './#overview', tag: 'reminders' } : null;
}

/* ---------- sending ---------- */
async function send(uid: string, msg: { title: string; body: string; url?: string; tag?: string }) {
  const { data: subs } = await sb.from('push_subs').select('endpoint,p256dh,auth').eq('user_id', uid);
  for (const s of subs || []) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 3600 }); }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from('push_subs').delete().eq('endpoint', s.endpoint); else console.error(e); }
  }
  return (subs || []).length;
}
// claims a slot for today; false when it was already sent
async function claim(uid: string, slot: string, day: string) {
  const { error } = await sb.from('push_log').insert({ user_id: uid, slot, day });
  return !error;
}
async function loadAll(uid: string) {
  const rows: Rec[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).range(from, from + 999);
    if (error) throw error;
    rows.push(...data.map((r: any) => ({ ...r.data, id: r.id, kind: r.kind })));
    if (data.length < 1000) break;
  }
  return rows;
}
async function outfitToday(uid: string, day: string) {
  const { data } = await sb.from('days').select('data').eq('user_id', uid).eq('day', day).maybeSingle();
  const id = data?.data?.outfit; if (!id) return (data?.data?.items || []).length ? 'planned' : '';
  const { data: o } = await sb.from('outfits').select('data').eq('user_id', uid).eq('id', id).maybeSingle();
  return o?.data?.name || 'planned';
}

async function runUser(uid: string, prefs: any, force = false) {
  const cfg = { ...DEF, ...(prefs?.notify || {}) }, tz = cfg.tz || 'Europe/Amsterdam', now = localNow(tz);
  const due = (k: string) => {
    const c = { ...DEF[k], ...(cfg[k] || {}) }; if (!c.on || !c.time) return false;
    const t = toMins(c.time); return force || (now.mins >= t && now.mins < t + 60);
  };
  const slots = ['morning', 'evening', 'bills', 'payday', 'weekly', 'weekahead', 'reminders'].filter(k => due(k) && (!['weekly', 'weekahead'].includes(k) || now.wd === 'sun' || force));
  if (!slots.length) return 0;
  const recs = await loadAll(uid);
  let sent = 0;
  for (const k of slots) {
    const msg = k === 'morning' ? morning(recs, now.day, await outfitToday(uid, now.day)) : k === 'evening' ? evening(recs, now.wd)
      : k === 'bills' ? bills(recs, now.day) : k === 'payday' ? payday(recs, now.day) : k === 'weekahead' ? weekahead(recs, prefs, now.day)
      : k === 'reminders' ? reminders(recs, prefs, now.day) : weekly(recs, now.day);
    if (!msg) continue;
    if (!force && !(await claim(uid, k, now.day))) continue;
    if (await send(uid, msg)) sent++;
  }
  return sent;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  try {
    // a test from the Settings page: signed in as you, sends to your devices right away
    const jwt = req.headers.get('authorization')?.replace(/^Bearer /, '');
    const body = await req.json().catch(() => ({}));
    if (body.test) {
      const { data: u } = await sb.auth.getUser(jwt || '');
      if (!u?.user) return json({ error: 'not signed in' }, 401);
      const n = await send(u.user.id, { title: 'A’s Life', body: 'Notifications work on this device.', url: './#settings', tag: 'test' });
      return json({ devices: n });
    }
    if (body.preview) {
      const { data: u } = await sb.auth.getUser(jwt || '');
      if (!u?.user) return json({ error: 'not signed in' }, 401);
      const { data: p } = await sb.from('prefs').select('data').eq('user_id', u.user.id).maybeSingle();
      return json({ sent: await runUser(u.user.id, p?.data, true) });
    }
    if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return json({ error: 'forbidden' }, 403);
    const { data: subs } = await sb.from('push_subs').select('user_id');
    const users = [...new Set((subs || []).map((s: any) => s.user_id))];
    let sent = 0;
    for (const uid of users) {
      const { data: p } = await sb.from('prefs').select('data').eq('user_id', uid).maybeSingle();
      try { sent += await runUser(uid, p?.data); } catch (e) { console.error(uid, e); }
    }
    return json({ users: users.length, sent });
  } catch (e) { console.error(e); return json({ error: String(e) }, 500); }
});
