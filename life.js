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
const HELPS = ['Stop smoking'];
const FEELS = ['Comfort', 'Light', 'Fresh', 'Hearty', 'Quick', 'Savoury', 'Sweet', 'Spicy'];
const TEXTURES = ['Crispy', 'Creamy', 'Crunchy', 'Soft', 'Chewy', 'Saucy', 'Dry', 'Mushy'];
const QUIT = 'Stop smoking', helpsQuit = r => [].concat(r.helps || []).includes(QUIT);
// pantry and kitchen gear speak Dutch; older English categories are translated by Kitchen › Settings › Tidy up
// the parts of a hotel review, each 1 to 5 stars; the card shows their average
const STAY_SCORES = [['clean', 'Cleanliness'], ['location', 'Location'], ['comfort', 'Comfort and bed'], ['facilities', 'Facilities'], ['staff', 'Staff and service'], ['value', 'Value for money'], ['breakfast', 'Breakfast'], ['wifi', 'Wifi'], ['quiet', 'Quiet']];
const stayScore = r => { const v = STAY_SCORES.map(([k]) => Number(r[k]) || 0).filter(Boolean); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : Number(r.rating) || 0; };
const CAT_NL = {
  ingredients: { 'Fruits & Veg': 'Groente & fruit', 'Fish & Meat': 'Vlees & vis', 'Eggs & Dairy': 'Zuivel & eieren', 'Grains & Legumes': 'Granen & peulvruchten', 'Bread & Bakery': 'Brood & bakkerij', 'Nuts & Seeds': 'Noten & zaden', 'Herbs & Spices': 'Kruiden & specerijen', 'Sauces & Oils': 'Sauzen & olie', 'Tins & Jars': 'Blik & pot', 'Frozen': 'Diepvries', 'Drinks': 'Dranken', 'Snack': 'Snacks', 'Confections': 'Zoetigheid', 'Supplements': 'Supplementen', 'Other': 'Overig' },
  gear: { 'Kitchen Appliances': 'Keukenapparaten', 'Cookware & Bakeware': 'Pannen & bakvormen', 'Prep Tools & Essentials': 'Voorbereiden', 'Cooking Tools & Utensils': 'Kookgerei', 'Organizing Essentials': 'Opbergen', 'Cleaning Supplies': 'Schoonmaken' }
};
const catNL = (kind, v) => (CAT_NL[kind] || {})[v] || v;
const ROOMS = ['Entree', 'Woonkamer', 'Keuken', 'Slaapkamer', 'Badkamer', 'Toilet', 'Wasruimte', 'Balkon', 'Schoonmaak', 'Overig'];
const PRIO = ['Must-have', 'Binnen 3 maanden', 'Handig', 'Kan later'];
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
const wishPrio = v => ({ High: 'Must have', 'Must have': 'Must have', 'Must-have': 'Must have', Medium: 'Want', Want: 'Want', 'Binnen 3 maanden': 'Want', Handig: 'Want', Low: 'Someday', Someday: 'Someday', 'Kan later': 'Someday' })[v] || '';
const WISH_CATS = ['Tech', 'Books', 'Home', 'Kitchen', 'Beauty', 'Clothing', 'Fitness', 'Hobby', 'Travel', 'Other'];
const daysSince = d => d ? Math.max(0, diffDays(String(d).slice(0, 10), today())) : null;
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
      F('link', 'Recipe link', 'url'), F('ingredients', 'Ingredients', 'rel', { to: 'ingredients', multi: 1 }), F('helps', 'Helps with', 'multi', { options: HELPS }), F('feel', 'Feels like', 'multi', { options: FEELS }),
      F('instructions', 'Instructions', 'long'), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['-rating', 'Best rated'], ['-created', 'Newest'], ['time', 'Quickest']],
    sub: r => [r.category, mins(totalTime(r)), stars(r.rating)].filter(Boolean).join(' · ')
  },
  ingredients: {
    one: 'ingredient', many: 'Pantry', facet: 'category',
    fields: [F('name', 'Name'), F('category', 'Category', 'select', { options: Object.values(CAT_NL.ingredients) }),
      F('location', 'Kept in', 'select', { options: ['Koelkast', 'Vriezer', 'Voorraadkast', 'Keukenkast', 'Fruitmand', 'Broodtrommel', 'Kelder / Berging', 'Overig'] }),
      F('stock', 'In stock', 'check', { half: 1 }), F('low', 'Running low', 'check', { half: 1 }), F('list', 'On grocery list', 'check', { half: 1 }),
      F('expires', 'Best before', 'date', { half: 1 }), F('helps', 'Helps with', 'multi', { options: HELPS }),
      F('qty', 'Amount', 'text', { half: 1 }), F('notes', 'Notes', 'long')],
    sorts: [['name', 'A to Z'], ['category', 'Category'], ['location', 'Where it is']],
    filters: [['all', 'All'], ['in', 'In stock'], ['low', 'Running low'], ['soon', 'Use soon'], ['out', 'Out of stock']],
    filter: (r, f) => f === 'in' ? !!r.stock : f === 'out' ? !r.stock : f === 'low' ? !!r.low : f === 'soon' ? useSoon(r) : true,
    sub: r => [r.category, r.location, r.low ? 'running low' : '', r.expires ? (r.expires < today() ? 'past its date' : 'best before ' + shortDate(r.expires)) : '', r.list ? 'on grocery list' : ''].filter(Boolean).join(' · '),
    quick: r => ({ on: !!r.stock, label: 'In stock', act: () => save(r, { stock: !r.stock }) })
  },
  offers: {
    one: 'deal', many: 'Deals', facet: 'store', photo: 'photo', display: 'cards',
    fields: [F('name', 'Product'), F('store', 'Shop', 'select', { options: STORES, half: 1 }), F('deal', 'Deal', 'text', { half: 1 }),
      F('price', 'Deal price', 'money', { half: 1 }), F('was', 'Normal price', 'money', { half: 1 }), F('unit', 'Amount', 'text', { half: 1 }), F('category', 'Category', 'text', { half: 1 }),
      F('from', 'From', 'date', { half: 1 }), F('until', 'Until', 'date', { half: 1 }), F('url', 'Link', 'url'), F('photo', 'Photo', 'photo')],
    sorts: [['store', 'Shop'], ['name', 'A to Z'], ['price', 'Cheapest']],
    sub: r => [r.store, r.deal, r.unit, num(r.price) ? eur(num(r.price)) + (num(r.was) ? ` (was ${eur(num(r.was))})` : '') : '', r.until ? 'until ' + shortDate(r.until) : ''].filter(Boolean).join(' · ')
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
      F('recipe', 'Recipe', 'rel', { to: 'recipes' }), F('what', 'Or just write what you eat'), F('away', 'Not eating at home', 'check'), F('notes', 'Notes', 'long')],
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
      F('price', 'Price', 'money', { half: 1 }), F('qty', 'How many', 'num', { half: 1 }),
      F('bought', 'Bought on', 'date', { half: 1 }), F('opened', 'Opened on', 'date', { half: 1 }),
      F('expiry', 'Use before', 'date', { half: 1 }), F('rating', 'Rating', 'rating', { half: 1 }),
      F('fav', 'Favourite', 'check', { half: 1 }), F('finished', 'Finished', 'check', { half: 1 }), F('wish', 'On my wishlist', 'check', { half: 1 }),
      F('acid', 'Counts as an acid', 'check', { half: 1 }),
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
      F('finished', 'Finished', 'check', { half: 1 }), F('wish', 'On my wishlist', 'check', { half: 1 }), F('url', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
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
      F('scriptOn', 'Write the script on', 'date', { half: 1 }), F('filmOn', 'Film on', 'date', { half: 1 }), F('editOn', 'Edit on', 'date', { half: 1 }), F('location', 'Location', 'text', { half: 1 }),
      F('stage', 'Stage', 'select', { options: SOCIAL_STAGES.filter(x => x !== 'Idea'), half: 1 }), F('tips', 'Tips to use', 'rel', { to: 'stips', multi: 1 }), F('platforms', 'Platforms', 'multi', { options: SOCIAL_PLATFORMS, half: 1 }),
      F('format', 'Format', 'select', { options: SOCIAL_FORMATS, half: 1 }), F('pillar', 'Pillar', 'rel', { to: 'pillars', half: 1 }),
      F('style', 'Style', 'select', { options: SOCIAL_STYLES, half: 1 }), F('funnel', 'Funnel stage', 'select', { options: SOCIAL_FUNNEL, half: 1 }),
      F('desc', 'What it is', 'long'), F('hook', 'Hook (first seconds)', 'text'), F('script', 'Script', 'long', { rows: 8 }), F('shots', 'Shot list', 'long', { rows: 5 }),
      F('outfit', 'Outfit and props', 'long', { rows: 3 }), F('sound', 'Sound or music', 'text', { half: 1 }), F('cta', 'Call to action', 'text', { half: 1 }),
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
    one: 'item', many: 'Inventory', facet: 'room',
    fields: [F('name', 'Name'), F('brand', 'Brand', 'text', { half: 1 }), F('qty', 'How many', 'text', { half: 1 }),
      F('room', 'Room', 'select', { options: ROOMS }),
      F('category', 'Category', 'select', { options: ['Furniture', 'Kitchenware', 'Appliances', 'Home Decor', 'Linens', 'Storage', 'Electronics', 'Tools', 'Outdoor Equipment', 'Miscellaneous'] }),
      F('status', 'Status', 'select', { options: ['Wishlist', 'Ordered', 'Have', 'Returned', 'Gone'] }),
      F('priority', 'Priority', 'select', { options: PRIO }),
      F('price', 'Price', 'money', { half: 1 }), F('bought', 'Bought on', 'date', { half: 1 }),
      F('warranty', 'Warranty until', 'date', { half: 1 }), F('receipt', 'Receipt', 'photo'),
      F('rating', 'Rating', 'rating'), F('url', 'Link', 'url'), F('photo', 'Photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['prio', 'Priority'], ['name', 'A to Z'], ['-bought', 'Newest'], ['-price', 'Priciest']],
    filters: [['want', 'To buy'], ['have', 'Have'], ['all', 'All']],
    filter: (r, f) => f === 'have' ? (r.status || 'Have') === 'Have' : f === 'want' ? ['Wishlist', 'Ordered'].includes(r.status) : true,
    sub: r => [r.room, r.category, r.qty && r.qty !== '1' ? r.qty + '×' : '', r.status === 'Ordered' ? 'ordered' : '', r.warranty ? (r.warranty < today() ? 'warranty over' : 'warranty until ' + shortDate(r.warranty)) : '', r.receipt ? 'receipt' : ''].filter(Boolean).join(' · '),
    side: r => [r.priority && ['Wishlist', 'Ordered'].includes(r.status) ? r.priority : '', eur(r.price)].filter(Boolean).join(' · '),
    quick: r => ['Wishlist', 'Ordered'].includes(r.status) ? { on: false, label: 'Bought', act: () => recs('faccounts').length ? buyWish('inventory', r.id) : save(r, { status: 'Have', bought: r.bought || today() }) } : null
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
      F('category', 'Category', 'rel', { to: 'fcats', half: 1 }), F('account', 'Paid from', 'rel', { to: 'faccounts', half: 1 }), F('tags', 'Tags', 'multi', { options: ['wishlist'] }), F('receipt', 'Receipt photo', 'photo'), F('notes', 'Notes', 'long')],
    sorts: [['-date', 'Newest'], ['-amount', 'Biggest'], ['name', 'A to Z']],
    sub: r => [niceDate(r.date), relName(r.category), relName(r.account), r.bill ? 'bill' : r.debt ? 'debt payment' : '', isWishTx(r) ? 'wishlist' : ''].filter(Boolean).join(' · '),
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
      F('debt', 'Pays off debt', 'rel', { to: 'fdebts', half: 1 }), F('pot', 'Saved up in pot', 'rel', { to: 'faccounts', half: 1 }), F('trialEnds', 'Free trial ends', 'date', { half: 1 }), F('active', 'Active', 'check', { half: 1 }), F('url', 'Link', 'url'), F('notes', 'Notes', 'long')],
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
    fields: [F('name', 'Gift'), F('for', 'For'), F('occasion', 'Occasion', 'select', { options: ['Birthday', 'Christmas', 'Sinterklaas', 'Anniversary', "Mother's Day", "Father's Day", 'Graduation', 'Housewarming', 'Baby shower', 'Thank you'], half: 1 }),
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
  { key: 'kitchen', label: 'Kitchen', icon: P.pot, tile: kitchenTile,
    groups: { food: ['Food', P.book], shop: ['Shop', P.cart] },
    views: [['today', 'Overview', P.grid], ['recipes', 'Recipes', P.book, 'food'], ['meals', 'Meal plan', P.calendar, 'food'], ['quit', 'Stop smoking', P.leaf, 'food'], ['groceries', 'Groceries', P.cart, 'shop'], ['deals', 'Deals', P.tag, 'shop'], ['pantry', 'Pantry', P.jar, 'shop'], ['gear', 'Gear', P.spoon, 'shop'], ['todo', 'To do', P.check]] },
  { key: 'care', label: 'Life', icon: P.sparkle, tile: careTile,
    groups: { body: ['Body', P.pulse], beauty: ['Beauty', P.drop], mind: ['Mind', P.pen], plans: ['Plans', P.star] },
    views: [['today', 'Overview', P.grid], ['habits', 'Routines', P.repeat, 'body'], ['health', 'Health', P.pulse, 'body'], ['cycle', 'Cycle', P.moon, 'body'], ['supplements', 'Supplements', P.pill, 'body'], ['beauty', 'Products', P.drop, 'beauty'], ['skin', 'Skincare', P.flask, 'beauty'], ['diary', 'Skin diary', P.camera, 'beauty'], ['journal', 'Journal', P.pen, 'mind'], ['mindful', 'Mindfulness', P.moon, 'mind'], ['growth', 'Growth', P.target, 'mind'], ['ideas', 'Ideas', P.star, 'plans'], ['gifts', 'Gifts', P.gift, 'plans'], ['trips', 'Trips', P.plane, 'plans'], ['docs', 'Documents', P.doc, 'plans'], ['saved', 'Saved links', P.link, 'plans'], ['todo', 'To do', P.check]] },
  { key: 'money', label: 'Finance', icon: P.wallet, tile: moneyTile,
    groups: { plan: ['Plan', P.target], look: ['Review', P.trend] },
    views: [['today', 'Today', P.sun], ['spending', 'Spending', P.coins], ['repeats', 'Repeats', P.repeat], ['plan', 'Goals', P.target, 'plan'], ['debt', 'Debt', P.card, 'plan'], ['forecast', 'Forecast', P.trend, 'plan'], ['year', 'Year', P.calendar, 'look'], ['networth', 'Net worth', P.wallet, 'look'], ['reviews', 'Reviews', P.doc, 'look'], ['todo', 'To do', P.check]] },
  { key: 'home', label: 'Home', icon: P.house, tile: homeTile, views: [['today', 'Overview', P.grid], ['chores', 'Chores', P.broom], ['plants', 'Plants', P.leaf], ['inventory', 'Inventory', P.box], ['repairs', 'Repairs', P.wrench], ['todo', 'To do', P.check]] },
  { key: 'wish', label: 'Wishlists', icon: P.heart, tile: wishTile, views: [['today', 'Overview', P.grid], ['inbox', 'Inbox', P.inbox], ['master', 'Master', P.heart], ['todo', 'To do', P.check]] },
  { key: 'social', label: 'Social', icon: P.phone, tile: socialTile,
    groups: { work: ['Work', P.check], create: ['Create', P.phone], grow: ['Grow', P.trend], library: ['Library', P.book] },
    views: [['today', 'Overview', P.grid], ['tasks', 'Tasks', P.check, 'work'], ['projects', 'Projects', P.list, 'work'], ['ideas', 'Ideas', P.star, 'create'], ['posts', 'Posts', P.phone, 'create'], ['plan', 'Planning', P.calendar, 'create'], ['feed', 'Feed', P.grid, 'create'], ['insights', 'Insights', P.trend, 'grow'], ['goals', 'Goals', P.target, 'grow'], ['collabs', 'Collabs', P.handshake, 'grow'], ['tips', 'Tips', P.star, 'library'], ['inspo', 'Inspiration', P.heart, 'library'], ['kit', 'Toolkit', P.list, 'library'], ['brand', 'Brand', P.user, 'library'], ['todo', 'To do', P.check]] },
  { key: 'fit', label: 'Fitness', icon: P.dumbbell, tile: fitTile,
    groups: { train: ['Train', P.run], progress: ['Progress', P.scale] },
    views: [['today', 'Overview', P.grid], ['workouts', 'Workouts', P.run, 'train'], ['library', 'Videos', P.star, 'train'], ['plans', 'Plans', P.list, 'train'], ['exercises', 'Exercises', P.dumbbell, 'train'], ['fgoals', 'Goals', P.target, 'progress'], ['body', 'Body', P.scale, 'progress'], ['gear', 'Gear', P.box], ['todo', 'To do', P.check]] }
];
const TODO_ADDS = { kitchen: ['recipes', 'ingredients', 'gear'], care: ['beauty', 'supplements', 'ideas', 'gifts', 'courses', 'documents'], social: ['posts', 'cideas', 'stips', 'inspo', 'deals'], wish: ['wishes'], money: ['fbills', 'fdebts', 'fgoals'], home: ['plants', 'inventory', 'chores'], fit: ['exercises', 'vworkouts', 'fitgear', 'plans'] };
const PAGES = {
  ...Object.fromEntries(['kitchen', 'care', 'money', 'home', 'wish', 'social', 'fit'].map(sec => [sec + '/todo', { render: host => sectionTodo(host, sec), adds: TODO_ADDS[sec] }])),
  'kitchen/today': { render: kitchenToday, adds: ['meals', 'recipes', 'ingredients', 'mealprep'] },
  'kitchen/deals': { render: dealsPage, adds: ['recipes'] },
  'kitchen/quit': { render: quitPage, adds: ['recipes', 'ingredients'] },
  'kitchen/recipes': { title: 'Recipes', segs: [{ kind: 'recipes' }] },

  'kitchen/meals': { title: 'Meal plan', segs: [{ key: 'week', label: 'Week', kind: 'meals', fill: weekFill, tools: false }, { key: 'month', label: 'Month', kind: 'meals', fill: monthFill, tools: false }, { kind: 'mealprep' }] },
  'kitchen/groceries': { title: 'Groceries', segs: [{ key: 'list', label: 'Shopping list', kind: 'ingredients', fill: groceryFill, tools: false }] },
  'kitchen/pantry': { title: 'Pantry', segs: [{ kind: 'ingredients' }] },
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
  'care/health': { title: 'Health', segs: [{ kind: 'sleep' }, { kind: 'appts' }, { kind: 'symptoms' }, { kind: 'meditation' }, { kind: 'water' }] },
  'money/today': { render: moneyToday, adds: ['ftx', 'fincome', 'fbills', 'fchecks'] },
  'money/spending': { title: 'Spending', segs: [{ key: 'plan', label: 'Your plan', kind: 'ftx', fill: fEnvFill, tools: false }, { kind: 'ftx' }, { kind: 'fincome' }, { key: 'all', label: 'Everything in and out', kind: 'ftx', fill: fAllFill, tools: false }] },
  'money/repeats': { title: 'Repeats', segs: [{ key: 'coming', label: 'Coming up', kind: 'fbills', fill: fComingFill, tools: false }, { key: 'cal', label: 'Calendar', kind: 'fbills', fill: fCalFill, tools: false }, { key: 'bills', label: 'Bills', kind: 'fbills', fill: fBillsOf('Bill'), tools: false }, { key: 'subs', label: 'Subscriptions', kind: 'fbills', fill: fBillsOf('Subscription'), tools: false }, { key: 'in', label: 'Money in', kind: 'fincome' }, { key: 'split', label: 'Split my pay', kind: 'fbills', fill: fSplitFill, tools: false }, { kind: 'fbills', label: 'All repeats' }, { kind: 'fpaid' }] },
  'money/plan': { title: 'Goals', segs: [{ kind: 'fgoals', top: fGoalsTop }, { key: 'safety', label: 'Safety net', kind: 'fgoals', fill: fSafetyFill, tools: false }, { key: 'chall', label: 'Challenges', kind: 'fgrid', fill: fChallFill, tools: false }, { key: 'wait', label: 'Wait list', kind: 'fwait', fill: fWaitFill, tools: false }] },
  'money/debt': { title: 'Debt', segs: [{ key: 'free', label: 'Debt-free date', kind: 'fdebts', fill: fDebtFreeFill, tools: false }, { key: 'method', label: 'Snowball or avalanche', kind: 'fdebts', fill: fMethodFill, tools: false }, { kind: 'fdebts', label: 'Your debts' }, { key: 'made', label: 'Payments made', kind: 'ftx', fill: fPaymentsFill, tools: false }] },
  'money/forecast': { render: moneyForecast, adds: ['ftx', 'fbills', 'fincome'] },
  'money/year': { render: moneyYear, adds: ['fbills'] },
  'money/networth': { title: 'Net worth', segs: [{ key: 'nw', label: 'Net worth', kind: 'faccounts', fill: fNetFill, tools: false }, { kind: 'faccounts' }, { kind: 'fchecks' }, { kind: 'fset', label: 'Payday and buffer' }] },
  'money/reviews': { render: moneyReviews, adds: ['ftx', 'fincome'] },
  'home/today': { render: homeToday, adds: ['chores', 'plants', 'inventory', 'repairs'] },
  'home/chores': { title: 'Chores', segs: [{ key: 'plan', label: 'Schedule', kind: 'chores', fill: choreFill, tools: false }, { kind: 'chores', label: 'All chores' }] },
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
}
function apply(id, kind, data) {
  const i = L.all.findIndex(r => r.id === id);
  if (data) { const v = { ...data, id, kind }; i >= 0 ? (L.all[i] = v) : L.all.push(v); } else if (i >= 0) L.all.splice(i, 1);
  index(); cacheSave(); C.render();
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
  gear: r => !r.own && !r.dropped, fitgear: r => !r.own && !r.dropped, inventory: r => ['Wishlist', 'Ordered'].includes(r.status), fwait: r => (!r.status || r.status === 'Waiting') && !r.moved };
function stampWish(kind, id, data) {
  const w = WISHY[kind], was = L.byId[id]; if (!w || !was) return data;
  const before = w(was), now = w(data);
  if (!before && now && data.wishOut) { const { wishOut, wishOutOn, ...rest } = data; return rest; }
  if (!before || now || data.wishOut) return data;
  if (kind === 'fwait' && data.moved) return data;
  const dropped = kind === 'wishes' ? data.status === 'Dropped' || (data.archived && data.status !== 'Bought') : kind === 'inventory' ? ['Returned', 'Gone'].includes(data.status) : kind === 'beauty' || kind === 'supplements' ? !!data.wish : kind === 'fwait' ? data.status === 'Let go' : !!data.dropped;
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
    else if (p.new?.id) apply(p.new.id, p.new.kind, p.new.data);
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
const viewMode = K => { try { const v = localStorage.getItem('lview2:' + K.kind); if (v === 'rows' || v === 'cards') return v; } catch {} return 'cards'; };  // every list opens as tiles; the switch remembers a list per kind
const setViewMode = (K, v) => { try { localStorage.setItem('lview2:' + K.kind, v); } catch {} };
const viewSwitch = K => `<div class="seg lviews" role="group" aria-label="Show as">${[['cards', 'Tiles', P.grid], ['rows', 'List', P.list]].map(([v, l, ic]) => `<button data-act="lview" data-v="${v}" aria-pressed="${viewMode(K) === v}" aria-label="${l}" title="${l}">${svg(ic)}</button>`).join('')}</div>`;
const tick = (label, on, attrs) => `<button class="lquick ${on ? 'on' : ''}" ${attrs} aria-pressed="${on}">${on ? svg(P.check) : ''}${esc(label)}</button>`;
function row(r) {
  const K = KINDS[r.kind], q = K.quick?.(r), side = K.side?.(r);
  const ph = photoOf(r);
  return `<div class="lrow ${K.hide?.(r) ? 'gone' : ''}">${ph ? `<button class="lthumb" data-act="open" data-id="${r.id}" tabindex="-1" aria-hidden="true"><img referrerpolicy="no-referrer" src="${esc(C.photoURL(ph))}" alt="" loading="lazy" onerror="this.parentNode.remove()"></button>` : ''}<button class="lmain" data-act="open" data-id="${r.id}"><b>${esc(titleOf(r))}</b>${(() => { const t = [K.sub?.(r), WISHY[r.kind] ? wishLine(r.kind, r.id) : ''].filter(Boolean).join(' · '); return t ? `<span>${esc(t)}</span>` : ''; })()}</button>${side ? `<span class="lside ${/overdue|expired|today/.test(side) ? 'hot' : ''}">${esc(side)}</span>` : ''}${q ? tick(q.label, q.on, `data-act="quick" data-id="${r.id}"`) : ''}</div>`;
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
const listHTML = (list, K) => !list.length ? '' : viewMode(K) === 'cards' ? `<div class="lgrid">${list.map(card).join('')}</div>` : `<div class="lrows">${list.map(row).join('')}</div>`;
const panel = (title, body, more) => `<section class="panel lpanel"><div class="lph3"><h3>${esc(title)}</h3>${more ? `<button class="chip link" data-act="go" data-v="${more[0]}">${esc(more[1])}</button>` : ''}</div>${body}</section>`;
const quiet = t => `<p class="lnone">${esc(t)}</p>`;

/* ---------- list pages ---------- */
function sortList(list, K, key) {
  const desc = key.startsWith('-'), k = desc ? key.slice(1) : key;
  const val = r => k === 'score' ? (stayScore(r) || '') : k === 'routine' ? (ROUTINES.includes(r.routine) ? ROUTINES.indexOf(r.routine) : 9) : k === 'prio' ? (PRIO.includes(r.priority) ? PRIO.indexOf(r.priority) : 9) : k === 'time' ? (totalTime(r) || 1e9) : k === 'due' && ['chores', 'plants'].includes(r.kind) ? (r.kind === 'plants' ? (plantDue(r) || '9999') : choreDue(r)) : k === 'name' ? norm(titleOf(r)) : r[k];
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
/* ---------- one review inbox ----------
   Everything you share from your phone, save in Albo or paste in the app lands here. A task opens each link a few
   times a day, works out what it is (recipe, wish, closet piece, beauty, supplement, gear, home, idea, content,
   gift) and fills in a card. You accept it, send it somewhere else, keep it as a saved link, or skip it. */
const INBOX_TO = { recipes: ['Recipe', 'kitchen/recipes'], wishes: ['Wish', 'wish/master'], closet: ['Closet wishlist', 'wishlist'], beauty: ['Beauty', 'care/beauty'], supplements: ['Supplement', 'care/supplements'],
  gear: ['Kitchen gear', 'kitchen/gear'], fitgear: ['Fitness gear', 'fit/gear'], inventory: ['Home', 'home/inventory'], ideas: ['Self-care idea', 'care/ideas'], cideas: ['Content idea', 'social/ideas'], stips: ['Social tip', 'social/tips'], inspo: ['Inspiration', 'social/inspo'], gifts: ['Gift idea', 'care/gifts'], trip: ['Trip idea', 'care/trips'], stays: ['Saved stay', 'care/trips'], keep: ['Saved link', 'care/saved'] };
const INBOX_EXTRA = { stays: () => ({ status: 'Saved' }), wishes: () => ({ status: 'Wish', since: today() }), beauty: () => ({ wish: true }), supplements: () => ({ wish: true }), gear: () => ({ own: false }), fitgear: () => ({ own: false }), inventory: () => ({ status: 'Wishlist' }), cideas: () => ({ status: 'Idea', source: 'Inbox' }), gifts: () => ({ status: 'Idea' }) };
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
  ['servings', 'Servings', r => !num(r.servings)], ['ingredients', 'Ingredients', r => ![].concat(r.ingredients || []).length],
  ['instructions', 'Instructions', r => !String(r.instructions || '').trim()], ['protein', 'Protein', r => !String(r.protein || '').trim()],
  ['feel', 'Feels like', r => ![].concat(r.feel || []).length], ['rating', 'Rating', r => !num(r.rating)]
];
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
function sectionTodo(host, sec) {
  const cfg = TODO[sec] || {}, T = (L.todo ||= {})[sec] ||= { kind: 'all', sort: 'most' };
  const all = Object.entries(cfg).flatMap(([kind, c]) => recs(kind).filter(r => !c.when || c.when(r)).map(r => ({ r, kind, miss: c.checks.filter(x => x[2](r)) })).filter(x => x.miss.length));
  const kinds = Object.keys(cfg).map(k => [k, all.filter(x => x.kind === k).length]).filter(([, n]) => n);
  if (T.kind !== 'all' && !kinds.some(([k]) => k === T.kind)) T.kind = 'all';
  const shown = all.filter(x => T.kind === 'all' || x.kind === T.kind).sort(T.sort === 'new' ? (a, b) => (b.r.created || 0) - (a.r.created || 0) : T.sort === 'az' ? (a, b) => norm(titleOf(a.r)).localeCompare(norm(titleOf(b.r))) : (a, b) => b.miss.length - a.miss.length || norm(titleOf(a.r)).localeCompare(norm(titleOf(b.r))));
  const total = Object.entries(cfg).reduce((n, [k, c]) => n + recs(k).filter(r => !c.when || c.when(r)).length, 0);
  host.innerHTML = `<div class="viewhead"><h1>To do</h1><span class="sub">${total ? `${all.length} of ${total} miss something` : ''}</span></div>
    ${all.length ? `<div class="lplanhead"><select class="pill" data-tdsort aria-label="Sort">${[['most', 'Most missing first'], ['new', 'Recently added'], ['az', 'Name A to Z']].map(([k, l]) => `<option value="${k}" ${T.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    ${kinds.length > 1 ? `<div class="chips" role="group" aria-label="List"><button class="chip" data-tdkind="all" aria-pressed="${T.kind === 'all'}">Everything <span class="n">${all.length}</span></button>${kinds.map(([k, n]) => `<button class="chip" data-tdkind="${k}" aria-pressed="${T.kind === k}">${esc(KINDS[k].many)} <span class="n">${n}</span></button>`).join('')}</div>` : ''}
    <div class="lrows">${shown.slice(0, 300).map(({ r, kind, miss }) => `<div class="ltodo"><button class="lmain" data-act="open" data-id="${r.id}"><b>${esc(titleOf(r))}</b><span>${esc(KINDS[kind].many)}${KINDS[kind].sub?.(r) ? ' · ' + esc(KINDS[kind].sub(r)) : ''}</span></button><p class="todomiss">${miss.map(m => `<span>${esc(m[1])}</span>`).join('')}</p></div>`).join('')}</div>${shown.length > 300 ? `<p class="lnone">Showing 300 of ${shown.length}. Pick a list above to see the rest.</p>` : ''}`
    : quiet(total ? 'Everything here has its details. Nice.' : 'Add things in this section; anything they still miss shows up here.')}`;
  if (!host.dataset.tdwired) {
    host.dataset.tdwired = '1';
    host.addEventListener('click', e => { const k = e.target.closest('[data-tdkind]'); if (k) { L.todo[sec].kind = k.dataset.tdkind; sectionTodo(host, sec); } });
    host.addEventListener('change', e => { const so = e.target.closest('[data-tdsort]'); if (so) { L.todo[sec].sort = so.value; sectionTodo(host, sec); } });
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
  return `<section class="ltipsteps"><div class="lph3"><h3>Reviews</h3><button type="button" class="chip ${due ? 'on' : ''}" data-act="newreview" data-id="${r.id}" data-v="${esc(due || 'Later')}">${due ? `Write your ${esc(due.toLowerCase())} review` : 'Add a review'}</button></div>
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
function dealsPage(host) {
  const plan = curPlan(), offers = liveOffers(), byStore = STORES.map(s => [s, offers.filter(o => o.store === s)]).filter(([, l]) => l.length);
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
  const shopping = plan?.shopping || [], shopBy = [...STORES, 'Other'].map(s => [s, shopping.filter(x => (STORES.includes(x.store) ? x.store : 'Other') === s)]).filter(([, l]) => l.length);
  const saved = fSum(offers.filter(o => num(o.was) > num(o.price)).map(o => ({ amount: num(o.was) - num(o.price) })));
  host.innerHTML = `${head('Deals of the week')}<div class="ldeals">
  <div class="tiles">${fTile('Deals', String(offers.length), byStore.map(([s, l]) => `${s} ${l.length}`).join(' · ') || 'none yet')}${fTile('Dinners', String((plan?.dinners || []).length), plan ? `each for 2 days · ${esc(shortDate(plan.start))} to ${esc(shortDate(plan.end))}` : 'no plan yet')}${fTile('Shared', String((plan?.shared || []).length), 'deal ingredients used in more than one recipe')}${fTile('Your recipes', String(mine.length), 'use something on offer')}</div>
  ${!plan && !offers.length ? panel('How this works', `<p class="lnone">Every Wednesday a task reads the folders of Dirk, Aldi and Albert Heijn, looks through your recipes and your pantry, and puts this week's deals here with a plan: 5 dinners that each last 2 days, 3 office lunches that reheat in a microwave, 3 breakfasts and a few snacks. It reuses the same deal ingredients across recipes, so you buy less and waste less.</p><p class="lnone">It needs the Supabase function <b>offers</b> with the secret <b>OFFERS_TOKEN</b>. Then the first plan shows up after the next Wednesday.</p>`) : ''}
  ${plan?.tips ? `<div class="note dnote">${esc(plan.tips)}</div>` : ''}
  ${block('dinners', 'Dinners', 'Cook once, eat twice: each one is enough for 2 days.')}
  <div class="mrow2 dmrow">${block('lunches', 'Lunch for the office', 'Make ahead, take along, warm up in the microwave.') || ''}${block('breakfasts', 'Breakfast', 'Quick, or ready the night before.') || ''}</div>
  <div class="mrow2 dmrow">${block('snacks', 'Snacks', 'Something for in between.') || ''}${block('drinks', 'Instead of soda', 'Drinks without added sugar that still taste of something.') || ''}</div>
  ${block('quit', 'Helps you quit smoking', 'Something for the hands and mouth, or to get through a craving.')}
  <div class="mrow2 dmrow">${plan?.shared?.length ? panel('Used in several recipes', `<div class="lrows">${plan.shared.map(x => `<div class="lrow"><span class="lmain"><b>${esc(x.name)}</b><span>${esc([x.store, x.deal, num(x.price) ? eur(num(x.price)) : '', (x.in || []).length ? 'in ' + x.in.join(', ') : ''].filter(Boolean).join(' · '))}</span></span></div>`).join('')}</div>`) : ''}
    ${shopping.length ? panel('Shopping list', `${shopBy.map(([s, l]) => `<p class="dsub">${esc(s)}</p><div class="lrows">${l.map(x => { const k = shopping.indexOf(x), on = dealPicked(x, k); return `<label class="lrow dpick ${x.have ? 'gone' : ''}"><input type="checkbox" data-dpick="${k}" ${on ? 'checked' : ''} aria-label="Put ${esc(x.name)} on the list"><span class="lmain"><b>${esc(x.name)}</b><span>${esc([x.qty, x.deal, num(x.price) ? eur(num(x.price)) : '', x.have ? 'you have this' : ''].filter(Boolean).join(' · '))}</span></span></label>`; }).join('')}</div>`).join('')}<p class="lnone">Untick what you don't want.</p><button class="btn small primary" data-act="dgroc">Put ${plural(shopping.filter(dealPicked).length, 'thing')} on my grocery list</button>`) : ''}</div>
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
    for (const [k, x] of (plan.shopping || []).entries()) { if (!dealPicked(x, k)) continue; const r = ingRow(x.name, { list: true }); if (seen.has(r.id)) continue; seen.add(r.id); rows.push(r); }
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
    const taken = new Set(recs('meals').filter(x => x.slot === slot).map(x => x.date)), dates = [];
    for (let d = today(), j = 0; dates.length < n && j < 21; j++, d = addDays(d, 1)) if (!taken.has(d) && (k !== 'lunches' || ![0, 6].includes(fromISO(d).getDay()))) dates.push(d);
    const rows = dates.map(date => ({ id: C.uuid(), kind: 'meals', data: { date, slot, ...(m.recipe && L.byId[m.recipe] ? { recipe: m.recipe } : { what: m.name || 'Recipe' }), notes: 'From the deals of the week', created: Date.now() } }));
    try { await putMany(rows, null, `Planned ${m.name || 'a recipe'} for ${plural(rows.length, 'day')}`); C.toast(`In your meal plan: ${dates.map(d => shortDate(d)).join(', ')}`); } catch { C.toast('Could not save. Try again.'); }
  }
}

function kitchenToday(host) {
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
    ${toReview.length ? panel('How was it?', `<p class="lnone">A few taps after eating teach the app what you like.</p><div class="lrows">${toReview.map(m => `<div class="lrow"><span class="lmain"><b>${esc(relName(m.recipe))}</b><span>${esc(niceDate(m.date))}${m.slot ? ' · ' + esc(m.slot.toLowerCase()) : ''}</span></span><button class="btn small" data-rvw="${m.recipe}" data-date="${m.date}">Review</button></div>`).join('')}</div>`) : ''}
    ${dp || dn ? panel('Deals this week', `<p class="lbig">${plural(dn, 'deal')} at Dirk, Aldi and AH</p>${(dp?.dinners || []).length ? `<div class="lwrap">${dp.dinners.slice(0, 5).map(m => `<span class="chip">${esc(m.recipe && L.byId[m.recipe] ? titleOf(L.byId[m.recipe]) : m.name || 'Recipe')}</span>`).join('')}</div>` : ''}`, ['kitchen/deals', 'See the plan']) : ''}
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
  for (let p = st.pay, i = 0; p && p <= end && i < 40; p = addMonths(p, 1), i++) paydays.add(p);
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
  ${MP('Wishlists this month', wishReview(m, fMonthName(m, { month: 'long' })), mLink('Wishlists', 'wish/today'), 'r-wish')}`;
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
  const pays = s.payday ? days35.filter(d => fromISO(d).getDate() === fromISO(fPayday() || s.payday).getDate() && d >= addDays(fPayday() || s.payday, -1)) : [];
  const plan35 = plannedWishes(t, days35[34]);
  const outNext = fSum(occ35.filter(o => !o.paid && !o.skipped && o.date >= t)) + fSum(plan35), inNext = pays.filter(d => d >= t).length * (num(s.payAmount) || 0);
  const chip = (amt, ty, paid) => `<span class="mpay ${paid ? 'paid' : ''}" style="--c:${TYPE_COL[ty] || TYPE_COL.Bill}">${fEur0(amt)}</span>`;
  const cal = `<div class="mcal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<b class="mdow">${d}</b>`).join('')}${days35.map(d => { const os = occ35.filter(o => o.date === d), dd = fromISO(d); const items = [...(pays.includes(d) ? [chip(num(s.payAmount) || 0, 'Pay')] : []), ...os.map(o => chip(o.amount, o.type, o.paid)), ...plan35.filter(p => p.date === d).map(p => chip(p.amount, 'Wish'))]; return `<div class="mday ${d === t ? 'now' : ''} ${d < t ? 'past' : ''}"><span>${dd.getDate() === 1 ? dd.toLocaleDateString('en-GB', { month: 'short' }) + ' 1' : d === t ? shortDate(d) : dd.getDate()}</span>${items.slice(0, 2).join('')}${items.length > 2 ? `<em>+${items.length - 2}</em>` : ''}</div>`; }).join('')}</div>
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
  const jump = [['m-safe', 'Safe to spend'], ['m-look', 'Worth a look'], ['m-wins', 'Small wins'], ['m-next', 'Next 30 days'], ['m-pay', 'Payments coming'], ['m-days', 'Every day this month'], ['m-went', 'Where the money went'], ['m-net', 'Goals, debt, net worth'], ['m-cats', 'Per category'], ['m-months', 'Month by month'], ['m-big', 'Biggest spending'], ...(allWishes().length || wishBudget() ? [['m-wish', 'Wishlists']] : []), ...(recs('faccounts').some(x => x.type === 'Pot') ? [['m-pots', 'Pots']] : []), ...(recs('fbills').some(b => b.type === 'Subscription' && b.active !== false) ? [['m-subs', 'Subscriptions']] : [])];
  host.innerHTML = `<div class="viewhead dviewhead"><h1>${esc(window.APP_GREETING?.().hello || (hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'))}</h1><span class="sub">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span><div class="spacer"></div><button class="btn small" data-act="fcheck">Check my money</button><button class="btn small primary" data-act="new" data-v="ftx">+ Add spending</button></div>
  <nav class="mjump" aria-label="On this page">${jump.map(([id, l]) => `<button class="chip" data-jump="${id}">${l}</button>`).join('')}</nav>
  <div class="mtop">${safe}${MP('Small wins', `${wins.join('')}<p class="lnone">${nWin ? `${nWin} down. That counts.` : 'Start with one.'}</p>`, `<span class="lnone">${nWin} of 3</span>`, 'wins')}</div>
  ${MP('Worth a look', st.overdue.length ? `<div class="lrows">${st.overdue.map(o => `<div class="lrow mlook"><span class="lmain"><b>${esc(o.bill.name)} was due ${esc(shortDate(o.date))}</b><span>${esc(o.type)} · ${eur(o.amount)}</span></span><button class="btn small" data-act="fpay" data-v="${o.key}">Mark paid</button><button class="chip link" data-act="fskip" data-v="${o.key}">Skip</button></div>`).join('')}</div>` : quiet('Nothing needs a look.'), `<span class="lnone">${plural(st.overdue.length, 'thing')}</span>`, 'look')}
  <div class="mrow2">${MP('Next 30 days', `${fChart(pts, st.buf, st.pay)}<p class="mmuted">Lowest point about <b>${fEur0(Math.round(low.v))}</b> on ${esc(shortDate(low.d))}${low.v < st.buf ? ` · ${eur(st.buf - low.v)} below your protected ${fEur0(st.buf)}` : ''}${st.pay ? ` · Payday <b>${esc(shortDate(st.pay))}</b>` : ''}</p>`, '', 'next')}
    ${MP('Coming up', upcoming.length ? `<div class="mlist">${upcoming.map(o => `<button class="mup" data-act="open" data-id="${o.bill.id}"><span class="mdate"><b>${fromISO(o.date).getDate()}</b>${esc(fromISO(o.date).toLocaleDateString('en-GB', { month: 'short' }))}</span><span class="lmain"><b>${esc(o.bill.name)}</b><span>${esc(o.type)} · ${o.date < t ? 'overdue' : esc(relDay(o.date))}</span></span><b>${eur(o.amount)}</b></button>`).join('')}</div>` : quiet('No repeats coming up.'), mLink('All repeats', 'money/repeats'))}</div>
  ${MP('Payments coming', cal, `<span class="lnone">${eur(outNext)} going out · <span class="mgood">+${eur(inNext)}</span> coming in · next 5 weeks</span>`, 'pay')}
  <div class="mrow2">${MP('Every day this month', heat, `<span class="lnone">${eur(monthSpend / Math.max(1, past.length))} a day so far</span>`, 'days')}${MP('Where the money went', went, mLink('Purchases', 'money/spending'), 'went')}</div>
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
  const missing = ings.filter(i => !i.stock && !i.list), pr = parseRecipe(r), base = Math.max(1, Math.round(num(r.servings) || 2));
  let serv = base;
  const sh = C.sheet({
    title: r.name || 'Recipe', wide: true,
    body: `<div class="lrecipe">${r.photo ? `<img referrerpolicy="no-referrer" class="lrimg" src="${esc(C.photoURL(r.photo))}" alt="" onerror="this.remove()">` : ''}
      <div class="lrbody">
        <p class="lmeta">${esc([r.category, mins(totalTime(r)), r.servings ? plural(r.servings, 'serving') : '', r.protein ? r.protein + ' protein' : ''].filter(Boolean).join(' · '))}${r.rating ? ` <span class="lstars">${stars(r.rating)}</span>` : ''}</p>
        ${r.link ? `<a class="btn small" href="${esc(r.link)}" target="_blank" rel="noopener">${svg(P.link)} Open the recipe</a>` : ''}
        ${pr.lines.length ? `<div class="lrhead"><h3>Ingredients</h3><span class="lserv" role="group" aria-label="Servings"><button class="iconbtn small" data-serv="-1" aria-label="Fewer servings">${svg(P.minus)}</button><b data-servn>${plural(base, 'serving')}</b><button class="iconbtn small" data-serv="1" aria-label="More servings">${svg(P.plus)}</button></span></div><ul class="rlines" data-rlines>${linesHTML(pr.lines, 1)}</ul>` : ''}
        ${ings.length ? `<p class="dsub">From your pantry</p><div class="lwrap">${ings.map(i => `<span class="chip ${i.stock ? 'on' : ''}">${i.stock ? '✓ ' : ''}${esc(i.name)}${i.list ? ' (on list)' : ''}</span>`).join('')}</div>` : ''}
        ${pr.steps.length ? `<h3>Method</h3><ol class="rsteps">${pr.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
        ${r.notes ? `<h3>Notes</h3><p class="lpre">${esc(r.notes)}</p>` : ''}
      </div></div>`,
    foot: `${missing.length ? `<button class="btn" data-miss>Add ${missing.length} missing to list</button>` : ''}<button class="btn" data-plan>Plan it</button><div class="spacer"></div><button class="btn" data-edit>Edit</button>${pr.steps.length || pr.lines.length ? '<button class="btn primary" data-cook>Start cooking</button>' : ''}`
  });
  sh.querySelector('[data-edit]').onclick = () => openEditor('recipes', r.id);
  sh.querySelectorAll('[data-serv]').forEach(b => b.onclick = () => { serv = Math.max(1, Math.min(40, serv + Number(b.dataset.serv))); sh.querySelector('[data-servn]').textContent = plural(serv, 'serving'); sh.querySelector('[data-rlines]').innerHTML = linesHTML(pr.lines, serv / base); });
  const ck = sh.querySelector('[data-cook]'); if (ck) ck.onclick = () => { C.closeSheet(); cookMode(r, serv / base); };
  sh.querySelector('[data-plan]').onclick = () => planRecipe(r);
  const m = sh.querySelector('[data-miss]');
  if (m) m.onclick = () => { missing.forEach(i => save(i, { list: true })); C.toast(`${plural(missing.length, 'thing')} added to your list`); C.closeSheet(); };
}

/* ---------- recipe text: ingredient lines and steps, portions, cook mode ----------
   Recipes keep "Ingrediënten:" lines and "Bereiding:" steps in their instructions (that is how imports and the
   weekly fill write them). Amounts scale with the number of servings; cook mode shows one step per screen. */
function parseRecipe(r) {
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
const linesHTML = (lines, f) => lines.map(l => `<li>${esc(scaleLine(l, f))}</li>`).join('');
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
  return `<div class="lpostpub">${ig ? `<button type="button" class="btn small" data-act="igpost" data-id="${r.id}">Post to Instagram now</button>` : '<span class="lnone">On Instagram</span>'}${tt ? `<button type="button" class="btn small" data-act="ttpost" data-id="${r.id}">${r.ttSent ? 'Send to TikTok again' : 'Send to TikTok as draft'}</button>` : ''}${r.ttSent ? `<span class="lnone">Sent to TikTok ${esc(relDay(r.ttSent))}</span>` : ''}</div>`;
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
const wishWaitLeft = r => { const h = num(r.wait); if (r.kind === 'fwait') return Math.ceil((waitEnd(r) - Date.now()) / 36e5); if (!h) return null; return Math.ceil(((num(r.waitFrom) || r.created || Date.now()) + h * 36e5 - Date.now()) / 36e5); };
const BUY_PATCH = { wishes: () => ({ status: 'Bought' }), beauty: d => ({ wish: false, bought: d }), supplements: d => ({ wish: false, bought: d }), gear: d => ({ own: true, bought: d }), fitgear: d => ({ own: true, bought: d }), inventory: d => ({ status: 'Have', bought: d }), fwait: () => ({ status: 'Bought' }) };
const DROP_PATCH = { wishes: () => ({ status: 'Dropped' }), beauty: () => ({ archived: true }), supplements: () => ({ finished: true }), gear: () => ({ dropped: true }), fitgear: () => ({ dropped: true }), inventory: () => ({ status: 'Gone' }), fwait: () => ({ status: 'Let go' }) };
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
    return { group: sec.label, key: sec.key, items };
  }).filter(g => g.items.length);
}
// choices are buttons up to this many, a dropdown above it
const CHIP_MAX = 12;
// lists with a natural order keep it; everything else is A to Z (your own order from Settings always wins)
const ORDERED = new Set(['onDays', 'amDays', 'pmDays', 'step', 'again', 'angle', 'after', 'breakouts', 'redness', 'dryness', 'oiliness', 'stress', 'priority', 'prio', 'stage', 'status', 'cadence', 'freq', 'level', 'slot', 'funnel', 'effort', 'size', 'season', 'seasons', 'time', 'intake', 'when', 'day', 'days', 'nights', 'reheat', 'again', 'portion', 'mood', 'energy', 'quality']);
const sortOpts = (kind, f, opts) => optCfg(kind, f.k).list || ORDERED.has(f.k) ? opts : [...opts].sort((a, b) => norm(a).localeCompare(norm(b)));
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
      const sel = [].concat(v || []), opts = sortOpts(kind, f, optsFor(kind, f, v));
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
    default: return lab + `<input id="${id}" type="text" data-k="${f.k}" value="${esc(v || '')}">`;
  }
}
function openEditor(kind, id, preset = {}) {
  const K = KINDS[kind], r = id ? L.byId[id] : null;
  const D = r ? JSON.parse(JSON.stringify(dataOf(r))) : { created: Date.now(), ...preset };
  if (kind === 'skinlog' && !r) { const wd = wdOf(); D.used = D.used || [...new Set([...skinSlot(wd, false), ...skinSlot(wd, true)].map(b => b.id))]; D.time = D.time || (new Date().getHours() < 15 ? 'Morning' : 'Evening'); const cy = cycleStats(); if (cy.last && !cy.guessed && cy.day) D.cycle = D.cycle ?? cy.day; }
  if (kind === 'beauty' && r) { if (!Array.isArray(D.amDays)) D.amDays = amDaysOf(r); if (!Array.isArray(D.pmDays)) D.pmDays = pmDaysOf(r); }
  D._blobs = {}; D._previews = {}; // one picked photo per photo field (a product photo and a receipt, say)
  if (!r) for (const f of K.fields) if (f.type === 'date' && D[f.k] === undefined && ['date', 'start'].includes(f.k)) D[f.k] = today();
  const sh = C.sheet({
    title: r ? titleOf(r) : 'New ' + K.one,
    body: `${r && WISHY[kind] ? wishPanel(kind, id) : ''}${r && kind === 'recipes' ? reviewPanel(id) : ''}${r && kind === 'posts' ? postPanel(r) : ''}${r && kind === 'beauty' ? beautyReviews(r) : ''}${kind === 'stips' ? '<div data-tipsteps></div>' : ''}${kind === 'posts' ? '<div data-postkit></div><div data-posttips></div>' : ''}${r && kind === 'cideas' ? `<div class="lpostpub"><button type="button" class="btn small primary" data-act="mkpost" data-id="${r.id}">Make it a post</button><span class="lnone">It moves to Posts, ready to plan.</span></div>` : ''}${r && kind === 'posts' && r.stage !== 'Posted' ? `<div class="lpostpub"><button type="button" class="btn small" data-act="mkidea" data-id="${r.id}">Back to ideas</button></div>` : ''}<div class="form">${K.fields.map(f => `<div class="field ${f.half ? '' : 'full'}" data-f="${f.k}">${fieldInner(kind, f, D)}</div>`).join('')}</div>`,
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
  });
  sh.addEventListener('click', e => {
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
    if (d.act === 'mkpost') return ideaToPost(d.id);
    if (d.act === 'newreview') { C.closeSheet(); return openEditor('breviews', null, { product: d.id, date: today(), after: d.v }); }
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
    case 'everymore': L.everyLim = (L.everyLim || 50) + 50; C.render(); break;
    case 'calmove': L.calOff = d.v === '0' ? 0 : (L.calOff || 0) + Number(d.v); C.render(); break;
    case 'newbill': openEditor('fbills', null, { type: d.v, cadence: 'Monthly', active: true }); break;
    case 'splitsug': saveFset({ split: null }); break;
    case 'fgtile': { const g = L.byId[d.id]; if (!g) break; const f = gridFilled(g), i = +d.v, on = !f.has(i), amt = gridTiles(g)[i] || 0; on ? f.add(i) : f.delete(i); L.gpick = null; save(g, { filled: [...f] }); const goal = g.goal && L.byId[g.goal]; if (goal) save(goal, { saved: Math.max(0, (num(goal.saved) || 0) + (on ? amt : -amt)) }); if (on) C.toast(`${eur(amt)} put by`); break; }
    case 'fgpick': { const g = L.byId[d.id]; if (!g) break; const f = gridFilled(g), tl = gridTiles(g), free = tl.map((a, i) => [a, i]).filter(([, i]) => !f.has(i)); if (!free.length) { C.toast('Every tile is filled. Well done!'); break; } const spare = Math.max(0, fState().perDay || 0), fit = free.filter(([a]) => a <= Math.max(spare, Math.min(...free.map(x => x[0])))), [a, i] = fit[Math.floor(Math.random() * fit.length)]; L.gpick = { id: g.id, i }; C.render(); C.toast(`Put ${eur(a)} by today`); break; }
    case 'fwset': { const r = L.byId[d.id]; if (!r) break; if (d.v === 'Bought' && recs('faccounts').length) { buyWish(r.kind, r.id); break; } if (r.kind === 'fwait') { save(r, { status: d.v }); C.toast(d.v === 'Let go' ? `${eur(num(r.price) || 0)} not spent` : 'Enjoy it'); } else if (d.v === 'Let go') dropWish(r.kind, r.id); else save(r, { status: 'Bought' }); break; }
    case 'fwnew': openEditor('wishes', null, { status: 'Wish', since: today(), wait: 48, category: 'Other' }); break;
    case 'fcsv': pickCsv(); break;
    case 'fdups': fDups(); break;
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
    case 'quitadd': quitAdd(); break;
    case 'triptab': L.tripTab = d.v; C.render(); break;
    case 'igpost': igPostNow(d.id); break;
    case 'mkpost': ideaToPost(d.id); break;
    case 'mkidea': postToIdea(d.id); break;
    case 'ttpost': ttPostNow(d.id); break;
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
  if (t.matches('[data-fset]')) { const k = t.dataset.fset; saveFset({ [k]: ['payAmount', 'buffer', 'wishBudget'].includes(k) ? num(t.value) : t.value }); }
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
  const start = addDays(m0, -lead), days = Array.from({ length: 42 }, (_, i) => addDays(start, i)), occ = fOccs(days[0], days[41]), t = today(), s = fset(), planC = plannedWishes(days[0], days[41]);
  let pay = s.payday; const pays = []; if (pay) { for (let i = 0; pay > days[0] && i < 60; i++) pay = addMonths(pay, -1); for (let i = 0; pay <= days[41] && i < 60; i++) { if (pay >= days[0]) pays.push(pay); pay = addMonths(pay, 1); } }
  const chip = (txt, c, paid) => `<span class="mpay ${paid ? 'paid' : ''}" style="--c:${c}">${esc(txt)}</span>`;
  fill.innerHTML = MP(fromISO(m0).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), `<div class="mcal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<b class="mdow">${d}</b>`).join('')}${days.map(d => { const os = occ.filter(o => o.date === d); const items = [...(pays.includes(d) ? [chip('Payday', TYPE_COL.Pay)] : []), ...os.map(o => chip(`${o.bill.name} ${fEur0(o.amount)}`, TYPE_COL[o.type] || TYPE_COL.Bill, o.paid)), ...planC.filter(p => p.date === d).map(p => chip(`${p.name} ${fEur0(p.amount)}`, TYPE_COL.Wish))]; return `<div class="mday ${d === t ? 'now' : ''} ${d.slice(0, 7) !== m0.slice(0, 7) ? 'past' : ''}"><span>${fromISO(d).getDate()}</span>${items.slice(0, 3).join('')}${items.length > 3 ? `<em>+${items.length - 3}</em>` : ''}</div>`; }).join('')}</div>`,
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
  const now = Date.now(), old = recs('fwait').filter(WISHY.fwait);
  // waiting wishes: the old wait list plus every wish that started with a wait and is still being decided (up to a week after)
  const fresh = recs('wishes').filter(r => WISHY.wishes(r) && num(r.wait) && wishWaitLeft(r) > -24 * 7);
  const wait = [...old, ...fresh].sort((a, b) => (wishWaitLeft(a) ?? 0) - (wishWaitLeft(b) ?? 0));
  const hist = wishHistory(), gone = hist.filter(h => h.out === 'dropped');
  const decided = recs('fwait').filter(r => r.status && r.status !== 'Waiting');
  fill.innerHTML = `<div class="tiles lt3">${fTile('Waiting', String(wait.length), 'each one waits 48 hours')}${fTile('Saved by letting go', `<span class="mgood">${fEur0(fSum(gone, 'price'))}</span>`, plural(gone.length, 'wish', 'wishes') + ' you let go, from every wishlist')}<div class="tile"><div class="k">How it works</div><div class="h fhow">Want something? Put it on a wishlist with a 48-hour wait instead of buying it. After two days most wants fade, and the ones that don’t are worth it.</div></div></div>
  ${old.length ? MP('One wait list', `<p class="lnone">${plural(old.length, 'item')} still on the old wait list. Move them into Wishlists so there is one list to keep. The old entries stay readable, and you can undo it.</p><button class="btn small primary" data-act="wmovewait">Move wait list into Wishlists</button>`) : ''}
  ${wait.length ? MP('Waiting', `<div class="lrows">${wait.map(r => { const h = wishWaitLeft(r); return `<div class="lrow"><button class="lmain" data-act="open" data-id="${r.id}"><b>${esc(r.name || 'Something')}</b><span>${[h > 0 ? `decide in ${h} h` : 'waited long enough, still want it?', r.kind === 'wishes' ? r.category || 'Wishlist' : 'old wait list', affordLine(num(r.price) || 0, r.id)].filter(Boolean).join(' · ')}</span></button><span class="lside">${eur(num(r.price))}</span><button class="lquick" data-act="fwset" data-id="${r.id}" data-v="Bought">Bought</button><button class="lquick" data-act="fwset" data-id="${r.id}" data-v="Let go">Let go</button></div>`; }).join('')}</div>`, '<button class="chip link" data-act="fwnew">+ Add a wish</button>')
    : `<div class="empty lempty"><h2>Nothing waiting</h2><p>Next time something catches your eye, add it as a wish that waits two days.</p><button class="btn primary" data-act="fwnew">+ Add a wish</button></div>`}
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
  const s = fset(), list = (kind, empty, add) => `${recs(kind).length ? `<div class="lrows">${sortList(recs(kind), KINDS[kind], KINDS[kind].sorts?.[0]?.[0] || 'name').map(row).join('')}</div>` : quiet(empty)}<button class="btn small mmore" data-act="new" data-v="${kind}">${add}</button>`;
  const fld = (label, help, input) => `<div class="fset"><div><b>${label}</b>${help ? `<span>${help}</span>` : ''}</div>${input}</div>`;
  const accs = recs('faccounts').sort((a, b) => (a.archived ? 1 : 0) - (b.archived ? 1 : 0) || ['Spending', 'Savings', 'Card'].indexOf(a.type || 'Spending') - ['Spending', 'Savings', 'Card'].indexOf(b.type || 'Spending') || norm(a.name).localeCompare(norm(b.name)));
  return `<div class="fsetgrid">
    ${MP('Your money', `
      ${fld('Your name', 'Shown in the greeting. Optional.', `<input class="finp" data-fset="name" value="${esc(s.name || '')}" placeholder="Your name">`)}
      ${fld('Currency', 'Changes how amounts are written. It doesn’t convert anything.', `<select class="finp" data-fset="currency">${CURRENCIES.map(([c, l]) => `<option value="${c}" ${(s.currency || 'EUR') === c ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
      ${fld('How often you’re paid', 'Safe to spend covers the time until your next payday.', `<select class="finp" data-fset="cycle"><option value="Monthly">Once a month</option></select>`)}
      ${fld('Plan everyday spending', fMode() === 'month' ? 'Per month: each category is a budget for the calendar month.' : 'Per paycheck: each category is an envelope that fills on payday.', `<select class="finp" data-fset="envMode"><option value="pay" ${fMode() === 'pay' ? 'selected' : ''}>Per paycheck (envelopes)</option><option value="month" ${fMode() === 'month' ? 'selected' : ''}>Per month</option></select>`)}
      ${fld('Usual pay', 'Used to plan the paydays ahead and to split your pay.', `<input class="finp" type="number" inputmode="decimal" step="0.01" data-fset="payAmount" value="${s.payAmount ?? ''}">`)}
      ${fld('Next payday', '', `<input class="finp" type="date" data-fset="payday" value="${esc(s.payday || '')}">`)}
      ${fld('Safety buffer', 'Kept back from safe to spend, for surprises.', `<input class="finp" type="number" inputmode="decimal" step="1" data-fset="buffer" value="${s.buffer ?? 100}">`)}
      ${wishBudgetField()}`)}
    ${MP('Your accounts', `${accs.length ? `<div class="lrows facclist">${accs.map(accRow).join('')}</div>` : quiet('Add your bank accounts to see balances and safe to spend.')}<p class="lnone">Counts: the account is part of safe to spend. Add the IBAN to an account so bank imports land on it by themselves.</p><div class="dbtns"><button class="btn small" data-act="fcheck">Update balances</button><button class="btn small" data-act="fmove">⇄ Move money</button></div>`, '<button class="chip link" data-act="new" data-v="faccounts">+ Add an account</button>')}
    ${MP('Import and backup', `<p class="lnone">Bank statements from ING or Rabobank (CSV). Duplicates are skipped, own transfers are recognised and your sort rules pick the categories.</p><div class="dbtns"><button class="btn small primary" data-act="fcsv">Import bank CSV</button><button class="btn small" data-act="import">Import budget backup</button><button class="btn small" data-act="fdups">Find duplicates</button></div><p class="lnone">Imported something twice? Find duplicates keeps one copy of everything and removes the rest.</p><div class="dbtns"><button class="btn small danger" data-act="fclear">Clear all finance data</button></div><p class="lnone">Removes everything in Finance so you can import again from scratch.</p>`)}
    ${MP('Categories', list('fcats', 'No categories yet.', '+ Category') + '<p class="lnone">Open one to set its budget, let it roll over, or mark it as not spending.</p>')}
    ${MP('Sort rules', list('frules', 'No rules yet. A rule puts every purchase whose name contains a word in a category.', '+ Sort rule'))}
    ${MP('Quick adds', list('fchips', 'No quick adds yet.', '+ Quick add'))}
  </div>`;
}
/* ---------- duplicates ----------
   Importing the same money twice (for example the budget backup and the converted file) leaves two copies of
   everything under different ids. This finds them, keeps one, points every link at the one that stays and
   removes the rest in one step you can undo. Copies that came in with the same import stay: two coffees on
   the same day are real. */
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
  const map = new Map(), fill = new Map();
  for (let pass = 0; pass < 6; pass++) {
    let found = 0;
    for (const kind of FIN_KINDS) {
      const groups = new Map();
      for (const r of recs(kind)) { if (map.has(r.id)) continue; const k = dupKey(r, map); groups.has(k) ? groups.get(k).push(r) : groups.set(k, [r]); }
      for (const list of groups.values()) {
        if (list.length < 2) continue;
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

/* ---------- your own overview per section ----------
   Every section's overview is made of blocks (the tiles, each panel). In the section's Settings you show or hide
   each block, put them in your own order, and add blocks of your own: a list from this section or a note.
   Saved in your prefs, so every device shows the same. */
const overviewOf = sec => { const s = SECTIONS.find(x => x.key === sec); if (!s) return ''; const p = sec + '/' + s.views[0][0]; return PAGES[p]?.render ? p : ''; };
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
    return wrap(tidyPanel() + `<section class="panel setpanel"><h3>Taste</h3><p class="muted">The weekly deals plan follows this. Separate things with commas.</p>
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
  if (sec === 'care') {
    const goal = Number(C.prefs().waterGoal) || 8, wk = recs('bsched')[0];
    return wrap(`<section class="panel setpanel"><h3>Life</h3>
      <div class="fset"><div><b>Daily water goal</b><span>Glasses a day on Today and in Life.</span></div><input class="finp" type="number" min="1" max="40" data-watergoal value="${goal}"></div>
      <div class="fset"><div><b>Skincare week</b><span>${esc(wk ? KINDS.bsched.sub(wk) : 'Which night is acid, retinoid or recovery.')}</span></div><button class="btn small" data-act="${wk ? 'open' : 'new'}" ${wk ? `data-id="${wk.id}"` : 'data-v="bsched"'}>${wk ? 'Change' : 'Plan it'}</button></div></section>`);
  }
  if (sec === 'fit') { const wk = recs('fsched')[0]; return wrap(`<section class="panel setpanel"><h3>Fitness</h3><div class="fset"><div><b>Workout week</b><span>${esc(wk ? KINDS.fsched.sub(wk) : 'One video workout per day.')}</span></div><button class="btn small" data-act="${wk ? 'open' : 'new'}" ${wk ? `data-id="${wk.id}"` : 'data-v="fsched"'}>${wk ? 'Change' : 'Plan it'}</button></div></section>`); }
  if (sec === 'social') { const acc = recs('accounts'); return wrap(`<section class="panel setpanel"><h3>Accounts</h3>${acc.length ? `<div class="lrows">${acc.map(row).join('')}</div>` : quiet('Add your Instagram and TikTok so the feed planner shows your profile.')}<button class="btn small mmore" data-act="new" data-v="accounts">+ Account</button></section>`); }
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
  if (wact === 'wait') { await save(r, { wait: 48, waitFrom: Date.now() }); C.toast('Waiting 48 hours. If you still want it then, it’s worth it.'); }
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

/* ---------- what index.html calls ---------- */
const sectionOf = view => SECTIONS.find(s => view.startsWith(s.key + '/'));
return {
  sections: SECTIONS.map(s => ({ key: s.key, label: s.label, icon: G(s.icon), groups: Object.fromEntries(Object.entries(s.groups || {}).map(([g, [l, ic]]) => [g, [l, G(ic)]])), views: s.views.map(([k, l, ic, g]) => [s.key + '/' + k, l, G(ic), g || '']) })),
  has: view => !!PAGES[view],
  lists: optionLists, fullList: fullOptions, renameIn: renameOption,
  search, openFound, settingsPanels,
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
  stop() { channel?.unsubscribe(); channel = null; },
  userName: () => (C && fset()?.name) || '',
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
