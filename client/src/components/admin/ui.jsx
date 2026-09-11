// مكوّنات مشتركة للوحة التحكم.
//
// اللوحة بتيمة داكنة عن قصد — مختلفة تمامًا عن الموقع الفاتح اللي
// العملاء بيشوفوه. ده مش شكل بس: بيمنع إنك تلخبط بين تاب اللوحة وتاب
// الموقع وإنت فاتح الاتنين.
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

/** بطاقة قسم */
export function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-line-lite bg-panel ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-lite px-5 py-3.5">
          <div>
            {title && <h2 className="font-serif text-[15.5px] font-bold text-ivory">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[12px] text-ivory/45">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

/** رقم كبير مع عنوانه */
export function StatTile({ icon: Icon, label, value, hint, tone = 'default', delay = 0 }) {
  const tones = {
    default: 'border-line-lite bg-panel text-ivory',
    gold: 'border-brass/40 bg-brass/[0.08] text-brass-soft',
    danger: 'border-error/40 bg-error/[0.08] text-error',
    ok: 'border-ok/40 bg-ok/[0.08] text-ok',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`rounded-2xl border p-4 ${tones[tone] || tones.default}`}
    >
      <div className="flex items-center justify-between">
        {Icon && <Icon size={16} className="opacity-70" />}
        {hint && <span className="text-[11px] opacity-55">{hint}</span>}
      </div>
      <div className="mt-2.5 font-serif text-[27px] font-bold leading-none">{value}</div>
      <div className="mt-1.5 text-[12px] opacity-60">{label}</div>
    </motion.div>
  );
}

/** شارة صغيرة */
export function Badge({ children, tone = 'muted', icon: Icon }) {
  const tones = {
    muted: 'bg-ivory/10 text-ivory/65',
    gold: 'bg-brass/20 text-brass-soft',
    ok: 'bg-ok/20 text-ok',
    danger: 'bg-error/20 text-error',
    warn: 'bg-brass/15 text-brass',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${tones[tone]}`}>
      {Icon && <Icon size={10} />}
      {children}
    </span>
  );
}

/** زرار اللوحة */
export function Btn({ children, tone = 'ghost', size = 'md', loading, icon: Icon, ...rest }) {
  const tones = {
    ghost: 'border border-line-lite text-ivory/75 hover:border-ivory/35 hover:text-ivory',
    gold: 'bg-gradient-to-l from-brass to-brass-soft text-[#241608] hover:brightness-105 font-extrabold',
    ok: 'bg-ok text-[#04170f] hover:brightness-110 font-extrabold',
    danger: 'border border-error/50 text-error hover:bg-error/10',
    solid: 'bg-ivory/10 text-ivory hover:bg-ivory/20',
  };
  const sizes = { sm: 'px-3 py-1.5 text-[11.5px]', md: 'px-4 py-2 text-[12.5px]' };
  return (
    <button
      type="button"
      {...rest}
      disabled={loading || rest.disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-bold transition disabled:opacity-45 ${tones[tone]} ${sizes[size]} ${rest.className || ''}`}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : Icon && <Icon size={13} />}
      {children}
    </button>
  );
}

/** خانة إدخال */
export function Field({ label, hint, ...rest }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-[12px] text-ivory/55">{label}</span>}
      <input
        {...rest}
        className={`rounded-xl border border-line-lite bg-night/60 px-3.5 py-2.5 text-[13.5px] text-ivory placeholder:text-ivory/30 focus:border-brass/60 focus:outline-none ${rest.className || ''}`}
      />
      {hint && <span className="text-[11px] text-ivory/35">{hint}</span>}
    </label>
  );
}

/** جدول بسيط برأس ثابت */
export function Table({ head, children, empty }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b border-line-lite text-start">
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-2.5 py-2.5 text-start text-[11px] font-bold uppercase tracking-wider text-ivory/40">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function Row({ children, onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-line-lite/60 text-ivory/80 ${onClick ? 'cursor-pointer hover:bg-ivory/[0.04]' : ''}`}
    >
      {children}
    </tr>
  );
}

export function Cell({ children, className = '' }) {
  return <td className={`px-2.5 py-3 align-middle ${className}`}>{children}</td>;
}

export function Spinner({ label }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-ivory/45">
      <Loader2 size={15} className="animate-spin" /> {label || 'بيحمّل...'}
    </div>
  );
}

export function Empty({ children }) {
  return <p className="py-8 text-center text-[13px] text-ivory/35">{children}</p>;
}

/** تنسيق التاريخ بالعربي */
export function fmtDate(value, withTime) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/** أرقام بفواصل */
export function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-US');
}

/** مبلغ بعملته */
export function fmtMoney(amount, currency) {
  const label = currency === 'EGP' ? 'ج.م' : '$';
  return `${fmtNum(amount)} ${label}`;
}

/** الفلاتر على شكل أزرار متجاورة */
export function Tabs({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-full border border-line-lite p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-bold transition ${
            value === o.value ? 'bg-brass text-[#241608]' : 'text-ivory/55 hover:text-ivory'
          }`}
        >
          {o.label}
          {typeof o.count === 'number' && (
            <span className={`ms-1.5 ${value === o.value ? 'opacity-70' : 'opacity-45'}`}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** ترقيم الصفحات */
export function Pager({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-ivory/60">
      <Btn size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>السابق</Btn>
      <span>{page} / {pages}</span>
      <Btn size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>التالي</Btn>
    </div>
  );
}
