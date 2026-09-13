import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Lock, Clock, Crown, Check, Sparkles } from 'lucide-react';
import {
  useGetTemplatesQuery,
  usePreviewMutation,
  useCreateInvitationMutation,
  useGetMeQuery,
  useGetFreeQuotaQuery,
} from '../store/api.js';
import ChoiceCards from '../components/form/ChoiceCards.jsx';
import TimelineFields from '../components/form/TimelineFields.jsx';
import SectionToggles from '../components/form/SectionToggles.jsx';
import ExtraFields from '../components/form/ExtraFields.jsx';
import LivePreviewPanel from '../components/form/LivePreviewPanel.jsx';
import ResultCard from '../components/form/ResultCard.jsx';

const STAGE_DEFAULT_HOURS = { reception: 16, ceremony: 17, cocktail: 18, dinner: 19, party: 20, farewell: 21 };
const PLACEHOLDERS = {
  groomName: 'Yusuf',
  brideName: 'Amira',
  groomNameAr: 'يوسف',
  brideNameAr: 'أميرة',
  venueName: 'Beldi Country Club',
  venueCity: 'Marrakech, Morocco',
};
const REQUIRED_FIELDS = ['brideName', 'groomName', 'brideNameAr', 'groomNameAr', 'venueName', 'venueCity', 'weddingDate'];

function defaultsFor(template) {
  const timeline = {};
  template.timelineStages.forEach((key) => {
    timeline[key] = STAGE_DEFAULT_HOURS[key] ?? 18;
  });
  const sections = {};
  template.optionalSections.forEach((s) => {
    sections[s.key] = true;
  });
  return {
    occasionType: template.occasionTypes[0],
    language: template.languages[0],
    groomName: '', brideName: '', groomNameAr: '', brideNameAr: '',
    venueName: '', venueCity: '', venueMapQuery: '', weddingDate: '',
    timeline, sections, extra: {},
  };
}

function buildPayload(values, template, { withPlaceholders }) {
  const pick = (key) => {
    const v = (values[key] || '').trim();
    if (v) return v;
    return withPlaceholders ? PLACEHOLDERS[key] || '' : '';
  };
  const timeline = template.timelineStages.map((key) => ({
    key,
    hour: parseInt(values.timeline?.[key], 10) || 18,
  }));
  const hiddenSections = template.optionalSections
    .map((s) => s.key)
    .filter((key) => values.sections?.[key] === false);

  const payload = {
    templateId: template.id,
    occasionType: values.occasionType,
    language: values.language,
    groomName: pick('groomName'),
    brideName: pick('brideName'),
    groomNameAr: pick('groomNameAr'),
    brideNameAr: pick('brideNameAr'),
    venueName: pick('venueName'),
    venueCity: pick('venueCity'),
    venueMapQuery: (values.venueMapQuery || '').trim(),
    weddingDate: values.weddingDate || (withPlaceholders ? new Date().toISOString().slice(0, 10) : ''),
    timeline,
    hiddenSections,
  };
  Object.entries(values.extra || {}).forEach(([k, v]) => {
    payload[k] = (v || '').trim();
  });
  return payload;
}

/**
 * خلصت الدعوات المجانية النهارده.
 *
 * الرسالة هنا مش "ممنوع" — هي "خلصت النهارده، وفيه طريق أحسن".
 * فبنقول بالظبط امتى بيرجع الرصيد، وبنحط الترقية جنبها بميزتها
 * الحقيقية (تعديل أكبر) مش مجرد زرار "اشترك".
 */
function QuotaExhausted({ hours }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[20px] border border-brass/40 bg-brass/[0.07] p-5 text-center">
      <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brass/20 text-brass">
        <Clock size={19} />
      </span>
      <h3 className="mb-1.5 font-serif text-[17px] font-bold text-ink">{t('create.quotaOutTitle')}</h3>
      <p className="mx-auto mb-4 max-w-[40ch] text-[13px] leading-[1.9] text-ink-dim">
        {t('create.quotaOutBody', { count: hours })}
      </p>
      <div className="mb-4 space-y-1.5 text-start">
        {['quotaPerk1', 'quotaPerk2', 'quotaPerk3'].map((k) => (
          <div key={k} className="flex items-start gap-2 text-[12.5px] text-ink">
            <Check size={13} className="mt-1 shrink-0 text-emerald" />
            {t(`create.${k}`)}
          </div>
        ))}
      </div>
      <Link
        to="/packages"
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-l from-brass to-brass-soft py-3.5 text-[14px] font-extrabold text-[#241608] hover:brightness-105"
      >
        <Crown size={15} /> {t('create.quotaOutCta')}
      </Link>
    </div>
  );
}

export default function CreateInvitationPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const { data: templates, isLoading: templatesLoading } = useGetTemplatesQuery(i18n.language);
  const { data: meData } = useGetMeQuery();
  const [preview, { data: previewHtml }] = usePreviewMutation();
  const [createInvitation, { isLoading: creating }] = useCreateInvitationMutation();

  const template = useMemo(() => templates?.find((t) => t.id === templateId), [templates, templateId]);
  const { register, watch, reset, handleSubmit, formState } = useForm({ defaultValues: {} });
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState(null);
  // الرصيد المجاني اليومي. بنقراه من السيرفر (مش من الكوكي) — الواجهة
  // للشكل بس، القرار الحقيقي عند السيرفر في كل الأحوال.
  const { data: quota } = useGetFreeQuotaQuery();
  // لو السيرفر رفض بسبب الرصيد، بنعتمد على رده هو
  const [quotaError, setQuotaError] = useState(null);

  // التصميم المدفوع للمشتركين بس — مش لأي حساب مجاني. لو حد فتح
  // اللينك ده مباشرة من غير باقة، بنوديه صفحة الباقات بدل ما يقعد
  // يملا فورم والسيرفر هيرفضه في الآخر.
  const sub = meData?.user?.subscription;
  const subscribed = !!sub && !!sub.packageId && sub.status !== 'suspended'
    && (sub.invitationsLeft || 0) > 0;
  const locked = !!template?.isPremium && !subscribed;

  // المشترك مالوش دعوة بالرصيد المجاني — دعواته من باقته
  const showQuota = !!quota && !quota.subscribed && !subscribed;
  const quotaOut = !!quotaError || (showQuota && quota.remaining <= 0);
  const quotaHours = quotaError?.resetsInHours || quota?.resetsInHours || 24;

  useEffect(() => {
    if (template) reset(defaultsFor(template));
  }, [template, reset]);

  // ملحوظة: مفيش نافذة تسجيل بتفتح لوحدها هنا. كانت بتفتح قبل ما رد
  // السيرفر بحالة الدخول يوصل أصلًا، فكانت بتطلع لعميل داخل فعلاً.
  // وشاشة القفل نفسها فيها الخطوتين الواضحين (الباقات والمعاينة).

  const values = watch();
  useEffect(() => {
    if (!template || locked) return undefined;
    const t = setTimeout(() => {
      preview(buildPayload(values, template, { withPlaceholders: true }));
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values), template, locked]);

  async function onSubmit(vals) {
    setSubmitError('');
    const missing = REQUIRED_FIELDS.some((f) => !(vals[f] || '').trim());
    if (missing) {
      setSubmitError(t('create.required'));
      return;
    }
    try {
      const data = await createInvitation(buildPayload(vals, template, { withPlaceholders: false })).unwrap();
      setResult(data);
    } catch (err) {
      // رصيده المجاني خلص؟ ده مش خطأ — ده عرض ترقية
      if (err?.data?.code === 'FREE_QUOTA') {
        setQuotaError(err.data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setSubmitError(err?.data?.error || t('create.genericError'));
    }
  }

  if (templatesLoading) return null;
  if (!template) {
    return (
      <div className="p-10 text-center text-ink-dim">
        {t('create.notFound')} <Link to="/" className="text-rose underline">{t('create.backToGallery')}</Link>
      </div>
    );
  }
  if (locked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brass/15 text-brass">
          <Lock size={20} />
        </span>
        <h1 className="font-serif text-[21px] font-bold text-ink">{t('create.lockedTitle')}</h1>
        <p className="max-w-[42ch] text-[13.5px] leading-[1.9] text-ink-dim">
          {t('create.lockedMessage')}
        </p>
        <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
          <Link
            to="/packages"
            className="rounded-full bg-gradient-to-l from-brass to-brass-soft px-7 py-3 text-[13.5px] font-extrabold text-[#241608] hover:brightness-105"
          >
            {t('create.lockedCta')}
          </Link>
          <a
            href={`/preview-sample/${template.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-ink px-7 py-3 text-[13.5px] font-bold text-ink hover:bg-ink/5"
          >
            {t('create.lockedPreviewCta')}
          </a>
        </div>
        <Link to="/" className="mt-1 text-[12.5px] text-ink-dim underline">
          {t('create.backToGallery')}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,560px)_minmax(0,480px)]">
      <div className="px-6 pb-24 pt-8 lg:px-11">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-dim hover:text-rose"
        >
          <ArrowRight size={15} /> {t('create.back')}
        </button>

        <div className="mb-1.5 font-serif text-xl italic font-bold text-rose">{t('create.brand', { name: template.name })}</div>
        <h1 className="mb-2 font-serif text-[clamp(26px,3.6vw,33px)] font-bold text-ink">
          {t('create.title')}
        </h1>
        <p className="mb-7.5 max-w-[52ch] text-[15px] text-ink-dim">
          {t('create.subtitle')}
        </p>

        {/* الرصيد المجاني اليومي — فوق خالص، قبل ما يملا أي حاجة.
            محدش يستاهل يملا فورم كامل وبعدين يتقاله "خلص رصيدك". */}
        {showQuota && !quotaOut && !result && (
          <p className="mb-6 flex items-center justify-center gap-1.5 rounded-xl bg-emerald/[0.07] px-4 py-2.5 text-[12.5px] text-emerald">
            <Sparkles size={13} />
            {t('create.quotaLeft', { count: quota.remaining, limit: quota.limit })}
          </p>
        )}

        {result ? (
          <ResultCard path={result.path} onReset={() => setResult(null)} />
        ) : quotaOut ? (
          <QuotaExhausted hours={quotaHours} />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <fieldset className="mb-7 border-0 p-0">
              <legend className="mb-3.5 text-xs font-bold uppercase tracking-[0.15em] text-emerald">{t('create.occasion')}</legend>
              <ChoiceCards
                name="occasionType"
                register={register}
                options={template.occasionTypes.map((o) => ({ value: o, label: t(`occasions.${o}`, { defaultValue: o }) }))}
              />
            </fieldset>

            <fieldset className="mb-7 border-0 p-0">
              <legend className="mb-3.5 text-xs font-bold uppercase tracking-[0.15em] text-emerald">{t('create.language')}</legend>
              <ChoiceCards
                name="language"
                register={register}
                options={template.languages.map((l) => ({ value: l, label: t(`languages.${l}`, { defaultValue: l }) }))}
              />
            </fieldset>

            <fieldset className="mb-7 border-0 p-0">
              <legend className="mb-3.5 text-xs font-bold uppercase tracking-[0.15em] text-emerald">{t('create.names')}</legend>
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] text-ink-dim">{t('create.groomLatin')}</label>
                  <input
                    placeholder={PLACEHOLDERS.groomName}
                    maxLength={60}
                    className="border-0 border-b border-line bg-transparent px-0.5 py-2.5 text-base focus:border-rose focus:outline-none"
                    {...register('groomName')}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] text-ink-dim">{t('create.brideLatin')}</label>
                  <input
                    placeholder={PLACEHOLDERS.brideName}
                    maxLength={60}
                    className="border-0 border-b border-line bg-transparent px-0.5 py-2.5 text-base focus:border-rose focus:outline-none"
                    {...register('brideName')}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] text-ink-dim">{t('create.groomArabic')}</label>
                  <input
                    placeholder={PLACEHOLDERS.groomNameAr}
                    maxLength={60}
                    className="border-0 border-b border-line bg-transparent px-0.5 py-2.5 text-base focus:border-rose focus:outline-none"
                    {...register('groomNameAr')}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] text-ink-dim">{t('create.brideArabic')}</label>
                  <input
                    placeholder={PLACEHOLDERS.brideNameAr}
                    maxLength={60}
                    className="border-0 border-b border-line bg-transparent px-0.5 py-2.5 text-base focus:border-rose focus:outline-none"
                    {...register('brideNameAr')}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="mb-7 border-0 p-0">
              <legend className="mb-3.5 text-xs font-bold uppercase tracking-[0.15em] text-emerald">{t('create.venueSection')}</legend>
              <div className="mb-4 flex flex-col gap-1.5">
                <label className="text-[13px] text-ink-dim">{t('create.venueName')}</label>
                <input
                  placeholder={PLACEHOLDERS.venueName}
                  maxLength={100}
                  className="border-0 border-b border-line bg-transparent px-0.5 py-2.5 text-base focus:border-rose focus:outline-none"
                  {...register('venueName')}
                />
              </div>
              <div className="mb-4 flex flex-col gap-1.5">
                <label className="text-[13px] text-ink-dim">{t('create.venueCity')}</label>
                <input
                  placeholder={PLACEHOLDERS.venueCity}
                  maxLength={100}
                  className="border-0 border-b border-line bg-transparent px-0.5 py-2.5 text-base focus:border-rose focus:outline-none"
                  {...register('venueCity')}
                />
              </div>
              <div className="mb-4 flex flex-col gap-1.5">
                <label className="text-[13px] text-ink-dim">{t('create.weddingDate')}</label>
                <input
                  type="date"
                  className="border-0 border-b border-line bg-transparent px-0.5 py-2.5 text-base focus:border-rose focus:outline-none"
                  {...register('weddingDate')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] text-ink-dim">{t('create.mapLink')}</label>
                <input
                  placeholder={t('create.mapPlaceholder')}
                  maxLength={300}
                  className="border-0 border-b border-line bg-transparent px-0.5 py-2.5 text-base focus:border-rose focus:outline-none"
                  {...register('venueMapQuery')}
                />
                <div className="-mt-1 text-xs text-ink-dim opacity-85">
                  {t('create.mapHint')}
                </div>
              </div>
            </fieldset>

            <ExtraFields fields={template.extraFields || []} register={register} />

            <fieldset className="mb-7 border-0 p-0">
              <legend className="mb-3.5 text-xs font-bold uppercase tracking-[0.15em] text-emerald">
                {t('create.timeline')}
              </legend>
              <TimelineFields stages={template.timelineStages} register={register} />
            </fieldset>

            <fieldset className="mb-7 border-0 p-0">
              <legend className="mb-3.5 text-xs font-bold uppercase tracking-[0.15em] text-emerald">
                {t('create.sections')}
              </legend>
              <SectionToggles sections={template.optionalSections} register={register} />
            </fieldset>

            <button
              type="submit"
              disabled={creating || formState.isSubmitting}
              className="w-full rounded-full bg-night py-4 font-extrabold text-ivory transition-colors hover:bg-emerald disabled:cursor-progress disabled:bg-ink-dim"
            >
              {creating ? t('create.submitting') : t('create.submit')}
            </button>
            {submitError && <p className="mt-4 text-sm text-error">{submitError}</p>}
          </form>
        )}
      </div>

      <LivePreviewPanel html={previewHtml} />
    </div>
  );
}
