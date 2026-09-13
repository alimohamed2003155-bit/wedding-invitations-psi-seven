// موبايل جوّاه فيديو المحرر وهو شغّال — ده بطل الصفحة الرئيسية.
//
// ليه موبايل مش إطار متصفح: التسجيل نفسه من موبايل (284×624)، وكل
// ضيوف العميل هيفتحوا الدعوة من موبايل. الإطار بيخلي اللي بيتفرّج
// يشوف نفسه ماسك التليفون، مش بيتفرّج على لقطة شاشة.
//
// الوزن: اللقطة الصامتة (0.45 ميجا) هي اللي بتتحمّل مع الصفحة،
// والنسخة الكاملة بصوتها مبتتحمّلش غير لما يضغط عليها بنفسه.
// والتشغيل بيبدأ لما الفيديو يبان في الشاشة بس.
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
    <div ref={wrapRef} className="relative mx-auto w-full max-w-[280px] lg:max-w-[300px]">
      {/* وهج ناعم ورا التليفون */}
      <div
        className="pointer-events-none absolute -inset-10 blur-[26px]"
        style={{ background: 'radial-gradient(circle at 50% 40%, rgba(201,120,138,0.28), transparent 62%)' }}
      />

      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 26, rotate: -2 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* جسم التليفون */}
        <div className="relative rounded-[34px] border-[7px] border-[#050b08] bg-[#050b08] shadow-[0_34px_70px_-26px_rgba(0,0,0,.85)]">
          {/* النتش */}
          <span className="absolute start-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-[#1c2b24]" />
          <video
            ref={videoRef}
            className="block w-full rounded-[27px]"
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

        {/* شارة صغيرة على حرف التليفون — بتقول ده إيه من غير ما يقرا
            أي حاجة. مركّبة على الحافة مش جوه الشاشة، عشان ماتغطّيش
            اللي بيحصل في الفيديو. */}
        <span className="absolute -top-3 start-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-brass to-brass-soft px-3 py-1.5 text-[11px] font-extrabold text-[#241608] shadow-[0_8px_20px_-8px_rgba(0,0,0,.6)]">
          <Sparkles size={11} /> {t('heroDemo.chip')}
        </span>
      </motion.div>

      {/* الرسالة: المجاني جامد… والمدفوع أجمد */}
      <div className="mt-5 rounded-2xl border border-brass-soft/25 bg-ivory/[0.05] px-4 py-3.5 text-center">
        <p className="text-[13px] leading-[1.8] text-ivory/90">
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
              className="relative w-full max-w-[360px]"
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
    </div>
  );
}
