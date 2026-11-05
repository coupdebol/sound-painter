// Finger-drawn single-cycle waveform. 256 points, -1..1.
export const WAVE_N = 256;

export const WAVE_PRESETS = {
  sine: (x) => Math.sin(2 * Math.PI * x),
  tri: (x) => 1 - 4 * Math.abs(((x + 0.25) % 1) - 0.5),
  saw: (x) => 1 - 2 * x,
  square: (x) => (x < 0.5 ? 0.9 : -0.9),
  pulse: (x) => (x < 0.2 ? 0.9 : -0.9),
  organ: (x) => 0.6 * Math.sin(2 * Math.PI * x) + 0.3 * Math.sin(6 * Math.PI * x) + 0.2 * Math.sin(10 * Math.PI * x),
};

export function presetWave(name) {
  const f = WAVE_PRESETS[name];
  return Float32Array.from({ length: WAVE_N }, (_, i) => f(i / WAVE_N));
}

export function smoothWave(w) {
  const out = new Float32Array(WAVE_N);
  for (let i = 0; i < WAVE_N; i++) {
    let s = 0;
    for (let k = -3; k <= 3; k++) s += w[(i + k + WAVE_N) % WAVE_N];
    out[i] = s / 7;
  }
  return out;
}

export function normalizeWave(w) {
  let mean = 0;
  for (const v of w) mean += v;
  mean /= WAVE_N;
  let peak = 1e-6;
  for (const v of w) peak = Math.max(peak, Math.abs(v - mean));
  return Float32Array.from(w, (v) => ((v - mean) / peak) * 0.95);
}

export class WavePainter {
  constructor(canvas, onChange) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.onChange = onChange;
    this.wave = presetWave('saw');
    this.ghost = null; // the other oscillator, drawn faintly
    this.pending = false;
    this.pointers = new Map();
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    const end = (e) => this.pointers.delete(e.pointerId);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  set(wave, ghost) {
    this.wave = Float32Array.from(wave);
    this.ghost = ghost;
    this.draw();
  }

  pos(e) {
    const r = this.c.getBoundingClientRect();
    const x = Math.min(WAVE_N - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * WAVE_N)));
    const y = Math.max(-1, Math.min(1, 1 - (2 * (e.clientY - r.top)) / r.height));
    return { x, y };
  }

  down(e) {
    e.preventDefault();
    this.c.setPointerCapture(e.pointerId);
    const p = this.pos(e);
    this.pointers.set(e.pointerId, p);
    this.wave[p.x] = p.y;
    this.changed();
  }

  move(e) {
    const last = this.pointers.get(e.pointerId);
    if (!last) return;
    // use coalesced events for smooth fast strokes (Apple Pencil / fast fingers)
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    let prev = last;
    for (const ev of evs.length ? evs : [e]) {
      const p = this.pos(ev);
      const steps = Math.abs(p.x - prev.x);
      for (let i = 0; i <= steps; i++) {
        const t = steps ? i / steps : 1;
        const x = Math.round(prev.x + (p.x - prev.x) * t);
        this.wave[x] = prev.y + (p.y - prev.y) * t;
      }
      prev = p;
    }
    this.pointers.set(e.pointerId, prev);
    this.changed();
  }

  changed() {
    this.draw();
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.onChange(this.wave);
    });
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.c.width = Math.round(this.c.clientWidth * dpr);
    this.c.height = Math.round(this.c.clientHeight * dpr);
    this.draw();
  }

  draw() {
    const { g, c } = this;
    const W = c.width, H = c.height;
    const css = getComputedStyle(document.documentElement);
    g.clearRect(0, 0, W, H);
    g.strokeStyle = css.getPropertyValue('--grid').trim();
    g.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      g.beginPath();
      g.moveTo((W * i) / 8, 0); g.lineTo((W * i) / 8, H);
      g.stroke();
    }
    for (let i = 1; i < 4; i++) {
      g.beginPath();
      g.moveTo(0, (H * i) / 4); g.lineTo(W, (H * i) / 4);
      g.stroke();
    }
    const line = (w, color, width) => {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.beginPath();
      for (let i = 0; i < WAVE_N; i++) {
        const x = (i / (WAVE_N - 1)) * W;
        const y = ((1 - w[i]) / 2) * H;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    };
    if (this.ghost) line(this.ghost, css.getPropertyValue('--ghost').trim(), 2 * (window.devicePixelRatio || 1));
    g.lineJoin = 'round';
    line(this.wave, css.getPropertyValue('--accent').trim(), 3 * (window.devicePixelRatio || 1));
  }
}
