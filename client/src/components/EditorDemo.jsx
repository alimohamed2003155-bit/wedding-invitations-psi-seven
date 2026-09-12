// فيديو المحرر وهو شغّال — أقوى دليل عندنا على إن المنتج بيعمل إيه.
//
// ليه فيديو أصلاً: العميل مش بيشتري "تحريك النصوص بالسحب" — هو بيشتري
// إحساس إنه شايف نفسه بيعمل كده في تلات ثواني. الكلام بيوصف، الفيديو
// بيوري. وده الفرق بين إنه يقرا المميزات ويمشي، وبينه يقول "أنا عايز
// كده".
//
// الوزن مهم بنفس القد: اللقطة القصيرة (0.5 ميجا) هي اللي بتتحمّل مع
// الصفحة، والنسخة الكاملة مبتتحملش غير لما يضغط عليها بنفسه. والتشغيل
// بيبدأ لما الفيديو يبان في الشاشة بس — مش قبلها.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Play, ArrowLeft, Sparkles, X } from 'lucide-react';

const LOOP_MP4 = '/video/editor-demo-loop.mp4';
const LOOP_WEBM = '/video/editor-demo-loop.webm';
const FULL_MP4 = '/video/editor-demo-full.mp4';
const POSTER = '/video/editor-demo-poster.jpg';

/** إطار متصفح حوالين الفيديو — بيخلي اللقطة تبان إنها من الموقع فعلاً */
function BrowserFrame({ children, dark }) {
  return (
    <div
      className={`overflow-hidden rounded-[16px] border shadow-[0_30px_70px_-30px_rgba(8,19,15,.6)] ${
        dark ? 'border-ivory/15 bg-[#0b1a14]' : 'border-line bg-card'
      }`}
    >
      <div
        className={`flex items-center gap-1.5 border-b px-3 py-2 ${
          dark ? 'border-ivory/10 bg-ivory/[0.04]' : 'border-line bg-ivory/60'
        }`}
      >
        <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
        <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
        <span className="h-2 w-2 rounded-full bg-[#28c840]" />
      </div>
      {children}
    </div>
  );
}

export default function EditorDemo({ variant = 'section' }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const wrapRef = useRef(null);
  const [full, setFull] = useState(false);

  // التشغيل بيبدأ لما اللقطة تبان في الشاشة، وبيقف لما تخرج — مافيش
  // فيديو بيلف في الخلفية وبياكل بطارية وبيانات من غير ما حد شايفه
  useEffect(() => {
    const el = wrapRef.current;
    const v = videoRef.current;
    if (!el || !v || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      });
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const compact = variant === 'compact';

  return (
    <div ref={wrapRef} className="relative">
      <BrowserFrame dark={variant === 'dark' || compact}>
        {/* التسجيل عريض جدًا (شاشة لابتوب). لو سيبناه على طبيعته على
            الموبايل بيطلع شريط ارتفاعه 170 بكسل ومحدش يقرا فيه حاجة —
            وده يلغي فايدة الفيديو أصلاً. فعلى الشاشات الصغيرة بنقرّب
            على الجزء اللي فيه الشغل (الدعوة وطرف الشريط الجانبي)،
            وعلى الشاشة الكبيرة بيرجع كامل. */}
        <div className="relative aspect-[5/4] sm:aspect-auto">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            className="block h-full w-full object-cover object-[22%_center] sm:h-auto sm:object-contain"
            poster={POSTER}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            aria-label={t('demo.title')}
          >
            <source src={LOOP_WEBM} type="video/webm" />
            <source src={LOOP_MP4} type="video/mp4" />
          </video>

          {/* زرار الفيديو الكامل — النسخة الكاملة مبتتحمّلش قبل الضغط */}
          <button
            type="button"
            onClick={() => setFull(true)}
            className="group absolute bottom-3 end-3 inline-flex items-center gap-2 rounded-full bg-night/85 px-4 py-2.5
              text-[12.5px] font-bold text-ivory backdrop-blur transition hover:bg-night"
          >
            <Play size={13} className="text-brass-soft" />
            {t('demo.watchFull')}
          </button>
        </div>
      </BrowserFrame>

      {/* الفيديو الكامل في نافذة */}
      {full && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-night/90 p-3 backdrop-blur-sm"
          onClick={() => setFull(false)}
        >
          <motion.div
            initial={{ scale: 0.96, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <span className="text-[13px] font-bold text-ivory">{t('demo.title')}</span>
              <button
                type="button"
                onClick={() => setFull(false)}
                aria-label={t('auth.close')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-ivory/25 text-ivory/80 hover:border-ivory/50"
              >
                <X size={16} />
              </button>
            </div>
            <BrowserFrame dark>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video className="block w-full" src={FULL_MP4} poster={POSTER} controls autoPlay playsInline />
            </BrowserFrame>
            <Link
              to="/packages"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-l from-brass to-brass-soft py-3.5 text-[13.5px] font-extrabold text-[#241608]"
            >
              {t('demo.cta')} <ArrowLeft size={15} className="rtl:rotate-180" />
            </Link>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

/** قسم كامل بعنوان وكلام وزرار — للصفحة الرئيسية */
export function EditorDemoSection() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0c1c16] to-night" id="demo">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(80%_100%_at_50%_0%,rgba(230,198,132,.10),transparent)]" />
      <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-[78px]">
        <div className="mx-auto mb-8 max-w-[58ch] text-center sm:mb-11">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brass/15 px-3.5 py-1.5 text-[11.5px] font-bold text-brass-soft">
            <Sparkles size={12} /> {t('demo.eyebrow')}
          </div>
          <h2 className="mb-3 font-serif text-[clamp(24px,4vw,40px)] font-bold italic leading-tight text-ivory">
            {t('demo.title')}
          </h2>
          <p className="text-[14px] leading-[1.9] text-[#c3d1c9] sm:text-[15.5px]">{t('demo.body')}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          <EditorDemo variant="dark" />
        </motion.div>

        <div className="mx-auto mt-8 flex max-w-lg flex-col items-center gap-3">
          <Link
            to="/packages"
            className="group flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-l from-brass to-brass-soft py-4 text-[14.5px] font-extrabold text-[#241608] shadow-[0_16px_34px_-14px_rgba(201,162,74,0.5)] transition hover:brightness-105"
          >
            {t('demo.cta')}
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1 rtl:rotate-180 rtl:group-hover:translate-x-1" />
          </Link>
          <p className="text-center text-[12px] text-[#9fb3a8]">{t('demo.note')}</p>
        </div>
      </div>
    </section>
  );
}
