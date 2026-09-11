// سجل الإجراءات — مين عمل إيه على مين وإمتى.
//
// السجل ده للقراءة بس: مفيش أي مسار في السيرفر بيعدّل أو يمسح منه.
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useGetAuditQuery } from '../../store/adminApi.js';
import {
  Panel, Badge, Table, Row, Cell, Spinner, Empty, Pager, fmtDate,
} from '../../components/admin/ui.jsx';

// وصف عربي لكل إجراء + لونه حسب خطورته
const ACTIONS = {
  'order.activate': { label: 'تفعيل طلب', tone: 'ok' },
  'order.cancel': { label: 'إلغاء طلب', tone: 'warn' },
  'order.revoke': { label: 'إلغاء باقة مدفوعة', tone: 'danger' },
  'subscription.suspend': { label: 'إيقاف باقة', tone: 'danger' },
  'subscription.resume': { label: 'تشغيل باقة', tone: 'ok' },
  'subscription.cancel': { label: 'إلغاء باقة نهائيًا', tone: 'danger' },
  'subscription.grant': { label: 'منح باقة', tone: 'gold' },
  'subscription.setCredits': { label: 'تعديل رصيد', tone: 'warn' },
  'subscription.note': { label: 'ملاحظة إدارية', tone: 'muted' },
  'user.block': { label: 'حظر حساب', tone: 'danger' },
  'user.unblock': { label: 'رفع حظر', tone: 'ok' },
  'settings.payment': { label: 'تعديل بيانات الدفع', tone: 'muted' },
};

/** ملخص قصير للتفاصيل بدل ما نرمي JSON خام في وش المستخدم */
function summarize(entry) {
  const m = entry.meta || {};
  if (entry.action === 'subscription.setCredits' && m.before && m.after) {
    return `الرصيد: ${m.before.invitationsLeft} ← ${m.after.invitationsLeft}`;
  }
  if (entry.action === 'subscription.grant' && m.after) {
    return `الباقة: ${m.after.packageId} · الرصيد بقى ${m.after.invitationsLeft}`;
  }
  if (entry.action === 'order.activate') {
    return `${m.packageId || ''} · ${m.price || 0} ${m.currency || ''} · الرصيد بقى ${m.creditsAfter}`;
  }
  if (entry.action === 'order.cancel') {
    return `${m.packageId || ''} · ${m.price || 0} ${m.currency || ''}`;
  }
  if (entry.action === 'order.revoke') {
    return `${m.packageId || ''} · اتسحب ${m.creditsRemoved || 0} من الرصيد`;
  }
  if (entry.action === 'user.block') {
    return `اتقفل ${m.killedSessions || 0} جلسة مفتوحة`;
  }
  if (m.before && m.after && m.before.status !== m.after.status) {
    return `الحالة: ${m.before.status} ← ${m.after.status}`;
  }
  return '—';
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetAuditQuery(page);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-[21px] font-bold text-ivory">سجل الإجراءات</h1>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ivory/45">
          <ShieldCheck size={13} />
          كل إجراء إداري بيتسجّل هنا تلقائيًا — للقراءة بس، مفيش طريقة تعدّله أو تمسحه.
        </p>
      </div>

      <Panel title={data ? `${data.total} إجراء` : 'السجل'}>
        {isLoading ? <Spinner /> : !data || data.entries.length === 0 ? (
          <Empty>لسه مفيش إجراءات مسجّلة.</Empty>
        ) : (
          <>
            <Table head={['الإجراء', 'على مين', 'التفاصيل', 'IP', 'إمتى']}>
              {data.entries.map((e) => {
                const meta = ACTIONS[e.action] || { label: e.action, tone: 'muted' };
                return (
                  <Row key={e.id}>
                    <Cell><Badge tone={meta.tone}>{meta.label}</Badge></Cell>
                    <Cell className="text-ivory/75">{e.targetLabel || e.targetId || '—'}</Cell>
                    <Cell className="text-ivory/50">{summarize(e)}</Cell>
                    <Cell className="font-mono text-[11px] text-ivory/35">{e.ip || '—'}</Cell>
                    <Cell className="whitespace-nowrap text-ivory/45">{fmtDate(e.createdAt, true)}</Cell>
                  </Row>
                );
              })}
            </Table>
            <Pager page={data.page} pages={data.pages} onChange={setPage} />
          </>
        )}
      </Panel>
    </div>
  );
}
