/* ============================================================
   CircuitLab — cables
   Se dibujan RECTOS entre punto y punto, y se pueden doblar
   añadiendo vértices (como en un montaje real ordenado).
   ============================================================ */
(function (CL) {
  'use strict';

  var W = {};
  CL.wires = W;

  var RADIO_ESQUINA = 7;      // redondeo de los codos

  /** Posición absoluta de una referencia {comp, pin}. */
  CL.posPinDe = function (ref) {
    var c = CL.state.comp(ref.comp);
    if (!c) return null;
    return CL.posPin(c, ref.pin);
  };

  /** Lista completa de vértices del cable: extremo A, dobleces, extremo B. */
  W.vertices = function (w) {
    var a = CL.posPinDe(w.a), b = CL.posPinDe(w.b);
    if (!a || !b) return null;
    return [a].concat((w.puntos || []).map(function (p) { return { x: p.x, y: p.y }; }), [b]);
  };

  /** Trazo recto con las esquinas redondeadas. */
  W.pathDe = function (pts) {
    if (!pts || pts.length < 2) return '';
    if (pts.length === 2) return 'M' + pts[0].x + ' ' + pts[0].y + ' L' + pts[1].x + ' ' + pts[1].y;
    var d = 'M' + pts[0].x + ' ' + pts[0].y;
    for (var i = 1; i < pts.length - 1; i++) {
      var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      var r1 = corta(p1, p0, RADIO_ESQUINA), r2 = corta(p1, p2, RADIO_ESQUINA);
      d += ' L' + r1.x.toFixed(1) + ' ' + r1.y.toFixed(1) +
           ' Q' + p1.x + ' ' + p1.y + ' ' + r2.x.toFixed(1) + ' ' + r2.y.toFixed(1);
    }
    var u = pts[pts.length - 1];
    return d + ' L' + u.x + ' ' + u.y;
  };
  /** Punto a distancia `r` de `desde` en dirección a `hacia` (sin pasarse de la mitad). */
  function corta(desde, hacia, r) {
    var dx = hacia.x - desde.x, dy = hacia.y - desde.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    var t = Math.min(r, d / 2) / d;
    return { x: desde.x + dx * t, y: desde.y + dy * t };
  }

  W.render = function () {
    var capa = document.getElementById('layWires');
    CL.clear(capa);
    CL.state.proj.wires.forEach(function (w) { capa.appendChild(W.nodo(w)); });
    CL.sel.aplicarClases();
    W.pintarTiradores();
  };

  W.nodo = function (w) {
    var g = CL.svg('g', { class: 'wire-g', 'data-id': w.id });
    var pts = W.vertices(w);
    if (!pts) return g;
    var d = W.pathDe(pts);
    var col = CL.colorCable(w.color);
    g.appendChild(CL.svg('path', { class: 'wire-hit', d: d, 'data-id': w.id }));
    g.appendChild(CL.svg('path', { class: 'wire', d: d, stroke: col, 'data-id': w.id }));
    g.appendChild(CL.svg('path', { class: 'flow', d: d, stroke: '#fff', 'stroke-width': 1.9, 'data-id': w.id }));
    g.appendChild(CL.svg('circle', { class: 'wire-end' + (enHoyo(w.a) ? ' en-hoyo' : ''), cx: pts[0].x, cy: pts[0].y, r: 2.6 }));
    g.appendChild(CL.svg('circle', { class: 'wire-end' + (enHoyo(w.b) ? ' en-hoyo' : ''), cx: pts[pts.length - 1].x, cy: pts[pts.length - 1].y, r: 2.6 }));
    return g;
  };

  /** ¿El extremo va metido en un agujero (protoboard o cabezal de una placa)? */
  function enHoyo(ref) {
    var c = CL.state.comp(ref.comp), def = c && CL.catalogo[c.type];
    return !!(def && (def.esProto || def.placa));
  }

  /** Vuelve a calcular el trazo de un cable concreto. */
  W.actualizar = function (id) {
    var w = CL.state.wire(id);
    var g = document.querySelector('#layWires .wire-g[data-id="' + id + '"]');
    if (!w || !g) return;
    var pts = W.vertices(w);
    if (!pts) return;
    var d = W.pathDe(pts);
    CL.$$('path', g).forEach(function (p) { p.setAttribute('d', d); });
    var cs = CL.$$('circle', g);
    if (cs[0]) { cs[0].setAttribute('cx', pts[0].x); cs[0].setAttribute('cy', pts[0].y); cs[0].classList.toggle('en-hoyo', enHoyo(w.a)); }
    if (cs[1]) { cs[1].setAttribute('cx', pts[pts.length - 1].x); cs[1].setAttribute('cy', pts[pts.length - 1].y); cs[1].classList.toggle('en-hoyo', enHoyo(w.b)); }
  };

  /* ------------------------------------------------------------
     Animación de conexión al iniciar la simulación: cada cable que va a
     una placa (Arduino, micro:bit…) se "tiende" desde su otro extremo y
     se enchufa en el cabezal con un destello, uno detrás de otro.
     ------------------------------------------------------------ */
  var animando = [];
  W.animarConexion = function () {
    animando.forEach(function (f) { f(); });
    animando = [];
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
    var capaO = document.getElementById('layOverlay');
    var lista = [];
    CL.state.proj.wires.forEach(function (w) {
      var ca = CL.state.comp(w.a.comp), cb = CL.state.comp(w.b.comp);
      var pa = !!(ca && (CL.catalogo[ca.type] || {}).placa), pb = !!(cb && (CL.catalogo[cb.type] || {}).placa);
      if (pa || pb) lista.push({ w: w, haciaA: pa && !pb });   // se tiende HACIA la placa
    });
    var DUR = 480, SEP = 150;
    lista.forEach(function (it, i) {
      var g = document.querySelector('#layWires .wire-g[data-id="' + it.w.id + '"]');
      var trazo = g && g.querySelector('.wire');
      if (!trazo || !trazo.animate) return;
      var len = trazo.getTotalLength ? trazo.getTotalLength() : 0;
      if (!len) return;
      var retardo = i * SEP;
      // el trazo "crece": hacia el final del path si la placa está en b, al revés si está en a
      var desde = it.haciaA ? -len : len;
      trazo.style.strokeDasharray = len + ' ' + len;
      trazo.style.strokeDashoffset = desde;
      var flujo = g.querySelector('.flow');
      if (flujo) flujo.style.visibility = 'hidden';
      var an = trazo.animate([{ strokeDashoffset: desde }, { strokeDashoffset: 0 }],
        { duration: DUR, delay: retardo, easing: 'cubic-bezier(.35,.75,.25,1)', fill: 'forwards' });
      var extremo = it.haciaA ? 'a' : 'b';
      var tEnchufe = setTimeout(function () { enchufar(capaO, it.w, extremo); }, retardo + DUR - 30);
      var limpiar = function () {
        clearTimeout(tEnchufe);
        try { an.cancel(); } catch (e) { /* ya terminó */ }
        trazo.style.strokeDasharray = ''; trazo.style.strokeDashoffset = '';
        if (flujo) flujo.style.visibility = '';
      };
      an.onfinish = function () { limpiar(); animando = animando.filter(function (f) { return f !== limpiar; }); };
      animando.push(limpiar);
    });
    return lista.length ? (lista.length - 1) * SEP + DUR : 0;
  };

  /** Destello en el pin de la placa donde acaba de entrar el cable. */
  function enchufar(capa, w, extremo) {
    var p = CL.posPinDe(w[extremo]);
    if (!p || !capa) return;
    var col = CL.colorCable(w.color);
    var g = CL.svg('g', { class: 'plug-fx' });
    var aro = CL.svg('circle', { class: 'plug-ring', cx: p.x, cy: p.y, r: 2, stroke: col });
    var chispa = CL.svg('circle', { class: 'plug-spark', cx: p.x, cy: p.y, r: 2.6, fill: '#fff' });
    g.appendChild(aro); g.appendChild(chispa);
    capa.appendChild(g);
    if (CL.sfx && CL.sfx.conectar) { try { CL.sfx.conectar(); } catch (e) { /* sin audio */ } }
    if (!aro.animate) { setTimeout(function () { g.remove(); }, 400); return; }
    aro.animate([{ r: 2, opacity: 1, strokeWidth: 2.2 }, { r: 11, opacity: 0, strokeWidth: .4 }],
      { duration: 420, easing: 'ease-out', fill: 'forwards' });
    chispa.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.2)' }],
      { duration: 260, easing: 'ease-out', fill: 'forwards' }).onfinish = function () {
      setTimeout(function () { g.remove(); }, 200);
    };
  }

  /** Recalcula los cables de un componente que se movió. */
  W.actualizarDe = function (compId) {
    CL.state.proj.wires.forEach(function (w) {
      if (w.a.comp === compId || w.b.comp === compId) W.actualizar(w.id);
    });
    W.pintarTiradores();
  };

  /** Marca qué cables llevan corriente para animar el flujo. */
  W.actualizarFlujo = function (res) {
    if (!res) return;
    var corr = res.cables || {};
    CL.$$('#layWires .flow').forEach(function (p) {
      var i = corr[p.dataset.id] || 0;
      var vivo = Math.abs(i) > 2e-4;
      p.classList.toggle('live', vivo);
      p.classList.toggle('rev', i < 0);
      if (vivo) {
        var g = CL.clamp(Math.abs(i) * 40, 0.25, 1);
        // separacion entre electrones: mucha corriente = puntos juntos
        var hueco = CL.round(19 - g * 13, 1);
        var paso = CL.round(2.6 + hueco, 1);
        p.style.strokeDasharray = '2.6 ' + hueco;
        p.style.setProperty('--paso', paso + 'px');
        p.style.opacity = 0.35 + 0.6 * g;
        p.style.animationDuration = CL.clamp(1.1 - g * 0.8, 0.25, 1.1) + 's';
      } else {
        p.style.opacity = '';
        p.style.strokeDasharray = '';
      }
    });
  };

  /* ------------------------------------------------------------
     Tiradores de los dobleces (solo en el cable seleccionado)
     ------------------------------------------------------------ */
  W.pintarTiradores = function () {
    var capa = document.getElementById('layOverlay');
    CL.$$('#layOverlay .bend', capa).forEach(function (n) { n.remove(); });
    CL.state.sel.forEach(function (id) {
      var w = CL.state.wire(id);
      if (!w) return;
      // extremos: se pueden arrastrar a otro agujero para recolocar el cable
      var ext = W.vertices(w);
      if (ext) {
        [['a', ext[0]], ['b', ext[ext.length - 1]]].forEach(function (par) {
          var ge = CL.svg('g', { class: 'bend extremo', 'data-wire': id, 'data-extremo': par[0] });
          ge.appendChild(CL.svg('circle', { class: 'bend-hit', cx: par[1].x, cy: par[1].y, r: 9 }));
          ge.appendChild(CL.svg('circle', { class: 'bend-ext', cx: par[1].x, cy: par[1].y, r: 4.4 }));
          capa.appendChild(ge);
        });
      }
      (w.puntos || []).forEach(function (p, i) {
        var g = CL.svg('g', { class: 'bend', 'data-wire': id, 'data-i': i });
        g.appendChild(CL.svg('circle', { class: 'bend-hit', cx: p.x, cy: p.y, r: 9 }));
        g.appendChild(CL.svg('circle', { class: 'bend-dot', cx: p.x, cy: p.y, r: 3.6 }));
        capa.appendChild(g);
      });
      // marcas para crear un doblez nuevo en mitad de cada tramo
      var pts = W.vertices(w);
      if (!pts) return;
      for (var k = 0; k < pts.length - 1; k++) {
        var mx = (pts[k].x + pts[k + 1].x) / 2, my = (pts[k].y + pts[k + 1].y) / 2;
        if (CL.dist(pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y) < 34) continue;
        var n = CL.svg('g', { class: 'bend nuevo', 'data-wire': id, 'data-nuevo': k });
        n.appendChild(CL.svg('circle', { class: 'bend-hit', cx: mx, cy: my, r: 8 }));
        n.appendChild(CL.svg('circle', { class: 'bend-add', cx: mx, cy: my, r: 3 }));
        capa.appendChild(n);
      }
    });
  };

  /** Devuelve el tirador (o el punto medio) que hay bajo una coordenada. */
  W.tiradorEn = function (wx, wy) {
    var mejor = null, mejorD = 9;
    CL.$$('#layOverlay .bend').forEach(function (g) {
      var c = g.querySelector('.bend-hit');
      var d = CL.dist(wx, wy, +c.getAttribute('cx'), +c.getAttribute('cy'));
      if (d < mejorD) {
        mejorD = d;
        mejor = {
          wire: g.dataset.wire,
          indice: g.dataset.i !== undefined ? +g.dataset.i : null,
          nuevo: g.dataset.nuevo !== undefined ? +g.dataset.nuevo : null,
          extremo: g.dataset.extremo || null,
          x: +c.getAttribute('cx'), y: +c.getAttribute('cy')
        };
      }
    });
    return mejor;
  };

  /* ------------------------------------------------------------
     Trazado en curso
     ------------------------------------------------------------ */
  var previa = null, previaPuntos = null;

  W.iniciarPrevia = function (origen) {
    var capa = document.getElementById('layOverlay');
    previa = CL.svg('path', { class: 'wire-preview', d: '' });
    capa.appendChild(previa);
    W._origen = { x: origen.x, y: origen.y };
    // referencia al pin de partida: hace falta al cerrar el cable varios clics después
    W._ref = (origen.comp && origen.pin) ? { comp: origen.comp, pin: origen.pin } : null;
    previaPuntos = [];
  };
  W.refOrigen = function () { return W._ref; };
  W.agregarPuntoPrevia = function (p) {
    if (!previa) return;
    previaPuntos.push({ x: Math.round(p.x), y: Math.round(p.y) });
    W.moverPrevia(p);
  };
  W.puntosPrevia = function () { return previaPuntos ? previaPuntos.slice() : []; };
  W.quitarUltimoPuntoPrevia = function () {
    if (previaPuntos && previaPuntos.length) previaPuntos.pop();
  };
  W.moverPrevia = function (destino) {
    if (!previa || !W._origen) return;
    var pts = [W._origen].concat(previaPuntos || [], [destino]);
    previa.setAttribute('d', W.pathDe(pts));
  };
  W.terminarPrevia = function () {
    if (previa && previa.parentNode) previa.parentNode.removeChild(previa);
    previa = null; previaPuntos = null; W._origen = null; W._ref = null;
  };
  W.trazando = function () { return !!previa; };

  /** Color sugerido según a qué se está conectando. */
  W.colorSugerido = function (refA, refB) {
    function rolDe(ref) {
      var c = CL.state.comp(ref.comp);
      if (!c) return null;
      var p = CL.pinDe(c.type, ref.pin);
      if (!p) return null;
      if (p.rol === 'gnd' || p.pol === '−') return 'gnd';
      if (p.rol === 'vcc' || p.rol === 'positivo' || p.pol === '+') return 'vcc';
      if (c.type === 'protoboard') {
        if (ref.pin.indexOf('TP') === 0 || ref.pin.indexOf('BP') === 0) return 'vcc';
        if (ref.pin.indexOf('TN') === 0 || ref.pin.indexOf('BN') === 0) return 'gnd';
      }
      if (p.tipo === 'gnd') return 'gnd';
      if (p.tipo === 'vcc5' || p.tipo === 'vcc33') return 'vcc';
      return null;
    }
    var a = rolDe(refA), b = rolDe(refB);
    if (a === 'gnd' || b === 'gnd') return 'negro';
    if (a === 'vcc' || b === 'vcc') return 'rojo';
    return CL.pref('colorCable', 'verde');
  };

  CL.on('cable:cambio', function (w) { W.actualizar(w.id); W.pintarTiradores(); });
  CL.on('seleccion:cambio', function () { W.pintarTiradores(); });

}(window.CL));
