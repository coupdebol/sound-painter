# Sound Painter

Proof of concept: a touch synth / groovebox for the iPad that runs in the browser.
Paint the waveform with your finger, paint acid patterns into the sequencer, and shape the sound with 303-style knobs.

## Run it

```bash
npm start          # or: node server.js   (no dependencies)
```

The server prints a `network:` address. Open it in Safari on an iPad on the same Wi-Fi, then tap **POWER ON**.
Tip: "Share → Add to Home Screen" gives a full-screen app. If you hear nothing, check the volume and (on older iOS) the silent switch.

## What's in it

| Module | Controls |
| --- | --- |
| **Wave Paint** | Draw one cycle for OSC A and OSC B (other wave shown faintly). Presets SIN/TRI/SAW/SQR/PLS/ORG, SMOOTH, NORM. The drawing is turned into a band-limited oscillator (128 harmonics) while you draw. |
| **Osc** | A/B mix, B octave, B fine detune, glide (portamento / slide time) |
| **Filter** | 24 dB LP / BP / HP, cutoff, resonance, env mod, drive (saturation) |
| **Filter env / Amp env** | ADSR faders |
| **Acid** | Accent amount (louder, brighter, snappier), gate length |
| **Delay** | Tempo-synced (1/16, 1/8, 3/16, 1/4), feedback, mix |
| **Sequencer** | 4 patterns, 4–32 steps, 1/8–1/32 rate, scale + root quantize, swipe to paint notes, tap to remove, ACC and SLIDE lanes, erase tool, shift ◀ ▶, DICE (random acid line), clear |
| **Arpeggiator** | Up / down / up-down / random / as-played, 1–3 octaves, 1/4–1/32, latch |
| **Keyboard** | 2 octaves, multi-touch, glide between held keys. TRANSP mode transposes the running sequence. |
| **Top bar** | Play/stop, BPM, swing, volume, sound presets, scope (tap for spectrum) |

Controls: drag knobs up/down, drag faders, double-tap to reset. Several fingers can move different controls at once.
Everything (sound, waves, patterns) autosaves in the browser.

## Code map

- `server.js` – static file server
- `public/js/engine.js` – Web Audio voice: drawn wave → PeriodicWave, filters, envelopes, accent/slide, drive, delay, limiter
- `public/js/sequencer.js` – look-ahead clock, step sequencer, arpeggiator
- `public/js/wavepaint.js`, `patterngrid.js`, `keyboard.js`, `scope.js`, `ui.js` – touch UI
- `public/js/params.js` – every knob's range and default
