/* ============================================================
   CircuitLab — diagnóstico educativo del circuito
   No se limita a decir "ERROR": explica la causa y cómo resolverla.
   ============================================================ */
(function (CL) {
  'use strict';

  var V = {};
  CL.validar = V;

  function comp(id) { return CL.state.comp(id); }
  function nombre(id) { var c = comp(id); return c ? CL.nombreComp(c) : id; }

  function diag(nivel, codigo, titulo, texto, arreglo, comps) {
    return { nivel: nivel, codigo: codigo, titulo: titulo, texto: texto, arreglo: arreglo || '', comps: comps || [] };
  }

  /* ------------------------------------------------------------
     Análisis completo. Devuelve {items, resumen, ok}
     ------------------------------------------------------------ */
  V.analizar = function () {
    var proj = CL.state.proj;
    var M = CL.circuito;
    var res = M.resolver(0.016);
    var items = [], resumen = [];
    var comps = proj.components;
    var i;

    /* ---------- 1. ¿Hay componentes? ---------- */
    if (!comps.length) {
      items.push(diag('info', 'vacio', 'El área de trabajo está vacía',
        'Todavía no has colocado ningún componente.',
        'Arrastra una protoboard y un LED desde el panel de la izquierda.'));
      return { items: items, resumen: resumen, ok: false };
    }

    /* ---------- 2. Alimentación ---------- */
    var fuentes = comps.filter(function (c) {
      var d = CL.catalogo[c.type];
      return d && (d.fuente || d.placa);
    });
    if (!fuentes.length) {
      items.push(diag('err', 'sin_fuente', 'Falta alimentación',
        'No hay ninguna fuente de energía en el circuito. Sin una batería, una fuente o una placa Arduino, ningún componente puede funcionar.',
        'Agrega una batería, una fuente de 5 V o una placa Arduino y conéctala al circuito.'));
      resumen.push({ n: 'err', t: 'Alimentación: no hay fuente' });
    } else {
      // las placas se alimentan solas (USB/batería); solo se exige conexión a las fuentes externas
      var externas = fuentes.filter(function (c) { return !CL.catalogo[c.type].placa; });
      var conectada = !externas.length || externas.some(function (c) {
        var d = CL.catalogo[c.type];
        return d.pins.some(function (p) { return CL.circuito.conectado(c.id, p.id); });
      });
      if (!conectada) {
        items.push(diag('err', 'fuente_suelta', 'La fuente no está conectada',
          'Hay una fuente de energía en la mesa, pero ninguno de sus bornes está unido al circuito.',
          'Traza un cable desde el borne + hacia el circuito y otro desde el borne − (GND) para cerrar el camino.',
          fuentes.map(function (c) { return c.id; })));
        resumen.push({ n: 'err', t: 'Alimentación: fuente sin conectar' });
      } else {
        resumen.push({ n: 'ok', t: 'Alimentación conectada' });
      }
    }

    /* ---------- 3. Tierra (GND) ---------- */
    if (fuentes.length && !res.hayTierra) {
      resumen.push({ n: 'warn', t: 'No hay un GND declarado (se usa el borne − de la fuente)' });
    } else if (res.hayTierra) {
      resumen.push({ n: 'ok', t: 'GND conectado' });
    }

    /* ---------- 4. Cortocircuitos ---------- */
    var corto = [];
    (res.fuentes || []).forEach(function (f) {
      if (Math.abs(f.i) > (f.imax || 2)) corto.push(f);
    });
    if (corto.length) {
      var esPin = corto[0].rol === 'pin';
      items.push(diag('err', 'corto', esPin ? 'Pin de la placa sobrecargado' : 'Cortocircuito detectado',
        esPin
          ? 'Por el pin ' + (corto[0].pin || '') + ' está pasando ' + CL.fmtA(corto[0].i) + '. Un pin de Arduino solo puede entregar unos 40 mA; más que eso lo daña.'
          : 'La fuente está entregando ' + CL.fmtA(corto[0].i) + ', mucho más de lo normal. Eso significa que hay un camino directo entre + y − sin ningún componente que limite la corriente.',
        esPin
          ? 'Coloca una resistencia en serie (220 Ω para un LED) o usa un transistor/driver si mueves un motor.'
          : 'Revisa los cables: busca uno que una el riel rojo con el riel azul, o un componente con las dos patas en la misma columna de la protoboard.',
        corto.map(function (f) { return f.comp; })));
      resumen.push({ n: 'err', t: 'Cortocircuito: la corriente es demasiado alta' });
    } else if (fuentes.length) {
      resumen.push({ n: 'ok', t: 'Sin cortocircuitos' });
    }

    /* ---------- 5. LEDs ---------- */
    var leds = comps.filter(function (c) { return c.type === 'led'; });
    var ledEncendido = false, ledSinR = [], ledInvertido = [], ledAbierto = [];
    leds.forEach(function (c) {
      var st = res.comps[c.id] || {};
      var e = st._e || {};
      var iled = e.corriente || 0;
      var dv = e.caida || 0;
      if (st.brillo > 0.02) ledEncendido = true;
      if (iled > 0.026) ledSinR.push(c.id);
      var conectadoA = CL.circuito.conectado(c.id, 'a'), conectadoK = CL.circuito.conectado(c.id, 'k');
      if (!conectadoA || !conectadoK) ledAbierto.push(c.id);
      else if (dv < -0.8 && st.brillo <= 0.02) ledInvertido.push(c.id);
    });
    if (ledSinR.length) {
      items.push(diag('warn', 'led_sin_r', 'LED sin resistencia',
        'El LED está recibiendo ' + CL.fmtA((res.comps[ledSinR[0]]._e || {}).corriente) + '. Un LED soporta unos 20 mA: con más corriente se quema en pocos segundos.',
        'Agrega una resistencia de 220 Ω en serie entre la fuente y el ánodo del LED. Fórmula: R = (5 V − 2 V) / 0,02 A = 150 Ω → se usa 220 Ω.',
        ledSinR));
      resumen.push({ n: 'warn', t: 'LED sin resistencia limitadora' });
    }
    if (ledInvertido.length) {
      items.push(diag('warn', 'led_invertido', 'LED conectado al revés',
        'El LED tiene tensión, pero al revés: el lado positivo llegó al cátodo (−) en lugar del ánodo (+). Un LED solo deja pasar la corriente en un sentido.',
        'Gira el LED (tecla R) o intercambia los dos cables: el ánodo (pata larga, +) debe mirar hacia la fuente y el cátodo (−) hacia GND.',
        ledInvertido));
      resumen.push({ n: 'warn', t: 'Hay un LED con la polaridad invertida' });
    }
    if (ledAbierto.length) {
      items.push(diag('err', 'led_suelto', 'El circuito está abierto',
        'Al LED le falta conexión en una de sus patas, así que la corriente no tiene por dónde circular.',
        'Revisa que el ánodo llegue (a través de la resistencia) hasta el +, y que el cátodo llegue hasta GND.',
        ledAbierto));
      resumen.push({ n: 'err', t: 'Circuito abierto: hay un LED suelto' });
    }
    // Un LED apagado no siempre es un error: puede estar gobernado por un
    // pulsador, un interruptor o el programa de la placa.
    var hayMandos = comps.some(function (c) { return c.type === 'pulsador' || c.type === 'interruptor'; });
    var hayPrograma = comps.some(function (c) { var d = CL.catalogo[c.type]; return d && d.placa; }) && !!(proj.code || '').trim();
    if (leds.length && !ledEncendido && !ledSinR.length && !ledInvertido.length && !ledAbierto.length &&
        !corto.length && fuentes.length && !hayMandos && !hayPrograma) {
      items.push(diag('err', 'abierto', 'El circuito está abierto',
        'Todo parece colocado, pero no circula corriente por el LED. Falta un tramo del camino: la corriente debe salir del +, pasar por todos los componentes y volver al −.',
        'Sigue el recorrido con el dedo: + → resistencia → ánodo → cátodo → GND. Si algún salto no existe, agrega un cable. Activa 🔗 para ver las conexiones internas de la protoboard.'));
      resumen.push({ n: 'err', t: 'Continuidad: el circuito está abierto' });
    } else if (leds.length && !ledEncendido && (hayMandos || hayPrograma)) {
      resumen.push({ n: 'ok', t: 'El LED está apagado en este momento (lo controla ' + (hayPrograma ? 'el programa' : 'el pulsador/interruptor') + ')' });
    }
    if (ledEncendido) resumen.push({ n: 'ok', t: 'Hay al menos un LED encendido' });

    /* ---------- 6. Resistencias ---------- */
    var res220 = comps.filter(function (c) { return c.type === 'resistor'; });
    if (leds.length && !res220.length) {
      items.push(diag('warn', 'falta_r', 'No hay ninguna resistencia',
        'Los LED necesitan una resistencia que limite la corriente. Sin ella, la corriente sube tanto que el LED se daña.',
        'Coloca una resistencia de 220 Ω en serie con cada LED.'));
    } else if (res220.length) {
      resumen.push({ n: 'ok', t: 'Hay resistencias en el circuito' });
    }

    /* ---------- 7. Componentes desconectados ---------- */
    var sueltos = [];
    comps.forEach(function (c) {
      var d = CL.catalogo[c.type];
      if (!d || d.esProto || d.placa) return;      // las placas funcionan por sí solas
      var libres = d.pins.filter(function (p) { return !CL.circuito.conectado(c.id, p.id); });
      if (libres.length === d.pins.length && d.pins.length) sueltos.push(c.id);
    });
    if (sueltos.length) {
      items.push(diag('info', 'suelto', 'Hay componentes sin conectar',
        'Estos componentes están sobre la mesa pero no forman parte del circuito: ' +
        sueltos.map(nombre).join(', ') + '.',
        'Insértalos en la protoboard o únelos con cables. Un componente suelto no hace nada.',
        sueltos));
      resumen.push({ n: 'warn', t: sueltos.length + ' componente(s) sin conectar' });
    }

    /* ---------- 8. Motores ---------- */
    comps.filter(function (c) { return c.type === 'motor'; }).forEach(function (c) {
      var st = res.comps[c.id] || {};
      var tieneCon = CL.circuito.conectado(c.id, 'p') && CL.circuito.conectado(c.id, 'n');
      if (tieneCon && (st.velocidad || 0) === 0) {
        items.push(diag('warn', 'motor_sin_v', 'El motor no recibe suficiente tensión',
          'El motor está conectado pero la tensión que le llega (' + CL.fmtV(Math.abs(st.tension || 0)) + ') no alcanza para hacerlo girar.',
          'Un motor necesita al menos 1 V y bastante corriente. Aliméntalo con una batería y no directamente desde un pin de Arduino.',
          [c.id]));
        resumen.push({ n: 'warn', t: 'Motor sin alimentación suficiente' });
      } else if (!tieneCon) {
        items.push(diag('err', 'motor_suelto', 'Motor sin alimentación',
          'El motor tiene al menos una pata sin conectar.',
          'Conecta un borne al + de la batería (o a la salida de un driver) y el otro al −.',
          [c.id]));
        resumen.push({ n: 'err', t: 'Motor sin alimentación' });
      } else {
        resumen.push({ n: 'ok', t: 'Motor girando al ' + Math.round((st.velocidad || 0) * 100) + '%' });
      }
    });

    /* ---------- 9. Sensores ---------- */
    comps.forEach(function (c) {
      var d = CL.catalogo[c.type];
      if (!d || !d.sensor) return;
      var st = res.comps[c.id] || {};
      if (st.alimentado === false) {
        items.push(diag('warn', 'sensor_sin_v', nombre(c.id) + ' sin alimentación',
          'El sensor necesita recibir tensión en su pin VCC y tener el GND conectado. Sin eso, su salida no entrega ningún valor útil.',
          'Conecta VCC al riel rojo (+5 V) y GND al riel azul (−). Recuerda unir el GND del sensor con el del Arduino.',
          [c.id]));
        resumen.push({ n: 'warn', t: nombre(c.id) + ': sin alimentación' });
      } else if (st.alimentado === true) {
        resumen.push({ n: 'ok', t: nombre(c.id) + ': ' + (st.texto || 'funcionando') });
      }
    });

    /* ---------- 10. Condensadores al revés ---------- */
    comps.filter(function (c) { return c.type === 'condensador'; }).forEach(function (c) {
      var e = (res.comps[c.id] || {})._e || {};
      if ((e.caida || 0) < -0.5) {
        items.push(diag('warn', 'cap_polaridad', 'Condensador con la polaridad invertida',
          'Los condensadores electrolíticos tienen polaridad. Conectado al revés se calienta y puede dañarse.',
          'La pata marcada con − debe ir al lado negativo (GND).',
          [c.id]));
      }
    });

    /* ---------- 11. Placas sin programa ---------- */
    var placas = comps.filter(function (c) { var d = CL.catalogo[c.type]; return d && d.placa; });
    if (placas.length && !(CL.state.proj.code || '').trim()) {
      items.push(diag('info', 'sin_codigo', 'La placa no tiene programa',
        'Colocaste una placa, pero todavía no has escrito código. Sin programa, sus pines no hacen nada.',
        'Abre el editor con el botón ⌨️ Código y escribe tu programa.',
        placas.map(function (c) { return c.id; })));
    }

    /* ---------- 12. Todo correcto ---------- */
    var hayError = items.some(function (d) { return d.nivel === 'err' || d.nivel === 'warn'; });
    if (!hayError && fuentes.length) {
      items.push(diag('ok', 'ok', '¡Correcto! El circuito está completo',
        'La corriente puede salir de la fuente, recorrer todos los componentes y volver. ' +
        (ledEncendido ? 'El LED enciende porque recibe la corriente adecuada.' : ''),
        'Prueba a cambiar valores (resistencia, tensión, posición del potenciómetro) y observa qué ocurre.'));
    }

    return { items: items, resumen: resumen, ok: !hayError, res: res };
  };

  /* ------------------------------------------------------------
     Comprobaciones sueltas para ejercicios y retos
     ------------------------------------------------------------ */
  V.hayComponente = function (tipo, n) { return CL.state.cuenta(tipo) >= (n || 1); };

  V.ledEncendido = function (idOpcional) {
    var r = CL.circuito.resultado;
    if (!r) return false;
    var leds = CL.state.compsPorTipo('led');
    for (var i = 0; i < leds.length; i++) {
      if (idOpcional && leds[i].id !== idOpcional) continue;
      var st = r.comps[leds[i].id];
      if (st && st.brillo > 0.05) return true;
    }
    return false;
  };
  V.cuantosLedsEncendidos = function () {
    var r = CL.circuito.resultado, n = 0;
    if (!r) return 0;
    CL.state.compsPorTipo('led').forEach(function (c) {
      var st = r.comps[c.id];
      if (st && st.brillo > 0.05) n++;
    });
    return n;
  };
  V.corrienteLed = function () {
    var r = CL.circuito.resultado, max = 0;
    if (!r) return 0;
    CL.state.compsPorTipo('led').forEach(function (c) {
      var e = (r.comps[c.id] || {})._e || {};
      max = Math.max(max, e.corriente || 0);
    });
    return max;
  };
  V.sinErrores = function () {
    var a = V.analizar();
    return !a.items.some(function (d) { return d.nivel === 'err' || d.nivel === 'warn'; });
  };
  V.hayCorto = function () {
    var a = V.analizar();
    return a.items.some(function (d) { return d.codigo === 'corto'; });
  };
  /** ¿La resistencia está realmente en serie con el LED? */
  V.resistenciaEnSerieConLed = function () {
    var leds = CL.state.compsPorTipo('led'), rs = CL.state.compsPorTipo('resistor');
    if (!leds.length || !rs.length) return false;
    for (var i = 0; i < leds.length; i++) {
      var netA = CL.circuito.netDePin(leds[i].id, 'a'), netK = CL.circuito.netDePin(leds[i].id, 'k');
      for (var j = 0; j < rs.length; j++) {
        var ra = CL.circuito.netDePin(rs[j].id, 'a'), rb = CL.circuito.netDePin(rs[j].id, 'b');
        if (ra === netA || rb === netA || ra === netK || rb === netK) return true;
      }
    }
    return false;
  };
  V.motorGirando = function () {
    var r = CL.circuito.resultado;
    if (!r) return false;
    return CL.state.compsPorTipo('motor').some(function (c) {
      var st = r.comps[c.id];
      return st && st.velocidad > 0.05;
    });
  };
  V.buzzerSonando = function () {
    var r = CL.circuito.resultado;
    if (!r) return false;
    return CL.state.compsPorTipo('buzzer').some(function (c) {
      var st = r.comps[c.id];
      return st && st.sonando;
    });
  };
  V.servoEnAngulo = function (min, max) {
    var r = CL.circuito.resultado;
    if (!r) return false;
    return CL.state.compsPorTipo('servo').some(function (c) {
      var st = r.comps[c.id];
      return st && st.alimentado && st.angulo >= min && st.angulo <= max;
    });
  };
  /** ¿Dos pines están en el mismo nodo eléctrico? */
  V.mismoNodo = function (c1, p1, c2, p2) {
    var a = CL.circuito.netDePin(c1, p1), b = CL.circuito.netDePin(c2, p2);
    return a >= 0 && a === b;
  };
  /** ¿Existe un componente de este tipo conectado a la alimentación? */
  V.tieneAlimentacion = function (tipo) {
    var r = CL.circuito.resultado;
    if (!r) return false;
    return CL.state.compsPorTipo(tipo).some(function (c) {
      var st = r.comps[c.id];
      return st && st.alimentado;
    });
  };

}(window.CL));
