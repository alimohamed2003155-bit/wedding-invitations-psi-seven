// حدود الرفع ورسايل الفشل — مكان واحد للمحرر وللوحة التحكم.
//
// الحد مش اختيار شكلي: المنصة اللي الموقع شغال عليها (Vercel) بترفض أي
// طلب جسمه أكبر من ~4.5 ميجا **قبل ما يوصل السيرفر**، وبترد نص عادي
// (413 FUNCTION_PAYLOAD_TOO_LARGE) مش JSON. لو الواجهة سابت العميل
// يختار ملف أكبر، هيستنى الرفع كله عشان ياخد في الآخر رسالة فشل
// مالهاش أي علاقة بالسبب الحقيقي — وده اللي كان بيحصل.
//
// (نفس الرقم في utils/uploadSecurity.js على السيرفر — لو غيّرت هنا
//  غيّر هناك.)
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = '4 ميجا';

/** بيحوّل البايتات لرقم يقراه الإنسان */
export function fmtSize(bytes) {
  const mb = Number(bytes || 0) / (1024 * 1024);
  if (mb >= 1) return mb.toFixed(1).replace(/\.0$/, '') + ' ميجا';
  return Math.max(1, Math.round(Number(bytes || 0) / 1024)) + ' كيلو';
}

export function tooBig(file) {
  return !!file && file.size > MAX_UPLOAD_BYTES;
}

/** رسالة بتقول الحجم الحقيقي والحد، وإيه الحل */
export function sizeError(file) {
  return `الملف ده ${fmtSize(file.size)} — الحد الأقصى ${MAX_UPLOAD_LABEL}. `
    + 'اقص منه أو اضغطه وجرّب تاني.';
}

/**
 * رسالة مفهومة لأي فشل رفع.
 * الحالة المهمة: 413 بييجي من المنصة نفسها كنص عادي — من غير التفرقة
 * دي كان العميل بياخد "اتأكد إن الملف صوت حقيقي" وملفه صوت حقيقي فعلاً.
 */
export function uploadError(err, t) {
  // RTK Query لما الرد مايكونش JSON بيحط status: 'PARSING_ERROR' ويحط
  // الكود الحقيقي في originalStatus. ورد 413 بتاع المنصة نص عادي — يعني
  // بيعدّي من هنا بالظبط. فبنقرا originalStatus الأول.
  const status = (err && (err.originalStatus ?? err.status)) ?? null;
  if (status === 413) {
    return `الملف أكبر من اللي السيرفر بيقبله (${MAX_UPLOAD_LABEL}). اقص منه أو اضغطه وجرّب تاني.`;
  }
  if (status === 401) return 'جلستك انتهت — سجّل الدخول تاني.';
  if (status === 429) return 'محاولات كتير ورا بعض — استنى شوية وجرّب تاني.';
  if (status === 503) return 'خدمة رفع الملفات مش متاحة دلوقتي — جرّب بعد شوية.';
  const serverMsg = err && err.data && err.data.error;
  if (serverMsg) return serverMsg;
  if (status === 'FETCH_ERROR') return 'الاتصال اتقطع وإنت بترفع — جرّب تاني.';
  return t ? t('editor.errorUpload') : 'الرفع فشل — جرّب تاني.';
}
