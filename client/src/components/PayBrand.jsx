// علامات طرق الدفع.
//
// ليه رسمناها بدل صور: صورة الشعار ملف زيادة بيتحمّل، وبتتكسر لو
// الشبكة ضعيفة، وبتبقى مشوّشة على الشاشات العالية الدقة. الرسم بيطلع
// حاد على أي مقاس ووزنه صفر.
//
// وليه أصلاً: العميل بيوصل صفحة الدفع وبيشوف رقم موبايل وكلام — مش
// واضح إن ده فودافون كاش أصلاً. العلامة بتقوله في جزء من الثانية
// "دي الحاجة اللي إنت عارفها"، وده بيفرق في إنه يكمّل ولا يقفل.

/** علامة فودافون — الاقتباس الأحمر المعروف */
export function VodafoneMark({ size = 34 }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full"
      style={{ width: size, height: size, background: '#E60000' }}
      aria-hidden="true"
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="#fff">
        {/* الشكل المميز: دايرة ناقصة بذيل — علامة فودافون */}
        <path d="M12 2.6c-5.2 0-9.4 4.2-9.4 9.4 0 5.2 4.2 9.4 9.4 9.4.5 0 1-.04 1.5-.12-.05-.5-.08-1-.08-1.5 0-4.6 2.7-8.5 6.6-10.3-.2-.1-.4-.2-.6-.28C17.7 4.6 15 2.6 12 2.6zm0 2.1c1.9 0 3.6 1 4.6 2.5-3.9 2.2-6.4 6.3-6.4 10.9 0 .3 0 .6.04.9-2.4-1-4-3.4-4-6.1 0-4.5 3-8.2 5.8-8.2z" />
      </svg>
    </span>
  );
}

/** شارة كاملة "فودافون كاش" */
export function VodafoneCashBadge({ label = 'فودافون كاش' }) {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full bg-[#E60000]/[0.08] px-3.5 py-2">
      <VodafoneMark size={26} />
      <span className="text-[13px] font-extrabold text-[#c00]">{label}</span>
    </span>
  );
}

/** علامة التحويل البنكي — لعملاء بره مصر */
export function BankMark({ size = 34 }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-emerald/15 text-emerald"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18M12 3l9 5H3l9-5z" />
      </svg>
    </span>
  );
}
