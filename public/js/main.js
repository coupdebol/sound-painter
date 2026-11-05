import { PARAMS, CHOICES, SCALES, NOTE_NAMES } from './params.js';
import { Engine } from './engine.js';
import { Sequencer, emptyPattern, randomPattern, MAX_STEPS } from './sequencer.js';
import { knob, fader, segmented, toggle } from './ui.js';
import { WavePainter, presetWave, smoothWave, normalizeWave } from './wavepaint.js';
import { Scope } from './scope.js';
import { PatternGrid } from './patterngrid.js';
import { Keyboard } from './keyboard.js';

const STORE_KEY = 'soundpainter.v1';
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ---------- state

function defaultParams() {
  const p = {};
  for (const [id, d] of Object.entries(PARAMS)) p[id] = d.def;
  p.fType = CHOICES.fType.def;
  p.delayDiv = CHOICES.delayDiv.def;
  return p;
}

function demoPattern() {
  const pat = emptyPattern();
  const notes = [0, 0, 12, 0, 3, 0, 7, 10, 0, 12, 0, 5, 3, 0, 15, 7];
  const on = [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1];
  const acc = [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0];
  const sld = [0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0];
  notes.forEach((n, i) => Object.assign(pat.steps[i], { note: n, on: !!on[i], accent: !!acc[i], slide: !!sld[i] }));
  return pat;
}

function defaultState() {
  return {
    params: defaultParams(),
    waves: { A: [...presetWave('saw')], B: [...presetWave('square')] },
    patterns: [demoPattern(), randomPattern('minor'), emptyPattern(), emptyPattern()],
    seq: { pattern: 0, length: 16, rate: '1/16', scale: 'minor', root: 9, octave: 2, transpose: 0 },
    arp: { on: false, mode: 'up', octaves: 1, rate: '1/16', latch: false },
    keys: { mode: 'play', octave: 3 },
  };
}

function loadState() {
  const d = defaultState();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return d;
    const s = JSON.parse(raw);
    return {
      params: { ...d.params, ...s.params },
      waves: s.waves && s.waves.A && s.waves.B ? s.waves : d.waves,
      patterns: Array.isArray(s.patterns) && s.patterns.length === 4 ? s.patterns.map(fixPattern) : d.patterns,
      seq: { ...d.seq, ...s.seq, transpose: 0 },
      arp: { ...d.arp, ...s.arp },
      keys: { ...d.keys, ...s.keys },
    };
  } catch (e) {
    return d;
  }
}

function fixPattern(p) {
  const e = emptyPattern();
  (p.steps || []).slice(0, MAX_STEPS).forEach((st, i) => Object.assign(e.steps[i], st));
  return e;
}

const state = loadState();
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode etc. */ }
  }, 400);
}

// ---------- presets (sound only; patterns untouched)

const PRESETS = {
  'Acid Bass': { p: {}, A: 'saw', B: 'square' },
  'Squelch': { p: { cutoff: 260, reso: 0.9, envMod: 0.85, fD: 0.18, drive: 0.6, accent: 0.9 }, A: 'saw', B: 'square' },
  'Square Acid': { p: { cutoff: 380, reso: 0.75, envMod: 0.6, oscMix: 1, oscBOct: 0, oscBDetune: 0 }, A: 'saw', B: 'square' },
  'Fat Detune': { p: { oscMix: 0.5, oscBOct: 0, oscBDetune: 14, cutoff: 900, reso: 0.35, envMod: 0.4, aS: 0.8, drive: 0.25 }, A: 'saw', B: 'saw' },
  'Soft Pluck': { p: { cutoff: 1400, reso: 0.25, envMod: 0.35, fD: 0.35, aD: 0.35, aS: 0, aR: 0.3, drive: 0.05, delayMix: 0.35, delayFb: 0.5 }, A: 'tri', B: 'organ' },
  'Pad-ish': { p: { aA: 0.4, aD: 1.2, aS: 0.8, aR: 1.2, fA: 0.6, fD: 1.5, fS: 0.4, cutoff: 700, reso: 0.3, envMod: 0.5, oscMix: 0.5, oscBOct: 1, oscBDetune: 9, drive: 0.1, gate: 1, delayMix: 0.4 }, A: 'organ', B: 'tri' },
};

function applyPreset(name) {
  const pr = PRESETS[name];
  if (!pr) return;
  const keep = { bpm: state.params.bpm, swing: state.params.swing, volume: state.params.volume };
  Object.assign(state.params, defaultParams(), pr.p, keep);
  state.waves.A = [...presetWave(pr.A)];
  state.waves.B = [...presetWave(pr.B)];
  engine.setWave('A', Float32Array.from(state.waves.A));
  engine.setWave('B', Float32Array.from(state.waves.B));
  engine.applyAll();
  renderers.forEach((r) => r());
  showWave();
  save();
}

// ---------- engine + sequencer

const engine = new Engine(state.params);
engine.waves.A = Float32Array.from(state.waves.A);
engine.waves.B = Float32Array.from(state.waves.B);
const seq = new Sequencer(engine, state);

const renderers = [];
const onParam = (id) => {
  engine.set(id);
  if (id === 'oscBDetune') engine.set('oscBOct');
  save();
};

$$('[data-knob]').forEach((el) => renderers.push(knob(el, el.dataset.knob, state.params, onParam)));
$$('[data-fader]').forEach((el) => renderers.push(fader(el, el.dataset.fader, state.params, onParam)));
renderers.push(segmented($('#fType'), 'fType', state.params, onParam));
renderers.push(segmented($('#delayDiv'), 'delayDiv', state.params, onParam));

// ---------- power on (iOS needs a user gesture before audio can start)

async function powerOn() {
  await engine.start();
  scope.analyser = engine.analyser;
  $('#power').classList.add('hidden');
}
$('#power').addEventListener('pointerdown', (e) => { e.preventDefault(); powerOn(); });
// iOS can suspend audio after interruptions; any touch brings it back
document.addEventListener('pointerdown', () => {
  if (engine.ctx && engine.ctx.state !== 'running') engine.ctx.resume();
}, true);

// ---------- wave painter

let slot = 'A';
const painter = new WavePainter($('#wave'), (w) => {
  state.waves[slot] = [...w];
  engine.setWave(slot, Float32Array.from(w));
  save();
});
function showWave() {
  painter.set(state.waves[slot], state.waves[slot === 'A' ? 'B' : 'A']);
  $$('[data-slot]').forEach((b) => b.classList.toggle('on', b.dataset.slot === slot));
}
$$('[data-slot]').forEach((b) => b.addEventListener('pointerdown', () => { slot = b.dataset.slot; showWave(); }));
function setWave(w) {
  state.waves[slot] = [...w];
  engine.setWave(slot, Float32Array.from(w));
  showWave();
  save();
}
$$('[data-wave]').forEach((b) => b.addEventListener('pointerdown', () => setWave(presetWave(b.dataset.wave))));
$('#waveSmooth').addEventListener('pointerdown', () => setWave(smoothWave(state.waves[slot])));
$('#waveNorm').addEventListener('pointerdown', () => setWave(normalizeWave(state.waves[slot])));
showWave();

// ---------- scope

const scope = new Scope($('#scope'));

// ---------- transport

const playBtn = $('#play');
function setPlaying(on) {
  if (on) { powerOn().then(() => seq.play()); } else seq.stop();
  playBtn.classList.toggle('on', on);
  playBtn.textContent = on ? '■ STOP' : '▶ PLAY';
}
playBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); setPlaying(!seq.seqPlaying); });
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); setPlaying(!seq.seqPlaying); }
});

// ---------- sequencer UI

const grid = new PatternGrid($('#grid'), state, save);
const stepQueue = [];
seq.onStep((ev) => stepQueue.push(ev));

const lengthChoice = { options: CHOICES.seqLength.options };
segmented($('#seqLength'), 'length', state.seq, () => { grid.draw(); save(); }, lengthChoice);
segmented($('#seqRate'), 'rate', state.seq, save, CHOICES.seqRate);

function renderPatternBtns() {
  $$('[data-pattern]').forEach((b) => b.classList.toggle('on', Number(b.dataset.pattern) === state.seq.pattern));
}
$$('[data-pattern]').forEach((b) => b.addEventListener('pointerdown', () => {
  state.seq.pattern = Number(b.dataset.pattern);
  renderPatternBtns();
  grid.draw();
  save();
}));
renderPatternBtns();

const scaleSel = $('#scale');
const scaleNames = { minor: 'Minor', major: 'Major', dorian: 'Dorian', phrygian: 'Phrygian', harmMinor: 'Harm. minor', pentaMin: 'Penta minor', pentaMaj: 'Penta major', blues: 'Blues', chromatic: 'Chromatic' };
scaleSel.innerHTML = Object.keys(SCALES).map((k) => `<option value="${k}">${scaleNames[k]}</option>`).join('');
scaleSel.value = state.seq.scale;
scaleSel.addEventListener('change', () => { state.seq.scale = scaleSel.value; grid.draw(); save(); });

const rootSel = $('#root');
rootSel.innerHTML = NOTE_NAMES.map((n, i) => `<option value="${i}">${n}</option>`).join('');
rootSel.value = state.seq.root;
rootSel.addEventListener('change', () => { state.seq.root = Number(rootSel.value); grid.draw(); save(); });

function renderSeqOct() { $('#seqOctVal').textContent = `OCT ${state.seq.octave}`; }
$('#seqOctDown').addEventListener('pointerdown', () => { state.seq.octave = Math.max(0, state.seq.octave - 1); renderSeqOct(); save(); });
$('#seqOctUp').addEventListener('pointerdown', () => { state.seq.octave = Math.min(5, state.seq.octave + 1); renderSeqOct(); save(); });
renderSeqOct();

const toolBtns = { draw: $('#toolDraw'), erase: $('#toolErase') };
function setTool(t) {
  grid.tool = t;
  Object.entries(toolBtns).forEach(([k, b]) => b.classList.toggle('on', k === t));
}
toolBtns.draw.addEventListener('pointerdown', () => setTool('draw'));
toolBtns.erase.addEventListener('pointerdown', () => setTool('erase'));
setTool('draw');

function replacePattern(p) {
  state.patterns[state.seq.pattern] = p;
  grid.draw();
  save();
}
$('#dice').addEventListener('pointerdown', () => replacePattern(randomPattern(state.seq.scale)));
$('#clear').addEventListener('pointerdown', () => replacePattern(emptyPattern()));
function shift(dir) {
  const steps = state.patterns[state.seq.pattern].steps;
  const len = state.seq.length;
  const head = steps.slice(0, len);
  const rotated = dir > 0 ? [head[len - 1], ...head.slice(0, len - 1)] : [...head.slice(1), head[0]];
  rotated.forEach((st, i) => { steps[i] = st; });
  grid.draw();
  save();
}
$('#shiftL').addEventListener('pointerdown', () => shift(-1));
$('#shiftR').addEventListener('pointerdown', () => shift(1));

// ---------- arpeggiator

let latched = [];
const held = [];
function arpInput() { return state.arp.latch ? latched : held; }

const arpBtn = $('#arpOn');
toggle(arpBtn, () => state.arp.on, () => {
  state.arp.on = !state.arp.on;
  if (!state.arp.on) { latched = []; seq.setArpNotes([]); } else seq.setArpNotes(arpInput());
  save();
});
const latchBtn = $('#arpLatch');
toggle(latchBtn, () => state.arp.latch, () => {
  state.arp.latch = !state.arp.latch;
  latched = held.slice();
  if (state.arp.on) seq.setArpNotes(arpInput());
  save();
});
segmented($('#arpMode'), 'mode', state.arp, save, CHOICES.arpMode);
segmented($('#arpOct'), 'octaves', state.arp, save, CHOICES.arpOct);
segmented($('#arpRate'), 'rate', state.arp, save, CHOICES.arpRate);

// ---------- keyboard

segmented($('#keyMode'), 'mode', state.keys, () => { state.seq.transpose = 0; renderTranspose(); save(); }, CHOICES.keyMode);
function renderTranspose() {
  const t = state.seq.transpose;
  $('#transposeVal').textContent = state.keys.mode === 'transpose' ? `TRANSP ${t > 0 ? '+' : ''}${t}` : '';
}
renderTranspose();

const kb = new Keyboard($('#keys'), {
  onDown: async (m) => {
    await powerOn();
    const first = held.length === 0;
    held.push(m);
    if (state.arp.on) {
      if (state.arp.latch) {
        if (first) latched = [];
        if (!latched.includes(m)) latched.push(m);
      }
      seq.setArpNotes(arpInput());
    } else if (state.keys.mode === 'transpose') {
      state.seq.transpose = m - 12 * (kb.octave + 1);
      renderTranspose();
    } else {
      engine.trigger(m, engine.time + 0.005, null, { legato: !first });
    }
  },
  onUp: (m) => {
    const i = held.indexOf(m);
    if (i >= 0) held.splice(i, 1);
    if (state.arp.on) {
      if (!state.arp.latch) seq.setArpNotes(held);
    } else if (state.keys.mode === 'play') {
      if (held.length) engine.trigger(held[held.length - 1], engine.time + 0.005, null, { legato: true });
      else engine.release(engine.time + 0.005);
    }
  },
});
kb.octave = state.keys.octave;
kb.build();
function renderKbOct() { $('#kbOctVal').textContent = `C${kb.octave}`; }
$('#kbOctDown').addEventListener('pointerdown', () => { kb.setOctave(kb.octave - 1); state.keys.octave = kb.octave; renderKbOct(); save(); });
$('#kbOctUp').addEventListener('pointerdown', () => { kb.setOctave(kb.octave + 1); state.keys.octave = kb.octave; renderKbOct(); save(); });
renderKbOct();

// ---------- presets + reset

const presetSel = $('#preset');
presetSel.innerHTML = '<option value="">PRESET…</option>' + Object.keys(PRESETS).map((n) => `<option>${n}</option>`).join('');
presetSel.addEventListener('change', () => { applyPreset(presetSel.value); presetSel.value = ''; });

// ---------- animation loop: scope + playhead

function frame() {
  scope.draw();
  const now = engine.time;
  let ev = null;
  while (stepQueue.length && stepQueue[0].time <= now) ev = stepQueue.shift();
  if (ev) grid.setPlayhead(ev.step);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// block pinch-zoom / double-tap zoom on iOS while playing the instrument
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
