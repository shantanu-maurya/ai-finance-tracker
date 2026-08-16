/**
 * Chart palette and shared axis/grid styling.
 *
 * The categorical hues below are used in FIXED SLOT ORDER and are never
 * cycled or reassigned by rank - a filter that changes the series count must
 * not repaint the survivors. That ordering is the colorblind-safety
 * mechanism, not a cosmetic choice: it clears the adjacent-pair CVD and
 * normal-vision separation gates against the `#fcfcfb` chart surface these
 * cards render on.
 *
 * Because three of these slots sit below 3:1 contrast on a light surface, the
 * relief rule applies wherever they appear: every chart on this app ships
 * either direct labels or the same data as a visible table.
 */

export const categorical = [
  '#2a78d6', // 1 blue
  '#eb6834', // 2 orange
  '#1baf7a', // 3 aqua
  '#eda100', // 4 yellow
  '#e87ba4', // 5 magenta
  '#008300', // 6 green
  '#4a3aa7', // 7 violet
  '#e34948' // 8 red
];

/** Fixed roles so income is the same blue on every page it appears. */
export const seriesColors = {
  income: categorical[0],
  expense: categorical[1],
  savings: categorical[2]
};

export const chartInk = {
  surface: '#fcfcfb',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  secondary: '#52514e',
  primary: '#0b0b0b'
};

export const status = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b'
};

/**
 * A pie with nine slices is unreadable and would push past the fixed slot
 * list. Everything after the top N folds into a single "Other" slice.
 */
export const foldToOther = (breakdown = [], max = 6) => {
  if (breakdown.length <= max) return breakdown;

  const head = breakdown.slice(0, max);
  const tail = breakdown.slice(max);

  return [
    ...head,
    {
      category: 'Other',
      amount: Math.round(tail.reduce((total, entry) => total + entry.amount, 0) * 100) / 100,
      percentage: Math.round(tail.reduce((total, entry) => total + entry.percentage, 0) * 10) / 10
    }
  ];
};

/** Recessive axis + grid styling, applied identically to every chart. */
export const axisProps = {
  stroke: chartInk.axis,
  tick: { fill: chartInk.muted, fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: chartInk.axis }
};

export const gridProps = {
  stroke: chartInk.grid,
  strokeDasharray: '3 3',
  vertical: false
};
