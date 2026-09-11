// شاشة دخول اللوحة.
//
// المفتاح بيتبعت مرة واحدة بس (POST /admin/login) وبعدها كوكي httpOnly
// بيتابع الجلسة — المفتاح نفسه عمره ما بيتخزّن في المتصفح لا في
// localStorage ولا في أي مكان تاني، وحقل الإدخال بيتفضّى بعد النجاح.
import { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Loader2, ShieldAlert } from 'lucide-react';

export default function AdminLogin({ onSuccess }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'كلمة السر غلط.');
        return;
      }
      setKey('');
      onSuccess();
    } catch {
      setError('حصل خطأ في الاتصال، جرّب تاني.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-night px-6">
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={submit}
        className="w-full max-w-[360px] rounded-2xl border border-line-lite bg-panel p-7 text-center"
      >
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-brass/15">
          <Lock size={18} className="text-brass" />
        </div>
        <h1 className="mb-1 font-serif text-[19px] font-bold text-ivory">لوحة تحكم ميثاق</h1>
        <p className="mb-6 text-[12.5px] text-ivory/45">ادخل كلمة السر عشان تكمّل.</p>

        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoFocus
          autoComplete="current-password"
          placeholder="كلمة السر"
          className="mb-3 w-full rounded-xl border border-line-lite bg-night/60 px-4 py-3 text-center text-[14px] text-ivory placeholder:text-ivory/30 focus:border-brass/60 focus:outline-none"
        />

        {error && (
          <p className="mb-3 flex items-center justify-center gap-1.5 text-[12.5px] text-error">
            <ShieldAlert size={13} /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !key}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-brass to-brass-soft py-3 text-[14px] font-extrabold text-[#241608] hover:brightness-105 disabled:opacity-50"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          دخول
        </button>
      </motion.form>
    </div>
  );
}
