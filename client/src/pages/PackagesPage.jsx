import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Check, ArrowRight, Sparkles, Lock, X } from 'lucide-react';
import {
  useGetPackagesQuery,
  useOrderPackageMutation,
  useGetMeQuery,
} from '../store/api.js';
import { openAuthModal } from '../store/uiSlice.js';
import Footer from '../components/Footer.jsx';
import PaymentInstructions from '../components/PaymentInstructions.jsx';

function PackageCard({ pkg, index, highlighted, onOrder, ordering, orderedId, currentPackageId }) {
  const { t } = useTranslation();
  const isOrdered = orderedId === pkg.id;
  // الباقة اللي هو مشترك فيها فعلاً بتتعلّم، والباقي بيبان إنه مش مشترك فيه
  const isSubscribed = currentPackageId === pkg.id;
  const hasAnySubscription = !!currentPackageId;

  return (
    <motion.div
      className={`relative flex flex-col rounded-[22px] border p-8 ${
        isSubscribed
          ? 'border-ok bg-ok/[0.06] text-ink shadow-lg'
          : highlighted
            ? 'border-brass bg-night text-ivory shadow-2xl'
            : 'border-line bg-card text-ink'
      }`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
    >
      {isSubscribed ? (
        <div className="mb-3 inline-flex items-center gap-1.5 self-start rounded-full bg-ok/15 px-3 py-1 text-[11.5px] font-bold text-ok">
          <Check size={12} /> {t('packages.subscribed')}
        </div>
      ) : hasAnySubscription ? (
        <div className="mb-3 inline-flex items-center gap-1.5 self-start rounded-full bg-ink/10 px-3 py-1 text-[11.5px] font-bold text-ink-dim">
          {t('packages.notSubscribed')}
        </div>
      ) : (
        highlighted && (
          <div className="mb-3 inline-flex items-center gap-1.5 self-start rounded-full bg-brass/20 px-3 py-1 text-[11.5px] font-bold text-brass-soft">
            <Sparkles size={12} /> {t('packages.popular')}
          </div>
        )
      )}

      <h3 className={`font-serif text-2xl font-bold ${highlighted ? 'text-ivory' : 'text-ink'}`}>{pkg.name}</h3>

      <div className="mt-4 flex items-baseline gap-2">
        <span className={`font-serif text-[44px] font-bold leading-none ${highlighted ? 'text-brass-soft' : 'text-emerald'}`}>
          {pkg.price}
        </span>
        <span className={highlighted ? 'text-ivory/70' : 'text-ink-dim'}>{pkg.currencyLabel}</span>
      </div>

      <div className={`mt-3 text-[15px] font-bold ${highlighted ? 'text-ivory' : 'text-ink'}`}>
        {t('packages.invitations', { count: pkg.invitations })}
      </div>

      <div className={`mt-5 border-t pt-5 ${highlighted ? 'border-ivory/15' : 'border-line'}`}>
        <div className={`mb-3 text-[11px] font-bold uppercase tracking-[0.14em] ${highlighted ? 'text-brass-soft' : 'text-emerald'}`}>
          {t('packages.included')}
        </div>

        <ul className="flex flex-1 flex-col gap-3.5">
          {pkg.features.map((f) => (
            <li key={f.key} className="flex items-start gap-2.5">
              <Check size={16} className={`mt-0.5 shrink-0 ${highlighted ? 'text-brass-soft' : 'text-emerald'}`} />
              <div>
                <div className={`text-[14px] font-bold ${highlighted ? 'text-ivory' : 'text-ink'}`}>{f.label}</div>
                {/* الشرح هو اللي بيخلي العميل يفهم الميزة فعلاً بدل
                    ما يقرا عنوان مبهم ويقارن بالسعر وبس */}
                {f.desc && (
                  <p className={`mt-0.5 text-[12.5px] leading-relaxed ${highlighted ? 'text-ivory/60' : 'text-ink-dim'}`}>
                    {f.desc}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* اللي مش في الباقة — ظاهر وباهت، عشان الفرق يبان من غير مقارنة */}
        {pkg.missing?.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2 border-t border-dashed pt-4 border-inherit">
            {pkg.missing.map((f) => (
              <li key={f.key} className="flex items-start gap-2.5 opacity-45">
                <X size={15} className={`mt-0.5 shrink-0 ${highlighted ? 'text-ivory/60' : 'text-ink-dim'}`} />
                <span className={`text-[13px] line-through ${highlighted ? 'text-ivory/70' : 'text-ink-dim'}`}>
                  {f.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => onOrder(pkg)}
        disabled={ordering || isOrdered || isSubscribed}
        className={`mt-7 rounded-full py-3.5 font-extrabold transition-colors disabled:opacity-70 ${
          isSubscribed
            ? 'bg-ok text-white'
            : highlighted
              ? 'bg-gradient-to-l from-brass to-brass-soft text-[#241608] hover:brightness-105'
              : 'bg-night text-ivory hover:bg-emerald'
        }`}
      >
        {isSubscribed
          ? t('packages.currentPlan')
          : isOrdered
            ? t('packages.ordered')
            : ordering
              ? '...'
              : t('packages.order')}
      </button>
    </motion.div>
  );
}

export default function PackagesPage() {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useGetPackagesQuery(i18n.language);
  const { data: meData } = useGetMeQuery();
  const [orderPackage, { isLoading: ordering }] = useOrderPackageMutation();
  const [orderedId, setOrderedId] = useState(null);
  const user = meData?.user ?? null;

  async function handleOrder(pkg) {
    if (!user) {
      dispatch(openAuthModal('register'));
      return;
    }
    try {
      await orderPackage({ packageId: pkg.id }).unwrap();
      setOrderedId(pkg.id);
    } catch {
      /* الخطأ نادر هنا؛ الزرار بيرجع لحالته لوحده */
    }
  }

  const sub = data?.subscription;

  return (
    <div className="min-h-screen bg-ivory">
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-ink-dim hover:text-rose">
          <ArrowRight size={15} /> {t('packages.back')}
        </Link>

        <div className="mx-auto mb-12 max-w-[60ch] text-center">
          <div className="mb-3 text-[12.5px] font-extrabold tracking-[0.3em] text-emerald uppercase">{t('packages.eyebrow')}</div>
          <h1 className="mb-3 font-serif text-[clamp(28px,4vw,42px)] font-bold text-ink">
            {t('packages.title')}
          </h1>
          <p className="text-[15.5px] text-ink-dim">
            {t('packages.subtitle')}
          </p>
        </div>

        {sub?.packageId && sub.invitationsLeft > 0 && (
          <div className="mx-auto mb-10 max-w-lg rounded-2xl border border-emerald/30 bg-emerald/[0.07] px-6 py-4 text-center text-[14.5px] text-emerald">
            <span dangerouslySetInnerHTML={{ __html: t('packages.activeNotice', { count: sub.invitationsLeft }) }} />
          </div>
        )}

        {isLoading ? (
          <p className="py-10 text-center text-ink-dim">{t('packages.loading')}</p>
        ) : data?.requiresAuth ? (
          // الأسعار نفسها بتختلف حسب دولة العميل، ودولته بتتعرف من حسابه.
          // فبدل ما نوريه سعر يتغيّر قدامه بعد ما يسجّل، بنستناه يسجّل.
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-lg rounded-[22px] border border-brass/40 bg-gradient-to-b from-brass/[0.08] to-transparent p-8 text-center"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brass/15">
              <Lock size={20} className="text-brass" />
            </div>
            <h2 className="mb-2 font-serif text-xl font-bold text-ink">{t('packages.authTitle')}</h2>
            <p className="mb-6 text-[14px] text-ink-dim">{t('packages.authBody')}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => dispatch(openAuthModal('register'))}
                className="rounded-full bg-gradient-to-l from-brass to-brass-soft px-7 py-3.5 font-extrabold text-[#241608] hover:brightness-105"
              >
                {t('packages.authRegister')}
              </button>
              <button
                type="button"
                onClick={() => dispatch(openAuthModal('login'))}
                className="rounded-full border border-ink px-7 py-3.5 font-bold text-ink hover:bg-ink/5"
              >
                {t('packages.authLogin')}
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {data?.packages?.map((pkg, i) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                index={i}
                highlighted={pkg.id === 'plus'}
                onOrder={handleOrder}
                ordering={ordering}
                orderedId={orderedId}
                currentPackageId={sub?.packageId || null}
              />
            ))}
          </div>
        )}

        {user ? (
          // بيانات التحويل بتختلف حسب بلد العميل (فودافون كاش للمصري،
          // حساب بنكي لغيره) وبتتحكم فيها من لوحة التحكم
          <PaymentInstructions />
        ) : (
          <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-line bg-card p-7 text-center">
            <h2 className="mb-2 font-serif text-xl font-bold text-ink">{t('packages.signupTitle')}</h2>
            <p className="mb-5 text-[14.5px] leading-relaxed text-ink-dim">
              {t('packages.signupText')}
            </p>
            <button
              type="button"
              onClick={() => dispatch(openAuthModal('register'))}
              className="inline-flex rounded-full bg-gradient-to-l from-brass to-brass-soft px-7 py-3 font-extrabold text-[#241608] hover:brightness-105"
            >
              {t('packages.signupCta')}
            </button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
