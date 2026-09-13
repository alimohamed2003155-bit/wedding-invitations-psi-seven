import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetPublicStatsQuery } from '../store/api.js';
import StatsRow from './StatsRow.jsx';

const numberFormatter = new Intl.NumberFormat('en-US');

export default function Hero() {
  const { t } = useTranslation();
  const { data } = useGetPublicStatsQuery();
  const trustCount = Math.max(200000, data?.totalUsers || 0);

  return (
    <div
      className="relative overflow-hidden px-6 pb-11 pt-24"
      style={{
        background:
          'radial-gradient(ellipse 900px 560px at 12% -8%, rgba(201,162,74,0.16), transparent 60%),' +
          'radial-gradient(ellipse 760px 560px at 104% 6%, rgba(201,120,138,0.14), transparent 55%),' +
          'linear-gradient(175deg, var(--color-night) 0%, var(--color-night-soft) 60%, #0a1712 100%)',
      }}
    >
      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="text-ivory">
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-brass-soft/35 bg-ivory/[0.07] py-2 ps-2.5 pe-4.5 text-[12.5px] text-brass-soft">
            <span className="h-[7px] w-[7px] rounded-full bg-emerald-bright shadow-[0_0_0_3px_rgba(47,156,128,0.25)]" />
            {t('hero.badge', { count: numberFormatter.format(trustCount) })}
          </div>
          <div className="mb-4 text-[12.5px] font-bold tracking-[0.32em] text-rose-bright uppercase">
            {t('hero.eyebrow')}
          </div>
          <h1 className="mb-5 bg-gradient-to-l from-ivory to-brass-soft bg-clip-text pb-2 font-serif text-[clamp(38px,5.8vw,64px)] font-bold italic leading-[1.35] text-transparent">
            {t('hero.titleLine1')}
            <br />
            {t('hero.titleLine2')}
          </h1>
          <p className="mb-8 max-w-[48ch] text-[17px] text-[#cdd8d0]">{t('hero.lead')}</p>
          <div className="flex flex-wrap gap-3.5">
            <a
              href="#gallery"
              className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-l from-brass to-brass-soft px-8 py-4 text-[15.5px] font-extrabold text-[#241608] shadow-[0_16px_34px_-14px_rgba(201,162,74,0.55)] transition-transform hover:-translate-y-0.5"
            >
              {t('hero.ctaGallery')}
            </a>
            <Link
              to="/packages"
              className="inline-flex items-center gap-2.5 rounded-full border border-ivory/30 px-6.5 py-3.5 text-[15px] font-bold text-ivory hover:border-rose-bright"
            >
              {t('hero.ctaPackages')}
            </Link>
          </div>

          <StatsRow />
        </div>

        <div className="relative mx-auto hidden lg:block" style={{ width: 168, aspectRatio: '320/850' }}>
          <div
            className="pointer-events-none absolute -inset-8 blur-[12px]"
            style={{ background: 'radial-gradient(circle at 50% 45%, rgba(201,120,138,0.3), transparent 62%)' }}
          />

          {/* البطاقتين بنفس المقاس بالظبط، بس مايلتين عكس بعض (زرافة متناظرة)
              عشان الشكل يبقى متوازن ومتناسق، مش الاتنين مايلين لنفس الاتجاه */}
          <motion.div
            className="absolute inset-0 z-[1]"
            initial={{ opacity: 0, x: 60, y: 12, rotate: -22, scale: 0.9 }}
            animate={{ opacity: 1, x: 24, y: 10, rotate: -8, scale: 1 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              className="h-full w-full overflow-hidden rounded-2xl border-4 border-[#050b08] bg-[#050b08] opacity-90 shadow-xl shadow-black/40"
              animate={{ y: [0, 9, 0], rotate: [-8, -6.5, -8] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.75 }}
            >
              <img
                src="/img/template-thumbs/viktor-paula.jpg"
                alt="معاينة تصميم Viktor & Paula"
                className="h-full w-full object-cover object-top"
              />
            </motion.div>
          </motion.div>

          <motion.div
            className="absolute inset-0 z-[2]"
            initial={{ opacity: 0, x: -50, y: -10, rotate: 18, scale: 0.9 }}
            animate={{ opacity: 1, x: -24, y: -8, rotate: 8, scale: 1 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          >
            <motion.div
              className="h-full w-full overflow-hidden rounded-2xl border-4 border-[#050b08] bg-[#050b08] shadow-2xl shadow-black/50"
              animate={{ y: [0, -11, 0], rotate: [8, 6.5, 8] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.9 }}
            >
              <img
                src="/img/template-thumbs/blossom-oud.jpg"
                alt="معاينة تصميم Blossom & Oud"
                className="h-full w-full object-cover object-top"
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
