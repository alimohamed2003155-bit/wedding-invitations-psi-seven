import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Palette } from 'lucide-react';
import { whatsappLink, WHATSAPP_MESSAGES, phoneDisplay } from '../lib/contact.js';

export default function Footer() {
  const { t } = useTranslation();
  // نفس منطق الهيدر: لو اللوجو مش متحط لسه، نعرض الاسم مكتوب بس
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <footer className="bg-ivory px-5 pb-14 pt-12 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        {!logoFailed && (
          <img
            src="/img/logo.png"
            alt={t('nav.brand')}
            className="mx-auto mb-3 h-16 w-16 rounded-full object-cover"
            onError={() => setLogoFailed(true)}
          />
        )}
        <div className="mb-1 font-serif text-lg font-bold text-ink">{t('footer.brand')}</div>
        <p className="text-[13px] text-ink-dim">{t('footer.tagline')}</p>

        {/* ===== التواصل ===== */}
        {/* الفوتر هو المكان اللي الناس بتنزله لما تدوّر على "أكلّمهم
            إزاي" — فبدل سطر تعريفي وبس، بقى فيه طريقتين واضحين */}
        <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
          <a
            href={whatsappLink(WHATSAPP_MESSAGES.help)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 text-start transition hover:border-ink/25"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#1da851]">
              <MessageCircle size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-bold text-ink">{t('footer.helpTitle')}</span>
              <span className="block text-[12px] text-ink-dim" dir="ltr">{phoneDisplay}</span>
            </span>
          </a>

          <a
            href={whatsappLink(WHATSAPP_MESSAGES.custom)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-brass/40 bg-brass/[0.06] p-4 text-start transition hover:border-brass"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brass/20 text-[#8a6a20]">
              <Palette size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-bold text-ink">{t('footer.customTitle')}</span>
              <span className="block text-[12px] leading-snug text-ink-dim">{t('footer.customDesc')}</span>
            </span>
          </a>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-ink-dim">
          <Link to="/packages" className="hover:text-rose">{t('packages.eyebrow')}</Link>
          <span className="h-3 w-px bg-line" />
          <Link to="/dashboard" className="hover:text-rose">{t('nav.dashboard')}</Link>
          <span className="h-3 w-px bg-line" />
          <a href={whatsappLink(WHATSAPP_MESSAGES.help)} target="_blank" rel="noopener noreferrer" className="hover:text-rose">
            {t('footer.contact')}
          </a>
        </div>
      </div>
    </footer>
  );
}
