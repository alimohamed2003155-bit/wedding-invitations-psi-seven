// صفحة الباقات — /packages
//
// فلسفة الصفحة: الباقات التلاتة سُلّم، مش تلات حاجات منفصلة. كل باقة
// فيها كل اللي في اللي قبلها زيادة حاجات. فبدل ما نكرر نفس السبع
// مميزات في التلات كروت (وده كان بيخلي الصفحة 4.5 شاشة على الموبايل
// والعميل مش قادر يقارن)، كل كارت بيقول "كل اللي في اللي قبلها +
// الجديد". النتيجة: الفرق بين الباقات بيبان من نظرة واحدة، والترقية
// بتبقى قرار واضح مش مقارنة مرهقة.
//
// والضغط على أي باقة بيودّي لصفحة الدفع على طول (/checkout/:id).
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion } from 'motion/react';
import {
  Check, ArrowRight, Sparkles, Lock, Crown, Plus, ShieldCheck,
  Clock, Infinity as InfinityIcon, ArrowLeft,
} from 'lucide-react';
import { useGetPackagesQuery, useGetMeQuery } from '../store/api.js';
import { openAuthModal } from '../store/uiSlice.js';
import EditorDemo from '../components/EditorDemo.jsx';
import Footer from '../components/Footer.jsx';

/** بيرجّع مميزات الباقة دي اللي مش في اللي قبلها */
function deltaFeatures(pkg, prev) {
  if (!prev) return pkg.features;
  const had = new Set(prev.features.map((f) => f.key));
  return pkg.features.filter((f) => !had.has(f.key));
}

function PackageCard({ pkg, prev, index, highlighted, onOrder, currentPackageId, cheapestPerUnit }) {
  const { t } = useTranslation();
  const isSubscribed = currentPackageId === pkg.id;
  const hasAnySubscription = !!currentPackageId;

  const extras = deltaFeatures(pkg, prev);
  const perUnit = Math.round(pkg.price / Math.max(1, pkg.invitations));
  // كام بتوفّر في الدعوة الواحدة مقارنة بأرخص باقة — ده الرقم اللي
  // بيخلي الباقة الأكبر تبان قيمة مش سعر
  const savePct = cheapestPerUnit && perUnit < cheapestPerUnit
    ? Math.round((1 - perUnit / cheapestPerUnit) * 100)
    : 0;

  const dark = highlighted && !isSubscribed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className={`relative flex flex-col overflow-hidden rounded-[24px] border transition ${
        isSubscribed
          ? 'border-ok bg-ok/[0.05]'
          : dark
            ? 'border-brass/60 bg-gradient-to-b from-[#0e2119] to-night shadow-[0_24px_60px_-28px_rgba(8,19,15,.75)] lg:-my-3'
            : 'border-line bg-card'
      }`}
    >
      {/* الشريط العلوي: الباقة المميزة ليها لمعة */}
      {dark && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(230,198,132,.16),transparent)]" />
      )}

      <div className="relative p-6 sm:p-7">
        {/* ===== الشارة ===== */}
        <div className="mb-4 flex min-h-[26px] items-center gap-2">
          {isSubscribed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/15 px-3 py-1 text-[11.5px] font-bold text-ok">
              <Check size={12} /> {t('packages.subscribed')}
            </span>
          ) : (
            <>
              {highlighted && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brass/20 px-3 py-1 text-[11.5px] font-bold text-brass-soft">
                  <Sparkles size={12} /> {t('packages.popular')}
                </span>
              )}
              {savePct >= 15 && (
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11.5px] font-bold ${
                  dark ? 'bg-ok/20 text-ok' : 'bg-emerald/10 text-emerald'
                }`}
                >
                  {t('packages.save', { pct: savePct })}
                </span>
              )}
              {hasAnySubscription && !highlighted && !savePct && (
                <span className="inline-flex rounded-full bg-ink/8 px-3 py-1 text-[11.5px] font-bold text-ink-dim">
                  {t('packages.notSubscribed')}
                </span>
              )}
            </>
          )}
        </div>

        {/* ===== الاسم والسعر ===== */}
        <h3 className={`font-serif text-[23px] font-bold ${dark ? 'text-ivory' : 'text-ink'}`}>
          {pkg.name}
        </h3>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={`font-serif text-[42px] font-bold leading-none ${dark ? 'text-brass-soft' : 'text-emerald'}`}>
            {pkg.price}
          </span>
          <span className={`text-[14px] ${dark ? 'text-ivory/70' : 'text-ink-dim'}`}>{pkg.currencyLabel}</span>
          <span className={`text-[12.5px] ${dark ? 'text-ivory/45' : 'text-ink-dim/80'}`}>
            · {t('packages.oneTime')}
          </span>
        </div>

        {/* عدد الدعوات + سعر الدعوة الواحدة — الرقم اللي بيحسم القرار */}
        <div className={`mt-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${
          dark ? 'bg-ivory/[0.06]' : 'bg-ivory/70'
        }`}
        >
          <span className={`text-[14px] font-bold ${dark ? 'text-ivory' : 'text-ink'}`}>
            {t('packages.invitations', { count: pkg.invitations })}
          </span>
          <span className={`shrink-0 text-[12px] ${dark ? 'text-brass-soft' : 'text-emerald'}`}>
            {t('packages.perInvitation', { price: perUnit, currency: pkg.currencyLabel })}
          </span>
        </div>

        {/* ===== المميزات ===== */}
        <div className={`mt-5 border-t pt-5 ${dark ? 'border-ivory/12' : 'border-line'}`}>
          <div className={`mb-3.5 flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.12em] ${
            dark ? 'text-brass-soft' : 'text-emerald'
          }`}
          >
            {prev ? (
              <>
                <Plus size={13} />
                {t('packages.everythingIn', { name: prev.name })}
              </>
            ) : (
              t('packages.included')
            )}
          </div>

          <ul className="flex flex-col gap-3.5">
            {extras.map((f) => (
              <li key={f.key} className="flex items-start gap-2.5">
                <span className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${
                  dark ? 'bg-brass/20 text-brass-soft' : 'bg-emerald/10 text-emerald'
                }`}
                >
                  <Check size={11} strokeWidth={3} />
                </span>
                <div className="min-w-0">
                  <div className={`text-[14px] font-bold leading-snug ${dark ? 'text-ivory' : 'text-ink'}`}>
                    {f.label}
                  </div>
                  {f.desc && (
                    <p className={`mt-1 text-[12.5px] leading-[1.75] ${dark ? 'text-ivory/60' : 'text-ink-dim'}`}>
                      {f.desc}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex-1" />

      {/* ===== الزرار ===== */}
      <div className="relative px-6 pb-6 sm:px-7 sm:pb-7">
        <button
          type="button"
          onClick={() => onOrder(pkg)}
          disabled={isSubscribed}
          className={`group flex w-full items-center justify-center gap-2 rounded-full py-4 text-[14.5px] font-extrabold transition disabled:opacity-70 ${
            isSubscribed
              ? 'bg-ok text-white'
              : dark
                ? 'bg-gradient-to-l from-brass to-brass-soft text-[#241608] hover:brightness-105'
                : 'bg-night text-ivory hover:bg-emerald'
          }`}
        >
          {isSubscribed ? (
            <>
              <Check size={16} /> {t('packages.currentPlan')}
            </>
          ) : (
            <>
              {highlighted && <Crown size={15} />}
              {t('packages.order')}
              <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-1 rtl:rotate-180 rtl:group-hover:translate-x-1" />
            </>
          )}
        </button>
        {!isSubscribed && (
          <p className={`mt-2.5 text-center text-[11.5px] ${dark ? 'text-ivory/45' : 'text-ink-dim'}`}>
            {t('packages.ctaNote')}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function PackagesPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useGetPackagesQuery(i18n.language);
  const { data: meData } = useGetMeQuery();
  const user = meData?.user ?? null;

  /**
   * الضغط على الباقة بيوديه صفحة الدفع — مش بيغيّر كلمة الزرار ويسيبه
   * يدوّر على بيانات التحويل في آخر الصفحة.
   */
  function handleOrder(pkg) {
    if (!user) {
      dispatch(openAuthModal('register'));
      return;
    }
    navigate(`/checkout/${pkg.id}`);
  }

  const sub = data?.subscription;
  const packages = data?.packages || [];
  // أغلى سعر للدعوة الواحدة = الأساس اللي بنحسب عليه التوفير
  const cheapestPerUnit = packages.length
    ? Math.max(...packages.map((p) => p.price / Math.max(1, p.invitations)))
    : 0;

  return (
    <div className="min-h-screen bg-ivory">
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-5 sm:px-6 sm:pt-10">
        <Link to="/" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-ink-dim hover:text-rose sm:mb-8 sm:text-sm">
          <ArrowRight size={15} /> {t('packages.back')}
        </Link>

        {/* ===== المقدمة ===== */}
        <div className="mx-auto mb-7 max-w-[58ch] text-center sm:mb-12">
          <div className="mb-2 text-[11.5px] font-extrabold uppercase tracking-[0.3em] text-emerald sm:mb-3 sm:text-[12.5px]">
            {t('packages.eyebrow')}
          </div>
          <h1 className="mb-2.5 font-serif text-[26px] font-bold leading-[1.3] text-ink sm:mb-3 sm:text-[clamp(30px,4vw,42px)]">
            {t('packages.title')}
          </h1>
          <p className="text-[14px] leading-[1.85] text-ink-dim sm:text-[15.5px]">
            {t('packages.subtitle')}
          </p>
        </div>

        {sub?.packageId && sub.invitationsLeft > 0 && (
          <div className="mx-auto mb-7 max-w-lg rounded-2xl border border-emerald/30 bg-emerald/[0.07] px-5 py-3.5 text-center text-[13.5px] text-emerald sm:mb-10 sm:px-6 sm:py-4 sm:text-[14.5px]">
            <span dangerouslySetInnerHTML={{ __html: t('packages.activeNotice', { count: sub.invitationsLeft }) }} />
          </div>
        )}

        {/* الفيديو قبل الأسعار: العميل لازم يشوف اللي هيدفع عشانه قبل
            ما يشوف الرقم — مش بعده */}
        <div className="mx-auto mb-8 max-w-3xl sm:mb-11">
          <EditorDemo />
          <p className="mt-3 text-center text-[12.5px] text-ink-dim">{t('demo.underPrices')}</p>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-ink-dim">{t('packages.loading')}</p>
        ) : data?.requiresAuth ? (
          // الأسعار نفسها بتختلف حسب دولة العميل، ودولته بتتعرف من حسابه.
          // فبدل ما نوريه سعر يتغيّر قدامه بعد ما يسجّل، بنستناه يسجّل.
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-lg rounded-[24px] border border-brass/40 bg-gradient-to-b from-brass/[0.08] to-transparent p-7 text-center sm:p-8"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brass/15">
              <Lock size={20} className="text-brass" />
            </div>
            <h2 className="mb-2 font-serif text-xl font-bold text-ink">{t('packages.authTitle')}</h2>
            <p className="mb-6 text-[13.5px] leading-relaxed text-ink-dim">{t('packages.authBody')}</p>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
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
          <>
            {/* الباقات تحت بعض على الموبايل، وجنب بعض على الشاشة الكبيرة */}
            <div className="grid items-stretch gap-5 lg:grid-cols-3 lg:gap-6">
              {packages.map((pkg, i) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  prev={i > 0 ? packages[i - 1] : null}
                  index={i}
                  highlighted={pkg.id === 'plus'}
                  onOrder={handleOrder}
                  currentPackageId={sub?.packageId || null}
                  cheapestPerUnit={cheapestPerUnit}
                />
              ))}
            </div>

            {/* ===== صف الطمأنة ===== */}
            {/* آخر حاجة بيقراها قبل ما يضغط — بيرد على المخاوف التلاتة
                اللي بتوقف أي حد قبل الدفع */}
            <div className="mx-auto mt-8 grid max-w-3xl gap-2.5 sm:mt-12 sm:grid-cols-3">
              {[
                { icon: Clock, key: 'packages.trust1' },
                { icon: InfinityIcon, key: 'packages.trust2' },
                { icon: ShieldCheck, key: 'packages.trust3' },
              ].map(({ icon: Icon, key }) => (
                <div
                  key={key}
                  className="flex items-center gap-2.5 rounded-2xl border border-line bg-card px-4 py-3.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald/10 text-emerald">
                    <Icon size={15} />
                  </span>
                  <span className="text-[12.5px] font-bold leading-snug text-ink">{t(key)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {!user && !isLoading && (
          <div className="mx-auto mt-9 max-w-2xl rounded-[22px] border border-line bg-card p-6 text-center sm:mt-12 sm:p-7">
            <h2 className="mb-2 font-serif text-xl font-bold text-ink">{t('packages.signupTitle')}</h2>
            <p className="mb-5 text-[13.5px] leading-relaxed text-ink-dim sm:text-[14.5px]">
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
