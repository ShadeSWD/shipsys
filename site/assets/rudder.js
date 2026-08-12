/* Живой расчёт пера руля по Правилам РМРС (цепочка курсового проекта). */
'use strict';
(function () {
  const $ = id => document.getElementById(id);
  const N = (x, d = 2) => {
    if (!isFinite(x)) return '—';
    return x.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
  };

  // Константы работы (сняты с чертежа/корпуса конкретного судна)
  const C = {
    A2: 1650.66, A3: 911.18, A4: 1257.45, A5: 1660.98,
    X: -14.632, X0: -11.179, L1: 175.1, E1: 0.061,
    ReH: 235, k10: 26.1, k1: 1, k2: 1, k3: 18, k4: 0.185, b1: 2.2,
    // балка «руль—баллер» (руль типа III), мм и б/р:
    hb: 7645, k5: 0.158099, k7: 0.715489,
  };

  function readInputs() {
    return {
      L: +$('in-L').value, B: +$('in-B').value, d: +$('in-d').value,
      Cb: +$('in-Cb').value, v: +$('in-v').value, dvd: +$('in-dvd').value,
      h: +$('in-h').value, T: +$('in-T').value, d0: +$('in-d0').value,
    };
  }

  function compute(i) {
    const r = {};
    r.Areq = i.L * i.d / 100 * (1 + 50 * i.Cb * i.Cb * Math.pow(i.B / i.L, 2));
    r.b = Math.round(r.Areq / i.h * 10) / 10;
    r.A = i.h * r.b;
    r.lam = i.h / r.b;
    r.A1 = 0.2 * r.A;
    r.axis = r.A1 / i.h;
    r.Dv = i.dvd * i.d;
    r.Rv = r.Dv / 2;
    r.za = 0.25 * r.Dv; r.zb = 0.42 * r.Rv; r.zc = 0.36 * r.Rv;
    r.Av = Math.min(r.A, r.b * r.Dv);
    // эффективность
    r.W = 0.3 * i.Cb;
    r.V1 = i.v * (1 - r.W);
    r.mu1 = 6.28 / (1 + 2 * r.A / (i.h * i.h));
    r.CHB = 9.38 * i.T / (r.Dv * r.Dv * r.V1 * r.V1);
    r.Ep = r.mu1 * r.A / C.A2 * (1 + r.CHB * r.Av / r.A) * Math.pow(1 - r.W, 2);
    r.E2 = 3.8 * C.A3 / (C.A4 * i.v * i.v) * (1 - 0.0667 * C.A3 / C.A4) *
      (1 + (r.lam - 1) * (0.33 + 0.015 * (i.v - 7.5)) - 5 * C.X0 / C.L1);
    r.E3 = 0.03 + 0.01 * (r.lam - 1) + 0.01 * C.A5 / C.A2 * (1 - 3 * C.X / C.L1);
    r.E = Math.max(C.E1, r.E2, r.E3);
    // нагрузки
    r.F1 = 5.59e-3 * C.k1 * C.k2 * (6.5 + r.lam) * Math.pow(C.b1 - i.Cb, 2) * r.A * i.v * i.v;
    r.F2 = 0.177 * C.k1 * (6.5 + r.lam) * i.T / (r.Dv * r.Dv) * r.Av;
    r.F = r.F1 + r.F2;
    r.F3 = C.k3 * r.A;
    r.Mk = r.F * (r.A / i.h) * (0.35 - r.A1 / r.A);
    r.Vzx = 0.5 * i.v;
    r.Mzx = C.k4 * r.A * r.A / i.h * (0.7 - r.A1 / r.A) * r.Vzx * r.Vzx;
    r.d0c = C.k10 * Math.cbrt(r.Mk / C.ReH);
    // изгиб и прочность баллера (геометрия подвески — из работы)
    r.M2 = r.F * C.hb * C.k5 / (8 * C.k7) / 1000;
    const d03 = Math.pow(i.d0, 3);
    r.sig = 10.2e3 * r.M2 / d03;
    r.tau = 5.1e3 * r.Mk / d03;
    r.sigE = Math.sqrt(r.sig * r.sig + 3 * r.tau); // как в расчётной таблице работы
    r.sigAdm = 0.5 * C.ReH;
    // обшивка
    r.smin = 24 * (i.L + 37) / (i.L + 240);
    r.plates = [
      { a: 0.6, b: 0.7, k12: 8,    pos: '0,65b от носа (корма)', ceil: false },
      { a: 0.6, b: 0.7, k12: 18.6, pos: '0,35b от носа',          ceil: false },
      { a: 0.6, b: 1.0, k12: 18.6, pos: '0,35b от носа',          ceil: false },
      { a: 0.3, b: 0.6, k12: 18.6, pos: '0,35b от носа',          ceil: true  },
    ].map(p => {
      const k11 = 10.85 - 2.516 * Math.pow(p.a / p.b, 2);
      const s = p.a * k11 * Math.sqrt((98 * i.d + p.k12 * (r.F1 / r.A + 1 * r.F2 / r.Av)) / C.ReH) + 1.5;
      const acc = p.ceil ? Math.ceil(Math.max(r.smin, s)) : Math.round(Math.max(r.smin, s));
      return Object.assign({ k11, s, acc }, p);
    });
    return r;
  }

  function badge(ok, html) {
    return `<span class="badge ${ok ? 'ok' : 'bad'}">${html}</span>`;
  }

  function step(n, title, f, sub, res) {
    return `<div style="margin:14px 0;padding-bottom:12px;border-bottom:1px dashed var(--line)">
      <div class="st-title"><span class="st-num">${n}.</span> ${title}</div>
      <div style="margin:4px 0 2px">${f}</div>
      <div class="st-text">${sub}</div>
      <div style="margin-top:3px"><b>${res}</b></div>
    </div>`;
  }
  const gray = s => `<span class="muted">${s}</span>`;

  function renderSteps(i, r) {
    const s = [];
    s.push(step(1, 'Требуемая площадь пера',
      'A<sub>треб</sub> = (L·d/100)·(1 + 50·C<sub>b</sub>²·(B/L)²)',
      `= (${N(i.L,0)}·${N(i.d,1)}/100)·(1 + 50·${N(i.Cb,2)}²·(${N(i.B,0)}/${N(i.L,0)})²)`,
      `A<sub>треб</sub> = ${N(r.Areq)} м²`));
    s.push(step(2, 'Размеры пера (удлинение λ ≥ 1,5)',
      'b = A<sub>треб</sub>/h (окр. до 0,1 м); A = h·b; λ = h/b',
      `h = ${N(i.h,1)} м (принято по высоте кормового подзора), b = ${N(r.Areq)}/${N(i.h,1)} ≈ ${N(r.b,1)} м`,
      `A = ${N(i.h,1)}·${N(r.b,1)} = ${N(r.A,0)} м² ≥ A<sub>треб</sub>; λ = ${N(r.lam)} ${r.lam >= 1.5 ? '✓' : '&lt; 1,5 ✗'}`));
    s.push(step(3, 'Балансировка',
      'A₁ = 0,2·A — площадь в нос от оси баллера',
      `A₁ = 0,2·${N(r.A,0)} = ${N(r.A1,1)} м²; ось баллера в ${N(r.axis,1)} м от носовой кромки`,
      `A₁/A = 0,20 → плечо момента (0,35 − A₁/A) = 0,15`));
    s.push(step(4, 'Гребной винт и зазоры',
      'D<sub>в</sub> = (D<sub>в</sub>/d)·d; a = 0,25·D<sub>в</sub>; b<sub>з</sub> ≥ 0,42·R<sub>в</sub>; c<sub>з</sub> ≥ 0,36·R<sub>в</sub>',
      `D<sub>в</sub> = ${N(i.dvd)}·${N(i.d,1)} = ${N(r.Dv,1)} м`,
      `a = ${N(r.za,2)} м; b<sub>з</sub> ≥ ${N(r.zb,2)} м; c<sub>з</sub> ≥ ${N(r.zc,2)} м; зазоры пера: h₁ = 740 мм, h₂ = 268 мм ${gray('(по компоновке работы)')}`));
    s.push(step(5, 'Эффективность рулевого комплекса (гл. 2.10)',
      'E<sub>P</sub> = μ₁·(A/A₂)·(1 + C<sub>HB</sub>·A<sub>в</sub>/A)·(1 − W)²',
      `W = 0,3·${N(i.Cb)} = ${N(r.W)}; V₁ = ${N(i.v,1)}·(1 − ${N(r.W)}) = ${N(r.V1,2)} уз;
       μ₁ = 6,28/(1 + 2·${N(r.A,0)}/${N(i.h,1)}²) = ${N(r.mu1,2)};
       C<sub>HB</sub> = 9,38·${N(i.T,0)}/(${N(r.Dv,1)}²·${N(r.V1,2)}²) = ${N(r.CHB,2)};
       A<sub>в</sub> = min(A; b·D<sub>в</sub>) = ${N(r.Av,0)} м² ${gray('(A₂ = 1650,7 м² — из работы)')}`,
      `E<sub>P</sub> = ${N(r.Ep,3)} ≥ E = max(${N(C.E1,3)}; ${N(r.E2,3)}; ${N(r.E3,3)}) = ${N(r.E,3)} ${r.Ep >= r.E ? '✓' : '✗'}
       ${gray('E₁ — по рис. 2.10.3.3-1; E₂, E₃ — по площадям парусности работы')}`));
    s.push(step(6, 'Сила F₁ — скоростная составляющая (п. 2.2.2.1)',
      'F₁ = 5,59·10⁻³·k₁·k₂·(6,5 + λ)·(b₁ − C<sub>b</sub>)²·A·V²',
      `= 5,59·10⁻³·1·1·(6,5 + ${N(r.lam)})·(2,2 − ${N(i.Cb)})²·${N(r.A,0)}·${N(i.v,1)}²`,
      `F₁ = ${N(r.F1,1)} кН`));
    s.push(step(7, 'Сила F₂ — добавка от струи винта',
      'F₂ = 0,177·k₁·(6,5 + λ)·(T/D<sub>в</sub>²)·A<sub>в</sub>',
      `= 0,177·1·(6,5 + ${N(r.lam)})·(${N(i.T,0)}/${N(r.Dv,1)}²)·${N(r.Av,0)}`,
      `F₂ = ${N(r.F2,1)} кН`));
    s.push(step(8, 'Полная нагрузка и минимум',
      'F = F₁ + F₂ ≥ F₃ = k₃·A',
      `F = ${N(r.F1,1)} + ${N(r.F2,1)} = ${N(r.F,1)} кН; F₃ = 18·${N(r.A,0)} = ${N(r.F3,0)} кН`,
      `F = ${N(r.F,1)} кН ${r.F >= r.F3 ? '≥ F₃ ✓' : '&lt; F₃ → принять F₃ ✗'}`));
    s.push(step(9, 'Крутящий момент на переднем ходу (п. 2.2.2.3)',
      'M<sub>к</sub> = F·(A/h)·(0,35 − A₁/A)',
      `= ${N(r.F,1)}·(${N(r.A,0)}/${N(i.h,1)})·(0,35 − 0,20)`,
      `M<sub>к</sub> = ${N(r.Mk,1)} кН·м`));
    s.push(step(10, 'Момент на заднем ходу (п. 2.2.2.4)',
      'M<sub>з.х.</sub> = k₄·(A²/h)·(0,7 − A₁/A)·V<sub>з.х.</sub>², V<sub>з.х.</sub> = 0,5·V',
      `= 0,185·(${N(r.A,0)}²/${N(i.h,1)})·0,5·${N(r.Vzx,2)}²`,
      `M<sub>з.х.</sub> = ${N(r.Mzx,1)} кН·м &lt; M<sub>к</sub> — баллер определяет передний ход`));
    s.push(step(11, 'Диаметр головы баллера (п. 2.3.1)',
      'd₀ = k₁₀·∛(M<sub>к</sub>/R<sub>eH</sub>), k₁₀ = 26,1; сталь КМ25: R<sub>eH</sub> = 235 МПа',
      `= 26,1·∛(${N(r.Mk,1)}/235) = ${N(r.d0c,1)} см`,
      `принято d₀ = ${N(i.d0,0)} см ${i.d0 >= r.d0c ? '✓ (с запасом)' : '✗ меньше расчётного!'}`));
    s.push(step(12, 'Изгибающий момент балки «руль—баллер» (п. 2.2.4)',
      'M₂ = Q₁·h<sub>б</sub>·k₅/(8·k₇); Q₁ = F, Q₂ = 0 (руль типа III)',
      `= ${N(r.F,1)}·${N(C.hb/1000,3)}·${N(C.k5,3)}/(8·${N(C.k7,3)}) ${gray('(h_б, k₅, k₇ — по геометрии подвески работы: l₁ = 2987, l₂ = 8058, e = 413 мм)')}`,
      `M₂ = ${N(r.M2,1)} кН·м`));
    s.push(step(13, 'Проверка прочности баллера',
      'σ = 10,2·10³·M₂/d₀³; τ = 5,1·10³·M<sub>к</sub>/d₀³; σ<sub>э</sub> = √(σ² + 3τ) ≤ 0,5·R<sub>eH</sub>',
      `σ = 10,2·10³·${N(r.M2,1)}/${N(i.d0,0)}³ = ${N(r.sig,1)} МПа;
       τ = 5,1·10³·${N(r.Mk,1)}/${N(i.d0,0)}³ = ${N(r.tau,1)} МПа`,
      `σ<sub>э</sub> = ${N(r.sigE,1)} МПа ${r.sigE <= r.sigAdm ? '&lt;' : '&gt;'} ${N(r.sigAdm,1)} МПа ${r.sigE <= r.sigAdm ? '✓' : '✗'}
       ${gray('свёртка σ, τ — по расчётной таблице работы; классическая форма σ_э = √(σ² + 3τ²)')}`));
    const rows = r.plates.map((p, k) =>
      `<tr><td>${k + 1}</td><td>${N(p.a,1)}×${N(p.b,1)}</td><td>${p.pos}</td>
       <td>${N(p.k11,2)}</td><td>${N(p.k12,1)}</td><td>${N(p.s,2)}</td><td><b>${p.acc}</b></td></tr>`).join('');
    s.push(step(14, 'Толщина обшивки пера (п. 2.4.1.1)',
      's = a·k₁₁·√((98·d + k₁₂·(F₁/A + k₁₃·F₂/A<sub>в</sub>))/R<sub>eH</sub>) + 1,5 ≥ s<sub>min</sub> = 24·(L + 37)/(L + 240)',
      `s<sub>min</sub> = 24·(${N(i.L,0)} + 37)/(${N(i.L,0)} + 240) = ${N(r.smin,2)} мм; k₁₃ = 1 (в струе винта)
       <div style="overflow-x:auto"><table style="border-collapse:collapse;font:13.5px system-ui;margin-top:6px" border="1" cellpadding="4">
       <tr><th>№</th><th>a×b, м</th><th>положение</th><th>k₁₁</th><th>k₁₂</th><th>s, мм</th><th>принято</th></tr>${rows}</table></div>`,
      `обшивка: ${r.plates.map(p => p.acc).join(' / ')} мм по пластинам 1–4`));
    $('rud-steps').innerHTML = s.join('');
  }

  function renderBadges(i, r) {
    $('rud-badges').innerHTML = [
      badge(true, `A = ${N(r.A,0)} м²`),
      badge(r.lam >= 1.5, `λ = ${N(r.lam)}`),
      badge(r.Ep >= r.E, `E<sub>P</sub> = ${N(r.Ep,3)} ≥ ${N(r.E,3)}`),
      badge(true, `F = ${N(r.F,0)} кН`),
      badge(true, `M<sub>к</sub> = ${N(r.Mk,1)} кН·м`),
      badge(i.d0 >= r.d0c, `d₀ = ${N(i.d0,0)} см (расч. ${N(r.d0c,1)})`),
      badge(r.sigE <= r.sigAdm, `σ<sub>э</sub> = ${N(r.sigE,1)} &lt; ${N(r.sigAdm,1)} МПа`),
    ].join('');
  }

  function renderSvg(i, r) {
    const t = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    t('svg-h', `h = ${N(i.h,1)} м`);
    t('svg-b', `b = ${N(r.b,1)} м`);
    t('svg-dv', `Dв = ${N(r.Dv,1)} м`);
    t('svg-A', `A = ${N(r.A,0)} м²`);
  }

  function renderNaca(i, r) {
    const bmm = r.b * 1000, tbar = 0.2;
    const W = 640, H = 220, x0 = 40, cw = 560, ymid = 118;
    const k = cw / bmm; // px на мм
    const yt = xb => 5 * tbar * bmm * (0.2969 * Math.sqrt(xb) - 0.1260 * xb -
      0.3516 * xb * xb + 0.2843 * xb ** 3 - 0.1015 * xb ** 4);
    const up = [], dn = [];
    for (let j = 0; j <= 120; j++) {
      const xb = j / 120, X = x0 + xb * cw, Y = yt(xb) * k;
      up.push(`${X.toFixed(1)},${(ymid - Y).toFixed(1)}`);
      dn.unshift(`${X.toFixed(1)},${(ymid + Y).toFixed(1)}`);
    }
    const tmax = tbar * bmm, xm = x0 + 0.3 * cw, ym = yt(0.3) * k;
    const xax = x0 + (r.axis * 1000 / bmm) * cw; // ось баллера
    const Rn = 1.1 * tbar * tbar * bmm;
    $('naca').innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="geo-board" style="max-width:640px" role="img" aria-label="Профиль NACA0020">
      <polygon points="${up.join(' ')} ${dn.join(' ')}" fill="rgba(21,94,117,.09)" stroke="#155e75" stroke-width="2"/>
      <line x1="${x0}" y1="${ymid}" x2="${x0 + cw}" y2="${ymid}" stroke="#16161a" stroke-width="1" stroke-dasharray="6 5"/>
      <line x1="${xm}" y1="${ymid - ym}" x2="${xm}" y2="${ymid + ym}" class="ln-dim"/>
      <text x="${xm + 8}" y="${ymid - 6}" class="lbl-dim">t<tspan baseline-shift="sub" font-size="9">max</tspan> = ${N(tmax,0)} мм</text>
      <line x1="${xax}" y1="${ymid - 92}" x2="${xax}" y2="${ymid + 92}" stroke="#1a7f37" stroke-width="1" stroke-dasharray="7 4"/>
      <text x="${xax + 6}" y="${ymid + 88}" class="lbl" fill="#1a7f37" font-size="12">ось баллера</text>
      <line x1="${x0}" y1="${ymid + 100}" x2="${x0 + cw}" y2="${ymid + 100}" class="ln-dim"/>
      <text x="${x0 + cw / 2}" y="${ymid + 96}" class="lbl-dim" text-anchor="middle">b = ${N(bmm,0)} мм</text>
      <text x="${x0 + 14}" y="${ymid - 30}" class="lbl gray" font-size="12">R = 1,1·t̄²·b = ${N(Rn,0)} мм</text>
      <text x="${x0 + cw - 8}" y="${ymid - 14}" class="lbl" font-size="14" text-anchor="end">NACA0020</text>
    </svg>`;
    $('naca-cap').textContent = `Профиль NACA0020 по формуле полутолщины: хорда b = ${N(bmm,0)} мм, `
      + `максимальная толщина ${N(tmax,0)} мм на 30 % хорды, радиус носика ${N(Rn,0)} мм. `
      + `Ось баллера — в ${N(r.axis * 1000,0)} мм от носовой кромки (балансирная часть A₁).`;
  }

  function update() {
    const i = readInputs();
    if (!(i.L > 0 && i.B > 0 && i.d > 0 && i.h > 0 && i.d0 > 0)) return;
    const r = compute(i);
    renderBadges(i, r);
    renderSteps(i, r);
    renderSvg(i, r);
    renderNaca(i, r);
  }

  ['in-L','in-B','in-d','in-Cb','in-v','in-dvd','in-h','in-T','in-d0']
    .forEach(id => $(id).addEventListener('input', update));
  update();
})();
