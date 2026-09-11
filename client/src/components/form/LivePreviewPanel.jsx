import { useTranslation } from 'react-i18next';

export default function LivePreviewPanel({ html }) {
  const { t } = useTranslation();
  return (
    <div className="sticky top-0 flex h-screen flex-col items-center bg-night p-8 lg:h-screen">
      <div className="mb-2.5 self-start text-xs font-bold uppercase tracking-[0.16em] text-brass-soft">
        {t('create.previewLabel')}
      </div>
      <div className="h-[640px] w-full max-w-[390px] overflow-hidden rounded-2xl border border-brass/40 bg-black">
        <iframe
          title={t('create.previewLabel')}
          srcDoc={html || ''}
          sandbox="allow-scripts allow-same-origin"
          className="h-full w-full border-0"
        />
      </div>
      <p className="mt-3 max-w-[390px] text-center text-xs text-[#a9bab1] opacity-90">{t('create.previewNote')}</p>
    </div>
  );
}
