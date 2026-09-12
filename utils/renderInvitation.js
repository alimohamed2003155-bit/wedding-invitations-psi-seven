// utils/renderInvitation.js
// الدالة دي بتبني صفحة الدعوة الكاملة (HTML) من بيانات خام، من غير ما تحتاج
// حفظ في قاعدة البيانات. مستخدمة في مكانين:
//   1) POST /api/preview   — معاينة حية وهي بتتكتب في الفورم (بدون حفظ)
//   2) GET  /i/:shortId     — العرض النهائي بعد ما الدعوة اتحفظت فعلاً
// كده الاتنين شغالين بنفس المنطق بالظبط، ومفيش احتمال يحصل فرق بينهم بمرور الوقت.

const fs = require('fs');
const path = require('path');

const { buildDisplayFields, formatHour, getMonthName } = require('./dateFormatter');
const { getStrings } = require('../i18n/strings');
const { buildMainParagraph } = require('../i18n/invitationText');
const { getTemplate, getDefaultTemplate } = require('../templates/registry');
const { safeJsonForScript } = require('./sanitize');
const { injectTemplateFixes, injectBeforeBodyEnd } = require('./templateFixes');
const { buildCustomizationTags } = require('./customizations');
const { buildShareTags, injectShareTags } = require('./shareTags');

// بيتحقن بس في وضع التحرير (routes/invitations.js بيتأكد إن اللي فاتح هو
// صاحب الدعوة فعلاً) — الضيوف عمرهم ما يشوفوا الملفات دي.
// بصمة نسخة على لينك سكريبت المحرر.
//
// من غيرها المتصفح بيفضل شغال بنسخة قديمة متخزّنة عنده حتى بعد ما
// نصلّح حاجة — والعميل بيشوف مشكلة اتصلحت خلاص ومش فاهم ليه.
// البصمة بتتحسب مرة واحدة عند تشغيل السيرفر من تاريخ تعديل الملف.
const RUNTIME_VERSION = (() => {
  try {
    const file = path.join(__dirname, '..', 'client', 'dist', 'editor-runtime.js');
    return String(Math.floor(fs.statSync(file).mtimeMs));
  } catch {
    // الملف لسه ما اتبنيش (وقت التطوير) — وقت التشغيل يكفي
    return String(Date.now());
  }
})();

const EDITOR_RUNTIME_TAGS = [
  `<script src="/vendor/interact.min.js?v=${RUNTIME_VERSION}"></script>`,
  `<script src="/editor-runtime.js?v=${RUNTIME_VERSION}"></script>`,
].join('\n');

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
function renderNewPathHtml(data, options) {
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
    rsvpSubmittingText: strings.rsvpSubmittingText,
    rsvpSuccessText: strings.rsvpSuccessText,
    rsvpErrorText: strings.rsvpErrorText,
    mapTitle: strings.mapTitle,
    openInMapsText: strings.openInMapsText,
    closingLine: strings.closingLine,
    // حقول خاصة بقالب Dolce Vita (بدون ضرر على القوالب التانية، ببساطة
    // بتفضل جوه الـ config من غير ما أي كود تاني يستخدمها)
    heroTagline: strings.heroTagline,
    dressCodeIntro: strings.dressCodeIntro,
    scratchSectionTitle: strings.scratchSectionTitle,
    scratchInstruction: strings.scratchInstruction,
    scratchDayLabel: strings.scratchDayLabel,
    scratchMonthLabel: strings.scratchMonthLabel,
    scratchYearLabel: strings.scratchYearLabel,
    scratchRevealMessage: strings.scratchRevealMessage,
    scratchDay: String(display.countdown.day),
    scratchMonthName: getMonthName(display.countdown.monthIndex, data.language),
    scratchYear: String(display.countdown.year),
    // حقول بيحتاجها قالب Royal Maroon (والقوالب التانية بتتجاهلها):
    // التاريخ بصيغة قياسية للعد التنازلي وإضافة الحدث للتقويم، واسم
    // الشهر واليوم بلغة الدعوة
    weddingDateTimeISO: (() => {
      const d = new Date(data.weddingDateTime);
      return Number.isNaN(d.getTime()) ? '' : d.toISOString();
    })(),
    monthName: getMonthName(display.countdown.monthIndex, data.language),
    weekdayName: data.language === 'ar' ? display.dayNameAr : display.dayNameEn,
    language: data.language,
    hiddenSections: data.hiddenSections || [],
    // بيخلي شاشة "اضغط للفتح" تتخطى نفسها تلقائيًا — مستخدم بس في صفحات
    // المعاينة (زي كروت المعرض) اللي محدش هيضغط عليها فعليًا
    // في وضع التحرير بنتخطى شاشة "اضغط للفتح": صاحب الدعوة جاي يعدّل
    // المحتوى، ولو سيبناها هيفضل محبوس على الغلاف (الضغط على عناصره
    // بيتحسب اختيار للتعديل مش فتح).
    autoOpen: !!data.autoOpen || !!(options && options.editMode),
    // لازم في أي دعوة متحفظة فعليًا عشان نعرف نربط ردود الحضور (RSVP)
    // بيها؛ بيفضل null في وضع المعاينة (مفيش دعوة محفوظة أصلاً نربط بيها)
    shortId: data.shortId || null,
  };

  let html = readTemplateFile(template.file).replace(
    '__INVITATION_CONFIG_JSON__',
    safeJsonForScript(config)
  );
  html = injectTemplateFixes(html);

  // كارت المشاركة (واتساب/فيسبوك). لازم يتحقن حتى لو العميل مغيّرش
  // حاجة: ملفات التصاميم جواها وسوم Tilda الأصلية، فمن غير ده كل
  // دعوة بتظهر باسم التصميم وصورة شعار مالهاش علاقة بالعروسين.
  html = injectShareTags(html, buildShareTags(
    data,
    (options && options.pageUrl) || '',
    (options && options.shareFallbackImage) || (template && template.preview) || ''
  ));

  // تخصيصات العميل (خط/صور/موسيقى/إزاحات) بتتحقن كطبقة فوق التصميم
  html = injectBeforeBodyEnd(html, buildCustomizationTags(data.customizations, options));
  if (options && options.editMode) {
    html = injectBeforeBodyEnd(html, EDITOR_RUNTIME_TAGS);
  }
  return html;
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
    shortId: invitation.shortId || null,
    ...display,
  };
  const html = readTemplateFile('blossom-oud-legacy.html').replace(
    '__INVITATION_CONFIG_JSON__',
    safeJsonForScript(config)
  );
  return injectTemplateFixes(html);
}

module.exports = { renderNewPathHtml, renderLegacyHtml };
