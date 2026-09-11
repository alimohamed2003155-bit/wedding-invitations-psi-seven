export default function SectionToggles({ sections, register }) {
  return (
    <div className="flex flex-col gap-3">
      {sections.map((s) => (
        <label key={s.key} className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            defaultChecked
            className="h-4 w-4 accent-rose"
            {...register(`sections.${s.key}`)}
          />
          {s.label}
        </label>
      ))}
    </div>
  );
}
