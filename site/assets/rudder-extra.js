/* Типы рулей (селектор схем) + автопостроение контура пера по обводам кормы.
   Идея автопостроения — из проекта ship_rudders_calcs; здесь веб-реализация. */
'use strict';
(function () {
  const $ = id => document.getElementById(id);
  const N = (x, d = 2) => isFinite(x)
    ? x.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';

  /* ============ 1. Селектор типов рулей ============ */
  const RT = ['1', '3', 's'];
  function showType(t) {
    RT.forEach(k => {
      const on = k === t;
      const fig = $('rt-fig-' + k), txt = $('rt-text-' + k), btn = $('rt-btn-' + k);
      if (fig) fig.style.display = on ? '' : 'none';
      if (txt) txt.hidden = !on;
      if (btn) btn.classList.toggle('on', on);
    });
  }
  RT.forEach(k => {
    const b = $('rt-btn-' + k);
    if (b) b.addEventListener('click', () => {
      showType(k);
      const sel = $('in-rtype');
      if (sel && sel.value !== k) { sel.value = k; sel.dispatchEvent(new Event('change')); }
    });
  });
  if ($('in-rtype')) {
    $('in-rtype').addEventListener('change', () => showType($('in-rtype').value));
    showType($('in-rtype').value);
  } else if ($('rt-btn-3')) showType('3');

  /* ============ 2. Чертёж разбивки обшивки пера на листы ============
     Раскладка — по рисунку пояснительной методики (позиции №1–№4);
     толщины живые — из того же расчёта, что таблица шага 14 (rudder.js). */
  const PL_OP = [0.06, 0.15, 0.28, 0.42]; // прозрачности заливок зон №1–№4
  const PL_POS = ['кормовая зона (0,65b)', 'носовая зона (0,35b)',
    'нижний пояс у оси баллера', 'нижний носовой лист'];

  function renderPlating() {
    const box = $('pl-svg');
    if (!box || !window.rudderCalc) return;
    const { i, r } = window.rudderCalc;
    // контур пера, построенный по обводам кормы (раздел выше). Если он ещё не
    // построен — работаем по прямоугольнику h×b из расчёта.
    const ct = window.rudderContour;
    let b, h, outline = null;
    if (ct && ct.P && ct.P.length > 3) {
      b = ct.b;
      h = ct.hmax;
      outline = ct.P.map(pt => ({ x: pt.x - ct.xle, z: pt.z - ct.h1 }));
    } else {
      h = i.h; b = r.b;
    }
    if (!(h > 1.5 && b > 1)) { box.innerHTML = ''; return; }
    const sc = Math.min(62, 440 / h, 420 / b);
    const x0 = 110, yTop = 36;
    const X = x => x0 + x * sc;
    const Yb = yTop + h * sc;
    const Y = z => Yb - z * sc;
    const F = v => v.toFixed(1);
    const zTop = xl => {   // верхняя кромка контура в сечении xl (м от носовой кромки)
      if (!outline) return h;
      let best = 0;
      for (const pt of outline) if (Math.abs(pt.x - xl) < 0.25 && pt.z > best) best = pt.z;
      if (best) return best;
      // линейная интерполяция по верхней ветви
      const up = outline.filter(pt => pt.z > 0.01).sort((a, c) => a.x - c.x);
      for (let k = 1; k < up.length; k++) {
        if (up[k].x >= xl) {
          const a = up[k - 1], c = up[k];
          return a.z + (xl - a.x) * (c.z - a.z) / ((c.x - a.x) || 1);
        }
      }
      return h;
    };
    const a1 = (window.rudderCalc && window.rudderCalc.i.rt) ? window.rudderCalc.i.rt.a1 : 0.2;
    const seam = 0.35 * b, ax = Math.max(0.05, a1) * b;   // ось баллера: балансирная доля
    const d1 = Math.max(0.06 * b, ax - 0.5), d2 = Math.min(seam - 0.08, ax + 0.5);
    const dv = []; // кормовые диафрагмы, шаг 0,6 м от стыка зон
    for (let x = seam + 0.6; x < b - 0.25; x += 0.6) dv.push(x);
    const rh = []; // горизонтальные рёбра: нижний пояс 1,0 м, далее шаг 0,7 м
    for (let z = 1.0; z < h - 0.35; z += 0.7) rh.push(z);
    const p = r.plates; // [№1 корма 0,6×0,7; №2 нос 0,6×0,7; №3 0,6×1,0; №4 0,3×0,6]
    const g = [];
    const tick = (x, y, vert) => vert
      ? `<line x1="${F(x - 4)}" y1="${F(y)}" x2="${F(x + 4)}" y2="${F(y)}" stroke="#16161a" stroke-width="1"/>`
      : `<line x1="${F(x)}" y1="${F(y - 4)}" x2="${F(x)}" y2="${F(y + 4)}" stroke="#16161a" stroke-width="1"/>`;

    // обрезка по реальному контуру пера
    const clipId = 'plclip';
    if (outline) {
      const pts = outline.map(pt => `${F(X(pt.x))},${F(Y(pt.z))}`).join(' ');
      g.push(`<clipPath id="${clipId}"><polygon points="${pts}"/></clipPath>`);
      g.push(`<g clip-path="url(#${clipId})">`);
    } else {
      g.push('<g>');
    }
    // заливки зон (№3, №4 поверх №2)
    g.push(`<rect x="${F(X(seam))}" y="${F(yTop)}" width="${F((b - seam) * sc)}" height="${F(h * sc)}" fill="rgba(21,94,117,${PL_OP[0]})"/>`);
    g.push(`<rect x="${F(X(0))}" y="${F(yTop)}" width="${F(seam * sc)}" height="${F(h * sc)}" fill="rgba(21,94,117,${PL_OP[1]})"/>`);
    g.push(`<rect x="${F(X(d1))}" y="${F(Y(0.6))}" width="${F((d2 - d1) * sc)}" height="${F(0.6 * sc)}" fill="rgba(21,94,117,${PL_OP[2]})"/>`);
    g.push(`<rect x="${F(X(0))}" y="${F(Y(0.6))}" width="${F(d1 * sc)}" height="${F(0.6 * sc)}" fill="rgba(21,94,117,${PL_OP[3]})"/>`);
    // горизонтальные рёбра
    g.push(`<line x1="${F(X(0))}" y1="${F(Y(0.6))}" x2="${F(X(seam))}" y2="${F(Y(0.6))}" stroke="#6b6b74" stroke-width="1"/>`);
    rh.forEach(z => g.push(`<line x1="${F(X(0))}" y1="${F(Y(z))}" x2="${F(X(b))}" y2="${F(Y(z))}" stroke="#6b6b74" stroke-width="1"/>`));
    // вертикальные диафрагмы
    [d1, d2].concat(dv).forEach(x => g.push(
      `<line x1="${F(X(x))}" y1="${F(yTop)}" x2="${F(X(x))}" y2="${F(Yb)}" stroke="#16161a" stroke-width="1.2"/>`));
    // сварной стык зон 0,35b
    g.push(`<line x1="${F(X(seam))}" y1="${F(yTop)}" x2="${F(X(seam))}" y2="${F(Yb)}" stroke="#b3382e" stroke-width="1.4" stroke-dasharray="7 4"/>`);
    g.push(`<text transform="rotate(-90 ${F(X(seam) - 6)} ${F(yTop + h * sc / 2)})" x="${F(X(seam) - 6)}" y="${F(yTop + h * sc / 2)}" class="lbl" fill="#b3382e" font-size="11" text-anchor="middle" style="paint-order:stroke;stroke:#fff;stroke-width:3.5;stroke-linejoin:round">стык носовой и кормовой зон</text>`);
    g.push('</g>');   // конец обрезки по контуру
    // контур пера — реальный, из автопостроения по обводам кормы
    if (outline) {
      const pts = outline.map(pt => `${F(X(pt.x))},${F(Y(pt.z))}`).join(' ');
      g.push(`<polygon points="${pts}" fill="none" stroke="#155e75" stroke-width="2.2"/>`);
    } else {
      g.push(`<rect x="${F(x0)}" y="${F(yTop)}" width="${F(b * sc)}" height="${F(h * sc)}" fill="none" stroke="#155e75" stroke-width="2.2"/>`);
    }
    // ось баллера и баллер
    g.push(`<line x1="${F(X(ax))}" y1="${F(yTop - 30)}" x2="${F(X(ax))}" y2="${F(Yb + 4)}" stroke="#1a7f37" stroke-width="1" stroke-dasharray="7 4"/>`);
    g.push(`<rect x="${F(X(ax) - 5)}" y="${F(yTop - 26)}" width="10" height="26" fill="#6b6b74"/>`);
    g.push(`<text x="${F(X(ax) + 9)}" y="${F(yTop - 12)}" class="lbl" fill="#1a7f37" font-size="12">ось баллера</text>`);
    // подписи зон
    const zc1 = 0.55 * zTop(seam + (b - seam) / 2), zc2 = 0.58 * zTop(seam / 2);
    const halo = 'paint-order:stroke;stroke:#fff;stroke-width:3.5;stroke-linejoin:round';
    g.push(`<text x="${F(X(seam + (b - seam) / 2))}" y="${F(Y(zc1))}" class="lbl" font-size="14" text-anchor="middle" style="${halo}">№1 · s = ${p[0].acc} мм</text>`);
    g.push(`<text x="${F(X(seam / 2))}" y="${F(Y(zc2))}" class="lbl" font-size="14" text-anchor="middle" style="${halo}">№2</text>`);
    g.push(`<text x="${F(X(seam / 2))}" y="${F(Y(zc2) + 18)}" class="lbl" font-size="12" text-anchor="middle" style="${halo}">s = ${p[1].acc} мм</text>`);
    g.push(`<text x="${F(X((d1 + d2) / 2))}" y="${F(Y(0.42))}" class="lbl" font-size="11" text-anchor="middle" style="${halo}">№3 · s = ${p[2].acc} мм</text>`);
    // №4 — выноска влево
    g.push(`<line x1="${F(X(d1 / 2))}" y1="${F(Y(0.3))}" x2="${F(x0 - 18)}" y2="${F(Y(1.15))}" class="ln-thin" stroke-width=".9"/>`);
    g.push(`<text x="${F(x0 - 22)}" y="${F(Y(1.15) - 2)}" class="lbl" font-size="12" text-anchor="end">№4</text>`);
    g.push(`<text x="${F(x0 - 22)}" y="${F(Y(1.15) + 12)}" class="lbl" font-size="11" text-anchor="end">s = ${p[3].acc} мм</text>`);

    // размерные выноски типоразмеров
    // №1: клетка 0,6×0,7 в кормовой зоне
    if (dv.length >= 2 && rh.length >= 5) {
      const cx1 = dv[0], cx2 = dv[1], cz1 = rh[3], cz2 = rh[4];
      const my = Y((cz1 + cz2) / 2), mx = X((cx1 + cx2) / 2);
      g.push(`<line x1="${F(X(cx1))}" y1="${F(my)}" x2="${F(X(cx2))}" y2="${F(my)}" stroke="#16161a" stroke-width="1"/>`);
      g.push(tick(X(cx1), my, false) + tick(X(cx2), my, false));
      g.push(`<text x="${F(mx)}" y="${F(my - 6)}" class="lbl-dim" font-size="11" text-anchor="middle">a = 0,6</text>`);
      g.push(`<line x1="${F(mx)}" y1="${F(Y(cz1))}" x2="${F(mx)}" y2="${F(Y(cz2))}" stroke="#16161a" stroke-width="1"/>`);
      g.push(tick(mx, Y(cz1), true) + tick(mx, Y(cz2), true));
      g.push(`<text x="${F(mx + 5)}" y="${F(Y((cz1 + cz2) / 2) + 16)}" class="lbl-dim" font-size="11">b = 0,7</text>`);
    }
    // №3: 0,6×1,0
    g.push(`<line x1="${F(X(d1))}" y1="${F(Y(0.12))}" x2="${F(X(d2))}" y2="${F(Y(0.12))}" stroke="#16161a" stroke-width="1"/>`);
    g.push(tick(X(d1), Y(0.12), false) + tick(X(d2), Y(0.12), false));
    g.push(`<text x="${F(X((d1 + d2) / 2))}" y="${F(Y(0.12) - 3)}" class="lbl-dim" font-size="10.5" text-anchor="middle">b = 1,0</text>`);
    g.push(`<line x1="${F(X(d2) + 9)}" y1="${F(Y(0))}" x2="${F(X(d2) + 9)}" y2="${F(Y(0.6))}" stroke="#16161a" stroke-width="1"/>`);
    g.push(tick(X(d2) + 9, Y(0), true) + tick(X(d2) + 9, Y(0.6), true));
    g.push(`<text x="${F(X(d2) + 15)}" y="${F(Y(0.3) + 4)}" class="lbl-dim" font-size="11">a = 0,6</text>`);
    // №4: 0,3×0,6
    g.push(`<line x1="${F(X(0))}" y1="${F(Y(0.72))}" x2="${F(X(d1))}" y2="${F(Y(0.72))}" stroke="#16161a" stroke-width="1"/>`);
    g.push(tick(X(0), Y(0.72), false) + tick(X(d1), Y(0.72), false));
    g.push(`<text x="${F(X(0.02))}" y="${F(Y(0.78) - 4)}" class="lbl-dim" font-size="11">a = 0,3</text>`);
    g.push(`<line x1="${F(x0 - 8)}" y1="${F(Y(0))}" x2="${F(x0 - 8)}" y2="${F(Y(0.6))}" stroke="#16161a" stroke-width="1"/>`);
    g.push(tick(x0 - 8, Y(0), true) + tick(x0 - 8, Y(0.6), true));
    g.push(`<text transform="rotate(-90 ${F(x0 - 12)} ${F(Y(0.3))})" x="${F(x0 - 12)}" y="${F(Y(0.3))}" class="lbl-dim" font-size="11" text-anchor="middle">b = 0,6</text>`);

    // габаритные размеры
    g.push(`<line x1="${F(x0)}" y1="${F(Yb + 6)}" x2="${F(x0)}" y2="${F(Yb + 48)}" class="ln-thin" stroke="#6b6b74" stroke-width=".8"/>`);
    g.push(`<line x1="${F(X(seam))}" y1="${F(Yb + 6)}" x2="${F(X(seam))}" y2="${F(Yb + 26)}" class="ln-thin" stroke="#6b6b74" stroke-width=".8"/>`);
    g.push(`<line x1="${F(X(b))}" y1="${F(Yb + 6)}" x2="${F(X(b))}" y2="${F(Yb + 48)}" class="ln-thin" stroke="#6b6b74" stroke-width=".8"/>`);
    g.push(`<line x1="${F(x0)}" y1="${F(Yb + 20)}" x2="${F(X(seam))}" y2="${F(Yb + 20)}" class="ln-dim"/>`);
    g.push(`<line x1="${F(X(seam))}" y1="${F(Yb + 20)}" x2="${F(X(b))}" y2="${F(Yb + 20)}" class="ln-dim"/>`);
    g.push(`<text x="${F(X(seam / 2))}" y="${F(Yb + 16)}" class="lbl-dim" font-size="12" text-anchor="middle">0,35b</text>`);
    g.push(`<text x="${F(X(seam + (b - seam) / 2))}" y="${F(Yb + 16)}" class="lbl-dim" font-size="12" text-anchor="middle">0,65b</text>`);
    g.push(`<line x1="${F(x0)}" y1="${F(Yb + 44)}" x2="${F(X(b))}" y2="${F(Yb + 44)}" class="ln-dim"/>`);
    g.push(`<text x="${F(X(b / 2))}" y="${F(Yb + 60)}" class="lbl-dim" font-size="12" text-anchor="middle">b = ${N(b, 1)} м</text>`);
    g.push(`<line x1="${F(x0 - 26)}" y1="${F(yTop)}" x2="${F(x0 - 26)}" y2="${F(Yb)}" class="ln-dim"/>`);
    g.push(`<text transform="rotate(-90 ${F(x0 - 32)} ${F(yTop + h * sc / 2)})" x="${F(x0 - 32)}" y="${F(yTop + h * sc / 2)}" class="lbl-dim" font-size="12" text-anchor="middle">${outline ? 'h_max' : 'h'} = ${N(h, 1)} м</text>`);

    box.innerHTML = `<svg viewBox="0 0 560 545" class="geo-board" style="max-width:560px" role="img"
      aria-label="Чертёж разбивки обшивки пера руля на листы с силовым набором">${g.join('\n')}</svg>`;

    // легенда
    $('pl-legend').innerHTML = p.map((pl, k) => `
      <div style="display:flex;align-items:center;gap:8px;font:13.5px system-ui,sans-serif;margin:3px 0">
        <span style="flex:none;width:14px;height:14px;border:1px solid #155e75;border-radius:3px;background:rgba(21,94,117,${PL_OP[k]})"></span>
        <span>№${k + 1} — ${N(pl.a, 1)}×${N(pl.b, 1)} м, ${PL_POS[k]}:
        s = ${N(pl.s, 2)} мм, s<sub>min</sub> = ${N(r.smin, 2)} мм →
        принято <b>${pl.acc} мм</b></span>
      </div>`).join('');
  }
  document.addEventListener('rudder:update', renderPlating);
  document.addEventListener('rudder:contour', renderPlating);
  document.addEventListener('rudder:update', () => { try { render(); } catch (e) { /* контур строится позже */ } });
  renderPlating();

  /* ============ 3. Автопостроение контура пера ============ */
  if (!$('ct-svg')) return;

  // Кормовой подзор — кубическая кривая Безье (метры; x — от старнпоста в корму,
  // z — вверх от подошвы). В проекте ship_rudders_calcs та же роль у обводов,
  // импортированных из теоретического чертежа.
  const BZ = [{ x: -1.5, z: 6.4 }, { x: 3, z: 8.6 }, { x: 8, z: 11.6 }, { x: 16, z: 13.2 }];
  const CT = [];
  for (let i = 0; i <= 160; i++) {
    const t = i / 160, u = 1 - t;
    CT.push({
      x: u * u * u * BZ[0].x + 3 * u * u * t * BZ[1].x + 3 * u * t * t * BZ[2].x + t * t * t * BZ[3].x,
      z: u * u * u * BZ[0].z + 3 * u * u * t * BZ[1].z + 3 * u * t * t * BZ[2].z + t * t * t * BZ[3].z,
    });
  }
  function zCounter(x) { // интерполяция полилинии подзора
    if (x <= CT[0].x) return CT[0].z;
    for (let i = 1; i < CT.length; i++) {
      if (CT[i].x >= x) {
        const a = CT[i - 1], b = CT[i];
        return a.z + (x - a.x) * (b.z - a.z) / (b.x - a.x);
      }
    }
    return CT[CT.length - 1].z;
  }
  // мир (м) -> экран (px)
  const X = x => 30 + (x + 3) * 29.5;
  const Y = z => 430 - z * 26;

  function shoelace(P) { // формула шнурков (Гаусса)
    let s = 0;
    const terms = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      const t = a.x * b.z - b.x * a.z;
      terms.push(t); s += t;
    }
    return { A: Math.abs(s) / 2, S: s, terms };
  }

  const HMIN = 0.5;   // конструктивный минимум высоты пера, м (иначе перо зажато)

  function ctrInputs() {
    const sh = $('ct-shape');
    return {
      d: +$('ct-d').value, h2: +$('ct-h2').value,
      h1: +$('ct-h1').value, b: +$('ct-b').value,
      shape: (sh && sh.value) || 'auto',
    };
  }
  function mainInputs() { // L, B, Cb — из «Живого расчёта» выше
    const g = id => { const el = $(id); const v = el ? +el.value : NaN; return isFinite(v) && v > 0 ? v : NaN; };
    return { L: g('in-L') || 170, B: g('in-B') || 24, Cb: g('in-Cb') || 0.8 };
  }

  function render() {
    const c = ctrInputs(), m = mainInputs();
    $('ct-d-v').textContent = N(c.d, 1);
    $('ct-h2-v').textContent = N(c.h2, 2);
    $('ct-h1-v').textContent = N(c.h1, 2);
    $('ct-b-v').textContent = N(c.b, 1);

    // требуемая площадь по Правилам — критерий выбора формы пера
    const Areq = m.L * c.d / 100 * (1 + 50 * m.Cb * m.Cb * Math.pow(m.B / m.L, 2));

    // верхняя кромка по обводам: подзор минус зазор h2, но не выше ЛГВЛ
    const xle = 0.8, xte = xle + c.b, NP = 22;
    const top = [];
    let capped = false, zmin = Infinity, zcMin = Infinity, xg = xle;
    for (let i = 0; i <= NP; i++) {
      const x = xle + (xte - xle) * i / NP;
      const zc = zCounter(x) - c.h2;
      if (zc > c.d) capped = true;
      if (zCounter(x) < zcMin) zcMin = zCounter(x);
      const z = Math.min(zc, c.d);
      if (z < zmin) { zmin = z; xg = x; }   // самое низкое место подзора в пределах хорды
      top.push({ x, z });
    }
    // вариант 1 — прямоугольник: h = (мин. высота подзора над подошвой) − h₂ − h₁
    const hRect = zmin - c.h1;
    const ARect = Math.max(0, hRect) * c.b;
    const zTopR = c.h1 + Math.max(hRect, 0.05);     // защита от вырожденного контура
    const fits = hRect >= HMIN;                     // помещается между подошвой и подзором
    const enough = ARect >= Areq - 1e-9;            // набирает требуемую площадь
    // вариант 2 — контур со срезанной по подзору верхней кромкой (как в ручной подгонке)
    const Pcurve = [{ x: xle, z: c.h1 }, { x: xte, z: c.h1 }].concat(top.slice().reverse());
    const Prect = [{ x: xle, z: c.h1 }, { x: xte, z: c.h1 },
      { x: xte, z: zTopR }, { x: xle, z: zTopR }];
    // выбор формы: «автоматически» — прямоугольник, пока он вписывается и по площади проходит
    const auto = c.shape !== 'rect' && c.shape !== 'curve';
    const rect = c.shape === 'rect' || (auto && fits && enough);
    const P = rect ? Prect : Pcurve;
    const squeezed = !fits;
    const { A, S } = shoelace(P);
    // отдаём контур наружу: по нему строится разбивка обшивки на листы
    window.rudderContour = {
      P, xle, xte, h1: c.h1, b: c.b, A, shape: rect ? 'rect' : 'curve',
      hmax: Math.max.apply(null, P.map(pt => pt.z - c.h1)),
    };
    document.dispatchEvent(new CustomEvent('rudder:contour'));
    const bMean = c.b, hMean = A / bMean, lam = hMean / bMean;
    const rt = (window.rudderCalc && window.rudderCalc.i.rt) || { a1: 0.2, name: 'полуподвесной на кронштейне' };
    const xax = xle + Math.max(0.05, rt.a1) * c.b;   // ось баллера: балансирная доля типа

    // --- SVG ---
    const ctPts = CT.map(p => `${X(p.x).toFixed(1)},${Y(p.z).toFixed(1)}`).join(' ');
    const bzPts = BZ.map(p => `${X(p.x).toFixed(1)},${Y(p.z).toFixed(1)}`).join(' ');
    const bladePts = P.map(p => `${X(p.x).toFixed(1)},${Y(p.z).toFixed(1)}`).join(' ');
    const dots = P.map(p => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.z).toFixed(1)}" r="2" fill="#155e75"/>`).join('');
    const zAxTop = zCounter(xax);
    // зазор h₂ меряем там, где он реально минимален: у прямоугольника — в самом
    // низком месте подзора, у срезанной кромки — в любом сечении
    const xm2 = rect ? xg : xle + 0.3;
    const m2y1 = Y(zCounter(xm2));
    const m2y2 = Y(rect ? zTopR : top[Math.round(0.3 / (xte - xle) * NP)].z);
    const xm1 = xte - 0.35, m1y1 = Y(0), m1y2 = Y(c.h1);
    const zMidTop = rect ? zTopR : top[Math.round(NP / 2)].z;
    const aTxtY = Y((c.h1 + zMidTop) / 2);
    // отвергнутый / неиспользованный вариант — тонким пунктиром, для сравнения
    const halo = 'paint-order:stroke;stroke:#fff;stroke-width:3.5;stroke-linejoin:round';
    let ghost = '';
    if (!rect && hRect > 0.2) {
      const gp = Prect.map(p => `${X(p.x).toFixed(1)},${Y(p.z).toFixed(1)}`).join(' ');
      ghost = `<polygon points="${gp}" fill="none" stroke="#6b6b74" stroke-width="1.2" stroke-dasharray="6 4"/>
      <text x="${(X(xte) + 6).toFixed(1)}" y="${(Y(zTopR) + 4).toFixed(1)}" class="lbl gray"
            font-size="12" style="${halo}">прямоугольник: A = ${N(ARect)} м²</text>`;
    } else if (rect && !capped && zmin < top[NP].z - 0.05) {
      const gp = top.map(p => `${X(p.x).toFixed(1)},${Y(p.z).toFixed(1)}`).join(' ');
      ghost = `<polyline points="${gp}" fill="none" stroke="#6b6b74" stroke-width="1.2" stroke-dasharray="6 4"/>
      <text x="${(X(xte) + 6).toFixed(1)}" y="${(Y(top[NP].z) + 4).toFixed(1)}" class="lbl gray"
            font-size="12" style="${halo}">кромка по обводам не нужна</text>`;
    }
    // габарит h — только у прямоугольного пера (у срезанного контура высота переменна)
    const hDim = rect ? `
      <line x1="${(X(xte) + 16).toFixed(1)}" y1="${Y(c.h1).toFixed(1)}" x2="${(X(xte) + 16).toFixed(1)}" y2="${Y(zTopR).toFixed(1)}" stroke="#16161a" stroke-width="1"/>
      <line x1="${(X(xte) + 11).toFixed(1)}" y1="${Y(c.h1).toFixed(1)}" x2="${(X(xte) + 21).toFixed(1)}" y2="${Y(c.h1).toFixed(1)}" stroke="#16161a" stroke-width="1"/>
      <line x1="${(X(xte) + 11).toFixed(1)}" y1="${Y(zTopR).toFixed(1)}" x2="${(X(xte) + 21).toFixed(1)}" y2="${Y(zTopR).toFixed(1)}" stroke="#16161a" stroke-width="1"/>
      <text transform="rotate(-90 ${(X(xte) + 30).toFixed(1)} ${Y((c.h1 + zTopR) / 2).toFixed(1)})"
            x="${(X(xte) + 30).toFixed(1)}" y="${Y((c.h1 + zTopR) / 2).toFixed(1)}" class="lbl-dim"
            text-anchor="middle">h = ${N(Math.max(hRect, 0), 2)} м</text>` : '';

    $('ct-svg').innerHTML = `
    <svg viewBox="0 0 660 480" class="geo-board" style="max-width:660px" role="img"
         aria-label="Автопостроение контура пера руля в кормовом подзоре, заданном кривой Безье: принято ${rect ? 'прямоугольное перо' : 'перо со срезанной по подзору верхней кромкой'}">
      <!-- ЛГВЛ -->
      <line x1="${X(-3)}" y1="${Y(c.d).toFixed(1)}" x2="${X(16.4)}" y2="${Y(c.d).toFixed(1)}"
            stroke="#155e75" stroke-width="1.2" stroke-dasharray="10 5"/>
      <text x="34" y="${(Y(c.d) - 7).toFixed(1)}" class="lbl" fill="#155e75" font-size="12">ЛГВЛ, d = ${N(c.d, 1)} м</text>
      <!-- управляющая ломаная Безье -->
      <polyline points="${bzPts}" fill="none" stroke="#6b6b74" stroke-width="1" stroke-dasharray="4 4"/>
      ${BZ.map(p => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.z).toFixed(1)}" r="3" fill="#6b6b74"/>`).join('')}
      <text x="${(X(8) + 10).toFixed(1)}" y="${(Y(11.6) - 10).toFixed(1)}" class="lbl gray" font-size="12">управляющая ломаная Безье</text>
      <!-- подзор -->
      <polyline points="${ctPts}" fill="none" stroke="#16161a" stroke-width="1.8"/>
      <text x="34" y="196" class="lbl" font-size="12">кормовой подзор</text>
      <text x="34" y="212" class="lbl" font-size="12">(кривая Безье)</text>
      <!-- старнпост и подошва -->
      <path d="M ${X(-2.7)},430 C ${X(-2.6)},${Y(2.5)} ${X(-2.0)},${Y(5)} ${X(-1.5)},${Y(6.4)}"
            fill="none" stroke="#16161a" stroke-width="1.8"/>
      <rect x="${X(-2.9).toFixed(1)}" y="430" width="${(X(14.2) - X(-2.9)).toFixed(1)}" height="12" fill="#6b6b74"/>
      <text x="470" y="456" class="lbl gray" font-size="12" text-anchor="middle">подошва ахтерштевня</text>
      <!-- гребной винт -->
      <line x1="${X(-2.8)}" y1="${Y(3.4).toFixed(1)}" x2="${X(-1.0)}" y2="${Y(3.4).toFixed(1)}" stroke="#6b6b74" stroke-width="8"/>
      <ellipse cx="${X(-0.55).toFixed(1)}" cy="${Y(3.4).toFixed(1)}" rx="8" ry="75" fill="rgba(179,56,46,.13)" stroke="#b3382e" stroke-width="1.4"/>
      <circle cx="${X(-0.55).toFixed(1)}" cy="${Y(3.4).toFixed(1)}" r="7" fill="#b3382e"/>
      <!-- нижняя опора зависит от типа руля -->
      ${rt.a1 === 0 ? `
      <line x1="${X(xle).toFixed(1)}" y1="${Y(c.h1).toFixed(1)}" x2="${X(xle).toFixed(1)}" y2="${Y(zCounter(xle) - c.h2).toFixed(1)}"
            stroke="#1a7f37" stroke-width="4"/>
      ${[0.25, 0.55, 0.85].map(t => {
        const z = c.h1 + t * (zCounter(xle) - c.h2 - c.h1);
        return `<circle cx="${X(xle).toFixed(1)}" cy="${Y(z).toFixed(1)}" r="5" fill="#fff" stroke="#1a7f37" stroke-width="2"/>`;
      }).join('')}
      <text x="${(X(xle) - 12).toFixed(1)}" y="${(Y(c.h1) + 22).toFixed(1)}" class="lbl" fill="#1a7f37" font-size="12" text-anchor="end">петли на рудерпосте</text>`
      : rt.a1 >= 0.25 ? `
      <text x="${X(xle + c.b / 2).toFixed(1)}" y="${(Y(c.h1) + 26).toFixed(1)}" class="lbl" fill="#1a7f37" font-size="12" text-anchor="middle">низ пера свободен — опора только на баллере</text>`
      : `
      <circle cx="${X(xax).toFixed(1)}" cy="${Y(c.h1).toFixed(1)}" r="6" fill="#fff" stroke="#1a7f37" stroke-width="2.2"/>
      <text x="${(X(xax) + 12).toFixed(1)}" y="${(Y(c.h1) - 12).toFixed(1)}" class="lbl" fill="#1a7f37" font-size="12" style="${halo}">штырь в пятке (нижняя опора)</text>`}
      <!-- перо -->
      <polygon points="${bladePts}" fill="rgba(21,94,117,.09)" stroke="#155e75" stroke-width="2"/>
      ${dots}
      ${ghost}
      ${hDim}
      <text x="${X((xle + xte) / 2).toFixed(1)}" y="${aTxtY.toFixed(1)}" class="lbl" font-size="16" text-anchor="middle" style="${halo}">A = ${N(A)} м²</text>
      <!-- ось баллера -->
      <line x1="${X(xax).toFixed(1)}" y1="${(Y(zAxTop) - 20).toFixed(1)}" x2="${X(xax).toFixed(1)}" y2="424"
            stroke="#1a7f37" stroke-width="1" stroke-dasharray="7 4"/>
      <text x="${(X(xax) - 5).toFixed(1)}" y="421" class="lbl" fill="#1a7f37" font-size="11"
            text-anchor="end" style="${halo}">ось баллера</text>
      <!-- зазоры -->
      <line x1="${X(xm2).toFixed(1)}" y1="${m2y1.toFixed(1)}" x2="${X(xm2).toFixed(1)}" y2="${m2y2.toFixed(1)}" stroke="#16161a" stroke-width="1"/>
      <line x1="${(X(xm2) - 5).toFixed(1)}" y1="${m2y1.toFixed(1)}" x2="${(X(xm2) + 5).toFixed(1)}" y2="${m2y1.toFixed(1)}" stroke="#16161a" stroke-width="1"/>
      <line x1="${(X(xm2) - 5).toFixed(1)}" y1="${m2y2.toFixed(1)}" x2="${(X(xm2) + 5).toFixed(1)}" y2="${m2y2.toFixed(1)}" stroke="#16161a" stroke-width="1"/>
      <text x="${(X(xm2) - 9).toFixed(1)}" y="${((m2y1 + m2y2) / 2 + 4).toFixed(1)}" class="lbl-dim" text-anchor="end">h₂</text>
      <line x1="${X(xm1).toFixed(1)}" y1="${m1y1.toFixed(1)}" x2="${X(xm1).toFixed(1)}" y2="${m1y2.toFixed(1)}" stroke="#16161a" stroke-width="1"/>
      <line x1="${(X(xm1) - 5).toFixed(1)}" y1="${m1y2.toFixed(1)}" x2="${(X(xm1) + 5).toFixed(1)}" y2="${m1y2.toFixed(1)}" stroke="#16161a" stroke-width="1"/>
      <text x="${(X(xm1) + 9).toFixed(1)}" y="${((m1y1 + m1y2) / 2 + 4).toFixed(1)}" class="lbl-dim">h₁</text>
      <!-- хорда -->
      <line x1="${X(xle).toFixed(1)}" y1="444" x2="${X(xle).toFixed(1)}" y2="462" class="ln-thin" stroke="#6b6b74" stroke-width=".8"/>
      <line x1="${X(xte).toFixed(1)}" y1="444" x2="${X(xte).toFixed(1)}" y2="462" class="ln-thin" stroke="#6b6b74" stroke-width=".8"/>
      <line x1="${X(xle).toFixed(1)}" y1="458" x2="${X(xte).toFixed(1)}" y2="458" class="ln-dim"/>
      <text x="${X((xle + xte) / 2).toFixed(1)}" y="474" class="lbl-dim" text-anchor="middle">b = ${N(c.b, 1)} м</text>
    </svg>`;

    // --- бейджи ---
    const badge = (ok, html) => `<span class="badge ${ok ? 'ok' : 'bad'}">${html}</span>`;
    const grey = html => `<span class="badge ok" style="background:#eceae3;color:#16161a;border-color:#d8d6cf">${html}</span>`;
    const badges = [grey(`форма пера: <b>${rect ? 'прямоугольная' : 'по обводам подзора'}</b>`)];
    if (squeezed) badges.push(badge(false, 'перо зажато: уменьшите зазоры или осадку ✗'));
    badges.push(badge(A >= Areq, `A = ${N(A)} ${A >= Areq ? '≥' : '&lt;'} A<sub>треб</sub> = ${N(Areq)} м² ${A >= Areq ? '✓' : '✗'}`));
    badges.push(badge(lam >= 1.5, `λ = h̄/b = ${N(lam)} ${lam >= 1.5 ? '≥ 1,5 ✓' : '&lt; 1,5 ✗'}`));
    badges.push(grey(`h̄ = A/b = ${N(hMean)} м`));
    $('ct-badges').innerHTML = badges.join('');

    // --- принятая форма пера и её обоснование ---
    const rectName = '<b>прямоугольное перо</b>';
    const curveName = '<b>перо со срезанной по подзору верхней кромкой</b>';
    const dA = Areq - ARect;
    const why = [];
    if (!fits) why.push(`упирается в подзор (свободная высота h = ${N(Math.max(hRect, 0), 2)} м `
      + `меньше конструктивного минимума ${N(HMIN, 2)} м)`);
    if (!enough) why.push(`не хватает площади: A<sub>пр</sub> = ${N(ARect)} м² &lt; `
      + `A<sub>треб</sub> = ${N(Areq)} м² (недобор ${N(Math.max(dA, 0))} м²)`);
    let note;
    if (rect && auto) {
      note = `Принято ${rectName} h × b = ${N(Math.max(hRect, 0), 2)} × ${N(c.b, 2)} м: `
        + `прямоугольник вписывается между подошвой и подзором с зазорами h₁ = ${N(c.h1, 2)} м и `
        + `h₂ = ${N(c.h2, 2)} м и даёт A = ${N(ARect)} м² ≥ A<sub>треб</sub> = ${N(Areq)} м². `
        + 'Усложнять контур незачем — прямая верхняя кромка проще в изготовлении.';
    } else if (!rect && auto) {
      note = `Принято ${curveName}: прямоугольник не вписывается — ${why.join('; ')}. `
        + `Срез по обводам подзора добирает ${N(Math.max(A - ARect, 0))} м² под самой кромкой `
        + `и доводит площадь до A = ${N(A)} м² `
        + (A >= Areq ? '≥' : '&lt;') + ` A<sub>треб</sub> = ${N(Areq)} м².`;
    } else if (rect) {
      note = `Форма задана вручную: ${rectName} h × b = ${N(Math.max(hRect, 0), 2)} × ${N(c.b, 2)} м. `
        + (fits && enough
          ? 'Автоматический выбор дал бы то же самое — прямоугольник здесь проходит.'
          : `Автоматика перешла бы на срез по подзору: ${why.join('; ')}.`);
    } else {
      note = `Форма задана вручную: ${curveName}, A = ${N(A)} м². `
        + (fits && enough
          ? `Здесь прямоугольник вписался бы (A<sub>пр</sub> = ${N(ARect)} м² ≥ A<sub>треб</sub> = `
            + `${N(Areq)} м²) и был бы технологичнее — срез кромки не обязателен.`
          : `Автоматический выбор дал бы то же самое: ${why.join('; ')}.`);
    }
    $('ct-shape-note').innerHTML = note;

    // --- подстановка в формулу шнурков ---
    const term = i => {
      const a = P[i], b = P[(i + 1) % P.length];
      return `(${N(a.x, 1)}·${N(b.z, 2)} − ${N(b.x, 1)}·${N(a.z, 2)})`;
    };
    const terms = P.length <= 6
      ? P.map((_, i) => term(i)).join(' + ')
      : `${term(0)} + ${term(1)} + … + ${term(P.length - 1)}`;
    $('ct-math').innerHTML = `
      <p style="margin:4px 0"><b>Проверка прямоугольного варианта.</b>
      Высота прямоугольного пера ограничена самым низким местом подзора в пределах хорды
      (z<sub>подз,min</sub> = ${N(zcMin)} м над подошвой) и ватерлинией:<br>
      h<sub>пр</sub> = min(z<sub>подз,min</sub> − h₂; d) − h₁
      = min(${N(zcMin)} − ${N(c.h2, 2)}; ${N(c.d, 2)}) − ${N(c.h1, 2)} = ${N(Math.max(hRect, 0), 2)} м;
      A<sub>пр</sub> = h<sub>пр</sub>·b = ${N(Math.max(hRect, 0), 2)}·${N(c.b, 2)} = ${N(ARect)} м²
      ${fits && enough
        ? `≥ A<sub>треб</sub> = ${N(Areq)} м² <span style="color:#1a7f37">→ прямоугольник проходит ✓</span>`
        : `<span style="color:#b3382e">→ прямоугольник не проходит (${why.join('; ')}) ✗</span>`}</p>
      <p style="margin:4px 0"><b>Площадь по формуле шнурков (Гаусса)</b> —
      контур пера задан ${P.length} вершинами (x<sub>i</sub>, z<sub>i</sub>), м,
      обход по замкнутому многоугольнику:</p>
      <p style="margin:4px 0">A = ½·|Σ (x<sub>i</sub>·z<sub>i+1</sub> − x<sub>i+1</sub>·z<sub>i</sub>)|
      = ½·|${terms}|
      = ½·|${N(Math.abs(S), 2)}| = <b>${N(A)} м²</b></p>
      <p style="margin:4px 0">Требуемая по Правилам:
      A<sub>треб</sub> = (L·d/100)·(1 + 50·C<sub>b</sub>²·(B/L)²)
      = (${N(m.L, 0)}·${N(c.d, 1)}/100)·(1 + 50·${N(m.Cb, 2)}²·(${N(m.B, 0)}/${N(m.L, 0)})²)
      = <b>${N(Areq)} м²</b> —
      ${A >= Areq
        ? '<span style="color:#1a7f37">вписанный контур обеспечивает требуемую площадь ✓</span>'
        : '<span style="color:#b3382e">площади не хватает — увеличьте хорду или уменьшите зазоры ✗</span>'}
      ${capped ? '<span class="muted"> (верх пера частично ограничен ЛГВЛ: подзор с зазором h₂ выше ватерлинии)</span>' : ''}</p>`;
  }

  ['ct-d', 'ct-h2', 'ct-h1', 'ct-b'].forEach(id => $(id).addEventListener('input', render));
  if ($('ct-shape')) $('ct-shape').addEventListener('change', render);
  ['in-L', 'in-B', 'in-Cb'].forEach(id => { const el = $(id); if (el) el.addEventListener('input', render); });
  render();
})();
