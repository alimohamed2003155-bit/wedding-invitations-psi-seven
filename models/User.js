// models/User.js
// حساب مستخدم مسجل — التسجيل بإيميل + باسورد. الباسورد بيتخزن كـ hash بس
// (bcrypt)، مفيش نص صريح أبدًا (routes/auth.js).
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String, required: true, unique: true, index: true,
    lowercase: true, trim: true, maxlength: 200,
  },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true, maxlength: 80 },
  // كود الدولة (ISO 3166-1 alpha-2, زي "EG"، "SA") — مبعوت من الفرونت إند
  // (client/src/components/form/CountrySelect.jsx، مكتبة world-countries)
  country: { type: String, required: true, uppercase: true, minlength: 2, maxlength: 2 },

  // الاشتراك — بيتفعّل يدويًا من لوحة التحكم بعد ما العميل يدفع
  // (packages/registry.js فيه تعريف الباقات ومميزاتها)
  subscription: {
    packageId: { type: String, default: null },      // basic | plus | pro
    invitationsLeft: { type: Number, default: 0 },   // رصيد الدعوات المميزة المتبقي
    activatedAt: { type: Date, default: null },
    // 'active' = شغالة، 'suspended' = موقوفة من لوحة التحكم (الرصيد بيفضل
    // زي ما هو، بس كل مميزات الباقة بتتقفل لحد ما تشغّلها تاني).
    // الافتراضي 'active' عشان كل الاشتراكات القديمة (اللي مفيهاش الحقل ده)
    // تفضل شغالة زي ما هي بالظبط.
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    suspendedAt: { type: Date, default: null },
    // سبب الإيقاف/ملاحظة إدارية — بتظهر للأدمن بس، مش للعميل
    adminNote: { type: String, default: '', maxlength: 500 },
  },

  // حظر الحساب كله: مش بس الباقة — الجلسات بتتلغي ومبيقدرش يدخل تاني
  isBlocked: { type: Boolean, default: false },
  blockedAt: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },
});

// لوحة التحكم بترتّب العملاء بالأحدث وبتفلتر على حالة الاشتراك
userSchema.index({ createdAt: -1 });
userSchema.index({ 'subscription.packageId': 1 });

module.exports = mongoose.model('User', userSchema);
