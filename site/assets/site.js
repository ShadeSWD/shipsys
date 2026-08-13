/* Каркас страниц «Судовые устройства и системы». */
'use strict';
(function () {
  const me = document.currentScript;
  const root = (me && me.dataset.root) || './';
  const page = (me && me.dataset.page) || '';
  const logo = `<span style="font-size:24px;line-height:1" aria-hidden="true">🧭</span>`;
  const nav = [
    { h: '', k: 'index', t: 'Обзор' },
    { t: 'Задачи', h: 'rudder', drop: [
      { h: 'rudder', k: 'rudder', t: 'Рулевое устройство' },
      { h: 'hydraulics', k: 'hydraulics', t: 'Гидравлика систем' },
      { h: 'drainage', k: 'drainage', t: 'Осушительная система' },
    ] },
    { h: 'sources', k: 'sources', t: 'Источники' },
  ];
  const navLink = (it) =>
    `<a href="${root}${it.h}" class="${page === it.k ? 'on' : ''}">${it.t}</a>`;
  const navHtml = nav.map((g) => {
    if (!g.drop) return navLink(g);
    const on = g.drop.some((it) => page === it.k) ? 'on' : '';
    return `<span class="nav-drop"><a href="${root}${g.h}" class="${on}">${g.t} ▾</a>`
      + `<span class="drop">${g.drop.map(navLink).join('')}</span></span>`;
  }).join('');
  const header = document.createElement('header');
  header.className = 'site';
  header.innerHTML = `<div class="wrap">
    <a class="logo" href="${root}">${logo}<span>Судовые устройства и системы</span></a>
    <nav class="top">${navHtml}</nav>
  </div>`;
  document.body.prepend(header);
  const onReady = (fn) => (document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn) : fn());
  const footer = document.createElement('footer');
  footer.className = 'site';
  footer.innerHTML = `<div class="wrap">
    <div>Учебный сайт по курсам «Судовые устройства» и «Судовые системы» · живые расчёты в браузере</div>
    <div>перо руля — по Правилам РМРС · гидравлика — по РД 5.76.038-84</div>
  </div>`;
  onReady(() => document.body.appendChild(footer));
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
  defs.style.position = 'absolute';
  defs.innerHTML = `<defs>
    <marker id="arrE" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8 z" fill="#16161a"/></marker>
    <marker id="arrS" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M10,0 L0,4 L10,8 z" fill="#16161a"/></marker>
  </defs>`;
  onReady(() => document.body.appendChild(defs));
  // favicon (data-URI, чтобы не было 404 на /favicon.ico)
  if (!document.querySelector('link[rel~="icon"]')) {
    const fav = document.createElement('link');
    fav.rel = 'icon';
    fav.href = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="88">\u{1F9ED}</text></svg>');
    document.head.appendChild(fav);
  }
})();
