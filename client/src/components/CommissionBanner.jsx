import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Sparkle, MessageCircle } from 'lucide-react';
import { whatsappLink, WHATSAPP_MESSAGES, phoneDisplay } from '../lib/contact.js';

const PHONE = phoneDisplay;

export default function CommissionBanner() {
  const { t } = useTranslation();
  const features = [1, 2, 3, 4, 5, 6].map((n) => t(`commission.f${n}`));

  return (
    <div className="mx-auto max-w-6xl px-6 py-[78px]">
      <motion.div
        className="relative overflow-hidden rounded-[22px] px-8.5 pb-12 pt-14 text-[#fdf6f2]"
        style={{ background: 'linear-gradient(150deg, #7a2f43, #c9788a 45%, #3f1420)' }}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto max-w-[680px] text-center">
          <div className="mb-3.5 text-[12px] font-bold tracking-[0.28em] text-brass-soft uppercase">
            {t('commission.eyebrow')}
          </div>
          <h2 className="mb-3.5 font-serif text-[clamp(27px,4vw,40px)] font-bold italic">{t('commission.title')}</h2>
          <p className="mb-7.5 text-[15.5px] text-[#f6e3da]">{t('commission.lead')}</p>
          <ul className="mb-9 grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3.5 text-start">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-[#fbeee7]">
                <Sparkle size={15} className="mt-0.5 shrink-0 text-brass-soft" />
                {f}
              </li>
            ))}
          </ul>
          <a
            href={whatsappLink(WHATSAPP_MESSAGES.custom)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-full bg-brass-soft px-8.5 py-4 font-extrabold text-[#241608] shadow-[0_16px_34px_-14px_rgba(0,0,0,0.35)] hover:bg-[#f3d789]"
          >
            <MessageCircle size={18} />
            {t('commission.cta')}
          </a>
          <div className="mt-4 text-[12.5px] text-[#f0d9cf]">{t('commission.note', { phone: PHONE })}</div>
        </div>
      </motion.div>
    </div>
  );
}
