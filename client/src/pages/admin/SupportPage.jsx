import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Send, Crown, Ban, MessageSquare } from 'lucide-react';
import {
  useGetSupportThreadsQuery, useGetSupportThreadQuery, useReplySupportMutation,
} from '../../store/adminApi.js';
import { openThread, openUser } from '../../store/adminSlice.js';
import {
  Panel, Badge, Btn, Spinner, Empty, fmtDate,
} from '../../components/admin/ui.jsx';

function Thread({ userId }) {
  const dispatch = useDispatch();
  const { data, isLoading } = useGetSupportThreadQuery(userId);
  const [reply, { isLoading: sending }] = useReplySupportMutation();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [data]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    try {
      await reply({ userId, body: text }).unwrap();
      setText('');
    } catch (err) {
      setError(err?.data?.error || 'الرسالة مابعتتش، جرّب تاني.');
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <Btn size="sm" onClick={() => dispatch(openUser(userId))}>افتح ملف العميل</Btn>
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pe-1">
        {isLoading && <Spinner />}
        {data?.messages?.length === 0 && <Empty>مفيش رسايل في المحادثة دي.</Empty>}
        {data?.messages?.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] ${
              m.from === 'admin'
                ? 'ms-auto bg-brass/20 text-brass-soft'
                : 'me-auto bg-ivory/10 text-ivory/85'
            }`}
          >
            {m.body}
            <div className="mt-1 text-[10px] opacity-50">{fmtDate(m.createdAt, true)}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <div className="mt-2 text-[12px] text-error">{error}</div>}

      <form onSubmit={send} className="mt-3 flex shrink-0 gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="اكتب ردك..."
          className="flex-1 rounded-full border border-line-lite bg-night/60 px-4 py-2.5 text-[13px] text-ivory placeholder:text-ivory/30 focus:border-brass/60 focus:outline-none"
        />
        <Btn tone="gold" icon={Send} loading={sending} onClick={send}>رد</Btn>
      </form>
    </div>
  );
}

export default function SupportPage() {
  const dispatch = useDispatch();
  const openThreadId = useSelector((s) => s.admin.openThreadId);
  const { data, isLoading } = useGetSupportThreadsQuery();

  const totalUnread = (data?.threads || []).reduce((s, t) => s + t.unread, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-[21px] font-bold text-ivory">الدعم</h1>
        <p className="mt-0.5 text-[12.5px] text-ivory/45">
          {totalUnread > 0 ? `${totalUnread} رسالة مقرأتهاش` : 'كل الرسايل مقروءة.'}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <Panel title="المحادثات">
          {isLoading ? <Spinner /> : !data || data.threads.length === 0 ? (
            <Empty>مفيش محادثات لسه.</Empty>
          ) : (
            <div className="max-h-[62vh] space-y-1.5 overflow-y-auto">
              {data.threads.map((t) => (
                <button
                  key={t.userId}
                  type="button"
                  onClick={() => dispatch(openThread(t.userId))}
                  className={`w-full rounded-xl border p-3 text-start transition ${
                    openThreadId === t.userId
                      ? 'border-brass/50 bg-brass/[0.08]'
                      : 'border-line-lite hover:border-ivory/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[13px] font-bold text-ivory">
                      {t.name}
                      {t.isPremium && <Crown size={11} className="text-brass" />}
                      {t.isBlocked && <Ban size={11} className="text-error" />}
                    </span>
                    {t.unread > 0 && (
                      <span className="rounded-full bg-error px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 truncate text-[11.5px] text-ivory/45">
                    {t.lastFrom === 'admin' ? 'أنت: ' : ''}{t.lastMessage}
                  </div>
                  <div className="mt-1 text-[10.5px] text-ivory/30">{fmtDate(t.lastAt, true)}</div>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="المحادثة" className="min-h-[62vh]">
          {openThreadId ? (
            <div className="h-[52vh]">
              <Thread userId={openThreadId} />
            </div>
          ) : (
            <div className="flex h-[52vh] flex-col items-center justify-center gap-3 text-ivory/35">
              <MessageSquare size={26} />
              <p className="text-[13px]">اختار محادثة من الجنب.</p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
