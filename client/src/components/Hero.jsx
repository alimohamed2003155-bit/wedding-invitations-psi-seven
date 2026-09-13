// أول شاشة في الموقع.
//
// الترتيب هنا مقصود: الشارة (دليل إن الناس بتستخدمه) ← العنوان ←
// سطر واحد يشرح ← زرارين ← الموبايل اللي فيه فيديو المحرر شغّال ←
// الأرقام. يعني وعد، وبعده دليل، وبعده رقم.
//
// على الموبايل كل حاجة في النص. قبل كده كانت محاذاة لليمين (RTL)
// فكان بيفضل نص الشاشة الشمال فاضي والسطور متقطّعة — وده اللي خلّى
// الشكل مش متزن.
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetPublicStatsQuery } from '../store/api.js';
import StatsRow, { compactCount, USERS_FLOOR } from './StatsRow.jsx';
import HeroDemo from './HeroDemo.jsx';

export default function Hero() {
  const { t } = useTranslation();
  const { data } = useGetPublicStatsQuery();
  const trustCount = Math.max(USERS_FLOOR, data?.totalUsers || 0);

  return (
    <div
      className="relative overflow-hidden px-5 pb-12 pt-16 sm:px-6 lg:pb-16 lg:pt-24"
      style={{
        background:
          'radial-gradient(ellipse 900px 560px at 12% -8%, rgba(201,162,74,0.16), transparent 60%),'
          + 'radial-gradient(ellipse 760px 560px at 104% 6%, rgba(201,120,138,0.14), transparent 55%),'
          + 'linear-gradient(175deg, var(--color-night) 0%, var(--color-night-soft) 60%, #0a1712 100%)',
      }}
    >
      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-11 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
        <div className="text-center text-ivory lg:text-start">
          {/* ===== الشارة ===== */}
          {/* الرقم كبير وبارز والكلام بعده صغير — كده العين تمسك
              "200K+" في نص ثانية بدل ما تقرا جملة كاملة */}
          <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-brass-soft/35 bg-ivory/[0.07] py-1.5 ps-2 pe-4">
            <span className="relative flex h-[7px] w-[7px]">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-bright/60" />
              <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-emerald-bright" />
            </span>
            <span dir="ltr" className="font-serif text-[17px] font-bold leading-none tracking-tight text-brass-soft">
              {compactCount(trustCount)}+
            </span>
            <span className="text-[12px] leading-none text-ivory/65">{t('hero.badgeLabel')}</span>
          </div>

          <div className="mb-3 text-[11.5px] font-bold uppercase tracking-[0.3em] text-rose-bright">
            {t('hero.eyebrow')}
          </div>

          {/* المقاس نزل شوية: كان بيوصل 64 بكسل وكان تقيل على العين
              وبيكسّر السطر على الموبايل */}
          <h1 className="mb-4 bg-gradient-to-l from-ivory to-brass-soft bg-clip-text pb-1.5 font-serif text-[clamp(30px,7.4vw,52px)] font-bold italic leading-[1.3] text-transparent">
            {t('hero.titleLine1')}
            <br />
            {t('hero.titleLine2')}
          </h1>

          <p className="mx-auto mb-7 max-w-[46ch] text-[14.5px] leading-[1.85] text-[#cdd8d0] sm:text-[15.5px] lg:mx-0">
            {t('hero.lead')}
          </p>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
            <a
              href="#gallery"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-l from-brass to-brass-soft px-7 py-3.5 text-[14.5px] font-extrabold text-[#241608] shadow-[0_16px_34px_-14px_rgba(201,162,74,0.55)] transition-transform hover:-translate-y-0.5"
            >
              {t('hero.ctaGallery')}
            </a>
            <Link
              to="/packages"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ivory/30 px-6 py-3.5 text-[14px] font-bold text-ivory hover:border-rose-bright"
            >
              {t('hero.ctaPackages')}
            </Link>
          </div>

          {/* الأرقام على الشاشة الكبيرة بتقعد تحت الكلام؛ على الموبايل
              بتنزل تحت الفيديو (تحت) عشان الفيديو يوصل بدري */}
          <div className="hidden lg:block">
            <StatsRow />
          </div>
        </div>

        {/* ===== الدليل: المحرر شغّال ===== */}
        <HeroDemo />

        <div className="lg:hidden">
          <StatsRow />
        </div>
      </div>
    </div>
  );
}
