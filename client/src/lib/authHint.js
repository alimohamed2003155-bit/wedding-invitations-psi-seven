// تلميح "أنا كنت داخل" — عشان الصفحة ماتقولش للعميل إنه مطرود وهو مش مطرود.
//
// المشكلة اللي بيحلها: الصفحة مبتعرفش مين الداخل غير لما رد
// /api/auth/me يوصل. في الوقت ده (جزء من ثانية على النت السريع، وممكن
// يوصل لثانيتين على بيانات الموبايل) الشريط العلوي كان بيعرض
// "تسجيل الدخول / حساب جديد" — فالعميل بيفتكر إن جلسته راحت مع كل
// ريفرش، وبعدين الشريط بيتغيّر قدامه فجأة.
//
// الحل: بنفتكر **إن فيه حد داخل واسمه إيه** بس. أول رسمة للصفحة بتطلع
// صح على طول، وأول ما الرد الحقيقي يوصل بنصحّح لو اتغيّر حاجة.
//
// ===== مهم للأمان =====
// اللي بيتخزن هنا **مش توكن ولا صلاحية ولا أي سر** — مجرد اسم بيتعرض
// في الشريط. التوكن نفسه بيفضل في كوكي httpOnly الجافاسكريبت عمره ما
// يشوفه. لو حد غيّر اللي متخزن هنا بإيده، أقصى اللي هيحصل إن اسم غلط
// يبان في الشريط لجزء من ثانية — أي طلب حقيقي للسيرفر لسه بيتحقق من
// الكوكي وبيرفض.
const KEY = 'mithaq:signed-in';

/** @returns {{name: string}|null} */
export function readAuthHint() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.name !== 'string') return null;
    return { name: parsed.name.slice(0, 80) };
  } catch {
    return null; // تصفح خاص أو تخزين مقفول — بنكمّل عادي من غيره
  }
}

export function writeAuthHint(user) {
  try {
    if (user && user.name) {
      localStorage.setItem(KEY, JSON.stringify({ name: String(user.name).slice(0, 80) }));
    } else {
      localStorage.removeItem(KEY);
    }
  } catch { /* مش مشكلة — ده تحسين شكلي مش أكتر */ }
}

export function clearAuthHint() {
  try { localStorage.removeItem(KEY); } catch { /* */ }
}
