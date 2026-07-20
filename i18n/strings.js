// i18n/strings.js
// كل النصوص الثابتة في التصميم (اللي مش اسم عروسة/عريس/تاريخ) بيتم سحبها من هنا.
// أي قالب جديد تضيفه في المستقبل يقدر يستخدم نفس القاموس ده.

const STRINGS = {
  ar: {
    tapToOpen: 'اضغط للفتح',
    celebrationBegins: { wedding: 'يبدأ الاحتفال', engagement: 'يبدأ حفل الخطوبة' },
    countdown: { days: 'أيام', hours: 'ساعات', minutes: 'دقايق', seconds: 'ثواني' },
    venueTitle: 'المكان',
    timelineTitle: { wedding: 'برنامج حفل الزفاف', engagement: 'برنامج حفل الخطوبة' },
    timelineStages: {
      reception: 'الاستقبال',
      ceremony: { wedding: 'عقد القران', engagement: 'مراسم الخطوبة' },
      dinner: 'العشاء',
      party: 'الحفلة',
    },
    dressCodeTitle: 'الزي المقترح',
    colorPalette: 'الألوان المقترحة',
    ladies: 'السيدات',
    gentlemen: 'السادة',
    ladiesDesc: 'يُفضَّل فستان سهرة أنيق بألوان راقية.',
    gentlemenDesc: 'يُفضَّل بدلة رسمية كلاسيكية مع حذاء أنيق.',
    rsvpTitle: 'تأكيد الحضور',
    mapTitle: 'الموقع على خرائط جوجل',
    closingLine: 'يسعدنا ويشرفنا حضوركم',
  },

  en: {
    tapToOpen: 'Tap to open',
    celebrationBegins: { wedding: 'The Celebration Begins', engagement: 'The Engagement Begins' },
    countdown: { days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds' },
    venueTitle: 'Venue',
    timelineTitle: { wedding: 'Wedding Day Timeline', engagement: 'Engagement Day Timeline' },
    timelineStages: {
      reception: 'Welcome Reception',
      ceremony: { wedding: 'Nikah Ceremony', engagement: 'Engagement Ceremony' },
      dinner: 'Dinner',
      party: 'Party',
    },
    dressCodeTitle: 'Dress Code',
    colorPalette: 'Color palette',
    ladies: 'Ladies',
    gentlemen: 'Gentlemen',
    ladiesDesc: 'Formal dresses in elegant, polished styles are encouraged.',
    gentlemenDesc: 'Well-tailored suits with classic dress shoes are preferred.',
    rsvpTitle: 'Confirm Your Presence',
    mapTitle: 'Google Maps Directions',
    closingLine: 'We would be delighted to welcome you',
  },

  fr: {
    tapToOpen: 'Appuyez pour ouvrir',
    celebrationBegins: { wedding: 'La Célébration Commence', engagement: 'Les Fiançailles Commencent' },
    countdown: { days: 'Jours', hours: 'Heures', minutes: 'Minutes', seconds: 'Secondes' },
    venueTitle: 'Lieu',
    timelineTitle: { wedding: 'Chronologie de l\'événement', engagement: 'Chronologie des fiançailles' },
    timelineStages: {
      reception: 'Welcome Reception',
      ceremony: { wedding: 'Nikah Ceremony', engagement: 'Cérémonie de fiançailles' },
      dinner: 'Dinner',
      party: 'Party',
    },
    dressCodeTitle: 'Dress Code',
    colorPalette: 'Color palette',
    ladies: 'Ladies',
    gentlemen: 'Gentlemen',
    ladiesDesc: 'Formal dresses in elegant, polished styles are encouraged.',
    gentlemenDesc: 'Well-tailored suits with classic dress shoes are preferred.',
    rsvpTitle: 'Confirmez Votre Présence',
    mapTitle: 'Itinéraire Google Maps',
    closingLine: 'Au plaisir de vous accueillir',
  },
};

const SUPPORTED_LANGUAGES = ['ar', 'en', 'fr'];
const SUPPORTED_OCCASIONS = ['wedding', 'engagement'];

/**
 * بيرجع نسخة "مسطّحة" من القاموس لغة معينة ومناسبة معينة، جاهزة للحقن في
 * التصميم من غير ما الملف اللي بيستخدمها يحتاج يعرف تفاصيل التركيب الداخلي.
 */
function getStrings(language, occasionType) {
  const lang = SUPPORTED_LANGUAGES.includes(language) ? language : 'ar';
  const occ = SUPPORTED_OCCASIONS.includes(occasionType) ? occasionType : 'wedding';
  const s = STRINGS[lang];

  return {
    tapToOpen: s.tapToOpen,
    celebrationBegins: s.celebrationBegins[occ],
    countdown: s.countdown,
    venueTitle: s.venueTitle,
    timelineTitle: s.timelineTitle[occ],
    timelineStages: {
      reception: s.timelineStages.reception,
      ceremony: s.timelineStages.ceremony[occ],
      dinner: s.timelineStages.dinner,
      party: s.timelineStages.party,
    },
    dressCodeTitle: s.dressCodeTitle,
    colorPalette: s.colorPalette,
    ladies: s.ladies,
    gentlemen: s.gentlemen,
    ladiesDesc: s.ladiesDesc,
    gentlemenDesc: s.gentlemenDesc,
    rsvpTitle: s.rsvpTitle,
    mapTitle: s.mapTitle,
    closingLine: s.closingLine,
  };
}

module.exports = { getStrings, SUPPORTED_LANGUAGES, SUPPORTED_OCCASIONS };
