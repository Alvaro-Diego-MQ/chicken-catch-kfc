/* ==========================================================================
   CHICKEN CATCH — script.js
   Índice:
     1. CONFIGURACIÓN  ← aquí cambias puntos, tiempos, premios, imágenes y audio
     2. Utilidades
     3. Recursos (imágenes reemplazables)
     4. Audio (música, efectos, volumen)
     5. Efectos visuales (partículas, confeti, transición de cortina)
     6. Pantallas
     7. Juego
     8. Tarjetas y cupón
     9. Arranque
   ========================================================================== */
'use strict';

/* ==========================================================================
   1. CONFIGURACIÓN
   ========================================================================== */
const CONFIG = {
  /* ---- Reglas comunes ---- */
  game: {
    countdownSec: 3,          // Cuenta atrás antes de empezar (0 = sin cuenta atrás)
    finalSeconds: 10,         // Cuando faltan estos segundos suena la pista "final" de cada juego
    winCelebrationMs: 2800,   // Tiempo del mensaje "¡LO LOGRASTE!" antes de pasar a las tarjetas
    mobileBreakpoint: 600     // Ancho (px) del área de juego por debajo del cual se considera móvil
  },

  /* ---- Los 3 juegos (meta, duración y ajustes de cada uno) ---- */
  games: {
    catch: {
      name: 'Atrapa el pollo', tagline: 'Toca las piezas que caen',
      rules: 'Toca el pollo para sumar y esquiva bebidas, latas, chiles y resortes. Si se escapa un pollo pierdes 1 punto; el dorado (+2) cae más rápido y, si se escapa, pierdes 2.',
      art: 'gameCard1',
      target: 25, duration: 50,
      missPenalty: 1,                       // puntos que resta cada pollo que se escapa (0 = sin castigo)
      maxItems: { desktop: 9, mobile: 6 },  // objetos simultáneos máximos
      speedStages: [                        // la caída se acelera con la puntuación
        { from: 15, mult: 1.18 },           // con 15 puntos: un poco más rápido
        { from: 20, mult: 1.40 }            // con 20 puntos: bastante más rápido
      ]
    },
    collect: {
      name: 'Recoge y entrega', tagline: 'Corre, salta y lleva el pollo',
      rules: 'Lleva un pollo cada vez a cualquiera de los dos baldes de arriba. ¡Siempre hay 3 en el mapa! Cuidado: caen vasos, latas, botellas, chiles y resortes al azar, cada vez más. Si te golpean, pierdes puntos.',
      art: 'gameCard3',
      target: 20, duration: 50,
      chickens: 3,         // pollos en el mapa a la vez
      points: 1,           // puntos por entrega
      gravity: 3.4,        // gravedad del personaje
      jumpHeight: 0.30,    // altura del salto (fracción de la altura del mapa)
      speed: 0.62,         // velocidad (anchos de pantalla por segundo)
      cups: {              // objetos que caen del cielo al azar (vasos, latas, botellas, chiles)
        warnMs: 700,       // aviso "!" antes de caer
        speed: 0.75,       // velocidad de caída base (alturas por segundo); cada objeto varía un poco
        hazards: [         // qué puede caer: weight = probabilidad, penalty = puntos que resta
          { art: 'drinkCup',  symbol: 'sym-cup',    penalty: 1, weight: 4 },
          { art: 'drinkCan',  symbol: 'sym-can',    penalty: 1, weight: 3 },
          { art: 'bottle',    symbol: 'sym-bottle', penalty: 2, weight: 2 },
          { art: 'chili',     symbol: 'sym-chili',  penalty: 2, weight: 2 },
          { art: 'spring',    symbol: 'sym-spring', penalty: 1, weight: 3 }
        ],
        stages: [          // con más puntos caen más objetos
          { from: 0,  everyMs: [2500, 4600], max: 3 },
          { from: 10, everyMs: [1600, 3000], max: 4 },   // al completar 10
          { from: 15, everyMs: [900, 1800],  max: 5 }    // cuando faltan 5
        ]
      }
    },
    basket: {
      name: 'Encesta el pollo', tagline: 'Lanza al balde',
      rules: 'Arrastra hacia atrás y suelta. Fallar resta 1 y el pollo dorado vale 2. 3 encestadas seguidas = +5 segundos. ¡Cuando faltan 2 puntos el balde se mueve!',
      art: 'gameCard2',
      target: 12, duration: 50,
      normalPoints: 1, specialPoints: 2, specialChance: 0.25, // pollo dorado = 2 puntos
      missPenalty: 1,
      moveFromScore: 10,   // con esta puntuación (faltan 2) el balde empieza a moverse de izquierda a derecha
      streakEvery: 3,      // cada X encestadas seguidas...
      streakSeconds: 5,    // ...se suman estos segundos
      moveSpeed: 1.3,      // velocidad del balde (radianes/segundo)
      moveAmp: 0.28,       // recorrido (fracción del ancho)
      gravity: 2.4,        // gravedad (alturas de pantalla por segundo²)
      maxPower: 2.1,       // fuerza máxima del lanzamiento
      previewPoints: 14    // puntos de la trayectoria de ayuda
    }
  },

  /* ---- Dificultad: va de "inicio" a "final" a lo largo de la partida ---- */
  difficulty: {
    spawnStartMs: [720, 1100],  // Intervalo entre apariciones al inicio [mín, máx] (ms)
    spawnEndMs: [360, 640],     // Intervalo entre apariciones al final [mín, máx] (ms)
    speedMultiplierEnd: 1.25,   // La velocidad de caída crece con el tiempo hasta x1.25 (además de speedStages)
    maxBadStreak: 3             // Máximo de objetos negativos seguidos
  },

  /* ---- Movimiento natural ---- */
  motion: {
    swayAmp: [4, 14],   // Balanceo horizontal (px)
    spin: [-80, 80]     // Rotación (grados por segundo)
  },

  /* ---- Objetos del juego ----
     kind:   'good' suma / 'bad' resta
     points: valor (negativo = penalización)
     weight: probabilidad relativa de aparecer
     speed:  [mín, máx] en "alturas de pantalla por segundo" (0.3 ≈ tarda 3,3 s en caer)
     art:    clave de CONFIG.assets.images   |   symbol: ilustración provisional */
  items: {
    leg:     { kind: 'good', points: +1, weight: 30, speed: [0.30, 0.40], art: 'chickenLeg',     symbol: 'sym-leg',     name: 'Pierna de pollo' },
    wing:    { kind: 'good', points: +1, weight: 28, speed: [0.30, 0.42], art: 'chickenWing',    symbol: 'sym-wing',    name: 'Alita de pollo' },
    special: { kind: 'good', points: +2, weight: 9,  speed: [0.44, 0.58], art: 'specialChicken', symbol: 'sym-special', name: 'Pieza especial', badge: true,
               missPenalty: 2 },   // cae más rápido; si se escapa resta 2 (las demás usan games.catch.missPenalty)
    bottle:  { kind: 'bad',  points: -2, weight: 12, speed: [0.32, 0.44], art: 'bottle',         symbol: 'sym-bottle',  name: 'Botella' },
    cup:     { kind: 'bad',  points: -1, weight: 14, speed: [0.30, 0.42], art: 'drinkCup',       symbol: 'sym-cup',     name: 'Vaso de bebida' },
    can:     { kind: 'bad',  points: -1, weight: 12, speed: [0.32, 0.46], art: 'drinkCan',       symbol: 'sym-can',     name: 'Lata' },
    chili:   { kind: 'bad',  points: -2, weight: 10, speed: [0.34, 0.48], art: 'chili',          symbol: 'sym-chili',   name: 'Chile' },
    spring:  { kind: 'bad',  points: -1, weight: 10, speed: [0.34, 0.48], art: 'spring',         symbol: 'sym-spring',  name: 'Resorte' }
  },

  /* ---- Carrusel de la portada ----
     Cada diapositiva usa una imagen de CONFIG.assets.images (art) o su ilustración provisional (symbol).
     Si subes imágenes propias, solo se rotan las que existan. Añade más diapositivas si quieres. */
  hero: {
    intervalMs: 3800,
    slides: [
      { art: 'hero',  symbol: 'sym-bucket' },
      { art: 'hero2', symbol: 'sym-pieces' },
      { art: 'hero3', symbol: 'sym-hero3' }
    ]
  },

  /* ---- Cinta de términos y condiciones (footer). Tokens: {target} {duration} {penalty} ---- */
  ticker: {
    speed: 55, // píxeles por segundo
    items: [
      'DEMO NO OFICIAL · Cupones ficticios sin validez comercial',
      'Esta experiencia es un prototipo demostrativo y no está afiliada ni patrocinada por KFC',
      'Retos de {duration} segundos · Metas: {goals}',
      'Atrapa: cada pollo que se escapa resta {penalty} punto (el dorado, 2) · Recoge: ¡cuidado con los vasos! · Basket: cada tiro fallado resta 1',
      'Los premios y códigos se generan al azar con fines ilustrativos',
      'Los cupones no se pueden canjear ni tienen valor monetario',
      'Una sola tarjeta por partida ganada · El premio no cambia una vez descubierto',
      'Las marcas, logotipos e imágenes pertenecen a sus respectivos propietarios',
      'Participar es gratis · Juega y diviértete'
    ]
  },

  /* ---- Premios FICTICIOS (se elige uno al azar al destapar una tarjeta) ---- */
  prizes: [
    { id: 'p10',   name: 'Cupón de 10 % de descuento',  offer: '10 %',  offerSub: 'de descuento',                weight: 1, symbol: 'sym-leg' },
    { id: 'p15',   name: 'Cupón de 15 % de descuento',  offer: '15 %',  offerSub: 'de descuento',                weight: 1, symbol: 'sym-wing' },
    { id: 'combo', name: 'Combo de demostración',       offer: 'COMBO', offerSub: 'oferta especial de demostración', weight: 1, symbol: 'sym-bucket' }
  ],
  codePrefix: 'DEMO-KFC-',   // Los códigos se generan como DEMO-KFC-NNNN (4 dígitos al azar)

  /* ---- Textos editables ---- */
  texts: {
    loseMessages: [ // según el porcentaje de la meta alcanzado: [hasta, mensaje]
      [0.4, '¡Buen calentamiento! Afina el pulso y vuelve por ese cupón.'],
      [0.8, '¡Vas por muy buen camino! Un intento más y el premio es tuyo.'],
      [1.01, '¡Estuviste a un bocado de lograrlo! Inténtalo otra vez, lo tienes muy cerca.']
    ],
    copyLabel: 'COPIAR CUPÓN',
    copiedLabel: '¡CÓDIGO COPIADO!',
    copiedToast: '¡Código copiado!'
  },

  /* ---- Imágenes (ver README) ----
     Mientras "enabled" sea false se usan ilustraciones provisionales y NO se pide ningún archivo
     (así no hay errores 404). Cuando subas tu imagen: pon enabled:true
     — o pon autoDetect:true y la web comprobará sola qué archivos existen. */
  assets: {
    autoDetect: true,   // true = detecta solo qué imágenes existen en assets/images (recomendado)
    images: {
      logo:           { src: 'assets/images/logo.png',            enabled: false },
      hero:           { src: 'assets/images/hero-chicken.png',    enabled: false },
      hero2:          { src: 'assets/images/hero-chicken-2.png',  enabled: false }, // 2.ª imagen del carrusel de portada
      hero3:          { src: 'assets/images/hero-chicken-3.png',  enabled: false }, // 3.ª imagen del carrusel de portada
      gameCard1:      { src: 'assets/images/game-catch.png',      enabled: false }, // portada del juego "Atrapa"
      gameCard2:      { src: 'assets/images/game-basket.png',     enabled: false }, // portada del juego "Basket"
      gameCard3:      { src: 'assets/images/game-collect.png',    enabled: false }, // portada del juego "Recoge"
      basketBucket:   { src: 'assets/images/basket-bucket.png',   enabled: false }, // balde del Basket (vista frontal)
      platformBucket: { src: 'assets/images/platform-bucket.png', enabled: false }, // baldes del juego de plataformas
      player:         { src: 'assets/images/player.png',          enabled: false }, // hombrecito del juego de plataformas
      chickenLeg:     { src: 'assets/images/chicken-leg.png',     enabled: false },
      chickenWing:    { src: 'assets/images/chicken-wing.png',    enabled: false },
      specialChicken: { src: 'assets/images/special-chicken.png', enabled: false },
      bottle:         { src: 'assets/images/bottle.png',          enabled: false },
      drinkCup:       { src: 'assets/images/drink-cup.png',       enabled: false },
      drinkCan:       { src: 'assets/images/drink-can.png',       enabled: false }, // objeto a evitar (Atrapa)
      chili:          { src: 'assets/images/chili.png',           enabled: false }, // objeto a evitar (Atrapa)
      spring:         { src: 'assets/images/spring.png',          enabled: false }, // resorte: objeto a evitar
      cardBack1:      { src: 'assets/images/card-back-1.png',     enabled: false },
      cardBack2:      { src: 'assets/images/card-back-2.png',     enabled: false },
      cardBack3:      { src: 'assets/images/card-back-3.png',     enabled: false },
      couponPrize:    { src: 'assets/images/coupon-prize.png',    enabled: false }
    }
  },

  /* ---- Audio (ver README) ---- */
  audio: {
    autoDetect: true,        // true = comprueba solo qué archivos de audio existen
    defaultVolume: 0.35,     // Volumen inicial (0 a 1)
    musicMix: 0.8,           // Ganancia de la música respecto al volumen general
    sfxMix: 1.4,             // Ganancia de los efectos respecto al volumen general
    duckLevel: 0.25,         // La música baja a este nivel mientras suena un efecto importante
    duckMs: 2200,
    synthFallback: true,     // Si no hay archivo de efecto, genera uno sencillo con Web Audio
    synthMusic: true,        // si falta el archivo de una pista, suena una música sintetizada propia de esa pantalla
    music: {                 // una pista por pantalla (se detectan solas si autoDetect = true)
      background: { src: 'assets/audio/background.mp3',   enabled: false }, // inicio, selector, tarjetas y cupón
      catch:      { src: 'assets/audio/game-catch.mp3',   enabled: false }, // juego 1
      basket:     { src: 'assets/audio/game-basket.mp3',  enabled: false }, // juego 2
      collect:    { src: 'assets/audio/game-collect.mp3', enabled: false }, // juego 3
      game:       { src: 'assets/audio/game.mp3',         enabled: false }, // opcional: pista para cualquier juego sin la suya
      // Pistas extra que suenan cuando faltan los últimos segundos (CONFIG.game.finalSeconds):
      catchFinal:   { src: 'assets/audio/final-catch.mp3',   enabled: false },
      collectFinal: { src: 'assets/audio/final-collect.mp3', enabled: false },
      basketFinal:  { src: 'assets/audio/final-basket.mp3',  enabled: false },
      final:        { src: 'assets/audio/final.mp3',         enabled: false }  // opcional: una final para todos los juegos
    },
    sfx: {
      catch:   { src: 'assets/audio/catch.mp3',   enabled: false },
      miss:    { src: 'assets/audio/miss.mp3',    enabled: false }, // pieza de pollo que se escapa
      bonus:   { src: 'assets/audio/bonus.mp3',   enabled: false }, // +5 segundos por racha
      penalty: { src: 'assets/audio/penalty.mp3', enabled: false },
      win:     { src: 'assets/audio/win.mp3',     enabled: false },
      lose:    { src: 'assets/audio/lose.mp3',    enabled: false },
      reveal:  { src: 'assets/audio/reveal.mp3',  enabled: false },
      click:   { src: 'assets/audio/click.mp3',   enabled: false }
    }
  }
};

/* ==========================================================================
   2. Utilidades
   ========================================================================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reducedMotionQuery.matches;
const fmtPoints = (p) => (p > 0 ? '+' : '\u2212') + Math.abs(p);
const SVG_NS = 'http://www.w3.org/2000/svg';
/** Crea un elemento con clases */
function mk(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }

function weightedPick(list, weightOf) {
  const total = list.reduce((s, x) => s + weightOf(x), 0);
  let r = Math.random() * total;
  for (const x of list) { r -= weightOf(x); if (r <= 0) return x; }
  return list[list.length - 1];
}

/** localStorage a prueba de fallos (modo privado, bloqueado, etc.) */
const Store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin almacenamiento */ } }
};

/** Temporizadores de juego: se cancelan todos juntos al reiniciar */
const Timers = {
  ids: new Set(),
  after(ms, fn) {
    const id = setTimeout(() => { this.ids.delete(id); fn(); }, ms);
    this.ids.add(id);
    return id;
  },
  clearAll() { this.ids.forEach(clearTimeout); this.ids.clear(); }
};

/* ==========================================================================
   3. Recursos (imágenes reemplazables)
   ========================================================================== */
const Assets = {
  ok: {},

  async init() {
    const entries = Object.entries(CONFIG.assets.images);
    await Promise.all(entries.map(async ([key, cfg]) => { this.ok[key] = await this.check(cfg); }));
  },
  check(cfg) {
    if (!CONFIG.assets.autoDetect) return Promise.resolve(!!cfg.enabled);
    return new Promise((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => resolve(false), 2500);
      img.onload = () => { clearTimeout(timer); resolve(true); };
      img.onerror = () => { clearTimeout(timer); resolve(false); };
      img.src = cfg.src;
    });
  },
  has(key) { return !!this.ok[key]; },

  /** Devuelve <img> si existe la imagen oficial; si no, la ilustración provisional (SVG). */
  art(key, symbol) {
    if (key && this.has(key)) {
      const img = new Image();
      img.src = CONFIG.assets.images[key].src;
      img.alt = ''; img.decoding = 'async'; img.draggable = false;
      img.className = 'art-img';
      img.addEventListener('error', () => { this.ok[key] = false; img.replaceWith(svgUse(symbol)); }, { once: true });
      return img;
    }
    return svgUse(symbol);
  }
};

function svgUse(symbolId) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const tall = ['sym-bucket', 'sym-pieces', 'sym-hero3'];
  svg.setAttribute('viewBox', tall.includes(symbolId) ? '0 -22 200 246' : symbolId.startsWith('sym-hoop') ? '0 0 200 170' : '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('art-svg');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', '#' + symbolId);
  svg.appendChild(use);
  return svg;
}

/** Rellena todos los huecos de imagen del HTML (logo, héroe, tarjetas, cupón). */
function mountStaticArt() {
  $$('[data-art]').forEach((slot) => slot.replaceChildren(Assets.art(slot.dataset.art, slot.dataset.symbol)));

  if (Assets.has('logo')) {
    const logo = $('#brand-logo');
    const img = new Image();
    img.src = CONFIG.assets.images.logo.src; img.alt = 'Logotipo';
    logo.replaceChildren(img); logo.classList.add('has-image');
  }
  $$('[data-card-art]').forEach((slot) => {
    const key = slot.dataset.cardArt;
    if (!Assets.has(key)) return;
    const img = new Image();
    img.src = CONFIG.assets.images[key].src; img.alt = ''; img.draggable = false;
    slot.replaceChildren(img);
    slot.closest('.prize-card').classList.add('has-art');
  });
}

/** Sustituye textos numéricos del HTML por los valores de CONFIG. */
function bindConfigText() {
  const dur = CONFIG.games.catch.duration;
  $$('[data-bind="duration"]').forEach((el) => { el.textContent = dur; });
  $('.sticker').setAttribute('aria-label', `Partida de ${dur} segundos`);
}

/** Icono de interfaz (viewBox 24x24) */
function iconSvg(id, cls) {
  const svg = svgUse(id);
  svg.setAttribute('viewBox', '0 0 24 24');
  if (cls) svg.classList.add(...cls.split(' '));
  return svg;
}

/** Panel de la portada: resumen de los 3 juegos (se genera desde CONFIG). */
function renderLegend() {
  const list = $('#howto'), G = CONFIG.games;
  const row = (iconNodes, html) => {
    const li = document.createElement('li');
    const box = document.createElement('span'); box.className = 'howto__icons';
    iconNodes.forEach((n) => box.appendChild(n));
    const txt = document.createElement('span'); txt.innerHTML = html;
    li.append(box, txt);
    return li;
  };
  list.replaceChildren(
    row([Assets.art('chickenLeg', 'sym-leg'), makeManIcon(), Assets.art('basketBucket', 'sym-hoop')],
      `Elige entre <b>3 juegos</b>: atrapa, recoge o encesta`),
    row([iconSvg('ic-clock', 'howto__icon')], `Cada reto dura <b>${G.catch.duration} segundos</b> y tiene su propia meta`),
    row([iconSvg('ic-star', 'howto__icon')], `Cumple la meta y <b>destapa una tarjeta</b> con tu cupón`)
  );
}
/** Mini hombrecito para el panel */
function makeManIcon() { const m = Assets.has('player') ? Assets.art('player') : makeMan(); m.classList.add('howto__man'); return m; }

/* ==========================================================================
   4. Audio
   ========================================================================== */
const AudioManager = (() => {
  const A = CONFIG.audio;
  const prefs = Store.get('chickenCatch.audio.v1', {});
  let volume = typeof prefs.volume === 'number' ? clamp(prefs.volume, 0, 1) : A.defaultVolume;
  let muted = !!prefs.muted;
  let optOut = !!prefs.musicOptOut;   // el usuario pausó la música explícitamente
  let musicWanted = false;            // ¿debe sonar música ahora?
  let scene = 'menu';                 // 'menu' | 'catch' | 'basket' | 'collect'
  let current = null;                 // { type: 'file' | 'synth', key, id }
  let duck = 1;
  let duckTimer = 0;
  let ctx = null;
  let blockedFile = false;            // el navegador bloqueó la reproducción automática de un archivo

  const tracks = {};                  // archivos de música disponibles
  Object.keys(A.music).forEach((k) => { tracks[k] = null; });
  const sfxFiles = {};
  const ui = {};

  const save = () => Store.set('chickenCatch.audio.v1', { volume, muted, musicOptOut: optOut });

  /* ----- carga / comprobación de archivos ----- */
  function loadAudio(cfg, { loop = false } = {}) {
    return new Promise((resolve) => {
      if (!A.autoDetect && !cfg.enabled) return resolve(null);
      const a = new Audio();
      a.preload = A.autoDetect ? 'metadata' : 'auto';
      a.loop = loop; a.volume = 0;
      if (!A.autoDetect) { a.src = cfg.src; return resolve(a); }
      let settled = false;
      const done = (ok) => { if (settled) return; settled = true; clearTimeout(timer); resolve(ok ? a : null); };
      const timer = setTimeout(() => done(false), 3000);
      a.addEventListener('loadedmetadata', () => done(true), { once: true });
      a.addEventListener('error', () => done(false), { once: true });
      a.src = cfg.src;
    });
  }

  async function init() {
    ui.player = $('#player'); ui.btnMusic = $('#btn-music'); ui.eq = $('#eq');
    ui.status = $('#player-status'); ui.btnMute = $('#btn-mute'); ui.vol = $('#vol');
    ui.icMusic = $('#ic-music'); ui.icMute = $('#ic-mute-use');

    await Promise.all([
      ...Object.entries(A.music).map(async ([key, cfg]) => {
        const el = await loadAudio(cfg, { loop: true });
        if (!el) return;
        tracks[key] = el;
        el.muted = muted;
        el.addEventListener('error', () => { tracks[key] = null; sync(); }, { once: true }); // archivo roto: se desactiva solo esa pista
      }),
      ...Object.entries(A.sfx).map(async ([key, cfg]) => {
        const base = await loadAudio(cfg);
        if (!base) return;
        const size = key === 'catch' || key === 'click' ? 4 : 2;
        sfxFiles[key] = { pool: Array.from({ length: size }, () => base.cloneNode(true)), i: 0 };
      })
    ]);

    ui.btnMusic.addEventListener('click', () => { toggleMusic(); });
    ui.btnMute.addEventListener('click', () => setMuted(!muted));
    ui.vol.addEventListener('input', () => setVolume(ui.vol.value / 100));
    updateUI();
  }

  /* ----- música ----- */
  const hasMusic = () => A.synthMusic || Object.values(tracks).some(Boolean);
  const musicVolume = () => (muted ? 0 : clamp(volume * A.musicMix * duck, 0, 1));

  function fade(el, to, ms, done) {
    cancelAnimationFrame(el._fade);
    const from = el.volume, t0 = performance.now();
    if (ms <= 0) { el.volume = clamp(to, 0, 1); done && done(); return; }
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      el.volume = clamp(from + (to - from) * k, 0, 1);
      if (k < 1) el._fade = requestAnimationFrame(step); else done && done();
    };
    el._fade = requestAnimationFrame(step);
  }

  /** ¿El usuario ya interactuó con la página? (sin eso el navegador no deja crear audio) */
  const userActive = () => (navigator.userActivation ? navigator.userActivation.hasBeenActive : true);

  /** Qué pista corresponde a la pantalla actual (scene: 'menu' | 'catch' | 'collect' | 'basket', y 'X:final' en los últimos segundos).
      Orden: archivo propio > música sintetizada propia > (sin synth) pista de inicio */
  function resolveTrack() {
    if (!musicWanted) return null;
    const [base, fin] = scene.split(':');
    if (fin) { // últimos segundos: pista extra del juego, o la final genérica
      const f = tracks[base + 'Final'] ? base + 'Final' : (tracks.final ? 'final' : null);
      if (f) return { type: 'file', key: f, id: 'f:' + f };
    }
    let file = null;
    if (base === 'menu') file = tracks.background ? 'background' : null;
    else file = tracks[base] ? base : (tracks.game ? 'game' : null);
    if (file) return { type: 'file', key: file, id: 'f:' + file };
    if (A.synthMusic && userActive() && ensureCtx()) return { type: 'synth', key: fin ? base + ':final' : base, id: 's:' + scene };
    if (tracks.background) return { type: 'file', key: 'background', id: 'f:background' };
    return null;
  }

  function stopTrack(t) {
    if (!t) return;
    if (t.type === 'synth') { Synth.stop(); return; }
    const el = tracks[t.key];
    if (el) fade(el, 0, 450, () => { if (!current || current.id !== t.id) el.pause(); });
  }
  function startTrack(t) {
    if (t.type === 'synth') { Synth.start(t.key); Synth.setVolume(musicVolume(), 0.3); return; }
    const el = tracks[t.key];
    el.muted = muted;
    const p = el.play();
    if (p && p.catch) p.catch(() => { blockedFile = true; current = null; updateUI(); }); // bloqueado: se reintenta con el primer gesto
    fade(el, musicVolume(), 700);
  }
  function applyVolume() {
    if (!current) return;
    if (current.type === 'synth') Synth.setVolume(musicVolume(), 0.12);
    else if (tracks[current.key]) fade(tracks[current.key], musicVolume(), 250);
  }

  /** Reconcilia lo que debe sonar con lo que suena. Nunca hay dos pistas a la vez. */
  function sync() {
    const want = resolveTrack();
    const id = want ? want.id : null;
    if ((current ? current.id : null) !== id) {
      const old = current;
      current = want;
      stopTrack(old);
      if (want) startTrack(want);
    } else {
      applyVolume();
    }
    updateUI();
  }

  function toggleMusic() {
    if (!hasMusic()) return;
    musicWanted = !musicWanted;
    optOut = !musicWanted;
    save(); sync();
  }

  function duckMusic() {
    if (!current) return;
    duck = A.duckLevel; sync();
    clearTimeout(duckTimer);
    duckTimer = setTimeout(() => { duck = 1; sync(); }, A.duckMs);
  }

  function setMuted(m) {
    muted = m;
    Object.values(tracks).forEach((el) => { if (el) el.muted = m; });
    save(); sync();
  }
  function setVolume(v) {
    volume = clamp(v, 0, 1);
    if (volume > 0 && muted) { muted = false; Object.values(tracks).forEach((el) => { if (el) el.muted = false; }); }
    save(); sync();
  }

  /** Se llama con el primer gesto del usuario ("JUGAR AHORA"): permite audio y arranca la música. */
  function unlock() {
    ensureCtx();
    if (hasMusic() && !optOut && !musicWanted) musicWanted = true;
    blockedFile = false;
    sync();
  }
  /** Música automática al entrar: se intenta de inmediato y, si el navegador la bloquea, arranca con el primer toque/tecla. */
  function autoStart() {
    if (optOut || !hasMusic()) return;
    musicWanted = true;
    sync();
  }
  const isPlaying = () => musicWanted && !!current && !(current.type === 'synth' && ctx && ctx.state !== 'running');
  const optedOut = () => optOut;
  function setScene(name) { if (scene === name) return; scene = name; sync(); }

  /* ----- efectos ----- */
  function sfx(name) {
    if (muted || volume <= 0) return;
    const f = sfxFiles[name];
    if (f) {
      const a = f.pool[f.i++ % f.pool.length];
      try { a.currentTime = 0; } catch { /* aún sin metadatos */ }
      a.muted = false; a.volume = clamp(volume * A.sfxMix, 0, 1);
      const p = a.play(); if (p && p.catch) p.catch(() => {});
    } else if (A.synthFallback) {
      synth(name);
    }
    if (name === 'win' || name === 'lose' || name === 'reveal') duckMusic();
  }

  function ensureCtx() {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); ctx.addEventListener('statechange', updateUI); }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function tone(freq, dur, { type = 'sine', vol = 0.25, delay = 0, to = null } = {}) {
    const c = ensureCtx(); if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    const v = Math.max(0.0002, vol * clamp(volume * A.sfxMix, 0, 1));
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.03);
  }
  const SYNTH = {
    click:   () => tone(900, 0.05, { type: 'square', vol: 0.12, to: 600 }),
    catch:   () => { tone(520, 0.12, { type: 'triangle', to: 880 }); tone(880, 0.1, { type: 'triangle', delay: 0.06, to: 1320 }); },
    bonus:   () => [659, 880, 1175].forEach((f, i) => tone(f, 0.2, { type: 'triangle', vol: 0.22, delay: i * 0.07 })),
    miss:    () => tone(300, 0.2, { type: 'sawtooth', vol: 0.14, to: 140 }),
    penalty: () => { tone(220, 0.3, { type: 'sawtooth', vol: 0.2, to: 80 }); tone(160, 0.3, { type: 'square', vol: 0.1, delay: 0.05, to: 60 }); },
    win:     () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', delay: i * 0.12 })); [523, 659, 784, 1047].forEach((f) => tone(f, 0.7, { type: 'sine', vol: 0.12, delay: 0.5 })); },
    lose:    () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, { type: 'square', vol: 0.12, delay: i * 0.18 })),
    reveal:  () => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.28, { type: 'sine', vol: 0.2, delay: i * 0.08 }))
  };
  function synth(name) { const fn = SYNTH[name]; if (fn) fn(); }

  /* ----- música sintetizada (reserva): un tema propio por pantalla ----- */
  const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const P = (str) => str.trim().split(/\s+/);
  // Cada tema: 4 compases de 16 pasos. Los números son semitonos sobre la nota raíz + el acorde del compás ("prog").
  const THEMES = {
    menu: { // relajado y amable
      bpm: 100, root: 60, prog: [0, 5, 7, 5], gate: 1.7, leadWave: 'triangle', bassWave: 'sine', leadVol: 0.1, bassVol: 0.2,
      lead: P('0 . 4 . 7 . 4 . 9 . 7 . 4 . 2 .'), bass: P('0 . . . . . . . 0 . . . 7 . . .'),
      kick: P('x . . . . . . . x . . . . . . .'), snare: P('. . . . . . . . . . . . . . . .'), hat: P('. . x . . . x . . . x . . . x .')
    },
    catch: { // rápido y alegre
      bpm: 148, root: 64, prog: [0, 0, 5, 7], gate: 0.8, leadWave: 'square', bassWave: 'triangle', leadVol: 0.055, bassVol: 0.26,
      lead: P('0 4 7 12 7 4 7 12 0 4 7 12 7 4 2 4'), bass: P('0 . 0 . 0 . 0 . 0 . 0 . 0 . 7 .'),
      kick: P('x . . . x . . . x . . . x . x .'), snare: P('. . . . x . . . . . . . x . . .'), hat: P('x . x . x . x . x . x . x . x .')
    },
    basket: { // ritmo funky
      bpm: 112, root: 57, prog: [0, 3, 5, 3], gate: 1.1, leadWave: 'triangle', bassWave: 'sawtooth', leadVol: 0.11, bassVol: 0.14,
      lead: P('0 . 3 . . 5 . 7 . . 5 . 3 . 0 .'), bass: P('0 . . 0 . . 0 . 3 . . 3 . 5 . 7 .'),
      kick: P('x . . . . . x . . . x . . . . .'), snare: P('. . . . x . . . . . . . x . . .'), hat: P('. . x . . x . . x . . x . . x . .')
    },
    collect: { // aventura en tono menor
      bpm: 132, root: 62, prog: [0, -2, -4, -2], gate: 0.9, leadWave: 'square', bassWave: 'triangle', leadVol: 0.05, bassVol: 0.24,
      lead: P('0 . 3 5 7 . 5 3 0 . 3 5 7 10 12 .'), bass: P('0 . . 0 . . 0 . 0 . . 0 . 7 . .'),
      kick: P('x . . . x . . . x . . . x . . x'), snare: P('. . . . x . . . . . . . x . . .'), hat: P('. x . x . x . x . x . x . x . x')
    }
  };

  // Versión "final" de cada tema: más rápida y con más percusión
  ['catch', 'collect', 'basket'].forEach((k) => {
    const t = THEMES[k];
    THEMES[k + ':final'] = { ...t, bpm: Math.round(t.bpm * 1.22), leadVol: t.leadVol * 1.15, hat: P('x x x x x x x x x x x x x x x x'), kick: P('x . . x x . . x x . . x x . x x'), gate: t.gate * 0.8 };
  });

  const Synth = {
    bus: null, noise: null, timer: 0, theme: null, step: 0, next: 0,
    ensure() {
      const c = ensureCtx(); if (!c) return null;
      if (!this.bus) {
        this.bus = c.createGain(); this.bus.gain.value = 0; this.bus.connect(c.destination);
        const n = Math.floor(c.sampleRate * 0.5);
        this.noise = c.createBuffer(1, n, c.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      }
      return c;
    },
    start(key) {
      const c = this.ensure(); if (!c) return;
      clearInterval(this.timer);
      this.theme = THEMES[key] || THEMES.menu;
      this.step = 0; this.next = c.currentTime + 0.08;
      this.timer = setInterval(() => this.pump(), 40); // un único temporizador
    },
    stop() {
      clearInterval(this.timer); this.timer = 0;
      if (this.bus && ctx) this.bus.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    },
    setVolume(v, tc) { if (this.bus && ctx) this.bus.gain.setTargetAtTime(clamp(v, 0, 1), ctx.currentTime, tc || 0.12); },
    pump() {
      const th = this.theme, stepDur = 60 / th.bpm / 4;
      while (this.next < ctx.currentTime + 0.25) { this.playStep(this.step, this.next, stepDur); this.next += stepDur; this.step = (this.step + 1) % 64; }
    },
    playStep(i, t, sd) {
      const th = this.theme, off = th.prog[Math.floor(i / 16) % 4], k = i % 16;
      if (th.lead[k] !== '.') this.voice(NOTE(th.root + off + Number(th.lead[k])), th.leadWave, th.leadVol, t, sd * th.gate);
      if (th.bass[k] !== '.') this.voice(NOTE(th.root - 24 + off + Number(th.bass[k])), th.bassWave, th.bassVol, t, sd * 1.7);
      if (th.kick[k] === 'x') this.kick(t);
      if (th.snare[k] === 'x') this.hit(t, 1800, 0.16, 0.13);
      if (th.hat[k] === 'x') this.hit(t, 7000, 0.06, 0.04);
    },
    voice(freq, type, vol, t, dur) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, dur));
      o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + dur + 0.05);
    },
    kick(t) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.2);
    },
    hit(t, hp, vol, dur) { // caja / hi-hat con ruido filtrado
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = this.noise; f.type = 'highpass'; f.frequency.value = hp;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.bus); src.start(t); src.stop(t + dur + 0.02);
    }
  };

  /* ----- interfaz del reproductor ----- */
  function updateUI() {
    if (!ui.player) return;
    const music = hasMusic();
    const anySfx = Object.keys(sfxFiles).length > 0 || A.synthFallback;
    ui.player.hidden = !(music || anySfx);          // sin audio disponible, no se muestra nada
    ui.btnMusic.hidden = !music; ui.eq.hidden = !music; ui.status.hidden = !music;
    const waiting = musicWanted && !isPlaying();      // esperando el primer gesto del usuario
    const playing = isPlaying();
    ui.player.classList.toggle('is-playing', playing && !muted);
    ui.btnMusic.setAttribute('aria-pressed', String(playing));
    ui.btnMusic.setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
    ui.icMusic.setAttribute('href', musicWanted ? '#ic-pause' : '#ic-play');
    ui.status.textContent = playing ? (muted ? 'Música en silencio' : 'Música activa') : (waiting ? 'Toca para activar' : 'Música en pausa');
    ui.btnMute.setAttribute('aria-pressed', String(muted));
    ui.btnMute.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar todo el sonido');
    ui.icMute.setAttribute('href', muted || volume === 0 ? '#ic-mute' : '#ic-vol');
    ui.vol.value = Math.round((muted ? 0 : volume) * 100);
    ui.vol.style.setProperty('--v', ui.vol.value + '%');
  }

  return { init, unlock, autoStart, isPlaying, optedOut, setScene, sfx };
})();

/* ==========================================================================
   5. Efectos visuales
   ========================================================================== */
/** Confeti en <canvas>. Se detiene solo cuando no quedan partículas. */
const Confetti = {
  canvas: null, c: null, parts: [], raf: 0, last: 0,
  colors: ['#E4002B', '#FFFFFF', '#FFC62E', '#FFF4DE', '#E08A1E', '#FF2F4E'],

  launch(count = 140) {
    if (reduced()) return;
    this.canvas = this.canvas || $('#confetti');
    this.c = this.c || this.canvas.getContext('2d');
    this.resize();
    const W = window.innerWidth, H = window.innerHeight;
    for (let i = 0; i < count; i++) {
      const side = i % 3; // 0 = cañón izq., 1 = cañón der., 2 = lluvia
      const p = { w: rand(7, 13), h: rand(5, 9), rot: rand(0, 6.28), vr: rand(-8, 8), life: 0, max: rand(3, 4.6),
                  color: this.colors[randInt(0, this.colors.length - 1)], round: Math.random() < 0.25 };
      if (side === 0) Object.assign(p, { x: 0, y: H * 0.85, vx: rand(250, 700), vy: rand(-1100, -600) });
      else if (side === 1) Object.assign(p, { x: W, y: H * 0.85, vx: rand(-700, -250), vy: rand(-1100, -600) });
      else Object.assign(p, { x: rand(0, W), y: rand(-60, -10), vx: rand(-60, 60), vy: rand(60, 260) });
      this.parts.push(p);
    }
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame((t) => this.frame(t)); }
  },
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.c.setTransform(dpr, 0, 0, dpr, 0, 0);
  },
  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    const c = this.c, H = window.innerHeight;
    c.clearRect(0, 0, window.innerWidth, H);
    this.parts = this.parts.filter((p) => p.life < p.max && p.y < H + 40);
    for (const p of this.parts) {
      p.life += dt;
      p.vy += 900 * dt; p.vx *= 1 - 0.9 * dt; p.vy *= 1 - 0.35 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
      c.globalAlpha = clamp((p.max - p.life) * 1.5, 0, 1);
      c.fillStyle = p.color;
      if (p.round) { c.beginPath(); c.arc(0, 0, p.h * 0.6, 0, 6.28); c.fill(); } else c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      c.restore();
    }
    if (this.parts.length) this.raf = requestAnimationFrame((t) => this.frame(t)); else this.stop();
  },
  stop() {
    cancelAnimationFrame(this.raf); this.raf = 0; this.parts = [];
    if (this.c) this.c.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
};

/** Pequeños efectos dentro del área de juego (puntos flotantes, chispas, sacudida) */
const Fx = {
  init() { this.arena = $('#arena'); this.layer = $('#fx'); this.flashEl = $('#flash'); },

  popup(x, y, text, kind) {
    const el = document.createElement('span');
    el.className = 'popup popup--' + kind; el.textContent = text;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    this.layer.appendChild(el);
    const a = el.animate([
      { opacity: 0, transform: 'translateY(10px) scale(.6)' },
      { opacity: 1, transform: 'translateY(-14px) scale(1.15)', offset: 0.25 },
      { opacity: 0, transform: 'translateY(-70px) scale(1)' }
    ], { duration: 800, easing: 'ease-out' });
    a.onfinish = () => el.remove();
  },
  burst(x, y, kind, count = 8) {
    if (reduced()) return;
    const colors = kind === 'good' ? ['#FFC62E', '#E08A1E', '#FFF4DE'] : ['#19B5C9', '#7be7ff', '#fff'];
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'spark'; s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.background = colors[i % colors.length];
      this.layer.appendChild(s);
      const ang = rand(0, 6.28), dist = rand(34, 86);
      const a = s.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(.2)`, opacity: 0 }
      ], { duration: rand(420, 700), easing: 'cubic-bezier(.2,.8,.3,1)' });
      a.onfinish = () => s.remove();
    }
  },
  /** Onda al pulsar en el área de juego (x, y relativos al área) */
  ripple(x, y) {
    if (reduced()) return;
    const el = document.createElement('span');
    el.className = 'ripple'; el.style.left = x + 'px'; el.style.top = y + 'px';
    this.layer.appendChild(el);
    el.animate([{ transform: 'scale(.3)', opacity: 0.95 }, { transform: 'scale(2.6)', opacity: 0 }],
      { duration: 420, easing: 'ease-out' }).onfinish = () => el.remove();
  },
  /** Destello en el suelo cuando se escapa una pieza */
  groundHit() {
    $('#ground').animate([{ boxShadow: 'inset 0 0 0 80px rgba(255,60,80,.75)' }, { boxShadow: 'inset 0 0 0 80px rgba(255,60,80,0)' }], { duration: 420 });
  },
  penalty() {
    if (reduced()) { this.flashEl.animate([{ opacity: 0.6 }, { opacity: 0 }], { duration: 250 }); return; }
    this.flashEl.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 400 });
    this.arena.animate([
      { transform: 'translate(0,0)' }, { transform: 'translate(-8px,2px)' }, { transform: 'translate(7px,-2px)' },
      { transform: 'translate(-5px,1px)' }, { transform: 'translate(0,0)' }
    ], { duration: 320 });
  },
  clear() { this.layer.replaceChildren(); }
};

/** Transición de cortina: franjas rojo/blanco (como el toldo) cubren y descubren la pantalla */
const Wipe = {
  el: null, stripes: [],
  build() {
    this.el = $('#wipe');
    const n = window.innerWidth < 600 ? 6 : 10;
    this.el.replaceChildren(...Array.from({ length: n }, () => document.createElement('i')));
    this.stripes = $$('i', this.el);
  },
  async cover() {
    this.el.classList.add('is-on');
    try {
      if (reduced()) {
        this.stripes.forEach((s) => { s.style.transform = 'scaleY(1)'; });
        await this.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 }).finished;
        return;
      }
      await Promise.all(this.stripes.map((s, i) => {
        s.style.transformOrigin = 'top';
        return s.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
          { duration: 260, delay: i * 26, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }).finished;
      }));
    } catch { /* animación cancelada */ }
  },
  async reveal() {
    try {
      if (reduced()) {
        await this.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120 }).finished;
      } else {
        await Promise.all(this.stripes.map((s, i) => {
          s.style.transformOrigin = 'bottom';
          return s.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }],
            { duration: 260, delay: i * 26, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }).finished;
        }));
      }
    } catch { /* animación cancelada */ }
    this.stripes.forEach((s) => { s.getAnimations().forEach((a) => a.cancel()); s.style.transform = ''; });
    this.el.classList.remove('is-on');
  }
};

/** Récords: tiempo más rápido en ganar, por juego (LocalStorage) */
const Best = {
  key: 'chickenCatch.bestTimes.v2',
  data: Store.get('chickenCatch.bestTimes.v2', {}),
  get(id) { return this.data[id] || 0; },
  /** Devuelve true si es un nuevo récord */
  submit(id, seconds) {
    const t = Math.round(seconds * 10) / 10, prev = this.data[id];
    const isNew = !prev || t < prev;
    if (isNew) { this.data[id] = t; Store.set(this.key, this.data); }
    this.render();
    return isNew;
  },
  render() {
    $$('[data-best]').forEach((el) => {
      const v = this.get(el.dataset.best);
      el.textContent = v ? `Récord: ${v} s` : 'Sin récord aún';
    });
  }
};

/** Pantalla "elige tu juego": tarjetas generadas desde CONFIG.games */
const GameSelect = {
  init() {
    const wrap = $('#games');
    Object.entries(CONFIG.games).forEach(([id, g], i) => {
      const card = mk('button', `game-card game-card--${id}`);
      card.type = 'button'; card.dataset.game = id;
      card.setAttribute('aria-label', `${g.name}. Meta: ${g.target} puntos en ${g.duration} segundos.`);

      const art = mk('span', 'game-card__art');
      if (Assets.has(g.art)) art.appendChild(Assets.art(g.art));
      else this.fallbackArt(id, art);
      const num = mk('span', 'game-card__num'); num.textContent = i + 1;
      const goal = mk('span', 'game-card__goal'); goal.textContent = `${g.target} pts · ${g.duration} s`;
      art.append(num, goal);

      const body = mk('span', 'game-card__body');
      const title = mk('span', 'game-card__title'); title.textContent = g.name;
      const tag = mk('span', 'game-card__tag'); tag.textContent = g.tagline;
      const rules = mk('span', 'game-card__rules'); rules.textContent = g.rules;
      const foot = mk('span', 'game-card__foot');
      const best = mk('span', 'game-card__best'); best.dataset.best = id;
      const cta = mk('span', 'game-card__cta'); cta.textContent = '¡JUGAR!';
      foot.append(best, cta);
      body.append(title, tag, rules, foot);

      card.append(art, body);
      card.addEventListener('click', () => Game.start(id));
      wrap.appendChild(card);
    });
    Best.render();
  },
  /** Ilustraciones de reserva de cada juego (se sustituyen con game-*.png) */
  fallbackArt(id, art) {
    const add = (sym, cls) => { const s = svgUse(sym); s.classList.add('ga', cls); art.appendChild(s); };
    if (id === 'catch') { add('sym-leg', 'ga--a'); add('sym-wing', 'ga--b'); add('sym-special', 'ga--c'); add('sym-cup', 'ga--d'); }
    else if (id === 'basket') {
      const arc = document.createElementNS(SVG_NS, 'svg');
      arc.setAttribute('viewBox', '0 0 200 120'); arc.classList.add('ga', 'ga--arc');
      arc.innerHTML = '<path d="M24 110C50 10 130 -10 158 52" fill="none" stroke="#26191A" stroke-width="5" stroke-dasharray="1 12" stroke-linecap="round"/>';
      art.appendChild(arc); add('sym-hoop', 'ga--hoop'); add('sym-leg', 'ga--ball');
    } else {
      ['a', 'b', 'c'].forEach((k) => art.appendChild(mk('span', 'ga ga-plat ga-plat--' + k)));
      add('sym-hoop', 'ga--hoopL'); add('sym-hoop', 'ga--hoopR'); add('sym-leg', 'ga--chick');
      const man = makeMan(); man.classList.add('ga', 'ga--man'); art.appendChild(man);
    }
  }
};

/** Carrusel de imágenes de la portada con efecto de entrada/salida */
const Hero = {
  index: 0, timer: 0, slides: [], dots: [], leaveTimers: [],

  init() {
    const box = $('#hero-art'), dots = $('#hero-dots');
    let defs = CONFIG.hero.slides;
    const custom = defs.filter((d) => Assets.has(d.art));
    if (custom.length) defs = custom; // con imágenes propias solo se rotan las que existen (no se mezclan con las provisionales)

    defs.forEach((d, i) => {
      const el = document.createElement('div');
      el.className = 'hero__slide';
      el.appendChild(Assets.art(d.art, d.symbol));
      box.appendChild(el); this.slides.push(el);

      const dot = document.createElement('button');
      dot.type = 'button'; dot.className = 'hero__dot';
      dot.setAttribute('aria-label', `Ver imagen ${i + 1} de ${defs.length}`);
      dot.addEventListener('click', () => { this.show(i); this.restart(); });
      dots.appendChild(dot); this.dots.push(dot);
    });
    this.slides[0].classList.add('is-active');
    this.dots[0].classList.add('is-active');
    dots.hidden = this.slides.length < 2;
  },
  show(n) {
    if (n === this.index || !this.slides[n]) return;
    const prev = this.slides[this.index], next = this.slides[n];
    prev.classList.remove('is-active'); prev.classList.add('is-leaving');
    this.leaveTimers.push(setTimeout(() => prev.classList.remove('is-leaving'), 1000));
    next.classList.add('is-active');
    this.dots[this.index].classList.remove('is-active'); this.dots[n].classList.add('is-active');
    this.index = n;
    this.burst();
  },
  burst() {
    if (reduced()) return;
    $('#hero-burst').animate([{ opacity: 0.9, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(1.7)' }],
      { duration: 800, easing: 'ease-out' });
  },
  next() { this.show((this.index + 1) % this.slides.length); },
  start() { if (this.slides.length < 2 || this.timer) return; this.timer = setInterval(() => this.next(), CONFIG.hero.intervalMs); },
  stop() { clearInterval(this.timer); this.timer = 0; },
  restart() { this.stop(); this.start(); }
};

/** Cinta de términos y condiciones (footer): texto que avanza sin cortes */
const Ticker = {
  init() {
    this.track = $('#ticker-track'); this.viewport = $('#ticker-viewport');
    this.build();
    let t = 0;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => this.build(), 250); });
  },
  texts() {
    const G = CONFIG.games;
    const goals = `Atrapa ${G.catch.target} · Recoge ${G.collect.target} · Basket ${G.basket.target} puntos`;
    return CONFIG.ticker.items.map((t) => t
      .replace('{goals}', goals).replace('{duration}', G.catch.duration)
      .replace('{penalty}', G.catch.missPenalty));
  },
  group(reps) {
    const g = document.createElement('div'); g.className = 'ticker__group';
    for (let r = 0; r < reps; r++) {
      this.texts().forEach((txt) => {
        const item = document.createElement('span'); item.className = 'ticker__item';
        item.appendChild(svgUse('sym-leg'));
        const span = document.createElement('span'); span.textContent = txt;
        item.appendChild(span); g.appendChild(item);
      });
    }
    return g;
  },
  build() {
    this.track.replaceChildren();
    const probe = this.group(1); this.track.appendChild(probe);
    const w1 = probe.getBoundingClientRect().width || 1200;
    const reps = Math.max(1, Math.ceil(this.viewport.clientWidth / w1));
    const group = this.group(reps);
    const clone = group.cloneNode(true); clone.setAttribute('aria-hidden', 'true'); // segunda copia para el bucle continuo
    this.track.replaceChildren(group, clone);
    const w = group.getBoundingClientRect().width || w1 * reps;
    this.track.style.setProperty('--ticker-dur', (w / CONFIG.ticker.speed).toFixed(1) + 's');
  }
};

/* ==========================================================================
   6. Pantallas
   ========================================================================== */
const Screens = {
  current: 'welcome',
  busy: false,
  els: {},
  stepOf: { welcome: 'welcome', select: 'select', game: 'game', lose: 'game', rewards: 'rewards', coupon: 'coupon' },
  order: ['welcome', 'select', 'game', 'rewards', 'coupon'],

  init() {
    ['welcome', 'select', 'game', 'lose', 'rewards', 'coupon'].forEach((n) => { this.els[n] = $('#screen-' + n); });
  },
  /** Cambio instantáneo de pantalla (se hace con la cortina cerrada). */
  swap(name) {
    Object.entries(this.els).forEach(([k, el]) => el.classList.toggle('is-active', k === name));
    this.current = name;
    document.body.dataset.screen = name;
    const idx = this.order.indexOf(this.stepOf[name]);
    $$('#steps li').forEach((li, i) => {
      li.classList.toggle('is-current', i === idx);
      li.classList.toggle('is-done', i < idx);
      if (i === idx) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    this.els[name].scrollTop = 0;
    if (name !== 'game') AudioManager.setScene('menu'); // en el juego la escena la fija Game.setMode
    if (name === 'welcome') Hero.start(); else Hero.stop();
  },
  /** Cambio con transición. `beforeReveal` se ejecuta con la cortina cerrada. */
  async go(name, { beforeReveal } = {}) {
    if (this.busy) return false;
    this.busy = true;
    await Wipe.cover();
    this.swap(name);
    if (beforeReveal) beforeReveal();
    await Wipe.reveal();
    this.busy = false;
    return true;
  }
};

/* ==========================================================================
   7. Juego: núcleo compartido + 3 modos (Atrapa, Basket, Recoge)
   Cada modo implementa: init, reset(active), layout, start, update(dt,t), stop,
   onKey, onKeyUp, onPause. El núcleo gestiona tiempo, puntos, pausa, victoria y derrota.
   ========================================================================== */
const Game = {
  state: null,
  dom: {},
  modes: {},
  mode: null,
  modeId: 'catch',
  size: { w: 0, h: 0, groundH: 0 },

  register(id, mode) { this.modes[id] = mode; mode.id = id; },
  cfg() { return CONFIG.games[this.modeId]; },

  init() {
    const d = this.dom;
    d.arena = $('#arena'); d.ground = $('#ground');
    d.layers = { catch: $('#items'), basket: $('#basket-layer'), collect: $('#collect-layer') };
    d.score = $('#hud-score'); d.bar = $('#hud-bar'); d.progress = $('#hud-progress');
    d.time = $('#hud-time'); d.ring = $('#hud-ring'); d.timeBox = $('#hud-timebox');
    d.countdown = $('#countdown'); d.countdownNum = $('#countdown-num');
    d.win = $('#overlay-win'); d.lane = $('#kb-lane');
    d.pauseBtn = $('#btn-pause'); d.restartBtn = $('#btn-restart'); d.pauseOv = $('#overlay-pause'); d.hint = $('.kb-hint');

    this.setMode('catch');
    Object.values(this.modes).forEach((m) => m.init(this));
    this.reset();

    // Cursor que cambia al pulsar + onda en el punto del clic
    d.arena.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      d.arena.classList.add('is-down');
      if (this.state.phase === 'playing' && this.mode.ripple) {
        const r = d.arena.getBoundingClientRect();
        Fx.ripple(e.clientX - r.left, e.clientY - r.top);
      }
    });
    const release = () => d.arena.classList.remove('is-down');
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    d.arena.addEventListener('contextmenu', (e) => e.preventDefault());

    d.pauseBtn.addEventListener('click', () => this.pause());
    d.restartBtn.addEventListener('click', () => this.restart());
    $('#btn-restart2').addEventListener('click', () => this.restart());
    $('#btn-resume').addEventListener('click', () => this.resume());
    $('#btn-quit').addEventListener('click', () => goHome());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
    new ResizeObserver(() => this.measure()).observe(d.arena);
    document.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
  },

  /** Elige el modo activo: capa visible, meta, textos y ayuda. */
  setMode(id) {
    const d = this.dom, cfg = CONFIG.games[id];
    this.modeId = id; this.mode = this.modes[id];
    d.arena.dataset.mode = id;
    Object.entries(d.layers).forEach(([k, el]) => { el.hidden = k !== id; });
    $$('[data-bind="target"]').forEach((el) => { el.textContent = cfg.target; });
    d.progress.setAttribute('aria-valuemax', cfg.target);
    d.hint.textContent = this.mode ? this.mode.hint : '';
    AudioManager.setScene(id); // cada juego tiene su propia música
  },

  /** Deja TODO en estado inicial: tiempo, puntos, objetos, dificultad y temporizadores. */
  reset() {
    const s = this.state;
    if (s && s.raf) cancelAnimationFrame(s.raf);
    Timers.clearAll();
    Confetti.stop();
    Fx.clear();
    this.state = { phase: 'idle', score: 0, elapsed: 0, bonus: 0, final: false, last: 0, raf: 0 };
    const d = this.dom;
    d.win.hidden = true; d.countdown.hidden = true; d.lane.hidden = true;
    d.pauseOv.hidden = true; d.pauseBtn.hidden = d.restartBtn.hidden = true; d.arena.classList.remove('is-down');
    d.timeBox.classList.remove('is-urgent');
    this.measure();
    Object.values(this.modes).forEach((m) => m.reset(m === this.mode));
    this.updateScore(false);
    this.updateTime();
  },

  measure() {
    const a = this.dom.arena;
    if (!a.clientWidth) return;
    this.size = { w: a.clientWidth, h: a.clientHeight, groundH: this.dom.ground.offsetHeight };
    a.style.setProperty('--ground-h', this.size.groundH + 'px');
    if (this.mode) this.mode.layout();
  },

  /* ----- flujo ----- */
  async start(id) {
    if (Screens.busy) return;
    const mode = id || this.modeId;
    const ok = await Screens.go('game', { beforeReveal: () => { this.setMode(mode); this.reset(); } });
    if (ok) this.beginCountdown();
  },

  beginCountdown() {
    const s = this.state, d = this.dom;
    s.phase = 'countdown';
    d.arena.focus({ preventScroll: true });
    let n = CONFIG.game.countdownSec;
    if (n <= 0) return this.beginPlay();
    d.countdown.hidden = false;
    const show = (text) => {
      d.countdownNum.textContent = text;
      if (!reduced()) d.countdownNum.animate([{ transform: 'scale(1.7)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.9,.3,1.3)' });
      AudioManager.sfx('click');
    };
    const tick = () => {
      if (this.state.phase !== 'countdown') return;
      if (n > 0) { show(n); n--; Timers.after(800, tick); }
      else { show('¡YA!'); Timers.after(550, () => { d.countdown.hidden = true; this.beginPlay(); }); }
    };
    tick();
  },

  beginPlay() {
    const s = this.state;
    if (s.phase !== 'countdown') return;
    s.phase = 'playing';
    this.dom.pauseBtn.hidden = this.dom.restartBtn.hidden = false;
    this.mode.start();
    s.last = performance.now();
    s.raf = requestAnimationFrame((t) => this.loop(t));
  },

  /** Reinicia el MISMO juego desde cero (sin cambiar de pantalla). */
  restart() {
    const s = this.state;
    if (Screens.current !== 'game' || Screens.busy || !['playing', 'paused', 'countdown'].includes(s.phase)) return;
    this.halt();
    this.reset();
    AudioManager.setScene(this.modeId);
    AudioManager.sfx('click');
    this.beginCountdown();
  },

  /** Detiene todo sin cambiar de pantalla (se usa al volver al inicio o al selector). */
  halt() {
    const s = this.state;
    if (s.raf) cancelAnimationFrame(s.raf);
    s.raf = 0; s.phase = 'idle';
    Timers.clearAll();
    this.mode.stop();
  },

  pause() {
    const s = this.state;
    if (s.phase !== 'playing') return;
    s.phase = 'paused';
    cancelAnimationFrame(s.raf); s.raf = 0;
    if (this.mode.onPause) this.mode.onPause();
    this.dom.pauseOv.hidden = false; this.dom.pauseBtn.hidden = this.dom.restartBtn.hidden = true;
    this.dom.timeBox.classList.remove('is-urgent');
    $('#btn-resume').focus({ preventScroll: true });
  },
  resume() {
    const s = this.state;
    if (s.phase !== 'paused') return;
    s.phase = 'playing';
    this.dom.pauseOv.hidden = true; this.dom.pauseBtn.hidden = this.dom.restartBtn.hidden = false;
    this.dom.arena.focus({ preventScroll: true });
    s.last = performance.now();
    s.raf = requestAnimationFrame((t) => this.loop(t));
  },

  /* ----- bucle principal (único requestAnimationFrame) ----- */
  loop(now) {
    const s = this.state;
    if (s.phase !== 'playing') return;
    const dt = Math.min((now - s.last) / 1000, 0.25);
    s.last = now;
    s.elapsed += dt;

    const D = this.cfg().duration + s.bonus;
    if (s.elapsed >= D) { s.elapsed = D; this.updateTime(); this.end('lose'); return; }
    this.updateTime();
    this.mode.update(dt, Math.min(1, s.elapsed / D));
    if (s.phase === 'playing') s.raf = requestAnimationFrame((tt) => this.loop(tt));
  },

  /** Suma o resta puntos (nunca baja de 0) y comprueba la victoria. */
  addScore(delta) {
    const s = this.state;
    if (s.phase !== 'playing') return;
    s.score = Math.max(0, s.score + delta);
    this.updateScore(true);
    if (s.score >= this.cfg().target) this.end('win');
  },

  /** Suma segundos al reloj (p. ej. por una racha). */
  addTime(sec) {
    const s = this.state;
    if (s.phase !== 'playing') return;
    s.bonus += sec;
    Fx.popup(this.size.w / 2, 64, `+${sec} s`, 'good');
    AudioManager.sfx('bonus');
    this.updateTime();
    if (!reduced()) this.dom.timeBox.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2)', boxShadow: '0 0 0 6px rgba(80,220,140,.85)' }, { transform: 'scale(1)' }], { duration: 650, easing: 'ease-out' });
  },

  /* ----- fin de partida ----- */
  end(result) {
    const s = this.state;
    if (s.phase !== 'playing') return;
    s.phase = result === 'win' ? 'won' : 'lost';
    cancelAnimationFrame(s.raf); s.raf = 0;
    this.dom.lane.hidden = true; this.dom.pauseBtn.hidden = this.dom.restartBtn.hidden = true;
    this.mode.stop(); // los objetos restantes ya no son interactivos

    if (result === 'win') {
      const rec = $('#win-record');
      if (Best.submit(this.modeId, s.elapsed)) { rec.textContent = `¡Nuevo récord! ${Best.get(this.modeId)} s`; rec.hidden = false; } else { rec.hidden = true; }
      this.dom.win.hidden = false;
      AudioManager.sfx('win');
      Confetti.launch(170);
      Timers.after(CONFIG.game.winCelebrationMs, () => Rewards.open());
    } else {
      AudioManager.sfx('lose');
      Timers.after(500, () => this.showLose());
    }
  },

  showLose() {
    const s = this.state, target = this.cfg().target;
    Screens.go('lose', { beforeReveal: () => {
      $('#lose-score').textContent = s.score;
      const ratio = s.score / target;
      $('#lose-msg').textContent = (CONFIG.texts.loseMessages.find(([max]) => ratio < max) || CONFIG.texts.loseMessages.at(-1))[1];
      const bar = $('#lose-bar'); bar.style.transition = 'none'; bar.style.width = '0%';
      void bar.offsetWidth; bar.style.transition = ''; bar.style.width = Math.min(100, ratio * 100) + '%';
    } });
  },

  /* ----- HUD ----- */
  updateScore(pulse) {
    const s = this.state, d = this.dom, target = this.cfg().target;
    d.score.textContent = s.score;
    d.bar.style.setProperty('--p', Math.min(1, s.score / target));
    d.progress.setAttribute('aria-valuenow', s.score);
    if (pulse && !reduced()) d.score.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 260 });
  },
  updateTime() {
    const s = this.state, d = this.dom, D = this.cfg().duration + s.bonus;
    const remaining = Math.max(0, D - s.elapsed);
    const shown = Math.ceil(remaining - 1e-6);
    if (d.time.textContent !== String(shown)) d.time.textContent = shown;
    d.ring.style.setProperty('--t', (remaining / D).toFixed(4));
    d.timeBox.classList.toggle('is-urgent', remaining <= 10 && s.phase === 'playing');
    // Últimos segundos: cambia a la pista "final" del juego (y vuelve si una racha suma tiempo)
    const fin = remaining <= CONFIG.game.finalSeconds && s.phase === 'playing';
    if (fin !== s.final) { s.final = fin; AudioManager.setScene(this.modeId + (fin ? ':final' : '')); }
  },

  /* ----- teclado ----- */
  onKey(e) {
    const s = this.state;
    if (!s || Screens.current !== 'game') return;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (s.phase === 'playing') { e.preventDefault(); this.pause(); }
      else if (s.phase === 'paused') { e.preventDefault(); this.resume(); }
      return;
    }
    if (s.phase !== 'playing') return;
    if (this.mode.onKey) this.mode.onKey(e);
  },
  onKeyUp(e) {
    if (this.state && Screens.current === 'game' && this.mode.onKeyUp) this.mode.onKeyUp(e);
  }
};

/** ¿La tecla pertenece a un botón o campo? (no se le roban Espacio/Enter) */
const keyOnControl = (e) => !!(e.target.closest && e.target.closest('button, input, a'));

/* --------------------------------------------------------------------------
   MODO 1 · ATRAPA EL POLLO: tocar las piezas que caen
   -------------------------------------------------------------------------- */
const CatchMode = {
  hint: 'Teclado: ← → para moverte · Espacio para atrapar · P para pausar',
  ripple: true,
  items: new Set(), byEl: new Map(), spawnIn: 500, history: [], nextId: 1, kbX: null, itemSize: 72, speedIdx: -1,

  init(game) {
    this.game = game; this.layer = game.dom.layers.catch; this.lane = game.dom.lane;
    // Un solo manejador delegado: pulsar o tocar una pieza
    this.layer.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.item');
      if (!el) return;
      e.preventDefault();
      this.lane.hidden = true;
      const it = this.byEl.get(el);
      if (it) this.catchItem(it);
    });
  },
  reset(active) {
    this.items = new Set(); this.byEl = new Map(); this.layer.replaceChildren();
    this.spawnIn = 500; this.history = []; this.kbX = null; this.lane.hidden = true; this.speedIdx = -1;
    if (active) this.layout();
  },
  layout() {
    const { w, h } = this.game.size;
    if (!w) return;
    this.itemSize = Math.round(clamp(Math.min(w * 0.2, h * 0.17), 66, 108));
    const a = this.game.dom.arena;
    a.style.setProperty('--item-size', this.itemSize + 'px');
    a.style.setProperty('--lane-w', Math.round(this.itemSize * 1.6) + 'px');
    this.items.forEach((it) => { it.x = clamp(it.x, 0, Math.max(0, w - this.itemSize)); });
  },
  start() {},
  onPause() { this.lane.hidden = true; },

  update(dt, t) {
    const { h, groundH } = this.game.size, s = this.game.state;
    this.spawnIn -= dt * 1000;
    if (this.spawnIn <= 0) this.spawn(t);

    const mul = lerp(1, CONFIG.difficulty.speedMultiplierEnd, t) * this.speedStage();
    const floor = h - groundH;
    for (const it of this.items) {
      it.y += it.speed * mul * h * dt;
      it.rot += it.spin * dt;
      const sway = Math.sin(it.phase + s.elapsed * it.swayFreq) * it.swayAmp;
      it.el.style.transform = `translate3d(${(it.x + sway).toFixed(1)}px,${it.y.toFixed(1)}px,0) rotate(${it.rot.toFixed(1)}deg)`;
      if (it.y + this.itemSize * 0.55 >= floor) this.missItem(it); // llegó al final de la zona de juego
    }
  },

  /** Multiplicador de velocidad según la puntuación (speedStages) */
  speedStage() {
    const stages = CONFIG.games.catch.speedStages, score = this.game.state.score;
    let mult = 1, idx = -1;
    stages.forEach((st, i) => { if (score >= st.from) { mult = st.mult; idx = i; } });
    if (idx > this.speedIdx) { Fx.popup(this.game.size.w / 2, 100, '¡Cae más rápido!', 'miss'); AudioManager.sfx('bonus'); }
    this.speedIdx = idx;
    return mult;
  },
  nextInterval(t) {
    const df = CONFIG.difficulty;
    return rand(lerp(df.spawnStartMs[0], df.spawnEndMs[0], t), lerp(df.spawnStartMs[1], df.spawnEndMs[1], t));
  },
  maxItems() {
    const m = CONFIG.games.catch.maxItems;
    return this.game.size.w < CONFIG.game.mobileBreakpoint ? m.mobile : m.desktop;
  },
  pickDef() {
    const defs = Object.values(CONFIG.items), max = CONFIG.difficulty.maxBadStreak;
    const tail = this.history.slice(-max);
    const forceGood = tail.length === max && tail.every((k) => k === 'bad');
    return weightedPick(forceGood ? defs.filter((d) => d.kind === 'good') : defs, (d) => d.weight);
  },
  spawn(t) {
    if (this.items.size >= this.maxItems()) { this.spawnIn = 160; return; }
    this.spawnIn = this.nextInterval(t);
    const { w } = this.game.size, size = this.itemSize;
    const def = this.pickDef();
    this.history.push(def.kind);

    let x = 0; // evita solaparse con piezas recién aparecidas
    for (let tries = 0; tries < 6; tries++) {
      x = rand(6, Math.max(7, w - size - 6));
      if (![...this.items].some((o) => o.y < size * 1.4 && Math.abs(o.x - x) < size * 1.05)) break;
    }

    const el = document.createElement('div');
    el.className = `item item--${def.kind}` + (def.badge ? ' item--special' : '');
    el.appendChild(Assets.art(def.art, def.symbol));
    if (def.badge || def.kind === 'bad') {
      const b = document.createElement('span'); b.className = 'item__badge'; b.textContent = fmtPoints(def.points);
      el.appendChild(b);
    }
    const m = CONFIG.motion, rm = reduced();
    const it = {
      id: this.nextId++, def, el, x, y: -size, rot: rand(-25, 25),
      speed: rand(def.speed[0], def.speed[1]),
      spin: rm ? 0 : rand(m.spin[0], m.spin[1]),
      swayAmp: rm ? 0 : rand(m.swayAmp[0], m.swayAmp[1]),
      swayFreq: rand(1.2, 2.4), phase: rand(0, 6.28), done: false
    };
    el.style.transform = `translate3d(${x}px,${it.y}px,0) rotate(${it.rot}deg)`;
    this.layer.appendChild(el);
    this.items.add(it); this.byEl.set(el, it);
  },

  catchItem(it) {
    const s = this.game.state;
    if (s.phase !== 'playing' || it.done) return; // cada objeto cuenta una sola vez
    it.done = true;
    this.items.delete(it); this.byEl.delete(it.el);
    const def = it.def, cx = it.x + this.itemSize / 2, cy = it.y + this.itemSize / 2;

    const base = it.el.style.transform;
    it.el.animate([{ transform: `${base} scale(1)`, opacity: 1 }, { transform: `${base} scale(1.4)`, opacity: 0 }],
      { duration: 240, easing: 'ease-out' }).onfinish = () => it.el.remove();

    if (def.kind === 'good') {
      Fx.popup(cx, cy, fmtPoints(def.points), 'good'); Fx.burst(cx, cy, 'good', def.points > 1 ? 12 : 8);
      AudioManager.sfx('catch');
    } else {
      Fx.popup(cx, cy, fmtPoints(def.points), 'bad'); Fx.burst(cx, cy, 'bad', 8); Fx.penalty();
      AudioManager.sfx('penalty');
    }
    this.game.addScore(def.points);
  },

  /** La pieza llegó al suelo. Si era pollo, se pierde missPenalty (nunca por debajo de 0). */
  missItem(it) {
    if (it.done) return;
    it.done = true;
    this.items.delete(it); this.byEl.delete(it.el);
    const base = it.el.style.transform;
    it.el.animate([{ transform: `${base} scale(1)`, opacity: 1 }, { transform: `${base} scale(.6)`, opacity: 0 }],
      { duration: 200 }).onfinish = () => it.el.remove();

    const pen = it.def.missPenalty ?? CONFIG.games.catch.missPenalty, { w, h, groundH } = this.game.size;
    if (it.def.kind === 'good' && pen > 0 && this.game.state.phase === 'playing') {
      Fx.popup(clamp(it.x + this.itemSize / 2, 70, Math.max(70, w - 70)), h - groundH - 30, `¡Se escapó! ${fmtPoints(-pen)}`, 'miss');
      Fx.groundHit();
      AudioManager.sfx('miss');
      this.game.addScore(-pen);
    }
  },

  stop() {
    this.lane.hidden = true;
    this.items.forEach((it) => { it.done = true; it.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250 }).onfinish = () => it.el.remove(); });
    this.items.clear(); this.byEl.clear();
  },

  /* teclado: ← → mueven el carril, Espacio/Enter atrapa la pieza más baja del carril */
  onKey(e) {
    const s = this.game.state, size = this.game.size;
    const left = e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A';
    const right = e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D';
    const act = e.key === ' ' || e.key === 'Enter';
    if (!left && !right && !act) return;
    if (act && keyOnControl(e)) return;
    e.preventDefault();

    const lane = this.lane, laneW = this.itemSize * 1.6;
    if (this.kbX === null) this.kbX = size.w / 2;
    if (left || right) {
      this.kbX = clamp(this.kbX + (right ? 1 : -1) * size.w * 0.07, laneW / 2, size.w - laneW / 2);
      lane.hidden = false;
      lane.style.transform = `translateX(${this.kbX - laneW / 2}px)`;
      return;
    }
    if (lane.hidden) { lane.hidden = false; lane.style.transform = `translateX(${this.kbX - laneW / 2}px)`; }
    let best = null;
    this.items.forEach((it) => {
      const cx = it.x + this.itemSize / 2;
      if (Math.abs(cx - this.kbX) <= laneW / 2 + this.itemSize * 0.2 && it.y + this.itemSize > 12 && (!best || it.y > best.y)) best = it;
    });
    if (best && s.phase === 'playing') this.catchItem(best);
  }
};

/* --------------------------------------------------------------------------
   MODO 2 · BASKET: lanzar el pollo al balde (arrastrar hacia atrás y soltar)
   -------------------------------------------------------------------------- */
const BasketMode = {
  hint: 'Arrastra hacia atrás y suelta para lanzar · Teclado: ← → ángulo, ↑ ↓ fuerza, Espacio lanza',
  ripple: false,
  ball: null, wait: 0, drag: null, kb: { angle: 0, power: 0.7, on: false },
  moveK: 0, phase: 0, moving: false, bx: 0, firstBall: true,
  W: 160, sc: 0.8, r: 24, ballSize: 48, rimY: 0, top: 0, openHalf: 56, bodyHalf: 66, bodyH: 110,

  init(game) {
    this.game = game; this.layer = game.dom.layers.basket;
    this.back = mk('div', 'hoop hoop--back'); this.front = mk('div', 'hoop hoop--front');
    if (Assets.has('basketBucket')) { // con tu imagen: una sola pieza delante de la pelota
      this.back.hidden = true;
      this.front.appendChild(Assets.art('basketBucket', 'sym-hoop'));
    } else {
      this.back.appendChild(svgUse('sym-hoop-back'));
      this.front.appendChild(svgUse('sym-hoop-front'));
    }
    this.dots = Array.from({ length: 24 }, () => { const d = mk('span', 'aim-dot'); d.hidden = true; return d; });
    this.hintEl = mk('div', 'aim-hint'); this.hintEl.textContent = '↓ Arrastra hacia atrás y suelta'; this.hintEl.hidden = true;
    this.streakEl = mk('div', 'streak');
    this.streakEl.innerHTML = '<span>RACHA</span><span class="streak__pips"></span><span class="streak__hint"></span>';
    this.pips = [];
    this.layer.append(this.back, this.front, ...this.dots, this.hintEl, this.streakEl);

    game.dom.arena.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', () => this.onUp());
    window.addEventListener('pointercancel', () => this.cancelDrag());
  },

  live() { return this.game.mode === this && this.game.state.phase === 'playing'; },

  /** Indicador de racha: X encestadas seguidas = +N segundos */
  buildStreak() {
    const c = CONFIG.games.basket, box = this.streakEl.querySelector('.streak__pips');
    if (this.pips.length !== c.streakEvery) {
      box.replaceChildren();
      this.pips = Array.from({ length: c.streakEvery }, () => { const p = mk('span', 'streak__pip'); box.appendChild(p); return p; });
    }
    this.streakEl.querySelector('.streak__hint').textContent = `${c.streakEvery} seguidas = +${c.streakSeconds} s`;
  },
  updateStreak() {
    const n = CONFIG.games.basket.streakEvery, lit = this.streak > 0 && this.streak % n === 0 ? n : this.streak % n;
    this.pips.forEach((p, i) => p.classList.toggle('is-on', i < lit));
  },

  reset(active) {
    $$('.ball', this.layer).forEach((n) => n.remove());
    this.ball = null; this.wait = 0.2; this.drag = null;
    this.kb = { angle: 0, power: 0.7, on: false };
    this.moveK = 0; this.phase = 0; this.moving = false; this.firstBall = true; this.streak = 0;
    this.buildStreak(); this.updateStreak();
    this.back.classList.remove('is-moving'); this.front.classList.remove('is-moving');
    this.hideAim(); this.hintEl.hidden = true;
    if (active && this.game.size.w) { this.layout(); this.bx = this.game.size.w / 2; this.placeHoop(); this.newBall(); }
  },

  layout() {
    const { w, h } = this.game.size;
    if (!w) return;
    this.W = clamp(Math.min(w * 0.24, h * 0.30), 110, 200);
    this.sc = this.W / 200;
    this.rimY = h * 0.34;
    this.top = this.rimY - 30 * this.sc;
    this.openHalf = 70 * this.sc; this.bodyHalf = 82 * this.sc; this.bodyH = 138 * this.sc;
    this.ballSize = Math.round(clamp(Math.min(w * 0.12, h * 0.11), 46, 80));
    this.r = this.ballSize / 2;
    [this.back, this.front].forEach((el) => { el.style.width = this.W + 'px'; el.style.height = 170 * this.sc + 'px'; });
    if (!this.bx) this.bx = w / 2;
    this.bx = clamp(this.bx, this.W / 2, w - this.W / 2);
    this.placeHoop();
    if (this.ball && !this.ball.flying) { this.ball.x = clamp(this.ball.x, this.r, w - this.r); this.ball.y = this.floorY() - this.r * 1.15; this.paintBall(); }
  },
  floorY() { const { h, groundH } = this.game.size; return h - groundH; },
  placeHoop() {
    const tr = `translate3d(${(this.bx - this.W / 2).toFixed(1)}px,${this.top.toFixed(1)}px,0)`;
    this.back.style.transform = tr; this.front.style.transform = tr;
  },

  start() {},
  onPause() { this.cancelDrag(); },
  stop() {
    this.cancelDrag();
    if (this.ball) { const el = this.ball.el; el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250 }).onfinish = () => el.remove(); this.ball = null; }
    this.hintEl.hidden = true;
  },

  /* ----- pelota ----- */
  newBall() {
    const { w } = this.game.size, special = Math.random() < this.game.cfg().specialChance;
    const el = mk('div', 'ball' + (special ? ' ball--special' : ''));
    el.style.width = el.style.height = this.ballSize + 'px';
    const art = special ? Assets.art('specialChicken', 'sym-special')
      : (Math.random() < 0.5 ? Assets.art('chickenLeg', 'sym-leg') : Assets.art('chickenWing', 'sym-wing'));
    el.appendChild(art);
    if (special) { const b = mk('span', 'item__badge'); b.textContent = '+' + this.game.cfg().specialPoints; el.appendChild(b); }
    this.layer.appendChild(el);
    let x = rand(w * 0.14, w * 0.86);
    for (let i = 0; i < 8 && Math.abs(x - this.bx) < this.W * 0.9; i++) x = rand(w * 0.14, w * 0.86); // no aparecer justo debajo del balde
    const y = this.floorY() - this.r * 1.15;
    this.ball = { el, x, y, py: y, vx: 0, vy: 0, rot: rand(-20, 20), flying: false, special, t: 0 };
    this.paintBall();
    if (!reduced()) art.animate([{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.9,.3,1.4)' });
    if (this.firstBall) {
      this.hintEl.hidden = false;
      this.hintEl.style.left = clamp(x, 110, Math.max(110, w - 110)) + 'px'; this.hintEl.style.top = Math.max(8, y - this.ballSize * 1.7) + 'px';
    }
  },
  paintBall() {
    const b = this.ball; if (!b) return;
    b.el.style.transform = `translate3d(${(b.x - this.r).toFixed(1)}px,${(b.y - this.r).toFixed(1)}px,0) rotate(${b.rot.toFixed(1)}deg)`;
  },

  /* ----- apuntar ----- */
  vmax() { return this.game.cfg().maxPower * this.game.size.h; },
  pos(e) {
    const a = this.game.dom.arena, r = a.getBoundingClientRect();
    return { x: e.clientX - r.left - a.clientLeft, y: e.clientY - r.top - a.clientTop };
  },
  aimFromDrag() {
    const d = this.drag; if (!d) return null;
    const dx = d.x - d.sx, dy = d.y - d.sy, L = Math.hypot(dx, dy);
    if (L < 14) return null;
    const ux = -dx / L, uy = -dy / L;
    if (uy > -0.15) return null; // el lanzamiento debe ir hacia arriba
    const maxDrag = Math.min(this.game.size.h * 0.3, 200), power = Math.min(1, L / maxDrag);
    return { vx: ux * power * this.vmax(), vy: uy * power * this.vmax() };
  },
  aimFromKb() {
    const a = this.kb.angle * Math.PI / 180, v = this.kb.power * this.vmax();
    return { vx: Math.sin(a) * v, vy: -Math.cos(a) * v };
  },
  showAim(vx, vy) {
    const b = this.ball; if (!b || b.flying) return;
    const n = Math.min(this.dots.length, this.game.cfg().previewPoints), g = this.game.cfg().gravity * this.game.size.h;
    let x = b.x, y = b.y, py = vy;
    this.dots.forEach((dot, i) => {
      if (i >= n) { dot.hidden = true; return; }
      x += vx * 0.05; py += g * 0.05; y += py * 0.05;
      dot.hidden = false;
      dot.style.opacity = (1 - (i / n) * 0.65).toFixed(2);
      dot.style.transform = `translate3d(${(x - 4.5).toFixed(1)}px,${(y - 4.5).toFixed(1)}px,0)`;
    });
  },
  hideAim() { this.dots.forEach((d) => { d.hidden = true; }); },
  cancelDrag() { this.drag = null; this.hideAim(); },

  onDown(e) {
    if (!this.live() || !this.ball || this.ball.flying || e.target.closest('button')) return;
    const p = this.pos(e);
    this.drag = { sx: p.x, sy: p.y, x: p.x, y: p.y };
    this.kb.on = false;
  },
  onMove(e) {
    if (!this.drag || !this.live()) return;
    const p = this.pos(e); this.drag.x = p.x; this.drag.y = p.y;
    const a = this.aimFromDrag();
    if (a) this.showAim(a.vx, a.vy); else this.hideAim();
  },
  onUp() {
    if (!this.drag) return;
    const a = this.live() ? this.aimFromDrag() : null;
    this.cancelDrag();
    if (a) this.throwBall(a.vx, a.vy);
  },

  onKey(e) {
    const k = e.key;
    const L = k === 'ArrowLeft' || k === 'a' || k === 'A', R = k === 'ArrowRight' || k === 'd' || k === 'D';
    const U = k === 'ArrowUp' || k === 'w' || k === 'W', D = k === 'ArrowDown' || k === 's' || k === 'S';
    const act = k === ' ' || k === 'Enter';
    if (!L && !R && !U && !D && !act) return;
    if (act && keyOnControl(e)) return;
    e.preventDefault();
    if (!this.ball || this.ball.flying) return;
    if (act) { const a = this.aimFromKb(); this.kb.on = false; this.cancelDrag(); this.throwBall(a.vx, a.vy); return; }
    if (L) this.kb.angle = clamp(this.kb.angle - 4, -65, 65);
    if (R) this.kb.angle = clamp(this.kb.angle + 4, -65, 65);
    if (U) this.kb.power = clamp(this.kb.power + 0.05, 0.3, 1);
    if (D) this.kb.power = clamp(this.kb.power - 0.05, 0.3, 1);
    this.kb.on = true;
    const a = this.aimFromKb(); this.showAim(a.vx, a.vy);
  },

  throwBall(vx, vy) {
    const b = this.ball;
    if (!b || b.flying) return;
    b.flying = true; b.vx = vx; b.vy = vy; b.t = 0;
    this.firstBall = false; this.hintEl.hidden = true;
    AudioManager.sfx('click');
  },

  /* ----- física ----- */
  update(dt) {
    const g = this.game, s = g.state, cfg = g.cfg(), { w } = g.size;

    // La canasta se mueve cuando faltan los últimos puntos
    if (s.score >= cfg.moveFromScore) {
      if (!this.moving) {
        this.moving = true;
        this.back.classList.add('is-moving'); this.front.classList.add('is-moving');
        Fx.popup(w / 2, this.rimY - this.W * 0.75, '¡La canasta se mueve!', 'good');
      }
    }
    if (this.moving) {
      this.moveK = Math.min(1, this.moveK + dt * 0.8);
      this.phase += dt * cfg.moveSpeed;
      const amp = Math.min(cfg.moveAmp * w, w / 2 - this.W / 2 - 10);
      this.bx = w / 2 + Math.sin(this.phase) * amp * this.moveK;
      this.placeHoop();
    }

    const b = this.ball;
    if (!b) { this.wait -= dt; if (this.wait <= 0) this.newBall(); return; }
    if (!b.flying) return;

    b.t += dt;
    const speed = Math.hypot(b.vx, b.vy), n = clamp(Math.ceil(speed * dt / (this.r * 0.5)), 1, 8), sdt = dt / n;
    for (let i = 0; i < n && this.ball === b; i++) this.stepBall(b, sdt);
    if (this.ball !== b) return;
    this.paintBall();
    if (b.y > this.floorY() + this.r * 0.4 || b.t > 8) this.miss(b);
  },

  stepBall(b, dt) {
    const g = this.game, cfg = g.cfg(), { w, h } = g.size, r = this.r;
    b.py = b.y;
    b.vy += cfg.gravity * h * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.rot += b.vx * dt * 0.35;
    if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx) * 0.6; }
    else if (b.x > w - r) { b.x = w - r; b.vx = -Math.abs(b.vx) * 0.6; }

    // Entró por la boca del balde
    if (b.py < this.rimY && b.y >= this.rimY && b.vy > 0 && Math.abs(b.x - this.bx) <= this.openHalf) { this.score(b); return; }

    // Bordes y fondo del balde (rebote)
    const L = this.bx - this.bodyHalf, R = this.bx + this.bodyHalf, oL = this.bx - this.openHalf, oR = this.bx + this.openHalf;
    const y0 = this.rimY, y1 = this.rimY + this.bodyH;
    this.collide(b, L, y0, oL, y1); this.collide(b, oR, y0, R, y1); this.collide(b, L, y1 - 8 * this.sc, R, y1);
  },

  /** Círculo (pelota) contra rectángulo, con rebote */
  collide(b, x0, y0, x1, y1) {
    const r = this.r, cx = clamp(b.x, x0, x1), cy = clamp(b.y, y0, y1);
    const dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return;
    let nx, ny, pen;
    if (d2 > 1e-6) { const d = Math.sqrt(d2); nx = dx / d; ny = dy / d; pen = r - d; }
    else {
      const l = b.x - x0, rr = x1 - b.x, t = b.y - y0, bt = y1 - b.y, m = Math.min(l, rr, t, bt);
      if (m === t) { nx = 0; ny = -1; pen = t + r; } else if (m === bt) { nx = 0; ny = 1; pen = bt + r; }
      else if (m === l) { nx = -1; ny = 0; pen = l + r; } else { nx = 1; ny = 0; pen = rr + r; }
    }
    b.x += nx * pen; b.y += ny * pen;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) { b.vx -= 1.5 * vn * nx; b.vy -= 1.5 * vn * ny; }
  },

  score(b) {
    const cfg = this.game.cfg(), pts = b.special ? cfg.specialPoints : cfg.normalPoints, r = this.r;
    this.ball = null; this.wait = 0.3;
    const y0 = b.y - r;
    b.el.animate([
      { transform: `translate3d(${b.x - r}px,${y0}px,0) rotate(${b.rot}deg)`, opacity: 1 },
      { transform: `translate3d(${this.bx - r}px,${y0 + this.bodyH * 0.55}px,0) rotate(${b.rot + 40}deg)`, opacity: 0 }
    ], { duration: 320, easing: 'ease-in' }).onfinish = () => b.el.remove();
    Fx.popup(this.bx, this.rimY - 18, fmtPoints(pts), 'good');
    Fx.burst(this.bx, this.rimY, 'good', pts > 1 ? 14 : 9);
    AudioManager.sfx('catch');
    this.streak++; this.updateStreak();
    const bonus = this.streak % cfg.streakEvery === 0;
    this.game.addScore(pts);
    if (bonus) this.game.addTime(cfg.streakSeconds); // racha completada
  },

  miss(b) {
    const pen = this.game.cfg().missPenalty, { w } = this.game.size;
    this.ball = null; this.wait = 0.5;
    this.streak = 0; this.updateStreak();
    b.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).onfinish = () => b.el.remove();
    if (pen > 0) {
      Fx.popup(clamp(b.x, 70, Math.max(70, w - 70)), this.floorY() - 30, `¡Falló! ${fmtPoints(-pen)}`, 'miss');
      Fx.groundHit();
      AudioManager.sfx('miss');
      this.game.addScore(-pen);
    }
  }
};

/* --------------------------------------------------------------------------
   MODO 3 · RECOGE Y ENTREGA: plataformas, saltar y llevar el pollo a los baldes
   -------------------------------------------------------------------------- */
// Plataformas en fracciones del área (x0, x1, y = altura). "spawn" = peso para que aparezca un pollo.
const COLLECT_PLATS = [
  { id: 'floor', x0: 0,    x1: 1,    y: 1,    spawn: 1 },
  { id: 'p1',    x0: 0.06, x1: 0.30, y: 0.76, spawn: 2 },
  { id: 'p2',    x0: 0.70, x1: 0.94, y: 0.76, spawn: 2 },
  { id: 'p3',    x0: 0.36, x1: 0.64, y: 0.60, spawn: 2 },
  { id: 'p4',    x0: 0.03, x1: 0.25, y: 0.44, spawn: 3 },
  { id: 'p5',    x0: 0.75, x1: 0.97, y: 0.44, spawn: 3 },
  { id: 'p6',    x0: 0,    x1: 0.20, y: 0.26, spawn: 0, bucket: 'left' },
  { id: 'p7',    x0: 0.80, x1: 1,    y: 0.26, spawn: 0, bucket: 'right' }
];
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const CollectMode = {
  hint: 'Teclado: ← → para moverte · ↑ o Espacio para saltar · P para pausar',
  ripple: false,
  keys: { left: false, right: false, jump: false },
  chicks: [], plats: [], buckets: [], prev: null, cups: [], cupIn: 4, stageIdx: 0,
  man: { x: 0, y: 0, vx: 0, vy: 0, onGround: false, coyote: 0, jumped: false, face: 1, carry: null },
  ms: 56, mw: 40, mh: 56, cs: 44, bs: 86, H: 400,

  init(game) {
    this.game = game; this.layer = game.dom.layers.collect;
    this.platEls = COLLECT_PLATS.filter((p) => p.id !== 'floor').map((p) => {
      const el = mk('div', 'plat' + (p.bucket ? ' plat--bucket' : '')); this.layer.appendChild(el); return el;
    });
    this.bucketEls = ['left', 'right'].map((side) => {
      const el = mk('div', 'cbucket cbucket--' + side);
      el.appendChild(Assets.art('platformBucket', 'sym-hoop')); this.layer.appendChild(el); return el;
    });
    this.manEl = mk('div', 'man');
    this.manArt = mk('div', 'man__art');
    this.manArt.appendChild(Assets.has('player') ? Assets.art('player') : makeMan());
    this.carryEl = mk('div', 'man__carry'); this.carryEl.hidden = true;
    this.manEl.append(this.manArt, this.carryEl);
    this.layer.appendChild(this.manEl);
    this.buildPad();
  },

  buildPad() {
    const pad = mk('div', 'pad');
    const left = mk('div', 'pad__group'), right = mk('div', 'pad__group');
    const btn = (key, path, label) => {
      const b = mk('button', 'pad__btn'); b.type = 'button'; b.setAttribute('aria-label', label);
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" fill="currentColor"/></svg>`;
      const on = (v) => (e) => { e.preventDefault(); if (v) b.setPointerCapture?.(e.pointerId); this.keys[key] = v; b.classList.toggle('is-on', v); };
      b.addEventListener('pointerdown', on(true));
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => b.addEventListener(ev, on(false)));
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      return b;
    };
    left.append(btn('left', 'M15 4.5l-9 7.5 9 7.5z', 'Mover a la izquierda'), btn('right', 'M9 4.5l9 7.5-9 7.5z', 'Mover a la derecha'));
    right.append(btn('jump', 'M4.5 16l7.5-9 7.5 9z', 'Saltar'));
    pad.append(left, right);
    this.layer.appendChild(pad);
  },

  reset(active) {
    this.chicks.forEach((c) => c.el.remove());
    this.chicks = []; this.prev = null;
    this.clearCups(); this.cupIn = 3 + Math.random() * 2; this.stageIdx = 0;
    this.keys = { left: false, right: false, jump: false };
    $$('.pad__btn', this.layer).forEach((b) => b.classList.remove('is-on'));
    this.man = { x: 0, y: 0, vx: 0, vy: 0, onGround: true, coyote: 0, jumped: false, face: 1, carry: null, hurt: 0 };
    this.carryEl.hidden = true; this.manEl.classList.remove('is-hurt');
    if (active && this.game.size.w) {
      this.layout();
      this.man.x = this.game.size.w / 2 - this.mw / 2;
      this.man.y = this.H - this.mh;
      for (let i = 0; i < this.game.cfg().chickens; i++) this.spawnChick(true);
      this.render();
    }
  },

  layout() {
    const { w, h, groundH } = this.game.size;
    if (!w) return;
    const H = this.H = h - groundH;
    this.ms = clamp(Math.min(w * 0.085, H * 0.14), 46, 84);
    this.mw = this.ms * 0.72; this.mh = this.ms; this.cs = this.ms * 0.8; this.bs = this.ms * 1.55;
    this.plats = COLLECT_PLATS.map((p) => ({ ...p, x0: p.x0 * w, x1: p.x1 * w, top: p.y * H }));

    this.plats.filter((p) => p.id !== 'floor').forEach((p, i) => {
      const el = this.platEls[i];
      el.style.width = (p.x1 - p.x0) + 'px'; el.style.transform = `translate3d(${p.x0}px,${p.top}px,0)`;
    });
    this.buckets = this.plats.filter((p) => p.bucket).map((p, i) => {
      const bw = this.bs, bh = this.bs * 0.85;
      const x = p.bucket === 'left' ? p.x0 + 8 : p.x1 - 8 - bw, y = p.top - bh + 3;
      const el = this.bucketEls[i];
      el.style.width = bw + 'px'; el.style.height = bh + 'px'; el.style.transform = `translate3d(${x}px,${y}px,0)`;
      return { side: p.bucket, x, y, w: bw, h: bh, el };
    });
    this.manEl.style.width = this.manEl.style.height = this.ms + 'px';

    if (this.prev) { // al redimensionar se conserva la posición relativa
      this.man.x *= w / this.prev.w; this.man.y = Math.min(this.man.y * (h / this.prev.h), this.H - this.mh);
    }
    this.prev = { w, h };
    this.chicks.forEach((c) => this.placeChick(c));
  },

  placeChick(c) {
    const p = this.plats[c.p];
    c.x = p.x0 + c.fx * Math.max(0, p.x1 - p.x0 - this.cs); c.y = p.top - this.cs;
    c.el.style.width = c.el.style.height = this.cs + 'px';
    c.el.style.transform = `translate3d(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px,0)`;
  },

  /** Aparece un pollo en un sitio distinto a los demás y lejos del jugador */
  spawnChick(initial) {
    const { w } = this.game.size, m = this.man;
    const cands = this.plats.map((p, i) => ({ i, wgt: p.spawn })).filter((c) => c.wgt > 0);
    let pick = null;
    for (let tries = 0; tries < 12 && !pick; tries++) {
      const c = weightedPick(cands, (x) => x.wgt), fx = rand(0.1, 0.9), p = this.plats[c.i];
      const x = p.x0 + fx * Math.max(0, p.x1 - p.x0 - this.cs), y = p.top - this.cs;
      const farFromOthers = this.chicks.every((o) => Math.hypot(o.x - x, o.y - y) > this.cs * 3);
      const farFromMan = initial || Math.hypot(m.x - x, m.y - y) > this.ms * 2.5;
      if (farFromOthers && farFromMan) pick = { p: c.i, fx };
    }
    if (!pick) { const c = weightedPick(cands, (x) => x.wgt); pick = { p: c.i, fx: rand(0.1, 0.9) }; }

    const wing = Math.random() < 0.5;
    const el = mk('div', 'cchick');
    const inner = mk('div', 'cchick__art');
    inner.appendChild(wing ? Assets.art('chickenWing', 'sym-wing') : Assets.art('chickenLeg', 'sym-leg'));
    el.appendChild(inner);
    this.layer.appendChild(el);
    const chick = { el, p: pick.p, fx: pick.fx, x: 0, y: 0, wing };
    this.chicks.push(chick);
    this.placeChick(chick);
    if (!reduced()) inner.animate([{ transform: 'scale(0) rotate(-40deg)' }, { transform: 'scale(1.2) rotate(8deg)', offset: 0.7 }, { transform: 'scale(1) rotate(0)' }], { duration: 420, easing: 'ease-out' });
  },

  start() {},
  onPause() { this.keys = { left: false, right: false, jump: false }; $$('.pad__btn', this.layer).forEach((b) => b.classList.remove('is-on')); },
  stop() { this.onPause(); this.man.vx = 0; this.manEl.classList.remove('is-walking', 'is-hurt'); this.clearCups(); },

  clearCups() { this.cups.forEach((c) => { c.el.remove(); if (c.warnEl) c.warnEl.remove(); }); this.cups = []; },

  /** De vez en cuando cae un vaso (con aviso). Si te golpea, pierdes puntos. */
  spawnCup() {
    const C = this.game.cfg().cups, st = this.cupStage(), { w } = this.game.size, size = this.ms * 0.75, m = this.man;
    const nearMan = Math.random() < 0.45;
    const x = clamp(nearMan ? m.x + this.mw / 2 + rand(-this.ms * 2.5, this.ms * 2.5) : rand(0, w), size, w - size);
    const el = mk('div', 'ccup'); el.hidden = true;
    el.style.width = el.style.height = size + 'px';
    el.style.transform = `translate3d(${(x - size / 2).toFixed(1)}px,${-size}px,0)`; // posición desde el primer fotograma
    const hz = weightedPick(C.hazards, (x) => x.weight);
    el.appendChild(Assets.art(hz.art, hz.symbol));
    const warnEl = mk('div', 'cwarn'); warnEl.textContent = '!'; warnEl.style.left = x + 'px';
    this.layer.append(el, warnEl);
    this.cups.push({ el, warnEl, x: x - size / 2, y: -size, size, t: 0, state: 'warn', rot: rand(-20, 20), spin: rand(-120, 120), penalty: hz.penalty, speed: C.speed * rand(0.85, 1.25) });
    this.cupIn = rand(st.everyMs[0], st.everyMs[1]) / 1000;
  },
  /** Etapa de vasos según los puntos (más puntos = más vasos) */
  cupStage() {
    const stages = CONFIG.games.collect.cups.stages, score = this.game.state.score;
    let idx = 0;
    stages.forEach((st, i) => { if (score >= st.from) idx = i; });
    return Object.assign({ idx }, stages[idx]);
  },
  updateCups(dt) {
    const C = this.game.cfg().cups, st = this.cupStage(), H = this.H, m = this.man;
    if (st.idx > this.stageIdx) { // pasó a una etapa con más vasos
      this.stageIdx = st.idx;
      this.cupIn = Math.min(this.cupIn, st.everyMs[0] / 1000);
      Fx.popup(this.game.size.w / 2, 100, '¡Caen más objetos!', 'miss');
      AudioManager.sfx('miss');
    }
    this.cupIn -= dt;
    if (this.cupIn <= 0) { if (this.cups.length < st.max) this.spawnCup(); else this.cupIn = 0.5; }
    if (m.hurt > 0) { m.hurt -= dt; if (m.hurt <= 0) this.manEl.classList.remove('is-hurt'); }
    for (const c of [...this.cups]) {
      if (c.state === 'warn') {
        c.t += dt;
        if (c.t >= C.warnMs / 1000) {
          c.state = 'fall'; c.warnEl.remove(); c.warnEl = null;
          c.el.style.transform = `translate3d(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px,0) rotate(${c.rot.toFixed(1)}deg)`; // se coloca ANTES de mostrarlo
          c.el.hidden = false;
        }
        continue;
      }
      c.y += c.speed * H * dt; c.rot += c.spin * dt;
      c.el.style.transform = `translate3d(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px,0) rotate(${c.rot.toFixed(1)}deg)`;
      const hit = m.hurt <= 0 && overlap(
        { x: m.x + this.mw * 0.1, y: m.y + this.mh * 0.1, w: this.mw * 0.8, h: this.mh * 0.8 },
        { x: c.x + c.size * 0.15, y: c.y + c.size * 0.15, w: c.size * 0.7, h: c.size * 0.7 });
      if (hit) { this.hitByCup(c); }
      else if (c.y + c.size >= H) { this.dropCup(c, true); }
    }
  },
  dropCup(c, splash) {
    this.cups.splice(this.cups.indexOf(c), 1);
    if (splash) Fx.burst(c.x + c.size / 2, this.H - 6, 'bad', 6);
    c.el.remove(); if (c.warnEl) c.warnEl.remove();
  },
  hitByCup(c) {
    const pen = c.penalty, m = this.man;
    m.hurt = 1; this.manEl.classList.add('is-hurt');
    Fx.popup(m.x + this.mw / 2, m.y - 8, fmtPoints(-pen), 'bad');
    Fx.burst(c.x + c.size / 2, c.y + c.size / 2, 'bad', 10);
    Fx.penalty();
    AudioManager.sfx('penalty');
    this.dropCup(c, false);
    this.game.addScore(-pen);
  },

  onKey(e) {
    const k = e.key;
    const L = k === 'ArrowLeft' || k === 'a' || k === 'A', R = k === 'ArrowRight' || k === 'd' || k === 'D';
    const J = k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ';
    if (!L && !R && !J) return;
    if (k === ' ' && keyOnControl(e)) return;
    e.preventDefault();
    if (L) this.keys.left = true;
    if (R) this.keys.right = true;
    if (J) this.keys.jump = true;
  },
  onKeyUp(e) {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.keys.left = false;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') this.keys.right = false;
    if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') this.keys.jump = false;
  },

  update(dt) {
    const cfg = this.game.cfg(), { w } = this.game.size, H = this.H, m = this.man, mw = this.mw, mh = this.mh;
    const g = cfg.gravity * H;
    const steps = Math.max(1, Math.ceil(dt / 0.016)), sdt = dt / steps;
    const dir = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    if (dir) m.face = dir;

    for (let i = 0; i < steps; i++) {
      m.vx = dir * cfg.speed * w;
      m.coyote = m.onGround ? 0.09 : m.coyote - sdt;
      if (!this.keys.jump) m.jumped = false;
      if (this.keys.jump && m.coyote > 0 && !m.jumped) {
        m.vy = -Math.sqrt(2 * g * cfg.jumpHeight * H); m.onGround = false; m.coyote = 0; m.jumped = true;
        AudioManager.sfx('click');
      }
      m.vy += g * sdt;
      const prevFeet = m.y + mh;
      m.x = clamp(m.x + m.vx * sdt, 0, w - mw);
      m.y += m.vy * sdt;
      m.onGround = false;
      if (m.vy >= 0) {
        for (const p of this.plats) { // plataformas de un solo sentido: se atraviesan desde abajo
          if (prevFeet <= p.top + 3 && m.y + mh >= p.top && m.x + mw * 0.15 < p.x1 && m.x + mw * 0.85 > p.x0) {
            m.y = p.top - mh; m.vy = 0; m.onGround = true; break;
          }
        }
      }
      if (m.y < -mh * 0.5) { m.y = -mh * 0.5; m.vy = Math.max(0, m.vy); }
    }
    this.interact();
    this.updateCups(dt);
    this.render();
  },

  /** Recoger y dejar son automáticos al acercarse */
  interact() {
    const m = this.man, hit = { x: m.x, y: m.y, w: this.mw, h: this.mh };
    if (!m.carry) {
      for (const c of this.chicks) {
        if (overlap({ x: hit.x - 4, y: hit.y - 4, w: hit.w + 8, h: hit.h + 8 }, { x: c.x, y: c.y, w: this.cs, h: this.cs })) { this.pickUp(c); break; }
      }
    } else {
      for (const b of this.buckets) {
        if (overlap({ x: hit.x - 6, y: hit.y - 6, w: hit.w + 12, h: hit.h + 12 }, { x: b.x, y: b.y, w: b.w, h: b.h })) { this.deliver(b); break; }
      }
    }
  },

  pickUp(c) {
    this.chicks.splice(this.chicks.indexOf(c), 1);
    c.el.remove();
    this.man.carry = { wing: c.wing };
    this.carryEl.replaceChildren(c.wing ? Assets.art('chickenWing', 'sym-wing') : Assets.art('chickenLeg', 'sym-leg'));
    this.carryEl.hidden = false;
    Fx.burst(c.x + this.cs / 2, c.y + this.cs / 2, 'good', 6);
    AudioManager.sfx('click');
  },

  deliver(b) {
    this.man.carry = null; this.carryEl.hidden = true;
    Fx.popup(b.x + b.w / 2, b.y - 6, fmtPoints(this.game.cfg().points), 'good');
    Fx.burst(b.x + b.w / 2, b.y + b.h * 0.2, 'good', 12);
    if (!reduced()) b.el.animate([{ scale: '1' }, { scale: '1.18' }, { scale: '1' }], { duration: 320, easing: 'ease-out' });
    AudioManager.sfx('catch');
    this.spawnChick(false); // siempre vuelve a haber 3 en el mapa
    this.game.addScore(this.game.cfg().points);
  },

  render() {
    const m = this.man, off = (this.ms - this.mw) / 2;
    this.manEl.style.transform = `translate3d(${(m.x - off).toFixed(1)}px,${m.y.toFixed(1)}px,0)`;
    this.manEl.classList.toggle('is-left', m.face < 0);
    this.manEl.classList.toggle('is-walking', m.onGround && Math.abs(m.vx) > 1);
    this.manEl.classList.toggle('is-air', !m.onGround);
  }
};

Game.register('catch', CatchMode);
Game.register('basket', BasketMode);
Game.register('collect', CollectMode);

/** Hombrecito de reserva (SVG con piernas y brazo animables). Se sustituye con assets/images/player.png */
function makeMan() {
  const wrap = document.createElement('div');
  wrap.className = 'man__svg';
  wrap.innerHTML = `<svg viewBox="0 0 60 90" aria-hidden="true" focusable="false">
    <g class="man__legl"><rect x="18" y="58" width="11" height="24" rx="4" fill="#26191A"/><rect x="14" y="78" width="17" height="8" rx="4" fill="#fff" stroke="#26191A" stroke-width="2.5"/></g>
    <g class="man__legr"><rect x="31" y="58" width="11" height="24" rx="4" fill="#26191A"/><rect x="29" y="78" width="17" height="8" rx="4" fill="#fff" stroke="#26191A" stroke-width="2.5"/></g>
    <rect x="13" y="30" width="34" height="34" rx="11" fill="#E4002B" stroke="#26191A" stroke-width="3"/>
    <rect x="13" y="45" width="34" height="9" fill="#fff" stroke="#26191A" stroke-width="2"/>
    <g class="man__arm"><rect x="42" y="33" width="9" height="24" rx="4.5" fill="#E4002B" stroke="#26191A" stroke-width="2.5"/><circle cx="46.5" cy="58" r="5" fill="#F2C08B" stroke="#26191A" stroke-width="2"/></g>
    <circle cx="30" cy="20" r="15" fill="#F2C08B" stroke="#26191A" stroke-width="3"/>
    <path d="M14 18C15 5 45 5 46 18Z" fill="#E4002B" stroke="#26191A" stroke-width="3" stroke-linejoin="round"/>
    <path d="M38 17h14" stroke="#26191A" stroke-width="5" stroke-linecap="round"/>
    <circle cx="36" cy="23" r="2.4" fill="#26191A"/><circle cx="27" cy="23" r="2.4" fill="#26191A"/>
    <path d="M28 30q4 3 8 0" fill="none" stroke="#26191A" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`;
  return wrap;
}

/* ==========================================================================
   8. Tarjetas y cupón
   ========================================================================== */
const Rewards = {
  chosen: -1, prize: null, code: '', cards: [],

  init() {
    this.cards = $$('.prize-card');
    this.cards.forEach((card, i) => card.addEventListener('click', () => this.choose(i)));
  },

  open() { Screens.go('rewards', { beforeReveal: () => this.prepare() }); },

  prepare() {
    this.chosen = -1; this.prize = null; this.code = '';
    this.cards.forEach((c) => {
      c.disabled = false; c.classList.remove('is-flipped', 'is-dimmed');
      c.querySelector('.prize-card__prize-art').replaceChildren();
    });
    $('#rewards-status').textContent = '';
  },

  /** El premio se decide UNA sola vez, al primer toque. */
  choose(i) {
    if (this.chosen !== -1 || Screens.current !== 'rewards' || Screens.busy) return;
    this.chosen = i;
    this.prize = weightedPick(CONFIG.prizes, (p) => p.weight ?? 1);
    this.code = CONFIG.codePrefix + String(randInt(1000, 9999));

    this.cards.forEach((c, j) => { c.disabled = true; c.classList.toggle('is-dimmed', j !== i); });
    const card = this.cards[i], p = this.prize;
    card.querySelector('.prize-card__prize-art').replaceChildren(Assets.art('couponPrize', p.symbol));
    card.querySelector('.prize-card__prize-name').textContent = p.offer === 'COMBO' ? p.name : p.offer;
    card.querySelector('.prize-card__prize-sub').textContent = p.offerSub;
    card.classList.add('is-flipped');
    AudioManager.sfx('reveal');
    $('#rewards-status').textContent = `¡Premio descubierto: ${p.name}!`;

    Timers.after(650, () => Confetti.launch(60));
    Timers.after(2400, () => Coupon.open());
  }
};

const Coupon = {
  scrambleRaf: 0, copyTimer: 0, toastTimer: 0,

  init() {
    $('#btn-copy').addEventListener('click', () => this.copy());
    $('#btn-again').addEventListener('click', () => goSelect());
  },

  open() {
    Screens.go('coupon', {
      beforeReveal: () => this.fill()
    }).then((ok) => { if (ok) { this.scramble(); Confetti.launch(80); } });
  },

  fill() {
    const p = Rewards.prize;
    $('#coupon-name').textContent = p.name;
    $('#coupon-offer').textContent = p.offer;
    $('#coupon-offer-sub').textContent = p.offerSub;
    $('#coupon-art').replaceChildren(Assets.art('couponPrize', p.symbol));
    $('#coupon-code').textContent = Rewards.code;
    $('#copy-fallback').hidden = true;
    this.resetCopyButton();
    $('#ticket').style.animation = 'none'; void $('#ticket').offsetWidth; $('#ticket').style.animation = '';
  },

  /** Efecto de revelado del código: los dígitos "giran" y se fijan de izquierda a derecha. */
  scramble() {
    cancelAnimationFrame(this.scrambleRaf);
    const el = $('#coupon-code'), final = Rewards.code;
    if (reduced()) { el.textContent = final; return; }
    const t0 = performance.now(), total = 800, prefixLen = CONFIG.codePrefix.length;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / total);
      const fixed = Math.floor(k * (final.length - prefixLen));
      let out = final.slice(0, prefixLen + fixed);
      for (let i = out.length; i < final.length; i++) out += randInt(0, 9);
      el.textContent = out;
      if (k < 1) this.scrambleRaf = requestAnimationFrame(step); else el.textContent = final;
    };
    this.scrambleRaf = requestAnimationFrame(step);
  },

  async copy() {
    const code = Rewards.code;
    if (!code) return;
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(code); ok = true; }
    } catch { /* se prueba el método alternativo */ }
    if (!ok) ok = this.legacyCopy(code);

    if (ok) {
      this.markCopied();
    } else {
      this.selectCode();                       // alternativa: seleccionar para copiar a mano
      $('#copy-fallback').hidden = false;
    }
  },
  legacyCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch { return false; }
  },
  selectCode() {
    const range = document.createRange();
    range.selectNodeContents($('#coupon-code'));
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  },
  markCopied() {
    const btn = $('#btn-copy');
    btn.classList.add('is-done');
    $('#btn-copy-label').textContent = CONFIG.texts.copiedLabel;
    $('#ic-copy-use').setAttribute('href', '#ic-check');
    clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => this.resetCopyButton(), 2200);
    const toast = $('#toast');
    toast.textContent = CONFIG.texts.copiedToast; toast.classList.add('is-show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('is-show'), 1800);
  },
  resetCopyButton() {
    $('#btn-copy').classList.remove('is-done');
    $('#btn-copy-label').textContent = CONFIG.texts.copyLabel;
    $('#ic-copy-use').setAttribute('href', '#ic-copy');
  }
};

/* ==========================================================================
   9. Arranque
   ========================================================================== */
/** Vuelve a la portada desde cualquier pantalla (logotipo, "Salir", etc.) y deja el juego limpio. */
function goHome() {
  if (Screens.busy) return;
  if (Screens.current === 'welcome') { Hero.burst(); Hero.next(); Hero.restart(); $('#screen-welcome').scrollTo({ top: 0 }); return; }
  Game.halt();
  Screens.go('welcome', { beforeReveal: () => Game.reset() });
}

/** Pantalla para elegir juego */
function goSelect() {
  if (Screens.busy || Screens.current === 'select') return;
  Game.halt();
  Screens.go('select', { beforeReveal: () => { Game.reset(); Best.render(); } });
}

async function boot() {
  Screens.init();
  await Assets.init();
  await AudioManager.init();
  mountStaticArt();
  bindConfigText();
  renderLegend();
  Wipe.build();
  Fx.init();
  Hero.init();
  Ticker.init();
  GameSelect.init();
  Game.init();
  Rewards.init();
  Coupon.init();

  $('#btn-play').addEventListener('click', () => {
    if (Screens.busy) return;
    AudioManager.unlock();            // primer gesto del usuario: ya se puede reproducir audio
    goSelect();
  });
  $('#btn-retry').addEventListener('click', () => Game.start());
  $('#btn-change').addEventListener('click', () => goSelect());
  $('#btn-home').addEventListener('click', () => goHome());
  $('#brand-home').addEventListener('click', () => goHome());

  // Sonido de clic en todos los botones de interfaz
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.btn');
    if (b && b.id !== 'btn-play') AudioManager.sfx('click');
  });
  window.addEventListener('resize', () => { if (!Screens.busy) Wipe.build(); });

  Screens.swap('welcome');

  // Música automática: primero se intenta al cargar; si el navegador la bloquea, arranca con el primer gesto (toque, clic o tecla)
  AudioManager.autoStart();
  const gestures = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
  const onGesture = (e) => {
    if (e.target.closest && e.target.closest('#player')) return; // los controles del reproductor mandan sobre el arranque automático
    AudioManager.unlock();
    if (AudioManager.isPlaying() || AudioManager.optedOut()) gestures.forEach((g) => document.removeEventListener(g, onGesture, true));
  };
  gestures.forEach((g) => document.addEventListener(g, onGesture, true));

  document.body.classList.remove('is-loading');
  document.body.classList.add('is-ready');
}

document.addEventListener('DOMContentLoaded', boot);
