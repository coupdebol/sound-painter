// Look-ahead clock running at 1/32-note ticks. Drives the step sequencer and the
// arpeggiator, scheduling notes slightly ahead on the audio clock for tight timing.
import { DIV_TICKS, SCALES } from './params.js';

export const MAX_STEPS = 32;
export const RANGE = 24; // two octaves of pitch per pattern

export function emptyPattern() {
  return {
    steps: Array.from({ length: MAX_STEPS }, () => ({ on: false, note: 0, accent: false, slide: false })),
  };
}

// snap a semitone offset to the nearest note of the scale
export function quantize(semi, scale) {
  const s = SCALES[scale] || SCALES.chromatic;
  let best = 0, bestD = 99;
  for (let o = -1; o <= 3; o++) {
    for (const d of s) {
      const v = o * 12 + d;
      const dist = Math.abs(v - semi);
      if (dist < bestD) { bestD = dist; best = v; }
    }
  }
  return Math.max(0, Math.min(RANGE, best));
}

export function scaleRows(scale) {
  const s = SCALES[scale] || SCALES.chromatic;
  const rows = [];
  for (let o = 0; o < 2; o++) for (const d of s) rows.push(o * 12 + d);
  rows.push(RANGE);
  return rows; // ascending semitone offsets
}

export function randomPattern(scale) {
  const rows = scaleRows(scale);
  const pat = emptyPattern();
  let last = 0;
  for (const st of pat.steps) {
    st.on = Math.random() < 0.72;
    // mostly stay low and near the previous note, sometimes jump an octave
    let idx = Math.random() < 0.55 ? last : Math.floor(Math.random() * Math.min(rows.length, 9));
    if (Math.random() < 0.15) idx = Math.min(rows.length - 1, idx + Math.floor(rows.length / 2));
    st.note = rows[idx];
    last = idx;
    st.accent = Math.random() < 0.25;
    st.slide = Math.random() < 0.2;
  }
  return pat;
}

export class Sequencer {
  constructor(engine, state) {
    this.engine = engine;
    this.s = state; // shared app state (patterns, settings, params)
    this.seqPlaying = false;
    this.running = false;
    this.tick = 0;
    this.seqStep = 0;
    this.prevSlide = false;
    this.arpNotes = []; // in the order they were pressed
    this.arpIndex = 0;
    this.arpPrevGate = false;
    this.listeners = [];
    this.timer = null;
  }

  onStep(fn) { this.listeners.push(fn); }

  tickDur() {
    return 60 / this.s.params.bpm / 8; // 1/32 note
  }

  // swing pushes the second 16th of every 8th later
  swingOffset(tick) {
    return tick % 4 >= 2 ? this.s.params.swing * this.tickDur() * 2 * 0.66 : 0;
  }

  play() {
    if (this.seqPlaying) return;
    this.seqPlaying = true;
    this.seqStep = 0;
    this.prevSlide = false;
    this.ensureClock();
  }

  stop() {
    this.seqPlaying = false;
    this.prevSlide = false;
    this.engine.panic();
    this.listeners.forEach((fn) => fn({ step: -1, time: this.engine.time }));
    this.maybeStopClock();
  }

  setArpNotes(notes) {
    const had = this.arpNotes.length > 0;
    this.arpNotes = notes.slice();
    if (!had && notes.length) this.arpIndex = 0;
    if (notes.length && this.s.arp.on) this.ensureClock();
    if (!notes.length) {
      if (this.arpPrevGate) this.engine.panic();
      this.arpPrevGate = false;
      this.maybeStopClock();
    }
  }

  arpActive() {
    return this.s.arp.on && this.arpNotes.length > 0;
  }

  ensureClock() {
    if (this.running) return;
    this.running = true;
    this.tick = 0;
    this.nextTime = this.engine.time + 0.06;
    this.timer = setInterval(() => this.schedule(), 20);
    this.schedule();
  }

  maybeStopClock() {
    if (this.seqPlaying || this.arpActive()) return;
    this.running = false;
    clearInterval(this.timer);
    this.timer = null;
  }

  schedule() {
    const ahead = this.engine.time + 0.12;
    while (this.nextTime < ahead) {
      this.processTick(this.tick, this.nextTime + this.swingOffset(this.tick));
      this.nextTime += this.tickDur();
      this.tick++;
    }
  }

  processTick(tick, t) {
    const s = this.s;
    const P = s.params;
    const arp = this.arpActive();

    // ---- step sequencer
    const seqTicks = DIV_TICKS[s.seq.rate] || 2;
    if (this.seqPlaying && tick % seqTicks === 0) {
      const len = s.seq.length;
      const step = this.seqStep % len;
      this.seqStep = (step + 1) % len;
      this.listeners.forEach((fn) => fn({ step, time: t }));
      if (!arp) {
        const st = s.patterns[s.seq.pattern].steps[step];
        const stepDur = seqTicks * this.tickDur();
        if (st.on) {
          const midi = this.baseMidi() + quantize(st.note, s.seq.scale) + s.seq.transpose;
          this.engine.trigger(midi, t, st.slide ? null : stepDur * P.gate, { accent: st.accent, legato: this.prevSlide });
          this.prevSlide = st.slide;
        } else {
          if (this.prevSlide) this.engine.release(t);
          this.prevSlide = false;
        }
      }
    }

    // ---- arpeggiator
    const arpTicks = DIV_TICKS[s.arp.rate] || 2;
    if (arp && tick % arpTicks === 0) {
      const seq = this.arpSequence();
      if (seq.length) {
        let note;
        if (s.arp.mode === 'random') note = seq[Math.floor(Math.random() * seq.length)];
        else note = seq[this.arpIndex % seq.length];
        this.arpIndex++;
        this.engine.trigger(note, t, arpTicks * this.tickDur() * P.gate, {});
        this.arpPrevGate = true;
      }
    }
  }

  baseMidi() {
    return 12 * (this.s.seq.octave + 1) + this.s.seq.root;
  }

  arpSequence() {
    const { mode, octaves } = this.s.arp;
    const base = mode === 'played' ? this.arpNotes.slice() : this.arpNotes.slice().sort((a, b) => a - b);
    let notes = [];
    for (let o = 0; o < octaves; o++) notes.push(...base.map((n) => n + 12 * o));
    if (mode === 'down') notes.reverse();
    if (mode === 'updown' && notes.length > 1) notes = notes.concat(notes.slice(1, -1).reverse());
    return notes;
  }
}
