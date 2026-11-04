// Supermarket deals → A’s Life. A weekly task reads the folders of Dirk, Aldi and Albert Heijn, looks through
// your recipes and pantry, and sends this week's deals plus a meal plan here. Two actions, both POST with your token:
//   { "token": "...", "action": "recipes" }  → your recipes (name, category, servings, ingredients) and pantry
//   { "token": "...", "action": "save", "week": { "start": "2026-11-04", "end": "2026-11-10" },
//     "offers": [{ "store": "Dirk", "name": "Kipfilet 1 kg", "price": 6.99, "was": 9.49, "deal": "25% korting", ... }],
//     "plan": { "dinners": [...], "lunches": [...], "breakfasts": [...], "snacks": [...], "drinks": [...], "shared": [...], "shopping": [...], "tips": "..." } }
//   { "token": "...", "action": "fill", "recipes": [{ "id": "<recipe id>", "instructions": "...", "lines": ["200 g kipfilet", ...], "photo": "https://..." }] }
//     fills in what an existing recipe is missing (instructions, the ingredient lines with amounts, a photo); it never
//     overwrites what is already there and never touches the linked pantry ingredients.
// "save" replaces last week's deals, keeps one plan per week, and sends a notification.
// Photos from recipe sites are copied into your own photo storage, so they stay when the site changes. All of this is
// for your own private use in your own app.
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
  microwave: m?.microwave === true ? true : undefined, cost: num(m?.cost), time: num(m?.time),
  lines: (Array.isArray(m?.lines) ? m.lines : []).map((x: unknown) => str(x, 160)).filter(Boolean).slice(0, 60),
  steps: str(m?.steps, 12000), quit: m?.quit === true ? true : undefined
});
// copy a picture from the web into your own storage; on any problem keep the web address
async function keepPhoto(uid: string, url: string) {
  if (!/^https?:\/\//.test(url) || url.includes('/storage/v1/object/public/photos/')) return url;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (A’s Life recipe copy)' } });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !type.startsWith('image/')) return url;
    const buf = new Uint8Array(await r.arrayBuffer()); if (buf.length > 6e6) return url;
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg', path = `${uid}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from('photos').upload(path, buf, { contentType: type, cacheControl: '31536000', upsert: false });
    return error ? url : path;
  } catch { return url; }
}

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
        protein: r.data.protein, link: r.data.link, ingredients: [].concat(r.data.ingredients || []).map((id: string) => (ing.get(id) as any)?.name).filter(Boolean),
        helps: r.data.helps, hasInstructions: !!String(r.data.instructions || '').trim() || undefined, hasPhoto: !!r.data.photo || undefined,
        webPhoto: /^https?:/.test(String(r.data.photo || '')) || undefined
      }));
      const pantry = [...ing.values()].map((i: any) => clean({ name: i.name, stock: i.stock ? true : undefined, category: i.category }));
      // the last plans, so a new week doesn't repeat the same recipes
      const recent = data.filter((r: any) => r.kind === 'wplans').map((r: any) => r.data).sort((a: any, b: any) => String(b.start).localeCompare(String(a.start))).slice(0, 3)
        .map((p: any) => ({ start: p.start, dinners: (p.dinners || []).map((d: any) => d.name) }));
      // what you like and don't like, from Kitchen › Settings
      const { data: pr } = await sb.from('prefs').select('data').eq('user_id', uid).maybeSingle();
      return json({ recipes, pantry, recent, food: pr?.data?.food || {} });
    }

    if (body.action === 'fill') {
      const want = (Array.isArray(body.recipes) ? body.recipes : []).slice(0, 60);
      const ids = want.map((x: any) => str(x?.id, 60)).filter(Boolean);
      const { data, error } = await sb.from('records').select('id,data').eq('user_id', uid).eq('kind', 'recipes').in('id', ids);
      if (error) throw error;
      let filled = 0;
      for (const w of want) {
        const r = data.find((x: any) => x.id === w.id); if (!r) continue;
        const d = { ...r.data }, before = JSON.stringify(d);
        const lines = (Array.isArray(w.lines) ? w.lines : []).map((x: unknown) => str(x, 160)).filter(Boolean).slice(0, 60), steps = str(w.instructions, 12000);
        if (!String(d.instructions || '').trim() && (steps || lines.length)) d.instructions = [lines.length ? 'Ingrediënten:\n' + lines.map((l: string) => '- ' + l).join('\n') : '', steps ? (lines.length ? 'Bereiding:\n' : '') + steps : ''].filter(Boolean).join('\n\n');
        if (!d.photo && w.photo) d.photo = await keepPhoto(uid, str(w.photo, 500));
        else if (/^https?:/.test(String(d.photo || ''))) d.photo = await keepPhoto(uid, d.photo);
        if (Array.isArray(w.helps) && w.helps.length && !d.helps) d.helps = w.helps.map((x: unknown) => str(x, 40));
        if (JSON.stringify(d) === before) continue;
        const { error: e } = await sb.from('records').upsert({ user_id: uid, id: r.id, kind: 'recipes', data: d, updated_at: new Date().toISOString() });
        if (e) throw e; filled++;
      }
      return json({ ok: true, filled });
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
        breakfasts: (p.breakfasts || []).slice(0, 6).map(meal), snacks: (p.snacks || []).slice(0, 6).map(meal), drinks: (p.drinks || []).slice(0, 6).map(meal),
        quit: (p.quit || []).slice(0, 6).map(meal), quitTips: str(p.quitTips, 1500),
        shared: (p.shared || []).slice(0, 30).map((s: any) => clean({ name: str(s?.name, 120), store: str(s?.store, 40), price: num(s?.price), deal: str(s?.deal, 120), in: (Array.isArray(s?.in) ? s.in : []).map((x: unknown) => str(x, 140)).slice(0, 12) })),
        shopping: (p.shopping || []).slice(0, 80).map((s: any) => clean({ name: str(s?.name, 120), store: str(s?.store, 40), price: num(s?.price), deal: str(s?.deal, 120), qty: str(s?.qty, 40), have: s?.have === true ? true : undefined })),
        tips: str(p.tips, 1200)
      });
      for (const k of ['dinners', 'lunches', 'breakfasts', 'snacks', 'drinks']) for (const m of (plan as any)[k] || []) if (m.photo && !m.recipe) m.photo = await keepPhoto(uid, m.photo);
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
