// i18n/invitationText.js
// فقرة الدعوة الرئيسية بتتغير جوهريًا حسب اللغة ونوع المناسبة، فكل حالة
// مكتوبة بصياغتها الطبيعية بدل ترجمة حرفية من نسخة واحدة.

/**
 * @param {object} p
 * @param {'ar'|'en'|'fr'} p.language
 * @param {'wedding'|'engagement'} p.occasionType
 * @param {string} p.brideName - بالحروف اللاتينية
 * @param {string} p.groomName - بالحروف اللاتينية
 * @param {string} p.brideNameAr
 * @param {string} p.groomNameAr
 * @param {string} p.venueName
 * @param {object} p.display - ناتج buildDisplayFields (dayNameAr, dateArabicDisplay, hourArabicDisplay, dayNameEn, dateDisplayEn, timeDisplayEn, dateDisplay, timeDisplay)
 * @returns {string} HTML للفقرة
 */
function buildMainParagraph(p) {
  const { language, occasionType, brideName, groomName, brideNameAr, groomNameAr, venueName, display } = p;
  const isEngagement = occasionType === 'engagement';

  if (language === 'ar') {
    const occasionWord = isEngagement ? 'خطوبتهما' : 'زفافهما';
    return (
      `الآنسة ${brideNameAr} والسيد ${groomNameAr}<br><br>` +
      `يسعدهما ويشرفهما أن يدعوا حضرتكم الكريمة<br>` +
      `لمشاركتهما فرحة حفل ${occasionWord}<br><br>` +
      `وذلك بمشيئة الله تعالى يوم ${display.dayNameAr} ${display.dateArabicDisplay} <br>` +
      `على الساعة ${display.hourArabicDisplay}<br><br>` +
      `بقاعة <br><br>`
    );
  }

  if (language === 'en') {
    const occasionWord = isEngagement ? 'engagement' : 'wedding';
    return (
      `${brideName} &amp; ${groomName}<br><br>` +
      `Request the honor of your presence<br>` +
      `to celebrate their ${occasionWord}<br><br>` +
      `on ${display.dayNameEn}, ${display.dateDisplayEn}<br>` +
      `${display.timeDisplayEn}<br><br>` +
      `at<br><br>`
    );
  }

  // fr
  const occasionWord = isEngagement ? 'fiançailles' : 'mariage';
  return (
    `${brideName} &amp; ${groomName}<br><br>` +
    `Ont l'honneur de vous inviter<br>` +
    `à célébrer leur ${occasionWord}<br><br>` +
    `le ${display.dateDisplay}<br>` +
    `${display.timeDisplay}<br><br>` +
    `à<br><br>`
  );
}

module.exports = { buildMainParagraph };
