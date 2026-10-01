/* ============================================================
   CircuitLab — arranque de la aplicación y barra de herramientas
   ============================================================ */
(function (CL) {
  'use strict';

  var A = {};
  CL.app = A;

  /* ------------------------------------------------------------
     Proyecto
     ------------------------------------------------------------ */
  A.nuevoProyecto = function (nombre, sinPreguntar) {
    function crear() {
      CL.runtime.detener();
      if (CL.audio) CL.audio.reiniciarMemoria();
      CL.state.nuevo(nombre || 'Proyecto sin título');
      document.getElementById('projName').value = CL.state.proj.name;
      CL.limpiarMensajes();
      CL.runtime.limpiarSerial();
      document.body.classList.remove('has-content');
      CL.centrarEn(0, 0);
      CL.emit('inspector:vacio');
    }
    if (sinPreguntar || !CL.state.dirty || !CL.state.proj.components.length) { crear(); return; }
    CL.dialogo.confirmar('Nuevo proyecto', 'Se perderán los cambios no guardados. ¿Continuar?', crear, 'Crear nuevo');
  };

  A.cargarProyecto = function (p) {
    CL.runtime.detener();
    if (CL.audio) CL.audio.reiniciarMemoria();
    CL.state.cargar(p);
    document.getElementById('projName').value = CL.state.proj.name || 'Proyecto';
    CL.limpiarMensajes();
    CL.runtime.limpiarSerial();
    CL.restaurarVista(CL.state.proj.view);
    document.body.classList.toggle('has-content', CL.state.proj.components.length > 0);
    CL.circuito.marcarSucio();
    CL.circuito.resolver(0.016);
    CL.ws.actualizarDinamicos(true);
  };

  /* ------------------------------------------------------------
     Repositorio de Actividades (antes «Abrir proyecto»)
       · docente    → carpeta del servidor, con 👁/🙈 para publicarlo o no
       · estudiante → solo lo que el docente publicó (lo suyo está en su PC)
       · sin servidor → la lista de este navegador, como siempre
     ------------------------------------------------------------ */
  function filaProyecto(icono, p, n, fecha, botones, extra) {
    return '<div class="proj-item' + (extra || '') + '"><div class="pi-i">' + icono + '</div>' +
      '<div class="pi-t"><b>' + CL.esc(p.name || 'Sin título') + '</b>' +
      '<small>' + n + ' componentes · ' + CL.fecha(fecha) + '</small></div>' +
      '<div class="pi-a">' + botones + '</div></div>';
  }

  A.abrirDialogo = function () {
    var modo = CL.proyectos.modo();
    var cabecera = '<div class="btn-row" style="margin-bottom:12px">' +
      '<button class="btn small" data-a="pc-abrir">📂 Abrir archivo del PC…</button>' +
      '<button class="btn small" data-a="pc-guardar">💾 Guardar el actual en el PC…</button></div>';
    var locales = CL.proyectos.listar();
    var carpeta = modo === 'local' ? Promise.resolve(null) : CL.proyectos.carpeta.listar();

    Promise.all([locales, carpeta]).then(function (r) {
      var lista = (r[0] || []).slice().sort(function (a, b) { return (b.modified || 0) - (a.modified || 0); });
      var serv = r[1];
      if (serv && serv.ok === false) modo = 'local';           // el servidor dejó de responder
      var h = cabecera;

      if (modo === 'docente') {
        var ps = serv.proyectos || [];
        h += '<h4 class="proj-sec">📁 Carpeta de CircuitLab <small>en el servidor · no se borra con el historial</small></h4>';
        if (!ps.length) {
          h += '<div class="empty-note">La carpeta está vacía. Usa <b>Guardar</b> y el proyecto quedará aquí.</div>';
        } else {
          h += '<div class="proj-list">';
          ps.forEach(function (p) {
            h += filaProyecto('🔧', p, p.n || 0, p.modified,
              '<button class="pi-vis' + (p.visible ? ' on' : '') + '" data-a="vis" data-id="' + p.id + '" data-v="' + (p.visible ? 1 : 0) + '" ' +
              'title="' + (p.visible ? 'Los estudiantes lo ven en el Repositorio. Clic para ocultarlo.' : 'Los estudiantes no lo ven. Clic para mostrárselo.') + '">' +
              (p.visible ? '👁 Visible' : '🙈 Oculto') + '</button>' +
              '<button data-a="c-abrir" data-id="' + p.id + '" title="Abrir">📂</button>' +
              '<button data-a="enlace" data-id="' + p.id + '" data-vis="' + (p.visible ? 1 : 0) + '" title="Copiar el enlace para abrirla directamente">🔗</button>' +
              '<button data-a="c-del" data-id="' + p.id + '" data-n="' + CL.esc(p.name || '') + '" title="Eliminar de la carpeta">🗑</button>');
          });
          h += '</div>';
        }
        if (lista.length) {
          h += '<h4 class="proj-sec">🌐 Solo en este navegador <small>se pierden al borrar el historial</small></h4><div class="proj-list">';
          lista.forEach(function (p) {
            h += filaProyecto('⚠️', p, (p.components || []).length, p.modified,
              '<button data-a="mover" data-id="' + p.id + '" title="Pasarlo a la carpeta del servidor">📁 A la carpeta</button>' +
              '<button data-a="abrir" data-id="' + p.id + '" title="Abrir">📂</button>' +
              '<button data-a="del" data-id="' + p.id + '" title="Eliminar">🗑</button>');
          });
          h += '</div>';
        }
      } else if (modo === 'estudiante') {
        var pub = serv.proyectos || [];
        h += '<div class="empty-note" style="margin-bottom:10px">Tus trabajos se guardan como <b>archivo en tu PC</b>: ' +
             'ábrelos con «Abrir archivo del PC».</div>';
        h += '<h4 class="proj-sec">📚 Actividades del docente</h4>';
        if (!pub.length) {
          h += '<div class="empty-note">El docente todavía no ha publicado actividades.</div>';
        } else {
          h += '<div class="proj-list">';
          pub.forEach(function (p) {
            h += filaProyecto('📘', p, p.n || 0, p.modified,
              '<button data-a="c-abrir" data-id="' + p.id + '" title="Abrir una copia">📂</button>' +
              '<button data-a="enlace" data-id="' + p.id + '" data-vis="1" title="Copiar el enlace para abrirla directamente">🔗</button>');
          });
          h += '</div>';
        }
      } else {
        if (!lista.length) {
          h += '<div class="empty-note">Todavía no has guardado ningún proyecto en este computador.</div>';
        } else {
          h += '<div class="proj-list">';
          lista.forEach(function (p) {
            h += filaProyecto('🔧', p, (p.components || []).length, p.modified,
              '<button data-a="abrir" data-id="' + p.id + '" title="Abrir">📂</button>' +
              '<button data-a="dup" data-id="' + p.id + '" title="Duplicar">⧉</button>' +
              '<button data-a="del" data-id="' + p.id + '" title="Eliminar">🗑</button>');
          });
          h += '</div>';
        }
      }

      CL.dialogo.abrir('Repositorio de Actividades', h, [{ etq: 'Cerrar', clase: 'ghost' }], {
        alAbrir: function (m) {
          CL.$$('[data-a]', m).forEach(function (b) {
            b.addEventListener('click', function () {
              var a = b.dataset.a, id = b.dataset.id;
              if (a === 'pc-abrir') { CL.dialogo.cerrar(); CL.proyectos.abrirDePC(); }
              if (a === 'pc-guardar') CL.proyectos.guardarActualEnPC();
              if (a === 'abrir') { CL.proyectos.abrirId(id); CL.dialogo.cerrar(); }
              if (a === 'dup') CL.proyectos.duplicar(id).then(function () { A.abrirDialogo(); });
              if (a === 'del') CL.proyectos.eliminar(id).then(function () { A.abrirDialogo(); });
              if (a === 'enlace') {
                var url = CL.proyectos.urlActividad(id);
                CL.copiarTexto(url).then(function (ok) {
                  var aviso = b.dataset.vis === '1' ? '' : ' Ojo: está OCULTA, los estudiantes no podrán abrirla hasta que la muestres.';
                  if (ok) CL.toast(b.dataset.vis === '1' ? 'ok' : 'warn', 'Enlace copiado', url + aviso);
                  else CL.dialogo.pedirTexto('Enlace de la actividad', 'Cópialo con Ctrl+C:', url, function () {});
                });
              }
              if (a === 'c-abrir') {
                CL.proyectos.carpeta.abrir(id).then(function (ok) { if (ok) CL.dialogo.cerrar(); });
              }
              if (a === 'vis') {
                b.disabled = true;
                CL.proyectos.carpeta.visible(id, b.dataset.v !== '1').then(function (j) {
                  if (!j || !j.ok) { b.disabled = false; CL.toast('err', 'No se pudo cambiar', (j && j.error) || ''); return; }
                  CL.toast('ok', j.ficha.visible ? 'Visible para los estudiantes' : 'Oculto para los estudiantes', j.ficha.name);
                  A.abrirDialogo();
                });
              }
              if (a === 'c-del') {
                CL.dialogo.confirmar('Eliminar de la carpeta',
                  '¿Eliminar “' + (b.dataset.n || 'este proyecto') + '” de la carpeta de CircuitLab? No se puede deshacer.',
                  function () { CL.proyectos.carpeta.borrar(id).then(function () { A.abrirDialogo(); }); }, 'Eliminar');
              }
              if (a === 'mover') {
                var p = lista.filter(function (x) { return x.id === id; })[0];
                if (!p) return;
                b.disabled = true;
                CL.proyectos.carpeta.guardar(p).then(function (j) {
                  if (!j || !j.ok) { b.disabled = false; CL.toast('err', 'No se pudo pasar a la carpeta', (j && j.error) || ''); return; }
                  // solo tras confirmar la copia en el servidor se quita la del navegador
                  CL.proyectos.eliminar(id).then(function () {
                    CL.toast('ok', 'Pasado a la carpeta', p.name || 'Proyecto');
                    A.abrirDialogo();
                  });
                });
              }
            });
          });
        }
      });
    });
  };

  /* ------------------------------------------------------------
     Simulación
     ------------------------------------------------------------ */
  A.ejecutar = function () {
    CL.limpiarMensajes();
    var ok = CL.runtime.iniciar();
    if (ok) {
      // los cables que van a la placa se "enchufan" con una pequeña animación
      if (CL.wires.animarConexion) CL.wires.animarConexion();
      CL.toast('ok', 'Simulación en marcha', 'Puedes tocar pulsadores y mover los deslizadores de los sensores.');
      setTimeout(function () { A.analizar(true); }, 420);
    }
  };
  A.detener = function () {
    CL.runtime.detener();
    CL.toast('info', 'Simulación detenida');
  };
  A.reiniciar = function () {
    CL.runtime.reiniciar();
    CL.toast('info', 'Circuito reiniciado');
  };

  A.analizar = function (silencioso) {
    var a = CL.validar.analizar();
    // informe
    var pane = document.getElementById('paneInforme');
    var h = '<div style="font-size:12.5px;line-height:1.7">';
    h += '<b style="color:var(--text)">Circuito analizado</b> <span style="color:var(--text-mute)">· ' + CL.fecha() + '</span><br>';
    var vistos = {};
    a.resumen.forEach(function (r) {
      if (vistos[r.t]) return;
      vistos[r.t] = true;
      var ico = r.n === 'ok' ? '✅' : (r.n === 'warn' ? '⚠️' : '❌');
      h += '<div style="padding:3px 0">' + ico + ' ' + CL.esc(r.t) + '</div>';
    });
    h += '<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--line);color:var(--text-mute)">' +
      CL.state.proj.components.length + ' componentes · ' + CL.state.proj.wires.length + ' cables · ' +
      (CL.circuito.nets || []).length + ' nodos eléctricos</div></div>';
    pane.innerHTML = h;

    if (!silencioso) {
      CL.pestanaConsola('informe');
      CL.limpiarMensajes();
    }
    a.items.forEach(function (d) {
      if (silencioso && d.nivel === 'info') return;
      CL.mensaje(d.nivel, d.titulo, d.texto, d.arreglo, d.comps && d.comps.length ? [
        { etq: '🔦 Señalar', fn: function () { CL.state.seleccionar(d.comps); var c = CL.state.comp(d.comps[0]); if (c) CL.centrarEn(c.x, c.y); } },
        { etq: '💡 Ayuda', fn: function () { CL.asistente.revisar(); CL.emit('panel:derecha', 'asis'); } }
      ] : null);
    });
    if (!silencioso) {
      if (a.ok) CL.sfx.ok(); else CL.sfx.bad();
      CL.toast(a.ok ? 'ok' : 'warn', a.ok ? 'Circuito correcto' : 'Se encontraron avisos',
        a.ok ? 'No hay errores eléctricos.' : 'Revisa la consola de mensajes.');
    }
    return a;
  };

  /* ------------------------------------------------------------
     Interfaz
     ------------------------------------------------------------ */
  function tema(t) {
    document.body.classList.toggle('light', t === 'claro');
    CL.setPref('tema', t);
    document.getElementById('btnTema').firstElementChild.textContent = t === 'claro' ? '☀️' : '🌙';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'claro' ? '#eef2f8' : '#0b1220');
  }

  /** Refresca el icono del interruptor general de sonido. */
  function pintarSonido() {
    var el = document.getElementById('btnSonido');
    if (!el) return;
    var on = CL.pref('sonido', true) !== false;
    el.firstElementChild.textContent = on ? '🔊' : '🔇';
    el.classList.toggle('mute', !on);
    el.title = on ? 'Silenciar el sonido' : 'Activar el sonido';
  }
  CL.on('sonido:cambio', pintarSonido);

  function modo(m) {
    document.body.dataset.modo = m;
    CL.setPref('modo', m);
    var b = document.getElementById('btnModo');
    b.querySelector('i').textContent = m === 'aprendizaje' ? 'Modo aprendizaje' : 'Modo libre';
    b.querySelector('span').textContent = m === 'aprendizaje' ? '🎓' : '🧪';
    if (m === 'aprendizaje') {
      CL.toast('info', 'Modo aprendizaje activado', 'El asistente revisará tu circuito y te avisará de los errores.');
      CL.asistente.revisar();
    }
  }

  function conectarBarra() {
    var b = function (id, fn) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };
    b('btnNuevo', function () { A.nuevoProyecto(); });
    b('btnAbrir', function () { A.abrirDialogo(); });
    b('btnGuardar', function () { CL.proyectos.guardar(); });
    b('btnGuardarComo', function () { CL.proyectos.guardarComo(); });
    b('btnUndo', function () { if (!CL.state.deshacer()) CL.toast('info', 'No hay nada que deshacer'); });
    b('btnRedo', function () { if (!CL.state.rehacer()) CL.toast('info', 'No hay nada que rehacer'); });
    // un único botón: inicia la simulación y, mientras corre, la detiene
    b('btnRun', function () {
      if (CL.runtime.corriendo) A.detener(); else A.ejecutar();
    });
    b('btnAnalizar', function () { A.analizar(false); });
    b('btnModo', function () { modo(document.body.dataset.modo === 'aprendizaje' ? 'libre' : 'aprendizaje'); });
    b('btnCodigo', function () { CL.codigo.alternar(); });
    b('btnLecciones', function () { CL.lecciones.abrir(); });
    b('btnEjemplos', function () { CL.ejemplos.abrir(); });
    b('btnEjercicios', function () { CL.ejercicios.abrir(); });
    b('btnRetos', function () { CL.retos.abrir(); });
    b('btnProfesor', function () { CL.profesor.abrir(); });
    b('btnCuenta', function () { CL.cuenta.abrir(); });
    b('btnAula', function () { CL.cuenta.panelAula(); });
    b('btnTema', function () { tema(document.body.classList.contains('light') ? 'oscuro' : 'claro'); });
    b('btnSonido', function () {
      var on = CL.audio.alternar();
      pintarSonido();
      CL.toast('info', on ? 'Sonido activado' : 'Sonido silenciado',
        on ? 'Los motores, los LEDs y el zumbador vuelven a sonar.'
           : 'Ideal para trabajar en una sala con varios equipos.');
    });
    pintarSonido();
    b('btnAyuda', ayuda);
    b('btnMenu', menuExtra);
    conectarDesplegable('btnArchivoDrop', 'ddArchivoMenu');
    conectarDesplegable('btnMasDrop', 'ddMasMenu');

    // paneles: al plegarlos aparece una pestaña en el borde para recuperarlos
    b('collapseLeft', function () { document.body.classList.add('hide-left'); pestanasPaneles(); });
    b('collapseRight', function () { document.body.classList.add('hide-right'); pestanasPaneles(); });
    b('verComponentes', function () { document.body.classList.remove('hide-left'); pestanasPaneles(); });
    b('verInspector', function () { document.body.classList.remove('hide-right'); pestanasPaneles(); });

    // selector de vista de la cabecera: Circuito / Componentes
    CL.$$('#viewSwitch .vs-btn').forEach(function (v) {
      v.addEventListener('click', function () { vista(v.dataset.view); });
    });
    b('vcActualizar', function () { pintarListaComponentes(); });
    b('vcPersonalizar', function () { CL.personalizar.galeria(); });
    b('btnPersoPaleta', function () { CL.personalizar.galeria(); });
    b('btnListaPDF', function () { listaPDF(); });
    b('btnListaCSV', function () { listaCSV(); });

    b('btnScope', function () { CL.osciloscopio.abrir(); });
    b('zoomIn', function () { CL.zoomEn(1.2); });
    b('zoomOut', function () { CL.zoomEn(1 / 1.2); });
    b('zoomFit', function () { CL.ajustarVista(); });

    var tgl = function (id, clase, pref) {
      var el = document.getElementById(id);
      if (!el) return;
      var on = CL.pref(pref, el.classList.contains('on'));
      document.body.classList.toggle(clase, on);
      el.classList.toggle('on', on);
      el.addEventListener('click', function () {
        var nuevo = !el.classList.contains('on');
        el.classList.toggle('on', nuevo);
        document.body.classList.toggle(clase, nuevo);
        CL.setPref(pref, nuevo);
      });
    };
    tgl('tglConex', 'show-nets', 'verNets');
    tgl('tglCorriente', 'show-flow', 'verFlujo');

    // herramienta seleccionar (por defecto el ratón mueve la pantalla)
    var selBtn = document.getElementById('tglSeleccion');
    if (selBtn) {
      var activo = CL.pref('modoSeleccion', false);
      CL.ws.setModoSeleccion(activo);
      selBtn.classList.toggle('on', activo);
      selBtn.addEventListener('click', function () {
        var nv = !selBtn.classList.contains('on');
        selBtn.classList.toggle('on', nv);
        CL.ws.setModoSeleccion(nv);
        CL.toast('info', nv ? 'Herramienta: seleccionar' : 'Herramienta: mover',
          nv ? 'Arrastra sobre el lienzo para elegir varios elementos.'
             : 'Arrastra sobre el lienzo para desplazar la vista.');
      });
    }
    // estos dos van invertidos: el botón encendido = mostrar
    var invertido = function (id, claseOcultar, pref, porDefecto) {
      var el = document.getElementById(id);
      if (!el) return;
      var on = CL.pref(pref, porDefecto);
      el.classList.toggle('on', on);
      document.body.classList.toggle(claseOcultar, !on);
      el.addEventListener('click', function () {
        var nv = !el.classList.contains('on');
        el.classList.toggle('on', nv);
        document.body.classList.toggle(claseOcultar, !nv);
        CL.setPref(pref, nv);
      });
    };
    invertido('tglPines', 'hide-pins', 'verPines', true);
    invertido('tglValores', 'hide-values', 'verValores', true);
    invertido('tglCuadricula', 'no-grid', 'verCuadricula', true);

    // acciones de la selección, ahora en la barra de herramientas: se
    // encienden y apagan en js/editor/selection.js según lo elegido
    CL.$$('#toolbar2 [data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var a = btn.dataset.act;
        if (a === 'rotate') CL.ws.rotarSeleccion();
        if (a === 'flipH') CL.ws.voltearSeleccion('h');
        if (a === 'flipV') CL.ws.voltearSeleccion('v');
        if (a === 'dup') CL.ws.duplicarSeleccion();
        if (a === 'del') CL.ws.eliminarSeleccion();
        if (a === 'color') elegirColor();
      });
    });

    // pestañas del panel derecho
    CL.$$('.pr-tab').forEach(function (t) {
      t.addEventListener('click', function () { panelDerecho(t.dataset.pane); });
    });
    CL.on('panel:derecha', panelDerecho);

    // consola
    CL.$$('.cw-tab').forEach(function (t) {
      t.addEventListener('click', function () { CL.pestanaConsola(t.dataset.tab); });
    });
    b('btnLimpiarConsola', function () {
      CL.limpiarMensajes();
      CL.runtime.limpiarSerial();
      document.getElementById('paneInforme').innerHTML = '';
    });
    b('btnConsolaToggle', function () {
      document.body.classList.toggle('console-min');
      document.getElementById('btnConsolaToggle').textContent = document.body.classList.contains('console-min') ? '▴' : '▾';
    });


    b('drawerClose', function () { CL.dialogo.cerrarCajon(); });

    // búsqueda de componentes
    var busq = document.getElementById('paletteSearch');
    busq.addEventListener('input', CL.debounce(function () { CL.paneles.pintarPaleta(busq.value); }, 120));

    // nombre del proyecto
    document.getElementById('projName').addEventListener('change', function () {
      CL.state.proj.name = this.value.trim() || 'Proyecto sin título';
      CL.state.marcarSucio();
    });

    // importar archivo
    document.getElementById('fileImport').addEventListener('change', function () {
      if (this.files && this.files[0]) CL.proyectos.importar(this.files[0]);
      this.value = '';
      CL.dialogo.cerrar();
    });
  }

  /* ------------------------------------------------------------
     Vistas: "Circuito" (el área donde se arma) y "Componentes"
     (la lista de piezas que ese circuito está usando). Comparten el
     hueco central; el selector vive en la cabecera.
     ------------------------------------------------------------ */
  var vistaActual = 'circuito';

  function vista(nombre) {
    var lista = nombre === 'componentes';
    vistaActual = lista ? 'componentes' : 'circuito';
    document.body.classList.toggle('vista-lista', lista);
    var vc = document.getElementById('viewComponentes');
    if (vc) vc.hidden = !lista;
    CL.$$('#viewSwitch .vs-btn').forEach(function (b) {
      var on = b.dataset.view === vistaActual;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (lista) pintarListaComponentes();
  }
  A.vista = vista;

  /** Agrupa los componentes del circuito: las piezas iguales (mismo tipo y
      mismo valor) cuentan como una sola fila con su cantidad. Devuelve las
      filas ordenadas por categoría y, dentro de ella, de más a menos usadas. */
  function agruparComponentes() {
    var comps = (CL.state.proj && CL.state.proj.components) || [];
    var mapa = {}, orden = [];
    comps.forEach(function (c) {
      var d = CL.catalogo[c.type];
      if (!d) return;
      var nombre = CL.nombreComp(c);
      var valor = '';
      try { valor = d.etiquetaValor ? d.etiquetaValor(c) : ''; } catch (e) { valor = ''; }
      var clave = c.type + '|' + nombre + '|' + valor;
      if (!mapa[clave]) {
        mapa[clave] = {
          tipo: c.type, nombre: nombre, valor: valor, n: 0, ids: [],
          modelo: (d.info && d.info.tipo) || d.nombre || c.type,
          cat: d.cat,
          catNombre: (CL.CATEGORIAS.filter(function (x) { return x.id === d.cat; })[0] || {}).nombre || ''
        };
        orden.push(clave);
      }
      mapa[clave].n++;
      mapa[clave].ids.push(c.id);
    });
    var filas = orden.map(function (k) { return mapa[k]; });
    filas.sort(function (a, b) { return a.cat === b.cat ? b.n - a.n : (a.cat < b.cat ? -1 : 1); });
    return filas;
  }

  /** Cables del circuito y su largo aproximado en centímetros reales. */
  function resumenCables() {
    var cables = (CL.state.proj && CL.state.proj.wires) || [];
    var cm = CL.round(cables.reduce(function (s, w) {
      var pts = CL.wires.vertices(w);
      if (!pts) return s;
      var d = 0;
      for (var i = 1; i < pts.length; i++) d += CL.dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      return s + d / 12 * 2.54;                       // 1 paso de protoboard = 2,54 mm reales
    }, 0) / 10, 1);
    return { n: cables.length, cm: cm };
  }

  /** Tabla de componentes usados: número, foto, nombre, modelo y cantidad. */
  function pintarListaComponentes() {
    var cont = document.getElementById('vcBody');
    var res = document.getElementById('vcResumen');
    if (!cont) return;
    var filas = agruparComponentes();
    var cab = resumenCables();
    var total = filas.reduce(function (s, f) { return s + f.n; }, 0);

    if (res) {
      res.textContent = !total
        ? 'Ningún componente todavía'
        : total + (total === 1 ? ' pieza' : ' piezas') +
          ' · ' + filas.length + (filas.length === 1 ? ' tipo distinto' : ' tipos distintos') +
          ' · ' + cab.n + (cab.n === 1 ? ' cable' : ' cables');
    }

    if (!filas.length) {
      cont.innerHTML = '<div class="empty-note">Todavía no has colocado ningún componente.<br>' +
        'Vuelve a <b>Circuito</b> y arrastra piezas al área de trabajo.</div>';
      return;
    }

    var h = '<table class="vc-tabla"><thead><tr>' +
            '<th class="n">N.º</th><th class="f">Foto</th><th class="c">Cant.</th>' +
            '<th>Nombre</th><th>Modelo</th><th class="e">Aspecto</th>' +
            '</tr></thead><tbody>';
    filas.forEach(function (f, i) {
      var retocado = CL.personalizar && CL.personalizar.retocado(f.tipo);
      h += '<tr data-i="' + i + '" title="Ver estas piezas en el circuito">' +
        '<td class="n">' + (i + 1) + '</td>' +
        '<td class="f"><div class="vc-foto">' + CL.iconoSVG(f.tipo, 70, 46) + '</div></td>' +
        '<td class="c"><b>' + f.n + '</b></td>' +
        '<td class="nom"><b>' + CL.esc(f.nombre) + '</b>' +
          (f.valor ? '<small>' + CL.esc(f.valor) + '</small>' : '') + '</td>' +
        '<td class="mod">' + CL.esc(f.modelo) +
          (f.catNombre ? '<em>' + CL.esc(f.catNombre) + '</em>' : '') + '</td>' +
        '<td class="e"><button class="vc-edit' + (retocado ? ' on' : '') + '" data-edit="' + CL.esc(f.tipo) + '" ' +
          'title="Personalizar el aspecto de ' + CL.esc(f.nombre) + '">\ud83c\udfa8</button></td>' +
        '</tr>';
    });
    h += '</tbody></table>' +
      '<div class="vc-pie">Total: <b>' + total + '</b> ' + (total === 1 ? 'pieza' : 'piezas') +
      ' y <b>' + cab.n + '</b> ' + (cab.n === 1 ? 'cable' : 'cables') +
      ' (≈ ' + cab.cm + ' cm de cable).</div>';
    cont.innerHTML = h;

    CL.$$('#vcBody [data-edit]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();                       // no navegar al circuito
        CL.personalizar.abrir(b.dataset.edit);
      });
    });

    CL.$$('#vcBody tbody tr').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var f = filas[+tr.dataset.i];
        vista('circuito');
        if (!f) return;
        CL.state.seleccionar(f.ids.slice());
        CL.emit('inspector:mostrar', f.ids[0]);
        var c = CL.state.comp(f.ids[0]);
        if (c) CL.centrarEn(c.x, c.y);
      });
    });
  }
  A.pintarListaComponentes = pintarListaComponentes;

  /* ---- Descargar la lista en CSV (se abre en Excel o LibreOffice) ---- */
  function listaCSV() {
    var filas = agruparComponentes();
    if (!filas.length) { CL.toast('info', 'No hay componentes', 'Monta algo primero.'); return; }
    var cab = resumenCables();
    function campo(v) { return '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"'; }
    var lineas = [['N.º', 'Cantidad', 'Nombre', 'Modelo', 'Valor', 'Categoría'].map(campo).join(';')];
    filas.forEach(function (f, i) {
      lineas.push([i + 1, f.n, f.nombre, f.modelo, f.valor, f.catNombre].map(campo).join(';'));
    });
    lineas.push([filas.length + 1, cab.n, 'Cable de conexión', 'Cable macho-macho',
                 cab.cm + ' cm en total', 'Montaje'].map(campo).join(';'));
    var ok = CL.download((CL.state.proj.name || 'circuito') + ' - componentes.csv',
      '\ufeff' + lineas.join('\r\n'), 'text/csv;charset=utf-8');
    CL.toast(ok ? 'ok' : 'err', ok ? 'CSV descargado' : 'No se pudo descargar',
      ok ? 'Ábrelo con Excel o LibreOffice Calc.' : 'Prueba con el botón PDF.');
  }

  /* ---- Informe imprimible: el navegador lo guarda como PDF ----
     Sin librerías: se arma una página aparte con la misma tabla (los iconos
     son SVG, así que salen nítidos) y se lanza el diálogo de impresión, donde
     se elige "Guardar como PDF". */
  function listaPDF() {
    var filas = agruparComponentes();
    if (!filas.length) { CL.toast('info', 'No hay componentes', 'Monta algo primero.'); return; }
    var cab = resumenCables();
    var total = filas.reduce(function (s, f) { return s + f.n; }, 0);
    var titulo = CL.state.proj.name || 'Proyecto sin título';
    var fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    var cuerpo = filas.map(function (f, i) {
      return '<tr><td class="n">' + (i + 1) + '</td>' +
        '<td class="f">' + CL.iconoSVG(f.tipo, 64, 42) + '</td>' +
        '<td><b>' + CL.esc(f.nombre) + '</b>' +
          (f.valor ? '<span class="v">' + CL.esc(f.valor) + '</span>' : '') + '</td>' +
        '<td>' + CL.esc(f.modelo) +
          (f.catNombre ? '<span class="cat">' + CL.esc(f.catNombre) + '</span>' : '') + '</td>' +
        '<td class="c">' + f.n + '</td></tr>';
    }).join('');

    var doc = '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
      '<title>Componentes — ' + CL.esc(titulo) + '</title><style>' +
      '@page{size:A4;margin:14mm}' +
      'body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#132039;margin:0}' +
      'h1{font-size:18px;margin:0 0 2px}' +
      '.sub{font-size:11.5px;color:#5b6b86;margin-bottom:14px}' +
      'table{width:100%;border-collapse:collapse;font-size:12px}' +
      'th{text-align:left;font-size:9.5px;letter-spacing:.7px;text-transform:uppercase;color:#5b6b86;' +
      'border-bottom:1.5px solid #cfd8e6;padding:0 8px 5px}' +
      'td{border-bottom:1px solid #e4eaf3;padding:7px 8px;vertical-align:middle}' +
      'tr{page-break-inside:avoid}' +
      'td.n,th.n{width:34px;text-align:right;color:#5b6b86}' +
      'td.c,th.c{width:52px;text-align:center;font-weight:700;font-size:14px}' +
      'td.f,th.f{width:74px}' +
      'td.f svg{display:block}' +
      'span.v{display:block;font-size:10.5px;color:#0e7490}' +
      'span.cat{display:block;font-size:10px;color:#7c8ca5}' +
      '.pie{margin-top:12px;font-size:11.5px;color:#5b6b86;border-top:1px solid #cfd8e6;padding-top:8px}' +
      '</style></head><body>' +
      '<h1>Componentes del circuito</h1>' +
      '<div class="sub">' + CL.esc(titulo) + ' · ' + CL.esc(fecha) + ' · CircuitLab</div>' +
      '<table><thead><tr><th class="n">N.º</th><th class="f">Foto</th><th>Nombre</th>' +
      '<th>Modelo</th><th class="c">Cant.</th></tr></thead><tbody>' + cuerpo + '</tbody></table>' +
      '<div class="pie">Total: <b>' + total + '</b> ' + (total === 1 ? 'pieza' : 'piezas') +
      ' de <b>' + filas.length + '</b> ' + (filas.length === 1 ? 'tipo' : 'tipos') +
      ' · <b>' + cab.n + '</b> ' + (cab.n === 1 ? 'cable' : 'cables') +
      ' (≈ ' + cab.cm + ' cm de cable).</div>' +
      '<scr' + 'ipt>window.onload=function(){setTimeout(function(){window.print()},250)}</scr' + 'ipt>' +
      '</body></html>';

    var v = window.open('', '_blank');
    if (!v) {
      CL.toast('warn', 'El navegador bloqueó la ventana',
        'Permite las ventanas emergentes de esta página para generar el PDF.');
      return;
    }
    v.document.open();
    v.document.write(doc);
    v.document.close();
    CL.toast('info', 'Informe listo', 'En el diálogo de impresión elige \u00abGuardar como PDF\u00bb.');
  }

  // si se edita el circuito con la lista abierta, se repinta sola
  CL.on('circuito:cambio', function () {
    if (vistaActual === 'componentes') pintarListaComponentes();
  });
  // y tambien cuando se retoca el aspecto de un componente
  CL.on('componentes:aspecto', function () {
    if (vistaActual === 'componentes') pintarListaComponentes();
  });

  /** Muestra u oculta las pestañas laterales según qué panel esté plegado. */
  function pestanasPaneles() {
    var vc = document.getElementById('verComponentes');
    var vi = document.getElementById('verInspector');
    if (vc) vc.hidden = !document.body.classList.contains('hide-left');
    if (vi) vi.hidden = !document.body.classList.contains('hide-right');
  }
  A.pestanasPaneles = pestanasPaneles;

  function panelDerecho(nombre) {
    CL.$$('.pr-tab').forEach(function (t) { t.classList.toggle('active', t.dataset.pane === nombre); });
    CL.$$('.pr-pane').forEach(function (p) {
      p.classList.toggle('active', p.id === 'pane' + nombre.charAt(0).toUpperCase() + nombre.slice(1));
    });
    document.getElementById('prTitle').textContent =
      nombre === 'insp' ? 'Inspector' : (nombre === 'sim' ? 'Simulación' : 'Asistente');
    if (nombre === 'sim') CL.paneles.pintarSimulacion();
    document.body.classList.remove('hide-right');
    pestanasPaneles();
  }

  function elegirColor() {
    var cables = CL.state.sel.filter(function (id) { return !!CL.state.wire(id); });
    if (!cables.length) { CL.toast('info', 'Selecciona un cable primero'); return; }
    var h = '<p>Elige el color del cable. Por convención: <b style="color:#ef4444">rojo</b> para el positivo y <b>negro</b> para GND.</p><div class="swatches">';
    CL.COLORS_CABLE.forEach(function (c) {
      h += '<div class="swatch" data-c="' + c.id + '" style="background:' + c.hex + '" title="' + c.id + ' — ' + c.uso + '"></div>';
    });
    h += '</div>';
    CL.dialogo.abrir('Color del cable', h, [{ etq: 'Cerrar', clase: 'ghost' }], {
      alAbrir: function (m) {
        CL.$$('.swatch', m).forEach(function (s) {
          s.addEventListener('click', function () {
            CL.state.colorCable(cables, s.dataset.c);
            CL.setPref('colorCable', s.dataset.c);
            CL.dialogo.cerrar();
          });
        });
      }
    });
  }

  function ayuda() {
    CL.dialogo.abrir('Ayuda rápida',
      '<h4 style="color:var(--acc);font-size:13px;margin-bottom:6px">Cómo se usa</h4>' +
      '<ul style="padding-left:18px;line-height:1.8">' +
      '<li><b>Colocar:</b> arrastra un componente del panel izquierdo (o haz doble clic).</li>' +
      '<li><b>Conectar:</b> haz clic sobre un pin o un agujero y arrastra hasta el otro punto.</li>' +
      '<li><b>Mover:</b> arrastra el componente. Se encaja solo en la protoboard.</li>' +
      '<li><b>Interactuar:</b> haz clic sobre pulsadores, interruptores y los botones A/B de la micro:bit.</li>' +
      '<li><b>Ver conexiones internas:</b> botón 🔗 del lienzo.</li>' +
      '</ul>' +
      '<h4 style="color:var(--acc);font-size:13px;margin:14px 0 6px">Atajos de teclado</h4>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;font-size:12.5px">' +
      ['R · rotar', 'Supr · eliminar', 'Ctrl+D · duplicar', 'Ctrl+Z · deshacer',
       'Ctrl+Y · rehacer', 'Ctrl+S · guardar', 'Ctrl+A · seleccionar todo', 'F5 · ejecutar',
       'F8 · analizar', 'Esc · cancelar', '+ / − · zoom', '0 · ajustar vista',
       'Espacio + arrastrar · mover el lienzo'].map(function (t) {
        return '<div style="color:var(--text-dim)">' + t + '</div>';
      }).join('') + '</div>' +
      '<h4 style="color:var(--acc);font-size:13px;margin:14px 0 6px">¿Funciona sin internet?</h4>' +
      '<p>Sí. Todo está incluido en la propia aplicación. Puedes instalarla desde el navegador (menú ⋮ → “Instalar”) ' +
      'y usarla sin conexión, o copiar la carpeta a una memoria USB.</p>' +
      '<h4 style="color:var(--acc);font-size:13px;margin:14px 0 6px">Diferencias con una placa real</h4>' +
      '<ul style="padding-left:18px;line-height:1.7">' +
      '<li>El lenguaje es un <b>subconjunto educativo</b> de Arduino: variables, <code>if</code>, <code>for</code>, ' +
      '<code>while</code>, funciones, arreglos, <code>Serial</code> y la librería <code>Servo</code>.</li>' +
      '<li>Las divisiones se calculan con decimales. En un Arduino real <code>7/2</code> da <code>3</code> porque ambos son enteros; ' +
      'aquí eso ocurre solo al guardar el resultado en una variable <code>int</code>.</li>' +
      '<li>Los motores y sensores están modelados de forma simplificada, pero sus efectos eléctricos son reales.</li></ul>',
      [{ etq: 'Entendido', clase: 'primary' }], { ancho: true });
  }

  /* ------------------------------------------------------------
     Desplegable de la barra: Modo / Curso / Ejemplos / Ejercicios /
     Retos / Profesor / Ayuda.
     El panel vive fuera de #topbar (ver index.html) porque la barra
     tiene overflow-y:hidden para poder desplazarse en horizontal sin
     mostrar una barra de scroll vertical, y eso recortaría cualquier
     cosa que quisiera sobresalir hacia abajo. Al abrirse se posiciona
     con position:fixed, calculado desde el botón que lo abre.
     ------------------------------------------------------------ */
  function conectarDesplegable(idBoton, idMenu) {
    var btn = document.getElementById(idBoton), menu = document.getElementById(idMenu);
    if (!btn || !menu) return;
    function cerrar() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    function abierto() { return !menu.hidden; }
    function ubicar() {
      var r = btn.getBoundingClientRect();
      // el panel cae por debajo de la barra de herramientas, no encima de ella
      var t2 = document.getElementById('toolbar2');
      var y = t2 ? Math.max(r.bottom, t2.getBoundingClientRect().bottom) : r.bottom;
      // el Math.max evita que en ventanas bajas el ajuste lo empuje fuera de pantalla
      menu.style.left = Math.round(Math.max(6, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8))) + 'px';
      menu.style.top = Math.round(Math.max(6, Math.min(y + 6, window.innerHeight - menu.offsetHeight - 8))) + 'px';
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (abierto()) { cerrar(); return; }
      // se mide con visibility (no con hidden) para no pintar un cuadro en la posición equivocada
      menu.style.visibility = 'hidden';
      menu.hidden = false;
      ubicar();
      menu.style.visibility = '';
      btn.setAttribute('aria-expanded', 'true');
    });
    window.addEventListener('resize', function () { if (abierto()) ubicar(); });
    // cualquier acción del menú lo cierra, incluida "Modo libre" (es un interruptor: se reabre para verlo)
    menu.addEventListener('click', function (e) { if (e.target.closest('.dd-item')) cerrar(); });
    document.addEventListener('click', function (e) {
      if (abierto() && !menu.contains(e.target) && !btn.contains(e.target)) cerrar();
    });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
  }

  var OPCIONES_MENU = [
    { m: 'exportar',  ico: '⬇️', etq: 'Exportar proyecto' },
    { m: 'importar',  ico: '📥', etq: 'Importar proyecto' },
    { m: 'png',       ico: '🖼️', etq: 'Imagen del circuito' },
    { m: 'bom',       ico: '📋', etq: 'Lista de materiales' },
    { m: 'averia',    ico: '🔧', etq: 'Modo avería' },
    { m: 'recuperar', ico: '🕘', etq: 'Trabajo anterior' },
    { m: 'limpiar',   ico: '🧹', etq: 'Vaciar el área' },
    { m: 'aspecto',   ico: '🎨', etq: 'Aspecto de los componentes' },
    { m: 'instalar',  ico: '📲', etq: 'Instalar la app' },
    { m: 'acerca',    ico: 'ℹ️', etq: 'Acerca de' }
  ];

  /** Reparte un texto en renglones cortos (sin partir palabras) para que la
      etiqueta de la tarjeta caiga en varias líneas junto al icono grande. */
  function enRenglones(txt, max) {
    max = max || 11;
    var lineas = [], act = '';
    String(txt).split(/\s+/).forEach(function (p) {
      if (!act) act = p;
      else if ((act + ' ' + p).length <= max) act += ' ' + p;
      else { lineas.push(act); act = p; }
    });
    if (act) lineas.push(act);
    return lineas.map(CL.esc).join('<br>');
  }

  function menuExtra() {
    var h = '<div class="menu-grid">' + OPCIONES_MENU.map(function (o) {
      return '<button class="menu-tile" data-m="' + o.m + '" title="' + CL.esc(o.etq) + '">' +
        '<span class="mt-ico">' + o.ico + '</span><span class="mt-etq">' + enRenglones(o.etq) + '</span></button>';
    }).join('') + '</div>';
    CL.dialogo.abrir('Más opciones', h, [{ etq: 'Cerrar', clase: 'ghost' }], {
      ancho: true,
      alAbrir: function (m) {
        CL.$$('[data-m]', m).forEach(function (b) {
          b.addEventListener('click', function () {
            var a = b.dataset.m;
            if (a === 'exportar') { CL.proyectos.exportar(); CL.dialogo.cerrar(); }
            if (a === 'importar') { document.getElementById('fileImport').click(); }
            if (a === 'png') { exportarImagen(); CL.dialogo.cerrar(); }
            if (a === 'bom') { CL.dialogo.cerrar(); A.listaMateriales(); }
            if (a === 'averia') { CL.dialogo.cerrar(); CL.averias.abrir(); }
            if (a === 'recuperar') { CL.dialogo.cerrar(); CL.proyectos.dialogoBorradores(); }
            if (a === 'limpiar') { CL.dialogo.cerrar(); A.nuevoProyecto(); }
            if (a === 'aspecto') { CL.dialogo.cerrar(); CL.personalizar.galeria(); }
            if (a === 'instalar') instalar();
            if (a === 'acerca') acerca();
          });
        });
      }
    });
  }

  /* ------------------------------------------------------------
     Lista de materiales: lo que habria que comprar para montar
     este circuito de verdad. Se puede copiar o descargar en CSV.
     ------------------------------------------------------------ */
  A.listaMateriales = function () {
    var comps = CL.state.proj.components;
    if (!comps.length) {
      CL.toast('info', 'No hay componentes', 'Monta algo primero.');
      return;
    }
    var mapa = {};
    comps.forEach(function (c) {
      var def = CL.catalogo[c.type];
      if (!def) return;
      var nombre = CL.nombreComp(c);
      var detalle = def.etiquetaValor ? def.etiquetaValor(c) : '';
      var clave = c.type + '|' + nombre + '|' + detalle;
      if (!mapa[clave]) mapa[clave] = { n: 0, nombre: nombre, detalle: detalle, cat: def.cat, emoji: def.emoji || '' };
      mapa[clave].n++;
    });
    var filas = Object.keys(mapa).map(function (k) { return mapa[k]; });
    filas.sort(function (a, b) { return a.cat === b.cat ? b.n - a.n : (a.cat < b.cat ? -1 : 1); });

    var metros = CL.round(CL.state.proj.wires.reduce(function (s, w) {
      var pts = CL.wires.vertices(w);
      if (!pts) return s;
      var d = 0;
      for (var i = 1; i < pts.length; i++) d += CL.dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      return s + d / 12 * 2.54;                       // 1 paso = 2,54 mm reales
    }, 0) / 10, 1);

    var h = '<table class="bom"><thead><tr><th>Cant.</th><th>Componente</th><th>Valor</th></tr></thead><tbody>';
    filas.forEach(function (f) {
      h += '<tr><td class="n">' + f.n + '</td><td>' + f.emoji + ' ' + CL.esc(f.nombre) + '</td>' +
           '<td class="v">' + CL.esc(f.detalle) + '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<div class="bom-pie">' + CL.state.proj.wires.length + ' cables (≈ ' + metros + ' cm de cable en total)</div>';

    var texto = 'Cantidad;Componente;Valor\n' + filas.map(function (f) {
      return f.n + ';' + f.nombre + ';' + f.detalle;
    }).join('\n') + '\n' + CL.state.proj.wires.length + ';Cable de conexion;' + metros + ' cm';

    CL.dialogo.abrir('📋 Lista de materiales', h, [
      { etq: 'Copiar', clase: '', mantener: true, fn: function () {
          try {
            navigator.clipboard.writeText(texto.replace(/;/g, '\t'));
            CL.toast('ok', 'Copiado', 'Pégalo en una hoja de cálculo o en el cuaderno.');
          } catch (e) { CL.toast('warn', 'No se pudo copiar', 'Usa el botón de descargar.'); }
        } },
      { etq: '⬇ Descargar CSV', clase: '', mantener: true, fn: function () {
          CL.download((CL.state.proj.name || 'circuito') + ' - materiales.csv', '\ufeff' + texto, 'text/csv;charset=utf-8');
        } },
      { etq: 'Cerrar', clase: 'primary' }
    ]);
  };

  /* Un componente que se quema no es un fallo de la aplicacion: es LA leccion. */
  CL.on('comp:quemado', function (c) {
    var nombre = CL.nombreComp(c);
    CL.mensaje('err', nombre + ' se quemó', 'Le pasó mucha más corriente de la que aguanta (más de 45 mA).',
      'Añade una resistencia en serie que limite la corriente y pulsa «Reiniciar circuito» para reponerlo. ' +
      'Con 5 V y un LED rojo: R = (5 − 2) / 0,02 = 150 Ω, se usa una de 220 Ω.');
    CL.toast('err', nombre + ' se quemó', 'Falta la resistencia limitadora.');
  });

  function acerca() {
    CL.dialogo.abrir('Acerca de CircuitLab',
      '<p><b>CircuitLab</b> es un laboratorio virtual de electrónica y robótica para aprender ' +
      'protoboard, circuitos, Arduino y micro:bit experimentando.</p>' +
      '<p>Funciona <b>100 % sin internet</b>: no usa librerías externas, ni imágenes de la red, ni servidores. ' +
      'Todo lo que ves (protoboard, componentes, animaciones) está dibujado con SVG desde el propio código.</p>' +
      '<p>El simulador resuelve el circuito con <b>análisis nodal</b> real: las conexiones que hagas tienen ' +
      'consecuencias eléctricas de verdad.</p>' +
      '<p style="color:var(--text-mute);font-size:12px">Versión 1.0 · Proyecto educativo</p>',
      [{ etq: 'Cerrar', clase: 'primary' }]);
  }

  var promptInstalar = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    promptInstalar = e;
  });
  function instalar() {
    if (promptInstalar) {
      promptInstalar.prompt();
      promptInstalar = null;
      CL.dialogo.cerrar();
    } else {
      CL.dialogo.info('Instalar la aplicación',
        '<p>Si tu navegador lo permite, verás un icono de instalación en la barra de direcciones, ' +
        'o puedes usar el menú del navegador → <b>Instalar aplicación</b> / <b>Añadir a la pantalla de inicio</b>.</p>' +
        '<p>Una vez instalada funciona sin internet, como cualquier programa del computador.</p>');
    }
  }

  /* Estilos mínimos que se incrustan en el SVG exportado para que se vea
     igual al abrirlo fuera de la aplicación (Word, visor de imágenes…). */
  var ESTILOS_EXPORT =
    '.bb-base{fill:#e4e4e4;stroke:#cdcdcd;stroke-width:1}.bb-rail-strip{fill:#e9e9e9}.bb-edge{stroke:#d0d0d0;stroke-width:.9}.bb-rings circle{fill:#cfcfcf}' +
    '.bb-hole{fill:#3a3a3a}' +
    '.bb-groove{fill:#d9d9d9}' +
    '.bb-rail-line{stroke-width:1.1;opacity:.75}.bb-rail-line.pos{stroke:#dc2626}.bb-rail-line.neg{stroke:#333}' +
    '.bb-txt{font-family:sans-serif;font-size:5px;fill:#6f6f6f}' +
    '.bb-sign{font-family:sans-serif;font-size:8px;font-weight:700}.bb-sign.pos{fill:#dc2626}.bb-sign.neg{fill:#333}' +
    '.bb-net-path{display:none}' +
    '.wire{fill:none;stroke-width:3.1;stroke-linecap:round}.wire-hit,.flow,.selring{display:none}' +
    '.wire-end{fill:#cbd5e1;stroke:#0b1220;stroke-width:.6}' +
    '.pin-hit{fill:none}.pin-dot{fill:#8fa3c4;stroke:#0b1220;stroke-width:.6}' +
    '.pin.pos .pin-dot{fill:#f87171}.pin.neg .pin-dot{fill:#94a3b8}' +
    '.board-pcb{stroke-width:1}.board-txt{font-family:sans-serif;font-size:6px;fill:#e2e8f0}' +
    '.board-txt.dark{fill:#0f172a}.board-hdr{fill:#0f172a;stroke:#475569;stroke-width:.4}' +
    '.mb-led{fill:#3a0d12}.mb-btn{fill:#0f172a;stroke:#94a3b8;stroke-width:.8}' +
    '.polarity{font-family:sans-serif;font-size:8.5px;font-weight:700}' +
    '.polarity.p{fill:#f87171}.polarity.n{fill:#94a3b8}' +
    '.value{font-family:monospace;font-size:9px;fill:#0e7490}.label{font-family:sans-serif;font-size:9px;fill:#64748b}';

  var PROPS_SVG = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
                   'stroke-dasharray', 'opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'display'];
  /** Copia los estilos calculados del SVG en pantalla a los atributos del clon. */
  function inlineEstilos(origen, clon) {
    var a = origen.querySelectorAll('*'), b = clon.querySelectorAll('*');
    var sobran = [];
    for (var i = 0; i < a.length && i < b.length; i++) {
      var cs = window.getComputedStyle(a[i]);
      // lo que no se ve en pantalla se elimina del archivo: si solo se marcara
      // display="none", los visores que ignoran ese atributo lo pintarían en negro
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) { sobran.push(b[i]); continue; }
      for (var k = 0; k < PROPS_SVG.length; k++) {
        var p = PROPS_SVG[k], v = cs.getPropertyValue(p);
        if (!v || v === 'auto' || v === 'normal' || (v === 'none' && p !== 'fill' && p !== 'stroke')) continue;
        // los colores transparentes se guardan como "none": hay visores que
        // interpretan rgba(0,0,0,0) como negro sólido
        if (/^rgba\([^)]*,\s*0\s*\)$/.test(v) || v === 'transparent') v = 'none';
        b[i].setAttribute(p, v);
      }
      b[i].removeAttribute('class');
      b[i].removeAttribute('filter');          // los filtros no siempre se admiten fuera del navegador
    }
    sobran.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
  }

  function exportarImagen() {
    try {
      if (!CL.state.proj.components.length) {
        CL.toast('info', 'No hay nada que exportar', 'Coloca primero algún componente.');
        return;
      }
      var svg = document.getElementById('stage').cloneNode(true);
      // los estilos vienen de hojas CSS externas: se pasan a atributos del propio
      // SVG para que el archivo se vea igual fuera de la aplicación.
      // Debe hacerse ANTES de quitar nodos, porque recorre los dos árboles en paralelo.
      inlineEstilos(document.getElementById('stage'), svg);

      // encuadre ajustado al circuito (sin la cuadrícula de fondo)
      var c1 = document.getElementById('layComps').getBBox();
      var c2 = document.getElementById('layWires').getBBox();
      var x1 = Math.min(c1.x, c2.width ? c2.x : c1.x) - 26;
      var y1 = Math.min(c1.y, c2.height ? c2.y : c1.y) - 26;
      var x2 = Math.max(c1.x + c1.width, c2.width ? c2.x + c2.width : 0) + 26;
      var y2 = Math.max(c1.y + c1.height, c2.height ? c2.y + c2.height : 0) + 26;
      var an = Math.round(x2 - x1), al = Math.round(y2 - y1);

      svg.setAttribute('xmlns', CL.SVGNS);
      svg.setAttribute('viewBox', Math.round(x1) + ' ' + Math.round(y1) + ' ' + an + ' ' + al);
      svg.setAttribute('width', an);
      svg.setAttribute('height', al);
      var vp = svg.querySelector('#viewport');
      if (vp) vp.removeAttribute('transform');
      var grid = svg.querySelector('#gridRect');
      if (grid) grid.parentNode.removeChild(grid);

      var fondo = document.body.classList.contains('light') ? '#f7f9fd' : '#0d1626';
      svg.insertAdjacentHTML('afterbegin',
        '<style>' + ESTILOS_EXPORT + '</style>' +
        '<rect x="' + Math.round(x1) + '" y="' + Math.round(y1) + '" width="' + an + '" height="' + al + '" fill="' + fondo + '"/>');

      var txt = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg);
      CL.download((CL.state.proj.name || 'circuito').replace(/[^\w\sáéíóúñÁÉÍÓÚÑ-]/g, '') + '.svg', txt, 'image/svg+xml');
      CL.toast('ok', 'Imagen guardada', 'Se descargó el circuito en formato SVG (' + an + '×' + al + ').');
    } catch (e) {
      CL.toast('err', 'No se pudo exportar la imagen', e.message);
    }
  }

  /* ------------------------------------------------------------
     Atajos de teclado
     ------------------------------------------------------------ */
  function teclas(e) {
    var enCampo = /input|textarea|select/i.test((e.target.tagName || ''));
    if (enCampo) return;
    var ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); CL.state.deshacer(); return; }
    if (ctrl && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); CL.state.rehacer(); return; }
    if (ctrl && (e.key === 's' || e.key === 'S')) { e.preventDefault(); CL.proyectos.guardar(); return; }
    if (ctrl && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); CL.ws.duplicarSeleccion(); return; }
    if (ctrl && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); CL.sel.todo(); return; }
    if (ctrl && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); A.nuevoProyecto(); return; }
    if (ctrl && (e.key === 'o' || e.key === 'O')) { e.preventDefault(); A.abrirDialogo(); return; }
    switch (e.key) {
      case 'Delete': case 'Backspace': CL.ws.eliminarSeleccion(); break;
      case 'r': case 'R': CL.ws.rotarSeleccion(); break;
      case 'h': case 'H': if (!ctrl) CL.ws.voltearSeleccion('h'); break;
      case 'v': case 'V': if (!ctrl) CL.ws.voltearSeleccion('v'); break;
      case 'F5': e.preventDefault(); if (CL.runtime.corriendo) A.detener(); else A.ejecutar(); break;
      case 'F8': e.preventDefault(); A.analizar(false); break;
      case 'F1': e.preventDefault(); ayuda(); break;
      case 'Escape':
        if (CL.ws.cancelarTodo()) break;          // había un cable trazándose
        if (CL.dialogo.abierto()) CL.dialogo.cerrar();
        else if (CL.dialogo.cajonAbierto()) CL.dialogo.cerrarCajon();
        else if (CL.codigo.abierto()) CL.codigo.cerrar();
        else CL.state.limpiarSeleccion();
        break;
      case '+': case '=': CL.zoomEn(1.2); break;
      case '-': CL.zoomEn(1 / 1.2); break;
      case '0': CL.ajustarVista(); break;
    }
  }

  /* ------------------------------------------------------------
     Estado de la barra según la simulación
     ------------------------------------------------------------ */
  CL.on('sim:estado', function (e) {
    // el mismo botón cambia de nombre y de aspecto según el estado
    var btn = document.getElementById('btnRun');
    if (!btn) return;
    btn.classList.toggle('detener', e.corriendo);
    btn.querySelector('span').textContent = e.corriendo ? '■' : '▶';
    btn.querySelector('i').textContent = e.corriendo ? 'Detener simulación' : 'Iniciar simulación';
    btn.title = e.corriendo ? 'Detener la simulación (F5)' : 'Iniciar la simulación (F5)';
  });
  CL.on('proyecto:sucio', function () {
    var el = document.getElementById('projState');
    el.textContent = CL.state.dirty ? 'sin guardar' : 'guardado';
    el.classList.toggle('dirty', CL.state.dirty);
    document.getElementById('btnUndo').disabled = !CL.state.puedeDeshacer();
    document.getElementById('btnRedo').disabled = !CL.state.puedeRehacer();
  });
  CL.on('circuito:cambio', function () {
    document.body.classList.toggle('has-content', CL.state.proj.components.length > 0);
  });

  /* ------------------------------------------------------------
     Service worker (modo sin conexión)
     ------------------------------------------------------------ */
  function registrarSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:') return;         // sin servidor no hace falta
    if (/[?&]dev=1/.test(location.search)) {           // modo desarrollo: sin caché
      navigator.serviceWorker.getRegistrations().then(function (rs) {
        rs.forEach(function (r) { r.unregister(); });
      });
      if (window.caches) caches.keys().then(function (k) { k.forEach(function (n) { caches.delete(n); }); });
      return;
    }
    // Si entra en servicio una versión nueva, se recarga una sola vez para
    // que el equipo no se quede con la copia antigua guardada en caché.
    var recargando = false;
    var habiaControlador = !!navigator.serviceWorker.controller;   // en la 1ª visita no hay: no se recarga
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (recargando || !habiaControlador) return;
      recargando = true;
      location.reload();
    });
    navigator.serviceWorker.register('service-worker.js').then(function (reg) {
      reg.update();
      if (reg.waiting) reg.waiting.postMessage('actualizar');
    }).catch(function () { /* sin conexión o sin permisos */ });
  }

  /* ------------------------------------------------------------
     Abrir un diseño del repositorio de Videotutoriales
     (d-Robotica.php): index.html?abrir=uploads/robotica_proyectos/p<id>/clab_<hex>.json
     Solo se aceptan archivos de esa carpeta, nunca URLs externas.
     ------------------------------------------------------------ */
  function abrirDesdeRepositorio() {
    var m = /[?&]abrir=([^&#]+)/.exec(location.search);
    if (!m) return;
    var ruta = '';
    try { ruta = decodeURIComponent(m[1]); } catch (e) { /* ruta mal codificada */ }
    if (!/^uploads\/robotica_proyectos\/p\d+\/clab_[a-f0-9]{16}\.json$/.test(ruta)) {
      CL.toast('err', 'No se pudo abrir el diseño', 'La ruta no pertenece al repositorio de proyectos.');
      return;
    }
    fetch('../../../../' + ruta, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (obj) {
      if (!obj || !obj.components) throw new Error('formato');
      obj.id = CL.uid('prj');
      A.cargarProyecto(obj);
      CL.toast('ok', 'Diseño abierto', '“' + (obj.name || 'Proyecto') + '” desde el repositorio de Videotutoriales.');
    }).catch(function () {
      CL.toast('err', 'No se pudo abrir el diseño', 'El archivo no existe o no es un proyecto de CircuitLab.');
    });
  }

  /* ------------------------------------------------------------
     Arranque
     ------------------------------------------------------------ */
  function iniciar() {
    tema(CL.pref('tema', 'claro'));          // como Tinkercad: mesa de trabajo clara

    // La app abre con la mesa de trabajo despejada: los dos paneles laterales
    // (Componentes e Inspector) y la consola de Mensajes arrancan plegados.
    // Se recuperan con las pestañas de los bordes y con el botón ▴ de la consola.
    document.body.classList.add('hide-left', 'hide-right', 'console-min');

    CL.ws.init();
    CL.codigo.init();
    CL.asistente.init();
    CL.retos.init();
    CL.osciloscopio.iniciar();
    CL.multimetro.iniciar();
    CL.sonar.iniciar();
    CL.paneles.pintarPaleta();
    conectarBarra();
    // ?actividad=ID (enlace copiado del repositorio) se abre en cuanto se sabe
    // si hay intranet y quién es: docente o estudiante
    CL.cuenta.iniciar().then(function () { CL.proyectos.abrirDeURL(); });
    window.addEventListener('keydown', teclas);

    // Siempre arranca EN BLANCO: no se recarga el último trabajo. Si hiciera
    // falta, sigue a mano en «Más opciones → Recuperar trabajo anterior».
    CL.centrarEn(0, 0);
    abrirDesdeRepositorio();

    modo(CL.pref('modo', 'libre'));

    document.getElementById('btnConsolaToggle').textContent = '▴';
    pestanasPaneles();
    vista('circuito');

    CL.circuito.resolver(0.016);
    CL.runtime.arrancarReloj();
    registrarSW();

    document.getElementById('btnUndo').disabled = true;
    document.getElementById('btnRedo').disabled = true;

    if (!CL.pref('visto', false)) {
      CL.setPref('visto', true);
      setTimeout(function () {
        CL.dialogo.abrir('¡Bienvenido a CircuitLab! 🔌',
          '<p>Este es tu laboratorio virtual de electrónica y robótica. Aquí puedes armar circuitos ' +
          'de verdad sobre una protoboard, programarlos y ver qué ocurre.</p>' +
          '<p><b>¿Por dónde empezar?</b></p>' +
          '<ul style="padding-left:18px;line-height:1.8">' +
          '<li><b>Curso</b> 📚: 10 niveles desde cero.</li>' +
          '<li><b>Ejemplos</b> 🧪: 20 circuitos ya armados para explorar.</li>' +
          '<li><b>Ejercicios</b> 🎯 y <b>Retos</b> ⏱️: para practicar y ganar puntos.</li></ul>',
          [{ etq: 'Explorar por mi cuenta', clase: 'ghost' },
           { etq: 'Empezar el curso', clase: 'primary', fn: function () { CL.lecciones.abrir(); } }]);
      }, 700);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

}(window.CL));
