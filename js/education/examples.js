/* ============================================================
   CircuitLab — circuitos de ejemplo ya construidos
   Cada ejemplo se arma con un pequeño constructor que conoce la
   geometría real de la protoboard, así los montajes funcionan.
   ============================================================ */
(function (CL) {
  'use strict';

  var E = {};
  CL.ejemplos = E;

  /* ============================================================
     CONSTRUCTOR DE CIRCUITOS
     ============================================================ */
  function Constructor() {
    this.comps = [];
    this.wires = [];
    this.alias = {};
    this.code = '';
  }
  Constructor.prototype._id = function (alias, tipo) {
    var id = alias + '_' + tipo.slice(0, 3);
    this.alias[alias] = id;
    return id;
  };
  Constructor.prototype.proto = function (alias, x, y) {
    alias = alias || 'bb';
    var c = { id: this._id(alias, 'protoboard'), type: 'protoboard', x: x || 0, y: y || 0, rot: 0, props: {} };
    this.comps.push(c);
    this.bb = c;
    return this;
  };
  /** Posición local de un agujero de la protoboard. */
  function hoyoLocal(pinId) {
    var pins = CL.catalogo.protoboard.pins;
    for (var i = 0; i < pins.length; i++) if (pins[i].id === pinId) return pins[i];
    return null;
  }
  /** Coloca un componente insertando uno de sus pines en un agujero. */
  Constructor.prototype.enHoyo = function (alias, tipo, pinComp, hoyo, props, rot) {
    var def = CL.catalogo[tipo];
    var h = hoyoLocal(hoyo);
    if (!def || !h || !this.bb) return this;
    var pl = null;
    for (var i = 0; i < def.pins.length; i++) if (def.pins[i].id === pinComp) pl = def.pins[i];
    if (!pl) return this;
    var r = CL.rot(pl.x, pl.y, rot || 0);
    var c = {
      id: this._id(alias, tipo), type: tipo,
      x: Math.round(this.bb.x + h.x - r.x),
      y: Math.round(this.bb.y + h.y - r.y),
      rot: rot || 0,
      props: Object.assign({}, def.props || {}, props || {})
    };
    this.comps.push(c);
    return this;
  };
  Constructor.prototype.libre = function (alias, tipo, x, y, props, rot) {
    var def = CL.catalogo[tipo];
    if (!def) return this;
    this.comps.push({
      id: this._id(alias, tipo), type: tipo, x: x, y: y, rot: rot || 0,
      props: Object.assign({}, def.props || {}, props || {})
    });
    return this;
  };
  Constructor.prototype.cable = function (a, b, color) {
    var pa = a.split(':'), pb = b.split(':');
    this.wires.push({
      id: CL.uid('w'),
      a: { comp: this.alias[pa[0]] || pa[0], pin: pa[1] },
      b: { comp: this.alias[pb[0]] || pb[0], pin: pb[1] },
      color: color || 'verde'
    });
    return this;
  };
  Constructor.prototype.codigo = function (c) { this.code = c; return this; };
  Constructor.prototype.fin = function (board) {
    return { components: this.comps, wires: this.wires, code: this.code, board: board || 'arduino_uno' };
  };
  function nuevo() { return new Constructor(); }
  E.Constructor = Constructor;
  E.nuevo = nuevo;

  /* ============================================================
     DIAGRAMA DE BLOQUES (para la ficha del ejemplo)
     ============================================================ */
  E.diagrama = function (pasos, colores) {
    var ancho = 100, alto = 40, sep = 30;
    var total = pasos.length * ancho + (pasos.length - 1) * sep;
    var s = '<svg viewBox="0 0 ' + (total + 20) + ' 80" xmlns="http://www.w3.org/2000/svg">';
    pasos.forEach(function (p, i) {
      var x = 10 + i * (ancho + sep);
      var col = (colores && colores[i]) || '#22d3ee';
      s += '<rect x="' + x + '" y="18" width="' + ancho + '" height="' + alto + '" rx="8" fill="rgba(34,211,238,.10)" stroke="' + col + '" stroke-width="1.4"/>';
      var lineas = String(p).split('|');
      lineas.forEach(function (l, k) {
        s += '<text x="' + (x + ancho / 2) + '" y="' + (38 + k * 12 + (lineas.length === 1 ? 5 : 0)) + '" text-anchor="middle" font-size="' +
             (l.length > 14 ? 9 : 11) + '" fill="#dbeafe" font-family="system-ui">' + CL.esc(l) + '</text>';
      });
      if (i < pasos.length - 1) {
        var x2 = x + ancho;
        s += '<path d="M' + (x2 + 4) + ' 38 L' + (x2 + sep - 8) + ' 38" stroke="#94a3b8" stroke-width="1.6" marker-end="url(#fl)"/>';
      }
    });
    s += '<defs><marker id="fl" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">' +
         '<path d="M0 0 L6 3 L0 6 z" fill="#94a3b8"/></marker></defs></svg>';
    return s;
  };

  /* ============================================================
     LOS 20 EJEMPLOS
     ============================================================ */
  E.lista = [
    {
      id: 'led_basico', nombre: 'LED básico', emoji: '💡', nivel: 1, cat: 'basico',
      objetivo: 'Ver el circuito más simple posible… y descubrir por qué NO se debe hacer así.',
      componentes: ['Fuente de 5 V', 'LED rojo'],
      diagrama: ['5 V', 'LED', 'GND'],
      explicacion: '<p>Este montaje conecta el LED directamente a 5 V. El LED <b>enciende</b>, pero por él circula muchísima más corriente de la que soporta (más de 200 mA cuando el máximo son 20 mA).</p>' +
        '<p>En la vida real el LED se quemaría en segundos. Fíjate en el aviso que aparece en la consola: el simulador te lo advierte.</p>' +
        '<div class="callout warn"><div>⚠️</div><div><b>Regla de oro:</b> un LED nunca va solo. Siempre necesita una resistencia en serie que limite la corriente.</div></div>' +
        '<p>Pasa al ejemplo <b>“LED con resistencia”</b> para verlo bien hecho.</p>',
      construir: function () {
        return nuevo()
          .libre('f', 'fuente5v', -120, 0)
          .libre('d', 'led', 90, -10, { color: 'rojo' })
          .cable('f:p', 'd:a', 'rojo')
          .cable('d:k', 'f:n', 'negro')
          .fin();
      }
    },
    {
      id: 'led_resistencia', nombre: 'LED con resistencia', emoji: '🔴', nivel: 1, cat: 'basico',
      objetivo: 'Armar en la protoboard el circuito correcto: fuente → resistencia → LED → GND.',
      componentes: ['Protoboard', 'Fuente 5 V', 'Resistencia 220 Ω', 'LED rojo', '4 cables'],
      diagrama: ['5 V', 'R 220 Ω', 'LED', 'GND'],
      explicacion: '<p>La resistencia de 220 Ω limita la corriente a unos 13 mA, el valor ideal para un LED.</p>' +
        '<p><b>Recorrido de la corriente:</b> sale del borne + de la fuente, entra al riel rojo, sube por el cable hasta la columna 5, atraviesa la resistencia hasta la columna 9, pasa por el LED (del ánodo al cátodo) y vuelve por el riel azul hasta el borne −.</p>' +
        '<div class="callout"><div>🧮</div><div><b>Cálculo:</b> R = (5 V − 2 V) / 0,02 A = 150 Ω. Como 150 Ω no es un valor comercial común, se usa 220 Ω.</div></div>' +
        '<p>Prueba a cambiar la resistencia por una de 1 kΩ en el panel derecho y observa cómo el LED pierde brillo.</p>',
      construir: function () {
        return nuevo()
          .proto('bb', 0, 0)
          .libre('f', 'fuente5v', -290, -40)
          .enHoyo('r', 'resistor', 'a', 'B5')
          .enHoyo('d', 'led', 'a', 'D9', { color: 'rojo' })
          .cable('f:p', 'bb:TP2', 'rojo')
          .cable('f:n', 'bb:TN2', 'negro')
          .cable('bb:TP4', 'bb:A5', 'rojo')
          .cable('bb:A10', 'bb:TN5', 'negro')
          .fin();
      }
    },
    {
      id: 'dos_leds', nombre: 'Dos LEDs en paralelo', emoji: '🔆', nivel: 2, cat: 'basico',
      objetivo: 'Alimentar dos LEDs a la vez, cada uno con su propia resistencia.',
      componentes: ['Protoboard', 'Fuente 5 V', '2 resistencias 220 Ω', 'LED rojo', 'LED verde'],
      diagrama: ['5 V', 'R 220 Ω|R 220 Ω', 'LED rojo|LED verde', 'GND'],
      explicacion: '<p>Los dos LEDs están <b>en paralelo</b>: cada uno recibe los 5 V completos y tiene su propio camino.</p>' +
        '<p>Cada rama necesita su resistencia. Si pusieras una sola resistencia para los dos, el brillo bajaría y los LEDs de distinto color se repartirían mal la corriente.</p>' +
        '<div class="callout ok"><div>💡</div><div>Fíjate en que el LED verde tiene una caída de tensión mayor (2,1 V) que el rojo (1,9 V): por eso su corriente es un poco menor.</div></div>',
      construir: function () {
        return nuevo()
          .proto('bb', 0, 0)
          .libre('f', 'fuente5v', -290, -40)
          .enHoyo('r1', 'resistor', 'a', 'B5')
          .enHoyo('d1', 'led', 'a', 'D9', { color: 'rojo' })
          .enHoyo('r2', 'resistor', 'a', 'B15')
          .enHoyo('d2', 'led', 'a', 'D19', { color: 'verde' })
          .cable('f:p', 'bb:TP2', 'rojo')
          .cable('f:n', 'bb:TN2', 'negro')
          .cable('bb:TP4', 'bb:A5', 'rojo')
          .cable('bb:TP13', 'bb:A15', 'rojo')
          .cable('bb:A10', 'bb:TN5', 'negro')
          .cable('bb:A20', 'bb:TN20', 'negro')
          .fin();
      }
    },
    {
      id: 'led_pulsador', nombre: 'LED con pulsador', emoji: '🔘', nivel: 2, cat: 'basico',
      objetivo: 'Encender el LED solo mientras se mantiene presionado el pulsador.',
      componentes: ['Protoboard', 'Batería 9 V', 'Pulsador', 'Resistencia 470 Ω', 'LED amarillo'],
      diagrama: ['Batería', 'Pulsador', 'R 470 Ω', 'LED', 'GND'],
      explicacion: '<p>El pulsador va <b>en serie</b>: mientras está suelto, el camino está cortado y no circula corriente.</p>' +
        '<p>Haz clic sobre el pulsador en el lienzo para presionarlo (mantén el clic).</p>' +
        '<div class="callout warn"><div>⚠️</div><div>El pulsador se coloca <b>atravesando el canal central</b>. Si lo pones en una sola mitad, sus patas quedan cortocircuitadas y el LED estará siempre encendido.</div></div>' +
        '<p>Usamos 470 Ω porque la batería es de 9 V: R = (9 − 2,1) / 0,015 ≈ 460 Ω.</p>',
      construir: function () {
        return nuevo()
          .proto('bb', 0, 0)
          .libre('bat', 'bateria', -300, -30, { volt: 9 })
          .enHoyo('sw', 'pulsador', 'a1', 'E7')
          .enHoyo('r', 'resistor', 'a', 'H13', { ohms: 470 })
          .enHoyo('d', 'led', 'a', 'F17', { color: 'amarillo' })
          .cable('bat:p', 'bb:TP2', 'rojo')
          .cable('bat:n', 'bb:BN2', 'negro')
          .cable('bb:TP5', 'bb:A7', 'rojo')
          .cable('bb:F10', 'bb:J13', 'amarillo')
          .cable('bb:G18', 'bb:BN19', 'negro')
          .fin();
      }
    },
    {
      id: 'semaforo', nombre: 'Semáforo manual', emoji: '🚦', nivel: 2, cat: 'basico',
      objetivo: 'Controlar tres LEDs con tres interruptores independientes.',
      componentes: ['Protoboard', 'Fuente 5 V', '3 LEDs', '3 resistencias', '3 interruptores'],
      diagrama: ['5 V', 'Interruptor', 'R 220 Ω', 'LED', 'GND'],
      explicacion: '<p>Tres circuitos iguales comparten la misma alimentación gracias a los rieles de la protoboard.</p>' +
        '<p>Haz clic en cada interruptor para encender el LED correspondiente. Intenta reproducir la secuencia de un semáforo real: verde → amarillo → rojo.</p>' +
        '<div class="callout"><div>🎯</div><div>Después de probarlo, mira el ejemplo <b>“Arduino + semáforo”</b>: allí la secuencia se hace sola gracias al programa.</div></div>',
      construir: function () {
        var b = nuevo().proto('bb', 0, 0).libre('f', 'fuente5v', -300, -40);
        // el interruptor ocupa 2 columnas (sus patas van separadas 24 px)
        var cols = [3, 11, 19];
        var rielNeg = [4, 13, 20];
        var colores = ['rojo', 'amarillo', 'verde'];
        b.cable('f:p', 'bb:TP1', 'rojo').cable('f:n', 'bb:TN1', 'negro');
        cols.forEach(function (c, i) {
          b.enHoyo('sw' + i, 'interruptor', 'a', 'B' + c);          // patas en las columnas c y c+2
          b.enHoyo('r' + i, 'resistor', 'a', 'D' + (c + 2));        // de c+2 a c+6
          b.enHoyo('d' + i, 'led', 'a', 'A' + (c + 6), { color: colores[i] });
          b.cable('bb:TP' + c, 'bb:C' + c, 'rojo');
          b.cable('bb:B' + (c + 7), 'bb:TN' + rielNeg[i], 'negro');
        });
        return b.fin();
      }
    },
    {
      id: 'pot_led', nombre: 'LED con potenciómetro', emoji: '🎛️', nivel: 3, cat: 'basico',
      objetivo: 'Variar el brillo del LED girando la perilla del potenciómetro.',
      componentes: ['Protoboard', 'Fuente 5 V', 'Potenciómetro 1 kΩ', 'Resistencia 220 Ω', 'LED azul'],
      diagrama: ['5 V', 'Potenciómetro', 'R 220 Ω', 'LED', 'GND'],
      explicacion: '<p>Aquí el potenciómetro trabaja como <b>resistencia variable</b> (reóstato): usamos solo un extremo y el cursor.</p>' +
        '<p>Al girar la perilla cambias la resistencia total del circuito y, con ella, la corriente que llega al LED. Arrastra la perilla en el lienzo o usa el control deslizante del panel derecho.</p>' +
        '<div class="callout warn"><div>⚠️</div><div>La resistencia de 220 Ω sigue siendo necesaria: si giras el potenciómetro a cero, sería ella la que salva al LED.</div></div>',
      construir: function () {
        return nuevo()
          .proto('bb', 0, 0)
          .libre('f', 'fuente5v', -300, -40)
          .enHoyo('p', 'pot', '1', 'F6', { ohms: 1000, pos: 0.5 })
          .enHoyo('r', 'resistor', 'a', 'I10')
          .enHoyo('d', 'led', 'a', 'F15', { color: 'azul' })
          .cable('f:p', 'bb:TP2', 'rojo')
          .cable('f:n', 'bb:BN2', 'negro')
          .cable('bb:TP4', 'bb:J8', 'rojo')
          .cable('bb:J7', 'bb:F10', 'amarillo')
          .cable('bb:H14', 'bb:I15', 'amarillo')
          .cable('bb:G16', 'bb:BN16', 'negro')
          .fin();
      }
    },
    {
      id: 'buzzer', nombre: 'Buzzer con pulsador', emoji: '🔊', nivel: 2, cat: 'basico',
      objetivo: 'Hacer sonar un zumbador al presionar el botón.',
      componentes: ['Protoboard', 'Fuente 5 V', 'Pulsador', 'Buzzer'],
      diagrama: ['5 V', 'Pulsador', 'Buzzer', 'GND'],
      explicacion: '<p>El buzzer convierte la electricidad en sonido. Mantén presionado el pulsador para escucharlo (activa el sonido de tu equipo).</p>' +
        '<p>Este es un buzzer <b>activo</b>: con solo darle tensión ya suena. Los pasivos necesitan una señal que cambie, como la que produce <code>tone()</code> en Arduino.</p>',
      construir: function () {
        return nuevo()
          .proto('bb', 0, 0)
          .libre('f', 'fuente5v', -300, -40)
          .enHoyo('sw', 'pulsador', 'a1', 'E8')
          .enHoyo('bz', 'buzzer', 'p', 'H14')
          .cable('f:p', 'bb:TP2', 'rojo')
          .cable('f:n', 'bb:BN2', 'negro')
          .cable('bb:TP5', 'bb:A8', 'rojo')
          .cable('bb:F11', 'bb:J14', 'amarillo')
          .cable('bb:G15', 'bb:BN15', 'negro')
          .fin();
      }
    },
    {
      id: 'motor_dc', nombre: 'Motor DC con interruptor', emoji: '⚙️', nivel: 3, cat: 'robotica',
      objetivo: 'Encender un motor y observar cómo cambia el giro al invertir la polaridad.',
      componentes: ['Batería 6 V', 'Interruptor', 'Motor DC'],
      diagrama: ['Batería 6 V', 'Interruptor', 'Motor'],
      explicacion: '<p>Un motor de corriente continua gira en un sentido u otro según cómo lo conectes. Prueba a intercambiar los dos cables de la batería.</p>' +
        '<p>Con 6 V el motor gira al 100 %. Cambia la batería a 3 V en el panel derecho y verás que gira más despacio.</p>' +
        '<div class="callout danger"><div>❌</div><div>Nunca conectes un motor directamente a un pin de Arduino: consume mucha más corriente de la que el pin puede entregar. Se usa un transistor o un driver como el L293D.</div></div>',
      construir: function () {
        return nuevo()
          .libre('bat', 'bateria', -220, 40, { volt: 6 })
          .libre('sw', 'interruptor', -40, -40, { cerrado: true })
          .libre('m', 'motor', 150, 20)
          .cable('bat:p', 'sw:a', 'rojo')
          .cable('sw:b', 'm:p', 'rojo')
          .cable('m:n', 'bat:n', 'negro')
          .fin();
      }
    },
    {
      id: 'servo_manual', nombre: 'Servo motor', emoji: '🦾', nivel: 3, cat: 'robotica',
      objetivo: 'Alimentar un servo y moverlo entre 0° y 180°.',
      componentes: ['Fuente 5 V', 'Servo motor'],
      diagrama: ['5 V', 'Servo', 'GND'],
      explicacion: '<p>El servo necesita tres conexiones: <b>5 V</b> (rojo), <b>GND</b> (negro) y <b>señal</b> (naranja).</p>' +
        '<p>En este ejemplo solo lo alimentamos: el ángulo se cambia a mano con el deslizador del panel derecho. En el ejemplo <b>“Arduino + servo”</b> será el programa quien lo mueva.</p>' +
        '<div class="callout"><div>🔧</div><div>Un servo real consume bastante corriente al moverse. Si lo alimentas desde el Arduino y este se reinicia, usa una fuente aparte y une los GND.</div></div>',
      construir: function () {
        return nuevo()
          .libre('f', 'fuente5v', -200, 0)
          .libre('s', 'servo', 120, -10, { angulo: 90 })
          .cable('f:p', 's:v', 'rojo')
          .cable('f:n', 's:g', 'negro')
          .fin();
      }
    },
    {
      id: 'ultrasonico', nombre: 'Sensor ultrasónico', emoji: '📡', nivel: 3, cat: 'sensores',
      objetivo: 'Alimentar el sensor HC-SR04 y ver cómo cambia la distancia medida.',
      componentes: ['Protoboard', 'Fuente 5 V', 'Sensor ultrasónico'],
      diagrama: ['5 V', 'HC-SR04', 'GND'],
      explicacion: '<p>El sensor mide distancias con ultrasonidos. Aquí solo está alimentado: mueve el deslizador de <b>Distancia</b> en el panel derecho para simular un objeto que se acerca.</p>' +
        '<p>Para que la medida sirva de algo hay que leerla con una placa: mira el ejemplo <b>“Arduino + sensor ultrasónico”</b>.</p>' +
        '<div class="callout"><div>📏</div><div>Distancia = tiempo de eco × 0,034 / 2. Se divide entre 2 porque el sonido va y vuelve.</div></div>',
      construir: function () {
        return nuevo()
          .proto('bb', 0, 0)
          .libre('f', 'fuente5v', -300, -40)
          .enHoyo('u', 'ultrasonico', 'v', 'F8', { distancia: 40 })
          .cable('f:p', 'bb:TP2', 'rojo')
          .cable('f:n', 'bb:BN2', 'negro')
          .cable('bb:TP5', 'bb:J8', 'rojo')
          .cable('bb:J11', 'bb:BN11', 'negro')
          .fin();
      }
    },
    {
      id: 'ldr', nombre: 'Sensor de luz (LDR)', emoji: '🔆', nivel: 3, cat: 'sensores',
      objetivo: 'Que el LED brille más cuanta más luz reciba el sensor.',
      componentes: ['Protoboard', 'Fuente 5 V', 'LDR', 'Resistencia 100 Ω', 'LED rojo'],
      diagrama: ['5 V', 'LDR', 'R 100 Ω', 'LED', 'GND'],
      explicacion: '<p>La fotorresistencia (LDR) cambia su valor con la luz: <b>mucha luz → poca resistencia</b>.</p>' +
        '<p>Como está en serie con el LED, al subir el deslizador de luz baja la resistencia total y el LED brilla más.</p>' +
        '<div class="callout"><div>🔬</div><div>A oscuras la LDR alcanza unos 200 kΩ: la corriente es tan pequeña que el LED ni se ve. Con luz plena baja a unos 500 Ω.</div></div>',
      construir: function () {
        return nuevo()
          .proto('bb', 0, 0)
          .libre('f', 'fuente5v', -300, -40)
          .enHoyo('l', 'ldr', 'a', 'F7', { luz: 80 })
          .enHoyo('r', 'resistor', 'a', 'I11', { ohms: 100 })
          .enHoyo('d', 'led', 'a', 'F16', { color: 'rojo' })
          .cable('f:p', 'bb:TP2', 'rojo')
          .cable('f:n', 'bb:BN2', 'negro')
          .cable('bb:TP5', 'bb:J7', 'rojo')
          .cable('bb:J8', 'bb:F11', 'amarillo')
          .cable('bb:H15', 'bb:I16', 'amarillo')
          .cable('bb:G17', 'bb:BN17', 'negro')
          .fin();
      }
    },
    {
      id: 'temperatura', nombre: 'Sensor de temperatura', emoji: '🌡️', nivel: 3, cat: 'sensores',
      objetivo: 'Medir la tensión que entrega un TMP36 y convertirla en grados.',
      componentes: ['Protoboard', 'Fuente 5 V', 'Sensor de temperatura'],
      diagrama: ['5 V', 'TMP36', 'Salida', 'GND'],
      explicacion: '<p>El TMP36 entrega <b>0,5 V a 0 °C</b> y sube 10 mV por cada grado.</p>' +
        '<p>Mueve el deslizador de temperatura y observa en el panel derecho cómo cambia la tensión del pin OUT. A 25 °C debe marcar 0,75 V.</p>' +
        '<div class="callout"><div>🧮</div><div>°C = (V − 0,5) × 100. Con Arduino: <code>float v = analogRead(A0)*5.0/1023.0;</code></div></div>',
      construir: function () {
        return nuevo()
          .proto('bb', 0, 0)
          .libre('f', 'fuente5v', -300, -40)
          .enHoyo('t', 'temp', 'v', 'F9', { temp: 25 })
          .cable('f:p', 'bb:TP2', 'rojo')
          .cable('f:n', 'bb:BN2', 'negro')
          .cable('bb:TP5', 'bb:J9', 'rojo')
          .cable('bb:J11', 'bb:BN11', 'negro')
          .fin();
      }
    },
    {
      id: 'ard_led', nombre: 'Arduino + LED', emoji: '🟩', nivel: 3, cat: 'arduino',
      objetivo: 'Programar el clásico “blink”: un LED que parpadea cada segundo.',
      componentes: ['Arduino Uno', 'Protoboard', 'Resistencia 220 Ω', 'LED rojo', '3 cables'],
      diagrama: ['Pin 13', 'R 220 Ω', 'LED', 'GND'],
      explicacion: '<p>El pin 13 se comporta como una fuente de 5 V que el programa enciende y apaga.</p>' +
        '<p>En <code>setup()</code> declaramos el pin como salida y en <code>loop()</code> lo encendemos, esperamos, lo apagamos y esperamos otra vez. Ese ciclo se repite para siempre.</p>' +
        '<div class="callout ok"><div>▶</div><div>Pulsa <b>Ejecutar</b> y observa el LED del circuito y también el pequeño LED “L” de la placa.</div></div>',
      construir: function () {
        return nuevo()
          .proto('bb', 0, 0)
          .libre('uno', 'arduino_uno', 0, 300)
          .enHoyo('r', 'resistor', 'a', 'B10')
          .enHoyo('d', 'led', 'a', 'D14', { color: 'rojo' })
          .cable('uno:D13', 'bb:A10', 'verde')
          .cable('bb:A15', 'bb:TN13', 'negro')
          .cable('uno:GND1', 'bb:TN2', 'negro')
          .codigo('int led = 13;\n\nvoid setup() {\n  pinMode(led, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(led, HIGH);\n  delay(1000);\n  digitalWrite(led, LOW);\n  delay(1000);\n}\n')
          .fin('arduino_uno');
      }
    },
    {
      id: 'ard_semaforo', nombre: 'Arduino + semáforo', emoji: '🚦', nivel: 4, cat: 'arduino',
      objetivo: 'Automatizar la secuencia del semáforo con un programa.',
      componentes: ['Arduino Uno', 'Protoboard', '3 LEDs', '3 resistencias 220 Ω'],
      diagrama: ['Pines 13,12,11', 'R 220 Ω', 'LEDs', 'GND'],
      explicacion: '<p>Cada LED se conecta a un pin distinto. El programa los enciende por turnos con <code>delay()</code> entre cada cambio.</p>' +
        '<p>Prueba a cambiar los tiempos: 3000 ms para el rojo, 3000 para el verde y 1000 para el amarillo.</p>' +
        '<div class="callout"><div>🎯</div><div><b>Reto:</b> añade un cuarto LED que parpadee como luz peatonal.</div></div>',
      construir: function () {
        var b = nuevo().proto('bb', 0, 0).libre('uno', 'arduino_uno', 0, 300);
        var pines = ['D13', 'D12', 'D11'];
        var colores = ['rojo', 'amarillo', 'verde'];
        [4, 12, 20].forEach(function (col, i) {
          b.enHoyo('r' + i, 'resistor', 'a', 'B' + col);
          b.enHoyo('d' + i, 'led', 'a', 'D' + (col + 4), { color: colores[i] });
          b.cable('uno:' + pines[i], 'bb:A' + col, i === 0 ? 'rojo' : (i === 1 ? 'amarillo' : 'verde'));
          b.cable('bb:A' + (col + 5), 'bb:TN' + (col + 5 > 30 ? 29 : col + 5), 'negro');
        });
        b.cable('uno:GND1', 'bb:TN2', 'negro');
        b.codigo('int rojo = 13;\nint amarillo = 12;\nint verde = 11;\n\nvoid setup() {\n  pinMode(rojo, OUTPUT);\n  pinMode(amarillo, OUTPUT);\n  pinMode(verde, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(rojo, HIGH);\n  delay(3000);\n  digitalWrite(rojo, LOW);\n\n  digitalWrite(verde, HIGH);\n  delay(3000);\n  digitalWrite(verde, LOW);\n\n  digitalWrite(amarillo, HIGH);\n  delay(1000);\n  digitalWrite(amarillo, LOW);\n}\n');
        return b.fin('arduino_uno');
      }
    },
    {
      id: 'ard_ultra', nombre: 'Arduino + sensor ultrasónico', emoji: '📡', nivel: 4, cat: 'arduino',
      objetivo: 'Encender un LED cuando algo se acerca a menos de 20 cm.',
      componentes: ['Arduino Uno', 'Protoboard', 'HC-SR04', 'LED', 'Resistencia 220 Ω'],
      diagrama: ['HC-SR04', 'Arduino', 'LED'],
      explicacion: '<p>El programa envía un pulso por <b>TRIG</b> y mide con <code>pulseIn()</code> cuánto tarda en volver el eco por <b>ECHO</b>.</p>' +
        '<p>Mientras corre la simulación, mueve el deslizador de <b>Distancia</b> del sensor: al bajar de 20 cm el LED se enciende y el Monitor Serie muestra la medida.</p>' +
        '<div class="callout"><div>🖥️</div><div>Abre la pestaña <b>Monitor Serie</b> de la consola para ver los números que envía el Arduino.</div></div>',
      construir: function () {
        return nuevo()
          .proto('bb', 0, 0)
          .libre('uno', 'arduino_uno', 0, 320)
          .enHoyo('u', 'ultrasonico', 'v', 'F4', { distancia: 45 })
          .enHoyo('r', 'resistor', 'a', 'B18')
          .enHoyo('d', 'led', 'a', 'D22', { color: 'rojo' })
          .cable('uno:5V', 'bb:BP2', 'rojo')
          .cable('uno:GND1', 'bb:BN2', 'negro')
          .cable('bb:J4', 'bb:BP4', 'rojo')
          .cable('bb:J5', 'uno:D9', 'amarillo')
          .cable('bb:J6', 'uno:D10', 'verde')
          .cable('bb:J7', 'bb:BN7', 'negro')
          .cable('uno:D13', 'bb:A18', 'azul')
          .cable('bb:A23', 'bb:BN23', 'negro')
          .codigo('int trig = 9;\nint echo = 10;\nint led = 13;\n\nvoid setup() {\n  pinMode(trig, OUTPUT);\n  pinMode(echo, INPUT);\n  pinMode(led, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  digitalWrite(trig, LOW);\n  delayMicroseconds(2);\n  digitalWrite(trig, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(trig, LOW);\n\n  long tiempo = pulseIn(echo, HIGH);\n  long cm = tiempo * 0.034 / 2;\n  Serial.print("Distancia: ");\n  Serial.println(cm);\n\n  if (cm < 20) {\n    digitalWrite(led, HIGH);\n  } else {\n    digitalWrite(led, LOW);\n  }\n  delay(300);\n}\n')
          .fin('arduino_uno');
      }
    },
    {
      id: 'ard_servo', nombre: 'Arduino + servo', emoji: '🦾', nivel: 4, cat: 'arduino',
      objetivo: 'Mover un servo de 0° a 180° con la librería Servo.',
      componentes: ['Arduino Uno', 'Servo motor', '3 cables'],
      diagrama: ['Arduino', 'Pin 9', 'Servo'],
      explicacion: '<p>La librería <code>Servo</code> se encarga de generar los pulsos. Solo hay que decirle el pin con <code>attach()</code> y el ángulo con <code>write()</code>.</p>' +
        '<p>El bucle <code>for</code> hace que el ángulo suba de 10 en 10 y luego baje. Observa el brazo del servo moviéndose en el lienzo.</p>' +
        '<div class="callout warn"><div>⚠️</div><div>El cable naranja (señal) va al pin 9; el rojo a 5 V y el marrón a GND. Si los inviertes, el servo no responde.</div></div>',
      construir: function () {
        return nuevo()
          .libre('uno', 'arduino_uno', -60, 160)
          .libre('s', 'servo', 200, -60, { angulo: 0 })
          .cable('uno:5V', 's:v', 'rojo')
          .cable('uno:GND2', 's:g', 'negro')
          .cable('uno:D9', 's:s', 'naranja')
          .codigo('#include <Servo.h>\n\nServo brazo;\n\nvoid setup() {\n  brazo.attach(9);\n}\n\nvoid loop() {\n  for (int a = 0; a <= 180; a = a + 10) {\n    brazo.write(a);\n    delay(120);\n  }\n  for (int a = 180; a >= 0; a = a - 10) {\n    brazo.write(a);\n    delay(120);\n  }\n}\n')
          .fin('arduino_uno');
      }
    },
    {
      id: 'mb_matriz', nombre: 'micro:bit + matriz LED', emoji: '🟨', nivel: 3, cat: 'microbit',
      objetivo: 'Mostrar un corazón que late en la pantalla de 25 LEDs.',
      componentes: ['micro:bit'],
      diagrama: ['Programa', 'Matriz 5×5'],
      explicacion: '<p>La micro:bit trae 25 LEDs organizados en 5 filas y 5 columnas. Con <code>basic.showIcon()</code> se dibujan figuras completas.</p>' +
        '<p><code>basic.forever()</code> repite el bloque para siempre, igual que <code>loop()</code> en Arduino.</p>' +
        '<div class="callout"><div>🎨</div><div>Prueba a cambiar <code>"corazon"</code> por <code>"feliz"</code>, <code>"fantasma"</code> o <code>"diamante"</code>.</div></div>',
      construir: function () {
        return nuevo()
          .libre('mb', 'microbit', 0, 0)
          .codigo('basic.forever(function () {\n  basic.showIcon("corazon");\n  basic.pause(400);\n  basic.showIcon("corazon_p");\n  basic.pause(400);\n});\n')
          .fin('microbit');
      }
    },
    {
      id: 'mb_boton', nombre: 'micro:bit + pulsador', emoji: '🅰️', nivel: 3, cat: 'microbit',
      objetivo: 'Reaccionar a los botones A y B y encender un LED externo.',
      componentes: ['micro:bit', 'Protoboard', 'LED verde', 'Resistencia 220 Ω'],
      diagrama: ['Botón A', 'Pin 0', 'LED'],
      explicacion: '<p><code>input.onButtonPressed()</code> registra qué hacer cuando se pulsa un botón. Haz clic sobre los botones A y B dibujados en la placa.</p>' +
        '<p>El botón A enciende el LED conectado al pin 0 y muestra una carita feliz; el botón B lo apaga.</p>' +
        '<div class="callout warn"><div>⚠️</div><div>La micro:bit trabaja a <b>3,3 V</b> y sus pines dan poca corriente: la resistencia de 220 Ω es imprescindible.</div></div>',
      construir: function () {
        return nuevo()
          .proto('bb', 0, 210)
          .libre('mb', 'microbit', -30, 0)
          .enHoyo('r', 'resistor', 'a', 'B8')
          .enHoyo('d', 'led', 'a', 'D12', { color: 'verde' })
          .cable('mb:P0', 'bb:A8', 'amarillo')
          .cable('bb:A13', 'bb:TN13', 'negro')
          .cable('mb:GND', 'bb:TN3', 'negro')
          .codigo('input.onButtonPressed("A", function () {\n  pins.digitalWritePin(0, 1);\n  basic.showIcon("feliz");\n});\n\ninput.onButtonPressed("B", function () {\n  pins.digitalWritePin(0, 0);\n  basic.clearScreen();\n});\n')
          .fin('microbit');
      }
    },
    {
      id: 'alarma', nombre: 'Sistema de alarma', emoji: '🚨', nivel: 5, cat: 'proyecto',
      objetivo: 'Detectar movimiento y avisar con luz y sonido.',
      componentes: ['Arduino Uno', 'Protoboard', 'Sensor PIR', 'Buzzer', 'LED rojo', 'Resistencia 220 Ω'],
      diagrama: ['Sensor PIR', 'Arduino', 'LED + Buzzer'],
      explicacion: '<p>El sensor PIR pone su salida en alto cuando detecta movimiento. El Arduino lo lee con <code>digitalRead()</code> y activa el LED y el buzzer.</p>' +
        '<p>Con la simulación corriendo, marca la casilla <b>¿Hay movimiento?</b> del sensor en el panel derecho.</p>' +
        '<div class="callout ok"><div>🏆</div><div>Este es el punto de partida del <b>proyecto final</b>. Añádele un pulsador para desactivar la alarma y un contador de eventos en el Monitor Serie.</div></div>',
      construir: function () {
        return nuevo()
          .proto('bb', 0, 0)
          .libre('uno', 'arduino_uno', 0, 320)
          .enHoyo('p', 'pir', 'v', 'F5', { detecta: false })
          .enHoyo('r', 'resistor', 'a', 'B14')
          .enHoyo('d', 'led', 'a', 'D18', { color: 'rojo' })
          .enHoyo('bz', 'buzzer', 'p', 'H23')
          .cable('uno:5V', 'bb:BP2', 'rojo')
          .cable('uno:GND1', 'bb:BN2', 'negro')
          .cable('bb:J5', 'bb:BP5', 'rojo')
          .cable('bb:J6', 'uno:D2', 'amarillo')
          .cable('bb:J7', 'bb:BN7', 'negro')
          .cable('uno:D13', 'bb:A14', 'azul')
          .cable('bb:A19', 'bb:BN19', 'negro')
          .cable('uno:D8', 'bb:J23', 'verde')
          .cable('bb:J24', 'bb:BN25', 'negro')
          .codigo('int pir = 2;\nint led = 13;\nint buzzer = 8;\nint eventos = 0;\n\nvoid setup() {\n  pinMode(pir, INPUT);\n  pinMode(led, OUTPUT);\n  pinMode(buzzer, OUTPUT);\n  Serial.begin(9600);\n  Serial.println("Alarma lista");\n}\n\nvoid loop() {\n  if (digitalRead(pir) == HIGH) {\n    eventos = eventos + 1;\n    Serial.print("ALERTA numero ");\n    Serial.println(eventos);\n    digitalWrite(led, HIGH);\n    tone(buzzer, 880);\n    delay(400);\n    noTone(buzzer);\n    delay(200);\n  } else {\n    digitalWrite(led, LOW);\n    noTone(buzzer);\n  }\n  delay(100);\n}\n')
          .fin('arduino_uno');
      }
    },
    {
      id: 'mini_robot', nombre: 'Mini robot que esquiva', emoji: '🤖', nivel: 5, cat: 'proyecto',
      objetivo: 'Unir sensor, servo, luz y sonido: el comportamiento básico de un robot.',
      componentes: ['Arduino Uno', 'Protoboard', 'HC-SR04', 'Servo', 'LED', 'Buzzer', 'Resistencia'],
      diagrama: ['Sensor', 'Decisión', 'Servo|LED|Buzzer'],
      explicacion: '<p>Este montaje reúne todo lo aprendido: el sensor mide la distancia, el programa decide y los actuadores responden.</p>' +
        '<ul><li><b>Camino libre</b> (más de 25 cm): el servo apunta al frente y el LED está apagado.</li>' +
        '<li><b>Obstáculo cerca</b>: el servo gira, el LED se enciende y el buzzer avisa.</li></ul>' +
        '<p>Con la simulación corriendo, mueve el deslizador de distancia del sensor y observa la reacción completa.</p>' +
        '<div class="callout"><div>🚀</div><div>Un robot real añadiría dos motores con un driver L293D para avanzar y girar.</div></div>',
      construir: function () {
        return nuevo()
          .proto('bb', 0, 0)
          .libre('uno', 'arduino_uno', -40, 330)
          .libre('s', 'servo', 300, 30, { angulo: 90 })
          .enHoyo('u', 'ultrasonico', 'v', 'F4', { distancia: 60 })
          .enHoyo('r', 'resistor', 'a', 'B16')
          .enHoyo('d', 'led', 'a', 'D20', { color: 'rojo' })
          .enHoyo('bz', 'buzzer', 'p', 'H25')
          .cable('uno:5V', 'bb:BP2', 'rojo')
          .cable('uno:GND1', 'bb:BN2', 'negro')
          .cable('bb:J4', 'bb:BP4', 'rojo')
          .cable('bb:J5', 'uno:D9', 'amarillo')
          .cable('bb:J6', 'uno:D10', 'verde')
          .cable('bb:J7', 'bb:BN7', 'negro')
          .cable('uno:D13', 'bb:A16', 'azul')
          .cable('bb:A21', 'bb:BN21', 'negro')
          .cable('uno:D8', 'bb:J25', 'blanco')
          .cable('bb:J26', 'bb:BN26', 'negro')
          .cable('bb:BP26', 's:v', 'rojo')
          .cable('bb:BN27', 's:g', 'negro')
          .cable('uno:D11', 's:s', 'naranja')
          .codigo('#include <Servo.h>\n\nServo direccion;\nint trig = 9;\nint echo = 10;\nint led = 13;\nint buzzer = 8;\n\nvoid setup() {\n  pinMode(trig, OUTPUT);\n  pinMode(echo, INPUT);\n  pinMode(led, OUTPUT);\n  pinMode(buzzer, OUTPUT);\n  direccion.attach(11);\n  Serial.begin(9600);\n}\n\nlong medir() {\n  digitalWrite(trig, LOW);\n  delayMicroseconds(2);\n  digitalWrite(trig, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(trig, LOW);\n  long t = pulseIn(echo, HIGH);\n  return t * 0.034 / 2;\n}\n\nvoid loop() {\n  long cm = medir();\n  Serial.println(cm);\n\n  if (cm < 25) {\n    digitalWrite(led, HIGH);\n    tone(buzzer, 660);\n    direccion.write(30);\n    delay(400);\n    direccion.write(150);\n    delay(400);\n    noTone(buzzer);\n  } else {\n    digitalWrite(led, LOW);\n    noTone(buzzer);\n    direccion.write(90);\n  }\n  delay(200);\n}\n')
          .fin('arduino_uno');
      }
    }
  ];

  E.porId = function (id) {
    for (var i = 0; i < E.lista.length; i++) if (E.lista[i].id === id) return E.lista[i];
    return null;
  };

  /* ============================================================
     CARGA EN EL LIENZO
     ============================================================ */
  E.cargarCircuito = function (idEjemplo, ejecutar) {
    var ej = typeof idEjemplo === 'string' ? E.porId(idEjemplo) : idEjemplo;
    if (!ej) return;
    var datos = ej.construir();
    var proj = CL.proyectoVacio(ej.nombre);
    proj.components = datos.components;
    proj.wires = datos.wires;
    proj.code = datos.code || '';
    proj.board = datos.board || 'arduino_uno';
    CL.app.cargarProyecto(proj);
    CL.ajustarVista();
    CL.dialogo.cerrarCajon();
    CL.toast('ok', 'Ejemplo cargado', ej.nombre + ' — pulsa ▶ Ejecutar para verlo funcionar.');
    CL.mensaje('info', 'Ejemplo: ' + ej.nombre, ej.objetivo,
      'Toca cualquier componente para ver su información en el panel derecho.');
    if (ejecutar) setTimeout(function () { CL.app.ejecutar(); }, 350);
  };

  /* ============================================================
     GALERÍA
     ============================================================ */
  var filtro = 'todos';

  E.abrir = function () {
    CL.dialogo.cajon('🧪 Circuitos de ejemplo', galeriaHTML(), { alAbrir: enlazarGaleria });
  };

  function galeriaHTML() {
    var cats = [['todos', 'Todos'], ['basico', 'Electrónica básica'], ['sensores', 'Sensores'],
                ['robotica', 'Robótica'], ['arduino', 'Arduino'], ['microbit', 'micro:bit'], ['proyecto', 'Proyectos']];
    var h = '<p style="font-size:12.5px;color:var(--text-dim);line-height:1.6;margin-bottom:12px">' +
      'Cada ejemplo se carga ya construido y funcionando. Ábrelo, ejecútalo, cámbialo y observa qué ocurre.</p>';
    h += '<div class="gal-filters">' + cats.map(function (c) {
      return '<button data-f="' + c[0] + '"' + (filtro === c[0] ? ' class="active"' : '') + '>' + c[1] + '</button>';
    }).join('') + '</div><div class="gal">';
    E.lista.filter(function (e) { return filtro === 'todos' || e.cat === filtro; }).forEach(function (e) {
      h += '<button class="gcard" data-id="' + e.id + '">' +
        '<div class="gc-thumb">' + e.emoji + '</div>' +
        '<div class="gc-body"><b>' + CL.esc(e.nombre) + '</b><small>' + CL.esc(e.objetivo) + '</small>' +
        '<div class="gc-foot"><span class="lvl-badge b' + e.nivel + '">' + '⭐'.repeat(e.nivel) + '</span></div></div></button>';
    });
    return h + '</div>';
  }

  function enlazarGaleria(cont) {
    CL.$$('.gal-filters button', cont).forEach(function (b) {
      b.addEventListener('click', function () { filtro = b.dataset.f; E.abrir(); });
    });
    CL.$$('.gcard', cont).forEach(function (b) {
      b.addEventListener('click', function () { E.abrirId(b.dataset.id); });
    });
  }

  E.abrirId = function (id) {
    var e = E.porId(id);
    if (!e) return;
    var h = '<div class="detail">';
    h += '<h3>' + e.emoji + ' ' + CL.esc(e.nombre) + ' <span class="stars">' + '⭐'.repeat(e.nivel) + '</span></h3>';
    h += '<p class="obj"><b>Objetivo:</b> ' + CL.esc(e.objetivo) + '</p>';
    h += '<h4 style="font-size:12px;color:var(--acc);margin-bottom:6px">Componentes necesarios</h4>';
    h += '<div class="comp-list">' + e.componentes.map(function (c) { return '<span>' + CL.esc(c) + '</span>'; }).join('') + '</div>';
    if (e.diagrama) h += '<div class="diagram">' + E.diagrama(e.diagrama) + '</div>';
    h += '<div class="actions">' +
      '<button class="btn primary" data-a="run">▶ Ejecutar</button>' +
      '<button class="btn" data-a="ver">👁 Cargar sin ejecutar</button>' +
      '<button class="btn violet" data-a="construir">🔨 Intentar construirlo</button>' +
      '</div>';
    h += '<div class="expl">' + e.explicacion + '</div>';
    var datos = e.construir();
    if (datos.code) h += '<h4 style="font-size:12px;color:var(--acc);margin:14px 0 4px">Programa</h4><div class="code-sample">' + CL.esc(datos.code) + '</div>';
    h += '<div class="lesson-nav"><button class="btn ghost" data-a="volver">← Volver a la galería</button></div></div>';

    CL.dialogo.cajon(e.nombre, h, {
      alAbrir: function (cont) {
        CL.$$('[data-a]', cont).forEach(function (b) {
          b.addEventListener('click', function () {
            var a = b.dataset.a;
            if (a === 'run') E.cargarCircuito(e, true);
            if (a === 'ver') E.cargarCircuito(e, false);
            if (a === 'construir') construirTu(e);
            if (a === 'volver') E.abrir();
          });
        });
      }
    });
  };

  function construirTu(e) {
    CL.dialogo.confirmar('Intentar construirlo',
      'Se vaciará el área de trabajo para que lo armes tú. Tendrás el objetivo y las pistas del asistente. ¿Continuamos?',
      function () {
        CL.app.nuevoProyecto('Reto: ' + e.nombre, true);
        CL.dialogo.cerrarCajon();
        CL.asistente.contexto({
          titulo: e.nombre,
          enunciado: e.objetivo + ' Componentes sugeridos: ' + e.componentes.join(', ') + '.',
          pistas: [
            'Empieza colocando la protoboard y la fuente de alimentación. Lleva el + al riel rojo y el − al riel azul.',
            'Recuerda que las columnas de la zona central unen 5 agujeros entre sí. Coloca cada componente en columnas distintas.',
            'Sigue el recorrido de la corriente: debe salir del +, atravesar todos los componentes y regresar al −.',
            'Si el LED no enciende, comprueba la polaridad: la pata larga (ánodo) va hacia el positivo.'
          ],
          ejemplo: e.id,
          circuito: e.id,
          solucion: 'La conexión correcta es: ' + (e.diagrama || []).join(' → ') + '.'
        });
        CL.emit('panel:derecha', 'asis');
        CL.mensaje('info', 'Reto: ' + e.nombre, e.objetivo, 'Pide una pista al asistente cuando la necesites.');
      }, 'Vaciar y empezar');
  }

}(window.CL));
