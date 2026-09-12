// علامات طرق الدفع.
//
// ليه أصلاً: العميل بيوصل صفحة الدفع وبيشوف رقم موبايل وكلام — مش
// واضح إن ده فودافون كاش. العلامة بتقوله في جزء من ثانية "دي الحاجة
// اللي إنت عارفها"، وده بيفرق في إنه يكمّل ولا يقفل.
//
// ===== لو عايز اللوجو الرسمي بالظبط =====
// حط الصورة في: client/public/img/vodafone-cash.png
// وهي هتتستخدم تلقائيًا من غير أي تعديل في الكود. ولو الملف مش موجود
// (أو مش راضي يتحمّل) بيرجع للرسم اللي تحت — فالصفحة مبتتكسرش أبدًا.
import { useState } from 'react';

const OFFICIAL_LOGO = '/img/vodafone-cash.png';
const VODAFONE_RED = '#E60000';
const CASH_GREEN = '#4CAF2E';

/** علامة فودافون: الحلقة الحمرا والاقتباس الأبيض اللي جواها */
export function VodafoneMark({ size = 34 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* الحلقة: دايرة حمرا وجواها دايرة بيضا */}
      <circle cx="50" cy="50" r="47" fill={VODAFONE_RED} />
      <circle cx="50" cy="54" r="22" fill="#fff" />
      {/* الاقتباس: بيطلع من الدايرة البيضا لفوق ناحية اليمين وبيرفع
          لبرّه — ده الجزء اللي بيخلي العلامة تتعرف من نظرة */}
      <path
        fill="#fff"
        d="M72 50c0-16 -9-28 -22-33 4 9 5 18 3 26 -2 9 -8 16 -16 20 4 4 10 6 16 6 11 0 19-8 19-19z"
      />
    </svg>
  );
}

/** أيقونة "كاش": موبايل أحمر وجواه فلوس خضرا */
function CashMark({ size = 34 }) {
  return (
    <svg width={size * 0.72} height={size} viewBox="0 0 72 100" aria-hidden="true" className="shrink-0">
      <rect x="4" y="4" width="64" height="92" rx="10" fill={VODAFONE_RED} />
      <rect x="12" y="18" width="48" height="62" fill="#fff" />
      <rect x="26" y="10" width="20" height="4" rx="2" fill="#fff" />
      <circle cx="36" cy="88" r="5" fill="#fff" />
      {/* ورقة الفلوس */}
      <path
        fill={CASH_GREEN}
        d="M14 56c8-14 22-20 34-22l12-2-2 14c-1 8-8 14-17 15-9 1-19-1-27-5z"
      />
    </svg>
  );
}

/**
 * اللوجو الكامل "vodafone | cash".
 * بيستخدم الصورة الرسمية لو موجودة، وإلا بيرسمه.
 */
export function VodafoneCashLogo({ height = 34 }) {
  const [useDrawn, setUseDrawn] = useState(false);

  if (!useDrawn) {
    return (
      <img
        src={OFFICIAL_LOGO}
        alt="Vodafone Cash"
        style={{ height }}
        className="w-auto shrink-0 object-contain"
        onError={() => setUseDrawn(true)}
      />
    );
  }

  const word = { color: VODAFONE_RED, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 };
  return (
    // dir="ltr" لازم: الصفحة عربي (RTL) فالترتيب كان بينقلب ويطلع
    // "cash | vodafone" — واسم العلامة ترتيبه ثابت مهما كانت لغة الصفحة
    <span dir="ltr" className="inline-flex shrink-0 items-center gap-1.5" aria-label="Vodafone Cash">
      <VodafoneMark size={height} />
      <span style={{ ...word, fontSize: height * 0.5 }}>vodafone</span>
      <span style={{ background: VODAFONE_RED, width: 2, height: height * 0.66, opacity: 0.5 }} />
      <CashMark size={height * 0.9} />
      <span style={{ ...word, fontSize: height * 0.5 }}>cash</span>
    </span>
  );
}

/** علامة التحويل البنكي — لعملاء بره مصر */
export function BankMark({ size = 34 }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-emerald/15 text-emerald"
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
