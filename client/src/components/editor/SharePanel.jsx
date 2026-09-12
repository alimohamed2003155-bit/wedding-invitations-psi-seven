// لوحة "كارت المشاركة" — شكل اللينك لما يتبعت على واتساب.
//
// ليه دي مهمة أكتر مما تبان: أول حاجة الضيف بيشوفها مش الدعوة — دي
// الكارت اللي بيظهر في المحادثة. لو الكارت مالوش معنى، ناس كتير مش
// هتضغط أصلاً. وقبل كده كان بيظهر باسم التصميم وصورة شعار الشركة
// اللي التصاميم متصدّرة منها، مالهاش أي علاقة بالعروسين.
//
// المعاينة هنا بنفس شكل كارت واتساب بالظبط — العميل بيشوف اللي ضيوفه
// هيشوفوه وهو بيكتب، مش بيتخيّله.
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Loader2, Share2, RotateCcw, Check } from 'lucide-react';

const MAX_TITLE = 90;
const MAX_DESC = 200;

/** معاينة الكارت بشكل محادثة واتساب */
function WhatsAppPreview({ title, description, image, host }) {
  return (
    <div className="rounded-2xl bg-[#0b141a] p-3">
      {/* فقاعة الرسالة */}
      <div className="ms-auto max-w-[280px] overflow-hidden rounded-xl rounded-se-sm bg-[#005c4b] p-1 shadow">
        <div className="overflow-hidden rounded-lg bg-black/25">
          {image ? (
            <img src={image} alt="" className="block h-[132px] w-full object-cover" />
          ) : (
            <div className="flex h-[132px] w-full items-center justify-center bg-white/5 text-[11px] text-white/35">
              —
            </div>
          )}
          <div className="px-2.5 py-2">
            <div className="line-clamp-2 text-[12.5px] font-bold leading-snug text-white/95">
              {title}
            </div>
            <div className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-white/55">
              {description}
            </div>
            <div className="mt-1 text-[10.5px] text-white/40" dir="ltr">{host}</div>
          </div>
        </div>
        <div className="px-2 pb-0.5 pt-1 text-[11px] text-white/80" dir="ltr">
          {host}/i/…
        </div>
      </div>
    </div>
  );
}

export default function SharePanel({
  share, defaults, onChange, onUploadImage, uploading, canImages,
}) {
  const { t } = useTranslation();
  const fileRef = useRef(null);

  const title = share.title || defaults.title || '';
  const description = share.description || defaults.description || '';
  const host = typeof window !== 'undefined' ? window.location.host : '';

  const isCustom = !!(share.title || share.description || share.image);

  return (
    <>
      <h2 className="mb-1.5 flex items-center gap-2 font-serif text-[16px] font-bold text-ink">
        <Share2 size={15} className="text-rose" /> {t('editor.shareTitle')}
      </h2>
      <p className="mb-4 text-[12.5px] leading-relaxed text-ink-dim">{t('editor.shareHint')}</p>

      {/* المعاينة الحية */}
      <WhatsAppPreview title={title} description={description} image={share.image} host={host} />

      {/* الصورة */}
      <div className="mt-4">
        <label className="mb-1.5 block text-[12.5px] font-bold text-ink">{t('editor.shareImage')}</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={onUploadImage}
        />
        <button
          type="button"
          disabled={uploading || !canImages}
          onClick={() => fileRef.current?.click()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line py-2.5 text-[12.5px] font-bold text-ink transition hover:border-ink/35 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading ? t('editor.photoUploading')
            : share.image ? t('editor.shareImageChange') : t('editor.shareImagePick')}
        </button>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-dim">{t('editor.shareImageHint')}</p>
      </div>

      {/* العنوان */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label className="text-[12.5px] font-bold text-ink">{t('editor.shareCardTitle')}</label>
          <span className="text-[11px] text-ink-dim">{(share.title || '').length}/{MAX_TITLE}</span>
        </div>
        <input
          value={share.title || ''}
          onChange={(e) => onChange({ ...share, title: e.target.value.slice(0, MAX_TITLE) })}
          placeholder={defaults.title || ''}
          maxLength={MAX_TITLE}
          className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-[13px] text-ink focus:border-rose focus:outline-none"
        />
      </div>

      {/* الوصف */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label className="text-[12.5px] font-bold text-ink">{t('editor.shareCardDesc')}</label>
          <span className="text-[11px] text-ink-dim">{(share.description || '').length}/{MAX_DESC}</span>
        </div>
        <textarea
          value={share.description || ''}
          onChange={(e) => onChange({ ...share, description: e.target.value.slice(0, MAX_DESC) })}
          placeholder={defaults.description || ''}
          rows={3}
          maxLength={MAX_DESC}
          className="w-full resize-none rounded-lg border border-line bg-card px-3 py-2.5 text-[13px] leading-relaxed text-ink focus:border-rose focus:outline-none"
        />
      </div>

      {isCustom && (
        <button
          type="button"
          onClick={() => onChange({ title: '', description: '', image: '' })}
          className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-ink-dim hover:text-rose"
        >
          <RotateCcw size={11} /> {t('editor.shareReset')}
        </button>
      )}

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-emerald/[0.07] px-3.5 py-3 text-[11.5px] leading-relaxed text-ink-dim">
        <Check size={12} className="mt-0.5 shrink-0 text-emerald" />
        {t('editor.shareNote')}
      </p>
    </>
  );
}
