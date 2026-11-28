# Original soundtrack for the HNK promo: 120 BPM, A minor (Am-F-C-G), synthesized from scratch with numpy.
import json, wave
import numpy as np

SR = 44100
TL = json.load(open('timeline.json'))
END = TL['end'] + 0.6
N = int(END * SR)
BEAT = 0.5
rng = np.random.default_rng(7)
mix = {k: np.zeros(N) for k in ('drums', 'bass', 'chords', 'lead', 'fx')}

def put(track, sig, t, gain=1.0):
    i = int(t * SR)
    if i >= N: return
    j = min(N, i + len(sig))
    mix[track][i:j] += sig[:j - i] * gain

def env(n, a=0.002, d=0.2, curve=4.0):
    t = np.arange(n) / SR
    e = np.exp(-t / max(d, 1e-4) * (curve / 4))
    ai = int(a * SR)
    if ai > 0: e[:ai] *= np.linspace(0, 1, ai)
    return e

def lowpass(x, cutoff):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))

def highpass(x, cutoff):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= (f / cutoff) ** 2 / np.sqrt(1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))

def bandpass(x, lo, hi): return highpass(lowpass(x, hi), lo)

def saw(freq, dur, harm=14, detune=0.0):
    t = np.arange(int(dur * SR)) / SR; s = np.zeros_like(t)
    for k in range(1, harm + 1):
        if freq * k > SR / 2.2: break
        s += np.sin(2 * np.pi * freq * (1 + detune) * k * t) / k
    return s * 0.6

def square(freq, dur, harm=9, vib=0.0):
    t = np.arange(int(dur * SR)) / SR; s = np.zeros_like(t)
    ph = 2 * np.pi * freq * t + (vib * np.sin(2 * np.pi * 5.5 * t) if vib else 0)
    for k in range(1, harm + 1, 2): s += np.sin(k * ph) / k
    return s * 0.7

def midi(n): return 440 * 2 ** ((n - 69) / 12)

# ---- drum kit ----
def kick():
    n = int(0.42 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7.5)
    s[:200] += rng.standard_normal(200) * 0.35 * np.linspace(1, 0, 200)
    return np.tanh(s * 1.6)
def clap():
    n = int(0.25 * SR); s = np.zeros(n)
    for o in (0, 0.011, 0.022):
        i = int(o * SR); m = n - i
        s[i:] += rng.standard_normal(m) * np.exp(-np.arange(m) / SR * (60 if o < 0.02 else 18))
    return bandpass(s, 900, 5000) * 0.9
def hat(open_=False):
    n = int((0.22 if open_ else 0.045) * SR)
    s = highpass(rng.standard_normal(n), 7000) * env(n, 0.0005, 0.09 if open_ else 0.012)
    return s * (0.5 if open_ else 0.55)
def crash():
    n = int(1.8 * SR); return highpass(rng.standard_normal(n), 4500) * env(n, 0.001, 0.9) * 0.5
K, C, H, OH, CR = kick(), clap(), hat(), hat(True), crash()

CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]     # Am F C G (one bar each = 2 s)
ROOTS = [45, 41, 48, 43]
def chord_at(t): return int((t // 2.0) % 4)

drop, drop2, give = TL['drop'], TL['drop2'], TL['give']
slog = TL['slogan'][0][1] - 0.15; cta = TL['cta']

# ---- intro (0 .. drop): plucked chords on each beat, ticking hats ----
for b in range(int(drop / BEAT)):
    t = b * BEAT; ch = CHORDS[chord_at(t)]
    for i, nn in enumerate(ch):
        s = saw(midi(nn + 12), 0.45, harm=8) * env(int(0.45 * SR), 0.003, 0.16)
        put('chords', lowpass(s, 2600), t + i * 0.012, 0.18)
    put('drums', H, t + 0.25, 0.25 + 0.25 * (t > 2))
    if t >= 3.0: put('drums', K, t, 0.55 + 0.15 * (t - 3))
# typing clicks for each word / swap
for _, tt in TL['words1']: put('fx', highpass(rng.standard_normal(1500), 3000) * env(1500, 0.0005, 0.008), tt, 0.5)
for _, tt, _c in TL['swaps']: put('fx', square(midi(84), 0.12, 5) * env(int(0.12 * SR), 0.001, 0.05), tt, 0.25)
# riser into the drop
def riser(t0, t1, g=0.6):
    n = int((t1 - t0) * SR); x = np.linspace(0, 1, n)
    nz = rng.standard_normal(n); out = np.zeros(n); seg = 2048
    for i in range(0, n, seg):
        c = 400 + 9000 * x[min(i, n - 1)] ** 2; out[i:i + seg] = highpass(lowpass(nz[i:i + seg], c * 1.8), c * 0.5)
    tt = np.arange(n) / SR; tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * x ** 2) / SR) * 0.25
    put('fx', (out * 0.6 + tone) * x ** 1.6, t0, g)
riser(3.0, drop); riser(give + 0.1, drop2, 0.45)
def impact(t, g=1.0):
    n = int(2.2 * SR); tt = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(30 + 70 * np.exp(-tt * 6)) / SR) * np.exp(-tt * 2.2)
    put('fx', np.tanh(boom * 2) * 0.9, t, g); put('drums', CR, t, 0.8 * g); put('drums', K, t, 1.0 * g)
impact(drop); impact(drop2, 0.9); impact(cta, 0.8)

# ---- grooves ----
HOOK = [69, 72, 74, 76, 74, 72, 69, None, 67, 69, 72, 69, 67, 64, None, None]   # 16 x 8th notes = 2 bars
def groove(t0, t1, lead=False):
    b = 0
    while t0 + b * BEAT < t1 - 1e-6:
        t = t0 + b * BEAT; ci = chord_at(t)
        put('drums', K, t, 0.95)
        if b % 2 == 1: put('drums', C, t, 0.7)
        put('drums', OH if b % 2 else H, t + 0.25, 0.35)
        put('drums', H, t + 0.125, 0.16); put('drums', H, t + 0.375, 0.16)
        # pumping bass: off-beat 8ths with octave bounce
        for k, (dt, oct_) in enumerate(((0.25, 0), (0.375, 12))):
            s = saw(midi(ROOTS[ci] - 12 + oct_), 0.12, harm=10) * env(int(0.12 * SR), 0.004, 0.09)
            put('bass', lowpass(s, 900), t + dt, 0.55)
        # chord stab on the "and" of 2 and 4
        if b % 2 == 1:
            for i, nn in enumerate(CHORDS[ci]):
                s = (saw(midi(nn + 12), 0.2, 10, 0.004) + saw(midi(nn + 12), 0.2, 10, -0.004)) * env(int(0.2 * SR), 0.003, 0.1)
                put('chords', lowpass(s, 3200), t + 0.25, 0.13)
        if lead:
            for k in range(2):
                step = int(((t - t0) / 0.25) + k) % 16; nn = HOOK[step]
                if nn is None: continue
                s = square(midi(nn + 12), 0.22, 9, vib=0.6) * env(int(0.22 * SR), 0.004, 0.14)
                put('lead', lowpass(s, 4200), t + k * 0.25, 0.15)
        b += 1
groove(drop, give)
groove(drop2, slog, lead=True)
# whooshes on every gameplay cut
def whoosh(t, g=0.5):
    n = int(0.35 * SR); x = np.linspace(0, 1, n); nz = rng.standard_normal(n); out = np.zeros(n)
    for i in range(0, n, 1024):
        c = 600 + 5000 * np.sin(np.pi * x[min(i, n - 1)]); out[i:i + 1024] = bandpass(nz[i:i + 1024], c * 0.6, c * 1.6)
    put('fx', out * np.sin(np.pi * x) ** 1.5, t - 0.17, g)
for c in TL['clips'][1:]: whoosh(c[1], 0.45)
for p in TL['panels'][1:]: whoosh(p[0], 0.35)
whoosh(TL['logo2'], 0.4)
# ---- outro: pad chords, half-time kick, final hit ----
for b in range(int((END - slog) / BEAT)):
    t = slog + b * BEAT; ci = chord_at(t)
    if b % 4 == 0 and t < END - 2.4:
        for i, nn in enumerate(CHORDS[ci]):
            s = (saw(midi(nn), 2.0, 8, 0.003) + saw(midi(nn + 12), 2.0, 6, -0.003)) * env(int(2.0 * SR), 0.08, 1.4)
            put('chords', lowpass(s, 2200), t, 0.12)
    if b % 2 == 0 and t < cta: put('drums', K, t, 0.6)
    if t < cta: put('drums', H, t + 0.25, 0.2)
for i, nn in enumerate([57, 60, 64, 69]):
    s = saw(midi(nn), 2.4, 10) * env(int(2.4 * SR), 0.005, 1.1); put('chords', lowpass(s, 3000), cta, 0.14)

# ---- sidechain (duck bass/chords on kicks during grooves) & mix ----
duck = np.ones(N)
for t0, t1 in ((drop, give), (drop2, slog)):
    t = t0
    while t < t1:
        i = int(t * SR); n = int(0.3 * SR); j = min(N, i + n)
        duck[i:j] = np.minimum(duck[i:j], 1 - 0.75 * np.exp(-np.arange(j - i) / SR * 12)); t += BEAT
def echo(x, d=0.25, fb=0.32, mixv=0.25):
    y = x.copy(); dd = int(d * SR)
    for k in range(1, 5): y[dd * k:] += x[:-dd * k] * (fb ** k) * mixv / fb
    return y
out = mix['drums'] + mix['bass'] * duck + echo(mix['chords'] * duck) + echo(mix['lead'], 0.375, 0.35, 0.3) + mix['fx']
out[-int(0.6 * SR):] *= np.linspace(1, 0, int(0.6 * SR))
out = np.tanh(out / np.percentile(np.abs(out), 99.6) * 1.15) * 0.95
st = np.stack([out, np.roll(out, int(0.0006 * SR))], 1)
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
print('music.wav', round(END, 2), 's')
