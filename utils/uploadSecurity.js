// utils/uploadSecurity.js
// فحص أي ملف بيرفعه العميل قبل ما يتخزن. الفكرة الأساسية:
// **مبنثقش في اسم الملف ولا في نوعه اللي المتصفح بيقوله** — الاتنين
// المهاجم بيتحكم فيهم. بنقرا أول بايتات الملف نفسه ونحدد نوعه الحقيقي
// منها (magic bytes)، ولو مش من الأنواع المسموحة بنرفضه.
//
// طبقات الحماية:
//  1) حد أقصى للحجم (قبل ما يتقرا أصلًا) — multer بيقطع الطلب.
//  2) النوع الحقيقي من محتوى الملف مش من الامتداد.
//  3) قايمة بيضاء ضيقة (JPEG/PNG/WebP للصور، MP3/M4A/OGG للصوت).
//  4) منع SVG نهائيًا — ملف نصي ممكن يتحقن فيه جافاسكريبت (XSS).
//  5) إعادة ترميز الصور في Cloudinary، فأي كود مدسوس جوه الصورة بيموت.
//  6) رفع كـ "غير معروف النوع" ممنوع.

// الحد الأقصى للرفع.
//
// الرقم ده مش اختيار حر: المنصة اللي الموقع شغال عليها (Vercel) بترفض
// أي طلب جسمه أكبر من ~4.5 ميجا **قبل ما يوصل للكود ده أصلًا**، وبترد
// 413 FUNCTION_PAYLOAD_TOO_LARGE كنص عادي مش JSON. يعني أي حد أعلى من
// كده بيبقى كذب على العميل: بيختار الملف، يستنى، وياخد رسالة فشل
// مالهاش معنى. فبنقف تحت الحد بهامش أمان (الهامش للـ multipart overhead
// واسم الملف والهيدرات).
const PLATFORM_LIMIT_BYTES = 4 * 1024 * 1024; // 4 ميجا

const MAX_IMAGE_BYTES = PLATFORM_LIMIT_BYTES;
const MAX_AUDIO_BYTES = PLATFORM_LIMIT_BYTES;

// الأنواع المسموحة بس — أي حاجة تانية مرفوضة
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_AUDIO_MIME = new Set(['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/x-m4a']);

/**
 * بيقرا نوع الملف الحقيقي من محتواه (magic bytes) مش من اسمه.
 * @param {Buffer} buffer
 * @returns {Promise<{mime: string|null, ext: string|null}>}
 */
async function detectRealType(buffer) {
  // file-type بقت ESM، فبنحمّلها ديناميكيًا جوه CommonJS
  const { fileTypeFromBuffer } = await import('file-type');
  const result = await fileTypeFromBuffer(buffer);
  return { mime: result ? result.mime : null, ext: result ? result.ext : null };
}

/**
 * بيتأكد إن الملف صورة حقيقية ومسموح بيها.
 * @param {Buffer} buffer
 * @returns {Promise<{ok: boolean, error?: string, mime?: string}>}
 */
async function validateImage(buffer) {
  if (!buffer || !buffer.length) return { ok: false, error: 'الملف فاضي.' };
  if (buffer.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'حجم الصورة أكبر من 4 ميجا.' };
  }

  const { mime } = await detectRealType(buffer);

  // ملف مش متعرّف على نوعه = مرفوض (ممكن يكون سكريبت أو أي حاجة)
  if (!mime) {
    return { ok: false, error: 'نوع الملف ده مش مدعوم — ارفع صورة JPG أو PNG أو WebP.' };
  }
  // SVG بيتقرا كنص وممكن يشيل جافاسكريبت — ممنوع نهائيًا
  if (mime === 'image/svg+xml' || mime === 'text/xml' || mime === 'application/xml') {
    return { ok: false, error: 'ملفات SVG مش مسموح بيها لأسباب أمنية — استخدم JPG أو PNG.' };
  }
  if (!ALLOWED_IMAGE_MIME.has(mime)) {
    return { ok: false, error: 'نوع الملف ده مش مدعوم — ارفع صورة JPG أو PNG أو WebP.' };
  }

  return { ok: true, mime };
}

/**
 * بيتأكد إن الملف صوت حقيقي ومسموح بيه.
 * @param {Buffer} buffer
 * @returns {Promise<{ok: boolean, error?: string, mime?: string}>}
 */
async function validateAudio(buffer) {
  if (!buffer || !buffer.length) return { ok: false, error: 'الملف فاضي.' };
  if (buffer.length > MAX_AUDIO_BYTES) {
    return { ok: false, error: 'حجم ملف الصوت أكبر من 4 ميجا.' };
  }

  const { mime } = await detectRealType(buffer);
  if (!mime || !ALLOWED_AUDIO_MIME.has(mime)) {
    return { ok: false, error: 'نوع الملف ده مش مدعوم — ارفع ملف MP3.' };
  }

  return { ok: true, mime };
}

module.exports = {
  validateImage,
  validateAudio,
  detectRealType,
  MAX_IMAGE_BYTES,
  MAX_AUDIO_BYTES,
  PLATFORM_LIMIT_BYTES,
};
