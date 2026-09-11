import { useTranslation } from 'react-i18next';
import { useGetPublicStatsQuery } from '../store/api.js';

const numberFormatter = new Intl.NumberFormat('en-US');

function StatItem({ value, label, loading }) {
  return (
    <div className="border-e border-ivory/10 px-4 text-start last:border-e-0">
      <span className="block font-serif text-[clamp(26px,3.4vw,38px)] font-bold leading-none text-brass-soft">
        {loading ? '—' : numberFormatter.format(value || 0)}
      </span>
      <span className="mt-2 block text-[12.5px] text-[#a9bab1]">{label}</span>
    </div>
  );
}

export default function StatsRow() {
  const { t } = useTranslation();
  const { data, isLoading } = useGetPublicStatsQuery();

  return (
    <div className="mt-12 grid grid-cols-3 gap-0 border-t border-ivory/10 pt-7">
      <StatItem value={data?.totalInvitations} label={t('hero.statInvitations')} loading={isLoading} />
      <StatItem value={data?.totalViews} label={t('hero.statViews')} loading={isLoading} />
      <StatItem value={data?.totalUsers} label={t('hero.statUsers')} loading={isLoading} />
    </div>
  );
}
