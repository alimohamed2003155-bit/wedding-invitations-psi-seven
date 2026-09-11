// ملف العميل الكامل — كل حاجة عنه وكل تحكم فيه في مكان واحد.
//
// الإجراءات الخطيرة (إيقاف باقة، إلغاء، حظر حساب) بتطلب تأكيد صريح
// قبل ما تتنفّذ، وكل واحد منها بيتسجّل في سجل الإجراءات على السيرفر.
import { useState } from 'react';
import { motion } from 'motion/react';
import {
  X, Crown, Ban, PauseCircle, PlayCircle, Trash2, Plus, Save,
  Mail, Globe, Calendar, Eye, FileText, MessageSquare, Wallet, ShieldAlert, Monitor,
} from 'lucide-react';
import {
  useGetUserQuery, useUpdateSubscriptionMutation, useBlockUserMutation,
  useGetAdminPackagesQuery,
} from '../../store/adminApi.js';
import {
  Panel, StatTile, Badge, Btn, Field, Table, Row, Cell,
  Spinner, Empty, fmtDate, fmtNum, fmtMoney,
} from '../../components/admin/ui.jsx';

/** تأكيد صريح قبل أي إجراء مش سهل الرجوع فيه */
function Confirm({ text, onYes, onCancel, busy }) {
  return (
    <div className="rounded-xl border border-error/40 bg-error/10 p-4">
      <p className="mb-3 flex items-start gap-2 text-[12.5px] text-ivory/85">
        <ShieldAlert size={15} className="mt-0.5 shrink-0 text-error" /> {text}
      </p>
      <div className="flex gap-2">
        <Btn tone="danger" size="sm" loading={busy} onClick={onYes}>أيوه، نفّذ</Btn>
        <Btn size="sm" onClick={onCancel}>لأ</Btn>
      </div>
    </div>
  );
}

export default function ClientDrawer({ userId, onClose }) {
  const { data, isLoading } = useGetUserQuery(userId);
  const { data: pkgData } = useGetAdminPackagesQuery();
  const [updateSubscription, { isLoading: saving }] = useUpdateSubscriptionMutation();
  const [blockUser, { isLoading: blocking }] = useBlockUserMutation();

  const [confirm, setConfirm] = useState(null); // { text, run }
  const [credits, setCredits] = useState('');
  const [note, setNote] = useState(null);
  const [grantId, setGrantId] = useState('');
  const [error, setError] = useState('');

  async function run(fn) {
    setError('');
    try {
      await fn();
      setConfirm(null);
    } catch (err) {
      setError(err?.data?.error || 'حصل خطأ، جرّب تاني.');
    }
  }

  const act = (body) => run(() => updateSubscription({ id: userId, ...body }).unwrap());

  return (
    <motion.aside
      initial={{ x: '-100%', opacity: 0.4 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0.4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="fixed inset-y-0 start-0 z-50 flex w-full max-w-[560px] flex-col border-e border-line-lite bg-night shadow-2xl"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-line-lite px-5 py-3.5">
        <h2 className="font-serif text-[16px] font-bold text-ivory">ملف العميل</h2>
        <button type="button" onClick={onClose} className="text-ivory/50 hover:text-ivory">
          <X size={18} />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        {isLoading && <Spinner />}
        {!isLoading && !data && <Empty>العميل ده مش موجود.</Empty>}

        {data && (
          <>
            {error && (
              <div className="rounded-xl bg-error/15 px-4 py-3 text-[12.5px] text-error">{error}</div>
            )}

            {/* الهوية */}
            <div className="rounded-2xl border border-line-lite bg-panel p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="font-serif text-[19px] font-bold text-ivory">{data.user.name}</span>
                {data.user.subscription.packageId && (
                  <Badge tone="gold" icon={Crown}>{data.user.subscription.packageName}</Badge>
                )}
                {data.user.subscription.status === 'suspended' && (
                  <Badge tone="danger" icon={PauseCircle}>الباقة موقوفة</Badge>
                )}
                {data.user.isBlocked && <Badge tone="danger" icon={Ban}>الحساب محظور</Badge>}
              </div>

              <div className="grid gap-2 text-[12.5px] text-ivory/60 sm:grid-cols-2">
                <span className="inline-flex items-center gap-1.5"><Mail size={12} /> {data.user.email}</span>
                <span className="inline-flex items-center gap-1.5"><Globe size={12} /> {data.user.country}</span>
                <span className="inline-flex items-center gap-1.5"><Calendar size={12} /> سجّل {fmtDate(data.user.createdAt)}</span>
                <span className="inline-flex items-center gap-1.5"><Monitor size={12} /> {data.user.activeSessions} جلسة مفتوحة</span>
              </div>
            </div>

            {/* أرقامه */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile icon={FileText} label="دعوات منشورة" value={fmtNum(data.totals.invitations)} hint={`${data.totals.drafts} مسودة`} />
              <StatTile icon={Eye} label="مشاهدات" value={fmtNum(data.totals.views)} />
              <StatTile icon={MessageSquare} label="ردود حضور" value={fmtNum(data.totals.rsvps)} hint={`${data.totals.rsvpYes} موافق`} />
              <StatTile icon={Crown} tone="gold" label="رصيد متبقي" value={fmtNum(data.user.subscription.invitationsLeft)} />
              <StatTile icon={Wallet} tone="ok" label="دفع بالجنيه" value={fmtMoney(data.totals.paid.EGP, 'EGP')} />
              <StatTile icon={Wallet} tone="ok" label="دفع بالدولار" value={fmtMoney(data.totals.paid.USD, 'USD')} />
            </div>

            {/* التحكم */}
            <Panel title="التحكم في الاشتراك" subtitle="كل إجراء هنا بيتسجّل في سجل الإجراءات">
              {confirm ? (
                <Confirm
                  text={confirm.text}
                  busy={saving || blocking}
                  onYes={confirm.run}
                  onCancel={() => setConfirm(null)}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {data.user.subscription.status === 'active' && data.user.subscription.packageId && (
                      <Btn
                        tone="danger" icon={PauseCircle}
                        onClick={() => setConfirm({
                          text: 'إيقاف الباقة هيقفل كل أدوات المحرر عن العميل فورًا. رصيده هيفضل محفوظ زي ما هو، وتقدر تشغّلها تاني في أي وقت.',
                          run: () => act({ action: 'suspend' }),
                        })}
                      >
                        أوقف الباقة
                      </Btn>
                    )}
                    {data.user.subscription.status === 'suspended' && (
                      <Btn tone="ok" icon={PlayCircle} loading={saving} onClick={() => act({ action: 'resume' })}>
                        شغّل الباقة تاني
                      </Btn>
                    )}
                    {data.user.subscription.packageId && (
                      <Btn
                        tone="danger" icon={Trash2}
                        onClick={() => setConfirm({
                          text: 'الإلغاء الكامل هيشيل الباقة ويصفّر الرصيد نهائيًا. لو قصدك توقف مؤقت بس، استخدم "أوقف الباقة".',
                          run: () => act({ action: 'cancel' }),
                        })}
                      >
                        ألغِ الباقة نهائيًا
                      </Btn>
                    )}
                    <Btn
                      tone={data.user.isBlocked ? 'ok' : 'danger'}
                      icon={Ban}
                      onClick={() => setConfirm({
                        text: data.user.isBlocked
                          ? 'رفع الحظر هيخلي العميل يقدر يسجّل دخول تاني.'
                          : 'حظر الحساب هيقفل كل جلساته المفتوحة فورًا ومش هيقدر يدخل تاني لحد ما ترفع الحظر.',
                        run: () => run(() => blockUser({ id: userId, blocked: !data.user.isBlocked }).unwrap()),
                      })}
                    >
                      {data.user.isBlocked ? 'ارفع الحظر' : 'احظر الحساب'}
                    </Btn>
                  </div>

                  {/* منح باقة */}
                  <div className="rounded-xl border border-line-lite p-4">
                    <p className="mb-2.5 text-[12px] text-ivory/55">امنح باقة يدويًا (الرصيد بيتضاف للموجود)</p>
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={grantId}
                        onChange={(e) => setGrantId(e.target.value)}
                        className="rounded-xl border border-line-lite bg-night/60 px-3.5 py-2.5 text-[13px] text-ivory focus:border-brass/60 focus:outline-none"
                      >
                        <option value="">اختار باقة...</option>
                        {(pkgData?.packages || []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.invitations} دعوة
                          </option>
                        ))}
                      </select>
                      <Btn
                        tone="gold" icon={Plus} disabled={!grantId} loading={saving}
                        onClick={() => act({ action: 'grant', packageId: grantId }).then(() => setGrantId(''))}
                      >
                        امنح
                      </Btn>
                    </div>
                  </div>

                  {/* تعديل الرصيد */}
                  <div className="rounded-xl border border-line-lite p-4">
                    <p className="mb-2.5 text-[12px] text-ivory/55">
                      تعديل الرصيد مباشرة (الحالي: {data.user.subscription.invitationsLeft})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Field
                        type="number" min="0" max="10000"
                        placeholder={String(data.user.subscription.invitationsLeft)}
                        value={credits}
                        onChange={(e) => setCredits(e.target.value)}
                        className="w-32"
                      />
                      <Btn
                        icon={Save} disabled={credits === ''} loading={saving}
                        onClick={() => act({ action: 'setCredits', invitationsLeft: Number(credits) }).then(() => setCredits(''))}
                      >
                        احفظ الرصيد
                      </Btn>
                    </div>
                  </div>

                  {/* ملاحظة إدارية */}
                  <div className="rounded-xl border border-line-lite p-4">
                    <p className="mb-2.5 text-[12px] text-ivory/55">ملاحظة إدارية (بتظهرلك إنت بس، مش للعميل)</p>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={note === null ? (data.user.subscription.adminNote || '') : note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full rounded-xl border border-line-lite bg-night/60 px-3.5 py-2.5 text-[13px] text-ivory placeholder:text-ivory/30 focus:border-brass/60 focus:outline-none"
                      placeholder="سبب الإيقاف، تفاصيل تحويل، أي حاجة..."
                    />
                    <div className="mt-2">
                      <Btn
                        icon={Save} size="sm" loading={saving} disabled={note === null}
                        onClick={() => act({ action: 'note', adminNote: note }).then(() => setNote(null))}
                      >
                        احفظ الملاحظة
                      </Btn>
                    </div>
                  </div>
                </div>
              )}
            </Panel>

            {/* دعواته */}
            <Panel title={`دعواته (${data.invitations.length})`}>
              {data.invitations.length === 0 ? <Empty>مفيش دعوات.</Empty> : (
                <Table head={['الدعوة', 'الحالة', 'مشاهدات', 'اتعملت']}>
                  {data.invitations.map((inv) => (
                    <Row key={inv.shortId}>
                      <Cell>
                        <a
                          href={`/i/${inv.shortId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ivory hover:text-brass-soft"
                        >
                          {inv.names || inv.shortId}
                        </a>
                        <div className="text-[11px] text-ivory/35">{inv.shortId}</div>
                      </Cell>
                      <Cell>
                        <div className="flex flex-wrap gap-1">
                          {inv.isDraft && <Badge>مسودة</Badge>}
                          {inv.isPremium && <Badge tone="gold">مميزة</Badge>}
                          {!inv.isDraft && !inv.isPremium && <Badge tone="muted">مجانية</Badge>}
                        </div>
                      </Cell>
                      <Cell>{fmtNum(inv.views)}</Cell>
                      <Cell className="whitespace-nowrap text-ivory/50">{fmtDate(inv.createdAt)}</Cell>
                    </Row>
                  ))}
                </Table>
              )}
            </Panel>

            {/* طلباته */}
            <Panel title={`طلباته (${data.orders.length})`}>
              {data.orders.length === 0 ? <Empty>مفيش طلبات.</Empty> : (
                <Table head={['الباقة', 'المبلغ', 'الحالة', 'التاريخ', 'الإيصال']}>
                  {data.orders.map((o) => (
                    <Row key={o.id}>
                      <Cell>{o.packageName}</Cell>
                      <Cell className="whitespace-nowrap">{fmtMoney(o.price, o.currency)}</Cell>
                      <Cell>
                        <Badge tone={o.status === 'activated' ? 'ok' : o.status === 'pending' ? 'warn' : 'muted'}>
                          {o.status === 'activated' ? 'مفعّل' : o.status === 'pending' ? 'مستني' : 'ملغي'}
                        </Badge>
                      </Cell>
                      <Cell className="whitespace-nowrap text-ivory/50">{fmtDate(o.createdAt)}</Cell>
                      <Cell>
                        {o.paymentProofUrl ? (
                          <a href={o.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="text-brass-soft hover:underline">
                            شوف
                          </a>
                        ) : <span className="text-ivory/30">—</span>}
                      </Cell>
                    </Row>
                  ))}
                </Table>
              )}
            </Panel>
          </>
        )}
      </div>
    </motion.aside>
  );
}
