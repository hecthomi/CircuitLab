/* ============================================================
   CircuitLab — almacenamiento local
   IndexedDB para los proyectos y localStorage como respaldo
   (así también funciona abriendo el archivo con doble clic).
   ============================================================ */
(function (CL) {
  'use strict';

  var P = {};
  CL.proyectos = P;

  var DB_NOMBRE = 'circuitlab', DB_VER = 1;
  var db = null, sinIDB = false;

  /* ------------------------------------------------------------
     Capa de acceso
     ------------------------------------------------------------ */
  function abrirDB() {
    return new Promise(function (ok, fallo) {
      if (db) return ok(db);
      if (sinIDB || !window.indexedDB) { sinIDB = true; return fallo('sin indexeddb'); }
      var req;
      try { req = indexedDB.open(DB_NOMBRE, DB_VER); }
      catch (e) { sinIDB = true; return fallo(e); }
      req.onupgradeneeded = function (e) {
        var d = e.target.result;
        if (!d.objectStoreNames.contains('proyectos')) d.createObjectStore('proyectos', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('datos')) d.createObjectStore('datos', { keyPath: 'clave' });
      };
      req.onsuccess = function (e) { db = e.target.result; ok(db); };
      req.onerror = function () { sinIDB = true; fallo(req.error); };
      setTimeout(function () { if (!db) { sinIDB = true; fallo('tiempo agotado'); } }, 2500);
    });
  }

  function tx(almacen, modo) {
    return abrirDB().then(function (d) { return d.transaction(almacen, modo).objectStore(almacen); });
  }

  /* --- respaldo en localStorage --- */
  var LS = 'circuitlab:proy:';
  function lsListar() {
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.indexOf(LS) === 0) {
          try { out.push(JSON.parse(localStorage.getItem(k))); } catch (e) {}
        }
      }
    } catch (e) {}
    return out;
  }
  function lsGuardar(p) { try { localStorage.setItem(LS + p.id, JSON.stringify(p)); return true; } catch (e) { return false; } }
  function lsBorrar(id) { try { localStorage.removeItem(LS + id); } catch (e) {} }

  /* ------------------------------------------------------------
     Operaciones con proyectos
     ------------------------------------------------------------ */
  P.listar = function () {
    return abrirDB().then(function () {
      return new Promise(function (ok) {
        tx('proyectos', 'readonly').then(function (st) {
          var req = st.getAll();
          req.onsuccess = function () { ok(req.result || []); };
          req.onerror = function () { ok(lsListar()); };
        }).catch(function () { ok(lsListar()); });
      });
    }).catch(function () { return lsListar(); });
  };

  P.guardarObjeto = function (p) {
    p.modified = Date.now();
    lsGuardar(p);                                  // siempre deja copia rápida
    return tx('proyectos', 'readwrite').then(function (st) {
      return new Promise(function (ok) {
        var r = st.put(p);
        r.onsuccess = function () { ok(true); };
        r.onerror = function () { ok(false); };
      });
    }).catch(function () { return false; });
  };

  /* ------------------------------------------------------------
     ¿Dónde se guarda?
       'docente'    → carpeta de CircuitLab en el servidor (archivos, no
                      navegador: sobrevive a borrar el historial).
       'estudiante' → archivo en su PC (y en su cuenta si inició sesión).
                      NO aparece en el «Repositorio de Actividades».
       'local'      → sin servidor (USB, file://): como siempre, en este
                      navegador.
     ------------------------------------------------------------ */
  P.modo = function () {
    var C = CL.cuenta;
    if (!C || !C.enLinea()) return 'local';
    return C.estado.docente ? 'docente' : 'estudiante';
  };

  function proyectoActual() {
    var p = CL.state.serializar();
    p.name = (document.getElementById('projName').value || 'Proyecto sin título').trim();
    CL.state.proj.name = p.name;
    CL.guardarVista();
    p.view = CL.state.proj.view;
    p.modified = Date.now();
    return p;
  }

  P.guardar = function () {
    var p = proyectoActual();
    var modo = P.modo();
    if (modo === 'docente') {
      return P.carpeta.guardar(p).then(function (j) {
        if (!j || !j.ok) {
          CL.toast('err', 'No se pudo guardar en la carpeta', (j && j.error) || 'Sin respuesta del servidor.');
          return false;
        }
        CL.state.marcarLimpio();
        CL.sfx.pop();
        CL.toast('ok', 'Guardado en la carpeta de CircuitLab',
          '“' + p.name + '” · ' + (j.ficha && j.ficha.visible ? 'visible para los estudiantes' : 'oculto para los estudiantes'));
        return true;
      });
    }
    if (modo === 'estudiante') {
      return P.guardarEnPC(p, false).then(function (ok) {
        if (!ok) return false;
        CL.state.marcarLimpio();
        CL.sfx.pop();
        if (CL.cuenta.hay()) CL.cuenta.subirActual(false);
        return true;
      });
    }
    return P.guardarObjeto(p).then(function () {
      CL.state.marcarLimpio();
      CL.setPref('ultimoProyecto', p.id);
      CL.sfx.pop();
      CL.toast('ok', 'Proyecto guardado', '“' + p.name + '” quedó guardado en este computador.');
      return true;
    });
  };

  P.guardarComo = function () {
    CL.dialogo.pedirTexto('Guardar como', 'Nombre del nuevo proyecto:',
      (CL.state.proj.name || 'Proyecto') + ' (copia)', function (nombre) {
        if (!nombre) return;
        CL.state.proj.id = CL.uid('prj');
        CL.state.proj.name = nombre;
        document.getElementById('projName').value = nombre;
        if (P.modo() === 'estudiante') {
          P.guardarEnPC(proyectoActual(), true).then(function (ok) { if (ok) CL.state.marcarLimpio(); });
          return;
        }
        P.guardar();
      });
  };

  /** Guarda el trabajo actual como archivo en el PC (eligiendo nombre/carpeta). */
  P.guardarActualEnPC = function () { return P.guardarEnPC(proyectoActual(), true); };

  /* ------------------------------------------------------------
     Archivo en el PC (.circuitlab.json)
     Con la API de archivos del navegador (Chrome/Edge en localhost o
     https) se elige la carpeta y los siguientes «Guardar» sobrescriben
     ese mismo archivo. En la red del aula (http) el navegador no la
     ofrece y se descarga el archivo.
     ------------------------------------------------------------ */
  var manejadores = {};           // id del proyecto → FileSystemFileHandle
  function nombreArchivo(p) {
    return (p.name || 'proyecto').replace(/[^\w\s\-áéíóúñÁÉÍÓÚÑ]/g, '').trim().replace(/\s+/g, '_') + '.circuitlab.json';
  }
  var TIPOS = [{ description: 'Proyecto de CircuitLab', accept: { 'application/json': ['.json'] } }];

  P.guardarEnPC = function (p, pedirOtro) {
    var texto = JSON.stringify(p, null, 2);
    var nombre = nombreArchivo(p);
    if (window.showSaveFilePicker && window.isSecureContext) {
      var h = !pedirOtro && manejadores[p.id];
      var elegir = h ? Promise.resolve(h) : window.showSaveFilePicker({ suggestedName: nombre, types: TIPOS });
      return elegir.then(function (fh) {
        manejadores[p.id] = fh;
        return fh.createWritable().then(function (w) {
          return w.write(texto).then(function () { return w.close(); });
        }).then(function () {
          CL.toast('ok', 'Guardado en tu PC', fh.name + ' — ábrelo cuando quieras con «Abrir archivo del PC».');
          return true;
        });
      }).catch(function (e) {
        if (e && e.name === 'AbortError') return false;            // canceló el diálogo
        return descargar(texto, nombre);
      });
    }
    return Promise.resolve(descargar(texto, nombre));
  };
  function descargar(texto, nombre) {
    if (CL.download(nombre, texto)) {
      CL.toast('ok', 'Guardado en tu PC', 'Se descargó «' + nombre + '» (carpeta Descargas). Ábrelo cuando quieras con «Abrir archivo del PC».');
      return true;
    }
    CL.toast('err', 'No se pudo guardar el archivo');
    return false;
  }

  /** Abre un .circuitlab.json del PC. */
  P.abrirDePC = function () {
    if (window.showOpenFilePicker && window.isSecureContext) {
      window.showOpenFilePicker({ types: TIPOS, multiple: false }).then(function (hs) {
        var fh = hs[0];
        return fh.getFile().then(function (f) { return f.text(); }).then(function (t) {
          var p = cargarTexto(t, fh.name);
          if (p) manejadores[p.id] = fh;           // «Guardar» sobrescribirá este mismo archivo
        });
      }).catch(function (e) {
        if (e && e.name === 'AbortError') return;
        document.getElementById('fileImport').click();
      });
      return;
    }
    document.getElementById('fileImport').click();
  };
  function cargarTexto(texto, nombre) {
    try {
      var obj = JSON.parse(texto);
      if (!obj || !obj.components) throw new Error('formato');
      if (!obj.id) obj.id = CL.uid('prj');
      CL.app.cargarProyecto(obj);
      CL.ajustarVista();
      CL.state.marcarLimpio();
      CL.toast('ok', 'Proyecto abierto', '“' + (obj.name || nombre || 'Proyecto') + '”');
      return obj;
    } catch (e) {
      CL.toast('err', 'Archivo no válido', 'Ese archivo no es un proyecto de CircuitLab.');
      return null;
    }
  }

  /* ------------------------------------------------------------
     Enlace directo a una actividad del repositorio:  index.html?actividad=ID
     ------------------------------------------------------------ */
  P.urlActividad = function (id) {
    var u = new URL(location.href);
    u.search = ''; u.hash = '';
    // desde el PC-A se suele entrar por localhost: el enlace debe llevar la IP
    // del servidor en la red del aula para que abra en los PCs de los estudiantes
    var lan = CL.cuenta && CL.cuenta.estado && CL.cuenta.estado.lan;
    if (lan && /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/i.test(u.hostname)) u.hostname = lan;
    u.searchParams.set('actividad', id);
    return u.toString();
  };

  /** Abre la actividad indicada en la URL (?actividad=ID) al arrancar. */
  P.abrirDeURL = function () {
    var id = new URLSearchParams(location.search).get('actividad');
    if (!id) return;
    // se quita de la barra: al recargar, la app vuelve a abrir en blanco
    try {
      var u = new URL(location.href);
      u.searchParams.delete('actividad');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) { /* navegador antiguo */ }
    if (P.modo() === 'local') {
      CL.toast('err', 'No se pudo abrir la actividad', 'Este enlace necesita la conexión con la intranet.');
      return;
    }
    P.carpeta.abrir(id).then(function (ok) {
      if (ok) CL.toast('ok', 'Actividad abierta', '“' + (CL.state.proj.name || 'Actividad') + '” desde el Repositorio de Actividades.');
    });
  };

  /* ------------------------------------------------------------
     Carpeta de CircuitLab en el servidor (server/api.php → server/datos)
     ------------------------------------------------------------ */
  P.carpeta = {
    listar: function () { return CL.cuenta.api('carpeta_listar'); },
    abrir: function (id) {
      return CL.cuenta.api('carpeta_abrir', { id: id }).then(function (j) {
        if (!j || !j.ok) { CL.toast('err', 'No se pudo abrir', (j && j.error) || ''); return false; }
        CL.app.cargarProyecto(j.proyecto);
        CL.ajustarVista();
        CL.state.marcarLimpio();
        // el estudiante trabaja sobre una COPIA: al guardar va a su PC
        if (P.modo() === 'estudiante') CL.state.proj.id = CL.uid('prj');
        return true;
      });
    },
    guardar: function (p) { return CL.cuenta.api('carpeta_guardar', { proyecto: p }); },
    visible: function (id, v) { return CL.cuenta.api('carpeta_visible', { id: id, visible: !!v }); },
    borrar: function (id) { return CL.cuenta.api('carpeta_borrar', { id: id }); }
  };

  P.abrirId = function (id) {
    return P.listar().then(function (lista) {
      var p = lista.filter(function (x) { return x.id === id; })[0];
      if (!p) { CL.toast('err', 'No se encontró el proyecto'); return false; }
      CL.app.cargarProyecto(p);
      return true;
    });
  };

  P.eliminar = function (id) {
    lsBorrar(id);
    return tx('proyectos', 'readwrite').then(function (st) {
      return new Promise(function (ok) {
        var r = st.delete(id);
        r.onsuccess = function () { ok(true); };
        r.onerror = function () { ok(false); };
      });
    }).catch(function () { return true; });
  };

  P.duplicar = function (id) {
    return P.listar().then(function (lista) {
      var p = lista.filter(function (x) { return x.id === id; })[0];
      if (!p) return;
      var copia = CL.clone(p);
      copia.id = CL.uid('prj');
      copia.name = p.name + ' (copia)';
      copia.created = Date.now();
      return P.guardarObjeto(copia);
    });
  };

  /* ------------------------------------------------------------
     Importar / exportar
     ------------------------------------------------------------ */
  P.exportar = function () {
    var p = CL.state.serializar();
    p.name = (document.getElementById('projName').value || p.name);
    var nombre = p.name.replace(/[^\w\s\-áéíóúñÁÉÍÓÚÑ]/g, '').replace(/\s+/g, '_') + '.circuitlab.json';
    if (CL.download(nombre, JSON.stringify(p, null, 2))) {
      CL.toast('ok', 'Proyecto exportado', 'Se descargó el archivo ' + nombre);
    } else {
      CL.toast('err', 'No se pudo descargar', 'Copia el proyecto desde “Guardar” en su lugar.');
    }
  };

  P.importar = function (archivo) {
    var fr = new FileReader();
    fr.onload = function () {
      var obj = cargarTexto(fr.result, archivo.name);
      // sin servidor se conserva la costumbre de dejar copia en la lista local
      if (obj && P.modo() === 'local') P.guardarObjeto(CL.state.serializar());
    };
    fr.readAsText(archivo);
  };

  /* ------------------------------------------------------------
     Datos generales (progreso, actividades del docente…)
     ------------------------------------------------------------ */
  P.leerDato = function (clave, porDefecto) {
    return tx('datos', 'readonly').then(function (st) {
      return new Promise(function (ok) {
        var r = st.get(clave);
        r.onsuccess = function () { ok(r.result ? r.result.valor : CL.pref('dato:' + clave, porDefecto)); };
        r.onerror = function () { ok(CL.pref('dato:' + clave, porDefecto)); };
      });
    }).catch(function () { return CL.pref('dato:' + clave, porDefecto); });
  };
  P.escribirDato = function (clave, valor) {
    CL.setPref('dato:' + clave, valor);
    return tx('datos', 'readwrite').then(function (st) {
      return new Promise(function (ok) {
        var r = st.put({ clave: clave, valor: valor });
        r.onsuccess = function () { ok(true); };
        r.onerror = function () { ok(false); };
      });
    }).catch(function () { return false; });
  };

  /* ------------------------------------------------------------
     Progreso del estudiante (rápido: se guarda en localStorage)
     ------------------------------------------------------------ */
  var PROG = null;
  P.progreso = {
    datos: function () {
      if (!PROG) {
        PROG = CL.pref('progreso', { xp: 0, lecciones: {}, ejercicios: {}, retos: {}, examenes: {}, nombre: '' });
        PROG.lecciones = PROG.lecciones || {};
        PROG.ejercicios = PROG.ejercicios || {};
        PROG.retos = PROG.retos || {};
      }
      return PROG;
    },
    guardar: function () {
      CL.setPref('progreso', P.progreso.datos());
      P.escribirDato('progreso', P.progreso.datos());
      CL.emit('progreso:cambio', P.progreso.datos());
    },
    sumarXP: function (n) {
      var d = P.progreso.datos();
      d.xp = (d.xp || 0) + n;
      P.progreso.guardar();
      return d.xp;
    },
    completar: function (tipo, id, puntos, extra) {
      var d = P.progreso.datos();
      var mapa = d[tipo] || (d[tipo] = {});
      var previo = mapa[id];
      mapa[id] = Object.assign({ hecho: true, puntos: Math.max(puntos || 0, (previo && previo.puntos) || 0), fecha: Date.now() }, extra || {});
      if (!previo) d.xp = (d.xp || 0) + (puntos || 0);
      P.progreso.guardar();
      return mapa[id];
    },
    hecho: function (tipo, id) {
      var d = P.progreso.datos();
      return !!(d[tipo] && d[tipo][id] && d[tipo][id].hecho);
    },
    nivel: function () {
      var xp = P.progreso.datos().xp || 0;
      if (xp >= 900) return { n: 5, nombre: 'Experto', estrellas: '⭐⭐⭐⭐⭐' };
      if (xp >= 600) return { n: 4, nombre: 'Avanzado', estrellas: '⭐⭐⭐⭐' };
      if (xp >= 350) return { n: 3, nombre: 'Intermedio', estrellas: '⭐⭐⭐' };
      if (xp >= 150) return { n: 2, nombre: 'Básico', estrellas: '⭐⭐' };
      return { n: 1, nombre: 'Principiante', estrellas: '⭐' };
    },
    reiniciar: function () {
      PROG = { xp: 0, lecciones: {}, ejercicios: {}, retos: {}, examenes: {}, nombre: PROG ? PROG.nombre : '' };
      P.progreso.guardar();
    }
  };

  /* ------------------------------------------------------------
     Autoguardado del trabajo en curso
     ------------------------------------------------------------ */
  var MAX_BORRADORES = 4;
  var ultimoRespaldo = 0;

  P.autoguardar = CL.debounce(function () {
    try {
      CL.guardarVista();
      var p = CL.state.serializar();
      p.guardado = Date.now();
      CL.setPref('borrador', p);
      // Ademas del borrador vivo se conserva una foto cada 2 minutos.
      // Asi, si alguien pulsa "Nuevo" sin querer o el equipo se apaga a mitad
      // de la clase, el trabajo de hace un rato sigue estando ahi.
      if (Date.now() - ultimoRespaldo > 120000 && p.components && p.components.length) {
        ultimoRespaldo = Date.now();
        var hist = CL.pref('borradores', []);
        if (!Array.isArray(hist)) hist = [];
        hist.unshift(p);
        // solo una foto por proyecto: la mas reciente
        var vistos = {};
        hist = hist.filter(function (b) {
          if (vistos[b.id]) return false;
          vistos[b.id] = true;
          return true;
        }).slice(0, MAX_BORRADORES);
        try { CL.setPref('borradores', hist); } catch (e) { /* cuota llena */ }
      }
    } catch (e) {}
  }, 900);

  P.recuperarBorrador = function () { return CL.pref('borrador', null); };
  P.borradores = function () {
    var h = CL.pref('borradores', []);
    return Array.isArray(h) ? h : [];
  };

  /** Ventana para volver a una foto anterior del trabajo. */
  P.dialogoBorradores = function () {
    var lista = P.borradores();
    var actual = P.recuperarBorrador();
    if (actual && actual.components && actual.components.length &&
        !lista.some(function (b) { return b.id === actual.id; })) lista = [actual].concat(lista);
    var h;
    if (!lista.length) {
      h = '<div class="empty-note">Todavia no hay copias automaticas. Se guarda una foto del trabajo cada dos minutos.</div>';
    } else {
      h = '<p>Copias automaticas de este computador. Abrir una <b>no borra</b> las demas.</p><div class="proj-list">';
      lista.forEach(function (b, i) {
        h += '<div class="proj-item"><div class="pi-i">\uD83D\uDD58</div>' +
          '<div class="pi-t"><b>' + CL.esc(b.name || 'Sin titulo') + '</b>' +
          '<small>' + (b.components || []).length + ' componentes - ' +
          (b.guardado ? CL.fecha(b.guardado) : 'sin fecha') + '</small></div>' +
          '<div class="pi-a"><button data-abrir="' + i + '" title="Abrir esta copia">\uD83D\uDCC2</button></div></div>';
      });
      h += '</div>';
    }
    CL.dialogo.abrir('Recuperar trabajo anterior', h, [{ etq: 'Cerrar', clase: 'ghost' }], {
      alAbrir: function (m) {
        CL.$$('[data-abrir]', m).forEach(function (b) {
          b.addEventListener('click', function () {
            var p = lista[+b.dataset.abrir];
            if (!p) return;
            CL.dialogo.cerrar();
            CL.app.cargarProyecto(CL.clone(p));
            CL.ajustarVista();
            CL.toast('ok', 'Copia recuperada', CL.esc(p.name || 'Proyecto'));
          });
        });
      }
    });
  };

  CL.on('circuito:cambio', function () { P.autoguardar(); });
  CL.on('codigo:cambio', function () { P.autoguardar(); });

}(window.CL));
