/** the game panel covers the right side on wide screens and the bottom on phones; the camera centres the table in the rest */
export const WIDE = 860;
export const PANEL_W = 420;

export function panelInset(w: number, h: number): { right: number; bottom: number } {
  return w >= WIDE ? { right: PANEL_W, bottom: 0 } : { right: 0, bottom: Math.min(h * 0.6, 520) };
}
