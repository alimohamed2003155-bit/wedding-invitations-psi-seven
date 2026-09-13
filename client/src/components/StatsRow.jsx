import { useTranslation } from 'react-i18next';
import { useGetPublicStatsQuery } from '../store/api.js';

const numberFormatter = new Intl.NumberFormat('en-US');

/**
 * الحد الأدنى اللي بيتعرض لعدد المستخدمين.
 * لازم يكون في مكان واحد ويتستخدم في الشارة اللي فوق وفي الأرقام —
 * غير كده الشارة تقول 200K والرقم تحتها يقول 21 ألف في نفس الشاشة.
 */
export const USERS_FLOOR = 200000;

/** 200000 → "200K" · 1250000 → "1.3M" */
export function compactCount(n) {
  const v = Number(n) || 0;
  if (v >= 1000000) {
    const m = v / 1000000;
    return (m >= 10 ? Math.round(m) : Math.round(m * 10) / 10) + 'M';
  }
  if (v >= 1000) return Math.round(v / 1000) + 'K';
  return String(v);
}

function StatItem({ value, label, loading, compact }) {
  return (
    <div className="border-e border-ivory/10 px-2.5 text-center last:border-e-0 sm:px-4 sm:text-start">
      <span
        dir="ltr"
        className="block font-serif text-[clamp(22px,5.2vw,34px)] font-bold leading-none text-brass-soft"
      >
        {loading ? '—' : (compact ? compactCount(value) + '+' : numberFormatter.format(value || 0))}
      </span>
      <span className="mt-2 block text-[11.5px] leading-[1.6] text-[#a9bab1] sm:text-[12.5px]">{label}</span>
    </div>
  );
}

export default function StatsRow() {
  const { t } = useTranslation();
  const { data, isLoading } = useGetPublicStatsQuery();

  return (
    <div className="mt-9 grid grid-cols-3 gap-0 border-t border-ivory/10 pt-6 lg:mt-12 lg:pt-7">
      <StatItem value={data?.totalInvitations} label={t('hero.statInvitations')} loading={isLoading} />
      <StatItem value={data?.totalViews} label={t('hero.statViews')} loading={isLoading} />
      <StatItem
        value={Math.max(USERS_FLOOR, data?.totalUsers || 0)}
        label={t('hero.statUsers')}
        loading={isLoading}
        compact
      />
    </div>
  );
}
