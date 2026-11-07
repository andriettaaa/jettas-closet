// A's Life calendar → your iPhone (or any calendar app) as subscribed calendars, one per area.
// The app keeps a snapshot of its master calendar in a 'calfeed' record (30 days back to 4 months ahead,
// refreshed while the app is open). This function serves it as iCalendar:
//   GET /functions/v1/calendar?t=<CAL_TOKEN>&cat=life|body|kitchen|money|social|home|closet|orders|all
// Secrets: CAL_TOKEN (the key shown in Life › Settings), SPEND_USER_ID (your user id).
// Turn off "Verify JWT" for this function: calendar apps can't sign in, the token protects it instead.
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const NAMES: Record<string, string> = { life: 'Life', body: 'Body', kitchen: 'Kitchen', money: 'Finance', social: 'Social', home: 'Home', closet: 'Closet', orders: 'Bestellingen', all: 'Alles' };
// the a.ndrietta brand board, the same colours as the calendar in the app
const COLORS: Record<string, string> = { life: '#B97F86', body: '#6F7A5A', kitchen: '#B0835C', money: '#4D0E12', social: '#ABBCD8', home: '#E3CF8E', closet: '#1E1A19', orders: '#7E93B9', all: '#B97F86' };
type Item = { id: string; cat: string; date: string; time?: string; title: string; sub?: string; imp?: boolean; done?: boolean };

const esc = (s: string) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// lines longer than 75 octets are folded: CRLF plus a space
function fold(line: string) {
  const enc = new TextEncoder(), out: string[] = []; let cur = '';
  for (const ch of line) { if (enc.encode(cur + ch).length > 74) { out.push(cur); cur = ' ' + ch; } else cur += ch; }
  out.push(cur); return out.join('\r\n');
}
const ymd = (d: string) => d.replace(/-/g, '');
const nextDay = (d: string) => { const [y, m, dd] = d.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, dd + 1)); return x.toISOString().slice(0, 10); };
function uidOf(id: string) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0; return `${(h >>> 0).toString(36)}-${id.length}@aslife`; }
const TZ = ['BEGIN:VTIMEZONE', 'TZID:Europe/Amsterdam', 'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT', 'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD', 'END:VTIMEZONE'];

// the app's "Test verbinding" button reads this from the browser, so it may be read from any page
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS' };
const say = (msg: string, status: number) => new Response(msg, { status, headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' } });
// a key pasted with a space, a line break or quotes around it still counts
const clean = (v: string | null | undefined) => String(v ?? '').trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const u = new URL(req.url), t = clean(u.searchParams.get('t')), cat = (u.searchParams.get('cat') || 'all').toLowerCase();
  const tok = clean(Deno.env.get('CAL_TOKEN'));
  if (!tok) return say('CAL_TOKEN is missing: add it under Edge Functions > Secrets in Supabase', 500);
  if (t !== tok) return say('forbidden: the key in this link is not the same as CAL_TOKEN in Supabase', 403);
  if (!NAMES[cat]) return say('unknown calendar', 404);
  const uid = clean(Deno.env.get('SPEND_USER_ID'));
  if (!uid) return say('SPEND_USER_ID is missing: add your user id under Edge Functions > Secrets in Supabase', 500);
  const { data, error } = await sb.from('records').select('data,updated_at').eq('user_id', uid).eq('kind', 'calfeed').order('updated_at', { ascending: false }).limit(1);
  if (error) return say('error reading your calendar: ' + error.message, 500);
  const items: Item[] = (data?.[0]?.data?.items || []).filter((e: Item) => e && e.date && (cat === 'all' || e.cat === cat));
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//A\'s Life//Calendar//NL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:A's Life · ${NAMES[cat]}`, 'X-WR-TIMEZONE:Europe/Amsterdam', `X-APPLE-CALENDAR-COLOR:${COLORS[cat]}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H', ...TZ];
  for (const e of items) {
    const tm = /^(\d{1,2}):(\d{2})/.exec(e.time || '');
    const summary = `${e.done ? '✓ ' : ''}${e.imp ? '★ ' : ''}${e.title}`;
    lines.push('BEGIN:VEVENT', `UID:${uidOf(e.id + '|' + e.date)}`, `DTSTAMP:${stamp}`);
    if (tm) {
      const h = Number(tm[1]), m = tm[2], end = `${String(Math.min(23, h + 1)).padStart(2, '0')}${m}00`;
      lines.push(`DTSTART;TZID=Europe/Amsterdam:${ymd(e.date)}T${String(h).padStart(2, '0')}${m}00`, `DTEND;TZID=Europe/Amsterdam:${ymd(e.date)}T${end}`);
    } else lines.push(`DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${ymd(nextDay(e.date))}`, 'TRANSP:TRANSPARENT');
    lines.push(`SUMMARY:${esc(summary)}`, `DESCRIPTION:${esc([e.sub, `Uit A's Life · ${NAMES[e.cat] || ''}`].filter(Boolean).join('\n'))}`, `CATEGORIES:${esc(NAMES[e.cat] || e.cat)}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return new Response(lines.map(fold).join('\r\n') + '\r\n', { headers: { ...CORS, 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'max-age=900', 'Content-Disposition': `inline; filename="aslife-${cat}.ics"` } });
});
