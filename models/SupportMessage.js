// models/SupportMessage.js
// محادثة دعم بين العميل وصاحب الموقع. كل رسالة سطر مستقل، والمحادثة
// بتتجمع بـ userId — أبسط من تخزين مصفوفة رسايل في مستند واحد، وبيخلي
// ترتيب وعدّ الرسايل غير المقروءة سهل.
const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // مين اللي كاتب الرسالة
  from: { type: String, enum: ['user', 'admin'], required: true },
  body: { type: String, required: true, maxlength: 2000 },
  // اتقريت من الطرف التاني ولا لسه
  readByAdmin: { type: Boolean, default: false },
  readByUser: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

supportMessageSchema.index({ userId: 1, createdAt: 1 });

module.exports = mongoose.model('SupportMessage', supportMessageSchema);
