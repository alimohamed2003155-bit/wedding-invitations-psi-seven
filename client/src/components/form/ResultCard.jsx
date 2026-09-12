import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  Copy, Check, Crown, Type, ImageIcon, Music, Move, ArrowLeft,
} from 'lucide-react';
import { useGetMeQuery } from '../../store/api.js';
import EditorDemo from '../EditorDemo.jsx';

/**
 * الملاحظة اللي بتظهر بعد ما الدعوة المجانية تخلص.
 *
 * التوقيت مقصود: دي اللحظة الوحيدة اللي العميل شايف فيها دعوته شغالة
 * فعلاً بعينه. قبلها هو مش متأكد إن الموقع هيطلّع حاجة حلوة، وبعدها
 * بيقفل الصفحة ويروح. فالكلام هنا مش إعلان — هو إجابة على السؤال اللي
 * في دماغه دلوقتي بالظبط: "طب أقدر أخليها على مزاجي أكتر من كده؟"
 *
 * ومبنخوّفوش على اللي عمله: أول سطر بيطمّنه إن دعوته المجانية هتفضل
 * شغالة زي ما هي.
 */
function UpgradeNote() {
  const { t } = useTranslation();
  const { data } = useGetMeQuery();
  const user = data?.user ?? null;
  const hasPackage = !!(user && user.subscription && user.subscription.packageId);

  // اللي مشترك بالفعل مالوش لازمة يشوفها
  if (hasPackage) return null;

  const perks = [
    { icon: Type, key: 'upsell.p1' },
    { icon: ImageIcon, key: 'upsell.p2' },
    { icon: Music, key: 'upsell.p3' },
    { icon: Move, key: 'upsell.p4' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.4 }}
      className="relative mt-4 overflow-hidden rounded-[22px] border border-brass/40 bg-gradient-to-b from-[#0d1f18] to-night p-6 text-ivory"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(230,198,132,.16),transparent)]" />

      <div className="relative">
        <p className="mb-3 text-[12px] text-ok">{t('upsell.keepFree')}</p>

        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brass/15 px-3 py-1 text-[11px] font-bold text-brass-soft">
          <Crown size={11} /> {t('upsell.eyebrow')}
        </div>

        <h3 className="font-serif text-[19px] font-bold leading-snug text-ivory">
          {t('upsell.title')}
        </h3>
        <p className="mt-2 text-[13px] leading-[1.85] text-ivory/70">
          {t('upsell.body')}
        </p>

        {/* الفيديو هنا بالذات: هو لسه شايف دعوته اتعملت، فالسؤال اللي
            في دماغه دلوقتي "طب أقدر أعدّل فيها إزاي؟" — وده جوابه */}
        <div className="mt-4">
          <EditorDemo variant="compact" />
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5">
          {perks.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-start gap-2 text-[12.5px] leading-snug text-ivory/85">
              <Icon size={13} className="mt-0.5 shrink-0 text-brass-soft" />
              <span className="min-w-0">{t(key)}</span>
            </li>
          ))}
        </ul>

        <Link
          to="/packages"
          className="group mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-l from-brass to-brass-soft py-3.5 text-[13.5px] font-extrabold text-[#241608] transition hover:brightness-105"
        >
          {t('upsell.cta')}
          <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-1 rtl:rotate-180 rtl:group-hover:translate-x-1" />
        </Link>
        <p className="mt-2.5 text-center text-[11.5px] text-ivory/45">
          {user ? t('upsell.noteMember') : t('upsell.noteGuest')}
        </p>
      </div>
    </motion.div>
  );
}

export default function ResultCard({ path, onReset }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const fullUrl = `${window.location.origin}${path}`;

  function copyLink() {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-7 rounded-[22px] border border-line bg-card p-6.5"
      >
        <h2 className="mb-3 font-serif text-[22px] font-bold text-ok">{t('result.title')}</h2>
        <div className="mb-3.5 flex flex-wrap gap-2">
          <input
            readOnly
            value={fullUrl}
            dir="ltr"
            className="min-w-0 flex-1 rounded-md border border-line px-3 py-2.5 text-left text-sm"
          />
          <button
            type="button"
            onClick={copyLink}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-rose px-4.5 py-2 text-sm text-rose hover:bg-rose/[0.08]"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? t('result.copied') : t('result.copy')}
          </button>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <a href={path} target="_blank" rel="noopener noreferrer" className="text-rose underline">
            {t('result.open')}
          </a>
          <a href={`${path}/stats`} target="_blank" rel="noopener noreferrer" className="text-rose underline">
            {t('result.stats')}
          </a>
          <button type="button" onClick={onReset} className="text-ink-dim underline">
            {t('result.again')}
          </button>
        </div>
      </motion.div>

      <UpgradeNote />
    </>
  );
}
