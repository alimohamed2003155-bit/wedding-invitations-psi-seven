// config/cloudinary.js
// الاتصال بـ Cloudinary. المفتاح السري بيفضل على السيرفر بس — عمره ما
// بيتبعت للمتصفح، والرفع كله بيعدي من السيرفر عشان نقدر نفحص الملف
// قبل ما يتخزن (utils/uploadSecurity.js).
const { v2: cloudinary } = require('cloudinary');

let configured = false;

function getCloudinary() {
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

/** هل المفاتيح متظبطة أصلًا؟ (عشان نرجّع رسالة واضحة بدل ما نفشل بغموض) */
function isCloudinaryReady() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

module.exports = { getCloudinary, isCloudinaryReady };
