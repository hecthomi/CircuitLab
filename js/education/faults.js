/* ============================================================
   CircuitLab — modo avería
   Coge un circuito que funciona, le mete un fallo a escondidas y
   reta al estudiante a encontrarlo y repararlo. Es el ejercicio
   que más se parece a la realidad del taller: casi nunca se monta
   desde cero, casi siempre se arregla algo que dejó de andar.

   La comprobación es exacta: se guarda la "huella" del circuito
   sano (qué está unido con qué + los valores de cada componente)
   y se compara con la del circuito reparado.
   ============================================================ */
(function (CL) {
  'use strict';

  var F = {};
  CL.averias = F;

  var activa = null;      // {huella, averias:[{tipo, texto, pista1, pista2, comps}], pistas, t0}

  /* ------------------------------------------------------------
     Huella del circuito: nodos eléctricos + valores
     ------------------------------------------------------------ */
  function huella() {
    CL.circuito.reconstruir();
    var nets = (CL.circuito.nets || []).map(function (n) {
      return n.pins.slice().sort().join('|');
    }).sort().join('#');
    var props = CL.state.proj.components.map(function (c) {
      var def = CL.catalogo[c.type] || {};
      var ks = Object.keys(c.props || {}).sort();
      return c.id + ':' + c.type + ':' + ks.map(function (k) {
        // el ángulo del servo y la posición del potenciómetro son mandos, no montaje
        if (k === 'angulo' || k === 'pos' || k === 'detecta' || k === 'distancia' ||
            k === 'luz' || k === 'temp' || k === 'humedad') return k;
        return k + '=' + c.props[k];
      }).join(',');
    }).sort().join('#');
    return nets + '@@' + props;
  }

  /* ------------------------------------------------------------
     Catálogo de averías
     Cada una devuelve null si no se puede aplicar a este circuito.
     ------------------------------------------------------------ */
  function alAzar(lista) { return lista[Math.floor(Math.random() * lista.length)]; }

  var TIPOS = [
    {
      id: 'cable_suelto',
      aplicar: function () {
        var ws = CL.state.proj.wires;
        if (!ws.length) return null;
        var w = alAzar(ws);
        var nomA = nombreDe(w.a), nomB = nombreDe(w.b);
        CL.state.desconectar([w.id]);
        return {
          texto: 'Falta un cable entre ' + nomA + ' y ' + nomB + '.',
          pista1: 'Repasa las conexiones una por una: hay un camino que no se cierra.',
          pista2: 'Mira por la zona de ' + nomA + '.',
          comps: [w.a.comp, w.b.comp]
        };
      }
    },
    {
      id: 'cable_movido',
      aplicar: function () {
        var bb = CL.state.compsPorTipo('protoboard')[0];
        if (!bb) return null;
        var ws = CL.state.proj.wires.filter(function (w) { return w.a.comp === bb.id || w.b.comp === bb.id; });
        if (!ws.length) return null;
        var w = alAzar(ws);
        var cual = w.a.comp === bb.id ? 'a' : 'b';
        var pin = w[cual].pin;                                 // p. ej. "B14"
        var m = String(pin).match(/^([A-J])(\d+)$/);
        if (!m) return null;
        var col = parseInt(m[2], 10);
        var nueva = col + (col > 2 ? -1 : 1);                  // se corre una columna
        var destino = m[1] + nueva;
        if (!CL.pinDe('protoboard', destino)) return null;
        CL.state.recablear(w.id, cual, { comp: bb.id, pin: destino });
        return {
          texto: 'Un cable está una columna corrida: debería ir en ' + pin + ' y está en ' + destino + '.',
          pista1: 'Un cable está puesto en el agujero de al lado. Se ve bien, pero no conecta con lo que debe.',
          pista2: 'Revisa la columna ' + destino + ' de la protoboard.',
          comps: [bb.id]
        };
      }
    },
    {
      id: 'resistencia_alta',
      aplicar: function () {
        var rs = CL.state.compsPorTipo('resistor');
        if (!rs.length) return null;
        var r = alAzar(rs), viejo = r.props.ohms;
        if (viejo >= 100000) return null;
        CL.state.setProp(r.id, 'ohms', 100000);
        return {
          texto: 'Una resistencia de ' + CL.fmtOhm(viejo) + ' fue cambiada por una de 100 kΩ.',
          pista1: 'Algo enciende, pero muy poquito. ¿Cuánta corriente le está llegando?',
          pista2: 'Mira el valor de las resistencias: una no es la que debería.',
          comps: [r.id]
        };
      }
    },
    {
      id: 'led_invertido',
      aplicar: function () {
        var leds = CL.state.compsPorTipo('led');
        for (var i = 0; i < leds.length; i++) {
          var l = leds[i];
          var wa = null, wk = null;
          CL.state.proj.wires.forEach(function (w) {
            if (w.a.comp === l.id && w.a.pin === 'a') wa = { w: w, cual: 'a' };
            if (w.b.comp === l.id && w.b.pin === 'a') wa = { w: w, cual: 'b' };
            if (w.a.comp === l.id && w.a.pin === 'k') wk = { w: w, cual: 'a' };
            if (w.b.comp === l.id && w.b.pin === 'k') wk = { w: w, cual: 'b' };
          });
          if (wa && wk) {
            CL.state.recablear(wa.w.id, wa.cual, { comp: l.id, pin: 'k' });
            CL.state.recablear(wk.w.id, wk.cual, { comp: l.id, pin: 'a' });
            return {
              texto: 'Un LED quedó conectado al revés (ánodo y cátodo cambiados).',
              pista1: 'Hay un componente que solo deja pasar la corriente en un sentido y está al contrario.',
              pista2: 'Fíjate en el LED: la pata larga (+) tiene que mirar hacia el positivo.',
              comps: [l.id]
            };
          }
        }
        return null;
      }
    },
    {
      id: 'interruptor_abierto',
      aplicar: function () {
        var sw = CL.state.compsPorTipo('interruptor').filter(function (c) { return c.props.cerrado; });
        if (!sw.length) return null;
        var s = alAzar(sw);
        CL.state.setProp(s.id, 'cerrado', false);
        var e = CL.circuito.ctx.estados[s.id];
        if (e) e.cerrado = false;
        return {
          texto: 'El interruptor quedó abierto.',
          pista1: 'El circuito está cortado en algún punto. ¿Hay algo que se pueda abrir o cerrar?',
          pista2: 'Haz clic sobre el interruptor.',
          comps: [s.id]
        };
      }
    },
    {
      id: 'pin_cambiado',
      aplicar: function () {
        var placas = CL.state.proj.components.filter(function (c) {
          var d = CL.catalogo[c.type];
          return d && d.placa;
        });
        if (!placas.length) return null;
        var pl = placas[0];
        var ws = CL.state.proj.wires.filter(function (w) {
          return (w.a.comp === pl.id && /^D\d+$/.test(w.a.pin)) || (w.b.comp === pl.id && /^D\d+$/.test(w.b.pin));
        });
        if (!ws.length) return null;
        var w = alAzar(ws);
        var cual = w.a.comp === pl.id ? 'a' : 'b';
        var pin = w[cual].pin, n = parseInt(pin.slice(1), 10);
        var otro = 'D' + (n >= 12 ? n - 1 : n + 1);
        if (!CL.pinDe(pl.type, otro)) return null;
        CL.state.recablear(w.id, cual, { comp: pl.id, pin: otro });
        return {
          texto: 'Un cable de la placa se pasó del pin ' + pin + ' al ' + otro + '.',
          pista1: 'El programa manda la señal a un pin y el cable está en otro.',
          pista2: 'Compara los pines que usa el código con los que tienes cableados.',
          comps: [pl.id]
        };
      }
    }
  ];

  function nombreDe(ref) {
    var c = CL.state.comp(ref.comp);
    if (!c) return ref.pin;
    var def = CL.catalogo[c.type];
    if (def && def.esProto) return 'la protoboard (' + ref.pin + ')';
    return CL.nombreComp(c) + ' (' + ref.pin + ')';
  }

  /* ------------------------------------------------------------
     Generar / comprobar
     ------------------------------------------------------------ */
  F.generar = function (cuantas) {
    if (!CL.state.proj.components.length) {
      CL.toast('warn', 'No hay circuito', 'Carga un ejemplo o monta un circuito antes de generar una avería.');
      return false;
    }
    var objetivo = huella();
    var puestas = [], intentos = 0;
    cuantas = cuantas || 1;
    var pool = TIPOS.slice();
    while (puestas.length < cuantas && intentos < 24 && pool.length) {
      intentos++;
      var t = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      var r = null;
      try { r = t.aplicar(); } catch (e) { r = null; }
      if (r) { r.tipo = t.id; puestas.push(r); }
    }
    if (!puestas.length) {
      CL.toast('warn', 'No se pudo estropear este circuito',
        'Necesita al menos un cable, un LED o una resistencia. Prueba con un ejemplo del catálogo.');
      return false;
    }
    activa = { huella: objetivo, averias: puestas, pistas: 0, t0: Date.now() };
    CL.circuito.marcarSucio();
    CL.circuito.resolver(0.016);
    CL.ws.actualizarDinamicos(true);
    CL.wires.render();
    CL.state.limpiarSeleccion();
    pintarHud();
    CL.sfx.bad();
    CL.mensaje('warn', 'Circuito averiado', 'Este montaje tenía ' + puestas.length +
      (puestas.length === 1 ? ' fallo' : ' fallos') + '. Encuéntralo y repáralo.',
      'Usa 🔍 Analizar, el multímetro y el osciloscopio como en un taller de verdad.');
    return true;
  };

  F.comprobar = function () {
    if (!activa) return false;
    var ok = huella() === activa.huella;
    if (ok) {
      var seg = Math.round((Date.now() - activa.t0) / 1000);
      CL.sfx.win();
      CL.dialogo.abrir('¡Reparado! 🔧',
        '<p>El circuito volvió a quedar exactamente como estaba.</p>' +
        '<div class="kv"><span>Tiempo</span><span>' + CL.mmss(seg) + '</span></div>' +
        '<div class="kv"><span>Pistas usadas</span><span>' + activa.pistas + '</span></div>' +
        '<div class="sec"><h4>El fallo era</h4><ul>' +
        activa.averias.map(function (a) { return '<li>' + CL.esc(a.texto) + '</li>'; }).join('') +
        '</ul></div>',
        [{ etq: 'Cerrar', clase: 'primary' }]);
      if (CL.proyectos.progreso) CL.proyectos.progreso.sumarXP(Math.max(6, 20 - activa.pistas * 5));
      F.salir();
    } else {
      CL.sfx.bad();
      CL.toast('warn', 'Todavía no', 'El circuito no está como debería. Sigue buscando.');
    }
    return ok;
  };

  F.pista = function () {
    if (!activa) return;
    activa.pistas++;
    var a = activa.averias[0];
    var txt = activa.pistas === 1 ? a.pista1 : (activa.pistas === 2 ? a.pista2 : a.texto);
    if (activa.pistas >= 3 && a.comps && a.comps.length) {
      CL.state.seleccionar(a.comps);
      var c = CL.state.comp(a.comps[0]);
      if (c) CL.centrarEn(c.x, c.y);
    }
    CL.mensaje('info', 'Pista ' + activa.pistas, txt,
      activa.pistas >= 3 ? 'Repáralo y pulsa «Comprobar».' : 'Puedes pedir otra pista si te hace falta.');
    pintarHud();
  };

  F.salir = function () {
    activa = null;
    var hud = document.getElementById('faultHud');
    if (hud) hud.hidden = true;
  };

  F.enCurso = function () { return !!activa; };

  /* ------------------------------------------------------------
     Panel flotante
     ------------------------------------------------------------ */
  function pintarHud() {
    var hud = document.getElementById('faultHud');
    if (!hud) return;
    if (!activa) { hud.hidden = true; return; }
    hud.hidden = false;
    hud.innerHTML =
      '<div class="fh-ico">🔧</div>' +
      '<div class="fh-info"><strong>Modo avería</strong>' +
      '<small>' + activa.averias.length + (activa.averias.length === 1 ? ' fallo escondido' : ' fallos escondidos') +
      ' · ' + activa.pistas + ' pista(s) usada(s)</small></div>' +
      '<button class="btn small" id="fhPista">💡 Pista</button>' +
      '<button class="btn small primary" id="fhCheck">Comprobar</button>' +
      '<button class="btn small ghost" id="fhQuit">Salir</button>';
    hud.querySelector('#fhPista').addEventListener('click', F.pista);
    hud.querySelector('#fhCheck').addEventListener('click', F.comprobar);
    hud.querySelector('#fhQuit').addEventListener('click', function () {
      CL.dialogo.confirmar('Salir del modo avería',
        'El circuito se queda como esté ahora. ¿Seguro?', F.salir, 'Salir');
    });
  }

  /* ------------------------------------------------------------
     Diálogo de entrada
     ------------------------------------------------------------ */
  F.abrir = function () {
    if (activa) { pintarHud(); return; }
    var h = '<p>Se le mete un fallo al circuito que tienes montado y tú tienes que encontrarlo, ' +
      'igual que cuando algo deja de funcionar en el taller.</p>' +
      '<div class="callout"><div>🧰</div><div>Herramientas: <b>🔍 Analizar</b> para el diagnóstico, ' +
      'el <b>multímetro</b> para medir punto por punto y el <b>osciloscopio</b> para ver las señales.</div></div>' +
      '<div class="form-row"><label>Número de fallos</label>' +
      '<select id="avN"><option value="1">1 — para empezar</option>' +
      '<option value="2">2 — más difícil</option>' +
      '<option value="3">3 — nivel técnico</option></select></div>';
    if (!CL.state.proj.components.length) {
      h += '<div class="empty-note">Primero carga un circuito: pulsa <b>🧪 Ejemplos</b> y elige uno.</div>';
    }
    var modal = null;
    CL.dialogo.abrir('🔧 Modo avería', h, [
      { etq: 'Cancelar', clase: 'ghost' },
      { etq: 'Estropear el circuito', clase: 'primary', fn: function () {
          var sel = modal && modal.querySelector('#avN');
          F.generar(sel ? parseInt(sel.value, 10) || 1 : 1);
        } }
    ], { alAbrir: function (m) { modal = m; } });
  };

}(window.CL));
