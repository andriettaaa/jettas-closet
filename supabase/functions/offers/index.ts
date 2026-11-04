// Supermarket deals → A’s Life. A weekly task reads the folders of Dirk, Aldi and Albert Heijn, looks through
// your recipes and pantry, and sends this week's deals plus a meal plan here. Two actions, both POST with your token:
//   { "token": "...", "action": "recipes" }  → your recipes (name, category, servings, ingredients) and pantry
//   { "token": "...", "action": "save", "week": { "start": "2026-11-04", "end": "2026-11-10" },
//     "offers": [{ "store": "Dirk", "name": "Kipfilet 1 kg", "price": 6.99, "was": 9.49, "deal": "25% korting", ... }],
//     "plan": { "dinners": [...], "lunches": [...], "breakfasts": [...], "snacks": [...], "shared": [...], "shopping": [...], "tips": "..." } }
// "save" replaces last week's deals, keeps one plan per week, and sends a notification.
// Secrets: OFFERS_TOKEN, SPEND_USER_ID (your user id), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY. Turn off "Verify JWT" for this function.
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';
import webpush from 'npm:web-push@3.6.7';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const sb = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const vapid = Deno.env.get('VAPID_PUBLIC_KEY') && Deno.env.get('VAPID_PRIVATE_KEY');
if (vapid) webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || URL_, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
const str = (v: unknown, n = 200) => String(v ?? '').trim().slice(0, n);
const num = (v: unknown) => (v === '' || v == null || isNaN(Number(v))) ? null : Math.round(Number(v) * 100) / 100;
const day = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : '';
const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && !v.length)));

// one suggested recipe: your own (recipe = its id) or a new one from the web (link)
const meal = (m: any) => clean({
  recipe: str(m?.recipe, 60), name: str(m?.name, 140), link: str(m?.link, 500), photo: str(m?.photo, 500),
  servings: num(m?.servings), days: num(m?.days), why: str(m?.why, 400), uses: (Array.isArray(m?.uses) ? m.uses : []).map((x: unknown) => str(x, 80)).filter(Boolean).slice(0, 20),
  ingredients: (Array.isArray(m?.ingredients) ? m.ingredients : []).map((x: unknown) => str(x, 120)).filter(Boolean).slice(0, 40),
  microwave: m?.microwave === true ? true : undefined, cost: num(m?.cost), time: num(m?.time)
});

async function send(uid: string, msg: { title: string; body: string; url?: string; tag?: string }) {
  if (!vapid) return;
  const { data: subs } = await sb.from('push_subs').select('endpoint,p256dh,auth').eq('user_id', uid);
  for (const s of subs || []) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 3600 * 12 }); }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from('push_subs').delete().eq('endpoint', s.endpoint); else console.error(e); }
  }
}

Deno.serve(async req => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token || req.headers.get('x-offers-token');
    if (!token || !Deno.env.get('OFFERS_TOKEN') || token !== Deno.env.get('OFFERS_TOKEN')) return json({ error: 'forbidden' }, 403);
    const uid = Deno.env.get('SPEND_USER_ID')!;

    if (body.action === 'recipes') {
      const { data, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).in('kind', ['recipes', 'ingredients', 'wplans']);
      if (error) throw error;
      const ing = new Map(data.filter((r: any) => r.kind === 'ingredients').map((r: any) => [r.id, r.data]));
      const recipes = data.filter((r: any) => r.kind === 'recipes').map((r: any) => clean({
        id: r.id, name: r.data.name, category: r.data.category, servings: r.data.servings, prep: r.data.prep, cook: r.data.cook, rating: r.data.rating, fav: r.data.fav || undefined,
        protein: r.data.protein, link: r.data.link, ingredients: [].concat(r.data.ingredients || []).map((id: string) => (ing.get(id) as any)?.name).filter(Boolean)
      }));
      const pantry = [...ing.values()].map((i: any) => clean({ name: i.name, stock: i.stock ? true : undefined, category: i.category }));
      // the last plans, so a new week doesn't repeat the same recipes
      const recent = data.filter((r: any) => r.kind === 'wplans').map((r: any) => r.data).sort((a: any, b: any) => String(b.start).localeCompare(String(a.start))).slice(0, 3)
        .map((p: any) => ({ start: p.start, dinners: (p.dinners || []).map((d: any) => d.name) }));
      return json({ recipes, pantry, recent });
    }

    if (body.action === 'save') {
      const start = day(body.week?.start), end = day(body.week?.end);
      if (!start || !end) return json({ error: 'week.start and week.end are needed (YYYY-MM-DD)' }, 400);
      const offers = (Array.isArray(body.offers) ? body.offers : []).slice(0, 400).map((o: any) => clean({
        store: str(o?.store, 40), name: str(o?.name, 160), price: num(o?.price), was: num(o?.was), deal: str(o?.deal, 120), unit: str(o?.unit, 60),
        category: str(o?.category, 60), from: day(o?.from) || start, until: day(o?.until) || end, url: str(o?.url, 500), photo: str(o?.photo, 500), week: start
      })).filter((o: any) => o.name && o.store);
      const p = body.plan || {};
      const plan = clean({
        name: `Week of ${start}`, start, end, made: new Date().toISOString(),
        dinners: (p.dinners || []).slice(0, 10).map(meal), lunches: (p.lunches || []).slice(0, 6).map(meal),
        breakfasts: (p.breakfasts || []).slice(0, 6).map(meal), snacks: (p.snacks || []).slice(0, 6).map(meal),
        shared: (p.shared || []).slice(0, 30).map((s: any) => clean({ name: str(s?.name, 120), store: str(s?.store, 40), price: num(s?.price), deal: str(s?.deal, 120), in: (Array.isArray(s?.in) ? s.in : []).map((x: unknown) => str(x, 140)).slice(0, 12) })),
        shopping: (p.shopping || []).slice(0, 80).map((s: any) => clean({ name: str(s?.name, 120), store: str(s?.store, 40), price: num(s?.price), deal: str(s?.deal, 120), qty: str(s?.qty, 40), have: s?.have === true ? true : undefined })),
        tips: str(p.tips, 1200)
      });
      // out with last week's deals, in with this week's
      const { data: old, error: e1 } = await sb.from('records').select('id,data').eq('user_id', uid).eq('kind', 'offers');
      if (e1) throw e1;
      const stale = (old || []).map((r: any) => r.id);
      const now = new Date().toISOString();
      const rows = offers.map((data: any) => ({ user_id: uid, id: crypto.randomUUID(), kind: 'offers', data: { ...data, created: Date.now() }, updated_at: now }));
      for (let i = 0; i < rows.length; i += 200) { const { error } = await sb.from('records').insert(rows.slice(i, i + 200)); if (error) throw error; }
      for (let i = 0; i < stale.length; i += 200) { const { error } = await sb.from('records').delete().eq('user_id', uid).in('id', stale.slice(i, i + 200)); if (error) throw error; }
      // one plan per week: the same week sent twice replaces the plan
      const { data: same } = await sb.from('records').select('id').eq('user_id', uid).eq('kind', 'wplans').filter('data->>start', 'eq', start);
      const planId = same?.[0]?.id || crypto.randomUUID();
      const { error: e3 } = await sb.from('records').upsert({ user_id: uid, id: planId, kind: 'wplans', data: { ...plan, created: Date.now() }, updated_at: now });
      if (e3) throw e3;
      const n = (plan.dinners as unknown[] | undefined)?.length || 0;
      await send(uid, { title: 'Deals of the week are in', body: `${offers.length} deals at Dirk, Aldi and AH${n ? `, and ${n} dinners that use them` : ''}.`, url: './#kitchen/deals', tag: 'deals' });
      return json({ ok: true, offers: offers.length, plan: planId });
    }
    return json({ error: 'unknown action' }, 400);
  } catch (e: any) {
    console.error(e);
    return json({ error: String(e?.message || e) }, 500);
  }
});
