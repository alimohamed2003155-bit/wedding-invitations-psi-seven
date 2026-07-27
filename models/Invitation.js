// models/Invitation.js
const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  shortId: { type: String, required: true, unique: true, index: true },

  // لو الحقل ده مش موجود (null/undefined) بيبقى معناه: دعوة قديمة اتعملت
  // قبل نظام القوالب، وبالتالي بتتعرض بالتصميم الأصلي بالظبط من غير أي تغيير.
  templateId: { type: String, default: null },
  language: { type: String, enum: ['ar', 'en', 'fr'], default: null },
  occasionType: { type: String, enum: ['wedding', 'engagement'], default: null },

  // أقسام اختارها صاحب الدعوة إنه يشيلها (زي: 'countdown', 'timeline', 'dressCode', 'rsvp', 'map')
  hiddenSections: { type: [String], default: [] },

  // جدول أوقات الحفلة (استقبال/عقد قران/عشاء/حفلة) — كل مرحلة بساعتها بس (مفيش دقايق)
  timeline: {
    type: [{ key: String, hour: Number }],
    default: [],
  },

  // كود الجهاز اللي أنشأ الدعوة (نفس الكوكي المستخدم في الليميتر) — بيسمحلنا
  // نحسب عدد المستخدمين الفريدين اللي استخدموا الموقع فعليًا وعملوا دعوة.
  creatorDeviceId: { type: String, default: null },

  brideName: { type: String, required: true, maxlength: 80 },
  groomName: { type: String, required: true, maxlength: 80 },
  brideNameAr: { type: String, required: true, maxlength: 80 },
  groomNameAr: { type: String, required: true, maxlength: 80 },

  venueName: { type: String, required: true, maxlength: 120 },
  venueCity: { type: String, required: true, maxlength: 120 },
  venueMapQuery: { type: String, maxlength: 160 },
  // رابط التضمين النهائي (iframe) ورابط "افتح في خرائط جوجل" — بيتحسبوا مرة
  // واحدة وقت إنشاء الدعوة (utils/mapsLink.js)، مش في كل زيارة، عشان الأداء.
  venueMapEmbedSrc: { type: String, default: '' },
  venueMapDirectLink: { type: String, default: '' },
  // عنوان تفصيلي اختياري (بيستخدمه بعض القوالب زي Viktor & Paula)
  venueAddress: { type: String, maxlength: 200, default: '' },

  // بيانات تواصل اختيارية لأي حد عنده استفسار عن الحفلة (بعض القوالب بتعرضها)
  contactName: { type: String, maxlength: 80, default: '' },
  contactPhone: { type: String, maxlength: 40, default: '' },

  // مصدر الحقيقة الوحيد للتاريخ — الأوقات التفصيلية بقت في timeline لأي دعوة جديدة
  weddingDateTime: { type: Date, required: true },

  viewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// فهارس عادية على الحقول اللي البحث في لوحة التحكم بيعتمد عليها، عشان
// الاستعلام يفضل سريع حتى مع آلاف الدعوات. البحث نفسه بيتم بـ regex جزئي
// (مش $text) عشان ندعم "جزء من الاسم" مش كلمة كاملة بس.
invitationSchema.index({ brideName: 1 });
invitationSchema.index({ groomName: 1 });
invitationSchema.index({ brideNameAr: 1 });
invitationSchema.index({ groomNameAr: 1 });
invitationSchema.index({ venueName: 1 });
invitationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Invitation', invitationSchema);
