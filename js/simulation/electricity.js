/* ============================================================
   CircuitLab — núcleo numérico de la simulación eléctrica
   Análisis nodal (G·V = I) resuelto por eliminación gaussiana.
   Todas las fuentes se modelan con su equivalente de Norton, así
   que el sistema queda formado solo por conductancias y corrientes.
   ============================================================ */
(function (CL) {
  'use strict';

  var GMIN = 1e-9;          // conductancia mínima a tierra (estabilidad numérica)
  var R_ABIERTO = 1e9;      // interruptor abierto
  var R_CERRADO = 0.01;     // interruptor cerrado

  CL.ELEC = { GMIN: GMIN, R_ABIERTO: R_ABIERTO, R_CERRADO: R_CERRADO };

  /* ------------------------------------------------------------
     Sistema de ecuaciones
     ------------------------------------------------------------ */
  function Sistema(n) {
    this.n = n;
    this.G = [];
    this.I = new Array(n).fill(0);
    for (var i = 0; i < n; i++) this.G.push(new Array(n).fill(0));
    for (var k = 0; k < n; k++) this.G[k][k] = GMIN;      // fuga mínima a tierra
  }
  /** Conductancia entre dos nodos (índice -1 = tierra). */
  Sistema.prototype.cond = function (a, b, g) {
    if (!isFinite(g) || g <= 0) return;
    if (a >= 0) this.G[a][a] += g;
    if (b >= 0) this.G[b][b] += g;
    if (a >= 0 && b >= 0) { this.G[a][b] -= g; this.G[b][a] -= g; }
  };
  /** Corriente inyectada en `a` y extraída de `b`. */
  Sistema.prototype.corr = function (a, b, i) {
    if (!isFinite(i)) return;
    if (a >= 0) this.I[a] += i;
    if (b >= 0) this.I[b] -= i;
  };
  /** Fuente de tensión v con resistencia serie r entre a(+) y b(−). */
  Sistema.prototype.fuente = function (a, b, v, r) {
    var g = 1 / Math.max(r, 1e-4);
    this.cond(a, b, g);
    this.corr(a, b, g * v);
  };

  /** Resuelve el sistema. Devuelve un arreglo de tensiones o null. */
  Sistema.prototype.resolver = function () {
    var n = this.n, A = this.G, b = this.I.slice(), i, j, k;
    if (n === 0) return [];
    // copia de trabajo
    var M = [];
    for (i = 0; i < n; i++) M.push(A[i].slice());
    // eliminación gaussiana con pivoteo parcial
    for (k = 0; k < n; k++) {
      var piv = k, mx = Math.abs(M[k][k]);
      for (i = k + 1; i < n; i++) {
        var a = Math.abs(M[i][k]);
        if (a > mx) { mx = a; piv = i; }
      }
      if (mx < 1e-18) continue;                       // nodo aislado: se deja en 0
      if (piv !== k) {
        var t = M[k]; M[k] = M[piv]; M[piv] = t;
        var tb = b[k]; b[k] = b[piv]; b[piv] = tb;
      }
      var d = M[k][k];
      for (i = k + 1; i < n; i++) {
        var f = M[i][k] / d;
        if (f === 0) continue;
        for (j = k; j < n; j++) M[i][j] -= f * M[k][j];
        b[i] -= f * b[k];
      }
    }
    // sustitución hacia atrás
    var x = new Array(n).fill(0);
    for (i = n - 1; i >= 0; i--) {
      var s = b[i];
      for (j = i + 1; j < n; j++) s -= M[i][j] * x[j];
      x[i] = Math.abs(M[i][i]) < 1e-18 ? 0 : s / M[i][i];
      if (!isFinite(x[i])) x[i] = 0;
    }
    return x;
  };

  CL.Sistema = Sistema;

  /* ------------------------------------------------------------
     Conjuntos disjuntos (union-find) para calcular los nodos
     ------------------------------------------------------------ */
  function UF() { this.p = {}; }
  UF.prototype.add = function (x) { if (this.p[x] === undefined) this.p[x] = x; return x; };
  UF.prototype.find = function (x) {
    this.add(x);
    while (this.p[x] !== x) { this.p[x] = this.p[this.p[x]]; x = this.p[x]; }
    return x;
  };
  UF.prototype.union = function (a, b) {
    var ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.p[rb] = ra;
    return ra;
  };
  CL.UF = UF;

}(window.CL));
