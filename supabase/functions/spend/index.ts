// Apple Pay → A’s Life. An iPhone Shortcuts automation ("When I tap a Wallet card") posts each payment here:
// { "token": "...", "amount": "€ 12,50", "merchant": "Albert Heijn", "card": "ING", "account": "Creditcard" }.
// "account" is optional: the name of the account in the app; give each Wallet card its own automation with it.
// It saves the purchase in Money › Spending with the category (and account) you gave that shop last time,
// then sends a notification with what is left in that category, and warns at 80% and 100% of a budget.
// Secrets: SPEND_TOKEN, SPEND_USER_ID, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY. Turn off "Verify JWT" for this function.
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';
import webpush from 'npm:web-push@3.6.7';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const sb = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || URL_, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);
type Rec = Record<string, any> & { id: string; kind: string };

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const fromISO = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const addDays = (s: string, n: number) => { const d = fromISO(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const addMonths = (s: string, n: number) => { const d = fromISO(s), day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); d.setUTCDate(Math.min(day, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate())); return iso(d); };
const localDay = (tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const num = (v: unknown) => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);
const eur = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);
const norm = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// "€ 1.234,56", "12.50", "-€3,20" → 1234.56, 12.5, 3.2
function parseAmount(v: unknown) {
  if (typeof v === 'number') return Math.abs(v);
  let s = String(v ?? '').replace(/[^\d.,]/g, '');
  if (s.includes(',') && s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s); return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

async function send(uid: string, msg: { title: string; body: string; url?: string; tag?: string }) {
  const { data: subs } = await sb.from('push_subs').select('endpoint,p256dh,auth').eq('user_id', uid);
  for (const s of subs || []) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 3600 }); }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from('push_subs').delete().eq('endpoint', s.endpoint); else console.error(e); }
  }
}

Deno.serve(async req => {
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token || req.headers.get('x-spend-token');
    if (!token || token !== Deno.env.get('SPEND_TOKEN')) return json({ error: 'forbidden' }, 403);
    const uid = Deno.env.get('SPEND_USER_ID')!;
    const amount = parseAmount(body.amount), merchant = String(body.merchant || body.name || 'Apple Pay').trim().slice(0, 120), card = String(body.card || '').trim().slice(0, 80), wantAcc = String(body.account || '').trim().slice(0, 80);
    if (!amount) return json({ error: 'no amount' }, 400);

    const { data: p } = await sb.from('prefs').select('data').eq('user_id', uid).maybeSingle();
    const cfg = p?.data?.notify || {}, day = localDay(cfg.tz || 'Europe/Amsterdam');
    const { data: rows, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).in('kind', ['ftx', 'fcats', 'fset', 'faccounts', 'frules']);
    if (error) throw error;
    const recs: Rec[] = rows.map((r: any) => ({ ...r.data, id: r.id, kind: r.kind }));
    const tx = recs.filter(r => r.kind === 'ftx').sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created || 0) - (a.created || 0));

    // learn from what you chose before: the last purchase at this shop gives the category and account
    // a sort rule you set wins; otherwise the last purchase at this shop gives the category
    const rule = recs.filter(r => r.kind === 'frules' && r.contains).find(r => norm(merchant).includes(norm(r.contains)));
    const same = tx.filter(x => norm(x.name) === norm(merchant) || (rule?.rename && norm(x.name) === norm(rule.rename)));
    const category = rule?.category || same.find(x => x.category)?.category || '';
    // which account paid: the account the shortcut names, then the account that lists this Wallet card,
    // then the account this card paid from before, and only then the account used at this shop last time
    const accs = recs.filter(r => r.kind === 'faccounts' && !r.archived);
    const byName = wantAcc ? (accs.find(a => norm(a.name) === norm(wantAcc)) || accs.find(a => norm(a.name).includes(norm(wantAcc)) || norm(wantAcc).includes(norm(a.name)))) : null;
    const byCard = card ? accs.find(a => String(a.cards || '').split(/[,;\n]+/).map(norm).filter(Boolean).some(c => c === norm(card) || norm(card).includes(c))) : null;
    const account = byName?.id || byCard?.id || (card && tx.find(x => x.card && norm(x.card) === norm(card) && x.account)?.account) || same.find(x => x.account)?.account || '';
    const id = crypto.randomUUID();
    const data = { name: rule?.rename || merchant, amount, date: day, category, account, card, source: 'Apple Pay', created: Date.now() };
    const { error: e2 } = await sb.from('records').insert({ user_id: uid, id, kind: 'ftx', data });
    if (e2) throw e2;

    // what is left in that category since payday
    const cat = recs.find(r => r.kind === 'fcats' && r.id === category);
    let left = '', warn = '';
    if (cat && num(cat.budget)) {
      let pd = recs.find(r => r.kind === 'fset')?.payday as string | undefined, start = addDays(day, -30);
      if (pd) { for (let i = 0; pd <= day && i < 600; i++) pd = addMonths(pd, 1); start = addMonths(pd, -1); }
      const spent = [...tx, data as any].filter(x => x.category === category && !x.bill && !x.debt && x.date >= start && x.date <= day).reduce((n, x) => n + (num(x.amount) || 0), 0);
      const budget = num(cat.budget)!, pct = spent / budget;
      left = `${[cat.emoji, cat.name].filter(Boolean).join(' ')}: ${spent <= budget ? eur(budget - spent) + ' left' : eur(spent - budget) + ' over'} of ${eur(budget)}`;
      if (cfg.budget?.on !== false) for (const lvl of [1, 0.8]) {
        if (pct < lvl) continue;
        const { error: dup } = await sb.from('push_log').insert({ user_id: uid, slot: `budget${lvl * 100}:${category}`, day: start });
        if (!dup) warn = lvl === 1 ? `You've used all of ${cat.name} this pay.` : `${cat.name} is at ${Math.round(pct * 100)}% of its budget.`;
        break;
      }
    }
    if (cfg.applepay?.on !== false) await send(uid, { title: `${eur(amount)} at ${merchant}`, body: [category ? left : 'Saved. Tap to pick a category; next time it goes there by itself.', warn].filter(Boolean).join('\n'), url: './#money/spending', tag: 'spend-' + id });
    else if (warn) await send(uid, { title: 'Budget', body: [warn, left].join('\n'), url: './#money/spending', tag: 'budget' });
    return json({ ok: true, id, category: cat?.name || null });
  } catch (e) { console.error(e); return json({ error: String(e) }, 500); }
});
