import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useLoginMutation, useRegisterMutation } from '../store/api.js';
import { closeAuthModal, openAuthModal, showWelcome } from '../store/uiSlice.js';
import CountrySelect from './form/CountrySelect.jsx';

const inputClass =
  'w-full rounded-lg border border-line px-3.5 py-2.5 text-[15px] text-ink focus:border-rose focus:outline-none';

function LoginForm() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { register, handleSubmit } = useForm();
  const [login, { isLoading, error }] = useLoginMutation();

  async function onSubmit(values) {
    try {
      await login(values).unwrap();
      dispatch(closeAuthModal());
    } catch {
      /* الخطأ بيتعرض من error.data.error تحت */
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
      <div className="space-y-1.5">
        <label className="text-[13px] text-ink-dim">{t('auth.email')}</label>
        <input type="email" required autoComplete="email" className={inputClass} {...register('email')} />
      </div>
      <div className="space-y-1.5">
        <label className="text-[13px] text-ink-dim">{t('auth.password')}</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
          {...register('password')}
        />
      </div>
      <p className="min-h-[18px] text-[13px] text-error">{error?.data?.error}</p>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-full bg-night py-3 font-extrabold text-ivory hover:bg-emerald disabled:opacity-60"
      >
        {isLoading ? '...' : t('auth.submitLogin')}
      </button>
    </form>
  );
}

function RegisterForm() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { register, handleSubmit, control, formState } = useForm();
  const [doRegister, { isLoading, error }] = useRegisterMutation();

  async function onSubmit(values) {
    try {
      const res = await doRegister(values).unwrap();
      dispatch(closeAuthModal());
      // شاشة الترحيب مكان فورم التسجيل على طول — من غير أي فراغ بينهم
      dispatch(showWelcome((res && res.user && res.user.name) || values.name || ''));
    } catch {
      /* الخطأ بيتعرض من error.data.error تحت */
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
      <div className="space-y-1.5">
        <label className="text-[13px] text-ink-dim">{t('auth.name')}</label>
        <input type="text" required maxLength={80} autoComplete="name" className={inputClass} {...register('name')} />
      </div>
      <div className="space-y-1.5">
        <label className="text-[13px] text-ink-dim">{t('auth.email')}</label>
        <input type="email" required autoComplete="email" className={inputClass} {...register('email')} />
      </div>
      <div className="space-y-1.5">
        <label className="text-[13px] text-ink-dim">{t('auth.passwordHint')}</label>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
          {...register('password')}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[13px] text-ink-dim">{t('auth.country')}</label>
        <Controller
          name="country"
          control={control}
          rules={{ required: true }}
          render={({ field }) => <CountrySelect value={field.value} onChange={field.onChange} />}
        />
      </div>
      <p className="min-h-[18px] text-[13px] text-error">
        {error?.data?.error || (formState.errors.country && t('auth.countryRequired'))}
      </p>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-full bg-night py-3 font-extrabold text-ivory hover:bg-emerald disabled:opacity-60"
      >
        {isLoading ? '...' : t('auth.submitRegister')}
      </button>
    </form>
  );
}

export default function AuthModal() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const open = useSelector((s) => s.ui.authModalOpen);
  const tab = useSelector((s) => s.ui.authModalTab);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-night/70 p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && dispatch(closeAuthModal())}
        >
          <motion.div
            className="relative w-full max-w-sm rounded-[22px] bg-card p-8"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
          >
            <button
              type="button"
              aria-label={t('auth.close')}
              onClick={() => dispatch(closeAuthModal())}
              className="absolute top-3.5 end-3.5 text-ink-dim hover:text-ink"
            >
              <X size={18} />
            </button>

            <div className="mb-5 flex gap-2">
              <button
                type="button"
                onClick={() => dispatch(openAuthModal('login'))}
                className={`flex-1 rounded-full border py-2 text-[13.5px] ${
                  tab === 'login' ? 'border-night bg-night text-ivory' : 'border-line text-ink-dim'
                }`}
              >
                {t('auth.loginTab')}
              </button>
              <button
                type="button"
                onClick={() => dispatch(openAuthModal('register'))}
                className={`flex-1 rounded-full border py-2 text-[13.5px] ${
                  tab === 'register' ? 'border-night bg-night text-ivory' : 'border-line text-ink-dim'
                }`}
              >
                {t('auth.registerTab')}
              </button>
            </div>

            <h2 className="mb-4 font-serif text-xl italic text-ink">
              {tab === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
            </h2>

            {tab === 'login' ? <LoginForm /> : <RegisterForm />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
