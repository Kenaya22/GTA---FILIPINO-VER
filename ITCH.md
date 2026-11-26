# Release kit: Hari ng Kalsada

Everything you need to publish the game on **itch.io** (free) or share it anywhere.

## Files
| File | Use |
|---|---|
| `media/trailer.gif` | 12-second gameplay loop for the store page / social posts |
| `media/home.png`, `media/chase.png`, `media/province.png`, `media/island.png`, `media/phone-home.png` | Screenshots |
| `media/feature-1024x500.png` | Google Play feature graphic / itch.io banner |
| `media/preview.png` (1200×630) | Link preview image (already used for Facebook / Messenger previews) |
| `icons/icon-512.png` | Game icon / cover thumbnail |

## Publish on itch.io (about 10 minutes)
1. Download the repo as a ZIP (GitHub → **Code → Download ZIP**). Unzip it, then zip **the contents** again (so `index.html` is at the top level of the zip).
2. On itch.io: **Upload new project**.
   - **Kind of project:** HTML
   - Upload the zip and tick **"This file will be played in the browser"**
   - **Viewport:** 1280 × 720, tick **Mobile friendly** and **Fullscreen button**
3. Cover image: `icons/icon-512.png` (or a crop of `media/chase.png`). Screenshots: the `media/` images. Gameplay GIF: `media/trailer.gif`.
4. Paste the text below, set **Genre: Action**, tags below, **Pricing: Free**, then **Save & view page** → **Public**.

## Store page text
**Hari ng Kalsada: Manila** — King of the Road

An original top-down open-world game across five Filipino places — Manila, Cebu, Davao, Baguio and Boracay. Drive jeepneys and tricycles, outsmart a **6-star wanted system** that recognizes you by your clothes, face and car, and take down a corrupt mayor — then follow the story through the province, **Cebu**, **Davao** and the pine-covered mountain city of **Baguio** and the island of **Boracay** across **5 chapters and 33 missions** with choices and multiple endings.

- 🚌 Jobs: jeepney pasada, taxi, ride-hailing, food rider, tow, ambulance, fire truck, fishing, tour guide, underground races
- ⏱ Ghost Time Trial — share your run as a link and race a friend's ghost
- ⭐ 6-star police chases with disguises, helicopters and roadblocks; guns and gun ranges
- 🚁 Helicopters, bikes, boats and planes between cities
- 🌀 Typhoons, fiestas, Simbang Gabi, street events, a pet dog and collectibles
- 🎤 Mini-games: videoke, 3-point shootout, tumbang preso, sipa
- 📈 Levels & skills, daily challenges, mission medals, New Game+
- 📱 Plays on phones and keyboard · Filipino or English · installable & offline

**Tags:** open-world, driving, philippines, filipino, top-down, police, pixel-free, singleplayer, browser, mobile

## Share link
`https://kenaya22.github.io/hari-ng-kalsada/` (GitHub Pages). On a phone, open it and tap **📲 I-INSTALL ANG APP** on the home page, or **Share → Add to Home Screen** on iPhone.

See **STORE.md** for publishing to Google Play.

## Releasing an update
1. Bump `GAME_VERSION` in `js/util.js` and add an entry to `CHANGES` in `js/ui.js` and to `CHANGELOG.md`.
2. If you added new Filipino text, add its English to `EXTRA` in `tools/i18n/en_src.py` and run `cd tools/i18n && python3 build.py`.
3. Run `python3 tools/update-sw.py` so phones with the installed app download the new files.
4. Push. Installed apps show "May bagong update!" and update on the next restart.
