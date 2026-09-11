import { useDispatch, useSelector } from 'react-redux';
import {
  Users, Crown, FileText, Eye, MessageSquare, Wallet, Clock, Ban, PauseCircle,
} from 'lucide-react';
import { useGetOverviewQuery } from '../../store/adminApi.js';
import { setPeriod } from '../../store/adminSlice.js';
import {
  Panel, StatTile, Spinner, Tabs, Empty, fmtNum, fmtMoney,
} from '../../components/admin/ui.jsx';
import { AreaTrend, BarTrend, LineTrend, Donut, COLORS } from '../../components/admin/Charts.jsx';

const PERIODS = [
  { value: 7, label: 'آخر أسبوع' },
  { value: 30, label: 'آخر شهر' },
  { value: 90, label: '3 شهور' },
  { value: 365, label: 'سنة' },
];

export default function OverviewPage() {
  const dispatch = useDispatch();
  const period = useSelector((s) => s.admin.period);
  const { data, isLoading, isFetching } = useGetOverviewQuery(period);

  if (isLoading) return <Spinner label="بنجمّع الأرقام..." />;
  if (!data) return <Empty>مفيش بيانات.</Empty>;

  const { kpis, revenue, series, breakdown } = data;

  return (
    <div className="space-y-5">
      {/* الفترة */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-[21px] font-bold text-ivory">نظرة عامة</h1>
          <p className="mt-0.5 text-[12.5px] text-ivory/45">
            الأرقام الكبيرة إجمالية، والرسوم على الفترة المختارة.
            {isFetching && ' · بيحدّث...'}
          </p>
        </div>
        <Tabs value={period} onChange={(v) => dispatch(setPeriod(v))} options={PERIODS} />
      </div>

      {/* الأرباح */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Wallet} tone="gold" delay={0}
          label="أرباح بالجنيه (كل الوقت)"
          value={fmtMoney(revenue.all.EGP.total, 'EGP')}
          hint={`${revenue.all.EGP.orders} طلب`}
        />
        <StatTile
          icon={Wallet} tone="gold" delay={0.04}
          label="أرباح بالدولار (كل الوقت)"
          value={fmtMoney(revenue.all.USD.total, 'USD')}
          hint={`${revenue.all.USD.orders} طلب`}
        />
        <StatTile
          icon={Wallet} delay={0.08}
          label={`أرباح الفترة (جنيه)`}
          value={fmtMoney(revenue.period.EGP.total, 'EGP')}
          hint={`${revenue.period.EGP.orders} طلب`}
        />
        <StatTile
          icon={Wallet} delay={0.12}
          label={`أرباح الفترة (دولار)`}
          value={fmtMoney(revenue.period.USD.total, 'USD')}
          hint={`${revenue.period.USD.orders} طلب`}
        />
      </div>

      {/* أرقام الموقع */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Users} label="عملاء مسجّلين" value={fmtNum(kpis.users)} delay={0} />
        <StatTile icon={Crown} tone="gold" label="عملاء مدفوعين" value={fmtNum(kpis.premiumUsers)} delay={0.04} />
        <StatTile icon={FileText} label="دعوات منشورة" value={fmtNum(kpis.invitations)} hint={`${kpis.draftInvitations} مسودة`} delay={0.08} />
        <StatTile icon={Eye} label="مشاهدات الدعوات" value={fmtNum(kpis.views)} delay={0.12} />
        <StatTile icon={MessageSquare} label="ردود الحضور" value={fmtNum(kpis.rsvps)} delay={0.16} />
        <StatTile
          icon={Clock} tone={kpis.pendingOrders ? 'gold' : 'default'}
          label="طلبات مستنية تفعيل" value={fmtNum(kpis.pendingOrders)} delay={0.2}
        />
        <StatTile
          icon={PauseCircle} tone={kpis.suspendedSubs ? 'danger' : 'default'}
          label="باقات موقوفة" value={fmtNum(kpis.suspendedSubs)} delay={0.24}
        />
        <StatTile
          icon={Ban} tone={kpis.blockedUsers ? 'danger' : 'default'}
          label="حسابات محظورة" value={fmtNum(kpis.blockedUsers)} delay={0.28}
        />
      </div>

      {/* الرسوم */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="الأرباح يوم بيوم" subtitle="الطلبات المفعّلة بس — العملتين منفصلين">
          <BarTrend
            data={series.revenue}
            keys={[
              { key: 'egp', label: 'جنيه', color: COLORS.GOLD },
              { key: 'usd', label: 'دولار', color: COLORS.EMERALD },
            ]}
          />
        </Panel>

        <Panel title="الدعوات الجديدة" subtitle="إجمالي الدعوات، والمميز منها">
          <AreaTrend
            data={series.invitations}
            keys={[
              { key: 'count', label: 'كل الدعوات', color: COLORS.ROSE },
              { key: 'premium', label: 'مميزة', color: COLORS.GOLD },
            ]}
          />
        </Panel>

        <Panel title="التسجيلات الجديدة" subtitle="حسابات اتعملت في الفترة">
          <AreaTrend data={series.users} keys={[{ key: 'count', label: 'حسابات', color: COLORS.EMERALD }]} />
        </Panel>

        <Panel title="ردود الحضور" subtitle="كل الردود، والموافقين منهم">
          <LineTrend
            data={series.rsvps}
            keys={[
              { key: 'count', label: 'كل الردود', color: COLORS.GOLD_SOFT },
              { key: 'yes', label: 'هيحضروا', color: COLORS.EMERALD },
            ]}
          />
        </Panel>
      </div>

      {/* التوزيعات */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="التصاميم الأكثر استخدامًا">
          {breakdown.templates.length
            ? <Donut data={breakdown.templates.map((t) => ({ label: t.label, count: t.count }))} />
            : <Empty>لسه مفيش دعوات.</Empty>}
        </Panel>

        <Panel title="الباقات المباعة">
          {breakdown.packages.length ? (
            <>
              <Donut data={breakdown.packages.map((p) => ({ label: p.label, count: p.count }))} />
              <div className="mt-3 space-y-1.5">
                {breakdown.packages.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-[12px] text-ivory/60">
                    <span>{p.label}</span>
                    <span className="text-ivory/80">
                      {p.egp > 0 && fmtMoney(p.egp, 'EGP')}
                      {p.egp > 0 && p.usd > 0 && ' · '}
                      {p.usd > 0 && fmtMoney(p.usd, 'USD')}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : <Empty>لسه مفيش باقات متفعّلة.</Empty>}
        </Panel>

        <Panel title="العملاء حسب الدولة">
          {breakdown.countries.length
            ? <Donut data={breakdown.countries.map((c) => ({ label: c.id, count: c.count }))} />
            : <Empty>لسه مفيش عملاء.</Empty>}
        </Panel>
      </div>
    </div>
  );
}
