// Monophonic acid-style voice built from plain Web Audio nodes.
//
//   pitch(ConstantSource) ─┬─> oscA.frequency
//                          └─> oscB.frequency (+octave/detune via .detune)
//   oscA, oscB -> mix -> filter1 -> filter2 -> VCA -> drive -> post ─┬─> master
//                         ^ cutoffEnv(ConstantSource) adds Hz       └─> delay ─> master
//   master -> limiter -> analyser -> speakers

const HARMONICS = 128;

export function waveToPeriodic(ctx, samples) {
  const N = samples.length;
  const real = new Float32Array(HARMONICS + 1);
  const imag = new Float32Array(HARMONICS + 1);
  for (let k = 1; k <= HARMONICS && k < N / 2; k++) {
    let re = 0, im = 0;
    const w = (2 * Math.PI * k) / N;
    for (let n = 0; n < N; n++) {
      re += samples[n] * Math.cos(w * n);
      im += samples[n] * Math.sin(w * n);
    }
    real[k] = (2 / N) * re;
    imag[k] = (2 / N) * im;
  }
  // a silent (flat) drawing would make a zero wave; keep a tiny sine so it stays valid
  if (real.every((v) => v === 0) && imag.every((v) => v === 0)) imag[1] = 1e-4;
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
}

const tc = (t) => Math.max(t / 4, 0.0008); // time constant so ~98% is reached in t

export class Engine {
  constructor(params) {
    this.p = params; // live reference to the values object
    this.ctx = null;
    this.waves = { A: null, B: null };
  }

  get time() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  async start() {
    if (this.ctx) {
      if (this.ctx.state !== 'running') await this.ctx.resume();
      return;
    }
    // iOS 17+: play through the ringer/silent switch
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = (this.ctx = new Ctx({ latencyHint: 'interactive' }));

    this.pitch = new ConstantSourceNode(ctx, { offset: 110 });
    this.oscA = new OscillatorNode(ctx, { frequency: 0 });
    this.oscB = new OscillatorNode(ctx, { frequency: 0 });
    this.pitch.connect(this.oscA.frequency);
    this.pitch.connect(this.oscB.frequency);
    this.gainA = new GainNode(ctx);
    this.gainB = new GainNode(ctx);
    this.oscA.connect(this.gainA);
    this.oscB.connect(this.gainB);

    this.f1 = new BiquadFilterNode(ctx, { type: 'lowpass', Q: 0.5 });
    this.f2 = new BiquadFilterNode(ctx, { type: 'lowpass' });
    this.cutoffEnv = new ConstantSourceNode(ctx, { offset: 0 });
    this.cutoffEnv.connect(this.f1.frequency);
    this.cutoffEnv.connect(this.f2.frequency);
    this.gainA.connect(this.f1);
    this.gainB.connect(this.f1);
    this.f1.connect(this.f2);

    this.vca = new GainNode(ctx, { gain: 0 });
    this.f2.connect(this.vca);

    this.shaper = new WaveShaperNode(ctx, { oversample: '2x' });
    this.post = new GainNode(ctx);
    this.vca.connect(this.shaper);
    this.shaper.connect(this.post);

    this.delay = new DelayNode(ctx, { maxDelayTime: 2 });
    this.delayFb = new GainNode(ctx);
    this.delayWet = new GainNode(ctx);
    this.delayTone = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 3500 });
    this.post.connect(this.delay);
    this.delay.connect(this.delayTone);
    this.delayTone.connect(this.delayFb);
    this.delayFb.connect(this.delay);
    this.delayTone.connect(this.delayWet);

    this.master = new GainNode(ctx);
    this.post.connect(this.master);
    this.delayWet.connect(this.master);
    this.limiter = new DynamicsCompressorNode(ctx, { threshold: -6, knee: 6, ratio: 12, attack: 0.002, release: 0.15 });
    this.analyser = new AnalyserNode(ctx, { fftSize: 2048, smoothingTimeConstant: 0.6 });
    this.master.connect(this.limiter);
    this.limiter.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    for (const s of ['A', 'B']) if (this.waves[s]) this.setWave(s, this.waves[s]);
    this.applyAll();
    this.pitch.start();
    this.cutoffEnv.start();
    this.oscA.start();
    this.oscB.start();
    this.gateOpen = false;
  }

  setWave(slot, samples) {
    this.waves[slot] = samples;
    if (!this.ctx) return;
    const pw = waveToPeriodic(this.ctx, samples);
    (slot === 'A' ? this.oscA : this.oscB).setPeriodicWave(pw);
  }

  // Push one parameter into the audio graph (called whenever a control moves).
  set(id) {
    if (!this.ctx) return;
    const p = this.p;
    const now = this.ctx.currentTime;
    const smooth = (param, v) => param.setTargetAtTime(v, now, 0.015);
    switch (id) {
      case 'oscMix':
        smooth(this.gainA.gain, Math.cos((p.oscMix * Math.PI) / 2) * 0.5);
        smooth(this.gainB.gain, Math.sin((p.oscMix * Math.PI) / 2) * 0.5);
        break;
      case 'oscBOct':
      case 'oscBDetune':
        smooth(this.oscB.detune, p.oscBOct * 1200 + p.oscBDetune);
        break;
      case 'cutoff':
        smooth(this.f1.frequency, p.cutoff);
        smooth(this.f2.frequency, p.cutoff);
        break;
      case 'reso':
        smooth(this.f2.Q, 0.7 + Math.pow(p.reso, 1.6) * 24);
        smooth(this.f1.Q, 0.5 + p.reso * 1.5);
        break;
      case 'fType':
        this.f1.type = p.fType;
        this.f2.type = p.fType;
        break;
      case 'drive':
        this.shaper.curve = makeDriveCurve(p.drive);
        smooth(this.post.gain, 0.9 / (1 + p.drive * 1.2));
        break;
      case 'delayDiv':
      case 'bpm': {
        const sixteenth = 60 / p.bpm / 4;
        const mult = { '1/16': 1, '1/8': 2, '3/16': 3, '1/4': 4 }[p.delayDiv] || 3;
        smooth(this.delay.delayTime, Math.min(1.99, sixteenth * mult));
        break;
      }
      case 'delayFb':
        smooth(this.delayFb.gain, p.delayFb);
        break;
      case 'delayMix':
        smooth(this.delayWet.gain, p.delayMix);
        break;
      case 'volume':
        smooth(this.master.gain, p.volume * p.volume);
        break;
    }
  }

  applyAll() {
    for (const id of ['oscMix', 'oscBOct', 'cutoff', 'reso', 'fType', 'drive', 'bpm', 'delayFb', 'delayMix', 'volume']) this.set(id);
  }

  // Play a note at audio time t. dur = null keeps the gate open (for slides / held keys).
  // legato = glide from the previous note without retriggering the envelopes (303 slide).
  trigger(midi, t, dur, { accent = false, legato = false } = {}) {
    if (!this.ctx) return;
    const p = this.p;
    t = Math.max(t, this.ctx.currentTime);
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const P = this.pitch.offset;
    P.cancelScheduledValues(t);
    if (legato && this.gateOpen) {
      P.setTargetAtTime(freq, t, p.glide / 3);
    } else {
      P.setValueAtTime(freq, t);
      const acc = accent ? p.accent : 0;

      // amp envelope
      const peak = 0.75 + acc * 0.35;
      const g = this.vca.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(peak, t, tc(p.aA));
      g.setTargetAtTime(peak * p.aS, t + p.aA, tc(p.aD));

      // filter envelope (adds Hz on top of the cutoff knob)
      const range = Math.min(14000, 600 + p.cutoff * 6);
      const amount = p.envMod * range * (1 + acc * 1.2);
      const fDecay = p.fD * (1 - acc * 0.5); // accent = snappier, like the 303
      const e = this.cutoffEnv.offset;
      e.cancelScheduledValues(t);
      e.setTargetAtTime(amount, t, tc(p.fA));
      e.setTargetAtTime(amount * p.fS, t + p.fA, tc(fDecay));
    }
    this.gateOpen = true;
    if (dur != null) this.release(t + dur);
  }

  release(t) {
    if (!this.ctx) return;
    const p = this.p;
    t = Math.max(t, this.ctx.currentTime);
    this.vca.gain.cancelScheduledValues(t);
    this.vca.gain.setTargetAtTime(0, t, tc(p.aR));
    this.cutoffEnv.offset.cancelScheduledValues(t);
    this.cutoffEnv.offset.setTargetAtTime(0, t, tc(p.fR));
    this.gateOpen = false;
  }

  // gateOpen tracks scheduling, so close it immediately on hard stop
  panic() {
    if (!this.ctx) return;
    this.release(this.ctx.currentTime);
  }
}

function makeDriveCurve(drive) {
  const n = 2048;
  const k = 1 + drive * 12;
  const curve = new Float32Array(n);
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / norm;
  }
  return curve;
}
