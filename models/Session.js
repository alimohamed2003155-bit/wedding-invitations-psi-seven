// models/Session.js
// جلسة دخول واحدة — token عشوائي طويل (متخزن في كوكي httpOnly عند العميل،
// middleware/auth.js) بيتقارن بنسخته هنا في الداتابيز. تخزين الجلسة في
// MongoDB (مش JWT stateless) يسمح بإلغائها فورًا من السيرفر (تسجيل خروج
// حقيقي، أو سحب صلاحية جلسة مسروقة) وبيشتغل صح على منصة سيرفرلس زي Vercel
// — نفس فلسفة models/RateLimit.js بالظبط.
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  // TTL index: مونجو بتمسح الجلسة تلقائيًا بعد انتهاء صلاحيتها، فمفيش داعي
  // لأي تنظيف يدوي (نفس باتيرن RateLimit.expiresAt).
  expiresAt: { type: Date, required: true },
});

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);
