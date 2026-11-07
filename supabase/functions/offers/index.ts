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
// Secrets: OFFERS_TOKEN, SPEND_USER_ID (your user id), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY. Turn off "Verify JWT" for this function.
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
const SHOP_TYPES = ['Supermarket', 'Toko', 'Butcher', 'Fishmonger', 'Greengrocer', 'Market', 'Drugstore', 'Perfumery', 'Brand store', 'Webshop', 'Other'];
const shopOut = (a: any) => clean({ name: str(a?.name, 80), type: SHOP_TYPES.includes(a?.type) ? a.type : undefined, address: str(a?.address, 160), website: str(a?.website, 300), dealsUrl: str(a?.dealsUrl, 300), readDeals: a?.readDeals === true ? true : undefined, mine: a?.mine === true ? true : undefined, notes: str(a?.notes, 400) });

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
  // 2. a social post or video that reads like a recipe
  if (p.social && RECIPEWORDS.test(`${p.title || ''} ${p.desc || ''} ${note} ${text}`)) return { target: 'recipes', why: 'Een post die op een recept lijkt. De sorteerronde vult de ingrediënten en stappen aan.', draft: { name: p.title, photo: p.photo } };
  // 3. a social post with a tip about making content: poses, filming, editing, apps, branding, growth
  if (p.social && TIPWORDS.test(`${p.title || ''} ${p.desc || ''} ${note} ${text}`)) return { target: 'stips', why: 'Een post met een tip voor social media. De sorteerronde schrijft de stappen uit.', draft: { name: p.title, photo: p.photo, summary: (p.desc || '').slice(0, 300) } };
  // 4. a product: the shop first, then words in the name
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
    if ((!token || token !== Deno.env.get('OFFERS_TOKEN')) && ['igsync', 'ttstart', 'ttconnect', 'ttsync', 'igpost', 'ttpost', 'photourl'].includes(body.action)) {
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
    // a photo from the web for the closet editor: the browser may not read other sites' images, so this fetches it
    // and hands it back (nothing is stored). A page link instead of an image link gets the page's main picture.
    if (body.action === 'photourl') {
      const ua = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'Accept': 'image/avif,image/webp,image/png,image/jpeg,text/html;q=0.8,*/*;q=0.5' };
      let url = str(body.url, 2000), page = '';
      if (!/^https?:\/\//.test(url)) return json({ error: 'Paste a link that starts with https://' }, 400);
      let r = await fetch(url, { headers: ua, redirect: 'follow' });
      if (r.ok && (r.headers.get('content-type') || '').includes('html')) { page = url; const seen = await peek(url); if (!seen.photo) return json({ error: 'That page has no photo. Copy the image address itself.' }, 400); url = seen.photo; r = await fetch(url, { headers: ua, redirect: 'follow' }); }
      const type = r.headers.get('content-type') || '';
      if (!r.ok || !type.startsWith('image/')) return json({ error: 'That link is not an image' }, 400);
      const buf = new Uint8Array(await r.arrayBuffer()); if (buf.length > 8e6) return json({ error: 'That photo is too big (over 8 MB)' }, 400);
      let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return json({ data: btoa(bin), type, page });
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
      const products = data.filter((r: any) => r.kind === 'beauty').map((r: any) => clean({ id: r.id, name: r.data.name, brand: r.data.brand, type: r.data.type, size: r.data.size, price: r.data.price, fav: r.data.fav || undefined, finished: r.data.finished || undefined, wish: r.data.wish || undefined, qty: r.data.qty, opened: r.data.opened, rating: r.data.rating }));
      const wishes = data.filter((r: any) => r.kind === 'wishes' && /beauty/i.test(String(r.data.category || '')) && !r.data.archived && !['Bought', 'Dropped'].includes(r.data.status)).map((r: any) => clean({ id: r.id, name: r.data.name, brand: r.data.brand, shop: r.data.shop, price: r.data.price, url: r.data.url }));
      const shops = data.filter((r: any) => r.kind === 'bshops').map((r: any) => shopOut(r.data));
      return json({ products, wishes, shops });
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
      const { data, error } = await sb.from('records').select('id,kind,data').eq('user_id', uid).in('kind', ['recipes', 'ingredients', 'wplans', 'rreviews', 'shops']);
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
      const pantry = [...ing.values()].map((i: any) => clean({ name: i.name, stock: i.stock ? true : undefined, category: i.category, location: i.location, frozen: i.frozen, expires: i.expires, portions: i.portions }));
      // the shops she keeps in Kitchen › Shops: read the deals of every shop with readDeals on (plus Dirk, Aldi and AH)
      const shops = data.filter((r: any) => r.kind === 'shops').map((r: any) => shopOut(r.data));
      // the last plans, so a new week doesn't repeat the same recipes
      const recent = data.filter((r: any) => r.kind === 'wplans').map((r: any) => r.data).sort((a: any, b: any) => String(b.start).localeCompare(String(a.start))).slice(0, 3)
        .map((p: any) => ({ start: p.start, dinners: (p.dinners || []).map((d: any) => d.name) }));
      // what you like and don't like, from Kitchen › Settings
      const { data: pr } = await sb.from('prefs').select('data').eq('user_id', uid).maybeSingle();
      return json({ recipes, pantry, freezer: pantry.filter((i: any) => i.location === 'Vriezer' && i.stock), shops, recent, food: pr?.data?.food || {}, learned });
    }

    const TARGETS = ['recipes', 'wishes', 'closet', 'beauty', 'supplements', 'gear', 'fitgear', 'inventory', 'ideas', 'cideas', 'stips', 'inspo', 'gifts', 'keep', 'stays', 'trip'];
    const cleanDraft = (d: any) => { const o: Record<string, unknown> = {}; if (d && typeof d === 'object') for (const [k, v] of Object.entries(d).slice(0, 40)) { if (!/^[a-zA-Z]{1,24}$/.test(k)) continue; o[k] = typeof v === 'string' ? v.slice(0, 12000) : Array.isArray(v) ? v.slice(0, 60).map(x => typeof x === 'string' ? x.slice(0, 200) : x) : typeof v === 'number' || typeof v === 'boolean' ? v : undefined; } return clean(o); };
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
      return json({ items: data.map((r: any) => clean({ id: r.id, name: r.data.name, cat: r.data.cat, sub: r.data.sub, brand: r.data.brand, colors: r.data.colors, status: r.data.status, source: r.data.source, batch: r.data.batch, importKey: r.data.importKey })) });
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
      await send(uid, { title: 'Deals of the week are in', body: `${offers.length} deals at ${[...new Set(offers.map((o: any) => o.store))].slice(0, 4).join(', ')}${n ? `, and ${n} dinners that use them` : ''}.`, url: './#kitchen/deals', tag: 'deals' });
      return json({ ok: true, offers: offers.length, plan: planId });
    }
    return json({ error: 'unknown action' }, 400);
  } catch (e: any) {
    console.error(e);
    return json({ error: String(e?.message || e) }, 500);
  }
});
