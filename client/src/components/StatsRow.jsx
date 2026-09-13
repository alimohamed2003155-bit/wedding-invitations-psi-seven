import { useTranslation } from 'react-i18next';
import { useGetPublicStatsQuery } from '../store/api.js';

// الأرقام دي حقيقية — بتيجي من قاعدة البيانات زي ما هي، من غير أي
// حد أدنى ولا تقريب. (routes/invitations.js: /api/public-stats)
const numberFormatter = new Intl.NumberFormat('en-US');

function StatItem({ value, label, loading }) {
  return (
    <div className="border-e border-ivory/10 px-2.5 text-center last:border-e-0 sm:px-4 sm:text-start">
      <span
        dir="ltr"
        className="block font-serif text-[clamp(22px,5.2vw,34px)] font-bold leading-none text-brass-soft"
      >
        {loading ? '—' : numberFormatter.format(value || 0)}
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
      <StatItem value={data?.totalUsers} label={t('hero.statUsers')} loading={isLoading} />
    </div>
  );
}
