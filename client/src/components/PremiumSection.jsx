import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Music, Palette, Image, Globe, SlidersHorizontal, Handshake } from 'lucide-react';

const FEATURE_ICONS = [Music, Palette, Image, Globe, SlidersHorizontal, Handshake];

export default function PremiumSection() {
  const { t } = useTranslation();
  const features = FEATURE_ICONS.map((Icon, i) => ({
    Icon,
    title: t(`premium.f${i + 1}Title`),
    desc: t(`premium.f${i + 1}Desc`),
  }));

  return (
    <div className="relative overflow-hidden bg-night" id="premium">
      <div className="relative mx-auto max-w-6xl px-6 py-[78px]">
        <div className="mx-auto mb-12 max-w-[64ch] text-center">
          <div className="mb-4 text-[12.5px] font-extrabold tracking-[0.3em] text-brass-soft uppercase">
            ✦ {t('premium.eyebrow')} ✦
          </div>
          <h2 className="mb-3.5 font-serif text-[clamp(28px,4vw,44px)] font-bold italic text-ivory">
            {t('premium.title')}
          </h2>
          <p className="text-[15.5px] text-[#c3d1c9]">{t('premium.subtitle')}</p>
        </div>

        <div className="mb-12 grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5.5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="rounded-[22px] border border-ivory/10 bg-ivory/[0.045] p-7 text-start transition-colors hover:border-rose-bright/40 hover:bg-ivory/[0.07]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <div className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-gradient-to-br from-brass/25 to-rose/20 text-brass-soft">
                <f.Icon size={22} />
              </div>
              <h3 className="mb-2 font-serif text-[18.5px] font-bold italic text-ivory">{f.title}</h3>
              <p className="text-[13.5px] leading-relaxed text-[#b7c6bd]">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[22px] border border-brass-soft/30 bg-gradient-to-l from-brass/[0.14] to-rose/[0.14] px-8.5 py-7.5">
          <div>
            <h3 className="mb-1.5 font-serif text-xl font-bold italic text-ivory">{t('premium.ctaTitle')}</h3>
            <p className="text-[13.5px] text-[#c3d1c9]">{t('premium.ctaSubtitle')}</p>
          </div>
          <Link
            to="/packages"
            className="whitespace-nowrap rounded-full bg-gradient-to-l from-brass to-brass-soft px-7.5 py-4 font-extrabold text-[#241608] shadow-[0_16px_34px_-14px_rgba(201,162,74,0.5)] hover:brightness-105"
          >
            {t('premium.ctaButton')}
          </Link>
        </div>
      </div>
    </div>
  );
}
