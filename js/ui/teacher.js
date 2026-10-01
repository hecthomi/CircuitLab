/* ============================================================
   CircuitLab — modo profesor
   Crear actividades, limitar componentes, fijar tiempo e intentos,
   guardar un circuito de referencia y consultar resultados.
   Con la intranet disponible, las actividades viven en la carpeta
   de CircuitLab del SERVIDOR (no se pierden al borrar el historial)
   y el docente decide cuáles ven los estudiantes (👁 / 🙈).
   Sin servidor (USB, file://) todo queda en este computador.
   ============================================================ */
(function (CL) {
  'use strict';

  var T = {};
  CL.profesor = T;

  var actividades = [], resultados = [], cargado = false;
  var pestana = 'lista';

  /* ------------------------------------------------------------
     Persistencia
     ------------------------------------------------------------ */
  /** 'docente' | 'estudiante' | 'local' (mismo criterio que Guardar/Abrir). */
  function modo() { return CL.proyectos.modo(); }

  function cargar() {
    return Promise.all([
      CL.proyectos.leerDato('actividades', []),
      CL.proyectos.leerDato('resultados', []),
      modo() === 'local' ? Promise.resolve(null) : CL.cuenta.api('act_listar')
    ]).then(function (r) {
      var locales = r[0] || [];
      resultados = r[1] || [];
      var serv = r[2];
      if (!serv || !serv.ok) {
        actividades = locales;
      } else {
        actividades = serv.actividades || [];
        // Docente: las que solo estaban en este navegador suben a la carpeta
        // (ocultas), así dejan de depender del historial.
        if (serv.docente) {
          var hay = {};
          actividades.forEach(function (a) { hay[a.id] = true; });
          locales.forEach(function (a) {
            if (!a || !a.id || hay[a.id]) return;
            a.visible = false;
            actividades.push(a);
            CL.cuenta.api('act_guardar', { actividad: a });
          });
        }
      }
      cargado = true;
    });
  }
  /** Copia local (respaldo sin servidor). En la carpeta se escribe por actividad. */
  function guardarActividades() {
    if (modo() === 'estudiante') return Promise.resolve(true);
    return CL.proyectos.escribirDato('actividades', actividades);
  }
  /** Guarda una actividad en la carpeta del servidor (docente) y en local. */
  function guardarUna(a) {
    var local = guardarActividades();
    if (modo() !== 'docente') return local;
    return CL.cuenta.api('act_guardar', { actividad: a }).then(function (j) {
      if (!j || !j.ok) CL.toast('warn', 'Quedó solo en este computador', (j && j.error) || 'Sin respuesta del servidor.');
      else a.visible = !!j.actividad.visible;
      return local;
    });
  }
  function guardarResultados() { return CL.proyectos.escribirDato('resultados', resultados); }

  T.actividades = function () { return actividades; };

  /* ------------------------------------------------------------
     Objetivos medidos sobre el circuito de referencia
     ------------------------------------------------------------ */
  function medirObjetivos() {
    CL.circuito.marcarSucio();
    CL.circuito.resolver(0.016);
    var tipos = {};
    CL.state.proj.components.forEach(function (c) { tipos[c.type] = (tipos[c.type] || 0) + 1; });
    return {
      tipos: tipos,
      ledsEncendidos: CL.validar.cuantosLedsEncendidos(),
      motorGirando: CL.validar.motorGirando(),
      buzzer: CL.validar.buzzerSonando(),
      sinErrores: CL.validar.sinErrores(),
      usaCodigo: !!(CL.state.proj.code || '').trim()
    };
  }

  function evaluar(act) {
    CL.circuito.marcarSucio();
    CL.circuito.resolver(0.016);
    var o = act.objetivos || {};
    var items = [];
    Object.keys(o.tipos || {}).forEach(function (t) {
      if (t === 'protoboard') return;
      var def = CL.catalogo[t];
      items.push({
        ok: CL.state.cuenta(t) >= o.tipos[t],
        txt: 'Usar ' + o.tipos[t] + ' × ' + (def ? def.nombre : t)
      });
    });
    if (o.ledsEncendidos) items.push({ ok: CL.validar.cuantosLedsEncendidos() >= o.ledsEncendidos, txt: 'Encender ' + o.ledsEncendidos + ' LED(s)' });
    if (o.motorGirando) items.push({ ok: CL.validar.motorGirando(), txt: 'Hacer girar el motor' });
    if (o.buzzer) items.push({ ok: CL.validar.buzzerSonando(), txt: 'Hacer sonar el buzzer' });
    if (o.usaCodigo) items.push({ ok: !!(CL.state.proj.code || '').trim(), txt: 'Escribir un programa' });
    if (o.sinErrores) items.push({ ok: CL.validar.sinErrores(), txt: 'Circuito sin errores eléctricos' });
    if (!items.length) items.push({ ok: CL.validar.sinErrores(), txt: 'Circuito sin errores eléctricos' });
    var logrados = items.filter(function (i) { return i.ok; }).length;
    return { items: items, nota: Math.round(logrados / items.length * 100), completo: logrados === items.length };
  }

  /* ------------------------------------------------------------
     Interfaz
     ------------------------------------------------------------ */
  T.abrir = function () {
    // se relee siempre: el docente puede haber publicado algo desde el PC-A
    cargar().then(function () { pintar(); });
  };

  function pintar() {
    // el estudiante (con intranet) solo ve las actividades publicadas y sus ajustes
    var tabs = modo() === 'estudiante'
      ? ['lista:Actividades', 'ajustes:Ajustes']
      : ['lista:Actividades', 'crear:Crear', 'result:Resultados', 'ajustes:Ajustes'];
    if (tabs.map(function (t) { return t.split(':')[0]; }).indexOf(pestana) < 0) pestana = 'lista';
    var h = '<div class="tp-tabs">' +
      tabs.map(function (t) {
        var p = t.split(':');
        return '<button data-tab="' + p[0] + '"' + (pestana === p[0] ? ' class="active"' : '') + '>' + p[1] + '</button>';
      }).join('') + '</div><div id="tpCuerpo"></div>';
    CL.dialogo.cajon('👨‍🏫 Modo profesor', h, {
      ancho: true,
      alAbrir: function (cont) {
        CL.$$('.tp-tabs button', cont).forEach(function (b) {
          b.addEventListener('click', function () { pestana = b.dataset.tab; pintar(); });
        });
        var cuerpo = cont.querySelector('#tpCuerpo');
        if (pestana === 'lista') vistaLista(cuerpo);
        if (pestana === 'crear') vistaCrear(cuerpo);
        if (pestana === 'result') vistaResultados(cuerpo);
        if (pestana === 'ajustes') vistaAjustes(cuerpo);
      }
    });
  }

  /* ---- Actividades ---- */
  function vistaLista(cont) {
    var m = modo();
    if (!actividades.length) {
      cont.innerHTML = m === 'estudiante'
        ? '<div class="empty-note">El docente todavía no ha publicado actividades.</div>'
        : '<div class="empty-note">Todavía no hay actividades.<br>Usa la pestaña <b>Crear</b> para preparar la primera.</div>';
      return;
    }
    var h = m === 'docente'
      ? '<p style="font-size:12px;color:var(--text-mute);margin:0 0 10px">Guardadas en la carpeta de CircuitLab del servidor. ' +
        'Con <b>👁 / 🙈</b> decides cuáles ven los estudiantes.</p>'
      : '';
    h += '<div class="proj-list">';
    actividades.forEach(function (a) {
      var hechos = resultados.filter(function (r) { return r.actividad === a.id; }).length;
      h += '<div class="proj-item"><div class="pi-i">📋</div><div class="pi-t"><b>' + CL.esc(a.titulo) + '</b>' +
        '<small>' + (a.tiempo ? '⏱ ' + CL.mmss(a.tiempo) + ' · ' : '') +
        (a.intentos ? '🔁 ' + a.intentos + ' intentos · ' : '') +
        (a.permitidos && a.permitidos.length ? a.permitidos.length + ' componentes · ' : 'todos los componentes · ') +
        hechos + ' entrega(s)</small></div>' +
        '<div class="pi-a">' +
        (m === 'docente'
          ? '<button class="pi-vis' + (a.visible ? ' on' : '') + '" data-a="vis" data-id="' + a.id + '" ' +
            'title="' + (a.visible ? 'Los estudiantes la ven. Clic para ocultarla.' : 'Los estudiantes no la ven. Clic para mostrársela.') + '">' +
            (a.visible ? '👁 Visible' : '🙈 Oculta') + '</button>'
          : '') +
        '<button data-a="jugar" data-id="' + a.id + '" title="Empezar la actividad">▶</button>' +
        (m === 'estudiante' ? '' :
          '<button data-a="ver" data-id="' + a.id + '" title="Ver el circuito de referencia">🔍</button>' +
          '<button data-a="exp" data-id="' + a.id + '" title="Exportar">⬇</button>' +
          '<button data-a="del" data-id="' + a.id + '" title="Eliminar">🗑</button>') +
        '</div></div>';
    });
    h += '</div>';
    cont.innerHTML = h;
    CL.$$('[data-a]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var a = actividades.filter(function (x) { return x.id === b.dataset.id; })[0];
        if (!a) return;
        if (b.dataset.a === 'jugar') T.iniciarActividad(a.id);
        if (b.dataset.a === 'vis') {
          b.disabled = true;
          CL.cuenta.api('act_visible', { id: a.id, visible: !a.visible }).then(function (j) {
            if (!j || !j.ok) { b.disabled = false; CL.toast('err', 'No se pudo cambiar', (j && j.error) || ''); return; }
            a.visible = !!j.actividad.visible;
            guardarActividades();
            CL.toast('ok', a.visible ? 'Visible para los estudiantes' : 'Oculta para los estudiantes', a.titulo);
            pintar();
          });
        }
        if (b.dataset.a === 'ver') {
          var proj = CL.proyectoVacio('Referencia: ' + a.titulo);
          proj.components = CL.clone(a.circuito.components);
          proj.wires = CL.clone(a.circuito.wires);
          proj.code = a.circuito.code || '';
          CL.app.cargarProyecto(proj);
          CL.ajustarVista();
          CL.dialogo.cerrarCajon();
        }
        if (b.dataset.a === 'exp') {
          CL.download('actividad_' + a.titulo.replace(/\s+/g, '_') + '.json', JSON.stringify(a, null, 2));
        }
        if (b.dataset.a === 'del') {
          CL.dialogo.confirmar('Eliminar actividad', '¿Eliminar “' + a.titulo + '”? También se borran sus resultados.', function () {
            actividades = actividades.filter(function (x) { return x.id !== a.id; });
            resultados = resultados.filter(function (x) { return x.actividad !== a.id; });
            guardarActividades(); guardarResultados();
            if (modo() === 'docente') CL.cuenta.api('act_borrar', { id: a.id });
            pintar();
          }, 'Eliminar');
        }
      });
    });
  }

  /* ---- Crear ---- */
  function vistaCrear(cont) {
    var tipos = Object.keys(CL.catalogo);
    var h = '<p style="font-size:12.5px;color:var(--text-dim);line-height:1.6">' +
      'Arma primero el <b>circuito de referencia</b> en el área de trabajo. Al guardar la actividad se toma ese montaje ' +
      'como solución y se miden sus objetivos (LEDs encendidos, motor girando, etc.).</p>';
    h += '<div class="form-row"><label>Título de la actividad</label><input type="text" id="acTitulo" placeholder="Ej.: Circuito de un LED con resistencia"></div>';
    h += '<div class="form-row"><label>Instrucciones para el estudiante</label><textarea id="acInstr" placeholder="Describe qué debe construir…"></textarea></div>';
    h += '<div class="form-row" style="display:flex;gap:10px">' +
      '<div style="flex:1"><label>Tiempo máximo (minutos, 0 = sin límite)</label><input type="number" id="acTiempo" value="0" min="0" max="120"></div>' +
      '<div style="flex:1"><label>Intentos permitidos (0 = ilimitados)</label><input type="number" id="acIntentos" value="0" min="0" max="20"></div></div>';
    h += '<div class="form-row"><label>Componentes permitidos <small style="color:var(--text-mute)">(ninguno marcado = todos)</small></label>' +
      '<div class="chk-grid">' + tipos.map(function (t) {
        return '<label><input type="checkbox" value="' + t + '"> ' + CL.esc(CL.catalogo[t].nombre) + '</label>';
      }).join('') + '</div></div>';
    h += '<div class="form-row"><label><input type="checkbox" id="acAyuda" checked> Permitir pistas del asistente</label></div>';
    h += '<div class="btn-row"><button class="btn primary" id="acGuardar">💾 Guardar actividad</button>' +
      '<button class="btn" id="acImportar">📥 Importar actividad</button></div>';
    cont.innerHTML = h;

    cont.querySelector('#acGuardar').addEventListener('click', function () {
      var titulo = cont.querySelector('#acTitulo').value.trim();
      if (!titulo) { CL.toast('warn', 'Falta el título'); return; }
      if (!CL.state.proj.components.length) { CL.toast('warn', 'Arma primero el circuito de referencia'); return; }
      var permitidos = CL.$$('.chk-grid input:checked', cont).map(function (i) { return i.value; });
      var act = {
        id: CL.uid('act'),
        titulo: titulo,
        instrucciones: cont.querySelector('#acInstr').value.trim(),
        tiempo: Math.round((+cont.querySelector('#acTiempo').value || 0) * 60),
        intentos: +cont.querySelector('#acIntentos').value || 0,
        permitidos: permitidos,
        ayuda: cont.querySelector('#acAyuda').checked,
        circuito: {
          components: CL.clone(CL.state.proj.components),
          wires: CL.clone(CL.state.proj.wires),
          code: CL.state.proj.code || ''
        },
        objetivos: medirObjetivos(),
        creada: Date.now()
      };
      act.visible = false;
      actividades.push(act);
      guardarUna(act).then(function () {
        CL.toast('ok', 'Actividad guardada', titulo + (modo() === 'docente' ? ' · oculta para los estudiantes hasta que la muestres' : ''));
        pestana = 'lista';
        pintar();
      });
    });

    cont.querySelector('#acImportar').addEventListener('click', function () {
      var inp = CL.el('input', { type: 'file', accept: '.json' });
      inp.addEventListener('change', function () {
        var f = inp.files[0];
        if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          try {
            var a = JSON.parse(fr.result);
            a.id = CL.uid('act');
            a.visible = false;
            actividades.push(a);
            guardarUna(a).then(function () { CL.toast('ok', 'Actividad importada', a.titulo); pestana = 'lista'; pintar(); });
          } catch (e) { CL.toast('err', 'Archivo no válido'); }
        };
        fr.readAsText(f);
      });
      inp.click();
    });
  }

  /* ---- Resultados ---- */
  function vistaResultados(cont) {
    if (!resultados.length) {
      cont.innerHTML = '<div class="empty-note">Aún no hay entregas registradas.</div>';
      return;
    }
    var h = '<div class="btn-row" style="margin-bottom:10px">' +
      '<button class="btn small" id="resExp">⬇ Exportar CSV</button>' +
      '<button class="btn small danger" id="resDel">🗑 Borrar todo</button></div>';
    h += '<table class="tbl"><thead><tr><th>Estudiante</th><th>Actividad</th><th>Nota</th><th>Intentos</th><th>Tiempo</th><th>Fecha</th></tr></thead><tbody>';
    resultados.slice().reverse().forEach(function (r) {
      var a = actividades.filter(function (x) { return x.id === r.actividad; })[0];
      h += '<tr><td>' + CL.esc(r.estudiante || '—') + '</td>' +
        '<td>' + CL.esc(a ? a.titulo : '(actividad borrada)') + '</td>' +
        '<td><span class="pill ' + (r.nota >= 60 ? 'ok' : 'no') + '">' + r.nota + '%</span></td>' +
        '<td>' + r.intentos + '</td><td>' + CL.mmss(r.tiempo || 0) + '</td>' +
        '<td>' + CL.fecha(r.fecha) + '</td></tr>';
    });
    h += '</tbody></table>';
    cont.innerHTML = h;
    cont.querySelector('#resExp').addEventListener('click', function () {
      var csv = 'Estudiante;Actividad;Nota;Intentos;Tiempo(s);Fecha\n' + resultados.map(function (r) {
        var a = actividades.filter(function (x) { return x.id === r.actividad; })[0];
        return [r.estudiante || '', a ? a.titulo : '', r.nota, r.intentos, r.tiempo || 0, CL.fecha(r.fecha)].join(';');
      }).join('\n');
      CL.download('resultados_circuitlab.csv', csv, 'text/csv;charset=utf-8');
    });
    cont.querySelector('#resDel').addEventListener('click', function () {
      CL.dialogo.confirmar('Borrar resultados', '¿Eliminar todas las entregas registradas?', function () {
        resultados = [];
        guardarResultados();
        pintar();
      }, 'Borrar');
    });
  }

  /* ---- Ajustes ---- */
  function vistaAjustes(cont) {
    var prog = CL.proyectos.progreso.datos();
    var h = '<div class="form-row"><label>Nombre del estudiante (se guarda con las entregas)</label>' +
      '<input type="text" id="cfNombre" value="' + CL.esc(prog.nombre || '') + '" placeholder="Nombre y apellido"></div>';
    h += '<div class="form-row"><label><input type="checkbox" id="cfBloqueo"' + (CL.pref('bloquearNiveles', false) ? ' checked' : '') + '> Exigir completar cada nivel del curso antes del siguiente</label></div>';
    h += '<div class="form-row"><label><input type="checkbox" id="cfSonido"' + (CL.pref('sonido', true) ? ' checked' : '') + '> Sonidos de la aplicación y de los componentes</label></div>';
    h += '<div class="form-row"><label>Volumen <b id="cfVolTxt">' + Math.round(CL.audio.volumen() * 100) + ' %</b></label>' +
      '<input type="range" id="cfVol" min="0" max="100" step="5" value="' + Math.round(CL.audio.volumen() * 100) + '"></div>';
    h += '<div class="form-row"><label><input type="checkbox" id="cfNodo"' + (CL.pref('resaltarNodo', true) ? ' checked' : '') + '> Resaltar los puntos conectados al pasar el mouse</label></div>';
    h += '<div class="form-row"><label><input type="checkbox" id="cfQuemar"' + (CL.pref('quemar', true) ? ' checked' : '') + '> Los componentes se queman si les pasa demasiada corriente</label></div>';
    h += '<div class="form-row"><label><input type="checkbox" id="cfAhorro"' + (CL.pref('bajoConsumo', true) ? ' checked' : '') + '> Ahorrar batería cuando no pasa nada en el circuito</label></div>';
    h += '<div class="btn-row"><button class="btn" id="cfGuardar">Guardar ajustes</button>' +
      '<button class="btn danger" id="cfReset">Reiniciar el progreso del estudiante</button></div>';
    h += '<div class="sec"><h4>Progreso actual</h4>' +
      '<div class="kv"><span>Puntos</span><span>' + (prog.xp || 0) + '</span></div>' +
      '<div class="kv"><span>Nivel</span><span>' + CL.proyectos.progreso.nivel().nombre + '</span></div>' +
      '<div class="kv"><span>Lecciones completadas</span><span>' + Object.keys(prog.lecciones || {}).length + '</span></div>' +
      '<div class="kv"><span>Ejercicios completados</span><span>' + Object.keys(prog.ejercicios || {}).length + '</span></div>' +
      '<div class="kv"><span>Retos superados</span><span>' + Object.keys(prog.retos || {}).length + '</span></div></div>';
    cont.innerHTML = h;
    var vol = cont.querySelector('#cfVol');
    if (vol) vol.addEventListener('input', function () {
      cont.querySelector('#cfVolTxt').textContent = vol.value + ' %';
      CL.audio.volumen(vol.value / 100);
      CL.sfx.pop();
    });
    cont.querySelector('#cfGuardar').addEventListener('click', function () {
      var p = CL.proyectos.progreso.datos();
      p.nombre = cont.querySelector('#cfNombre').value.trim();
      CL.proyectos.progreso.guardar();
      CL.setPref('bloquearNiveles', cont.querySelector('#cfBloqueo').checked);
      CL.setPref('sonido', cont.querySelector('#cfSonido').checked);
      if (!cont.querySelector('#cfSonido').checked) CL.audio.silenciarTodo();
      CL.setPref('resaltarNodo', cont.querySelector('#cfNodo').checked);
      CL.setPref('quemar', cont.querySelector('#cfQuemar').checked);
      CL.setPref('bajoConsumo', cont.querySelector('#cfAhorro').checked);
      CL.toast('ok', 'Ajustes guardados');
    });
    cont.querySelector('#cfReset').addEventListener('click', function () {
      CL.dialogo.confirmar('Reiniciar progreso', 'Se borrarán los puntos, niveles y ejercicios completados de este computador.', function () {
        CL.proyectos.progreso.reiniciar();
        pintar();
        CL.toast('ok', 'Progreso reiniciado');
      }, 'Reiniciar');
    });
  }

  /* ------------------------------------------------------------
     Realizar una actividad (lado del estudiante)
     ------------------------------------------------------------ */
  var enCurso = null, intentosHechos = 0, t0 = 0, tid = null, restante = 0;

  T.iniciarActividad = function (id) {
    var a = actividades.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    enCurso = a; intentosHechos = 0; t0 = Date.now();
    CL.app.nuevoProyecto('Actividad: ' + a.titulo, true);
    CL.dialogo.cerrarCajon();

    CL.restriccion = (a.permitidos && a.permitidos.length) ? a.permitidos.slice() : null;
    CL.paneles.pintarPaleta();

    CL.mensaje('info', 'Actividad: ' + a.titulo, a.instrucciones || 'Construye el circuito solicitado.',
      (a.intentos ? 'Tienes ' + a.intentos + ' intento(s). ' : '') + 'Pulsa “Entregar” cuando termines.');

    if (a.ayuda) {
      CL.asistente.contexto({
        titulo: a.titulo,
        enunciado: a.instrucciones || '',
        pistas: ['Revisa qué componentes te permitió el docente: están en el panel izquierdo.',
                 'Empieza por la alimentación y sigue el recorrido de la corriente.',
                 'Usa 🔍 Analizar para que el simulador revise tu montaje.']
      });
    }

    var hud = document.getElementById('challengeHud');
    hud.hidden = false;
    document.getElementById('chTitle').textContent = a.titulo;
    document.getElementById('chDesc').textContent = (a.instrucciones || '').slice(0, 70);
    document.getElementById('chCheck').textContent = 'Entregar';
    restante = a.tiempo || 0;
    document.getElementById('chTime').textContent = a.tiempo ? CL.mmss(restante) : '∞';
    clearInterval(tid);
    if (a.tiempo) {
      tid = setInterval(function () {
        restante--;
        document.getElementById('chTime').textContent = CL.mmss(Math.max(0, restante));
        if (restante <= 0) { clearInterval(tid); T.entregar(true); }
      }, 1000);
    }
    T.enCurso = true;
  };

  T.entregar = function (porTiempo) {
    if (!enCurso) return false;
    var a = enCurso;
    intentosHechos++;
    var ev = evaluar(a);
    var tiempo = Math.round((Date.now() - t0) / 1000);
    var ultima = porTiempo || (a.intentos && intentosHechos >= a.intentos) || ev.completo;

    document.getElementById('chTry').textContent = intentosHechos;

    if (!ultima) {
      CL.toast('warn', 'Aún falta algo', ev.items.filter(function (i) { return !i.ok; })[0].txt);
      CL.dialogo.abrir('Revisión de la entrega',
        '<ul class="check-list">' + ev.items.map(function (i) {
          return '<li class="' + (i.ok ? 'ok' : 'no') + '"><span class="ci">' + (i.ok ? '✅' : '⬜') + '</span>' + CL.esc(i.txt) + '</li>';
        }).join('') + '</ul><p>Puedes seguir corrigiendo y volver a entregar.</p>',
        [{ etq: 'Seguir trabajando', clase: 'primary' }]);
      return false;
    }

    var nombre = CL.proyectos.progreso.datos().nombre || '';
    var registrar = function (nom) {
      resultados.push({
        actividad: a.id, estudiante: nom, nota: ev.nota, intentos: intentosHechos,
        tiempo: tiempo, fecha: Date.now(),
        circuito: { components: CL.clone(CL.state.proj.components), wires: CL.clone(CL.state.proj.wires), code: CL.state.proj.code }
      });
      guardarResultados();
      clearInterval(tid);
      document.getElementById('challengeHud').hidden = true;
      document.getElementById('chCheck').textContent = 'Comprobar';
      CL.restriccion = null;
      CL.paneles.pintarPaleta();
      enCurso = null;
      T.enCurso = false;
      if (ev.completo) CL.sfx.win(); else CL.sfx.bad();
      CL.dialogo.abrir('Entrega registrada',
        '<div class="result"><div class="r-ico">' + (ev.completo ? '🏆' : '📋') + '</div>' +
        '<h3>' + (ev.completo ? '¡Actividad completada!' : 'Actividad entregada') + '</h3>' +
        '<div class="r-score">' + ev.nota + '%</div>' +
        '<div class="r-stats"><div><b>' + intentosHechos + '</b><small>intentos</small></div>' +
        '<div><b>' + CL.mmss(tiempo) + '</b><small>tiempo</small></div></div>' +
        '<ul class="check-list" style="text-align:left">' + ev.items.map(function (i) {
          return '<li class="' + (i.ok ? 'ok' : 'no') + '"><span class="ci">' + (i.ok ? '✅' : '❌') + '</span>' + CL.esc(i.txt) + '</li>';
        }).join('') + '</ul></div>',
        [{ etq: 'Cerrar', clase: 'primary' }]);
    };

    if (!nombre) {
      CL.dialogo.pedirTexto('¿Cómo te llamas?', 'Escribe tu nombre para registrar la entrega:', '', function (n) {
        var p = CL.proyectos.progreso.datos();
        p.nombre = n;
        CL.proyectos.progreso.guardar();
        registrar(n);
      });
    } else registrar(nombre);
    return true;
  };

  T.hayActividad = function () { return !!enCurso; };
  T.cancelar = function () {
    clearInterval(tid);
    enCurso = null;
    T.enCurso = false;
    CL.restriccion = null;
  };

  cargar();

}(window.CL));
