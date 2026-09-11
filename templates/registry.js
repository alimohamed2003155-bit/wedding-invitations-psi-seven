// templates/registry.js
// كل قالب دعوة متاح في الموقع بيتسجل هنا. لما تضيف تصميم جديد بعدين،
// كل اللي محتاجه: تحط ملف التصميم في views/، وتضيف سطر جديد هنا — من غير
// ما تلمس أي كود تاني في السيرفر أو الفورم (بيقرأوا من السجل ده تلقائيًا).

const { SUPPORTED_LANGUAGES, SUPPORTED_OCCASIONS } = require('../i18n/strings');

const TEMPLATES = [
  {
    id: 'blossom-oud',
    name: 'Blossom & Oud',
    description: 'تصميم مغربي فاخر بألوان دافئة وخط عربي وفرنساوي',
    // ملف التصميم الفعلي جوه views/
    file: 'blossom-oud.html',
    // اللغات ونوع المناسبة اللي القالب ده بيدعمهم
    languages: SUPPORTED_LANGUAGES,
    occasionTypes: SUPPORTED_OCCASIONS,
    // الأقسام اللي العميل يقدر يشيلها من الدعوة قبل الإنشاء
    // (key: المفتاح المخزن في hiddenSections، label: يظهر في الفورم فقط)
    optionalSections: [
      { key: 'countdown', label: 'العداد التنازلي' },
      { key: 'timeline', label: 'جدول أوقات الحفلة' },
      { key: 'dressCode', label: 'الزي المقترح (Dress Code)' },
      { key: 'rsvp', label: 'تأكيد الحضور (RSVP)' },
      { key: 'map', label: 'خريطة جوجل' },
    ],
    // مراحل جدول أوقات الحفلة الافتراضية اللي القالب ده بيعرضها
    timelineStages: ['reception', 'ceremony', 'dinner', 'party'],
    // بيانات إضافية اختيارية بيحتاجها القالب ده (تظهر في الفورم بس لو موجودة)
    extraFields: [],
    // لو true، القالب ده بيتطلب تسجيل دخول عشان أي حد يقدر يشوفه أو يستخدمه
    // (middleware/auth.js + الفحص في routes/invitations.js). القوالب التلاتة
    // الحالية كلها مجانية ومفتوحة للكل.
    isPremium: false,
  },
  {
    id: 'viktor-paula',
    name: 'Viktor & Paula',
    description: 'تصميم أوروبي أنيق وبسيط، بجدول مواعيد وقسم تفاصيل تواصل',
    file: 'viktor-paula.html',
    languages: SUPPORTED_LANGUAGES,
    occasionTypes: SUPPORTED_OCCASIONS,
    optionalSections: [
      { key: 'countdown', label: 'العداد التنازلي' },
      { key: 'timeline', label: 'جدول أوقات الحفلة' },
      { key: 'dressCode', label: 'الزي المقترح (Dress Code)' },
      { key: 'details', label: 'تفاصيل التواصل والهدايا' },
      { key: 'rsvp', label: 'تأكيد الحضور (RSVP)' },
    ],
    timelineStages: ['ceremony', 'cocktail', 'dinner', 'party'],
    // حقول إضافية خاصة بالقالب ده بس — الفورم بيظهرها تلقائي لما تختاره
    extraFields: [
      { key: 'venueAddress', label: 'عنوان القاعة بالتفصيل (اختياري)', maxlength: 200 },
      { key: 'contactName', label: 'اسم الشخص المسؤول عن الاستفسارات (اختياري)', maxlength: 80 },
      { key: 'contactPhone', label: 'رقم تليفون التواصل (اختياري)', maxlength: 40 },
    ],
    isPremium: false,
  },
  {
    id: 'dolce-vita',
    name: 'Dolce Vita',
    description: 'تصميم عصري بألوان باستيل هادية، وفيه ودجت تفاعلي لطيف لكشف تاريخ الفرح بالخدش',
    file: 'dolce-vita.html',
    languages: SUPPORTED_LANGUAGES,
    occasionTypes: SUPPORTED_OCCASIONS,
    optionalSections: [
      { key: 'timeline', label: 'جدول أوقات الحفلة' },
      { key: 'dressCode', label: 'الزي المقترح (Dress Code)' },
      { key: 'rsvp', label: 'تأكيد الحضور (RSVP)' },
    ],
    // ترتيب المراحل هنا لازم يفضل زي ما هو بالظبط (بيتحدد بيه ترتيب الصفوف
    // في جدول الحفلة على التصميم — مطابق لترتيبهم فعليًا على الشاشة)
    timelineStages: ['reception', 'ceremony', 'cocktail', 'dinner', 'party', 'farewell'],
    extraFields: [],
    isPremium: false,
  },
];

function getTemplate(templateId) {
  return TEMPLATES.find((t) => t.id === templateId) || null;
}

function getDefaultTemplate() {
  return TEMPLATES[0];
}

module.exports = { TEMPLATES, getTemplate, getDefaultTemplate };
