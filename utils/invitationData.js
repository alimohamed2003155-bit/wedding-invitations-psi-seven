// utils/invitationData.js
// التحقق من مدخلات الدعوة وبناء كائن بيانات نضيف جاهز للحفظ.
//
// الملف ده اتفصل عن routes/invitations.js عشان أكتر من مسار محتاجه:
//   - POST /api/preview        (معاينة من غير حفظ)
//   - POST /api/invitations    (إنشاء دعوة عادية)
//   - PATCH /api/editor/:id/details  (تعديل بيانات الدعوة من المحرر)
// كلهم لازم يعدّوا على نفس التحقق بالظبط، عشان مايبقاش في باب خلفي
// بيدخل منه بيانات مش متفحوصة.

const { sanitizeText } = require('./sanitize');
const { resolveMapInput } = require('./mapsLink');
const { getTemplate, getDefaultTemplate } = require('../templates/registry');

const REQUIRED_FIELDS = [
  'brideName', 'groomName', 'brideNameAr', 'groomNameAr',
  'venueName', 'venueCity', 'weddingDate',
];

/**
 * @param {object} body مدخلات الفورم الخام
 * @param {{skipMapNetwork?: boolean, user?: object}} options
 *   skipMapNetwork: مايتابعش لينكات جوجل المصغّرة (للمعاينة السريعة)
 *   user: المستخدم المسجّل — لازم للقوالب المميزة
 * @returns {Promise<object>} بيانات جاهزة للحفظ في Invitation
 */
async function buildInvitationDataFromRequest(body, { skipMapNetwork, user } = {}) {
  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || String(body[field]).trim() === '') {
      throw Object.assign(new Error('من فضلك املأ كل الحقول المطلوبة.'), { status: 400 });
    }
  }

  const template = getTemplate(body.templateId) || getDefaultTemplate();

  // القوالب المميزة (templates/registry.js: isPremium) متاحة بس للمستخدمين
  // المسجلين دخولهم — req.user بيتحط من middleware/auth.js (attachUser)
  if (template.isPremium && !user) {
    throw Object.assign(
      new Error('التصميم ده متاح بس للمستخدمين المسجلين — سجل دخول أو اعمل حساب الأول.'),
      { status: 401 }
    );
  }

  // الافتراضي = أول لغة في قايمة القالب (الإنجليزي) مش قيمة ثابتة —
  // عشان يفضل متسق مع اللي الفورم بيعرضه
  const language = template.languages.includes(body.language) ? body.language : template.languages[0];
  const occasionType = template.occasionTypes.includes(body.occasionType) ? body.occasionType : 'wedding';

  const weddingDateOnly = new Date(body.weddingDate);
  if (Number.isNaN(weddingDateOnly.getTime())) {
    throw Object.assign(new Error('تاريخ الحفلة غير صحيح.'), { status: 400 });
  }

  const submittedTimeline = Array.isArray(body.timeline) ? body.timeline : [];
  const timeline = template.timelineStages.map((key, i) => {
    const found = submittedTimeline.find((t) => t && t.key === key) || submittedTimeline[i] || {};
    let hour = parseInt(found.hour, 10);
    if (Number.isNaN(hour) || hour < 0 || hour > 23) hour = 18;
    return { key, hour };
  });

  const baseHour = timeline[0] ? timeline[0].hour : 18;
  const weddingDateTime = new Date(
    weddingDateOnly.getFullYear(), weddingDateOnly.getMonth(), weddingDateOnly.getDate(),
    baseHour, 0, 0
  );

  const allowedSectionKeys = template.optionalSections.map((s) => s.key);
  const hiddenSections = Array.isArray(body.hiddenSections)
    ? body.hiddenSections.filter((k) => allowedSectionKeys.includes(k))
    : [];

  const brideName = sanitizeText(body.brideName, 60);
  const groomName = sanitizeText(body.groomName, 60);
  const brideNameAr = sanitizeText(body.brideNameAr, 60);
  const groomNameAr = sanitizeText(body.groomNameAr, 60);
  const venueName = sanitizeText(body.venueName, 100);
  const venueCity = sanitizeText(body.venueCity, 100);
  // بنقبل هنا أي حاجة: لينك جوجل مابس كامل، لينك مصغّر، أو مجرد نص عنوان —
  // ورابط التضمين النهائي بيتحسب بعدين بمعالجة ذكية (utils/mapsLink.js)
  const venueMapQueryRaw = String(body.venueMapQuery || '').trim().slice(0, 300);

  if (!brideName || !groomName || !brideNameAr || !groomNameAr || !venueName || !venueCity) {
    throw Object.assign(new Error('من فضلك تأكد إن كل الحقول متكتوبة بشكل صحيح.'), { status: 400 });
  }

  const { embedSrc: venueMapEmbedSrc, directLink: venueMapDirectLink } = await resolveMapInput({
    raw: venueMapQueryRaw,
    venueName,
    venueCity,
    skipNetwork: !!skipMapNetwork,
  });

  // حقول إضافية اختيارية بيحددها كل قالب لوحده (extraFields في السجل) —
  // بنقبل بس الحقول اللي القالب المختار فعليًا بيدعمها.
  const extra = {};
  for (const fieldDef of template.extraFields || []) {
    extra[fieldDef.key] = sanitizeText(body[fieldDef.key], fieldDef.maxlength || 200);
  }

  return {
    templateId: template.id, language, occasionType, hiddenSections, timeline,
    brideName, groomName, brideNameAr, groomNameAr,
    venueName, venueCity,
    venueMapQuery: venueMapQueryRaw || `${venueName}, ${venueCity}`,
    venueMapEmbedSrc, venueMapDirectLink,
    weddingDateTime,
    ...extra,
  };
}

module.exports = { buildInvitationDataFromRequest, REQUIRED_FIELDS };
