import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Lock, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { useGetMeQuery, useCreateDraftMutation } from '../store/api.js';
import { openAuthModal } from '../store/uiSlice.js';

export default function TemplateCard({ template, index }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { data } = useGetMeQuery();
  const [createDraft, { isLoading: startingEditor }] = useCreateDraftMutation();
  const locked = !!template.isPremium && !data?.user;
  const [imgError, setImgError] = useState(false);
  const [startError, setStartError] = useState('');

  // العميل المشترك عنده رصيد ← بيروح المحرر على طول، مش لفورم الإنشاء
  // المجاني. ده أوضح فرق بيحسه بعد ما يدفع.
  const subscribed = (data?.user?.subscription?.invitationsLeft || 0) > 0;

  async function useTemplate() {
    if (!subscribed) {
      navigate(`/create/${template.id}`);
      return;
    }
    setStartError('');
    try {
      const res = await createDraft({ templateId: template.id }).unwrap();
      navigate(`/editor/${res.shortId}`);
    } catch (err) {
      // لو حصل أي مانع (رصيد خلص، مسودات كتير مفتوحة) بنقوله السبب
      // ونسيبه يكمّل بالطريق العادي بدل ما نوقفه.
      setStartError(err?.data?.error || t('create.genericError'));
    }
  }

  return (
    <motion.div
      className="relative flex flex-col overflow-hidden rounded-[22px] border border-line bg-card transition-shadow hover:shadow-2xl hover:shadow-ink/10"
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      whileHover={{ y: -6 }}
    >
      {/* شريط أحمر مايل على ركن الكارت — العميل يعرف من نظرة إن
          التصميم ده للمشتركين، قبل ما يقرا أي كلام */}
      {template.isPremium && (
        <div className="pointer-events-none absolute -end-12 top-6 z-10 w-44 rotate-45 bg-gradient-to-l from-[#a01020] to-[#e0142c] py-1.5 text-center text-[11px] font-extrabold tracking-wide text-white shadow-[0_6px_16px_-6px_rgba(160,16,32,.8)]">
          {t('gallery.premiumRibbon')}
        </div>
      )}

      <div className="flex justify-center bg-gradient-to-b from-emerald/[0.06] to-transparent px-7 pt-7">
        <div className="relative aspect-[320/850] w-[64%] overflow-hidden rounded-[26px] border-[6px] border-[#050b08] bg-[#050b08]">
          {imgError ? (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-night to-[#16281f] p-5 text-center font-serif text-[15px] italic text-brass-soft">
              {template.name}
            </div>
          ) : (
            <img
              src={`/img/template-thumbs/${template.id}.jpg`}
              alt={`معاينة تصميم ${template.name}`}
              loading="lazy"
              className="h-full w-full object-cover object-top"
              onError={() => setImgError(true)}
            />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 px-6 py-6 text-center">
        <h3 className="flex items-center justify-center gap-2 font-serif text-[23px] italic font-bold text-ink">
          {template.name}
          {template.isPremium && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brass/15 px-2.5 py-0.5 text-[11px] font-bold text-brass">
              <Sparkles size={11} /> {t('gallery.premiumBadge')}
            </span>
          )}
        </h3>
        <p className="flex-1 text-[13.5px] text-ink-dim">{template.description}</p>

        <div className="flex gap-2.5">
          {locked ? (
            <>
              <button
                type="button"
                onClick={() => dispatch(openAuthModal('register'))}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-ink px-4 py-3 text-sm font-bold text-ink hover:bg-ink/5"
              >
                <Lock size={14} /> {t('gallery.lockedPreview')}
              </button>
              <button
                type="button"
                onClick={() => dispatch(openAuthModal('register'))}
                className="flex-1 rounded-full bg-night px-4 py-3 text-sm font-bold text-ivory hover:bg-emerald"
              >
                {t('gallery.lockedUse')}
              </button>
            </>
          ) : (
            <>
              <a
                href={`/preview-sample/${template.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-full border border-ink px-4 py-3 text-center text-sm font-bold text-ink hover:bg-ink/5"
              >
                {t('gallery.preview')}
              </a>
              <button
                type="button"
                onClick={useTemplate}
                disabled={startingEditor}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-3 text-sm font-bold disabled:opacity-60 ${
                  subscribed
                    ? 'bg-gradient-to-l from-brass to-brass-soft text-[#241608] hover:brightness-105'
                    : 'bg-night text-ivory hover:bg-emerald'
                }`}
              >
                {startingEditor ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : subscribed ? (
                  <Wand2 size={14} />
                ) : null}
                {subscribed ? t('gallery.useWithEditor') : t('gallery.use')}
              </button>
            </>
          )}
        </div>

        {startError && <p className="text-[12.5px] text-error">{startError}</p>}
      </div>
    </motion.div>
  );
}
