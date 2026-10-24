/** the look of each floor of the tower */
export interface Theme {
  floorA: string; floorB: string; tile: 'checker' | 'carpet' | 'grid' | 'marble';
  wall: string; wallKind: 'brick' | 'wood' | 'panel' | 'window';
  trim: string; accent: string; light: string; ambient: string; bg: string; felt: string; base: string;
}

export const THEMES: Theme[] = [
  { floorA: '#3b3f4b', floorB: '#30333d', tile: 'checker', wall: '#6a3b30', wallKind: 'brick', trim: '#ff3d8b', accent: '#2ee6ff', light: '#ffb070', ambient: '#5a4a6a', bg: '#140f1c', felt: '#2f6e4a', base: '#2a2630' },
  { floorA: '#6d1424', floorB: '#5a0f1d', tile: 'carpet', wall: '#3a2216', wallKind: 'wood', trim: '#ffcb52', accent: '#ff6a5a', light: '#ffd7a0', ambient: '#6a4030', bg: '#170b08', felt: '#1d6a43', base: '#2e1a12' },
  { floorA: '#0e1124', floorB: '#151a36', tile: 'grid', wall: '#121531', wallKind: 'panel', trim: '#00f0ff', accent: '#ff2bd6', light: '#8f80ff', ambient: '#30307a', bg: '#05060f', felt: '#13234d', base: '#151935' },
  { floorA: '#ece6da', floorB: '#ddd4c3', tile: 'marble', wall: '#f3eee4', wallKind: 'window', trim: '#d9aa3f', accent: '#3fb6ff', light: '#fff1d6', ambient: '#a09080', bg: '#1b2235', felt: '#0f4f5e', base: '#efe7d8' },
];

/** room size: x in [-W, W], z in [-D, D]; the two walls stand at x = -W and z = -D */
export const ROOM_W = 12;
export const ROOM_D = 9;
