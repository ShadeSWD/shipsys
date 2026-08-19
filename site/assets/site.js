/* Данные каркаса страниц. Машинерия — assets/shell.js. */
'use strict';
(function () {
  const me = document.currentScript;
  const root = (me && me.dataset.root) || './';
  buildSiteShell({
    root,
    page: (me && me.dataset.page) || '',
    brand: 'Судовые устройства и системы',
    logo: `<span style="font-size:24px;line-height:1" aria-hidden="true">🧭</span>`,
    nav: [
      { h: '', k: 'index', t: 'Обзор' },
      { t: 'Задачи', h: 'rudder', drop: [
        { h: 'rudder', k: 'rudder', t: 'Рулевое устройство' },
        { h: 'hydraulics', k: 'hydraulics', t: 'Гидравлика систем' },
        { h: 'drainage', k: 'drainage', t: 'Осушительная система' },
      ] },
      { h: 'sources', k: 'sources', t: 'Источники' },
    ],
    footer: `<div>Учебный сайт по курсам «Судовые устройства» и «Судовые системы» · живые расчёты в браузере</div>
    <div>перо руля — по Правилам РМРС · гидравлика — по РД 5.76.038-84</div>`,
    markers: `<marker id="arrE" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8 z" fill="#16161a"/></marker>
    <marker id="arrS" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M10,0 L0,4 L10,8 z" fill="#16161a"/></marker>`,
    favicon: '\u{1F9ED}',
  });
})();
