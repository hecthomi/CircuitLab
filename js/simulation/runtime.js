/* ============================================================
   CircuitLab — reloj de simulación y funciones de las placas
   Une el intérprete con el circuito: lo que hace el programa
   cambia de verdad las tensiones, y lo que ocurre en el circuito
   se puede leer desde el programa.
   ============================================================ */
(function (CL) {
  'use strict';

  var R = {
    corriendo: false,
    tiempo: 0,               // ms simulados
    tareas: [],
    interp: null,
    placa: null,             // componente placa activo
    familia: 'arduino',
    serial: [],
    errores: [],
    tonos: {},               // {pinId: frecuencia}
    servos: {},              // {nombreObjeto: {pin, angulo}}
    eventos: {},             // {'boton:A': fnValor}
    _raf: null,
    _ultimo: 0,
    fps: 0
  };
  CL.runtime = R;

  var ctx = CL.circuito.ctx;

  function num(v) { return CL.Interprete.num(v); }

  /* ------------------------------------------------------------
     Utilidades de pines
     ------------------------------------------------------------ */
  function pinD(x) {
    if (typeof x === 'string') return x.charAt(0) === 'A' || x.charAt(0) === 'P' ? x : 'D' + parseInt(x, 10);
    return 'D' + Math.trunc(num(x));
  }
  function pinA(x) {
    if (typeof x === 'string' && x.charAt(0) === 'A') return x;
    return 'A' + Math.trunc(num(x));
  }
  function estadoPin(pin) {
    if (!R.placa) return null;
    var e = ctx.pines[R.placa.id] || (ctx.pines[R.placa.id] = {});
    return e[pin] || (e[pin] = { modo: 'INPUT', valor: 0 });
  }
  function ponerPin(pin, modo, valor) {
    var e = estadoPin(pin);
    if (!e) return;
    if (modo) e.modo = modo;
    if (valor !== undefined) e.valor = valor;
    CL.circuito.marcarSucio();
  }
  function leerTension(pin) {
    if (!R.placa) return 0;
    // si el circuito cambió (por ejemplo, un pinMode reciente) se recalcula
    // antes de leer, para que el programa vea el estado real y no el anterior
    if (CL.circuito._dirty) {
      try { CL.circuito.resolver(0); } catch (e) { /* se reintenta en el siguiente cuadro */ }
    }
    return CL.circuito.tension(R.placa.id, pin);
  }
  function vRef() { return R.familia === 'microbit' ? 3.3 : 5; }

  /* ------------------------------------------------------------
     Funciones nativas — Arduino
     ------------------------------------------------------------ */
  function nativasArduino() {
    return {
      pinMode: function (p, m) {
        var modo = num(m) === 1 ? 'OUTPUT' : (num(m) === 2 ? 'INPUT_PULLUP' : 'INPUT');
        ponerPin(pinD(p), modo, 0);
      },
      digitalWrite: function (p, v) {
        var pin = pinD(p), e = estadoPin(pin);
        if (e && e.modo !== 'OUTPUT') e.modo = 'OUTPUT';
        ponerPin(pin, 'OUTPUT', verdadPin(v) ? 1 : 0);
        if (R.tonos[pin] !== undefined && !verdadPin(v)) delete R.tonos[pin];
      },
      digitalRead: function (p) {
        var pin = pinD(p);
        var e = estadoPin(pin);
        if (e && e.modo === 'OUTPUT') return e.valor > 0.5 ? 1 : 0;
        return leerTension(pin) > vRef() * 0.5 ? 1 : 0;
      },
      analogRead: function (p) {
        var pin = pinA(p);
        var v = leerTension(pin);
        return Math.round(CL.clamp(v / vRef(), 0, 1) * 1023);
      },
      analogWrite: function (p, v) {
        var d = CL.clamp(num(v), 0, 255) / 255;
        ponerPin(pinD(p), 'OUTPUT', d);
      },
      delay: function (ms) { return { espera: Math.max(0, num(ms)) }; },
      delayMicroseconds: function (us) { return { espera: Math.max(0, num(us) / 1000) }; },
      millis: function () { return Math.round(R.tiempo); },
      micros: function () { return Math.round(R.tiempo * 1000); },
      map: function (x, a, b, c, d) {
        a = num(a); b = num(b); c = num(c); d = num(d);
        if (b === a) return c;
        return Math.trunc((num(x) - a) * (d - c) / (b - a) + c);
      },
      constrain: function (x, a, b) { return CL.clamp(num(x), num(a), num(b)); },
      min: function (a, b) { return Math.min(num(a), num(b)); },
      max: function (a, b) { return Math.max(num(a), num(b)); },
      abs: function (a) { return Math.abs(num(a)); },
      sqrt: function (a) { return Math.sqrt(num(a)); },
      pow: function (a, b) { return Math.pow(num(a), num(b)); },
      round: function (a) { return Math.round(num(a)); },
      floor: function (a) { return Math.floor(num(a)); },
      ceil: function (a) { return Math.ceil(num(a)); },
      sin: function (a) { return Math.sin(num(a)); },
      cos: function (a) { return Math.cos(num(a)); },
      random: function (a, b) {
        if (b === undefined) return Math.floor(Math.random() * num(a));
        return Math.floor(num(a) + Math.random() * (num(b) - num(a)));
      },
      randomSeed: function () { return 0; },
      tone: function (p, f, dur) {
        var pin = pinD(p);
        R.tonos[pin] = num(f) || 440;
        ponerPin(pin, 'OUTPUT', 0.5);
        if (dur !== undefined) {
          var t = num(dur);
          setTimeout(function () { delete R.tonos[pin]; ponerPin(pin, 'OUTPUT', 0); }, t);
        }
      },
      noTone: function (p) {
        var pin = pinD(p);
        delete R.tonos[pin];
        ponerPin(pin, 'OUTPUT', 0);
      },
      pulseIn: function (p) {
        // Devuelve el tiempo de eco del sensor ultrasónico conectado a ese pin
        var pin = pinD(p), dist = null;
        var netEcho = R.placa ? CL.circuito.netDePin(R.placa.id, pin) : -1;
        CL.state.compsPorTipo('ultrasonico').forEach(function (c) {
          if (CL.circuito.netDePin(c.id, 'e') === netEcho && netEcho >= 0) dist = c.props.distancia;
        });
        if (dist === null) {
          var us = CL.state.compsPorTipo('ultrasonico');
          if (us.length) dist = us[0].props.distancia;
        }
        if (dist === null) return 0;
        return { espera: 0.5, valor: Math.round(dist * 58) };     // µs de ida y vuelta
      },
      'Serial.begin': function () { R.serial.push('[Monitor Serie iniciado]'); volcarSerial(); },
      'Serial.print': function (v) { escribirSerial(textoDe(v), false); },
      'Serial.println': function (v) { escribirSerial(v === undefined ? '' : textoDe(v), true); },
      'Serial.write': function (v) { escribirSerial(String.fromCharCode(num(v)), false); },
      'Serial.available': function () { return 0; },
      'Serial.read': function () { return -1; }
    };
  }
  function verdadPin(v) {
    if (typeof v === 'string') return v === 'HIGH' || v === '1';
    return num(v) >= 1;
  }
  function textoDe(v) {
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
    return String(v === undefined ? '' : v);
  }

  var bufSerial = '';
  function escribirSerial(txt, salto) {
    bufSerial += txt + (salto ? '\n' : '');
    if (bufSerial.length > 8000) bufSerial = bufSerial.slice(-6000);
    volcarSerial();
  }
  function volcarSerial() {
    var out = document.getElementById('serialOut');
    if (out) { out.textContent = bufSerial; out.parentNode.scrollTop = out.parentNode.scrollHeight; }
  }
  R.limpiarSerial = function () { bufSerial = ''; volcarSerial(); };

  /* ---- objeto Servo del programa ---- */
  function crearServo() {
    var obj = {
      _pin: null,
      attach: function (p) { obj._pin = pinD(p); ponerPin(obj._pin, 'OUTPUT', 0); return 1; },
      detach: function () { obj._pin = null; },
      write: function (a) {
        var ang = CL.clamp(num(a), 0, 180);
        obj._ang = ang;
        aplicarServo(obj._pin, ang);
        return { espera: 2, valor: undefined };
      },
      writeMicroseconds: function (us) {
        var ang = CL.clamp(CL.map(num(us), 1000, 2000, 0, 180), 0, 180);
        obj._ang = ang;
        aplicarServo(obj._pin, ang);
      },
      read: function () { return obj._ang || 0; }
    };
    return obj;
  }
  /** Traslada el ángulo al servo conectado a ese pin de la placa. */
  function aplicarServo(pin, ang) {
    if (!R.placa || !pin) return;
    var net = CL.circuito.netDePin(R.placa.id, pin);
    var encontrado = false;
    CL.state.compsPorTipo('servo').forEach(function (c) {
      if (net >= 0 && CL.circuito.netDePin(c.id, 's') === net) {
        ctx.servoAngulo[c.id] = ang;
        encontrado = true;
      }
    });
    if (!encontrado) {
      // si solo hay un servo, se asume que es ese (facilita las prácticas)
      var lista = CL.state.compsPorTipo('servo');
      if (lista.length === 1) ctx.servoAngulo[lista[0].id] = ang;
    }
    ponerPin(pin, 'OUTPUT', CL.map(ang, 0, 180, 0.05, 0.1));
  }

  /* ------------------------------------------------------------
     Funciones nativas — micro:bit
     ------------------------------------------------------------ */
  function mbEstado() {
    if (!R.placa) return null;
    return ctx.microbit[R.placa.id] || (ctx.microbit[R.placa.id] = { matriz: CL.matrizVacia(), botonA: false, botonB: false });
  }
  function pintarPatron(filas, brillo) {
    var m = mbEstado();
    if (!m) return;
    for (var y = 0; y < 5; y++) {
      for (var x = 0; x < 5; x++) {
        var f = filas[y] || '00000';
        m.matriz[y][x] = f.charAt(x) === '1' ? (brillo === undefined ? 1 : brillo) : 0;
      }
    }
  }
  function nativasMicrobit() {
    return {
      'basic.showIcon': function (nom) {
        var p = CL.ICONOS_MB[String(nom).toLowerCase()] || CL.ICONOS_MB.corazon;
        pintarPatron(p);
        return { espera: 400 };
      },
      'basic.showNumber': function (n) {
        var txt = String(Math.trunc(num(n)));
        if (txt.length === 1) { pintarPatron(CL.patronMB(txt)); return { espera: 600 }; }
        return desplazarTexto(txt);
      },
      'basic.showString': function (s) { return desplazarTexto(String(s)); },
      'basic.showLeds': function (s) {
        var filas = String(s).trim().split('\n').map(function (f) { return f.replace(/[^01#.]/g, '').replace(/#/g, '1').replace(/\./g, '0'); });
        pintarPatron(filas);
        return { espera: 200 };
      },
      'basic.clearScreen': function () { pintarPatron(['00000', '00000', '00000', '00000', '00000']); },
      'basic.pause': function (ms) { return { espera: num(ms) }; },
      'basic.forever': function (fn) {
        if (fn && fn.esFn) R.tareas.push(crearTareaRepetida(fn));
      },
      'led.plot': function (x, y) { var m = mbEstado(); if (m) m.matriz[CL.clamp(num(y), 0, 4)][CL.clamp(num(x), 0, 4)] = 1; },
      'led.unplot': function (x, y) { var m = mbEstado(); if (m) m.matriz[CL.clamp(num(y), 0, 4)][CL.clamp(num(x), 0, 4)] = 0; },
      'led.toggle': function (x, y) {
        var m = mbEstado();
        if (!m) return;
        var yy = CL.clamp(num(y), 0, 4), xx = CL.clamp(num(x), 0, 4);
        m.matriz[yy][xx] = m.matriz[yy][xx] ? 0 : 1;
      },
      'led.point': function (x, y) { var m = mbEstado(); return m ? (m.matriz[CL.clamp(num(y), 0, 4)][CL.clamp(num(x), 0, 4)] ? 1 : 0) : 0; },
      'input.onButtonPressed': function (b, fn) { R.eventos['boton:' + String(b).toUpperCase()] = fn; },
      'input.onGesture': function (g, fn) { R.eventos['gesto:' + String(g).toLowerCase()] = fn; },
      'input.buttonIsPressed': function (b) {
        var m = mbEstado();
        if (!m) return 0;
        return (String(b).toUpperCase() === 'A' ? m.botonA : m.botonB) ? 1 : 0;
      },
      'input.lightLevel': function () { return R.placa ? Math.round(num(R.placa.props.luz)) : 0; },
      'input.temperature': function () { return R.placa ? Math.round(num(R.placa.props.temp)) : 0; },
      'input.isGesture': function (g) {
        return (String(g).toLowerCase() === 'agitar' && R.placa && R.placa.props.agitado) ? 1 : 0;
      },
      'pins.digitalWritePin': function (p, v) { ponerPin('P' + Math.trunc(num(p)), 'OUTPUT', num(v) >= 1 ? 1 : 0); },
      'pins.digitalReadPin': function (p) { return leerTension('P' + Math.trunc(num(p))) > 1.6 ? 1 : 0; },
      'pins.analogWritePin': function (p, v) { ponerPin('P' + Math.trunc(num(p)), 'OUTPUT', CL.clamp(num(v), 0, 1023) / 1023); },
      'pins.analogReadPin': function (p) { return Math.round(CL.clamp(leerTension('P' + Math.trunc(num(p))) / 3.3, 0, 1) * 1023); },
      'pins.servoWritePin': function (p, a) { aplicarServo('P' + Math.trunc(num(p)), CL.clamp(num(a), 0, 180)); },
      'music.playTone': function (f, ms) {
        R.tonos.P0 = num(f) || 440;
        ponerPin('P0', 'OUTPUT', 0.5);
        var d = num(ms) || 200;
        setTimeout(function () { delete R.tonos.P0; ponerPin('P0', 'OUTPUT', 0); }, d);
        return { espera: d };
      },
      'music.rest': function (ms) { return { espera: num(ms) }; },
      'music.playMelody': function (cad, bpm) { return tocarMelodia(cad, bpm); },
      'music.startMelody': function (cad, bpm) { return tocarMelodia(cad, bpm); },
      'control.waitMicros': function (us) { return { espera: num(us) / 1000 }; },
      'basic.showArrow': function (dir) {
        pintarPatron(String(dir).toLowerCase().indexOf('ab') === 0 ? CL.ICONOS_MB.flecha_s : CL.ICONOS_MB.flecha_n);
        return { espera: 300 };
      }
    };
  }
  /* ---- melodias: "C5:4 D5:4 E5:8" o "do re mi" ----
     Se van poniendo las notas en R.tonos.P0 con temporizadores, asi que la
     melodia sale por el mismo camino que tone(): el zumbador del circuito si
     lo hay, y si no el altavoz interno de la micro:bit. */
  var NOTA_BASE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11,
                    do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 };
  function frecNota(txt) {
    var m = String(txt).toLowerCase().match(/^([a-g]|do|re|mi|fa|sol|la|si)(#|b)?(\d)?$/);
    if (!m) return 0;
    var semi = NOTA_BASE[m[1]];
    if (semi === undefined) return 0;
    if (m[2] === '#') semi++; else if (m[2] === 'b') semi--;
    var oct = m[3] ? parseInt(m[3], 10) : 4;
    return 440 * Math.pow(2, (semi - 9) / 12 + (oct - 4));
  }
  function tocarMelodia(cad, bpm) {
    var tempo = num(bpm) || 120;
    var negra = 60000 / tempo;
    var partes = String(cad).trim().split(/[\s,]+/);
    var t = 0;
    partes.forEach(function (nota) {
      var p = nota.split(':');
      var f = frecNota(p[0]);
      var dur = (p[1] ? parseFloat(p[1]) : 4) / 4 * negra;
      if (!isFinite(dur) || dur <= 0) dur = negra;
      if (f > 0) {
        (function (freq, ini, largo) {
          setTimeout(function () { if (R.corriendo) { R.tonos.P0 = freq; ponerPin('P0', 'OUTPUT', 0.5); } }, ini);
          setTimeout(function () { if (R.tonos.P0 === freq) { delete R.tonos.P0; ponerPin('P0', 'OUTPUT', 0); } }, ini + largo * 0.88);
        }(f, t, dur));
      }
      t += dur;
    });
    return { espera: t };
  }

  function desplazarTexto(txt) {
    // Muestra el texto letra por letra usando la fuente de 5×5
    var letras = txt.split('');
    var i = 0;
    var t = setInterval(function () {
      if (i >= letras.length || !R.corriendo) { clearInterval(t); return; }
      pintarPatron(CL.patronMB(letras[i]));
      i++;
    }, 450);
    pintarPatron(CL.patronMB(letras[0] || ' '));
    return { espera: 450 * letras.length };
  }

  /* ------------------------------------------------------------
     Tareas (generadores cooperativos)
     ------------------------------------------------------------ */
  function crearTarea(gen, nombre) { return { gen: gen, espera: 0, nombre: nombre || 'tarea', viva: true }; }

  function crearTareaRepetida(fn) {
    var interp = R.interp;
    var gen = (function* () {
      while (true) {
        yield* interp.invocarFn(fn, []);
        yield { t: 'tick' };
      }
    }());
    return crearTarea(gen, 'forever');
  }

  function programaArduino(interp) {
    return (function* () {
      yield* interp.prepararGlobal();
      if (interp.tieneFuncion('setup')) yield* interp.llamarFuncion('setup', []);
      if (!interp.tieneFuncion('loop')) return;
      while (true) {
        yield* interp.llamarFuncion('loop', []);
        yield { t: 'tick' };
      }
    }());
  }
  function programaMicrobit(interp) {
    return (function* () {
      yield* interp.prepararGlobal();
      if (interp.tieneFuncion('setup')) yield* interp.llamarFuncion('setup', []);
      if (interp.tieneFuncion('loop')) {
        while (true) { yield* interp.llamarFuncion('loop', []); yield { t: 'tick' }; }
      }
    }());
  }

  /* ------------------------------------------------------------
     Control de la simulación
     ------------------------------------------------------------ */
  R.placaActiva = function () {
    var comps = CL.state.proj.components;
    var preferida = CL.state.proj.board;
    for (var i = 0; i < comps.length; i++) if (comps[i].type === preferida) return comps[i];
    for (var j = 0; j < comps.length; j++) {
      var d = CL.catalogo[comps[j].type];
      if (d && d.placa) return comps[j];
    }
    return null;
  };

  R.iniciar = function (opciones) {
    opciones = opciones || {};
    R.detener(true);
    R.errores = [];
    R.tiempo = 0;
    R.tareas = [];
    R.tonos = {};
    R.eventos = {};
    ctx.pines = {};
    ctx.servoAngulo = {};
    ctx.microbit = {};
    CL.circuito._nl = {};
    CL.circuito.marcarSucio();

    R.placa = R.placaActiva();
    R.familia = R.placa ? (CL.catalogo[R.placa.type].familia || 'arduino') : 'arduino';

    var codigo = (CL.state.proj.code || '').trim();
    if (R.placa && codigo) {
      var host = {
        nativas: R.familia === 'microbit'
          ? Object.assign(nativasArduino(), nativasMicrobit())
          : nativasArduino(),
        objetos: {
          Serial: { _ns: 'Serial' }, basic: { _ns: 'basic' }, led: { _ns: 'led' },
          input: { _ns: 'input' }, pins: { _ns: 'pins' }, music: { _ns: 'music' },
          control: { _ns: 'control' }
        },
        constantes: {
          HIGH: 1, LOW: 0, INPUT: 0, OUTPUT: 1, INPUT_PULLUP: 2, LED_BUILTIN: 13,
          A0: 'A0', A1: 'A1', A2: 'A2', A3: 'A3', A4: 'A4', A5: 'A5', A6: 'A6', A7: 'A7',
          PI: Math.PI, true: 1, false: 0
        },
        crearServo: crearServo
      };
      var comp = CL.Interprete.compilar(codigo, host);
      if (!comp.ok) {
        R.errores.push({ mensaje: comp.error, linea: comp.linea });
        CL.emit('sim:error', { mensaje: comp.error, linea: comp.linea });
        if (!opciones.silencioso) {
          CL.mensaje('err', 'Error en el programa (línea ' + comp.linea + ')', comp.error,
            'Revisa la línea ' + comp.linea + ' en el editor de código. Comprueba los paréntesis, las llaves y el punto y coma final.');
        }
        return false;
      }
      R.interp = comp.interprete;
      R.tareas.push(crearTarea(R.familia === 'microbit' ? programaMicrobit(R.interp) : programaArduino(R.interp), 'principal'));
    } else {
      R.interp = null;
    }

    R.corriendo = true;
    R._ultimo = performance.now();
    CL.circuito.ctx.ejecutando = true;
    if (CL.audio) CL.audio.simulacion(true);
    CL.emit('sim:estado', { corriendo: true });
    if (!R._raf) R._raf = requestAnimationFrame(bucle);
    return true;
  };

  R.detener = function (silencioso) {
    R.corriendo = false;
    CL.circuito.ctx.ejecutando = false;
    R.tareas = [];
    R.tonos = {};
    if (CL.audio) CL.audio.simulacion(false, silencioso);
    if (!silencioso) CL.emit('sim:estado', { corriendo: false });
  };

  R.reiniciar = function () {
    var iba = R.corriendo;
    R.detener(true);
    ctx.pines = {};
    ctx.microbit = {};
    ctx.servoAngulo = {};
    ctx.quemados = {};
    CL.circuito._nl = {};
    CL.circuito._estados = {};
    CL.circuito.marcarSucio();
    R.limpiarSerial();
    if (iba) R.iniciar();
    else { CL.circuito.resolver(0.016); CL.emit('sim:tick'); CL.emit('sim:estado', { corriendo: false }); }
  };

  /** Dispara un evento de la micro:bit (botones, gestos). */
  R.dispararEvento = function (clave) {
    var fn = R.eventos[clave];
    if (!fn || !R.interp || !R.corriendo) return false;
    var interp = R.interp;
    R.tareas.push(crearTarea((function* () { yield* interp.invocarFn(fn, []); }()), 'evento'));
    return true;
  };

  /* ------------------------------------------------------------
     Bucle principal
     ------------------------------------------------------------ */
  var PASOS_FRAME = 60000;      // tope de instrucciones por cuadro

  /* ---- bajo consumo ----
     Con la simulacion parada y nada moviendose, resolver el circuito 60 veces
     por segundo es tirar bateria (y en una sala de 15 equipos, se nota).
     En reposo se baja a ~8 cuadros por segundo; cualquier cambio despierta. */
  var reposo = 0;
  // la preferencia se relee cada 3 s: consultar localStorage 60 veces por
  // segundo cuesta mas que el propio ahorro
  var prefAhorro = true, prefLeida = 0;
  function ahorroActivo(ahora) {
    if (ahora - prefLeida > 3000) { prefLeida = ahora; prefAhorro = CL.pref('bajoConsumo', true) !== false; }
    return prefAhorro;
  }
  R.despertar = function () { reposo = 0; };
  CL.on('circuito:cambio', R.despertar);
  ['pointerdown', 'pointermove', 'keydown', 'wheel'].forEach(function (ev) {
    window.addEventListener(ev, R.despertar, { passive: true });
  });

  function hayMovimiento() {
    if (R.corriendo) return true;
    if (CL.circuito._dirty) return true;
    var res = CL.circuito.resultado;
    if (!res) return true;
    for (var id in res.comps) {
      var st = res.comps[id];
      if (st && (st.velocidad > 0.02 || st.girando || st.sonando)) return true;
      if (st && st.destino !== undefined && Math.abs(st.destino - st.angulo) > 0.6) return true;
      if (st && st.calor > 0.01) return true;
    }
    return false;
  }

  function bucle(ahora) {
    R._raf = requestAnimationFrame(bucle);
    var dt = Math.min(0.05, (ahora - R._ultimo) / 1000);
    // en reposo se salta el 87 % de los cuadros
    if (ahorroActivo(ahora) && !hayMovimiento()) {
      reposo++;
      if (reposo % 8 !== 1) return;
    } else reposo = 0;
    R._ultimo = ahora;
    if (dt <= 0) dt = 0.016;
    R.fps = Math.round(1 / dt);
    avanzar(dt);
  }

  /** Un paso de simulación. Se expone para poder avanzar a mano (pruebas). */
  function avanzar(dt) {
    dt = dt || 0.016;
    if (R.corriendo) {
      R.tiempo += dt * 1000;
      ejecutarTareas(dt);
    }
    // resolver el circuito siempre (aunque esté detenido, para ver el estado)
    try {
      CL.circuito.resolver(dt);
    } catch (e) {
      console.error('[CircuitLab] error al resolver el circuito', e);
    }
    sonar();
    CL.emit('sim:tick', { dt: dt });
  }
  R.paso = avanzar;

  function ejecutarTareas(dt) {
    var presupuesto = PASOS_FRAME;
    var t0 = performance.now();
    for (var i = 0; i < R.tareas.length && presupuesto > 0; i++) {
      var tarea = R.tareas[i];
      if (!tarea.viva) continue;
      if (tarea.espera > R.tiempo) continue;
      var pasos = 0;
      while (presupuesto > 0) {
        var r;
        try {
          r = tarea.gen.next();
        } catch (e) {
          tarea.viva = false;
          reportarError(e);
          break;
        }
        presupuesto -= 8;
        pasos++;
        if (r.done) { tarea.viva = false; break; }
        var val = r.value;
        if (val && val.t === 'delay') {
          tarea.espera = R.tiempo + Math.max(0, val.ms);
          break;
        }
        if (pasos % 64 === 0 && performance.now() - t0 > 9) { presupuesto = 0; break; }
      }
    }
    R.tareas = R.tareas.filter(function (t) { return t.viva; });
  }

  function reportarError(e) {
    var msg = e && e.esErrorCL ? e.mensaje : (e && e.message ? e.message : String(e));
    var linea = e && e.linea ? e.linea : 0;
    R.errores.push({ mensaje: msg, linea: linea });
    CL.mensaje('err', 'Error al ejecutar el programa' + (linea ? ' (línea ' + linea + ')' : ''), msg,
      'Corrige el código y vuelve a intentarlo.');
    CL.emit('sim:error', { mensaje: msg, linea: linea });
    R.detener();
  }

  /* ---- sonido: se calcula el zumbador y se delega la escena a CL.audio ---- */
  function sonar() {
    if (!CL.audio) return;
    var res = CL.circuito.resultado;
    var zum = null;
    if (res && R.corriendo) {
      var freq = 0, vol = 0;
      CL.state.compsPorTipo('buzzer').forEach(function (c) {
        var st = res.comps[c.id];
        if (st && st.sonando) {
          vol = Math.max(vol, st.volumen || 0.5);
          freq = Math.max(freq, frecuenciaDe(c));
        }
      });
      if (freq > 0 && vol > 0) zum = { freq: freq, vol: vol };
      // la micro:bit v2 lleva altavoz propio: suena aunque no haya buzzer
      else if (R.familia === 'microbit' && R.tonos.P0) zum = { freq: R.tonos.P0, vol: 0.7 };
    }
    CL.audio.escena(res, R.corriendo, zum);
  }
  function frecuenciaDe(cBuzzer) {
    // si un pin con tone() alimenta el buzzer, se usa esa frecuencia
    if (R.placa) {
      var netP = CL.circuito.netDePin(cBuzzer.id, 'p');
      for (var pin in R.tonos) {
        if (CL.circuito.netDePin(R.placa.id, pin) === netP && netP >= 0) return R.tonos[pin];
      }
    }
    for (var k in R.tonos) return R.tonos[k];
    return 1000;
  }

  /* ---- arranque del bucle aunque no haya simulación (para dibujar) ---- */
  R.arrancarReloj = function () {
    if (!R._raf) { R._ultimo = performance.now(); R._raf = requestAnimationFrame(bucle); }
  };

}(window.CL));
