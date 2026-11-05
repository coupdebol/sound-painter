// Multi-touch two-octave keyboard. Slide a finger across keys for glissando.
const WHITE = [0, 2, 4, 5, 7, 9, 11];

export class Keyboard {
  constructor(el, { onDown, onUp }) {
    this.el = el;
    this.onDown = onDown;
    this.onUp = onUp;
    this.octave = 3;
    this.pointers = new Map();
    this.build();
    el.addEventListener('pointerdown', (e) => this.down(e));
    el.addEventListener('pointermove', (e) => this.move(e));
    el.addEventListener('pointerup', (e) => this.up(e));
    el.addEventListener('pointercancel', (e) => this.up(e));
  }

  build() {
    this.el.innerHTML = '';
    const base = 12 * (this.octave + 1);
    const whites = [];
    for (let n = 0; n <= 24; n++) if (WHITE.includes(n % 12)) whites.push(n);
    const ww = 100 / whites.length;
    whites.forEach((n, i) => {
      const k = document.createElement('div');
      k.className = 'key white';
      k.dataset.midi = base + n;
      k.style.left = `${i * ww}%`;
      k.style.width = `${ww}%`;
      if (n % 12 === 0) k.innerHTML = `<span>C${this.octave + Math.floor(n / 12)}</span>`;
      this.el.appendChild(k);
      const next = n + 1;
      if (next <= 24 && !WHITE.includes(next % 12)) {
        const b = document.createElement('div');
        b.className = 'key black';
        b.dataset.midi = base + next;
        b.style.left = `${(i + 1) * ww - ww * 0.32}%`;
        b.style.width = `${ww * 0.64}%`;
        this.el.appendChild(b);
      }
    });
  }

  setOctave(o) {
    this.releaseAll();
    this.octave = Math.max(0, Math.min(6, o));
    this.build();
  }

  keyAt(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const key = el && el.closest('.key');
    return key && this.el.contains(key) ? key : null;
  }

  down(e) {
    e.preventDefault();
    this.el.setPointerCapture(e.pointerId);
    const key = this.keyAt(e);
    this.pointers.set(e.pointerId, key);
    if (key) this.press(key);
  }

  move(e) {
    if (!this.pointers.has(e.pointerId)) return;
    const key = this.keyAt(e);
    const prev = this.pointers.get(e.pointerId);
    if (key === prev) return;
    if (key) this.press(key);
    if (prev) this.lift(prev);
    this.pointers.set(e.pointerId, key);
  }

  up(e) {
    if (!this.pointers.has(e.pointerId)) return;
    const prev = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (prev) this.lift(prev);
  }

  press(key) {
    key.classList.add('down');
    this.onDown(Number(key.dataset.midi));
  }

  lift(key) {
    key.classList.remove('down');
    this.onUp(Number(key.dataset.midi));
  }

  releaseAll() {
    for (const key of this.pointers.values()) if (key) this.lift(key);
    this.pointers.clear();
  }
}
