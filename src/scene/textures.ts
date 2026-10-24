/* Every picture in the scene is drawn on a canvas at run time: signs, cards, dice, reels, wheels, floors. */
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { type Card, rank, suit, RANKS, SUITS, isRed } from '../core/cards.ts';

const cache = new Map<string, Texture>();

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]): Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  draw(g, w, h);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(...repeat); }
  cache.set(key, t);
  return t;
}

const FONT = '"Russo One", "Rubik", system-ui, sans-serif';
const EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

function rrect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** a glowing neon sign */
export function signTexture(text: string, color: string): Texture {
  return make(`sign|${text}|${color}`, 512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    let size = 64;
    g.font = `${size}px ${FONT}`;
    while (g.measureText(text).width > w - 40 && size > 20) { size -= 2; g.font = `${size}px ${FONT}`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const tw = Math.min(w - 8, g.measureText(text).width + 56);
    rrect(g, (w - tw) / 2, 18, tw, h - 36, 40);
    g.fillStyle = 'rgba(10, 8, 22, .62)'; g.fill();
    g.shadowColor = color; g.shadowBlur = 24;
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2 + 4);
    g.shadowBlur = 6; g.fillStyle = '#fff';
    g.globalAlpha = 0.85;
    g.fillText(text, w / 2, h / 2 + 4);
  });
}

export function cardTexture(c: Card | -1): Texture {
  return make(`card|${c}`, 128, 180, (g, w, h) => {
    rrect(g, 2, 2, w - 4, h - 4, 12);
    if (c < 0) {
      g.fillStyle = '#b3203a'; g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 6; rrect(g, 12, 12, w - 24, h - 24, 8); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.25)';
      for (let y = 20; y < h - 20; y += 14) for (let x = 20 + ((y / 14) % 2) * 7; x < w - 20; x += 14) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
      return;
    }
    g.fillStyle = '#fbf8f1'; g.fill();
    g.fillStyle = isRed(c) ? '#d42a3c' : '#1b1b24';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold 40px ${FONT}`;
    g.fillText(RANKS[rank(c)], 32, 32);
    g.font = '34px serif';
    g.fillText(SUITS[suit(c)], 32, 68);
    g.font = '86px serif';
    g.fillText(SUITS[suit(c)], w / 2 + 10, h / 2 + 22);
  });
}

const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]], 2: [[0.25, 0.25], [0.75, 0.75]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.22], [0.75, 0.22], [0.25, 0.5], [0.75, 0.5], [0.25, 0.78], [0.75, 0.78]],
};
export function diceTexture(n: number): Texture {
  return make(`die|${n}`, 128, 128, (g, w, h) => {
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h);
    g.fillStyle = n === 1 ? '#d42a3c' : '#1b1b24';
    for (const [x, y] of PIPS[n]) { g.beginPath(); g.arc(x * w, y * h, n === 1 ? 16 : 11, 0, 7); g.fill(); }
  });
}

export const SLOT_ICONS = ['🍒', '🍋', '🍇', '🔔', 'BAR', '7', '💎'];
/** Draw the symbols ourselves so an unavailable emoji font cannot leave a blank reel. */
function drawSlotSymbol(g: CanvasRenderingContext2D, symbol: number) {
  const ellipse = (x: number, y: number, rx: number, ry: number, color: string, rotation = 0) => {
    g.fillStyle = color; g.beginPath(); g.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); g.fill();
  };
  const poly = (points: number[][], color: string) => {
    g.fillStyle = color; g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
  };
  if (symbol === 0) {
    g.strokeStyle = '#386942'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath();
    g.moveTo(42, 72); g.quadraticCurveTo(49, 35, 75, 24); g.moveTo(87, 76); g.quadraticCurveTo(79, 43, 75, 24); g.stroke();
    ellipse(85, 29, 18, 8, '#55964c', 0.4);
    ellipse(41, 82, 22, 24, '#a91936'); ellipse(84, 86, 23, 24, '#ca2442');
    ellipse(36, 76, 15, 17, '#e43e52'); ellipse(78, 80, 16, 17, '#f04d5a');
    ellipse(32, 70, 5, 7, '#ffb5a4', 0.5); ellipse(75, 73, 5, 7, '#ffc0a5', 0.5);
  } else if (symbol === 1) {
    ellipse(65, 70, 45, 32, '#d39b20', -0.45); ellipse(62, 64, 43, 30, '#f5ca39', -0.45);
    ellipse(56, 56, 29, 18, '#ffe978', -0.45); ellipse(87, 28, 19, 9, '#4e8845', -0.15);
    poly([[20, 76], [12, 85], [27, 89]], '#e5b52a'); poly([[99, 39], [113, 36], [107, 50]], '#e5b52a');
  } else if (symbol === 2) {
    g.strokeStyle = '#597c3c'; g.lineWidth = 6; g.beginPath(); g.moveTo(64, 37); g.quadraticCurveTo(62, 24, 74, 16); g.stroke();
    ellipse(49, 28, 19, 9, '#63934a', 0.3);
    [[45, 51], [76, 49], [33, 73], [63, 72], [91, 70], [49, 94], [76, 94], [63, 111]].forEach(([x, y], i) => {
      ellipse(x, y, 15, 15, '#482b73'); ellipse(x - 2, y - 3, 12, 12, i % 2 ? '#8150b6' : '#a16bc5'); ellipse(x - 5, y - 7, 3, 3, '#d5b0ee');
    });
  } else if (symbol === 3) {
    ellipse(64, 23, 8, 9, '#c68a28'); ellipse(64, 101, 10, 10, '#b87524');
    g.fillStyle = '#d79c2b'; g.beginPath(); g.moveTo(25, 91); g.quadraticCurveTo(40, 77, 39, 55);
    g.quadraticCurveTo(39, 29, 64, 28); g.quadraticCurveTo(89, 29, 89, 55); g.quadraticCurveTo(88, 77, 103, 91); g.closePath(); g.fill();
    g.fillStyle = '#ffda66'; g.beginPath(); g.moveTo(34, 85); g.quadraticCurveTo(47, 68, 46, 53); g.quadraticCurveTo(47, 37, 63, 36); g.lineTo(61, 85); g.closePath(); g.fill();
    g.fillStyle = '#edb33c'; rrect(g, 20, 87, 88, 12, 6); g.fill();
  } else if (symbol === 4) {
    g.fillStyle = '#202638'; rrect(g, 9, 32, 110, 66, 9); g.fill();
    g.fillStyle = '#e5bd65'; g.fillRect(16, 39, 96, 4); g.fillRect(16, 87, 96, 4);
    g.font = '900 36px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BAR', 64, 66);
  } else if (symbol === 5) {
    g.font = '900 104px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#851c32'; g.fillText('7', 67, 72); g.fillStyle = '#db3650'; g.fillText('7', 63, 68);
  } else {
    poly([[19, 42], [39, 20], [89, 20], [109, 42], [64, 111]], '#2877b5');
    poly([[19, 42], [109, 42], [64, 111]], '#62bde9');
    poly([[39, 20], [89, 20], [79, 42], [49, 42]], '#a8eaff');
    poly([[19, 42], [39, 20], [49, 42]], '#e0f7ff');
    poly([[89, 20], [109, 42], [79, 42]], '#6fc5ec');
    poly([[49, 42], [79, 42], [64, 111]], '#c2f2ff');
    poly([[79, 42], [109, 42], [64, 111]], '#3596cf');
  }
}

/** Seven complete symbol cells, shared by the 3D reels and the panel's sprite sheet. */
export function reelTexture(): Texture {
  return make('reel-v2', 192, 192 * SLOT_ICONS.length, (g, w, h) => {
    g.fillStyle = '#fffdf6'; g.fillRect(0, 0, w, h);
    SLOT_ICONS.forEach((_, i) => {
      g.save(); g.translate(0, i * w); g.scale(w / 128, w / 128); drawSlotSymbol(g, i); g.restore();
    });
  });
}

let reelImage: string | null = null;
export function reelImageUrl() {
  return reelImage ??= (reelTexture().image as HTMLCanvasElement).toDataURL('image/png');
}

export function slotMarqueeTexture(): Texture {
  return make('slots-marquee', 512, 128, (g, w, h) => {
    g.fillStyle = '#202234'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#edc879'; g.lineWidth = 5; rrect(g, 5, 5, w - 10, h - 10, 14); g.stroke();
    g.font = '900 100px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#f5d792'; g.fillText('777', w / 2, h / 2 + 5);
    for (const x of [36, w - 36]) for (const y of [30, 64, 98]) { g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
  });
}

/** a disc split into segments; labels read outward */
export function wheelTexture(key: string, labels: string[], colors: string[], text = '#fff'): Texture {
  return make(`wheel|${key}`, 1024, 1024, (g, w) => {
    const c = w / 2, n = labels.length;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 - Math.PI / n, a1 = a0 + (Math.PI * 2) / n;
      g.beginPath(); g.moveTo(c, c); g.arc(c, c, c - 6, a0, a1); g.closePath();
      g.fillStyle = colors[i % colors.length]; g.fill();
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.stroke();
      g.save(); g.translate(c, c); g.rotate((a0 + a1) / 2);
      g.fillStyle = text; g.textAlign = 'right'; g.textBaseline = 'middle';
      g.font = `${n > 40 ? 30 : n > 24 ? 40 : 56}px ${FONT}`;
      g.fillText(labels[i], c - 30, 0);
      g.restore();
    }
    g.beginPath(); g.arc(c, c, c * 0.18, 0, 7); g.fillStyle = '#1b1b24'; g.fill();
    g.lineWidth = 10; g.strokeStyle = '#ffcb52'; g.beginPath(); g.arc(c, c, c - 6, 0, 7); g.stroke();
  });
}

export function coinTexture(side: 0 | 1): Texture {
  return make(`coin|${side}`, 256, 256, (g, w) => {
    const c = w / 2;
    const grd = g.createRadialGradient(c - 30, c - 30, 10, c, c, c);
    grd.addColorStop(0, '#fff3b0'); grd.addColorStop(1, '#d19a1c');
    g.fillStyle = grd; g.beginPath(); g.arc(c, c, c - 2, 0, 7); g.fill();
    g.strokeStyle = '#a8740e'; g.lineWidth = 10; g.beginPath(); g.arc(c, c, c - 18, 0, 7); g.stroke();
    g.fillStyle = '#8a5c08'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = side === 0 ? `120px ${EMOJI}` : `bold 120px ${FONT}`;
    g.fillText(side === 0 ? '🦅' : '$', c, c + 8);
  });
}

/** floor coverings */
export function floorTexture(kind: string, a: string, b: string): Texture {
  return make(`floor|${kind}|${a}|${b}`, 512, 512, (g, w, h) => {
    g.fillStyle = a; g.fillRect(0, 0, w, h);
    if (kind === 'checker') {
      g.fillStyle = b;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2) g.fillRect(x * 128, y * 128, 128, 128);
      g.fillStyle = 'rgba(0,0,0,.25)';
      for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 30, 3 + Math.random() * 10, Math.random() * 3, 0, 7); g.fill(); }
    } else if (kind === 'carpet') {
      g.strokeStyle = b; g.lineWidth = 10;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.save(); g.translate(x * 128 + 64, y * 128 + 64); g.rotate(Math.PI / 4); g.strokeRect(-40, -40, 80, 80); g.restore(); }
      g.fillStyle = 'rgba(255,203,82,.35)';
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.beginPath(); g.arc(x * 128 + 64, y * 128 + 64, 8, 0, 7); g.fill(); }
    } else if (kind === 'grid') {
      g.strokeStyle = b; g.lineWidth = 4;
      for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
      g.strokeStyle = 'rgba(0,240,255,.35)'; g.lineWidth = 2;
      for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * 256, 0); g.lineTo(i * 256, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 256); g.lineTo(w, i * 256); g.stroke(); }
    } else {
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
        g.fillStyle = (x + y) % 2 ? b : a; g.fillRect(x * 256, y * 256, 256, 256);
        g.strokeStyle = 'rgba(120,110,95,.25)'; g.lineWidth = 2;
        for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x * 256 + Math.random() * 256, y * 256); g.bezierCurveTo(x * 256 + Math.random() * 256, y * 256 + 90, x * 256 + Math.random() * 256, y * 256 + 170, x * 256 + Math.random() * 256, y * 256 + 256); g.stroke(); }
      }
      g.strokeStyle = 'rgba(217,170,63,.6)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); g.beginPath(); g.moveTo(256, 0); g.lineTo(256, h); g.moveTo(0, 256); g.lineTo(w, 256); g.stroke();
    }
  }, [6, 4.5]);
}

export function wallTexture(kind: string, base: string): Texture {
  return make(`wall|${kind}|${base}`, 512, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    if (kind === 'brick') {
      for (let y = 0; y < 8; y++) for (let x = -1; x < 9; x++) {
        const ox = (y % 2) * 32;
        g.fillStyle = `hsl(${10 + Math.random() * 8}, ${35 + Math.random() * 15}%, ${22 + Math.random() * 10}%)`;
        g.fillRect(x * 64 + ox + 2, y * 32 + 2, 60, 28);
      }
    } else if (kind === 'wood') {
      for (let x = 0; x < 8; x++) { g.fillStyle = `hsl(22, 40%, ${14 + Math.random() * 8}%)`; g.fillRect(x * 64, 0, 62, h); }
      g.fillStyle = 'rgba(255,203,82,.5)'; g.fillRect(0, h * 0.62, w, 6);
    } else if (kind === 'panel') {
      g.strokeStyle = 'rgba(0,240,255,.25)'; g.lineWidth = 3;
      for (let x = 0; x < 4; x++) g.strokeRect(x * 128 + 10, 16, 108, h - 32);
    } else {
      g.fillStyle = '#e8e0d0'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1b2235';
      for (let x = 0; x < 4; x++) g.fillRect(x * 128 + 12, 24, 104, h - 60);
      for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,${200 + Math.random() * 55},120,${0.4 + Math.random() * 0.6})`; const x = Math.floor(Math.random() * 4) * 128 + 14 + Math.random() * 100; g.fillRect(x, 120 + Math.random() * 70, 3, 3); }
      g.fillStyle = '#2b3550';
      for (let x = 0; x < 4; x++) for (let b = 0; b < 4; b++) { const bw = 14 + Math.random() * 16, bh = 30 + Math.random() * 70; g.fillRect(x * 128 + 14 + b * 26, h - 36 - bh, bw, bh); }
    }
  }, [3, 1]);
}
