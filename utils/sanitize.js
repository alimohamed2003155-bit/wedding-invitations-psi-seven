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

module.exports = { sanitizeText };
