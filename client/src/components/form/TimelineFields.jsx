import { useTranslation } from 'react-i18next';

function hourLabel(h, lang) {
  const isAr = lang === 'ar';
  const period = h < 12 ? (isAr ? 'صباحًا' : 'AM') : isAr ? 'مساءً' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${period}`;
}

export default function TimelineFields({ stages, register }) {
  const { t, i18n } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {stages.map((key) => (
        <div key={key} className="flex flex-col gap-1.5">
          <label className="text-[13px] text-ink-dim">{t(`stages.${key}`, { defaultValue: key })}</label>
          <select
            className="border-0 border-b border-line bg-transparent px-0.5 py-2.5 text-base text-ink focus:border-rose focus:outline-none"
            {...register(`timeline.${key}`)}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {hourLabel(h, i18n.language)}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
