# Chicken Catch — minijuego promocional (demo no oficial)

Minijuego web hecho solo con HTML, CSS y JavaScript puro. Atrapa piezas de pollo, llega a 25 puntos en 50 segundos y elige una de tres tarjetas para descubrir un cupón **ficticio**.

> DEMO NO OFICIAL. Cupones ficticios sin validez comercial. No afiliado ni patrocinado por KFC.

## Cómo ejecutarlo
1. Descomprime el ZIP.
2. Abre `index.html` con doble clic (Chrome, Edge, Firefox o Safari). No necesita servidor.
3. Para publicarlo: sube la carpeta completa a GitHub Pages o Vercel (sitio estático, sin build).

Las tipografías (Alfa Slab One y Barlow) se cargan desde Google Fonts; sin conexión se usan fuentes de reserva.

## Estructura
```
index.html      Estructura de las pantallas
styles.css      Diseño (colores y medidas en variables al inicio de :root)
script.js       Lógica. El bloque "1. CONFIGURACIÓN" concentra todo lo editable
assets/images/  Tus imágenes oficiales
assets/audio/   Tu música y efectos
```

## Reemplazar imágenes
Copia tus archivos en `assets/images/` con estos nombres exactos:

`logo.png`, `hero-chicken.png`, `hero-chicken-2.png` y `hero-chicken-3.png` (carrusel de portada), `chicken-leg.png`, `chicken-wing.png`, `special-chicken.png`, `bottle.png`, `drink-cup.png`, `drink-can.png`, `chili.png`, `spring.png`, `card-back-1.png`, `card-back-2.png`, `card-back-3.png`, `coupon-prize.png`

**Imágenes de los juegos nuevos (opcionales):** `game-catch.png`, `game-basket.png`, `game-collect.png` (portadas del selector), `basket-bucket.png` (balde del Basket, vista frontal; si lo usas, se dibuja delante de la pelota), `platform-bucket.png` (baldes del juego de plataformas) y `player.png` (el hombrecito; mirando a la derecha, se voltea solo). Las piezas de pollo de todos los juegos reutilizan `chicken-leg.png`, `chicken-wing.png` y `special-chicken.png`.

Después, en `script.js` > `CONFIG.assets`, elige una opción:
- Pon `enabled: true` en cada imagen que añadiste, **o**
- Deja `autoDetect: true` (valor por defecto) y la web detecta sola qué archivos existen. Los avisos 404 de la consola son solo esa comprobación; cuando termines de subir todo puedes poner `autoDetect: false` y usar `enabled: true` para silenciarlos.

Mientras no actives una imagen se usan ilustraciones provisionales propias (sin logotipos), así que nunca hay imágenes rotas. Recomendado: PNG con fondo transparente, cuadradas para las piezas (≈ 400×400 px) y verticales para las tarjetas (≈ 600×820 px).

## Añadir música y sonidos
Copia en `assets/audio/` (mp3): `background.mp3` (inicio, selector, tarjetas y cupón), `game-catch.mp3`, `game-basket.mp3`, `game-collect.mp3` (una por juego; `game.mp3` sirve de reserva para cualquier juego sin la suya), `final-catch.mp3`, `final-collect.mp3`, `final-basket.mp3` (pista extra de los últimos 10 s de cada juego; `final.mp3` sirve para todos), `bonus.mp3` (+5 s), `win.mp3`, `lose.mp3`, `catch.mp3`, `penalty.mp3`, `reveal.mp3`, `click.mp3`. Activa cada uno con `enabled: true` en `CONFIG.audio` (o usa `autoDetect: true`).

- **La música arranca sola al entrar.** Los navegadores solo permiten audio tras una interacción, así que se intenta al cargar y, si lo bloquean, empieza con el primer toque, clic o tecla (el reproductor muestra «Toca para activar»). Si pausas la música, se recuerda y no vuelve a sonar sola.
- Si falta el archivo de una pista, suena una **música sintetizada propia de esa pantalla** (inicio, Atrapa, Basket y Recoge tienen cada una la suya). Para desactivarla pon `synthMusic: false`; entonces, sin archivos, el reproductor oculta el botón de play. Los efectos que no tengan archivo se generan con sonidos sencillos (desactívalo con `synthFallback: false`).
- Volumen y silencio se guardan en LocalStorage.
- En iPhone/iPad el volumen de música lo controla el sistema; el botón de silencio sí funciona.

## Personalizar
En `CONFIG` (script.js): puntos objetivo, duración, valor y frecuencia de cada objeto, velocidades, dificultad, premios, prefijo del código, textos y volumen inicial. Colores, tipografías, radios y sombras: variables de `:root` en `styles.css`.

## Controles
Ratón o toque directo sobre las piezas. Teclado: ← → (o A / D) mueven un carril resaltado y Espacio/Enter atrapa la pieza más baja del carril.

## Novedades de esta versión
- **Cinta de términos y condiciones** en el footer (texto en movimiento continuo, se pausa al pasar el ratón). Textos en `CONFIG.ticker`.
- **Pollo que se escapa = −1 punto** (`CONFIG.game.missPenalty`, 0 para desactivarlo). Las bebidas que caen sin tocar no castigan.
- **Portada con carrusel**: alterna `hero-chicken.png` y `hero-chicken-2.png` con efecto; con tus imágenes solo rota las que existan (`CONFIG.hero`).
- **Cursor del juego** que cambia al pasar sobre una pieza y al pulsar, con onda en el clic.
- **Logo clicable**: vuelve a la portada desde cualquier pantalla y reinicia el juego limpiamente.
- **Extras**: botón de pausa (también tecla P / Esc; se pausa sola si cambias de pestaña), récord de tiempo más rápido guardado en el navegador, aviso «¡Se escapó!» y sonido opcional `miss.mp3`.

## Tres juegos
Al pulsar «¡JUGAR AHORA!» aparece el selector. Todo se ajusta en `CONFIG.games` (script.js):
1. **Atrapa el pollo** — 25 puntos en 50 s. Pollo que se escapa: −1.
2. **Encesta el pollo** — 30 puntos en 50 s. Arrastra hacia atrás y suelta (o ← → ángulo, ↑ ↓ fuerza, Espacio). Fallar resta 1, los pollos dorados valen 2 y al llegar a 25 el balde se mueve de lado a lado.
3. **Recoge y entrega** — 20 puntos en 50 s. Mueve al hombrecito (← → o A/D), salta (↑, W o Espacio; en móvil hay botones táctiles) y lleva un pollo cada vez a cualquiera de los dos baldes de arriba. Siempre hay 3 pollos en el mapa; recoger y entregar es automático al acercarte.
Cada juego guarda su propio récord de tiempo.

## Reglas actualizadas
- **Atrapa:** el pollo dorado (+2) cae más rápido y, si se escapa, resta 2 (`items.special.missPenalty`).
- **Basket:** meta de 15 puntos; el balde se mueve desde 12 (`moveFromScore`). 3 encestadas seguidas = +5 segundos (`streakEvery`, `streakSeconds`); un fallo reinicia la racha.
- **Recoge:** de vez en cuando cae un vaso con aviso previo; si te golpea pierdes 1 punto y parpadeas un momento (`cups` en `CONFIG.games.collect`).

## Última actualización
- **Orden de los juegos:** 1 Atrapa, 2 Recoge y entrega, 3 Encesta (cambia el orden en `CONFIG.games`).
- **Botón de reiniciar** junto al de pausa (también en el menú de pausa): reinicia ese mismo juego.
- **Atrapa:** más objetos a evitar (bebidas, vasos, latas y chiles) y aparecen más rápido.
- **Recoge:** al llegar a 10 puntos caen más vasos y al llegar a 15 (faltan 5) todavía más (`cups.stages`).
- **Basket:** meta 12; el balde se mueve desde 10 (faltan 2); 6 seguidas = +5 s.
- **Pista final:** cuando faltan 10 s (`CONFIG.game.finalSeconds`) suena la pista extra del juego; sin archivo, suena una versión más rápida sintetizada.

## Ajustes recientes
- **Música automática** al entrar a la página.
- **Atrapa:** a los 15 puntos la caída se acelera un poco y a los 20 más (`speedStages`).
- **Basket:** 3 encestadas seguidas = +5 segundos.
- **Recoge:** caen al azar vasos, latas, botellas y chiles (`cups.hazards`), cada vez más seguido (10 y 15 puntos).

## Ajustes recientes (2)
- **Objetos que restan** (Atrapa y los que caen en Recoge): botella, vaso, lata, chile y resorte. Se editan en `CONFIG.items` y `CONFIG.games.collect.cups.hazards`.
- **Corregido:** el objeto que iba a caer en Recoge ya no se veía un instante arriba a la izquierda antes de caer.
