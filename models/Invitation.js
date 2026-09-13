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
  // نحسب عدد المستخدمين الفريدين اللي استخدموا الموقع فعليًا وعملوا دعوة،
  // وكمان نحسب رصيد الدعوات المجانية اليومي (middleware/freeQuota.js).
  creatorDeviceId: { type: String, default: null },
  // بصمة الـIP مش الـIP نفسه — sha256 بمفتاح السيرفر. الغرض منها حاجة
  // واحدة: إن مسح الكوكيز مايديش رصيد مجاني جديد على طول. عمرنا ما
  // بنخزّن عنوان حقيقي، والبصمة مالهاش أي استخدام تاني.
  creatorIpHash: { type: String, default: null },

  // صاحب الدعوة لو كان مسجّل دخول وقت إنشائها — ده اللي بيسمح له يفتح
  // المحرر بعدين. الدعوات المجانية (من غير حساب) بتفضل ownerId = null.
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  // الدعوة دي استهلكت رصيد من باقة؟ يعني صاحبها يقدر يعدّل فيها بالمحرر
  isPremium: { type: Boolean, default: false },

  // 'draft' = العميل المشترك فتح القالب في المحرر لكن لسه منشرش. المسودة
  // مبتخصمش من رصيد باقته والضيوف مش شايفينها — الخصم والنشر بيحصلوا مع
  // بعض لما يضغط "انشر الدعوة".
  // الافتراضي 'published' عن قصد: كل الدعوات القديمة (اللي مفيهاش الحقل ده
  // أصلًا) لازم تفضل ظاهرة للضيوف زي ما هي بالظبط.
  status: { type: String, enum: ['draft', 'published'], default: 'published', index: true },
  publishedAt: { type: Date, default: null },

  // تخصيصات المحرر — بتتحقن وقت العرض كـ CSS/JS فوق التصميم
  // (utils/customizations.js). ملفات views/*.html مبتتغيّرش أبدًا.
  customizations: {
    fontFamily: { type: String, default: '' },        // اسم خط من Google Fonts
    audioUrl: { type: String, default: '' },          // موسيقى بديلة (Cloudinary)
    // قص الأغنية بالثواني: بتبدأ من audioStart وترجع لها عند audioEnd.
    // بنخزّن الحدود بس ومبنعملش إعادة ترميز للملف — أسرع، وبيسمح
    // للعميل يعدّل القص براحته من غير ما يرفع تاني.
    audioStart: { type: Number, default: 0 },
    audioEnd: { type: Number, default: 0 },           // 0 = لحد آخر الأغنية
    // { "data-elem-id": { dx, dy } } — إزاحة كل عنصر اتحرك بالسحب
    offsets: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { "data-elem-id": "https://res.cloudinary.com/..." } — صور مستبدلة
    images: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { "data-elem-id": "النص الجديد" } — نصوص العميل عدّلها بالضغط عليها
    // في المحرر. بيتحطّوا كـ textContent وقت العرض، مش innerHTML أبدًا.
    // ملحوظة: لو النص اللي اتعدّل كان أصلًا اسم عروسة/عريس/قاعة، السيرفر
    // بيعدّل الحقل نفسه بدل ما يخزّنه هنا — عشان الاسم يتغيّر في كل
    // مكان في الدعوة مرة واحدة (routes/editor.js).
    texts: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { "data-elem-id": 24 } — مقاس الخط بالبكسل لكل جملة على حدة
    sizes: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { "data-elem-id": "#c9a24a" } — ألوان (مربعات الزي المقترح مثلاً)
    colors: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { "data-elem-id": -8 } — زاوية ميل العنصر بالدرجات (صورة
    // البولارويد في Royal Maroon مثلاً). بتتطبّق بخاصية rotate
    // المستقلة عشان متتخانقش مع إزاحة السحب (transform).
    rotations: { type: mongoose.Schema.Types.Mixed, default: {} },
    // اليوم المعلّم في نتيجة الشهر. 0 = يوم الفرح زي ما هو.
    calDay: { type: Number, default: 0 },
    // نصوص العميل ضافها بنفسه فوق التصميم.
    // كل واحد بياخد data-elem-id زي أي عنصر أصلي، فالسحب والمقاس واللون
    // والحذف والرجوع للخلف بيشتغلوا عليه من غير أي كود خاص.
    // [{ id, text, xPct, y, size, color, align }]
    added: { type: [mongoose.Schema.Types.Mixed], default: [] },

    // عناصر العميل اختار يخفيها
    hidden: { type: [String], default: [] },

    // كارت المشاركة — اللي بيظهر لما اللينك يتبعت على واتساب أو فيسبوك.
    // لو فاضي، بيتبني تلقائيًا من أسماء العروسين والتاريخ والمكان
    // (utils/shareTags.js). الصورة لازم تعدي نفس فحص الروابط المسموحة.
    share: {
      title: { type: String, default: '', maxlength: 120 },
      description: { type: String, default: '', maxlength: 300 },
      image: { type: String, default: '', maxlength: 500 },
    },
  },

  brideName: { type: String, required: true, maxlength: 80 },
  groomName: { type: String, required: true, maxlength: 80 },
  brideNameAr: { type: String, required: true, maxlength: 80 },
  groomNameAr: { type: String, required: true, maxlength: 80 },

  venueName: { type: String, required: true, maxlength: 120 },
  venueCity: { type: String, required: true, maxlength: 120 },
  // ملحوظة: القيمة دي بتتقطع لـ 300 حرف في routes/invitations.js قبل ما توصل
  // هنا، فالحد الأقصى هنا لازم يفضل أكبر منه دايمًا (مش نفس الرقم بالظبط)،
  // غير كده أي لينك خرائط جوجل طويل (حاجة عادية جدًا) هيفشل الحفظ بالكامل.
  venueMapQuery: { type: String, maxlength: 500 },
  // رابط التضمين النهائي (iframe) ورابط "افتح في خرائط جوجل" — بيتحسبوا مرة
  // واحدة وقت إنشاء الدعوة (utils/mapsLink.js)، مش في كل زيارة، عشان الأداء.
  venueMapEmbedSrc: { type: String, default: '', maxlength: 2000 },
  venueMapDirectLink: { type: String, default: '', maxlength: 2000 },
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
// distinct('creatorDeviceId', ...) بيتنادى في كل مرة الكاش بتاع الإحصائيات
// العامة بينتهي، وكمان من غير أي كاش في لوحة التحكم — من غير فهرس، ده
// بيبقى full collection scan مع تزايد عدد الدعوات (وده فعلاً بيهم مع
// آلاف/عشرات آلاف المستخدمين).
invitationSchema.index({ creatorDeviceId: 1 });
// فحص الرصيد المجاني بيتنادى مع كل محاولة إنشاء: "كام دعوة مجانية من
// الجهاز ده / الشبكة دي النهارده؟". من غير الفهارس المركّبة دي كل
// محاولة كانت هتمسح الكوليكشن كله.
invitationSchema.index({ creatorDeviceId: 1, createdAt: -1 });
invitationSchema.index({ creatorIpHash: 1, createdAt: -1 });

module.exports = mongoose.model('Invitation', invitationSchema);
