// sanitize.js
// أي نص جاي من فورم عام على النت لازم يتنضف قبل ما يتخزن أو يتعرض،
// عشان محدش يقدر يحط كود (HTML/JS) مكان اسمه ويأذي زوار لينكات تانية.

/**
 * بينضف نص حر (اسم، اسم قاعة، مدينة...) من أي حاجة ممكن تتفسر كـ HTML/JS،
 * ويقصّه لطول معقول.
 * @param {*} input
 * @param {number} maxLen
 * @returns {string}
 */
function sanitizeText(input, maxLen = 80) {
  if (typeof input !== 'string') return '';
  let cleaned = input
    .replace(/<[^>]*>/g, '')       // شيل أي حاجة شكلها تاج HTML
    .replace(/[<>&"'`]/g, '')      // شيل الحروف اللي ممكن تكسر سياق الـ HTML/JS
    .replace(/[\u0000-\u001F\u007F]/g, '') // شيل control characters
    .trim();
  return cleaned.slice(0, maxLen);
}

const HTML_ESCAPE_MAP = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };

/**
 * بيرمز أي نص قبل ما يتحط جوه HTML (حتى لو المفروض يبقى نضيف أصلاً من
 * وقت الإدخال) — طبقة حماية تانية (defense in depth) عشان أي صفحة بتبني
 * HTML بـ template literals (زي صفحة إحصائيات الدعوة أو لوحة التحكم)
 * تفضل آمنة حتى لو حصل خطأ أو تغيير في مكان تاني من الكود مستقبلاً.
 * @param {*} input
 * @returns {string}
 */
function escapeHtml(input) {
  return String(input == null ? '' : input).replace(/[<>&"']/g, (c) => HTML_ESCAPE_MAP[c]);
}

/**
 * بيحول أي قيمة لـ JSON نص آمن للحقن جوه <script> تاج مباشرة.
 * JSON.stringify العادي مش كافي هنا: لو أي قيمة (زي venueMapQuery الحر)
 * فيها السلسلة "</script>"، المتصفح بيقفل الـ <script> تاج في نفس اللحظة
 * (المتصفح بيدور على النص ده وهو بيقرا الصفحة كـ HTML، قبل ما يوصل لمرحلة
 * فهم إنه جوه JS string) — وأي حاجة بعدها بتتفسر كـ HTML عادي وممكن
 * تشغل script حقيقي (stored XSS). بنرمز أي "<" (وكمان ">" و"&" احتياطًا)
 * لصورتها اليونيكود (\u003c...) عشان تفضل نفس القيمة بالظبط لما JS يقراها،
 * بس من غير ما تبان كـ tag للمتصفح وهو بيحلل HTML.
 * @param {*} value
 * @returns {string}
 */
function safeJsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

module.exports = { sanitizeText, escapeHtml, safeJsonForScript };
