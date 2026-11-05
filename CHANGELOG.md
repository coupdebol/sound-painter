# Changelog

## v0.1.0 — first proof of concept

Touch synth / groovebox for the iPad, running in the browser.

**Sound**
- Finger-painted waveforms for two oscillators, with A/B mix, B octave and detune, and glide
- 303-style voice: 24 dB filter (LP / BP / HP), cutoff, resonance, env mod, drive, accent, slide
- Filter and amp ADSR, tempo-synced delay, oscilloscope and spectrum view
- 6 sound presets

**Sequencing**
- Step sequencer: 4 pattern slots, 4–32 steps (including odd 11 and 13), 1/8–1/32 rate
- Scale and root quantize, swipe to paint notes, accent and slide lanes, dice, shift, erase
- Pattern bank: 32 original classic-style patterns in 8 styles, plus your own saved patterns
- Arpeggiator: up, down, up-down, random, as played; 1–3 octaves; latch
- Two-octave multi-touch keyboard with transpose mode

**Other**
- Autosaves sound, waves and patterns in the browser
- Zero-dependency Node server (`npm start`)
