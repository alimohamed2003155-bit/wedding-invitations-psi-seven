import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence } from 'motion/react';
import { Search, Crown, Ban, PauseCircle } from 'lucide-react';
import { useGetUsersQuery } from '../../store/adminApi.js';
import {
  setUsersQuery, setUsersStatus, setUsersPage, openUser, closeUser,
} from '../../store/adminSlice.js';
import {
  Panel, Badge, Table, Row, Cell, Spinner, Empty, Tabs, Pager, Field, fmtDate, fmtNum,
} from '../../components/admin/ui.jsx';
import ClientDrawer from './ClientDrawer.jsx';

const FILTERS = [
  { value: 'all', label: 'الكل' },
  { value: 'premium', label: 'مدفوعين' },
  { value: 'free', label: 'مجانيين' },
  { value: 'suspended', label: 'موقوفين' },
  { value: 'blocked', label: 'محظورين' },
];

export default function ClientsPage() {
  const dispatch = useDispatch();
  const { usersQuery, usersStatus, usersPage, openUserId } = useSelector((s) => s.admin);
  const { data, isLoading, isFetching } = useGetUsersQuery({
    q: usersQuery, status: usersStatus, page: usersPage,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-[21px] font-bold text-ivory">العملاء</h1>
        <p className="mt-0.5 text-[12.5px] text-ivory/45">
          اضغط على أي عميل تفتح ملفه الكامل وتتحكم في باقته.
        </p>
      </div>

      <Panel
        title={data ? `${fmtNum(data.total)} عميل` : 'العملاء'}
        subtitle={isFetching ? 'بيحدّث...' : undefined}
        action={<Tabs value={usersStatus} onChange={(v) => dispatch(setUsersStatus(v))} options={FILTERS} />}
      >
        <div className="mb-4 flex items-center gap-2">
          <Search size={15} className="text-ivory/35" />
          <Field
            placeholder="ابحث بالاسم أو الإيميل..."
            value={usersQuery}
            onChange={(e) => dispatch(setUsersQuery(e.target.value))}
            className="flex-1"
          />
        </div>

        {isLoading ? <Spinner /> : !data || data.users.length === 0 ? (
          <Empty>مفيش عملاء بالفلتر ده.</Empty>
        ) : (
          <>
            <Table head={['العميل', 'الباقة', 'الرصيد', 'الدعوات', 'الدولة', 'سجّل']}>
              {data.users.map((u) => (
                <Row key={u.id} onClick={() => dispatch(openUser(u.id))}>
                  <Cell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-ivory">{u.name}</span>
                      {u.isSuspended && <Badge tone="danger" icon={PauseCircle}>موقوف</Badge>}
                      {u.isBlocked && <Badge tone="danger" icon={Ban}>محظور</Badge>}
                    </div>
                    <div className="text-[11px] text-ivory/40">{u.email}</div>
                  </Cell>
                  <Cell>
                    {u.isPremium
                      ? <Badge tone="gold" icon={Crown}>{u.packageName}</Badge>
                      : <span className="text-ivory/35">مجاني</span>}
                  </Cell>
                  <Cell className={u.invitationsLeft > 0 ? 'font-bold text-brass-soft' : 'text-ivory/35'}>
                    {fmtNum(u.invitationsLeft)}
                  </Cell>
                  <Cell>
                    {fmtNum(u.invitations)}
                    {u.drafts > 0 && <span className="text-ivory/35"> +{u.drafts} مسودة</span>}
                  </Cell>
                  <Cell className="text-ivory/55">{u.country}</Cell>
                  <Cell className="whitespace-nowrap text-ivory/45">{fmtDate(u.createdAt)}</Cell>
                </Row>
              ))}
            </Table>
            <Pager page={data.page} pages={data.pages} onChange={(p) => dispatch(setUsersPage(p))} />
          </>
        )}
      </Panel>

      <AnimatePresence>
        {openUserId && <ClientDrawer userId={openUserId} onClose={() => dispatch(closeUser())} />}
      </AnimatePresence>
      {openUserId && (
        <button
          type="button"
          aria-label="اقفل"
          onClick={() => dispatch(closeUser())}
          className="fixed inset-0 z-40 bg-black/55"
        />
      )}
    </div>
  );
}
