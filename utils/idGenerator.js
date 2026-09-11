// idGenerator.js
// كود قصير وفريد لكل دعوة، بيتحط في اللينك النهائي: yourdomain.com/i/xxxxxxx
// مبني على وحدة crypto المدمجة في Node، مفيش داعي لمكتبة خارجية زيادة عن اللزوم.

const crypto = require('crypto');

/**
 * @param {number} length - طول الكود الناتج (افتراضيًا 7 حروف/أرقام)
 * @returns {string}
 */
function generateShortId(length = 7) {
  return crypto
    .randomBytes(length * 2)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, length);
}

module.exports = { generateShortId };
