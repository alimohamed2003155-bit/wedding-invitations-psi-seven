// models/RateLimit.js
// بنسجل هنا عدد محاولات إنشاء الدعوات لكل جهاز في كل نافذة زمنية (ساعة مثلاً).
// التخزين في قاعدة البيانات (مش في ذاكرة السيرفر) مهم عشان لو السيرفر شغال
// على منصة سيرفرلس زي Vercel، كل طلب ممكن يتنفذ على نسخة مختلفة من الكود،
// فذاكرة السيرفر العادية مش هتفضل موجودة بين طلب وطلب.
const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  windowStart: { type: Date, required: true },
  count: { type: Number, default: 0 },
  // TTL index: مونجو بتمسح الوثيقة دي تلقائيًا لما نوصل للوقت ده، فمفيش داعي
  // لأي تنظيف يدوي أو Cron منفصل.
  expiresAt: { type: Date, required: true },
});

rateLimitSchema.index({ deviceId: 1, windowStart: 1 }, { unique: true });
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RateLimit', rateLimitSchema);
