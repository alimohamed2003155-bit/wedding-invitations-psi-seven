// routes/invitations.js
const express = require('express');

const Invitation = require('../models/Invitation');
const Rsvp = require('../models/Rsvp');
const User = require('../models/User');
const { sanitizeText, escapeHtml } = require('../utils/sanitize');
const { generateShortId } = require('../utils/idGenerator');
const { renderNewPathHtml, renderLegacyHtml } = require('../utils/renderInvitation');
const { buildInvitationDataFromRequest } = require('../utils/invitationData');
const SiteTotals = require('../models/SiteTotals');
const { getTemplate, TEMPLATES } = require('../templates/registry');
const { localizeTemplate } = require('../templates/i18n');
const { ensureDeviceId, rsvpLimiter } = require('../middleware/deviceLimiter');

const router = express.Router();

// GET /api/templates — القوالب المتاحة (الفورم بيبني نفسه منها تلقائيًا)
router.get('/api/templates', (req, res) => {
  // ?lang=ar|en — بترجّع أسماء الأقسام والحقول والوصف باللغة المطلوبة
  const publicList = TEMPLATES.map((t) => localizeTemplate(t, req.query.lang));
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

    const [totalInvitations, viewsAgg, uniqueCreators, archived] = await Promise.all([
      // المسودات مش دعوات حقيقية لسه — مالهاش لازمة في الأرقام العامة
      Invitation.countDocuments({ status: { $ne: 'draft' } }),
      Invitation.aggregate([{ $group: { _id: null, total: { $sum: '$viewCount' } } }]),
      Invitation.distinct('creatorDeviceId', { creatorDeviceId: { $ne: null } }),
      // أرقام الدعوات اللي اتمسحت في التنضيف الدوري
      SiteTotals.findOne({ key: 'default' }).lean(),
    ]);

    // الأرقام اللي بتبان للزوار = الموجود فعلاً + اللي اتمسح.
    // من غير الجمع ده، العداد كان هينزل قدام الناس كل ما بننضّف —
    // وده أسوأ من إن القاعدة تكبر.
    const data = {
      totalInvitations: totalInvitations + ((archived && archived.archivedInvitations) || 0),
      totalViews: (viewsAgg[0] ? viewsAgg[0].total : 0) + ((archived && archived.archivedViews) || 0),
      totalUsers: uniqueCreators.length + ((archived && archived.archivedCreators) || 0),
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
    const data = await buildInvitationDataFromRequest(req.body || {}, { skipMapNetwork: true, user: req.user });
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
    const data = await buildInvitationDataFromRequest(req.body || {}, { user: req.user });

    // لو المستخدم مسجّل وعنده رصيد باقة، بنستهلك دعوة واحدة من رصيده
    // والدعوة بتبقى "مميزة" (يقدر يفتح المحرر عليها بعدين).
    // بنستخدم findOneAndUpdate بشرط الرصيد > 0 عشان لو بعت طلبين في نفس
    // اللحظة مايستهلكش أكتر من رصيده.
    let ownerId = null;
    let isPremium = false;
    if (req.user) {
      ownerId = req.user.id;
      const consumed = await User.findOneAndUpdate(
        { _id: req.user.id, 'subscription.invitationsLeft': { $gt: 0 } },
        { $inc: { 'subscription.invitationsLeft': -1 } },
        { new: true }
      );
      isPremium = !!consumed;
    }

    let invitation = null;
    let attempts = 0;
    while (!invitation && attempts < 5) {
      attempts += 1;
      const shortId = generateShortId(7);
      try {
        invitation = await Invitation.create({
          shortId,
          creatorDeviceId: req.deviceId || null,
          ownerId,
          isPremium,
          ...data,
        });
      } catch (err) {
        if (err.code === 11000) continue;
        throw err;
      }
    }

    if (!invitation) {
      return res.status(500).json({ error: 'حصل خطأ في توليد اللينك، حاول تاني.' });
    }

    return res.status(201).json({
      id: invitation.shortId,
      path: `/i/${invitation.shortId}`,
      isPremium: invitation.isPremium,
    });
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
    const invitation = await Invitation.findOne({ shortId: req.params.shortId });

    const isOwner = !!invitation && !!req.user && !!invitation.ownerId
      && String(invitation.ownerId) === req.user.id;

    // المسودة (دعوة اتفتحت في المحرر ولسه متنشرتش) بتبان لصاحبها بس —
    // لأي حد تاني هي "مش موجودة" بالظبط زي أي لينك غلط، من غير ما نلمّح
    // إنها موجودة فعلاً.
    if (!invitation || (invitation.status === 'draft' && !isOwner)) {
      return res
        .status(404)
        .set('Content-Type', 'text/html; charset=utf-8')
        .send(
          '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">' +
          '<body style="font-family:sans-serif;text-align:center;margin-top:15%;color:#444">' +
          '<h1>الدعوة دي مش موجودة</h1><p>تأكد إن اللينك متنسوخ صح.</p></body></html>'
        );
    }

    // ?edit=1 بيشغّل المحرر — بس لصاحب الدعوة، ولو الدعوة مميزة.
    // أي حد تاني بيشوف الدعوة عادي من غير أي أدوات تحرير.
    const editMode = req.query.edit === '1' && isOwner && invitation.isPremium;

    // عدّاد المشاهدات للضيوف بس — صاحب الدعوة وهو بيعدّل مايزوّدش أرقامه
    // بنفسه (بيفتح ويقفل عشرات المرات وهو شغال).
    if (!editMode) {
      Invitation.updateOne({ _id: invitation._id }, { $inc: { viewCount: 1 } }).catch(() => {});
    }

    const html = invitation.templateId
      ? renderNewPathHtml(invitation, { editMode })
      : renderLegacyHtml(invitation);

    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('Error rendering invitation:', err);
    return res.status(500).send('حصل خطأ في السيرفر');
  }
});

// POST /i/:shortId/rsvp — ضيف بيبعت تأكيد حضوره على دعوة معينة. عام بدون
// أي تسجيل دخول (زي أي RSVP حقيقي)، بس محدود بمعدّل لكل جهاز عشان يصعب
// إغراق دعوة معينة بردود وهمية.
router.post('/i/:shortId/rsvp', ensureDeviceId, rsvpLimiter, async (req, res) => {
  try {
    // $ne بدل status:'published' عن قصد: الدعوات القديمة مفيهاش الحقل ده
    // أصلًا في قاعدة البيانات، فأي مقارنة بالتساوي هتستبعدها بالغلط.
    const invitationExists = await Invitation.exists({
      shortId: req.params.shortId,
      status: { $ne: 'draft' },
    });
    if (!invitationExists) {
      return res.status(404).json({ error: 'الدعوة دي مش موجودة.' });
    }

    const guestName = sanitizeText(req.body && req.body.guestName, 80);
    if (!guestName) {
      return res.status(400).json({ error: 'من فضلك اكتب اسمك.' });
    }

    const rawAttending = req.body && req.body.attending;
    let attending;
    if (rawAttending === true || rawAttending === 'yes' || rawAttending === 'true') attending = true;
    else if (rawAttending === false || rawAttending === 'no' || rawAttending === 'false') attending = false;
    else return res.status(400).json({ error: 'من فضلك حدد هتحضر ولا لأ.' });

    const note = sanitizeText(req.body && req.body.note, 200);

    await Rsvp.create({
      shortId: req.params.shortId,
      guestName,
      attending,
      note,
      deviceId: req.deviceId || null,
    });

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Error saving RSVP:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر، حاول تاني بعد شوية.' });
  }
});


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

    // ملخص ردود تأكيد الحضور + آخر 300 رد (كافية لأي دعوة عادية؛ لو حد
    // احتاج أكتر من كده فعليًا يبقى محتاج تصدير منفصل، مش عرض على الشاشة)
    const [rsvpCountsAgg, rsvpList] = await Promise.all([
      Rsvp.aggregate([
        { $match: { shortId: invitation.shortId } },
        { $group: { _id: '$attending', count: { $sum: 1 } } },
      ]),
      Rsvp.find({ shortId: invitation.shortId }).sort({ createdAt: -1 }).limit(300),
    ]);
    let rsvpYes = 0;
    let rsvpNo = 0;
    for (const row of rsvpCountsAgg) {
      if (row._id === true) rsvpYes = row.count;
      else if (row._id === false) rsvpNo = row.count;
    }
    const rsvpTotal = rsvpYes + rsvpNo;

    const rsvpRowsHtml = rsvpList.length
      ? rsvpList.map((r) => {
          const when = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          }).format(r.createdAt);
          const badge = r.attending
            ? '<span class="rsvp-badge rsvp-badge--yes">هيحضر</span>'
            : '<span class="rsvp-badge rsvp-badge--no">معتذر</span>';
          const noteHtml = r.note
            ? `<div class="rsvp-note">${escapeHtml(r.note)}</div>`
            : '';
          return `<li class="rsvp-row">
            <div class="rsvp-row__top">
              <span class="rsvp-name">${escapeHtml(r.guestName)}</span>
              ${badge}
            </div>
            ${noteHtml}
            <div class="rsvp-when">${escapeHtml(when)}</div>
          </li>`;
        }).join('')
      : '<li class="rsvp-empty">لسه محدش أكّد حضوره.</li>';

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>إحصائيات الدعوة — ${escapeHtml(invitation.brideNameAr)} &amp; ${escapeHtml(invitation.groomNameAr)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,500&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root{ --ink:#1b1410; --ink-soft:#2a2019; --parchment:#ede3d3; --parchment-dim:#c9bda9; --brass:#c9a227; --brass-dim:#8c7238; --good:#7fae6a; --bad:#c97a5a; }
  *{box-sizing:border-box;}
  body{
    margin:0; min-height:100vh; background:var(--ink); color:var(--parchment);
    font-family:'Cairo',sans-serif; display:flex; align-items:flex-start; justify-content:center; padding:24px;
  }
  .card{
    width:100%; max-width:460px; border:1px solid var(--brass-dim); padding:40px 32px;
    text-align:center; background:var(--ink-soft); margin-top:24px;
  }
  .eyebrow{ font-size:11px; letter-spacing:0.3em; text-transform:uppercase; color:var(--brass); margin-bottom:10px; }
  h1{ font-family:'Cormorant Garamond',serif; font-style:italic; font-weight:600; font-size:26px; margin:0 0 28px; }
  .count{ font-family:'Cormorant Garamond',serif; font-weight:600; font-size:72px; color:var(--brass); line-height:1; }
  .count-label{ font-size:14px; color:var(--parchment-dim); margin-top:8px; }
  .meta{ margin-top:28px; padding-top:20px; border-top:1px solid rgba(201,162,39,0.25); font-size:13px; color:var(--parchment-dim); }
  a.back{ display:inline-block; margin-top:24px; color:var(--brass); font-size:14px; text-decoration:underline; }

  .rsvp-summary{ display:flex; gap:10px; margin-top:20px; }
  .rsvp-stat{ flex:1; background:rgba(201,162,39,0.08); border:1px solid rgba(201,162,39,0.2); padding:14px 8px; }
  .rsvp-stat b{ display:block; font-family:'Cormorant Garamond',serif; font-size:28px; color:var(--brass); }
  .rsvp-stat span{ font-size:12px; color:var(--parchment-dim); }

  .rsvp-list{ list-style:none; margin:20px 0 0; padding:0; text-align:right; max-height:420px; overflow-y:auto; }
  .rsvp-row{ padding:12px 4px; border-bottom:1px solid rgba(201,162,39,0.15); }
  .rsvp-row__top{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .rsvp-name{ font-weight:600; font-size:14.5px; }
  .rsvp-badge{ font-size:11px; padding:3px 9px; border-radius:20px; white-space:nowrap; }
  .rsvp-badge--yes{ background:rgba(127,174,106,0.18); color:var(--good); }
  .rsvp-badge--no{ background:rgba(201,122,90,0.18); color:var(--bad); }
  .rsvp-note{ font-size:12.5px; color:var(--parchment-dim); margin-top:4px; }
  .rsvp-when{ font-size:11px; color:var(--parchment-dim); opacity:0.7; margin-top:4px; }
  .rsvp-empty{ padding:20px 4px; color:var(--parchment-dim); font-size:13.5px; text-align:center; }
</style>
</head>
<body>
  <div class="card">
    <div class="eyebrow">إحصائيات الدعوة</div>
    <h1>${escapeHtml(invitation.brideNameAr)} &amp; ${escapeHtml(invitation.groomNameAr)}</h1>
    <div class="count">${invitation.viewCount}</div>
    <div class="count-label">عدد مرات فتح لينك الدعوة</div>

    <div class="rsvp-summary">
      <div class="rsvp-stat"><b>${rsvpTotal}</b><span>إجمالي الردود</span></div>
      <div class="rsvp-stat"><b>${rsvpYes}</b><span>هيحضروا</span></div>
      <div class="rsvp-stat"><b>${rsvpNo}</b><span>معتذرين</span></div>
    </div>
    <ul class="rsvp-list">${rsvpRowsHtml}</ul>

    <div class="meta">اتعملت الدعوة في: ${escapeHtml(createdAtFormatted)}</div>
    <a class="back" href="/i/${encodeURIComponent(invitation.shortId)}">افتح الدعوة نفسها ←</a>
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
  if (template.isPremium && !req.user) {
    return res.status(401).send('التصميم ده متاح بس للمستخدمين المسجلين — سجل دخول أو اعمل حساب الأول.');
  }

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
    // اتقرر إن المعاينة تفضل بشاشة الغلاف الطبيعية من غير فتح تلقائي
    autoOpen: false,
  };

  const html = renderNewPathHtml(data);
  res.set('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
});

module.exports = router;
