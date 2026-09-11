// dateFormatter.js
// بيحول تاريخ ووقت واحد (JS Date) لكل الأشكال اللي التصميم محتاجها،
// عشان صاحب الدعوة يدخل معاد الفرح مرة واحدة بس، ومفيش احتمال إن حقلين
// يتكتبوا غلط ويبقوا متعارضين (زي ما كان ممكن يحصل لو الحقول كلها يدوية).

const FRENCH_MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const ARABIC_DAYS = [
  'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت',
];

// index 0 يمثل الساعة 12، وبعد كده 1..11
const ARABIC_HOURS = [
  'الثانية عشر', 'الواحدة', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة',
  'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة', 'الحادية عشر',
];

const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ENGLISH_DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

/**
 * تنسيق أي ساعة مفردة (0-23) لصيغة "12 ساعة" مقروءة — مستخدمة في عرض
 * أوقات مراحل الحفلة (استقبال/عقد قران/عشاء/حفلة) بلغات مختلفة.
 * @param {number} hour24 - 0..23
 * @param {'ar'|'en'|'fr'} language
 * @returns {string}
 */
function formatHour(hour24, language) {
  const period12 = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  if (language === 'ar') {
    const period = hour24 < 12 ? 'صباحًا' : 'مساءً';
    return `${hour12}:00 ${period}`;
  }
  // en / fr: نفس الصيغة الرقمية الشائعة
  return `${hour12}:00 ${period12}`;
}

/**
 * @param {Date} date - معاد الفرح (بتوقيت محلي)
 * @returns {object} كل الحقول اللي التصميم بيحتاجها
 */
function buildDisplayFields(date) {
  const day = date.getDate();
  const monthIndex = date.getMonth(); // 0 = يناير ... 11 = ديسمبر
  const year = date.getFullYear();
  const hour24 = date.getHours();
  const minute = date.getMinutes();

  // الشكل الفرنساوي المستخدم في التصميم: "20 Mai 2027"
  const dateDisplay = `${day} ${FRENCH_MONTHS[monthIndex]} ${year}`;

  // "à partir de 16h" أو "à partir de 16h30" لو فيه دقايق
  const timeDisplay = minute === 0
    ? `à partir de ${hour24}h`
    : `à partir de ${hour24}h${String(minute).padStart(2, '0')}`;

  const dayNameAr = ARABIC_DAYS[date.getDay()];
  const dateArabicDisplay = `${day} ${ARABIC_MONTHS[monthIndex]} ${year}`;

  // الشكل الإنجليزي: "20 May 2027" + اسم اليوم
  const dayNameEn = ENGLISH_DAYS[date.getDay()];
  const dateDisplayEn = `${day} ${ENGLISH_MONTHS[monthIndex]} ${year}`;
  const timeDisplayEn = `Starting at ${formatHour(hour24, 'en')}`;

  // صياغة الوقت بالعربي بشكل طبيعي: "الرابعة مساءً" / "الرابعة والنصف مساءً" / "الرابعة إلا ربع مساءً"
  const period = hour24 < 12 ? 'صباحًا' : 'مساءً';
  const hour12 = hour24 % 12; // 0..11 (0 يعني 12)
  let hourArabicDisplay;
  if (minute === 45) {
    const nextHour12 = (hour12 + 1) % 12;
    hourArabicDisplay = `الساعة ${ARABIC_HOURS[nextHour12]} إلا ربع ${period}`;
  } else {
    let minutePhrase = '';
    if (minute === 15) minutePhrase = ' والربع';
    else if (minute === 30) minutePhrase = ' والنصف';
    else if (minute !== 0) minutePhrase = ` و${minute} دقيقة`;
    hourArabicDisplay = `الساعة ${ARABIC_HOURS[hour12]}${minutePhrase} ${period}`;
  }

  // نفس المعاد بالظبط بصيغة رقمية عشان العداد التنازلي في الصفحة
  const countdown = { year, monthIndex, day, hour: hour24, minute };

  return { dateDisplay, timeDisplay, dayNameAr, dateArabicDisplay, hourArabicDisplay, dayNameEn, dateDisplayEn, timeDisplayEn, countdown };
}

/**
 * اسم الشهر لوحده، باللغة المطلوبة — مستخدم في ودجت "اخدش واكتشف التاريخ"
 * في قالب Dolce Vita (كل بلاطة بتاريخ منفصلة: يوم / شهر / سنة).
 * @param {number} monthIndex - 0..11
 * @param {'ar'|'en'|'fr'} language
 * @returns {string}
 */
function getMonthName(monthIndex, language) {
  if (language === 'fr') return FRENCH_MONTHS[monthIndex];
  if (language === 'en') return ENGLISH_MONTHS[monthIndex];
  return ARABIC_MONTHS[monthIndex];
}

module.exports = { buildDisplayFields, formatHour, getMonthName };
