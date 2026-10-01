# CircuitLab — Laboratorio virtual de circuitos y robótica

Aplicación web educativa **100 % sin conexión** para aprender protoboard, electrónica,
Arduino y micro:bit construyendo y simulando circuitos de verdad.

---

## Cómo abrirla

| Forma | Cómo |
|---|---|
| Desde la intranet | Aplicaciones Web → **CircuitLab (Circuitos y Robótica)** |
| Desde el servidor | `http://<servidor>/Intranet/root/media/app/app_web/CircuitLab/index.html` |
| Desde una USB | Copia toda la carpeta `CircuitLab` y abre `index.html` con doble clic |
| Instalada como app | Ábrela en Chrome/Edge → menú ⋮ → **Instalar**. Queda como un programa más y funciona sin internet |

> No necesita internet, ni PHP, ni base de datos, ni ninguna librería externa.
> Todo (protoboard, componentes, animaciones, iconos) está dibujado con SVG desde el propio código.

---

## Qué trae

- **Protoboard interactiva** con sus conexiones internas reales: 30 columnas, filas A–E / F–J,
  canal central y 4 rieles de alimentación. Al pasar el mouse por un agujero dice con quién está unido;
  el botón 🔗 ilumina las pistas internas.
- **Simulación eléctrica real** (análisis nodal, no una animación): las conexiones tienen consecuencias.
  Un LED con 220 Ω a 5 V recibe 13 mA y brilla; sin resistencia recibe 220 mA y aparece la advertencia.
- **Componentes**: LED (5 colores), LED RGB, barra de 8 LEDs, resistencia, potenciómetro, pulsador,
  interruptor, buzzer, condensador, diodo, **transistor NPN**, batería, fuentes de 5 V y 3,3 V, GND, VCC,
  motor DC, servo, motor paso a paso, **relé**, **driver de motor (puente H)**,
  sensor ultrasónico, LDR, temperatura, movimiento (PIR), humedad, joystick y receptor IR.
  Con el transistor, el relé y el driver ya se puede responder a la pregunta que faltaba:
  *¿por qué el Arduino no puede mover el motor él solo?*
- **Placas**: Arduino Uno, Nano y Mega, y micro:bit con su matriz de 25 LEDs y botones A/B.
- **Editor de código** con un subconjunto educativo de Arduino (C++) y el dialecto de la micro:bit,
  más un modo de **bloques** que genera el código automáticamente.
- **Diagnóstico educativo** (botón 🔍 Analizar): cortocircuitos, LED invertido, LED sin resistencia,
  circuito abierto, sensores sin alimentar, pines sobrecargados… siempre con la causa y la solución.
- **Multímetro de puntas** (botón 🔎): se arrastran a cualquier pin o agujero. Si las dos caen sobre el
  mismo componente da tensión, corriente, resistencia y potencia: la ley de Ohm comprobada a mano.
- **Osciloscopio** (botón 📈, pestaña de la consola): dibuja cómo cambia una tensión o una corriente con
  el tiempo. Es lo que hace visible el PWM, la carga de un condensador o el rebote de un pulsador.
- **Modo avería** (menú ☰): la aplicación estropea el circuito a escondidas y hay que encontrar el fallo
  y repararlo, con pistas progresivas. La comprobación es exacta, no aproximada.
- **Lista de materiales** (menú ☰): lo que habría que comprar para montar el circuito de verdad,
  con los centímetros de cable incluidos. Se copia o se descarga en CSV.
- **Curso de 10 niveles**, **20 circuitos de ejemplo**, **12 ejercicios autoevaluados**,
  **8 retos contrarreloj** y **modo profesor** para crear actividades y consultar resultados.
- **Los componentes se queman de verdad**: si a un LED le pasan más de 45 mA durante medio segundo,
  se ennegrece, echa humo y deja de conducir. Se repone con «Reiniciar circuito» y se puede desactivar
  en *Profesor → Ajustes*.
- **Sonido de cada componente**, sintetizado en el momento (0 KB, sin archivos ni internet):
  el motor DC zumba más agudo cuanto mayor es la tensión, el servo chirría solo mientras se mueve,
  el paso a paso hace "brrr" al ritmo de sus pasos, el interruptor chasquea, el LED avisa con un
  tono según su color, el sensor ultrasónico hace ping y un cortocircuito suena a chispa.
  El botón 🔊 de la barra silencia todo y el volumen se ajusta en *Profesor → Ajustes*.

---

## Atajos

`R` rotar · `Supr` eliminar · `Ctrl+D` duplicar · `Ctrl+Z/Y` deshacer/rehacer · `Ctrl+S` guardar
`F5` ejecutar · `F8` analizar · `F1` ayuda · `+ / −` zoom · `0` ajustar vista · `Espacio+arrastrar` mover el lienzo

Herramientas del lienzo: `🔗` conexiones internas · `⚬` pines · `🏷️` valores · `⚡` flujo de corriente ·
`🔎` multímetro · `📈` osciloscopio · `⬚` seleccionar. En la barra superior, `🔊` silencia todo el sonido.

---

## Estructura del proyecto

```
CircuitLab/
  index.html            maqueta general
  manifest.json         datos de la PWA
  service-worker.js     caché para funcionar sin internet
  css/                  style · components · education
  icons/                icono SVG y PNG (192 y 512)
  js/
    core/               util.js (helpers, eventos) · audio.js (síntesis de sonido)
                        state.js (proyecto, deshacer/rehacer)
    components/         catalog.js · catalog2.js (relé, transistor, driver, RGB, barra)
                        breadboard.js · arduino.js · microbit.js
    simulation/         electricity.js (álgebra) · circuit-engine.js (nodos y resolución)
                        validation.js (diagnóstico) · interpreter.js · runtime.js
    editor/             workspace.js · wires.js · selection.js · zoom.js · codeeditor.js · blocks.js
    education/          lessons.js · examples.js · exercises.js · challenges.js · faults.js (modo avería)
    storage/            projects.js (IndexedDB con respaldo en localStorage)
    ui/                 panels.js · dialogs.js · notifications.js · assistant.js · teacher.js
                        scope.js (osciloscopio) · multimetro.js
    app.js              arranque y barra de herramientas
```

---

## Notas técnicas

- **Sin frameworks**: JavaScript clásico (sin módulos ES) para que también funcione con `file://`.
- **Guardado**: IndexedDB para los proyectos, con respaldo automático en `localStorage`
  (así funciona incluso abriendo el archivo con doble clic). Exporta e importa en formato JSON propio.
- **Actualizar la app**: el `service-worker.js` guarda todo en caché. Al modificar el código hay que
  cambiar la constante `CACHE` (por ejemplo `circuitlab-v2`) para que los equipos reciban la versión nueva.
  Para desarrollar, abre la app con `?dev=1` y no se registrará la caché.
- **Sonido sin archivos**: todo se genera con WebAudio (osciladores + ruido filtrado) en
  `js/core/audio.js`. No hay ni un `.mp3`, así que la app sigue pesando lo mismo y funciona
  igual desde una USB. `CL.audio.escena()` se llama una vez por cuadro desde el reloj de
  simulación y cuesta ≈ 0,03 ms con 29 componentes. El audio no arranca hasta el primer
  clic del usuario (política de los navegadores) y se calla solo al cambiar de pestaña.
- **Elementos gobernados del motor eléctrico**: además de resistencias, interruptores, fuentes y LEDs,
  hay dos tipos que dependen de otra parte del circuito: `swc` (interruptor gobernado por la tensión de
  otro par de pines, con histéresis) y `rc` (resistencia que salta entre corte y saturación). Con esos
  dos se construyen el relé, el transistor y el puente H sin tocar el resolvedor.
  Cuidado con las entradas «al aire»: como un interruptor abierto vale 1 GΩ y la fuga a tierra también,
  un nodo suelto se queda a media tensión y el componente conduce sin mandárselo. Por eso el transistor
  y el driver llevan resistencias de bajada internas de 100 kΩ.
- **Bajo consumo**: con la simulación parada y nada moviéndose, el reloj baja de 60 a ~8 cuadros por
  segundo. Cualquier cambio en el circuito, o tocar el ratón o el teclado, lo despierta al instante.
- **Diferencia con una placa real**: las divisiones se calculan con decimales; el truncado a entero
  ocurre al guardar en una variable `int` (igual que `int x = 7/2;` → 3).

## Cuentas de estudiante y trabajos de clase

Desde la versión 1.9 CircuitLab puede guardar el trabajo **en la cuenta del estudiante**, no solo en
el computador donde lo armó. Así el que se sienta hoy en el PC-12 y mañana en el PC-3 sigue teniendo
sus circuitos, y el docente ve todas las entregas desde su equipo.

Es una capa **opcional**: si no hay servidor —USB, `file://`, Apache apagado— todo esto se apaga solo
y la app guarda en el propio computador exactamente como antes.

### Cómo entra un estudiante

1. Botón **🔑 Entrar** de la barra superior.
2. Escribe su **número de documento**. Se valida contra la tabla `estudiantes` de la intranet: si no
   aparece ahí (o está retirado) no puede entrar, así que no hay usuarios inventados.
3. La **primera vez** inventa su contraseña (mínimo 4 caracteres) y queda creada la cuenta.
   Las siguientes veces solo escribe esa contraseña.

Con la sesión abierta, el botón **💾 Guardar** de siempre hace dos cosas: guarda en el computador
*y* sube el trabajo a la cuenta. Desde **👤 → Mis trabajos** el estudiante abre cualquier circuito
suyo, lo **entrega** al profesor y ve la nota y el comentario cuando el profesor los pone.

Si en ese momento no hay servidor, el trabajo queda apuntado en una cola y **sube solo** la próxima
vez que la app encuentre conexión con la sesión abierta.

### Panel del aula (solo el PC del docente)

En el desplegable **🎓 Aprender → 🏫 Aula** (aparece únicamente en PC-A):

- **Trabajos**: todo lo que han guardado o entregado, con filtro *solo entregados* / *todo*, botón
  para abrir el circuito del estudiante en el propio lienzo, poner **nota (0.0 a 5.0) y comentario**,
  y descargar una **planilla CSV** para pasar al consolidado.
- **Cuentas**: quién tiene cuenta, cuántos trabajos lleva, cuándo entró por última vez y el botón
  para **restablecer la contraseña** del que la olvidó (la vuelve a crear al entrar).

### Notas técnicas

- Todo va contra `server/api.php`, que reutiliza `estructura_web/conexionbd.php` de la intranet.
- Tablas propias: `circuitlab_usuarios`, `circuitlab_trabajos` y `circuitlab_sesiones`. Se crean solas
  la primera vez que se llama a la API (`CREATE TABLE IF NOT EXISTS`).
- La contraseña se guarda con `password_hash()` en tabla propia. **No** se usa `estudiantes.Contrasena`,
  que es un campo en claro que administra el docente en otro módulo y sirve para otra cosa.
- La sesión es un **token** de 64 hex en `localStorage`, no la sesión de PHP: la app puede estar abierta
  en varias pestañas y el service worker complica las cookies. Caduca a las 12 h sin usarse.
- El panel del aula se autoriza con `$Pc_real === 'PC-A'`. Aquí se *conceden* privilegios, así que ante
  la duda se niega — al revés que los guards que cortan el acceso a páginas, que deben fallar abiertos.
- Ocho contraseñas falladas seguidas obligan a esperar 5 minutos.

## Región de detección del sensor ultrasónico

Basta con **hacer clic en un HC-SR04** (no hace falta que la simulación esté en marcha) para que aparezca
el **cono** que representa el espacio donde el sensor puede ver un objeto grande, y dentro un **círculo:
el objeto objetivo**. Se arrastra libremente y con eso cambia la distancia que mide el sensor, igual que
moviendo la mano delante del sensor de verdad. Junto a la placa se lee la distancia en pulgadas y
centímetros. Al deseleccionar el sensor, el cono y la bolita desaparecen.

El cono **cambia de color**: verde suave mientras la bolita está dentro del haz (el sensor la detecta) y
rojo suave en cuanto se sale. Fuera del haz no hay eco que cronometrar, así que la lectura pasa a ser
`400 cm` (fuera de alcance) y la etiqueta muestra *sin eco · fuera del haz*, exactamente lo que hace un
HC-SR04 real cuando el objeto queda a un lado.

Lo que mide el programa cambia al instante: `pulseIn()` lee `props.distancia`, así que arrastrando el
objetivo se ve al alumno cómo su sketch reacciona sin tocar una sola línea de código.

Notas de implementación (`js/ui/sonar.js`):

- Escala **0,8 px por cm**, semiángulo del haz **15°** (el del HC-SR04 real) y rango 2–400 cm.
- El cono sale de la cara superior de la placa (local `y = -20`, la constante `CARA`; si se redibuja la
  placa hay que actualizarla) y **gira con el componente**: el eje
  y el perpendicular se calculan con `CL.rot(..., c.rot)`, así que al rotar el sensor la región le sigue.
- El objetivo se mueve libre por todo el lienzo, también fuera del cono; salirse del haz es justo lo
  que se quiere poder enseñar.
- Dentro del haz la **fuente de verdad es `c.props.distancia`**: el deslizador «Distancia» del inspector y
  el objetivo arrastrable nunca se contradicen. Solo cuando la bolita se sale del haz se guarda su radio
  aparte (`radios`), porque entonces `props.distancia` vale 400 y la bolita tiene que recordar dónde la
  dejaron. El ángulo del objetivo (`angulos`) siempre es local: es un mando de la simulación, no parte
  del circuito.
- La firma de repintado se inicializa a `null`, no a `''`: sin sensores seleccionados la firma real ES la
  cadena vacía y el cono del último sensor se quedaba pegado en el lienzo.
- Se engancha a los gestos del lienzo como el multímetro: `modo === 'sonar'` en los tres puntos de
  `workspace.js` (`alBajar` / `alMover` / `alSubir`), detectando por **geometría** y no por `e.target`.
- La etiqueta se coloca al costado y **siempre hacia abajo en pantalla**: encima de lo seleccionado sale
  la barra flotante de acciones y se pisaban cuando el sensor estaba girado 90°.
- No se repinta en cada cuadro: hay una *firma* (posición, rotación, distancia y ángulo) y solo se
  redibuja cuando cambia.

## Colores del código

El editor de texto es de **dos capas**: un `<pre id="codeHL">` pinta el código con color y encima va el
`<textarea id="codeArea">` con el texto en `transparent` (solo se le ve el cursor y la selección). Las dos
capas comparten fuente, tamaño, interlineado, `padding` y `tab-size`; **si se cambia uno hay que cambiar el
otro** o las letras de color se desalinean de las que se escriben.

`CL.codigo.resaltar(txt)` devuelve el HTML coloreado y lo usan tanto el editor como el «código generado»
del modo de bloques. Un solo barrido con una expresión regular reparte el texto en comentarios, cadenas,
preprocesador, números e identificadores; los identificadores se buscan en tres diccionarios (`TIPOS`,
`FUNCS`, `CONSTS`) creados con `Object.create(null)` para que nombres como `constructor` o `toString` no
se coloreen por heredarlos de `Object.prototype`.

La paleta es la misma familia que usa Tinkercad para Arduino, en variables CSS (`--syn-*` en `style.css`,
con juego claro y oscuro):

| Grupo | Claro | Ejemplo |
|---|---|---|
| Tipos y estructura | naranja `#cc6600` | `void`, `int`, `if`, `for`, `return` |
| Funciones de la librería | turquesa `#00979c` | `pinMode`, `digitalWrite`, `Serial`, `basic` |
| Constantes | azul `#00699b` | `HIGH`, `LOW`, `OUTPUT`, `true`, números |
| Cadenas | rojo ladrillo `#b7410e` | `"Hola"` |
| Comentarios | gris cursiva `#7e8f99` | `// ...`, `/* ... */` |
| `#include` / `#define` | verde oliva `#728e00` | `#include <Servo.h>` |

## Las dos barras de arriba

La cabecera (`#topbar`) es solo identidad y acciones de proyecto, y va compacta: **Archivo** (un único
desplegable con Nuevo, Abrir, Guardar y Guardar como…), deshacer/rehacer, Analizar, Aprender y, a la
derecha, Código, la simulación, la cuenta y los ajustes.

Pegada debajo va `#toolbar2`, la barra de herramientas del área de trabajo, en cuatro grupos:

| Grupo | Botones |
|---|---|
| Zoom | acercar, alejar, ajustar a la pantalla |
| Selección | herramienta seleccionar, rotar, duplicar, color del cable, eliminar |
| Ver | cuadrícula, conexiones internas, pines, valores, flujo de corriente |
| Medir | multímetro, osciloscopio |

Ahí viven ahora dos cosas que antes flotaban sobre el lienzo y le comían sitio: el panel vertical de la
esquina superior izquierda (`#stageTools`) y la barrita que aparecía encima de lo seleccionado
(`#selBar`). Las cuatro acciones de selección **no se esconden, se apagan**: `CL.sel.barra()`
(`js/editor/selection.js`) les pone `disabled` según lo que haya elegido (rotar y duplicar solo con
componentes, color solo con cables), así los botones nunca cambian de sitio.

Detalles a tener en cuenta si se toca:

- Los dos desplegables (`ddArchivoMenu` y `ddMasMenu`) viven **fuera** de `#topbar`, como hijos de
  `<body>`, porque la barra tiene `overflow-y:hidden` y recortaría cualquier cosa que sobresalga.
  `conectarDesplegable(idBoton, idMenu)` los coloca con `position:fixed`, y los baja **por debajo de**
  `#toolbar2` para no tapar la barra de herramientas.
- Los ids de los botones no cambiaron al mudarlos (`zoomIn`, `tglPines`, `btnNuevo`…), así que todo el
  cableado de `js/app.js` sigue igual. Los nuevos son `tglCuadricula` (interruptor de la cuadrícula, que
  usa la clase `body.no-grid` que ya existía en el CSS) y `btnRotar` / `btnDuplicar` / `btnColorCable` /
  `btnEliminar`.
## Cómo se marca lo seleccionado

Los componentes seleccionados **no llevan recuadro**: se les enciende un halo azul que sigue su propia
silueta (`filter:url(#selGlow)` sobre el grupo `.cuerpo`, y `#hovGlow` más flojo al pasar por encima).
Los dos filtros están en el `<defs>` de `index.html` y son `feDropShadow` con `flood-color` fijo, así que
el halo es azul aunque el componente sea de cualquier color. Como el filtro va en unidades del lienzo, el
halo crece y mengua con el zoom.
