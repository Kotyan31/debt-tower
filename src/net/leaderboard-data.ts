export interface ScoreRow { id: string; nick: string; days: number; total: number; peak: number; big: number; at: string | number; pend?: boolean }
export type ScoreSort = 'days' | 'peak' | 'big';

export function validRows(value: unknown): ScoreRow[] {
  return Array.isArray(value) ? value.filter((r): r is ScoreRow => !!r && typeof r.id === 'string' && typeof r.nick === 'string'
    && ['days', 'total', 'peak', 'big'].every(k => typeof r[k] === 'number' && Number.isFinite(r[k]) && r[k] >= 0)) : [];
}

export function rankRows(rows: ScoreRow[], sort: ScoreSort) {
  return rows.slice().sort((a, b) => sort === 'days' ? b.days - a.days || b.total - a.total : b[sort] - a[sort] || b.days - a.days).slice(0, 100);
}
