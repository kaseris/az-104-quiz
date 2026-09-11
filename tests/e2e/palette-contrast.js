// Runs in the renderer so custom properties come from the active CSS theme.
export function paletteContrast() {
  const style = getComputedStyle(document.documentElement);
  const color = (role) => {
    let hex = style.getPropertyValue(`--color-${role}`).trim();
    if (hex.length === 4) hex = '#' + [...hex.slice(1)].map((digit) => digit.repeat(2)).join('');
    return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  };
  const blend = (fg, bg, opacity) => fg.map((value, i) => value * opacity + bg[i] * (1 - opacity));
  const luminance = (rgb) =>
    rgb
      .map((n) => n / 255)
      .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4))
      .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (fg, bg) => {
    const a = luminance(fg),
      b = luminance(bg);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const pairs = [];
  const add = (fg, bg, minimum = 4.5, opacity = 1) =>
    pairs.push({
      foreground: fg,
      background: bg,
      opacity,
      minimum,
      ratio: ratio(blend(color(fg), color(bg), opacity), color(bg)),
    });
  for (const bg of [
    'bg-page',
    'bg-surface',
    'bg-raised',
    'bg-sunken',
    'accent-subtle',
    'success-bg',
    'warning-bg',
    'error-bg',
  ]) {
    for (const fg of ['text-primary', 'text-secondary', 'accent-text']) add(fg, bg);
    add('focus', bg, 3);
  }
  for (const bg of ['accent-solid', 'accent-solid-hover', 'accent-solid-pressed'])
    add('text-on-accent', bg);
  for (const bg of ['bg-surface', 'bg-sunken', 'bg-page']) add('border-control', bg, 3);
  add('accent-border', 'accent-subtle', 3);
  for (const status of ['success', 'warning', 'error']) add(`${status}-text`, `${status}-bg`);
  for (const bg of ['bg-sidebar', 'nav-selected']) {
    add('nav-text', bg);
    add('nav-secondary', bg);
    add('nav-secondary', bg, 3, 0.85);
    add('nav-indicator', bg, 3);
  }
  add('text-primary', 'bg-surface', 4.5, 0.75);
  // Disabled controls are exempt from WCAG contrast; retain their measured values.
  add('text-primary', 'bg-surface', 0, 0.55);
  return pairs;
}
