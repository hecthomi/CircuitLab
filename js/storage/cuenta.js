/* ============================================================
   CircuitLab — cuenta del estudiante y trabajos de clase
   ------------------------------------------------------------
   Capa OPCIONAL sobre el servidor de la intranet (server/api.php).
   Si no hay servidor —USB, file://, Apache apagado— todo esto se
   apaga solo y la app sigue guardando en el propio computador,
   que es como funcionaba antes de que existiera este archivo.

   El usuario es el DOCUMENTO del estudiante: se valida contra la
   tabla `estudiantes` de la intranet y la contraseña se crea la
   primera vez que entra.
   ============================================================ */
(function (CL) {
  'use strict';

  var C = {};
  CL.cuenta = C;

  var URL_API = 'server/api.php';
  var TOKEN   = 'sesion:token';
  var COLA    = 'sesion:cola';        // proyectos guardados sin servidor

  /* servidor: null = sin comprobar todavía, true/false = ya se sabe */
  C.estado = { servidor: null, docente: false, usuario: null };

  C.hay = function () { return !!C.estado.usuario; };
  C.enLinea = function () { return C.estado.servidor === true; };

  function token() { return CL.pref(TOKEN, ''); }

  /* ------------------------------------------------------------
     Llamada al servidor. Nunca lanza: devuelve {ok:false,...} para
     que ningún fallo de red rompa el flujo normal de la app.
     ------------------------------------------------------------ */
  C.api = function (accion, datos) {
    var cuerpo = Object.assign({ accion: accion, token: token() }, datos || {});
    return fetch(URL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo)
    }).then(function (r) {
      return r.json().then(function (j) {
        if (j && j.sesion === false) cerrarLocal();
        return j;
      }, function () { return { ok: false, error: 'El servidor respondió algo raro.' }; });
    }).catch(function () {
      C.estado.servidor = false;
      pintarBoton();
      return { ok: false, error: 'sin_servidor', sin_servidor: true };
    });
  };

  function cerrarLocal() {
    CL.delPref(TOKEN);
    C.estado.usuario = null;
    pintarBoton();
  }

  /* ------------------------------------------------------------
     Arranque: ¿hay servidor? ¿sigue viva la sesión?
     ------------------------------------------------------------ */
  C.iniciar = function () {
    pintarBoton();
    return C.api('estado').then(function (j) {
      if (!j || !j.ok) { C.estado.servidor = false; pintarBoton(); return; }
      C.estado.servidor = true;
      C.estado.docente  = !!j.docente;
      C.estado.lan      = j.lan || null;
      C.estado.usuario  = j.usuario || null;
      if (!C.estado.usuario) CL.delPref(TOKEN);
      pintarBoton();
      if (C.estado.usuario) vaciarCola();
    });
  };

  /* ------------------------------------------------------------
     Botón de la barra superior
     ------------------------------------------------------------ */
  function primerNombre(n) {
    // Los nombres vienen "Apellido Apellido Nombre Nombre": se muestra
    // el tercer trozo, que es el nombre de pila en casi todos los casos.
    var p = String(n || '').trim().split(/\s+/);
    return p.length >= 3 ? p[2] : (p[p.length - 1] || 'Mi cuenta');
  }

  function pintarBoton() {
    var b = document.getElementById('btnCuenta');
    if (!b) return;
    var u = C.estado.usuario;
    b.classList.toggle('conectado', !!u);
    b.querySelector('span').textContent = u ? '👤' : '🔑';
    b.querySelector('i').textContent = u ? primerNombre(u.nombre) : 'Entrar';
    b.title = u
      ? 'Sesión de ' + u.nombre + (u.grado ? ' (' + u.grado + ')' : '') + ' — clic para ver tus trabajos'
      : (C.estado.servidor === false
          ? 'Sin conexión con la intranet: tu trabajo se guarda en este computador'
          : 'Entrar con tu documento para guardar tus trabajos de clase');
    var aula = document.getElementById('btnAula');
    if (aula) aula.hidden = !C.estado.docente;
  }
  C.pintarBoton = pintarBoton;

  /* ------------------------------------------------------------
     Entrar / crear la contraseña
     ------------------------------------------------------------ */
  C.abrir = function () {
    if (C.estado.servidor === false) return sinServidor();
    if (C.hay()) return C.panelSesion();
    pantallaDocumento();
  };

  function sinServidor() {
    CL.dialogo.info('Sin conexión con la intranet',
      '<p>No se pudo hablar con el servidor del colegio, así que no se puede entrar con tu documento.</p>' +
      '<p><b>Tu trabajo no se pierde:</b> CircuitLab lo sigue guardando en este computador. ' +
      'Usa <b>Guardar</b> 💾 y <b>Abrir</b> 📂 como siempre, y cuando vuelva la conexión ' +
      'podrás entrar y subirlo a tu cuenta.</p>');
  }

  function pantallaDocumento(docPrevio) {
    var h =
      '<p>Escribe tu <b>número de documento</b>. Es el mismo con el que estás matriculado.</p>' +
      '<label class="cu-lbl">Documento' +
      '<input type="text" id="cuDoc" inputmode="numeric" autocomplete="off" spellcheck="false" ' +
      'value="' + CL.esc(docPrevio || CL.pref('sesion:ultimoDoc', '')) + '"></label>' +
      '<div id="cuMsg" class="cu-msg" hidden></div>';
    var m = CL.dialogo.abrir('Entrar a CircuitLab', h, [
      { etq: 'Cancelar', clase: 'ghost' },
      { etq: 'Continuar', clase: 'primary', mantener: true, fn: function () { seguir(); } }
    ]);
    var inp = m.querySelector('#cuDoc');
    inp.focus(); inp.select();
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') seguir(); });

    function seguir() {
      var doc = inp.value.replace(/[^0-9A-Za-z]/g, '');
      if (doc.length < 4) return msg(m, 'Escribe tu número de documento completo.');
      msg(m, 'Buscándote en la lista…', true);
      C.api('buscar', { documento: doc }).then(function (j) {
        if (!j.ok) return msg(m, j.sin_servidor ? 'No hay conexión con el servidor del colegio.' : j.error);
        CL.setPref('sesion:ultimoDoc', doc);
        CL.dialogo.cerrar();
        if (j.primera_vez) pantallaCrearClave(doc, j.nombre, j.grado);
        else pantallaClave(doc, j.nombre, j.grado);
      });
    }
  }

  function pantallaClave(doc, nombre, grado) {
    var h =
      '<div class="cu-hola">👋 Hola, <b>' + CL.esc(nombre) + '</b>' +
      (grado ? ' <small>(' + CL.esc(grado) + ')</small>' : '') + '</div>' +
      '<label class="cu-lbl">Tu contraseña<input type="password" id="cuClave" autocomplete="off"></label>' +
      '<div id="cuMsg" class="cu-msg" hidden></div>' +
      '<p class="cu-pie">¿La olvidaste? Pídele al profesor que te la restablezca.</p>';
    var m = CL.dialogo.abrir('Entrar a CircuitLab', h, [
      { etq: 'No soy yo', clase: 'ghost', mantener: true,
        fn: function () { CL.dialogo.cerrar(); pantallaDocumento(''); } },
      { etq: 'Entrar', clase: 'primary', mantener: true, fn: function () { entrar(); } }
    ]);
    var inp = m.querySelector('#cuClave');
    inp.focus();
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') entrar(); });

    function entrar() {
      var clave = inp.value;
      if (!clave) return msg(m, 'Escribe tu contraseña.');
      msg(m, 'Entrando…', true);
      C.api('entrar', { documento: doc, clave: clave }).then(function (j) {
        if (j.primera_vez) { CL.dialogo.cerrar(); return pantallaCrearClave(doc, j.nombre, grado); }
        if (!j.ok) { inp.value = ''; inp.focus(); return msg(m, j.error); }
        aceptar(j);
      });
    }
  }

  function pantallaCrearClave(doc, nombre, grado) {
    var h =
      '<div class="cu-hola">👋 Hola, <b>' + CL.esc(nombre) + '</b>' +
      (grado ? ' <small>(' + CL.esc(grado) + ')</small>' : '') + '</div>' +
      '<p>Es la primera vez que entras. <b>Inventa una contraseña</b> y anótala donde no se te pierda: ' +
      'la vas a necesitar cada vez que abras CircuitLab.</p>' +
      '<label class="cu-lbl">Contraseña nueva<input type="password" id="cuC1" autocomplete="off"></label>' +
      '<label class="cu-lbl">Escríbela otra vez<input type="password" id="cuC2" autocomplete="off"></label>' +
      '<div id="cuMsg" class="cu-msg" hidden></div>';
    var m = CL.dialogo.abrir('Crea tu contraseña', h, [
      { etq: 'Cancelar', clase: 'ghost' },
      { etq: 'Crear mi cuenta', clase: 'primary', mantener: true, fn: function () { crear(); } }
    ]);
    var c1 = m.querySelector('#cuC1'), c2 = m.querySelector('#cuC2');
    c1.focus();
    c2.addEventListener('keydown', function (e) { if (e.key === 'Enter') crear(); });

    function crear() {
      if (c1.value.length < 4) return msg(m, 'La contraseña debe tener al menos 4 caracteres.');
      if (c1.value !== c2.value) return msg(m, 'Las dos contraseñas no son iguales.');
      msg(m, 'Creando tu cuenta…', true);
      C.api('registrar', { documento: doc, clave: c1.value, clave2: c2.value }).then(function (j) {
        if (!j.ok) return msg(m, j.error);
        aceptar(j, true);
      });
    }
  }

  function aceptar(j, esNueva) {
    CL.setPref(TOKEN, j.token);
    C.estado.usuario = j.usuario;
    C.estado.servidor = true;
    pintarBoton();
    CL.dialogo.cerrar();
    CL.sfx.win();
    CL.toast('ok', esNueva ? '¡Cuenta creada!' : 'Bienvenido, ' + primerNombre(j.usuario.nombre),
      'Desde ahora, al pulsar Guardar, tu trabajo también queda en tu cuenta y lo puedes abrir desde cualquier computador del salón.', 5200);
    vaciarCola();
  }

  function msg(m, texto, cargando) {
    var d = m.querySelector('#cuMsg');
    if (!d) return;
    d.hidden = false;
    d.className = 'cu-msg' + (cargando ? ' cargando' : ' error');
    d.textContent = texto;
  }

  /* ------------------------------------------------------------
     Panel de la sesión abierta
     ------------------------------------------------------------ */
  C.panelSesion = function () {
    var u = C.estado.usuario;
    var h =
      '<div class="cu-ficha"><div class="cu-avatar">👤</div><div>' +
      '<b>' + CL.esc(u.nombre) + '</b>' +
      '<small>Documento ' + CL.esc(u.documento) + (u.grado ? ' · Grado ' + CL.esc(u.grado) : '') + '</small>' +
      '</div></div>' +
      '<div class="menu-grid cu-acciones">' +
      '<button class="menu-tile" data-c="trabajos"><span class="mt-ico">📁</span><span class="mt-etq">Mis trabajos</span></button>' +
      '<button class="menu-tile" data-c="subir"><span class="mt-ico">☁️</span><span class="mt-etq">Subir el trabajo actual</span></button>' +
      '<button class="menu-tile" data-c="clave"><span class="mt-ico">🔑</span><span class="mt-etq">Cambiar contraseña</span></button>' +
      (C.estado.docente
        ? '<button class="menu-tile" data-c="aula"><span class="mt-ico">🏫</span><span class="mt-etq">Panel del aula</span></button>' : '') +
      '<button class="menu-tile" data-c="salir"><span class="mt-ico">🚪</span><span class="mt-etq">Cerrar sesión</span></button>' +
      '</div>';
    CL.dialogo.abrir('Mi cuenta', h, [{ etq: 'Cerrar', clase: 'ghost' }], {
      ancho: true,
      alAbrir: function (m) {
        CL.$$('[data-c]', m).forEach(function (b) {
          b.addEventListener('click', function () {
            var a = b.dataset.c;
            CL.dialogo.cerrar();
            if (a === 'trabajos') C.misTrabajos();
            if (a === 'subir')    C.subirActual(true);
            if (a === 'clave')    cambiarClave();
            if (a === 'aula')     C.panelAula();
            if (a === 'salir')    C.salir();
          });
        });
      }
    });
  };

  C.salir = function () {
    CL.dialogo.confirmar('Cerrar sesión',
      'Tus trabajos quedan guardados en tu cuenta. ¿Cerrar sesión en este computador?',
      function () {
        C.api('salir').then(function () {
          cerrarLocal();
          CL.toast('info', 'Sesión cerrada', 'El siguiente estudiante ya puede entrar con su documento.');
        });
      }, 'Cerrar sesión');
  };

  function cambiarClave() {
    var h =
      '<label class="cu-lbl">Contraseña actual<input type="password" id="cuA" autocomplete="off"></label>' +
      '<label class="cu-lbl">Contraseña nueva<input type="password" id="cuN" autocomplete="off"></label>' +
      '<div id="cuMsg" class="cu-msg" hidden></div>';
    var m = CL.dialogo.abrir('Cambiar mi contraseña', h, [
      { etq: 'Cancelar', clase: 'ghost' },
      { etq: 'Guardar', clase: 'primary', mantener: true, fn: function () {
        var a = m.querySelector('#cuA').value, n = m.querySelector('#cuN').value;
        if (n.length < 4) return msg(m, 'La contraseña nueva debe tener al menos 4 caracteres.');
        msg(m, 'Guardando…', true);
        C.api('cambiar_clave', { actual: a, nueva: n }).then(function (j) {
          if (!j.ok) return msg(m, j.error);
          CL.dialogo.cerrar();
          CL.toast('ok', 'Contraseña cambiada', 'Úsala la próxima vez que entres.');
        });
      } }
    ]);
    m.querySelector('#cuA').focus();
  }

  /* ------------------------------------------------------------
     Subir el trabajo actual
     ------------------------------------------------------------ */
  function proyectoActual() {
    CL.guardarVista();
    var p = CL.state.serializar();
    var campo = document.getElementById('projName');
    p.name = ((campo && campo.value) || p.name || 'Proyecto sin título').trim();
    p.view = CL.state.proj.view;
    return p;
  }

  /** Se llama al pulsar «Guardar». `avisar` controla si sale un toast propio
      (desde el menú sí; desde el guardado normal basta con el de siempre). */
  C.subirActual = function (avisar) {
    if (!C.hay()) {
      if (avisar) C.abrir();
      return Promise.resolve(false);
    }
    var p = proyectoActual();
    if (!p.components || !p.components.length) {
      if (avisar) CL.toast('info', 'No hay nada que subir', 'Arma algo primero.');
      return Promise.resolve(false);
    }
    return C.api('guardar', { proyecto: p, actividad: CL.pref('actividadActual', null) })
      .then(function (j) {
        if (!j.ok) {
          encolar(p);
          if (avisar) CL.toast('err', 'No se pudo subir', 'Queda apuntado y se sube solo cuando vuelva la conexión.');
          return false;
        }
        if (avisar) CL.toast('ok', 'Subido a tu cuenta', '“' + p.name + '” ya está en tu cuenta.');
        return true;
      });
  };

  /* Cola de lo que se guardó sin servidor. Se guarda solo el id y el nombre:
     el proyecto entero puede pesar y ya está en el almacén local. */
  function encolar(p) {
    var cola = CL.pref(COLA, []);
    if (!Array.isArray(cola)) cola = [];
    cola = cola.filter(function (x) { return x !== p.id; });
    cola.unshift(p.id);
    CL.setPref(COLA, cola.slice(0, 20));
  }

  function vaciarCola() {
    var cola = CL.pref(COLA, []);
    if (!Array.isArray(cola) || !cola.length || !C.hay()) return;
    CL.proyectos.listar().then(function (lista) {
      var pendientes = lista.filter(function (p) { return cola.indexOf(p.id) >= 0; });
      if (!pendientes.length) { CL.delPref(COLA); return; }
      var subidos = 0;
      var paso = pendientes.reduce(function (prev, p) {
        return prev.then(function () {
          return C.api('guardar', { proyecto: p }).then(function (j) { if (j.ok) subidos++; });
        });
      }, Promise.resolve());
      paso.then(function () {
        CL.delPref(COLA);
        if (subidos) CL.toast('ok', 'Trabajo pendiente subido',
          subidos + (subidos === 1 ? ' proyecto quedó' : ' proyectos quedaron') + ' guardado(s) en tu cuenta.');
      });
    });
  }

  /* ------------------------------------------------------------
     Mis trabajos (los del servidor)
     ------------------------------------------------------------ */
  C.misTrabajos = function () {
    if (!C.hay()) return C.abrir();
    CL.dialogo.abrir('Mis trabajos', '<div class="empty-note">Cargando…</div>',
      [{ etq: 'Cerrar', clase: 'ghost' }], { ancho: true });
    C.api('listar').then(function (j) {
      var cuerpo = document.querySelector('#modalRoot .modal-body');
      if (!cuerpo) return;
      if (!j.ok) { cuerpo.innerHTML = '<div class="empty-note">' + CL.esc(j.error) + '</div>'; return; }
      cuerpo.innerHTML = listaHTML(j.trabajos);
      conectarLista(cuerpo, j.trabajos);
    });
  };

  function listaHTML(t) {
    if (!t.length) {
      return '<div class="empty-note">Todavía no has subido ningún trabajo.<br>' +
        'Arma un circuito y pulsa <b>Guardar</b> 💾: se guardará aquí y lo podrás abrir desde cualquier computador del salón.</div>';
    }
    var h = '<div class="proj-list">';
    t.forEach(function (p) {
      h += '<div class="proj-item"><div class="pi-i">' + (p.entregado ? '📨' : '🔧') + '</div>' +
        '<div class="pi-t"><b>' + CL.esc(p.nombre) + '</b><small>' +
        p.n_componentes + ' componentes' + (p.tiene_codigo ? ' · con programa' : '') +
        ' · ' + fecha(p.modificado) +
        (p.entregado ? ' · <b>entregado</b>' : '') +
        (p.nota !== null && p.nota !== undefined ? ' · nota <b>' + p.nota + '</b>' : '') +
        '</small>' +
        (p.comentario ? '<small class="pi-com">🗒️ ' + CL.esc(p.comentario) + '</small>' : '') +
        '</div><div class="pi-a">' +
        '<button data-t="abrir" data-id="' + CL.esc(p.proyecto_id) + '" title="Abrir">📂</button>' +
        (p.entregado ? '' :
          '<button data-t="entregar" data-id="' + CL.esc(p.proyecto_id) + '" title="Entregar al profesor">📨</button>') +
        '<button data-t="borrar" data-id="' + CL.esc(p.proyecto_id) + '" title="Quitar de mi cuenta">🗑</button>' +
        '</div></div>';
    });
    return h + '</div>';
  }

  function conectarLista(cont, trabajos) {
    CL.$$('[data-t]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.dataset.id, accion = b.dataset.t;
        if (accion === 'abrir') {
          C.api('abrir', { proyecto_id: id }).then(function (j) {
            if (!j.ok) return CL.toast('err', 'No se pudo abrir', j.error);
            CL.dialogo.cerrar();
            CL.app.cargarProyecto(j.proyecto);
            CL.ajustarVista();
            CL.toast('ok', 'Trabajo abierto', '“' + (j.proyecto.name || 'Proyecto') + '”');
          });
        }
        if (accion === 'entregar') {
          CL.dialogo.confirmar('Entregar al profesor',
            'El profesor verá este trabajo como entregado. Puedes seguir mejorándolo después. ¿Entregar?',
            function () {
              C.api('entregar', { proyecto_id: id }).then(function (j) {
                if (!j.ok) return CL.toast('err', 'No se pudo entregar', j.error);
                CL.sfx.win();
                CL.toast('ok', 'Entregado', 'Tu profesor ya lo puede ver.');
                C.misTrabajos();
              });
            }, 'Entregar');
        }
        if (accion === 'borrar') {
          CL.dialogo.confirmar('Quitar de mi cuenta',
            'Se quita del servidor. La copia que tengas en este computador no se toca. ¿Continuar?',
            function () {
              C.api('borrar', { proyecto_id: id }).then(function () { C.misTrabajos(); });
            }, 'Quitar');
        }
      });
    });
  }

  /* ------------------------------------------------------------
     Panel del aula (solo el computador del docente)
     ------------------------------------------------------------ */
  var pestanaAula = 'entregas', soloEntregados = 1;

  C.panelAula = function () {
    if (!C.estado.docente) {
      return CL.dialogo.info('Solo desde tu computador',
        '<p>El panel del aula únicamente se abre desde el computador del docente (PC-A).</p>');
    }
    pintarAula();
  };

  function pintarAula() {
    var h = '<div class="tp-tabs">' +
      '<button data-at="entregas"' + (pestanaAula === 'entregas' ? ' class="active"' : '') + '>Trabajos</button>' +
      '<button data-at="cuentas"' + (pestanaAula === 'cuentas' ? ' class="active"' : '') + '>Cuentas</button>' +
      '</div><div id="auCuerpo"><div class="empty-note">Cargando…</div></div>';
    CL.dialogo.cajon('🏫 Aula — trabajos de clase', h, {
      ancho: true,
      alAbrir: function (cont) {
        CL.$$('.tp-tabs button', cont).forEach(function (b) {
          b.addEventListener('click', function () { pestanaAula = b.dataset.at; pintarAula(); });
        });
        var cuerpo = cont.querySelector('#auCuerpo');
        if (pestanaAula === 'entregas') vistaEntregas(cuerpo);
        else vistaCuentas(cuerpo);
      }
    });
  }

  function vistaEntregas(cont) {
    C.api('docente_trabajos', { solo_entregados: soloEntregados }).then(function (j) {
      if (!j.ok) { cont.innerHTML = '<div class="empty-note">' + CL.esc(j.error) + '</div>'; return; }
      var h = '<div class="btn-row" style="margin-bottom:12px">' +
        '<button class="btn small' + (soloEntregados ? ' primary' : '') + '" data-f="1">Solo entregados</button>' +
        '<button class="btn small' + (soloEntregados ? '' : ' primary') + '" data-f="0">Todo lo guardado</button>' +
        '<button class="btn small ghost" data-f="csv">⬇ Planilla CSV</button></div>';
      if (!j.trabajos.length) {
        h += '<div class="empty-note">' + (soloEntregados
          ? 'Nadie ha entregado todavía.'
          : 'Todavía no hay trabajos guardados en cuentas.') + '</div>';
      } else {
        h += '<div class="proj-list">';
        j.trabajos.forEach(function (t) {
          h += '<div class="proj-item"><div class="pi-i">' + (t.entregado ? '📨' : '🔧') + '</div>' +
            '<div class="pi-t"><b>' + CL.esc(t.alumno) + '</b>' +
            '<small>' + (t.grado ? CL.esc(t.grado) + ' · ' : '') + CL.esc(t.nombre) + ' · ' +
            t.n_componentes + ' comp.' + (t.tiene_codigo ? ' · con programa' : '') + ' · ' +
            fecha(t.entregado ? t.fecha_entrega : t.modificado) +
            (t.nota !== null && t.nota !== undefined ? ' · nota <b>' + t.nota + '</b>' : '') +
            '</small></div><div class="pi-a">' +
            '<button data-a="ver" data-id="' + t.id + '" title="Abrir su circuito">📂</button>' +
            '<button data-a="nota" data-id="' + t.id + '" title="Poner nota y comentario">✍️</button>' +
            '<button data-a="del" data-id="' + t.id + '" title="Eliminar">🗑</button>' +
            '</div></div>';
        });
        h += '</div>';
      }
      cont.innerHTML = h;

      CL.$$('[data-f]', cont).forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.dataset.f === 'csv') return csv(j.trabajos);
          soloEntregados = +b.dataset.f;
          vistaEntregas(cont);
        });
      });
      CL.$$('[data-a]', cont).forEach(function (b) {
        b.addEventListener('click', function () {
          var id = +b.dataset.id;
          var t = j.trabajos.filter(function (x) { return x.id === id; })[0];
          if (b.dataset.a === 'ver') {
            C.api('docente_abrir', { trabajo_id: id }).then(function (r) {
              if (!r.ok) return CL.toast('err', 'No se pudo abrir', r.error);
              CL.dialogo.cerrarCajon();
              CL.app.cargarProyecto(r.proyecto);
              CL.ajustarVista();
              CL.toast('info', 'Trabajo de ' + t.alumno, t.nombre);
            });
          }
          if (b.dataset.a === 'nota') calificar(t, function () { vistaEntregas(cont); });
          if (b.dataset.a === 'del') {
            CL.dialogo.confirmar('Eliminar trabajo',
              'Se borra el trabajo de ' + t.alumno + ' («' + t.nombre + '»). Esto no se puede deshacer.',
              function () {
                C.api('docente_borrar_trabajo', { trabajo_id: id }).then(function () { vistaEntregas(cont); });
              }, 'Eliminar');
          }
        });
      });
    });
  }

  function calificar(t, alTerminar) {
    var h = '<p><b>' + CL.esc(t.alumno) + '</b> — ' + CL.esc(t.nombre) + '</p>' +
      '<label class="cu-lbl">Nota (0.0 a 5.0, vacío = sin nota)' +
      '<input type="number" id="cuNota" min="0" max="5" step="0.1" value="' +
      (t.nota === null || t.nota === undefined ? '' : t.nota) + '"></label>' +
      '<label class="cu-lbl">Comentario para el estudiante' +
      '<textarea id="cuCom" rows="3">' + CL.esc(t.comentario || '') + '</textarea></label>';
    var m = CL.dialogo.abrir('Calificar', h, [
      { etq: 'Cancelar', clase: 'ghost' },
      { etq: 'Guardar', clase: 'primary', fn: function () {
        C.api('docente_calificar', {
          trabajo_id: t.id,
          nota: m.querySelector('#cuNota').value,
          comentario: m.querySelector('#cuCom').value
        }).then(function (j) {
          if (!j.ok) return CL.toast('err', 'No se pudo guardar', j.error);
          CL.toast('ok', 'Nota guardada', 'El estudiante la verá en «Mis trabajos».');
          alTerminar();
        });
      } }
    ]);
    m.querySelector('#cuNota').focus();
  }

  function vistaCuentas(cont) {
    C.api('docente_usuarios').then(function (j) {
      if (!j.ok) { cont.innerHTML = '<div class="empty-note">' + CL.esc(j.error) + '</div>'; return; }
      if (!j.usuarios.length) {
        cont.innerHTML = '<div class="empty-note">Ningún estudiante ha creado su cuenta todavía.<br>' +
          'Se crea sola la primera vez que entran con su documento.</div>';
        return;
      }
      var h = '<p>' + j.usuarios.length + ' cuenta(s). El documento es el usuario; la contraseña la crea ' +
        'el estudiante la primera vez que entra.</p><div class="proj-list">';
      j.usuarios.forEach(function (u) {
        h += '<div class="proj-item"><div class="pi-i">' + (u.sin_clave ? '🔓' : '👤') + '</div>' +
          '<div class="pi-t"><b>' + CL.esc(u.nombre) + '</b><small>' +
          (u.grado ? CL.esc(u.grado) + ' · ' : '') + CL.esc(u.id_estudiante) + ' · ' +
          u.trabajos + ' trabajo(s) · ' + u.entregas + ' entrega(s)' +
          (u.ultimo_acceso ? ' · último ingreso ' + fecha(u.ultimo_acceso) : ' · nunca ha entrado') +
          (u.sin_clave ? ' · <b>sin contraseña</b>' : '') +
          '</small></div><div class="pi-a">' +
          '<button data-u="trab" data-id="' + u.id + '" title="Ver sus trabajos">📂</button>' +
          '<button data-u="reset" data-id="' + u.id + '" title="Restablecer la contraseña">🔑</button>' +
          '</div></div>';
      });
      cont.innerHTML = h + '</div>';

      CL.$$('[data-u]', cont).forEach(function (b) {
        b.addEventListener('click', function () {
          var id = +b.dataset.id;
          var u = j.usuarios.filter(function (x) { return x.id === id; })[0];
          if (b.dataset.u === 'trab') {
            C.api('docente_trabajos', { usuario_id: id }).then(function (r) {
              if (!r.ok) return;
              var h2 = r.trabajos.length ? '<div class="proj-list">' + r.trabajos.map(function (t) {
                return '<div class="proj-item"><div class="pi-i">' + (t.entregado ? '📨' : '🔧') + '</div>' +
                  '<div class="pi-t"><b>' + CL.esc(t.nombre) + '</b><small>' + t.n_componentes +
                  ' comp. · ' + fecha(t.modificado) + '</small></div></div>';
              }).join('') + '</div>' : '<div class="empty-note">Sin trabajos.</div>';
              CL.dialogo.info('Trabajos de ' + CL.esc(u.nombre), h2);
            });
          }
          if (b.dataset.u === 'reset') {
            CL.dialogo.confirmar('Restablecer contraseña',
              u.nombre + ' creará una contraseña nueva la próxima vez que entre. ¿Continuar?',
              function () {
                C.api('docente_reset', { usuario_id: id }).then(function () {
                  CL.toast('ok', 'Contraseña restablecida', 'Dile que entre con su documento y la cree de nuevo.');
                  vistaCuentas(cont);
                });
              }, 'Restablecer');
          }
        });
      });
    });
  }

  function csv(trabajos) {
    var filas = [['Documento', 'Estudiante', 'Grado', 'Trabajo', 'Componentes', 'Programa',
                  'Entregado', 'Fecha', 'Nota', 'Comentario']];
    trabajos.forEach(function (t) {
      filas.push([t.id_estudiante, t.alumno, t.grado || '', t.nombre, t.n_componentes,
                  t.tiene_codigo ? 'sí' : 'no', t.entregado ? 'sí' : 'no',
                  (t.entregado ? t.fecha_entrega : t.modificado) || '',
                  (t.nota === null || t.nota === undefined) ? '' : t.nota,
                  (t.comentario || '').replace(/[\r\n]+/g, ' ')]);
    });
    var texto = filas.map(function (f) {
      return f.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';');
    }).join('\r\n');
    // BOM para que Excel abra las tildes bien
    if (CL.download('circuitlab_trabajos.csv', '﻿' + texto, 'text/csv;charset=utf-8')) {
      CL.toast('ok', 'Planilla descargada', 'circuitlab_trabajos.csv');
    }
  }

  /* ------------------------------------------------------------ */
  /** Las fechas llegan de MySQL como "2026-09-05 22:09:30"; Safari y
      algún navegador viejo no parsean ese formato sin la T. */
  function fecha(s) {
    if (!s) return 'sin fecha';
    var d = new Date(String(s).replace(' ', 'T'));
    return isNaN(d.getTime()) ? String(s) : CL.fecha(d.getTime());
  }

}(window.CL));
