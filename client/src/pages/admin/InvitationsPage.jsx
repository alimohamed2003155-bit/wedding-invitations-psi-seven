import { useDispatch, useSelector } from 'react-redux';
import { Search, ExternalLink, BarChart3 } from 'lucide-react';
import { useGetInvitationsQuery } from '../../store/adminApi.js';
import { setInvitationsQuery, setInvitationsPage, openUser } from '../../store/adminSlice.js';
import {
  Panel, Badge, Table, Row, Cell, Spinner, Empty, Pager, Field, fmtDate, fmtNum,
} from '../../components/admin/ui.jsx';

export default function InvitationsPage() {
  const dispatch = useDispatch();
  const { invitationsQuery, invitationsPage } = useSelector((s) => s.admin);
  const { data, isLoading, isFetching } = useGetInvitationsQuery({
    q: invitationsQuery, page: invitationsPage,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-[21px] font-bold text-ivory">الدعوات</h1>
        <p className="mt-0.5 text-[12.5px] text-ivory/45">
          كل دعوة على الموقع — ابحث بالاسم، القاعة، أو كود اللينك.
        </p>
      </div>

      <Panel
        title={data ? `${fmtNum(data.total)} دعوة` : 'الدعوات'}
        subtitle={isFetching ? 'بيحدّث...' : undefined}
      >
        <div className="mb-4 flex items-center gap-2">
          <Search size={15} className="text-ivory/35" />
          <Field
            placeholder="اسم العروسين، القاعة، أو كود الدعوة..."
            value={invitationsQuery}
            onChange={(e) => dispatch(setInvitationsQuery(e.target.value))}
            className="flex-1"
          />
        </div>

        {isLoading ? <Spinner /> : !data || data.invitations.length === 0 ? (
          <Empty>مفيش دعوات بالبحث ده.</Empty>
        ) : (
          <>
            <Table head={['الدعوة', 'التصميم', 'صاحبها', 'مشاهدات', 'الفرح', 'اتعملت', '']}>
              {data.invitations.map((inv) => (
                <Row key={inv.shortId}>
                  <Cell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-ivory">{inv.namesAr || inv.namesEn}</span>
                      {inv.isDraft && <Badge>مسودة</Badge>}
                      {inv.isPremium && <Badge tone="gold">مميزة</Badge>}
                    </div>
                    <div className="text-[11px] text-ivory/35">{inv.shortId} · {inv.venueName}</div>
                  </Cell>
                  <Cell className="text-ivory/60">{inv.templateName}</Cell>
                  <Cell>
                    {inv.owner ? (
                      <button
                        type="button"
                        onClick={() => dispatch(openUser(inv.owner.id))}
                        className="text-ivory/80 hover:text-brass-soft"
                      >
                        {inv.owner.name}
                      </button>
                    ) : <span className="text-ivory/30">زائر</span>}
                  </Cell>
                  <Cell>{fmtNum(inv.views)}</Cell>
                  <Cell className="whitespace-nowrap text-ivory/55">{fmtDate(inv.weddingDate)}</Cell>
                  <Cell className="whitespace-nowrap text-ivory/45">{fmtDate(inv.createdAt)}</Cell>
                  <Cell>
                    <div className="flex gap-2">
                      <a
                        href={`/i/${inv.shortId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="افتح الدعوة"
                        className="text-ivory/50 hover:text-brass-soft"
                      >
                        <ExternalLink size={13} />
                      </a>
                      <a
                        href={`/i/${inv.shortId}/stats`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="إحصائياتها"
                        className="text-ivory/50 hover:text-brass-soft"
                      >
                        <BarChart3 size={13} />
                      </a>
                    </div>
                  </Cell>
                </Row>
              ))}
            </Table>
            <Pager page={data.page} pages={data.pages} onChange={(p) => dispatch(setInvitationsPage(p))} />
          </>
        )}
      </Panel>
    </div>
  );
}
