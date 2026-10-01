/* ============================================================
   CircuitLab — motor de sonido
   Todo el audio se SINTETIZA con WebAudio: no hay ni un solo
   archivo .mp3/.wav. Motivos:
     · la app tiene que funcionar sin internet y desde una USB,
     · un banco de sonidos decente pesa 1–3 MB y aquí pesa 0 KB,
     · el sonido puede seguir a la física: el motor sube de tono
       cuando sube la tensión, el servo chirría solo mientras se
       mueve y el paso a paso hace "brrr" al ritmo de sus pasos.

   Todo cuelga de CL.audio:
     CL.audio.sfx.*        efectos de un golpe (clac, luz, chispa…)
     CL.audio.escena(...)  puente por cuadro entre circuito y sonido
     CL.audio.alternar()   interruptor general (preferencia "sonido")
   ============================================================ */
window.CL = window.CL || {};

(function (CL) {
  'use strict';

  var A = {};
  CL.audio = A;

  /* ------------------------------------------------------------
     Contexto y bus principal
     El contexto NO se crea hasta que el usuario toca la página:
     los navegadores bloquean el audio antes del primer gesto.
     ------------------------------------------------------------ */
  var ac = null, master = null, limitador = null, ruido = null;
  var desbloqueado = false;

  function activo() { return CL.pref('sonido', true) !== false; }
  A.activo = activo;

  A.volumen = function (v) {
    if (v === undefined) return CL.pref('volumen', 0.7);
    v = CL.clamp(+v || 0, 0, 1);
    CL.setPref('volumen', v);
    if (master) master.gain.setTargetAtTime(v, ac.currentTime, 0.02);
    return v;
  };

  /** Devuelve el AudioContext (o null si el sonido está apagado / sin gesto previo). */
  A.ac = function () {
    if (!activo() || !desbloqueado) return null;
    if (ac) {
      if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
      return ac;
    }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = A.volumen();
      limitador = ac.createDynamicsCompressor();
      limitador.threshold.value = -14;
      limitador.knee.value = 8;
      limitador.ratio.value = 9;
      limitador.attack.value = 0.004;
      limitador.release.value = 0.18;
      master.connect(limitador);
      limitador.connect(ac.destination);
    } catch (e) { ac = null; }
    return ac;
  };

  /** Punto de conexión para cualquier voz. */
  function bus() { var a = A.ac(); return a ? master : null; }
  A.bus = bus;

  /** El primer clic/tecla del usuario habilita el audio (política del navegador). */
  A.desbloquear = function () {
    if (desbloqueado) { A.ac(); return; }
    desbloqueado = true;
    A.ac();
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function () { A.desbloquear(); }, { once: true, passive: true });
  });

  /* ------------------------------------------------------------
     Piezas básicas
     ------------------------------------------------------------ */
  /** Ruido blanco compartido: se genera una sola vez (2 s). */
  function bufRuido(a) {
    if (ruido) return ruido;
    var n = Math.floor(a.sampleRate * 2);
    ruido = a.createBuffer(1, n, a.sampleRate);
    var d = ruido.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return ruido;
  }
  function fuenteRuido(a) {
    var s = a.createBufferSource();
    s.buffer = bufRuido(a);
    s.loop = true;
    return s;
  }
  /** Cambia un parámetro solo si de verdad cambió (ahorra trabajo por cuadro). */
  function suave(param, val, tc) {
    if (Math.abs(param.value - val) < Math.max(0.0005, Math.abs(val) * 0.004)) return;
    try { param.setTargetAtTime(val, ac.currentTime, tc || 0.05); } catch (e) { param.value = val; }
  }

  /* ------------------------------------------------------------
     Sonidos de un solo golpe (one-shots)
     ------------------------------------------------------------ */
  /** Tono corto con envolvente suave (sin chasquidos). */
  A.tono = function (o) {
    var a = A.ac(); if (!a) return;
    o = o || {};
    var t0 = a.currentTime + (o.retraso || 0);
    var dur = (o.ms || 120) / 1000;
    var osc = a.createOscillator(), g = a.createGain();
    osc.type = o.tipo || 'sine';
    osc.frequency.setValueAtTime(o.f || 660, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + dur);
    var pico = o.vol === undefined ? 0.06 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(pico, t0 + Math.min(0.012, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  };

  /** Golpe de ruido filtrado: chasquidos mecánicos, chispas, roces. */
  A.golpe = function (o) {
    var a = A.ac(); if (!a) return;
    o = o || {};
    var t0 = a.currentTime + (o.retraso || 0);
    var dur = (o.ms || 40) / 1000;
    var s = fuenteRuido(a);
    var f = a.createBiquadFilter();
    f.type = o.filtro || 'bandpass';
    f.frequency.setValueAtTime(o.f || 2000, t0);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.f2), t0 + dur);
    f.Q.value = o.q === undefined ? 1.2 : o.q;
    var g = a.createGain();
    g.gain.setValueAtTime(o.vol === undefined ? 0.12 : o.vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + dur + 0.02);
  };

  /* ------------------------------------------------------------
     Biblioteca de efectos (interfaz y componentes)
     ------------------------------------------------------------ */
  var COLOR_NOTA = { rojo: 523.3, amarillo: 587.3, verde: 659.3, azul: 784, blanco: 880 };

  A.sfx = {
    /* --- interfaz --- */
    ok:    function () { A.tono({ f: 660, ms: 90, vol: .05 }); A.tono({ f: 880, ms: 150, vol: .05, retraso: .09 }); },
    bad:   function () { A.tono({ f: 220, ms: 200, tipo: 'square', vol: .045 }); },
    click: function () { A.golpe({ f: 3200, ms: 16, q: 2, vol: .05 }); },
    pop:   function () { A.tono({ f: 420, f2: 720, ms: 70, tipo: 'triangle', vol: .05 }); },
    win:   function () {
      [523, 659, 784, 1047].forEach(function (f, i) { A.tono({ f: f, ms: 170, vol: .055, retraso: i * .11 }); });
    },

    /* --- componentes --- */
    /** Chasquido mecánico de un interruptor o pulsador. */
    clac: function (cerrando) {
      A.golpe({ f: cerrando ? 2600 : 1900, ms: 26, q: 1.1, vol: .11 });
      A.tono({ f: cerrando ? 160 : 130, ms: 40, tipo: 'triangle', vol: .05 });
    },
    /** Encendido / apagado de un LED: aviso corto y muy suave. */
    luz: function (color, encendiendo) {
      var f = COLOR_NOTA[color] || COLOR_NOTA.rojo;
      if (encendiendo) {
        A.tono({ f: f, ms: 70, tipo: 'sine', vol: .035 });
        A.golpe({ f: 5200, ms: 8, q: 3, vol: .02 });
      } else {
        A.tono({ f: f * 0.6, ms: 45, tipo: 'sine', vol: .022 });
      }
    },
    /** Chispa de un cortocircuito o de un pin sobrecargado. */
    chispa: function () {
      A.golpe({ filtro: 'highpass', f: 1400, f2: 400, ms: 190, q: .7, vol: .3 });
      A.tono({ f: 900, f2: 70, ms: 200, tipo: 'sawtooth', vol: .05 });
    },
    /** Ping del sensor ultrasónico. */
    ping: function (cerca) {
      A.tono({ f: cerca ? 3400 : 2700, f2: cerca ? 2900 : 2300, ms: 55, vol: .028 });
    },
    /** Detección del sensor de movimiento. */
    detectar: function () {
      A.tono({ f: 880, ms: 60, vol: .04 });
      A.tono({ f: 1320, ms: 90, vol: .04, retraso: .06 });
    },
    /** Muesca del potenciómetro / rueda. */
    muesca: function () { A.golpe({ f: 3000, ms: 7, q: 2.5, vol: .045 }); },
    /** Circuito energizado / apagado. */
    encender: function () { A.tono({ f: 220, f2: 660, ms: 220, tipo: 'triangle', vol: .05 }); },
    apagar:   function () { A.tono({ f: 560, f2: 180, ms: 200, tipo: 'triangle', vol: .045 }); },
    /** Un cable queda conectado. */
    conectar: function () { A.golpe({ f: 2400, ms: 18, q: 2, vol: .06 }); A.tono({ f: 520, ms: 55, tipo: 'triangle', vol: .035 }); },
    /** Relé: el golpe grave de la bobina y, encima, el contacto metálico.
        Al soltar suena más seco y más grave: es el muelle, no el electroimán. */
    rele: function (activando) {
      if (activando) {
        A.golpe({ filtro: 'lowpass', f: 380, ms: 55, q: .6, vol: .26 });
        A.golpe({ f: 3100, ms: 22, q: 2.2, vol: .12, retraso: .012 });
      } else {
        A.golpe({ filtro: 'lowpass', f: 260, ms: 45, q: .6, vol: .2 });
        A.golpe({ f: 2200, ms: 16, q: 2, vol: .08, retraso: .008 });
      }
    },
    /** Un componente se quema. */
    quemar: function () {
      A.golpe({ filtro: 'highpass', f: 900, f2: 220, ms: 420, q: .5, vol: .34 });
      A.tono({ f: 320, f2: 45, ms: 460, tipo: 'sawtooth', vol: .06 });
    }
  };

  /* ------------------------------------------------------------
     Voces continuas (una por componente que suena mientras dura)
     ------------------------------------------------------------ */
  var voces = {};
  var MAX_VOCES = 10;

  function crearVoz(clave, fabrica) {
    if (voces[clave]) return voces[clave];
    var a = A.ac(); if (!a) return null;
    var n = 0; for (var k in voces) n++;
    if (n >= MAX_VOCES) return null;             // tope de polifonía
    var v = fabrica(a);
    if (v) { v.clave = clave; voces[clave] = v; }
    return v;
  }

  function pararVoz(clave) {
    var v = voces[clave];
    if (!v) return;
    delete voces[clave];
    try {
      v.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.03);
      var fuentes = v.fuentes;
      setTimeout(function () {
        fuentes.forEach(function (f) { try { f.stop(); f.disconnect(); } catch (e) {} });
        try { v.g.disconnect(); } catch (e) {}
      }, 220);
    } catch (e) {}
  }
  A.parar = pararVoz;

  A.silenciarTodo = function () {
    for (var k in voces) pararVoz(k);
  };

  /** Voces sonando ahora mismo. Sirve para depurar sin oír nada. */
  A.vocesActivas = function () { var r = []; for (var k in voces) r.push(k); return r; };

  /** Olvida el estado anterior de todos los componentes.
      Hay que llamarlo al cambiar de proyecto: los identificadores de los
      ejemplos se repiten entre circuitos y, sin esto, un interruptor
      "recordaba" la posición del proyecto anterior y se comía el chasquido
      del primer clic (o inventaba uno al cargar). */
  A.reiniciarMemoria = function () { prev = {}; ultPing = {}; A.silenciarTodo(); };

  /* ---- motor de corriente continua: zumbido del colector + roce de escobillas ---- */
  function vozMotor(a) {
    var g = a.createGain(); g.gain.value = 0.0001;
    var lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; lp.Q.value = .7;
    var osc = a.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 30;
    var gO = a.createGain(); gO.gain.value = .55;
    var n = fuenteRuido(a);
    var bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.1;
    var gN = a.createGain(); gN.gain.value = .12;
    osc.connect(gO); gO.connect(lp);
    n.connect(bp); bp.connect(gN); gN.connect(lp);
    lp.connect(g); g.connect(master);
    osc.start(); n.start();
    return {
      fuentes: [osc, n], g: g,
      ajustar: function (p) {
        var v = CL.clamp(p.vel || 0, 0, 1.4);
        suave(osc.frequency, 26 + v * 96 + (p.desvio || 0), .05);
        suave(lp.frequency, 240 + v * 1500, .07);
        suave(bp.frequency, 700 + v * 2100, .07);
        suave(gN.gain, .08 + v * .22, .07);
        suave(g.gain, v <= 0.01 ? 0.0001 : (0.035 + v * 0.085) * (p.duck || 1), .06);
      }
    };
  }

  /* ---- servo: chirrido de los engranajes solo mientras se mueve ---- */
  function vozServo(a) {
    var g = a.createGain(); g.gain.value = 0.0001;
    var osc = a.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 165;
    var bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1150; bp.Q.value = 5.5;
    var n = fuenteRuido(a);
    var hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    var gN = a.createGain(); gN.gain.value = .07;
    osc.connect(bp); bp.connect(g);
    n.connect(hp); hp.connect(gN); gN.connect(g);
    g.connect(master);
    osc.start(); n.start();
    return {
      fuentes: [osc, n], g: g,
      ajustar: function (p) {
        suave(osc.frequency, 150 + (p.vel || 0) * 90, .04);
        suave(bp.frequency, 1000 + (p.vel || 0) * 700, .05);
        suave(g.gain, p.moviendo ? 0.075 * (p.duck || 1) : 0.0001, p.moviendo ? .01 : .04);
      }
    };
  }

  /* ---- paso a paso: "brrr" al ritmo exacto de los pasos ---- */
  function vozPaso(a) {
    var g = a.createGain(); g.gain.value = 0.0001;
    var osc = a.createOscillator(); osc.type = 'square'; osc.frequency.value = 120;
    var bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 7;
    osc.connect(bp); bp.connect(g); g.connect(master);
    osc.start();
    return {
      fuentes: [osc], g: g,
      ajustar: function (p) {
        suave(osc.frequency, CL.clamp(p.pasosSeg || 100, 20, 900), .03);
        suave(g.gain, p.girando ? 0.06 * (p.duck || 1) : 0.0001, .03);
      }
    };
  }

  /* ---- zumbador piezoeléctrico ---- */
  function vozZumbador(a) {
    var g = a.createGain(); g.gain.value = 0.0001;
    var osc = a.createOscillator(); osc.type = 'square'; osc.frequency.value = 1000;
    var bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = .9;
    osc.connect(bp); bp.connect(g); g.connect(master);
    osc.start();
    return {
      fuentes: [osc], g: g,
      ajustar: function (p) {
        var f = CL.clamp(p.freq || 1000, 30, 8000);
        suave(osc.frequency, f, .008);
        suave(bp.frequency, CL.clamp(f * 2.2, 400, 6000), .02);
        suave(g.gain, p.vol > 0 ? CL.clamp(0.10 * p.vol, 0, .12) : 0.0001, .015);
      }
    };
  }

  /** Voz genérica: crea/ajusta/apaga en una sola llamada. */
  function voz(clave, fabrica, params, encendida) {
    if (!encendida) { if (voces[clave]) pararVoz(clave); return; }
    var v = voces[clave] || crearVoz(clave, fabrica);
    if (v) v.ajustar(params);
  }

  /* ------------------------------------------------------------
     Puente entre el circuito y el sonido
     Se llama una vez por cuadro desde el reloj de simulación.
     ------------------------------------------------------------ */
  var prev = {};                 // estado anterior por componente
  var ultLuz = 0, luces = 0;     // limitador de blips de LED
  var ultChispa = 0, ultPing = {};

  A.escena = function (res, corriendo, zumbador) {
    if (!activo() || !desbloqueado) return;
    var ahora = performance.now();
    var vivos = {};

    /* --- zumbador / altavoz de la micro:bit --- */
    var sonandoZum = !!(zumbador && zumbador.freq > 0 && zumbador.vol > 0);
    voz('buzzer', vozZumbador, zumbador || {}, sonandoZum);
    // ducking: con el zumbador sonando, los motores se apartan para dejarlo oír
    var duck = sonandoZum ? 0.62 : 1;

    if (!res) { limpiarVocesSalvo({ buzzer: 1 }); return; }
    vivos.buzzer = 1;

    /* --- cortocircuito o pin sobrecargado --- */
    var corto = false;
    for (var i = 0; i < (res.fuentes || []).length; i++) {
      var f = res.fuentes[i];
      if (Math.abs(f.i) > (f.imax || 2)) { corto = true; break; }
    }
    if (corto && ahora - ultChispa > 1400) { ultChispa = ahora; A.sfx.chispa(); }

    /* --- recorrido de los componentes --- */
    var comps = CL.state.proj.components;
    for (var k = 0; k < comps.length; k++) {
      var c = comps[k];
      var st = res.comps[c.id];
      if (!st) continue;
      var p = prev[c.id] || (prev[c.id] = {});

      switch (c.type) {

        case 'led':
        case 'ledrgb': {
          if (st.quemado && !p.quem) { p.quem = true; A.sfx.quemar(); CL.emit('comp:quemado', c); }
          var on = c.type === 'ledrgb'
            ? ((st.br || 0) + (st.bg || 0) + (st.bb || 0)) > 0.2
            : (st.brillo || 0) > 0.12;
          if (on !== !!p.on && ahora - (p.t || 0) > 70 && (ahora - ultLuz > 90 || luces < 3)) {
            if (ahora - ultLuz > 90) { luces = 0; ultLuz = ahora; }
            luces++;
            A.sfx.luz(c.props.color || 'rojo', on);
            p.t = ahora;
          }
          p.on = on;
          break;
        }

        case 'motor': {
          var vel = st.velocidad || 0;
          if (vel > 0.02 && !p.giro) A.golpe({ f: 240, ms: 60, q: .8, vol: .10 });   // tirón de arranque
          p.giro = vel > 0.02;
          // pequeño desvío por componente para que dos motores no suenen "clonados"
          if (p.desvio === undefined) p.desvio = ((parseInt(c.id.slice(-2), 36) || 0) % 9) - 4;
          voz('mot:' + c.id, vozMotor, { vel: vel, desvio: p.desvio, duck: duck }, vel > 0.02);
          if (vel > 0.02) vivos['mot:' + c.id] = 1;
          break;
        }

        case 'servo': {
          var d = Math.abs((st.destino === undefined ? st.angulo : st.destino) - (st.angulo || 0));
          var mov = st.alimentado && d > 0.6;
          voz('srv:' + c.id, vozServo, { moviendo: mov, vel: CL.clamp(d / 90, 0, 1), duck: duck }, mov || p.mov);
          if (p.mov && !mov) { A.golpe({ f: 2800, ms: 12, q: 2, vol: .05 }); pararVoz('srv:' + c.id); }
          else if (mov) vivos['srv:' + c.id] = 1;
          p.mov = mov;
          break;
        }

        case 'paso': {
          var ang = st.angulo || 0;
          var da = Math.abs(ang - (p.ang === undefined ? ang : p.ang));
          if (da > 180) da = 360 - da;                      // vuelta completa
          p.ang = ang;
          var gira = !!st.girando && da > 0.2;
          voz('pas:' + c.id, vozPaso, { girando: gira, pasosSeg: da * 60 / 1.8, duck: duck }, gira);
          if (gira) vivos['pas:' + c.id] = 1;
          break;
        }

        case 'rele': {
          var act = !!st.activado;
          if (p.act !== undefined && act !== p.act) A.sfx.rele(act);
          p.act = act;
          break;
        }

        case 'interruptor': {
          var cer = st.cerrado === undefined ? !!c.props.cerrado : !!st.cerrado;
          if (p.cer !== undefined && cer !== p.cer) A.sfx.clac(cer);
          p.cer = cer;
          break;
        }

        case 'pulsador': {
          var pr = !!st.presionado;
          if (p.pr !== undefined && pr !== p.pr) A.sfx.clac(pr);
          p.pr = pr;
          break;
        }

        case 'pir': {
          var det = !!(st.alimentado && st.detecta);
          if (det && !p.det) A.sfx.detectar();
          p.det = det;
          break;
        }

        case 'ultrasonico': {
          if (st.alimentado && corriendo) {
            var t = ultPing[c.id] || 0;
            var per = CL.clamp(120 + (st.distancia || 40) * 6, 140, 1400);   // más cerca, más rápido
            if (ahora - t > per) { ultPing[c.id] = ahora; A.sfx.ping((st.distancia || 40) < 40); }
          }
          break;
        }
      }
    }

    limpiarVocesSalvo(vivos);
  };

  function limpiarVocesSalvo(vivos) {
    for (var k in voces) if (!vivos[k]) pararVoz(k);
  }

  /** Se llama al arrancar y al detener la simulación.
      OJO: no se apagan las voces continuas. El motor de circuitos sigue
      resolviendo con la simulación detenida, así que un motor conectado a
      una pila SE VE girando; si se ve girando, tiene que oírse. */
  A.simulacion = function (corriendo, callado) {
    ultPing = {};
    if (!activo() || callado) return;
    if (corriendo) A.sfx.encender(); else A.sfx.apagar();
  };

  /* Con la pestaña en segundo plano no suena nada: en una sala con varios
     equipos, un motor zumbando en una pestaña olvidada es insoportable. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) A.silenciarTodo();
  });

  /* ------------------------------------------------------------
     Preferencias
     ------------------------------------------------------------ */
  A.alternar = function () {
    var nuevo = !activo();
    CL.setPref('sonido', nuevo);
    if (!nuevo) { for (var k in voces) pararVoz(k); }
    else A.desbloquear();
    CL.emit('sonido:cambio', nuevo);
    return nuevo;
  };

}(window.CL));
