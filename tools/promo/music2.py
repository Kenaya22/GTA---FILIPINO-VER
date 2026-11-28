# Original high-energy soundtrack + scene sound effects for the 20 s HNK TikTok ad (128 BPM, A minor).
import json, wave
import numpy as np

SR = 44100
TL = json.load(open('timeline2.json'))
B = TL['beat']; END = TL['end']; N = int((END + 0.05) * SR)
rng = np.random.default_rng(11)
tr = {k: np.zeros(N) for k in ('drums', 'bass', 'chords', 'lead', 'sfx')}

def put(k, sig, t, g=1.0):
    i = int(t * SR)
    if i < 0: sig = sig[-i:]; i = 0
    if i >= N: return
    j = min(N, i + len(sig)); tr[k][i:j] += sig[:j - i] * g
def ar(n, a=0.002, d=0.2):
    t = np.arange(n) / SR; e = np.exp(-t / max(d, 1e-4)); ai = int(a * SR)
    if ai > 0: e[:ai] *= np.linspace(0, 1, ai)
    return e
def filt(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR) + 1e-9
    if hi: X *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo: X *= (f / lo) ** 2 / np.sqrt(1 + (f / lo) ** 4)
    return np.fft.irfft(X, len(x))
def osc(freq, dur, kind='saw', harm=14, det=0.0, vib=0.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = np.broadcast_to(freq, (n,)) if np.ndim(freq) else np.full(n, freq)
    ph = 2 * np.pi * np.cumsum(f * (1 + det)) / SR + (vib * np.sin(2 * np.pi * 6 * t) if vib else 0)
    s = np.zeros(n); fm = float(np.max(f))
    for k in range(1, harm + 1):
        if kind == 'sq' and k % 2 == 0: continue
        if fm * k > SR / 2.3: break
        s += np.sin(k * ph) / k
    return s * 0.6
def nz(dur): return rng.standard_normal(int(dur * SR))
def midi(n): return 440 * 2 ** ((n - 69) / 12)

# ---------- drums ----------
def kick():
    n = int(0.38 * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * np.cumsum(48 + 130 * np.exp(-t * 32)) / SR) * np.exp(-t * 8)
    s[:180] += rng.standard_normal(180) * 0.5 * np.linspace(1, 0, 180); return np.tanh(s * 2.2)
def clap():
    n = int(0.22 * SR); s = np.zeros(n)
    for o in (0, 0.009, 0.019):
        i = int(o * SR); m = n - i; s[i:] += rng.standard_normal(m) * np.exp(-np.arange(m) / SR * (70 if o < 0.015 else 16))
    return filt(s, 1000, 6000)
def hat(l=0.04): return filt(nz(l), 7500) * ar(int(l * SR), 0.0005, l / 3.5) * 0.6
K, C, H, OH = kick(), clap(), hat(), hat(0.2)
CR = filt(nz(1.6), 4000) * ar(int(1.6 * SR), 0.001, 0.8) * 0.55
CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; RT = [45, 41, 48, 43]
ci = lambda t: int((t / (4 * B)) % 4)
segs = TL['segs']; tDrop = next(s['t0'] for s in segs if s['name'] == 'LOGO'); tCta = next(s['t0'] for s in segs if s['name'] == 'CTA')
HOOK = [76, None, 74, 76, 79, None, 76, 74, 72, None, 69, 72, 74, None, 72, 69]

def groove(t0, t1, lead=True, roll_end=None):
    b = 0
    while t0 + b * B < t1 - 1e-6:
        t = t0 + b * B; c = ci(t)
        put('drums', K, t, 1.0)
        if b % 2 == 1: put('drums', C, t, 0.75)
        for k in range(4): put('drums', OH if k == 2 else H, t + k * B / 4, 0.32 if k == 2 else 0.18)
        for k, o in ((1, 0), (2, 12), (3, 0)):
            s = filt(osc(midi(RT[c] - 12 + o), B / 4.2, harm=12), hi=1100) * ar(int(B / 4.2 * SR), 0.003, 0.07); put('bass', s, t + k * B / 4, 0.6)
        if b % 2 == 1:
            for nn in CH[c]:
                s = (osc(midi(nn + 12), 0.18, det=0.005) + osc(midi(nn + 12), 0.18, det=-0.005)) * ar(int(0.18 * SR), 0.002, 0.09); put('chords', filt(s, hi=3500), t + B / 2, 0.12)
        if lead:
            for k in range(2):
                nn = HOOK[int(round((t - t0) / (B / 2))) % 16 + 0] if k == 0 else HOOK[(int(round((t - t0) / (B / 2))) + 1) % 16]
                if nn is None: continue
                s = filt(osc(midi(nn + 12), B / 2.2, 'sq', 9, vib=0.5), hi=5000) * ar(int(B / 2.2 * SR), 0.003, 0.12); put('lead', s, t + k * B / 2, 0.13)
        b += 1

# hard start: drop on frame 1 (no intro), build into the logo drop, second drop, then CTA
groove(0, tDrop - 2 * B)
for k in range(16):                                  # accelerating snare roll + riser into the logo
    t = tDrop - 2 * B + k * B / 8; put('drums', C, t, 0.25 + 0.04 * k)
n = int(2 * B * SR); x = np.linspace(0, 1, n); r = np.zeros(n); src = nz(2 * B)
for i in range(0, n, 2048): c = 500 + 9000 * x[i] ** 2; r[i:i + 2048] = filt(src[i:i + 2048], c * 0.4, c * 1.8)
put('sfx', (r * 0.7 + np.sin(2 * np.pi * np.cumsum(250 + 1400 * x ** 2) / SR) * 0.3) * x ** 1.5, tDrop - 2 * B, 0.55)
groove(tDrop, tCta)
# CTA: half-time + big chord + rising arp, final hit right at the loop point
for b in range(int((END - tCta) / B)):
    t = tCta + b * B
    if b % 2 == 0: put('drums', K, t, 0.9)
    if b % 4 == 2: put('drums', C, t, 0.7)
    put('drums', H, t + B / 2, 0.2)
    for k, nn in enumerate([69, 72, 76, 81]):
        s = filt(osc(midi(nn + (12 if b >= 4 else 0)), B / 4.5, 'sq', 7), hi=5200) * ar(int(B / 4.5 * SR), 0.002, 0.06); put('lead', s, t + k * B / 4, 0.09)
for nn in [45, 57, 60, 64, 69]:
    s = (osc(midi(nn), 3.0, det=0.004) + osc(midi(nn), 3.0, det=-0.004)) * ar(int(3.0 * SR), 0.01, 1.6); put('chords', filt(s, hi=2600), tCta, 0.12)

# ---------- sound effects ----------
def impact(t, g=1.0):
    n = int(1.6 * SR); tt = np.arange(n) / SR
    put('sfx', np.tanh(np.sin(2 * np.pi * np.cumsum(32 + 90 * np.exp(-tt * 7)) / SR) * np.exp(-tt * 3) * 2.5), t, g); put('drums', CR, t, 0.7 * g)
def whoosh(t, g=0.5, d=0.32):
    n = int(d * SR); x = np.linspace(0, 1, n); src = nz(d); o = np.zeros(n)
    for i in range(0, n, 1024): c = 700 + 5000 * np.sin(np.pi * x[i]); o[i:i + 1024] = filt(src[i:i + 1024], c * 0.5, c * 1.7)
    put('sfx', o * np.sin(np.pi * x) ** 1.4, t - d * 0.55, g)
def siren(t, d=1.2, g=0.35):           # two-tone wail
    n = int(d * SR); tt = np.arange(n) / SR; f = 700 + 450 * (0.5 + 0.5 * np.sin(2 * np.pi * 2.2 * tt))
    put('sfx', filt(osc(f, d, 'sq', 7), hi=3500) * np.minimum(1, tt * 8) * np.minimum(1, (d - tt) * 5), t, g)
def screech(t, g=0.35):
    d = 0.55; n = int(d * SR); x = np.linspace(0, 1, n)
    s = filt(nz(d), 1800, 4200) * 0.6 + osc(2600 - 600 * x, d, 'saw', 3) * 0.4
    put('sfx', s * np.sin(np.pi * x) ** 0.6, t, g)
def horn(t, g=0.4):                    # jeepney "beep-beep"
    for k in (0, 0.18):
        d = 0.14 if k == 0 else 0.24; s = sum(osc(f, d, 'saw', 8) for f in (392, 494, 587)) / 3
        put('sfx', filt(s, hi=3000) * ar(int(d * SR), 0.005, d * 0.9), t + k, g)
def coin(t, g=0.3):
    for k, f in enumerate((1568, 2093)): put('sfx', osc(f, 0.25, 'sq', 5) * ar(int(0.25 * SR), 0.001, 0.08), t + k * 0.07, g)
def gun(t, g=0.45):
    d = 0.18; put('sfx', np.tanh(filt(nz(d), 300, 6000) * ar(int(d * SR), 0.0005, 0.04) * 3) + np.sin(2 * np.pi * 90 * np.arange(int(d * SR)) / SR) * ar(int(d * SR), 0.001, 0.05), t, g)
def rotor(t, d=1.3, g=0.5):
    n = int(d * SR); tt = np.arange(n) / SR
    put('sfx', filt(nz(d), 60, 600) * (0.35 + 0.65 * (np.sin(2 * np.pi * 14 * tt) > 0.3)) * np.minimum(1, tt * 6) * np.minimum(1, (d - tt) * 4), t, g)
def waves(t, d=1.3, g=0.45):
    n = int(d * SR); x = np.linspace(0, 1, n); put('sfx', filt(nz(d), 200, 2500) * np.sin(np.pi * x) ** 2, t, g)
    for k in (0.3, 0.7):                # gull chirps
        m = int(0.18 * SR); put('sfx', osc(np.linspace(1800, 1300, m), 0.18, 'sq', 3) * ar(m, 0.005, 0.07), t + k, g * 0.35)
def bells(t, g=0.35):
    for k, f in enumerate((1318, 1568, 1976, 2637)):
        n = int(1.0 * SR); tt = np.arange(n) / SR
        s = sum(np.sin(2 * np.pi * f * r * tt) * a for r, a in ((1, 1), (2.76, 0.4), (5.4, 0.2))) * np.exp(-tt * 4)
        put('sfx', s, t + k * 0.11, g * 0.5)
def crowd(t, d=1.3, g=0.5):
    n = int(d * SR); x = np.linspace(0, 1, n)
    s = filt(nz(d), 500, 3000) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * x * d)) * np.minimum(1, x * 3) * np.minimum(1, (1 - x) * 4)
    put('sfx', s, t, g); coin(t + 0.15, 0.3)
def ding(t, g=0.35):
    for k, f in enumerate((1760, 2349)): put('sfx', np.sin(2 * np.pi * f * np.arange(int(0.35 * SR)) / SR) * ar(int(0.35 * SR), 0.001, 0.12), t + k * 0.1, g)
def tap(t, g=0.25): put('sfx', filt(nz(0.02), 2500) * ar(int(0.02 * SR), 0.0005, 0.006), t, g)
def stab(t, g=0.4):
    for k, nn in enumerate((45, 44)):
        s = (osc(midi(nn), 0.3) + osc(midi(nn + 12), 0.3)) * ar(int(0.3 * SR), 0.003, 0.18); put('sfx', filt(s, hi=1800), t + k * 0.28, g)

for i, s in enumerate(segs):
    t0, t1, kind = s['t0'], s['t1'], s['sfx']
    if i > 0 and kind not in ('drop',): whoosh(t0, 0.5)
    if kind == 'hook': impact(0.0, 1.0); siren(0.05, 1.8, 0.3); screech(0.6, 0.3)
    elif kind == 'siren': siren(t0, 1.3, 0.35); screech(t0 + 0.35)
    elif kind == 'horn': horn(t0 + 0.05); coin(t0 + 0.75)
    elif kind == 'guns':
        for k in range(7): gun(t0 + 0.08 + k * 0.11 + (0.12 if k > 3 else 0))
    elif kind == 'heli': rotor(t0)
    elif kind == 'drop': impact(t0, 1.1)
    elif kind == 'waves': waves(t0)
    elif kind == 'bells': bells(t0 + 0.05)
    elif kind == 'crowd': crowd(t0)
    elif kind == 'phone': ding(t0 + 0.05); tap(t0 + 0.55); tap(t0 + 0.85); ding(t0 + 1.0, 0.25)
    elif kind == 'story': stab(t0 + 0.05)
    elif kind == 'map': ding(t0 + 0.3, 0.3)
    elif kind == 'cta': impact(t0, 0.9); [ding(t0 + 1.6 + k * 0.9, 0.22) for k in range(2)]
    # word pops: tiny tick on each caption word
    for k in range(len(s['words'])): tap(t0 + 0.04 + k * 0.09, 0.18)

# ---------- mix ----------
duck = np.ones(N)
t = 0.0
while t < END:
    if t < tCta or int(round((t - tCta) / B)) % 2 == 0:
        i = int(t * SR); j = min(N, i + int(0.28 * SR)); duck[i:j] = np.minimum(duck[i:j], 1 - 0.7 * np.exp(-np.arange(j - i) / SR * 13))
    t += B
def echo(x, d, fb=0.3, m=0.25):
    y = x.copy(); dd = int(d * SR)
    for k in range(1, 4): y[dd * k:] += x[:-dd * k] * (fb ** k) * m / fb
    return y
music = tr['drums'] + tr['bass'] * duck + echo(tr['chords'] * duck, B * 0.75) + echo(tr['lead'], B * 0.75, 0.3, 0.3)
out = music * 0.85 + tr['sfx'] * 1.0
out = np.tanh(out / np.percentile(np.abs(out), 99.5) * 1.15) * 0.95
out[:200] *= np.linspace(0, 1, 200); out[-400:] *= np.linspace(1, 0, 400)
st = np.stack([out, np.roll(out, int(0.0005 * SR))], 1)
with wave.open('music2.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
print('music2.wav', round(END, 2))
