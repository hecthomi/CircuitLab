/* ============================================================
   CircuitLab — panel de componentes (izquierda) e inspector +
   panel de simulación (derecha)
   ============================================================ */
(function (CL) {
  'use strict';

  var U = {};
  CL.paneles = U;

  CL.restriccion = null;      // lista de tipos permitidos (modo actividad) o null

  /* ============================================================
     PALETA DE COMPONENTES
     ============================================================ */
  U.pintarPaleta = function (filtro) {
    var cont = document.getElementById('palette');
    if (!cont) return;
    filtro = (filtro || '').toLowerCase().trim();
    var abiertas = CL.pref('catAbiertas', { basica: true, power: true, robotica: true, placas: true });
    cont.innerHTML = '';

    CL.CATEGORIAS.forEach(function (cat) {
      var tipos = Object.keys(CL.catalogo).filter(function (t) {
        var d = CL.catalogo[t];
        if (d.cat !== cat.id) return false;
        if (CL.restriccion && CL.restriccion.indexOf(t) < 0) return false;
        if (!filtro) return true;
        return (d.nombre + ' ' + t + ' ' + (d.info ? d.info.tipo : '')).toLowerCase().indexOf(filtro) >= 0;
      });
      if (!tipos.length) return;

      var g = CL.el('div', { class: 'cat' + (abiertas[cat.id] === false && !filtro ? ' closed' : '') });
      var cab = CL.el('button', { class: 'cat-head' },
        '<span class="dot" style="background:' + cat.color + '"></span>' + CL.esc(cat.nombre) + '<span class="arw">▼</span>');
      cab.addEventListener('click', function () {
        g.classList.toggle('closed');
        abiertas[cat.id] = !g.classList.contains('closed');
        CL.setPref('catAbiertas', abiertas);
      });
      g.appendChild(cab);

      var items = CL.el('div', { class: 'cat-items' });
      tipos.forEach(function (t) {
        var d = CL.catalogo[t];
        var it = CL.el('div', { class: 'pal-item' + (d.ancha ? ' wide' : ''), 'data-tipo': t, title: d.nombre });
        it.innerHTML = '<div class="pi-ico">' + CL.iconoSVG(t, d.ancha ? 54 : 44, d.ancha ? 30 : 34) + '</div>' +
                       '<div class="pi-name">' + CL.esc(d.nombre) + '</div>';
        it.addEventListener('pointerdown', function (e) {
          if (e.button !== 0) return;
          e.preventDefault();
          CL.ws.iniciarArrastrePaleta(t, e);
        });
        it.addEventListener('dblclick', function () { CL.ws.colocar(t); });
        items.appendChild(it);
      });
      g.appendChild(items);
      cont.appendChild(g);
    });

    if (!cont.children.length) {
      cont.innerHTML = '<div class="empty-note">No hay componentes que coincidan con la búsqueda.</div>';
    }
  };

  /* ============================================================
     INSPECTOR DE COMPONENTE
     ============================================================ */
  var actual = null;

  U.mostrarInspector = function (id) {
    actual = id;
    var pane = document.getElementById('paneInsp');
    var c = CL.state.comp(id);
    if (!c) { U.vaciarInspector(); return; }
    var d = CL.catalogo[c.type];
    var info = d.info || {};
    var st = CL.circuito.estado(id) || {};

    var html = '';
    html += '<div class="insp-head"><div class="ih-ico">' + CL.iconoSVG(c.type, 48, 40) + '</div>' +
            '<div><h3>' + CL.esc(CL.nombreComp(c)) + '</h3><small>' + CL.esc(info.tipo || d.nombre) + '</small></div></div>';

    // acciones rápidas
    html += '<div class="btn-row">' +
      '<button class="btn small" data-acc="rot">⟳ Rotar</button>' +
      '<button class="btn small" data-acc="dup">⧉ Duplicar</button>' +
      '<button class="btn small danger" data-acc="del">🗑 Eliminar</button></div>';

    // propiedades editables
    if (d.propsUI && d.propsUI.length) {
      html += '<div class="sec"><h4>Propiedades</h4><div id="inspProps"></div></div>';
    }

    // mediciones en vivo
    html += '<div class="sec"><h4>Medidas en tiempo real</h4><div id="inspMedidas"></div></div>';

    // ficha educativa
    if (info.datos) {
      html += '<div class="sec"><h4>Ficha técnica</h4>';
      info.datos.forEach(function (kv) {
        html += '<div class="kv"><span>' + CL.esc(kv[0]) + '</span><span>' + CL.esc(kv[1]) + '</span></div>';
      });
      html += '</div>';
    }
    if (info.que) html += '<div class="sec"><h4>¿Qué es?</h4><p>' + CL.esc(info.que) + '</p></div>';
    if (info.como) html += '<div class="sec"><h4>¿Cómo funciona?</h4><p>' + CL.esc(info.como) + '</p></div>';
    if (info.donde) html += '<div class="sec"><h4>¿Dónde se utiliza?</h4><p>' + CL.esc(info.donde) + '</p></div>';
    if (info.errores) {
      html += '<div class="sec"><h4>Errores frecuentes</h4><ul>';
      info.errores.forEach(function (e) { html += '<li>' + CL.esc(e) + '</li>'; });
      html += '</ul></div>';
    }
    if (info.ejemplo) html += '<div class="sec"><h4>Ejemplo práctico</h4><p><code>' + CL.esc(info.ejemplo) + '</code></p></div>';
    if (info.formula) html += '<div class="callout"><div>🧮</div><div><b>Fórmula</b><br>' + CL.esc(info.formula) + '</div></div>';

    pane.innerHTML = html;

    CL.$$('[data-acc]', pane).forEach(function (b) {
      b.addEventListener('click', function () {
        CL.state.seleccionar([id]);
        if (b.dataset.acc === 'rot') CL.ws.rotarSeleccion();
        if (b.dataset.acc === 'dup') CL.ws.duplicarSeleccion();
        if (b.dataset.acc === 'del') { CL.ws.eliminarSeleccion(); U.vaciarInspector(); }
      });
    });

    if (d.propsUI && d.propsUI.length) pintarProps(document.getElementById('inspProps'), c, d);
    pintarMedidas(document.getElementById('inspMedidas'), c, st);
  };

  U.vaciarInspector = function () {
    actual = null;
    var pane = document.getElementById('paneInsp');
    if (pane) pane.innerHTML = '<div class="empty-note">Selecciona un componente para ver su información, sus propiedades y cómo se usa.</div>';
  };

  function pintarProps(cont, c, d) {
    if (!cont) return;
    cont.innerHTML = '';
    d.propsUI.forEach(function (p) {
      var fila = CL.el('div', { class: 'prop-row' });
      fila.appendChild(CL.el('label', {}, CL.esc(p.etq)));
      var valor = c.props[p.k];
      if (p.t === 'select') {
        var sel = CL.el('select');
        p.op.forEach(function (o) {
          var op = CL.el('option', { value: o[0] }, CL.esc(o[1]));
          if (String(valor) === String(o[0])) op.selected = true;
          sel.appendChild(op);
        });
        sel.addEventListener('change', function () {
          CL.state.setProp(c.id, p.k, p.num ? +sel.value : sel.value);
          CL.circuito.marcarSucio();
          U.mostrarInspector(c.id);
        });
        fila.appendChild(sel);
      } else if (p.t === 'range') {
        var r = CL.el('input', { type: 'range', min: p.min, max: p.max, step: p.step, value: valor });
        var v = CL.el('span', { class: 'val' }, p.fmt ? p.fmt(valor) : valor);
        r.addEventListener('input', function () {
          var nv = +r.value;
          v.textContent = p.fmt ? p.fmt(nv) : nv;
          CL.state.setProp(c.id, p.k, nv, true);
          CL.circuito.marcarSucio();
        });
        r.addEventListener('change', function () { CL.state.marcarSucio(); });
        fila.appendChild(r);
        fila.appendChild(v);
      } else if (p.t === 'bool') {
        var chk = CL.el('input', { type: 'checkbox' });
        chk.checked = !!valor;
        chk.style.cssText = 'width:18px;height:18px;accent-color:var(--acc)';
        chk.addEventListener('change', function () {
          CL.state.setProp(c.id, p.k, chk.checked, true);
          CL.circuito.marcarSucio();
          CL.state.marcarSucio();
        });
        fila.appendChild(chk);
      } else {
        var inp = CL.el('input', { type: 'text', value: valor });
        inp.addEventListener('change', function () { CL.state.setProp(c.id, p.k, inp.value); });
        fila.appendChild(inp);
      }
      cont.appendChild(fila);
    });
  }

  function pintarMedidas(cont, c, st) {
    if (!cont) return;
    var d = CL.catalogo[c.type];
    var e = st._e || {};
    var html = '';
    (d.pins || []).slice(0, 6).forEach(function (p) {
      var v = e.vp ? e.vp[p.id] : CL.circuito.tension(c.id, p.id);
      html += '<div class="kv"><span>Tensión en ' + CL.esc(p.etq || p.id) + '</span><span>' + CL.fmtV(v || 0) + '</span></div>';
    });
    if (e.corriente !== undefined && Math.abs(e.corriente) > 1e-9) {
      html += '<div class="kv"><span>Corriente</span><span>' + CL.fmtA(e.corriente) + '</span></div>';
      if (e.caida !== undefined) html += '<div class="kv"><span>Caída de tensión</span><span>' + CL.fmtV(e.caida) + '</span></div>';
      html += '<div class="kv"><span>Potencia</span><span>' + CL.fmtW(Math.abs((e.caida || 0) * e.corriente)) + '</span></div>';
    }
    if (st.brillo !== undefined) html += '<div class="kv"><span>Brillo</span><span>' + Math.round(st.brillo * 100) + ' %</span></div>';
    if (st.velocidad !== undefined) html += '<div class="kv"><span>Velocidad</span><span>' + Math.round(st.velocidad * 100) + ' % (' + (st.sentido || '') + ')</span></div>';
    if (st.angulo !== undefined && c.type === 'servo') html += '<div class="kv"><span>Ángulo</span><span>' + Math.round(st.angulo) + '°</span></div>';
    if (st.alimentado !== undefined) html += '<div class="kv"><span>Alimentación</span><span>' + (st.alimentado ? 'correcta' : 'falta') + '</span></div>';
    if (!html) html = '<p style="font-size:12px;color:var(--text-mute)">Ejecuta la simulación para ver medidas.</p>';
    cont.innerHTML = html;
  }

  /* ============================================================
     PANEL DE SIMULACIÓN
     ============================================================ */
  U.pintarSimulacion = function () {
    var pane = document.getElementById('paneSim');
    if (!pane) return;
    var comps = CL.state.proj.components;
    var interesantes = comps.filter(function (c) {
      var d = CL.catalogo[c.type];
      return d && (d.sensor || d.placa || c.type === 'pot' || c.type === 'servo' || c.type === 'interruptor' || c.type === 'bateria');
    });
    var html = '';

    // resumen general
    var res = CL.circuito.resultado;
    html += '<div class="sim-card"><div class="sc-head"><b>Estado del circuito</b>' +
            '<span class="sc-badge">' + (CL.runtime.corriendo ? 'EJECUTANDO' : 'DETENIDO') + '</span></div>';
    if (res) {
      var totalI = 0;
      (res.fuentes || []).forEach(function (f) { totalI += Math.abs(f.i); });
      html += '<div class="measure"><span>Fuentes activas</span><b>' + (res.fuentes || []).length + '</b></div>';
      html += '<div class="measure"><span>Corriente total</span><b>' + CL.fmtA(totalI) + '</b></div>';
      html += '<div class="measure"><span>Nodos eléctricos</span><b>' + (res.nets || []).length + '</b></div>';
      html += '<div class="measure"><span>Tiempo simulado</span><b>' + (CL.runtime.tiempo / 1000).toFixed(1) + ' s</b></div>';
    }
    html += '</div>';

    if (!interesantes.length) {
      html += '<div class="empty-note">Coloca sensores, potenciómetros o una placa para poder cambiar sus valores mientras la simulación corre.</div>';
      pane.innerHTML = html;
      return;
    }

    interesantes.forEach(function (c) {
      var d = CL.catalogo[c.type];
      var st = CL.circuito.estado(c.id) || {};
      html += '<div class="sim-card" data-comp="' + c.id + '">';
      html += '<div class="sc-head">' + (d.emoji || '') + ' <b>' + CL.esc(CL.nombreComp(c)) + '</b>' +
              '<span class="sc-badge">' + CL.esc(st.texto || (st.alimentado === false ? 'sin alimentar' : '')) + '</span></div>';
      html += '<div class="props"></div>';
      if (d.placa) {
        var est = (CL.circuito.ctx.pines[c.id]) || {};
        var salidas = Object.keys(est).filter(function (p) { return est[p].modo === 'OUTPUT'; });
        if (salidas.length) {
          html += '<div class="measure"><span>Pines en salida</span><b>' + salidas.length + '</b></div>';
          salidas.slice(0, 8).forEach(function (p) {
            html += '<div class="measure"><span>' + p + '</span><b>' + (est[p].valor >= 0.99 ? 'ALTO' :
                    (est[p].valor <= 0.01 ? 'BAJO' : Math.round(est[p].valor * 255) + ' PWM')) + '</b></div>';
          });
        } else {
          html += '<div class="measure"><span>Programa</span><b>' + (CL.state.proj.code.trim() ? 'cargado' : 'sin código') + '</b></div>';
        }
      }
      html += '</div>';
    });
    pane.innerHTML = html;

    // controles en vivo
    interesantes.forEach(function (c) {
      var d = CL.catalogo[c.type];
      var caja = pane.querySelector('[data-comp="' + c.id + '"] .props');
      if (!caja || !d.propsUI) return;
      pintarProps(caja, c, { propsUI: d.propsUI.filter(function (p) { return p.vivo || p.t !== 'select'; }) });
    });
  };

  /* refresco ligero del panel de simulación mientras corre */
  var contador = 0;
  CL.on('sim:tick', function () {
    if (++contador % 20 !== 0) return;
    var pane = document.getElementById('paneSim');
    if (!pane || !pane.classList.contains('active')) return;
    // solo actualiza los textos, no vuelve a crear los controles
    var res = CL.circuito.resultado;
    if (!res) return;
    CL.$$('.sim-card', pane).forEach(function (card) {
      var id = card.dataset.comp;
      if (!id) return;
      var st = res.comps[id] || {};
      var badge = card.querySelector('.sc-badge');
      if (badge) badge.textContent = st.texto || (st.alimentado === false ? 'sin alimentar' : '');
    });
    if (actual) {
      var c = CL.state.comp(actual);
      if (c) pintarMedidas(document.getElementById('inspMedidas'), c, CL.circuito.estado(actual) || {});
    }
  });

  CL.on('inspector:mostrar', function (id) { U.mostrarInspector(id); });
  CL.on('inspector:vacio', function () { U.vaciarInspector(); });
  CL.on('inspector:refrescar', function (id) { if (actual === id) U.mostrarInspector(id); });
  CL.on('circuito:cambio', function () {
    var pane = document.getElementById('paneSim');
    if (pane && pane.classList.contains('active')) U.pintarSimulacion();
  });

}(window.CL));
