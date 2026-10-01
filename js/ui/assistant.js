/* ============================================================
   CircuitLab — asistente educativo
   Da pistas progresivas: primero orienta, después concreta y solo
   al final muestra la solución.
   ============================================================ */
(function (CL) {
  'use strict';

  var A = {};
  CL.asistente = A;

  var pane, fab;
  var contexto = null;      // {titulo, pistas:[], solucion, ejemplo}
  var nivelPista = 0;

  A.init = function () {
    pane = document.getElementById('paneAsis');
    fab = document.getElementById('assistantFab');       // ya no existe: el asistente vive en su pestaña
    if (fab) {
      fab.addEventListener('click', function () {
        CL.emit('panel:derecha', 'asis');
        fab.classList.remove('alert');
        if (!pane.children.length) A.revisar();
      });
    }
    A.bienvenida();
  };

  A.bienvenida = function () {
    A.decir('👋 ¡Hola! Soy tu asistente',
      'Voy a acompañarte mientras armas tus circuitos. Si algo no funciona, dime y te doy pistas poco a poco (no la respuesta completa de una vez).',
      [{ etq: '🔍 Revisar mi circuito', fn: function () { A.revisar(); } },
       { etq: '📚 Empezar el curso', fn: function () { CL.lecciones.abrir(); } }]);
  };

  /** Escribe un mensaje del asistente. */
  A.decir = function (titulo, texto, acciones, clase) {
    if (!pane) pane = document.getElementById('paneAsis');
    var m = CL.el('div', { class: 'asis-msg ' + (clase || '') });
    m.innerHTML = '<div class="am-head">' + titulo + '</div><p>' + texto + '</p>';
    if (acciones && acciones.length) {
      var barra = CL.el('div', { class: 'btn-row' });
      acciones.forEach(function (a) {
        var b = CL.el('button', { class: 'btn small' }, a.etq);
        b.addEventListener('click', a.fn);
        barra.appendChild(b);
      });
      m.appendChild(barra);
    }
    pane.insertBefore(m, pane.firstChild);
    while (pane.children.length > 12) pane.removeChild(pane.lastChild);
    return m;
  };

  A.limpiar = function () { if (pane) pane.innerHTML = ''; };

  A.alertar = function () {
    if (fab) {
      fab.classList.add('alert');
      setTimeout(function () { fab.classList.remove('alert'); }, 6000);
    }
  };

  /* ------------------------------------------------------------
     Contexto de ejercicio: pistas progresivas
     ------------------------------------------------------------ */
  A.contexto = function (ctx) {
    contexto = ctx;
    nivelPista = 0;
    if (ctx) {
      A.decir('🎯 ' + CL.esc(ctx.titulo),
        CL.esc(ctx.enunciado || '') + '<br><br>Cuando lo intentes y algo falle, pídeme una pista.',
        botonesPista());
    }
  };

  function botonesPista() {
    var b = [{ etq: '💡 Muéstrame una pista', fn: function () { A.pista(); } },
             { etq: '❓ ¿Por qué?', fn: function () { A.porQue(); } },
             { etq: '🔍 Revisar circuito', fn: function () { A.revisar(); } }];
    if (contexto && contexto.ejemplo) b.push({ etq: '🧪 Ver ejemplo', fn: function () { CL.ejemplos.abrirId(contexto.ejemplo); } });
    return b;
  }

  A.pista = function () {
    if (!contexto || !contexto.pistas || !contexto.pistas.length) {
      A.revisar();
      return;
    }
    if (nivelPista >= contexto.pistas.length) {
      A.decir('🧩 Última ayuda',
        'Ya te di todas las pistas. Si quieres, puedo mostrarte el circuito resuelto para que lo compares con el tuyo.',
        [{ etq: '👀 Ver la solución', fn: function () { A.solucion(); } },
         { etq: '🔁 Intentar de nuevo', fn: function () { CL.emit('ejercicio:reintentar'); } }], 'tip');
      return;
    }
    var p = contexto.pistas[nivelPista++];
    A.decir('💡 Pista ' + nivelPista + ' de ' + contexto.pistas.length, p,
      nivelPista < contexto.pistas.length
        ? [{ etq: '💡 Otra pista', fn: function () { A.pista(); } }, { etq: '🔍 Revisar', fn: function () { A.revisar(); } }]
        : [{ etq: '👀 Ver la solución', fn: function () { A.solucion(); } }], 'tip');
    CL.emit('panel:derecha', 'asis');
  };

  A.solucion = function () {
    if (!contexto) return;
    if (contexto.solucion) {
      A.decir('✅ Así se resuelve', contexto.solucion,
        contexto.circuito ? [{ etq: '📥 Cargar el circuito resuelto', fn: function () { CL.ejemplos.cargarCircuito(contexto.circuito); } }] : null);
    } else {
      A.decir('✅ Solución', 'Compara tu circuito con el ejemplo de la galería.');
    }
  };

  A.porQue = function () {
    var a = CL.validar.analizar();
    var problema = a.items.filter(function (d) { return d.nivel === 'err' || d.nivel === 'warn'; })[0];
    if (!problema) {
      A.decir('🤔 ¿Por qué?', 'Tu circuito no tiene errores eléctricos en este momento. Si aun así no hace lo que esperas, revisa el programa de la placa o el valor de los componentes.');
      return;
    }
    A.decir('🤔 ¿Por qué ocurre?', '<b>' + CL.esc(problema.titulo) + '</b><br>' + CL.esc(problema.texto),
      [{ etq: '👉 ¿Cómo lo arreglo?', fn: function () { A.decir('🔧 Cómo solucionarlo', CL.esc(problema.arreglo)); } }]);
  };

  /* ------------------------------------------------------------
     Revisión automática
     ------------------------------------------------------------ */
  A.revisar = function () {
    var a = CL.validar.analizar();
    var errores = a.items.filter(function (d) { return d.nivel === 'err'; });
    var avisos = a.items.filter(function (d) { return d.nivel === 'warn'; });

    if (!CL.state.proj.components.length) {
      A.decir('🧰 Empieza colocando algo',
        'Tu mesa está vacía. Arrastra una <b>protoboard</b> y luego un <b>LED</b> y una <b>resistencia</b>.',
        [{ etq: '➕ Colocar protoboard', fn: function () { CL.ws.colocar('protoboard'); } }]);
      return;
    }
    if (errores.length) {
      var e = errores[0];
      A.decir('❌ ' + CL.esc(e.titulo), CL.esc(e.texto),
        [{ etq: '👉 ¿Cómo lo arreglo?', fn: function () { A.decir('🔧 Solución', CL.esc(e.arreglo)); resaltar(e.comps); } },
         { etq: '🔦 Señalar en el circuito', fn: function () { resaltar(e.comps); } }]);
      A.alertar();
      return;
    }
    if (avisos.length) {
      var w = avisos[0];
      A.decir('⚠️ ' + CL.esc(w.titulo), CL.esc(w.texto),
        [{ etq: '👉 ¿Cómo lo arreglo?', fn: function () { A.decir('🔧 Solución', CL.esc(w.arreglo)); resaltar(w.comps); } }], 'tip');
      A.alertar();
      return;
    }
    A.decir('✅ Todo en orden', 'El circuito está bien armado. ' +
      (CL.validar.ledEncendido() ? 'El LED enciende con ' + CL.fmtA(CL.validar.corrienteLed()) + '.' : 'Pulsa ▶ Ejecutar para verlo funcionar.'));
  };

  function resaltar(ids) {
    if (!ids || !ids.length) return;
    CL.state.seleccionar(ids);
    var c = CL.state.comp(ids[0]);
    if (c) CL.centrarEn(c.x, c.y);
  }

  /* ------------------------------------------------------------
     Reacción automática en modo aprendizaje
     ------------------------------------------------------------ */
  var ultimoAviso = 0, ultimoCodigo = '';
  CL.on('circuito:cambio', function () {
    if (document.body.dataset.modo !== 'aprendizaje') return;
    clearTimeout(A._t);
    A._t = setTimeout(function () {
      var a = CL.validar.analizar();
      var d = a.items.filter(function (x) { return x.nivel === 'err' || x.nivel === 'warn'; })[0];
      if (!d) return;
      if (d.codigo === ultimoCodigo && Date.now() - ultimoAviso < 20000) return;
      ultimoCodigo = d.codigo;
      ultimoAviso = Date.now();
      CL.mensaje(d.nivel, d.titulo, d.texto, d.arreglo, [
        { etq: '💡 Pista', fn: function () { A.pista(); CL.emit('panel:derecha', 'asis'); } },
        { etq: '🔦 Señalar', fn: function () { resaltar(d.comps); } }
      ]);
      A.alertar();
    }, 700);
  });

}(window.CL));
