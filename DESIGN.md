# HARI NG KALSADA — Design Document

*"King of the Road"* — an original top-down open-world crime/driving game set in a
Manila-inspired city. Built in plain HTML5 Canvas + JavaScript, so it runs in any browser (phone or PC)
with no install.

---

## 1. Research — what the reference video shows

The reference clip is a flat, top-down, night-time explainer of a **6-star wanted system**:

| Observation from video | How Hari ng Kalsada uses it |
|---|---|
| Top-down city at night: dark navy roads, dashed lane lines, zebra crosswalks, muted coloured flat buildings with tiny yellow lit windows, soft drop shadows, glowing headlight cones and street-lamp pools | Exact art direction of the game (all procedurally drawn, no image files) |
| Orange player car chased by white police cars with red/blue light bars, armored vans, a helicopter with a spotlight | Pursuit units scale with stars: patrol car → more cars → roadblocks → SWAT armored vans → helicopter + spike strips → military trucks |
| **Six stars** instead of five | Wanted level goes 0–6 ★ |
| A **SUSPECT board** — police identify you by **CCTV, clothes, face and car** (4 clue icons under the stars, "?" when unknown) | Clue row under the stars. Cops/CCTV only learn what they *see*: in a car far away they only learn the car; on foot they learn clothes and face; CCTV learns everything |
| Change your clothes, face or **repaint the car** and the clue gets crossed out | Ukay-Ukay (clothes), Barberya (haircut), Pintura (repaint) and simply switching cars |
| **Solid** stars = being chased, **outlined** stars = police lost sight of you and are searching inside a **search zone** (purple square) | Implemented: lose line-of-sight → stars become outlined and a purple search zone appears on map + minimap |
| **Red** stars = you escaped the zone and are **being forgotten** | Outside the zone, stars turn red and drain one by one; clues fade out |
| If a cop sees you while searching they only recognise you if your look still matches | Recognition check: all visible clues match → instant re-chase; partial match → suspicion meter "?" over the cop; nothing matches → they ignore you |

---

## 2. Concept

**Title:** HARI NG KALSADA: Maynila
**Genre:** Top-down open-world action / driving (2D)
**Platform:** Browser — desktop keyboard or mobile touch (portrait or landscape)
**Tone:** Cartoonish, funny Taglish dialogue, Filipino street culture — jeepneys, tricycles,
sari-sari stores, ukay-ukay, lechon, fiesta banderitas, 5-6 lenders, a corrupt mayor.
Knock-outs instead of killing; no guns for the player.

### Story
**Nonoy Dela Cruz**, a young probinsyano from Samar, arrives in Manila by provincial bus. His family's
farm was taken as collateral by loan shark **Boss Tikboy**, who works for the corrupt **Mayor Kurakot**,
the man stealing the city's relief money (ayuda). Nonoy moves in with his uncle **Tito Boy** (jeepney
operator) and does jobs for the neighbourhood: **Aling Nena** (sari-sari store gossip queen),
**Mang Ben** (talyer / chop-shop mechanic) and **Kuya Paeng** (street racer). He works his way up until he
can steal the mayor's armored van full of stolen money and become *Hari ng Kalsada*.

### Goal
* Main: finish the 8 story missions (ending: Mayor Kurakot arrested, money returned to the people).
* 100%: also find all **20 Gintong Tsinelas** (golden slippers) hidden in the city.
* Free roam forever after: jeepney *pasada* side job, selling cars to Mang Ben, escaping cops.

---

## 3. The City — "Maynila"

A 9×9 grid of streets (≈6 km² in game scale) with Manila Bay on the west.

| District | Look |
|---|---|
| Pantalan (Port) | Concrete yards, colourful containers, piers, Mayor's *bodega* |
| Tondo | Dense small houses with tin roofs, narrow eskinita alleys, fiesta banderitas |
| Divisoria | Open market — rows of colourful stalls |
| Binondo | Red & gold Chinatown buildings, Boss Tikboy's office |
| Quiapo | Big church plaza |
| Intramuros | Walled old city with stone walls, gates and a cathedral |
| Luneta | Big park with paths, trees and a monument |
| Ermita / Malate | Commercial strips along the bay, Baywalk promenade (race start) |
| Sta. Cruz / Paco | Mixed commercial & residential; hospital and police station (Presinto) |
| Makati | Tall glass towers on the south-east |
| Mandaluyong | Residential, Mayor Kurakot's mansion |
| Pasay | Provincial bus terminal (game start) |

Right-hand traffic, one lane each direction; avenues have double yellow lines.
Lamp posts at every corner, CCTV cameras at ~16 intersections (sweeping cones).

### Places you can use
| Place | Use |
|---|---|
| 🏠 Terminal ni Tito Boy | Save game, heal, home garage |
| 👕 Ukay-Ukay ×2 | ₱150 — new random outfit (clears the *clothes* clue) |
| 💈 Barberya ×2 | ₱100 — new haircut / accessories (clears the *face* clue) |
| 🎨 Pintura (paint shop) | ₱300 — repaint + repair car + new plate (clears the *car* clue) |
| 🔧 Talyer ni Mang Ben | Sell stolen cars (after mission 2) |
| 🏪 Sari-sari stores ×4 | ₱30 — tinapay at softdrinks, +40 health |
| 🏥 Ospital | Respawn when knocked out (costs money) / heal |
| 🚓 Presinto | Respawn when arrested (costs money) |

---

## 4. Gameplay

### On foot
Walk / run, punch (knock out people — they drop pesos), enter any vehicle (pull out the driver).

### Vehicles (all drawn top-down)
Jeepney · Tricycle · Motorsiklo · Sedan · Taxi · Hatchback · SUV · Van · Bus · Sports car ·
Police car · Police motorcycle · SWAT armored van · Army truck · Cash armored van · Mayor's black SUV.
Arcade physics with drifting (handbrake), damage → smoke → fire → explosion.

### Wanted system (0–6 ★)
| Stars | Response |
|---|---|
| ★ | 1 patrol car / motorcycle, foot cops |
| ★★ | 3 patrol cars |
| ★★★ | 5 cars + roadblocks |
| ★★★★ | + SWAT armored vans |
| ★★★★★ | + helicopter with spotlight, spike strips |
| ★★★★★★ | + military trucks, 2 helicopters, very aggressive |

Crimes: hitting/punching people, carjacking in view of cops, ramming or wrecking police cars.
Only **witnessed** crimes count (cop line-of-sight or CCTV).

**Escaping:** break line of sight → *search mode* (outlined stars + search zone) → leave the zone →
red stars, heat drains and clues are forgotten. Change clothes / haircut / repaint or swap cars so
cops who spot you don't recognise you.

**Busted:** a cop holds you (on foot, or boxed in while stopped) until the arrest meter fills →
*HULI KA!* → respawn at Presinto, lose money.
**Knocked out:** health reaches 0 → *NAHIMATAY!* → respawn at Ospital, lose money.

---

## 5. Missions (game flow)

| # | Name | Giver | What to do | Teaches | Reward |
|---|---|---|---|---|---|
| 1 | **Bagong Salta** | Tito Boy | Arrive at the bus terminal, get to Tito Boy (borrow a tricycle), drive his jeepney, pick up passengers and drop them at Quiapo, return | Walking, entering vehicles, driving, GPS | ₱800 |
| 2 | **Hiram Muna** | Mang Ben | Steal the red SUV in Makati — its alarm calls the cops — lose them and deliver it to the talyer | Stealing, wanted level, escaping | ₱1,500 |
| 3 | **Mainit Pa!** | Aling Nena | Pick up a lechon and deliver it to the Tondo fiesta before the timer ends without wrecking the car | Timed driving, careful driving | ₱1,200 |
| 4 | **Bagong Itsura** | Aling Nena | CCTV caught you — start with 3★ and full suspect profile. Change clothes, haircut, switch cars and lose the police (shops free) | The clue / disguise system | ₱1,000 |
| 5 | **Karera sa Baywalk** | Kuya Paeng | 11-checkpoint street race against 2 rivals | Racing, handbrake drifting | ₱2,500 |
| 6 | **Singilan** | Boss Tikboy | Chase the debtor Kulas's van and ram it until it stops, then collect | Pursuit & ramming | ₱2,000 |
| 7 | **Buntot** | Tito Boy | Tail the Mayor's black SUV to his secret bodega — not too close, not too far | Tailing | ₱1,500 |
| 8 | **Hari ng Kalsada** | Tito Boy | Steal the Mayor's armored van at the port → instant 5★ (6★ after 25 s) → reach Mang Ben's open garage | Everything | ₱10,000 + ending |

Missions unlock one after another; the next mission's giver appears as a lettered marker on the
map and minimap with a GPS route.

### Side activities
* **Pasada** — drive any jeepney: pick up passengers at the PARA markers, drop them off, get paid.
* **Benta kay Mang Ben** — sell stolen cars (value depends on model).
* **Gintong Tsinelas** — 20 hidden golden slippers (₱100 each; all 20 unlocks a golden sports car at home).

---

## 6. Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move / drive | WASD / arrows | Left joystick (in a car: point where you want to go) |
| Run | Shift | Push the joystick all the way |
| Enter / exit / use | E or F | **SAKAY** button |
| Punch / handbrake | Space | **SUNTOK / PRENO** button |
| Horn | H | **BUSINA** button |
| Map | M | 🗺 button |
| Pause | Esc / P | ☰ button |

---

## 7. Phase 1 additions
* **Music**: step-sequencer synth engine; title theme, 3 radio stations (OPM pop, budots, Pinoy hip-hop with kulintang), lo-fi walking track, star-reactive chase music; car-speaker filter; ducking during dialogue/pause.
* **Checkpoints**: every mission has a checkpoint stage; after failing, ULITIN restarts there (skips intro dialogue, places you nearby, gives a car where needed).
* **Settings**: volumes, difficulty (cop speed/count, arrest time, damage, wanted decay, mission timers), graphics quality, joystick size, left-handed layout, tips.
* **Tutorial tips**: one-time cards for driving, wanted level, search zone, suspect clues, CCTV, disguise shops, pasada, car damage, tsinelas, retry.

## 8. Technical
* `index.html` + `style.css` + `js/*.js` — no build step, no external assets; open `index.html` or host on GitHub Pages.
* Procedural city generated from a fixed seed → same map every time.
* Map rendered into cached 512 px chunks; additive light pass for lamps/headlights/sirens.
* Police path-finding via a Dijkstra flow field over the tile grid; traffic follows lanes on the road graph.
* Sound effects synthesized with WebAudio (engine, siren, horn, crashes, helicopter).
* Progress auto-saved to `localStorage`.
