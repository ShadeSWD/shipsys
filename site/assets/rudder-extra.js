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
  RT.forEach(k => { const b = $('rt-btn-' + k); if (b) b.addEventListener('click', () => showType(k)); });
  if ($('rt-btn-3')) showType('3');

  /* ============ 2. Автопостроение контура пера ============ */
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

  function ctrInputs() {
    return { d: +$('ct-d').value, h2: +$('ct-h2').value, h1: +$('ct-h1').value, b: +$('ct-b').value };
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

    // контур пера: низ — над подошвой на h1, верх — подзор минус h2 (не выше ЛГВЛ)
    const xle = 0.8, xte = xle + c.b, NP = 22;
    const top = [];
    let capped = false;
    for (let i = 0; i <= NP; i++) {
      const x = xle + (xte - xle) * i / NP;
      const zc = zCounter(x) - c.h2;
      if (zc > c.d) capped = true;
      top.push({ x, z: Math.min(zc, c.d) });
    }
    const P = [{ x: xle, z: c.h1 }, { x: xte, z: c.h1 }].concat(top.slice().reverse());
    const squeezed = top.some(p => p.z <= c.h1 + 0.5);
    const { A, S } = shoelace(P);
    const bMean = c.b, hMean = A / bMean, lam = hMean / bMean;
    const Areq = m.L * c.d / 100 * (1 + 50 * m.Cb * m.Cb * Math.pow(m.B / m.L, 2));
    const xax = xle + 0.2 * c.b;

    // --- SVG ---
    const ctPts = CT.map(p => `${X(p.x).toFixed(1)},${Y(p.z).toFixed(1)}`).join(' ');
    const bzPts = BZ.map(p => `${X(p.x).toFixed(1)},${Y(p.z).toFixed(1)}`).join(' ');
    const bladePts = P.map(p => `${X(p.x).toFixed(1)},${Y(p.z).toFixed(1)}`).join(' ');
    const dots = P.map(p => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.z).toFixed(1)}" r="2" fill="#155e75"/>`).join('');
    const zAxTop = zCounter(xax);
    const xm2 = xle + 0.3, m2y1 = Y(zCounter(xm2)), m2y2 = Y(top[Math.round(0.3 / (xte - xle) * NP)].z);
    const xm1 = xte - 0.35, m1y1 = Y(0), m1y2 = Y(c.h1);
    const zMidTop = top[Math.round(NP / 2)].z;
    const aTxtY = Y((c.h1 + zMidTop) / 2);

    $('ct-svg').innerHTML = `
    <svg viewBox="0 0 660 480" class="geo-board" style="max-width:660px" role="img"
         aria-label="Автопостроение контура пера руля в кормовом подзоре, заданном кривой Безье">
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
      <!-- перо -->
      <polygon points="${bladePts}" fill="rgba(21,94,117,.09)" stroke="#155e75" stroke-width="2"/>
      ${dots}
      <text x="${X((xle + xte) / 2).toFixed(1)}" y="${aTxtY.toFixed(1)}" class="lbl" font-size="16" text-anchor="middle">A = ${N(A)} м²</text>
      <!-- ось баллера -->
      <line x1="${X(xax).toFixed(1)}" y1="${(Y(zAxTop) - 20).toFixed(1)}" x2="${X(xax).toFixed(1)}" y2="424"
            stroke="#1a7f37" stroke-width="1" stroke-dasharray="7 4"/>
      <text x="${(X(xax) + 5).toFixed(1)}" y="421" class="lbl" fill="#1a7f37" font-size="11">ось баллера</text>
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
    const badges = [];
    if (squeezed) badges.push(badge(false, 'перо зажато: уменьшите зазоры или осадку ✗'));
    badges.push(badge(A >= Areq, `A = ${N(A)} ${A >= Areq ? '≥' : '&lt;'} A<sub>треб</sub> = ${N(Areq)} м² ${A >= Areq ? '✓' : '✗'}`));
    badges.push(badge(lam >= 1.5, `λ = h̄/b = ${N(lam)} ${lam >= 1.5 ? '≥ 1,5 ✓' : '&lt; 1,5 ✗'}`));
    badges.push(`<span class="badge ok" style="background:#eceae3;color:#16161a;border-color:#d8d6cf">h̄ = A/b = ${N(hMean)} м</span>`);
    $('ct-badges').innerHTML = badges.join('');

    // --- подстановка в формулу шнурков ---
    const term = i => {
      const a = P[i], b = P[(i + 1) % P.length];
      return `(${N(a.x, 1)}·${N(b.z, 2)} − ${N(b.x, 1)}·${N(a.z, 2)})`;
    };
    $('ct-math').innerHTML = `
      <p style="margin:4px 0"><b>Площадь по формуле шнурков (Гаусса)</b> —
      контур пера задан ${P.length} вершинами (x<sub>i</sub>, z<sub>i</sub>), м,
      обход по замкнутому многоугольнику:</p>
      <p style="margin:4px 0">A = ½·|Σ (x<sub>i</sub>·z<sub>i+1</sub> − x<sub>i+1</sub>·z<sub>i</sub>)|
      = ½·|${term(0)} + ${term(1)} + … + ${term(P.length - 1)}|
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
  ['in-L', 'in-B', 'in-Cb'].forEach(id => { const el = $(id); if (el) el.addEventListener('input', render); });
  render();
})();
