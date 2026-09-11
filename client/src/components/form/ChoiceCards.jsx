export default function ChoiceCards({ name, options, register }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="cursor-pointer select-none rounded-full border border-line px-4.5 py-2.5 text-sm text-ink transition-colors has-checked:border-rose has-checked:bg-rose/[0.08] has-checked:text-rose"
        >
          <input type="radio" value={opt.value} className="hidden" {...register(name)} />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
