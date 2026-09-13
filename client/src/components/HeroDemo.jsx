// موبايل جوّاه فيديو المحرر وهو شغّال — ده بطل الصفحة الرئيسية.
//
// ليه موبايل مش إطار متصفح: التسجيل نفسه من موبايل (284×624)، وكل
// ضيوف العميل هيفتحوا الدعوة من موبايل. الإطار بيخلي اللي بيتفرّج
// يشوف نفسه ماسك التليفون، مش بيتفرّج على لقطة شاشة.
//
// الوزن: اللقطة الصامتة (0.45 ميجا) هي اللي بتتحمّل مع الصفحة،
// والنسخة الكاملة بصوتها مبتتحمّلش غير لما يضغط عليها بنفسه.
// والتشغيل بيبدأ لما الفيديو يبان في الشاشة بس.
//
// المكوّن بيرجّع حتّتين منفصلين (التليفون، والرسالة اللي تحته) عشان
// الهيرو يحطّ كل واحدة في مكانها من الشبكة: على الموبايل التليفون
// جنب الكلام، والرسالة تحتهم بعرض الشاشة كلها.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Play, X, Sparkles, ArrowLeft } from 'lucide-react';

const LOOP_MP4 = '/video/hero-demo-loop.mp4';
const LOOP_WEBM = '/video/hero-demo-loop.webm';
const FULL_MP4 = '/video/hero-demo-full.mp4';
const POSTER = '/video/hero-demo-poster.jpg';

export default function HeroDemo() {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const wrapRef = useRef(null);
  const [full, setFull] = useState(false);

  // بيشتغل وهو بايـن بس — مفيش فيديو بيلف في الخلفية وبياكل بطارية
  // وبيانات من غير ما حد شايفه
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

  useEffect(() => {
    if (!full) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setFull(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full]);

  return (
    <>
      {/* ===== التليفون ===== */}
      {/* المقاس على الشاشة الكبيرة متظبط عشان التليفون والرسالة اللي
          تحته يبانوا مع بعض في شاشة واحدة من غير تمرير */}
      <div ref={wrapRef} className="relative mx-auto w-full max-w-[190px] sm:max-w-[240px] lg:max-w-[264px]">
        <div
          className="pointer-events-none absolute -inset-8 blur-[24px]"
          style={{ background: 'radial-gradient(circle at 50% 40%, rgba(201,120,138,0.3), transparent 62%)' }}
        />

        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 22, rotate: -2 }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative rounded-[22px] border-[5px] border-[#050b08] bg-[#050b08] shadow-[0_28px_60px_-24px_rgba(0,0,0,.85)] sm:rounded-[28px] sm:border-[6px] lg:rounded-[34px] lg:border-[7px]">
            <span className="absolute start-1/2 top-1.5 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-[#1c2b24] sm:top-2 sm:h-1.5 sm:w-14" />
            <video
              ref={videoRef}
              className="block w-full rounded-[17px] sm:rounded-[22px] lg:rounded-[27px]"
              poster={POSTER}
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={t('heroDemo.alt')}
            >
              <source src={LOOP_WEBM} type="video/webm" />
              <source src={LOOP_MP4} type="video/mp4" />
            </video>
          </div>

          {/* شارة على حرف التليفون — بتقول ده إيه من غير ما يقرا حاجة */}
          <span className="absolute -top-2.5 start-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-brass to-brass-soft px-2 py-1 text-[9.5px] font-extrabold text-[#241608] shadow-[0_8px_20px_-8px_rgba(0,0,0,.6)] sm:-top-3 sm:start-5 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11px]">
            <Sparkles size={10} /> {t('heroDemo.chip')}
          </span>
        </motion.div>
      </div>

      {/* ===== الرسالة: المجاني جامد… والمدفوع أجمد ===== */}
      {/* بعرض الشاشة كلها على الموبايل (تحت الكلام والتليفون)، وتحت
          التليفون بس على الشاشة الكبيرة */}
      <div className="col-span-2 rounded-2xl border border-brass-soft/25 bg-ivory/[0.05] px-4 py-3.5 text-center lg:col-span-1 lg:col-start-2 lg:mt-1">
        <p className="text-[12.5px] leading-[1.85] text-ivory/90 sm:text-[13px]">
          <span className="font-bold text-brass-soft">{t('heroDemo.pitchStrong')}</span>{' '}
          {t('heroDemo.pitchRest')}
        </p>
        <div className="mt-2.5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setFull(true)}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ivory hover:text-rose-bright"
          >
            <Play size={12} /> {t('heroDemo.watch')}
          </button>
          <span className="h-3 w-px bg-ivory/20" />
          <Link
            to="/packages"
            className="inline-flex items-center gap-1 text-[12.5px] font-bold text-brass-soft hover:text-brass"
          >
            {t('heroDemo.seeDiff')} <ArrowLeft size={12} />
          </Link>
        </div>
      </div>

      {/* الفيديو الكامل بصوته — مبيتحمّلش غير دلوقتي */}
      <AnimatePresence>
        {full && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFull(false)}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-night/92 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[340px]"
            >
              <button
                type="button"
                onClick={() => setFull(false)}
                aria-label={t('heroDemo.close')}
                className="absolute -top-11 end-0 flex h-9 w-9 items-center justify-center rounded-full border border-ivory/25 text-ivory hover:bg-ivory/10"
              >
                <X size={17} />
              </button>
              <video
                className="block w-full rounded-[24px] border-[6px] border-[#050b08] bg-[#050b08]"
                src={FULL_MP4}
                poster={POSTER}
                controls
                autoPlay
                playsInline
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
