/* ============================================================
   CircuitLab — catálogo, segunda parte
   Componentes que necesitan los elementos gobernados del motor
   eléctrico ('swc' = interruptor gobernado, 'rc' = resistencia
   gobernada). Se cargan después de catalog.js y se añaden al
   mismo objeto CL.catalogo.

   Con esto se puede enseñar por fin la pregunta que faltaba:
   «¿por qué el Arduino no puede mover el motor él solo?».
   ============================================================ */
(function (CL) {
  'use strict';

  var cat = CL.catalogo;
  var LED_COLORES = CL.LED_COLORES;

  /* ============================================================
     RELÉ — un interruptor que se acciona con electricidad
     ============================================================ */
  cat.rele = {
    nombre: 'Relé', cat: 'robotica', emoji: '🔀',
    props: { vbobina: 5 },
    size: { x: -34, y: -30, w: 68, h: 60 },
    pins: [
      { id: 'a1',  x: -24, y: 24, rol: 'bobina', etq: 'A1', pol: '+' },
      { id: 'a2',  x: -12, y: 24, rol: 'bobina', etq: 'A2', pol: '−' },
      { id: 'com', x: 0,   y: 24, etq: 'COM' },
      { id: 'no',  x: 12,  y: 24, etq: 'NO' },
      { id: 'nc',  x: 24,  y: 24, etq: 'NC' }
    ],
    propsUI: [{ k: 'vbobina', t: 'select', etq: 'Tensión de la bobina', op: [[5, '5 V'], [12, '12 V']], num: true }],
    dibujar: function (c, st) {
      var on = st && st.activado;
      return '<g class="body">' +
        '<path d="M-24 24 L-24 19 M-12 24 L-12 19 M0 24 L0 19 M12 24 L12 19 M24 24 L24 19" ' +
        '      stroke="#c3ccd8" stroke-width="2" stroke-linecap="round"/>' +
        // cubo de plástico azul
        '<rect x="-27" y="-22" width="54" height="42" rx="2.5" fill="url(#gAzul)"/>' +
        '<rect x="-27" y="-22" width="54" height="11" rx="2.5" fill="#fff" opacity=".12"/>' +
        '<rect x="-27" y="-22" width="54" height="42" rx="2.5" fill="none" stroke="#0f2a63" stroke-width=".8"/>' +
        // ventana con la lámina que se mueve al activarse
        '<rect x="-21" y="-17" width="42" height="20" rx="1.6" fill="#0b1b3d" opacity=".55"/>' +
        '<path class="rele-lamina" d="M-16 ' + (on ? -6 : -12) + ' L14 ' + (on ? -12 : -6) + '" ' +
        '      stroke="' + (on ? '#fbbf24' : '#94a3b8') + '" stroke-width="2.6" stroke-linecap="round"/>' +
        '<circle cx="-16" cy="-9" r="2.4" fill="#cbd5e1"/>' +
        '<circle cx="14" cy="-12" r="1.9" fill="' + (on ? '#fbbf24' : '#64748b') + '"/>' +
        '<circle cx="14" cy="-6" r="1.9" fill="' + (on ? '#64748b' : '#4ade80') + '"/>' +
        // bobina dibujada al lado
        '<path d="M-23 6 q3 -4 6 0 q3 -4 6 0 q3 -4 6 0" fill="none" stroke="' + (on ? '#fbbf24' : '#7f97c9') + '" stroke-width="1.6"/>' +
        '<text x="8" y="10" text-anchor="middle" font-size="5.4" fill="#c7d6f5" font-family="system-ui">RELÉ ' + (c.props.vbobina || 5) + 'V</text>' +
        // testigo de encendido
        (on ? '<circle cx="21" cy="-17" r="2.6" fill="#ef4444" filter="url(#glowSoft)"/>' : '') +
        '</g>' +
        '<text class="value" x="0" y="-26" text-anchor="middle">' + (on ? 'activado (COM–NO)' : 'reposo (COM–NC)') + '</text>';
    },
    modelo: function (c) {
      var v = +c.props.vbobina || 5;
      return [
        { t: 'r',   p: 'a1', n: 'a2', r: v >= 12 ? 400 : 70, rol: 'bobina' },
        { t: 'swc', p: 'com', n: 'no', ctrl: ['a1', 'a2'], vmin: v * 0.65, rol: 'contacto' },
        { t: 'swc', p: 'com', n: 'nc', ctrl: ['a1', 'a2'], vmin: v * 0.65, invertido: true, rol: 'contacto' }
      ];
    },
    medir: function (c, r) {
      var vp = r.vp || {};
      var vb = Math.abs((vp.a1 || 0) - (vp.a2 || 0));
      var v = +c.props.vbobina || 5;
      var act = vb >= v * 0.65;
      return { activado: act, vbobina: vb, texto: act ? 'COM–NO' : 'COM–NC' };
    },
    info: {
      tipo: 'Relé electromecánico (SRD-05VDC-SL-C)',
      datos: [['Bobina', '5 V, ≈ 70 mA'], ['Contactos', 'COM, NO (abierto) y NC (cerrado)'],
              ['Aísla', 'El circuito de control no toca al de potencia'], ['Corriente que maneja', 'Hasta 10 A']],
      que: 'Es un interruptor que se acciona con electricidad en vez de con el dedo. Un electroimán tira de una lámina y cambia los contactos de sitio.',
      como: 'Al dar tensión a la bobina (A1–A2), el electroimán atrae la lámina: COM se separa de NC y se pega a NO. Al quitar la tensión, un muelle la devuelve. Lo importante es que la bobina y los contactos están AISLADOS: puedes controlar 220 V con 5 V.',
      donde: 'Encender lámparas o motores grandes desde un Arduino, domótica, arranque de carros, semáforos.',
      errores: [
        'Conectar la bobina directo a un pin del Arduino: consume 70 mA y el pin da 40 mA. Usa un transistor.',
        'Olvidar el diodo en paralelo con la bobina: al apagarla devuelve un pico de tensión que daña la placa.',
        'Confundir NO con NC y que todo funcione al revés.'
      ],
      ejemplo: 'Arduino D8 → resistencia 1 kΩ → base del transistor; bobina entre 5 V y el colector; COM y NO en serie con la lámpara.'
    }
  };

  /* ============================================================
     TRANSISTOR NPN — el amplificador / interruptor electrónico
     ============================================================ */
  cat.transistor = {
    nombre: 'Transistor NPN', cat: 'basica', emoji: '🔺',
    props: {},
    size: { x: -17, y: -25, w: 34, h: 46 },
    pins: [
      { id: 'c', x: -12, y: 18, etq: 'C' },
      { id: 'b', x: 0,   y: 18, etq: 'B' },
      { id: 'e', x: 12,  y: 18, etq: 'E' }
    ],
    dibujar: function (c, st) {
      var on = st && st.conduce;
      return '<g class="body">' +
        '<path d="M-12 18 L-12 8 M0 18 L0 8 M12 18 L12 8" stroke="#c3ccd8" stroke-width="1.8" stroke-linecap="round"/>' +
        // encapsulado TO-92: medio cilindro con la cara plana al frente
        '<path d="M-13 6 L-13 -8 A13 13 0 0 1 13 -8 L13 6 Z" fill="url(#gNegro)"/>' +
        '<path d="M-13 6 L-13 -8 A13 13 0 0 1 13 -8 L13 6 Z" fill="none" stroke="#0a0d12" stroke-width=".8"/>' +
        '<path d="M-13 -6 A13 13 0 0 1 13 -6 L13 -3 A13 13 0 0 0 -13 -3 Z" fill="#fff" opacity=".10"/>' +
        '<text x="0" y="0" text-anchor="middle" font-size="5.6" fill="#9aa5b3" font-family="system-ui">BC547</text>' +
        // el punto se ilumina cuando el transistor conduce
        (on ? '<circle cx="0" cy="-11" r="2.6" fill="#22d3ee" filter="url(#glowSoft)"/>' : '') +
        '</g>' +
        '<text class="polarity n" x="-15" y="16">C</text>' +
        '<text class="polarity n" x="15" y="16">E</text>' +
        (st && st.ic > 1e-4 ? '<text class="value" x="0" y="-20" text-anchor="middle">' + CL.fmtA(st.ic) + '</text>' : '');
    },
    modelo: function () {
      return [
        // unión base-emisor: es un diodo de verdad, por eso hace falta resistencia en la base
        { t: 'led', p: 'b', n: 'e', vf: 0.7, rd: 10, rol: 'be' },
        // fuga interna base-emisor: sin ella, una base "al aire" recoge tension
        // fantasma del propio simulador y el transistor conduce sin mandarselo
        { t: 'r', p: 'b', n: 'e', r: 100000, rol: 'fuga' },
        // colector-emisor: pasa de corte (5 MΩ) a saturación (0,8 Ω) según Vbe
        { t: 'rc', p: 'c', n: 'e', ctrl: ['b', 'e'], von: 0.62, ron: 0.8, roff: 5e6, rol: 'ce' }
      ];
    },
    medir: function (c, r) {
      var els = r.els || [], ic = 0, ib = 0, vce = 0;
      for (var i = 0; i < els.length; i++) {
        if (els[i].rol === 'ce') { ic = Math.abs(els[i]._i || 0); vce = els[i]._dv || 0; }
        if (els[i].rol === 'be') ib = Math.abs(els[i]._i || 0);
      }
      var vp = r.vp || {};
      var vbe = (vp.b || 0) - (vp.e || 0);
      return { conduce: vbe >= 0.62, ic: ic, ib: ib, vbe: vbe, vce: vce,
               texto: vbe >= 0.62 ? CL.fmtA(ic) : 'en corte' };
    },
    info: {
      tipo: 'Transistor bipolar NPN (BC547 / 2N2222)',
      datos: [['Patas', 'C (colector), B (base), E (emisor)'], ['Se activa con', 'Vbe ≈ 0,7 V'],
              ['Ganancia', '≈ 100 — 1 mA en la base mueve 100 mA'], ['Resistencia de base', 'Obligatoria: 1 kΩ típica']],
      que: 'Es una llave electrónica sin partes móviles: con una corriente pequeñísima en la base deja pasar una corriente grande entre colector y emisor.',
      como: 'Entre base y emisor hay un diodo. Cuando lo superas (≈ 0,7 V) el transistor “abre el grifo” del colector al emisor. Por eso un pin del Arduino, que solo da 40 mA, puede mandar un motor o un relé de 300 mA.',
      donde: 'Encender motores, relés y tiras LED desde un microcontrolador; amplificar señales; toda la electrónica digital por dentro.',
      errores: [
        'Conectar la base directo al pin sin resistencia: se quema el transistor o el pin.',
        'Cambiar el colector por el emisor: no funciona.',
        'Olvidar unir todos los GND (el del motor y el de la placa).'
      ],
      ejemplo: 'D9 → 1 kΩ → base; motor entre +6 V y el colector; emisor a GND. Diodo en paralelo con el motor.',
      formula: 'Ic ≈ β · Ib   ·   Rbase = (Vpin − 0,7) / Ib'
    }
  };

  /* ============================================================
     DRIVER DE MOTOR — puente H (tipo L293D / L298N)
     ============================================================ */
  cat.driver = {
    nombre: 'Driver de motor', cat: 'robotica', emoji: '🎛',
    props: {},
    size: { x: -50, y: -38, w: 100, h: 74 },
    pins: [
      { id: 'out1', x: -12, y: -24, etq: 'OUT1' },
      { id: 'out2', x: 12,  y: -24, etq: 'OUT2' },
      { id: 'vcc',  x: -36, y: 24, rol: 'vcc', etq: 'VCC', pol: '+' },
      { id: 'gnd',  x: -24, y: 24, rol: 'gnd', etq: 'GND', pol: '−' },
      { id: 'ena',  x: -12, y: 24, etq: 'ENA' },
      { id: 'in1',  x: 0,   y: 24, etq: 'IN1' },
      { id: 'in2',  x: 12,  y: 24, etq: 'IN2' }
    ],
    dibujar: function (c, st) {
      var s = st || {};
      var luz = function (on, col) { return on ? col : '#2b3442'; };
      return '<g class="body">' +
        '<path d="M-12 -24 L-12 -18 M12 -24 L12 -18" stroke="#c3ccd8" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M-36 24 L-36 18 M-24 24 L-24 18 M-12 24 L-12 18 M0 24 L0 18 M12 24 L12 18" ' +
        '      stroke="#c3ccd8" stroke-width="2" stroke-linecap="round"/>' +
        // placa verde con el integrado
        '<rect x="-44" y="-18" width="88" height="36" rx="3" fill="url(#gPcb)" stroke="#064e52" stroke-width=".8"/>' +
        '<rect x="-16" y="-11" width="32" height="22" rx="2" fill="url(#gNegro)"/>' +
        '<circle cx="-11" cy="-6" r="1.6" fill="#0a0d12"/>' +
        '<text x="0" y="3" text-anchor="middle" font-size="6" fill="#8b95a3" font-family="system-ui">L293D</text>' +
        // disipador y bornes de salida
        '<rect x="-24" y="-16" width="48" height="3" rx="1.5" fill="#0b3b3f"/>' +
        '<circle cx="-12" cy="-14" r="3.4" fill="#1f2937" stroke="#0f172a"/>' +
        '<circle cx="12" cy="-14" r="3.4" fill="#1f2937" stroke="#0f172a"/>' +
        // testigos: alimentación, sentido de giro
        '<circle cx="-36" cy="12" r="2.2" fill="' + luz(s.alimentado, '#ef4444') + '"/>' +
        '<circle cx="30" cy="-8" r="2.2" fill="' + luz(s.sentido === 1, '#4ade80') + '"/>' +
        '<circle cx="30" cy="0" r="2.2" fill="' + luz(s.sentido === -1, '#fbbf24') + '"/>' +
        '<circle cx="30" cy="8" r="2.2" fill="' + luz(s.habilitado, '#22d3ee') + '"/>' +
        '</g>' +
        '<text class="value" x="0" y="-28" text-anchor="middle">' + (s.texto || '') + '</text>';
    },
    modelo: function () {
      return [
        { t: 'r', p: 'vcc', n: 'gnd', r: 1800, rol: 'driver' },
        // resistencias de bajada: una entrada al aire vale 0, no medio VCC
        { t: 'r', p: 'ena', n: 'gnd', r: 100000, rol: 'pulldown' },
        { t: 'r', p: 'in1', n: 'gnd', r: 100000, rol: 'pulldown' },
        { t: 'r', p: 'in2', n: 'gnd', r: 100000, rol: 'pulldown' },
        // medio puente de OUT1
        { t: 'swc', p: 'vcc', n: 'out1', ctrl: ['in1', 'gnd'], vmin: 2.2, ctrl2: ['ena', 'gnd'], vmin2: 2.2 },
        { t: 'swc', p: 'gnd', n: 'out1', ctrl: ['in1', 'gnd'], vmin: 2.2, invertido: true, ctrl2: ['ena', 'gnd'], vmin2: 2.2 },
        // medio puente de OUT2
        { t: 'swc', p: 'vcc', n: 'out2', ctrl: ['in2', 'gnd'], vmin: 2.2, ctrl2: ['ena', 'gnd'], vmin2: 2.2 },
        { t: 'swc', p: 'gnd', n: 'out2', ctrl: ['in2', 'gnd'], vmin: 2.2, invertido: true, ctrl2: ['ena', 'gnd'], vmin2: 2.2 }
      ];
    },
    medir: function (c, r) {
      var vp = r.vp || {};
      var alim = (vp.vcc - vp.gnd) > 2.5;
      var hab = (vp.ena - vp.gnd) > 2.2;
      var i1 = (vp.in1 - vp.gnd) > 2.2, i2 = (vp.in2 - vp.gnd) > 2.2;
      var sentido = 0, texto = '';
      if (!alim) texto = 'sin alimentación';
      else if (!hab) texto = 'ENA en bajo: parado';
      else if (i1 && !i2) { sentido = 1; texto = 'girando →'; }
      else if (!i1 && i2) { sentido = -1; texto = 'girando ←'; }
      else texto = i1 ? 'freno' : 'parado';
      return { alimentado: alim, habilitado: hab && alim, sentido: alim && hab ? sentido : 0, texto: texto };
    },
    info: {
      tipo: 'Puente H / driver de motores (L293D, L298N)',
      datos: [['VCC', 'Alimentación del motor (5 – 12 V)'], ['ENA', 'Habilita la salida: sin él no se mueve'],
              ['IN1 / IN2', 'Deciden el sentido de giro'], ['OUT1 / OUT2', 'Van al motor']],
      que: 'Es el músculo intermedio entre el Arduino y el motor: la placa manda señales pequeñitas y el driver entrega la corriente grande, además de poder invertir el giro.',
      como: 'Por dentro hay cuatro interruptores en forma de H. Si cierra la pareja de una diagonal, la corriente atraviesa el motor en un sentido; con la otra diagonal, al revés. IN1=1 e IN2=0 gira a un lado; IN1=0 e IN2=1, al otro; iguales, se para.',
      donde: 'Carros robot, cintas transportadoras, brazos, cualquier proyecto con motores que deban ir hacia adelante y hacia atrás.',
      errores: [
        'Dejar ENA sin conectar: el motor no se mueve y parece que el driver está dañado.',
        'Poner IN1 e IN2 iguales y esperar movimiento (eso es freno).',
        'No unir el GND del driver con el del Arduino.'
      ],
      ejemplo: 'ENA→5 V, IN1→D8, IN2→D9, OUT1/OUT2→motor. digitalWrite(8,HIGH); digitalWrite(9,LOW);'
    }
  };

  /* ============================================================
     LED RGB — tres LEDs en una sola cápsula (cátodo común)
     ============================================================ */
  cat.ledrgb = {
    nombre: 'LED RGB', cat: 'basica', emoji: '🌈',
    props: {},
    size: { x: -26, y: -24, w: 52, h: 48 },
    pins: [
      { id: 'r', x: -18, y: 18, etq: 'R', pol: '+' },
      { id: 'k', x: -6,  y: 18, rol: 'catodo', etq: 'K', pol: '−' },
      { id: 'g', x: 6,   y: 18, etq: 'G', pol: '+' },
      { id: 'b', x: 18,  y: 18, etq: 'B', pol: '+' }
    ],
    dibujar: function (c, st) {
      var s = st || {};
      var R = Math.round(255 * (s.br || 0)), G = Math.round(255 * (s.bg || 0)), B = Math.round(255 * (s.bb || 0));
      var total = CL.clamp(((s.br || 0) + (s.bg || 0) + (s.bb || 0)) / 1.6, 0, 1);
      var hex = function (v) { return ('0' + v.toString(16)).slice(-2); };
      var col = '#' + hex(Math.max(R, 30)) + hex(Math.max(G, 30)) + hex(Math.max(B, 30));
      // cápsula difusa OPACA: blanca lechosa apagada, del color de la mezcla al encender
      var cuerpo = CL.mezclarColor('#e4e8ee', col, total);
      var aro = CL.mezclarColor(cuerpo, '#ffffff', 0.18), sombra = CL.mezclarColor(cuerpo, '#000000', 0.2);
      return '<g class="body' + (total > 0.02 ? ' led-on' : '') + '">' +
        // cuatro patas (la del cátodo es la larga): bajan desde la base hasta el agujero
        '<path d="M-18 18 L-18 12 L-6 5 M-6 7 L-6 18 M6 7 L6 18 M18 18 L18 12 L6 5" ' + CL.PATA + '/>' +
        (total > 0.02 ? '<circle cx="0" cy="-5" r="' + (12 + 7 * total) + '" fill="' + col + '" opacity="' + (0.34 * total) + '" filter="url(#glowStrong)"/>' : '') +
        '<path d="M-9 5 L-9 -13 A9 9.4 0 0 1 9 -13 L9 5 Z" fill="' + cuerpo + '"/>' +
        '<path d="M4.8 -20.4 A9 9.4 0 0 1 9 -13 L9 5 L6 5 L6 -13 A7 7 0 0 0 4.8 -20.4 Z" fill="' + sombra + '" opacity=".45"/>' +
        '<rect x="-10.6" y="3.2" width="21.2" height="4.6" rx="2" fill="' + aro + '"/>' +
        '<rect x="-10.6" y="3.2" width="21.2" height="1" fill="' + sombra + '" opacity=".6"/>' +
        '<g class="led-glow" opacity="' + total + '">' +
        '  <circle cx="0" cy="-4" r="10" fill="' + col + '" filter="url(#glowStrong)"/>' +
        '  <circle cx="0" cy="-4" r="4" fill="#fff" opacity=".8"/>' +
        '</g>' +
        '</g>';
    },
    modelo: function () {
      return [
        { t: 'led', p: 'r', n: 'k', vf: LED_COLORES.rojo.vf,  rd: 14, imax: 0.025, rol: 'R' },
        { t: 'led', p: 'g', n: 'k', vf: LED_COLORES.verde.vf, rd: 14, imax: 0.025, rol: 'G' },
        { t: 'led', p: 'b', n: 'k', vf: LED_COLORES.azul.vf,  rd: 14, imax: 0.025, rol: 'B' }
      ];
    },
    medir: function (c, r, dt, prev) {
      var els = r.els || [], out = { R: 0, G: 0, B: 0 };
      for (var i = 0; i < els.length; i++) {
        if (out[els[i].rol] !== undefined) out[els[i].rol] = Math.abs(els[i]._i || 0);
      }
      function brillo(i) { return CL.clamp(Math.pow(CL.clamp(i / 0.018, 0, 1.6), 0.65), 0, 1); }
      var st = { br: brillo(out.R), bg: brillo(out.G), bb: brillo(out.B) };
      // mismo suavizado que el LED normal: enciende rápido y apaga despacio
      ['br', 'bg', 'bb'].forEach(function (k) {
        var ant = prev && prev[k] !== undefined ? prev[k] : st[k];
        var tau = st[k] > ant ? 0.035 : 0.075;
        st[k] = ant + (st[k] - ant) * (1 - Math.exp(-(dt || 0.016) / tau));
      });
      st.texto = (st.br + st.bg + st.bb) > 0.05
        ? 'R' + Math.round(st.br * 100) + ' G' + Math.round(st.bg * 100) + ' B' + Math.round(st.bb * 100) : '';
      return st;
    },
    info: {
      tipo: 'LED RGB de cátodo común',
      datos: [['Patas', 'R, cátodo (la larga), G y B'], ['Resistencias', 'Una por cada color'],
              ['Colores', 'Mezclando los tres se obtienen millones'], ['Control fino', 'Con analogWrite (PWM)']],
      que: 'Son tres LEDs (rojo, verde y azul) metidos en una sola cápsula. Encendiéndolos con distinta intensidad se consigue cualquier color.',
      como: 'Todos comparten el cátodo (el negativo). Cada ánodo lleva su resistencia y su pin. Con analogWrite() se gradúa cada color de 0 a 255: rojo 255 + verde 255 = amarillo; los tres al máximo = blanco.',
      donde: 'Luces de ambiente, indicadores de estado de colores, tiras decorativas, señalización.',
      errores: [
        'Poner una sola resistencia en el cátodo: los colores se estorban entre sí y el brillo cambia según cuántos estén encendidos.',
        'Confundir cátodo común con ánodo común (en ese otro tipo la lógica va al revés).',
        'Esperar el mismo brillo de los tres: el azul necesita más tensión.'
      ],
      ejemplo: 'analogWrite(9, 255); analogWrite(10, 120); analogWrite(11, 0);  // naranja'
    }
  };

  /* ============================================================
     BARRA DE LEDs — 8 segmentos con cátodo común
     ============================================================ */
  var BARRA_N = 8;
  cat.barraled = {
    nombre: 'Barra de LEDs', cat: 'basica', emoji: '📊',
    props: { color: 'verde' },
    size: { x: -54, y: -34, w: 108, h: 66 },
    pins: (function () {
      var ps = [{ id: 'k', x: -6, y: 24, rol: 'catodo', etq: 'K', pol: '−' }];
      for (var i = 0; i < BARRA_N; i++) {
        ps.push({ id: 'a' + (i + 1), x: -42 + i * 12, y: -24, etq: String(i + 1), pol: '+' });
      }
      return ps;
    }()),
    propsUI: [{ k: 'color', t: 'select', etq: 'Color', op: [['verde', 'Verde'], ['rojo', 'Rojo'], ['amarillo', 'Amarillo'], ['azul', 'Azul']] }],
    dibujar: function (c, st) {
      var col = LED_COLORES[c.props.color] || LED_COLORES.verde;
      var br = (st && st.brillos) || [];
      var g = '<g class="body">' +
        '<path d="M-6 18 L-6 24" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round"/>' +
        '<rect x="-50" y="-18" width="100" height="36" rx="2.5" fill="#101720" stroke="#0a0f16"/>';
      for (var i = 0; i < BARRA_N; i++) {
        var x = -42 + i * 12, b = CL.clamp(br[i] || 0, 0, 1);
        g += '<path d="M' + x + ' -24 L' + x + ' -18" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round"/>';
        g += '<rect x="' + (x - 4.4) + '" y="-13" width="8.8" height="26" rx="1.6" fill="' + CL.colorLed(col, b) + '"/>';
        if (b > 0.05) {
          g += '<rect x="' + (x - 4.4) + '" y="-13" width="8.8" height="26" rx="1.6" fill="' + col.glow +
               '" opacity="' + (b * 0.9) + '" filter="url(#glowSoft)"/>';
        }
      }
      g += '</g><text class="polarity n" x="-8.5" y="22">−</text>';
      return g;
    },
    modelo: function (c) {
      var col = LED_COLORES[c.props.color] || LED_COLORES.verde, els = [];
      for (var i = 0; i < BARRA_N; i++) {
        els.push({ t: 'led', p: 'a' + (i + 1), n: 'k', vf: col.vf, rd: 14, imax: 0.025, rol: 'seg' + i });
      }
      return els;
    },
    medir: function (c, r, dt, prev) {
      var els = r.els || [], brillos = [], enc = 0;
      for (var i = 0; i < BARRA_N; i++) brillos[i] = 0;
      for (var j = 0; j < els.length; j++) {
        var n = parseInt(String(els[j].rol || '').replace('seg', ''), 10);
        if (isNaN(n)) continue;
        var b = CL.clamp(Math.pow(CL.clamp(Math.abs(els[j]._i || 0) / 0.018, 0, 1.6), 0.65), 0, 1);
        var ant = prev && prev.brillos && prev.brillos[n] !== undefined ? prev.brillos[n] : b;
        var tau = b > ant ? 0.035 : 0.075;
        brillos[n] = ant + (b - ant) * (1 - Math.exp(-(dt || 0.016) / tau));
        if (brillos[n] > 0.12) enc++;
      }
      return { brillos: brillos, encendidos: enc, texto: enc ? enc + '/' + BARRA_N : '' };
    },
    info: {
      tipo: 'Barra gráfica de 8 LEDs (bargraph)',
      datos: [['Segmentos', '8, independientes'], ['Cátodo', 'Común a todos'], ['Resistencias', 'Una por segmento']],
      que: 'Son ocho LEDs alineados en una sola pieza. Sirven para mostrar un nivel: volumen, batería, distancia, temperatura…',
      como: 'Cada segmento se enciende por su propio pin, igual que un LED suelto. Con un bucle for y map() se convierte cualquier lectura en un número de segmentos encendidos.',
      donde: 'Vúmetros, indicadores de nivel de agua o batería, barras de progreso, sensores de aparcamiento.',
      errores: ['Olvidar una resistencia por segmento.', 'Quedarse sin pines: con 8 segmentos se ocupan 8 pines digitales.'],
      ejemplo: 'int n = map(analogRead(A0), 0, 1023, 0, 8); for (int i=0;i<8;i++) digitalWrite(2+i, i<n);'
    }
  };

}(window.CL));
