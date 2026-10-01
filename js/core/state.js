/* ============================================================
   CircuitLab — estado del proyecto, historial (deshacer/rehacer)
   y selección. Es la única fuente de verdad del circuito.
   ============================================================ */
(function (CL) {
  'use strict';

  var MAX_HIST = 80;

  var S = {
    proj: null,
    sel: [],            // ids seleccionados (componentes y cables)
    dirty: false,
    hist: [],
    fut: [],
    _batch: 0
  };
  CL.state = S;

  /* ---------------- Proyecto ---------------- */
  function proyectoVacio(nombre) {
    return {
      id: CL.uid('prj'),
      name: nombre || 'Proyecto sin título',
      version: 1,
      app: 'CircuitLab',
      board: 'arduino_uno',
      components: [],
      wires: [],
      code: '',
      blocks: [],
      view: { x: 0, y: 0, k: 1 },
      created: Date.now(),
      modified: Date.now()
    };
  }
  CL.proyectoVacio = proyectoVacio;

  S.nuevo = function (nombre, silencioso) {
    S.proj = proyectoVacio(nombre);
    S.sel = []; S.hist = []; S.fut = []; S.dirty = false;
    if (!silencioso) CL.emit('proyecto:cargado', S.proj);
    return S.proj;
  };

  S.cargar = function (obj, silencioso) {
    var p = CL.clone(obj || {});
    var base = proyectoVacio(p.name);
    for (var k in base) if (p[k] === undefined) p[k] = base[k];
    p.components = p.components || [];
    p.wires = p.wires || [];
    // normaliza componentes antiguos / incompletos
    p.components.forEach(function (c) {
      c.id = c.id || CL.uid('c');
      c.rot = c.rot || 0;
      c.props = c.props || {};
      c.x = +c.x || 0; c.y = +c.y || 0;
    });
    p.wires.forEach(function (w) {
      w.id = w.id || CL.uid('w');
      w.color = w.color || 'verde';
      w.puntos = Array.isArray(w.puntos) ? w.puntos : [];
    });
    S.proj = p;
    S.sel = []; S.hist = []; S.fut = []; S.dirty = false;
    if (!silencioso) CL.emit('proyecto:cargado', S.proj);
    return p;
  };

  S.serializar = function () {
    S.proj.modified = Date.now();
    return CL.clone(S.proj);
  };

  /* ---------------- Historial ---------------- */
  function instantanea() {
    return JSON.stringify({ components: S.proj.components, wires: S.proj.wires, code: S.proj.code, board: S.proj.board });
  }
  /** Marca el inicio de un cambio: guarda el estado previo en el historial. */
  S.push = function () {
    if (!S.proj) return;
    if (S._batch > 0) return;               // dentro de un lote: solo la primera cuenta
    S.hist.push(instantanea());
    if (S.hist.length > MAX_HIST) S.hist.shift();
    S.fut.length = 0;
    S.marcarSucio();
  };
  /** Agrupa varias mutaciones en un solo paso de deshacer. */
  S.lote = function (fn) {
    S.push();
    S._batch++;
    try { fn(); } finally { S._batch--; }
    CL.emit('circuito:cambio');
  };

  function aplicar(json) {
    var d = JSON.parse(json);
    S.proj.components = d.components;
    S.proj.wires = d.wires;
    S.proj.code = d.code;
    S.proj.board = d.board;
    S.sel = [];
    CL.emit('proyecto:redibujar');
    CL.emit('circuito:cambio');
  }
  S.deshacer = function () {
    if (!S.hist.length) return false;
    S.fut.push(instantanea());
    aplicar(S.hist.pop());
    S.marcarSucio();
    return true;
  };
  S.rehacer = function () {
    if (!S.fut.length) return false;
    S.hist.push(instantanea());
    aplicar(S.fut.pop());
    S.marcarSucio();
    return true;
  };
  S.puedeDeshacer = function () { return S.hist.length > 0; };
  S.puedeRehacer = function () { return S.fut.length > 0; };

  S.marcarSucio = function () {
    S.dirty = true;
    CL.emit('proyecto:sucio');
  };
  S.marcarLimpio = function () {
    S.dirty = false;
    CL.emit('proyecto:sucio');
  };

  /* ---------------- Componentes ---------------- */
  S.comp = function (id) {
    var a = S.proj.components;
    for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
    return null;
  };
  S.compsPorTipo = function (tipo) {
    return S.proj.components.filter(function (c) { return c.type === tipo; });
  };
  S.cuenta = function (tipo) { return S.compsPorTipo(tipo).length; };

  S.agregar = function (tipo, x, y, props, rot) {
    var def = CL.catalogo[tipo];
    if (!def) { console.warn('Tipo desconocido: ' + tipo); return null; }
    var c = {
      id: CL.uid(tipo.slice(0, 3)),
      type: tipo,
      x: Math.round(x || 0),
      y: Math.round(y || 0),
      rot: rot || 0,
      props: Object.assign({}, def.props || {}, props || {})
    };
    S.push();
    S.proj.components.push(c);
    CL.emit('comp:agregado', c);
    CL.emit('circuito:cambio');
    return c;
  };

  S.eliminar = function (ids) {
    if (!Array.isArray(ids)) ids = [ids];
    if (!ids.length) return;
    S.push();
    S.proj.components = S.proj.components.filter(function (c) { return ids.indexOf(c.id) < 0; });
    S.proj.wires = S.proj.wires.filter(function (w) {
      return ids.indexOf(w.id) < 0 && ids.indexOf(w.a.comp) < 0 && ids.indexOf(w.b.comp) < 0;
    });
    S.sel = S.sel.filter(function (id) { return ids.indexOf(id) < 0; });
    CL.emit('proyecto:redibujar');
    CL.emit('circuito:cambio');
    CL.emit('seleccion:cambio');
  };

  S.duplicar = function (ids) {
    if (!Array.isArray(ids)) ids = [ids];
    var nuevos = [], mapa = {};
    S.push();
    ids.forEach(function (id) {
      var c = S.comp(id);
      if (!c) return;
      var n = CL.clone(c);
      n.id = CL.uid(n.type.slice(0, 3));
      // 24 = 2 agujeros: la copia cae desplazada pero sigue encajando en la
      // rejilla de la protoboard (con 26 quedaba entre agujeros y no conducía)
      n.x += 24; n.y += 24;
      mapa[c.id] = n.id;
      S.proj.components.push(n);
      nuevos.push(n.id);
    });
    // duplica también los cables internos de la selección
    S.proj.wires.slice().forEach(function (w) {
      if (mapa[w.a.comp] && mapa[w.b.comp]) {
        S.proj.wires.push({
          id: CL.uid('w'), color: w.color,
          a: { comp: mapa[w.a.comp], pin: w.a.pin },
          b: { comp: mapa[w.b.comp], pin: w.b.pin }
        });
      }
    });
    S.sel = nuevos;
    CL.emit('proyecto:redibujar');
    CL.emit('circuito:cambio');
    CL.emit('seleccion:cambio');
    return nuevos;
  };

  S.mover = function (id, x, y) {
    var c = S.comp(id);
    if (!c) return;
    c.x = Math.round(x); c.y = Math.round(y);
    CL.emit('comp:movido', c);
  };

  S.rotar = function (ids) {
    if (!Array.isArray(ids)) ids = [ids];
    S.push();
    ids.forEach(function (id) {
      var c = S.comp(id);
      if (!c) return;
      var def = CL.catalogo[c.type];
      var paso = (def && def.rotStep) || 90;
      c.rot = (c.rot + paso) % 360;
    });
    CL.emit('proyecto:redibujar');
    CL.emit('circuito:cambio');
  };

  /**
   * Voltea en espejo respecto a la PANTALLA: 'h' = izquierda↔derecha,
   * 'v' = arriba↔abajo. Con M·R(r)·S = R(−r)·S' (espejo por la izquierda) el
   * horizontal deja rot = −r y el vertical rot = 180 − r, alternando `flip`.
   * El eje pasa por el centro de las patas: lo que está pinchado en la
   * protoboard sigue en los mismos agujeros (las patas se intercambian).
   */
  S.voltear = function (ids, eje) {
    if (!Array.isArray(ids)) ids = [ids];
    S.push();
    ids.forEach(function (id) {
      var c = S.comp(id);
      var def = c && CL.catalogo[c.type];
      if (!def) return;
      var antes = centroPatas(c, def);
      c.flip = !c.flip;
      c.rot = ((eje === 'v' ? 180 : 0) - (c.rot || 0) + 720) % 360;
      if (!c.flip) delete c.flip;
      var despues = centroPatas(c, def);
      c.x = Math.round(c.x + antes.x - despues.x);
      c.y = Math.round(c.y + antes.y - despues.y);
    });
    CL.emit('proyecto:redibujar');
    CL.emit('circuito:cambio');
  };
  /** Centro (en el mundo) del rectángulo que envuelve las patas del componente. */
  function centroPatas(c, def) {
    var pins = def.pins || [];
    if (!pins.length) return { x: c.x, y: c.y };
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    pins.forEach(function (p) {
      var r = CL.rotComp(c, p.x, p.y);
      x1 = Math.min(x1, r.x); x2 = Math.max(x2, r.x);
      y1 = Math.min(y1, r.y); y2 = Math.max(y2, r.y);
    });
    return { x: c.x + (x1 + x2) / 2, y: c.y + (y1 + y2) / 2 };
  }

  S.setProp = function (id, clave, valor, sinHistorial) {
    var c = S.comp(id);
    if (!c) return;
    if (!sinHistorial) S.push();
    c.props[clave] = valor;
    CL.emit('comp:prop', { comp: c, clave: clave, valor: valor });
    CL.emit('circuito:cambio');
  };

  /* ---------------- Cables ---------------- */
  S.wire = function (id) {
    var a = S.proj.wires;
    for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
    return null;
  };

  S.conectar = function (a, b, color, puntos) {
    if (!a || !b) return null;
    if (a.comp === b.comp && a.pin === b.pin) return null;
    // evita cables duplicados exactamente iguales
    var rep = S.proj.wires.some(function (w) {
      return (w.a.comp === a.comp && w.a.pin === a.pin && w.b.comp === b.comp && w.b.pin === b.pin) ||
             (w.b.comp === a.comp && w.b.pin === a.pin && w.a.comp === b.comp && w.a.pin === b.pin);
    });
    if (rep) return null;
    var w = {
      id: CL.uid('w'),
      a: { comp: a.comp, pin: a.pin },
      b: { comp: b.comp, pin: b.pin },
      color: color || 'verde',
      puntos: (puntos || []).map(function (p) { return { x: Math.round(p.x), y: Math.round(p.y) }; })
    };
    S.push();
    S.proj.wires.push(w);
    CL.emit('cable:agregado', w);
    CL.emit('circuito:cambio');
    return w;
  };

  /* ---- dobleces de los cables ---- */
  S.puntosDe = function (id) {
    var w = S.wire(id);
    if (!w) return [];
    if (!w.puntos) w.puntos = [];
    return w.puntos;
  };
  S.agregarDoblez = function (id, indice, x, y) {
    var w = S.wire(id);
    if (!w) return;
    S.push();
    if (!w.puntos) w.puntos = [];
    w.puntos.splice(indice, 0, { x: Math.round(x), y: Math.round(y) });
    CL.emit('cable:cambio', w);
    S.marcarSucio();
  };
  S.moverDoblez = function (id, indice, x, y, sinHistorial) {
    var w = S.wire(id);
    if (!w || !w.puntos || !w.puntos[indice]) return;
    if (!sinHistorial) S.push();
    w.puntos[indice] = { x: Math.round(x), y: Math.round(y) };
    CL.emit('cable:cambio', w);
  };
  /** Cambia uno de los extremos del cable a otro pin o agujero. */
  S.recablear = function (id, extremo, ref) {
    var w = S.wire(id);
    if (!w || !ref) return false;
    var otro = extremo === 'a' ? w.b : w.a;
    if (otro.comp === ref.comp && otro.pin === ref.pin) return false;   // no puede unirse a sí mismo
    S.push();
    w[extremo] = { comp: ref.comp, pin: ref.pin };
    CL.emit('cable:cambio', w);
    CL.emit('circuito:cambio');
    S.marcarSucio();
    return true;
  };

  S.quitarDoblez = function (id, indice) {
    var w = S.wire(id);
    if (!w || !w.puntos || !w.puntos.length) return;
    S.push();
    w.puntos.splice(indice, 1);
    CL.emit('cable:cambio', w);
    S.marcarSucio();
  };

  S.desconectar = function (ids) {
    if (!Array.isArray(ids)) ids = [ids];
    S.push();
    S.proj.wires = S.proj.wires.filter(function (w) { return ids.indexOf(w.id) < 0; });
    S.sel = S.sel.filter(function (id) { return ids.indexOf(id) < 0; });
    CL.emit('proyecto:redibujar');
    CL.emit('circuito:cambio');
  };

  S.colorCable = function (ids, color) {
    if (!Array.isArray(ids)) ids = [ids];
    S.push();
    ids.forEach(function (id) { var w = S.wire(id); if (w) w.color = color; });
    CL.emit('proyecto:redibujar');
  };

  /* ---------------- Selección ---------------- */
  S.seleccionar = function (ids, aditivo) {
    if (!Array.isArray(ids)) ids = ids ? [ids] : [];
    if (aditivo) {
      ids.forEach(function (id) {
        var i = S.sel.indexOf(id);
        if (i < 0) S.sel.push(id); else S.sel.splice(i, 1);
      });
    } else {
      S.sel = ids.slice();
    }
    CL.emit('seleccion:cambio', S.sel);
  };
  S.limpiarSeleccion = function () { S.sel = []; CL.emit('seleccion:cambio', S.sel); };
  S.estaSel = function (id) { return S.sel.indexOf(id) >= 0; };

  /* ---------------- Código ---------------- */
  S.setCodigo = function (txt, sinHistorial) {
    if (!sinHistorial) S.push();
    S.proj.code = txt;
    CL.emit('codigo:cambio', txt);
  };

  /* ---------------- Consultas útiles para validación ---------------- */
  /** Devuelve todos los cables conectados a un pin concreto. */
  S.cablesDe = function (compId, pin) {
    return S.proj.wires.filter(function (w) {
      return (w.a.comp === compId && (pin === undefined || w.a.pin === pin)) ||
             (w.b.comp === compId && (pin === undefined || w.b.pin === pin));
    });
  };

  S.nuevo('Proyecto sin título', true);

}(window.CL));
