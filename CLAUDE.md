# Working on A's Life

This repo is public. Never commit personal data, tokens or secrets, and never ask the owner to paste a secret in chat.

## Talking with the owner
- Reply in Dutch, in active sentences. Never use an em-dash. Use emoji to keep it visual.
- Ask one question at a time, as a clickable question with neutral options. Make every next action clickable, also at the end of a message.
- **Instructions are never hidden under a clickable question.** When a message has steps she must follow (SQL to run, a file to copy, something to tap), put the steps in the message text and do NOT open a clickable question in that same message: the question window covers the text. Write the steps as short numbered steps that say exactly where to go (with a direct link), what to tap and what she should see. Ask the clickable question only in the next message, after she says she is done.
- Give direct links wherever possible: to the app page (https://andriettaaa.github.io/jettas-closet/#<page>), the PR, GitHub files and the Supabase dashboard.
- When she has to import, copy or paste something, give the file or the full text again in that step, with direct links.
- Her iPhone is set to English. Write steps on the iPhone (Shortcuts, Settings, Health) in English with the English button names (Shortcuts, Automation, Get Contents of URL, Show More, Done).

## Design
Read `DESIGN.md` before changing how the app looks or works: it holds the owner's choices per page and per device.

## Making a change
1. Work on a new branch and open a draft PR.
2. Raise `VERSION` in `sw.js` and `APP_VERSION` in `index.html` (hangtag-vNNN) by one.
3. Test with Playwright at 390, 820 and 1280 px against `python3 -m http.server` with a stubbed supabase-js. There should be no console errors and no horizontal scroll.
4. **Always show a visual preview before going live**: send screenshots of the change (at least on a phone width, and on a wider screen when the layout differs) and explain what she sees.
5. Ask before merging. "Zet live" means: mark the PR ready and squash merge.

## iPhone Shortcuts
- Never put setup steps for Shortcuts (Apple Health, sharing, automations) in the app. The app only shows what came in.
- Give her a copyable text in chat that she pastes in the AI of the Shortcuts app, one text per Shortcut or automation, in a code block. Never put the token in it: write that she fills in her OFFERS_TOKEN herself.

## Edge functions
She deploys edge functions in `supabase/functions` herself. Give numbered steps:
1. Open the file on GitHub and click **Copy raw file**.
2. Open the function's code page in the Supabase dashboard, then select all and paste.
3. Click **Deploy updates**.

## Commits and PRs
- End commit messages with the co-author trailer the session gives.
- No model names in commits, PR titles or PR texts.
