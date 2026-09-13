// أول شاشة في الموقع.
//
// التقسيم: الكلام في ناحية والموبايل اللي فيه فيديو المحرر في الناحية
// التانية — **جنب بعض على كل المقاسات**، حتى على الموبايل. قبل كده
// كانوا تحت بعض على الشاشة الصغيرة، فالفيديو (أقوى حاجة عندنا) كان
// بينزل تحت الطية ومحدش بيوصله.
//
// عشان يفضلوا جنب بعض في 390 بكسل، الخط كله اتصغّر والسطر الشارح
// اتخفى على الموبايل. ده مقصود: اللي بيبيع هنا هو العنوان + الفيديو،
// مش الفقرة.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StatsRow from './StatsRow.jsx';
import HeroDemo from './HeroDemo.jsx';

export default function Hero() {
  const { t } = useTranslation();

  return (
    <div
      className="relative overflow-hidden px-4 pb-10 pt-12 sm:px-6 sm:pt-16 lg:pb-14 lg:pt-18"
      style={{
        background:
          'radial-gradient(ellipse 900px 560px at 12% -8%, rgba(201,162,74,0.16), transparent 60%),'
          + 'radial-gradient(ellipse 760px 560px at 104% 6%, rgba(201,120,138,0.14), transparent 55%),'
          + 'linear-gradient(175deg, var(--color-night) 0%, var(--color-night-soft) 60%, #0a1712 100%)',
      }}
    >
      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-[1.02fr_0.98fr] items-center gap-x-3 gap-y-5 sm:gap-x-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-x-14 lg:gap-y-6">
        {/* ===== اللوجو ===== */}
        {/* فوق كل حاجة وبعرض الشبكة كلها. من غير أي خلفية وراه —
            اللوجو متصمم على غامق أصلاً (ذهب وعنابي)، فالخلفية الفاتحة
            كانت بتقطعه عن الصفحة بدل ما تخدمه. */}
        <div className="col-span-2 flex justify-center lg:justify-start">
          <img
            src="/img/logo.png"
            alt={t('nav.brand')}
            width="315"
            height="180"
            className="h-14 w-auto drop-shadow-[0_10px_26px_rgba(0,0,0,.55)] sm:h-16 lg:h-20"
          />
        </div>

        {/* ===== الكلام ===== */}
        <div className="text-start text-ivory">
          <div className="mb-2 text-[9.5px] font-bold uppercase tracking-[0.22em] text-rose-bright sm:text-[11px] sm:tracking-[0.3em]">
            {t('hero.eyebrow')}
          </div>

          <h1 className="mb-3 bg-gradient-to-l from-ivory to-brass-soft bg-clip-text pb-1 font-serif text-[clamp(21px,5.9vw,52px)] font-bold italic leading-[1.32] text-transparent sm:mb-4">
            {t('hero.titleLine1')}
            <br />
            {t('hero.titleLine2')}
          </h1>

          {/* السطر الشارح بيتخفى على الموبايل — العمود ضيّق، ولو سيبناه
              هيكسّر التوازن اللي العميل طلبه */}
          <p className="mb-6 hidden max-w-[46ch] text-[15.5px] leading-[1.85] text-[#cdd8d0] sm:block">
            {t('hero.lead')}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a
              href="#gallery"
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-l from-brass to-brass-soft px-3.5 py-2.5 text-center text-[12px] font-extrabold text-[#241608] shadow-[0_16px_34px_-14px_rgba(201,162,74,0.55)] transition-transform hover:-translate-y-0.5 sm:px-7 sm:py-3.5 sm:text-[14.5px]"
            >
              {t('hero.ctaGallery')}
            </a>
            <Link
              to="/packages"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-ivory/30 px-3.5 py-2.5 text-center text-[11.5px] font-bold text-ivory hover:border-rose-bright sm:px-6 sm:py-3.5 sm:text-[14px]"
            >
              {t('hero.ctaPackages')}
            </Link>
          </div>

          {/* الأرقام جوه عمود الكلام على الشاشة الكبيرة بس */}
          <div className="hidden lg:block">
            <StatsRow />
          </div>
        </div>

        {/* ===== الدليل: التليفون + الرسالة تحته ===== */}
        <HeroDemo />

        <div className="col-span-2 lg:hidden">
          <StatsRow />
        </div>
      </div>
    </div>
  );
}
