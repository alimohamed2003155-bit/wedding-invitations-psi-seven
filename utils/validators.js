// utils/validators.js
// تحقق بسيط من مدخلات نظام الحسابات (تسجيل/دخول).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @param {*} str @returns {boolean} */
function isValidEmail(str) {
  return typeof str === 'string' && str.trim().length <= 200 && EMAIL_RE.test(str.trim());
}

/**
 * الطول بس (من غير فرض حروف كبيرة/رموز إجباري) — متسق مع توصيات NIST
 * الحديثة اللي بتركّز على طول الباسورد مش قواعد تعقيد مرهقة للمستخدم.
 * @param {*} str @returns {boolean}
 */
function isValidPassword(str) {
  return typeof str === 'string' && str.length >= 8 && str.length <= 200;
}

/**
 * كود دولة بصيغة ISO 3166-1 alpha-2 (حرفين، زي "EG"، "SA"، "US") — نفس
 * الصيغة اللي مكتبة world-countries في الفرونت إند بترجعها كـ cca2.
 * @param {*} str @returns {boolean}
 */
function isValidCountryCode(str) {
  return typeof str === 'string' && /^[A-Za-z]{2}$/.test(str.trim());
}

module.exports = { isValidEmail, isValidPassword, isValidCountryCode };
