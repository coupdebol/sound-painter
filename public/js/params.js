// Every knob / fader on the panel. curve 'exp' maps the control logarithmically
// (good for frequencies and times).
const ms = (v) => (v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(2)}s`);
const pct = (v) => `${Math.round(v * 100)}%`;
const hz = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`);

export const PARAMS = {
  // transport
  bpm: { label: 'BPM', min: 60, max: 200, def: 124, step: 1, fmt: (v) => `${Math.round(v)}` },
  swing: { label: 'SWING', min: 0, max: 0.6, def: 0, fmt: pct },
  volume: { label: 'VOLUME', min: 0, max: 1, def: 0.7, fmt: pct },

  // oscillators
  oscMix: { label: 'A ⇄ B', min: 0, max: 1, def: 0, fmt: (v) => `${Math.round((1 - v) * 100)}/${Math.round(v * 100)}` },
  oscBOct: { label: 'B OCT', min: -2, max: 2, def: -1, step: 1, fmt: (v) => (v > 0 ? `+${v}` : `${v}`) },
  oscBDetune: { label: 'B FINE', min: -50, max: 50, def: 7, step: 1, fmt: (v) => `${Math.round(v)}c` },
  glide: { label: 'GLIDE', min: 0.005, max: 0.5, def: 0.06, curve: 'exp', fmt: ms },

  // filter
  cutoff: { label: 'CUTOFF', min: 40, max: 12000, def: 420, curve: 'exp', fmt: hz },
  reso: { label: 'RESO', min: 0, max: 1, def: 0.7, fmt: pct },
  envMod: { label: 'ENV MOD', min: 0, max: 1, def: 0.6, fmt: pct },
  drive: { label: 'DRIVE', min: 0, max: 1, def: 0.35, fmt: pct },

  // filter envelope
  fA: { label: 'A', min: 0.001, max: 2, def: 0.002, curve: 'exp', fmt: ms },
  fD: { label: 'D', min: 0.02, max: 3, def: 0.28, curve: 'exp', fmt: ms },
  fS: { label: 'S', min: 0, max: 1, def: 0, fmt: pct },
  fR: { label: 'R', min: 0.01, max: 3, def: 0.12, curve: 'exp', fmt: ms },

  // amp envelope
  aA: { label: 'A', min: 0.001, max: 2, def: 0.002, curve: 'exp', fmt: ms },
  aD: { label: 'D', min: 0.02, max: 3, def: 0.5, curve: 'exp', fmt: ms },
  aS: { label: 'S', min: 0, max: 1, def: 0.55, fmt: pct },
  aR: { label: 'R', min: 0.01, max: 3, def: 0.06, curve: 'exp', fmt: ms },

  // acid
  accent: { label: 'ACCENT', min: 0, max: 1, def: 0.65, fmt: pct },
  gate: { label: 'GATE', min: 0.05, max: 1, def: 0.55, fmt: pct },

  // fx
  delayFb: { label: 'FEEDBACK', min: 0, max: 0.9, def: 0.35, fmt: pct },
  delayMix: { label: 'DELAY MIX', min: 0, max: 1, def: 0.18, fmt: pct },
};

export const CHOICES = {
  fType: { label: 'MODE', options: ['lowpass', 'bandpass', 'highpass'], names: ['LP', 'BP', 'HP'], def: 'lowpass' },
  delayDiv: { label: 'TIME', options: ['1/16', '1/8', '3/16', '1/4'], def: '3/16' },
  seqLength: { label: 'STEPS', options: [4, 8, 11, 12, 13, 16, 24, 32], def: 16 },
  seqRate: { label: 'RATE', options: ['1/8', '1/16', '1/32'], def: '1/16' },
  arpMode: { label: 'MODE', options: ['up', 'down', 'updown', 'random', 'played'], names: ['UP', 'DOWN', 'UP/DN', 'RAND', 'ORDER'], def: 'up' },
  arpOct: { label: 'OCT', options: [1, 2, 3], def: 1 },
  arpRate: { label: 'RATE', options: ['1/4', '1/8', '1/16', '1/32'], def: '1/16' },
  keyMode: { label: 'KEYS', options: ['play', 'transpose'], names: ['PLAY', 'TRANSP'], def: 'play' },
};

// note lengths in 1/32 ticks
export const DIV_TICKS = { '1/4': 8, '3/16': 6, '1/8': 4, '1/16': 2, '1/32': 1 };

export const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmMinor: [0, 2, 3, 5, 7, 8, 11],
  pentaMin: [0, 3, 5, 7, 10],
  pentaMaj: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function toNorm(p, v) {
  if (p.curve === 'exp') return Math.log(v / p.min) / Math.log(p.max / p.min);
  return (v - p.min) / (p.max - p.min);
}
export function fromNorm(p, n) {
  n = Math.min(1, Math.max(0, n));
  let v = p.curve === 'exp' ? p.min * Math.pow(p.max / p.min, n) : p.min + n * (p.max - p.min);
  if (p.step) v = Math.round(v / p.step) * p.step;
  return v;
}
