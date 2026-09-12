// شاشة الترحيب اللي بتظهر بعد التسجيل على طول.
//
// ليه: لحظة "الحساب اتعمل" هي أكتر لحظة العميل فيها منتبه ومستعد
// يتحرك — ولو سبناه من غير اتجاه، بيقفل الشاشة ويقعد يدوّر هو يعمل
// إيه. فبدل رسالة "أهلًا" فاضية، الشاشة دي بتقوله تلات حاجات: إنه
// وصل صح، إيه اللي يعمله دلوقتي، وإن فيه ناس وراها يكلمهم.
//
// وبتظهر مرة واحدة بس — مش كل ما يفتح الموقع.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  Check, Sparkles, LayoutTemplate, Crown, MessageCircle, X, ArrowLeft,
} from 'lucide-react';

/** الاسم الأول بس — أدفى من الاسم الكامل */
const firstName = (full) => String(full || '').trim().split(/\s+/)[0] || '';

export default function WelcomeModal({ name, onClose }) {
  const { t } = useTranslation();

  const steps = [
    { icon: LayoutTemplate, key: 'welcome.s1', to: '/', primary: true },
    { icon: Crown, key: 'welcome.s2', to: '/packages' },
    { icon: MessageCircle, key: 'welcome.s3', to: '/dashboard' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[210] flex items-end justify-center overflow-y-auto bg-night/75 p-3 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 26 }}
        className="relative my-auto w-full max-w-[440px] overflow-hidden rounded-[26px] border border-brass/35
          bg-gradient-to-b from-[#0d1f18] to-night text-ivory shadow-[0_28px_80px_-28px_rgba(0,0,0,.85)]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(230,198,132,.2),transparent)]" />

        <button
          type="button"
          aria-label={t('auth.close')}
          onClick={onClose}
          className="absolute top-4 end-4 z-10 text-ivory/45 transition hover:text-ivory"
        >
          <X size={18} />
        </button>

        <div className="relative p-6 sm:p-7">
          {/* علامة النجاح */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.12, type: 'spring', stiffness: 300, damping: 18 }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ok/15 text-ok"
          >
            <Check size={26} strokeWidth={3} />
            <span className="absolute h-14 w-14 rounded-full bg-ok/20 blur-xl" />
          </motion.div>

          <div className="mb-1.5 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brass/15 px-3 py-1 text-[11px] font-bold text-brass-soft">
              <Sparkles size={11} /> {t('welcome.eyebrow')}
            </span>
          </div>

          <h2 className="text-center font-serif text-[22px] font-bold leading-snug text-ivory">
            {firstName(name)
              ? t('welcome.titleNamed', { name: firstName(name) })
              : t('welcome.title')}
          </h2>
          <p className="mt-2.5 text-center text-[13.5px] leading-[1.9] text-ivory/70">
            {t('welcome.body')}
          </p>

          {/* الخطوات التلاتة */}
          <div className="mt-5 space-y-2">
            {steps.map(({ icon: Icon, key, to }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.08 }}
              >
                <Link
                  to={to}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-2xl border border-ivory/12 bg-ivory/[0.04] px-4 py-3 transition hover:border-brass/40 hover:bg-ivory/[0.07]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brass/15 text-brass-soft">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] leading-snug text-ivory/85">
                    {t(key)}
                  </span>
                  <ArrowLeft size={14} className="shrink-0 text-ivory/30 rtl:rotate-180" />
                </Link>
              </motion.div>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-full bg-gradient-to-l from-brass to-brass-soft py-3.5 text-[13.5px] font-extrabold text-[#241608] transition hover:brightness-105"
          >
            {t('welcome.cta')}
          </button>

          <p className="mt-3 text-center text-[11.5px] leading-relaxed text-ivory/40">
            {t('welcome.note')}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
