/* ============================================================
   CircuitLab — selección de elementos del lienzo
   ============================================================ */
(function (CL) {
  'use strict';

  var S = {};
  CL.sel = S;

  S.aplicarClases = function () {
    CL.$$('#layComps .comp').forEach(function (g) {
      g.classList.toggle('sel', CL.state.estaSel(g.dataset.id));
    });
    CL.$$('#layWires .wire').forEach(function (w) {
      w.classList.toggle('sel', CL.state.estaSel(w.dataset.id));
    });
    S.barra();
  };

  /** Enciende o apaga las acciones de la barra de herramientas según lo que
      haya seleccionado: rotar y duplicar solo valen para componentes y el
      color solo para cables. Se desactivan en vez de esconderse para que los
      botones no bailen de sitio. */
  S.barra = function () {
    var hayComp = false, hayCable = false;
    CL.state.sel.forEach(function (id) {
      if (CL.state.comp(id)) hayComp = true;
      else if (CL.state.wire(id)) hayCable = true;
    });
    function activar(id, cond) {
      var b = document.getElementById(id);
      if (b) b.disabled = !cond;
    }
    activar('btnRotar', hayComp);
    activar('btnVoltearH', hayComp);
    activar('btnVoltearV', hayComp);
    activar('btnDuplicar', hayComp);
    activar('btnColorCable', hayCable);
    activar('btnEliminar', hayComp || hayCable);
  };
  /** Ids de los componentes cuyo centro cae dentro del rectángulo. */
  S.enRect = function (x1, y1, x2, y2) {
    var ax = Math.min(x1, x2), bx = Math.max(x1, x2);
    var ay = Math.min(y1, y2), by = Math.max(y1, y2);
    var ids = [];
    CL.state.proj.components.forEach(function (c) {
      if (c.x >= ax && c.x <= bx && c.y >= ay && c.y <= by) ids.push(c.id);
    });
    CL.state.proj.wires.forEach(function (w) {
      var pa = CL.posPinDe(w.a), pb = CL.posPinDe(w.b);
      if (!pa || !pb) return;
      var mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
      if (mx >= ax && mx <= bx && my >= ay && my <= by) ids.push(w.id);
    });
    return ids;
  };

  S.todo = function () {
    var ids = CL.state.proj.components.map(function (c) { return c.id; })
      .concat(CL.state.proj.wires.map(function (w) { return w.id; }));
    CL.state.seleccionar(ids);
  };

  CL.on('seleccion:cambio', function () { S.aplicarClases(); });

}(window.CL));
