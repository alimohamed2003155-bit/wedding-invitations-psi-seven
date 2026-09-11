import { useTranslation } from 'react-i18next';

export default function ExtraFields({ fields, register }) {
  const { t } = useTranslation();
  if (!fields.length) return null;
  return (
    <fieldset className="mb-7 border-0 p-0">
      <legend className="mb-3.5 text-xs font-bold uppercase tracking-[0.15em] text-emerald">
        {t('create.extraFields')}
      </legend>
      <div className="flex flex-col gap-4">
        {fields.map((f) => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <label className="text-[13px] text-ink-dim">{f.label}</label>
            <input
              type="text"
              maxLength={f.maxlength || 200}
              className="border-0 border-b border-line bg-transparent px-0.5 py-2.5 text-base text-ink focus:border-rose focus:outline-none"
              {...register(`extra.${f.key}`)}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
