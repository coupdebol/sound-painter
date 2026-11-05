// Pattern editor drawn on a canvas. Drag a finger across to paint a melody,
// tap a note to remove it, paint the ACC / SLIDE lanes underneath.
import { quantize, scaleRows } from './sequencer.js';
import { NOTE_NAMES } from './params.js';

const LANE = 0.13; // height fraction of each lane (accent, slide)
const GUTTER = 34; // css px for note names

export class PatternGrid {
  constructor(canvas, state, onEdit) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.s = state;
    this.onEdit = onEdit;
    this.playhead = -1;
    this.tool = 'draw';
    this.pointers = new Map();
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', (e) => this.pointers.delete(e.pointerId));
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  get steps() { return this.s.patterns[this.s.seq.pattern].steps; }
  get rows() { return scaleRows(this.s.seq.scale); }

  rowOf(st) {
    const q = quantize(st.note, this.s.seq.scale);
    const rows = this.rows;
    let best = 0;
    rows.forEach((r, i) => { if (Math.abs(r - q) < Math.abs(rows[best] - q)) best = i; });
    return best;
  }

  geom() {
    const r = this.c.getBoundingClientRect();
    const notesH = r.height * (1 - 2 * LANE);
    return { r, x0: GUTTER, w: r.width - GUTTER, notesH, laneH: r.height * LANE };
  }

  hit(e) {
    const { r, x0, w, notesH, laneH } = this.geom();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const len = this.s.seq.length;
    const col = Math.max(0, Math.min(len - 1, Math.floor(((x - x0) / w) * len)));
    const rows = this.rows;
    if (y < notesH) {
      const row = Math.max(0, Math.min(rows.length - 1, Math.floor((1 - y / notesH) * rows.length)));
      return { zone: 'note', col, row };
    }
    return { zone: y < notesH + laneH ? 'accent' : 'slide', col };
  }

  down(e) {
    e.preventDefault();
    this.c.setPointerCapture(e.pointerId);
    const h = this.hit(e);
    const st = this.steps[h.col];
    const ptr = { ...h, moved: false, pendingOff: false };
    if (h.zone === 'note') {
      if (this.tool === 'erase') st.on = false;
      else if (st.on && this.rowOf(st) === h.row) ptr.pendingOff = true;
      else { st.on = true; st.note = this.rows[h.row]; }
    } else {
      ptr.value = !st[h.zone];
      st[h.zone] = ptr.value;
    }
    this.pointers.set(e.pointerId, ptr);
    this.edited();
  }

  move(e) {
    const ptr = this.pointers.get(e.pointerId);
    if (!ptr) return;
    const h = this.hit(e);
    if (ptr.zone === 'note') {
      if (h.zone !== 'note') return;
      if (h.col === ptr.col && h.row === ptr.row) return;
      ptr.moved = true;
      const a = Math.min(ptr.col, h.col), b = Math.max(ptr.col, h.col);
      for (let c = a; c <= b; c++) {
        const st = this.steps[c];
        if (this.tool === 'erase') { st.on = false; continue; }
        // interpolate rows across skipped columns so fast swipes leave no gaps
        const t = b === a ? 1 : (c - ptr.col) / (h.col - ptr.col);
        const row = Math.round(ptr.row + (h.row - ptr.row) * (Number.isFinite(t) ? t : 1));
        st.on = true;
        st.note = this.rows[row];
      }
      ptr.col = h.col;
      ptr.row = h.row;
    } else {
      this.steps[h.col][ptr.zone] = ptr.value;
    }
    this.edited();
  }

  up(e) {
    const ptr = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (ptr && ptr.pendingOff && !ptr.moved) {
      this.steps[ptr.col].on = false;
      this.edited();
    }
  }

  edited() {
    this.draw();
    this.onEdit();
  }

  setPlayhead(step) {
    if (step === this.playhead) return;
    this.playhead = step;
    this.draw();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.c.width = Math.round(this.c.clientWidth * dpr);
    this.c.height = Math.round(this.c.clientHeight * dpr);
    this.draw();
  }

  draw() {
    const { g, c } = this;
    const dpr = window.devicePixelRatio || 1;
    const css = getComputedStyle(document.documentElement);
    const col = (n) => css.getPropertyValue(n).trim();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = c.width / dpr, H = c.height / dpr;
    const { x0, w, notesH, laneH } = this.geom();
    const len = this.s.seq.length;
    const rows = this.rows;
    const cw = w / len, rh = notesH / rows.length;
    g.clearRect(0, 0, W, H);

    // row stripes + note names
    g.font = `600 ${Math.min(11, rh * 0.7)}px system-ui, sans-serif`;
    g.textBaseline = 'middle';
    rows.forEach((semi, i) => {
      const y = notesH - (i + 1) * rh;
      const isRoot = semi % 12 === 0;
      g.fillStyle = isRoot ? col('--row-root') : i % 2 ? col('--row-a') : col('--row-b');
      g.fillRect(x0, y, w, rh);
      g.fillStyle = isRoot ? col('--accent') : col('--muted');
      const name = NOTE_NAMES[(semi + this.s.seq.root) % 12];
      g.fillText(name, 4, y + rh / 2);
    });

    // beat separators + playhead
    for (let s = 0; s <= len; s++) {
      g.fillStyle = s % 4 === 0 ? col('--beat') : col('--grid');
      g.fillRect(x0 + s * cw - (s % 4 === 0 ? 1 : 0.5), 0, s % 4 === 0 ? 2 : 1, H);
    }
    if (this.playhead >= 0 && this.playhead < len) {
      g.fillStyle = col('--playhead');
      g.fillRect(x0 + this.playhead * cw, 0, cw, H);
    }

    // lanes
    const laneY = [notesH, notesH + laneH];
    g.fillStyle = col('--lane');
    g.fillRect(x0, laneY[0], w, laneH * 2);
    g.fillStyle = col('--muted');
    g.font = `700 9px system-ui, sans-serif`;
    g.fillText('ACC', 4, laneY[0] + laneH / 2);
    g.fillText('SLIDE', 2, laneY[1] + laneH / 2);

    const steps = this.steps;
    // slide connectors
    g.strokeStyle = col('--slide');
    g.lineWidth = 3;
    for (let s = 0; s < len; s++) {
      const a = steps[s], b = steps[(s + 1) % len];
      if (!a.on || !a.slide || !b.on) continue;
      const ya = notesH - (this.rowOf(a) + 0.5) * rh, yb = notesH - (this.rowOf(b) + 0.5) * rh;
      g.beginPath();
      g.moveTo(x0 + (s + 0.8) * cw, ya);
      g.lineTo(x0 + (s + 1.2) * cw, yb);
      g.stroke();
    }
    for (let s = 0; s < len; s++) {
      const st = steps[s];
      const x = x0 + s * cw;
      if (st.on) {
        const y = notesH - (this.rowOf(st) + 1) * rh;
        g.fillStyle = st.accent ? col('--accent-hot') : col('--accent');
        roundRect(g, x + 2, y + 1, cw - 4 + (st.slide ? 4 : 0), rh - 2, 3);
      }
      if (st.accent) {
        g.fillStyle = col('--accent-hot');
        g.beginPath();
        g.arc(x + cw / 2, laneY[0] + laneH / 2, Math.min(cw, laneH) * 0.25, 0, Math.PI * 2);
        g.fill();
      }
      if (st.slide) {
        g.fillStyle = col('--slide');
        roundRect(g, x + 3, laneY[1] + laneH * 0.3, cw - 6, laneH * 0.4, 3);
      }
    }
  }
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
  g.fill();
}
