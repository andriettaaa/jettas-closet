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
// Closet pieces from a video: closetlist, closetadd and closetundo (see where they are handled below).
// Secrets: OFFERS_TOKEN, SPEND_USER_ID (your user id), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and for Pinterest PINTEREST_APP_ID, PINTEREST_APP_SECRET. Turn off "Verify JWT" for this function.
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';
import webpush from 'npm:web-push@3.6.7';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const sb = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const vapid = Deno.env.get('VAPID_PUBLIC_KEY') && Deno.env.get('VAPID_PRIVATE_KEY');
if (vapid) webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || URL_, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

// the app calls igsync from the browser, so answers carry CORS headers
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-offers-token', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const str = (v: unknown, n = 200) => String(v ?? '').trim().slice(0, n);
const num = (v: unknown) => (v === '' || v == null || isNaN(Number(v))) ? null : Math.round(Number(v) * 100) / 100;
const day = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : '';
const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && !v.length)));
const SHOP_TYPES = ['Supermarket', 'Toko', 'Butcher', 'Fishmonger', 'Greengrocer', 'Market', 'Household', 'Drugstore', 'Perfumery', 'Brand store', 'Webshop', 'Other'];
const shopOut = (a: any) => clean({ name: str(a?.name, 80), type: SHOP_TYPES.includes(a?.type) ? a.type : undefined, address: str(a?.address, 160), website: str(a?.website, 300), dealsUrl: str(a?.dealsUrl, 300), readDeals: a?.readDeals === true ? true : undefined, mine: a?.mine === true ? true : undefined, notes: str(a?.notes, 400) });

// one suggested recipe: your own (recipe = its id) or a new one from the web (link)
const meal = (m: any) => clean({
  recipe: str(m?.recipe, 60), name: str(m?.name, 140), link: str(m?.link, 500), photo: str(m?.photo, 500),
  servings: num(m?.servings), days: num(m?.days), why: str(m?.why, 400), uses: (Array.isArray(m?.uses) ? m.uses : []).map((x: unknown) => str(x, 80)).filter(Boolean).slice(0, 20),
  ingredients: (Array.isArray(m?.ingredients) ? m.ingredients : []).map((x: unknown) => str(x, 120)).filter(Boolean).slice(0, 40),
  microwave: m?.microwave === true ? true : undefined, cost: num(m?.cost), time: num(m?.time),
  lines: (Array.isArray(m?.lines) ? m.lines : []).map((x: unknown) => str(x, 160)).filter(Boolean).slice(0, 60),
  steps: str(m?.steps, 12000), quit: m?.quit === true ? true : undefined,
  dates: (Array.isArray(m?.dates) ? m.dates : []).map(day).filter(Boolean).slice(0, 7)
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
type Peek = { photo?: string; title?: string; desc?: string; site?: string; social?: boolean; recipe?: any; product?: any; lodging?: any; type?: string; crumbs?: string };
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
    const lodging = nodes.find(n => ['hotel', 'lodgingbusiness', 'vacationrental', 'accommodation', 'apartment', 'house', 'resort', 'hostel', 'bedandbreakfast', 'motel', 'campground'].some(t => isT(n, t)));
    const crumbs = nodes.filter(n => isT(n, 'breadcrumblist')).flatMap(n => [].concat(n.itemListElement || []).map((x: any) => x?.name || x?.item?.name || '')).join(' / ');
    const img = (v: any): string => !v ? '' : typeof v === 'string' ? v : Array.isArray(v) ? img(v[0]) : v.url || v.contentUrl || '';
    const tik = (k: string) => { const m = html.match(new RegExp(`"?${k}"?:?"(https:[^"]+)"`)); try { return m ? JSON.parse(`"${m[1]}"`) : ''; } catch { return ''; } };
    const tok = /tiktok\.com$/.test(host) ? (tik('imagePost[^\\]]*?"urlList":\\[') || tik('originCover') || tik('cover')) : '';
    let photo = img(recipe?.image) || img(product?.image) || tok || meta('og:image:secure_url') || meta('og:image') || meta('twitter:image') || meta('twitter:image:src');
    if (photo && photo.startsWith('//')) photo = 'https:' + photo;
    if (photo && !/^https?:/.test(photo)) photo = new URL(photo, r.url).href;
    const title = meta('og:title') || unent(html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1] || '');
    if (!photo && lodging) photo = img(lodging.image) || img(lodging.photo);
    return { photo, title, desc: meta('og:description') || meta('description'), site: meta('og:site_name') || host, social, recipe, product, lodging, type: meta('og:type'), crumbs };
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
const TIPWORDS = /\btips?\b|how to|hoe je|tutorial|pose|posing|poseren|filming|filmen|film yourself|lighting|licht|ring ?light|edit(ing)?\b|bewerk|capcut|lightroom|inshot|vsco|canva|premiere|transition|hook|caption|algorit|algorithm|grow(th)?\b|followers|volgers|engagement|branding|personal brand|content ?creat|ugc|b-?roll|aesthetic feed|reels? tips?|tiktok tips?/i;
const WORKWORDS = /workout|oefening|exercise|glute|billen|squat|deadlift|\brdl\b|hip thrust|lunge|pilates|yoga|stretch|rekken|mobility|mobiliteit|\babs\b|cardio|hiit|\breps\b|\bgym|leg day|splits\b|kettlebell|dumbbell/i;
const RECIPEWORDS = /recept|recipe|ingredi|ingrédient|tbsp|tsp|eetlepel|theelepel|\bel\b|\btl\b|gram|\bgr\b|bakken|koken|oven|minuten|minutes|dinner|lunch|ontbijt|breakfast|meal ?prep|soup|soep|salad|salade|pasta|curry|bowl/i;
const isoMin = (v: any) => { const m = String(v || '').match(/P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/i); return m && (m[1] || m[2]) ? (Number(m[1] || 0) * 60 + Number(m[2] || 0)) : undefined; };
const textOf = (v: any): string => !v ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.map(textOf).filter(Boolean).join('\n') : v.text || v.name || (v.itemListElement ? textOf(v.itemListElement) : '');
const CATS: Record<string, string[]> = { Outerwear: ['jas', 'coat', 'jack', 'blazer', 'parka', 'trench'], Knitwear: ['trui', 'sweater', 'cardigan', 'knit', 'gebreid'], Dresses: ['jurk', 'dress', 'jumpsuit'], Bottoms: ['broek', 'jeans', 'pants', 'trouser', 'rok', 'skirt', 'short', 'legging'], Shoes: ['schoen', 'shoe', 'sneaker', 'laars', 'boot', 'sandaal', 'sandal', 'pump', 'loafer', 'ballerina', 'heel'], Bags: ['tas', 'bag', 'clutch', 'shopper'], Accessories: ['riem', 'belt', 'sjaal', 'scarf', 'muts', 'hat', 'pet', 'ketting', 'oorbel', 'armband', 'ring', 'horloge', 'watch', 'zonnebril', 'sunglasses', 'sieraad', 'jewel'], 'Swim & lounge': ['bikini', 'badpak', 'swim', 'pyjama', 'lounge'], Tops: ['shirt', 'top', 'blouse', 'hoodie', 'tee', 'polo'] };
// hotels and holiday rentals: which site, and where it is (city and country), for Life › Trips › Saved stays
const STAYS = /(^|\.)(booking\.com|airbnb\.[a-z.]+|hotels\.com|expedia\.[a-z.]+|agoda\.com|vrbo\.com|hostelworld\.com|tripadvisor\.[a-z.]+|trivago\.[a-z.]+|marriott\.com|hilton\.com|accor\.com|all\.accor\.com|ihg\.com|hyatt\.com|nh-hotels\.[a-z]+|citizenm\.com|kayak\.[a-z.]+)$/;
const regionName = (v: string) => { try { return /^[A-Z]{2}$/.test(v) ? new Intl.DisplayNames(['en'], { type: 'region' }).of(v) || v : v; } catch { return v; } };
async function placeOf(url: string, p: Peek, host: string) {
  const a = p.lodging?.address, addr = typeof a === 'string' ? { streetAddress: a } : a || {};
  let city = String(addr.addressLocality || '').trim(), country = String(typeof addr.addressCountry === 'object' ? addr.addressCountry?.name || '' : addr.addressCountry || '').trim();
  const title = String(p.title || '').replace(/\s+[–|-]\s+(Updated|Prijzen|Bijgewerkte|Book|Boek).*$/i, '').replace(/^[★☆\s]+/, '').trim();
  let name = String(p.lodging?.name || '').trim();
  if (/airbnb\./.test(host)) {
    // "Rental unit in Lisbon · ★4.88 · 1 bedroom" (the real name is in the description)
    city ||= (title.match(/\b(?:in|te)\s+([^·|]+?)\s*(?:[·|]|$)/i)?.[1] || '').trim();
    name ||= String(p.desc || '').split(/[.·\n]/)[0].trim().slice(0, 80) || title.split('·')[0].trim();
  } else {
    // "Hotel Name, Lisbon, Portugal" as Booking and most hotel sites write it
    const parts = title.split(/\s*,\s*/);
    name ||= parts[0];
    if (!city && parts.length >= 2) city = parts[parts.length >= 3 ? parts.length - 2 : 1];
    if (!country && parts.length >= 3) country = parts[parts.length - 1];
  }
  country = regionName(country);
  if (city && !country) {
    try { const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`); const g = (await r.json()).results?.[0]; if (g) country = g.country || regionName(g.country_code || ''); } catch { /* no country then */ }
  }
  const kind = /airbnb|vrbo/.test(host) ? 'Airbnb' : /hostel/i.test(`${host} ${title}`) ? 'Hostel' : /apartment|appartement|rental unit|loft|studio/i.test(title) ? 'Apartment' : /b&b|bed and breakfast/i.test(title) ? 'B&B' : /resort/i.test(title) ? 'Resort' : 'Hotel';
  return { name: name || title || host, city, country, type: kind };
}
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
  // 2. a social video with a workout, exercise or stretch: the sorting round writes out the steps
  if (p.social && WORKWORDS.test(`${p.title || ''} ${p.desc || ''} ${note} ${text}`) && !TIPWORDS.test(`${note}`)) return { target: 'vworkouts', why: 'Een video met een workout of oefening. De sorteerronde schrijft de stappen uit.', draft: { name: p.title, photo: p.photo } };
  // 3. a social post or video that reads like a recipe
  if (p.social && RECIPEWORDS.test(`${p.title || ''} ${p.desc || ''} ${note} ${text}`)) return { target: 'recipes', why: 'Een post die op een recept lijkt. De sorteerronde vult de ingrediënten en stappen aan.', draft: { name: p.title, photo: p.photo } };
  // 4. a social post with a tip about making content: poses, filming, editing, apps, branding, growth
  if (p.social && TIPWORDS.test(`${p.title || ''} ${p.desc || ''} ${note} ${text}`)) return { target: 'stips', why: 'Een post met een tip voor social media. De sorteerronde schrijft de stappen uit.', draft: { name: p.title, photo: p.photo, summary: (p.desc || '').slice(0, 300) } };
  // 5. a product: the shop first, then words in the name
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
  // 5. anything else: keep it as a saved link until you pick a place
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

/* ---------- Instagram ----------
   Your professional Instagram account, with a token from Instagram login (IGAA…) or Facebook login (EAA…; then the
   optional secrets IG_APP_ID and IG_APP_SECRET let it renew). The first token comes from the secret IG_TOKEN; the function renews it every few weeks and keeps the newest in a private record (kind igauth).
   Posts become posts in Social (stage Posted, with likes and comments); their pictures are copied into your storage. */
const IG = 'https://graph.instagram.com';
async function igSync(uid: string) {
  const { data: auth } = await sb.from('records').select('id,data').eq('user_id', uid).eq('kind', 'igauth').maybeSingle();
  // the secret wins when you put in a new one; spaces, line breaks and quotes from copying are dropped
  const envTok = (Deno.env.get('IG_TOKEN') || '').replace(/[\s"'`]/g, '');
  const fresh = !auth?.data?.src || auth.data.src !== envTok.slice(-12);
  let tok = (fresh ? envTok : auth.data.token) || envTok, at = fresh ? 0 : auth.data.at || 0;
  if (!tok) return { error: 'IG_TOKEN is not set in Supabase yet' };
  // what the token looks like, without showing it: helps tell an app secret or app ID from a real token
  const shape = `${fresh ? 'from IG_TOKEN' : 'saved earlier'}, ${tok.length} characters, starts with ${tok.slice(0, 4)}`;
  if (/^\d+$/.test(tok)) return { error: `IG_TOKEN holds a number (${shape}): that is the app ID, not the access token` };
  if (/^[0-9a-f]{32}$/i.test(tok)) return { error: `IG_TOKEN looks like the app secret (${shape}), not the access token` };
  const get = async (u: string) => { const r = await fetch(u); const j = await r.json(); if (!r.ok || j.error) throw new Error(j.error?.message || 'Instagram said no (' + r.status + ')'); return j; };
  const keep = async (t: string) => { await sb.from('records').upsert({ user_id: uid, id: auth?.id || crypto.randomUUID(), kind: 'igauth', data: { token: t, at: Date.now(), src: envTok.slice(-12) }, updated_at: new Date().toISOString() }); };
  // two kinds of token: Instagram login (IGAA…) talks to graph.instagram.com about "me"; Facebook login (EAA…)
  // talks to graph.facebook.com and finds your Instagram account through the Facebook page it is linked to
  const fb = /^EAA/.test(tok), FBG = 'https://graph.facebook.com/v21.0';
  // a long-lived token lasts about 60 days; renew it once it is older than 3 weeks, and keep only one that worked
  if (!at || Date.now() - at > 21 * 864e5) {
    try {
      if (fb) {
        const id = Deno.env.get('IG_APP_ID'), sec = Deno.env.get('IG_APP_SECRET');
        if (id && sec) { const j = await get(`${FBG}/oauth/access_token?grant_type=fb_exchange_token&client_id=${id}&client_secret=${sec}&fb_exchange_token=${encodeURIComponent(tok)}`); tok = j.access_token; await keep(tok); }
      } else { const j = await get(`${IG}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(tok)}`); tok = j.access_token; await keep(tok); }
    } catch (e) { console.error('refresh', e); }
  }
  const PF = 'username,name,profile_picture_url,followers_count,follows_count,media_count,biography', MF = 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
  let me: any, next = '';
  try {
    if (fb) {
      const pages = await get(`${FBG}/me/accounts?fields=name,instagram_business_account{id}&limit=50&access_token=${encodeURIComponent(tok)}`);
      let ig = (pages.data || []).map((p: any) => p.instagram_business_account?.id).find(Boolean);
      // a Unified login token can stand for the Instagram account itself; then "me" is that account
      if (!ig) { try { const m = await get(`${FBG}/me?fields=id,username&access_token=${encodeURIComponent(tok)}`); if (m.username) ig = m.id; } catch { /* not an Instagram user token */ } }
      if (!ig) {
        let perms = '';
        try { const p = await get(`${FBG}/me/permissions?access_token=${encodeURIComponent(tok)}`); perms = (p.data || []).filter((x: any) => x.status === 'granted').map((x: any) => x.permission).join(', '); } catch { perms = 'unknown'; }
        return { error: `No Instagram account found through Facebook (${shape}). Pages seen: ${(pages.data || []).length}. Permissions: ${perms || 'none'}` };
      }
      me = await get(`${FBG}/${ig}?fields=${PF}&access_token=${encodeURIComponent(tok)}`);
      next = `${FBG}/${ig}/media?fields=${MF}&limit=50&access_token=${encodeURIComponent(tok)}`;
    } else {
      me = await get(`${IG}/v21.0/me?fields=user_id,${PF}&access_token=${encodeURIComponent(tok)}`);
      next = `${IG}/v21.0/me/media?fields=${MF}&limit=50&access_token=${encodeURIComponent(tok)}`;
    }
  } catch (e: any) { return { error: `${e.message} (${shape})` }; }
  const media: any[] = [];
  for (let i = 0; next && i < 4; i++) { const j = await get(next); media.push(...(j.data || [])); next = j.paging?.next || ''; }
  const { data: have, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).in('kind', ['posts', 'accounts']);
  if (error) throw error;
  const now = new Date().toISOString(), rows: any[] = [];
  const acc = have.find((r: any) => r.kind === 'accounts' && r.data.platform === 'Instagram');
  const accData = { ...(acc?.data || { platform: 'Instagram', active: true, created: Date.now() }), handle: '@' + me.username, display: me.name || acc?.data?.display || '', bio: me.biography ?? acc?.data?.bio ?? '', followers: me.followers_count, following: me.follows_count, url: 'https://www.instagram.com/' + me.username, igSync: Date.now() };
  if (me.profile_picture_url && (!acc?.data?.avatar || /^https?:/.test(acc.data.avatar) || !acc?.data?.igAvatarDay || acc.data.igAvatarDay !== now.slice(0, 7))) { accData.avatar = await keepPhoto(uid, me.profile_picture_url); accData.igAvatarDay = now.slice(0, 7); }
  rows.push({ user_id: uid, id: acc?.id || crypto.randomUUID(), kind: 'accounts', data: clean(accData), updated_at: now });
  const byIg = new Map(have.filter((r: any) => r.kind === 'posts' && r.data.igId).map((r: any) => [r.data.igId, r]));
  // copying pictures is the heavy part: at most 25 per run, newest first; the rest follow on the next syncs
  let added = 0, copies = 0, waiting = 0;
  const flush = async () => { while (rows.length) { const { error: e } = await sb.from('records').upsert(rows.splice(0, 25)); if (e) throw e; } };
  for (const m of media) {
    const old: any = byIg.get(m.id), ts = new Date(m.timestamp), date = m.timestamp.slice(0, 10), time = m.timestamp.slice(11, 16);
    const fmt = m.media_product_type === 'REELS' || m.media_type === 'VIDEO' ? 'Short Video' : m.media_type === 'CAROUSEL_ALBUM' ? 'Carousel' : m.media_product_type === 'STORY' ? 'Story' : 'Image Post';
    const cap = String(m.caption || ''), first = cap.split('\n')[0].replace(/#\S+/g, '').trim();
    const d: any = old ? { ...old.data } : { name: first.slice(0, 70) || 'Instagram post', created: ts.getTime(), stage: 'Posted', platforms: ['Instagram'], format: fmt, date, time };
    Object.assign(d, { igId: m.id, link: m.permalink, caption: cap, likes: m.like_count ?? d.likes, comments: m.comments_count ?? d.comments, stage: 'Posted' });
    if (!d.photo || /^https?:/.test(d.photo)) {
      const pic = m.thumbnail_url || m.media_url;
      if (pic && copies < 25) { copies++; d.photo = await keepPhoto(uid, pic); } else if (pic) { d.photo = pic; waiting++; }
    }
    if (!old) added++;
    rows.push({ user_id: uid, id: old?.id || crypto.randomUUID(), kind: 'posts', data: clean(d), updated_at: now });
    if (rows.length >= 25) await flush();
  }
  await flush();
  return { ok: true, handle: me.username, posts: media.length, added, followers: me.followers_count, photosWaiting: waiting };
}


/* ---------- TikTok ----------
   Login Kit with the scopes user.info.basic, user.info.profile, user.info.stats and video.list. You log in once from
   the app (Connect TikTok); the code comes back to the app, which hands it here. The access token lasts a day, the
   refresh token a year; both live in a private record (kind ttauth). Videos become posts with platform TikTok. */
const TT = 'https://open.tiktokapis.com/v2';
async function ttToken(form: Record<string, string>) {
  const r = await fetch(`${TT}/oauth/token/`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_key: Deno.env.get('TIKTOK_CLIENT_KEY') || '', client_secret: Deno.env.get('TIKTOK_CLIENT_SECRET') || '', ...form }) });
  const j = await r.json(); if (!r.ok || j.error) throw new Error(j.error_description || j.error || 'TikTok said no (' + r.status + ')'); return j;
}
async function ttSave(uid: string, id: string | undefined, j: any) {
  const data = { access: j.access_token, refresh: j.refresh_token, until: Date.now() + (j.expires_in || 86400) * 1000 - 6e5, openId: j.open_id };
  await sb.from('records').upsert({ user_id: uid, id: id || crypto.randomUUID(), kind: 'ttauth', data, updated_at: new Date().toISOString() });
  return data;
}
async function ttConnect(uid: string, code: string, redirect: string) {
  if (!code) return { error: 'No code from TikTok' };
  if (!Deno.env.get('TIKTOK_CLIENT_SECRET')) return { error: 'TIKTOK_CLIENT_SECRET is not set in Supabase yet' };
  const { data: auth } = await sb.from('records').select('id').eq('user_id', uid).eq('kind', 'ttauth').maybeSingle();
  try { await ttSave(uid, auth?.id, await ttToken({ code, grant_type: 'authorization_code', redirect_uri: redirect })); } catch (e: any) { return { error: e.message }; }
  return await ttSync(uid);
}
async function ttSync(uid: string) {
  const { data: auth } = await sb.from('records').select('id,data').eq('user_id', uid).eq('kind', 'ttauth').maybeSingle();
  if (!auth?.data?.refresh) return { error: 'TikTok is not connected yet' };
  let a = auth.data;
  if (!a.access || Date.now() > a.until) { try { a = await ttSave(uid, auth.id, await ttToken({ grant_type: 'refresh_token', refresh_token: a.refresh })); } catch (e: any) { return { error: 'TikTok login expired, connect again (' + e.message + ')' }; } }
  const call = async (path: string, init: RequestInit = {}) => { const r = await fetch(TT + path, { ...init, headers: { Authorization: 'Bearer ' + a.access, 'Content-Type': 'application/json', ...(init.headers || {}) } }); const j = await r.json(); if (!r.ok || (j.error && j.error.code && j.error.code !== 'ok')) throw new Error(j.error?.message || 'TikTok said no (' + r.status + ')'); return j.data; };
  let me: any;
  try { me = (await call('/user/info/?fields=open_id,avatar_url,display_name,username,bio_description,follower_count,following_count,likes_count,video_count')).user; }
  catch (e: any) { return { error: e.message }; }
  const vids: any[] = []; let cursor: number | undefined, more = true;
  for (let i = 0; more && i < 10; i++) {
    const d = await call('/video/list/?fields=id,title,video_description,create_time,cover_image_url,share_url,like_count,comment_count,share_count,view_count,duration', { method: 'POST', body: JSON.stringify({ max_count: 20, ...(cursor ? { cursor } : {}) }) });
    vids.push(...(d.videos || [])); more = !!d.has_more; cursor = d.cursor;
  }
  const { data: have, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).in('kind', ['posts', 'accounts']);
  if (error) throw error;
  const now = new Date().toISOString(), rows: any[] = [];
  const acc = have.find((r: any) => r.kind === 'accounts' && r.data.platform === 'TikTok');
  const accData: any = { ...(acc?.data || { platform: 'TikTok', active: true, created: Date.now() }), handle: me.username ? '@' + me.username : acc?.data?.handle, display: me.display_name || '', bio: me.bio_description ?? acc?.data?.bio ?? '', followers: me.follower_count, following: me.following_count, likesTotal: me.likes_count, url: me.username ? 'https://www.tiktok.com/@' + me.username : acc?.data?.url, ttSync: Date.now() };
  if (me.avatar_url && (!accData.avatar || /^https?:/.test(accData.avatar) || accData.ttAvatarMonth !== now.slice(0, 7))) { accData.avatar = await keepPhoto(uid, me.avatar_url); accData.ttAvatarMonth = now.slice(0, 7); }
  rows.push({ user_id: uid, id: acc?.id || crypto.randomUUID(), kind: 'accounts', data: clean(accData), updated_at: now });
  const byTt = new Map(have.filter((r: any) => r.kind === 'posts' && r.data.ttId).map((r: any) => [r.data.ttId, r]));
  let added = 0, copies = 0, waiting = 0;
  const flush = async () => { while (rows.length) { const { error: e } = await sb.from('records').upsert(rows.splice(0, 25)); if (e) throw e; } };
  for (const v of vids) {
    const old: any = byTt.get(v.id), ts = new Date((v.create_time || 0) * 1000), desc = String(v.video_description || v.title || '');
    const d: any = old ? { ...old.data } : { name: (v.title || desc.split('\n')[0].replace(/#\S+/g, '').trim()).slice(0, 70) || 'TikTok video', created: ts.getTime(), stage: 'Posted', platforms: ['TikTok'], format: 'Short Video', date: ts.toISOString().slice(0, 10), time: ts.toISOString().slice(11, 16) };
    Object.assign(d, { ttId: v.id, link: v.share_url, caption: desc, views: v.view_count ?? d.views, likes: v.like_count ?? d.likes, comments: v.comment_count ?? d.comments, shares: v.share_count ?? d.shares, stage: 'Posted' });
    if ((!d.photo || /^https?:/.test(d.photo)) && v.cover_image_url) { if (copies < 25) { copies++; d.photo = await keepPhoto(uid, v.cover_image_url); } else { d.photo = v.cover_image_url; waiting++; } }
    if (!old) added++;
    rows.push({ user_id: uid, id: old?.id || crypto.randomUUID(), kind: 'posts', data: clean(d), updated_at: now });
    if (rows.length >= 25) await flush();
  }
  await flush();
  return { ok: true, handle: me.username || me.display_name, posts: vids.length, added, followers: me.follower_count, photosWaiting: waiting };
}

/* ---------- Pinterest ----------
   Connect once (OAuth, scopes boards:read, pins:read, pins:write, user_accounts:read). The token is kept in a
   'pnauth' record and refreshed by itself. Sync reads your account stats (last 30 days), your boards and the pins on
   the boards you picked in the app: a board for the home moodboard, boards for social inspiration and one board of
   affirmations for Today. A planned post with a photo can be pinned to a board from the app.
   Secrets: PINTEREST_APP_ID, PINTEREST_APP_SECRET. */
const PN = 'https://api.pinterest.com/v5';
const PN_ROOMS = ['Entree', 'Woonkamer', 'Keuken', 'Slaapkamer', 'Werkkamer', 'Badkamer', 'Toilet', 'Wasruimte', 'Balkon'];
async function pnToken(form: Record<string, string>) {
  const id = Deno.env.get('PINTEREST_APP_ID') || '', secret = Deno.env.get('PINTEREST_APP_SECRET') || '';
  const r = await fetch(`${PN}/oauth/token`, { method: 'POST', headers: { Authorization: 'Basic ' + btoa(id + ':' + secret), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form) });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.access_token) throw new Error(j.message || j.error_description || 'Pinterest said no (' + r.status + ')'); return j;
}
async function pnSave(uid: string, id: string | undefined, j: any, old: any = {}) {
  const data = { access: j.access_token, refresh: j.refresh_token || old.refresh, until: Date.now() + (j.expires_in || 2592000) * 1000 - 6e5, refreshUntil: j.refresh_token_expires_in ? Date.now() + j.refresh_token_expires_in * 1000 : old.refreshUntil };
  await sb.from('records').upsert({ user_id: uid, id: id || crypto.randomUUID(), kind: 'pnauth', data, updated_at: new Date().toISOString() });
  return data;
}
async function pnAccess(uid: string) {
  const { data: auth } = await sb.from('records').select('id,data').eq('user_id', uid).eq('kind', 'pnauth').maybeSingle();
  if (!auth?.data?.refresh && !auth?.data?.access) throw new Error('Pinterest is not connected yet');
  let a = auth.data;
  if (!a.access || Date.now() > a.until) { try { a = await pnSave(uid, auth.id, await pnToken({ grant_type: 'refresh_token', refresh_token: a.refresh }), a); } catch (e: any) { throw new Error('Pinterest login expired, connect again (' + e.message + ')'); } }
  const call = async (path: string, init: RequestInit = {}) => {
    const r = await fetch(PN + path, { ...init, headers: { Authorization: 'Bearer ' + a.access, 'Content-Type': 'application/json', ...(init.headers || {}) } });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.message || 'Pinterest said no (' + r.status + ')'); return j;
  };
  return call;
}
async function pnConnect(uid: string, code: string, redirect: string) {
  if (!code) return { error: 'No code from Pinterest' };
  if (!Deno.env.get('PINTEREST_APP_SECRET')) return { error: 'PINTEREST_APP_SECRET is not set in Supabase yet' };
  const { data: auth } = await sb.from('records').select('id').eq('user_id', uid).eq('kind', 'pnauth').maybeSingle();
  try { await pnSave(uid, auth?.id, await pnToken({ grant_type: 'authorization_code', code, redirect_uri: redirect })); } catch (e: any) { return { error: e.message }; }
  return await pnSync(uid);
}
const pnImg = (p: any) => { const m = p?.media?.images || {}; return (m['600x'] || m['1200x'] || m['400x300'] || m['150x150'] || {}).url || ''; };
const pnText = (p: any) => String(p?.title || p?.description || p?.alt_text || '').trim();
async function pnPins(call: (p: string) => Promise<any>, board: string, max = 100) {
  const out: any[] = []; let book = '';
  for (let i = 0; out.length < max && i < 5; i++) { const j = await call(`/boards/${board}/pins?page_size=50${book ? '&bookmark=' + encodeURIComponent(book) : ''}`); out.push(...(j.items || [])); book = j.bookmark; if (!book) break; }
  return out.slice(0, max);
}
async function pnSync(uid: string) {
  let call; try { call = await pnAccess(uid); } catch (e: any) { return { error: e.message }; }
  const now = new Date(), nowS = now.toISOString(), end = nowS.slice(0, 10), start = new Date(now.getTime() - 29 * 864e5).toISOString().slice(0, 10);
  let me: any; try { me = await call('/user_account'); } catch (e: any) { return { error: e.message }; }
  const boards: any[] = []; let book = '';
  for (let i = 0; i < 5; i++) { const j = await call(`/boards?page_size=100${book ? '&bookmark=' + encodeURIComponent(book) : ''}`); boards.push(...(j.items || [])); book = j.bookmark; if (!book) break; }
  const { data: have, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).in('kind', ['accounts', 'moodboard', 'inspo', 'vision', 'ideas', 'posts']);
  if (error) throw error;
  const acc = have.find((r: any) => r.kind === 'accounts' && r.data.platform === 'Pinterest');
  const d: any = { ...(acc?.data || { platform: 'Pinterest', active: true, created: Date.now() }) };
  Object.assign(d, { handle: me.username ? '@' + me.username : d.handle, display: me.business_name || me.username || d.display, url: me.username ? 'https://www.pinterest.com/' + me.username + '/' : d.url, followers: me.follower_count ?? d.followers, following: me.following_count ?? d.following, monthlyViews: me.monthly_views ?? d.monthlyViews, avatar: me.profile_image || d.avatar, pnSync: Date.now() });
  d.pnBoardList = boards.map(b => ({ id: b.id, name: b.name, pins: b.pin_count ?? null, img: b.media?.image_cover_url || '' })).slice(0, 200);
  try {
    const a = await call(`/user_account/analytics?start_date=${start}&end_date=${end}&metric_types=IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK,ENGAGEMENT`);
    const m = a?.all?.summary_metrics || {};
    d.pnStats = { from: start, to: end, impressions: m.IMPRESSION ?? null, saves: m.SAVE ?? null, clicks: m.PIN_CLICK ?? null, outbound: m.OUTBOUND_CLICK ?? null, engagement: m.ENGAGEMENT ?? null };
    d.pnDaily = (a?.all?.daily_metrics || []).map((x: any) => ({ date: x.date, impressions: x.metrics?.IMPRESSION ?? 0, saves: x.metrics?.SAVE ?? 0 })).slice(-30);
  } catch (e: any) { d.pnStatsError = e.message; }
  const roles = d.pnBoards || {}, rows: any[] = [];
  const known = new Set(boards.map(b => b.id));
  let added = 0;
  // the affirmations board: kept on the account, Today shows one a day
  if (roles.affirm && known.has(roles.affirm)) d.pnAffirm = (await pnPins(call, roles.affirm, 120)).map(p => ({ id: p.id, img: pnImg(p), text: pnText(p).slice(0, 300) })).filter(p => p.img);
  else delete d.pnAffirm;
  // closet and travel boards: kept on the account as rows of pins, the app shows them in Outfits and Trips
  const strip = async (ids: string[], max: number) => {
    const out: any[] = [];
    for (const bid of ids.filter(b => known.has(b))) { const board = boards.find(b => b.id === bid)?.name || ''; for (const p of await pnPins(call, bid, 60)) { const img = pnImg(p); if (img) out.push({ id: p.id, img, text: pnText(p).slice(0, 200), board }); } }
    return out.slice(0, max);
  };
  for (const [role, key, max] of [['closet', 'pnCloset', 120], ['travel', 'pnTravel', 150]] as [string, string, number][]) { const ids = [].concat(roles[role] || []); if (ids.length) d[key] = await strip(ids, max); else delete d[key]; }
  const byPin = new Map(have.filter((r: any) => r.data.pnId && ['moodboard', 'inspo', 'vision', 'ideas'].includes(r.kind)).map((r: any) => [r.kind + ':' + r.data.pnId, r]));
  // boards that become records: the moodboard, Social inspiration, the vision board and self-care ideas per area
  const SETS: [string, string, string[]][] = [['moodboard', '', roles.mood], ['inspo', '', roles.inspo], ['vision', '', roles.vision], ['ideas', 'Hair', roles.hair], ['ideas', 'Nails', roles.nails], ['ideas', 'Beauty', roles.beauty]].map(([k, a, l]: any) => [k, a, [].concat(l || [])]);
  for (const [kind, area, list] of SETS) {
    for (const bid of list.filter(b => known.has(b))) {
      const bname = boards.find(b => b.id === bid)?.name || '', room = PN_ROOMS.find(r => bname.toLowerCase().includes(r.toLowerCase()));
      for (const p of await pnPins(call, bid, 100)) {
        if (byPin.has(kind + ':' + p.id)) continue;
        const name = (pnText(p).split('\n')[0] || bname || 'Pin').slice(0, 80), link = 'https://www.pinterest.com/pin/' + p.id + '/';
        const base = { name, photo: pnImg(p), pnId: p.id, pnBoard: bname, created: Date.now() };
        const data = kind === 'moodboard' ? { ...base, room: room || 'Overig', link, why: p.description || '' }
          : kind === 'vision' ? { ...base, url: link, why: p.description || '' }
          : kind === 'ideas' ? { ...base, area, what: 'Look', url: link, summary: p.description || '' }
          : { ...base, type: 'Post', link, why: p.description || '' };
        rows.push({ user_id: uid, id: crypto.randomUUID(), kind, data: clean(data), updated_at: nowS }); added++;
      }
    }
  }
  // stats of the pins you made from the app
  for (const r of have.filter((r: any) => r.kind === 'posts' && r.data.pnId).slice(0, 40)) {
    try {
      const a = await call(`/pins/${r.data.pnId}/analytics?start_date=${start}&end_date=${end}&metric_types=IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK`), m = a?.all?.lifetime_metrics || a?.all?.summary_metrics || {};
      rows.push({ user_id: uid, id: r.id, kind: 'posts', data: clean({ ...r.data, pnViews: m.IMPRESSION ?? r.data.pnViews, pnSaves: m.SAVE ?? r.data.pnSaves, pnClicks: m.PIN_CLICK ?? r.data.pnClicks, pnOutbound: m.OUTBOUND_CLICK ?? r.data.pnOutbound }), updated_at: nowS });
    } catch { /* stats for a new pin come a day later */ }
  }
  rows.push({ user_id: uid, id: acc?.id || crypto.randomUUID(), kind: 'accounts', data: clean(d), updated_at: nowS });
  while (rows.length) { const { error: e } = await sb.from('records').upsert(rows.splice(0, 25)); if (e) throw e; }
  return { ok: true, handle: me.username, boards: boards.length, added, affirmations: d.pnAffirm?.length || 0, closet: d.pnCloset?.length || 0, travel: d.pnTravel?.length || 0, stats: !!d.pnStats };
}
async function pnPost(uid: string, id: string, board: string, link: string) {
  const rec = await postRec(uid, id); if (!rec) return { error: 'Post not found' };
  const d = rec.data; if (!d.photo) return { error: 'Add a photo to the post first' };
  if (!board) return { error: 'Pick a board first' };
  try {
    const call = await pnAccess(uid);
    const desc = [d.caption, d.hashtags].filter(Boolean).join('\n\n').slice(0, 500);
    const pin = await call('/pins', { method: 'POST', body: JSON.stringify(clean({ board_id: board, title: String(d.pnTitle || d.name || '').slice(0, 100), description: desc, link: link || d.pnLink || undefined, alt_text: String(d.name || '').slice(0, 500), media_source: { source_type: 'image_url', url: pub(d.photo) } })) });
    const now = new Date();
    await sb.from('records').upsert({ user_id: uid, id, kind: 'posts', data: clean({ ...d, pnId: pin.id, pnBoard: board, pnLink: link || d.pnLink, pnPosted: now.toISOString().slice(0, 10), platforms: [...new Set([...(d.platforms || []), 'Pinterest'])] }), updated_at: now.toISOString() });
    return { ok: true, pinned: true, link: 'https://www.pinterest.com/pin/' + pin.id + '/' };
  } catch (e: any) { return { error: e.message }; }
}

/* ---------- posting from the app ----------
   Instagram: a planned post with a video becomes a Reel, one with only a photo (JPEG) a photo post; Instagram has no
   drafts here, so it goes live at once (the app asks first). Video takes a while: the app asks again with the
   container until Instagram is done. TikTok: the video lands as a draft in your TikTok inbox (scope video.upload);
   you finish and post it in TikTok. */
const pub = (path: string) => /^https?:/.test(path) ? path : `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/photos/${path}`;
async function postRec(uid: string, id: string) {
  const { data } = await sb.from('records').select('id,data').eq('user_id', uid).eq('kind', 'posts').eq('id', id).maybeSingle();
  return data;
}
async function igCtx(uid: string) {
  const { data: auth } = await sb.from('records').select('data').eq('user_id', uid).eq('kind', 'igauth').maybeSingle();
  const envTok = (Deno.env.get('IG_TOKEN') || '').replace(/[\s"'`]/g, '');
  const tok = (auth?.data?.src && auth.data.src === envTok.slice(-12) ? auth.data.token : envTok) || envTok;
  if (!tok) throw new Error('IG_TOKEN is not set in Supabase yet');
  const fb = /^EAA/.test(tok), base = fb ? 'https://graph.facebook.com/v21.0' : `${IG}/v21.0`;
  const get = async (u: string, init?: RequestInit) => { const r = await fetch(u, init); const j = await r.json(); if (!r.ok || j.error) throw new Error(j.error?.error_user_msg || j.error?.message || 'Instagram said no (' + r.status + ')'); return j; };
  let ig = '';
  if (fb) { const pages = await get(`${base}/me/accounts?fields=instagram_business_account{id}&access_token=${encodeURIComponent(tok)}`); ig = (pages.data || []).map((p: any) => p.instagram_business_account?.id).find(Boolean) || ''; }
  else ig = (await get(`${base}/me?fields=user_id&access_token=${encodeURIComponent(tok)}`)).user_id;
  if (!ig) throw new Error('No Instagram account found');
  return { tok, base, ig, get };
}
async function igPost(uid: string, id: string, container: string) {
  const rec = await postRec(uid, id); if (!rec) return { error: 'Post not found' };
  const d = rec.data, caption = [d.caption, d.hashtags].filter(Boolean).join('\n\n');
  try {
    const { tok, base, ig, get } = await igCtx(uid), q = (o: Record<string, string>) => new URLSearchParams({ ...o, access_token: tok });
    if (!container) {
      if (!d.video && !d.photo) return { error: 'Add a video or a photo to the post first' };
      const body = d.video ? q({ media_type: 'REELS', video_url: pub(d.video), caption, share_to_feed: 'true', ...(d.photo ? { cover_url: pub(d.photo) } : {}) }) : q({ image_url: pub(d.photo), caption });
      container = (await get(`${base}/${ig}/media`, { method: 'POST', body })).id;
    }
    for (let i = 0; i < 8; i++) {
      const st = await get(`${base}/${container}?fields=status_code,status&access_token=${encodeURIComponent(tok)}`);
      if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') return { error: 'Instagram could not process it: ' + (st.status || st.status_code) };
      if (st.status_code === 'FINISHED' || !st.status_code) {
        const m = await get(`${base}/${ig}/media_publish`, { method: 'POST', body: q({ creation_id: container }) });
        let link = ''; try { link = (await get(`${base}/${m.id}?fields=permalink&access_token=${encodeURIComponent(tok)}`)).permalink; } catch { /* the link follows with the next sync */ }
        const now = new Date();
        await sb.from('records').upsert({ user_id: uid, id, kind: 'posts', data: clean({ ...d, stage: 'Posted', igId: m.id, link: link || d.link, date: now.toISOString().slice(0, 10), time: now.toISOString().slice(11, 16), platforms: [...new Set([...(d.platforms || []), 'Instagram'])] }), updated_at: now.toISOString() });
        return { ok: true, posted: true, link };
      }
      await new Promise(r => setTimeout(r, 5000));
    }
    return { ok: true, pending: true, container };
  } catch (e: any) { return { error: e.message }; }
}
async function ttAccess(uid: string) {
  const { data: auth } = await sb.from('records').select('id,data').eq('user_id', uid).eq('kind', 'ttauth').maybeSingle();
  if (!auth?.data?.refresh) throw new Error('TikTok is not connected yet');
  let a = auth.data;
  if (!a.access || Date.now() > a.until) a = await ttSave(uid, auth.id, await ttToken({ grant_type: 'refresh_token', refresh_token: a.refresh }));
  return a.access as string;
}
async function ttPost(uid: string, id: string) {
  const rec = await postRec(uid, id); if (!rec) return { error: 'Post not found' };
  const d = rec.data; if (!d.video) return { error: 'Add a video to the post first' };
  try {
    const access = await ttAccess(uid);
    const file = await fetch(pub(d.video)); if (!file.ok) return { error: 'Could not read the video from storage' };
    const buf = new Uint8Array(await file.arrayBuffer()), size = buf.length, type = file.headers.get('content-type') || 'video/mp4';
    const init = await fetch(`${TT}/post/publish/inbox/video/init/`, { method: 'POST', headers: { Authorization: 'Bearer ' + access, 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify({ source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: size, total_chunk_count: 1 } }) });
    const ij = await init.json();
    if (!init.ok || (ij.error?.code && ij.error.code !== 'ok')) return { error: /scope/i.test(ij.error?.code || ij.error?.message || '') ? 'Connect TikTok again so the app may upload videos' : (ij.error?.message || 'TikTok said no (' + init.status + ')') };
    const up = await fetch(ij.data.upload_url, { method: 'PUT', headers: { 'Content-Type': type, 'Content-Length': String(size), 'Content-Range': `bytes 0-${size - 1}/${size}` }, body: buf });
    if (!up.ok) return { error: 'TikTok did not take the upload (' + up.status + ')' };
    await sb.from('records').upsert({ user_id: uid, id, kind: 'posts', data: clean({ ...d, ttPublishId: ij.data.publish_id, ttSent: new Date().toISOString().slice(0, 10), platforms: [...new Set([...(d.platforms || []), 'TikTok'])] }), updated_at: new Date().toISOString() });
    return { ok: true, sent: true };
  } catch (e: any) { return { error: e.message }; }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token || req.headers.get('x-offers-token');
    const uid = Deno.env.get('SPEND_USER_ID')!;
    // the app itself may ask for an Instagram sync, signed in as you
    let viaApp = false;
    if ((!token || token !== Deno.env.get('OFFERS_TOKEN')) && ['igsync', 'ttstart', 'ttconnect', 'ttsync', 'igpost', 'ttpost', 'photourl', 'linkinfo', 'pnstart', 'pnconnect', 'pnsync', 'pnpost'].includes(body.action)) {
      const jwt = req.headers.get('authorization')?.replace(/^Bearer /, '') || '';
      const { data: u } = await sb.auth.getUser(jwt); viaApp = !!u?.user && u.user.id === uid;
    }
    if (!viaApp && (!token || !Deno.env.get('OFFERS_TOKEN') || token !== Deno.env.get('OFFERS_TOKEN'))) return json({ error: 'forbidden' }, 403);

    if (body.action === 'igsync') return json(await igSync(uid));
    if (body.action === 'ttstart') { const k = Deno.env.get('TIKTOK_CLIENT_KEY'); return json(k ? { clientKey: k } : { error: 'TIKTOK_CLIENT_KEY is not set in Supabase yet' }); }
    if (body.action === 'ttconnect') return json(await ttConnect(uid, str(body.code, 2000), str(body.redirect, 500)));
    if (body.action === 'ttsync') return json(await ttSync(uid));
    if (body.action === 'igpost') return json(await igPost(uid, str(body.id, 60), str(body.container, 60)));
    if (body.action === 'ttpost') return json(await ttPost(uid, str(body.id, 60)));
    if (body.action === 'pnstart') { const k = Deno.env.get('PINTEREST_APP_ID'); return json(k ? { appId: k } : { error: 'PINTEREST_APP_ID is not set in Supabase yet' }); }
    if (body.action === 'pnconnect') return json(await pnConnect(uid, str(body.code, 2000), str(body.redirect, 500)));
    if (body.action === 'pnsync') return json(await pnSync(uid));
    if (body.action === 'pnpost') return json(await pnPost(uid, str(body.id, 60), str(body.board, 60), str(body.link, 500)));
    // a photo from the web for the closet editor: the browser may not read other sites' images, so this fetches it
    // and hands it back (nothing is stored). A page link instead of an image link gets the page's main picture.
    // Apple Health, sent each morning by an iPhone Shortcut: sleep, steps, workouts and period
    if (body.action === 'health') {
      const date = day(body.date) || new Date().toISOString().slice(0, 10), now = new Date().toISOString(), out: Record<string, unknown> = {};
      const { data, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).in('kind', ['sleep', 'nlog', 'workouts', 'cycles']);
      if (error) throw error;
      const up = async (kind: string, match: (r: any) => boolean, patch: Record<string, unknown>) => { const hit = data.find((r: any) => r.kind === kind && match(r.data || {})); const row = { user_id: uid, id: hit?.id || crypto.randomUUID(), kind, data: { ...(hit?.data || { created: Date.now() }), ...clean(patch) }, updated_at: now }; const { error: e } = await sb.from('records').upsert(row); if (e) throw e; };
      // sleep may come in hours, minutes or seconds, depending on how the Shortcut adds it up
      const rawSleep = num(body.sleepHours ?? body.sleep), hrs = rawSleep == null ? null : rawSleep > 1440 ? rawSleep / 3600 : rawSleep > 24 ? rawSleep / 60 : rawSleep;
      if (hrs != null && hrs > 0 && hrs < 16) { await up('sleep', r => r.date === date, { date, hours: Math.round(hrs * 10) / 10, bed: str(body.bed, 5), up: str(body.wake, 5), source: 'Apple Health' }); out.sleep = hrs; }
      const steps = num(String(body.steps ?? '').replace(/[^0-9.,]/g, '').replace(',', '.') || null); if (steps != null) { await up('nlog', r => r.date === date, { date, steps: Math.round(steps) }); out.steps = steps; }
      const TYPES: Record<string, string> = { walking: 'Walk', running: 'Run', cycling: 'Cycling', yoga: 'Yoga', pilates: 'Pilates', hiit: 'HIIT', strength: 'Strength', 'traditional strength training': 'Strength', 'functional strength training': 'Strength', 'high intensity interval training': 'HIIT', dance: 'Cardio', elliptical: 'Cardio', rowing: 'Cardio', flexibility: 'Stretching', 'core training': 'Strength' };
      const wos = (Array.isArray(body.workouts) ? body.workouts : String(body.workouts || '').split('\n').filter(Boolean).map((l: string) => { const [t, m, d] = l.split(/[;,]/).map(x => x.trim()); return { type: t, minutes: m, date: d }; })).slice(0, 10);
      let wn = 0;
      for (const w of wos as any[]) {
        const wd = day(w.date) || date, raw = str(w.type, 60), type = TYPES[raw.toLowerCase()] || 'Other', min = num(w.minutes), hk = `${wd}|${raw}|${min}`;
        if (!raw || data.some((r: any) => r.kind === 'workouts' && r.data?.hk === hk)) continue;
        const plan = data.find((r: any) => r.kind === 'workouts' && r.data?.date === wd && !r.data?.done && !r.data?.skipped);
        if (plan) await up('workouts', r => r === plan.data, { done: true, minutes: min ?? plan.data.minutes, hk, source: 'Apple Health' });
        else { const { error: e } = await sb.from('records').insert({ user_id: uid, id: crypto.randomUUID(), kind: 'workouts', data: clean({ name: raw, date: wd, minutes: min, type, done: true, hk, source: 'Apple Health', created: Date.now() }), updated_at: now }); if (e) throw e; }
        wn++;
      }
      out.workouts = wn;
      if (body.period === true || /^(true|ja|yes|1)$/i.test(String(body.period || ''))) {
        const recent = data.filter((r: any) => r.kind === 'cycles' && r.data?.start && r.data.start >= new Date(Date.parse(date) - 10 * 864e5).toISOString().slice(0, 10));
        if (!recent.length) { const { error: e } = await sb.from('records').insert({ user_id: uid, id: crypto.randomUUID(), kind: 'cycles', data: { start: date, source: 'Apple Health', created: Date.now() }, updated_at: now }); if (e) throw e; out.period = 'started'; }
      }
      return json({ ok: true, ...out });
    }
    // the move list for the weekly price check: open products and their options with a link
    if (body.action === 'movelist') {
      const { data, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).in('kind', ['inventory', 'invopts']);
      if (error) throw error;
      const open = data.filter((r: any) => r.kind === 'inventory' && ['Idee', 'Kiezen', 'Besteld', 'Wishlist', 'Ordered'].includes(r.data?.status));
      return json({ items: open.map((r: any) => clean({ id: r.id, name: r.data.name, room: r.data.room, budget: r.data.budget, options: data.filter((o: any) => o.kind === 'invopts' && o.data?.item === r.id && !o.data?.archived && o.data?.url).map((o: any) => clean({ id: o.id, name: o.data.name, shop: o.data.shop, price: o.data.price, url: o.data.url })) })) });
    }
    if (body.action === 'moveprices') {
      const now = new Date().toISOString(), drops: string[] = [], dropItems: string[] = [];
      for (const u of (Array.isArray(body.updates) ? body.updates : []).slice(0, 100)) {
        const { data: o } = await sb.from('records').select('id,data').eq('user_id', uid).eq('kind', 'invopts').eq('id', str(u?.id, 60)).maybeSingle(); if (!o) continue;
        const price = num(u?.price); if (price == null) continue;
        const old = num(o.data?.price), note = old != null && price < old ? `Van ${old} naar ${price} (${new Date().toISOString().slice(0, 10)})` : '';
        if (note) { drops.push(`${o.data?.name || 'Optie'}: ${old} → ${price}`); dropItems.push(o.data?.item || ''); }
        await sb.from('records').update({ data: { ...o.data, price, wasPrice: old ?? o.data?.wasPrice, priceNote: note || o.data?.priceNote, checked: now.slice(0, 10), ...(u?.inStock === false ? { soldOut: true } : {}) }, updated_at: now }).eq('user_id', uid).eq('id', o.id);
      }
      if (drops.length) { const one = [...new Set(dropItems.filter(Boolean))]; await send(uid, { title: 'Prijsdaling op je verhuislijst', body: drops.slice(0, 4).join('\n'), url: one.length === 1 ? `./#home/inventory?open=${one[0]}` : './#home/inventory', tag: 'moveprices' }); }
      return json({ ok: true, drops: drops.length });
    }
    // a product link pasted in the move list: name, price, shop and photo, read from the page
    if (body.action === 'linkinfo') {
      const url = str(body.url, 2000);
      if (!/^https?:\/\//.test(url)) return json({ error: 'Plak een link die begint met https://' }, 400);
      const pk = await peek(url), pr = pk.product || {}, off = [].concat(pr.offers || [])[0] as any || {};
      const price = num(off.price ?? off.lowPrice ?? (pr.offers as any)?.lowPrice), cur = String(off.priceCurrency || 'EUR');
      const brand = typeof pr.brand === 'string' ? pr.brand : pr.brand?.name;
      const photo = pk.photo ? await keepPhoto(uid, pk.photo) : '';
      // the list price next to the sale price, when the page gives one
      const specs = [].concat(off.priceSpecification || []) as any[], list = specs.find(x => /list|strikethrough|msrp|regular/i.test(String(x?.priceType || x?.name || '')));
      const origPrice = num(list?.price), size = typeof pr.size === 'string' ? pr.size : pr.size?.name;
      // a recipe: name, times, servings, ingredient lines and steps
      let recipe: any;
      if (pk.recipe) {
        const r = pk.recipe, lines = [].concat(r.recipeIngredient || r.ingredients || []).map((x: any) => String(x).trim()).filter(Boolean).slice(0, 80);
        const steps = textOf(r.recipeInstructions).split('\n').map((x: string) => x.trim()).filter(Boolean).slice(0, 60);
        recipe = clean({ servings: Number(String([].concat(r.recipeYield || [])[0] || '').match(/\d+/)?.[0]) || undefined, prep: isoMin(r.prepTime), cook: isoMin(r.cookTime), total: isoMin(r.totalTime), lines, steps, cuisine: str([].concat(r.recipeCuisine || [])[0], 40), category: str([].concat(r.recipeCategory || [])[0], 40) });
      }
      return json(clean({ name: str((pk.recipe?.name) || pr.name || pk.title, 160), price: cur === 'EUR' ? price : undefined, origPrice: cur === 'EUR' && origPrice && price && origPrice > price ? origPrice : undefined, priceNote: cur !== 'EUR' && price != null ? `${price} ${cur}` : undefined, brand: str(brand, 80), shop: str(pk.site, 60), photo, color: str(pr.color, 60), material: str(pr.material, 60),
        about: str(pr.description || pk.recipe?.description || pk.desc, 700), size: str(size, 40), gtin: str(pr.gtin13 || pr.gtin || pr.gtin8 || pr.sku, 40), recipe }));
    }
    // the biggest version of a shop photo: CDNs put the size in the link, so ask for a large one first
    const bigger = (u: string): string[] => {
      const out: string[] = [];
      try {
        const x = new URL(u), h = x.hostname;
        if (/static\.zara\.net$/.test(h) && /\/w\/\d+\//.test(x.pathname)) { x.pathname = x.pathname.replace(/\/w\/\d+\//, '/w/1500/'); out.push(x.href); }
        else if (/(^|\.)mango\.com$|mngbcdn\.com$/.test(h)) { x.searchParams.set('wid', '2048'); x.searchParams.delete('hei'); out.push(x.href); }
        else if (/image\.hm\.com$|lp2\.hm\.com$/.test(h)) { x.searchParams.set('imwidth', '2160'); out.push(x.href); }
        else if (/ztat\.net$/.test(h)) { x.searchParams.set('imwidth', '1800'); out.push(x.href); }
        else if (/lystit\.com$/.test(h) && /^\/\d+\/\d+\/[a-z]+\/photos\//.test(x.pathname)) { x.pathname = x.pathname.replace(/^\/\d+\/\d+\/[a-z]+\//, '/'); out.push(x.href); }
        else if (/cloudfront\.net$/.test(h) && /\/[sm]_[a-z0-9]+\.(jpe?g|webp)$/.test(x.pathname)) { x.pathname = x.pathname.replace(/\/[sm]_/, '/l_'); out.push(x.href); }
        else if (/superbalistcdn\.co\.za$/.test(h)) { x.pathname = x.pathname.replace(/^\/\d+x\d+\//, '/1000x1500/'); out.push(x.href); }
        else if (/images\.asos-media\.com$/.test(h)) { x.search = '?wid=1500&fit=constrain'; out.push(x.href); }
        else if (/cdn\.shopify\.com$|\/cdn\/shop\//.test(h + x.pathname)) { x.pathname = x.pathname.replace(/_(\d+x\d*|\d*x\d+)(?=\.[a-z]+$)/, ''); x.searchParams.delete('width'); x.searchParams.delete('height'); out.push(x.href); }
        else {
          let changed = false;
          for (const k of ['w', 'width', 'wid', 'imwidth', 'sw']) if (x.searchParams.has(k) && Number(x.searchParams.get(k)) < 1500) { x.searchParams.set(k, k === 'sw' ? '1500' : '1600'); changed = true; }
          for (const k of ['h', 'height', 'hei', 'sh']) if (changed && x.searchParams.has(k)) x.searchParams.delete(k);
          if (changed) out.push(x.href);
        }
      } catch { /* not a URL we can improve */ }
      return [...out.filter(v => v !== u), u];
    };
    // links you pasted in the app: the nightly Claude task fills in the rest of each record
    //   { "token": "...", "action": "filllist" } → records marked needsFill (any kind), newest first
    //   { "token": "...", "action": "fillsave", "items": [{ "id": "...", "fields": { ... }, "done": true }] } → only empty fields are filled
    if (body.action === 'filllist') {
      const { data, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).eq('data->>needsFill', 'true').limit(200);
      if (error) throw error;
      return json({ items: (data || []).map((r: any) => ({ id: r.id, kind: r.kind, data: r.data })) });
    }
    // the fill-in page: every record of the kinds asked for, and saving what the user typed there
    //   { "token": "...", "action": "scanlist", "kinds": ["beauty", "recipes", ...] } → {items: [{id, kind, data}]}
    //   { "token": "...", "action": "usersave", "items": [{ "id": "...", "fields": { ... } }] } → sets these fields (the user's own answers)
    if (body.action === 'scanlist') {
      const kinds = (Array.isArray(body.kinds) ? body.kinds : []).map((k: unknown) => str(k, 30)).filter(Boolean).slice(0, 40);
      if (!kinds.length) return json({ error: 'Send the kinds to list' }, 400);
      const out: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).in('kind', kinds).range(from, from + 999);
        if (error) throw error; out.push(...(data || [])); if (!data || data.length < 1000) break;
      }
      return json({ items: out.map((r: any) => ({ id: r.id, kind: r.kind, data: r.data })) });
    }
    if (body.action === 'usersave') {
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 200); let saved = 0;
      for (const it of items) {
        const id = str(it?.id, 60); if (!id || !it.fields || typeof it.fields !== 'object') continue;
        const { data: row, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).eq('id', id).maybeSingle();
        if (error) throw error; if (!row) continue;
        const d = { ...row.data };
        for (const [k, v] of Object.entries(it.fields)) { if (['id', 'kind'].includes(k)) continue; if (v === null) delete d[k]; else d[k] = k === 'photo' && typeof v === 'string' && /^https?:/.test(v) ? await keepPhoto(uid, v) : v; }
        const { error: e2 } = await sb.from('records').upsert({ user_id: uid, id, kind: row.kind, data: d, updated_at: new Date().toISOString() });
        if (e2) throw e2; saved++;
      }
      return json({ ok: true, saved });
    }
    // a finished photo (for example a product cut out on a transparent background) straight into a record
    if (body.action === 'photoput') {
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 20); let saved = 0; const failed: string[] = [];
      for (const it of items) {
        const id = str(it?.id, 60), type = str(it?.type, 30) || 'image/png';
        if (!id || !/^image\/(png|jpeg|webp)$/.test(type) || typeof it?.data !== 'string') { failed.push(id); continue; }
        let buf: Uint8Array; try { const bin = atob(it.data); buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i); } catch { failed.push(id); continue; }
        if (buf.length < 100 || buf.length > 4e6) { failed.push(id); continue; }
        // closet pieces live in "items", everything else in "records"
        const table = it.table === 'items' ? 'items' : 'records';
        const { data: row, error } = await sb.from(table).select(table === 'items' ? 'id,data' : 'id,kind,data').eq('user_id', uid).eq('id', id).maybeSingle();
        if (error) throw error; if (!row) { failed.push(id); continue; }
        const path = `${uid}/${crypto.randomUUID()}.${type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'}`;
        const { error: e1 } = await sb.storage.from('photos').upload(path, buf, { contentType: type, cacheControl: '31536000', upsert: false });
        if (e1) { failed.push(id); continue; }
        const d: any = { ...row.data, photo: path }; const credit = str(it.credit, 300); if (credit) d.photoCredit = credit; else delete d.photoCredit;
        const { error: e2 } = await sb.from(table).upsert(table === 'items' ? { user_id: uid, id, data: d, updated_at: new Date().toISOString() } : { user_id: uid, id, kind: row.kind, data: d, updated_at: new Date().toISOString() });
        if (e2) throw e2; saved++;
      }
      return json({ ok: true, saved, failed });
    }
    if (body.action === 'fillsave') {
      const KEEP = new Set(['id', 'kind', 'created', 'updated', 'needsFill', 'bought', 'rating', 'fav', 'left', 'opened', 'qty', 'finished', 'low', 'wish', 'status', 'archived', 'notes', 'own', 'given']);
      const PAID = new Set(['price', 'shop', 'store']), WANT = new Set(['wishes', 'fwait', 'gifts', 'offers', 'bdeals', 'deals', 'invopts', 'stays', 'fragsugs']);
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 100); let saved = 0;
      for (const it of items) {
        const id = str(it?.id, 60); if (!id) continue;
        const { data: row, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).eq('id', id).maybeSingle();
        if (error) throw error; if (!row) continue;
        const d = { ...row.data }, f = it.fields && typeof it.fields === 'object' ? it.fields : {};
        const empty = (v: any) => v == null || v === '' || (Array.isArray(v) && !v.length);
        for (const [k, v] of Object.entries(f)) {
          if (KEEP.has(k) || (PAID.has(k) && !WANT.has(row.kind)) || !empty(d[k]) || empty(v)) continue;
          d[k] = k === 'photo' && typeof v === 'string' && /^https?:/.test(v) ? await keepPhoto(uid, v) : v;
        }
        if (it.done !== false) { delete d.needsFill; d.filledAt = new Date().toISOString().slice(0, 10); }
        const { error: e2 } = await sb.from('records').upsert({ user_id: uid, id, kind: row.kind, data: d, updated_at: new Date().toISOString() });
        if (e2) throw e2; saved++;
      }
      return json({ ok: true, saved });
    }
    if (body.action === 'photourl') {
      const ua = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'Accept': 'image/avif,image/webp,image/png,image/jpeg,text/html;q=0.8,*/*;q=0.5' };
      let url = str(body.url, 2000), page = '';
      if (!/^https?:\/\//.test(url)) return json({ error: 'Paste a link that starts with https://' }, 400);
      let r = await fetch(url, { headers: ua, redirect: 'follow' });
      if (r.ok && (r.headers.get('content-type') || '').includes('html')) { page = url; const seen = await peek(url); if (!seen.photo) return json({ error: 'That page has no photo. Copy the image address itself.' }, 400); url = seen.photo; r = await fetch(url, { headers: ua, redirect: 'follow' }); }
      // try the large version of the same photo first, then the link as it was
      for (const big of bigger(url).slice(0, -1)) { try { const rb = await fetch(big, { headers: ua, redirect: 'follow' }); if (rb.ok && (rb.headers.get('content-type') || '').startsWith('image/')) { r = rb; url = big; break; } } catch { /* keep the original */ } }
      const type = r.headers.get('content-type') || '';
      if (!r.ok || !type.startsWith('image/')) return json({ error: 'That link is not an image' }, 400);
      const buf = new Uint8Array(await r.arrayBuffer()); if (buf.length > 8e6) return json({ error: 'That photo is too big (over 8 MB)' }, 400);
      let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return json({ data: btoa(bin), type, page, url });
    }

    // shops in Kitchen › Shops (kind shops) and Beauty › Deals › Beauty shops (kind bshops): list them, or add new ones by name
    if (body.action === 'shops') {
      const { data, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).in('kind', ['shops', 'bshops']);
      if (error) throw error;
      const have = new Set(data.map((r: any) => r.kind + ':' + String(r.data?.name || '').trim().toLowerCase()));
      const now = new Date().toISOString(), rows: any[] = [];
      for (const a of (Array.isArray(body.add) ? body.add : []).slice(0, 80)) {
        const kind = a?.area === 'beauty' ? 'bshops' : 'shops', d = shopOut(a);
        if (!d.name || have.has(kind + ':' + String(d.name).toLowerCase())) continue;
        have.add(kind + ':' + String(d.name).toLowerCase());
        rows.push({ user_id: uid, id: crypto.randomUUID(), kind, data: { ...d, created: Date.now() }, updated_at: now });
      }
      if (rows.length) { const { error: e2 } = await sb.from('records').insert(rows); if (e2) throw e2; }
      const all = [...data, ...rows];
      return json({ added: rows.length, kitchen: all.filter((r: any) => r.kind === 'shops').map((r: any) => shopOut(r.data)), beauty: all.filter((r: any) => r.kind === 'bshops').map((r: any) => shopOut(r.data)) });
    }
    // what the beauty deals task needs: your products, your beauty wishes and your beauty shops
    if (body.action === 'beautylist') {
      const { data, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).in('kind', ['beauty', 'wishes', 'bshops']);
      if (error) throw error;
      const products = data.filter((r: any) => r.kind === 'beauty').map((r: any) => clean({ id: r.id, name: r.data.name, brand: r.data.brand, type: r.data.type, size: r.data.size, price: r.data.price, fav: r.data.fav || undefined, low: r.data.low || undefined, finished: r.data.finished || undefined, wish: r.data.wish || undefined, qty: r.data.qty, opened: r.data.opened, rating: r.data.rating }));
      const wishes = data.filter((r: any) => r.kind === 'wishes' && /beauty/i.test(String(r.data.category || '')) && !r.data.archived && !['Bought', 'Dropped'].includes(r.data.status)).map((r: any) => clean({ id: r.id, name: r.data.name, brand: r.data.brand, shop: r.data.shop, price: r.data.price, url: r.data.url }));
      const shops = data.filter((r: any) => r.kind === 'bshops').map((r: any) => shopOut(r.data));
      return json({ products, wishes, shops });
    }
    // perfume once a month: her fragrances, her scent profile and what was suggested before
    if (body.action === 'fraglist') {
      const { data, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).in('kind', ['beauty', 'fragprofile', 'fragsugs', 'bshops']);
      if (error) throw error;
      const arr = (v: any) => [].concat(v || []);
      const fragrances = data.filter((r: any) => r.kind === 'beauty' && r.data?.type === 'Fragrance').map((r: any) => clean({ id: r.id, name: r.data.name, brand: r.data.brand, family: arr(r.data.family), notes: arr(r.data.scent), season: arr(r.data.season), occasion: arr(r.data.occasion), rating: r.data.rating, fav: r.data.fav || undefined, wish: r.data.wish || undefined, finished: r.data.finished || undefined, size: r.data.size, price: r.data.price, about: r.data.about }));
      const p = data.find((r: any) => r.kind === 'fragprofile')?.data || {};
      const before = data.filter((r: any) => r.kind === 'fragsugs').map((r: any) => clean({ name: r.data.name, brand: r.data.brand, month: r.data.month, status: r.data.status }));
      const shops = data.filter((r: any) => r.kind === 'bshops').map((r: any) => shopOut(r.data));
      return json({ fragrances, profile: clean({ likes: arr(p.likes), notesLove: arr(p.notesLove), dislikes: p.dislikes, notes: p.notes }), before, shops });
    }
    // this month's perfume suggestions: replaces only the suggestions of the same month, keeps what she marked
    if (body.action === 'fragsave') {
      const month = /^\d{4}-\d{2}$/.test(String(body.month || '')) ? String(body.month) : new Date().toISOString().slice(0, 7);
      const KIND = ['New for you', 'On sale: one you love', 'Cheaper alternative'];
      const sugs = (Array.isArray(body.items) ? body.items : []).slice(0, 30).map((o: any) => clean({
        name: str(o?.name, 160), brand: str(o?.brand, 80), why: str(o?.why, 400), fit: KIND.includes(o?.fit) ? o.fit : 'New for you', like: str(o?.like, 120),
        family: (Array.isArray(o?.family) ? o.family : []).map((x: any) => str(x, 30)).slice(0, 4), scent: (Array.isArray(o?.notes) ? o.notes : []).map((x: any) => str(x, 30)).slice(0, 10),
        store: str(o?.store, 60), deal: str(o?.deal, 120), price: num(o?.price), was: num(o?.was), size: str(o?.size, 30), until: day(o?.until), url: str(o?.url, 500), photo: str(o?.photo, 500), month
      })).filter((o: any) => o.name);
      for (const o of sugs as any[]) if (o.photo) o.photo = await keepPhoto(uid, o.photo);
      const { data: old, error: e1 } = await sb.from('records').select('id,data').eq('user_id', uid).eq('kind', 'fragsugs');
      if (e1) throw e1;
      const stale = (old || []).filter((r: any) => r.data?.month === month && !r.data?.status).map((r: any) => r.id);
      for (let i = 0; i < stale.length; i += 200) { const { error } = await sb.from('records').delete().eq('user_id', uid).in('id', stale.slice(i, i + 200)); if (error) throw error; }
      const now = new Date().toISOString(), rows = sugs.map((d: any) => ({ user_id: uid, id: crypto.randomUUID(), kind: 'fragsugs', data: { ...d, created: Date.now() }, updated_at: now }));
      if (rows.length) { const { error } = await sb.from('records').insert(rows); if (error) throw error; }
      if (rows.length) await send(uid, { title: 'Perfume for this month', body: `${rows.length} ${rows.length === 1 ? 'suggestion' : 'suggestions'} that fit your scent profile.`, url: './#care/perfume', tag: 'fragsugs' });
      return json({ ok: true, saved: rows.length, month });
    }
    // this week's beauty deals: replaces last week's
    if (body.action === 'beautysave') {
      const MATCH = ['Your product', 'Running low', 'On your wishlist', 'Brand you use'];
      const deals = (Array.isArray(body.deals) ? body.deals : []).slice(0, 200).map((o: any) => clean({
        name: str(o?.name, 160), brand: str(o?.brand, 80), store: str(o?.store, 60), deal: str(o?.deal, 120), price: num(o?.price), was: num(o?.was),
        until: day(o?.until), url: str(o?.url, 500), photo: str(o?.photo, 500), why: str(o?.why, 400),
        match: MATCH.includes(o?.match) ? o.match : 'Brand you use', product: str(o?.product, 60), wish: str(o?.wish, 60)
      })).filter((o: any) => o.name && o.store);
      for (const o of deals as any[]) if (o.photo) o.photo = await keepPhoto(uid, o.photo);
      const { data: old, error: e1 } = await sb.from('records').select('id').eq('user_id', uid).eq('kind', 'bdeals');
      if (e1) throw e1;
      const now = new Date().toISOString(), rows = deals.map((d: any) => ({ user_id: uid, id: crypto.randomUUID(), kind: 'bdeals', data: { ...d, created: Date.now() }, updated_at: now }));
      for (let i = 0; i < rows.length; i += 200) { const { error } = await sb.from('records').insert(rows.slice(i, i + 200)); if (error) throw error; }
      const stale = (old || []).map((r: any) => r.id);
      for (let i = 0; i < stale.length; i += 200) { const { error } = await sb.from('records').delete().eq('user_id', uid).in('id', stale.slice(i, i + 200)); if (error) throw error; }
      const mine = (deals as any[]).filter(d => d.match !== 'Brand you use').length;
      if (deals.length) await send(uid, { title: 'Beauty deals are in', body: mine ? `${mine} on your own products or wishes, ${deals.length} in total.` : `${deals.length} deals on brands you use.`, url: './#care/bdeals', tag: 'bdeals' });
      return json({ ok: true, deals: deals.length });
    }
    if (body.action === 'recipes') {
      const { data, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).in('kind', ['recipes', 'ingredients', 'wplans', 'rreviews', 'shops', 'meals']);
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
      const pantry = [...ing.values()].map((i: any) => clean({ name: i.name, stock: i.stock ? true : undefined, category: i.category, location: i.location, frozen: i.frozen, expires: i.expires, portions: i.portions, staple: i.staple ? true : undefined, low: i.low ? true : undefined }));
      // evenings she doesn't cook (meal plan: dinner marked not at home), from today on
      const todayISO = new Date().toISOString().slice(0, 10);
      const away = data.filter((r: any) => r.kind === 'meals' && r.data?.away && r.data?.slot === 'Dinner' && String(r.data?.date) >= todayISO).map((r: any) => r.data.date).sort();
      // the shops she keeps in Kitchen › Shops: read the deals of every shop with readDeals on (plus Dirk, Aldi and AH)
      const shops = data.filter((r: any) => r.kind === 'shops').map((r: any) => shopOut(r.data));
      // the last plans, so a new week doesn't repeat the same recipes
      const recent = data.filter((r: any) => r.kind === 'wplans').map((r: any) => r.data).sort((a: any, b: any) => String(b.start).localeCompare(String(a.start))).slice(0, 3)
        .map((p: any) => ({ start: p.start, dinners: (p.dinners || []).map((d: any) => d.name) }));
      // what you like and don't like, from Kitchen › Settings
      const { data: pr } = await sb.from('prefs').select('data').eq('user_id', uid).maybeSingle();
      return json({ recipes, away, pantry, freezer: pantry.filter((i: any) => i.location === 'Vriezer' && i.stock), shops, recent, food: pr?.data?.food || {}, learned });
    }

    const TARGETS = ['recipes', 'wishes', 'closet', 'beauty', 'supplements', 'gear', 'fitgear', 'inventory', 'ideas', 'cideas', 'stips', 'inspo', 'gifts', 'keep', 'stays', 'trip', 'vworkouts', 'reslinks'];
    const cleanDraft = (d: any) => { const o: Record<string, unknown> = {}; if (d && typeof d === 'object') for (const [k, v] of Object.entries(d).slice(0, 40)) { if (!/^[a-zA-Z]{1,24}$/.test(k)) continue; o[k] = typeof v === 'string' ? v.slice(0, 12000) : Array.isArray(v) ? v.slice(0, 60).map(x => typeof x === 'string' ? x.slice(0, 600) : x) : typeof v === 'number' || typeof v === 'boolean' ? v : undefined; } return clean(o); };
    if (body.action === 'share') {
      const text = str(body.text, 4000), url = str(body.url, 1000) || (text.match(/https?:\/\/\S+/) || [''])[0].replace(/[),.]+$/, '');
      if (!url && !text) return json({ error: 'nothing to save' }, 400);
      let target = TARGETS.includes(body.target) ? body.target : '', draft: Record<string, unknown> = target ? cleanDraft(body.draft) : {}, why = str(body.why, 400), quick = false;
      // nothing told us what it is: look at the page and sort it right away; the sorting task checks it later
      let seen: Peek = {};
      if (url && !target) {
        seen = await peek(url);
        const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } })();
        if (STAYS.test(host) || seen.lodging) {
          const pl = await placeOf(url, seen, host);
          target = 'stays'; draft = cleanDraft({ ...pl, photo: seen.photo, site: String(seen.site || host), notes: str(body.note, 1000) });
          why = `Een verblijf${pl.city ? ' in ' + pl.city : ''}${pl.country ? ', ' + pl.country : ''}.`; quick = true;
        } else {
          const q = quickSort(url, seen, text, str(body.note, 1000));
          target = q.target; draft = cleanDraft(q.draft); why = q.why; quick = true;
        }
      }
      if (draft.photo) draft.photo = await keepPhoto(uid, String(draft.photo));
      else if (body.photo) seen.photo = await keepPhoto(uid, str(body.photo, 500));
      const data = clean({ url, text: text && text !== url ? text : '', note: str(body.note, 1000), source: str(body.source, 40) || 'Share', status: target ? 'Ready' : 'New', target, title: str(body.title, 200) || str(draft.name, 200) || str(seen.title, 200), why, photo: (draft.photo as string) || seen.photo || '', draft, quick: quick || undefined, extId: str(body.extId, 80), created: Date.now() });
      // the same Albo item twice updates instead of duplicating
      let id = crypto.randomUUID();
      if (data.extId) { const { data: same } = await sb.from('records').select('id,data').eq('user_id', uid).eq('kind', 'inbox').filter('data->>extId', 'eq', data.extId); if (same?.[0]) { if (['Done', 'Skipped'].includes(same[0].data.status)) return json({ ok: true, id: same[0].id, already: true }); id = same[0].id; } }
      const { error } = await sb.from('records').upsert({ user_id: uid, id, kind: 'inbox', data, updated_at: new Date().toISOString() });
      if (error) throw error;
      const label: Record<string, string> = { stays: 'verblijf', recipes: 'recept', closet: 'kast-wishlist', beauty: 'beauty', supplements: 'supplementen', gear: 'keukenspullen', fitgear: 'fitness', inventory: 'wonen', wishes: 'wishlist', ideas: 'idee', cideas: 'contentidee', stips: 'social media tip', inspo: 'inspiratie', gifts: 'cadeau', keep: 'bewaarde link' };
      return json({ ok: true, id, target, message: target ? `In je inbox, als ${label[target] || target}` : 'In je inbox' });
    }
    // video workouts without written steps: the sorting round reads the video and writes them out
    if (body.action === 'vwlist') {
      const { data, error } = await sb.from('records').select('id,data').eq('user_id', uid).eq('kind', 'vworkouts');
      if (error) throw error;
      const todo = data.filter((r: any) => !(Array.isArray(r.data?.steps) && r.data.steps.length) && !r.data?.noSteps);
      return json({ left: todo.length, items: todo.slice(0, Math.min(25, Number(body.limit) || 10)).map((r: any) => clean({ id: r.id, name: r.data.name, url: r.data.url, type: r.data.type, minutes: r.data.minutes, level: r.data.level, materials: r.data.materials, instructor: r.data.instructor, notes: r.data.notes })) });
    }
    if (body.action === 'vwfill') {
      const VW = ['Pilates', 'Yoga', 'Strength', 'HIIT', 'Cardio', 'Dance', 'Barre', 'Stretching', 'Walk'], LV = ['Beginner', 'Intermediate', 'Advanced'];
      const MAT = ['No equipment', 'Mat', 'Dumbbells', 'Resistance band', 'Ankle weights', 'Pilates ball', 'Kettlebell', 'Bench'];
      let n = 0;
      for (const w of (Array.isArray(body.items) ? body.items : []).slice(0, 25)) {
        const { data: r } = await sb.from('records').select('id,data').eq('user_id', uid).eq('kind', 'vworkouts').eq('id', str(w?.id, 60)).maybeSingle(); if (!r) continue;
        const d = { ...r.data }, steps = (Array.isArray(w.steps) ? w.steps : []).map((x: unknown) => str(x, 600)).filter(Boolean).slice(0, 40);
        if (steps.length) d.steps = steps; else if (w.problem) d.noSteps = true;
        if (!d.type && VW.includes(w.type)) d.type = w.type;
        if (!d.minutes && num(w.minutes)) d.minutes = num(w.minutes);
        if (!d.level && LV.includes(w.level)) d.level = w.level;
        if (!(d.materials || []).length && Array.isArray(w.materials)) { const m = w.materials.filter((x: string) => MAT.includes(x)); if (m.length) d.materials = m; }
        if (!d.instructor && w.instructor) d.instructor = str(w.instructor, 80);
        if (w.problem) d.stepsNote = str(w.problem, 300);
        const { error: e } = await sb.from('records').update({ data: d, updated_at: new Date().toISOString() }).eq('user_id', uid).eq('id', r.id);
        if (e) throw e; n++;
      }
      return json({ ok: true, filled: n });
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

    // Closet pieces from a video (a try-on, a haul, a screen recording of another closet app). Three actions:
    //   { "token": "...", "action": "closetlist" }  → what is in your closet now (to skip pieces you already have)
    //   { "token": "...", "action": "closetadd", "batch": "video-1", "items": [{ "name": "...", "cat": "Tops", "brand": "...",
    //     "photo": "https://..." or "photoData": "<base64 jpeg/png/webp>", "notes": "...", ... }] }
    //     → new pieces with status "closet", source "video" and the tag "From video"; the same importKey twice updates
    //   { "token": "...", "action": "closetundo", "batch": "video-1" }  → removes every piece of that batch again
    // In the app each piece can also be changed or deleted on its own (with Undo).
    if (body.action === 'closetlist') {
      const { data, error } = await sb.from('items').select('id,data').eq('user_id', uid).limit(5000);
      if (error) throw error;
      return json({ items: data.map((r: any) => clean({ id: r.id, name: r.data.name, cat: r.data.cat, sub: r.data.sub, brand: r.data.brand, colors: r.data.colors, status: r.data.status, source: r.data.source, batch: r.data.batch, importKey: r.data.importKey, photo: r.data.photo, link: r.data.link || r.data.url, shop: r.data.shop })) });
    }
    if (body.action === 'closetadd') {
      const batch = str(body.batch, 60); if (!batch) return json({ error: 'batch is needed, e.g. "video-1"' }, 400);
      const want = (Array.isArray(body.items) ? body.items : []).slice(0, 100);
      const list = (v: unknown, n = 20) => (Array.isArray(v) ? v : []).map(x => str(x, 60)).filter(Boolean).slice(0, n);
      const { data: have, error: e0 } = await sb.from('items').select('id,data').eq('user_id', uid).limit(5000);
      if (e0) throw e0;
      const byKey = new Map(have.filter((r: any) => r.data.importKey).map((r: any) => [r.data.importKey, r]));
      let added = 0, updated = 0; const ids: string[] = [];
      for (const w of want) {
        const name = str(w?.name, 160); if (!name) continue;
        const key = str(w?.importKey, 120), same: any = key ? byKey.get(key) : null;
        if (same && same.data.source !== 'video') continue; // never overwrite a piece you made yourself
        let photo = same?.data.photo || '';
        const raw = str(w?.photoData, 8e6).replace(/^data:image\/[a-z]+;base64,/, '');
        if (raw) {
          try {
            const buf = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
            const type = buf[0] === 0x89 ? 'image/png' : buf[0] === 0x52 ? 'image/webp' : 'image/jpeg';
            if (buf.length <= 6e6) { const path = `${uid}/${crypto.randomUUID()}.${type.split('/')[1].replace('jpeg', 'jpg')}`; const { error } = await sb.storage.from('photos').upload(path, buf, { contentType: type, cacheControl: '31536000', upsert: false }); if (!error) photo = path; }
          } catch { /* a broken picture: the piece still saves */ }
        } else if (w?.photo) photo = await keepPhoto(uid, str(w.photo, 2000));
        const now = Date.now();
        const data = clean({
          name, cat: str(w?.cat, 40) || 'Tops', sub: str(w?.sub, 80), brand: str(w?.brand, 80), size: str(w?.size, 30), articleNo: str(w?.articleNo, 60),
          price: num(w?.price), origPrice: num(w?.origPrice), bought: day(w?.bought), pastWears: Math.max(0, Math.round(Number(w?.pastWears) || 0)) || undefined, material: str(w?.material, 200), shop: str(w?.shop, 80), link: str(w?.link, 500),
          colors: list(w?.colors), materials: list(w?.materials), fits: list(w?.fits), seasons: list(w?.seasons, 4), occasions: list(w?.occasions),
          tags: [...new Set([...list(w?.tags), 'From video'])], condition: str(w?.condition, 40), acquired: str(w?.acquired, 40),
          notes: str(w?.notes, 4000), careNotes: str(w?.careNotes, 1000), photo, status: 'closet', source: 'video', batch, importKey: key,
          created: same?.data.created || now, updated: now
        });
        const id = same?.id || crypto.randomUUID();
        const { error } = await sb.from('items').upsert({ user_id: uid, id, data: same ? { ...same.data, ...data } : data, updated_at: new Date().toISOString() });
        if (error) throw error;
        same ? updated++ : added++; ids.push(id);
      }
      return json({ ok: true, added, updated, ids });
    }
    if (body.action === 'closetundo') {
      const batch = str(body.batch, 60); if (!batch) return json({ error: 'batch is needed' }, 400);
      const { data, error } = await sb.from('items').select('id,data').eq('user_id', uid).filter('data->>source', 'eq', 'video').filter('data->>batch', 'eq', batch);
      if (error) throw error;
      const ids = data.map((r: any) => r.id), paths = data.map((r: any) => r.data.photo).filter((p: string) => p && !/^https?:/.test(p));
      for (let i = 0; i < ids.length; i += 200) { const { error: e } = await sb.from('items').delete().eq('user_id', uid).in('id', ids.slice(i, i + 200)); if (e) throw e; }
      if (paths.length) await sb.storage.from('photos').remove(paths);
      return json({ ok: true, removed: ids.length });
    }

    if (body.action === 'save') {
      const start = day(body.week?.start), end = day(body.week?.end);
      if (!start || !end) return json({ error: 'week.start and week.end are needed (YYYY-MM-DD)' }, 400);
      const offers = (Array.isArray(body.offers) ? body.offers : []).slice(0, 400).map((o: any) => clean({
        store: str(o?.store, 60), name: str(o?.name, 160), price: num(o?.price), was: num(o?.was), deal: str(o?.deal, 120), unit: str(o?.unit, 60),
        category: str(o?.category, 60), from: day(o?.from) || start, until: day(o?.until) || end, url: str(o?.url, 500), photo: str(o?.photo, 500), week: start
      })).filter((o: any) => o.name && o.store);
      const p = body.plan || {};
      const plan = clean({
        name: `Week of ${start}`, start, end, made: new Date().toISOString(),
        dinners: (p.dinners || []).slice(0, 10).map(meal), lunches: (p.lunches || []).slice(0, 6).map(meal),
        breakfasts: (p.breakfasts || []).slice(0, 6).map(meal), snacks: (p.snacks || []).slice(0, 6).map(meal), drinks: (p.drinks || []).slice(0, 6).map(meal),
        quit: (p.quit || []).slice(0, 6).map(meal), quitTips: str(p.quitTips, 1500),
        shared: (p.shared || []).slice(0, 30).map((s: any) => clean({ name: str(s?.name, 120), store: str(s?.store, 40), price: num(s?.price), deal: str(s?.deal, 120), in: (Array.isArray(s?.in) ? s.in : []).map((x: unknown) => str(x, 140)).slice(0, 12) })),
        shopping: (p.shopping || []).slice(0, 80).map((s: any) => clean({ name: str(s?.name, 120), store: str(s?.store, 60), price: num(s?.price), deal: str(s?.deal, 120), qty: str(s?.qty, 40), have: s?.have === true ? true : undefined, market: s?.market === true ? true : undefined, category: str(s?.category, 40), left: str(s?.left, 120) })),
        tips: str(p.tips, 1200),
        prep: (Array.isArray(p.prep) ? p.prep : []).slice(0, 15).map((x: any) => clean({ task: str(x?.task ?? x, 200), for: str(x?.for, 120), mins: num(x?.mins) })).filter((x: any) => x.task),
        prepDay: day(p.prepDay)
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
      // put the dinners, lunches and breakfasts straight into the meal plan on their dates; last run's own entries for this week make way
      const { data: ms } = await sb.from('records').select('id,data').eq('user_id', uid).eq('kind', 'meals').gte('data->>date', start).lte('data->>date', end);
      const autoOld = (ms || []).filter((r: any) => r.data?.auto && r.data?.week === start).map((r: any) => r.id);
      const busy = new Set((ms || []).filter((r: any) => !(r.data?.auto && r.data?.week === start)).map((r: any) => `${r.data?.date}|${r.data?.away ? 'Dinner' : r.data?.slot}`));
      const mrows: any[] = [];
      for (const [k, slot] of [['dinners', 'Dinner'], ['lunches', 'Lunch'], ['breakfasts', 'Breakfast']] as const) for (const m of ((plan as any)[k] || []) as any[]) for (const d of m.dates || []) {
        if (d < start || d > end || busy.has(`${d}|${slot}`)) continue; busy.add(`${d}|${slot}`);
        mrows.push({ user_id: uid, id: crypto.randomUUID(), kind: 'meals', data: clean({ date: d, slot, recipe: m.recipe, what: m.recipe ? undefined : m.name, auto: true, week: start, created: Date.now() }), updated_at: now });
      }
      if (autoOld.length) { const { error } = await sb.from('records').delete().eq('user_id', uid).in('id', autoOld); if (error) throw error; }
      if (mrows.length) { const { error } = await sb.from('records').insert(mrows); if (error) throw error; }
      const n = (plan.dinners as unknown[] | undefined)?.length || 0;
      await send(uid, { title: 'Deals of the week are in', body: `${offers.length} deals at ${[...new Set(offers.map((o: any) => o.store))].slice(0, 4).join(', ')}${n ? `, and ${n} dinners that use them` : ''}.`, url: './#kitchen/deals', tag: 'deals' });
      return json({ ok: true, offers: offers.length, plan: planId, meals: mrows.length });
    }
    return json({ error: 'unknown action' }, 400);
  } catch (e: any) {
    console.error(e);
    return json({ error: String(e?.message || e) }, 500);
  }
});
