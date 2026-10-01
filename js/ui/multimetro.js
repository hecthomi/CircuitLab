/* ============================================================
   CircuitLab — multímetro de puntas
   Dos puntas (roja y negra) que se arrastran a cualquier pin o
   agujero. El truco pedagógico: si las dos puntas caen sobre los
   dos extremos del MISMO componente, además de la tensión se
   muestra la corriente y la resistencia, que es justo lo que un
   estudiante necesita para comprobar la ley de Ohm a mano.

   Se activa con el botón 🔎 de los controles del lienzo.
   ============================================================ */
(function (CL) {
  'use strict';

  var M = {};
  CL.multimetro = M;

  var encendido = false;
  var puntas = {
    roja:  { x: -60, y: 80, comp: null, pin: null, color: '#ef4444' },
    negra: { x: 60,  y: 80, comp: null, pin: null, color: '#334155' }
  };
  var arrastrando = null;
  var capa = null, caja = null;

  M.activo = function () { return encendido; };

  /* ------------------------------------------------------------
     Encendido / apagado
     ------------------------------------------------------------ */
  M.alternar = function (v) {
    encendido = v === undefined ? !encendido : !!v;
    document.body.classList.toggle('multi-on', encendido);
    CL.setPref('multimetro', encendido);
    var b = document.getElementById('tglMulti');
    if (b) b.classList.toggle('on', encendido);
    if (encendido) {
      // las puntas aparecen en el centro de lo que se esté viendo
      var svg = document.getElementById('stage');
      var r = svg ? svg.getBoundingClientRect() : null;
      var v0 = r ? CL.aMundo(r.left + r.width / 2, r.top + r.height / 2) : { x: 0, y: 0 };
      if (!puntas.roja.comp && !puntas.negra.comp) {
        puntas.roja.x = v0.x - 40; puntas.roja.y = v0.y + 60;
        puntas.negra.x = v0.x + 40; puntas.negra.y = v0.y + 60;
      }
      CL.toast('info', 'Multímetro encendido',
        'Arrastra las puntas a dos puntos del circuito. Si las pones en los dos extremos del mismo componente verás también corriente y resistencia.');
    }
    pintar();
    medir();
  };

  /* ------------------------------------------------------------
     Posición de cada punta
     ------------------------------------------------------------ */
  function pos(p) {
    if (p.comp) {
      var abs = CL.posPin(CL.state.comp(p.comp) || {}, p.pin);
      if (abs) return abs;
      p.comp = null; p.pin = null;                 // el componente ya no existe
    }
    return { x: p.x, y: p.y };
  }

  /** ¿Hay una punta bajo estas coordenadas del mundo? */
  M.puntaEn = function (x, y) {
    if (!encendido) return null;
    var mejor = null, md = 11;
    ['roja', 'negra'].forEach(function (k) {
      var q = pos(puntas[k]);
      var d = CL.dist(x, y, q.x, q.y);
      if (d < md) { md = d; mejor = k; }
    });
    return mejor;
  };

  M.empezarArrastre = function (cual) { arrastrando = cual; };
  M.arrastrar = function (x, y) {
    if (!arrastrando) return false;
    var p = puntas[arrastrando];
    var destino = CL.ws.pinVisibleEn(x, y);
    if (destino) { p.comp = destino.comp; p.pin = destino.pin; }
    else { p.comp = null; p.pin = null; p.x = x; p.y = y; }
    pintar(); medir();
    return true;
  };
  M.soltar = function () {
    if (!arrastrando) return false;
    arrastrando = null;
    CL.sfx.click();
    return true;
  };

  /* ------------------------------------------------------------
     Dibujo de las puntas
     ------------------------------------------------------------ */
  function pintar() {
    capa = document.getElementById('layOverlay');
    if (!capa) return;
    CL.$$('#layOverlay .mm-punta').forEach(function (n) { n.remove(); });
    if (!encendido) return;
    ['negra', 'roja'].forEach(function (k) {
      var p = puntas[k], q = pos(p);
      var g = CL.svg('g', { class: 'mm-punta', 'data-punta': k });
      // cable colgando hacia abajo, para que se vea de dónde viene
      g.appendChild(CL.svg('path', {
        d: 'M' + q.x + ' ' + q.y + ' q' + (k === 'roja' ? -18 : 18) + ' 26 ' + (k === 'roja' ? -6 : 6) + ' 52',
        stroke: p.color, 'stroke-width': 2.6, fill: 'none', 'stroke-linecap': 'round', opacity: '.85'
      }));
      g.appendChild(CL.svg('circle', { class: 'mm-hit', cx: q.x, cy: q.y, r: 11 }));
      g.appendChild(CL.svg('path', {
        d: 'M' + q.x + ' ' + (q.y + 12) + ' L' + q.x + ' ' + q.y,
        stroke: p.color, 'stroke-width': 4.2, 'stroke-linecap': 'round'
      }));
      g.appendChild(CL.svg('circle', { cx: q.x, cy: q.y, r: 3, fill: '#f8fafc', stroke: p.color, 'stroke-width': 1.6 }));
      capa.appendChild(g);
    });
  }
  M.pintar = pintar;

  /* ------------------------------------------------------------
     Medición
     ------------------------------------------------------------ */
  function tension(p) {
    if (!p.comp) return null;
    return CL.circuito.tension(p.comp, p.pin);
  }

  /** Si las dos puntas están en el mismo componente, se puede dar I y R. */
  function mismoComponente() {
    var a = puntas.roja, b = puntas.negra;
    if (!a.comp || !b.comp || a.comp !== b.comp || a.pin === b.pin) return null;
    var res = CL.circuito.resultado;
    if (!res) return null;
    var pc = res.porComp[a.comp];
    if (!pc || !pc.els || !pc.els.length) return null;
    for (var i = 0; i < pc.els.length; i++) {
      var e = pc.els[i];
      if ((e.p === a.pin && e.n === b.pin) || (e.p === b.pin && e.n === a.pin)) {
        var signo = (e.p === a.pin) ? 1 : -1;
        return { i: (e._i || 0) * signo, dv: (e._dv || 0) * signo, r: e.r };
      }
    }
    return null;
  }

  function medir() {
    caja = document.getElementById('multiOut');
    if (!caja) return;
    if (!encendido) { caja.hidden = true; return; }
    caja.hidden = false;

    var vr = tension(puntas.roja), vn = tension(puntas.negra);
    var h = '';
    if (vr === null && vn === null) {
      h = '<div class="mm-vacio">Arrastra las puntas a un pin o a un agujero de la protoboard.</div>';
    } else {
      var dv = (vr === null ? 0 : vr) - (vn === null ? 0 : vn);
      h += '<div class="mm-fila principal"><span>V</span><b>' + CL.fmtV(dv) + '</b></div>';
      var comp = mismoComponente();
      if (comp) {
        h += '<div class="mm-fila"><span>I</span><b>' + CL.fmtA(Math.abs(comp.i)) + '</b></div>';
        var rMed = Math.abs(comp.i) > 1e-9 ? Math.abs(comp.dv / comp.i) : null;
        h += '<div class="mm-fila"><span>R</span><b>' + (rMed !== null && rMed < 1e7 ? CL.fmtOhm(rMed) : '∞') + '</b></div>';
        h += '<div class="mm-fila"><span>P</span><b>' + CL.fmtW(Math.abs(comp.dv * comp.i)) + '</b></div>';
      } else {
        h += '<div class="mm-fila"><span>roja</span><b>' + (vr === null ? '—' : CL.fmtV(vr)) + '</b></div>';
        h += '<div class="mm-fila"><span>negra</span><b>' + (vn === null ? '—' : CL.fmtV(vn)) + '</b></div>';
      }
      if (comp) h += '<div class="mm-nota">Ley de Ohm: V = I × R</div>';
      else if (vr !== null && vn !== null) h += '<div class="mm-nota">Pon las dos puntas en el mismo componente para ver I y R.</div>';
    }
    caja.innerHTML = '<div class="mm-cab">🔎 Multímetro<button id="mmOff" title="Apagar">✕</button></div>' + h;
    var off = caja.querySelector('#mmOff');
    if (off) off.addEventListener('click', function () { M.alternar(false); });
  }

  /* ------------------------------------------------------------
     Arranque
     ------------------------------------------------------------ */
  M.iniciar = function () {
    var b = document.getElementById('tglMulti');
    if (b) b.addEventListener('click', function () { M.alternar(); });
    CL.on('sim:tick', function () { if (encendido) medir(); });
    CL.on('vista:cambio', function () { if (encendido) pintar(); });
    CL.on('circuito:cambio', function () { if (encendido) { pintar(); medir(); } });
    if (CL.pref('multimetro', false)) M.alternar(true);
  };

}(window.CL));
