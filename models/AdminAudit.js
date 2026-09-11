// models/AdminAudit.js
// سجل كل إجراء إداري: مين عمل إيه على مين وإمتى ومن أي IP.
//
// ليه ده مهم: لوحة التحكم بتقدر توقف باقة، تغيّر رصيد، وتحظر حساب. من
// غير سجل، أي تغيير من دول بيبقى بلا أثر — مش هتعرف تفرّق بين غلطة منك
// وبين حد دخل بمفتاح مسروق. السجل ده للقراءة بس، مفيش أي مسار بيعدّله.
const mongoose = require('mongoose');

const adminAuditSchema = new mongoose.Schema({
  // اسم الإجراء بشكل ثابت (order.activate، user.suspend، …) عشان يتفلتر
  action: { type: String, required: true, index: true, maxlength: 60 },

  // على مين وقع الإجراء
  targetType: { type: String, default: '', maxlength: 30 }, // user | order | invitation | settings
  targetId: { type: String, default: '', maxlength: 100 },
  targetLabel: { type: String, default: '', maxlength: 200 }, // إيميل/اسم عشان السجل يفضل مقروء حتى لو الحساب اتمسح

  // تفاصيل الإجراء (القيمة قبل وبعد مثلًا) — Mixed لأن كل إجراء له شكله
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },

  ip: { type: String, default: '', maxlength: 60 },
  createdAt: { type: Date, default: Date.now, index: true },
});

adminAuditSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminAudit', adminAuditSchema);
