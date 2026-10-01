/* ============================================================
   CircuitLab — micro:bit virtual
   Matriz de 25 LEDs, botones A/B, sensores simulados y los pines
   grandes del conector de borde (0, 1, 2, 3V y GND).
   ============================================================ */
(function (CL) {
  'use strict';

  var W = 216, H = 168;
  var PASO_PAD = 36;                       // separación entre los pads grandes
  var LED_SEP = 19, LED_W = 7, LED_H = 11;

  var pinesDef = [
    { id: 'P0', etq: '0',   tipo: 'digital' },
    { id: 'P1', etq: '1',   tipo: 'digital' },
    { id: 'P2', etq: '2',   tipo: 'digital' },
    { id: '3V', etq: '3V',  tipo: 'vcc33' },
    { id: 'GND', etq: 'GND', tipo: 'gnd' }
  ];

  var pins = pinesDef.map(function (p, i) {
    return { id: p.id, etq: p.etq, tipo: p.tipo, x: -((pinesDef.length - 1) * PASO_PAD) / 2 + i * PASO_PAD, y: H / 2 - 6 };
  });

  function matrizVacia() {
    var m = [];
    for (var y = 0; y < 5; y++) { m.push([0, 0, 0, 0, 0]); }
    return m;
  }
  CL.matrizVacia = matrizVacia;

  /* Iconos predefinidos (como los de MakeCode, dibujados aquí desde cero) */
  CL.ICONOS_MB = {
    corazon:   ['01010', '11111', '11111', '01110', '00100'],
    corazon_p: ['00000', '01010', '01110', '00100', '00000'],
    feliz:     ['00000', '01010', '00000', '10001', '01110'],
    triste:    ['00000', '01010', '00000', '01110', '10001'],
    si:        ['00000', '00001', '00010', '10100', '01000'],
    no:        ['10001', '01010', '00100', '01010', '10001'],
    flecha_n:  ['00100', '01110', '10101', '00100', '00100'],
    flecha_s:  ['00100', '00100', '10101', '01110', '00100'],
    cuadrado:  ['11111', '10001', '10001', '10001', '11111'],
    diamante:  ['00100', '01010', '10001', '01010', '00100'],
    casa:      ['00100', '01110', '11111', '01110', '01110'],
    fantasma:  ['01110', '10101', '11111', '11111', '10101'],
    pato:      ['01100', '11100', '01111', '01110', '00000'],
    tijeras:   ['11011', '11011', '00100', '11011', '11011']
  };
  /* Fuente 5x5 mínima para números y algunas letras */
  CL.FUENTE_MB = {
    '0': ['11111', '10001', '10001', '10001', '11111'],
    '1': ['00100', '01100', '00100', '00100', '01110'],
    '2': ['11111', '00001', '11111', '10000', '11111'],
    '3': ['11111', '00001', '01111', '00001', '11111'],
    '4': ['10001', '10001', '11111', '00001', '00001'],
    '5': ['11111', '10000', '11111', '00001', '11111'],
    '6': ['11111', '10000', '11111', '10001', '11111'],
    '7': ['11111', '00001', '00010', '00100', '00100'],
    '8': ['11111', '10001', '11111', '10001', '11111'],
    '9': ['11111', '10001', '11111', '00001', '11111'],
    'A': ['01110', '10001', '11111', '10001', '10001'],
    'B': ['11110', '10001', '11110', '10001', '11110'],
    'C': ['01111', '10000', '10000', '10000', '01111'],
    'H': ['10001', '10001', '11111', '10001', '10001'],
    'I': ['11111', '00100', '00100', '00100', '11111'],
    'L': ['10000', '10000', '10000', '10000', '11111'],
    'O': ['01110', '10001', '10001', '10001', '01110'],
    ':': ['00000', '00100', '00000', '00100', '00000'],
    '!': ['00100', '00100', '00100', '00000', '00100'],
    ' ': ['00000', '00000', '00000', '00000', '00000'],
    '-': ['00000', '00000', '11111', '00000', '00000']
  };
  CL.patronMB = function (txt) {
    var f = CL.FUENTE_MB[String(txt).toUpperCase()];
    return f || CL.FUENTE_MB[' '];
  };

  CL.catalogo.microbit = {
    nombre: 'micro:bit', cat: 'placas', emoji: '🟨', ancha: true,
    props: { agitado: false, luz: 60, temp: 24 },
    size: { x: -W / 2, y: -H / 2, w: W, h: H },
    pins: pins,
    grupos: [],
    placa: true,
    familia: 'microbit',
    interactivo: true,
    propsUI: [
      { k: 'agitado', t: 'bool', etq: 'Agitar (sensor de movimiento)', vivo: true },
      { k: 'luz', t: 'range', etq: 'Luz ambiente', min: 0, max: 255, step: 1, vivo: true },
      { k: 'temp', t: 'range', etq: 'Temperatura', min: -5, max: 50, step: 1, fmt: function (v) { return v + ' °C'; }, vivo: true }
    ],

    dibujar: function (c, st) {
      st = st || {};
      var m = st.matriz || matrizVacia();
      var s = '<g class="body">';
      // PCB
      s += '<rect class="board-pcb" x="' + (-W / 2) + '" y="' + (-H / 2) + '" width="' + W + '" height="' + (H - 14) + '" rx="14" fill="#0f766e" stroke="#115e59"/>';
      s += '<text class="board-txt" x="0" y="' + (-H / 2 + 16) + '" text-anchor="middle" font-size="9" font-weight="700">micro:bit</text>';
      // matriz de 25 LEDs
      var mx0 = -2 * LED_SEP, my0 = -22;
      for (var y = 0; y < 5; y++) {
        for (var x = 0; x < 5; x++) {
          var b = m[y][x] || 0;
          s += '<rect class="mb-led' + (b > 0 ? ' on' : '') + '" x="' + (mx0 + x * LED_SEP - LED_W / 2) + '" y="' + (my0 + y * LED_SEP - LED_H / 2) +
               '" width="' + LED_W + '" height="' + LED_H + '" rx="1.6"' +
               (b > 0 ? ' fill="#ff3b30" opacity="' + (0.35 + 0.65 * b) + '" filter="url(#glowSoft)"' : '') + '/>';
        }
      }
      // botones A y B
      var by = -22;
      s += '<g class="mb-btn-a"><circle class="mb-btn' + (st.botonA ? ' pressed' : '') + '" cx="' + (-W / 2 + 24) + '" cy="' + by + '" r="12"/>' +
           '<text class="board-txt" x="' + (-W / 2 + 24) + '" y="' + (by + 3) + '" text-anchor="middle" font-size="9" font-weight="700">A</text></g>';
      s += '<g class="mb-btn-b"><circle class="mb-btn' + (st.botonB ? ' pressed' : '') + '" cx="' + (W / 2 - 24) + '" cy="' + by + '" r="12"/>' +
           '<text class="board-txt" x="' + (W / 2 - 24) + '" y="' + (by + 3) + '" text-anchor="middle" font-size="9" font-weight="700">B</text></g>';
      // conector de borde dorado
      s += '<rect x="' + (-W / 2) + '" y="' + (H / 2 - 32) + '" width="' + W + '" height="30" fill="#0f766e"/>';
      pins.forEach(function (p) {
        var ancho = (p.tipo === 'digital' || p.tipo === 'vcc33' || p.tipo === 'gnd') ? 26 : 20;
        s += '<rect x="' + (p.x - ancho / 2) + '" y="' + (H / 2 - 30) + '" width="' + ancho + '" height="28" rx="2" fill="#d4af37" stroke="#b8901f" stroke-width=".6"/>';
        s += '<text class="board-txt dark" x="' + p.x + '" y="' + (H / 2 - 12) + '" text-anchor="middle" font-size="8" font-weight="700">' + p.etq + '</text>';
      });
      // led de encendido y sensor de movimiento
      if (st.ejecutando) {
        s += '<circle cx="' + (W / 2 - 18) + '" cy="' + (-H / 2 + 14) + '" r="3.2" fill="#facc15"><animate attributeName="opacity" values="1;.3;1" dur="1s" repeatCount="indefinite"/></circle>';
      }
      if (c.props.agitado) {
        s += '<text x="0" y="' + (H / 2 - 40) + '" text-anchor="middle" font-size="9" fill="#facc15">〰 agitando</text>';
      }
      s += '</g>';
      return s;
    },

    modelo: function (c, ctx) {
      var els = [], estado = (ctx && ctx.pines && ctx.pines[c.id]) || {};
      els.push({ t: 'gnd', p: 'GND' });
      els.push({ t: 'vcc', p: '3V', v: 3.3 });
      ['P0', 'P1', 'P2'].forEach(function (id) {
        var e = estado[id];
        if (e && e.modo === 'OUTPUT') {
          els.push({ t: 'v', p: id, n: 'GND', v: CL.clamp(e.valor, 0, 1) * 3.3, rser: 30, imax: 0.015, rol: 'pin', pin: id, comp: c.id });
        } else {
          els.push({ t: 'r', p: id, n: 'GND', r: 1e8, rol: 'hiz' });
        }
      });
      return els;
    },

    medir: function (c, r, dt, prev, ctx) {
      var mb = (ctx && ctx.microbit && ctx.microbit[c.id]) || {};
      return {
        matriz: mb.matriz || matrizVacia(),
        botonA: !!mb.botonA, botonB: !!mb.botonB,
        ejecutando: !!(ctx && ctx.ejecutando)
      };
    },

    info: {
      tipo: 'Placa educativa BBC micro:bit',
      datos: [['Pantalla', '25 LEDs rojos (5×5)'], ['Botones', 'A y B'], ['Sensores', 'Acelerómetro, brújula, luz y temperatura'],
              ['Pines grandes', '0, 1, 2, 3V y GND'], ['Alimentación', '3 V'], ['Radio', 'Bluetooth / radio propia']],
      que: 'La micro:bit es una placa diseñada para aprender a programar. Trae pantalla de LEDs, botones y sensores incorporados, así que puedes hacer proyectos sin conectar nada más.',
      como: 'Se programa por bloques, JavaScript o Python. En este simulador usamos un lenguaje sencillo con instrucciones como basic.showIcon("corazon") o input.onButtonPressed("A", ...).',
      donde: 'Clases de tecnología, robots sencillos, juegos, contadores de pasos, termómetros, brújulas.',
      errores: [
        'Alimentar sus pines con 5 V: trabaja a 3,3 V.',
        'Olvidar la resistencia del LED externo conectado al pin 0.',
        'Esperar mucha corriente de los pines (máximo ≈ 5 mA por pin, 90 mA en total).'
      ],
      ejemplo: 'basic.forever(function(){ basic.showIcon("corazon"); basic.pause(500); basic.clearScreen(); basic.pause(500); });'
    }
  };

}(window.CL));
