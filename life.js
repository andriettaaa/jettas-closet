/* Kitchen, Home, Self-care and Fitness: the life planner from Notion, rebuilt next to the closet.
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
const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const eur = n => (n == null || n === '' || isNaN(n)) ? '' : money.format(n);
const num = v => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);
const norm = s => String(s || '').trim().toLowerCase();
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const relDay = s => { const d = diffDays(today(), s); return d === 0 ? 'today' : d === 1 ? 'tomorrow' : d === -1 ? 'yesterday' : d > 1 ? `in ${d} days` : `${-d} days ago`; };
const G = p => `<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</g>`;
const svg = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${G(p)}</svg>`;

/* ---------- icons ---------- */
const P = {
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
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  phone: '<rect x="6.5" y="3" width="11" height="18" rx="2.5"/><path d="M10.5 18h3"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  handshake: '<path d="m3 11 4-4 3 1 3-2 3 1 5 4M3 11l5 5 2-1 2 2 2-1 2 1 4-5M10 8l-3 4 2 1 3-3"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
  star: '<path d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6L12 16.6l-5 2.7.9-5.6-4-4 5.6-.8Z"/>'
};

/* ---------- what each list holds ---------- */
const F = (k, label, type = 'text', o = {}) => ({ k, label, type, ...o });
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const ROOMS = ['Entree', 'Woonkamer', 'Keuken', 'Slaapkamer', 'Badkamer', 'Toilet', 'Wasruimte', 'Balkon', 'Schoonmaak', 'Overig'];
const PRIO = ['Must-have', 'Binnen 3 maanden', 'Handig', 'Kan later'];
const FREQ = { 'Daily': 1, 'Every 2 days': 2, 'Twice a week': 3, 'Weekly': 7, 'Every 2 weeks': 14, 'Monthly': 30, 'Every 3 months': 91, 'Every 6 months': 182, 'Yearly': 365 };
const mins = n => n ? (n >= 60 ? `${Math.floor(n / 60)} h${n % 60 ? ' ' + (n % 60) + ' min' : ''}` : `${n} min`) : '';
const totalTime = r => (num(r.prep) || 0) + (num(r.cook) || 0);
const stars = n => n ? '★'.repeat(n) : '';
const relName = id => { const r = L.byId[id]; return r ? titleOf(r) : ''; };
const relNames = ids => [].concat(ids || []).map(relName).filter(Boolean);

const SOCIAL_PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Pinterest'];
const SOCIAL_STAGES = ['Idea', 'Planned', 'Filming', 'Editing', 'Scheduled', 'Posted'];
const SOCIAL_FORMATS = ['Short Video', 'Long-form Video', 'Carousel', 'Image Post', 'Story', 'Live', 'BTS Video'];
const SOCIAL_STYLES = ['Educational', 'Entertaining', 'Inspirational', 'Relatable', 'Storytelling', 'Behind-the-Scenes', 'Informational'];
const SOCIAL_FUNNEL = ['Awareness', 'Consideration', 'Conversion', 'Loyalty/Advocacy'];
const KINDS = {
  /* kitchen */
  recipes: {
    one: 'recipe', many: 'Recipes', display: 'cards', photo: 'photo', facet: 'category',
    fields: [F('name', 'Name'), F('photo', 'Photo', 'photo'),
      F('category', 'Category', 'select', { options: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Side Dish', 'Appetizer', 'Soup', 'Dessert', 'Baking', 'Drink', 'Sauce & Condiment'] }),
      F('rating', 'Rating', 'rating'), F('fav', 'Favourite', 'check'),
      F('prep', 'Prep time', 'num', { unit: 'min', half: 1 }), F('cook', 'Cook time', 'num', { unit: 'min', half: 1 }),
      F('servings', 'Servings', 'num', { half: 1 }), F('protein', 'Protein', 'text', { half: 1 }),
      F('link', 'Recipe link', 'url'), F('ingredients', 'Ingredients', 'rel', { to: 'ingredients', multi: 1 }),
      F('instructions', 'Instructions', 'long'), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['-rating', 'Best rated'], ['-created', 'Newest'], ['time', 'Quickest']],
    sub: r => [r.category, mins(totalTime(r)), stars(r.rating)].filter(Boolean).join(' · ')
  },
  ingredients: {
    one: 'ingredient', many: 'Pantry', facet: 'category',
    fields: [F('name', 'Name'), F('category', 'Category', 'select', { options: ['Fruits & Veg', 'Fish & Meat', 'Eggs & Dairy', 'Grains & Legumes', 'Bread & Bakery', 'Nuts & Seeds', 'Herbs & Spices', 'Sauces & Oils', 'Tins & Jars', 'Frozen', 'Drinks', 'Snack', 'Confections', 'Supplements', 'Other'] }),
      F('location', 'Kept in', 'select', { options: ['Koelkast', 'Vriezer', 'Voorraadkast', 'Keukenkast', 'Fruitmand', 'Broodtrommel', 'Kelder / Berging', 'Overig'] }),
      F('stock', 'In stock', 'check', { half: 1 }), F('list', 'On grocery list', 'check', { half: 1 }),
      F('qty', 'Amount', 'text', { half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['category', 'Category'], ['location', 'Where it is']],
    filters: [['all', 'All'], ['in', 'In stock'], ['out', 'Out of stock']],
    filter: (r, f) => f === 'in' ? !!r.stock : f === 'out' ? !r.stock : true,
    sub: r => [r.category, r.location, r.list ? 'on grocery list' : ''].filter(Boolean).join(' · '),
    quick: r => ({ on: !!r.stock, label: 'In stock', act: () => save(r, { stock: !r.stock }) })
  },
  meals: {
    one: 'meal', many: 'Meals',
    fields: [F('date', 'Date', 'date', { half: 1 }), F('slot', 'Meal', 'select', { options: MEALS, half: 1 }),
      F('recipe', 'Recipe', 'rel', { to: 'recipes' }), F('what', 'Or just write what you eat'), F('notes', 'Notes', 'long')],
    title: r => relName(r.recipe) || r.what || r.slot || 'Meal',
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
    fields: [F('name', 'Name'), F('category', 'Category', 'select', { options: ['Kitchen Appliances', 'Cookware & Bakeware', 'Prep Tools & Essentials', 'Cooking Tools & Utensils', 'Organizing Essentials', 'Cleaning Supplies'] }),
      F('own', 'I have this', 'check'), F('price', 'Price', 'money', { half: 1 }), F('bought', 'Bought on', 'date', { half: 1 }),
      F('url', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['category', 'Category']],
    filters: [['all', 'All'], ['own', 'I have'], ['want', 'Wishlist']],
    filter: (r, f) => f === 'own' ? !!r.own : f === 'want' ? !r.own : true,
    sub: r => [r.category, eur(r.price)].filter(Boolean).join(' · '),
    quick: r => ({ on: !!r.own, label: 'Have it', act: () => save(r, { own: !r.own, bought: !r.own && !r.bought ? today() : r.bought }) })
  },

  /* self-care */
  beauty: {
    one: 'product', many: 'Beauty', facet: 'type',
    fields: [F('name', 'Name'), F('brand', 'Brand', 'text', { half: 1 }), F('size', 'Size', 'text', { half: 1 }),
      F('type', 'Type', 'select', { options: ['Face', 'Hair', 'Body', 'Makeup', 'Fragrance', 'Nails', 'Other'] }),
      F('concern', 'Concern', 'multi', { options: ['Hydration', 'Dryness', 'Cleansing', 'Dullness', 'Textural Irregularities', 'Signs of Congestion', 'Dark Circles', 'Uneven Skin Tone', 'Signs of Aging', 'Redness', 'Puffiness', 'Heat Protection', 'Styling Product', 'Hair Growth', 'Fragrance'] }),
      F('texture', 'Texture', 'select', { options: ['Creamy', 'Gel-like', 'Serum', 'Oily', 'Watery', 'Spray', 'Balm', 'Foam', 'Wipes', 'Wax'] }),
      F('am', 'Morning routine', 'check', { half: 1 }), F('pm', 'Evening routine', 'check', { half: 1 }),
      F('price', 'Price', 'money', { half: 1 }), F('qty', 'How many', 'num', { half: 1 }),
      F('bought', 'Bought on', 'date', { half: 1 }), F('opened', 'Opened on', 'date', { half: 1 }),
      F('expiry', 'Use before', 'date', { half: 1 }), F('rating', 'Rating', 'rating', { half: 1 }),
      F('fav', 'Favourite', 'check', { half: 1 }), F('finished', 'Finished', 'check', { half: 1 }),
      F('url', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['brand', 'Brand'], ['-rating', 'Best rated'], ['expiry', 'Use first'], ['-bought', 'Newest']],
    hide: r => r.finished || r.archived, hideLabel: 'Show finished',
    sub: r => [r.brand, r.type, r.texture, r.am && r.pm ? 'AM + PM' : r.am ? 'AM' : r.pm ? 'PM' : ''].filter(Boolean).join(' · '),
    side: r => r.expiry ? (r.expiry < today() ? 'expired' : diffDays(today(), r.expiry) <= 30 ? 'use by ' + shortDate(r.expiry) : '') : ''
  },
  supplements: {
    one: 'supplement', many: 'Supplements',
    fields: [F('name', 'Name'), F('brand', 'Brand', 'text', { half: 1 }),
      F('form', 'Form', 'select', { options: ['Tablet', 'Capsule', 'Softgel', 'Gummy', 'Powder', 'Liquid', 'Drops', 'Tablespoon'], half: 1 }),
      F('amount', 'How many per dose', 'num', { half: 1 }), F('times', 'When', 'multi', { options: ['AM', 'Midday', 'PM'], half: 1 }),
      F('bought', 'Bought on', 'date', { half: 1 }), F('expiry', 'Use before', 'date', { half: 1 }),
      F('price', 'Price', 'money', { half: 1 }), F('rating', 'Rating', 'rating', { half: 1 }),
      F('finished', 'Finished', 'check'), F('url', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['brand', 'Brand']],
    hide: r => r.finished, hideLabel: 'Show finished',
    sub: r => [r.brand, [].concat(r.times || []).join(' + '), r.amount && r.form ? `${r.amount} × ${r.form.toLowerCase()}` : r.form].filter(Boolean).join(' · ')
  },
  suplog: {
    one: 'intake', many: 'Intake log',
    fields: [F('date', 'Date', 'date', { half: 1 }), F('time', 'When', 'select', { options: ['AM', 'Midday', 'PM'], half: 1 }), F('supplement', 'Supplement', 'rel', { to: 'supplements' })],
    title: r => relName(r.supplement) || 'Supplement', sorts: [['-date', 'Newest']],
    sub: r => [niceDate(r.date), r.time].filter(Boolean).join(' · ')
  },
  water: { one: 'day', many: 'Water', fields: [F('date', 'Date', 'date', { half: 1 }), F('glasses', 'Glasses', 'num', { half: 1 })], title: r => niceDate(r.date), sorts: [['-date', 'Newest']], sub: r => plural(r.glasses || 0, 'glass', 'glasses') },
  journal: {
    one: 'entry', ones: 'entries', many: 'Journal', facet: 'mood',
    fields: [F('date', 'Date', 'date', { half: 1 }), F('mood', 'Mood', 'select', { options: ['Great', 'Good', 'Okay', 'Low', 'Bad'], half: 1 }),
      F('title', 'Title'), F('entry', 'What happened', 'long', { rows: 8 }), F('grateful', 'Grateful for', 'long')],
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
      F('stage', 'Stage', 'select', { options: SOCIAL_STAGES, half: 1 }), F('platforms', 'Platforms', 'multi', { options: SOCIAL_PLATFORMS, half: 1 }),
      F('format', 'Format', 'select', { options: SOCIAL_FORMATS, half: 1 }), F('pillar', 'Pillar', 'rel', { to: 'pillars', half: 1 }),
      F('style', 'Style', 'select', { options: SOCIAL_STYLES, half: 1 }), F('funnel', 'Funnel stage', 'select', { options: SOCIAL_FUNNEL, half: 1 }),
      F('desc', 'What it is', 'long'), F('caption', 'Caption', 'long'), F('hashtags', 'Hashtags', 'text'),
      F('link', 'Post link', 'url'), F('top', 'Top performer', 'check', { half: 1 }), F('repurpose', 'Repurpose this', 'check', { half: 1 }),
      F('photo', 'Cover', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['date', 'Soonest'], ['-date', 'Newest'], ['name', 'A to Z']],
    hide: r => r.stage === 'Posted', hideLabel: 'Show posted',
    sub: r => [r.date && `${dayName(r.date)} ${niceDate(r.date)}`, r.time, r.stage, [].concat(r.platforms || []).join(' + ')].filter(Boolean).join(' · '),
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
  pillars: {
    one: 'pillar', many: 'Content pillars',
    fields: [F('name', 'Pillar'), F('desc', 'What it covers', 'long'), F('keywords', 'Keywords and themes', 'text'), F('goal', 'Overall goal', 'long')],
    sorts: [['name', 'A to Z']], sub: r => r.keywords || ''
  },
  accounts: {
    one: 'account', many: 'Accounts', facet: 'platform',
    fields: [F('platform', 'Platform', 'select', { options: SOCIAL_PLATFORMS, half: 1 }), F('handle', 'Handle', 'text', { half: 1 }),
      F('followers', 'Followers', 'num', { half: 1 }), F('freq', 'Posting rhythm', 'text', { half: 1 }),
      F('active', 'Active', 'check', { half: 1 }), F('url', 'Profile link', 'url'), F('notes', 'Notes', 'long')],
    title: r => [r.platform, r.handle].filter(Boolean).join(' ') || 'Account', sorts: [['-followers', 'Most followers']],
    sub: r => [r.followers != null && r.followers !== '' ? plural(num(r.followers) || 0, 'follower') : '', r.freq].filter(Boolean).join(' · ')
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
      F('fee', 'Fee', 'money', { half: 1 }), F('contact', 'Contact', 'text', { half: 1 }),
      F('deliverables', 'Deliverables', 'long'), F('url', 'Link', 'url'), F('notes', 'Notes', 'long')],
    sorts: [['due', 'Due first'], ['-due', 'Newest']],
    hide: r => r.status === 'Paid' || r.status === 'Declined', hideLabel: 'Show finished',
    sub: r => [r.status, r.type, r.due && 'due ' + niceDate(r.due), eur(r.fee)].filter(Boolean).join(' · ')
  },
  meditation: {
    one: 'session', many: 'Meditation',
    fields: [F('date', 'Date', 'date', { half: 1 }), F('minutes', 'Minutes', 'num', { half: 1 }), F('type', 'Type', 'select', { options: ['Meditation', 'Breathwork', 'Yoga nidra', 'Mindfulness', 'Prayer'] }), F('notes', 'How it felt', 'long')],
    title: r => r.type || 'Session', sorts: [['-date', 'Newest']], sub: r => [niceDate(r.date), r.minutes ? r.minutes + ' min' : ''].filter(Boolean).join(' · ')
  },

  /* home */
  chores: {
    one: 'chore', many: 'Chores', facet: 'space',
    fields: [F('name', 'Chore'), F('space', 'Room', 'select', { options: [...ROOMS.filter(x => !['Schoonmaak', 'Overig'].includes(x)), 'Hele huis'] }),
      F('freq', 'How often', 'select', { options: Object.keys(FREQ) }), F('last', 'Last done', 'date', { half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['due', 'Due first'], ['name', 'A to Z']],
    sub: r => [r.space, r.freq].filter(Boolean).join(' · '),
    side: r => { const d = choreDue(r); return d <= today() ? (d < today() ? 'overdue' : 'due today') : 'due ' + relDay(d); },
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
    one: 'item', many: 'Inventory', facet: 'room',
    fields: [F('name', 'Name'), F('brand', 'Brand', 'text', { half: 1 }), F('qty', 'How many', 'text', { half: 1 }),
      F('room', 'Room', 'select', { options: ROOMS }),
      F('category', 'Category', 'select', { options: ['Furniture', 'Kitchenware', 'Appliances', 'Home Decor', 'Linens', 'Storage', 'Electronics', 'Tools', 'Outdoor Equipment', 'Miscellaneous'] }),
      F('status', 'Status', 'select', { options: ['Wishlist', 'Ordered', 'Have', 'Returned', 'Gone'] }),
      F('priority', 'Priority', 'select', { options: PRIO }),
      F('price', 'Price', 'money', { half: 1 }), F('bought', 'Bought on', 'date', { half: 1 }),
      F('rating', 'Rating', 'rating'), F('url', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['prio', 'Priority'], ['name', 'A to Z'], ['-bought', 'Newest'], ['-price', 'Priciest']],
    filters: [['want', 'To buy'], ['have', 'Have'], ['all', 'All']],
    filter: (r, f) => f === 'have' ? (r.status || 'Have') === 'Have' : f === 'want' ? ['Wishlist', 'Ordered'].includes(r.status) : true,
    sub: r => [r.room, r.category, r.qty && r.qty !== '1' ? r.qty + '×' : '', r.status === 'Ordered' ? 'ordered' : ''].filter(Boolean).join(' · '),
    side: r => [r.priority && ['Wishlist', 'Ordered'].includes(r.status) ? r.priority : '', eur(r.price)].filter(Boolean).join(' · '),
    quick: r => ['Wishlist', 'Ordered'].includes(r.status) ? { on: false, label: 'Bought', act: () => save(r, { status: 'Have', bought: r.bought || today() }) } : null
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
      F('plan', 'Workout plan', 'rel', { to: 'plans' }), F('exercises', 'Exercises', 'rel', { to: 'exercises', multi: 1 }),
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
};
for (const [k, K] of Object.entries(KINDS)) K.kind = k;
const titleOf = r => { const K = KINDS[r.kind]; return (K?.title ? K.title(r) : r.name) || 'Untitled'; };

/* ---------- overview tiles ----------
   Each area gives the overview page one small card: what matters today, with the quick ticks that work
   everywhere (data-act). A new area only needs a `tile` in SECTIONS below to show up there too. */
const tileBody = (bits) => bits.filter(Boolean).join('');
const tileList = (list, n = 3) => list.length ? `<div class="lrows">${list.slice(0, n).map(row).join('')}</div>${list.length > n ? `<p class="lnone">+${list.length - n} more</p>` : ''}` : '';
function kitchenTile() {
  const t = today(), meals = recs('meals').filter(m => m.date === t), groc = recs('ingredients').filter(i => i.list).length;
  return tileBody([
    `<div class="lslots">${MEALS.filter(s => s !== 'Snack' || meals.some(m => m.slot === s)).map(s => { const m = meals.filter(x => x.slot === s); return `<div class="lslot"><span class="rowlbl">${s}</span>${m.map(x => `<button class="chip" data-act="open" data-id="${x.id}">${esc(titleOf(x))}</button>`).join('')}<button class="chip ghost" data-act="slot" data-date="${t}" data-slot="${s}" aria-label="Plan ${s.toLowerCase()}">+</button></div>`; }).join('')}</div>`,
    `<button class="chip link" data-act="go" data-v="kitchen/groceries">${groc ? plural(groc, 'thing') + ' on your grocery list' : 'Grocery list is empty'}</button>`
  ]);
}
function careTile() {
  const t = today(), w = waterToday(), goal = Number(C.prefs().waterGoal) || 8, glasses = w?.glasses || 0;
  const sups = recs('supplements').filter(s => !s.finished);
  const doses = sups.reduce((n, s) => n + [].concat(s.times?.length ? s.times : ['AM']).length, 0);
  const taken = recs('suplog').filter(l => l.date === t).length;
  const cy = cycleStats();
  const appt = recs('appts').filter(a => !a.done && a.date && a.date >= t).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))[0];
  // the routine that fits the time of day: morning until 3 pm, evening after
  const eve = new Date().getHours() >= 15, prods = recs('beauty').filter(b => !b.finished && !b.archived && (eve ? b.pm : b.am));
  const sl = recs('sleep').find(x => x.date === t), j = recs('journal').find(x => x.date === t);
  return tileBody([
    `<div class="lwater small"><button class="iconbtn small" data-act="water" data-v="-1" aria-label="One glass less" ${glasses ? '' : 'disabled'}>${svg(P.minus)}</button><div class="lwv"><b>${glasses}</b><span>of ${goal} glasses</span></div><button class="iconbtn small lplus" data-act="water" data-v="1" aria-label="One more glass">${svg(P.plus)}</button></div>`,
    doses ? `<p class="dline"><span>Supplements</span><b>${Math.min(taken, doses)} of ${doses} taken</b></p>` : '',
    cy.last ? `<p class="dline"><span>Cycle</span><b>${cy.open ? 'period, day ' + cy.day : 'day ' + cy.day + ', next ' + relDay(cy.next)}</b></p>` : '',
    appt ? `<p class="dline"><span>Next appointment</span><b>${esc(titleOf(appt))}, ${esc(relDay(appt.date))}${appt.time ? ' ' + esc(appt.time) : ''}</b></p>` : '',
    prods.length ? `<p class="dsub">${eve ? 'Evening' : 'Morning'} skincare</p><div class="lwrap">${prods.map(b => `<button class="chip" data-act="open" data-id="${b.id}">${esc(b.name)}</button>`).join('')}</div>` : '',
    sl ? `<p class="dline"><span>Sleep</span><b>${esc([sl.hours ? sl.hours + ' h' : 'logged', sl.quality?.toLowerCase()].filter(Boolean).join(', '))}</b></p>` : '',
    j ? `<p class="dline"><span>Journal</span><b><button class="chip link" data-act="open" data-id="${j.id}">${esc(titleOf(j))}</button></b></p>` : '',
    sl && j ? '' : `<div class="dbtns">${sl ? '' : '<button class="btn small" data-act="new" data-v="sleep">Log last night</button>'}${j ? '' : '<button class="btn small" data-act="new" data-v="journal">Write today’s entry</button>'}</div>`
  ]);
}
function homeTile() {
  const t = today();
  const chores = recs('chores').filter(c => choreDue(c) <= t).sort((a, b) => choreDue(a).localeCompare(choreDue(b)));
  const plants = recs('plants').filter(p => plantDue(p) && plantDue(p) <= t);
  return tileBody([
    chores.length ? `<p class="dsub">Chores due</p>${tileList(chores)}` : `<p class="lnone">${recs('chores').length ? 'All chores done.' : 'No chores yet.'}</p>`,
    plants.length ? `<p class="dsub">Plants to water</p>${tileList(plants, 2)}` : ''
  ]);
}
function socialTile() {
  const t = today(), posts = recs('posts');
  const now = posts.filter(p => p.date === t && p.stage !== 'Posted').sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const next = posts.filter(p => p.stage !== 'Posted' && p.date && p.date > t).sort((a, b) => a.date.localeCompare(b.date))[0];
  const deal = recs('deals').filter(d => d.due && d.due >= t && !['Delivered', 'Paid', 'Declined'].includes(d.status)).sort((a, b) => a.due.localeCompare(b.due))[0];
  const dl = [next && { what: titleOf(next), date: next.date }, deal && { what: deal.name + ' (collab)', date: deal.due }].filter(Boolean).sort((a, b) => a.date.localeCompare(b.date))[0];
  return tileBody([
    now.length ? `<p class="dsub">Posting today</p>${tileList(now)}` : `<p class="lnone">${posts.length ? 'Nothing to post today.' : 'No posts planned yet.'}</p>`,
    dl ? `<p class="dline"><span>Next</span><b>${esc(dl.what)}, ${esc(relDay(dl.date))}</b></p>` : ''
  ]);
}
function fitTile() {
  const t = today(), ws = recs('workouts');
  const now = ws.filter(w => w.date === t && !w.skipped);
  const next = ws.filter(w => !w.done && !w.skipped && w.date && w.date > t).sort((a, b) => a.date.localeCompare(b.date))[0];
  const wk = weekStart(0), week = ws.filter(w => w.done && w.date >= wk && w.date <= addDays(wk, 6)).length;
  return tileBody([
    now.length ? tileList(now) : '<p class="lnone">No workout today.</p>',
    next && !now.length ? `<p class="dline"><span>Next</span><b>${esc(titleOf(next))}, ${esc(relDay(next.date))}</b></p>` : '',
    `<p class="dline"><span>This week</span><b>${plural(week, 'workout')} done</b></p>`,
    now.length ? '' : '<button class="btn small" data-act="new" data-v="workouts">Plan a workout</button>'
  ]);
}

/* ---------- sections and their pages ---------- */
const SECTIONS = [
  { key: 'kitchen', label: 'Kitchen', icon: P.pot, tile: kitchenTile, views: [['today', 'Overview', P.grid], ['recipes', 'Recipes', P.book], ['meals', 'Meal plan', P.calendar], ['groceries', 'Groceries', P.cart], ['pantry', 'Pantry', P.jar], ['gear', 'Gear', P.spoon]] },
  { key: 'care', label: 'Self-care', icon: P.sparkle, tile: careTile, views: [['today', 'Overview', P.grid], ['beauty', 'Beauty', P.drop], ['supplements', 'Supplements', P.pill], ['cycle', 'Cycle', P.moon], ['journal', 'Journal', P.pen], ['health', 'Health', P.pulse], ['ideas', 'Ideas', P.star]] },
  { key: 'home', label: 'Home', icon: P.house, tile: homeTile, views: [['today', 'Overview', P.grid], ['chores', 'Chores', P.broom], ['plants', 'Plants', P.leaf], ['inventory', 'Inventory', P.box], ['repairs', 'Repairs', P.wrench]] },
  { key: 'social', label: 'Social', icon: P.phone, tile: socialTile, views: [['today', 'Overview', P.grid], ['posts', 'Posts', P.phone], ['ideas', 'Ideas', P.star], ['goals', 'Goals', P.target], ['collabs', 'Collabs', P.handshake], ['brand', 'Brand', P.user]] },
  { key: 'fit', label: 'Fitness', icon: P.dumbbell, tile: fitTile, views: [['today', 'Overview', P.grid], ['workouts', 'Workouts', P.run], ['plans', 'Plans', P.list], ['exercises', 'Exercises', P.dumbbell], ['body', 'Body', P.scale], ['gear', 'Gear', P.box]] }
];
const PAGES = {
  'kitchen/today': { render: kitchenToday, adds: ['meals', 'recipes', 'ingredients', 'mealprep'] },
  'kitchen/recipes': { title: 'Recipes', segs: [{ kind: 'recipes' }] },
  'kitchen/meals': { title: 'Meal plan', segs: [{ key: 'week', label: 'Week', kind: 'meals', fill: weekFill, tools: false }, { kind: 'mealprep' }] },
  'kitchen/groceries': { title: 'Groceries', segs: [{ key: 'list', label: 'Shopping list', kind: 'ingredients', fill: groceryFill, tools: false }] },
  'kitchen/pantry': { title: 'Pantry', segs: [{ kind: 'ingredients' }] },
  'kitchen/gear': { title: 'Kitchen gear', segs: [{ kind: 'gear' }] },
  'care/today': { render: careToday, adds: ['journal', 'sleep', 'beauty', 'supplements', 'appts', 'symptoms', 'meditation', 'ideas'] },
  'care/beauty': { title: 'Beauty', segs: [{ kind: 'beauty' }] },
  'care/supplements': { title: 'Supplements', segs: [{ kind: 'supplements' }, { kind: 'suplog' }] },
  'care/cycle': { title: 'Cycle', segs: [{ kind: 'cycles', label: 'Periods', top: cycleTop }] },
  'care/journal': { title: 'Journal', segs: [{ kind: 'journal' }] },
  'care/ideas': { title: 'Ideas', segs: [{ kind: 'ideas' }] },
  'social/today': { render: socialToday, adds: ['posts', 'cideas', 'deals', 'sgoals'] },
  'social/posts': { title: 'Posts', segs: [{ kind: 'posts' }] },
  'social/ideas': { title: 'Content ideas', segs: [{ kind: 'cideas' }] },
  'social/goals': { title: 'Goals', segs: [{ kind: 'sgoals' }, { kind: 'accounts' }] },
  'social/collabs': { title: 'Collabs', segs: [{ kind: 'deals' }] },
  'social/brand': { title: 'Brand', segs: [{ kind: 'pillars' }, { kind: 'accounts' }] },
  'care/health': { title: 'Health', segs: [{ kind: 'sleep' }, { kind: 'appts' }, { kind: 'symptoms' }, { kind: 'meditation' }, { kind: 'water' }] },
  'home/today': { render: homeToday, adds: ['chores', 'plants', 'inventory', 'repairs'] },
  'home/chores': { title: 'Chores', segs: [{ kind: 'chores' }] },
  'home/plants': { title: 'Plants', segs: [{ kind: 'plants' }] },
  'home/inventory': { title: 'Inventory', segs: [{ kind: 'inventory' }] },
  'home/repairs': { title: 'Repairs', segs: [{ kind: 'repairs' }] },
  'fit/today': { render: fitToday, adds: ['workouts', 'sets', 'body', 'exercises'] },
  'fit/workouts': { title: 'Workouts', segs: [{ kind: 'workouts' }] },
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
function index() { L.byId = Object.fromEntries(L.all.map(r => [r.id, r])); }
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
  L.missing = false; L.status = 'ok';
  L.all = rows.map(r => ({ ...r.data, id: r.id, kind: r.kind })); index(); cacheSave(); C.render();
}
function apply(id, kind, data) {
  const i = L.all.findIndex(r => r.id === id);
  if (data) { const v = { ...data, id, kind }; i >= 0 ? (L.all[i] = v) : L.all.push(v); } else if (i >= 0) L.all.splice(i, 1);
  index(); cacheSave(); C.render();
}
// Changes show at once and are rolled back if Supabase says no
async function put(kind, id, data) {
  const before = L.byId[id] ? { ...L.byId[id] } : null;
  apply(id, kind, data);
  const { error } = await C.sb.from('records').upsert({ user_id: C.uid(), id, kind, data, updated_at: new Date().toISOString() });
  if (error) { before ? apply(id, kind, dataOf(before)) : apply(id, kind, null); failed(error); throw error; }
}
async function del(id) {
  const before = L.byId[id]; if (!before) return;
  apply(id, before.kind, null);
  const { error } = await C.sb.from('records').delete().eq('id', id);
  if (error) { apply(id, before.kind, dataOf(before)); failed(error); throw error; }
}
async function putMany(rows, progress) {
  const now = new Date().toISOString();
  for (let i = 0; i < rows.length; i += 400) {
    const part = rows.slice(i, i + 400);
    const { error } = await C.sb.from('records').upsert(part.map(r => ({ user_id: C.uid(), id: r.id, kind: r.kind, data: r.data, updated_at: now })));
    if (error) throw error;
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
    else if (p.new?.id) apply(p.new.id, p.new.kind, p.new.data);
  }).subscribe();
}

/* ---------- derived numbers ---------- */
const choreDue = r => r.last ? addDays(r.last, FREQ[r.freq] || 7) : today();
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
const viewMode = K => { try { const v = localStorage.getItem('lview:' + K.kind); if (v === 'rows' || v === 'cards') return v; } catch {} return K.display === 'cards' ? 'cards' : 'rows'; };
const setViewMode = (K, v) => { try { localStorage.setItem('lview:' + K.kind, v); } catch {} };
const viewSwitch = K => `<div class="seg lviews" role="group" aria-label="Show as">${[['rows', 'List', P.list], ['cards', 'Cards', P.grid]].map(([v, l, ic]) => `<button data-act="lview" data-v="${v}" aria-pressed="${viewMode(K) === v}" aria-label="${l}" title="${l}">${svg(ic)}</button>`).join('')}</div>`;
const tick = (label, on, attrs) => `<button class="lquick ${on ? 'on' : ''}" ${attrs} aria-pressed="${on}">${on ? svg(P.check) : ''}${esc(label)}</button>`;
function row(r) {
  const K = KINDS[r.kind], q = K.quick?.(r), side = K.side?.(r);
  const ph = photoOf(r);
  return `<div class="lrow ${K.hide?.(r) ? 'gone' : ''}">${ph ? `<button class="lthumb" data-act="open" data-id="${r.id}" tabindex="-1" aria-hidden="true"><img referrerpolicy="no-referrer" src="${esc(C.photoURL(ph))}" alt="" loading="lazy" onerror="this.parentNode.remove()"></button>` : ''}<button class="lmain" data-act="open" data-id="${r.id}"><b>${esc(titleOf(r))}</b>${K.sub?.(r) ? `<span>${esc(K.sub(r))}</span>` : ''}</button>${side ? `<span class="lside ${/overdue|expired|today/.test(side) ? 'hot' : ''}">${esc(side)}</span>` : ''}${q ? tick(q.label, q.on, `data-act="quick" data-id="${r.id}"`) : ''}</div>`;
}
function card(r) {
  const K = KINDS[r.kind], ph = photoOf(r);
  return `<button class="lcard" data-act="open" data-id="${r.id}"><div class="lph"><span>${esc(titleOf(r).slice(0, 1))}</span>${ph ? `<img referrerpolicy="no-referrer" src="${esc(C.photoURL(ph))}" alt="" loading="lazy" onerror="this.remove()">` : ''}${r.fav ? '<i class="lfav" aria-label="Favourite">★</i>' : ''}</div><div class="meta"><b>${esc(titleOf(r))}</b><span>${esc(K.sub?.(r) || '')}</span></div></button>`;
}
const listHTML = (list, K) => !list.length ? '' : viewMode(K) === 'cards' ? `<div class="lgrid">${list.map(card).join('')}</div>` : `<div class="lrows">${list.map(row).join('')}</div>`;
const panel = (title, body, more) => `<section class="panel lpanel"><div class="lph3"><h3>${esc(title)}</h3>${more ? `<button class="chip link" data-act="go" data-v="${more[0]}">${esc(more[1])}</button>` : ''}</div>${body}</section>`;
const quiet = t => `<p class="lnone">${esc(t)}</p>`;

/* ---------- list pages ---------- */
function sortList(list, K, key) {
  const desc = key.startsWith('-'), k = desc ? key.slice(1) : key;
  const val = r => k === 'prio' ? (PRIO.includes(r.priority) ? PRIO.indexOf(r.priority) : 9) : k === 'time' ? (totalTime(r) || 1e9) : k === 'due' ? (r.kind === 'plants' ? (plantDue(r) || '9999') : choreDue(r)) : k === 'name' ? norm(titleOf(r)) : r[k];
  return list.sort((a, b) => {
    let x = val(a), y = val(b);
    const ex = x == null || x === '', ey = y == null || y === '';
    if (ex || ey) return ex && ey ? norm(titleOf(a)).localeCompare(norm(titleOf(b))) : ex ? 1 : -1;
    if (typeof x === 'string') x = x.toLowerCase(), y = String(y).toLowerCase();
    const c = x < y ? -1 : x > y ? 1 : 0;
    return (desc ? -c : c) || norm(titleOf(a)).localeCompare(norm(titleOf(b)));
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
  if (q) list = list.filter(r => norm([titleOf(r), K.sub?.(r), r.brand, r.notes, ...relNames(r.ingredients)].join(' ')).includes(q));
  return sortList(list, K, u.sort[seg.key] || K.sorts?.[0]?.[0] || 'name');
}
function listPage(host, page) {
  const cfg = PAGES[page], u = uiOf(page), seg = curSeg(page), K = KINDS[seg.kind], ss = segsOf(page);
  const sig = page + '|' + seg.key;
  if (host.dataset.sig !== sig) {
    host.dataset.sig = sig;
    const sorts = K.sorts || [];
    host.innerHTML = `<div class="viewhead"><h1>${esc(cfg.title)}</h1><span class="sub" data-count></span></div>
      ${ss.length > 1 ? `<div class="seg lseg">${ss.map(s => `<button data-act="seg" data-v="${s.key}" aria-pressed="${s.key === seg.key}">${esc(s.label)}</button>`).join('')}</div>` : ''}
      ${seg.tools ? `<div class="tools"><label class="search">${svg(P.search)}<input type="search" data-lq placeholder="Search ${esc(K.many.toLowerCase())}" value="${esc(u.q)}" aria-label="Search"></label>
        ${sorts.length > 1 ? `<select class="pill" data-lsort aria-label="Sort">${sorts.map(([k, l]) => `<option value="${k}" ${(u.sort[seg.key] || sorts[0][0]) === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>` : ''}${viewSwitch(K)}</div>
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
    const opts = K.facet ? Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b)) : [];
    fh.innerHTML = (K.filters || []).map(([k, l]) => `<button class="chip tab" data-act="filter" data-v="${k}" aria-pressed="${f === k}">${esc(l)}</button>`).join('')
      + (K.filters && opts.length ? '<span class="lsep"></span>' : '')
      + (opts.length > 1 ? opts.map(v => `<button class="chip" data-act="facet" data-v="${esc(v)}" aria-pressed="${u.facet === v}">${esc(v)}<span class="n">${counts[v]}</span></button>`).join('') : '')
      + (K.hide && all.some(K.hide) ? `<button class="chip ghost" data-act="showall" aria-pressed="${u.all}">${esc(u.all ? 'Hide ' + K.hideLabel.slice(5) : K.hideLabel)}</button>` : '');
    fh.hidden = !fh.innerHTML;
  }
  if (seg.fill) { seg.fill(fill, page); return; }
  const top = seg.top ? seg.top() : '';
  fill.innerHTML = top + (list.length ? listHTML(list, K) : emptyList(K, all.length));
}
function emptyList(K, any) {
  return any ? quiet('Nothing matches. Try another search or filter.')
    : `<div class="empty lempty"><h2>No ${esc(K.many.toLowerCase())} yet</h2><p>Add your first ${esc(K.one)} with the + button, or bring everything over from Notion in one go.</p><button class="btn" data-act="import">Import from Notion</button></div>`;
}

/* ---------- kitchen ---------- */
function kitchenToday(host) {
  const t = today(), meals = recs('meals').filter(m => m.date === t);
  const groc = recs('ingredients').filter(i => i.list).sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
  const prep = recs('mealprep').filter(p => p.status === 'Klaar' || p.status === 'Te preppen').sort((a, b) => (a.until || '9').localeCompare(b.until || '9'));
  const stock = new Set(recs('ingredients').filter(i => i.stock).map(i => i.id));
  const rs = recs('recipes');
  const ready = rs.filter(r => r.ingredients?.length && r.ingredients.every(id => stock.has(id)));
  const pick = shuffle(ready.length >= 3 ? ready : rs).slice(0, 4);
  host.innerHTML = `${head('Kitchen')}
  <div class="panels">
    ${panel('Today’s meals', `<div class="lslots">${MEALS.map(s => { const m = meals.filter(x => x.slot === s); return `<div class="lslot"><span class="rowlbl">${s}</span>${m.map(x => `<button class="chip" data-act="open" data-id="${x.id}">${esc(titleOf(x))}</button>`).join('')}<button class="chip ghost" data-act="slot" data-date="${t}" data-slot="${s}" aria-label="Plan ${s.toLowerCase()}">+</button></div>`; }).join('')}</div>`, ['kitchen/meals', 'Meal plan'])}
    ${panel('Grocery list', groc.length ? `<p class="lbig">${plural(groc.length, 'thing')} to buy</p><div class="lwrap">${groc.slice(0, 14).map(i => `<span class="chip">${esc(i.name)}</span>`).join('')}${groc.length > 14 ? `<span class="chip">+${groc.length - 14}</span>` : ''}</div>` : quiet('Nothing on your list. Tap “Add to list” on a recipe or in the pantry.'), ['kitchen/groceries', 'Go shopping'])}
    ${panel('Meal prep', prep.length ? `<div class="lrows">${prep.slice(0, 5).map(row).join('')}</div>` : quiet('No prepped meals waiting.'), ['kitchen/meals', 'All meal prep'])}
    ${panel(ready.length >= 3 ? 'You can cook these now' : 'Something to cook', pick.length ? `<div class="lgrid small">${pick.map(card).join('')}</div>` : quiet('Your recipes show up here.'), ['kitchen/recipes', 'All recipes'])}
  </div>${dataTools()}`;
}
function weekStart(offset) { const d = new Date(); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd + offset * 7); return iso(d); }
function weekFill(fill) {
  const start = weekStart(L.week), days = Array.from({ length: 7 }, (_, i) => addDays(start, i)), t = today();
  const meals = recs('meals');
  fill.innerHTML = `<div class="lweeknav"><button class="iconbtn" data-act="week" data-v="-1" aria-label="Previous week">${svg(P.left)}</button><b>${shortDate(days[0])} to ${shortDate(days[6])}</b><button class="iconbtn" data-act="week" data-v="1" aria-label="Next week">${svg(P.right)}</button>${L.week ? '<button class="chip" data-act="week" data-v="0">This week</button>' : ''}</div>
  <div class="lweek">${days.map(d => `<div class="lday ${d === t ? 'now' : ''}"><div class="ldh"><b>${dayName(d)}</b><span>${shortDate(d)}</span></div>${MEALS.map(s => { const m = meals.filter(x => x.date === d && x.slot === s); return `<div class="lslot"><span class="rowlbl">${s}</span>${m.map(x => `<button class="chip" data-act="open" data-id="${x.id}">${esc(titleOf(x))}</button>`).join('')}${m.length ? '' : `<button class="chip ghost" data-act="slot" data-date="${d}" data-slot="${s}" aria-label="Plan ${s.toLowerCase()} on ${dayName(d)}">+</button>`}</div>`; }).join('')}</div>`).join('')}</div>`;
}
function groceryFill(fill) {
  if (!fill.querySelector('.lqadd')) {
    fill.innerHTML = `<form class="lqadd" data-qadd><input type="text" placeholder="Add something to buy" aria-label="Add to grocery list" autocomplete="off" enterkeyhint="done"><button class="btn primary" type="submit">Add</button></form><div class="lsugs" data-sugs></div><div data-glist></div>`;
    fill.querySelector('input').addEventListener('input', e => sugs(fill, e.target.value));
  }
  const items = recs('ingredients').filter(i => i.list);
  const groups = {};
  for (const i of items) (groups[i.category || 'Other'] ||= []).push(i);
  const g = fill.querySelector('[data-glist]');
  g.innerHTML = items.length ? Object.keys(groups).sort().map(c => `<h3 class="lgh">${esc(c)}</h3><div class="lrows">${groups[c].sort((a, b) => norm(a.name).localeCompare(norm(b.name))).map(i => `<div class="lrow"><button class="lbuy" data-act="buy" data-id="${i.id}" aria-label="Bought ${esc(i.name)}"></button><button class="lmain" data-act="open" data-id="${i.id}"><b>${esc(i.name)}</b>${i.qty || i.location ? `<span>${esc([i.qty, i.location].filter(Boolean).join(' · '))}</span>` : ''}</button><button class="iconbtn lx" data-act="unlist" data-id="${i.id}" aria-label="Take ${esc(i.name)} off the list">${svg(P.x)}</button></div>`).join('')}</div>`).join('')
    + `<p class="lnone">Tick something off and it moves into your pantry.</p>`
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
  const missing = ings.filter(i => !i.stock && !i.list);
  const sh = C.sheet({
    title: r.name || 'Recipe', wide: true,
    body: `<div class="lrecipe">${r.photo ? `<img referrerpolicy="no-referrer" class="lrimg" src="${esc(C.photoURL(r.photo))}" alt="" onerror="this.remove()">` : ''}
      <div class="lrbody">
        <p class="lmeta">${esc([r.category, mins(totalTime(r)), r.servings ? plural(r.servings, 'serving') : '', r.protein ? r.protein + ' protein' : ''].filter(Boolean).join(' · '))}${r.rating ? ` <span class="lstars">${stars(r.rating)}</span>` : ''}</p>
        ${r.link ? `<a class="btn small" href="${esc(r.link)}" target="_blank" rel="noopener">${svg(P.link)} Open the recipe</a>` : ''}
        ${ings.length ? `<h3>Ingredients</h3><div class="lwrap">${ings.map(i => `<span class="chip ${i.stock ? 'on' : ''}">${i.stock ? '✓ ' : ''}${esc(i.name)}${i.list ? ' (on list)' : ''}</span>`).join('')}</div>` : ''}
        ${r.instructions ? `<h3>Instructions</h3><p class="lpre">${esc(r.instructions)}</p>` : ''}
        ${r.notes ? `<h3>Notes</h3><p class="lpre">${esc(r.notes)}</p>` : ''}
      </div></div>`,
    foot: `${missing.length ? `<button class="btn" data-miss>Add ${missing.length} missing to list</button>` : ''}<button class="btn" data-plan>Plan it</button><div class="spacer"></div><button class="btn primary" data-edit>Edit</button>`
  });
  sh.querySelector('[data-edit]').onclick = () => openEditor('recipes', r.id);
  sh.querySelector('[data-plan]').onclick = () => planRecipe(r);
  const m = sh.querySelector('[data-miss]');
  if (m) m.onclick = () => { missing.forEach(i => save(i, { list: true })); C.toast(`${plural(missing.length, 'thing')} added to your list`); C.closeSheet(); };
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
  const prods = recs('beauty').filter(b => !b.finished && !b.archived);
  const am = prods.filter(b => b.am), pm = prods.filter(b => b.pm);
  const soon = prods.filter(b => b.expiry && diffDays(t, b.expiry) <= 30).sort((a, b) => a.expiry.localeCompare(b.expiry));
  const appts = recs('appts').filter(a => !a.done && a.date && a.date >= t).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).slice(0, 3);
  host.innerHTML = `${head('Self-care')}
  <div class="panels">
    ${panel('Water', `<div class="lwater"><button class="iconbtn" data-act="water" data-v="-1" aria-label="One glass less" ${glasses ? '' : 'disabled'}>${svg(P.minus)}</button><div class="lwv"><b>${glasses}</b><span>of ${goal} glasses</span></div><button class="iconbtn lplus" data-act="water" data-v="1" aria-label="One more glass">${svg(P.plus)}</button></div><div class="meter" aria-hidden="true"><div style="width:${Math.min(100, glasses / goal * 100)}%"></div></div><button class="chip link lgoal" data-act="watergoal">Daily goal: ${goal}</button>`)}
    ${panel('Supplements today', sups.length ? times.map(tm => `<div class="lslot"><span class="rowlbl">${tm}</span>${sups.filter(s => [].concat(s.times?.length ? s.times : ['AM']).includes(tm)).map(s => { const on = taken.some(l => l.supplement === s.id && (l.time || 'AM') === tm); return tick(s.name, on, `data-act="supp" data-id="${s.id}" data-t="${tm}"`); }).join('')}</div>`).join('') : quiet('Add your supplements and tick them off here each day.'), ['care/supplements', 'All supplements'])}
    ${panel('Cycle', cy.last ? `<p class="lbig">${cy.open ? `Period, day ${cy.day}` : `Day ${cy.day} of about ${cy.avg}`}</p><p class="lnone">${cy.open ? 'Tap below when it’s over.' : `Next period expected ${relDay(cy.next)} (${shortDate(cy.next)})${cy.guessed ? ', based on a 28-day cycle until you log more' : ''}.`}</p>${cy.open ? `<button class="btn small" data-act="periodend" data-id="${cy.open.id}">Period ended today</button>` : `<button class="btn small" data-act="periodstart">Period started today</button>`}` : `${quiet('Log when your period starts and the app predicts the next one.')}<button class="btn small" data-act="periodstart">Period started today</button>`, ['care/cycle', 'History'])}
    ${panel('Sleep', sl ? `<p class="lbig">${sl.hours ? sl.hours + ' hours' : 'Logged'}${sl.quality ? ', ' + sl.quality.toLowerCase() : ''}</p><p class="lnone">${esc(niceDate(sl.date))}${sl.wake ? ' · woke up ' + esc(sl.wake.toLowerCase()) : ''}</p>${sl.date === t ? '' : '<button class="btn small" data-act="new" data-v="sleep">Log last night</button>'}` : `${quiet('How did you sleep?')}<button class="btn small" data-act="new" data-v="sleep">Log last night</button>`, ['care/health', 'Sleep log'])}
    ${panel('Journal', j ? `<button class="lrow lmain" data-act="open" data-id="${j.id}"><b>${esc(titleOf(j))}</b><span>${esc((j.entry || '').slice(0, 140))}</span></button>` : `${quiet('Nothing written today yet.')}<button class="btn small" data-act="new" data-v="journal">Write today’s entry</button>`, ['care/journal', 'All entries'])}
    ${panel('Skincare routine', am.length || pm.length ? [['Morning', am], ['Evening', pm]].filter(x => x[1].length).map(([l, ps]) => `<div class="lslot"><span class="rowlbl">${l}</span>${ps.map(b => `<button class="chip" data-act="open" data-id="${b.id}">${esc(b.name)}</button>`).join('')}</div>`).join('') : quiet('Mark products as part of your morning or evening routine and they show up here.'), ['care/beauty', 'All products'])}
    ${soon.length ? panel('Use these up', `<div class="lrows">${soon.slice(0, 5).map(row).join('')}</div>`) : ''}
    ${panel('Coming up', appts.length ? `<div class="lrows">${appts.map(row).join('')}</div>` : quiet('No appointments planned.'), ['care/health', 'Appointments'])}
  </div>${dataTools()}`;
}
async function toggleSupp(id, tm) {
  const t = today(), hit = recs('suplog').find(l => l.date === t && l.supplement === id && (l.time || 'AM') === tm);
  try { hit ? await del(hit.id) : await create('suplog', { date: t, supplement: id, time: tm }); } catch {}
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
function homeToday(host) {
  const t = today();
  const chores = recs('chores').filter(c => choreDue(c) <= t).sort((a, b) => choreDue(a).localeCompare(choreDue(b)));
  const doneToday = recs('chores').filter(c => c.last === t);
  const plants = recs('plants').filter(p => plantDue(p) && plantDue(p) <= t);
  const reps = recs('repairs').filter(r => r.status !== 'Done').sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
  const inv = recs('inventory').filter(i => (i.status || 'Have') === 'Have');
  const worth = inv.reduce((s, i) => s + (num(i.price) || 0), 0);
  const wish = recs('inventory').filter(i => ['Wishlist', 'Ordered'].includes(i.status));
  const must = sortList(wish.filter(i => i.priority === 'Must-have'), KINDS.inventory, 'room');
  const wishCost = wish.reduce((s, i) => s + (num(i.price) || 0), 0);
  host.innerHTML = `${head('Home')}
  <div class="panels">
    ${panel('Chores due', chores.length ? `<div class="lrows">${chores.slice(0, 10).map(row).join('')}</div>` : quiet(recs('chores').length ? 'All caught up.' : 'Add your chores with how often they need doing; they come back here when they’re due.'), ['home/chores', 'All chores'])}
    ${doneToday.length ? panel('Done today', `<div class="lrows">${doneToday.map(row).join('')}</div>`) : ''}
    ${panel('Plants to water', plants.length ? `<div class="lrows">${plants.map(row).join('')}</div>` : quiet(recs('plants').length ? 'Every plant has had water.' : 'Add your plants and how often they need water.'), ['home/plants', 'All plants'])}
    ${panel('Repairs and jobs', reps.length ? `<div class="lrows">${reps.slice(0, 6).map(row).join('')}</div>` : quiet('Nothing to fix.'), ['home/repairs', 'All repairs'])}
    ${panel('Still to buy', wish.length ? `<p class="lbig">${plural(wish.length, 'thing')}</p><p class="lnone">${must.length} must-have${must.length === 1 ? '' : 's'}${wishCost ? ', about ' + eur(wishCost) + ' for what has a price' : ''}.</p><div class="lrows">${must.slice(0, 5).map(row).join('')}</div>` : `<p class="lnone">${inv.length ? `You own ${plural(inv.length, 'thing')}${worth ? ' worth ' + eur(worth) : ''}.` : 'Keep track of what you own and what you still want for the house.'}</p>`, ['home/inventory', 'Open inventory'])}
  </div>${dataTools()}`;
}

/* ---------- fitness ---------- */
function socialToday(host) {
  const t = today(), posts = recs('posts');
  const wk = weekStart(0), end = addDays(wk, 6);
  const upcoming = posts.filter(p => p.stage !== 'Posted' && p.date && p.date >= t).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).slice(0, 8);
  const late = posts.filter(p => p.stage !== 'Posted' && p.date && p.date < t);
  const week = posts.filter(p => p.date >= wk && p.date <= end), posted = week.filter(p => p.stage === 'Posted').length;
  const ideas = recs('cideas').filter(i => !['Dropped', 'Planned'].includes(i.status));
  const goals = recs('sgoals').filter(g => !g.done);
  const deals = recs('deals').filter(d => !['Paid', 'Declined'].includes(d.status)).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const accs = recs('accounts').filter(a => a.active !== false).sort((a, b) => (num(b.followers) || 0) - (num(a.followers) || 0));
  const bar = g => { const pct = num(g.target) ? Math.min(100, Math.round(100 * (num(g.current) || 0) / num(g.target))) : 0; return `<div class="lrow"><button class="lmain" data-act="open" data-id="${g.id}"><b>${esc(titleOf(g))}</b><span>${esc([g.platform, g.metric, `${num(g.current) || 0} of ${num(g.target) || 0}`].filter(Boolean).join(' · '))}</span><span class="lprog"><i style="width:${pct}%"></i></span></button><span class="lside">${pct}%</span></div>`; };
  host.innerHTML = `${head('Social')}
  <div class="tiles lt3"><div class="tile"><div class="k">This week</div><div class="v">${week.length}</div><div class="h">${posted} posted</div></div>
    ${accs.slice(0, 2).map(a => `<div class="tile"><div class="k">${esc(a.platform || 'Account')}</div><div class="v">${(num(a.followers) || 0).toLocaleString('en-GB')}</div><div class="h">followers${a.freq ? ' · ' + esc(a.freq) : ''}</div></div>`).join('') || '<div class="tile"><div class="k">Followers</div><div class="v">–</div><div class="h">add your accounts under Brand</div></div>'}</div>
  <div class="panels">
    ${panel('Coming up', upcoming.length ? `<div class="lrows">${upcoming.map(row).join('')}</div>` : `${quiet('No posts planned.')}<button class="btn small" data-act="new" data-v="posts">Plan a post</button>`, ['social/posts', 'All posts'])}
    ${late.length ? panel('Past their date', `<div class="lrows">${late.slice(0, 5).map(row).join('')}</div>`, ['social/posts', 'All posts']) : ''}
    ${panel('Goals', goals.length ? `<div class="lrows">${goals.slice(0, 5).map(bar).join('')}</div>` : quiet('Set a goal per platform and track how close you are.'), ['social/goals', 'All goals'])}
    ${panel('Collabs', deals.length ? `<div class="lrows">${deals.slice(0, 5).map(row).join('')}</div>` : quiet('No brand deals running.'), ['social/collabs', 'All collabs'])}
    ${panel('Ideas', ideas.length ? `<p class="lbig">${plural(ideas.length, 'idea')}</p><div class="lrows">${ideas.slice(0, 4).map(row).join('')}</div>` : quiet('Save ideas here so they are ready when you plan.'), ['social/ideas', 'All ideas'])}
  </div>${dataTools()}`;
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
    ${panel('Planned', planned.length ? `<div class="lrows">${planned.map(row).join('')}</div>` : `${quiet('No workouts planned.')}<button class="btn small" data-act="new" data-v="workouts">Plan a workout</button>`, ['fit/workouts', 'All workouts'])}
    ${panel('Personal records', prs.length ? `<div class="lrows">${prs.map(p => `<div class="lrow"><button class="lmain" data-act="open" data-id="${p.exercise}"><b>${esc(relName(p.exercise))}</b><span>${esc(niceDate(p.date))}</span></button><span class="lside">${p.weight} kg × ${p.reps || 1}</span></div>`).join('')}</div>` : quiet('Log your sets and your best lifts show up here.'), ['fit/exercises', 'Exercises'])}
  </div>${dataTools()}`;
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
const dataTools = () => `<div class="ltools"><button class="chip link" data-act="import">Import from Notion</button><button class="chip link" data-act="export">Back up these lists</button></div>`;

/* ---------- editing a record ---------- */
function optsFor(kind, f, cur) {
  const out = [...(f.options || [])], seen = new Set(out.map(norm));
  const add = v => { if (v && !seen.has(norm(v))) { seen.add(norm(v)); out.push(v); } };
  for (const r of recs(kind)) [].concat(r[f.k] || []).forEach(add);
  [].concat(cur || []).forEach(add);
  return out;
}
function fieldInner(kind, f, D) {
  const v = D[f.k], id = 'lf-' + f.k;
  const lab = `<label for="${id}">${esc(f.label)}${f.unit ? ` <span class="muted">(${esc(f.unit)})</span>` : ''}</label>`;
  const span = `<span class="lflabel">${esc(f.label)}</span>`;
  switch (f.type) {
    case 'long': return lab + `<textarea id="${id}" data-k="${f.k}" rows="${f.rows || 4}">${esc(v || '')}</textarea>`;
    case 'num': case 'money': return lab + `<input id="${id}" type="number" inputmode="decimal" step="any" data-k="${f.k}" data-num value="${v ?? ''}">`;
    case 'date': return lab + `<input id="${id}" type="date" data-k="${f.k}" value="${esc(v || '')}">`;
    case 'time': return lab + `<input id="${id}" type="time" data-k="${f.k}" value="${esc(v || '')}">`;
    case 'url': return lab + `<div class="lurl"><input id="${id}" type="url" inputmode="url" data-k="${f.k}" value="${esc(v || '')}" placeholder="https://">${v ? `<a class="iconbtn" href="${esc(v)}" target="_blank" rel="noopener" aria-label="Open link">${svg(P.link)}</a>` : ''}</div>`;
    case 'check': return `<button type="button" class="chip lcheck" data-chk="${f.k}" aria-pressed="${!!v}">${v ? svg(P.check) : ''}${esc(f.label)}</button>`;
    case 'rating': return span + `<div class="lrating">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-rate="${f.k}" data-v="${n}" aria-label="${n} of 5" aria-pressed="${(v || 0) >= n}">${svg(P.star)}</button>`).join('')}</div>`;
    case 'select': case 'multi': {
      const sel = [].concat(v || []);
      return span + `<div class="lwrap">${optsFor(kind, f, v).map(o => `<button type="button" class="chip" data-opt="${f.k}" data-v="${esc(o)}" aria-pressed="${sel.includes(o)}">${esc(o)}</button>`).join('')}<input class="laddopt" data-addopt="${f.k}" placeholder="+ Add" aria-label="Add your own ${esc(f.label.toLowerCase())}" enterkeyhint="done"></div>`;
    }
    case 'photo': {
      const src = D._preview || (v ? C.photoURL(v) : '');
      return span + `<div class="lphoto">${src ? `<img referrerpolicy="no-referrer" src="${esc(src)}" alt="">` : ''}<div class="lphb"><label class="btn small">Choose photo<input type="file" accept="image/*" class="vh" data-photo="${f.k}"></label>${src ? `<button type="button" class="btn small ghost" data-photox="${f.k}">Remove</button>` : ''}</div><input type="url" inputmode="url" data-k="${f.k}" data-photourl value="${esc(/^https?:/.test(v || '') ? v : '')}" placeholder="or paste an image link (https://…)" aria-label="Image link"><p class="lphnote">Found it online? Right-click or long-press the product photo, choose Copy image address and paste it here.</p></div>`;
    }
    case 'rel': {
      const ids = [].concat(v || []).filter(x => L.byId[x]);
      return span + `<div class="lwrap">${ids.map(x => `<button type="button" class="chip on" data-relx="${f.k}" data-id="${x}" aria-label="Remove ${esc(relName(x))}">${esc(relName(x))} ×</button>`).join('')}</div>
        <input type="search" data-relq="${f.k}" placeholder="${ids.length && !f.multi ? 'Change' : 'Find or add'} ${esc(KINDS[f.to].one)}" aria-label="Find ${esc(KINDS[f.to].one)}" autocomplete="off"><div class="lwrap" data-relopts="${f.k}"></div>`;
    }
    default: return lab + `<input id="${id}" type="text" data-k="${f.k}" value="${esc(v || '')}">`;
  }
}
function openEditor(kind, id, preset = {}) {
  const K = KINDS[kind], r = id ? L.byId[id] : null;
  const D = r ? JSON.parse(JSON.stringify(dataOf(r))) : { created: Date.now(), ...preset };
  if (!r) for (const f of K.fields) if (f.type === 'date' && D[f.k] === undefined && ['date', 'start'].includes(f.k)) D[f.k] = today();
  const sh = C.sheet({
    title: r ? titleOf(r) : 'New ' + K.one,
    body: `<div class="form">${K.fields.map(f => `<div class="field ${f.half ? '' : 'full'}" data-f="${f.k}">${fieldInner(kind, f, D)}</div>`).join('')}</div>`,
    foot: `${r ? '<button class="btn danger" data-del>Delete</button>' : ''}<span class="busy" data-msg></span><div class="spacer"></div><button class="btn" data-close>Cancel</button><button class="btn primary" data-save>Save</button>`,
    onClose: () => { if (D._preview) URL.revokeObjectURL(D._preview); }
  });
  const fdef = k => K.fields.find(f => f.k === k);
  const redraw = k => { const el = sh.querySelector(`[data-f="${k}"]`); if (el) el.innerHTML = fieldInner(kind, fdef(k), D); };
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
    const box = t.closest('.lphoto'), v = t.value.trim();
    let img = box.querySelector(':scope > img');
    if (!/^https?:\/\/\S+$/.test(v)) { if (!D._preview) img?.remove(); return; }
    if (D._preview) { URL.revokeObjectURL(D._preview); D._preview = ''; }
    if (!img) { img = document.createElement('img'); img.referrerPolicy = 'no-referrer'; img.alt = ''; box.prepend(img); }
    img.onerror = () => { const n = box.querySelector('.lphnote'); if (n) n.textContent = 'That link doesn’t show a picture. Use the image address itself (right-click the photo, Copy image address).'; };
    img.onload = () => { const n = box.querySelector('.lphnote'); if (n) n.textContent = 'Shown from the web. Save to keep it.'; };
    img.src = v;
  };
  const pickRel = (k, rid) => { const f = fdef(k); D[k] = f.multi ? [...new Set([...[].concat(D[k] || []), rid])] : rid; redraw(k); if (f.multi) sh.querySelector(`[data-relq="${k}"]`)?.focus(); };
  sh.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.k) { D[t.dataset.k] = t.dataset.num !== undefined ? num(t.value) : t.value; if (t.dataset.photourl !== undefined) { D._blob = null; photoPreview(t); } }
    if (t.dataset.relq) relOpts(t.dataset.relq, t.value);
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
  sh.addEventListener('change', async e => {
    const t = e.target; if (!t.dataset.photo) return;
    const file = t.files?.[0]; if (!file) return;
    try { D._blob = await C.photoToJpeg(file); if (D._preview) URL.revokeObjectURL(D._preview); D._preview = URL.createObjectURL(D._blob); redraw(t.dataset.photo); }
    catch { C.toast('That photo could not be read. Try another one.'); }
  });
  sh.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.opt) { const f = fdef(d.opt); if (f.type === 'multi') { const a = [].concat(D[d.opt] || []); const i = a.indexOf(d.v); i >= 0 ? a.splice(i, 1) : a.push(d.v); D[d.opt] = a; } else D[d.opt] = D[d.opt] === d.v ? '' : d.v; redraw(d.opt); }
    else if (d.chk) { D[d.chk] = !D[d.chk]; redraw(d.chk); }
    else if (d.rate) { const n = Number(d.v); D[d.rate] = D[d.rate] === n ? 0 : n; redraw(d.rate); }
    else if (d.relx) { const f = fdef(d.relx); D[d.relx] = f.multi ? [].concat(D[d.relx] || []).filter(x => x !== d.id) : ''; redraw(d.relx); }
    else if (d.relpick) pickRel(d.relpick, d.id);
    else if (d.relnew) { const f = fdef(d.relnew); try { const nid = await create(f.to, { name: d.v }); pickRel(d.relnew, nid); } catch {} }
    else if (d.photox) { D[d.photox] = ''; D._blob = null; if (D._preview) URL.revokeObjectURL(D._preview); D._preview = ''; redraw(d.photox); }
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
        const pf = K.fields.find(f => f.type === 'photo');
        if (pf && D._blob) { msg.textContent = 'Uploading photo…'; const old = r?.[pf.k]; D[pf.k] = await C.uploadPhoto(D._blob); if (old && old !== D[pf.k]) C.deletePhoto(old); }
        else if (pf && r?.[pf.k] && r[pf.k] !== D[pf.k] && !/^https?:/.test(r[pf.k])) C.deletePhoto(r[pf.k]);
        const out = {}; for (const [k, v] of Object.entries(D)) if (!k.startsWith('_') && v !== '' && v != null && !(Array.isArray(v) && !v.length)) out[k] = v;
        if (out.name) out.name = String(out.name).trim();
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
async function importFile(file) {
  let rows;
  try {
    const j = JSON.parse(await file.text());
    rows = (Array.isArray(j) ? j : j.records || []).filter(r => r && r.id && KINDS[r.kind] && r.data && typeof r.data === 'object');
  } catch { rows = null; }
  if (!rows?.length) { C.toast('That file has no lists this app can read.'); return; }
  const keep = rows.filter(r => !r.photoData && /^https?:/.test(r.data.photo || '') && L.byId[r.id]?.photo && !/^https?:/.test(L.byId[r.id].photo));
  keep.forEach(r => { r.data.photo = L.byId[r.id].photo; });
  const counts = {}; for (const r of rows) counts[r.kind] = (counts[r.kind] || 0) + 1;
  const fresh = rows.filter(r => !L.byId[r.id]).length;
  const sh = C.sheet({
    title: 'Import from Notion',
    body: `<p>This adds ${plural(rows.length, 'record')}${fresh !== rows.length ? `, ${fresh} of them new. The other ${rows.length - fresh} are already here and get the values from the file; what the file leaves out stays as it is` : ''}.</p>
      <div class="lrows">${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<div class="lrow"><span class="lmain"><b>${esc(KINDS[k].many)}</b></span><span class="lside">${n}</span></div>`).join('')}</div>`,
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
      await putMany(rows.map(({ id, kind, data }) => ({ id, kind, data: L.byId[id] ? { ...dataOf(L.byId[id]), ...data } : data })), (n, all) => { msg.textContent = `Saving ${n} of ${all}…`; });
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
  <div class="panel lsetup"><p>Kitchen, Self-care, Home and Fitness keep their lists in a new table called <span class="mono">records</span>. Create it once and every device can use it:</p>
    <ol><li>Open your project on <a href="https://supabase.com/dashboard" target="_blank" rel="noopener">supabase.com</a> and go to <b>SQL Editor</b>.</li><li>Paste the code below and press <b>Run</b>.</li><li>Come back here and tap <b>Check again</b>.</li></ol>
    <pre class="lsql">${esc(SQL)}</pre>
    <div class="lbar"><button class="btn" data-act="copysql">Copy the code</button><button class="btn primary" data-act="recheck">Check again</button></div></div>`;
}

/* ---------- events ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if (!b || !C || b.closest('.sheet') && !['open', 'new'].includes(b.dataset.act)) return;
  const d = b.dataset, page = C.view(), u = PAGES[page] ? uiOf(page) : null;
  switch (d.act) {
    case 'open': openRecord(d.id); break;
    case 'new': openEditor(d.v, null); break;
    case 'quick': { const r = L.byId[d.id]; KINDS[r?.kind]?.quick?.(r)?.act(); break; }
    case 'go': C.go(d.v); break;
    case 'seg': u.seg = d.v; u.facet = ''; C.render(); break;
    case 'facet': u.facet = u.facet === d.v ? '' : d.v; C.render(); break;
    case 'filter': u.filter[curSeg(page).key] = d.v; C.render(); break;
    case 'showall': u.all = !u.all; C.render(); break;
    case 'lview': { const K = KINDS[curSeg(page).kind]; setViewMode(K, d.v); const host = b.closest('#viewHost'); if (host) host.dataset.sig = ''; C.render(); break; }
    case 'week': L.week = d.v === '0' ? 0 : L.week + Number(d.v); C.render(); break;
    case 'slot': openSlot(d.date, d.slot); break;
    case 'buy': { const r = L.byId[d.id]; if (r) { b.classList.add('on'); setTimeout(() => save(r, { list: false, stock: true }), 220); } break; }
    case 'unlist': { const r = L.byId[d.id]; if (r) save(r, { list: false }); break; }
    case 'tolist': { const r = L.byId[d.id]; if (r) { save(r, { list: true }); const inp = $('.lqadd input'); if (inp) { inp.value = ''; inp.focus(); } } break; }
    case 'supp': toggleSupp(d.id, d.t); break;
    case 'water': water(Number(d.v)); break;
    case 'watergoal': { const v = prompt('How many glasses a day?', C.prefs().waterGoal || 8); const n = Math.round(Number(v)); if (n > 0 && n < 40) C.savePrefs({ waterGoal: n }).catch(() => C.toast('Could not save. Try again.')); break; }
    case 'periodstart': create('cycles', { start: today() }).then(() => C.toast('Logged. Tap “Period ended” when it’s over.')).catch(() => {}); break;
    case 'periodend': { const r = L.byId[d.id]; if (r) save(r, { end: today() }); break; }
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
document.addEventListener('change', e => {
  const t = e.target; if (!C || !t.matches('[data-lsort]')) return;
  const page = C.view(); uiOf(page).sort[curSeg(page).key] = t.value; C.render();
});
document.addEventListener('submit', e => { if (e.target.matches('[data-qadd]')) { e.preventDefault(); quickAdd(e.target); } });

/* ---------- what index.html calls ---------- */
const sectionOf = view => SECTIONS.find(s => view.startsWith(s.key + '/'));
return {
  sections: SECTIONS.map(s => ({ key: s.key, label: s.label, icon: G(s.icon), views: s.views.map(([k, l, ic]) => [s.key + '/' + k, l, G(ic)]) })),
  has: view => !!PAGES[view],
  // one small card for the overview page; '' while the lists are still loading or missing
  tile(key) {
    const s = SECTIONS.find(x => x.key === key);
    if (!s?.tile || !C) return '';
    if (L.missing) return `<p class="lnone">Needs one step in Supabase.</p><button class="chip link" data-act="go" data-v="${key}/today">Set it up</button>`;
    if (L.status === 'loading' && !L.all.length) return '<p class="lnone">Loading…</p>';
    return s.tile();
  },
  start(bridge) { C = bridge; L.all = []; L.byId = {}; L.missing = false; L.status = cacheLoad() ? 'ok' : 'loading'; subscribe(); return load().catch(e => { console.error(e); if (L.status !== 'ok') L.status = 'offline'; C.render(); }); },
  refresh() { if (C?.uid()) load().catch(() => {}); },
  stop() { channel?.unsubscribe(); channel = null; },
  render(host, view) {
    const cfg = PAGES[view];
    if (!C) { host.dataset.sig = ''; host.innerHTML = `<div class="viewhead"><h1>${esc(cfg.title || sectionOf(view)?.label || '')}</h1><span class="sub">Connecting…</span></div>`; return; }
    if (L.missing) { setupCard(host); return; }
    if (L.status === 'loading' && !L.all.length) { host.dataset.sig = ''; host.innerHTML = `<div class="viewhead"><h1>${esc(cfg.title || sectionOf(view)?.label || '')}</h1><span class="sub">Loading…</span></div>`; return; }
    if (cfg.render) { host.dataset.sig = ''; cfg.render(host); } else listPage(host, view);
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
