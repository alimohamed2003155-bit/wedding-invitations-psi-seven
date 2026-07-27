// utils/renderInvitation.js
// الدالة دي بتبني صفحة الدعوة الكاملة (HTML) من بيانات خام، من غير ما تحتاج
// حفظ في قاعدة البيانات. مستخدمة في مكانين:
//   1) POST /api/preview   — معاينة حية وهي بتتكتب في الفورم (بدون حفظ)
//   2) GET  /i/:shortId     — العرض النهائي بعد ما الدعوة اتحفظت فعلاً
// كده الاتنين شغالين بنفس المنطق بالظبط، ومفيش احتمال يحصل فرق بينهم بمرور الوقت.

const fs = require('fs');
const path = require('path');

const { buildDisplayFields, formatHour } = require('./dateFormatter');
const { getStrings } = require('../i18n/strings');
const { buildMainParagraph } = require('../i18n/invitationText');
const { getTemplate, getDefaultTemplate } = require('../templates/registry');

const VIEWS_DIR = path.join(__dirname, '..', 'views');
const templateFileCache = {};

function readTemplateFile(fileName) {
  if (!templateFileCache[fileName]) {
    templateFileCache[fileName] = fs.readFileSync(path.join(VIEWS_DIR, fileName), 'utf8');
  }
  return templateFileCache[fileName];
}

/**
 * @param {object} data - بيانات الدعوة (نفس شكل مستند MongoDB أو مدخلات خام مؤقتة)
 * @returns {string} HTML كامل جاهز للعرض
 */
function renderNewPathHtml(data) {
  const template = getTemplate(data.templateId) || getDefaultTemplate();
  const display = buildDisplayFields(data.weddingDateTime);
  const strings = getStrings(data.language, data.occasionType);

  const heroDateDisplay = data.language === 'en' ? display.dateDisplayEn
    : data.language === 'fr' ? display.dateDisplay
    : display.dateArabicDisplay;
  const heroTimeDisplay = data.language === 'en' ? display.timeDisplayEn
    : data.language === 'fr' ? display.timeDisplay
    : display.hourArabicDisplay;

  // مهم جدًا: أسماء العروسين اللي بتظهر في الشاشة الرئيسية (وعنوان التاب)
  // لازم تتبع اللغة المختارة زي أي نص تاني — لو اخترت عربي، تفضل أسماء
  // لاتينية ظاهرة فوق كان أكبر مصدر للّخبطة والكلام المتناقض في اللغة.
  const heroBrideName = data.language === 'ar' ? data.brideNameAr : data.brideName;
  const heroGroomName = data.language === 'ar' ? data.groomNameAr : data.groomName;
  const nameConnector = data.language === 'ar' ? ' و ' : ' &amp; ';

  const mainParagraphHtml = buildMainParagraph({
    language: data.language,
    occasionType: data.occasionType,
    brideName: data.brideName,
    groomName: data.groomName,
    brideNameAr: data.brideNameAr,
    groomNameAr: data.groomNameAr,
    venueName: data.venueName,
    display,
  });

  const timelineStages = (data.timeline || []).map((stage) => ({
    label: strings.timelineStages[stage.key] || stage.key,
    time: formatHour(stage.hour, data.language),
  }));

  const config = {
    brideName: heroBrideName,
    groomName: heroGroomName,
    nameConnector,
    heroEyebrow: strings.heroEyebrow,
    heroDateDisplay,
    heroTimeDisplay,
    mainParagraphHtml,
    openingTitle: strings.openingTitle,
    openingBody: strings.openingBody,
    venueName: data.venueName,
    venueCity: data.venueCity,
    venueAddress: data.venueAddress || '',
    venueMapQuery: data.venueMapQuery,
    // رابط التضمين النهائي ورابط الفتح المباشر بيتحسبوا مسبقًا (utils/mapsLink.js)
    // من أي مدخل (لينك جوجل مابس كامل، لينك مصغّر، أو نص عادي). الـ fallback هنا
    // للحماية بس لو الدالة دي اتنادت من كود قديم من غير الحقول الجديدة.
    venueMapEmbedSrc: data.venueMapEmbedSrc
      || `https://www.google.com/maps?q=${encodeURIComponent(data.venueMapQuery || `${data.venueName}, ${data.venueCity}`)}&output=embed`,
    venueMapDirectLink: data.venueMapDirectLink
      || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.venueMapQuery || `${data.venueName}, ${data.venueCity}`)}`,
    venueTitle: strings.venueTitle,
    tapToOpen: strings.tapToOpen,
    celebrationBegins: strings.celebrationBegins,
    countdownLabels: strings.countdown,
    countdown: display.countdown,
    timelineTitle: strings.timelineTitle,
    timelineStages,
    dressCodeTitle: strings.dressCodeTitle,
    colorPalette: strings.colorPalette,
    ladiesLabel: strings.ladies,
    gentlemenLabel: strings.gentlemen,
    ladiesDesc: strings.ladiesDesc,
    gentlemenDesc: strings.gentlemenDesc,
    detailsTitle: strings.detailsTitle,
    contactIntro: strings.contactIntro,
    giftNote: strings.giftNote,
    contactName: data.contactName || '',
    contactPhone: data.contactPhone || '',
    rsvpTitle: strings.rsvpTitle,
    rsvpIntro: strings.rsvpIntro,
    rsvpButtonText: strings.rsvpButtonText,
    rsvpDeadlineNote: strings.rsvpDeadlineNote,
    yourNameLabel: strings.yourNameLabel,
    willYouComeLabel: strings.willYouComeLabel,
    yesOption: strings.yesOption,
    noOption: strings.noOption,
    foodIntoleranceLabel: strings.foodIntoleranceLabel,
    submitButtonText: strings.submitButtonText,
    mapTitle: strings.mapTitle,
    openInMapsText: strings.openInMapsText,
    closingLine: strings.closingLine,
    hiddenSections: data.hiddenSections || [],
  };

  return readTemplateFile(template.file).replace(
    '__INVITATION_CONFIG_JSON__',
    JSON.stringify(config)
  );
}

function renderLegacyHtml(invitation) {
  const display = buildDisplayFields(invitation.weddingDateTime);
  const config = {
    brideName: invitation.brideName,
    groomName: invitation.groomName,
    brideNameAr: invitation.brideNameAr,
    groomNameAr: invitation.groomNameAr,
    venueName: invitation.venueName,
    venueCity: invitation.venueCity,
    venueMapQuery: invitation.venueMapQuery,
    ...display,
  };
  return readTemplateFile('blossom-oud-legacy.html').replace(
    '__INVITATION_CONFIG_JSON__',
    JSON.stringify(config)
  );
}

module.exports = { renderNewPathHtml, renderLegacyHtml };
