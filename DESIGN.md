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

## Answers from the full app round (all built in one go)

### Section overview pages
- Kitchen: the big card changes with the time: breakfast in the morning, lunch around noon, dinner from 15:00 (with Kookstand / Ander recept). Small cards: shopping list, running low. Folded: deals, drinks, analysis.
- Finance: big card "Veilig te besteden" until payday (+ Uitgave, Check saldo). Small cards: to sort, this week's bills. Folded: Klarna, savings goals, month.
- Home: big card the chore that matters now (Gedaan, Later). Small cards: plants to water, move list. Folded: this week, repairs, moodboard.
- Closet: big card today's outfit. Small cards: long not worn, wishlist. Folded: cost per wear, laundry, to check.
- Life: big card this week's goal. Small cards: sleep, cycle. Folded: journal, supplements, gifts.

### Opening and adding things
- Opening something: a nice card with its photo; tap a line to change only that. A button Bewerken opens every field in folded groups.
- Adding: paste a link or photo and the app fills it in for you to check; or start with a name and tap chips for what to add next ("a card that grows").

### Lists
- Rows with swipe on the iPhone, photo cards on iPad and Mac; per list and per device you switch between rows, cards and table, set the card size, and pick which info shows (price, brand, times worn).
- Swipe or press-and-hold actions: done/worn, later/move, remove/archive (with undo), put on a list (shopping, wishlist, outfit).

### Loyalty cards (new)
- A place for loyalty cards, so Klarna is not needed for them. Switch between a stack like Wallet and logo tiles.
- Opening a card: the barcode big on white.
- Quick access: on Today when you are at that shop (location), on your shopping day at the top of that shop's list, and in search.
- Adding: scan the barcode with the camera, type the number, or keep a photo of the front and back.
- No Apple Wallet pass (that needs a paid Apple developer account).

### Calendar, Finance, Closet
- Calendar: all three views to switch between: month with coloured dots, the day as a timeline (with meals and workouts), and a 3-day week to plan by dragging.
- Finance spending: all three to switch between: donut per category, pots as rings, bars to budget (red over 90%).
- Closet: photo grid with times worn, an outfit board to drag pieces on, and capsules with how many outfits they make.
- Check the whole app for double groups, categories and tabs, and merge them.

### Feel
- Theme follows the device (light by day, dark at night as the iPhone sets it).
- Motion (calm, lively, lively + vibration) and spacing (compact, roomy) are a choice per device and per experience in Settings.
- Empty lists: a tip with an emoji and one button, three examples to take over in one tap, and empty parts hidden from overviews until something is in them.
- Before anything goes live: show a working preview that behaves like the real app.
- Language: leave as it is.

## Nails (Beauty › Nails)
Answers from the Nails rounds (November 2026).
- **Drill bits**: a mix of all three views, switchable per device: a holder grid like the real bit holder (numbered slots, a colour per grit), grouped per routine step, and photo cards with labels (shape, grit, material, step, what it is for, speed).
- **More of the same bit**: one card per bit with a count (×3) and per copy in use, spare or worn; in the holder every copy gets its own slot ("1 van 3").
- **Routines**: a builder per part (Removal, Prep, Application, Finish, Aftercare) with steps that link a bit, products, time and a tutorial, drag to reorder; a do-mode that shows one step big with the bit, speed and a timer; sets (BIAB fill, gel polish, acrylic) made of shared blocks per part.
- **Routine from a link**: share a TikTok (or other) link, the app saves it at once with title and thumbnail; the nightly run reads the caption and text and builds a draft routine or tutorial, linking bits and products; in the morning she checks it. No paid AI key.
- **Tutorials**: rows per category, a grid with filter chips (category, Bewaard, Nog proberen, Gedaan) and videos on the routine step they belong to (one tap in do-mode).
- **Tutorial categories**: Nail art (French, Chrome, Aura, Ombré, Cat eye, 3D, Stamping, Line art, Stickers), Applicatie (BIAB, Gel polish, Polygel, Acryl, Tips / Gel-X), Technieken (Vormen en vijlen, Apex, Capping, Drill), Removal, Prep, Finish, Aftercare, Producten; plus her own categories (add and rename). A video can be in more categories; the nightly run picks them.
- **Nail colours**: a colour wall (drops sorted by colour, chips per finish), bottle cards (bottle in the real colour, brand, finish, stars, also wanted colours) and a colour wheel that shows what she is missing.
- **Adding colours from a link**: one product comes in at once via her own Supabase function; a whole collection goes through the nightly run, then "toevoegen?".
- **Big gel sets**: a photo of the set's colour card (the app finds the swatches and numbers), a numbered grid with the camera as a pipette (or the set's link), and every set gets its own code and colour (BP-A 07), a warning when two colours are almost the same, and sticker codes for the caps.
- **Reviews**: a quick review (stars, coverage, how it spreads, true colour, buy again), tested by itself from the nail log (days it lasted against her average, swatch photos day 1, 10, 19) and comparing two side by side (stars, coverage, days, price per ml).
- **Other nail things to keep** (with reviews and links): base, top and builder gels (BIAB, polygel, acrylic) with how much is left; prep liquids (cleaner, dehydrator, primer, remover, cuticle oil); tips and nail art (tips, forms, stickers, foils, chrome powders, glitters, charms); devices and brushes (drill, lamp, brushes, dotting tools) with warranty and care.
- **Nails layout**: tabs (Overzicht, Routines, Bitjes, Kleuren, Spullen, Tutorials, Log); the overview has a big card with the next treatment and ▶ Start routine, then tiles that show what is going on; on the iPad a workplace view while doing a routine: step with timer, the holder with the bit you need lit up, and the video side by side.
- **Adding bits**: a built-in bit guide with the common shapes (tap your shape, explanation, step, grit colours and speed come with it), a shop link that fills in name, photo, shape, grit and material, a photo (the nightly run guesses the shape, she confirms) and a whole set at once with the slots in her holder.
- **Automatic**: a fill reminder after the number of days she picks (notification plus a card on Today with ▶ Start routine); bits count their uses and warn when almost worn, products that run low go on the shopping list; inspiration (a tutorial from Nog proberen at a new set, colours she has not worn for long); cuticle oil twice a day as a tick in the Ochtend and Avond tabs on Today, plus a notification at 11:00 or 22:00 when it is not ticked yet.

## Today, round 3 (November 2026)
- The Nu card (with the drinks ring and the supplement of now) sits at the very top of Today, above the greeting. An item later than 20 minutes from now says "Straks" instead of "Nu".
- Outfits live in the day parts: today's pick in Ochtend, laying out tomorrow's in Avond. No separate outfit block any more.
- The tiles per section are gone from Overzicht (too busy). What only lived there moved into the day: a money chip "€… vandaag" at the top, bills as ticks, a Boodschappen tick on shopping day, skincare as a tick in Ochtend and Avond.
