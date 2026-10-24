import { useState } from 'react';
import { useT, fill } from '../i18n/index.ts';
import { useLb, login, logout, canSend } from '../net/leaderboard.ts';
import { deriveAcct, cleanNick, NICK_RE } from '../net/account.ts';

/** nick + password; shown only when results can actually go to the shared table */
export function Account({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const lb = useLb();
  const [nick, setNick] = useState('');
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  if (lb.mode !== 'gh' || !canSend()) return null;
  if (lb.acct) return (
    <div className="acct-in">{fill(t.acct.as, { n: '' })}<b>{lb.acct.nick}</b> · <button className="link" onClick={() => { logout(); setMsg(''); }}>{t.acct.out}</button>{msg && <div className="small good">{msg}</div>}</div>
  );
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = cleanNick(nick);
    if (!NICK_RE.test(n)) { setMsg(t.acct.badNick); return; }
    setBusy(true); setMsg(t.acct.checking);
    const r = await login(n, pass, deriveAcct);
    setBusy(false);
    if (r.ok) { setMsg(r.returning ? fill(t.acct.welcome, { n: r.nick }) : fill(t.acct.claim, { n: r.nick })); setPass(''); }
    else setMsg(t.acct[r.err]);
  };
  return (
    <form className="acct" onSubmit={submit} autoComplete="on">
      <input name="nick" maxLength={20} placeholder={t.acct.nick} autoComplete="username" spellCheck={false} value={nick} onChange={e => setNick(e.target.value)} required />
      <input name="pass" type="password" placeholder={t.acct.pass} autoComplete="current-password" value={pass} onChange={e => setPass(e.target.value)} required />
      <button className="btn sm primary" disabled={busy} type="submit">{t.acct.login}</button>
      <span className="acct-msg">{msg || (compact ? '' : t.acct.why)}</span>
    </form>
  );
}
