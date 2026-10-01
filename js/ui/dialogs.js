/* ============================================================
   CircuitLab — ventanas modales y cajones laterales
   ============================================================ */
(function (CL) {
  'use strict';

  var D = {};
  CL.dialogo = D;

  var raiz;

  function asegurar() {
    raiz = raiz || document.getElementById('modalRoot');
    return raiz;
  }

  /**
   * Abre una ventana modal.
   * botones: [{etq, clase, fn(cerrar)}]
   */
  D.abrir = function (titulo, cuerpoHTML, botones, opciones) {
    opciones = opciones || {};
    var r = asegurar();
    r.hidden = false;
    r.innerHTML = '';
    var m = CL.el('div', { class: 'modal' + (opciones.ancho ? ' wide' : '') });
    m.innerHTML =
      '<div class="modal-head"><h3>' + CL.esc(titulo) + '</h3>' +
      '<button class="btn ghost small" data-cerrar>✕</button></div>' +
      '<div class="modal-body">' + cuerpoHTML + '</div>';
    var pie = CL.el('div', { class: 'modal-foot' });
    (botones || [{ etq: 'Cerrar' }]).forEach(function (b) {
      var btn = CL.el('button', { class: 'btn ' + (b.clase || '') }, CL.esc(b.etq));
      btn.addEventListener('click', function () {
        if (b.fn) { if (b.fn(D.cerrar) === false) return; }
        if (!b.mantener) D.cerrar();
      });
      pie.appendChild(btn);
    });
    m.appendChild(pie);
    r.appendChild(m);
    m.querySelector('[data-cerrar]').addEventListener('click', D.cerrar);
    r.onclick = function (e) { if (e.target === r && !opciones.fijo) D.cerrar(); };
    if (opciones.alAbrir) opciones.alAbrir(m);
    return m;
  };

  D.cerrar = function () {
    var r = asegurar();
    r.hidden = true;
    r.innerHTML = '';
  };
  D.abierto = function () { return !asegurar().hidden; };

  D.confirmar = function (titulo, texto, cb, etqOk) {
    D.abrir(titulo, '<p>' + CL.esc(texto) + '</p>', [
      { etq: 'Cancelar', clase: 'ghost' },
      { etq: etqOk || 'Aceptar', clase: 'primary', fn: function () { cb(true); } }
    ]);
  };

  D.pedirTexto = function (titulo, etiqueta, valor, cb) {
    var m = D.abrir(titulo,
      '<p>' + CL.esc(etiqueta) + '</p><input type="text" id="dlgTexto" value="' + CL.esc(valor || '') + '">',
      [{ etq: 'Cancelar', clase: 'ghost' },
       { etq: 'Aceptar', clase: 'primary', fn: function () { cb(document.getElementById('dlgTexto').value.trim()); } }]);
    var inp = m.querySelector('#dlgTexto');
    inp.focus(); inp.select();
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { cb(inp.value.trim()); D.cerrar(); }
    });
  };

  D.info = function (titulo, html) { D.abrir(titulo, html, [{ etq: 'Entendido', clase: 'primary' }]); };

  /* ------------------------------------------------------------
     Cajón lateral (curso, ejemplos, ejercicios, profesor…)
     ------------------------------------------------------------ */
  var cajon, cuerpo, titulo;
  D.cajon = function (tit, html, opciones) {
    opciones = opciones || {};
    cajon = cajon || document.getElementById('drawer');
    cuerpo = cuerpo || document.getElementById('drawerBody');
    titulo = titulo || document.getElementById('drawerTitle');
    cajon.hidden = false;
    cajon.classList.toggle('right', !!opciones.derecha);
    cajon.classList.toggle('wide', !!opciones.ancho);
    titulo.textContent = tit;
    cuerpo.innerHTML = html;
    cuerpo.scrollTop = 0;
    if (opciones.alAbrir) opciones.alAbrir(cuerpo);
    return cuerpo;
  };
  D.cerrarCajon = function () {
    cajon = cajon || document.getElementById('drawer');
    cajon.hidden = true;
    CL.emit('cajon:cerrado');
  };
  D.cajonAbierto = function () {
    cajon = cajon || document.getElementById('drawer');
    return !cajon.hidden;
  };

}(window.CL));
