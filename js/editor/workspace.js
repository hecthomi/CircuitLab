/* ============================================================
   CircuitLab — área de trabajo
   Dibuja los componentes, gestiona arrastre, rotación, cables,
   selección múltiple, zoom y el encaje en la protoboard.
   ============================================================ */
(function (CL) {
  'use strict';

  var WS = {};
  CL.ws = WS;

  var svg, capaComps, capaWires, capaOverlay, wrap;
  var RADIO_PIN = 7;          // radio de captura de un pin (en unidades del circuito)
  var SNAP = 7;               // distancia de encaje en la protoboard

  /* ------------------------------------------------------------
     Utilidad: inyectar marcado SVG dentro de un nodo
     ------------------------------------------------------------ */
  function setSVG(nodo, markup) {
    try {
      nodo.innerHTML = markup;
      if (nodo.childNodes.length || !markup) return;
    } catch (e) { /* navegadores antiguos */ }
    CL.clear(nodo);
    nodo.appendChild(CL.svgFrag(markup));
  }
  WS.setSVG = setSVG;

  /* ============================================================
     DIBUJO
     ============================================================ */
  WS.init = function () {
    svg = document.getElementById('stage');
    wrap = document.getElementById('stageWrap');
    capaComps = document.getElementById('layComps');
    capaWires = document.getElementById('layWires');
    capaOverlay = document.getElementById('layOverlay');
    // degradados compartidos por todos los componentes del lienzo
    var defs = svg.querySelector('defs');
    if (defs && !defs.querySelector('#gMetV')) defs.appendChild(CL.svgFrag(CL.DEFS_COMUNES));
    CL.vistaInit();
    conectarEventos();
    WS.render();
    setTimeout(function () { WS.revisarContactos(); }, 800);
  };

  WS.render = function () {
    CL.clear(capaComps);
    // las protoboards se pintan primero: son el soporte y siempre van debajo
    CL.state.proj.components.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (def && def.esProto) capaComps.appendChild(WS.nodoComp(c));
    });
    CL.state.proj.components.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (!def || !def.esProto) capaComps.appendChild(WS.nodoComp(c));
    });
    CL.wires.render();
    WS.marcarEnHoyo();
    document.body.classList.toggle('has-content', CL.state.proj.components.length > 0);
    CL.sel.aplicarClases();
    ultimoHover = null; ultimoComp = null;      // los nodos son nuevos: se recalcula el hover
    WS.actualizarDinamicos(true);
  };

  WS.nodoComp = function (c) {
    var def = CL.catalogo[c.type];
    var g = CL.svg('g', {
      class: 'comp' + (def && def.esProto ? ' proto' : ''),
      'data-id': c.id, 'data-tipo': c.type,
      transform: transformDe(c)
    });
    if (!def) return g;

    // sin anillo de selección: al seleccionar se enciende un halo azul
    // sobre la propia silueta del componente (CSS .comp.sel .cuerpo)
    var s = def.size;

    // cuerpo
    var cuerpo = CL.svg('g', { class: 'cuerpo' });
    setSVG(cuerpo, def.dibujar ? def.dibujar(c, {}) : '');
    textosLegibles(cuerpo, c);
    g.appendChild(cuerpo);

    // pines (los agujeros de la protoboard se dibujan en el cuerpo)
    if (!def.esProto) {
      var gp = CL.svg('g', { class: 'pines' });
      def.pins.forEach(function (p) {
        var pg = CL.svg('g', {
          class: 'pin' + (p.pol === '+' ? ' pos' : (p.pol === '−' ? ' neg' : '')),
          'data-pin': p.id, id: 'hole-' + c.id + '-' + p.id
        });
        pg.appendChild(CL.svg('circle', { class: 'pin-hit', cx: p.x, cy: p.y, r: 6 }));
        pg.appendChild(CL.svg('circle', { class: 'pin-dot', cx: p.x, cy: p.y, r: 2.6 }));
        gp.appendChild(pg);
      });
      g.appendChild(gp);
    }

    // etiquetas (no rotan con el componente para que sigan legibles)
    var etq = CL.svg('g', { class: 'etq', transform: transformEtq(c) });
    if (!def.esProto && !def.placa && def.etiquetaEnLienzo !== false) {
      var texto = def.etiquetaValor ? def.etiquetaValor(c) : '';
      if (texto) etq.appendChild(CL.svg('text', { class: 'value', x: 0, y: s.y - 6, 'text-anchor': 'middle' }, texto));
    }
    g.appendChild(etq);
    return g;
  };

  /** translate + rotate (+ espejo si está volteado). */
  function transformDe(c) {
    return 'translate(' + c.x + ' ' + c.y + ') rotate(' + (c.rot || 0) + ')' + (c.flip ? ' scale(-1 1)' : '');
  }
  /** El rótulo deshace giro y espejo para leerse siempre al derecho. */
  function transformEtq(c) {
    return (c.flip ? 'scale(-1 1) ' : '') + 'rotate(' + (-(c.rot || 0)) + ')';
  }
  /**
   * En un componente volteado los textos del propio dibujo (HC-SR04, 9 V, +/−…)
   * saldrían en espejo: a cada uno se le aplica un espejo local alrededor de su
   * punto de anclaje, así sigue en su sitio (reflejado) pero se lee bien.
   */
  function textosLegibles(nodo, c) {
    if (!c.flip) return;
    CL.$$('text', nodo).forEach(function (t) {
      var x = +t.getAttribute('x') || 0, y = +t.getAttribute('y') || 0;
      var previo = t.getAttribute('transform') || '';
      t.setAttribute('transform', 'translate(' + x + ' ' + y + ') scale(-1 1) translate(' + (-x) + ' ' + (-y) + ') ' + previo);
    });
  }

  /** Añade el nodo de un componente respetando que la protoboard va al fondo. */
  function insertarNodo(c) {
    var def = CL.catalogo[c.type];
    var g = WS.nodoComp(c);
    if (def && def.esProto) {
      var primero = capaComps.querySelector('.comp:not(.proto)');
      if (primero) { capaComps.insertBefore(g, primero); return g; }
    }
    capaComps.appendChild(g);
    return g;
  }
  WS.insertarNodo = insertarNodo;

  WS.actualizarComp = function (id) {
    var c = CL.state.comp(id);
    var g = capaComps.querySelector('.comp[data-id="' + id + '"]');
    if (!c || !g) return;
    g.setAttribute('transform', transformDe(c));
    var etq = g.querySelector('.etq');
    if (etq) etq.setAttribute('transform', transformEtq(c));
    CL.wires.actualizarDe(id);
    WS.marcarEnHoyo(id);
  };

  WS.redibujarCuerpo = function (id, st) {
    var c = CL.state.comp(id);
    if (!c) return;
    var def = CL.catalogo[c.type];
    var g = capaComps.querySelector('.comp[data-id="' + id + '"] .cuerpo');
    if (!g || !def.dibujar) return;
    setSVG(g, def.dibujar(c, st || {}));
    textosLegibles(g, c);
    var etq = capaComps.querySelector('.comp[data-id="' + id + '"] .etq');
    if (etq && def.etiquetaValor) {
      var t = etq.querySelector('.value');
      if (t) t.textContent = def.etiquetaValor(c);
    }
  };

  /* ---- actualización por cuadro de los componentes con estado ---- */
  var firmas = {};
  function firma(st) {
    var out = '';
    for (var k in st) {
      if (k === '_e') continue;
      var v = st[k];
      if (typeof v === 'number') out += k + Math.round(v * 100) + ';';
      else if (typeof v === 'boolean') out += k + (v ? 1 : 0) + ';';
      else if (Array.isArray(v)) out += k + JSON.stringify(v) + ';';
      else if (v !== null && typeof v === 'object') out += k + '{}';
      else out += k + v + ';';
    }
    return out;
  }
  WS.actualizarDinamicos = function (forzar) {
    var res = CL.circuito.resultado;
    if (!res) return;
    CL.state.proj.components.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (!def || (!def.medir && !def.interactivo)) return;
      var st = res.comps[c.id] || {};
      var f = firma(st);
      if (!forzar && firmas[c.id] === f) return;
      firmas[c.id] = f;
      WS.redibujarCuerpo(c.id, st);
    });
    CL.wires.actualizarFlujo(res);
    marcarPinesConectados();
  };

  var contadorPines = 0;
  function marcarPinesConectados() {
    if (++contadorPines % 12 !== 1) return;              // no hace falta cada cuadro
    CL.state.proj.components.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (!def || def.esProto) return;
      def.pins.forEach(function (p) {
        var el = document.getElementById('hole-' + c.id + '-' + p.id);
        if (el) el.classList.toggle('connected', CL.circuito.conectado(c.id, p.id));
      });
    });
    // agujeros ocupados de la protoboard
    CL.state.compsPorTipo('protoboard').forEach(function (bb) {
      var usados = {};
      CL.state.proj.components.forEach(function (c) {
        if (c.id === bb.id) return;
        var def = CL.catalogo[c.type];
        if (!def) return;
        def.pins.forEach(function (p) {
          var h = hoyoBajo(c, p, bb);
          if (h) usados[h] = true;
        });
      });
      CL.state.proj.wires.forEach(function (w) {
        if (w.a.comp === bb.id) usados[w.a.pin] = true;
        if (w.b.comp === bb.id) usados[w.b.pin] = true;
      });
      CL.$$('.comp[data-id="' + bb.id + '"] .bb-hole').forEach(function (h) {
        h.classList.toggle('used', !!usados[h.dataset.pin]);
      });
    });
  }

  function hoyoBajo(c, p, bb) {
    var r = CL.rotComp(c, p.x, p.y);
    var loc = CL.rot(c.x + r.x - bb.x, c.y + r.y - bb.y, -(bb.rot || 0));
    return CL.catalogo.protoboard.hoyoLocal(loc.x, loc.y);
  }
  WS.hoyoBajo = hoyoBajo;

  /** Componentes (ni protoboards ni placas) con alguna pata metida en la protoboard `bb`. */
  WS.montadosEn = function (bb) {
    var out = [];
    CL.state.proj.components.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (!def || def.esProto || def.placa || c.id === bb.id) return;
      for (var i = 0; i < def.pins.length; i++) {
        if (hoyoBajo(c, def.pins[i], bb)) { out.push(c.id); return; }
      }
    });
    return out;
  };

  /**
   * Marca las patas que están dentro de un agujero de la protoboard (clase
   * `en-hoyo`: se ven como el extremo metálico de la pata, sin punto de color)
   * y los componentes montados en ella (clase `en-proto`: sin rótulos).
   * Sin argumento repasa todo; con un id, solo ese componente (o todos si es
   * una protoboard, porque al moverla cambian los encajes de encima).
   */
  WS.marcarEnHoyo = function (id) {
    if (!capaComps) return;
    var protos = CL.state.compsPorTipo('protoboard');
    var lista = CL.state.proj.components;
    if (id) {
      var c0 = CL.state.comp(id);
      if (c0 && !(CL.catalogo[c0.type] || {}).esProto) lista = [c0];
    }
    lista.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (!def || def.esProto) return;
      var g = capaComps.querySelector('.comp[data-id="' + c.id + '"]');
      if (!g) return;
      var alguna = false;
      def.pins.forEach(function (p) {
        var dentro = false;
        if (!def.placa) {
          for (var i = 0; i < protos.length && !dentro; i++) dentro = !!hoyoBajo(c, p, protos[i]);
        }
        if (dentro) alguna = true;
        var el = g.querySelector('.pin[data-pin="' + p.id + '"]');
        if (el) el.classList.toggle('en-hoyo', dentro);
      });
      g.classList.toggle('en-proto', alguna);
    });
  };

  /* ============================================================
     BÚSQUEDA GEOMÉTRICA DE PINES
     ============================================================ */
  /** Pin más cercano de un único componente (null si ninguno está a tiro). */
  function pinDeComp(c, wx, wy, radio) {
    var def = CL.catalogo[c.type];
    if (!def) return null;
    var mejor = null, mejorD = radio || RADIO_PIN;
    def.pins.forEach(function (p) {
      var r = CL.rotComp(c, p.x, p.y);
      var d = CL.dist(wx, wy, c.x + r.x, c.y + r.y);
      if (d < mejorD) { mejorD = d; mejor = { comp: c.id, pin: p.id, x: c.x + r.x, y: c.y + r.y, def: p, tipo: c.type, d: d }; }
    });
    return mejor;
  }

  WS.pinEn = function (wx, wy, excluir) {
    var mejor = null, mejorD = RADIO_PIN;
    CL.state.proj.components.forEach(function (c) {
      if (excluir && excluir.indexOf(c.id) >= 0) return;
      var p = pinDeComp(c, wx, wy, mejorD);
      if (p) { mejorD = p.d; mejor = p; }
    });
    return mejor;
  };

  /**
   * Pin realmente accesible bajo el cursor.
   * Un componente apoyado en la protoboard tapa los agujeros que quedan debajo:
   * mientras el puntero esté sobre su cuerpo solo cuentan sus propios pines. Sin
   * esto la placa (un agujero cada 12 px) se queda siempre con el puntero y no
   * hay manera de arrastrar el componente que está encima.
   */
  WS.pinVisibleEn = function (wx, wy, excluir) {
    var tapa = WS.compEn(wx, wy, true);
    if (tapa && !(excluir && excluir.indexOf(tapa.id) >= 0)) {
      var propio = pinDeComp(tapa, wx, wy);
      if (propio) return propio;
      // El cuerpo de un componente tapa los AGUJEROS de la protoboard, pero no
      // la pata de otro componente que quede justo al lado. Sin esto, una
      // resistencia y un LED codo con codo se comen mutuamente una pata: no se
      // podia ni empezar un cable ahi ni medir con el multimetro.
      var vecino = WS.pinEn(wx, wy, excluir);
      if (vecino && !(CL.catalogo[vecino.tipo] || {}).esProto) return vecino;
      return null;
    }
    return WS.pinEn(wx, wy, excluir);
  };

  /** Distancia de un punto al segmento AB. */
  function distSegmento(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var largo = dx * dx + dy * dy;
    var t = largo ? ((px - ax) * dx + (py - ay) * dy) / largo : 0;
    t = CL.clamp(t, 0, 1);
    return CL.dist(px, py, ax + dx * t, ay + dy * t);
  }
  /** Cable que pasa por esa coordenada (no depende del apilamiento del SVG). */
  WS.cableEn = function (wx, wy, tolerancia) {
    var tol = tolerancia || 5.5, mejor = null, mejorD = tol;
    CL.state.proj.wires.forEach(function (w) {
      var pts = CL.wires.vertices(w);
      if (!pts) return;
      for (var i = 0; i < pts.length - 1; i++) {
        var d = distSegmento(wx, wy, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
        if (d < mejorD) { mejorD = d; mejor = w; }
      }
    });
    return mejor;
  };

  /**
   * Componente cuya caja contiene el punto, el más alto de la pila.
   * La protoboard cuenta siempre como el fondo: si hay cualquier otro
   * componente encima, gana ese. Con `soloEncima` se ignora la protoboard.
   */
  WS.compEn = function (wx, wy, soloEncima) {
    var comps = CL.state.proj.components;
    var fondo = null;
    for (var i = comps.length - 1; i >= 0; i--) {
      var c = comps[i], def = CL.catalogo[c.type];
      if (!def) continue;
      var inv = CL.invComp(c, wx - c.x, wy - c.y);
      var s = def.size;
      if (inv.x >= s.x && inv.x <= s.x + s.w && inv.y >= s.y && inv.y <= s.y + s.h) {
        if (def.esProto) { if (!fondo) fondo = c; continue; }
        return c;
      }
    }
    return soloEncima ? null : fondo;
  };

  /* ============================================================
     INTERACCIÓN
     ============================================================ */
  var modo = null;      // 'drag' | 'wire' | 'pan' | 'marquee' | 'bend'
  var datos = {};
  var espacio = false;

  function conectarEventos() {
    svg.addEventListener('pointerdown', alBajar);
    window.addEventListener('pointermove', alMover);
    window.addEventListener('pointerup', alSubir);
    // si el gesto se interrumpe (se suelta fuera, cambia de ventana, lo cancela
    // el navegador…) hay que limpiar o queda el recuadro dibujado en pantalla
    window.addEventListener('pointercancel', function () { cancelarGesto(); });
    window.addEventListener('blur', function () { cancelarGesto(); });
    svg.addEventListener('wheel', alRueda, { passive: false });
    svg.addEventListener('dblclick', alDobleClic);
    svg.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      WS.cancelarTodo();                       // clic derecho: cancela lo que se esté haciendo
    });
    window.addEventListener('keydown', function (e) { if (e.code === 'Space') espacio = true; });
    window.addEventListener('keyup', function (e) { if (e.code === 'Space') espacio = false; });
  }

  /* ---- limpieza de cualquier resto del gesto anterior ---- */
  function limpiarTemporales() {
    CL.$$('#layOverlay .marquee').forEach(function (n) { n.remove(); });
    CL.$$('#layOverlay .snap-ghost').forEach(function (n) { n.remove(); });
    CL.$$('#layComps .comp.dragging').forEach(function (n) { n.classList.remove('dragging'); });
  }
  function cancelarGesto() {
    if (modo === 'wire') { CL.wires.terminarPrevia(); svg.classList.remove('wiring'); }
    if (modo === 'pan') svg.classList.remove('panning');
    limpiarTemporales();
    limpiarObjetivo();
    modo = null;
    datos = {};
  }
  /** Cancela también un cable que se esté trazando por clics. */
  WS.cancelarTodo = function () {
    var habia = CL.wires.trazando();
    cancelarGesto();
    CL.wires.terminarPrevia();
    svg.classList.remove('wiring');
    return habia;
  };

  function alBajar(e) {
    if (e.button === 2) return;                    // el clic derecho se trata en contextmenu
    var p = CL.aMundo(e.clientX, e.clientY);

    // ¿venía un cable trazándose por clics? este clic lo continúa o lo termina
    if (CL.wires.trazando() && !modo) {
      var destino = WS.pinVisibleEn(p.x, p.y);
      if (destino) { cerrarCable(destino); return; }
      CL.wires.agregarPuntoPrevia(ajustar(p));     // añade un doblez y sigue
      CL.sfx.click();
      return;
    }

    // multimetro: si el clic cae sobre una punta, se arrastra esa punta
    var mmPunta = CL.multimetro && CL.multimetro.puntaEn(p.x, p.y);
    if (mmPunta) {
      if (modo) cancelarGesto();
      modo = 'multi';
      datos = { inicio: p, movido: false, pointerId: e.pointerId };
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      CL.multimetro.empezarArrastre(mmPunta);
      return;
    }

    // sensor ultrasónico: el círculo objetivo de la región de detección
    var objSonar = CL.sonar && CL.sonar.objetivoEn(p.x, p.y);
    if (objSonar) {
      if (modo) cancelarGesto();
      modo = 'sonar';
      datos = { inicio: p, movido: false, pointerId: e.pointerId };
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      CL.sonar.empezarArrastre(objSonar);
      return;
    }

    if (modo) cancelarGesto();                     // gesto anterior sin cerrar
    datos = { inicio: p, movido: false, pointerId: e.pointerId };
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* navegadores sin captura */ }

    // desplazamiento con botón central o barra espaciadora
    if (e.button === 1 || espacio) {
      modo = 'pan';
      datos.px = e.clientX; datos.py = e.clientY;
      svg.classList.add('panning');
      return;
    }

    // 1) ¿un tirador del cable seleccionado (doblez o extremo)?
    var tir = CL.wires.tiradorEn(p.x, p.y);
    if (tir) {
      if (tir.extremo) {                            // recolocar el extremo en otro agujero
        modo = 'extremo';
        datos.extremo = { wire: tir.wire, cual: tir.extremo };
        CL.wires.iniciarPrevia({ x: tir.x, y: tir.y });
        svg.classList.add('wiring');
      } else if (tir.nuevo !== null && tir.nuevo !== undefined) {
        CL.state.agregarDoblez(tir.wire, tir.nuevo, tir.x, tir.y);
        datos.bend = { wire: tir.wire, indice: tir.nuevo };
        modo = 'bend';
      } else {
        datos.bend = { wire: tir.wire, indice: tir.indice };
        modo = 'bend';
      }
      CL.sfx.click();
      return;
    }

    var pin = WS.pinVisibleEn(p.x, p.y);
    var cable = WS.cableEn(p.x, p.y);

    // 2) ¿un cable? Tiene preferencia salvo que el clic esté justo encima de un
    //    agujero: si no, sobre la protoboard nunca se podría tocar un cable,
    //    porque hay un agujero cada 12 px.
    if (cable && (!pin || CL.dist(p.x, p.y, pin.x, pin.y) > 3.4)) {
      CL.state.seleccionar([cable.id], e.shiftKey || e.ctrlKey);
      modo = null;
      return;
    }

    // 3) ¿un pin o un agujero?
    if (pin) {
      modo = 'wire';
      datos.origen = pin;
      CL.wires.iniciarPrevia(pin);
      svg.classList.add('wiring');
      CL.sfx.click();
      return;
    }

    // 4) ¿un componente?
    var c = WS.compEn(p.x, p.y);
    if (c) {
      if (accionInteractiva(c, p, e)) { modo = null; return; }
      if (!CL.state.estaSel(c.id)) CL.state.seleccionar([c.id], e.shiftKey || e.ctrlKey);
      else if (e.shiftKey || e.ctrlKey) CL.state.seleccionar([c.id], true);
      modo = 'drag';
      datos.ids = CL.state.sel.filter(function (id) { return !!CL.state.comp(id); });
      // el encaje fino solo se aplica cuando se arrastra UNA pieza elegida
      datos.solo = datos.ids.length === 1 ? datos.ids[0] : null;
      // Una protoboard arrastra consigo todo lo que lleva pinchado (LEDs,
      // resistencias…), igual que los cables siguen a sus agujeros.
      datos.ids.slice().forEach(function (id) {
        var cc = CL.state.comp(id);
        if (!cc || !(CL.catalogo[cc.type] || {}).esProto) return;
        WS.montadosEn(cc).forEach(function (m) { if (datos.ids.indexOf(m) < 0) datos.ids.push(m); });
      });
      datos.orig = {};
      datos.ids.forEach(function (id) {
        var cc = CL.state.comp(id);
        datos.orig[id] = { x: cc.x, y: cc.y };
      });
      // los dobleces de los cables que van de una pieza movida a otra también
      // se desplazan (si no, el cable se deformaría al mover el conjunto)
      datos.dobleces = [];
      CL.state.proj.wires.forEach(function (w) {
        if (!w.puntos || !w.puntos.length) return;
        if (datos.ids.indexOf(w.a.comp) < 0 || datos.ids.indexOf(w.b.comp) < 0) return;
        datos.dobleces.push({ w: w, orig: w.puntos.map(function (q) { return { x: q.x, y: q.y }; }) });
      });
      datos.empujado = false;
      marcarComp(c);
      ocultarTooltip();
      datos.ids.forEach(function (id) {
        var g = capaComps.querySelector('.comp[data-id="' + id + '"]');
        if (g) g.classList.add('dragging');
      });
      CL.emit('inspector:mostrar', c.id);
      return;
    }

    // 5) zona vacía: por defecto el ratón mueve la pantalla; con la herramienta
    //    de selección activa (o con Shift) se dibuja el rectángulo de selección
    if (!WS.modoSeleccion && !e.shiftKey) {
      modo = 'pan';
      datos.px = e.clientX; datos.py = e.clientY;
      svg.classList.add('panning');
      if (!e.ctrlKey) { CL.state.limpiarSeleccion(); CL.emit('inspector:vacio'); }
      return;
    }
    modo = 'marquee';
    if (!e.shiftKey) CL.state.limpiarSeleccion();
    datos.marco = CL.svg('rect', {
      class: 'marquee', x: p.x, y: p.y, width: 0, height: 0,
      fill: 'rgba(34,211,238,.12)', stroke: '#22d3ee', 'stroke-dasharray': '4 3', 'stroke-width': 1
    });
    capaOverlay.appendChild(datos.marco);
  }

  /** Herramienta activa: false = mover la pantalla, true = seleccionar. */
  WS.modoSeleccion = false;
  WS.setModoSeleccion = function (activo) {
    WS.modoSeleccion = !!activo;
    document.body.classList.toggle('modo-seleccion', WS.modoSeleccion);
    CL.setPref('modoSeleccion', WS.modoSeleccion);
  };

  function alMover(e) {
    var p = CL.aMundo(e.clientX, e.clientY);

    // cable trazándose por clics: sigue al cursor
    if (!modo && CL.wires.trazando()) {
      var dest = WS.pinVisibleEn(p.x, p.y);
      CL.wires.moverPrevia(dest ? { x: dest.x, y: dest.y } : ajustar(p));
      marcarObjetivo(dest);
      return;
    }
    if (modo === 'multi') { CL.multimetro.arrastrar(p.x, p.y); marcarObjetivo(WS.pinVisibleEn(p.x, p.y)); return; }
    if (modo === 'sonar') { CL.sonar.arrastrar(p.x, p.y); return; }
    if (!modo) { resaltarHover(p, e); return; }
    if (Math.abs(p.x - datos.inicio.x) > 1 || Math.abs(p.y - datos.inicio.y) > 1) datos.movido = true;

    if (modo === 'pan') {
      CL.mover(e.clientX - datos.px, e.clientY - datos.py);
      datos.px = e.clientX; datos.py = e.clientY;
      return;
    }
    if (modo === 'wire') {
      var destino = WS.pinVisibleEn(p.x, p.y, [datos.origen.comp]) || WS.pinVisibleEn(p.x, p.y);
      CL.wires.moverPrevia(destino ? { x: destino.x, y: destino.y } : ajustar(p));
      marcarObjetivo(destino);
      return;
    }
    if (modo === 'bend') {
      var q = ajustar(p);
      CL.state.moverDoblez(datos.bend.wire, datos.bend.indice, q.x, q.y, true);
      return;
    }
    if (modo === 'extremo') {
      var pex = WS.pinVisibleEn(p.x, p.y);
      CL.wires.moverPrevia(pex ? { x: pex.x, y: pex.y } : p);
      marcarObjetivo(pex);
      return;
    }
    if (modo === 'drag') {
      var dx = p.x - datos.inicio.x, dy = p.y - datos.inicio.y;
      if (!datos.empujado && datos.movido) { CL.state.push(); datos.empujado = true; }
      if (datos.solo && datos.ids.length > 1) {
        // protoboard con piezas encima: el conjunto avanza a saltos de media
        // rejilla, así al soltar no hay que reajustar nada y nada se descoloca
        var ob = datos.orig[datos.solo];
        dx = Math.round((ob.x + dx) / 6) * 6 - ob.x;
        dy = Math.round((ob.y + dy) / 6) * 6 - ob.y;
      }
      var rdx = Math.round(dx), rdy = Math.round(dy);
      datos.dobleces.forEach(function (d) {
        d.w.puntos = d.orig.map(function (q) { return { x: q.x + rdx, y: q.y + rdy }; });
      });
      datos.ids.forEach(function (id) {
        var o = datos.orig[id];
        CL.state.mover(id, o.x + dx, o.y + dy);
        WS.actualizarComp(id);
      });
      if (datos.solo && datos.ids.length === 1) previsualizarEncaje(datos.solo);
      CL.sel.barra();
      return;
    }
    if (modo === 'marquee' && datos.marco) {
      var x = Math.min(p.x, datos.inicio.x), y = Math.min(p.y, datos.inicio.y);
      datos.marco.setAttribute('x', x); datos.marco.setAttribute('y', y);
      datos.marco.setAttribute('width', Math.abs(p.x - datos.inicio.x));
      datos.marco.setAttribute('height', Math.abs(p.y - datos.inicio.y));
      return;
    }
  }

  function alSubir(e) {
    var p = CL.aMundo(e.clientX, e.clientY);
    try { svg.releasePointerCapture(e.pointerId); } catch (err) { /* ya liberado */ }

    if (modo === 'pan') { svg.classList.remove('panning'); CL.guardarVista(); }

    if (modo === 'multi') {
      CL.multimetro.soltar();
      limpiarObjetivo();
      limpiarTemporales();
      modo = null; datos = {};
      return;
    }

    if (modo === 'sonar') {
      CL.sonar.soltar();
      limpiarTemporales();
      modo = null; datos = {};
      return;
    }

    if (modo === 'wire') {
      var destino = WS.pinVisibleEn(p.x, p.y, [datos.origen.comp]) || WS.pinVisibleEn(p.x, p.y);
      if (destino && !(destino.comp === datos.origen.comp && destino.pin === datos.origen.pin)) {
        modo = null;
        cerrarCable(destino);
      } else {
        // no llegó a ningún pin: el cable queda "en la mano" y se sigue con clics
        if (datos.movido) CL.wires.agregarPuntoPrevia(ajustar(p));
        modo = null;
        datos = {};
        CL.mensaje('info', 'Cable en curso',
          'Haz clic para doblarlo donde quieras y termina haciendo clic en un pin o en un agujero.',
          'Con clic derecho o Esc lo cancelas.');
        return;
      }
    }

    if (modo === 'bend') {
      CL.state.marcarSucio();
      CL.emit('circuito:cambio');
      CL.wires.pintarTiradores();
    }

    if (modo === 'extremo') {
      var destino = WS.pinVisibleEn(p.x, p.y);
      CL.wires.terminarPrevia();
      svg.classList.remove('wiring');
      limpiarObjetivo();
      if (destino) {
        if (CL.state.recablear(datos.extremo.wire, datos.extremo.cual, destino)) {
          CL.wires.actualizar(datos.extremo.wire);
          CL.sfx.conectar();
        }
      } else if (datos.movido) {
        CL.mensaje('info', 'El extremo del cable debe quedar en un punto de conexión',
          'Suéltalo sobre un agujero de la protoboard o sobre el pin de un componente.',
          'Si querías quitar el cable, selecciónalo y pulsa Supr.');
      }
      CL.wires.pintarTiradores();
    }

    if (modo === 'drag') {
      if (datos.solo && datos.ids.length === 1) aplicarEncaje(datos.solo);
      limpiarTemporales();
      if (datos.movido) { CL.emit('circuito:cambio'); CL.state.marcarSucio(); }
      CL.wires.render();
    }

    if (modo === 'marquee') {
      if (datos.marco) {
        var ids = CL.sel.enRect(datos.inicio.x, datos.inicio.y, p.x, p.y);
        if (ids.length) CL.state.seleccionar(ids, e.shiftKey);
      }
      if (!datos.movido) { CL.state.limpiarSeleccion(); CL.emit('inspector:vacio'); }
    }

    limpiarTemporales();                 // pase lo que pase, no queda nada dibujado
    modo = null;
    datos = {};
  }

  /** Cierra el cable que se está trazando sobre el pin indicado. */
  function cerrarCable(destino) {
    var desde = CL.wires.refOrigen();
    var puntos = CL.wires.puntosPrevia();
    CL.wires.terminarPrevia();
    svg.classList.remove('wiring');
    limpiarObjetivo();
    modo = null;
    datos = {};
    if (!desde || (desde.comp === destino.comp && desde.pin === destino.pin)) return;
    var color = CL.wires.colorSugerido(desde, destino);
    var w = CL.state.conectar(desde, destino, color, puntos);
    if (w) {
      capaWires.appendChild(CL.wires.nodo(w));
      CL.sfx.conectar();
      CL.emit('cable:hecho', w);
    }
  }

  /** Redondea a media rejilla para que los dobleces queden alineados. */
  function ajustar(p) {
    return { x: Math.round(p.x / 6) * 6, y: Math.round(p.y / 6) * 6 };
  }

  function alRueda(e) {
    e.preventDefault();
    if (e.ctrlKey || !e.shiftKey) {
      var f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      CL.zoomEn(f, e.clientX, e.clientY);
      CL.guardarVista();
    } else {
      CL.mover(-e.deltaX, -e.deltaY);
    }
  }

  function alDobleClic(e) {
    var p = CL.aMundo(e.clientX, e.clientY);
    // doble clic sobre un tirador: quita ese doblez
    var tir = CL.wires.tiradorEn(p.x, p.y);
    if (tir && tir.indice !== null && tir.indice !== undefined) {
      CL.state.quitarDoblez(tir.wire, tir.indice);
      CL.wires.actualizar(tir.wire);
      CL.wires.pintarTiradores();
      return;
    }
    var c = WS.compEn(p.x, p.y);
    if (c) { CL.state.seleccionar([c.id]); CL.emit('inspector:mostrar', c.id); CL.emit('panel:derecha', 'insp'); }
  }

  /* ---- partes interactivas de los componentes ---- */
  function accionInteractiva(c, p, e) {
    var inv = CL.invComp(c, p.x - c.x, p.y - c.y);
    var ctx = CL.circuito.ctx;
    if (c.type === 'pulsador') {
      if (CL.dist(inv.x, inv.y, 0, 0) < 12) {
        var st = ctx.estados[c.id] || (ctx.estados[c.id] = {});
        st.presionado = true;
        CL.circuito.marcarSucio();
        WS.redibujarCuerpo(c.id, { presionado: true });
        rebotar(c, st, true);
        var soltar = function () {
          st.presionado = false;
          CL.circuito.marcarSucio();
          WS.redibujarCuerpo(c.id, { presionado: false });
          rebotar(c, st, false);
          window.removeEventListener('pointerup', soltar);
        };
        window.addEventListener('pointerup', soltar);
        // el chasquido lo produce CL.audio al detectar el cambio de estado
        return true;
      }
    }
    if (c.type === 'interruptor') {
      if (Math.abs(inv.y) < 14 && Math.abs(inv.x) < 20) {
        var st2 = ctx.estados[c.id] || (ctx.estados[c.id] = {});
        st2.cerrado = !(st2.cerrado === undefined ? c.props.cerrado : st2.cerrado);
        CL.state.setProp(c.id, 'cerrado', st2.cerrado, true);
        CL.circuito.marcarSucio();
        WS.redibujarCuerpo(c.id, st2);
        return true;
      }
    }
    if (c.type === 'microbit') {
      var mb = ctx.microbit[c.id] || (ctx.microbit[c.id] = { matriz: CL.matrizVacia(), botonA: false, botonB: false });
      var bx = -216 / 2 + 24, by = -22;
      var cerca = function (x0) { return CL.dist(inv.x, inv.y, x0, by) < 15; };
      var cual = cerca(bx) ? 'A' : (cerca(-bx) ? 'B' : null);
      if (cual) {
        if (cual === 'A') mb.botonA = true; else mb.botonB = true;
        CL.runtime.dispararEvento('boton:' + cual);
        WS.redibujarCuerpo(c.id, Object.assign({}, CL.circuito.estado(c.id), { botonA: mb.botonA, botonB: mb.botonB }));
        var up = function () {
          mb.botonA = false; mb.botonB = false;
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointerup', up);
        CL.sfx.click();
        return true;
      }
    }
    if (c.type === 'pot') {
      if (CL.dist(inv.x, inv.y, 0, -8) < 15) {
        modo = null;
        arrastrarPerilla(c, e);
        return true;
      }
    }
    return false;
  }

  /* ---- rebote mecanico del pulsador ----
     Un pulsador real no cierra limpio: durante unos milisegundos abre y cierra
     varias veces. Es LA razon de que haya que hacer antirrebote en el codigo.
     Se activa por componente en el inspector (propiedad "rebote"). */
  function rebotar(c, st, cerrando) {
    if (!c.props || !c.props.rebote) return;
    // cada gesto lleva su numero: si llega otro, el rebote anterior caduca.
    // (Comparar con st.presionado no vale: el propio rebote lo esta cambiando.)
    st._rebote = (st._rebote || 0) + 1;
    var id = st._rebote;
    var pasos = [6, 4, 9, 5, 14, 7], t = 0, valor = !cerrando;
    pasos.forEach(function (ms) {
      t += ms;
      (function (v, retraso) {
        setTimeout(function () {
          if (st._rebote !== id) return;
          st.presionado = v;
          CL.circuito.marcarSucio();
        }, retraso);
      }(valor, t));
      valor = !valor;
    });
    setTimeout(function () {
      if (st._rebote !== id) return;
      st.presionado = cerrando;
      CL.circuito.marcarSucio();
    }, t + 6);
  }

  function arrastrarPerilla(c, e0) {
    var y0 = e0.clientY, p0 = c.props.pos === undefined ? 0.5 : c.props.pos;
    var ultMuesca = p0;
    function mm(e) {
      var np = CL.clamp(p0 + (y0 - e.clientY) / 160, 0, 1);
      // muescas cada 5 % de recorrido, como una perilla real
      if (Math.abs(np - ultMuesca) >= 0.05) { ultMuesca = np; CL.sfx.muesca(); }
      CL.state.setProp(c.id, 'pos', np, true);
      CL.circuito.marcarSucio();
      WS.redibujarCuerpo(c.id, {});
      CL.emit('inspector:refrescar', c.id);
    }
    function mu() {
      window.removeEventListener('pointermove', mm);
      window.removeEventListener('pointerup', mu);
      CL.state.marcarSucio();
    }
    window.addEventListener('pointermove', mm);
    window.addEventListener('pointerup', mu);
  }

  /* ---- resaltado del pin bajo el cursor + información ---- */
  var ultimoHover = null, ultimoComp = null;
  /** Marca el componente bajo el cursor para que se vea que el foco es suyo. */
  function marcarComp(c) {
    var id = c ? c.id : null;
    if (id === ultimoComp) return;
    ultimoComp = id;
    CL.$$('#layComps .comp.hovered').forEach(function (n) { n.classList.remove('hovered'); });
    if (!id) return;
    var g = capaComps.querySelector('.comp[data-id="' + id + '"]');
    if (g) g.classList.add('hovered');
  }
  WS.marcarComp = marcarComp;

  function resaltarHover(p, e) {
    marcarComp(WS.compEn(p.x, p.y, true));
    var pin = WS.pinVisibleEn(p.x, p.y);
    var clave = pin ? pin.comp + ':' + pin.pin : null;
    if (clave === ultimoHover) { if (pin) moverTooltip(e); return; }
    limpiarObjetivo();
    ultimoHover = clave;
    if (!pin) { ocultarTooltip(); return; }
    var el = document.getElementById('hole-' + pin.comp + '-' + pin.pin);
    if (el) el.classList.add(el.classList.contains('bb-hole') ? 'hl' : 'target');
    mostrarTooltipPin(pin, e);
    // ilumina el resto de puntos del mismo nodo
    var net = CL.circuito.netDePin(pin.comp, pin.pin);
    if (net >= 0 && CL.pref('resaltarNodo', true)) {
      CL.circuito.pinsDeNet(net).forEach(function (pk) {
        var parts = pk.split(':');
        var e2 = document.getElementById('hole-' + parts[0] + '-' + parts[1]);
        if (e2 && e2 !== el) e2.classList.add(e2.classList.contains('bb-hole') ? 'netlit' : 'target');
      });
    }
  }
  function limpiarObjetivo() {
    CL.$$('.bb-hole.hl,.bb-hole.netlit').forEach(function (e) { e.classList.remove('hl', 'netlit'); });
    CL.$$('.pin.target').forEach(function (e) { e.classList.remove('target'); });
  }
  function marcarObjetivo(pin) {
    limpiarObjetivo();
    if (!pin) return;
    var el = document.getElementById('hole-' + pin.comp + '-' + pin.pin);
    if (el) el.classList.add(el.classList.contains('bb-hole') ? 'hl' : 'target');
  }

  var tip = null;
  function mostrarTooltipPin(pin, e) {
    tip = tip || document.getElementById('tooltip');
    var c = CL.state.comp(pin.comp);
    var def = CL.catalogo[c.type];
    var html = '';
    if (def.esProto) {
      html = def.descripcionPunto(pin.pin);
    } else {
      var pd = pin.def;
      html = '<b>' + CL.nombreComp(c) + ' · ' + (pd.etq || pd.id) + '</b>';
      if (pd.rol) html += '<br>' + rolTexto(pd.rol);
      if (pd.pwm) html += '<br>Este pin admite PWM (analogWrite).';
      if (pd.tipo === 'analog') html += '<br>Entrada analógica: se lee con analogRead().';
    }
    var v = CL.circuito.tension(pin.comp, pin.pin);
    if (CL.runtime.corriendo || Math.abs(v) > 0.01) html += '<br><span style="opacity:.8">Tensión: ' + CL.fmtV(v) + '</span>';
    tip.innerHTML = html;
    tip.hidden = false;
    moverTooltip(e);
  }
  function rolTexto(rol) {
    var m = {
      anodo: 'Ánodo (+): por aquí entra la corriente.',
      catodo: 'Cátodo (−): por aquí sale hacia GND.',
      positivo: 'Terminal positivo (+).',
      negativo: 'Terminal negativo (−).',
      gnd: 'GND: referencia de 0 V.',
      vcc: 'VCC: alimentación positiva.',
      senal: 'Pin de señal: recibe las órdenes del microcontrolador.'
    };
    return m[rol] || '';
  }
  function moverTooltip(e) {
    if (!tip || tip.hidden) return;
    var x = e.clientX + 16, y = e.clientY + 16;
    var r = tip.getBoundingClientRect();
    if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - 12;
    if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - 12;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  function ocultarTooltip() { if (tip) tip.hidden = true; }
  WS.ocultarTooltip = ocultarTooltip;

  /* ============================================================
     ENCAJE EN LA PROTOBOARD
     ============================================================ */
  /** ¿El cuerpo del componente está apoyado sobre alguna protoboard? */
  function sobreProto(c, protos) {
    var s = CL.catalogo.protoboard.size;
    for (var i = 0; i < protos.length; i++) {
      var bb = protos[i];
      var inv = CL.rot(c.x - bb.x, c.y - bb.y, -(bb.rot || 0));
      if (inv.x >= s.x && inv.x <= s.x + s.w && inv.y >= s.y && inv.y <= s.y + s.h) return true;
    }
    return false;
  }

  function calcularEncaje(id) {
    var c = CL.state.comp(id);
    var def = c && CL.catalogo[c.type];
    if (!c || !def || def.esProto || !def.pins.length) return null;
    var protos = CL.state.compsPorTipo('protoboard');
    if (!protos.length) return null;
    var defB = CL.catalogo.protoboard;
    // Si el componente ha quedado apoyado sobre la placa, se inserta sí o sí en
    // el agujero más cercano aunque esté a más de SNAP: en una protoboard real
    // no existe la posición "entre agujeros", y quedarse ahí rompía el circuito
    // en silencio (se ve puesto, pero no hace contacto).
    var forzar = !def.placa && sobreProto(c, protos);
    var mejor = null, forzado = null;
    def.pins.forEach(function (p) {
      var r = CL.rotComp(c, p.x, p.y);
      var ax = c.x + r.x, ay = c.y + r.y;
      protos.forEach(function (bb) {
        defB.pins.forEach(function (h) {
          var rb = CL.rot(h.x, h.y, bb.rot || 0);
          var hx = bb.x + rb.x, hy = bb.y + rb.y;
          var d = CL.dist(ax, ay, hx, hy);
          if (d < SNAP && (!mejor || d < mejor.d)) mejor = { d: d, dx: hx - ax, dy: hy - ay, bb: bb.id };
          else if (forzar && (!forzado || d < forzado.d)) forzado = { d: d, dx: hx - ax, dy: hy - ay, bb: bb.id };
        });
      });
    });
    return mejor || forzado;
  }
  function previsualizarEncaje(id) {
    limpiarEncaje();
    var enc = calcularEncaje(id);
    if (!enc) return;
    var c = CL.state.comp(id), def = CL.catalogo[c.type];
    def.pins.forEach(function (p) {
      var r = CL.rotComp(c, p.x, p.y);
      var ax = c.x + r.x + enc.dx, ay = c.y + r.y + enc.dy;
      capaOverlay.appendChild(CL.svg('circle', { class: 'snap-ghost', cx: ax, cy: ay, r: 4.4, fill: 'none', stroke: '#fbbf24', 'stroke-width': 1.6 }));
    });
  }
  function limpiarEncaje() { CL.$$('#layOverlay .snap-ghost').forEach(function (e) { e.remove(); }); }
  function aplicarEncaje(id) {
    var enc = calcularEncaje(id);
    if (!enc) {
      var c0 = CL.state.comp(id);
      if (c0) CL.state.mover(id, Math.round(c0.x / 6) * 6, Math.round(c0.y / 6) * 6);
      WS.actualizarComp(id);
      return;
    }
    var c = CL.state.comp(id);
    CL.state.mover(id, c.x + enc.dx, c.y + enc.dy);
    WS.actualizarComp(id);
    CL.sfx.conectar();
  }

  /* ---- patas que quedaron entre agujeros (circuitos guardados) ----
     El motor eléctrico da por insertada una pata solo si cae sobre el agujero
     con 1 px de margen. Un componente que se movió sin encajar se ve bien pero
     no conduce, así que se avisa y se ofrece recolocarlo. */
  function haceContacto(c, p, protos) {
    var defB = CL.catalogo.protoboard;
    var r = CL.rotComp(c, p.x, p.y);
    var ax = Math.round(c.x + r.x), ay = Math.round(c.y + r.y);
    for (var i = 0; i < protos.length; i++) {
      var bb = protos[i];
      for (var j = 0; j < defB.pins.length; j++) {
        var h = defB.pins[j], rb = CL.rot(h.x, h.y, bb.rot || 0);
        if (Math.abs(Math.round(bb.x + rb.x) - ax) <= 1 && Math.abs(Math.round(bb.y + rb.y) - ay) <= 1) return true;
      }
    }
    return false;
  }

  WS.patasSueltas = function () {
    var protos = CL.state.compsPorTipo('protoboard');
    if (!protos.length) return [];
    var fuera = [];
    CL.state.proj.components.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (!def || def.esProto || def.placa || !def.pins.length) return;
      if (!sobreProto(c, protos)) return;
      var n = 0;
      def.pins.forEach(function (p) { if (!haceContacto(c, p, protos)) n++; });
      if (n) fuera.push({ id: c.id, n: n, nombre: CL.nombreComp(c) });
    });
    return fuera;
  };

  WS.revisarContactos = function () {
    var f = WS.patasSueltas();
    if (!f.length) return 0;
    var lista = f.map(function (x) { return x.nombre; }).join(', ');
    CL.mensaje('warn', 'Hay componentes que no hacen contacto con la protoboard',
      (f.length === 1 ? 'Este componente tiene alguna pata entre agujeros' : 'Estos componentes tienen alguna pata entre agujeros') +
      ' y por ahí el circuito no conduce: ' + lista + '.',
      'Pulsa «Reajustar» y quedarán insertados en los agujeros más cercanos.',
      [{ etq: '🔧 Reajustar', fn: function () {
        CL.state.push();
        f.forEach(function (x) { aplicarEncaje(x.id); });
        CL.wires.render();
        CL.state.marcarSucio();
        CL.emit('circuito:cambio');
        CL.toast('ok', 'Componentes reajustados', 'Ya están insertados en los agujeros de la protoboard.');
      } }]);
    return f.length;
  };

  /* ============================================================
     COLOCAR COMPONENTES DESDE LA PALETA
     ============================================================ */
  WS.colocar = function (tipo, wx, wy) {
    if (wx === undefined) {
      var r = svg.getBoundingClientRect();
      var m = CL.aMundo(r.left + r.width / 2, r.top + r.height / 2);
      wx = m.x; wy = m.y;
      // evita apilar componentes exactamente en el mismo sitio
      var n = CL.state.proj.components.length;
      wx += (n % 5) * 26 - 52; wy += Math.floor(n / 5) * 22 - 40;
    }
    var c = CL.state.agregar(tipo, Math.round(wx), Math.round(wy));
    if (!c) return null;
    insertarNodo(c);
    aplicarEncaje(c.id);
    document.body.classList.add('has-content');
    CL.state.seleccionar([c.id]);
    CL.emit('inspector:mostrar', c.id);
    CL.sfx.pop();
    CL.emit('circuito:cambio');
    // en móvil se pliega la paleta para poder ver lo que se acaba de colocar
    if (window.innerWidth < 860) {
      document.body.classList.add('hide-left');
      if (CL.app && CL.app.pestanasPaneles) CL.app.pestanasPaneles();
    }
    return c;
  };

  /* ---- arrastre desde el panel de componentes ---- */
  WS.iniciarArrastrePaleta = function (tipo, e) {
    var fantasma = CL.el('div', { class: 'drag-ghost' }, CL.iconoSVG(tipo, 60, 46));
    fantasma.style.cssText = 'position:fixed;pointer-events:none;z-index:300;opacity:.85;transform:translate(-50%,-50%)';
    document.body.appendChild(fantasma);
    function mm(ev) { fantasma.style.left = ev.clientX + 'px'; fantasma.style.top = ev.clientY + 'px'; }
    function mu(ev) {
      window.removeEventListener('pointermove', mm);
      window.removeEventListener('pointerup', mu);
      fantasma.remove();
      var r = svg.getBoundingClientRect();
      if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
        var p = CL.aMundo(ev.clientX, ev.clientY);
        WS.colocar(tipo, p.x, p.y);
      }
    }
    mm(e);
    window.addEventListener('pointermove', mm);
    window.addEventListener('pointerup', mu);
  };

  /* ============================================================
     ACCIONES DE EDICIÓN
     ============================================================ */
  WS.eliminarSeleccion = function () {
    var ids = CL.state.sel.slice();
    if (!ids.length) return;
    var comps = ids.filter(function (id) { return !!CL.state.comp(id); });
    var cables = ids.filter(function (id) { return !!CL.state.wire(id); });
    if (cables.length) CL.state.desconectar(cables);
    if (comps.length) CL.state.eliminar(comps);
    document.body.classList.toggle('has-content', CL.state.proj.components.length > 0);
    CL.sfx.click();
  };
  WS.rotarSeleccion = function () {
    var comps = CL.state.sel.filter(function (id) { return !!CL.state.comp(id); });
    if (!comps.length) return;
    CL.state.rotar(comps);
  };
  /** Voltea lo seleccionado en horizontal ('h') o en vertical ('v'). */
  WS.voltearSeleccion = function (eje) {
    var comps = CL.state.sel.filter(function (id) {
      var c = CL.state.comp(id), d = c && CL.catalogo[c.type];
      return d && d.volteable !== false && !d.esProto && !d.placa;
    });
    if (!comps.length) {
      if (CL.state.sel.length) CL.toast('info', 'Eso no se voltea', 'La protoboard y las placas (Arduino, micro:bit) solo se pueden girar.');
      return;
    }
    CL.state.voltear(comps, eje);
    // si estaba pinchado en la protoboard, que siga dentro de los agujeros
    comps.forEach(function (id) { aplicarEncaje(id); });
    CL.sfx.click();
  };
  WS.duplicarSeleccion = function () {
    var comps = CL.state.sel.filter(function (id) { return !!CL.state.comp(id); });
    if (!comps.length) return;
    var nuevos = CL.state.duplicar(comps);
    // las copias que caigan sobre la placa se insertan en los agujeros
    (nuevos || []).forEach(function (id) { aplicarEncaje(id); });
  };

  /* ---- reacción a cambios del estado ---- */
  // al cambiar de proyecto no puede quedar un cable a medio trazar del anterior
  CL.on('proyecto:redibujar', function () { WS.cancelarTodo(); firmas = {}; WS.render(); });
  CL.on('proyecto:cargado', function () {
    WS.cancelarTodo(); firmas = {}; WS.render();
    setTimeout(function () { WS.revisarContactos(); }, 400);
  });
  CL.on('comp:prop', function (d) {
    firmas[d.comp.id] = null;
    WS.redibujarCuerpo(d.comp.id, CL.circuito.estado(d.comp.id));
  });
  CL.on('sim:tick', function () { WS.actualizarDinamicos(); });

}(window.CL));
