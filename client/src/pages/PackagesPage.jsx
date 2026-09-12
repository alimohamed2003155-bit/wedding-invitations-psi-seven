import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Check, ArrowRight, Sparkles, Lock, X, ChevronDown } from 'lucide-react';
import {
  useGetPackagesQuery,
  useGetMeQuery,
} from '../store/api.js';
import { openAuthModal } from '../store/uiSlice.js';
import useIsCompact from '../hooks/useIsCompact.js';
import Footer from '../components/Footer.jsx';

function PackageCard({ pkg, index, highlighted, onOrder, compact, currentPackageId }) {
  const { t } = useTranslation();
  // الباقة اللي هو مشترك فيها فعلاً بتتعلّم، والباقي بيبان إنه مش مشترك فيه
  const isSubscribed = currentPackageId === pkg.id;
  const hasAnySubscription = !!currentPackageId;
  // على الموبايل بنوري أهم 3 مميزات والباقي بزرار — الكارت كان بيطلع
  // أطول من الشاشة كذا مرة، فالعميل مكنش بيقدر يقارن أصلاً
  const [expanded, setExpanded] = useState(false);
  const showAll = !compact || expanded;
  const visible = showAll ? pkg.features : pkg.features.slice(0, 3);
  const restCount = pkg.features.length - visible.length;

  return (
    <motion.div
      className={`relative flex flex-col rounded-[22px] border ${compact ? 'p-5' : 'p-8'} ${
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

      <h3 className={`font-serif ${compact ? 'text-xl' : 'text-2xl'} font-bold ${highlighted ? 'text-ivory' : 'text-ink'}`}>
        {pkg.name}
      </h3>

      <div className="mt-3 flex items-baseline gap-2">
        <span className={`font-serif font-bold leading-none ${compact ? 'text-[36px]' : 'text-[44px]'} ${
          highlighted ? 'text-brass-soft' : 'text-emerald'
        }`}
        >
          {pkg.price}
        </span>
        <span className={highlighted ? 'text-ivory/70' : 'text-ink-dim'}>{pkg.currencyLabel}</span>
      </div>

      <div className={`mt-2 text-[14.5px] font-bold ${highlighted ? 'text-ivory' : 'text-ink'}`}>
        {t('packages.invitations', { count: pkg.invitations })}
      </div>

      <div className={`mt-4 border-t pt-4 ${highlighted ? 'border-ivory/15' : 'border-line'}`}>
        <div className={`mb-3 text-[11px] font-bold uppercase tracking-[0.14em] ${highlighted ? 'text-brass-soft' : 'text-emerald'}`}>
          {t('packages.included')}
        </div>

        <ul className="flex flex-1 flex-col gap-3">
          {visible.map((f) => (
            <li key={f.key} className="flex items-start gap-2.5">
              <Check size={16} className={`mt-0.5 shrink-0 ${highlighted ? 'text-brass-soft' : 'text-emerald'}`} />
              <div className="min-w-0">
                <div className={`text-[13.5px] font-bold ${highlighted ? 'text-ivory' : 'text-ink'}`}>{f.label}</div>
                {/* الشرح هو اللي بيخلي العميل يفهم الميزة فعلاً بدل
                    ما يقرا عنوان مبهم ويقارن بالسعر وبس */}
                {f.desc && showAll && (
                  <p className={`mt-0.5 text-[12.5px] leading-relaxed ${highlighted ? 'text-ivory/60' : 'text-ink-dim'}`}>
                    {f.desc}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* اللي مش في الباقة — ظاهر وباهت، عشان الفرق يبان من غير مقارنة */}
        {showAll && pkg.missing?.length > 0 && (
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

        {compact && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={`mt-3 inline-flex items-center gap-1 text-[12px] font-bold ${
              highlighted ? 'text-brass-soft' : 'text-rose'
            }`}
          >
            <ChevronDown size={13} />
            {t('packages.showAll', { count: restCount + (pkg.missing?.length || 0) })}
          </button>
        )}
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => onOrder(pkg)}
        disabled={isSubscribed}
        className={`mt-6 rounded-full py-3.5 font-extrabold transition-colors disabled:opacity-70 ${
          isSubscribed
            ? 'bg-ok text-white'
            : highlighted
              ? 'bg-gradient-to-l from-brass to-brass-soft text-[#241608] hover:brightness-105'
              : 'bg-night text-ivory hover:bg-emerald'
        }`}
      >
        {isSubscribed ? t('packages.currentPlan') : t('packages.order')}
      </button>
    </motion.div>
  );
}

export default function PackagesPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useGetPackagesQuery(i18n.language);
  const { data: meData } = useGetMeQuery();
  const compact = useIsCompact();
  const user = meData?.user ?? null;

  // السحب الأفقي على الموبايل + النقطة اللي تحت بتقول إنت فين
  const railRef = useRef(null);
  const [active, setActive] = useState(0);

  /**
   * الضغط على الباقة بيوديه صفحة الدفع — مش بيغيّر كلمة الزرار ويسيبه
   * يدوّر على بيانات التحويل في آخر الصفحة. اللحظة اللي بيقرر يدفع فيها
   * لازم يبقى قدامه فيها المبلغ وطريقة التحويل والخطوة اللي بعدها.
   */
  function handleOrder(pkg) {
    if (!user) {
      dispatch(openAuthModal('register'));
      return;
    }
    navigate(`/checkout/${pkg.id}`);
  }

  // مع أي سحبة بنحدّث النقطة — بنقيس أقرب كارت لنص الشاشة
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !compact) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const mid = rail.scrollLeft + rail.clientWidth / 2;
        const kids = [...rail.children];
        let best = 0; let bestD = Infinity;
        kids.forEach((el, i) => {
          const c = el.offsetLeft + el.offsetWidth / 2;
          const d = Math.abs(c - mid);
          if (d < bestD) { bestD = d; best = i; }
        });
        setActive(best);
      });
    };
    rail.addEventListener('scroll', onScroll, { passive: true });
    return () => { rail.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, [compact, data]);

  const sub = data?.subscription;
  const packages = data?.packages || [];

  return (
    <div className="min-h-screen bg-ivory">
      {/* المقدمة مضغوطة على الموبايل: قبل كده كانت بتاخد شاشة كاملة
          قبل ما أول باقة تبان أصلاً */}
      <div className={`mx-auto max-w-6xl ${compact ? 'px-4 pb-10 pt-4' : 'px-6 pb-16 pt-10'}`}>
        <Link
          to="/"
          className={`inline-flex items-center gap-1.5 text-sm text-ink-dim hover:text-rose ${compact ? 'mb-4' : 'mb-8'}`}
        >
          <ArrowRight size={15} /> {t('packages.back')}
        </Link>

        <div className={`mx-auto max-w-[60ch] text-center ${compact ? 'mb-6' : 'mb-12'}`}>
          <div className={`text-[11.5px] font-extrabold tracking-[0.3em] text-emerald uppercase ${compact ? 'mb-1.5' : 'mb-3'}`}>
            {t('packages.eyebrow')}
          </div>
          <h1 className={`font-serif font-bold text-ink ${compact ? 'mb-2 text-[23px]' : 'mb-3 text-[clamp(28px,4vw,42px)]'}`}>
            {t('packages.title')}
          </h1>
          <p className={compact ? 'text-[13.5px] leading-relaxed text-ink-dim' : 'text-[15.5px] text-ink-dim'}>
            {t('packages.subtitle')}
          </p>
        </div>

        {sub?.packageId && sub.invitationsLeft > 0 && (
          <div className={`mx-auto max-w-lg rounded-2xl border border-emerald/30 bg-emerald/[0.07] text-center text-emerald ${
            compact ? 'mb-6 px-4 py-3 text-[13px]' : 'mb-10 px-6 py-4 text-[14.5px]'
          }`}
          >
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
        ) : compact ? (
          // ===== الموبايل: الباقات جنب بعض بالسحب =====
          // قبل كده كانوا تحت بعض، فالصفحة بقت 5 شاشات والعميل مكنش
          // يقدر يقارن ولا يوصل لآخرها. دلوقتي كل باقة بعرض الشاشة
          // تقريبًا وبتقف في نصها لوحدها (scroll snap).
          <>
            <div
              ref={railRef}
              className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2
                [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {packages.map((pkg, i) => (
                <div key={pkg.id} className="w-[84vw] max-w-[340px] shrink-0 snap-center">
                  <PackageCard
                    pkg={pkg}
                    index={i}
                    compact
                    highlighted={pkg.id === 'plus'}
                    onOrder={handleOrder}
                    currentPackageId={sub?.packageId || null}
                  />
                </div>
              ))}
            </div>

            {/* النقط: بتقول إنت على أنهي باقة وإن في غيرها */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {packages.map((pkg, i) => (
                <button
                  key={pkg.id}
                  type="button"
                  aria-label={pkg.name}
                  onClick={() => {
                    const el = railRef.current?.children?.[i];
                    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    active === i ? 'w-6 bg-rose' : 'w-1.5 bg-ink/20'
                  }`}
                />
              ))}
            </div>
            <p className="mt-2.5 text-center text-[11.5px] text-ink-dim">{t('packages.swipeHint')}</p>
          </>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {packages.map((pkg, i) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                index={i}
                highlighted={pkg.id === 'plus'}
                onOrder={handleOrder}
                currentPackageId={sub?.packageId || null}
              />
            ))}
          </div>
        )}

        {!user && (
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
