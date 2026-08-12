/* Каркас страниц «Судовые устройства и системы». */
'use strict';
(function () {
  const me = document.currentScript;
  const root = (me && me.dataset.root) || './';
  const page = (me && me.dataset.page) || '';
  const logo = `<span style="font-size:24px;line-height:1" aria-hidden="true">🧭</span>`;
  const nav = [
    { href: '', key: 'index', title: 'Обзор' },
    { href: 'rudder', key: 'rudder', title: 'Рулевое устройство' },
    { href: 'hydraulics', key: 'hydraulics', title: 'Гидравлика систем' },
    { href: 'sources', key: 'sources', title: 'Источники' },
  ];
  const header = document.createElement('header');
  header.className = 'site';
  header.innerHTML = `<div class="wrap">
    <a class="logo" href="${root}">${logo}<span>Судовые устройства и системы</span></a>
    <nav class="top">${nav.map(({ href, key, title }) =>
      `<a href="${root}${href}" class="${page === key ? 'on' : ''}">${title}</a>`).join('')}</nav>
  </div>`;
  document.body.prepend(header);
  const footer = document.createElement('footer');
  footer.className = 'site';
  footer.innerHTML = `<div class="wrap">
    <div>Учебный сайт по курсам «Судовые устройства» и «Судовые системы» · живые расчёты в браузере</div>
    <div>перо руля — по Правилам РМРС · гидравлика — по РД 5.76.038-84</div>
  </div>`;
  document.body.appendChild(footer);
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
  defs.style.position = 'absolute';
  defs.innerHTML = `<defs>
    <marker id="arrE" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8 z" fill="#16161a"/></marker>
    <marker id="arrS" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M10,0 L0,4 L10,8 z" fill="#16161a"/></marker>
  </defs>`;
  document.body.appendChild(defs);
  // favicon (data-URI, чтобы не было 404 на /favicon.ico)
  if (!document.querySelector('link[rel~="icon"]')) {
    const fav = document.createElement('link');
    fav.rel = 'icon';
    fav.href = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="88">\u{1F9ED}</text></svg>');
    document.head.appendChild(fav);
  }
})();
