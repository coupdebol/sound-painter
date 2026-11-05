// Touch controls: rotary knobs, vertical faders and segmented switches.
// Each uses pointer capture so several fingers can twist different controls at once.
import { PARAMS, CHOICES, toNorm, fromNorm } from './params.js';

const SWEEP = 270;

function arcPath(cx, cy, r, a0, a1) {
  const rad = (a) => ((a - 90) * Math.PI) / 180;
  const x0 = cx + r * Math.cos(rad(a0)), y0 = cy + r * Math.sin(rad(a0));
  const x1 = cx + r * Math.cos(rad(a1)), y1 = cy + r * Math.sin(rad(a1));
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

// common drag + double-tap-to-reset behaviour
function dragControl(el, getNorm, setNorm, reset, sensitivity, axis) {
  let lastTap = 0;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const now = performance.now();
    if (now - lastTap < 300) { reset(); lastTap = 0; return; }
    lastTap = now;
    el.setPointerCapture(e.pointerId);
    el.classList.add('active');
    const start = { x: e.clientX, y: e.clientY, n: getNorm() };
    const move = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      const d = axis === 'y' ? start.y - ev.clientY : start.y - ev.clientY + (ev.clientX - start.x);
      setNorm(start.n + d / sensitivity());
    };
    const up = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      el.classList.remove('active');
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });
}

export function knob(el, id, values, onChange) {
  const p = PARAMS[id];
  el.classList.add('knob');
  el.innerHTML = `
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <path class="track" d="${arcPath(30, 30, 24, -SWEEP / 2, SWEEP / 2)}"/>
      <path class="fill"/>
      <circle class="cap" cx="30" cy="30" r="17"/>
      <line class="ptr" x1="30" y1="30" x2="30" y2="15"/>
    </svg>
    <div class="val"></div><div class="lbl">${p.label}</div>`;
  const fill = el.querySelector('.fill');
  const ptr = el.querySelector('.ptr');
  const val = el.querySelector('.val');
  const render = () => {
    const n = toNorm(p, values[id]);
    const a = -SWEEP / 2 + n * SWEEP;
    fill.setAttribute('d', n > 0.001 ? arcPath(30, 30, 24, -SWEEP / 2, a) : '');
    ptr.setAttribute('transform', `rotate(${a} 30 30)`);
    val.textContent = p.fmt ? p.fmt(values[id]) : values[id];
  };
  const set = (v) => { if (v !== values[id]) { values[id] = v; render(); onChange(id, v); } };
  dragControl(el, () => toNorm(p, values[id]), (n) => set(fromNorm(p, n)), () => set(p.def), () => 180, 'xy');
  render();
  return render;
}

export function fader(el, id, values, onChange) {
  const p = PARAMS[id];
  el.classList.add('fader');
  el.innerHTML = `<div class="val"></div><div class="slot"><div class="level"></div><div class="thumb"></div></div><div class="lbl">${p.label}</div>`;
  const slot = el.querySelector('.slot');
  const level = el.querySelector('.level');
  const thumb = el.querySelector('.thumb');
  const val = el.querySelector('.val');
  const render = () => {
    const n = toNorm(p, values[id]);
    level.style.height = `calc(${n} * (100% - 22px) + 11px)`;
    thumb.style.bottom = `calc(${n} * (100% - 22px))`;
    val.textContent = p.fmt ? p.fmt(values[id]) : values[id];
  };
  const set = (v) => { if (v !== values[id]) { values[id] = v; render(); onChange(id, v); } };
  dragControl(slot, () => toNorm(p, values[id]), (n) => set(fromNorm(p, n)), () => set(p.def), () => slot.clientHeight || 120, 'y');
  render();
  return render;
}

// segmented switch; values[key] holds the chosen option
export function segmented(el, key, values, onChange, choice = CHOICES[key]) {
  el.classList.add('seg');
  el.innerHTML = '';
  const btns = choice.options.map((opt, i) => {
    const b = document.createElement('button');
    b.textContent = choice.names ? choice.names[i] : String(opt);
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      values[key] = opt;
      render();
      onChange(key, opt);
    });
    el.appendChild(b);
    return b;
  });
  const render = () => btns.forEach((b, i) => b.classList.toggle('on', choice.options[i] === values[key]));
  render();
  return render;
}

export function toggle(el, getter, onToggle) {
  const render = () => el.classList.toggle('on', !!getter());
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); onToggle(); render(); });
  render();
  return render;
}
