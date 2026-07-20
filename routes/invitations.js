// routes/invitations.js
const express = require('express');
const crypto = require('crypto');

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

// ==========================================================================
// GET /admin/stats — إحصائيات الموقع كله (محمية بكلمة سر، مش لأي حد)
// ==========================================================================

/**
 * مقارنة آمنة لكلمة السر (بتاخد نفس الوقت في كل الحالات) عشان تمنع أي محاولة
 * تخمين تعتمد على قياس زمن الاستجابة (timing attack).
 */
function isValidAdminKey(providedKey) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return false; // لو مفيش كلمة سر متظبطة أصلًا، الصفحة مقفولة تمامًا
  const a = Buffer.from(String(providedKey || ''));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

router.get('/admin/stats', async (req, res) => {
  if (!isValidAdminKey(req.query.key)) {
    return res
      .status(403)
      .set('Content-Type', 'text/html; charset=utf-8')
      .send(
        '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">' +
        '<body style="font-family:sans-serif;text-align:center;margin-top:15%;color:#444">' +
        '<h1>مفيش صلاحية</h1><p>الصفحة دي محتاجة كلمة سر صحيحة في الرابط (?key=...).</p></body></html>'
      );
  }

  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);

    const [
      totalInvitations,
      uniqueCreators,
      createdToday,
      createdThisWeek,
      byOccasion,
      byLanguage,
      viewsAgg,
    ] = await Promise.all([
      Invitation.countDocuments({}),
      Invitation.distinct('creatorDeviceId', { creatorDeviceId: { $ne: null } }),
      Invitation.countDocuments({ createdAt: { $gte: startOfToday } }),
      Invitation.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Invitation.aggregate([{ $group: { _id: '$occasionType', count: { $sum: 1 } } }]),
      Invitation.aggregate([{ $group: { _id: '$language', count: { $sum: 1 } } }]),
      Invitation.aggregate([{ $group: { _id: null, total: { $sum: '$viewCount' } } }]),
    ]);

    const totalViews = viewsAgg[0] ? viewsAgg[0].total : 0;
    const OCCASION_LABELS = { wedding: 'فرح', engagement: 'خطوبة' };
    const LANGUAGE_LABELS = { ar: 'عربي', en: 'إنجليزي', fr: 'فرنساوي' };

    const occasionRows = byOccasion.map((r) =>
      `<tr><td>${OCCASION_LABELS[r._id] || 'دعوات قديمة (قبل نظام المناسبات)'}</td><td>${r.count}</td></tr>`
    ).join('');
    const languageRows = byLanguage.map((r) =>
      `<tr><td>${LANGUAGE_LABELS[r._id] || 'دعوات قديمة (قبل نظام اللغات)'}</td><td>${r.count}</td></tr>`
    ).join('');

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>إحصائيات الموقع</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root{ --ink:#1b1410; --ink-soft:#2a2019; --parchment:#ede3d3; --parchment-dim:#c9bda9; --brass:#c9a227; --brass-dim:#8c7238; }
  *{box-sizing:border-box;}
  body{ margin:0; min-height:100vh; background:var(--ink); color:var(--parchment); font-family:'Cairo',sans-serif; padding:48px 20px; }
  .wrap{ max-width:820px; margin:0 auto; }
  h1{ font-family:'Cormorant Garamond',serif; font-weight:600; font-size:30px; margin:0 0 32px; }
  .grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:16px; margin-bottom:36px; }
  .stat-card{ border:1px solid var(--brass-dim); background:var(--ink-soft); padding:22px 18px; text-align:center; }
  .stat-number{ font-family:'Cormorant Garamond',serif; font-weight:600; font-size:40px; color:var(--brass); line-height:1; }
  .stat-label{ font-size:13px; color:var(--parchment-dim); margin-top:8px; }
  .panel{ border:1px solid var(--brass-dim); background:var(--ink-soft); padding:24px; margin-bottom:20px; }
  .panel h2{ font-size:14px; letter-spacing:0.1em; text-transform:uppercase; color:var(--brass); margin:0 0 16px; }
  table{ width:100%; border-collapse:collapse; font-size:14px; }
  td{ padding:8px 4px; border-bottom:1px solid rgba(201,162,39,0.15); }
  td:last-child{ text-align:left; color:var(--brass); font-weight:700; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>إحصائيات الموقع</h1>
    <div class="grid">
      <div class="stat-card"><div class="stat-number">${totalInvitations}</div><div class="stat-label">إجمالي الدعوات</div></div>
      <div class="stat-card"><div class="stat-number">${uniqueCreators.length}</div><div class="stat-label">مستخدمين فريدين عملوا دعوة</div></div>
      <div class="stat-card"><div class="stat-number">${createdToday}</div><div class="stat-label">دعوات النهاردة</div></div>
      <div class="stat-card"><div class="stat-number">${createdThisWeek}</div><div class="stat-label">دعوات آخر 7 أيام</div></div>
      <div class="stat-card"><div class="stat-number">${totalViews}</div><div class="stat-label">إجمالي مرات فتح كل الدعوات</div></div>
    </div>
    <div class="panel">
      <h2>حسب نوع المناسبة</h2>
      <table>${occasionRows || '<tr><td>مفيش بيانات لسه</td></tr>'}</table>
    </div>
    <div class="panel">
      <h2>حسب اللغة</h2>
      <table>${languageRows || '<tr><td>مفيش بيانات لسه</td></tr>'}</table>
    </div>
  </div>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('Error building admin stats:', err);
    return res.status(500).send('حصل خطأ في السيرفر');
  }
});

module.exports = router;
