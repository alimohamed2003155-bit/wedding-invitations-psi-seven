// routes/invitations.js
const express = require('express');

const Invitation = require('../models/Invitation');
const { sanitizeText } = require('../utils/sanitize');
const { generateShortId } = require('../utils/idGenerator');
const { renderNewPathHtml, renderLegacyHtml } = require('../utils/renderInvitation');
const { resolveMapInput } = require('../utils/mapsLink');
const { getTemplate, getDefaultTemplate, TEMPLATES } = require('../templates/registry');

const router = express.Router();

const REQUIRED_FIELDS = [
  'brideName', 'groomName', 'brideNameAr', 'groomNameAr',
  'venueName', 'venueCity', 'weddingDate',
];

/**
 * بيتحقق من مدخلات الفورم ويبني كائن بيانات نضيف وجاهز، سواء للمعاينة
 * المؤقتة أو للحفظ الفعلي — نفس التحقق يتطبق في الحالتين.
 * async لأن معالجة رابط الخريطة (utils/mapsLink.js) ممكن تحتاج تتابع
 * إعادة توجيه لينك مصغّر من جوجل مابس.
 */
async function buildInvitationDataFromRequest(body, { skipMapNetwork } = {}) {
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
    extraFields: t.extraFields || [],
  }));
  res.json(publicList);
});

// GET /api/public-stats — أرقام حقيقية آمنة (مفيش أي بيانات شخصية) بتتعرض
// للزوار في الصفحة الرئيسية (عدد الدعوات، عدد المشاهدات، عدد المستخدمين).
// متكاشة لمدة قصيرة عشان آلاف الزيارات على الصفحة الرئيسية ما تضغطش على
// قاعدة البيانات في كل مرة.
let publicStatsCache = { data: null, expiresAt: 0 };
router.get('/api/public-stats', async (req, res) => {
  try {
    const now = Date.now();
    if (publicStatsCache.data && publicStatsCache.expiresAt > now) {
      return res.json(publicStatsCache.data);
    }

    const [totalInvitations, viewsAgg, uniqueCreators] = await Promise.all([
      Invitation.countDocuments({}),
      Invitation.aggregate([{ $group: { _id: null, total: { $sum: '$viewCount' } } }]),
      Invitation.distinct('creatorDeviceId', { creatorDeviceId: { $ne: null } }),
    ]);

    const data = {
      totalInvitations,
      totalViews: viewsAgg[0] ? viewsAgg[0].total : 0,
      totalUsers: uniqueCreators.length,
    };
    publicStatsCache = { data, expiresAt: now + 30 * 1000 }; // كاش لمدة 30 ثانية
    return res.json(data);
  } catch (err) {
    console.error('Error fetching public stats:', err);
    // في أسوأ الأحوال بنرجع أصفار بدل ما نكسر تحميل الصفحة الرئيسية
    return res.json({ totalInvitations: 0, totalViews: 0, totalUsers: 0 });
  }
});

// POST /api/preview — معاينة حية للتصميم الحقيقي، من غير أي حفظ في قاعدة البيانات
router.post('/api/preview', async (req, res) => {
  try {
    const data = await buildInvitationDataFromRequest(req.body || {}, { skipMapNetwork: true });
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
    const data = await buildInvitationDataFromRequest(req.body || {});

    let invitation = null;
    let attempts = 0;
    while (!invitation && attempts < 5) {
      attempts += 1;
      const shortId = generateShortId(7);
      try {
        invitation = await Invitation.create({ shortId, creatorDeviceId: req.deviceId || null, ...data });
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

// GET /i/:shortId/stats — صفحة إحصائيات بسيطة (مش بتزوّد عداد الزيارات،
// لأنها مش زيارة فعلية للدعوة نفسها)
router.get('/i/:shortId/stats', async (req, res) => {
  try {
    const invitation = await Invitation.findOne({ shortId: req.params.shortId });

    if (!invitation) {
      return res
        .status(404)
        .set('Content-Type', 'text/html; charset=utf-8')
        .send(
          '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">' +
          '<body style="font-family:sans-serif;text-align:center;margin-top:15%;color:#444">' +
          '<h1>الدعوة دي مش موجودة</h1></body></html>'
        );
    }

    const createdAtFormatted = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(invitation.createdAt);

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>إحصائيات الدعوة — ${invitation.brideNameAr} &amp; ${invitation.groomNameAr}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,500&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root{ --ink:#1b1410; --ink-soft:#2a2019; --parchment:#ede3d3; --parchment-dim:#c9bda9; --brass:#c9a227; --brass-dim:#8c7238; }
  *{box-sizing:border-box;}
  body{
    margin:0; min-height:100vh; background:var(--ink); color:var(--parchment);
    font-family:'Cairo',sans-serif; display:flex; align-items:center; justify-content:center; padding:24px;
  }
  .card{
    width:100%; max-width:420px; border:1px solid var(--brass-dim); padding:40px 32px;
    text-align:center; background:var(--ink-soft);
  }
  .eyebrow{ font-size:11px; letter-spacing:0.3em; text-transform:uppercase; color:var(--brass); margin-bottom:10px; }
  h1{ font-family:'Cormorant Garamond',serif; font-style:italic; font-weight:600; font-size:26px; margin:0 0 28px; }
  .count{ font-family:'Cormorant Garamond',serif; font-weight:600; font-size:72px; color:var(--brass); line-height:1; }
  .count-label{ font-size:14px; color:var(--parchment-dim); margin-top:8px; }
  .meta{ margin-top:28px; padding-top:20px; border-top:1px solid rgba(201,162,39,0.25); font-size:13px; color:var(--parchment-dim); }
  a.back{ display:inline-block; margin-top:24px; color:var(--brass); font-size:14px; text-decoration:underline; }
</style>
</head>
<body>
  <div class="card">
    <div class="eyebrow">إحصائيات الدعوة</div>
    <h1>${invitation.brideNameAr} &amp; ${invitation.groomNameAr}</h1>
    <div class="count">${invitation.viewCount}</div>
    <div class="count-label">عدد مرات فتح لينك الدعوة</div>
    <div class="meta">اتعملت الدعوة في: ${createdAtFormatted}</div>
    <a class="back" href="/i/${invitation.shortId}">افتح الدعوة نفسها ←</a>
  </div>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('Error rendering stats page:', err);
    return res.status(500).send('حصل خطأ في السيرفر');
  }
});

// GET /preview-sample/:templateId — معاينة القالب ببيانات وهمية جاهزة (زرار
// "شوف شكل الدعوة" في معرض القوالب)، بدون أي حفظ ومن غير ما يحتاج المستخدم
// يفتح الفورم أصلًا.
router.get('/preview-sample/:templateId', (req, res) => {
  const template = getTemplate(req.params.templateId);
  if (!template) return res.status(404).send('القالب ده مش موجود');

  const now = new Date();
  const sampleDate = new Date(now.getFullYear(), now.getMonth() + 2, 15, 18, 0, 0);
  const timeline = template.timelineStages.map((key, i) => ({ key, hour: 17 + i }));

  const data = {
    templateId: template.id,
    language: 'ar',
    occasionType: 'wedding',
    hiddenSections: [],
    timeline,
    brideName: 'Amira', groomName: 'Yusuf',
    brideNameAr: 'أميرة', groomNameAr: 'يوسف',
    venueName: 'قاعة النموذج', venueCity: 'القاهرة، مصر',
    venueMapQuery: '', venueMapEmbedSrc: 'https://www.google.com/maps?q=Cairo&output=embed',
    venueMapDirectLink: 'https://www.google.com/maps/search/?api=1&query=Cairo',
    contactName: '', contactPhone: '', venueAddress: '',
    weddingDateTime: sampleDate,
  };

  const html = renderNewPathHtml(data);
  res.set('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
});

module.exports = router;
