// نصيحة بتظهر لصاحب الباقة أول ما يفتح المحرر من موبايل.
//
// ليه: المحرر شغّال على الموبايل فعلاً (كتابة، خطوط، صور، موسيقى)، بس
// الحاجات الدقيقة — السحب بالبكسل وضبط المقاسات — أسهل بكتير على شاشة
// أكبر. بدل ما العميل يكتشف ده بنفسه بعد ما يتنرفز، بنقوله من الأول،
// ونديله طريقة يكمّل بيها على اللابتوب (نسخ اللينك) بضغطة واحدة.
//
// مش حاجز: زرار "أكمل على الموبايل" موجود قدامه، واختياره بيتحفظ.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  Monitor, Smartphone, Check, Copy, MousePointerClick, Type,
  ImageIcon, Music, Move, Sparkles,
} from 'lucide-react';

export const DISMISS_KEY = 'mithaq:editor-bigscreen-hint';

/** الحفظ في localStorage ممكن يرمي (تصفح خاص، مواقع محظور عليها التخزين) */
export function hintDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}
function rememberDismissal() {
  try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* مش مشكلة */ }
}

export default function BigScreenNotice({ onClose }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [dontShow, setDontShow] = useState(true);

  function close() {
    if (dontShow) rememberDismissal();
    onClose();
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2200); },
      () => { /* المتصفح رفض — الزرار بيفضل زي ما هو */ }
    );
  }

  // اللي شغّال تمام على الموبايل — عشان الرسالة ماتبقاش "ارجع بعدين"
  const onPhone = [
    { icon: MousePointerClick, key: 'bigScreen.phone1' },
    { icon: Type, key: 'bigScreen.phone2' },
    { icon: ImageIcon, key: 'bigScreen.phone3' },
    { icon: Music, key: 'bigScreen.phone4' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/70 p-3 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="relative w-full max-w-[440px] overflow-hidden rounded-[26px] border border-brass/35
          bg-gradient-to-b from-[#0d1f18] to-night text-ivory shadow-[0_24px_70px_-24px_rgba(0,0,0,.8)]"
      >
        {/* لمعة خفيفة فوق */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(230,198,132,.18),transparent)]" />

        <div className="relative p-6 pb-5">
          {/* الرسمة: موبايل باهت ← لابتوب لامع */}
          <div className="mb-5 flex items-center justify-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ivory/15 text-ivory/35">
              <Smartphone size={20} />
            </span>
            <span className="flex items-center gap-1 text-brass/60">
              <span className="h-px w-4 bg-brass/40" />
              <Sparkles size={13} />
              <span className="h-px w-4 bg-brass/40" />
            </span>
            <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-brass/50 bg-brass/10 text-brass-soft">
              <Monitor size={26} />
              <span className="absolute inset-0 -z-10 rounded-2xl bg-brass/20 blur-xl" />
            </span>
          </div>

          <h2 className="text-center font-serif text-[19px] font-bold text-brass-soft">
            {t('bigScreen.title')}
          </h2>
          <p className="mt-2.5 text-center text-[13.5px] leading-[1.85] text-ivory/75">
            {t('bigScreen.body')}
          </p>

          {/* اللي شغال على الموبايل */}
          <div className="mt-5 rounded-2xl border border-ivory/12 bg-ivory/[0.04] p-4">
            <p className="mb-3 text-[12px] font-bold text-ivory/55">{t('bigScreen.phoneTitle')}</p>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              {onPhone.map(({ icon: Icon, key }) => (
                <li key={key} className="flex items-start gap-2 text-[12.5px] leading-snug text-ivory/80">
                  <Icon size={13} className="mt-0.5 shrink-0 text-ok" />
                  <span className="min-w-0">{t(key)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3.5 flex items-start gap-2 border-t border-ivory/10 pt-3 text-[12.5px] text-ivory/60">
              <Move size={13} className="mt-0.5 shrink-0 text-brass-soft" />
              <span>{t('bigScreen.laptopBetter')}</span>
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={close}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-l from-brass to-brass-soft
                px-5 py-3 text-[13.5px] font-extrabold text-[#241608] transition hover:brightness-105"
            >
              {t('bigScreen.continue')}
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ivory/20
                px-5 py-2.5 text-[12.5px] font-bold text-ivory/80 transition hover:border-brass/50 hover:text-ivory"
            >
              {copied ? <Check size={13} className="text-ok" /> : <Copy size={13} />}
              {copied ? t('bigScreen.copied') : t('bigScreen.copy')}
            </button>
          </div>

          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 text-[12px] text-ivory/45">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--color-brass)]"
            />
            {t('bigScreen.dontShow')}
          </label>
        </div>
      </motion.div>
    </motion.div>
  );
}
