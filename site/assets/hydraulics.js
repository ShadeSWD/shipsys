/* Живой решатель задачи гидравлики: цистерна с избыточным давлением → трубопровод за борт.
   Цепочка (первое приближение → сетка d1 → итерации до 5 %) воспроизводит курсовую работу. */
'use strict';
(function () {
  const $ = id => document.getElementById(id);
  const G = 9.81, RHO = 1025, NU = 1.13e-6, PATM = 1e5;
  const N = (x, d = 2) => isFinite(x)
    ? x.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
  const Nsci = x => isFinite(x) ? N(x / 1e6, 2) + '·10⁶' : '—';
  const flo1 = x => Math.floor(x * 10) / 10; // как в работе: скорости с недостатком до 0,1

  function lambda(d, v, dd) {
    const Re = v * d / NU;
    if (!(Re > 0)) return { Re: NaN, lam: NaN, quad: false };
    const test = Math.pow(120 * d / dd, 1.125);
    const quad = Re > test;
    const lam = quad
      ? 0.25 / Math.pow(Math.log10(3.7 * d / dd), 2)
      : 0.1 * Math.pow(1.46 * dd / d + 100 / Re, 0.25);
    return { Re, test, lam, quad };
  }

  function compute(i) {
    const r = {};
    r.gamma = RHO * G;
    r.dP = i.P * 1e6 - PATM;
    r.head1 = (i.H - i.z1) + r.dP / r.gamma;
    r.head2 = (i.H - i.z2) + r.dP / r.gamma;
    if (!(r.head1 > 0)) return r;
    // первое приближение — без потерь
    r.v10 = Math.sqrt(2 * G * r.head1);
    r.v20 = Math.sqrt(2 * G * Math.max(0, r.head2));
    r.Q0 = Math.PI * i.d2 * i.d2 / 4 * r.v20;
    r.d10 = Math.sqrt(r.v20 * i.d2 * i.d2 / r.v10);
    // длина второго участка из ограничения ΣL
    r.l2 = (i.Lmax - i.l1cm) / 100;
    if (!(r.l2 > 0)) return r;
    const l1 = i.l1cm / 100;
    // ----- сетка d1 (по расчётной таблице работы) -----
    const v1t0 = r.v10 * r.v10 / (2 * G);
    r.grid = [];
    for (let cm = 1; cm <= 25; cm++) {
      const d1 = cm / 100;
      const v2g = d1 * d1 * r.v10 / (i.d2 * i.d2);
      const Qg = Math.PI * d1 * d1 / 4 * r.v10;
      const L1i = lambda(d1, r.v10, i.dd), L2i = lambda(i.d2, v2g, i.dd);
      const v2t = v2g * v2g / (2 * G);
      const dz3a = d1 < i.d2 ? Math.pow(1 - d1 / i.d2, 2) : 0.1;
      const dz3b = d1 > i.d2 ? Math.pow(1 - d1 / i.d2, 2) : 0.1;
      const H1 = l1 * L1i.lam / d1 * v1t0;
      const H2 = l1 * L2i.lam / r.l2 * v2t; // форма записи — из таблицы работы
      const Hm = (0.5 + 0.26 * i.a1 / 90 + dz3a) * v1t0 + (0.26 * i.a2 / 90 + dz3b) * v2t;
      const Summ = H1 + H2 + Hm;
      const v1c = r.head1 > Summ ? Math.sqrt((r.head1 - Summ) * 2 * G) : NaN;
      const Qc = Math.PI * d1 * d1 / 4 * v1c;
      const ok = isFinite(v1c) && cm < Math.round(i.d2 * 100) && (cm + i.d2 * 100) <= 40 + 1e-9;
      r.grid.push({ cm, d1, Qg, v2g, Re1: L1i.Re, Re2: L2i.Re, lam1: L1i.lam, lam2: L2i.lam, Summ, v1c, Qc, ok });
    }
    const best = r.grid.filter(g => g.ok).sort((a, b) => b.Qc - a.Qc)[0];
    if (!best) return r;
    r.d1 = best.d1; r.d1cm = best.cm;
    // ----- итерации (третье приближение) -----
    const d1 = r.d1, d2 = i.d2;
    const zk1 = 0.6 * i.a1 / 90, zk2 = 0.6 * i.a2 / 90;
    const z3 = Math.pow(1 - (d2 * d2) / (d1 * d1), 2), z4 = 0.1;
    const rr = (d1 / d2) * (d1 / d2);
    r.zk1 = zk1; r.zk2 = zk2; r.z3 = z3; r.rr = rr;
    r.iters = [];
    let v = r.v10;
    for (let n = 1; n <= 30; n++) {
      const L1i = lambda(d1, v, i.dd), L2i = lambda(d2, rr * v, i.dd);
      const c1 = L1i.lam * l1 / d1, c2 = L2i.lam * r.l2 / d2;
      const K = c1 + c2 * rr * rr + (0.5 + zk1 + z3 + c1) + (z4 + zk2 + c2) * rr * rr;
      const vn = Math.sqrt(2 * G * r.head1 / (1 + K));
      const vt = vn * vn / (2 * G);
      const h1 = c1 * vt, h2 = c2 * rr * rr * vt;
      const hm = (0.5 + zk1 + z3 + c1) * vt + (z4 + zk2 + c2) * rr * rr * vt;
      const delta = Math.abs(vn - v) / vn;
      r.iters.push({ n, v, lam1: L1i.lam, lam2: L2i.lam, quad1: L1i.quad, quad2: L2i.quad, K, vn, delta, h1, h2, hm });
      v = vn;
      if (delta <= 0.05) break;
    }
    const last = r.iters[r.iters.length - 1];
    r.v1 = last.vn; r.v2 = rr * last.vn;
    r.h1 = last.h1; r.h2 = last.h2; r.hm = last.hm;
    r.Qwork = Math.PI * d2 * d2 / 4 * r.v1;   // запись работы: через d2 и v1
    r.Qstrict = Math.PI * d1 * d1 / 4 * r.v1; // по неразрывности
    return r;
  }

  const step = (n, title, f, sub, res) => `
    <div style="margin:14px 0;padding-bottom:12px;border-bottom:1px dashed var(--line)">
      <div class="st-title"><span class="st-num">${n}.</span> ${title}</div>
      <div style="margin:4px 0 2px">${f}</div>
      <div class="st-text">${sub}</div>
      ${res ? `<div style="margin-top:3px"><b>${res}</b></div>` : ''}
    </div>`;

  function render(i, r) {
    const B = $('hyd-badges'), S = $('hyd-steps');
    if (!(r.head1 > 0)) {
      B.innerHTML = '<span class="badge bad">напор ≤ 0 — истечения нет</span>';
      S.innerHTML = '<div class="note warn">При этих данных располагаемый напор неположителен.</div>';
      return;
    }
    if (!(r.l2 > 0)) {
      B.innerHTML = '<span class="badge bad">l₁ ≥ ΣL — нет места для второго участка</span>';
      S.innerHTML = '<div class="note warn">Уменьшите l₁ или увеличьте ΣL<sub>max</sub>.</div>';
      return;
    }
    const s = [];
    s.push(step(1, 'Удельный вес и располагаемый напор',
      'γ = ρ·g; H<sub>р</sub> = (H − z₁) + (P − P<sub>атм</sub>)/γ',
      `γ = 1025·9,81 = ${N(r.gamma, 0)} Н/м³; H<sub>р</sub> = (${N(i.H,1)} − ${N(i.z1,1)}) + ${N(r.dP,0)}/${N(r.gamma,0)}`,
      `H<sub>р</sub> = ${N(r.head1)} м`));
    s.push(step(2, 'Первое приближение — без потерь (H<sub>пот</sub> = 0)',
      'v = √(2g·(H − z + (P − P<sub>атм</sub>)/γ)); Q = π·d₂²/4·v₂; d₁ = √(v₂·d₂²/v₁)',
      `v₁⁰ = √(2·9,81·${N(r.head1)}) = ${N(r.v10)} м/с; v₂⁰ = ${N(r.v20)} м/с;
       Q⁰ = π·${N(i.d2 * 100,0)}²/4·v₂⁰ = ${N(r.Q0)} м³/с`,
      `d₁⁰ = ${N(r.d10 * 100, 1)} см → скорости почти равны, диаметры почти одинаковы; потери всё изменят`));
    s.push(step(3, 'Ограничения задачи',
      'l₁ + l₂ ≤ ΣL<sub>max</sub>; d₁ + d₂ ≤ 40 см; d₁ — в диапазоне до d₂',
      `l₂ = ${N(i.Lmax,0)} − ${N(i.l1cm,0)} = ${N(r.l2 * 100, 0)} см`,
      `принято l₂ = ${N(r.l2 * 100, 0)} см`));
    if (!r.grid || !r.d1) {
      s.push('<div class="note warn">Сетка не дала ни одного допустимого d₁ — потери превышают напор. Измените данные.</div>');
      S.innerHTML = s.join('');
      B.innerHTML = '<span class="badge bad">нет решения</span>';
      return;
    }
    const gRows = r.grid.map(g => `
      <tr${g.cm === r.d1cm ? ' style="background:#e3f2e7;font-weight:600"' : ''}>
      <td>${g.cm}</td><td>${N(g.Qg, 3)}</td><td>${N(g.v2g, 2)}</td>
      <td>${Nsci(g.Re1)}</td><td>${Nsci(g.Re2)}</td>
      <td>${N(g.lam1, 4)}</td><td>${N(g.lam2, 4)}</td><td>${N(g.Summ, 2)}</td>
      <td>${N(g.v1c, 2)}</td><td>${N(g.Qc, 3)}</td>
      <td>${g.cm === r.d1cm ? '← выбран' : (g.ok ? 'да' : '—')}</td></tr>`).join('');
    s.push(step(4, 'Второе приближение — подбор d₁ сеткой',
      'для каждого d₁: скорости при v₁⁰, числа Re, λ по зоне сопротивления, потери ΣH, исправленное v₁ = √(2g·(H<sub>р</sub> − ΣH)) и расход',
      `<div style="overflow-x:auto;max-height:340px;overflow-y:auto">
       <table style="border-collapse:collapse;font:12.5px system-ui;margin-top:6px" border="1" cellpadding="3">
       <tr><th>d₁, см</th><th>Q⁰, м³/с</th><th>v₂, м/с</th><th>Re₁</th><th>Re₂</th>
       <th>λ₁</th><th>λ₂</th><th>ΣH, м</th><th>v₁<sup>испр</sup>, м/с</th><th>Q<sup>испр</sup>, м³/с</th><th>допустим</th></tr>
       ${gRows}</table></div>
       <span class="muted">«—» — потери превышают напор либо нарушены ограничения; формы записи потерь — по расчётной таблице работы</span>`,
      `выбран d₁ = ${r.d1cm} см — максимальный расход среди допустимых`));
    const iRows = r.iters.map(it => `
      <tr><td>${it.n}</td><td>${N(it.v, 2)}</td>
      <td>${N(it.lam1, 4)}${it.quad1 ? '' : '*'}</td><td>${N(it.lam2, 4)}${it.quad2 ? '' : '*'}</td>
      <td>${N(it.h1, 2)}</td><td>${N(it.h2, 2)}</td><td>${N(it.hm, 2)}</td>
      <td>${N(it.vn, 2)}</td><td>${N(it.delta * 100, 1)} %</td></tr>`).join('');
    s.push(step(5, 'Третье приближение — итерации скоростей до сходимости 5 %',
      `цикл работы: h₁ = λ₁·(l₁/d₁)·v₁²/2g; h₂ = λ₂·(l₂/d₂)·v₂²/2g;
       h<sub>м</sub> = (ζ₁ + ζ<sub>к1</sub> + ζ₃ + λ₁l₁/d₁)·v₁²/2g + (ζ₄ + ζ<sub>к2</sub> + λ₂l₂/d₂)·v₂²/2g;
       v₁ ← √(2g·(H<sub>р</sub> − Σh)); v₂ = d₁²·v₁/d₂²`,
      `ζ₁ = 0,5 (вход); ζ<sub>к1</sub> = 0,6·${i.a1}/90 = ${N(r.zk1, 3)};
       ζ<sub>к2</sub> = 0,6·${i.a2}/90 = ${N(r.zk2, 3)};
       ζ₃ = (1 − d₂²/d₁²)² = ${N(r.z3, 3)} (переход d₁→d₂, по таблице работы); ζ₄ = 0,1
       <div style="overflow-x:auto"><table style="border-collapse:collapse;font:12.5px system-ui;margin-top:6px" border="1" cellpadding="3">
       <tr><th>№</th><th>v₁, м/с</th><th>λ₁</th><th>λ₂</th><th>h₁, м</th><th>h₂, м</th><th>h<sub>м</sub>, м</th><th>v₁ нов., м/с</th><th>δ</th></tr>
       ${iRows}</table></div>
       <span class="muted">* — переходная область (Re &lt; 120·(d/Δ)<sup>1,125</sup>), λ по формуле с 100/Re</span>`,
      `сошлось за ${r.iters.length} итер.: v₁ = ${N(flo1(r.v1), 1)} м/с, v₂ = ${N(flo1(r.v2), 1)} м/с;
       потери h₁ = ${N(r.h1)} м, h₂ = ${N(r.h2)} м, h<sub>м</sub> = ${N(r.hm)} м`));
    s.push(step(6, 'Расход',
      'Q = π·d₂²/4·v₁ (запись работы)',
      `= π·${N(i.d2 * 100, 0)}²/4 · ${N(r.v1, 2)} = ${N(r.Qwork, 3)} м³/с
       <span class="muted">(строго по неразрывности Q = π·d₁²/4·v₁ = ${N(r.Qstrict, 2)} м³/с)</span>`,
      `Q ≈ ${N(Math.round(r.Qwork * 100) / 100, 2)} м³/с`));
    s.push(step(7, 'Ответ — одно из возможных решений задачи',
      '',
      `<div style="overflow-x:auto"><table style="border-collapse:collapse;font:13.5px system-ui" border="1" cellpadding="5">
       <tr><th>P, МПа</th><th>Q, м³/с</th><th>l₁, см</th><th>l₂, см</th><th>колено 1</th><th>колено 2</th><th>d₁, см</th><th>d₂, см</th></tr>
       <tr><td>${N(i.P, 3)}</td><td><b>${N(Math.round(r.Qwork * 100) / 100, 2)}</b></td>
       <td>${N(i.l1cm, 0)}</td><td><b>${N(r.l2 * 100, 0)}</b></td>
       <td>${i.a1}°</td><td>${i.a2}°</td><td><b>${r.d1cm}</b></td><td>${N(i.d2 * 100, 0)}</td></tr>
       </table></div>`, ''));
    S.innerHTML = s.join('');
    B.innerHTML = [
      `<span class="badge ok">d₁ = ${r.d1cm} см</span>`,
      `<span class="badge ok">l₂ = ${N(r.l2 * 100, 0)} см</span>`,
      `<span class="badge ok">v₁ = ${N(flo1(r.v1), 1)} м/с</span>`,
      `<span class="badge ok">v₂ = ${N(flo1(r.v2), 1)} м/с</span>`,
      `<span class="badge ok">Q = ${N(Math.round(r.Qwork * 100) / 100, 2)} м³/с</span>`,
      `<span class="badge ok">итераций: ${r.iters.length}</span>`,
    ].join('');
  }

  function update() {
    const i = {
      P: +$('in-P').value, H: +$('in-H').value, z1: +$('in-z1').value, z2: +$('in-z2').value,
      l1cm: +$('in-l1').value, Lmax: +$('in-Lmax').value,
      d2: +$('in-d2').value / 100, dd: +$('in-dd').value / 1000,
      a1: +$('in-a1').value, a2: +$('in-a2').value,
    };
    if (!(i.P > 0 && i.d2 > 0 && i.dd > 0 && i.l1cm > 0)) return;
    render(i, compute(i));
  }

  ['in-P','in-H','in-z1','in-z2','in-l1','in-Lmax','in-d2','in-dd','in-a1','in-a2']
    .forEach(id => $(id).addEventListener('input', update));
  update();
})();
