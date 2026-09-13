// الشريط العلوي.
//
// على الموبايل كان بيتزنق: اسم الموقع + اللغة + "أهلًا، فلان" + لوحتي +
// تسجيل خروج كلهم في سطر واحد عرضه 390 بكسل — فالكلام كان بيتقطع
// ويتلخبط. دلوقتي على الشاشة الصغيرة فيه حاجتين بس ظاهرين (الاسم +
// زرار القايمة)، وكل الباقي جوه القايمة بمساحة مريحة.
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import {
  LogOut, Languages, Menu, X, LayoutDashboard, Crown,
  LayoutTemplate, MessageCircle, UserPlus, LogIn,
} from 'lucide-react';
import { useGetMeQuery, useLogoutMutation } from '../store/api.js';
import { openAuthModal } from '../store/uiSlice.js';
import { setLanguage } from '../i18n/index.js';
import { readAuthHint, writeAuthHint } from '../lib/authHint.js';
import { whatsappLink, WHATSAPP_MESSAGES } from '../lib/contact.js';

export default function AuthBar() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const { data, isLoading, isFetching } = useGetMeQuery();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();
  const [logoFailed, setLogoFailed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [hint] = useState(readAuthHint);
  const serverUser = data?.user ?? null;
  const answered = !isLoading && data !== undefined;
  const user = answered ? serverUser : (hint ? { name: hint.name } : null);
  const unknown = !answered && !hint;

  useEffect(() => {
    if (answered) writeAuthHint(serverUser);
  }, [answered, serverUser]);

  // القايمة بتتقفل مع أي تنقّل — غير كده بتفضل مفتوحة فوق الصفحة الجديدة
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // وهي مفتوحة: زرار Escape يقفلها، والصفحة ورا مبتتزحلقش (القايمة
  // متعلّقة في الشريط، فلو الصفحة اتحرّكت تحتها بتطلع بره الشاشة)
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  async function onLogout() {
    writeAuthHint(null);
    setMenuOpen(false);
    await logout();
  }

  const firstName = String(user?.name || '').trim().split(/\s+/)[0] || '';

  /** روابط القايمة — نفسها للمسجّل وغير المسجّل مع فرق بسيط */
  const links = [
    { icon: LayoutTemplate, label: t('nav.designs'), to: '/' },
    { icon: Crown, label: t('packages.eyebrow'), to: '/packages' },
    ...(user ? [{ icon: LayoutDashboard, label: t('nav.dashboard'), to: '/dashboard' }] : []),
  ];

  return (
    // relative + z عالي: القايمة بتتعلّق في الشريط نفسه (absolute) مش في
    // الشاشة — فلو الصفحة اتحرّكت تفضل مظبوطة تحته، والستارة السودا
    // جواها فبتغطّي كل اللي تحتها من غير أرقام z متشعبطة في بعضها
    <div className="relative z-[130]">
      <div className="bg-night px-4 py-2.5 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          {/* اللوجو نفسه فيه اسم الموقع مكتوب، فمفيش داعي نكتبه جنبه
              تاني. النص بيرجع يبان بس لو الصورة مجتش لأي سبب. */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            {logoFailed ? (
              <>
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-brass-soft/45 bg-brass-soft/12 font-serif text-[15px] font-bold text-brass-soft"
                >
                  {t('nav.brandMark')}
                </span>
                <span className="font-serif text-[16px] font-bold tracking-wide text-brass-soft sm:text-[15px]">
                  {t('nav.brand')}
                </span>
              </>
            ) : (
              // اللوجو فيه أحمر عنابي، والشريط أخضر غامق — الأحمر على
              // الغامق بيختفي تقريبًا. فبنحطه على خلفية عاجية فاتحة
              // (نفس لون خلفية الموقع) عشان يبان زي ما اتصمم.
              <span className="flex items-center rounded-xl bg-ivory px-2.5 py-1 shadow-[0_2px_10px_-4px_rgba(0,0,0,.5)]">
                <img
                  src="/img/logo.png"
                  alt={t('nav.brand')}
                  width="315"
                  height="180"
                  className="h-8 w-auto sm:h-9"
                  onError={() => setLogoFailed(true)}
                />
              </span>
            )}
          </Link>

          {/* ===== الشاشة الكبيرة: كل حاجة ظاهرة ===== */}
          <div className="hidden items-center gap-3.5 text-[13.5px] text-ivory sm:flex">
            <button
              type="button"
              onClick={() => setLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 text-ivory/90 hover:text-rose-bright"
            >
              <Languages size={14} />
              {t('nav.language')}
            </button>

            <span className="h-3.5 w-px bg-ivory/20" />

            {unknown ? (
              <span className="flex items-center gap-2" aria-hidden="true">
                <span className="h-3 w-16 animate-pulse rounded-full bg-ivory/10" />
                <span className="h-6 w-20 animate-pulse rounded-full bg-ivory/10" />
              </span>
            ) : user ? (
              <>
                <Link to="/dashboard" className="text-brass-soft hover:text-brass">
                  {t('nav.dashboard')}
                </Link>
                <span className="max-w-[180px] truncate text-ivory/50">
                  {t('nav.greeting', { name: firstName })}
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  disabled={loggingOut || isFetching}
                  className="flex items-center gap-1 text-ivory/90 hover:text-rose-bright disabled:opacity-50"
                >
                  <LogOut size={14} />
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => dispatch(openAuthModal('login'))}
                  className="text-ivory hover:text-rose-bright"
                >
                  {t('nav.login')}
                </button>
                <button
                  type="button"
                  onClick={() => dispatch(openAuthModal('register'))}
                  className="rounded-full bg-brass px-4 py-1.5 font-bold text-[#241608] hover:brightness-105"
                >
                  {t('nav.register')}
                </button>
              </>
            )}
          </div>

          {/* ===== الموبايل: زرار القايمة بس ===== */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t('nav.menu')}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ivory/20 text-ivory transition active:bg-ivory/10 sm:hidden"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ===== القايمة ===== */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 bg-night/50 backdrop-blur-[2px] sm:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="absolute inset-x-2 top-full mt-1 overflow-hidden rounded-[20px] border border-ivory/12
                bg-gradient-to-b from-[#0d1f18] to-night shadow-[0_24px_60px_-20px_rgba(0,0,0,.8)] sm:hidden"
            >
              {/* اسم العميل */}
              {user && (
                <div className="border-b border-ivory/10 px-5 py-3.5">
                  <div className="text-[11.5px] text-ivory/45">{t('nav.signedInAs')}</div>
                  <div className="truncate text-[14px] font-bold text-brass-soft">{user.name}</div>
                </div>
              )}

              <nav className="p-2">
                {links.map(({ icon: Icon, label, to }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[14px] text-ivory/90 transition active:bg-ivory/10"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ivory/[0.07] text-brass-soft">
                      <Icon size={15} />
                    </span>
                    {label}
                  </Link>
                ))}

                {/* خدمة العملاء — واتساب مباشر */}
                <a
                  href={whatsappLink(WHATSAPP_MESSAGES.help)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[14px] text-ivory/90 transition active:bg-ivory/10"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#4ade80]">
                    <MessageCircle size={15} />
                  </span>
                  {t('nav.support')}
                </a>

                <button
                  type="button"
                  onClick={() => { setLanguage(i18n.language === 'ar' ? 'en' : 'ar'); setMenuOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-start text-[14px] text-ivory/90 transition active:bg-ivory/10"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ivory/[0.07] text-brass-soft">
                    <Languages size={15} />
                  </span>
                  {t('nav.language')}
                </button>
              </nav>

              {/* الدخول أو الخروج */}
              <div className="border-t border-ivory/10 p-3">
                {user ? (
                  <button
                    type="button"
                    onClick={onLogout}
                    disabled={loggingOut}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-ivory/20 py-3 text-[13.5px] font-bold text-ivory/80 transition active:bg-ivory/10 disabled:opacity-50"
                  >
                    <LogOut size={15} /> {t('nav.logout')}
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => { dispatch(openAuthModal('register')); setMenuOpen(false); }}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-l from-brass to-brass-soft py-3 text-[13.5px] font-extrabold text-[#241608]"
                    >
                      <UserPlus size={15} /> {t('nav.register')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { dispatch(openAuthModal('login')); setMenuOpen(false); }}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-ivory/20 py-3 text-[13.5px] font-bold text-ivory/85"
                    >
                      <LogIn size={15} /> {t('nav.login')}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
