/* Kitchen, Life, Home, Social, Money and Fitness: the life planner from Notion, rebuilt next to the closet.
   Every record is one row in the Supabase `records` table. `kind` names the list it belongs to (recipes,
   chores, sleep…) and `data` holds its fields, so a new list never needs a new table.
   index.html hands over sign-in, photos, sheets and toasts through LIFE.start(bridge). */
window.LIFE = (() => {
'use strict';
let C = null;
const L = { all: [], byId: {}, status: 'idle', missing: false, ui: {}, week: 0 };

/* ---------- small helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => iso(new Date());
const fromISO = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = fromISO(s); d.setDate(d.getDate() + n); return iso(d); };
const diffDays = (a, b) => Math.round((fromISO(b) - fromISO(a)) / 864e5);
const niceDate = s => s ? fromISO(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const shortDate = s => s ? fromISO(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
const dayName = s => fromISO(s).toLocaleDateString('en-GB', { weekday: 'short' });
// amounts follow the currency in Finance settings (display only, nothing is converted)
let moneyFmt = null, moneyCur = '';
const money = { format: n => { const c = (L.all.find(r => r.kind === 'fset')?.currency) || 'EUR'; if (c !== moneyCur) { moneyCur = c; moneyFmt = new Intl.NumberFormat('en-IE', { style: 'currency', currency: c }); } return masked() ? moneyFmt.format(0).replace(/[\d.,\s]+/, '•••') : moneyFmt.format(n); } };
// the eye in Finance: amounts hidden on Finance pages and on the Finance card on Today (remembered on this device)
const hideMoneyKey = 'hangtag:hidemoney';
const moneyHidden = () => { try { return localStorage.getItem(hideMoneyKey) === '1'; } catch { return false; } };
const masked = () => moneyHidden() && (L.inMoneyTile || String(C?.view?.() || '').startsWith('money/'));
const EYE = '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>', EYEOFF = '<path d="M3 3l18 18M10.6 6a9.8 9.8 0 0 1 1.4-.1c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.7 6.8C4 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>';
const eyeBtn = () => `<button class="iconbtn moneyeye" data-moneyeye aria-pressed="${moneyHidden()}" aria-label="${moneyHidden() ? 'Show amounts' : 'Hide amounts'}" title="${moneyHidden() ? 'Show amounts' : 'Hide amounts'}">${svg(moneyHidden() ? EYEOFF : EYE)}</button>`;
document.addEventListener('click', e => { if (!e.target.closest?.('[data-moneyeye]') || !C) return; try { localStorage.setItem(hideMoneyKey, moneyHidden() ? '0' : '1'); } catch {} C.render(); });
const eur = n => (n == null || n === '' || isNaN(n)) ? '' : money.format(n);
const num = v => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);
const norm = s => String(s || '').trim().toLowerCase();
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const relDay = s => { const d = diffDays(today(), s); return d === 0 ? 'today' : d === 1 ? 'tomorrow' : d === -1 ? 'yesterday' : d > 1 ? `in ${d} days` : `${-d} days ago`; };
const G = p => `<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</g>`;
const svg = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${G(p)}</svg>`;

/* ---------- icons ---------- */
const P = {
  tag: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.4 1.4 0 0 1 0 2l-6.7 6.7a1.4 1.4 0 0 1-2 0Z"/><circle cx="8" cy="8" r="1.4"/>',
  pot: '<path d="M4 10h16v4.5a5.5 5.5 0 0 1-5.5 5.5h-5A5.5 5.5 0 0 1 4 14.5Z"/><path d="M2.5 10h19M9.5 6.5c0-1.2 1-1.6 1-3M13.5 6.5c0-1.2 1-1.6 1-3"/>',
  house: '<path d="M4 11 12 4l8 7v8.5a1 1 0 0 1-1 1h-4.5V15h-5v5.5H5a1 1 0 0 1-1-1Z"/>',
  sparkle: '<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z"/><path d="M19 16.5v4M17 18.5h4"/>',
  dumbbell: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  book: '<path d="M5 17V6.5A2 2 0 0 1 7 4.5h11v15H7.5A2.5 2.5 0 0 1 5 17Zm0 0a2.5 2.5 0 0 1 2.5-2.5H18"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  cart: '<path d="M3 4.5h2.5l2 10.5h10l2-7.5H7"/><circle cx="9" cy="19" r="1.4"/><circle cx="16.5" cy="19" r="1.4"/>',
  jar: '<path d="M8 3.5h8M7 6.5h10M7.5 6.5 6.5 9v9.5a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V9l-1-2.5M6.5 12h11"/>',
  spoon: '<path d="M9 3.5c-2 0-3.5 2.2-3.5 4.8 0 2 1.2 3.5 2.6 3.9L7.5 20.5h3l-.6-8.3c1.4-.4 2.6-1.9 2.6-3.9C12.5 5.7 11 3.5 9 3.5ZM14.5 3.5V8a2 2 0 0 0 4 0V3.5M16.5 3.5V20.5"/>',
  drop: '<path d="M12 3.5s-6 6.5-6 10.5a6 6 0 0 0 12 0c0-4-6-10.5-6-10.5Z"/>',
  pill: '<path d="m10.5 4.5-6 6a4.2 4.2 0 0 0 6 6l6-6a4.2 4.2 0 0 0-6-6ZM7.5 7.5l6 6"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/>',
  pen: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  broom: '<path d="M15 3.5 11.5 10M7 10.5h9l1.5 10h-12ZM10 14.5v6M13.5 14.5v6"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19l7-7"/>',
  box: '<path d="M4 7.5 12 3.5l8 4v9l-8 4-8-4ZM4 7.5l8 4 8-4M12 11.5v9"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5L4 16.6 7.4 20l5.3-5.3a4 4 0 0 0 5-5.4l-2.6 2.6-2.4-.6-.6-2.4Z"/>',
  run: '<circle cx="14.5" cy="4.8" r="1.8"/><path d="M5.5 20.5 9 15.5l3 2v3.5M8 11.5l3-3 3.5 1.5 2 3h3M11 8.5l1.2 5.5"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="16" height="11" rx="2.5"/><path d="M15.5 13.5h2"/>',
  repeat: '<path d="M5 10a6 6 0 0 1 10.5-4L18 8.5M18 4.5v4h-4M19 14a6 6 0 0 1-10.5 4L6 15.5M6 19.5v-4h4"/>',
  trend: '<path d="M4 18 9.5 12l4 3.5L20 8"/><path d="M15 8h5v5"/>',
  doc: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 6.5 20V4a.5.5 0 0 1 .5-.5Z"/><path d="M13.5 3.5V8h4.5M9.5 12.5h5M9.5 16h5"/>',
  card: '<rect x="3.5" y="6" width="17" height="12" rx="2.5"/><path d="M3.5 10h17M7 14.5h3"/>',
  coins: '<ellipse cx="9" cy="7" rx="5" ry="2.5"/><path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7M10 16.5c.9.6 2.4 1 4 1 2.8 0 5-1.1 5-2.5v-4c0-1.4-2.2-2.5-5-2.5"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 10a4.5 4.5 0 0 1 7 0L13 12.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plane: '<path d="M10.5 4.5c0-1 .7-2 1.5-2s1.5 1 1.5 2V9l7 4v2l-7-2v4.5l2 1.5v1.5L12 20l-3.5.5V19l2-1.5V13l-7 2v-2l7-4Z"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  phone: '<rect x="6.5" y="3" width="11" height="18" rx="2.5"/><path d="M10.5 18h3"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  handshake: '<path d="m3 11 4-4 3 1 3-2 3 1 5 4M3 11l5 5 2-1 2 2 2-1 2 1 4-5M10 8l-3 4 2 1 3-3"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
  gift: '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5V20h14v-7.5M12 8.5V20M12 8.5C10.5 5 7 4.5 7 6.8c0 1.7 5 1.7 5 1.7Zm0 0c1.5-3.5 5-4 5-1.7 0 1.7-5 1.7-5 1.7Z"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"/>',
  heart: '<path d="M12 19.5s-7.5-4.6-7.5-10.2A4.1 4.1 0 0 1 12 7a4.1 4.1 0 0 1 7.5 2.3c0 5.6-7.5 10.2-7.5 10.2Z"/>',
  inbox: '<path d="M4 13.5 6.5 5h11l2.5 8.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/><path d="M4 13.5h4.5l1 2h5l1-2H20"/>',
  camera: '<path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10H4Z"/><circle cx="12" cy="13.3" r="3.3"/>',
  flask: '<path d="M9.5 3.5h5M10.5 3.5v5.2L5.6 17a2 2 0 0 0 1.7 3h9.4a2 2 0 0 0 1.7-3l-4.9-8.3V3.5"/>',
  star: '<path d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6L12 16.6l-5 2.7.9-5.6-4-4 5.6-.8Z"/>'
};

/* ---------- what each list holds ---------- */
const F = (k, label, type = 'text', o = {}) => ({ k, label, type, ...o });
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const STORES = ['Dirk', 'Aldi', 'Albert Heijn'];
const UNITS = ['stuks', 'gram', 'ml', 'portie'];
const CLEAN_TRIGGERS = ['Na het eten', 'Stress', 'Verveling', 'Sociaal', 'Ochtend', 'Anders'];
const CLEAN_HELPS = ['Snack of kauwgom', 'Thee', 'Wandeling', 'Ademhaling', 'Iemand appen', 'Journalen', 'Content bedenken', 'Douchen', 'Iets anders'];
// what kind of dish a recipe is, per category: the suggestions in the editor and the second filter row
const DISH_TYPES = {
  Baking: ['Koekjes', 'Taart', 'Gebak', 'Brood', 'Cake', 'Muffins & cupcakes', 'Brownies & repen', 'Broodjes & bollen', 'Scones', 'Hartige taart & quiche', 'Pie & crumble'],
  Dessert: ['IJs', 'Pudding & mousse', 'Cheesecake', 'Tiramisu & trifle', 'Fruitdessert', 'Pannenkoeken & wafels', 'Chocolade'],
  Breakfast: ['Brood & toast', 'Eieren', 'Pap & oats', 'Yoghurt & granola', 'Pannenkoeken', 'Smoothie', 'Warm & hartig'],
  Lunch: ['Broodje & wrap', 'Tosti', 'Salade', 'Soep', 'Bowl', 'Restjes'],
  Dinner: ['Pasta', 'Rijst', 'Noedels & wok', 'Curry', 'Stoof & stamppot', 'Ovenschotel', 'Soep', 'Salade', 'Vis', 'Vlees', 'Vegetarisch', 'Burger & wrap', 'Pizza', 'Bowl'],
  Snack: ['Hartig', 'Zoet', 'Dip', 'Fruit & groente', 'Energieballetjes', 'Noten'],
  'Side Dish': ['Groente', 'Aardappel', 'Rijst & granen', 'Salade', 'Brood'],
  Appetizer: ['Borrelhapjes', 'Dips', 'Bladerdeeg', 'Tapas'],
  Soup: ['Heldere soep', 'Gebonden soep', 'Maaltijdsoep', 'Koude soep'],
  Drink: ['Smoothie', 'Thee & koffie', 'Limonade', 'Mocktail', 'Cocktail', 'Warme drank'],
  'Sauce & Condiment': ['Saus', 'Dressing', 'Pesto', 'Dip', 'Kruidenmix', 'Sambal & chili', 'Jam']
};
const CUISINES = ['Asian', 'Italian & Mediterranean', 'Surinamese & Indonesian', 'Dutch comfort', 'New to me', 'Other'];
const NUTRI = ['Lots of veg', 'Protein-rich', 'Filling', 'Light'];
const GOOD_LABELS = [...NUTRI, 'Meal prep', 'Freezes well', 'Office lunch', 'Microwave'];
// a recipe you can make now: every ingredient in stock or in the freezer
const canMakeNow = r => { const ids = [].concat(r.ingredients || []); return ids.length > 0 && ids.every(id => { const i = L.byId[id]; return i && (i.stock || (cntOf(i) || 0) > 0); }); };
const FILL_LEVELS = ['Full', 'Three quarters', 'Half', 'Almost empty'];
const SHOP_TYPES = ['Supermarket', 'Toko', 'Butcher', 'Fishmonger', 'Greengrocer', 'Market', 'Household', 'Drugstore', 'Perfumery', 'Brand store', 'Webshop', 'Other'];
// the shops you keep in Kitchen › Shops and Beauty › Deals; the weekly tasks read the deals of every shop that has them on
const shopNames = kind => recs(kind).map(r => r.name).filter(Boolean);
const kitchenStores = () => { const own = recs('shops').filter(r => r.name && r.type !== 'Butcher' && r.type !== 'Fishmonger').map(r => r.name); return [...new Set([...STORES, ...own])]; };
const myButcher = () => { const b = recs('shops').filter(r => r.type === 'Butcher'); return b.find(r => r.mine) || b[0] || null; };
const FREEZE_DAYS = 90;
// your food settings (Kitchen › Deals): shopping day this week and the finance envelope for groceries
const food = () => (C?.prefs?.() || {}).food || {};
const MARKET_DAYS = ['Wed', 'Sat'];
const isProduce = x => /groente|fruit|vegetable|veg\b|kruiden vers|sla\b|tomaat|komkommer|paprika|ui\b|uien|wortel|appel|banaan|peer|citroen|limoen|gember|knoflook|courgette|broccoli|spinazie|paksoi/i.test(`${x.category || ''} ${x.name || ''}`);
const groceryEnv = () => { const cats = recs('fcats'), id = food().groceryCat; return (id && cats.find(c => c.id === id)) || cats.find(c => /boodschap|grocer|supermarkt|eten/i.test(c.name || '')) || null; };
const dealWeekStart = () => { const d = fromISO(today()), back = (d.getDay() + 4) % 7; return addDays(today(), -back); }; // the deals week runs Wednesday to Tuesday
function groceryBudget() {
  const c = groceryEnv(); if (!c) return null;
  const w = fWindow(), days = Math.max(1, diffDays(w.start, w.end) + 1), per = num(c.budget) || 0, ws = dealWeekStart();
  const spentWeek = fSum(recs('ftx').filter(x => x.category === c.id && !x.bill && !x.transfer && x.date >= ws && x.date <= today()));
  return { cat: c, week: Math.round(per / days * 7 * 100) / 100, spentWeek, spentPeriod: fCatSpent(c.id, w), period: per };
}
const isMeatFish = o => /vlees|vis|meat|fish|kip|gehakt|biefstuk|varken|rund|zalm|kabeljauw|garnal|worst|spek|filet/i.test(`${o.category || ''} ${o.name || ''}`) && !/vega|plant|vegan/i.test(o.name || '');
const inFreezer = () => recs('ingredients').filter(i => i.location === 'Vriezer' && i.stock !== false && (i.stock || i.frozen));
const freezerAge = i => i.frozen ? Math.round((fromISO(today()) - fromISO(i.frozen)) / 864e5) : null;
const HELPS = ['Stop smoking'];
const FEELS = ['Comfort', 'Light', 'Fresh', 'Hearty', 'Quick', 'Savoury', 'Sweet', 'Spicy'];
const TEXTURES = ['Crispy', 'Creamy', 'Crunchy', 'Soft', 'Chewy', 'Saucy', 'Dry', 'Mushy'];
const QUIT = 'Stop smoking', helpsQuit = r => [].concat(r.helps || []).includes(QUIT);
// pantry and kitchen gear speak Dutch; older English categories are translated by Kitchen › Settings › Tidy up
// the parts of a hotel review, each 1 to 5 stars; the card shows their average
const STAY_SCORES = [['clean', 'Cleanliness'], ['location', 'Location'], ['comfort', 'Comfort and bed'], ['facilities', 'Facilities'], ['staff', 'Staff and service'], ['value', 'Value for money'], ['breakfast', 'Breakfast'], ['wifi', 'Wifi'], ['quiet', 'Quiet']];
const stayScore = r => { const v = STAY_SCORES.map(([k]) => Number(r[k]) || 0).filter(Boolean); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : Number(r.rating) || 0; };
const CAT_NL = {
  ingredients: { 'Fruits & Veg': 'Groente & fruit', 'Fish & Meat': 'Vlees & vis', 'Eggs & Dairy': 'Zuivel & eieren', 'Grains & Legumes': 'Granen & peulvruchten', 'Bread & Bakery': 'Brood & bakkerij', 'Nuts & Seeds': 'Noten & zaden', 'Herbs & Spices': 'Kruiden & specerijen', 'Sauces & Oils': 'Sauzen & olie', 'Tins & Jars': 'Blik & pot', 'Frozen': 'Diepvries', 'Leftovers': 'Restjes', 'Drinks': 'Dranken', 'Snack': 'Snacks', 'Confections': 'Zoetigheid', 'Supplements': 'Supplementen', 'Other': 'Overig' },
  gear: { 'Kitchen Appliances': 'Keukenapparaten', 'Cookware & Bakeware': 'Pannen & bakvormen', 'Prep Tools & Essentials': 'Voorbereiden', 'Cooking Tools & Utensils': 'Kookgerei', 'Organizing Essentials': 'Opbergen', 'Cleaning Supplies': 'Schoonmaken' }
};
const catNL = (kind, v) => (CAT_NL[kind] || {})[v] || v;
// a kind of product inside a pantry category (Kip under Vlees & vis)
const ING_TYPES = {
  'Vlees & vis': ['Kip', 'Rund', 'Gehakt', 'Varken', 'Kalkoen', 'Lam', 'Worst', 'Spek', 'Vleeswaren', 'Zalm', 'Tonijn', 'Witvis', 'Garnalen', 'Vis'],
  'Groente & fruit': ['Uien & knoflook', 'Tomaten', 'Paprika', 'Bladgroente', 'Kool & broccoli', 'Wortels', 'Aardappelen', 'Courgette & pompoen', 'Paddenstoelen', 'Verse kruiden', 'Appels & peren', 'Bessen', 'Citrus', 'Bananen', 'Tropisch fruit'],
  'Zuivel & eieren': ['Melk', 'Yoghurt & kwark', 'Kaas', 'Boter', 'Room', 'Eieren', 'Plantaardig'],
  'Granen & peulvruchten': ['Rijst', 'Pasta', 'Noedels', 'Havermout', 'Meel', 'Couscous & quinoa', 'Bonen', 'Linzen & kikkererwten'],
  'Brood & bakkerij': ['Brood', 'Wraps', 'Crackers', 'Gebak'],
  'Noten & zaden': ['Noten', 'Zaden', 'Notenpasta'],
  'Kruiden & specerijen': ['Gedroogde kruiden', 'Specerijen', 'Zout & peper', 'Bouillon'],
  'Sauzen & olie': ['Olie', 'Azijn', 'Sojasaus', 'Pastasaus', 'Sauzen', 'Dressing'],
  'Blik & pot': ['Tomaat in blik', 'Bonen in blik', 'Vis in blik', 'Kokosmelk', 'Soep', 'Groente in pot'],
  'Dranken': ['Koffie', 'Thee', 'Sap', 'Frisdrank', 'Water'],
  'Snacks': ['Chips', 'Koek', 'Repen', 'Noten'],
  'Zoetigheid': ['Chocolade', 'Snoep', 'Suiker', 'Honing & siroop', 'Bakken']
};
for (const [en, nl] of Object.entries(CAT_NL.ingredients)) if (ING_TYPES[nl]) ING_TYPES[en] = ING_TYPES[nl];
// the kind guessed from a name, so "Kipdrumsticks" lands under Kip without typing it
const ING_GUESS = [[/kip|chicken|drumstick|vleugel|wings?\b|poulet/, 'Kip'], [/kalkoen|turkey/, 'Kalkoen'], [/gehakt|mince/, 'Gehakt'], [/rund|biefstuk|steak|beef|riblap|sukade|entrecote/, 'Rund'],
  [/varken|karbonade|pork|speklap|procureur|schnitzel|hamlap/, 'Varken'], [/\blam\b|lams/, 'Lam'], [/worst|chorizo|salami/, 'Worst'], [/spek|bacon|ontbijtspek/, 'Spek'], [/\bham\b|kipfilet beleg|rookvlees|fricandeau/, 'Vleeswaren'],
  [/zalm|salmon/, 'Zalm'], [/tonijn|tuna/, 'Tonijn'], [/kabeljauw|koolvis|pangasius|tilapia|schol|witvis|heek/, 'Witvis'], [/garnal|gamba|shrimp|prawn/, 'Garnalen'], [/vis\b|makreel|haring|forel/, 'Vis'],
  [/\bui\b|uien|sjalot|knoflook|garlic|onion/, 'Uien & knoflook'], [/tomaat|tomaten|tomato/, 'Tomaten'], [/paprika|pepper/, 'Paprika'], [/sla\b|spinazie|rucola|andijvie|boerenkool|veldsla/, 'Bladgroente'],
  [/broccoli|bloemkool|kool\b|spruit/, 'Kool & broccoli'], [/wortel|carrot/, 'Wortels'], [/aardappel|krieler|potato/, 'Aardappelen'], [/courgette|pompoen|zucchini/, 'Courgette & pompoen'], [/champignon|paddenstoel|mushroom/, 'Paddenstoelen'],
  [/peterselie|koriander|basilicum|bieslook|munt\b|dille/, 'Verse kruiden'], [/appel|peer\b|peren/, 'Appels & peren'], [/aardbei|framboos|frambozen|blauwe bes|bosbes|bessen|berr/, 'Bessen'], [/citroen|limoen|sinaasappel|mandarijn|lemon|lime/, 'Citrus'],
  [/banaan|bananen/, 'Bananen'], [/mango|ananas|kiwi|passievrucht/, 'Tropisch fruit'],
  [/melk|milk/, 'Melk'], [/yoghurt|kwark|skyr/, 'Yoghurt & kwark'], [/kaas|cheese|mozzarella|parmezaan|feta|halloumi/, 'Kaas'], [/boter|butter/, 'Boter'], [/room|cream/, 'Room'], [/\beieren\b|\bei\b|\beggs?\b/, 'Eieren'],
  [/rijst|rice/, 'Rijst'], [/pasta|spaghetti|penne|macaroni|fusilli|tagliatelle|lasagne/, 'Pasta'], [/noedel|noodle|mie\b|udon|ramen/, 'Noedels'], [/havermout|oats|granola/, 'Havermout'], [/bloem|meel|flour/, 'Meel'],
  [/couscous|quinoa|bulgur/, 'Couscous & quinoa'], [/linzen|kikkererwt|lentil|chickpea/, 'Linzen & kikkererwten'], [/bonen|beans/, 'Bonen'],
  [/brood|bread|bolletje|baguette/, 'Brood'], [/wrap|tortilla/, 'Wraps'], [/cracker|beschuit|rijstwafel/, 'Crackers'],
  [/olie|oil/, 'Olie'], [/azijn|vinegar/, 'Azijn'], [/soja|ketjap/, 'Sojasaus'], [/bouillon|stock/, 'Bouillon'], [/koffie|coffee/, 'Koffie'], [/thee\b|tea\b/, 'Thee'], [/chocola/, 'Chocolade']];
const ingGuess = name => { const n = norm(name || ''); for (const [re, t] of ING_GUESS) if (re.test(n)) return t; return ''; };
const ingType = r => r.type || ingGuess(r.name) || '';
const ROOMS = ['Entree', 'Woonkamer', 'Keuken', 'Slaapkamer', 'Werkkamer', 'Badkamer', 'Toilet', 'Wasruimte', 'Balkon', 'Schoonmaak', 'Overig'];
const PRIO = ['Must-have', 'Binnen 3 maanden', 'Handig', 'Kan later'];
// the home inventory is a move list in Dutch: an idea, then options to choose from, then ordered and bought
const INV_STATUS = ['Idee', 'Kiezen', 'Besteld', 'Gekocht', 'Teruggestuurd', 'Weg'];
const INV_WANT = ['Idee', 'Kiezen', 'Besteld'];
const INV_PRIO = ['Eerste week', 'Binnen 3 maanden', 'Later'];
const INV_CATS = ['Meubels', 'Keukenspullen', 'Apparaten', 'Decoratie', 'Textiel', 'Opbergen', 'Elektronica', 'Gereedschap', 'Buiten', 'Schoonmaak', 'Overig'];
const MOVE_TYPES = ['Borg en huur', 'Verhuizen', 'Klussen', 'Aansluitingen', 'Overig'];
const INV_OLD = { status: { Wishlist: 'Idee', Ordered: 'Besteld', Have: 'Gekocht', Returned: 'Teruggestuurd', Gone: 'Weg' }, priority: { 'Must-have': 'Eerste week', Handig: 'Later', 'Kan later': 'Later' }, category: { Furniture: 'Meubels', Kitchenware: 'Keukenspullen', Appliances: 'Apparaten', 'Home Decor': 'Decoratie', Linens: 'Textiel', Storage: 'Opbergen', Electronics: 'Elektronica', Tools: 'Gereedschap', 'Outdoor Equipment': 'Buiten', Miscellaneous: 'Overig' } };
const invStatus = r => INV_OLD.status[r.status] || r.status || 'Gekocht';
const FREQ = { 'Daily': 1, 'Every 2 days': 2, 'Twice a week': 3, 'Weekly': 7, 'Every 2 weeks': 14, 'Monthly': 30, 'Every 3 months': 91, 'Every 6 months': 182, 'Yearly': 365 };
const mins = n => n ? (n >= 60 ? `${Math.floor(n / 60)} h${n % 60 ? ' ' + (n % 60) + ' min' : ''}` : `${n} min`) : '';
const totalTime = r => (num(r.prep) || 0) + (num(r.cook) || 0);
const stars = n => n ? '★'.repeat(n) : '';
const relName = id => { const r = L.byId[id]; return r ? titleOf(r) : ''; };
const relNames = ids => [].concat(ids || []).map(relName).filter(Boolean);

const SOCIAL_PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Pinterest'];
const SOCIAL_STAGES = ['Idea', 'Planned', 'Scripting', 'Filming', 'Editing', 'Scheduled', 'Posted'];
// the steps of making a post, each with its own date; a step is done once the stage has moved past it
const POST_STEPS = [['scriptOn', 'Write the script', 'Filming'], ['filmOn', 'Film', 'Editing'], ['editOn', 'Edit', 'Scheduled'], ['date', 'Post', 'Posted']];
const stepDone = (r, upto) => SOCIAL_STAGES.indexOf(r.stage) >= SOCIAL_STAGES.indexOf(upto);
const TIP_CATS = ['Poses', 'Outfits & styling', 'Filming', 'Lighting', 'Storytelling & scripts', 'Hooks & captions', 'Editing', 'Software & apps', 'Thumbnails & covers', 'Branding', 'Growth & algorithm', 'Trends', 'Gear', 'Collabs & money', 'Mindset & planning', 'Other'];
// which tips fit the stage a post is in
const STAGE_TIPS = { Planned: ['Storytelling & scripts', 'Mindset & planning', 'Trends'], Scripting: ['Storytelling & scripts', 'Hooks & captions'], Filming: ['Poses', 'Outfits & styling', 'Filming', 'Lighting', 'Gear'], Editing: ['Editing', 'Software & apps', 'Thumbnails & covers'], Scheduled: ['Hooks & captions', 'Growth & algorithm', 'Thumbnails & covers'] };
const tipSteps = r => String(r.steps || '').split('\n').map(x => x.replace(/^\s*(\d+[.)]|[-*•])\s*/, '').trim()).filter(Boolean);
const SOCIAL_FORMATS = ['Short Video', 'Long-form Video', 'Carousel', 'Image Post', 'Story', 'Live', 'BTS Video'];
const SOCIAL_STYLES = ['Educational', 'Entertaining', 'Inspirational', 'Relatable', 'Storytelling', 'Behind-the-Scenes', 'Informational'];
const SOCIAL_FUNNEL = ['Awareness', 'Consideration', 'Conversion', 'Loyalty/Advocacy'];
const NIGHTS = ['Acid night', 'Retinoid night', 'Recovery night'];
// the order of a skincare routine; products follow it unless you drag them into your own order
const REVIEW_AFTER = ['First use', '1 week', '4 weeks', '8 weeks', 'Later'];
const SKIN_LEVELS = ['None', 'A little', 'Some', 'A lot'];
const SKIN_SCORES = [['breakouts', 'Breakouts'], ['redness', 'Redness'], ['dryness', 'Dryness'], ['oiliness', 'Oiliness']];
const REVIEW_KEYS = ['hydration', 'calm', 'clear', 'glow', 'smooth', 'feel', 'scent', 'absorbs', 'makeup', 'value'];
const reviewAvg = r => { const v = REVIEW_KEYS.map(k => num(r[k])).filter(Boolean); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
const SKIN_STEPS = ['Makeup remover', 'Cleanser', 'Exfoliant', 'Toner', 'Essence', 'Treatment', 'Serum', 'Eye cream', 'Spot treatment', 'Moisturiser', 'Face oil', 'Sunscreen', 'Mask', 'Lip care', 'Other'];
// tasks and projects (Social), habits, routines, gifts and documents (Life)
const TASK_STATUS = ['Not started', 'In progress', 'Completed'];
const TASK_CATS = ['Finances', 'Fitness', 'Growth', 'Household', 'Nutrition', 'Planning', 'Productivity', 'Self-Care'];
const ROUTINES = ['Morning', 'Evening', 'Weekly', 'Monthly'];
const GIFT_STATUS = ['Idea', 'To buy', 'Ordered', 'Received', 'Wrapped', 'Given'];
const taskDone = r => r.status === 'Completed';
const projTasks = p => recs('tasks').filter(t => [].concat(t.project || []).includes(p.id));
// habits and routines keep the days you ticked them as a list of dates on the record itself
const daysSet = r => new Set([].concat(r.days || []));
// the weekdays a routine step or habit is planned on (none picked = every day)
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const wdOf = (d = today()) => WEEKDAYS[(fromISO(d).getDay() + 6) % 7];
const onDay = (r, d = today()) => !(r.onDays || []).length || r.onDays.includes(wdOf(d));
const daysLabel = r => { const ds = WEEKDAYS.filter(x => (r.onDays || []).includes(x)); return !ds.length ? '' : ds.length === 7 ? 'every day' : ds.join(', '); };
const perWeek = r => (r.onDays || []).length || Math.min(7, num(r.per) || 7);
const weekDays = () => { const w = weekStart(0); return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(w, i)); };
const weekDone = r => { const s = daysSet(r); return weekDays().filter(d => s.has(d)).length; };
function streak(r) {
  const s = daysSet(r), per = perWeek(r);
  if (per >= 7) { let d = s.has(today()) ? today() : addDays(today(), -1), n = 0; while (s.has(d) && n < 3650) { n++; d = addDays(d, -1); } return n ? n + '-day streak' : ''; }
  // a week counts when it reaches the target; this week joins once it does
  const hit = w => [0, 1, 2, 3, 4, 5, 6].filter(i => s.has(addDays(w, i))).length >= per;
  let w = weekStart(0), n = 0;
  if (!hit(w)) w = addDays(w, -7);
  while (hit(w) && n < 520) { n++; w = addDays(w, -7); }
  return n ? n + '-week streak' : '';
}
// a morning or evening step counts per day, a weekly one per week and a monthly one per month
const routinePeriod = r => r.routine === 'Weekly' ? weekDays() : r.routine === 'Monthly' ? null : [today()];
function routineDone(r) {
  const s = [...daysSet(r)], p = routinePeriod(r);
  return p ? s.some(d => p.includes(d)) : s.some(d => d.slice(0, 7) === today().slice(0, 7));
}
function toggleDay(r, d = today()) {
  const s = daysSet(r);
  if (r.kind === 'routines' && d === today() && routineDone(r)) { const p = routinePeriod(r); for (const x of [...s]) if (p ? p.includes(x) : x.slice(0, 7) === d.slice(0, 7)) s.delete(x); }
  else s.has(d) ? s.delete(d) : s.add(d);
  return save(r, { days: [...s].sort().slice(-500) });
}
const routineNow = () => { const want = new Date().getHours() >= 15 ? 'Evening' : 'Morning'; return { label: want, list: recs('routines').filter(r => r.routine === want && onDay(r)).sort((a, b) => (a.created || 0) - (b.created || 0) || norm(a.name).localeCompare(norm(b.name))) }; };
// growth: the life areas from your Notion dashboard
const INS_TYPES = ['Zorgverzekering', 'Aansprakelijkheid', 'Inboedel', 'Opstal', 'Reis', 'Rechtsbijstand', 'Fiets', 'Auto', 'Telefoon', 'Uitvaart', 'Overlijdensrisico', 'Other'];
const ORDER_STATUS = ['Ordered', 'Shipped', 'Delivered', 'Returning', 'Returned', 'Kept'];
const DISC_TYPES = ['Strengths', 'Weaknesses', 'Values', 'Beliefs', 'Dreams', 'Personality', 'Relationships', 'Other'];
const AREAS = ['Health & Nutrition', 'Fitness', 'Mindset', 'Growth', 'Career', 'Finances', 'Home', 'Organization', 'Relationship', 'Family', 'Social', 'Creativity', 'Leisure', 'Lifestyle', 'Spirituality', 'Digital Life'];
const goalTasks = g => recs('tasks').filter(t => [].concat(t.goal || []).includes(g.id));
const goalPct = g => { if (g.status === 'Completed') return 100; const ts = goalTasks(g); return ts.length ? Math.round(100 * ts.filter(t => t.status === 'Completed').length / ts.length) : (num(g.progress) || 0); };
// fitness extra: goals, video library and the week plan
const VW_TYPES = ['Pilates', 'Yoga', 'Strength', 'HIIT', 'Cardio', 'Dance', 'Barre', 'Stretching', 'Walk'];
const fitPct = g => { const a = num(g.start) ?? 0, b = num(g.target), c = num(g.current) ?? a; if (g.done) return 100; if (b == null || b === a) return 0; return Math.max(0, Math.min(100, Math.round(100 * (c - a) / (b - a)))); };
const vwCount = v => recs('workouts').filter(w => w.video === v.id && w.done).length;
const todayVW = () => { const s = recs('fsched')[0]; const k = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]; return s?.[k] ? L.byId[s[k]] : null; };
function doVideo(v) {
  if (!v) return;
  create('workouts', { name: v.name, date: today(), minutes: num(v.minutes) || '', type: VW_TYPES.includes(v.type) && ['Pilates', 'Yoga', 'Strength', 'HIIT', 'Cardio'].includes(v.type) ? v.type : 'Other', video: v.id, done: true })
    .then(() => C.toast(`${v.name} logged for today`)).catch(() => {});
  if (v.url) window.open(v.url, '_blank', 'noopener');
}
// wishlists: one place for every wish in the app
const WISH_PRIO = ['Must have', 'Want', 'Someday'];
// older priorities (High/Medium/Low, and the home inventory's own list) read as one of the three
const wishPrio = v => ({ High: 'Must have', 'Must have': 'Must have', 'Must-have': 'Must have', 'Eerste week': 'Must have', Later: 'Someday', Medium: 'Want', Want: 'Want', 'Binnen 3 maanden': 'Want', Handig: 'Want', Low: 'Someday', Someday: 'Someday', 'Kan later': 'Someday' })[v] || '';
const WISH_CATS = ['Tech', 'Books', 'Home', 'Kitchen', 'Beauty', 'Clothing', 'Fitness', 'Hobby', 'Travel', 'Other'];
const daysSince = d => d ? Math.max(0, diffDays(String(d).slice(0, 10), today())) : null;
// tile sets for savings challenges
const GRID_PRESETS = { '100 envelopes (€1 to €100)': () => Array.from({ length: 100 }, (_, i) => i + 1), '52 weeks (€1 to €52)': () => Array.from({ length: 52 }, (_, i) => i + 1), '€5 a day for 30 days': () => Array(30).fill(5), '€10 to €100 (20 tiles)': () => Array.from({ length: 20 }, (_, i) => 10 + Math.round(i * 90 / 19 / 5) * 5) };
const WEEK = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
const KINDS = {
  /* kitchen */
  recipes: {
    one: 'recipe', many: 'Recipes', display: 'cards', photo: 'photo', facet: 'category', facet2: 'dish',
    fields: [F('name', 'Name'), F('photo', 'Photo', 'photo'), F('summary', 'Short description', 'long', { rows: 2 }),
      F('category', 'Category', 'select', { options: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Side Dish', 'Appetizer', 'Soup', 'Dessert', 'Baking', 'Drink', 'Sauce & Condiment'] }),
      F('dish', 'Soort', 'select', { options: [...new Set(Object.values(DISH_TYPES).flat())], dep: 'category', depOpts: DISH_TYPES }),
      F('rating', 'Rating', 'rating'), F('fav', 'Favourite', 'check', { half: 1 }), F('totry', 'Still to try', 'check', { half: 1 }),
      F('cuisine', 'Cuisine', 'select', { options: CUISINES, half: 1 }), F('good', 'Good to know', 'multi', { options: GOOD_LABELS }),
      F('vegG', 'Vegetables per portion (g)', 'num', { half: 1 }),
      F('prep', 'Prep time', 'num', { unit: 'min', half: 1 }), F('cook', 'Cook time', 'num', { unit: 'min', half: 1 }),
      F('servings', 'Servings', 'num', { half: 1 }), F('protein', 'Protein', 'text', { half: 1 }),
      F('nkcal', 'Own calories per serving', 'num', { half: 1 }), F('nprot', 'Own protein per serving', 'num', { unit: 'g', half: 1 }),
      F('ncarb', 'Own carbs per serving', 'num', { unit: 'g', half: 1 }), F('nfat', 'Own fat per serving', 'num', { unit: 'g', half: 1 }),
      F('link', 'Recipe link', 'url'), F('ilines', 'Ingredients and amounts', 'ilines'), F('steps', 'Steps', 'steplist'),
      F('ingredients', 'Linked to your pantry', 'rel', { to: 'ingredients', multi: 1 }), F('helps', 'Helps with', 'multi', { options: HELPS }), F('feel', 'Feels like', 'multi', { options: FEELS }),
      F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['-rating', 'Best rated'], ['-created', 'Newest'], ['time', 'Quickest']],
    filters: [['all', 'All'], ['fav', 'Favourites'], ['try', 'Still to try'], ['quick', '30 min or less'], ['prep', 'Meal prep'], ['freeze', 'Freezes well'], ['office', 'Office lunch'], ['now', 'Can make now']],
    filter: (r, f) => f === 'fav' ? !!r.fav : f === 'try' ? !!r.totry : f === 'quick' ? totalTime(r) > 0 && totalTime(r) <= 30 : f === 'prep' ? [].concat(r.good || []).includes('Meal prep') : f === 'freeze' ? [].concat(r.good || []).includes('Freezes well') : f === 'office' ? [].concat(r.good || []).includes('Office lunch') || r.category === 'Lunch' : f === 'now' ? canMakeNow(r) : true,
    sub: r => [r.cuisine, r.dish || r.category, mins(totalTime(r)), [].concat(r.good || []).filter(g => NUTRI.includes(g)).join(', '), stars(r.rating)].filter(Boolean).join(' · ')
  },
  ingredients: {
    one: 'ingredient', many: 'Pantry', facet: 'category',
    fields: [F('name', 'Name'), F('category', 'Category', 'select', { options: Object.values(CAT_NL.ingredients) }),
      F('type', 'Soort', 'select', { options: [...new Set(Object.values(ING_TYPES).flat())], dep: 'category', depOpts: ING_TYPES }),
      F('location', 'Kept in', 'select', { options: ['Koelkast', 'Vriezer', 'Voorraadkast', 'Keukenkast', 'Fruitmand', 'Broodtrommel', 'Kelder / Berging', 'Overig'] }),
      F('stock', 'In stock', 'check', { half: 1 }), F('low', 'Running low', 'check', { half: 1 }), F('list', 'On grocery list', 'check', { half: 1 }),
      F('expires', 'Best before', 'date', { half: 1 }), F('frozen', 'Frozen on', 'date', { half: 1 }), F('portions', 'Portions', 'num', { half: 1 }), F('shop', 'Buy at', 'select', { options: STORES, more: () => shopNames('shops'), half: 1 }), F('amount', 'How much is left', 'num', { half: 1 }), F('unit', 'Counted in', 'select', { options: UNITS, half: 1 }), F('min', 'Minimum to keep', 'num', { half: 1 }), F('staple', 'Basic: always keep in stock', 'check', { half: 1 }), F('helps', 'Helps with', 'multi', { options: HELPS }),
      F('qty', 'Amount', 'text', { half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['category', 'Category'], ['location', 'Where it is']],
    filters: [['all', 'All'], ['in', 'In stock'], ['low', 'Running low'], ['soon', 'Use soon'], ['out', 'Out of stock'], ['basic', 'Basics']],
    filter: (r, f) => f === 'basic' ? !!r.staple : f === 'in' ? !!r.stock : f === 'out' ? !r.stock : f === 'low' ? !!r.low : f === 'soon' ? useSoon(r) : true,
    sub: r => [r.category, r.location, r.frozen ? 'frozen ' + shortDate(r.frozen) : '', num(r.portions) ? plural(num(r.portions), 'portion') : '', r.low ? 'running low' : '', r.expires ? (r.expires < today() ? 'past its date' : 'best before ' + shortDate(r.expires)) : '', r.list ? 'on grocery list' : ''].filter(Boolean).join(' · '),
    quick: r => ({ on: !!r.stock, label: 'In stock', act: () => save(r, { stock: !r.stock, ...(r.staple && r.stock ? { list: true } : {}) }) })
  },
  offers: {
    one: 'deal', many: 'Deals', facet: 'store', photo: 'photo', display: 'cards',
    fields: [F('name', 'Product'), F('store', 'Shop', 'select', { options: STORES, more: () => shopNames('shops'), half: 1 }), F('deal', 'Deal', 'text', { half: 1 }),
      F('price', 'Deal price', 'money', { half: 1 }), F('was', 'Normal price', 'money', { half: 1 }), F('unit', 'Amount', 'text', { half: 1 }), F('category', 'Category', 'text', { half: 1 }),
      F('from', 'From', 'date', { half: 1 }), F('until', 'Until', 'date', { half: 1 }), F('url', 'Link', 'url'), F('photo', 'Photo', 'photo')],
    sorts: [['store', 'Shop'], ['name', 'A to Z'], ['price', 'Cheapest']],
    sub: r => [r.store, r.deal, r.unit, num(r.price) ? eur(num(r.price)) + (num(r.was) ? ` (was ${eur(num(r.was))})` : '') : '', r.until ? 'until ' + shortDate(r.until) : ''].filter(Boolean).join(' · ')
  },
  shops: {
    one: 'shop', many: 'Shops', facet: 'type',
    fields: [F('name', 'Name'), F('type', 'Type', 'select', { options: SHOP_TYPES, half: 1 }), F('address', 'Address', 'text', { half: 1 }),
      F('website', 'Website', 'url'), F('dealsUrl', 'Deals or folder page', 'url'),
      F('readDeals', 'Read the deals every week', 'check', { half: 1 }), F('mine', 'My regular shop', 'check', { half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['type', 'Type']],
    sub: r => [r.type, r.address, r.readDeals ? 'deals read weekly' : '', r.mine ? 'my regular' : ''].filter(Boolean).join(' · ')
  },
  bshops: {
    one: 'shop', many: 'Beauty shops', facet: 'type',
    fields: [F('name', 'Name'), F('type', 'Type', 'select', { options: SHOP_TYPES, half: 1 }), F('address', 'Address', 'text', { half: 1 }),
      F('website', 'Website', 'url'), F('dealsUrl', 'Deals or folder page', 'url'),
      F('readDeals', 'Read the deals every week', 'check', { half: 1 }), F('mine', 'My regular shop', 'check', { half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['type', 'Type']],
    sub: r => [r.type, r.address, r.readDeals ? 'deals read weekly' : '', r.mine ? 'my regular' : ''].filter(Boolean).join(' · ')
  },
  bdeals: {
    one: 'deal', many: 'Beauty deals', facet: 'store', photo: 'photo', display: 'cards',
    fields: [F('name', 'Product'), F('brand', 'Brand', 'text', { half: 1 }), F('store', 'Shop', 'select', { options: [], more: () => shopNames('bshops'), half: 1 }),
      F('deal', 'Deal', 'text', { half: 1 }), F('match', 'Why you see it', 'select', { options: ['Your product', 'Running low', 'On your wishlist', 'Brand you use'], half: 1 }),
      F('price', 'Deal price', 'money', { half: 1 }), F('was', 'Normal price', 'money', { half: 1 }),
      F('until', 'Until', 'date', { half: 1 }), F('product', 'Your product', 'rel', { to: 'beauty' }), F('wish', 'Your wish', 'rel', { to: 'wishes' }),
      F('why', 'Note', 'long'), F('url', 'Link', 'url'), F('photo', 'Photo', 'photo')],
    sorts: [['store', 'Shop'], ['name', 'A to Z'], ['price', 'Cheapest']],
    sub: r => [r.brand, r.store, r.deal, num(r.price) ? eur(num(r.price)) + (num(r.was) ? ` (was ${eur(num(r.was))})` : '') : '', r.until ? 'until ' + shortDate(r.until) : ''].filter(Boolean).join(' · ')
  },
  rreviews: {
    one: 'review', many: 'Recipe reviews',
    fields: [F('recipe', 'Recipe', 'rel', { to: 'recipes' }), F('date', 'Eaten on', 'date', { half: 1 }), F('score', 'Overall', 'rating', { half: 1 }),
      F('again', 'Make it again?', 'select', { options: ['Yes', 'Maybe', 'No'], half: 1 }), F('taste', 'Flavour', 'select', { options: ['Too bland', 'Just right', 'Too strong'], half: 1 }),
      F('salt', 'Salt', 'select', { options: ['Too little', 'Just right', 'Too much'], half: 1 }), F('spice', 'Heat', 'select', { options: ['Too mild', 'Just right', 'Too hot'], half: 1 }),
      F('texture', 'Texture I liked', 'multi', { options: TEXTURES }), F('feel', 'It felt', 'multi', { options: FEELS }),
      F('liked', 'Ingredients I liked', 'multi', { options: [] }), F('disliked', 'Ingredients I didn’t like', 'multi', { options: [] }),
      F('effort', 'Effort', 'select', { options: ['Easy', 'OK', 'Too much work'], half: 1 }), F('portion', 'Portion', 'select', { options: ['Too little', 'Just right', 'Too much'], half: 1 }),
      F('reheat', 'Next day / reheated', 'select', { options: ['Great', 'OK', 'Not good', 'Didn’t try'], half: 1 }), F('notes', 'What I’d change', 'long')],
    title: r => relName(r.recipe) || 'Review', sorts: [['-date', 'Newest']],
    sub: r => [r.date && niceDate(r.date), r.score ? `${r.score}/5` : '', r.again ? `again: ${r.again.toLowerCase()}` : ''].filter(Boolean).join(' · ')
  },
  inbox: {
    one: 'link', many: 'Inbox', facet: 'status',
    fields: [F('title', 'Title'), F('url', 'Link', 'url'), F('note', 'Note', 'long'), F('status', 'Status', 'select', { options: ['New', 'Ready', 'Done', 'Skipped', 'Kept'], half: 1 }), F('target', 'Goes to', 'text', { half: 1 })],
    title: r => r.title || (r.url ? String(r.url).replace(/^https?:\/\/(www\.)?/, '').slice(0, 70) : 'Link'), sorts: [['-created', 'Newest']],
    sub: r => [r.source, r.status, INBOX_TO[r.target]?.[0]].filter(Boolean).join(' · ')
  },
  wplans: {
    one: 'week plan', many: 'Week plans',
    fields: [F('name', 'Week'), F('start', 'From', 'date', { half: 1 }), F('end', 'Until', 'date', { half: 1 }), F('tips', 'Tips', 'long')],
    sorts: [['-start', 'Newest']], sub: r => [r.start && shortDate(r.start), plural((r.dinners || []).length, 'dinner')].filter(Boolean).join(' · ')
  },
  meals: {
    one: 'meal', many: 'Meals',
    fields: [F('date', 'Date', 'date', { half: 1 }), F('slot', 'Meal', 'select', { options: MEALS, half: 1 }),
      F('recipe', 'Recipe', 'rel', { to: 'recipes' }), F('what', 'Or just write what you eat'), F('away', 'Not eating at home', 'check'), F('leftover', 'Leftovers', 'select', { options: ['None', 'Fridge', 'Freezer'], half: 1 }), F('notes', 'Notes', 'long')],
    title: r => relName(r.recipe) || r.what || (r.away ? 'Not at home' : '') || r.slot || 'Meal',
    sorts: [['-date', 'Newest']], sub: r => [r.date && niceDate(r.date), r.slot].filter(Boolean).join(' · ')
  },
  mealprep: {
    one: 'meal prep', many: 'Meal prep', facet: 'status',
    fields: [F('name', 'Dish'), F('recipe', 'Recipe', 'rel', { to: 'recipes' }),
      F('status', 'Status', 'select', { options: ['Te plannen', 'Te preppen', 'Klaar', 'Op'] }),
      F('prepDay', 'Prep day', 'date', { half: 1 }), F('until', 'Keeps until', 'date', { half: 1 }),
      F('portions', 'Portions', 'num', { half: 1 }), F('storage', 'Stored in', 'select', { options: ['Koelkast', 'Vriezer'], half: 1 }),
      F('days', 'For which days'),
      F('instructions', 'Instructions', 'long'), F('groceries', 'Groceries needed', 'long')],
    sorts: [['prepDay', 'Prep day'], ['until', 'Use first']],
    hide: r => r.status === 'Op', hideLabel: 'Show eaten',
    sub: r => [r.status, r.portions ? plural(r.portions, 'portion') : '', r.storage, r.until ? 'keeps until ' + shortDate(r.until) : ''].filter(Boolean).join(' · ')
  },
  gear: {
    one: 'item', many: 'Kitchen gear', facet: 'category',
    fields: [F('name', 'Name'), F('category', 'Category', 'select', { options: Object.values(CAT_NL.gear) }),
      F('own', 'I have this', 'check'), F('price', 'Price', 'money', { half: 1 }), F('bought', 'Bought on', 'date', { half: 1 }),
      F('url', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['category', 'Category']],
    filters: [['all', 'All'], ['own', 'I have'], ['want', 'Wishlist']],
    filter: (r, f) => f === 'own' ? !!r.own : f === 'want' ? !r.own : true,
    sub: r => [r.category, eur(r.price)].filter(Boolean).join(' · '),
    quick: r => ({ on: !!r.own, label: 'Have it', act: () => r.own || !recs('faccounts').length ? save(r, { own: !r.own, bought: !r.own && !r.bought ? today() : r.bought }) : buyWish('gear', r.id) })
  },

  /* self-care */
  beauty: {
    one: 'product', many: 'Beauty', facet: 'type',
    fields: [F('name', 'Name'), F('brand', 'Brand', 'text', { half: 1 }), F('size', 'Size', 'text', { half: 1 }),
      F('type', 'Type', 'select', { options: ['Face', 'Hair', 'Body', 'Makeup', 'Fragrance', 'Nails', 'Other'] }),
      F('concern', 'Concern', 'multi', { options: ['Hydration', 'Dryness', 'Cleansing', 'Dullness', 'Textural Irregularities', 'Signs of Congestion', 'Dark Circles', 'Uneven Skin Tone', 'Signs of Aging', 'Redness', 'Puffiness', 'Heat Protection', 'Styling Product', 'Hair Growth', 'Fragrance'] }),
      F('texture', 'Texture', 'select', { options: ['Creamy', 'Gel-like', 'Serum', 'Oily', 'Watery', 'Spray', 'Balm', 'Foam', 'Wipes', 'Wax'] }),
      F('step', 'Step in your routine', 'select', { options: SKIN_STEPS }), F('amDays', 'Morning on', 'multi', { options: WEEKDAYS }), F('pmDays', 'Evening on', 'multi', { options: WEEKDAYS }),
      F('price', 'Price', 'money', { half: 1 }), F('qty', 'How many', 'num', { half: 1 }), F('unit', 'Counted in', 'select', { options: UNITS, half: 1 }), F('min', 'Minimum to keep', 'num', { half: 1 }), F('fill', 'Open one is', 'select', { options: FILL_LEVELS, half: 1 }),
      F('bought', 'Bought on', 'date', { half: 1 }), F('opened', 'Opened on', 'date', { half: 1 }),
      F('expiry', 'Use before', 'date', { half: 1 }), F('rating', 'Rating', 'rating', { half: 1 }),
      F('fav', 'Favourite', 'check', { half: 1 }), F('low', 'Running low', 'check', { half: 1 }), F('finished', 'Finished', 'check', { half: 1 }), F('wish', 'On my wishlist', 'check', { half: 1 }),
      F('acid', 'Counts as an acid', 'check', { half: 1 }),
      F('url', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['brand', 'Brand'], ['-rating', 'Best rated'], ['expiry', 'Use first'], ['-bought', 'Newest']],
    filters: [['all', 'All'], ['own', 'I have'], ['want', 'Wishlist']],
    filter: (r, f) => f === 'own' ? !r.wish : f === 'want' ? !!r.wish : true,
    hide: r => r.finished || r.archived, hideLabel: 'Show finished',
    quick: r => ({ on: !!r.low, label: 'Running low', act: () => save(r, { low: !r.low }) }),
    sub: r => [r.low ? 'running low' : '', num(r.qty) != null ? `${num(r.qty)} in stock` : '', r.fill && r.fill !== 'Full' ? 'open one ' + r.fill.toLowerCase() : '', r.wish ? 'Wishlist' : '', r.brand, r.type, r.texture, r.am && r.pm ? 'AM + PM' : r.am ? 'AM' : r.pm ? 'PM' : ''].filter(Boolean).join(' · '),
    side: r => r.expiry ? (r.expiry < today() ? 'expired' : diffDays(today(), r.expiry) <= 30 ? 'use by ' + shortDate(r.expiry) : '') : ''
  },
  supplements: {
    one: 'supplement', many: 'Supplements',
    fields: [F('name', 'Name'), F('brand', 'Brand', 'text', { half: 1 }),
      F('form', 'Form', 'select', { options: ['Tablet', 'Capsule', 'Softgel', 'Gummy', 'Powder', 'Liquid', 'Drops', 'Tablespoon'], half: 1 }),
      F('amount', 'How many per dose', 'num', { half: 1 }), F('times', 'When', 'multi', { options: ['AM', 'Midday', 'PM'], half: 1 }),
      F('bought', 'Bought on', 'date', { half: 1 }), F('expiry', 'Use before', 'date', { half: 1 }),
      F('price', 'Price', 'money', { half: 1 }), F('rating', 'Rating', 'rating', { half: 1 }),
      F('left', 'How many left', 'num', { half: 1 }), F('unit', 'Counted in', 'select', { options: UNITS, half: 1 }), F('min', 'Minimum to keep', 'num', { half: 1 }), F('low', 'Running low', 'check', { half: 1 }),
      F('finished', 'Finished', 'check', { half: 1 }), F('wish', 'On my wishlist', 'check', { half: 1 }), F('url', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['brand', 'Brand']],
    hide: r => r.finished, hideLabel: 'Show finished',
    sub: r => [r.low ? 'running low' : '', r.brand, [].concat(r.times || []).join(' + '), r.amount && r.form ? `${r.amount} × ${r.form.toLowerCase()}` : r.form].filter(Boolean).join(' · ')
  },
  suplog: {
    one: 'intake', many: 'Intake log',
    fields: [F('date', 'Date', 'date', { half: 1 }), F('time', 'When', 'select', { options: ['AM', 'Midday', 'PM'], half: 1 }), F('supplement', 'Supplement', 'rel', { to: 'supplements' })],
    title: r => relName(r.supplement) || 'Supplement', sorts: [['-date', 'Newest']],
    sub: r => [niceDate(r.date), r.time].filter(Boolean).join(' · ')
  },
  water: { one: 'day', many: 'Water', fields: [F('date', 'Date', 'date', { half: 1 }), F('glasses', 'Glasses', 'num', { half: 1 })], title: r => niceDate(r.date), sorts: [['-date', 'Newest']], sub: r => plural(r.glasses || 0, 'glass', 'glasses') },
  nlog: {
    one: 'day', many: 'Food check',
    fields: [F('date', 'Date', 'date', { half: 1 }), F('meals', 'Ate', 'multi', { options: ['Breakfast', 'Lunch', 'Dinner'] }), F('snack', 'Snack', 'check', { half: 1 }), F('nosoda', 'No sugary drinks', 'check', { half: 1 }),
      F('veg', 'Vegetables (g)', 'num', { half: 1 }), F('fruit', 'Fruit (pieces)', 'num', { half: 1 }), F('soda', 'Soda and juice (glasses)', 'num', { half: 1 }), F('steps', 'Steps', 'num', { half: 1 }),
      F('energy', 'Energy', 'select', { options: ['Laag', 'Oké', 'Goed', 'Top'], half: 1 }), F('mood', 'Mood', 'select', { options: ['Down', 'Gestrest', 'Rustig', 'Blij'], half: 1 }), F('notes', 'Notes', 'long')],
    title: r => niceDate(r.date), sorts: [['-date', 'Newest']], sub: r => `${nlScore(r)} of ${NL_MAX}`
  },
  cleanlog: {
    one: 'moment', ones: 'momenten', many: 'Clean log', facet: 'type',
    fields: [F('date', 'Datum', 'date', { half: 1 }), F('time', 'Tijd', 'time', { half: 1 }), F('type', 'Wat', 'select', { options: ['Trek', 'Gebruikt', 'Gekocht'], half: 1 }), F('trigger', 'Wanneer', 'select', { options: CLEAN_TRIGGERS, half: 1 }),
      F('amount', 'Bedrag', 'money', { half: 1 }), F('count', 'Hoeveel', 'num', { half: 1 }), F('helped', 'Wat hielp', 'multi', { options: CLEAN_HELPS }), F('notes', 'Notities', 'long')],
    title: r => `${r.type || 'Moment'} · ${r.date ? shortDate(r.date) : ''}`, sorts: [['-date', 'Nieuwste']],
    sub: r => [r.time, r.trigger, [].concat(r.helped || []).join(', '), num(r.amount) ? eur(num(r.amount)) : ''].filter(Boolean).join(' · ')
  },
  ltk: {
    one: 'LTK month', many: 'LTK',
    fields: [F('month', 'Month (YYYY-MM)', 'text', { half: 1 }), F('amount', 'Commission', 'money', { half: 1 }), F('clicks', 'Clicks', 'num', { half: 1 }), F('notes', 'Notes', 'long')],
    title: r => 'LTK ' + (r.month || ''), sorts: [['-month', 'Newest']], sub: r => [num(r.amount) ? eur(num(r.amount)) : '', num(r.clicks) ? r.clicks + ' clicks' : ''].filter(Boolean).join(' · ')
  },
  journal: {
    one: 'entry', ones: 'entries', many: 'Journal', facet: 'mood',
    fields: [F('date', 'Date', 'date', { half: 1 }), F('mood', 'Mood', 'select', { options: ['Great', 'Good', 'Okay', 'Low', 'Bad'], half: 1 }),
      F('title', 'Title'), F('entry', 'What happened', 'long', { rows: 8 }), F('grateful', 'Grateful for', 'long'), F('dump', 'Brain dump', 'long', { rows: 4 })],
    title: r => r.title || (r.date ? niceDate(r.date) : 'Entry'), sorts: [['-date', 'Newest']],
    sub: r => [r.title ? niceDate(r.date) : '', r.mood].filter(Boolean).join(' · ')
  },
  sleep: {
    one: 'night', many: 'Sleep',
    fields: [F('date', 'Morning of', 'date', { half: 1 }), F('hours', 'Hours slept', 'num', { half: 1 }),
      F('quality', 'Sleep quality', 'select', { options: ['Excellent', 'Good', 'Fair', 'Poor'] }),
      F('wake', 'Mood on waking', 'select', { options: ['Energized', 'Okay', 'Tired', 'Groggy'] }),
      F('factors', 'Factors', 'multi', { options: ['Alcohol', 'Caffeine', 'Exercise', 'Late meal', 'Medication', 'Screen time', 'Stress'] }),
      F('dreams', 'Dreams', 'long')],
    title: r => r.date ? niceDate(r.date) : 'Night', sorts: [['-date', 'Newest']],
    sub: r => [r.hours ? r.hours + ' h' : '', r.quality, r.wake].filter(Boolean).join(' · ')
  },
  cycles: {
    one: 'period', many: 'Cycle',
    fields: [F('start', 'Period started', 'date', { half: 1 }), F('end', 'Period ended', 'date', { half: 1 }),
      F('flow', 'Flow', 'select', { options: ['Spotting', 'Light', 'Medium', 'Heavy'] }),
      F('symptoms', 'Symptoms', 'multi', { options: ['Cramps', 'Headache', 'Bloating', 'Fatigue', 'Acne', 'Mood swings', 'Tender breasts', 'Back pain', 'Cravings', 'Nausea'] }),
      F('notes', 'Notes', 'long')],
    title: r => r.start ? niceDate(r.start) : 'Period', sorts: [['-start', 'Newest']],
    sub: r => [r.end ? `${diffDays(r.start, r.end) + 1} days` : 'ongoing', r.flow].filter(Boolean).join(' · ')
  },
  symptoms: {
    one: 'symptom', many: 'Symptoms',
    fields: [F('date', 'Date', 'date', { half: 1 }), F('severity', 'How bad', 'select', { options: ['Mild', 'Moderate', 'Severe'], half: 1 }), F('symptom', 'Symptom'), F('notes', 'Notes', 'long')],
    title: r => r.symptom || 'Symptom', sorts: [['-date', 'Newest']], sub: r => [niceDate(r.date), r.severity].filter(Boolean).join(' · ')
  },
  appts: {
    one: 'appointment', many: 'Appointments', facet: 'type',
    fields: [F('what', 'What'), F('date', 'Date', 'date', { half: 1 }), F('time', 'Time', 'time', { half: 1 }),
      F('type', 'Type', 'select', { options: ['Doctor', 'Dentist', 'Physio', 'Hair', 'Nails', 'Beauty', 'Massage', 'Therapy', 'Other'] }),
      F('provider', 'With', 'text', { half: 1 }), F('place', 'Where', 'text', { half: 1 }), F('price', 'Price', 'money', { half: 1 }), F('done', 'Done', 'check', { half: 1 }), F('notes', 'Notes', 'long')],
    title: r => r.what || r.type || 'Appointment', sorts: [['date', 'Soonest'], ['-date', 'Newest']],
    hide: r => r.done, hideLabel: 'Show done',
    sub: r => [r.date && `${dayName(r.date)} ${niceDate(r.date)}`, r.time, r.provider, eur(r.price)].filter(Boolean).join(' · '),
    quick: r => ({ on: !!r.done, label: 'Done', act: () => save(r, { done: !r.done }) })
  },
  ideas: {
    one: 'idea', many: 'Ideas', facet: 'area',
    fields: [F('name', 'Name'), F('area', 'For', 'select', { options: ['Hair', 'Beauty', 'Nails', 'Skin', 'Body', 'Other'], half: 1 }),
      F('what', 'What', 'select', { options: ['Tutorial', 'Product', 'Look', 'Tip'], half: 1 }),
      F('level', 'Level', 'select', { options: ['Beginner', 'Intermediate', 'Advanced'], half: 1 }), F('time', 'Takes', 'text', { half: 1 }),
      F('summary', 'What it is', 'long'), F('tried', 'Tried it', 'check', { half: 1 }), F('fav', 'Favourite', 'check', { half: 1 }),
      F('url', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['-created', 'Newest'], ['name', 'A to Z']],
    hide: r => r.tried, hideLabel: 'Show tried',
    sub: r => [r.area, r.what, r.level, r.time].filter(Boolean).join(' · '),
    quick: r => ({ on: !!r.tried, label: 'Tried', act: () => save(r, { tried: !r.tried }) })
  },
  posts: {
    one: 'post', many: 'Posts', facet: 'stage', photo: 'photo',
    fields: [F('name', 'Title'), F('date', 'Post on', 'date', { half: 1 }), F('time', 'At', 'time', { half: 1 }),
      F('scriptOn', 'Write the script on', 'date', { half: 1 }), F('filmOn', 'Film on', 'date', { half: 1 }), F('editOn', 'Edit on', 'date', { half: 1 }), F('location', 'Location', 'text', { half: 1 }),
      F('stage', 'Stage', 'select', { options: SOCIAL_STAGES.filter(x => x !== 'Idea'), half: 1 }), F('tips', 'Tips to use', 'rel', { to: 'stips', multi: 1 }), F('platforms', 'Platforms', 'multi', { options: SOCIAL_PLATFORMS, half: 1 }),
      F('format', 'Format', 'select', { options: SOCIAL_FORMATS, half: 1 }), F('pillar', 'Pillar', 'rel', { to: 'pillars', half: 1 }),
      F('style', 'Style', 'select', { options: SOCIAL_STYLES, half: 1 }), F('funnel', 'Funnel stage', 'select', { options: SOCIAL_FUNNEL, half: 1 }),
      F('desc', 'What it is', 'long'), F('hook', 'Hook (first seconds)', 'text'), F('script', 'Script', 'long', { rows: 8 }), F('shots', 'Shot list', 'long', { rows: 5 }),
      F('outfit', 'Outfit and props', 'long', { rows: 3 }), F('brands', 'Brands in this post', 'text'), F('ltk', 'LTK link', 'url'), F('sound', 'Sound or music', 'text', { half: 1 }), F('cta', 'Call to action', 'text', { half: 1 }),
      F('caption', 'Caption', 'long'), F('hashtags', 'Hashtags', 'text'),
      F('link', 'Post link', 'url'), F('views', 'Views', 'num', { half: 1 }), F('likes', 'Likes', 'num', { half: 1 }), F('comments', 'Comments', 'num', { half: 1 }), F('shares', 'Shares', 'num', { half: 1 }), F('top', 'Top performer', 'check', { half: 1 }), F('repurpose', 'Repurpose this', 'check', { half: 1 }),
      F('photo', 'Cover', 'photo'), F('video', 'Video', 'video'), F('notes', 'Notes', 'long')],
    sorts: [['date', 'Soonest'], ['-date', 'Newest'], ['name', 'A to Z']],
    hide: r => r.stage === 'Posted', hideLabel: 'Show posted',
    sub: r => { const nx = r.stage === 'Posted' ? null : POST_STEPS.slice(0, 3).find(([k, , upto]) => r[k] && !stepDone(r, upto)); return [r.date && `${dayName(r.date)} ${niceDate(r.date)}`, r.time, r.stage, nx && `${nx[1].toLowerCase()} ${relDay(r[nx[0]])}`, [].concat(r.platforms || []).join(' + ')].filter(Boolean).join(' · '); },
    quick: r => ({ on: r.stage === 'Posted', label: 'Posted', act: () => save(r, { stage: r.stage === 'Posted' ? 'Scheduled' : 'Posted' }) })
  },
  cideas: {
    one: 'idea', many: 'Content ideas', facet: 'type',
    fields: [F('name', 'Idea'), F('status', 'Status', 'select', { options: ['Idea', 'Under review', 'Approved', 'Planned', 'Dropped'], half: 1 }),
      F('pillar', 'Pillar', 'rel', { to: 'pillars', half: 1 }), F('platforms', 'Platforms', 'multi', { options: SOCIAL_PLATFORMS, half: 1 }),
      F('format', 'Format', 'select', { options: SOCIAL_FORMATS, half: 1 }), F('funnel', 'Funnel stage', 'select', { options: SOCIAL_FUNNEL, half: 1 }),
      F('type', 'Kind', 'select', { options: ['Post idea', 'Tool', 'Course', 'Tip', 'Template'], half: 1 }), F('source', 'Found in', 'text', { half: 1 }),
      F('desc', 'What it is', 'long'), F('url', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['-created', 'Newest'], ['name', 'A to Z']],
    hide: r => r.status === 'Dropped' || r.status === 'Planned', hideLabel: 'Show planned and dropped',
    sub: r => [r.type !== 'Post idea' && r.type, r.status, relName(r.pillar), r.format, r.source].filter(Boolean).join(' · ')
  },
  stips: {
    one: 'tip', many: 'Social media tips', facet: 'category', photo: 'photo', display: 'cards',
    fields: [F('name', 'Tip'), F('category', 'Category', 'select', { options: TIP_CATS, half: 1 }), F('platforms', 'Platforms', 'multi', { options: SOCIAL_PLATFORMS, half: 1 }),
      F('summary', 'What it is', 'long', { rows: 3 }), F('steps', 'Steps', 'long', { rows: 8 }), F('tools', 'Apps or gear', 'text', { half: 1 }), F('creator', 'From', 'text', { half: 1 }),
      F('link', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('tried', 'Tried it', 'check', { half: 1 }), F('fav', 'Favourite', 'check', { half: 1 }),
      F('worked', 'Did it work?', 'rating', { half: 1 }), F('result', 'How it went', 'long', { rows: 2 }), F('notes', 'Notes', 'long')],
    sorts: [['-created', 'Newest'], ['name', 'A to Z'], ['category', 'Category'], ['-worked', 'Worked best']],
    sub: r => [r.category, r.creator, r.tried ? (num(r.worked) ? 'worked ' + num(r.worked) + '/5' : 'tried') : ''].filter(Boolean).join(' · '),
    quick: r => ({ on: !!r.tried, label: 'Tried', act: () => save(r, { tried: !r.tried }) })
  },
  stemplates: {
    one: 'script template', many: 'Script templates', facet: 'format',
    fields: [F('name', 'Template'), F('format', 'For', 'select', { options: SOCIAL_FORMATS, half: 1 }), F('length', 'Length', 'text', { half: 1 }),
      F('body', 'Structure', 'long', { rows: 10 }), F('example', 'Example', 'long', { rows: 4 }), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z']], sub: r => [r.format, r.length].filter(Boolean).join(' · ')
  },
  hashsets: {
    one: 'hashtag set', many: 'Hashtag sets', facet: 'platform',
    fields: [F('name', 'Set'), F('platform', 'Platform', 'select', { options: SOCIAL_PLATFORMS, half: 1 }), F('pillar', 'Pillar', 'rel', { to: 'pillars', half: 1 }),
      F('tags', 'Hashtags', 'long', { rows: 4 }), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z']], sub: r => [r.platform, `${String(r.tags || '').split(/\s+/).filter(x => x.startsWith('#')).length} hashtags`].filter(Boolean).join(' · ')
  },
  inspo: {
    one: 'inspiration', many: 'Inspiration', facet: 'type', photo: 'photo', display: 'cards',
    fields: [F('name', 'Title'), F('photo', 'Picture', 'photo'), F('type', 'Type', 'select', { options: ['Creator', 'Post', 'Look', 'Colours', 'Set-up', 'Editing style', 'Other'], half: 1 }),
      F('creator', 'Creator', 'text', { half: 1 }), F('link', 'Link', 'url'), F('why', 'What I like about it', 'long', { rows: 3 }), F('pillar', 'Pillar', 'rel', { to: 'pillars', half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['-created', 'Newest'], ['name', 'A to Z']], sub: r => [r.type, r.creator].filter(Boolean).join(' · ')
  },
  pillars: {
    one: 'pillar', many: 'Content pillars',
    fields: [F('name', 'Pillar'), F('desc', 'What it covers', 'long'), F('keywords', 'Keywords and themes', 'text'), F('perMonth', 'Posts per month', 'num', { half: 1 }), F('goal', 'Overall goal', 'long')],
    sorts: [['name', 'A to Z']], sub: r => r.keywords || ''
  },
  accounts: {
    one: 'account', many: 'Accounts', facet: 'platform',
    fields: [F('platform', 'Platform', 'select', { options: SOCIAL_PLATFORMS, half: 1 }), F('handle', 'Handle', 'text', { half: 1 }),
      F('followers', 'Followers', 'num', { half: 1 }), F('following', 'Following', 'num', { half: 1 }), F('freq', 'Posting rhythm', 'text', { half: 1 }),
      F('display', 'Name on your profile', 'text', { half: 1 }), F('bio', 'Bio', 'long', { rows: 3 }), F('avatar', 'Profile photo', 'photo'),
      F('active', 'Active', 'check', { half: 1 }), F('url', 'Profile link', 'url'), F('notes', 'Notes', 'long')],
    title: r => [r.platform, r.handle].filter(Boolean).join(' ') || 'Account', sorts: [['-followers', 'Most followers']],
    sub: r => [r.followers != null && r.followers !== '' ? plural(num(r.followers) || 0, 'follower') : '', r.freq].filter(Boolean).join(' · ')
  },
  highlights: {
    one: 'highlight', many: 'Highlights',
    fields: [F('name', 'Name'), F('order', 'Position', 'num', { half: 1 }), F('photo', 'Cover', 'photo')],
    sorts: [['order', 'In order'], ['name', 'A to Z']]
  },
  sgoals: {
    one: 'goal', many: 'Goals', facet: 'platform',
    fields: [F('name', 'Goal'), F('platform', 'Platform', 'select', { options: SOCIAL_PLATFORMS, half: 1 }),
      F('metric', 'Metric', 'select', { options: ['Followers', 'Views', 'Engagements', 'Profile visits', 'Likes', 'Comments', 'Shares', 'Saves', 'Clicks', 'Posts'], half: 1 }),
      F('current', 'Now', 'num', { half: 1 }), F('target', 'Target', 'num', { half: 1 }),
      F('start', 'From', 'date', { half: 1 }), F('end', 'Until', 'date', { half: 1 }), F('done', 'Achieved', 'check'), F('notes', 'Notes', 'long')],
    sorts: [['-end', 'Newest'], ['end', 'Soonest']],
    hide: r => r.done, hideLabel: 'Show achieved',
    sub: r => [r.platform, r.metric, num(r.target) ? `${num(r.current) || 0} of ${num(r.target)} (${Math.round(100 * (num(r.current) || 0) / num(r.target))}%)` : '', r.end && 'until ' + niceDate(r.end)].filter(Boolean).join(' · '),
    quick: r => ({ on: !!r.done, label: 'Achieved', act: () => save(r, { done: !r.done }) })
  },
  deals: {
    one: 'collab', many: 'Collabs', facet: 'status',
    fields: [F('name', 'Brand'), F('status', 'Status', 'select', { options: ['Pitched', 'Talking', 'Confirmed', 'Creating', 'Delivered', 'Paid', 'Declined'], half: 1 }),
      F('type', 'Type', 'select', { options: ['Paid', 'Gifted', 'Affiliate', 'Ambassador', 'Event', 'Other'], half: 1 }),
      F('platforms', 'Platforms', 'multi', { options: SOCIAL_PLATFORMS, half: 1 }), F('due', 'Due', 'date', { half: 1 }),
      F('fee', 'Fee', 'money', { half: 1 }), F('contact', 'Contact person', 'text', { half: 1 }), F('email', 'Email', 'text', { half: 1 }), F('phone', 'Phone', 'text', { half: 1 }),
      F('deliverables', 'Deliverables', 'long'), F('agreement', 'What we agreed', 'long'), F('draftBy', 'Draft to brand by', 'date', { half: 1 }), F('postBy', 'Post by', 'date', { half: 1 }),
      F('rights', 'Usage rights', 'text', { half: 1 }), F('exclusive', 'Exclusivity', 'text', { half: 1 }), F('posts', 'Posts', 'rel', { to: 'posts', multi: 1 }),
      F('invoiced', 'Invoice sent', 'check', { half: 1 }), F('payBy', 'Payment due', 'date', { half: 1 }), F('url', 'Link', 'url'), F('notes', 'Notes', 'long')],
    sorts: [['due', 'Due first'], ['-due', 'Newest']],
    hide: r => r.status === 'Paid' || r.status === 'Declined', hideLabel: 'Show finished',
    sub: r => [r.status, r.type, r.due && 'due ' + niceDate(r.due), eur(r.fee)].filter(Boolean).join(' · ')
  },
  breviews: {
    one: 'review', many: 'Reviews', facet: 'after',
    fields: [F('product', 'Product', 'rel', { to: 'beauty' }), F('date', 'Date', 'date', { half: 1 }), F('after', 'After', 'select', { options: REVIEW_AFTER, half: 1 }),
      F('hydration', 'Hydration', 'rating', { half: 1 }), F('calm', 'Calm skin, no irritation', 'rating', { half: 1 }), F('clear', 'Fewer breakouts', 'rating', { half: 1 }),
      F('glow', 'Glow', 'rating', { half: 1 }), F('smooth', 'Smoother texture', 'rating', { half: 1 }),
      F('feel', 'Texture feels nice', 'rating', { half: 1 }), F('scent', 'Scent', 'rating', { half: 1 }), F('absorbs', 'Absorbs well', 'rating', { half: 1 }),
      F('makeup', 'Works under make-up', 'rating', { half: 1 }), F('value', 'Value for money', 'rating', { half: 1 }),
      F('again', 'Buy it again?', 'select', { options: ['Yes', 'Maybe', 'No'], half: 1 }), F('reason', 'Why', 'text', { half: 1 }), F('notes', 'Notes', 'long')],
    title: r => [relName(r.product) || 'Review', r.after].filter(Boolean).join(', '), sorts: [['-date', 'Newest']],
    sub: r => [r.date && niceDate(r.date), reviewAvg(r) ? `${reviewAvg(r).toFixed(1)} / 5` : '', r.again && 'buy again: ' + r.again.toLowerCase()].filter(Boolean).join(' · ')
  },
  skinlog: {
    one: 'diary entry', many: 'Skin diary', photo: 'front',
    fields: [F('date', 'Date', 'date', { half: 1 }), F('time', 'Time of day', 'select', { options: ['Morning', 'Evening'], half: 1 }),
      F('front', 'Front', 'pphoto'), F('left', 'Left side', 'pphoto'), F('right', 'Right side', 'pphoto'),
      F('breakouts', 'Breakouts', 'select', { options: SKIN_LEVELS, half: 1 }), F('redness', 'Redness', 'select', { options: SKIN_LEVELS, half: 1 }),
      F('dryness', 'Dryness', 'select', { options: SKIN_LEVELS, half: 1 }), F('oiliness', 'Oiliness', 'select', { options: SKIN_LEVELS, half: 1 }),
      F('glow', 'Glow', 'rating', { half: 1 }), F('used', 'Products used', 'rel', { to: 'beauty', multi: 1 }),
      F('sleep', 'Sleep', 'num', { unit: 'hours', half: 1 }), F('stress', 'Stress', 'select', { options: ['Low', 'Medium', 'High'], half: 1 }),
      F('cycle', 'Cycle day', 'num', { half: 1 }), F('weather', 'Weather', 'text', { half: 1 }), F('food', 'Food and drink', 'text'), F('notes', 'Notes', 'long')],
    title: r => r.date ? niceDate(r.date) : 'Diary entry', sorts: [['-date', 'Newest']],
    sub: r => SKIN_SCORES.filter(([k]) => r[k] && r[k] !== 'None').map(([k, l]) => `${l.toLowerCase()} ${r[k].toLowerCase()}`).join(' · ') || 'clear skin'
  },
  skinplan: { one: 'skincare order', many: 'Skincare order', fields: [F('name', 'Name')] },
  bsched: {
    one: 'week schedule', many: 'Week schedule',
    fields: WEEK.map(([k, l]) => F(k, l, 'select', { options: NIGHTS, half: 1 })),
    title: () => 'Skincare week',
    sub: r => WEEK.map(([k, l]) => `${l.slice(0, 2)} ${(r[k] || '–').replace(' night', '')}`).join(' · ')
  },
  meditation: {
    one: 'session', many: 'Meditation',
    fields: [F('date', 'Date', 'date', { half: 1 }), F('minutes', 'Minutes', 'num', { half: 1 }), F('type', 'Type', 'select', { options: ['Meditation', 'Breathwork', 'Yoga nidra', 'Mindfulness', 'Prayer'] }), F('guide', 'From the library', 'rel', { to: 'mindful' }), F('notes', 'How it felt', 'long')],
    title: r => relName(r.guide) || r.type || 'Session', sorts: [['-date', 'Newest']], sub: r => [niceDate(r.date), r.minutes ? r.minutes + ' min' : ''].filter(Boolean).join(' · ')
  },
  mindful: {
    one: 'mindfulness item', ones: 'items', many: 'Mindfulness library', facet: 'type', photo: 'photo',
    fields: [F('name', 'Name'), F('url', 'Link', 'url'), F('type', 'Type', 'select', { options: ['Guided meditation', 'Breathwork', 'Body scan', 'Sleep', 'Yoga nidra', 'Affirmations', 'Podcast', 'Music'], half: 1 }),
      F('minutes', 'Minutes', 'num', { half: 1 }), F('teacher', 'Teacher or app', 'text', { half: 1 }), F('mood', 'Good for', 'multi', { options: ['Calm', 'Focus', 'Sleep', 'Energy', 'Anxiety', 'Gratitude', 'Morning', 'Evening'], half: 1 }),
      F('fav', 'Pinned', 'check', { half: 1 }), F('rating', 'Rating', 'rating'), F('photo', 'Cover', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['-fav', 'Pinned first'], ['minutes', 'Shortest'], ['name', 'A to Z']],
    filters: [['all', 'All'], ['short', 'Under 15 min'], ['long', '15 min or more']],
    filter: (r, f) => f === 'short' ? (num(r.minutes) || 0) < 15 : f === 'long' ? (num(r.minutes) || 0) >= 15 : true,
    sub: r => { const n = recs('meditation').filter(m => m.guide === r.id).length; return [r.teacher, r.minutes && r.minutes + ' min', [].concat(r.mood || []).join(', '), n ? `done ${n}×` : ''].filter(Boolean).join(' · '); },
    quick: r => ({ on: recs('meditation').some(m => m.guide === r.id && m.date === today()), label: 'Start', act: () => startMindful(r) })
  },

  /* home */
  chores: {
    one: 'chore', many: 'Chores', facet: 'space',
    fields: [F('name', 'Chore'), F('space', 'Rooms', 'multi', { options: [...ROOMS.filter(x => !['Schoonmaak', 'Overig'].includes(x)), 'Hele huis'] }),
      F('freq', 'How often', 'select', { options: Object.keys(FREQ) }), F('last', 'Last done', 'date', { half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['due', 'Due first'], ['name', 'A to Z']],
    sub: r => [[].concat(r.space || []).join(', '), r.freq].filter(Boolean).join(' · '),
    side: r => { const d = choreDue(r); return d <= today() ? (choreLate(r) ? 'carried over' : 'due today') : 'due ' + relDay(d); },
    quick: r => ({ on: r.last === today(), label: 'Done', act: () => save(r, { last: r.last === today() ? (r.prevLast || '') : today(), prevLast: r.last === today() ? '' : (r.last || '') }) })
  },
  plants: {
    one: 'plant', many: 'Plants', facet: 'location',
    fields: [F('name', 'Name'), F('species', 'Species', 'text', { half: 1 }), F('location', 'Where', 'text', { half: 1 }),
      F('every', 'Water every', 'num', { unit: 'days', half: 1 }), F('last', 'Last watered', 'date', { half: 1 }),
      F('light', 'Light', 'select', { options: ['Low light', 'Medium light', 'Bright indirect', 'Direct sun'] }),
      F('photo', 'Photo', 'photo'), F('notes', 'Care notes', 'long')],
    sorts: [['due', 'Thirsty first'], ['name', 'A to Z']],
    sub: r => [r.species, r.location, r.every ? `every ${r.every} days` : ''].filter(Boolean).join(' · '),
    side: r => { const d = plantDue(r); return !d ? '' : d <= today() ? 'water today' : 'water ' + relDay(d); },
    quick: r => ({ on: r.last === today(), label: 'Watered', act: () => save(r, { last: r.last === today() ? (r.prevLast || '') : today(), prevLast: r.last === today() ? '' : (r.last || '') }) })
  },
  inventory: {
    one: 'product', ones: 'producten', many: 'Verhuislijst', facet: 'room',
    fields: [F('name', 'Product'), F('room', 'Kamer', 'select', { options: ROOMS, half: 1 }), F('status', 'Status', 'select', { options: INV_STATUS, half: 1 }),
      F('priority', 'Prioriteit', 'select', { options: INV_PRIO, half: 1 }), F('category', 'Categorie', 'select', { options: INV_CATS, half: 1 }),
      F('budget', 'Budget', 'money', { half: 1 }), F('price', 'Betaald', 'money', { half: 1 }), F('qty', 'Aantal', 'text', { half: 1 }), F('brand', 'Merk', 'text', { half: 1 }),
      F('shop', 'Winkel', 'text', { half: 1 }), F('bought', 'Gekocht op', 'date', { half: 1 }), F('warranty', 'Garantie tot', 'date', { half: 1 }),
      F('chosen', 'Gekozen optie', 'rel', { to: 'invopts', half: 1 }), F('receipt', 'Bon', 'photo'),
      F('rating', 'Beoordeling', 'rating'), F('url', 'Link', 'url'), F('photo', 'Foto', 'photo'), F('notes', 'Notities', 'long')],
    sorts: [['prio', 'Prioriteit'], ['name', 'A tot Z'], ['-bought', 'Nieuwste'], ['-budget', 'Hoogste budget']],
    filters: [['want', 'Nog kopen'], ['have', 'Gekocht'], ['all', 'Alles']],
    filter: (r, f) => f === 'have' ? invStatus(r) === 'Gekocht' : f === 'want' ? INV_WANT.includes(invStatus(r)) : true,
    sub: r => [r.room, invStatus(r), r.priority, invOpts(r.id).length ? plural(invOpts(r.id).length, 'optie', 'opties') : '', r.qty && r.qty !== '1' ? r.qty + '×' : '', r.warranty ? (r.warranty < today() ? 'garantie voorbij' : 'garantie tot ' + shortDate(r.warranty)) : ''].filter(Boolean).join(' · '),
    side: r => invMoney(r),
    quick: r => INV_WANT.includes(invStatus(r)) ? { on: false, label: 'Gekocht', act: () => invBuy(r.id) } : null
  },
  invopts: {
    one: 'optie', ones: 'opties', many: 'Opties', facet: 'shop', photo: 'photo', display: 'cards',
    fields: [F('name', 'Naam'), F('item', 'Voor product', 'rel', { to: 'inventory' }), F('shop', 'Winkel', 'text', { half: 1 }), F('price', 'Prijs', 'money', { half: 1 }),
      F('shipping', 'Bezorgkosten', 'money', { half: 1 }), F('delivery', 'Levertijd', 'text', { half: 1 }), F('dims', 'Afmetingen (b × d × h)', 'text', { half: 1 }),
      F('color', 'Kleur', 'text', { half: 1 }), F('material', 'Materiaal', 'text', { half: 1 }), F('score', 'Hoe mooi vind ik het', 'rating', { half: 1 }), F('used', 'Tweedehands', 'check', { half: 1 }),
      F('url', 'Link', 'url'), F('photo', 'Foto', 'photo'), F('fav', 'Favoriet', 'check', { half: 1 }), F('archived', 'Gearchiveerd', 'check', { half: 1 }), F('notes', 'Notities', 'long')],
    sorts: [['price', 'Goedkoopste'], ['name', 'A tot Z']],
    hide: r => !!r.archived, hideLabel: 'Toon gearchiveerd',
    sub: r => [relName(r.item), r.shop, num(r.price) ? eur(num(r.price)) : '', r.used ? 'tweedehands' : '', r.score ? '★'.repeat(r.score) : '', r.chosenFor ? 'gekozen' : ''].filter(Boolean).join(' · ')
  },
  movecosts: {
    one: 'kostenpost', ones: 'kostenposten', many: 'Verhuiskosten', facet: 'type',
    fields: [F('name', 'Wat'), F('type', 'Soort', 'select', { options: MOVE_TYPES, half: 1 }), F('date', 'Datum', 'date', { half: 1 }),
      F('budget', 'Budget', 'money', { half: 1 }), F('price', 'Betaald', 'money', { half: 1 }), F('paid', 'Betaald', 'check', { half: 1 }), F('notes', 'Notities', 'long')],
    sorts: [['type', 'Soort'], ['-budget', 'Hoogste budget']],
    sub: r => [r.type, num(r.budget) ? 'budget ' + eur(num(r.budget)) : '', r.paid ? 'betaald' + (num(r.price) ? ' ' + eur(num(r.price)) : '') : 'nog betalen'].filter(Boolean).join(' · '),
    quick: r => ({ on: !!r.paid, label: 'Betaald', act: () => save(r, { paid: !r.paid }) })
  },

  repairs: {
    one: 'repair', many: 'Repairs', facet: 'status',
    fields: [F('name', 'What needs doing'), F('status', 'Status', 'select', { options: ['To do', 'Planned', 'Done'] }),
      F('space', 'Room', 'text', { half: 1 }), F('date', 'Date', 'date', { half: 1 }),
      F('cost', 'Cost', 'money', { half: 1 }), F('provider', 'Who does it', 'text', { half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['date', 'Soonest'], ['-date', 'Newest']],
    hide: r => r.status === 'Done', hideLabel: 'Show done',
    sub: r => [r.status, r.space, r.date ? niceDate(r.date) : '', eur(r.cost)].filter(Boolean).join(' · '),
    quick: r => ({ on: r.status === 'Done', label: 'Done', act: () => save(r, { status: r.status === 'Done' ? 'To do' : 'Done', date: r.date || today() }) })
  },

  /* fitness */
  workouts: {
    one: 'workout', many: 'Workouts', facet: 'type',
    fields: [F('name', 'Workout'), F('date', 'Date', 'date', { half: 1 }), F('minutes', 'Minutes', 'num', { half: 1 }),
      F('type', 'Type', 'select', { options: ['Strength', 'Cardio', 'HIIT', 'Pilates', 'Yoga', 'Walk', 'Run', 'Cycling', 'Stretching', 'Sport', 'Other'] }),
      F('intensity', 'Intensity', 'select', { options: ['Easy', 'Moderate', 'Hard'] }),
      F('plan', 'Workout plan', 'rel', { to: 'plans' }), F('video', 'Video workout', 'rel', { to: 'vworkouts' }), F('exercises', 'Exercises', 'rel', { to: 'exercises', multi: 1 }),
      F('done', 'Done', 'check', { half: 1 }), F('skipped', 'Skipped', 'check', { half: 1 }), F('notes', 'Notes', 'long')],
    title: r => r.name || relName(r.plan) || r.type || 'Workout', sorts: [['-date', 'Newest'], ['date', 'Oldest']],
    hide: r => r.skipped, hideLabel: 'Show skipped',
    sub: r => [r.date ? `${dayName(r.date)} ${niceDate(r.date)}` : '', r.type, r.minutes ? r.minutes + ' min' : '', r.exercises?.length ? plural(r.exercises.length, 'exercise') : '', r.skipped ? 'skipped' : ''].filter(Boolean).join(' · '),
    quick: r => ({ on: !!r.done, label: 'Done', act: () => save(r, { done: !r.done, skipped: false }) })
  },
  plans: {
    one: 'plan', many: 'Plans', facet: 'type',
    fields: [F('name', 'Name'), F('type', 'Type', 'select', { options: ['Full body', 'Upper body', 'Lower body', 'Core', 'Cardio', 'Pilates', 'Yoga', 'Mobility'] }),
      F('exercises', 'Exercises', 'rel', { to: 'exercises', multi: 1 }), F('notes', 'How to do it', 'long')],
    sorts: [['name', 'A to Z']], sub: r => [r.type, r.exercises?.length ? plural(r.exercises.length, 'exercise') : ''].filter(Boolean).join(' · ')
  },
  exercises: {
    one: 'exercise', many: 'Exercises', facet: 'muscles',
    fields: [F('name', 'Name'), F('muscles', 'Muscles', 'multi', { options: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Core', 'Glutes', 'Quads', 'Hamstrings', 'Calves', 'Full body', 'Cardio'] }),
      F('equipment', 'Equipment', 'multi', { options: ['Bodyweight', 'Dumbbells', 'Barbell', 'Kettlebell', 'Machine', 'Cable', 'Resistance band', 'Mat', 'Bench', 'Pull-up bar', 'Other'] }),
      F('link', 'Video or how-to', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z']], sub: r => [[].concat(r.muscles || []).join(', '), [].concat(r.equipment || []).join(', ')].filter(Boolean).join(' · '),
    side: r => { const p = prOf(r.id); return p ? `PR ${p.weight} kg × ${p.reps || 1}` : ''; }
  },
  faccounts: {
    one: 'account', many: 'Accounts', facet: 'type',
    fields: [F('name', 'Name'), F('type', 'Type', 'select', { options: ['Spending', 'Savings', 'Pot', 'Card'], half: 1 }),
      F('safe', 'Counts toward safe to spend', 'check', { half: 1 }), F('potGoal', 'Pot goal (optional)', 'money', { half: 1 }), F('cards', 'Apple Wallet cards (names, comma separated)', 'text'), F('archived', 'Archived', 'check', { half: 1 }), F('iban', 'IBAN (for bank imports)'), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z']], hide: r => r.archived, hideLabel: 'Show archived',
    sub: r => [r.type, r.safe ? 'in safe to spend' : ''].filter(Boolean).join(' · '),
    side: r => { const b = fBalance(r); return b == null ? 'not checked' : eur(b); }
  },
  fchecks: {
    one: 'balance check', many: 'Balance checks',
    fields: [F('account', 'Account', 'rel', { to: 'faccounts', half: 1 }), F('amount', 'Balance', 'money', { half: 1 }), F('at', 'Checked on', 'date'), F('notes', 'Note', 'long')],
    title: r => relName(r.account) || 'Balance check', sorts: [['-at', 'Newest']],
    sub: r => niceDate(r.at), side: r => eur(num(r.amount))
  },
  ftx: {
    one: 'purchase', many: 'Purchases',
    fields: [F('name', 'What'), F('amount', 'Amount', 'money', { half: 1 }), F('date', 'Date', 'date', { half: 1 }),
      F('category', 'Category', 'rel', { to: 'fcats', half: 1 }), F('account', 'Paid from', 'rel', { to: 'faccounts', half: 1 }), F('tags', 'Tags', 'multi', { options: ['wishlist', 'verhuizen'] }), F('receipt', 'Receipt photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['-date', 'Newest'], ['-amount', 'Biggest'], ['name', 'A to Z']],
    sub: r => [niceDate(r.date), relName(r.category), relName(r.account), r.bill ? 'bill' : r.debt ? 'debt payment' : '', isWishTx(r) ? 'wishlist' : ''].filter(Boolean).join(' · '),
    side: r => eur(num(r.amount)),
    total: l => { const t = l.reduce((n, r) => n + (num(r.amount) || 0), 0); return `<div class="tiles lt3 ltotal">${fTile('Spent', eur(t), plural(l.length, 'line'))}${fTile('Average', eur(l.length ? t / l.length : 0), 'per line')}${fTile('Biggest', eur(Math.max(0, ...l.map(r => num(r.amount) || 0))), '')}</div>`; }
  },
  fincome: {
    one: 'payment in', many: 'Money in', facet: 'type',
    fields: [F('name', 'From'), F('amount', 'Amount', 'money', { half: 1 }), F('date', 'Date', 'date', { half: 1 }),
      F('type', 'Type', 'select', { options: ['Pay', 'Other'], half: 1 }), F('account', 'Into', 'rel', { to: 'faccounts', half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['-date', 'Newest'], ['-amount', 'Biggest']],
    sub: r => [niceDate(r.date), r.type, relName(r.account)].filter(Boolean).join(' · '), side: r => '+' + eur(num(r.amount)),
    total: l => { const t = l.reduce((n, r) => n + (num(r.amount) || 0), 0); return `<div class="tiles lt3 ltotal">${fTile('Money in', eur(t), plural(l.length, 'line'))}${fTile('Average', eur(l.length ? t / l.length : 0), 'per line')}${fTile('Biggest', eur(Math.max(0, ...l.map(r => num(r.amount) || 0))), '')}</div>`; }
  },
  fbills: {
    one: 'repeat', many: 'Repeats', facet: 'type',
    fields: [F('name', 'Name'), F('amount', 'Amount', 'money', { half: 1 }), F('type', 'Type', 'select', { options: ['Bill', 'Subscription', 'Insurance', 'Debt'], half: 1 }),
      F('cadence', 'How often', 'select', { options: ['Monthly', 'Every N months', 'Yearly', 'Weekly'], half: 1 }), F('every', 'Every how many', 'num', { half: 1 }),
      F('anchor', 'First due', 'date', { half: 1 }), F('ends', 'Ends', 'date', { half: 1 }),
      F('account', 'Paid from', 'rel', { to: 'faccounts', half: 1 }), F('category', 'Category', 'rel', { to: 'fcats', half: 1 }),
      F('debt', 'Pays off debt', 'rel', { to: 'fdebts', half: 1 }), F('pot', 'Saved up in pot', 'rel', { to: 'faccounts', half: 1 }), F('trialEnds', 'Free trial ends', 'date', { half: 1 }), F('active', 'Active', 'check', { half: 1 }), F('url', 'Link', 'url'), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['-amount', 'Biggest']], hide: r => r.active === false, hideLabel: 'Show stopped',
    sub: r => { const n = fNext(r); return [r.type, fCadence(r), n ? 'next ' + niceDate(n) : 'no next date'].filter(Boolean).join(' · '); },
    side: r => eur(num(r.amount)),
    // what the repeats you see cost together; stopped ones don't count
    total: (l, u) => { const a = l.filter(b => b.active !== false), m = a.reduce((n, b) => n + fPerMonth(b), 0); return insMoveNote() + `<div class="tiles lt3 ltotal">${fTile(esc({ Bill: 'Bills', Subscription: 'Subscriptions', Insurance: 'Insurances', Debt: 'Debts' }[u.facet] || 'Repeats'), String(a.length), 'active')}${fTile('Per month', eur(m), 'all together')}${fTile('Per year', eur(12 * m), 'all together')}</div>`; }
  },
  fpaid: {
    one: 'paid bill', many: 'Paid bills',
    fields: [F('bill', 'Repeat', 'rel', { to: 'fbills', half: 1 }), F('date', 'Was due', 'date', { half: 1 }), F('paid', 'Paid', 'check', { half: 1 }), F('skipped', 'Skipped', 'check', { half: 1 }), F('paidOn', 'Paid on', 'date')],
    title: r => relName(r.bill) || 'Bill', sorts: [['-date', 'Newest']], sub: r => [niceDate(r.date), r.skipped ? 'skipped' : r.paid ? 'paid ' + niceDate(r.paidOn) : ''].filter(Boolean).join(' · ')
  },
  fcats: {
    one: 'category', many: 'Your plan',
    fields: [F('name', 'Name'), F('emoji', 'Emoji', 'text', { half: 1 }), F('budget', 'Budget per pay', 'money', { half: 1 }),
      F('rollover', 'Rolls over (what is left carries into the next period)', 'check'), F('nospend', 'Not spending (moving money to my own savings)', 'check'), F('notes', 'Notes', 'long')],
    title: r => [r.emoji, r.name].filter(Boolean).join(' ') || 'Category', sorts: [['-budget', 'Biggest budget'], ['name', 'A to Z']],
    sub: r => { const s = fSpentBy(r.id); if (r.nospend) return `${eur(fSum(recs('ftx').filter(x => x.category === r.id && x.date >= fStart() && x.date <= today())))} moved this pay · not counted as spending`; return num(r.budget) ? `${eur(s)} of ${eur(num(r.budget))} this pay` : `${eur(s)} this pay`; }
  },
  fdebts: {
    one: 'debt', many: 'Debts',
    fields: [F('name', 'Name'), F('balance', 'Balance at start', 'money', { half: 1 }), F('opened', 'Start date', 'date', { half: 1 }),
      F('apr', 'Interest %', 'num', { half: 1 }), F('payment', 'Monthly payment', 'money', { half: 1 }), F('dueDay', 'Due on day', 'num', { half: 1 }),
      F('account', 'Card account', 'rel', { to: 'faccounts', half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['-balance', 'Biggest']], sub: r => [num(r.payment) ? eur(num(r.payment)) + ' a month' : '', num(r.apr) ? r.apr + '% interest' : ''].filter(Boolean).join(' · '),
    side: r => eur(fDebtBal(r))
  },
  fchips: {
    one: 'quick add', many: 'Quick adds',
    fields: [F('name', 'Label'), F('emoji', 'Emoji', 'text', { half: 1 }), F('amount', 'Amount', 'money', { half: 1 }),
      F('category', 'Category', 'rel', { to: 'fcats', half: 1 }), F('account', 'Paid from', 'rel', { to: 'faccounts', half: 1 })],
    title: r => [r.emoji, r.name].filter(Boolean).join(' '), sorts: [['name', 'A to Z']], sub: r => relName(r.category), side: r => eur(num(r.amount))
  },
  frules: {
    one: 'sort rule', many: 'Sort rules',
    fields: [F('contains', 'When the name contains'), F('category', 'Put it in', 'rel', { to: 'fcats', half: 1 }), F('rename', 'Rename it to', 'text', { half: 1 })],
    title: r => r.contains ? `“${r.contains}”` : 'Sort rule', sorts: [['contains', 'A to Z']],
    sub: r => ['→ ' + (relName(r.category) || 'no category'), r.rename && 'renamed to ' + r.rename].filter(Boolean).join(' · ')
  },
  fset: {
    one: 'setting', many: 'Money settings',
    fields: [F('payday', 'Next payday', 'date', { half: 1 }), F('payAmount', 'Expected pay', 'money', { half: 1 }),
      F('buffer', 'Safety buffer', 'money', { half: 1 }), F('cycle', 'Paid', 'select', { options: ['Monthly'], half: 1 })],
    title: () => 'Payday and buffer', sub: r => [r.payday && 'payday ' + niceDate(fPayday() || r.payday), num(r.payAmount) ? eur(num(r.payAmount)) : '', 'buffer ' + eur(num(r.buffer) ?? 100)].filter(Boolean).join(' · ')
  },
  fgoals: {
    one: 'goal', many: 'Goals',
    fields: [F('name', 'Saving for'), F('target', 'Target', 'money', { half: 1 }), F('saved', 'Saved so far', 'money', { half: 1 }),
      F('by', 'Want it by', 'date', { half: 1 }), F('account', 'Kept in', 'rel', { to: 'faccounts', half: 1 }), F('done', 'Reached', 'check', { half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['by', 'Soonest'], ['-target', 'Biggest']], hide: r => r.done, hideLabel: 'Show reached',
    sub: r => { const t = num(r.target) || 0, s = num(r.saved) || 0, left = Math.max(0, t - s), m = r.by ? Math.max(1, Math.round(diffDays(today(), r.by) / 30.4)) : 0; return [t ? `${eur(s)} of ${eur(t)} (${Math.round(100 * s / t)}%)` : eur(s), r.by && left ? `${eur(left / m)} a month to make ${shortDate(r.by)}` : ''].filter(Boolean).join(' · '); },
    quick: r => ({ on: !!r.done, label: 'Reached', act: () => save(r, { done: !r.done }) })
  },
  fchall: {
    one: 'challenge', many: 'Challenges',
    fields: [F('name', 'Challenge'), F('start', 'Starts', 'date', { half: 1 }), F('end', 'Ends', 'date', { half: 1 }),
      F('category', 'Category to skip', 'rel', { to: 'fcats', half: 1 }), F('limit', 'Spend at most', 'money', { half: 1 }), F('done', 'Done', 'check', { half: 1 }), F('notes', 'The rule', 'long')],
    sorts: [['-start', 'Newest']], hide: r => r.done, hideLabel: 'Show done',
    sub: r => { const sp = r.category && r.start ? fSum(recs('ftx').filter(x => x.category === r.category && x.date >= r.start && x.date <= (r.end || today()))) : null; return [r.start && `${shortDate(r.start)} – ${shortDate(r.end) || 'open'}`, sp != null ? `${eur(sp)} spent${num(r.limit) != null ? ' of ' + eur(num(r.limit)) : ''}` : ''].filter(Boolean).join(' · '); },
    quick: r => ({ on: !!r.done, label: 'Done', act: () => save(r, { done: !r.done }) })
  },
  fgrid: {
    one: 'savings challenge', many: 'Savings challenges',
    fields: [F('name', 'Name'), F('preset', 'Tiles', 'select', { options: Object.keys(GRID_PRESETS) }), F('amounts', 'Or your own amounts (like 5, 10, 20)'),
      F('goal', 'Counts toward goal', 'rel', { to: 'fgoals', half: 1 }), F('done', 'Finished', 'check', { half: 1 })],
    title: r => r.name || r.preset || 'Savings challenge', sorts: [['name', 'A to Z']],
    sub: r => { const t = gridTiles(r); return `${eur(gridPut(r))} of ${eur(t.reduce((a, b) => a + b, 0))} · ${gridFilled(r).size} of ${t.length} tiles`; }
  },
  fwait: {
    one: 'wait-list item', ones: 'items', many: 'Wait list', facet: 'status',
    fields: [F('name', 'What'), F('price', 'Price', 'money', { half: 1 }), F('added', 'Added on', 'date', { half: 1 }),
      F('wait', 'Wait this many hours', 'num', { half: 1 }), F('status', 'Status', 'select', { options: ['Waiting', 'Bought', 'Let go'], half: 1 }), F('url', 'Link', 'url'), F('notes', 'Why I want it', 'long')],
    sorts: [['added', 'Oldest first'], ['-price', 'Priciest']], hide: r => r.status && r.status !== 'Waiting', hideLabel: 'Show bought and let go',
    sub: r => { const h = Math.ceil((waitEnd(r) - Date.now()) / 36e5); return [r.status || 'Waiting', !r.status || r.status === 'Waiting' ? (h > 0 ? `decide in ${h} h` : 'waited long enough, still want it?') : ''].filter(Boolean).join(' · '); },
    side: r => eur(num(r.price))
  },
  sets: {
    one: 'set', many: 'Set log',
    fields: [F('date', 'Date', 'date', { half: 1 }), F('exercise', 'Exercise', 'rel', { to: 'exercises', half: 1 }),
      F('weight', 'Weight', 'num', { unit: 'kg', half: 1 }), F('reps', 'Reps', 'num', { half: 1 }), F('sets', 'Sets', 'num', { half: 1 }), F('notes', 'Notes', 'long')],
    title: r => relName(r.exercise) || 'Set', sorts: [['-date', 'Newest']],
    sub: r => [niceDate(r.date), r.weight != null ? `${r.weight} kg` : '', r.reps ? `${r.sets ? r.sets + ' × ' : ''}${r.reps} reps` : ''].filter(Boolean).join(' · ')
  },
  body: {
    one: 'measurement', many: 'Body',
    fields: [F('date', 'Date', 'date', { half: 1 }), F('weight', 'Weight', 'num', { unit: 'kg', half: 1 }),
      F('waist', 'Waist', 'num', { unit: 'cm', half: 1 }), F('hips', 'Hips', 'num', { unit: 'cm', half: 1 }),
      F('chest', 'Chest', 'num', { unit: 'cm', half: 1 }), F('arm', 'Arm', 'num', { unit: 'cm', half: 1 }),
      F('thigh', 'Thigh', 'num', { unit: 'cm', half: 1 }), F('fat', 'Body fat', 'num', { unit: '%', half: 1 }), F('notes', 'Notes', 'long')],
    title: r => r.date ? niceDate(r.date) : 'Measurement', sorts: [['-date', 'Newest']],
    sub: r => [r.weight != null ? r.weight + ' kg' : '', r.waist ? 'waist ' + r.waist : '', r.hips ? 'hips ' + r.hips : '', r.fat ? r.fat + '% fat' : ''].filter(Boolean).join(' · ')
  },
  fitgoals: {
    one: 'fitness goal', many: 'Fitness goals',
    fields: [F('name', 'Goal'), F('unit', 'Measured in (km, kg, reps, min)', 'text', { half: 1 }), F('due', 'Deadline', 'date', { half: 1 }),
      F('start', 'Start value', 'num', { half: 1 }), F('target', 'Target', 'num', { half: 1 }), F('current', 'Where I am now', 'num', { half: 1 }),
      F('exercise', 'Exercise', 'rel', { to: 'exercises', half: 1 }), F('lgoal', 'Part of life goal', 'rel', { to: 'lgoals', half: 1 }), F('done', 'Reached', 'check', { half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['due', 'Deadline first'], ['name', 'A to Z']], hide: r => r.done, hideLabel: 'Show reached',
    sub: r => [num(r.target) != null ? `${num(r.current) ?? num(r.start) ?? 0} of ${num(r.target)} ${r.unit || ''}`.trim() : '', r.due && !r.done ? 'by ' + shortDate(r.due) : ''].filter(Boolean).join(' · '),
    side: r => fitPct(r) + '%',
    quick: r => ({ on: !!r.done, label: 'Reached', act: () => save(r, { done: !r.done }) })
  },
  vworkouts: {
    one: 'video workout', many: 'Video library', facet: 'type', photo: 'photo', display: 'cards',
    fields: [F('name', 'Name'), F('url', 'Video link', 'url'), F('type', 'Type', 'select', { options: VW_TYPES, half: 1 }), F('minutes', 'Minutes', 'num', { half: 1 }),
      F('instructor', 'Instructor', 'text', { half: 1 }), F('level', 'Level', 'select', { options: ['Beginner', 'Intermediate', 'Advanced'], half: 1 }),
      F('materials', 'Materials', 'multi', { options: ['No equipment', 'Mat', 'Dumbbells', 'Resistance band', 'Ankle weights', 'Pilates ball', 'Kettlebell', 'Bench'] }),
      F('rating', 'Rating', 'rating'), F('fav', 'Pinned', 'check', { half: 1 }), F('photo', 'Cover', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['-fav', 'Pinned first'], ['minutes', 'Shortest'], ['name', 'A to Z']],
    sub: r => [r.instructor, r.minutes && r.minutes + ' min', r.level, vwCount(r) ? `done ${vwCount(r)}×` : ''].filter(Boolean).join(' · '),
    quick: r => ({ on: false, label: 'Do it now', act: () => doVideo(r) })
  },
  fsched: {
    one: 'workout week', many: 'Workout week',
    fields: WEEK.map(([k, l]) => F(k, l, 'rel', { to: 'vworkouts', half: 1 })),
    title: () => 'Workout week',
    sub: r => WEEK.map(([k, l]) => `${l.slice(0, 2)} ${r[k] ? relName(r[k]) : 'rest'}`).join(' · ')
  },
  fitgear: {
    one: 'item', many: 'Fitness gear', facet: 'category',
    fields: [F('name', 'Name'), F('category', 'Category', 'select', { options: ['Weights', 'Mats & Props', 'Cardio', 'Bands', 'Clothing', 'Tech', 'Recovery', 'Other'] }),
      F('own', 'I have this', 'check'), F('price', 'Price', 'money', { half: 1 }), F('bought', 'Bought on', 'date', { half: 1 }),
      F('url', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z']], filters: [['all', 'All'], ['own', 'I have'], ['want', 'Wishlist']],
    filter: (r, f) => f === 'own' ? !!r.own : f === 'want' ? !r.own : true,
    sub: r => [r.category, eur(r.price)].filter(Boolean).join(' · '),
    quick: r => ({ on: !!r.own, label: 'Have it', act: () => save(r, { own: !r.own }) })
  }
,
  /* social: tasks and projects */
  tasks: {
    one: 'task', many: 'Tasks', facet: 'category',
    fields: [F('name', 'Task'), F('date', 'Due', 'date', { half: 1 }), F('status', 'Status', 'select', { options: TASK_STATUS, half: 1 }),
      F('category', 'Category', 'select', { options: TASK_CATS, half: 1 }), F('project', 'Project', 'rel', { to: 'projects', half: 1 }), F('goal', 'Goal', 'rel', { to: 'lgoals', half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['date', 'Due first'], ['name', 'A to Z'], ['-created', 'Newest']],
    filters: [['open', 'To do'], ['today', 'Today'], ['late', 'Overdue'], ['done', 'Done']],
    filter: (r, f) => f === 'done' ? taskDone(r) : taskDone(r) ? false : f === 'today' ? r.date === today() : f === 'late' ? !!r.date && r.date < today() : true,
    sub: r => [r.status && r.status !== 'Not started' && !taskDone(r) ? r.status : '', r.category, relName(r.project)].filter(Boolean).join(' · '),
    side: r => taskDone(r) ? (r.doneOn ? 'done ' + shortDate(r.doneOn) : '') : r.date ? (r.date < today() ? 'overdue' : r.date === today() ? 'today' : relDay(r.date)) : '',
    quick: r => ({ on: taskDone(r), label: 'Done', act: () => save(r, taskDone(r) ? { status: 'Not started', doneOn: '' } : { status: 'Completed', doneOn: today() }) })
  },
  projects: {
    one: 'project', many: 'Projects', facet: 'priority',
    fields: [F('name', 'Project'), F('status', 'Status', 'select', { options: TASK_STATUS, half: 1 }), F('priority', 'Priority', 'select', { options: ['High', 'Medium', 'Low'], half: 1 }),
      F('start', 'Start', 'date', { half: 1 }), F('end', 'Deadline', 'date', { half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['end', 'Deadline first'], ['name', 'A to Z'], ['-created', 'Newest']],
    hide: r => r.status === 'Completed', hideLabel: 'Show completed',
    sub: r => { const t = projTasks(r), d = t.filter(taskDone).length; return [r.status && r.status !== 'Not started' ? r.status : '', r.priority && r.priority + ' priority', t.length ? `${d} of ${t.length} tasks done` : 'no tasks yet', r.end && 'deadline ' + shortDate(r.end)].filter(Boolean).join(' · '); },
    side: r => { const t = projTasks(r); return t.length ? Math.round(100 * t.filter(taskDone).length / t.length) + '%' : ''; }
  },
  /* life: habits, routines, gifts and documents */
  habits: {
    one: 'habit', many: 'Habits',
    fields: [F('name', 'Habit'), F('onDays', 'Days', 'multi', { options: WEEKDAYS }), F('per', 'Or: times a week', 'num', { half: 1 }), F('area', 'Area', 'select', { options: TASK_CATS, half: 1 }), F('goal', 'Goal', 'rel', { to: 'lgoals', half: 1 }),
      F('why', 'Why it matters', 'long'), F('paused', 'Paused', 'check')],
    sorts: [['name', 'A to Z'], ['-created', 'Newest']],
    hide: r => !!r.paused, hideLabel: 'Show paused',
    sub: r => [`${weekDone(r)} of ${perWeek(r)} this week`, daysLabel(r), streak(r)].filter(Boolean).join(' · '),
    quick: r => ({ on: daysSet(r).has(today()), label: 'Today', act: () => toggleDay(r) })
  },
  routines: {
    one: 'routine step', many: 'Routines', facet: 'routine',
    fields: [F('name', 'Activity'), F('routine', 'Routine', 'select', { options: ROUTINES, half: 1 }),
      F('onDays', 'Days', 'multi', { options: WEEKDAYS }), F('notes', 'Notes', 'long')],
    sorts: [['routine', 'By routine'], ['name', 'A to Z']],
    sub: r => [r.routine, daysLabel(r) || r.freq, r.notes].filter(Boolean).join(' · '),
    quick: r => ({ on: routineDone(r), label: r.routine === 'Weekly' ? 'This week' : r.routine === 'Monthly' ? 'This month' : 'Today', act: () => toggleDay(r) })
  },
  lgoals: {
    one: 'goal', many: 'Goals', facet: 'area',
    fields: [F('name', 'Goal'), F('area', 'Life area', 'select', { options: AREAS, half: 1 }), F('term', 'Term', 'select', { options: ['Short term', 'Middle term', 'Long term'], half: 1 }),
      F('status', 'Status', 'select', { options: TASK_STATUS, half: 1 }), F('progress', 'Progress % (when it has no tasks)', 'num', { half: 1 }),
      F('start', 'Start', 'date', { half: 1 }), F('due', 'Deadline', 'date', { half: 1 }), F('why', 'Why it matters', 'long'), F('notes', 'Notes', 'long')],
    sorts: [['due', 'Deadline first'], ['name', 'A to Z'], ['-created', 'Newest']],
    filters: [['open', 'Active'], ['done', 'Completed'], ['all', 'All']],
    filter: (r, f) => f === 'done' ? r.status === 'Completed' : f === 'open' ? r.status !== 'Completed' : true,
    sub: r => { const ts = goalTasks(r), hs = recs('habits').filter(h => [].concat(h.goal || []).includes(r.id)); return [r.area, r.term, ts.length ? `${ts.filter(t => t.status === 'Completed').length} of ${ts.length} tasks` : '', hs.length ? plural(hs.length, 'habit') : '', r.due && r.status !== 'Completed' ? 'due ' + shortDate(r.due) : ''].filter(Boolean).join(' · '); },
    side: r => goalPct(r) + '%',
    quick: r => ({ on: r.status === 'Completed', label: 'Done', act: () => save(r, { status: r.status === 'Completed' ? 'In progress' : 'Completed' }) })
  },
  courses: {
    one: 'course', many: 'Courses', facet: 'status', photo: 'photo',
    fields: [F('name', 'Course'), F('status', 'Status', 'select', { options: TASK_STATUS, half: 1 }), F('category', 'Category', 'select', { options: ['AI', 'Business', 'Marketing', 'Design', 'Language', 'Economics', 'Health', 'Creative'], half: 1 }),
      F('platform', 'Platform', 'select', { options: ['Udemy', 'Coursera', 'LinkedIn Learning', 'FutureLearn', 'Skillshare', 'YouTube', 'In person'], half: 1 }), F('institution', 'Institution', 'text', { half: 1 }),
      F('total', 'Modules', 'num', { half: 1 }), F('done', 'Modules done', 'num', { half: 1 }), F('start', 'Started', 'date', { half: 1 }), F('cost', 'Cost', 'money', { half: 1 }),
      F('goal', 'Goal', 'rel', { to: 'lgoals', half: 1 }), F('url', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['status', 'By status'], ['name', 'A to Z']],
    hide: r => r.status === 'Completed', hideLabel: 'Show completed',
    sub: r => [r.platform || r.institution, num(r.total) ? `${num(r.done) || 0} of ${num(r.total)} modules` : '', eur(num(r.cost))].filter(Boolean).join(' · '),
    side: r => num(r.total) ? Math.round(100 * (num(r.done) || 0) / num(r.total)) + '%' : '',
    quick: r => num(r.total) && r.status !== 'Completed' ? ({ on: false, label: '+1 module', act: () => { const d = Math.min(num(r.total), (num(r.done) || 0) + 1); save(r, { done: d, status: d >= num(r.total) ? 'Completed' : 'In progress' }); } }) : null
  },
  hobbies: {
    one: 'hobby', ones: 'hobbies', many: 'Hobbies', facet: 'type', photo: 'photo',
    fields: [F('name', 'Hobby'), F('type', 'Type', 'multi', { options: ['Creative', 'Physical', 'Social', 'Learning', 'Outdoor', 'Relaxation'], half: 1 }),
      F('level', 'Skill level', 'select', { options: ['Want to try', 'Beginner', 'Intermediate', 'Advanced'], half: 1 }), F('time', 'Time it takes', 'text', { half: 1 }), F('start', 'Started', 'date', { half: 1 }),
      F('needs', 'What I need', 'long'), F('ideas', 'Ideas and projects', 'long'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['-created', 'Newest']],
    sub: r => [[].concat(r.type || []).join(', '), r.level, r.time].filter(Boolean).join(' · ')
  },
  wishes: {
    one: 'wish', ones: 'wishes', many: 'Master wishlist', facet: 'category', photo: 'photo', display: 'cards',
    fields: [F('name', 'Item'), F('category', 'Wishlist', 'select', { options: WISH_CATS, half: 1 }), F('type', 'Type', 'text', { half: 1 }),
      F('brand', 'Brand', 'text', { half: 1 }), F('shop', 'Shop', 'text', { half: 1 }), F('price', 'Price', 'money', { half: 1 }), F('color', 'Colour', 'text', { half: 1 }),
      F('priority', 'Priority', 'select', { options: WISH_PRIO, half: 1 }), F('status', 'Status', 'select', { options: ['Wish', 'Ordered', 'Bought', 'Dropped'], half: 1 }),
      F('since', 'On the list since', 'date', { half: 1 }), F('by', 'Want it by', 'date', { half: 1 }), F('wait', 'Wait this many hours first', 'num', { half: 1 }), F('planBuy', 'Plan to buy on', 'date', { half: 1 }), F('url', 'Link', 'url'),
      F('why', 'Why do I want this?', 'long'), F('specs', 'Specifications', 'long'), F('fav', 'Favourite', 'check', { half: 1 }), F('archived', 'Archived', 'check', { half: 1 }), F('photo', 'Photo', 'photo')],
    sorts: [['-created', 'Newest'], ['since', 'Longest on the list'], ['-price', 'Priciest'], ['price', 'Cheapest'], ['name', 'A to Z']],
    hide: r => r.archived || ['Bought', 'Dropped'].includes(r.status), hideLabel: 'Show bought and archived',
    sub: r => [r.brand, r.type, eur(num(r.price)), r.status && r.status !== 'Wish' ? r.status : '', daysSince(r.since || (r.created && iso(new Date(r.created)))) != null ? daysSince(r.since || iso(new Date(r.created))) + ' days on the list' : ''].filter(Boolean).join(' · '),
    quick: r => ({ on: r.status === 'Bought', label: 'Bought', act: () => r.status === 'Bought' ? save(r, { status: 'Wish' }) : buyWish('wishes', r.id) })
  },
  winbox: {
    one: 'link', many: 'Inbox', facet: 'status',
    fields: [F('name', 'Link or name'), F('note', 'Note', 'long'), F('status', 'Status', 'select', { options: ['New', 'Done'], half: 1 }), F('added', 'Added', 'date', { half: 1 })],
    title: r => r.name ? String(r.name).replace(/^https?:\/\/(www\.)?/, '').slice(0, 70) : 'Link', sorts: [['-created', 'Newest']],
    hide: r => r.status === 'Done', hideLabel: 'Show done',
    sub: r => [r.note, r.added ? relDay(r.added) : ''].filter(Boolean).join(' · '),
    quick: r => r.status === 'Done' ? null : ({ on: false, label: 'Make a wish', act: () => wishFromInbox(r) })
  },
  gifts: {
    one: 'gift', many: 'Gifts', facet: 'status', photo: 'photo',
    fields: [F('name', 'Gift'), F('for', 'For'), F('date', 'Date (birthday or moment)', 'date', { half: 1 }), F('occasion', 'Occasion', 'select', { options: ['Birthday', 'Christmas', 'Sinterklaas', 'Anniversary', "Mother's Day", "Father's Day", 'Graduation', 'Housewarming', 'Baby shower', 'Thank you'], half: 1 }),
      F('status', 'Status', 'select', { options: GIFT_STATUS, half: 1 }), F('type', 'Type', 'select', { options: ['Physical', 'Experience', 'DIY', 'Subscription', 'Digital', 'Card'], half: 1 }),
      F('price', 'Price', 'money', { half: 1 }), F('shop', 'Where to buy', 'text', { half: 1 }), F('given', 'Given on', 'date', { half: 1 }),
      F('url', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['for', 'By person'], ['-created', 'Newest'], ['name', 'A to Z']],
    hide: r => r.status === 'Given', hideLabel: 'Show given',
    sub: r => [r.for && 'for ' + r.for, r.occasion, r.status, eur(r.price)].filter(Boolean).join(' · ')
  },
  stays: {
    one: 'stay', many: 'Saved stays', facet: 'country', photo: 'photo', display: 'cards',
    fields: [F('name', 'Name'), F('photo', 'Photo', 'photo'), F('type', 'Type', 'select', { options: ['Hotel', 'Airbnb', 'Apartment', 'B&B', 'Hostel', 'Resort', 'Other'], half: 1 }),
      F('status', 'Status', 'select', { options: ['Saved', 'Shortlist', 'Booked', 'Stayed'], half: 1 }),
      F('city', 'City', 'text', { half: 1 }), F('country', 'Country', 'text', { half: 1 }),
      F('price', 'Price per night', 'money', { half: 1 }), F('from', 'Stayed from', 'date', { half: 1 }), F('to', 'Stayed until', 'date', { half: 1 }),
      F('url', 'Link', 'url'), F('site', 'Site', 'text', { half: 1 }),
      F('rating', 'Overall', 'rating'), ...STAY_SCORES.map(([k, l]) => F(k, l, 'rating')),
      F('again', 'Would stay again', 'check', { half: 1 }), F('pros', 'What was good', 'long', { rows: 3 }), F('cons', 'What could be better', 'long', { rows: 3 }), F('notes', 'Notes', 'long')],
    sorts: [['country', 'Country'], ['name', 'A to Z'], ['-created', 'Newest'], ['-score', 'Best reviewed']],
    sub: r => [r.type, [r.city, r.country].filter(Boolean).join(', '), r.from ? 'stayed ' + fromISO(r.from).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : r.status && r.status !== 'Saved' ? r.status.toLowerCase() : '', stayScore(r) ? '★ ' + stayScore(r).toFixed(1) : ''].filter(Boolean).join(' · ')
  },
  insurance: {
    one: 'insurance', ones: 'insurances', many: 'Insurances', facet: 'type',
    fields: [F('name', 'Insurance'), F('type', 'Type', 'select', { options: INS_TYPES, half: 1 }), F('company', 'Company', 'text', { half: 1 }),
      F('amount', 'Premium', 'money', { half: 1 }), F('billing', 'Paid', 'select', { options: ['Monthly', 'Quarterly', 'Yearly'], half: 1 }),
      F('deductible', 'Eigen risico', 'money', { half: 1 }), F('status', 'Status', 'select', { options: ['Active', 'Stopped'], half: 1 }),
      F('start', 'Started', 'date', { half: 1 }), F('renews', 'Renews or ends', 'date', { half: 1 }), F('notice', 'Notice period', 'text', { half: 1 }), F('policy', 'Policy number', 'text', { half: 1 }),
      F('covers', 'What it covers', 'long'), F('url', 'Link', 'url'), F('notes', 'Notes', 'long')],
    sorts: [['type', 'Type'], ['-amount', 'Priciest'], ['renews', 'Renews first']],
    hide: r => r.status === 'Stopped', hideLabel: 'Show stopped',
    sub: r => [r.type !== r.name ? r.type : '', r.company, insMonthly(r) ? eur(insMonthly(r)) + ' a month' : '', num(r.deductible) ? 'eigen risico ' + eur(num(r.deductible)) : ''].filter(Boolean).join(' · '),
    side: r => r.renews && r.status !== 'Stopped' && r.renews >= today() && diffDays(today(), r.renews) <= 60 ? 'renews ' + shortDate(r.renews) : ''
  },
  orders: {
    one: 'order', many: 'Online orders', facet: 'status', photo: 'photo',
    fields: [F('name', 'What'), F('shop', 'Shop', 'text', { half: 1 }), F('price', 'Price', 'money', { half: 1 }),
      F('status', 'Status', 'select', { options: ORDER_STATUS, half: 1 }), F('ordered', 'Ordered on', 'date', { half: 1 }),
      F('expected', 'Expected', 'date', { half: 1 }), F('received', 'Received on', 'date', { half: 1 }), F('returnBy', 'Return by', 'date', { half: 1 }),
      F('track', 'Track and trace', 'url'), F('url', 'Product link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['expected', 'Arrives first'], ['-ordered', 'Newest'], ['returnBy', 'Return first']],
    hide: r => ['Kept', 'Returned'].includes(r.status), hideLabel: 'Show kept and returned',
    sub: r => [r.shop, r.status, eur(num(r.price)), !r.received && r.expected ? 'arrives ' + relDay(r.expected) : ''].filter(Boolean).join(' · '),
    side: r => r.status === 'Delivered' && r.returnBy ? (r.returnBy < today() ? 'return period over' : 'return by ' + shortDate(r.returnBy)) : r.status === 'Returning' && r.returnBy ? 'send by ' + shortDate(r.returnBy) : '',
    quick: r => ['Kept', 'Returned'].includes(r.status) ? null : r.status === 'Delivered' ? ({ on: false, label: 'Keep', act: () => save(r, { status: 'Kept' }) }) : ({ on: false, label: 'Received', act: () => save(r, { status: 'Delivered', received: today(), returnBy: r.returnBy || addDays(today(), 14) }) })
  },
  vision: {
    one: 'dream', many: 'Vision board', facet: 'area', photo: 'photo', display: 'cards',
    fields: [F('name', 'Dream or picture'), F('photo', 'Picture', 'photo'), F('area', 'Life area', 'select', { options: AREAS, half: 1 }), F('by', 'By', 'date', { half: 1 }),
      F('why', 'Why it matters to me', 'long', { rows: 3 }), F('goal', 'Goal that brings me there', 'rel', { to: 'lgoals', half: 1 }), F('done', 'It came true', 'check', { half: 1 }), F('url', 'Link', 'url')],
    sorts: [['area', 'Life area'], ['-created', 'Newest']],
    sub: r => [r.area, r.by ? 'by ' + shortDate(r.by) : '', r.done ? 'came true' : ''].filter(Boolean).join(' · ')
  },
  discover: {
    one: 'exercise', many: 'Self discovery', facet: 'type',
    fields: [F('name', 'Exercise'), F('type', 'Theme', 'select', { options: DISC_TYPES, half: 1 }), F('status', 'Status', 'select', { options: ['Not started', 'In progress', 'Done'], half: 1 }),
      F('prompts', 'Questions to answer', 'long', { rows: 5 }), F('answers', 'My answers', 'long', { rows: 10 }), F('insight', 'What I learned', 'long', { rows: 3 }), F('date', 'Done on', 'date', { half: 1 })],
    sorts: [['status', 'Status'], ['name', 'A to Z']],
    sub: r => [r.type, r.status || 'Not started', r.insight ? String(r.insight).slice(0, 70) : ''].filter(Boolean).join(' · '),
    quick: r => ({ on: r.status === 'Done', label: 'Done', act: () => save(r, r.status === 'Done' ? { status: 'In progress' } : { status: 'Done', date: r.date || today() }) })
  },
  moodboard: {
    one: 'inspiratie', ones: 'inspiratie', many: 'Moodboard', facet: 'room', photo: 'photo', display: 'cards',
    fields: [F('name', 'Wat'), F('photo', 'Foto', 'photo'), F('room', 'Kamer', 'select', { options: ROOMS, half: 1 }), F('style', 'Stijl', 'text', { half: 1 }),
      F('colours', 'Kleuren en materialen', 'text'), F('item', 'Hoort bij (verhuislijst)', 'rel', { to: 'inventory', half: 1 }), F('fav', 'Favoriet', 'check', { half: 1 }),
      F('link', 'Link', 'url'), F('why', 'Wat ik er mooi aan vind', 'long', { rows: 3 })],
    sorts: [['room', 'Kamer'], ['-fav', 'Favorieten'], ['-created', 'Nieuwste']],
    sub: r => [r.room, r.style, r.colours].filter(Boolean).join(' · ')
  },
  documents: {
    one: 'document', many: 'Documents', facet: 'category',
    fields: [F('name', 'Document'), F('category', 'Category', 'select', { options: ['Personal', 'Health', 'Household', 'Financial', 'Work', 'Business'], half: 1 }),
      F('type', 'Type', 'multi', { options: ['Identity', 'Financial', 'Legal', 'Insurance', 'Contract', 'Educational', 'Relationship'], half: 1 }),
      F('location', 'Where it is', 'select', { options: ['Google Drive', 'Dropbox', 'Computer', 'Phone', 'Wallet', 'Cabinet', 'Safe'], half: 1 }),
      F('expires', 'Expires', 'date', { half: 1 }), F('url', 'Link', 'url'), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['expires', 'Expires first']],
    sub: r => [r.category, [].concat(r.type || []).join(', '), r.location].filter(Boolean).join(' · '),
    side: r => r.expires ? (r.expires < today() ? 'expired' : diffDays(today(), r.expires) <= 60 ? 'expires ' + shortDate(r.expires) : '') : ''
  }
};
for (const [k, K] of Object.entries(KINDS)) K.kind = k;
const titleOf = r => { const K = KINDS[r.kind]; return (K?.title ? K.title(r) : r.name) || 'Untitled'; };

/* ---------- overview tiles ----------
   Each area gives the overview page one small card: what matters today, with the quick ticks that work
   everywhere (data-act). A new area only needs a `tile` in SECTIONS below to show up there too. */
const tileBody = (bits) => bits.filter(Boolean).join('');
// the parts of each card you can switch off in Arrange (prefs.dash.parts); water starts off
const TILE_PARTS = {
  kitchen: [['meals', 'Meals today'], ['groc', 'Grocery list']],
  care: [['trip', 'Next trip'], ['quit', 'Smoke-free'], ['water', 'Water'], ['sups', 'Supplements'], ['cycle', 'Cycle'], ['appt', 'Next appointment'], ['skin', 'Skincare'], ['routine', 'Routine'], ['sleep', 'Sleep'], ['journal', 'Journal']],
  money: [['safe', 'Safe to spend'], ['payday', 'Until payday'], ['bill', 'Next bill']],
  home: [['chores', 'Chores'], ['plants', 'Plants']],
  wish: [['count', 'Number of wishes'], ['total', 'Total price'], ['inbox', 'Inbox']],
  social: [['tasks', 'Tasks'], ['posts', 'Posting today'], ['next', 'Next deadline']],
  fit: [['video', 'Today’s video'], ['workouts', 'Workouts'], ['week', 'This week']]
};
const TILE_OFF = { care: ['water'] };
const partsOff = sec => C.prefs().dash?.parts?.[sec] || TILE_OFF[sec] || [];
const part = (sec, k, html) => partsOff(sec).includes(k) ? '' : html;
const tileList = (list, n = 3) => list.length ? `<div class="lrows">${list.slice(0, n).map(row).join('')}</div>${list.length > n ? `<p class="lnone">+${list.length - n} more</p>` : ''}` : '';
function kitchenTile() {
  const t = today(), meals = recs('meals').filter(m => m.date === t), groc = recs('ingredients').filter(i => i.list).length;
  return tileBody([
    part('kitchen', 'meals', `<div class="lslots">${MEALS.filter(s => s !== 'Snack' || meals.some(m => m.slot === s)).map(s => { const m = meals.filter(x => x.slot === s); return `<div class="lslot"><span class="rowlbl">${s}</span>${m.map(x => `<button class="chip" data-act="open" data-id="${x.id}">${esc(titleOf(x))}</button>`).join('')}<button class="chip ghost" data-act="slot" data-date="${t}" data-slot="${s}" aria-label="Plan ${s.toLowerCase()}">+</button></div>`; }).join('')}</div>`),
    part('kitchen', 'groc', `<button class="chip link" data-act="go" data-v="kitchen/groceries">${groc ? plural(groc, 'thing') + ' on your grocery list' : 'Grocery list is empty'}</button>`)
  ]);
}
// evening skincare follows the week schedule: products tagged for tonight's kind of evening (or for every evening),
// and on an acid night the acids are offered as a choice, never all at once
const nightOf = (d = new Date()) => recs('bsched')[0]?.[['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()]] || '';
/* Skincare: each product has the weekdays it is used in the morning and the evening. Products set up the old way
   (a morning or evening tick, maybe with evening themes from the week schedule) count on the days that matches. */
const skinUsable = b => !b.finished && !b.archived && !b.wish;
const themeDays = themes => WEEKDAYS.filter(d => themes.includes(recs('bsched')[0]?.[d.toLowerCase()] || ''));
const amDaysOf = b => Array.isArray(b.amDays) ? b.amDays : b.am ? [...WEEKDAYS] : [];
const pmDaysOf = b => Array.isArray(b.pmDays) ? b.pmDays : !b.pm ? [] : (b.nights || []).length ? themeDays(b.nights) : b.acid ? themeDays(['Acid night']) : [...WEEKDAYS];
const skinPlan = () => recs('skinplan')[0];
function skinOrder(list) {
  const ord = skinPlan()?.order || [], pos = b => { const i = ord.indexOf(b.id); return i < 0 ? 1000 + SKIN_STEPS.indexOf(b.step || 'Other') * 10 : i; };
  return [...list].sort((a, b) => pos(a) - pos(b) || norm(a.name).localeCompare(norm(b.name)));
}
const skinSlot = (wd, eve) => skinOrder(recs('beauty').filter(b => skinUsable(b) && (eve ? pmDaysOf(b) : amDaysOf(b)).includes(wd)));
function routineFor(eve) {
  const type = eve ? nightOf() : '', ps = skinSlot(wdOf(), eve);
  return { type, ps, pick: [] };
}
const prodChips = ps => ps.map(b => `<button class="chip" data-act="open" data-id="${b.id}">${esc(b.name)}</button>`).join('');
function careTile() {
  const t = today(), w = waterToday(), goal = Number(C.prefs().waterGoal) || 8, glasses = w?.glasses || 0;
  const sups = recs('supplements').filter(s => !s.finished);
  const doses = sups.reduce((n, s) => n + [].concat(s.times?.length ? s.times : ['AM']).length, 0);
  const taken = recs('suplog').filter(l => l.date === t).length;
  const cy = cycleStats();
  const appt = recs('appts').filter(a => !a.done && a.date && a.date >= t).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))[0];
  // the routine that fits the time of day: morning until 3 pm, evening after
  const eve = new Date().getHours() >= 15, rt = routineFor(eve), prods = rt.ps;
  const sl = recs('sleep').find(x => x.date === t), j = recs('journal').find(x => x.date === t);
  return tileBody([
    part('care', 'water', `<div class="lwater small"><button class="iconbtn small" data-act="water" data-v="-1" aria-label="One glass less" ${glasses ? '' : 'disabled'}>${svg(P.minus)}</button><div class="lwv"><b>${glasses}</b><span>of ${goal} glasses</span></div><button class="iconbtn small lplus" data-act="water" data-v="1" aria-label="One more glass">${svg(P.plus)}</button></div>`),
    part('care', 'trip', (() => { const nt = nextTrip(); return nt ? `<p class="dline"><span>${esc(tripName(nt))}</span><b><button class="chip link" data-act="go" data-v="care/trips">${esc(tripWhen(nt))}</button></b></p>` : ''; })()),
    part('care', 'quit', (() => { const st = quitStats(); return st ? `<p class="dline"><span>Smoke-free</span><b><button class="chip link" data-act="go" data-v="kitchen/quit">${plural(st.days, 'day')} · ${fEur0(st.saved)} kept</button></b></p>` : ''; })()),
    part('care', 'sups', doses ? `<p class="dline"><span>Supplements</span><b>${Math.min(taken, doses)} of ${doses} taken</b></p>` : ''),
    partsOff('care').includes('cycle') ? '' : cy.last ? `<p class="dline"><span>Cycle</span><b>${cy.open ? 'period, day ' + cy.day : 'day ' + cy.day + ', next ' + relDay(cy.next)}</b></p>` : '',
    partsOff('care').includes('appt') ? '' : appt ? `<p class="dline"><span>Next appointment</span><b>${esc(titleOf(appt))}, ${esc(relDay(appt.date))}${appt.time ? ' ' + esc(appt.time) : ''}</b></p>` : '',
    partsOff('care').includes('skin') ? '' : prods.length || rt.pick.length ? `<p class="dsub">${eve ? esc(rt.type || 'Evening') : 'Morning'} skincare</p><div class="lwrap">${prodChips(prods)}</div>${rt.pick.length ? `<p class="lnone">Choose one acid:</p><div class="lwrap">${prodChips(rt.pick)}</div>` : ''}` : '',
    part('care', 'routine', routineTile()),
    partsOff('care').includes('sleep') ? '' : sl ? `<p class="dline"><span>Sleep</span><b>${esc([sl.hours ? sl.hours + ' h' : 'logged', sl.quality?.toLowerCase()].filter(Boolean).join(', '))}</b></p>` : '',
    partsOff('care').includes('journal') ? '' : j ? `<p class="dline"><span>Journal</span><b><button class="chip link" data-act="open" data-id="${j.id}">${esc(titleOf(j))}</button></b></p>` : '',
    (sl || partsOff('care').includes('sleep')) && (j || partsOff('care').includes('journal')) ? '' : `<div class="dbtns">${sl || partsOff('care').includes('sleep') ? '' : '<button class="btn small" data-act="new" data-v="sleep">Log last night</button>'}${j || partsOff('care').includes('journal') ? '' : '<button class="btn small" data-act="new" data-v="journal">Write today’s entry</button>'}</div>`
  ]);
}
// the routine that fits the time of day, ticked off right on the card
function routineTile() {
  const rn = routineNow(); if (!rn.list.length) return '';
  const done = rn.list.filter(routineDone).length;
  return `<p class="dsub">${rn.label} routine · ${done} of ${rn.list.length}</p><div class="lwrap">${rn.list.map(r => tick(r.name, routineDone(r), `data-act="quick" data-id="${r.id}"`)).join('')}</div>`;
}
const tasksDue = () => recs('tasks').filter(x => !taskDone(x) && x.date && x.date <= today()).sort((a, b) => a.date.localeCompare(b.date));
function homeTile() {
  const t = today();
  const chores = recs('chores').filter(c => choreDue(c) <= t).sort((a, b) => choreDue(a).localeCompare(choreDue(b)));
  const plants = recs('plants').filter(p => plantDue(p) && plantDue(p) <= t);
  return tileBody([
    part('home', 'chores', chores.length ? `<p class="dsub">Chores due</p>${tileList(chores)}` : `<p class="lnone">${recs('chores').length ? 'All chores done.' : 'No chores yet.'}</p>`),
    part('home', 'plants', plants.length ? `<p class="dsub">Plants to water</p>${tileList(plants, 2)}` : '')
  ]);
}
function socialTile() {
  const t = today(), posts = recs('posts');
  const now = posts.filter(p => p.date === t && p.stage !== 'Posted').sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const next = posts.filter(p => p.stage !== 'Posted' && p.date && p.date > t).sort((a, b) => a.date.localeCompare(b.date))[0];
  const deal = recs('deals').filter(d => d.due && d.due >= t && !['Delivered', 'Paid', 'Declined'].includes(d.status)).sort((a, b) => a.due.localeCompare(b.due))[0];
  const dl = [next && { what: titleOf(next), date: next.date }, deal && { what: deal.name + ' (collab)', date: deal.due }].filter(Boolean).sort((a, b) => a.date.localeCompare(b.date))[0];
  const due = tasksDue();
  return tileBody([
    partsOff('social').includes('tasks') ? '' : due.length ? `<p class="dsub">Tasks today${due.some(x => x.date < t) ? ' and overdue' : ''}</p>${tileList(due, 4)}` : recs('tasks').length ? '<p class="lnone">No tasks due today.</p>' : '',
    part('social', 'posts', now.length ? `<p class="dsub">Posting today</p>${tileList(now)}` : `<p class="lnone">${posts.length ? 'Nothing to post today.' : 'No posts planned yet.'}</p>`),
    partsOff('social').includes('next') ? '' : dl ? `<p class="dline"><span>Next</span><b>${esc(dl.what)}, ${esc(relDay(dl.date))}</b></p>` : ''
  ]);
}
function fitTile() {
  const t = today(), ws = recs('workouts');
  const now = ws.filter(w => w.date === t && !w.skipped);
  const next = ws.filter(w => !w.done && !w.skipped && w.date && w.date > t).sort((a, b) => a.date.localeCompare(b.date))[0];
  const wk = weekStart(0), week = ws.filter(w => w.done && w.date >= wk && w.date <= addDays(wk, 6)).length;
  const vw = todayVW(), vwDone = vw && ws.some(w => w.video === vw.id && w.date === t && w.done);
  return tileBody([
    partsOff('fit').includes('video') ? '' : vw ? `<p class="dsub">Today's video</p><div class="lrow"><button class="lmain" data-act="open" data-id="${vw.id}"><b>${esc(vw.name)}</b><span>${esc(KINDS.vworkouts.sub(vw))}</span></button>${tick(vwDone ? 'Done' : 'Do it now', vwDone, `data-act="${vwDone ? 'open' : 'quick'}" data-id="${vw.id}"`)}</div>` : '',
    partsOff('fit').includes('workouts') ? '' : now.length ? tileList(now) : vw ? '' : '<p class="lnone">No workout today.</p>',
    partsOff('fit').includes('workouts') ? '' : next && !now.length ? `<p class="dline"><span>Next</span><b>${esc(titleOf(next))}, ${esc(relDay(next.date))}</b></p>` : '',
    part('fit', 'week', `<p class="dline"><span>This week</span><b>${plural(week, 'workout')} done</b></p>`),
    now.length || partsOff('fit').includes('workouts') ? '' : '<button class="btn small" data-act="new" data-v="workouts">Plan a workout</button>'
  ]);
}

/* ---------- sections and their pages ---------- */
const SECTIONS = [
  { key: 'plan', label: 'Life', icon: P.target, tile: () => planTile() + bodyTile(),
    groups: { mind: ['Mind', P.pen], body: ['Body', P.pulse], plans: ['Plans', P.star], wish: ['Wishlists', P.heart] },
    // a third layer inside a group: Body › Health, Train, Beauty
    subs: { body: { health: ['Health', P.moon], train: ['Train', P.run], beauty: ['Beauty', P.drop] } },
    views: [['overview', 'Overview', P.grid], ['week', 'Calendar', P.calendar],
      ['plan/mind', 'Overview', P.grid, 'mind'], ['today', 'My year', P.target, 'mind'], ['care/habits', 'Routines', P.repeat, 'mind'], ['care/journal', 'Journal', P.pen, 'mind'], ['care/mindful', 'Mindfulness', P.moon, 'mind'], ['care/growth', 'Growth', P.target, 'mind'], ['care/vision', 'Vision', P.sparkle, 'mind'], ['care/discover', 'Self discovery', P.user, 'mind'], ['plan/mindstats', 'Analyse', P.trend, 'mind'],
      ['body/today', 'Overview', P.grid, 'body'],
      ['care/health', 'Sleep & health', P.moon, 'body', 'health'], ['care/cycle', 'Cycle', P.moon, 'body', 'health'], ['care/supplements', 'Supplements', P.pill, 'body', 'health'], ['body/clean', 'Clean', P.leaf, 'body', 'health'],
      ['fit/workouts', 'Workouts', P.run, 'body', 'train'], ['fit/library', 'Videos', P.star, 'body', 'train'], ['fit/plans', 'Plans', P.list, 'body', 'train'], ['fit/exercises', 'Exercises', P.dumbbell, 'body', 'train'], ['fit/fgoals', 'Goals', P.target, 'body', 'train'], ['fit/body', 'Body', P.scale, 'body', 'train'], ['fit/gear', 'Gear', P.box, 'body', 'train'],
      ['care/beauty', 'Products', P.drop, 'body', 'beauty'], ['care/skin', 'Skincare', P.flask, 'body', 'beauty'], ['care/diary', 'Skin diary', P.camera, 'body', 'beauty'], ['care/bdeals', 'Deals', P.tag, 'body', 'beauty'], ['body/stats', 'Analyse', P.trend, 'body'],
      ['plan/plans', 'Overview', P.grid, 'plans'], ['care/trips', 'Trips', P.plane, 'plans'], ['care/docs', 'Documents', P.doc, 'plans'], ['care/ideas', 'Ideas', P.star, 'plans'], ['care/saved', 'Saved links', P.link, 'plans'], ['care/gifts', 'Gifts', P.gift, 'plans'], ['plan/planstats', 'Analyse', P.trend, 'plans'],
      ['wish/today', 'Overview', P.grid, 'wish'], ['wish/inbox', 'Inbox', P.inbox, 'wish'], ['wish/master', 'Master', P.heart, 'wish'], ['wish/orders', 'Orders', P.box, 'wish'], ['wish/stats', 'Analyse', P.trend, 'wish'], ['todo', 'To do', P.check]] },
  { key: 'kitchen', label: 'Kitchen', icon: P.pot, tile: kitchenTile,
    groups: { food: ['Food', P.book], shop: ['Shop', P.cart] },
    views: [['today', 'Overview', P.grid], ['recipes', 'Recipes', P.book, 'food'], ['meals', 'Meal plan', P.calendar, 'food'], ['groceries', 'Groceries', P.cart, 'shop'], ['deals', 'Deals', P.tag, 'shop'], ['pantry', 'Pantry', P.jar, 'shop'], ['gear', 'Gear', P.spoon, 'shop'], ['shops', 'Shops', P.house, 'shop'], ['stats', 'Analyse', P.trend], ['todo', 'To do', P.check]] },
  { key: 'money', label: 'Finance', icon: P.wallet, tile: moneyTile,
    groups: { plan: ['Plan', P.target], look: ['Review', P.trend] },
    views: [['today', 'Today', P.sun], ['spending', 'Spending', P.coins], ['repeats', 'Repeats', P.repeat], ['plan', 'Goals', P.target, 'plan'], ['debt', 'Debt', P.card, 'plan'], ['insurance', 'Insurance', P.doc, 'plan'], ['forecast', 'Forecast', P.trend, 'plan'], ['year', 'Year', P.calendar, 'look'], ['networth', 'Net worth', P.wallet, 'look'], ['reviews', 'Reviews', P.doc, 'look'], ['todo', 'To do', P.check]] },
  { key: 'home', label: 'Home', icon: P.house, tile: homeTile, views: [['today', 'Overview', P.grid], ['chores', 'Chores', P.broom], ['plants', 'Plants', P.leaf], ['inventory', 'Verhuislijst', P.box], ['mood', 'Moodboard', P.heart], ['repairs', 'Repairs', P.wrench], ['todo', 'To do', P.check]] },
  { key: 'social', label: 'Social', icon: P.phone, tile: socialTile,
    groups: { work: ['Work', P.check], create: ['Create', P.phone], grow: ['Grow', P.trend], library: ['Library', P.book] },
    views: [['today', 'Overview', P.grid], ['tasks', 'Tasks', P.check, 'work'], ['projects', 'Projects', P.list, 'work'], ['ideas', 'Ideas', P.star, 'create'], ['posts', 'Posts', P.phone, 'create'], ['plan', 'Planning', P.calendar, 'create'], ['feed', 'Feed', P.grid, 'create'], ['insights', 'Insights', P.trend, 'grow'], ['pinterest', 'Pinterest', P.heart, 'grow'], ['goals', 'Goals', P.target, 'grow'], ['collabs', 'Collabs', P.handshake, 'grow'], ['income', 'Income', P.coins, 'grow'], ['tips', 'Tips', P.star, 'library'], ['inspo', 'Inspiration', P.heart, 'library'], ['kit', 'Toolkit', P.list, 'library'], ['brand', 'Brand', P.user, 'library'], ['todo', 'To do', P.check]] },
];
// a view is "page" for this section, or a full key when it borrows a page from another area
const vkey = (s, v) => v[0].includes('/') ? v[0] : s.key + '/' + v[0];
const TODO_ADDS = { plan: ['ideas', 'gifts', 'documents', 'wishes', 'orders', 'vision', 'discover', 'beauty', 'supplements', 'exercises', 'vworkouts', 'fitgear', 'plans'], body: ['beauty', 'supplements', 'exercises', 'vworkouts', 'fitgear', 'plans'], kitchen: ['recipes', 'ingredients', 'gear'], care: ['beauty', 'supplements', 'ideas', 'gifts', 'courses', 'documents'], social: ['posts', 'cideas', 'stips', 'inspo', 'deals'], wish: ['wishes'], money: ['fbills', 'fdebts', 'fgoals', 'insurance'], home: ['plants', 'inventory', 'chores', 'moodboard'], fit: ['exercises', 'vworkouts', 'fitgear', 'plans'] };
const PAGES = {
  ...Object.fromEntries(['plan', 'body', 'kitchen', 'care', 'money', 'home', 'wish', 'social', 'fit'].map(sec => [sec + '/todo', { render: host => sectionTodo(host, sec), adds: TODO_ADDS[sec] }])),
  'kitchen/today': { render: kitchenToday, adds: ['meals', 'recipes', 'ingredients', 'mealprep'] },
  'kitchen/deals': { render: dealsPage, adds: ['recipes'] },
  'kitchen/quit': { render: quitPage, adds: ['recipes', 'ingredients'] },
  'kitchen/recipes': { title: 'Recipes', segs: [{ kind: 'recipes' }] },
  'kitchen/stats': { render: kitchenAnalysis, adds: ['recipes', 'meals'] },

  'kitchen/meals': { title: 'Meal plan', segs: [{ key: 'week', label: 'Week', kind: 'meals', fill: weekFill, tools: false }, { key: 'month', label: 'Month', kind: 'meals', fill: monthFill, tools: false }, { kind: 'mealprep' }] },
  'kitchen/groceries': { title: 'Groceries', segs: [{ key: 'list', label: 'Shopping list', kind: 'ingredients', fill: groceryFill, tools: false }] },
  'kitchen/pantry': { title: 'Pantry', segs: [{ kind: 'ingredients' }, { key: 'types', label: 'Per soort', kind: 'ingredients', fill: ingTypesFill, tools: false }, { key: 'freezer', label: 'Freezer', kind: 'ingredients', fill: freezerFill, tools: false }] },
  'kitchen/shops': { title: 'Shops', segs: [{ kind: 'shops', label: 'Your shops' }] },
  'plan/mind': { render: mindOverview, adds: ['journal', 'meditation', 'lgoals', 'habits'] },
  'plan/mindstats': { render: mindAnalysis, adds: ['journal'] },
  'body/stats': { render: bodyAnalysis, adds: ['sleep', 'workouts'] },
  'plan/plans': { render: plansOverview, adds: ['gifts', 'ideas', 'documents'] },
  'plan/planstats': { render: plansAnalysis, adds: ['gifts'] },
  'wish/stats': { render: wishAnalysis, adds: ['wishes', 'orders'] },
  'plan/overview': { render: lifeOverview, adds: ['journal', 'sleep', 'workouts', 'wishes', 'gifts'] },
  'plan/today': { render: planToday, adds: ['habits', 'routines', 'journal', 'lgoals', 'fgoals'] },
  'plan/week': { render: calPage, adds: ['appts', 'workouts', 'meals', 'posts', 'tasks', 'gifts', 'journal'] },
  'body/today': { render: bodyToday, adds: ['sleep', 'workouts', 'cleanlog', 'symptoms', 'cycles'] },
  'body/clean': { render: cleanPage, adds: ['cleanlog'] },
  'social/income': { render: socialIncome, adds: ['ltk', 'deals'] },
  'care/bdeals': { title: 'Beauty deals', segs: [{ key: 'deals', label: 'This week', kind: 'bdeals', fill: bdealFill, tools: false }, { kind: 'bshops' }, { kind: 'bdeals', label: 'All deals' }] },
  'kitchen/gear': { title: 'Kitchen gear', segs: [{ kind: 'gear' }] },
  'care/today': { render: careToday, adds: ['mindful', 'lgoals', 'courses', 'hobbies', 'habits', 'routines', 'journal', 'sleep', 'beauty', 'supplements', 'appts', 'symptoms', 'meditation', 'ideas', 'gifts', 'documents'] },
  'care/beauty': { title: 'Beauty products', segs: [{ kind: 'beauty' }, { kind: 'breviews' }] },
  'care/skin': { render: skinWeek, adds: ['beauty'] },
  'care/diary': { render: skinDiary, adds: ['skinlog'] },
  'care/supplements': { title: 'Supplements', segs: [{ kind: 'supplements' }, { kind: 'suplog' }] },
  'care/cycle': { title: 'Cycle', segs: [{ kind: 'cycles', label: 'Periods', top: cycleTop }] },
  'care/journal': { title: 'Journal', segs: [{ kind: 'journal' }] },
  'care/ideas': { title: 'Ideas', segs: [{ kind: 'ideas' }] },
  'care/habits': { title: 'Routines', segs: [{ kind: 'routines' }, { kind: 'habits', top: habitWeek }] },
  'care/gifts': { title: 'Gifts', segs: [{ kind: 'gifts' }] },
  'care/mindful': { title: 'Mindfulness', segs: [{ kind: 'mindful', top: mindTop }, { kind: 'meditation', label: 'Sessions' }] },
  'care/growth': { title: 'Growth', segs: [{ kind: 'lgoals', top: growthTop }, { kind: 'courses' }, { kind: 'hobbies' }] },
  'care/docs': { title: 'Documents', segs: [{ kind: 'documents' }] },
  'care/vision': { title: 'Vision', segs: [{ kind: 'vision', top: visionTop }] },
  'care/discover': { title: 'Self discovery', segs: [{ kind: 'discover', top: discoverTop }] },
  'wish/orders': { title: 'Online orders', segs: [{ kind: 'orders', top: ordersTop }] },
  'money/insurance': { title: 'Insurance', segs: [{ kind: 'insurance', top: insuranceTop }] },
  'home/mood': { title: 'Moodboard', segs: [{ kind: 'moodboard', top: moodTop }] },
  'care/trips': { render: tripsPage, adds: ['stays'] },
  'social/tasks': { title: 'Tasks', segs: [{ kind: 'tasks' }] },
  'social/projects': { title: 'Projects', segs: [{ kind: 'projects' }] },
  'social/today': { render: socialToday, adds: ['tasks', 'projects', 'posts', 'cideas', 'stips', 'deals', 'sgoals'] },
  'wish/today': { render: wishToday, adds: ['wishes', 'winbox'] },
  'wish/master': { title: 'Master wishlist', segs: [{ key: 'all', label: 'Everything', kind: 'wishes', fill: masterFill, tools: false }, { kind: 'wishes', label: 'Other wishes' }] },
  'wish/inbox': { render: inboxPage, adds: ['winbox'] },
  'care/saved': { title: 'Saved links', segs: [{ kind: 'inbox', fill: savedFill, tools: false }] },
  'wish/oldinbox': { title: 'Old wishlist inbox', segs: [{ kind: 'winbox' }] },
  'social/posts': { title: 'Posts', segs: [{ kind: 'posts' }] },
  'social/feed': { render: socialFeed, adds: ['posts', 'highlights', 'accounts'] },
  'social/ideas': { title: 'Content ideas', segs: [{ kind: 'cideas' }] },
  'social/tips': { title: 'Tips', segs: [{ kind: 'stips' }] },
  'social/plan': { render: socialPlan, adds: ['posts'] },
  'social/goals': { title: 'Goals', segs: [{ kind: 'sgoals' }, { kind: 'accounts' }] },
  'social/collabs': { title: 'Collabs', segs: [{ kind: 'deals' }] },
  'social/brand': { title: 'Brand', segs: [{ kind: 'pillars' }, { kind: 'accounts' }] },
  'social/kit': { title: 'Toolkit', segs: [{ kind: 'stemplates' }, { kind: 'hashsets' }] },
  'social/inspo': { title: 'Inspiration', segs: [{ kind: 'inspo' }] },
  'social/insights': { render: socialInsights, adds: ['posts', 'pillars'] },
  'social/pinterest': { render: socialPinterest, adds: ['posts', 'inspo', 'moodboard'] },
  'care/health': { title: 'Health', segs: [{ kind: 'sleep' }, { kind: 'appts' }, { kind: 'symptoms' }, { kind: 'meditation' }, { kind: 'water' }] },
  'money/today': { render: moneyToday, adds: ['ftx', 'fincome', 'fbills', 'fchecks'] },
  'money/spending': { title: 'Spending', segs: [{ key: 'plan', label: 'Your plan', kind: 'ftx', fill: fEnvFill, tools: false }, { key: 'all', label: 'Everything in and out', kind: 'ftx', fill: fAllFill, tools: false }] },
  'money/repeats': { title: 'Repeats', segs: [{ key: 'coming', label: 'Coming up', kind: 'fbills', fill: fComingFill, tools: false }, { kind: 'fbills', label: 'Repeats' }, { key: 'in', label: 'Money in', kind: 'fincome' }, { key: 'split', label: 'Split my pay', kind: 'fbills', fill: fSplitFill, tools: false }] },
  'money/plan': { title: 'Goals', segs: [{ kind: 'fgoals', top: fGoalsTop }, { key: 'safety', label: 'Safety net', kind: 'fgoals', fill: fSafetyFill, tools: false }, { key: 'chall', label: 'Challenges', kind: 'fgrid', fill: fChallFill, tools: false }, { key: 'wait', label: 'Wait list', kind: 'fwait', fill: fWaitFill, tools: false }] },
  'money/debt': { title: 'Debt', segs: [{ key: 'free', label: 'Debt-free date', kind: 'fdebts', fill: fDebtFreeFill, tools: false }, { key: 'method', label: 'Snowball or avalanche', kind: 'fdebts', fill: fMethodFill, tools: false }, { kind: 'fdebts', label: 'Your debts' }, { key: 'made', label: 'Payments made', kind: 'ftx', fill: fPaymentsFill, tools: false }] },
  'money/forecast': { render: moneyForecast, adds: ['ftx', 'fbills', 'fincome'] },
  'money/year': { render: moneyYear, adds: ['fbills'] },
  'money/networth': { title: 'Net worth', segs: [{ key: 'nw', label: 'Net worth', kind: 'faccounts', fill: fNetFill, tools: false }, { kind: 'faccounts' }, { kind: 'fchecks' }, { kind: 'fset', label: 'Payday and buffer' }] },
  'money/reviews': { render: moneyReviews, adds: ['ftx', 'fincome'] },
  'home/today': { render: homeToday, adds: ['chores', 'plants', 'inventory', 'invopts', 'movecosts', 'repairs'] },
  'home/chores': { title: 'Chores', segs: [{ key: 'plan', label: 'Schedule', kind: 'chores', fill: choreFill, tools: false }, { kind: 'chores', label: 'All chores' }] },
  'home/plants': { title: 'Plants', segs: [{ kind: 'plants' }] },
  'home/inventory': { title: 'Verhuislijst', segs: [{ key: 'rooms', label: 'Per kamer', kind: 'inventory', fill: invRooms, tools: false }, { key: 'status', label: 'Per status', kind: 'inventory', fill: invByStatus, tools: false }, { key: 'prio', label: 'Per prioriteit', kind: 'inventory', fill: invByPrio, tools: false }, { key: 'board', label: 'Moodboard', kind: 'invopts', fill: invBoard, tools: false }, { key: 'analyse', label: 'Analyse', kind: 'inventory', fill: invAnalysis, tools: false }, { kind: 'inventory', label: 'Alle producten' }, { kind: 'invopts', label: 'Opties' }, { kind: 'movecosts', label: 'Verhuiskosten' }] },
  'home/repairs': { title: 'Repairs', segs: [{ kind: 'repairs' }] },
  'fit/today': { render: fitToday, adds: ['workouts', 'vworkouts', 'fitgoals', 'sets', 'body', 'exercises'] },
  'fit/workouts': { title: 'Workouts', segs: [{ kind: 'workouts' }] },
  'fit/library': { title: 'Video workouts', segs: [{ kind: 'vworkouts' }, { key: 'week', label: 'Week plan', kind: 'fsched', fill: fitWeekFill, tools: false }] },
  'fit/fgoals': { title: 'Fitness goals', segs: [{ kind: 'fitgoals' }] },
  'fit/plans': { title: 'Workout plans', segs: [{ kind: 'plans' }] },
  'fit/exercises': { title: 'Exercises', segs: [{ kind: 'exercises' }, { kind: 'sets' }] },
  'fit/body': { title: 'Body', segs: [{ kind: 'body', top: bodyTop }] },
  'fit/gear': { title: 'Fitness gear', segs: [{ kind: 'fitgear' }] }
};
const segsOf = page => (PAGES[page]?.segs || []).map(s => ({ key: s.key || s.kind, label: s.label || KINDS[s.kind].many, tools: true, ...s }));
const uiOf = page => (L.ui[page] ||= { seg: segsOf(page)[0]?.key, q: '', facet: '', sort: {}, filter: {}, all: false });
const curSeg = page => { const ss = segsOf(page), u = uiOf(page); return ss.find(s => s.key === u.seg) || ss[0]; };

/* ---------- data ---------- */
const recs = kind => L.all.filter(r => r.kind === kind);
const dataOf = r => { const { id, kind, ...d } = r; return d; };
const isMissing = e => ['PGRST205', '42P01'].includes(e?.code) || /does not exist|could not find the table/i.test(e?.message || '');
function index() { L.byId = Object.fromEntries(L.all.map(r => [r.id, r])); L.ver = (L.ver || 0) + 1; }
function cacheSave() { try { localStorage.setItem('hangtag:life:' + C.uid(), JSON.stringify(L.all)); } catch {} }
function cacheLoad() { try { const v = JSON.parse(localStorage.getItem('hangtag:life:' + C.uid()) || 'null'); if (Array.isArray(v)) { L.all = v; index(); return true; } } catch {} return false; }
async function load() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await C.sb.from('records').select('id,kind,data').range(from, from + 999);
    if (error) { if (isMissing(error)) { L.missing = true; L.status = 'ok'; C.render(); return; } throw error; }
    rows.push(...data);
    if (data.length < 1000) break;
  }
  L.missing = false; L.status = 'ok'; L.fresh = true;
  L.all = rows.map(r => ({ ...r.data, id: r.id, kind: r.kind })); index(); cacheSave(); C.render();
  movePostIdeas();
  setTimeout(() => calFeedSync(), 3000);
}
function apply(id, kind, data) {
  const i = L.all.findIndex(r => r.id === id);
  if (data) { const v = { ...data, id, kind }; i >= 0 ? (L.all[i] = v) : L.all.push(v); } else if (i >= 0) L.all.splice(i, 1);
  index(); cacheSave(); if (!L.quiet) C.render();
}
// Changes show at once and are rolled back if Supabase says no
// a sort rule fills in the category (and a cleaner name) of a new purchase that has none
const ruleFor = name => { const n = norm(name); return n ? recs('frules').find(r => r.contains && n.includes(norm(r.contains))) : null; };
// running low puts it on the grocery list; back in stock clears running low
const useSoon = r => !!r.stock && !!r.expires && r.expires <= addDays(today(), 3);
function applyRule(kind, id, data) {
  if (kind === 'stays' && data.to && data.to < today() && (!data.status || ['Saved', 'Shortlist', 'Booked'].includes(data.status))) data = { ...data, status: 'Stayed' };
  if (kind === 'ingredients') { const was = L.byId[id] || {}; if (data.low && !was.low) data = { ...data, list: true }; if (data.stock && !was.stock && was.low) data = { ...data, low: false }; return data; }
  if (kind !== 'ftx' || L.byId[id] || data.category) return data;
  const r = ruleFor(data.name); if (!r) return data;
  return { ...data, category: r.category || '', ...(r.rename ? { name: r.rename } : {}) };
}
// what to say in the undo list
const undoName = (kind, d) => { const K = KINDS[kind]; const t = K ? ((K.title ? K.title({ ...d, kind }) : d.name) || K.one) : 'item'; return String(t).slice(0, 40); };
// what is still a wish, per kind; when a record stops being one, it gets a stamp: bought or let go, and when
const WISHY = { wishes: r => !r.archived && !['Bought', 'Dropped'].includes(r.status), beauty: r => !!r.wish && !r.archived, supplements: r => !!r.wish && !r.finished,
  gear: r => !r.own && !r.dropped, fitgear: r => !r.own && !r.dropped, inventory: r => INV_WANT.includes(invStatus(r)), fwait: r => (!r.status || r.status === 'Waiting') && !r.moved };
function stampWish(kind, id, data) {
  const w = WISHY[kind], was = L.byId[id]; if (!w || !was) return data;
  const before = w(was), now = w(data);
  if (!before && now && data.wishOut) { const { wishOut, wishOutOn, ...rest } = data; return rest; }
  if (!before || now || data.wishOut) return data;
  if (kind === 'fwait' && data.moved) return data;
  const dropped = kind === 'wishes' ? data.status === 'Dropped' || (data.archived && data.status !== 'Bought') : kind === 'inventory' ? ['Returned', 'Gone', 'Teruggestuurd', 'Weg'].includes(data.status) : kind === 'beauty' || kind === 'supplements' ? !!data.wish : kind === 'fwait' ? data.status === 'Let go' : !!data.dropped;
  return { ...data, wishOut: dropped ? 'dropped' : 'bought', wishOutOn: today() };
}
async function put(kind, id, data) {
  data = stampWish(kind, id, applyRule(kind, id, data));
  const before = L.byId[id] ? { ...L.byId[id] } : null;
  if (!L.batch) C.undoPush?.(`${before ? 'Changed' : 'Added'} ${undoName(kind, data)}`, () => before ? put(kind, id, dataOf(before)) : del(id));
  apply(id, kind, data);
  try { await C.sbWrite('records', 'up', { user_id: C.uid(), id, kind, data, updated_at: new Date().toISOString() }); }
  catch (error) { before ? apply(id, kind, dataOf(before)) : apply(id, kind, null); failed(error); throw error; }
}
async function del(id) {
  const before = L.byId[id]; if (!before) return;
  if (!L.batch) C.undoPush?.(`Deleted ${undoName(before.kind, before)}`, () => put(before.kind, id, dataOf(before)), true);
  apply(id, before.kind, null);
  try { await C.sbWrite('records', 'del', { id }); }
  catch (error) { apply(id, before.kind, dataOf(before)); failed(error); throw error; }
}
async function putMany(rows, progress, label) {
  const now = new Date().toISOString();
  const befores = rows.map(r => [r.id, r.kind, L.byId[r.id] ? dataOf(L.byId[r.id]) : null]);
  C.undoPush?.(label || `Imported ${plural(rows.length, 'record')}`, async () => {
    const back = befores.filter(b => b[2]), gone = befores.filter(b => !b[2]).map(b => b[0]);
    if (back.length) await putMany(back.map(([id, kind, data]) => ({ id, kind, data })), null, 'restore');
    for (let i = 0; i < gone.length; i += 200) { const part = gone.slice(i, i + 200); const { error } = await C.sb.from('records').delete().in('id', part); if (error) throw error; }
    L.all = L.all.filter(r => !gone.includes(r.id)); index(); cacheSave(); C.render();
  }, label !== 'restore');
  for (let i = 0; i < rows.length; i += 400) {
    const part = rows.slice(i, i + 400);
    await C.sbWriteMany('records', part.map(r => ({ user_id: C.uid(), id: r.id, kind: r.kind, data: r.data, updated_at: now })));
    progress?.(Math.min(rows.length, i + 400), rows.length);
  }
  for (const r of rows) { const i = L.all.findIndex(x => x.id === r.id); const v = { ...r.data, id: r.id, kind: r.kind }; i >= 0 ? (L.all[i] = v) : L.all.push(v); }
  index(); cacheSave(); C.render();
}
function failed(e) {
  console.error(e);
  if (isMissing(e)) { L.missing = true; C.render(); }
  C.toast(navigator.onLine ? 'Could not save. Try again.' : "You're offline. Try again when you're connected.");
}
const save = (r, patch) => put(r.kind, r.id, { ...dataOf(r), ...patch }).catch(() => {});
const create = (kind, data) => { const id = C.uuid(); return put(kind, id, { created: Date.now(), ...data }).then(() => id); };
let channel = null;
function subscribe() {
  channel?.unsubscribe();
  channel = C.sb.channel('life-' + C.uid()).on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, p => {
    if (p.eventType === 'DELETE') { if (p.old?.id && L.byId[p.old.id]) apply(p.old.id, L.byId[p.old.id].kind, null); }
    else if (p.new?.id) { const cur = L.byId[p.new.id]; if (cur && JSON.stringify(dataOf(cur)) === JSON.stringify(p.new.data)) return; apply(p.new.id, p.new.kind, p.new.data); }
  }).subscribe();
}

/* ---------- derived numbers ---------- */
const WDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// a free day: one of your weekdays off (Home › Settings), or a day you are on a trip
const choreFree = d => { const c = C?.prefs?.().chores || {}; if ((c.free || []).includes(WDAYS[(fromISO(d).getDay() + 6) % 7])) return true; return c.trips !== false && tripList().some(t => d >= t.start && d <= tripEnd(t)); };
const choreDue = r => { let d = r.last ? addDays(r.last, FREQ[r.freq] || 7) : today(); if (d < today()) d = today(); for (let i = 0; i < 21 && choreFree(d); i++) d = addDays(d, 1); return d; };
const choreLate = r => r.last ? addDays(r.last, FREQ[r.freq] || 7) < today() : false;
const choreGroup = r => { const n = FREQ[r.freq] || 7; return n <= 2 ? 'Daily' : n <= 14 ? 'Weekly' : 'Monthly and longer'; };
const plantDue = r => r.every ? (r.last ? addDays(r.last, Number(r.every)) : today()) : '';
function prOf(exId) {
  let best = null;
  for (const s of L.all) if (s.kind === 'sets' && s.exercise === exId && num(s.weight) != null)
    if (!best || s.weight > best.weight || (s.weight === best.weight && (s.reps || 0) > (best.reps || 0))) best = s;
  return best;
}
function cycleStats() {
  const starts = recs('cycles').map(c => c.start).filter(Boolean).sort();
  const gaps = [];
  for (let i = 1; i < starts.length; i++) { const g = diffDays(starts[i - 1], starts[i]); if (g >= 15 && g <= 60) gaps.push(g); }
  const recent = gaps.slice(-6);
  const avg = recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : 28;
  const last = starts[starts.length - 1] || '';
  const open = recs('cycles').find(c => c.start === last && !c.end);
  return { avg, last, open, guessed: !recent.length, day: last ? diffDays(last, today()) + 1 : 0, next: last ? addDays(last, avg) : '' };
}
const waterToday = () => recs('water').find(w => w.date === today());

/* ---------- shared bits of markup ---------- */
// any list can show its records as rows or as photo cards; the choice is remembered per list on this device
const hasPhotos = K => K.fields.some(f => f.type === 'photo');
const photoOf = r => hasPhotos(KINDS[r.kind]) ? r.photo : '';
// products and things you own or want always show as tiles, like the closet
const PRODUCTS = new Set(['offers', 'gear', 'beauty', 'supplements', 'inventory', 'fitgear', 'wishes', 'ingredients', 'fwait']);
const viewMode = K => { try { const v = localStorage.getItem('lview2:' + K.kind); if (v === 'rows' || v === 'cards' || v === 'table') return v; } catch {} return 'cards'; };  // every list opens as tiles; the switch remembers a list per kind
const setViewMode = (K, v) => { try { localStorage.setItem('lview2:' + K.kind, v); } catch {} };
const viewSwitch = K => `<div class="seg lviews" role="group" aria-label="Show as">${[['cards', 'Tiles', P.grid], ['rows', 'List', P.list], ['table', 'Table', P.doc]].map(([v, l, ic]) => `<button data-act="lview" data-v="${v}" aria-pressed="${viewMode(K) === v}" aria-label="${l}" title="${l}">${svg(ic)}</button>`).join('')}</div>`;
const tick = (label, on, attrs) => `<button class="lquick ${on ? 'on' : ''}" ${attrs} aria-pressed="${on}">${on ? svg(P.check) : ''}${esc(label)}</button>`;
/* ---------- stock counters: how many pieces or how much is left, with + and − ---------- */
const COUNTED = new Set(['ingredients', 'beauty', 'supplements']);
const unitOf = r => r.unit || (r.kind === 'ingredients' && r.location === 'Vriezer' && num(r.portions) != null ? 'portie' : 'stuks');
const CK = r => r.kind === 'supplements' ? 'left' : r.kind === 'beauty' ? 'qty' : 'amount';
const cntOf = r => num(r[CK(r)]) ?? (r.kind === 'ingredients' && r.location === 'Vriezer' ? num(r.portions) : null);
const stepOf = r => ({ gram: 100, ml: 50 })[unitOf(r)] || 1;
const unitShort = (n, u) => u === 'gram' ? `${n} g` : u === 'ml' ? `${n} ml` : u === 'portie' ? plural(n, 'portie', 'porties') : `${n}×`;
const stepper = r => { const n = cntOf(r); return `<span class="stepper" role="group" aria-label="How many"><button type="button" data-act="cnt" data-id="${r.id}" data-v="-1" aria-label="One less">−</button><b class="${n == null ? 'unk' : ''}">${n == null ? '?' : esc(unitShort(n, unitOf(r)))}</b><button type="button" data-act="cnt" data-id="${r.id}" data-v="1" aria-label="One more">+</button></span>`; };
function countPatch(r, dir) {
  const step = stepOf(r), now = cntOf(r) ?? (dir > 0 ? 0 : step), n = Math.max(0, Math.round((now + dir * step) * 100) / 100), min = num(r.min), p = { [CK(r)]: n };
  if (r.kind === 'ingredients' && r.location === 'Vriezer' && r.portions != null) p.portions = n;
  if (n === 0) { if (r.kind === 'ingredients') Object.assign(p, { stock: false, ...(r.location === 'Vriezer' ? { frozen: null } : {}) }); if (r.kind === 'beauty') p.low = true; if (r.kind === 'supplements') p.low = true; }
  else if (dir > 0 && r.kind === 'ingredients' && !r.stock) p.stock = true;
  const under = n === 0 || (min != null && n < min);
  if (under) { if (r.kind === 'ingredients' && (r.staple || min != null)) p.list = true; if (r.kind !== 'ingredients') p.low = true; }
  else if (dir > 0 && min != null && n >= min && r.kind !== 'ingredients') p.low = false;
  return p;
}
async function countStep(id, dir) {
  const r = L.byId[id]; if (!r) return;
  const p = countPatch(r, dir);
  try { await save(r, p); if (p.list && !r.list) C.toast(`${r.name} is on your grocery list`); else if (p.low && !r.low) C.toast(`${r.name} is running low`); } catch { C.toast('Could not save. Try again.'); }
}
function row(r) {
  const K = KINDS[r.kind], q = K.quick?.(r), side = K.side?.(r);
  const ph = photoOf(r);
  return `<div class="lrow ${K.hide?.(r) ? 'gone' : ''}">${ph ? `<button class="lthumb" data-act="open" data-id="${r.id}" tabindex="-1" aria-hidden="true"><img referrerpolicy="no-referrer" src="${esc(C.photoURL(ph))}" alt="" loading="lazy" onerror="this.parentNode.remove()"></button>` : ''}<button class="lmain" data-act="open" data-id="${r.id}"><b>${esc(titleOf(r))}</b>${(() => { const t = [K.sub?.(r), WISHY[r.kind] ? wishLine(r.kind, r.id) : ''].filter(Boolean).join(' · '); return t ? `<span>${esc(t)}</span>` : ''; })()}</button>${side ? `<span class="lside ${/overdue|expired|today/.test(side) ? 'hot' : ''}">${esc(side)}</span>` : ''}${COUNTED.has(r.kind) ? stepper(r) : q ? tick(q.label, q.on, `data-act="quick" data-id="${r.id}"`) : ''}</div>`;
}
// a product tile looks like a closet piece: the whole photo on a soft stage, name and price under it
function prodCard(r, act = 'open') {
  const K = KINDS[r.kind] || {}, ph = r.closet ? r.photo : photoOf(r), price = num(r.price);
  const sub = [...(r.closet ? [r.brand, price ? eur(price) : ''] : [K.sub?.(r), price && !String(K.sub?.(r) || '').includes(eur(price)) ? eur(price) : '']), WISHY[r.kind] || r.closet ? wishLine(r.closet ? 'closet' : r.kind, r.id, price, r.closet ? r.plan : undefined) : ''].filter(Boolean).join(' · ');
  return `<button class="lcard prod" data-act="${act}" data-id="${r.id}"><div class="stage"><span class="pini">${esc(String(r.name || titleOf(r)).slice(0, 1))}</span>${ph ? `<img referrerpolicy="no-referrer" src="${esc(C.photoURL(ph))}" alt="" loading="lazy" onerror="this.remove()">` : ''}${r.fav ? '<i class="lfav" aria-label="Favourite">★</i>' : ''}</div><div class="meta"><b>${esc(r.closet ? r.name || 'Piece' : titleOf(r))}</b><span>${esc(sub)}</span></div></button>`;
}
function card(r) {
  if (PRODUCTS.has(r.kind)) return prodCard(r);
  const K = KINDS[r.kind], ph = photoOf(r);
  return `<button class="lcard" data-act="open" data-id="${r.id}"><div class="lph"><span>${esc(titleOf(r).slice(0, 1))}</span>${ph ? `<img referrerpolicy="no-referrer" src="${esc(C.photoURL(ph))}" alt="" loading="lazy" onerror="this.remove()">` : ''}${r.fav ? '<i class="lfav" aria-label="Favourite">★</i>' : ''}</div><div class="meta"><b>${esc(titleOf(r))}</b><span>${esc(K.sub?.(r) || '')}</span></div></button>`;
}
const listHTML = (list, K) => !list.length ? '' : viewMode(K) === 'cards' ? `<div class="lgrid">${list.map(r => COUNTED.has(r.kind) ? `<div class="lcw">${card(r)}${stepper(r)}</div>` : card(r)).join('')}</div>` : `<div class="lrows">${list.map(row).join('')}</div>`;
const panel = (title, body, more) => `<section class="panel lpanel"><div class="lph3"><h3>${esc(title)}</h3>${more ? `<button class="chip link" data-act="go" data-v="${more[0]}">${esc(more[1])}</button>` : ''}</div>${body}</section>`;
const quiet = t => `<p class="lnone">${esc(t)}</p>`;

/* ---------- any list: group by a field, a table to fill in, and suggestions from similar records ---------- */
const GROUP_KEYS = ['brand', 'shop', 'store', 'room', 'type', 'category', 'for', 'city', 'country', 'company', 'location', 'area', 'cuisine', 'status'];
const isDays = f => (f.options || []).includes('Mon');
const groupFields = K => K.fields.filter(f => ['select', 'multi', 'rel'].includes(f.type) || (f.type === 'text' && GROUP_KEYS.includes(f.k))).filter(f => (f.type !== 'rel' || !f.multi) && !isDays(f));
const groupOf = K => { try { return localStorage.getItem('lgroup:' + K.kind) || ''; } catch { return ''; } };
const groupSel = K => { const fs = groupFields(K); return fs.length ? `<select class="pill" data-lgroup aria-label="Group by"><option value="">No groups</option>${fs.map(f => `<option value="${f.k}" ${groupOf(K) === f.k ? 'selected' : ''}>Group: ${esc(f.label)}</option>`).join('')}</select>` : ''; };
const groupVal = (r, f) => { const v = r[f.k]; if (f.type === 'check') return v ? 'Ja' : 'Nee'; if (f.type === 'rel') return v ? titleOf(L.byId[v] || {}) : ''; return [].concat(v ?? [])[0] ?? ''; };
function groupedHTML(list, K, inner) {
  const g = groupOf(K), f = g && K.fields.find(x => x.k === g);
  if (!f || !list.length) return inner(list);
  const m = new Map(); for (const r of list) { const k = String(groupVal(r, f) || '').trim() || '—'; (m.get(k) || m.set(k, []).get(k)).push(r); }
  return [...m.entries()].sort((a, b) => a[0] === '—' ? 1 : b[0] === '—' ? -1 : azCmp(a[0], b[0]))
    .map(([k, l]) => `<section class="lgrp"><div class="tdgh"><h3>${esc(k === '—' ? 'Geen ' + f.label.toLowerCase() : k)} <span class="muted">${l.length}</span></h3></div>${inner(l)}</section>`).join('');
}
const TABLE_TYPES = ['text', 'num', 'money', 'date', 'select', 'multi', 'check'];
const tableCols = (K, keys) => keys ? keys.map(k => K.fields.find(f => f.k === k)).filter(f => f && TABLE_TYPES.includes(f.type) && !['name', 'title'].includes(f.k)) : K.fields.filter(f => TABLE_TYPES.includes(f.type) && !['name', 'title'].includes(f.k) && !isDays(f)).slice(0, 9);
// a value most similar records have: same brand, shop, store, category, type or room
function lSuggest(r, f) {
  if (!['select', 'multi', 'text'].includes(f.type) || ['name', 'title'].includes(f.k) || isDays(f) || !empty(r[f.k])) return null;
  const same = (a, b) => a != null && b != null && a !== '' && norm(a) === norm(b), pool = recs(r.kind).filter(x => x.id !== r.id && !empty(x[f.k]));
  const by = ['brand', 'store', 'shop', 'category', 'type', 'room', 'cuisine'].find(k => k !== f.k && !empty(r[k]) && pool.some(x => same(x[k], r[k])));
  if (!by) return null;
  const m = new Map(); for (const x of pool.filter(x => same(x[by], r[by]))) { const key = JSON.stringify(x[f.k]); m.set(key, (m.get(key) || 0) + 1); }
  const best = [...m.entries()].sort((a, b) => b[1] - a[1])[0]; return best ? JSON.parse(best[0]) : null;
}
const lShow = v => Array.isArray(v) ? v.join(', ') : String(v ?? '');
function cellIn(r, f) {
  const v = r[f.k], sug = lSuggest(r, f), ph = sug != null ? lShow(sug) : f.label, a = `data-lcell="${r.id}" data-k="${f.k}" aria-label="${esc(f.label)}"`;
  const chip = sug != null ? `<button type="button" class="chip tdsug" data-lsug="${r.id}" data-k="${f.k}">↵ ${esc(lShow(sug))}</button>` : '';
  if (f.type === 'check') return `<input type="checkbox" ${a} ${v ? 'checked' : ''}>`;
  if (f.type === 'select') return `<select class="tdin" ${a}><option value="">—</option>${optsFor(r.kind, f, v, r).map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>${chip}`;
  const val = f.type === 'multi' ? [].concat(v || []).join(', ') : f.type === 'money' && v != null && v !== '' ? String(v).replace('.', ',') : (v ?? '');
  return `<input class="tdin ${sug != null ? 'hassug' : ''}" ${a} ${f.type === 'date' ? 'type="date"' : ['num', 'money'].includes(f.type) ? 'inputmode="decimal"' : ''} value="${esc(val)}" placeholder="${esc(ph)}">${chip}`;
}
const cellParse = (f, el) => { if (f.type === 'check') return el.checked; const s = el.value.trim(); if (f.type === 'multi') return s ? [...new Set(s.split(/\s*,\s*/).filter(Boolean))] : []; if (['num', 'money'].includes(f.type)) { if (!s) return null; const n = Number(s.replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : null; } return s; };
function tableHTML(list, K, keys) {
  const cols = tableCols(K, keys);
  return `<div class="tdtablewrap"><table class="tdtable lvtable"><thead><tr><th></th><th>${esc(K.one[0].toUpperCase() + K.one.slice(1))}</th>${cols.map(f => `<th>${esc(f.label)}</th>`).join('')}</tr></thead><tbody>${list.map(r => `<tr><td>${photoOf(r) ? `<button class="tdthumb" data-act="open" data-id="${r.id}"><img referrerpolicy="no-referrer" src="${esc(C.photoURL(photoOf(r)))}" alt="" loading="lazy" onerror="this.remove()"></button>` : `<button class="chip link" data-act="open" data-id="${r.id}">Open</button>`}</td><td class="ltname"><button class="tdmain" data-act="open" data-id="${r.id}"><b>${esc(titleOf(r))}</b></button></td>${cols.map(f => `<td class="${empty(r[f.k]) && f.type !== 'check' ? 'miss' : ''}">${cellIn(r, f)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
// save a cell without redrawing the page, so you keep your place in the table
async function cellSave(el) {
  const r = L.byId[el.dataset.lcell], K = r && KINDS[r.kind], f = K?.fields.find(x => x.k === el.dataset.k); if (!f) return;
  const v = cellParse(f, el); if (JSON.stringify(v ?? '') === JSON.stringify(r[f.k] ?? (f.type === 'multi' ? [] : f.type === 'check' ? false : ''))) return;
  L.quiet = true; try { await put(r.kind, r.id, { ...dataOf(r), [f.k]: v }); } catch (e) { failed(e); } finally { L.quiet = false; }
  el.closest('td')?.classList.toggle('miss', empty(v) && f.type !== 'check');
}
document.addEventListener('change', e => { const el = e.target; if (C && el.matches?.('[data-lcell]') && !el.closest('.ltdone')) cellSave(el); if (C && el.matches?.('[data-lgroup]')) { const host = el.closest('#viewHost') || document, page = C.view(), K = KINDS[curSeg(page).kind]; try { el.value ? localStorage.setItem('lgroup:' + K.kind, el.value) : localStorage.removeItem('lgroup:' + K.kind); } catch {} fillList(host, page); } });
document.addEventListener('click', async e => { const b = e.target.closest?.('[data-lsug]'); if (!b || !C) return; const r = L.byId[b.dataset.lsug], f = r && KINDS[r.kind].fields.find(x => x.k === b.dataset.k), v = f && lSuggest(r, f); if (v == null) return; try { await put(r.kind, r.id, { ...dataOf(r), [f.k]: v }); } catch (err) { failed(err); } });

/* ---------- list pages ---------- */
/* every list starts A to Z. Logs and things with a date keep their date order (newest sleep, next due chore),
   so do lists you put in your own order and the inboxes; the old order stays one tap away in the sort menu */
const KEEP_SORT = /^-?(date|start|end|at|month|added|due|expected|by|order|prepDay|routine)$/;
const defSort = K => { const s = K.sorts?.[0]?.[0]; return s && (KEEP_SORT.test(s) || K === KINDS.inbox || K === KINDS.winbox) ? s : 'name'; };
const sortsOf = K => { const s = K.sorts || [], az = s.find(x => x[0] === 'name') || ['name', 'A to Z'], rest = s.filter(x => x[0] !== 'name'); return defSort(K) === 'name' ? [az, ...rest] : [...rest, az]; };
const azCmp = (a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
function sortList(list, K, key) {
  const desc = key.startsWith('-'), k = desc ? key.slice(1) : key;
  const val = r => k === 'score' ? (stayScore(r) || '') : k === 'routine' ? (ROUTINES.includes(r.routine) ? ROUTINES.indexOf(r.routine) : 9) : k === 'prio' ? (PRIO.includes(r.priority) ? PRIO.indexOf(r.priority) : 9) : k === 'time' ? (totalTime(r) || 1e9) : k === 'due' && ['chores', 'plants'].includes(r.kind) ? (r.kind === 'plants' ? (plantDue(r) || '9999') : choreDue(r)) : k === 'name' ? norm(titleOf(r)) : r[k];
  return list.sort((a, b) => {
    let x = val(a), y = val(b);
    const ex = x == null || x === '', ey = y == null || y === '';
    if (ex || ey) return ex && ey ? azCmp(titleOf(a), titleOf(b)) : ex ? 1 : -1;
    const c = typeof x === 'string' || typeof y === 'string' ? azCmp(x, y) : x < y ? -1 : x > y ? 1 : 0;
    return (desc ? -c : c) || azCmp(titleOf(a), titleOf(b));
  });
}
function filtered(page, seg) {
  const K = KINDS[seg.kind], u = uiOf(page);
  const q = norm(u.q), fk = K.facet, fv = u.facet;
  const f = u.filter[seg.key] ?? K.filters?.[0]?.[0];
  let list = recs(seg.kind);
  if (K.hide && !u.all) list = list.filter(r => !K.hide(r));
  if (K.filter && f) list = list.filter(r => K.filter(r, f));
  if (fk && fv) list = list.filter(r => [].concat(r[fk] || []).includes(fv));
  if (K.facet2 && fv && u.facet2) list = list.filter(r => [].concat(r[K.facet2] || []).includes(u.facet2));
  if (q) list = list.filter(r => norm([titleOf(r), K.sub?.(r), r.brand, r.notes, ...relNames(r.ingredients)].join(' ')).includes(q));
  return sortList(list, K, u.sort[seg.key] || defSort(K));
}
function listPage(host, page) {
  const cfg = PAGES[page], u = uiOf(page), seg = curSeg(page), K = KINDS[seg.kind], ss = segsOf(page);
  const sig = page + '|' + seg.key;
  if (host.dataset.sig !== sig) {
    host.dataset.sig = sig;
    const sorts = sortsOf(K);
    host.innerHTML = `<div class="viewhead"><h1>${esc(cfg.title)}</h1><span class="sub" data-count></span></div>
      ${ss.length > 1 ? `<div class="seg lseg">${ss.map(s => `<button data-act="seg" data-v="${s.key}" aria-pressed="${s.key === seg.key}">${esc(s.label)}</button>`).join('')}</div>` : ''}
      ${seg.tools ? `<div class="tools"><label class="search">${svg(P.search)}<input type="search" data-lq placeholder="Search ${esc(K.many.toLowerCase())}" value="${esc(u.q)}" aria-label="Search"></label>
        ${sorts.length > 1 ? `<select class="pill" data-lsort aria-label="Sort">${sorts.map(([k, l]) => `<option value="${k}" ${(u.sort[seg.key] || defSort(K)) === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>` : ''}${groupSel(K)}${viewSwitch(K)}<button class="btn small" data-act="selmode" data-selbtn>Select</button></div>
        <div class="chips facets" data-facets></div>` : ''}
      <div data-lfill></div>`;
  }
  fillList(host, page);
}
function fillList(host, page) {
  const u = uiOf(page), seg = curSeg(page), K = KINDS[seg.kind], fill = host.querySelector('[data-lfill]');
  if (!fill) return;
  const all = recs(seg.kind), list = seg.fill ? all : filtered(page, seg);
  const cnt = host.querySelector('[data-count]');
  if (cnt) cnt.textContent = seg.fill ? '' : `${list.length}${list.length !== all.length ? ' of ' + all.length : ''} ${list.length === 1 ? K.one : (K.ones || K.one + 's')}`;
  const fh = host.querySelector('[data-facets]');
  if (fh) {
    const f = u.filter[seg.key] ?? K.filters?.[0]?.[0];
    const counts = {};
    if (K.facet) for (const r of all) if (!K.hide?.(r) || u.all) for (const v of [].concat(r[K.facet] || [])) counts[v] = (counts[v] || 0) + 1;
    const opts = K.facet ? Object.keys(counts).sort(azCmp) : [];
    fh.innerHTML = (K.filters || []).map(([k, l]) => `<button class="chip tab" data-act="filter" data-v="${k}" aria-pressed="${f === k}">${esc(l)}</button>`).join('')
      + (K.filters && opts.length ? '<span class="lsep"></span>' : '')
      + (opts.length > 1 ? opts.map(v => `<button class="chip" data-act="facet" data-v="${esc(v)}" aria-pressed="${u.facet === v}">${esc(v)}<span class="n">${counts[v]}</span></button>`).join('') : '')
      + (K.hide && all.some(K.hide) ? `<button class="chip ghost" data-act="showall" aria-pressed="${u.all}">${esc(u.all ? 'Hide ' + K.hideLabel.slice(5) : K.hideLabel)}</button>` : '');
    fh.hidden = !fh.innerHTML;
    // the second row (a recipe category's kinds of dish) sits under the scrolling chips, on its own line
    let f2 = host.querySelector('[data-facets2]'); if (!f2) { f2 = document.createElement('div'); f2.dataset.facets2 = ''; fh.after(f2); }
    f2.innerHTML = (() => { if (!K.facet2 || !u.facet) return ''; const c2 = {}; for (const r of all) if ([].concat(r[K.facet] || []).includes(u.facet)) for (const v of [].concat(r[K.facet2] || [])) c2[v] = (c2[v] || 0) + 1; const o2 = Object.keys(c2).sort(azCmp); return o2.length ? `<div class="lfacet2" role="group" aria-label="Soort">${o2.map(v => `<button class="chip small" data-act="facet2" data-v="${esc(v)}" aria-pressed="${u.facet2 === v}">${esc(v)}<span class="n">${c2[v]}</span></button>`).join('')}</div>` : ''; })();
    f2.hidden = !f2.innerHTML;
  }
  if (seg.fill) { seg.fill(fill, page); return; }
  // Finance lists say so when something is in there twice, with the button to clean it up
  const top = (FIN_KINDS.includes(seg.kind) ? fDupNote() : seg.kind === 'recipes' ? recipeDupNote() : '') + (seg.top ? seg.top() : '') + (K.total && list.length ? K.total(list, u) : '');
  fill.innerHTML = top + (list.length ? groupedHTML(list, K, l => viewMode(K) === 'table' ? tableHTML(l, K) : listHTML(l, K)) : emptyList(K, all.length));
  drawSel(host, page, list);
}
// select mode: tap rows or cards to pick them, then delete them or set a field on all of them at once
function drawSel(host, page, list) {
  const on = L.sel?.page === page, fill = host.querySelector('[data-lfill]'), btn = host.querySelector('[data-selbtn]');
  if (btn) { btn.textContent = on ? 'Done' : 'Select'; btn.classList.toggle('primary', on); }
  if (fill) fill.classList.toggle('selecting', on);
  let bar = host.querySelector('.selbar');
  if (!on) { if (bar) bar.parentNode.removeChild(bar); return; }
  L.sel.visible = list.map(r => r.id);
  for (const id of [...L.sel.ids]) if (!L.byId[id]) L.sel.ids.delete(id);
  fill.querySelectorAll('[data-act="open"][data-id]').forEach(b => b.setAttribute('aria-selected', L.sel.ids.has(b.dataset.id)));
  if (!bar) { bar = document.createElement('div'); bar.className = 'selbar'; host.appendChild(bar); }
  const k = L.sel.ids.size, K = KINDS[curSeg(page).kind], canSet = K.fields.some(f => ['select', 'multi', 'check'].includes(f.type));
  bar.innerHTML = `<b>${k} selected</b><button class="btn small" data-act="selall">Select all</button><div class="spacer"></div>${canSet ? `<button class="btn small" data-act="selset" ${k ? '' : 'disabled'}>Change…</button>` : ''}<button class="btn small danger" data-act="seldel" ${k ? '' : 'disabled'}>Delete</button><button class="btn small" data-act="selmode">Done</button>`;
}
function selSet(kind) {
  const K = KINDS[kind], ids = [...L.sel.ids], fs = K.fields.filter(f => ['select', 'multi', 'check', 'text', 'num', 'money', 'date'].includes(f.type) && !['name', 'title'].includes(f.k));
  const sh = C.sheet({ title: `Change ${ids.length} ${ids.length === 1 ? K.one : (K.ones || K.one + 's')}`, body: `<div class="lslot"><span class="rowlbl">Field</span>${fs.map((f, i) => `<button class="chip" data-sf="${i}">${esc(f.label)}</button>`).join('')}</div><div data-svals></div>` });
  let f = null;
  sh.addEventListener('click', async e => {
    const b = e.target.closest('[data-sf]');
    if (b) {
      f = fs[+b.dataset.sf]; sh.querySelectorAll('[data-sf]').forEach(x => x.setAttribute('aria-pressed', x === b));
      const vals = f.type === 'check' ? [['1', 'Yes'], ['0', 'No']] : ['select', 'multi'].includes(f.type) ? optsFor(kind, f).map(o => [o, o]) : [];
      const typed = ['text', 'num', 'money', 'date'].includes(f.type);
      sh.querySelector('[data-svals]').innerHTML = `<p class="lnone">${f.type === 'multi' ? 'Adds this to each one:' : 'Sets this on each one:'}</p>${typed ? `<div class="lbar"><input class="finp" data-svin ${f.type === 'date' ? 'type="date"' : ['num', 'money'].includes(f.type) ? 'inputmode="decimal"' : ''} placeholder="${esc(f.label)}"><button class="btn small primary" data-svgo>Apply</button></div>` : ''}<div class="lwrap">${vals.map(([v, l]) => `<button class="chip" data-sv="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
      return;
    }
    let v = e.target.closest('[data-sv]')?.dataset.sv;
    if (e.target.closest('[data-svgo]') && f) { const el = sh.querySelector('[data-svin]'); v = el.value.trim(); if (!v) return; if (['num', 'money'].includes(f.type)) v = Number(v.replace(/\./g, '').replace(',', '.')); }
    if (v == null || !f) return;
    try {
      for (const id of ids) {
        const r = L.byId[id]; if (!r) continue;
        const val = f.type === 'check' ? v === '1' : f.type === 'multi' ? [...new Set([...[].concat(r[f.k] || []), v])] : v;
        await put(kind, id, { ...dataOf(r), [f.k]: val });
      }
      C.closeSheet(); C.toast(`${f.label} changed on ${ids.length}`);
    } catch { C.toast('Could not save them all. Try again.'); }
  });
}
function emptyList(K, any) {
  return any ? quiet('Nothing matches. Try another search or filter.')
    : `<div class="empty lempty"><h2>No ${esc(K.many.toLowerCase())} yet</h2><p>Add your first ${esc(K.one)} with the + button. Coming from Notion? Use Import in this section's Settings.</p></div>`;
}

/* ---------- kitchen ---------- */
/* ---------- one review inbox ----------
   Everything you share from your phone, save in Albo or paste in the app lands here. A task opens each link a few
   times a day, works out what it is (recipe, wish, closet piece, beauty, supplement, gear, home, idea, content,
   gift) and fills in a card. You accept it, send it somewhere else, keep it as a saved link, or skip it. */
const INBOX_TO = { recipes: ['Recipe', 'kitchen/recipes'], wishes: ['Wish', 'wish/master'], closet: ['Closet wishlist', 'wishlist'], beauty: ['Beauty', 'care/beauty'], supplements: ['Supplement', 'care/supplements'],
  gear: ['Kitchen gear', 'kitchen/gear'], fitgear: ['Fitness gear', 'fit/gear'], inventory: ['Home', 'home/inventory'], ideas: ['Self-care idea', 'care/ideas'], cideas: ['Content idea', 'social/ideas'], stips: ['Social tip', 'social/tips'], inspo: ['Inspiration', 'social/inspo'], gifts: ['Gift idea', 'care/gifts'], trip: ['Trip idea', 'care/trips'], stays: ['Saved stay', 'care/trips'], keep: ['Saved link', 'care/saved'] };
const INBOX_EXTRA = { stays: () => ({ status: 'Saved' }), wishes: () => ({ status: 'Wish', since: today() }), beauty: () => ({ wish: true }), supplements: () => ({ wish: true }), gear: () => ({ own: false }), fitgear: () => ({ own: false }), inventory: () => ({ status: 'Idee' }), cideas: () => ({ status: 'Idea', source: 'Inbox' }), gifts: () => ({ status: 'Idea' }) };
const inboxOpen = () => recs('inbox').filter(r => ['New', 'Ready'].includes(r.status));
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
// a short preview of inbox cards, with Accept where a card is ready
const inboxMini = l => l.length ? `<div class="ibstrip">${l.map(r => { const to = INBOX_TO[r.target], ph = r.photo || r.draft?.photo, name = r.title || r.draft?.name || hostOf(r.url) || 'Link'; return `<div class="ibmini"><button class="ibstage" data-act="go" data-v="wish/inbox" aria-label="${esc(name)}"><span class="pini">${esc(name.slice(0, 1))}</span>${ph ? `<img referrerpolicy="no-referrer" src="${esc(C.photoURL(ph))}" alt="" loading="lazy" onerror="this.remove()">` : ''}</button><b>${esc(name)}</b><span>${esc(r.status === 'Ready' && to ? '→ ' + to[0] : 'being sorted')}</span>${r.status === 'Ready' && to ? `<button class="chip" data-act="ibxok" data-id="${r.id}">Accept</button>` : ''}</div>`; }).join('')}</div>` : '';
function inboxCard(r) {
  const to = INBOX_TO[r.target], d = r.draft || {}, ph = r.photo || d.photo;
  const facts = [d.brand, d.shop, num(d.price) ? eur(num(d.price)) : '', d.category || d.cat || d.type || d.area, d.servings ? plural(d.servings, 'portion') : '', d.prep ? `${d.prep} min` : ''].filter(Boolean).join(' · ');
  const name = r.title || d.name || hostOf(r.url) || 'Link';
  return `<div class="ibcard">${r.url ? `<a class="ibstage" href="${esc(r.url)}" target="_blank" rel="noopener" aria-label="Open ${esc(name)}">` : '<div class="ibstage">'}<span class="pini">${esc(name.slice(0, 1))}</span>${ph ? `<img referrerpolicy="no-referrer" src="${esc(C.photoURL(ph))}" alt="" loading="lazy" onerror="this.remove()">` : ''}${r.status === 'Ready' && to ? `<span class="ibto">→ ${esc(to[0])}</span>` : ''}${r.url ? '</a>' : '</div>'}
    <div class="ibmeta"><b>${esc(name)}</b><span>${esc([r.status === 'Ready' ? facts : 'being sorted', r.source, hostOf(r.url)].filter(Boolean).join(' · '))}</span>
    ${r.why ? `<p>${esc(r.why)}</p>` : ''}${r.note ? `<p>Your note: ${esc(r.note)}</p>` : ''}${r.problem ? `<p>${esc(r.problem)}</p>` : ''}
    <div class="dbtns">${r.status === 'Ready' && to ? `<button class="btn small primary" data-act="ibxok" data-id="${r.id}">Accept</button>` : ''}
      <select class="pill ibxto" data-ibxto="${r.id}" aria-label="Put it somewhere else"><option value="">${r.status === 'Ready' ? 'Somewhere else…' : 'Put it in…'}</option>${Object.entries(INBOX_TO).map(([k, [l]]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select>
      <button class="btn small" data-act="ibxskip" data-id="${r.id}">Skip</button></div></div></div>`;
}
function inboxPage(host) {
  const l = inboxOpen().sort((a, b) => (b.created || 0) - (a.created || 0)), ready = l.filter(r => r.status === 'Ready'), waiting = l.filter(r => r.status === 'New');
  const done = recs('inbox').filter(r => r.status === 'Done').sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 8);
  host.innerHTML = `${head('Inbox')}<div class="ldeals">
  <div class="tiles lt3">${fTile('To check', String(ready.length), 'cards ready for you')}${fTile('Being sorted', String(waiting.length), 'a task looks at them a few times a day')}${fTile('Sorted', String(recs('inbox').filter(r => r.status === 'Done').length), 'put where they belong')}</div>
  ${panel('Add a link', `<form class="lqadd" data-ibxadd><input placeholder="Paste a link, or type an idea" aria-label="Paste a link"><button class="btn small" type="submit">Add</button></form><p class="lnone">From your iPhone: share any page with the shortcut “Naar A’s Life” and it lands here.</p>
    <details class="vtable"><summary>Set up the share shortcut</summary><ol class="setsteps"><li>Open <b>Shortcuts</b>, tap <b>+</b> and name it <b>Naar A’s Life</b>.</li><li>Tap the <b>ⓘ</b> and turn on <b>Show in Share Sheet</b>. Let it receive URLs, Safari web pages, text and images.</li>
      <li>Add <b>Get contents of URL</b> with <span class="mono">${esc(String(C.sb?.supabaseUrl || '').replace(/\/$/, ''))}/functions/v1/offers</span>, method <b>POST</b>, request body <b>JSON</b> with: <span class="mono">token</span> (your OFFERS_TOKEN), <span class="mono">action</span> = share, <span class="mono">url</span> = Shortcut Input, <span class="mono">text</span> = Shortcut Input.</li>
      <li>Add <b>Show notification</b> “In je inbox”.</li></ol></details>`)}
  ${ready.length ? (() => { const by = new Map(); for (const r of ready) by.set(r.target, (by.get(r.target) || 0) + 1);
    return panel('Check these', `<div class="dbtns ibxall"><button class="btn small primary" data-act="ibxall">Accept all ${ready.length}</button>${[...by].filter(([, n]) => n > 1 && by.size > 1).map(([t, n]) => `<button class="btn small" data-act="ibxall" data-v="${t}">All ${n} ${esc(INBOX_TO[t]?.[0].toLowerCase() || t)}${n > 1 && !/s$/.test(INBOX_TO[t]?.[0] || '') ? 's' : ''}</button>`).join('')}</div>
      <div class="ibgrid">${ready.slice(0, L.ibxMore || 60).map(inboxCard).join('')}</div>${ready.length > (L.ibxMore || 60) ? `<button class="btn small" data-act="ibxmore">Show ${Math.min(60, ready.length - (L.ibxMore || 60))} more</button>` : ''}`); })() : ''}
  ${waiting.length ? panel('Waiting to be sorted', `<div class="ibgrid">${waiting.map(inboxCard).join('')}</div>`) : ''}
  ${!l.length ? panel('All clear', quiet('Nothing to check. Share a link from your phone and it shows up here.')) : ''}
  ${(() => { const old = recs('winbox').filter(r => r.status !== 'Done'); return old.length ? panel('Older links', `<p class="lnone">From the old wishlist inbox. Tap “Make a wish” on one, or open the old list.</p><div class="lrows">${old.slice(0, 8).map(row).join('')}</div>`, ['wish/oldinbox', `All ${old.length}`]) : ''; })()}
  ${done.length ? panel('Recently sorted', `<div class="lrows">${done.map(r => `<div class="lrow"><button class="lmain" ${r.made && L.byId[r.made] ? `data-act="open" data-id="${r.made}"` : ''}><b>${esc(r.title || hostOf(r.url) || 'Link')}</b><span>${esc(INBOX_TO[r.target]?.[0] || '')}</span></button></div>`).join('')}</div>`) : ''}</div>`;
}
// every wish in the app on one page: the closet wishlist, beauty, kitchen, home, fitness and the rest, by where it lives
function masterFill(fill) {
  const pr = w => { const i = WISH_PRIO.indexOf(w.prio); return i < 0 ? 99 : i; };
  const all = allWishes(), u = uiOf('wish/master'), groups = [...new Set(all.map(w => w.source))], src = groups.includes(u.allSrc) ? u.allSrc : '';
  const list = all.filter(w => !src || w.source === src).sort((a, b) => pr(a) - pr(b) || (a.since || '').localeCompare(b.since || ''));
  const cardOf = w => w.closet ? prodCard(w, 'openitem') : L.byId[w.id] ? prodCard(L.byId[w.id]) : '';
  fill.innerHTML = `<div class="lwrap mfilter">${['', ...groups].map(g => `<button class="chip" data-act="mallsrc" data-v="${esc(g)}" aria-pressed="${g === src}">${esc(g || 'All')} · ${all.filter(w => !g || w.source === g).length}</button>`).join('')}</div>`
    + (list.length ? (src ? [src] : groups).map(g => { const l = list.filter(w => w.source === g); return l.length ? `<div class="mgroup"><p class="dsub">${esc(g)} · ${l.length}</p><div class="lgrid">${l.map(cardOf).join('')}</div></div>` : ''; }).join('') : quiet('No wishes yet. Add one, or share a link to your inbox.'));
}
function savedFill(fill) {
  const l = recs('inbox').filter(r => r.status === 'Kept').sort((a, b) => (b.created || 0) - (a.created || 0));
  fill.innerHTML = l.length ? `<div class="lrows">${l.map(r => `<div class="lrow"><a class="lmain" href="${esc(r.url || '#')}" target="_blank" rel="noopener"><b>${esc(r.title || hostOf(r.url) || r.text || 'Link')}</b><span>${esc([hostOf(r.url), r.why || r.note].filter(Boolean).join(' · '))}</span></a><button class="lquick" data-act="open" data-id="${r.id}">Edit</button></div>`).join('')}</div>` : quiet('Links you keep without a place go here.');
}
// put a card where it belongs, as one undo step
async function inboxAccept(id, target) {
  const r = L.byId[id]; if (!r) return;
  target = target || r.target; const d = { ...(r.draft || {}) }, now = Date.now();
  if (target === 'trip') {
    const t = nextTrip(); if (!t) { C.toast('Add a trip first in Life › Trips'); return; }
    const before = JSON.parse(JSON.stringify(t)), idea = { id: C.uuid().slice(0, 8), t: d.name || r.title || hostOf(r.url) || 'Idea', url: r.url || '', note: r.note || d.notes || '' };
    const was = dataOf(r);
    L.batch = true;
    try { await C.undoQuiet(async () => { await C.saveTrip({ ...before, ideas: [...(before.ideas || []), idea] }); await put('inbox', r.id, { ...was, status: 'Done', target, doneAt: now }); }); }
    catch { C.toast('Could not save. Try again.'); return; } finally { L.batch = false; }
    C.undoPush(`Added ${idea.t} to ${tripName(t)}`, async () => { await C.saveTrip(before); await put('inbox', r.id, was); }, true);
    C.toast(`In your ideas for ${tripName(t)}`); return;
  }
  if (target === 'keep') { await save(r, { status: 'Kept', target, doneAt: now }); C.toast('Kept under Saved links'); return; }
  const name = d.name || r.title || hostOf(r.url) || 'Link';
  if (target === 'closet') {
    let before = null; const iid = C.uuid();
    await wishSteps(`Added ${name} to your closet wishlist`, async (step, closetDone) => {
      before = await C.closetAdd(iid, { name, brand: d.brand || '', cat: d.cat || d.category || '', price: num(d.price) || 0, photo: d.photo || r.photo || '', link: r.url || d.url || '', shop: d.shop || hostOf(r.url), why: d.why || r.note || '', notes: d.notes || '' });
      closetDone(iid, before);
      await step('inbox', r.id, { ...dataOf(r), status: 'Done', target, made: iid, doneAt: now });
    });
    C.toast(`${name} is on your closet wishlist`); return;
  }
  const rows = inboxRows(r, target, now); if (!rows) return;
  try { await putMany(rows, null, `Added ${name} to ${INBOX_TO[target][0].toLowerCase()}`); C.toast(`${name} is in ${INBOX_TO[target][0].toLowerCase()} now`); } catch { C.toast('Could not save. Try again.'); }
}
// the records one inbox card becomes
function inboxRows(r, target, now, made = new Map()) {
  const K = KINDS[target]; if (!K) return null;
  const d = { ...(r.draft || {}) }, name = d.name || r.title || hostOf(r.url) || 'Link';
  const keys = new Set(K.fields.map(f => f.k)), urlKey = K.fields.find(f => f.type === 'url')?.k, photoKey = K.fields.find(f => f.type === 'photo')?.k;
  const data = { created: now, ...(INBOX_EXTRA[target]?.() || {}) };
  for (const [k, v] of Object.entries(d)) if (keys.has(k) && K.fields.find(f => f.k === k).type !== 'rel' && v !== '' && v != null) data[k] = Array.isArray(v) && K.fields.find(f => f.k === k).type === 'long' ? v.join('\n') : v;
  data.name = name; if (urlKey && !data[urlKey]) data[urlKey] = r.url || d.url || ''; if (photoKey && !data[photoKey] && (d.photo || r.photo)) data[photoKey] = d.photo || r.photo;
  const noteKey = keys.has('notes') ? 'notes' : keys.has('why') ? 'why' : keys.has('desc') ? 'desc' : '';
  if (noteKey && r.note && !String(data[noteKey] || '').includes(r.note)) data[noteKey] = [data[noteKey], r.note].filter(Boolean).join('\n');
  const rows = [], rid = C.uuid();
  if (target === 'recipes') {
    const lines = d.lines || [], steps = d.steps || d.instructions || '';
    if (!data.instructions && (lines.length || steps)) data.instructions = [lines.length ? 'Ingrediënten:\n' + lines.map(l => '- ' + l).join('\n') : '', steps ? (lines.length ? 'Bereiding:\n' : '') + steps : ''].filter(Boolean).join('\n\n');
    const seen = new Set();
    // link the pantry items you already have; never add new ones (you fill your pantry yourself)
    for (const n of [].concat(d.ingredients || [])) { const hit = recs('ingredients').find(i => deUml(i.name) === deUml(n)); if (hit) seen.add(hit.id); }
    if (seen.size) data.ingredients = [...seen];
  }
  if (CAT_NL[target] && data.category) data.category = catNL(target, data.category);
  for (const k of Object.keys(data)) if (data[k] === '' || data[k] == null) delete data[k];
  rows.push({ id: rid, kind: target, data }, { id: r.id, kind: 'inbox', data: { ...dataOf(r), status: 'Done', target, made: rid, doneAt: now } });
  return rows;
}
// accept many cards at once (all, or all of one kind) as one step to undo; closet pieces follow one by one
async function inboxAcceptAll(only) {
  const list = inboxOpen().filter(r => r.status === 'Ready' && r.target && (!only || r.target === only));
  if (!list.length) return;
  if (list.length > 20 && !confirm(`Accept ${list.length} cards and put each where it was sorted?`)) return;
  const now = Date.now(), made = new Map(), rows = [], later = [];
  for (const r of list) { if (r.target === 'closet' || r.target === 'trip') { later.push(r); continue; } if (r.target === 'keep') { rows.push({ id: r.id, kind: 'inbox', data: { ...dataOf(r), status: 'Kept', doneAt: now } }); continue; } const rr = inboxRows(r, r.target, now, made); if (rr) rows.push(...rr); }
  C.toast(`Accepting ${plural(list.length, 'card')}…`);
  try {
    if (rows.length) await putMany(rows, null, `Accepted ${plural(list.length - later.length, 'inbox card')}`);
    for (const r of later) await inboxAccept(r.id, r.target);
    C.toast(`${plural(list.length, 'card')} accepted`);
  } catch { C.toast('Could not save them all. Try again.'); }
}
document.addEventListener('change', e => { const t = e.target; if (!C || !t.matches?.('[data-ibxto]') || !t.value) return; inboxAccept(t.dataset.ibxto, t.value); });
document.addEventListener('submit', e => {
  if (!e.target.matches?.('[data-ibxadd]')) return; e.preventDefault();
  const inp = e.target.querySelector('input'), v = inp.value.trim(); if (!v) return;
  const url = (v.match(/https?:\/\/\S+/) || [''])[0];
  create('inbox', { url, text: url === v ? '' : v, source: 'App', status: 'New' }).then(() => C.toast('In your inbox')).catch(() => {});
  inp.value = '';
});

/* ---------- recipe reviews and what to eat ----------
   A review is a few fixed blocks you tap through after eating: score, make it again, flavour, salt, heat, texture,
   how it felt, which ingredients you liked or not, effort, portion and how it reheated. Together they build a taste
   profile: ingredients you like or don't, and whether you usually want more or less salt and heat. The weekly
   deals task and "What shall I eat?" both use it. */
const reviewsOf = id => recs('rreviews').filter(v => v.recipe === id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
function tasteProfile() {
  const ing = new Map(), add = (n, w) => { const k = deUml(n); if (!k) return; const g = ing.get(k) || { name: n, s: 0, n: 0 }; g.s += w; g.n++; ing.set(k, g); };
  const lean = { salt: 0, spice: 0, taste: 0 }, sign = v => /Too little|Too mild|Too bland/.test(v || '') ? 1 : /Too much|Too hot|Too strong/.test(v || '') ? -1 : 0;
  const feel = new Map();
  for (const v of recs('rreviews')) {
    const w = v.score ? (v.score - 3) / 2 : 0;
    for (const n of [].concat(v.liked || [])) add(n, 1 + Math.max(0, w));
    for (const n of [].concat(v.disliked || [])) add(n, -2);
    lean.salt += sign(v.salt); lean.spice += sign(v.spice); lean.taste += sign(v.taste);
    if ((v.score || 0) >= 4) for (const f of [].concat(v.feel || [])) feel.set(f, (feel.get(f) || 0) + 1);
  }
  const list = [...ing.values()];
  return { likes: list.filter(g => g.s > 0).sort((a, b) => b.s - a.s).map(g => g.name), dislikes: list.filter(g => g.s < 0).sort((a, b) => a.s - b.s).map(g => g.name),
    lean, feels: [...feel].sort((a, b) => b[1] - a[1]).map(([f]) => f), n: recs('rreviews').length };
}
function reviewPanel(id) {
  const vs = reviewsOf(id), avg = vs.filter(v => v.score).reduce((n, v, _, a) => n + v.score / a.length, 0), last = vs[0];
  return `<div class="wmoney"><p><b>${vs.length ? `${avg ? avg.toFixed(1) + '/5 · ' : ''}${plural(vs.length, 'review')}` : 'Not reviewed yet'}</b><span>${last ? esc([last.again ? `make again: ${last.again.toLowerCase()}` : '', last.notes || ''].filter(Boolean).join(' · ')) : 'Tap through a few questions after eating, and the app learns what you like.'}</span></p>
    <div class="dbtns"><button type="button" class="btn small primary" data-rvw="${id}">Review</button>${vs.length ? `<button type="button" class="btn small" data-rvwall="${id}">All reviews</button>` : ''}</div></div>`;
}
// the review sheet: tappable blocks, ingredients cycle between neutral, liked and not liked
function openReview(recipeId, date = today()) {
  const r = L.byId[recipeId]; if (!r) return;
  const ings = [].concat(r.ingredients || []).map(i => L.byId[i]?.name).filter(Boolean);
  const D = { recipe: recipeId, date, score: 0, liked: [], disliked: [], texture: [], feel: [] };
  const one = (k, title, opts) => `<div class="rvb"><p class="dsub">${title}</p><div class="lwrap">${opts.map(o => `<button type="button" class="chip" data-rk="${k}" data-v="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join('')}</div></div>`;
  const many = (k, title, opts) => `<div class="rvb"><p class="dsub">${title}</p><div class="lwrap">${opts.map(o => `<button type="button" class="chip" data-rm="${k}" data-v="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join('')}</div></div>`;
  const sh = C.sheet({
    title: 'How was ' + titleOf(r) + '?',
    body: `<div class="rvw">
      <div class="rvb"><p class="dsub">Overall</p><div class="lrating rvstars">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-rs="${n}" aria-label="${n} of 5" aria-pressed="false">${svg(P.star)}</button>`).join('')}</div></div>
      ${one('again', 'Make it again?', ['Yes', 'Maybe', 'No'])}
      ${one('taste', 'Flavour', ['Too bland', 'Just right', 'Too strong'])}
      ${one('salt', 'Salt', ['Too little', 'Just right', 'Too much'])}
      ${one('spice', 'Heat', ['Too mild', 'Just right', 'Too hot'])}
      ${many('texture', 'Texture I liked', TEXTURES)}
      ${many('feel', 'It felt', FEELS)}
      ${ings.length ? `<div class="rvb"><p class="dsub">Ingredients · tap once if you liked it, twice if you didn't</p><div class="lwrap">${ings.map(n => `<button type="button" class="chip" data-ri="${esc(n)}">${esc(n)}</button>`).join('')}</div></div>` : ''}
      ${one('effort', 'Effort', ['Easy', 'OK', 'Too much work'])}
      ${one('portion', 'Portion', ['Too little', 'Just right', 'Too much'])}
      ${one('reheat', 'Next day / reheated', ['Great', 'OK', 'Not good', 'Didn’t try'])}
      <div class="field full"><label for="rv-n">What I’d change</label><textarea id="rv-n" rows="3" placeholder="e.g. more garlic, less rice, use oat cream"></textarea></div>
      <div class="field"><label for="rv-d">Eaten on</label><input id="rv-d" type="date" value="${esc(date)}"></div></div>`,
    foot: `<span class="busy" data-msg></span><div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary" data-rsave>Save review</button>`
  });
  sh.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.rs) { D.score = Number(b.dataset.rs); sh.querySelectorAll('[data-rs]').forEach(x => x.setAttribute('aria-pressed', Number(x.dataset.rs) <= D.score)); }
    if (b.dataset.rk) { const k = b.dataset.rk; D[k] = D[k] === b.dataset.v ? '' : b.dataset.v; sh.querySelectorAll(`[data-rk="${k}"]`).forEach(x => x.setAttribute('aria-pressed', x.dataset.v === D[k])); }
    if (b.dataset.rm) { const k = b.dataset.rm, a = D[k], i = a.indexOf(b.dataset.v); i >= 0 ? a.splice(i, 1) : a.push(b.dataset.v); b.setAttribute('aria-pressed', i < 0); }
    if (b.dataset.ri) {
      const n = b.dataset.ri, liked = D.liked.includes(n), dis = D.disliked.includes(n);
      D.liked = D.liked.filter(x => x !== n); D.disliked = D.disliked.filter(x => x !== n);
      if (!liked && !dis) D.liked.push(n); else if (liked) D.disliked.push(n);
      b.classList.toggle('rvlike', !liked && !dis); b.classList.toggle('rvno', liked); b.textContent = (!liked && !dis ? '👍 ' : liked ? '👎 ' : '') + n;
    }
    if (b.hasAttribute('data-rsave')) {
      const out = { ...D, notes: sh.querySelector('#rv-n').value.trim(), date: sh.querySelector('#rv-d').value || today(), created: Date.now() };
      for (const k of Object.keys(out)) if (out[k] === '' || out[k] === 0 || (Array.isArray(out[k]) && !out[k].length)) delete out[k];
      b.disabled = true;
      try {
        await put('rreviews', C.uuid(), out);
        // a good score also lands on the recipe itself, and the feel tags help "What shall I eat?"
        if (out.score || out.feel) { const cur = L.byId[recipeId]; await save(cur, { ...(out.score ? { rating: out.score } : {}), ...(out.feel ? { feel: [...new Set([...[].concat(cur.feel || []), ...out.feel])] } : {}) }); }
        C.closeSheet(); C.toast('Thanks. The app now knows a bit more about what you like.');
      } catch { sh.querySelector('[data-msg]').textContent = 'Could not save. Try again.'; b.disabled = false; }
    }
  });
}
// "What shall I eat?": a few quick questions, then your recipes ranked by how well they fit right now
const CHOOSE = { meal: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], time: [['15', '15 min'], ['30', '30 min'], ['60', 'An hour'], ['', 'Any time']], mood: FEELS };
function chooseScore(r, q, ctx) {
  let s = 0; const why = [];
  const catOk = { Breakfast: ['Breakfast'], Lunch: ['Lunch', 'Soup', 'Side Dish'], Dinner: ['Dinner', 'Soup'], Snack: ['Snack', 'Appetizer', 'Baking', 'Dessert'] }[q.meal] || [];
  if (q.meal && r.category) { if (catOk.includes(r.category)) s += 3; else return { r, s: -99, why, off: true }; }
  const mins = (num(r.prep) || 0) + (num(r.cook) || 0);
  if (q.time && mins) { if (mins <= Number(q.time)) { s += 1.5; why.push(`${mins} min`); } else s -= 2; }
  const feel = new Set([...[].concat(r.feel || []), ...reviewsOf(r.id).flatMap(v => [].concat(v.feel || []))]);
  for (const m of q.mood) if (feel.has(m)) { s += 2; why.push(m.toLowerCase()); }
  const ids = [].concat(r.ingredients || []), names = ids.map(i => L.byId[i]?.name).filter(Boolean);
  if (ids.length) { const have = ids.filter(i => L.byId[i]?.stock).length, pct = have / ids.length; s += (q.have ? 4 : 1.5) * pct; if (pct >= .6) why.push(`you have ${have} of ${ids.length}`); }
  const hits = ctx.offers.length ? new Set(names.flatMap(n => dealsFor(n, ctx.offers).map(o => o.id))).size : 0;
  if (hits) { s += (q.deals ? 2 : .7) * Math.min(3, hits); why.push(plural(hits, 'deal')); }
  const like = names.filter(n => ctx.likes.has(deUml(n))).length, dis = names.filter(n => ctx.dislikes.has(deUml(n))).length;
  if (like) { s += like; why.push('things you like'); } if (dis) s -= 3 * dis;
  const vs = reviewsOf(r.id), last = vs[0];
  if (last?.again === 'No') s -= 6; else if (last?.again === 'Yes') { s += 1.5; why.push('you wanted it again'); }
  if (r.rating) s += (r.rating - 3) * .8; if (r.fav) s += 1;
  const lastAte = recs('meals').filter(m => m.recipe === r.id && m.date <= today()).map(m => m.date).sort().pop();
  if (lastAte && diffDays(lastAte, today()) < 5) s -= 3;
  return { r, s: s + Math.random() * .3, why };
}
function openChooser() {
  const q = { meal: new Date().getHours() < 11 ? 'Breakfast' : new Date().getHours() < 15 ? 'Lunch' : 'Dinner', time: '', mood: [], have: false, deals: false }, skip = new Set();
  const prof = tasteProfile(), ctx = { offers: liveOffers(), likes: new Set(prof.likes.map(deUml)), dislikes: new Set(prof.dislikes.map(deUml)) };
  const sh = C.sheet({ title: 'What shall I eat?', body: '<div data-ch></div>' });
  const draw = () => {
    const ranked = recs('recipes').filter(r => !skip.has(r.id)).map(r => chooseScore(r, q, ctx)).filter(x => !x.off).sort((a, b) => b.s - a.s).slice(0, 3);
    const seg = (k, opts) => `<div class="lwrap">${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<button type="button" class="chip" data-cq="${k}" data-v="${esc(v)}" aria-pressed="${k === 'mood' ? q.mood.includes(v) : q[k] === v}">${esc(l)}</button>`; }).join('')}</div>`;
    sh.querySelector('[data-ch]').innerHTML = `<div class="rvw">
      <div class="rvb"><p class="dsub">Which meal</p>${seg('meal', CHOOSE.meal)}</div>
      <div class="rvb"><p class="dsub">How much time</p>${seg('time', CHOOSE.time)}</div>
      <div class="rvb"><p class="dsub">I feel like</p>${seg('mood', CHOOSE.mood)}</div>
      <div class="rvb"><div class="lwrap"><button type="button" class="chip" data-ct="have" aria-pressed="${q.have}">Use what I have</button>${ctx.offers.length ? `<button type="button" class="chip" data-ct="deals" aria-pressed="${q.deals}">Use this week’s deals</button>` : ''}</div></div>
      ${ranked.length ? `<p class="dsub">Try one of these</p><div class="dmeals">${ranked.map(({ r, why }) => `<div class="dmeal">${photoOf(r) ? `<img referrerpolicy="no-referrer" src="${esc(C.photoURL(photoOf(r)))}" alt="" onerror="this.remove()">` : ''}<div class="dmb"><b>${esc(titleOf(r))}</b><span>${esc(why.slice(0, 4).join(' · ') || r.category || '')}</span>
        <div class="dbtns"><button type="button" class="btn small primary" data-ceat="${r.id}">Eat this today</button><button type="button" class="btn small" data-cskip="${r.id}">Not today</button><button type="button" class="btn small" data-act="open" data-id="${r.id}">Open</button></div></div></div>`).join('')}</div>` : quiet('Add some recipes first, then this helps you pick.')}</div>`;
  };
  draw();
  sh.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.cq) { const k = b.dataset.cq, v = b.dataset.v; if (k === 'mood') { const i = q.mood.indexOf(v); i >= 0 ? q.mood.splice(i, 1) : q.mood.push(v); } else q[k] = q[k] === v && k !== 'meal' ? '' : v; draw(); }
    if (b.dataset.ct) { q[b.dataset.ct] = !q[b.dataset.ct]; draw(); }
    if (b.dataset.cskip) { skip.add(b.dataset.cskip); draw(); }
    if (b.dataset.ceat) { try { await create('meals', { date: today(), slot: q.meal, recipe: b.dataset.ceat }); C.closeSheet(); C.toast(`On today’s ${q.meal.toLowerCase()} plan. Enjoy!`); } catch { C.toast('Could not save. Try again.'); } }
  });
}
document.addEventListener('click', e => {
  const b = e.target.closest?.('[data-rvw], [data-rvwall], [data-chooser]'); if (!b || !C) return;
  e.preventDefault(); e.stopPropagation();
  if (b.dataset.rvw) { C.closeSheet(); openReview(b.dataset.rvw, b.dataset.date || today()); }
  else if (b.dataset.rvwall) { const id = b.dataset.rvwall; C.closeSheet(); const vs = reviewsOf(id); C.sheet({ title: 'Reviews of ' + relName(id), body: `<div class="lrows">${vs.map(v => `<div class="lrow"><button class="lmain" data-act="open" data-id="${v.id}"><b>${esc([v.date && niceDate(v.date), v.score ? v.score + '/5' : ''].filter(Boolean).join(' · '))}</b><span>${esc([v.again && 'again: ' + v.again.toLowerCase(), v.taste, v.salt && 'salt ' + v.salt.toLowerCase(), v.spice && 'heat ' + v.spice.toLowerCase(), (v.liked || []).length ? '👍 ' + v.liked.join(', ') : '', (v.disliked || []).length ? '👎 ' + v.disliked.join(', ') : '', v.notes].filter(Boolean).join(' · '))}</span></button></div>`).join('')}</div>` }); }
  else openChooser();
}, true);

/* ---------- stop smoking ----------
   Recipes and pantry items tagged "Stop smoking", plus what is on offer that fits, and plain tips. Food can't make
   you quit, but it can make cravings easier: something crunchy for the hands and mouth, regular meals so hunger
   doesn't feel like a craving, and drinks that replace the moments you used to smoke. */
const QUIT_FOODS = ['Wortel', 'Komkommer', 'Bleekselderij', 'Paprika', 'Radijs', 'Appel', 'Kiwi', 'Sinaasappel', 'Broccoli', 'Popcorn (zonder suiker)', 'Kauwgom zonder suiker', 'Kruidenthee', 'Bruisend water', 'Gember', 'Munt', 'Zoethout (thee)'];
const QUIT_TIPS = [
  ['Something crunchy at hand', 'Carrot, cucumber or celery sticks, an apple or unsweetened popcorn give your hands and mouth something to do.'],
  ['Eat regularly', 'Hunger and a craving feel alike. Three meals and a snack in between keep your blood sugar steady.'],
  ['Ride out the wave', 'A craving usually passes within a few minutes. Drink a glass of water or a cup of tea while you wait.'],
  ['Swap the moment', 'Coffee and alcohol often bring the urge back. Try tea after dinner, or a walk instead of the smoke break.'],
  ['Fruit and vegetables', 'Many people find a cigarette tastes worse after fruit or vegetables, and smoking uses up vitamin C: paprika, kiwi, citrus and broccoli have plenty.'],
  ['Get help', 'Support makes quitting much more likely. The Stoplijn (0800 1995, free) and ikstopnu.nl help, and your GP can advise on nicotine replacement.']
];
// the smoke-free counter: from your quit date and what you used to smoke (prefs.quit)
const QUIT_MS = [[1, '1 day'], [3, '3 days'], [7, '1 week'], [14, '2 weeks'], [30, '1 month'], [60, '2 months'], [90, '3 months'], [182, '6 months'], [365, '1 year']];
function quitStats() {
  const q = C.prefs().quit; if (!q?.date) return null;
  const days = Math.max(0, diffDays(q.date, today())), cigs = days * (num(q.perDay) || 0), saved = cigs / (num(q.perPack) || 20) * (num(q.packPrice) || 0);
  const next = QUIT_MS.find(([n]) => n > days);
  return { q, days, cigs, saved, next, last: [...QUIT_MS].reverse().find(([n]) => n <= days) };
}
function quitCounter() {
  const st = quitStats();
  if (!st) return panel('Smoke-free counter', `<p class="lnone">Fill in when you stopped and what you used to smoke. The app counts the days and the money you keep, and celebrates each milestone.</p><button class="btn small primary" data-act="quitset">Start the counter</button>`);
  return panel('Smoke-free counter', `<div class="tiles lt3">${fTile('Smoke-free', plural(st.days, 'day'), st.last ? st.last[1] + ' reached' : 'every day counts')}${fTile('Money kept', fEur0(st.saved), st.q.packPrice ? 'not spent on packs' : 'add a pack price')}${fTile('Not smoked', String(Math.round(st.cigs)), 'cigarettes')}</div>
    ${st.next ? `<p class="dline"><span>Next milestone</span><b>${st.next[1]}, ${esc(relDay(addDays(st.q.date, st.next[0])))}</b></p><span class="tbar"><i style="width:${Math.min(100, 100 * st.days / st.next[0])}%"></i></span>` : '<p class="lnone">A whole year. Amazing.</p>'}
    <div class="dbtns"><button class="btn small" data-act="quitset">Change</button></div>`);
}
function quitSet() {
  const q = C.prefs().quit || {}, f = (k, l, type, v, ph = '') => `<div class="field"><label for="q-${k}">${l}</label><input id="q-${k}" type="${type}" ${type === 'number' ? 'inputmode="decimal" step="0.01"' : ''} value="${esc(v ?? '')}" placeholder="${esc(ph)}"></div>`;
  const sh = C.sheet({ title: 'Smoke-free counter', body: `<div class="form">${f('date', 'I stopped on', 'date', q.date || today())}${f('perDay', 'Cigarettes a day', 'number', q.perDay, 'e.g. 12')}${f('packPrice', 'Price of a pack', 'number', q.packPrice, 'e.g. 9.80')}${f('perPack', 'Cigarettes in a pack', 'number', q.perPack || 20)}</div>`,
    foot: `${q.date ? '<button class="btn danger" data-qoff>Stop counting</button>' : ''}<div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary" data-qok>Save</button>` });
  const keep = async next => { const before = C.prefs().quit || null; try { await C.savePrefs({ quit: next }); C.undoPush?.('Changed the smoke-free counter', () => C.savePrefs({ quit: before }), true); C.closeSheet(); C.render(); } catch { C.toast('Could not save. Try again.'); } };
  sh.querySelector('[data-qok]').onclick = () => { const v = k => sh.querySelector('#q-' + k).value; keep({ date: v('date') || today(), perDay: num(v('perDay')), packPrice: num(String(v('packPrice')).replace(',', '.')), perPack: num(v('perPack')) || 20 }); };
  const off = sh.querySelector('[data-qoff]'); if (off) off.onclick = () => keep(null);
}
function quitPage(host) {
  const rs = recs('recipes').filter(helpsQuit), ings = recs('ingredients').filter(helpsQuit), plan = curPlan(), offers = liveOffers();
  const words = [...new Set([...ings.map(i => i.name), ...QUIT_FOODS])];
  const deals = offers.filter(o => words.some(w => dealsFor(w, [o]).length)).slice(0, 24);
  const missing = QUIT_FOODS.filter(n => !recs('ingredients').some(i => deUml(i.name) === deUml(n) && helpsQuit(i)));
  host.innerHTML = `${head('Stop smoking')}<div class="panels" style="margin-bottom:16px">${quitCounter()}</div><div class="ldeals">
  <div class="tiles lt3">${fTile('Recipes', String(rs.length), 'tagged Stop smoking')}${fTile('In your pantry', String(ings.length), 'things that help')}${fTile('On offer', String(deals.length), 'this week, that fit')}</div>
  <div class="panels">${panel('What helps', `<div class="lrows qtips">${QUIT_TIPS.map(([t, d]) => `<div class="lrow"><span class="lmain"><b>${esc(t)}</b><span>${esc(d)}</span></span></div>`).join('')}</div>`)}
    ${panel('Keep these at home', `${ings.length ? `<div class="lwrap">${ings.map(i => `<button class="chip ${i.stock ? 'on' : ''}" data-act="open" data-id="${i.id}">${esc(i.name)}${i.stock ? '' : ' · out'}</button>`).join('')}</div>` : quiet('Nothing tagged yet.')}
      ${missing.length ? `<p class="dsub">Ideas</p><div class="lwrap">${missing.map(n => `<span class="chip">${esc(n)}</span>`).join('')}</div><button class="btn small" data-act="quitadd">Add these to my pantry</button>` : ''}`)}</div>
  ${(plan?.quit || []).length || plan?.quitTips ? panel('This week', `${plan.quitTips ? `<p class="lnone">${esc(plan.quitTips)}</p>` : ''}${(plan.quit || []).length ? `<div class="dmeals">${plan.quit.map(m => `<div class="dmeal"><div class="dmb"><b>${esc(m.recipe && L.byId[m.recipe] ? titleOf(L.byId[m.recipe]) : m.name || 'Idea')}</b>${m.why ? `<p>${esc(m.why)}</p>` : ''}</div></div>`).join('')}</div>` : ''}`, ['kitchen/deals', 'Deals of the week']) : ''}
  ${panel('Recipes that help', rs.length ? `<div class="lgrid">${rs.map(card).join('')}</div>` : quiet('Open a recipe and set “Helps with” to Stop smoking, or keep one from the deals.'), ['kitchen/recipes', 'All recipes'])}
  ${deals.length ? panel('On offer this week', `<div class="lgrid dgrid">${deals.map(o => prodCard(o)).join('')}</div>`, ['kitchen/deals', 'All deals']) : ''}</div>`;
}
async function quitAdd() {
  const rows = [];
  for (const n of QUIT_FOODS) {
    const hit = recs('ingredients').find(i => deUml(i.name) === deUml(n));
    if (hit && helpsQuit(hit)) continue;
    rows.push(hit ? { id: hit.id, kind: 'ingredients', data: { ...dataOf(hit), helps: [...new Set([...[].concat(hit.helps || []), QUIT])] } } : { id: C.uuid(), kind: 'ingredients', data: { name: n, helps: [QUIT], created: Date.now() } });
  }
  if (!rows.length) return;
  try { await putMany(rows, null, `Tagged ${plural(rows.length, 'pantry item')} Stop smoking`); C.toast('In your pantry, tagged Stop smoking'); } catch { C.toast('Could not save. Try again.'); }
}

/* ---------- deals of the week ----------
   A weekly task reads the folders of Dirk, Aldi and Albert Heijn and sends the deals plus a plan here (Supabase
   function "offers"): five dinners that each last two days, lunches for the office that reheat in a microwave,
   breakfasts and snacks, built so the same deal ingredients come back in several recipes. This page shows the
   plan, matches the deals to your own recipes, and puts the plan into your meal plan and grocery list. */
const deUml = s => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
const ingWords = name => deUml(name).split(/[^a-z]+/).filter(w => w.length >= 4 && !['vers', 'verse', 'stuks', 'gram', 'kilo', 'pakje', 'blik'].includes(w));
// which deals hit an ingredient name: a word of the ingredient appears in the deal's name
const dealsFor = (name, offers) => { const ws = ingWords(name); return ws.length ? offers.filter(o => { const n = deUml(o.name); return ws.some(w => n.includes(w)); }) : []; };
const curPlan = () => recs('wplans').filter(p => p.start && p.start <= addDays(today(), 3)).sort((a, b) => b.start.localeCompare(a.start))[0] || null;
const liveOffers = () => recs('offers').filter(o => !o.until || o.until >= today());
function recipeDeals(offers) {
  const ingName = id => L.byId[id]?.name || '';
  return recs('recipes').map(r => { const hits = new Map(); for (const id of [].concat(r.ingredients || [])) for (const o of dealsFor(ingName(id), offers)) hits.set(o.id, o); return { r, hits: [...hits.values()] }; })
    .filter(x => x.hits.length).sort((a, b) => b.hits.length - a.hits.length || (b.r.rating || 0) - (a.r.rating || 0));
}
/* To do, in every section: records that still miss details. Per list the fields that matter, and when a record counts
   (finished, archived or done records never do). Tap a row to open it and fill it in. */
const empty = v => v == null || v === '' || (Array.isArray(v) && !v.length);
const need = (k, label, when) => [k, label, r => (when ? when(r) : true) && empty(r[k])];
const RTODO = [
  ['photo', 'Photo', r => !r.photo], ['category', 'Category', r => !r.category], ['time', 'Time', r => !num(r.prep) && !num(r.cook)],
  // ingredients count from the list with amounts too (Albo recipes), not only from pantry links
  ['servings', 'Servings', r => !num(r.servings)], ['ingredients', 'Ingredients', r => ![].concat(r.ingredients || []).length && !parseRecipe(r).lines.length],
  ['amounts', 'Amounts', r => { const l = [].concat(r.ilines || []).filter(x => x && x.h == null && x.n); return l.length > 0 && !l.some(x => String(x.q ?? '').trim()); }],
  ['steps', 'Steps', r => !parseRecipe(r).steps.length],
  // protein is known when you typed it, entered your own value, or the estimate found some
  ['protein', 'Protein', r => !String(r.protein || '').trim() && num(r.nprot) == null && !(nutriOf(r).per.p > 0)],
  // how it felt and how good it was only matter once you cooked it
  ['feel', 'Feels like', r => hasCooked(r) && ![].concat(r.feel || []).length], ['rating', 'Rating', r => hasCooked(r) && !num(r.rating)]
];
// cooked at least once: you tapped "I made this", it was in your meal plan on a day that has passed, or you reviewed it
const hasCooked = r => num(r.cooks) > 0 || !!r.lastCooked || recs('meals').some(m => m.recipe === r.id && m.date && m.date <= today()) || recs('rreviews').some(x => x.recipe === r.id);
const TODO = {
  kitchen: {
    recipes: { checks: RTODO },
    ingredients: { checks: [need('category', 'Category'), need('location', 'Kept in')] },
    gear: { checks: [need('category', 'Category'), need('photo', 'Photo')] }
  },
  care: {
    beauty: { when: r => !r.finished && !r.archived, checks: [need('brand', 'Brand'), need('type', 'Type'), need('photo', 'Photo'), need('am', 'Morning or evening', r => !r.wish && !r.pm && r.type !== 'Fragrance')] },
    supplements: { when: r => !r.finished, checks: [need('brand', 'Brand'), need('form', 'Form'), need('amount', 'Amount', r => !r.wish), need('times', 'When to take', r => !r.wish), need('photo', 'Photo')] },
    ideas: { checks: [need('area', 'Area'), need('what', 'What it is'), need('summary', 'Summary'), need('photo', 'Photo')] },
    gifts: { when: r => r.status !== 'Given', checks: [need('for', 'For'), need('occasion', 'Occasion'), need('price', 'Price')] },
    courses: { when: r => r.status !== 'Completed', checks: [need('category', 'Category'), need('platform', 'Platform'), need('url', 'Link')] },
    documents: { checks: [need('category', 'Category'), need('location', 'Where it is')] }
  },
  social: {
    posts: { when: r => r.stage !== 'Posted', checks: [need('date', 'Post date'), need('format', 'Format'), need('platforms', 'Platforms'), need('pillar', 'Pillar'), need('desc', 'What it is'), need('hook', 'Hook')] },
    cideas: { when: r => !['Dropped', 'Planned'].includes(r.status), checks: [need('pillar', 'Pillar'), need('format', 'Format'), need('desc', 'What it is')] },
    stips: { checks: [need('category', 'Category'), need('summary', 'What it is'), need('steps', 'Steps')] },
    inspo: { checks: [need('type', 'Type'), need('photo', 'Picture'), need('why', 'What I like')] },
    deals: { when: r => !['Paid', 'Declined'].includes(r.status), checks: [need('type', 'Type'), need('fee', 'Fee', r => r.type === 'Paid'), need('contact', 'Contact'), need('deliverables', 'Deliverables'), ['dates', 'Deadline', r => !r.due && !r.postBy]] },
    pillars: { checks: [need('desc', 'What it covers'), need('perMonth', 'Posts per month')] },
    accounts: { when: r => r.active !== false, checks: [need('handle', 'Handle'), need('followers', 'Followers')] }
  },
  wish: {
    wishes: { when: r => !r.archived && !['Bought', 'Dropped'].includes(r.status), checks: [need('category', 'Category'), need('price', 'Price'), need('photo', 'Photo'), need('shop', 'Shop'), need('why', 'Why I want it')] }
  },
  money: {
    fbills: { when: r => r.active !== false, checks: [need('amount', 'Amount'), need('category', 'Category'), need('account', 'Account'), need('anchor', 'First date')] },
    fdebts: { when: r => (num(r.balance) || 0) > 0 || empty(r.balance), checks: [need('balance', 'Balance'), need('payment', 'Monthly payment'), need('apr', 'Interest')] },
    fgoals: { when: r => !r.done, checks: [need('target', 'Target'), need('by', 'Date')] }
  },
  home: {
    plants: { checks: [need('location', 'Where'), need('every', 'Water every'), need('light', 'Light'), need('photo', 'Photo')] },
    inventory: { checks: [need('room', 'Room'), need('category', 'Category'), need('photo', 'Photo')] },
    chores: { checks: [need('space', 'Rooms'), need('freq', 'How often')] }
  },
  fit: {
    exercises: { checks: [need('muscles', 'Muscles'), ['how', 'Photo or link', r => !r.photo && !r.link]] },
    vworkouts: { checks: [need('type', 'Type'), need('minutes', 'Minutes'), need('level', 'Level')] },
    fitgear: { checks: [need('category', 'Category'), need('photo', 'Photo')] },
    plans: { checks: [need('exercises', 'Exercises')] }
  }
};
// the new Plan and Body sections gather the to-dos of the areas they hold
TODO.plan = { ideas: TODO.care.ideas, gifts: TODO.care.gifts, courses: TODO.care.courses, documents: TODO.care.documents, ...TODO.wish };
TODO.body = { beauty: TODO.care.beauty, supplements: TODO.care.supplements, ...TODO.fit };
function sectionTodo(host, sec) {
  const cfg = TODO[sec] || {};
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('ltodo:' + sec) || '{}'); } catch {}
  const T = (L.todo ||= {})[sec] ||= { kind: 'all', sort: 'most', view: 'list', group: 'kind', idx: 0, ...saved };
  const keep = () => { try { localStorage.setItem('ltodo:' + sec, JSON.stringify({ sort: T.sort, view: T.view, group: T.group })); } catch {} };
  const all = Object.entries(cfg).flatMap(([kind, c]) => recs(kind).filter(r => !c.when || c.when(r)).map(r => ({ r, kind, miss: c.checks.filter(x => x[2](r)) })).filter(x => x.miss.length));
  const kinds = Object.keys(cfg).map(k => [k, all.filter(x => x.kind === k).length]).filter(([, n]) => n);
  if (T.kind !== 'all' && !kinds.some(([k]) => k === T.kind)) T.kind = 'all';
  const cmp = { most: (a, b) => b.miss.length - a.miss.length || norm(titleOf(a.r)).localeCompare(norm(titleOf(b.r))), almost: (a, b) => a.miss.length - b.miss.length || norm(titleOf(a.r)).localeCompare(norm(titleOf(b.r))), new: (a, b) => (b.r.created || 0) - (a.r.created || 0), old: (a, b) => (a.r.created || 0) - (b.r.created || 0), az: (a, b) => norm(titleOf(a.r)).localeCompare(norm(titleOf(b.r))) };
  const shown = all.filter(x => T.kind === 'all' || x.kind === T.kind).sort(cmp[T.sort] || cmp.most);
  const total = Object.entries(cfg).reduce((n, [k, c]) => n + recs(k).filter(r => !c.when || c.when(r)).length, 0);
  // groups: per list (always for the table, which needs one kind of record), per missing field, or none
  const groups = [];
  if (T.view === 'table' || T.group === 'kind') for (const [k] of kinds) { const l = shown.filter(x => x.kind === k); if (l.length) groups.push({ label: KINDS[k].many, kind: k, list: l }); }
  else if (T.group === 'missing') { const labels = [...new Set(shown.flatMap(x => x.miss.map(m => m[1])))]; for (const lab of labels) groups.push({ label: 'Geen ' + lab.toLowerCase(), list: shown.filter(x => x.miss.some(m => m[1] === lab)) }); }
  else groups.push({ label: '', list: shown });
  const row = ({ r, kind, miss }) => `<div class="ltodo"><button class="lmain" data-act="open" data-id="${r.id}"><b>${esc(titleOf(r))}</b><span>${esc(KINDS[kind].many)}${KINDS[kind].sub?.(r) ? ' · ' + esc(KINDS[kind].sub(r)) : ''}</span></button><p class="todomiss">${miss.map(m => `<span>${esc(m[1])}</span>`).join('')}</p></div>`;
  let body = '';
  if (T.view === 'one') {
    if (T.idx >= shown.length) T.idx = 0;
    const x = shown[T.idx];
    if (x) { const K = KINDS[x.kind], fs = x.miss.map(m => K.fields.find(f => f.k === m[0])).filter(f => f && TABLE_TYPES.includes(f.type)), other = x.miss.filter(m => !fs.some(f => f.k === m[0]));
      body = `<div class="tdone ltdone"><div class="tdonef"><p class="muted">${T.idx + 1} of ${shown.length} · ${esc(K.many)}</p><h2>${esc(titleOf(x.r))}</h2>${fs.map(f => `<div class="field"><label>${esc(f.label)}</label>${cellIn(x.r, f)}</div>`).join('')}${other.length ? `<p class="muted">Also: ${esc(other.map(m => m[1]).join(', '))}.</p>` : ''}<div class="setbtns"><button class="btn" data-tdprev ${T.idx ? '' : 'disabled'}>Back</button><button class="btn primary" data-tdnext>Next</button><button class="btn small" data-act="open" data-id="${x.r.id}">Full editor</button></div></div></div>`; }
  } else body = groups.map(g => `<section class="tdgroup">${g.label ? `<div class="tdgh"><h3>${esc(g.label)} <span class="muted">${g.list.length}</span></h3></div>` : ''}${T.view === 'table' ? tableHTML(g.list.map(x => x.r), KINDS[g.kind], [...new Set(g.list.flatMap(x => x.miss.map(m => m[0])))]) : `<div class="lrows">${g.list.slice(0, 300).map(row).join('')}</div>`}</section>`).join('');
  host.innerHTML = `<div class="viewhead"><h1>To do</h1><span class="sub">${total ? `${all.length} of ${total} miss something` : ''}</span></div>
    ${all.length ? `<div class="tools tdtools"><div class="seg" role="group" aria-label="View">${[['list', 'List'], ['table', 'Table'], ['one', 'One by one']].map(([k, l]) => `<button data-tdview="${k}" aria-pressed="${T.view === k}">${l}</button>`).join('')}</div>
      ${T.view === 'list' ? `<label class="tdpick"><span>Group by</span><select class="pill" data-tdgroup>${[['kind', 'List'], ['missing', 'Missing field'], ['none', 'No groups']].map(([k, l]) => `<option value="${k}" ${T.group === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
      <label class="tdpick"><span>Sort</span><select class="pill" data-tdsort>${[['most', 'Most missing first'], ['almost', 'Almost done first'], ['az', 'Name A to Z'], ['new', 'Newest first'], ['old', 'Oldest first']].map(([k, l]) => `<option value="${k}" ${T.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
    ${kinds.length > 1 ? `<div class="chips" role="group" aria-label="List"><button class="chip" data-tdkind="all" aria-pressed="${T.kind === 'all'}">Everything <span class="n">${all.length}</span></button>${kinds.map(([k, n]) => `<button class="chip" data-tdkind="${k}" aria-pressed="${T.kind === k}">${esc(KINDS[k].many)} <span class="n">${n}</span></button>`).join('')}</div>` : ''}
    ${body}`
    : quiet(total ? 'Everything here has its details. Nice.' : 'Add things in this section; anything they still miss shows up here.')}`;
  if (!host.dataset.tdwired) {
    host.dataset.tdwired = '1';
    host.addEventListener('click', async e => {
      const T2 = L.todo[sec], k = e.target.closest('[data-tdkind]'); if (k) { T2.kind = k.dataset.tdkind; T2.idx = 0; return sectionTodo(host, sec); }
      const v = e.target.closest('[data-tdview]'); if (v) { T2.view = v.dataset.tdview; T2.idx = 0; keep(); return sectionTodo(host, sec); }
      if (e.target.closest('[data-tdnext]')) { L.quiet = true; try { for (const el of host.querySelectorAll('.ltdone [data-lcell]')) await cellSave(el); } finally { L.quiet = false; } T2.idx++; return sectionTodo(host, sec); }
      if (e.target.closest('[data-tdprev]')) { T2.idx = Math.max(0, T2.idx - 1); return sectionTodo(host, sec); }
    });
    host.addEventListener('change', e => { const T2 = L.todo[sec]; const so = e.target.closest('[data-tdsort]'); if (so) { T2.sort = so.value; keep(); sectionTodo(host, sec); } const gr = e.target.closest('[data-tdgroup]'); if (gr) { T2.group = gr.value; keep(); sectionTodo(host, sec); } });
  }
}
/* Planning: every step of every post on a calendar, a week or a month at a time */
function postEvents(from, to) {
  const out = [];
  for (const p of recs('posts')) for (const [k, label, upto] of POST_STEPS) {
    const d = p[k]; if (!d || d < from || d > to) continue;
    out.push({ p, k, label, d, done: k === 'date' ? p.stage === 'Posted' : stepDone(p, upto) });
  }
  // collab deadlines sit on the same calendar
  for (const c of recs('deals').filter(x => x.status !== 'Declined')) for (const [k, label] of DEAL_DATES) {
    const d = c[k]; if (!d || d < from || d > to) continue;
    out.push({ p: c, k: 'collab', label, d, done: k === 'payBy' ? c.status === 'Paid' : ['Delivered', 'Paid'].includes(c.status) });
  }
  return out.sort((a, b) => a.d.localeCompare(b.d) || POST_STEPS.findIndex(x => x[0] === a.k) - POST_STEPS.findIndex(x => x[0] === b.k));
}
// one day to script, film or edit several posts in a row
function batchDay() {
  const list = recs('posts').filter(p => p.stage !== 'Posted').sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
  if (!list.length) { C.toast('Plan a post first, then batch it'); return; }
  const sh = C.sheet({ title: 'Plan a batch day', body: `<div class="form"><div class="field"><label for="bd-d">Day</label><input id="bd-d" type="date" value="${addDays(today(), 1)}"></div>
    <div class="field"><label for="bd-s">What you do that day</label><select id="bd-s">${POST_STEPS.slice(0, 3).map(([k, l]) => `<option value="${k}" ${k === 'filmOn' ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>
    <p class="dsub">Posts</p><div class="lrows" data-bdl>${list.map(p => `<label class="lrow lbatch"><input type="checkbox" value="${p.id}"><span class="lmain"><b>${esc(titleOf(p))}</b><span>${esc([p.stage, p.date && 'post ' + relDay(p.date)].filter(Boolean).join(' · '))}</span></span></label>`).join('')}</div>`,
    foot: `<span class="busy" data-bdm></span><div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary" data-bdok>Plan</button>` });
  sh.querySelector('[data-bdok]').onclick = async () => {
    const day = sh.querySelector('#bd-d').value, k = sh.querySelector('#bd-s').value, ids = [...sh.querySelectorAll('[data-bdl] input:checked')].map(i => i.value);
    if (!day || !ids.length) { sh.querySelector('[data-bdm]').textContent = 'Pick a day and at least one post.'; return; }
    const label = POST_STEPS.find(x => x[0] === k)[1].toLowerCase();
    try { await putMany(ids.map(id => { const r = L.byId[id]; return { id, kind: 'posts', data: { ...dataOf(r), [k]: day } }; }), null, `Batch day ${shortDate(day)}: ${label} ${plural(ids.length, 'post')}`); C.closeSheet(); } catch (e) { failed(e); }
  };
}
const STEP_CLS = { scriptOn: 'sscript', filmOn: 'sfilm', editOn: 'sedit', date: 'spost', collab: 'scollab' };
const DEAL_DATES = [['draftBy', 'Collab draft'], ['postBy', 'Collab post'], ['due', 'Collab due'], ['payBy', 'Collab payment']];
function socialPlan(host) {
  const P2 = L.splan ||= { mode: 'week', off: 0 }, t = today();
  const ev = e => `<button class="chip lstep ${STEP_CLS[e.k]} ${e.done ? 'done' : ''}" data-act="open" data-id="${e.p.id}">${e.done ? svg(P.check) : ''}<b>${esc(e.label)}</b> ${esc(titleOf(e.p))}</button>`;
  const seg = `<div class="seg" role="group" aria-label="View"><button data-splan="week" aria-pressed="${P2.mode === 'week'}">Week</button><button data-splan="month" aria-pressed="${P2.mode === 'month'}">Month</button></div>`;
  const legend = `<p class="lnone llegend">${[...POST_STEPS, ['collab', 'Collab']].map(([k, l]) => `<span class="lstep ${STEP_CLS[k]}"><i></i>${esc(l)}</span>`).join('')}</p>`;
  let body;
  if (P2.mode === 'week') {
    const start = weekStart(P2.off), days = Array.from({ length: 7 }, (_, i) => addDays(start, i)), es = postEvents(days[0], days[6]);
    body = `<div class="lweeknav"><button class="iconbtn" data-splanmove="-1" aria-label="Previous week">${svg(P.left)}</button><b>${shortDate(days[0])} to ${shortDate(days[6])}</b><button class="iconbtn" data-splanmove="1" aria-label="Next week">${svg(P.right)}</button>${P2.off ? '<button class="chip" data-splanmove="0">This week</button>' : ''}</div>
      <div class="lweek">${days.map(d => { const de = es.filter(e => e.d === d); return `<div class="lday ${d === t ? 'now' : ''}"><div class="ldh"><b>${dayName(d)}</b><span>${shortDate(d)}</span></div><div class="lwrap">${de.map(ev).join('') || '<span class="lnone">Nothing planned</span>'}</div></div>`; }).join('')}</div>`;
  } else {
    const m0 = addMonths(t.slice(0, 7) + '-01', P2.off), first = fromISO(m0), lead = (first.getDay() + 6) % 7, n = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells = [...Array(lead).fill(''), ...Array.from({ length: n }, (_, i) => addDays(m0, i))], es = postEvents(m0, addDays(m0, n - 1));
    body = `<div class="lweeknav"><button class="iconbtn" data-splanmove="-1" aria-label="Previous month">${svg(P.left)}</button><b>${esc(first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))}</b><button class="iconbtn" data-splanmove="1" aria-label="Next month">${svg(P.right)}</button>${P2.off ? '<button class="chip" data-splanmove="0">This month</button>' : ''}</div>
      <div class="mcal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<b class="mdow">${d}</b>`).join('')}${cells.map(d => { if (!d) return '<span></span>'; const de = es.filter(e => e.d === d);
        return `<div class="mday ${d < t ? 'past' : ''} ${d === t ? 'now' : ''}"><span>${fromISO(d).getDate()}</span>${de.slice(0, 4).map(e => `<button class="mstep ${STEP_CLS[e.k]} ${e.done ? 'done' : ''}" data-act="open" data-id="${e.p.id}" title="${esc(e.label + ': ' + titleOf(e.p))}"><i></i><em>${esc(titleOf(e.p))}</em></button>`).join('')}${de.length > 4 ? `<small>+${de.length - 4}</small>` : ''}</div>`; }).join('')}</div>`;
  }
  host.innerHTML = `<div class="viewhead"><h1>Planning</h1><span class="sub">Script, film, edit and post</span></div><div class="lplanhead">${seg}<button class="btn small" data-batchday>Plan a batch day</button>${legend}</div>${body}`;
  if (!host.dataset.spwired) {
    host.dataset.spwired = '1';
    host.addEventListener('click', e => {
      if (e.target.closest('[data-batchday]')) { batchDay(); return; }
      const m = e.target.closest('[data-splan]'); if (m) { L.splan.mode = m.dataset.splan; L.splan.off = 0; socialPlan(host); return; }
      const mv = e.target.closest('[data-splanmove]'); if (mv) { L.splan.off = mv.dataset.splanmove === '0' ? 0 : L.splan.off + Number(mv.dataset.splanmove); socialPlan(host); }
    });
  }
}
/* Insights: how your posts do (per month, per format and pillar), when they do best, whether your pillars are in balance,
   and which good posts are ready to use again. Numbers come from the posts themselves (synced or typed in). */
const reach = p => num(p.views) || 0, engage = p => (num(p.likes) || 0) + (num(p.comments) || 0) + (num(p.shares) || 0);
const kfmt = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'K' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.0', '') + 'K' : String(Math.round(n));
function avgTable(rows, label) {
  const max = Math.max(1, ...rows.map(r => r.avg));
  return `<div class="ltable" role="table" aria-label="${esc(label)}">${rows.map(r => `<div class="ltr" role="row" title="${esc(`${r.k}: ${kfmt(r.avg)} views on average over ${plural(r.n, 'post')}`)}"><span role="cell">${esc(r.k)}</span><span class="lbarwrap" role="cell"><i class="lbar" style="width:${Math.max(2, Math.round(100 * r.avg / max))}%"></i></span><b role="cell">${kfmt(r.avg)}</b><small role="cell">${plural(r.n, 'post')}</small></div>`).join('')}</div>`;
}
function groupAvg(list, key) {
  const m = new Map(); for (const p of list) for (const k of [].concat(key(p) || [])) { if (!k) continue; const e = m.get(k) || { k, n: 0, sum: 0 }; e.n++; e.sum += reach(p); m.set(k, e); }
  return [...m.values()].map(e => ({ ...e, avg: e.sum / e.n })).sort((a, b) => b.avg - a.avg);
}
function socialInsights(host) {
  const t = today(), posted = recs('posts').filter(p => p.stage === 'Posted' && p.date);
  const months = Array.from({ length: 6 }, (_, i) => addMonths(t.slice(0, 7) + '-01', i - 5).slice(0, 7));
  const per = months.map(m => { const l = posted.filter(p => p.date.startsWith(m)); return { m, n: l.length, views: l.reduce((a, p) => a + reach(p), 0), eng: l.reduce((a, p) => a + engage(p), 0) }; });
  const maxV = Math.max(1, ...per.map(x => x.views)), withViews = posted.filter(p => reach(p) > 0);
  const W = 600, H = 220, padB = 34, padT = 30, bw = W / per.length;
  const chart = `<svg class="lchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Views per month">${[0.5, 1].map(f => `<line x1="0" x2="${W}" y1="${padT + (H - padT - padB) * (1 - f)}" y2="${padT + (H - padT - padB) * (1 - f)}" class="lgrid"/>`).join('')}<line x1="0" x2="${W}" y1="${H - padB}" y2="${H - padB}" class="laxis"/>${per.map((x, i) => { const h = Math.round((H - padT - padB) * x.views / maxV), xx = i * bw + bw * 0.22, w = bw * 0.56;
    return `<g><title>${esc(fromISO(x.m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))}: ${kfmt(x.views)} views, ${kfmt(x.eng)} likes, comments and shares, ${plural(x.n, 'post')}</title><rect x="${i * bw}" y="0" width="${bw}" height="${H}" fill="transparent"/>${h ? `<path class="lbarv" d="M${xx},${H - padB} V${H - padB - h + 4} q0,-4 4,-4 h${w - 8} q4,0 4,4 V${H - padB} Z"/>` : ''}${x.views ? `<text x="${xx + w / 2}" y="${H - padB - h - 6}" text-anchor="middle" class="lval">${kfmt(x.views)}</text>` : ''}<text x="${xx + w / 2}" y="${H - 9}" text-anchor="middle" class="ltick">${esc(fromISO(x.m + '-01').toLocaleDateString('en-GB', { month: 'short' }))}</text></g>`; }).join('')}</svg>`;
  const top = [...withViews].sort((a, b) => reach(b) - reach(a)).slice(0, 5);
  const WD = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const byDay = groupAvg(withViews, p => WD[(fromISO(p.date).getDay() + 6) % 7]);
  const band = h => h < 6 ? 'Night (0 to 6)' : h < 12 ? 'Morning (6 to 12)' : h < 17 ? 'Afternoon (12 to 17)' : h < 21 ? 'Evening (17 to 21)' : 'Late (21 to 24)';
  const byTime = groupAvg(withViews.filter(p => p.time), p => band(Number(String(p.time).slice(0, 2))));
  const byFormat = groupAvg(withViews, p => p.format), byPillar = groupAvg(withViews, p => relName(p.pillar));
  const month = t.slice(0, 7), pillars = recs('pillars'), mine = recs('posts').filter(p => p.date?.startsWith(month));
  const bal = pillars.map(pl => ({ pl, n: mine.filter(p => p.pillar === pl.id).length, goal: num(pl.perMonth) || 0 }));
  const reuse = recs('posts').filter(p => p.stage === 'Posted' && p.date && (p.repurpose || p.top) && diffDays(p.date, t) >= 90).sort((a, b) => reach(b) - reach(a));
  const best = byDay[0], bestT = byTime[0];
  host.innerHTML = `<div class="viewhead"><h1>Insights</h1><span class="sub">${plural(posted.length, 'post')} out · ${kfmt(posted.reduce((a, p) => a + reach(p), 0))} views in total</span></div>
  ${(() => { const a = pnAcc(), st = a?.pnStats; return a?.pnSync && st ? `<section class="panel lpanel"><div class="lph3"><h3>Pinterest, laatste 30 dagen</h3><button class="chip link" data-act="go" data-v="social/pinterest">Pinterest</button></div><div class="tiles">${fTile('Weergaven', kfmt(st.impressions || 0), 'impressies')}${fTile('Saves', kfmt(st.saves || 0), 'bewaard')}${fTile('Klikken', kfmt((st.clicks || 0) + (st.outbound || 0)), 'pin en link')}</div></section>` : ''; })()}
  <div class="panels">
    ${panel('Views per month', posted.length ? `${chart}<p class="lnone">Hover or tap a month for likes, comments and shares.</p>` : quiet('Posts with the stage Posted and a date show up here. Instagram and TikTok posts sync their numbers by themselves.'))}
    ${panel('Best time to post', withViews.length >= 3 ? `${best ? `<p class="lbig">${esc(best.k)}${bestT ? ', ' + esc(bestT.k.split(' (')[0].toLowerCase()) : ''}</p><p class="lnone">Your posts get the most views on average then. ${withViews.length < 15 ? 'With more posts this gets more reliable.' : ''}</p>` : ''}<p class="dsub">By day</p>${avgTable(byDay, 'Average views by day')}${byTime.length ? `<p class="dsub">By time of day</p>${avgTable(byTime, 'Average views by time of day')}` : quiet('Give your posts a time (At) to see the best time of day.')}` : quiet('Once 3 posts have views, this shows which day and time work best.'))}
    ${panel('Pillars this month', pillars.length ? `<div class="lrows">${bal.map(x => `<div class="lrow"><button class="lmain" data-act="open" data-id="${x.pl.id}"><b>${esc(titleOf(x.pl))}</b><span>${x.goal ? `${x.n} of ${x.goal} posts` : `${plural(x.n, 'post')} · set a goal per month`}</span>${x.goal ? `<span class="lbarwrap"><i class="lbar ${x.n >= x.goal ? 'full' : ''}" style="width:${Math.min(100, Math.round(100 * x.n / x.goal))}%"></i></span>` : ''}</button></div>`).join('')}</div>` : quiet('Add content pillars under Brand to see if your posts are in balance.'), ['social/brand', 'Pillars'])}
    ${panel('By format', byFormat.length ? avgTable(byFormat, 'Average views by format') : quiet('Give posts a format to compare them.'))}
    ${byPillar.length ? panel('By pillar', avgTable(byPillar, 'Average views by pillar')) : ''}
    ${panel('Top posts', top.length ? `<div class="lrows">${top.map(row).join('')}</div>` : quiet('Your best posts show up here.'), ['social/posts', 'All posts'])}
    ${panel('Ready to use again', reuse.length ? `<div class="lrows">${reuse.slice(0, 8).map(row).join('')}</div><p class="lnone">Posts marked Top performer or Repurpose this, posted 3 months ago or more.</p>` : quiet('Mark a post Top performer or Repurpose this. After 3 months it shows up here, and you get a reminder.'))}
  </div>`;
}
/* Skincare week: seven days, a morning and an evening each, with the products in the order you use them.
   Tap + to add products to a moment, × to take one off that day, Order to drag your own order. */
async function setSkinDays(b, eve, days) {
  const k = eve ? 'pmDays' : 'amDays', o = eve ? 'amDays' : 'pmDays', d = dataOf(b);
  const data = { ...d, [k]: WEEKDAYS.filter(x => days.includes(x)), [o]: eve ? amDaysOf(b) : pmDaysOf(b) };
  data.am = data.amDays.length > 0; data.pm = data.pmDays.length > 0;
  await put('beauty', b.id, data);
}
/* Skin diary photos live in a private bucket "skin": only you, signed in, can open them (links last an hour). */
const SIGNED = new Map();
async function signedURL(path) {
  const hit = SIGNED.get(path); if (hit && hit.until > Date.now()) return hit.url;
  const { data, error } = await C.sb.storage.from('skin').createSignedUrl(path, 3600); if (error) throw error;
  SIGNED.set(path, { url: data.signedUrl, until: Date.now() + 3300e3 }); return data.signedUrl;
}
function fillSigned(root) { root?.querySelectorAll?.('img[data-spath]').forEach(img => { if (img.src) return; signedURL(img.dataset.spath).then(u => { img.src = u; }).catch(() => { img.alt = 'Photo not available'; img.classList.add('nophoto'); }); }); }
async function skinUpload(blob) {
  const path = `${C.uid()}/${C.uuid()}.jpg`;
  const { error } = await C.sb.storage.from('skin').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
  if (error) throw new Error(/bucket|not found/i.test(error.message) ? 'The private photo storage is not set up yet. See Skin diary for the steps.' : error.message);
  return path;
}
function skinRemove(path) { C.sb.storage.from('skin').remove([path]).catch(() => {}); }
// reviews of a product, and which one is due (1, 4 and 8 weeks after you opened it)
function beautyReviews(r) {
  const vs = recs('breviews').filter(v => v.product === r.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const wk = r.opened ? Math.floor(diffDays(r.opened, today()) / 7) : null, has = a => vs.some(v => v.after === a);
  const due = wk == null ? (vs.length ? '' : 'First use') : wk >= 8 && !has('8 weeks') ? '8 weeks' : wk >= 4 && !has('4 weeks') ? '4 weeks' : wk >= 1 && !has('1 week') ? '1 week' : !vs.length ? 'First use' : '';
  const fillRow = `<div class="lwrap bfill"><span class="lnone">Open one:</span>${FILL_LEVELS.map(f => `<button type="button" class="chip ${r.fill === f ? 'on' : ''}" data-act="bfill" data-id="${r.id}" data-v="${f}" aria-pressed="${r.fill === f}">${f}</button>`).join('')}</div>`;
  const lowBtn = fillRow + `<div class="lwrap blowrow"><span class="lnone">In stock:</span>${stepper(r)}<button type="button" class="chip ${r.low ? 'on' : ''}" data-act="blowsheet" data-id="${r.id}" aria-pressed="${!!r.low}">${r.low ? svg(P.check) + ' Running low' : 'Running low?'}</button><span class="lnone">${r.low ? 'The weekly task looks for deals on this.' : 'Tap when it is almost empty, and the weekly task looks for deals.'}</span></div>`;
  return lowBtn + `<section class="ltipsteps"><div class="lph3"><h3>Reviews</h3><button type="button" class="chip ${due ? 'on' : ''}" data-act="newreview" data-id="${r.id}" data-v="${esc(due || 'Later')}">${due ? `Write your ${esc(due.toLowerCase())} review` : 'Add a review'}</button></div>
    ${vs.length ? `<div class="lrows">${vs.map(v => `<div class="lrow"><button class="lmain" data-act="open" data-id="${v.id}"><b>${esc(v.after || 'Review')}${reviewAvg(v) ? ` · ${reviewAvg(v).toFixed(1)} / 5` : ''}</b><span>${esc([v.date && niceDate(v.date), v.again && 'buy again: ' + v.again.toLowerCase(), v.reason].filter(Boolean).join(' · '))}</span></button></div>`).join('')}</div>` : '<p class="lnone">No reviews yet. Rate how your skin reacts, how it feels, and whether you would buy it again.</p>'}</section>`;
}
/* Skin diary: photos, how your skin is, what you used and the circumstances, in four views */
const lvl = v => Math.max(0, SKIN_LEVELS.indexOf(v));
function skinDiary(host) {
  const D2 = L.sdiary ||= { mode: 'timeline' }, list = recs('skinlog').filter(x => x.date).sort((a, b) => (b.date + (b.time === 'Evening' ? 'b' : 'a')).localeCompare(a.date + (a.time === 'Evening' ? 'b' : 'a')));
  const ANG = [['front', 'Front'], ['left', 'Left'], ['right', 'Right']], thumb = (x, k) => x[k] ? `<img data-spath="${esc(x[k])}" alt="${esc(k)} ${esc(niceDate(x.date))}" loading="lazy">` : '';
  const seg = `<div class="seg" role="group" aria-label="View">${[['timeline', 'Timeline'], ['compare', 'Compare'], ['grid', 'Photos'], ['chart', 'Chart']].map(([k, l]) => `<button data-sdmode="${k}" aria-pressed="${D2.mode === k}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (!list.length) body = quiet('Add your first entry: a few photos, how your skin is today, and what you used.');
  else if (D2.mode === 'timeline') body = `<div class="lrows">${list.map(x => `<div class="sdrow"><button class="lmain" data-act="open" data-id="${x.id}"><b>${esc(niceDate(x.date))}${x.time ? ' · ' + esc(x.time.toLowerCase()) : ''}</b><span>${esc(KINDS.skinlog.sub(x))}</span>${x.notes ? `<span>${esc(x.notes.slice(0, 120))}</span>` : ''}</button><div class="sdthumbs">${ANG.map(([k]) => thumb(x, k)).join('')}</div><p class="todomiss">${[...[].concat(x.used || []).map(relName).filter(Boolean).slice(0, 6).map(n => `<span>${esc(n)}</span>`), x.sleep ? `<span>${esc(x.sleep)} h sleep</span>` : '', x.stress ? `<span>stress ${esc(x.stress.toLowerCase())}</span>` : '', x.cycle ? `<span>cycle day ${esc(x.cycle)}</span>` : ''].join('')}</p></div>`).join('')}</div>`;
  else if (D2.mode === 'compare') {
    const withP = list.filter(x => ANG.some(([k]) => x[k])); D2.a = D2.a && L.byId[D2.a] ? D2.a : withP[withP.length - 1]?.id; D2.b = D2.b && L.byId[D2.b] ? D2.b : withP[0]?.id; D2.ang = D2.ang || 'front';
    const pick = (k, cur) => `<select class="pill" data-sdpick="${k}" aria-label="${k === 'a' ? 'Before' : 'After'}">${withP.map(x => `<option value="${x.id}" ${x.id === cur ? 'selected' : ''}>${esc(niceDate(x.date))}${x.time ? ' ' + esc(x.time.toLowerCase()) : ''}</option>`).join('')}</select>`;
    const side = id => { const x = L.byId[id]; return x ? `<figure class="sdfig">${x[D2.ang] ? `<img data-spath="${esc(x[D2.ang])}" alt="">` : '<div class="sdnone">No photo from this side</div>'}<figcaption>${esc(niceDate(x.date))} · ${esc(KINDS.skinlog.sub(x))}</figcaption></figure>` : ''; };
    body = withP.length ? `<div class="lplanhead"><span>Before</span>${pick('a', D2.a)}<span>After</span>${pick('b', D2.b)}<div class="seg">${ANG.map(([k, l]) => `<button data-sdang="${k}" aria-pressed="${D2.ang === k}">${l}</button>`).join('')}</div></div><div class="sdcompare">${side(D2.a)}${side(D2.b)}</div>` : quiet('Add entries with photos to compare them.');
  } else if (D2.mode === 'grid') {
    const months = [...new Set(list.map(x => x.date.slice(0, 7)))];
    body = months.map(m => { const xs = list.filter(x => x.date.startsWith(m) && ANG.some(([k]) => x[k])); return xs.length ? `<h3 class="sdmonth">${esc(fromISO(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))}</h3><div class="sdgrid">${xs.flatMap(x => ANG.filter(([k]) => x[k]).map(([k]) => `<button data-act="open" data-id="${x.id}" title="${esc(niceDate(x.date))}">${thumb(x, k)}</button>`)).join('')}</div>` : ''; }).join('') || quiet('No photos yet.');
  } else {
    const pts = [...list].reverse(), W = 600, H = 120, pad = 14;
    const mini = (k, l) => { const v = pts.filter(x => x[k]); if (v.length < 2) return ''; const xs = i => pad + (W - 2 * pad) * i / (v.length - 1), ys = x => H - 22 - (H - 40) * lvl(x[k]) / 3;
      return `<div class="sdchart"><p class="dsub">${esc(l)}</p><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(l)} over time">${[0, 3].map(n => `<line x1="${pad}" x2="${W - pad}" y1="${H - 22 - (H - 40) * n / 3}" y2="${H - 22 - (H - 40) * n / 3}" class="lgrid"/>`).join('')}<text x="${pad}" y="${H - 26 - (H - 40)}" class="ltick">a lot</text><text x="${pad}" y="${H - 6}" class="ltick">none</text><polyline class="sdline" points="${v.map((x, i) => `${xs(i)},${ys(x)}`).join(' ')}"/>${v.map((x, i) => `<g><title>${esc(niceDate(x.date))}: ${esc(x[k])}</title><circle cx="${xs(i)}" cy="${ys(x)}" r="5" class="sddot"/></g>`).join('')}<text x="${W - pad}" y="${H - 6}" text-anchor="end" class="ltick">${esc(shortDate(v[v.length - 1].date))}</text></svg></div>`; };
    body = SKIN_SCORES.map(([k, l]) => mini(k, l)).join('') || quiet('Score your skin in at least two entries to see a chart.');
  }
  host.innerHTML = `<div class="viewhead"><h1>Skin diary</h1><span class="sub">${plural(list.length, 'entry', 'entries')}</span></div>
    <div class="lplanhead">${seg}<button class="btn small primary" data-act="new" data-v="skinlog">+ New entry</button></div>
    <div data-sdsetup></div>${body}`;
  fillSigned(host);
  if (list.some(x => ANG.some(([k]) => x[k]))) { const img = host.querySelector('img[data-spath]'); if (img) signedURL(img.dataset.spath).catch(() => { host.querySelector('[data-sdsetup]').innerHTML = skinSetupNote(); }); }
  else C.sb.storage.from('skin').list(C.uid(), { limit: 1 }).then(({ error }) => { if (error) host.querySelector('[data-sdsetup]').innerHTML = skinSetupNote(); }).catch(() => {});
  if (host.dataset.sdwired) return; host.dataset.sdwired = '1';
  host.addEventListener('click', e => {
    const m = e.target.closest('[data-sdmode]'); if (m) { L.sdiary.mode = m.dataset.sdmode; skinDiary(host); return; }
    const a = e.target.closest('[data-sdang]'); if (a) { L.sdiary.ang = a.dataset.sdang; skinDiary(host); }
  });
  host.addEventListener('change', e => { const p = e.target.closest('[data-sdpick]'); if (p) { L.sdiary[p.dataset.sdpick] = p.value; skinDiary(host); } });
}
const skinSetupNote = () => `<section class="ltipsteps"><h3>One step in Supabase first</h3><p class="lnone">Your skin photos go into a private storage space that only you can open. Create it once: open the SQL editor in Supabase, paste the setup from the chat and click Run. Until then the photos can't be saved.</p></section>`;
function skinWeek(host) {
  const t = wdOf(), prods = recs('beauty').filter(skinUsable);
  const slot = (wd, eve) => { const ps = skinSlot(wd, eve); return `<div class="sslot ${eve ? 'pm' : 'am'}"><span class="rowlbl">${eve ? 'Evening' : 'Morning'}</span><ol>${ps.map(b => `<li><button class="sprod" data-act="open" data-id="${b.id}"><b>${esc(b.name)}</b>${b.step ? `<small>${esc(b.step)}</small>` : ''}</button><button class="sx" data-skinx="${b.id}" data-wd="${wd}" data-eve="${eve ? 1 : ''}" aria-label="Not on ${wd} ${eve ? 'evening' : 'morning'}">×</button></li>`).join('')}</ol><button class="chip ghost sadd" data-skinadd="${wd}" data-eve="${eve ? 1 : ''}">+ Add</button></div>`; };
  host.innerHTML = `<div class="viewhead"><h1>Skincare</h1><span class="sub">Your week, morning and evening</span></div>
    <div class="lplanhead"><button class="btn small" data-skinorder>Order</button><button class="btn small" data-act="go" data-v="care/diary">Skin diary</button><button class="btn small" data-act="new" data-v="beauty">+ Product</button></div>
    ${prods.length ? '' : quiet('Add your skincare products under Beauty, then put them on the days you use them.')}
    <div class="skweek">${WEEKDAYS.map(wd => `<section class="skday ${wd === t ? 'now' : ''}"><div class="ldh"><b>${({ Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' })[wd]}</b>${wd === t ? '<span>today</span>' : ''}</div>${slot(wd, false)}${slot(wd, true)}</section>`).join('')}</div>`;
  if (host.dataset.skwired) return; host.dataset.skwired = '1';
  host.addEventListener('click', async e => {
    const x = e.target.closest('[data-skinx]'); if (x) { const b = L.byId[x.dataset.skinx], eve = !!x.dataset.eve; await setSkinDays(b, eve, (eve ? pmDaysOf(b) : amDaysOf(b)).filter(d => d !== x.dataset.wd)); return; }
    const a = e.target.closest('[data-skinadd]'); if (a) return skinAdd(a.dataset.skinadd, !!a.dataset.eve);
    if (e.target.closest('[data-skinorder]')) skinOrderSheet();
  });
}
function skinAdd(wd, eve) {
  const list = skinOrder(recs('beauty').filter(b => skinUsable(b) && !(eve ? pmDaysOf(b) : amDaysOf(b)).includes(wd)));
  const sh = C.sheet({ title: `Add to ${wd} ${eve ? 'evening' : 'morning'}`, body: list.length ? `<div class="lrows">${list.map(b => `<label class="lrow lbatch"><input type="checkbox" value="${b.id}"><span class="lmain"><b>${esc(b.name)}</b><span>${esc([b.brand, b.step, b.type].filter(Boolean).join(' · '))}</span></span></label>`).join('')}</div>
      <label class="lrow lbatch" style="margin-top:10px"><input type="checkbox" data-alldays><span class="lmain"><b>Every ${eve ? 'evening' : 'morning'}</b><span>Add it to all seven days at once</span></span></label>` : quiet('Every product is on this moment already. Add a new product under Beauty.'),
    foot: `<button class="btn" data-act="new" data-v="beauty">New product</button><div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary" data-skok>Add</button>` });
  sh.querySelector('[data-skok]').onclick = async () => {
    const ids = [...sh.querySelectorAll('.lrows input:checked')].map(i => i.value), all = sh.querySelector('[data-alldays]')?.checked;
    for (const id of ids) { const b = L.byId[id]; await setSkinDays(b, eve, all ? WEEKDAYS : [...new Set([...(eve ? pmDaysOf(b) : amDaysOf(b)), wd])]); }
    C.closeSheet(); if (ids.length) C.toast(`${plural(ids.length, 'product')} added`);
  };
}
function skinOrderSheet() {
  let list = skinOrder(recs('beauty').filter(b => skinUsable(b) && (amDaysOf(b).length || pmDaysOf(b).length)));
  if (!list.length) { C.toast('Put products on a day first'); return; }
  const sh = C.sheet({ title: 'Order of your routine', body: `<p class="lnone">Drag the handle, or use the arrows. "By step" puts them back in the usual order: cleanse, treat, moisturise, protect.</p><ol class="skorder" data-skl></ol>`,
    foot: `<button class="btn" data-skauto>By step</button><div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary" data-sksave>Save order</button>` });
  const box = sh.querySelector('[data-skl]');
  const draw = () => { box.innerHTML = list.map((b, i) => `<li data-i="${i}"><span class="skh" aria-hidden="true">⋮⋮</span><span class="skn"><b>${esc(b.name)}</b><small>${esc(b.step || 'No step set')}</small></span><button class="iconbtn" data-up="${i}" aria-label="Move up" ${i ? '' : 'disabled'}>${svg(P.left)}</button><button class="iconbtn" data-down="${i}" aria-label="Move down" ${i < list.length - 1 ? '' : 'disabled'}>${svg(P.right)}</button></li>`).join(''); };
  draw();
  sh.addEventListener('click', e => {
    const u = e.target.closest('[data-up]'), dn = e.target.closest('[data-down]');
    if (u) { const i = +u.dataset.up; [list[i - 1], list[i]] = [list[i], list[i - 1]]; draw(); }
    if (dn) { const i = +dn.dataset.down; [list[i + 1], list[i]] = [list[i], list[i + 1]]; draw(); }
    if (e.target.closest('[data-skauto]')) { list = [...list].sort((a, b) => SKIN_STEPS.indexOf(a.step || 'Other') - SKIN_STEPS.indexOf(b.step || 'Other') || norm(a.name).localeCompare(norm(b.name))); draw(); }
  });
  // drag with a finger or the mouse on the handle
  let drag = null;
  box.addEventListener('pointerdown', e => { const h = e.target.closest('.skh'); if (!h) return; e.preventDefault(); drag = +h.closest('li').dataset.i; h.closest('li').classList.add('drag'); box.setPointerCapture(e.pointerId); });
  box.addEventListener('pointermove', e => {
    if (drag == null) return;
    const lis = [...box.children], over = lis.findIndex(li => { const r = li.getBoundingClientRect(); return e.clientY >= r.top && e.clientY <= r.bottom; });
    if (over >= 0 && over !== drag) { const [m] = list.splice(drag, 1); list.splice(over, 0, m); drag = over; draw(); box.children[drag]?.classList.add('drag'); }
  });
  const end = () => { drag = null; box.querySelector('.drag')?.classList.remove('drag'); };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  sh.querySelector('[data-sksave]').onclick = async () => {
    const p = skinPlan(), others = (p?.order || []).filter(id => !list.some(b => b.id === id));
    try { p ? await put('skinplan', p.id, { ...dataOf(p), order: [...list.map(b => b.id), ...others] }) : await create('skinplan', { order: list.map(b => b.id) }); C.closeSheet(); C.toast('Order saved'); } catch (e) { failed(e); }
  };
}
// basics: when one runs out or runs low it goes on the grocery list by itself
let stapleBusy = false;
function stapleRestock() {
  if (stapleBusy || !C) return;
  const tried = (L.stapleTried ||= new Set()), need = recs('ingredients').filter(i => i.staple && !i.list && (!i.stock || i.low) && !tried.has(i.id));
  if (!need.length) return;
  stapleBusy = true; need.forEach(i => tried.add(i.id));
  putMany(need.map(i => ({ id: i.id, kind: 'ingredients', data: { ...dataOf(i), list: true } })), null, `Put ${plural(need.length, 'basic')} on the grocery list`)
    
    .then(() => C.toast(`${plural(need.length, 'basic')} on your grocery list`)).catch(e => console.warn('restock', e)).finally(() => { stapleBusy = false; });
}
// evenings you don't cook: a dinner marked "Not eating at home" in the meal plan
const awayOn = d => recs('meals').find(m => m.date === d && m.slot === 'Dinner' && m.away);
async function toggleAway(d) {
  const m = awayOn(d);
  try { if (m) await del(m.id); else await create('meals', { date: d, slot: 'Dinner', away: true }); } catch { C.toast('Could not save. Try again.'); }
}
function awayRow() {
  const days = Array.from({ length: 10 }, (_, k) => addDays(today(), k));
  return `<div class="dday"><span class="rowlbl">Not cooking</span><div class="lwrap">${days.map(d => { const on = !!awayOn(d), dt = fromISO(d); return `<button class="chip ${on ? 'on' : ''}" data-act="away" data-v="${d}" aria-pressed="${on}">${dt.toLocaleDateString('en-GB', { weekday: 'short' })} ${dt.getDate()}</button>`; }).join('')}</div><span class="lnone">Tap the evenings you eat out or get something. The plan cooks fewer dinners.</span></div>`;
}
// Sunday prep from the week plan: tick tasks off on this device
function prepPanel(plan, compact) {
  const list = plan?.prep || []; if (!list.length) return '';
  const done = new Set(L.prepDone?.[plan.id] || []), day = plan.prepDay ? fromISO(plan.prepDay).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) : 'Sunday';
  const mins = list.reduce((n, x) => n + (num(x.mins) || 0), 0);
  return panel(compact ? 'Prep day' : `Prep on ${day}`, `<p class="lnone">${plural(list.length, 'task')}${mins ? `, about ${mins} min` : ''}. Do these once and cook faster all week.</p><div class="lrows">${list.map((x, k) => `<label class="lrow dpick ${done.has(k) ? 'gone' : ''}"><input type="checkbox" data-prep="${plan.id}:${k}" ${done.has(k) ? 'checked' : ''}><span class="lmain"><b>${esc(x.task)}</b><span>${esc([x.for, num(x.mins) ? x.mins + ' min' : ''].filter(Boolean).join(' · '))}</span></span></label>`).join('')}</div>`);
}
document.addEventListener('change', e => { const c = e.target; if (!C || !c.matches?.('[data-prep]')) return; const [id, k] = c.dataset.prep.split(':'); const all = (L.prepDone ||= {}), set = new Set(all[id] || []); c.checked ? set.add(+k) : set.delete(+k); all[id] = [...set]; try { localStorage.setItem('prepDone', JSON.stringify(all)); } catch {} C.render(); });
try { L.prepDone = JSON.parse(localStorage.getItem('prepDone') || '{}'); } catch {}
// the food check: a few taps a day, no calories, just regular meals, veg, fruit, water and a snack
const NL_MAX = 8, VEG_GOAL = 250;
// soda and juice: a goal that steps down by one glass every two weeks, from 5 to 1
const sodaGoal = () => { const c = { from: 5, to: 1, ...(C?.prefs?.().soda || {}) }; if (!c.start) return c.from; return Math.max(c.to, c.from - Math.floor(diffDays(c.start, today()) / 14)); };
const nlOn = d => recs('nlog').find(x => x.date === d);
const waterOn = d => recs('water').find(w => w.date === d);
const nlScore = (r, d = r?.date) => { if (!r && !waterOn(d)) return 0; const m = [].concat(r?.meals || []); const wg = Number(C?.prefs?.().waterGoal) || 8; return m.length + (r?.snack ? 1 : 0) + ((num(r?.veg) || 0) >= VEG_GOAL ? 1 : 0) + ((num(r?.fruit) || 0) >= 1 ? 1 : 0) + (r?.nosoda ? 1 : 0) + ((waterOn(d)?.glasses || 0) >= wg ? 1 : 0); };
async function nlSet(patch, d = today()) {
  const r = nlOn(d);
  try { r ? await put('nlog', r.id, { ...dataOf(r), ...patch }) : await create('nlog', { date: d, ...patch }); } catch { C.toast('Could not save. Try again.'); }
}
function nlToggle(key) {
  const r = nlOn(today()) || {};
  if (['Breakfast', 'Lunch', 'Dinner'].includes(key)) {
    const m = new Set([].concat(r.meals || [])), on = !m.has(key); on ? m.add(key) : m.delete(key);
    nlSet({ meals: ['Breakfast', 'Lunch', 'Dinner'].filter(x => m.has(x)) });
    if (key === 'Breakfast') { const h = bfHabit(); if (h && daysSet(h).has(today()) !== on) toggleDay(h); else if (!h && on) bfCreate(); }
    return;
  }
  nlSet({ [key]: !r[key] });
}
function nlStep(key, dir) {
  if (key === 'water') return water(dir);
  if (key === 'soda' && !C.prefs().soda?.start) C.savePrefs({ soda: { from: 5, to: 1, start: today() } }).catch(() => {});
  const r = nlOn(today()) || {}, step = key === 'veg' ? 50 : 1;
  nlSet({ [key]: Math.max(0, (num(r[key]) || 0) + dir * step) });
}
const SNACKY = /kaas|cracker|knäck|ei\b|eieren|chips|zoutje|kipfilet|rookvlees|worst|salami|ham|olijf|kaasbro|pinda|popcorn|tortilla|wrap|fruit|appel|banaan|mandarijn|druif|komkommer|tomaat|paprika|wortel/i;
function snackIdeas() {
  const have = recs('ingredients').filter(i => (i.stock || (cntOf(i) || 0) > 0) && i.location !== 'Vriezer' && SNACKY.test(i.name || '')).map(i => i.name);
  const plan = (curPlan()?.snacks || []).map(x => x.name);
  return [...new Set([...plan, ...have])].slice(0, 6);
}
function foodCheckPanel() {
  const t = today(), r = nlOn(t) || {}, m = new Set([].concat(r.meals || [])), wg = Number(C.prefs().waterGoal) || 8, wn = waterOn(t)?.glasses || 0, veg = num(r.veg) || 0, fr = num(r.fruit) || 0;
  const chip = (k, label, on) => `<button class="chip ${on ? 'on' : ''}" data-act="nl" data-v="${k}" aria-pressed="${on}">${on ? svg(P.check) : ''}${label}</button>`;
  const st = (k, label, val, goal) => `<div class="nlstep"><span>${label}</span><span class="stepper"><button type="button" data-act="nlstep" data-v="${k}" data-d="-1" aria-label="Less">−</button><b class="${goal && val >= goal ? 'ok' : ''}">${esc(val)}${goal ? ` / ${goal}` : ''}</b><button type="button" data-act="nlstep" data-v="${k}" data-d="1" aria-label="More">+</button></span></div>`;
  const days = Array.from({ length: 7 }, (_, k) => addDays(dealWeekStart(), k)).map(d => { const sc = nlScore(nlOn(d), d), pct = Math.round(100 * sc / NL_MAX); return `<span class="nldot ${d === t ? 'now' : ''} ${d > t ? 'later' : ''}" title="${esc(niceDate(d))}: ${sc} of ${NL_MAX}" style="--p:${d > t ? 0 : pct}%"><i></i><small>${fromISO(d).toLocaleDateString('en-GB', { weekday: 'narrow' })}</small></span>`; }).join('');
  const ideas = !r.snack && new Date().getHours() >= 13 ? snackIdeas() : [];
  return panel('Food today', `<div class="nlweek">${days}</div>
    <div class="lwrap">${chip('Breakfast', 'Breakfast', m.has('Breakfast'))}${chip('Lunch', 'Lunch', m.has('Lunch'))}${chip('Dinner', 'Dinner', m.has('Dinner'))}${chip('snack', 'Snack', !!r.snack)}${chip('nosoda', 'No sugary drinks', !!r.nosoda)}</div>
    <div class="nlsteps">${st('veg', 'Vegetables (g)', veg, VEG_GOAL)}${st('fruit', 'Fruit', fr, 1)}${st('water', 'Water', wn, wg)}<div class="nlstep"><span>Soda and juice <small class="muted">max ${sodaGoal()}</small></span><span class="stepper"><button type="button" data-act="nlstep" data-v="soda" data-d="-1" aria-label="Less">−</button><b class="${num(r.soda) != null && num(r.soda) <= sodaGoal() ? 'ok' : num(r.soda) > sodaGoal() ? 'over' : ''}">${num(r.soda) ?? 0}</b><button type="button" data-act="nlstep" data-v="soda" data-d="1" aria-label="More">+</button></span></div></div>
    ${ideas.length ? `<p class="lnone">Snack idea from what you have: ${esc(ideas.join(', '))}</p>` : ''}`);
}
// after cooking: tick the meal and the veg in the food check, then count off what is used up
function cookedPanel(r) {
  const ings = [].concat(r.ingredients || []).map(id => L.byId[id]).filter(Boolean);
  return `<section class="ltipsteps cooked"><div class="lph3"><h3>Made it?</h3><button type="button" class="btn small primary" data-act="cooked" data-id="${r.id}">I made this</button></div>
    <div data-cookedbody hidden>${ings.length ? `<p class="lnone">Wat is er op of minder? Tik − bij wat je gebruikte.</p><div class="lrows">${ings.map(i => `<div class="lrow"><span class="lmain"><b>${esc(i.name)}</b></span><span class="stepper" data-istep="${i.id}"><button type="button" data-act="icnt" data-id="${i.id}" data-v="-1">−</button><b>${cntOf(i) == null ? (i.stock ? 'in huis' : 'op') : esc(unitShort(cntOf(i), unitOf(i)))}</b><button type="button" data-act="icnt" data-id="${i.id}" data-v="1">+</button></span><button type="button" class="chip" data-act="iout" data-id="${i.id}">Op</button></div>`).join('')}</div>` : ''}
    <div class="dbtns"><button type="button" class="btn small" data-act="cleft" data-v="Fridge" data-id="${r.id}">Restje in koelkast</button><button type="button" class="btn small" data-act="cleft" data-v="Freezer" data-id="${r.id}">Restje in vriezer</button><button type="button" class="btn small" data-act="creview" data-id="${r.id}">Hoe smaakte het?</button></div></div></section>`;
}
async function cooked(r) {
  const t = today(), h = new Date().getHours(), plan = recs('meals').find(m => m.date === t && m.recipe === r.id);
  const slot = plan?.slot || (h < 11 ? 'Breakfast' : h < 16 ? 'Lunch' : 'Dinner'), n = nlOn(t) || {}, m = new Set([].concat(n.meals || []));
  if (['Breakfast', 'Lunch', 'Dinner'].includes(slot)) m.add(slot);
  const patch = { meals: ['Breakfast', 'Lunch', 'Dinner'].filter(x => m.has(x)), ...(num(r.vegG) ? { veg: (num(n.veg) || 0) + num(r.vegG) } : {}), ...(slot === 'Snack' ? { snack: true } : {}) };
  await nlSet(patch);
  // the recipe remembers how often and when you cooked it (for stats and To do)
  save(L.byId[r.id] || r, { cooks: (num(r.cooks) || 0) + 1, lastCooked: t });
  C.toast(`In je dagcheck: ${slot.toLowerCase()}${num(r.vegG) ? ` en ${num(r.vegG)} g groente` : ''}`);
}
// learning to eat breakfast: today's planned breakfast and a tick that counts as a habit in Routines
const bfHabit = () => recs('habits').find(h => /breakfast|ontbijt/i.test(h.name || ''));
async function hadBreakfast() {
  const h = bfHabit(), r = nlOn(today()), m = new Set([].concat(r?.meals || []));
  if (!m.has('Breakfast')) { m.add('Breakfast'); nlSet({ meals: ['Breakfast', 'Lunch', 'Dinner'].filter(x => m.has(x)) }); }
  if (h) return daysSet(h).has(today()) ? null : toggleDay(h);
  return bfCreate();
}
async function bfCreate() {
  try { await create('habits', { name: 'Eat breakfast', onDays: [...WEEKDAYS], area: 'Nutrition', why: 'More energy in the morning, fewer cravings later.', days: [today()] }); C.toast('Nice. Breakfast is now a habit in Routines'); } catch { C.toast('Could not save. Try again.'); }
}
function breakfastPanel() {
  const t = today(), m = recs('meals').find(x => x.date === t && x.slot === 'Breakfast' && !x.away), h = bfHabit(), done = h && daysSet(h).has(t);
  const ideas = (curPlan()?.breakfasts || []).slice(0, 3);
  const name = m ? relName(m.recipe) || m.what : '';
  return panel('Breakfast', `${name ? `<p class="lbig">${esc(name)}</p>` : ideas.length ? `<div class="lwrap">${ideas.map(b => `<span class="chip">${esc(b.name)}</span>`).join('')}</div>` : quiet('Something small counts too: a boiled egg, crackers with aged cheese, or toast.')}
    <div class="dbtns" style="margin-top:8px"><button class="btn small ${done ? '' : 'primary'}" data-act="hadbf">${done ? svg(P.check) + ' Had breakfast' : 'I had breakfast'}</button>${h ? `<span class="lnone">${esc([`${weekDone(h)} of 7 this week`, streak(h)].filter(Boolean).join(' · '))}</span>` : ''}</div>`);
}
// after a lunch or dinner: portions left over go to the fridge (3 days) or the freezer, or nowhere
async function leftover(id, where) {
  const m = L.byId[id]; if (!m) return;
  const name = 'Leftover: ' + (relName(m.recipe) || m.what || m.slot);
  const rows = [{ id: m.id, kind: 'meals', data: { ...dataOf(m), leftover: where } }];
  if (where !== 'None') rows.push({ id: C.uuid(), kind: 'ingredients', data: { name, category: 'Restjes', stock: true, portions: 1, created: Date.now(), ...(where === 'Freezer' ? { location: 'Vriezer', frozen: today() } : { location: 'Koelkast', expires: addDays(today(), 3) }) } });
  try { await putMany(rows, null, where === 'None' ? 'No leftovers' : `Leftovers in the ${where.toLowerCase()}`); C.toast(where === 'None' ? 'Noted' : `In the ${where.toLowerCase()}${where === 'Fridge' ? ': eat within 3 days' : ''}`); } catch { C.toast('Could not save. Try again.'); }
}
function leftoverPanel() {
  const t = today(), list = recs('meals').filter(m => (m.slot === 'Dinner' || m.slot === 'Lunch') && !m.away && !m.leftover && (m.recipe || m.what) && (m.date === t || m.date === addDays(t, -1))).sort((a, b) => a.date.localeCompare(b.date));
  if (!list.length) return '';
  return panel('Any leftovers?', `<p class="lnone">Put what is left in the fridge or the freezer, so nothing goes to waste.</p><div class="lrows">${list.map(m => `<div class="lrow"><span class="lmain"><b>${esc(relName(m.recipe) || m.what)}</b><span>${esc([m.date === t ? 'today' : 'yesterday', m.slot.toLowerCase()].join(' · '))}</span></span><div class="dbtns"><button class="btn small" data-act="leftover" data-id="${m.id}" data-v="Fridge">Fridge</button><button class="btn small" data-act="leftover" data-id="${m.id}" data-v="Freezer">Freezer</button><button class="btn small ghost" data-act="leftover" data-id="${m.id}" data-v="None">None</button></div></div>`).join('')}</div>`);
}
// meat and fish: only when on sale (then stock up and freeze), otherwise from the freezer or the butcher
function meatPanel(offers) {
  const on = offers.filter(isMeatFish).sort((a, b) => norm(a.name).localeCompare(norm(b.name))), fz = inFreezer().filter(i => /vlees|vis/i.test(i.category || '') || isMeatFish(i)), b = myButcher();
  const deal = o => `<div class="lrow"><span class="lmain"><b>${esc(o.name)}</b><span>${esc([o.store, o.deal, o.unit, num(o.price) ? eur(num(o.price)) + (num(o.was) ? ` (was ${eur(num(o.was))})` : '') : '', o.until ? 'until ' + shortDate(o.until) : ''].filter(Boolean).join(' · '))}</span></span><button class="btn small" data-act="freeze" data-id="${o.id}">Bought, freeze it</button></div>`;
  const body = on.length ? `<p class="lnone">Stock up while it is cheap and freeze what you don't eat this week.</p><div class="lrows mfrows">${on.map(deal).join('')}</div>`
    : `<p class="lnone">No meat or fish on sale this week. Use your freezer${b ? `, or get it at ${esc(b.name)}` : ', or get it at the butcher'}.</p>`;
  const fzl = fz.length ? `<p class="dsub">In your freezer · ${fz.length}</p><div class="lwrap">${fz.slice(0, 12).map(i => `<button class="chip" data-act="open" data-id="${i.id}">${esc(i.name)}${num(i.portions) ? ` · ${num(i.portions)}` : ''}</button>`).join('')}</div>` : '';
  return panel('Meat and fish', body + fzl, ['kitchen/pantry', 'Your freezer']);
}

/* ---------- pantry per kind of product: a category, then a kind (Kip), then the products (drumsticks, filet) ---------- */
const ingCat = r => catNL('ingredients', r.category) || 'Overig';
const ING_CAT_ORDER = Object.values(CAT_NL.ingredients);
// one view for pantry, freezer and groceries: category, then each kind with what is in stock, freezer portions and what needs attention
function ingTypeView(items, line, ctx) {
  if (!items.length) return '';
  const cats = new Map();
  for (const r of items) { const c = ingCat(r); if (!cats.has(c)) cats.set(c, new Map()); const t = ingType(r) || 'Zonder soort', m = cats.get(c); m.has(t) ? m.get(t).push(r) : m.set(t, [r]); }
  const ck = [...cats.keys()].sort((a, b) => ((ING_CAT_ORDER.indexOf(a) + 1) || 99) - ((ING_CAT_ORDER.indexOf(b) + 1) || 99) || a.localeCompare(b));
  const fz = inFreezer();
  return ck.map(c => {
    const m = cats.get(c), tk = [...m.keys()].sort((a, b) => (a === 'Zonder soort') - (b === 'Zonder soort') || a.localeCompare(b));
    return `<div class="lgh gshop"><h3>${esc(c)} · ${[...m.values()].reduce((n, l) => n + l.length, 0)}</h3></div>` + tk.map(t => {
      const rs = m.get(t).sort((a, b) => norm(a.name).localeCompare(norm(b.name))), all = recs('ingredients').filter(r => ingCat(r) === c && (ingType(r) || 'Zonder soort') === t);
      const inS = all.filter(r => r.stock).length, por = fz.filter(r => all.includes(r)).reduce((n, r) => n + (num(r.portions) || 0), 0);
      const warn = all.filter(r => r.low || useSoon(r) || (r.stock && r.expires && r.expires < today())).length;
      const facts = [`${inS}/${all.length} op voorraad`, por ? plural(por, 'portie', 'porties') + ' in de vriezer' : '', warn ? `<b class="itwarn">${warn} bijna op of over datum</b>` : ''].filter(Boolean).join(' · ');
      return `<div class="itype"><div class="itypeh"><span class="itypen"><b>${esc(t)}</b><span>${facts}</span></span>${t === 'Zonder soort' ? '' : `<button class="iconbtn small" data-act="ingtypeadd" data-cat="${esc(c)}" data-type="${esc(t)}" data-ctx="${ctx}" aria-label="${esc(t)} toevoegen">${svg(P.plus)}</button>`}</div><div class="lrows">${rs.map(line).join('')}</div></div>`;
    }).join('');
  }).join('');
}
const ingViewSeg = (key, val, opts) => `<div class="seg fseg" role="group" aria-label="Weergave">${opts.map(([k, l]) => `<button data-act="ingview" data-k="${key}" data-v="${k}" aria-pressed="${val === k}">${l}</button>`).join('')}</div>`;
const ingViewOf = (key, def) => { try { return localStorage.getItem(key) || def; } catch { return def; } };
function ingTypesFill(fill) {
  const items = recs('ingredients');
  fill.innerHTML = `<div class="ltools"><button class="btn small primary" data-act="new" data-v="ingredients">+ Ingredient</button></div>
    ${items.length ? ingTypeView(items, row, 'pantry') : quiet('Your pantry is empty.')}
    <p class="lnone">De soort raadt de app uit de naam. Open een product om hem aan te passen.</p>`;
}
function freezerFill(fill) {
  const t = today(), list = inFreezer().sort((a, b) => (a.frozen || '9').localeCompare(b.frozen || '9'));
  const row = i => { const age = freezerAge(i), old = age != null && age >= FREEZE_DAYS;
    return `<div class="lrow ${old ? 'fzold' : ''}"><button class="lmain" data-act="open" data-id="${i.id}"><b>${esc(i.name)}</b><span>${esc([i.category, num(i.portions) ? plural(num(i.portions), 'portion') : i.qty, age != null ? (age < 7 ? `frozen ${age === 0 ? 'today' : plural(age, 'day') + ' ago'}` : `frozen ${plural(Math.round(age / 7), 'week')} ago`) : 'no freeze date', old ? 'use soon' : ''].filter(Boolean).join(' · '))}</span></button>${stepper(i)}</div>`; };
  const old = list.filter(i => (freezerAge(i) ?? 0) >= FREEZE_DAYS).length;
  fill.innerHTML = `<div class="ltools"><button class="btn small primary" data-freezer>+ Put something in the freezer</button></div>
    ${old ? `<div class="note">${plural(old, 'thing')} ${old === 1 ? 'has' : 'have'} been in the freezer for 3 months or more. Use ${old === 1 ? 'it' : 'them'} first.</div>` : ''}
    ${list.length ? ingViewSeg('fzView', ingViewOf('fzView', 'date'), [['date', 'Per datum'], ['type', 'Per soort']]) + (ingViewOf('fzView', 'date') === 'type' ? ingTypeView(list, row, 'freezer') : `<div class="lrows">${list.map(row).join('')}</div>`) : quiet('Your freezer is empty. Meat or fish from a deal goes here with the date you froze it.')}`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-freezer]'); if (!b || !C) return; e.stopImmediatePropagation(); openEditor('ingredients', null, { location: 'Vriezer', stock: true, frozen: today(), category: 'Vlees & vis' }); }, true);
// beauty deals: what the weekly task found on your own products, things running low and your wishes
function bdealFill(fill) {
  const live = recs('bdeals').filter(o => !o.until || o.until >= today());
  const groups = [['Your product', 'On your products'], ['Running low', 'Running low or finished'], ['On your wishlist', 'On your wishlist'], ['Brand you use', 'Brands you use']];
  const card = o => { const pr = o.product && L.byId[o.product], ph = o.photo || (pr && photoOf(pr));
    return `<div class="dmeal bdeal">${ph ? `<img referrerpolicy="no-referrer" src="${esc(C.photoURL(ph))}" alt="" loading="lazy" onerror="this.remove()">` : ''}<div class="dmb"><b>${esc(o.name)}</b><span>${esc([o.brand, o.store].filter(Boolean).join(' · '))}</span>
      <p class="bdprice">${num(o.price) ? `<b>${eur(num(o.price))}</b>` : ''}${num(o.was) ? ` <s>${eur(num(o.was))}</s>` : ''}${o.deal ? ` <span class="chip">${esc(o.deal)}</span>` : ''}</p>
      ${o.why ? `<p class="duses">${esc(o.why)}</p>` : ''}${o.until ? `<p class="duses">Until ${esc(shortDate(o.until))}</p>` : ''}
      <div class="dbtns">${o.url ? `<a class="btn small primary" href="${esc(o.url)}" target="_blank" rel="noopener">Open deal</a>` : ''}${pr ? `<button class="btn small" data-act="open" data-id="${pr.id}">Your product</button>` : ''}<button class="btn small" data-act="open" data-id="${o.id}">Details</button></div></div></div>`; };
  const shops = recs('bshops'), readN = shops.filter(x => x.readDeals).length;
  const body = groups.map(([k, title]) => { const l = live.filter(o => (o.match || 'Brand you use') === k); return l.length ? `<h3 class="lgh">${esc(title)} · ${l.length}</h3><div class="bdgrid">${l.map(card).join('')}</div>` : ''; }).join('');
  const low = recs('beauty').filter(b => b.low || b.finished);
  const lowList = low.length ? `<h3 class="lgh">Running low · ${low.length}</h3><div class="lrows">${low.map(b => { const dl = live.filter(o => o.product === b.id).sort((x, y) => (num(x.price) ?? 1e9) - (num(y.price) ?? 1e9))[0]; return `<div class="lrow"><button class="lmain" data-act="open" data-id="${b.id}"><b>${esc(b.name)}</b><span>${esc([b.brand, b.finished ? 'finished' : 'running low', dl ? `deal at ${dl.store}${num(dl.price) ? ' ' + eur(num(dl.price)) : ''}` : 'no deal this week'].filter(Boolean).join(' · '))}</span></button><button class="btn small ghost" data-act="blow" data-id="${b.id}">Got it</button></div>`; }).join('')}</div>` : '';
  fill.innerHTML = `${lowList}${body || quiet('No beauty deals yet. Every week a task checks your beauty shops for deals on your own products, things running low and your wishlist.')}
    <p class="lnone">${shops.length ? `${plural(readN, 'shop')} checked every week. Add or remove shops under Beauty shops.` : 'Add your beauty shops under Beauty shops so the weekly task knows where to look.'}</p>`;
}
function dealsPage(host) {
  const plan = curPlan(), offers = liveOffers(), allStores = [...new Set([...kitchenStores(), ...offers.map(o => o.store).filter(Boolean)])], byStore = allStores.map(s => [s, offers.filter(o => o.store === s)]).filter(([, l]) => l.length);
  const mine = recipeDeals(offers).slice(0, 8);
  const mealCard = (m, i, k) => {
    const own = m.recipe && L.byId[m.recipe], name = own ? titleOf(own) : m.name || 'Recipe', ph = own ? photoOf(own) : m.photo;
    const words = [m.quit ? 'helps you quit' : '', k === 'dinners' && m.days ? `for ${plural(m.days, 'day')}` : '', m.servings ? plural(m.servings, 'portion') : '', m.microwave ? 'reheats in the microwave' : '', m.time ? `${m.time} min` : '', m.cost ? `about ${fEur0(m.cost)}` : '', own ? 'your recipe' : 'new recipe'].filter(Boolean).join(' · ');
    return `<div class="dmeal">${ph ? `<img referrerpolicy="no-referrer" src="${esc(C.photoURL(ph))}" alt="" loading="lazy" onerror="this.remove()">` : ''}<div class="dmb"><b>${esc(name)}</b><span>${esc(words)}</span>${m.why ? `<p>${esc(m.why)}</p>` : ''}
      ${(m.uses || []).length ? `<p class="duses">Uses: ${m.uses.map(esc).join(', ')}</p>` : ''}
      <div class="dbtns">${own ? `<button class="btn small" data-act="open" data-id="${own.id}">Open recipe</button>` : `${m.link ? `<a class="btn small" href="${esc(m.link)}" target="_blank" rel="noopener">Open recipe</a>` : ''}<button class="btn small" data-act="dkeep" data-k="${k}" data-i="${i}">Add to my recipes</button>`}
      <button class="btn small primary" data-act="dplan" data-k="${k}" data-i="${i}">Put in meal plan</button></div></div></div>`;
  };
  const block = (k, title, sub) => { const l = plan?.[k] || []; return l.length ? panel(title, `<p class="lnone">${esc(sub)}</p><div class="dmeals">${l.map((m, i) => mealCard(m, i, k)).join('')}</div>`) : ''; };
  const shopping = plan?.shopping || [], sday = food().shopDay || '', mkt = MARKET_DAYS.includes(sday), mktName = recs('shops').find(r => r.type === 'Market')?.name || 'Market', storeOf = x => mkt && (x.market || isProduce(x)) ? mktName : x.store,
    shopStores = [...new Set([...(mkt ? [mktName] : []), ...allStores, ...shopping.map(x => x.store).filter(Boolean)])], shopBy = [...shopStores, 'Other'].map(s => [s, shopping.filter(x => (shopStores.includes(storeOf(x)) ? storeOf(x) : 'Other') === s)]).filter(([, l]) => l.length);
  const cost = fSum(shopping.filter(x => !x.have), 'price'), bud = groceryBudget();
  const saved = fSum(offers.filter(o => num(o.was) > num(o.price)).map(o => ({ amount: num(o.was) - num(o.price) })));
  host.innerHTML = `${head('Deals of the week')}<div class="ldeals">
  <div class="tiles">${fTile('Deals', String(offers.length), byStore.map(([s, l]) => `${s} ${l.length}`).join(' · ') || 'none yet')}${fTile('Dinners', String((plan?.dinners || []).length), plan ? `each for 2 days · ${esc(shortDate(plan.start))} to ${esc(shortDate(plan.end))}` : 'no plan yet')}${fTile('Shared', String((plan?.shared || []).length), 'deal ingredients used in more than one recipe')}${bud ? fTile('Budget this week', fEur0(bud.week), `${eur(bud.spentWeek)} spent since Wednesday${cost ? ` · plan about ${eur(cost)}` : ''}`) : fTile('Plan costs', cost ? eur(cost) : '–', saved ? `${eur(saved)} saved with deals` : 'from the shopping list')}</div>
  <div class="dday"><span class="rowlbl">I shop on</span><div class="seg fseg" role="group">${[['Wed', 'Wednesday'], ['Fri', 'Friday'], ['Sat', 'Saturday']].map(([k, l]) => `<button data-act="shopday" data-v="${k}" aria-pressed="${sday === k}">${l}</button>`).join('')}</div><span class="lnone">${mkt ? `Fruit and vegetables go on the ${esc(mktName)} list: buy small amounts.` : sday ? 'No market today: fruit and vegetables stay at the shop.' : 'On Wednesday and Saturday fruit and vegetables move to the market list.'}</span></div>
  ${awayRow()}
  ${bud ? `<div class="dbudget"><div class="dbar"><i style="width:${Math.min(100, bud.week ? 100 * (bud.spentWeek + (cost || 0)) / bud.week : 0)}%" class="${bud.spentWeek + cost > bud.week ? 'over' : ''}"></i></div><p class="lnone">${esc(bud.cat.name)} in Finance: ${eur(bud.spentPeriod)} of ${eur(bud.period)} this ${fMode() === 'month' ? 'month' : 'pay'}. ${bud.spentWeek + cost > bud.week ? `The plan goes ${eur(bud.spentWeek + cost - bud.week)} over this week's share.` : `${eur(bud.week - bud.spentWeek - cost)} left this week after the plan.`}${saved ? ` Deals save you ${eur(saved)}.` : ''}</p></div>` : (recs('fcats').length ? `<p class="lnone">Pick your groceries envelope under Kitchen › Settings to see your budget here.</p>` : '')}
  ${!plan && !offers.length ? panel('How this works', `<p class="lnone">Every Wednesday a task reads the deals of Dirk, Aldi, Albert Heijn and every shop under Shops that has its deals switched on, looks through your recipes, pantry and freezer, and puts this week's deals here with a plan: 5 dinners that each last 2 days, 3 office lunches that reheat in a microwave, 3 breakfasts and a few snacks. It reuses the same deal ingredients across recipes, so you buy less and waste less.</p><p class="lnone">It needs the Supabase function <b>offers</b> with the secret <b>OFFERS_TOKEN</b>. Then the first plan shows up after the next Wednesday.</p>`) : ''}
  ${plan?.tips ? `<div class="note dnote">${esc(plan.tips)}</div>` : ''}
  ${offers.length || inFreezer().length ? meatPanel(offers) : ''}
  ${prepPanel(plan)}
  ${block('dinners', 'Dinners', 'Cook once, eat twice: each one is enough for 2 days.')}
  <div class="mrow2 dmrow">${block('lunches', 'Lunch for the office', 'Make ahead, take along, warm up in the microwave.') || ''}${block('breakfasts', 'Breakfast', 'Quick, or ready the night before.') || ''}</div>
  <div class="mrow2 dmrow">${block('snacks', 'Snacks', 'Something for in between.') || ''}${block('drinks', 'Instead of soda', 'Drinks without added sugar that still taste of something.') || ''}</div>
  ${block('quit', 'Helps you quit smoking', 'Something for the hands and mouth, or to get through a craving.')}
  <div class="mrow2 dmrow">${plan?.shared?.length ? panel('Used in several recipes', `<div class="lrows">${plan.shared.map(x => `<div class="lrow"><span class="lmain"><b>${esc(x.name)}</b><span>${esc([x.store, x.deal, num(x.price) ? eur(num(x.price)) : '', (x.in || []).length ? 'in ' + x.in.join(', ') : ''].filter(Boolean).join(' · '))}</span></span></div>`).join('')}</div>`) : ''}
    ${shopping.length ? panel('Shopping list', `${shopBy.map(([s, l]) => `<p class="dsub">${esc(s)}</p><div class="lrows">${l.map(x => { const k = shopping.indexOf(x), on = dealPicked(x, k); return `<label class="lrow dpick ${x.have ? 'gone' : ''}"><input type="checkbox" data-dpick="${k}" ${on ? 'checked' : ''} aria-label="Put ${esc(x.name)} on the list"><span class="lmain"><b>${esc(x.name)}</b><span>${esc([x.qty, x.deal, num(x.price) ? eur(num(x.price)) : '', x.have ? 'you have this' : '', x.left ? 'left over: ' + x.left : ''].filter(Boolean).join(' · '))}</span></span></label>`; }).join('')}</div>`).join('')}<p class="lnone">Untick what you don't want.</p><button class="btn small primary" data-act="dgroc">Put ${plural(shopping.filter(dealPicked).length, 'thing')} on my grocery list</button>`) : ''}</div>
  ${mine.length ? panel('Your recipes with deals', `<div class="lrows">${mine.map(({ r, hits }) => `<div class="lrow"><button class="lmain" data-act="open" data-id="${r.id}"><b>${esc(titleOf(r))}</b><span>${esc(hits.slice(0, 4).map(o => `${o.name} (${o.store})`).join(', '))}${hits.length > 4 ? ` and ${hits.length - 4} more` : ''}</span></button><span class="lside">${plural(hits.length, 'deal')}</span></div>`).join('')}</div>`) : ''}
  ${byStore.length ? panel('All deals', `${byStore.map(([s, l]) => `<p class="dsub">${esc(s)} · ${l.length}</p><div class="lgrid dgrid">${l.sort((a, b) => norm(a.category || 'zz').localeCompare(norm(b.category || 'zz')) || norm(a.name).localeCompare(norm(b.name))).slice(0, L.dealsAll ? 400 : 6).map(o => prodCard(o)).join('')}</div>`).join('')}${byStore.some(([, l]) => l.length > 6) ? `<button class="btn small" data-act="dealsall">${L.dealsAll ? 'Show fewer deals' : `See all ${offers.length} deals`}</button>` : ''}${saved ? `<p class="mmuted">Together about ${fEur0(saved)} off the normal prices.</p>` : ''}`) : ''}</div>`;
}
// find an ingredient in your pantry by name, or make it
function ingRow(name, extra = {}) {
  const n = deUml(name), hit = recs('ingredients').find(i => deUml(i.name) === n);
  return hit ? { id: hit.id, kind: 'ingredients', data: { ...dataOf(hit), ...extra } } : { id: C.uuid(), kind: 'ingredients', data: { name: String(name).trim(), created: Date.now(), ...extra } };
}
// what from the deals shopping list goes on your grocery list: everything you don't have, unless you untick it
const dealPicked = (x, k) => { const p = (L.dealPick ||= {})[k]; return p == null ? !x.have : p; };
document.addEventListener('change', e => { const c = e.target; if (!C || !c.matches?.('[data-dpick]')) return; (L.dealPick ||= {})[c.dataset.dpick] = c.checked; C.render(); });
async function dealsAct(act, k, i) {
  const plan = curPlan(); if (!plan) return;
  const m = plan[k]?.[i];
  if (act === 'dgroc') {
    const rows = [], seen = new Set();
    for (const [k, x] of (plan.shopping || []).entries()) { if (!dealPicked(x, k)) continue; const r = ingRow(x.name, { list: true, ...(x.store ? { shop: x.store } : {}), ...(x.qty ? { qty: x.qty } : {}) }); if (seen.has(r.id)) continue; seen.add(r.id); rows.push(r); }
    if (!rows.length) { C.toast('Nothing to add: you have everything.'); return; }
    try { await putMany(rows, null, `Put ${plural(rows.length, 'thing')} from the deals on the grocery list`); C.toast(`${plural(rows.length, 'thing')} on your grocery list`); } catch { C.toast('Could not save. Try again.'); }
    return;
  }
  if (!m) return;
  if (act === 'dkeep') {
    const ings = (m.ingredients || []).map(n => ingRow(n)), rid = C.uuid(), seen = new Set(), ingRows = ings.filter(r => !seen.has(r.id) && seen.add(r.id));
    const cat = { dinners: 'Dinner', lunches: 'Lunch', breakfasts: 'Breakfast', snacks: 'Snack', drinks: 'Drink', quit: 'Snack' }[k];
    const lines = m.lines || [], instr = [lines.length ? 'Ingrediënten:\n' + lines.map(l => '- ' + l).join('\n') : '', m.steps ? (lines.length ? 'Bereiding:\n' : '') + m.steps : ''].filter(Boolean).join('\n\n');
    const rows = [...ingRows.filter(r => !L.byId[r.id]), { id: rid, kind: 'recipes', data: { name: m.name || 'Recipe', category: cat, link: m.link, photo: m.photo, servings: m.servings, prep: m.time, instructions: instr, notes: m.why, ingredients: [...seen], helps: m.quit || k === 'quit' ? [QUIT] : undefined, created: Date.now() } }];
    const copy = JSON.parse(JSON.stringify(dataOf(plan))); copy[k][i] = { ...m, recipe: rid };
    rows.push({ id: plan.id, kind: 'wplans', data: copy });
    for (const r of rows) for (const key of Object.keys(r.data)) if (r.data[key] == null || r.data[key] === '') delete r.data[key];
    try { await putMany(rows, null, `Added ${m.name || 'a recipe'} to your recipes`); C.toast('In your recipes now'); } catch { C.toast('Could not save. Try again.'); }
    return;
  }
  if (act === 'dplan') {
    const slot = { dinners: 'Dinner', lunches: 'Lunch', breakfasts: 'Breakfast', snacks: 'Snack', drinks: 'Snack', quit: 'Snack' }[k], n = k === 'dinners' ? (num(m.days) || 2) : ['snacks', 'drinks', 'quit'].includes(k) ? 1 : (num(m.days) || 2);
    const taken = new Set(recs('meals').filter(x => x.slot === slot || (x.away && slot === 'Dinner')).map(x => x.date)), dates = [];
    for (let d = today(), j = 0; dates.length < n && j < 21; j++, d = addDays(d, 1)) if (!taken.has(d) && (k !== 'lunches' || ![0, 6].includes(fromISO(d).getDay()))) dates.push(d);
    const rows = dates.map(date => ({ id: C.uuid(), kind: 'meals', data: { date, slot, ...(m.recipe && L.byId[m.recipe] ? { recipe: m.recipe } : { what: m.name || 'Recipe' }), notes: 'From the deals of the week', created: Date.now() } }));
    try { await putMany(rows, null, `Planned ${m.name || 'a recipe'} for ${plural(rows.length, 'day')}`); C.toast(`In your meal plan: ${dates.map(d => shortDate(d)).join(', ')}`); } catch { C.toast('Could not save. Try again.'); }
  }
}

function kitchenToday(host) {
  setTimeout(stapleRestock, 0);
  const t = today(), meals = recs('meals').filter(m => m.date === t);
  const groc = recs('ingredients').filter(i => i.list).sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
  const prep = recs('mealprep').filter(p => p.status === 'Klaar' || p.status === 'Te preppen').sort((a, b) => (a.until || '9').localeCompare(b.until || '9'));
  const stock = new Set(recs('ingredients').filter(i => i.stock).map(i => i.id));
  const rs = recs('recipes');
  const ready = rs.filter(r => r.ingredients?.length && r.ingredients.every(id => stock.has(id)));
  const pick = shuffle(ready.length >= 3 ? ready : rs).slice(0, 4);
  const dp = curPlan(), dn = liveOffers().length;
  const toReview = recs('meals').filter(m => m.recipe && L.byId[m.recipe] && m.date < t && m.date >= addDays(t, -7) && !recs('rreviews').some(v => v.recipe === m.recipe && v.date >= m.date)).sort((a, b) => b.date.localeCompare(a.date)).filter((m, i, a) => a.findIndex(x => x.recipe === m.recipe) === i).slice(0, 4);
  host.innerHTML = `${head('Kitchen')}
  <button class="btn primary bigact" data-chooser>${svg(P.pot)}<span><b>What shall I eat?</b><small>A few questions, then three ideas from your own recipes</small></span></button>
  <div class="panels">
    ${(() => { const soon = recs('ingredients').filter(useSoon).sort((a, b) => a.expires.localeCompare(b.expires)); if (!soon.length) return ''; const ids = new Set(soon.map(x => x.id)), use = rs.filter(r => (r.ingredients || []).some(id => ids.has(id))).sort((a, b) => (b.ingredients || []).filter(id => ids.has(id)).length - (a.ingredients || []).filter(id => ids.has(id)).length).slice(0, 4);
      return panel('Use soon', `<div class="lrows">${soon.slice(0, 6).map(x => `<div class="lrow"><button class="lmain" data-act="open" data-id="${x.id}"><b>${esc(x.name)}</b><span>${x.expires < t ? 'past its date' : x.expires === t ? 'best before today' : 'best before ' + esc(relDay(x.expires))}</span></button></div>`).join('')}</div>${use.length ? `<p class="dsub">Recipes that use them</p><div class="lwrap">${use.map(r => `<button class="chip" data-act="open" data-id="${r.id}">${esc(r.name)}</button>`).join('')}</div>` : ''}`, ['kitchen/pantry', 'Pantry']); })()}
    ${(() => { const old = inFreezer().filter(i => (freezerAge(i) ?? 0) >= FREEZE_DAYS); return old.length ? panel('Freezer', `<p class="lnone">In the freezer for 3 months or more. Use these first.</p><div class="lwrap">${old.slice(0, 8).map(i => `<button class="chip" data-act="open" data-id="${i.id}">${esc(i.name)}</button>`).join('')}</div>`, ['kitchen/pantry', 'Open freezer']) : ''; })()}
    ${foodCheckPanel()}
    ${new Date().getHours() < 14 ? breakfastPanel() : ''}
    ${leftoverPanel()}
    ${(() => { const pl = curPlan(); return pl?.prepDay === today() ? prepPanel(pl, true) : ''; })()}
    ${toReview.length ? panel('How was it?', `<p class="lnone">A few taps after eating teach the app what you like.</p><div class="lrows">${toReview.map(m => `<div class="lrow"><span class="lmain"><b>${esc(relName(m.recipe))}</b><span>${esc(niceDate(m.date))}${m.slot ? ' · ' + esc(m.slot.toLowerCase()) : ''}</span></span><button class="btn small" data-rvw="${m.recipe}" data-date="${m.date}">Review</button></div>`).join('')}</div>`) : ''}
    ${dp || dn ? panel('Deals this week', `<p class="lbig">${plural(dn, 'deal')} at ${esc([...new Set(liveOffers().map(o => o.store).filter(Boolean))].slice(0, 4).join(', ') || 'your shops')}</p>${(dp?.dinners || []).length ? `<div class="lwrap">${dp.dinners.slice(0, 5).map(m => `<span class="chip">${esc(m.recipe && L.byId[m.recipe] ? titleOf(L.byId[m.recipe]) : m.name || 'Recipe')}</span>`).join('')}</div>` : ''}`, ['kitchen/deals', 'See the plan']) : ''}
    ${panel('Today’s meals', `<div class="lslots">${MEALS.map(s => { const m = meals.filter(x => x.slot === s); return `<div class="lslot"><span class="rowlbl">${s}</span>${m.map(x => `<button class="chip" data-act="open" data-id="${x.id}">${esc(titleOf(x))}</button>`).join('')}<button class="chip ghost" data-act="slot" data-date="${t}" data-slot="${s}" aria-label="Plan ${s.toLowerCase()}">+</button></div>`; }).join('')}</div>`, ['kitchen/meals', 'Meal plan'])}
    ${panel('Grocery list', groc.length ? `<p class="lbig">${plural(groc.length, 'thing')} to buy</p><div class="lwrap">${groc.slice(0, 14).map(i => `<span class="chip">${esc(i.name)}</span>`).join('')}${groc.length > 14 ? `<span class="chip">+${groc.length - 14}</span>` : ''}</div>` : quiet('Nothing on your list. Tap “Add to list” on a recipe or in the pantry.'), ['kitchen/groceries', 'Go shopping'])}
    ${panel('Meal prep', prep.length ? `<div class="lrows">${prep.slice(0, 5).map(row).join('')}</div>` : quiet('No prepped meals waiting.'), ['kitchen/meals', 'All meal prep'])}
    ${panel(ready.length >= 3 ? 'You can cook these now' : 'Something to cook', pick.length ? `<div class="lgrid small">${pick.map(card).join('')}</div>` : quiet('Your recipes show up here.'), ['kitchen/recipes', 'All recipes'])}
  </div>`;
}
/* ---------- money ----------
   Built on the Ultimate Budget Planner's model: a balance check per account plus everything logged since,
   minus the bills still due before payday, minus a safety buffer, spread over the days left. */
const addMonths = (s, n) => { const d = fromISO(s), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return iso(d); };
const fset = () => recs('fset')[0] || {};
const fBuffer = () => num(fset().buffer) ?? 100;
const fSeq = r => num(r.seq) ?? (r.created || 0);
const fSum = (list, k = 'amount') => list.reduce((n, x) => n + (num(x[k]) || 0), 0);
const fAccs = () => recs('faccounts').filter(a => !a.archived);
const fEur0 = n => (n < 0 && !masked() ? '−' : '') + money.format(Math.abs(n)).replace(/\.00$/, '');
const fSigned = n => (n < 0 && !masked() ? '−' : '') + eur(Math.abs(n));
/* your paydays. The dates you entered for a year win; any other month uses your usual day of the month,
   where a Saturday moves to the Friday before and a Sunday to the Monday after */
const fPayDom = () => { const s = fset(); return num(s.payDom) || (s.payday ? fromISO(s.payday).getDate() : null); };
function fPayGuess(month) {
  const dom = fPayDom(); if (!dom) return null;
  const last = new Date(+month.slice(0, 4), +month.slice(5, 7), 0).getDate(), x = fromISO(`${month}-${String(Math.min(dom, last)).padStart(2, '0')}`);
  if (x.getDay() === 6) x.setDate(x.getDate() - 1); else if (x.getDay() === 0) x.setDate(x.getDate() + 1);
  return iso(x);
}
const fPayList = () => [...new Set((fset().paydates || []).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d || '')))].sort();
function fPays(from, to) {
  const byMonth = new Map(fPayList().map(d => [d.slice(0, 7), d])), out = [];
  if (!byMonth.size && !fPayDom()) return out;
  for (let m = addMonths(from.slice(0, 7) + '-01', -1), i = 0; m <= to && i < 600; m = addMonths(m, 1), i++) {
    const d = byMonth.get(m.slice(0, 7)) || fPayGuess(m.slice(0, 7));
    if (d && d >= from && d <= to) out.push(d);
  }
  return out.sort();
}
// the next payday after today; on payday itself the new pay period has just started
function fPayday() { const t = today(); return fPays(addDays(t, 1), addDays(t, 75))[0] || null; }
const fStart = () => { const t = today(), l = fPays(addDays(t, -75), t); return l.length ? l[l.length - 1] : addDays(today(), -30); };
function fBalance(a) {
  const cs = recs('fchecks').filter(c => c.account === a.id); if (!cs.length) return null;
  const c = cs.reduce((x, y) => fSeq(y) > fSeq(x) ? y : x), s = fSeq(c), t = today();
  const after = x => x.account === a.id && fSeq(x) > s && x.date <= t;
  return (num(c.amount) || 0) - fSum(recs('ftx').filter(after)) + fSum(recs('fincome').filter(i => after(i) && i.confirmed !== false));
}
function fDebtBal(d) {
  const s = fSeq(d);
  return (num(d.balance) || 0) - fSum(recs('ftx').filter(x => x.debt === d.id && fSeq(x) > s)) + (d.account ? fSum(recs('ftx').filter(x => x.account === d.account && !x.debt && fSeq(x) > s)) : 0);
}
const fCadence = b => b.cadence === 'Every N months' ? `every ${num(b.every) || 1} months` : b.cadence === 'Weekly' && num(b.every) > 1 ? `every ${b.every} weeks` : (b.cadence || 'Monthly').toLowerCase();
function fDates(b, from, to) {
  if (b.active === false || !b.anchor) return [];
  const out = [], n = Math.max(1, num(b.every) || 1), ok = d => d >= from && d <= to && (!b.ends || d <= b.ends);
  if (b.cadence === 'Weekly') { for (let d = b.anchor, i = 0; d <= to && i < 2000; d = addDays(d, 7 * n), i++) if (ok(d)) out.push(d); return out; }
  const step = b.cadence === 'Yearly' ? 12 : b.cadence === 'Every N months' ? n : 1;
  for (let k = 0, d = b.anchor; d <= to && k < 600; k++, d = addMonths(b.anchor, k * step)) if (ok(d)) out.push(d);
  return out;
}
const fNext = b => fDates(b, today(), addMonths(today(), 25))[0] || null;
function fOccs(from, to) {
  const pm = new Map(recs('fpaid').map(p => [p.occ, p]));
  return recs('fbills').flatMap(b => fDates(b, from, to).map(d => { const key = b.id + '@' + d, p = pm.get(key); return { key, bill: b, date: d, amount: num(b.amount) || 0, type: b.type || 'Bill', paid: !!p?.paid, skipped: !!p?.skipped }; }))
    .sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
}
const fMoved = x => !!(x.category && L.byId[x.category]?.nospend);
const fEveryday = x => !x.bill && !x.debt && !x.transfer && !fMoved(x);
const fSpentBy = catId => { const s = fStart(), t = today(); return fSum(recs('ftx').filter(x => fEveryday(x) && x.category === catId && x.date >= s && x.date <= t)); };
function fState() {
  const t = today(), pay = fPayday(), start = fStart(), buf = fBuffer();
  const accs = fAccs(), bal = new Map(accs.map(a => [a.id, fBalance(a)]));
  const safeAccs = accs.filter(a => a.safe && a.type !== 'Card'), safeIds = new Set(safeAccs.map(a => a.id));
  const inAcc = safeAccs.reduce((n, a) => n + (bal.get(a.id) || 0), 0);
  const counts = o => !o.paid && !o.skipped && !potCovers(o) && (!o.bill.account || safeIds.has(o.bill.account));
  const occs = pay ? fOccs(start, addDays(pay, -1)) : fOccs(start, addDays(t, 30));
  const due = occs.filter(counts), overdue = due.filter(o => o.date < t);
  const billsBefore = fSum(due), until = inAcc - billsBefore - buf, days = pay ? Math.max(1, diffDays(t, pay)) : 30;
  const checks = recs('fchecks'), lastCheck = checks.reduce((m, c) => (c.at || '') > m ? c.at : m, '');
  return { t, pay, start, buf, accs, bal, safeIds, inAcc, due, overdue, billsBefore, until, days, perDay: until / days, counts, lastCheck };
}
function fPayOcc(o) {
  const b = o.bill;
  create('ftx', { name: b.name, amount: o.amount, date: today(), category: b.category || '', account: b.account || '', bill: o.key, debt: b.debt || '' })
    .then(tx => create('fpaid', { occ: o.key, bill: b.id, date: o.date, paid: true, paidOn: today(), tx }))
    .then(() => C.toast(`${b.name} marked paid`)).catch(() => C.toast('Could not save. Try again.'));
}
function fQuick(src) {
  create('ftx', { name: src.name, amount: num(src.amount) || 0, date: today(), category: src.category || '', account: src.account || fAccs().find(a => a.safe && a.type === 'Spending')?.id || '' })
    .then(() => C.toast(`${src.name} ${eur(num(src.amount))} written down`)).catch(() => C.toast('Could not save. Try again.'));
}
function fCheckSheet() {
  const accs = fAccs().filter(a => a.type !== 'Card');
  const sh = C.sheet({
    title: 'Check my money',
    body: `<p class="lnone">Type what your banking app says. Leave an account as it is if it hasn't changed.</p>
      <div class="lrows">${accs.map(a => { const b = fBalance(a); return `<label class="lrow mcheck"><span class="lmain"><b>${esc(a.name)}</b><span>${b == null ? 'never checked' : 'now ' + eur(b)}</span></span><input inputmode="decimal" data-acc="${a.id}" value="${b == null ? '' : (Math.round(b * 100) / 100).toFixed(2)}" aria-label="${esc(a.name)} balance"></label>`; }).join('')}</div>`,
    foot: `<div class="spacer"></div><button class="btn primary" data-fsave>Save balances</button>`
  });
  sh.querySelector('[data-fsave]').addEventListener('click', async () => {
    const jobs = [];
    for (const inp of sh.querySelectorAll('[data-acc]')) {
      const v = num(inp.value.replace(/[\s€]/g, '').replace(',', '.')); if (v == null) continue;
      const a = L.byId[inp.dataset.acc], b = fBalance(a);
      if (b == null || Math.abs(v - b) > 0.004) jobs.push(create('fchecks', { account: a.id, amount: v, at: today(), notes: b == null ? 'First balance' : `Adjusted by ${fSigned(v - b)}` }));
    }
    if (!jobs.length) { C.closeSheet(); C.toast('Balances match. Nothing to change.'); return; }
    try { await Promise.all(jobs); C.closeSheet(); C.toast('Balances saved'); } catch { C.toast('Could not save. Try again.'); }
  });
}
function fAfford(st) {
  const v = num(String(prompt('How much is it?', '') || '').replace(/[\s€]/g, '').replace(',', '.')); if (v == null) return;
  const left = st.until - v;
  C.toast(left >= 0 ? `Yes. You'd still have ${eur(left)} until payday, ${eur(left / st.days)} a day.` : `Not right now. It puts you ${eur(-left)} under your buffer before payday.`);
}
function moneyTile() {
  const st = fState(); if (!recs('faccounts').length) return '<p class="lnone">No money set up yet.</p>';
  const next = st.due.find(o => o.date >= st.t);
  return tileBody([
    part('money', 'safe', `<p class="dline"><span>Safe to spend today</span><b>${fSigned(st.perDay)}</b></p>`),
    partsOff('money').includes('payday') ? '' : st.pay ? `<p class="dline"><span>Until payday</span><b>${fSigned(st.until)} · ${plural(st.days, 'day')}</b></p>` : '',
    partsOff('money').includes('bill') ? '' : st.overdue.length ? `<p class="dline"><span>Overdue</span><b>${esc(st.overdue[0].bill.name)} ${eur(st.overdue[0].amount)}</b></p>` : next ? `<p class="dline"><span>Next bill</span><b>${esc(next.bill.name)}, ${esc(relDay(next.date))}</b></p>` : ''
  ]);
}

const MP = (t, body, more, id = '') => `<section class="panel lpanel mpanel" ${id ? `id="m-${id}"` : ''}><div class="lph3"><h3 class="mh">${esc(t)}</h3>${more || ''}</div>${body}</section>`;
const mLink = (label, v) => `<button class="chip link" data-act="go" data-v="${v}">${esc(label)}</button>`;
const TYPE_COL = { Bill: 'var(--c8)', Subscription: 'var(--c6)', Debt: 'var(--c7)', Pay: 'var(--c5)', Wish: 'var(--c3)' };
function fChart(pts, buf, pay) {
  const W = 600, H = 170, P = 6, vs = pts.map(p => p.v), lo = Math.min(...vs, buf), hi = Math.max(...vs, buf), r = hi - lo || 1;
  const x = i => P + i * (W - 2 * P) / (pts.length - 1), y = v => P + (hi - v) * (H - 2 * P) / r;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const pi = pts.findIndex(p => p.d === pay);
  return `<svg class="mchart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Expected balance over the next 30 days">
    <path d="${line} L${x(pts.length - 1)} ${H} L${x(0)} ${H}Z" class="mfill"/><line x1="${P}" x2="${W - P}" y1="${y(buf)}" y2="${y(buf)}" class="mbuf"/>
    ${pi >= 0 ? `<line x1="${x(pi)}" x2="${x(pi)}" y1="0" y2="${H}" class="mpayline"/>` : ''}<path d="${line}" class="mline"/></svg>`;
}
function fDonut(parts) {
  const tot = parts.reduce((n, p) => n + p.v, 0) || 1, R = 15.9155; let off = 25;
  return `<svg viewBox="0 0 42 42" class="mdonut" role="img" aria-label="Spending split"><circle cx="21" cy="21" r="${R}" class="mring"/>${parts.map(p => { const pct = 100 * p.v / tot, s = `<circle cx="21" cy="21" r="${R}" fill="none" stroke="${p.c}" stroke-width="5" stroke-dasharray="${pct.toFixed(2)} ${(100 - pct).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/>`; off -= pct; return s; }).join('')}</svg>`;
}
/* ---------- money: forecast, year, plan, debt, net worth, reviews ---------- */
const fMonth = s => s.slice(0, 7);
const fMonthName = (m, opts = { month: 'long', year: 'numeric' }) => fromISO(m + '-01').toLocaleDateString('en-GB', opts);
const fPrevMonth = (m, n = 1) => addMonths(m + '-01', -n).slice(0, 7);
const fTile = (k, v, h, cls = '') => `<div class="tile"><div class="k">${k}</div><div class="v ${cls}">${v}</div><div class="h">${h}</div></div>`;
function fPace() {
  const ev = recs('ftx').filter(x => fEveryday(x) && x.date <= today()); if (!ev.length) return { pace: 0, days: 0 };
  // the days you actually wrote something down, so time away doesn't water down your usual
  const days = new Set(ev.map(x => x.date)).size;
  return { pace: fSum(ev) / days, days };
}
function fProject(st, n, extra) {
  const pay = num(fset().payAmount) || 0, { pace, days } = fPace(), end = addDays(st.t, n);
  const occs = fOccs(st.start, end).filter(st.counts), paydays = new Set(), plan = plannedWishes(st.t, end);
  if (st.pay) for (const p of fPays(st.pay, end)) paydays.add(p);
  let v = st.inAcc - fSum(occs.filter(o => o.date < st.t)); const pts = [];
  for (let i = 0; i <= n; i++) {
    const d = addDays(st.t, i), ev = [], due = occs.filter(o => o.date === d);
    if (due.length) { v -= fSum(due); ev.push(due.some(o => o.type === 'Debt') ? 'debt' : 'bill'); }
    if (paydays.has(d)) { v += pay; ev.push('in'); }
    if (extra?.amount && d === extra.date) { v -= extra.amount; ev.push('buy'); }
    const pw = plan.filter(p => p.date === d); if (pw.length) { v -= fSum(pw); ev.push('buy'); }
    pts.push({ d, v, ev });
    v -= st.pay && d < st.pay ? Math.max(0, st.perDay) : pace;
  }
  return { pts, pace, days };
}
function fChart2(pts, buf, opts = {}) {
  const W = 800, H = opts.h || 220, P = 8, vs = pts.map(p => p.v), lo = Math.min(...vs, buf), hi = Math.max(...vs, buf), r = hi - lo || 1;
  const x = i => P + i * (W - 2 * P) / Math.max(1, pts.length - 1), y = v => P + (hi - v) * (H - 2 * P) / r;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const dots = opts.dots ? pts.map((p, i) => p.ev.length ? `<circle cx="${x(i)}" cy="${y(p.v)}" r="5" class="mdot ${p.ev.includes('in') ? 'in' : p.ev.includes('buy') ? 'buy' : p.ev.includes('debt') ? 'debt' : ''}"><title>${esc(shortDate(p.d))}: about ${fEur0(Math.round(p.v))}</title></circle>` : '').join('') : '';
  const ticks = opts.ticks ? [0, 1, 2, 3].map(k => Math.round(k * (pts.length - 1) / 3)).map(i => `<span style="left:${(100 * x(i) / W).toFixed(1)}%">${esc(shortDate(pts[i].d))}</span>`).join('') : '';
  return `<div class="mchartwrap"><svg class="mchart" style="height:${H}px" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Expected balance day by day">
    <path d="${line} L${x(pts.length - 1)} ${H} L${x(0)} ${H}Z" class="mfill"/><line x1="${P}" x2="${W - P}" y1="${y(buf)}" y2="${y(buf)}" class="mbuf"/><path d="${line}" class="mline"/>${dots}</svg>${ticks ? `<div class="mticks">${ticks}</div>` : ''}</div>`;
}
/* forecast page */
function moneyForecast(host) {
  const st = fState(), n = L.fdays || 60, w = L.fwhat || (L.fwhat = { amount: 0, off: 7 });
  const extra = { amount: w.amount, date: addDays(st.t, w.off) }, { pts, pace, days } = fProject(st, n, extra);
  const low = pts.reduce((m, p) => p.v < m.v ? p : m, pts[0]), last = pts[pts.length - 1];
  host.innerHTML = `<div class="viewhead dviewhead"><div><p class="mh mkick">The next ${n} days</p><h1>Forecast</h1></div><div class="spacer"></div>${[30, 60, 90].map(d => `<button class="btn small ${d === n ? 'primary' : ''}" data-fdays="${d}">${d} days</button>`).join('')}</div>
  <div class="tiles lt3">${fTile('Now', fSigned(st.inAcc), 'in the accounts that count')}${fTile('Lowest point', 'about ' + fEur0(Math.round(low.v)), `on ${esc(shortDate(low.d))}${low.v < st.buf ? `, ${eur(st.buf - low.v)} below your protected ${fEur0(st.buf)}` : ''}`, low.v < st.buf ? 'mneg' : '')}${fTile(`In ${n} days`, 'about ' + fEur0(Math.round(last.v)), 'on ' + esc(shortDate(last.d)))}</div>
  ${MP('Your balance, day by day', `${fChart2(pts, st.buf, { dots: true, ticks: true, h: 260 })}
    <p class="mlegend"><span><i class="mdotk"></i>bill or subscription</span><span><i class="mdotk debt"></i>debt payment</span><span><i class="mdotk in"></i>money in</span><span><i class="mdotk buy"></i>planned wish or what-if</span><span>- - - protected ${fEur0(st.buf)} (your buffer)</span></p>
    <p class="mmuted">Assumes you spend ${fSigned(Math.max(0, st.perDay))} a day until payday${st.pay ? ' on ' + esc(shortDate(st.pay)) : ''} (today’s safe amount), then about ${eur(pace)} a day, your usual on the ${plural(days, 'day')} you tracked. Bills and pay land on their dates.</p>
    <div class="mwhatif"><p class="mwh"><b>What if I buy something?</b><span>Slide to try a purchase.</span></p>
      <label class="mslide"><span>How much</span><input type="range" min="0" max="2000" step="10" value="${w.amount}" data-fw="amount"><b data-fwv="amount">${fEur0(w.amount)}</b></label>
      <label class="mslide"><span>When</span><input type="range" min="0" max="${n}" step="1" value="${Math.min(w.off, n)}" data-fw="off"><b data-fwv="off">${esc(shortDate(extra.date))}</b></label></div>`)}
  ${(() => { const pl = plannedWishes(st.t, addDays(st.t, n)); return MP('Planned wishes', pl.length ? `<div class="lrows">${pl.sort((a, b) => a.date.localeCompare(b.date)).map(p => `<div class="lrow"><span class="lmain"><b>${esc(p.name)}</b><span>${esc(shortDate(p.date))}</span></span><span class="lside">${fEur0(p.amount)}</span></div>`).join('')}</div><p class="mmuted">${fEur0(fSum(pl))} planned, already in the line above.</p>` : quiet('Give a wish a planned buy date on its sheet and it counts here.'), mLink('Wishlists', 'wish/today')); })()}`;
  if (!host.dataset.fwired) {
    host.dataset.fwired = '1';
    host.addEventListener('click', e => { const b = e.target.closest('[data-fdays]'); if (b) { L.fdays = Number(b.dataset.fdays); moneyForecast(host); } });
    host.addEventListener('input', e => { const i = e.target.closest('[data-fw]'); if (!i) return; const k = i.dataset.fw, v = Number(i.value); host.querySelector(`[data-fwv="${k}"]`).textContent = k === 'amount' ? fEur0(v) : shortDate(addDays(today(), v)); });
    host.addEventListener('change', e => { const i = e.target.closest('[data-fw]'); if (!i) return; L.fwhat[i.dataset.fw] = Number(i.value); moneyForecast(host); });
  }
}
/* year page */
const fMonthly = b => !b.cadence || b.cadence === 'Monthly' || b.cadence === 'Weekly';
const fEvery = b => b.cadence === 'Yearly' || (b.cadence === 'Every N months' && num(b.every) === 12) ? 'Once a year' : fCadence(b).replace(/^./, c => c.toUpperCase());
function moneyYear(host) {
  const t = today(), end = addDays(t, 365), occ = fOccs(t, end), odd = occ.filter(o => !fMonthly(o.bill));
  const oddSum = fSum(odd), bills = recs('fbills').filter(b => b.active !== false && !fMonthly(b));
  const inPots = fSum(bills.filter(b => b.sink), 'potSaved');
  const buckets = [];
  for (let k = 0; k <= 12; k++) {
    const from = k ? addMonths(t.slice(0, 8) + '01', k) : t; if (from > end) break;
    const mEnd = addDays(addMonths(from.slice(0, 8) + '01', 1), -1), to = mEnd < end ? mEnd : end;
    const os = occ.filter(o => o.date >= from && o.date <= to), m = fromISO(from).toLocaleDateString('en-GB', { month: 'short' });
    buckets.push({ label: k === 0 ? `${m} (rest)` : to < mEnd ? `${m} 1–${fromISO(to).getDate()}` : m, reg: fSum(os.filter(o => fMonthly(o.bill))), odd: fSum(os.filter(o => !fMonthly(o.bill))), from });
  }
  const max = Math.max(1, ...buckets.map(b => b.reg + b.odd)), avg = fSum(occ) / 12, big = buckets.reduce((m, b) => b.reg + b.odd > m.reg + m.odd ? b : m, buckets[0]);
  host.innerHTML = `<div class="viewhead dviewhead"><div><p class="mh mkick">The next 365 days</p><h1>Year</h1></div><div class="spacer"></div><button class="btn small primary" data-act="new" data-v="fbills">+ Add a yearly cost</button></div>
  <div class="tiles lt3">${fTile('Costs that don’t come monthly', eur(oddSum), 'in the next 365 days')}${fTile('Put aside each month', eur(oddSum / 12), 'covers every yearly cost on time')}${fTile('Already in pots', fEur0(inPots), 'kept out of safe to spend', 'mgood')}</div>
  ${MP('What goes out each month', `<div class="myear">${buckets.map(b => `<div class="mcol"><div class="mbox"><div class="mstack" style="height:${(100 * (b.reg + b.odd) / max).toFixed(1)}%" title="${esc(b.label)}: ${eur(b.reg + b.odd)}"><i class="odd" style="flex:${b.odd}"></i><i style="flex:${b.reg}"></i></div></div><span>${esc(b.label)}</span></div>`).join('')}<div class="mavg" style="bottom:${(28 + 200 * avg / max).toFixed(0)}px"></div></div>
    <p class="mlegend"><span><i style="background:var(--c8)"></i>Every month</span><span><i style="background:var(--c7)"></i>Once in a while</span><span>- - - Average month, yearly costs included: ${eur(avg)}</span></p>
    <p class="mmuted">Your fixed costs come to about <b>${fEur0(Math.round(avg))} a month</b>: bills, subscriptions and yearly costs spread out, before everyday spending.</p>`, `<span class="lnone">Biggest: <b>${esc(fMonthName(fMonth(big.from)))}</b>, ${eur(big.reg + big.odd)}</span>`)}
  ${MP('Pots for the big ones', bills.length ? `<div class="lrows">${bills.map(b => { const nx = fNext(b), months = nx ? Math.max(1, Math.round(diffDays(t, nx) / 30.4)) : 0; return `<div class="lrow mpot"><span class="lmain"><b>${esc(b.name)} <span class="mmuted">${eur(num(b.amount))}</span></b><span>${esc(fEvery(b))}${nx ? ` · due ${esc(shortDate(nx))}, in ${plural(months, 'month')}` : ''}${b.sink && months ? ` · put aside ${eur((num(b.amount) || 0) / months)} a month` : ''}</span></span><button class="btn small ${b.sink ? 'primary' : ''}" data-act="fsink" data-id="${b.id}">${b.sink ? 'Saving up' : 'Save up for it'}</button><button class="chip link" data-act="open" data-id="${b.id}">Edit</button></div>`; }).join('')}</div>` : quiet('No yearly costs yet.'))}`;
}
/* spending */
function fPlanTop() {
  const st = fState(), env = fSum(recs('fcats'), 'budget'), spent = fSum(recs('ftx').filter(x => fEveryday(x) && x.date >= st.start && x.date <= st.t));
  return `<div class="tiles lt3">${fTile('Your plan', eur(env), 'set aside for everyday spending each pay')}${fTile('Spent this pay', eur(spent), st.pay ? plural(st.days, 'day') + ' to payday' : '')}${fTile('Left in the plan', fSigned(env - spent), env - spent < 0 ? 'over the plan' : 'still to use', env - spent < 0 ? 'mneg' : '')}</div>`;
}
function fAllFill(fill) {
  const t = today(), rows = [...recs('ftx').map(x => ({ x, out: true })), ...recs('fincome').map(x => ({ x, out: false }))].sort((a, b) => (b.x.date + fSeq(b.x)).localeCompare(a.x.date + fSeq(a.x)));
  const lim = L.fall || 50, groups = new Map();
  for (const r of rows.slice(0, lim)) { const k = r.x.date; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  fill.innerHTML = [...groups.entries()].map(([d, rs]) => { const net = rs.reduce((n, r) => n + (r.out ? -1 : 1) * (num(r.x.amount) || 0), 0); return `<div class="mdayhead"><b>${esc(dayName(d))} ${esc(niceDate(d))}${d > t ? ' · planned' : ''}</b><span class="${net >= 0 ? 'mgood' : ''}">${net >= 0 ? '+' : '−'}${eur(Math.abs(net))}</span></div><div class="lrows">${rs.map(r => row(r.x)).join('')}</div>`; }).join('') + (rows.length > lim ? `<button class="btn small mmore" data-act="fall">Show more</button>` : '') || quiet('Nothing logged yet.');
}
/* plan */
function fGoalsTop() {
  const gs = recs('fgoals').filter(g => !g.done), safe = fState().safeIds, saved = fSum(gs, 'saved');
  return `<div class="tiles lt3">${fTile('Saved so far', fEur0(saved), `across ${plural(gs.length, 'goal')}`)}${fTile('Still to save', fEur0(gs.reduce((n, g) => n + Math.max(0, (num(g.target) || 0) - (num(g.saved) || 0)), 0)), 'to reach every goal')}${fTile('Kept out of safe to spend', fEur0(fSum(gs.filter(g => safe.has(g.account)), 'saved')), 'goal money sitting in your everyday account')}</div>`;
}
function fLastFull() { return fPrevMonth(fMonth(today())); }
function fSafetyFill(fill) {
  const st = fState(), sav = fAccs().filter(a => a.type === 'Savings').reduce((n, a) => n + Math.max(0, st.bal.get(a.id) || 0), 0);
  const m = fLastFull(), out = fSum(recs('ftx').filter(x => fMonth(x.date) === m)), months = out ? sav / out : 0, setRec = recs('fset')[0];
  fill.innerHTML = `<div class="tiles lt3">${fTile('Protected buffer', eur(st.buf), 'never counted as safe to spend')}${fTile('Savings cushion', months ? months.toFixed(1) + ' months' : '–', `${eur(sav)} in savings against ${eur(out)} going out in ${esc(fMonthName(m, { month: 'long' }))}`)}${fTile('Goal', '3 months', months >= 3 ? 'You are there.' : `${eur(Math.max(0, 3 * out - sav))} to go`)}</div>
    ${panel('How the safety net works', `<p class="mmuted">Safe to spend always leaves your buffer of ${eur(st.buf)} untouched, so a surprise never takes you to zero. The cushion counts every savings pot, set against what went out in your last full month. Three months of that scores full in Money health.</p>${setRec ? `<button class="btn small" data-act="open" data-id="${setRec.id}">Change the buffer</button>` : '<button class="btn small" data-act="new" data-v="fset">Set your buffer</button>'}`)}`;
}
/* debt */
function fPayoff(bal, apr, pay) {
  let b = bal, m = 0, interest = 0; const r = (num(apr) || 0) / 1200;
  if (b <= 0) return { months: 0, interest: 0 }; if (pay <= b * r || pay <= 0) return { months: Infinity, interest: Infinity };
  while (b > 0.005 && m < 1200) { const i = b * r; interest += i; b = b + i - pay; m++; }
  return { months: m, interest };
}
function fStrategy(order, extra) {
  const ds = order.map(d => ({ b: fDebtBal(d), r: (num(d.apr) || 0) / 1200, p: num(d.payment) || 0 })).filter(d => d.b > 0);
  let m = 0, interest = 0;
  while (ds.some(d => d.b > 0.005) && m < 1200) {
    let pool = extra; m++;
    for (const d of ds) if (d.b > 0.005) { const i = d.b * d.r; interest += i; d.b += i; const pay = Math.min(d.p, d.b); d.b -= pay; } else pool += d.p;
    for (const d of ds) if (d.b > 0.005 && pool > 0) { const pay = Math.min(pool, d.b); d.b -= pay; pool -= pay; }
    if (!extra && ds.every(d => d.p <= d.b * d.r && d.b > 0.005)) return { months: Infinity, interest: Infinity };
  }
  return { months: m >= 1200 ? Infinity : m, interest };
}
const fWhen = months => months === Infinity ? 'never at this pace' : addMonths(today(), months).slice(0, 7);
const fYears = months => months === Infinity ? 'never' : months < 12 ? plural(months, 'month') : `${Math.floor(months / 12)} yr ${months % 12} mo`;
function fDebtFreeFill(fill) {
  const ds = recs('fdebts').filter(d => fDebtBal(d) > 0.005), all = ds.map(d => ({ d, bal: fDebtBal(d), ...fPayoff(fDebtBal(d), d.apr, num(d.payment) || 0) }));
  const last = all.reduce((m, x) => x.months > m ? x.months : m, 0);
  fill.innerHTML = ds.length ? `<div class="tiles lt3">${fTile('Debt-free', last === Infinity ? 'Not on this pace' : fMonthName(fWhen(last)), last === Infinity ? 'a payment only covers the interest' : `in ${fYears(last)}`)}${fTile('Still owed', eur(fSum(all, 'bal')), plural(ds.length, 'debt'))}${fTile('Paid each month', eur(fSum(ds, 'payment')), 'in minimum payments')}</div>
    <div class="panels">${all.map(x => panel(x.d.name, `<p class="lbig">${eur(x.bal)}</p><p class="mmuted">${num(x.d.payment) ? eur(num(x.d.payment)) + ' a month' : 'no monthly payment set'}${num(x.d.apr) ? ` · ${x.d.apr}% interest` : ''}</p><p class="dline"><span>Paid off</span><b>${x.months === Infinity ? 'not at this pace' : esc(fMonthName(fWhen(x.months)))}</b></p><p class="dline"><span>Interest still to pay</span><b>${x.interest === Infinity ? '–' : eur(x.interest)}</b></p>`)).join('')}</div>` : quiet('No debts. Nothing to pay off.');
}
function fMethodFill(fill) {
  const ds = recs('fdebts').filter(d => fDebtBal(d) > 0.005), extra = num(fset().debtExtra) || 0, setRec = recs('fset')[0];
  if (!ds.length) { fill.innerHTML = quiet('No debts to compare.'); return; }
  const snow = [...ds].sort((a, b) => fDebtBal(a) - fDebtBal(b)), aval = [...ds].sort((a, b) => (num(b.apr) || 0) - (num(a.apr) || 0));
  const S = fStrategy(snow, extra), A = fStrategy(aval, extra), best = A.interest < S.interest - 0.5 ? 'avalanche' : S.months < A.months ? 'snowball' : 'either';
  const card = (name, how, order, r) => panel(name, `<p class="mmuted">${how}</p><ol class="morder">${order.map(d => `<li>${esc(d.name)} <span class="mmuted">${eur(fDebtBal(d))}${num(d.apr) ? ', ' + d.apr + '%' : ''}</span></li>`).join('')}</ol><p class="dline"><span>Debt-free</span><b>${r.months === Infinity ? 'not at this pace' : esc(fMonthName(fWhen(r.months)))}</b></p><p class="dline"><span>Interest</span><b>${r.interest === Infinity ? '–' : eur(r.interest)}</b></p>`);
  fill.innerHTML = `<p class="mmuted">With ${eur(extra)} extra a month on top of the minimums. ${best === 'either' ? 'Both come out the same for your debts.' : `<b>${best === 'avalanche' ? 'Avalanche' : 'Snowball'}</b> works out better for you.`}</p>
    <div class="panels">${card('Snowball', 'Smallest balance first. Quick wins keep you going.', snow, S)}${card('Avalanche', 'Highest interest first. Costs the least overall.', aval, A)}</div>
    ${setRec ? `<button class="btn small" data-act="open" data-id="${setRec.id}">Change the extra per month</button>` : ''}`;
}
function fPaymentsFill(fill) {
  const ps = recs('ftx').filter(x => x.debt || (x.bill && L.byId[x.bill.split('@')[0]]?.type === 'Debt')).sort((a, b) => b.date.localeCompare(a.date));
  fill.innerHTML = ps.length ? `<p class="mmuted">${plural(ps.length, 'payment')}, ${eur(fSum(ps))} in total.</p><div class="lrows">${ps.map(row).join('')}</div>` : quiet('No debt payments logged yet.');
}
/* net worth */
function fNetFill(fill) {
  const st = fState(), accs = fAccs(), debts = recs('fdebts');
  const owned = accs.reduce((n, a) => n + (a.type !== 'Card' ? st.bal.get(a.id) || 0 : 0), 0), owed = debts.reduce((n, d) => n + Math.max(0, fDebtBal(d)), 0);
  const line = (name, v, id, sub = '') => `<div class="lrow"><button class="lmain" data-act="open" data-id="${id}"><b>${esc(name)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</button><span class="lside">${v}</span></div>`;
  fill.innerHTML = `<div class="tiles lt3">${fTile('Net worth', fSigned(owned - owed), 'what you own minus what you owe', owned - owed < 0 ? 'mneg' : '')}${fTile('Owned', eur(owned), plural(accs.filter(a => a.type !== 'Card').length, 'account'))}${fTile('Owed', eur(owed), plural(debts.length, 'debt'))}</div>
    <div class="panels">${panel('What you own', `<div class="lrows">${accs.filter(a => a.type !== 'Card').sort((a, b) => (st.bal.get(b.id) || 0) - (st.bal.get(a.id) || 0)).map(a => { const b = st.bal.get(a.id); return line(a.name, b == null ? 'not checked' : fSigned(b), a.id, [a.type, a.safe ? 'in safe to spend' : ''].filter(Boolean).join(' · ')); }).join('')}</div>`)}
    ${panel('What you owe', debts.length ? `<div class="lrows">${debts.map(d => line(d.name, eur(fDebtBal(d)), d.id, num(d.payment) ? eur(num(d.payment)) + ' a month' : '')).join('')}</div>` : quiet('Nothing owed.'))}</div>
    <button class="btn small" data-act="fcheck">Check my money</button>`;
}
/* reviews */
function fMonthData(m) {
  const tx = recs('ftx').filter(x => fMonth(x.date) === m), inc = recs('fincome').filter(x => fMonth(x.date) === m);
  return { tx, inc, out: fSum(tx), in: fSum(inc), every: tx.filter(fEveryday) };
}
function fHealth(m) {
  const t = today(), d = fMonthData(m), st = fState(), parts = [];
  const kept = d.in ? (d.in - d.out) / d.in : 0;
  parts.push(['Cash flow', Math.round(20 * Math.min(1, Math.max(0, kept / 0.2))), `You kept ${Math.round(100 * kept)}% of what came in. 20% or more scores full.`]);
  const sav = fAccs().filter(a => a.type === 'Savings').reduce((n, a) => n + Math.max(0, st.bal.get(a.id) || 0), 0), cm = d.out ? sav / d.out : 0;
  parts.push(['Savings cushion', Math.round(20 * Math.min(1, cm / 3)), `Savings would cover about ${cm.toFixed(1)} months of spending. 3 months scores full.`]);
  const pay = fSum(d.inc.filter(i => i.type === 'Pay')) || d.in, dp = fSum(d.tx.filter(x => x.debt || (x.bill && L.byId[x.bill.split('@')[0]]?.type === 'Debt'))), dpct = pay ? 100 * dp / pay : 0;
  parts.push(['Debt', Math.round(dpct <= 10 ? 20 : Math.max(0, 20 - (dpct - 10) * 0.6)), `Debt payments take ${Math.round(dpct)}% of your pay. Under 10% scores near full.`]);
  const from60 = addDays(t, -60), done = recs('fpaid').filter(p => (p.paid || p.skipped) && p.date >= from60 && p.date < t), doneKeys = new Set(done.map(p => p.occ));
  const open = fOccs(from60, addDays(t, -1)).filter(o => !doneKeys.has(o.key) && !o.paid && !o.skipped), all60 = done.length + open.length, late = done.filter(p => (p.paidOn || p.date) > p.date).length;
  parts.push(['Bills ticked off', all60 ? Math.round(20 * done.length / all60) : 20, `${done.length} of ${all60} bills from the last 60 days are ticked off${late ? `, ${late} after the due date` : ''}.`]);
  const days = new Set([...recs('ftx'), ...recs('fincome'), ...recs('fchecks')].flatMap(r => [r.date || r.at, r.created ? iso(new Date(r.created)) : null]).filter(x => x && x > addDays(t, -30) && x <= t));
  if (fset().nothingOn > addDays(t, -30)) days.add(fset().nothingOn);
  parts.push(['Kept up', Math.min(20, Math.round(20 * days.size / 12)), `You showed up on ${days.size} of the last 30 days. 12 scores full, and coming back always counts.`]);
  const score = parts.reduce((n, p) => n + p[1], 0);
  return { score, parts, label: score >= 80 ? 'Thriving' : score >= 60 ? 'Healthy' : score >= 40 ? 'Getting there' : 'Needs care' };
}
function fSankey(d) {
  const left = d.out; if (!left) return quiet('Nothing went out this month.');
  const bills = d.tx.filter(x => !fEveryday(x) && !fMoved(x)), every = d.every, mids = [['Bills', bills, 'var(--c8)'], ['Everyday', every, 'var(--c1)']].filter(m => m[1].length);
  const rights = []; const top = (list, key) => { const g = new Map(); for (const x of list) { const k = key(x); g.set(k, (g.get(k) || 0) + (num(x.amount) || 0)); } const s = [...g.entries()].sort((a, b) => b[1] - a[1]); return s.length > 5 ? [...s.slice(0, 4), ['Other', s.slice(4).reduce((n, e) => n + e[1], 0)]] : s; };
  mids.forEach(([name, list, c], mi) => top(list, x => name === 'Bills' ? (L.byId[(x.bill || '').split('@')[0]]?.name || x.name || 'Debt') : (titleOf(L.byId[x.category] || {}) !== 'Untitled' ? titleOf(L.byId[x.category]) : 'Other')).forEach(([k, v]) => rights.push({ k, v, mi, c: mi ? ['var(--c6)', 'var(--c3)', 'var(--c2)', 'var(--c4)', 'var(--c5)'][rights.filter(r => r.mi === mi).length % 5] : 'var(--c8)' })));
  const H = 320, G = 10, W = 1000, x0 = 230, x1 = 540, x2 = 730, nw = 12, scaleM = (H - G * (mids.length - 1)) / left, scaleR = (H - G * (rights.length - 1)) / left;
  let y = 0; const mid = mids.map(([name, list, c]) => { const v = fSum(list), h = v * scaleM, o = { name, v, c, y, h }; y += h + G; return o; });
  y = 0; for (const r of rights) { r.h = r.v * scaleR; r.y = y; y += r.h + G; }
  const band = (xa, ya, ha, xb, yb, hb, c) => `<path d="M${xa} ${ya} C${(xa + xb) / 2} ${ya} ${(xa + xb) / 2} ${yb} ${xb} ${yb} L${xb} ${yb + hb} C${(xa + xb) / 2} ${yb + hb} ${(xa + xb) / 2} ${ya + ha} ${xa} ${ya + ha}Z" fill="${c}" opacity=".35"/>`;
  let ly = 0; const bands1 = mid.map(m => { const h = m.v * (H / left) * (H - G * (mids.length - 1)) / H, s = band(x0 + nw, ly, m.v * H / left, x1, m.y, m.h, m.c); ly += m.v * H / left; return s; }).join('');
  const offs = mid.map(m => m.y), bands2 = rights.map(r => { const m = mid[r.mi], h = r.v * scaleM, s = band(x1 + nw, offs[r.mi], h, x2, r.y, r.h, r.c); offs[r.mi] += h; return s; }).join('');
  const pct = v => Math.round(100 * v / left) + '%';
  return `<svg class="msankey" viewBox="0 0 ${W} ${H}" role="img" aria-label="Where the money went">${bands1}${bands2}
    <rect x="${x0}" y="0" width="${nw}" height="${H}" rx="4" fill="var(--tag)"/><text x="${x0 - 12}" y="${H / 2 - 4}" text-anchor="end" class="mst">From your balance</text><text x="${x0 - 12}" y="${H / 2 + 18}" text-anchor="end" class="mss">${fEur0(Math.round(left))}</text>
    ${mid.map(m => `<rect x="${x1}" y="${m.y}" width="${nw}" height="${Math.max(2, m.h)}" rx="4" fill="${m.c}"/><text x="${x1 + 20}" y="${m.y + m.h / 2 - 4}" class="mst">${m.name}</text><text x="${x1 + 20}" y="${m.y + m.h / 2 + 16}" class="mss">${fEur0(Math.round(m.v))} · ${pct(m.v)}</text>`).join('')}
    ${rights.map(r => `<rect x="${x2}" y="${r.y}" width="${nw}" height="${Math.max(2, r.h)}" rx="4" fill="${r.c}"/><text x="${x2 + 20}" y="${r.y + r.h / 2 + 5}" class="mss"><tspan class="mst">${esc(r.k)}</tspan> ${fEur0(Math.round(r.v))} · ${pct(r.v)}</text>`).join('')}</svg>`;
}
// what your habits cost this month: joints bought, coffee out, soda and juice, clothes, takeaway
function habitMoney(m) {
  const inM = d => String(d || '').startsWith(m), tx = recs('ftx').filter(x => inM(x.date) && !x.bill && !x.transfer);
  const by = re => tx.filter(x => re.test(`${x.name || ''} ${titleOf(L.byId[x.category] || { name: '' })} ${[].concat(x.tags || []).join(' ')}`)).reduce((n, x) => n + (num(x.amount) || 0), 0);
  const clean = recs('cleanlog').filter(l => l.type === 'Gekocht' && inM(l.date)).reduce((n, l) => n + (num(l.amount) || 0), 0);
  const rows = [['Joints gekocht', clean], ['Koffie buiten de deur', by(/koffie|coffee|starbucks|matcha|bagels|espresso/i)], ['Frisdrank en sap', by(/frisdrank|soda|cola|sap\b|juice|red bull/i)], ['Kleding', by(/kleding|clothes|zara|h&m|zalando|vinted|mango|primark/i)], ['Afhaal en bezorgen', by(/thuisbezorgd|uber ?eats|deliveroo|takeaway|afhaal|mcdonald|kfc|domino/i)]].filter(([, v]) => v > 0);
  const cs = cleanStats();
  return (rows.length ? `<div class="mpair m3">${rows.map(([l, v]) => `<p><span>${esc(l)}</span><b>${fEur0(v)}</b></p>`).join('')}</div>` : '<p class="lnone">Nothing tagged yet. Name purchases or categories like coffee, soda or clothes and they show up here.</p>')
    + (cs.start && !cs.before ? `<p class="lnone">Clean saves you about ${eur(cs.saved)} so far.</p>` : '');
}
function moneyReviews(host) {
  const cur = fMonth(today()), m = fPrevMonth(cur, L.rmon || 0), isCur = m === cur, d = fMonthData(m), prev = fMonthData(fPrevMonth(m));
  const hm = isCur ? fPrevMonth(cur) : m, h = fHealth(hm), hd = fMonthData(hm), s = fset(), env = fSum(recs('fcats'), 'budget');
  const R = 15.9155, pct = h.score;
  const biggest = d.tx.reduce((b, x) => (num(x.amount) || 0) > (num(b?.amount) || 0) ? x : b, null);
  const byCat = new Map(); for (const x of d.tx) { const b = x.bill ? L.byId[x.bill.split('@')[0]] : null; const k = b ? b.name : titleOf(L.byId[x.category] || { name: 'Other' }); byCat.set(k, (byCat.get(k) || 0) + (num(x.amount) || 0)); }
  const most = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
  const daysIn = isCur ? fromISO(today()).getDate() : new Date(fromISO(m + '-01').getFullYear(), fromISO(m + '-01').getMonth() + 1, 0).getDate();
  const spentDays = new Set(d.every.filter(x => x.date <= today()).map(x => x.date)), zero = daysIn - spentDays.size;
  const toCome = isCur && fPayday() && fMonth(fPayday()) === cur ? `Still to come this month: ${eur(num(s.payAmount) || 0)} pay on ${shortDate(fPayday())}.` : '';
  const maxIO = Math.max(d.in, d.out, 1);
  const catKeys = recs('fcats'), against = catKeys.map(c => ({ c, a: fSum(d.every.filter(x => x.category === c.id)), b: fSum(prev.every.filter(x => x.category === c.id)) })).filter(x => x.a || x.b).sort((x, y) => (y.a + y.b) - (x.a + x.b)).slice(0, 10), maxA = Math.max(1, ...against.map(x => Math.max(x.a, x.b)));
  const months12 = Array.from({ length: 12 }, (_, i) => fPrevMonth(m, 11 - i)).map(k => ({ k, ...fMonthData(k) })), max12 = Math.max(1, ...months12.map(x => Math.max(x.in, x.out)));
  const yr = m.slice(0, 4), yd = Array.from({ length: Number(m.slice(5)) }, (_, i) => `${yr}-${String(i + 1).padStart(2, '0')}`).map(fMonthData);
  const yIn = yd.reduce((n, x) => n + x.in, 0), yOut = yd.reduce((n, x) => n + x.out, 0);
  const jump = [['m-r-health', 'Money health'], ['m-r-went', 'Where the money went'], ['m-r-added', 'How the month added up'], ['m-r-against', 'Against last month'], ['m-r-12', '12 months'], ['m-r-year', 'This year'], ['m-r-wish', 'Wishlists']];
  host.innerHTML = `<div class="viewhead dviewhead"><div><p class="mh mkick">${isCur ? 'This month so far' : 'Looking back'}</p><h1>Reviews</h1></div><div class="spacer"></div><button class="iconbtn" data-rmon="1" aria-label="Previous month">${svg(P.left)}</button><b class="mmon">${esc(fMonthName(m))}</b><button class="iconbtn" data-rmon="-1" aria-label="Next month" ${isCur ? 'disabled' : ''}>${svg(P.right)}</button><button class="btn small" onclick="print()">Print</button></div>
  <nav class="mjump">${jump.map(([id, l]) => `<button class="chip" data-jump="${id}">${l}</button>`).join('')}</nav>
  <div class="mtop mrev">${MP('Money health', `<div class="mhealth"><svg viewBox="0 0 42 42" class="mgauge"><circle cx="21" cy="21" r="${R}" class="mring"/><circle cx="21" cy="21" r="${R}" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="25"/><text x="21" y="24.5" text-anchor="middle" class="mgn">${h.score}</text></svg><div><p class="lbig">${h.label}</p><p class="mmuted">out of 100, in five parts</p></div></div>
      ${h.parts.map(([n, v, t]) => `<div class="mpart"><p class="mbl"><b>${n}</b><b>${v}<small>/20</small></b></p><span class="lprog"><i style="width:${v * 5}%"></i></span><p class="mmuted">${esc(t)}</p></div>`).join('')}`, `<span class="lnone">based on ${esc(fMonthName(hm, { month: 'long' }))}${isCur ? ', your last full month' : ''}</span>`, 'r-health')}
    ${MP(`${fMonthName(m, { month: 'long' })} in numbers`, `<div class="mpair m3"><p><span>Money in${isCur ? ' so far' : ''}</span><b class="mgood">${fEur0(d.in)}</b></p><p><span>Money out${isCur ? ' so far' : ''}</span><b>${fEur0(d.out)}</b></p><p><span>Difference${isCur ? ' so far' : ''}</span><b>${fSigned(d.in - d.out).replace(/\.00$/, '')}</b></p></div>
      ${toCome ? `<p class="mmuted">${esc(toCome)}</p>` : ''}
      <div class="mio"><span>In</span><i style="width:${(100 * d.in / maxIO).toFixed(1)}%;background:var(--c5)"></i><span>Out</span><i style="width:${(100 * d.out / maxIO).toFixed(1)}%;background:var(--danger)"></i></div>
      <div class="mfacts">${most ? `<p><span>🏆 Most went on ${esc(most[0])}</span><b>${fEur0(most[1])}</b></p>` : ''}${biggest ? `<p><span>🧾 Biggest purchase: ${esc(biggest.name)}</span><b>${fEur0(num(biggest.amount))}</b></p>` : ''}<p><span>🌿 Days with nothing spent</span><b>${zero}</b></p>${env ? `<p><span>${fSum(d.every) <= env ? '✅' : '⚠️'} Everyday spending within the plan</span><b>${fEur0(fSum(d.every))} / ${fEur0(env)}</b></p>` : ''}</div>`)}</div>
  ${MP('Where the money went', fSankey(d), `<span class="lnone">${esc(fMonthName(m, { month: 'long' }))}${isCur ? ' so far' : ''}</span>`, 'r-went')}
  <div class="mrow2 meq">${MP('How the month added up', `<p class="mmuted">${esc(fMonthName(hm, { month: 'long' }))}: ${eur(hd.in)} came in and ${eur(hd.out)} went out, so you ${hd.in >= hd.out ? `kept ${eur(hd.in - hd.out)}` : `spent ${eur(hd.out - hd.in)} more than came in, from your balance`}.</p>
      <div class="mfacts"><p><span>Pay</span><b>${eur(fSum(hd.inc.filter(i => i.type === 'Pay')))}</b></p><p><span>Other money in</span><b>${eur(fSum(hd.inc.filter(i => i.type !== 'Pay')))}</b></p><p><span>Bills and debt</span><b>${eur(fSum(hd.tx.filter(x => !fEveryday(x) && !fMoved(x))))}</b></p><p><span>Everyday spending</span><b>${eur(fSum(hd.every))}</b></p></div>`, '', 'r-added')}
    ${MP(`So far, against all of ${fMonthName(fPrevMonth(m), { month: 'long' })}`, against.length ? `<div class="magainst">${against.map(x => `<button class="mag" data-act="open" data-id="${x.c.id}"><span class="mbl"><span>${esc(titleOf(x.c))}</span><b>${fEur0(x.a)} <small>/ ${fEur0(x.b)}</small></b></span><span class="lprog"><i style="width:${(100 * x.a / maxA).toFixed(1)}%"></i></span><span class="lprog mlast"><i style="width:${(100 * x.b / maxA).toFixed(1)}%"></i></span></button>`).join('')}</div><p class="mlegend"><span><i style="background:var(--accent)"></i>${esc(fMonthName(m, { month: 'short' }))}</span><span><i style="background:var(--tag)"></i>${esc(fMonthName(fPrevMonth(m), { month: 'short' }))}</span></p>` : quiet('Nothing to compare yet.'), '', 'r-against')}</div>
  ${MP('12 months', `<div class="m12">${months12.map(x => `<div class="mcol"><div class="mbox mpair2"><i style="height:${(100 * x.in / max12).toFixed(1)}%;background:var(--c5)" title="In ${eur(x.in)}"></i><i style="height:${(100 * x.out / max12).toFixed(1)}%;background:var(--c1)" title="Out ${eur(x.out)}"></i></div><span>${esc(fMonthName(x.k, { month: 'short' }))}</span></div>`).join('')}</div><p class="mlegend"><span><i style="background:var(--c5)"></i>In</span><span><i style="background:var(--c1)"></i>Out</span></p>`, '', 'r-12')}
  ${MP(`This year, ${yr}`, `<div class="mpair m3"><p><span>Came in</span><b class="mgood">${fEur0(yIn)}</b></p><p><span>Went out</span><b>${fEur0(yOut)}</b></p><p><span>Difference</span><b>${fSigned(yIn - yOut)}</b></p></div>`, '', 'r-year')}
  ${MP('Wishlists this month', wishReview(m, fMonthName(m, { month: 'long' })), mLink('Wishlists', 'wish/today'), 'r-wish')}
  ${MP('Habits in money', habitMoney(m), '', 'r-habits')}`;
  if (!host.dataset.rwired) {
    host.dataset.rwired = '1';
    host.addEventListener('click', e => { const b = e.target.closest('[data-rmon]'); if (b) { L.rmon = Math.max(0, (L.rmon || 0) + Number(b.dataset.rmon)); moneyReviews(host); return; } const j = e.target.closest('[data-jump]'); if (j) document.getElementById(j.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }
}


/* ---------- pots: money put aside per bill ----------
   A pot is an account of type Pot. Repeats that are "saved up in" a pot don't take from safe to spend: you fill
   the pot bit by bit, and just before the bill goes out you move that amount to the account it is paid from.
   Money you put into a pot is a move to your own savings (category "Not spending"), money from a pot is a transfer. */
const potOf = b => b.pot && L.byId[b.pot]?.kind === 'faccounts' ? L.byId[b.pot] : null;
// a bill covered by its pot, as long as the pot holds enough (or you never checked its balance)
const potCovers = o => { const p = potOf(o.bill); if (!p) return false; const bal = fBalance(p); return bal == null || bal >= (num(o.amount ?? o.bill.amount) || 0); };
const perMonth = b => { const a = num(b.amount) || 0; return b.cadence === 'Yearly' ? a / 12 : b.cadence === 'Every N months' ? a / (num(b.every) || 1) : b.cadence === 'Weekly' ? a * 52 / 12 / (num(b.every) || 1) : a; };
// every subscription with what it costs a year, and a heads-up before a free trial turns into a payment
function subsPanel() {
  const t = today(), subs = recs('fbills').filter(b => b.type === 'Subscription' && b.active !== false).map(b => ({ b, y: perMonth(b) * 12 })).sort((a, c) => c.y - a.y);
  if (!subs.length) return '';
  const trials = subs.filter(x => x.b.trialEnds && x.b.trialEnds >= t && x.b.trialEnds <= addDays(t, 7));
  return MP('Subscriptions', `${trials.map(x => `<p class="mlookline"><b>Free trial of ${esc(x.b.name)} ends ${esc(relDay(x.b.trialEnds))}.</b> Cancel before then if you don’t want to pay ${eur(num(x.b.amount))}.</p>`).join('')}
    <p class="lbig">${eur(subs.reduce((n, x) => n + x.y, 0))} a year</p><p class="lnone">${plural(subs.length, 'subscription')} · ${eur(subs.reduce((n, x) => n + x.y, 0) / 12)} a month</p>
    <div class="lrows">${subs.map(x => `<button class="lrow lmain" data-act="open" data-id="${x.b.id}"><b>${esc(x.b.name)}</b><span>${eur(num(x.b.amount))} ${esc(fCadence(x.b))} · ${eur(x.y)} a year${x.b.trialEnds && x.b.trialEnds >= t ? ' · trial until ' + esc(shortDate(x.b.trialEnds)) : ''}</span></button>`).join('')}</div>`, mLink('Repeats', 'money/repeats'), 'subs');
}
function potsPanel() {
  const pots = recs('faccounts').filter(a => a.type === 'Pot' && !a.archived); if (!pots.length && !recs('fbills').some(b => b.pot)) return '';
  const t = today(), body = pots.map(p => {
    const bills = recs('fbills').filter(b => b.pot === p.id && b.active !== false), bal = fBalance(p), need = bills.reduce((n, b) => n + perMonth(b), 0);
    const next = bills.map(b => ({ b, d: fNext(b) })).filter(x => x.d).sort((a, c) => a.d.localeCompare(c.d))[0];
    const amt = next ? num(next.b.amount) || 0 : 0, short = bal != null && next ? Math.max(0, amt - bal) : 0, goal = num(p.potGoal);
    const moveOn = next ? (addDays(next.d, -1) < t ? t : addDays(next.d, -1)) : '';
    return `<div class="mpot"><div class="mpoth"><b>${esc(p.name)}</b><span>${bal == null ? 'balance not checked' : eur(bal)}</span></div>
      ${goal ? `<span class="tbar"><i style="width:${Math.min(100, 100 * (bal || 0) / goal)}%"></i></span><span class="lnone">${eur(bal || 0)} of ${eur(goal)}</span>` : ''}
      ${bills.length ? `<p class="lnone">For ${esc(bills.map(b => b.name).join(', '))} · put about <b>${eur(need)}</b> in a month</p>` : '<p class="lnone">No repeats linked yet. Open a repeat and pick this pot under "Saved up in pot".</p>'}
      ${next ? `<p class="dline"><span>Next: ${esc(next.b.name)}, ${esc(relDay(next.d))}</span><b class="${short ? 'mneg' : ''}">${eur(amt)}${short ? ` · ${eur(short)} short` : ''}</b></p>
        <button class="btn small" data-act="potmove" data-id="${p.id}" data-v="${esc(next.b.id)}">Move ${eur(amt)} out on ${esc(shortDate(moveOn))}</button>` : ''}</div>`;
  }).join('');
  return MP('Pots', body + '<p class="lnone">Repeats saved up in a pot don’t take from safe to spend. Put money into a pot with a category that is “Not spending”; moving it back out is a transfer, not income.</p>', mLink('Repeats', 'money/repeats'), 'pots');
}
function moneyToday(host) {
  if (!recs('faccounts').length) { host.innerHTML = `${head('Money')}<div class="panels">${panel('Start here', `${quiet('Import your Budget Planner backup, or add your accounts and check your balances.')}<button class="btn small" data-act="new" data-v="faccounts">Add an account</button>`)}</div>`; return; }
  const st = fState(), t = st.t, s = fset(), hr = new Date().getHours();
  const tx = recs('ftx'), every = tx.filter(fEveryday);
  const payTx = every.filter(x => x.date >= st.start && x.date <= t), spentPay = fSum(payTx), spendPay = spentPay;
  const envelopes = fSum(recs('fcats'), 'budget');
  const nextBill = st.due.find(o => o.date >= t);
  const [whole, cents] = Math.abs(st.perDay).toFixed(2).split('.');
  const chips = recs('fchips');
  /* safe to spend */
  const safe = `<section class="panel msafe" id="m-safe"><div class="msafe-l"><p class="mh">Safe to spend today</p>
      ${masked() ? '<p class="mbig"><small>€</small>•••</p>' : `<p class="mbig ${st.perDay < 0 ? 'neg' : ''}"><small>${st.perDay < 0 ? '−' : ''}€</small>${Number(whole).toLocaleString('en-GB')}<sup>.${cents}</sup></p>`}
      <p class="mmuted">${st.pay ? `${fSigned(st.until)} to last ${plural(st.days, 'day')}, until payday on ${esc(shortDate(st.pay))}` : 'Set your payday under Accounts to see this per day.'}</p>
      <p class="mnote">${st.lastCheck ? `Balance checked ${esc(relDay(st.lastCheck))}, plus what you've logged since.` : 'No balance checked yet.'}${st.overdue.length ? ' Something that was due still needs a tick.' : ''}</p></div>
    <div class="mcalc"><p><span>Money in your accounts</span><b>${fSigned(st.inAcc)}</b></p><p><span>− Bills before payday</span><b>${eur(st.billsBefore)}</b></p><p><span>− Safety buffer</span><b>${eur(st.buf)}</b></p><p class="mtot"><span>= Safe until payday</span><b>${fSigned(st.until)}</b></p></div>
    <div class="mfoot">${nextBill ? `<span>Next bill: <b>${esc(nextBill.bill.name)} ${eur(nextBill.amount)}</b> ${esc(relDay(nextBill.date))}</span>` : '<span></span>'}
      <span class="mbtns"><button class="btn small" data-act="fafford">Can I afford…?</button>${chips.slice(0, 2).map(c => `<button class="btn small primary" data-act="fchip" data-id="${c.id}">+ ${esc(c.name)} ${eur(num(c.amount))}</button>`).join('')}</span></div></section>`;
  /* small wins */
  const loggedToday = tx.some(x => x.date === t) || s.nothingOn === t, checkedRecently = st.lastCheck && diffDays(st.lastCheck, t) <= 3;
  const win = (done, title, sub, btn) => `<div class="mwin ${done ? 'done' : ''}"><span class="mtick" aria-hidden="true">${done ? svg(P.check) : ''}</span><span class="lmain"><b>${esc(title)}</b><span>${esc(sub)}</span></span>${!done && btn ? btn : ''}</div>`;
  const wins = [
    win(checkedRecently, 'Check your balance', st.lastCheck ? `Last checked ${relDay(st.lastCheck)}.` : 'Never checked.', '<button class="btn small" data-act="fcheck">Check</button>'),
    win(!st.overdue.length, 'Tick off bills that went out', st.overdue.length ? `${st.overdue.length} waiting, starting with ${st.overdue[0].bill.name}.` : 'Nothing waiting.', '<button class="btn small" data-act="go" data-v="money/today" data-jump="m-look">Open</button>'),
    win(loggedToday, 'Write down today’s spending', 'Even a coffee keeps the number honest.', '<button class="btn small" data-act="fnothing">Nothing today</button>')
  ];
  const nWin = [checkedRecently, !st.overdue.length, loggedToday].filter(Boolean).length;
  /* coming up and payments */
  const upcoming = fOccs(st.start, addDays(t, 60)).filter(o => !o.paid && !o.skipped).slice(0, 5);
  const wk = weekStart(0), days35 = Array.from({ length: 35 }, (_, i) => addDays(wk, i)), occ35 = fOccs(wk, days35[34]);
  const pays = fPays(days35[0], days35[34]);
  const plan35 = plannedWishes(t, days35[34]);
  const outNext = fSum(occ35.filter(o => !o.paid && !o.skipped && o.date >= t)) + fSum(plan35), inNext = pays.filter(d => d >= t).length * (num(s.payAmount) || 0);
  const chip = (amt, ty, paid) => `<span class="mpay ${paid ? 'paid' : ''}" style="--c:${TYPE_COL[ty] || TYPE_COL.Bill}">${fEur0(amt)}</span>`;
  const cal = `<div class="mcal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<b class="mdow">${d}</b>`).join('')}${days35.map(d => { const os = occ35.filter(o => o.date === d), dd = fromISO(d); const items = [...(pays.includes(d) ? [chip(num(s.payAmount) || 0, 'Pay')] : []), ...os.map(o => chip(o.amount, o.type, o.paid)), ...plan35.filter(p => p.date === d).map(p => chip(p.amount, 'Wish'))]; return `<div class="mday ${d === t ? 'now' : ''} ${d < t ? 'past' : ''}"><span>${dd.getDate() === 1 ? dd.toLocaleDateString('en-GB', { month: 'short' }) + ' 1' : d === t ? shortDate(d) : dd.getDate()}</span>${items.slice(0, 2).join('')}${items.length > 2 ? `<em>+${items.length - 2}</em>` : ''}</div>`; }).join('')}</div>
    <p class="mlegend">${Object.entries(TYPE_COL).map(([k, c]) => `<span><i style="background:${c}"></i>${k}</span>`).join('')}</p>`;
  /* every day this month, or this pay period when you count from paycheck to paycheck */
  const perPay = fMode() === 'pay' && !!st.pay, pLabel = perPay ? 'this pay' : 'this month';
  const m0 = perPay ? st.start : t.slice(0, 8) + '01', mEnd = perPay ? addDays(st.pay, -1) : addDays(addMonths(t.slice(0, 8) + '01', 1), -1), mDays = diffDays(m0, mEnd) + 1;
  const perDayMap = new Map(); for (const x of every) if (x.date >= m0 && x.date <= mEnd) perDayMap.set(x.date, (perDayMap.get(x.date) || 0) + (num(x.amount) || 0));
  const past = Array.from({ length: diffDays(m0, t) + 1 }, (_, i) => addDays(m0, i)), maxDay = Math.max(1, ...past.map(d => perDayMap.get(d) || 0));
  const lvl = v => !v ? 0 : Math.min(4, 1 + Math.floor(3 * v / maxDay));
  const zero = past.filter(d => !(perDayMap.get(d) > 0)).length, monthSpend = past.reduce((n, d) => n + (perDayMap.get(d) || 0), 0);
  const lead = (fromISO(m0).getDay() + 6) % 7;
  const heat = `<div class="mheat">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<b>${d}</b>`).join('')}${'<span></span>'.repeat(lead)}${Array.from({ length: mDays }, (_, i) => { const d = addDays(m0, i), v = perDayMap.get(d) || 0; return `<button class="mh${d > t ? 'f' : lvl(v)} ${d === t ? 'now' : ''}" data-act="go" data-v="money/spending" title="${esc(shortDate(d))}: ${eur(v)}">${fromISO(d).getDate()}</button>`; }).join('')}</div>
    <p class="mlegend2"><span class="mscale">${[0, 1, 2, 3, 4].map(i => `<i class="mh${i}"></i>`).join('')}</span><span>${plural(zero, 'day')} with nothing spent</span></p>`;
  /* where the money went */
  const monthTx = tx.filter(x => x.date >= m0 && x.date <= t), groups = new Map();
  for (const x of monthTx) { const b = x.bill ? L.byId[x.bill.split('@')[0]] : null; const k = x.debt ? 'Debt' : b ? (b.type === 'Subscription' ? 'Subscriptions' : b.type === 'Debt' ? 'Debt' : 'Bills') : (relName(x.category) || 'Other'); groups.set(k, (groups.get(k) || 0) + (num(x.amount) || 0)); }
  const COLS = ['var(--c1)', 'var(--c6)', 'var(--c3)', 'var(--c2)', 'var(--c4)', 'var(--c5)', 'var(--c7)', 'var(--c8)'];
  const parts = [...groups.entries()].sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ k, v, c: COLS[i % COLS.length] })), mTot = fSum(monthTx);
  const went = parts.length ? `<div class="mwent"><div class="mdwrap">${fDonut(parts)}<p><b>${fEur0(mTot)}</b><span>${pLabel}</span></p></div><div class="mleg">${parts.slice(0, 7).map(p => `<p><i style="background:${p.c}"></i><span>${esc(p.k)}</span><b>${Math.round(100 * p.v / (mTot || 1))}%</b></p>`).join('')}</div></div>` : quiet(`Nothing spent ${pLabel} yet.`);
  /* run to payday and last 7 days */
  const runDays = st.pay ? Array.from({ length: diffDays(st.start, st.pay) }, (_, i) => addDays(st.start, i)) : [];
  const run = st.pay ? `<div class="mdots">${runDays.map(d => `<i class="${d < t ? 'past' : d === t ? 'now' : ''}"></i>`).join('')}<i class="pay" title="Payday"></i></div>
    <div class="mpair"><p><span>Left to last</span><b>${fSigned(st.until)}</b></p><p><span>Each day</span><b>${fSigned(st.perDay)}</b></p></div>` : quiet('Set your payday under Accounts.');
  const w0 = addDays(t, -6), w7 = tx.filter(x => x.date >= w0 && x.date <= t);
  const last7 = `<div class="mpair col"><p><span>Spent</span><b>${eur(fSum(w7.filter(fEveryday)))}</b></p><p><span>Bills paid</span><b>${eur(fSum(w7.filter(x => !fEveryday(x) && !fMoved(x))))}</b></p><p><span>Money in</span><b>${eur(fSum(recs('fincome').filter(i => i.date >= w0 && i.date <= t)))}</b></p></div>`;
  /* goals, debt, net worth */
  const owned = [...st.bal.entries()].reduce((n, [id, b]) => n + (L.byId[id]?.type !== 'Card' && b != null ? b : 0), 0);
  const owed = recs('fdebts').reduce((n, d) => n + Math.max(0, fDebtBal(d)), 0);
  const tile = (k, v, h, bar) => `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div><div class="h">${h}</div>${bar != null ? `<span class="lprog mprog"><i style="width:${Math.min(100, bar)}%"></i></span>` : ''}</div>`;
  const goals = recs('fgoals').filter(g => !g.done), gT = fSum(goals, 'target'), gS = fSum(goals, 'saved');
  const tiles = `<div class="tiles" id="m-net">${tile('Goals', goals.length ? eur(gS) : '—', goals.length ? `of ${eur(gT)} across ${plural(goals.length, 'goal')}` : 'Add something to save for.', goals.length && gT ? 100 * gS / gT : null)}${tile('Spent this pay', eur(spentPay), `${envelopes ? `of ${fEur0(envelopes)} in your plan · ` : ''}${st.pay ? plural(st.days, 'day') + ' to payday' : ''}`, envelopes ? 100 * spentPay / envelopes : null)}
    ${tile('Net worth', fSigned(owned - owed), `${eur(owned)} owned, ${eur(owed)} owed`)}${tile('Debt-free', owed > 0.5 ? 'Not yet' : 'Yes', owed > 0.5 ? `${eur(owed)} to go` : 'Nothing owed')}
</div>`;
  /* everyday spending this pay */
  /* spending per category this pay: donut and a table of budget, spent and left (money moved to savings left out) */
  const spendCats = recs('fcats').filter(c => !c.nospend).map(c => ({ c, s: fSum(payTx.filter(x => x.category === c.id)), b: num(c.budget) || 0 })).filter(x => x.s > 0 || x.b > 0).sort((a, b) => b.s - a.s || b.b - a.b);
  const unsorted = fSum(payTx.filter(x => !x.category || !L.byId[x.category]));
  const catBtn = c => `<button data-act="open" data-id="${c.id}">${esc(titleOf(c))}</button>`;
  const bars = spendPay > 0 || spendCats.length ? `<div class="vsplit"><div>${vDonut([...spendCats.map(({ c, s }) => ({ label: titleOf(c), v: s })), ...(unsorted ? [{ label: 'Not sorted', v: unsorted, none: true }] : [])], { unit: 'this pay', empty: 'Nothing spent this pay yet.' })}</div>
    <div>${lTbl(['Category', 'Budget', 'Spent', 'Left'], [...spendCats.map(({ c, s, b }) => [catBtn(c), b ? fEur0(b) : '–', eur(s), b ? `<span class="${s > b ? 'mneg' : ''}">${fSigned(b - s)}</span>` : '–']), ...(unsorted ? [['Not sorted', '–', eur(unsorted), '–']] : [])], ['All', fEur0(fSum(spendCats.map(x => ({ amount: x.b })))), eur(spendPay), (() => { const B = spendCats.reduce((n, x) => n + x.b, 0); return B ? `<span class="${spendPay > B ? 'mneg' : ''}">${fSigned(B - spendPay)}</span>` : '–'; })()])}</div></div>` : quiet('Nothing spent this pay yet.');
  /* month by month: money in against money out, own transfers and moved money left out */
  const mm = lastMonths(12).map(m => ({ ...m, in: 0, out: 0 }));
  for (const x of tx) { if (x.transfer || fMoved(x)) continue; const m = mm.find(y => y.key === (x.date || '').slice(0, 7)); if (m) m.out += num(x.amount) || 0; }
  for (const i of recs('fincome')) { if (i.transfer || i.confirmed === false) continue; const m = mm.find(y => y.key === (i.date || '').slice(0, 7)); if (m) m.in += num(i.amount) || 0; }
  const IO = [{ k: 'in', label: 'Money in', color: 'var(--c2)' }, { k: 'out', label: 'Money out', color: 'var(--c1)' }];
  const yIn = mm.reduce((n, m) => n + m.in, 0), yOut = mm.reduce((n, m) => n + m.out, 0);
  const monthly = mm.some(m => m.in || m.out) ? `${vCols(mm, IO)}<p class="mmuted">12 months: <b>${fEur0(yIn)}</b> in, <b>${fEur0(yOut)}</b> out · <b class="${yIn - yOut < 0 ? 'mneg' : 'mgood'}">${fSigned(yIn - yOut)}</b> left over.</p>
    ${asTable(lTbl(['Month', 'In', 'Out', 'Left'], mm.slice().reverse().map(m => [`${m.label} ${m.title}`, eur(m.in), eur(m.out), `<span class="${m.in - m.out < 0 ? 'mneg' : ''}">${fSigned(m.in - m.out)}</span>`]), ['12 months', eur(yIn), eur(yOut), fSigned(yIn - yOut)]))}` : quiet('Money in and out shows up here month by month.');
  /* biggest spending this pay: the largest purchases and the shops where most goes */
  const big = payTx.filter(x => num(x.amount) > 0).sort((a, b) => num(b.amount) - num(a.amount)).slice(0, 8);
  const shopMap = new Map(); for (const x of payTx) { const k = norm(x.name || ''); if (!k) continue; const g = shopMap.get(k) || { label: x.name, n: 0, v: 0 }; g.n++; g.v += num(x.amount) || 0; shopMap.set(k, g); }
  const shopsTop = [...shopMap.values()].sort((a, b) => b.v - a.v).slice(0, 8);
  const biggest = big.length ? `<div class="vsplit"><div><p class="dsub">Largest purchases</p>${lTbl(['What', 'Date', 'Amount'], big.map(x => [`<button data-act="open" data-id="${x.id}">${esc(x.name || 'Purchase')}</button>${x.category && L.byId[x.category] ? `<br><small class="lnone">${esc(relName(x.category))}</small>` : ''}`, esc(shortDate(x.date)), eur(num(x.amount))]))}</div>
    <div><p class="dsub">Where the most goes</p>${vHBars(shopsTop.map(g => ({ label: g.label, v: g.v, sub: plural(g.n, 'time') })), { color: 'var(--c6)' })}</div></div>` : quiet('Nothing spent this pay yet.');
  const recent = every.filter(x => x.date <= t).sort((a, b) => (b.date + fSeq(b)).localeCompare(a.date + fSeq(a))).slice(0, 2);
  const chipRow = `<div class="mchips">${recent.map(x => `<button class="chip mrecent" data-act="frepeat" data-id="${x.id}">${esc(x.name || 'Again')} ${eur(num(x.amount))}</button>`).join('')}${chips.map(c => `<button class="chip" data-act="fchip" data-id="${c.id}">${esc(titleOf(c))} ${eur(num(c.amount))}</button>`).join('')}</div>`;
  const pts = fProject(st, 30).pts, low = pts.reduce((m, p) => p.v < m.v ? p : m, pts[0]);
  const jump = [['m-safe', 'Safe to spend'], ['m-look', 'Worth a look'], ['m-wins', 'Small wins'], ['m-next', 'Next 30 days'], ['m-pay', 'Payments coming'], ['m-days', fMode() === 'pay' && st.pay ? 'Every day this pay' : 'Every day this month'], ['m-went', 'Where the money went'], ['m-net', 'Goals, debt, net worth'], ['m-cats', 'Per category'], ['m-months', 'Month by month'], ['m-big', 'Biggest spending'], ...(allWishes().length || wishBudget() ? [['m-wish', 'Wishlists']] : []), ...(recs('faccounts').some(x => x.type === 'Pot') ? [['m-pots', 'Pots']] : []), ...(recs('fbills').some(b => b.type === 'Subscription' && b.active !== false) ? [['m-subs', 'Subscriptions']] : [])];
  host.innerHTML = `<div class="viewhead dviewhead"><h1>${esc(window.APP_GREETING?.().hello || (hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'))}</h1><span class="sub">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span><div class="spacer"></div><button class="btn small" data-act="fcheck">Check my money</button><button class="btn small primary" data-act="new" data-v="ftx">+ Add spending</button></div>
  ${fDupNote()}<nav class="mjump" aria-label="On this page">${jump.map(([id, l]) => `<button class="chip" data-jump="${id}">${l}</button>`).join('')}</nav>
  <div class="mtop">${safe}${MP('Small wins', `${wins.join('')}<p class="lnone">${nWin ? `${nWin} down. That counts.` : 'Start with one.'}</p>`, `<span class="lnone">${nWin} of 3</span>`, 'wins')}</div>
  ${MP('Worth a look', st.overdue.length ? `<div class="lrows">${st.overdue.map(o => `<div class="lrow mlook"><span class="lmain"><b>${esc(o.bill.name)} was due ${esc(shortDate(o.date))}</b><span>${esc(o.type)} · ${eur(o.amount)}</span></span><button class="btn small" data-act="fpay" data-v="${o.key}">Mark paid</button><button class="chip link" data-act="fskip" data-v="${o.key}">Skip</button></div>`).join('')}</div>` : quiet('Nothing needs a look.'), `<span class="lnone">${plural(st.overdue.length, 'thing')}</span>`, 'look')}
  <div class="mrow2">${MP('Next 30 days', `${fChart(pts, st.buf, st.pay)}<p class="mmuted">Lowest point about <b>${fEur0(Math.round(low.v))}</b> on ${esc(shortDate(low.d))}${low.v < st.buf ? ` · ${eur(st.buf - low.v)} below your protected ${fEur0(st.buf)}` : ''}${st.pay ? ` · Payday <b>${esc(shortDate(st.pay))}</b>` : ''}</p>`, '', 'next')}
    ${MP('Coming up', upcoming.length ? `<div class="mlist">${upcoming.map(o => `<button class="mup" data-act="open" data-id="${o.bill.id}"><span class="mdate"><b>${fromISO(o.date).getDate()}</b>${esc(fromISO(o.date).toLocaleDateString('en-GB', { month: 'short' }))}</span><span class="lmain"><b>${esc(o.bill.name)}</b><span>${esc(o.type)} · ${o.date < t ? 'overdue' : esc(relDay(o.date))}</span></span><b>${eur(o.amount)}</b></button>`).join('')}</div>` : quiet('No repeats coming up.'), mLink('All repeats', 'money/repeats'))}</div>
  ${MP('Payments coming', cal, `<span class="lnone">${eur(outNext)} going out · <span class="mgood">+${eur(inNext)}</span> coming in · next 5 weeks</span>`, 'pay')}
  <div class="mrow2">${MP(perPay ? 'Every day this pay' : 'Every day this month', heat, `<span class="lnone">${eur(monthSpend / Math.max(1, past.length))} a day so far</span>`, 'days')}${MP('Where the money went', went, mLink('Purchases', 'money/spending'), 'went')}</div>
  <div class="mrow2">${MP('Run to payday', run, `<span class="lnone">${st.pay ? plural(st.days, 'day') + ' left' : ''}</span>`)}${MP('Last 7 days', last7, `<span class="lnone">${esc(shortDate(w0))} – ${esc(shortDate(t))}</span>`)}</div>
  ${tiles}
  ${MP('Spending per category', bars + chipRow, mLink('Open spending', 'money/spending'), 'cats')}
  ${MP('Month by month', monthly, `<span class="lnone">money in and out, own transfers left out</span>`, 'months')}
  ${potsPanel()}
  ${subsPanel()}
  ${wishMoneyPanel()}
  ${MP('Biggest spending', biggest, `<span class="lnone">this pay · ${esc(shortDate(st.start))} – ${esc(shortDate(t))}</span>`, 'big')}
  `;
  if (!host.dataset.mwired) { host.dataset.mwired = '1'; host.addEventListener('click', e => { const j = e.target.closest('[data-jump]'); if (j) { e.preventDefault(); e.stopPropagation(); document.getElementById(j.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, true); }
}

function weekStart(offset) { const d = new Date(); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd + offset * 7); return iso(d); }
function weekFill(fill) {
  const start = weekStart(L.week), days = Array.from({ length: 7 }, (_, i) => addDays(start, i)), t = today();
  const meals = recs('meals');
  fill.innerHTML = `<div class="lweeknav"><button class="iconbtn" data-act="week" data-v="-1" aria-label="Previous week">${svg(P.left)}</button><b>${shortDate(days[0])} to ${shortDate(days[6])}</b><button class="iconbtn" data-act="week" data-v="1" aria-label="Next week">${svg(P.right)}</button>${L.week ? '<button class="chip" data-act="week" data-v="0">This week</button>' : ''}</div>
  <div class="lweek">${days.map(d => `<div class="lday ${d === t ? 'now' : ''}"><div class="ldh"><b>${dayName(d)}</b><span>${shortDate(d)}</span></div>${MEALS.map(s => { const m = meals.filter(x => x.date === d && x.slot === s); return `<div class="lslot"><span class="rowlbl">${s}</span>${m.map(x => `<button class="chip" data-act="open" data-id="${x.id}">${esc(titleOf(x))}</button>`).join('')}${m.length ? '' : `<button class="chip ghost" data-act="slot" data-date="${d}" data-slot="${s}" aria-label="Plan ${s.toLowerCase()} on ${dayName(d)}">+</button>`}</div>`; }).join('')}</div>`).join('')}</div>`;
}
// a month at a glance: what is planned, and the days you don't eat at home (tap a day to mark it)
function monthFill(fill) {
  const t = today(), m0 = addMonths(t.slice(0, 7) + '-01', L.mealMonth || 0), first = fromISO(m0), meals = recs('meals');
  const lead = (first.getDay() + 6) % 7, n = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(''), ...Array.from({ length: n }, (_, i) => addDays(m0, i))];
  const away = meals.filter(x => x.away && x.date?.startsWith(m0.slice(0, 7))).length;
  fill.innerHTML = `<div class="lweeknav"><button class="iconbtn" data-act="mmonth" data-v="-1" aria-label="Previous month">${svg(P.left)}</button><b>${esc(fromISO(m0).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))}</b><button class="iconbtn" data-act="mmonth" data-v="1" aria-label="Next month">${svg(P.right)}</button></div>
  <p class="lnone">Tap a day to mark the meals you eat out. ${away ? plural(away, 'meal') + ' away this month.' : ''}</p>
  <div class="mcal mealcal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<b class="mdow">${d}</b>`).join('')}${cells.map(d => { if (!d) return '<span></span>'; const ms = meals.filter(x => x.date === d).sort((a, b) => MEALS.indexOf(a.slot) - MEALS.indexOf(b.slot));
    return `<button class="mday ${d < t ? 'past' : ''} ${d === t ? 'now' : ''} ${ms.some(x => x.away) ? 'away' : ''}" data-act="mday" data-v="${d}" aria-label="${esc(niceDate(d))}: ${esc(ms.map(x => x.slot + ' ' + titleOf(x)).join(', ') || 'nothing planned')}"><span>${fromISO(d).getDate()}</span>${ms.slice(0, 3).map(x => `<em class="${x.away ? 'aw' : ''}">${esc(x.away ? (x.slot || 'Meal').slice(0, 1) + ' · out' : titleOf(x))}</em>`).join('')}${ms.length > 3 ? `<em>+${ms.length - 3}</em>` : ''}</button>`; }).join('')}</div>`;
}
function mealDay(d) {
  const ms = () => recs('meals').filter(x => x.date === d);
  const sh = C.sheet({ title: `${dayName(d)} ${shortDate(d)}`, body: `<p class="muted" style="margin:0 0 10px">Which meals do you eat away from home?</p><div class="lrows" data-mdl></div>
    <div class="field" style="margin-top:12px"><label for="md-n">Where (optional)</label><input id="md-n" type="text" placeholder="e.g. at mum's, office lunch" value="${esc(ms().find(x => x.away)?.what || '')}"></div>`,
    foot: `<button class="btn" data-mdweek>Open the week</button><div class="spacer"></div><button class="btn primary" data-close>Done</button>` });
  const draw = () => { sh.querySelector('[data-mdl]').innerHTML = MEALS.map(s => { const a = ms().find(x => x.slot === s && x.away), other = ms().filter(x => x.slot === s && !x.away); return `<div class="lrow"><span class="lmain"><b>${s}</b><span>${esc(other.map(titleOf).join(', ') || (a ? 'away' : 'at home'))}</span></span>${tick(a ? 'Away' : 'At home', !!a, `data-mdaway="${s}"`)}</div>`; }).join(''); };
  draw();
  sh.addEventListener('click', async e => {
    const b = e.target.closest('[data-mdaway]'); if (b) { const s = b.dataset.mdaway, a = ms().find(x => x.slot === s && x.away); try { a ? await del(a.id) : await create('meals', { date: d, slot: s, away: true, what: sh.querySelector('#md-n').value.trim() || 'Not at home' }); } catch {} draw(); return; }
    if (e.target.closest('[data-mdweek]')) { L.week = Math.round(diffDays(weekStart(0), d) / 7); uiOf('kitchen/meals').seg = 'week'; C.closeSheet(); C.render(); }
  });
  sh.querySelector('#md-n').addEventListener('change', e => { const v = e.target.value.trim() || 'Not at home'; for (const a of ms().filter(x => x.away)) save(a, { what: v }); });
}
function groceryFill(fill) {
  setTimeout(stapleRestock, 0);
  if (!fill.querySelector('.lqadd')) {
    fill.innerHTML = `<form class="lqadd" data-qadd><input type="text" placeholder="Add something to buy" aria-label="Add to grocery list" autocomplete="off" enterkeyhint="done"><button class="btn primary" type="submit">Add</button></form><div class="lsugs" data-sugs></div><div data-glist></div>`;
    fill.querySelector('input').addEventListener('input', e => sugs(fill, e.target.value));
  }
  const items = recs('ingredients').filter(i => i.list), mkt = MARKET_DAYS.includes(food().shopDay), mktName = recs('shops').find(r => r.type === 'Market')?.name || 'Market';
  const shopOf = i => mkt && isProduce(i) ? mktName : i.shop || 'Anywhere';
  const groups = {};
  for (const i of items) (groups[shopOf(i)] ||= []).push(i);
  // route: the market first on market days, then the shops in the order of the week plan, then the rest
  const order = [...(mkt ? [mktName] : []), ...(curPlan()?.shopping || []).map(x => x.store), ...kitchenStores(), ...Object.keys(groups).sort()].filter((v, k, a) => v && a.indexOf(v) === k && groups[v]);
  if (groups.Anywhere && !order.includes('Anywhere')) order.push('Anywhere');
  const env = groceryEnv();
  const g = fill.querySelector('[data-glist]');
  const buyN = i => (L.buyN ||= {})[i.id] ?? stepOf(i);
  const line = i => `<div class="lrow grow"><button class="lbuy" data-act="buy" data-id="${i.id}" aria-label="Bought ${esc(i.name)}"></button><button class="lmain" data-act="open" data-id="${i.id}"><b>${esc(i.name)}</b>${i.qty || i.category ? `<span>${esc([i.qty, i.category].filter(Boolean).join(' · '))}</span>` : ''}</button><span class="gacts"><span class="stepper buyn" role="group" aria-label="How many you buy"><button type="button" data-act="buyn" data-id="${i.id}" data-v="-1" aria-label="Fewer">−</button><b>${esc(unitShort(buyN(i), unitOf(i)))}</b><button type="button" data-act="buyn" data-id="${i.id}" data-v="1" aria-label="More">+</button></span>${isMeatFish(i) ? `<button class="btn small" data-act="buyfreeze" data-id="${i.id}" title="Bought, straight into the freezer">Freeze</button>` : ''}<button class="iconbtn lx" data-act="unlist" data-id="${i.id}" aria-label="Take ${esc(i.name)} off the list">${svg(P.x)}</button></span></div>`;
  const gv = ingViewOf('grocView', 'shop');
  g.innerHTML = items.length ? ingViewSeg('grocView', gv, [['shop', 'Per winkel'], ['type', 'Per soort']]) + (gv === 'type' ? ingTypeView(items, line, 'grocery') : order.map(c => `<div class="lgh gshop"><h3>${esc(c)} · ${groups[c].length}</h3>${env && c !== 'Anywhere' ? `<button class="chip link" data-act="paid" data-v="${esc(c)}">Paid</button>` : ''}</div><div class="lrows">${groups[c].sort((a, b) => norm(a.category || 'zz').localeCompare(norm(b.category || 'zz')) || norm(a.name).localeCompare(norm(b.name))).map(line).join('')}</div>`).join(''))
    + `<p class="lnone">Tick something off and it moves into your pantry. ${env ? `Tap Paid when you pay at a shop, and it goes into ${esc(env.name)} in Finance.` : ''}</p>`
    : quiet('Your list is empty. Add things above, or use “Add missing to list” on a recipe.');
  sugs(fill, fill.querySelector('.lqadd input').value);
}
function sugs(fill, text) {
  const q = norm(text), h = fill.querySelector('[data-sugs]');
  if (!q) { h.innerHTML = ''; return; }
  const m = recs('ingredients').filter(i => !i.list && norm(i.name).includes(q)).slice(0, 8);
  h.innerHTML = m.map(i => `<button class="chip" data-act="tolist" data-id="${i.id}">+ ${esc(i.name)}</button>`).join('');
}
async function quickAdd(form) {
  const inp = form.querySelector('input'), name = inp.value.trim();
  if (!name) return;
  const hit = recs('ingredients').find(i => norm(i.name) === norm(name));
  inp.value = '';
  if (hit) save(hit, { list: true }); else create('ingredients', { name, list: true, stock: false }).catch(() => {});
}
function openSlot(date, slot) {
  const rs = recs('recipes').sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
  const sh = C.sheet({
    title: `${slot} on ${dayName(date)} ${shortDate(date)}`,
    body: `<label class="search">${svg(P.search)}<input type="search" data-sq placeholder="Find a recipe" aria-label="Find a recipe"></label>
      <div class="lrows lpick" data-sl></div>
      <form class="lqadd" data-free><input type="text" placeholder="Or just type what you'll eat" aria-label="What you'll eat"><button class="btn" type="submit">Add</button></form>`
  });
  const draw = q => { const n = norm(q); sh.querySelector('[data-sl]').innerHTML = rs.filter(r => !n || norm(r.name).includes(n)).slice(0, 40).map(r => `<button class="lrow lmain" data-pick="${r.id}"><b>${esc(r.name)}</b><span>${esc(KINDS.recipes.sub(r))}</span></button>`).join('') || quiet('No recipe with that name.'); };
  draw('');
  sh.querySelector('[data-sq]').addEventListener('input', e => draw(e.target.value));
  sh.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b) { create('meals', { date, slot, recipe: b.dataset.pick }).catch(() => {}); C.closeSheet(); } });
  sh.querySelector('[data-free]').addEventListener('submit', e => { e.preventDefault(); const v = e.target.querySelector('input').value.trim(); if (v) { create('meals', { date, slot, what: v }).catch(() => {}); C.closeSheet(); } });
}
function openRecipe(r) {
  const ings = [].concat(r.ingredients || []).map(id => L.byId[id]).filter(Boolean);
  const missing = ings.filter(i => !i.stock && !i.list), pr = parseRecipe(r), base = Math.max(1, Math.round(num(r.servings) || 2));
  let serv = base;
  const sh = C.sheet({
    title: r.name || 'Recipe', wide: true,
    body: `<div class="lrecipe">${r.photo ? `<img referrerpolicy="no-referrer" class="lrimg" src="${esc(C.photoURL(r.photo))}" alt="" onerror="this.remove()">` : ''}
      <div class="lrbody">
        <p class="lmeta">${esc([r.category, mins(totalTime(r)), r.servings ? plural(r.servings, 'serving') : '', r.protein ? r.protein + ' protein' : ''].filter(Boolean).join(' · '))}${r.rating ? ` <span class="lstars">${stars(r.rating)}</span>` : ''}</p>
        ${r.summary ? `<p class="lrsum">${esc(r.summary)}</p>` : ''}
        ${r.link ? `<a class="btn small" href="${esc(r.link)}" target="_blank" rel="noopener">${svg(P.link)} Open the recipe</a>` : ''}
        ${pr.lines.length ? `<div class="lrhead"><h3>Ingredients</h3><span class="lserv" role="group" aria-label="Servings"><button class="iconbtn small" data-serv="-1" aria-label="Fewer servings">${svg(P.minus)}</button><b data-servn>${plural(base, 'serving')}</b><button class="iconbtn small" data-serv="1" aria-label="More servings">${svg(P.plus)}</button></span></div><ul class="rlines" data-rlines>${linesHTML(pr.lines, 1, pr.secs)}</ul>` : ''}
        ${ings.length ? `<p class="dsub">From your pantry</p><div class="lwrap">${ings.map(i => `<span class="chip ${i.stock ? 'on' : ''}">${i.stock ? '✓ ' : ''}${esc(i.name)}${i.list ? ' (on list)' : ''}</span>`).join('')}</div>` : ''}
        ${pr.steps.length ? `<h3>Method</h3><ol class="rsteps">${pr.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
        ${nutriPanel(r)}
        ${r.notes ? `<h3>Notes</h3><p class="lpre">${esc(r.notes)}</p>` : ''}
      </div></div>`,
    foot: `${missing.length ? `<button class="btn" data-miss>Add ${missing.length} missing to list</button>` : ''}<button class="btn" data-plan>Plan it</button><div class="spacer"></div><button class="btn" data-edit>Edit</button>${pr.steps.length || pr.lines.length ? '<button class="btn primary" data-cook>Start cooking</button>' : ''}`
  });
  sh.querySelector('[data-edit]').onclick = () => openEditor('recipes', r.id);
  sh.querySelectorAll('[data-serv]').forEach(b => b.onclick = () => { serv = Math.max(1, Math.min(40, serv + Number(b.dataset.serv))); sh.querySelector('[data-servn]').textContent = plural(serv, 'serving'); sh.querySelector('[data-rlines]').innerHTML = linesHTML(pr.lines, serv / base, pr.secs); });
  const ck = sh.querySelector('[data-cook]'); if (ck) ck.onclick = () => { C.closeSheet(); cookMode(r, serv / base); };
  sh.querySelector('[data-plan]').onclick = () => planRecipe(r);
  const m = sh.querySelector('[data-miss]');
  if (m) m.onclick = () => { missing.forEach(i => save(i, { list: true })); C.toast(`${plural(missing.length, 'thing')} added to your list`); C.closeSheet(); };
}

/* ---------- recipe text: ingredient lines and steps, portions, cook mode ----------
   Recipes keep "Ingrediënten:" lines and "Bereiding:" steps in their instructions (that is how imports and the
   weekly fill write them). Amounts scale with the number of servings; cook mode shows one step per screen. */
function parseRecipe(r) {
  if (Array.isArray(r.ilines) && r.ilines.length || Array.isArray(r.steps) && r.steps.length) {
    const old = Array.isArray(r.ilines) && r.ilines.length && Array.isArray(r.steps) && r.steps.length ? null : parseText(r), lines = [], secs = [];
    let sec = '';
    if (Array.isArray(r.ilines) && r.ilines.length) for (const x of r.ilines) { if (x.h != null) { sec = String(x.h).trim(); continue; } const l = ilineText(x); if (l) { lines.push(l); secs.push(sec); } }
    else if (old) lines.push(...old.lines);
    const steps = Array.isArray(r.steps) && r.steps.length ? r.steps.map(x => String(x).trim()).filter(Boolean) : old?.steps || [];
    return { lines, steps, secs };
  }
  return parseText(r);
}
function parseText(r) {
  const t = String(r.instructions || '').replace(/\r/g, ''), lines = [], steps = [];
  const parts = t.split(/\n\s*(?=(?:Bereiding|Method|Instructions|Steps|Werkwijze)\s*:)/i);
  let ingPart = '', stepPart = t;
  if (/^\s*(Ingrediënten|Ingredienten|Ingredients)\s*:/i.test(t)) { ingPart = parts[0].replace(/^\s*\S+\s*:\s*/, ''); stepPart = parts.slice(1).join('\n'); }
  for (const l of ingPart.split('\n')) { const v = l.replace(/^\s*[-•*]\s*/, '').trim(); if (v) lines.push(v); }
  for (const l of stepPart.replace(/^\s*(Bereiding|Method|Instructions|Steps|Werkwijze)\s*:\s*/i, '').split('\n')) { const v = l.replace(/^\s*(\d+[.)]|[-•*]|stap \d+:?|step \d+:?)\s*/i, '').trim(); if (v) steps.push(v); }
  return { lines, steps };
}
const FRAC = { '½': .5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': .25, '¾': .75, '⅛': .125 };
const fmtQty = n => { const w = Math.floor(n + 1e-9), f = n - w, fr = [[.25, '¼'], [1 / 3, '⅓'], [.5, '½'], [2 / 3, '⅔'], [.75, '¾']].find(([v]) => Math.abs(f - v) < .04); if (f < .04) return String(w || (n ? '¼' : '0')); if (fr) return (w ? w + ' ' : '') + fr[1]; return String(Math.round(n * 10) / 10).replace('.', ','); };
// scale the amount at the start of an ingredient line ("200 g", "1/2 tbsp", "1½ cups", "2-3 cloves")
function scaleLine(line, f) {
  if (Math.abs(f - 1) < 1e-6) return line;
  const q = String.raw`(\d+\s*/\s*\d+|\d+(?:[.,]\d+)?(?:\s*[½⅓⅔¼¾⅛])?|[½⅓⅔¼¾⅛])`;
  const m = line.match(new RegExp(`^\\s*${q}(?:\\s*[-–]\\s*${q})?`)); if (!m) return line;
  const val = v => { v = v.replace(/\s/g, ''); if (FRAC[v]) return FRAC[v]; const fr = v.match(/^(\d+)\/(\d+)$/); if (fr) return fr[1] / fr[2]; const mx = v.match(/^(\d+(?:[.,]\d+)?)([½⅓⅔¼¾⅛])$/); if (mx) return Number(mx[1].replace(',', '.')) + FRAC[mx[2]]; return Number(v.replace(',', '.')); };
  const a = fmtQty(val(m[1]) * f), b = m[2] ? '–' + fmtQty(val(m[2]) * f) : '';
  return a + b + line.slice(m[0].length);
}
// ingredient lines; with parts (Sauce, Topping) each part gets its own small heading
const linesHTML = (lines, f, secs = []) => lines.map((l, i) => `${secs[i] && secs[i] !== secs[i - 1] ? `<li class="rsec">${esc(secs[i])}</li>` : ''}<li>${esc(scaleLine(l, f))}</li>`).join('');
/* ---------- recipe ingredients with amounts ----------
   Each line: an amount, a unit, the ingredient, a note (chopped, leftover) and the part of the recipe it belongs to.
   A line that names something in your pantry links to it, so "Can make now" and the grocery list keep working. */
const RUNITS = ['', 'g', 'kg', 'ml', 'dl', 'l', 'el', 'tl', 'kopje', 'stuk', 'teentje', 'snufje', 'scheutje', 'handje', 'blik', 'pak', 'zakje', 'bosje', 'plak', 'naar smaak'];
const ilineText = x => { const n = String(x.n || '').trim(); if (!n) return ''; return [String(x.q ?? '').trim(), x.u && x.u !== 'naar smaak' ? x.u : '', n].filter(Boolean).join(' ') + (x.u === 'naar smaak' ? ', naar smaak' : '') + (x.note ? ', ' + String(x.note).trim() : ''); };
// an old text line ("200 g kip, in blokjes") split into its parts
function ilineParse(l) {
  const m = String(l).trim().match(/^((?:\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?(?:\s*[½⅓⅔¼¾⅛])?|[½⅓⅔¼¾⅛])(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?)?\s*(.*)$/), q = (m?.[1] || '').trim();
  let rest = (m?.[2] || '').trim(), u = '';
  const um = rest.match(/^(gram|grams|gr|g|kilo|kg|ml|dl|liter|l|eetlepels?|el|tbsp|theelepels?|tl|tsp|kopjes?|cups?|stuks?|teentjes?|cloves?|snufje|pinch|scheutje|handje|handful|blikken|blik|can|pak|zakjes?|bosjes?|plakjes?|plakken|plak)\.?\s+(.+)$/i);
  if (um) { const w = um[1].toLowerCase(); u = /^(gram|grams|gr|g)$/.test(w) ? 'g' : /^(kilo|kg)$/.test(w) ? 'kg' : /^(liter|l)$/.test(w) ? 'l' : /^(eetlepels?|el|tbsp)$/.test(w) ? 'el' : /^(theelepels?|tl|tsp)$/.test(w) ? 'tl' : /^(kopjes?|cups?)$/.test(w) ? 'kopje' : /^(stuks?)$/.test(w) ? 'stuk' : /^(teentjes?|cloves?)$/.test(w) ? 'teentje' : /^(pinch)$/.test(w) ? 'snufje' : /^(handful)$/.test(w) ? 'handje' : /^(blikken|blik|can)$/.test(w) ? 'blik' : /^zakjes?$/.test(w) ? 'zakje' : /^bosjes?$/.test(w) ? 'bosje' : /^(plakjes?|plakken|plak)$/.test(w) ? 'plak' : w; rest = um[2]; }
  const c = rest.indexOf(','), n = (c > 0 ? rest.slice(0, c) : rest).trim(), note = c > 0 ? rest.slice(c + 1).trim() : '';
  return { q, u, n, note };
}
const pantryHit = n => { const k = deUml(n || ''); if (!k) return null; return recs('ingredients').find(i => deUml(i.name) === k) || recs('ingredients').find(i => k.split(' ').includes(deUml(i.name)) && deUml(i.name).length > 3) || null; };
function ilinesEditor(D) {
  const rows = Array.isArray(D.ilines) ? D.ilines : [];
  return `<div class="ilines">${rows.map((x, i) => x.h != null
    ? `<div class="ilrow ilhead"><input data-il="${i}" data-ik="h" value="${esc(x.h)}" placeholder="Part, like Sauce or Topping" aria-label="Part name"><button type="button" class="iconbtn small" data-ilx="${i}" aria-label="Remove part">${svg(P.x)}</button></div>`
    : `<div class="ilrow"><input class="ilq" data-il="${i}" data-ik="q" value="${esc(x.q ?? '')}" inputmode="decimal" placeholder="200" aria-label="Amount"><select class="ilu" data-il="${i}" data-ik="u" aria-label="Unit">${RUNITS.map(u => `<option value="${u}" ${u === (x.u || '') ? 'selected' : ''}>${u || '–'}</option>`).join('')}</select><input class="iln" data-il="${i}" data-ik="n" value="${esc(x.n || '')}" list="ilnames" placeholder="Ingredient" aria-label="Ingredient"><input class="ilnote" data-il="${i}" data-ik="note" value="${esc(x.note || '')}" placeholder="Note, like chopped" aria-label="Note"><button type="button" class="iconbtn small" data-ilx="${i}" aria-label="Remove ingredient">${svg(P.x)}</button>${x.ing && L.byId[x.ing] ? '<span class="ilpan" title="In your pantry">✓</span>' : ''}</div>`).join('')}</div>
    <datalist id="ilnames">${[...new Set([...recs('ingredients').map(i => i.name), ...recs('recipes').flatMap(r => [].concat(r.ilines || []).map(x => x.n))].filter(Boolean).map(v => String(v).trim()))].sort(azCmp).map(v => `<option value="${esc(v)}">`).join('')}</datalist>
    <div class="dbtns"><button type="button" class="btn small" data-iladd>+ Ingredient</button><button type="button" class="btn small ghost" data-iladdh>+ Part</button></div>`;
}
function stepsEditor(D) {
  const st = Array.isArray(D.steps) ? D.steps : [];
  return `<ol class="stlist">${st.map((x, i) => `<li><textarea data-st="${i}" rows="2" aria-label="Step ${i + 1}">${esc(x)}</textarea><button type="button" class="iconbtn small" data-stx="${i}" aria-label="Remove step ${i + 1}">${svg(P.x)}</button></li>`).join('')}</ol><div class="dbtns"><button type="button" class="btn small" data-stadd>+ Step</button></div>`;
}
/* ---------- nutrition: an estimate from the ingredients ----------
   Per 100 g: kcal, protein, carbs, fat, fibre, sugar, saturated fat, salt. Optional: pc = grams in one piece,
   d = grams per ml (oil, honey), cup = grams in one cup, can = grams in one tin, z = so little it never counts.
   Values are rounded averages from public food tables (NEVO, USDA); good enough to compare recipes, not a label. */
const NUTRI_DB = [
  ['chicken breast|kipfilet|kippenborst|kipborst|chicken fillet', 120, 23, 0, 2.6, 0, 0, .6, .15, { pc: 170 }],
  ['chicken thigh|chicken thighs|kippendij|kippendijen|kipdij|dijfilet', 190, 19, 0, 12.5, 0, 0, 3.5, .2, { pc: 110 }],
  ['chicken|kip|kipstukjes|kippenvlees', 165, 25, 0, 7, 0, 0, 2, .2, { pc: 150 }],
  ['ground beef|minced beef|beef mince|rundergehakt|gehakt|mince', 250, 26, 0, 17, 0, 0, 6.5, .18],
  ['beef|rundvlees|biefstuk|steak|runderreepjes|sukade', 200, 26, 0, 10, 0, 0, 4, .15, { pc: 200 }],
  ['pork|varkensvlees|karbonade|varkenshaas|pork belly|speklappen', 240, 25, 0, 15, 0, 0, 5.5, .15, { pc: 150 }],
  ['bacon|spek|ontbijtspek|spekjes|pancetta', 460, 13, 1, 45, 0, 0, 15, 1.8, { pc: 10 }],
  ['ham|hamreepjes|prosciutto|serranoham', 140, 19, 1, 6, 0, 1, 2, 3, { pc: 15 }],
  ['sausage|sausages|worst|worstjes|chorizo|salami|grillworst|braadworst', 300, 14, 2, 26, 0, 1, 9.5, 2.2, { pc: 70 }],
  ['turkey|kalkoen|kalkoenfilet', 135, 29, 0, 1.5, 0, 0, .5, .15, { pc: 150 }],
  ['lamb|lam|lamsvlees|lamsgehakt', 280, 25, 0, 20, 0, 0, 9, .2],
  ['salmon|zalm|zalmfilet|salmon fillet|salmon fillets', 208, 20, 0, 13, 0, 0, 3, .15, { pc: 125 }],
  ['smoked salmon|gerookte zalm', 180, 22, 0, 10, 0, 0, 2, 3, { pc: 20 }],
  ['tuna|tonijn', 116, 26, 0, 1, 0, 0, .3, .9, { can: 145 }],
  ['cod|kabeljauw|witvis|white fish|pollock|koolvis|tilapia|pangasius|schelvis', 82, 18, 0, .7, 0, 0, .1, .2, { pc: 125 }],
  ['shrimp|shrimps|prawn|prawns|garnalen|garnaal|scampi', 99, 24, .2, .3, 0, 0, .1, .6, { pc: 12 }],
  ['eggs|egg|ei|eieren|eidooier|egg yolk', 143, 12.6, .7, 9.5, 0, .4, 3.1, .36, { pc: 50 }],
  ['egg white|eiwit|eiwitten', 52, 11, .7, .2, 0, .7, 0, .4, { pc: 33 }],
  ['tofu', 80, 8, 1.9, 4.8, .3, .5, .7, .02, { pc: 200 }],
  ['tempeh', 190, 19, 9, 11, 5, 0, 2.2, .02],
  ['milk|melk|halfvolle melk|volle melk|oat milk|havermelk|soy milk|sojamelk|almond milk|amandelmelk', 50, 3.4, 4.8, 2, 0, 4.8, 1.2, .1, { d: 1.03, cup: 245 }],
  ['butter|boter|roomboter|salted butter|unsalted butter', 717, .9, .1, 81, 0, .1, 51, .6, { el: 14 }],
  ['cream|room|slagroom|heavy cream|whipping cream|kookroom|double cream', 340, 2.1, 2.8, 36, 0, 2.8, 23, .08, { d: 1 }],
  ['sour cream|zure room|creme fraiche|crème fraîche', 290, 2.4, 3, 30, 0, 3, 20, .1],
  ['greek yogurt|griekse yoghurt|turkse yoghurt', 97, 9, 4, 5, 0, 4, 3.3, .1],
  ['yogurt|yoghurt|plain yogurt|magere yoghurt', 60, 4, 4.5, 3, 0, 4.5, 2, .1],
  ['kwark|quark|skyr|cottage cheese|huttenkase|hüttenkäse', 70, 11, 4, 1, 0, 4, .6, .1],
  ['cheese|kaas|cheddar|gouda|geraspte kaas|grated cheese|emmentaler|gruyere', 380, 25, 1, 31, 0, .5, 20, 1.8, { pc: 20 }],
  ['parmesan|parmezaan|parmigiano|pecorino|grana padano', 431, 38, 4, 29, 0, .9, 19, 1.6],
  ['mozzarella|burrata', 254, 18, 2, 19, 0, 1, 12, .6, { pc: 125 }],
  ['feta|geitenkaas|goat cheese|halloumi', 265, 15, 2, 22, 0, 2, 15, 2.6],
  ['cream cheese|roomkaas|philadelphia|mascarpone|ricotta', 340, 6, 4, 34, 0, 3, 20, .8],
  ['coconut milk|kokosmelk|coconut cream|kokosroom', 197, 2, 3, 21, 0, 2, 18, .03, { can: 400, d: 1 }],
  ['cooked rice|gekookte rijst|leftover rice|steamed rice|cooked brown rice|cooked white rice', 130, 2.7, 28, .3, .4, 0, .1, 0, { cup: 160 }],
  ['rice|rijst|basmati|jasmine rice|jasmijnrijst|brown rice|zilvervliesrijst|risotto rice|risottorijst|sushi rice|sushirijst|arborio', 360, 7, 79, .6, 1.3, .1, .2, 0, { cup: 185 }],
  ['cooked pasta|gekookte pasta', 158, 5.8, 31, .9, 1.8, .6, .2, 0, { cup: 140 }],
  ['cooked lentils|gekookte linzen|cooked quinoa|gekookte quinoa|cooked couscous', 120, 7, 21, .6, 5, 1, .1, 0, { cup: 190 }],
  ['vegetables|groenten|mixed vegetables|frozen vegetables|roerbakgroente|wokgroente|diepvriesgroente|soepgroente|stir fry vegetables', 50, 2.5, 8, .4, 3, 3, 0, .05, { cup: 135 }],
  ['pasta|spaghetti|penne|macaroni|tagliatelle|fusilli|linguine|orzo|lasagne|rigatoni|farfalle|tortellini', 355, 12.5, 71, 1.5, 3, 3, .3, 0, { cup: 100 }],
  ['noodles|noedels|ramen|rice noodles|rijstnoedels|mie|udon|soba|glass noodles', 360, 8, 78, 1, 2, 1, .2, .3],
  ['bread|brood|toast|boterham|sourdough|zuurdesem|baguette|stokbrood|ciabatta|bun|buns|broodje|bolletje', 250, 9, 46, 3, 4, 4, .6, 1.1, { pc: 35 }],
  ['wrap|wraps|tortilla|tortillas|pita|naan|flatbread', 300, 8, 50, 7, 3, 3, 2, 1.2, { pc: 60 }],
  ['flour|bloem|meel|tarwebloem|all-purpose flour|zelfrijzend bakmeel|volkorenmeel', 364, 10, 76, 1, 2.7, .3, .2, 0, { cup: 125, el: 8 }],
  ['oats|havermout|haver|rolled oats|oatmeal|havervlokken', 379, 13, 68, 6.5, 10, 1, 1.1, 0, { cup: 80, el: 6 }],
  ['couscous|bulgur', 360, 12, 74, 1, 5, 0, .2, 0, { cup: 175 }],
  ['quinoa', 368, 14, 64, 6, 7, 0, .7, 0, { cup: 170 }],
  ['potato|potatoes|aardappel|aardappelen|krieltjes|kriel', 77, 2, 17, .1, 2.2, .8, 0, 0, { pc: 150 }],
  ['sweet potato|sweet potatoes|zoete aardappel|zoete aardappelen|bataat', 86, 1.6, 20, .1, 3, 4.2, 0, .1, { pc: 200 }],
  ['fries|friet|patat', 280, 3.4, 36, 14, 3.5, .3, 2.3, .5],
  ['breadcrumbs|paneermeel|panko', 395, 13, 72, 5, 4, 6, 1, 1.2, { cup: 110, el: 7 }],
  ['cornstarch|corn starch|maizena|maïzena|cornflour|aardappelzetmeel', 381, .3, 91, .1, .9, 0, 0, 0, { el: 8 }],
  ['sugar|suiker|brown sugar|bruine suiker|basterdsuiker|poedersuiker|icing sugar|rietsuiker|caster sugar', 400, 0, 100, 0, 0, 100, 0, 0, { cup: 200, el: 12 }],
  ['honey|honing', 304, .3, 82, 0, .2, 82, 0, 0, { d: 1.42 }],
  ['maple syrup|ahornsiroop|agave|agavesiroop|syrup|stroop|golden syrup', 260, 0, 67, .1, 0, 60, 0, 0, { d: 1.33 }],
  ['jam|confiture', 250, .4, 60, .1, 1, 49, 0, 0, { el: 20 }],
  ['chocolate|chocolade|pure chocolade|dark chocolate|chocolate chips|chocoladestukjes', 546, 5, 60, 31, 7, 48, 19, .05],
  ['cocoa|cacao|cacaopoeder|cocoa powder', 228, 20, 58, 14, 37, 1.8, 8, .05, { el: 6 }],
  ['protein powder|eiwitpoeder|whey', 380, 78, 8, 5, 0, 5, 2, .6, { pc: 30 }],
  ['chickpeas|kikkererwten|garbanzo', 120, 7, 14, 2.6, 6, .5, .3, .6, { can: 240, cup: 165 }],
  ['lentils|linzen|red lentils|rode linzen', 352, 25, 60, 1, 11, 2, .2, 0, { cup: 190 }],
  ['beans|bonen|kidney beans|kidneybonen|black beans|zwarte bonen|white beans|witte bonen|cannellini|borlotti|bruine bonen', 100, 7, 14, .5, 6, .5, .1, .5, { can: 240, cup: 175 }],
  ['edamame|sojabonen', 121, 12, 9, 5, 5, 2, .6, 0],
  ['peanut butter|pindakaas|almond butter|amandelpasta', 590, 25, 20, 50, 6, 6, 10, .8, { el: 16 }],
  ['peanuts|pinda|pindas|pinda’s|pinda\'s|peanut', 567, 26, 16, 49, 8.5, 4, 7, 0, { cup: 145, el: 9 }],
  ['almonds|amandelen|amandel', 579, 21, 22, 50, 12, 4, 4, 0, { cup: 140, el: 9 }],
  ['nuts|noten|walnuts|walnoten|cashews|cashewnoten|pecans|pecannoten|hazelnuts|hazelnoten|pistachios|pistache|pine nuts|pijnboompitten', 620, 17, 18, 57, 7, 4, 7, 0, { cup: 120, el: 9 }],
  ['sesame seeds|sesamzaad|sesame|sesamzaadjes', 573, 18, 23, 50, 12, .3, 7, 0, { el: 9 }],
  ['chia|chiazaad|chia seeds|lijnzaad|flaxseed|hennepzaad|zonnebloempitten|pompoenpitten|seeds|pitten', 520, 20, 30, 38, 25, 1, 3.5, 0, { el: 10 }],
  ['tahini|tahin', 595, 17, 21, 54, 9, .5, 7.5, .1, { el: 15 }],
  ['hummus|houmous', 166, 8, 14, 10, 6, .3, 1.4, 1],
  ['onion|onions|ui|uien|sjalot|sjalotten|shallot|shallots|red onion|rode ui|witte ui|pickled onion|pickled red onions|zilveruitjes', 40, 1.1, 9, .1, 1.7, 4.2, 0, 0, { pc: 110 }],
  ['spring onion|spring onions|scallion|scallions|green onion|green onions|lente-ui|lenteui|bosui|bosuitjes', 32, 1.8, 7, .2, 2.6, 2.3, 0, 0, { pc: 15 }],
  ['garlic|knoflook|knoflookteen|garlic cloves|garlic clove|knoflookteentjes', 149, 6.4, 33, .5, 2.1, 1, .1, 0, { pc: 5 }],
  ['ginger|gember|verse gember', 80, 1.8, 18, .8, 2, 1.7, .2, 0, { pc: 15 }],
  ['tomato|tomatoes|tomaat|tomaten|cherry tomatoes|cherrytomaatjes|cherrytomaten|trostomaten', 18, .9, 3.9, .2, 1.2, 2.6, 0, 0, { pc: 120 }],
  ['canned tomatoes|chopped tomatoes|diced tomatoes|tomatenblokjes|gepelde tomaten|passata|tomato sauce|tomatensaus|crushed tomatoes', 32, 1.4, 5.5, .2, 1.5, 4, 0, .1, { can: 400, d: 1 }],
  ['tomato paste|tomatenpuree|tomato puree', 82, 4.3, 19, .5, 4, 12, .1, .1, { el: 16 }],
  ['bell pepper|bell peppers|paprika|paprika’s|paprikas|red pepper|green pepper|yellow pepper|puntpaprika', 31, 1, 6, .3, 2, 4.2, 0, 0, { pc: 150 }],
  ['chili|chilli|chili pepper|chilipeper|rode peper|jalapeno|jalapeño|madame jeanette|spaanse peper|bird’s eye|thai chili', 40, 1.9, 9, .4, 1.5, 5, 0, 0, { pc: 15 }],
  ['carrot|carrots|wortel|wortels|winterpeen|worteltjes', 41, .9, 10, .2, 2.8, 4.7, 0, .1, { pc: 70 }],
  ['broccoli|broccolini', 34, 2.8, 7, .4, 2.6, 1.7, 0, 0, { pc: 350 }],
  ['cauliflower|bloemkool', 25, 1.9, 5, .3, 2, 1.9, 0, 0, { pc: 600 }],
  ['spinach|spinazie|baby spinach|babyspinazie|kale|boerenkool|snijbiet|paksoi|pak choi|bok choy', 23, 2.9, 3.6, .4, 2.2, .4, 0, .2, { cup: 30 }],
  ['lettuce|sla|rucola|arugula|salad|ijsbergsla|romaine|veldsla|little gem|mesclun|salademix', 15, 1.4, 2.9, .2, 1.3, 1, 0, 0, { cup: 40 }],
  ['cucumber|komkommer', 15, .7, 3.6, .1, .5, 1.7, 0, 0, { pc: 300 }],
  ['zucchini|courgette|courgettes', 17, 1.2, 3.1, .3, 1, 2.5, 0, 0, { pc: 200 }],
  ['eggplant|aubergine|aubergines', 25, 1, 6, .2, 3, 3.5, 0, 0, { pc: 250 }],
  ['mushroom|mushrooms|champignons|champignon|paddenstoelen|shiitake|kastanjechampignons|oesterzwammen', 22, 3.1, 3.3, .3, 1, 2, 0, 0, { pc: 15 }],
  ['peas|doperwten|erwten|erwtjes|sugar snaps|peultjes|snow peas', 81, 5.4, 14, .4, 5, 5.7, 0, 0, { cup: 145 }],
  ['corn|mais|maïs|sweetcorn|corn kernels', 86, 3.3, 19, 1.4, 2, 6, .2, 0, { can: 285, cup: 165 }],
  ['green beans|sperziebonen|haricots verts|snijbonen', 31, 1.8, 7, .2, 2.7, 3.3, 0, 0],
  ['cabbage|kool|spitskool|rode kool|witte kool|savooiekool|chinese kool|sauerkraut|zuurkool|spruitjes|brussels sprouts', 25, 1.3, 5.8, .1, 2.5, 3.2, 0, 0, { pc: 800 }],
  ['leek|leeks|prei', 61, 1.5, 14, .3, 1.8, 3.9, 0, 0, { pc: 200 }],
  ['celery|selderij|bleekselderij|knolselderij|venkel|fennel', 16, .7, 3, .2, 1.6, 1.3, 0, .2, { pc: 40 }],
  ['avocado|avocados|avocado’s', 160, 2, 8.5, 14.7, 6.7, .7, 2.1, 0, { pc: 150 }],
  ['pumpkin|pompoen|butternut|squash|flespompoen', 26, 1, 6.5, .1, .5, 2.8, 0, 0, { pc: 1000 }],
  ['beetroot|beet|bieten|rode biet|rode bieten', 43, 1.6, 10, .2, 2.8, 7, 0, .2, { pc: 100 }],
  ['asparagus|asperges|asperge', 20, 2.2, 3.9, .1, 2.1, 1.9, 0, 0, { pc: 20 }],
  ['cilantro|coriander|koriander|basil|basilicum|parsley|peterselie|dill|dille|mint|munt|bieslook|chives|thyme|tijm|rosemary|rozemarijn|oregano|herbs|kruiden|verse kruiden|salie|sage|dragon|tarragon|laurel|bay leaf|bay leaves|laurierblad', 30, 3, 5, .6, 3, .8, 0, 0, { pc: 1, z: 1 }],
  ['seaweed|wakame|nori|zeewier|kombu', 45, 3, 9, .6, .5, .6, 0, 8, { z: 1 }],
  ['lemon|lemons|citroen|citroenen|lemon juice|citroensap', 29, 1.1, 9, .3, 2.8, 2.5, 0, 0, { pc: 100 }],
  ['lime|limes|limoen|limoenen|lime juice|limoensap', 30, .7, 10.5, .2, 2.8, 1.7, 0, 0, { pc: 65 }],
  ['banana|bananas|banaan|bananen', 89, 1.1, 23, .3, 2.6, 12, .1, 0, { pc: 120 }],
  ['apple|apples|appel|appels', 52, .3, 14, .2, 2.4, 10, 0, 0, { pc: 180 }],
  ['berries|bessen|blueberries|blauwe bessen|strawberries|aardbeien|frambozen|raspberries|bramen|blackberries|rode vruchten|frozen fruit|diepvriesfruit', 45, .8, 10, .3, 3, 7, 0, 0, { cup: 145 }],
  ['orange|oranges|sinaasappel|sinaasappels|mandarijn|mandarin|clementine', 47, .9, 12, .1, 2.4, 9, 0, 0, { pc: 150 }],
  ['mango|mangos|mango’s', 60, .8, 15, .4, 1.6, 14, .1, 0, { pc: 300 }],
  ['pineapple|ananas', 50, .5, 13, .1, 1.4, 10, 0, 0, { pc: 900 }],
  ['dates|dadels|medjool', 282, 2.5, 75, .4, 8, 63, 0, 0, { pc: 8 }],
  ['raisins|rozijnen|krenten|cranberries|gedroogde abrikozen|dried fruit|gedroogd fruit', 299, 3, 79, .5, 3.7, 59, 0, 0, { el: 10 }],
  ['olive oil|olijfolie|oil|olie|vegetable oil|sesame oil|sesamolie|zonnebloemolie|sunflower oil|rapeseed oil|raapzaadolie|coconut oil|kokosolie|arachideolie|frituurolie|neutral oil|canola oil', 884, 0, 0, 100, 0, 0, 14, 0, { d: .92 }],
  ['mayonnaise|mayo|kewpie', 680, 1, 1, 75, 0, 1, 6, 1.5, { el: 15 }],
  ['soy sauce|sojasaus|shoyu|tamari|soja saus', 53, 8, 4.9, .6, .8, .4, .1, 14.5, { d: 1.1 }],
  ['ketjap|kecap manis|ketjap manis|sweet soy sauce', 270, 3, 63, 0, 0, 55, 0, 8, { d: 1.3 }],
  ['fish sauce|vissaus', 35, 5, 3.6, 0, 0, 3.6, 0, 23, { d: 1.2 }],
  ['oyster sauce|oestersaus|hoisin|hoisinsaus|teriyaki|teriyakisaus|bbq sauce|barbecuesaus', 150, 2, 33, .3, .5, 25, 0, 5, { d: 1.2 }],
  ['vinegar|azijn|rice vinegar|rijstazijn|balsamico|balsamic|white wine vinegar|wittewijnazijn|appelazijn|apple cider vinegar', 20, 0, .5, 0, 0, .4, 0, 0, { d: 1 }],
  ['miso|miso paste|red miso paste|white miso|misopasta', 199, 12, 26, 6, 5.4, 6, 1, 12.5, { el: 17 }],
  ['stock cube|bouillon cube|bouillonblokje|bouillonblokjes|bouillonpoeder|stock powder|dashi soup base|dashi powder|hondashi', 250, 8, 15, 17, 0, 3, 8, 55, { pc: 10, el: 8 }],
  ['stock|broth|bouillon|dashi|fond|chicken stock|kippenbouillon|groentebouillon|vegetable stock|pho broth', 5, .5, .4, .2, 0, .2, .1, .8, { d: 1 }],
  ['ketchup', 112, 1.2, 26, .1, .3, 22, 0, 1.8, { el: 17 }],
  ['mustard|mosterd|dijon', 66, 4, 6, 4, 4, 3, .2, 5.5, { el: 15 }],
  ['pesto', 450, 5, 6, 45, 1.5, 1, 7, 2.5, { el: 15 }],
  ['sriracha|chili sauce|chilisaus|sambal|sambal oelek|gochujang|hot sauce|harissa|chilipasta', 90, 1.5, 18, 1, 2, 14, .1, 5, { el: 16 }],
  ['curry paste|currypasta|rode curry|red curry paste|green curry paste|groene currypasta', 120, 2, 12, 7, 4, 5, 1, 8, { el: 16 }],
  ['salt|zout|sea salt|zeezout|sea salt flakes|flaky salt|kosher salt', 0, 0, 0, 0, 0, 0, 0, 100, { el: 18, tl: 6, z: 1 }],
  ['pepper|black pepper|zwarte peper|peper|witte peper|white pepper|paprika powder|paprikapoeder|smoked paprika|gerookte paprika|cumin|komijn|kurkuma|turmeric|kaneel|cinnamon|kerrie|curry powder|kerriepoeder|chilipoeder|chili flakes|chilivlokken|garam masala|spices|specerijen|nootmuskaat|nutmeg|kruidnagel|cloves|gemberpoeder|knoflookpoeder|garlic powder|onion powder|uienpoeder|ras el hanout|five spice|vijfkruidenpoeder|kardemom|cardamom|steranijs|star anise|italiaanse kruiden|italian seasoning|dried oregano|gedroogde oregano|cayenne|cayennepeper', 300, 10, 60, 5, 30, 1, 1, .1, { tl: 2.5, el: 7, z: 1 }],
  ['water|ice|ijs|ijsblokjes|kokend water|boiling water|warm water', 0, 0, 0, 0, 0, 0, 0, 0, { d: 1, z: 1 }],
  ['wine|wijn|white wine|witte wijn|red wine|rode wijn|mirin|sake|shaoxing', 85, 0, 2.6, 0, 0, 1, 0, 0, { d: 1 }],
  ['beer|bier', 43, .5, 3.6, 0, 0, 0, 0, 0, { d: 1 }],
  ['baking powder|bakpoeder|baking soda|baking soda|zuiveringszout', 53, 0, 28, 0, 0, 0, 0, 26, { tl: 4, z: 1 }],
  ['yeast|gist|droge gist', 325, 40, 41, 7.6, 27, 0, 1, .1, { tl: 3, z: 1 }],
  ['vanilla|vanille|vanilla extract|vanille-extract|vanillesuiker', 288, 0, 13, 0, 0, 13, 0, 0, { tl: 4, z: 1 }],
  ['gelatin|gelatine|agar', 335, 85, 0, 0, 0, 0, 0, .5, { z: 1 }],
  ['juice|sap|orange juice|sinaasappelsap|appelsap|apple juice', 45, .7, 10, .2, .2, 9, 0, 0, { d: 1.04 }],
  ['olives|olijven|kappertjes|capers', 145, 1, 4, 15, 3.3, 0, 2, 3.8, { pc: 4 }],
  ['tortilla chips|chips|nachos', 500, 7, 63, 24, 5, 1, 3, 1.3],
];
const NUTRI_RI = { kcal: 2000, p: 50, c: 260, f: 70, fib: 30, sug: 90, sat: 20, salt: 6 };
const NUTRI_IDX = (() => { const out = []; NUTRI_DB.forEach((e, i) => e[0].split('|').forEach(k => out.push([deUml(k), i]))); return out.sort((a, b) => b[0].length - a[0].length); })();
// the table row for an ingredient name: the longest name that fits wins ("peanut butter" over "butter")
const COOKED = /\b(cooked|leftover|left over|day-old|day old|cold|gekookt|gekookte|restje|overgebleven)\b/;
function nutriFind(name) {
  const n = ' ' + deUml(name).replace(/[^a-z0-9’' -]/g, ' ').replace(/\s+/g, ' ') + ' ';
  for (const [k, i] of NUTRI_IDX) {
    if (!(k.length <= 3 ? n.includes(' ' + k + ' ') : n.includes(k))) continue;
    const e = NUTRI_DB[i];
    // leftover or cooked rice, pasta and grains weigh far less per calorie than dry ones
    if (COOKED.test(n)) { const c = e[0].startsWith('rice|') ? 'cooked rice' : e[0].startsWith('pasta|') ? 'cooked pasta' : /^(lentils|quinoa|couscous)/.test(e[0]) ? 'cooked lentils' : ''; if (c) return NUTRI_DB.find(x => x[0].split('|').includes(c)); }
    return e;
  }
  return null;
}
const qtyNum = q => { const s = String(q ?? '').trim().replace(',', '.'); if (!s) return null; const r = s.match(/^([\d.]+)\s*[-–]\s*([\d.]+)$/); if (r) return (Number(r[1]) + Number(r[2])) / 2; const fr = s.match(/^(\d+)\s*\/\s*(\d+)$/); if (fr) return fr[1] / fr[2]; const mx = s.match(/^(\d+(?:\.\d+)?)?\s*([½⅓⅔¼¾⅛])$/); if (mx) return Number(mx[1] || 0) + FRAC[mx[2]]; const v = Number(s); return Number.isFinite(v) ? v : null; };
// grams of one ingredient line, or null when the amount can't be told
function nutriGrams(x, e) {
  const o = e[9] || {}, d = o.d || 1, q = qtyNum(x.q), u = String(x.u || '').toLowerCase();
  if (u === 'snufje' || u === 'naar smaak') return u === 'snufje' ? .4 : 0;
  if (q == null) return null;
  const per = { g: 1, kg: 1000, ml: d, dl: 100 * d, l: 1000 * d, el: o.el || 15 * d, tl: o.tl || 5 * d, kopje: o.cup || 240 * d, teentje: o.pc && o.pc < 10 ? o.pc : 5, scheutje: 10 * d, handje: 30, blik: o.can || 400, pak: 500, zakje: 100, bosje: 25, plak: o.pc && o.pc <= 40 ? o.pc : 20 }[u];
  if (per != null) return q * per;
  if (!u || u === 'stuk') return o.pc ? q * o.pc : null;
  return null;
}
/* the estimate for a recipe, per serving: what it adds up to, and which lines it could not count */
function nutriOf(r) {
  const lines = Array.isArray(r.ilines) && r.ilines.length ? r.ilines.filter(x => x.h == null && String(x.n || '').trim()) : parseText(r).lines.map(ilineParse).filter(x => x.n);
  const sum = { kcal: 0, p: 0, c: 0, f: 0, fib: 0, sug: 0, sat: 0, salt: 0 }, skipped = [];
  let counted = 0;
  for (const x of lines) {
    const e = nutriFind(x.n); if (!e) { skipped.push(x.n); continue; }
    const g = nutriGrams(x, e); if (g == null) { if (!(e[9] || {}).z) skipped.push(x.n); continue; }
    const k = g / 100; counted++;
    sum.kcal += e[1] * k; sum.p += e[2] * k; sum.c += e[3] * k; sum.f += e[4] * k; sum.fib += e[5] * k; sum.sug += e[6] * k; sum.sat += e[7] * k; sum.salt += e[8] * k;
  }
  const sv = Math.max(1, num(r.servings) || 1), per = Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, v / sv]));
  // your own numbers win over the estimate
  const own = ['nkcal', 'nprot', 'ncarb', 'nfat'].some(k => num(r[k]) != null);
  if (own) { if (num(r.nkcal) != null) per.kcal = num(r.nkcal); if (num(r.nprot) != null) per.p = num(r.nprot); if (num(r.ncarb) != null) per.c = num(r.ncarb); if (num(r.nfat) != null) per.f = num(r.nfat); }
  return { per, skipped: [...new Set(skipped)], counted, total: lines.length, own };
}
// a ring of arcs: each part a share of the circle, with a small gap between parts
function nutriRing(parts, size, stroke, inner = '') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, tot = parts.reduce((n, p) => n + p.v, 0) || 1, gap = parts.filter(p => p.v > 0).length > 1 ? Math.min(6, c * .02) : 0;
  let off = 0;
  const arcs = parts.map(p => { const len = Math.max(0, c * p.v / tot - gap); const s = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${p.col}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`; off += c * p.v / tot; return p.v > 0 ? s : ''; }).join('');
  return `<svg class="nring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--none)" stroke-width="${stroke}"/>${arcs}${inner}</svg>`;
}
// how full a goal is: one arc from the top
function nutriMeter(pct, col, size = 44, stroke = 5) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, len = c * Math.min(1, pct / 100);
  return `<svg class="nmeter" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--none)" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${len} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}
const NUTRI_FLAME = '<path d="M12 3c.6 3-1.8 4.6-3.2 6.6C7.6 11.3 7 12.8 7 14.5A5 5 0 0 0 17 14.5c0-2.2-1-4-2.4-5.3.1 1.4-.4 2.6-1.4 3.2.3-3.3-.4-6.6-1.2-9.4Z" fill="currentColor"/>';
function nutriPanel(r) {
  const n = nutriOf(r), v = n.per;
  if (!n.own && (!n.counted || v.kcal < 1)) return n.total ? `<section class="nutri"><div class="nhead"><h3>Nutrition</h3></div><p class="lnone">Add amounts to the ingredients (Edit) and the app estimates calories, protein, carbs and fat.</p></section>` : '';
  const cols = { p: 'var(--c1)', c: 'var(--c3)', f: 'var(--c5)' }, pc = (x, ri) => Math.round(100 * x / ri);
  const g = x => x >= 10 ? Math.round(x) : Math.round(x * 10) / 10;
  const tile = (k, label, ri) => `<div class="ntile">${nutriMeter(pc(v[k], ri), cols[k])}<b>${g(v[k])} g</b><span>${label}</span><i style="color:${cols[k]}">${pc(v[k], ri)}%</i></div>`;
  const bar = (k, label, ri) => { const p = pc(v[k], ri), col = p >= 50 ? 'var(--danger)' : 'var(--c3)'; return `<div class="nbar"><div class="nbl"><span>${label}</span><b>${g(v[k])} g</b><i style="color:${p >= 50 ? 'var(--danger)' : 'inherit'}">${p}%</i></div><div class="nbt"><i style="width:${Math.min(100, p)}%;background:${col}"></i></div></div>`; };
  return `<section class="nutri">
    <div class="nhead"><h3>Nutrition</h3><span class="nbadge">${n.own ? 'Your values' : 'Estimated'}</span><span class="lnone">Per serving</span></div>
    <div class="ncal"><div><p class="nkcal"><b>${Math.round(v.kcal)}</b><span>/${NUTRI_RI.kcal}</span></p><span class="lnone">Calories</span></div>${nutriRing([{ v: v.p * 4, col: cols.p }, { v: v.c * 4, col: cols.c }, { v: v.f * 9, col: cols.f }], 96, 9, `<g transform="translate(36 36)" class="nflame"><svg width="24" height="24" viewBox="0 0 24 24">${NUTRI_FLAME}</svg></g>`)}</div>
    <div class="ntiles">${tile('p', 'Protein', NUTRI_RI.p)}${tile('c', 'Carbs', NUTRI_RI.c)}${tile('f', 'Fat', NUTRI_RI.f)}</div>
    ${n.own && !n.counted ? '' : `<div class="nbars">${bar('fib', 'Fibre', NUTRI_RI.fib)}${bar('sug', 'Sugar', NUTRI_RI.sug)}${bar('sat', 'Saturated fat', NUTRI_RI.sat)}${bar('salt', 'Salt', NUTRI_RI.salt)}</div>`}
    <p class="lnone nfoot">% of an adult's reference intake (2000 kcal). ${n.own ? 'From the values you entered.' : `A rough estimate from ${plural(n.counted, 'ingredient')} with an amount.`}${n.skipped.length && !n.own ? ` Not counted: ${esc(n.skipped.slice(0, 8).join(', '))}${n.skipped.length > 8 ? ` and ${n.skipped.length - 8} more` : ''}.` : ''}</p>
  </section>`;
}
// an older recipe keeps its lines and steps as text; the editor turns them into rows once, so you can change amounts
function recipeToRows(D) {
  if ((!Array.isArray(D.ilines) || !D.ilines.length) && D.instructions) { const pr = parseText(D); if (pr.lines.length) D.ilines = pr.lines.map(ilineParse); if ((!Array.isArray(D.steps) || !D.steps.length) && pr.steps.length) D.steps = pr.steps; }
  else if ((!Array.isArray(D.steps) || !D.steps.length) && D.instructions) { const pr = parseText(D); D.steps = pr.steps.length ? pr.steps : []; }
}
// before saving: drop empty rows, link pantry items, and keep the text version for older parts of the app
function recipeBeforeSave(out) {
  const il = [].concat(out.ilines || []).filter(x => x && (x.h != null ? String(x.h).trim() : String(x.n || '').trim())).map(x => x.h != null ? { h: String(x.h).trim() } : (() => { const y = { q: String(x.q ?? '').trim(), u: x.u || '', n: String(x.n).trim(), note: String(x.note || '').trim() }; const hit = pantryHit(y.n); if (hit) y.ing = hit.id; for (const k of Object.keys(y)) if (y[k] === '') delete y[k]; return y; })());
  const st = [].concat(out.steps || []).map(x => String(x).trim()).filter(Boolean);
  if (il.length) out.ilines = il; else delete out.ilines;
  if (st.length) out.steps = st; else delete out.steps;
  if (il.length || st.length) {
    const pr = parseRecipe(out);
    out.instructions = [pr.lines.length ? 'Ingrediënten:\n' + pr.lines.map(l => '- ' + l).join('\n') : '', pr.steps.length ? 'Bereiding:\n' + pr.steps.map((x, i) => `${i + 1}. ${x}`).join('\n') : ''].filter(Boolean).join('\n\n');
    const ids = new Set([].concat(out.ingredients || [])); for (const x of il) if (x.ing) ids.add(x.ing); if (ids.size) out.ingredients = [...ids];
  }
  return out;
}
// the words that name an ingredient, to find it back in a step
const lineWords = l => norm(l).replace(/[\d½⅓⅔¼¾⅛.,/()–-]+/g, ' ').split(/\s+/).filter(w => w.length > 3 && !/^(gram|grams|cups?|tbsp|tsp|tablespoons?|teaspoons?|eetlepels?|theelepels?|ounces?|pound|pinch|snufje|handful|handje|stuks?|blik|teentjes?|cloves?|large|small|grote|kleine|fresh|verse|chopped|gehakt|finely|fijn|sliced|optional|ongeveer|about|plus|more|extra|taste|naar|smaak)$/.test(w));
// "10 minutes", "5-7 min", "1 uur", "30 seconden" in a step become timers
function stepTimers(step) {
  const out = [], re = /(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to|tot)\s*(\d+(?:[.,]\d+)?))?\s*(hours?|hrs?|uur|minutes?|minuten|minuut|mins?|seconds?|seconden|secs?)\b/gi;
  for (const m of step.matchAll(re)) { const n = Number((m[2] || m[1]).replace(',', '.')), u = m[3].toLowerCase(), sec = /^(h|uur)/.test(u) ? n * 3600 : /^s/.test(u) ? n : n * 60; if (sec > 0 && sec <= 86400) out.push({ sec, label: m[0] }); }
  return out;
}
function cookMode(r, f = 1) {
  const pr = parseRecipe(r), steps = pr.steps.length ? pr.steps : ['Cook it the way the recipe says.'];
  const pantry = [].concat(r.ingredients || []).map(id => L.byId[id]).filter(Boolean);
  const timers = [], got = new Set(); let i = 0, lock = null, tick = null;
  const wake = async () => { try { lock = await navigator.wakeLock?.request('screen'); } catch {} };
  const el = document.createElement('div'); el.className = 'cook'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Cook mode: ' + (r.name || 'recipe'));
  document.body.appendChild(el); document.documentElement.classList.add('cooking'); wake();
  const onVis = () => { if (document.visibilityState === 'visible' && el.isConnected) wake(); };
  document.addEventListener('visibilitychange', onVis);
  const beep = () => { try { const a = new (window.AudioContext || window.webkitAudioContext)(); [0, .35, .7].forEach(t => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.value = .2; o.connect(g); g.connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + .2); }); } catch {} navigator.vibrate?.([300, 150, 300]); };
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const total = steps.length + 2; // get ready, the steps, done
  const draw = () => {
    const now = Date.now();
    const bar = timers.length ? `<div class="cktimers">${timers.map((t, k) => { const left = Math.max(0, (t.end - now) / 1000); return `<button class="cktimer ${left ? '' : 'done'}" data-tstop="${k}" aria-label="Timer ${esc(t.label)}, tap to stop">${svg(P.clock)}<b>${left ? mmss(left) : 'Done'}</b><span>step ${t.step}</span></button>`; }).join('')}</div>` : '';
    let body;
    if (i === 0) body = `<p class="ckkick">Get ready</p><h2>${esc(r.name || 'Recipe')}</h2>${pr.lines.length ? `<p class="muted">Put everything out and tick it off.</p><div class="ckchecks">${pr.lines.map((l, k) => `<label class="ckcheck"><input type="checkbox" data-got="${k}" ${got.has(k) ? 'checked' : ''}><span>${esc(scaleLine(l, f))}</span></label>`).join('')}</div>` : '<p class="muted">This recipe has no ingredient list. Tap Next to start.</p>'}`;
    else if (i <= steps.length) {
      const st = steps[i - 1], low = norm(st), need = pr.lines.filter(l => lineWords(l).some(w => low.includes(w))), tm = stepTimers(st);
      body = `<p class="ckkick">Step ${i} of ${steps.length}</p><p class="ckstep">${esc(st)}</p>
        ${need.length ? `<div class="ckneed"><p class="dsub">For this step</p><ul>${need.map(l => `<li>${esc(scaleLine(l, f))}</li>`).join('')}</ul></div>` : ''}
        ${tm.length ? `<div class="dbtns">${tm.map(t => `<button class="btn" data-tstart="${t.sec}" data-tl="${esc(t.label)}">${svg(P.clock)} Start ${esc(t.label)}</button>`).join('')}</div>` : ''}`;
    } else body = `<p class="ckkick">Done</p><h2>Enjoy your meal</h2>${pantry.filter(x => x.stock).length ? `<p class="muted">Did you use something up? Tick it and it comes off your pantry.</p><div class="ckchecks">${pantry.filter(x => x.stock).map(x => `<label class="ckcheck"><input type="checkbox" data-used="${x.id}"><span>${esc(x.name)}</span></label>`).join('')}</div>` : ''}
      <div class="dbtns"><button class="btn primary" data-ckdone>Save and review it</button><button class="btn" data-ckclose>Just close</button></div>`;
    el.innerHTML = `<div class="ckbar"><button class="iconbtn" data-ckclose aria-label="Close cook mode">${svg(P.x)}</button><div class="ckdots" aria-hidden="true">${Array.from({ length: total }, (_, k) => `<i class="${k === i ? 'on' : k < i ? 'past' : ''}"></i>`).join('')}</div></div>${bar}<div class="ckbody">${body}</div>
      <div class="cknav"><button class="btn" data-ckprev ${i ? '' : 'disabled'}>Back</button><div class="spacer"></div>${i < total - 1 ? `<button class="btn primary" data-cknext>${i === 0 ? 'Start' : i === steps.length ? 'Finish' : 'Next'}</button>` : ''}</div>`;
  };
  const close = () => { clearInterval(tick); try { lock?.release(); } catch {} document.removeEventListener('visibilitychange', onVis); document.documentElement.classList.remove('cooking'); el.remove(); };
  const go = d => { i = Math.max(0, Math.min(total - 1, i + d)); draw(); el.querySelector('.ckbody')?.scrollTo(0, 0); };
  tick = setInterval(() => { if (!timers.length) return; const now = Date.now(); for (const t of timers) if (!t.rang && t.end <= now) { t.rang = true; beep(); C.toast(`Timer done: ${t.label} (step ${t.step})`); } el.querySelectorAll('.cktimer b').forEach((b, k) => { const left = Math.max(0, (timers[k].end - now) / 1000); b.textContent = left ? mmss(left) : 'Done'; b.parentElement.classList.toggle('done', !left); }); }, 500);
  el.addEventListener('click', async e => {
    const t = e.target;
    if (t.closest('[data-ckclose]')) return close();
    if (t.closest('[data-cknext]')) return go(1);
    if (t.closest('[data-ckprev]')) return go(-1);
    const ts = t.closest('[data-tstart]'); if (ts) { timers.push({ end: Date.now() + Number(ts.dataset.tstart) * 1000, label: ts.dataset.tl, step: i }); draw(); return; }
    const tp = t.closest('[data-tstop]'); if (tp) { timers.splice(Number(tp.dataset.tstop), 1); draw(); return; }
    if (t.closest('[data-ckdone]')) {
      const used = [...el.querySelectorAll('[data-used]:checked')].map(c => L.byId[c.dataset.used]).filter(Boolean);
      close();
      if (used.length) { try { await putMany(used.map(x => ({ id: x.id, kind: 'ingredients', data: { ...dataOf(x), stock: false } })), null, `Took ${plural(used.length, 'thing')} off your pantry`); } catch { C.toast('Could not update the pantry. Try again.'); } }
      openReview(r.id, today());
    }
  });
  el.addEventListener('change', e => { const g = e.target.closest('[data-got]'); if (g) g.checked ? got.add(+g.dataset.got) : got.delete(+g.dataset.got); });
  let x0 = null; el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60 && !e.target.closest('input, .cktimers')) go(dx < 0 ? 1 : -1); });
  el.addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); if (e.key === 'Escape') close(); });
  draw(); el.tabIndex = -1; el.focus();
}
function planRecipe(r) {
  const sh = C.sheet({
    title: 'Plan ' + (r.name || 'recipe'),
    body: `<div class="form"><div class="field"><label for="pl-d">Day</label><input id="pl-d" type="date" value="${today()}"></div><div class="field"><label for="pl-s">Meal</label><select id="pl-s">${MEALS.map(s => `<option ${s === (r.category === 'Breakfast' ? 'Breakfast' : r.category === 'Lunch' ? 'Lunch' : 'Dinner') ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div>`,
    foot: `<div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>Add to meal plan</button>`
  });
  sh.querySelector('[data-ok]').onclick = () => { const d = sh.querySelector('#pl-d').value || today(); create('meals', { date: d, slot: sh.querySelector('#pl-s').value, recipe: r.id }).catch(() => {}); C.closeSheet(); C.toast('Planned for ' + relDay(d)); };
}

/* ---------- self-care ---------- */
function careToday(host) {
  const t = today(), w = waterToday(), goal = Number(C.prefs().waterGoal) || 8, glasses = w?.glasses || 0;
  const sups = recs('supplements').filter(s => !s.finished).sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
  const taken = recs('suplog').filter(l => l.date === t);
  const times = ['AM', 'Midday', 'PM'].filter(tm => sups.some(s => [].concat(s.times?.length ? s.times : ['AM']).includes(tm)));
  const sl = recs('sleep').filter(s => s.date).sort((a, b) => b.date.localeCompare(a.date))[0];
  const cy = cycleStats(), j = recs('journal').find(x => x.date === t);
  const prods = recs('beauty').filter(b => !b.finished && !b.archived && !b.wish);
  const am = routineFor(false).ps, tn = routineFor(true), pm = tn.ps, wk = recs('bsched')[0];
  const soon = prods.filter(b => b.expiry && diffDays(t, b.expiry) <= 30).sort((a, b) => a.expiry.localeCompare(b.expiry));
  const appts = recs('appts').filter(a => !a.done && a.date && a.date >= t).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).slice(0, 3);
  const rts = recs('routines').filter(r => onDay(r)), habits = recs('habits').filter(h => !h.paused && onDay(h));
  const rslot = (l, list) => list.length ? `<div class="lslot"><span class="rowlbl">${l}</span>${list.map(r => tick(r.name, routineDone(r), `data-act="quick" data-id="${r.id}"`)).join('')}</div>` : '';
  host.innerHTML = `${head('Life')}
  <div class="panels">
    ${panel('Routines', rts.length ? ROUTINES.map(k => rslot(k, rts.filter(r => r.routine === k))).join('') + rslot('Other', rts.filter(r => !ROUTINES.includes(r.routine))) : `${quiet('Add the steps of your morning and evening routine and tick them off here.')}<button class="btn small" data-act="new" data-v="routines">Add a step</button>`, ['care/habits', 'All routines'])}
    ${recs('lgoals').some(g => g.status !== 'Completed') ? panel('Goals', `<div class="lrows">${recs('lgoals').filter(g => g.status !== 'Completed').sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).slice(0, 4).map(g => `<div class="lrow"><button class="lmain" data-act="open" data-id="${g.id}"><b>${esc(g.name || 'Goal')}</b><span>${esc(KINDS.lgoals.sub(g))}</span><span class="lprog"><i style="width:${goalPct(g)}%"></i></span></button><span class="lside">${goalPct(g)}%</span></div>`).join('')}</div>`, ['care/growth', 'All goals']) : ''}
    ${panel('Habits today', habits.length ? `<div class="lwrap">${habits.map(h => tick(h.name, daysSet(h).has(t), `data-act="quick" data-id="${h.id}"`)).join('')}</div>` : `${quiet('Track a habit and build a streak.')}<button class="btn small" data-act="new" data-v="habits">Add a habit</button>`, ['care/habits', 'This week'])}
    ${panel('Water', `<div class="lwater"><button class="iconbtn" data-act="water" data-v="-1" aria-label="One glass less" ${glasses ? '' : 'disabled'}>${svg(P.minus)}</button><div class="lwv"><b>${glasses}</b><span>of ${goal} glasses</span></div><button class="iconbtn lplus" data-act="water" data-v="1" aria-label="One more glass">${svg(P.plus)}</button></div><div class="meter" aria-hidden="true"><div style="width:${Math.min(100, glasses / goal * 100)}%"></div></div><button class="chip link lgoal" data-act="watergoal">Daily goal: ${goal}</button>`)}
    ${panel('Supplements today', sups.length ? times.map(tm => `<div class="lslot"><span class="rowlbl">${tm}</span>${sups.filter(s => [].concat(s.times?.length ? s.times : ['AM']).includes(tm)).map(s => { const on = taken.some(l => l.supplement === s.id && (l.time || 'AM') === tm); return tick(s.name, on, `data-act="supp" data-id="${s.id}" data-t="${tm}"`); }).join('')}</div>`).join('') : quiet('Add your supplements and tick them off here each day.'), ['care/supplements', 'All supplements'])}
    ${panel('Cycle', cy.last ? `<p class="lbig">${cy.open ? `Period, day ${cy.day}` : `Day ${cy.day} of about ${cy.avg}`}</p><p class="lnone">${cy.open ? 'Tap below when it’s over.' : `Next period expected ${relDay(cy.next)} (${shortDate(cy.next)})${cy.guessed ? ', based on a 28-day cycle until you log more' : ''}.`}</p>${cy.open ? `<button class="btn small" data-act="periodend" data-id="${cy.open.id}">Period ended today</button>` : `<button class="btn small" data-act="periodstart">Period started today</button>`}` : `${quiet('Log when your period starts and the app predicts the next one.')}<button class="btn small" data-act="periodstart">Period started today</button>`, ['care/cycle', 'History'])}
    ${panel('Sleep', sl ? `<p class="lbig">${sl.hours ? sl.hours + ' hours' : 'Logged'}${sl.quality ? ', ' + sl.quality.toLowerCase() : ''}</p><p class="lnone">${esc(niceDate(sl.date))}${sl.wake ? ' · woke up ' + esc(sl.wake.toLowerCase()) : ''}</p>${sl.date === t ? '' : '<button class="btn small" data-act="new" data-v="sleep">Log last night</button>'}` : `${quiet('How did you sleep?')}<button class="btn small" data-act="new" data-v="sleep">Log last night</button>`, ['care/health', 'Sleep log'])}
    ${panel('Journal', j ? `<button class="lrow lmain" data-act="open" data-id="${j.id}"><b>${esc(titleOf(j))}</b><span>${esc((j.entry || '').slice(0, 140))}</span></button>` : `${quiet('Nothing written today yet.')}<button class="btn small" data-act="new" data-v="journal">Write today’s entry</button>`, ['care/journal', 'All entries'])}
    ${panel('Skincare routine', am.length || pm.length || tn.pick.length ? [['Morning', am], [tn.type ? 'Tonight: ' + tn.type.toLowerCase() : 'Evening', pm]].filter(x => x[1].length).map(([l, ps]) => `<div class="lslot"><span class="rowlbl">${esc(l)}</span>${prodChips(ps)}</div>`).join('') + (tn.pick.length ? `<div class="lslot"><span class="rowlbl">Choose one acid</span>${prodChips(tn.pick)}</div>` : '')
      + '<button class="chip link" data-act="go" data-v="care/skin">Open your skincare week</button>' : `${quiet('Plan which products you use on which mornings and evenings.')}<button class="btn small" data-act="go" data-v="care/skin">Plan your skincare week</button>`, ['care/skin', 'Skincare week'])}
    ${soon.length ? panel('Use these up', `<div class="lrows">${soon.slice(0, 5).map(row).join('')}</div>`) : ''}
    ${panel('Coming up', appts.length ? `<div class="lrows">${appts.map(row).join('')}</div>` : quiet('No appointments planned.'), ['care/health', 'Appointments'])}
  </div>`;
}
async function toggleSupp(id, tm) {
  const t = today(), hit = recs('suplog').find(l => l.date === t && l.supplement === id && (l.time || 'AM') === tm);
  try { hit ? await del(hit.id) : await create('suplog', { date: t, supplement: id, time: tm }); } catch { return; }
  // count the dose off the supply (or back on when you untick), and flag it when it runs low
  const r = L.byId[id], left = r && num(r.left); if (left == null) return;
  const dose = num(r.amount) || 1, n = Math.max(0, Math.round((left + (hit ? dose : -dose)) * 100) / 100), doses = [].concat(r.times || ['AM']).length * dose;
  const low = n <= (num(r.min) ?? doses * 7);
  try { await save(r, { left: n, low }); if (low && !r.low) C.toast(`${r.name} is bijna op: nog ${n}`); } catch {}
}
async function water(delta) {
  const w = waterToday(), n = Math.max(0, (w?.glasses || 0) + delta);
  try { w ? await put('water', w.id, { ...dataOf(w), glasses: n }) : await create('water', { date: today(), glasses: n }); } catch {}
}
function cycleTop() {
  const cy = cycleStats();
  if (!cy.last) return `<div class="banner">${quiet('Log when your period starts. After two periods the app knows your own cycle length.')}<button class="btn small" data-act="periodstart">Period started today</button></div>`;
  return `<div class="tiles lt3"><div class="tile"><div class="k">Cycle day</div><div class="v">${cy.day}</div><div class="h">${cy.open ? 'on your period' : 'since ' + shortDate(cy.last)}</div></div>
    <div class="tile"><div class="k">Average cycle</div><div class="v">${cy.avg}</div><div class="h">${cy.guessed ? 'days, a guess for now' : 'days, from your last periods'}</div></div>
    <div class="tile"><div class="k">Next period</div><div class="v">${shortDate(cy.next)}</div><div class="h">${relDay(cy.next)}</div></div></div>
    <div class="lbar">${cy.open ? `<button class="btn small" data-act="periodend" data-id="${cy.open.id}">Period ended today</button>` : '<button class="btn small" data-act="periodstart">Period started today</button>'}</div>`;
}

/* ---------- home ---------- */
/* ---------- feed planner ----------
   Your Instagram profile as it will look: every post with a cover, planned ones on top. Drag a tile to change the
   order (dates stay as they are); tap one to open the post. */
const igPost = p => !p.platforms?.length || [].concat(p.platforms).includes('Instagram');
const short = n => { n = num(n) || 0; return n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'k' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.0', '') + 'k' : String(n); };
const netPost = net => net === 'TikTok' ? (p => [].concat(p.platforms || []).includes('TikTok')) : igPost;
const isReel = p => /video|reel/i.test(p.format || '');
function feedList(net = L.feedNet || 'Instagram') {
  const ps = recs('posts').filter(netPost(net));
  const key = p => p.feedPos != null ? 1e15 + num(p.feedPos) : (p.date ? fromISO(p.date).getTime() : 9e14) + (p.created || 0) / 1e13;
  return ps.sort((a, b) => key(b) - key(a));
}
// pull your real posts, profile and counts from Instagram (the offers function does the work)
// pull your real posts, profile and counts from Instagram or TikTok (the offers function does the work);
// pictures come over 25 at a time, so it keeps going until they are all in your storage
async function netSync(net, quiet) {
  const act = net === 'TikTok' ? 'ttsync' : 'igsync', busy = 'busy' + net; if (L[busy]) return; L[busy] = true;
  if (!quiet) C.toast(`Syncing ${net}…`);
  try {
    let j = await C.callFn('offers', { action: act }), added = j.added || 0;
    for (let n = 0; j.photosWaiting && n < 14; n++) { if (!quiet) C.toast(`Copying pictures… ${j.photosWaiting} to go`); j = await C.callFn('offers', { action: act }); added += j.added || 0; }
    await load(); C.toast(`${net} synced: ${plural(j.posts, net === 'TikTok' ? 'video' : 'post')}${added ? `, ${added} new` : ''}`);
  }
  catch (e) { if (!quiet) C.toast(/IG_TOKEN.*not set/.test(e.message) ? 'Add IG_TOKEN in Supabase first.' : `${net} sync did not work: ${e.message}`); }
  finally { L[busy] = false; }
}
const igSync = quiet => netSync('Instagram', quiet);
// the address TikTok sends you back to; it must match the Redirect URI in the TikTok app exactly
const ttRedirect = () => location.origin + location.pathname.replace(/index\.html$/, '');
// Connect TikTok: off to TikTok's login, which comes back to this page with a code
async function ttConnect() {
  try {
    const j = await C.callFn('offers', { action: 'ttstart' }), state = C.uuid().replace(/-/g, '');
    try { sessionStorage.setItem('tt:state', state); } catch {}
    const redirect = ttRedirect();
    location.href = `https://www.tiktok.com/v2/auth/authorize/?client_key=${encodeURIComponent(j.clientKey)}&scope=user.info.basic,user.info.profile,user.info.stats,video.list,video.upload&response_type=code&redirect_uri=${encodeURIComponent(redirect)}&state=${state}`;
  } catch (e) { C.toast(/not set/.test(e.message) ? 'Add TIKTOK_CLIENT_KEY in Supabase first.' : 'Could not start TikTok: ' + e.message); }
}
// back from TikTok: hand the code to the function, then show the TikTok feed
async function ttReturn() {
  const q = new URLSearchParams(location.search), code = q.get('code'), state = q.get('state'); if (!code || !state) return;
  let pn = ''; try { pn = sessionStorage.getItem('pn:state') || ''; } catch {}
  if (pn && state === pn) return pnReturn(code);
  let want = ''; try { want = sessionStorage.getItem('tt:state') || ''; sessionStorage.removeItem('tt:state'); } catch {}
  try { history.replaceState(null, '', location.pathname + '#social/feed'); } catch {}
  if (state !== want) { C.toast('That TikTok login did not come from this app. Try Connect TikTok again.'); return; }
  L.feedNet = 'TikTok'; C.go('social/feed'); C.toast('Connecting TikTok…');
  try {
    let j = await C.callFn('offers', { action: 'ttconnect', code, redirect: ttRedirect() });
    for (let n = 0; j.photosWaiting && n < 14; n++) j = await C.callFn('offers', { action: 'ttsync' });
    await load(); C.toast(`TikTok connected: ${plural(j.posts || 0, 'video')}`);
  } catch (e) { C.toast('TikTok did not connect: ' + e.message); }
}

// a planned post with a video (or a photo) can go out from here: live on Instagram, or as a draft to your TikTok inbox
/* An idea stays in Content ideas until you tap "Make it a post"; a post that is not out yet can go back. The record keeps its
   id and every field, so nothing is lost either way, and Undo puts it back. */
async function ideaToPost(id) {
  const r = L.byId[id]; if (!r || r.kind !== 'cideas') return;
  const { status, ...d } = dataOf(r);
  try { C.closeSheet(); await putMany([{ id, kind: 'posts', data: { ...d, stage: 'Planned' } }], null, `Made “${titleOf(r)}” a post, now in Posts`); openEditor('posts', id); } catch (e) { failed(e); }
}
async function postToIdea(id) {
  const r = L.byId[id]; if (!r || r.kind !== 'posts') return;
  const { stage, ...d } = dataOf(r);
  try { C.closeSheet(); await putMany([{ id, kind: 'cideas', data: { ...d, status: 'Idea', type: d.type || 'Post idea' } }], null, `Moved “${titleOf(r)}” back to Content ideas`); } catch (e) { failed(e); }
}
// posts that were still at the Idea stage move to Content ideas, once
async function movePostIdeas() {
  const key = 'hangtag:postideas:' + C.uid();
  try { if (localStorage.getItem(key)) return; } catch { return; }
  const list = recs('posts').filter(r => r.stage === 'Idea');
  try { localStorage.setItem(key, '1'); } catch {}
  if (!list.length) return;
  try {
    await putMany(list.map(r => { const { stage, ...d } = dataOf(r); return { id: r.id, kind: 'cideas', data: { ...d, status: 'Idea', type: d.type || 'Post idea' } }; }), null, `Moved ${plural(list.length, 'post idea')} to Content ideas`);
  } catch (e) { try { localStorage.removeItem(key); } catch {} failed(e); }
}
function postPanel(r) {
  if (!r.video && !r.photo) return '';
  const ig = !r.igId, tt = r.video;
  return `<div class="lpostpub">${ig ? `<button type="button" class="btn small" data-act="igpost" data-id="${r.id}">Post to Instagram now</button>` : '<span class="lnone">On Instagram</span>'}${tt ? `<button type="button" class="btn small" data-act="ttpost" data-id="${r.id}">${r.ttSent ? 'Send to TikTok again' : 'Send to TikTok as draft'}</button>` : ''}${r.ttSent ? `<span class="lnone">Sent to TikTok ${esc(relDay(r.ttSent))}</span>` : ''}${r.photo && pnAcc()?.pnSync ? (r.pnId ? `<a class="lnone" href="https://www.pinterest.com/pin/${esc(r.pnId)}/" target="_blank" rel="noopener">Op Pinterest${r.pnViews != null ? ` · ${kfmt(r.pnViews)} weergaven` : ''}</a>` : `<button type="button" class="btn small" data-act="pnpin" data-id="${r.id}">Pin op Pinterest</button>`) : ''}</div>`;
}
async function igPostNow(id) {
  const r = L.byId[id]; if (!r) return;
  if (!confirm(`Post "${titleOf(r)}" on Instagram now? It goes live on your profile straight away, with the caption and hashtags from this post.`)) return;
  C.closeSheet(); C.toast(r.video ? 'Sending the video to Instagram… this can take a few minutes' : 'Posting on Instagram…');
  try {
    let j = await C.callFn('offers', { action: 'igpost', id });
    for (let i = 0; j.pending && i < 10; i++) { C.toast('Instagram is still processing the video…'); j = await C.callFn('offers', { action: 'igpost', id, container: j.container }); }
    if (j.pending) { C.toast('Instagram is taking long. Tap Post to Instagram again in a few minutes.'); return; }
    await load(); C.toast('Posted on Instagram');
  } catch (e) { C.toast('Instagram did not take it: ' + e.message); }
}
async function ttPostNow(id) {
  const r = L.byId[id]; if (!r) return;
  C.closeSheet(); C.toast('Sending the video to TikTok…');
  try { await C.callFn('offers', { action: 'ttpost', id }); await load(); C.toast('In your TikTok inbox: open TikTok to finish and post it'); }
  catch (e) { C.toast('TikTok did not take it: ' + e.message); }
}
function socialFeed(host) {
  const net = L.feedNet || 'Instagram', tt = net === 'TikTok', acc = recs('accounts').find(a => a.platform === net) || null, tab = L.feedTab || 'grid';
  const last = tt ? acc?.ttSync : acc?.igSync;
  if (last && Date.now() - last > 6 * 36e5 && !L['tried' + net]) { L['tried' + net] = true; netSync(net, true); }
  const all = feedList(net), list = tab === 'reels' && !tt ? all.filter(isReel) : all, hl = sortList(recs('highlights'), KINDS.highlights, 'order');
  const ph = (path, cls) => path ? `<img class="${cls}" referrerpolicy="no-referrer" src="${esc(C.photoURL(path))}" alt="" loading="lazy" draggable="false" onerror="this.remove()">` : '';
  const stat = (n, l) => `<div class="igstat"><b>${n == null || n === '' ? '–' : (num(n) || 0).toLocaleString('en-GB')}</b><span>${l}</span></div>`;
  host.innerHTML = `<div class="viewhead"><h1>Feed</h1><span class="sub">Drag tiles to plan how your profile looks${last ? ` · synced ${esc(relDay(iso(new Date(last))))}` : ''}</span><div class="spacer"></div><div class="seg" role="group" aria-label="Network">${['Instagram', 'TikTok'].map(n => `<button data-act="feednet" data-v="${n}" aria-pressed="${net === n}">${n}</button>`).join('')}</div>${tt && !last ? '<button class="btn small primary" data-act="ttconnect">Connect TikTok</button>' : `<button class="btn small" data-act="netsync" data-v="${net}">Sync ${net}</button>${tt ? '<button class="chip link" data-act="ttconnect">Reconnect TikTok</button>' : ''}`}<button class="btn small" data-act="new" data-v="highlights">+ Highlight</button><button class="btn small primary" data-act="feednew">+ Post</button></div>
  <section class="igphone">
    <div class="ighead"><button class="igav" data-act="${acc ? 'open' : 'feedacc'}" ${acc ? `data-id="${acc.id}"` : ''} aria-label="Edit profile">${ph(acc?.avatar, '') || `<span>${esc((acc?.handle || 'A').replace('@', '').slice(0, 1).toUpperCase())}</span>`}</button>
      <div class="igstats">${stat(all.length, tt ? 'videos' : 'posts')}${stat(acc?.followers, 'followers')}${stat(acc?.following, 'following')}${tt ? stat(acc?.likesTotal, 'likes') : ''}</div></div>
    <div class="igbio"><b>${esc(acc?.display || acc?.handle || 'Your profile')}</b>${acc?.handle ? `<span class="muted">${esc(acc.handle.startsWith('@') ? acc.handle : '@' + acc.handle)}</span>` : ''}${acc?.bio ? `<p>${esc(acc.bio)}</p>` : ''}</div>
    <button class="btn small igedit" data-act="${acc ? 'open' : 'feedacc'}" ${acc ? `data-id="${acc.id}"` : ''}>Edit profile</button>
    ${tt ? '' : `<div class="ighl">${hl.map(h => `<button class="ighli" data-act="open" data-id="${h.id}"><span>${ph(h.photo, '')}</span><small>${esc(h.name || '')}</small></button>`).join('')}<button class="ighli new" data-act="new" data-v="highlights"><span>${svg(P.plus)}</span><small>New</small></button></div>`}
    ${tt ? '' : `<div class="igtabs" role="group"><button data-act="feedtab" data-v="grid" aria-pressed="${tab === 'grid'}" aria-label="All posts">${svg(P.grid)}</button><button data-act="feedtab" data-v="reels" aria-pressed="${tab === 'reels'}" aria-label="Reels">${svg('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m10.5 9 4 3-4 3Z"/>')}</button></div>`}
    ${list.length ? `<div class="iggrid" data-feedgrid>${list.map(p => `<div class="igtile ${p.stage === 'Posted' ? 'posted' : ''}" data-feedid="${p.id}" role="button" tabindex="0" aria-label="${esc(titleOf(p))}${p.likes != null ? `, ${p.likes} likes` : ''}">${p.video && p.stage !== 'Posted' ? '<span class="igvid" aria-hidden="true">▶</span>' : ''}${tt && p.views != null ? `<span class="iglk">▶ ${short(p.views)}</span>` : p.likes != null ? `<span class="iglk">♥ ${short(p.likes)}${p.comments ? ` · 💬 ${short(p.comments)}` : ''}</span>` : ''}${ph(p.photo, '') || `<span class="igph">${esc(titleOf(p))}</span>`}${p.stage !== 'Posted' ? `<i class="igdate">${p.date ? esc(shortDate(p.date)) : 'no date'}</i>` : ''}${isReel(p) ? `<i class="igreel">${svg('<path d="m9 7 8 5-8 5Z"/>')}</i>` : ''}</div>`).join('')}</div>`
      : `<div class="empty lempty"><h2>${tab === 'reels' ? 'No reels yet' : 'Plan your first post'}</h2><p>${tt ? (last ? 'Your TikTok videos show up here, planned ones on top.' : 'Connect TikTok to see your videos here, or plan one.') : 'Every Instagram post with a cover shows up here, planned ones on top.'}</p><button class="btn primary" data-act="feednew">+ Post</button></div>`}
  </section>`;
  feedDrag(host);
}
// drag a tile to a new place: mouse right away, finger after holding it for a moment
const FD = {};
function feedDrag(host) {
  if (host._feedWired) return; host._feedWired = true;
  let st = null;
  const tileAt = (x, y) => { const t = document.elementFromPoint(x, y)?.closest?.('[data-feedid]'); return t && !t.classList.contains('ighost') ? t : null; };
  const end = async commit => {
    if (!st) return; const s = st; st = null; clearTimeout(s.timer);
    s.ghost?.remove(); host.querySelectorAll('.igtile.over,.igtile.lift').forEach(t => t.classList.remove('over', 'lift'));
    if (!commit || !s.drag || !s.over || s.over === s.id) return;
    const ids = feedList().map(p => p.id), from = ids.indexOf(s.id); ids.splice(from, 1); ids.splice(ids.indexOf(s.over) + (from <= ids.indexOf(s.over) ? 1 : 0), 0, s.id);
    const n = ids.length;
    try { await putMany(ids.map((id, i) => { const r = L.byId[id]; return { id, kind: 'posts', data: { ...dataOf(r), feedPos: n - i } }; })); } catch { C.toast('Could not save the order. Try again.'); }
  };
  const start = s => { s.drag = true; const t = host.querySelector(`[data-feedid="${s.id}"]`); if (!t) return; t.classList.add('lift'); const r = t.getBoundingClientRect(); s.ghost = t.cloneNode(true); s.ghost.className = 'igtile ighost'; Object.assign(s.ghost.style, { width: r.width + 'px', height: r.height + 'px', left: r.left + 'px', top: r.top + 'px' }); s.dx = s.x - r.left; s.dy = s.y - r.top; document.body.appendChild(s.ghost); navigator.vibrate?.(15); };
  host.addEventListener('pointerdown', e => {
    const t = e.target.closest('[data-feedid]'); if (!t || e.button > 0) return;
    st = { id: t.dataset.feedid, x: e.clientX, y: e.clientY, drag: false, touch: e.pointerType !== 'mouse' };
    if (st.touch) st.timer = setTimeout(() => st && start(st), 280);
  });
  // move and release are followed on the whole window: the finger or mouse often ends up outside the grid
  if (!window._feedMove) { window._feedMove = true; window.addEventListener('pointermove', e => FD.move?.(e)); window.addEventListener('pointerup', e => FD.up?.(e)); window.addEventListener('pointercancel', () => FD.cancel?.()); }
  FD.move = e => {
    if (!st) return;
    const far = Math.hypot(e.clientX - st.x, e.clientY - st.y) > 8;
    if (!st.drag) { if (st.touch) { if (far) { clearTimeout(st.timer); st = null; } return; } if (!far) return; start(st); }
    st.ghost.style.left = e.clientX - st.dx + 'px'; st.ghost.style.top = e.clientY - st.dy + 'px';
    const o = tileAt(e.clientX, e.clientY); host.querySelectorAll('.igtile.over').forEach(x => x !== o && x.classList.remove('over'));
    if (o && o.dataset.feedid !== st.id) { o.classList.add('over'); st.over = o.dataset.feedid; } else st.over = null;
  };
  host.addEventListener('touchmove', e => { if (st?.drag) e.preventDefault(); }, { passive: false });
  FD.up = e => { const s = st; if (!s) return; if (!s.drag && !far(s, e)) { clearTimeout(s.timer); st = null; openRecord(s.id); return; } end(true); };
  FD.cancel = () => end(false);
  host.addEventListener('keydown', e => { const t = e.target.closest?.('[data-feedid]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openRecord(t.dataset.feedid); } });
  const far = (s, e) => Math.hypot(e.clientX - s.x, e.clientY - s.y) > 8;
}
// mindfulness: start logs a session for today and opens the recording
function startMindful(r) {
  create('meditation', { date: today(), minutes: num(r.minutes) || '', type: r.type === 'Breathwork' ? 'Breathwork' : r.type === 'Yoga nidra' ? 'Yoga nidra' : 'Meditation', guide: r.id })
    .then(() => C.toast(`${r.name} logged for today`)).catch(() => {});
  if (r.url) window.open(r.url, '_blank', 'noopener');
}
function mindTop() {
  const ms = recs('meditation').filter(m => m.date), t = today(), wk = weekStart(0);
  const week = ms.filter(m => m.date >= wk && m.date <= addDays(wk, 6)), mins = week.reduce((n, m) => n + (num(m.minutes) || 0), 0);
  const days = new Set(ms.map(m => m.date)); let d = days.has(t) ? t : addDays(t, -1), streak = 0; while (days.has(d) && streak < 3650) { streak++; d = addDays(d, -1); }
  return `<div class="tiles lt3">${fTile('This week', String(week.length), plural(week.length, 'session'))}${fTile('Minutes', String(mins), 'of calm this week')}${fTile('Streak', String(streak), streak === 1 ? 'day in a row' : 'days in a row')}</div>`;
}
/* ---------- charts ----------
   Inline SVG in the app's own palette (--c1 … --c8, checked for colour blindness in light and dark). Every chart
   carries a legend or direct labels and a table, so colour never works alone. Hover a mark to see its numbers. */
const CS = [1, 2, 3, 4, 5, 6, 7].map(n => `var(--c${n})`);
const lTbl = (head, rows, foot) => `<div class="tblwrap"><table class="tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>${foot ? `<tfoot><tr>${foot.map(c => `<td>${c}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
const asTable = (inner, label = 'Show as table') => `<details class="vtable"><summary>${esc(label)}</summary>${inner}</details>`;
// a money donut with a legend; past seven slices the rest fold into "Other"
function vDonut(entries, { unit = 'in total', act, empty = 'Nothing to show yet.', fmt = fEur0, count } = {}) {
  let list = entries.filter(e => e.v > 0).sort((a, b) => b.v - a.v);
  if (list.length > 7) { const rest = list.splice(7); list.push({ label: `Other (${rest.length})`, v: rest.reduce((n, e) => n + e.v, 0), n: rest.reduce((n, e) => n + (e.n || 0), 0), other: true }); }
  const sum = list.reduce((n, e) => n + e.v, 0); if (!sum) return quiet(empty);
  list.forEach((e, i) => { e.color = e.none ? 'var(--none)' : e.other ? 'var(--c8)' : CS[i % 7]; });
  const R = 50, r = 31, c = 60, pt = (rad, a) => `${(c + rad * Math.cos(a)).toFixed(2)} ${(c + rad * Math.sin(a)).toFixed(2)}`;
  let a0 = -Math.PI / 2;
  const paths = list.map(e => {
    const a1 = a0 + Math.min(e.v / sum, 0.9999) * 2 * Math.PI, big = a1 - a0 > Math.PI ? 1 : 0;
    const d = `M${pt(R, a0)} A${R} ${R} 0 ${big} 1 ${pt(R, a1)} L${pt(r, a1)} A${r} ${r} 0 ${big} 0 ${pt(r, a0)} Z`;
    a0 += e.v / sum * 2 * Math.PI;
    return `<path d="${d}" fill="${e.color}"><title>${esc(e.label)}: ${fmt(e.v)} (${Math.round(e.v / sum * 100)}%)</title></path>`;
  }).join('');
  const leg = list.map(e => {
    const inner = `<i style="background:${e.color}"></i><span>${esc(e.label)}</span><em>${fmt(e.v)} · ${Math.round(e.v / sum * 100)}%</em>`;
    return act && !e.other && !e.none ? `<button data-act="${act}" data-v="${esc(e.go || e.label)}"${e.src ? ` data-src="${esc(e.src)}"` : ''}>${inner}</button>` : `<div>${inner}</div>`;
  }).join('');
  return `<div class="donut vdonut"><svg viewBox="0 0 120 120" role="img" aria-label="${esc(list.map(e => `${e.label} ${fmt(e.v)}`).join(', '))}">${paths}${(() => { const c = count != null ? String(count) : fmt(sum); return `<text class="ctr" x="60" y="62" text-anchor="middle" style="font-size:${c.length > 6 ? 13 : c.length > 4 ? 16 : 22}px">${esc(c)}</text>`; })()}<text class="ctr2" x="60" y="76" text-anchor="middle">${esc(unit)}</text></svg><div class="dlegend">${leg}</div></div>`;
}
// columns per period with one or two series side by side; widths in %, heights in px, so it fits any screen
function vCols(cols, series, { fmt = fEur0, H = 150 } = {}) {
  const max = Math.max(1, ...cols.flatMap(c => series.map(s => c[s.k] || 0)));
  const step = 10 ** Math.floor(Math.log10(max)), top = Math.ceil(max / step) * step, base = H - 22, h = v => v / top * (base - 12);
  const n = cols.length, gw = 100 / n, bw = series.length > 1 ? gw * 0.34 : gw * 0.56;
  const grid = [0.5, 1].map(f => `<line x1="0" x2="100%" y1="${(base - h(top * f)).toFixed(1)}" y2="${(base - h(top * f)).toFixed(1)}" class="vgrid"/><text x="0" y="${(base - h(top * f) - 3).toFixed(1)}" class="vtick">${fmt(top * f)}</text>`).join('');
  const bars = cols.map((c, i) => {
    const x0 = i * gw + (gw - bw * series.length - (series.length - 1) * 0.6) / 2;
    const rects = series.map((s, j) => { const v = c[s.k] || 0, hh = h(v); return v > 0 ? `<rect x="${(x0 + j * (bw + 0.6)).toFixed(2)}%" y="${(base - hh).toFixed(1)}" width="${bw.toFixed(2)}%" height="${(hh + 4).toFixed(1)}" rx="4" fill="${s.color}"/>` : ''; }).join('');
    const tip = `${c.label}${c.title ? ' ' + c.title : ''}: ${series.map(s => `${s.label} ${fmt(c[s.k] || 0)}`).join(', ')}`;
    return `<g class="vcol">${rects}<rect class="vhit" x="${(i * gw).toFixed(2)}%" y="0" width="${gw.toFixed(2)}%" height="${base}"><title>${esc(tip)}</title></rect><text x="${(i * gw + gw / 2).toFixed(2)}%" y="${H - 6}" text-anchor="middle" class="vlab">${esc(c.label)}</text></g>`;
  }).join('');
  const legend = series.length > 1 ? `<p class="mlegend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join('')}</p>` : '';
  return `${legend}<svg class="vcols" width="100%" height="${H}" role="img" aria-label="${esc(cols.map(c => `${c.label}: ${series.map(s => `${s.label} ${fmt(c[s.k] || 0)}`).join(', ')}`).join('; '))}">${grid.replace(/<text[^>]*>[^<]*<\/text>/g, '')}${bars}${(grid.match(/<text[^>]*>[^<]*<\/text>/g) || []).join('')}<rect x="0" y="${base}" width="100%" height="5" class="vbase"/><line x1="0" x2="100%" y1="${base}" y2="${base}" class="vaxis"/></svg>`;
}
// horizontal bars with the label and value as text, so the bar only shows the size
const vHBars = (rows, { fmt = fEur0, color = 'var(--c1)', max } = {}) => {
  const m = max || Math.max(1, ...rows.map(r => r.v));
  return `<div class="vhbars">${rows.map(r => `<div class="vhrow" title="${esc(`${r.label}: ${fmt(r.v)}${r.sub ? ' · ' + r.sub : ''}`)}"><span class="vhl"><b>${esc(r.label)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span><svg width="100%" height="12" aria-hidden="true"><rect x="0" y="1" width="${Math.max(r.v > 0 ? 1.5 : 0, 100 * r.v / m).toFixed(2)}%" height="10" rx="4" fill="${r.color || color}"/></svg><b class="vhv">${fmt(r.v)}</b></div>`).join('')}</div>`;
};
// the last n months as { key, label }
const lastMonths = (n = 12) => { const d = new Date(), out = []; for (let k = n - 1; k >= 0; k--) { const m = new Date(d.getFullYear(), d.getMonth() - k, 1); out.push({ key: iso(m).slice(0, 7), label: m.toLocaleDateString('en-GB', { month: 'short' }).slice(0, 3), title: String(m.getFullYear()) }); } return out; };

/* ---------- wishlists ----------
   Every wish in the app, wherever it lives: the master list here plus the wishlists of the closet, beauty,
   supplements, kitchen gear, fitness gear and the home inventory. Each stays managed on its own page. */
function allWishes() {
  const out = [], add = (list, source, page, map) => list.forEach(r => out.push({ source, page, ...map(r) }));
  const base = r => ({ id: r.id, name: titleOf(r), price: num(r.price) || 0, photo: photoOf(r), since: r.since || r.added || (r.created ? iso(new Date(r.created)) : ''), brand: r.brand || '', shop: r.shop || '', prio: wishPrio(r.priority), plan: r.planBuy || '', kind: r.kind });
  for (const c of WISH_CATS) add(recs('wishes').filter(w => (w.category || 'Other') === c && !w.archived && !['Bought', 'Dropped'].includes(w.status)), c, 'wish/master', base);
  add(C.closetWish?.() || [], 'Clothing', 'wishlist', r => ({ id: r.id, name: r.name || 'Piece', price: num(r.price) || 0, photo: r.photo, since: r.since, closet: true, kind: 'closet', brand: r.brand || '', shop: r.shop || '', prio: wishPrio(r.priority), plan: r.planBuy || '' }));
  add(recs('beauty').filter(b => b.wish && !b.archived), 'Beauty', 'care/beauty', base);
  add(recs('supplements').filter(b => b.wish && !b.finished), 'Supplements', 'care/supplements', base);
  add(recs('gear').filter(WISHY.gear), 'Kitchen', 'kitchen/gear', base);
  add(recs('fitgear').filter(WISHY.fitgear), 'Fitness', 'fit/gear', base);
  add(recs('inventory').filter(WISHY.inventory), 'Home', 'home/inventory', base);
  add(recs('fwait').filter(WISHY.fwait), 'Wait list', 'money/plan', base);
  return out;
}
function wishTile() {
  const all = allWishes(), inbox = recs('winbox').filter(r => r.status !== 'Done').length;
  const l = inboxOpen().sort((a, b) => (a.status === 'Ready' ? 0 : 1) - (b.status === 'Ready' ? 0 : 1) || (b.created || 0) - (a.created || 0)), ready = l.filter(r => r.status === 'Ready').length;
  if (partsOff('wish').includes('inbox')) l.length = 0;
  return tileBody([part('wish', 'count', `<p class="dline"><span>On your wishlists</span><b>${plural(all.length, 'wish', 'wishes')}</b></p>`), part('wish', 'total', `<p class="dline"><span>All together</span><b>${eur(all.reduce((n, w) => n + w.price, 0))}</b></p>`),
    partsOff('wish').includes('inbox') ? '' : l.length ? `<p class="dline"><span>Inbox</span><b>${plural(ready, 'card')} to check${l.length - ready ? ` · ${l.length - ready} being sorted` : ''}</b></p>` : inbox ? `<p class="dline"><span>Old inbox</span><b>${plural(inbox, 'link')} to sort</b></p>` : '',
    inboxMini(l.slice(0, 3)), l.length ? `<button class="chip link" data-act="go" data-v="wish/inbox">Open the inbox</button>` : '']);
}
// every wish that left a list: bought or let go, with its price and date (older ones without a date only count in totals)
function wishHistory() {
  const out = [], srcOf = { wishes: r => r.category || 'Other', beauty: () => 'Beauty', supplements: () => 'Supplements', gear: () => 'Kitchen', fitgear: () => 'Fitness', inventory: () => 'Home', fwait: () => 'Wait list' };
  for (const kind of Object.keys(WISHY)) for (const r of recs(kind)) {
    let o = r.wishOut, d = r.wishOutOn || '';
    if (!o && kind === 'wishes') { if (r.status === 'Bought') o = 'bought'; else if (r.status === 'Dropped' || r.archived) o = 'dropped'; }
    if (!o && kind === 'fwait' && !r.moved) { if (r.status === 'Bought') o = 'bought'; else if (r.status === 'Let go') o = 'dropped'; }
    if (!d && o && kind === 'fwait') d = r.added || '';
    if (o) out.push({ name: titleOf(r), price: num(r.price) || 0, out: o, date: d || (o === 'bought' ? r.bought || '' : ''), source: srcOf[kind](r) });
  }
  for (const r of C.closetDone?.() || []) out.push({ ...r, price: num(r.price) || 0, source: 'Clothing' });
  return out;
}
/* ---------- wishes and money ----------
   Every wishlist talks to Finance: buying a wish writes a purchase (tag "wishlist", category from your sort rules),
   saving for one makes a goal, each wish says whether it fits in safe to spend, letting one go counts as money
   saved, and planned buys show up in the forecast. Each action is one step to undo. */
const isWishTx = x => [].concat(x.tags || []).includes('wishlist');
const fMainAcc = () => fAccs().find(a => a.safe && a.type === 'Spending') || fAccs().find(a => a.type !== 'Card') || fAccs()[0] || null;
const wishGoal = id => recs('fgoals').find(g => g.wish === id && !g.done) || null;
const wishBudget = () => num(fset().wishBudget) || 0;
const wishSpent = (w = fWindow()) => fSum(recs('ftx').filter(x => isWishTx(x) && x.date >= w.start && x.date <= w.end && x.date <= today()));
const wishSaved = () => fSum(wishHistory().filter(h => h.out === 'dropped'), 'price');
const WAIT_DAYS = 30; // until the move, every wish waits 30 days first, except the move list
const wishWaitLeft = r => { const h = num(r.wait) ?? (r.kind === 'inventory' || r.kind === 'fwait' ? null : WAIT_DAYS * 24); if (r.kind === 'fwait') return Math.ceil((waitEnd(r) - Date.now()) / 36e5); if (!h) return null; return Math.ceil(((num(r.waitFrom) || (r.since ? fromISO(r.since).getTime() : 0) || r.created || Date.now()) + h * 36e5 - Date.now()) / 36e5); };
const BUY_PATCH = { wishes: () => ({ status: 'Bought' }), beauty: d => ({ wish: false, bought: d }), supplements: d => ({ wish: false, bought: d }), gear: d => ({ own: true, bought: d }), fitgear: d => ({ own: true, bought: d }), inventory: d => ({ status: 'Gekocht', bought: d }), fwait: () => ({ status: 'Bought' }) };
const DROP_PATCH = { wishes: () => ({ status: 'Dropped' }), beauty: () => ({ archived: true }), supplements: () => ({ finished: true }), gear: () => ({ dropped: true }), fitgear: () => ({ dropped: true }), inventory: () => ({ status: 'Weg' }), fwait: () => ({ status: 'Let go' }) };
function wishRef(kind, id) {
  if (kind === 'closet') { const c = (C.closetWish?.() || []).find(x => x.id === id); return c ? { kind, id, name: c.name || 'Piece', price: num(c.price) || 0, plan: c.planBuy || '' } : null; }
  const r = L.byId[id]; return r && WISHY[r.kind] ? { kind: r.kind, id, name: titleOf(r), price: num(r.price) || 0, plan: r.planBuy || '' } : null;
}
// what you usually have left at the end of a month: money in minus money out, over the last three full months
function fSurplus() {
  let n = 0; for (let k = 1; k <= 3; k++) { const m = fPrevMonth(fMonth(today()), k); n += fSum(recs('fincome').filter(i => !i.transfer && i.confirmed !== false && fMonth(i.date || '') === m)) - fSum(recs('ftx').filter(x => !x.transfer && !fMoved(x) && fMonth(x.date || '') === m)); }
  return n / 3;
}
let AFF = null;
// a short answer to "can I afford it?": fits now, or about how long saving takes
function affordLine(price, id) {
  if (!(price > 0) || !recs('faccounts').length) return '';
  if (!AFF || AFF.v !== L.ver) { const st = fState(); AFF = { v: L.ver, until: st.until, surplus: fSurplus() }; }
  const g = id && wishGoal(id), have = g ? num(g.saved) || 0 : 0, need = price - have;
  if (g && have >= price) return 'ready to buy';
  if (need <= AFF.until) return 'fits in safe to spend now';
  const gap = need - Math.max(0, AFF.until);
  if (AFF.surplus <= 0) return `needs ${fEur0(gap)} more than is safe now`;
  const days = Math.ceil(gap / (AFF.surplus / 30.4));
  return days <= 45 ? `about ${plural(days, 'day')} of saving` : `about ${plural(Math.round(days / 30.4), 'payday')} of saving`;
}
// the extra words in a wish's description: waiting, planned, saved so far, can I afford it; or cost per use once bought
function wishLine(kind, id, price, plan) {
  const r = kind === 'closet' ? null : L.byId[id];
  if (r && !WISHY[r.kind]?.(r)) {
    if (!(r.wishOut === 'bought' || (r.kind === 'wishes' && r.status === 'Bought'))) return '';
    const u = num(r.uses) || 0, paid = num(r.paid) ?? num(r.price);
    return paid ? (u ? `${eur(paid / u)} per use · ${plural(u, 'use')}` : 'not used yet') : '';
  }
  const w = r ? wishWaitLeft(r) : null, g = wishGoal(id), p = num(price ?? r?.price) || 0, pl = plan ?? r?.planBuy;
  return [w != null && w > 0 ? `waiting, decide in ${w} h` : '', pl ? `planned ${shortDate(pl)}` : '', g && (num(g.saved) || 0) < (num(g.target) || 0) ? `${fEur0(num(g.saved) || 0)} of ${fEur0(num(g.target) || 0)} saved` : '', affordLine(p, id)].filter(Boolean).join(' · ');
}
// the money part of a wish's sheet
function wishPanel(kind, id) {
  const r = kind === 'closet' ? null : L.byId[id];
  if (r && !WISHY[r.kind]?.(r)) {
    if (!(r.wishOut === 'bought' || (r.kind === 'wishes' && r.status === 'Bought')) || r.kind === 'fwait') return '';
    const u = num(r.uses) || 0, paid = num(r.paid) ?? num(r.price);
    return `<div class="wmoney"><p><b>${paid ? (u ? `${eur(paid / u)} per use` : 'Not used yet') : 'Bought'}</b><span>${[paid ? `paid ${eur(paid)}` : '', plural(u, 'use')].filter(Boolean).join(' · ')}${r.tx && L.byId[r.tx] ? ' · in Finance' : ''}</span></p><div class="dbtns"><button type="button" class="btn small primary" data-wact="use" data-kind="${r.kind}" data-id="${id}">+1 use</button>${u ? `<button type="button" class="btn small" data-wact="unuse" data-kind="${r.kind}" data-id="${id}">−1</button>` : ''}</div></div>`;
  }
  const w = wishRef(kind, id); if (!w) return '';
  const g = wishGoal(id), aff = affordLine(w.price, id), left = r ? wishWaitLeft(r) : null;
  return `<div class="wmoney"><p><b>${w.price ? eur(w.price) : 'No price yet'}</b><span>${[aff ? aff.charAt(0).toUpperCase() + aff.slice(1) : '', g ? `${eur(num(g.saved) || 0)} of ${eur(num(g.target) || 0)} saved in ${esc(titleOf(g))}` : '', left != null && left > 0 ? `waiting, decide in ${left} h` : ''].filter(Boolean).join(' · ') || 'Set up Finance to see whether it fits.'}</span></p>
    <div class="dbtns"><button type="button" class="btn small primary" data-wact="buy" data-kind="${kind}" data-id="${id}">Bought</button>${g ? `<button type="button" class="btn small" data-wact="goal" data-kind="${kind}" data-id="${id}">Open goal</button>` : w.price ? `<button type="button" class="btn small" data-wact="save" data-kind="${kind}" data-id="${id}">Save for this</button>` : ''}${kind !== 'closet' ? `<button type="button" class="btn small" data-wact="drop" data-kind="${kind}" data-id="${id}">Let go</button>` : ''}${r?.kind === 'wishes' && !(left > 0) ? `<button type="button" class="btn small" data-wact="wait" data-kind="${kind}" data-id="${id}">Wait 48 hours</button>` : ''}
    <label class="wplan"><span>Plan to buy on</span><input type="date" data-wplan="${id}" data-kind="${kind}" value="${esc(w.plan || '')}"></label></div></div>`;
}
// several changes as one undo step: purchase, wish, goal and (for the closet) the piece
async function wishSteps(label, fn) {
  const befores = [], closet = [];
  const step = async (kind, id, data) => { befores.push([id, L.byId[id] ? { kind: L.byId[id].kind, data: dataOf(L.byId[id]) } : null]); await put(kind, id, data); };
  L.batch = true;
  try { await C.undoQuiet(() => fn(step, (id, b) => closet.push([id, b]))); } finally { L.batch = false; }
  C.undoPush(label, async () => {
    L.batch = true;
    try { for (const [id, b] of befores.reverse()) b ? await put(b.kind, id, b.data) : await del(id); for (const [id, b] of closet) await C.closetRestore(id, b); }
    finally { L.batch = false; }
  }, true);
}
function buyWish(kind, id) {
  const w = wishRef(kind, id); if (!w) return;
  const accs = fAccs(), main = fMainAcc();
  if (!accs.length) { C.toast('Add an account in Finance first, so the purchase has somewhere to go.'); return; }
  const sh = C.sheet({
    title: 'Bought ' + w.name,
    body: `<div class="form"><div class="field"><label for="wb-p">Price paid</label><input id="wb-p" type="number" inputmode="decimal" step="any" value="${w.price || ''}"></div>
      <div class="field"><label for="wb-d">Date</label><input id="wb-d" type="date" value="${today()}"></div>
      <div class="field full"><label for="wb-a">Paid from</label><select id="wb-a">${accs.map(a => `<option value="${a.id}" ${a.id === main?.id ? 'selected' : ''}>${esc(a.name || 'Account')}</option>`).join('')}</select></div></div>
      <p class="lnone">This writes the purchase down in Finance with the tag wishlist (your sort rules pick the category) and moves the wish to bought. One step to undo.</p>`,
    foot: `<span class="busy" data-msg></span><div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary" data-wbuy>Save</button>`
  });
  sh.querySelector('[data-wbuy]').addEventListener('click', async e => {
    const price = num(String(sh.querySelector('#wb-p').value).replace(',', '.')) || 0, date = sh.querySelector('#wb-d').value || today(), account = sh.querySelector('#wb-a').value;
    e.target.disabled = true;
    try { await wishBought(w, { price, date, account }); C.closeSheet(); C.toast(`${w.name} bought, ${eur(price)} written down`); if (kind === 'closet') C.openItem?.(id); }
    catch (err) { console.error(err); sh.querySelector('[data-msg]').textContent = 'Could not save. Try again.'; e.target.disabled = false; }
  });
}
function wishBought(w, { price, date, account }) {
  const txId = C.uuid(), goal = wishGoal(w.id);
  return wishSteps(`Bought ${w.name}`, async (step, closetDone) => {
    await step('ftx', txId, { name: w.name, amount: price, date, account, tags: ['wishlist'], wish: w.id, created: Date.now() });
    if (w.kind === 'closet') closetDone(w.id, await C.closetBuy(w.id, { price, bought: date, tx: txId }));
    else { const r = L.byId[w.id], { planBuy, ...d } = dataOf(r); await step(w.kind, w.id, { ...d, ...BUY_PATCH[w.kind](date), tx: txId, paid: price, wishOut: 'bought', wishOutOn: date }); }
    if (goal) await step('fgoals', goal.id, { ...dataOf(goal), done: true });
  });
}
async function dropWish(kind, id) {
  const r = L.byId[id]; if (!r || !DROP_PATCH[kind]) return;
  await save(r, DROP_PATCH[kind]());
  C.toast(num(r.price) ? `Let go. ${eur(num(r.price))} saved` : 'Let go');
}
async function saveForWish(kind, id) {
  const w = wishRef(kind, id); if (!w) return;
  const g = wishGoal(id); if (g) { openRecord(g.id); return; }
  try { await create('fgoals', { name: w.name, target: w.price, saved: 0, wish: id }); C.toast('Goal added. Put money by in Finance › Goals.'); } catch { C.toast('Could not save. Try again.'); }
}
async function planWish(kind, id, date) {
  try { if (kind === 'closet') await C.closetPatch(id, { planBuy: date }); else { const r = L.byId[id]; if (r) { const { planBuy, ...d } = dataOf(r); await put(r.kind, id, date ? { ...d, planBuy: date } : d); } } C.toast(date ? `Planned for ${shortDate(date)}, it now counts in the forecast` : 'No longer planned'); }
  catch { C.toast('Could not save. Try again.'); }
}
// planned wishes between two dates, for the forecast and the money calendar
const plannedWishes = (from, to) => allWishes().filter(w => w.plan && w.plan >= from && w.plan <= to).map(w => ({ date: w.plan, amount: w.price, name: w.name }));
// one wait list: older wait-list items move into the wishlists, the originals stay readable and point at their wish
function moveWaitList() {
  const old = recs('fwait').filter(WISHY.fwait); if (!old.length) return;
  const rows = [];
  for (const f of old) {
    const id = C.uuid();
    rows.push({ id, kind: 'wishes', data: { name: f.name || 'Something', price: num(f.price) ?? undefined, url: f.url, why: f.notes, since: f.added || today(), wait: num(f.wait) ?? 48, waitFrom: waitEnd(f) - (num(f.wait) ?? 48) * 36e5, status: 'Wish', category: 'Other', fromWait: f.id, created: f.created || Date.now() } });
    rows.push({ id: f.id, kind: 'fwait', data: { ...dataOf(f), moved: id } });
  }
  for (const r of rows) for (const k of Object.keys(r.data)) if (r.data[k] === undefined || r.data[k] === '') delete r.data[k];
  return putMany(rows, null, `Moved ${plural(old.length, 'wait-list item')} into Wishlists`).then(() => C.toast('Your wait list now lives in Wishlists')).catch(() => C.toast('Could not move them. Try again.'));
}
// a month of wishes: bought, let go, spent against the wishlist budget
function wishMonth(m) {
  const h = wishHistory().filter(x => (x.date || '').startsWith(m)), b = h.filter(x => x.out === 'bought'), d = h.filter(x => x.out === 'dropped');
  return { bought: b, dropped: d, spent: fSum(recs('ftx').filter(x => isWishTx(x) && (x.date || '').startsWith(m))), saved: fSum(d, 'price') };
}
function wishReview(m, label) {
  const x = wishMonth(m), bud = wishBudget(), mode = fMode(), budM = bud ? (mode === 'month' ? bud : bud) : 0;
  const li = l => l.length ? `<div class="lrows">${l.slice(0, 6).map(h => `<div class="lrow"><span class="lmain"><b>${esc(h.name || 'Wish')}</b><span>${esc([h.source, h.date ? shortDate(h.date) : ''].filter(Boolean).join(' · '))}</span></span><span class="lside">${h.price ? fEur0(h.price) : ''}</span></div>`).join('')}${l.length > 6 ? `<p class="lnone">and ${l.length - 6} more</p>` : ''}</div>` : '';
  return `<div class="mpair m3"><p><span>Bought</span><b>${x.bought.length} · ${fEur0(fSum(x.bought, 'price'))}</b></p><p><span>Let go</span><b class="mgood">${x.dropped.length} · ${fEur0(x.saved)} saved</b></p><p><span>Spent from wishlists</span><b class="${budM && x.spent > budM ? 'mneg' : ''}">${fEur0(x.spent)}${budM ? ` <small>/ ${fEur0(budM)}</small>` : ''}</b></p></div>
    ${budM ? `<span class="lprog mprog"><i style="width:${Math.min(100, 100 * x.spent / budM)}%"></i></span><p class="mmuted">${x.spent <= budM ? `${fEur0(budM - x.spent)} of the wishlist budget left${mode === 'pay' ? ' (budget per paycheck)' : ''}.` : `${fEur0(x.spent - budM)} over the wishlist budget.`}</p>` : `<p class="mmuted">Set a wishlist budget in Finance or Wishlists settings to see this against a plan.</p>`}
    ${x.bought.length || x.dropped.length ? `<div class="vsplit"><div>${x.bought.length ? `<p class="dsub">Bought in ${esc(label)}</p>${li(x.bought)}` : ''}</div><div>${x.dropped.length ? `<p class="dsub">Let go in ${esc(label)}</p>${li(x.dropped)}` : ''}</div></div>` : quiet(`Nothing bought or let go in ${label} yet.`)}`;
}
// the Finance overview's view of every wishlist
function wishMoneyPanel() {
  const all = allWishes(); if (!all.length && !wishBudget()) return '';
  const by = new Map(); for (const w of all) { const g = by.get(w.source) || { label: w.source, v: 0, n: 0 }; g.v += w.price; g.n++; by.set(w.source, g); }
  const rows = [...by.values()].sort((a, b) => b.v - a.v), total = all.reduce((n, w) => n + w.price, 0), bud = wishBudget(), spent = wishSpent(), mode = fMode();
  return MP('Wishlists', `<div class="mpair m3"><p><span>All wishes together</span><b>${fEur0(total)}</b></p><p><span>Spent from wishlists this ${mode === 'month' ? 'month' : 'pay'}</span><b class="${bud && spent > bud ? 'mneg' : ''}">${fEur0(spent)}${bud ? ` <small>/ ${fEur0(bud)}</small>` : ''}</b></p><p><span>Saved by letting go</span><b class="mgood">${fEur0(wishSaved())}</b></p></div>
    ${rows.length ? vHBars(rows.map(r => ({ label: r.label, v: r.v, sub: plural(r.n, 'wish', 'wishes') })), { color: 'var(--c4)' }) : ''}`, mLink('Open Wishlists', 'wish/today'), 'wish');
}

function wishToday(host) {
  const all = allWishes(), total = all.reduce((n, w) => n + w.price, 0), by = new Map();
  for (const w of all) { const g = by.get(w.source) || { n: 0, sum: 0 }; g.n++; g.sum += w.price; by.set(w.source, g); }
  const groups = [...by].sort((a, b) => b[1].sum - a[1].sum);
  const old = all.filter(w => w.since).sort((a, b) => a.since.localeCompare(b.since))[0];
  const inbox = recs('winbox').filter(r => r.status !== 'Done'), hist = wishHistory(), savedAll = fSum(hist.filter(h => h.out === 'dropped'), 'price');
  /* money per wishlist */
  const catDonut = vDonut(groups.map(([src, g]) => ({ label: src, v: g.sum, go: all.find(w => w.source === src).page, src })), { act: 'wishgo', unit: 'total', empty: 'Add prices to your wishes to see this.' });
  const catTable = lTbl(['Wishlist', 'Wishes', 'Total'], groups.map(([src, g]) => [esc(src), g.n, fEur0(g.sum)]), ['All', all.length, fEur0(total)]);
  /* how long on the list */
  const BK = [['Under a week', 7], ['Under a month', 31], ['Under 3 months', 92], ['Longer', 1e9]], bk = BK.map(([label]) => ({ label, n: 0, v: 0 }));
  let noDate = 0; for (const w of all) { const d = daysSince(w.since); if (d == null) { noDate++; continue; } const i = BK.findIndex(([, m]) => d < m); bk[i].n++; bk[i].v += w.price; }
  const ages = all.length ? vHBars(bk.map(b => ({ label: b.label, v: b.n, sub: b.v ? fEur0(b.v) : '' })), { fmt: n => String(n), color: 'var(--c2)' }) + (noDate ? `<p class="lnone">${plural(noDate, 'wish', 'wishes')} without a date.</p>` : '') : quiet('Nothing on your wishlists yet.');
  /* bought vs let go */
  const months = lastMonths(12).map(m => ({ ...m, bought: 0, dropped: 0, nb: 0, nd: 0 }));
  for (const h of hist) { const m = months.find(x => h.date && x.key === h.date.slice(0, 7)); if (!m) continue; if (h.out === 'bought') { m.bought += h.price; m.nb++; } else { m.dropped += h.price; m.nd++; } }
  const saved12 = months.reduce((n, m) => n + m.dropped, 0), bought12 = months.reduce((n, m) => n + m.bought, 0);
  const SBD = [{ k: 'bought', label: 'Bought', color: 'var(--c1)' }, { k: 'dropped', label: 'Let go (saved)', color: 'var(--c2)' }];
  const flow = hist.length ? `${vCols(months, SBD)}<p class="mmuted">Last 12 months: <b>${fEur0(bought12)}</b> spent on wishes, <b>${fEur0(saved12)}</b> saved by letting go${savedAll > saved12 ? ` · ${fEur0(savedAll)} saved in all` : ''}.</p>
    ${asTable(lTbl(['Month', 'Bought', 'Let go', 'Saved'], months.filter(m => m.nb || m.nd).reverse().map(m => [`${m.label} ${m.title}`, m.nb ? `${m.nb} · ${fEur0(m.bought)}` : '–', m.nd || '–', m.dropped ? fEur0(m.dropped) : '–']), ['Total', fEur0(bought12), months.reduce((n, m) => n + m.nd, 0), fEur0(saved12)]))}` : quiet('When you buy a wish or let one go, it shows up here per month.');
  /* brands and shops */
  const tally = k => { const m = new Map(); for (const w of all) { const v = String(w[k] || '').trim(); if (!v) continue; const g = m.get(norm(v)) || { label: v, n: 0, v: 0 }; g.n++; g.v += w.price; m.set(norm(v), g); } return [...m.values()].sort((a, b) => b.n - a.n || b.v - a.v).slice(0, 8); };
  const brands = tally('brand'), shops = tally('shop');
  const bsT = (title, list) => list.length ? lTbl([title, 'Wishes', 'Total'], list.map(g => [esc(g.label), g.n, g.v ? fEur0(g.v) : '–'])) : quiet(`Add a ${title.toLowerCase()} to your wishes to see this.`);
  const bs = brands.length || shops.length ? `<div class="vsplit"><div>${bsT('Brand', brands)}</div><div>${bsT('Shop', shops)}</div></div>` : quiet('Add brands and shops to your wishes to see where they come from.');
  /* priority and budget */
  const st = recs('faccounts').length ? fState() : null, goals = recs('fgoals').filter(g => !g.done), gSaved = fSum(goals, 'saved');
  const pr = [...WISH_PRIO, ''].map(p => { const l = all.filter(w => (w.prio || '') === p); return { label: p || 'No priority', v: l.reduce((n, w) => n + w.price, 0), sub: plural(l.length, 'wish', 'wishes'), n: l.length }; }).filter(r => r.n);
  const must = pr.find(r => r.label === 'Must have')?.v || 0, safe = st ? Math.max(0, st.until) : 0;
  const have = [...(st ? [{ label: 'Safe to spend now', v: safe, sub: st.pay ? 'until payday' : 'next 30 days', color: 'var(--c5)' }] : []), ...(goals.length ? [{ label: 'Saved in goals', v: gSaved, sub: plural(goals.length, 'goal'), color: 'var(--c5)' }] : [])];
  const pmax = Math.max(1, ...pr.map(r => r.v), ...have.map(r => r.v));
  const prio = pr.length ? `<p class="mlegend"><span><i style="background:var(--c1)"></i>Wanted</span>${have.length ? '<span><i style="background:var(--c5)"></i>Money you have</span>' : ''}</p>${vHBars([...pr, ...have], { max: pmax })}
    <p class="mmuted">${!st ? 'Set up Finance to see this against what is safe to spend.' : must <= 0 ? 'No must-haves with a price yet.' : must <= safe ? `Your must-haves (${fEur0(must)}) fit in what is safe to spend now.` : `Your must-haves need ${fEur0(must - safe)} more than is safe to spend now${gSaved ? `, or ${fEur0(Math.max(0, must - gSaved))} past what your goals hold` : ''}.`}</p>` : quiet('Nothing on your wishlists yet.');
  host.innerHTML = `${head('Wishlists')}
  <div class="tiles">${fTile('Wishes', String(all.length), `on ${plural(groups.length, 'list')}`)}${fTile('All together', fEur0(total), 'for what has a price')}${fTile('Saved by letting go', `<span class="mgood">${fEur0(savedAll)}</span>`, plural(hist.filter(h => h.out === 'dropped').length, 'wish', 'wishes') + ' let go')}${wishBudget() ? fTile('Wishlist budget', fEur0(Math.max(0, wishBudget() - wishSpent())), `left of ${fEur0(wishBudget())} this ${fMode() === 'month' ? 'month' : 'pay'} · ${fEur0(wishSpent())} spent`, wishSpent() > wishBudget() ? 'mneg' : '') : fTile('Longest wanted', old ? daysSince(old.since) + ' days' : '–', old ? esc(old.name) : 'nothing yet')}</div>
  <div class="panels">
    ${panel('Money per wishlist', `${catDonut}${groups.length ? asTable(catTable) : ''}`)}
    ${panel('How long on the list', ages)}
    ${(() => { const WT = ['wishes', 'closet', 'beauty', 'supplements', 'gear', 'fitgear', 'inventory', 'gifts'], l = inboxOpen().filter(r => r.status === 'New' || WT.includes(r.target)).sort((a, b) => (a.status === 'Ready' ? 0 : 1) - (b.status === 'Ready' ? 0 : 1) || (b.created || 0) - (a.created || 0));
      return panel('Inbox', `<form class="lqadd" data-winbox><input placeholder="Paste a link to sort later" aria-label="Paste a link"><button class="btn small" type="submit">Add</button></form>${l.length ? inboxMini(l.slice(0, 4)) + (l.length > 4 ? `<p class="lnone">and ${l.length - 4} more</p>` : '') : quiet('Nothing to check. Share a link with “Naar A’s Life”.')}${inbox.length ? `<p class="lnone">${plural(inbox.length, 'link')} still in the old wishlist inbox.</p>` : ''}`, ['wish/inbox', 'Open the inbox']); })()}
  </div>
  <div class="mrow2 wrow2">${panel('Bought and let go', flow)}${panel('Priority and budget', prio)}</div>
  <div class="wrow2">${panel(`This month, ${new Date().toLocaleDateString('en-GB', { month: 'long' })}`, wishReview(today().slice(0, 7), 'this month'), ['money/reviews', 'Monthly reviews'])}</div>
  <div class="wrow2">${panel('Brands and shops', bs)}</div>
  <div class="wtables">${groups.map(([src]) => { const list = all.filter(w => w.source === src).sort((a, b) => (a.since || '9').localeCompare(b.since || '9')), page = list[0].page; return `<section class="panel wtable" style="--n:${Math.min(6, list.length)};--m:${Math.min(3, list.length)}"><div class="lph3"><h3>${esc(src)}</h3><button class="chip link" data-act="wishgo" data-v="${esc(page)}" data-src="${esc(src)}">All ${list.length} →</button></div><div class="lgrid wgrid">${list.slice(0, 6).map(w => `<div class="wcard">${prodCard(w.closet ? w : { ...L.byId[w.id] }, w.closet ? 'openitem' : 'open')}${recs('faccounts').length ? `<button class="chip wbuy" data-wact="buy" data-kind="${w.kind}" data-id="${esc(w.id)}">Bought</button>` : ''}</div>`).join('')}</div></section>`; }).join('')}</div>`;
}
function wishFromInbox(r) {
  const link = /^https?:/.test(r.name || '') ? r.name : '';
  save(r, { status: 'Done' });
  openEditor('wishes', null, { name: link ? '' : r.name, url: link, why: r.note || '', status: 'Wish', since: today() });
}
// goals per life area at a glance
function growthTop() {
  const gs = recs('lgoals'), open = gs.filter(g => g.status !== 'Completed'), yr = today().slice(0, 4);
  const soon = open.filter(g => g.due && g.due <= addDays(today(), 30)).length;
  const areas = AREAS.map(a => [a, open.filter(g => g.area === a)]).filter(([, l]) => l.length);
  return `<div class="tiles lt3">${fTile('Active goals', String(open.length), areas.length ? `in ${plural(areas.length, 'life area')}` : 'set one per life area')}${fTile('Done', String(gs.filter(g => g.status === 'Completed' && (g.due || '').startsWith(yr) || g.status === 'Completed' && !g.due).length), 'completed goals')}${fTile('Due within 30 days', String(soon), soon ? 'keep going' : 'nothing urgent')}</div>
  ${areas.length ? `<div class="gareas">${areas.map(([a, l]) => `<div class="garea"><b>${esc(a)}</b><div class="fbar"><i style="width:${Math.round(l.reduce((n, g) => n + goalPct(g), 0) / l.length)}%"></i></div><span>${plural(l.length, 'goal')} · ${Math.round(l.reduce((n, g) => n + goalPct(g), 0) / l.length)}%</span></div>`).join('')}</div>` : ''}`;
}
// this week's habits as a grid: tap a day to tick it (or untick it)
function habitWeek() {
  const hs = recs('habits').filter(h => !h.paused); if (!hs.length) return '';
  const days = weekDays(), t = today();
  return `<section class="panel lpanel hweek"><div class="lph3"><h3>This week</h3></div><div class="hgrid"><span></span>${days.map(d => `<span class="hd ${d === t ? 'now' : ''}">${dayName(d).slice(0, 2)}</span>`).join('')}${hs.map(h => { const s = daysSet(h); return `<button class="hname" data-act="open" data-id="${h.id}">${esc(h.name)}</button>` + days.map(d => `<button class="hcell ${s.has(d) ? 'on' : ''} ${onDay(h, d) ? '' : 'rest'}" data-act="hday" data-id="${h.id}" data-d="${d}" aria-pressed="${s.has(d)}" aria-label="${esc(h.name)}, ${dayName(d)}" ${d > t ? 'disabled' : ''}>${s.has(d) ? svg(P.check) : ''}</button>`).join(''); }).join('')}</div></section>`;
}

// the cleaning schedule: what is due today in three lists, what comes next, and whether today is a free day
function choreFill(fill) {
  const t = today(), all = recs('chores'), free = choreFree(t), groups = ['Daily', 'Weekly', 'Monthly and longer'];
  const due = all.filter(c => choreDue(c) <= t), soon = all.filter(c => choreDue(c) > t && choreDue(c) <= addDays(t, 7)).sort((a, b) => choreDue(a).localeCompare(choreDue(b)));
  const done = all.filter(c => c.last === t);
  fill.innerHTML = (free ? `<p class="lnone">Today is a free day. Everything moves on to the next day you clean.</p>` : '')
    + (all.length ? groups.map(g => { const l = due.filter(c => choreGroup(c) === g); return `<section class="panel lpanel"><div class="lph3"><h3>${g}</h3><span class="lnone">${l.length ? plural(l.length, 'to do') : 'done'}</span></div>${l.length ? `<div class="lrows">${l.map(row).join('')}</div>` : quiet(free ? 'Free day.' : 'Nothing due.')}</section>`; }).join('') : quiet('Add your chores with how often they need doing. Daily ones land in Daily, weekly in Weekly, the rest in Monthly.'))
    + (done.length ? `<section class="panel lpanel"><div class="lph3"><h3>Done today</h3></div><div class="lrows">${done.map(row).join('')}</div></section>` : '')
    + (soon.length ? `<section class="panel lpanel"><div class="lph3"><h3>Coming up this week</h3></div><div class="lrows">${soon.map(row).join('')}</div></section>` : '')
    + `<p class="lnone">Missed one? It stays on the list as carried over until you do it. Pick your free days in Home › Settings.</p>`;
}
/* ---------- move list (Home › Verhuislijst) ----------
   Every product has a budget and a few options you like (links, photos, prices). When you buy one, the app
   keeps what you really paid, archives the other options and logs the purchase in Finance. */
const invAvg = id => { const p = invOpts(id).map(o => num(o.price)).filter(x => x != null); return p.length ? Math.round(p.reduce((a, b) => a + b, 0) / p.length) : null; };
const invBudget = r => num(r.budget) ?? invAvg(r.id);
const BIG = /bank|bed\b|matras|kast|tafel|stoel|bureau|dressoir|tv-meubel|ladekast|fauteuil|boekenkast|eettafel/i;
const invOpts = (id, all) => recs('invopts').filter(o => o.item === id && (all || !o.archived));
const invLive = () => recs('inventory').filter(r => !['Teruggestuurd', 'Weg'].includes(invStatus(r)));
const invMoney = r => { const b = num(r.budget), p = num(r.price); const est = b == null ? invAvg(r.id) : null; return invStatus(r) === 'Gekocht' ? (p != null ? eur(p) + (b != null ? (p > b ? ' · ' + eur(p - b) + ' boven' : p < b ? ' · ' + eur(b - p) + ' onder' : '') : '') : 'gekocht') : b != null ? 'budget ' + eur(b) : est != null ? '± ' + eur(est) : ''; };
const moveMonth = () => (C?.prefs?.().move || {}).month || '2027-07';
const moveGoal = () => recs('fgoals').find(g => /verhuiz/i.test(g.name || ''));
let invMigrated = false;
function invMigrate() {
  if (invMigrated || !C) return; invMigrated = true;
  const rows = recs('inventory').filter(r => INV_OLD.status[r.status] || INV_OLD.priority[r.priority] || INV_OLD.category[r.category] || !r.status).map(r => ({ id: r.id, kind: 'inventory', data: { ...dataOf(r), status: invStatus(r), ...(INV_OLD.priority[r.priority] ? { priority: INV_OLD.priority[r.priority] } : {}), ...(INV_OLD.category[r.category] ? { category: INV_OLD.category[r.category] } : {}), ...(r.price != null && r.budget == null && INV_WANT.includes(invStatus(r)) ? { budget: r.price, price: null } : {}) } }));
  for (const r of rows) for (const k of Object.keys(r.data)) if (r.data[k] == null) delete r.data[k];
  if (rows.length) putMany(rows, null, 'Verhuislijst naar het Nederlands').catch(() => { invMigrated = false; });
}
async function invBuy(id, optId) {
  const r = L.byId[id]; if (!r) return;
  const o = optId && L.byId[optId], guess = num(o?.price) ?? num(r.price) ?? num(r.budget) ?? '';
  const v = prompt(`Wat heb je betaald voor ${r.name}${o ? ` (${o.name})` : ''}?`, guess); if (v === null) return;
  const paid = num(String(v).replace(',', '.')), d = today();
  const rows = [{ id: r.id, kind: 'inventory', data: { ...dataOf(r), status: 'Gekocht', bought: r.bought || d, ...(paid != null ? { price: paid } : {}), ...(o ? { chosen: o.id, shop: r.shop || o.shop, url: r.url || o.url, photo: r.photo || o.photo } : {}) } }];
  for (const x of invOpts(r.id)) if (!o || x.id !== o.id) rows.push({ id: x.id, kind: 'invopts', data: { ...dataOf(x), archived: true } });
  if (o) rows.push({ id: o.id, kind: 'invopts', data: { ...dataOf(o), chosenFor: true, archived: false } });
  if (paid) {
    rows.push({ id: C.uuid(), kind: 'ftx', data: { name: r.name + (o?.shop ? ' · ' + o.shop : ''), amount: paid, date: d, account: fMainAcc()?.id, tags: ['verhuizen'], notes: 'Verhuislijst', created: Date.now() } });
    const g = moveGoal(); if (g && num(g.saved)) rows.push({ id: g.id, kind: 'fgoals', data: { ...dataOf(g), saved: Math.max(0, Math.round((num(g.saved) - paid) * 100) / 100) } });
  }
  for (const x of rows) for (const k of Object.keys(x.data)) if (x.data[k] == null) delete x.data[k];
  try { await putMany(rows, null, `${r.name} gekocht`); C.toast(paid ? `${r.name} gekocht voor ${eur(paid)}, ook in Finance` : `${r.name} gekocht`); openEditor('inventory', r.id); } catch { C.toast('Opslaan lukte niet. Probeer het opnieuw.'); }
}
function invOptionsPanel(r) {
  const list = invOpts(r.id), arch = invOpts(r.id, true).filter(o => o.archived && !o.chosenFor), bought = invStatus(r) === 'Gekocht';
  const card = o => `<div class="iopt ${o.chosenFor ? 'on' : ''}"><span class="iph">${o.photo ? `<img referrerpolicy="no-referrer" src="${esc(C.photoURL(o.photo))}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span><div><b>${esc(o.name || 'Optie')}</b><span>${o.priceNote ? `<em class="pdrop">${esc(o.priceNote)}</em>` : ''}${o.soldOut ? '<em class="pdrop">uitverkocht</em>' : ''}${esc([o.shop, num(o.price) ? eur(num(o.price)) : '', o.dims, o.used ? 'tweedehands' : '', o.score ? '★'.repeat(o.score) : '', num(r.budget) && num(o.price) ? (num(o.price) > num(r.budget) ? eur(num(o.price) - num(r.budget)) + ' boven budget' : 'binnen budget') : '', o.chosenFor ? 'gekozen' : ''].filter(Boolean).join(' · '))}</span>
    <div class="dbtns ioptb">${o.url ? `<a class="btn small" href="${esc(o.url)}" target="_blank" rel="noopener">Bekijk</a>` : ''}<button type="button" class="btn small" data-act="optopen" data-id="${o.id}">Bewerk</button>${!bought ? `<button type="button" class="btn small primary" data-act="optbuy" data-id="${r.id}" data-v="${o.id}">Deze gekocht</button>` : ''}</div></div></div>`;
  const tot = o => (num(o.price) || 0) + (num(o.shipping) || 0);
  const cheapest = list.filter(o => num(o.price) != null).sort((a, b) => tot(a) - tot(b))[0];
  const cmp = list.length > 1 ? `<details class="icmp"><summary>Vergelijk ${list.length} opties</summary><div class="icmpwrap"><table><thead><tr><th></th>${list.map(o => `<th>${o.photo ? `<img referrerpolicy="no-referrer" src="${esc(C.photoURL(o.photo))}" alt="" loading="lazy" onerror="this.remove()">` : ''}<b>${esc(o.name || 'Optie')}</b></th>`).join('')}</tr></thead><tbody>
      ${[['Prijs', o => num(o.price) != null ? eur(num(o.price)) + (o === cheapest ? ' ✓' : '') : ''], ['Bezorgen', o => num(o.shipping) != null ? eur(num(o.shipping)) : ''], ['Totaal', o => num(o.price) != null ? eur(tot(o)) : ''], ['Budget', o => num(r.budget) != null && num(o.price) != null ? (tot(o) > num(r.budget) ? '+' + eur(tot(o) - num(r.budget)) : 'binnen') : ''], ['Winkel', o => o.shop], ['Afmetingen', o => o.dims], ['Kleur', o => o.color], ['Materiaal', o => o.material], ['Levertijd', o => o.delivery], ['Mooi', o => o.score ? '★'.repeat(o.score) : ''], ['Tweedehands', o => o.used ? 'ja' : '']]
        .filter(([, f]) => list.some(o => f(o))).map(([l, f]) => `<tr><th>${l}</th>${list.map(o => `<td>${esc(f(o) || '–')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>` : '';
  return `<section class="ltipsteps"><div class="lph3"><h3>Opties${list.length ? ' · ' + list.length : ''}</h3><button type="button" class="chip" data-act="optadd" data-id="${r.id}">+ Handmatig</button></div>
    ${num(r.budget) == null && invAvg(r.id) != null ? `<div class="lwrap"><span class="lnone">Voorstel budget: ${eur(invAvg(r.id))} (gemiddelde van je opties)</span><button type="button" class="chip" data-act="invsetbudget" data-id="${r.id}" data-v="${invAvg(r.id)}">Gebruik</button></div>` : ''}
    ${BIG.test(r.name || '') || r.category === 'Meubels' ? `<p class="lnone"><a href="https://www.marktplaats.nl/q/${encodeURIComponent(r.name || '')}/#postcode:1315" target="_blank" rel="noopener">Zoek tweedehands op Marktplaats</a>: grote meubels zijn vaak bijna nieuw voor de helft.</p>` : ''}
    <div class="optlink"><input type="url" inputmode="url" placeholder="Plak een link naar een product" data-optlink aria-label="Link naar een optie"><button type="button" class="btn small primary" data-act="optlink" data-id="${r.id}">Toevoegen</button></div>
    ${list.length ? `<div class="iopts">${list.map(card).join('')}</div>${cmp}` : '<p class="lnone">Plak de link van een product dat je mooi vindt. De app haalt de foto, naam en prijs op. Bij het kopen kies je er één.</p>'}
    ${arch.length ? `<p class="lnone">${plural(arch.length, 'optie', 'opties')} gearchiveerd.</p>` : ''}
    ${!bought ? `<div class="dbtns"><button type="button" class="btn small" data-act="optbuy" data-id="${r.id}" data-v="">Gekocht zonder optie</button></div>` : ''}</section>`;
}
// one product line in the move views: photo of the chosen or first option, money, and how many options
function invLine(r) {
  const o = (r.chosen && L.byId[r.chosen]) || invOpts(r.id)[0], ph = r.photo || o?.photo, n = invOpts(r.id).length;
  return `<div class="lrow">${ph ? `<button class="lthumb" data-act="open" data-id="${r.id}" tabindex="-1" aria-hidden="true"><img referrerpolicy="no-referrer" src="${esc(C.photoURL(ph))}" alt="" loading="lazy" onerror="this.parentNode.remove()"></button>` : ''}<button class="lmain" data-act="open" data-id="${r.id}"><b>${esc(r.name || 'Product')}</b><span>${esc([r.room, invStatus(r), r.priority, n ? plural(n, 'optie', 'opties') : ''].filter(Boolean).join(' · '))}</span></button><span class="lside">${esc(invMoney(r))}</span>${INV_WANT.includes(invStatus(r)) ? `<button class="lquick" data-act="invbuy" data-id="${r.id}">Gekocht</button>` : ''}</div>`;
}
const invSum = (l, k) => l.reduce((n, r) => n + (num(r[k]) || 0), 0);
function invGroups(fill, keyOf, order) {
  invMigrate();
  const l = invLive(), g = {};
  for (const r of l) (g[keyOf(r) || 'Geen'] ||= []).push(r);
  const keys = [...order.filter(k => g[k]), ...Object.keys(g).filter(k => !order.includes(k)).sort()];
  fill.innerHTML = invTools() + (l.length ? keys.map(k => { const rs = g[k].sort((a, b) => (INV_STATUS.indexOf(invStatus(a)) - INV_STATUS.indexOf(invStatus(b))) || norm(a.name).localeCompare(norm(b.name))), done = rs.filter(r => invStatus(r) === 'Gekocht');
    return `<div class="lgh gshop"><h3>${esc(k)} · ${done.length}/${rs.length}</h3><span class="lnone">${esc([invSum(rs, 'budget') ? 'budget ' + eur(invSum(rs, 'budget')) : '', invSum(done, 'price') ? 'betaald ' + eur(invSum(done, 'price')) : ''].filter(Boolean).join(' · '))}</span></div><div class="lrows">${rs.map(invLine).join('')}</div>`; }).join('') : invEmpty());
}
const invTools = () => `<div class="ltools"><button class="btn small primary" data-act="new" data-v="inventory">+ Product</button><button class="btn small" data-act="invhave">+ Al gekocht</button></div>`;
const invEmpty = () => `<div class="banner">${quiet('Je verhuislijst is nog leeg. Begin met een startlijst per kamer, of voeg zelf producten toe.')}<button class="btn small primary" data-act="invstart">Startlijst toevoegen</button></div>`;
function invRooms(fill) { invGroups(fill, r => r.room, ROOMS); }
function invByStatus(fill) { invGroups(fill, r => invStatus(r), INV_STATUS); }
function invByPrio(fill) { invGroups(fill, r => r.priority, INV_PRIO); }
function invBoard(fill) {
  invMigrate();
  const items = invLive().filter(r => INV_WANT.includes(invStatus(r)) || invOpts(r.id).length);
  const tiles = items.flatMap(r => invOpts(r.id).filter(o => o.photo || o.url).map(o => ({ r, o })));
  fill.innerHTML = tiles.length ? [...new Set(tiles.map(t => t.r.room || 'Overig'))].map(room => `<h3 class="lgh">${esc(room)}</h3><div class="iboard">${tiles.filter(t => (t.r.room || 'Overig') === room).map(({ r, o }) => `<button class="itile ${o.chosenFor ? 'on' : ''}" data-act="open" data-id="${r.id}">${o.photo ? `<img referrerpolicy="no-referrer" src="${esc(C.photoURL(o.photo))}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span><b>${esc(r.name)}</b>${esc([o.name, num(o.price) ? eur(num(o.price)) : ''].filter(Boolean).join(' · '))}</span></button>`).join('')}</div>`).join('')
    : quiet('Voeg opties met een foto toe aan je producten, dan verschijnen ze hier als moodboard.');
}
const MOVE_START = { Woonkamer: ['Bank', 'Salontafel', 'Tv-meubel', 'Televisie', 'Vloerkleed', 'Gordijnen woonkamer', 'Staande lamp', 'Plafondlamp', 'Boekenkast'], Keuken: ['Pannenset', 'Koekenpan', 'Snijplank', 'Bestek', 'Servies', 'Glazen', 'Waterkoker', 'Magnetron', 'Airfryer', 'Afwasrek', 'Vuilnisbak', 'Vershoudbakjes', 'Ovenschaal'], Slaapkamer: ['Bed', 'Matras', 'Dekbed', 'Kussens', 'Dekbedovertrek', 'Kledingkast', 'Nachtkastje', 'Gordijnen slaapkamer', 'Passpiegel'], Werkkamer: ['Bureau', 'Bureaustoel', 'Bureaulamp', 'Kledingrek', 'Grote spiegel', 'Ringlamp', 'Achtergrond voor filmen', 'Opbergkast', 'Statief'], Badkamer: ['Handdoeken', 'Badmat', 'Douchewisser', 'Badkamerrek', 'Wc-borstel'], Entree: ['Kapstok', 'Schoenenrek', 'Deurmat'], Wasruimte: ['Wasmachine', 'Droogrek', 'Wasmand', 'Strijkijzer'], Schoonmaak: ['Stofzuiger', 'Emmer en dweil', 'Schoonmaakmiddelen'], Overig: ['Gereedschapset', 'Trapje', 'Verlengsnoeren', 'Rookmelder', 'Verbanddoos'] };
const MOVE_COSTS_START = [['Borg', 'Borg en huur'], ['Eerste maand huur', 'Borg en huur'], ['Verhuisbus', 'Verhuizen'], ['Verhuisdozen', 'Verhuizen'], ['Verf en kwasten', 'Klussen'], ['Vloer', 'Klussen'], ['Gordijnrails', 'Klussen'], ['Lampen ophangen', 'Klussen'], ['Internet aansluiten', 'Aansluitingen'], ['Energie en water', 'Aansluitingen']];
async function invStart() {
  const have = new Set(recs('inventory').map(r => norm(r.name))), costs = new Set(recs('movecosts').map(r => norm(r.name))), rows = [];
  for (const [room, l] of Object.entries(MOVE_START)) for (const name of l) if (!have.has(norm(name))) rows.push({ id: C.uuid(), kind: 'inventory', data: { name, room, status: 'Idee', created: Date.now() } });
  for (const [name, type] of MOVE_COSTS_START) if (!costs.has(norm(name))) rows.push({ id: C.uuid(), kind: 'movecosts', data: { name, type, created: Date.now() } });
  if (!rows.length) { C.toast('De startlijst staat er al in'); return; }
  try { await putMany(rows, null, 'Startlijst voor de verhuizing'); C.toast(`${plural(rows.length, 'ding', 'dingen')} op je verhuislijst. Verwijder wat je niet nodig hebt.`); } catch { C.toast('Opslaan lukte niet. Probeer het opnieuw.'); }
}
function invAnalysis(fill) {
  invMigrate();
  const l = invLive(), done = l.filter(r => invStatus(r) === 'Gekocht'), open = l.filter(r => INV_WANT.includes(invStatus(r)));
  const mc = recs('movecosts'), mcPaid = mc.filter(c => c.paid), mcOpen = mc.filter(c => !c.paid);
  const spent = invSum(done, 'price') + mcPaid.reduce((n, c) => n + (num(c.price ?? c.budget) || 0), 0);
  const toGo = open.reduce((n, r) => n + (invBudget(r) || 0), 0) + invSum(mcOpen, 'budget'), budgetAll = invSum(l, 'budget') + invSum(mc, 'budget');
  const noBudget = open.filter(r => invBudget(r) == null).length + mcOpen.filter(c => num(c.budget) == null).length;
  const m = moveMonth(), months = Math.max(1, (Number(m.slice(0, 4)) - new Date().getFullYear()) * 12 + Number(m.slice(5, 7)) - (new Date().getMonth() + 1));
  const g = moveGoal(), saved = num(g?.saved) || 0, perMonth = Math.max(0, toGo - saved) / months;
  const diff = done.filter(r => num(r.budget) != null && num(r.price) != null).map(r => [r, num(r.price) - num(r.budget)]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const over = diff.reduce((n, [, d]) => n + d, 0);
  const usedSaved = done.filter(r => r.chosen && L.byId[r.chosen]?.used && invBudget(r) != null && num(r.price) != null).reduce((n, r) => n + Math.max(0, invBudget(r) - num(r.price)), 0);
  const rooms = [...new Set(l.map(r => r.room || 'Overig'))].sort((a, b) => ROOMS.indexOf(a) - ROOMS.indexOf(b));
  const bar = (a, b) => `<div class="dbar"><i style="width:${b ? Math.min(100, 100 * a / b) : 0}%"></i></div>`;
  const monthName = fromISO(m + '-01').toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  fill.innerHTML = `${!l.length ? invEmpty() : ''}<div class="tiles">${fTile('Nog nodig', fEur0(toGo), noBudget ? `${plural(noBudget, 'ding', 'dingen')} zonder budget` : 'alles heeft een budget')}${fTile('Al uitgegeven', fEur0(spent), `${done.length} van ${l.length} producten gekocht`)}${fTile('Per maand sparen', fEur0(perMonth), `tot ${monthName}${saved ? `, ${eur(saved)} al gespaard` : ''}`)}${fTile('Budget vs betaald', (over > 0 ? '+' : over < 0 ? '−' : '') + fEur0(Math.abs(over)), over > 0 ? 'boven budget bij wat je kocht' : over < 0 ? 'onder budget bij wat je kocht' : 'precies op budget')}</div>
  <div class="panels">
    ${panel('Per kamer', `<div class="lrows">${rooms.map(room => { const rs = l.filter(r => (r.room || 'Overig') === room), d = rs.filter(r => invStatus(r) === 'Gekocht'); return `<div class="lrow iroom"><span class="lmain"><b>${esc(room)}</b><span>${d.length} van ${rs.length} gekocht · ${eur(invSum(d, 'price'))} betaald · ${eur(rs.filter(r => INV_WANT.includes(invStatus(r))).reduce((n, r) => n + (invBudget(r) || 0), 0))} nog nodig</span>${bar(d.length, rs.length)}</span></div>`; }).join('')}</div>`)}
    ${panel('Verhuiskosten', mc.length ? `<div class="lrows">${MOVE_TYPES.filter(t => mc.some(c => (c.type || 'Overig') === t)).map(t => { const cs = mc.filter(c => (c.type || 'Overig') === t); return `<div class="lrow"><span class="lmain"><b>${esc(t)}</b><span>${cs.filter(c => c.paid).length} van ${cs.length} betaald · budget ${eur(invSum(cs, 'budget'))}</span></span></div>`; }).join('')}</div>` : quiet('Nog geen verhuiskosten. Borg, verhuisbus, verf en aansluitingen komen erbij met de startlijst.'))}
    ${panel('Sparen', `<p class="lnone">Streefmaand: <input type="month" class="pill" data-movemonth value="${esc(m)}" aria-label="Verhuismaand"></p>
      ${g ? `<p class="lnone">Spaardoel ${esc(g.name)}: ${eur(saved)} van ${eur(num(g.target) || 0)}.</p><button class="btn small" data-act="movegoal">Spaardoel bijwerken naar ${eur(toGo)}</button>` : `<button class="btn small primary" data-act="movegoal">Maak spaardoel Verhuizen van ${eur(toGo)}</button>`}
      <p class="lnone">Het doel is wat nog nodig is: producten die je nog niet hebt en kosten die nog open staan.</p>`)}
    ${usedSaved ? panel('Tweedehands', `<p class="lbig">${eur(usedSaved)} bespaard</p><p class="lnone">Wat je onder budget bleef door tweedehands te kopen.</p>`) : ''}
    ${(() => { const g = recs('gear').filter(x => x.own); return g.length ? panel('Al in huis uit Kitchen gear', `<p class="lnone">${plural(g.length, 'keukenspul', 'keukenspullen')} die je al hebt, voor je eigen keuken: ${esc(g.slice(0, 8).map(x => x.name).join(', '))}${g.length > 8 ? '…' : ''}.</p>`, ['kitchen/gear', 'Kitchen gear']) : ''; })()}
    ${diff.length ? panel('Boven en onder budget', `<div class="lrows">${diff.slice(0, 8).map(([r, d]) => `<div class="lrow"><button class="lmain" data-act="open" data-id="${r.id}"><b>${esc(r.name)}</b><span>budget ${eur(num(r.budget))} · betaald ${eur(num(r.price))}</span></button><span class="lside ${d > 0 ? 'hot' : ''}">${d > 0 ? '+' : '−'}${eur(Math.abs(d))}</span></div>`).join('')}</div>`) : ''}
  </div>`;
}
async function moveGoalSync() {
  const open = invLive().filter(r => INV_WANT.includes(invStatus(r))), toGo = open.reduce((n, r) => n + (invBudget(r) || 0), 0) + invSum(recs('movecosts').filter(c => !c.paid), 'budget');
  const g = moveGoal(), by = moveMonth() + '-01';
  try { g ? await save(g, { target: Math.round(toGo * 100) / 100, by }) : await create('fgoals', { name: 'Verhuizen', target: Math.round(toGo * 100) / 100, saved: 0, by }); C.toast(g ? 'Spaardoel bijgewerkt' : 'Spaardoel Verhuizen staat in Finance'); } catch { C.toast('Opslaan lukte niet. Probeer het opnieuw.'); }
}
document.addEventListener('change', e => { const t = e.target; if (!C || !t.matches?.('[data-movemonth]') || !/^\d{4}-\d{2}$/.test(t.value)) return; C.savePrefs({ move: { ...(C.prefs().move || {}), month: t.value } }).catch(() => C.toast('Opslaan lukte niet.')); });
function homeToday(host) {
  const t = today();
  const chores = recs('chores').filter(c => choreDue(c) <= t).sort((a, b) => choreDue(a).localeCompare(choreDue(b)));
  const doneToday = recs('chores').filter(c => c.last === t);
  const plants = recs('plants').filter(p => plantDue(p) && plantDue(p) <= t);
  const reps = recs('repairs').filter(r => r.status !== 'Done').sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
  const inv = recs('inventory').filter(i => invStatus(i) === 'Gekocht');
  const worth = inv.reduce((s, i) => s + (num(i.price) || 0), 0);
  const wish = recs('inventory').filter(i => INV_WANT.includes(invStatus(i)));
  const must = sortList(wish.filter(i => ['Must-have', 'Eerste week'].includes(i.priority)), KINDS.inventory, 'room');
  const wishCost = wish.reduce((s, i) => s + (num(i.budget ?? i.price) || 0), 0);
  const wty = recs('inventory').filter(i => i.warranty && i.warranty >= t && i.warranty <= addDays(t, 90)).sort((a, b) => a.warranty.localeCompare(b.warranty));
  host.innerHTML = `${head('Home')}
  <div class="panels">
    ${wty.length ? panel('Warranty ending', `<div class="lrows">${wty.map(i => `<div class="lrow"><button class="lmain" data-act="open" data-id="${i.id}"><b>${esc(i.name)}</b><span>warranty until ${esc(niceDate(i.warranty))} · ${esc(relDay(i.warranty))}${i.receipt ? ' · receipt saved' : ' · no receipt yet'}</span></button></div>`).join('')}</div><p class="lnone">Something broken? Claim it before the date.</p>`, ['home/inventory', 'Inventory']) : ''}
    ${panel('Chores due', chores.length ? `<div class="lrows">${chores.slice(0, 10).map(row).join('')}</div>` : quiet(recs('chores').length ? 'All caught up.' : 'Add your chores with how often they need doing; they come back here when they’re due.'), ['home/chores', 'All chores'])}
    ${doneToday.length ? panel('Done today', `<div class="lrows">${doneToday.map(row).join('')}</div>`) : ''}
    ${panel('Plants to water', plants.length ? `<div class="lrows">${plants.map(row).join('')}</div>` : quiet(recs('plants').length ? 'Every plant has had water.' : 'Add your plants and how often they need water.'), ['home/plants', 'All plants'])}
    ${panel('Repairs and jobs', reps.length ? `<div class="lrows">${reps.slice(0, 6).map(row).join('')}</div>` : quiet('Nothing to fix.'), ['home/repairs', 'All repairs'])}
    ${panel('Still to buy', wish.length ? `<p class="lbig">${plural(wish.length, 'thing')}</p><p class="lnone">${must.length} must-have${must.length === 1 ? '' : 's'}${wishCost ? ', about ' + eur(wishCost) + ' for what has a price' : ''}.</p><div class="lrows">${must.slice(0, 5).map(row).join('')}</div>` : `<p class="lnone">${inv.length ? `You own ${plural(inv.length, 'thing')}${worth ? ' worth ' + eur(worth) : ''}.` : 'Keep track of what you own and what you still want for the house.'}</p>`, ['home/inventory', 'Open inventory'])}
  </div>`;
}

/* ---------- fitness ---------- */
// ideas from your own life; nothing is saved or shared until you tap Save, and never amounts or private things by itself
function lifeIdeas() {
  const t = today(), d30 = addDays(t, -30), out = [];
  const looks = C.outfits?.() || []; if (looks.length) out.push(['Outfits', `${looks.length} outfits in je closet: een "Outfits van de week" reel`]);
  const bought = recs('inventory').filter(r => invStatus(r) === 'Gekocht' && (r.bought || '') >= d30); if (bought.length) out.push(['Verhuizen', `Mijn nieuwste aankopen voor mijn eerste huis: ${bought.slice(0, 3).map(r => r.name).join(', ')}`]);
  const board = recs('invopts').filter(o => o.photo && !o.archived).length; if (board >= 4) out.push(['Inrichten', 'Moodboard: zo wil ik mijn eerste huis inrichten']);
  const rec = recs('recipes').filter(r => (r.created || 0) >= Date.parse(d30)); if (rec.length) out.push(['Eten', `Nieuw recept getest: ${rec[0].name}`]);
  if (recs('mealprep').length || curPlan()?.prep?.length) out.push(['Eten', 'Zondag meal prep: mijn lunches voor kantoor']);
  if (recs('skinlog').length >= 4) out.push(['Beauty', 'Mijn huid na een paar weken: wat werkte en wat niet']);
  const fav = recs('beauty').filter(b => b.fav || num(b.rating) >= 5); if (fav.length) out.push(['Beauty', `Favorieten die ik steeds opnieuw koop: ${fav.slice(0, 3).map(b => b.name).join(', ')}`]);
  if (recs('bdeals').length) out.push(['Budget', 'Beauty deals van deze week die echt de moeite waard zijn']);
  out.push(['Budget', 'Sparen voor mijn eerste huis: mijn systeem (zonder bedragen)']);
  const cs = cleanStats(); if (cs.start && !cs.before && cs.streak >= 30) out.push(['Gezonder', 'Een maand gezondere gewoontes: wat veranderde er (kies zelf wat je deelt)']);
  if (recs('nlog').length >= 7) out.push(['Gezonder', 'Leren ontbijten: mijn snelle hartige ontbijtjes']);
  const have = new Set(recs('cideas').map(x => norm(x.name)));
  return out.filter(([, n]) => !have.has(norm(n))).slice(0, 6);
}
function socialToday(host) {
  const t = today(), posts = recs('posts');
  const wk = weekStart(0), end = addDays(wk, 6);
  const upcoming = posts.filter(p => p.stage !== 'Posted' && p.date && p.date >= t).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).slice(0, 8);
  const late = posts.filter(p => p.stage !== 'Posted' && p.date && p.date < t);
  const week = posts.filter(p => p.date >= wk && p.date <= end), posted = week.filter(p => p.stage === 'Posted').length;
  const ideas = recs('cideas').filter(i => !['Dropped', 'Planned'].includes(i.status));
  const steps = posts.filter(p => p.stage !== 'Posted').flatMap(p => POST_STEPS.slice(0, 3).filter(([k, , upto]) => p[k] && p[k] <= addDays(t, 6) && !stepDone(p, upto)).map(([k, label]) => ({ p, k, label, on: p[k] }))).sort((a, b) => a.on.localeCompare(b.on));
  const untried = recs('stips').filter(x => !x.tried).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const tod = untried.length ? untried[Math.floor(fromISO(t).getTime() / 864e5) % untried.length] : null;
  const stepRow = x => `<div class="lrow"><button class="lmain" data-act="open" data-id="${x.p.id}"><b>${esc(x.label)}: ${esc(titleOf(x.p))}</b><span>${esc(x.on < t ? 'was ' + relDay(x.on) : relDay(x.on))}${x.p.date ? ' · post ' + esc(relDay(x.p.date)) : ''}</span></button></div>`;
  const goals = recs('sgoals').filter(g => !g.done);
  const deals = recs('deals').filter(d => !['Paid', 'Declined'].includes(d.status)).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const accs = recs('accounts').filter(a => a.active !== false).sort((a, b) => (num(b.followers) || 0) - (num(a.followers) || 0));
  const bar = g => { const pct = num(g.target) ? Math.min(100, Math.round(100 * (num(g.current) || 0) / num(g.target))) : 0; return `<div class="lrow"><button class="lmain" data-act="open" data-id="${g.id}"><b>${esc(titleOf(g))}</b><span>${esc([g.platform, g.metric, `${num(g.current) || 0} of ${num(g.target) || 0}`].filter(Boolean).join(' · '))}</span><span class="lprog"><i style="width:${pct}%"></i></span></button><span class="lside">${pct}%</span></div>`; };
  const due = tasksDue(), nextTasks = recs('tasks').filter(x => !taskDone(x) && x.date && x.date > t).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const projs = recs('projects').filter(p => p.status !== 'Completed').sort((a, b) => (a.end || '9').localeCompare(b.end || '9'));
  const pbar = p => { const ts = projTasks(p), pct = ts.length ? Math.round(100 * ts.filter(taskDone).length / ts.length) : 0; return `<div class="lrow"><button class="lmain" data-act="open" data-id="${p.id}"><b>${esc(titleOf(p))}</b><span>${esc(KINDS.projects.sub(p))}</span><span class="lprog"><i style="width:${pct}%"></i></span></button><span class="lside">${pct}%</span></div>`; };
  host.innerHTML = `${head('Social')}
  <div class="tiles lt3"><div class="tile"><div class="k">This week</div><div class="v">${week.length}</div><div class="h">${posted} posted</div></div>
    ${accs.slice(0, 2).map(a => `<div class="tile"><div class="k">${esc(a.platform || 'Account')}</div><div class="v">${(num(a.followers) || 0).toLocaleString('en-GB')}</div><div class="h">followers${a.freq ? ' · ' + esc(a.freq) : ''}</div></div>`).join('') || '<div class="tile"><div class="k">Followers</div><div class="v">–</div><div class="h">add your accounts under Brand</div></div>'}</div>
  <div class="panels">
    ${(() => { const ideas = lifeIdeas(); return ideas.length ? panel('Ideeën uit je leven', `<p class="lnone">Voorstellen op basis van wat er in je app gebeurt. Niets wordt gedeeld tot jij het kiest.</p><div class="lrows">${ideas.map(([t, n]) => `<div class="lrow"><span class="lmain"><b>${esc(n)}</b><span>${esc(t)}</span></span><button class="btn small" data-act="lifeidea" data-v="${esc(n)}">Bewaar</button></div>`).join('')}</div>`) : ''; })()}
    ${panel('Tasks', due.length || nextTasks.length ? `${due.length ? `<div class="lrows">${due.map(row).join('')}</div>` : quiet('Nothing due today.')}${nextTasks.length ? `<p class="dsub">Next</p><div class="lrows">${nextTasks.map(row).join('')}</div>` : ''}` : `${quiet('No open tasks with a date.')}<button class="btn small" data-act="new" data-v="tasks">Add a task</button>`, ['social/tasks', 'All tasks'])}
    ${projs.length ? panel('Projects', `<div class="lrows">${projs.slice(0, 5).map(pbar).join('')}</div>`, ['social/projects', 'All projects']) : ''}
    ${tod ? panel('Tip of the day', `<button class="lmain ltod" data-act="open" data-id="${tod.id}"><b>${esc(titleOf(tod))}</b><span>${esc([tod.category, tod.creator].filter(Boolean).join(' · '))}</span>${tod.summary ? `<p>${esc(tod.summary)}</p>` : ''}${tipSteps(tod).length ? `<ol>${tipSteps(tod).slice(0, 3).map(y => `<li>${esc(y)}</li>`).join('')}</ol>${tipSteps(tod).length > 3 ? `<span>and ${plural(tipSteps(tod).length - 3, 'more step')}</span>` : ''}` : ''}</button>`, ['social/tips', 'All tips']) : ''}
    ${steps.length ? panel('Making your posts', `<div class="lrows">${steps.slice(0, 8).map(stepRow).join('')}</div>`, ['social/posts', 'All posts']) : ''}
    ${panel('Coming up', upcoming.length ? `<div class="lrows">${upcoming.map(row).join('')}</div>` : `${quiet('No posts planned.')}<button class="btn small" data-act="new" data-v="posts">Plan a post</button>`, ['social/posts', 'All posts'])}
    ${late.length ? panel('Past their date', `<div class="lrows">${late.slice(0, 5).map(row).join('')}</div>`, ['social/posts', 'All posts']) : ''}
    ${panel('Goals', goals.length ? `<div class="lrows">${goals.slice(0, 5).map(bar).join('')}</div>` : quiet('Set a goal per platform and track how close you are.'), ['social/goals', 'All goals'])}
    ${panel('Collabs', deals.length ? `<div class="lrows">${deals.slice(0, 5).map(row).join('')}</div>` : quiet('No brand deals running.'), ['social/collabs', 'All collabs'])}
    ${panel('Ideas', ideas.length ? `<p class="lbig">${plural(ideas.length, 'idea')}</p><div class="lrows">${ideas.slice(0, 4).map(row).join('')}</div>` : quiet('Save ideas here so they are ready when you plan.'), ['social/ideas', 'All ideas'])}
  </div>`;
}

function fitToday(host) {
  const t = today(), ws = recs('workouts');
  const planned = ws.filter(w => !w.done && !w.skipped && w.date && w.date >= t).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const wk = weekStart(0), week = ws.filter(w => w.done && w.date >= wk && w.date <= addDays(wk, 6));
  const minsWeek = week.reduce((s, w) => s + (num(w.minutes) || 0), 0);
  const body = recs('body').filter(b => b.date && num(b.weight) != null).sort((a, b) => a.date.localeCompare(b.date));
  const last = body[body.length - 1], ref = body.filter(b => b.date <= addDays(t, -30)).pop() || body[0];
  const sets = recs('sets').filter(s => s.date && s.exercise).sort((a, b) => b.date.localeCompare(a.date));
  const prs = [], seen = new Set();
  for (const s of sets) { if (seen.has(s.exercise)) continue; seen.add(s.exercise); const p = prOf(s.exercise); if (p) prs.push(p); if (prs.length >= 5) break; }
  host.innerHTML = `${head('Fitness')}
  <div class="tiles lt3"><div class="tile"><div class="k">This week</div><div class="v">${week.length}</div><div class="h">${week.length === 1 ? 'workout' : 'workouts'} done</div></div>
    <div class="tile"><div class="k">Active time</div><div class="v">${minsWeek}</div><div class="h">minutes this week</div></div>
    <div class="tile"><div class="k">Weight</div><div class="v">${last ? last.weight : '–'}</div><div class="h">${last ? (ref && ref !== last ? `kg, ${(last.weight - ref.weight > 0 ? '+' : '') + (Math.round((last.weight - ref.weight) * 10) / 10)} since ${shortDate(ref.date)}` : 'kg on ' + shortDate(last.date)) : 'log it under Body'}</div></div></div>
  <div class="panels">
    ${(() => { const vw = todayVW(); return vw ? panel('Today’s video', `<div class="lrows">${row(vw)}</div>`, ['fit/library', 'Library']) : ''; })()}
    ${recs('fitgoals').some(g => !g.done) ? panel('Goals', `<div class="lrows">${recs('fitgoals').filter(g => !g.done).slice(0, 4).map(g => `<div class="lrow"><button class="lmain" data-act="open" data-id="${g.id}"><b>${esc(g.name || 'Goal')}</b><span>${esc(KINDS.fitgoals.sub(g))}</span><span class="lprog"><i style="width:${fitPct(g)}%"></i></span></button><span class="lside">${fitPct(g)}%</span></div>`).join('')}</div>`, ['fit/fgoals', 'All goals']) : ''}
    ${panel('Planned', planned.length ? `<div class="lrows">${planned.map(row).join('')}</div>` : `${quiet('No workouts planned.')}<button class="btn small" data-act="new" data-v="workouts">Plan a workout</button>`, ['fit/workouts', 'All workouts'])}
    ${panel('Personal records', prs.length ? `<div class="lrows">${prs.map(p => `<div class="lrow"><button class="lmain" data-act="open" data-id="${p.exercise}"><b>${esc(relName(p.exercise))}</b><span>${esc(niceDate(p.date))}</span></button><span class="lside">${p.weight} kg × ${p.reps || 1}</span></div>`).join('')}</div>` : quiet('Log your sets and your best lifts show up here.'), ['fit/exercises', 'Exercises'])}
  </div>`;
}
// the week plan: one video workout per day, chosen from your library
function fitWeekFill(fill) {
  const s = recs('fsched')[0], k = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
  fill.innerHTML = `<div class="lrows">${WEEK.map(([d, l]) => { const v = s?.[d] && L.byId[s[d]]; return `<div class="lrow ${d === k ? 'fwtoday' : ''}"><span class="rowlbl fwday">${l.slice(0, 3)}</span><span class="lmain"><b>${v ? esc(v.name) : 'Rest day'}</b>${v ? `<span>${esc(KINDS.vworkouts.sub(v))}</span>` : ''}</span>${v && d === k ? tick('Do it now', false, `data-act="quick" data-id="${v.id}"`) : ''}</div>`; }).join('')}</div>
  <button class="btn small mmore" data-act="${s ? 'open' : 'new'}" ${s ? `data-id="${s.id}"` : 'data-v="fsched"'}>${s ? 'Change the week' : 'Plan your week'}</button>`;
}
function bodyTop() {
  const b = recs('body').filter(x => x.date && num(x.weight) != null).sort((a, c) => a.date.localeCompare(c.date));
  if (b.length < 2) return '';
  const first = b[0], last = b[b.length - 1], d = Math.round((last.weight - first.weight) * 10) / 10;
  return `<div class="tiles lt3"><div class="tile"><div class="k">Now</div><div class="v">${last.weight}</div><div class="h">kg on ${shortDate(last.date)}</div></div>
    <div class="tile"><div class="k">Change</div><div class="v">${d > 0 ? '+' : ''}${d}</div><div class="h">kg since ${shortDate(first.date)}</div></div>
    <div class="tile"><div class="k">Lowest</div><div class="v">${Math.min(...b.map(x => x.weight))}</div><div class="h">kg</div></div></div>`;
}

/* ---------- overview helpers ---------- */
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const head = title => `<div class="viewhead"><h1>${esc(title)}</h1><span class="sub">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>`;
const dataTools = () => `<div class="ltools"><button class="chip link" data-act="export">Back up these lists</button></div>`;

/* ---------- editing a record ---------- */
// choice lists follow Settings: your own order, hidden options left out unless this record already uses one
const optCfg = (kind, k) => (C?.prefs?.() || {}).optLists?.[kind + '.' + k] || {};
function optsFor(kind, f, cur, D) {
  const cfg = optCfg(kind, f.k), hid = new Set((cfg.hidden || []).map(norm)), now = [].concat(cur || []).map(norm);
  const out = [], seen = new Set();
  const add = (v, force) => { if (v && !seen.has(norm(v)) && (force || !hid.has(norm(v)) || now.includes(norm(v)))) { seen.add(norm(v)); out.push(v); } };
  // a field that depends on another (a recipe's kind of dish on its category): only the suggestions for that choice
  const dv = f.dep && D ? D[f.dep] : '';
  if (f.dep && dv) {
    (f.depOpts?.[dv] || []).forEach(v => add(v));
    for (const r of recs(kind)) if (r[f.dep] === dv) [].concat(r[f.k] || []).forEach(v => add(v));
    [].concat(cur || []).forEach(v => add(v, true));
    return out;
  }
  (cfg.list || f.options || []).forEach(v => add(v));
  (f.more?.() || []).forEach(v => add(v));
  for (const r of recs(kind)) [].concat(r[f.k] || []).forEach(v => add(v));
  [].concat(cur || []).forEach(v => add(v, true));
  return out;
}
function fullOptions(id) {
  const [kind, k] = id.split('.'), f = KINDS[kind]?.fields.find(x => x.k === k), cfg = optCfg(kind, k);
  const out = [...(cfg.list || f?.options || [])], add = v => { if (v && !out.some(o => norm(o) === norm(v))) out.push(v); };
  for (const r of recs(kind)) [].concat(r[k] || []).forEach(add);
  return { list: out, hidden: cfg.hidden || [] };
}
async function renameOption(id, from, to) {
  const [kind, k] = id.split('.');
  for (const r of recs(kind)) {
    const v = r[k], hit = Array.isArray(v) ? v.includes(from) : v === from; if (!hit) continue;
    await put(kind, r.id, { ...dataOf(r), [k]: Array.isArray(v) ? v.map(x => x === from ? to : x) : to });
  }
}
function optionLists() {
  return SECTIONS.map(sec => {
    const own = new Set(sec.views.map(v => vkey(sec, v))), kinds = [...new Set(Object.entries(PAGES).filter(([pg]) => pg.startsWith(sec.key + '/') || own.has(pg)).flatMap(([, c]) => [...(c.segs || []).map(x => x.kind), ...(c.adds || [])]))].filter(k => KINDS[k]);
    const items = kinds.flatMap(kind => KINDS[kind].fields.filter(f => f.type === 'select' || f.type === 'multi').map(f => ({ id: kind + '.' + f.k, label: `${KINDS[kind].many}: ${f.label}` })));
    return { group: sec.label, key: sec.key, items };
  }).filter(g => g.items.length);
}
// choices are buttons up to this many, a dropdown above it
const CHIP_MAX = 12;
// lists with a natural order keep it; everything else is A to Z (your own order from Settings always wins)
const ORDERED = new Set(['good', 'cuisine', 'energy', 'mood', 'fill', 'meals', 'priority', 'status', 'unit', 'match', 'onDays', 'amDays', 'pmDays', 'step', 'again', 'angle', 'after', 'breakouts', 'redness', 'dryness', 'oiliness', 'stress', 'priority', 'prio', 'stage', 'status', 'cadence', 'freq', 'level', 'slot', 'funnel', 'effort', 'size', 'season', 'seasons', 'time', 'intake', 'when', 'day', 'days', 'nights', 'reheat', 'again', 'portion', 'mood', 'energy', 'quality']);
const sortOpts = (kind, f, opts) => optCfg(kind, f.k).list || ORDERED.has(f.k) ? opts : [...opts].sort((a, b) => norm(a).localeCompare(norm(b)));
function fieldInner(kind, f, D) {
  const v = D[f.k], id = 'lf-' + f.k;
  const lab = `<label for="${id}">${esc(f.label)}${f.unit ? ` <span class="muted">(${esc(f.unit)})</span>` : ''}</label>`;
  const span = `<span class="lflabel">${esc(f.label)}</span>`;
  switch (f.type) {
    case 'long': return lab + `<textarea id="${id}" data-k="${f.k}" rows="${f.rows || 4}">${esc(v || '')}</textarea>`;
    case 'ilines': return span + ilinesEditor(D);
    case 'steplist': return span + stepsEditor(D);
    case 'num': case 'money': return lab + `<input id="${id}" type="number" inputmode="decimal" step="any" data-k="${f.k}" data-num value="${v ?? ''}">`;
    case 'date': return lab + `<input id="${id}" type="date" data-k="${f.k}" value="${esc(v || '')}">`;
    case 'time': return lab + `<input id="${id}" type="time" data-k="${f.k}" value="${esc(v || '')}">`;
    case 'url': return lab + `<div class="lurl"><input id="${id}" type="url" inputmode="url" data-k="${f.k}" value="${esc(v || '')}" placeholder="https://">${v ? `<a class="iconbtn" href="${esc(v)}" target="_blank" rel="noopener" aria-label="Open link">${svg(P.link)}</a>` : ''}</div>`;
    case 'check': return `<button type="button" class="chip lcheck" data-chk="${f.k}" aria-pressed="${!!v}">${v ? svg(P.check) : ''}${esc(f.label)}</button>`;
    case 'rating': return span + `<div class="lrating">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-rate="${f.k}" data-v="${n}" aria-label="${n} of 5" aria-pressed="${(v || 0) >= n}">${svg(P.star)}</button>`).join('')}</div>`;
    case 'select': case 'multi': {
      if (f.dep && !D?.[f.dep] && !v) return span + `<p class="lnone">${esc(f.depHint || 'Kies eerst een categorie.')}</p>`;
      const sel = [].concat(v || []), opts = f.dep && D?.[f.dep] ? optsFor(kind, f, v, D) : sortOpts(kind, f, optsFor(kind, f, v, D));
      const add = `<input class="laddopt" data-addopt="${f.k}" placeholder="+ Add" aria-label="Add your own ${esc(f.label.toLowerCase())}" enterkeyhint="done">`;
      // many options: a dropdown, with what you picked shown as chips you can tap away
      if (opts.length > CHIP_MAX) return span + `<div class="lwrap">${f.type === 'multi' ? sel.map(o => `<button type="button" class="chip on" data-opt="${f.k}" data-v="${esc(o)}" aria-pressed="true">${esc(o)} ×</button>`).join('') : ''}</div>
        <div class="lpick"><select class="pill" data-optsel="${f.k}" aria-label="${esc(f.label)}"><option value="">${f.type === 'multi' ? 'Add…' : 'Choose…'}</option>${opts.map(o => `<option value="${esc(o)}" ${f.type !== 'multi' && sel.includes(o) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>${add}</div>`;
      return span + `<div class="lwrap">${opts.map(o => `<button type="button" class="chip" data-opt="${f.k}" data-v="${esc(o)}" aria-pressed="${sel.includes(o)}">${esc(o)}</button>`).join('')}${add}</div>`;
    }
    case 'pphoto': {
      const src = D._previews?.[f.k] || '';
      return span + `<div class="lphoto">${src ? `<img src="${esc(src)}" alt="">` : v ? `<img data-spath="${esc(v)}" alt="">` : ''}<div class="lphb"><label class="btn small">${v || src ? 'Replace' : 'Take or choose photo'}<input type="file" accept="image/*" capture="user" class="vh" data-photo="${f.k}"></label>${src || v ? `<button type="button" class="btn small ghost" data-photox="${f.k}">Remove</button>` : ''}</div><p class="lphnote">Only you can see this photo.</p></div>`;
    }
    case 'photo': {
      const src = D._previews?.[f.k] || (v ? C.photoURL(v) : '');
      return span + `<div class="lphoto">${src ? `<img referrerpolicy="no-referrer" src="${esc(src)}" alt="">` : ''}<div class="lphb"><label class="btn small">Choose photo<input type="file" accept="image/*" class="vh" data-photo="${f.k}"></label>${src ? `<button type="button" class="btn small ghost" data-photox="${f.k}">Remove</button>` : ''}</div><input type="url" inputmode="url" data-k="${f.k}" data-photourl value="${esc(/^https?:/.test(v || '') ? v : '')}" placeholder="or paste an image link (https://…)" aria-label="Image link"><p class="lphnote">Found it online? Right-click or long-press the product photo, choose Copy image address and paste it here.</p></div>`;
    }
    case 'video': {
      const src = D._previews?.[f.k] || (v ? C.photoURL(v) : '');
      return span + `<div class="lphoto lvideo">${src ? `<video src="${esc(src)}" controls playsinline preload="metadata"></video>` : ''}<div class="lphb"><label class="btn small">Choose video<input type="file" accept="video/*" class="vh" data-video="${f.k}"></label>${src ? `<button type="button" class="btn small ghost" data-photox="${f.k}">Remove</button>` : ''}</div><span class="lphnote muted">Up to 50 MB. A phone video of a minute or two fits.</span></div>`;
    }
    case 'rel': {
      // tap one of your own records; a dropdown when there are many; the search still adds a new one
      const ids = [].concat(v || []).filter(x => L.byId[x]), T = KINDS[f.to];
      const all = recs(f.to).filter(x => ids.includes(x.id) || !(T.hide?.(x))).sort((a, b) => norm(titleOf(a)).localeCompare(norm(titleOf(b))));
      const find = `<input type="search" data-relq="${f.k}" placeholder="Find or add ${esc(T.one)}" aria-label="Find or add ${esc(T.one)}" autocomplete="off"><div class="lwrap" data-relopts="${f.k}"></div>`;
      if (all.length && all.length <= CHIP_MAX) return span + `<div class="lwrap">${all.map(x => { const on = ids.includes(x.id); return `<button type="button" class="chip ${on ? 'on' : ''}" ${on ? `data-relx="${f.k}"` : `data-relpick="${f.k}"`} data-id="${x.id}" aria-pressed="${on}">${esc(titleOf(x))}</button>`; }).join('')}</div>${find}`;
      return span + `<div class="lwrap">${ids.map(x => `<button type="button" class="chip on" data-relx="${f.k}" data-id="${x}" aria-label="Remove ${esc(relName(x))}">${esc(relName(x))} ×</button>`).join('')}</div>
        ${all.length ? `<div class="lpick"><select class="pill" data-relsel="${f.k}" aria-label="${esc(f.label)}"><option value="">${f.multi ? 'Add…' : ids.length ? 'Change…' : 'Choose…'}</option>${all.filter(x => !ids.includes(x.id)).map(x => `<option value="${x.id}">${esc(titleOf(x))}</option>`).join('')}</select></div>` : ''}${find}`;
    }
    default: { const sg = textSugs(kind, f); return lab + `<input id="${id}" type="text" data-k="${f.k}" value="${esc(v || '')}" autocomplete="off"${sg.length ? ` data-sugk="${f.k}"` : ''}>${sg.length ? `<div class="lwrap ltsugs" data-sugs="${f.k}">${sg.map(o => `<button type="button" class="chip" data-tsug="${f.k}" data-v="${esc(o)}" aria-pressed="${norm(o) === norm(v || '')}">${esc(o)}</button>`).join('')}</div>` : ''}`; }
  }
}
/* fewer things to type: a text field offers what you wrote there before as buttons. Shops are one list for the
   whole app (the closet too); a name only offers names you used more than once, so unique titles stay quiet */
const SUG_SHOP = new Set(['shop', 'store', 'source', 'site', 'seller']);
const SUG_SKIP = new Set(['policy', 'phone', 'rename', 'url', 'link']);
function textSugs(kind, f) {
  if (SUG_SKIP.has(f.k) || !L?.all) return [];
  const K = KINDS[kind], title = f.k === K.fields[0]?.k, shop = SUG_SHOP.has(f.k), n = new Map();
  const add = v => { const t = String(v ?? '').trim(); if (!t || t.length > 40) return; const k = norm(t), e = n.get(k); e ? e.n++ : n.set(k, { v: t, n: 1 }); };
  for (const r of recs(kind)) add(r[f.k]);
  if (shop) { for (const r of L.all) for (const k of SUG_SHOP) if (r.kind !== kind) add(r[k]); for (const v of C.closetVals?.('shop') || []) add(v); }
  else if (f.k === 'brand') { for (const r of L.all) if (r.kind !== kind) add(r.brand); for (const v of C.closetVals?.('brand') || []) add(v); }
  return [...n.values()].filter(e => !title || e.n > 1).sort((a, b) => b.n - a.n).slice(0, 40).map(e => e.v).sort(azCmp);
}
// every shop you used anywhere in the app, for the closet's shop buttons
const allShops = () => { const out = []; for (const r of L.all || []) for (const k of SUG_SHOP) if (r[k] && String(r[k]).trim().length <= 40) out.push(String(r[k]).trim()); return out; };
function openEditor(kind, id, preset = {}) {
  const K = KINDS[kind], r = id ? L.byId[id] : null;
  const D = r ? JSON.parse(JSON.stringify(dataOf(r))) : { created: Date.now(), ...preset };
  if (kind === 'skinlog' && !r) { const wd = wdOf(); D.used = D.used || [...new Set([...skinSlot(wd, false), ...skinSlot(wd, true)].map(b => b.id))]; D.time = D.time || (new Date().getHours() < 15 ? 'Morning' : 'Evening'); const cy = cycleStats(); if (cy.last && !cy.guessed && cy.day) D.cycle = D.cycle ?? cy.day; }
  if (kind === 'beauty' && r) { if (!Array.isArray(D.amDays)) D.amDays = amDaysOf(r); if (!Array.isArray(D.pmDays)) D.pmDays = pmDaysOf(r); }
  if (kind === 'recipes') recipeToRows(D);
  D._blobs = {}; D._previews = {}; // one picked photo per photo field (a product photo and a receipt, say)
  if (!r) for (const f of K.fields) if (f.type === 'date' && D[f.k] === undefined && ['date', 'start'].includes(f.k)) D[f.k] = today();
  const sh = C.sheet({
    title: r ? titleOf(r) : 'New ' + K.one,
    body: `${r && WISHY[kind] && kind !== 'inventory' ? wishPanel(kind, id) : ''}${r && kind === 'recipes' ? reviewPanel(id) : ''}${r && kind === 'posts' ? postPanel(r) : ''}${r && kind === 'beauty' ? beautyReviews(r) : ''}${r && kind === 'inventory' ? invOptionsPanel(r) : ''}${r && kind === 'recipes' ? cookedPanel(r) : ''}${kind === 'stips' ? '<div data-tipsteps></div>' : ''}${kind === 'posts' ? '<div data-postkit></div><div data-posttips></div>' : ''}${r && kind === 'cideas' ? `<div class="lpostpub"><button type="button" class="btn small primary" data-act="mkpost" data-id="${r.id}">Make it a post</button><span class="lnone">It moves to Posts, ready to plan.</span></div>` : ''}${r && kind === 'posts' && r.stage !== 'Posted' ? `<div class="lpostpub"><button type="button" class="btn small" data-act="mkidea" data-id="${r.id}">Back to ideas</button></div>` : ''}<div class="form">${K.fields.map(f => `<div class="field ${f.half ? '' : 'full'}" data-f="${f.k}">${fieldInner(kind, f, D)}</div>`).join('')}</div>`,
    foot: `${r ? '<button class="btn danger" data-del>Delete</button>' : ''}<span class="busy" data-msg></span><div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary" data-save>Save</button>`,
    onClose: () => { Object.values(D._previews).forEach(u => URL.revokeObjectURL(u)); }
  });
  const fdef = k => K.fields.find(f => f.k === k);
  const redraw = k => { const el = sh.querySelector(`[data-f="${k}"]`); if (el) { el.innerHTML = fieldInner(kind, fdef(k), D); fillSigned(el); } };
  fillSigned(sh);
  const relOpts = (k, q) => {
    const f = fdef(k), box = sh.querySelector(`[data-relopts="${k}"]`), n = norm(q), have = [].concat(D[k] || []);
    if (!n) { box.innerHTML = ''; return; }
    const m = recs(f.to).filter(x => !have.includes(x.id) && norm(titleOf(x)).includes(n)).sort((a, b) => norm(titleOf(a)).indexOf(n) - norm(titleOf(b)).indexOf(n)).slice(0, 10);
    const exact = recs(f.to).some(x => norm(titleOf(x)) === n);
    box.innerHTML = m.map(x => `<button type="button" class="chip" data-relpick="${k}" data-id="${x.id}">${esc(titleOf(x))}</button>`).join('')
      + (exact || KINDS[f.to].fields[0].k !== 'name' ? '' : `<button type="button" class="chip ghost" data-relnew="${k}" data-v="${esc(q.trim())}">+ New ${esc(KINDS[f.to].one)} “${esc(q.trim())}”</button>`);
  };
  // a pasted image link shows straight away, so you see whether it works before saving
  const photoPreview = t => {
    const box = t.closest('.lphoto'), v = t.value.trim(), k = t.dataset.k;
    let img = box.querySelector(':scope > img');
    if (!/^https?:\/\/\S+$/.test(v)) { if (!D._previews[k]) img?.remove(); return; }
    if (D._previews[k]) { URL.revokeObjectURL(D._previews[k]); delete D._previews[k]; delete D._blobs[k]; }
    if (!img) { img = document.createElement('img'); img.referrerPolicy = 'no-referrer'; img.alt = ''; box.prepend(img); }
    img.onerror = () => { const n = box.querySelector('.lphnote'); if (n) n.textContent = 'That link doesn’t show a picture. Use the image address itself (right-click the photo, Copy image address).'; };
    img.onload = () => { const n = box.querySelector('.lphnote'); if (n) n.textContent = 'Shown from the web. Save to keep it.'; };
    img.src = v;
  };
  const pickRel = (k, rid) => { const f = fdef(k); D[k] = f.multi ? [...new Set([...[].concat(D[k] || []), rid])] : rid; redraw(k); };
  sh.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.k) { D[t.dataset.k] = t.dataset.num !== undefined ? num(t.value) : t.value; if (t.dataset.photourl !== undefined) { delete D._blobs[t.dataset.k]; photoPreview(t); } }
    if (t.dataset.relq) relOpts(t.dataset.relq, t.value);
    if (t.dataset.il !== undefined) { const x = D.ilines[+t.dataset.il]; if (x) x[t.dataset.ik] = t.value; }
    if (t.dataset.st !== undefined) D.steps[+t.dataset.st] = t.value;
    // while you type, the buttons narrow down to what matches; a full match shows them all again
    if (t.dataset.sugk) { const q = norm(t.value), bs = [...sh.querySelectorAll(`[data-tsug="${t.dataset.sugk}"]`)], exact = bs.some(b => norm(b.dataset.v) === q); bs.forEach(b => { b.hidden = !!q && !exact && !norm(b.dataset.v).includes(q); b.setAttribute('aria-pressed', norm(b.dataset.v) === q); }); }
  });
  sh.addEventListener('keydown', e => {
    const t = e.target;
    if (e.key !== 'Enter') return;
    if (t.dataset.addopt) {
      e.preventDefault(); const k = t.dataset.addopt, f = fdef(k), v = t.value.trim(); if (!v) return;
      D[k] = f.type === 'multi' ? [...new Set([...[].concat(D[k] || []), v])] : v; redraw(k);
    } else if (t.dataset.relq) { e.preventDefault(); sh.querySelector(`[data-relopts="${t.dataset.relq}"] button`)?.click(); }
  });
  sh.addEventListener('focusout', e => { const t = e.target; if (t.dataset?.addopt && t.value.trim()) { const k = t.dataset.addopt, f = fdef(k), v = t.value.trim(); D[k] = f.type === 'multi' ? [...new Set([...[].concat(D[k] || []), v])] : v; setTimeout(() => redraw(k), 0); } });
  sh.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.relsel && t.value) pickRel(t.dataset.relsel, t.value);
    if (t.dataset.optsel !== undefined) { const k = t.dataset.optsel, f = fdef(k); if (f.type === 'multi') { if (t.value) D[k] = [...new Set([...[].concat(D[k] || []), t.value])]; } else D[k] = t.value; redraw(k); }
  });
  sh.addEventListener('change', e => {
    const t = e.target; if (!t.dataset.video) return;
    const file = t.files?.[0], k = t.dataset.video; if (!file) return;
    if (file.size > 50e6) { C.toast(`That video is ${Math.round(file.size / 1e6)} MB; the limit is 50 MB. Shorten or compress it first.`); t.value = ''; return; }
    D._blobs[k] = file; if (D._previews[k]) URL.revokeObjectURL(D._previews[k]); D._previews[k] = URL.createObjectURL(file); redraw(k);
  });
  sh.addEventListener('change', async e => {
    const t = e.target; if (!t.dataset.photo) return;
    const file = t.files?.[0]; if (!file) return;
    const k = t.dataset.photo;
    try { D._blobs[k] = await C.photoToJpeg(file); if (D._previews[k]) URL.revokeObjectURL(D._previews[k]); D._previews[k] = URL.createObjectURL(D._blobs[k]); redraw(k); }
    catch { C.toast('That photo could not be read. Try another one.'); }
  });
  // a tip: its steps as a list to tick off while you film or edit (saved straight away)
  const drawTipSteps = () => {
    const box = sh.querySelector('[data-tipsteps]'); if (!box) return;
    const st = tipSteps(D), done = new Set([].concat(D.stepsDone || []));
    box.innerHTML = st.length ? `<section class="ltipsteps"><div class="lph3"><h3>Steps</h3>${done.size ? '<button type="button" class="chip link" data-tstepreset>Start over</button>' : ''}</div><ol>${st.map((x, i) => `<li><button type="button" class="ltstep" data-tstep="${i}" aria-pressed="${done.has(i)}"><i>${done.has(i) ? svg(P.check) : i + 1}</i><span>${esc(x)}</span></button></li>`).join('')}</ol><p class="lnone">${done.size}/${st.length} done</p></section>` : '';
  };
  // a post: the tips you picked, with their steps, and tips that fit the stage it is in
  const drawPostTips = () => {
    const box = sh.querySelector('[data-posttips]'); if (!box) return;
    const picked = [].concat(D.tips || []).map(i => L.byId[i]).filter(Boolean), cats = STAGE_TIPS[D.stage] || [];
    const sug = recs('stips').filter(x => cats.includes(x.category) && !picked.includes(x)).sort((a, b) => (!!a.tried - !!b.tried) || (num(b.worked) || 0) - (num(a.worked) || 0) || (b.fav ? 1 : 0) - (a.fav ? 1 : 0)).slice(0, 6);
    box.innerHTML = picked.length || sug.length ? `<section class="ltipsteps">${picked.map(x => `<details><summary><b>${esc(titleOf(x))}</b> <span class="lnone">${esc(x.category || '')}</span></summary><ol>${tipSteps(x).map(y => `<li>${esc(y)}</li>`).join('')}</ol></details>`).join('')}${sug.length ? `<p class="dsub">Tips for ${esc(D.stage || 'this post')}</p><div class="lwrap">${sug.map(x => `<button type="button" class="chip" data-tipadd="${x.id}">+ ${esc(titleOf(x))}</button>`).join('')}</div>` : ''}</section>` : '';
  };
  // a post: a script template, hashtag sets and the outfit from your closet
  const drawPostKit = () => {
    const box = sh.querySelector('[data-postkit]'); if (!box) return;
    const tpl = recs('stemplates').sort((a, b) => (a.format === D.format ? -1 : 0) - (b.format === D.format ? -1 : 0) || norm(a.name).localeCompare(norm(b.name)));
    const sets = recs('hashsets').sort((a, b) => (b.pillar === D.pillar) - (a.pillar === D.pillar) || norm(a.name).localeCompare(norm(b.name)));
    const looks = C.outfits?.() || [], look = looks.find(o => o.id === D.look);
    box.innerHTML = `<section class="ltipsteps lkit">
      <div class="lkrow"><span class="lbl">Script template</span>${tpl.length ? `<div class="lwrap">${tpl.slice(0, 8).map(x => `<button type="button" class="chip" data-usetpl="${x.id}">${esc(titleOf(x))}${x.format ? ` <span class="n">${esc(x.format)}</span>` : ''}</button>`).join('')}</div>` : '<span class="lnone">Make templates under Social › Toolkit.</span>'}</div>
      <div class="lkrow"><span class="lbl">Hashtag sets</span>${sets.length ? `<div class="lwrap">${sets.slice(0, 10).map(x => `<button type="button" class="chip" data-usetags="${x.id}">+ ${esc(titleOf(x))}</button>`).join('')}</div>` : '<span class="lnone">Save hashtag sets under Social › Toolkit.</span>'}</div>
      ${(() => { if (!D.look) return ''; const near = recs('posts').filter(p => p.id !== id && p.look === D.look && p.date && D.date && Math.abs(diffDays(p.date, D.date)) <= 28); return near.length ? `<p class="note">Deze outfit zat ook in ${esc(near.map(p => p.name || 'een post').join(', '))}, binnen 4 weken. Kies misschien een andere, of style hem anders.</p>` : ''; })()}
      <div class="lkrow"><span class="lbl">Outfit</span>${look ? `<div class="lkook"><div class="lkboard">${look.board}</div><b>${esc(look.name)}</b><button type="button" class="chip link" data-lookx>Remove</button></div>` : looks.length ? `<details><summary class="chip">Pick an outfit from your closet</summary><div class="outpick">${looks.map(o => `<button type="button" data-picklook="${o.id}">${o.board}<span>${esc(o.name)}</span></button>`).join('')}</div></details>` : '<span class="lnone">Save outfits in Closet › Outfits to pick one here.</span>'}</div>
    </section>`;
  };
  drawTipSteps(); drawPostTips(); drawPostKit();
  sh.addEventListener('click', e => {
    const u = e.target.closest('[data-usetpl]'); if (u) { const x = L.byId[u.dataset.usetpl], cur = String(D.script || '').trim(); D.script = cur ? cur + '\n\n' + (x.body || '') : (x.body || ''); redraw('script'); C.toast(`Template “${titleOf(x)}” is in your script`); return; }
    const h = e.target.closest('[data-usetags]'); if (h) { const x = L.byId[h.dataset.usetags], have = String(D.hashtags || '').split(/\s+/).filter(Boolean), add = String(x.tags || '').split(/[\s,]+/).filter(Boolean).map(w => w.startsWith('#') ? w : '#' + w); D.hashtags = [...new Set([...have, ...add])].join(' '); redraw('hashtags'); C.toast(`${plural(add.length, 'hashtag')} added`); return; }
    const pl = e.target.closest('[data-picklook]'); if (pl) { D.look = pl.dataset.picklook; drawPostKit(); return; }
    if (e.target.closest('[data-lookx]')) { delete D.look; drawPostKit(); return; }
    if (kind === 'posts' && e.target.closest('[data-opt="format"], [data-relpick="pillar"], [data-relx="pillar"]')) setTimeout(drawPostKit);
    const dop = e.target.closest('[data-opt]'); if (dop) for (const df of (KINDS[kind]?.fields || []).filter(x => x.dep === dop.dataset.opt)) setTimeout(() => { const ok = (df.depOpts?.[D[df.dep]] || []).includes(D[df.k]) || recs(kind).some(r => r[df.dep] === D[df.dep] && r[df.k] === D[df.k]); if (D[df.k] && !ok) delete D[df.k]; redraw(df.k); });
  });
  sh.addEventListener('click', e => {
    if (e.target.closest('[data-iladd], [data-iladdh]')) { const h = !!e.target.closest('[data-iladdh]'); D.ilines = [...(D.ilines || []), h ? { h: '' } : { q: '', u: '', n: '', note: '' }]; redraw('ilines'); sh.querySelector(`[data-il="${D.ilines.length - 1}"][data-ik="${h ? 'h' : 'q'}"]`)?.focus(); return; }
    const ilx = e.target.closest('[data-ilx]'); if (ilx) { D.ilines.splice(+ilx.dataset.ilx, 1); redraw('ilines'); return; }
    if (e.target.closest('[data-stadd]')) { D.steps = [...(D.steps || []), '']; redraw('steps'); sh.querySelector(`[data-st="${D.steps.length - 1}"]`)?.focus(); return; }
    const stx = e.target.closest('[data-stx]'); if (stx) { D.steps.splice(+stx.dataset.stx, 1); redraw('steps'); return; }
    const tg = e.target.closest('[data-tsug]'); if (tg) { const k = tg.dataset.tsug; D[k] = norm(D[k] || '') === norm(tg.dataset.v) ? '' : tg.dataset.v; redraw(k); return; }
    const ts = e.target.closest('[data-tstep], [data-tstepreset]');
    if (ts) { const i = Number(ts.dataset.tstep), done = new Set([].concat(D.stepsDone || [])); if (ts.dataset.tstepreset !== undefined) done.clear(); else done.has(i) ? done.delete(i) : done.add(i); D.stepsDone = [...done].sort((a, b) => a - b); drawTipSteps(); if (r) save(L.byId[r.id] || r, { stepsDone: D.stepsDone, ...(D.stepsDone.length && D.stepsDone.length === tipSteps(D).length && !D.tried ? { tried: (D.tried = true) } : {}) }); if (D.tried) redraw('tried'); return; }
    const ta = e.target.closest('[data-tipadd]'); if (ta) { D.tips = [...new Set([...[].concat(D.tips || []), ta.dataset.tipadd])]; redraw('tips'); }
    if (kind === 'posts') setTimeout(drawPostTips);
  });
  sh.addEventListener('change', () => { if (kind === 'stips') setTimeout(drawTipSteps); });
  sh.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.act === 'igpost') return igPostNow(d.id);
    if (d.act === 'ttpost') return ttPostNow(d.id);
    if (d.act === 'pnpin') return pnPinSheet(d.id);
    if (d.act === 'mkpost') return ideaToPost(d.id);
    if (d.act === 'newreview') { C.closeSheet(); return openEditor('breviews', null, { product: d.id, date: today(), after: d.v }); }
    if (d.act === 'bfill') { const r0 = L.byId[d.id]; if (!r0) return; const p = { fill: d.v, ...(d.v === 'Almost empty' && (num(r0.qty) ?? 1) <= 1 ? { low: true } : {}) }; Object.assign(D, p); sh.querySelectorAll('[data-act="bfill"]').forEach(x => { const on = x.dataset.v === d.v; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); const sel = sh.querySelector('select[data-k="fill"]'); if (sel) sel.value = d.v; if (p.low) { const lb = sh.querySelector('[data-act="blowsheet"]'); if (lb) { lb.classList.add('on'); lb.setAttribute('aria-pressed', 'true'); lb.innerHTML = svg(P.check) + ' Running low'; } const ck = sh.querySelector('[data-chk="low"]'); if (ck) { ck.setAttribute('aria-pressed', 'true'); ck.innerHTML = svg(P.check) + 'Running low'; } } return save(r0, p).then(() => p.low && !r0.low && C.toast(`${r0.name} is running low`)); }
    if (d.act === 'cooked') { const r0 = L.byId[d.id]; if (!r0) return; await cooked(r0); const bd = sh.querySelector('[data-cookedbody]'); if (bd) bd.hidden = false; b.disabled = true; b.textContent = 'In je dagcheck'; return; }
    if (d.act === 'icnt' || d.act === 'iout') { const i = L.byId[d.id]; if (!i) return; if (d.act === 'iout') await save(i, { stock: false, [CK(i)]: cntOf(i) != null ? 0 : undefined, ...(i.staple ? { list: true } : {}) }); else await countStep(d.id, Number(d.v)); const i2 = L.byId[d.id], lab = sh.querySelector(`[data-istep="${d.id}"] b`); if (lab && i2) lab.textContent = cntOf(i2) == null ? (i2.stock ? 'in huis' : 'op') : unitShort(cntOf(i2), unitOf(i2)); return; }
    if (d.act === 'cleft') { const r0 = L.byId[d.id]; if (!r0) return; const where = d.v; try { await create('ingredients', { name: 'Leftover: ' + titleOf(r0), category: 'Restjes', stock: true, portions: 1, ...(where === 'Freezer' ? { location: 'Vriezer', frozen: today() } : { location: 'Koelkast', expires: addDays(today(), 3) }) }); C.toast(where === 'Freezer' ? 'Restje in de vriezer' : 'Restje in de koelkast: eet het binnen 3 dagen'); b.disabled = true; } catch { C.toast('Opslaan lukte niet.'); } return; }
    if (d.act === 'creview') { C.closeSheet(); return openEditor('rreviews', null, { recipe: d.id, date: today() }); }
    if (d.act === 'invsetbudget') { const r0 = L.byId[d.id]; if (!r0) return; D.budget = Number(d.v); const inp = sh.querySelector('input[data-k="budget"]'); if (inp) inp.value = d.v; b.closest('.lwrap')?.remove(); return save(r0, { budget: Number(d.v) }).then(() => C.toast('Budget ingesteld')); }
    if (d.act === 'optlink') {
      const inp = sh.querySelector('[data-optlink]'), url = inp?.value.trim(); if (!url) { inp?.focus(); return; }
      b.disabled = true; b.textContent = 'Ophalen…';
      let info = {}; try { info = await C.callFn('offers', { action: 'linkinfo', url }); } catch { info = {}; }
      if (info.error) C.toast(info.error);
      const data = { item: d.id, url, name: info.name || (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Optie'; } })(), shop: info.shop, price: info.price, photo: info.photo, color: info.color, material: info.material, notes: info.priceNote ? 'Prijs: ' + info.priceNote : undefined, created: Date.now() };
      for (const k of Object.keys(data)) if (data[k] == null || data[k] === '') delete data[k];
      try { await create('invopts', data); C.toast(info.name ? 'Optie toegevoegd' : 'Optie toegevoegd. Vul naam en prijs zelf aan als ze ontbreken.'); C.closeSheet(); openEditor('inventory', d.id); } catch { C.toast('Opslaan lukte niet. Probeer het opnieuw.'); b.disabled = false; b.textContent = 'Toevoegen'; }
      return;
    }
    if (d.act === 'optadd') { C.closeSheet(); return openEditor('invopts', null, { item: d.id }); }
    if (d.act === 'optopen') { C.closeSheet(); return openEditor('invopts', d.id); }
    if (d.act === 'optbuy') { C.closeSheet(); return invBuy(d.id, d.v || null); }
    if (d.act === 'cnt') { const r0 = L.byId[d.id]; if (!r0) return; const p = countPatch({ ...r0, ...D, kind: r0.kind }, Number(d.v)); Object.assign(D, p); for (const [k, v] of Object.entries(p)) { const inp = sh.querySelector(`input[data-k="${k}"]`); if (inp) inp.value = v ?? ''; const ck = sh.querySelector(`[data-chk="${k}"]`); if (ck) { ck.setAttribute('aria-pressed', !!v); ck.innerHTML = (v ? svg(P.check) : '') + esc(K.fields.find(f => f.k === k)?.label || k); } } await save(r0, p).catch(() => C.toast('Could not save. Try again.')); const st = b.closest('.stepper'); if (st) st.outerHTML = stepper({ ...r0, ...D, kind: r0.kind, id: r0.id }); return; }
    if (d.act === 'blowsheet') { const b = L.byId[d.id]; if (!b) return; sh.querySelector('[data-chk="low"]')?.click(); const on = !!D.low; const btn = sh.querySelector('[data-act="blowsheet"]'); if (btn) { btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on); btn.innerHTML = on ? svg(P.check) + ' Running low' : 'Running low?'; } return save(b, { low: on }).then(() => C.toast(on ? 'On the running low list' : 'Taken off the running low list')); }
    if (d.act === 'mkidea') return postToIdea(d.id);
    if (d.opt) { const f = fdef(d.opt); if (f.type === 'multi') { const a = [].concat(D[d.opt] || []); const i = a.indexOf(d.v); i >= 0 ? a.splice(i, 1) : a.push(d.v); D[d.opt] = a; } else D[d.opt] = D[d.opt] === d.v ? '' : d.v; redraw(d.opt); }
    else if (d.chk) { D[d.chk] = !D[d.chk]; redraw(d.chk); }
    else if (d.rate) { const n = Number(d.v); D[d.rate] = D[d.rate] === n ? 0 : n; redraw(d.rate); }
    else if (d.relx) { const f = fdef(d.relx); D[d.relx] = f.multi ? [].concat(D[d.relx] || []).filter(x => x !== d.id) : ''; redraw(d.relx); }
    else if (d.relpick) pickRel(d.relpick, d.id);
    else if (d.relnew) { const f = fdef(d.relnew); try { const nid = await create(f.to, { name: d.v }); pickRel(d.relnew, nid); } catch {} }
    else if (d.photox) { const k = d.photox; D[k] = ''; delete D._blobs[k]; if (D._previews[k]) URL.revokeObjectURL(D._previews[k]); delete D._previews[k]; redraw(k); }
    else if (b.hasAttribute('data-del')) {
      if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Tap again to delete'; return; }
      try { await del(r.id); C.closeSheet(); C.toast('Deleted'); } catch {}
    }
    else if (b.hasAttribute('data-save')) {
      const msg = sh.querySelector('[data-msg]');
      const first = K.fields[0];
      if (['text'].includes(first.type) && !String(D[first.k] || '').trim() && !K.title) { msg.textContent = `Give it a ${first.label.toLowerCase()} first.`; sh.querySelector(`[data-k="${first.k}"]`)?.focus(); return; }
      b.disabled = true;
      try {
        for (const pf of K.fields.filter(f => f.type === 'pphoto')) {
          if (D._blobs[pf.k]) { msg.textContent = 'Uploading photo…'; const old = r?.[pf.k]; D[pf.k] = await skinUpload(D._blobs[pf.k]); if (old && old !== D[pf.k]) skinRemove(old); }
          else if (r?.[pf.k] && r[pf.k] !== D[pf.k]) skinRemove(r[pf.k]);
        }
        for (const pf of K.fields.filter(f => f.type === 'photo' || f.type === 'video')) {
          if (D._blobs[pf.k]) { msg.textContent = pf.type === 'video' ? 'Uploading video… this can take a minute' : 'Uploading photo…'; const old = r?.[pf.k]; D[pf.k] = pf.type === 'video' ? await C.uploadFile(D._blobs[pf.k]) : await C.uploadPhoto(D._blobs[pf.k]); if (old && old !== D[pf.k]) C.deletePhoto(old); }
          else if (r?.[pf.k] && r[pf.k] !== D[pf.k] && !/^https?:/.test(r[pf.k])) C.deletePhoto(r[pf.k]);
        }
        if (kind === 'beauty') { D.amDays = [].concat(D.amDays || []); D.pmDays = [].concat(D.pmDays || []); D.am = D.amDays.length > 0; D.pm = D.pmDays.length > 0; }
        const out = {}; for (const [k, v] of Object.entries(D)) if (!k.startsWith('_') && v !== '' && v != null && !(Array.isArray(v) && !v.length && !['amDays', 'pmDays'].includes(k))) out[k] = v;
        if (out.name) out.name = String(out.name).trim();
        if (kind === 'ingredients' && !out.type && ingGuess(out.name)) out.type = ingGuess(out.name);
        if (kind === 'recipes') recipeBeforeSave(out);
        await put(kind, r ? r.id : C.uuid(), out);
        C.closeSheet(); C.toast('Saved');
      } catch (err) { console.error(err); msg.textContent = 'Could not save. Try again.'; b.disabled = false; }
    }
  });
}
function openRecord(id) {
  const r = L.byId[id]; if (!r) return;
  if (r.kind === 'recipes') openRecipe(r); else openEditor(r.kind, id);
}

/* ---------- moving data in and out ---------- */
function pickFile() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.className = 'vh';
  document.body.appendChild(inp);
  inp.addEventListener('change', async () => { const f = inp.files?.[0]; inp.remove(); if (f) importFile(f); });
  inp.click();
}
/* ---------- backups from the Ultimate Budget Planner ----------
   Its backup (app "finnest-ultimate-dashboard") turns into Money records. Ids are UUID v5 of the planner's own ids,
   so importing a newer backup updates what is already here instead of adding everything twice. */
const isBudgetBackup = j => j && !Array.isArray(j) && (j.app === 'finnest-ultimate-dashboard' || (j.data && Array.isArray(j.data.transactions) && Array.isArray(j.data.bills)));
const UBP_NS = '6f1c2a7e-3b4d-4e5f-8a9b-0c1d2e3f4a5b';
async function uuid5(name, ns = UBP_NS) {
  const nb = Uint8Array.from(ns.replace(/-/g, '').match(/../g).map(h => parseInt(h, 16)));
  const h = new Uint8Array(await crypto.subtle.digest('SHA-1', new Uint8Array([...nb, ...new TextEncoder().encode(name)]))).slice(0, 16);
  h[6] = (h[6] & 0x0f) | 0x50; h[8] = (h[8] & 0x3f) | 0x80;
  const x = [...h].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
async function fromBudgetBackup(j) {
  const d = j.data || j, ids = new Map();
  const U = async old => { if (!old) return ''; if (!ids.has(old)) ids.set(old, await uuid5('ubp:' + old)); return ids.get(old); };
  const out = [], clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length)));
  const add = async (old, kind, data) => out.push({ id: await U(old), kind, data: clean(data) });
  const occKey = async o => (await U(o.billId)) + '@' + o.dueDate;
  for (const a of d.accounts || []) await add(a.id, 'faccounts', { name: a.name, type: { spending: 'Spending', savings: 'Savings', card: 'Card' }[a.kind] || 'Spending', safe: !!a.includeInSafe, archived: !!a.archived });
  for (const c of d.categories || []) await add(c.id, 'fcats', { name: c.name, emoji: c.emoji, budget: c.v3PayPlan ?? c.budget });
  for (const x of d.debts || []) await add(x.id, 'fdebts', { name: x.name, balance: x.openingBalance ?? x.balance, opened: x.openingDate, seq: x.openingSeq, apr: x.apr, payment: x.payment, dueDay: x.dueDay, account: await U(x.accountId) });
  for (const c of d.balanceChecks || []) await add(c.id, 'fchecks', { account: await U(c.accountId), amount: c.amount, at: (c.at || '').slice(0, 10), seq: c.seq, notes: c.note });
  for (const b of d.bills || []) {
    const ev = b.cadence === 'everyN';
    await add(b.id, 'fbills', { name: b.name, amount: b.amount, type: b.debtId ? 'Debt' : b.v3Type === 'subscription' ? 'Subscription' : 'Bill',
      cadence: ev ? 'Every N months' : { monthly: 'Monthly', yearly: 'Yearly', weekly: 'Weekly' }[b.cadence] || 'Monthly', every: ev ? b.everyN : null,
      anchor: b.anchorDate, ends: b.v3Ends, account: await U(b.accountId), category: await U(b.categoryId), debt: await U(b.debtId), active: b.active !== false, url: b.v3Url });
  }
  const occs = new Map((d.billOccs || []).map(o => [o.id, o]));
  for (const o of d.billOccs || []) if (o.paid || o.skipped)
    await add('occ:' + o.id, 'fpaid', { occ: await occKey(o), bill: await U(o.billId), date: o.dueDate, paid: !!o.paid, skipped: !!o.skipped, paidOn: o.paidOn, tx: await U(o.paidTxnId) });
  for (const t of d.transactions || []) {
    const o = occs.get(t.billOccId), bill = o && (d.bills || []).find(b => b.id === o.billId);
    await add(t.id, 'ftx', { name: t.note || 'Purchase', amount: t.amount, date: t.date, seq: t.seq, category: await U(t.categoryId), account: await U(t.accountId), bill: o ? await occKey(o) : null, debt: await U(t.cardPaymentFor || bill?.debtId) });
  }
  for (const i of d.income || []) await add(i.id, 'fincome', { name: i.label, amount: i.amount, date: i.date, seq: i.seq, type: i.kind === 'pay' ? 'Pay' : 'Other', account: await U(i.accountId), confirmed: i.confirmed !== false });
  for (const c of d.quickChips || []) await add(c.id, 'fchips', { name: c.label, emoji: c.emoji, amount: c.amount, category: await U(c.categoryId), account: await U(c.accountId) });
  for (const r of d.v3Rules || []) await add(r.id, 'frules', { contains: r.contains, category: await U(r.categoryId), rename: r.rename });
  const st = d.settings || {};
  // your payday and buffer live on one settings record; keep the one already here if there is one
  const fs = recs('fset')[0];
  out.push({ id: fs?.id || await U('settings'), kind: 'fset', data: clean({ payday: st.payday, payAmount: st.v3PayAmount, buffer: st.buffer, cycle: 'Monthly' }) });
  return out;
}
/* the same recipe twice: a name that only differs in capitals, accents or punctuation ("30-Minute Brothy Rice" and
   "30 minute brothy rice"), the same Albo or web link, or the same photo */
const looseName = v => deUml(v || '').replace(/[^a-z0-9]+/g, ' ').trim();
const sameKeys = r => [looseName(titleOf(r)) && 'n:' + looseName(titleOf(r)), r.link && 'l:' + String(r.link).trim().toLowerCase(), /^https?:/.test(r.photo || '') && 'p:' + r.photo].filter(Boolean);
function recipeDups() {
  const rs = recs('recipes'), parent = new Map(rs.map(r => [r.id, r.id])), find = id => { while (parent.get(id) !== id) id = parent.get(id); return id; };
  const seen = new Map(); for (const r of rs) for (const k of sameKeys(r)) { if (seen.has(k)) parent.set(find(r.id), find(seen.get(k))); else seen.set(k, r.id); }
  const groups = new Map(); for (const r of rs) { const g = find(r.id); (groups.get(g) || groups.set(g, []).get(g)).push(r); }
  // the copy that stays: the one with most of your own things (made it, rating, in a plan), then the most filled in, then the oldest
  const uses = id => recs('meals').filter(m => m.recipe === id).length + recs('rreviews').filter(x => x.recipe === id).length;
  const score = r => (num(r.rating) ? 5 : 0) + (r.fav ? 3 : 0) + (num(r.cooks) || 0) * 2 + uses(r.id) * 2 + Object.values(dataOf(r)).filter(v => !isEmptyVal(v)).length / 10;
  return [...groups.values()].filter(l => l.length > 1).map(l => { const keep = [...l].sort((a, b) => score(b) - score(a) || (a.created || 0) - (b.created || 0))[0]; return { keep, gone: l.filter(r => r !== keep) }; });
}
const recipeDupNote = () => { let n = 0; try { n = recipeDups().reduce((a, g) => a + g.gone.length, 0); } catch {} return n ? `<div class="note tnote fdupnote"><span>${n === 1 ? 'Er staat 1 recept dubbel' : `Er staan ${n} recepten dubbel`}.</span><button class="btn small primary" data-act="rdups">Dubbele opruimen</button></div>` : ''; };
function rDups() {
  const gs = recipeDups(); if (!gs.length) { C.toast('No duplicate recipes.'); return; }
  const n = gs.reduce((a, g) => a + g.gone.length, 0);
  const sh = C.sheet({ title: 'Duplicate recipes', body: `<p class="lnone">Each recipe stays once: the copy with your own rating, notes and meal plans. It gets what the other copy had and it lacked. You can undo this right after.</p><div class="lrows">${gs.map(g => `<div class="lrow"><span class="lmain"><b>${esc(titleOf(g.keep))}</b><span>${esc(g.gone.map(titleOf).filter(t => t !== titleOf(g.keep)).join(', ') || 'same name')}</span></span><span class="lside">${g.gone.length + 1}×</span></div>`).join('')}</div>`,
    foot: '<span class="busy" data-msg></span><div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary" data-go>Clean up ' + n + '</button>' });
  sh.querySelector('[data-go]').onclick = async e => {
    e.target.disabled = true; const msg = sh.querySelector('[data-msg]'); msg.textContent = 'Cleaning up…';
    const map = new Map(), fillIn = new Map();
    for (const g of gs) for (const r of g.gone) { map.set(r.id, g.keep.id); (fillIn.get(g.keep.id) || fillIn.set(g.keep.id, []).get(g.keep.id)).push(r); }
    const changes = [];
    for (const r of L.all) {
      if (map.has(r.id)) continue;
      let d = relink(dataOf(r), map);
      for (const o of fillIn.get(r.id) || []) for (const [k, v] of Object.entries(dataOf(o))) if (isEmptyVal(d[k]) && !isEmptyVal(v)) d = { ...d, [k]: v };
      if (r.kind === 'recipes' && fillIn.has(r.id)) d = { ...d, cooks: (num(d.cooks) || 0) + fillIn.get(r.id).reduce((a, o) => a + (num(o.cooks) || 0), 0) || undefined };
      if (JSON.stringify(d) !== JSON.stringify(dataOf(r))) changes.push({ id: r.id, kind: r.kind, data: JSON.parse(JSON.stringify(d)) });
    }
    const old = [...[...map.keys()].map(id => L.byId[id]), ...changes.map(c => L.byId[c.id])].map(r => ({ id: r.id, kind: r.kind, data: dataOf(r) }));
    const ids = [...map.keys()], now = new Date().toISOString();
    try {
      for (let i = 0; i < changes.length; i += 400) { const { error } = await C.sb.from('records').upsert(changes.slice(i, i + 400).map(r => ({ user_id: C.uid(), id: r.id, kind: r.kind, data: r.data, updated_at: now }))); if (error) throw error; }
      for (let i = 0; i < ids.length; i += 200) { const { error } = await C.sb.from('records').delete().in('id', ids.slice(i, i + 200)); if (error) throw error; }
    } catch (err) { console.error(err); msg.textContent = ''; C.toast('Could not clean up. Reload and try again.'); e.target.disabled = false; return; }
    const gone = new Set(ids), ch = new Map(changes.map(c => [c.id, c]));
    L.all = L.all.filter(r => !gone.has(r.id)).map(r => ch.has(r.id) ? { ...ch.get(r.id).data, id: r.id, kind: r.kind } : r);
    index(); cacheSave(); C.closeSheet(); C.render();
    C.undoPush?.(`Removed ${plural(ids.length, 'duplicate recipe')}`, () => putMany(old, null, 'restore'), true);
  };
}
/* a file can ask to fill in only (mode "fill", like the Albo recipes): a recipe with the same name as one you
   already have keeps everything you filled in yourself and only gets what is still empty */
const isEmptyVal = v => v == null || v === '' || (Array.isArray(v) && !v.length);
function fillMatch(rows) {
  const byName = new Map(); for (const k of new Set(rows.map(r => r.kind))) for (const r of recs(k)) for (const key of sameKeys(r)) if (!byName.has(k + '#' + key)) byName.set(k + '#' + key, r.id);
  let added = 0, filled = 0, same = 0;
  const out = rows.map(r => {
    const id = L.byId[r.id] ? r.id : sameKeys({ ...r.data, kind: r.kind }).map(k => byName.get(r.kind + '#' + k)).find(Boolean) || r.id, have = L.byId[id];
    if (!have) { added++; return { ...r, id }; }
    const cur = dataOf(have), data = { ...cur };
    let n = 0; for (const [k, v] of Object.entries(r.data)) if (isEmptyVal(cur[k]) && !isEmptyVal(v)) { data[k] = v; n++; }
    n ? filled++ : same++;
    return n ? { ...r, id, data } : null;
  }).filter(Boolean);
  return { rows: out, added, filled, same };
}
async function importFile(file) {
  let rows, fill = null;
  try {
    const j = JSON.parse(await file.text());
    if (j && !Array.isArray(j) && j.mode === 'fill') fill = true;
    rows = (isBudgetBackup(j) ? await fromBudgetBackup(j) : Array.isArray(j) ? j : j.records || []).filter(r => r && r.id && KINDS[r.kind] && r.data && typeof r.data === 'object');
  } catch { rows = null; }
  if (!rows?.length) { C.toast('That file has no lists this app can read.'); return; }
  const mt = importMatch(rows); rows = mt.rows;
  if (fill) { fill = fillMatch(rows); rows = fill.rows; if (!rows.length) { C.toast(`Nothing to add: all ${plural(fill.same, 'record')} are already complete.`); return; } }
  const keep = rows.filter(r => !r.photoData && /^https?:/.test(r.data.photo || '') && L.byId[r.id]?.photo && !/^https?:/.test(L.byId[r.id].photo));
  keep.forEach(r => { r.data.photo = L.byId[r.id].photo; });
  const counts = {}; for (const r of rows) counts[r.kind] = (counts[r.kind] || 0) + 1;
  const fresh = rows.filter(r => !L.byId[r.id]).length;
  const sh = C.sheet({
    title: fill ? 'Import and fill in' : 'Import',
    body: fill ? `<p>${fill.added ? `This adds ${plural(fill.added, 'new record')}.` : ''} ${fill.filled ? `${plural(fill.filled, 'record')} you already have ${fill.filled === 1 ? 'gets' : 'get'} only what is still empty; what you filled in yourself stays.` : ''} ${fill.same ? `${plural(fill.same, 'record')} ${fill.same === 1 ? 'is' : 'are'} already complete and ${fill.same === 1 ? 'stays' : 'stay'} as ${fill.same === 1 ? 'it is' : 'they are'}.` : ''}</p>
      <div class="lrows">${Object.entries(counts).sort((a, b) => azCmp(KINDS[a[0]].many, KINDS[b[0]].many)).map(([k, n]) => `<div class="lrow"><span class="lmain"><b>${esc(KINDS[k].many)}</b></span><span class="lside">${n}</span></div>`).join('')}</div>` : `<p>This adds ${plural(rows.length, 'record')}${fresh !== rows.length ? `, ${fresh} of them new. The other ${rows.length - fresh} are already here and get the values from the file; what the file leaves out stays as it is` : ''}.${mt.matched ? ` ${plural(mt.matched, 'item')} with the same name as one that is already here ${mt.matched === 1 ? 'is' : 'are'} not added again.` : ''}</p>
      <div class="lrows">${Object.entries(counts).sort((a, b) => azCmp(KINDS[a[0]].many, KINDS[b[0]].many)).map(([k, n]) => `<div class="lrow"><span class="lmain"><b>${esc(KINDS[k].many)}</b></span><span class="lside">${n}</span></div>`).join('')}</div>`,
    foot: `<span class="busy" data-msg></span><div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary" data-go>Import ${rows.length}</button>`
  });
  sh.querySelector('[data-go]').onclick = async e => {
    const b = e.target, msg = sh.querySelector('[data-msg]'); b.disabled = true;
    try {
      // photos travel inside the file; each one goes to your photo storage once, a re-import keeps the copy already there
      const pics = rows.filter(r => r.photoData);
      for (const [n, r] of pics.entries()) {
        const have = L.byId[r.id]?.photo;
        if (have) r.data.photo = have;
        else {
          msg.textContent = `Uploading photo ${n + 1} of ${pics.length}…`;
          try { r.data.photo = await C.uploadPhoto(await (await fetch(r.photoData)).blob()); } catch (err) { console.error(err); }
        }
      }
      // a record that's already here keeps what the file doesn't mention (its photo, ticks you set in the app)
      await putMany(rows.map(({ id, kind, data }) => ({ id, kind, data: L.byId[id] ? { ...dataOf(L.byId[id]), ...data } : data })), (n, all) => { msg.textContent = `Saving ${n} of ${all}…`; }, `Imported ${plural(rows.length, 'record')}`);
      C.closeSheet(); C.toast(`Imported ${plural(rows.length, 'record')}`);
    }
    catch (err) { console.error(err); msg.textContent = isMissing(err) ? 'The records table is missing in Supabase. See the setup steps.' : 'Could not import. Try again.'; b.disabled = false; if (isMissing(err)) { L.missing = true; C.render(); } }
  };
}
function exportAll() {
  const name = `jettas-closet-lists-${today()}.json`;
  const blob = new Blob([JSON.stringify({ app: 'Jetta’s Closet', exported: new Date().toISOString(), records: L.all.map(r => ({ id: r.id, kind: r.kind, data: dataOf(r) })) }, null, 1)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) { navigator.share({ files: [file] }).catch(() => {}); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
const SQL = `create table if not exists public.records (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id uuid not null,
  kind text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.records enable row level security;
create policy "Your own records" on public.records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter publication supabase_realtime add table public.records;`;
function setupCard(host) {
  host.dataset.sig = '';
  host.innerHTML = `<div class="viewhead"><h1>One step in Supabase</h1></div>
  <div class="panel lsetup"><p>Kitchen, Life, Home, Social, Money and Fitness keep their lists in a new table called <span class="mono">records</span>. Create it once and every device can use it:</p>
    <ol><li>Open your project on <a href="https://supabase.com/dashboard" target="_blank" rel="noopener">supabase.com</a> and go to <b>SQL Editor</b>.</li><li>Paste the code below and press <b>Run</b>.</li><li>Come back here and tap <b>Check again</b>.</li></ol>
    <pre class="lsql">${esc(SQL)}</pre>
    <div class="lbar"><button class="btn" data-act="copysql">Copy the code</button><button class="btn primary" data-act="recheck">Check again</button></div></div>`;
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  if (!L.sel || !C) return;
  const b = e.target.closest('[data-lfill].selecting [data-act="open"][data-id]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const id = b.dataset.id; L.sel.ids.has(id) ? L.sel.ids.delete(id) : L.sel.ids.add(id);
  const host = b.closest('#viewHost') || document; drawSel(host, L.sel.page, (L.sel.visible || []).map(x => L.byId[x]).filter(Boolean));
}, true);
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if (!b || !C || b.closest('.sheet') && !['open', 'new'].includes(b.dataset.act)) return;
  const d = b.dataset, page = C.view(), u = PAGES[page] ? uiOf(page) : null;
  switch (d.act) {
    case 'open': openRecord(d.id); break;
    case 'new': openEditor(d.v, null); break;
    case 'quick': { const r = L.byId[d.id]; KINDS[r?.kind]?.quick?.(r)?.act(); break; }
    case 'go': C.go(d.v); break;
    case 'ingview': try { localStorage.setItem(d.k, d.v); } catch {} C.render(); break;
    case 'ingtypeadd': openEditor('ingredients', null, { category: d.cat, type: d.type, ...(d.ctx === 'freezer' ? { location: 'Vriezer', stock: true, frozen: today() } : d.ctx === 'grocery' ? { list: true } : { stock: true }) }); break;
    case 'icalnew': { if (C.prefs().calToken && !confirm('Een nieuwe sleutel maakt je huidige abonnementen ongeldig. Doorgaan?')) break; const tok = (C.uuid() + C.uuid()).replace(/-/g, '').slice(0, 40); C.savePrefs({ calToken: tok }).then(() => { L.calFeedAt = 0; calFeedSync(true).then(() => C.render()); C.toast('Sleutel gemaakt. Zet hem in Supabase als CAL_TOKEN.'); }).catch(() => {}); break; }
    case 'icaltest': {
      const out = document.querySelector('[data-icalmsg]'), show = m => { if (out) out.textContent = m; else C.toast(m); };
      show('Bezig met testen…');
      calFeedSync(true).catch(() => {}).then(() => fetch(icalUrl('all').replace(/^webcal:/, 'https:'), { cache: 'no-store' })).then(async r => {
        const body = await r.text();
        if (r.ok && body.includes('BEGIN:VCALENDAR')) show(`Het werkt: ${(body.match(/BEGIN:VEVENT/g) || []).length} items gevonden. Tik nu op Abonneer.`);
        else if (r.status === 403) show('De sleutel in de app is niet gelijk aan CAL_TOKEN in Supabase. Tik op Kopieer sleutel en plak hem opnieuw als CAL_TOKEN.');
        else if (r.status === 404 && !/unknown calendar/.test(body)) show('De functie calendar bestaat nog niet in Supabase. Maak hem aan met de stappen uit de chat.');
        else show('Supabase zegt: ' + body.slice(0, 160));
      }).catch(() => show('Geen antwoord van de functie. Werk de functie calendar in Supabase bij met de nieuwste code en probeer opnieuw.'));
      break; }
    case 'icalcopy': navigator.clipboard?.writeText(d.v).then(() => C.toast('Gekopieerd')).catch(() => C.toast('Kopiëren lukte niet')); break;
    case 'icalsync': L.calFeedAt = 0; calFeedSync(true).then(() => { C.toast('Calendar bijgewerkt'); C.render(); }); break;
    case 'anaper': try { localStorage.setItem('anaPeriod', d.v); } catch {} C.render(); break;
    case 'calview': { const c = calLoad(); c.view = d.v; try { localStorage.setItem('calView', d.v); } catch {} C.render(); break; }
    case 'calstep': { const c = calLoad(), n = +d.v; c.date = c.view === 'month' ? (() => { const x = fromISO(c.date); return iso(new Date(x.getFullYear(), x.getMonth() + n, 1)); })() : addDays(c.date, n * (c.view === 'week' ? 7 : c.view === 'agenda' ? 30 : 1)); C.render(); break; }
    case 'calgo': { const c = calLoad(); c.date = d.v; if (!d.keep) c.view = 'day'; C.render(); break; }
    case 'calcat': { const c = calLoad(); c.off.has(d.v) ? c.off.delete(d.v) : c.off.add(d.v); try { localStorage.setItem('calOff', JSON.stringify([...c.off])); } catch {} C.render(); break; }
    case 'caladd': calAdd(d.v); break;
    case 'calopenday': { const c = calLoad(); c.date = d.v; c.view = 'day'; C.go('plan/week'); break; }
    case 'seg': u.seg = d.v; u.facet = ''; C.render(); break;
    case 'facet': u.facet = u.facet === d.v ? '' : d.v; u.facet2 = ''; C.render(); break;
    case 'facet2': u.facet2 = u.facet2 === d.v ? '' : d.v; C.render(); break;
    case 'filter': u.filter[curSeg(page).key] = d.v; C.render(); break;
    case 'showall': u.all = !u.all; C.render(); break;
    case 'lview': { const K = KINDS[curSeg(page).kind]; setViewMode(K, d.v); const host = b.closest('#viewHost'); if (host) host.dataset.sig = ''; C.render(); break; }
    case 'week': L.week = d.v === '0' ? 0 : L.week + Number(d.v); C.render(); break;
    case 'slot': openSlot(d.date, d.slot); break;
    case 'buy': { const r = L.byId[d.id]; if (r) { b.classList.add('on'); const n = (L.buyN ||= {})[r.id] ?? stepOf(r), have = cntOf(r) || 0; delete L.buyN[r.id]; setTimeout(() => save(r, { list: false, stock: true, [CK(r)]: Math.round((have + n) * 100) / 100, low: false }), 220); } break; }
    case 'buyn': { const r = L.byId[d.id]; if (!r) break; const m = (L.buyN ||= {}); m[r.id] = Math.max(stepOf(r), (m[r.id] ?? stepOf(r)) + Number(d.v) * stepOf(r)); C.render(); break; }
    case 'unlist': { const r = L.byId[d.id]; if (r) save(r, { list: false }); break; }
    case 'tolist': { const r = L.byId[d.id]; if (r) { save(r, { list: true }); const inp = $('.lqadd input'); if (inp) { inp.value = ''; inp.focus(); } } break; }
    case 'supp': toggleSupp(d.id, d.t); break;
    case 'envmode': saveFset({ envMode: d.v }); break;
    case 'envstep': { const c = L.byId[d.id]; if (c) save(c, { budget: Math.max(0, (num(c.budget) || 0) + Number(d.v)) }); break; }
    case 'everymode': L.everyMode = d.v; C.render(); break;
    case 'everytag': L.everyQ = norm(L.everyQ) === d.v ? '' : d.v; C.render(); break;
    case 'paidmore': L.paidLim = (L.paidLim || 20) + 30; C.render(); break;
    case 'everymore': L.everyLim = (L.everyLim || 50) + 50; C.render(); break;
    case 'calmove': L.calOff = d.v === '0' ? 0 : (L.calOff || 0) + Number(d.v); C.render(); break;
    case 'newbill': openEditor('fbills', null, { type: d.v, cadence: 'Monthly', active: true }); break;
    case 'splitsug': saveFset({ split: null }); break;
    case 'fgtile': { const g = L.byId[d.id]; if (!g) break; const f = gridFilled(g), i = +d.v, on = !f.has(i), amt = gridTiles(g)[i] || 0; on ? f.add(i) : f.delete(i); L.gpick = null; save(g, { filled: [...f] }); const goal = g.goal && L.byId[g.goal]; if (goal) save(goal, { saved: Math.max(0, (num(goal.saved) || 0) + (on ? amt : -amt)) }); if (on) C.toast(`${eur(amt)} put by`); break; }
    case 'fgpick': { const g = L.byId[d.id]; if (!g) break; const f = gridFilled(g), tl = gridTiles(g), free = tl.map((a, i) => [a, i]).filter(([, i]) => !f.has(i)); if (!free.length) { C.toast('Every tile is filled. Well done!'); break; } const spare = Math.max(0, fState().perDay || 0), fit = free.filter(([a]) => a <= Math.max(spare, Math.min(...free.map(x => x[0])))), [a, i] = fit[Math.floor(Math.random() * fit.length)]; L.gpick = { id: g.id, i }; C.render(); C.toast(`Put ${eur(a)} by today`); break; }
    case 'fwset': { const r = L.byId[d.id]; if (!r) break; if (d.v === 'Bought' && recs('faccounts').length) { buyWish(r.kind, r.id); break; } if (r.kind === 'fwait') { save(r, { status: d.v }); C.toast(d.v === 'Let go' ? `${eur(num(r.price) || 0)} not spent` : 'Enjoy it'); } else if (d.v === 'Let go') dropWish(r.kind, r.id); else save(r, { status: 'Bought' }); break; }
    case 'fwnew': openEditor('wishes', null, { status: 'Wish', since: today(), wait: WAIT_DAYS * 24, category: 'Other' }); break;
    case 'fcsv': pickCsv(); break;
    case 'fdups': fDups(); break;
    case 'rdups': rDups(); break;
    case 'fpaydates': fPayDates(); break;
    case 'finsmove': insMove(); break;
    case 'fclear': fClear(); break;
    case 'acchist': accHistory(d.id); break;
    case 'fmove': moveMoney(); break;
    case 'feedtab': L.feedTab = d.v; C.render(); break;
    case 'feednew': openEditor('posts', null, { platforms: [L.feedNet || 'Instagram'], stage: 'Planned', ...(L.feedNet === 'TikTok' ? { format: 'Short Video' } : {}) }); break;
    case 'feednet': L.feedNet = d.v; C.render(); break;
    case 'netsync': netSync(d.v, false); break;
    case 'ttconnect': ttConnect(); break;
    case 'feedacc': openEditor('accounts', null, { platform: 'Instagram', active: true }); break;
    case 'wishf': { const b2 = document.querySelector(`.wtable [data-src="${CSS.escape(d.v)}"]`); b2?.closest('.wtable')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); break; }
    case 'wishgo': if (d.v === 'wish/master') { const u = uiOf('wish/master'); u.seg = 'all'; u.allSrc = d.src; } if (d.v === 'money/plan') uiOf('money/plan').seg = 'wait'; C.go(d.v); break;
    case 'wmovewait': moveWaitList(); break;
    case 'dkeep': case 'dplan': case 'dgroc': dealsAct(d.act, d.k, Number(d.i)); break;
    case 'cnt': countStep(d.id, Number(d.v)); break;
    case 'crave': cravingSheet(); break;
    case 'lifeidea': create('cideas', { name: d.v, type: 'Post idea', status: 'Idea', source: 'Uit je leven' }).then(() => C.toast('Bewaard bij Content ideas')).catch(() => C.toast('Opslaan lukte niet.')); break;
    case 'cleanlog': openEditor('cleanlog', null, { date: today(), time: new Date().toTimeString().slice(0, 5), type: d.v, ...(d.v === 'Gekocht' ? { amount: CLEAN().price } : { count: 1 }) }); break;
    case 'cleanstart': { const v = document.querySelector('[data-cleandate]')?.value || addDays(today(), 21); cleanSet({ date: v }); break; }
    case 'cleanswaps': { const rows = ['Kauwgom', 'Knäckebröd', 'Muntthee', 'Gemberthee', 'Worteltjes'].map(n => ingRow(n, { list: true })); putMany(rows, null, 'Vervangers op de lijst').then(() => C.toast('Vervangers staan op je boodschappenlijst')).catch(() => {}); break; }
    case 'cleanmove': cleanMoveWeek(); break;
    case 'buffer': bufferGoal(); break;
    case 'incomefin': incomeToFinance(d.v); break;
    case 'nlset': { const r = nlOn(today()) || {}; nlSet({ [d.v]: r[d.v] === d.d ? null : d.d }); break; }
    case 'tl': { if (d.nl) { nlToggle(d.nl); break; } if (d.nlk) { nlToggle(d.nlk); break; } const t0 = today(), set = tlDone(t0); set.has(d.v) ? set.delete(d.v) : set.add(d.v); tlSave(t0, set); C.render(); break; }
    case 'invbuy': invBuy(d.id); break;
    case 'invstart': invStart(); break;
    case 'discstart': discStart(); break;
    case 'affmanage': C.affirmManage?.(); break;
    case 'invhave': openEditor('inventory', null, { status: 'Gekocht', bought: today(), notes: 'Al gekocht voor de verhuizing' }); break;
    case 'movegoal': moveGoalSync(); break;
    case 'nl': nlToggle(d.v); break;
    case 'nlstep': nlStep(d.v, Number(d.d)); break;
    case 'away': toggleAway(d.v); break;
    case 'hadbf': hadBreakfast(); break;
    case 'office': { const o = new Set(food().office || ['Mon', 'Tue', 'Thu']); o.has(d.v) ? o.delete(d.v) : o.add(d.v); C.savePrefs({ food: { ...food(), office: WEEKDAYS.filter(x => o.has(x)) } }).catch(() => C.toast('Could not save. Try again.')); break; }
    case 'shopday': C.savePrefs({ food: { ...food(), shopDay: food().shopDay === d.v ? '' : d.v } }).catch(() => C.toast('Could not save. Try again.')); break;
    case 'leftover': leftover(d.id, d.v); break;
    case 'buyfreeze': { const r = L.byId[d.id]; const n = r && ((L.buyN ||= {})[r.id] ?? 1); if (r) save(r, { list: false, stock: true, location: 'Vriezer', frozen: today(), unit: r.unit || 'portie', amount: Math.round(((cntOf(r) || 0) + n) * 100) / 100 }).then(() => C.toast(`${r.name} is in the freezer`)); break; }
    case 'paid': { const env = groceryEnv(); openEditor('ftx', null, { name: 'Boodschappen ' + d.v, date: today(), category: env?.id, account: fMainAcc()?.id }); break; }
    case 'blow': { const r = L.byId[d.id]; if (r) save(r, { low: !r.low }).then(() => C.toast(r.low ? 'Taken off the running low list' : 'On the running low list: the weekly task looks for deals')); break; }
    case 'freeze': { const o = L.byId[d.id]; openEditor('ingredients', null, { name: o?.name || '', category: 'Vlees & vis', location: 'Vriezer', stock: true, frozen: today(), notes: o ? [o.store, o.deal, num(o.price) ? eur(num(o.price)) : ''].filter(Boolean).join(' · ') : '' }); break; }
    case 'freezeuse': { const r = L.byId[d.id]; if (!r) break; const n = num(r.portions); if (n > 1) save(r, { portions: n - 1 }); else { save(r, { portions: null, stock: false, frozen: null }); C.toast(`${r.name} is out of the freezer`); } break; }
    case 'butcherlist': { const r = ingRow(d.v, { list: true, notes: myButcher() ? 'Slager: ' + myButcher().name : 'Slager' }); putMany([r], null, `Put ${d.v} on the grocery list`).then(() => C.toast('On your grocery list, for the butcher')).catch(() => C.toast('Could not save. Try again.')); break; }
    case 'quitadd': quitAdd(); break;
    case 'triptab': L.tripTab = d.v; C.render(); break;
    case 'igpost': igPostNow(d.id); break;
    case 'mkpost': ideaToPost(d.id); break;
    case 'mkidea': postToIdea(d.id); break;
    case 'ttpost': ttPostNow(d.id); break;
    case 'pnconnect': pnConnect(); break;
    case 'pnsync': pnSync(); break;
    case 'pnpin': pnPinSheet(d.id); break;
    case 'pnnext': L.pnShift = (L.pnShift || 0) + 1; C.render(); break;
    case 'quitset': quitSet(); break;
    case 'chfree': { const c = C.prefs().chores || {}, f = new Set(c.free || []); f.has(d.v) ? f.delete(d.v) : f.add(d.v); C.savePrefs({ chores: { ...c, free: WDAYS.filter(x => f.has(x)) } }).catch(() => C.toast('Could not save. Try again.')); break; }
    case 'potmove': { const b = L.byId[d.v], n = b && fNext(b); if (!b) break; const to = b.account || fMainAcc()?.id; moveMoney({ from: d.id, to, amt: num(b.amount) || '', date: n ? (addDays(n, -1) < today() ? today() : addDays(n, -1)) : today() }); break; }
    case 'tripopen': case 'tripnew': case 'tripedit': case 'trippack': case 'tripck': case 'tripckdel': case 'tripcksug': case 'tripidea': case 'tripideadel': case 'tripideaday': case 'tripagdel': case 'tripbudget': case 'tripcost': case 'tripdet': tripAct(d.act, d.v); break;
    case 'mmonth': L.mealMonth = (L.mealMonth || 0) + Number(d.v); C.render(); break;
    case 'mday': mealDay(d.v); break;
    case 'mallsrc': uiOf('wish/master').allSrc = d.v; C.render(); break;
    case 'tidy': tidyRun(); break;
    case 'dealsall': L.dealsAll = !L.dealsAll; C.render(); break;
    case 'ibxok': inboxAccept(d.id); break;
    case 'ibxall': inboxAcceptAll(d.v); break;
    case 'ibxmore': L.ibxMore = (L.ibxMore || 60) + 60; C.render(); break;
    case 'ibxskip': { const r = L.byId[d.id]; if (r) save(r, { status: 'Skipped', doneAt: Date.now() }).then(() => C.toast('Skipped')); break; }
    case 'openitem': C.openItem?.(d.id); break;
    case 'hday': { const r = L.byId[d.id]; if (r) toggleDay(r, d.d); break; }
    case 'water': water(Number(d.v)); break;
    case 'watergoal': { const v = prompt('How many glasses a day?', C.prefs().waterGoal || 8); const n = Math.round(Number(v)); if (n > 0 && n < 40) C.savePrefs({ waterGoal: n }).catch(() => C.toast('Could not save. Try again.')); break; }
    case 'periodstart': create('cycles', { start: today() }).then(() => C.toast('Logged. Tap “Period ended” when it’s over.')).catch(() => {}); break;
    case 'periodend': { const r = L.byId[d.id]; if (r) save(r, { end: today() }); break; }
    case 'fcheck': fCheckSheet(); break;
    case 'fsink': { const b = L.byId[d.id]; if (b) save(b, { sink: !b.sink }); break; }
    case 'fall': L.fall = (L.fall || 50) + 50; C.render(); break;
    case 'fafford': fAfford(fState()); break;
    case 'fchip': case 'frepeat': { const x = L.byId[d.id]; if (x) fQuick(x); break; }
    case 'fnothing': { const r = recs('fset')[0]; (r ? save(r, { nothingOn: today() }) : create('fset', { nothingOn: today() }).catch(() => {})); C.toast('Nothing spent today. Noted.'); break; }
    case 'fpay': case 'fskip': {
      const o = fOccs(addDays(fStart(), -62), addDays(today(), 400)).find(x => x.key === d.v); if (!o) break;
      if (d.act === 'fpay') fPayOcc(o); else create('fpaid', { occ: o.key, bill: o.bill.id, date: o.date, skipped: true }).then(() => C.toast('Skipped')).catch(() => {});
      break;
    }
    case 'selmode': L.sel = L.sel?.page === page ? null : { page, ids: new Set() }; C.render(); break;
    case 'selall': if (L.sel) { const vis = L.sel.visible || [], allOn = vis.every(id => L.sel.ids.has(id)); vis.forEach(id => allOn ? L.sel.ids.delete(id) : L.sel.ids.add(id)); C.render(); } break;
    case 'seldel': {
      if (!L.sel?.ids.size) break;
      const n = L.sel.ids.size; if (!confirm(`Delete ${n} ${n === 1 ? 'item' : 'items'}? You can undo it right after.`)) break;
      const gone = [...L.sel.ids].map(id => L.byId[id]).filter(Boolean).map(r => ({ id: r.id, kind: r.kind, data: dataOf(r) }));
      L.batch = true;
      try { for (const r of gone) await del(r.id); L.sel.ids.clear(); } catch { C.toast('Could not delete them all. Try again.'); }
      finally { L.batch = false; }
      C.undoPush?.(`Deleted ${n} ${n === 1 ? 'item' : 'items'}`, () => putMany(gone, null, 'restore'), true);
      C.render(); break;
    }
    case 'selset': if (L.sel?.ids.size) selSet(curSeg(page).kind); break;
    case 'import': pickFile(); break;
    case 'export': exportAll(); break;
    case 'copysql': navigator.clipboard?.writeText(SQL).then(() => C.toast('Copied'), () => C.toast('Select the code and copy it by hand')); break;
    case 'recheck': L.status = 'loading'; load().catch(err => { console.error(err); C.toast('Still offline or not reachable.'); }); break;
  }
});
document.addEventListener('input', e => {
  const t = e.target; if (!C || t.closest('.sheet')) return;
  const page = C.view();
  if (t.matches('[data-lq]')) { uiOf(page).q = t.value; const host = t.closest('#viewHost'); if (host) fillList(host, page); }
});
document.addEventListener('input', e => {
  const t = e.target; if (!C || t.closest('.sheet')) return;
  if (t.matches('[data-everyq]')) { L.everyQ = t.value; const el = t.closest('#viewHost')?.querySelector('[data-everylist]'); if (el) el.innerHTML = fEveryList(); }
  if (t.matches('[data-envr]')) { const r = t.closest('[data-envrow]'); r.querySelector('[data-envb]').textContent = fEur0(Number(t.value)); }
});
document.addEventListener('change', e => {
  const t = e.target; if (!C || t.closest('.sheet')) return;
  if (t.matches('[data-envr]')) { const c = L.byId[t.dataset.envr]; if (c) save(c, { budget: Number(t.value) }); }
  if (t.matches('[data-split]')) { const k = t.dataset.split, v = num(t.value); if (k === 'pay') saveFset({ payAmount: v }); else saveFset({ split: { ...(fset().split || {}), [k]: v ?? 0 } }); }
  if (t.matches('[data-fset]')) { const k = t.dataset.fset; saveFset({ [k]: ['payAmount', 'buffer', 'wishBudget', 'payDom'].includes(k) ? num(t.value) : t.value }); }
  if (t.matches('[data-accsafe]')) { const a = L.byId[t.dataset.accsafe]; if (a) save(a, { safe: t.checked }); }
});
document.addEventListener('change', e => {
  const t = e.target; if (!C || !t.matches('[data-lsort]')) return;
  const page = C.view(); uiOf(page).sort[curSeg(page).key] = t.value; C.render();
});
document.addEventListener('submit', e => { if (e.target.matches('[data-qadd]')) { e.preventDefault(); quickAdd(e.target); } });
document.addEventListener('submit', e => {
  if (!e.target.matches('[data-winbox]')) return; e.preventDefault();
  const inp = e.target.querySelector('input'), v = inp.value.trim(); if (!v) return;
  const url = (v.match(/https?:\/\/\S+/) || [''])[0];
  create('inbox', { url, text: url === v ? '' : v, source: 'App', status: 'New' }).then(() => C.toast('In your inbox. It gets sorted within a few hours.')).catch(() => {});
  inp.value = '';
});

/* ---------- Finance: envelopes, every purchase, repeats, split my pay, goals, challenges, wait list, settings ---------- */
const fMode = () => fset().envMode === 'month' ? 'month' : 'pay';
function fWindow(mode = fMode(), back = 0) {
  if (mode === 'month') { const m = addMonths(today().slice(0, 7) + '-01', -back); return { start: m, end: addDays(addMonths(m, 1), -1) }; }
  const t = today(), l = [...fPays(addDays(t, -40 * (back + 2)), t), ...(fPayday() ? [fPayday()] : [])], i = l.length - 2 - back;
  if (i >= 0) return { start: l[i], end: addDays(l[i + 1], -1) };
  const s = addMonths(fStart(), -back); return { start: s, end: addDays(addMonths(s, 1), -1) };
}
const fCatSpent = (id, w) => fSum(recs('ftx').filter(x => x.category === id && !x.bill && !x.debt && !x.transfer && x.date >= w.start && x.date <= w.end && x.date <= today()));
function fEnvRow(c, w) {
  const spent = fCatSpent(c.id, w), bud = num(c.budget) || 0;
  const carry = c.rollover && bud ? bud - fCatSpent(c.id, fWindow(fMode(), 1)) : 0, have = bud + carry, left = have - spent;
  const max = Math.max(100, Math.ceil(Math.max(bud * 2, spent * 1.2, 200) / 50) * 50), pct = have > 0 ? Math.min(100, 100 * spent / have) : spent ? 100 : 0;
  return `<div class="fenv" data-envrow="${c.id}"><div class="fenvh"><button class="fenvn" data-act="open" data-id="${c.id}">${esc(titleOf(c))}</button>${c.rollover ? `<span class="chip fchipsm">${svg(P.repeat)} rolls over${carry ? ' ' + fSigned(carry) : ''}</span>` : ''}${c.nospend ? '<span class="chip fchipsm">not spending</span>' : ''}<div class="spacer"></div><span class="fenvv"><b>${eur(spent)}</b> / <span data-envb>${fEur0(bud)}</span></span></div>
    <div class="fbar ${left < 0 ? 'over' : ''}"><i style="width:${pct}%"></i></div>
    <div class="fenvc"><span class="fzero">0</span><button class="iconbtn small" data-act="envstep" data-id="${c.id}" data-v="-10" aria-label="Less">${svg(P.minus)}</button><input type="range" min="0" max="${max}" step="5" value="${bud}" data-envr="${c.id}" aria-label="Budget for ${esc(c.name || '')}"><button class="iconbtn small" data-act="envstep" data-id="${c.id}" data-v="10" aria-label="More">${svg(P.plus)}</button><span class="fenvl ${left < 0 ? 'mneg' : ''}" data-envl>${!bud && !carry ? 'no plan yet' : left >= 0 ? eur(left) + ' left' : eur(-left) + ' over'}</span></div></div>`;
}
const fTags = x => (String(x.notes || '') + ' ' + String(x.name || '')).match(/#[\p{L}\d_-]+/gu) || [];
function fEveryList() {
  const mode = L.everyMode || 'out', q = norm(L.everyQ || ''), words = q.split(/\s+/).filter(Boolean);
  const rows = [...(mode !== 'in' ? recs('ftx').map(x => ({ x, out: true })) : []), ...(mode !== 'out' ? recs('fincome').map(x => ({ x, out: false })) : [])]
    .filter(({ x }) => !words.length || words.every(w => norm([x.name, x.notes, relName(x.category), relName(x.account), num(x.amount)?.toFixed(2), String(num(x.amount) || '').replace('.', ',')].join(' ')).includes(w)))
    .sort((a, b) => (b.x.date + String(fSeq(b.x)).padStart(15, '0')).localeCompare(a.x.date + String(fSeq(a.x)).padStart(15, '0'))).slice(0, L.everyLim || 50);
  const groups = new Map(); for (const r of rows) { if (!groups.has(r.x.date)) groups.set(r.x.date, []); groups.get(r.x.date).push(r); }
  return [...groups].map(([d, rs]) => `<div class="mdayhead"><b>${esc(fromISO(d).toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' }))}</b></div><div class="lrows">${rs.map(r => row(r.x)).join('')}</div>`).join('')
    + (rows.length >= (L.everyLim || 50) ? '<button class="btn small mmore" data-act="everymore">Show more</button>' : '') || quiet(q ? 'Nothing matches.' : 'Nothing logged yet.');
}
function fEnvFill(fill) {
  const mode = fMode(), w = fWindow(mode), cats = recs('fcats').sort((a, b) => (a.nospend ? 1 : 0) - (b.nospend ? 1 : 0) || (num(b.budget) || 0) - (num(a.budget) || 0) || norm(a.name).localeCompare(norm(b.name)));
  const planned = fSum(cats.filter(c => !c.nospend), 'budget'), spent = fSum(recs('ftx').filter(x => fEveryday(x) && x.date >= w.start && x.date <= w.end && x.date <= today()));
  const tags = {}; for (const x of recs('ftx')) for (const t of fTags(x)) tags[t.toLowerCase()] = (tags[t.toLowerCase()] || 0) + 1;
  const days = Math.max(0, diffDays(today(), w.end) + 1);
  fill.innerHTML = `${fDupNote()}<div class="tiles lt3">${fTile('Spent', eur(spent), `everyday spending this ${mode === 'month' ? 'month' : 'pay'}`)}${fTile('Planned', fEur0(planned), `in ${plural(cats.filter(c => !c.nospend).length, 'envelope')}, per ${mode === 'month' ? 'month' : 'paycheck'}`)}${spent > planned ? fTile('Over plan', eur(spent - planned), `${plural(days, 'day')} to ${mode === 'month' ? 'month end' : 'payday'}`, 'mneg') : fTile('Left in the plan', eur(planned - spent), `${plural(days, 'day')} to ${mode === 'month' ? 'month end' : 'payday'}`)}</div>
  <div class="fenvgrid">
    ${MP('Your envelopes', `<div class="seg fseg" role="group"><button data-act="envmode" data-v="month" aria-pressed="${mode === 'month'}">Per month</button><button data-act="envmode" data-v="pay" aria-pressed="${mode === 'pay'}">Per paycheck</button></div><p class="lnone">${esc(shortDate(w.start))} – ${esc(shortDate(w.end))}</p>${cats.map(c => fEnvRow(c, w)).join('') || quiet('Add a category for each kind of everyday spending.')}`, '<button class="chip link" data-act="new" data-v="fcats">+ Category</button>')}
    ${MP('Every purchase', `<div class="seg fseg" role="group">${[['out', 'Purchases'], ['in', 'Money in'], ['both', 'Both']].map(([k, l]) => `<button data-act="everymode" data-v="${k}" aria-pressed="${(L.everyMode || 'out') === k}">${l}</button>`).join('')}</div>
      <label class="search fsearch">${svg(P.search)}<input type="search" data-everyq placeholder="Search, like “coffee”, “12.50” or “#holiday”" value="${esc(L.everyQ || '')}" aria-label="Search purchases"></label>
      ${Object.keys(tags).length ? `<div class="lwrap">${Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 8).sort((a, b) => azCmp(a[0], b[0])).map(([t]) => `<button class="chip" data-act="everytag" data-v="${esc(t)}" aria-pressed="${norm(L.everyQ) === t}">${esc(t)}</button>`).join('')}</div>` : ''}
      <div data-everylist>${fEveryList()}</div>`)}
  </div>`;
}
/* repeats */
const fOpenOccs = (days = 62) => fOccs(addDays(fStart(), -62), addDays(today(), days)).filter(o => !o.paid && !o.skipped && (o.date >= today() || o.date >= fStart()));
function fComingFill(fill) {
  const rv = ingViewOf('repView', 'list'), sw = ingViewSeg('repView', rv, [['list', 'List'], ['cal', 'Calendar']]);
  if (rv === 'cal') { fCalFill(fill); fill.insertAdjacentHTML('afterbegin', fDupNote() + sw); return; }
  const t = today(), os = fOpenOccs(70), sum = fSum(os.filter(o => o.date <= (fPayday() || addDays(t, 30))));
  fill.innerHTML = `${fDupNote()}${sw}<div class="tiles lt3">${fTile('Before payday', eur(sum), fPayday() ? 'still to go out until ' + shortDate(fPayday()) : 'in the next 30 days')}${fTile('Overdue', String(os.filter(o => o.date < t).length), 'tap Mark paid when they went out')}${fTile('Every month', eur(recs('fbills').filter(b => b.active !== false).reduce((n, b) => n + fPerMonth(b), 0)), 'all repeats, spread per month')}</div>
  ${MP('Coming up', os.length ? `<div class="mlist">${os.map(o => `<div class="mup"><span class="mdate"><b>${fromISO(o.date).getDate()}</b>${esc(fromISO(o.date).toLocaleDateString('en-GB', { month: 'short' }))}</span><button class="lmain fcomemain" data-act="open" data-id="${o.bill.id}"><b>${esc(o.bill.name)}</b><span>${esc(o.type)} · ${o.date < t ? 'overdue' : esc(relDay(o.date))}</span></button><b>${o.bill.vary ? '~' : ''}${eur(o.amount)}</b><button class="btn small primary" data-act="fpay" data-v="${o.key}">Mark paid</button></div>`).join('')}</div>` : quiet('Nothing coming up.'))}`;
}
function fCalFill(fill) {
  const off = L.calOff || 0, m0 = addMonths(today().slice(0, 7) + '-01', off), first = fromISO(m0), lead = (first.getDay() + 6) % 7;
  const start = addDays(m0, -lead), days = Array.from({ length: 42 }, (_, i) => addDays(start, i)), occ = fOccs(days[0], days[41]), t = today(), s = fset(), planC = plannedWishes(days[0], days[41]);
  const pays = fPays(days[0], days[41]);
  const chip = (txt, c, paid) => `<span class="mpay ${paid ? 'paid' : ''}" style="--c:${c}">${esc(txt)}</span>`;
  fill.innerHTML = MP(fromISO(m0).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), `<div class="mcal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<b class="mdow">${d}</b>`).join('')}${days.map(d => { const os = occ.filter(o => o.date === d); const items = [...(pays.includes(d) ? [chip('Payday', TYPE_COL.Pay)] : []), ...os.map(o => chip(`${o.bill.name} ${fEur0(o.amount)}`, TYPE_COL[o.type] || TYPE_COL.Bill, o.paid)), ...planC.filter(p => p.date === d).map(p => chip(`${p.name} ${fEur0(p.amount)}`, TYPE_COL.Wish))]; return `<div class="mday ${d === t ? 'now' : ''} ${d.slice(0, 7) !== m0.slice(0, 7) ? 'past' : ''}"><span>${fromISO(d).getDate()}</span>${items.slice(0, 3).join('')}${items.length > 3 ? `<em>+${items.length - 3}</em>` : ''}</div>`; }).join('')}</div>`,
    `<span class="mbtns"><button class="iconbtn small" data-act="calmove" data-v="-1" aria-label="Previous month">${svg(P.left)}</button><button class="chip link" data-act="calmove" data-v="0">Today</button><button class="iconbtn small" data-act="calmove" data-v="1" aria-label="Next month">${svg(P.right)}</button></span>`);
}
function fBillsOf(type) { return fill => { const list = sortList(recs('fbills').filter(b => (b.type || 'Bill') === type && b.active !== false), KINDS.fbills, 'name'); fill.innerHTML = `${fDupNote()}<div class="tiles lt3">${fTile(type === 'Bill' ? 'Bills' : 'Subscriptions', String(list.length), 'active')}${fTile('Per month', eur(list.reduce((n, b) => n + fPerMonth(b), 0)), 'spread over the year')}${fTile('Per year', eur(12 * list.reduce((n, b) => n + fPerMonth(b), 0)), '')}</div>${list.length ? `<div class="lrows">${list.map(row).join('')}</div>` : quiet(`No ${type === 'Bill' ? 'bills' : 'subscriptions'} yet.`)}<button class="btn small mmore" data-act="newbill" data-v="${type}">+ Add ${type === 'Bill' ? 'a bill' : 'a subscription'}</button>`; }; }
function fPerMonth(b) { const a = num(b.amount) || 0, n = Math.max(1, num(b.every) || 1); return b.cadence === 'Yearly' ? a / 12 : b.cadence === 'Every N months' ? a / n : b.cadence === 'Weekly' ? a * 52 / 12 / n : a; }
function fSplitSuggest() {
  const s = fset(), pay = num(s.payAmount) || 0;
  const bills = recs('fbills').filter(b => b.active !== false && b.type !== 'Debt').reduce((n, b) => n + fPerMonth(b), 0);
  const debt = fSum(recs('fdebts'), 'payment') || recs('fbills').filter(b => b.active !== false && b.type === 'Debt').reduce((n, b) => n + fPerMonth(b), 0);
  const save = recs('fgoals').filter(g => !g.done && g.by).reduce((n, g) => n + Math.max(0, (num(g.target) || 0) - (num(g.saved) || 0)) / Math.max(1, Math.round(diffDays(today(), g.by) / 30.4)), 0);
  const r2 = n => Math.round(n * 100) / 100;
  return { bills: r2(bills), debt: r2(debt), save: r2(save), every: r2(Math.max(0, pay - bills - debt - save)) };
}
const SPLIT = [['bills', 'Bills and subscriptions', 'var(--c8)', '🧾'], ['debt', 'Debt payments', 'var(--c7)', '💳'], ['save', 'Savings and goals', 'var(--c3)', '🎯'], ['every', 'Everyday spending', 'var(--c6)', '🛒']];
function fSplitFill(fill) {
  const s = fset(), pay = num(s.payAmount) || 0, sug = fSplitSuggest(), sp = s.split || {};
  const val = k => sp[k] != null ? num(sp[k]) || 0 : sug[k], total = SPLIT.reduce((n, [k]) => n + val(k), 0), left = pay - total;
  const plans = fSum(recs('fcats').filter(c => !c.nospend), 'budget');
  fill.innerHTML = MP('Split my pay', `${pay ? `<div class="fsplitbar">${SPLIT.map(([k, , c]) => `<i style="flex:${Math.max(0, val(k))};background:${c}"></i>`).join('')}</div>` : ''}
    <div class="fsplit">${SPLIT.map(([k, l, c, e]) => `<label class="fsplitrow"><span class="fsplitl"><i style="background:${c}"></i>${e} ${esc(l)}${sp[k] == null ? ' <small>suggested</small>' : ''}</span><input type="number" inputmode="decimal" step="0.01" data-split="${k}" value="${val(k).toFixed(2)}"></label>`).join('')}</div>
    <p class="lbig ${left < 0 ? 'mneg' : ''}">${fSigned(left)} ${left < 0 ? 'more than your pay' : 'left for you, or to give a job'}</p>
    <p class="lnone">Your category plans add up to ${eur(plans)} a month; after the fixed parts, ${eur(Math.max(0, pay - val('bills') - val('debt') - val('save')))} is what this pay leaves for them.</p>
    ${pay ? (() => { const mg = moveGoal(), buf = goalNamed(/buffer|nood/i), pct = k => Math.round(100 * val(k) / pay); const mv = mg && mg.by ? Math.max(0, (num(mg.target) || 0) - (num(mg.saved) || 0)) / Math.max(1, Math.round(diffDays(today(), mg.by) / 30.4)) : 0; return `<p class="lnone"><b>Verhuizen eerst:</b> ${pct('bills')}% vaste lasten, ${pct('save')}% sparen${mv ? ` (waarvan ${eur(mv)} voor Verhuizen${buf ? ' en de rest voor je buffer' : ''})` : ''}, ${pct('every')}% om van te leven. ${val('every') < pay * 0.25 ? 'Dat is krap: schuif je streefmaand op of kijk waar je kunt besparen.' : 'Pas de bedragen aan als het niet past.'}</p>`; })() : ''}
    <p class="lnone">A plan for each payday, like envelopes. It doesn’t move money or change safe to spend. <button class="chip link" data-act="splitsug">Use the suggestions</button></p>`,
    `<label class="fpayin">${pay ? '' : 'Your pay '}<input type="number" inputmode="decimal" step="0.01" data-split="pay" value="${pay ? pay.toFixed(2) : ''}" placeholder="Pay per month" aria-label="Pay per month"> each month</label>`);
}
/* goals: challenges and wait list */
const gridTiles = r => r.preset && GRID_PRESETS[r.preset] ? GRID_PRESETS[r.preset]() : String(r.amounts || '').split(/[\s,;]+/).map(Number).filter(n => n > 0);
const gridFilled = r => new Set([].concat(r.filled || []));
const gridPut = r => { const t = gridTiles(r), f = gridFilled(r); return t.reduce((n, a, i) => n + (f.has(i) ? a : 0), 0); };
function fChallFill(fill) {
  const gs = recs('fgrid'), run = gs.filter(g => !g.done), put = gs.reduce((n, g) => n + gridPut(g), 0), filled = gs.reduce((n, g) => n + gridFilled(g).size, 0);
  const pick = L.gpick || {};
  fill.innerHTML = `<div class="tiles lt3">${fTile('Put by in challenges', fEur0(put), plural(filled, 'tile') + ' filled')}${fTile('Running', String(run.length), 'no deadlines, no streaks to lose')}<div class="tile"><div class="k">Not sure which tile?</div><div class="h fhow">Tap “Pick one for me” and it chooses a tile that fits what you can spare today.</div></div></div>
  ${gs.length ? gs.map(g => { const tl = gridTiles(g), f = gridFilled(g), tot = tl.reduce((a, b) => a + b, 0), p = gridPut(g); return MP(titleOf(g), `<p class="lnone">${eur(p)} of ${eur(tot)} · ${f.size} of ${tl.length} tiles${g.goal ? ' · counts toward ' + esc(relName(g.goal)) : ''}</p><div class="fbar"><i style="width:${tot ? 100 * p / tot : 0}%"></i></div><div class="fgrid">${tl.map((a, i) => `<button class="ftile ${f.has(i) ? 'on' : ''} ${pick.id === g.id && pick.i === i ? 'pick' : ''}" data-act="fgtile" data-id="${g.id}" data-v="${i}" aria-pressed="${f.has(i)}">${fEur0(a)}</button>`).join('')}</div>`, `<span class="mbtns"><button class="btn small" data-act="fgpick" data-id="${g.id}">Pick one for me</button><button class="chip link" data-act="open" data-id="${g.id}">Edit</button></span>`); }).join('')
    : `<div class="empty lempty"><h2>Make saving a game</h2><p>Pick a challenge, then fill a tile whenever you put a little by. Miss a week? The grid waits for you.</p><button class="btn primary" data-act="new" data-v="fgrid">+ New challenge</button></div>`}
  ${MP('Spending challenges', `${recs('fchall').length ? `<div class="lrows">${recs('fchall').map(row).join('')}</div>` : quiet('Skip a category or cap it for a while, like a no-takeaway month.')}<button class="btn small" data-act="new" data-v="fchall">+ Spending challenge</button>`)}`;
}
const waitEnd = r => (r.created || Date.parse(r.added || today())) + (num(r.wait) ?? 48) * 36e5;
function fWaitFill(fill) {
  const now = Date.now(), old = recs('fwait').filter(WISHY.fwait);
  // waiting wishes: the old wait list plus every wish that started with a wait and is still being decided (up to a week after)
  const fresh = recs('wishes').filter(r => WISHY.wishes(r) && num(r.wait) && wishWaitLeft(r) > -24 * 7);
  const wait = [...old, ...fresh].sort((a, b) => (wishWaitLeft(a) ?? 0) - (wishWaitLeft(b) ?? 0));
  const hist = wishHistory(), gone = hist.filter(h => h.out === 'dropped');
  const decided = recs('fwait').filter(r => r.status && r.status !== 'Waiting');
  fill.innerHTML = `<div class="tiles lt3">${fTile('Waiting', String(wait.length), 'each one waits 48 hours')}${fTile('Saved by letting go', `<span class="mgood">${fEur0(fSum(gone, 'price'))}</span>`, plural(gone.length, 'wish', 'wishes') + ' you let go, from every wishlist')}<div class="tile"><div class="k">How it works</div><div class="h fhow">Want something? Put it on a wishlist with a 48-hour wait instead of buying it. After two days most wants fade, and the ones that don’t are worth it.</div></div></div>
  ${old.length ? MP('One wait list', `<p class="lnone">${plural(old.length, 'item')} still on the old wait list. Move them into Wishlists so there is one list to keep. The old entries stay readable, and you can undo it.</p><button class="btn small primary" data-act="wmovewait">Move wait list into Wishlists</button>`) : ''}
  ${wait.length ? MP('Waiting', `<div class="lrows">${wait.map(r => { const h = wishWaitLeft(r); return `<div class="lrow"><button class="lmain" data-act="open" data-id="${r.id}"><b>${esc(r.name || 'Something')}</b><span>${[h > 0 ? `decide in ${h} h` : 'waited long enough, still want it?', r.kind === 'wishes' ? r.category || 'Wishlist' : 'old wait list', affordLine(num(r.price) || 0, r.id)].filter(Boolean).join(' · ')}</span></button><span class="lside">${eur(num(r.price))}</span><button class="lquick" data-act="fwset" data-id="${r.id}" data-v="Bought">Bought</button><button class="lquick" data-act="fwset" data-id="${r.id}" data-v="Let go">Let go</button></div>`; }).join('')}</div>`, '<button class="chip link" data-act="fwnew">+ Add a wish</button>')
    : `<div class="empty lempty"><h2>Nothing waiting</h2><p>Next time something catches your eye, add it as a wish that waits 30 days.</p><button class="btn primary" data-act="fwnew">+ Add a wish</button></div>`}
  ${decided.length ? MP('Decided on the old wait list', `<div class="lrows">${decided.sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 30).map(row).join('')}</div>`) : ''}`;
}
/* finance settings */
const CURRENCIES = [['EUR', 'EUR €'], ['USD', 'USD $'], ['GBP', 'GBP £'], ['CHF', 'CHF'], ['SEK', 'SEK kr'], ['DKK', 'DKK kr'], ['NOK', 'NOK kr']];
const accIcon = a => a.type === 'Card' ? '💳' : a.type === 'Savings' ? '🐖' : '🏦';
function accRow(a) {
  const b = fBalance(a), debt = a.type === 'Card' ? recs('fdebts').find(d => d.account === a.id) : null;
  if (a.type === 'Card') return `<div class="lrow facc"><span class="lmain"><b>${accIcon(a)} ${esc(a.name || 'Card')}</b><span>Credit card · its charges are held back until paid</span></span>${debt ? '<button class="btn small" data-act="go" data-v="money/debt">On Debt</button>' : ''}<button class="btn small" data-act="open" data-id="${a.id}">Edit</button></div>`;
  return `<div class="lrow facc ${a.archived ? 'gone' : ''}"><span class="lmain"><b>${accIcon(a)} ${esc(a.name || 'Account')}</b><span>${a.type === 'Savings' ? 'Savings' : 'Everyday account'} · ${b == null ? 'no balance yet' : 'about ' + fSigned(b) + ' now'}</span></span><label class="settog"><input type="checkbox" data-accsafe="${a.id}" ${a.safe ? 'checked' : ''}> Counts</label><button class="btn small" data-act="acchist" data-id="${a.id}">History</button><button class="btn small" data-act="open" data-id="${a.id}">Edit</button></div>`;
}
function fSettings() {
  const s = fset(), list = (kind, empty, add) => `${recs(kind).length ? `<div class="lrows">${sortList(recs(kind), KINDS[kind], defSort(KINDS[kind])).map(row).join('')}</div>` : quiet(empty)}<button class="btn small mmore" data-act="new" data-v="${kind}">${add}</button>`;
  const fld = (label, help, input) => `<div class="fset"><div><b>${label}</b>${help ? `<span>${help}</span>` : ''}</div>${input}</div>`;
  const accs = recs('faccounts').sort((a, b) => (a.archived ? 1 : 0) - (b.archived ? 1 : 0) || ['Spending', 'Savings', 'Card'].indexOf(a.type || 'Spending') - ['Spending', 'Savings', 'Card'].indexOf(b.type || 'Spending') || norm(a.name).localeCompare(norm(b.name)));
  return `<div class="fsetgrid">
    ${MP('Your money', `
      ${fld('Your name', 'Shown in the greeting. Optional.', `<input class="finp" data-fset="name" value="${esc(s.name || '')}" placeholder="Your name">`)}
      ${fld('Currency', 'Changes how amounts are written. It doesn’t convert anything.', `<select class="finp" data-fset="currency">${CURRENCIES.map(([c, l]) => `<option value="${c}" ${(s.currency || 'EUR') === c ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
      ${fld('How often you’re paid', 'Safe to spend covers the time until your next payday.', `<select class="finp" data-fset="cycle"><option value="Monthly">Once a month</option></select>`)}
      ${fld('Plan everyday spending', fMode() === 'month' ? 'Per month: each category is a budget for the calendar month.' : 'Per paycheck: each category is an envelope that fills on payday.', `<select class="finp" data-fset="envMode"><option value="pay" ${fMode() === 'pay' ? 'selected' : ''}>Per paycheck (envelopes)</option><option value="month" ${fMode() === 'month' ? 'selected' : ''}>Per month</option></select>`)}
      ${fld('Usual pay', 'Used to plan the paydays ahead and to split your pay.', `<input class="finp" type="number" inputmode="decimal" step="0.01" data-fset="payAmount" value="${s.payAmount ?? ''}">`)}
      ${fld('Usual payday', 'The day of the month you are paid. On a Saturday the app counts the Friday before, on a Sunday the Monday after.', `<input class="finp" type="number" inputmode="numeric" min="1" max="31" step="1" data-fset="payDom" value="${fPayDom() ?? ''}" placeholder="24">`)}
      ${fld('Paydates for the year', (() => { const y = today().slice(0, 4), n = fPayList().filter(d => d.startsWith(y)).length, nx = fPayday(); return `${n ? `${plural(n, 'date')} entered for ${y}.` : 'Enter the real dates once a year, for holidays and weekends.'}${nx ? ` Next payday: ${esc(niceDate(nx))}.` : ''}`; })(), `<button class="btn small" data-act="fpaydates">Enter paydates</button>`)}
      ${fld('Safety buffer', 'Kept back from safe to spend, for surprises.', `<input class="finp" type="number" inputmode="decimal" step="1" data-fset="buffer" value="${s.buffer ?? 100}">`)}
      ${wishBudgetField()}`)}
    ${MP('Your accounts', `${accs.length ? `<div class="lrows facclist">${accs.map(accRow).join('')}</div>` : quiet('Add your bank accounts to see balances and safe to spend.')}<p class="lnone">Counts: the account is part of safe to spend. Add the IBAN to an account so bank imports land on it by themselves.</p><div class="dbtns"><button class="btn small" data-act="fcheck">Update balances</button><button class="btn small" data-act="fmove">⇄ Move money</button></div>`, '<button class="chip link" data-act="new" data-v="faccounts">+ Add an account</button>')}
    ${(() => { const pd = recs('fpaid').sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))); return MP('Paid bills', pd.length ? `<p class="lnone">Your history of repeats you marked paid or skipped, newest first.</p><div class="lrows">${pd.slice(0, L.paidLim || 20).map(row).join('')}</div>${pd.length > (L.paidLim || 20) ? '<button class="btn small mmore" data-act="paidmore">Show more</button>' : ''}` : quiet('Nothing marked paid yet. Tap Mark paid under Repeats › Coming up.')); })()}
    ${MP('Import and backup', `<p class="lnone">Bank statements from ING or Rabobank (CSV). Duplicates are skipped, own transfers are recognised and your sort rules pick the categories.</p><div class="dbtns"><button class="btn small primary" data-act="fcsv">Import bank CSV</button><button class="btn small" data-act="import">Import budget backup</button><button class="btn small" data-act="fdups">Find duplicates</button></div><p class="lnone">Imported something twice? Find duplicates keeps one copy of everything and removes the rest.</p><div class="dbtns"><button class="btn small danger" data-act="fclear">Clear all finance data</button></div><p class="lnone">Removes everything in Finance so you can import again from scratch.</p>`)}
    ${MP('Categories', list('fcats', 'No categories yet.', '+ Category') + '<p class="lnone">Open one to set its budget, let it roll over, or mark it as not spending.</p>')}
    ${MP('Sort rules', list('frules', 'No rules yet. A rule puts every purchase whose name contains a word in a category.', '+ Sort rule'))}
    ${MP('Quick adds', list('fchips', 'No quick adds yet.', '+ Quick add'))}
  </div>`;
}
/* ---------- duplicates ----------
   Importing the same money twice (for example the budget backup and the converted file) leaves two copies of
   everything under different ids. This finds them, keeps one, points every link at the one that stays and
   removes the rest in one step you can undo. Purchases and money in that came in with the same import stay:
   two coffees on the same day are real. Two accounts, envelopes, repeats, debts, chips, rules or goals with
   the same name are never real, so those always go back to one, even when both came in together (a restore
   after an undo, or a re-imported export, saves every copy at the same moment). */
// copies of the same account, envelope, repeat or debt make every total count twice; this spots them on the page itself
const DUP_LOOK = ['faccounts', 'fcats', 'fdebts', 'fbills', 'fchips', 'frules', 'fgoals'];
function fDupCount() {
  const m = new Map(); let n = 0;
  for (const k of DUP_LOOK) { const seen = new Set(); for (const r of recs(k)) { const key = dupKey(r, m); if (seen.has(key)) n++; else seen.add(key); } }
  return n;
}
const fDupNote = () => { let n = 0; try { n = fDupCount(); } catch {} return n ? `<div class="note tnote fdupnote"><span>${n === 1 ? 'Er staat 1 item dubbel' : `Er staan ${n} items dubbel`} in Finance, daardoor kloppen de bedragen niet.</span><button class="btn small primary" data-act="fdups">Dubbele opruimen</button></div>` : ''; };
// lists where two of the same thing can never both be real
const DUP_ONE = new Set([...DUP_LOOK, 'fset', 'fpaid']);
// how many other records point at each id: the copy that everything links to is the one to keep
function refCounts() {
  const n = {}, walk = v => { if (typeof v === 'string') { if (L.byId[v]) n[v] = (n[v] || 0) + 1; } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  for (const r of L.all) walk(dataOf(r));
  return n;
}
/* an import never adds a second copy of an account, envelope, repeat or debt that is already here:
   a row with a new id but the same name (and amount, for a repeat) takes the id of the one that is here,
   and everything in the file that pointed at it follows along */
function importMatch(rows) {
  const have = new Map(), map = new Map(), none = new Map();
  for (const k of DUP_LOOK) for (const r of recs(k)) { const key = k + '#' + dupKey(r, none); if (!have.has(key)) have.set(key, r.id); }
  for (const r of rows) {
    if (!DUP_LOOK.includes(r.kind) || L.byId[r.id]) continue;
    const key = r.kind + '#' + dupKey({ ...r.data, kind: r.kind }, none), hit = have.get(key);
    if (hit && hit !== r.id) map.set(r.id, hit); else if (!hit) have.set(key, r.id);
  }
  if (!map.size) return { rows, matched: 0 };
  const out = new Map();
  for (const r of rows) { const id = map.get(r.id) || r.id, data = relink(r.data, map); out.set(id, out.has(id) ? { ...out.get(id), data: { ...out.get(id).data, ...data } } : { ...r, id, data }); }
  return { rows: [...out.values()], matched: map.size };
}
const FIN_KINDS = ['faccounts', 'fcats', 'fdebts', 'fbills', 'fchips', 'frules', 'fset', 'fgoals', 'fchall', 'fgrid', 'fwait', 'ftx', 'fincome', 'fchecks', 'fpaid'];
const DUP_SKIP = new Set(['created', 'updated', 'ord', 'order', 'bankRef', 'notes', 'category', 'occ']);
function dupKey(r, map) {
  const m = v => map.get(v) || v, n = v => norm(v).replace(/\s+/g, ' '), a = v => (num(v) ?? 0).toFixed(2);
  switch (r.kind) {
    case 'faccounts': return [n(r.name), r.type || 'Spending'].join('|');
    case 'fcats': return n(r.name);
    case 'fdebts': case 'fchips': case 'fgoals': case 'fchall': case 'fgrid': case 'fwait': return n(r.name);
    case 'frules': return n(r.contains);
    case 'fbills': return [n(r.name), a(r.amount), r.type || ''].join('|');
    case 'fset': return 'one';
    case 'ftx': case 'fincome': return [r.date, a(r.amount), n(r.name), m(r.account || ''), r.transfer ? 't' : ''].join('|');
    case 'fchecks': return [m(r.account || ''), r.at, a(r.amount)].join('|');
    case 'fpaid': return [m(r.bill || ''), r.date].join('|');
    default: return JSON.stringify(Object.fromEntries(Object.entries(dataOf(r)).filter(([k]) => !DUP_SKIP.has(k)).sort()));
  }
}
// swaps every id that was removed for the one that stays, anywhere in a record
function relink(v, map) {
  if (typeof v === 'string') return map.get(v) || v;
  if (Array.isArray(v)) return v.map(x => relink(x, map));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, relink(x, map)]));
  return v;
}
async function findDups() {
  // when each record was saved: copies from one import share the same moment
  const at = {};
  for (let from = 0; ; from += 1000) {
    const { data, error } = await C.sb.from('records').select('id,updated_at').in('kind', FIN_KINDS).range(from, from + 999);
    if (error) throw error;
    for (const r of data) at[r.id] = r.updated_at || '';
    if (data.length < 1000) break;
  }
  const map = new Map(), fill = new Map(), refs = refCounts();
  for (let pass = 0; pass < 6; pass++) {
    let found = 0;
    for (const kind of FIN_KINDS) {
      const groups = new Map();
      for (const r of recs(kind)) { if (map.has(r.id)) continue; const k = dupKey(r, map); groups.has(k) ? groups.get(k).push(r) : groups.set(k, [r]); }
      for (const list of groups.values()) {
        if (list.length < 2) continue;
        if (DUP_ONE.has(kind)) {
          // one stays: the copy most things point at, then the one with a bank reference, then the oldest
          const keep = [...list].sort((x, y) => (refs[y.id] || 0) - (refs[x.id] || 0) || !!y.bankRef - !!x.bankRef || String(at[x.id] || '').localeCompare(String(at[y.id] || '')) || String(x.id).localeCompare(String(y.id)))[0];
          for (const r of list) if (r !== keep) { map.set(r.id, keep.id); fill.set(keep.id, [...(fill.get(keep.id) || []), r]); found++; }
          continue;
        }
        const batches = new Map();
        for (const r of list) { const b = at[r.id] || r.id; batches.has(b) ? batches.get(b).push(r) : batches.set(b, [r]); }
        // keep the biggest single import (the earliest when it's a tie); a line with a bank reference wins
        const keepB = [...batches.entries()].sort((x, y) => y[1].length - x[1].length || y[1].filter(r => r.bankRef).length - x[1].filter(r => r.bankRef).length || String(x[0]).localeCompare(String(y[0])))[0][1];
        const gone = list.filter(r => !keepB.includes(r));
        gone.forEach((r, i) => { const k = keepB[i % keepB.length]; map.set(r.id, k.id); fill.set(k.id, [...(fill.get(k.id) || []), r]); found++; });
      }
    }
    if (!found) break;
  }
  // what changes in the records that stay: links to removed copies, and empty fields the copy had filled in
  const changes = [];
  for (const r of L.all) {
    if (map.has(r.id)) continue;
    let d = relink(dataOf(r), map);
    for (const g of fill.get(r.id) || []) for (const [k, v] of Object.entries(relink(dataOf(g), map))) if ((d[k] == null || d[k] === '') && v != null && v !== '') d = { ...d, [k]: v };
    if (JSON.stringify(d) !== JSON.stringify(dataOf(r))) changes.push({ id: r.id, kind: r.kind, data: d });
  }
  return { gone: [...map.keys()].map(id => L.byId[id]).filter(Boolean), changes };
}
async function fDups() {
  const sh = C.sheet({ title: 'Find duplicates', body: '<p class="lnone" data-dupbody>Looking through your money…</p>', foot: '<span class="busy" data-msg></span><div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary" data-go disabled>Remove</button>' });
  let res;
  try { res = await findDups(); } catch (e) { console.error(e); sh.querySelector('[data-dupbody]').textContent = 'Could not look through your money. Check your connection and try again.'; return; }
  const body = sh.querySelector('[data-dupbody]'), go = sh.querySelector('[data-go]');
  if (!res.gone.length) { body.textContent = 'No duplicates found. Everything is here once.'; go.remove(); return; }
  const per = FIN_KINDS.map(k => [k, res.gone.filter(r => r.kind === k).length]).filter(([, n]) => n);
  body.outerHTML = `<p class="lnone">These are second copies of things that are already here. The first copy stays, with everything that points to it.</p>
    <div class="lrows">${per.map(([k, n]) => `<div class="lrow"><span class="lmain"><b>${esc(KINDS[k].many)}</b></span><span class="lside">${n}</span></div>`).join('')}</div>
    <p class="dsub">For example</p><div class="lrows">${res.gone.filter(r => r.kind === 'ftx' || r.kind === 'fincome').slice(0, 5).map(r => `<div class="lrow"><span class="lmain"><b>${esc(r.name || KINDS[r.kind].one)}</b><span>${esc(niceDate(r.date))}</span></span><span class="lside">${eur(num(r.amount) || 0)}</span></div>`).join('') || quiet('Only lists and settings.')}</div>
    <p class="lnone">You can undo this right after.</p>`;
  go.disabled = false; go.textContent = `Remove ${res.gone.length}`;
  go.onclick = async () => {
    go.disabled = true; const msg = sh.querySelector('[data-msg]'); msg.textContent = 'Removing…';
    const old = [...res.gone, ...res.changes.map(c => L.byId[c.id])].map(r => ({ id: r.id, kind: r.kind, data: dataOf(r) }));
    const ids = res.gone.map(r => r.id), now = new Date().toISOString();
    try {
      for (let i = 0; i < res.changes.length; i += 400) { const { error } = await C.sb.from('records').upsert(res.changes.slice(i, i + 400).map(r => ({ user_id: C.uid(), id: r.id, kind: r.kind, data: r.data, updated_at: now }))); if (error) throw error; }
      for (let i = 0; i < ids.length; i += 200) { msg.textContent = `Removing ${Math.min(ids.length, i + 200)} of ${ids.length}…`; const { error } = await C.sb.from('records').delete().in('id', ids.slice(i, i + 200)); if (error) throw error; }
    } catch (e) { console.error(e); msg.textContent = ''; C.toast('Could not remove them all. Reload and try again.'); go.disabled = false; return; }
    const gone = new Set(ids), ch = new Map(res.changes.map(c => [c.id, c]));
    L.all = L.all.filter(r => !gone.has(r.id)).map(r => ch.has(r.id) ? { ...ch.get(r.id).data, id: r.id, kind: r.kind } : r);
    index(); cacheSave(); C.closeSheet(); C.render();
    C.undoPush?.(`Removed ${plural(ids.length, 'duplicate')}`, () => putMany(old, null, 'restore'), true);
  };
}
// start over: removes every money record (accounts, plan, purchases, money in, repeats, settings), in one step you can undo
function fClear() {
  const all = L.all.filter(r => FIN_KINDS.includes(r.kind));
  if (!all.length) { C.toast('There is no finance data to clear.'); return; }
  const per = FIN_KINDS.map(k => [k, all.filter(r => r.kind === k).length]).filter(([, n]) => n);
  const sh = C.sheet({ title: 'Clear all finance data', body: `<p class="lnone">This removes everything in Finance, so you can import your backup again from scratch. The rest of the app stays as it is.</p>
    <div class="lrows">${per.map(([k, n]) => `<div class="lrow"><span class="lmain"><b>${esc(KINDS[k].many)}</b></span><span class="lside">${n}</span></div>`).join('')}</div>
    <div class="field"><label for="fclr">Type CLEAR to confirm</label><input id="fclr" autocomplete="off" autocapitalize="characters" placeholder="CLEAR"></div>
    <p class="lnone">You can undo this right after, from the message at the bottom or Settings › Undo.</p>`,
    foot: `<span class="busy" data-msg></span><div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary danger" data-go disabled>Delete ${plural(all.length, 'record')}</button>` });
  const go = sh.querySelector('[data-go]'), inp = sh.querySelector('#fclr');
  inp.addEventListener('input', () => { go.disabled = inp.value.trim().toUpperCase() !== 'CLEAR'; });
  go.onclick = async () => {
    go.disabled = true; const msg = sh.querySelector('[data-msg]'), ids = all.map(r => r.id), old = all.map(r => ({ id: r.id, kind: r.kind, data: dataOf(r) }));
    try { for (let i = 0; i < ids.length; i += 200) { msg.textContent = `Deleting ${Math.min(ids.length, i + 200)} of ${ids.length}…`; const { error } = await C.sb.from('records').delete().in('id', ids.slice(i, i + 200)); if (error) throw error; } }
    catch (e) { console.error(e); msg.textContent = ''; go.disabled = false; C.toast('Could not delete everything. Reload and try again.'); return; }
    const gone = new Set(ids); L.all = L.all.filter(r => !gone.has(r.id)); index(); cacheSave(); C.closeSheet(); C.render();
    C.undoPush?.(`Cleared all finance data (${plural(ids.length, 'record')})`, () => putMany(old, null, 'restore'), true);
  };
}
/* the real paydates for a year, entered once: each month starts with what the app expects (your usual day,
   moved off the weekend) and you change the ones that differ, like a payday before a holiday */
function fPayDates(year = +today().slice(0, 4)) {
  const have = new Map(fPayList().map(d => [d.slice(0, 7), d])), ys = [year - 1, year, year + 1].filter(y => y >= +today().slice(0, 4) - 1);
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  const wd = d => d ? fromISO(d).toLocaleDateString('en-GB', { weekday: 'short' }) : '';
  const sh = C.sheet({ title: `Paydates ${year}`, body: `<div class="seg fseg" role="group" aria-label="Year">${ys.map(y => `<button data-py="${y}" aria-pressed="${y === year}">${y}</button>`).join('')}</div>
    <p class="lnone">${fPayDom() ? `Filled in from your usual payday, day ${fPayDom()} of the month. Change the dates that are different.` : 'Set your usual payday first, or fill in each date.'} Dates you save here always win.</p>
    <div class="lrows fpaylist">${months.map(m => { const d = have.get(m) || fPayGuess(m) || ''; return `<label class="lrow"><span class="lmain"><b>${esc(fromISO(m + '-01').toLocaleDateString('en-GB', { month: 'long' }))}</b><span data-wd>${esc(wd(d))}${have.has(m) ? '' : d ? ' · expected' : ''}</span></span><input class="finp" type="date" data-pm="${m}" value="${d}" min="${m}-01" max="${addDays(addMonths(m + '-01', 1), -1)}"></label>`; }).join('')}</div>`,
    foot: '<div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary" data-go>Save</button>' });
  sh.addEventListener('click', e => { const b = e.target.closest('[data-py]'); if (b) { C.closeSheet(); fPayDates(+b.dataset.py); } });
  sh.addEventListener('input', e => { const i = e.target.closest('[data-pm]'); if (i) i.closest('.lrow').querySelector('[data-wd]').textContent = wd(i.value); });
  sh.querySelector('[data-go]').onclick = async () => {
    const mine = [...sh.querySelectorAll('[data-pm]')].map(i => i.value).filter(Boolean);
    const keep = fPayList().filter(d => !months.includes(d.slice(0, 7)) && d >= addMonths(today(), -24));
    await saveFset({ paydates: [...keep, ...mine].sort() }); C.closeSheet(); C.toast(`Saved ${plural(mine.length, 'payday')} for ${year}`);
  };
}
async function saveFset(patch) { const r = recs('fset')[0]; try { r ? await put('fset', r.id, { ...dataOf(r), ...patch }) : await create('fset', patch); } catch {} }
function accHistory(id) {
  const a = L.byId[id]; if (!a) return;
  const rows = [...recs('ftx').filter(x => x.account === id).map(x => ({ x, s: -1 })), ...recs('fincome').filter(x => x.account === id).map(x => ({ x, s: 1 })), ...recs('fchecks').filter(c => c.account === id).map(x => ({ x, s: 0 }))]
    .sort((p, q) => ((q.x.date || q.x.at || '') + String(fSeq(q.x)).padStart(15, '0')).localeCompare((p.x.date || p.x.at || '') + String(fSeq(p.x)).padStart(15, '0'))).slice(0, 80);
  C.sheet({ title: a.name || 'Account', body: `<p class="lnone">${fBalance(a) == null ? 'No balance yet' : 'About ' + fSigned(fBalance(a)) + ' now'}</p><div class="lrows">${rows.map(({ x, s }) => `<div class="lrow"><button class="lmain" data-act="open" data-id="${x.id}"><b>${esc(s ? x.name || 'Line' : 'Balance check')}</b><span>${esc(niceDate(x.date || x.at))}${x.transfer ? ' · transfer' : ''}</span></button><span class="lside ${s > 0 ? 'mgood' : ''}">${s ? (s < 0 ? '−' : '+') + eur(num(x.amount)) : '= ' + eur(num(x.amount))}</span></div>`).join('') || quiet('Nothing on this account yet.')}</div>` });
}
function moveMoney(pre = {}) {
  const accs = fAccs().filter(a => a.type !== 'Card'), fi = id => Math.max(0, accs.findIndex(a => a.id === id)), opt = sel => accs.map((a, i) => `<option value="${a.id}" ${i === sel ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
  if (accs.length < 2) { C.toast('Add at least two accounts first.'); return; }
  const sh = C.sheet({ title: 'Move money', body: `<div class="field"><label>From</label><select class="pill" data-mv="from">${opt(pre.from ? fi(pre.from) : 0)}</select></div><div class="field"><label>To</label><select class="pill" data-mv="to">${opt(pre.to ? fi(pre.to) : 1)}</select></div><div class="field"><label>Amount</label><input type="number" inputmode="decimal" step="0.01" data-mv="amt" value="${pre.amt ?? ''}"></div><div class="field"><label>Date</label><input type="date" data-mv="date" value="${pre.date || today()}"></div><p class="lnone">Moves money between your own accounts. It never counts as spending.</p>`, foot: '<div class="spacer"></div><button class="btn primary" data-mvgo>Move</button>' });
  sh.querySelector('[data-mvgo]').onclick = async () => {
    const v = k => sh.querySelector(`[data-mv="${k}"]`).value, amt = num(v('amt')), from = v('from'), to = v('to');
    if (!amt || amt <= 0 || from === to) { C.toast('Pick two different accounts and an amount.'); return; }
    const name = `${L.byId[from].name} → ${L.byId[to].name}`;
    try { await create('ftx', { name, amount: amt, date: v('date'), account: from, transfer: true }); await create('fincome', { name, amount: amt, date: v('date'), account: to, type: 'Other', transfer: true, confirmed: true }); C.closeSheet(); C.toast('Moved'); } catch { C.toast('Could not save. Try again.'); }
  };
}

/* ---------- bank CSV (ING, Rabobank) ---------- */
function csvParse(text) {
  const first = text.split(/\r?\n/, 1)[0], d = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === d) { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); if (row.some(x => x !== '')) rows.push(row); row = []; cur = ''; } else cur += c;
  }
  row.push(cur); if (row.some(x => x !== '')) rows.push(row);
  return rows;
}
const nlNum = s => { s = String(s || '').replace(/\s|€/g, ''); if (!s) return null; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const n = Number(s); return isFinite(n) ? n : null; };
const nlDate = s => { s = String(s || '').trim(); return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}` : /^\d{2}-\d{2}-\d{4}$/.test(s) ? s.split('-').reverse().join('-') : s.slice(0, 10); };
const ibanN = s => String(s || '').replace(/\s/g, '').toUpperCase();
function bankRows(rows) {
  const h = rows[0].map(x => norm(x)), at = name => h.indexOf(name), get = (r, n) => { const i = at(n); return i >= 0 ? (r[i] || '').trim() : ''; };
  let bank = '', out = [];
  if (at('naam / omschrijving') >= 0 && at('af bij') >= 0) {
    bank = 'ING';
    out = rows.slice(1).map((r, i) => { const a = nlNum(get(r, 'bedrag (eur)')) || 0, af = /^af/i.test(get(r, 'af bij')); return { i, date: nlDate(get(r, 'datum')), amount: Math.abs(a), out: af, name: get(r, 'naam / omschrijving'), desc: get(r, 'mededelingen'), own: ibanN(get(r, 'rekening')), other: ibanN(get(r, 'tegenrekening')), bal: nlNum(get(r, 'saldo na mutatie')) }; });
  } else if (at('naam tegenpartij') >= 0 && at('iban/bban') >= 0) {
    bank = 'Rabobank';
    out = rows.slice(1).map((r, i) => { const a = nlNum(get(r, 'bedrag')) || 0; return { i, date: nlDate(get(r, 'datum')), amount: Math.abs(a), out: a < 0, name: get(r, 'naam tegenpartij') || get(r, 'omschrijving-1'), desc: [get(r, 'omschrijving-1'), get(r, 'omschrijving-2'), get(r, 'omschrijving-3')].filter(Boolean).join(' '), own: ibanN(get(r, 'iban/bban')), other: ibanN(get(r, 'tegenrekening iban/bban')), bal: nlNum(get(r, 'saldo na trn')), nr: get(r, 'volgnr') }; });
  }
  out = out.filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.amount > 0);
  for (const r of out) r.ref = [bank, r.own, r.date, (r.out ? '-' : '+') + r.amount.toFixed(2), norm(r.name), r.nr || (r.bal != null ? r.bal.toFixed(2) : r.i)].join('|');
  return { bank, rows: out };
}
async function readCsvText(file) { const buf = await file.arrayBuffer(); try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { return new TextDecoder('windows-1252').decode(buf); } }
function pickCsv() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,text/csv'; inp.className = 'vh'; document.body.appendChild(inp);
  inp.addEventListener('change', async () => { const f = inp.files?.[0]; inp.remove(); if (f) fCsvImport(f); });
  inp.click();
}
async function fCsvImport(file) {
  let parsed;
  try { parsed = bankRows(csvParse(await readCsvText(file))); } catch (e) { console.error(e); parsed = { rows: [] }; }
  if (!parsed.rows.length) { C.toast('This isn’t a CSV from ING or Rabobank that the app can read.'); return; }
  const { bank, rows } = parsed, accs = recs('faccounts'), byIban = new Map(accs.filter(a => a.iban).map(a => [ibanN(a.iban), a.id]));
  const refs = new Set([...recs('ftx'), ...recs('fincome')].map(x => x.bankRef).filter(Boolean));
  const owns = [...new Set(rows.map(r => r.own))], pick = {};
  for (const o of owns) pick[o] = byIban.get(o) || '';
  const sh = C.sheet({ title: `Import ${bank} statement`, body: '<div data-csvbody></div>', foot: `<span class="busy" data-msg></span><div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary" data-go>Import</button>` });
  // what each line becomes, with the account choice you make in this sheet
  const plan = () => {
    const accOf = r => pick[r.own] || '', ownAcc = r => r.other && (byIban.get(r.other) || Object.entries(pick).find(([ib, id]) => id && ib === r.other)?.[1]);
    const tx = recs('ftx'), out = { add: [], dup: [], patch: [] };
    for (const r of rows) {
      if (refs.has(r.ref)) { out.dup.push(r); continue; }
      const acc = accOf(r);
      // an Apple Pay or hand-written purchase with the same amount within 3 days is the same payment
      const same = r.out && tx.find(x => !x.bankRef && Math.abs((num(x.amount) || 0) - r.amount) < 0.005 && (!x.account || x.account === acc) && Math.abs(diffDays(x.date, r.date)) <= 3 && !out.patch.some(p => p.id === x.id));
      if (same) { out.dup.push(r); out.patch.push({ id: same.id, ref: r.ref }); continue; }
      out.add.push({ ...r, acc, transfer: !!ownAcc(r) });
    }
    return out;
  };
  const draw = () => {
    const p = plan(), outs = p.add.filter(r => r.out && !r.transfer), ins = p.add.filter(r => !r.out && !r.transfer), tr = p.add.filter(r => r.transfer);
    sh.querySelector('[data-csvbody]').innerHTML = `${owns.map(o => `<div class="field"><label>Account ${esc(o ? '…' + o.slice(-4) : '')}</label><select class="pill" data-csvacc="${esc(o)}"><option value="">Choose an account</option>${accs.map(a => `<option value="${a.id}" ${pick[o] === a.id ? 'selected' : ''}>${esc(a.name || 'Account')}</option>`).join('')}<option value="new">New account</option></select></div>`).join('')}
      <div class="lrows">${[['Purchases', outs.length], ['Money in', ins.length], ['Own transfers (not spending)', tr.length], ['Already here, skipped', p.dup.length]].map(([l, n]) => `<div class="lrow"><span class="lmain"><b>${l}</b></span><span class="lside">${n}</span></div>`).join('')}</div>
      ${p.add.length ? `<p class="dsub">First lines</p><div class="lrows">${p.add.slice(0, 6).map(r => `<div class="lrow"><span class="lmain"><b>${esc(r.name)}</b><span>${esc(niceDate(r.date))}${r.transfer ? ' · own transfer' : ''}</span></span><span class="lside ${r.out ? '' : 'mgood'}">${r.out ? '−' : '+'}${eur(r.amount)}</span></div>`).join('')}</div>` : ''}`;
    sh.querySelector('[data-go]').textContent = `Import ${p.add.length}`;
    sh.querySelector('[data-go]').disabled = !p.add.length && !p.patch.length;
  };
  sh.addEventListener('change', async e => {
    const s = e.target.closest('[data-csvacc]'); if (!s) return;
    const o = s.dataset.csvacc;
    if (s.value === 'new') { const id = C.uuid(); await put('faccounts', id, { name: `${bank} …${o.slice(-4)}`, type: 'Spending', safe: true, iban: o, created: Date.now() }).catch(() => {}); pick[o] = id; accs.push(L.byId[id]); }
    else pick[o] = s.value;
    draw();
  });
  draw();
  sh.querySelector('[data-go]').onclick = async e => {
    const b = e.target, msg = sh.querySelector('[data-msg]'), p = plan();
    if (owns.some(o => !pick[o])) { msg.textContent = 'Choose an account first.'; return; }
    b.disabled = true;
    try {
      for (const o of owns) { const a = L.byId[pick[o]]; if (a && o && ibanN(a.iban) !== o) await put('faccounts', a.id, { ...dataOf(a), iban: o }); }
      const chrono = [...p.add].sort((a, c) => a.date.localeCompare(c.date) || (rows[0].date > rows[rows.length - 1].date ? c.i - a.i : a.i - c.i)), base = Date.now(), recsOut = [];
      const learned = name => { const n = norm(name); return recs('ftx').filter(x => norm(x.name) === n && x.category).sort((a, c) => (c.date || '').localeCompare(a.date || ''))[0]?.category || ''; };
      const payName = new Set(recs('fincome').filter(i => i.type === 'Pay').map(i => norm(i.name)));
      chrono.forEach((r, k) => {
        const common = { date: r.date, amount: r.amount, account: r.acc, seq: base + k, bankRef: r.ref, source: bank + ' CSV', notes: r.desc ? r.desc.slice(0, 240) : '', created: base + k, ...(r.transfer ? { transfer: true } : {}) };
        if (r.out) { const rule = ruleFor(r.name); recsOut.push({ id: C.uuid(), kind: 'ftx', data: { ...common, name: rule?.rename || r.name, category: rule?.category || learned(r.name) } }); }
        else recsOut.push({ id: C.uuid(), kind: 'fincome', data: { ...common, name: r.name, type: payName.has(norm(r.name)) ? 'Pay' : 'Other', confirmed: true } });
      });
      // the bank's balance after the newest line becomes a balance check, so account balances match the bank
      for (const o of owns) {
        const mine = rows.filter(r => r.own === o && r.bal != null); if (!mine.length) continue;
        const desc = rows[0].date > rows[rows.length - 1].date, last = mine.reduce((a, c) => c.date > a.date || (c.date === a.date && (desc ? c.i < a.i : c.i > a.i)) ? c : a);
        recsOut.push({ id: C.uuid(), kind: 'fchecks', data: { account: pick[o], amount: last.bal, at: last.date, seq: base + chrono.length + 1, notes: `From ${bank} CSV`, created: base + chrono.length + 1 } });
      }
      for (const pt of p.patch) { const x = L.byId[pt.id]; if (x) recsOut.push({ id: x.id, kind: 'ftx', data: { ...dataOf(x), bankRef: pt.ref } }); }
      await putMany(recsOut, (n, all) => { msg.textContent = `Saving ${n} of ${all}…`; }, `Imported ${bank} statement (${plural(p.add.length, 'line')})`);
      C.closeSheet(); C.toast(`Imported ${plural(p.add.length, 'line')}${p.dup.length ? `, skipped ${p.dup.length} already here` : ''}`);
    } catch (err) { console.error(err); msg.textContent = 'Could not import. Try again.'; b.disabled = false; }
  };
}

/* ---------- search everywhere ----------
   Every record is matched on its name and on all its words: text, notes, choices and linked records.
   Each word you type has to appear somewhere; a name match ranks above a match in the notes. */
const KIND_PAGE = {};
for (const [p, c] of Object.entries(PAGES)) for (const s of c.segs || []) if (!s.fill) KIND_PAGE[s.kind] ||= { page: p, seg: s.key || s.kind };
for (const [p, c] of Object.entries(PAGES)) for (const k of [...(c.segs || []).map(s => s.kind), ...(c.adds || [])]) KIND_PAGE[k] ||= { page: p };
const SEARCH_TYPES = new Set(['text', 'long', 'select', 'multi', 'rel']);
function searchText(r, f) {
  const v = r[f.k];
  if (v == null || v === '') return '';
  return f.type === 'rel' ? relNames(v).join(', ') : Array.isArray(v) ? v.join(', ') : String(v);
}
function search(q) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length || !C) return [];
  const out = [];
  for (const r of L.all) {
    const K = KINDS[r.kind]; if (!K) continue;
    const title = titleOf(r), tl = title.toLowerCase();
    const parts = K.fields.filter(f => SEARCH_TYPES.has(f.type)).map(f => [f.label, searchText(r, f)]).filter(p => p[1]);
    const hay = [tl, ...parts.map(p => p[1].toLowerCase())].join('\n');
    if (!words.every(w => hay.includes(w))) continue;
    const inTitle = words.every(w => tl.includes(w));
    const score = inTitle ? (tl.startsWith(words[0]) ? 0 : 1) : 2;
    const hit = inTitle ? null : parts.find(p => words.some(w => p[1].toLowerCase().includes(w)));
    const where = KIND_PAGE[r.kind], sec = where ? sectionOf(where.page) : null;
    const view = sec?.views.find(v => vkey(sec, v) === where.page);
    out.push({
      id: r.id, title, score, kind: K.one,
      where: [sec?.label, view && view[0] !== 'today' ? view[1] : K.many].filter(Boolean).join(' · '),
      sub: hit ? hit[1] : (K.sub?.(r) || ''), label: hit ? hit[0] : '',
      icon: G(sec?.icon || P.list)
    });
  }
  return out.sort((a, b) => a.score - b.score || a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
}
// opens a search result where it lives: its page, on the right tab, with its editor on top
function openFound(id, go) {
  const r = L.byId[id]; if (!r) return;
  const w = KIND_PAGE[r.kind];
  if (w) { if (w.seg) uiOf(w.page).seg = w.seg; go?.(w.page); }
  openRecord(id);
}

/* ---------- your own overview per section ----------
   Every section's overview is made of blocks (the tiles, each panel). In the section's Settings you show or hide
   each block, put them in your own order, and add blocks of your own: a list from this section or a note.
   Saved in your prefs, so every device shows the same. */
const overviewOf = sec => { const s = SECTIONS.find(x => x.key === sec); if (!s) return ''; const p = vkey(s, s.views[0]); return PAGES[p]?.render ? p : ''; };
const ovCfg = page => ({ hidden: [], order: [], extra: [], ...((C.prefs().ov || {})[page] || {}) });
const ovSlug = t => 'p:' + deUml(String(t).split(',')[0]).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
function ovBlocks(host) {
  const out = [], seen = new Map(), isBlock = el => el.matches('section.panel, .tiles, .quickacts, .mjump, .note.dnote');
  const walk = el => { for (const c of el.children) { if (c.matches('.viewhead, h1, form')) continue; if (isBlock(c)) { let key, label;
    if (c.matches('.tiles')) { key = 't:' + out.filter(b => b.key.startsWith('t:')).length; label = 'Summary tiles' + (key === 't:0' ? '' : ' ' + key.slice(2)); }
    else if (c.matches('.quickacts')) { key = 'q'; label = 'Buttons'; } else if (c.matches('.mjump')) { key = 'j'; label = 'Jump menu'; } else if (c.matches('.note')) { key = 'n'; label = 'Tip of the week'; }
    else { label = (c.querySelector('h3, h2')?.textContent || 'Panel').trim(); key = c.dataset.ov || ovSlug(label); }
    const n = (seen.get(key) || 0) + 1; seen.set(key, n); if (n > 1) key += '-' + n;
    out.push({ key, label, el: c, wide: !c.parentElement.matches('.panels, .mrow2, .mtop, .wtables') }); } else if (c.children.length && !c.matches('section, .panel')) walk(c); } };
  walk(host); return out;
}
function ovExtraHTML(x) {
  if (x.type === 'note') return `<section class="panel lpanel" data-ov="x:${x.id}"><div class="lph3"><h3>${esc(x.title || 'Note')}</h3></div><p class="ovnote">${esc(x.text || '')}</p></section>`;
  const K = KINDS[x.kind]; if (!K) return '';
  const list = sortList(recs(x.kind).filter(r => !K.hide?.(r)), K, K.sorts?.[0]?.[0] || '-created').slice(0, num(x.n) || 6);
  return `<section class="panel lpanel" data-ov="x:${x.id}"><div class="lph3"><h3>${esc(x.title || K.many)}</h3></div>${list.length ? (PRODUCTS.has(x.kind) ? `<div class="lgrid small">${list.map(card).join('')}</div>` : `<div class="lrows">${list.map(row).join('')}</div>`) : quiet('Nothing here yet.')}</section>`;
}
function layoutOverview(host, page) {
  const cfg = ovCfg(page);
  if (cfg.extra.length) host.insertAdjacentHTML('beforeend', `<div class="ovextra">${cfg.extra.map(ovExtraHTML).join('')}</div>`);
  if (!cfg.hidden.length && !cfg.order.length) return;
  const blocks = ovBlocks(host), hid = new Set(cfg.hidden);
  if (cfg.order.length) {
    // your own order: all blocks in one flowing grid, wide blocks across the full width
    const rank = b => { const i = cfg.order.indexOf(b.key); return i < 0 ? 1000 + blocks.indexOf(b) : i; };
    const flow = document.createElement('div'); flow.className = 'ovflow';
    for (const b of [...blocks].sort((a, c) => rank(a) - rank(c))) { b.el.classList.toggle('ovwide', b.wide); flow.appendChild(b.el); }
    const head = host.querySelector('.viewhead'); (head?.parentElement === host ? head : host.firstElementChild)?.after(flow);
    host.querySelectorAll('.panels, .mrow2, .mtop, .wtables, .ovextra').forEach(w => { if (!w.children.length) w.remove(); });
  }
  for (const b of blocks) if (hid.has(b.key)) b.el.hidden = true;
  host.querySelectorAll('.panels, .mrow2, .mtop, .wtables').forEach(w => { if ([...w.children].every(c => c.hidden)) w.hidden = true; });
}
function ovPanel(sec) {
  const page = overviewOf(sec); if (!page) return '';
  const div = document.createElement('div');
  try { PAGES[page].render(div); layoutOverview(div, page); } catch { return ''; }
  const cfg = ovCfg(page), blocks = ovBlocks(div), keys = blocks.map(b => b.key);
  const order = cfg.order.length ? [...cfg.order.filter(k => keys.includes(k)), ...keys.filter(k => !cfg.order.includes(k))] : keys;
  const byKey = new Map(blocks.map(b => [b.key, b]));
  const kinds = [...new Set(Object.entries(PAGES).filter(([pg]) => pg.startsWith(sec + '/')).flatMap(([, c]) => [...(c.segs || []).map(x => x.kind), ...(c.adds || [])]))].filter(k => KINDS[k]);
  return `<section class="panel setpanel" id="set-ov"><h3>Overview</h3><p class="muted">Show, hide and order what's on the overview of this section, and add blocks of your own.</p>
    ${order.map((k, i) => { const b = byKey.get(k), x = k.startsWith('x:') ? cfg.extra.find(e => 'x:' + e.id === k) : null; return `<div class="setrow"><b>${esc(b.label)}</b><div class="spacer"></div>
      <label class="settog"><input type="checkbox" data-ovshow="${esc(page)}" data-k="${esc(k)}" ${cfg.hidden.includes(k) ? '' : 'checked'}> Show</label>
      <span class="setmv"><button class="iconbtn small" data-ovmove="${esc(page)}" data-k="${esc(k)}" data-d="-1" aria-label="Move up" ${i ? '' : 'disabled'}>↑</button><button class="iconbtn small" data-ovmove="${esc(page)}" data-k="${esc(k)}" data-d="1" aria-label="Move down" ${i < order.length - 1 ? '' : 'disabled'}>↓</button></span>
      ${x ? `<button class="iconbtn small" data-ovdel="${esc(page)}" data-k="${esc(x.id)}" aria-label="Remove ${esc(b.label)}">×</button>` : ''}</div>`; }).join('')}
    <div class="ovadd"><p class="dsub">Add a block</p>
      <div class="ovaddrow"><select class="pill" data-ovkind aria-label="List">${kinds.map(k => `<option value="${k}">${esc(KINDS[k].many)}</option>`).join('')}</select><input class="finp" data-ovtitle placeholder="Title (optional)" aria-label="Title"><button class="btn small" data-ovaddlist="${esc(page)}">Add list</button></div>
      <div class="ovaddrow"><input class="finp" data-ovnote placeholder="A note, a goal, a reminder" aria-label="Note"><button class="btn small" data-ovaddnote="${esc(page)}">Add note</button></div></div>
    <button class="chip link" data-ovreset="${esc(page)}">Back to the standard overview</button></section>`;
}
async function ovSave(page, patch) {
  const all = { ...(C.prefs().ov || {}) }; all[page] = patch ? { ...ovCfg(page), ...patch } : undefined; if (!patch) delete all[page];
  try { await C.savePrefs({ ov: all }); } catch { C.toast('Could not save. Try again.'); }
}
document.addEventListener('change', e => { const t = e.target; if (!C || !t.matches?.('[data-ovshow]')) return; const page = t.dataset.ovshow, h = new Set(ovCfg(page).hidden); t.checked ? h.delete(t.dataset.k) : h.add(t.dataset.k); ovSave(page, { hidden: [...h] }); });
document.addEventListener('click', e => {
  const b = e.target.closest?.('[data-ovmove], [data-ovdel], [data-ovaddlist], [data-ovaddnote], [data-ovreset]'); if (!b || !C) return;
  const box = b.closest('#set-ov');
  if (b.dataset.ovmove) { const page = b.dataset.ovmove, keys = [...box.querySelectorAll('[data-ovmove][data-d="-1"]')].map(x => x.dataset.k), i = keys.indexOf(b.dataset.k), j = i + Number(b.dataset.d); if (j < 0 || j >= keys.length) return; [keys[i], keys[j]] = [keys[j], keys[i]]; ovSave(page, { order: keys }); }
  if (b.dataset.ovdel) { const page = b.dataset.ovdel, c = ovCfg(page); ovSave(page, { extra: c.extra.filter(x => x.id !== b.dataset.k), order: c.order.filter(k => k !== 'x:' + b.dataset.k) }); }
  if (b.dataset.ovaddlist) { const page = b.dataset.ovaddlist, c = ovCfg(page); ovSave(page, { extra: [...c.extra, { id: C.uuid().slice(0, 8), type: 'list', kind: box.querySelector('[data-ovkind]').value, title: box.querySelector('[data-ovtitle]').value.trim() }] }).then(() => C.toast('Added to the overview')); }
  if (b.dataset.ovaddnote) { const page = b.dataset.ovaddnote, c = ovCfg(page), v = box.querySelector('[data-ovnote]').value.trim(); if (!v) return; ovSave(page, { extra: [...c.extra, { id: C.uuid().slice(0, 8), type: 'note', title: 'Note', text: v }] }).then(() => C.toast('Added to the overview')); }
  if (b.dataset.ovreset) ovSave(b.dataset.ovreset, null).then(() => C.toast('Back to the standard overview'));
});

/* ---------- tidy up the pantry and kitchen gear ----------
   Pantry items that an accepted inbox recipe made by itself (lower-case name, nothing filled in) go away, items with
   the same name are merged into one, English categories become Dutch, and Dutch names proposed by Claude (a "tidy"
   record the offers function saves; "-" there means remove it) are used. Everything is one step to undo. */
const autoIng = r => /^[a-zà-ÿ]/.test(r.name || '') && !r.category && !r.stock && !r.list && !r.location && !(r.helps || []).length && !r.notes;
function tidyPlan() {
  const prop = recs('tidy').sort((a, b) => (b.created || 0) - (a.created || 0))[0], names = prop?.names || {};
  const ing = recs('ingredients'), gear = recs('gear'), drop = new Set(ing.filter(r => autoIng(r) || names[r.id] === '-').map(r => r.id)), nameOf = r => names[r.id] || r.name;
  const groups = new Map(), into = new Map();
  for (const r of ing) if (!drop.has(r.id)) { const k = deUml(nameOf(r)); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  const score = r => (r.stock ? 8 : 0) + (r.list ? 4 : 0) + (r.category ? 2 : 0) + Object.keys(r).length / 100;
  for (const g of groups.values()) if (g.length > 1) { g.sort((a, b) => score(b) - score(a)); for (const r of g.slice(1)) into.set(r.id, g[0].id); }
  const gone = new Set([...drop, ...into.keys()]), changes = new Map();
  const fix = (r, kind) => { const d = dataOf(r), n = { ...d }; if (names[r.id]) n.name = names[r.id]; if (n.category) n.category = catNL(kind, n.category); if (JSON.stringify(n) !== JSON.stringify(d)) changes.set(r.id, { id: r.id, kind, data: n }); };
  for (const r of ing) if (!gone.has(r.id)) fix(r, 'ingredients');
  for (const [from, to] of into) { const a = L.byId[from], c = changes.get(to) || { id: to, kind: 'ingredients', data: dataOf(L.byId[to]) }; if (a.stock) c.data.stock = true; if (a.list) c.data.list = true; if (!c.data.category && a.category) c.data.category = catNL('ingredients', a.category); changes.set(to, c); }
  for (const r of gear) fix(r, 'gear');
  // recipes, meals and the rest that point at a removed pantry item point at the kept one, or lose the link
  for (const r of L.all) {
    if (gone.has(r.id) || r.kind === 'ingredients' || r.kind === 'gear') continue;
    const d = dataOf(r); let hit = false;
    for (const [k, v] of Object.entries(d)) if (Array.isArray(v) && v.some(x => gone.has(x))) { hit = true; d[k] = [...new Set(v.filter(x => !drop.has(x)).map(x => into.get(x) || x))]; }
    if (hit) changes.set(r.id, { id: r.id, kind: r.kind, data: d });
  }
  const live = r => !gone.has(r.id);
  return { auto: drop.size, merged: into.size, gone: [...gone], changes: [...changes.values()], proposed: !!prop,
    renamed: [...ing, ...gear].filter(r => live(r) && names[r.id] && names[r.id] !== r.name).length,
    cats: [...ing, ...gear].filter(r => live(r) && r.category && catNL(r.kind, r.category) !== r.category).length,
  };
}
async function tidyRun() {
  const t = tidyPlan(); if (!t.changes.length && !t.gone.length) { C.toast('Nothing to tidy'); return; }
  if (!confirm(`Remove ${plural(t.gone.length, 'pantry item')} and update ${plural(t.changes.length, 'other record')}? You can undo it right after.`)) return;
  const removed = t.gone.map(id => L.byId[id]).filter(Boolean).map(r => ({ id: r.id, kind: r.kind, data: dataOf(r) }));
  const befores = t.changes.map(c => ({ id: c.id, kind: c.kind, data: dataOf(L.byId[c.id]) }));
  C.toast('Tidying up…');
  try {
    await C.undoQuiet(async () => {
      if (t.changes.length) await putMany(t.changes, null, 'restore');
      for (let i = 0; i < t.gone.length; i += 200) { const { error } = await C.sb.from('records').delete().in('id', t.gone.slice(i, i + 200)); if (error) throw error; }
      const g = new Set(t.gone); L.all = L.all.filter(r => !g.has(r.id)); index(); cacheSave();
    });
  } catch { C.toast('Could not tidy everything. Try again.'); C.render(); return; }
  // the category lists you edited in Settings follow too
  const ol = { ...(C.prefs().optLists || {}) }; let olc = false;
  for (const kind of ['ingredients', 'gear']) { const c = ol[kind + '.category']; if (c?.list) { ol[kind + '.category'] = { ...c, list: c.list.map(v => catNL(kind, v)), hidden: (c.hidden || []).map(v => catNL(kind, v)) }; olc = true; } }
  if (olc) C.savePrefs({ optLists: ol }).catch(() => {});
  C.undoPush('Tidied the pantry and kitchen gear', () => putMany([...befores, ...removed], null, 'restore'), true);
  C.render();
}
function tidyPanel() {
  const t = tidyPlan(), any = t.gone.length || t.changes.length;
  return `<section class="panel setpanel"><h3>Tidy up the pantry</h3><p class="muted">Pantry items that accepted recipes added by themselves, doubles, and English names and categories.</p>
    <div class="lrows">${[[t.auto, 'made by accepted recipes, removed'], [t.merged, 'doubles, merged into one'], [t.renamed, 'get a Dutch name'], [t.cats, 'get a Dutch category']].map(([n, l]) => `<p class="dline"><span>${esc(l)}</span><b>${n}</b></p>`).join('')}</div>
    ${t.proposed ? '' : '<p class="muted">Dutch names follow once Claude has suggested them.</p>'}
    <div class="setbtns"><button class="btn small ${any ? 'primary' : ''}" data-act="tidy" ${any ? '' : 'disabled'}>${any ? 'Tidy up now' : 'All tidy'}</button></div></section>`;
}

/* ---------- trips ----------
   One trip, two places: Closet › Trips plans outfits and packing, Life › Trips the rest (travel and stay, a plan per
   day, budget, ideas and a checklist before you leave). Trips live in prefs.trips; every change here can be undone. */
const TRIP_CHECK = ['Check in online', 'Tickets and boarding passes on your phone', 'Travel insurance', 'Someone to water the plants', 'Take out the bins', 'Charge the power bank', 'Download maps and music offline', 'Lock windows and doors'];
const tripList = () => (C?.trips?.() || []).filter(t => t.start).sort((a, b) => a.start.localeCompare(b.start));
const tripEnd = t => addDays(t.start, Math.max(1, t.days | 0) - 1);
const nextTrip = () => tripList().find(t => tripEnd(t) >= today());
const tripName = t => t.name || t.dest?.name || 'Trip';
const tripWhen = t => { const d = diffDays(today(), t.start); return d > 1 ? `in ${d} days` : d === 1 ? 'tomorrow' : d === 0 ? 'starts today' : tripEnd(t) >= today() ? 'on your trip now' : 'done'; };
const tripSpent = t => { const end = tripEnd(t); return fSum(recs('ftx').filter(x => x.trip === t.id || (!x.trip && fEveryday(x) && x.date >= t.start && x.date <= end))); };
async function tripSave(t, patch, label, show = false) {
  const before = JSON.parse(JSON.stringify(t)), next = { ...before, ...patch };
  if (await C.saveTrip(next)) C.undoPush?.(label || `Changed ${tripName(t)}`, () => C.saveTrip(before), show);
}
const tripOf = id => tripList().find(t => t.id === id);
function tripsPage(host) {
  const all = tripList(), t = tripOf(L.tripId);
  const tabs = `<div class="seg" role="group" aria-label="Trips or stays" style="margin-bottom:16px">${[['trips', 'Trips'], ['stays', `Saved stays · ${recs('stays').length}`]].map(([k, l]) => `<button data-act="triptab" data-v="${k}" aria-pressed="${(L.tripTab || 'trips') === k}">${l}</button>`).join('')}</div>`;
  if (!t && L.tripTab === 'stays') { host.innerHTML = `${head('Trips')}${tabs}${staysHTML()}`; return; }
  if (!t) {
    const up = all.filter(x => tripEnd(x) >= today()), past = all.filter(x => tripEnd(x) < today()).reverse();
    const card = x => { const b = num(x.budget), sp = tripSpent(x), ck = x.check || [], pg = C.tripProgress?.(x) || { done: 0, total: 0 };
      return `<button class="panel tripcard" data-act="tripopen" data-v="${esc(x.id)}"><span class="ckkick">${esc(tripWhen(x))}</span><b>${esc(tripName(x))}</b><span class="muted">${esc(shortDate(x.start))} to ${esc(shortDate(tripEnd(x)))} · ${plural(x.days | 0 || 1, 'day')}</span>
        ${b ? `<span class="tbar"><i style="width:${Math.min(100, 100 * sp / b)}%"></i></span><span class="muted">${eur(sp)} of ${eur(b)} budget</span>` : ''}
        <span class="muted">${[ck.length ? `checklist ${ck.filter(c => c.done).length}/${ck.length}` : '', pg.total ? `packed ${pg.done}/${pg.total}` : ''].filter(Boolean).join(' · ')}</span></button>`; };
    host.innerHTML = `${head('Trips')}${tabs}<div class="dbtns" style="margin-bottom:16px"><button class="btn primary" data-act="tripnew">${svg(P.plus)} New trip</button></div>
      ${up.length ? `<div class="tripcards">${up.map(card).join('')}</div>` : quiet('No trips coming up. Add one and plan it here; outfits and packing live in Closet › Trips.')}
      ${past.length ? `<h2 class="triph2">Past trips</h2><div class="tripcards">${past.map(card).join('')}</div>` : ''}`;
    return;
  }
  const dates = C.tripDates(t), tr = t.travel || {}, agenda = t.agenda || {}, ck = t.check || [], ideas = t.ideas || [], b = num(t.budget), sp = tripSpent(t), pg = C.tripProgress(t);
  const txs = recs('ftx').filter(x => x.trip === t.id || (!x.trip && fEveryday(x) && x.date >= t.start && x.date <= tripEnd(t))).sort((a, c) => (c.date || '').localeCompare(a.date || ''));
  const det = [['Travel', [tr.transport, tr.out && 'out ' + tr.out, tr.back && 'back ' + tr.back].filter(Boolean).join(' · ')], ['Stay', [tr.stay, tr.address].filter(Boolean).join(', ')], ['Bookings', tr.refs], ['With', tr.who]].filter(x => x[1]);
  host.innerHTML = `<div style="margin-bottom:8px"><button class="btn small ghost" data-act="tripopen" data-v="">${svg(P.left)} All trips</button></div>
    <div class="viewhead"><h1>${esc(tripName(t))}</h1><span class="sub">${esc(shortDate(t.start))} to ${esc(shortDate(tripEnd(t)))} · ${esc(tripWhen(t))}</span></div>
    <div class="dbtns" style="margin-bottom:16px"><button class="btn small" data-act="tripedit">Dates and place</button><button class="btn small" data-act="tripdet">Travel and stay</button><button class="btn small" data-act="trippack">Outfits and packing</button></div>
    <div class="panels">
      ${panel('Travel and stay', det.length ? det.map(([k, v]) => `<p class="dline"><span>${k}</span><b>${esc(v)}</b></p>`).join('') : quiet('Add how you travel, where you stay and your booking numbers.'))}
      ${panel(`Before you leave · ${ck.filter(c => c.done).length}/${ck.length}`, `<div class="lrows">${ck.map(c => `<div class="lrow"><span class="lmain"><b>${esc(c.t)}</b></span>${tick(c.done ? 'Done' : 'To do', !!c.done, `data-act="tripck" data-v="${esc(c.id)}"`)}<button class="iconbtn small" data-act="tripckdel" data-v="${esc(c.id)}" aria-label="Remove ${esc(c.t)}">${svg(P.x)}</button></div>`).join('')}</div>
        <form class="lqadd" data-tripadd="check"><input placeholder="Add a task" aria-label="Add a task before you leave"><button class="btn small" type="submit">Add</button></form>
        ${TRIP_CHECK.filter(x => !ck.some(c => norm(c.t) === norm(x))).length ? `<div class="lwrap">${TRIP_CHECK.filter(x => !ck.some(c => norm(c.t) === norm(x))).map(x => `<button class="chip" data-act="tripcksug" data-v="${esc(x)}">+ ${esc(x)}</button>`).join('')}</div>` : ''}`)}
      ${panel('Budget', `${b ? `<p class="lbig">${eur(Math.max(0, b - sp))} left</p><span class="tbar"><i style="width:${Math.min(100, 100 * sp / b)}%"></i></span><p class="dline"><span>Spent</span><b>${eur(sp)} of ${eur(b)}</b></p>` : `<p class="dline"><span>Spent</span><b>${eur(sp)}</b></p>`}
        <div class="dbtns"><button class="btn small" data-act="tripbudget">${b ? 'Change budget' : 'Set a budget'}</button><button class="btn small" data-act="tripcost">Add a cost</button></div>
        ${txs.length ? `<div class="lrows">${txs.slice(0, 8).map(row).join('')}</div>${txs.length > 8 ? `<p class="lnone">+${txs.length - 8} more</p>` : ''}` : '<p class="lnone">Bookings you add here count, and so does everything you spend during the trip.</p>'}`)}
      ${(() => { const here = staysFor(t); return here.length ? panel(`Saved stays in ${t.dest?.name || 'this place'}`, `<div class="lgrid small">${here.map(card).join('')}</div>`) : ''; })()}
      ${panel('Packing', `<p class="dline"><span>Packed</span><b>${pg.total ? `${pg.done} of ${pg.total}` : 'nothing on the list yet'}</b></p><button class="btn small" data-act="trippack">Open in Closet</button>`)}
      ${panel('Ideas', `<div class="lrows">${ideas.map(x => `<div class="lrow"><span class="lmain">${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener"><b>${esc(x.t)}</b></a>` : `<b>${esc(x.t)}</b>`}${x.note ? `<span>${esc(x.note)}</span>` : ''}</span>${tick(x.done ? 'Been' : 'Want to', !!x.done, `data-act="tripidea" data-v="${esc(x.id)}"`)}<button class="iconbtn small" data-act="tripideadel" data-v="${esc(x.id)}" aria-label="Remove ${esc(x.t)}">${svg(P.x)}</button></div>`).join('') || '<p class="lnone">Places to see, eat or do. Links you share to the inbox can land here too.</p>'}</div>
        <form class="lqadd" data-tripadd="idea"><input placeholder="A place, a restaurant, a link" aria-label="Add an idea"><button class="btn small" type="submit">Add</button></form>`)}
    </div>
    <h2 class="triph2">Day by day</h2>
    <div class="tripdays">${dates.map((d, i) => { const items = (agenda[i] || []).slice().sort((a, c) => (a.time || '99').localeCompare(c.time || '99'));
      return `<section class="panel lpanel"><div class="lph3"><h3>Day ${i + 1} · ${esc(dayName(d))} ${esc(shortDate(d))}</h3></div>
        <div class="lrows">${items.map(x => `<div class="lrow"><span class="lmain"><b>${x.time ? esc(x.time) + ' · ' : ''}${esc(x.t)}</b>${x.where ? `<span>${esc(x.where)}</span>` : ''}</span><button class="iconbtn small" data-act="tripagdel" data-v="${i}:${esc(x.id)}" aria-label="Remove ${esc(x.t)}">${svg(P.x)}</button></div>`).join('')}</div>
        <form class="lqadd tripag" data-tripadd="day" data-day="${i}"><input type="time" aria-label="Time (optional)"><input placeholder="What and where" aria-label="Add to day ${i + 1}"><button class="btn small" type="submit">Add</button></form>
        ${ideas.filter(x => !x.done).length ? `<div class="lwrap">${ideas.filter(x => !x.done).slice(0, 6).map(x => `<button class="chip" data-act="tripideaday" data-v="${i}:${esc(x.id)}">+ ${esc(x.t)}</button>`).join('')}</div>` : ''}</section>`; }).join('')}</div>`;
}

// saved hotels and rentals, by country and then city (A to Z); share a Booking or Airbnb link and it lands here
const placeKey = s => norm(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
function staysHTML() {
  const all = recs('stays'), by = new Map();
  for (const r of all) { const c = r.country || 'Somewhere else', k = r.city || 'Unknown city'; if (!by.has(c)) by.set(c, new Map()); const m = by.get(c); if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
  const countries = [...by.keys()].sort((a, b) => (a === 'Somewhere else') - (b === 'Somewhere else') || a.localeCompare(b));
  return `<div class="dbtns" style="margin-bottom:16px"><button class="btn primary" data-act="new" data-v="stays">${svg(P.plus)} Stay</button></div>${stayAnalysis(all)}
    ${all.length ? countries.map(c => { const m = by.get(c), n = [...m.values()].reduce((a, l) => a + l.length, 0);
      return `<section class="stayc"><h2 class="triph2">${esc(c)} <span class="lnone">${n}</span></h2>${[...m.keys()].sort((a, b) => a.localeCompare(b)).map(k => `<p class="dsub">${esc(k)} · ${m.get(k).length}</p><div class="lgrid">${m.get(k).sort((a, b) => ['Booked', 'Shortlist', 'Saved', 'Stayed'].indexOf(a.status || 'Saved') - ['Booked', 'Shortlist', 'Saved', 'Stayed'].indexOf(b.status || 'Saved') || norm(a.name).localeCompare(norm(b.name))).map(card).join('')}</div>`).join('')}</section>`; }).join('')
    : quiet('Share a link from Booking, Airbnb, Hotels.com or a hotel site with the A’s Life shortcut. It lands in your inbox already sorted by country and city.')}`;
}

// what your reviews say: how many places, where, the average per part of a review (one hue, longest is best),
// the best places, and how often you would go back
function stayAnalysis(all) {
  const been = all.filter(r => r.status === 'Stayed' || r.from), rated = all.filter(r => stayScore(r));
  if (!been.length && !rated.length) return '';
  const avg = l => l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0;
  const parts = STAY_SCORES.map(([k, l]) => { const v = all.map(r => Number(r[k]) || 0).filter(Boolean); return { label: l, v: avg(v), sub: plural(v.length, 'review') }; }).filter(x => x.v);
  const asked = all.filter(r => r.again != null && (r.status === 'Stayed' || r.from)), again = asked.filter(r => r.again).length;
  const prices = all.map(r => num(r.price)).filter(n => n > 0), countries = new Set(been.map(r => r.country).filter(Boolean));
  const best = [...rated].sort((a, b) => stayScore(b) - stayScore(a)).slice(0, 3);
  const perCountry = [...been.reduce((m, r) => m.set(r.country || 'Somewhere else', (m.get(r.country || 'Somewhere else') || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const star = n => n.toFixed(1) + ' ★';
  return `<div class="panels stayan">
    ${panel('Your stays', `<div class="tiles lt3">${fTile('Places stayed', String(been.length), plural(countries.size, 'country', 'countries'))}${fTile('Average review', rated.length ? star(avg(rated.map(stayScore))) : '–', plural(rated.length, 'review'))}${fTile('Would go back', asked.length ? Math.round(100 * again / asked.length) + '%' : '–', asked.length ? `${again} of ${asked.length}` : 'tick it in a review')}</div>
      ${prices.length ? `<p class="dline"><span>Average price per night</span><b>${eur(avg(prices))}</b></p>` : ''}
      ${best.length ? `<p class="dsub">Best reviewed</p><div class="lrows">${best.map(r => `<button class="lrow lmain" data-act="open" data-id="${r.id}"><b>${esc(r.name)}</b><span>${esc([r.city, r.country].filter(Boolean).join(', '))} · ${star(stayScore(r))}</span></button>`).join('')}</div>` : ''}`)}
    ${parts.length ? panel('Average per part', vHBars(parts.sort((a, b) => b.v - a.v), { fmt: star, color: 'var(--c1)', max: 5 }) + '<p class="lnone">Out of 5 stars, across all your reviews. The lowest bar is what you notice most when it goes wrong.</p>') : ''}
    ${perCountry.length > 1 ? panel('Where you stayed', vHBars(perCountry.map(([c, n]) => ({ label: c, v: n })), { fmt: n => plural(n, 'stay'), color: 'var(--c2)' })) : ''}
  </div>`;
}
const staysFor = t => { const city = placeKey(t.dest?.name), country = placeKey(t.dest?.country); return recs('stays').filter(r => (city && placeKey(r.city) === city) || (!city && country && placeKey(r.country) === country)); };
const tid = () => C.uuid().slice(0, 8);
async function tripAct(act, v) {
  const t = tripOf(L.tripId);
  if (act === 'tripopen') { L.tripId = v || null; C.render(); window.scrollTo(0, 0); return; }
  if (act === 'tripnew') { C.tripEdit(); return; }
  if (!t) return;
  const list = k => (t[k] || []).map(x => ({ ...x }));
  if (act === 'tripedit') return C.tripEdit(t.id);
  if (act === 'trippack') return C.tripPack(t.id);
  if (act === 'tripck') return tripSave(t, { check: list('check').map(c => c.id === v ? { ...c, done: !c.done } : c) }, 'Ticked a trip task');
  if (act === 'tripckdel') return tripSave(t, { check: list('check').filter(c => c.id !== v) }, 'Removed a trip task', true);
  if (act === 'tripcksug') return tripSave(t, { check: [...list('check'), { id: tid(), t: v }] }, 'Added a trip task');
  if (act === 'tripidea') return tripSave(t, { ideas: list('ideas').map(c => c.id === v ? { ...c, done: !c.done } : c) }, 'Ticked a trip idea');
  if (act === 'tripideadel') return tripSave(t, { ideas: list('ideas').filter(c => c.id !== v) }, 'Removed a trip idea', true);
  if (act === 'tripideaday' || act === 'tripagdel') {
    const [i, id] = v.split(':'), ag = JSON.parse(JSON.stringify(t.agenda || {})), day = ag[i] || [];
    if (act === 'tripagdel') ag[i] = day.filter(x => x.id !== id);
    else { const idea = (t.ideas || []).find(x => x.id === id); if (!idea) return; ag[i] = [...day, { id: tid(), t: idea.t, where: idea.note || '' }]; }
    return tripSave(t, { agenda: ag }, act === 'tripagdel' ? 'Removed from the day plan' : 'Planned an idea', act === 'tripagdel');
  }
  if (act === 'tripbudget') { const n = prompt('Budget for this trip (euro)', t.budget || ''); if (n == null) return; const val = num(String(n).replace(',', '.')); return tripSave(t, { budget: val > 0 ? val : null }, 'Changed the trip budget'); }
  if (act === 'tripcost') return openEditor('ftx', null, { trip: t.id, date: today(), name: '' });
  if (act === 'tripdet') {
    const tr = t.travel || {}, f = (k, l, ph) => `<div class="field full"><label for="tr-${k}">${l}</label><input id="tr-${k}" value="${esc(tr[k] || '')}" placeholder="${esc(ph)}"></div>`;
    const sh = C.sheet({ title: 'Travel and stay', body: `<div class="form">${f('transport', 'How you travel', 'e.g. flight KL1691, train, car')}${f('out', 'Going', 'e.g. Fri 08:40 from Schiphol')}${f('back', 'Coming back', 'e.g. Mon 19:10')}${f('stay', 'Where you stay', 'e.g. Hotel Lisboa Plaza')}${f('address', 'Address', '')}${f('refs', 'Booking numbers', 'e.g. KLM 6XQ2PL, Booking 4021')}${f('who', 'Travelling with', 'e.g. Sam and Noor')}</div>`,
      foot: `<div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary" data-trsave>Save</button>` });
    sh.querySelector('[data-trsave]').onclick = async () => { const n = {}; for (const k of ['transport', 'out', 'back', 'stay', 'address', 'refs', 'who']) { const x = sh.querySelector('#tr-' + k).value.trim(); if (x) n[k] = x; } C.closeSheet(); await tripSave(t, { travel: n }, 'Changed travel and stay'); };
  }
}
document.addEventListener('submit', e => {
  const f = e.target.closest?.('[data-tripadd]'); if (!f || !C) return; e.preventDefault();
  const t = tripOf(L.tripId); if (!t) return;
  const ins = f.querySelectorAll('input'), txt = ins[ins.length - 1].value.trim(); if (!txt) return;
  const kind = f.dataset.tripadd;
  if (kind === 'check') tripSave(t, { check: [...(t.check || []), { id: tid(), t: txt }] }, 'Added a trip task');
  if (kind === 'idea') { const url = (txt.match(/https?:\/\/\S+/) || [''])[0]; tripSave(t, { ideas: [...(t.ideas || []), { id: tid(), t: url && url === txt ? hostOf(url) : txt.replace(url, '').trim() || hostOf(url), url }] }, 'Added a trip idea'); }
  if (kind === 'day') { const i = f.dataset.day, ag = JSON.parse(JSON.stringify(t.agenda || {})), [w, ...rest] = txt.split(/\s+(?:at|in|bij|@)\s+/i); ag[i] = [...(ag[i] || []), { id: tid(), t: w, where: rest.join(' '), time: ins.length > 1 ? ins[0].value : '' }]; tripSave(t, { agenda: ag }, 'Added to the day plan'); }
  f.reset();
});
/* ---------- settings that only one section has ---------- */
const wishBudgetField = () => `<div class="fset"><div><b>Wishlist budget</b><span>What you allow yourself from your wishlists per ${fMode() === 'month' ? 'month' : 'paycheck'} (follows how you plan everyday spending). Purchases with the tag wishlist count against it.</span></div><input class="finp" type="number" inputmode="decimal" step="1" data-fset="wishBudget" value="${fset().wishBudget ?? ''}" placeholder="No budget"></div>`;
function settingsPanels(sec) { if (!C) return ''; return secOwn(sec) + ovPanel(sec); }
function secOwn(sec) {
  const wrap = h => h ? `<div class="secown">${h}</div>` : '';
  if (sec === 'money') return wrap(fSettings());
  if (sec === 'kitchen') {
    const f = C.prefs().food || {}, ta = (k, label, help, ph) => `<div class="fset fsetcol"><div><b>${label}</b><span>${help}</span></div><textarea class="finp" rows="2" data-food="${k}" placeholder="${ph}">${esc(f[k] || '')}</textarea></div>`;
    const cats = recs('fcats').filter(c => !c.nospend), gc = groceryEnv();
    const shopPanel = `<section class="panel setpanel"><h3>Shopping</h3><p class="muted">The weekly plan cooks for this many people and keeps to your budget.</p>
      <div class="fset"><div><b>I cook for</b><span>Recipes come in 2 portions per person: one to eat, one for the next day or the freezer.</span></div><select class="pill" data-food="people">${['1', '2', '3', '4'].map(n => `<option ${String(f.people || '1') === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="fset"><div><b>Office days</b><span>The plan makes one take-along lunch for each.</span></div><div class="lwrap">${WEEKDAYS.slice(0, 5).map(w => { const on = (f.office || ['Mon', 'Tue', 'Thu']).includes(w); return `<button class="chip ${on ? 'on' : ''}" data-act="office" data-v="${w}" aria-pressed="${on}">${w}</button>`; }).join('')}</div></div>
      <div class="fset"><div><b>Groceries budget</b><span>${cats.length ? 'The envelope in Finance that holds your groceries. Deals shows this week’s share.' : 'Set up envelopes in Finance first.'}</span></div>${cats.length ? `<select class="pill" data-food="groceryCat"><option value="">None</option>${cats.map(c => `<option value="${c.id}" ${gc?.id === c.id ? 'selected' : ''}>${esc([c.emoji, c.name].filter(Boolean).join(' '))}</option>`).join('')}</select>` : ''}</div></section>`;
    return wrap(tidyPanel() + shopPanel + `<section class="panel setpanel"><h3>Taste</h3><p class="muted">The weekly deals plan follows this. Separate things with commas.</p>
      ${ta('no', 'I don’t eat', 'Never in a suggestion.', 'e.g. nuts, avocado')}
      ${ta('hidden', 'Only if you can’t taste it', 'Fine when it is fully worked into the dish.', 'e.g. coconut milk in a curry')}
      ${ta('love', 'I love', 'Gets picked more often.', 'e.g. aged cheese, savoury snacks')}
      ${ta('notes', 'Anything else', 'Goals, swaps, how you like to eat.', 'e.g. plant-based instead of milk')}
      ${(() => { const t = tasteProfile(); if (!t.n) return '<p class="muted">Review a recipe after eating and what you like shows up here.</p>'; const lean = (v, more, less) => v > 1 ? more : v < -1 ? less : ''; return `<div class="fset fsetcol"><div><b>Learned from ${plural(t.n, 'review')}</b><span>${esc([t.likes.length ? 'You like ' + t.likes.slice(0, 10).join(', ') : '', t.dislikes.length ? 'not keen on ' + t.dislikes.slice(0, 10).join(', ') : '', lean(t.lean.salt, 'you often want more salt', 'you often find it too salty'), lean(t.lean.spice, 'you like more heat', 'you prefer it milder'), lean(t.lean.taste, 'you like bold flavour', 'you prefer it gentler'), t.feels.length ? 'your favourites feel ' + t.feels.slice(0, 3).join(', ').toLowerCase() : ''].filter(Boolean).join('; ') + '.')}</span></div></div>`; })()}</section>`);
  }
  if (sec === 'wish') { const old = recs('fwait').filter(WISHY.fwait).length; return wrap(`<section class="panel setpanel"><h3>Wishlists and money</h3>${recs('faccounts').length ? wishBudgetField() : '<p class="lnone">Set up Finance to give your wishlists a budget.</p>'}
    ${old ? `<div class="fset"><div><b>Wait list</b><span>${plural(old, 'item')} still on the old 48-hour wait list in Finance.</span></div><button class="btn small" data-act="wmovewait">Move wait list into Wishlists</button></div>` : ''}</section>`); }
  if (sec === 'home') {
    const c = C.prefs().chores || {};
    return wrap(`<section class="panel setpanel"><h3>Cleaning</h3><p class="muted">Chores never fall on a free day; they move to the next day you clean.</p>
      <div class="fset fsetcol"><div><b>Free days</b><span>Days without chores.</span></div><div class="lwrap">${WDAYS.map(d => `<button class="chip" data-act="chfree" data-v="${d}" aria-pressed="${(c.free || []).includes(d)}">${d}</button>`).join('')}</div></div>
      <label class="settog"><input type="checkbox" data-chtrips ${c.trips === false ? '' : 'checked'}> No chores while I'm on a trip</label></section>`);
  }
  if (sec === 'plan') {
    const c = DAYCFG(), tm = (k, l, h) => `<div class="fset"><div><b>${l}</b><span>${h}</span></div><input class="finp" type="time" data-dayset="${k}" value="${esc(c[k])}"></div>`;
    return wrap(`<section class="panel setpanel"><h3>Your day</h3><p class="muted">The timeline on Today and your bedtime reminder follow this. Office days come from Kitchen › Settings.</p>
      ${tm('wakeOffice', 'Up on office days', 'Kantoordagen')}${tm('wakeHome', 'Up on home days', 'Thuiswerkdagen')}${tm('wakeWeekend', 'Up at the weekend', 'Uitslapen mag')}${tm('workStart', 'Work starts', '')}${tm('workEnd', 'Work ends', '')}
      <div class="fset"><div><b>Hours of sleep</b><span>Bedtime is this many hours before the next alarm.</span></div><input class="finp" type="number" min="6" max="10" step="0.5" data-dayset="sleep" value="${esc(c.sleep)}"></div>
      <p class="muted">Tonight: bed at ${hm(bedOn(today()))}, up at ${hm(wakeOn(addDays(today(), 1)))}.</p></section>`) + secOwn('wish') + secOwn('care') + secOwn('fit') + icalPanel();
  }
  if (sec === 'body') return secOwn('care') + secOwn('fit');
  if (sec === 'care') {
    const goal = Number(C.prefs().waterGoal) || 8, wk = recs('bsched')[0];
    return wrap(`<section class="panel setpanel"><h3>Life</h3>
      <div class="fset"><div><b>Daily water goal</b><span>Glasses a day on Today and in Life.</span></div><input class="finp" type="number" min="1" max="40" data-watergoal value="${goal}"></div>
      <div class="fset"><div><b>Skincare week</b><span>${esc(wk ? KINDS.bsched.sub(wk) : 'Which night is acid, retinoid or recovery.')}</span></div><button class="btn small" data-act="${wk ? 'open' : 'new'}" ${wk ? `data-id="${wk.id}"` : 'data-v="bsched"'}>${wk ? 'Change' : 'Plan it'}</button></div></section>`);
  }
  if (sec === 'fit') { const wk = recs('fsched')[0]; return wrap(`<section class="panel setpanel"><h3>Fitness</h3><div class="fset"><div><b>Workout week</b><span>${esc(wk ? KINDS.fsched.sub(wk) : 'One video workout per day.')}</span></div><button class="btn small" data-act="${wk ? 'open' : 'new'}" ${wk ? `data-id="${wk.id}"` : 'data-v="fsched"'}>${wk ? 'Change' : 'Plan it'}</button></div></section>`); }
  if (sec === 'social') { const acc = recs('accounts'); return wrap(`<section class="panel setpanel"><h3>LTK and income</h3><div class="fset"><div><b>LTK profile link</b><span>Shown on Income, to share with followers.</span></div><input class="finp" type="url" data-ltkset="ltk" value="${esc(C.prefs().ltk || '')}" placeholder="https://www.shopltk.com/explore/..."></div><div class="fset"><div><b>Tax reserve</b><span>Percentage of content income to put aside.</span></div><input class="finp" type="number" min="0" max="60" data-ltkset="contentTax" value="${esc(C.prefs().contentTax ?? 30)}"></div></section><section class="panel setpanel"><h3>Accounts</h3>${acc.length ? `<div class="lrows">${acc.map(row).join('')}</div>` : quiet('Add your Instagram and TikTok so the feed planner shows your profile.')}<button class="btn small mmore" data-act="new" data-v="accounts">+ Account</button></section>`); }
  return '';
}
document.addEventListener('click', async e => {
  const b = e.target.closest?.('[data-wact]'); if (!b || !C) return;
  e.preventDefault(); e.stopPropagation();
  const { wact, kind, id } = b.dataset, inEditor = !!b.closest('.sheet') && kind !== 'closet';
  if (wact === 'buy') { buyWish(kind, id); return; }
  if (wact === 'save') { await saveForWish(kind, id); if (inEditor) { C.closeSheet(); openRecord(id); } else if (kind === 'closet') C.openItem?.(id); return; }
  if (wact === 'goal') { const g = wishGoal(id); if (g) { C.closeSheet(); openRecord(g.id); } return; }
  if (wact === 'drop') { C.closeSheet(); dropWish(kind, id); return; }
  const r = L.byId[id]; if (!r) return;
  if (wact === 'wait') { await save(r, { wait: WAIT_DAYS * 24, waitFrom: Date.now() }); C.toast('30 dagen wachten. Wil je het dan nog steeds, dan is het het waard.'); }
  if (wact === 'use' || wact === 'unuse') await save(r, { uses: Math.max(0, (num(r.uses) || 0) + (wact === 'use' ? 1 : -1)) });
  if (inEditor) { C.closeSheet(); openRecord(id); }
}, true);
document.addEventListener('change', async e => {
  const t = e.target; if (!C || !t.matches?.('[data-wplan]')) return;
  const { kind, wplan: id } = t.dataset; await planWish(kind, id, t.value);
  if (kind !== 'closet' && t.closest('.sheet')) { C.closeSheet(); openRecord(id); }
});
document.addEventListener('change', e => { const t = e.target; if (!C || !t.matches?.('[data-chtrips]')) return; C.savePrefs({ chores: { ...(C.prefs().chores || {}), trips: t.checked } }).catch(() => C.toast('Could not save. Try again.')); });
document.addEventListener('change', e => { const t = e.target; if (!C || !t.matches?.('[data-food]')) return; C.savePrefs({ food: { ...(C.prefs().food || {}), [t.dataset.food]: t.value.trim() } }).then(() => C.toast('Saved')).catch(() => C.toast('Could not save. Try again.')); });
document.addEventListener('change', e => { if (e.target.matches?.('[data-watergoal]')) { const n = Math.round(Number(e.target.value)); if (n > 0 && n < 40) C.savePrefs({ waterGoal: n }).catch(() => C.toast('Could not save. Try again.')); } });

/* ---------- Plan and Body: your year, your week, your day ----------
   One place that ties the areas together: four life goals with live numbers, a Sunday review, a day timeline
   built from your sleep and work rhythm, a Top 3, and Clean (stopping with joints) with cravings, money and milestones. */
const DAYCFG = () => ({ wakeOffice: '06:30', wakeHome: '07:30', wakeWeekend: '09:00', workStart: '08:30', workEnd: '17:00', sleep: 8, ...(C?.prefs?.().day || {}) });
const officeDays = () => food().office || ['Mon', 'Tue', 'Thu'];
const wdShort = d => WEEKDAYS[(fromISO(d).getDay() + 6) % 7];
const dayType = d => { const w = wdShort(d); return ['Sat', 'Sun'].includes(w) ? 'weekend' : officeDays().includes(w) ? 'office' : 'home'; };
const hm = m => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
const toMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const wakeOn = d => { const c = DAYCFG(), t = dayType(d); return toMin(t === 'office' ? c.wakeOffice : t === 'home' ? c.wakeHome : c.wakeWeekend); };
// bedtime tonight follows tomorrow's alarm, never later than half past midnight
const bedOn = d => Math.min(wakeOn(addDays(d, 1)) + 1440 - (Number(DAYCFG().sleep) || 8) * 60, 1470);
const weekMon = (d = today()) => addDays(d, -((fromISO(d).getDay() + 6) % 7));
const intentNow = () => { const i = C?.prefs?.().intent; return i && i.week >= addDays(weekMon(), -6) ? i : null; };
const monthlyOf = b => { const a = num(b.amount) || 0; return b.cadence === 'Yearly' ? a / 12 : b.cadence === 'Weekly' ? a * 52 / 12 : b.cadence === 'Every N months' ? a / (num(b.every) || 1) : a; };
const fixedMonthly = () => recs('fbills').filter(b => b.active !== false && (!b.ends || b.ends >= today())).reduce((n, b) => n + monthlyOf(b), 0);
const goalNamed = re => recs('fgoals').find(g => re.test(g.name || ''));
const tlDone = d => { try { return new Set(JSON.parse(localStorage.getItem('tl:' + d) || '[]')); } catch { return new Set(); } };
const tlSave = (d, set) => { try { localStorage.setItem('tl:' + d, JSON.stringify([...set])); } catch {} };

/* Clean: the quit plan */
const CLEAN = () => ({ price: 6, work: 2.5, free: 5, ...(C?.prefs?.().clean || {}) });
const CLEAN_STEPS = [[1, '1 dag', 'De eerste dag is gedaan. Elke trek gaat na een paar minuten weer weg.'], [3, '3 dagen', 'De zwaarste dagen zijn vaak voorbij. Prikkelbaar of onrustig voelen hoort er even bij.'], [7, '1 week', 'Je slaap begint te herstellen. Dromen kunnen een tijdje heftiger zijn, dat is normaal.'], [14, '2 weken', 'Trek komt minder vaak. Je ziet waarschijnlijk al geld terug op je spaardoel.'], [30, '1 maand', 'Veel mensen merken een helderder hoofd en betere concentratie.'], [90, '3 maanden', 'Je nieuwe gewoontes zijn steviger. Mooi moment voor een grotere beloning.']];
const PREP_STEPS = [['triggers', 'Schrijf op wanneer je het meest trek hebt (na het eten, stress, verveling)'], ['swaps', 'Vervangers in huis: kauwgom, knapperige snacks, thee'], ['rewards', 'Kies beloningen voor 1 week, 1 maand en 3 maanden'], ['tell', 'Vertel iemand die je vertrouwt over je stopdatum'], ['clear', 'Ruim spullen op (vloeitjes, aanstekers, grinder)'], ['plan', 'Bedenk wat je na het eten gaat doen in plaats daarvan'], ['help', 'Sla hulp op: de Jellinek heeft gratis en anoniem advies']];
const cleanUsual = d => (['Sat', 'Sun'].includes(wdShort(d)) ? CLEAN().free : CLEAN().work) * CLEAN().price;
function cleanStats() {
  const c = CLEAN(), start = c.date, t = today(), logs = recs('cleanlog');
  if (!start) return { start: '', before: true, logs };
  const before = start > t, days = before ? 0 : diffDays(start, t) + 1;
  const used = new Set(logs.filter(l => l.type === 'Gebruikt' && l.date >= start).map(l => l.date));
  const lastUse = [...used].sort().pop();
  const streak = before ? 0 : lastUse ? Math.max(0, diffDays(lastUse, t)) : days;
  let expected = 0; for (let d = start; d <= t && !before; d = addDays(d, 1)) expected += cleanUsual(d);
  const spent = logs.filter(l => l.type === 'Gekocht' && l.date >= start).reduce((n, l) => n + (num(l.amount) || 0), 0);
  const cravings = logs.filter(l => l.type === 'Trek');
  const wk = weekMon(), weekSaved = before ? 0 : Array.from({ length: 7 }, (_, k) => addDays(wk, k)).filter(d => d >= start && d <= t).reduce((n, d) => n + cleanUsual(d), 0) - logs.filter(l => l.type === 'Gekocht' && l.date >= wk && l.date >= start).reduce((n, l) => n + (num(l.amount) || 0), 0);
  return { start, before, days, clean: days - used.size, streak, saved: Math.max(0, expected - spent), spent, cravings, logs, weekSaved: Math.max(0, weekSaved), toGo: before ? diffDays(t, start) : 0 };
}
async function cleanSet(patch) { try { await C.savePrefs({ clean: { ...(C.prefs().clean || {}), ...patch } }); } catch { C.toast('Opslaan lukte niet. Probeer het opnieuw.'); } }
// "Ik heb trek": ten minutes with something to do, then a note of what it was and what helped
function cravingSheet() {
  let left = 600, timer = null, helped = new Set(), trig = '';
  const chips = (list, sel, attr) => list.map(x => `<button type="button" class="chip ${sel(x) ? 'on' : ''}" ${attr}="${esc(x)}">${esc(x)}</button>`).join('');
  const body = () => `<div class="crave"><p class="lbig" data-ctime>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</p><p class="lnone">Trek zakt meestal binnen 10 minuten. Kies iets om te doen.</p>
    <div class="lwrap">${chips(CLEAN_HELPS.slice(0, 8), x => helped.has(x), 'data-chelp')}</div>
    <div class="breath" data-breath hidden><i></i><span>Adem in…</span></div>
    <p class="dsub">Wanneer kwam het op?</p><div class="lwrap">${chips(CLEAN_TRIGGERS, x => trig === x, 'data-ctrig')}</div></div>`;
  const sh = C.sheet({ title: 'Ik heb trek', body: body(), foot: '<button class="btn primary" data-cdone>Trek is weg</button><button class="btn" data-cused>Toch gebruikt</button>' });
  const tick = () => { left = Math.max(0, left - 1); const el = sh.querySelector('[data-ctime]'); if (el) el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; if (!left) clearInterval(timer); if (!document.body.contains(sh)) clearInterval(timer); };
  timer = setInterval(tick, 1000);
  let br = null; const breathe = on => { const b = sh.querySelector('[data-breath]'); if (!b) return; b.hidden = !on; clearInterval(br); if (!on) return; let k = 0; const say = ['Adem in…', 'Vasthouden…', 'Adem uit…', 'Rust…']; br = setInterval(() => { k = (k + 1) % 4; b.querySelector('span').textContent = say[k]; b.className = 'breath s' + k; }, 4000); };
  const save = async used => {
    clearInterval(timer); clearInterval(br);
    const now = new Date(), d = { date: today(), time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, type: used ? 'Gebruikt' : 'Trek', trigger: trig || undefined, helped: [...helped], minutes: Math.round((600 - left) / 60) };
    if (!d.helped.length) delete d.helped;
    try { await create('cleanlog', d); C.closeSheet(); C.toast(used ? 'Genoteerd. Morgen weer een nieuwe dag.' : 'Goed gedaan. Weer een trek doorstaan.'); } catch { C.toast('Opslaan lukte niet.'); }
  };
  sh.addEventListener('click', e => {
    const h = e.target.closest('[data-chelp]'), g = e.target.closest('[data-ctrig]');
    if (h) { const v = h.dataset.chelp; helped.has(v) ? helped.delete(v) : helped.add(v); h.classList.toggle('on'); if (v === 'Ademhaling') breathe(helped.has(v)); }
    if (g) { trig = trig === g.dataset.ctrig ? '' : g.dataset.ctrig; sh.querySelectorAll('[data-ctrig]').forEach(x => x.classList.toggle('on', x.dataset.ctrig === trig)); }
    if (e.target.closest('[data-cdone]')) save(false);
    if (e.target.closest('[data-cused]')) save(true);
  });
}
function cleanPage(host) {
  const c = CLEAN(), st = cleanStats(), t = today(), done = new Set(c.prep || []);
  const wishes = typeof allWishes === 'function' ? allWishes() : [];
  const rewardSel = days => `<select class="pill" data-creward="${days}" aria-label="Beloning"><option value="">Kies een beloning</option>${wishes.slice(0, 60).map(w => `<option value="${esc(w.name)}" ${c.rewards?.[days] === w.name ? 'selected' : ''}>${esc(w.name)}${num(w.price) ? ' · ' + eur(num(w.price)) : ''}</option>`).join('')}</select>`;
  const trig = {}; for (const l of st.logs.filter(l => l.trigger)) trig[l.trigger] = (trig[l.trigger] || 0) + 1;
  const helps = {}; for (const l of st.logs.filter(l => l.type === 'Trek')) for (const h of [].concat(l.helped || [])) helps[h] = (helps[h] || 0) + 1;
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k} (${n}×)`).join(', ');
  host.innerHTML = `${head('Clean')}
  <div class="ltools"><button class="btn primary" data-act="crave">Ik heb trek</button><button class="btn small" data-act="cleanlog" data-v="Gekocht">Toch gekocht</button><button class="btn small" data-act="cleanlog" data-v="Gebruikt">Toch gebruikt</button></div>
  ${!st.start ? `<div class="banner"><p class="lnone">Kies een stopdatum over 2 tot 4 weken. Tot die dag bereid je je rustig voor.</p><label class="lnone">Stopdatum <input type="date" class="pill" data-cleandate value="${esc(addDays(t, 21))}"></label><button class="btn small primary" data-act="cleanstart">Zet mijn stopdatum</button></div>` : ''}
  ${st.start ? `<div class="tiles">${st.before ? fTile('Nog', plural(st.toGo, 'dag', 'dagen'), 'tot je stopdatum ' + shortDate(st.start)) : fTile('Clean', plural(st.streak, 'dag', 'dagen'), `${st.clean} van ${st.days} dagen sinds ${shortDate(st.start)}`)}${fTile('Bespaard', eur(st.saved), st.spent ? `${eur(st.spent)} toch uitgegeven` : 'wat je anders had uitgegeven')}${fTile('Deze week', eur(st.weekSaved), 'gaat zondag naar Verhuizen')}${fTile('Trek doorstaan', String(st.cravings.length), top(trig) ? 'vaakst: ' + top(trig).split(',')[0] : 'tik op Ik heb trek')}</div>` : ''}
  <div class="panels">
    ${st.start && st.before ? panel('Voorbereiden', `<div class="lrows">${PREP_STEPS.map(([k, l]) => `<label class="lrow dpick ${done.has(k) ? 'gone' : ''}"><input type="checkbox" data-cprep="${k}" ${done.has(k) ? 'checked' : ''}><span class="lmain"><b>${esc(l)}</b></span>${k === 'swaps' ? '<button class="btn small" data-act="cleanswaps">Op de lijst</button>' : k === 'help' ? '<a class="btn small" href="https://www.jellinek.nl/" target="_blank" rel="noopener">Jellinek</a>' : ''}</label>`).join('')}</div>`) : ''}
    ${st.start ? panel('Mijlpalen', `<div class="lrows mfrows cmiles">${CLEAN_STEPS.map(([n, l, txt]) => { const hit = !st.before && st.streak >= n; return `<div class="lrow ${hit ? '' : 'later'}"><span class="lmain"><b>${hit ? '✓ ' : ''}${esc(l)}</b><span>${esc(txt)}</span></span>${[7, 30, 90].includes(n) ? rewardSel(n) : ''}</div>`; }).join('')}</div>`) : ''}
    ${panel('Wat je ziet', st.logs.length ? `<p class="lnone">${top(trig) ? 'Trek kwam vooral: ' + esc(top(trig)) + '.' : ''} ${top(helps) ? 'Wat hielp: ' + esc(top(helps)) + '.' : ''}</p><div class="lrows">${st.logs.slice().sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))).slice(0, 8).map(row).join('')}</div>` : quiet('Elke keer dat je op Ik heb trek tikt, zie je hier wanneer het opkomt en wat helpt.'))}
    ${panel('Instellingen', `<div class="fset"><div><b>Prijs per stuk</b></div><input class="finp" type="number" step="0.5" data-cleanset="price" value="${esc(c.price)}"></div><div class="fset"><div><b>Per werkdag</b></div><input class="finp" type="number" step="0.5" data-cleanset="work" value="${esc(c.work)}"></div><div class="fset"><div><b>Per vrije dag</b></div><input class="finp" type="number" step="0.5" data-cleanset="free" value="${esc(c.free)}"></div>${st.start ? `<div class="fset"><div><b>Stopdatum</b></div><input class="finp" type="date" data-cleanset="date" value="${esc(st.start)}"></div>` : ''}<p class="lnone">Recepten en snacks die helpen staan bij <button class="chip link" data-act="go" data-v="kitchen/recipes">Recipes</button>.</p>`)}
  </div>`;
}
document.addEventListener('change', e => {
  const t = e.target; if (!C) return;
  if (t.matches?.('[data-cprep]')) { const s = new Set(CLEAN().prep || []); t.checked ? s.add(t.dataset.cprep) : s.delete(t.dataset.cprep); cleanSet({ prep: [...s] }); }
  if (t.matches?.('[data-creward]')) cleanSet({ rewards: { ...(CLEAN().rewards || {}), [t.dataset.creward]: t.value } });
  if (t.matches?.('[data-cleanset]')) { const k = t.dataset.cleanset; cleanSet({ [k]: k === 'date' ? t.value : num(t.value) }); }
  if (t.matches?.('[data-intent]')) C.savePrefs({ intent: { week: weekMon(addDays(today(), new Date().getDay() === 0 ? 1 : 0)), text: t.value.trim() } }).then(() => C.toast('Je focus staat op Today')).catch(() => {});
  if (t.matches?.('[data-dayset]')) C.savePrefs({ day: { ...(C.prefs().day || {}), [t.dataset.dayset]: t.type === 'number' ? num(t.value) : t.value } }).catch(() => C.toast('Opslaan lukte niet.'));
  if (t.matches?.('[data-top3pin]')) { const d = today(); try { localStorage.setItem('top3:' + d, t.value.trim()); } catch {} C.render(); }
});
async function cleanMoveWeek() {
  const st = cleanStats(), g = moveGoal(), wk = weekMon(), moved = CLEAN().moved || {};
  if (!st.weekSaved || moved[wk]) return C.toast(moved[wk] ? 'Deze week staat al in Verhuizen' : 'Nog niets bespaard deze week');
  try { if (g) await save(g, { saved: Math.round(((num(g.saved) || 0) + st.weekSaved) * 100) / 100 }); else await create('fgoals', { name: 'Verhuizen', saved: Math.round(st.weekSaved * 100) / 100, by: moveMonth() + '-01' }); await cleanSet({ moved: { ...moved, [wk]: Math.round(st.weekSaved * 100) / 100 } }); C.toast(`${eur(st.weekSaved)} naar Verhuizen. Maak het ook echt over.`); } catch { C.toast('Opslaan lukte niet.'); }
}

/* the day: a timeline from waking up to bedtime */
function dayItems(d = today()) {
  const t = dayType(d), c = DAYCFG(), w = wakeOn(d), bed = bedOn(d), ws = toMin(c.workStart), we = toMin(c.workEnd);
  const meals = recs('meals').filter(m => m.date === d), mealOf = s => meals.find(m => m.slot === s && !m.away), away = meals.some(m => m.slot === 'Dinner' && m.away);
  const nl = nlOn(d) || {}, eaten = new Set([].concat(nl.meals || []));
  const rt = r => recs('routines').filter(x => x.routine === r && onDay(x, d));
  const wo = recs('workouts').find(x => x.date === d && !x.skipped);
  const chore = recs('chores').filter(x => choreDue(x) <= d).sort((a, b) => choreDue(a).localeCompare(choreDue(b)))[0];
  const L2 = [];
  const add = (min, key, label, sub, extra = {}) => L2.push({ min, key, label, sub, ...extra });
  add(w, 'wake', 'Opstaan', t === 'office' ? 'Kantoordag' : t === 'home' ? 'Thuiswerkdag' : 'Weekend');
  add(w + 5, 'stretch', 'Stretchen', '5 minuten, rustig wakker worden');
  if (rt('Morning').length) add(w + 15, 'morning', 'Ochtendroutine', plural(rt('Morning').length, 'stap', 'stappen'), { go: 'care/habits' });
  add(w + 30, 'bf', 'Ontbijt', mealOf('Breakfast') ? relName(mealOf('Breakfast').recipe) || mealOf('Breakfast').what : 'Brood met hartig beleg', { done: eaten.has('Breakfast'), nl: 'Breakfast' });
  if (recs('supplements').some(s => !s.finished)) add(w + 35, 'sups', 'Supplementen en water', '', { go: 'care/supplements' });
  if (t !== 'weekend') add(ws, 'work', t === 'office' ? 'Kantoor' : 'Werken', `${c.workStart} tot ${c.workEnd}`);
  add(t === 'weekend' ? 13 * 60 : 12 * 60 + 30, 'lunch', 'Lunch', mealOf('Lunch') ? relName(mealOf('Lunch').recipe) || mealOf('Lunch').what : t === 'office' ? 'Meegenomen lunch' : '', { done: eaten.has('Lunch'), nl: 'Lunch' });
  if (t === 'home' && chore) add(12 * 60 + 50, 'chore', 'Klein klusje', chore.name, { go: 'home/chores' });
  if (t === 'weekend' && wdShort(d) === 'Sat') add(14 * 60, 'batch', 'Batchdag content', 'Content vooruit maken', { go: 'social/plan' });
  add(15 * 60 + 30, 'snack', 'Tussendoortje', 'Iets hartigs en voedzaams', { done: !!nl.snack, nlk: 'snack' });
  if (wo) add(t === 'weekend' ? 11 * 60 : we + 45, 'train', 'Training', wo.name || wo.type || '', { go: 'fit/workouts' });
  add(18 * 60 + 30, 'dinner', away ? 'Uit eten' : 'Avondeten', away ? '' : mealOf('Dinner') ? relName(mealOf('Dinner').recipe) || mealOf('Dinner').what : '', { done: eaten.has('Dinner') || away, nl: away ? null : 'Dinner' });
  if (dayType(addDays(d, 1)) !== 'weekend') add(20 * 60, 'prep', 'Morgen klaarzetten', 'Outfit, lunch en tas', { go: 'calendar' });
  if (wdShort(d) === 'Sun') add(19 * 60, 'review', 'Weekreview', 'Terugblik en plan voor volgende week', { go: 'plan/week' });
  add(bed - 60, 'wind', 'Afbouwen', 'Licht dimmen, schermen weg, 2 minuten journalen', { go: 'care/journal' });
  if (rt('Evening').length) add(bed - 40, 'evening', 'Avondroutine', plural(rt('Evening').length, 'stap', 'stappen'), { go: 'care/habits' });
  add(bed, 'bed', 'Naar bed', `${Math.round((wakeOn(addDays(d, 1)) + 1440 - bed) / 6) / 10} uur slaap tot ${hm(wakeOn(addDays(d, 1)))}`);
  return L2.sort((a, b) => a.min - b.min);
}
function timelineHTML() {
  const d = today(), now = new Date().getHours() * 60 + new Date().getMinutes(), ticks = tlDone(d), items = dayItems(d);
  const nextIdx = items.findIndex(x => x.min > now);
  return `<details class="tline" ${L.tlOpen ? 'open' : ''} data-tlopen><summary><b>Je dag</b><span class="lnone">${esc(items[Math.max(0, nextIdx)]?.label ? 'Hierna: ' + hm(items[Math.max(0, nextIdx)].min) + ' ' + items[Math.max(0, nextIdx)].label : 'Bijna bedtijd')}</span></summary><ol>${items.map((x, i) => { const done = x.done ?? ticks.has(x.key); return `<li class="${done ? 'done' : ''} ${i === nextIdx ? 'next' : ''} ${x.min < now && !done ? 'past' : ''}"><time>${hm(x.min)}</time><button class="tlck" data-act="tl" data-v="${x.key}" ${x.nl ? `data-nl="${x.nl}"` : ''} ${x.nlk ? `data-nlk="${x.nlk}"` : ''} aria-pressed="${!!done}" aria-label="Klaar: ${esc(x.label)}">${done ? svg(P.check) : ''}</button><span><b>${esc(x.label)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span>${x.go ? `<button class="chip link" data-act="go" data-v="${x.go}">Open</button>` : ''}</li>`; }).join('')}</ol></details>`;
}
document.addEventListener('toggle', e => { if (e.target.matches?.('[data-tlopen]')) L.tlOpen = e.target.open; }, true);
// three things that matter today: deadlines first, then your goals, then the house; your own pin always first
function top3() {
  const t = today(), tm = addDays(t, 1), out = [];
  let pin = ''; try { pin = localStorage.getItem('top3:' + t) || ''; } catch {}
  if (pin) out.push({ label: pin, sub: 'Jouw keuze', pin: true });
  for (const p of recs('posts').filter(p => p.stage !== 'Posted' && p.date && p.date <= tm)) out.push({ label: 'Post: ' + (p.name || 'content'), sub: p.date < t ? 'te laat' : p.date === t ? 'vandaag' : 'morgen', go: 'social/plan' });
  for (const a of recs('appts').filter(a => !a.done && a.date === t)) out.push({ label: a.what || 'Afspraak', sub: a.time || 'vandaag', go: 'care/health' });
  try { const st = fState(); for (const o of st.due.filter(o => o.date <= tm).slice(0, 2)) out.push({ label: 'Betalen: ' + o.bill.name, sub: eur(o.amount), go: 'money/repeats' }); } catch {}
  for (const k of recs('tasks').filter(k => k.date && k.date <= t && !['Done', 'Dropped'].includes(k.status)).slice(0, 2)) out.push({ label: k.name, sub: 'taak', go: 'social/tasks' });
  const cs = cleanStats(); if (cs.start && cs.before && cs.toGo <= 14 && (CLEAN().prep || []).length < PREP_STEPS.length) out.push({ label: 'Voorbereiden op stoppen', sub: `nog ${plural(cs.toGo, 'dag', 'dagen')}`, go: 'body/clean' });
  const first = invLive().filter(r => INV_WANT.includes(invStatus(r)) && ['Eerste week', 'Must-have'].includes(r.priority) && !invOpts(r.id).length)[0];
  if (first) out.push({ label: 'Opties zoeken: ' + first.name, sub: 'verhuislijst', go: 'home/inventory' });
  const chore = recs('chores').filter(x => choreDue(x) < t).sort((a, b) => choreDue(a).localeCompare(choreDue(b)))[0];
  if (chore) out.push({ label: chore.name, sub: 'ligt er al even', go: 'home/chores' });
  return out.slice(0, 3);
}
function todayTop() {
  if (!C) return '';
  const it = intentNow(), cs = cleanStats(), list = top3();
  let pin = ''; try { pin = localStorage.getItem('top3:' + today()) || ''; } catch {}
  return `<div class="ttop">
    ${it?.text ? `<p class="tintent"><span>Focus deze week</span><b>${esc(it.text)}</b></p>` : ''}
    ${pnAffirmHTML()}
    <section class="panel ttop3"><div class="lph3"><h3>Top 3 voor vandaag</h3>${cs.start ? `<button class="btn small" data-act="crave">Ik heb trek</button>` : ''}</div>
      <ol class="t3">${list.map(x => `<li><span><b>${esc(x.label)}</b><small>${esc(x.sub || '')}</small></span>${x.go ? `<button class="chip link" data-act="go" data-v="${x.go}">Open</button>` : ''}</li>`).join('') || '<li><span><b>Niets dringends</b><small>Kies zelf iets hieronder</small></span></li>'}</ol>
      <input class="finp" data-top3pin placeholder="Mijn eigen belangrijkste ding vandaag" value="${esc(pin)}" aria-label="Eigen top 1"></section>
    ${timelineHTML()}
    ${calStrip()}
  </div>`;
}

/* ---------- insurance, online orders, vision, self discovery, moodboard ---------- */
function insMonthly(r) { const a = num(r.amount); return r.billing === 'Yearly' ? a / 12 : r.billing === 'Quarterly' ? a / 3 : a; }
/* insurance premiums you pay as a repeat live in Repeats with the type Insurance. Ones that came in as a Bill
   are spotted by name (an insurance on this page, its company, or a word like verzekering) and moved in one step you can undo */
const INS_WORDS = /verzeker|insurance|aansprakelijk|inboedel|opstal|rechtsbijstand|uitvaart|overlijdensrisico|zorgpremie|\b(zilveren kruis|cz|vgz|menzis|dsw|onvz|centraal beheer|interpolis|fbto|ditzo|a\.?s\.?r|nationale.nederlanden|univ[eé]|ohra|allianz|aegon|inshared|promovendum|klaverblad|zekur|anderzorg|zorg en zekerheid|de friesland|ikzorg|ik zorg)\b/i;
function insLike() {
  const names = new Set(recs('insurance').flatMap(r => [r.name, r.company]).filter(Boolean).map(v => norm(v)));
  return recs('fbills').filter(b => b.active !== false && (b.type || 'Bill') === 'Bill' && (INS_WORDS.test(b.name || '') || names.has(norm(b.name || ''))));
}
const insMoveNote = () => { const l = insLike(); return l.length ? `<div class="note tnote fdupnote"><span>${l.length === 1 ? `${esc(l[0].name)} lijkt een verzekering` : `${l.length} bills lijken verzekeringen`}. Zet ${l.length === 1 ? 'hem' : 'ze'} onder Insurance.</span><button class="btn small primary" data-act="finsmove">Bekijken</button></div>` : ''; };
function insMove() {
  const l = insLike(); if (!l.length) return;
  const sh = C.sheet({ title: 'Naar Insurance', body: `<p class="lnone">Deze bills lijken verzekeringen. Vink uit wat geen verzekering is.</p><div class="lrows">${l.map(b => `<label class="lrow"><input type="checkbox" checked data-ins="${b.id}"><span class="lmain"><b>${esc(b.name)}</b><span>${esc(fCadence(b))}</span></span><span class="lside">${eur(num(b.amount))}</span></label>`).join('')}</div>`,
    foot: '<div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary" data-go>Verplaatsen</button>' });
  sh.querySelector('[data-go]').onclick = async e => {
    const ids = [...sh.querySelectorAll('[data-ins]:checked')].map(x => x.dataset.ins); if (!ids.length) { C.closeSheet(); return; }
    e.target.disabled = true;
    try { await putMany(ids.map(id => ({ id, kind: 'fbills', data: { ...dataOf(L.byId[id]), type: 'Insurance' } })), null, `Moved ${plural(ids.length, 'bill')} to Insurance`); C.closeSheet(); }
    catch (err) { failed(err); e.target.disabled = false; }
  };
}
function insuranceTop() {
  const l = recs('insurance').filter(r => r.status !== 'Stopped'), m = l.reduce((n, r) => n + insMonthly(r), 0);
  const rep = recs('fbills').filter(b => b.type === 'Insurance' && b.active !== false), rm = rep.reduce((n, b) => n + fPerMonth(b), 0);
  const next = l.filter(r => r.renews && r.renews >= today()).sort((a, b) => a.renews.localeCompare(b.renews))[0];
  const mo = +today().slice(5, 7), zorg = l.find(r => r.type === 'Zorgverzekering');
  return `${rep.length ? `<p class="lnone">In Repeats ${rep.length === 1 ? 'staat 1 verzekering' : `staan ${rep.length} verzekeringen`}, samen ${eur(rm)} per maand. ${mLink('Naar Repeats', 'money/repeats')}</p>` : ''}<div class="tiles lt3">${fTile('Per month', eur(m).replace(/\.00$/, ''), plural(l.length, 'insurance'))}${fTile('Per year', eur(Math.round(m * 12)).replace(/\.00$/, ''), 'all premiums')}${fTile('Next renewal', next ? esc(shortDate(next.renews)) : 'None', next ? esc(next.name) : 'add a renewal date')}</div>
  ${mo >= 11 ? `<p class="lnone">${zorg ? `Je zorgverzekering bij ${esc(zorg.company || 'je verzekeraar')} kun je tot 31 december opzeggen. Vergelijk nu, dan zit je 1 januari goed.` : 'Tot 31 december kun je overstappen van zorgverzekering. Voeg de jouwe toe om te vergelijken.'} <a href="https://www.independer.nl/zorgverzekering/intro.aspx" target="_blank" rel="noopener">Vergelijk op Independer</a></p>` : ''}`;
}
function ordersTop() {
  const l = recs('orders'), way = l.filter(r => ['Ordered', 'Shipped'].includes(r.status || 'Ordered')), back = l.filter(r => r.status === 'Delivered' && r.returnBy && r.returnBy >= today());
  const ret = l.filter(r => r.status === 'Returning'), money = ret.reduce((n, r) => n + num(r.price), 0);
  return `<div class="tiles lt3">${fTile('On the way', String(way.length), way.length ? esc(way.map(r => r.name).slice(0, 2).join(', ')) : 'nothing ordered')}${fTile('Can still return', String(back.length), back.length ? 'first by ' + esc(shortDate(back.map(r => r.returnBy).sort()[0])) : 'nothing open')}${fTile('Money back', eur(money), plural(ret.length, 'return'))}</div>`;
}
function visionTop() {
  const l = recs('vision'), done = l.filter(r => r.done).length, areas = new Set(l.map(r => r.area).filter(Boolean));
  let aff = ''; try { aff = C.affirmToday?.() || ''; } catch {}
  const affHTML = `<div class="banner">${aff ? `<p class="tintent"><span>Affirmatie van vandaag</span><b>${esc(aff)}</b></p>` : quiet('Nog geen affirmaties.')}<button class="btn small" data-act="affmanage">Affirmaties beheren</button></div>`;
  return affHTML + (l.length ? `<div class="tiles lt3">${fTile('Dreams', String(l.length), areas.size ? `in ${plural(areas.size, 'life area')}` : 'add a life area')}${fTile('Came true', String(done), done ? 'well done' : 'not yet')}${fTile('Linked to a goal', String(l.filter(r => r.goal).length), 'so you work towards it')}</div>` : `<p class="lnone">Zet hier foto's en dromen voor de komende jaren: je nieuwe huis, reizen, gezond leven. Koppel ze aan een doel in My year.</p>`);
}
const DISC_START = [
  ['Mijn sterke punten', 'Strengths', 'Waar vragen mensen mij om hulp bij?\nWanneer verlies ik de tijd omdat ik zo bezig ben?\nWelke drie complimenten krijg ik het vaakst?\nWaar ben ik trots op uit het afgelopen jaar?'],
  ['Mijn valkuilen', 'Weaknesses', 'Waar loop ik steeds weer tegenaan?\nWat stel ik uit, en waarom?\nWanneer word ik onzeker?\nWat zou ik willen leren of verbeteren?'],
  ['Beperkende overtuigingen', 'Beliefs', 'Welke zinnen zeg ik tegen mezelf als het tegenzit?\nKlopt dat echt? Wat is het bewijs ertegen?\nWat zou ik doen als ik dit niet geloofde?\nWelke nieuwe zin zet ik ervoor in de plaats?'],
  ['Mijn kernwaarden', 'Values', 'Kies vijf woorden die voor jou het belangrijkst zijn (bijvoorbeeld vrijheid, rust, creativiteit, gezondheid, familie).\nWaarom juist deze vijf?\nLeef ik daar nu naar? Waar wel en waar niet?'],
  ['Mijn ideale dag', 'Dreams', 'Beschrijf een gewone dinsdag over vijf jaar, van opstaan tot slapen.\nWaar woon ik, wat doe ik, met wie ben ik?\nWat kan ik nu al doen om dichterbij te komen?'],
  ['Wat geeft me energie', 'Personality', 'Wat geeft me energie en wat kost me energie?\nWanneer voel ik me het meest mezelf?\nHoe laad ik het beste op: alleen of met anderen?'],
  ['Mensen om me heen', 'Relationships', 'Bij wie voel ik me goed?\nWie mis ik, en wanneer neem ik contact op?\nWelke grens wil ik beter bewaken?']
];
function discoverTop() {
  const l = recs('discover'), done = l.filter(r => r.status === 'Done').length;
  const missing = DISC_START.filter(([n]) => !l.some(r => norm(r.name) === norm(n))).length;
  return `${l.length ? `<div class="tiles lt3">${fTile('Exercises', String(l.length), 'to get to know yourself')}${fTile('Done', String(done), done ? 'nice work' : 'start with one')}${fTile('In progress', String(l.filter(r => r.status === 'In progress').length), 'take your time')}</div>` : ''}${missing ? `<div class="banner">${quiet(l.length ? `Er zijn nog ${missing} startoefeningen die je niet hebt.` : 'Begin met een paar oefeningen met vragen. Je vult ze in wanneer je zin hebt.')}<button class="btn small primary" data-act="discstart">Startoefeningen toevoegen</button></div>` : ''}`;
}
async function discStart() {
  const have = new Set(recs('discover').map(r => norm(r.name))), rows = DISC_START.filter(([n]) => !have.has(norm(n))).map(([name, type, prompts]) => ({ id: C.uuid(), kind: 'discover', data: { name, type, prompts, status: 'Not started', created: Date.now() } }));
  if (!rows.length) return C.toast('De startoefeningen staan er al in');
  try { await putMany(rows, null, 'Startoefeningen'); C.toast(`${plural(rows.length, 'oefening', 'oefeningen')} toegevoegd`); } catch { C.toast('Opslaan lukte niet. Probeer het opnieuw.'); }
}
function moodTop() {
  const l = recs('moodboard'), rooms = new Set(l.map(r => r.room).filter(Boolean));
  return l.length ? `<p class="lnone">${plural(l.length, 'inspiratie', 'inspiraties')} voor ${plural(rooms.size, 'kamer', 'kamers')}. Koppel een foto aan iets op je verhuislijst, dan zie je wat je zoekt als je gaat kopen.</p>` : `<p class="lnone">Verzamel foto's en links voor je nieuwe huis, per kamer. Koppel ze aan je verhuislijst.</p>`;
}

/* ---------- Pinterest ----------
   The offers function talks to Pinterest; the app connects, picks what each board is for, shows the stats and pins posts. */
const pnAcc = () => recs('accounts').find(a => a.platform === 'Pinterest') || null;
const PN_ROLES = [['', 'Niet gebruiken'], ['mood', 'Moodboard (Home)'], ['inspo', 'Inspiratie (Social)'], ['affirm', 'Affirmaties (Today)']];
const pnRoleOf = (a, id) => (a?.pnBoards?.affirm === id ? 'affirm' : [].concat(a?.pnBoards?.mood || []).includes(id) ? 'mood' : [].concat(a?.pnBoards?.inspo || []).includes(id) ? 'inspo' : '');
// the pin of the day from your affirmations board; "Another one" shows the next
function pnAffirmToday(shift = 0) {
  const l = (pnAcc()?.pnAffirm || []).filter(p => p.img); if (!l.length) return null;
  const n = Math.floor(Date.parse(today()) / 864e5) + shift; return l[((n % l.length) + l.length) % l.length];
}
function pnAffirmHTML() {
  const p = pnAffirmToday(L.pnShift || 0); if (!p) return '';
  return `<section class="panel pnaff"><a href="https://www.pinterest.com/pin/${esc(p.id)}/" target="_blank" rel="noopener" class="pnaffimg"><img referrerpolicy="no-referrer" src="${esc(p.img)}" alt="${esc(p.text || 'Affirmatie van je Pinterest-bord')}" loading="lazy" onerror="this.closest('.pnaff').remove()"></a><div class="pnafftxt"><span>Affirmatie van vandaag</span>${p.text ? `<b>${esc(p.text)}</b>` : ''}<button class="chip link" data-act="pnnext">Een andere</button></div></section>`;
}
const pnRedirect = () => location.origin + location.pathname.replace(/index\.html$/, '');
async function pnConnect() {
  try {
    const j = await C.callFn('offers', { action: 'pnstart' }), state = 'pn' + C.uuid().replace(/-/g, '');
    try { sessionStorage.setItem('pn:state', state); } catch {}
    location.href = `https://www.pinterest.com/oauth/?client_id=${encodeURIComponent(j.appId)}&redirect_uri=${encodeURIComponent(pnRedirect())}&response_type=code&scope=boards:read,pins:read,pins:write,user_accounts:read&state=${state}`;
  } catch (e) { C.toast(/not set/.test(e.message) ? 'Zet eerst PINTEREST_APP_ID in Supabase.' : 'Pinterest starten lukte niet: ' + e.message); }
}
async function pnReturn(code) {
  try { sessionStorage.removeItem('pn:state'); history.replaceState(null, '', location.pathname + '#social/pinterest'); } catch {}
  C.go('social/pinterest'); C.toast('Pinterest koppelen…');
  try { const j = await C.callFn('offers', { action: 'pnconnect', code, redirect: pnRedirect() }); await load(); C.toast(`Pinterest gekoppeld: ${plural(j.boards || 0, 'bord', 'borden')}. Kies hieronder wat elk bord doet.`); }
  catch (e) { C.toast('Pinterest koppelen lukte niet: ' + e.message); }
}
async function pnSync(quiet) {
  if (L.pnBusy) return; L.pnBusy = true; if (!quiet) C.toast('Pinterest bijwerken…');
  try { const j = await C.callFn('offers', { action: 'pnsync' }); await load(); if (!quiet) C.toast(`Pinterest bijgewerkt${j.added ? `: ${plural(j.added, 'nieuwe pin', 'nieuwe pins')}` : ''}${j.affirmations ? ` · ${j.affirmations} affirmaties` : ''}`); }
  catch (e) { if (!quiet) C.toast('Pinterest bijwerken lukte niet: ' + e.message); }
  finally { L.pnBusy = false; }
}
async function pnSetRole(id, role) {
  const a = pnAcc(); if (!a) return;
  const b = { mood: [].concat(a.pnBoards?.mood || []).filter(x => x !== id), inspo: [].concat(a.pnBoards?.inspo || []).filter(x => x !== id), affirm: a.pnBoards?.affirm === id ? '' : (a.pnBoards?.affirm || '') };
  if (role === 'mood' || role === 'inspo') b[role].push(id); else if (role === 'affirm') b.affirm = id;
  try { await save(a, { pnBoards: b }); C.toast(role ? 'Opgeslagen. Druk op Bijwerken om de pins op te halen.' : 'Bord wordt niet meer gebruikt'); } catch (e) { failed(e); }
}
function pnPinSheet(id) {
  const r = L.byId[id], a = pnAcc(); if (!r || !a) return;
  const boards = a.pnBoardList || [];
  const sh = C.sheet({ title: 'Pin op Pinterest', body: `<p class="lnone">De foto, titel en caption van deze post gaan als pin naar het bord dat je kiest.${a.pnTrial !== false ? ' Zolang je app op Trial access staat, zie alleen jij deze pin.' : ''}</p>
    <label class="lfield"><span>Bord</span><select class="finp" data-pnboard>${boards.map(b => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('')}</select></label>
    <label class="lfield"><span>Link (optioneel)</span><input class="finp" data-pnlink type="url" placeholder="https://" value="${esc(r.pnLink || r.link || '')}"></label>
    <div class="lbar"><button class="btn primary" data-pngo>Pinnen</button></div>` });
  sh.querySelector('[data-pngo]')?.addEventListener('click', async () => {
    const board = sh.querySelector('[data-pnboard]').value, link = sh.querySelector('[data-pnlink]').value.trim();
    C.closeSheet(); C.toast('Pinnen…');
    try { await C.callFn('offers', { action: 'pnpost', id, board, link }); await load(); C.toast('Gepind op Pinterest'); } catch (e) { C.toast('Pinterest nam hem niet aan: ' + e.message); }
  });
}
function socialPinterest(host) {
  const a = pnAcc(), st = a?.pnStats, boards = a?.pnBoardList || [], on = !!a?.pnSync;
  if (on && Date.now() - a.pnSync > 6 * 36e5 && !L.pnTried) { L.pnTried = true; pnSync(true); }
  const mine = recs('posts').filter(p => p.pnId).sort((x, y) => (num(y.pnViews) || 0) - (num(x.pnViews) || 0));
  const n = v => v == null ? '–' : kfmt(v);
  host.innerHTML = `${head('Pinterest')}
  <div class="ltools">${on ? `<button class="btn small primary" data-act="pnsync">Bijwerken</button>${a.url ? `<a class="btn small" href="${esc(a.url)}" target="_blank" rel="noopener">Open Pinterest</a>` : ''}<span class="lnone">${esc(a.handle || '')} · bijgewerkt ${esc(relDay(iso(new Date(a.pnSync))))}</span>` : '<button class="btn small primary" data-act="pnconnect">Koppel Pinterest</button>'}</div>
  ${on ? '' : `<div class="banner">${quiet('Koppel je zakelijke Pinterest-account. Daarna kies je per bord of het naar je moodboard, je inspiratie of je affirmaties op Today gaat, zie je je statistieken en pin je posts vanuit de app.')}</div>`}
  ${on ? `<div class="tiles">${fTile('Weergaven', n(st?.impressions), 'laatste 30 dagen')}${fTile('Saves', n(st?.saves), 'laatste 30 dagen')}${fTile('Pin-klikken', n(st?.clicks), 'laatste 30 dagen')}${fTile('Naar je link', n(st?.outbound), 'uitgaande klikken')}</div>${a.pnStatsError ? `<p class="lnone">Statistieken lukten niet: ${esc(a.pnStatsError)}</p>` : ''}` : ''}
  <div class="panels">
    ${on ? panel('Je borden', boards.length ? `<p class="lnone">Kies wat elk bord in de app doet. Eén bord kan je affirmaties voor Today zijn.</p><div class="lrows">${boards.map(b => `<div class="lrow"><span class="lmain"><b>${esc(b.name)}</b><span>${b.pins != null ? plural(b.pins, 'pin') : ''}</span></span><select class="finp pnrole" data-pnrole="${esc(b.id)}" aria-label="Gebruik van ${esc(b.name)}">${PN_ROLES.map(([v, l]) => `<option value="${v}" ${pnRoleOf(a, b.id) === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`).join('')}</div>` : quiet('Nog geen borden gevonden. Druk op Bijwerken.')) : ''}
    ${on ? panel('Pins uit de app', mine.length ? `<div class="lrows">${mine.map(p => `<div class="lrow"><button class="lmain" data-act="open" data-id="${p.id}"><b>${esc(titleOf(p))}</b><span>${n(p.pnViews)} weergaven · ${n(p.pnSaves)} saves · ${n(p.pnClicks)} klikken${p.pnPosted ? ' · ' + esc(shortDate(p.pnPosted)) : ''}</span></button></div>`).join('')}</div>` : quiet('Open een post met een foto en kies Pin op Pinterest.'), ['social/posts', 'Posts']) : ''}
    ${on && a.pnAffirm?.length ? panel('Affirmaties', `<p class="lnone">${plural(a.pnAffirm.length, 'pin')} op je affirmatiebord. Today toont er elke dag een andere.</p>`) : ''}
  </div>`;
  host.querySelectorAll('[data-pnrole]').forEach(el => el.addEventListener('change', () => pnSetRole(el.dataset.pnrole, el.value)));
}

/* ---------- Life › Calendar: everything in the app on one calendar ----------
   Each source turns its records into events { id, cat, date, time, title, sub, imp, done, toggle, move, open, go }.
   Month, week, day (with your day rhythm) and agenda; filter per area; tick off, move (drag on a computer, Move on a phone)
   and add straight onto a day. The week review sits under it. */
const CAL_CATS = [['life', 'Life'], ['body', 'Body'], ['kitchen', 'Kitchen'], ['money', 'Finance'], ['social', 'Social'], ['home', 'Home'], ['closet', 'Closet'], ['orders', 'Bestellingen']];
const CAL_MS = [1, 3, 7, 14, 30, 60, 90, 182, 365];
const NL_WD = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const calLoad = () => { const c = L.cal ||= { view: 'month', date: today() }; if (!c.off) { try { c.off = new Set(JSON.parse(localStorage.getItem('calOff') || '[]')); } catch { c.off = new Set(); } try { c.view = localStorage.getItem('calView') || c.view; } catch {} } return c; };
const inR = (d, a, b) => d && d >= a && d <= b;
const hmToMin = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };
function calEvents(from, to, all) {
  const ev = [], t = today(), bad = new Set();
  // an item with a date the calendar can't read is left out instead of breaking the whole calendar
  const add = e => { const d = typeof e.date === 'string' ? e.date.slice(0, 10) : ''; if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return; ev.push({ ...e, date: d, time: typeof e.time === 'string' ? e.time : '', title: String(e.title ?? ''), sub: e.sub == null ? '' : String(e.sub) }); };
  const safe = (area, f) => { try { f(); } catch (err) { console.error('calendar', area, err); bad.add(area); } };
  const sv = (r, patch) => save(r, patch);
  // Life
  safe('Life', () => {
  for (const a of recs('appts')) if (inR(a.date, from, to)) add({ id: 'appt:' + a.id, cat: 'life', date: a.date, time: a.time, title: a.what || a.type || 'Afspraak', sub: [a.type, a.where || a.location].filter(Boolean).join(' · '), imp: true, done: !!a.done, toggle: () => sv(a, { done: !a.done }), move: d => sv(a, { date: d }), open: a.id });
  });
  safe('Life', () => {
  for (const tr of tripList()) { const end = tripEnd(tr); for (let d = tr.start, i = 0; d <= end && i < 60; d = addDays(d, 1), i++) if (inR(d, from, to)) add({ id: 'trip:' + tr.id + ':' + d, cat: 'life', date: d, title: (d === tr.start ? 'Vertrek: ' : d === end ? 'Terug: ' : '') + tripName(tr), imp: d === tr.start, go: 'care/trips' }); }
  });
  safe('Life', () => {
  for (const g of recs('lgoals')) if (inR(g.due, from, to) && g.status !== 'Completed') add({ id: 'goal:' + g.id, cat: 'life', date: g.due, title: 'Deadline: ' + (g.name || 'doel'), imp: true, open: g.id, move: d => sv(g, { due: d }) });
  });
  safe('Life', () => {
  for (const g of recs('gifts')) if (inR(g.date, from, to)) add({ id: 'gift:' + g.id, cat: 'life', date: g.date, title: `${g.occasion || 'Cadeau'}${g.for ? ': ' + g.for : ''}`, sub: g.name, imp: true, done: g.status === 'Given', toggle: () => sv(g, g.status === 'Given' ? { status: 'Bought' } : { status: 'Given', given: g.date }), open: g.id, move: d => sv(g, { date: d }) });
  });
  safe('Life', () => {
  for (const x of recs('documents')) if (inR(x.expires, from, to)) add({ id: 'doc:' + x.id, cat: 'life', date: x.expires, title: 'Verloopt: ' + (x.name || 'document'), imp: true, open: x.id });
  });
  safe('Life', () => {
  for (const w of recs('wishes')) if (inR(w.planBuy, from, to) && w.status !== 'Bought') add({ id: 'wish:' + w.id, cat: 'life', date: w.planBuy, title: 'Kopen: ' + (w.name || 'wens'), sub: eur(num(w.price)), open: w.id, move: d => sv(w, { planBuy: d }) });
  });
  safe('Life', () => {
  for (const p of recs('projects')) if (inR(p.end, from, to)) add({ id: 'proj:' + p.id, cat: 'social', date: p.end, title: 'Deadline: ' + (p.name || 'project'), imp: true, open: p.id, move: d => sv(p, { end: d }) });
  });
  safe('Life', () => {
  const cs = cleanStats(); if (cs.start) for (const n of CAL_MS) { const d = addDays(cs.start, n - 1); if (inR(d, from, to)) add({ id: 'clean:' + n, cat: 'body', date: d, title: `Clean: ${n === 1 ? 'dag 1' : n < 30 ? n + ' dagen' : n < 365 ? Math.round(n / 30) + ' maanden' : '1 jaar'}`, imp: true, go: 'body/clean' }); }
  });
  // Body
  safe('Body', () => {
  for (const w of recs('workouts')) if (inR(w.date, from, to) && !w.skipped) add({ id: 'wo:' + w.id, cat: 'body', date: w.date, title: w.name || w.type || 'Workout', done: !!w.done, toggle: () => sv(w, { done: !w.done }), move: d => sv(w, { date: d }), open: w.id });
  });
  safe('Body', () => {
  for (const g of recs('fitgoals')) if (inR(g.due, from, to)) add({ id: 'fg:' + g.id, cat: 'body', date: g.due, title: 'Doel: ' + (g.name || 'fitness'), imp: true, open: g.id });
  });
  safe('Body', () => {
  const cy = cycleStats(); if (cy.next && inR(cy.next, from, to)) add({ id: 'cycle', cat: 'body', date: cy.next, title: 'Menstruatie verwacht', sub: cy.guessed ? 'schatting' : `cyclus ${cy.avg} dagen`, go: 'care/cycle' });
  });
  safe('Body', () => {
  for (const c of recs('cycles')) if (inR(c.start, from, to)) add({ id: 'cyc:' + c.id, cat: 'body', date: c.start, title: 'Menstruatie', open: c.id });
  });
  // Kitchen
  safe('Kitchen', () => {
  for (const m of recs('meals')) if (inR(m.date, from, to)) add({ id: 'meal:' + m.id, cat: 'kitchen', date: m.date, title: `${({ Breakfast: 'Ontbijt', Lunch: 'Lunch', Dinner: 'Diner', Snack: 'Snack' })[m.slot] || m.slot || 'Maaltijd'}: ${m.away ? 'uit eten' : relName(m.recipe) || m.what || ''}`, move: d => sv(m, { date: d }), open: m.id });
  });
  safe('Kitchen', () => {
  for (const m of recs('mealprep')) if (inR(m.prepDay, from, to)) add({ id: 'prep:' + m.id, cat: 'kitchen', date: m.prepDay, title: 'Meal prep: ' + (titleOf(m) || ''), move: d => sv(m, { prepDay: d }), open: m.id });
  });
  // Finance
  safe('Finance', () => {
  try { for (const o of fOccs(from, to)) add({ id: 'bill:' + o.key, cat: 'money', date: o.date, title: `${o.bill.name || 'Rekening'} ${eur(o.amount)}`, sub: o.type, imp: o.amount >= 50 || o.type === 'Bill' || o.type === 'Insurance', done: o.paid, go: 'money/repeats' }); } catch {}
  });
  safe('Finance', () => {
  for (const pd of fPays(from, to)) add({ id: 'pay:' + pd, cat: 'money', date: pd, title: 'Salaris', imp: true, go: 'money/today' });
  });
  safe('Finance', () => {
  for (const i of recs('insurance')) if (inR(i.renews, from, to) && i.status !== 'Stopped') add({ id: 'ins:' + i.id, cat: 'money', date: i.renews, title: 'Verlengt: ' + (i.name || 'verzekering'), imp: true, open: i.id });
  });
  safe('Finance', () => {
  for (const b of recs('fbills')) if (inR(b.trialEnds, from, to)) add({ id: 'trial:' + b.id, cat: 'money', date: b.trialEnds, title: 'Proefperiode stopt: ' + (b.name || ''), imp: true, open: b.id });
  });
  safe('Finance', () => {
  for (const g of recs('fgoals')) if (inR(g.by, from, to)) add({ id: 'fgoal:' + g.id, cat: 'money', date: g.by, title: 'Spaardoel: ' + (g.name || ''), imp: true, open: g.id });
  });
  // Social
  safe('Social', () => {
  try { for (const x of postEvents(from, to)) { const p = x.p, k = x.k; add({ id: 'post:' + p.id + ':' + k + ':' + x.label, cat: 'social', date: x.d, time: k === 'date' ? p.time : '', title: `${x.label}${k === 'collab' ? ' ' : ': '}${p.name || p.brand || ''}`, imp: k === 'collab' || k === 'date', done: x.done, open: p.id, move: k !== 'collab' ? d => sv(p, { [k]: d }) : null }); } } catch {}
  });
  safe('Social', () => {
  for (const k of recs('tasks')) if (inR(k.date, from, to) && k.status !== 'Dropped') add({ id: 'task:' + k.id, cat: 'social', date: k.date, title: k.name || 'Taak', done: k.status === 'Done', toggle: () => sv(k, { status: k.status === 'Done' ? 'To do' : 'Done' }), move: d => sv(k, { date: d }), open: k.id });
  });
  // Home
  safe('Home', () => {
  for (const c of recs('chores')) { const d = choreDue(c); if (inR(d, from, to)) add({ id: 'chore:' + c.id, cat: 'home', date: d, title: c.name || 'Klusje', done: false, toggle: () => sv(c, { last: t }), move: nd => sv(c, { last: addDays(nd, -(FREQ[c.freq] || 7)) }), open: c.id }); }
  });
  safe('Home', () => {
  for (const p of recs('plants')) { const d = plantDue(p); if (d && inR(d < t ? t : d, from, to)) add({ id: 'plant:' + p.id, cat: 'home', date: d < t ? t : d, title: 'Water: ' + (p.name || 'plant'), toggle: () => sv(p, { last: t }), open: p.id }); }
  });
  safe('Home', () => {
  for (const r of recs('repairs')) if (inR(r.date, from, to)) add({ id: 'rep:' + r.id, cat: 'home', date: r.date, title: r.name || 'Reparatie', open: r.id, move: d => sv(r, { date: d }) });
  });
  // Closet
  safe('Closet', () => {
  for (const x of C.closetDays?.() || []) if (inR(x.date, from, to)) add({ id: 'look:' + x.date, cat: 'closet', date: x.date, title: 'Outfit: ' + (x.name || 'gepland'), go: 'calendar', move: d => C.closetMove?.(x.date, d) });
  });
  // Orders
  safe('Orders', () => {
  for (const o of recs('orders')) {
    if (inR(o.expected, from, to) && ['Ordered', 'Shipped'].includes(o.status || 'Ordered')) add({ id: 'ord:' + o.id, cat: 'orders', date: o.expected, title: 'Komt binnen: ' + (o.name || 'pakket'), sub: o.shop, toggle: () => sv(o, { status: 'Delivered', received: t, returnBy: o.returnBy || addDays(t, 14) }), open: o.id });
    if (inR(o.returnBy, from, to) && o.status === 'Delivered') add({ id: 'ret:' + o.id, cat: 'orders', date: o.returnBy, title: 'Laatste retourdag: ' + (o.name || ''), imp: true, toggle: () => sv(o, { status: 'Kept' }), open: o.id });
  }
  });
  const off = calLoad().off;
  L.calBad = [...bad];
  return ev.filter(e => all || !off.has(e.cat)).sort((a, b) => a.date.localeCompare(b.date) || (hmToMin(a.time) ?? -1) - (hmToMin(b.time) ?? -1) || (b.imp ? 1 : 0) - (a.imp ? 1 : 0));
}
const calCatName = k => CAL_CATS.find(c => c[0] === k)?.[1] || k;
const calItem = (e, cls = '') => `<button class="calit cal-${e.cat} ${e.imp ? 'imp' : ''} ${e.done ? 'done' : ''} ${cls}" data-cal="${esc(e.id)}" ${e.move ? 'draggable="true"' : ''} title="${esc(calCatName(e.cat) + ': ' + e.title)}">${e.time ? `<i>${esc(e.time.slice(0, 5))}</i>` : ''}${e.imp ? '<span class="calstar" aria-hidden="true">★</span>' : ''}<span>${esc(e.title)}</span></button>`;
const calDayLabel = d => { const x = fromISO(d); return `${NL_WD[(x.getDay() + 6) % 7]} ${x.getDate()} ${x.toLocaleDateString('nl-NL', { month: 'short' })}`; };
function calRange(c) {
  const d = fromISO(c.date);
  if (c.view === 'month') { const first = iso(new Date(d.getFullYear(), d.getMonth(), 1)), start = weekMon(first); return [start, addDays(start, 41)]; }
  if (c.view === 'week') { const s = weekMon(c.date); return [s, addDays(s, 6)]; }
  if (c.view === 'day') return [c.date, c.date];
  return [c.date, addDays(c.date, 30)];
}
function calPageInner(host) {
  const c = calLoad(), [from, to] = calRange(c), ev = calEvents(from, to), t = today();
  L.calMap = Object.fromEntries(ev.map(e => [e.id, e]));
  const byDay = {}; for (const e of ev) (byDay[e.date] ||= []).push(e);
  const dt = fromISO(c.date), title = c.view === 'month' ? dt.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }) : c.view === 'week' ? `Week van ${calDayLabel(from)}` : c.view === 'day' ? dt.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Komende 30 dagen';
  const addBtn = d => `<button class="caladd" data-act="caladd" data-v="${d}" aria-label="Iets toevoegen op ${esc(calDayLabel(d))}">+</button>`;
  let body = '';
  if (c.view === 'month') {
    const mo = dt.getMonth();
    body = `<div class="calmonth"><div class="calwd">${NL_WD.map(w => `<span>${w}</span>`).join('')}</div><div class="calgrid">${Array.from({ length: 42 }, (_, i) => addDays(from, i)).map(d => { const l = byDay[d] || [], x = fromISO(d); return `<div class="calday ${x.getMonth() !== mo ? 'out' : ''} ${d === t ? 'now' : ''}" data-calday="${d}"><div class="caldh"><button class="caldn" data-act="calgo" data-v="${d}">${x.getDate()}</button>${addBtn(d)}</div>${l.slice(0, 4).map(e => calItem(e)).join('')}${l.length > 4 ? `<button class="calmore" data-act="calgo" data-v="${d}">+${l.length - 4} meer</button>` : ''}</div>`; }).join('')}</div></div>`;
  } else if (c.view === 'week') {
    body = `<div class="calweek">${Array.from({ length: 7 }, (_, i) => addDays(from, i)).map(d => `<div class="calcol ${d === t ? 'now' : ''}" data-calday="${d}"><div class="caldh"><button class="caldn" data-act="calgo" data-v="${d}">${esc(calDayLabel(d))}</button>${addBtn(d)}</div>${(byDay[d] || []).map(e => calItem(e)).join('') || '<p class="lnone">Niets gepland</p>'}</div>`).join('')}</div>`;
  } else if (c.view === 'day') {
    const l = byDay[c.date] || [], allday = l.filter(e => hmToMin(e.time) == null), timed = l.filter(e => hmToMin(e.time) != null);
    let rhythm = []; try { rhythm = dayItems(c.date).map(x => ({ min: x.min, label: x.label, sub: x.sub })); } catch {}
    const rows = [...rhythm.map(r => ({ min: r.min, html: `<div class="calrow rh"><i>${hm(r.min)}</i><span><b>${esc(r.label)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span></div>` })), ...timed.map(e => ({ min: hmToMin(e.time), html: `<div class="calrow"><i>${esc(e.time.slice(0, 5))}</i>${calItem(e, 'wide')}</div>` }))].sort((a, b) => a.min - b.min);
    body = `<div class="calone" data-calday="${c.date}"><div class="caldh"><b>Hele dag</b>${addBtn(c.date)}</div>${allday.map(e => calItem(e, 'wide')).join('') || '<p class="lnone">Niets voor de hele dag.</p>'}<div class="caldh"><b>Je dag</b></div><div class="caltimes">${rows.map(r => r.html).join('')}</div></div>`;
  } else {
    const days = Object.keys(byDay).sort();
    body = `<div class="calagenda">${days.map(d => `<div class="calag" data-calday="${d}"><div class="caldh"><button class="caldn" data-act="calgo" data-v="${d}">${esc(calDayLabel(d))}${d === t ? ' · vandaag' : ''}</button>${addBtn(d)}</div>${byDay[d].map(e => calItem(e, 'wide')).join('')}</div>`).join('') || quiet('Niets gepland in de komende 30 dagen.')}</div>`;
  }
  host.innerHTML = `<div class="viewhead"><h1>Calendar</h1><span class="sub">${esc(title)}</span></div>
  <div class="caltools"><div class="seg" role="group" aria-label="Weergave">${[['month', 'Maand'], ['week', 'Week'], ['day', 'Dag'], ['agenda', 'Agenda']].map(([k, l]) => `<button data-act="calview" data-v="${k}" aria-pressed="${c.view === k}">${l}</button>`).join('')}</div>
    <div class="calnav"><button class="iconbtn" data-act="calstep" data-v="-1" aria-label="Vorige">‹</button><button class="btn small" data-act="calgo" data-v="${t}" data-keep="1">Vandaag</button><button class="iconbtn" data-act="calstep" data-v="1" aria-label="Volgende">›</button></div></div>
  <div class="calcats" role="group" aria-label="Onderdelen">${CAL_CATS.map(([k, l]) => `<button class="chip calcat cal-${k}" data-act="calcat" data-v="${k}" aria-pressed="${!c.off.has(k)}"><span class="caldot"></span>${l}</button>`).join('')}</div>
  ${body}
  <p class="lnone calhint">Tik op iets om het te openen, af te vinken of te verplaatsen. Op een computer kun je het ook naar een andere dag slepen. ★ is belangrijk.</p>
  <div data-calweek></div>`;
  // the week review (terugblik, focus, zondag reset) lives under the calendar
  const wk = host.querySelector('[data-calweek]');
  if (wk) { try { planWeek(wk); wk.querySelector('.viewhead')?.remove(); const h = document.createElement('h2'); h.className = 'calwh'; h.textContent = 'Deze week'; wk.prepend(h); } catch {} }
}
function calPage(host) {
  try { calPageInner(host); }
  catch (err) {
    console.error(err);
    // a stored view or date that no longer works: start again on this month
    L.cal = null; try { localStorage.removeItem('calView'); } catch {}
    try { calPageInner(host); } catch (err2) { console.error(err2); host.innerHTML = `<div class="viewhead"><h1>Calendar</h1></div><div class="note">De Calendar kon niet laden: ${esc(String(err2?.message || err2))}. Stuur een screenshot hiervan naar Claude.</div>`; return; }
  }
  if (L.calBad?.length) host.querySelector('.calcats')?.insertAdjacentHTML('afterend', `<div class="note calbad">Een paar items uit ${esc(L.calBad.join(', '))} konden niet in de Calendar. De rest staat er wel.</div>`);
}
function calSheet(id) {
  const e = L.calMap?.[id]; if (!e) return;
  const sh = C.sheet({ title: e.title, body: `<p class="lnone"><span class="caldot cal-${e.cat}"></span> ${esc(calCatName(e.cat))} · ${esc(calDayLabel(e.date))}${e.time ? ' · ' + esc(e.time.slice(0, 5)) : ''}${e.sub ? ' · ' + esc(e.sub) : ''}</p>
    <div class="lbar">${e.open || e.go ? '<button class="btn" data-calopen>Open</button>' : ''}${e.toggle ? `<button class="btn ${e.done ? '' : 'primary'}" data-caldone>${e.done ? 'Toch niet gedaan' : 'Afvinken'}</button>` : ''}</div>
    ${e.move ? `<label class="lfield"><span>Verplaats naar</span><input class="finp" type="date" data-calto value="${e.date}"></label><div class="lbar"><button class="btn small" data-calmove>Verplaatsen</button></div>` : ''}` });
  sh.addEventListener('click', async ev => {
    if (ev.target.closest('[data-calopen]')) { C.closeSheet(); if (e.open) openRecord(e.open); else C.go(e.go); }
    if (ev.target.closest('[data-caldone]')) { C.closeSheet(); try { await e.toggle(); } catch (err) { failed(err); } C.render(); }
    if (ev.target.closest('[data-calmove]')) { const d = sh.querySelector('[data-calto]').value; if (!d || d === e.date) return; C.closeSheet(); calMove(e, d); }
  });
}
async function calMove(e, d) {
  if (!e?.move) return;
  try { await e.move(d); C.toast(`Verplaatst naar ${calDayLabel(d)}`); } catch (err) { failed(err); }
  C.render();
}
const CAL_ADD = [['appts', 'Afspraak', d => ({ date: d })], ['workouts', 'Workout', d => ({ date: d })], ['meals', 'Maaltijd', d => ({ date: d, slot: 'Dinner' })], ['mealprep', 'Meal prep', d => ({ prepDay: d })], ['posts', 'Post', d => ({ date: d, stage: 'Planned' })], ['tasks', 'Taak', d => ({ date: d })], ['gifts', 'Verjaardag of cadeau', d => ({ date: d, occasion: 'Birthday' })], ['repairs', 'Reparatie of klus', d => ({ date: d })]];
function calAdd(d) {
  const sh = C.sheet({ title: 'Toevoegen op ' + calDayLabel(d), body: `<div class="calnew">${CAL_ADD.map(([k, l]) => `<button class="btn" data-caln="${k}">${esc(l)}</button>`).join('')}<button class="btn" data-calout>Outfit plannen</button></div>` });
  sh.addEventListener('click', ev => {
    const b = ev.target.closest('[data-caln]'); if (b) { const x = CAL_ADD.find(a => a[0] === b.dataset.caln); C.closeSheet(); openEditor(x[0], null, x[2](d)); }
    if (ev.target.closest('[data-calout]')) { C.closeSheet(); C.go('calendar'); }
  });
}
// a week strip for Today: dots per area, the first important thing, tap to open that day
function calStrip() {
  const t = today(), to = addDays(t, 6); let ev = []; try { ev = calEvents(t, to); } catch { return ''; }
  const byDay = {}; for (const e of ev) (byDay[e.date] ||= []).push(e);
  return `<section class="panel calstrip"><div class="lph3"><h3>Komende week</h3><button class="chip link" data-act="go" data-v="plan/week">Calendar</button></div><div class="calsd">${Array.from({ length: 7 }, (_, i) => addDays(t, i)).map(d => { const l = byDay[d] || [], cats = [...new Set(l.map(e => e.cat))], top = l.find(e => e.imp) || l[0]; return `<button class="calsday ${d === t ? 'now' : ''}" data-act="calopenday" data-v="${d}"><small>${NL_WD[(fromISO(d).getDay() + 6) % 7]}</small><b>${fromISO(d).getDate()}</b><span class="caldots">${cats.slice(0, 5).map(k => `<i class="caldot cal-${k}"></i>`).join('')}</span><em>${top ? esc(top.title) : ''}</em></button>`; }).join('')}</div></section>`;
}
document.addEventListener('click', e => { const b = e.target.closest?.('[data-cal]'); if (!b || !C || b.closest('.sheet')) return; calSheet(b.dataset.cal); });
document.addEventListener('dragstart', e => { const b = e.target.closest?.('[data-cal][draggable="true"]'); if (!b) return; e.dataTransfer.setData('text/x-cal', b.dataset.cal); e.dataTransfer.effectAllowed = 'move'; });
document.addEventListener('dragover', e => { const d = e.target.closest?.('[data-calday]'); if (d && [...(e.dataTransfer?.types || [])].includes('text/x-cal')) { e.preventDefault(); d.classList.add('drop'); } });
document.addEventListener('dragleave', e => { e.target.closest?.('[data-calday]')?.classList.remove('drop'); });
document.addEventListener('drop', e => { const d = e.target.closest?.('[data-calday]'); if (!d) return; const id = e.dataTransfer.getData('text/x-cal'); if (!id) return; e.preventDefault(); d.classList.remove('drop'); const ev = L.calMap?.[id]; if (ev && ev.date !== d.dataset.calday) calMove(ev, d.dataset.calday); });

/* ---------- Life: an overview and an analysis per group (Mind, Body, Plans, Wishlists) ----------
   Analyses look back over a period (7 days, 30 days, 3 months or a year; 30 days to start) and compare it with the
   period before. Trends as small charts, streaks and rhythm per weekday, and plain-language links between things
   ("after 7+ hours of sleep your mood is ..."). Charts use one colour per series and always carry a label. */
const ANA_P = [[7, '7 dagen'], [30, '30 dagen'], [91, '3 maanden'], [365, 'Jaar']];
const anaDays = () => { let n = 30; try { n = +localStorage.getItem('anaPeriod') || 30; } catch {} return ANA_P.some(p => p[0] === n) ? n : 30; };
const dayList = (n, end = today()) => Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));
const avgOf = l => { const v = l.filter(x => x != null && !isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const r1 = v => v == null ? null : Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
const MOOD_V = { Down: 1, Gestrest: 2, Rustig: 3, Blij: 4 }, ENERGY_V = { Laag: 1, 'Oké': 2, Goed: 3, Top: 4 }, JMOOD_V = { Bad: 1, Low: 1.5, Okay: 2.5, Good: 3.5, Great: 4 };
const moodOn = d => { const n = nlOn(d); if (n?.mood && MOOD_V[n.mood]) return MOOD_V[n.mood]; const j = recs('journal').find(x => x.date === d && JMOOD_V[x.mood]); return j ? JMOOD_V[j.mood] : null; };
const energyOn = d => ENERGY_V[nlOn(d)?.energy] ?? null;
const sleepOn = d => num(recs('sleep').find(x => x.date === d)?.hours);
const stepsOn = d => num(nlOn(d)?.steps);
const workedOut = d => recs('workouts').some(w => w.date === d && w.done);
const SKIN_V = { None: 4, 'A little': 3, Some: 2, 'A lot': 1 };
const skinOn = d => { const l = recs('skinlog').find(x => x.date === d); if (!l) return null; return avgOf(SKIN_SCORES.map(([k]) => SKIN_V[l[k]])); };
// compare this period with the one before: "+12% vs vorige periode"
function delta(cur, prev, unit = '', better = 1) {
  if (cur == null || prev == null || prev === 0) return '';
  const d = cur - prev, pct = Math.round(d / Math.abs(prev) * 100);
  if (!pct) return '<span class="adelta">gelijk aan vorige periode</span>';
  return `<span class="adelta ${d * better > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs vorige periode</span>`;
}
const aTile = (k, v, sub) => `<div class="tile"><div class="k">${esc(k)}</div><div class="v">${v}</div><div class="h">${sub || ''}</div></div>`;
// a small line chart: one series, points, a dashed average line, a title per point for hover
function aLine(days, vals, { label, unit = '', max } = {}) {
  const pts = vals.map((v, i) => [i, v]).filter(p => p[1] != null);
  if (pts.length < 2) return quiet('Nog te weinig gegevens voor een grafiek.');
  const W = 420, H = 150, pad = 24, hi = max ?? Math.max(...pts.map(p => p[1])) * 1.15, lo = 0, x = i => pad + i * (W - pad * 2) / Math.max(1, days.length - 1), y = v => H - pad - (v - lo) / (hi - lo || 1) * (H - pad * 2);
  const a = avgOf(pts.map(p => p[1]));
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ');
  const ticks = [0, Math.floor((days.length - 1) / 2), days.length - 1];
  return `<svg class="achart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><line class="agrid" x1="${pad}" x2="${W - pad}" y1="${y(a)}" y2="${y(a)}"/><text class="atick aavg" x="${pad}" y="12">gemiddeld ${r1(a).toLocaleString('nl-NL')}${esc(unit)} (stippellijn)</text><path class="aline" d="${path}"/>${pts.map(p => `<circle class="adot" cx="${x(p[0])}" cy="${y(p[1])}" r="${days.length > 60 ? 2 : 3.5}"><title>${esc(calDayLabel(days[p[0]]))}: ${r1(p[1])}${esc(unit)}</title></circle>`).join('')}${ticks.map(i => `<text class="atick" x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle'}">${esc(calDayLabel(days[i]))}</text>`).join('')}</svg>`;
}
// bars with a value on top: weekdays, weeks, categories
function aBars(items, { unit = '' } = {}) {
  if (!items.length || items.every(x => !x[1])) return quiet('Nog niets om te tonen.');
  const mx = Math.max(...items.map(x => x[1] || 0)) || 1;
  return `<div class="abars">${items.map(([l, v]) => `<div class="abar" title="${esc(l)}: ${r1(v) ?? 0}${esc(unit)}"><span class="abv">${v ? r1(v) : ''}</span><i style="height:${Math.round((v || 0) / mx * 100)}%"></i><span class="abl">${esc(l)}</span></div>`).join('')}</div>`;
}
const WD_NL = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const byWeekday = (days, val) => WD_NL.map((w, i) => [w, avgOf(days.filter(d => (fromISO(d).getDay() + 6) % 7 === i).map(val))]);
const byWeek = (days, val) => { const m = new Map(); for (const d of days) { const k = weekMon(d); m.set(k, (m.get(k) || 0) + (val(d) || 0)); } return [...m.entries()].map(([k, v]) => [calDayLabel(k).replace(/^\w+ /, ''), v]); };
// "after X your Y is ..." as a sentence, only when there is enough data on both sides
function link(days, cond, val, a, b, fmt = v => r1(v)) {
  const yes = days.filter(d => cond(d) === true).map(val).filter(v => v != null), no = days.filter(d => cond(d) === false).map(val).filter(v => v != null);
  if (yes.length < 3 || no.length < 3) return '';
  const ay = avgOf(yes), an = avgOf(no); return `<li><b>${esc(a)}</b>: ${fmt(ay)} tegenover ${fmt(an)} ${esc(b)}.</li>`;
}
const longest = days => { let best = 0, cur = 0; for (const ok of days) { cur = ok ? cur + 1 : 0; best = Math.max(best, cur); } return best; };
function anaHead(title, sub) {
  const n = anaDays();
  return `<div class="viewhead"><h1>${esc(title)}</h1><span class="sub">${esc(sub)}</span></div><div class="seg anaper" role="group" aria-label="Periode">${ANA_P.map(([k, l]) => `<button data-act="anaper" data-v="${k}" aria-pressed="${n === k}">${l}</button>`).join('')}</div>`;
}
const STOPW = new Set('de het een en van in op te dat die is was ik je mijn met voor niet maar ook als bij aan er zo nog wel dan om naar uit heb had heel echt even gewoon want omdat over door this that with have just were what when they them from your about would there their been very really'.split(' '));
/* Mind */
function mindAnalysis(host) {
  const n = anaDays(), days = dayList(n), prev = dayList(n, addDays(days[0], -1));
  const mood = days.map(moodOn), energy = days.map(energyOn), pm = avgOf(prev.map(moodOn)), pe = avgOf(prev.map(energyOn));
  const hs = recs('habits').filter(h => !h.paused), sched = (h, d) => !(h.onDays || []).length || h.onDays.includes(wdOf(d));
  const habitRows = hs.map(h => { const due = days.filter(d => sched(h, d) && d <= today()), done = due.filter(d => daysSet(h).has(d)); return { h, pct: due.length ? Math.round(done.length / due.length * 100) : 0, streak: longest(days.map(d => daysSet(h).has(d))), best: byWeekday(due, d => daysSet(h).has(d) ? 1 : 0).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0]?.[0] }; }).sort((a, b) => b.pct - a.pct);
  const allPct = avgOf(habitRows.map(x => x.pct)), prevPct = avgOf(hs.map(h => { const due = prev.filter(d => sched(h, d)); return due.length ? due.filter(d => daysSet(h).has(d)).length / due.length * 100 : null; }));
  const jr = recs('journal').filter(j => j.date >= days[0] && j.date <= days[n - 1]), jp = recs('journal').filter(j => j.date >= prev[0] && j.date <= prev[n - 1]);
  const med = recs('meditation').filter(m => m.date >= days[0] && m.date <= days[n - 1]), mins = med.reduce((a, m) => a + (num(m.minutes) || 0), 0);
  const words = new Map(); for (const j of jr) for (const w of String([j.title, j.entry, j.grateful].join(' ')).toLowerCase().match(/[a-zà-ÿ]{4,}/g) || []) if (!STOPW.has(w)) words.set(w, (words.get(w) || 0) + 1);
  const topWords = [...words.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const goals = recs('lgoals').filter(g => g.status !== 'Completed'), behind = goals.filter(g => g.due && g.due <= addDays(today(), 30) && goalPct(g) < 70);
  const links = [link(days, d => sleepOn(d) == null ? null : sleepOn(d) >= 7, moodOn, 'Stemming na 7+ uur slaap', 'na minder slaap'), link(days, d => workedOut(d), moodOn, 'Stemming op trainingsdagen', 'op andere dagen'), link(days, d => recs('journal').some(j => j.date === d), moodOn, 'Stemming op dagen dat je schreef', 'op andere dagen'), link(days, d => med.some(m => m.date === d), energyOn, 'Energie op dagen met meditatie', 'zonder')].join('');
  host.innerHTML = `${anaHead('Mind · analyse', `${calDayLabel(days[0])} tot vandaag`)}
  <div class="tiles">${aTile('Stemming', avgOf(mood) != null ? r1(avgOf(mood)) + '/4' : '–', delta(avgOf(mood), pm))}${aTile('Energie', avgOf(energy) != null ? r1(avgOf(energy)) + '/4' : '–', delta(avgOf(energy), pe))}${aTile('Routines gelukt', allPct != null ? Math.round(allPct) + '%' : '–', delta(allPct, prevPct))}${aTile('Journal', String(jr.length), delta(jr.length, jp.length) || 'entries')}</div>
  <div class="panels">
    ${panel('Stemming per dag', aLine(days, mood, { label: 'Stemming', unit: '/4', max: 4.4 }) + `<p class="lnone">Uit je check-in op Body (Hoe voel je je?) en je journal.</p>`)}
    ${panel('Energie per dag', aLine(days, energy, { label: 'Energie', unit: '/4', max: 4.4 }))}
    ${panel('Stemming per weekdag', aBars(byWeekday(days, moodOn), { unit: '/4' }))}
    ${panel('Routines en gewoontes', habitRows.length ? `<div class="lrows">${habitRows.map(x => `<div class="lrow"><span class="lmain"><b>${esc(x.h.name)}</b><span>langste reeks ${plural(x.streak, 'dag', 'dagen')}${x.best ? ' · beste dag ' + x.best : ''}</span></span><span class="abarh"><i style="width:${x.pct}%"></i></span><b class="lside">${x.pct}%</b></div>`).join('')}</div>` : quiet('Nog geen gewoontes. Voeg ze toe onder Mind › Routines.'), ['care/habits', 'Routines'])}
    ${panel('Verbanden', links ? `<ul class="alinks">${links}</ul><p class="lnone">Gemiddelden over deze periode, geen oorzaak en gevolg.</p>` : quiet('Nog te weinig dagen met stemming en slaap om iets te zeggen. Vul een paar weken je check-in in.'))}
    ${panel('Doelen', goals.length ? `<div class="lrows">${goals.slice(0, 8).map(g => `<div class="lrow"><span class="lmain"><b>${esc(g.name || 'Doel')}</b><span>${esc([g.area, g.due ? 'deadline ' + shortDate(g.due) : ''].filter(Boolean).join(' · '))}</span></span><span class="abarh"><i style="width:${goalPct(g)}%"></i></span><b class="lside">${goalPct(g)}%</b></div>`).join('')}</div>${behind.length ? `<p class="lnone">Loopt achter: ${esc(behind.map(g => g.name).join(', '))}.</p>` : ''}` : quiet('Nog geen doelen.'), ['plan/today', 'My year'])}
    ${panel('Journal en mindfulness', `<p class="dline"><span>Entries</span><b>${jr.length}</b></p><p class="dline"><span>Meditatie</span><b>${plural(med.length, 'keer', 'keer')} · ${mins} min</b></p>${topWords.length ? `<p class="dsub">Woorden die vaak terugkomen</p><div class="lwrap">${topWords.map(([w, c]) => `<span class="chip">${esc(w)} <span class="n">${c}</span></span>`).join('')}</div>` : ''}`)}
  </div>`;
}
/* Body */
function bodyAnalysis(host) {
  const n = anaDays(), days = dayList(n), prev = dayList(n, addDays(days[0], -1));
  const sl = days.map(sleepOn), st = days.map(stepsOn), wo = days.filter(workedOut).length, wop = prev.filter(workedOut).length;
  const cs = cleanStats(), cleanDays = cs.start && !cs.before ? days.filter(d => d >= cs.start && !cs.logs.some(l => l.type === 'Gebruikt' && l.date === d)).length : null;
  const wtypes = new Map(); for (const w of recs('workouts').filter(w => w.done && w.date >= days[0])) wtypes.set(w.type || 'Overig', (wtypes.get(w.type || 'Overig') || 0) + 1);
  const bodyRows = recs('body').filter(b => b.date && num(b.weight) != null).sort((a, b) => a.date.localeCompare(b.date)), bw = days.map(d => num(bodyRows.find(b => b.date === d)?.weight));
  const prs = new Map(); for (const s of recs('sets')) { const k = s.exercise ? titleOf(L.byId[s.exercise] || {}) : ''; if (!k || num(s.weight) == null) continue; if (!prs.has(k) || num(s.weight) > prs.get(k).w) prs.set(k, { w: num(s.weight), d: s.date }); }
  const cy = cycleStats(), phaseOf = d => { if (!cy.last) return null; const day = ((diffDays(cy.last, d) % cy.avg) + cy.avg) % cy.avg + 1; return day <= 5 ? 'Menstruatie' : day <= 13 ? 'Folliculair' : day <= 16 ? 'Ovulatie' : 'Luteaal'; };
  const phases = ['Menstruatie', 'Folliculair', 'Ovulatie', 'Luteaal'].map(p => { const ds = days.filter(d => phaseOf(d) === p); return [p, avgOf(ds.map(moodOn)), avgOf(ds.map(energyOn)), avgOf(ds.map(skinOn))]; });
  const veg = avgOf(days.map(d => num(nlOn(d)?.veg))), soda = avgOf(days.map(d => num(nlOn(d)?.soda))), water = avgOf(days.map(d => num(waterOn(d)?.glasses)));
  const links = [link(days, d => sleepOn(d) == null ? null : sleepOn(d) >= 7, energyOn, 'Energie na 7+ uur slaap', 'na minder slaap'), link(days, workedOut, d => sleepOn(addDays(d, 1)), 'Slaap na een trainingsdag', 'na andere dagen', v => r1(v) + ' uur'), link(days, d => stepsOn(d) == null ? null : stepsOn(d) >= 8000, moodOn, 'Stemming op dagen met 8.000+ stappen', 'op andere dagen')].join('');
  host.innerHTML = `${anaHead('Body · analyse', `${calDayLabel(days[0])} tot vandaag`)}
  <div class="tiles">${aTile('Slaap', avgOf(sl) != null ? r1(avgOf(sl)) + ' uur' : '–', delta(avgOf(sl), avgOf(prev.map(sleepOn))))}${aTile('Stappen', avgOf(st) != null ? Math.round(avgOf(st)).toLocaleString('nl-NL') : '–', delta(avgOf(st), avgOf(prev.map(stepsOn))) || 'gemiddeld per dag')}${aTile('Trainingen', String(wo), delta(wo, wop) || 'gedaan')}${aTile('Clean', cleanDays != null ? `${cleanDays}/${n}` : '–', cs.start && !cs.before ? eur(cs.saved) + ' bespaard' : 'nog geen stopdatum')}</div>
  <div class="panels">
    ${panel('Slaap per nacht', aLine(days, sl, { label: 'Slaap', unit: ' uur', max: 11 }))}
    ${panel('Stappen per dag', aLine(days, st, { label: 'Stappen' }))}
    ${panel('Trainingen per week', aBars(byWeek(days, d => workedOut(d) ? 1 : 0)) + (wtypes.size ? `<div class="lwrap">${[...wtypes.entries()].sort((a, b) => b[1] - a[1]).map(([t, c]) => `<span class="chip">${esc(t)} <span class="n">${c}</span></span>`).join('')}</div>` : ''), ['fit/workouts', 'Workouts'])}
    ${bodyRows.length ? panel('Gewicht', aLine(days, bw, { label: 'Gewicht', unit: ' kg' }), ['fit/body', 'Body']) : ''}
    ${prs.size ? panel("Persoonlijke records", `<div class="lrows">${[...prs.entries()].sort((a, b) => b[1].w - a[1].w).slice(0, 8).map(([k, v]) => `<div class="lrow"><span class="lmain"><b>${esc(k)}</b><span>${esc(v.d ? shortDate(v.d) : '')}</span></span><b class="lside">${r1(v.w)} kg</b></div>`).join('')}</div>`) : ''}
    ${panel('Cyclus, stemming en huid', cy.last ? `<table class="atable"><thead><tr><th>Fase</th><th>Stemming</th><th>Energie</th><th>Huid</th></tr></thead><tbody>${phases.map(([p, m, e, s]) => `<tr><td>${p}</td><td>${m != null ? r1(m) + '/4' : '–'}</td><td>${e != null ? r1(e) + '/4' : '–'}</td><td>${s != null ? r1(s) + '/4' : '–'}</td></tr>`).join('')}</tbody></table><p class="lnone">Huid uit je skin diary: 4 is rustig en helder, 1 is veel puistjes of roodheid.</p>` : quiet('Log je menstruatie onder Health › Cycle, dan zie je hier je fases naast stemming en huid.'), ['care/cycle', 'Cycle'])}
    ${panel('Eten en drinken', `<p class="dline"><span>Groente</span><b>${veg != null ? Math.round(veg) + ' g per dag' : '–'}</b></p><p class="dline"><span>Water</span><b>${water != null ? r1(water) + ' glazen' : '–'}</b></p><p class="dline"><span>Frisdrank en sap</span><b>${soda != null ? r1(soda) + ' glazen' : '–'}</b></p>`, ['kitchen/today', 'Kitchen'])}
    ${panel('Verbanden', links ? `<ul class="alinks">${links}</ul><p class="lnone">Gemiddelden over deze periode, geen oorzaak en gevolg.</p>` : quiet('Nog te weinig gegevens. Met je Apple Health-shortcut en de check-in vult dit zich vanzelf.'))}
  </div>`;
}
/* Plans: overview and analysis */
function plansOverview(host) {
  const t = today(), trips = tripList().filter(tr => tripEnd(tr) >= t).slice(0, 3);
  const bdays = recs('gifts').filter(g => g.date && g.date >= t && g.date <= addDays(t, 60)).sort((a, b) => a.date.localeCompare(b.date));
  const docs = recs('documents').filter(d => d.expires && d.expires <= addDays(t, 90)).sort((a, b) => a.expires.localeCompare(b.expires));
  host.innerHTML = `${head('Plans')}
  <div class="quickacts lifeacts"><button class="chip" data-act="new" data-v="gifts">+ Cadeau of verjaardag</button><button class="chip" data-act="new" data-v="ideas">+ Idee</button><button class="chip" data-act="new" data-v="documents">+ Document</button><button class="chip" data-act="go" data-v="care/trips">+ Trip</button></div>
  <div class="tiles">${aTile('Trips gepland', String(trips.length), trips[0] ? esc(tripName(trips[0])) + ' ' + esc(tripWhen(trips[0])) : 'nog niets')}${aTile('Verjaardagen', String(bdays.length), 'komende 60 dagen')}${aTile('Documenten', String(docs.length), 'verlopen binnen 3 maanden')}${aTile('Ideeën', String(recs('ideas').length), 'om nog te doen')}</div>
  <div class="panels">
    ${panel('Komende trips', trips.length ? `<div class="lrows">${trips.map(tr => `<div class="lrow"><span class="lmain"><b>${esc(tripName(tr))}</b><span>${esc(calDayLabel(tr.start))} · ${esc(tripWhen(tr))}</span></span></div>`).join('')}</div>` : quiet('Geen trips gepland.'), ['care/trips', 'Trips'])}
    ${panel('Verjaardagen en cadeaus', bdays.length ? `<div class="lrows">${bdays.map(g => `<div class="lrow"><button class="lmain" data-act="open" data-id="${g.id}"><b>${esc(g.for || g.name || 'Cadeau')}</b><span>${esc(calDayLabel(g.date))} · ${esc(g.occasion || '')}${g.name ? ' · ' + esc(g.name) : ' · nog geen cadeau'}</span></button></div>`).join('')}</div>` : quiet('Geen verjaardagen in de komende 60 dagen. Zet een datum bij een cadeau.'), ['care/gifts', 'Gifts'])}
    ${docs.length ? panel('Wat aandacht nodig heeft', `<div class="lrows">${docs.map(d => `<div class="lrow"><button class="lmain" data-act="open" data-id="${d.id}"><b>${esc(d.name)}</b><span>verloopt ${esc(shortDate(d.expires))}</span></button></div>`).join('')}</div>`, ['care/docs', 'Documents']) : ''}
  </div>`;
}
function plansAnalysis(host) {
  const n = anaDays(), days = dayList(n), from = days[0], t = today(), inP = d => d && d >= from && d <= t;
  const trips = tripList().filter(tr => inP(tr.start) || inP(tripEnd(tr))), costs = trips.map(tr => [tripName(tr), tripSpent(tr)]);
  const gifts = recs('gifts').filter(g => inP(g.given || g.date)), perP = new Map(), perO = new Map();
  for (const g of gifts) { const p = num(g.price) || 0; perP.set(g.for || 'Onbekend', (perP.get(g.for || 'Onbekend') || 0) + p); perO.set(g.occasion || 'Overig', (perO.get(g.occasion || 'Overig') || 0) + p); }
  const places = new Set(tripList().map(tr => tr.dest?.country || tr.dest?.name).filter(Boolean));
  host.innerHTML = `${anaHead('Plans · analyse', `${calDayLabel(from)} tot vandaag`)}
  <div class="tiles">${aTile('Trips', String(trips.length), eur(costs.reduce((a, c) => a + c[1], 0)) + ' uitgegeven')}${aTile('Plekken', String(places.size), 'landen en steden ooit')}${aTile('Cadeaus', String(gifts.length), eur(gifts.reduce((a, g) => a + (num(g.price) || 0), 0)))}</div>
  <div class="panels">
    ${panel('Kosten per trip', costs.length ? aBars(costs.map(([l, v]) => [l.slice(0, 14), v])) : quiet('Geen trips in deze periode.'), ['care/trips', 'Trips'])}
    ${panel('Cadeaus per persoon', perP.size ? aBars([...perP.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([l, v]) => [l.slice(0, 12), v])) : quiet('Geen cadeaus gegeven in deze periode.'))}
    ${panel('Cadeaus per gelegenheid', perO.size ? `<div class="lrows">${[...perO.entries()].sort((a, b) => b[1] - a[1]).map(([l, v]) => `<div class="lrow"><span class="lmain"><b>${esc(l)}</b></span><b class="lside">${eur(v)}</b></div>`).join('')}</div>` : quiet('Nog niets.'))}
  </div>`;
}
/* Wishlists */
function wishAnalysis(host) {
  const n = anaDays(), days = dayList(n), from = days[0], t = today(), inP = d => d && d >= from && d <= t, upd = r => r.updated ? iso(new Date(r.updated)) : '';
  const ws = recs('wishes'), bought = ws.filter(w => w.status === 'Bought' && inP(w.boughtOn || upd(w))), dropped = ws.filter(w => w.status === 'Dropped' && inP(w.droppedOn || upd(w)));
  const saved = dropped.reduce((a, w) => a + (num(w.price) || 0), 0), spent = bought.reduce((a, w) => a + (num(w.boughtPrice ?? w.price) || 0), 0);
  const waits = bought.map(w => w.since ? diffDays(w.since, w.boughtOn || upd(w)) : null).filter(v => v != null && v >= 0), wait = avgOf(waits);
  const orders = recs('orders').filter(o => inP(o.ordered || o.received || upd(o))), ret = orders.filter(o => o.status === 'Returned'), back = ret.reduce((a, o) => a + (num(o.price) || 0), 0);
  const perShop = new Map(); for (const o of orders) { const s = o.shop || 'Onbekend', e = perShop.get(s) || { n: 0, r: 0 }; e.n++; if (o.status === 'Returned') e.r++; perShop.set(s, e); }
  const cats = new Map(); for (const w of bought) cats.set(w.category || 'Overig', (cats.get(w.category || 'Overig') || 0) + (num(w.boughtPrice ?? w.price) || 0));
  host.innerHTML = `${anaHead('Wishlists · analyse', `${calDayLabel(from)} tot vandaag`)}
  <div class="tiles">${aTile('Gekocht', String(bought.length), eur(spent))}${aTile('Laten gaan', String(dropped.length), eur(saved) + ' bespaard')}${aTile('Wachttijd', wait != null ? Math.round(wait) + ' dagen' : '–', 'gemiddeld voor je kocht')}${aTile('Retour', `${ret.length}/${orders.length}`, eur(back) + ' terug')}</div>
  <div class="panels">
    ${panel('Gekocht tegenover laten gaan', aBars([['Gekocht', bought.length], ['Laten gaan', dropped.length]]))}
    ${panel('Uitgegeven per wishlist', cats.size ? aBars([...cats.entries()].sort((a, b) => b[1] - a[1]).map(([l, v]) => [l, v])) : quiet('Nog niets gekocht in deze periode.'), ['wish/master', 'Wishlists'])}
    ${panel('Bestellingen per winkel', perShop.size ? `<div class="lrows">${[...perShop.entries()].sort((a, b) => b[1].n - a[1].n).map(([s, e]) => `<div class="lrow"><span class="lmain"><b>${esc(s)}</b><span>${plural(e.n, 'bestelling', 'bestellingen')}</span></span><b class="lside">${e.r ? e.r + ' retour' : ''}</b></div>`).join('')}</div>` : quiet('Nog geen bestellingen in deze periode.'), ['wish/orders', 'Orders'])}
  </div>`;
}
/* Kitchen: what you cook and eat, your recipes and how they add up, and the pantry */
function kitchenAnalysis(host) {
  const n = anaDays(), days = dayList(n), from = days[0], t = today(), prev = dayList(n, addDays(from, -1));
  const rs = recs('recipes'), inP = (d, l = days) => d && d >= l[0] && d <= l[l.length - 1];
  const meals = recs('meals').filter(m => inP(m.date) && m.date <= t), pmeals = recs('meals').filter(m => inP(m.date, prev));
  const home = meals.filter(m => !m.away), withR = meals.filter(m => m.recipe && L.byId[m.recipe]), pR = pmeals.filter(m => m.recipe && L.byId[m.recipe]);
  const cookedN = withR.length + rs.filter(r => inP(r.lastCooked) && !withR.some(m => m.recipe === r.id && m.date === r.lastCooked)).length;
  const newR = rs.filter(r => r.created && inP(iso(new Date(r.created)))).length;
  // what a day's planned recipes add up to, per serving
  const nut = new Map(); const nOf = r => { if (!nut.has(r.id)) nut.set(r.id, nutriOf(r)); return nut.get(r.id); };
  const dayKcal = d => { const l = withR.filter(m => m.date === d); if (!l.length) return null; const v = l.map(m => nOf(L.byId[m.recipe])).filter(x => x.counted || x.own); return v.length ? v.reduce((a, x) => a + x.per.kcal, 0) : null; };
  const kcalDays = days.map(dayKcal), kAvg = avgOf(kcalDays);
  const est = rs.map(r => ({ r, n: nOf(r) })).filter(x => (x.n.counted || x.n.own) && x.n.per.kcal > 20);
  const most = new Map(); for (const m of withR) most.set(m.recipe, (most.get(m.recipe) || 0) + 1);
  const top = [...most.entries()].sort((a, b) => b[1] - a[1] || azCmp(titleOf(L.byId[a[0]]), titleOf(L.byId[b[0]]))).slice(0, 8);
  const count = (list, key) => { const m = new Map(); for (const r of list) { const k = r[key] || 'Geen'; m.set(k, (m.get(k) || 0) + 1); } return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const ing = recs('ingredients'), inStock = ing.filter(i => i.stock).length, low = ing.filter(i => i.low).length, soon = ing.filter(useSoon).length, onList = ing.filter(i => i.list).length;
  const quick = rs.filter(r => totalTime(r) > 0 && totalTime(r) <= 30).length, tried = rs.filter(hasCooked).length, totry = rs.filter(r => r.totry).length;
  const protein = est.slice().sort((a, b) => b.n.per.p - a.n.per.p).slice(0, 6), light = est.filter(x => x.n.per.kcal >= 150).sort((a, b) => a.n.per.kcal - b.n.per.kcal).slice(0, 6);
  const rowR = (r, side) => `<div class="lrow"><button class="lmain" data-act="open" data-id="${r.id}"><b>${esc(titleOf(r))}</b><span>${esc(r.category || '')}</span></button><b class="lside">${side}</b></div>`;
  host.innerHTML = `${anaHead('Kitchen · analyse', `${calDayLabel(from)} tot vandaag`)}
  <div class="tiles">${aTile('Gekookt', String(cookedN), delta(withR.length, pR.length))}${aTile('Thuis gegeten', String(home.length), `${plural(meals.length - home.length, 'keer', 'keer')} buiten de deur`)}${aTile('Calorieën per dag', kAvg != null ? Math.round(kAvg) + ' kcal' : '–', 'uit je maaltijdplan, geschat')}${aTile('Recepten', String(rs.length), `${newR} nieuw · ${tried} gekookt · ${totry} nog proberen`)}</div>
  <div class="panels">
    ${panel('Calorieën per dag', aLine(days, kcalDays, { label: 'Calorieën', unit: ' kcal' }) + '<p class="lnone">Per portie van de recepten in je maaltijdplan. Maaltijden zonder recept tellen niet mee.</p>', ['kitchen/meals', 'Meal plan'])}
    ${panel('Maaltijden per weekdag', aBars(WD_NL.map((w, i) => [w, meals.filter(m => (fromISO(m.date).getDay() + 6) % 7 === i).length])))}
    ${panel('Meest gekookt', top.length ? `<div class="lrows">${top.map(([id, c]) => rowR(L.byId[id], plural(c, 'keer', 'keer'))).join('')}</div>` : quiet('Zet recepten in je maaltijdplan of tik op "I made this", dan verschijnen ze hier.'))}
    ${panel('Recepten per categorie', aBars(count(rs, 'category').slice(0, 10)), ['kitchen/recipes', 'Recipes'])}
    ${panel('Recepten per keuken', aBars(count(rs.filter(r => r.cuisine), 'cuisine').slice(0, 8)))}
    ${panel('Voeding van je recepten', est.length ? `<p class="dline"><span>Gemiddeld per portie</span><b>${Math.round(avgOf(est.map(x => x.n.per.kcal)))} kcal</b></p><p class="dline"><span>Eiwit per portie</span><b>${r1(avgOf(est.map(x => x.n.per.p)))} g</b></p><p class="dline"><span>Met een schatting</span><b>${est.length} van ${rs.length}</b></p><p class="dline"><span>Klaar in 30 minuten of minder</span><b>${quick}</b></p>` : quiet('Vul hoeveelheden in bij je ingrediënten, dan rekent de app dit uit.'))}
    ${panel('Meeste eiwit per portie', protein.length ? `<div class="lrows">${protein.map(x => rowR(x.r, Math.round(x.n.per.p) + ' g')).join('')}</div>` : quiet('Nog geen schattingen.'))}
    ${panel('Lichtste maaltijden', light.length ? `<div class="lrows">${light.map(x => rowR(x.r, Math.round(x.n.per.kcal) + ' kcal')).join('')}</div>` : quiet('Nog geen schattingen.'))}
    ${panel('Voorraad', `<p class="dline"><span>Op voorraad</span><b>${inStock} van ${ing.length}</b></p><p class="dline"><span>Bijna op</span><b>${low}</b></p><p class="dline"><span>Snel opmaken</span><b>${soon}</b></p><p class="dline"><span>Op je boodschappenlijst</span><b>${onList}</b></p>`, ['kitchen/pantry', 'Pantry'])}
  </div>`;
}
/* Mind overview */
function mindOverview(host) {
  const t = today(), nl = nlOn(t) || {}, hs = recs('habits').filter(h => !h.paused && (!(h.onDays || []).length || h.onDays.includes(wdOf(t)))), done = hs.filter(h => daysSet(h).has(t));
  const jToday = recs('journal').some(j => j.date === t), goals = recs('lgoals').filter(g => g.status !== 'Completed'), behind = goals.filter(g => g.due && g.due <= addDays(t, 30) && goalPct(g) < 70);
  const days7 = dayList(7), mood7 = avgOf(days7.map(moodOn));
  const chip = (k, v) => `<button class="chip ${nl[k] === v ? 'on' : ''}" data-act="nlset" data-v="${k}" data-d="${v}" aria-pressed="${nl[k] === v}">${v}</button>`;
  host.innerHTML = `${head('Mind')}
  <div class="quickacts lifeacts"><button class="chip" data-act="new" data-v="journal">+ Journal</button><button class="chip" data-act="new" data-v="meditation">+ Meditatie</button><button class="chip" data-act="new" data-v="lgoals">+ Doel</button><button class="chip" data-act="go" data-v="care/vision">Vision</button></div>
  <div class="tiles">${aTile('Routines vandaag', `${done.length}/${hs.length}`, hs.length ? 'gedaan' : 'geen voor vandaag')}${aTile('Stemming', mood7 != null ? r1(mood7) + '/4' : '–', 'laatste 7 dagen')}${aTile('Journal', jToday ? 'Geschreven' : 'Nog niet', 'vandaag')}${aTile('Doelen', String(goals.length), behind.length ? behind.length + ' lopen achter' : 'actief')}</div>
  <div class="panels">
    ${panel('Hoe voel je je?', `<p class="dsub">Stemming</p><div class="lwrap">${['Down', 'Gestrest', 'Rustig', 'Blij'].map(v => chip('mood', v)).join('')}</div><p class="dsub">Energie</p><div class="lwrap">${['Laag', 'Oké', 'Goed', 'Top'].map(v => chip('energy', v)).join('')}</div>`)}
    ${panel('Routines vandaag', hs.length ? `<div class="lwrap">${hs.map(h => `<button class="chip ${daysSet(h).has(t) ? 'on' : ''}" data-act="hday" data-id="${h.id}" data-d="${t}" aria-pressed="${daysSet(h).has(t)}">${esc(h.name)}</button>`).join('')}</div>` : quiet('Geen routines voor vandaag.'), ['care/habits', 'Routines'])}
    ${panel('Wat aandacht nodig heeft', `${!jToday ? '<p class="dline"><span>Journal</span><b>Nog niet geschreven vandaag</b></p>' : ''}${behind.map(g => `<p class="dline"><span>${esc(g.name)}</span><b>${goalPct(g)}% · deadline ${esc(shortDate(g.due))}</b></p>`).join('')}${jToday && !behind.length ? quiet('Alles bij. Mooi zo.') : ''}`)}
    ${panel('Affirmatie', (() => { const p = pnAffirmToday(L.pnShift || 0); if (p) return pnAffirmHTML(); let a = ''; try { a = C.affirmToday?.() || ''; } catch {} return a ? `<p class="lbig">${esc(a)}</p>` : quiet('Geen affirmatie.'); })(), ['care/vision', 'Vision'])}
  </div>`;
}


/* ---------- the calendar in your iPhone: a snapshot for the 'calendar' function, and the subscribe links ---------- */
async function calFeedSync(force) {
  if (!C?.uid() || L.status !== 'ok' || !C.prefs().calToken) return;
  const now = Date.now(); if (!force && L.calFeedAt && now - L.calFeedAt < 10 * 60e3) return;
  L.calFeedAt = now;
  let ev; try { ev = calEvents(addDays(today(), -30), addDays(today(), 120), true); } catch { return; }
  const items = ev.map(e => ({ id: e.id, cat: e.cat, date: e.date, time: e.time || '', title: e.title, sub: e.sub || '', imp: !!e.imp, done: !!e.done }));
  const cur = recs('calfeed')[0];
  if (cur && JSON.stringify(cur.items) === JSON.stringify(items)) return;
  L.batch = true; L.quiet = true;
  try { await put('calfeed', cur?.id || C.uuid(), { items, at: new Date().toISOString() }); } catch {} finally { L.batch = false; L.quiet = false; }
}
setInterval(() => calFeedSync(), 15 * 60e3);
const icalUrl = cat => { const base = C.fnUrl?.('calendar') || ''; return base.replace(/^https?:/, 'webcal:') + `?t=${encodeURIComponent(C.prefs().calToken || '')}&cat=${cat}`; };
function icalPanel() {
  const tok = C.prefs().calToken, feed = recs('calfeed')[0];
  return `<section class="panel setpanel"><h3>Calendar in je iPhone</h3><p class="muted">Elk onderdeel als eigen agenda in je iPhone, met de kleuren van je brandboard. Je iPhone haalt hem elk uur op; de app werkt hem bij als je hem opent.</p>
    ${tok ? `<div class="fset"><div><b>Je sleutel</b><span>Zet deze in Supabase als secret CAL_TOKEN.</span></div><button class="btn small" data-act="icalcopy" data-v="${esc(tok)}">Kopieer sleutel</button></div>
      <div class="lrows">${[...CAL_CATS, ['all', 'Alles samen']].map(([k, l]) => `<div class="lrow"><span class="lmain"><b>${k === 'all' ? '' : `<span class="caldot cal-${k}"></span> `}${esc(l)}</b></span><a class="btn small" href="${esc(icalUrl(k))}">Abonneer</a><button class="chip link" data-act="icalcopy" data-v="${esc(icalUrl(k))}">Kopieer link</button></div>`).join('')}</div>
      <p class="lnone">${feed?.at ? 'Laatst bijgewerkt ' + esc(new Date(feed.at).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + ', ' + plural((feed.items || []).length, 'item') + '.' : 'Nog niet bijgewerkt.'} <button class="chip link" data-act="icaltest">Test verbinding</button> <button class="chip link" data-act="icalsync">Nu bijwerken</button></p><p class="lnone" data-icalmsg aria-live="polite"> <button class="chip link" data-act="icalnew">Nieuwe sleutel</button></p>`
    : `<p class="lnone">Maak eerst een sleutel. Die blijft privé in je eigen database.</p><button class="btn small primary" data-act="icalnew">Maak sleutel</button>`}</section>`;
}

/* Life › Overview: one look at Mind, Body, Plans and Wishlists (the analyses come per group) */
function lifeOverview(host) {
  const nt = nextTrip(), gifts = recs('gifts').filter(g => g.status !== 'Given'), orders = recs('orders').filter(o => ['Ordered', 'Shipped'].includes(o.status || 'Ordered'));
  const go = (v, l) => `<button class="chip link" data-act="go" data-v="${v}">${esc(l)}</button>`;
  const d30 = dayList(30), mood = avgOf(d30.map(moodOn)), sleep = avgOf(d30.map(sleepOn)), wo = d30.filter(workedOut).length;
  const hs = recs('habits').filter(h => !h.paused), hp = avgOf(hs.map(h => { const due = d30.filter(d => !(h.onDays || []).length || h.onDays.includes(wdOf(d))); return due.length ? due.filter(d => daysSet(h).has(d)).length / due.length * 100 : null; }));
  host.innerHTML = `${head('Life')}
  <div class="tiles lifenums">${aTile('Stemming', mood != null ? r1(mood) + '/4' : '–', '30 dagen')}${aTile('Slaap', sleep != null ? r1(sleep) + ' uur' : '–', 'gemiddeld')}${aTile('Trainingen', String(wo), '30 dagen')}${aTile('Routines', hp != null ? Math.round(hp) + '%' : '–', 'gelukt')}</div>
  <div class="lanalinks">${[['plan/mindstats', 'Mind'], ['body/stats', 'Body'], ['plan/planstats', 'Plans'], ['wish/stats', 'Wishlists'], ['kitchen/stats', 'Kitchen']].map(([v, l]) => `<button class="chip link" data-act="go" data-v="${v}">Analyse ${l}</button>`).join('')}</div>
  <div class="quickacts lifeacts"><button class="chip" data-act="new" data-v="journal">+ Journal</button><button class="chip" data-act="new" data-v="sleep">+ Slaap</button><button class="chip" data-act="new" data-v="workouts">+ Workout</button><button class="chip" data-act="new" data-v="wishes">+ Wens</button></div>
  <div class="panels">
    ${panel('Mind', planTile(), ['plan/today', 'My year'])}
    ${panel('Body', bodyTile() || quiet('Nog niets voor vandaag.'), ['body/today', 'Body'])}
    ${panel('Plans', `${nt ? `<p class="dline"><span>Volgende trip</span><b>${esc(tripName(nt))}</b></p>` : quiet('Geen trip gepland.')}${gifts.length ? `<p class="dline"><span>Cadeau-ideeën</span><b>${gifts.length}</b></p>` : ''}`, ['care/trips', 'Trips'])}
    ${panel('Wishlists', `${typeof wishTile === 'function' ? wishTile() : ''}${orders.length ? `<p class="dline"><span>Onderweg</span><b>${plural(orders.length, 'bestelling', 'bestellingen')}</b></p>` : ''}`, ['wish/today', 'Wishlists'])}
  </div>`;
}

/* Life › My year */
function planToday(host) {
  invMigrate();
  const cs = cleanStats(), wk = weekMon(), days = Array.from({ length: 7 }, (_, k) => addDays(wk, k)).filter(d => d <= today());
  const nls = days.map(d => nlOn(d)), avg = days.length ? Math.round(nls.reduce((n, r, k) => n + nlScore(r, days[k]), 0) / days.length * 10) / 10 : 0;
  const bf = nls.filter(n => [].concat(n?.meals || []).includes('Breakfast')).length;
  const soda = nls.filter(n => num(n?.soda) != null), sodaAvg = soda.length ? Math.round(soda.reduce((a, n) => a + num(n.soda), 0) / soda.length * 10) / 10 : null;
  const sl = recs('sleep').filter(x => x.date >= addDays(today(), -7) && num(x.hours)), sleepAvg = sl.length ? Math.round(sl.reduce((a, x) => a + num(x.hours), 0) / sl.length * 10) / 10 : null;
  const wo = recs('workouts').filter(x => x.date >= wk && x.date <= addDays(wk, 6) && (x.done || x.date < today()) && !x.skipped).length;
  const open = invLive().filter(r => INV_WANT.includes(invStatus(r))), toGo = open.reduce((n, r) => n + (invBudget(r) || 0), 0) + invSum(recs('movecosts').filter(c => !c.paid), 'budget');
  const mg = moveGoal(), saved = num(mg?.saved) || 0, m = moveMonth(), months = Math.max(1, (Number(m.slice(0, 4)) - new Date().getFullYear()) * 12 + Number(m.slice(5, 7)) - (new Date().getMonth() + 1));
  const fixed = fixedMonthly(), buf = goalNamed(/buffer|nood/i), duo = recs('fdebts').find(x => /duo|studie/i.test(x.name || ''));
  let safe = null; try { safe = recs('faccounts').length ? fState().perDay : null; } catch {}
  const posts = recs('posts').filter(p => p.date >= wk && p.date <= addDays(wk, 6) && p.stage !== 'Idea').length, postedW = recs('posts').filter(p => p.date >= wk && p.date <= addDays(wk, 6) && p.stage === 'Posted').length;
  const mo = today().slice(0, 7), inc = recs('deals').filter(x => x.status === 'Paid' && String(x.payBy || x.postBy || '').startsWith(mo)).reduce((n, x) => n + (num(x.fee) || 0), 0) + recs('ltk').filter(x => x.month === mo).reduce((n, x) => n + (num(x.amount) || 0), 0);
  const fol = recs('accounts').filter(a => a.active !== false).reduce((n, a) => n + (num(a.followers) || 0), 0);
  const card = (title, icon, lines, links, bar) => `<section class="panel lpanel ygoal"><div class="lph3"><h3>${svg(icon)} ${esc(title)}</h3></div>${bar != null ? `<div class="dbar"><i style="width:${Math.max(0, Math.min(100, bar))}%"></i></div>` : ''}<div class="ylines">${lines.filter(Boolean).map(([k, v]) => `<p class="dline"><span>${esc(k)}</span><b>${esc(v)}</b></p>`).join('')}</div><div class="lwrap">${links.map(([l, v]) => `<button class="chip link" data-act="go" data-v="${v}">${esc(l)}</button>`).join('')}</div></section>`;
  host.innerHTML = `${head('My year')}${intentNow()?.text ? `<p class="tintent"><span>Focus deze week</span><b>${esc(intentNow().text)}</b></p>` : ''}
  <div class="panels ygoals">
    ${card('Uit huis, zomer 2027', P.house, [['Nog nodig', fEur0(toGo)], ['Gespaard', fEur0(saved)], ['Per maand sparen', fEur0(Math.max(0, toGo - saved) / months)], ['Nog', plural(months, 'maand', 'maanden')]], [['Verhuislijst', 'home/inventory'], ['Analyse', 'home/inventory'], ['Spaardoelen', 'money/plan']], toGo + saved ? 100 * saved / (toGo + saved) : 0)}
    ${card('Gezonder leven', P.leaf, [['Dagcheck deze week', `${avg} van ${NL_MAX} per dag`], ['Ontbijt gegeten', `${bf} van ${days.length} dagen`], sodaAvg != null ? ['Frisdrank en sap', `${sodaAvg} glazen per dag`] : null, ['Clean', cs.start ? (cs.before ? `stopdatum ${shortDate(cs.start)}` : `${plural(cs.streak, 'dag', 'dagen')} · ${eur(cs.saved)} bespaard`) : 'nog geen stopdatum'], sleepAvg != null ? ['Slaap', `${sleepAvg} uur gemiddeld`] : null, ['Trainingen', `${wo} van 3 deze week`]], [['Eten', 'kitchen/today'], ['Clean', 'body/clean'], ['Body', 'body/today']], null)}
    ${card('Financieel stabiel', P.wallet, [safe != null ? ['Vandaag te besteden', fSigned(safe)] : null, ['Vaste lasten per maand', fEur0(fixed)], ['Buffer (1 maand)', buf ? `${fEur0(num(buf.saved) || 0)} van ${fEur0(num(buf.target) || fixed)}` : 'nog geen buffer-doel'], duo ? ['Studieschuld', fEur0(num(duo.balance) || 0)] : null], [['Finance', 'money/today'], ['Doelen', 'money/plan'], ...(buf ? [] : [['Maak buffer-doel', 'act:buffer']])], buf && num(buf.target) ? 100 * (num(buf.saved) || 0) / num(buf.target) : null)}
    ${card('Groeien met content', P.phone, [['Posts deze week', `${postedW} geplaatst · ${posts} gepland (doel 3)`], fol ? ['Volgers', fol.toLocaleString('nl-NL')] : null, ['Inkomsten deze maand', fEur0(inc)]], [['Planning', 'social/plan'], ['Insights', 'social/insights'], ['Inkomsten', 'social/income']], Math.min(100, 100 * postedW / 3))}
  </div>`;
  host.querySelectorAll('[data-v^="act:"]').forEach(b => { b.dataset.act = b.dataset.v.slice(4); delete b.dataset.v; });
}
async function bufferGoal() {
  const f = Math.round(fixedMonthly()); if (!f) return C.toast('Zet eerst je vaste lasten bij Finance › Repeats');
  try { await create('fgoals', { name: 'Buffer', target: f, saved: 0, notes: '1 maand vaste lasten' }); C.toast(`Buffer-doel van ${eur(f)} staat in Finance`); } catch { C.toast('Opslaan lukte niet.'); }
}
/* Life › Week: the Sunday reset */
const RESET = [['prep', 'Mealprep voor de week', 'kitchen/deals'], ['laundry', 'Was (als de mand vol is)', ''], ['tidy', 'Opruimen en klusjes van de week', 'home/chores'], ['fridge', 'Koelkast en vriezer checken', 'kitchen/pantry'], ['outfits', 'Outfits voor de week plannen', 'calendar'], ['train', 'Trainingen inplannen (3)', 'fit/library'], ['content', 'Content voor de week plannen', 'social/plan'], ['away', 'Avonden dat je niet kookt', 'kitchen/deals'], ['money', 'Geld checken en overmaken', 'money/today']];
function planWeek(host) {
  const wk = weekMon(), last = Array.from({ length: 7 }, (_, k) => addDays(wk, k - (new Date().getDay() === 0 ? 0 : 7)));
  const [a, b] = [last[0], last[6]], inR = d => d >= a && d <= b;
  const nls = last.map(d => nlOn(d)), score = Math.round(nls.reduce((n, r, k) => n + nlScore(r, last[k]), 0) / 7 * 10) / 10;
  const sl = recs('sleep').filter(x => inR(x.date) && num(x.hours)), sleepAvg = sl.length ? Math.round(sl.reduce((s, x) => s + num(x.hours), 0) / sl.length * 10) / 10 : null;
  const wo = recs('workouts').filter(x => inR(x.date) && x.done).length, posted = recs('posts').filter(p => inR(p.date) && p.stage === 'Posted').length;
  const spent = fSum(recs('ftx').filter(x => inR(x.date) && !x.bill && !x.transfer && !x.debt)), bought = recs('inventory').filter(r => inR(r.bought) && invStatus(r) === 'Gekocht').length;
  const cs = cleanStats(), cl = cs.start && !cs.before ? last.filter(d => d >= cs.start && !cs.logs.some(l => l.type === 'Gebruikt' && l.date === d)).length : null;
  const key = 'reset:' + weekMon(addDays(today(), new Date().getDay() === 0 ? 1 : 0)); let done = new Set(); try { done = new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch {}
  const it = C.prefs().intent || {};
  host.innerHTML = `${head('Week')}
  <div class="tiles">${fTile('Dagcheck', `${score}/${NL_MAX}`, 'gemiddeld per dag')}${fTile('Slaap', sleepAvg != null ? sleepAvg + ' uur' : '–', 'gemiddeld')}${fTile('Trainingen', String(wo), 'gedaan')}${cl != null ? fTile('Clean', `${cl}/7`, 'dagen') : fTile('Posts', String(posted), 'geplaatst')}</div>
  <div class="panels">
    ${panel('Terugblik', `<div class="ylines"><p class="dline"><span>Uitgegeven</span><b>${eur(spent)}</b></p><p class="dline"><span>Posts geplaatst</span><b>${posted} van 3</b></p><p class="dline"><span>Gekocht voor de verhuizing</span><b>${bought}</b></p>${cs.start && !cs.before ? `<p class="dline"><span>Rookgeld deze week</span><b>${eur(cs.weekSaved)}</b></p>` : ''}</div>
      ${cs.start && !cs.before && cs.weekSaved ? `<button class="btn small primary" data-act="cleanmove">${eur(cs.weekSaved)} naar Verhuizen</button>` : ''}`)}
    ${panel('Focus voor volgende week', `<input class="finp" data-intent value="${esc(it.text || '')}" placeholder="Bijv. elke dag ontbijten" aria-label="Focus voor de week"><p class="lnone">Je focus staat de hele week bovenaan Today.</p>`)}
    ${panel('Zondag reset', `<div class="lrows">${RESET.map(([k, l, go]) => `<label class="lrow dpick ${done.has(k) ? 'gone' : ''}"><input type="checkbox" data-reset="${key}:${k}" ${done.has(k) ? 'checked' : ''}><span class="lmain"><b>${esc(l)}</b></span>${go ? `<button class="chip link" data-act="go" data-v="${go}">Open</button>` : ''}</label>`).join('')}</div>`)}
  </div>`;
}
document.addEventListener('change', e => { const c = e.target; if (C && c.matches?.('[data-ltkset]')) { const k = c.dataset.ltkset; C.savePrefs({ [k]: k === 'contentTax' ? num(c.value) : c.value.trim() }).then(() => C.toast('Saved')).catch(() => {}); } });
document.addEventListener('change', e => { const c = e.target; if (!C || !c.matches?.('[data-reset]')) return; const [, wk, k] = c.dataset.reset.split(':'), key = 'reset:' + wk; let s = new Set(); try { s = new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch {} c.checked ? s.add(k) : s.delete(k); try { localStorage.setItem(key, JSON.stringify([...s])); } catch {} c.closest('.lrow')?.classList.toggle('gone', c.checked); });

/* Life › Body */
const PHASES = d => d <= 5 ? ['Menstruatie', 'Rustig aan: wandelen, stretchen, yoga. IJzerrijk eten helpt (rood vlees, spinazie, ei).'] : d <= 13 ? ['Folliculaire fase', 'Meestal meer energie: goed moment voor zware krachttraining.'] : d <= 16 ? ['Ovulatie', 'Vaak je sterkste dagen. Let op je warming-up.'] : ['Luteale fase', 'Energie kan zakken. Matige training, extra tussendoortje, let op je huid.'];
function bodyToday(host) {
  const t = today(), cs = cleanStats(), cy = cycleStats(), nl = nlOn(t) || {};
  const sl = recs('sleep').filter(x => x.date).sort((a, b) => b.date.localeCompare(a.date))[0], slept = sl?.date === t ? sl : null;
  const wk = weekMon(), wo = recs('workouts').filter(x => x.date >= wk && x.date <= addDays(wk, 6) && !x.skipped), done = wo.filter(x => x.done).length;
  const ph = cy.last ? PHASES(((cy.day - 1) % cy.avg) + 1) : null, poor = slept && (['Poor', 'Fair'].includes(slept.quality) || num(slept.hours) < 6.5);
  const moodChip = (k, v) => `<button class="chip ${nl[k] === v ? 'on' : ''}" data-act="nlset" data-v="${k}" data-d="${v}" aria-pressed="${nl[k] === v}">${v}</button>`;
  host.innerHTML = `${head('Body')}
  <div class="tiles">${fTile('Slaap', slept ? `${num(slept.hours) || '?'} uur` : '–', slept ? slept.quality || 'vannacht' : 'nog niet ingevuld')}${fTile('Training', `${done} van 3`, 'deze week')}${fTile('Clean', cs.start ? (cs.before ? `over ${cs.toGo} d` : `${cs.streak} d`) : '–', cs.start ? eur(cs.saved) + ' bespaard' : 'kies een stopdatum')}${fTile('Cyclus', cy.last ? `dag ${cy.day}` : '–', ph ? ph[0] : 'log je menstruatie')}</div>
  <div class="panels">
    ${panel('Hoe voel je je?', `<p class="dsub">Energie</p><div class="lwrap">${['Laag', 'Oké', 'Goed', 'Top'].map(v => moodChip('energy', v)).join('')}</div><p class="dsub">Stemming</p><div class="lwrap">${['Down', 'Gestrest', 'Rustig', 'Blij'].map(v => moodChip('mood', v)).join('')}</div>`)}
    ${panel('Training vandaag', `${poor ? '<p class="lnone">Je sliep niet zo goed. Kies vandaag iets lichters: wandelen, stretchen of yoga.</p>' : ph ? `<p class="lnone">${esc(ph[1])}</p>` : ''}<p class="lnone">Eet op trainingsdagen een eiwitrijk tussendoortje, zoals ei, kipfilet of kaas.</p>`, ['fit/library', 'Weekplan'])}
    ${panel('Slaap', slept ? `<p class="lbig">${num(slept.hours) || '?'} uur</p><p class="lnone">${esc([slept.quality, slept.wake].filter(Boolean).join(' · '))}</p>` : `<p class="lnone">Hoe sliep je? Vanavond naar bed om ${hm(bedOn(t))}.</p><button class="btn small" data-act="new" data-v="sleep">Vul je nacht in</button>`, ['care/health', 'Alles'])}
    ${cs.start ? panel('Clean', `<p class="lnone">${cs.before ? `Nog ${plural(cs.toGo, 'dag', 'dagen')} tot je stopdatum.` : `${plural(cs.streak, 'dag', 'dagen')} clean, ${eur(cs.saved)} bespaard.`}</p><button class="btn small primary" data-act="crave">Ik heb trek</button>`, ['body/clean', 'Open']) : ''}
  </div>`;
}
/* Social › Income */
function socialIncome(host) {
  const mo = today().slice(0, 7), months = Array.from({ length: 6 }, (_, k) => { const d = fromISO(mo + '-01'); d.setMonth(d.getMonth() - k); return iso(d).slice(0, 7); });
  const coll = m => recs('deals').filter(x => x.status === 'Paid' && String(x.payBy || x.postBy || '').startsWith(m)).reduce((n, x) => n + (num(x.fee) || 0), 0);
  const ltk = m => recs('ltk').filter(x => x.month === m).reduce((n, x) => n + (num(x.amount) || 0), 0);
  const tot = m => coll(m) + ltk(m), tax = Number(C.prefs().contentTax ?? 30);
  const open = recs('deals').filter(x => ['Confirmed', 'Creating', 'Delivered'].includes(x.status) && num(x.fee));
  host.innerHTML = `${head('Income')}
  <div class="tiles">${fTile('Deze maand', fEur0(tot(mo)), `${eur(coll(mo))} collabs · ${eur(ltk(mo))} LTK`)}${fTile('Opzij voor belasting', fEur0(tot(mo) * tax / 100), tax + '% van je inkomsten')}${fTile('Nog te ontvangen', fEur0(open.reduce((n, x) => n + num(x.fee), 0)), plural(open.length, 'collab', 'collabs'))}</div>
  <div class="ltools">${C.prefs().ltk ? `<a class="btn small" href="${esc(C.prefs().ltk)}" target="_blank" rel="noopener">Mijn LTK</a>` : ''}<button class="btn small primary" data-act="new" data-v="ltk">+ LTK-maand</button><button class="btn small" data-act="new" data-v="deals">+ Collab</button><button class="btn small" data-act="incomefin" data-v="${mo}">Zet ${esc(mo)} in Finance</button></div>
  <div class="panels">${panel('Per maand', `<div class="lrows">${months.map(m => `<div class="lrow"><span class="lmain"><b>${esc(fromISO(m + '-01').toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }))}</b><span>${eur(coll(m))} collabs · ${eur(ltk(m))} LTK</span></span><span class="lside">${eur(tot(m))}</span></div>`).join('')}</div>`)}
    ${panel('Factuur en betaling', open.length ? `<div class="lrows">${open.map(row).join('')}</div>` : quiet('Bevestigde collabs met een bedrag komen hier tot ze betaald zijn.'))}</div>`;
}
async function incomeToFinance(mo) {
  const coll = recs('deals').filter(x => x.status === 'Paid' && String(x.payBy || x.postBy || '').startsWith(mo)).reduce((n, x) => n + (num(x.fee) || 0), 0), l = recs('ltk').filter(x => x.month === mo).reduce((n, x) => n + (num(x.amount) || 0), 0), tot = coll + l;
  if (!tot) return C.toast('Nog geen inkomsten deze maand');
  if (recs('fincome').some(x => x.contentMonth === mo)) return C.toast('Deze maand staat al in Finance');
  try { await create('fincome', { name: 'Content ' + mo, amount: Math.round(tot * 100) / 100, date: today(), contentMonth: mo, notes: `Collabs ${eur(coll)}, LTK ${eur(l)}. Zet ${Number(C.prefs().contentTax ?? 30)}% opzij voor de belasting.` }); C.toast(`${eur(tot)} staat bij Money in`); } catch { C.toast('Opslaan lukte niet.'); }
}
function planTile() { const it = intentNow(), l = top3(); return `${it?.text ? `<p class="dline"><span>Focus</span><b>${esc(it.text)}</b></p>` : ''}${l.length ? `<ol class="t3 small">${l.map(x => `<li><span><b>${esc(x.label)}</b></span></li>`).join('')}</ol>` : '<p class="lnone">Niets dringends vandaag.</p>'}`; }
function bodyTile() { const cs = cleanStats(); return (cs.start ? `<p class="dline"><span>Clean</span><b>${cs.before ? 'over ' + plural(cs.toGo, 'dag', 'dagen') : plural(cs.streak, 'dag', 'dagen') + ' · ' + eur(cs.saved)}</b></p>` : '') + careTile() + fitTile(); }

/* ---------- what index.html calls ---------- */
const sectionOf = view => SECTIONS.find(s => s.views.some(v => vkey(s, v) === view)) || SECTIONS.find(s => view.startsWith(s.key + '/')) || ({ care: SECTIONS.find(s => s.key === 'plan'), fit: SECTIONS.find(s => s.key === 'plan'), body: SECTIONS.find(s => s.key === 'plan'), wish: SECTIONS.find(s => s.key === 'plan') })[view.split('/')[0]];
return {
  icons: Object.fromEntries(Object.entries(P).filter(([k]) => !['plus', 'minus', 'left', 'right', 'x', 'check'].includes(k)).map(([k, v]) => [k, G(v)])),
  sections: SECTIONS.map(s => ({ key: s.key, label: s.label, icon: G(s.icon), groups: Object.fromEntries(Object.entries(s.groups || {}).map(([g, [l, ic]]) => [g, [l, G(ic)]])), subs: Object.fromEntries(Object.entries(s.subs || {}).map(([g, o]) => [g, Object.fromEntries(Object.entries(o).map(([k, [l, ic]]) => [k, [l, G(ic)]]))])), views: s.views.map(v => [vkey(s, v), v[1], G(v[2]), v[3] || '', v[4] || '']) })),
  has: view => !!PAGES[view],
  lists: optionLists, fullList: fullOptions, renameIn: renameOption,
  search, openFound, settingsPanels, allShops,
  buyWish: (kind, id) => buyWish(kind, id), wishPanel, wishLine,
  canBuyWish: () => fAccs().length > 0,
  newRecord: kind => KINDS[kind] && openEditor(kind, null),
  chooser: () => openChooser(),
  inboxCount: () => inboxOpen().length,
  // every photo path the lists use, once they loaded fresh from Supabase (null until then)
  records: () => L.all.map(r => ({ id: r.id, kind: r.kind, data: dataOf(r) })),
  photoRefs: () => L.fresh || L.missing ? JSON.stringify(L.all) : null,
  // one small card for the overview page; '' while the lists are still loading or missing
  tileParts: key => TILE_PARTS[key] || [],
  tileOff: key => TILE_OFF[key] || [],
  tile(key) {
    const s = SECTIONS.find(x => x.key === key);
    if (!s?.tile || !C) return '';
    if (L.missing) return `<p class="lnone">Needs one step in Supabase.</p><button class="chip link" data-act="go" data-v="${key}/today">Set it up</button>`;
    if (L.status === 'loading' && !L.all.length) return '<p class="lnone">Loading…</p>';
    if (key !== 'money') return s.tile();
    L.inMoneyTile = true; try { return `<div class="mtileeye">${eyeBtn()}</div>` + s.tile(); } finally { L.inMoneyTile = false; }
  },
  start(bridge) { C = bridge; L.all = []; L.byId = {}; L.missing = false; L.status = cacheLoad() ? 'ok' : 'loading'; subscribe(); setTimeout(() => ttReturn(), 0); return load().catch(e => { console.error(e); if (L.status !== 'ok') L.status = 'offline'; C.render(); }); },
  refresh() { if (C?.uid()) load().catch(() => {}); },
  reload: () => C?.uid() ? load().catch(() => {}) : null,
  localChanged() { try { L.prepDone = JSON.parse(localStorage.getItem('prepDone') || '{}'); } catch {} },
  stop() { channel?.unsubscribe(); channel = null; },
  userName: () => (C && fset()?.name) || '',
  todayTop: () => { try { return todayTop(); } catch (e) { console.error(e); return ''; } },
  hasPinAffirm: () => { try { return !!(C && pnAffirmToday()); } catch { return false; } },
  render(host, view) {
    const cfg = PAGES[view];
    if (!C) { host.dataset.sig = ''; host.innerHTML = `<div class="viewhead"><h1>${esc(cfg.title || sectionOf(view)?.label || '')}</h1><span class="sub">Connecting…</span></div>`; return; }
    if (L.missing) { setupCard(host); return; }
    if (L.status === 'loading' && !L.all.length) { host.dataset.sig = ''; host.innerHTML = `<div class="viewhead"><h1>${esc(cfg.title || sectionOf(view)?.label || '')}</h1><span class="sub">Loading…</span></div>`; return; }
    if (cfg.render) { host.dataset.sig = ''; cfg.render(host); if (view === overviewOf(sectionOf(view)?.key)) layoutOverview(host, view); } else listPage(host, view);
    if (sectionOf(view)?.key === 'money') { const vh = host.querySelector('.viewhead'), old = vh?.querySelector('[data-moneyeye]'); if (old) old.outerHTML = eyeBtn(); else vh?.insertAdjacentHTML('beforeend', eyeBtn()); }
  },
  addLabel(view) {
    const cfg = PAGES[view]; if (!cfg) return 'Add';
    if (cfg.render) return 'Add';
    return 'Add ' + KINDS[curSeg(view).kind].one;
  },
  add(view) {
    const cfg = PAGES[view]; if (!cfg || L.missing) return;
    if (cfg.render) {
      C.sheet({ title: 'Add', body: `<div class="lrows">${cfg.adds.map(k => `<button class="lrow lmain" data-act="new" data-v="${k}"><b>${esc(KINDS[k].one[0].toUpperCase() + KINDS[k].one.slice(1))}</b><span>${esc(KINDS[k].many)}</span></button>`).join('')}</div>` });
      return;
    }
    const seg = curSeg(view);
    const preset = seg.kind === 'ingredients' && seg.key === 'list' ? { list: true } : {};
    openEditor(seg.kind, null, preset);
  }
};
})();
