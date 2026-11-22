# Working on A's Life

This repo is public. Never commit personal data, tokens or secrets, and never ask the owner to paste a secret in chat.

## Talking with the owner
- Reply in Dutch, in active sentences. Never use an em-dash. Use emoji to keep it visual.
- Ask one question at a time, as a clickable question with neutral options. Make every next action clickable, also at the end of a message.
- Give direct links wherever possible: to the app page (https://andriettaaa.github.io/jettas-closet/#<page>), the PR, GitHub files and the Supabase dashboard.
- When she has to import, copy or paste something, give the file or the full text again in that step, with direct links.

## Making a change
1. Work on a new branch and open a draft PR.
2. Raise `VERSION` in `sw.js` and `APP_VERSION` in `index.html` (hangtag-vNNN) by one.
3. Test with Playwright at 390, 820 and 1280 px against `python3 -m http.server` with a stubbed supabase-js. There should be no console errors and no horizontal scroll.
4. **Always show a visual preview before going live**: send screenshots of the change (at least on a phone width, and on a wider screen when the layout differs) and explain what she sees.
5. Ask before merging. "Zet live" means: mark the PR ready and squash merge.

## Edge functions
She deploys edge functions in `supabase/functions` herself. Give numbered steps:
1. Open the file on GitHub and click **Copy raw file**.
2. Open the function's code page in the Supabase dashboard, then select all and paste.
3. Click **Deploy updates**.

## Commits and PRs
- End commit messages with the co-author trailer the session gives.
- No model names in commits, PR titles or PR texts.
