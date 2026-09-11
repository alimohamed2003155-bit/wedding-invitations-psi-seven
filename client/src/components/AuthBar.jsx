import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { LogOut, Languages } from 'lucide-react';
import { useGetMeQuery, useLogoutMutation } from '../store/api.js';
import { openAuthModal } from '../store/uiSlice.js';
import { setLanguage } from '../i18n/index.js';

export default function AuthBar() {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const { data } = useGetMeQuery();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();
  const user = data?.user ?? null;
  // لو ملف اللوجو مش موجود، بنرجع للاسم مكتوب بدل ما تبان صورة مكسورة
  const [logoFailed, setLogoFailed] = useState(false);

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

          {user ? (
            <>
              <Link to="/dashboard" className="text-brass-soft hover:text-brass">
                {t('nav.dashboard')}
              </Link>
              <span className="text-ivory/50">{t('nav.greeting', { name: user.name })}</span>
              <button
                type="button"
                onClick={() => logout()}
                disabled={loggingOut}
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
