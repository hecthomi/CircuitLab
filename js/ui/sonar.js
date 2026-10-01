/* ============================================================
   CircuitLab — región de detección del sensor ultrasónico
   ------------------------------------------------------------
   Con la simulación en marcha, al seleccionar un HC-SR04 aparece
   el cono que representa el espacio donde el sensor puede ver un
   objeto grande, y dentro un círculo: el objeto objetivo. Se
   arrastra por la región y con eso cambia la distancia real que
   mide el sensor (props.distancia), igual que moviendo la mano
   delante del sensor de verdad.

   El estado vive aquí y no en el proyecto: la posición del
   objetivo es un mando de la simulación, no parte del circuito
   (lo que se guarda es la distancia, que sí es una propiedad).
   ============================================================ */
(function (CL) {
  'use strict';

  var S = {};
  CL.sonar = S;

  var ESCALA = 0.8;      // píxeles del lienzo por centímetro
  var HAZ    = 15;       // semiángulo del haz (el HC-SR04 real ronda los 15°)
  var DMIN   = 2;        // el sensor no mide más cerca de 2 cm
  var DMAX   = 400;      // ni más lejos de 4 m
  var CARA   = 42;       // borde superior de la placa en coordenadas locales
  var RADIO  = 9;        // radio del círculo objetivo

  /* Ángulo del objetivo por componente. La distancia no se guarda aquí:
     la fuente de verdad es c.props.distancia, así el deslizador del
     inspector y el objetivo nunca se contradicen. */
  var angulos = {};
  /* Radio del objetivo SOLO mientras está fuera del haz: ahí el sensor no lo
     ve y `props.distancia` pasa a ser "fuera de alcance", así que la bolita
     necesita recordar por su cuenta a qué distancia la dejaron. Dentro del
     haz manda `props.distancia`, como siempre. */
  var radios = {};
  var arrastrando = null;
  // null y no '': cuando no hay ningún sensor seleccionado la firma ES la
  // cadena vacía, y comparándola con '' nunca se repintaba para borrar el
  // cono del sensor que se acababa de deseleccionar.
  var ultimaFirma = null;

  function esSonar(c) { return c && c.type === 'ultrasonico'; }

  /** Sensores que deben mostrar su región ahora mismo: los seleccionados.
      No hace falta que la simulación esté en marcha; basta con hacer clic
      en el sensor para ver su cono y su objetivo. */
  function activos() {
    return CL.state.sel
      .map(function (id) { return CL.state.comp(id); })
      .filter(esSonar);
  }

  /** Origen del haz y sus ejes, ya girados como esté el componente. */
  function marco(c) {
    var o = CL.rot(0, -CARA, c.rot);
    var f = CL.rot(0, -1, c.rot);          // hacia dónde "mira" el sensor
    return { ox: c.x + o.x, oy: c.y + o.y, fx: f.x, fy: f.y };
  }

  function distanciaDe(c) {
    return CL.clamp(+c.props.distancia || DMIN, DMIN, DMAX);
  }

  /** ¿El objetivo cae dentro del haz? Fuera de él no hay eco que medir. */
  function dentroDe(c) { return Math.abs(angulos[c.id] || 0) <= HAZ; }
  S.dentro = dentroDe;

  /** Radio (en cm) al que se dibuja la bolita. */
  function radioDe(c) {
    if (dentroDe(c)) return distanciaDe(c);      // dentro manda el deslizador
    return CL.clamp(radios[c.id] || distanciaDe(c), DMIN, DMAX);
  }

  /** Posición en el lienzo del círculo objetivo de este sensor. */
  function posObjetivo(c) {
    var m = marco(c);
    var d = CL.rot(m.fx, m.fy, angulos[c.id] || 0);
    var r = radioDe(c) * ESCALA;
    return { x: m.ox + d.x * r, y: m.oy + d.y * r };
  }

  /* ------------------------------------------------------------
     Enganches con los gestos del lienzo (workspace.js)
     ------------------------------------------------------------ */
  /** ¿El puntero está sobre el objetivo de algún sensor visible? */
  S.objetivoEn = function (x, y) {
    var lista = activos(), mejor = null, md = RADIO + 4;
    lista.forEach(function (c) {
      var q = posObjetivo(c);
      var d = CL.dist(x, y, q.x, q.y);
      if (d < md) { md = d; mejor = c.id; }
    });
    return mejor;
  };

  S.empezarArrastre = function (id) { arrastrando = id; };

  S.arrastrar = function (x, y) {
    if (!arrastrando) return false;
    var c = CL.state.comp(arrastrando);
    if (!c) { arrastrando = null; return false; }
    var m = marco(c);
    var vx = x - m.ox, vy = y - m.oy;

    // ángulo con signo respecto al eje del sensor, y distancia sobre el lienzo
    var frente = vx * m.fx + vy * m.fy;
    var lado   = m.fx * vy - m.fy * vx;
    var ang    = Math.atan2(lado, frente) * 180 / Math.PI;

    // el objetivo se mueve libre, también fuera del haz: allí el sensor deja
    // de verlo y la medida pasa a ser "fuera de alcance", igual que cuando el
    // eco de un HC-SR04 real no vuelve.
    angulos[c.id] = ang;
    var largo = Math.sqrt(vx * vx + vy * vy);
    var cm = CL.clamp(largo / ESCALA, DMIN, DMAX);
    radios[c.id] = cm;
    var visto = Math.abs(ang) <= HAZ;

    CL.state.setProp(c.id, 'distancia', visto ? Math.round(cm * 10) / 10 : DMAX, true);
    CL.circuito.marcarSucio();
    S.pintar();
    return true;
  };

  S.soltar = function () {
    if (!arrastrando) return false;
    arrastrando = null;
    CL.state.marcarSucio();
    CL.sfx.click();
    return true;
  };

  S.arrastrando = function () { return !!arrastrando; };

  /* ------------------------------------------------------------
     Dibujo
     ------------------------------------------------------------ */
  function arco(m, radio) {
    var a = CL.rot(m.fx, m.fy, -HAZ), b = CL.rot(m.fx, m.fy, HAZ);
    return 'M' + m.ox + ' ' + m.oy +
      ' L' + (m.ox + a.x * radio) + ' ' + (m.oy + a.y * radio) +
      ' A' + radio + ' ' + radio + ' 0 0 1 ' +
      (m.ox + b.x * radio) + ' ' + (m.oy + b.y * radio) + ' Z';
  }

  S.pintar = function () {
    var capa = document.getElementById('layOverlay');
    if (!capa) return;
    CL.$$('#layOverlay .sn-region').forEach(function (n) { n.remove(); });

    var lista = activos();
    if (!lista.length) return;

    lista.forEach(function (c) {
      var m = marco(c);
      var q = posObjetivo(c);
      var visto = dentroDe(c);
      var cm = distanciaDe(c);
      var g = CL.svg('g', {
        class: 'sn-region ' + (visto ? 'dentro' : 'fuera'), 'data-sonar': c.id
      });

      // el cono: todo el espacio que el sensor alcanza a ver
      g.appendChild(CL.svg('path', { class: 'sn-cono', d: arco(m, DMAX * ESCALA) }));
      // la parte hasta el objeto, más marcada: es lo que está midiendo.
      // Si el objetivo se salió del haz no hay nada que medir.
      if (visto) {
        g.appendChild(CL.svg('path', { class: 'sn-cono activo', d: arco(m, cm * ESCALA) }));
      }

      // línea sensor → objeto y el propio objeto
      g.appendChild(CL.svg('path', {
        class: 'sn-linea', d: 'M' + m.ox + ' ' + m.oy + ' L' + q.x + ' ' + q.y
      }));
      g.appendChild(CL.svg('circle', { class: 'sn-halo', cx: q.x, cy: q.y, r: RADIO + 7 }));
      g.appendChild(CL.svg('circle', { class: 'sn-obj', cx: q.x, cy: q.y, r: RADIO }));
      g.appendChild(CL.svg('circle', { class: 'sn-brillo', cx: q.x - 2.6, cy: q.y - 3, r: 3 }));

      // lectura junto al sensor, en pulgadas y centímetros como los medidores
      // reales; si el objeto se salió del haz no hay eco que cronometrar
      var txt = visto ? (cm / 2.54).toFixed(1) + 'in / ' + cm.toFixed(1) + 'cm'
                      : 'sin eco · fuera del haz';
      var ancho = txt.length * 5.4 + 10;
      // Se aparta lo justo para no taparse con la placa (media anchura 32) y
      // siempre hacia ABAJO en pantalla: arriba de lo seleccionado sale la
      // barra flotante de acciones y se pisaban. Con el sensor girado 90° el
      // perpendicular apunta hacia arriba, así que hay que darle la vuelta.
      var lado = CL.rot(m.fx, m.fy, -90);          // perpendicular al haz
      if (lado.y < -0.01) { lado.x = -lado.x; lado.y = -lado.y; }
      var sep = 32 + ancho / 2 + 8;
      var lx = m.ox + lado.x * sep + m.fx * 6;
      var ly = m.oy + lado.y * sep + m.fy * 6;
      g.appendChild(CL.svg('rect', {
        class: 'sn-etq-caja', x: lx - ancho / 2, y: ly - 8, width: ancho, height: 16, rx: 4
      }));
      var t = CL.svg('text', { class: 'sn-etq', x: lx, y: ly + 3.6, 'text-anchor': 'middle' }, txt);
      g.appendChild(t);

      capa.appendChild(g);
    });
  };

  /** Firma barata para no repintar 60 veces por segundo sin necesidad. */
  function firma() {
    return activos().map(function (c) {
      return c.id + ':' + c.x + ',' + c.y + ',' + c.rot + ',' + c.props.distancia +
             ',' + (angulos[c.id] || 0) + ',' + (radios[c.id] || 0);
    }).join('|');
  }

  function repintarSiCambio() {
    var f = firma();
    if (f === ultimaFirma) return;
    ultimaFirma = f;
    S.pintar();
  }

  /* ------------------------------------------------------------
     Arranque
     ------------------------------------------------------------ */
  var avisado = false;

  S.iniciar = function () {
    ['seleccion:cambio', 'vista:cambio', 'circuito:cambio'].forEach(function (ev) {
      CL.on(ev, function () { ultimaFirma = null; repintarSiCambio(); });
    });

    CL.on('sim:estado', function () {
      ultimaFirma = null;
      S.pintar();
    });

    // el componente puede moverse mientras la simulación corre
    CL.on('sim:tick', repintarSiCambio);

    CL.on('seleccion:cambio', function () {
      if (avisado || !activos().length) return;
      avisado = true;
      if (CL.pref('sonarVisto', false)) return;
      CL.setPref('sonarVisto', true);
      CL.toast('info', 'Región del sensor ultrasónico',
        'El cono es lo que el sensor alcanza a ver: se pone verde mientras la bolita esté dentro y rojo si la sacas del haz. Arrástrala para cambiar la distancia medida.', 7000);
    });
  };

}(window.CL));
