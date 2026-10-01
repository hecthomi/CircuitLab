/* ============================================================
   CircuitLab — sistema de ejercicios con comprobación automática
   ============================================================ */
(function (CL) {
  'use strict';

  var X = {};
  CL.ejercicios = X;

  function nuevo() { return CL.ejemplos.nuevo(); }

  /* ------------------------------------------------------------
     Circuitos de partida (algunos vienen con un error a propósito)
     ------------------------------------------------------------ */
  function circuitoLedInvertido() {
    return nuevo()
      .proto('bb', 0, 0)
      .libre('f', 'fuente5v', -290, -40)
      .enHoyo('r', 'resistor', 'a', 'B5')
      .enHoyo('d', 'led', 'k', 'D9', { color: 'rojo' })     // ← cátodo hacia la resistencia: mal
      .cable('f:p', 'bb:TP2', 'rojo')
      .cable('f:n', 'bb:TN2', 'negro')
      .cable('bb:TP4', 'bb:A5', 'rojo')
      .cable('bb:A10', 'bb:TN5', 'negro')
      .fin();
  }
  function circuitoCorto() {
    return nuevo()
      .proto('bb', 0, 0)
      .libre('f', 'fuente5v', -290, -40)
      .enHoyo('r', 'resistor', 'a', 'B5')
      .enHoyo('d', 'led', 'a', 'D9', { color: 'verde' })
      .cable('f:p', 'bb:TP2', 'rojo')
      .cable('f:n', 'bb:TN2', 'negro')
      .cable('bb:TP4', 'bb:A5', 'rojo')
      .cable('bb:A10', 'bb:TN5', 'negro')
      .cable('bb:TP8', 'bb:TN8', 'azul')                    // ← puente que cortocircuita los rieles
      .fin();
  }

  /* ------------------------------------------------------------
     LOS EJERCICIOS
     ------------------------------------------------------------ */
  X.lista = [
    {
      id: 'e1', titulo: 'Enciende tu primer LED', nivel: 1, xp: 30, emoji: '💡',
      enunciado: 'Construye un circuito que encienda un LED utilizando una resistencia de 220 Ω. Necesitas: protoboard, fuente, resistencia, LED y cables.',
      pistas: [
        'Empieza llevando el + y el − de la fuente a los rieles de la protoboard.',
        'Coloca la resistencia entre dos columnas distintas de la zona central.',
        'El ánodo del LED (pata larga) va en la columna donde termina la resistencia.',
        'Desde el cátodo del LED, un cable hasta el riel negativo cierra el circuito.'
      ],
      comprobar: function () {
        return [
          { ok: CL.state.cuenta('protoboard') >= 1, txt: 'Usaste una protoboard' },
          { ok: CL.state.cuenta('resistor') >= 1, txt: 'Colocaste una resistencia' },
          { ok: CL.state.compsPorTipo('resistor').some(function (r) { return +r.props.ohms === 220; }), txt: 'Alguna resistencia es de 220 Ω' },
          { ok: CL.validar.resistenciaEnSerieConLed(), txt: 'La resistencia está en serie con el LED' },
          { ok: CL.validar.ledEncendido(), txt: 'El LED está encendido' }
        ];
      }
    },
    {
      id: 'e2', titulo: 'VCC y GND en los rieles', nivel: 1, xp: 20, emoji: '🔌',
      enunciado: 'Conecta correctamente la alimentación: el borne + al riel rojo y el borne − al riel azul de la protoboard.',
      pistas: ['Los rieles son las dos filas de agujeros de cada borde.',
               'El riel de la línea roja es el positivo; el de la línea azul, el negativo.',
               'Haz clic sobre el pin de la fuente y arrastra hasta el agujero del riel.'],
      comprobar: function () {
        var protos = CL.state.compsPorTipo('protoboard');
        var fuentes = CL.state.proj.components.filter(function (c) { var d = CL.catalogo[c.type]; return d && d.fuente; });
        var pos = false, neg = false;
        if (protos.length && fuentes.length) {
          var bb = protos[0];
          fuentes.forEach(function (f) {
            var np = CL.circuito.netDePin(f.id, 'p'), nn = CL.circuito.netDePin(f.id, 'n');
            if (CL.circuito.netDePin(bb.id, 'TP1') === np || CL.circuito.netDePin(bb.id, 'BP1') === np) pos = true;
            if (CL.circuito.netDePin(bb.id, 'TN1') === nn || CL.circuito.netDePin(bb.id, 'BN1') === nn) neg = true;
          });
        }
        return [
          { ok: protos.length >= 1, txt: 'Hay una protoboard' },
          { ok: fuentes.length >= 1, txt: 'Hay una fuente de alimentación' },
          { ok: pos, txt: 'El + llega a un riel positivo' },
          { ok: neg, txt: 'El − llega a un riel negativo' },
          { ok: !CL.validar.hayCorto(), txt: 'No hay cortocircuitos' }
        ];
      }
    },
    {
      id: 'e3', titulo: 'Encuentra el cortocircuito', nivel: 2, xp: 35, emoji: '⚡',
      enunciado: 'Este circuito tiene un cable de más que une los dos rieles y provoca un cortocircuito. Encuéntralo, elimínalo y consigue que el LED encienda con normalidad.',
      preparar: circuitoCorto,
      pistas: ['Pulsa 🔍 Analizar para que el simulador te diga qué está mal.',
               'Un cortocircuito es un camino directo entre + y − sin componentes en medio.',
               'Fíjate en el cable azul que va de un riel al otro: selecciónalo y bórralo con Supr.'],
      comprobar: function () {
        return [
          { ok: !CL.validar.hayCorto(), txt: 'Ya no hay cortocircuito' },
          { ok: CL.validar.ledEncendido(), txt: 'El LED enciende' },
          { ok: CL.state.cuenta('led') >= 1 && CL.state.cuenta('resistor') >= 1, txt: 'El LED conserva su resistencia' }
        ];
      }
    },
    {
      id: 'e4', titulo: 'Corrige el LED invertido', nivel: 2, xp: 30, emoji: '🔄',
      enunciado: 'El LED de este circuito está montado al revés y por eso no enciende. Gíralo (tecla R) o vuelve a colocarlo para que el ánodo mire hacia la resistencia.',
      preparar: circuitoLedInvertido,
      pistas: ['Selecciona el LED y pulsa la tecla R para rotarlo 90°. Necesitarás rotarlo dos veces (180°).',
               'También puedes moverlo y volver a insertarlo con el ánodo en la columna de la resistencia.',
               'El ánodo (+) debe quedar del lado por donde llega la corriente.'],
      comprobar: function () {
        return [
          { ok: CL.validar.ledEncendido(), txt: 'El LED enciende' },
          { ok: CL.validar.corrienteLed() < 0.03, txt: 'La corriente sigue siendo segura' }
        ];
      }
    },
    {
      id: 'e5', titulo: 'LED controlado por pulsador', nivel: 2, xp: 40, emoji: '🔘',
      enunciado: 'Arma un circuito en el que el LED encienda solamente mientras mantienes presionado un pulsador.',
      pistas: ['El pulsador va en serie con el LED, no en paralelo.',
               'Colócalo atravesando el canal central de la protoboard.',
               'Prueba el circuito haciendo clic sostenido sobre el pulsador.'],
      comprobar: function () {
        var ps = CL.state.compsPorTipo('pulsador');
        var bienPuesto = ps.some(function (c) {
          return CL.circuito.conectado(c.id, 'a1') && CL.circuito.conectado(c.id, 'b1') &&
                 CL.circuito.netDePin(c.id, 'a1') !== CL.circuito.netDePin(c.id, 'b1');
        });
        return [
          { ok: ps.length >= 1, txt: 'Hay un pulsador' },
          { ok: CL.state.cuenta('led') >= 1, txt: 'Hay un LED' },
          { ok: CL.validar.resistenciaEnSerieConLed(), txt: 'El LED tiene resistencia' },
          { ok: bienPuesto, txt: 'El pulsador está en serie (sus dos lados van a puntos distintos)' },
          { ok: !CL.validar.ledEncendido(), txt: 'Con el pulsador suelto, el LED está apagado' }
        ];
      }
    },
    {
      id: 'e6', titulo: 'Dos LEDs a la vez', nivel: 2, xp: 35, emoji: '🔆',
      enunciado: 'Enciende dos LEDs de colores distintos al mismo tiempo, cada uno con su propia resistencia.',
      pistas: ['Los dos LEDs se alimentan de los mismos rieles.',
               'Cada rama necesita su resistencia: no compartas una sola.',
               'Usa columnas separadas para que no se toquen entre sí.'],
      comprobar: function () {
        var leds = CL.state.compsPorTipo('led');
        var colores = {};
        leds.forEach(function (l) { colores[l.props.color] = true; });
        return [
          { ok: leds.length >= 2, txt: 'Hay dos LEDs' },
          { ok: Object.keys(colores).length >= 2, txt: 'Son de colores distintos' },
          { ok: CL.state.cuenta('resistor') >= 2, txt: 'Hay dos resistencias' },
          { ok: CL.validar.cuantosLedsEncendidos() >= 2, txt: 'Los dos LEDs están encendidos' }
        ];
      }
    },
    {
      id: 'e7', titulo: 'Semáforo de tres luces', nivel: 3, xp: 60, emoji: '🚦',
      enunciado: 'Construye un semáforo con tres LEDs (rojo, amarillo y verde), cada uno con su resistencia. Puedes controlarlos con interruptores o con un Arduino.',
      pistas: ['Son tres circuitos iguales que comparten los rieles de alimentación.',
               'Si usas Arduino, conecta cada LED a un pin digital distinto (13, 12 y 11).',
               'El programa enciende uno, espera con delay() y pasa al siguiente.'],
      comprobar: function () {
        var leds = CL.state.compsPorTipo('led');
        var col = {};
        leds.forEach(function (l) { col[l.props.color] = true; });
        return [
          { ok: leds.length >= 3, txt: 'Hay tres LEDs' },
          { ok: col.rojo && col.amarillo && col.verde, txt: 'Están los colores rojo, amarillo y verde' },
          { ok: CL.state.cuenta('resistor') >= 3, txt: 'Cada LED tiene su resistencia' },
          { ok: CL.validar.cuantosLedsEncendidos() >= 1, txt: 'Al menos una luz enciende' },
          { ok: !CL.validar.hayCorto(), txt: 'No hay cortocircuitos' }
        ];
      }
    },
    {
      id: 'e8', titulo: 'Brillo variable', nivel: 3, xp: 50, emoji: '🎛️',
      enunciado: 'Consigue que el brillo de un LED cambie al girar un potenciómetro.',
      pistas: ['Puedes usar el potenciómetro como resistencia variable (dos patas).',
               'Deja siempre una resistencia fija de al menos 100 Ω para proteger el LED.',
               'Gira la perilla arrastrándola en el lienzo.'],
      comprobar: function () {
        return [
          { ok: CL.state.cuenta('pot') >= 1, txt: 'Hay un potenciómetro' },
          { ok: CL.state.cuenta('led') >= 1, txt: 'Hay un LED' },
          { ok: CL.validar.ledEncendido(), txt: 'El LED enciende' },
          { ok: CL.state.compsPorTipo('pot').some(function (p) {
              return CL.circuito.conectado(p.id, 'w') && (CL.circuito.conectado(p.id, '1') || CL.circuito.conectado(p.id, '2'));
            }), txt: 'El cursor del potenciómetro está en el circuito' }
        ];
      }
    },
    {
      id: 'e9', titulo: 'Leer un sensor', nivel: 3, xp: 55, emoji: '📡',
      enunciado: 'Conecta un sensor (ultrasónico, LDR, temperatura o movimiento) con su alimentación correcta y haz que su valor influya en el circuito o se vea en el panel.',
      pistas: ['VCC del sensor al riel rojo, GND al riel azul.',
               'Si usas Arduino, la salida del sensor va a un pin de entrada.',
               'Ejecuta la simulación y mueve el deslizador del sensor en el panel derecho.'],
      comprobar: function () {
        var sensores = CL.state.proj.components.filter(function (c) { var d = CL.catalogo[c.type]; return d && d.sensor; });
        var alim = sensores.some(function (c) {
          var st = CL.circuito.estado(c.id);
          return st && (st.alimentado === true || (c.type === 'ldr' && CL.circuito.conectado(c.id, 'a') && CL.circuito.conectado(c.id, 'b')));
        });
        return [
          { ok: sensores.length >= 1, txt: 'Hay un sensor en el circuito' },
          { ok: alim, txt: 'El sensor está bien alimentado' },
          { ok: CL.runtime.corriendo, txt: 'La simulación está en marcha' }
        ];
      }
    },
    {
      id: 'e10', titulo: 'Arduino que parpadea', nivel: 3, xp: 55, emoji: '🟩',
      enunciado: 'Conecta un LED a un pin digital del Arduino y escribe un programa que lo haga parpadear.',
      pistas: ['Necesitas: pin digital → resistencia → LED → GND.',
               'No olvides unir el GND del Arduino con el riel negativo.',
               'Usa la plantilla “LED que parpadea” del editor si te trabas.'],
      comprobar: function () {
        var codigo = CL.state.proj.code || '';
        var placas = CL.state.proj.components.filter(function (c) { var d = CL.catalogo[c.type]; return d && d.familia === 'arduino'; });
        return [
          { ok: placas.length >= 1, txt: 'Hay una placa Arduino' },
          { ok: CL.validar.resistenciaEnSerieConLed(), txt: 'El LED está con su resistencia' },
          { ok: /digitalWrite/.test(codigo) && /delay/.test(codigo), txt: 'El programa usa digitalWrite() y delay()' },
          { ok: CL.runtime.corriendo && !CL.runtime.errores.length, txt: 'El programa se ejecuta sin errores' }
        ];
      }
    },
    {
      id: 'e11', titulo: 'Controla un servo', nivel: 4, xp: 70, emoji: '🦾',
      enunciado: 'Conecta un servomotor al Arduino y prográmalo para que se mueva entre dos ángulos distintos.',
      pistas: ['El servo tiene tres cables: 5 V, GND y señal.',
               'La señal va a un pin digital (por ejemplo el 9).',
               'Usa la librería Servo: attach() en setup y write(angulo) en loop.'],
      comprobar: function () {
        var codigo = CL.state.proj.code || '';
        return [
          { ok: CL.state.cuenta('servo') >= 1, txt: 'Hay un servomotor' },
          { ok: CL.state.compsPorTipo('servo').some(function (s) {
              return CL.circuito.conectado(s.id, 'v') && CL.circuito.conectado(s.id, 'g') && CL.circuito.conectado(s.id, 's');
            }), txt: 'Los tres cables del servo están conectados' },
          { ok: /attach\s*\(/.test(codigo) && /write\s*\(/.test(codigo), txt: 'El programa usa attach() y write()' },
          { ok: CL.validar.servoEnAngulo(0, 180), txt: 'El servo está alimentado y responde' }
        ];
      }
    },
    {
      id: 'e12', titulo: 'Sistema de alarma', nivel: 5, xp: 100, emoji: '🚨',
      enunciado: 'Construye una alarma completa: un sensor detecta, un LED se enciende, un buzzer suena y el Monitor Serie registra el evento.',
      pistas: ['Arma por partes: primero el LED, luego el sensor y por último el buzzer.',
               'El sensor de movimiento entrega HIGH cuando detecta: léelo con digitalRead().',
               'Usa tone(pin, 880) para el buzzer y noTone(pin) para callarlo.',
               'Serial.begin(9600) en setup() y Serial.println() cuando se dispare la alarma.'],
      comprobar: function () {
        var codigo = CL.state.proj.code || '';
        var sensores = CL.state.proj.components.filter(function (c) { var d = CL.catalogo[c.type]; return d && d.sensor; });
        return [
          { ok: sensores.length >= 1, txt: 'Hay un sensor' },
          { ok: CL.state.cuenta('led') >= 1, txt: 'Hay un LED indicador' },
          { ok: CL.state.cuenta('buzzer') >= 1, txt: 'Hay un buzzer' },
          { ok: /if\s*\(/.test(codigo), txt: 'El programa decide con if' },
          { ok: /Serial\.(print|println)/.test(codigo), txt: 'Registra el evento en el Monitor Serie' },
          { ok: CL.validar.sinErrores(), txt: 'El circuito no tiene errores' }
        ];
      }
    }
  ];

  X.porId = function (id) {
    for (var i = 0; i < X.lista.length; i++) if (X.lista[i].id === id) return X.lista[i];
    return null;
  };

  /* ------------------------------------------------------------
     Interfaz
     ------------------------------------------------------------ */
  X.abrir = function () {
    var prog = CL.proyectos.progreso;
    var d = prog.datos();
    var hechos = X.lista.filter(function (e) { return prog.hecho('ejercicios', e.id); }).length;
    var h = '<div class="score-bar"><div class="sb-xp">' + (d.xp || 0) + '</div>' +
      '<div class="sb-lbl">puntos<br><b>' + prog.nivel().nombre + '</b></div>' +
      '<div class="sb-prog"><i style="width:' + Math.round(hechos / X.lista.length * 100) + '%"></i></div>' +
      '<div class="sb-lbl">' + hechos + ' / ' + X.lista.length + '<br>ejercicios</div></div>';
    h += '<p style="font-size:12.5px;color:var(--text-dim);line-height:1.6;margin-bottom:12px">' +
      'Cada ejercicio se comprueba solo: arma el circuito y pulsa <b>Comprobar</b>. Si te atascas, pide pistas: te las doy de una en una.</p>';
    h += '<div class="gal">';
    X.lista.forEach(function (e) {
      var hecho = prog.hecho('ejercicios', e.id);
      h += '<button class="gcard' + (hecho ? ' done' : '') + '" data-id="' + e.id + '">' +
        '<div class="gc-thumb">' + e.emoji + '</div>' +
        '<div class="gc-body"><b>' + (hecho ? '✅ ' : '') + CL.esc(e.titulo) + '</b>' +
        '<small>' + CL.esc(e.enunciado.slice(0, 90)) + '…</small>' +
        '<div class="gc-foot"><span class="lvl-badge b' + e.nivel + '">' + '⭐'.repeat(e.nivel) + '</span>' +
        '<span class="lvl-badge">+' + e.xp + ' pts</span></div></div></button>';
    });
    h += '</div>';
    CL.dialogo.cajon('🎯 Ejercicios', h, {
      alAbrir: function (cont) {
        CL.$$('.gcard', cont).forEach(function (b) {
          b.addEventListener('click', function () { X.abrirId(b.dataset.id); });
        });
      }
    });
  };

  X.abrirId = function (id) {
    var e = X.porId(id);
    if (!e) return;
    var h = '<div class="detail">';
    h += '<h3>' + e.emoji + ' ' + CL.esc(e.titulo) + ' <span class="stars">' + '⭐'.repeat(e.nivel) + '</span></h3>';
    h += '<p class="obj">' + CL.esc(e.enunciado) + '</p>';
    h += '<div class="actions">' +
      (e.preparar ? '<button class="btn primary" data-a="prep">📥 Cargar el circuito del ejercicio</button>' : '<button class="btn primary" data-a="limpio">🧹 Empezar con la mesa vacía</button>') +
      '<button class="btn ok" data-a="comp">✔ Comprobar</button>' +
      '<button class="btn violet" data-a="pista">💡 Pista</button></div>';
    h += '<ul class="check-list" id="exCheck"></ul>';
    h += '<div class="lesson-nav"><button class="btn ghost" data-a="volver">← Todos los ejercicios</button></div></div>';

    CL.dialogo.cajon(e.titulo, h, {
      alAbrir: function (cont) {
        CL.$$('[data-a]', cont).forEach(function (b) {
          b.addEventListener('click', function () {
            var a = b.dataset.a;
            if (a === 'prep') {
              var datos = e.preparar();
              var proj = CL.proyectoVacio('Ejercicio: ' + e.titulo);
              proj.components = datos.components; proj.wires = datos.wires; proj.code = datos.code || '';
              CL.app.cargarProyecto(proj);
              CL.ajustarVista();
              CL.app.ejecutar();
              activar(e);
              CL.dialogo.cerrarCajon();
            }
            if (a === 'limpio') {
              CL.app.nuevoProyecto('Ejercicio: ' + e.titulo, true);
              activar(e);
              CL.dialogo.cerrarCajon();
            }
            if (a === 'comp') X.comprobar(e, cont.querySelector('#exCheck'));
            if (a === 'pista') { activar(e); CL.asistente.pista(); CL.emit('panel:derecha', 'asis'); }
            if (a === 'volver') X.abrir();
          });
        });
      }
    });
  };

  function activar(e) {
    X.actual = e;
    CL.asistente.contexto({
      titulo: e.titulo, enunciado: e.enunciado, pistas: e.pistas,
      solucion: 'Revisa el ejemplo equivalente en la galería de circuitos y compáralo con tu montaje.'
    });
    CL.mensaje('info', 'Ejercicio: ' + e.titulo, e.enunciado, 'Cuando termines, pulsa 🎯 Ejercicios → Comprobar.');
  }

  X.comprobar = function (e, lista) {
    e = e || X.actual;
    if (!e) { CL.toast('info', 'Elige un ejercicio primero'); return false; }
    CL.circuito.resolver(0.016);
    var res = e.comprobar();
    var todo = res.every(function (r) { return r.ok; });
    if (lista) {
      lista.innerHTML = res.map(function (r) {
        return '<li class="' + (r.ok ? 'ok' : 'no') + '"><span class="ci">' + (r.ok ? '✅' : '⬜') + '</span>' + CL.esc(r.txt) + '</li>';
      }).join('');
    }
    if (todo) {
      var ya = CL.proyectos.progreso.hecho('ejercicios', e.id);
      CL.proyectos.progreso.completar('ejercicios', e.id, e.xp);
      CL.sfx.win();
      CL.dialogo.abrir('¡Ejercicio superado! 🎉',
        '<div class="result"><div class="r-ico">🏆</div>' +
        '<h3>' + CL.esc(e.titulo) + '</h3>' +
        '<p>Construiste correctamente el circuito. ' + (ya ? 'Ya lo tenías completado.' : 'Ganaste <b>' + e.xp + ' puntos</b>.') + '</p>' +
        '<div class="r-score">' + CL.proyectos.progreso.datos().xp + ' pts</div>' +
        '<p>' + CL.proyectos.progreso.nivel().estrellas + ' Nivel ' + CL.proyectos.progreso.nivel().nombre + '</p></div>',
        [{ etq: 'Seguir practicando', clase: 'primary', fn: function () { X.abrir(); } }]);
    } else {
      var faltan = res.filter(function (r) { return !r.ok; });
      CL.toast('warn', 'Aún no está completo', 'Falta: ' + faltan[0].txt);
      CL.sfx.bad();
      CL.asistente.decir('🔎 Revisión del ejercicio',
        'Te falta: <b>' + CL.esc(faltan[0].txt) + '</b>' + (faltan.length > 1 ? ' (y ' + (faltan.length - 1) + ' cosa(s) más)' : '') + '.',
        [{ etq: '💡 Dame una pista', fn: function () { CL.asistente.pista(); } },
         { etq: '🔍 Analizar circuito', fn: function () { CL.app.analizar(); } }]);
      CL.emit('panel:derecha', 'asis');
    }
    return todo;
  };

}(window.CL));
