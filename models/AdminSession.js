// models/AdminSession.js
// جلسة دخول للوحة التحكم — بعد التحقق من ADMIN_SECRET مرة واحدة (routes/admin.js:
// POST /admin/login)، بنديله token عشوائي بدل ما نضطره يبعت المفتاح نفسه في
// كل طلب/لينك (كان بيتسجل في server logs وتاريخ المتصفح لو اتبعت في الـ URL).
// نفس فلسفة models/Session.js بالظبط، بس مدة أقصر (صلاحية أعلى = خطورة أعلى
// لو الكوكي اتسرق).
const mongoose = require('mongoose');

const adminSessionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },

  // بصمة المتصفح اللي عمل الجلسة (hash لـ User-Agent). لو الكوكي اتنسخ
  // واتستخدم من متصفح تاني، البصمة هتختلف والجلسة هتترفض.
  // فاضي = جلسة قديمة اتعملت قبل الميزة دي — بنقبلها عادي.
  fingerprint: { type: String, default: '' },
  // آخر نشاط — بيسمح بإغلاق الجلسة بعد فترة خمول قصيرة حتى لو مدتها
  // الكلية لسه ما خلصتش
  lastSeenAt: { type: Date, default: Date.now },
});

adminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AdminSession', adminSessionSchema);
