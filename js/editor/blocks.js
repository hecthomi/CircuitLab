/* ============================================================
   CircuitLab — programación por bloques
   Los bloques se apilan en dos secciones y generan el código
   real que ejecuta la placa. Sin librerías externas.
   ============================================================ */
(function (CL) {
  'use strict';

  var B = {};
  CL.bloques = B;

  /* ------------------------------------------------------------
     Definición de los bloques disponibles
     ------------------------------------------------------------ */
  var PIN_DIG = [['13', '13'], ['12', '12'], ['11', '11 ~'], ['10', '10 ~'], ['9', '9 ~'], ['8', '8'],
                 ['7', '7'], ['6', '6 ~'], ['5', '5 ~'], ['4', '4'], ['3', '3 ~'], ['2', '2']];
  var PIN_ANA = [['A0', 'A0'], ['A1', 'A1'], ['A2', 'A2'], ['A3', 'A3'], ['A4', 'A4'], ['A5', 'A5']];

  var DEFS = {
    arduino: [
      { id: 'salida', cat: 'Pines', etq: 'configurar pin ⟨p⟩ como salida', clase: 'io',
        campos: [{ k: 'p', t: 'sel', op: PIN_DIG, def: '13' }],
        gen: function (v) { return 'pinMode(' + v.p + ', OUTPUT);'; }, seccion: 'setup' },
      { id: 'entrada', cat: 'Pines', etq: 'configurar pin ⟨p⟩ como entrada', clase: 'io',
        campos: [{ k: 'p', t: 'sel', op: PIN_DIG, def: '2' }],
        gen: function (v) { return 'pinMode(' + v.p + ', INPUT);'; }, seccion: 'setup' },
      { id: 'escribir', cat: 'Pines', etq: 'poner pin ⟨p⟩ en ⟨v⟩', clase: 'io',
        campos: [{ k: 'p', t: 'sel', op: PIN_DIG, def: '13' }, { k: 'v', t: 'sel', op: [['HIGH', 'ENCENDIDO'], ['LOW', 'APAGADO']], def: 'HIGH' }],
        gen: function (v) { return 'digitalWrite(' + v.p + ', ' + v.v + ');'; } },
      { id: 'pwm', cat: 'Pines', etq: 'brillo del pin ⟨p⟩ = ⟨v⟩', clase: 'io',
        campos: [{ k: 'p', t: 'sel', op: PIN_DIG.filter(function (x) { return x[1].indexOf('~') > 0; }), def: '9' }, { k: 'v', t: 'num', def: 128, min: 0, max: 255 }],
        gen: function (v) { return 'analogWrite(' + v.p + ', ' + v.v + ');'; } },
      { id: 'esperar', cat: 'Control', etq: 'esperar ⟨ms⟩ ms', clase: 'ctrl',
        campos: [{ k: 'ms', t: 'num', def: 1000, min: 1, max: 20000 }],
        gen: function (v) { return 'delay(' + v.ms + ');'; } },
      { id: 'repetir', cat: 'Control', etq: 'repetir ⟨n⟩ veces', clase: 'ctrl', contenedor: true,
        campos: [{ k: 'n', t: 'num', def: 3, min: 1, max: 100 }],
        gen: function (v, cuerpo) { return 'for (int i = 0; i < ' + v.n + '; i++) {\n' + cuerpo + '\n}'; } },
      { id: 'si_boton', cat: 'Control', etq: 'si el pin ⟨p⟩ está ⟨v⟩', clase: 'ctrl', contenedor: true,
        campos: [{ k: 'p', t: 'sel', op: PIN_DIG, def: '2' }, { k: 'v', t: 'sel', op: [['HIGH', 'pulsado'], ['LOW', 'suelto']], def: 'HIGH' }],
        gen: function (v, cuerpo) { return 'if (digitalRead(' + v.p + ') == ' + v.v + ') {\n' + cuerpo + '\n}'; } },
      { id: 'si_analog', cat: 'Control', etq: 'si ⟨p⟩ es ⟨c⟩ que ⟨n⟩', clase: 'ctrl', contenedor: true,
        campos: [{ k: 'p', t: 'sel', op: PIN_ANA, def: 'A0' }, { k: 'c', t: 'sel', op: [['<', 'menor'], ['>', 'mayor']], def: '<' }, { k: 'n', t: 'num', def: 400, min: 0, max: 1023 }],
        gen: function (v, cuerpo) { return 'if (analogRead(' + v.p + ') ' + v.c + ' ' + v.n + ') {\n' + cuerpo + '\n}'; } },
      { id: 'tono', cat: 'Sonido', etq: 'sonar buzzer en pin ⟨p⟩ a ⟨f⟩ Hz',
        campos: [{ k: 'p', t: 'sel', op: PIN_DIG, def: '8' }, { k: 'f', t: 'num', def: 880, min: 100, max: 4000 }],
        gen: function (v) { return 'tone(' + v.p + ', ' + v.f + ');'; } },
      { id: 'callar', cat: 'Sonido', etq: 'apagar buzzer del pin ⟨p⟩',
        campos: [{ k: 'p', t: 'sel', op: PIN_DIG, def: '8' }],
        gen: function (v) { return 'noTone(' + v.p + ');'; } },
      { id: 'servo', cat: 'Movimiento', etq: 'servo del pin ⟨p⟩ a ⟨a⟩°',
        campos: [{ k: 'p', t: 'sel', op: PIN_DIG, def: '9' }, { k: 'a', t: 'num', def: 90, min: 0, max: 180 }],
        gen: function (v) { return 'servo' + v.p + '.write(' + v.a + ');'; }, servo: true },
      { id: 'serial', cat: 'Datos', etq: 'escribir en el monitor ⟨t⟩',
        campos: [{ k: 't', t: 'txt', def: 'Hola' }],
        gen: function (v) { return 'Serial.println("' + String(v.t).replace(/"/g, '') + '");'; }, serial: true },
      { id: 'serial_pin', cat: 'Datos', etq: 'escribir el valor de ⟨p⟩',
        campos: [{ k: 'p', t: 'sel', op: PIN_ANA, def: 'A0' }],
        gen: function (v) { return 'Serial.println(analogRead(' + v.p + '));'; }, serial: true }
    ],
    microbit: [
      { id: 'icono', cat: 'Pantalla', etq: 'mostrar icono ⟨i⟩', clase: 'io',
        campos: [{ k: 'i', t: 'sel', op: [['corazon', '♥ corazón'], ['feliz', '☺ feliz'], ['triste', '☹ triste'], ['si', '✔ sí'], ['no', '✘ no'], ['cuadrado', '▢ cuadrado'], ['diamante', '◇ diamante'], ['casa', '⌂ casa'], ['fantasma', 'fantasma'], ['pato', 'pato']], def: 'corazon' }],
        gen: function (v) { return 'basic.showIcon("' + v.i + '");'; } },
      { id: 'numero', cat: 'Pantalla', etq: 'mostrar número ⟨n⟩', clase: 'io',
        campos: [{ k: 'n', t: 'num', def: 5, min: 0, max: 999 }],
        gen: function (v) { return 'basic.showNumber(' + v.n + ');'; } },
      { id: 'texto', cat: 'Pantalla', etq: 'mostrar texto ⟨t⟩', clase: 'io',
        campos: [{ k: 't', t: 'txt', def: 'HOLA' }],
        gen: function (v) { return 'basic.showString("' + String(v.t).replace(/"/g, '') + '");'; } },
      { id: 'borrar', cat: 'Pantalla', etq: 'borrar pantalla', clase: 'io', campos: [],
        gen: function () { return 'basic.clearScreen();'; } },
      { id: 'plot', cat: 'Pantalla', etq: 'encender LED x=⟨x⟩ y=⟨y⟩', clase: 'io',
        campos: [{ k: 'x', t: 'num', def: 2, min: 0, max: 4 }, { k: 'y', t: 'num', def: 2, min: 0, max: 4 }],
        gen: function (v) { return 'led.plot(' + v.x + ', ' + v.y + ');'; } },
      { id: 'pausa', cat: 'Control', etq: 'pausa ⟨ms⟩ ms', clase: 'ctrl',
        campos: [{ k: 'ms', t: 'num', def: 500, min: 1, max: 20000 }],
        gen: function (v) { return 'basic.pause(' + v.ms + ');'; } },
      { id: 'repetir_mb', cat: 'Control', etq: 'repetir ⟨n⟩ veces', clase: 'ctrl', contenedor: true,
        campos: [{ k: 'n', t: 'num', def: 3, min: 1, max: 100 }],
        gen: function (v, cuerpo) { return 'for (let i = 0; i < ' + v.n + '; i++) {\n' + cuerpo + '\n}'; } },
      { id: 'si_boton_mb', cat: 'Control', etq: 'si el botón ⟨b⟩ está pulsado', clase: 'ctrl', contenedor: true,
        campos: [{ k: 'b', t: 'sel', op: [['A', 'A'], ['B', 'B']], def: 'A' }],
        gen: function (v, cuerpo) { return 'if (input.buttonIsPressed("' + v.b + '")) {\n' + cuerpo + '\n}'; } },
      { id: 'si_agitar', cat: 'Control', etq: 'si se agita la placa', clase: 'ctrl', contenedor: true, campos: [],
        gen: function (v, cuerpo) { return 'if (input.isGesture("agitar")) {\n' + cuerpo + '\n}'; } },
      { id: 'pin_mb', cat: 'Pines', etq: 'poner pin ⟨p⟩ en ⟨v⟩',
        campos: [{ k: 'p', t: 'sel', op: [['0', '0'], ['1', '1'], ['2', '2']], def: '0' }, { k: 'v', t: 'sel', op: [['1', 'ENCENDIDO'], ['0', 'APAGADO']], def: '1' }],
        gen: function (v) { return 'pins.digitalWritePin(' + v.p + ', ' + v.v + ');'; } },
      { id: 'servo_mb', cat: 'Movimiento', etq: 'servo del pin ⟨p⟩ a ⟨a⟩°',
        campos: [{ k: 'p', t: 'sel', op: [['0', '0'], ['1', '1'], ['2', '2']], def: '1' }, { k: 'a', t: 'num', def: 90, min: 0, max: 180 }],
        gen: function (v) { return 'pins.servoWritePin(' + v.p + ', ' + v.a + ');'; } },
      { id: 'tono_mb', cat: 'Sonido', etq: 'tocar ⟨f⟩ Hz durante ⟨d⟩ ms',
        campos: [{ k: 'f', t: 'num', def: 440, min: 100, max: 2000 }, { k: 'd', t: 'num', def: 300, min: 50, max: 3000 }],
        gen: function (v) { return 'music.playTone(' + v.f + ', ' + v.d + ');'; } }
    ]
  };

  function defsActuales() { return DEFS[CL.codigo.familia()] || DEFS.arduino; }
  function buscarDef(id) {
    var d = defsActuales();
    for (var i = 0; i < d.length; i++) if (d[i].id === id) return d[i];
    var todos = DEFS.arduino.concat(DEFS.microbit);
    for (var j = 0; j < todos.length; j++) if (todos[j].id === id) return todos[j];
    return null;
  }

  /* ------------------------------------------------------------
     Programa
     ------------------------------------------------------------ */
  function prog() {
    var p = CL.state.proj.blocks;
    if (!p || Array.isArray(p)) p = CL.state.proj.blocks = { setup: [], loop: [] };
    p.setup = p.setup || []; p.loop = p.loop || [];
    return p;
  }

  B.agregar = function (idDef, seccion) {
    var def = buscarDef(idDef);
    if (!def) return;
    var v = {};
    (def.campos || []).forEach(function (c) { v[c.k] = c.def; });
    var item = { t: idDef, v: v };
    if (def.contenedor) item.hijos = [];
    var sec = def.seccion || seccion || B.seccionActiva || 'loop';
    prog()[sec].push(item);
    B.pintar();
    B.aplicar();
  };

  function quitar(lista, item) {
    var i = lista.indexOf(item);
    if (i >= 0) { lista.splice(i, 1); return true; }
    for (var j = 0; j < lista.length; j++) if (lista[j].hijos && quitar(lista[j].hijos, item)) return true;
    return false;
  }
  function mover(lista, item, delta) {
    var i = lista.indexOf(item);
    if (i >= 0) {
      var j = i + delta;
      if (j < 0 || j >= lista.length) return true;
      lista.splice(i, 1); lista.splice(j, 0, item);
      return true;
    }
    for (var k = 0; k < lista.length; k++) if (lista[k].hijos && mover(lista[k].hijos, item, delta)) return true;
    return false;
  }

  /* ------------------------------------------------------------
     Interfaz
     ------------------------------------------------------------ */
  B.seccionActiva = 'loop';

  B.pintar = function () {
    var lib = document.getElementById('blocksLib');
    var pl = document.getElementById('blocksProg');
    if (!lib || !pl) return;
    var defs = defsActuales();
    var cats = [];
    defs.forEach(function (d) { if (cats.indexOf(d.cat) < 0) cats.push(d.cat); });
    var html = '';
    cats.forEach(function (cat) {
      html += '<h5>' + CL.esc(cat) + '</h5>';
      defs.filter(function (d) { return d.cat === cat; }).forEach(function (d) {
        html += '<button class="blk ' + (d.clase || '') + '" data-id="' + d.id + '">' +
                CL.esc(d.etq.replace(/⟨\w+⟩/g, '…')) + '</button>';
      });
    });
    lib.innerHTML = html;
    CL.$$('.blk', lib).forEach(function (b) {
      b.addEventListener('click', function () { B.agregar(b.dataset.id); CL.sfx.click(); });
    });

    var p = prog();
    pl.innerHTML = '';
    pl.appendChild(seccionUI('setup', CL.codigo.familia() === 'microbit' ? 'Al iniciar' : 'Configuración (una vez)', p.setup));
    pl.appendChild(seccionUI('loop', CL.codigo.familia() === 'microbit' ? 'Siempre' : 'Repetir siempre', p.loop));
    document.getElementById('blocksCode').innerHTML = CL.codigo.resaltar(B.generar());
  };

  function seccionUI(id, titulo, lista) {
    var cont = CL.el('div', { class: 'bp-sec' });
    var cab = CL.el('div', { class: 'bp-item', style: 'background:rgba(129,140,248,.16);font-weight:600' },
      '▸ ' + CL.esc(titulo));
    cab.addEventListener('click', function () {
      B.seccionActiva = id;
      CL.$$('#blocksProg .bp-sec').forEach(function (s) { s.style.outline = ''; });
      cont.style.outline = '1px dashed var(--acc)';
    });
    cont.appendChild(cab);
    var caja = CL.el('div', { style: 'padding-left:10px' });
    if (!lista.length) caja.appendChild(CL.el('div', { class: 'bp-item', style: 'opacity:.55' }, 'Haz clic en un bloque de la izquierda…'));
    lista.forEach(function (it) { caja.appendChild(itemUI(it, lista)); });
    cont.appendChild(caja);
    return cont;
  }

  function itemUI(item, lista) {
    var def = buscarDef(item.t);
    var box = CL.el('div');
    var fila = CL.el('div', { class: 'bp-item' });
    if (!def) { fila.textContent = '¿?'; box.appendChild(fila); return box; }
    var partes = def.etq.split(/(⟨\w+⟩)/);
    partes.forEach(function (p) {
      var m = p.match(/^⟨(\w+)⟩$/);
      if (!m) { fila.appendChild(document.createTextNode(p)); return; }
      var campo = (def.campos || []).filter(function (c) { return c.k === m[1]; })[0];
      if (!campo) return;
      var ctrl;
      if (campo.t === 'sel') {
        ctrl = CL.el('select');
        campo.op.forEach(function (o) {
          var op = CL.el('option', { value: o[0] }, CL.esc(o[1]));
          if (String(item.v[campo.k]) === String(o[0])) op.selected = true;
          ctrl.appendChild(op);
        });
      } else {
        ctrl = CL.el('input', { type: campo.t === 'num' ? 'number' : 'text', value: item.v[campo.k] });
        if (campo.min !== undefined) ctrl.min = campo.min;
        if (campo.max !== undefined) ctrl.max = campo.max;
      }
      ctrl.addEventListener('change', function () {
        item.v[campo.k] = campo.t === 'num' ? +ctrl.value : ctrl.value;
        document.getElementById('blocksCode').innerHTML = CL.codigo.resaltar(B.generar());
        B.aplicar();
      });
      fila.appendChild(ctrl);
    });
    var acc = CL.el('div', { class: 'bp-move' });
    [['▲', -1], ['▼', 1]].forEach(function (a) {
      var b = CL.el('button', { title: 'Mover' }, a[0]);
      b.addEventListener('click', function () { mover(lista, item, a[1]); B.pintar(); B.aplicar(); });
      acc.appendChild(b);
    });
    var del = CL.el('button', { title: 'Quitar' }, '✕');
    del.addEventListener('click', function () { quitar(lista, item); B.pintar(); B.aplicar(); });
    acc.appendChild(del);
    fila.appendChild(acc);
    box.appendChild(fila);

    if (def.contenedor) {
      var dentro = CL.el('div', { style: 'padding-left:16px;border-left:2px solid rgba(129,140,248,.4);margin-left:8px' });
      if (!item.hijos.length) dentro.appendChild(CL.el('div', { class: 'bp-item', style: 'opacity:.55' }, 'vacío'));
      item.hijos.forEach(function (h) { dentro.appendChild(itemUI(h, item.hijos)); });
      var add = CL.el('button', { class: 'mini', style: 'margin:2px 0 6px' }, '+ añadir dentro');
      add.addEventListener('click', function () {
        B._destino = item.hijos;
        CL.toast('info', 'Elige un bloque', 'El siguiente bloque que pulses se colocará dentro de este.');
      });
      dentro.appendChild(add);
      box.appendChild(dentro);
    }
    return box;
  }

  /* ------------------------------------------------------------
     Generación de código
     ------------------------------------------------------------ */
  function generarLista(lista, sangria) {
    var out = [];
    lista.forEach(function (it) {
      var def = buscarDef(it.t);
      if (!def) return;
      var cuerpo = def.contenedor ? generarLista(it.hijos || [], sangria + '  ') : '';
      var txt = def.gen(it.v, cuerpo);
      out.push(txt.split('\n').map(function (l) { return sangria + l; }).join('\n'));
    });
    return out.join('\n');
  }

  B.generar = function () {
    var p = prog();
    var familia = CL.codigo.familia();
    var todos = (p.setup || []).concat(p.loop || []);
    var servos = {}, usaSerial = false;
    (function recorrer(l) {
      l.forEach(function (it) {
        var d = buscarDef(it.t);
        if (!d) return;
        if (d.servo) servos[it.v.p] = true;
        if (d.serial) usaSerial = true;
        if (it.hijos) recorrer(it.hijos);
      });
    }(todos));

    if (familia === 'microbit') {
      var s = '';
      if ((p.setup || []).length) s += generarLista(p.setup, '') + '\n\n';
      if ((p.loop || []).length) s += 'basic.forever(function () {\n' + generarLista(p.loop, '  ') + '\n});\n';
      return s || '// Añade bloques para crear tu programa\n';
    }

    var cab = '';
    Object.keys(servos).forEach(function (p2) { cab += 'Servo servo' + p2 + ';\n'; });
    if (cab) cab = '#include <Servo.h>\n\n' + cab + '\n';
    var setup = generarLista(p.setup || [], '  ');
    if (usaSerial) setup = '  Serial.begin(9600);\n' + setup;
    Object.keys(servos).forEach(function (p3) { setup = '  servo' + p3 + '.attach(' + p3 + ');\n' + setup; });
    var loop = generarLista(p.loop || [], '  ');
    return cab +
      'void setup() {\n' + (setup || '  // configuración') + '\n}\n\n' +
      'void loop() {\n' + (loop || '  // programa principal') + '\n}\n';
  };

  /** Escribe el código generado en el proyecto. */
  B.aplicar = function () {
    var c = B.generar();
    CL.state.setCodigo(c, true);
    CL.state.marcarSucio();
    CL.codigo.sincronizar();
  };

  B.vaciar = function () {
    CL.state.proj.blocks = { setup: [], loop: [] };
    B.pintar();
    B.aplicar();
  };

  /* Si hay un destino pendiente (añadir dentro), lo usa una sola vez */
  var agregarOriginal = B.agregar;
  B.agregar = function (idDef, seccion) {
    if (B._destino) {
      var def = buscarDef(idDef);
      if (def) {
        var v = {};
        (def.campos || []).forEach(function (c) { v[c.k] = c.def; });
        var item = { t: idDef, v: v };
        if (def.contenedor) item.hijos = [];
        B._destino.push(item);
        B._destino = null;
        B.pintar();
        B.aplicar();
        return;
      }
    }
    agregarOriginal(idDef, seccion);
  };

}(window.CL));
