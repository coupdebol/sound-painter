// Factory pattern bank. Original patterns written in the idioms of classic
// 303 / groovebox styles (not transcriptions of specific records).
//
// Step notation, space separated, one token per step:
//   "7"   note 7 semitones above the root     "."  rest
//   "a"   suffix = accent                      "s"  suffix = slide into the next step
//   e.g. "12as" = octave up, accented, sliding
import { emptyPattern } from './sequencer.js';

export const BANK = [
  // ---- Acid house: octave jumps, slides into the octave, accents on the jump
  { cat: 'Acid House', name: 'Octave Pump', scale: 'minor', root: 9, bpm: 122,
    notes: '0 12 0 12a 0 12s 12 0 0 12 0 12a 3 15s 15 0' },
  { cat: 'Acid House', name: 'Squelch Walk', scale: 'minor', root: 9, bpm: 124,
    notes: '0a . 0 3 . 5s 7 . 0a 0 10s 12 . 7 5 3s' },
  { cat: 'Acid House', name: 'Rolling 16ths', scale: 'minor', root: 4, bpm: 126,
    notes: '0 0 12a 0 0 10 0 12s 0 0 7a 0 0 5 3s 0' },
  { cat: 'Acid House', name: 'Slide Ladder', scale: 'minor', root: 7, bpm: 120,
    notes: '0s 3s 5s 7a . 7 10s 12a 0 . 0s 3s 5a . 3 0' },
  { cat: 'Acid House', name: 'Jack Sparse', scale: 'minor', root: 9, bpm: 121,
    notes: '0a . . 0 . . 12s 0 . 0 . 3a . . 7s 5' },
  { cat: 'Acid House', name: 'Question Answer', scale: 'dorian', root: 2, bpm: 123,
    notes: '0 0 3 5a . 5s 7 . 0 0 10 9a . 7s 5 3' },

  // ---- Acid techno: phrygian b2, relentless 16ths, odd lengths drifting against the bar
  { cat: 'Acid Techno', name: 'Warehouse Drill', scale: 'phrygian', root: 4, bpm: 138,
    notes: '0 0 1 0 0a 0 1s 0 0 0 13a 0 0 1 0 7s' },
  { cat: 'Acid Techno', name: 'Phrygian Stab', scale: 'phrygian', root: 5, bpm: 140,
    notes: '0a . 1 . 0 . 12as 0 . 1 0 . 7a . 1s 0' },
  { cat: 'Acid Techno', name: 'Odd Loop 13', scale: 'phrygian', root: 9, bpm: 136,
    notes: '0 12a 0 0 3s 5 0 12 0 7a 0 3 1s' },
  { cat: 'Acid Techno', name: 'Three Over Four', scale: 'minor', root: 2, bpm: 142,
    notes: '0a 0 0 0a 0 0 0a 0 0 0a 0 0 12as 0 7 0' },
  { cat: 'Acid Techno', name: 'Eleven Spiral', scale: 'phrygian', root: 0, bpm: 145,
    notes: '0 1s 0 12a 0 0 7s 8 0 13a 0' },
  { cat: 'Acid Techno', name: 'Hammer 32', scale: 'phrygian', root: 4, bpm: 140,
    notes: '0a 0 0 12 0 0 1 0 0a 0 0 12 0 0 7s 8 0a 0 0 12 0 0 1 0 0a 13s 12 0 1s 0 7a 5s' },

  // ---- Trance / rolling: offbeat bass and gallops
  { cat: 'Trance', name: 'Offbeat Roll', scale: 'minor', root: 9, bpm: 138,
    notes: '. 0 0a 0 . 0 0a 0 . 3 3a 3 . 5 5a 5' },
  { cat: 'Trance', name: 'Gallop', scale: 'minor', root: 2, bpm: 136,
    notes: '0a . 0 0 0a . 0 0 3a . 3 3 5a . 7s 5' },
  { cat: 'Trance', name: 'Rising Gate', scale: 'harmMinor', root: 9, bpm: 140,
    notes: '. 0 0 0 . 0 0 0 . 3 3 3 . 2 2 11s' },

  // ---- Electro / EBM: machine 16ths and syncopated funk
  { cat: 'Electro / EBM', name: 'Body Drive', scale: 'minor', root: 4, bpm: 118,
    notes: '0a 0 0 0 0a 0 0 0 3a 3 3 3 5a 5 3 3' },
  { cat: 'Electro / EBM', name: 'Electro Funk', scale: 'minor', root: 7, bpm: 112,
    notes: '0a . . 12 . 0 . 10 0a . 7 . 5 . 3s 0' },
  { cat: 'Electro / EBM', name: 'Robot Steps', scale: 'pentaMin', root: 0, bpm: 125,
    notes: '0a . 7 . 0 10 . 7 0a . 12 . 10 7 5s 3' },

  // ---- Italo / disco: octave bass
  { cat: 'Italo / Disco', name: 'Octave Disco', scale: 'minor', root: 9, bpm: 120,
    notes: '0 12 0 12 0 12 0 12 5 17 5 17 7 19 7 19' },
  { cat: 'Italo / Disco', name: 'Italo Gallop', scale: 'minor', root: 2, bpm: 118,
    notes: '0a 0 12 0 0a 0 12 0 3a 3 15 3 5a 5 17 5' },
  { cat: 'Italo / Disco', name: 'Major Strut', scale: 'major', root: 0, bpm: 116,
    notes: '0a . 12 . 4 . 16 . 5a . 17 . 7 9 11s 12' },

  // ---- Deep / dub / minimal: space, tension, short loops
  { cat: 'Deep / Minimal', name: 'Dub Pulse', scale: 'dorian', root: 7, bpm: 118,
    notes: '0a . . . . . 0s 7 . . 0 . . . 10s 12' },
  { cat: 'Deep / Minimal', name: 'Blip 12', scale: 'minor', root: 9, bpm: 124,
    notes: '0a . . 7 . . 0 . . 10 . .' },
  { cat: 'Deep / Minimal', name: 'Deep Dorian', scale: 'dorian', root: 2, bpm: 120,
    notes: '0 . 9 . 10s 12 . 7 0 . 9 . 5s 3 . 0' },
  { cat: 'Deep / Minimal', name: 'Slow Burn', scale: 'minor', root: 4, bpm: 122, rate: '1/8',
    notes: '0as 12 7 . 3s 5 0a .' },

  // ---- Leads & arps: melodic runs for higher octaves
  { cat: 'Leads / Arps', name: 'Penta Climb', scale: 'pentaMaj', root: 0, bpm: 128,
    notes: '0 4 7 9 12 16 19 21 24 21 19 16 12 9 7 4' },
  { cat: 'Leads / Arps', name: 'Minor Cascade', scale: 'minor', root: 9, bpm: 130,
    notes: '0 3 7 12 15 19 15 12 7 3 7 12 15 12 7 3' },
  { cat: 'Leads / Arps', name: 'Blues Riff', scale: 'blues', root: 4, bpm: 110,
    notes: '0a . 3 . 5 6s 7 . 10 . 7 . 5 3s 0 .' },
  { cat: 'Leads / Arps', name: 'Snake Charmer', scale: 'harmMinor', root: 4, bpm: 126,
    notes: '0 2 3 . 7a 8s 11 12a . 11 8 7s 3 2 0 .' },

  // ---- Wild: slide-heavy chaos
  { cat: 'Wild', name: 'Slide Storm', scale: 'minor', root: 9, bpm: 132,
    notes: '0s 12s 3s 15as 0s 12 . 7s 19as 7 . 0s 10s 22a 10 0' },
  { cat: 'Wild', name: 'Chromatic Worm', scale: 'chromatic', root: 4, bpm: 134,
    notes: '0 1 0 2s 3 0 1a 0 6s 7 0 1 0 11s 12a 0' },
  { cat: 'Wild', name: 'Ping Pong 24', scale: 'minor', root: 2, bpm: 128,
    notes: '0 24 0 22 0 19a 0 15 0 12s 0 10 0 7a 0 5 0 3s 0 2 0 12a 0 0s' },
];

export const CATEGORIES = [...new Set(BANK.map((p) => p.cat))];

export function parseNotes(str) {
  const pat = emptyPattern();
  const tokens = str.trim().split(/\s+/);
  tokens.forEach((tok, i) => {
    const st = pat.steps[i];
    if (!st || tok === '.') return;
    const m = /^(\d+)([as]*)$/.exec(tok);
    if (!m) return;
    st.on = true;
    st.note = Number(m[1]);
    st.accent = m[2].includes('a');
    st.slide = m[2].includes('s');
  });
  return { pattern: pat, length: tokens.length };
}

export function encodeSteps(steps, length) {
  return steps.slice(0, length).map((st) => (st.on ? `${st.note}${st.accent ? 'a' : ''}${st.slide ? 's' : ''}` : '.')).join(' ');
}
