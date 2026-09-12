import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  ArrowRight, Eye, Users, Crown, Sparkles, MessageCircle,
  Send, ExternalLink, BarChart3, Check, X as XIcon, Lock, Wand2, FileText,
} from 'lucide-react';
import {
  useGetDashboardQuery,
  useGetRsvpsQuery,
  useGetSupportQuery,
  useSendSupportMessageMutation,
} from '../store/api.js';
import EditorDemo from '../components/EditorDemo.jsx';
import Footer from '../components/Footer.jsx';

function StatCard({ icon: Icon, value, label, gold }) {
  return (
    <div className={`rounded-2xl border p-5 ${gold ? 'border-brass/40 bg-brass/[0.06]' : 'border-line bg-card'}`}>
      <Icon size={18} className={gold ? 'text-brass' : 'text-emerald'} />
      <div className="mt-3 font-serif text-[32px] font-bold leading-none text-ink">{value}</div>
      <div className="mt-1.5 text-[13px] text-ink-dim">{label}</div>
    </div>
  );
}

function RsvpList({ shortId, onClose }) {
  const { t } = useTranslation();
  const { data, isLoading } = useGetRsvpsQuery(shortId);

  return (
    <div className="mt-4 rounded-xl border border-line bg-ivory/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-bold text-ink">{t('dash.rsvpTitle')}</span>
        <button type="button" onClick={onClose} className="text-ink-dim hover:text-ink">
          <XIcon size={15} />
        </button>
      </div>
      {isLoading && <p className="text-[13px] text-ink-dim">...</p>}
      {data?.rsvps?.length === 0 && <p className="text-[13px] text-ink-dim">{t('dash.rsvpEmpty')}</p>}
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {data?.rsvps?.map((r) => (
          <div key={r.createdAt + r.guestName} className="rounded-lg bg-card px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13.5px] font-bold text-ink">{r.guestName}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  r.attending ? 'bg-ok/15 text-ok' : 'bg-error/15 text-error'
                }`}
              >
                {r.attending ? t('dash.attending') : t('dash.notAttending')}
              </span>
            </div>
            {r.note && <p className="mt-1 text-[12.5px] text-ink-dim">{r.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SupportBox() {
  const { t } = useTranslation();
  const { data } = useGetSupportQuery();
  const [send, { isLoading }] = useSendSupportMessageMutation();
  const [text, setText] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await send({ body: text }).unwrap();
      setText('');
    } catch {
      /* الزرار بيرجع لحالته لوحده */
    }
  }

  return (
    <div className="rounded-[22px] border border-line bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle size={18} className="text-rose" />
        <h2 className="font-serif text-lg font-bold text-ink">{t('dash.supportTitle')}</h2>
      </div>

      <div className="mb-4 max-h-72 space-y-2.5 overflow-y-auto">
        {data?.messages?.length === 0 && <p className="text-[13.5px] text-ink-dim">{t('dash.supportEmpty')}</p>}
        {data?.messages?.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px] ${
              m.from === 'user' ? 'ms-auto bg-night text-ivory' : 'me-auto bg-ivory text-ink'
            }`}
          >
            {m.body}
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder={t('dash.supportPlaceholder')}
          className="flex-1 rounded-full border border-line px-4 py-2.5 text-[14px] focus:border-rose focus:outline-none"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-full bg-night px-5 py-2.5 text-sm font-bold text-ivory hover:bg-emerald disabled:opacity-60"
        >
          <Send size={14} /> {t('dash.send')}
        </button>
      </form>
    </div>
  );
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useGetDashboardQuery();
  const [openRsvp, setOpenRsvp] = useState(null);
  const lang = i18n.language === 'ar' ? 'ar' : 'en';

  if (isLoading) return <div className="p-16 text-center text-ink-dim">...</div>;
  if (!data) {
    return (
      <div className="p-16 text-center text-ink-dim">
        {t('dash.needLogin')} <Link to="/" className="text-rose underline">{t('packages.back')}</Link>
      </div>
    );
  }

  const isPremium = !!data.subscription.packageId;

  return (
    <div className="min-h-screen bg-ivory">
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <Link to="/" className="mb-7 inline-flex items-center gap-1.5 text-sm text-ink-dim hover:text-rose">
          <ArrowRight size={15} /> {t('packages.back')}
        </Link>

        {/* شريط الحالة — الفرق بين المجاني والمميز بيبان من أول نظرة */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[22px] p-6 ${
            isPremium
              ? 'border border-brass/50 bg-gradient-to-l from-night to-[#16281f] text-ivory'
              : 'border border-line bg-card text-ink'
          }`}
        >
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              {isPremium ? <Crown size={18} className="text-brass-soft" /> : <Lock size={16} className="text-ink-dim" />}
              <span className={`font-serif text-xl font-bold ${isPremium ? 'text-ivory' : 'text-ink'}`}>
                {isPremium
                  ? t('dash.premiumTitle', { name: data.subscription.packageName?.[lang] || '' })
                  : t('dash.freeTitle')}
              </span>
            </div>
            <p className={`text-[13.5px] ${isPremium ? 'text-ivory/70' : 'text-ink-dim'}`}>
              {isPremium
                ? t('dash.premiumSubtitle', { count: data.subscription.invitationsLeft })
                : t('dash.freeSubtitle')}
            </p>
          </div>
          {!isPremium && (
            <Link
              to="/packages"
              className="rounded-full bg-gradient-to-l from-brass to-brass-soft px-6 py-3 font-extrabold text-[#241608] hover:brightness-105"
            >
              {t('dash.upgrade')}
            </Link>
          )}
        </motion.div>

        {/* العميل المجاني بيدخل لوحته كل شوية يتابع دعوته — فده أكتر
            مكان بيشوفه. الفيديو هنا بيوريه اللي فايته من غير ما نقاطعه */}
        {!isPremium && (
          <div className="mb-8 overflow-hidden rounded-[22px] border border-brass/35 bg-gradient-to-b from-[#0d1f18] to-night p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-serif text-[17px] font-bold text-brass-soft">{t('demo.title')}</h2>
                <p className="mt-1 text-[12.5px] text-ivory/60">{t('demo.dashNote')}</p>
              </div>
              <Link
                to="/packages"
                className="shrink-0 rounded-full bg-gradient-to-l from-brass to-brass-soft px-5 py-2.5 text-[12.5px] font-extrabold text-[#241608] hover:brightness-105"
              >
                {t('demo.cta')}
              </Link>
            </div>
            <EditorDemo variant="compact" />
          </div>
        )}

        {/* الإحصائيات */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={BarChart3} value={data.totals.invitations} label={t('dash.statInvitations')} />
          <StatCard icon={Eye} value={data.totals.views} label={t('dash.statViews')} />
          <StatCard icon={Users} value={data.totals.rsvpYes} label={t('dash.statAttending')} />
          <StatCard icon={Sparkles} value={data.subscription.invitationsLeft} label={t('dash.statLeft')} gold={isPremium} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* الدعوات */}
          <div className="rounded-[22px] border border-line bg-card p-6">
            <h2 className="mb-4 font-serif text-lg font-bold text-ink">{t('dash.myInvitations')}</h2>

            {data.invitations.length === 0 ? (
              <p className="text-[13.5px] text-ink-dim">{t('dash.noInvitations')}</p>
            ) : (
              <div className="space-y-3">
                {data.invitations.map((inv) => (
                  <div key={inv.shortId} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">{inv.names[lang] || inv.names.ar}</span>
                          {inv.isDraft && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-ink/10 px-2 py-0.5 text-[10.5px] font-bold text-ink-dim">
                              <FileText size={10} /> {t('dash.draftBadge')}
                            </span>
                          )}
                          {inv.isPremium && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brass/15 px-2 py-0.5 text-[10.5px] font-bold text-brass">
                              <Crown size={10} /> {t('dash.premiumBadge')}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-[12.5px] text-ink-dim">
                          <span className="inline-flex items-center gap-1">
                            <Eye size={12} /> {inv.views}
                          </span>
                          <span className="inline-flex items-center gap-1 text-ok">
                            <Check size={12} /> {inv.rsvp.yes}
                          </span>
                          <span className="inline-flex items-center gap-1 text-error">
                            <XIcon size={12} /> {inv.rsvp.no}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {/* المحرر للدعوات المميزة بس — نفس الشرط المطبّق
                            على السيرفر في routes/editor.js */}
                        {inv.isPremium && (
                          <Link
                            to={`/editor/${inv.shortId}`}
                            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-brass to-brass-soft px-3.5 py-2 text-[12.5px] font-extrabold text-[#241608] hover:brightness-105"
                          >
                            <Wand2 size={12} /> {inv.isDraft ? t('dash.continueDraft') : t('dash.edit')}
                          </Link>
                        )}
                        {/* المسودة لسه مالهاش ضيوف ولا لينك يتشارك، فمفيش
                            لازمة لزراير الردود والفتح عليها */}
                        {!inv.isDraft && (
                          <>
                            <button
                              type="button"
                              onClick={() => setOpenRsvp(openRsvp === inv.shortId ? null : inv.shortId)}
                              className="rounded-full border border-line px-3.5 py-2 text-[12.5px] font-bold text-ink hover:bg-ink/5"
                            >
                              {t('dash.viewRsvps')}
                            </button>
                            <a
                              href={inv.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-night px-3.5 py-2 text-[12.5px] font-bold text-ivory hover:bg-emerald"
                            >
                              <ExternalLink size={12} /> {t('dash.open')}
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    {openRsvp === inv.shortId && (
                      <RsvpList shortId={inv.shortId} onClose={() => setOpenRsvp(null)} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <SupportBox />
        </div>
      </div>
      <Footer />
    </div>
  );
}
