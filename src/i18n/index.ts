import { ru } from './ru.ts';
import { en } from './en.ts';
import { useSettings } from '../state/settings.ts';

type Widen<T> = T extends string ? string : T extends readonly (infer U)[] ? Widen<U>[] : { [K in keyof T]: Widen<T[K]> };
export type Dict = Widen<typeof ru>;
export type Lang = 'ru' | 'en';
export const DICTS: Record<Lang, Dict> = { ru, en };

/** "{n} items" with vars filled in */
export const fill = (s: string, vars?: Record<string, string | number>) =>
  vars ? s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`)) : s;

export function useT() {
  const lang = useSettings(s => s.lang);
  return DICTS[lang];
}

export const dictNow = () => DICTS[useSettings.getState().lang];

/** $1,234 · $12.5k · $3.2M */
export function money(n: number, lang: Lang = useSettings.getState().lang, compact = false): string {
  const neg = n < 0 ? '−' : '';
  n = Math.abs(n);
  if (compact && n >= 100000) {
    const [v, u] = n >= 1e9 ? [n / 1e9, lang === 'ru' ? ' млрд' : 'B'] : n >= 1e6 ? [n / 1e6, lang === 'ru' ? ' млн' : 'M'] : [n / 1e3, lang === 'ru' ? 'k' : 'k'];
    return `${neg}$${v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0)}${u}`;
  }
  return neg + '$' + Math.floor(n).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US');
}

export const mult = (m: number) => '×' + (m >= 100 ? m.toFixed(0) : m.toFixed(2));
