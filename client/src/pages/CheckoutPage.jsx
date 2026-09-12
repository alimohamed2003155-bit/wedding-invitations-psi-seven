// صفحة الدفع — /checkout/:packageId
//
// ليه صفحة مستقلة: قبل كده العميل كان بيضغط "اطلب الباقة" في نص صفحة
// طولها 5 شاشات، والزرار كان بيغيّر كلمة بس، وبيانات التحويل تحت في
// آخر الصفحة. يعني اللحظة الوحيدة اللي بيدفع فيها فلوس كانت أضعف لحظة
// في الموقع. دلوقتي بقت صفحة واحدة بتقوله بالترتيب: بتدفع كام، لمين،
// وإيه اللي بعد كده.
//
// السعر وبيانات التحويل الاتنين بييجوا من السيرفر حسب دولة العميل
// (مصر ← جنيه + فودافون كاش، غيرها ← دولار + تحويل بنكي).
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  ArrowRight, Check, Copy, Smartphone, Landmark, Upload, Loader2,
  ShieldCheck, Clock, AlertCircle, Sparkles,
} from 'lucide-react';
import {
  useGetPackagesQuery, useGetPaymentInfoQuery, useOrderPackageMutation,
  useUploadPaymentProofMutation, useGetMeQuery,
} from '../store/api.js';
import { openAuthModal } from '../store/uiSlice.js';
import { tooBig, sizeError, uploadError } from '../lib/uploadLimits.js';
import Footer from '../components/Footer.jsx';

/**
 * خانة بيانات جنب بعضها — كل واحدة كارت مستقل فيه العنوان فوق والقيمة
 * تحته كاملة، والكارت كله زرار نسخ.
 *
 * ليه كارت مش صف: الأرقام دي (حساب بنكي، IBAN، محفظة) بتتكتب غلط
 * بسهولة، والصف الأفقي كان بيزنق الرقم في نص المساحة ويقصّه. الكارت
 * بيدّي الرقم السطر بتاعه كامل، والمساحة كلها هدف للضغط — وده أهم حاجة
 * على الموبايل.
 */
function CopyTile({ label, value, wide }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value).then(
        () => { setCopied(true); setTimeout(() => setCopied(false), 1800); },
        () => {}
      )}
      className={`group relative flex min-w-0 flex-col gap-1.5 rounded-2xl border p-3 text-start transition ${
        copied ? 'border-ok bg-ok/[0.07]' : 'border-line bg-ivory/60 hover:border-ink/25 active:bg-ink/5'
      } ${wide ? 'col-span-2' : ''}`}
    >
      {/* العنوان بيتحول لـ"اتنسخ" مكانه — من غير سطر زيادة فاضي ولا
          قفزة في التصميم وقت الضغط */}
      <span className={`flex items-center justify-between gap-2 text-[11.5px] font-bold ${
        copied ? 'text-ok' : 'text-ink-dim'
      }`}
      >
        <span className="truncate">{copied ? t('checkout.copied') : label}</span>
        {copied
          ? <Check size={14} className="shrink-0 text-ok" />
          : <Copy size={14} className="shrink-0 text-ink-dim/70 transition group-hover:text-rose" />}
      </span>
      <span className="break-all font-mono text-[14.5px] font-bold leading-snug text-ink" dir="auto">
        {value}
      </span>
    </button>
  );
}

/** خطوة مرقّمة */
function Step({ n, title, done, children }) {
  return (
    <section className="rounded-[20px] border border-line bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-extrabold ${
            done ? 'bg-ok text-white' : 'bg-night text-brass-soft'
          }`}
        >
          {done ? <Check size={14} /> : n}
        </span>
        <h2 className="font-serif text-[16.5px] font-bold text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function CheckoutPage() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();

  const { data: meData, isLoading: meLoading } = useGetMeQuery();
  const { data: pkgData, isLoading: pkgLoading } = useGetPackagesQuery(i18n.language);
  const { data: payInfo, isLoading: payLoading } = useGetPaymentInfoQuery(undefined, {
    skip: !meData?.user,
  });
  const [orderPackage] = useOrderPackageMutation();
  const [uploadProof, { isLoading: uploading }] = useUploadPaymentProofMutation();

  const fileRef = useRef(null);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState('');
  const [orderReady, setOrderReady] = useState(false);

  const user = meData?.user ?? null;
  const pkg = pkgData?.packages?.find((p) => p.id === packageId) || null;

  // الطلب بيتسجّل أول ما يوصل الصفحة. السيرفر مبيعملش طلب جديد لو عنده
  // واحد معلّق لنفس الباقة، فإعادة تحميل الصفحة مش بتكرّر حاجة — وده
  // مهم عشان رفع الإيصال محتاج طلب معلّق موجود فعلاً.
  useEffect(() => {
    let alive = true;
    if (!user || !pkg || orderReady) return undefined;
    orderPackage({ packageId: pkg.id }).unwrap()
      .then(() => { if (alive) setOrderReady(true); })
      .catch((err) => {
        if (alive) setError(err?.data?.error || t('checkout.orderFailed'));
      });
    return () => { alive = false; };
  }, [user, pkg, orderReady, orderPackage, t]);

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    if (tooBig(file)) { setError(sizeError(file)); return; }
    try {
      const fd = new FormData();
      fd.append('file', file);
      await uploadProof(fd).unwrap();
      setUploaded(true);
    } catch (err) {
      setError(uploadError(err, t));
    }
  }

  // ===== حالات ما قبل الصفحة =====
  if (meLoading || pkgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-ink-dim">
        <Loader2 size={17} className="animate-spin" /> {t('packages.loading')}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="font-serif text-[19px] font-bold text-ink">{t('packages.authTitle')}</p>
        <p className="max-w-[44ch] text-[13.5px] leading-[1.9] text-ink-dim">{t('packages.authBody')}</p>
        <button
          type="button"
          onClick={() => dispatch(openAuthModal('register'))}
          className="rounded-full bg-gradient-to-l from-brass to-brass-soft px-7 py-3 font-extrabold text-[#241608]"
        >
          {t('packages.authRegister')}
        </button>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertCircle size={24} className="text-ink-dim" />
        <p className="text-ink-dim">{t('checkout.notFound')}</p>
        <Link to="/packages" className="text-rose underline">{t('checkout.backToPackages')}</Link>
      </div>
    );
  }

  const isVodafone = payInfo?.method === 'vodafone';
  const v = payInfo?.vodafone || {};
  const b = payInfo?.bank || {};
  const hasPayData = isVodafone ? !!v.number : !!(b.accountNumber || b.iban);

  return (
    <div className="min-h-screen bg-ivory">
      {/* pb للشريط الثابت تحت على الموبايل */}
      <div className="mx-auto max-w-2xl px-4 pb-40 pt-6 sm:px-6 sm:pb-16">
        <Link
          to="/packages"
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-ink-dim hover:text-rose"
        >
          <ArrowRight size={15} /> {t('checkout.backToPackages')}
        </Link>

        <h1 className="mb-1 font-serif text-[clamp(22px,5vw,30px)] font-bold text-ink">
          {t('checkout.title')}
        </h1>
        <p className="mb-6 text-[13.5px] leading-relaxed text-ink-dim">{t('checkout.subtitle')}</p>

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-xl bg-error/10 px-4 py-3 text-[12.5px] text-error">
            <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {/* ===== ملخص الطلب ===== */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-5 overflow-hidden rounded-[22px] border border-brass/40 bg-gradient-to-b from-[#0d1f18] to-night text-ivory"
        >
          <div className="relative p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(230,198,132,.16),transparent)]" />
            <div className="relative">
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-brass/15 px-3 py-1 text-[11px] font-bold text-brass-soft">
                <Sparkles size={11} /> {t('checkout.summary')}
              </div>
              <h2 className="mt-3 font-serif text-[22px] font-bold text-ivory">{pkg.name}</h2>
              <p className="mt-1 text-[13px] text-ivory/65">
                {t('packages.invitations', { count: pkg.invitations })}
              </p>

              <div className="mt-5 flex items-end justify-between border-t border-ivory/12 pt-4">
                <span className="text-[13px] text-ivory/65">{t('checkout.total')}</span>
                <span className="flex items-baseline gap-1.5">
                  <span className="font-serif text-[34px] font-bold leading-none text-brass-soft">
                    {pkg.price}
                  </span>
                  <span className="text-[13px] text-ivory/70">{pkg.currencyLabel}</span>
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="space-y-4">
          {/* ===== 1) التحويل ===== */}
          <Step n="1" title={t('checkout.step1')}>
            {payLoading ? (
              <p className="flex items-center gap-2 text-[13px] text-ink-dim">
                <Loader2 size={13} className="animate-spin" /> {t('packages.loading')}
              </p>
            ) : !hasPayData ? (
              <p className="rounded-xl bg-brass/10 px-4 py-3 text-[12.5px] text-[#7a5a1a]">
                {t('checkout.noPayData')}
              </p>
            ) : (
              <>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[12px] font-bold text-ink">
                  {isVodafone ? <Smartphone size={13} className="text-rose" /> : <Landmark size={13} className="text-rose" />}
                  {isVodafone ? t('payment.vodafoneTitle') : t('payment.bankTitle')}
                </div>

                {/* الخانات جنب بعض — عمودين حتى على الموبايل. الطويل
                    (الأسماء، IBAN، العنوان) بياخد العرض كله عشان
                    مايتقصّش */}
                <div className="grid grid-cols-2 gap-2.5">
                  {isVodafone ? (
                    <>
                      <CopyTile label={t('payment.vodafoneNumber')} value={v.number} />
                      <CopyTile label={t('payment.vodafoneHolder')} value={v.holderName} />
                    </>
                  ) : (
                    <>
                      <CopyTile label={t('payment.bank')} value={b.bankName} />
                      <CopyTile label={t('payment.accountNumber')} value={b.accountNumber} />
                      <CopyTile label={t('payment.accountNameAr')} value={b.accountNameAr} wide />
                      <CopyTile label={t('payment.accountNameEn')} value={b.accountNameEn} wide />
                      <CopyTile label={t('payment.iban')} value={b.iban} wide />
                      <CopyTile label={t('payment.swift')} value={b.swift} />
                      <CopyTile label={t('payment.address')} value={b.address} />
                    </>
                  )}
                </div>
                <p className="mt-2.5 text-center text-[11.5px] text-ink-dim">{t('checkout.tapToCopy')}</p>

                {/* المبلغ مكرر هنا بالقصد: ده آخر حاجة بيشوفها قبل ما
                    يفتح تطبيق التحويل */}
                <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald/[0.07] px-4 py-3">
                  <span className="text-[12.5px] font-bold text-emerald">{t('checkout.amountToSend')}</span>
                  <span className="font-serif text-[18px] font-bold text-emerald">
                    {pkg.price} {pkg.currencyLabel}
                  </span>
                </div>

                {(isVodafone ? v.note : b.note) && (
                  <p className="mt-3 text-[12.5px] leading-relaxed text-ink-dim">
                    {isVodafone ? v.note : b.note}
                  </p>
                )}
              </>
            )}
          </Step>

          {/* ===== 2) الإيصال ===== */}
          <Step n="2" title={t('checkout.step2')} done={uploaded}>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onPickFile}
            />
            {uploaded ? (
              <div className="rounded-2xl border border-ok/40 bg-ok/[0.07] p-5 text-center">
                <Check size={22} className="mx-auto text-ok" />
                <p className="mt-2 text-[13.5px] font-bold text-ok">{t('payment.proofUploaded')}</p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 text-[12px] font-bold text-ink-dim underline"
                >
                  {t('checkout.reupload')}
                </button>
              </div>
            ) : (
              <>
                <p className="mb-4 text-[13px] leading-relaxed text-ink-dim">{t('checkout.step2Hint')}</p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-night py-3.5 text-[13.5px] font-bold text-ivory transition hover:bg-emerald disabled:opacity-60"
                >
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  {uploading ? t('payment.uploading') : t('payment.uploadProof')}
                </button>
                <p className="mt-2.5 text-center text-[11.5px] text-ink-dim">{t('payment.proofHint')}</p>
              </>
            )}
          </Step>

          {/* ===== 3) التفعيل ===== */}
          <Step n="3" title={t('checkout.step3')}>
            <p className="text-[13px] leading-[1.9] text-ink-dim">{t('checkout.step3Hint')}</p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <div className="flex items-start gap-2.5 rounded-xl bg-ivory/70 px-3.5 py-3">
                <Clock size={14} className="mt-0.5 shrink-0 text-emerald" />
                <span className="text-[12.5px] text-ink-dim">{t('checkout.perk1')}</span>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-ivory/70 px-3.5 py-3">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald" />
                <span className="text-[12.5px] text-ink-dim">{t('checkout.perk2')}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-line py-3 text-[13px] font-bold text-ink transition hover:border-ink/35"
            >
              {t('checkout.goDashboard')}
            </button>
          </Step>
        </div>
      </div>

      {/* شريط ثابت تحت على الموبايل: المبلغ قدامه دايمًا وهو بيقرا */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[11.5px] text-ink-dim">{pkg.name}</div>
            <div className="font-serif text-[19px] font-bold leading-tight text-emerald">
              {pkg.price} <span className="text-[12px] font-sans text-ink-dim">{pkg.currencyLabel}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => (uploaded ? navigate('/dashboard') : fileRef.current?.click())}
            disabled={uploading}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-l from-brass to-brass-soft px-5 py-3 text-[13px] font-extrabold text-[#241608] disabled:opacity-60"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" />
              : uploaded ? <Check size={14} /> : <Upload size={14} />}
            {uploaded ? t('checkout.goDashboard') : t('payment.uploadProof')}
          </button>
        </div>
      </div>

      <div className="hidden sm:block"><Footer /></div>
    </div>
  );
}
