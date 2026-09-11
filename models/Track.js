// models/Track.js
// أغنية في مكتبة الموسيقى. إنت بترفعها من لوحة التحكم، والعملاء
// بيدوّروا فيها ويختاروا منها.
//
// ليه المكتبة من عندك مش من خدمة خارجية: حقوق الموسيقى. خدمات زي
// Spotify مبتسمحش بتشغيل الأغنية كاملة في موقع تاني، والملفات اللي
// بترفعها إنت بتبقى مسؤوليتك ومعروف مصدرها.
const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  artist: { type: String, default: '', trim: true, maxlength: 120 },
  // تصنيف بسيط يسهّل البحث (هادية، فرح، عربي، أجنبي...)
  mood: { type: String, default: '', trim: true, maxlength: 60 },

  url: { type: String, required: true, maxlength: 500 },
  publicId: { type: String, default: '', maxlength: 300 },
  // بالثواني — بيتحسب وقت الرفع، ومنه بنعرف حدود القص
  duration: { type: Number, default: 0 },

  // إخفاء أغنية من غير ما تمسحها (لو دعوات منشورة شغالة بيها)
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// البحث بيتم بـ regex جزئي على الاسم والفنان والتصنيف
trackSchema.index({ title: 1 });
trackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Track', trackSchema);
