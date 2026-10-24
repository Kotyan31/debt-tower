import { create } from 'zustand';
import type { Lang } from '../i18n/index.ts';
import { store } from '../net/storage.ts';

export interface Settings { lang: Lang; volume: number; gfx: 'high' | 'low' }

const saved = ((): Partial<Settings> => { try { return JSON.parse(store.get('dt-settings') || '{}'); } catch { return {}; } })();
const guessLang = (): Lang => (/^(ru|uk|be|kk)/i.test(navigator.language || '') ? 'ru' : 'en');
const touchy = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

export const useSettings = create<Settings & { set(p: Partial<Settings>): void }>((set, get) => ({
  lang: saved.lang === 'ru' || saved.lang === 'en' ? saved.lang : guessLang(),
  volume: typeof saved.volume === 'number' ? saved.volume : 0.6,
  gfx: saved.gfx === 'low' || saved.gfx === 'high' ? saved.gfx : touchy ? 'low' : 'high',
  set(p) {
    set(p);
    const { lang, volume, gfx } = get();
    store.set('dt-settings', JSON.stringify({ lang, volume, gfx }));
    document.documentElement.lang = lang;
  },
}));
