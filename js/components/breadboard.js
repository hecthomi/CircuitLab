/* ============================================================
   CircuitLab — Protoboard (placa de pruebas)
   Modelo real: 30 columnas, filas A-E y F-J separadas por el canal
   central, más 4 rieles de alimentación (2 arriba, 2 abajo).
   ============================================================ */
(function (CL) {
  'use strict';

  var P = CL.PASO;                 // 12 px entre agujeros
  var COLS = 30;
  var FILAS_SUP = ['A', 'B', 'C', 'D', 'E'];
  var FILAS_INF = ['F', 'G', 'H', 'I', 'J'];

  var X0 = -((COLS - 1) * P) / 2;                       // x de la columna 1
  var Y_SUP = [-60, -48, -36, -24, -12];                // filas A..E
  var Y_INF = [12, 24, 36, 48, 60];                     // filas F..J
  var Y_TP = -104, Y_TN = -92, Y_BN = 92, Y_BP = 104;   // rieles

  var ANCHO = (COLS - 1) * P + 40;
  var ALTO = 240;

  function colX(i) { return X0 + i * P; }
  /* Rieles COMPLETOS: un agujero por columna, como en la protoboard de Tinkercad.
     (Antes faltaba uno de cada seis y no existían TP6, TP12…; los proyectos
     guardados siguen valiendo porque solo se AÑADEN agujeros.) */
  function railCols() {
    var out = [];
    for (var i = 0; i < COLS; i++) out.push(i);
    return out;
  }
  var RAILC = railCols();

  /* ---------------- Pines ---------------- */
  var pins = [];
  var grupos = [];      // conexiones internas: cada grupo es un nodo eléctrico

  // filas principales
  for (var c = 1; c <= COLS; c++) {
    var gSup = [], gInf = [];
    FILAS_SUP.forEach(function (f, k) {
      var id = f + c;
      pins.push({ id: id, x: colX(c - 1), y: Y_SUP[k], hole: true, fila: f, col: c, zona: 'sup' });
      gSup.push(id);
    });
    FILAS_INF.forEach(function (f, k) {
      var id = f + c;
      pins.push({ id: id, x: colX(c - 1), y: Y_INF[k], hole: true, fila: f, col: c, zona: 'inf' });
      gInf.push(id);
    });
    grupos.push(gSup); grupos.push(gInf);
  }
  // rieles
  var gTP = [], gTN = [], gBP = [], gBN = [];
  RAILC.forEach(function (i) {
    var n = i + 1;
    pins.push({ id: 'TP' + n, x: colX(i), y: Y_TP, hole: true, riel: 'TP', pol: '+' }); gTP.push('TP' + n);
    pins.push({ id: 'TN' + n, x: colX(i), y: Y_TN, hole: true, riel: 'TN', pol: '−' }); gTN.push('TN' + n);
    pins.push({ id: 'BN' + n, x: colX(i), y: Y_BN, hole: true, riel: 'BN', pol: '−' }); gBN.push('BN' + n);
    pins.push({ id: 'BP' + n, x: colX(i), y: Y_BP, hole: true, riel: 'BP', pol: '+' }); gBP.push('BP' + n);
  });
  grupos.push(gTP); grupos.push(gTN); grupos.push(gBP); grupos.push(gBN);

  /* Índice por columna para localizar un agujero sin recorrer los 420 */
  var PORCOL = [];
  pins.forEach(function (p) {
    var k = Math.round((p.x - X0) / P);
    (PORCOL[k] = PORCOL[k] || []).push(p);
  });
  /** Id del agujero que hay en (lx, ly) —coordenadas locales de la placa— con ±2 px, o null. */
  function hoyoLocal(lx, ly) {
    var k = Math.round((lx - X0) / P), lista = PORCOL[k];
    if (!lista || Math.abs(X0 + k * P - lx) >= 2) return null;
    for (var i = 0; i < lista.length; i++) if (Math.abs(lista[i].y - ly) < 2) return lista[i].id;
    return null;
  }

  /* ---------------- Dibujo ---------------- */
  /* Aspecto calcado de Tinkercad: plástico gris claro plano, agujeros redondos
     oscuros con un anillo gris alrededor, franjas de riel separadas, línea negra
     (−) y roja (+), y la numeración en todas las columnas. */
  function dibujarBase() {
    var s = '';
    var x0 = -ANCHO / 2, y0 = -ALTO / 2;
    s += '<rect x="' + (x0 - 1) + '" y="' + (y0 - 1) + '" width="' + (ANCHO + 2) + '" height="' + (ALTO + 2) + '" rx="5" fill="#000" opacity=".12"/>';
    s += '<rect class="bb-base" x="' + x0 + '" y="' + y0 + '" width="' + ANCHO + '" height="' + ALTO + '" rx="4"/>';
    // franjas de los rieles: un escalón muy suave respecto a la zona central
    var yRailSup = (Y_TN + Y_SUP[0]) / 2 - 3, yRailInf = (Y_BN + Y_INF[4]) / 2 + 3;
    s += '<rect class="bb-rail-strip" x="' + x0 + '" y="' + y0 + '" width="' + ANCHO + '" height="' + (yRailSup - y0) + '" rx="4"/>';
    s += '<rect class="bb-rail-strip" x="' + x0 + '" y="' + yRailInf + '" width="' + ANCHO + '" height="' + (ALTO / 2 - yRailInf) + '" rx="4"/>';
    s += '<line class="bb-edge" x1="' + x0 + '" y1="' + yRailSup + '" x2="' + (-x0) + '" y2="' + yRailSup + '"/>';
    s += '<line class="bb-edge" x1="' + x0 + '" y1="' + yRailInf + '" x2="' + (-x0) + '" y2="' + yRailInf + '"/>';
    // canal central
    s += '<rect class="bb-groove" x="' + x0 + '" y="-7" width="' + ANCHO + '" height="14"/>';
    // líneas de los rieles: roja junto al (+) y negra junto al (−)
    var lx1 = X0 - 4, lx2 = colX(COLS - 1) + 4;
    s += '<line class="bb-rail-line pos" x1="' + lx1 + '" y1="' + (Y_TP - 8) + '" x2="' + lx2 + '" y2="' + (Y_TP - 8) + '"/>';
    s += '<line class="bb-rail-line neg" x1="' + lx1 + '" y1="' + (Y_TN + 8) + '" x2="' + lx2 + '" y2="' + (Y_TN + 8) + '"/>';
    s += '<line class="bb-rail-line neg" x1="' + lx1 + '" y1="' + (Y_BN - 8) + '" x2="' + lx2 + '" y2="' + (Y_BN - 8) + '"/>';
    s += '<line class="bb-rail-line pos" x1="' + lx1 + '" y1="' + (Y_BP + 8) + '" x2="' + lx2 + '" y2="' + (Y_BP + 8) + '"/>';
    // signos + / − a ambos lados
    [[Y_TP, 'pos', '+'], [Y_TN, 'neg', '−'], [Y_BN, 'neg', '−'], [Y_BP, 'pos', '+']].forEach(function (r) {
      s += '<text class="bb-sign ' + r[1] + '" x="' + (X0 - 11) + '" y="' + (r[0] + 3) + '" text-anchor="middle">' + r[2] + '</text>';
      s += '<text class="bb-sign ' + r[1] + '" x="' + (colX(COLS - 1) + 11) + '" y="' + (r[0] + 3) + '" text-anchor="middle">' + r[2] + '</text>';
    });
    // números de TODAS las columnas, en vertical (arriba de A y debajo de J)
    for (var i = 0; i < COLS; i++) {
      var yA = Y_SUP[0] - 10, yJ = Y_INF[4] + 10;
      s += '<text class="bb-txt" x="' + colX(i) + '" y="' + yA + '" transform="rotate(-90 ' + colX(i) + ' ' + yA + ')" text-anchor="middle" dominant-baseline="central">' + (i + 1) + '</text>';
      s += '<text class="bb-txt" x="' + colX(i) + '" y="' + yJ + '" transform="rotate(-90 ' + colX(i) + ' ' + yJ + ')" text-anchor="middle" dominant-baseline="central">' + (i + 1) + '</text>';
    }
    // letras de fila
    FILAS_SUP.forEach(function (f, k) {
      s += '<text class="bb-txt" x="' + (X0 - 11) + '" y="' + (Y_SUP[k] + 2) + '" text-anchor="middle">' + f.toLowerCase() + '</text>';
      s += '<text class="bb-txt" x="' + (colX(COLS - 1) + 11) + '" y="' + (Y_SUP[k] + 2) + '" text-anchor="middle">' + f.toLowerCase() + '</text>';
    });
    FILAS_INF.forEach(function (f, k) {
      s += '<text class="bb-txt" x="' + (X0 - 11) + '" y="' + (Y_INF[k] + 2) + '" text-anchor="middle">' + f.toLowerCase() + '</text>';
      s += '<text class="bb-txt" x="' + (colX(COLS - 1) + 11) + '" y="' + (Y_INF[k] + 2) + '" text-anchor="middle">' + f.toLowerCase() + '</text>';
    });
    return s;
  }

  /** Pistas internas que se iluminan con el modo "mostrar conexiones". */
  function dibujarPistas() {
    var s = '<g class="bb-nets">';
    for (var i = 0; i < COLS; i++) {
      s += '<path class="bb-net-path" d="M' + colX(i) + ' ' + Y_SUP[0] + ' L' + colX(i) + ' ' + Y_SUP[4] + '"/>';
      s += '<path class="bb-net-path" d="M' + colX(i) + ' ' + Y_INF[0] + ' L' + colX(i) + ' ' + Y_INF[4] + '"/>';
    }
    var x1 = colX(RAILC[0]), x2 = colX(RAILC[RAILC.length - 1]);
    s += '<path class="bb-net-path rail-pos" d="M' + x1 + ' ' + Y_TP + ' L' + x2 + ' ' + Y_TP + '"/>';
    s += '<path class="bb-net-path rail-neg" d="M' + x1 + ' ' + Y_TN + ' L' + x2 + ' ' + Y_TN + '"/>';
    s += '<path class="bb-net-path rail-neg" d="M' + x1 + ' ' + Y_BN + ' L' + x2 + ' ' + Y_BN + '"/>';
    s += '<path class="bb-net-path rail-pos" d="M' + x1 + ' ' + Y_BP + ' L' + x2 + ' ' + Y_BP + '"/>';
    return s + '</g>';
  }

  function dibujarAgujeros(c) {
    // anillo claro alrededor de cada agujero (debajo) y el agujero oscuro encima
    var s = '<g class="bb-holes"><g class="bb-rings">';
    for (var i = 0; i < pins.length; i++) {
      s += '<circle cx="' + pins[i].x + '" cy="' + pins[i].y + '" r="3.3"/>';
    }
    s += '</g>';
    for (var k = 0; k < pins.length; k++) {
      var p = pins[k];
      s += '<circle class="bb-hole" id="hole-' + c.id + '-' + p.id + '" data-pin="' + p.id + '" ' +
           'cx="' + p.x + '" cy="' + p.y + '" r="1.9"/>';
    }
    return s + '</g>';
  }

  CL.catalogo.protoboard = {
    nombre: 'Protoboard', cat: 'basica', emoji: '🧰', ancha: true,
    props: {},
    size: { x: -ANCHO / 2, y: -ALTO / 2, w: ANCHO, h: ALTO },
    pins: pins,
    grupos: grupos,
    esProto: true,
    rotStep: 90,
    dibujar: function (c) {
      return '<g class="body">' + dibujarBase() + dibujarPistas() + dibujarAgujeros(c) + '</g>';
    },
    modelo: function () { return []; },      // no aporta elementos: solo conexiones
    info: {
      tipo: 'Placa de pruebas sin soldadura (breadboard)',
      datos: [['Columnas', '30'], ['Filas', 'A-E arriba, F-J abajo'], ['Paso', '2,54 mm (0,1")'],
              ['Rieles', '2 arriba y 2 abajo (+ y −), 30 agujeros cada uno'], ['Canal central', 'Separa las dos mitades']],
      que: 'La protoboard permite armar circuitos sin soldar. Por dentro tiene tiras metálicas que unen ciertos agujeros entre sí.',
      como: 'En la zona central, los 5 agujeros de una misma columna (A-E o F-J) están unidos entre sí. Los rieles de los bordes recorren toda la placa a lo largo y sirven para llevar VCC y GND a cualquier punto. El canal del medio separa la mitad de arriba de la de abajo.',
      donde: 'Prototipos, clases de electrónica, pruebas de circuitos antes de soldarlos, proyectos con Arduino.',
      errores: [
        'Poner las dos patas de un componente en la misma columna: queda cortocircuitado.',
        'Creer que las filas horizontales de la zona central están unidas (no lo están: se unen las columnas).',
        'Olvidar puentear los rieles de arriba con los de abajo cuando se necesitan en ambos lados.'
      ],
      ejemplo: 'Riel rojo (+) → resistencia en la columna 10 → LED entre la columna 15 y el riel azul (−).'
    },

    /* ---- Ayudas específicas de la protoboard ---- */
    grupoDe: function (pinId) {
      for (var i = 0; i < grupos.length; i++) if (grupos[i].indexOf(pinId) >= 0) return grupos[i];
      return [pinId];
    },
    descripcionPunto: function (pinId) {
      var p = null;
      for (var i = 0; i < pins.length; i++) if (pins[i].id === pinId) { p = pins[i]; break; }
      if (!p) return '';
      if (p.riel) {
        var pol = p.pol === '+' ? 'positivo (+)' : 'negativo (−)';
        return '<b>Riel ' + pol + '</b><br>Todos los agujeros de este riel están unidos a lo largo de la placa. Aquí se conecta la alimentación para tenerla disponible en cualquier punto.';
      }
      var otros = p.zona === 'sup' ? 'A, B, C, D y E' : 'F, G, H, I y J';
      return '<b>Columna ' + p.col + ' · fila ' + p.fila + '</b><br>Este punto está conectado internamente con los otros 4 puntos de esta columna (' + otros + '). El canal central lo separa de la otra mitad.';
    },
    hoyoLocal: hoyoLocal,
    COLS: COLS, X0: X0, Y_SUP: Y_SUP, Y_INF: Y_INF, colX: colX
  };

}(window.CL));
