// packages/registry.js
// سجل الباقات المدفوعة — نفس فكرة templates/registry.js: كل حاجة متعرّفة
// في مكان واحد، وأي تعديل في الأسعار أو المميزات بيتعمل من هنا بس.
//
// السعر بيتحدد حسب دولة المستخدم (بنجمعها وقت التسجيل، models/User.js):
// مصر ← جنيه مصري، أي دولة تانية ← دولار.

/**
 * مميزات المحرر. المفتاح هو اللي الكود بيتحقق منه؛ العنوان والشرح
 * للعرض بس.
 * الشرح (desc) مهم: "تحريك النصوص" لوحدها مبتقولش للعميل هو هيقدر
 * يعمل إيه فعليًا، فكل ميزة معاها سطر بيوضّح المقصود بالظبط.
 */
const FEATURES = {
  fonts: {
    ar: 'أكتر من 10 خطوط عربي وإنجليزي',
    en: '10+ Arabic and English fonts',
    descAr: 'تختار خط الدعوة كلها من مكتبة خطوط جاهزة، وتشوف شكله على طول.',
    descEn: 'Pick the font for the whole invitation and see it applied instantly.',
  },
  images: {
    ar: 'تغيير أي صورة في الدعوة',
    en: 'Replace any photo',
    descAr: 'تضغط على أي صورة وترفع صورتك مكانها — وكمان تبدّل ختم الغلاف بختم أي تصميم تاني.',
    descEn: 'Click any photo and upload yours instead — and swap the cover seal for another design’s.',
  },
  music: {
    ar: 'موسيقى من اختيارك',
    en: 'Your own music',
    descAr: 'ترفع الأغنية اللي عايزها وهي اللي هتشتغل أول ما الضيف يفتح الدعوة.',
    descEn: 'Upload the track you want — it plays the moment a guest opens the invitation.',
  },
  drag: {
    ar: 'تحريك أي جزء بالسحب',
    en: 'Move any part by dragging',
    descAr: 'تمسك أي كلام أو صورة وتحطها في المكان اللي يعجبك بالظبط، بالبكسل.',
    descEn: 'Grab any text or photo and place it exactly where you want it, to the pixel.',
  },
  videoToImage: {
    ar: 'تبديل الفيديو بصورة',
    en: 'Swap the video for a photo',
    descAr: 'التصاميم فيها فيديوهات خلفية — تقدر تحط صورتك مكان أي واحد فيهم.',
    descEn: 'The designs use background videos — put your own photo in place of any of them.',
  },
  sections: {
    ar: 'إخفاء أي قسم مش عايزه',
    en: 'Hide any section you don’t need',
    descAr: 'العداد التنازلي، جدول الأوقات، الخريطة… تشيل اللي مش محتاجه وتسيب اللي يهمك.',
    descEn: 'Countdown, schedule, map… remove what you don’t need and keep what matters.',
  },
  colors: {
    ar: 'تحكم كامل في الألوان',
    en: 'Full colour control',
    descAr: 'تغيّر ألوان الزي المقترح وأي خلفية ملوّنة في الدعوة بمنتقي ألوان.',
    descEn: 'Change the dress-code colours and any coloured background with a colour picker.',
  },
};

/** بيانات كل ميزة بلغة واحدة — للعرض في صفحة الباقات */
function featureFor(key, lang) {
  const f = FEATURES[key];
  if (!f) return { key, label: key, desc: '' };
  const isAr = lang === 'ar';
  return {
    key,
    label: (isAr ? f.ar : f.en) || f.en,
    desc: (isAr ? f.descAr : f.descEn) || '',
  };
}

// ترتيب ثابت للمميزات — عشان الباقات التلاتة يبانوا بنفس الترتيب
// والعميل يقدر يقارن بينهم بعينه بسرعة
const ALL_FEATURE_KEYS = ['fonts', 'images', 'music', 'drag', 'videoToImage', 'sections', 'colors'];

const PACKAGES = [
  {
    id: 'basic',
    name: { ar: 'الباقة الأساسية', en: 'Essential' },
    invitations: 4,
    price: { EGP: 400, USD: 15 },
    features: ['fonts', 'images', 'music'],
  },
  {
    id: 'plus',
    name: { ar: 'الباقة المتقدمة', en: 'Plus' },
    invitations: 9,
    price: { EGP: 600, USD: 30 },
    features: ['fonts', 'images', 'music', 'drag', 'videoToImage'],
  },
  {
    id: 'pro',
    name: { ar: 'الباقة الاحترافية', en: 'Professional' },
    invitations: 50,
    price: { EGP: 1500, USD: 70 },
    features: ['fonts', 'images', 'music', 'drag', 'videoToImage', 'sections', 'colors'],
  },
];

const CURRENCY_LABELS = { EGP: 'ج.م', USD: '$' };

/** @param {string} countryCode كود الدولة (ISO alpha-2) @returns {'EGP'|'USD'} */
function currencyForCountry(countryCode) {
  return String(countryCode || '').toUpperCase() === 'EG' ? 'EGP' : 'USD';
}

/** @param {string} id @returns {object|null} */
function getPackage(id) {
  return PACKAGES.find((p) => p.id === id) || null;
}

/**
 * الباقات بالشكل اللي بيتعرض للمستخدم — بسعر عملته هو بس، مش كل العملات.
 * @param {string} countryCode
 */
function packagesForCountry(countryCode, lang) {
  const currency = currencyForCountry(countryCode);
  const l = String(lang || '').toLowerCase() === 'ar' ? 'ar' : 'en';
  return PACKAGES.map((p) => ({
    id: p.id,
    name: p.name[l] || p.name.en,
    invitations: p.invitations,
    price: p.price[currency],
    currency,
    currencyLabel: CURRENCY_LABELS[currency],
    features: p.features.map((key) => featureFor(key, l)),
    // الميزات اللي **مش** في الباقة دي — بتتعرض باهتة، عشان العميل
    // يشوف الفرق بين الباقات من غير ما يفتح تلاتة جنب بعض ويقارن
    missing: ALL_FEATURE_KEYS
      .filter((key) => !p.features.includes(key))
      .map((key) => featureFor(key, l)),
  }));
}

/**
 * هل الباقة دي فيها الميزة دي؟ (بيتستخدم في حجب أدوات المحرر)
 * @param {string} packageId @param {string} featureKey
 */
function packageHasFeature(packageId, featureKey) {
  const pkg = getPackage(packageId);
  return !!pkg && pkg.features.includes(featureKey);
}

module.exports = {
  PACKAGES,
  FEATURES,
  getPackage,
  packagesForCountry,
  currencyForCountry,
  packageHasFeature,
};
