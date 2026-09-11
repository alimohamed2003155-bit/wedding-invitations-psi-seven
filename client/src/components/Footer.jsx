import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  // نفس منطق الهيدر: لو اللوجو مش متحط لسه، نعرض الاسم مكتوب بس
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <footer className="bg-ivory px-6 pb-14 pt-10 text-center text-[13px] text-ink-dim">
      {!logoFailed && (
        <img
          src="/img/logo.png"
          alt={t('nav.brand')}
          className="mx-auto mb-3 h-16 w-16 rounded-full object-cover"
          onError={() => setLogoFailed(true)}
        />
      )}
      <div className="mb-1 font-serif text-lg font-bold text-ink">{t('footer.brand')}</div>
      {t('footer.tagline')}
    </footer>
  );
}
