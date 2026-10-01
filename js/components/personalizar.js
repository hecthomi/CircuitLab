/* ============================================================
   CircuitLab — personalizar el aspecto de los componentes

   Cada componente se dibuja con una función `dibujar(c, st)` que
   devuelve el marcado SVG de su cuerpo. Aquí se envuelve esa función
   una sola vez, al arrancar, para poder retocar el resultado antes de
   que llegue al lienzo: cambiar el color de cada parte, el color de la
   serigrafía y el tamaño del dibujo.

   El retoque NO toca el catálogo: se guarda aparte, en localStorage
   (clave `compTemas`), así sobrevive a cerrar la aplicación y se puede
   deshacer en cualquier momento con «Restablecer».

   Las partes se descubren solas leyendo el dibujo original: cada color
   plano (fill/stroke) y cada degradado que use el componente se ofrece
   como una casilla de color. Por eso funciona con TODOS los componentes
   sin escribir código para cada uno.
   ============================================================ */
(function (CL) {
  'use strict';

  var P = {};
  CL.personalizar = P;

  var CLAVE = 'compTemas';
  var temas = CL.pref(CLAVE, {}) || {};
  // el tamaño se llegó a poder cambiar y se retiró: escalar el dibujo lo
  // despegaba de sus pines, que van al paso de 12 px de la protoboard.
  Object.keys(temas).forEach(function (k) { if (temas[k]) delete temas[k].escala; });
  var originales = {};          // tipo -> dibujar() sin retocar
  var cachePartes = {};         // tipo -> partes detectadas
  var cacheGrupo = {};          // tipo -> partes del color dominante
  var iniciado = false;

  /* ============================================================
     Color: hex <-> HSL. Se usa para teñir los degradados sin perder
     los brillos y las sombras que traen sus paradas.
     ============================================================ */
  function normHex(h) {
    h = String(h || '').trim().toLowerCase();
    if (h.charAt(0) !== '#') return null;
    h = h.slice(1);
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    if (h.length !== 6 || /[^0-9a-f]/.test(h)) return null;
    return '#' + h;
  }

  function aHsl(hex) {
    var h = normHex(hex);
    if (!h) return null;
    var r = parseInt(h.substr(1, 2), 16) / 255,
        g = parseInt(h.substr(3, 2), 16) / 255,
        b = parseInt(h.substr(5, 2), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2, s = 0, t = 0;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) t = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) t = (b - r) / d + 2;
      else t = (r - g) / d + 4;
      t /= 6;
    }
    return { h: t, s: s, l: l };
  }

  function deHsl(h, s, l) {
    function f(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
      r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3);
    }
    function dos(v) { var x = Math.round(v * 255).toString(16); return x.length < 2 ? '0' + x : x; }
    return '#' + dos(r) + dos(g) + dos(b);
  }

  /** Pinta `origen` con el tono del color elegido conservando su claridad:
      así un degradado teñido sigue teniendo su brillo y su sombra. */
  function tenirColor(origen, destino) {
    var a = aHsl(origen), b = aHsl(destino);
    if (!a || !b) return destino;
    // los grises (saturación casi nula) toman algo de color, pero menos
    var s = a.s < 0.08 ? b.s * 0.55 : Math.min(1, b.s * (0.55 + a.s * 0.65));
    return deHsl(b.h, s, a.l);
  }

  /* ============================================================
     Degradados compartidos: se leen de CL.DEFS_COMUNES para poder
     generar una copia teñida, propia del componente retocado.
     ============================================================ */
  function defGradiente(id) {
    var re = new RegExp('<(linear|radial)Gradient id="' + id + '"([^>]*)>([\\s\\S]*?)</\\1Gradient>');
    var m = re.exec(CL.DEFS_COMUNES || '');
    return m ? { clase: m[1], attrs: m[2], stops: m[3] } : null;
  }

  /** Color representativo de un degradado (su parada del medio). */
  function colorGradiente(id) {
    var g = defGradiente(id);
    if (!g) return '#888888';
    var cols = [];
    g.stops.replace(/stop-color="(#[0-9a-fA-F]{3,6})"/g, function (_, c) { cols.push(c); return _; });
    if (!cols.length) return '#888888';
    return normHex(cols[Math.floor(cols.length / 2)]) || '#888888';
  }

  function gradienteTenido(id, idNuevo, color) {
    var g = defGradiente(id);
    if (!g) return '';
    var stops = g.stops.replace(/stop-color="(#[0-9a-fA-F]{3,6})"/g, function (_, c) {
      return 'stop-color="' + tenirColor(c, color) + '"';
    });
    return '<' + g.clase + 'Gradient id="' + idNuevo + '"' + g.attrs + '>' + stops + '</' + g.clase + 'Gradient>';
  }

  /* ============================================================
     Lectura del dibujo original
     ============================================================ */
  function proto(tipo) {
    var d = CL.catalogo[tipo] || {};
    var props = {};
    for (var k in (d.props || {})) props[k] = d.props[k];
    return { id: 'preview', type: tipo, x: 0, y: 0, rot: 0, props: props };
  }

  function markupOriginal(tipo) {
    var d = CL.catalogo[tipo];
    if (!d) return '';
    var fn = originales[tipo] || d.dibujar;
    if (!fn) return '';
    try { return fn(proto(tipo), {}) || ''; } catch (e) { return ''; }
  }

  /** Partes retocables de un componente, de la más repetida a la menos.
      Devuelve [{clave, grad, texto, base, n}] donde `clave` es el color
      original (#rrggbb) o el id del degradado. */
  P.partes = function (tipo) {
    if (cachePartes[tipo]) return cachePartes[tipo];
    var m = markupOriginal(tipo);
    var lista = [], idx = {};

    function add(clave, grad, texto) {
      if (!idx[clave]) {
        idx[clave] = { clave: clave, grad: grad, texto: !!texto, n: 0, base: grad ? colorGradiente(clave) : clave };
        lista.push(idx[clave]);
      }
      idx[clave].n++;
      if (texto) idx[clave].texto = true;
    }

    m.replace(/(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (_, c) {
      var h = normHex(c); if (h) add(h, false, false); return _;
    });
    m.replace(/(?:fill|stroke)="url\(#([A-Za-z0-9_]+)\)"/g, function (_, id) {
      if (defGradiente(id)) add(id, true, false); return _;
    });
    m.replace(/<text\b[^>]*\bfill="(#[0-9a-fA-F]{3,6})"/g, function (_, c) {
      var h = normHex(c); if (h) add(h, false, true); return _;
    });

    // primero los degradados (suelen ser el cuerpo) y luego lo más repetido
    lista.sort(function (a, b) {
      if (a.grad !== b.grad) return a.grad ? -1 : 1;
      return b.n - a.n;
    });
    cachePartes[tipo] = lista.slice(0, 18);
    return cachePartes[tipo];
  };

  /* ============================================================
     Color principal: las piezas de un componente casi nunca son de un
     solo color (el servo, por ejemplo, tiene la caja, las orejas, el
     plato y el borde en cuatro azules distintos). Aquí se agrupan las
     partes que comparten el tono dominante para poder recolorearlas
     todas a la vez, conservando sus brillos y sus sombras.
     ============================================================ */
  function grupoPrincipal(tipo) {
    if (cacheGrupo[tipo]) return cacheGrupo[tipo];
    var partes = P.partes(tipo), sector = {};
    function hsl(p) { return aHsl(p.grad ? p.base : p.clave); }
    // los grises, los casi negros (conector, sombras) y los casi blancos
    // (la paleta) no forman parte del "color" del componente
    function cuenta(c) { return c && c.s >= 0.15 && c.l > 0.18 && c.l < 0.93; }
    partes.forEach(function (p) {
      var c = hsl(p);
      if (!cuenta(c)) return;
      var b = Math.floor(c.h * 12) % 12;          // doce sectores de 30 grados
      sector[b] = (sector[b] || 0) + p.n;
    });
    var mejor = null, max = 0;
    Object.keys(sector).forEach(function (b) { if (sector[b] > max) { max = sector[b]; mejor = +b; } });
    var lista = [];
    if (mejor !== null) {
      partes.forEach(function (p) {
        var c = hsl(p);
        if (!cuenta(c)) return;
        var d = Math.abs(c.h * 12 - (mejor + 0.5));
        if (Math.min(d, 12 - d) <= 1.4) lista.push(p);
      });
    }
    cacheGrupo[tipo] = lista;
    return lista;
  }
  P.grupoPrincipal = grupoPrincipal;

  /** Color con el que se va a pintar una parte ahora mismo. */
  P.colorFinal = function (tipo, parte) {
    var t = temas[tipo] || {};
    var propio = normHex((t.colores || {})[parte.clave]);
    if (propio) return propio;
    var pri = normHex(t.principal);
    if (pri && grupoPrincipal(tipo).indexOf(parte) >= 0) {
      return tenirColor(parte.grad ? parte.base : parte.clave, pri);
    }
    return parte.base;
  };

  /* ============================================================
     Aplicación del retoque sobre el marcado ya dibujado
     ============================================================ */
  function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function aplicar(tipo, markup) {
    var t = temas[tipo];
    if (!t || !markup) return markup;

    var defs = '', colores = t.colores || {}, plan = {};

    // primero el color principal (retiñe el grupo dominante)…
    var pri = normHex(t.principal);
    if (pri) {
      grupoPrincipal(tipo).forEach(function (p) {
        plan[p.clave] = { grad: p.grad, color: tenirColor(p.grad ? p.base : p.clave, pri) };
      });
    }
    // …y encima los ajustes finos parte por parte, que siempre mandan
    Object.keys(colores).forEach(function (k) {
      var nuevo = normHex(colores[k]);
      if (nuevo) plan[k] = { grad: k.charAt(0) !== '#', color: nuevo };
    });

    Object.keys(plan).forEach(function (k) {
      var e = plan[k];
      if (!e.grad) {
        markup = markup.replace(new RegExp('(fill|stroke)="' + escRe(k) + '"', 'gi'), '$1="' + e.color + '"');
      } else {
        var idNuevo = k + '__' + tipo;
        var g = gradienteTenido(k, idNuevo, e.color);
        if (!g) return;
        defs += g;
        markup = markup.split('url(#' + k + ')').join('url(#' + idNuevo + ')');
      }
    });

    var txt = normHex(t.texto);
    if (txt) {
      markup = markup.replace(/(<text\b[^>]*\bfill=")#[0-9a-fA-F]{3,6}(")/gi, '$1' + txt + '$2');
    }
    if (defs) markup = '<defs>' + defs + '</defs>' + markup;
    return markup;
  }

  /* ============================================================
     Arranque: se envuelve el `dibujar` de cada componente
     ============================================================ */
  P.init = function () {
    if (iniciado) return;
    iniciado = true;
    Object.keys(CL.catalogo).forEach(function (tipo) {
      var def = CL.catalogo[tipo];
      if (!def || typeof def.dibujar !== 'function') return;
      var orig = def.dibujar;
      originales[tipo] = orig;
      def.dibujar = function (c, st) { return aplicar(tipo, orig(c, st)); };
    });
  };

  P.tema = function (tipo) { return temas[tipo] || null; };
  P.retocado = function (tipo) {
    var t = temas[tipo];
    if (!t) return false;
    return !!(t.texto || t.principal || (t.colores && Object.keys(t.colores).length));
  };

  function guardar() { CL.setPref(CLAVE, temas); }

  function refrescar() {
    // 'proyecto:redibujar' vacía la caché de firmas del lienzo: si no, los
    // componentes con estado (LED, servo…) se quedarían con el dibujo viejo.
    CL.emit('proyecto:redibujar');
    if (CL.paneles && CL.paneles.pintarPaleta) {
      var b = document.getElementById('paletteSearch');
      CL.paneles.pintarPaleta(b ? b.value : '');
    }
    CL.emit('componentes:aspecto');
  }

  P.restablecer = function (tipo) {
    delete temas[tipo];
    guardar();
    refrescar();
  };

  P.restablecerTodo = function () {
    temas = {};
    guardar();
    refrescar();
  };

  /* ============================================================
     Galeria: todos los componentes del catalogo, se esten usando en el
     circuito o no. Desde la lista de «Componentes del circuito» solo se
     llega a los que hay puestos; aqui estan los 30 y pico.
     ============================================================ */
  P.galeria = function (filtroInicial) {
    var cats = (CL.CATEGORIAS || []).slice();
    var tipos = Object.keys(CL.catalogo).filter(function (t) {
      return typeof CL.catalogo[t].dibujar === 'function';
    });

    function pintar(cont, filtro) {
      filtro = (filtro || '').toLowerCase().trim();
      var html = '';
      cats.forEach(function (cat) {
        var lista = tipos.filter(function (t) {
          var d = CL.catalogo[t];
          if (d.cat !== cat.id) return false;
          if (!filtro) return true;
          return (d.nombre + ' ' + t + ' ' + ((d.info && d.info.tipo) || '')).toLowerCase().indexOf(filtro) >= 0;
        });
        if (!lista.length) return;
        html += '<h4><span class="pg-dot" style="background:' + cat.color + '"></span>' +
                CL.esc(cat.nombre) + '</h4><div class="pg-grid">';
        lista.forEach(function (t) {
          var d = CL.catalogo[t];
          html += '<button class="pg-item' + (P.retocado(t) ? ' retocado' : '') + '" data-tipo="' + CL.esc(t) + '" ' +
            'title="Personalizar ' + CL.esc(d.nombre) + '">' +
            '<span class="pg-ico">' + CL.iconoSVG(t, 62, 44) + '</span>' +
            '<span class="pg-nom">' + CL.esc(d.nombre) + '</span></button>';
        });
        html += '</div>';
      });
      // los que no encajan en ninguna categoria conocida (protoboard…)
      var sueltos = tipos.filter(function (t) {
        var d = CL.catalogo[t];
        if (cats.some(function (x) { return x.id === d.cat; })) return false;
        if (!filtro) return true;
        return (d.nombre + ' ' + t).toLowerCase().indexOf(filtro) >= 0;
      });
      if (sueltos.length) {
        html += '<h4><span class="pg-dot" style="background:var(--text-mute)"></span>Otros</h4><div class="pg-grid">';
        sueltos.forEach(function (t) {
          var d = CL.catalogo[t];
          html += '<button class="pg-item' + (P.retocado(t) ? ' retocado' : '') + '" data-tipo="' + CL.esc(t) + '">' +
            '<span class="pg-ico">' + CL.iconoSVG(t, 62, 44) + '</span>' +
            '<span class="pg-nom">' + CL.esc(d.nombre) + '</span></button>';
        });
        html += '</div>';
      }
      cont.innerHTML = html || '<div class="empty-note">Ningun componente coincide con la busqueda.</div>';
      CL.$$('[data-tipo]', cont).forEach(function (b) {
        b.addEventListener('click', function () { P.abrir(b.dataset.tipo, true); });
      });
    }

    var h = '<div class="pg-busca"><input type="search" id="pgBuscar" placeholder="Buscar componente\u2026" ' +
            'spellcheck="false" value="' + CL.esc(filtroInicial || '') + '"></div>' +
            '<div id="pgLista" class="pg-lista"></div>';

    CL.dialogo.abrir('Aspecto de los componentes', h, [
      { etq: 'Restablecer todo', clase: 'ghost', mantener: true, fn: function () {
          P.restablecerTodo();
          pintar(document.getElementById('pgLista'), document.getElementById('pgBuscar').value);
          CL.toast('ok', 'Aspecto original', 'Todos los componentes vuelven a su dibujo de fabrica.');
        } },
      { etq: 'Cerrar', clase: 'primary' }
    ], {
      ancho: true,
      alAbrir: function (m) {
        var cont = m.querySelector('#pgLista'), inp = m.querySelector('#pgBuscar');
        pintar(cont, inp.value);
        inp.addEventListener('input', CL.debounce(function () { pintar(cont, inp.value); }, 130));
        inp.focus();
      }
    });
  };

  /* ============================================================
     Editor
     ============================================================ */
  P.abrir = function (tipo, desdeGaleria) {
    var d = CL.catalogo[tipo];
    if (!d) return;
    var partes = P.partes(tipo);

    function tema() {
      if (!temas[tipo]) temas[tipo] = {};
      if (!temas[tipo].colores) temas[tipo].colores = {};
      return temas[tipo];
    }
    function valorDe(p) { return P.colorFinal(tipo, p); }

    var t0 = temas[tipo] || {};

    var celdas = partes.map(function (p, i) {
      return '<label class="perso-parte' + (p.texto ? ' es-texto' : '') + '">' +
        '<input type="color" data-parte="' + CL.esc(p.clave) + '" value="' + valorDe(p) + '">' +
        '<span><b>' + (p.grad ? 'Cuerpo' : (p.texto ? 'Texto' : 'Parte')) + ' ' + (i + 1) + '</b>' +
        '<small>' + CL.esc(p.grad ? 'degradado' : p.clave) + '</small></span></label>';
    }).join('');

    var grupo = grupoPrincipal(tipo);
    var priBase = grupo.length ? (normHex(t0.principal) || (grupo[0].grad ? grupo[0].base : grupo[0].clave)) : '#3b82f6';

    var h = '<div class="perso">' +
      '<div class="perso-vista">' +
        '<div id="persoPrev" class="perso-prev"></div>' +
        '<small>' + CL.esc(d.nombre) + '</small>' +
      '</div>' +
      '<div class="perso-ctrl">' +
        (grupo.length ? '<h4>Color principal</h4>' +
          '<div class="perso-fila"><label for="persoPri">Todo el cuerpo</label>' +
          '<input type="color" id="persoPri" value="' + priBase + '">' +
          '<button class="mini" id="persoPriNo" type="button">Original</button></div>' +
          '<p class="perso-nota">Recolorea de una vez las ' + grupo.length + ' partes que comparten el tono ' +
          'del componente, conservando sus brillos y sus sombras. Debajo puedes afinar cada una por separado.</p>'
        : '') +
        '<h4>Partes del componente</h4>' +
        (celdas ? '<div class="perso-grid">' + celdas + '</div>'
                : '<p class="perso-nota">Este componente toma sus colores del tema de la aplicación, así que no tiene partes que retocar por separado.</p>') +
        '<h4>Serigrafía</h4>' +
        '<div class="perso-fila"><label for="persoTexto">Color del texto</label>' +
          '<input type="color" id="persoTexto" value="' + (normHex(t0.texto) || '#ffffff') + '">' +
          '<button class="mini" id="persoTextoNo" type="button">Original</button></div>' +
        '<p class="perso-nota">Los cambios se guardan solos y siguen ahí la próxima vez que abras CircuitLab. ' +
        'El tamaño de cada componente es fijo: sus pines tienen que caer en los agujeros de la protoboard.</p>' +
      '</div></div>';

    CL.dialogo.abrir('Personalizar · ' + d.nombre, h, [
      { etq: 'Restablecer', clase: 'ghost', mantener: true, fn: function () {
          P.restablecer(tipo);
          CL.dialogo.cerrar();
          P.abrir(tipo, desdeGaleria);
          CL.toast('info', 'Aspecto restablecido', d.nombre + ' vuelve a su dibujo original.');
        } },
      { etq: desdeGaleria ? '\u2039 Volver' : 'Listo', clase: 'primary',
        fn: function () { if (desdeGaleria) setTimeout(function () { P.galeria(); }, 0); } }
    ], {
      ancho: true,
      alAbrir: function (m) {
        var prev = m.querySelector('#persoPrev');
        function pintarPrev() { prev.innerHTML = CL.iconoSVG(tipo, 250, 180); }
        pintarPrev();

        function cambio() { guardar(); pintarPrev(); refrescar(); }

        CL.$$('input[data-parte]', m).forEach(function (inp) {
          inp.addEventListener('input', function () {
            tema().colores[inp.dataset.parte] = inp.value;
            cambio();
          });
        });

        function repintarSwatches() {
          CL.$$('input[data-parte]', m).forEach(function (inp) {
            var pa = partes.filter(function (x) { return x.clave === inp.dataset.parte; })[0];
            if (pa) inp.value = P.colorFinal(tipo, pa);
          });
        }

        var ip = m.querySelector('#persoPri');
        if (ip) {
          ip.addEventListener('input', function () { tema().principal = ip.value; cambio(); repintarSwatches(); });
          m.querySelector('#persoPriNo').addEventListener('click', function () {
            if (temas[tipo]) { delete temas[tipo].principal; if (temas[tipo].colores) temas[tipo].colores = {}; }
            cambio(); repintarSwatches();
            ip.value = grupo.length ? (grupo[0].grad ? grupo[0].base : grupo[0].clave) : '#3b82f6';
          });
        }

        var it = m.querySelector('#persoTexto');
        it.addEventListener('input', function () { tema().texto = it.value; cambio(); });
        m.querySelector('#persoTextoNo').addEventListener('click', function () {
          if (temas[tipo]) delete temas[tipo].texto;
          cambio();
        });

      }
    });
  };

  // El catálogo ya está completo cuando se carga este archivo (va después de
  // catalog, catalog2, breadboard, arduino y microbit en index.html).
  P.init();

}(window.CL));
