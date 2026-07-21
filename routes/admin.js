// routes/admin.js
// لوحة تحكم إحصائيات الموقع — محمية بكلمة سر (ADMIN_SECRET في .env)
const express = require('express');
const crypto = require('crypto');

const Invitation = require('../models/Invitation');
const { TEMPLATES } = require('../templates/registry');

const router = express.Router();

const OCCASION_LABELS = { wedding: 'فرح', engagement: 'خطوبة' };
const LANGUAGE_LABELS = { ar: 'عربي', en: 'إنجليزي', fr: 'فرنساوي' };

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

function escapeHtml(s) {
  return String(s || '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

/** صف واحد في مخطط أعمدة أفقي بسيط (CSS بس، من غير أي مكتبة رسم بياني) */
function barRow(label, count, max) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return `
    <div class="bar-row">
      <div class="bar-label">${escapeHtml(label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="bar-count">${count}</div>
    </div>`;
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
      byTemplate,
      viewsAgg,
      recent,
    ] = await Promise.all([
      Invitation.countDocuments({}),
      Invitation.distinct('creatorDeviceId', { creatorDeviceId: { $ne: null } }),
      Invitation.countDocuments({ createdAt: { $gte: startOfToday } }),
      Invitation.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Invitation.aggregate([{ $group: { _id: '$occasionType', count: { $sum: 1 } } }]),
      Invitation.aggregate([{ $group: { _id: '$language', count: { $sum: 1 } } }]),
      Invitation.aggregate([{ $group: { _id: '$templateId', count: { $sum: 1 } } }]),
      Invitation.aggregate([{ $group: { _id: null, total: { $sum: '$viewCount' } } }]),
      Invitation.find({}).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const totalViews = viewsAgg[0] ? viewsAgg[0].total : 0;

    const templateNames = TEMPLATES.reduce((acc, t) => { acc[t.id] = t.name; return acc; }, {});

    const occasionMax = Math.max(1, ...byOccasion.map((r) => r.count));
    const languageMax = Math.max(1, ...byLanguage.map((r) => r.count));
    const templateMax = Math.max(1, ...byTemplate.map((r) => r.count));

    const occasionBars = byOccasion
      .map((r) => barRow(OCCASION_LABELS[r._id] || 'دعوات قديمة', r.count, occasionMax)).join('');
    const languageBars = byLanguage
      .map((r) => barRow(LANGUAGE_LABELS[r._id] || 'دعوات قديمة', r.count, languageMax)).join('');
    const templateBars = byTemplate
      .map((r) => barRow(templateNames[r._id] || 'دعوات قديمة (قبل نظام القوالب)', r.count, templateMax)).join('');

    const recentRows = recent.map((inv) => {
      const names = `${escapeHtml(inv.brideNameAr || inv.brideName)} &amp; ${escapeHtml(inv.groomNameAr || inv.groomName)}`;
      const occasion = OCCASION_LABELS[inv.occasionType] || '—';
      const language = LANGUAGE_LABELS[inv.language] || '—';
      const template = templateNames[inv.templateId] || 'قديم';
      const date = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(inv.createdAt);
      return `
        <tr>
          <td>${names}</td>
          <td><span class="badge">${template}</span></td>
          <td>${occasion}</td>
          <td>${language}</td>
          <td>${date}</td>
          <td>${inv.viewCount || 0}</td>
          <td><a href="/i/${inv.shortId}" target="_blank">فتح ↗</a></td>
        </tr>`;
    }).join('');

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>لوحة تحكم الموقع</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600&family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{ --ink:#151009; --ink-soft:#211910; --panel:#241c14; --parchment:#ede3d3; --parchment-dim:#9c9184; --brass:#c9a227; --brass-dim:#8c7238; --ok:#8fae82; }
  *{box-sizing:border-box;}
  body{ margin:0; min-height:100vh; background:var(--ink); color:var(--parchment); font-family:'Cairo',sans-serif; }
  .topbar{ padding:24px 40px; border-bottom:1px solid rgba(201,162,39,0.18); display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:8px; }
  .topbar .brand{ font-family:'Cormorant Garamond',serif; font-style:italic; font-size:20px; color:var(--brass); }
  .topbar h1{ font-size:18px; margin:0; font-weight:600; }
  .topbar .updated{ font-size:12px; color:var(--parchment-dim); }
  .wrap{ max-width:1080px; margin:0 auto; padding:36px 24px 60px; }

  .kpi-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:14px; margin-bottom:28px; }
  .kpi-card{ background:var(--panel); border:1px solid var(--brass-dim); border-radius:3px; padding:20px 18px; }
  .kpi-number{ font-family:'Cormorant Garamond',serif; font-weight:600; font-size:36px; color:var(--brass); line-height:1; }
  .kpi-label{ font-size:12.5px; color:var(--parchment-dim); margin-top:8px; }

  .panels-grid{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:16px; }
  @media (max-width:860px){ .panels-grid{ grid-template-columns:1fr; } }

  .panel{ background:var(--panel); border:1px solid var(--brass-dim); border-radius:3px; padding:22px; }
  .panel h2{ font-size:12.5px; letter-spacing:0.12em; text-transform:uppercase; color:var(--brass); margin:0 0 18px; }

  .bar-row{ display:grid; grid-template-columns:90px 1fr 34px; align-items:center; gap:10px; margin-bottom:12px; font-size:13px; }
  .bar-label{ color:var(--parchment-dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .bar-track{ height:8px; background:rgba(201,162,39,0.12); border-radius:4px; overflow:hidden; }
  .bar-fill{ height:100%; background:var(--brass); border-radius:4px; }
  .bar-count{ color:var(--brass); font-weight:700; text-align:left; }

  .table-panel{ background:var(--panel); border:1px solid var(--brass-dim); border-radius:3px; padding:22px; overflow-x:auto; }
  .table-panel h2{ font-size:12.5px; letter-spacing:0.12em; text-transform:uppercase; color:var(--brass); margin:0 0 18px; }
  table{ width:100%; border-collapse:collapse; font-size:13.5px; min-width:640px; }
  th{ text-align:right; color:var(--parchment-dim); font-weight:600; font-size:12px; padding:6px 10px; border-bottom:1px solid var(--brass-dim); }
  td{ padding:10px; border-bottom:1px solid rgba(201,162,39,0.1); }
  td a{ color:var(--brass); text-decoration:underline; }
  .badge{ background:rgba(201,162,39,0.15); color:var(--brass); padding:3px 10px; border-radius:20px; font-size:11.5px; }
  .empty{ color:var(--parchment-dim); font-size:13px; padding:8px 0; }
</style>
</head>
<body>
  <div class="topbar">
    <div>
      <div class="brand">Blossom &amp; Oud</div>
      <h1>لوحة تحكم الموقع</h1>
    </div>
    <div class="updated">آخر تحديث: ${new Intl.DateTimeFormat('ar-EG-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}</div>
  </div>

  <div class="wrap">
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-number">${totalInvitations}</div><div class="kpi-label">إجمالي الدعوات</div></div>
      <div class="kpi-card"><div class="kpi-number">${uniqueCreators.length}</div><div class="kpi-label">مستخدمين فريدين عملوا دعوة</div></div>
      <div class="kpi-card"><div class="kpi-number">${createdToday}</div><div class="kpi-label">دعوات النهاردة</div></div>
      <div class="kpi-card"><div class="kpi-number">${createdThisWeek}</div><div class="kpi-label">دعوات آخر ٧ أيام</div></div>
      <div class="kpi-card"><div class="kpi-number">${totalViews}</div><div class="kpi-label">إجمالي مرات فتح الدعوات</div></div>
    </div>

    <div class="panels-grid">
      <div class="panel">
        <h2>حسب المناسبة</h2>
        ${occasionBars || '<div class="empty">مفيش بيانات لسه</div>'}
      </div>
      <div class="panel">
        <h2>حسب اللغة</h2>
        ${languageBars || '<div class="empty">مفيش بيانات لسه</div>'}
      </div>
      <div class="panel">
        <h2>حسب القالب</h2>
        ${templateBars || '<div class="empty">مفيش بيانات لسه</div>'}
      </div>
    </div>

    <div class="table-panel">
      <h2>أحدث ١٠ دعوات</h2>
      ${recent.length ? `
      <table>
        <thead><tr><th>الأسماء</th><th>القالب</th><th>المناسبة</th><th>اللغة</th><th>اتعملت</th><th>مشاهدات</th><th></th></tr></thead>
        <tbody>${recentRows}</tbody>
      </table>` : '<div class="empty">مفيش دعوات اتعملت لسه</div>'}
    </div>
  </div>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('Error building admin dashboard:', err);
    return res.status(500).send('حصل خطأ في السيرفر');
  }
});

module.exports = router;
