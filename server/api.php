<?php
/* ══════════════════════════════════════════════════════════════
   CircuitLab — API de cuentas y trabajos de clase
   ──────────────────────────────────────────────────────────────
   La app sigue siendo offline: esto es una capa OPCIONAL. Si el
   servidor no responde (USB, file://, Apache apagado) CircuitLab
   funciona exactamente igual guardando en el propio computador.

   Identidad: el usuario es el DOCUMENTO del estudiante y se valida
   contra la tabla `estudiantes` de la intranet. La contraseña se
   crea la primera vez que entra y se guarda con password_hash()
   en una tabla propia — nunca se toca `estudiantes.Contrasena`,
   que es un campo en claro que administra el docente.
   ══════════════════════════════════════════════════════════════ */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

/* conexionbd.php imprime HTML si la conexión falla y además resuelve
   la identidad del PC con arp; nada de eso debe ensuciar el JSON. */
ob_start();
require_once __DIR__ . '/../../../../../estructura_web/conexionbd.php';
ob_end_clean();

/* ------------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------------ */
function salir($datos, $codigo = 200) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}
function error_api($mensaje, $codigo = 400, $extra = array()) {
    salir(array_merge(array('ok' => false, 'error' => $mensaje), $extra), $codigo);
}
function entrada() {
    static $in = null;
    if ($in === null) {
        $crudo = file_get_contents('php://input');
        $in = json_decode($crudo, true);
        if (!is_array($in)) $in = $_POST;
    }
    return $in;
}
function campo($nombre, $porDefecto = '') {
    $in = entrada();
    return isset($in[$nombre]) ? $in[$nombre] : $porDefecto;
}
/** El campo decodificado como OBJETO. Con arrays asociativos un `{}` vacío
    (p. ej. `props: {}`) vuelve como `[]` al re-codificarlo, y en JavaScript
    las propiedades que luego se le pongan a ese array se pierden al guardar. */
function campo_json($nombre) {
    static $obj = null;
    if ($obj === null) {
        $obj = json_decode(file_get_contents('php://input'));
        if (!is_object($obj)) $obj = new stdClass();
    }
    return isset($obj->$nombre) ? $obj->$nombre : null;
}

/** El docente es el PC-A. Se mide con $Pc_real y no con $Pc_nombre para
    que el "Modo estudiante" (cookie pc_override) no dé permisos de más
    ni de menos: aquí se CONCEDEN privilegios, así que ante la duda se
    niega, al revés que en los guards que cortan el acceso a páginas. */
function es_docente() {
    global $Pc_real;
    return isset($Pc_real) && $Pc_real === 'PC-A';
}

$cn = $obj_conexion;
if (!$cn || $cn->connect_errno) error_api('Sin conexión con la base de datos', 503);

/* ------------------------------------------------------------------
   Esquema (se crea solo la primera vez)
   ------------------------------------------------------------------ */
function migrar($cn) {
    $cn->query(
        "CREATE TABLE IF NOT EXISTS `circuitlab_usuarios` (
          `id` INT AUTO_INCREMENT PRIMARY KEY,
          `id_estudiante` VARCHAR(30) NOT NULL,
          `nombre` VARCHAR(80) NOT NULL,
          `grado` VARCHAR(10) DEFAULT NULL,
          `clave` VARCHAR(255) DEFAULT NULL,
          `creado` DATETIME NOT NULL,
          `ultimo_acceso` DATETIME DEFAULT NULL,
          `accesos` INT NOT NULL DEFAULT 0,
          `fallos` INT NOT NULL DEFAULT 0,
          `ultimo_fallo` DATETIME DEFAULT NULL,
          UNIQUE KEY `uq_est` (`id_estudiante`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $cn->query(
        "CREATE TABLE IF NOT EXISTS `circuitlab_trabajos` (
          `id` INT AUTO_INCREMENT PRIMARY KEY,
          `usuario_id` INT NOT NULL,
          `proyecto_id` VARCHAR(40) NOT NULL,
          `nombre` VARCHAR(120) NOT NULL,
          `actividad` VARCHAR(60) DEFAULT NULL,
          `datos` LONGTEXT NOT NULL,
          `n_componentes` INT NOT NULL DEFAULT 0,
          `tiene_codigo` TINYINT(1) NOT NULL DEFAULT 0,
          `entregado` TINYINT(1) NOT NULL DEFAULT 0,
          `fecha_entrega` DATETIME DEFAULT NULL,
          `nota` DECIMAL(4,1) DEFAULT NULL,
          `comentario` VARCHAR(500) DEFAULT NULL,
          `creado` DATETIME NOT NULL,
          `modificado` DATETIME NOT NULL,
          UNIQUE KEY `uq_proy` (`usuario_id`, `proyecto_id`),
          KEY `k_user` (`usuario_id`),
          KEY `k_act` (`actividad`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $cn->query(
        "CREATE TABLE IF NOT EXISTS `circuitlab_sesiones` (
          `token` CHAR(64) PRIMARY KEY,
          `usuario_id` INT NOT NULL,
          `creado` DATETIME NOT NULL,
          `visto` DATETIME NOT NULL,
          KEY `k_user` (`usuario_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}
migrar($cn);

/* ------------------------------------------------------------------
   Sesión por token (no se usa la sesión de PHP: la app puede estar
   abierta en varias pestañas y el service worker complica las cookies)
   ------------------------------------------------------------------ */
define('VIDA_SESION', 60 * 60 * 12);   // 12 h sin usarse y caduca

function usuario_de_token($cn, $token) {
    if (!preg_match('/^[a-f0-9]{64}$/', (string)$token)) return null;
    $st = $cn->prepare(
        "SELECT u.id, u.id_estudiante, u.nombre, u.grado, s.visto
           FROM circuitlab_sesiones s
           JOIN circuitlab_usuarios u ON u.id = s.usuario_id
          WHERE s.token = ? LIMIT 1");
    $st->bind_param('s', $token);
    $st->execute();
    $r = $st->get_result()->fetch_assoc();
    $st->close();
    if (!$r) return null;
    if (time() - strtotime($r['visto']) > VIDA_SESION) {
        $d = $cn->prepare("DELETE FROM circuitlab_sesiones WHERE token = ?");
        $d->bind_param('s', $token); $d->execute(); $d->close();
        return null;
    }
    $t = $cn->prepare("UPDATE circuitlab_sesiones SET visto = NOW() WHERE token = ?");
    $t->bind_param('s', $token); $t->execute(); $t->close();
    return $r;
}

function exigir_sesion($cn) {
    $u = usuario_de_token($cn, campo('token'));
    if (!$u) error_api('Tu sesión se cerró. Vuelve a entrar.', 401, array('sesion' => false));
    return $u;
}

function exigir_docente() {
    if (!es_docente()) error_api('Solo el computador del docente puede hacer esto.', 403);
}

/* Estudiante de la intranet por documento (los retirados no entran). */
function estudiante_por_documento($cn, $doc) {
    $st = $cn->prepare(
        "SELECT `id_estudiante`, `Nombre`, `Grado`, `Retirado`
           FROM `estudiantes` WHERE `id_estudiante` = ? LIMIT 1");
    $st->bind_param('s', $doc);
    $st->execute();
    $r = $st->get_result()->fetch_assoc();
    $st->close();
    return $r;
}

function limpiar_documento($d) {
    return preg_replace('/[^0-9A-Za-z]/', '', (string)$d);
}

/* ------------------------------------------------------------------
   Acciones
   ------------------------------------------------------------------ */
$accion = campo('accion', isset($_GET['accion']) ? $_GET['accion'] : '');

switch ($accion) {

/* ---------- ¿hay servidor? ---------- */
case 'estado':
    $u = usuario_de_token($cn, campo('token'));
    salir(array(
        'ok'      => true,
        'servidor'=> true,
        'docente' => es_docente(),
        'lan'     => ip_lan(),
        'usuario' => $u ? array('id' => (int)$u['id'], 'nombre' => $u['nombre'],
                                'documento' => $u['id_estudiante'], 'grado' => $u['grado']) : null
    ));

/* ---------- comprobar el documento antes de pedir la clave ---------- */
case 'buscar':
    $doc = limpiar_documento(campo('documento'));
    if (strlen($doc) < 4) error_api('Escribe tu número de documento.');
    $est = estudiante_por_documento($cn, $doc);
    if (!$est) error_api('Ese documento no aparece en la lista de estudiantes. Avísale al profesor.', 404);
    if ((int)$est['Retirado'] === 1) error_api('Esa matrícula figura como retirada.', 403);

    $st = $cn->prepare("SELECT id, clave FROM circuitlab_usuarios WHERE id_estudiante = ? LIMIT 1");
    $st->bind_param('s', $doc); $st->execute();
    $cuenta = $st->get_result()->fetch_assoc(); $st->close();

    salir(array(
        'ok'          => true,
        'nombre'      => $est['Nombre'],
        'grado'       => $est['Grado'],
        'primera_vez' => (!$cuenta || $cuenta['clave'] === null || $cuenta['clave'] === '')
    ));

/* ---------- crear la contraseña la primera vez ---------- */
case 'registrar':
    $doc    = limpiar_documento(campo('documento'));
    $clave  = (string)campo('clave');
    $clave2 = (string)campo('clave2');
    if (strlen($clave) < 4)      error_api('La contraseña debe tener al menos 4 caracteres.');
    if (strlen($clave) > 72)     error_api('La contraseña es demasiado larga.');
    if ($clave !== $clave2)      error_api('Las dos contraseñas no son iguales.');

    $est = estudiante_por_documento($cn, $doc);
    if (!$est) error_api('Ese documento no aparece en la lista de estudiantes.', 404);
    if ((int)$est['Retirado'] === 1) error_api('Esa matrícula figura como retirada.', 403);

    $st = $cn->prepare("SELECT id, clave FROM circuitlab_usuarios WHERE id_estudiante = ? LIMIT 1");
    $st->bind_param('s', $doc); $st->execute();
    $cuenta = $st->get_result()->fetch_assoc(); $st->close();
    if ($cuenta && $cuenta['clave'] !== null && $cuenta['clave'] !== '')
        error_api('Esa cuenta ya tiene contraseña. Si la olvidaste, pídele al profesor que la restablezca.', 409);

    $hash = password_hash($clave, PASSWORD_DEFAULT);
    if ($cuenta) {
        $st = $cn->prepare("UPDATE circuitlab_usuarios
                               SET clave = ?, nombre = ?, grado = ?, fallos = 0 WHERE id = ?");
        $st->bind_param('sssi', $hash, $est['Nombre'], $est['Grado'], $cuenta['id']);
        $st->execute(); $st->close();
        $uid = (int)$cuenta['id'];
    } else {
        $st = $cn->prepare("INSERT INTO circuitlab_usuarios
                              (id_estudiante, nombre, grado, clave, creado) VALUES (?,?,?,?,NOW())");
        $st->bind_param('ssss', $doc, $est['Nombre'], $est['Grado'], $hash);
        $st->execute(); $st->close();
        $uid = (int)$cn->insert_id;
    }
    salir(abrir_sesion($cn, $uid, $doc, $est['Nombre'], $est['Grado']));

/* ---------- entrar ---------- */
case 'entrar':
    $doc   = limpiar_documento(campo('documento'));
    $clave = (string)campo('clave');
    $est   = estudiante_por_documento($cn, $doc);
    if (!$est) error_api('Ese documento no aparece en la lista de estudiantes.', 404);
    if ((int)$est['Retirado'] === 1) error_api('Esa matrícula figura como retirada.', 403);

    $st = $cn->prepare("SELECT id, clave, fallos, ultimo_fallo
                          FROM circuitlab_usuarios WHERE id_estudiante = ? LIMIT 1");
    $st->bind_param('s', $doc); $st->execute();
    $cuenta = $st->get_result()->fetch_assoc(); $st->close();

    if (!$cuenta || $cuenta['clave'] === null || $cuenta['clave'] === '')
        error_api('Todavía no tienes contraseña: créala ahora.', 409, array('primera_vez' => true,
                  'nombre' => $est['Nombre']));

    /* Freno sencillo: 8 fallos seguidos obligan a esperar 5 minutos. */
    if ((int)$cuenta['fallos'] >= 8 && $cuenta['ultimo_fallo'] &&
        time() - strtotime($cuenta['ultimo_fallo']) < 300) {
        error_api('Demasiados intentos. Espera unos minutos o pídele ayuda al profesor.', 429);
    }

    if (!password_verify($clave, $cuenta['clave'])) {
        $st = $cn->prepare("UPDATE circuitlab_usuarios
                               SET fallos = fallos + 1, ultimo_fallo = NOW() WHERE id = ?");
        $st->bind_param('i', $cuenta['id']); $st->execute(); $st->close();
        error_api('Contraseña incorrecta.', 401);
    }

    $st = $cn->prepare("UPDATE circuitlab_usuarios
                           SET fallos = 0, nombre = ?, grado = ? WHERE id = ?");
    $st->bind_param('ssi', $est['Nombre'], $est['Grado'], $cuenta['id']);
    $st->execute(); $st->close();

    salir(abrir_sesion($cn, (int)$cuenta['id'], $doc, $est['Nombre'], $est['Grado']));

/* ---------- salir ---------- */
case 'salir':
    $token = campo('token');
    if (preg_match('/^[a-f0-9]{64}$/', (string)$token)) {
        $st = $cn->prepare("DELETE FROM circuitlab_sesiones WHERE token = ?");
        $st->bind_param('s', $token); $st->execute(); $st->close();
    }
    salir(array('ok' => true));

/* ---------- cambiar la contraseña ---------- */
case 'cambiar_clave':
    $u      = exigir_sesion($cn);
    $actual = (string)campo('actual');
    $nueva  = (string)campo('nueva');
    if (strlen($nueva) < 4)  error_api('La contraseña nueva debe tener al menos 4 caracteres.');
    if (strlen($nueva) > 72) error_api('La contraseña es demasiado larga.');

    $st = $cn->prepare("SELECT clave FROM circuitlab_usuarios WHERE id = ? LIMIT 1");
    $st->bind_param('i', $u['id']); $st->execute();
    $c = $st->get_result()->fetch_assoc(); $st->close();
    if (!password_verify($actual, $c['clave'])) error_api('La contraseña actual no es correcta.', 401);

    $hash = password_hash($nueva, PASSWORD_DEFAULT);
    $st = $cn->prepare("UPDATE circuitlab_usuarios SET clave = ? WHERE id = ?");
    $st->bind_param('si', $hash, $u['id']); $st->execute(); $st->close();
    salir(array('ok' => true));

/* ---------- listar mis trabajos ---------- */
case 'listar':
    $u = exigir_sesion($cn);
    $st = $cn->prepare(
        "SELECT id, proyecto_id, nombre, actividad, n_componentes, tiene_codigo,
                entregado, fecha_entrega, nota, comentario, creado, modificado
           FROM circuitlab_trabajos WHERE usuario_id = ?
          ORDER BY modificado DESC LIMIT 200");
    $st->bind_param('i', $u['id']); $st->execute();
    $res = $st->get_result();
    $lista = array();
    while ($f = $res->fetch_assoc()) {
        $f['id'] = (int)$f['id'];
        $f['n_componentes'] = (int)$f['n_componentes'];
        $f['tiene_codigo'] = (int)$f['tiene_codigo'];
        $f['entregado'] = (int)$f['entregado'];
        $lista[] = $f;
    }
    $st->close();
    salir(array('ok' => true, 'trabajos' => $lista));

/* ---------- guardar / actualizar un trabajo ---------- */
case 'guardar':
    $u     = exigir_sesion($cn);
    $proy  = campo('proyecto');
    if (!is_array($proy) || !isset($proy['id'])) error_api('Proyecto no válido.');

    $datos = json_encode(campo_json('proyecto'), JSON_UNESCAPED_UNICODE);
    if ($datos === false)          error_api('No se pudo preparar el proyecto.');
    if (strlen($datos) > 4194304)  error_api('El proyecto es demasiado grande para guardarlo en el servidor.', 413);

    $pid    = substr((string)$proy['id'], 0, 40);
    $nombre = trim((string)(isset($proy['name']) ? $proy['name'] : 'Proyecto'));
    if ($nombre === '') $nombre = 'Proyecto sin título';
    $nombre = mb_substr($nombre, 0, 120);
    $ncomp  = isset($proy['components']) && is_array($proy['components']) ? count($proy['components']) : 0;
    $ccode  = (isset($proy['code']) && trim((string)$proy['code']) !== '') ? 1 : 0;
    $act    = campo('actividad', null);
    if ($act !== null) $act = mb_substr((string)$act, 0, 60);

    $st = $cn->prepare(
        "INSERT INTO circuitlab_trabajos
           (usuario_id, proyecto_id, nombre, actividad, datos, n_componentes, tiene_codigo, creado, modificado)
         VALUES (?,?,?,?,?,?,?,NOW(),NOW())
         ON DUPLICATE KEY UPDATE
           nombre = VALUES(nombre),
           actividad = COALESCE(VALUES(actividad), actividad),
           datos = VALUES(datos),
           n_componentes = VALUES(n_componentes),
           tiene_codigo = VALUES(tiene_codigo),
           modificado = NOW()");
    $st->bind_param('issssii', $u['id'], $pid, $nombre, $act, $datos, $ncomp, $ccode);
    if (!$st->execute()) { $st->close(); error_api('No se pudo guardar en el servidor.', 500); }
    $st->close();
    salir(array('ok' => true, 'guardado' => date('c')));

/* ---------- abrir un trabajo mío ---------- */
case 'abrir':
    $u   = exigir_sesion($cn);
    $pid = substr((string)campo('proyecto_id'), 0, 40);
    $st  = $cn->prepare("SELECT datos FROM circuitlab_trabajos
                          WHERE usuario_id = ? AND proyecto_id = ? LIMIT 1");
    $st->bind_param('is', $u['id'], $pid); $st->execute();
    $r = $st->get_result()->fetch_assoc(); $st->close();
    if (!$r) error_api('Ese trabajo ya no está.', 404);
    salir(array('ok' => true, 'proyecto' => json_decode($r['datos'])));

/* ---------- borrar un trabajo mío ---------- */
case 'borrar':
    $u   = exigir_sesion($cn);
    $pid = substr((string)campo('proyecto_id'), 0, 40);
    $st  = $cn->prepare("DELETE FROM circuitlab_trabajos WHERE usuario_id = ? AND proyecto_id = ?");
    $st->bind_param('is', $u['id'], $pid); $st->execute(); $st->close();
    salir(array('ok' => true));

/* ---------- entregar (marcar como terminado para el profesor) ---------- */
case 'entregar':
    $u   = exigir_sesion($cn);
    $pid = substr((string)campo('proyecto_id'), 0, 40);
    $st  = $cn->prepare("UPDATE circuitlab_trabajos
                            SET entregado = 1, fecha_entrega = NOW()
                          WHERE usuario_id = ? AND proyecto_id = ?");
    $st->bind_param('is', $u['id'], $pid); $st->execute();
    $tocadas = $st->affected_rows; $st->close();
    if ($tocadas < 0) error_api('No se pudo entregar.', 500);
    salir(array('ok' => true));

/* ============================================================
   Panel del docente (solo PC-A)
   ============================================================ */
case 'docente_usuarios':
    exigir_docente();
    $res = $cn->query(
        "SELECT u.id, u.id_estudiante, u.nombre, u.grado, u.creado, u.ultimo_acceso, u.accesos,
                (u.clave IS NULL OR u.clave = '') AS sin_clave,
                COUNT(t.id) AS trabajos,
                SUM(t.entregado) AS entregas
           FROM circuitlab_usuarios u
           LEFT JOIN circuitlab_trabajos t ON t.usuario_id = u.id
          GROUP BY u.id
          ORDER BY u.grado, u.nombre");
    $lista = array();
    while ($f = $res->fetch_assoc()) {
        $f['id'] = (int)$f['id'];
        $f['trabajos'] = (int)$f['trabajos'];
        $f['entregas'] = (int)$f['entregas'];
        $f['sin_clave'] = (int)$f['sin_clave'];
        $lista[] = $f;
    }
    salir(array('ok' => true, 'usuarios' => $lista));

case 'docente_trabajos':
    exigir_docente();
    $uid  = (int)campo('usuario_id', 0);
    $solo = (int)campo('solo_entregados', 0);
    $sql  = "SELECT t.id, t.usuario_id, t.proyecto_id, t.nombre, t.actividad, t.n_componentes,
                    t.tiene_codigo, t.entregado, t.fecha_entrega, t.nota, t.comentario,
                    t.creado, t.modificado, u.nombre AS alumno, u.grado, u.id_estudiante
               FROM circuitlab_trabajos t
               JOIN circuitlab_usuarios u ON u.id = t.usuario_id";
    $cond = array();
    if ($uid > 0) $cond[] = 't.usuario_id = ' . $uid;
    if ($solo)    $cond[] = 't.entregado = 1';
    if ($cond)    $sql .= ' WHERE ' . implode(' AND ', $cond);
    $sql .= ' ORDER BY t.modificado DESC LIMIT 400';

    $res = $cn->query($sql);
    $lista = array();
    while ($f = $res->fetch_assoc()) {
        $f['id'] = (int)$f['id'];
        $f['usuario_id'] = (int)$f['usuario_id'];
        $f['n_componentes'] = (int)$f['n_componentes'];
        $f['tiene_codigo'] = (int)$f['tiene_codigo'];
        $f['entregado'] = (int)$f['entregado'];
        $lista[] = $f;
    }
    salir(array('ok' => true, 'trabajos' => $lista));

case 'docente_abrir':
    exigir_docente();
    $id = (int)campo('trabajo_id', 0);
    $st = $cn->prepare("SELECT datos FROM circuitlab_trabajos WHERE id = ? LIMIT 1");
    $st->bind_param('i', $id); $st->execute();
    $r = $st->get_result()->fetch_assoc(); $st->close();
    if (!$r) error_api('Ese trabajo ya no está.', 404);
    salir(array('ok' => true, 'proyecto' => json_decode($r['datos'])));

case 'docente_calificar':
    exigir_docente();
    $id   = (int)campo('trabajo_id', 0);
    $nota = campo('nota', null);
    $com  = mb_substr((string)campo('comentario', ''), 0, 500);
    if ($nota === '' || $nota === null) {
        $st = $cn->prepare("UPDATE circuitlab_trabajos SET nota = NULL, comentario = ? WHERE id = ?");
        $st->bind_param('si', $com, $id);
    } else {
        $n = (float)$nota;
        if ($n < 0 || $n > 5) error_api('La nota va de 0.0 a 5.0.');
        $st = $cn->prepare("UPDATE circuitlab_trabajos SET nota = ?, comentario = ? WHERE id = ?");
        $st->bind_param('dsi', $n, $com, $id);
    }
    $st->execute(); $st->close();
    salir(array('ok' => true));

case 'docente_reset':
    exigir_docente();
    $uid = (int)campo('usuario_id', 0);
    $st = $cn->prepare("UPDATE circuitlab_usuarios SET clave = NULL, fallos = 0 WHERE id = ?");
    $st->bind_param('i', $uid); $st->execute(); $st->close();
    $st = $cn->prepare("DELETE FROM circuitlab_sesiones WHERE usuario_id = ?");
    $st->bind_param('i', $uid); $st->execute(); $st->close();
    salir(array('ok' => true));

case 'docente_borrar_trabajo':
    exigir_docente();
    $id = (int)campo('trabajo_id', 0);
    $st = $cn->prepare("DELETE FROM circuitlab_trabajos WHERE id = ?");
    $st->bind_param('i', $id); $st->execute(); $st->close();
    salir(array('ok' => true));

/* ============================================================
   Carpeta de CircuitLab en el servidor (server/datos/)
   ────────────────────────────────────────────────────────────
   Lo que guarda el docente (proyectos y actividades del modo
   profesor) vive en ARCHIVOS del servidor, no en el navegador:
   así no se pierde al borrar el historial. Cada elemento lleva
   `visible`: los estudiantes solo ven lo que el docente muestra.
   Por defecto todo nace OCULTO.
   ============================================================ */
case 'carpeta_listar':
    $idx = leer_indice();
    $doc = es_docente();
    $lista = array();
    foreach ($idx['proyectos'] as $f) {
        if (!$doc && empty($f['visible'])) continue;
        $lista[] = $f;
    }
    usort($lista, function ($a, $b) { return (int)$b['modified'] - (int)$a['modified']; });
    salir(array('ok' => true, 'docente' => $doc, 'proyectos' => $lista));

case 'carpeta_abrir':
    $id  = id_seguro(campo('id'));
    $idx = leer_indice();
    if (!$id || !isset($idx['proyectos'][$id])) error_api('Esa actividad ya no está en el repositorio.', 404);
    if (!es_docente() && empty($idx['proyectos'][$id]['visible'])) error_api('El docente no ha publicado esta actividad (está oculta).', 403);
    $p = json_decode((string)@file_get_contents(dir_datos() . '/proyectos/' . $id . '.json'));
    if (!is_object($p)) error_api('No se pudo leer el archivo del proyecto.', 500);
    salir(array('ok' => true, 'proyecto' => $p));

case 'carpeta_guardar':
    exigir_docente();
    $proy = campo('proyecto');
    if (!is_array($proy) || !isset($proy['id'])) error_api('Proyecto no válido.');
    $id = id_seguro($proy['id']);
    if (!$id) error_api('Identificador de proyecto no válido.');
    $json = json_encode(campo_json('proyecto'), JSON_UNESCAPED_UNICODE);
    if ($json === false || strlen($json) > 8388608) error_api('El proyecto es demasiado grande.', 413);
    if (!escribir_archivo(dir_datos() . '/proyectos/' . $id . '.json', $json)) error_api('No se pudo escribir en la carpeta del servidor.', 500);
    $nombre = trim((string)(isset($proy['name']) ? $proy['name'] : ''));
    $ficha = array(
        'id'       => $id,
        'name'     => mb_substr($nombre !== '' ? $nombre : 'Proyecto sin título', 0, 120),
        'n'        => isset($proy['components']) && is_array($proy['components']) ? count($proy['components']) : 0,
        'codigo'   => (isset($proy['code']) && trim((string)$proy['code']) !== '') ? 1 : 0,
        'modified' => round(microtime(true) * 1000)
    );
    $r = con_indice(function (&$idx) use ($id, $ficha) {
        $prev = isset($idx['proyectos'][$id]) ? $idx['proyectos'][$id] : null;
        $ficha['visible'] = $prev ? !empty($prev['visible']) : false;
        $ficha['created'] = $prev && isset($prev['created']) ? $prev['created'] : $ficha['modified'];
        $idx['proyectos'][$id] = $ficha;
        return $ficha;
    });
    salir(array('ok' => true, 'ficha' => $r));

case 'carpeta_visible':
    exigir_docente();
    $id = id_seguro(campo('id'));
    $v  = !empty(campo('visible'));
    $r = con_indice(function (&$idx) use ($id, $v) {
        if (!$id || !isset($idx['proyectos'][$id])) return null;
        $idx['proyectos'][$id]['visible'] = $v;
        return $idx['proyectos'][$id];
    });
    if (!$r) error_api('Esa actividad ya no está en el repositorio.', 404);
    salir(array('ok' => true, 'ficha' => $r));

case 'carpeta_borrar':
    exigir_docente();
    $id = id_seguro(campo('id'));
    if (!$id) error_api('Identificador no válido.');
    con_indice(function (&$idx) use ($id) { unset($idx['proyectos'][$id]); return true; });
    $f = dir_datos() . '/proyectos/' . $id . '.json';
    if (is_file($f)) @unlink($f);
    salir(array('ok' => true));

/* ---------- actividades del modo profesor ---------- */
case 'act_listar':
    $idx = leer_indice();
    $doc = es_docente();
    $lista = array();
    foreach ($idx['actividades'] as $id => $f) {
        if (!$doc && empty($f['visible'])) continue;
        $a = json_decode((string)@file_get_contents(dir_datos() . '/actividades/' . $id . '.json'));
        if (!is_object($a)) continue;
        $a->visible = !empty($f['visible']);
        $lista[] = $a;
    }
    usort($lista, function ($a, $b) {
        return (int)(isset($a->creada) ? $a->creada : 0) - (int)(isset($b->creada) ? $b->creada : 0);
    });
    salir(array('ok' => true, 'docente' => $doc, 'actividades' => $lista));

case 'act_guardar':
    exigir_docente();
    $act = campo_json('actividad');
    if (!is_object($act) || !isset($act->id)) error_api('Actividad no válida.');
    $id = id_seguro($act->id);
    if (!$id) error_api('Identificador de actividad no válido.');
    unset($act->visible);                     // la visibilidad vive en el índice
    $json = json_encode($act, JSON_UNESCAPED_UNICODE);
    if ($json === false || strlen($json) > 8388608) error_api('La actividad es demasiado grande.', 413);
    if (!escribir_archivo(dir_datos() . '/actividades/' . $id . '.json', $json)) error_api('No se pudo escribir en la carpeta del servidor.', 500);
    $ficha = array('id' => $id,
                   'titulo' => mb_substr((string)(isset($act->titulo) ? $act->titulo : ''), 0, 160),
                   'creada' => isset($act->creada) ? $act->creada : round(microtime(true) * 1000));
    $r = con_indice(function (&$idx) use ($id, $ficha) {
        $prev = isset($idx['actividades'][$id]) ? $idx['actividades'][$id] : null;
        $ficha['visible'] = $prev ? !empty($prev['visible']) : false;
        $idx['actividades'][$id] = $ficha;
        return $ficha;
    });
    $act->visible = $r['visible'];
    salir(array('ok' => true, 'actividad' => $act));

case 'act_visible':
    exigir_docente();
    $id = id_seguro(campo('id'));
    $v  = !empty(campo('visible'));
    $r = con_indice(function (&$idx) use ($id, $v) {
        if (!$id || !isset($idx['actividades'][$id])) return null;
        $idx['actividades'][$id]['visible'] = $v;
        return $idx['actividades'][$id];
    });
    if (!$r) error_api('Esa actividad ya no está.', 404);
    salir(array('ok' => true, 'actividad' => $r));      // ficha: id, titulo, creada, visible

case 'act_borrar':
    exigir_docente();
    $id = id_seguro(campo('id'));
    if (!$id) error_api('Identificador no válido.');
    con_indice(function (&$idx) use ($id) { unset($idx['actividades'][$id]); return true; });
    $f = dir_datos() . '/actividades/' . $id . '.json';
    if (is_file($f)) @unlink($f);
    salir(array('ok' => true));

default:
    error_api('Acción desconocida.', 404);
}

/* ------------------------------------------------------------------ */
function abrir_sesion($cn, $uid, $doc, $nombre, $grado) {
    $token = bin2hex(random_bytes(32));
    $st = $cn->prepare("INSERT INTO circuitlab_sesiones (token, usuario_id, creado, visto)
                        VALUES (?,?,NOW(),NOW())");
    $st->bind_param('si', $token, $uid); $st->execute(); $st->close();

    $st = $cn->prepare("UPDATE circuitlab_usuarios
                           SET ultimo_acceso = NOW(), accesos = accesos + 1 WHERE id = ?");
    $st->bind_param('i', $uid); $st->execute(); $st->close();

    /* Sesiones viejas: se limpian de vez en cuando y sin bloquear nada. */
    $cn->query("DELETE FROM circuitlab_sesiones WHERE visto < NOW() - INTERVAL 3 DAY");

    return array('ok' => true, 'token' => $token,
                 'usuario' => array('id' => (int)$uid, 'documento' => $doc,
                                    'nombre' => $nombre, 'grado' => $grado));
}

/** IPv4 del servidor en la red del aula (para los enlaces que se copian desde
    el PC-A: si allí se entra por "localhost", ese enlace no abriría en los
    PCs de los estudiantes). Prefiere redes privadas 192.168/10/172.16-31. */
function ip_lan() {
    $ips = @gethostbynamel(gethostname());
    if (!$ips) return null;
    $mejor = null;
    foreach ($ips as $ip) {
        if (strpos($ip, '127.') === 0 || strpos($ip, '169.254.') === 0) continue;
        if (preg_match('/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/', $ip)) return $ip;
        if (!$mejor) $mejor = $ip;
    }
    return $mejor;
}

/* ------------------------------------------------------------------
   Carpeta de datos (archivos JSON; sin base de datos)
   ------------------------------------------------------------------ */
function dir_datos() {
    $d = __DIR__ . '/datos';
    if (!is_dir($d . '/proyectos')) @mkdir($d . '/proyectos', 0775, true);
    if (!is_dir($d . '/actividades')) @mkdir($d . '/actividades', 0775, true);
    // nadie descarga estos archivos directamente: solo a través de la API
    if (!is_file($d . '/.htaccess')) @file_put_contents($d . '/.htaccess', "Require all denied\n");
    return $d;
}
function id_seguro($id) {
    $id = (string)$id;
    return preg_match('/^[A-Za-z0-9_\-]{1,48}$/', $id) ? $id : null;
}
function leer_json($f, $def) {
    if (!is_file($f)) return $def;
    $j = json_decode((string)@file_get_contents($f), true);
    return is_array($j) ? $j : $def;
}
/** Escritura atómica: archivo temporal + rename (nunca queda un JSON a medias). */
function escribir_archivo($f, $texto) {
    $tmp = $f . '.tmp' . mt_rand(1000, 9999);
    if (@file_put_contents($tmp, $texto, LOCK_EX) === false) return false;
    if (!@rename($tmp, $f)) { @unlink($tmp); return false; }
    return true;
}
function leer_indice() {
    $idx = leer_json(dir_datos() . '/indice.json', array());
    if (!isset($idx['proyectos']) || !is_array($idx['proyectos'])) $idx['proyectos'] = array();
    if (!isset($idx['actividades']) || !is_array($idx['actividades'])) $idx['actividades'] = array();
    return $idx;
}
/** Lee-modifica-escribe el índice bajo un cerrojo exclusivo. */
function con_indice($fn) {
    $d = dir_datos();
    $lock = @fopen($d . '/indice.lock', 'c');
    if ($lock) flock($lock, LOCK_EX);
    $idx = leer_indice();
    $r = $fn($idx);
    $ok = escribir_archivo($d . '/indice.json', json_encode($idx, JSON_UNESCAPED_UNICODE));
    if ($lock) { flock($lock, LOCK_UN); fclose($lock); }
    if (!$ok) error_api('No se pudo actualizar la carpeta del servidor.', 500);
    return $r;
}
