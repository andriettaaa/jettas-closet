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

## Whole app, expert round (November 2026)
Design every part as an expert in that field would.
- **Kitchen** (chef, dietitian): week menu in one tap from her recipes, pantry and deals, missing things straight on the list; cook mode (step by step, big, timers per step, screen stays on); balance per day in colours (vegetables, protein, fibre; no calories); leftovers and use-by first, with recipes that use them.
- **Finance** (coach): pots as glasses that empty, a colour when going too fast; a short month story (where the money went, what went well, one tip); savings goals with a photo, a bar and how much per week to be on time; a subscriptions check (all fixed costs, a nudge when one gets dearer or goes unused). On one of the tabs: everything, in and out, with a filter for in or out.
- **Closet** (stylist): capsules (small sets that all combine, per season or trip, with how many outfits); cost per wear and what she never wears; an outfit board to move pieces freely; gaps in the closet (what would unlock more outfits).
- **Home** (organizer): a cleaning schedule spread over the week (a quarter of an hour a day); room by room (to do, what is there, what to buy); household stock that goes on the shopping list when low; the move as a plan per week up to the moving date, with budget.
- **Life, Body, Mind** (coach): cycle coach (tips per phase for food, sport, energy, skin; a nudge before the period); a Sunday week review with her numbers and one focus; habits as rings with streaks and a friendly reminder; one tap a day for mood and energy, with links to sleep, food and cycle.
- **Social** (content manager): content calendar per week with drag; an idea bank (catch ideas in one tap, also from a link; suggestions for this week); statistics (best posts, best time); collaborations as a pipeline (asked, confirmed, posted, paid).
- **Calendar**: everything in one place with a colour per kind (appointments, cycle, bills, chores, posts, outfits); filter chips per kind; plan the week ahead (meals, sport, chores, free time); appointments in the iPhone calendar too; and plain calendar items of her own that are not an appointment, goal or task.
- **Lists everywhere**: cards with photo, rows with swipe, a table, and per list and per device her own choice.
- **Notifications**: a morning briefing at 8:00 (appointments, weather, outfit, what she can spend); in-the-moment ones (supplements, drinks, cuticle oil, evening routine); an evening check at 21:00 (what is open, outfit for tomorrow); Sunday week start (review and planner).
- **Deals**: she plans the week ahead from Friday to Sunday, so next week's offers must be visible by Friday; the deal runs move from Wednesday to Friday, with a Sunday refresh.
- **Search**: everywhere (clothes, recipes, cards, colours, notes, settings); quick add by typing ("melk op lijst", "tandarts vrijdag 10:00"); recent and often opened on top.
- **Preview**: a live test version that works like the app, before anything goes live.

## Menu and sections, per part (November 2026, with pictures)
- **Closet** keeps every tab, including the outfit calendar. Calendar gets a switch: month, week with big photos, list. Outfits gets chips: Looks, Capsules (the app proposes capsules, she adjusts), Board (move pieces freely, save as look). Stats becomes Analyse with folding blocks plus Gaps in your closet (what unlocks the most outfits); account and backup move to Settings. To do becomes a red badge on the Closet tab. The closet itself: photo grid (times worn and price per wear on each photo), shelves per category (swipe, long unworn last) and a rail, switchable, with sort options (A to Z, newest, most worn, longest unworn, price per wear).
- **Kitchen**: tabs from 13 to 8 (Overzicht, Recepten, Menu, Logboek with eten/drinken/gekookt, Voorraad, Boodschappen, Deals, Spullen with keukenspullen/winkels); cook mode; balance per day as dots (vegetables, protein, fibre, fruit); use-by first with recipes.
- **Finance**: tabs from 13 to 6 (Vandaag, Uitgaven with in/out filter and impulses, Vaste lasten, Doelen en schulden, Kaarten, Terugblik); pots as a jar that empties; a month story; savings goals with a photo.
- **Home**: tabs from 8 to 5 (Overzicht, Schoonmaak with schema/logboek, Verhuizen with lijst/moodboard, Planten, Reparaties); a quarter of an hour a day; room by room; household stock to the list.
- **Life**: fewer tabs (Mind 5, Train 5, Beauty 6, one Analyse, one Kennis); cycle coach; Sunday week review; mood and energy.
- **Social and Calendar**: groups Werk, Maken, Groei, Bibliotheek, collaborations as a pipeline; content calendar with drag; one calendar with filter chips; her own calendar items, also in the iPhone calendar.
- **Everywhere**: To do as a red badge instead of a tab, Settings as a ⚙️ instead of a named tab, blocks folded by default.

## Forms, round by round (November 2026)
Forms fit on one screen, are visual (emoji, tiles, photos, swatches) and keep extra fields under "More"; every form can switch between its versions, remembered per device.
- **Sleep (a night)**: the sleep clock: drag the moon and the sun around a clock, the hours in the middle; how rested as emoji; the rest under More.
- **Finance (a purchase)**: keypad (big amount, number pad, category tiles), quick chips (her usual purchases, one tap), receipt card (a photo of the receipt fills it in); more options to come.
- **Kitchen (a meal)**: plate (tap what is on it, the plate colours in), from the pantry (photo tiles), photo first.
- **Closet (a piece)**: big photo with colour swatches and chips, link first (shop link fills photo, brand, price), steps (one question per screen).
- **Mind (a check-in)**: faces with an energy slider, three questions one per screen, a journal card in the mood colour; plus voice: speak and the app types what she says.
- **Finance, more**: Apple Pay style card (swipe for the account), split and share (who owes her), "Can I afford it?" (the pot before buying). All six versions switchable.
- **Home (a chore)**: room picture (room, then chore), timer that logs minutes, checklist of small steps.
- **Train (a workout)**: workout card, live sets with a rest timer, from a saved video; the review must be richer than emoji alone.
- **Social (a post)**: post card, quick idea (also by voice), planner (drop on a day); Social gets its own deeper round.
- **Train (the review)**: review sliders (effort, fun, energy after, again, note), body map (where she felt it), personal bests (with voice); every other review in the app gets its own round too.
- **Calendar (an item)**: type it in one line, day strip with a time wheel, templates of her usual plans.
- **Wishlist (a wish)**: link card, price watch with a nudge, moodboard to rank.
- **Kitchen (a recipe)**: from a reel, step cards with timers, a photo of a cookbook page.
- **Kitchen (a recipe review)**: taste dials, tags that teach the app her taste, photo with a verdict; plus a score.
- **Beauty (a product review)**: skin sliders after 1, 4 or 8 weeks, before and after photos, keep or toss.
- **Social, deeper**: post story (stats after a week, do more or skip), content pillars with hooks, brand deal as a card with deadlines and deliverables.
- **Scores, never stars**: always with one decimal (tap the same number again or swipe for halves). Recipes and meals: plates. Beauty, nails, closet and wishes: a score ring. Workouts and sleep: level bars. Check-ins, month review and home: number pills from red to green.
