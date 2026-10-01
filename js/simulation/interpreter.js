/* ============================================================
   CircuitLab — intérprete didáctico
   Subconjunto de C++ (Arduino) y dialecto de la micro:bit.
   Se ejecuta con generadores: cada instrucción cede el control,
   así delay() no congela el navegador y la simulación sigue viva.
   ============================================================ */
(function (CL) {
  'use strict';

  /* ============================================================
     1. ANALIZADOR LÉXICO
     ============================================================ */
  var TIPOS = ['void', 'int', 'long', 'float', 'double', 'bool', 'boolean', 'char', 'byte', 'word',
               'unsigned', 'String', 'const', 'static', 'let', 'var', 'uint8_t', 'int8_t',
               'uint16_t', 'int16_t', 'uint32_t', 'size_t', 'Servo'];
  var CLAVES = ['if', 'else', 'for', 'while', 'do', 'return', 'break', 'continue', 'switch',
                'case', 'default', 'function', 'true', 'false', 'null'];

  var OPS3 = ['<<=', '>>=', '...'];
  var OPS2 = ['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=',
              '<<', '>>', '&=', '|=', '^=', '->'];

  function ErrorCL(msg, linea) {
    this.mensaje = msg; this.linea = linea; this.esErrorCL = true;
  }

  function lexer(src) {
    var toks = [], i = 0, linea = 1, n = src.length;
    function push(t, v) { toks.push({ t: t, v: v, l: linea }); }
    while (i < n) {
      var c = src[i];
      if (c === '\n') { linea++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
      // comentarios
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') {
        i += 2;
        while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') linea++; i++; }
        i += 2; continue;
      }
      // directivas del preprocesador: se ignoran
      if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
      // números
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        var j = i;
        if (c === '0' && (src[i + 1] === 'x' || src[i + 1] === 'X')) {
          j = i + 2;
          while (j < n && /[0-9a-fA-F]/.test(src[j])) j++;
          push('num', parseInt(src.slice(i, j), 16));
        } else if (c === 'B' || c === 'b') {
          j = i + 1;
          while (j < n && /[01]/.test(src[j])) j++;
          push('num', parseInt(src.slice(i + 1, j), 2));
        } else {
          while (j < n && /[0-9.]/.test(src[j])) j++;
          if (src[j] === 'e' || src[j] === 'E') { j++; if (src[j] === '-' || src[j] === '+') j++; while (j < n && /[0-9]/.test(src[j])) j++; }
          push('num', parseFloat(src.slice(i, j)));
          while (j < n && /[fFlLuU]/.test(src[j])) j++;    // sufijos 1.0f, 100L…
        }
        i = j; continue;
      }
      // cadenas
      if (c === '"') {
        var s = '', k = i + 1;
        while (k < n && src[k] !== '"') {
          if (src[k] === '\\') { s += escapa(src[k + 1]); k += 2; }
          else { if (src[k] === '\n') linea++; s += src[k]; k++; }
        }
        push('str', s); i = k + 1; continue;
      }
      if (c === "'") {
        var ch = src[i + 1], k2 = i + 2;
        if (ch === '\\') { ch = escapa(src[i + 2]); k2 = i + 3; }
        push('num', ch.charCodeAt(0)); i = k2 + 1; continue;
      }
      // identificadores
      if (/[A-Za-z_$]/.test(c)) {
        var j2 = i;
        while (j2 < n && /[A-Za-z0-9_$]/.test(src[j2])) j2++;
        var pal = src.slice(i, j2);
        push(CLAVES.indexOf(pal) >= 0 ? 'clave' : (TIPOS.indexOf(pal) >= 0 ? 'tipo' : 'id'), pal);
        i = j2; continue;
      }
      // operadores
      var tres = src.substr(i, 3), dos = src.substr(i, 2);
      if (OPS3.indexOf(tres) >= 0) { push('op', tres); i += 3; continue; }
      if (OPS2.indexOf(dos) >= 0) { push('op', dos); i += 2; continue; }
      if ('+-*/%=<>!&|^~?:;,(){}[].'.indexOf(c) >= 0) { push('op', c); i++; continue; }
      throw new ErrorCL('Carácter no reconocido: "' + c + '"', linea);
    }
    push('eof', null);
    return toks;
  }
  function escapa(c) {
    return c === 'n' ? '\n' : c === 't' ? '\t' : c === 'r' ? '\r' : c === '0' ? '\0' : c;
  }

  /* ============================================================
     2. ANALIZADOR SINTÁCTICO
     ============================================================ */
  function Parser(toks) { this.k = toks; this.i = 0; }
  Parser.prototype.tok = function (d) { return this.k[this.i + (d || 0)]; };
  Parser.prototype.es = function (t, v) {
    var k = this.tok();
    return k.t === t && (v === undefined || k.v === v);
  };
  Parser.prototype.esOp = function (v) { return this.es('op', v); };
  Parser.prototype.come = function (t, v) {
    if (!this.es(t, v)) {
      throw new ErrorCL('Se esperaba ' + (v ? '"' + v + '"' : t) + ' pero se encontró "' +
        (this.tok().v === null ? 'fin del programa' : this.tok().v) + '"', this.tok().l);
    }
    return this.k[this.i++];
  };
  Parser.prototype.opcional = function (t, v) { if (this.es(t, v)) { this.i++; return true; } return false; };

  /* ---- programa ---- */
  Parser.prototype.programa = function () {
    var cuerpo = [];
    while (!this.es('eof')) {
      var d = this.declaracionSuperior();
      if (d) cuerpo.push(d);
    }
    return { tipo: 'Programa', cuerpo: cuerpo };
  };

  Parser.prototype.declaracionSuperior = function () {
    if (this.opcional('op', ';')) return null;
    // función o variable con tipo
    if (this.es('tipo')) {
      var tipos = [];
      while (this.es('tipo')) tipos.push(this.k[this.i++].v);
      var nombre = this.come('id').v;
      if (this.esOp('(')) return this.funcion(nombre, tipos);
      return this.declVarResto(nombre, tipos, true);
    }
    if (this.es('clave', 'function')) {          // dialecto micro:bit
      this.i++;
      var nom = this.come('id').v;
      return this.funcion(nom, ['function']);
    }
    // expresión suelta (llamadas de nivel superior del dialecto micro:bit)
    var e = this.expresion();
    this.opcional('op', ';');
    return { tipo: 'ExprStmt', expr: e, l: e.l };
  };

  Parser.prototype.funcion = function (nombre, tipos) {
    var l = this.tok().l;
    this.come('op', '(');
    var params = [];
    while (!this.esOp(')')) {
      while (this.es('tipo')) this.i++;
      if (this.es('id')) params.push(this.k[this.i++].v);
      if (this.esOp('[')) { this.i++; this.opcional('op', ']'); }
      if (!this.opcional('op', ',')) break;
    }
    this.come('op', ')');
    var cuerpo = this.bloque();
    return { tipo: 'Funcion', nombre: nombre, params: params, cuerpo: cuerpo, tipos: tipos, l: l };
  };

  Parser.prototype.declVarResto = function (nombre, tipos, global) {
    var l = this.tok().l, decls = [];
    var actual = nombre;
    while (true) {
      var esArr = false, tam = null;
      if (this.esOp('[')) {
        this.i++;
        esArr = true;
        if (!this.esOp(']')) tam = this.expresion();
        this.come('op', ']');
      }
      var init = null;
      if (this.esOp('=')) { this.i++; init = this.esOp('{') ? this.listaInicial() : this.asignacion(); }
      decls.push({ nombre: actual, init: init, arr: esArr, tam: tam });
      if (this.opcional('op', ',')) { actual = this.come('id').v; continue; }
      break;
    }
    this.opcional('op', ';');
    return { tipo: 'DeclVar', tipos: tipos, decls: decls, global: !!global, l: l };
  };

  Parser.prototype.listaInicial = function () {
    var l = this.tok().l;
    this.come('op', '{');
    var els = [];
    while (!this.esOp('}')) {
      els.push(this.esOp('{') ? this.listaInicial() : this.asignacion());
      if (!this.opcional('op', ',')) break;
    }
    this.come('op', '}');
    return { tipo: 'Arreglo', elementos: els, l: l };
  };

  Parser.prototype.bloque = function () {
    var l = this.tok().l;
    this.come('op', '{');
    var cuerpo = [];
    while (!this.esOp('}') && !this.es('eof')) cuerpo.push(this.sentencia());
    this.come('op', '}');
    return { tipo: 'Bloque', cuerpo: cuerpo, l: l };
  };

  Parser.prototype.sentencia = function () {
    var t = this.tok(), l = t.l;
    if (this.esOp('{')) return this.bloque();
    if (this.esOp(';')) { this.i++; return { tipo: 'Vacia', l: l }; }
    if (t.t === 'tipo') {
      var tipos = [];
      while (this.es('tipo')) tipos.push(this.k[this.i++].v);
      var nom = this.come('id').v;
      if (this.esOp('(')) return this.funcion(nom, tipos);   // función anidada: se admite
      return this.declVarResto(nom, tipos, false);
    }
    if (t.t === 'clave') {
      switch (t.v) {
        case 'if': return this.si();
        case 'for': return this.para();
        case 'while': return this.mientras();
        case 'do': return this.hacer();
        case 'switch': return this.segun();
        case 'return':
          this.i++;
          var val = this.esOp(';') ? null : this.expresion();
          this.opcional('op', ';');
          return { tipo: 'Return', valor: val, l: l };
        case 'break':  this.i++; this.opcional('op', ';'); return { tipo: 'Break', l: l };
        case 'continue': this.i++; this.opcional('op', ';'); return { tipo: 'Continue', l: l };
      }
    }
    var e = this.expresion();
    this.opcional('op', ';');
    return { tipo: 'ExprStmt', expr: e, l: l };
  };

  Parser.prototype.si = function () {
    var l = this.come('clave', 'if').l;
    this.come('op', '(');
    var cond = this.expresion();
    this.come('op', ')');
    var ent = this.sentencia(), sino = null;
    if (this.es('clave', 'else')) { this.i++; sino = this.sentencia(); }
    return { tipo: 'Si', cond: cond, ent: ent, sino: sino, l: l };
  };
  Parser.prototype.para = function () {
    var l = this.come('clave', 'for').l;
    this.come('op', '(');
    var ini = null;
    if (!this.esOp(';')) {
      if (this.es('tipo')) {
        var tipos = [];
        while (this.es('tipo')) tipos.push(this.k[this.i++].v);
        var nom = this.come('id').v;
        ini = this.declVarResto(nom, tipos, false);
      } else { ini = { tipo: 'ExprStmt', expr: this.expresion(), l: l }; this.opcional('op', ';'); }
    } else this.i++;
    var cond = this.esOp(';') ? null : this.expresion();
    this.come('op', ';');
    var paso = this.esOp(')') ? null : this.expresion();
    this.come('op', ')');
    var cuerpo = this.sentencia();
    return { tipo: 'Para', ini: ini, cond: cond, paso: paso, cuerpo: cuerpo, l: l };
  };
  Parser.prototype.mientras = function () {
    var l = this.come('clave', 'while').l;
    this.come('op', '(');
    var cond = this.expresion();
    this.come('op', ')');
    return { tipo: 'Mientras', cond: cond, cuerpo: this.sentencia(), l: l };
  };
  Parser.prototype.hacer = function () {
    var l = this.come('clave', 'do').l;
    var cuerpo = this.sentencia();
    this.come('clave', 'while');
    this.come('op', '(');
    var cond = this.expresion();
    this.come('op', ')');
    this.opcional('op', ';');
    return { tipo: 'Hacer', cond: cond, cuerpo: cuerpo, l: l };
  };
  Parser.prototype.segun = function () {
    var l = this.come('clave', 'switch').l;
    this.come('op', '(');
    var disc = this.expresion();
    this.come('op', ')');
    this.come('op', '{');
    var casos = [];
    while (!this.esOp('}') && !this.es('eof')) {
      if (this.es('clave', 'case')) {
        this.i++;
        var val = this.expresion();
        this.come('op', ':');
        casos.push({ val: val, cuerpo: [] });
      } else if (this.es('clave', 'default')) {
        this.i++; this.come('op', ':');
        casos.push({ val: null, cuerpo: [] });
      } else {
        if (!casos.length) throw new ErrorCL('Instrucción fuera de un case dentro de switch', this.tok().l);
        casos[casos.length - 1].cuerpo.push(this.sentencia());
      }
    }
    this.come('op', '}');
    return { tipo: 'Segun', disc: disc, casos: casos, l: l };
  };

  /* ---- expresiones ---- */
  Parser.prototype.expresion = function () {
    var e = this.asignacion();
    while (this.esOp(',')) { this.i++; e = { tipo: 'Coma', a: e, b: this.asignacion(), l: e.l }; }
    return e;
  };
  Parser.prototype.asignacion = function () {
    var izq = this.ternario();
    var ops = ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='];
    if (this.es('op') && ops.indexOf(this.tok().v) >= 0) {
      var op = this.k[this.i++].v;
      var der = this.asignacion();
      return { tipo: 'Asig', op: op, obj: izq, valor: der, l: izq.l };
    }
    return izq;
  };
  Parser.prototype.ternario = function () {
    var c = this.binaria(0);
    if (this.esOp('?')) {
      this.i++;
      var a = this.asignacion();
      this.come('op', ':');
      var b = this.asignacion();
      return { tipo: 'Ternario', cond: c, a: a, b: b, l: c.l };
    }
    return c;
  };
  var PREC = {
    '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5,
    '==': 6, '!=': 6, '<': 7, '>': 7, '<=': 7, '>=': 7,
    '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10
  };
  Parser.prototype.binaria = function (min) {
    var izq = this.unaria();
    while (this.es('op') && PREC[this.tok().v] !== undefined && PREC[this.tok().v] >= min) {
      var op = this.k[this.i++].v;
      var der = this.binaria(PREC[op] + 1);
      izq = { tipo: 'Bin', op: op, a: izq, b: der, l: izq.l };
    }
    return izq;
  };
  Parser.prototype.unaria = function () {
    var t = this.tok();
    if (this.es('op') && ['!', '-', '+', '~', '++', '--'].indexOf(t.v) >= 0) {
      this.i++;
      var arg = this.unaria();
      if (t.v === '++' || t.v === '--') return { tipo: 'IncPre', op: t.v, obj: arg, l: t.l };
      return { tipo: 'Un', op: t.v, arg: arg, l: t.l };
    }
    if (this.es('op', '(') && this.tok(1).t === 'tipo' && this.tok(2).v === ')') {
      // conversión de tipo tipo (int)x
      this.i += 3;
      return { tipo: 'Cast', arg: this.unaria(), l: t.l };
    }
    return this.posfijo();
  };
  Parser.prototype.posfijo = function () {
    var e = this.primaria();
    while (true) {
      if (this.esOp('(')) {
        this.i++;
        var args = [];
        while (!this.esOp(')')) {
          args.push(this.asignacion());
          if (!this.opcional('op', ',')) break;
        }
        this.come('op', ')');
        e = { tipo: 'Llamada', callee: e, args: args, l: e.l };
      } else if (this.esOp('.') || this.esOp('->')) {
        this.i++;
        var prop = this.come('id').v;
        e = { tipo: 'Miembro', obj: e, prop: prop, l: e.l };
      } else if (this.esOp('[')) {
        this.i++;
        var idx = this.expresion();
        this.come('op', ']');
        e = { tipo: 'Indice', obj: e, idx: idx, l: e.l };
      } else if (this.esOp('++') || this.esOp('--')) {
        var op = this.k[this.i++].v;
        e = { tipo: 'IncPos', op: op, obj: e, l: e.l };
      } else break;
    }
    return e;
  };
  Parser.prototype.primaria = function () {
    var t = this.tok();
    if (t.t === 'num') { this.i++; return { tipo: 'Num', v: t.v, l: t.l }; }
    if (t.t === 'str') { this.i++; return { tipo: 'Txt', v: t.v, l: t.l }; }
    if (t.t === 'id') { this.i++; return { tipo: 'Id', nombre: t.v, l: t.l }; }
    if (t.t === 'tipo') { this.i++; return { tipo: 'Id', nombre: t.v, l: t.l }; }
    if (t.t === 'clave') {
      if (t.v === 'true') { this.i++; return { tipo: 'Num', v: 1, l: t.l }; }
      if (t.v === 'false') { this.i++; return { tipo: 'Num', v: 0, l: t.l }; }
      if (t.v === 'null') { this.i++; return { tipo: 'Num', v: 0, l: t.l }; }
      if (t.v === 'function') {           // función anónima (micro:bit)
        this.i++;
        var l = t.l;
        this.come('op', '(');
        var params = [];
        while (!this.esOp(')')) {
          if (this.es('id')) params.push(this.k[this.i++].v);
          if (!this.opcional('op', ',')) break;
        }
        this.come('op', ')');
        return { tipo: 'FnExpr', params: params, cuerpo: this.bloque(), l: l };
      }
    }
    if (this.esOp('(')) {
      this.i++;
      var e = this.expresion();
      this.come('op', ')');
      return e;
    }
    if (this.esOp('{')) return this.listaInicial();
    throw new ErrorCL('No se entiende "' + (t.v === null ? 'fin del programa' : t.v) + '" en este lugar', t.l);
  };

  /* ============================================================
     3. ENTORNOS Y VALORES
     ============================================================ */
  function Entorno(padre) { this.vars = {}; this.padre = padre; }
  Entorno.prototype.declarar = function (n, v, tipo) { this.vars[n] = { v: v, tipo: tipo }; };
  Entorno.prototype.buscar = function (n) {
    var e = this;
    while (e) { if (Object.prototype.hasOwnProperty.call(e.vars, n)) return e.vars[n]; e = e.padre; }
    return null;
  };

  var SENAL_BREAK = { s: 'break' }, SENAL_CONT = { s: 'continue' };
  function Retorno(v) { this.v = v; }

  /* ============================================================
     4. INTÉRPRETE (generadores)
     ============================================================ */
  function Interprete(ast, host) {
    this.ast = ast;
    this.host = host || {};
    this.global = new Entorno(null);
    this.funciones = {};
    this.pasos = 0;
    this.eventos = {};        // callbacks registrados (micro:bit)
  }

  Interprete.prototype.prepararGlobal = function* () {
    var self = this;
    // constantes del entorno
    var consts = this.host.constantes || {};
    for (var k in consts) this.global.declarar(k, consts[k], 'const');
    // funciones del programa
    for (var i = 0; i < this.ast.cuerpo.length; i++) {
      var n = this.ast.cuerpo[i];
      if (n.tipo === 'Funcion') {
        this.funciones[n.nombre] = n;
        this.global.declarar(n.nombre, { esFn: true, nodo: n }, 'fn');
      }
    }
    // variables globales y sentencias sueltas
    for (var j = 0; j < this.ast.cuerpo.length; j++) {
      var m = this.ast.cuerpo[j];
      if (m.tipo === 'DeclVar') yield* this.ejecutar(m, this.global);
      else if (m.tipo === 'ExprStmt') yield* this.ejecutar(m, this.global);
    }
  };

  Interprete.prototype.llamarFuncion = function* (nombre, args) {
    var f = this.funciones[nombre];
    if (!f) return undefined;
    var env = new Entorno(this.global);
    (f.params || []).forEach(function (p, i) { env.declarar(p, args && args[i], 'auto'); });
    try {
      yield* this.ejecutar(f.cuerpo, env);
    } catch (e) {
      if (e instanceof Retorno) return e.v;
      throw e;
    }
    return undefined;
  };
  Interprete.prototype.tieneFuncion = function (n) { return !!this.funciones[n]; };

  /* ---------- sentencias ---------- */
  Interprete.prototype.ejecutar = function* (n, env) {
    if (!n) return;
    this.pasos++;
    switch (n.tipo) {
      case 'Bloque': {
        var e2 = new Entorno(env);
        for (var i = 0; i < n.cuerpo.length; i++) {
          var r = yield* this.ejecutar(n.cuerpo[i], e2);
          if (r === SENAL_BREAK || r === SENAL_CONT) return r;
        }
        return;
      }
      case 'Vacia': return;
      case 'ExprStmt': yield* this.evaluar(n.expr, env); return;
      case 'DeclVar': {
        for (var d = 0; d < n.decls.length; d++) {
          var dec = n.decls[d];
          var val = 0;
          if (dec.init) val = yield* this.evaluar(dec.init, env);
          else if (dec.arr) {
            var t = dec.tam ? yield* this.evaluar(dec.tam, env) : 0;
            val = new Array(Math.max(0, t | 0)).fill(0);
          } else if (n.tipos.indexOf('Servo') >= 0) {
            val = this.host.crearServo ? this.host.crearServo() : {};
          } else if (n.tipos.indexOf('String') >= 0) val = '';
          val = ajustarTipo(val, n.tipos);
          env.declarar(dec.nombre, val, n.tipos.join(' '));
        }
        return;
      }
      case 'Si': {
        var c = yield* this.evaluar(n.cond, env);
        if (verdad(c)) return yield* this.ejecutar(n.ent, env);
        if (n.sino) return yield* this.ejecutar(n.sino, env);
        return;
      }
      case 'Para': {
        var e3 = new Entorno(env);
        if (n.ini) yield* this.ejecutar(n.ini, e3);
        var vueltas = 0;
        while (true) {
          if (n.cond) {
            var cc = yield* this.evaluar(n.cond, e3);
            if (!verdad(cc)) break;
          }
          var rr = yield* this.ejecutar(n.cuerpo, e3);
          if (rr === SENAL_BREAK) break;
          if (n.paso) yield* this.evaluar(n.paso, e3);
          yield { t: 'tick' };
          if (++vueltas > 2000000) throw new ErrorCL('El bucle "for" no termina nunca (más de 2 millones de vueltas)', n.l);
        }
        return;
      }
      case 'Mientras': {
        var v2 = 0;
        while (true) {
          var c2 = yield* this.evaluar(n.cond, env);
          if (!verdad(c2)) break;
          var r2 = yield* this.ejecutar(n.cuerpo, env);
          if (r2 === SENAL_BREAK) break;
          yield { t: 'tick' };
          if (++v2 > 2000000) throw new ErrorCL('El bucle "while" no termina nunca', n.l);
        }
        return;
      }
      case 'Hacer': {
        var v3 = 0;
        while (true) {
          var r3 = yield* this.ejecutar(n.cuerpo, env);
          if (r3 === SENAL_BREAK) break;
          var c3 = yield* this.evaluar(n.cond, env);
          yield { t: 'tick' };
          if (!verdad(c3)) break;
          if (++v3 > 2000000) throw new ErrorCL('El bucle "do…while" no termina nunca', n.l);
        }
        return;
      }
      case 'Segun': {
        var disc = yield* this.evaluar(n.disc, env);
        var e4 = new Entorno(env), activo = false;
        for (var ci = 0; ci < n.casos.length; ci++) {
          var caso = n.casos[ci];
          if (!activo) {
            if (caso.val === null) activo = true;
            else {
              var cv = yield* this.evaluar(caso.val, e4);
              if (cv == disc) activo = true;                     // comparación laxa a propósito
            }
          }
          if (activo) {
            for (var si = 0; si < caso.cuerpo.length; si++) {
              var rs = yield* this.ejecutar(caso.cuerpo[si], e4);
              if (rs === SENAL_BREAK) return;
              if (rs === SENAL_CONT) return rs;
            }
          }
        }
        return;
      }
      case 'Return': throw new Retorno(n.valor ? yield* this.evaluar(n.valor, env) : undefined);
      case 'Break': return SENAL_BREAK;
      case 'Continue': return SENAL_CONT;
      case 'Funcion':
        this.funciones[n.nombre] = n;
        env.declarar(n.nombre, { esFn: true, nodo: n }, 'fn');
        return;
      default:
        yield* this.evaluar(n, env);
    }
  };

  /* ---------- expresiones ---------- */
  Interprete.prototype.evaluar = function* (n, env) {
    if (!n) return 0;
    this.pasos++;
    switch (n.tipo) {
      case 'Num': return n.v;
      case 'Txt': return n.v;
      case 'Id': {
        var ref = env.buscar(n.nombre);
        if (ref) return ref.v;
        if (this.host.nativas && this.host.nativas[n.nombre]) return { esNativa: true, nombre: n.nombre };
        if (this.host.objetos && this.host.objetos[n.nombre]) return this.host.objetos[n.nombre];
        throw new ErrorCL('La variable "' + n.nombre + '" no existe. ¿La declaraste antes de usarla?', n.l);
      }
      case 'Arreglo': {
        var arr = [];
        for (var i = 0; i < n.elementos.length; i++) arr.push(yield* this.evaluar(n.elementos[i], env));
        return arr;
      }
      case 'FnExpr': return { esFn: true, nodo: { params: n.params, cuerpo: n.cuerpo }, cerradura: env };
      case 'Cast': return yield* this.evaluar(n.arg, env);
      case 'Coma': yield* this.evaluar(n.a, env); return yield* this.evaluar(n.b, env);
      case 'Un': {
        var v = yield* this.evaluar(n.arg, env);
        if (n.op === '!') return verdad(v) ? 0 : 1;
        if (n.op === '-') return -num(v);
        if (n.op === '+') return num(v);
        if (n.op === '~') return ~num(v);
        return v;
      }
      case 'Bin': {
        var a = yield* this.evaluar(n.a, env);
        if (n.op === '&&') return verdad(a) ? (verdad(yield* this.evaluar(n.b, env)) ? 1 : 0) : 0;
        if (n.op === '||') return verdad(a) ? 1 : (verdad(yield* this.evaluar(n.b, env)) ? 1 : 0);
        var b = yield* this.evaluar(n.b, env);
        return binario(n.op, a, b, n.l);
      }
      case 'Ternario': {
        var c = yield* this.evaluar(n.cond, env);
        return verdad(c) ? yield* this.evaluar(n.a, env) : yield* this.evaluar(n.b, env);
      }
      case 'Asig': {
        var val = yield* this.evaluar(n.valor, env);
        if (n.op !== '=') {
          var actual = yield* this.evaluar(n.obj, env);
          val = binario(n.op.slice(0, -1), actual, val, n.l);
        }
        yield* this.asignar(n.obj, val, env);
        return val;
      }
      case 'IncPre': case 'IncPos': {
        var vieja = num(yield* this.evaluar(n.obj, env));
        var nueva = n.op === '++' ? vieja + 1 : vieja - 1;
        yield* this.asignar(n.obj, nueva, env);
        return n.tipo === 'IncPre' ? nueva : vieja;
      }
      case 'Indice': {
        var o = yield* this.evaluar(n.obj, env);
        var idx = num(yield* this.evaluar(n.idx, env));
        if (typeof o === 'string') return o.charCodeAt(idx) || 0;
        if (!o || typeof o !== 'object') return 0;
        return o[idx] === undefined ? 0 : o[idx];
      }
      case 'Miembro': {
        var ob = yield* this.evaluar(n.obj, env);
        if (ob && ob.esNativa) return { esNativa: true, nombre: ob.nombre + '.' + n.prop };
        if (ob === undefined || ob === null) throw new ErrorCL('No se puede acceder a "' + n.prop + '" porque el objeto no existe', n.l);
        if (typeof ob === 'object' && ob._ns) return { esNativa: true, nombre: ob._ns + '.' + n.prop, obj: ob };
        if (typeof ob === 'object' && typeof ob[n.prop] === 'function') return { esMetodo: true, obj: ob, nombre: n.prop };
        if (typeof ob === 'object') return ob[n.prop];
        if (typeof ob === 'string' && n.prop === 'length') return ob.length;
        return 0;
      }
      case 'Llamada': {
        var callee = n.callee, args = [];
        for (var ai = 0; ai < n.args.length; ai++) args.push(yield* this.evaluar(n.args[ai], env));
        // llamada a función del usuario
        if (callee.tipo === 'Id') {
          var ref2 = env.buscar(callee.nombre);
          if (ref2 && ref2.v && ref2.v.esFn) return yield* this.invocarFn(ref2.v, args);
          if (this.funciones[callee.nombre]) return yield* this.llamarFuncion(callee.nombre, args);
          return yield* this.nativa(callee.nombre, args, n, null);
        }
        var f = yield* this.evaluar(callee, env);
        if (f && f.esFn) return yield* this.invocarFn(f, args);
        if (f && f.esNativa) return yield* this.nativa(f.nombre, args, n, f.obj);
        if (f && f.esMetodo) {
          var salida = f.obj[f.nombre].apply(f.obj, args);
          if (salida && salida.espera) { yield { t: 'delay', ms: salida.espera }; return salida.valor; }
          return salida;
        }
        throw new ErrorCL('No se puede llamar a esto como si fuera una función', n.l);
      }
      default: return 0;
    }
  };

  Interprete.prototype.invocarFn = function* (fn, args) {
    var env = new Entorno(fn.cerradura || this.global);
    (fn.nodo.params || []).forEach(function (p, i) { env.declarar(p, args[i], 'auto'); });
    try {
      yield* this.ejecutar(fn.nodo.cuerpo, env);
    } catch (e) {
      if (e instanceof Retorno) return e.v;
      throw e;
    }
    return undefined;
  };

  Interprete.prototype.nativa = function* (nombre, args, n, obj) {
    var nat = this.host.nativas && this.host.nativas[nombre];
    if (!nat) throw new ErrorCL('La instrucción "' + nombre + '" no existe o todavía no está disponible en este simulador', n.l);
    var r = nat.apply(this.host, args);
    if (r && r.espera !== undefined) {                       // instrucción que consume tiempo
      yield { t: 'delay', ms: r.espera };
      return r.valor;
    }
    if (r && r.registrar) {                                  // registro de eventos (micro:bit)
      this.eventos[r.registrar] = r.fn;
      return undefined;
    }
    return r;
  };

  Interprete.prototype.asignar = function* (destino, valor, env) {
    if (destino.tipo === 'Id') {
      var ref = env.buscar(destino.nombre);
      if (!ref) { env.declarar(destino.nombre, valor, 'auto'); return; }
      ref.v = ajustarTipo(valor, [ref.tipo || '']);
      return;
    }
    if (destino.tipo === 'Indice') {
      var o = yield* this.evaluar(destino.obj, env);
      var i = num(yield* this.evaluar(destino.idx, env));
      if (o && typeof o === 'object') o[i] = valor;
      return;
    }
    if (destino.tipo === 'Miembro') {
      var ob = yield* this.evaluar(destino.obj, env);
      if (ob && typeof ob === 'object') ob[destino.prop] = valor;
      return;
    }
    throw new ErrorCL('No se puede asignar un valor a esta expresión', destino.l);
  };

  /* ---------- ayudas ---------- */
  function num(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string') { var f = parseFloat(v); return isNaN(f) ? 0 : f; }
    if (v === null || v === undefined) return 0;
    return 0;
  }
  function verdad(v) {
    if (typeof v === 'string') return v.length > 0;
    return num(v) !== 0;
  }
  function esTexto(v) { return typeof v === 'string'; }
  function binario(op, a, b, l) {
    switch (op) {
      case '+': return (esTexto(a) || esTexto(b)) ? String(fmt(a)) + String(fmt(b)) : num(a) + num(b);
      case '-': return num(a) - num(b);
      case '*': return num(a) * num(b);
      case '/':
        if (num(b) === 0) throw new ErrorCL('División entre cero', l);
        return num(a) / num(b);
      case '%':
        if (num(b) === 0) throw new ErrorCL('Resto con divisor cero', l);
        return num(a) % num(b);
      case '==': return (esTexto(a) || esTexto(b)) ? (String(a) === String(b) ? 1 : 0) : (num(a) === num(b) ? 1 : 0);
      case '!=': return (esTexto(a) || esTexto(b)) ? (String(a) !== String(b) ? 1 : 0) : (num(a) !== num(b) ? 1 : 0);
      case '<': return num(a) < num(b) ? 1 : 0;
      case '>': return num(a) > num(b) ? 1 : 0;
      case '<=': return num(a) <= num(b) ? 1 : 0;
      case '>=': return num(a) >= num(b) ? 1 : 0;
      case '&': return num(a) & num(b);
      case '|': return num(a) | num(b);
      case '^': return num(a) ^ num(b);
      case '<<': return num(a) << num(b);
      case '>>': return num(a) >> num(b);
      default: return 0;
    }
  }
  function fmt(v) {
    if (typeof v === 'number') return Number.isInteger(v) ? v : Math.round(v * 100) / 100;
    return v;
  }
  var ENTEROS = ['int', 'long', 'byte', 'word', 'uint8_t', 'int8_t', 'uint16_t', 'int16_t', 'uint32_t', 'size_t', 'bool', 'boolean', 'char'];
  function ajustarTipo(v, tipos) {
    if (typeof v !== 'number') return v;
    for (var i = 0; i < tipos.length; i++) {
      var t = String(tipos[i]);
      if (ENTEROS.some(function (e) { return t.indexOf(e) >= 0; })) return Math.trunc(v);
    }
    return v;
  }

  /* ============================================================
     5. API pública
     ============================================================ */
  CL.Interprete = {
    compilar: function (codigo, host) {
      try {
        var toks = lexer(codigo || '');
        var ast = new Parser(toks).programa();
        return { ok: true, interprete: new Interprete(ast, host), ast: ast };
      } catch (e) {
        if (e && e.esErrorCL) return { ok: false, error: e.mensaje, linea: e.linea };
        return { ok: false, error: e.message || String(e), linea: 0 };
      }
    },
    ErrorCL: ErrorCL,
    num: num, verdad: verdad
  };

}(window.CL));
