// زرار التواصل اللي بيفضل ظاهر في كل صفحة.
//
// المشكلة اللي بيحلها: الشات كان في مكان واحد بس — جوه لوحة العميل.
// يعني اللي لسه بيتفرج على التصاميم، أو واقف قدام صفحة الدفع ومش
// فاهم حاجة، مالوش طريقة يسأل غير إنه يسيب اللي هو فيه ويروح يدوّر.
// ومعظم الناس مبتعملش كده — بتقفل وتمشي.
//
// دلوقتي الزرار في ركن الشاشة على طول، وجواه تلات طرق: شات الموقع
// (بيوصلك في لوحة التحكم)، واتساب، وطلب شغل مخصص. وكل واحدة بتبعت
// معاها سياقها، فالعميل مايقعدش يشرح هو جاي منين.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import {
  MessageCircle, X, Send, Loader2, Headphones, Palette, ArrowLeft, Check,
} from 'lucide-react';
import {
  useGetMeQuery, useGetSupportQuery, useSendSupportMessageMutation, useGetDashboardQuery,
} from '../store/api.js';
import { whatsappLink, WHATSAPP_MESSAGES, phoneDisplay } from '../lib/contact.js';

/** أيقونة واتساب — مش موجودة في lucide فرسمناها */
function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23z" />
    </svg>
  );
}

/** المحادثة نفسها — نفس محادثة لوحة العميل بالظبط */
function Chat({ onClose }) {
  const { t } = useTranslation();
  const { data, isLoading } = useGetSupportQuery();
  const [send, { isLoading: sending }] = useSendSupportMessageMutation();
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [data]);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    try {
      await send({ body: text }).unwrap();
      setText('');
      setSent(true);
      setTimeout(() => setSent(false), 2500);
    } catch { /* بيفضل مكتوب عشان يجرب تاني */ }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {isLoading && (
          <p className="py-6 text-center text-[12.5px] text-ink-dim">
            <Loader2 size={14} className="mx-auto animate-spin" />
          </p>
        )}
        {data?.messages?.length === 0 && (
          <p className="py-6 text-center text-[12.5px] leading-relaxed text-ink-dim">
            {t('support.empty')}
          </p>
        )}
        {data?.messages?.map((m, i) => (
          <div
            key={m.createdAt + i}
            className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.8] ${
              m.from === 'admin'
                ? 'bg-night text-ivory'
                : 'ms-auto bg-rose/[0.12] text-ink'
            }`}
          >
            {m.body}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e); }
          }}
          rows={1}
          maxLength={2000}
          placeholder={t('support.placeholder')}
          className="max-h-24 min-h-[42px] flex-1 resize-none rounded-xl border border-line bg-card px-3 py-2.5 text-[13px] text-ink focus:border-rose focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label={t('support.send')}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-night text-ivory disabled:opacity-40"
        >
          {sending ? <Loader2 size={15} className="animate-spin" />
            : sent ? <Check size={15} className="text-ok" />
              : <Send size={15} className="rtl:rotate-180" />}
        </button>
      </form>
    </div>
  );
}

export default function SupportLauncher() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('menu'); // menu | chat
  const { data: meData } = useGetMeQuery();
  const user = meData?.user ?? null;
  // عدد الرسايل اللي مش مقروءة — بيتقرا من نفس طلب اللوحة الموجود أصلاً
  const { data: dash } = useGetDashboardQuery(undefined, { skip: !user });
  const unread = (user && dash?.unreadSupport) || 0;

  // ESC بتقفل
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const options = [
    {
      key: 'chat',
      icon: Headphones,
      title: t('support.optChat'),
      desc: user ? t('support.optChatDesc') : t('support.optChatGuest'),
      onClick: () => (user ? setView('chat') : null),
      href: user ? null : whatsappLink(WHATSAPP_MESSAGES.help),
      tone: 'night',
    },
    {
      key: 'wa',
      icon: WhatsAppIcon,
      title: t('support.optWhats'),
      desc: t('support.optWhatsDesc', { phone: phoneDisplay }),
      href: whatsappLink(WHATSAPP_MESSAGES.help),
      tone: 'green',
    },
    {
      key: 'custom',
      icon: Palette,
      title: t('support.optCustom'),
      desc: t('support.optCustomDesc'),
      href: whatsappLink(WHATSAPP_MESSAGES.custom),
      tone: 'brass',
    },
  ];

  return (
    <>
      {/* الزرار العايم */}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setView('menu'); }}
        aria-label={t('support.launcher')}
        className="fixed bottom-4 start-4 z-[120] flex h-13 items-center gap-2 rounded-full bg-night px-4 py-3.5
          text-ivory shadow-[0_12px_30px_-10px_rgba(8,19,15,.7)] transition hover:bg-emerald active:scale-95"
      >
        {open ? <X size={19} /> : <MessageCircle size={19} />}
        {!open && (
          <span className="hidden text-[13px] font-bold sm:inline">{t('support.launcher')}</span>
        )}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -end-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose px-1 text-[11px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* غطاء خفيف — الضغط بره بيقفل */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[115] bg-night/40 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="fixed bottom-20 start-3 end-3 z-[120] flex max-h-[72vh] flex-col overflow-hidden
                rounded-[22px] border border-line bg-card shadow-[0_28px_70px_-24px_rgba(8,19,15,.6)]
                sm:end-auto sm:w-[360px]"
            >
              {/* العنوان */}
              <div className="flex shrink-0 items-center gap-2.5 border-b border-line bg-gradient-to-l from-[#0d1f18] to-night px-4 py-3.5 text-ivory">
                {view === 'chat' && (
                  <button
                    type="button"
                    onClick={() => setView('menu')}
                    aria-label={t('support.back')}
                    className="text-ivory/60 hover:text-ivory"
                  >
                    <ArrowLeft size={16} className="rtl:rotate-180" />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold">
                    {view === 'chat' ? t('support.chatTitle') : t('support.title')}
                  </div>
                  <div className="text-[11.5px] text-ivory/55">
                    {view === 'chat' ? t('support.chatNote') : t('support.subtitle')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('auth.close')}
                  className="text-ivory/60 hover:text-ivory"
                >
                  <X size={17} />
                </button>
              </div>

              {view === 'chat' ? (
                <Chat onClose={() => setOpen(false)} />
              ) : (
                <div className="space-y-2.5 overflow-y-auto p-3.5">
                  {options.map(({ key, icon: Icon, title, desc, href, onClick, tone }) => {
                    const inner = (
                      <>
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                            tone === 'green' ? 'bg-[#25D366]/15 text-[#1da851]'
                              : tone === 'brass' ? 'bg-brass/15 text-[#8a6a20]'
                                : 'bg-night text-brass-soft'
                          }`}
                        >
                          <Icon size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                            {title}
                            {key === 'chat' && unread > 0 && (
                              <span className="rounded-full bg-rose px-1.5 py-0.5 text-[10.5px] font-bold text-white">
                                {unread}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-snug text-ink-dim">{desc}</span>
                        </span>
                        <ArrowLeft size={14} className="shrink-0 text-ink-dim/50 rtl:rotate-180" />
                      </>
                    );
                    const cls = 'flex w-full items-center gap-3 rounded-2xl border border-line bg-ivory/50 p-3 text-start transition hover:border-ink/25 hover:bg-ivory';
                    return href ? (
                      <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
                        {inner}
                      </a>
                    ) : (
                      <button key={key} type="button" onClick={onClick} className={cls}>
                        {inner}
                      </button>
                    );
                  })}

                  <p className="px-1 pt-1 text-center text-[11px] leading-relaxed text-ink-dim">
                    {t('support.hours')}
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
