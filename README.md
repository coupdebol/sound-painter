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
| **Pattern bank** | Tap **▤ BANK**: 32 factory patterns in 8 styles (Acid House, Acid Techno, Trance, Electro/EBM, Italo/Disco, Deep/Minimal, Leads/Arps, Wild). Tap to load into the current slot, even while playing. Options: SET TEMPO (use the pattern's BPM), KEEP MY KEY. Save your own patterns under My Patterns. |
| **Arpeggiator** | Up / down / up-down / random / as-played, 1–3 octaves, 1/4–1/32, latch |
| **Keyboard** | 2 octaves, multi-touch, glide between held keys. TRANSP mode transposes the running sequence. |
| **Top bar** | Play/stop, BPM, swing, volume, sound presets, scope (tap for spectrum) |

Controls: drag knobs up/down, drag faders, double-tap to reset. Several fingers can move different controls at once.
Everything (sound, waves, patterns) autosaves in the browser.

## About the factory patterns

They are original patterns written in the idioms of each style, not transcriptions of specific records (those lines are copyrighted).
The idioms come from common 303 practice: slides into an octave jump, accents on the jump, phrygian b2 in acid techno,
odd lengths (11, 13 steps) that drift against the bar, offbeat and gallop basses in trance, octave basses in Italo/disco.

Further sources if you want more material:
- [MusicRadar: producer's guide to the TB-303](https://www.musicradar.com/news/producers-guide-to-the-roland-tb-303-and-clones) (accent, slide and odd-length techniques)
- [Acid Patterns notation paper (Organised Sound, 2022)](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/1FE37195243684AD6B6912FAE99E99E0/S1355771822000164a.pdf/acid_patterns_how_people_are_sharing_a_visual_notation_system_for_the_roland_tb303_to_create_and_recreate_acid_house_music.pdf) (how people share 303 patterns)
- [acidpattern](https://awesome.ecosyste.ms/projects/github.com%2Fhenry-oberholtzer%2Facidpattern) (GPL-3.0 pattern sharing site)
- [Acid Tabs on Freesound](https://freesound.org/people/AcidTabs) (mixed licenses; check each one)
- [Project 303](https://www.peff.com/samples/project303/tb303.html) (user-submitted patterns)
- Roland Cloud's [Rob Acid](https://www.roland.com/US/products/rc_tb-303_rob_acid/) and [DJ Pierre's Phuture](https://www.roland.com/UK/products/rc_tb-303_dj_pierre_s_phuture_collection/) collections (commercial, membership only)

To add a pattern, append a line to `BANK` in `public/js/patternbank.js`, e.g. `notes: '0a . 12s 0 ...'`
(number = semitones above the root, `.` = rest, `a` = accent, `s` = slide).

## Code map

- `server.js` – static file server
- `public/js/engine.js` – Web Audio voice: drawn wave → PeriodicWave, filters, envelopes, accent/slide, drive, delay, limiter
- `public/js/sequencer.js` – look-ahead clock, step sequencer, arpeggiator
- `public/js/wavepaint.js`, `patterngrid.js`, `keyboard.js`, `scope.js`, `ui.js` – touch UI
- `public/js/patternbank.js` – factory pattern bank and the step notation
- `public/js/params.js` – every knob's range and default
