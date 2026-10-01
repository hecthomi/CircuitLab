/* ============================================================
   CircuitLab — utilidades base (sin dependencias externas)
   Todo el proyecto cuelga del espacio de nombres global CL.
   ============================================================ */
window.CL = window.CL || {};

(function (CL) {
  'use strict';

  /* ---------------- DOM ---------------- */
  CL.$  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  CL.$$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  CL.el = function (tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'dataset') { for (var d in attrs[k]) n.dataset[d] = attrs[k][d]; }
      else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    }
    if (html !== undefined && html !== null) n.innerHTML = html;
    return n;
  };

  var SVGNS = 'http://www.w3.org/2000/svg';
  CL.SVGNS = SVGNS;
  CL.svg = function (tag, attrs, text) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] === null || attrs[k] === undefined) continue;
      n.setAttribute(k, attrs[k]);
    }
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  };
  /** Crea nodos SVG a partir de una cadena de marcado. Devuelve un <g>. */
  CL.svgFrag = function (markup) {
    var wrap = document.createElementNS(SVGNS, 'g');
    var doc = new DOMParser().parseFromString('<svg xmlns="' + SVGNS + '">' + markup + '</svg>', 'image/svg+xml');
    var kids = doc.documentElement.childNodes;
    for (var i = 0; i < kids.length; i++) wrap.appendChild(document.importNode(kids[i], true));
    return wrap;
  };
  CL.clear = function (node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; };

  /* ---------------- Texto seguro ---------------- */
  CL.esc = function (s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* ---------------- Identificadores ---------------- */
  var _seq = 0;
  CL.uid = function (pre) {
    _seq++;
    return (pre || 'id') + '_' + Date.now().toString(36).slice(-5) + _seq.toString(36);
  };

  /* ---------------- Matemáticas / formato ---------------- */
  CL.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  CL.round = function (v, d) { var f = Math.pow(10, d === undefined ? 2 : d); return Math.round(v * f) / f; };
  CL.map = function (v, a1, b1, a2, b2) { return (v - a1) * (b2 - a2) / (b1 - a1) + a2; };

  CL.fmtV = function (v) {
    if (!isFinite(v)) return '—';
    if (Math.abs(v) < 0.01) return '0 V';
    return CL.round(v, 2) + ' V';
  };
  CL.fmtA = function (a) {
    if (!isFinite(a)) return '—';
    var x = Math.abs(a);
    if (x < 1e-6) return '0 A';
    if (x < 1e-3) return CL.round(a * 1e6, 1) + ' µA';
    if (x < 1) return CL.round(a * 1000, 1) + ' mA';
    return CL.round(a, 3) + ' A';
  };
  CL.fmtOhm = function (r) {
    if (r >= 1e6) return CL.round(r / 1e6, 2) + ' MΩ';
    if (r >= 1000) return CL.round(r / 1000, 2) + ' kΩ';
    return CL.round(r, 1) + ' Ω';
  };
  CL.fmtW = function (w) {
    if (w < 1e-3) return CL.round(w * 1e6, 0) + ' µW';
    if (w < 1) return CL.round(w * 1000, 1) + ' mW';
    return CL.round(w, 2) + ' W';
  };

  /* ---------------- Geometría ---------------- */
  /** Rota (x,y) alrededor del origen local por `deg` grados. */
  CL.rot = function (x, y, deg) {
    if (!deg) return { x: x, y: y };
    var r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return { x: x * c - y * s, y: x * s + y * c };
  };
  /* Volteo (espejo). Un componente guarda `flip` = espejo horizontal en sus
     coordenadas locales, aplicado ANTES del giro (SVG: rotate(rot) scale(-1 1)).
     El volteo vertical se expresa como espejo + 180°, así basta un solo flag. */
  /** Local → desplazamiento en el mundo (sin trasladar): espejo y luego giro. */
  CL.rotComp = function (c, x, y) {
    return CL.rot(c && c.flip ? -x : x, y, (c && c.rot) || 0);
  };
  /** Desplazamiento en el mundo (respecto a c.x, c.y) → coordenadas locales. */
  CL.invComp = function (c, dx, dy) {
    var r = CL.rot(dx, dy, -((c && c.rot) || 0));
    if (c && c.flip) r.x = -r.x;
    return r;
  };
  CL.dist = function (x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); };

  /* ---------------- Preferencias (localStorage con red de seguridad) ---------------- */
  var PREF = 'circuitlab:';
  CL.pref = function (key, def) {
    try {
      var raw = localStorage.getItem(PREF + key);
      return raw === null ? def : JSON.parse(raw);
    } catch (e) { return def; }
  };
  CL.setPref = function (key, val) {
    try { localStorage.setItem(PREF + key, JSON.stringify(val)); } catch (e) { /* modo privado */ }
  };
  CL.delPref = function (key) { try { localStorage.removeItem(PREF + key); } catch (e) {} };

  /* ---------------- Bus de eventos ---------------- */
  var handlers = {};
  CL.on = function (evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); return fn; };
  CL.off = function (evt, fn) {
    if (!handlers[evt]) return;
    handlers[evt] = handlers[evt].filter(function (f) { return f !== fn; });
  };
  CL.emit = function (evt, data) {
    var list = handlers[evt];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      try { list[i](data); } catch (e) { console.error('[CL] error en ' + evt, e); }
    }
  };

  /* ---------------- Temporización ---------------- */
  CL.debounce = function (fn, ms) {
    var t = null;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 120);
    };
  };
  CL.throttle = function (fn, ms) {
    var last = 0, t = null;
    return function () {
      var now = Date.now(), ctx = this, args = arguments;
      if (now - last >= (ms || 60)) { last = now; fn.apply(ctx, args); }
      else { clearTimeout(t); t = setTimeout(function () { last = Date.now(); fn.apply(ctx, args); }, ms - (now - last)); }
    };
  };

  /* ---------------- Copias ---------------- */
  CL.clone = function (o) {
    if (o === null || typeof o !== 'object') return o;
    if (Array.isArray(o)) return o.map(CL.clone);
    var r = {};
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = CL.clone(o[k]);
    return r;
  };

  /* ---------------- Descarga de archivos ---------------- */
  CL.download = function (nombre, texto, mime) {
    try {
      var blob = new Blob([texto], { type: mime || 'application/json;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = CL.el('a', { href: url, download: nombre });
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
      return true;
    } catch (e) { return false; }
  };

  /** Copia texto al portapapeles. navigator.clipboard solo existe en contexto
      seguro (https / localhost); en la red del aula (http) se usa el método
      clásico con un textarea oculto. Devuelve una promesa con true/false. */
  CL.copiarTexto = function (texto) {
    function clasico() {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      return ok;
    }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return clasico(); });
    }
    return Promise.resolve(clasico());
  };

  /* ---------------- Fechas ---------------- */
  CL.fecha = function (ts) {
    var d = new Date(ts || Date.now());
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  };
  CL.mmss = function (seg) {
    seg = Math.max(0, Math.round(seg));
    var m = Math.floor(seg / 60), s = seg % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  };

  /* ---------------- Sonido ----------------
     La síntesis vive en js/core/audio.js (CL.audio). Aquí solo
     quedan los atajos históricos para no tocar el resto del código.
     Se resuelven en el momento de la llamada porque util.js se
     carga antes que audio.js.                                    */
  function AU() { return CL.audio; }
  CL.beep = function (freq, ms, tipo, vol) {
    if (AU()) AU().tono({ f: freq || 660, ms: ms || 120, tipo: tipo, vol: vol });
  };
  CL.sfx = {};
  ['ok', 'bad', 'click', 'pop', 'win', 'clac', 'luz', 'chispa', 'ping',
   'detectar', 'muesca', 'encender', 'apagar', 'conectar'].forEach(function (n) {
    CL.sfx[n] = function (a, b) { var A = AU(); if (A && A.sfx[n]) A.sfx[n](a, b); };
  });

  /* ---------------- Colores ---------------- */
  CL.COLORS_CABLE = [
    { id: 'rojo',     hex: '#ef4444', uso: 'positivo (VCC)' },
    { id: 'negro',    hex: '#1f2937', uso: 'tierra (GND)' },
    { id: 'amarillo', hex: '#facc15', uso: 'señal' },
    { id: 'verde',    hex: '#22c55e', uso: 'señal' },
    { id: 'azul',     hex: '#3b82f6', uso: 'señal' },
    { id: 'blanco',   hex: '#e5e7eb', uso: 'señal' },
    { id: 'naranja',  hex: '#fb923c', uso: 'señal' },
    { id: 'morado',   hex: '#a855f7', uso: 'señal' }
  ];
  CL.colorCable = function (id) {
    for (var i = 0; i < CL.COLORS_CABLE.length; i++) if (CL.COLORS_CABLE[i].id === id) return CL.COLORS_CABLE[i].hex;
    return id && id.charAt(0) === '#' ? id : '#22c55e';
  };

}(window.CL));
