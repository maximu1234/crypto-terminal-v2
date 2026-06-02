/**
 * @file Shared JSDoc types for Multichart (no runtime exports).
 */

/**
 * @typedef {Object} ChartPoint
 * @property {number} time Unix seconds
 * @property {number} price
 */

/**
 * @typedef {Object} FibLevelRow
 * @property {number} v Ratio 0..1
 * @property {boolean} enabled
 * @property {string} [color] Hex #rrggbb
 * @property {string} [lineStyle] solid | dashed | dotted
 * @property {number} [lineWidth] 1..4
 */

/**
 * @typedef {Object} DrawingShapeBase
 * @property {string} id
 * @property {string} type trendline | fib | channel | hray | long | short
 * @property {string} [color]
 * @property {number} [lineWidth]
 */

/**
 * @typedef {DrawingShapeBase & {
 *   type: 'fib',
 *   p1: ChartPoint,
 *   p2: ChartPoint,
 *   fibLevels: FibLevelRow[],
 *   fibShowTrendLine: boolean
 * }} FibShape
 */

/**
 * @typedef {Object} LocalAlertRow
 * @property {string} id
 * @property {string} symbol
 * @property {string} tf
 * @property {number} price
 * @property {string} [cloudId]
 */

export {};
