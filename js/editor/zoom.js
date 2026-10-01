/* ============================================================
   CircuitLab — vista: desplazamiento, zoom y conversión de
   coordenadas entre la pantalla y el "mundo" del circuito.
   ============================================================ */
(function (CL) {
  'use strict';

  var vista = { x: 0, y: 0, k: 1, min: 0.25, max: 3.5 };
  CL.vista = vista;

  var svg, vp;

  CL.vistaInit = function () {
    svg = document.getElementById('stage');
    vp = document.getElementById('viewport');
    aplicar();
  };

  function aplicar() {
    if (!vp) return;
    vp.setAttribute('transform', 'translate(' + vista.x + ' ' + vista.y + ') scale(' + vista.k + ')');
    CL.emit('vista:cambio', vista);
  }
  CL.aplicarVista = aplicar;

  /** Pantalla (clientX/clientY) → coordenadas del circuito. */
  CL.aMundo = function (cx, cy) {
    var r = svg.getBoundingClientRect();
    return { x: (cx - r.left - vista.x) / vista.k, y: (cy - r.top - vista.y) / vista.k };
  };
  /** Coordenadas del circuito → pantalla. */
  CL.aPantalla = function (wx, wy) {
    var r = svg.getBoundingClientRect();
    return { x: wx * vista.k + vista.x + r.left, y: wy * vista.k + vista.y + r.top };
  };

  CL.zoomEn = function (factor, cx, cy) {
    var r = svg.getBoundingClientRect();
    if (cx === undefined) { cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
    var antes = CL.aMundo(cx, cy);
    vista.k = CL.clamp(vista.k * factor, vista.min, vista.max);
    var despues = CL.aMundo(cx, cy);
    vista.x += (despues.x - antes.x) * vista.k;
    vista.y += (despues.y - antes.y) * vista.k;
    aplicar();
  };

  CL.mover = function (dx, dy) { vista.x += dx; vista.y += dy; aplicar(); };

  CL.ajustarVista = function (animado) {
    var comps = CL.state.proj.components;
    var r = svg.getBoundingClientRect();
    if (!comps.length) {
      vista.k = 1; vista.x = r.width / 2; vista.y = r.height / 2;
      aplicar(); return;
    }
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    comps.forEach(function (c) {
      var d = CL.catalogo[c.type];
      if (!d) return;
      var s = d.size, esq = [
        CL.rotComp(c, s.x, s.y), CL.rotComp(c, s.x + s.w, s.y),
        CL.rotComp(c, s.x, s.y + s.h), CL.rotComp(c, s.x + s.w, s.y + s.h)
      ];
      esq.forEach(function (p) {
        x1 = Math.min(x1, c.x + p.x); y1 = Math.min(y1, c.y + p.y);
        x2 = Math.max(x2, c.x + p.x); y2 = Math.max(y2, c.y + p.y);
      });
    });
    var mw = x2 - x1 + 90, mh = y2 - y1 + 90;
    var k = Math.min(r.width / mw, r.height / mh, 2);
    vista.k = CL.clamp(k, vista.min, vista.max);
    vista.x = r.width / 2 - ((x1 + x2) / 2) * vista.k;
    vista.y = r.height / 2 - ((y1 + y2) / 2) * vista.k;
    aplicar();
  };

  CL.centrarEn = function (wx, wy) {
    var r = svg.getBoundingClientRect();
    vista.x = r.width / 2 - wx * vista.k;
    vista.y = r.height / 2 - wy * vista.k;
    aplicar();
  };

  CL.guardarVista = function () {
    CL.state.proj.view = { x: vista.x, y: vista.y, k: vista.k };
  };
  CL.restaurarVista = function (v) {
    if (!v) return;
    vista.x = v.x || 0; vista.y = v.y || 0; vista.k = v.k || 1;
    aplicar();
  };

}(window.CL));
