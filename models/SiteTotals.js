// models/SiteTotals.js
// الأرقام المتراكمة للدعوات اللي **اتمسحت** من قاعدة البيانات.
//
// ليه الملف ده موجود أصلاً:
// الدعوات المجانية اللي عدى على معادها يومين بتتمسح عشان القاعدة
// ماتكبرش بلا داعي. بس الأرقام اللي بتتعرض في الصفحة الرئيسية
// (عدد الدعوات، المشاهدات، المستخدمين) لازم تفضل زي ما هي — مينفعش
// العداد ينقص قدام الزوار كل ما بننضّف.
//
// فقبل أي مسح، بنضيف أرقام اللي هيتمسح هنا، والإحصائيات العامة بقت
// = الموجود فعلاً + المحفوظ هنا.
const mongoose = require('mongoose');

const siteTotalsSchema = new mongoose.Schema({
  // مستند واحد بس في المجموعة دي
  key: { type: String, default: 'default', unique: true, index: true },

  // إجمالي الدعوات اللي اتمسحت عبر الزمن
  archivedInvitations: { type: Number, default: 0 },
  // إجمالي مشاهداتها وقت المسح
  archivedViews: { type: Number, default: 0 },
  // عدد الأجهزة اللي عملت دعوات اتمسحت كلها (مش موجود منها حاجة دلوقتي)
  archivedCreators: { type: Number, default: 0 },
  // إجمالي ردود الحضور اللي اتمسحت معاها
  archivedRsvps: { type: Number, default: 0 },

  lastCleanupAt: { type: Date, default: null },
  lastCleanupDeleted: { type: Number, default: 0 },
});

/** بيجيب المستند الوحيد (وبينشئه أول مرة) */
async function getSiteTotals() {
  const Model = mongoose.models.SiteTotals || mongoose.model('SiteTotals', siteTotalsSchema);
  let doc = await Model.findOne({ key: 'default' });
  if (!doc) doc = await Model.create({ key: 'default' });
  return doc;
}

const SiteTotals = mongoose.models.SiteTotals || mongoose.model('SiteTotals', siteTotalsSchema);

module.exports = SiteTotals;
module.exports.getSiteTotals = getSiteTotals;
