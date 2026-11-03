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
const money = { format: n => { const c = (L.all.find(r => r.kind === 'fset')?.currency) || 'EUR'; if (c !== moneyCur) { moneyCur = c; moneyFmt = new Intl.NumberFormat('en-IE', { style: 'currency', currency: c }); } return moneyFmt.format(n); } };
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
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  phone: '<rect x="6.5" y="3" width="11" height="18" rx="2.5"/><path d="M10.5 18h3"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  handshake: '<path d="m3 11 4-4 3 1 3-2 3 1 5 4M3 11l5 5 2-1 2 2 2-1 2 1 4-5M10 8l-3 4 2 1 3-3"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
  gift: '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5V20h14v-7.5M12 8.5V20M12 8.5C10.5 5 7 4.5 7 6.8c0 1.7 5 1.7 5 1.7Zm0 0c1.5-3.5 5-4 5-1.7 0 1.7-5 1.7-5 1.7Z"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"/>',
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
const NIGHTS = ['Acid night', 'Retinoid night', 'Recovery night'];
// tasks and projects (Social), habits, routines, gifts and documents (Life)
const TASK_STATUS = ['Not started', 'In progress', 'Completed'];
const TASK_CATS = ['Finances', 'Fitness', 'Growth', 'Household', 'Nutrition', 'Planning', 'Productivity', 'Self-Care'];
const ROUTINES = ['Morning', 'Evening', 'Weekly', 'Monthly'];
const GIFT_STATUS = ['Idea', 'To buy', 'Ordered', 'Received', 'Wrapped', 'Given'];
const taskDone = r => r.status === 'Completed';
const projTasks = p => recs('tasks').filter(t => [].concat(t.project || []).includes(p.id));
// habits and routines keep the days you ticked them as a list of dates on the record itself
const daysSet = r => new Set([].concat(r.days || []));
const weekDays = () => { const w = weekStart(0); return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(w, i)); };
const weekDone = r => { const s = daysSet(r); return weekDays().filter(d => s.has(d)).length; };
function streak(r) {
  const s = daysSet(r), per = Math.min(7, num(r.per) || 7);
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
const routineNow = () => { const want = new Date().getHours() >= 15 ? 'Evening' : 'Morning'; return { label: want, list: recs('routines').filter(r => r.routine === want).sort((a, b) => (a.created || 0) - (b.created || 0) || norm(a.name).localeCompare(norm(b.name))) }; };
// growth: the life areas from your Notion dashboard
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
// tile sets for savings challenges
const GRID_PRESETS = { '100 envelopes (€1 to €100)': () => Array.from({ length: 100 }, (_, i) => i + 1), '52 weeks (€1 to €52)': () => Array.from({ length: 52 }, (_, i) => i + 1), '€5 a day for 30 days': () => Array(30).fill(5), '€10 to €100 (20 tiles)': () => Array.from({ length: 20 }, (_, i) => 10 + Math.round(i * 90 / 19 / 5) * 5) };
const WEEK = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
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
      F('fav', 'Favourite', 'check', { half: 1 }), F('finished', 'Finished', 'check', { half: 1 }), F('wish', 'On my wishlist', 'check', { half: 1 }),
      F('nights', 'Evenings', 'multi', { options: NIGHTS }), F('acid', 'Counts as an acid', 'check', { half: 1 }),
      F('url', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['brand', 'Brand'], ['-rating', 'Best rated'], ['expiry', 'Use first'], ['-bought', 'Newest']],
    filters: [['all', 'All'], ['own', 'I have'], ['want', 'Wishlist']],
    filter: (r, f) => f === 'own' ? !r.wish : f === 'want' ? !!r.wish : true,
    hide: r => r.finished || r.archived, hideLabel: 'Show finished',
    sub: r => [r.wish ? 'Wishlist' : '', r.brand, r.type, r.texture, r.am && r.pm ? 'AM + PM' : r.am ? 'AM' : r.pm ? 'PM' : ''].filter(Boolean).join(' · '),
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
      F('fee', 'Fee', 'money', { half: 1 }), F('contact', 'Contact', 'text', { half: 1 }),
      F('deliverables', 'Deliverables', 'long'), F('url', 'Link', 'url'), F('notes', 'Notes', 'long')],
    sorts: [['due', 'Due first'], ['-due', 'Newest']],
    hide: r => r.status === 'Paid' || r.status === 'Declined', hideLabel: 'Show finished',
    sub: r => [r.status, r.type, r.due && 'due ' + niceDate(r.due), eur(r.fee)].filter(Boolean).join(' · ')
  },
  bsched: {
    one: 'week schedule', many: 'Week schedule',
    fields: WEEK.map(([k, l]) => F(k, l, 'select', { options: NIGHTS, half: 1 })),
    title: () => 'Skincare week',
    sub: r => WEEK.map(([k, l]) => `${l.slice(0, 2)} ${(r[k] || '–').replace(' night', '')}`).join(' · ')
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
    fields: [F('name', 'Name'), F('type', 'Type', 'select', { options: ['Spending', 'Savings', 'Card'], half: 1 }),
      F('safe', 'Counts toward safe to spend', 'check', { half: 1 }), F('archived', 'Archived', 'check', { half: 1 }), F('iban', 'IBAN (for bank imports)'), F('notes', 'Notes', 'long')],
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
      F('category', 'Category', 'rel', { to: 'fcats', half: 1 }), F('account', 'Paid from', 'rel', { to: 'faccounts', half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['-date', 'Newest'], ['-amount', 'Biggest'], ['name', 'A to Z']],
    sub: r => [niceDate(r.date), relName(r.category), relName(r.account), r.bill ? 'bill' : r.debt ? 'debt payment' : ''].filter(Boolean).join(' · '),
    side: r => eur(num(r.amount))
  },
  fincome: {
    one: 'payment in', many: 'Money in', facet: 'type',
    fields: [F('name', 'From'), F('amount', 'Amount', 'money', { half: 1 }), F('date', 'Date', 'date', { half: 1 }),
      F('type', 'Type', 'select', { options: ['Pay', 'Other'], half: 1 }), F('account', 'Into', 'rel', { to: 'faccounts', half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['-date', 'Newest'], ['-amount', 'Biggest']],
    sub: r => [niceDate(r.date), r.type, relName(r.account)].filter(Boolean).join(' · '), side: r => '+' + eur(num(r.amount))
  },
  fbills: {
    one: 'repeat', many: 'Repeats', facet: 'type',
    fields: [F('name', 'Name'), F('amount', 'Amount', 'money', { half: 1 }), F('type', 'Type', 'select', { options: ['Bill', 'Subscription', 'Debt'], half: 1 }),
      F('cadence', 'How often', 'select', { options: ['Monthly', 'Every N months', 'Yearly', 'Weekly'], half: 1 }), F('every', 'Every how many', 'num', { half: 1 }),
      F('anchor', 'First due', 'date', { half: 1 }), F('ends', 'Ends', 'date', { half: 1 }),
      F('account', 'Paid from', 'rel', { to: 'faccounts', half: 1 }), F('category', 'Category', 'rel', { to: 'fcats', half: 1 }),
      F('debt', 'Pays off debt', 'rel', { to: 'fdebts', half: 1 }), F('active', 'Active', 'check', { half: 1 }), F('url', 'Link', 'url'), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['-amount', 'Biggest']], hide: r => r.active === false, hideLabel: 'Show stopped',
    sub: r => { const n = fNext(r); return [r.type, fCadence(r), n ? 'next ' + niceDate(n) : 'no next date'].filter(Boolean).join(' · '); },
    side: r => eur(num(r.amount))
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
    fields: [F('name', 'Habit'), F('per', 'Times a week', 'num', { half: 1 }), F('area', 'Area', 'select', { options: TASK_CATS, half: 1 }), F('goal', 'Goal', 'rel', { to: 'lgoals', half: 1 }),
      F('why', 'Why it matters', 'long'), F('paused', 'Paused', 'check')],
    sorts: [['name', 'A to Z'], ['-created', 'Newest']],
    hide: r => !!r.paused, hideLabel: 'Show paused',
    sub: r => [`${weekDone(r)} of ${Math.min(7, num(r.per) || 7)} this week`, streak(r)].filter(Boolean).join(' · '),
    quick: r => ({ on: daysSet(r).has(today()), label: 'Today', act: () => toggleDay(r) })
  },
  routines: {
    one: 'routine step', many: 'Routines', facet: 'routine',
    fields: [F('name', 'Activity'), F('routine', 'Routine', 'select', { options: ROUTINES, half: 1 }),
      F('freq', 'How often', 'select', { options: ['1x/week', '2x/week', '3x/week', '4x/week', '5x/week', '6x/week', '7x/week'], half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['routine', 'By routine'], ['name', 'A to Z']],
    sub: r => [r.routine, r.freq, r.notes].filter(Boolean).join(' · '),
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
  gifts: {
    one: 'gift', many: 'Gifts', facet: 'status', photo: 'photo',
    fields: [F('name', 'Gift'), F('for', 'For'), F('occasion', 'Occasion', 'select', { options: ['Birthday', 'Christmas', 'Sinterklaas', 'Anniversary', "Mother's Day", "Father's Day", 'Graduation', 'Housewarming', 'Baby shower', 'Thank you'], half: 1 }),
      F('status', 'Status', 'select', { options: GIFT_STATUS, half: 1 }), F('type', 'Type', 'select', { options: ['Physical', 'Experience', 'DIY', 'Subscription', 'Digital', 'Card'], half: 1 }),
      F('price', 'Price', 'money', { half: 1 }), F('shop', 'Where to buy', 'text', { half: 1 }), F('given', 'Given on', 'date', { half: 1 }),
      F('url', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['for', 'By person'], ['-created', 'Newest'], ['name', 'A to Z']],
    hide: r => r.status === 'Given', hideLabel: 'Show given',
    sub: r => [r.for && 'for ' + r.for, r.occasion, r.status, eur(r.price)].filter(Boolean).join(' · ')
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
const tileList = (list, n = 3) => list.length ? `<div class="lrows">${list.slice(0, n).map(row).join('')}</div>${list.length > n ? `<p class="lnone">+${list.length - n} more</p>` : ''}` : '';
function kitchenTile() {
  const t = today(), meals = recs('meals').filter(m => m.date === t), groc = recs('ingredients').filter(i => i.list).length;
  return tileBody([
    `<div class="lslots">${MEALS.filter(s => s !== 'Snack' || meals.some(m => m.slot === s)).map(s => { const m = meals.filter(x => x.slot === s); return `<div class="lslot"><span class="rowlbl">${s}</span>${m.map(x => `<button class="chip" data-act="open" data-id="${x.id}">${esc(titleOf(x))}</button>`).join('')}<button class="chip ghost" data-act="slot" data-date="${t}" data-slot="${s}" aria-label="Plan ${s.toLowerCase()}">+</button></div>`; }).join('')}</div>`,
    `<button class="chip link" data-act="go" data-v="kitchen/groceries">${groc ? plural(groc, 'thing') + ' on your grocery list' : 'Grocery list is empty'}</button>`
  ]);
}
// evening skincare follows the week schedule: products tagged for tonight's kind of evening (or for every evening),
// and on an acid night the acids are offered as a choice, never all at once
const nightOf = (d = new Date()) => recs('bsched')[0]?.[['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()]] || '';
function routineFor(eve) {
  const type = eve ? nightOf() : '', ps = recs('beauty').filter(b => !b.finished && !b.archived && !b.wish && (eve ? b.pm : b.am));
  if (!eve || !type) return { type, ps: eve ? ps : ps.filter(b => !b.acid || !(b.nights || []).length), pick: [] };
  const fits = ps.filter(b => !(b.nights || []).length || b.nights.includes(type));
  return { type, ps: fits.filter(b => !b.acid), pick: type === 'Acid night' ? fits.filter(b => b.acid) : [] };
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
    `<div class="lwater small"><button class="iconbtn small" data-act="water" data-v="-1" aria-label="One glass less" ${glasses ? '' : 'disabled'}>${svg(P.minus)}</button><div class="lwv"><b>${glasses}</b><span>of ${goal} glasses</span></div><button class="iconbtn small lplus" data-act="water" data-v="1" aria-label="One more glass">${svg(P.plus)}</button></div>`,
    doses ? `<p class="dline"><span>Supplements</span><b>${Math.min(taken, doses)} of ${doses} taken</b></p>` : '',
    cy.last ? `<p class="dline"><span>Cycle</span><b>${cy.open ? 'period, day ' + cy.day : 'day ' + cy.day + ', next ' + relDay(cy.next)}</b></p>` : '',
    appt ? `<p class="dline"><span>Next appointment</span><b>${esc(titleOf(appt))}, ${esc(relDay(appt.date))}${appt.time ? ' ' + esc(appt.time) : ''}</b></p>` : '',
    prods.length || rt.pick.length ? `<p class="dsub">${eve ? esc(rt.type || 'Evening') : 'Morning'} skincare</p><div class="lwrap">${prodChips(prods)}</div>${rt.pick.length ? `<p class="lnone">Choose one acid:</p><div class="lwrap">${prodChips(rt.pick)}</div>` : ''}` : '',
    routineTile(),
    sl ? `<p class="dline"><span>Sleep</span><b>${esc([sl.hours ? sl.hours + ' h' : 'logged', sl.quality?.toLowerCase()].filter(Boolean).join(', '))}</b></p>` : '',
    j ? `<p class="dline"><span>Journal</span><b><button class="chip link" data-act="open" data-id="${j.id}">${esc(titleOf(j))}</button></b></p>` : '',
    sl && j ? '' : `<div class="dbtns">${sl ? '' : '<button class="btn small" data-act="new" data-v="sleep">Log last night</button>'}${j ? '' : '<button class="btn small" data-act="new" data-v="journal">Write today’s entry</button>'}</div>`
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
  const due = tasksDue();
  return tileBody([
    due.length ? `<p class="dsub">Tasks today${due.some(x => x.date < t) ? ' and overdue' : ''}</p>${tileList(due, 4)}` : recs('tasks').length ? '<p class="lnone">No tasks due today.</p>' : '',
    now.length ? `<p class="dsub">Posting today</p>${tileList(now)}` : `<p class="lnone">${posts.length ? 'Nothing to post today.' : 'No posts planned yet.'}</p>`,
    dl ? `<p class="dline"><span>Next</span><b>${esc(dl.what)}, ${esc(relDay(dl.date))}</b></p>` : ''
  ]);
}
function fitTile() {
  const t = today(), ws = recs('workouts');
  const now = ws.filter(w => w.date === t && !w.skipped);
  const next = ws.filter(w => !w.done && !w.skipped && w.date && w.date > t).sort((a, b) => a.date.localeCompare(b.date))[0];
  const wk = weekStart(0), week = ws.filter(w => w.done && w.date >= wk && w.date <= addDays(wk, 6)).length;
  const vw = todayVW(), vwDone = vw && ws.some(w => w.video === vw.id && w.date === t && w.done);
  return tileBody([
    vw ? `<p class="dsub">Today's video</p><div class="lrow"><button class="lmain" data-act="open" data-id="${vw.id}"><b>${esc(vw.name)}</b><span>${esc(KINDS.vworkouts.sub(vw))}</span></button>${tick(vwDone ? 'Done' : 'Do it now', vwDone, `data-act="${vwDone ? 'open' : 'quick'}" data-id="${vw.id}"`)}</div>` : '',
    now.length ? tileList(now) : vw ? '' : '<p class="lnone">No workout today.</p>',
    next && !now.length ? `<p class="dline"><span>Next</span><b>${esc(titleOf(next))}, ${esc(relDay(next.date))}</b></p>` : '',
    `<p class="dline"><span>This week</span><b>${plural(week, 'workout')} done</b></p>`,
    now.length ? '' : '<button class="btn small" data-act="new" data-v="workouts">Plan a workout</button>'
  ]);
}

/* ---------- sections and their pages ---------- */
const SECTIONS = [
  { key: 'kitchen', label: 'Kitchen', icon: P.pot, tile: kitchenTile, views: [['today', 'Overview', P.grid], ['recipes', 'Recipes', P.book], ['meals', 'Meal plan', P.calendar], ['groceries', 'Groceries', P.cart], ['pantry', 'Pantry', P.jar], ['gear', 'Gear', P.spoon]] },
  { key: 'care', label: 'Life', icon: P.sparkle, tile: careTile, views: [['today', 'Overview', P.grid], ['habits', 'Habits', P.repeat], ['growth', 'Growth', P.target], ['beauty', 'Beauty', P.drop], ['supplements', 'Supplements', P.pill], ['cycle', 'Cycle', P.moon], ['journal', 'Journal', P.pen], ['health', 'Health', P.pulse], ['ideas', 'Ideas', P.star], ['gifts', 'Gifts', P.gift], ['docs', 'Documents', P.doc]] },
  { key: 'money', label: 'Finance', icon: P.wallet, tile: moneyTile, views: [['today', 'Today', P.sun], ['spending', 'Spending', P.coins], ['repeats', 'Repeats', P.repeat], ['plan', 'Goals', P.target], ['debt', 'Debt', P.card], ['forecast', 'Forecast', P.trend], ['year', 'Year', P.calendar], ['networth', 'Net worth', P.wallet], ['reviews', 'Reviews', P.doc], ['settings', 'Settings', P.gear]] },
  { key: 'home', label: 'Home', icon: P.house, tile: homeTile, views: [['today', 'Overview', P.grid], ['chores', 'Chores', P.broom], ['plants', 'Plants', P.leaf], ['inventory', 'Inventory', P.box], ['repairs', 'Repairs', P.wrench]] },
  { key: 'social', label: 'Social', icon: P.phone, tile: socialTile, views: [['today', 'Overview', P.grid], ['tasks', 'Tasks', P.check], ['projects', 'Projects', P.list], ['feed', 'Feed', P.grid], ['posts', 'Posts', P.phone], ['ideas', 'Ideas', P.star], ['goals', 'Goals', P.target], ['collabs', 'Collabs', P.handshake], ['brand', 'Brand', P.user]] },
  { key: 'fit', label: 'Fitness', icon: P.dumbbell, tile: fitTile, views: [['today', 'Overview', P.grid], ['workouts', 'Workouts', P.run], ['library', 'Videos', P.star], ['fgoals', 'Goals', P.target], ['plans', 'Plans', P.list], ['exercises', 'Exercises', P.dumbbell], ['body', 'Body', P.scale], ['gear', 'Gear', P.box]] }
];
const PAGES = {
  'kitchen/today': { render: kitchenToday, adds: ['meals', 'recipes', 'ingredients', 'mealprep'] },
  'kitchen/recipes': { title: 'Recipes', segs: [{ kind: 'recipes' }] },
  'kitchen/meals': { title: 'Meal plan', segs: [{ key: 'week', label: 'Week', kind: 'meals', fill: weekFill, tools: false }, { kind: 'mealprep' }] },
  'kitchen/groceries': { title: 'Groceries', segs: [{ key: 'list', label: 'Shopping list', kind: 'ingredients', fill: groceryFill, tools: false }] },
  'kitchen/pantry': { title: 'Pantry', segs: [{ kind: 'ingredients' }] },
  'kitchen/gear': { title: 'Kitchen gear', segs: [{ kind: 'gear' }] },
  'care/today': { render: careToday, adds: ['lgoals', 'courses', 'hobbies', 'habits', 'routines', 'journal', 'sleep', 'beauty', 'supplements', 'appts', 'symptoms', 'meditation', 'ideas', 'gifts', 'documents'] },
  'care/beauty': { title: 'Beauty', segs: [{ kind: 'beauty' }, { kind: 'bsched', label: 'Week schedule' }] },
  'care/supplements': { title: 'Supplements', segs: [{ kind: 'supplements' }, { kind: 'suplog' }] },
  'care/cycle': { title: 'Cycle', segs: [{ kind: 'cycles', label: 'Periods', top: cycleTop }] },
  'care/journal': { title: 'Journal', segs: [{ kind: 'journal' }] },
  'care/ideas': { title: 'Ideas', segs: [{ kind: 'ideas' }] },
  'care/habits': { title: 'Habits', segs: [{ kind: 'habits', top: habitWeek }, { kind: 'routines' }] },
  'care/gifts': { title: 'Gifts', segs: [{ kind: 'gifts' }] },
  'care/growth': { title: 'Growth', segs: [{ kind: 'lgoals', top: growthTop }, { kind: 'courses' }, { kind: 'hobbies' }] },
  'care/docs': { title: 'Documents', segs: [{ kind: 'documents' }] },
  'social/tasks': { title: 'Tasks', segs: [{ kind: 'tasks' }] },
  'social/projects': { title: 'Projects', segs: [{ kind: 'projects' }] },
  'social/today': { render: socialToday, adds: ['tasks', 'projects', 'posts', 'cideas', 'deals', 'sgoals'] },
  'social/posts': { title: 'Posts', segs: [{ kind: 'posts' }] },
  'social/feed': { render: socialFeed, adds: ['posts', 'highlights', 'accounts'] },
  'social/ideas': { title: 'Content ideas', segs: [{ kind: 'cideas' }] },
  'social/goals': { title: 'Goals', segs: [{ kind: 'sgoals' }, { kind: 'accounts' }] },
  'social/collabs': { title: 'Collabs', segs: [{ kind: 'deals' }] },
  'social/brand': { title: 'Brand', segs: [{ kind: 'pillars' }, { kind: 'accounts' }] },
  'care/health': { title: 'Health', segs: [{ kind: 'sleep' }, { kind: 'appts' }, { kind: 'symptoms' }, { kind: 'meditation' }, { kind: 'water' }] },
  'money/today': { render: moneyToday, adds: ['ftx', 'fincome', 'fbills', 'fchecks'] },
  'money/spending': { title: 'Spending', segs: [{ key: 'plan', label: 'Your plan', kind: 'ftx', fill: fEnvFill, tools: false }, { kind: 'ftx' }, { kind: 'fincome' }, { key: 'all', label: 'Everything in and out', kind: 'ftx', fill: fAllFill, tools: false }] },
  'money/repeats': { title: 'Repeats', segs: [{ key: 'coming', label: 'Coming up', kind: 'fbills', fill: fComingFill, tools: false }, { key: 'cal', label: 'Calendar', kind: 'fbills', fill: fCalFill, tools: false }, { key: 'bills', label: 'Bills', kind: 'fbills', fill: fBillsOf('Bill'), tools: false }, { key: 'subs', label: 'Subscriptions', kind: 'fbills', fill: fBillsOf('Subscription'), tools: false }, { key: 'in', label: 'Money in', kind: 'fincome' }, { key: 'split', label: 'Split my pay', kind: 'fbills', fill: fSplitFill, tools: false }, { kind: 'fbills', label: 'All repeats' }, { kind: 'fpaid' }] },
  'money/plan': { title: 'Goals', segs: [{ kind: 'fgoals', top: fGoalsTop }, { key: 'safety', label: 'Safety net', kind: 'fgoals', fill: fSafetyFill, tools: false }, { key: 'chall', label: 'Challenges', kind: 'fgrid', fill: fChallFill, tools: false }, { key: 'wait', label: 'Wait list', kind: 'fwait', fill: fWaitFill, tools: false }] },
  'money/settings': { render: fSettings, adds: ['faccounts', 'fcats', 'frules', 'fchips', 'fset'] },
  'money/debt': { title: 'Debt', segs: [{ key: 'free', label: 'Debt-free date', kind: 'fdebts', fill: fDebtFreeFill, tools: false }, { key: 'method', label: 'Snowball or avalanche', kind: 'fdebts', fill: fMethodFill, tools: false }, { kind: 'fdebts', label: 'Your debts' }, { key: 'made', label: 'Payments made', kind: 'ftx', fill: fPaymentsFill, tools: false }] },
  'money/forecast': { render: moneyForecast, adds: ['ftx', 'fbills', 'fincome'] },
  'money/year': { render: moneyYear, adds: ['fbills'] },
  'money/networth': { title: 'Net worth', segs: [{ key: 'nw', label: 'Net worth', kind: 'faccounts', fill: fNetFill, tools: false }, { kind: 'faccounts' }, { kind: 'fchecks' }, { kind: 'fset', label: 'Payday and buffer' }] },
  'money/reviews': { render: moneyReviews, adds: ['ftx', 'fincome'] },
  'home/today': { render: homeToday, adds: ['chores', 'plants', 'inventory', 'repairs'] },
  'home/chores': { title: 'Chores', segs: [{ kind: 'chores' }] },
  'home/plants': { title: 'Plants', segs: [{ kind: 'plants' }] },
  'home/inventory': { title: 'Inventory', segs: [{ kind: 'inventory' }] },
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
// a sort rule fills in the category (and a cleaner name) of a new purchase that has none
const ruleFor = name => { const n = norm(name); return n ? recs('frules').find(r => r.contains && n.includes(norm(r.contains))) : null; };
function applyRule(kind, id, data) {
  if (kind !== 'ftx' || L.byId[id] || data.category) return data;
  const r = ruleFor(data.name); if (!r) return data;
  return { ...data, category: r.category || '', ...(r.rename ? { name: r.rename } : {}) };
}
async function put(kind, id, data) {
  data = applyRule(kind, id, data);
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
const viewMode = K => { try { const v = localStorage.getItem('lview:' + K.kind); if (v === 'rows' || v === 'cards') return v; } catch {} return K.display === 'cards' || (hasPhotos(K) && recs(K.kind).some(r => r.photo)) ? 'cards' : 'rows'; };  // lists with photos open as a grid
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
  const val = r => k === 'routine' ? (ROUTINES.includes(r.routine) ? ROUTINES.indexOf(r.routine) : 9) : k === 'prio' ? (PRIO.includes(r.priority) ? PRIO.indexOf(r.priority) : 9) : k === 'time' ? (totalTime(r) || 1e9) : k === 'due' && ['chores', 'plants'].includes(r.kind) ? (r.kind === 'plants' ? (plantDue(r) || '9999') : choreDue(r)) : k === 'name' ? norm(titleOf(r)) : r[k];
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
        ${sorts.length > 1 ? `<select class="pill" data-lsort aria-label="Sort">${sorts.map(([k, l]) => `<option value="${k}" ${(u.sort[seg.key] || sorts[0][0]) === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>` : ''}${viewSwitch(K)}<button class="btn small" data-act="selmode" data-selbtn>Select</button></div>
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
  const K = KINDS[kind], ids = [...L.sel.ids], fs = K.fields.filter(f => ['select', 'multi', 'check'].includes(f.type));
  const sh = C.sheet({ title: `Change ${ids.length} ${ids.length === 1 ? K.one : (K.ones || K.one + 's')}`, body: `<div class="lslot"><span class="rowlbl">Field</span>${fs.map((f, i) => `<button class="chip" data-sf="${i}">${esc(f.label)}</button>`).join('')}</div><div data-svals></div>` });
  let f = null;
  sh.addEventListener('click', async e => {
    const b = e.target.closest('[data-sf]');
    if (b) {
      f = fs[+b.dataset.sf]; sh.querySelectorAll('[data-sf]').forEach(x => x.setAttribute('aria-pressed', x === b));
      const vals = f.type === 'check' ? [['1', 'Yes'], ['0', 'No']] : optsFor(kind, f).map(o => [o, o]);
      sh.querySelector('[data-svals]').innerHTML = `<p class="lnone">${f.type === 'multi' ? 'Adds this to each one:' : 'Sets this on each one:'}</p><div class="lwrap">${vals.map(([v, l]) => `<button class="chip" data-sv="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
      return;
    }
    const v = e.target.closest('[data-sv]')?.dataset.sv; if (v == null || !f) return;
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
/* ---------- money ----------
   Built on the Ultimate Budget Planner's model: a balance check per account plus everything logged since,
   minus the bills still due before payday, minus a safety buffer, spread over the days left. */
const addMonths = (s, n) => { const d = fromISO(s), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return iso(d); };
const fset = () => recs('fset')[0] || {};
const fBuffer = () => num(fset().buffer) ?? 100;
const fSeq = r => num(r.seq) ?? (r.created || 0);
const fSum = (list, k = 'amount') => list.reduce((n, x) => n + (num(x[k]) || 0), 0);
const fAccs = () => recs('faccounts').filter(a => !a.archived);
const fEur0 = n => (n < 0 ? '−' : '') + money.format(Math.abs(n)).replace(/\.00$/, '');
const fSigned = n => (n < 0 ? '−' : '') + eur(Math.abs(n));
function fPayday() { let p = fset().payday; if (!p) return null; const t = today(); for (let i = 0; p <= t && i < 600; i++) p = addMonths(p, 1); return p; }
const fStart = () => { const p = fPayday(); return p ? addMonths(p, -1) : addDays(today(), -30); };
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
  const counts = o => !o.paid && !o.skipped && (!o.bill.account || safeIds.has(o.bill.account));
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
    `<p class="dline"><span>Safe to spend today</span><b>${fSigned(st.perDay)}</b></p>`,
    st.pay ? `<p class="dline"><span>Until payday</span><b>${fSigned(st.until)} · ${plural(st.days, 'day')}</b></p>` : '',
    st.overdue.length ? `<p class="dline"><span>Overdue</span><b>${esc(st.overdue[0].bill.name)} ${eur(st.overdue[0].amount)}</b></p>` : next ? `<p class="dline"><span>Next bill</span><b>${esc(next.bill.name)}, ${esc(relDay(next.date))}</b></p>` : ''
  ]);
}

const MP = (t, body, more, id = '') => `<section class="panel lpanel mpanel" ${id ? `id="m-${id}"` : ''}><div class="lph3"><h3 class="mh">${esc(t)}</h3>${more || ''}</div>${body}</section>`;
const mLink = (label, v) => `<button class="chip link" data-act="go" data-v="${v}">${esc(label)}</button>`;
const TYPE_COL = { Bill: 'var(--c8)', Subscription: 'var(--c6)', Debt: 'var(--c7)', Pay: 'var(--c5)' };
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
  const occs = fOccs(st.start, end).filter(st.counts), paydays = new Set();
  for (let p = st.pay, i = 0; p && p <= end && i < 40; p = addMonths(p, 1), i++) paydays.add(p);
  let v = st.inAcc - fSum(occs.filter(o => o.date < st.t)); const pts = [];
  for (let i = 0; i <= n; i++) {
    const d = addDays(st.t, i), ev = [], due = occs.filter(o => o.date === d);
    if (due.length) { v -= fSum(due); ev.push(due.some(o => o.type === 'Debt') ? 'debt' : 'bill'); }
    if (paydays.has(d)) { v += pay; ev.push('in'); }
    if (extra?.amount && d === extra.date) { v -= extra.amount; ev.push('buy'); }
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
    <p class="mlegend"><span><i class="mdotk"></i>bill or subscription</span><span><i class="mdotk debt"></i>debt payment</span><span><i class="mdotk in"></i>money in</span><span>- - - protected ${fEur0(st.buf)} (your buffer)</span></p>
    <p class="mmuted">Assumes you spend ${fSigned(Math.max(0, st.perDay))} a day until payday${st.pay ? ' on ' + esc(shortDate(st.pay)) : ''} (today’s safe amount), then about ${eur(pace)} a day, your usual on the ${plural(days, 'day')} you tracked. Bills and pay land on their dates.</p>
    <div class="mwhatif"><p class="mwh"><b>What if I buy something?</b><span>Slide to try a purchase.</span></p>
      <label class="mslide"><span>How much</span><input type="range" min="0" max="2000" step="10" value="${w.amount}" data-fw="amount"><b data-fwv="amount">${fEur0(w.amount)}</b></label>
      <label class="mslide"><span>When</span><input type="range" min="0" max="${n}" step="1" value="${Math.min(w.off, n)}" data-fw="off"><b data-fwv="off">${esc(shortDate(extra.date))}</b></label></div>`)}`;
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
  const lim = L.fall || 120, groups = new Map();
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
  const jump = [['m-r-health', 'Money health'], ['m-r-went', 'Where the money went'], ['m-r-added', 'How the month added up'], ['m-r-against', 'Against last month'], ['m-r-12', '12 months'], ['m-r-year', 'This year']];
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
  ${MP(`This year, ${yr}`, `<div class="mpair m3"><p><span>Came in</span><b class="mgood">${fEur0(yIn)}</b></p><p><span>Went out</span><b>${fEur0(yOut)}</b></p><p><span>Difference</span><b>${fSigned(yIn - yOut)}</b></p></div>`, '', 'r-year')}`;
  if (!host.dataset.rwired) {
    host.dataset.rwired = '1';
    host.addEventListener('click', e => { const b = e.target.closest('[data-rmon]'); if (b) { L.rmon = Math.max(0, (L.rmon || 0) + Number(b.dataset.rmon)); moneyReviews(host); return; } const j = e.target.closest('[data-jump]'); if (j) document.getElementById(j.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }
}

function moneyToday(host) {
  if (!recs('faccounts').length) { host.innerHTML = `${head('Money')}<div class="panels">${panel('Start here', `${quiet('Import your Budget Planner backup, or add your accounts and check your balances.')}<button class="btn small" data-act="new" data-v="faccounts">Add an account</button>`)}</div>${dataTools()}`; return; }
  const st = fState(), t = st.t, s = fset(), hr = new Date().getHours();
  const tx = recs('ftx'), every = tx.filter(fEveryday);
  const payTx = every.filter(x => x.date >= st.start && x.date <= t), spentPay = fSum(payTx);
  const envelopes = fSum(recs('fcats'), 'budget');
  const nextBill = st.due.find(o => o.date >= t);
  const [whole, cents] = Math.abs(st.perDay).toFixed(2).split('.');
  const chips = recs('fchips');
  /* safe to spend */
  const safe = `<section class="panel msafe" id="m-safe"><div class="msafe-l"><p class="mh">Safe to spend today</p>
      <p class="mbig ${st.perDay < 0 ? 'neg' : ''}"><small>${st.perDay < 0 ? '−' : ''}€</small>${Number(whole).toLocaleString('en-GB')}<sup>.${cents}</sup></p>
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
  const pays = s.payday ? days35.filter(d => fromISO(d).getDate() === fromISO(fPayday() || s.payday).getDate() && d >= addDays(fPayday() || s.payday, -1)) : [];
  const outNext = fSum(occ35.filter(o => !o.paid && !o.skipped && o.date >= t)), inNext = pays.filter(d => d >= t).length * (num(s.payAmount) || 0);
  const chip = (amt, ty, paid) => `<span class="mpay ${paid ? 'paid' : ''}" style="--c:${TYPE_COL[ty] || TYPE_COL.Bill}">${fEur0(amt)}</span>`;
  const cal = `<div class="mcal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<b class="mdow">${d}</b>`).join('')}${days35.map(d => { const os = occ35.filter(o => o.date === d), dd = fromISO(d); const items = [...(pays.includes(d) ? [chip(num(s.payAmount) || 0, 'Pay')] : []), ...os.map(o => chip(o.amount, o.type, o.paid))]; return `<div class="mday ${d === t ? 'now' : ''} ${d < t ? 'past' : ''}"><span>${dd.getDate() === 1 ? dd.toLocaleDateString('en-GB', { month: 'short' }) + ' 1' : d === t ? shortDate(d) : dd.getDate()}</span>${items.slice(0, 2).join('')}${items.length > 2 ? `<em>+${items.length - 2}</em>` : ''}</div>`; }).join('')}</div>
    <p class="mlegend">${Object.entries(TYPE_COL).map(([k, c]) => `<span><i style="background:${c}"></i>${k}</span>`).join('')}</p>`;
  /* every day this month */
  const m0 = t.slice(0, 8) + '01', mDays = new Date(fromISO(t).getFullYear(), fromISO(t).getMonth() + 1, 0).getDate();
  const perDayMap = new Map(); for (const x of every) if (x.date.startsWith(t.slice(0, 7))) perDayMap.set(x.date, (perDayMap.get(x.date) || 0) + (num(x.amount) || 0));
  const past = Array.from({ length: fromISO(t).getDate() }, (_, i) => addDays(m0, i)), maxDay = Math.max(1, ...past.map(d => perDayMap.get(d) || 0));
  const lvl = v => !v ? 0 : Math.min(4, 1 + Math.floor(3 * v / maxDay));
  const zero = past.filter(d => !(perDayMap.get(d) > 0)).length, monthSpend = past.reduce((n, d) => n + (perDayMap.get(d) || 0), 0);
  const lead = (fromISO(m0).getDay() + 6) % 7;
  const heat = `<div class="mheat">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<b>${d}</b>`).join('')}${'<span></span>'.repeat(lead)}${Array.from({ length: mDays }, (_, i) => { const d = addDays(m0, i), v = perDayMap.get(d) || 0; return `<button class="mh${d > t ? 'f' : lvl(v)} ${d === t ? 'now' : ''}" data-act="go" data-v="money/spending" title="${esc(shortDate(d))}: ${eur(v)}">${i + 1}</button>`; }).join('')}</div>
    <p class="mlegend2"><span class="mscale">${[0, 1, 2, 3, 4].map(i => `<i class="mh${i}"></i>`).join('')}</span><span>${plural(zero, 'day')} with nothing spent</span></p>`;
  /* where the money went */
  const monthTx = tx.filter(x => x.date.startsWith(t.slice(0, 7))), groups = new Map();
  for (const x of monthTx) { const b = x.bill ? L.byId[x.bill.split('@')[0]] : null; const k = x.debt ? 'Debt' : b ? (b.type === 'Subscription' ? 'Subscriptions' : b.type === 'Debt' ? 'Debt' : 'Bills') : (relName(x.category) || 'Other'); groups.set(k, (groups.get(k) || 0) + (num(x.amount) || 0)); }
  const COLS = ['var(--c1)', 'var(--c6)', 'var(--c3)', 'var(--c2)', 'var(--c4)', 'var(--c5)', 'var(--c7)', 'var(--c8)'];
  const parts = [...groups.entries()].sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ k, v, c: COLS[i % COLS.length] })), mTot = fSum(monthTx);
  const went = parts.length ? `<div class="mwent"><div class="mdwrap">${fDonut(parts)}<p><b>${fEur0(mTot)}</b><span>this month</span></p></div><div class="mleg">${parts.slice(0, 7).map(p => `<p><i style="background:${p.c}"></i><span>${esc(p.k)}</span><b>${Math.round(100 * p.v / (mTot || 1))}%</b></p>`).join('')}</div></div>` : quiet('Nothing spent this month yet.');
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
  const byCat = recs('fcats').map(c => ({ c, s: fSum(payTx.filter(x => x.category === c.id)), b: num(c.budget) || 0 })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
  const bars = byCat.length ? `<div class="mbars">${byCat.map(({ c, s, b }) => `<button class="mbar ${b && s > b ? 'over' : ''}" data-act="open" data-id="${c.id}"><span class="mbl"><span>${esc(titleOf(c))}</span><b>${eur(s)}${b ? `<small> / ${fEur0(b)}</small>` : ''}</b></span><span class="lprog"><i style="width:${b ? Math.min(100, 100 * s / b) : 100}%"></i></span></button>`).join('')}</div>` : quiet('Nothing spent this pay yet.');
  const recent = every.filter(x => x.date <= t).sort((a, b) => (b.date + fSeq(b)).localeCompare(a.date + fSeq(a))).slice(0, 2);
  const chipRow = `<div class="mchips">${recent.map(x => `<button class="chip mrecent" data-act="frepeat" data-id="${x.id}">${esc(x.name || 'Again')} ${eur(num(x.amount))}</button>`).join('')}${chips.map(c => `<button class="chip" data-act="fchip" data-id="${c.id}">${esc(titleOf(c))} ${eur(num(c.amount))}</button>`).join('')}</div>`;
  const pts = fProject(st, 30).pts, low = pts.reduce((m, p) => p.v < m.v ? p : m, pts[0]);
  const jump = [['m-safe', 'Safe to spend'], ['m-look', 'Worth a look'], ['m-wins', 'Small wins'], ['m-next', 'Next 30 days'], ['m-pay', 'Payments coming'], ['m-days', 'Every day this month'], ['m-went', 'Where the money went'], ['m-net', 'Goals, debt, net worth']];
  host.innerHTML = `<div class="viewhead dviewhead"><h1>${hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'}</h1><span class="sub">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span><div class="spacer"></div><button class="btn small" data-act="fcheck">Check my money</button><button class="btn small primary" data-act="new" data-v="ftx">+ Add spending</button></div>
  <nav class="mjump" aria-label="On this page">${jump.map(([id, l]) => `<button class="chip" data-jump="${id}">${l}</button>`).join('')}</nav>
  <div class="mtop">${safe}${MP('Small wins', `${wins.join('')}<p class="lnone">${nWin ? `${nWin} down. That counts.` : 'Start with one.'}</p>`, `<span class="lnone">${nWin} of 3</span>`, 'wins')}</div>
  ${MP('Worth a look', st.overdue.length ? `<div class="lrows">${st.overdue.map(o => `<div class="lrow mlook"><span class="lmain"><b>${esc(o.bill.name)} was due ${esc(shortDate(o.date))}</b><span>${esc(o.type)} · ${eur(o.amount)}</span></span><button class="btn small" data-act="fpay" data-v="${o.key}">Mark paid</button><button class="chip link" data-act="fskip" data-v="${o.key}">Skip</button></div>`).join('')}</div>` : quiet('Nothing needs a look.'), `<span class="lnone">${plural(st.overdue.length, 'thing')}</span>`, 'look')}
  <div class="mrow2">${MP('Next 30 days', `${fChart(pts, st.buf, st.pay)}<p class="mmuted">Lowest point about <b>${fEur0(Math.round(low.v))}</b> on ${esc(shortDate(low.d))}${low.v < st.buf ? ` · ${eur(st.buf - low.v)} below your protected ${fEur0(st.buf)}` : ''}${st.pay ? ` · Payday <b>${esc(shortDate(st.pay))}</b>` : ''}</p>`, '', 'next')}
    ${MP('Coming up', upcoming.length ? `<div class="mlist">${upcoming.map(o => `<button class="mup" data-act="open" data-id="${o.bill.id}"><span class="mdate"><b>${fromISO(o.date).getDate()}</b>${esc(fromISO(o.date).toLocaleDateString('en-GB', { month: 'short' }))}</span><span class="lmain"><b>${esc(o.bill.name)}</b><span>${esc(o.type)} · ${o.date < t ? 'overdue' : esc(relDay(o.date))}</span></span><b>${eur(o.amount)}</b></button>`).join('')}</div>` : quiet('No repeats coming up.'), mLink('All repeats', 'money/repeats'))}</div>
  ${MP('Payments coming', cal, `<span class="lnone">${eur(outNext)} going out · <span class="mgood">+${eur(inNext)}</span> coming in · next 5 weeks</span>`, 'pay')}
  <div class="mrow2">${MP('Every day this month', heat, `<span class="lnone">${eur(monthSpend / Math.max(1, past.length))} a day so far</span>`, 'days')}${MP('Where the money went', went, mLink('Purchases', 'money/spending'), 'went')}</div>
  <div class="mrow2">${MP('Run to payday', run, `<span class="lnone">${st.pay ? plural(st.days, 'day') + ' left' : ''}</span>`)}${MP('Last 7 days', last7, `<span class="lnone">${esc(shortDate(w0))} – ${esc(shortDate(t))}</span>`)}</div>
  ${tiles}
  ${MP('Everyday spending this pay', bars + chipRow, mLink('Open spending', 'money/spending'))}
  ${dataTools()}`;
  if (!host.dataset.mwired) { host.dataset.mwired = '1'; host.addEventListener('click', e => { const j = e.target.closest('[data-jump]'); if (j) { e.preventDefault(); e.stopPropagation(); document.getElementById(j.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, true); }
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
  const prods = recs('beauty').filter(b => !b.finished && !b.archived && !b.wish);
  const am = routineFor(false).ps, tn = routineFor(true), pm = tn.ps, wk = recs('bsched')[0];
  const soon = prods.filter(b => b.expiry && diffDays(t, b.expiry) <= 30).sort((a, b) => a.expiry.localeCompare(b.expiry));
  const appts = recs('appts').filter(a => !a.done && a.date && a.date >= t).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).slice(0, 3);
  const rts = recs('routines'), habits = recs('habits').filter(h => !h.paused);
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
      + (wk ? `<p class="lnone">${esc(KINDS.bsched.sub(wk))}</p><button class="chip link" data-act="open" data-id="${wk.id}">Change the week</button>` : '<button class="btn small" data-act="new" data-v="bsched">Plan your skincare week</button>') : quiet('Mark products as part of your morning or evening routine and they show up here.'), ['care/beauty', 'All products'])}
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
/* ---------- feed planner ----------
   Your Instagram profile as it will look: every post with a cover, planned ones on top. Drag a tile to change the
   order (dates stay as they are); tap one to open the post. */
const igPost = p => !p.platforms?.length || [].concat(p.platforms).includes('Instagram');
const isReel = p => /video|reel/i.test(p.format || '');
function feedList() {
  const ps = recs('posts').filter(igPost);
  const key = p => p.feedPos != null ? 1e15 + num(p.feedPos) : (p.date ? fromISO(p.date).getTime() : 9e14) + (p.created || 0) / 1e13;
  return ps.sort((a, b) => key(b) - key(a));
}
function socialFeed(host) {
  const acc = recs('accounts').find(a => a.platform === 'Instagram') || null, tab = L.feedTab || 'grid';
  const all = feedList(), list = tab === 'reels' ? all.filter(isReel) : all, hl = sortList(recs('highlights'), KINDS.highlights, 'order');
  const ph = (path, cls) => path ? `<img class="${cls}" referrerpolicy="no-referrer" src="${esc(C.photoURL(path))}" alt="" loading="lazy" draggable="false" onerror="this.remove()">` : '';
  const stat = (n, l) => `<div class="igstat"><b>${n == null || n === '' ? '–' : (num(n) || 0).toLocaleString('en-GB')}</b><span>${l}</span></div>`;
  host.innerHTML = `<div class="viewhead"><h1>Feed</h1><span class="sub">Drag tiles to plan how your profile looks</span><div class="spacer"></div><button class="btn small" data-act="new" data-v="highlights">+ Highlight</button><button class="btn small primary" data-act="feednew">+ Post</button></div>
  <section class="igphone">
    <div class="ighead"><button class="igav" data-act="${acc ? 'open' : 'feedacc'}" ${acc ? `data-id="${acc.id}"` : ''} aria-label="Edit profile">${ph(acc?.avatar, '') || `<span>${esc((acc?.handle || 'A').replace('@', '').slice(0, 1).toUpperCase())}</span>`}</button>
      <div class="igstats">${stat(all.length, 'posts')}${stat(acc?.followers, 'followers')}${stat(acc?.following, 'following')}</div></div>
    <div class="igbio"><b>${esc(acc?.display || acc?.handle || 'Your profile')}</b>${acc?.handle ? `<span class="muted">${esc(acc.handle.startsWith('@') ? acc.handle : '@' + acc.handle)}</span>` : ''}${acc?.bio ? `<p>${esc(acc.bio)}</p>` : ''}</div>
    <button class="btn small igedit" data-act="${acc ? 'open' : 'feedacc'}" ${acc ? `data-id="${acc.id}"` : ''}>Edit profile</button>
    <div class="ighl">${hl.map(h => `<button class="ighli" data-act="open" data-id="${h.id}"><span>${ph(h.photo, '')}</span><small>${esc(h.name || '')}</small></button>`).join('')}<button class="ighli new" data-act="new" data-v="highlights"><span>${svg(P.plus)}</span><small>New</small></button></div>
    <div class="igtabs" role="group"><button data-act="feedtab" data-v="grid" aria-pressed="${tab === 'grid'}" aria-label="All posts">${svg(P.grid)}</button><button data-act="feedtab" data-v="reels" aria-pressed="${tab === 'reels'}" aria-label="Reels">${svg('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m10.5 9 4 3-4 3Z"/>')}</button></div>
    ${list.length ? `<div class="iggrid" data-feedgrid>${list.map(p => `<div class="igtile ${p.stage === 'Posted' ? 'posted' : ''}" data-feedid="${p.id}" role="button" tabindex="0" aria-label="${esc(titleOf(p))}">${ph(p.photo, '') || `<span class="igph">${esc(titleOf(p))}</span>`}${p.stage !== 'Posted' ? `<i class="igdate">${p.date ? esc(shortDate(p.date)) : 'no date'}</i>` : ''}${isReel(p) ? `<i class="igreel">${svg('<path d="m9 7 8 5-8 5Z"/>')}</i>` : ''}</div>`).join('')}</div>`
      : `<div class="empty lempty"><h2>${tab === 'reels' ? 'No reels yet' : 'Plan your first post'}</h2><p>Every Instagram post with a cover shows up here, planned ones on top.</p><button class="btn primary" data-act="feednew">+ Post</button></div>`}
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
  return `<section class="panel lpanel hweek"><div class="lph3"><h3>This week</h3></div><div class="hgrid"><span></span>${days.map(d => `<span class="hd ${d === t ? 'now' : ''}">${dayName(d).slice(0, 2)}</span>`).join('')}${hs.map(h => { const s = daysSet(h); return `<button class="hname" data-act="open" data-id="${h.id}">${esc(h.name)}</button>` + days.map(d => `<button class="hcell ${s.has(d) ? 'on' : ''}" data-act="hday" data-id="${h.id}" data-d="${d}" aria-pressed="${s.has(d)}" aria-label="${esc(h.name)}, ${dayName(d)}" ${d > t ? 'disabled' : ''}>${s.has(d) ? svg(P.check) : ''}</button>`).join(''); }).join('')}</div></section>`;
}
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
  const due = tasksDue(), nextTasks = recs('tasks').filter(x => !taskDone(x) && x.date && x.date > t).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const projs = recs('projects').filter(p => p.status !== 'Completed').sort((a, b) => (a.end || '9').localeCompare(b.end || '9'));
  const pbar = p => { const ts = projTasks(p), pct = ts.length ? Math.round(100 * ts.filter(taskDone).length / ts.length) : 0; return `<div class="lrow"><button class="lmain" data-act="open" data-id="${p.id}"><b>${esc(titleOf(p))}</b><span>${esc(KINDS.projects.sub(p))}</span><span class="lprog"><i style="width:${pct}%"></i></span></button><span class="lside">${pct}%</span></div>`; };
  host.innerHTML = `${head('Social')}
  <div class="tiles lt3"><div class="tile"><div class="k">This week</div><div class="v">${week.length}</div><div class="h">${posted} posted</div></div>
    ${accs.slice(0, 2).map(a => `<div class="tile"><div class="k">${esc(a.platform || 'Account')}</div><div class="v">${(num(a.followers) || 0).toLocaleString('en-GB')}</div><div class="h">followers${a.freq ? ' · ' + esc(a.freq) : ''}</div></div>`).join('') || '<div class="tile"><div class="k">Followers</div><div class="v">–</div><div class="h">add your accounts under Brand</div></div>'}</div>
  <div class="panels">
    ${panel('Tasks', due.length || nextTasks.length ? `${due.length ? `<div class="lrows">${due.map(row).join('')}</div>` : quiet('Nothing due today.')}${nextTasks.length ? `<p class="dsub">Next</p><div class="lrows">${nextTasks.map(row).join('')}</div>` : ''}` : `${quiet('No open tasks with a date.')}<button class="btn small" data-act="new" data-v="tasks">Add a task</button>`, ['social/tasks', 'All tasks'])}
    ${projs.length ? panel('Projects', `<div class="lrows">${projs.slice(0, 5).map(pbar).join('')}</div>`, ['social/projects', 'All projects']) : ''}
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
    ${(() => { const vw = todayVW(); return vw ? panel('Today’s video', `<div class="lrows">${row(vw)}</div>`, ['fit/library', 'Library']) : ''; })()}
    ${recs('fitgoals').some(g => !g.done) ? panel('Goals', `<div class="lrows">${recs('fitgoals').filter(g => !g.done).slice(0, 4).map(g => `<div class="lrow"><button class="lmain" data-act="open" data-id="${g.id}"><b>${esc(g.name || 'Goal')}</b><span>${esc(KINDS.fitgoals.sub(g))}</span><span class="lprog"><i style="width:${fitPct(g)}%"></i></span></button><span class="lside">${fitPct(g)}%</span></div>`).join('')}</div>`, ['fit/fgoals', 'All goals']) : ''}
    ${panel('Planned', planned.length ? `<div class="lrows">${planned.map(row).join('')}</div>` : `${quiet('No workouts planned.')}<button class="btn small" data-act="new" data-v="workouts">Plan a workout</button>`, ['fit/workouts', 'All workouts'])}
    ${panel('Personal records', prs.length ? `<div class="lrows">${prs.map(p => `<div class="lrow"><button class="lmain" data-act="open" data-id="${p.exercise}"><b>${esc(relName(p.exercise))}</b><span>${esc(niceDate(p.date))}</span></button><span class="lside">${p.weight} kg × ${p.reps || 1}</span></div>`).join('')}</div>` : quiet('Log your sets and your best lifts show up here.'), ['fit/exercises', 'Exercises'])}
  </div>${dataTools()}`;
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
const dataTools = () => `<div class="ltools"><button class="chip link" data-act="import">Import from Notion</button><button class="chip link" data-act="export">Back up these lists</button></div>`;

/* ---------- editing a record ---------- */
// choice lists follow Settings: your own order, hidden options left out unless this record already uses one
const optCfg = (kind, k) => (C?.prefs?.() || {}).optLists?.[kind + '.' + k] || {};
function optsFor(kind, f, cur) {
  const cfg = optCfg(kind, f.k), hid = new Set((cfg.hidden || []).map(norm)), now = [].concat(cur || []).map(norm);
  const out = [], seen = new Set();
  const add = (v, force) => { if (v && !seen.has(norm(v)) && (force || !hid.has(norm(v)) || now.includes(norm(v)))) { seen.add(norm(v)); out.push(v); } };
  (cfg.list || f.options || []).forEach(v => add(v));
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
    const kinds = [...new Set(Object.entries(PAGES).filter(([pg]) => pg.startsWith(sec.key + '/')).flatMap(([, c]) => [...(c.segs || []).map(x => x.kind), ...(c.adds || [])]))].filter(k => KINDS[k]);
    const items = kinds.flatMap(kind => KINDS[kind].fields.filter(f => f.type === 'select' || f.type === 'multi').map(f => ({ id: kind + '.' + f.k, label: `${KINDS[kind].many}: ${f.label}` })));
    return { group: sec.label, items };
  }).filter(g => g.items.length);
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
async function importFile(file) {
  let rows;
  try {
    const j = JSON.parse(await file.text());
    rows = (isBudgetBackup(j) ? await fromBudgetBackup(j) : Array.isArray(j) ? j : j.records || []).filter(r => r && r.id && KINDS[r.kind] && r.data && typeof r.data === 'object');
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
    case 'envmode': saveFset({ envMode: d.v }); break;
    case 'envstep': { const c = L.byId[d.id]; if (c) save(c, { budget: Math.max(0, (num(c.budget) || 0) + Number(d.v)) }); break; }
    case 'everymode': L.everyMode = d.v; C.render(); break;
    case 'everytag': L.everyQ = norm(L.everyQ) === d.v ? '' : d.v; C.render(); break;
    case 'everymore': L.everyLim = (L.everyLim || 60) + 100; C.render(); break;
    case 'calmove': L.calOff = d.v === '0' ? 0 : (L.calOff || 0) + Number(d.v); C.render(); break;
    case 'newbill': openEditor('fbills', null, { type: d.v, cadence: 'Monthly', active: true }); break;
    case 'splitsug': saveFset({ split: null }); break;
    case 'fgtile': { const g = L.byId[d.id]; if (!g) break; const f = gridFilled(g), i = +d.v, on = !f.has(i), amt = gridTiles(g)[i] || 0; on ? f.add(i) : f.delete(i); L.gpick = null; save(g, { filled: [...f] }); const goal = g.goal && L.byId[g.goal]; if (goal) save(goal, { saved: Math.max(0, (num(goal.saved) || 0) + (on ? amt : -amt)) }); if (on) C.toast(`${eur(amt)} put by`); break; }
    case 'fgpick': { const g = L.byId[d.id]; if (!g) break; const f = gridFilled(g), tl = gridTiles(g), free = tl.map((a, i) => [a, i]).filter(([, i]) => !f.has(i)); if (!free.length) { C.toast('Every tile is filled. Well done!'); break; } const spare = Math.max(0, fState().perDay || 0), fit = free.filter(([a]) => a <= Math.max(spare, Math.min(...free.map(x => x[0])))), [a, i] = fit[Math.floor(Math.random() * fit.length)]; L.gpick = { id: g.id, i }; C.render(); C.toast(`Put ${eur(a)} by today`); break; }
    case 'fwset': { const r = L.byId[d.id]; if (r) { save(r, { status: d.v }); C.toast(d.v === 'Let go' ? `${eur(num(r.price) || 0)} not spent` : 'Enjoy it'); } break; }
    case 'fcsv': pickCsv(); break;
    case 'acchist': accHistory(d.id); break;
    case 'fmove': moveMoney(); break;
    case 'feedtab': L.feedTab = d.v; C.render(); break;
    case 'feednew': openEditor('posts', null, { platforms: ['Instagram'], stage: 'Planned' }); break;
    case 'feedacc': openEditor('accounts', null, { platform: 'Instagram', active: true }); break;
    case 'hday': { const r = L.byId[d.id]; if (r) toggleDay(r, d.d); break; }
    case 'water': water(Number(d.v)); break;
    case 'watergoal': { const v = prompt('How many glasses a day?', C.prefs().waterGoal || 8); const n = Math.round(Number(v)); if (n > 0 && n < 40) C.savePrefs({ waterGoal: n }).catch(() => C.toast('Could not save. Try again.')); break; }
    case 'periodstart': create('cycles', { start: today() }).then(() => C.toast('Logged. Tap “Period ended” when it’s over.')).catch(() => {}); break;
    case 'periodend': { const r = L.byId[d.id]; if (r) save(r, { end: today() }); break; }
    case 'fcheck': fCheckSheet(); break;
    case 'fsink': { const b = L.byId[d.id]; if (b) save(b, { sink: !b.sink }); break; }
    case 'fall': L.fall = (L.fall || 120) + 200; C.render(); break;
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
      const n = L.sel.ids.size; if (!confirm(`Delete ${n} ${n === 1 ? 'item' : 'items'} for good?`)) break;
      try { for (const id of [...L.sel.ids]) await del(id); L.sel.ids.clear(); C.toast(`${n} deleted`); } catch { C.toast('Could not delete them all. Try again.'); }
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
  if (t.matches('[data-fset]')) { const k = t.dataset.fset; saveFset({ [k]: ['payAmount', 'buffer'].includes(k) ? num(t.value) : t.value }); }
  if (t.matches('[data-accsafe]')) { const a = L.byId[t.dataset.accsafe]; if (a) save(a, { safe: t.checked }); }
});
document.addEventListener('change', e => {
  const t = e.target; if (!C || !t.matches('[data-lsort]')) return;
  const page = C.view(); uiOf(page).sort[curSeg(page).key] = t.value; C.render();
});
document.addEventListener('submit', e => { if (e.target.matches('[data-qadd]')) { e.preventDefault(); quickAdd(e.target); } });

/* ---------- Finance: envelopes, every purchase, repeats, split my pay, goals, challenges, wait list, settings ---------- */
const fMode = () => fset().envMode === 'month' ? 'month' : 'pay';
function fWindow(mode = fMode(), back = 0) {
  if (mode === 'month') { const m = addMonths(today().slice(0, 7) + '-01', -back); return { start: m, end: addDays(addMonths(m, 1), -1) }; }
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
    .sort((a, b) => (b.x.date + String(fSeq(b.x)).padStart(15, '0')).localeCompare(a.x.date + String(fSeq(a.x)).padStart(15, '0'))).slice(0, L.everyLim || 60);
  const groups = new Map(); for (const r of rows) { if (!groups.has(r.x.date)) groups.set(r.x.date, []); groups.get(r.x.date).push(r); }
  return [...groups].map(([d, rs]) => `<div class="mdayhead"><b>${esc(fromISO(d).toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' }))}</b></div><div class="lrows">${rs.map(r => row(r.x)).join('')}</div>`).join('')
    + (rows.length >= (L.everyLim || 60) ? '<button class="btn small mmore" data-act="everymore">Show more</button>' : '') || quiet(q ? 'Nothing matches.' : 'Nothing logged yet.');
}
function fEnvFill(fill) {
  const mode = fMode(), w = fWindow(mode), cats = recs('fcats').sort((a, b) => (a.nospend ? 1 : 0) - (b.nospend ? 1 : 0) || (num(b.budget) || 0) - (num(a.budget) || 0) || norm(a.name).localeCompare(norm(b.name)));
  const planned = fSum(cats.filter(c => !c.nospend), 'budget'), spent = fSum(recs('ftx').filter(x => fEveryday(x) && x.date >= w.start && x.date <= w.end && x.date <= today()));
  const tags = {}; for (const x of recs('ftx')) for (const t of fTags(x)) tags[t.toLowerCase()] = (tags[t.toLowerCase()] || 0) + 1;
  const days = Math.max(0, diffDays(today(), w.end) + 1);
  fill.innerHTML = `<div class="tiles lt3">${fTile('Spent', eur(spent), `everyday spending this ${mode === 'month' ? 'month' : 'pay'}`)}${fTile('Planned', fEur0(planned), `in ${plural(cats.filter(c => !c.nospend).length, 'envelope')}, per ${mode === 'month' ? 'month' : 'paycheck'}`)}${spent > planned ? fTile('Over plan', eur(spent - planned), `${plural(days, 'day')} to ${mode === 'month' ? 'month end' : 'payday'}`, 'mneg') : fTile('Left in the plan', eur(planned - spent), `${plural(days, 'day')} to ${mode === 'month' ? 'month end' : 'payday'}`)}</div>
  <div class="fenvgrid">
    ${MP('Your envelopes', `<div class="seg fseg" role="group"><button data-act="envmode" data-v="month" aria-pressed="${mode === 'month'}">Per month</button><button data-act="envmode" data-v="pay" aria-pressed="${mode === 'pay'}">Per paycheck</button></div><p class="lnone">${esc(shortDate(w.start))} – ${esc(shortDate(w.end))}</p>${cats.map(c => fEnvRow(c, w)).join('') || quiet('Add a category for each kind of everyday spending.')}`, '<button class="chip link" data-act="new" data-v="fcats">+ Category</button>')}
    ${MP('Every purchase', `<div class="seg fseg" role="group">${[['out', 'Purchases'], ['in', 'Money in'], ['both', 'Both']].map(([k, l]) => `<button data-act="everymode" data-v="${k}" aria-pressed="${(L.everyMode || 'out') === k}">${l}</button>`).join('')}</div>
      <label class="search fsearch">${svg(P.search)}<input type="search" data-everyq placeholder="Search, like “coffee”, “12.50” or “#holiday”" value="${esc(L.everyQ || '')}" aria-label="Search purchases"></label>
      ${Object.keys(tags).length ? `<div class="lwrap">${Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => `<button class="chip" data-act="everytag" data-v="${esc(t)}" aria-pressed="${norm(L.everyQ) === t}">${esc(t)}</button>`).join('')}</div>` : ''}
      <div data-everylist>${fEveryList()}</div>`)}
  </div>`;
}
/* repeats */
const fOpenOccs = (days = 62) => fOccs(addDays(fStart(), -62), addDays(today(), days)).filter(o => !o.paid && !o.skipped && (o.date >= today() || o.date >= fStart()));
function fComingFill(fill) {
  const t = today(), os = fOpenOccs(70), sum = fSum(os.filter(o => o.date <= (fPayday() || addDays(t, 30))));
  fill.innerHTML = `<div class="tiles lt3">${fTile('Before payday', eur(sum), fPayday() ? 'still to go out until ' + shortDate(fPayday()) : 'in the next 30 days')}${fTile('Overdue', String(os.filter(o => o.date < t).length), 'tap Mark paid when they went out')}${fTile('Every month', eur(recs('fbills').filter(b => b.active !== false).reduce((n, b) => n + fPerMonth(b), 0)), 'all repeats, spread per month')}</div>
  ${MP('Coming up', os.length ? `<div class="mlist">${os.map(o => `<div class="mup"><span class="mdate"><b>${fromISO(o.date).getDate()}</b>${esc(fromISO(o.date).toLocaleDateString('en-GB', { month: 'short' }))}</span><button class="lmain fcomemain" data-act="open" data-id="${o.bill.id}"><b>${esc(o.bill.name)}</b><span>${esc(o.type)} · ${o.date < t ? 'overdue' : esc(relDay(o.date))}</span></button><b>${o.bill.vary ? '~' : ''}${eur(o.amount)}</b><button class="btn small primary" data-act="fpay" data-v="${o.key}">Mark paid</button></div>`).join('')}</div>` : quiet('Nothing coming up.'))}`;
}
function fCalFill(fill) {
  const off = L.calOff || 0, m0 = addMonths(today().slice(0, 7) + '-01', off), first = fromISO(m0), lead = (first.getDay() + 6) % 7;
  const start = addDays(m0, -lead), days = Array.from({ length: 42 }, (_, i) => addDays(start, i)), occ = fOccs(days[0], days[41]), t = today(), s = fset();
  let pay = s.payday; const pays = []; if (pay) { for (let i = 0; pay > days[0] && i < 60; i++) pay = addMonths(pay, -1); for (let i = 0; pay <= days[41] && i < 60; i++) { if (pay >= days[0]) pays.push(pay); pay = addMonths(pay, 1); } }
  const chip = (txt, c, paid) => `<span class="mpay ${paid ? 'paid' : ''}" style="--c:${c}">${esc(txt)}</span>`;
  fill.innerHTML = MP(fromISO(m0).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), `<div class="mcal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<b class="mdow">${d}</b>`).join('')}${days.map(d => { const os = occ.filter(o => o.date === d); const items = [...(pays.includes(d) ? [chip('Payday', TYPE_COL.Pay)] : []), ...os.map(o => chip(`${o.bill.name} ${fEur0(o.amount)}`, TYPE_COL[o.type] || TYPE_COL.Bill, o.paid))]; return `<div class="mday ${d === t ? 'now' : ''} ${d.slice(0, 7) !== m0.slice(0, 7) ? 'past' : ''}"><span>${fromISO(d).getDate()}</span>${items.slice(0, 3).join('')}${items.length > 3 ? `<em>+${items.length - 3}</em>` : ''}</div>`; }).join('')}</div>`,
    `<span class="mbtns"><button class="iconbtn small" data-act="calmove" data-v="-1" aria-label="Previous month">${svg(P.left)}</button><button class="chip link" data-act="calmove" data-v="0">Today</button><button class="iconbtn small" data-act="calmove" data-v="1" aria-label="Next month">${svg(P.right)}</button></span>`);
}
function fBillsOf(type) { return fill => { const list = sortList(recs('fbills').filter(b => (b.type || 'Bill') === type && b.active !== false), KINDS.fbills, 'name'); fill.innerHTML = `<div class="tiles lt3">${fTile(type === 'Bill' ? 'Bills' : 'Subscriptions', String(list.length), 'active')}${fTile('Per month', eur(list.reduce((n, b) => n + fPerMonth(b), 0)), 'spread over the year')}${fTile('Per year', eur(12 * list.reduce((n, b) => n + fPerMonth(b), 0)), '')}</div>${list.length ? `<div class="lrows">${list.map(row).join('')}</div>` : quiet(`No ${type === 'Bill' ? 'bills' : 'subscriptions'} yet.`)}<button class="btn small mmore" data-act="newbill" data-v="${type}">+ Add ${type === 'Bill' ? 'a bill' : 'a subscription'}</button>`; }; }
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
  const all = recs('fwait'), wait = all.filter(r => !r.status || r.status === 'Waiting').sort((a, b) => waitEnd(a) - waitEnd(b)), gone = all.filter(r => r.status === 'Let go'), bought = all.filter(r => r.status === 'Bought');
  const now = Date.now(), hrs = r => Math.ceil((waitEnd(r) - now) / 36e5);
  fill.innerHTML = `<div class="tiles lt3">${fTile('Waiting', String(wait.length), 'each one waits 48 hours')}${fTile('Money you didn’t spend', `<span class="mgood">${fEur0(fSum(gone, 'price'))}</span>`, plural(gone.length, 'thing') + ' you let go')}<div class="tile"><div class="k">How it works</div><div class="h fhow">Want something? Put it here instead of buying it. After two days most wants fade, and the ones that don’t are worth it.</div></div></div>
  ${wait.length ? MP('Waiting', `<div class="lrows">${wait.map(r => `<div class="lrow"><button class="lmain" data-act="open" data-id="${r.id}"><b>${esc(r.name || 'Something')}</b><span>${hrs(r) > 0 ? `decide in ${hrs(r)} h` : 'waited long enough, still want it?'}</span></button><span class="lside">${eur(num(r.price))}</span><button class="lquick" data-act="fwset" data-id="${r.id}" data-v="Bought">Bought</button><button class="lquick" data-act="fwset" data-id="${r.id}" data-v="Let go">Let go</button></div>`).join('')}</div>`)
    : `<div class="empty lempty"><h2>Nothing waiting</h2><p>Next time something catches your eye, add it here and let it sit for two days.</p><button class="btn primary" data-act="new" data-v="fwait">+ Add a wish</button></div>`}
  ${gone.length || bought.length ? MP('Decided', `<div class="lrows">${[...gone, ...bought].sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 30).map(row).join('')}</div>`) : ''}`;
}
/* finance settings */
const CURRENCIES = [['EUR', 'EUR €'], ['USD', 'USD $'], ['GBP', 'GBP £'], ['CHF', 'CHF'], ['SEK', 'SEK kr'], ['DKK', 'DKK kr'], ['NOK', 'NOK kr']];
const accIcon = a => a.type === 'Card' ? '💳' : a.type === 'Savings' ? '🐖' : '🏦';
function accRow(a) {
  const b = fBalance(a), debt = a.type === 'Card' ? recs('fdebts').find(d => d.account === a.id) : null;
  if (a.type === 'Card') return `<div class="lrow facc"><span class="lmain"><b>${accIcon(a)} ${esc(a.name || 'Card')}</b><span>Credit card · its charges are held back until paid</span></span>${debt ? '<button class="btn small" data-act="go" data-v="money/debt">On Debt</button>' : ''}<button class="btn small" data-act="open" data-id="${a.id}">Edit</button></div>`;
  return `<div class="lrow facc ${a.archived ? 'gone' : ''}"><span class="lmain"><b>${accIcon(a)} ${esc(a.name || 'Account')}</b><span>${a.type === 'Savings' ? 'Savings' : 'Everyday account'} · ${b == null ? 'no balance yet' : 'about ' + fSigned(b) + ' now'}</span></span><label class="settog"><input type="checkbox" data-accsafe="${a.id}" ${a.safe ? 'checked' : ''}> Counts</label><button class="btn small" data-act="acchist" data-id="${a.id}">History</button><button class="btn small" data-act="open" data-id="${a.id}">Edit</button></div>`;
}
function fSettings(host) {
  const s = fset(), list = (kind, empty, add) => `${recs(kind).length ? `<div class="lrows">${sortList(recs(kind), KINDS[kind], KINDS[kind].sorts?.[0]?.[0] || 'name').map(row).join('')}</div>` : quiet(empty)}<button class="btn small mmore" data-act="new" data-v="${kind}">${add}</button>`;
  const fld = (label, help, input) => `<div class="fset"><div><b>${label}</b>${help ? `<span>${help}</span>` : ''}</div>${input}</div>`;
  const accs = recs('faccounts').sort((a, b) => (a.archived ? 1 : 0) - (b.archived ? 1 : 0) || ['Spending', 'Savings', 'Card'].indexOf(a.type || 'Spending') - ['Spending', 'Savings', 'Card'].indexOf(b.type || 'Spending') || norm(a.name).localeCompare(norm(b.name)));
  host.innerHTML = `<div class="viewhead"><h1>Finance settings</h1><span class="sub">Everything your money pages run on</span></div>
  <div class="fsetgrid">
    ${MP('Your money', `
      ${fld('Your name', 'Shown in the greeting. Optional.', `<input class="finp" data-fset="name" value="${esc(s.name || '')}" placeholder="Your name">`)}
      ${fld('Currency', 'Changes how amounts are written. It doesn’t convert anything.', `<select class="finp" data-fset="currency">${CURRENCIES.map(([c, l]) => `<option value="${c}" ${(s.currency || 'EUR') === c ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
      ${fld('How often you’re paid', 'Safe to spend covers the time until your next payday.', `<select class="finp" data-fset="cycle"><option value="Monthly">Once a month</option></select>`)}
      ${fld('Plan everyday spending', fMode() === 'month' ? 'Per month: each category is a budget for the calendar month.' : 'Per paycheck: each category is an envelope that fills on payday.', `<select class="finp" data-fset="envMode"><option value="pay" ${fMode() === 'pay' ? 'selected' : ''}>Per paycheck (envelopes)</option><option value="month" ${fMode() === 'month' ? 'selected' : ''}>Per month</option></select>`)}
      ${fld('Usual pay', 'Used to plan the paydays ahead and to split your pay.', `<input class="finp" type="number" inputmode="decimal" step="0.01" data-fset="payAmount" value="${s.payAmount ?? ''}">`)}
      ${fld('Next payday', '', `<input class="finp" type="date" data-fset="payday" value="${esc(s.payday || '')}">`)}
      ${fld('Safety buffer', 'Kept back from safe to spend, for surprises.', `<input class="finp" type="number" inputmode="decimal" step="1" data-fset="buffer" value="${s.buffer ?? 100}">`)}`)}
    ${MP('Your accounts', `${accs.length ? `<div class="lrows facclist">${accs.map(accRow).join('')}</div>` : quiet('Add your bank accounts to see balances and safe to spend.')}<p class="lnone">Counts: the account is part of safe to spend. Add the IBAN to an account so bank imports land on it by themselves.</p><div class="dbtns"><button class="btn small" data-act="fcheck">Update balances</button><button class="btn small" data-act="fmove">⇄ Move money</button></div>`, '<button class="chip link" data-act="new" data-v="faccounts">+ Add an account</button>')}
    ${MP('Import and backup', `<p class="lnone">Bank statements from ING or Rabobank (CSV). Duplicates are skipped, own transfers are recognised and your sort rules pick the categories.</p><div class="dbtns"><button class="btn small primary" data-act="fcsv">Import bank CSV</button><button class="btn small" data-act="import">Import budget backup</button><button class="btn small" data-act="export">Back up all lists</button></div>`)}
    ${MP('Categories', list('fcats', 'No categories yet.', '+ Category') + '<p class="lnone">Open one to set its budget, let it roll over, or mark it as not spending.</p>')}
    ${MP('Sort rules', list('frules', 'No rules yet. A rule puts every purchase whose name contains a word in a category.', '+ Sort rule'))}
    ${MP('Quick adds', list('fchips', 'No quick adds yet.', '+ Quick add'))}
  </div>`;
}
async function saveFset(patch) { const r = recs('fset')[0]; try { r ? await put('fset', r.id, { ...dataOf(r), ...patch }) : await create('fset', patch); } catch {} }
function accHistory(id) {
  const a = L.byId[id]; if (!a) return;
  const rows = [...recs('ftx').filter(x => x.account === id).map(x => ({ x, s: -1 })), ...recs('fincome').filter(x => x.account === id).map(x => ({ x, s: 1 })), ...recs('fchecks').filter(c => c.account === id).map(x => ({ x, s: 0 }))]
    .sort((p, q) => ((q.x.date || q.x.at || '') + String(fSeq(q.x)).padStart(15, '0')).localeCompare((p.x.date || p.x.at || '') + String(fSeq(p.x)).padStart(15, '0'))).slice(0, 80);
  C.sheet({ title: a.name || 'Account', body: `<p class="lnone">${fBalance(a) == null ? 'No balance yet' : 'About ' + fSigned(fBalance(a)) + ' now'}</p><div class="lrows">${rows.map(({ x, s }) => `<div class="lrow"><button class="lmain" data-act="open" data-id="${x.id}"><b>${esc(s ? x.name || 'Line' : 'Balance check')}</b><span>${esc(niceDate(x.date || x.at))}${x.transfer ? ' · transfer' : ''}</span></button><span class="lside ${s > 0 ? 'mgood' : ''}">${s ? (s < 0 ? '−' : '+') + eur(num(x.amount)) : '= ' + eur(num(x.amount))}</span></div>`).join('') || quiet('Nothing on this account yet.')}</div>` });
}
function moveMoney() {
  const accs = fAccs().filter(a => a.type !== 'Card'), opt = sel => accs.map((a, i) => `<option value="${a.id}" ${i === sel ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
  if (accs.length < 2) { C.toast('Add at least two accounts first.'); return; }
  const sh = C.sheet({ title: 'Move money', body: `<div class="field"><label>From</label><select class="pill" data-mv="from">${opt(0)}</select></div><div class="field"><label>To</label><select class="pill" data-mv="to">${opt(1)}</select></div><div class="field"><label>Amount</label><input type="number" inputmode="decimal" step="0.01" data-mv="amt"></div><div class="field"><label>Date</label><input type="date" data-mv="date" value="${today()}"></div><p class="lnone">Moves money between your own accounts. It never counts as spending.</p>`, foot: '<div class="spacer"></div><button class="btn primary" data-mvgo>Move</button>' });
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
      await putMany(recsOut, (n, all) => { msg.textContent = `Saving ${n} of ${all}…`; });
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
    const view = sec?.views.find(v => sec.key + '/' + v[0] === where.page);
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

/* ---------- what index.html calls ---------- */
const sectionOf = view => SECTIONS.find(s => view.startsWith(s.key + '/'));
return {
  sections: SECTIONS.map(s => ({ key: s.key, label: s.label, icon: G(s.icon), views: s.views.map(([k, l, ic]) => [s.key + '/' + k, l, G(ic)]) })),
  has: view => !!PAGES[view],
  lists: optionLists, fullList: fullOptions, renameIn: renameOption,
  search, openFound,
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
