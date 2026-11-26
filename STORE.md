# Google Play kit: Hari ng Kalsada

The game is already an installable PWA, so it can go on Google Play as a **Trusted Web Activity (TWA)** — a thin Android wrapper around the website. Updates you push to GitHub Pages reach Play users automatically; you only rebuild the app if the icon/name changes.

## What you need
- A Google Play developer account (one-time US$25 fee).
- The live site: `https://kenaya22.github.io/hari-ng-kalsada/`

## Build the Android app (no coding, ~15 minutes)
1. Open **https://www.pwabuilder.com**, paste the site link, and press **Start**.
2. Choose **Package for stores → Android → Generate Package** (keep the defaults; Package ID e.g. `io.github.kenaya22.harinkalsada`).
3. Download the zip. It contains an `.aab` file (upload this to Play) and a `signing.keystore` + `assetlinks.json`. **Keep the keystore and its passwords safe — you need them for every future update.**
4. Copy `assetlinks.json` into this repo at `.well-known/assetlinks.json` and push. (This removes the browser address bar inside the app.)
   - GitHub Pages hides folders that start with a dot unless there is an empty `.nojekyll` file at the repo root — add one.

## Play Console listing
| Field | Value |
|---|---|
| App name | Hari ng Kalsada: Manila |
| Short description (80) | Open-world na laro sa kalye ng Manila, Cebu, Davao at Baguio. Offline! |
| Category | Game → Action (or Racing) |
| Icon (512×512) | `icons/icon-512.png` |
| Feature graphic (1024×500) | `media/feature-1024x500.png` |
| Phone screenshots | `media/phone-home.png`, `media/chase.png`, `media/province.png`, `media/island.png`, `media/home.png` |
| Content rating | Fill the questionnaire honestly: cartoon violence, guns, police chases → usually **Teen / PEGI 12–16** |
| Ads / in-app purchases | None |
| Data safety | The game collects **no data** (progress is saved only on the phone) |
| Privacy policy | `https://kenaya22.github.io/hari-ng-kalsada/privacy.html` (included in the repo as `privacy.html`) |

**Full description:** use the store text in `ITCH.md`.

## Release
1. Play Console → **Create app** → fill the listing above.
2. **Testing → Internal testing** first: upload the `.aab`, add your own email as a tester, install from the link and play.
3. New personal developer accounts must run a **closed test with at least 12 testers for 14 days** before production — invite friends/family (Messenger group works).
4. Then **Production → Create release** → upload the same `.aab` → submit for review (usually 1–7 days).

## Updating
- Game changes: just push to GitHub as usual (see the release steps in `ITCH.md`). Play users get them on next launch.
- App name/icon changes: regenerate in PWABuilder **with the same keystore**, bump the version code, upload the new `.aab`.
