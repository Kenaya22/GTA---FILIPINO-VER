# Release kit: Hari ng Kalsada

Everything you need to publish the game on **itch.io** (free) or share it anywhere.

## Files
| File | Use |
|---|---|
| `media/trailer.gif` | 12-second gameplay loop for the store page / social posts |
| `media/home.png`, `media/chase.png`, `media/province.png`, `media/island.png`, `media/phone-home.png` | Screenshots |
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
**Hari ng Kalsada: Maynila** — King of the Road

An original top-down open-world game set on the streets of a Manila-inspired city. Drive jeepneys and tricycles, outsmart a **6-star wanted system** that recognizes you by your clothes, face and car, and take down a corrupt mayor — then head to the province in **Chapter 2** and decide the fate of a farming town.

- 🚌 Jeepney pasada, taxi, food rider, tow truck and underground races
- ⭐ 6-star police chases with search zones, disguises, helicopters and roadblocks
- 🌅 Day/night, rain and floods, traffic lights, taho and balut vendors
- 🏝 An island in Manila Bay and a whole province with a story choice and two endings
- 🎵 Original synthesized OPM, budots and hip-hop radio
- 📱 Plays on phones (joystick or arrow buttons) and keyboard · Filipino or English · installable & offline

**Tags:** open-world, driving, philippines, filipino, top-down, police, pixel-free, singleplayer, browser, mobile

## Share link
`https://kenaya22.github.io/GTA---FILIPINO-VER/` (GitHub Pages). On a phone, open it and tap **📲 I-INSTALL ANG APP** on the home page, or **Share → Add to Home Screen** on iPhone.

## Releasing an update
1. Bump `GAME_VERSION` in `js/util.js` and add an entry to `CHANGES` in `js/ui.js` and to `CHANGELOG.md`.
2. If you added new Filipino text, add its English to `EXTRA` in `tools/i18n/en_src.py` and run `cd tools/i18n && python3 build.py`.
3. Run `python3 tools/update-sw.py` so phones with the installed app download the new files.
4. Push. Installed apps show "May bagong update!" and update on the next restart.
