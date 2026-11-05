// Oscilloscope (triggered on rising zero crossing) and spectrum view. Tap to switch.
export class Scope {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.mode = 'scope';
    this.analyser = null;
    canvas.addEventListener('pointerdown', () => { this.mode = this.mode === 'scope' ? 'spectrum' : 'scope'; });
    new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    }).observe(canvas);
  }

  draw() {
    const { g, c, analyser } = this;
    const W = c.width, H = c.height;
    g.clearRect(0, 0, W, H);
    const css = getComputedStyle(document.documentElement);
    g.strokeStyle = css.getPropertyValue('--grid').trim();
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    if (!analyser) return;
    const color = css.getPropertyValue('--scope').trim();
    const dpr = window.devicePixelRatio || 1;
    if (this.mode === 'scope') {
      const buf = this.buf || (this.buf = new Float32Array(analyser.fftSize));
      analyser.getFloatTimeDomainData(buf);
      let start = 0;
      for (let i = 1; i < buf.length / 2; i++) {
        if (buf[i - 1] < 0 && buf[i] >= 0) { start = i; break; }
      }
      const span = 700;
      g.strokeStyle = color;
      g.lineWidth = 2 * dpr;
      g.shadowColor = color;
      g.shadowBlur = 6 * dpr;
      g.beginPath();
      for (let i = 0; i < span; i++) {
        const x = (i / span) * W;
        const y = H / 2 - buf[start + i] * H * 0.45;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
      g.shadowBlur = 0;
    } else {
      const bins = this.bins || (this.bins = new Uint8Array(analyser.frequencyBinCount));
      analyser.getByteFrequencyData(bins);
      g.fillStyle = color;
      const n = 96;
      for (let i = 0; i < n; i++) {
        // log-spaced bars
        const a = Math.floor(Math.pow(bins.length, i / n));
        const b = Math.max(a + 1, Math.floor(Math.pow(bins.length, (i + 1) / n)));
        let m = 0;
        for (let k = a; k < b && k < bins.length; k++) m = Math.max(m, bins[k]);
        const h = (m / 255) * H;
        g.fillRect((i / n) * W, H - h, W / n - dpr, h);
      }
    }
  }
}
