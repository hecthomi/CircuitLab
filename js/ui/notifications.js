/* ============================================================
   CircuitLab — avisos flotantes y consola de mensajes
   ============================================================ */
(function (CL) {
  'use strict';

  var ICONOS = { ok: '✅', warn: '⚠️', err: '❌', info: '💡' };

  CL.toast = function (tipo, titulo, texto, ms) {
    var cont = document.getElementById('toasts');
    if (!cont) return;
    var t = CL.el('div', { class: 'toast ' + (tipo || 'info') },
      '<b>' + (ICONOS[tipo] || '') + ' ' + CL.esc(titulo) + '</b>' + (texto ? CL.esc(texto) : ''));
    cont.appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { if (t.parentNode) t.remove(); }, 300);
    }, ms || 3600);
    return t;
  };

  var ultimo = '';
  /**
   * Escribe un mensaje educativo en la consola.
   * nivel: ok | warn | err | info
   */
  CL.mensaje = function (nivel, titulo, texto, arreglo, acciones) {
    var pane = document.getElementById('paneMensajes');
    if (!pane) return;
    var clave = nivel + titulo;
    if (clave === ultimo && pane.firstChild) return;      // no repetir el mismo aviso seguido
    ultimo = clave;

    var m = CL.el('div', { class: 'msg ' + nivel });
    var html = '<div class="m-ico">' + (ICONOS[nivel] || '•') + '</div><div class="m-txt"><b>' + CL.esc(titulo) + '</b>';
    if (texto) html += '<div>' + CL.esc(texto) + '</div>';
    if (arreglo) html += '<span class="m-fix">👉 ' + CL.esc(arreglo) + '</span>';
    html += '</div>';
    m.innerHTML = html;

    if (acciones && acciones.length) {
      var barra = CL.el('div', { class: 'm-actions' });
      acciones.forEach(function (a) {
        var b = CL.el('button', {}, CL.esc(a.etq));
        b.addEventListener('click', a.fn);
        barra.appendChild(b);
      });
      m.querySelector('.m-txt').appendChild(barra);
    }
    pane.insertBefore(m, pane.firstChild);
    while (pane.children.length > 40) pane.removeChild(pane.lastChild);
    abrirConsola();
    return m;
  };

  /** La consola arranca plegada; cuando algo tiene que decirse se despliega
      sola, y el cursor del botón ▴/▾ tiene que ir a juego. */
  function abrirConsola() {
    document.body.classList.remove('console-min');
    var b = document.getElementById('btnConsolaToggle');
    if (b) b.textContent = '▾';
  }
  CL.abrirConsola = abrirConsola;

  CL.limpiarMensajes = function () {
    var pane = document.getElementById('paneMensajes');
    if (pane) pane.innerHTML = '';
    ultimo = '';
  };

  CL.pestanaConsola = function (nombre) {
    CL.$$('.cw-tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === nombre); });
    CL.$$('.cw-pane').forEach(function (p) {
      p.classList.toggle('active', p.id === 'pane' + nombre.charAt(0).toUpperCase() + nombre.slice(1));
    });
    abrirConsola();
  };

}(window.CL));
