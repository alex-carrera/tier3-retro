# Plan: Tier 3 Retro con juego opcional

Guía de implementación y verificación de la migración. Fecha: 2 de noviembre de 2026.

## Objetivo y direcciones propuestas

- `https://alex-carrera.github.io/tier3-retro/`: aplicación de retrospectivas independiente. Crear retro, entrar con invitación y abrir el historial, sin pasar por una sala de juego.
- `https://alex-carrera.github.io/tier3-retro/juego/`: aventura cooperativa de seis niveles para 2–7 personas, con entrada y sesión propias.
- `https://alex-carrera.github.io/tier3-retro/#retro=<id>.<clave>`: dirección canónica de un tablero compartido.
- `https://alex-carrera.github.io/tier3-retro/juego/?sala=<codigo>`: invitación a una partida.

La retro será el producto principal. El juego será una actividad opcional para empezar una reunión. Se mantendrán los límites distintos: 2–7 en el juego y hasta 30 participantes en una retro.

## Situación actual verificada

Ya existe un botón «Crear una retro» y se guardan los tableros en Supabase. Sin embargo, `src/main.js` importa de forma estática el renderer Phaser, la simulación y el tablero. Crear una retro abre primero una sala y después la convierte en tablero. Una misma sesión de navegador se usa para ambos flujos.

La separación debe evitar que entrar a la retro cargue el motor del juego o reactive una partida anterior.

## 1. Separar las dos aplicaciones

Preparar dos entradas HTML reales para GitHub Pages: `index.html` para retro y `juego/index.html` para juego. Configurar la compilación multipágina en Vite. La recarga y los enlaces directos deben responder sin depender de rutas virtuales ni de una página 404.

Distribución orientativa:

- `src/retro/main.js`: bienvenida a la retro, invitaciones, historial y montaje del tablero.
- `src/game/main.js`: personalización del personaje, lobby, controles, niveles y renderer.
- `src/common/`: perfil, transporte WebSocket, enlaces, estilos comunes y utilidades.
- Módulos actuales del tablero, música y temporizador: reutilizados por la entrada de retro.

El paquete Phaser, el renderer y los bots solo se descargarán en la entrada del juego. El botón «Probar demo» del juego no aparecerá como paso necesario para crear una retro.

## 2. Separar creación y sesiones

Añadir una operación de servidor para crear directamente una retrospectiva. Debe aceptar a una persona que facilite la reunión, sin exigir lobby, jugadores listos ni estado de un nivel.

Mantener un servidor existente y una sola base de datos inicialmente, con manejadores separados para juego y retro. Esta separación permite posteriormente desplegar el tablero por su cuenta sin duplicar sus datos.

Separar las sesiones del navegador para que la entrada a la retro no reanude accidentalmente una partida y viceversa. Conservar compatibilidad de lectura con las claves antiguas de perfil y con `tier3-retro-history`. Cambiar la ruta dentro del mismo origen de GitHub Pages no exige mover ese historial local a otro dominio.

Al terminar el juego, pasar a la dirección canónica del tablero conservando la identidad y el acceso de cada participante. El botón «Retro» seguirá permitiendo abrirla antes de terminar los niveles.

## 3. Migrar el nombre y mantener los enlaces anteriores

1. Verificar disponibilidad de `alex-carrera/tier3-retro` y los permisos necesarios.
2. Preparar y verificar la compilación de ambas entradas antes del cambio público.
3. Renombrar el repositorio principal de `juntos-retro` a `tier3-retro`, conservando el historial Git.
4. Actualizar el remoto local, documentación, enlaces compartidos, QR, metadatos de Pages y referencia del repositorio en Render.
5. Conservar la dirección actual del servidor de Render durante esta migración: el usuario está cambiando la dirección pública de Pages y no necesita mover a la vez el backend.
6. Volver a publicar GitHub Pages y comprobar la dirección nueva.
7. Mantener un sitio mínimo de compatibilidad en el nombre anterior, con redirección explícita. Su despliegue se prepara antes del cambio y se publica al quedar libre el nombre.

Reglas de la redirección antigua:

- Un enlace con `#retro=` va a la raíz nueva conservando íntegro el fragmento.
- Una invitación con `?sala=` va a `/juego/` conservando el código de sala.
- Una visita sin invitación va a la nueva página principal de retro.

La clave privada del tablero seguirá en el fragmento; no se copiará a parámetros de consulta ni a registros. Crear un repositorio de compatibilidad con el nombre antiguo sustituye la redirección automática de GitHub para ese nombre: por eso los remotos y la conexión de Render deben apuntar explícitamente al nuevo repositorio antes.

GitHub documenta que las URL de los sitios de Pages no tienen la misma redirección automática que las URL del repositorio:
https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository

## 4. Criterios de aceptación

- La raíz nueva permite crear y compartir una retro sin abrir el juego ni descargar Phaser.
- La creación directa conserva participantes, permisos, tarjetas, votos, acciones, cinco minutos por punto, música e historial permanente.
- Los tableros antiguos conservan su ID, clave de acceso y contenido; no se recrean ni se duplican.
- Abrir una invitación antigua a una retro termina en el mismo tablero bajo la ruta nueva.
- Una invitación antigua a un juego termina en la entrada de juego con el mismo código.
- Ambas entradas funcionan al abrirlas directamente y al recargarlas en GitHub Pages.
- La retro no reanuda una partida; el juego no reanuda automáticamente otro tablero.
- El final del juego y el botón «Retro» llevan al mismo tablero para todo el equipo, conservando la identidad.
- Se conservan las 36 pruebas actuales y los recorridos de los seis niveles con equipos de 2–7.
- Se añaden pruebas de rutas, enlaces anteriores, creación directa y separación de sesiones; se comprueba el guardado y reapertura reales de la retro con datos temporales.
- Se verifica el diseño de ambas entradas en pantalla pequeña y se comprueba que la red no descargue el motor del juego al abrir solamente la retro.

## Orden de entrega

1. Separar las entradas, sesiones y creación de retro en una rama de trabajo.
2. Ejecutar pruebas y revisar ambas experiencias localmente.
3. Preparar la compatibilidad de enlaces y la configuración de publicación.
4. Migrar el nombre y desplegar en una misma entrega.
5. Verificar la raíz, el juego, enlaces antiguos, historial y conexión del equipo en producción.

No requiere contratar otro servicio ni crear una segunda base de datos para esta primera etapa.
