/* ============================================================
   CircuitLab — editor de código (texto) del panel lateral
   ============================================================ */
(function (CL) {
  'use strict';

  var CE = {};
  CL.codigo = CE;

  var area, gutter, panel, capaHL;

  /* ------------------------------------------------------------
     Resaltado de sintaxis (paleta de Tinkercad / Arduino)
     Se reparten las palabras en tres grupos, como hace el IDE de Arduino:
     tipos y estructura, funciones de la libreria y constantes. Se incluyen
     tambien las palabras de la micro:bit para que el modo de bloques y los
     ejemplos de MakeCode salgan con color.
     ------------------------------------------------------------ */
  function setDe(txt) {
    // sin prototipo: si no, identificadores como "constructor" o "toString"
    // saldrian coloreados por heredarlos de Object.prototype
    var m = Object.create(null);
    txt.split(' ').forEach(function (w) { if (w) m[w] = 1; });
    return m;
  }
  var TIPOS = setDe(
    'void int long short float double char boolean bool byte word String const static volatile unsigned signed struct enum sizeof if else for while do switch case default break continue return goto new delete let var function class this typeof instanceof null undefined public private export import');
  var FUNCS = setDe(
    'setup loop pinMode digitalWrite digitalRead analogWrite analogRead delay delayMicroseconds millis micros map constrain min max abs pow sqrt sin cos tan random randomSeed tone noTone pulseIn shiftOut attachInterrupt detachInterrupt Serial begin print println write read available parseInt parseFloat flush Servo attach detach Wire SPI EEPROM basic input led music pins control game images forever pause showNumber showString showIcon clearScreen plot unplot point toggle isPressed onButtonPressed servoWritePin digitalWritePin digitalReadPin analogWritePin analogReadPin analogSetPeriod playTone rest temperature lightLevel compassHeading runningTime acceleration');
  var CONSTS = setDe(
    'HIGH LOW INPUT OUTPUT INPUT_PULLUP LED_BUILTIN PI TWO_PI HALF_PI DEG_TO_RAD RAD_TO_DEG true false A0 A1 A2 A3 A4 A5 A6 A7 DEC HEX OCT BIN Button Note IconNames AnalogPin DigitalPin');

  /* Un solo barrido: comentarios, cadenas, preprocesador, numeros e
     identificadores. Lo que no cae en ningun grupo se deja en el color base. */
  var TOKEN = /(\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)|(#[A-Za-z_]\w*[^\n]*)|(\b0[xX][0-9a-fA-F]+\b|\b\d+(?:\.\d+)?[fFuUlL]?\b)|([A-Za-z_]\w*)/g;

  /** Devuelve el codigo como HTML con los <span> del color que toca. */
  CE.resaltar = function (txt) {
    var out = '', ult = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(txt)) !== null) {
      out += CL.esc(txt.slice(ult, m.index));
      ult = m.index + m[0].length;
      var cls = '';
      if (m[1]) cls = 'tk-com';
      else if (m[2]) cls = 'tk-str';
      else if (m[3]) cls = 'tk-pre';
      else if (m[4]) cls = 'tk-num';
      else if (m[5]) {
        cls = TIPOS[m[5]] ? 'tk-key' : (FUNCS[m[5]] ? 'tk-fun' : (CONSTS[m[5]] ? 'tk-const' : ''));
      }
      out += cls ? '<span class="' + cls + '">' + CL.esc(m[0]) + '</span>' : CL.esc(m[0]);
    }
    out += CL.esc(txt.slice(ult));
    return out;
  };

  CE.PLANTILLAS = {
    arduino: [
      { n: 'LED que parpadea', d: 'Enciende y apaga el LED del pin 13 cada segundo.',
        c: 'int led = 13;\n\nvoid setup() {\n  pinMode(led, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(led, HIGH);\n  delay(1000);\n  digitalWrite(led, LOW);\n  delay(1000);\n}\n' },
      { n: 'LED con pulsador', d: 'El LED del pin 9 se enciende mientras se pulsa el botón del pin 2.',
        c: 'int boton = 2;\nint led = 9;\n\nvoid setup() {\n  pinMode(boton, INPUT);\n  pinMode(led, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(boton) == HIGH) {\n    digitalWrite(led, HIGH);\n  } else {\n    digitalWrite(led, LOW);\n  }\n}\n' },
      { n: 'Semáforo', d: 'Tres LEDs en secuencia: rojo, amarillo y verde.',
        c: 'int rojo = 13;\nint amarillo = 12;\nint verde = 11;\n\nvoid setup() {\n  pinMode(rojo, OUTPUT);\n  pinMode(amarillo, OUTPUT);\n  pinMode(verde, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(rojo, HIGH);\n  delay(3000);\n  digitalWrite(rojo, LOW);\n\n  digitalWrite(verde, HIGH);\n  delay(3000);\n  digitalWrite(verde, LOW);\n\n  digitalWrite(amarillo, HIGH);\n  delay(1000);\n  digitalWrite(amarillo, LOW);\n}\n' },
      { n: 'Brillo con potenciómetro', d: 'El potenciómetro en A0 controla el brillo del LED del pin 9 (PWM).',
        c: 'int pot = A0;\nint led = 9;\nint lectura = 0;\n\nvoid setup() {\n  pinMode(led, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  lectura = analogRead(pot);\n  int brillo = map(lectura, 0, 1023, 0, 255);\n  analogWrite(led, brillo);\n  Serial.println(brillo);\n  delay(50);\n}\n' },
      { n: 'Sensor ultrasónico', d: 'Mide la distancia y enciende el LED si algo se acerca.',
        c: 'int trig = 9;\nint echo = 10;\nint led = 13;\n\nvoid setup() {\n  pinMode(trig, OUTPUT);\n  pinMode(echo, INPUT);\n  pinMode(led, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  digitalWrite(trig, LOW);\n  delayMicroseconds(2);\n  digitalWrite(trig, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(trig, LOW);\n\n  long tiempo = pulseIn(echo, HIGH);\n  long cm = tiempo * 0.034 / 2;\n  Serial.println(cm);\n\n  if (cm < 20) {\n    digitalWrite(led, HIGH);\n  } else {\n    digitalWrite(led, LOW);\n  }\n  delay(200);\n}\n' },
      { n: 'Servo de 0° a 180°', d: 'Mueve el servo del pin 9 de lado a lado.',
        c: '#include <Servo.h>\n\nServo mi;\n\nvoid setup() {\n  mi.attach(9);\n}\n\nvoid loop() {\n  for (int a = 0; a <= 180; a = a + 10) {\n    mi.write(a);\n    delay(100);\n  }\n  for (int a = 180; a >= 0; a = a - 10) {\n    mi.write(a);\n    delay(100);\n  }\n}\n' },
      { n: 'Alarma con buzzer', d: 'Si el sensor de movimiento detecta algo, suena el buzzer.',
        c: 'int pir = 2;\nint buzzer = 8;\nint led = 13;\n\nvoid setup() {\n  pinMode(pir, INPUT);\n  pinMode(buzzer, OUTPUT);\n  pinMode(led, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(pir) == HIGH) {\n    digitalWrite(led, HIGH);\n    tone(buzzer, 880);\n    delay(500);\n    noTone(buzzer);\n    delay(200);\n  } else {\n    digitalWrite(led, LOW);\n    noTone(buzzer);\n  }\n}\n' },
      { n: 'Luz automática (LDR)', d: 'Enciende el LED cuando hay poca luz.',
        c: 'int ldr = A0;\nint led = 13;\n\nvoid setup() {\n  pinMode(led, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int luz = analogRead(ldr);\n  Serial.println(luz);\n  if (luz < 400) {\n    digitalWrite(led, HIGH);\n  } else {\n    digitalWrite(led, LOW);\n  }\n  delay(100);\n}\n' }
    ],
    microbit: [
      { n: 'Corazón que late', d: 'Muestra un corazón grande y otro pequeño sin parar.',
        c: 'basic.forever(function () {\n  basic.showIcon("corazon");\n  basic.pause(400);\n  basic.showIcon("corazon_p");\n  basic.pause(400);\n});\n' },
      { n: 'Botones A y B', d: 'A muestra un número, B borra la pantalla.',
        c: 'input.onButtonPressed("A", function () {\n  basic.showNumber(7);\n});\n\ninput.onButtonPressed("B", function () {\n  basic.clearScreen();\n});\n' },
      { n: 'Dado', d: 'Al agitar, muestra un número del 1 al 6.',
        c: 'basic.forever(function () {\n  if (input.isGesture("agitar")) {\n    basic.showNumber(random(1, 7));\n    basic.pause(600);\n  }\n});\n' },
      { n: 'LED externo en el pin 0', d: 'Enciende y apaga un LED conectado al pin 0.',
        c: 'basic.forever(function () {\n  pins.digitalWritePin(0, 1);\n  basic.pause(500);\n  pins.digitalWritePin(0, 0);\n  basic.pause(500);\n});\n' },
      { n: 'Servo con el pin 1', d: 'Mueve un servo entre 0° y 180°.',
        c: 'basic.forever(function () {\n  pins.servoWritePin(1, 0);\n  basic.pause(800);\n  pins.servoWritePin(1, 180);\n  basic.pause(800);\n});\n' },
      { n: 'Termómetro', d: 'Muestra la temperatura al pulsar A.',
        c: 'input.onButtonPressed("A", function () {\n  basic.showNumber(input.temperature());\n});\n' },
      { n: 'Dibujar en la pantalla', d: 'Enciende LEDs sueltos con led.plot.',
        c: 'basic.forever(function () {\n  for (let i = 0; i <= 4; i++) {\n    led.plot(i, i);\n    basic.pause(200);\n  }\n  basic.clearScreen();\n});\n' }
    ]
  };

  CE.init = function () {
    panel = document.getElementById('codePanel');
    area = document.getElementById('codeArea');
    gutter = document.getElementById('codeGutter');
    capaHL = document.getElementById('codeHL');

    area.addEventListener('input', function () {
      CL.state.setCodigo(area.value, true);
      CL.state.marcarSucio();
      numerar();
    });
    area.addEventListener('scroll', sincronizarScroll);
    area.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        insertar('  ');
      } else if (e.key === 'Enter') {
        var pos = area.selectionStart;
        var linea = area.value.slice(0, pos).split('\n').pop();
        var sangria = (linea.match(/^[ \t]*/) || [''])[0];
        if (/\{\s*$/.test(linea)) sangria += '  ';
        e.preventDefault();
        insertar('\n' + sangria);
      } else if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        CL.proyectos.guardar();
      }
    });

    CL.$$('.cp-mode').forEach(function (b) {
      b.addEventListener('click', function () {
        CL.$$('.cp-mode').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        var m = b.dataset.cmode;
        CL.$$('.cp-view').forEach(function (v) { v.classList.remove('active'); });
        document.getElementById(m === 'texto' ? 'cvTexto' : (m === 'bloques' ? 'cvBloques' : 'cvEjemplos')).classList.add('active');
        if (m === 'ejemplos') CE.pintarPlantillas();
        if (m === 'bloques') CL.bloques.pintar();
      });
    });

    document.getElementById('btnCodeClose').addEventListener('click', function () { CE.cerrar(); });
    document.getElementById('btnCodeCheck').addEventListener('click', function () { CE.verificar(true); });
    numerar();
  };

  function insertar(txt) {
    var s = area.selectionStart, e = area.selectionEnd;
    area.value = area.value.slice(0, s) + txt + area.value.slice(e);
    area.selectionStart = area.selectionEnd = s + txt.length;
    CL.state.setCodigo(area.value, true);
    numerar();
  }

  /** El <pre> de color no tiene barras propias: se mueve con el textarea. */
  function sincronizarScroll() {
    if (!capaHL) return;
    capaHL.scrollTop = area.scrollTop;
    capaHL.scrollLeft = area.scrollLeft;
    gutter.scrollTop = area.scrollTop;
  }

  function numerar() {
    var n = (area.value.match(/\n/g) || []).length + 1;
    var out = '';
    for (var i = 1; i <= n; i++) out += i + '\n';
    gutter.textContent = out;
    // el salto final hace que la ultima linea no quede pegada al borde
    if (capaHL) capaHL.innerHTML = CE.resaltar(area.value + '\n');
    sincronizarScroll();
  }

  CE.abrir = function () {
    panel.hidden = false;
    CE.sincronizar();
    var placa = CL.runtime.placaActiva();
    var nom = placa ? CL.catalogo[placa.type].nombre : 'Sin placa';
    document.getElementById('cpBoard').textContent = nom;
    document.getElementById('cpSub').textContent = placa
      ? (CL.catalogo[placa.type].familia === 'microbit' ? 'Lenguaje de la micro:bit' : 'Lenguaje Arduino (C++ simplificado)')
      : 'Coloca una placa Arduino o micro:bit para poder ejecutar el programa';
    CL.bloques.pintar();
    area.focus();
  };
  CE.cerrar = function () { panel.hidden = true; };
  CE.alternar = function () { if (panel.hidden) CE.abrir(); else CE.cerrar(); };
  CE.abierto = function () { return panel && !panel.hidden; };

  CE.sincronizar = function () {
    if (!area) return;
    if (area.value !== (CL.state.proj.code || '')) area.value = CL.state.proj.code || '';
    numerar();
  };

  CE.poner = function (txt) {
    CL.state.setCodigo(txt);
    CE.sincronizar();
  };

  CE.familia = function () {
    var placa = CL.runtime.placaActiva();
    return placa && CL.catalogo[placa.type].familia === 'microbit' ? 'microbit' : 'arduino';
  };

  CE.pintarPlantillas = function () {
    var cont = document.getElementById('codeTemplates');
    var lista = CE.PLANTILLAS[CE.familia()];
    cont.innerHTML = lista.map(function (t, i) {
      return '<button class="tpl" data-i="' + i + '"><b>' + CL.esc(t.n) + '</b><small>' + CL.esc(t.d) + '</small></button>';
    }).join('');
    CL.$$('.tpl', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        CE.poner(lista[+b.dataset.i].c);
        CL.$$('.cp-mode')[0].click();
        CL.toast('ok', 'Plantilla cargada', 'Pulsa “Cargar y ejecutar” para verla funcionar.');
      });
    });
  };

  /** Compila sin ejecutar. Devuelve true si no hay errores de sintaxis. */
  CE.verificar = function (avisarSiOk) {
    var r = CL.Interprete.compilar(CL.state.proj.code || '', { nativas: {}, objetos: {}, constantes: {} });
    if (!r.ok) {
      CL.mensaje('err', 'Error de sintaxis en la línea ' + r.linea, r.error,
        'Revisa esa línea: casi siempre falta un punto y coma (;), un paréntesis o una llave.');
      CL.toast('err', 'Hay un error en la línea ' + r.linea, r.error);
      marcarLinea(r.linea);
      return false;
    }
    if (avisarSiOk) {
      CL.toast('ok', 'El programa no tiene errores de sintaxis', 'Ya puedes cargarlo en la placa.');
      CL.mensaje('ok', 'Programa verificado', 'La sintaxis es correcta.', '');
    }
    return true;
  };

  function marcarLinea(l) {
    if (!l || !area) return;
    var lineas = area.value.split('\n');
    var pos = 0;
    for (var i = 0; i < l - 1 && i < lineas.length; i++) pos += lineas[i].length + 1;
    if (panel.hidden) CE.abrir();
    area.focus();
    area.setSelectionRange(pos, pos + (lineas[l - 1] || '').length);
    var alto = area.scrollHeight / Math.max(1, lineas.length);
    area.scrollTop = Math.max(0, (l - 4) * alto);
  }
  CE.marcarLinea = marcarLinea;

  CL.on('proyecto:cargado', function () { CE.sincronizar(); });
  CL.on('sim:error', function (e) { if (e.linea) marcarLinea(e.linea); });

}(window.CL));
