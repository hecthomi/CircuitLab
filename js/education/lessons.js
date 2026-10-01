/* ============================================================
   CircuitLab — curso interactivo (10 niveles)
   Cada nivel: explicación · animación · ejemplo · actividad ·
   preguntas · reto · retroalimentación · puntuación.
   ============================================================ */
(function (CL) {
  'use strict';

  var L = {};
  CL.lecciones = L;

  /* ------------------------------------------------------------
     Figuras animadas (SVG dibujado a mano, sin imágenes externas)
     ------------------------------------------------------------ */
  function figProtoboard() {
    var s = '<svg viewBox="0 0 420 190" xmlns="http://www.w3.org/2000/svg">';
    s += '<rect x="6" y="6" width="408" height="178" rx="8" fill="#e9e6db" stroke="#c9c4b4"/>';
    // rieles
    s += '<line x1="20" y1="24" x2="400" y2="24" stroke="#dc2626" stroke-width="2" opacity=".8"/>';
    s += '<line x1="20" y1="40" x2="400" y2="40" stroke="#2563eb" stroke-width="2" opacity=".8"/>';
    s += '<line x1="20" y1="150" x2="400" y2="150" stroke="#2563eb" stroke-width="2" opacity=".8"/>';
    s += '<line x1="20" y1="166" x2="400" y2="166" stroke="#dc2626" stroke-width="2" opacity=".8"/>';
    var i, x, y;
    for (i = 0; i < 24; i++) {
      x = 26 + i * 16;
      s += '<rect x="' + (x - 2.5) + '" y="20" width="5" height="5" rx="1" fill="#2b2f36"/>';
      s += '<rect x="' + (x - 2.5) + '" y="36" width="5" height="5" rx="1" fill="#2b2f36"/>';
      s += '<rect x="' + (x - 2.5) + '" y="146" width="5" height="5" rx="1" fill="#2b2f36"/>';
      s += '<rect x="' + (x - 2.5) + '" y="162" width="5" height="5" rx="1" fill="#2b2f36"/>';
    }
    // zona central
    for (i = 0; i < 24; i++) {
      x = 26 + i * 16;
      for (var f = 0; f < 5; f++) {
        y = 58 + f * 9;
        s += '<rect x="' + (x - 2.5) + '" y="' + y + '" width="5" height="5" rx="1" fill="#2b2f36"/>';
        s += '<rect x="' + (x - 2.5) + '" y="' + (y + 55) + '" width="5" height="5" rx="1" fill="#2b2f36"/>';
      }
    }
    s += '<rect x="20" y="100" width="380" height="10" rx="2" fill="#d8d4c7" stroke="#c2bdae"/>';
    // columnas resaltadas
    s += '<rect x="102" y="55" width="12" height="47" rx="4" fill="none" stroke="#22d3ee" stroke-width="2" class="blink-hl"/>';
    s += '<rect x="102" y="110" width="12" height="47" rx="4" fill="none" stroke="#a78bfa" stroke-width="2"/>';
    s += '<text x="130" y="76" font-size="10" fill="#0e7490" font-family="system-ui">estos 5 puntos están unidos</text>';
    s += '<text x="130" y="136" font-size="10" fill="#6d28d9" font-family="system-ui">y estos otros 5 también</text>';
    s += '<text x="128" y="107" font-size="9" fill="#7c7768" font-family="system-ui">canal central: separa las dos mitades</text>';
    s += '<text x="10" y="16" font-size="9" fill="#dc2626" font-family="system-ui">riel + (todo a lo largo)</text>';
    s += '<text x="10" y="180" font-size="9" fill="#dc2626" font-family="system-ui">riel + (todo a lo largo)</text>';
    return s + '</svg>';
  }

  function figCorriente() {
    var s = '<svg viewBox="0 0 420 150" xmlns="http://www.w3.org/2000/svg">';
    s += '<path id="ruta" d="M60 110 L60 40 L160 40 L160 40 L260 40 L260 110 L60 110" fill="none" stroke="#64748b" stroke-width="3"/>';
    s += '<rect x="30" y="60" width="30" height="50" rx="4" fill="#111827" stroke="#334155"/>';
    s += '<text x="45" y="90" text-anchor="middle" font-size="10" fill="#facc15" font-family="system-ui">5V</text>';
    s += '<rect x="130" y="30" width="46" height="18" rx="6" fill="#d6b98c" stroke="#a98d63"/>';
    s += '<text x="153" y="24" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">220 Ω</text>';
    s += '<circle cx="260" cy="60" r="12" fill="#ef4444" opacity=".9"><animate attributeName="opacity" values=".35;1;.35" dur="1.6s" repeatCount="indefinite"/></circle>';
    s += '<text x="288" y="64" font-size="10" fill="#e2e8f0" font-family="system-ui">LED</text>';
    s += '<path d="M60 110 L60 40 L260 40 L260 110 L60 110" fill="none" stroke="#fbbf24" stroke-width="3" stroke-dasharray="6 12" class="anim-flow"/>';
    s += '<text x="150" y="128" text-anchor="middle" font-size="10" fill="#94a3b8" font-family="system-ui">la corriente sale del +, recorre el circuito y vuelve al −</text>';
    s += '<text x="24" y="128" font-size="11" fill="#f87171" font-family="system-ui">+</text>';
    s += '<text x="66" y="128" font-size="11" fill="#94a3b8" font-family="system-ui">−</text>';
    return s + '</svg>';
  }

  function figLed() {
    var s = '<svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg">';
    s += '<g transform="translate(70,20)">';
    s += '<path d="M-16 30 A16 16 0 0 1 16 30 L16 44 L-16 44 Z" fill="#ef4444" opacity=".85"/>';
    s += '<path d="M-16 -6 A16 18 0 0 1 16 -6 L16 34 L-16 34 Z" fill="#ef4444" opacity=".7"/>';
    s += '<line x1="-8" y1="44" x2="-8" y2="86" stroke="#cbd5e1" stroke-width="3"/>';
    s += '<line x1="8" y1="44" x2="8" y2="72" stroke="#94a3b8" stroke-width="3"/>';
    s += '<text x="-30" y="80" font-size="11" fill="#f87171" font-family="system-ui">+</text>';
    s += '<text x="18" y="66" font-size="11" fill="#94a3b8" font-family="system-ui">−</text>';
    s += '<text x="-42" y="102" font-size="9.5" fill="#e2e8f0" font-family="system-ui">pata larga = ánodo</text>';
    s += '<text x="-6" y="116" font-size="9.5" fill="#94a3b8" font-family="system-ui">pata corta = cátodo</text>';
    s += '</g>';
    s += '<g transform="translate(250,30)">';
    s += '<text x="0" y="0" font-size="10.5" fill="#6ee7b7" font-family="system-ui">✔ 5 V → resistencia → ánodo</text>';
    s += '<text x="0" y="18" font-size="10.5" fill="#6ee7b7" font-family="system-ui">✔ cátodo → GND</text>';
    s += '<text x="0" y="44" font-size="10.5" fill="#fca5a5" font-family="system-ui">✘ al revés: no enciende</text>';
    s += '<text x="0" y="62" font-size="10.5" fill="#fca5a5" font-family="system-ui">✘ sin resistencia: se quema</text>';
    s += '<rect x="-12" y="-14" width="180" height="88" rx="8" fill="none" stroke="#334155" stroke-dasharray="4 4"/>';
    s += '</g>';
    return s + '</svg>';
  }

  function figDivisor() {
    var s = '<svg viewBox="0 0 420 160" xmlns="http://www.w3.org/2000/svg">';
    s += '<line x1="90" y1="20" x2="90" y2="140" stroke="#64748b" stroke-width="3"/>';
    s += '<rect x="76" y="40" width="28" height="26" rx="4" fill="#334155" stroke="#64748b"/>';
    s += '<rect x="76" y="94" width="28" height="26" rx="4" fill="#334155" stroke="#64748b"/>';
    s += '<circle cx="90" cy="80" r="5" fill="#22d3ee"/>';
    s += '<line x1="90" y1="80" x2="190" y2="80" stroke="#22d3ee" stroke-width="2.4"/>';
    s += '<text x="196" y="84" font-size="10.5" fill="#22d3ee" font-family="system-ui">al pin A0 (0 a 1023)</text>';
    s += '<text x="112" y="34" font-size="10" fill="#f87171" font-family="system-ui">5 V</text>';
    s += '<text x="112" y="150" font-size="10" fill="#94a3b8" font-family="system-ui">GND</text>';
    s += '<text x="112" y="58" font-size="9.5" fill="#e2e8f0" font-family="system-ui">R de arriba</text>';
    s += '<text x="112" y="112" font-size="9.5" fill="#e2e8f0" font-family="system-ui">R de abajo</text>';
    s += '<text x="230" y="120" font-size="10" fill="#94a3b8" font-family="system-ui">V salida = 5 V × Rabajo / (Rarriba + Rabajo)</text>';
    return s + '</svg>';
  }

  function figPWM() {
    var s = '<svg viewBox="0 0 420 130" xmlns="http://www.w3.org/2000/svg">';
    ['25 %', '50 %', '90 %'].forEach(function (t, i) {
      var y = 20 + i * 36, ancho = [10, 20, 36][i];
      var d = 'M20 ' + (y + 20);
      for (var k = 0; k < 8; k++) {
        var x = 20 + k * 40;
        d += ' L' + x + ' ' + (y + 20) + ' L' + x + ' ' + y + ' L' + (x + ancho) + ' ' + y + ' L' + (x + ancho) + ' ' + (y + 20);
      }
      s += '<path d="' + d + ' L340 ' + (y + 20) + '" fill="none" stroke="#22d3ee" stroke-width="1.8"/>';
      s += '<text x="352" y="' + (y + 16) + '" font-size="10" fill="#e2e8f0" font-family="system-ui">' + t + '</text>';
    });
    s += '<text x="20" y="126" font-size="9.5" fill="#94a3b8" font-family="system-ui">analogWrite() enciende y apaga muy rápido: el ojo ve un brillo intermedio</text>';
    return s + '</svg>';
  }

  function figArduino() {
    var s = '<svg viewBox="0 0 420 170" xmlns="http://www.w3.org/2000/svg">';
    s += '<rect x="60" y="30" width="300" height="110" rx="10" fill="#0d7377" stroke="#075e61"/>';
    for (var i = 0; i < 14; i++) {
      var x = 80 + i * 20;
      s += '<rect x="' + (x - 5) + '" y="34" width="10" height="10" rx="2" fill="#0f172a" stroke="#475569"/>';
      s += '<text x="' + x + '" y="56" text-anchor="middle" font-size="7" fill="#e2e8f0" font-family="system-ui">' + (13 - i) + '</text>';
    }
    for (i = 0; i < 6; i++) {
      var x2 = 240 + i * 20;
      s += '<rect x="' + (x2 - 5) + '" y="126" width="10" height="10" rx="2" fill="#0f172a" stroke="#475569"/>';
      s += '<text x="' + x2 + '" y="122" text-anchor="middle" font-size="7" fill="#e2e8f0" font-family="system-ui">A' + i + '</text>';
    }
    ['5V', 'GND', '3V3'].forEach(function (t, k) {
      var x3 = 90 + k * 34;
      s += '<rect x="' + (x3 - 5) + '" y="126" width="10" height="10" rx="2" fill="#0f172a" stroke="#475569"/>';
      s += '<text x="' + x3 + '" y="122" text-anchor="middle" font-size="7" fill="#fca5a5" font-family="system-ui">' + t + '</text>';
    });
    s += '<text x="210" y="92" text-anchor="middle" font-size="11" fill="#e2e8f0" font-family="system-ui" font-weight="700">ARDUINO UNO</text>';
    s += '<text x="210" y="20" text-anchor="middle" font-size="9.5" fill="#94a3b8" font-family="system-ui">pines digitales (los que tienen ~ admiten PWM)</text>';
    s += '<text x="210" y="160" text-anchor="middle" font-size="9.5" fill="#94a3b8" font-family="system-ui">alimentación y entradas analógicas</text>';
    return s + '</svg>';
  }

  function figRobot() {
    var s = '<svg viewBox="0 0 420 150" xmlns="http://www.w3.org/2000/svg">';
    var cajas = [['SENSOR', 'mide el mundo', '#22d3ee'], ['PLACA', 'decide qué hacer', '#a78bfa'], ['ACTUADOR', 'mueve o avisa', '#34d399']];
    cajas.forEach(function (c, i) {
      var x = 20 + i * 140;
      s += '<rect x="' + x + '" y="40" width="110" height="60" rx="10" fill="rgba(34,211,238,.08)" stroke="' + c[2] + '" stroke-width="1.6"/>';
      s += '<text x="' + (x + 55) + '" y="66" text-anchor="middle" font-size="11" fill="' + c[2] + '" font-family="system-ui" font-weight="700">' + c[0] + '</text>';
      s += '<text x="' + (x + 55) + '" y="84" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="system-ui">' + c[1] + '</text>';
      if (i < 2) s += '<path d="M' + (x + 114) + ' 70 L' + (x + 134) + ' 70" stroke="#94a3b8" stroke-width="2" marker-end="url(#f2)"/>';
    });
    s += '<path d="M75 104 L75 128 L355 128 L355 104" fill="none" stroke="#64748b" stroke-width="1.4" stroke-dasharray="4 4"/>';
    s += '<text x="215" y="142" text-anchor="middle" font-size="9" fill="#64748b" font-family="system-ui">y vuelve a empezar…</text>';
    s += '<defs><marker id="f2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="#94a3b8"/></marker></defs>';
    return s + '</svg>';
  }

  /* ============================================================
     CONTENIDO DE LOS 10 NIVELES
     ============================================================ */
  L.lista = [
    {
      id: 'n1', titulo: 'Conociendo la protoboard', xp: 30,
      resumen: 'Qué es, para qué sirve y cómo están unidos sus agujeros por dentro.',
      contenido:
        '<p>La <b>protoboard</b> (o placa de pruebas) es una tabla llena de agujeros que permite armar circuitos <b>sin soldar</b>. Por dentro tiene tiras de metal que unen ciertos agujeros entre sí.</p>' +
        '<h4>Sus tres zonas</h4>' +
        '<ul><li><b>Rieles de alimentación</b> (los bordes con las líneas roja y azul): recorren toda la placa a lo largo. Sirven para llevar el + y el − a cualquier punto.</li>' +
        '<li><b>Zona central</b>: filas A-E arriba y F-J abajo. Aquí <b>cada columna de 5 agujeros está unida</b>.</li>' +
        '<li><b>Canal central</b>: separa la mitad de arriba de la de abajo. Sirve para colocar circuitos integrados sin cortocircuitarlos.</li></ul>' +
        '<div class="fig">' + figProtoboard() + '<figcaption>Los 5 agujeros de una misma columna están unidos; el canal central los separa de la otra mitad.</figcaption></div>' +
        '<div class="callout"><div>👀</div><div>En el simulador puedes activar el botón <b>🔗</b> de la izquierda para ver iluminadas las pistas internas. Y si pasas el mouse sobre un agujero, te dice con quién está conectado.</div></div>' +
        '<div class="callout warn"><div>⚠️</div><div><b>Error clásico:</b> poner las dos patas de un componente en la misma columna. Como esos agujeros ya están unidos, el componente queda cortocircuitado (como si no existiera).</div></div>',
      actividad: {
        enunciado: 'Coloca una protoboard en el área de trabajo y activa el modo “mostrar conexiones internas” (botón 🔗).',
        pistas: ['Arrastra la protoboard desde la categoría “Electrónica básica”.', 'El botón 🔗 está en la columna de botones flotantes, arriba a la izquierda del lienzo.'],
        comprobar: function () {
          return [
            { ok: CL.state.cuenta('protoboard') >= 1, txt: 'Hay una protoboard en el área de trabajo' },
            { ok: document.body.classList.contains('show-nets'), txt: 'El modo “conexiones internas” está activado' }
          ];
        }
      },
      preguntas: [
        { q: '¿Qué agujeros están unidos entre sí en la zona central de la protoboard?', op: ['Los de una misma fila horizontal completa', 'Los 5 de una misma columna, dentro de la misma mitad', 'Todos los de la placa', 'Ninguno: hay que unirlos con cables'], correcta: 1,
          fb: 'Cada columna de 5 agujeros forma un solo punto eléctrico. El canal central separa la mitad de arriba de la de abajo.' },
        { q: '¿Para qué sirven los rieles de los bordes?', op: ['Para sujetar la placa', 'Para llevar la alimentación (+ y −) a lo largo de toda la placa', 'Para conectar el Arduino por USB', 'Para nada, son decorativos'], correcta: 1,
          fb: 'Los rieles recorren toda la placa: se alimentan una vez y de ahí se toma corriente para cualquier parte del circuito.' },
        { q: '¿Qué ocurre si pones las dos patas de un LED en la misma columna?', op: ['Brilla el doble', 'Queda cortocircuitado y no enciende', 'Se invierte su polaridad', 'Funciona igual'], correcta: 1,
          fb: 'Los dos extremos quedan unidos por la tira metálica: la corriente pasa de largo sin atravesar el LED.' }
      ],
      reto: { enunciado: 'Explora: pasa el mouse por un agujero de la fila C y observa qué otros puntos se iluminan.', xp: 10 }
    },

    {
      id: 'n2', titulo: 'Alimentación: VCC y GND', xp: 35,
      resumen: 'De dónde sale la energía y por qué siempre hay que cerrar el circuito.',
      contenido:
        '<p>Ningún circuito funciona sin una <b>fuente de energía</b>. Puede ser una batería, una fuente de laboratorio o la propia placa Arduino.</p>' +
        '<h4>Los dos puntos que nunca faltan</h4>' +
        '<ul><li><b>VCC</b> (o +): el borne positivo. En nuestros circuitos suele ser 5 V o 3,3 V. Se dibuja con cable <span style="color:#ef4444">rojo</span>.</li>' +
        '<li><b>GND</b> (tierra, o −): el punto de 0 V, la referencia de todo. Se dibuja con cable <span style="color:#94a3b8">negro</span>.</li></ul>' +
        '<p>La corriente sale del +, atraviesa los componentes y <b>vuelve</b> al −. Si en algún punto el camino se corta, no pasa nada: eso es un <b>circuito abierto</b>.</p>' +
        '<div class="fig">' + figCorriente() + '<figcaption>Un circuito cerrado: la corriente tiene un camino completo de ida y vuelta.</figcaption></div>' +
        '<div class="callout danger"><div>❌</div><div><b>Cortocircuito:</b> si unes el + con el − sin nada en medio, la corriente se dispara. La fuente se calienta y en la vida real puede dañarse.</div></div>' +
        '<div class="callout"><div>🔗</div><div>Cuando mezclas dos alimentaciones (por ejemplo, una batería y un Arduino) <b>sus GND deben ir unidos</b>. Es el error número uno en los proyectos escolares.</div></div>',
      actividad: {
        enunciado: 'Coloca una protoboard y una fuente de 5 V. Conecta el + al riel rojo y el − al riel azul.',
        pistas: ['La fuente está en la categoría “Alimentación”.',
                 'Para trazar un cable, haz clic sobre el pin + de la fuente y arrastra hasta un agujero del riel rojo.',
                 'El riel rojo es la fila de agujeros que está junto a la línea roja del borde.'],
        comprobar: function () {
          var protos = CL.state.compsPorTipo('protoboard');
          var fuentes = CL.state.compsPorTipo('fuente5v').concat(CL.state.compsPorTipo('bateria'), CL.state.compsPorTipo('fuente3v3'));
          var okP = protos.length >= 1, okF = fuentes.length >= 1;
          var rielPos = false, rielNeg = false;
          if (okP && okF) {
            var bb = protos[0];
            fuentes.forEach(function (f) {
              var netP = CL.circuito.netDePin(f.id, 'p');
              var netN = CL.circuito.netDePin(f.id, 'n');
              ['TP1', 'BP1'].forEach(function (h) { if (CL.circuito.netDePin(bb.id, h) === netP && netP >= 0) rielPos = true; });
              ['TN1', 'BN1'].forEach(function (h) { if (CL.circuito.netDePin(bb.id, h) === netN && netN >= 0) rielNeg = true; });
            });
          }
          return [
            { ok: okP, txt: 'Hay una protoboard' },
            { ok: okF, txt: 'Hay una fuente de alimentación' },
            { ok: rielPos, txt: 'El borne + llega a un riel positivo (rojo)' },
            { ok: rielNeg, txt: 'El borne − llega a un riel negativo (azul)' }
          ];
        }
      },
      preguntas: [
        { q: '¿Qué es GND?', op: ['El polo positivo', 'El punto de referencia de 0 V por donde vuelve la corriente', 'Un interruptor', 'La carcasa del aparato'], correcta: 1,
          fb: 'GND es el retorno y la referencia: todas las tensiones se miden respecto a él.' },
        { q: 'Si unes directamente el + y el − de una batería con un cable, ocurre un…', op: ['circuito abierto', 'divisor de tensión', 'cortocircuito', 'circuito en serie'], correcta: 2,
          fb: 'Sin nada que limite la corriente, esta se dispara: eso es un cortocircuito.' },
        { q: 'Usas una batería para el motor y un Arduino para el control. ¿Qué NO puede faltar?', op: ['Unir los dos GND', 'Unir los dos positivos', 'Usar cables del mismo color', 'Poner un LED'], correcta: 0,
          fb: 'Sin una referencia común, las señales no tienen sentido y el circuito se comporta de forma extraña.' }
      ],
      reto: { enunciado: 'Provoca un cortocircuito a propósito: une el riel rojo con el azul con un cable y observa el aviso del simulador. Después quítalo.', xp: 10 }
    },

    {
      id: 'n3', titulo: 'Resistencias', xp: 35,
      resumen: 'Qué son, cómo se leen sus colores y por qué protegen a los demás componentes.',
      contenido:
        '<p>Una <b>resistencia</b> se opone al paso de la corriente. Es el componente más usado en electrónica.</p>' +
        '<h4>La ley de Ohm</h4>' +
        '<p>Relaciona las tres magnitudes básicas: <code>V = I × R</code></p>' +
        '<ul><li><b>V</b>: tensión, en voltios (V)</li><li><b>I</b>: corriente, en amperios (A)</li><li><b>R</b>: resistencia, en ohmios (Ω)</li></ul>' +
        '<p>Despejando: <code>I = V / R</code>. Es decir, <b>a mayor resistencia, menos corriente</b>.</p>' +
        '<div class="callout"><div>🧮</div><div><b>Ejemplo:</b> si conectamos 5 V a una resistencia de 220 Ω, pasa I = 5 / 220 = 0,0227 A ≈ 23 mA.</div></div>' +
        '<h4>Código de colores</h4>' +
        '<p>Las bandas indican el valor: las dos primeras son cifras y la tercera dice por cuánto se multiplica.</p>' +
        '<ul><li>Rojo-Rojo-Marrón = 22 × 10 = <b>220 Ω</b></li>' +
        '<li>Marrón-Negro-Rojo = 10 × 100 = <b>1 000 Ω = 1 kΩ</b></li>' +
        '<li>Marrón-Negro-Naranja = 10 × 1000 = <b>10 kΩ</b></li></ul>' +
        '<div class="callout ok"><div>✅</div><div>La resistencia <b>no tiene polaridad</b>: puedes montarla en cualquier sentido.</div></div>',
      actividad: {
        enunciado: 'Coloca una resistencia y cámbiale el valor a 1 kΩ desde el panel derecho.',
        pistas: ['Haz doble clic en la resistencia para abrir su ficha.', 'En “Propiedades” hay una lista con los valores comerciales.'],
        comprobar: function () {
          var rs = CL.state.compsPorTipo('resistor');
          return [
            { ok: rs.length >= 1, txt: 'Hay una resistencia en la mesa' },
            { ok: rs.some(function (r) { return +r.props.ohms === 1000; }), txt: 'Alguna resistencia vale 1 kΩ' }
          ];
        }
      },
      preguntas: [
        { q: 'Con 5 V y una resistencia de 1 kΩ, ¿cuánta corriente circula?', op: ['5 A', '0,005 A (5 mA)', '200 A', '1 A'], correcta: 1, fb: 'I = V / R = 5 / 1000 = 0,005 A, es decir 5 mA.' },
        { q: '¿Cuál es el valor de una resistencia Rojo-Rojo-Marrón?', op: ['22 Ω', '220 Ω', '2,2 kΩ', '22 kΩ'], correcta: 1, fb: 'Rojo=2, Rojo=2, Marrón=×10 → 22 × 10 = 220 Ω.' },
        { q: '¿La resistencia tiene polaridad?', op: ['Sí, la banda dorada es el +', 'No, se puede conectar en cualquier sentido', 'Solo si es mayor de 1 kΩ', 'Solo en corriente continua'], correcta: 1, fb: 'Es un componente simétrico: da igual el sentido.' }
      ],
      reto: { enunciado: 'Calcula mentalmente qué resistencia necesitas para que por un LED de 2 V pasen 20 mA con una batería de 9 V. (Pista: R = (9−2)/0,02)', xp: 15 }
    },

    {
      id: 'n4', titulo: 'El LED: tu primer circuito', xp: 45,
      resumen: 'Polaridad, resistencia limitadora y el montaje completo sobre la protoboard.',
      contenido:
        '<p>El <b>LED</b> es un diodo que emite luz. Tiene dos características que hay que respetar siempre:</p>' +
        '<ol><li><b>Polaridad:</b> solo conduce del ánodo (+, pata larga) al cátodo (−, pata corta).</li>' +
        '<li><b>Corriente limitada:</b> soporta unos 20 mA. Por eso lleva SIEMPRE una resistencia en serie.</li></ol>' +
        '<div class="fig">' + figLed() + '<figcaption>Cómo reconocer las patas del LED y los dos errores más comunes.</figcaption></div>' +
        '<h4>El cálculo de la resistencia</h4>' +
        '<p>Se resta la caída del LED a la tensión de la fuente y se divide entre la corriente deseada:</p>' +
        '<p><code>R = (V fuente − V led) / I</code></p>' +
        '<p>Para 5 V, un LED rojo (2 V) y 20 mA: R = (5 − 2) / 0,02 = <b>150 Ω</b>. Como valor comercial se usa <b>220 Ω</b>, que da unos 13 mA: suficiente brillo y más seguridad.</p>' +
        '<div class="callout ok"><div>💡</div><div>El montaje completo es: <b>+ → resistencia → ánodo → cátodo → GND</b>. Si el LED no enciende, recorre ese camino con el dedo y busca dónde se corta.</div></div>',
      ejemplo: 'led_resistencia',
      actividad: {
        enunciado: 'Arma en la protoboard el circuito completo: fuente → resistencia de 220 Ω → LED → GND. El LED debe encender.',
        pistas: ['Primero lleva el + y el − de la fuente a los rieles.',
                 'La resistencia debe ocupar dos columnas distintas: por ejemplo, de la columna 5 a la 9.',
                 'El ánodo del LED va en la misma columna donde termina la resistencia.',
                 'El cátodo del LED va a otra columna, y desde ahí un cable al riel negativo.'],
        comprobar: function () {
          return [
            { ok: CL.state.cuenta('led') >= 1, txt: 'Hay un LED' },
            { ok: CL.state.cuenta('resistor') >= 1, txt: 'Hay una resistencia' },
            { ok: CL.validar.resistenciaEnSerieConLed(), txt: 'La resistencia está conectada al LED' },
            { ok: CL.validar.ledEncendido(), txt: 'El LED está encendido' },
            { ok: CL.validar.corrienteLed() < 0.026 && CL.validar.corrienteLed() > 0.001, txt: 'La corriente es segura (menos de 26 mA)' }
          ];
        }
      },
      preguntas: [
        { q: '¿Qué pata del LED es el ánodo?', op: ['La corta', 'La larga', 'La del lado plano', 'Cualquiera'], correcta: 1, fb: 'La pata larga es el ánodo (+). El lado plano de la cápsula marca el cátodo (−).' },
        { q: 'Con 5 V, un LED de 2 V y 20 mA, la resistencia debe ser de…', op: ['150 Ω', '250 Ω', '1 kΩ', '10 Ω'], correcta: 0, fb: 'R = (5 − 2) / 0,02 = 150 Ω. En la práctica se usa 220 Ω.' },
        { q: 'Conectas el LED al revés. ¿Qué pasa?', op: ['Brilla más', 'No enciende', 'Explota siempre', 'Cambia de color'], correcta: 1, fb: 'El diodo bloquea la corriente en sentido inverso, así que simplemente no enciende.' }
      ],
      reto: { enunciado: 'Cambia la resistencia por una de 1 kΩ y observa cuánto baja el brillo. Después ponle 100 Ω y compara la corriente.', xp: 15 }
    },

    {
      id: 'n5', titulo: 'Pulsadores e interruptores', xp: 40,
      resumen: 'Cómo cortar y cerrar el paso de la corriente, y qué es una resistencia pull-down.',
      contenido:
        '<p>Un <b>interruptor</b> abre o cierra el camino de la corriente. Un <b>pulsador</b> hace lo mismo, pero solo mientras lo mantienes presionado.</p>' +
        '<h4>Las 4 patas del pulsador</h4>' +
        '<p>Los pulsadores de protoboard tienen 4 patas, pero <b>no son 4 conexiones distintas</b>: las de cada lado ya están unidas por dentro. Al presionar, se unen los dos lados.</p>' +
        '<div class="callout warn"><div>⚠️</div><div>Por eso el pulsador se coloca <b>atravesando el canal central</b>. Si lo pones en una sola mitad, sus patas quedan unidas y el circuito estará cerrado siempre.</div></div>' +
        '<h4>Cuando lo lee un Arduino: pull-down</h4>' +
        '<p>Si conectas el pulsador entre 5 V y un pin de entrada, cuando lo sueltas ese pin queda “al aire” (flotando) y el Arduino lee valores al azar.</p>' +
        '<p>La solución es una <b>resistencia de 10 kΩ desde el pin a GND</b>: mientras el botón está suelto, la resistencia mantiene el pin en 0 V (LOW). Al pulsar, llegan los 5 V y lee HIGH.</p>' +
        '<div class="callout"><div>🔁</div><div>La alternativa es usar <code>pinMode(2, INPUT_PULLUP)</code>: el Arduino activa una resistencia interna hacia 5 V y entonces la lógica se invierte (pulsado = LOW).</div></div>',
      ejemplo: 'led_pulsador',
      actividad: {
        enunciado: 'Arma un circuito donde el LED encienda solo mientras presionas un pulsador.',
        pistas: ['El pulsador va en serie, entre la alimentación y la resistencia del LED.',
                 'Colócalo atravesando el canal central de la protoboard.',
                 'Recuerda hacer clic sostenido sobre el pulsador para probarlo.'],
        comprobar: function () {
          var hay = CL.state.cuenta('pulsador') >= 1 || CL.state.cuenta('interruptor') >= 1;
          var conectado = false;
          CL.state.compsPorTipo('pulsador').concat(CL.state.compsPorTipo('interruptor')).forEach(function (c) {
            var d = CL.catalogo[c.type];
            var n = d.pins.filter(function (p) { return CL.circuito.conectado(c.id, p.id); }).length;
            if (n >= 2) conectado = true;
          });
          return [
            { ok: hay, txt: 'Hay un pulsador o un interruptor' },
            { ok: CL.state.cuenta('led') >= 1, txt: 'Hay un LED' },
            { ok: conectado, txt: 'El pulsador está conectado por sus dos lados' },
            { ok: CL.validar.resistenciaEnSerieConLed(), txt: 'El LED tiene su resistencia' }
          ];
        }
      },
      preguntas: [
        { q: '¿Cuántas conexiones eléctricas distintas tiene un pulsador de 4 patas sin presionar?', op: ['4', '2', '1', '3'], correcta: 1, fb: 'Dos: las patas de cada lado están unidas entre sí. Al presionar, ambos lados se juntan.' },
        { q: '¿Para qué sirve una resistencia pull-down de 10 kΩ?', op: ['Para que el LED brille menos', 'Para que el pin de entrada valga 0 V cuando el botón está suelto', 'Para proteger la batería', 'Para hacer más rápido el Arduino'], correcta: 1, fb: 'Evita que el pin quede flotando y lea valores al azar.' },
        { q: 'Con INPUT_PULLUP, al presionar el botón el Arduino lee…', op: ['HIGH', 'LOW', 'nada', 'un valor analógico'], correcta: 1, fb: 'La resistencia interna sube el pin a 5 V; al pulsar se conecta a GND y se lee LOW.' }
      ],
      reto: { enunciado: 'Añade un segundo pulsador en paralelo con el primero: el LED debe encender con cualquiera de los dos.', xp: 15 }
    },

    {
      id: 'n6', titulo: 'Potenciómetro y divisor de tensión', xp: 45,
      resumen: 'Cómo obtener un valor variable y controlar el brillo con PWM.',
      contenido:
        '<p>El <b>potenciómetro</b> es una resistencia variable de tres patas. Entre los extremos hay siempre el mismo valor (por ejemplo 10 kΩ); la pata del medio (<b>cursor</b>) lo divide en dos partes.</p>' +
        '<div class="fig">' + figDivisor() + '<figcaption>Divisor de tensión: el cursor entrega una tensión entre 0 V y 5 V según el giro.</figcaption></div>' +
        '<h4>Dos formas de usarlo</h4>' +
        '<ul><li><b>Como reóstato</b> (2 patas): cambia la resistencia del circuito. Sirve para variar el brillo de un LED directamente.</li>' +
        '<li><b>Como divisor</b> (3 patas): entrega una tensión variable que el Arduino lee con <code>analogRead()</code>, obteniendo un número de <b>0 a 1023</b>.</li></ul>' +
        '<h4>PWM: brillo desde el programa</h4>' +
        '<p>Los pines marcados con <b>~</b> pueden usar <code>analogWrite(pin, valor)</code> con un valor de 0 a 255. En realidad encienden y apagan miles de veces por segundo; el ojo percibe un brillo intermedio.</p>' +
        '<div class="fig">' + figPWM() + '<figcaption>Cuanto más tiempo está encendida la señal, más brillo se percibe.</figcaption></div>',
      ejemplo: 'pot_led',
      actividad: {
        enunciado: 'Arma un circuito donde el potenciómetro controle el brillo de un LED. Gira la perilla y comprueba que el brillo cambia.',
        pistas: ['Puedes usar solo dos patas del potenciómetro (un extremo y el cursor) para que funcione como resistencia variable.',
                 'Deja siempre la resistencia de 220 Ω: protege al LED cuando el potenciómetro esté en cero.',
                 'Arrastra la perilla en el lienzo o usa el deslizador del panel derecho.'],
        comprobar: function () {
          return [
            { ok: CL.state.cuenta('pot') >= 1, txt: 'Hay un potenciómetro' },
            { ok: CL.state.cuenta('led') >= 1, txt: 'Hay un LED' },
            { ok: CL.validar.ledEncendido(), txt: 'El LED enciende' },
            { ok: CL.state.compsPorTipo('pot').some(function (p) {
                return CL.catalogo.pot.pins.filter(function (x) { return CL.circuito.conectado(p.id, x.id); }).length >= 2;
              }), txt: 'El potenciómetro está conectado por al menos dos patas' }
          ];
        }
      },
      preguntas: [
        { q: 'analogRead() devuelve un número entre…', op: ['0 y 255', '0 y 1023', '0 y 5', '0 y 100'], correcta: 1, fb: 'El conversor del Arduino es de 10 bits: 2¹⁰ = 1024 valores, de 0 a 1023.' },
        { q: 'analogWrite() admite valores entre…', op: ['0 y 1023', '0 y 255', '0 y 180', '0 y 5'], correcta: 1, fb: 'La señal PWM se expresa en 8 bits: de 0 (siempre apagado) a 255 (siempre encendido).' },
        { q: 'Si el potenciómetro está justo en la mitad y sus extremos están a 5 V y GND, en el cursor hay…', op: ['5 V', '0 V', '≈ 2,5 V', 'depende del LED'], correcta: 2, fb: 'El divisor reparte la tensión en partes iguales.' }
      ],
      reto: { enunciado: 'Conecta el cursor del potenciómetro a A0 de un Arduino y escribe un programa que copie ese valor al brillo de un LED (pin 9).', xp: 20 }
    },

    {
      id: 'n7', titulo: 'La placa Arduino', xp: 50,
      resumen: 'Sus pines, la estructura setup/loop y tu primer programa.',
      contenido:
        '<p>Arduino es una placa con un pequeño computador dentro. Ejecuta el programa que le cargues, una y otra vez, mientras tenga energía.</p>' +
        '<div class="fig">' + figArduino() + '<figcaption>Arriba, los pines digitales; abajo, la alimentación y las entradas analógicas.</figcaption></div>' +
        '<h4>Tipos de pines</h4>' +
        '<ul><li><b>Digitales (0-13):</b> solo entienden dos estados, HIGH (5 V) o LOW (0 V).</li>' +
        '<li><b>PWM (~3, ~5, ~6, ~9, ~10, ~11):</b> además pueden simular valores intermedios.</li>' +
        '<li><b>Analógicos (A0-A5):</b> leen tensiones y las convierten en números de 0 a 1023.</li>' +
        '<li><b>5V, 3.3V, GND, VIN:</b> alimentación.</li></ul>' +
        '<h4>La estructura de todo programa</h4>' +
        '<div class="code-sample">void setup() {\n  // se ejecuta UNA vez al encender\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  // se repite para siempre\n  digitalWrite(13, HIGH);\n  delay(1000);\n  digitalWrite(13, LOW);\n  delay(1000);\n}</div>' +
        '<div class="callout"><div>⌨️</div><div>Abre el editor con el botón <b>Código</b> de la barra superior. Puedes escribir el programa o armarlo con <b>bloques</b>.</div></div>' +
        '<div class="callout warn"><div>⚠️</div><div>Cada pin entrega como máximo <b>40 mA</b>. Un LED con su resistencia está bien; un motor, no.</div></div>',
      ejemplo: 'ard_led',
      actividad: {
        enunciado: 'Conecta un LED con su resistencia al pin 13 del Arduino y haz que parpadee cada segundo.',
        pistas: ['Necesitas tres cables: del pin 13 a la resistencia, del LED al riel negativo y del GND del Arduino a ese mismo riel.',
                 'En el editor de código usa la plantilla “LED que parpadea”.',
                 'No olvides pinMode(13, OUTPUT); dentro de setup().'],
        comprobar: function () {
          var placas = CL.state.proj.components.filter(function (c) { var d = CL.catalogo[c.type]; return d && d.familia === 'arduino'; });
          var codigo = (CL.state.proj.code || '');
          return [
            { ok: placas.length >= 1, txt: 'Hay una placa Arduino' },
            { ok: CL.state.cuenta('led') >= 1 && CL.validar.resistenciaEnSerieConLed(), txt: 'El LED tiene su resistencia' },
            { ok: /pinMode\s*\(/.test(codigo), txt: 'El programa usa pinMode()' },
            { ok: /digitalWrite\s*\(/.test(codigo) && /delay\s*\(/.test(codigo), txt: 'El programa usa digitalWrite() y delay()' },
            { ok: CL.runtime.corriendo, txt: 'La simulación está en marcha' }
          ];
        }
      },
      preguntas: [
        { q: '¿Qué hace la función setup()?', op: ['Se repite sin parar', 'Se ejecuta una sola vez al encender', 'Apaga la placa', 'Lee los sensores'], correcta: 1, fb: 'setup() prepara la placa: modos de los pines, comunicación serie, etc.' },
        { q: '¿Qué significa el símbolo ~ junto a un pin?', op: ['Que es analógico', 'Que admite PWM', 'Que está dañado', 'Que da 3,3 V'], correcta: 1, fb: 'Los pines con ~ pueden usar analogWrite() para simular valores intermedios.' },
        { q: '¿Cuánta corriente puede dar un pin de Arduino?', op: ['40 mA como máximo', '1 A', '5 A', 'ilimitada'], correcta: 0, fb: 'Por eso los motores necesitan un driver o un transistor.' }
      ],
      reto: { enunciado: 'Modifica el programa para que el LED parpadee rápido 3 veces y luego haga una pausa larga.', xp: 20 }
    },

    {
      id: 'n8', titulo: 'Sensores: leer el mundo', xp: 50,
      resumen: 'Sensores analógicos y digitales, y cómo tomar decisiones con sus valores.',
      contenido:
        '<p>Un <b>sensor</b> convierte algo del mundo real (luz, distancia, temperatura, movimiento) en una señal eléctrica que la placa puede leer.</p>' +
        '<h4>Dos familias</h4>' +
        '<ul><li><b>Digitales:</b> solo dicen sí o no. Ejemplo: el sensor de movimiento PIR. Se leen con <code>digitalRead()</code>.</li>' +
        '<li><b>Analógicos:</b> entregan un valor continuo. Ejemplo: LDR, TMP36, potenciómetro. Se leen con <code>analogRead()</code>.</li></ul>' +
        '<h4>Tomar decisiones</h4>' +
        '<div class="code-sample">int luz = analogRead(A0);\n\nif (luz &lt; 400) {\n  digitalWrite(led, HIGH);   // está oscuro: enciende\n} else {\n  digitalWrite(led, LOW);\n}</div>' +
        '<p>Ese <code>400</code> es el <b>umbral</b>: el punto a partir del cual cambiamos de comportamiento. Elegirlo bien es parte del trabajo de un buen proyecto.</p>' +
        '<div class="callout"><div>📏</div><div>El sensor ultrasónico se lee distinto: se manda un pulso por TRIG y se mide con <code>pulseIn()</code> cuánto tarda el eco. Luego: <code>cm = tiempo * 0.034 / 2</code>.</div></div>' +
        '<div class="callout warn"><div>⚠️</div><div>Todo sensor necesita <b>alimentación</b> (VCC y GND). Si te olvidas de uno de los dos, su salida no vale nada.</div></div>',
      ejemplo: 'ard_ultra',
      actividad: {
        enunciado: 'Conecta un sensor (LDR, ultrasónico, temperatura o PIR) correctamente alimentado y comprueba que entrega valores.',
        pistas: ['Conecta VCC al riel rojo y GND al riel azul.',
                 'Si usas la LDR, recuerda que necesita una resistencia en serie para formar el divisor.',
                 'Con la simulación corriendo, mueve el deslizador del sensor en el panel derecho.'],
        comprobar: function () {
          var sensores = CL.state.proj.components.filter(function (c) { var d = CL.catalogo[c.type]; return d && d.sensor; });
          var alimentado = sensores.some(function (c) {
            var st = CL.circuito.estado(c.id);
            return st && (st.alimentado === true || c.type === 'ldr');
          });
          return [
            { ok: sensores.length >= 1, txt: 'Hay al menos un sensor' },
            { ok: alimentado, txt: 'El sensor está correctamente alimentado' },
            { ok: CL.runtime.corriendo, txt: 'La simulación está en marcha' }
          ];
        }
      },
      preguntas: [
        { q: '¿Con qué función se lee un sensor analógico?', op: ['digitalRead()', 'analogRead()', 'analogWrite()', 'pulseIn()'], correcta: 1, fb: 'analogRead() devuelve un número de 0 a 1023 proporcional a la tensión.' },
        { q: 'El sensor ultrasónico mide la distancia usando…', op: ['luz infrarroja', 'el tiempo que tarda el eco del sonido', 'un imán', 'la temperatura'], correcta: 1, fb: 'Emite un ultrasonido y cronometra cuánto tarda en volver. Se divide entre 2 porque va y vuelve.' },
        { q: 'Un sensor no entrega datos coherentes. ¿Qué revisarías primero?', op: ['El color de los cables', 'Que tenga VCC y GND bien conectados', 'La marca del sensor', 'La versión del navegador'], correcta: 1, fb: 'La falta de alimentación (o de GND común) es la causa más frecuente.' }
      ],
      reto: { enunciado: 'Escribe un programa que encienda un LED cuando la distancia medida sea menor de 15 cm y lo apague si es mayor.', xp: 20 }
    },

    {
      id: 'n9', titulo: 'Motores y movimiento', xp: 50,
      resumen: 'Motor DC, servo y por qué no se conectan directo a la placa.',
      contenido:
        '<p>Los motores convierten la electricidad en movimiento. Son los <b>actuadores</b> más usados en robótica.</p>' +
        '<h4>Motor DC</h4>' +
        '<p>Gira sin parar mientras tenga tensión. Cambiando la polaridad se invierte el sentido; bajando la tensión, gira más despacio.</p>' +
        '<h4>Servomotor</h4>' +
        '<p>No gira libremente: se coloca en el <b>ángulo</b> que le pidas, entre 0° y 180°, y se mantiene ahí. Tiene tres cables: 5 V, GND y señal.</p>' +
        '<div class="code-sample">#include &lt;Servo.h&gt;\nServo brazo;\n\nvoid setup() {\n  brazo.attach(9);\n}\n\nvoid loop() {\n  brazo.write(0);\n  delay(500);\n  brazo.write(180);\n  delay(500);\n}</div>' +
        '<h4>Motor paso a paso</h4>' +
        '<p>Avanza en pasos exactos (por ejemplo, 1,8° cada uno). Es el motor de las impresoras 3D, donde la precisión importa más que la velocidad.</p>' +
        '<div class="callout danger"><div>❌</div><div><b>Nunca</b> conectes un motor DC directamente a un pin: pide mucha más corriente de la que el pin puede dar. Usa un transistor, un driver L293D o un relé, y alimenta el motor con su propia batería (uniendo los GND).</div></div>',
      ejemplo: 'ard_servo',
      actividad: {
        enunciado: 'Coloca un motor DC alimentado con una batería y hazlo girar. Después invierte los cables y observa el cambio de sentido.',
        pistas: ['El motor está en la categoría “Robótica”.',
                 'Usa una batería de 6 V y un interruptor en serie.',
                 'Para invertir el giro, cambia el cable del + por el del −.'],
        comprobar: function () {
          return [
            { ok: CL.state.cuenta('motor') >= 1 || CL.state.cuenta('servo') >= 1, txt: 'Hay un motor o un servo' },
            { ok: CL.validar.motorGirando() || CL.validar.servoEnAngulo(0, 180), txt: 'El motor gira o el servo está alimentado' }
          ];
        }
      },
      preguntas: [
        { q: '¿Cómo se invierte el giro de un motor DC?', op: ['Bajando la tensión', 'Invirtiendo la polaridad de la alimentación', 'Cambiando el color del cable', 'No se puede'], correcta: 1, fb: 'Al invertir + y −, el campo magnético cambia de sentido y el eje gira al contrario.' },
        { q: 'El servo se controla…', op: ['con la tensión de alimentación', 'con pulsos por el cable de señal', 'con un potenciómetro obligatorio', 'con corriente alterna'], correcta: 1, fb: 'La duración del pulso (1 a 2 ms) indica el ángulo deseado.' },
        { q: '¿Por qué no se conecta un motor directo a un pin de Arduino?', op: ['Porque el pin no da suficiente corriente y se daña', 'Porque el motor gira al revés', 'Porque hace ruido', 'Sí se puede sin problema'], correcta: 0, fb: 'Un motor puede pedir cientos de mA; el pin solo entrega 40 mA.' }
      ],
      reto: { enunciado: 'Programa un servo para que haga un barrido continuo de 0° a 180° y vuelva, moviéndose de 10 en 10 grados.', xp: 20 }
    },

    {
      id: 'n10', titulo: 'Proyecto final: sistema robótico', xp: 100,
      resumen: 'Unir sensores, decisiones y actuadores en un sistema completo.',
      contenido:
        '<p>Todo sistema robótico sigue el mismo esquema: <b>sensar → decidir → actuar</b>, y repetir.</p>' +
        '<div class="fig">' + figRobot() + '<figcaption>El ciclo básico de cualquier robot, por sencillo que sea.</figcaption></div>' +
        '<h4>Tu misión</h4>' +
        '<p>Construye un <b>sistema de alarma</b> que cumpla lo siguiente:</p>' +
        '<ol><li>Un sensor detecta una condición (movimiento, distancia corta o poca luz).</li>' +
        '<li>Cuando se cumple, se enciende un LED.</li>' +
        '<li>Al mismo tiempo suena el buzzer.</li>' +
        '<li>Se envía un mensaje al Monitor Serie con el número de evento.</li></ol>' +
        '<div class="callout"><div>🧠</div><div><b>Consejo de diseño:</b> arma y prueba una parte cada vez. Primero el LED, después el sensor, después el buzzer. Así, si algo falla, sabes exactamente dónde buscar.</div></div>' +
        '<div class="callout ok"><div>🏆</div><div>Al superar este nivel habrás recorrido todo el camino: protoboard, alimentación, componentes, sensores, actuadores y programación.</div></div>',
      ejemplo: 'alarma',
      actividad: {
        enunciado: 'Construye el sistema de alarma completo: sensor + Arduino + LED + buzzer, con mensajes en el Monitor Serie.',
        pistas: ['Empieza por la alimentación: 5 V y GND del Arduino a los rieles de la protoboard.',
                 'Conecta el sensor y comprueba en el panel derecho que dice “alimentado”.',
                 'Añade el LED con su resistencia a un pin digital, y el buzzer a otro.',
                 'En el programa usa if (digitalRead(pir) == HIGH) para decidir.',
                 'Usa Serial.begin(9600) en setup() y Serial.println() dentro del if.'],
        comprobar: function () {
          var codigo = CL.state.proj.code || '';
          var placas = CL.state.proj.components.filter(function (c) { var d = CL.catalogo[c.type]; return d && d.placa; });
          var sensores = CL.state.proj.components.filter(function (c) { var d = CL.catalogo[c.type]; return d && d.sensor; });
          return [
            { ok: placas.length >= 1, txt: 'Hay una placa programable' },
            { ok: sensores.length >= 1, txt: 'Hay un sensor' },
            { ok: CL.state.cuenta('led') >= 1, txt: 'Hay un LED indicador' },
            { ok: CL.state.cuenta('buzzer') >= 1, txt: 'Hay un buzzer' },
            { ok: /Serial\.(print|println)/.test(codigo), txt: 'El programa envía mensajes al Monitor Serie' },
            { ok: /if\s*\(/.test(codigo), txt: 'El programa toma decisiones con if' },
            { ok: CL.validar.sinErrores(), txt: 'El circuito no tiene errores eléctricos' }
          ];
        }
      },
      preguntas: [
        { q: 'El ciclo básico de un robot es…', op: ['encender → apagar', 'sensar → decidir → actuar', 'programar → soldar → vender', 'medir → dibujar'], correcta: 1, fb: 'Lee el entorno, decide con su programa y actúa sobre el mundo. Y vuelve a empezar.' },
        { q: '¿Cuál es la mejor estrategia para armar un proyecto grande?', op: ['Conectarlo todo y probar al final', 'Armar y probar por partes', 'Copiar el circuito sin entenderlo', 'Empezar por el programa completo'], correcta: 1, fb: 'Por partes: así cada error aparece en un contexto pequeño y fácil de revisar.' },
        { q: 'El Monitor Serie sirve para…', op: ['alimentar la placa', 'ver los mensajes que envía el programa', 'medir la resistencia', 'cargar el programa'], correcta: 1, fb: 'Es la ventana por la que el Arduino nos cuenta qué está pasando: la mejor herramienta para depurar.' }
      ],
      reto: { enunciado: 'Amplía la alarma: añade un pulsador que la desactive y un segundo LED verde que indique “sistema armado”.', xp: 40 }
    }
  ];

  L.porId = function (id) {
    for (var i = 0; i < L.lista.length; i++) if (L.lista[i].id === id) return L.lista[i];
    return null;
  };

  /* ============================================================
     INTERFAZ DEL CURSO
     ============================================================ */
  L.abrir = function () {
    var prog = CL.proyectos.progreso;
    var nivel = prog.nivel();
    var d = prog.datos();
    var hechas = L.lista.filter(function (l) { return prog.hecho('lecciones', l.id); }).length;

    var h = '<div class="score-bar"><div class="sb-xp">' + (d.xp || 0) + '</div>' +
      '<div class="sb-lbl">puntos<br><b>' + nivel.nombre + '</b> ' + nivel.estrellas + '</div>' +
      '<div class="sb-prog"><i style="width:' + Math.round(hechas / L.lista.length * 100) + '%"></i></div>' +
      '<div class="sb-lbl">' + hechas + ' / ' + L.lista.length + '<br>niveles</div></div>';

    h += '<p style="font-size:12.5px;color:var(--text-dim);line-height:1.6;margin-bottom:12px">' +
      'Diez niveles para pasar de no haber tocado nunca una protoboard a construir tu propio sistema robótico. ' +
      'Cada nivel trae explicación, animación, actividad práctica, preguntas y un reto.</p>';

    h += '<div class="lvl-list">';
    L.lista.forEach(function (l, i) {
      var hecho = prog.hecho('lecciones', l.id);
      var bloqueado = i > 0 && !prog.hecho('lecciones', L.lista[i - 1].id) && !hecho && CL.pref('bloquearNiveles', false);
      h += '<button class="lvl' + (hecho ? ' done' : '') + (bloqueado ? ' locked' : '') + '" data-id="' + l.id + '">' +
        '<div class="lv-num">' + (hecho ? '✓' : (i + 1)) + '</div>' +
        '<div class="lv-txt"><b>' + CL.esc(l.titulo) + '</b><small>' + CL.esc(l.resumen) + '</small>' +
        '<div class="lv-meta"><span>+' + l.xp + ' pts</span><span>' + l.preguntas.length + ' preguntas</span>' +
        (l.ejemplo ? '<span>con ejemplo</span>' : '') + '</div></div></button>';
    });
    h += '</div>';

    CL.dialogo.cajon('📚 Curso: de la protoboard al robot', h, {
      alAbrir: function (cont) {
        CL.$$('.lvl', cont).forEach(function (b) {
          b.addEventListener('click', function () { L.abrirLeccion(b.dataset.id); });
        });
      }
    });
  };

  L.abrirLeccion = function (id) {
    var l = L.porId(id);
    if (!l) return;
    var idx = L.lista.indexOf(l);
    var h = '<div class="lesson">';
    h += '<h3>Nivel ' + (idx + 1) + ' · ' + CL.esc(l.titulo) + '</h3>';
    h += '<p class="lead">' + CL.esc(l.resumen) + '</p>';
    h += l.contenido;

    if (l.ejemplo) {
      h += '<div class="task"><h5>🧪 Ejemplo listo para probar</h5>' +
        '<p>Carga el circuito ya armado y obsérvalo funcionando antes de construirlo tú.</p>' +
        '<button class="btn small primary" data-ej="' + l.ejemplo + '">Probar el ejemplo</button></div>';
    }

    if (l.actividad) {
      h += '<div class="task"><h5>🔨 Actividad práctica</h5><p>' + CL.esc(l.actividad.enunciado) + '</p>' +
        '<div class="btn-row"><button class="btn small ok" data-act="comprobar">✔ Comprobar mi circuito</button>' +
        '<button class="btn small" data-act="pista">💡 Pista</button></div>' +
        '<ul class="check-list" id="listaComprobacion"></ul></div>';
    }

    h += '<h4>Preguntas</h4><div id="quizCont"></div>';

    if (l.reto) {
      h += '<div class="task"><h5>🎯 Reto (+' + l.reto.xp + ' pts)</h5><p>' + CL.esc(l.reto.enunciado) + '</p>' +
        '<button class="btn small violet" data-act="reto">Lo logré</button></div>';
    }

    h += '<div class="lesson-nav">' +
      '<button class="btn ghost" data-nav="lista">← Todos los niveles</button>' +
      (idx > 0 ? '<button class="btn" data-nav="' + L.lista[idx - 1].id + '">← Anterior</button>' : '') +
      (idx < L.lista.length - 1 ? '<button class="btn primary" data-nav="' + L.lista[idx + 1].id + '">Siguiente →</button>' : '<button class="btn ok" data-nav="lista">Terminar</button>') +
      '</div></div>';

    CL.dialogo.cajon(l.titulo, h, { alAbrir: function (cont) { enlazarLeccion(cont, l); } });
  };

  function enlazarLeccion(cont, l) {
    CL.$$('[data-ej]', cont).forEach(function (b) {
      b.addEventListener('click', function () { CL.ejemplos.cargarCircuito(b.dataset.ej, true); });
    });
    CL.$$('[data-nav]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.nav === 'lista') L.abrir(); else L.abrirLeccion(b.dataset.nav);
      });
    });
    var btnComp = cont.querySelector('[data-act="comprobar"]');
    if (btnComp) {
      btnComp.addEventListener('click', function () { comprobarActividad(cont, l); });
    }
    var btnPista = cont.querySelector('[data-act="pista"]');
    if (btnPista) {
      btnPista.addEventListener('click', function () {
        CL.asistente.contexto({ titulo: l.titulo, enunciado: l.actividad.enunciado, pistas: l.actividad.pistas, ejemplo: l.ejemplo });
        CL.asistente.pista();
        CL.emit('panel:derecha', 'asis');
      });
    }
    var btnReto = cont.querySelector('[data-act="reto"]');
    if (btnReto) {
      btnReto.addEventListener('click', function () {
        CL.proyectos.progreso.completar('retos', l.id, l.reto.xp);
        CL.toast('ok', '¡Reto conseguido!', '+' + l.reto.xp + ' puntos');
        CL.sfx.win();
        btnReto.disabled = true;
        btnReto.textContent = '✓ Reto completado';
      });
    }
    pintarQuiz(cont.querySelector('#quizCont'), l);
  }

  function comprobarActividad(cont, l) {
    var lista = cont.querySelector('#listaComprobacion');
    CL.circuito.resolver(0.016);
    var res = l.actividad.comprobar();
    lista.innerHTML = res.map(function (r) {
      return '<li class="' + (r.ok ? 'ok' : 'no') + '"><span class="ci">' + (r.ok ? '✅' : '⬜') + '</span>' + CL.esc(r.txt) + '</li>';
    }).join('');
    var todo = res.every(function (r) { return r.ok; });
    if (todo) {
      var ya = CL.proyectos.progreso.hecho('lecciones', l.id);
      CL.proyectos.progreso.completar('lecciones', l.id, l.xp);
      CL.toast('ok', '¡Actividad superada!', ya ? 'Ya la tenías completada.' : '+' + l.xp + ' puntos');
      CL.sfx.win();
      CL.mensaje('ok', '¡Muy bien! ' + l.titulo, 'Completaste la actividad práctica de este nivel.', 'Sigue con las preguntas y el reto.');
    } else {
      var faltan = res.filter(function (r) { return !r.ok; });
      CL.toast('warn', 'Casi lo tienes', 'Falta: ' + faltan[0].txt.toLowerCase());
      CL.sfx.bad();
      CL.asistente.contexto({ titulo: l.titulo, enunciado: l.actividad.enunciado, pistas: l.actividad.pistas, ejemplo: l.ejemplo });
      CL.asistente.decir('🔎 Revisión de la actividad',
        'Todavía falta: <b>' + CL.esc(faltan[0].txt) + '</b>.',
        [{ etq: '💡 Dame una pista', fn: function () { CL.asistente.pista(); } }]);
    }
  }

  /* ---- preguntas ---- */
  function pintarQuiz(cont, l) {
    if (!cont) return;
    var aciertos = 0, respondidas = 0;
    cont.innerHTML = '';
    l.preguntas.forEach(function (p, i) {
      var caja = CL.el('div', { class: 'quiz' });
      caja.innerHTML = '<div class="q-num">Pregunta ' + (i + 1) + ' de ' + l.preguntas.length + '</div>' +
        '<div class="q-txt">' + CL.esc(p.q) + '</div>';
      var ops = CL.el('div');
      p.op.forEach(function (o, k) {
        var b = CL.el('button', { class: 'opt' },
          '<span class="o-key">' + 'ABCD'.charAt(k) + '</span><span>' + CL.esc(o) + '</span>');
        b.addEventListener('click', function () {
          if (caja.dataset.hecha) return;
          caja.dataset.hecha = '1';
          respondidas++;
          var fb = caja.querySelector('.q-feed');
          CL.$$('.opt', ops).forEach(function (x) { x.disabled = true; });
          if (k === p.correcta) {
            b.classList.add('right');
            aciertos++;
            fb.className = 'q-feed ok show';
            fb.innerHTML = '✅ ¡Correcto! ' + CL.esc(p.fb);
            CL.sfx.ok();
          } else {
            b.classList.add('wrong');
            CL.$$('.opt', ops)[p.correcta].classList.add('right');
            fb.className = 'q-feed no show';
            fb.innerHTML = '❌ No es esa. ' + CL.esc(p.fb);
            CL.sfx.bad();
          }
          if (respondidas === l.preguntas.length) {
            var pts = Math.round(aciertos / l.preguntas.length * 20);
            CL.proyectos.progreso.completar('examenes', l.id, pts, { aciertos: aciertos, total: l.preguntas.length });
            CL.toast(aciertos === l.preguntas.length ? 'ok' : 'info',
              'Preguntas: ' + aciertos + ' de ' + l.preguntas.length,
              '+' + pts + ' puntos');
          }
        });
        ops.appendChild(b);
      });
      caja.appendChild(ops);
      caja.appendChild(CL.el('div', { class: 'q-feed' }));
      cont.appendChild(caja);
    });
  }

}(window.CL));
