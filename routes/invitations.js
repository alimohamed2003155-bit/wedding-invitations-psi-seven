// routes/invitations.js
const express = require('express');

const Invitation = require('../models/Invitation');
const { sanitizeText } = require('../utils/sanitize');
const { generateShortId } = require('../utils/idGenerator');
const { renderNewPathHtml, renderLegacyHtml } = require('../utils/renderInvitation');
const { getTemplate, getDefaultTemplate, TEMPLATES } = require('../templates/registry');

const router = express.Router();

const REQUIRED_FIELDS = [
  'brideName', 'groomName', 'brideNameAr', 'groomNameAr',
  'venueName', 'venueCity', 'weddingDate',
];

/**
 * بيتحقق من مدخلات الفورم ويبني كائن بيانات نضيف وجاهز، سواء للمعاينة
 * المؤقتة أو للحفظ الفعلي — نفس التحقق يتطبق في الحالتين.
 */
function buildInvitationDataFromRequest(body) {
  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || String(body[field]).trim() === '') {
      throw Object.assign(new Error('من فضلك املأ كل الحقول المطلوبة.'), { status: 400 });
    }
  }

  const template = getTemplate(body.templateId) || getDefaultTemplate();
  const language = template.languages.includes(body.language) ? body.language : 'ar';
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
  const venueMapQuery = sanitizeText(body.venueMapQuery, 140) || `${venueName}, ${venueCity}`;

  if (!brideName || !groomName || !brideNameAr || !groomNameAr || !venueName || !venueCity) {
    throw Object.assign(new Error('من فضلك تأكد إن كل الحقول متكتوبة بشكل صحيح.'), { status: 400 });
  }

  return {
    templateId: template.id, language, occasionType, hiddenSections, timeline,
    brideName, groomName, brideNameAr, groomNameAr,
    venueName, venueCity, venueMapQuery, weddingDateTime,
  };
}

// GET /api/templates — القوالب المتاحة (الفورم بيبني نفسه منها تلقائيًا)
router.get('/api/templates', (req, res) => {
  const publicList = TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    languages: t.languages,
    occasionTypes: t.occasionTypes,
    optionalSections: t.optionalSections,
    timelineStages: t.timelineStages,
  }));
  res.json(publicList);
});

// POST /api/preview — معاينة حية للتصميم الحقيقي، من غير أي حفظ في قاعدة البيانات
router.post('/api/preview', (req, res) => {
  try {
    const data = buildInvitationDataFromRequest(req.body || {});
    const html = renderNewPathHtml(data);
    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    if (err.status) return res.status(err.status).send('');
    console.error('Error building preview:', err);
    return res.status(500).send('');
  }
});

// POST /api/invitations — إنشاء دعوة فعلية (بتتحفظ في قاعدة البيانات)
router.post('/api/invitations', async (req, res) => {
  try {
    const data = buildInvitationDataFromRequest(req.body || {});

    let invitation = null;
    let attempts = 0;
    while (!invitation && attempts < 5) {
      attempts += 1;
      const shortId = generateShortId(7);
      try {
        invitation = await Invitation.create({ shortId, ...data });
      } catch (err) {
        if (err.code === 11000) continue;
        throw err;
      }
    }

    if (!invitation) {
      return res.status(500).json({ error: 'حصل خطأ في توليد اللينك، حاول تاني.' });
    }

    return res.status(201).json({ id: invitation.shortId, path: `/i/${invitation.shortId}` });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error creating invitation:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر، حاول تاني بعد شوية.' });
  }
});

// GET /i/:shortId — عرض دعوة (دعوات قديمة بدون templateId بتتعرض بالتصميم
// الأصلي حرفيًا، من غير أي تغيير)
router.get('/i/:shortId', async (req, res) => {
  try {
    const invitation = await Invitation.findOneAndUpdate(
      { shortId: req.params.shortId },
      { $inc: { viewCount: 1 } }
    );

    if (!invitation) {
      return res
        .status(404)
        .set('Content-Type', 'text/html; charset=utf-8')
        .send(
          '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">' +
          '<body style="font-family:sans-serif;text-align:center;margin-top:15%;color:#444">' +
          '<h1>الدعوة دي مش موجودة</h1><p>تأكد إن اللينك متنسوخ صح.</p></body></html>'
        );
    }

    const html = invitation.templateId
      ? renderNewPathHtml(invitation)
      : renderLegacyHtml(invitation);

    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('Error rendering invitation:', err);
    return res.status(500).send('حصل خطأ في السيرفر');
  }
});

module.exports = router;
