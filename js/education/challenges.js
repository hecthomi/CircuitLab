/* ============================================================
   CircuitLab — modo desafío (retos contrarreloj)
   ============================================================ */
(function (CL) {
  'use strict';

  var R = {};
  CL.retos = R;

  R.lista = [
    { id: 'r1', titulo: 'Luz en 3 minutos', emoji: '💡', tiempo: 180, xp: 40, nivel: 1,
      enunciado: 'Construye un circuito que encienda un LED con su resistencia antes de que acabe el tiempo.',
      ejercicio: 'e1' },
    { id: 'r2', titulo: 'Al pulsar, se enciende', emoji: '🔘', tiempo: 240, xp: 55, nivel: 2,
      enunciado: 'Tienes 4 minutos para construir un circuito que encienda el LED cuando se presione el botón.',
      ejercicio: 'e5' },
    { id: 'r3', titulo: 'Caza el cortocircuito', emoji: '⚡', tiempo: 120, xp: 45, nivel: 2,
      enunciado: 'Hay un cortocircuito escondido. Encuéntralo y arréglalo en 2 minutos.',
      ejercicio: 'e3' },
    { id: 'r4', titulo: 'LED al revés', emoji: '🔄', tiempo: 90, xp: 35, nivel: 2,
      enunciado: 'El LED está invertido. Corrígelo en 90 segundos.',
      ejercicio: 'e4' },
    { id: 'r5', titulo: 'Semáforo exprés', emoji: '🚦', tiempo: 360, xp: 80, nivel: 3,
      enunciado: 'Seis minutos para montar un semáforo de tres luces con sus resistencias.',
      ejercicio: 'e7' },
    { id: 'r6', titulo: 'Doble luz', emoji: '🔆', tiempo: 210, xp: 50, nivel: 2,
      enunciado: 'Enciende dos LEDs de colores distintos, cada uno con su resistencia, en 3 minutos y medio.',
      ejercicio: 'e6' },
    { id: 'r7', titulo: 'Sensor en marcha', emoji: '📡', tiempo: 300, xp: 70, nivel: 3,
      enunciado: 'Conecta y alimenta correctamente un sensor en 5 minutos.',
      ejercicio: 'e9' },
    { id: 'r8', titulo: 'Alarma contrarreloj', emoji: '🚨', tiempo: 600, xp: 120, nivel: 5,
      enunciado: 'Diez minutos para construir la alarma completa: sensor, LED, buzzer y mensajes en el Monitor Serie.',
      ejercicio: 'e12' }
  ];

  R.porId = function (id) {
    for (var i = 0; i < R.lista.length; i++) if (R.lista[i].id === id) return R.lista[i];
    return null;
  };

  /* ------------------------------------------------------------
     Estado del reto en curso
     ------------------------------------------------------------ */
  var activo = null, restante = 0, intentos = 0, errores = 0, tid = null, hud;

  R.abrir = function () {
    var prog = CL.proyectos.progreso;
    var h = '<p style="font-size:12.5px;color:var(--text-dim);line-height:1.6;margin-bottom:12px">' +
      'Los retos son ejercicios contrarreloj. Se puntúa el tiempo que te sobra y los intentos que necesitaste.</p><div class="gal">';
    R.lista.forEach(function (r) {
      var d = prog.datos().retos[r.id];
      h += '<button class="gcard' + (d && d.hecho ? ' done' : '') + '" data-id="' + r.id + '">' +
        '<div class="gc-thumb">' + r.emoji + '</div>' +
        '<div class="gc-body"><b>' + (d && d.hecho ? '✅ ' : '') + CL.esc(r.titulo) + '</b>' +
        '<small>' + CL.esc(r.enunciado) + '</small>' +
        '<div class="gc-foot"><span class="lvl-badge b' + r.nivel + '">' + '⭐'.repeat(r.nivel) + '</span>' +
        '<span class="lvl-badge">⏱ ' + CL.mmss(r.tiempo) + '</span>' +
        (d && d.puntos ? '<span class="lvl-badge b1">' + d.puntos + ' pts</span>' : '') +
        '</div></div></button>';
    });
    h += '</div>';
    CL.dialogo.cajon('⏱️ Modo desafío', h, {
      alAbrir: function (cont) {
        CL.$$('.gcard', cont).forEach(function (b) {
          b.addEventListener('click', function () { R.confirmar(b.dataset.id); });
        });
      }
    });
  };

  R.confirmar = function (id) {
    var r = R.porId(id);
    if (!r) return;
    CL.dialogo.abrir('⏱️ ' + r.titulo,
      '<p>' + CL.esc(r.enunciado) + '</p>' +
      '<p><b>Tiempo:</b> ' + CL.mmss(r.tiempo) + '<br><b>Puntos:</b> hasta ' + r.xp + '</p>' +
      '<div class="callout warn"><div>⚠️</div><div>Se vaciará el área de trabajo. Guarda tu proyecto antes si quieres conservarlo.</div></div>',
      [{ etq: 'Cancelar', clase: 'ghost' },
       { etq: '¡Empezar!', clase: 'primary', fn: function () { R.iniciar(id); } }]);
  };

  R.iniciar = function (id) {
    var r = R.porId(id);
    if (!r) return;
    activo = r; restante = r.tiempo; intentos = 0; errores = 0;
    CL.dialogo.cerrarCajon();

    var ej = CL.ejercicios.porId(r.ejercicio);
    if (ej && ej.preparar) {
      var datos = ej.preparar();
      var proj = CL.proyectoVacio('Reto: ' + r.titulo);
      proj.components = datos.components; proj.wires = datos.wires; proj.code = datos.code || '';
      CL.app.cargarProyecto(proj);
      CL.ajustarVista();
      CL.app.ejecutar();
    } else {
      CL.app.nuevoProyecto('Reto: ' + r.titulo, true);
    }
    CL.ejercicios.actual = ej;
    if (ej) {
      CL.asistente.contexto({ titulo: r.titulo, enunciado: r.enunciado, pistas: ej.pistas });
    }

    hud = document.getElementById('challengeHud');
    hud.hidden = false;
    hud.classList.remove('urgent');
    document.getElementById('chTitle').textContent = r.titulo;
    document.getElementById('chDesc').textContent = r.enunciado.slice(0, 70) + (r.enunciado.length > 70 ? '…' : '');
    actualizarHud();

    clearInterval(tid);
    tid = setInterval(tick, 1000);
    CL.sfx.pop();
    CL.mensaje('info', 'Reto iniciado: ' + r.titulo, r.enunciado, 'Pulsa “Comprobar” en la barra del cronómetro cuando creas que ya está.');
  };

  function tick() {
    restante--;
    if (restante <= 20) hud.classList.add('urgent');
    if (restante <= 0) { R.terminar(false, 'Se acabó el tiempo'); return; }
    actualizarHud();
  }

  function actualizarHud() {
    document.getElementById('chTime').textContent = CL.mmss(restante);
    document.getElementById('chComp').textContent = CL.state.proj.components.length;
    document.getElementById('chErr').textContent = errores;
    document.getElementById('chTry').textContent = intentos;
  }

  R.comprobar = function () {
    if (CL.profesor && CL.profesor.hayActividad()) { CL.profesor.entregar(); return; }
    if (!activo) return;
    intentos++;
    var ej = CL.ejercicios.porId(activo.ejercicio);
    CL.circuito.resolver(0.016);
    var res = ej ? ej.comprobar() : [];
    var todo = res.length && res.every(function (x) { return x.ok; });
    var a = CL.validar.analizar();
    errores = a.items.filter(function (x) { return x.nivel === 'err' || x.nivel === 'warn'; }).length;
    actualizarHud();
    if (todo) { R.terminar(true); return; }
    var faltan = res.filter(function (x) { return !x.ok; });
    CL.toast('warn', 'Todavía no', faltan.length ? faltan[0].txt : 'Revisa el circuito');
    CL.sfx.bad();
    CL.asistente.decir('⏱️ Intento ' + intentos,
      'Aún falta: <b>' + CL.esc(faltan.length ? faltan[0].txt : 'revisar el montaje') + '</b>',
      [{ etq: '💡 Pista', fn: function () { CL.asistente.pista(); } }]);
  };

  R.terminar = function (exito, motivo) {
    clearInterval(tid);
    tid = null;
    var r = activo;
    activo = null;
    if (hud) hud.hidden = true;
    if (!r) return;

    var usado = r.tiempo - restante;
    var factorTiempo = CL.clamp(restante / r.tiempo, 0, 1);
    var puntos = exito ? Math.max(10, Math.round(r.xp * (0.55 + 0.45 * factorTiempo) - (intentos - 1) * 3)) : 0;

    if (exito) {
      CL.proyectos.progreso.completar('retos', r.id, puntos, { tiempo: usado, intentos: intentos });
      CL.sfx.win();
    } else {
      CL.sfx.bad();
    }

    var html = '<div class="result">' +
      '<div class="r-ico">' + (exito ? '🏆' : '⏰') + '</div>' +
      '<h3>' + (exito ? '¡Excelente! Construiste correctamente el circuito.' : 'Casi lo logras') + '</h3>' +
      '<p>' + (exito
        ? 'Terminaste el reto <b>' + CL.esc(r.titulo) + '</b> en ' + CL.mmss(usado) + '.'
        : CL.esc(motivo || 'No se completó el reto') + '. ' + consejoFinal()) + '</p>' +
      (exito ? '<div class="r-score">+' + puntos + ' pts</div>' : '') +
      '<div class="r-stats">' +
      '<div><b>' + CL.mmss(usado) + '</b><small>tiempo usado</small></div>' +
      '<div><b>' + CL.state.proj.components.length + '</b><small>componentes</small></div>' +
      '<div><b>' + intentos + '</b><small>intentos</small></div>' +
      '<div><b>' + errores + '</b><small>errores</small></div>' +
      '</div></div>';

    CL.dialogo.abrir(exito ? 'Reto superado' : 'Reto terminado', html, [
      { etq: 'Ver otros retos', clase: 'ghost', fn: function () { R.abrir(); } },
      { etq: exito ? 'Genial' : 'Intentar de nuevo', clase: 'primary', fn: function () { if (!exito) R.iniciar(r.id); } }
    ]);
  };

  function consejoFinal() {
    var a = CL.validar.analizar();
    var d = a.items.filter(function (x) { return x.nivel === 'err' || x.nivel === 'warn'; })[0];
    return d ? 'Revisa esto: ' + d.titulo.toLowerCase() + '.' : 'Sigue practicando con los ejercicios guiados.';
  }

  R.activo = function () { return !!activo; };

  /* ---- botones del cronómetro ---- */
  R.init = function () {
    document.getElementById('chCheck').addEventListener('click', function () { R.comprobar(); });
    document.getElementById('chQuit').addEventListener('click', function () {
      if (CL.profesor && CL.profesor.hayActividad()) {
        CL.dialogo.confirmar('Salir de la actividad', '¿Salir sin entregar? No se registrará ninguna nota.', function () {
          clearInterval(tid);
          document.getElementById('challengeHud').hidden = true;
          document.getElementById('chCheck').textContent = 'Comprobar';
          CL.restriccion = null;
          CL.paneles.pintarPaleta();
          CL.profesor.cancelar();
        }, 'Salir');
        return;
      }
      CL.dialogo.confirmar('Salir del reto', '¿Seguro que quieres abandonar el reto en curso?', function () {
        R.terminar(false, 'Abandonaste el reto');
      }, 'Salir');
    });
  };

}(window.CL));
