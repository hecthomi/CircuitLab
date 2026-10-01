/* ============================================================
   CircuitLab — Placas Arduino (Uno, Nano y Mega)
   Los pines digitales se comportan según el programa cargado:
   OUTPUT entrega tensión, INPUT lee, INPUT_PULLUP añade 20 kΩ a 5 V.
   ============================================================ */
(function (CL) {
  'use strict';

  var P = CL.PASO;

  /* Geometría de la fotografía de la Uno (medida sobre la propia imagen).
     Las posiciones van en píxeles de la imagen y se convierten a las unidades
     del lienzo con `k`, elegido para que la separación entre pines sea de 12
     (el mismo paso que la protoboard). */
  var FOTO = {
    ancho: 490, alto: 341, cx: 245, cy: 170.5, k: 0.74,
    yTop: 16, yBot: 323,
    ledL: { x: 229.5, y: 77.5, w: 20, h: 8 },
    ledON: { x: 431, y: 108.5, w: 17, h: 7 }
  };
  function fx(ix) { return +((ix - FOTO.cx) * FOTO.k).toFixed(2); }
  function fy(iy) { return +((iy - FOTO.cy) * FOTO.k).toFixed(2); }

  function crearPlaca(id, cfg) {
    var pins = [], grupos = [], gnds = [], v5 = [];
    var conFoto = !!cfg.foto;

    var yTop = conFoto ? fy(FOTO.yTop) : -cfg.h / 2 + 8;   // fila superior (digitales)
    var yBot = conFoto ? fy(FOTO.yBot) : cfg.h / 2 - 8;    // fila inferior (alimentación + analógicos)

    // ---- fila superior: digitales
    var nTop = cfg.top.length;
    var xTop0 = -((nTop - 1) * P) / 2;
    cfg.top.forEach(function (d, i) {
      var pin = {
        id: d.id, x: conFoto ? fx(d.ix) : xTop0 + i * P, y: yTop,
        etq: d.etq || d.id, tipo: d.tipo || 'digital', pwm: !!d.pwm, arriba: true
      };
      pins.push(pin);
      if (pin.tipo === 'gnd') gnds.push(pin.id);
      if (pin.tipo === 'vcc5') v5.push(pin.id);
    });
    // ---- fila inferior: alimentación + analógicos
    var nBot = cfg.bottom.length;
    var xBot0 = -((nBot - 1) * P) / 2;
    cfg.bottom.forEach(function (d, i) {
      var pin = {
        id: d.id, x: conFoto ? fx(d.ix) : xBot0 + i * P, y: yBot,
        etq: d.etq || d.id, tipo: d.tipo || 'analog', arriba: false
      };
      pins.push(pin);
      if (pin.tipo === 'gnd') gnds.push(pin.id);
      if (pin.tipo === 'vcc5') v5.push(pin.id);
    });
    if (gnds.length > 1) grupos.push(gnds.slice());
    if (v5.length > 1) grupos.push(v5.slice());

    /* Cabecera: barra negra continua con los agujeros cuadrados, como en la placa real */
    function dibujarHeader(lista, y, arriba) {
      if (!lista.length) return '';
      var x1 = lista[0].x - 6, x2 = lista[lista.length - 1].x + 6;
      var s = '<rect class="board-hdr" x="' + x1 + '" y="' + (y - 6) + '" width="' + (x2 - x1) + '" height="12" rx="1.5"/>';
      s += '<rect x="' + x1 + '" y="' + (y - 6) + '" width="' + (x2 - x1) + '" height="3.4" rx="1.5" fill="#fff" opacity=".07"/>';
      lista.forEach(function (p) {
        s += '<rect x="' + (p.x - 3.4) + '" y="' + (y - 3.4) + '" width="6.8" height="6.8" rx=".8" fill="#15181c"/>';
        s += '<rect x="' + (p.x - 2.2) + '" y="' + (y - 2.2) + '" width="4.4" height="4.4" rx=".5" fill="#8d949c" opacity=".55"/>';
        var ty = arriba ? y + 13 : y - 9;
        var etq = p.etq;
        s += '<text class="board-txt" x="' + p.x + '" y="' + ty + '" text-anchor="middle" ' +
             (etq.length > 3 ? 'font-size="4.6"' : '') + '>' + etq + '</text>';
      });
      return s;
    }

    var caja = conFoto
      ? { x: fx(0), y: fy(0), w: FOTO.ancho * FOTO.k, h: FOTO.alto * FOTO.k }
      : { x: -cfg.w / 2, y: -cfg.h / 2, w: cfg.w, h: cfg.h };

    /* Dibujo cuando la placa es una fotografía: la imagen y encima solo los
       LED que cambian de estado (los rótulos ya vienen impresos en la foto). */
    function dibujarFoto(st) {
      var img = (CL.IMG || {})[cfg.foto] || '';
      var s = '<g class="body">';
      s += '<image href="' + img + '" xlink:href="' + img + '" x="' + caja.x + '" y="' + caja.y +
           '" width="' + caja.w + '" height="' + caja.h + '" preserveAspectRatio="none"/>';
      function led(p, encendido, color) {
        var w = p.w * FOTO.k, h = p.h * FOTO.k;
        return '<rect x="' + (fx(p.x) - w / 2) + '" y="' + (fy(p.y) - h / 2) + '" width="' + w + '" height="' + h +
               '" rx="1" fill="' + (encendido ? color : '#c9ccd0') + '"' +
               (encendido ? ' filter="url(#glowSoft)"' : '') + '/>';
      }
      s += led(FOTO.ledL, st.led13, '#ffd23f');
      s += led(FOTO.ledON, st.encendida !== false, '#38d16a');
      if (st.ejecutando) {
        s += '<circle cx="' + fx(FOTO.ancho - 24) + '" cy="' + fy(FOTO.alto - 24) + '" r="4" fill="#22d3ee">' +
             '<animate attributeName="opacity" values="1;.25;1" dur="1s" repeatCount="indefinite"/></circle>';
      }
      return s + '</g>';
    }

    var def = {
      nombre: cfg.nombre, cat: 'placas', emoji: '🟩', ancha: true,
      props: {},
      size: caja,
      pins: pins,
      grupos: grupos,
      placa: true,
      familia: 'arduino',
      rotStep: 90,
      pinesDigitales: cfg.top.filter(function (d) { return (d.tipo || 'digital') === 'digital'; }).map(function (d) { return d.id; }),
      pinesAnalogicos: cfg.bottom.filter(function (d) { return d.tipo === 'analog'; }).map(function (d) { return d.id; }),
      pinesPWM: cfg.top.filter(function (d) { return d.pwm; }).map(function (d) { return d.id; }),

      dibujar: function (c, st) {
        st = st || {};
        if (conFoto) return dibujarFoto(st);
        var W2 = cfg.w / 2, H2 = cfg.h / 2;
        var s = '<g class="body">';
        // placa azul con la esquina recortada, como la Uno real
        s += '<path class="board-pcb" d="M' + (-W2 + 7) + ' ' + (-H2) +
             ' H' + (W2 - 14) + ' L' + W2 + ' ' + (-H2 + 13) +
             ' V' + (H2 - 7) + ' a7 7 0 0 1 -7 7 H' + (-W2 + 7) +
             ' a7 7 0 0 1 -7 -7 V' + (-H2 + 7) + ' a7 7 0 0 1 7 -7 z" fill="#316e99" stroke="#24557a"/>';
        s += '<path d="M' + (-W2 + 4) + ' ' + (-H2 + 4) + ' H' + (W2 - 15) + ' L' + (W2 - 4) + ' ' + (-H2 + 15) +
             ' V' + (H2 - 4) + ' H' + (-W2 + 4) + ' Z" fill="none" stroke="#fff" stroke-width=".6" opacity=".16"/>';
        // agujeros de sujeción
        [[-W2 + 12, -H2 + 12], [W2 - 12, H2 - 12], [-W2 + 12, H2 - 12]].forEach(function (h) {
          s += '<circle cx="' + h[0] + '" cy="' + h[1] + '" r="3.4" fill="#f4f5f6"/>' +
               '<circle cx="' + h[0] + '" cy="' + h[1] + '" r="3.4" fill="none" stroke="#24557a" stroke-width=".5"/>';
        });
        // conector USB (bloque metálico que sobresale por la izquierda)
        if (cfg.usb) {
          s += '<rect x="' + (-W2 - 6) + '" y="-34" width="26" height="26" rx="1.5" fill="#dddddd"/>';
          s += '<rect x="' + (-W2 - 6) + '" y="-34" width="26" height="26" rx="1.5" fill="none" stroke="#a9adb2" stroke-width=".7"/>';
          s += '<rect x="' + (-W2 - 3) + '" y="-30" width="16" height="18" rx="1" fill="#b9bdc2"/>';
          s += '<rect x="' + (-W2 - 1) + '" y="-27" width="11" height="12" rx=".8" fill="#8e9398"/>';
        }
        // jack de alimentación
        if (cfg.jack) {
          s += '<rect x="' + (-W2 - 5) + '" y="10" width="24" height="22" rx="2.5" fill="#3c4042"/>';
          s += '<rect x="' + (-W2 - 5) + '" y="10" width="24" height="6" rx="2.5" fill="#fff" opacity=".08"/>';
          s += '<circle cx="' + (-W2 + 7) + '" cy="21" r="5.5" fill="#25282a"/>';
          s += '<circle cx="' + (-W2 + 7) + '" cy="21" r="2" fill="#4a4f52"/>';
        }
        // microcontrolador (encapsulado DIP con su muesca y sus patas)
        var cx0 = 6;
        s += '<rect x="' + (cx0 - 34) + '" y="-6" width="68" height="20" rx="1.5" fill="#3c4042"/>';
        for (var k = 0; k < 14; k++) {
          var px = cx0 - 30 + k * 4.6;
          s += '<rect x="' + px.toFixed(1) + '" y="-8.6" width="2.6" height="2.8" fill="#c9ccd0"/>';
          s += '<rect x="' + px.toFixed(1) + '" y="13.8" width="2.6" height="2.8" fill="#c9ccd0"/>';
        }
        s += '<circle cx="' + (cx0 - 28) + '" cy="4" r="2.2" fill="none" stroke="#6b7075" stroke-width=".8"/>';
        s += '<text class="board-txt" x="' + (cx0 + 4) + '" y="6.5" text-anchor="middle" font-size="5.4" opacity=".85">' + cfg.chip + '</text>';
        // regulador y cristal
        s += '<rect x="' + (-W2 + 26) + '" y="4" width="16" height="10" rx="1.5" fill="#3c4042"/>';
        s += '<rect x="' + (-W2 + 46) + '" y="6" width="12" height="7" rx="3.5" fill="#b9bdc2"/>';
        // logotipo (zona libre entre los rótulos de pines y el chip)
        var logoY = -18;
        s += '<circle cx="-16" cy="' + logoY + '" r="7" fill="none" stroke="#fff" stroke-width="1.5" opacity=".9"/>';
        s += '<circle cx="-4" cy="' + logoY + '" r="7" fill="none" stroke="#fff" stroke-width="1.5" opacity=".9"/>';
        s += '<path d="M-19.5 ' + logoY + ' h7 M-7.5 ' + logoY + ' h7 M-4 ' + (logoY - 3.5) + ' v7" ' +
             'stroke="#fff" stroke-width="1.5" opacity=".9"/>';
        s += '<text class="board-txt" x="10" y="' + (logoY + 3.5) + '" font-size="9" font-weight="700" opacity=".95">UNO</text>';
        s += '<text class="board-txt" x="' + (-W2 + 42) + '" y="30" font-size="5.6" font-weight="700" opacity=".75">' + cfg.rotulo + '</text>';
        // botón de reset (esquina superior izquierda, sin tapar el rótulo del primer pin)
        s += '<rect x="' + (-W2 + 2) + '" y="-60" width="13" height="13" rx="1.5" fill="#c9ccd0"/>';
        s += '<circle cx="' + (-W2 + 8.5) + '" cy="-53.5" r="4" fill="#8f2f28"/>';
        // LEDs de la placa (columna a la derecha, sin pisar nada)
        var leds = [['L', st.led13], ['ON', st.encendida], ['TX', false], ['RX', false]];
        leds.forEach(function (l, i) {
          var lx = W2 - 26, ly = -44 + i * 9;
          s += '<rect x="' + lx + '" y="' + (ly - 2.4) + '" width="7" height="4.8" rx="1" fill="' +
               (l[1] ? (l[0] === 'ON' ? '#38d16a' : '#ffd23f') : '#1f3a52') + '"' +
               (l[1] ? ' filter="url(#glowSoft)"' : '') + '/>';
          s += '<text class="board-txt" x="' + (lx - 3) + '" y="' + (ly + 2) + '" text-anchor="end" font-size="4.4" opacity=".85">' + l[0] + '</text>';
        });
        // cabeceras
        s += dibujarHeader(pins.filter(function (p) { return p.arriba; }), yTop, true);
        s += dibujarHeader(pins.filter(function (p) { return !p.arriba; }), yBot, false);
        // rótulos de los bloques de pines
        s += '<text class="board-txt" x="-30" y="' + (yTop + 22) + '" text-anchor="middle" font-size="5" opacity=".75">DIGITAL (PWM ~)</text>';
        s += '<text class="board-txt" x="' + (-W2 + 62) + '" y="' + (yBot - 18) + '" text-anchor="middle" font-size="5" opacity=".75">POWER</text>';
        s += '<text class="board-txt" x="' + (W2 - 62) + '" y="' + (yBot - 18) + '" text-anchor="middle" font-size="5" opacity=".75">ANALOG IN</text>';
        if (st.ejecutando) {
          s += '<circle cx="' + (W2 - 14) + '" cy="' + (H2 - 14) + '" r="3.4" fill="#22d3ee">' +
               '<animate attributeName="opacity" values="1;.25;1" dur="1s" repeatCount="indefinite"/></circle>';
        }
        s += '</g>';
        return s;
      },

      /* Modelo eléctrico dependiente del estado del programa */
      modelo: function (c, ctx) {
        var els = [], estado = (ctx && ctx.pines && ctx.pines[c.id]) || {};
        var gnd = gnds[0], ref5 = v5[0];
        if (gnd) els.push({ t: 'gnd', p: gnd });
        pins.forEach(function (p) {
          if (p.tipo === 'vcc5') els.push({ t: 'vcc', p: p.id, v: 5 });
          else if (p.tipo === 'vcc33') els.push({ t: 'vcc', p: p.id, v: 3.3 });
          else if (p.tipo === 'digital' || p.tipo === 'analog') {
            var e = estado[p.id];
            if (e && e.modo === 'OUTPUT') {
              els.push({ t: 'v', p: p.id, n: gnd, v: CL.clamp(e.valor, 0, 1) * 5, rser: 28, imax: 0.045, rol: 'pin', pin: p.id, comp: c.id });
            } else if (e && e.modo === 'INPUT_PULLUP') {
              els.push({ t: 'r', p: p.id, n: ref5 || gnd, r: 20000, rol: 'pullup' });
            } else {
              els.push({ t: 'r', p: p.id, n: gnd, r: 1e8, rol: 'hiz' });   // entrada de alta impedancia
            }
          }
        });
        return els;
      },

      medir: function (c, r, dt, prev, ctx) {
        var est = (ctx && ctx.pines && ctx.pines[c.id]) || {};
        var l13 = est.D13 && est.D13.modo === 'OUTPUT' && est.D13.valor > 0.5;
        return { led13: !!l13, ejecutando: !!(ctx && ctx.ejecutando), encendida: true };
      },

      info: {
        tipo: cfg.nombre + ' — placa microcontroladora',
        datos: cfg.datos,
        que: 'Arduino es una placa con un microcontrolador programable: un pequeño computador que lee sensores y controla luces, motores y sonido según el programa que le cargues.',
        como: 'El programa tiene dos partes: setup() se ejecuta una vez al encender y loop() se repite sin parar. Con pinMode() se decide si un pin es entrada o salida, con digitalWrite() se enciende o apaga y con analogRead() se lee un sensor.',
        donde: 'Robots, invernaderos automáticos, alarmas, estaciones meteorológicas, instrumentos musicales, domótica escolar.',
        errores: [
          'Olvidar pinMode() en setup(): el pin no se comporta como salida.',
          'Conectar un motor directamente a un pin (máx. 40 mA por pin).',
          'No unir el GND del Arduino con el GND de la fuente externa.',
          'Usar analogWrite() en un pin sin ~ (no todos tienen PWM).'
        ],
        ejemplo: 'pinMode(13, OUTPUT); digitalWrite(13, HIGH); delay(1000); digitalWrite(13, LOW);'
      }
    };
    CL.catalogo[id] = def;
    return def;
  }

  /* ---------------- Arduino UNO (con la fotografía de la placa) ----------------
     Cada `ix` es la coordenada horizontal del agujero medida sobre la imagen,
     así los pines caen exactamente encima de su conector. El orden es el real:
     los digitales van de 13 a 0 de izquierda a derecha. */
  crearPlaca('arduino_uno', {
    nombre: 'Arduino Uno', rotulo: 'ARDUINO UNO', chip: 'ATmega328P',
    foto: 'arduino_uno',
    top: [
      { id: 'SCL', etq: 'SCL', tipo: 'otro', ix: 171.5 },
      { id: 'SDA', etq: 'SDA', tipo: 'otro', ix: 187.5 },
      { id: 'AREF', etq: 'AREF', tipo: 'otro', ix: 203.5 },
      { id: 'GND1', etq: 'GND', tipo: 'gnd', ix: 220.5 },
      { id: 'D13', ix: 236.5 }, { id: 'D12', ix: 252.5 },
      { id: 'D11', etq: '~11', pwm: true, ix: 268.5 }, { id: 'D10', etq: '~10', pwm: true, ix: 284.5 },
      { id: 'D9', etq: '~9', pwm: true, ix: 301.5 }, { id: 'D8', ix: 317.5 },
      { id: 'D7', ix: 343.5 }, { id: 'D6', etq: '~6', pwm: true, ix: 359.5 },
      { id: 'D5', etq: '~5', pwm: true, ix: 375.5 }, { id: 'D4', ix: 391.5 },
      { id: 'D3', etq: '~3', pwm: true, ix: 408 }, { id: 'D2', ix: 424.5 },
      { id: 'D1', etq: 'TX1', ix: 440.5 }, { id: 'D0', etq: 'RX0', ix: 456.5 }
    ],
    bottom: [
      { id: 'NC', etq: '', tipo: 'otro', ix: 230 },
      { id: 'IOREF', etq: 'IOREF', tipo: 'otro', ix: 246 },
      { id: 'RESET', etq: 'RST', tipo: 'otro', ix: 262 },
      { id: '3V3', etq: '3V3', tipo: 'vcc33', ix: 278.5 },
      { id: '5V', etq: '5V', tipo: 'vcc5', ix: 294.5 },
      { id: 'GND2', etq: 'GND', tipo: 'gnd', ix: 311 },
      { id: 'GND3', etq: 'GND', tipo: 'gnd', ix: 327 },
      { id: 'VIN', etq: 'VIN', tipo: 'otro', ix: 343 },
      { id: 'A0', tipo: 'analog', ix: 375.5 }, { id: 'A1', tipo: 'analog', ix: 391.5 },
      { id: 'A2', tipo: 'analog', ix: 408 }, { id: 'A3', tipo: 'analog', ix: 424 },
      { id: 'A4', tipo: 'analog', ix: 440.5 }, { id: 'A5', tipo: 'analog', ix: 456.5 }
    ],
    datos: [['Microcontrolador', 'ATmega328P'], ['Pines digitales', '14 (6 con PWM ~)'], ['Pines analógicos', '6 (A0–A5)'],
            ['Tensión de trabajo', '5 V'], ['Corriente por pin', 'máx. 40 mA'], ['Memoria', '32 KB']]
  });

  /* ---------------- Arduino NANO ---------------- */
  crearPlaca('arduino_nano', {
    nombre: 'Arduino Nano', rotulo: 'NANO', chip: 'ATmega328',
    w: 190, h: 108, usb: true, jack: false,
    top: [
      { id: 'D2' }, { id: 'D3', etq: '~3', pwm: true }, { id: 'D4' }, { id: 'D5', etq: '~5', pwm: true },
      { id: 'D6', etq: '~6', pwm: true }, { id: 'D7' }, { id: 'D8' }, { id: 'D9', etq: '~9', pwm: true },
      { id: 'D10', etq: '~10', pwm: true }, { id: 'D11', etq: '~11', pwm: true }, { id: 'D12' }, { id: 'D13' },
      { id: '5V', etq: '5V', tipo: 'vcc5' }, { id: 'GND1', etq: 'GND', tipo: 'gnd' }
    ],
    bottom: [
      { id: 'A0', tipo: 'analog' }, { id: 'A1', tipo: 'analog' }, { id: 'A2', tipo: 'analog' }, { id: 'A3', tipo: 'analog' },
      { id: 'A4', tipo: 'analog' }, { id: 'A5', tipo: 'analog' }, { id: 'A6', tipo: 'analog' }, { id: 'A7', tipo: 'analog' },
      { id: '3V3', etq: '3V3', tipo: 'vcc33' }, { id: 'GND2', etq: 'GND', tipo: 'gnd' }, { id: 'VIN', etq: 'VIN', tipo: 'otro' }
    ],
    datos: [['Microcontrolador', 'ATmega328'], ['Tamaño', 'Muy compacto, entra en la protoboard'],
            ['Pines digitales', '14'], ['Analógicos', '8 (A0–A7)'], ['Tensión', '5 V']]
  });

  /* ---------------- Arduino MEGA (simplificado) ---------------- */
  crearPlaca('arduino_mega', {
    nombre: 'Arduino Mega', rotulo: 'ARDUINO MEGA 2560', chip: 'ATmega2560',
    w: 320, h: 160, usb: true, jack: true,
    top: [
      { id: 'D2' }, { id: 'D3', etq: '~3', pwm: true }, { id: 'D4' }, { id: 'D5', etq: '~5', pwm: true },
      { id: 'D6', etq: '~6', pwm: true }, { id: 'D7' }, { id: 'D8' }, { id: 'D9', etq: '~9', pwm: true },
      { id: 'D10', etq: '~10', pwm: true }, { id: 'D11', etq: '~11', pwm: true }, { id: 'D12' }, { id: 'D13' },
      { id: 'D22' }, { id: 'D23' }, { id: 'D24' }, { id: 'D25' }, { id: 'D26' }, { id: 'D27' },
      { id: 'GND1', etq: 'GND', tipo: 'gnd' }, { id: 'AREF', etq: 'AREF', tipo: 'otro' }
    ],
    bottom: [
      { id: 'RESET', etq: 'RST', tipo: 'otro' }, { id: '3V3', etq: '3V3', tipo: 'vcc33' }, { id: '5V', etq: '5V', tipo: 'vcc5' },
      { id: 'GND2', etq: 'GND', tipo: 'gnd' }, { id: 'GND3', etq: 'GND', tipo: 'gnd' }, { id: 'VIN', etq: 'VIN', tipo: 'otro' },
      { id: 'A0', tipo: 'analog' }, { id: 'A1', tipo: 'analog' }, { id: 'A2', tipo: 'analog' }, { id: 'A3', tipo: 'analog' },
      { id: 'A4', tipo: 'analog' }, { id: 'A5', tipo: 'analog' }, { id: 'A6', tipo: 'analog' }, { id: 'A7', tipo: 'analog' },
      { id: 'A8', tipo: 'analog' }, { id: 'A9', tipo: 'analog' }
    ],
    datos: [['Microcontrolador', 'ATmega2560'], ['Pines digitales', '54 (15 con PWM)'], ['Analógicos', '16'],
            ['Memoria', '256 KB'], ['Uso', 'Proyectos grandes con muchos sensores']]
  });

}(window.CL));
