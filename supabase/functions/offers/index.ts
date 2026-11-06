// Supermarket deals → A’s Life. A weekly task reads the folders of Dirk, Aldi and Albert Heijn, looks through
// your recipes and pantry, and sends this week's deals plus a meal plan here. Two actions, both POST with your token:
//   { "token": "...", "action": "recipes" }  → your recipes (name, category, servings, ingredients) and pantry
//   { "token": "...", "action": "save", "week": { "start": "2026-11-04", "end": "2026-11-10" },
//     "offers": [{ "store": "Dirk", "name": "Kipfilet 1 kg", "price": 6.99, "was": 9.49, "deal": "25% korting", ... }],
//     "plan": { "dinners": [...], "lunches": [...], "breakfasts": [...], "snacks": [...], "drinks": [...], "shared": [...], "shopping": [...], "tips": "..." } }
//   { "token": "...", "action": "fill", "recipes": [{ "id": "<recipe id>", "instructions": "...", "lines": ["200 g kipfilet", ...], "photo": "https://..." }] }
//     fills in what an existing recipe is missing (instructions, the ingredient lines with amounts, a photo); it never
//     overwrites what is already there and never touches the linked pantry ingredients.
// One review inbox for everything you share or save (iPhone share sheet, the Albo task, links pasted in the app):
//   { "token": "...", "action": "share", "url": "...", "text": "...", "note": "...", "source": "Share" }
//     → lands in the inbox; with "target" and "draft" it arrives ready for review (used by the Albo task)
//   { "token": "...", "action": "inbox" }  → the items that still need sorting
//   { "token": "...", "action": "kitchen" }  → pantry and kitchen gear by id; "tidy" with { names: { id: "Dutch name" } } saves a suggestion
//   { "token": "...", "action": "sort", "items": [{ "id": "...", "target": "recipes", "title": "...", "photo": "...", "why": "...", "draft": {...} }] }
//     → the sorting task fills in what each link is; you accept or change it in the app
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
    // headers must be plain ASCII: a curly quote here made every copy fail silently
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'Accept': 'image/avif,image/webp,image/png,image/jpeg,*/*' } });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !type.startsWith('image/')) return url;
    const buf = new Uint8Array(await r.arrayBuffer()); if (buf.length > 6e6) return url;
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg', path = `${uid}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from('photos').upload(path, buf, { contentType: type, cacheControl: '31536000', upsert: false });
    return error ? url : path;
  } catch { return url; }
}

// a quick look at a shared page: picture, title, site, and what JSON-LD says it is (a recipe, a product)
type Peek = { photo?: string; title?: string; desc?: string; site?: string; social?: boolean; recipe?: any; product?: any; type?: string; crumbs?: string };
async function peek(url: string): Promise<Peek> {
  const get = async (u: string, ms = 7000) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms); try { return await fetch(u, { signal: c.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', 'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8' } }); } finally { clearTimeout(t); } };
  const unent = (x: string) => x.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').trim();
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const social = /(tiktok\.com|instagram\.com|youtube\.com|youtu\.be|pinterest\.|facebook\.com)$/.test(host) || /pinterest\./.test(host);
    const oembed = /tiktok\.com$/.test(host) ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}` : /(youtube\.com|youtu\.be)$/.test(host) ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}` : /pinterest\./.test(host) ? `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url)}` : '';
    if (oembed) { const r = await get(oembed); if (r.ok) { const j = await r.json(); if (j.thumbnail_url) return { photo: j.thumbnail_url, title: j.title, site: j.provider_name || host, social: true }; } }
    const r = await get(url); if (!r.ok || !(r.headers.get('content-type') || '').includes('html')) return { site: host, social };
    const html = (await r.text()).slice(0, 900000);
    const meta = (k: string) => { const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']+)["']`, 'i')) || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${k}["']`, 'i')); return m?.[1] ? unent(m[1]) : ''; };
    // JSON-LD: find a Recipe or a Product, wherever it sits in the graph
    const nodes: any[] = [];
    const walk = (n: any) => { if (Array.isArray(n)) n.forEach(walk); else if (n && typeof n === 'object') { nodes.push(n); for (const v of Object.values(n)) if (v && typeof v === 'object') walk(v); } };
    for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) { try { walk(JSON.parse(m[1].trim())); } catch { /* broken JSON-LD */ } }
    const isT = (n: any, t: string) => [].concat(n['@type'] || []).some((x: string) => String(x).toLowerCase() === t);
    const recipe = nodes.find(n => isT(n, 'recipe')), product = nodes.find(n => isT(n, 'product') || isT(n, 'productgroup'));
    const crumbs = nodes.filter(n => isT(n, 'breadcrumblist')).flatMap(n => [].concat(n.itemListElement || []).map((x: any) => x?.name || x?.item?.name || '')).join(' / ');
    const img = (v: any): string => !v ? '' : typeof v === 'string' ? v : Array.isArray(v) ? img(v[0]) : v.url || v.contentUrl || '';
    const tik = (k: string) => { const m = html.match(new RegExp(`"?${k}"?:?"(https:[^"]+)"`)); try { return m ? JSON.parse(`"${m[1]}"`) : ''; } catch { return ''; } };
    const tok = /tiktok\.com$/.test(host) ? (tik('imagePost[^\\]]*?"urlList":\\[') || tik('originCover') || tik('cover')) : '';
    let photo = img(recipe?.image) || img(product?.image) || tok || meta('og:image:secure_url') || meta('og:image') || meta('twitter:image') || meta('twitter:image:src');
    if (photo && photo.startsWith('//')) photo = 'https:' + photo;
    if (photo && !/^https?:/.test(photo)) photo = new URL(photo, r.url).href;
    const title = meta('og:title') || unent(html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1] || '');
    return { photo, title, desc: meta('og:description') || meta('description'), site: meta('og:site_name') || host, social, recipe, product, type: meta('og:type'), crumbs };
  } catch { return {}; }
}
// instant sorting with plain rules: what the page says it is, the shop it comes from, and words in the name
const SHOPS: Record<string, string> = {
  closet: 'zalando|hm\\.com|zara|asos|mango|cos(stores)?\\.com|arket|uniqlo|weekday|na-kd|aboutyou|bershka|pullandbear|stradivarius|massimodutti|stories\\.com|sezane|levi|drmartens|vans\\.|converse|veja|omoda|nelson|sacha|wehkamp|bijenkorf|guess|tommy|calvinklein|ralphlauren|scotch-soda|ganni|monki|vero-?moda|only\\.com|jdsports|snipes|footlocker|asics|newbalance|lululemon|gymshark|aliexpress-fashion',
  beauty: 'douglas|sephora|lookfantastic|iciparisxl|paulaschoice|theordinary|rituals|cultbeauty|niche-beauty|skinfluencer|beautyonline|deciem|lush|kiehls|nyx|maccosmetics|charlottetilbury|fentybeauty|glossier',
  supplements: 'vitaminstore|hollandandbarrett|myprotein|bodyandfit|vitakruid|ekopura|orthica|davitamon',
  gear: 'cookinglife|kookwinkel|kitchenshop|deleukstekeuken|kitchenaid|lecreuset|tefal|smeg',
  fitgear: 'decathlon|fitnessdigital|gorilla-?sports|bodybuilding',
  inventory: 'ikea|kwantum|jysk|leenbakker|xenos|westwing|hornbach|gamma|praxis|karwei|loods5|vtwonen|flinders|homeandliving|zarahome|hm\\.com/nl_nl/home|kave|fonq|nordicnest|eijerkamp'
};
const WORDS: Record<string, string> = {
  closet: 'jas|jack|coat|blazer|jurk|dress|broek|jeans|pants|trouser|rok|skirt|trui|sweater|vest|cardigan|hoodie|shirt|blouse|top|t-shirt|legging|jumpsuit|sneaker|schoen|shoe|laars|boot|sandaal|sandal|pump|heel|loafer|ballerina|tas|bag|riem|belt|sjaal|scarf|muts|beanie|pet|hat|ketting|necklace|oorbel|earring|armband|bracelet|ring|horloge|watch|zonnebril|sunglasses|bikini|badpak|swim|beha|bra|sok|sock',
  beauty: 'serum|creme|crème|cream|moistur|cleanser|toner|spf|zonnebrand|mascara|foundation|concealer|lipstick|lippen|lip |blush|bronzer|eyeliner|oogschaduw|eyeshadow|parfum|perfume|eau de|shampoo|conditioner|haarmasker|hair mask|haarolie|hair oil|nagellak|nail polish|bodylotion|body lotion|douchegel|scrub|retinol|niacinamide|hyaluron|skincare|make-?up',
  supplements: 'vitamine|vitamin|supplement|magnesium|omega|visolie|fish oil|eiwit|protein|whey|creatine|collageen|collagen|ijzer|iron|zink|zinc|probiotic|probiotica|multivitamine|ashwagandha',
  gear: 'koekenpan|pan |pannen|wok|braadpan|airfryer|blender|staafmixer|keukenmachine|mixer|koffiemachine|waterkoker|messen|koksmes|knife|snijplank|cutting board|bakvorm|ovenschaal|rasp|spatel|garde|whisk|vergiet|weegschaal|kitchen|keuken',
  fitgear: 'dumbbell|halter|kettlebell|yogamat|yoga mat|fitnessmat|weerstandsband|resistance band|springtouw|jump rope|foam roller|ab wheel|pull-?up|gewicht|weights|fitness',
  inventory: 'lamp|verlichting|kast|stoel|chair|tafel|table|bank |sofa|kussen|cushion|dekbed|duvet|plaid|deken|vaas|vase|spiegel|mirror|rek|shelf|opberg|storage|mand|basket|gordijn|curtain|vloerkleed|rug|kaars|candle|poster|frame|lijst|plant|pot |handdoek|towel|beddengoed|bedding|matras|mattress|kapstok'
};
const RECIPEWORDS = /recept|recipe|ingredi|ingrédient|tbsp|tsp|eetlepel|theelepel|\bel\b|\btl\b|gram|\bgr\b|bakken|koken|oven|minuten|minutes|dinner|lunch|ontbijt|breakfast|meal ?prep|soup|soep|salad|salade|pasta|curry|bowl/i;
const isoMin = (v: any) => { const m = String(v || '').match(/P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/i); return m && (m[1] || m[2]) ? (Number(m[1] || 0) * 60 + Number(m[2] || 0)) : undefined; };
const textOf = (v: any): string => !v ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.map(textOf).filter(Boolean).join('\n') : v.text || v.name || (v.itemListElement ? textOf(v.itemListElement) : '');
const CATS: Record<string, string[]> = { Outerwear: ['jas', 'coat', 'jack', 'blazer', 'parka', 'trench'], Knitwear: ['trui', 'sweater', 'cardigan', 'knit', 'gebreid'], Dresses: ['jurk', 'dress', 'jumpsuit'], Bottoms: ['broek', 'jeans', 'pants', 'trouser', 'rok', 'skirt', 'short', 'legging'], Shoes: ['schoen', 'shoe', 'sneaker', 'laars', 'boot', 'sandaal', 'sandal', 'pump', 'loafer', 'ballerina', 'heel'], Bags: ['tas', 'bag', 'clutch', 'shopper'], Accessories: ['riem', 'belt', 'sjaal', 'scarf', 'muts', 'hat', 'pet', 'ketting', 'oorbel', 'armband', 'ring', 'horloge', 'watch', 'zonnebril', 'sunglasses', 'sieraad', 'jewel'], 'Swim & lounge': ['bikini', 'badpak', 'swim', 'pyjama', 'lounge'], Tops: ['shirt', 'top', 'blouse', 'hoodie', 'tee', 'polo'] };
function quickSort(url: string, p: Peek, text: string, note: string): { target: string; draft: Record<string, unknown>; why: string } {
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } })();
  const hay = `${url} ${p.title || ''} ${p.crumbs || ''} ${p.product?.name || ''} ${p.product?.category || ''} ${note} ${text}`.toLowerCase();
  const shop = String(p.site || host).replace(/\.(nl|com|be|de|co\.uk)$/i, '');
  // 1. the page says it is a recipe
  if (p.recipe) {
    const r = p.recipe, lines = [].concat(r.recipeIngredient || r.ingredients || []).map((x: any) => String(x).trim()).filter(Boolean);
    const steps = textOf(r.recipeInstructions).split('\n').map(x => x.trim()).filter(Boolean).join('\n');
    const yieldN = Number(String([].concat(r.recipeYield || [])[0] || '').match(/\d+/)?.[0]) || undefined;
    const cat = String([].concat(r.recipeCategory || [])[0] || '').toLowerCase();
    const category = /ontbijt|breakfast/.test(cat) ? 'Breakfast' : /lunch/.test(cat) ? 'Lunch' : /soep|soup/.test(cat) ? 'Soup' : /dessert|nagerecht/.test(cat) ? 'Dessert' : /bak|baking|cake|taart/.test(cat) ? 'Baking' : /snack|borrel/.test(cat) ? 'Snack' : /drank|drink/.test(cat) ? 'Drink' : /bijgerecht|side/.test(cat) ? 'Side Dish' : 'Dinner';
    return { target: 'recipes', why: 'De pagina is een recept met ingrediënten en bereiding.', draft: { name: String(r.name || p.title || '').trim(), category, servings: yieldN, prep: isoMin(r.totalTime) || ((isoMin(r.prepTime) || 0) + (isoMin(r.cookTime) || 0) || undefined), photo: p.photo, lines, steps, notes: String(r.description || '').slice(0, 300) } };
  }
  // 2. a social post or video that reads like a recipe
  if (p.social && RECIPEWORDS.test(`${p.title || ''} ${p.desc || ''} ${note} ${text}`)) return { target: 'recipes', why: 'Een post die op een recept lijkt. De sorteerronde vult de ingrediënten en stappen aan.', draft: { name: p.title, photo: p.photo } };
  // 3. a product: the shop first, then words in the name
  const prod = p.product, offer = prod ? [].concat(prod.offers || [])[0] as any : null, offer2 = offer?.offers ? [].concat(offer.offers)[0] as any : offer;
  const price = Number(offer2?.price ?? offer2?.lowPrice ?? '') || undefined, cur = String(offer2?.priceCurrency || 'EUR').toUpperCase();
  const brand = typeof prod?.brand === 'string' ? prod.brand : prod?.brand?.name;
  const isProduct = !!prod || /product/i.test(p.type || '') || Object.values(SHOPS).some(re => new RegExp(re).test(host));
  if (isProduct) {
    let target = Object.keys(SHOPS).find(k => new RegExp(SHOPS[k]).test(host)) || '';
    const byWord = Object.keys(WORDS).find(k => new RegExp(WORDS[k]).test(hay));
    if (!target || (byWord && ['closet', 'inventory'].includes(target) && byWord !== target && /bijenkorf|wehkamp|hm\.com|zarahome/.test(host))) target = byWord || 'wishes';
    if (/gift|cadeau|kado/.test(note.toLowerCase())) target = 'gifts';
    const name = String(prod?.name || p.title || '').replace(/\s+[|–-]\s+[^|–-]*$/, '').trim();
    const draft: Record<string, unknown> = { name, brand, price: cur === 'EUR' ? price : undefined, shop, photo: p.photo };
    if (target === 'closet') { const low = name.toLowerCase(); draft.cat = Object.keys(CATS).find(c => CATS[c].some(w => low.includes(w))) || ''; }
    if (target === 'wishes') draft.category = /boek|book/.test(hay) ? 'Books' : /laptop|telefoon|phone|koptelefoon|headphone|tablet|camera|console|tv|speaker|oordop|earbud|smartwatch/.test(hay) ? 'Tech' : 'Other';
    const label: Record<string, string> = { closet: 'kleding', beauty: 'beauty', supplements: 'een supplement', gear: 'keukenspullen', fitgear: 'fitnessspullen', inventory: 'iets voor in huis', wishes: 'een product', gifts: 'een cadeau' };
    return { target, why: `Een product van ${shop}, het lijkt op ${label[target] || 'een product'}.` + (cur !== 'EUR' && price ? ` Prijs is in ${cur}.` : ''), draft };
  }
  // 4. anything else: keep it as a saved link until you pick a place
  return { target: 'keep', why: 'Geen recept of product herkend. Kies zelf een plek, of laat het als bewaarde link staan.', draft: { name: p.title, photo: p.photo, notes: (p.desc || '').slice(0, 300) } };
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
      const { data, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).in('kind', ['recipes', 'ingredients', 'wplans', 'rreviews']);
      if (error) throw error;
      const ing = new Map(data.filter((r: any) => r.kind === 'ingredients').map((r: any) => [r.id, r.data]));
      // reviews: per recipe how it went, and across all reviews which ingredients you like or not
      const revs = data.filter((r: any) => r.kind === 'rreviews').map((r: any) => r.data);
      const byRecipe = new Map<string, any[]>(); for (const v of revs) { if (!v.recipe) continue; const l = byRecipe.get(v.recipe) || []; l.push(v); byRecipe.set(v.recipe, l); }
      const score = new Map<string, number>(), lean = { salt: 0, spice: 0, taste: 0 }, sign = (v: string) => /Too little|Too mild|Too bland/.test(v || '') ? 1 : /Too much|Too hot|Too strong/.test(v || '') ? -1 : 0;
      for (const v of revs) { for (const n of v.liked || []) score.set(n, (score.get(n) || 0) + 1); for (const n of v.disliked || []) score.set(n, (score.get(n) || 0) - 2); lean.salt += sign(v.salt); lean.spice += sign(v.spice); lean.taste += sign(v.taste); }
      const learned = { reviews: revs.length, likes: [...score].filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([n]) => n).slice(0, 30), dislikes: [...score].filter(([, s]) => s < 0).sort((a, b) => a[1] - b[1]).map(([n]) => n).slice(0, 30),
        wantsMoreSalt: lean.salt > 1 || undefined, wantsLessSalt: lean.salt < -1 || undefined, wantsMoreHeat: lean.spice > 1 || undefined, wantsLessHeat: lean.spice < -1 || undefined, wantsBolder: lean.taste > 1 || undefined, wantsGentler: lean.taste < -1 || undefined,
        notes: revs.filter((v: any) => v.notes).slice(-15).map((v: any) => v.notes) };
      const recipes = data.filter((r: any) => r.kind === 'recipes').map((r: any) => clean({
        reviews: (byRecipe.get(r.id) || []).sort((a: any, b: any) => String(b.date).localeCompare(String(a.date))).slice(0, 3).map((v: any) => clean({ date: v.date, score: v.score, again: v.again, taste: v.taste, salt: v.salt, spice: v.spice, effort: v.effort, reheat: v.reheat, notes: v.notes })),
        feel: r.data.feel,
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
      return json({ recipes, pantry, recent, food: pr?.data?.food || {}, learned });
    }

    const TARGETS = ['recipes', 'wishes', 'closet', 'beauty', 'supplements', 'gear', 'fitgear', 'inventory', 'ideas', 'cideas', 'gifts', 'keep'];
    const cleanDraft = (d: any) => { const o: Record<string, unknown> = {}; if (d && typeof d === 'object') for (const [k, v] of Object.entries(d).slice(0, 40)) { if (!/^[a-zA-Z]{1,24}$/.test(k)) continue; o[k] = typeof v === 'string' ? v.slice(0, 12000) : Array.isArray(v) ? v.slice(0, 60).map(x => typeof x === 'string' ? x.slice(0, 200) : x) : typeof v === 'number' || typeof v === 'boolean' ? v : undefined; } return clean(o); };
    if (body.action === 'share') {
      const text = str(body.text, 4000), url = str(body.url, 1000) || (text.match(/https?:\/\/\S+/) || [''])[0].replace(/[),.]+$/, '');
      if (!url && !text) return json({ error: 'nothing to save' }, 400);
      let target = TARGETS.includes(body.target) ? body.target : '', draft: Record<string, unknown> = target ? cleanDraft(body.draft) : {}, why = str(body.why, 400), quick = false;
      // nothing told us what it is: look at the page and sort it right away; the sorting task checks it later
      let seen: Peek = {};
      if (url && !target) {
        seen = await peek(url);
        const q = quickSort(url, seen, text, str(body.note, 1000));
        target = q.target; draft = cleanDraft(q.draft); why = q.why; quick = true;
      }
      if (draft.photo) draft.photo = await keepPhoto(uid, String(draft.photo));
      else if (body.photo) seen.photo = await keepPhoto(uid, str(body.photo, 500));
      const data = clean({ url, text: text && text !== url ? text : '', note: str(body.note, 1000), source: str(body.source, 40) || 'Share', status: target ? 'Ready' : 'New', target, title: str(body.title, 200) || str(draft.name, 200) || str(seen.title, 200), why, photo: (draft.photo as string) || seen.photo || '', draft, quick: quick || undefined, extId: str(body.extId, 80), created: Date.now() });
      // the same Albo item twice updates instead of duplicating
      let id = crypto.randomUUID();
      if (data.extId) { const { data: same } = await sb.from('records').select('id,data').eq('user_id', uid).eq('kind', 'inbox').filter('data->>extId', 'eq', data.extId); if (same?.[0]) { if (['Done', 'Skipped'].includes(same[0].data.status)) return json({ ok: true, id: same[0].id, already: true }); id = same[0].id; } }
      const { error } = await sb.from('records').upsert({ user_id: uid, id, kind: 'inbox', data, updated_at: new Date().toISOString() });
      if (error) throw error;
      const label: Record<string, string> = { recipes: 'recept', closet: 'kast-wishlist', beauty: 'beauty', supplements: 'supplementen', gear: 'keukenspullen', fitgear: 'fitness', inventory: 'wonen', wishes: 'wishlist', ideas: 'idee', cideas: 'contentidee', gifts: 'cadeau', keep: 'bewaarde link' };
      return json({ ok: true, id, target, message: target ? `In je inbox, als ${label[target] || target}` : 'In je inbox' });
    }
    if (body.action === 'inbox') {
      const { data, error } = await sb.from('records').select('id,data').eq('user_id', uid).eq('kind', 'inbox');
      if (error) throw error;
      return json({ items: data.filter((r: any) => r.data.status === 'New' || (r.data.status === 'Ready' && r.data.quick)).map((r: any) => clean({ id: r.id, url: r.data.url, text: r.data.text, note: r.data.note, source: r.data.source, title: r.data.title, hasPhoto: !!r.data.photo || undefined, guess: r.data.quick ? r.data.target : undefined, created: r.data.created })) });
    }
    if (body.action === 'sort') {
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 40);
      const { data, error } = await sb.from('records').select('id,data').eq('user_id', uid).eq('kind', 'inbox').in('id', items.map((x: any) => str(x?.id, 60)));
      if (error) throw error;
      let n = 0;
      for (const it of items) {
        const r = data.find((x: any) => x.id === it.id); if (!r || !['New', 'Ready'].includes(r.data.status)) continue;
        const target = TARGETS.includes(it.target) ? it.target : 'keep', draft = cleanDraft(it.draft);
        if (draft.photo) draft.photo = await keepPhoto(uid, String(draft.photo));
        const d = clean({ ...r.data, quick: undefined, status: 'Ready', target, title: str(it.title, 200) || str(draft.name, 200) || r.data.title, why: str(it.why, 400), photo: draft.photo || r.data.photo || '', draft, problem: str(it.problem, 300) });
        const { error: e } = await sb.from('records').upsert({ user_id: uid, id: r.id, kind: 'inbox', data: d, updated_at: new Date().toISOString() });
        if (e) throw e; n++;
      }
      if (n && items.some((it: any) => { const r = data.find((x: any) => x.id === it.id); return r && !r.data.quick; })) await send(uid, { title: 'Your inbox is sorted', body: `${n} new ${n === 1 ? 'link is' : 'links are'} ready for you to check.`, url: './#wish/inbox', tag: 'inbox' });
      return json({ ok: true, sorted: n });
    }

    // the pantry and kitchen gear by id, so Claude can suggest Dutch names; the app applies them in Kitchen › Settings
    if (body.action === 'kitchen') {
      const { data, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).in('kind', ['ingredients', 'gear']);
      if (error) throw error;
      return json({ items: data.map((r: any) => clean({ id: r.id, kind: r.kind, name: r.data.name, category: r.data.category, stock: r.data.stock || undefined })) });
    }
    if (body.action === 'tidy') {
      const names: Record<string, string> = {};
      for (const [id, n] of Object.entries(body.names || {})) { const v = str(n, 120); if (v && /^[\w-]{1,60}$/.test(id)) names[id] = v; }
      const { error } = await sb.from('records').upsert({ user_id: uid, id: crypto.randomUUID(), kind: 'tidy', data: { names, created: Date.now() }, updated_at: new Date().toISOString() });
      if (error) throw error;
      return json({ ok: true, names: Object.keys(names).length });
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
        // a photo still saved as a web link: copy it; when that link has expired, use the fresh one that was sent
        if (/^https?:/.test(String(d.photo || ''))) { const kept = await keepPhoto(uid, d.photo); d.photo = kept !== d.photo || !w.photo ? kept : await keepPhoto(uid, str(w.photo, 2000)); }
        else if (!d.photo && w.photo) d.photo = await keepPhoto(uid, str(w.photo, 2000));
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
