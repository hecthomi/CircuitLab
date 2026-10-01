/* ============================================================
   CircuitLab — osciloscopio
   Dibuja cómo cambia con el tiempo la tensión de un pin o la
   corriente de un componente. Es lo que convierte el PWM, la
   carga de un condensador o el parpadeo de un LED en algo que
   se VE, en vez de un número que salta.

   Vive en la pestaña "Osciloscopio" de la consola. Toma una
   muestra por cuadro de simulación y solo redibuja si la
   pestaña está a la vista (si no, no gasta nada).
   ============================================================ */
(function (CL) {
  'use strict';

  var O = {};
  CL.osciloscopio = O;

  var MAX_CANALES = 4;
  var N = 1200;                                   // muestras guardadas por canal
  var COLORES = ['#22d3ee', '#fbbf24', '#a78bfa', '#4ade80'];

  var canales = [];            // {id, comp, pin, tipo:'v'|'i', color, etq, buf, n}
  var tiempos = new Float32Array(N);
  var escritos = 0, cursor = 0;
  var t0 = 0;
  var pausado = false;
  var ventana = 2;             // segundos visibles
  var cv = null, cx = null, envoltura = null;
  var ultimoDibujo = 0;

  /* ------------------------------------------------------------
     Canales
     ------------------------------------------------------------ */
  function nuevoCanal(comp, pin, tipo) {
    if (canales.length >= MAX_CANALES) {
      CL.toast('warn', 'Máximo ' + MAX_CANALES + ' sondas', 'Quita una antes de añadir otra.');
      return null;
    }
    var c = CL.state.comp(comp);
    if (!c) return null;
    var etq = tipo === 'i'
      ? 'I · ' + CL.nombreComp(c)
      : CL.nombreComp(c) + ' · ' + pin;
    var usados = canales.map(function (k) { return k.color; });
    var color = COLORES.filter(function (x) { return usados.indexOf(x) < 0; })[0] || COLORES[0];
    var ch = { id: CL.uid('ch'), comp: comp, pin: pin, tipo: tipo || 'v', color: color, etq: etq,
               buf: new Float32Array(N) };
    canales.push(ch);
    pintarBarra();
    return ch;
  }

  /** Añade una sonda a partir de lo que haya seleccionado. */
  O.sondar = function (tipo) {
    var id = CL.state.sel.filter(function (x) { return !!CL.state.comp(x); })[0];
    if (!id) {
      CL.toast('info', 'Selecciona un componente', 'Haz clic sobre el componente que quieras medir y pulsa otra vez.');
      return;
    }
    var c = CL.state.comp(id), def = CL.catalogo[c.type];
    if (!def) return;
    if (tipo === 'i') { nuevoCanal(id, null, 'i'); return; }
    // tensión: se ofrece el pin más interesante (salida, señal o el primero)
    var pines = def.pins.filter(function (p) { return p.rol !== 'gnd'; });
    if (!pines.length) return;
    // si solo hay un pin "positivo" claro (LED, buzzer, motor...), se toma ese
    var utiles = pines.filter(function (p) {
      return p.pol !== '−' && p.rol !== 'catodo' && p.rol !== 'negativo';
    });
    if (utiles.length === 1) { nuevoCanal(id, utiles[0].id, 'v'); return; }
    if (pines.length === 1) { nuevoCanal(id, pines[0].id, 'v'); return; }
    var h = '<div class="scope-pins">';
    pines.forEach(function (p) {
      h += '<button class="btn small" data-pin="' + p.id + '">' + CL.esc(p.etq || p.id) + '</button>';
    });
    h += '</div>';
    CL.dialogo.abrir('¿Qué pin quieres medir?', h, [{ etq: 'Cancelar', clase: 'ghost' }], {
      alAbrir: function (m) {
        CL.$$('[data-pin]', m).forEach(function (b) {
          b.addEventListener('click', function () { nuevoCanal(id, b.dataset.pin, 'v'); CL.dialogo.cerrar(); });
        });
      }
    });
  };

  O.quitar = function (id) {
    canales = canales.filter(function (c) { return c.id !== id; });
    pintarBarra();
    dibujar(true);
  };

  O.limpiar = function () {
    escritos = 0; cursor = 0; t0 = 0;
    canales.forEach(function (c) { c.buf = new Float32Array(N); });
    dibujar(true);
  };

  /* ------------------------------------------------------------
     Captura
     ------------------------------------------------------------ */
  function muestrear(dt) {
    if (pausado || !canales.length) return;
    t0 += dt || 0.016;
    tiempos[cursor] = t0;
    for (var i = 0; i < canales.length; i++) {
      var ch = canales[i], v = 0;
      if (ch.tipo === 'i') {
        var pc = CL.circuito.resultado && CL.circuito.resultado.porComp[ch.comp];
        v = pc ? (pc.corriente || 0) * 1000 : 0;             // en mA
      } else {
        v = CL.circuito.tension(ch.comp, ch.pin) || 0;
      }
      ch.buf[cursor] = v;
    }
    cursor = (cursor + 1) % N;
    if (escritos < N) escritos++;
  }

  /* ------------------------------------------------------------
     Dibujo
     ------------------------------------------------------------ */
  function ajustarLienzo() {
    if (!cv || !envoltura) return false;
    var r = envoltura.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return true;
  }

  function color(nombre, def) {
    var v = getComputedStyle(document.body).getPropertyValue(nombre);
    return (v && v.trim()) || def;
  }

  function dibujar(forzar) {
    if (!cv || !cx) return;
    var pane = document.getElementById('paneOsciloscopio');
    if (!pane || !pane.classList.contains('active')) return;      // oculto: no se gasta nada
    var ahora = performance.now();
    if (!forzar && ahora - ultimoDibujo < 45) return;             // ~22 cuadros por segundo
    ultimoDibujo = ahora;
    if (!ajustarLienzo()) return;

    var W = cv.width, H = cv.height, dpr = W / cv.getBoundingClientRect().width;
    var padI = 40 * dpr, padD = 8 * dpr, padS = 10 * dpr, padF = 20 * dpr;
    var gw = W - padI - padD, gh = H - padS - padF;

    cx.clearRect(0, 0, W, H);
    cx.fillStyle = color('--bg', '#0b1220');
    cx.fillRect(0, 0, W, H);

    if (!canales.length) {
      cx.fillStyle = color('--text-mute', '#64748b');
      cx.font = (13 * dpr) + 'px system-ui';
      cx.textAlign = 'center';
      cx.fillText('Selecciona un componente y pulsa «＋ Sonda» para ver su señal.', W / 2, H / 2);
      return;
    }

    /* --- escala vertical automática --- */
    var maxV = 1, minV = 0, hayI = canales.some(function (c) { return c.tipo === 'i'; });
    var n = escritos;
    for (var i = 0; i < canales.length; i++) {
      for (var k = 0; k < n; k++) {
        var v = canales[i].buf[k];
        if (v > maxV) maxV = v;
        if (v < minV) minV = v;
      }
    }
    maxV = Math.ceil(maxV * 1.15); minV = Math.min(0, Math.floor(minV * 1.15));
    if (maxV - minV < 1) maxV = minV + 1;

    var tFin = t0, tIni = Math.max(0, t0 - ventana);
    function px(t) { return padI + ((t - tIni) / (tFin - tIni || 1)) * gw; }
    function py(v) { return padS + gh - ((v - minV) / (maxV - minV)) * gh; }

    /* --- rejilla --- */
    cx.strokeStyle = color('--line', '#1e293b');
    cx.lineWidth = 1 * dpr;
    cx.fillStyle = color('--text-mute', '#64748b');
    cx.font = (10 * dpr) + 'px system-ui';
    cx.textAlign = 'right';
    var divs = 5;
    for (var d = 0; d <= divs; d++) {
      var vv = minV + (maxV - minV) * d / divs, y = py(vv);
      cx.beginPath(); cx.moveTo(padI, y); cx.lineTo(W - padD, y); cx.stroke();
      cx.fillText(CL.round(vv, 1) + (hayI ? '' : ' V'), padI - 5 * dpr, y + 3.5 * dpr);
    }
    cx.textAlign = 'center';
    for (var s = 0; s <= 4; s++) {
      var tt = tIni + (tFin - tIni) * s / 4, x = px(tt);
      cx.beginPath(); cx.moveTo(x, padS); cx.lineTo(x, padS + gh); cx.stroke();
      cx.fillText('-' + CL.round(tFin - tt, 1) + ' s', x, H - 6 * dpr);
    }

    /* --- trazas --- */
    for (var c2 = 0; c2 < canales.length; c2++) {
      var ch = canales[c2];
      cx.strokeStyle = ch.color;
      cx.lineWidth = 1.8 * dpr;
      cx.beginPath();
      var primero = true;
      for (var j = 0; j < n; j++) {
        var idx = (cursor - n + j + N * 2) % N;
        var t = tiempos[idx];
        if (t < tIni) continue;
        var X = px(t), Y = py(ch.buf[idx]);
        if (primero) { cx.moveTo(X, Y); primero = false; } else cx.lineTo(X, Y);
      }
      cx.stroke();
    }
  }

  /* ------------------------------------------------------------
     Barra de control
     ------------------------------------------------------------ */
  function pintarBarra() {
    var barra = document.getElementById('scopeBar');
    if (!barra) return;
    var h = '<button class="mini" id="scAddV" title="Medir la tensión de un pin del componente seleccionado">＋ Sonda</button>' +
      '<button class="mini" id="scAddI" title="Medir la corriente que pasa por el componente seleccionado">＋ Corriente</button>' +
      '<button class="mini" id="scPausa">' + (pausado ? '▶ Seguir' : '⏸ Pausar') + '</button>' +
      '<button class="mini" id="scLimpiar">Limpiar</button>' +
      '<select class="mini" id="scVentana" title="Segundos visibles">';
    [0.5, 1, 2, 5, 10].forEach(function (v) {
      h += '<option value="' + v + '"' + (v === ventana ? ' selected' : '') + '>' + v + ' s</option>';
    });
    h += '</select><span class="sc-chips">';
    canales.forEach(function (c) {
      h += '<span class="sc-chip" style="border-color:' + c.color + '">' +
        '<i style="background:' + c.color + '"></i>' + CL.esc(c.etq) +
        '<button data-quitar="' + c.id + '" title="Quitar">✕</button></span>';
    });
    h += '</span>';
    barra.innerHTML = h;

    barra.querySelector('#scAddV').addEventListener('click', function () { O.sondar('v'); });
    barra.querySelector('#scAddI').addEventListener('click', function () { O.sondar('i'); });
    barra.querySelector('#scPausa').addEventListener('click', function () { pausado = !pausado; pintarBarra(); });
    barra.querySelector('#scLimpiar').addEventListener('click', function () { O.limpiar(); });
    barra.querySelector('#scVentana').addEventListener('change', function () {
      ventana = parseFloat(this.value); dibujar(true);
    });
    CL.$$('[data-quitar]', barra).forEach(function (b) {
      b.addEventListener('click', function () { O.quitar(b.dataset.quitar); });
    });
  }

  /* ------------------------------------------------------------
     Arranque
     ------------------------------------------------------------ */
  O.iniciar = function () {
    envoltura = document.getElementById('scopeWrap');
    cv = document.getElementById('scopeCanvas');
    if (!cv) return;
    cx = cv.getContext('2d');
    pintarBarra();
    CL.on('sim:tick', function (d) { muestrear(d && d.dt); dibujar(false); });
    // si se borra un componente, su sonda se va con él
    CL.on('circuito:cambio', function () {
      var antes = canales.length;
      canales = canales.filter(function (c) { return !!CL.state.comp(c.comp); });
      if (canales.length !== antes) pintarBarra();
    });
    if (window.ResizeObserver && envoltura) {
      new ResizeObserver(function () { dibujar(true); }).observe(envoltura);
    }
    dibujar(true);
  };

  /** Abre la pestaña y, si no hay nada, intenta sondar lo seleccionado. */
  O.abrir = function () {
    CL.pestanaConsola('osciloscopio');
    if (!canales.length && CL.state.sel.length) O.sondar('v');
    setTimeout(function () { dibujar(true); }, 60);
  };

}(window.CL));
