# A's Life: design decisions

The owner picked these from visual examples. Every change to the app follows them.

## Principles
- Seamless: no stack of loose boxes. One flow per page; things fold in and out.
- Visual: emoji or a real logo on things, rings for progress, photos where there are photos.
- Per device: iPhone, iPad and MacBook each get their own layout, and the owner can change it per device.
- Free tiers only (GitHub Pages, Supabase free). No paid services; automate with edge functions, pg_cron and scheduled tasks.

## Today
- **iPhone:** "one story". On top a greeting with the day's progress ring, small chips for weather and the affirmation, then the outfit strip, then the day.
- **iPad:** portrait like the iPhone; landscape with the side bar (like the MacBook). It switches when the iPad turns.
- **MacBook:** a side bar with every section on the left, Today like the phone on the right.
- **The day:** tabs Ochtend, Middag, Avond, Overzicht (swipe between them). The current part starts with the big Nu card (Gedaan / Iets anders / Later). Under it a bar with drinks (liters, water on its own) and the supplements of now. The rest are tiles with a progress ring and an emoji. A tap ticks simple things; meals, supplements and routines open their sheet; press and hold for later or skip.
- **Overzicht tab:** Na te lopen, Komende week and the tiles per section.
- **Outfit:** in the morning the outfit is the Nu card with 3 suggestions for the weather; during the day a small strip on top (Wissel, Foto, Gedragen); in the evening a card with tomorrow's outfit to lay out.
- **Celebration:** small for every tick (the ring pops), confetti when a part of the day or the whole day is done.
- **Customise:** in Settings › Vandaag per device (order with handles, on/off), and on Today itself by press and hold (blocks wiggle, drag, ⊖ to hide).

## The rest of the app
- **Shell:** on wide screens (MacBook, iPad landscape) a side bar everywhere that folds to icons only.
- **Section overview pages** (Kitchen, Finance, Home, Closet, Life): a mix. Tabs on top, one big card for what matters now, small cards with the numbers, the rest folded.
- **Choice lists** (shops, brands, materials, colours): tabs per kind with search and add on top; logo tiles on iPad and MacBook, a folding list on the iPhone. Colours as swatches, materials with an emoji.
- **Logos:** fetched automatically from the shop's website (its icon), and the owner can upload her own per shop.
- **Settings:** every panel folds into one line with a short hint.

## Drinks
- Tap the drinks bar: pick what, then how much (200, 250, 300, 500 ml or an own size kept as a button). Goal in liters, everything counts, water shown on its own. Kitchen › Drinken has the week and a reminder when behind.
