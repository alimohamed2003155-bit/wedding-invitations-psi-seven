import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Copy, Check } from 'lucide-react';

export default function ResultCard({ path, onReset }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const fullUrl = `${window.location.origin}${path}`;

  function copyLink() {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-7 rounded-[22px] border border-line bg-card p-6.5"
    >
      <h2 className="mb-3 font-serif text-[22px] font-bold text-ok">{t('result.title')}</h2>
      <div className="mb-3.5 flex gap-2">
        <input
          readOnly
          value={fullUrl}
          dir="ltr"
          className="flex-1 rounded-md border border-line px-3 py-2.5 text-left text-sm"
        />
        <button
          type="button"
          onClick={copyLink}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-rose px-4.5 text-sm text-rose hover:bg-rose/[0.08]"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? t('result.copied') : t('result.copy')}
        </button>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <a href={path} target="_blank" rel="noopener noreferrer" className="text-rose underline">
          {t('result.open')}
        </a>
        <a href={`${path}/stats`} target="_blank" rel="noopener noreferrer" className="text-rose underline">
          {t('result.stats')}
        </a>
        <button type="button" onClick={onReset} className="text-ink-dim underline">
          {t('result.again')}
        </button>
      </div>
    </motion.div>
  );
}
