/* ============================================================
   CircuitLab — motor del circuito
   1) Calcula los nodos eléctricos (qué está unido con qué).
   2) Reúne el modelo de cada componente y resuelve el sistema.
   3) Reparte corrientes por los cables y actualiza el estado visual.
   ============================================================ */
(function (CL) {
  'use strict';

  var E = CL.ELEC;

  var M = {
    /* contexto compartido con el intérprete y la interfaz */
    ctx: {
      pines: {},        // {compId: {pinId: {modo, valor}}}
      estados: {},      // interacción del usuario (pulsadores, interruptores)
      microbit: {},     // {compId: {matriz, botonA, botonB}}
      servoAngulo: {},  // {compId: grados}
      ejecutando: false
    },
    nets: [],           // [{pins:[pinKey], idx, tierra:bool}]
    netDe: {},          // pinKey -> índice de net
    resultado: null,
    _estados: {},       // estado visual anterior por componente
    _dirty: true
  };
  CL.circuito = M;

  function key(compId, pinId) { return compId + ':' + pinId; }
  M.key = key;

  /* ============================================================
     1. NODOS ELÉCTRICOS
     ============================================================ */
  M.reconstruir = function () {
    var proj = CL.state.proj, uf = new CL.UF(), i, j;
    var comps = proj.components;

    // pines de todos los componentes
    comps.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (!def) return;
      def.pins.forEach(function (p) { uf.add(key(c.id, p.id)); });
      // conexiones internas declaradas (columnas de la protoboard, GND de la placa…)
      (def.grupos || []).forEach(function (g) {
        for (var k = 1; k < g.length; k++) uf.union(key(c.id, g[0]), key(c.id, g[k]));
      });
    });

    // mapa de agujeros de las protoboards por coordenada absoluta
    var mapaHoyos = {};
    comps.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (!def || !def.esProto) return;
      def.pins.forEach(function (p) {
        var r = CL.rotComp(c, p.x, p.y);
        mapaHoyos[Math.round(c.x + r.x) + '|' + Math.round(c.y + r.y)] = key(c.id, p.id);
      });
    });

    // componentes insertados en la protoboard
    comps.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (!def || def.esProto) return;
      def.pins.forEach(function (p) {
        var r = CL.rotComp(c, p.x, p.y);
        var ax = Math.round(c.x + r.x), ay = Math.round(c.y + r.y);
        for (var dx = -1; dx <= 1; dx++) {
          for (var dy = -1; dy <= 1; dy++) {
            var h = mapaHoyos[(ax + dx) + '|' + (ay + dy)];
            if (h) { uf.union(h, key(c.id, p.id)); return; }
          }
        }
      });
    });

    // cables
    proj.wires.forEach(function (w) {
      uf.union(key(w.a.comp, w.a.pin), key(w.b.comp, w.b.pin));
    });

    // agrupa por raíz
    var porRaiz = {}, nets = [], netDe = {};
    for (var pk in uf.p) {
      var r = uf.find(pk);
      if (!porRaiz[r]) { porRaiz[r] = { pins: [], idx: nets.length, tierra: false }; nets.push(porRaiz[r]); }
      porRaiz[r].pins.push(pk);
      netDe[pk] = porRaiz[r].idx;
    }
    M.nets = nets;
    M.netDe = netDe;
    M._dirty = false;
    return nets;
  };

  M.netDePin = function (compId, pinId) {
    var k = key(compId, pinId);
    if (M._dirty) M.reconstruir();
    return M.netDe[k] === undefined ? -1 : M.netDe[k];
  };
  M.marcarSucio = function () { M._dirty = true; };

  /* ============================================================
     2. RESOLUCIÓN
     ============================================================ */
  function reunirElementos() {
    var els = [];
    CL.state.proj.components.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (!def || !def.modelo) return;
      var lista = def.modelo(c, M.ctx) || [];
      lista.forEach(function (e) {
        var el = Object.assign({}, e);
        el.comp = c.id;
        el.tipoComp = c.type;
        els.push(el);
      });
    });
    return els;
  }

  M.resolver = function (dt) {
    dt = dt || 0.016;
    if (M._dirty) M.reconstruir();

    var nets = M.nets, netDe = M.netDe;
    var els = reunirElementos();
    var i, e;

    /* --- tierra: todas las nets con un elemento gnd son el nodo 0 --- */
    var esTierra = {};
    var hayTierra = false;
    for (i = 0; i < els.length; i++) {
      e = els[i];
      if (e.t === 'gnd') {
        var n = netDe[key(e.comp, e.p)];
        if (n !== undefined) { esTierra[n] = true; hayTierra = true; }
      }
    }
    if (!hayTierra) {
      // sin GND explícito: se usa el borne negativo de la primera fuente
      for (i = 0; i < els.length; i++) {
        e = els[i];
        if ((e.t === 'v') && e.n !== undefined) {
          var nn = netDe[key(e.comp, e.n)];
          if (nn !== undefined) { esTierra[nn] = true; hayTierra = true; break; }
        }
      }
    }

    /* --- índices de nodo (los de tierra valen -1) --- */
    var idx = {}, libres = 0;
    for (i = 0; i < nets.length; i++) idx[i] = esTierra[i] ? -1 : (libres++);
    function nodo(compId, pinId) {
      var nn = netDe[key(compId, pinId)];
      return nn === undefined ? -1 : idx[nn];
    }

    /* --- estados no lineales (LED encendido/apagado, sensor alimentado) --- */
    var estados = M._nl || {};
    var V = [], sis = null, iter, cambio;

    for (iter = 0; iter < 24; iter++) {
      sis = new CL.Sistema(libres);
      for (i = 0; i < els.length; i++) {
        e = els[i];
        var a, b;
        switch (e.t) {
          case 'r':
            a = nodo(e.comp, e.p); b = nodo(e.comp, e.n);
            sis.cond(a, b, 1 / Math.max(e.r, 1e-4));
            break;
          case 'sw':
            a = nodo(e.comp, e.p); b = nodo(e.comp, e.n);
            sis.cond(a, b, 1 / (e.cerrado ? E.R_CERRADO : E.R_ABIERTO));
            break;
          case 'v':
            a = nodo(e.comp, e.p); b = nodo(e.comp, e.n);
            sis.fuente(a, b, e.v, e.rser || 0.05);
            break;
          case 'vcc':
            a = nodo(e.comp, e.p);
            sis.fuente(a, -1, e.v, e.rser || 0.05);
            break;
          case 'vsens':
            a = nodo(e.comp, e.p); b = nodo(e.comp, e.n);
            var alimentado = estados['s' + i] !== false;
            if (alimentado) sis.fuente(a, b, e.v, e.rser || 500);
            else sis.cond(a, b, 1 / 1e8);
            break;
          case 'swc':
            // interruptor gobernado por la tensión de otro par de pines
            // (contactos de un relé, medio puente de un driver de motor)
            a = nodo(e.comp, e.p); b = nodo(e.comp, e.n);
            sis.cond(a, b, 1 / (estados['c' + i] ? E.R_CERRADO : E.R_ABIERTO));
            break;
          case 'rc':
            // resistencia gobernada: transistor entre corte y saturación
            a = nodo(e.comp, e.p); b = nodo(e.comp, e.n);
            sis.cond(a, b, 1 / Math.max(estados['q' + i] ? (e.ron || 0.8) : (e.roff || 5e6), 1e-4));
            break;
          case 'led':
            a = nodo(e.comp, e.p); b = nodo(e.comp, e.n);
            if (estados['d' + i]) {
              // Va − Vk = Vf + I·rd  →  equivalente de Norton
              var g = 1 / Math.max(e.rd, 0.5);
              sis.cond(a, b, g);
              sis.corr(a, b, g * e.vf);
            } else {
              sis.cond(a, b, 1 / 1e9);
            }
            break;
          default: break;
        }
      }
      V = sis.resolver();

      /* --- comprobación de estados --- */
      cambio = false;
      function tension(compId, pinId) {
        var nd = nodo(compId, pinId);
        return nd < 0 ? 0 : (V[nd] || 0);
      }
      for (i = 0; i < els.length; i++) {
        e = els[i];
        if (e.t === 'led') {
          var vd = tension(e.comp, e.p) - tension(e.comp, e.n);
          var on = !!estados['d' + i];
          if (!on && vd > e.vf) { estados['d' + i] = true; cambio = true; }
          else if (on) {
            var idled = (vd - e.vf) / Math.max(e.rd, 0.5);
            if (idled < -1e-7) { estados['d' + i] = false; cambio = true; }
          }
        } else if (e.t === 'vsens') {
          var va = tension(e.comp, e.alim[0]) - tension(e.comp, e.alim[1]);
          var pw = va >= (e.vmin || 3);
          if ((estados['s' + i] !== false) !== pw) { estados['s' + i] = pw; cambio = true; }
        } else if (e.t === 'swc') {
          // histéresis: pega a vmin y suelta a un 60 % (como una bobina real)
          var vc = tension(e.comp, e.ctrl[0]) - tension(e.comp, e.ctrl[1]);
          var umbral = e.vmin === undefined ? 3 : e.vmin;
          var yaC = !!estados['c' + i];
          var act = yaC ? (Math.abs(vc) >= umbral * 0.6) : (Math.abs(vc) >= umbral);
          if (e.invertido) act = !act;
          if (act && e.ctrl2) {
            var v2 = tension(e.comp, e.ctrl2[0]) - tension(e.comp, e.ctrl2[1]);
            if (Math.abs(v2) < (e.vmin2 === undefined ? umbral : e.vmin2)) act = false;
          }
          if (yaC !== act) { estados['c' + i] = act; cambio = true; }
        } else if (e.t === 'rc') {
          var vq = tension(e.comp, e.ctrl[0]) - tension(e.comp, e.ctrl[1]);
          var yaQ = !!estados['q' + i];
          var von = e.von === undefined ? 0.62 : e.von;
          var cond = yaQ ? (vq >= von * 0.9) : (vq >= von);
          if (yaQ !== cond) { estados['q' + i] = cond; cambio = true; }
        }
      }
      if (!cambio) break;
    }
    M._nl = estados;

    /* --- corrientes por elemento y por pin --- */
    function tensionFinal(compId, pinId) {
      var nd = nodo(compId, pinId);
      return nd < 0 ? 0 : (V[nd] || 0);
    }
    var inj = {};                      // corriente que entra a la net por cada pin
    function inyectar(compId, pinId, amp) {
      var k = key(compId, pinId);
      inj[k] = (inj[k] || 0) + amp;
    }
    var fuentes = [], porComp = {};

    for (i = 0; i < els.length; i++) {
      e = els[i];
      var vp = 0, vn = 0, I = 0, g;
      if (e.t === 'gnd') continue;
      if (e.t === 'vcc') {
        vp = tensionFinal(e.comp, e.p);
        g = 1 / (e.rser || 0.05);
        I = g * (e.v - vp);                       // corriente que entrega la fuente
        inyectar(e.comp, e.p, I);
        fuentes.push({ comp: e.comp, i: I, imax: e.imax || 2, v: e.v, rol: e.rol || 'vcc' });
        e._i = I;
        continue;
      }
      vp = tensionFinal(e.comp, e.p);
      vn = tensionFinal(e.comp, e.n);
      var dv = vp - vn;
      switch (e.t) {
        case 'r':   I = dv / Math.max(e.r, 1e-4); break;
        case 'sw':  I = dv / (e.cerrado ? E.R_CERRADO : E.R_ABIERTO); break;
        case 'v':   g = 1 / (e.rser || 0.05); I = g * (e.v - dv); break;
        case 'vsens':
          if (estados['s' + i] !== false) { g = 1 / (e.rser || 500); I = g * (e.v - dv); }
          else I = 0;
          break;
        case 'swc': I = dv / (estados['c' + i] ? E.R_CERRADO : E.R_ABIERTO); break;
        case 'rc':  I = dv / Math.max(estados['q' + i] ? (e.ron || 0.8) : (e.roff || 5e6), 1e-4); break;
        case 'led': I = estados['d' + i] ? (dv - e.vf) / Math.max(e.rd, 0.5) : dv / 1e9; break;
      }
      e._i = I;
      e._dv = dv;
      if (e.t === 'v' || e.t === 'vsens') {
        // la fuente entrega corriente por su borne + hacia el circuito
        inyectar(e.comp, e.p, I);
        inyectar(e.comp, e.n, -I);
        if (e.t === 'v') fuentes.push({ comp: e.comp, i: I, imax: e.imax || 2, v: e.v, rol: e.rol || 'fuente', pin: e.pin });
      } else {
        inyectar(e.comp, e.p, -I);
        inyectar(e.comp, e.n, I);
      }
      // primer elemento "principal" de cada componente
      var pc = porComp[e.comp] || (porComp[e.comp] = { corriente: 0, caida: 0, vp: {}, r: 0, els: [] });
      pc.els.push(e);
      if (pc.els.length === 1) { pc.corriente = I; pc.caida = dv; pc.r = e.r || 0; }
    }

    /* --- tensiones de cada pin de cada componente --- */
    CL.state.proj.components.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (!def) return;
      var pc = porComp[c.id] || (porComp[c.id] = { corriente: 0, caida: 0, vp: {}, r: 0, els: [] });
      def.pins.forEach(function (p) { pc.vp[p.id] = tensionFinal(c.id, p.id); });
    });

    /* --- corriente por cada cable (flujo sobre el árbol de la net) --- */
    var corrCable = repartirPorCables(inj);

    /* --- estado visual de cada componente --- */
    var estadosComp = {};
    CL.state.proj.components.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (!def) return;
      var pc = porComp[c.id] || { corriente: 0, caida: 0, vp: {}, r: 0 };
      var base = Object.assign({}, M.ctx.estados[c.id] || {});
      var st = def.medir ? def.medir(c, pc, dt, M._estados[c.id], M.ctx) : {};
      estadosComp[c.id] = Object.assign(base, st, { _e: pc });
    });
    M._estados = estadosComp;

    /* --- tensiones por net (para resaltar y depurar) --- */
    var vNet = [];
    for (i = 0; i < nets.length; i++) vNet[i] = idx[i] < 0 ? 0 : (V[idx[i]] || 0);

    M.resultado = {
      V: V, vNet: vNet, nets: nets, comps: estadosComp, elementos: els,
      fuentes: fuentes, cables: corrCable, hayTierra: hayTierra, porComp: porComp,
      inj: inj, iteraciones: iter
    };
    return M.resultado;
  };

  /* ------------------------------------------------------------
     Reparto de corriente por los cables: se construye un árbol de
     conexiones dentro de cada net y se propaga la corriente de los
     pines hacia la raíz. Es exacto cuando no hay lazos redundantes.
     ------------------------------------------------------------ */
  function repartirPorCables(inj) {
    var res = {};
    var proj = CL.state.proj;
    // adyacencia dentro de cada net
    var ady = {}, aristas = [];
    function link(a, b, wireId) {
      (ady[a] = ady[a] || []).push({ o: b, w: wireId, dir: 1 });
      (ady[b] = ady[b] || []).push({ o: a, w: wireId, dir: -1 });
      aristas.push({ a: a, b: b, w: wireId });
    }
    proj.components.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (!def) return;
      (def.grupos || []).forEach(function (g) {
        for (var k = 1; k < g.length; k++) link(key(c.id, g[0]), key(c.id, g[k]), null);
      });
    });
    // pines insertados en la protoboard: se enlazan igual que un cable interno
    var mapaHoyos = {};
    proj.components.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (!def || !def.esProto) return;
      def.pins.forEach(function (p) {
        var r = CL.rotComp(c, p.x, p.y);
        mapaHoyos[Math.round(c.x + r.x) + '|' + Math.round(c.y + r.y)] = key(c.id, p.id);
      });
    });
    proj.components.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (!def || def.esProto) return;
      def.pins.forEach(function (p) {
        var r = CL.rotComp(c, p.x, p.y);
        var ax = Math.round(c.x + r.x), ay = Math.round(c.y + r.y);
        for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
          var h = mapaHoyos[(ax + dx) + '|' + (ay + dy)];
          if (h) { link(h, key(c.id, p.id), null); return; }
        }
      });
    });
    proj.wires.forEach(function (w) { link(key(w.a.comp, w.a.pin), key(w.b.comp, w.b.pin), w.id); });

    // recorrido en profundidad por componentes conexos
    var visto = {}, orden = [], padre = {}, aristaPadre = {};
    Object.keys(ady).forEach(function (raiz) {
      if (visto[raiz]) return;
      var pila = [raiz];
      visto[raiz] = true; padre[raiz] = null;
      while (pila.length) {
        var u = pila.pop();
        orden.push(u);
        (ady[u] || []).forEach(function (ar) {
          if (visto[ar.o]) return;
          visto[ar.o] = true;
          padre[ar.o] = u;
          aristaPadre[ar.o] = ar;
          pila.push(ar.o);
        });
      }
    });
    // suma de corrientes por subárbol (de las hojas hacia la raíz)
    var suma = {};
    for (var i = orden.length - 1; i >= 0; i--) {
      var u = orden[i];
      suma[u] = (suma[u] || 0) + (inj[u] || 0);
      var p = padre[u];
      if (p) {
        suma[p] = (suma[p] || 0) + suma[u];
        var ar = aristaPadre[u];
        if (ar && ar.w) {
          // corriente que va del hijo al padre
          res[ar.w] = (ar.dir === 1 ? -1 : 1) * suma[u];
        }
      }
    }
    return res;
  }

  /* ============================================================
     3. Consultas para el resto de la aplicación
     ============================================================ */
  M.tension = function (compId, pinId) {
    if (!M.resultado) return 0;
    var n = M.netDe[key(compId, pinId)];
    return n === undefined ? 0 : (M.resultado.vNet[n] || 0);
  };
  M.estado = function (compId) { return (M.resultado && M.resultado.comps[compId]) || {}; };
  M.pinsDeNet = function (netIdx) { return (M.nets[netIdx] && M.nets[netIdx].pins) || []; };

  /** ¿Este pin está conectado a algo más? */
  M.conectado = function (compId, pinId) {
    var n = M.netDePin(compId, pinId);
    if (n < 0) return false;
    var pins = M.nets[n].pins;
    for (var i = 0; i < pins.length; i++) if (pins[i].split(':')[0] !== compId) return true;
    return pins.length > 1;
  };

  CL.on('circuito:cambio', function () { M.marcarSucio(); });
  CL.on('proyecto:cargado', function () { M.marcarSucio(); M._nl = {}; M._estados = {}; });

}(window.CL));
