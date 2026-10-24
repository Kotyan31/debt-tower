/** the look of each floor of the tower */
export interface Theme {
  floorA: string; floorB: string; tile: 'checker' | 'carpet' | 'grid' | 'marble';
  wall: string; wallKind: 'brick' | 'wood' | 'panel' | 'window';
  trim: string; accent: string; light: string; ambient: string; bg: string; felt: string; base: string;
}

export const THEMES: Theme[] = [
  { floorA: '#50544b', floorB: '#3b413c', tile: 'checker', wall: '#6a4e3b', wallKind: 'brick', trim: '#d9b971', accent: '#91bbaa', light: '#f2d4a4', ambient: '#45615e', bg: '#112224', felt: '#477569', base: '#283c39' },
  { floorA: '#652d3e', floorB: '#462639', tile: 'carpet', wall: '#3a2216', wallKind: 'wood', trim: '#e4bc75', accent: '#cb8d8e', light: '#ffd7a0', ambient: '#6a4030', bg: '#21141b', felt: '#386257', base: '#352729' },
  { floorA: '#0e1124', floorB: '#151a36', tile: 'grid', wall: '#121531', wallKind: 'panel', trim: '#00f0ff', accent: '#ff2bd6', light: '#8f80ff', ambient: '#30307a', bg: '#05060f', felt: '#13234d', base: '#151935' },
  { floorA: '#ece6da', floorB: '#ddd4c3', tile: 'marble', wall: '#f3eee4', wallKind: 'window', trim: '#d9aa3f', accent: '#3fb6ff', light: '#fff1d6', ambient: '#a09080', bg: '#1b2235', felt: '#0f4f5e', base: '#efe7d8' },
];

/** room size: x in [-W, W], z in [-D, D]; the two walls stand at x = -W and z = -D */
export const ROOM_W = 12;
export const ROOM_D = 9;
