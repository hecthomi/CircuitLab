/* ============================================================
   CircuitLab — catálogo de componentes
   Cada componente declara:
     nombre, cat, size, pins, propsUI, dibujar(c,st), modelo(c,ctx), info
   Coordenadas de pines en múltiplos de 12 px (paso de la protoboard).
   ============================================================ */
(function (CL) {
  'use strict';

  var P = 12;                 // paso entre agujeros
  CL.PASO = P;

  CL.CATEGORIAS = [
    { id: 'basica',   nombre: 'Electrónica básica', color: '#22d3ee' },
    { id: 'power',    nombre: 'Alimentación',       color: '#ef4444' },
    { id: 'robotica', nombre: 'Robótica',           color: '#a78bfa' },
    { id: 'placas',   nombre: 'Placas',             color: '#34d399' }
  ];

  /* `off` = cápsula apagada (opaca y oscura, como en Tinkercad); `hex` = encendida */
  var LED_COLORES = {
    rojo:     { hex: '#ff3b30', off: '#8a1c1c', glow: '#ff4d4d', vf: 1.9, nombre: 'Rojo' },
    verde:    { hex: '#3ee063', off: '#1f8a2e', glow: '#4ade80', vf: 2.1, nombre: 'Verde' },
    amarillo: { hex: '#ffd21f', off: '#86761f', glow: '#fde047', vf: 2.1, nombre: 'Amarillo' },
    azul:     { hex: '#4d8dff', off: '#1f4596', glow: '#60a5fa', vf: 3.0, nombre: 'Azul' },
    blanco:   { hex: '#ffffff', off: '#d3d8de', glow: '#ffffff', vf: 3.1, nombre: 'Blanco' }
  };
  CL.LED_COLORES = LED_COLORES;

  /** Mezcla dos colores #rrggbb (t = 0 → a, t = 1 → b). */
  function mezclar(a, b, t) {
    t = CL.clamp(t || 0, 0, 1);
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), out = '#';
    [16, 8, 0].forEach(function (s) {
      var ca = (pa >> s) & 255, cb = (pb >> s) & 255;
      out += ('0' + Math.round(ca + (cb - ca) * t).toString(16)).slice(-2);
    });
    return out;
  }
  CL.mezclarColor = mezclar;

  /** Color de la cápsula de un LED según su brillo (0 apagado … 1 pleno). */
  CL.colorLed = function (col, b) { return mezclar(col.off || col.hex, col.hex, b); };

  /* Patas metálicas al estilo Tinkercad: gris sólido, extremo redondeado que
     entra en el agujero (mismo grosor en todos los componentes). */
  var PATA = 'stroke="#9aa1a9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  CL.PATA = PATA;

  /* Colores estándar de las bandas de resistencia */
  var BANDAS = ['#1f2937', '#78350f', '#dc2626', '#ea580c', '#facc15', '#16a34a', '#2563eb', '#7c3aed', '#6b7280', '#f8fafc'];
  function bandasDe(ohms) {
    if (ohms <= 0) return [BANDAS[0], BANDAS[0], BANDAS[0]];
    var exp = 0, v = ohms;
    while (v >= 100) { v /= 10; exp++; }
    v = Math.round(v);
    var d1 = Math.floor(v / 10), d2 = v % 10;
    return [BANDAS[d1] || BANDAS[0], BANDAS[d2] || BANDAS[0], BANDAS[exp] || BANDAS[0]];
  }
  CL.bandasResistencia = bandasDe;

  /* ------------------------------------------------------------
     Degradados compartidos. Se inyectan una sola vez en el lienzo y
     también en cada icono de la paleta, así los componentes tienen
     aspecto de pieza real (metal, plástico, brillos) sin imágenes.
     ------------------------------------------------------------ */
  CL.DEFS_COMUNES =
    '<linearGradient id="gMetV" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#f8fafc"/><stop offset=".3" stop-color="#cbd5e1"/>' +
    '<stop offset=".62" stop-color="#8d99a8"/><stop offset="1" stop-color="#dfe6ee"/></linearGradient>' +
    '<linearGradient id="gMetH" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#e2e8f0"/><stop offset=".45" stop-color="#aab4c0"/>' +
    '<stop offset="1" stop-color="#f1f5f9"/></linearGradient>' +
    '<linearGradient id="gPata" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#9aa5b1"/><stop offset=".4" stop-color="#e8edf3"/>' +
    '<stop offset="1" stop-color="#8b96a3"/></linearGradient>' +
    '<radialGradient id="gLuz" cx=".33" cy=".26" r=".75">' +
    '<stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="gPlaca" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#f6f4ec"/><stop offset=".45" stop-color="#e9e6db"/>' +
    '<stop offset="1" stop-color="#d8d4c6"/></linearGradient>' +
    '<linearGradient id="gCanal" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#c7c2b3"/><stop offset=".4" stop-color="#ded9cc"/>' +
    '<stop offset="1" stop-color="#efece2"/></linearGradient>' +
    '<linearGradient id="gPcb" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#12888c"/><stop offset=".5" stop-color="#0d7377"/>' +
    '<stop offset="1" stop-color="#095e62"/></linearGradient>' +
    '<linearGradient id="gAzul" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#3b6fd4"/><stop offset=".5" stop-color="#1e4fb0"/>' +
    '<stop offset="1" stop-color="#153a86"/></linearGradient>' +
    '<linearGradient id="gNegro" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#404650"/><stop offset=".45" stop-color="#232830"/>' +
    '<stop offset="1" stop-color="#12161c"/></linearGradient>' +
    '<linearGradient id="gCuerpoR" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#f0dcba"/><stop offset=".4" stop-color="#dcc298"/>' +
    '<stop offset="1" stop-color="#b99a6e"/></linearGradient>' +
    /* --- HC-SR04: placa azul marino, aro metalico y malla del transductor --- */
    '<linearGradient id="gPcbAzul" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#2a4d8f"/><stop offset=".45" stop-color="#1d3a70"/>' +
    '<stop offset="1" stop-color="#16305e"/></linearGradient>' +
    '<radialGradient id="gAro" cx=".34" cy=".28" r=".85">' +
    '<stop offset="0" stop-color="#f8fafc"/><stop offset=".55" stop-color="#c3ccd6"/>' +
    '<stop offset=".86" stop-color="#8d99a8"/><stop offset="1" stop-color="#e6ebf1"/></radialGradient>' +
    '<radialGradient id="gMalla" cx=".36" cy=".3" r=".8">' +
    '<stop offset="0" stop-color="#e8e88c"/><stop offset=".55" stop-color="#c9c95a"/>' +
    '<stop offset="1" stop-color="#93932f"/></radialGradient>' +
    /* --- Servo visto desde arriba: caja azul y corona dentada --- */
    '<linearGradient id="gServo" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#59b0e6"/><stop offset=".42" stop-color="#2b8fd2"/>' +
    '<stop offset="1" stop-color="#1a6cab"/></linearGradient>' +
    '<radialGradient id="gCorona" cx=".35" cy=".3" r=".8">' +
    '<stop offset="0" stop-color="#e2f2fd"/><stop offset=".6" stop-color="#a9d6f2"/>' +
    '<stop offset="1" stop-color="#6fb2dd"/></radialGradient>';

  var cat = {};
  CL.catalogo = cat;

  /* ============================================================
     ELECTRÓNICA BÁSICA
     ============================================================ */

  /* ---------------------------- LED ---------------------------- */
  cat.led = {
    nombre: 'LED', cat: 'basica', emoji: '💡',
    props: { color: 'rojo' },
    size: { x: -14, y: -22, w: 28, h: 46 },
    pins: [
      { id: 'a', x: -6, y: 18, rol: 'anodo',   etq: 'A', pol: '+' },
      { id: 'k', x: 6,  y: 18, rol: 'catodo',  etq: 'K', pol: '−' }
    ],
    propsUI: [{ k: 'color', t: 'select', etq: 'Color', op: [['rojo','Rojo'],['verde','Verde'],['amarillo','Amarillo'],['azul','Azul'],['blanco','Blanco']] }],
    nombreDe: function (c) { return 'LED ' + (LED_COLORES[c.props.color] || LED_COLORES.rojo).nombre.toLowerCase(); },
    dibujar: function (c, st) {
      var col = LED_COLORES[c.props.color] || LED_COLORES.rojo;
      var b = st && st.brillo ? CL.clamp(st.brillo, 0, 1) : 0;
      if (st && st.quemado) return CL.dibujoQuemado(col.hex);
      // cápsula OPACA (como en Tinkercad): apagada es oscura y al encender se aclara
      var cuerpo = CL.colorLed(col, b);
      var aro = mezclar(cuerpo, '#ffffff', 0.16), sombra = mezclar(cuerpo, '#000000', 0.22);
      return '' +
        '<g class="body' + (b > 0.02 ? ' led-on' : '') + '">' +
        // patas: el ánodo baja recto y el cátodo sale en diagonal y luego baja
        '  <path d="M-6 7 L-6 18" ' + PATA + '/>' +
        '  <path d="M3.4 7 L6 12 L6 18" ' + PATA + '/>' +
        // halo de luz alrededor cuando enciende
        (b > 0.02 ? '  <circle cx="0" cy="-5" r="' + (11 + 7 * b) + '" fill="' + col.glow + '" opacity="' + (0.34 * b) + '" filter="url(#glowStrong)"/>' : '') +
        // cápsula
        '  <path d="M-8 5 L-8 -12 A8 8.4 0 0 1 8 -12 L8 5 Z" fill="' + cuerpo + '"/>' +
        '  <path d="M4.2 -18.6 A8 8.4 0 0 1 8 -12 L8 5 L5.2 5 L5.2 -12 A6 6 0 0 0 4.2 -18.6 Z" fill="' + sombra + '" opacity=".55"/>' +
        // aro inferior (la pestaña de la cápsula)
        '  <rect x="-9.4" y="3.2" width="18.8" height="4.6" rx="2" fill="' + aro + '"/>' +
        '  <rect x="-9.4" y="3.2" width="18.8" height="1" fill="' + sombra + '" opacity=".6"/>' +
        '  <g class="led-glow" opacity="' + b + '">' +
        '    <ellipse cx="-2.4" cy="-10" rx="2.4" ry="4.6" fill="#fff" opacity=".55"/>' +
        '    <circle cx="0" cy="-5" r="4.2" fill="#fff" opacity=".6" filter="url(#glowSoft)"/>' +
        '  </g>' +
        '</g>';
    },
    modelo: function (c, ctx) {
      var col = LED_COLORES[c.props.color] || LED_COLORES.rojo;
      // un LED quemado deja de conducir: el circuito queda abierto de verdad
      if (ctx && ctx.quemados && ctx.quemados[c.id]) return [{ t: 'r', p: 'a', n: 'k', r: 1e9, rol: 'quemado' }];
      return [{ t: 'led', p: 'a', n: 'k', vf: col.vf, rd: 14, imax: 0.025 }];
    },
    medir: function (c, r, dt, prev, ctx) {
      var i = r.corriente || 0;
      // 20 mA ≈ brillo pleno; escala perceptual
      var quemado = !!(ctx && ctx.quemados && ctx.quemados[c.id]);
      var obj = quemado ? 0 : CL.clamp(Math.pow(CL.clamp(i / 0.018, 0, 1.6), 0.65), 0, 1);
      // el LED no salta de 0 a 1: sube en ~35 ms y baja en ~75 ms
      var ant = prev && prev.brillo !== undefined ? prev.brillo : obj;
      var b = ant + (obj - ant) * (1 - Math.exp(-(dt || 0.016) / (obj > ant ? 0.035 : 0.075)));
      // sobrecorriente sostenida = se quema (desactivable en Ajustes)
      var calor = (prev && prev.calor) || 0;
      if (!quemado && CL.pref('quemar', true) !== false) {
        calor = i > 0.045 ? calor + (dt || 0.016) : Math.max(0, calor - (dt || 0.016) * 0.5);
        if (calor > 0.45 && ctx) { (ctx.quemados = ctx.quemados || {})[c.id] = true; quemado = true; }
      }
      return { brillo: quemado ? 0 : b, corriente: i, quemado: quemado, calor: calor,
               texto: quemado ? 'quemado' : (i > 1e-5 ? CL.fmtA(i) : '') };
    },
    info: {
      tipo: 'Diodo emisor de luz (Light Emitting Diode)',
      datos: [['Polaridad', 'Sí — tiene ánodo y cátodo'], ['Ánodo (+)', 'Pata larga'], ['Cátodo (−)', 'Pata corta / lado plano'],
              ['Caída de tensión', '≈ 2 V (rojo) a 3,1 V (blanco)'], ['Corriente típica', '10 – 20 mA'], ['Resistencia recomendada', '220 Ω con 5 V']],
      que: 'Un LED es un diodo que emite luz cuando la corriente lo atraviesa en el sentido correcto. Convierte energía eléctrica en luz casi sin calor.',
      como: 'Solo conduce en un sentido: del ánodo (+) al cátodo (−). Necesita una tensión mínima (tensión directa) para encender y, a partir de ahí, la corriente sube muy rápido; por eso SIEMPRE se le pone una resistencia en serie que limite esa corriente.',
      donde: 'Indicadores de encendido, pantallas, semáforos, linternas, tiras de iluminación, tableros de instrumentos y prácticamente cualquier proyecto con Arduino.',
      errores: [
        'Conectarlo al revés: no enciende (y no siempre se daña, pero no funciona).',
        'Conectarlo sin resistencia a 5 V: pasa demasiada corriente y se quema.',
        'Poner las dos patas en la misma fila de la protoboard: eso lo cortocircuita.'
      ],
      ejemplo: '5 V → resistencia de 220 Ω → ánodo del LED → cátodo → GND',
      formula: 'R = (Vfuente − Vled) / I   →   (5 V − 2 V) / 0,02 A = 150 Ω (se usa 220 Ω comercial)'
    }
  };

  /* ---------------------------- Resistencia ---------------------------- */
  var RES_SILUETA =
    'M-17 0 C-17 -4.4 -15.4 -5.8 -12.4 -5.8 C-10.4 -5.8 -9.8 -4.2 -8 -4.2 L8 -4.2 ' +
    'C9.8 -4.2 10.4 -5.8 12.4 -5.8 C15.4 -5.8 17 -4.4 17 0 C17 4.4 15.4 5.8 12.4 5.8 ' +
    'C10.4 5.8 9.8 4.2 8 4.2 L-8 4.2 C-9.8 4.2 -10.4 5.8 -12.4 5.8 C-15.4 5.8 -17 4.4 -17 0 Z';
  cat.resistor = {
    nombre: 'Resistencia', cat: 'basica', emoji: '〰️',
    props: { ohms: 220 },
    size: { x: -30, y: -12, w: 60, h: 24 },
    rotStep: 90,
    pins: [
      { id: 'a', x: -24, y: 0, etq: '1' },
      { id: 'b', x: 24,  y: 0, etq: '2' }
    ],
    propsUI: [{ k: 'ohms', t: 'select', etq: 'Valor', op: [[100,'100 Ω'],[220,'220 Ω'],[330,'330 Ω'],[470,'470 Ω'],[1000,'1 kΩ'],[2200,'2,2 kΩ'],[4700,'4,7 kΩ'],[10000,'10 kΩ'],[100000,'100 kΩ'],[1000000,'1 MΩ']], num: true }],
    nombreDe: function (c) { return 'Resistencia ' + CL.fmtOhm(c.props.ohms); },
    dibujar: function (c, st) {
      var bd = bandasDe(+c.props.ohms || 220);
      // cuerpo "de hueso" como en Tinkercad: extremos abombados y cintura estrecha
      var g = '<g class="body">' +
        '<path d="M-24 0 L-16 0 M16 0 L24 0" ' + PATA + '/>' +
        '<path d="' + RES_SILUETA + '" fill="#e1c089" stroke="#c7a466" stroke-width=".5"/>' +
        '<path d="M-15.6 -3.2 C-15 -5 -13.8 -5.1 -12.4 -5.1 C-10.8 -5.1 -10.1 -3.6 -8 -3.6 L8 -3.6 C10.1 -3.6 10.8 -5.1 12.4 -5.1" ' +
        'fill="none" stroke="#f3dcb2" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>';
      // tolerancia (dorada, fina) en un extremo y las tres bandas del valor hacia el otro
      g += '<rect x="-13.6" y="-5.5" width="1.5" height="11" fill="#c9a227"/>';
      [[-5, 2.6, 4.2, bd[2]], [0.6, 2.6, 4.2, bd[1]], [10.2, 2.8, 5.4, bd[0]]].forEach(function (b) {
        g += '<rect x="' + b[0] + '" y="' + (-b[2]) + '" width="' + b[1] + '" height="' + (2 * b[2]) + '" fill="' + b[3] + '"/>';
      });
      g += '</g>';
      return g;
    },
    etiquetaValor: function (c) { return CL.fmtOhm(+c.props.ohms || 220); },
    etiquetaEnLienzo: false,        // el valor se lee en las bandas (y en el inspector), no en un rótulo
    modelo: function (c) { return [{ t: 'r', p: 'a', n: 'b', r: Math.max(0.1, +c.props.ohms || 220) }]; },
    medir: function (c, r) { return { corriente: r.corriente || 0, caida: r.caida || 0 }; },
    info: {
      tipo: 'Componente pasivo — resistor',
      datos: [['Polaridad', 'No tiene: da igual el sentido'], ['Unidad', 'Ohmio (Ω)'], ['Ley', 'V = I × R'], ['Código', 'Bandas de colores']],
      que: 'Una resistencia se opone al paso de la corriente. Es el componente más usado de la electrónica: protege, limita y reparte la tensión.',
      como: 'Según la ley de Ohm, la corriente que pasa es I = V / R. Cuanto mayor es R, menos corriente circula. La energía sobrante se convierte en calor.',
      donde: 'Limitar la corriente de un LED, divisores de tensión, pull-up y pull-down de pulsadores, ajustar señales de sensores.',
      errores: [
        'Olvidarla en serie con el LED (el LED se quema).',
        'Elegir un valor demasiado alto: el LED enciende muy débil.',
        'Confundir 220 Ω con 220 kΩ al leer las bandas.'
      ],
      ejemplo: 'Con 5 V y un LED rojo de 2 V a 20 mA: R = (5 − 2) / 0,02 = 150 Ω → se usa 220 Ω.',
      formula: 'V = I × R    ·    I = V / R    ·    P = V × I'
    }
  };

  /* ---------------------------- Potenciómetro ---------------------------- */
  cat.pot = {
    nombre: 'Potenciómetro', cat: 'basica', emoji: '🎛️',
    props: { ohms: 10000, pos: 0.5 },
    size: { x: -22, y: -26, w: 44, h: 52 },
    pins: [
      { id: '1', x: -12, y: 20, etq: '1' },
      { id: 'w', x: 0,   y: 20, etq: 'W' },
      { id: '2', x: 12,  y: 20, etq: '2' }
    ],
    propsUI: [
      { k: 'ohms', t: 'select', etq: 'Valor', op: [[1000,'1 kΩ'],[10000,'10 kΩ'],[50000,'50 kΩ'],[100000,'100 kΩ']], num: true },
      { k: 'pos', t: 'range', etq: 'Giro', min: 0, max: 1, step: 0.01, fmt: function (v) { return Math.round(v * 100) + '%'; }, vivo: true }
    ],
    dibujar: function (c) {
      var ang = -135 + (c.props.pos || 0) * 270;
      var g = '<g class="body">' +
        '<path d="M-12 20 L-12 15 M0 20 L0 15 M12 20 L12 15" stroke="#c3ccd8" stroke-width="2" stroke-linecap="round"/>' +
        // carcasa azul con las orejas de montaje
        '<rect x="-15.5" y="-5" width="31" height="21" rx="2.4" fill="url(#gAzul)"/>' +
        '<rect x="-15.5" y="-5" width="31" height="6" rx="2.4" fill="#fff" opacity=".14"/>' +
        '<rect x="-15.5" y="11" width="31" height="5" fill="#000" opacity=".18"/>' +
        // cuerpo metálico y eje
        '<circle cx="0" cy="-8" r="13.5" fill="url(#gMetV)"/>' +
        '<circle cx="0" cy="-8" r="13.5" fill="none" stroke="#6b7684" stroke-width=".7"/>' +
        '<circle cx="0" cy="-8" r="10.5" fill="#5b6673"/>' +
        '<circle cx="0" cy="-8" r="10.5" fill="url(#gLuz)" opacity=".5"/>';
      // moleteado del mando
      for (var k = 0; k < 12; k++) {
        var a = (k / 12) * Math.PI * 2;
        g += '<path d="M' + (Math.cos(a) * 8.4).toFixed(1) + ' ' + (-8 + Math.sin(a) * 8.4).toFixed(1) +
             ' L' + (Math.cos(a) * 10.2).toFixed(1) + ' ' + (-8 + Math.sin(a) * 10.2).toFixed(1) +
             '" stroke="#39424e" stroke-width=".8" opacity=".7"/>';
      }
      g += '<g transform="rotate(' + ang + ' 0 -8)">' +
           '<rect class="pot-knob" x="-1.5" y="-19.5" width="3" height="12" rx="1.4" fill="#f1f5f9"/>' +
           '<rect x="-1.5" y="-19.5" width="1.2" height="12" rx=".6" fill="#94a3b8"/></g>' +
           '<circle cx="0" cy="-8" r="2.6" fill="#2b333d"/>' +
           '</g>';
      return g;
    },
    etiquetaValor: function (c) { return CL.fmtOhm(c.props.ohms) + ' · ' + Math.round((c.props.pos || 0) * 100) + '%'; },
    modelo: function (c) {
      var R = Math.max(10, +c.props.ohms || 10000), p = CL.clamp(c.props.pos === undefined ? 0.5 : c.props.pos, 0.001, 0.999);
      return [
        { t: 'r', p: '1', n: 'w', r: R * p },
        { t: 'r', p: 'w', n: '2', r: R * (1 - p) }
      ];
    },
    info: {
      tipo: 'Resistencia variable de 3 terminales',
      datos: [['Terminales', '1 y 2 = extremos, W = cursor'], ['Uso típico', 'Divisor de tensión'], ['Valor común', '10 kΩ']],
      que: 'Es una resistencia que puedes cambiar girando una perilla. Entre los extremos siempre hay el mismo valor; el terminal del medio (cursor) reparte ese valor en dos.',
      como: 'Si conectas 5 V a un extremo y GND al otro, en el cursor obtienes una tensión entre 0 V y 5 V según el giro. Eso es un divisor de tensión variable, ideal para leer con analogRead().',
      donde: 'Control de volumen, brillo de un LED, velocidad de un motor, ajuste de sensores, mandos de videojuegos.',
      errores: [
        'Conectar solo dos patas y esperar que varíe la tensión (así funciona como resistencia variable, no como divisor).',
        'Leer el cursor con un pin digital en lugar de uno analógico.',
        'Poner los extremos a 5 V y 5 V: nunca cambia el valor leído.'
      ],
      ejemplo: '5 V → pata 1 · cursor W → A0 del Arduino · pata 2 → GND. Luego analogRead(A0) devuelve de 0 a 1023.'
    }
  };

  /* ---------------------------- Pulsador ---------------------------- */
  cat.pulsador = {
    nombre: 'Pulsador', cat: 'basica', emoji: '🔘',
    props: { modo: 'momentaneo', rebote: false },
    size: { x: -22, y: -22, w: 44, h: 44 },
    pins: [
      { id: 'a1', x: -18, y: -12, etq: '1' },
      { id: 'b1', x: 18,  y: -12, etq: '3' },
      { id: 'a2', x: -18, y: 12,  etq: '2' },
      { id: 'b2', x: 18,  y: 12,  etq: '4' }
    ],
    interactivo: true,
    propsUI: [{ k: 'rebote', t: 'bool', etq: 'Simular rebote mecánico' }],
    dibujar: function (c, st) {
      var down = st && st.presionado;
      return '<g class="body">' +
        // patas dobladas hacia afuera
        '<path d="M-18 -12 L-14 -12 L-12.5 -11 M18 -12 L14 -12 L12.5 -11 M-18 12 L-14 12 L-12.5 11 M18 12 L14 12 L12.5 11" ' +
        '      stroke="#c3ccd8" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        // base de plástico negro
        '<rect x="-12.6" y="-12.6" width="25.2" height="25.2" rx="1.8" fill="url(#gNegro)"/>' +
        // tapa metálica
        '<rect x="-11" y="-11" width="22" height="22" rx="1.4" fill="url(#gMetV)" opacity=".95"/>' +
        '<rect x="-11" y="-11" width="22" height="22" rx="1.4" fill="none" stroke="#6b7684" stroke-width=".6"/>' +
        '<path d="M-11 -11 h22 v6 h-22 z" fill="#fff" opacity=".22"/>' +
        // pulsador
        '<circle cx="0" cy="0" r="8.6" fill="#0b0f14" opacity=".55"/>' +
        '<circle class="push-cap' + (down ? ' down' : '') + '" cx="0" cy="' + (down ? 0.8 : 0) + '" r="7.6" ' +
        '        fill="' + (down ? '#0e7490' : '#1c222b') + '"/>' +
        '<circle cx="-1.8" cy="' + (down ? -1.4 : -2.2) + '" r="3.6" fill="#fff" opacity="' + (down ? .12 : .22) + '"/>' +
        '<circle cx="0" cy="' + (down ? 0.8 : 0) + '" r="7.6" fill="none" stroke="#000" stroke-width=".7" opacity=".5"/>' +
        '</g>' +
        (down ? '<text class="value" x="0" y="-17" text-anchor="middle">pulsado</text>' : '');
    },
    modelo: function (c, ctx) {
      var down = ctx && ctx.estados && ctx.estados[c.id] && ctx.estados[c.id].presionado;
      return [
        { t: 'r', p: 'a1', n: 'a2', r: 0.005 },     // pareja izquierda siempre unida
        { t: 'r', p: 'b1', n: 'b2', r: 0.005 },     // pareja derecha siempre unida
        { t: 'sw', p: 'a1', n: 'b1', cerrado: !!down }
      ];
    },
    info: {
      tipo: 'Interruptor momentáneo (tacto)',
      datos: [['Polaridad', 'No tiene'], ['Patas', '4 — unidas de dos en dos'], ['Estado normal', 'Abierto']],
      que: 'Un pulsador cierra el circuito solo mientras lo mantienes presionado. Al soltarlo vuelve a abrirse.',
      como: 'Las cuatro patas no son independientes: las de un mismo lado ya están unidas por dentro. Al presionar, se unen los dos lados. Por eso hay que usar patas de lados opuestos.',
      donde: 'Encender luces, timbres, teclados, reinicio de placas, controles de videojuegos.',
      errores: [
        'Usar dos patas del mismo lado: el circuito queda cerrado siempre.',
        'Colocarlo a lo ancho del canal central de la protoboard al revés (queda cortocircuitado por la fila).',
        'Leerlo con Arduino sin resistencia pull-down o pull-up: el pin queda "flotando" y da valores al azar.'
      ],
      ejemplo: '5 V → pulsador → pin 2 del Arduino, y del pin 2 una resistencia de 10 kΩ a GND (pull-down).'
    }
  };

  /* ---------------------------- Interruptor ---------------------------- */
  cat.interruptor = {
    nombre: 'Interruptor', cat: 'basica', emoji: '🎚️',
    props: { cerrado: false },
    size: { x: -24, y: -16, w: 48, h: 34 },
    pins: [
      { id: 'a', x: -12, y: 12, etq: '1' },
      { id: 'b', x: 12,  y: 12, etq: '2' }
    ],
    interactivo: true,
    dibujar: function (c, st) {
      var on = st && st.cerrado !== undefined ? st.cerrado : c.props.cerrado;
      return '<g class="body">' +
        '<rect x="-16" y="-10" width="32" height="20" rx="3" fill="#1f2937" stroke="#374151"/>' +
        '<rect class="switch-lever" x="' + (on ? 0 : -14) + '" y="-7" width="14" height="14" rx="2.5" fill="' + (on ? '#22c55e' : '#94a3b8') + '"/>' +
        '<path d="M-12 10 L-12 12 M12 10 L12 12" stroke="#cbd5e1" stroke-width="1.6"/>' +
        '</g>' +
        '<text class="value" x="0" y="-13" text-anchor="middle">' + (on ? 'ON' : 'OFF') + '</text>';
    },
    modelo: function (c, ctx) {
      var e = ctx && ctx.estados && ctx.estados[c.id];
      var on = e && e.cerrado !== undefined ? e.cerrado : c.props.cerrado;
      return [{ t: 'sw', p: 'a', n: 'b', cerrado: !!on }];
    },
    info: {
      tipo: 'Interruptor de dos posiciones',
      datos: [['Polaridad', 'No tiene'], ['Estados', 'Abierto / Cerrado'], ['Memoria', 'Mantiene la posición']],
      que: 'A diferencia del pulsador, el interruptor se queda en la posición que lo dejes: abierto (circuito cortado) o cerrado (corriente pasa).',
      como: 'Cerrado se comporta como un cable; abierto, como si no existiera nada. Haz clic sobre él en la simulación para cambiarlo.',
      donde: 'Encendido general de un aparato, linternas, lámparas, selección de modos.',
      errores: ['Pensar que "apagado" desconecta la batería completa del montaje.', 'Ponerlo en paralelo con el componente en vez de en serie: así lo cortocircuita.'],
      ejemplo: 'Batería + → interruptor → resistencia → LED → batería −'
    }
  };

  /* ---------------------------- Buzzer ---------------------------- */
  cat.buzzer = {
    nombre: 'Buzzer', cat: 'basica', emoji: '🔊',
    props: {},
    size: { x: -18, y: -20, w: 36, h: 42 },
    pins: [
      { id: 'p', x: -6, y: 18, rol: 'positivo', etq: '+', pol: '+' },
      { id: 'n', x: 6,  y: 18, rol: 'negativo', etq: '−', pol: '−' }
    ],
    dibujar: function (c, st) {
      var son = st && st.sonando;
      return '<g class="body">' +
        '<path d="M-6 18 L-6 12 M6 18 L6 12" stroke="#c3ccd8" stroke-width="2" stroke-linecap="round"/>' +
        // cápsula cilíndrica negra vista desde arriba
        '<circle cx="0" cy="-2" r="15.5" fill="#0a0d12"/>' +
        '<circle cx="0" cy="-2" r="14.6" fill="url(#gNegro)"/>' +
        '<circle cx="0" cy="-2" r="14.6" fill="url(#gLuz)" opacity=".35"/>' +
        // etiqueta superior con el agujero de salida del sonido
        '<circle cx="0" cy="-2" r="10.6" fill="#161b22"/>' +
        '<circle cx="0" cy="-2" r="10.6" fill="none" stroke="#2e353f" stroke-width=".8"/>' +
        '<circle cx="0" cy="-2" r="2.8" fill="#05070a"/>' +
        '<circle cx="0" cy="-2" r="2.8" fill="none" stroke="#3a424d" stroke-width=".6"/>' +
        '<text x="0" y="6.5" text-anchor="middle" font-size="4.2" fill="#7b8593" font-family="system-ui">BUZZER</text>' +
        '<circle cx="0" cy="-2" r="15.5" fill="none" stroke="#000" stroke-width=".8" opacity=".6"/>' +
        (son ? '<g opacity=".95"><path d="M14 -11 A12.5 12.5 0 0 1 14 7" stroke="#22d3ee" stroke-width="1.7" fill="none"/>' +
               '<path d="M18.5 -15 A17.5 17.5 0 0 1 18.5 11" stroke="#22d3ee" stroke-width="1.5" fill="none" opacity=".55"/>' +
               '<path d="M-14 -11 A12.5 12.5 0 0 0 -14 7" stroke="#22d3ee" stroke-width="1.7" fill="none"/></g>' : '') +
        '</g>' +
        '<text class="polarity p" x="-11" y="16">+</text>';
    },
    modelo: function () { return [{ t: 'r', p: 'p', n: 'n', r: 90, rol: 'buzzer' }]; },
    medir: function (c, r) {
      var v = Math.abs(r.caida || 0);
      return { sonando: v > 1.2, volumen: CL.clamp(v / 5, 0, 1), texto: v > 1.2 ? 'suena' : '' };
    },
    info: {
      tipo: 'Zumbador piezoeléctrico',
      datos: [['Polaridad', 'Sí (los activos)'], ['Tensión', '3 – 5 V'], ['Corriente', '≈ 30 mA'], ['Pin +', 'Marcado con un signo +']],
      que: 'Un buzzer transforma electricidad en sonido. Los "activos" suenan solos con tensión continua; los "pasivos" necesitan una señal que cambie (una frecuencia).',
      como: 'Un cristal piezoeléctrico vibra cuando le aplicas tensión. Esa vibración mueve el aire y produce el pitido.',
      donde: 'Alarmas, temporizadores de cocina, avisos de computadores, juguetes, sistemas de seguridad.',
      errores: ['Conectarlo al revés (algunos no suenan).', 'Esperar melodías de un buzzer activo: solo hace un tono.', 'Conectarlo directo a un pin sin comprobar la corriente máxima del pin.'],
      ejemplo: 'pin 8 del Arduino → buzzer + · buzzer − → GND, y en el código tone(8, 440);'
    }
  };

  /* ---------------------------- Condensador ---------------------------- */
  cat.condensador = {
    nombre: 'Condensador', cat: 'basica', emoji: '🔋',
    props: { uf: 100 },
    size: { x: -16, y: -22, w: 32, h: 46 },
    pins: [
      { id: 'p', x: -6, y: 18, rol: 'positivo', etq: '+', pol: '+' },
      { id: 'n', x: 6,  y: 18, rol: 'negativo', etq: '−', pol: '−' }
    ],
    propsUI: [{ k: 'uf', t: 'select', etq: 'Capacidad', op: [[1,'1 µF'],[10,'10 µF'],[47,'47 µF'],[100,'100 µF'],[220,'220 µF'],[470,'470 µF'],[1000,'1000 µF']], num: true }],
    dibujar: function (c) {
      return '<g class="body">' +
        '<path d="M-6 18 L-6 13 M6 18 L6 13" stroke="#c3ccd8" stroke-width="2" stroke-linecap="round"/>' +
        // lata de aluminio del electrolítico
        '<rect x="-9.4" y="-16" width="18.8" height="30" rx="4.5" fill="#1b3f8f"/>' +
        '<rect x="-9.4" y="-16" width="18.8" height="30" rx="4.5" fill="url(#gLuz)" opacity=".45"/>' +
        '<ellipse cx="0" cy="-15.4" rx="9.4" ry="2.6" fill="#2a55b0"/>' +
        '<ellipse cx="0" cy="-15.4" rx="9.4" ry="2.6" fill="url(#gLuz)" opacity=".5"/>' +
        '<path d="M-3 -16.6 l3 -1.4 l3 1.4" stroke="#94a3b8" stroke-width=".8" fill="none" opacity=".7"/>' +
        // franja del negativo
        '<path d="M3.4 -13.6 h6 v25.2 a2.4 2.4 0 0 1 -2.4 2.4 h-3.6 z" fill="#dbeafe" opacity=".92"/>' +
        '<text x="6.4" y="-2" text-anchor="middle" font-size="7.5" fill="#1e3a8a" font-family="system-ui" font-weight="700">−</text>' +
        '<text x="6.4" y="6" text-anchor="middle" font-size="7.5" fill="#1e3a8a" font-family="system-ui" font-weight="700">−</text>' +
        '<text x="-3.4" y="0" text-anchor="middle" font-size="4.6" fill="#e0f2fe" font-family="system-ui">' + (c.props.uf) + 'µF</text>' +
        '<rect x="-9.4" y="-16" width="18.8" height="30" rx="4.5" fill="none" stroke="#0f2b6b" stroke-width=".7"/>' +
        '</g>';
    },
    etiquetaValor: function (c) { return c.props.uf + ' µF'; },
    // En corriente continua estable un condensador es un circuito abierto
    modelo: function (c) { return [{ t: 'r', p: 'p', n: 'n', r: 5e9, rol: 'cap' }]; },
    info: {
      tipo: 'Condensador electrolítico',
      datos: [['Polaridad', 'Sí — la pata larga es +'], ['Unidad', 'Faradio (F); se usan µF'], ['En continua', 'Se comporta como circuito abierto']],
      que: 'Un condensador almacena carga eléctrica, como un pequeño depósito de energía que se llena y se vacía muy rápido.',
      como: 'Al conectarlo, la corriente lo carga hasta alcanzar la tensión de la fuente; entonces deja de circular corriente. Al desconectar la fuente, devuelve esa energía.',
      donde: 'Filtrar el ruido de una fuente, arrancar motores, temporizadores, flashes de cámara, memorias.',
      errores: ['Invertir la polaridad de un electrolítico (puede abrirse o explotar).', 'Esperar que "pase corriente" de forma continua: en continua no pasa.'],
      ejemplo: 'Se pone entre 5 V y GND, cerca de un motor, para que los picos de corriente no reinicien el Arduino.'
    }
  };

  /* ---------------------------- Diodo ---------------------------- */
  cat.diodo = {
    nombre: 'Diodo', cat: 'basica', emoji: '➡️',
    props: {},
    size: { x: -26, y: -12, w: 52, h: 24 },
    rotStep: 90,
    pins: [
      { id: 'a', x: -24, y: 0, rol: 'anodo', etq: 'A', pol: '+' },
      { id: 'k', x: 24,  y: 0, rol: 'catodo', etq: 'K', pol: '−' }
    ],
    dibujar: function () {
      return '<g class="body">' +
        '<path d="M-24 0 L-10 0 M10 0 L24 0" stroke="#c3ccd8" stroke-width="2" stroke-linecap="round"/>' +
        '<rect x="-11" y="-6.4" width="22" height="12.8" rx="3.2" fill="url(#gNegro)"/>' +
        '<rect x="-11" y="-6.4" width="22" height="12.8" rx="3.2" fill="url(#gLuz)" opacity=".4"/>' +
        '<rect x="5.6" y="-6.4" width="3.6" height="12.8" fill="#e8edf3"/>' +
        '<rect x="5.6" y="-6.4" width="3.6" height="12.8" fill="url(#gLuz)" opacity=".5"/>' +
        '<rect x="-11" y="-6.4" width="22" height="12.8" rx="3.2" fill="none" stroke="#000" stroke-width=".7" opacity=".55"/>' +
        '</g>';
    },
    modelo: function () { return [{ t: 'led', p: 'a', n: 'k', vf: 0.7, rd: 3, imax: 1, silencioso: true }]; },
    info: {
      tipo: 'Diodo rectificador (tipo 1N4007)',
      datos: [['Polaridad', 'Sí'], ['Caída directa', '≈ 0,7 V'], ['Banda blanca', 'Indica el cátodo (−)']],
      que: 'El diodo es una válvula para la electricidad: deja pasar la corriente en un sentido y la bloquea en el contrario.',
      como: 'Necesita unos 0,7 V para empezar a conducir del ánodo al cátodo. En sentido inverso se comporta como un circuito abierto.',
      donde: 'Proteger circuitos contra la inversión de la batería, convertir corriente alterna en continua, proteger del retorno de los motores y relés.',
      errores: ['Confundir el lado de la banda blanca.', 'Usarlo donde hacía falta un LED (el diodo no ilumina).'],
      ejemplo: 'En paralelo con un motor, al revés, para absorber los picos de tensión al frenar (diodo de rueda libre).'
    }
  };

  /* ============================================================
     ALIMENTACIÓN
     ============================================================ */
  cat.bateria = {
    nombre: 'Batería', cat: 'power', emoji: '🔋',
    props: { volt: 9 },
    size: { x: -30, y: -26, w: 60, h: 52 },
    pins: [
      { id: 'p', x: -18, y: 20, rol: 'positivo', etq: '+', pol: '+' },
      { id: 'n', x: 18,  y: 20, rol: 'negativo', etq: '−', pol: '−' }
    ],
    propsUI: [{ k: 'volt', t: 'select', etq: 'Tensión', op: [[1.5,'1,5 V (pila AA)'],[3,'3 V (2 pilas)'],[4.5,'4,5 V (3 pilas)'],[6,'6 V (4 pilas)'],[9,'9 V (bloque)'],[12,'12 V']], num: true }],
    fuente: true,
    dibujar: function (c) {
      var v = +c.props.volt;
      var bloque = v >= 9;
      return '<g class="body">' +
        '<path d="M-18 20 L-18 16 M18 20 L18 16" stroke="#c3ccd8" stroke-width="2.2" stroke-linecap="round"/>' +
        // carcasa
        '<rect x="-24" y="-18" width="48" height="34" rx="3.5" fill="' + (bloque ? '#1b1f27' : '#2b3038') + '"/>' +
        '<rect x="-24" y="-18" width="48" height="34" rx="3.5" fill="url(#gLuz)" opacity=".32"/>' +
        // etiqueta
        '<rect x="-21" y="-14" width="42" height="20" rx="2" fill="' + (bloque ? '#0f172a' : '#111827') + '"/>' +
        '<rect x="-21" y="-14" width="42" height="20" rx="2" fill="none" stroke="#facc15" stroke-width=".8" opacity=".7"/>' +
        '<text x="0" y="-1" text-anchor="middle" font-size="11" font-family="system-ui" font-weight="700" fill="#facc15">' + v + 'V</text>' +
        // bornes metálicos
        '<rect x="-21.5" y="8" width="9" height="7" rx="1.6" fill="url(#gMetV)"/>' +
        '<rect x="12.5" y="8" width="9" height="7" rx="1.6" fill="url(#gMetV)"/>' +
        '<text x="-17" y="6" text-anchor="middle" font-size="8.5" fill="#f87171" font-family="system-ui" font-weight="700">+</text>' +
        '<text x="17" y="6" text-anchor="middle" font-size="8.5" fill="#cbd5e1" font-family="system-ui" font-weight="700">−</text>' +
        '<rect x="-24" y="-18" width="48" height="34" rx="3.5" fill="none" stroke="#000" stroke-width=".8" opacity=".55"/>' +
        '</g>';
    },
    etiquetaValor: function (c) { return c.props.volt + ' V'; },
    modelo: function (c) { return [{ t: 'v', p: 'p', n: 'n', v: +c.props.volt || 9, rser: 0.4, imax: 1.2, rol: 'bateria' }]; },
    info: {
      tipo: 'Fuente de tensión continua',
      datos: [['Polaridad', 'Sí: + y −'], ['Símbolo', 'Línea larga = +, corta = −'], ['Corriente', 'La que pida el circuito']],
      que: 'La batería es la que "empuja" los electrones. Sin una fuente de energía, ningún circuito funciona.',
      como: 'Mantiene una diferencia de potencial fija entre sus bornes. La corriente sale por el + , recorre el circuito y regresa por el −.',
      donde: 'Todos los aparatos portátiles: control remoto, linterna, robot, celular.',
      errores: ['Unir + y − con un cable: es un cortocircuito, la batería se calienta.', 'Usar 9 V directo sobre un LED sin resistencia.'],
      ejemplo: 'Batería + → interruptor → resistencia 220 Ω → LED → batería −'
    }
  };

  function fuenteFija(id, volt, nombre, color) {
    cat[id] = {
      nombre: nombre, cat: 'power', emoji: '⚡',
      props: {},
      size: { x: -26, y: -20, w: 52, h: 42 },
      pins: [
        { id: 'p', x: -12, y: 16, rol: 'positivo', etq: '+', pol: '+' },
        { id: 'n', x: 12,  y: 16, rol: 'negativo', etq: 'GND', pol: '−' }
      ],
      fuente: true,
      dibujar: function () {
        return '<g class="body">' +
          '<rect x="-22" y="-14" width="44" height="26" rx="5" fill="#0f172a" stroke="' + color + '" stroke-width="1.4"/>' +
          '<text x="0" y="2" text-anchor="middle" font-size="11" font-weight="700" font-family="system-ui" fill="' + color + '">' + volt + ' V</text>' +
          '<path d="M-12 12 L-12 16 M12 12 L12 16" stroke="#cbd5e1" stroke-width="1.8"/>' +
          '</g>' +
          '<text class="polarity p" x="-17" y="14">+</text>' +
          '<text class="polarity n" x="14" y="14">−</text>';
      },
      modelo: function () { return [{ t: 'v', p: 'p', n: 'n', v: volt, rser: 0.05, imax: 2, rol: 'fuente' }]; },
      info: {
        tipo: 'Fuente de alimentación regulada',
        datos: [['Salida', volt + ' V constantes'], ['Polaridad', 'Sí'], ['Referencia', 'El terminal − es el GND del circuito']],
        que: 'Es una fuente de laboratorio: entrega siempre la misma tensión, sin importar el circuito (mientras no se exceda su corriente).',
        como: 'Se usa igual que una batería, pero sin descargarse. Su terminal negativo es la referencia (0 V) de todo el montaje.',
        donde: 'Bancos de trabajo, prácticas de laboratorio, alimentar módulos que exigen ' + volt + ' V exactos.',
        errores: ['Alimentar con 5 V un módulo de 3,3 V y dañarlo.', 'Olvidar unir el GND de la fuente con el GND del Arduino.'],
        ejemplo: volt + ' V → resistencia → LED → GND'
      }
    };
  }
  fuenteFija('fuente5v', 5, 'Fuente 5 V', '#f87171');
  fuenteFija('fuente3v3', 3.3, 'Fuente 3,3 V', '#fbbf24');

  cat.gnd = {
    nombre: 'GND (tierra)', cat: 'power', emoji: '⏚',
    props: {},
    size: { x: -14, y: -14, w: 28, h: 30 },
    pins: [{ id: 'g', x: 0, y: -12, rol: 'gnd', etq: 'GND', pol: '−' }],
    fuente: true,
    dibujar: function () {
      return '<g class="body">' +
        '<path d="M0 -12 L0 -2" stroke="#94a3b8" stroke-width="2"/>' +
        '<path d="M-11 -2 L11 -2 M-7 3 L7 3 M-3.5 8 L3.5 8" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round"/>' +
        '</g>';
    },
    modelo: function () { return [{ t: 'gnd', p: 'g' }]; },
    info: {
      tipo: 'Referencia de 0 voltios',
      datos: [['Símbolo', 'Tres rayas decrecientes'], ['Valor', '0 V por definición'], ['Color de cable', 'Negro']],
      que: 'GND (del inglés ground, tierra) es el punto que tomamos como 0 V. Todas las tensiones del circuito se miden respecto a él.',
      como: 'No es un componente que "haga" algo: es el punto de retorno de la corriente. Todos los GND del montaje deben estar unidos entre sí.',
      donde: 'En todos los circuitos. Si mezclas Arduino con una fuente externa, sus GND SIEMPRE deben ir unidos.',
      errores: ['Olvidar unir el GND del Arduino con el GND de la fuente externa: nada funciona bien.', 'Confundir GND con "apagado".'],
      ejemplo: 'Cátodo del LED → GND'
    }
  };

  cat.vcc = {
    nombre: 'VCC (5 V)', cat: 'power', emoji: '⊤',
    props: { volt: 5 },
    size: { x: -14, y: -16, w: 28, h: 30 },
    pins: [{ id: 'v', x: 0, y: 12, rol: 'vcc', etq: 'VCC', pol: '+' }],
    fuente: true,
    propsUI: [{ k: 'volt', t: 'select', etq: 'Tensión', op: [[3.3,'3,3 V'],[5,'5 V'],[9,'9 V'],[12,'12 V']], num: true }],
    dibujar: function (c) {
      return '<g class="body">' +
        '<path d="M0 12 L0 0" stroke="#f87171" stroke-width="2"/>' +
        '<path d="M-11 0 L11 0" stroke="#f87171" stroke-width="2.4" stroke-linecap="round"/>' +
        '<text x="0" y="-4" text-anchor="middle" font-size="8.5" fill="#f87171" font-family="system-ui" font-weight="700">' + c.props.volt + 'V</text>' +
        '</g>';
    },
    // VCC es una fuente ideal referida a la tierra global del circuito
    modelo: function (c) { return [{ t: 'vcc', p: 'v', v: +c.props.volt || 5 }]; },
    info: {
      tipo: 'Punto de alimentación positiva',
      datos: [['Valor típico', '5 V o 3,3 V'], ['Color de cable', 'Rojo'], ['Referencia', 'Se mide respecto a GND']],
      que: 'VCC es el punto positivo de la alimentación. Junto con GND forma la pareja que da energía a todo el circuito.',
      como: 'Se comporta como el borne + de una fuente. Necesita que exista un GND en el circuito para tener sentido.',
      donde: 'Rieles rojos de la protoboard, pines 5V y 3.3V del Arduino, pin 3V de la micro:bit.',
      errores: ['Conectar VCC directamente a GND: cortocircuito.', 'Alimentar un módulo de 3,3 V con 5 V.'],
      ejemplo: 'VCC → riel rojo de la protoboard → resistencia → LED → riel azul → GND'
    }
  };

  /* ============================================================
     ROBÓTICA — motores
     ============================================================ */
  cat.motor = {
    nombre: 'Motor DC', cat: 'robotica', emoji: '⚙️',
    props: { vnom: 6 },
    size: { x: -26, y: -26, w: 52, h: 52 },
    pins: [
      { id: 'p', x: -6, y: 20, rol: 'positivo', etq: '+', pol: '+' },
      { id: 'n', x: 6,  y: 20, rol: 'negativo', etq: '−', pol: '−' }
    ],
    propsUI: [{ k: 'vnom', t: 'select', etq: 'Tensión nominal', op: [[3,'3 V'],[6,'6 V'],[9,'9 V'],[12,'12 V']], num: true }],
    dibujar: function (c, st) {
      var vel = st ? st.velocidad || 0 : 0, ang = st ? st.angulo || 0 : 0;
      return '<g class="body">' +
        '<path d="M-6 20 L-6 14 M6 20 L6 14" stroke="#c3ccd8" stroke-width="2" stroke-linecap="round"/>' +
        // carcasa metálica del motor
        '<rect x="-18" y="-18" width="36" height="32" rx="5" fill="url(#gMetH)"/>' +
        '<rect x="-18" y="-18" width="36" height="32" rx="5" fill="none" stroke="#7b8695" stroke-width=".7"/>' +
        '<rect x="-18" y="-18" width="36" height="6" rx="3" fill="#fff" opacity=".3"/>' +
        '<rect x="-18" y="9" width="36" height="5" rx="2.5" fill="#000" opacity=".14"/>' +
        // tapa trasera con los bornes
        '<rect x="-13" y="8" width="26" height="7" rx="2" fill="#5c6674"/>' +
        // eje y hélice indicadora del giro
        '<circle cx="0" cy="-3" r="11.5" fill="#3d4753"/>' +
        '<circle cx="0" cy="-3" r="11.5" fill="url(#gLuz)" opacity=".45"/>' +
        // aspas fantasma: sin ellas, a tope de vueltas el rotor parece ir lento
        (vel > 0.3 ? '<g opacity="' + (0.10 + vel * 0.22).toFixed(2) + '">' +
          '<g transform="rotate(' + (ang + 22) + ' 0 -3)"><path d="M0 -13.5 L0 7.5 M-10.5 -3 L10.5 -3" stroke="#22d3ee" stroke-width="2.6" stroke-linecap="round"/></g>' +
          '<g transform="rotate(' + (ang - 22) + ' 0 -3)"><path d="M0 -13.5 L0 7.5 M-10.5 -3 L10.5 -3" stroke="#22d3ee" stroke-width="2.6" stroke-linecap="round"/></g>' +
          '<circle cx="0" cy="-3" r="11" fill="none" stroke="#22d3ee" stroke-width="1" opacity=".5"/></g>' : '') +
        '<g class="rotor" transform="rotate(' + ang + ' 0 -3)">' +
        '  <path d="M0 -13.5 L0 7.5 M-10.5 -3 L10.5 -3" stroke="' + (vel > 0.02 ? '#22d3ee' : '#aab4c0') + '" stroke-width="2.6" stroke-linecap="round"/>' +
        '</g>' +
        '<circle cx="0" cy="-3" r="3.2" fill="url(#gMetV)"/>' +
        '<circle cx="0" cy="-3" r="3.2" fill="none" stroke="#64748b" stroke-width=".5"/>' +
        '</g>' +
        '<text class="polarity p" x="-11" y="18">+</text>' +
        (vel > 0.02 ? '<text class="value" x="0" y="-22" text-anchor="middle">' + Math.round(vel * 100) + '%</text>' : '');
    },
    modelo: function (c) { return [{ t: 'r', p: 'p', n: 'n', r: 40, rol: 'motor' }]; },
    medir: function (c, r, dt, prev) {
      var v = r.caida || 0, vnom = +c.props.vnom || 6;
      var vel = CL.clamp(Math.abs(v) / vnom, 0, 1.4);
      if (Math.abs(v) < 0.9) vel = 0;                  // no arranca con poca tensión
      var dir = v >= 0 ? 1 : -1;
      var ang = ((prev && prev.angulo) || 0) + dir * vel * 900 * (dt || 0.016);
      return { velocidad: vel, angulo: ang % 360, sentido: dir > 0 ? 'horario' : 'antihorario', tension: v };
    },
    info: {
      tipo: 'Motor de corriente continua',
      datos: [['Polaridad', 'Cambiarla invierte el giro'], ['Tensión típica', '3 – 12 V'], ['Corriente', 'Alta al arrancar']],
      que: 'Un motor DC convierte electricidad en movimiento giratorio. Es el músculo de la mayoría de los robots.',
      como: 'La corriente pasa por unas bobinas que se convierten en imanes y empujan contra los imanes fijos, haciendo girar el eje. Más tensión, más velocidad.',
      donde: 'Ruedas de robots, ventiladores, juguetes, bombas de agua, herramientas.',
      errores: [
        'Conectarlo directo a un pin de Arduino: el pin no da corriente suficiente y puede dañarse. Usa un transistor o un driver (L293D).',
        'Olvidar el diodo de protección: los picos del motor reinician la placa.',
        'Alimentarlo con la misma batería del Arduino y provocar reinicios por caídas de tensión.'
      ],
      ejemplo: 'Batería 6 V → interruptor → motor → GND. Al invertir los cables, el motor gira al contrario.'
    }
  };

  /* Corona dentada del servo vista desde arriba. Se calcula una sola vez:
     no depende del angulo (gira entera junto con el brazo) y `dibujar` se
     vuelve a llamar en cada cuadro mientras el servo se mueve. */
  var SERVO_CORONA = (function () {
    var s = '', n = 44, r = 12.4;
    for (var i = 0; i < n; i++) {
      var a = i * (2 * Math.PI / n);
      s += '<circle cx="' + (Math.cos(a) * r).toFixed(2) + '" cy="' + (Math.sin(a) * r).toFixed(2) + '" r=".62"/>';
    }
    return '<g fill="#cfe6f8" opacity=".85">' + s + '</g>';
  }());

  /* Paleta (brazo) del servo: la cruz de plastico blanco que se atornilla
     al eje. Dos aspas largas y dos cortas, con los agujeros escalonados y
     las puntas redondeadas, igual que la del SG90.
     Se dibuja con las aspas largas sobre el eje Y: como el grupo se gira
     `angulo - 90`, a 0 grados la paleta queda atravesada sobre el cuerpo y
     a 90 grados perpendicular a el. Se calcula una sola vez porque la forma
     no cambia: lo unico que cambia en cada cuadro es la rotacion. */
  var SERVO_PALETA = (function () {
    var LARGA = 22, CORTA = 13;
    /* Un aspa apuntando hacia arriba (-Y): base ancha junto al buje,
       punta estrecha y rematada en semicirculo. */
    function aspa(l, base, punta) {
      var r = punta / 2;
      return 'M' + (-base / 2) + ' 1.5' +
             'L' + (-r) + ' ' + (-(l - r)) +
             'A' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + (-(l - r)) +
             'L' + (base / 2) + ' 1.5 Z';
    }
    var dL = aspa(LARGA, 8.6, 4.8), dC = aspa(CORTA, 8, 4.6);
    var cuerpo = '<path d="' + dL + '"/>' +
                 '<path d="' + dL + '" transform="rotate(180)"/>' +
                 '<path d="' + dC + '" transform="rotate(90)"/>' +
                 '<path d="' + dC + '" transform="rotate(270)"/>';
    // los agujeros de un aspa larga van en rojo oscuro y los del resto en
    // azul, igual que en la paleta blanca del SG90
    var rojos = '', azules = '';
    [8.6, 12.3, 16, 19.4].forEach(function (d) {
      rojos  += '<circle cx="0" cy="' + (-d) + '" r="1.15"/>';
      azules += '<circle cx="0" cy="' + d + '" r="1.15"/>';
    });
    [8.6, 11.4].forEach(function (d) {
      azules += '<circle cx="' + (-d) + '" cy="0" r="1.05"/>' +
                '<circle cx="' + d + '" cy="0" r="1.05"/>';
    });
    return { cuerpo: cuerpo, rojos: rojos, azules: azules };
  }());

  cat.servo = {
    nombre: 'Servo motor', cat: 'robotica', emoji: '🦾',
    props: { angulo: 90 },
    size: { x: -35, y: -32, w: 70, h: 64 },
    pins: [
      { id: 'v', x: -12, y: 26, rol: 'vcc',  etq: '5V',  pol: '+' },
      { id: 'g', x: 0,   y: 26, rol: 'gnd',  etq: 'GND', pol: '−' },
      { id: 's', x: 12,  y: 26, rol: 'senal', etq: 'SIG' }
    ],
    propsUI: [{ k: 'angulo', t: 'range', etq: 'Ángulo', min: 0, max: 180, step: 1, fmt: function (v) { return Math.round(v) + '°'; }, vivo: true }],
    dibujar: function (c, st) {
      // ojo: 0 es un angulo valido, asi que no sirve el operador ||
      var ang = st && st.angulo !== undefined ? st.angulo
              : (c.props.angulo !== undefined ? c.props.angulo : 90);
      var alim = st ? st.alimentado : false;
      var gx = -5, gy = 0;                        // centro del eje de salida
      // Los tres hilos salen del conector por separado y cada uno gira a su
      // propia altura antes de entrar recto en su pin. Con ese reparto (el
      // que sale mas a la izquierda es el que gira mas abajo) nunca se cruzan
      // ni se montan uno encima de otro, se giren como se giren el servo.
      var HILOS = [
        { x: -33.5, y: 22.6, r: 3.2, pin: -12, col: '#ef4444' },   // rojo   5 V
        { x: -30,   y: 18.8, r: 4.2, pin: 0,   col: '#78350f' },   // marron GND
        { x: -26.5, y: 15,   r: 4.2, pin: 12,  col: '#fb923c' }    // naranja SIG
      ];
      /** Baja desde el conector, gira con esquinas redondeadas y entra al pin. */
      function ruta(h) {
        return 'M' + h.x + ' 4' +
               'V' + (h.y - h.r) +
               'Q' + h.x + ' ' + h.y + ' ' + (h.x + h.r) + ' ' + h.y +
               'H' + (h.pin - h.r) +
               'Q' + h.pin + ' ' + h.y + ' ' + h.pin + ' ' + (h.y + h.r) +
               'V26';
      }
      // Cada hilo se traza tres veces: un contorno oscuro que lo despega del
      // vecino, el color, y un brillo fino encima para que se vea redondo.
      var cable = '<g fill="none" stroke-linecap="round" stroke-linejoin="round">';
      var rutas = HILOS.map(ruta);
      rutas.forEach(function (d) {
        cable += '<path d="' + d + '" stroke="#0b1220" stroke-width="3.4" opacity=".38"/>';
      });
      rutas.forEach(function (d, i) {
        cable += '<path d="' + d + '" stroke="' + HILOS[i].col + '" stroke-width="2.4"/>' +
                 '<path d="' + d + '" stroke="#fff" stroke-width=".7" opacity=".28"/>';
      });
      cable += '</g>';

      // asientos de tornillo de las cuatro esquinas de la caja
      var esquinas = '';
      [[-24.6, -14.2], [-24.6, 5.2], [15.6, -14.2], [15.6, 5.2]].forEach(function (e) {
        esquinas += '<rect x="' + e[0] + '" y="' + e[1] + '" width="9" height="9" rx="2.4" fill="#1d6ba9"/>' +
                    '<rect x="' + (e[0] + 1.9) + '" y="' + (e[1] + 1.9) + '" width="5.2" height="5.2" rx="1.7" ' +
                    'fill="#6fbaea" stroke="#2b8fd2" stroke-width=".5"/>';
      });

      return '<g class="body">' +
        cable +
        // conector negro de tres vias y su sujetacables
        '<rect x="-34.6" y="5.6" width="10.2" height="3.6" rx="1.5" fill="#1b2029"/>' +
        '<rect x="-34.5" y="-8" width="9.6" height="15.5" rx="1.8" fill="url(#gNegro)"/>' +
        '<path d="M-33 -5 h6.6 M-33 -.2 h6.6 M-33 4.6 h6.6" stroke="#0b0f14" stroke-width="1.3" opacity=".6"/>' +
        // caja azul: reborde oscuro y la tapa con su degradado
        '<rect x="-27" y="-16.5" width="54" height="33" rx="3.6" fill="#17629d"/>' +
        '<rect x="-25.6" y="-15.1" width="51.2" height="30.2" rx="2.8" fill="url(#gServo)"/>' +
        '<rect x="-25.6" y="-15.1" width="51.2" height="8" rx="2.8" fill="#fff" opacity=".13"/>' +
        esquinas +
        // plato del reductor: circulo claro con la corona de dientes punteada
        '<circle cx="' + gx + '" cy="' + gy + '" r="15.2" fill="#2a83c6"/>' +
        '<circle cx="' + gx + '" cy="' + gy + '" r="14.2" fill="url(#gCorona)" opacity=".8"/>' +
        '<g transform="translate(' + gx + ' ' + gy + ')">' + SERVO_CORONA +
        '<circle r="10.4" fill="#dceffc" opacity=".55"/></g>' +
        // rodamiento libre del extremo opuesto
        '<circle cx="20" cy="' + gy + '" r="5.8" fill="#f4f8fb" stroke="#bfcbd6" stroke-width=".7"/>' +
        '<circle cx="20" cy="' + gy + '" r="2.2" fill="#d8e2ea"/>' +
        // la paleta blanca es lo unico que gira con el angulo
        '<g transform="rotate(' + (ang - 90) + ' ' + gx + ' ' + gy + ') translate(' + gx + ' ' + gy + ')">' +
        // sombra, para que la paleta se despegue del cuerpo azul
        '<g transform="translate(.9 1.5)" fill="#0f172a" opacity=".22">' + SERVO_PALETA.cuerpo + '</g>' +
        '<g fill="' + (alim ? '#f8fafc' : '#e9eef3') + '" stroke="#a7b4c2" stroke-width=".5" ' +
        'stroke-linejoin="round">' + SERVO_PALETA.cuerpo + '</g>' +
        '<g fill="#8c2f2f">' + SERVO_PALETA.rojos + '</g>' +
        '<g fill="#2f6ea8">' + SERVO_PALETA.azules + '</g>' +
        // buje central y tornillo del eje
        '<circle r="5.6" fill="' + (alim ? '#f1f5f9' : '#e2e8ee') + '" stroke="#a7b4c2" stroke-width=".5"/>' +
        '<circle r="3.4" fill="url(#gMetV)" stroke="#64748b" stroke-width=".5"/>' +
        '<circle r="1.6" fill="' + (alim ? '#e2e8f0' : '#aeb8c4') + '"/>' +
        '<path d="M-2.4 0 h4.8 M0 -2.4 v4.8" stroke="#6b7280" stroke-width=".7"/>' +
        '</g>' +
        '</g>' +
        '<text class="value" x="0" y="-26" text-anchor="middle">' + Math.round(ang) + '\u00b0</text>';
    },
    modelo: function () {
      return [
        { t: 'r', p: 'v', n: 'g', r: 220, rol: 'servo' },   // consumo en reposo
        { t: 'r', p: 's', n: 'g', r: 20000, rol: 'servo_sig' }
      ];
    },
    medir: function (c, r, dt, prev, ctx) {
      var vAlim = (r.vp || {}), alim = (vAlim.v - vAlim.g) > 3;
      // Si un pin de placa gobierna la señal, manda el ángulo del runtime
      var destino = (ctx && ctx.servoAngulo && ctx.servoAngulo[c.id] !== undefined) ? ctx.servoAngulo[c.id]
                  : (c.props.angulo !== undefined ? c.props.angulo : 90);
      var actual = (prev && prev.angulo !== undefined) ? prev.angulo : destino;
      var paso = 300 * (dt || 0.016);                      // ≈ 300°/s
      if (!alim) paso = 0;
      var d = destino - actual;
      if (Math.abs(d) <= paso) actual = destino; else actual += Math.sign(d) * paso;
      return { angulo: actual, alimentado: alim, destino: destino };
    },
    info: {
      tipo: 'Servomotor de posición (tipo SG90)',
      datos: [['Cables', 'Rojo = 5 V, Marrón/negro = GND, Naranja = señal'], ['Recorrido', '0° a 180°'], ['Control', 'Pulsos PWM de 1 a 2 ms']],
      que: 'Un servo no gira sin parar: se coloca en el ángulo que le pidas y se queda allí. Tiene un motor, engranajes y un circuito de control adentro.',
      como: 'Recibe pulsos por el cable de señal. La duración del pulso indica el ángulo: 1 ms ≈ 0°, 1,5 ms ≈ 90°, 2 ms ≈ 180°. En Arduino se usa la librería Servo.',
      donde: 'Brazos robóticos, dirección de carros, pinzas, cámaras que siguen objetos, barreras automáticas.',
      errores: [
        'Alimentarlo desde el pin 5V del Arduino cuando mueve carga: provoca reinicios. Usa fuente externa y une los GND.',
        'Pedirle ángulos mayores de 180°: fuerza los engranajes.',
        'Olvidar unir GND del servo con GND de la placa.'
      ],
      ejemplo: '#include <Servo.h> — Servo s; s.attach(9); s.write(90);'
    }
  };

  cat.paso = {
    nombre: 'Motor paso a paso', cat: 'robotica', emoji: '🌀',
    props: {},
    size: { x: -30, y: -30, w: 60, h: 62 },
    pins: [
      { id: 'a', x: -18, y: 24, etq: 'A' },
      { id: 'b', x: -6,  y: 24, etq: 'B' },
      { id: 'c', x: 6,   y: 24, etq: 'C' },
      { id: 'd', x: 18,  y: 24, etq: 'D' }
    ],
    dibujar: function (c, st) {
      var ang = st ? st.angulo || 0 : 0;
      return '<g class="body">' +
        '<circle cx="0" cy="-2" r="20" fill="#475569" stroke="#0f172a" stroke-width="1.2"/>' +
        '<circle cx="0" cy="-2" r="15" fill="#334155"/>' +
        '<g class="rotor" transform="rotate(' + ang + ' 0 -2)">' +
        '  <rect x="-1.6" y="-19" width="3.2" height="17" rx="1.4" fill="#22d3ee"/>' +
        '  <circle cx="0" cy="-2" r="3" fill="#e2e8f0"/>' +
        '</g>' +
        '<path d="M-18 20 L-18 24 M-6 20 L-6 24 M6 20 L6 24 M18 20 L18 24" stroke="#cbd5e1" stroke-width="1.6"/>' +
        '</g>';
    },
    modelo: function () {
      return [
        { t: 'r', p: 'a', n: 'b', r: 60, rol: 'paso' },
        { t: 'r', p: 'c', n: 'd', r: 60, rol: 'paso' }
      ];
    },
    medir: function (c, r, dt, prev) {
      var v = Math.abs(r.caida || 0);
      var gira = v > 1;
      var ang = ((prev && prev.angulo) || 0) + (gira ? 90 * (dt || .016) * 4 : 0);
      return { angulo: ang % 360, pasos: Math.round(ang / 1.8), girando: gira };
    },
    info: {
      tipo: 'Motor paso a paso (28BYJ-48 / NEMA)',
      datos: [['Bobinas', '2 pares (A-B y C-D)'], ['Paso típico', '1,8° (200 pasos por vuelta)'], ['Driver', 'ULN2003 o A4988']],
      que: 'Gira en pasos exactos en vez de girar libremente. Eso permite controlar la posición con mucha precisión sin sensores.',
      como: 'Se energizan las bobinas en una secuencia; en cada cambio el rotor avanza un paso. Cambiando el orden de la secuencia se invierte el giro.',
      donde: 'Impresoras 3D, escáneres, máquinas CNC, relojes, robots que necesitan precisión.',
      errores: ['Conectarlo sin driver.', 'Cambiar dos cables de la misma bobina y que vibre sin girar.', 'Ir demasiado rápido: pierde pasos.'],
      ejemplo: 'Arduino + ULN2003 + motor 28BYJ-48 girando 512 pasos = 1 vuelta completa.'
    }
  };

  /* ============================================================
     ROBÓTICA — sensores
     ============================================================ */
  function baseSensor(id, nombre, emoji, pines, extra) {
    var def = {
      nombre: nombre, cat: 'robotica', emoji: emoji,
      props: extra.props || {},
      size: extra.size || { x: -26, y: -24, w: 52, h: 52 },
      pins: pines,
      propsUI: extra.propsUI || [],
      dibujar: extra.dibujar,
      modelo: extra.modelo,
      medir: extra.medir,
      sensor: true,
      lectura: extra.lectura,
      info: extra.info
    };
    cat[id] = def;
    return def;
  }

  /* x de las cuatro patas del HC-SR04 (paso de 12 px de la protoboard).
     El dibujo usa esta misma lista que los pines, asi el nombre, el punto
     de soldadura y la pata siempre quedan en la misma vertical. */
  var XPIN = [-18, -6, 6, 18];

  baseSensor('ultrasonico', 'Sensor ultrasónico', '📡',
    [
      { id: 'v', x: XPIN[0], y: 22, rol: 'vcc', etq: 'VCC', pol: '+' },
      { id: 't', x: XPIN[1], y: 22, etq: 'TRG' },
      { id: 'e', x: XPIN[2], y: 22, etq: 'ECH' },
      { id: 'g', x: XPIN[3], y: 22, rol: 'gnd', etq: 'GND', pol: '−' }
    ],
    {
      props: { distancia: 40 },
      size: { x: -50, y: -52, w: 100, h: 76 },
      propsUI: [{ k: 'distancia', t: 'range', etq: 'Distancia', min: 2, max: 400, step: 1, fmt: function (v) { return Math.round(v) + ' cm'; }, vivo: true }],
      dibujar: function (c, st) {
        var on = st && st.alimentado;

        /* Los dos "ojos" del sensor: aro plateado grueso, anillo oscuro,
           la malla dorada y el disco gris del centro, en ese orden, como
           en el transductor real. */
        function transductor(cx) {
          return '<g transform="translate(' + cx + ' -19)">' +
            '<circle r="15" fill="url(#gAro)" stroke="#79818b" stroke-width=".8"/>' +
            '<circle r="11.9" fill="#7e848b"/>' +
            '<circle r="10.9" fill="url(#gMalla)"/>' +
            '<circle r="8.4" fill="#9aa0a6" stroke="#7c8288" stroke-width=".5"/>' +
            '<circle r="3" fill="#8b9197" opacity=".7"/>' +
            '<circle r="15" fill="url(#gLuz)" opacity=".24"/>' +
            '</g>';
        }

        /* Serigrafia de los cuatro pines: el nombre en vertical y, debajo,
           la almohadilla de soldadura de la que arranca la pata. Los pines
           siguen en su sitio de siempre (paso de 12 px), asi que la placa
           crecio hacia arriba y a los lados, no hacia abajo. */
        var nombres = ['Vcc', 'TRIG', 'ECHO', 'GND'];
        var silk = '';
        for (var i = 0; i < 4; i++) {
          var lx = XPIN[i];
          silk += '<text transform="translate(' + lx + ' 6) rotate(-90)" y="1.55" font-size="4.3" ' +
            'font-family="Verdana,Arial,sans-serif" fill="#e6ecf4">' + nombres[i] + '</text>' +
            '<rect x="' + (lx - 1.8) + '" y="6.7" width="3.6" height="4.6" rx="1.8" ' +
            'fill="url(#gMetV)" stroke="#6f7681" stroke-width=".4"/>';
        }

        // agujeros de montaje de las cuatro esquinas
        var tornillos = '';
        [[-43.5, -36], [43.5, -36], [-43.5, 6], [43.5, 6]].forEach(function (t) {
          tornillos += '<circle cx="' + t[0] + '" cy="' + t[1] + '" r="3.4" fill="#0f2547"/>' +
                       '<circle cx="' + t[0] + '" cy="' + t[1] + '" r="2.7" fill="#eef2f7"/>' +
                       '<circle cx="' + t[0] + '" cy="' + t[1] + '" r="1.5" fill="#c3ccd6"/>';
        });

        // las patas nacen en la almohadilla y bajan rectas hasta el pin
        var patas = '';
        XPIN.forEach(function (px) { patas += 'M' + px + ' 10.5 L' + px + ' 22 '; });

        return '<g class="body">' +
          // placa azul marino con el filete plateado del borde
          '<rect x="-48" y="-42" width="96" height="54" rx="4.6" fill="url(#gPcbAzul)" stroke="#0e1f3d" stroke-width="1.2"/>' +
          '<rect x="-45.6" y="-39.6" width="91.2" height="49.2" rx="3.2" fill="none" stroke="#cbd5e1" stroke-width=".6" opacity=".35"/>' +
          tornillos +
          // cristal de cuarzo: la capsula metalica ovalada de la parte de arriba
          '<rect x="-9.2" y="-38.6" width="18.4" height="6.4" rx="3.2" fill="url(#gMetH)" stroke="#6f7681" stroke-width=".6"/>' +
          transductor(-30) + transductor(30) +
          // serigrafia: el modelo en el hueco central y los canales T / R abajo
          '<text x="0" y="-17" text-anchor="middle" font-size="5" font-weight="bold" ' +
          'font-family="Verdana,Arial,sans-serif" fill="#f2f6fb">HC-SR04</text>' +
          '<text x="-46" y="1" font-size="6" font-weight="bold" font-family="Verdana,Arial,sans-serif" fill="#eef2f7">T</text>' +
          '<text x="41" y="1" font-size="6" font-weight="bold" font-family="Verdana,Arial,sans-serif" fill="#eef2f7">R</text>' +
          silk +
          // patas hacia los agujeros de la protoboard
          '<path d="' + patas + '" stroke="url(#gPata)" stroke-width="2.4"/>' +
          (on ? '<circle cx="0" cy="-27.4" r="1.9" fill="#4ade80"/>' +
                '<circle cx="0" cy="-27.4" r="4" fill="#4ade80" opacity=".3"/>' : '') +
          '</g>' +
          '<text class="value" x="0" y="-45" text-anchor="middle">' + Math.round(c.props.distancia) + ' cm</text>';
      },
      modelo: function () { return [{ t: 'r', p: 'v', n: 'g', r: 900, rol: 'sensor' }]; },
      medir: function (c, r) {
        var vp = r.vp || {}, alim = (vp.v - vp.g) > 2.7;
        return { alimentado: alim, distancia: c.props.distancia, texto: alim ? Math.round(c.props.distancia) + ' cm' : 'sin alimentación' };
      },
      lectura: function (c, st) { return st && st.alimentado ? c.props.distancia : null; },
      info: {
        tipo: 'Sensor de distancia por ultrasonido (HC-SR04)',
        datos: [['Alimentación', '5 V'], ['Rango', '2 cm a 400 cm'], ['Pines', 'VCC, TRIG, ECHO, GND'], ['Precisión', '≈ 3 mm']],
        que: 'Mide distancias como un murciélago: emite un sonido que las personas no oímos y cronometra cuánto tarda el eco en volver.',
        como: 'Se envía un pulso de 10 µs por TRIG. El sensor emite 8 pulsos de 40 kHz y pone ECHO en alto mientras espera el eco. Distancia = tiempo × 0,034 / 2.',
        donde: 'Robots que esquivan obstáculos, sensores de parqueo, medidores de nivel de agua, alarmas de proximidad.',
        errores: ['Alimentarlo con 3,3 V (necesita 5 V).', 'Olvidar dividir el tiempo entre 2 (el sonido va y vuelve).', 'Medir superficies blandas o inclinadas: el eco no regresa.'],
        ejemplo: 'digitalWrite(trig,HIGH); delayMicroseconds(10); digitalWrite(trig,LOW); t = pulseIn(echo,HIGH); cm = t*0.034/2;'
      }
    });

  baseSensor('ldr', 'Sensor de luz (LDR)', '🔆',
    [
      { id: 'a', x: -6, y: 18, etq: '1' },
      { id: 'b', x: 6,  y: 18, etq: '2' }
    ],
    {
      props: { luz: 70 },
      size: { x: -18, y: -20, w: 36, h: 42 },
      propsUI: [{ k: 'luz', t: 'range', etq: 'Luz', min: 0, max: 100, step: 1, fmt: function (v) { return Math.round(v) + ' %'; }, vivo: true }],
      dibujar: function (c) {
        var l = (c.props.luz || 0) / 100;
        return '<g class="body">' +
          '<circle cx="0" cy="-2" r="12" fill="#f5f5dc" stroke="#a3a3a3" stroke-width="1"/>' +
          '<path d="M-9 -8 q4.5 5 0 10 q4.5 -5 0 10" stroke="#dc2626" stroke-width="1.6" fill="none"/>' +
          '<path d="M-1 -8 q4.5 5 0 10 q4.5 -5 0 10" stroke="#dc2626" stroke-width="1.6" fill="none"/>' +
          '<circle cx="0" cy="-2" r="12" fill="#fde68a" opacity="' + (l * .75) + '"/>' +
          '<path d="M-6 10 L-6 18 M6 10 L6 18" stroke="#cbd5e1" stroke-width="1.6"/>' +
          '</g>' +
          '<text class="value" x="0" y="-17" text-anchor="middle">' + Math.round(c.props.luz) + '%</text>';
      },
      modelo: function (c) {
        var l = CL.clamp((c.props.luz || 0) / 100, 0, 1);
        // Oscuridad ≈ 200 kΩ · plena luz ≈ 500 Ω (escala logarítmica)
        var r = 500 * Math.pow(400, 1 - l);
        return [{ t: 'r', p: 'a', n: 'b', r: r, rol: 'ldr' }];
      },
      medir: function (c, r) { return { luz: c.props.luz, resistencia: r.r || 0, texto: Math.round(c.props.luz) + ' %' }; },
      lectura: function (c) { return c.props.luz; },
      info: {
        tipo: 'Fotorresistencia (LDR)',
        datos: [['Polaridad', 'No tiene'], ['A oscuras', '≈ 200 kΩ'], ['Con luz', '≈ 500 Ω'], ['Uso', 'Divisor de tensión con 10 kΩ']],
        que: 'Es una resistencia que cambia de valor según la luz que recibe: mucha luz, poca resistencia.',
        como: 'Se coloca en serie con una resistencia fija (10 kΩ) formando un divisor de tensión. El punto medio se lee con analogRead().',
        donde: 'Encendido automático de luces, alarmas por sombra, seguidores de línea, medidores de luz.',
        errores: ['Conectarla sola a un pin analógico (sin resistencia fija): la lectura no varía correctamente.', 'Esperar valores en lux: entrega un número de 0 a 1023.'],
        ejemplo: '5 V → LDR → A0 → resistencia 10 kΩ → GND'
      }
    });

  baseSensor('temp', 'Sensor de temperatura', '🌡️',
    [
      { id: 'v', x: -12, y: 18, rol: 'vcc', etq: '5V', pol: '+' },
      { id: 'o', x: 0,   y: 18, etq: 'OUT' },
      { id: 'g', x: 12,  y: 18, rol: 'gnd', etq: 'GND', pol: '−' }
    ],
    {
      props: { temp: 25 },
      size: { x: -20, y: -20, w: 40, h: 42 },
      propsUI: [{ k: 'temp', t: 'range', etq: 'Temperatura', min: -20, max: 80, step: 0.5, fmt: function (v) { return v + ' °C'; }, vivo: true }],
      dibujar: function (c) {
        return '<g class="body">' +
          '<path d="M-9 -12 A9 9 0 0 1 9 -12 L9 8 L-9 8 Z" fill="#111827" stroke="#374151"/>' +
          '<rect x="-9" y="-3" width="18" height="11" fill="#1f2937"/>' +
          '<text x="0" y="4" text-anchor="middle" font-size="6" fill="#94a3b8" font-family="system-ui">TMP36</text>' +
          '<path d="M-12 8 L-12 18 M0 8 L0 18 M12 8 L12 18" stroke="#cbd5e1" stroke-width="1.6"/>' +
          '</g>' +
          '<text class="value" x="0" y="-16" text-anchor="middle">' + c.props.temp + '°C</text>';
      },
      modelo: function (c) {
        // TMP36: Vout = 0,5 V + 10 mV/°C
        var v = 0.5 + 0.01 * (+c.props.temp || 0);
        return [
          { t: 'r', p: 'v', n: 'g', r: 12000, rol: 'sensor' },
          { t: 'vsens', p: 'o', n: 'g', v: v, rser: 800, alim: ['v', 'g'], vmin: 2.7 }
        ];
      },
      medir: function (c, r) {
        var vp = r.vp || {};
        return { alimentado: (vp.v - vp.g) > 2.7, temp: c.props.temp, texto: c.props.temp + ' °C' };
      },
      lectura: function (c, st) { return st && st.alimentado ? c.props.temp : null; },
      info: {
        tipo: 'Sensor de temperatura analógico (TMP36)',
        datos: [['Alimentación', '2,7 – 5,5 V'], ['Salida', '0,5 V a 0 °C'], ['Escala', '10 mV por cada °C'], ['Rango', '−40 °C a 125 °C']],
        que: 'Entrega una tensión proporcional a la temperatura. Es de los sensores más fáciles de leer con Arduino.',
        como: 'A 0 °C entrega 0,5 V y sube 10 mV por grado. Para pasar de la lectura analógica a grados: °C = (lectura × 5 / 1023 − 0,5) × 100.',
        donde: 'Termómetros, control de ventiladores, invernaderos, incubadoras, estaciones meteorológicas.',
        errores: ['Invertir VCC y GND (se calienta y se daña).', 'Olvidar restar los 0,5 V de offset.', 'Leerlo con un pin digital.'],
        ejemplo: 'float v = analogRead(A0) * 5.0 / 1023.0; float c = (v - 0.5) * 100;'
      }
    });

  baseSensor('pir', 'Sensor de movimiento', '👁️',
    [
      { id: 'v', x: -12, y: 20, rol: 'vcc', etq: '5V', pol: '+' },
      { id: 'o', x: 0,   y: 20, etq: 'OUT' },
      { id: 'g', x: 12,  y: 20, rol: 'gnd', etq: 'GND', pol: '−' }
    ],
    {
      props: { detecta: false },
      size: { x: -24, y: -24, w: 48, h: 48 },
      propsUI: [{ k: 'detecta', t: 'bool', etq: '¿Hay movimiento?', vivo: true }],
      dibujar: function (c, st) {
        var d = c.props.detecta, on = st && st.alimentado;
        return '<g class="body">' +
          '<rect x="-20" y="-18" width="40" height="34" rx="4" fill="#0f766e" stroke="#115e59"/>' +
          '<circle cx="0" cy="-2" r="14" fill="#e2e8f0" opacity=".92"/>' +
          '<circle cx="0" cy="-2" r="14" fill="none" stroke="#94a3b8"/>' +
          '<path d="M-10 -2 A10 10 0 0 1 10 -2" stroke="#94a3b8" fill="none"/>' +
          '<path d="M0 -12 L0 8" stroke="#94a3b8"/>' +
          (d && on ? '<circle cx="0" cy="-2" r="6" fill="#ef4444" opacity=".65"/>' : '') +
          '<path d="M-12 16 L-12 20 M0 16 L0 20 M12 16 L12 20" stroke="#cbd5e1" stroke-width="1.6"/>' +
          '</g>' +
          (d ? '<text class="value" x="0" y="-22" text-anchor="middle">¡movimiento!</text>' : '');
      },
      modelo: function (c) {
        return [
          { t: 'r', p: 'v', n: 'g', r: 8000, rol: 'sensor' },
          { t: 'vsens', p: 'o', n: 'g', v: c.props.detecta ? 3.3 : 0, rser: 300, alim: ['v', 'g'], vmin: 4 }
        ];
      },
      medir: function (c, r) {
        var vp = r.vp || {};
        return { alimentado: (vp.v - vp.g) > 4, detecta: !!c.props.detecta, texto: c.props.detecta ? 'movimiento' : 'quieto' };
      },
      lectura: function (c, st) { return st && st.alimentado ? (c.props.detecta ? 1 : 0) : null; },
      info: {
        tipo: 'Sensor infrarrojo pasivo (PIR HC-SR501)',
        datos: [['Alimentación', '5 V'], ['Salida', 'Digital: 3,3 V cuando detecta'], ['Alcance', '3 a 7 metros'], ['Ángulo', '≈ 110°']],
        que: 'Detecta el calor en movimiento de personas y animales. No "ve" objetos quietos: solo cambios.',
        como: 'Capta la radiación infrarroja del cuerpo. Si cambia de una zona a otra de su lente, activa la salida durante unos segundos.',
        donde: 'Alarmas, luces automáticas de pasillo, puertas, contadores de personas.',
        errores: ['Leer su salida con analogRead cuando es digital.', 'Ponerlo frente a una ventana con sol (falsas alarmas).', 'No esperar los 30 s de calibración inicial.'],
        ejemplo: 'if (digitalRead(2) == HIGH) { digitalWrite(led, HIGH); tone(buzzer, 880); }'
      }
    });

  baseSensor('humedad', 'Sensor de humedad', '💧',
    [
      { id: 'v', x: -12, y: 20, rol: 'vcc', etq: '5V', pol: '+' },
      { id: 'o', x: 0,   y: 20, etq: 'DAT' },
      { id: 'g', x: 12,  y: 20, rol: 'gnd', etq: 'GND', pol: '−' }
    ],
    {
      props: { humedad: 55 },
      size: { x: -20, y: -24, w: 40, h: 50 },
      propsUI: [{ k: 'humedad', t: 'range', etq: 'Humedad', min: 0, max: 100, step: 1, fmt: function (v) { return Math.round(v) + ' %'; }, vivo: true }],
      dibujar: function (c) {
        return '<g class="body">' +
          '<rect x="-14" y="-18" width="28" height="34" rx="3" fill="#0369a1" stroke="#075985"/>' +
          '<g fill="#0c4a6e">' +
          '<circle cx="-7" cy="-11" r="2"/><circle cx="0" cy="-11" r="2"/><circle cx="7" cy="-11" r="2"/>' +
          '<circle cx="-7" cy="-4" r="2"/><circle cx="0" cy="-4" r="2"/><circle cx="7" cy="-4" r="2"/>' +
          '<circle cx="-7" cy="3" r="2"/><circle cx="0" cy="3" r="2"/><circle cx="7" cy="3" r="2"/></g>' +
          '<path d="M-12 16 L-12 20 M0 16 L0 20 M12 16 L12 20" stroke="#cbd5e1" stroke-width="1.6"/>' +
          '</g>' +
          '<text class="value" x="0" y="-21" text-anchor="middle">' + Math.round(c.props.humedad) + '%</text>';
      },
      modelo: function (c) {
        return [
          { t: 'r', p: 'v', n: 'g', r: 15000, rol: 'sensor' },
          { t: 'vsens', p: 'o', n: 'g', v: CL.map(c.props.humedad, 0, 100, 0, 5), rser: 600, alim: ['v', 'g'], vmin: 3 }
        ];
      },
      medir: function (c, r) {
        var vp = r.vp || {};
        return { alimentado: (vp.v - vp.g) > 3, humedad: c.props.humedad, texto: Math.round(c.props.humedad) + ' % HR' };
      },
      lectura: function (c, st) { return st && st.alimentado ? c.props.humedad : null; },
      info: {
        tipo: 'Sensor de humedad (DHT11 simplificado)',
        datos: [['Alimentación', '3,3 – 5 V'], ['Rango', '20 % a 90 % HR'], ['Salida', 'Digital en el real; analógica aquí']],
        que: 'Mide cuánta agua hay en el aire (humedad relativa). En este simulador entrega una tensión proporcional para que puedas leerlo con analogRead().',
        como: 'Un material cambia su conductividad según la humedad. El sensor convierte ese cambio en una señal que el microcontrolador interpreta.',
        donde: 'Invernaderos, secadoras, estaciones meteorológicas, control de riego, incubadoras.',
        errores: ['Tocar la parte sensible con los dedos.', 'Consultarlo más rápido de lo que soporta (1 lectura por segundo).'],
        ejemplo: 'int h = map(analogRead(A1), 0, 1023, 0, 100);  // humedad en %'
      }
    });

  baseSensor('joystick', 'Joystick', '🕹️',
    [
      { id: 'g', x: -24, y: 26, rol: 'gnd', etq: 'GND', pol: '−' },
      { id: 'v', x: -12, y: 26, rol: 'vcc', etq: '5V', pol: '+' },
      { id: 'x', x: 0,   y: 26, etq: 'VRx' },
      { id: 'y', x: 12,  y: 26, etq: 'VRy' },
      { id: 's', x: 24,  y: 26, etq: 'SW' }
    ],
    {
      props: { x: 50, y: 50, boton: false },
      size: { x: -32, y: -32, w: 64, h: 64 },
      propsUI: [
        { k: 'x', t: 'range', etq: 'Eje X', min: 0, max: 100, step: 1, fmt: function (v) { return Math.round(v) + ' %'; }, vivo: true },
        { k: 'y', t: 'range', etq: 'Eje Y', min: 0, max: 100, step: 1, fmt: function (v) { return Math.round(v) + ' %'; }, vivo: true },
        { k: 'boton', t: 'bool', etq: 'Botón pulsado', vivo: true }
      ],
      dibujar: function (c) {
        var dx = CL.map(c.props.x, 0, 100, -8, 8), dy = CL.map(c.props.y, 0, 100, 8, -8);
        return '<g class="body">' +
          '<rect x="-26" y="-24" width="52" height="46" rx="4" fill="#1e293b" stroke="#0f172a"/>' +
          '<circle cx="0" cy="-2" r="16" fill="#0f172a"/>' +
          '<circle cx="' + dx + '" cy="' + (dy - 2) + '" r="11" fill="' + (c.props.boton ? '#22d3ee' : '#334155') + '" stroke="#64748b"/>' +
          '<path d="M-24 22 L-24 26 M-12 22 L-12 26 M0 22 L0 26 M12 22 L12 26 M24 22 L24 26" stroke="#cbd5e1" stroke-width="1.6"/>' +
          '</g>' +
          '<text class="value" x="0" y="-28" text-anchor="middle">X:' + Math.round(c.props.x) + ' Y:' + Math.round(c.props.y) + '</text>';
      },
      modelo: function (c) {
        return [
          { t: 'vsens', p: 'x', n: 'g', v: CL.map(c.props.x, 0, 100, 0, 5), rser: 500, alim: ['v', 'g'], vmin: 3 },
          { t: 'vsens', p: 'y', n: 'g', v: CL.map(c.props.y, 0, 100, 0, 5), rser: 500, alim: ['v', 'g'], vmin: 3 },
          { t: 'sw', p: 's', n: 'g', cerrado: !!c.props.boton }
        ];
      },
      medir: function (c, r) {
        var vp = r.vp || {};
        return { alimentado: (vp.v - vp.g) > 3, texto: 'X ' + Math.round(c.props.x) + ' · Y ' + Math.round(c.props.y) };
      },
      info: {
        tipo: 'Módulo joystick de 2 ejes con pulsador',
        datos: [['Pines', 'GND, +5V, VRx, VRy, SW'], ['Salidas', 'Dos analógicas y una digital'], ['Centro', '≈ 512 en analogRead']],
        que: 'Son dos potenciómetros cruzados más un pulsador: uno mide el movimiento horizontal y otro el vertical.',
        como: 'Cada eje entrega una tensión entre 0 y 5 V. En reposo queda a la mitad (≈ 2,5 V, valor 512). El pulsador se activa al presionar la palanca.',
        donde: 'Control de robots, videojuegos, cámaras móviles, brazos robóticos, drones.',
        errores: ['Olvidar la resistencia pull-up del pulsador (usa INPUT_PULLUP).', 'Esperar exactamente 512 en reposo: siempre hay una pequeña desviación.'],
        ejemplo: 'int x = analogRead(A0); int y = analogRead(A1); if (x > 700) avanzar();'
      }
    });

  baseSensor('ir', 'Receptor IR', '📶',
    [
      { id: 'o', x: -12, y: 18, etq: 'OUT' },
      { id: 'g', x: 0,   y: 18, rol: 'gnd', etq: 'GND', pol: '−' },
      { id: 'v', x: 12,  y: 18, rol: 'vcc', etq: '5V', pol: '+' }
    ],
    {
      props: { tecla: 0 },
      size: { x: -18, y: -20, w: 36, h: 42 },
      propsUI: [{ k: 'tecla', t: 'select', etq: 'Tecla recibida', op: [[0,'— ninguna —'],[1,'1'],[2,'2'],[3,'3'],[10,'▲ arriba'],[11,'▼ abajo'],[12,'OK']], num: true, vivo: true }],
      dibujar: function (c, st) {
        return '<g class="body">' +
          '<path d="M-9 -12 A9 10 0 0 1 9 -12 L9 6 L-9 6 Z" fill="#111827" stroke="#374151"/>' +
          '<rect x="-9" y="0" width="18" height="7" fill="#1f2937"/>' +
          (c.props.tecla ? '<circle cx="0" cy="-8" r="3" fill="#22d3ee" opacity=".8"/>' : '') +
          '<path d="M-12 7 L-12 18 M0 7 L0 18 M12 7 L12 18" stroke="#cbd5e1" stroke-width="1.6"/>' +
          '</g>';
      },
      modelo: function (c) {
        return [
          { t: 'r', p: 'v', n: 'g', r: 20000, rol: 'sensor' },
          { t: 'vsens', p: 'o', n: 'g', v: c.props.tecla ? 0 : 5, rser: 400, alim: ['v', 'g'], vmin: 3 }
        ];
      },
      medir: function (c, r) {
        var vp = r.vp || {};
        return { alimentado: (vp.v - vp.g) > 3, tecla: c.props.tecla, texto: c.props.tecla ? 'tecla ' + c.props.tecla : 'sin señal' };
      },
      lectura: function (c, st) { return st && st.alimentado ? c.props.tecla : null; },
      info: {
        tipo: 'Receptor de infrarrojos (TSOP1838)',
        datos: [['Alimentación', '5 V'], ['Salida', 'Digital, activa en bajo'], ['Frecuencia', '38 kHz']],
        que: 'Recibe los destellos invisibles que envía un control remoto y los convierte en una señal que el microcontrolador puede leer.',
        como: 'Filtra la luz que parpadea a 38 kHz. Cada botón del control envía un código distinto en forma de pulsos.',
        donde: 'Televisores, aires acondicionados, robots controlados a distancia, domótica.',
        errores: ['Confundir el orden de sus tres patas (varía según el modelo).', 'Usarlo bajo luz solar directa.'],
        ejemplo: 'Con la librería IRremote: if (results.value == 0xFF30CF) encenderLed();'
      }
    });

  /* ============================================================
     Utilidades del catálogo
     ============================================================ */
  CL.pinDe = function (tipo, pinId) {
    var def = cat[tipo];
    if (!def) return null;
    for (var i = 0; i < def.pins.length; i++) if (def.pins[i].id === pinId) return def.pins[i];
    return null;
  };

  /** Cuerpo ennegrecido y humo, para cualquier componente que se queme. */
  CL.dibujoQuemado = function (colorBase) {
    return '<g class="body quemado">' +
      '<path d="M-8 4 A8 8 0 0 1 8 4 L8 8 L-8 8 Z" fill="#2b2b2b"/>' +
      '<path d="M-8 -12 A8 9 0 0 1 8 -12 L8 6 L-8 6 Z" fill="#1c1c1c"/>' +
      '<path d="M-5 -9 q3 4 1 7 q4 -2 5 2" stroke="#4b4b4b" stroke-width="1.1" fill="none"/>' +
      '<rect x="-10" y="6" width="20" height="3.4" rx="1.4" fill="' + colorBase + '" opacity=".25"/>' +
      '<path d="M-6 9 L-6 18" stroke="#7c7c7c" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M6 9 L6.9 12.4 L5.2 15.2 L6 18" stroke="#6b6b6b" stroke-width="1.6" fill="none" ' +
      '      stroke-linecap="round" stroke-linejoin="round"/>' +
      '<g class="humo"><circle cx="-2" cy="-15" r="3.2"/><circle cx="2" cy="-15" r="2.6"/>' +
      '<circle cx="0" cy="-15" r="3.9"/></g></g>' +
      '<text class="value quemado-txt" x="0" y="-24" text-anchor="middle">quemado</text>';
  };

  /** Coordenadas absolutas de un pin (aplica rotación). */
  CL.posPin = function (c, pinId) {
    var p = CL.pinDe(c.type, pinId);
    if (!p) return null;
    var r = CL.rotComp(c, p.x, p.y);
    return { x: c.x + r.x, y: c.y + r.y };
  };

  CL.nombreComp = function (c) {
    var def = cat[c.type];
    if (!def) return c.type;
    return def.nombreDe ? def.nombreDe(c) : def.nombre;
  };

  /* Cada icono es un <svg> aparte, pero vive en el MISMO documento HTML que el
     lienzo y que los otros treinta y tantos iconos. Si todos declararan sus
     degradados con el mismo id, `url(#gServo)` resolveria siempre al PRIMERO
     del documento; y en cuanto ese primero cae dentro de una categoria plegada
     de la paleta (`display:none`) el navegador deja de servirlo y todas las
     piezas que lo usan se quedan sin color de golpe — pasaba con el servo y el
     sensor ultrasonico al plegar «Electronica basica».
     Por eso cada icono renombra con un sufijo propio los ids que el mismo
     declara (los de DEFS_COMUNES y los que anade `personalizar.js`) junto con
     las referencias `url(#…)` que apuntan a ellos. Lo que no declara —los
     filtros `glowSoft`/`glowStrong` del lienzo— se deja intacto. */
  var seqIcono = 0;

  function aislarIds(svg) {
    var suf = '_i' + (++seqIcono), ids = [];
    svg.replace(/id="([A-Za-z0-9_]+)"/g, function (_, id) {
      if (ids.indexOf(id) < 0) ids.push(id);
      return _;
    });
    ids.forEach(function (id) {
      svg = svg.split('id="' + id + '"').join('id="' + id + suf + '"')
               .split('url(#' + id + ')').join('url(#' + id + suf + ')');
    });
    return svg;
  }

  CL.iconoSVG = function (tipo, ancho, alto) {
    var def = cat[tipo];
    if (!def) return '';
    var s = def.size, c = { id: 'preview', type: tipo, x: 0, y: 0, rot: 0, props: Object.assign({}, def.props || {}) };
    var cuerpo = def.dibujar ? def.dibujar(c, {}) : '';
    var pad = 4;
    return aislarIds(
      '<svg viewBox="' + (s.x - pad) + ' ' + (s.y - pad) + ' ' + (s.w + pad * 2) + ' ' + (s.h + pad * 2) + '" ' +
      'width="' + (ancho || 44) + '" height="' + (alto || 34) + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' + CL.DEFS_COMUNES + '</defs>' + cuerpo + '</svg>');
  };

}(window.CL));
