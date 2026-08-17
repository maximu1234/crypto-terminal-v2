/**
 * Паттерн ГиП — порт детекции из Pine (`Паттерн ГиП/паттерн-гип-индикатор.pine`).
 *
 * Голова и Плечи (шорт, `s_*`) + Inverse H&S (лонг, `l_*`) на свингах RSI.
 * Шорт: t0 (лой) -> t1 -> s1 -> t2 -> s2 -> t3 (хаи). Лонг — зеркало.
 * Два независимых слота: в режиме "Both" оба могут быть активны одновременно.
 *
 * Индексы баров в сцене — индексы массива свечей (аналог Pine `bar_index`).
 * Порядок вычислений внутри бара повторяет порядок блоков в Pine-скрипте:
 * свинг-FSM -> pushSwing -> исход шорта -> исход лонга -> сдвиг t3 (лонг,
 * затем шорт) -> новый паттерн шорт -> новый паттерн лонг.
 */
import { calculateRSI } from "../indicators.js?v=3";

export const PATTERN_GIP_ID = "pattern-gip";

const SWING_CAP = 200;
const ATR_LENGTH = 14;

const SIDE_MODES = ["Short", "Long", "Both"];
const DEPTH_MODES = ["1", "2", "Both"];

// Порядок перебора комбинаций глубин s1/s2 — как в Pine (первое совпадение выигрывает).
const DEPTH_COMBOS = [
  [1, 1],
  [2, 1],
  [1, 2],
  [2, 2]
];

const SWING_HIGH = 1;
const SWING_LOW = -1;

// Статусы слота: 0 — нет паттерна, 1 — активен, 2 — отработан, 3 — невалиден.
const STATUS_NONE = 0;
const STATUS_ACTIVE = 1;
const STATUS_WORKED = 2;
const STATUS_INVALID = 3;

// ── Настройки ────────────────────────────────────────────────────────────────

export function defaultPatternGipSettings() {
  return {
    rsiLength: 14,
    obLevel: 65,
    osLevel: 35,
    sideMode: "Both",
    showDebugSwings: false,
    showPatternLines: false,
    showNeckline: true,
    showOnlyActive: false,
    allowT3Shift: true,
    t0Mode: "Both",
    s1Mode: "Both",
    s2Mode: "Both",
    showBadges: false,
    showMarkers: false,
    atrOff: 0.35,
    invalidTransp: 30,
    s2MaxBeyondX: 5,
    s2MaxToHeadX: 50,
    maxShoulderDiffPct: 100,
    minHeadXAtr: 0,
    colT: "#ffeb3b",
    colS: "#90caf9",
    colPat: "#ffeb3b",
    colPatAlpha: 0.8,
    colNeck: "#ffffff",
    colNeckAlpha: 0.6,
    colWorked: "#66bb6a",
    colDbgH: "#ff5252",
    colDbgHAlpha: 0.3,
    colDbgL: "#ffeb3b",
    colDbgLAlpha: 0.3
  };
}

function finiteOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampNumber(raw, fallback, min, max) {
  const n = finiteOrNull(raw);
  if (n === null) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
}

function clampInt(raw, fallback, min, max) {
  const n = finiteOrNull(raw);
  if (n === null) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(n)));
}

function toBool(raw, fallback) {
  if (typeof raw === "boolean") {
    return raw;
  }
  if (raw === "true" || raw === 1 || raw === "1") {
    return true;
  }
  if (raw === "false" || raw === 0 || raw === "0") {
    return false;
  }
  return fallback;
}

function pickEnum(raw, options, fallback) {
  if (typeof raw !== "string") {
    return fallback;
  }
  if (options.includes(raw)) {
    return raw;
  }
  const lower = raw.toLowerCase();
  const hit = options.find(opt => opt.toLowerCase() === lower);
  return hit || fallback;
}

function normalizeColor(raw, fallback) {
  if (typeof raw !== "string") {
    return fallback;
  }
  const value = raw.trim();
  if (/^#[0-9a-f]{3}$/i.test(value) || /^#[0-9a-f]{6}$/i.test(value)) {
    return value.toLowerCase();
  }
  return fallback;
}

export function normalizePatternGipSettings(raw) {
  const defaults = defaultPatternGipSettings();
  const src = raw && typeof raw === "object" ? raw : {};

  return {
    rsiLength: clampInt(src.rsiLength, defaults.rsiLength, 1, 1000),
    obLevel: clampNumber(src.obLevel, defaults.obLevel, 50, 99),
    osLevel: clampNumber(src.osLevel, defaults.osLevel, 1, 50),
    sideMode: pickEnum(src.sideMode, SIDE_MODES, defaults.sideMode),
    showDebugSwings: toBool(src.showDebugSwings, defaults.showDebugSwings),
    showPatternLines: toBool(src.showPatternLines, defaults.showPatternLines),
    showNeckline: toBool(src.showNeckline, defaults.showNeckline),
    showOnlyActive: toBool(src.showOnlyActive, defaults.showOnlyActive),
    allowT3Shift: toBool(src.allowT3Shift, defaults.allowT3Shift),
    t0Mode: pickEnum(src.t0Mode, DEPTH_MODES, defaults.t0Mode),
    s1Mode: pickEnum(src.s1Mode, DEPTH_MODES, defaults.s1Mode),
    s2Mode: pickEnum(src.s2Mode, DEPTH_MODES, defaults.s2Mode),
    showBadges: toBool(src.showBadges, defaults.showBadges),
    showMarkers: toBool(src.showMarkers, defaults.showMarkers),
    atrOff: clampNumber(src.atrOff, defaults.atrOff, 0, 3),
    invalidTransp: clampInt(src.invalidTransp, defaults.invalidTransp, 0, 90),
    s2MaxBeyondX: clampNumber(src.s2MaxBeyondX, defaults.s2MaxBeyondX, 0, 100),
    s2MaxToHeadX: clampNumber(src.s2MaxToHeadX, defaults.s2MaxToHeadX, 0, 200),
    maxShoulderDiffPct: clampNumber(
      src.maxShoulderDiffPct,
      defaults.maxShoulderDiffPct,
      0,
      100
    ),
    minHeadXAtr: clampNumber(src.minHeadXAtr, defaults.minHeadXAtr, 0, 10),
    colT: normalizeColor(src.colT, defaults.colT),
    colS: normalizeColor(src.colS, defaults.colS),
    colPat: normalizeColor(src.colPat, defaults.colPat),
    colPatAlpha: clampNumber(src.colPatAlpha, defaults.colPatAlpha, 0, 1),
    colNeck: normalizeColor(src.colNeck, defaults.colNeck),
    colNeckAlpha: clampNumber(src.colNeckAlpha, defaults.colNeckAlpha, 0, 1),
    colWorked: normalizeColor(src.colWorked, defaults.colWorked),
    colDbgH: normalizeColor(src.colDbgH, defaults.colDbgH),
    colDbgHAlpha: clampNumber(src.colDbgHAlpha, defaults.colDbgHAlpha, 0, 1),
    colDbgL: normalizeColor(src.colDbgL, defaults.colDbgL),
    colDbgLAlpha: clampNumber(src.colDbgLAlpha, defaults.colDbgLAlpha, 0, 1)
  };
}

// ── RSI / ATR по индексу свечи ───────────────────────────────────────────────

/** RSI приводим к индексам свечей через сопоставление по времени (как в pattern-12). */
function buildRsiByIndex(candles, period) {
  const out = new Array(candles.length).fill(null);
  if (candles.length < period + 1) {
    return out;
  }

  const points = calculateRSI(candles, period);
  const byTime = new Map(points.map(p => [p.time, p.value]));

  for (let i = 0; i < candles.length; i++) {
    out[i] = byTime.get(candles[i].time) ?? null;
  }

  return out;
}

/** ATR(14) по Уайлдеру: первое значение — SMA первых 14 TR, далее RMA (Pine `ta.atr`). */
function buildAtrByIndex(candles, length) {
  const out = new Array(candles.length).fill(null);
  if (candles.length === 0) {
    return out;
  }

  const tr = new Array(candles.length).fill(0);
  for (let i = 0; i < candles.length; i++) {
    const high = finiteOrNull(candles[i].high);
    const low = finiteOrNull(candles[i].low);
    if (high === null || low === null) {
      tr[i] = 0;
      continue;
    }
    if (i === 0) {
      tr[i] = high - low;
      continue;
    }
    const prevClose = finiteOrNull(candles[i - 1].close);
    tr[i] = prevClose === null
      ? high - low
      : Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  }

  if (candles.length < length) {
    return out;
  }

  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += tr[i];
  }
  let value = sum / length;
  out[length - 1] = value;

  for (let i = length; i < candles.length; i++) {
    value = (value * (length - 1) + tr[i]) / length;
    out[i] = value;
  }

  return out;
}

// ── Сцена ────────────────────────────────────────────────────────────────────

function emptyScene(settings) {
  return {
    badges: [],
    markers: [],
    lines: [],
    debugLabels: [],
    atrOff: settings.atrOff,
    lastAtr: null
  };
}

function makeSlot() {
  return {
    status: STATUS_NONE,
    s1Bar: null,
    t2Bar: null,
    s2Bar: null,
    t3Bar: null,
    s1Px: null,
    t2Px: null,
    s2Px: null,
    t3Px: null,
    // Правый конец линии шеи: бар, на котором она последний раз продлевалась
    // (в Pine продление останавливается на баре исхода).
    neckEndBar: null,
    points: null,
    // {bar, price, text, isTop, role: "t" | "s", key, atrAtBar} — общий список для шильдов и точек.
    marks: [],
    skeleton: [],
    s2t3: null
  };
}

function neckYAt(slot, bar) {
  const den = slot.s2Bar - slot.s1Bar;
  if (den === 0) {
    return slot.s2Px;
  }
  return slot.s1Px + ((slot.s2Px - slot.s1Px) * (bar - slot.s1Bar)) / den;
}

function depthAllowed(mode, depth) {
  return mode === "Both" || mode === String(depth);
}

/**
 * Порт детекции ГиП. Возвращает сцену для paint-модуля:
 * { badges, markers, lines, debugLabels, atrOff, lastAtr }.
 */
export function computePatternGipScene(candles, rawSettings) {
  const settings = normalizePatternGipSettings(rawSettings);
  const scene = emptyScene(settings);

  const bars = Array.isArray(candles) ? candles : [];
  if (bars.length < 2) {
    return scene;
  }

  const rsi = buildRsiByIndex(bars, settings.rsiLength);
  const atr = buildAtrByIndex(bars, ATR_LENGTH);
  scene.lastAtr = atr[bars.length - 1];

  // Буфер свингов (аналог swBars / swPrices / swTypes в Pine).
  const swBars = [];
  const swPrices = [];
  const swTypes = [];

  const swBar = i => swBars[i];
  const swPx = i => swPrices[i];
  const swType = i => (i >= 0 && i < swTypes.length ? swTypes[i] : 0);

  function pushSwing(bar, price, type) {
    swBars.push(bar);
    swPrices.push(price);
    swTypes.push(type);
    while (swBars.length > SWING_CAP) {
      swBars.shift();
      swPrices.shift();
      swTypes.shift();
    }
  }

  // Pine-хелперы проверки «коробки»: бары строго после t2Bar и не позже текущего
  // (в Pine это условие `off = bar_index - b >= 0`).
  function barAt(index, upto) {
    if (index < 0 || index > upto || index >= bars.length) {
      return null;
    }
    return bars[index];
  }

  // Шорт: на всём t2->t3 не колоть хай t2; низ s2 — только после бара s2.
  function boxIntact(t2Bar, s2Bar, t3Bar, topPx, botPx, upto) {
    const span = t3Bar - t2Bar;
    if (span <= 0) {
      return true;
    }
    for (let k = 1; k <= span; k++) {
      const b = t2Bar + k;
      const candle = barAt(b, upto);
      if (!candle) {
        continue;
      }
      if (candle.high > topPx) {
        return false;
      }
      if (b > s2Bar && candle.low < botPx) {
        return false;
      }
    }
    return true;
  }

  // Лонг: не колоть лой t2; хай s2 — только после бара s2.
  function boxIntactLong(t2Bar, s2Bar, t3Bar, botPx, topPx, upto) {
    const span = t3Bar - t2Bar;
    if (span <= 0) {
      return true;
    }
    for (let k = 1; k <= span; k++) {
      const b = t2Bar + k;
      const candle = barAt(b, upto);
      if (!candle) {
        continue;
      }
      if (candle.low < botPx) {
        return false;
      }
      if (b > s2Bar && candle.high > topPx) {
        return false;
      }
    }
    return true;
  }

  function noHighAbove(fromBar, toBar, topPx, upto) {
    const span = toBar - fromBar;
    if (span <= 0) {
      return true;
    }
    for (let k = 1; k <= span; k++) {
      const candle = barAt(fromBar + k, upto);
      if (candle && candle.high > topPx) {
        return false;
      }
    }
    return true;
  }

  function noLowBelow(fromBar, toBar, botPx, upto) {
    const span = toBar - fromBar;
    if (span <= 0) {
      return true;
    }
    for (let k = 1; k <= span; k++) {
      const candle = barAt(fromBar + k, upto);
      if (candle && candle.low < botPx) {
        return false;
      }
    }
    return true;
  }

  /** Самый ранний бар t0 из принятых вариантов (t0 / t0'). */
  function earliestT0Bar(combo) {
    let bar = null;
    if (combo.i_t0a >= 0) {
      bar = swBar(combo.i_t0a);
    }
    if (combo.i_t0b >= 0) {
      const b = swBar(combo.i_t0b);
      if (bar === null || b < bar) {
        bar = b;
      }
    }
    return bar;
  }

  // ── SHORT: tryHsCombo (верхний ГиП) ────────────────────────────────────────
  function tryHsCombo(s1Depth, s2Depth, index, slot) {
    const n = swTypes.length;
    if (!(n >= 3 && swType(n - 1) === SWING_HIGH && swType(n - 2) === SWING_LOW)) {
      return null;
    }

    const combo = {
      i_t3: n - 1,
      i_s2: n - 2,
      i_t2: -1,
      i_s1: -1,
      i_t1: -1,
      i_t0a: -1,
      i_t0b: -1,
      i_s1L: -1,
      i_s1H: -1,
      i_s2L: -1,
      i_s2H: -1,
      useT01: false,
      useT02: false
    };

    if (s2Depth === 1) {
      if (n >= 3 && swType(n - 3) === SWING_HIGH) {
        combo.i_t2 = n - 3;
      }
    } else if (
      n >= 5
      && swType(n - 3) === SWING_HIGH
      && swType(n - 4) === SWING_LOW
      && swType(n - 5) === SWING_HIGH
    ) {
      combo.i_s2H = n - 3;
      combo.i_s2L = n - 4;
      combo.i_t2 = n - 5;
    }

    if (combo.i_t2 < 0) {
      return null;
    }

    if (s1Depth === 1) {
      if (
        combo.i_t2 >= 2
        && swType(combo.i_t2 - 1) === SWING_LOW
        && swType(combo.i_t2 - 2) === SWING_HIGH
      ) {
        combo.i_s1 = combo.i_t2 - 1;
        combo.i_t1 = combo.i_t2 - 2;
      }
    } else if (
      combo.i_t2 >= 4
      && swType(combo.i_t2 - 1) === SWING_LOW
      && swType(combo.i_t2 - 2) === SWING_HIGH
      && swType(combo.i_t2 - 3) === SWING_LOW
      && swType(combo.i_t2 - 4) === SWING_HIGH
    ) {
      combo.i_s1 = combo.i_t2 - 1;
      combo.i_s1H = combo.i_t2 - 2;
      combo.i_s1L = combo.i_t2 - 3;
      combo.i_t1 = combo.i_t2 - 4;
    }

    if (combo.i_t1 < 0 || combo.i_s1 < 0) {
      return null;
    }

    const p_t1 = swPx(combo.i_t1);
    const p_s1 = swPx(combo.i_s1);
    const p_t2 = swPx(combo.i_t2);
    const p_s2 = swPx(combo.i_s2);
    const p_t3 = swPx(combo.i_t3);
    const b_t2 = swBar(combo.i_t2);
    const b_s2 = swBar(combo.i_s2);
    const b_t3 = swBar(combo.i_t3);

    const hasLo1 = combo.i_t1 >= 1 && swType(combo.i_t1 - 1) === SWING_LOW;
    const hasLo2 = combo.i_t1 >= 3
      && swType(combo.i_t1 - 3) === SWING_LOW
      && swType(combo.i_t1 - 2) === SWING_HIGH
      && hasLo1;
    const p_lo1 = hasLo1 ? swPx(combo.i_t1 - 1) : null;
    const p_lo2 = hasLo2 ? swPx(combo.i_t1 - 3) : null;

    // 1-й t0: ниже s1. 2-й t0: ниже s1 И ниже 1-го swing low перед t1.
    const t0ok1 = hasLo1 && p_lo1 < p_s1;
    const t0ok2 = hasLo2 && p_lo2 < p_s1 && p_lo2 < p_lo1;
    let startOk = false;

    if (settings.t0Mode === "1") {
      combo.useT01 = t0ok1;
      startOk = t0ok1;
      if (t0ok1) {
        combo.i_t0a = combo.i_t1 - 1;
      }
    } else if (settings.t0Mode === "2") {
      combo.useT02 = t0ok2;
      startOk = t0ok2;
      if (t0ok2) {
        combo.i_t0b = combo.i_t1 - 3;
      }
    } else {
      combo.useT01 = t0ok1;
      combo.useT02 = t0ok2;
      startOk = t0ok1 || t0ok2;
      if (t0ok1) {
        combo.i_t0a = combo.i_t1 - 1;
      }
      if (t0ok2) {
        combo.i_t0b = combo.i_t1 - 3;
      }
    }

    const X = p_t2 - p_s1;
    const headOk = p_t2 > p_t1 && p_t3 < p_t2 && X > 0;
    // Шорт: за шею = ниже s1; к голове = выше s1.
    const neckOk = p_s2 >= p_s1 - X * (settings.s2MaxBeyondX / 100)
      && p_s2 <= p_s1 + X * (settings.s2MaxToHeadX / 100);
    const boxOk = boxIntact(b_t2, b_s2, b_t3, p_t2, p_s2, index);
    // Между t0 и t1 цена не закалывает уровень t1 сверху (берём самый ранний t0).
    const t0BarShort = earliestT0Bar(combo);
    const approachOk = t0BarShort !== null
      && noHighAbove(t0BarShort, swBar(combo.i_t1), p_t1, index);
    // Между t1 и t2 цена не уходит выше головы t2.
    const leftOk = noHighAbove(swBar(combo.i_t1), b_t2, p_t2, index);
    // Между s1 и t2 цена не закалывает уровень s1.
    const neckHoldOk = noLowBelow(swBar(combo.i_s1), b_t2, p_s1, index);
    // Между t2 и s2 цена не перебивает уровень s2.
    const dropToS2Ok = noLowBelow(b_t2, b_s2, p_s2, index);
    const shoulderOk = settings.maxShoulderDiffPct >= 100
      || Math.abs(p_t1 - p_t3) <= X * (settings.maxShoulderDiffPct / 100);
    const atrNow = atr[index];
    const sizeOk = settings.minHeadXAtr <= 0
      || (atrNow !== null && X >= atrNow * settings.minHeadXAtr);
    const sameActive = slot.status === STATUS_ACTIVE
      && b_t2 === slot.t2Bar
      && b_s2 === slot.s2Bar;
    const fresh = !sameActive && (slot.t3Bar === null || b_t3 !== slot.t3Bar);

    const ok = startOk
      && headOk
      && neckOk
      && boxOk
      && approachOk
      && leftOk
      && neckHoldOk
      && dropToS2Ok
      && shoulderOk
      && sizeOk
      && fresh;

    return ok ? combo : null;
  }

  // ── LONG: tryIhsCombo (нижний / Inverse H&S) ───────────────────────────────
  function tryIhsCombo(s1Depth, s2Depth, index, slot) {
    const n = swTypes.length;
    if (!(n >= 3 && swType(n - 1) === SWING_LOW && swType(n - 2) === SWING_HIGH)) {
      return null;
    }

    const combo = {
      i_t3: n - 1,
      i_s2: n - 2,
      i_t2: -1,
      i_s1: -1,
      i_t1: -1,
      i_t0a: -1,
      i_t0b: -1,
      i_s1L: -1,
      i_s1H: -1,
      i_s2L: -1,
      i_s2H: -1,
      useT01: false,
      useT02: false
    };

    if (s2Depth === 1) {
      if (n >= 3 && swType(n - 3) === SWING_LOW) {
        combo.i_t2 = n - 3;
      }
    } else if (
      n >= 5
      && swType(n - 3) === SWING_LOW
      && swType(n - 4) === SWING_HIGH
      && swType(n - 5) === SWING_LOW
    ) {
      // Порядок для скелета: t2 -> mid -> mid -> s2.
      combo.i_s2L = n - 4;
      combo.i_s2H = n - 3;
      combo.i_t2 = n - 5;
    }

    if (combo.i_t2 < 0) {
      return null;
    }

    if (s1Depth === 1) {
      if (
        combo.i_t2 >= 2
        && swType(combo.i_t2 - 1) === SWING_HIGH
        && swType(combo.i_t2 - 2) === SWING_LOW
      ) {
        combo.i_s1 = combo.i_t2 - 1;
        combo.i_t1 = combo.i_t2 - 2;
      }
    } else if (
      combo.i_t2 >= 4
      && swType(combo.i_t2 - 1) === SWING_HIGH
      && swType(combo.i_t2 - 2) === SWING_LOW
      && swType(combo.i_t2 - 3) === SWING_HIGH
      && swType(combo.i_t2 - 4) === SWING_LOW
    ) {
      combo.i_s1 = combo.i_t2 - 1;
      combo.i_s1L = combo.i_t2 - 3;
      combo.i_s1H = combo.i_t2 - 2;
      combo.i_t1 = combo.i_t2 - 4;
    }

    if (combo.i_t1 < 0 || combo.i_s1 < 0) {
      return null;
    }

    const p_t1 = swPx(combo.i_t1);
    const p_s1 = swPx(combo.i_s1);
    const p_t2 = swPx(combo.i_t2);
    const p_s2 = swPx(combo.i_s2);
    const p_t3 = swPx(combo.i_t3);
    const b_t2 = swBar(combo.i_t2);
    const b_s2 = swBar(combo.i_s2);
    const b_t3 = swBar(combo.i_t3);

    const hasHi1 = combo.i_t1 >= 1 && swType(combo.i_t1 - 1) === SWING_HIGH;
    const hasHi2 = combo.i_t1 >= 3
      && swType(combo.i_t1 - 3) === SWING_HIGH
      && swType(combo.i_t1 - 2) === SWING_LOW
      && hasHi1;
    const p_hi1 = hasHi1 ? swPx(combo.i_t1 - 1) : null;
    const p_hi2 = hasHi2 ? swPx(combo.i_t1 - 3) : null;

    // 1-й t0: выше s1. 2-й t0: выше s1 И выше 1-го swing high перед t1.
    const t0ok1 = hasHi1 && p_hi1 > p_s1;
    const t0ok2 = hasHi2 && p_hi2 > p_s1 && p_hi2 > p_hi1;
    let startOk = false;

    if (settings.t0Mode === "1") {
      combo.useT01 = t0ok1;
      startOk = t0ok1;
      if (t0ok1) {
        combo.i_t0a = combo.i_t1 - 1;
      }
    } else if (settings.t0Mode === "2") {
      combo.useT02 = t0ok2;
      startOk = t0ok2;
      if (t0ok2) {
        combo.i_t0b = combo.i_t1 - 3;
      }
    } else {
      combo.useT01 = t0ok1;
      combo.useT02 = t0ok2;
      startOk = t0ok1 || t0ok2;
      if (t0ok1) {
        combo.i_t0a = combo.i_t1 - 1;
      }
      if (t0ok2) {
        combo.i_t0b = combo.i_t1 - 3;
      }
    }

    const X = p_s1 - p_t2;
    const headOk = p_t2 < p_t1 && p_t3 > p_t2 && X > 0;
    // Лонг (зеркало): за шею = выше s1; к голове = ниже s1.
    const neckOk = p_s2 >= p_s1 - X * (settings.s2MaxToHeadX / 100)
      && p_s2 <= p_s1 + X * (settings.s2MaxBeyondX / 100);
    const boxOk = boxIntactLong(b_t2, b_s2, b_t3, p_t2, p_s2, index);
    // Между t0 и t1 цена не закалывает уровень t1 снизу (берём самый ранний t0).
    const t0BarLong = earliestT0Bar(combo);
    const approachOk = t0BarLong !== null
      && noLowBelow(t0BarLong, swBar(combo.i_t1), p_t1, index);
    // Между t1 и t2 не закалывать лой головы t2.
    const leftOk = noLowBelow(swBar(combo.i_t1), b_t2, p_t2, index);
    // Между s1 и t2 не закалывать хай шеи s1.
    const neckHoldOk = noHighAbove(swBar(combo.i_s1), b_t2, p_s1, index);
    // Между t2 и s2 не перебивать хай s2.
    const riseToS2Ok = noHighAbove(b_t2, b_s2, p_s2, index);
    const shoulderOk = settings.maxShoulderDiffPct >= 100
      || Math.abs(p_t1 - p_t3) <= X * (settings.maxShoulderDiffPct / 100);
    const atrNow = atr[index];
    const sizeOk = settings.minHeadXAtr <= 0
      || (atrNow !== null && X >= atrNow * settings.minHeadXAtr);
    const sameActive = slot.status === STATUS_ACTIVE
      && b_t2 === slot.t2Bar
      && b_s2 === slot.s2Bar;
    const fresh = !sameActive && (slot.t3Bar === null || b_t3 !== slot.t3Bar);

    const ok = startOk
      && headOk
      && neckOk
      && boxOk
      && approachOk
      && leftOk
      && neckHoldOk
      && riseToS2Ok
      && shoulderOk
      && sizeOk
      && fresh;

    return ok ? combo : null;
  }

  /**
   * Скелет паттерна (Pine drawPatternSkeleton*): t0 -> ... -> t1 -> s1 -> t2 -> s2.
   * Сегменты фиксируются в момент находки, чтобы paint не зависел от буфера свингов.
   */
  function buildSkeleton(combo, anchors) {
    const segments = [];
    const add = (barA, priceA, barB, priceB) => {
      segments.push({ barA, priceA, barB, priceB });
    };

    if (combo.useT02 && combo.i_t0b >= 0 && combo.i_t0a >= 0) {
      const iMid = combo.i_t1 - 2;
      add(swBar(combo.i_t0b), swPx(combo.i_t0b), swBar(iMid), swPx(iMid));
      add(swBar(iMid), swPx(iMid), swBar(combo.i_t0a), swPx(combo.i_t0a));
      add(swBar(combo.i_t0a), swPx(combo.i_t0a), anchors.b_t1, anchors.p_t1);
    } else if (combo.useT02 && combo.i_t0b >= 0) {
      const iMid = combo.i_t1 - 2;
      const iPrev = combo.i_t1 - 1;
      add(swBar(combo.i_t0b), swPx(combo.i_t0b), swBar(iMid), swPx(iMid));
      add(swBar(iMid), swPx(iMid), swBar(iPrev), swPx(iPrev));
      add(swBar(iPrev), swPx(iPrev), anchors.b_t1, anchors.p_t1);
    } else if (combo.useT01 && combo.i_t0a >= 0) {
      add(swBar(combo.i_t0a), swPx(combo.i_t0a), anchors.b_t1, anchors.p_t1);
    }

    if (combo.i_s1L >= 0 && combo.i_s1H >= 0) {
      add(anchors.b_t1, anchors.p_t1, swBar(combo.i_s1L), swPx(combo.i_s1L));
      add(swBar(combo.i_s1L), swPx(combo.i_s1L), swBar(combo.i_s1H), swPx(combo.i_s1H));
      add(swBar(combo.i_s1H), swPx(combo.i_s1H), anchors.b_s1, anchors.p_s1);
    } else {
      add(anchors.b_t1, anchors.p_t1, anchors.b_s1, anchors.p_s1);
    }

    add(anchors.b_s1, anchors.p_s1, anchors.b_t2, anchors.p_t2);

    if (combo.i_s2L >= 0 && combo.i_s2H >= 0) {
      add(anchors.b_t2, anchors.p_t2, swBar(combo.i_s2L), swPx(combo.i_s2L));
      add(swBar(combo.i_s2L), swPx(combo.i_s2L), swBar(combo.i_s2H), swPx(combo.i_s2H));
      add(swBar(combo.i_s2H), swPx(combo.i_s2H), anchors.b_s2, anchors.p_s2);
    } else {
      add(anchors.b_t2, anchors.p_t2, anchors.b_s2, anchors.p_s2);
    }

    return segments;
  }

  /** Записать найденный паттерн в слот (аналог clear* + перерисовки в Pine). */
  function applyPattern(slot, combo, isLong, index) {
    const anchors = {
      b_t1: swBar(combo.i_t1),
      p_t1: swPx(combo.i_t1),
      b_s1: swBar(combo.i_s1),
      p_s1: swPx(combo.i_s1),
      b_t2: swBar(combo.i_t2),
      p_t2: swPx(combo.i_t2),
      b_s2: swBar(combo.i_s2),
      p_s2: swPx(combo.i_s2),
      b_t3: swBar(combo.i_t3),
      p_t3: swPx(combo.i_t3)
    };
    const atrNow = atr[index];

    slot.status = STATUS_ACTIVE;
    slot.s1Bar = anchors.b_s1;
    slot.t2Bar = anchors.b_t2;
    slot.s2Bar = anchors.b_s2;
    slot.t3Bar = anchors.b_t3;
    slot.s1Px = anchors.p_s1;
    slot.t2Px = anchors.p_t2;
    slot.s2Px = anchors.p_s2;
    slot.t3Px = anchors.p_t3;
    slot.neckEndBar = anchors.b_s2;

    const t0a = combo.useT01 && combo.i_t0a >= 0
      ? { bar: swBar(combo.i_t0a), price: swPx(combo.i_t0a) }
      : null;
    const t0b = combo.useT02 && combo.i_t0b >= 0
      ? { bar: swBar(combo.i_t0b), price: swPx(combo.i_t0b) }
      : null;

    slot.points = {
      t0a,
      t0b,
      t1: { bar: anchors.b_t1, price: anchors.p_t1 },
      s1: { bar: anchors.b_s1, price: anchors.p_s1 },
      t2: { bar: anchors.b_t2, price: anchors.p_t2 },
      s2: { bar: anchors.b_s2, price: anchors.p_s2 },
      t3: { bar: anchors.b_t3, price: anchors.p_t3 }
    };

    // Лонг: t0/s1/s2 — хаи (шильд сверху); t1/t2/t3 — лои (снизу). Шорт — зеркало.
    // t0 как шея: short ниже (isTop=false), long выше (isTop=true) — Pine markFixed.
    const topForT = !isLong;
    const topForS = isLong;

    slot.marks = [];
    const addMark = (key, point, text, isTop, role) => {
      slot.marks.push({
        key,
        bar: point.bar,
        price: point.price,
        text,
        isTop,
        role,
        atrAtBar: atrNow
      });
    };

    if (t0a) {
      addMark("t0", t0a, "t0", topForS, "t");
    }
    if (t0b) {
      addMark("t0b", t0b, t0a ? "t0'" : "t0", topForS, "t");
    }
    addMark("t1", slot.points.t1, "t1", topForT, "t");
    addMark("s1", slot.points.s1, "s1", topForS, "s");
    addMark("t2", slot.points.t2, "t2", topForT, "t");
    addMark("s2", slot.points.s2, "s2", topForS, "s");
    addMark("t3", slot.points.t3, "t3", topForT, "t");

    slot.skeleton = buildSkeleton(combo, anchors);
    slot.s2t3 = {
      barA: anchors.b_s2,
      priceA: anchors.p_s2,
      barB: anchors.b_t3,
      priceB: anchors.p_t3
    };
  }

  /** Сдвиг t3 внутри активного слота: обновить точку, шильд и сегмент s2->t3. */
  function shiftT3(slot, eventBar, eventPx, index) {
    slot.t3Bar = eventBar;
    slot.t3Px = eventPx;
    if (slot.points) {
      slot.points.t3 = { bar: eventBar, price: eventPx };
    }
    const mark = slot.marks.find(item => item.key === "t3");
    if (mark) {
      mark.bar = eventBar;
      mark.price = eventPx;
      mark.atrAtBar = atr[index];
    }
    slot.s2t3 = {
      barA: slot.s2Bar,
      priceA: slot.s2Px,
      barB: eventBar,
      priceB: eventPx
    };
  }

  const shortSlot = makeSlot();
  const longSlot = makeSlot();
  const wantShort = settings.sideMode === "Short" || settings.sideMode === "Both";
  const wantLong = settings.sideMode === "Long" || settings.sideMode === "Both";

  // ── Свинг-FSM по RSI + пошаговый прогон слотов ─────────────────────────────
  let laststate = 0;
  let hh = null;
  let ll = null;
  let hhBar = null;
  let llBar = null;

  for (let i = 0; i < bars.length; i++) {
    const candle = bars[i];
    const high = finiteOrNull(candle.high);
    const low = finiteOrNull(candle.low);
    if (high === null || low === null) {
      continue;
    }

    const rsiValue = rsi[i];
    const isOB = rsiValue !== null && rsiValue >= settings.obLevel;
    const isOS = rsiValue !== null && rsiValue <= settings.osLevel;

    let swingHigh = false;
    let swingLow = false;
    let eventBar = null;
    let eventPx = null;

    if (laststate === 2 && isOB) {
      swingLow = true;
      eventBar = llBar;
      eventPx = ll;
      hh = high;
      hhBar = i;
    }

    if (laststate === 1 && isOS) {
      swingHigh = true;
      eventBar = hhBar;
      eventPx = hh;
      ll = low;
      llBar = i;
    }

    if (isOB) {
      if (hh === null || high >= hh) {
        hh = high;
        hhBar = i;
      }
      laststate = 1;
    }

    if (isOS) {
      if (ll === null || low <= ll) {
        ll = low;
        llBar = i;
      }
      laststate = 2;
    }

    // Обновление экстремума в «середине» после зоны (Pine строки 101-107).
    if (laststate === 1 && hh !== null && high >= hh) {
      hh = high;
      hhBar = i;
    }
    if (laststate === 2 && ll !== null && low <= ll) {
      ll = low;
      llBar = i;
    }

    const eventValid = eventBar !== null && eventPx !== null;
    if (!eventValid) {
      swingHigh = false;
      swingLow = false;
    }

    if (swingHigh) {
      pushSwing(eventBar, eventPx, SWING_HIGH);
      if (settings.showDebugSwings) {
        scene.debugLabels.push({
          bar: eventBar,
          price: eventPx,
          text: "H",
          isTop: true,
          color: settings.colDbgH,
          alpha: settings.colDbgHAlpha,
          atrAtBar: atr[i]
        });
      }
    }

    if (swingLow) {
      pushSwing(eventBar, eventPx, SWING_LOW);
      if (settings.showDebugSwings) {
        scene.debugLabels.push({
          bar: eventBar,
          price: eventPx,
          text: "L",
          isTop: false,
          color: settings.colDbgL,
          alpha: settings.colDbgLAlpha,
          atrAtBar: atr[i]
        });
      }
    }

    // Исход шорта: горизонтали s2 / t2 (не наклонная шея), приоритет у «отработан».
    if (shortSlot.status === STATUS_ACTIVE && i > shortSlot.t3Bar) {
      const hitWorked = shortSlot.s2Px !== null && low < shortSlot.s2Px;
      const hitInvalid = shortSlot.t2Px !== null && high > shortSlot.t2Px;
      if (hitWorked) {
        shortSlot.status = STATUS_WORKED;
      } else if (hitInvalid) {
        shortSlot.status = STATUS_INVALID;
      } else if (settings.showNeckline) {
        shortSlot.neckEndBar = i;
      }
    }

    // Исход лонга — зеркало.
    if (longSlot.status === STATUS_ACTIVE && i > longSlot.t3Bar) {
      const hitWorked = longSlot.s2Px !== null && high > longSlot.s2Px;
      const hitInvalid = longSlot.t2Px !== null && low < longSlot.t2Px;
      if (hitWorked) {
        longSlot.status = STATUS_WORKED;
      } else if (hitInvalid) {
        longSlot.status = STATUS_INVALID;
      } else if (settings.showNeckline) {
        longSlot.neckEndBar = i;
      }
    }

    // Сдвиг t3 только пока паттерн активен (порядок как в Pine: лонг, затем шорт).
    let t3ShiftedLong = false;
    let t3ShiftedShort = false;

    if (settings.allowT3Shift && longSlot.status === STATUS_ACTIVE && swingLow) {
      if (
        eventBar > longSlot.t3Bar
        && eventPx < longSlot.t3Px
        && eventPx > longSlot.t2Px
        && boxIntactLong(
          longSlot.t2Bar,
          longSlot.s2Bar,
          eventBar,
          longSlot.t2Px,
          longSlot.s2Px,
          i
        )
      ) {
        shiftT3(longSlot, eventBar, eventPx, i);
        t3ShiftedLong = true;
      }
    }

    if (settings.allowT3Shift && shortSlot.status === STATUS_ACTIVE && swingHigh) {
      if (
        eventBar > shortSlot.t3Bar
        && eventPx > shortSlot.t3Px
        && eventPx < shortSlot.t2Px
        && boxIntact(
          shortSlot.t2Bar,
          shortSlot.s2Bar,
          eventBar,
          shortSlot.t2Px,
          shortSlot.s2Px,
          i
        )
      ) {
        shiftT3(shortSlot, eventBar, eventPx, i);
        t3ShiftedShort = true;
      }
    }

    // Новый SHORT-паттерн на подтверждённом swing high.
    if (wantShort && swingHigh && swTypes.length >= 5 && !t3ShiftedShort) {
      for (const [s1Depth, s2Depth] of DEPTH_COMBOS) {
        if (
          !depthAllowed(settings.s1Mode, s1Depth)
          || !depthAllowed(settings.s2Mode, s2Depth)
        ) {
          continue;
        }
        const combo = tryHsCombo(s1Depth, s2Depth, i, shortSlot);
        if (combo) {
          applyPattern(shortSlot, combo, false, i);
          break;
        }
      }
    }

    // Новый LONG-паттерн на подтверждённом swing low.
    if (wantLong && swingLow && swTypes.length >= 5 && !t3ShiftedLong) {
      for (const [s1Depth, s2Depth] of DEPTH_COMBOS) {
        if (
          !depthAllowed(settings.s1Mode, s1Depth)
          || !depthAllowed(settings.s2Mode, s2Depth)
        ) {
          continue;
        }
        const combo = tryIhsCombo(s1Depth, s2Depth, i, longSlot);
        if (combo) {
          applyPattern(longSlot, combo, true, i);
          break;
        }
      }
    }
  }

  emitSlot(scene, shortSlot, settings);
  emitSlot(scene, longSlot, settings);

  return scene;
}

/**
 * Стили исхода (Pine):
 * • активен — базовые цвета;
 * • отработан — шильды / точки / шея в colWorked, скелет и s2->t3 остаются colPat;
 * • невалиден — всё в базовых цветах с прозрачностью invalidTransp.
 */
function emitSlot(scene, slot, settings) {
  if (slot.status === STATUS_NONE || !slot.points) {
    return;
  }
  if (settings.showOnlyActive && slot.status !== STATUS_ACTIVE) {
    return;
  }

  const worked = slot.status === STATUS_WORKED;
  const invalid = slot.status === STATUS_INVALID;
  const invalidAlpha = 1 - settings.invalidTransp / 100;
  const markAlpha = invalid ? invalidAlpha : 1;

  for (const mark of slot.marks) {
    const baseColor = mark.role === "s" ? settings.colS : settings.colT;
    const color = worked ? settings.colWorked : baseColor;

    if (settings.showBadges) {
      scene.badges.push({
        bar: mark.bar,
        price: mark.price,
        text: mark.text,
        isTop: mark.isTop,
        color,
        alpha: markAlpha,
        atrAtBar: mark.atrAtBar
      });
    }

    if (settings.showMarkers) {
      scene.markers.push({
        bar: mark.bar,
        price: mark.price,
        color,
        alpha: markAlpha
      });
    }
  }

  if (settings.showPatternLines) {
    const patAlpha = invalid ? invalidAlpha : settings.colPatAlpha;
    const segments = slot.s2t3 ? slot.skeleton.concat([slot.s2t3]) : slot.skeleton;
    for (const segment of segments) {
      scene.lines.push({
        barA: segment.barA,
        priceA: segment.priceA,
        barB: segment.barB,
        priceB: segment.priceB,
        color: settings.colPat,
        width: 2,
        dashed: false,
        alpha: patAlpha
      });
    }
  }

  if (settings.showNeckline && slot.s1Bar !== null && slot.s2Bar !== null) {
    const endBar = slot.neckEndBar === null ? slot.s2Bar : slot.neckEndBar;
    let neckAlpha = settings.colNeckAlpha;
    if (worked) {
      neckAlpha = 1;
    } else if (invalid) {
      neckAlpha = invalidAlpha;
    }
    scene.lines.push({
      barA: slot.s1Bar,
      priceA: slot.s1Px,
      barB: endBar,
      priceB: neckYAt(slot, endBar),
      color: worked ? settings.colWorked : settings.colNeck,
      width: 1,
      dashed: true,
      alpha: neckAlpha
    });
  }
}
