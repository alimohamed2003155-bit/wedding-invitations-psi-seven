import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { LogOut, Languages } from 'lucide-react';
import { useGetMeQuery, useLogoutMutation } from '../store/api.js';
import { openAuthModal } from '../store/uiSlice.js';
import { setLanguage } from '../i18n/index.js';
import { readAuthHint, writeAuthHint } from '../lib/authHint.js';

export default function AuthBar() {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const { data, isLoading, isFetching } = useGetMeQuery();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();
  // لو ملف اللوجو مش موجود، بنرجع للاسم مكتوب بدل ما تبان صورة مكسورة
  const [logoFailed, setLogoFailed] = useState(false);

  // آخر حالة معروفة — بتتقرا مرة واحدة قبل أول رسمة
  const [hint] = useState(readAuthHint);

  const serverUser = data?.user ?? null;
  // لسه مستنيين رد السيرفر؟ ساعتها بنعتمد على آخر حالة معروفة.
  // أول ما الرد يوصل هو اللي بيحكم، والتلميح بيتحدّث.
  const answered = !isLoading && data !== undefined;
  const user = answered ? serverUser : (hint ? { name: hint.name } : null);
  // حالة تالتة: مش عارفين ومفيش تلميح — ساعتها مانقولش "سجّل الدخول"
  // ولا "أهلًا"، بنسيب مكانهم فاضي بنفس المقاس عشان الشريط مايترجّش
  const unknown = !answered && !hint;

  // بنفتكر الحالة عشان الريفرش الجاي يطلع صح من أول لحظة
  useEffect(() => {
    if (answered) writeAuthHint(serverUser);
  }, [answered, serverUser]);

  async function onLogout() {
    writeAuthHint(null); // بنمسح التلميح فورًا عشان مايرجّعش الاسم بعد الخروج
    await logout();
  }

  return (
    <div className="bg-night px-6 py-2.5">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2.5">
          {!logoFailed && (
            <img
              src="/img/logo.png"
              alt={t('nav.brand')}
              className="h-8 w-8 rounded-full object-cover"
              onError={() => setLogoFailed(true)}
            />
          )}
          <span className="font-serif text-[15px] font-bold tracking-wide text-brass-soft">{t('nav.brand')}</span>
        </Link>

        <div className="flex items-center gap-3.5 text-[13.5px] text-ivory">
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
            // شكل مؤقت بنفس مساحة اللي جاي — مفيش كلام كذب ولا رجّة
            <span className="flex items-center gap-2" aria-hidden="true">
              <span className="h-3 w-16 animate-pulse rounded-full bg-ivory/10" />
              <span className="h-6 w-20 animate-pulse rounded-full bg-ivory/10" />
            </span>
          ) : user ? (
            <>
              <Link to="/dashboard" className="text-brass-soft hover:text-brass">
                {t('nav.dashboard')}
              </Link>
              <span className="text-ivory/50">{t('nav.greeting', { name: user.name })}</span>
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
      </div>
    </div>
  );
}
