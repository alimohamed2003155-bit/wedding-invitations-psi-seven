// routes/invitations.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const Invitation = require('../models/Invitation');
const { sanitizeText } = require('../utils/sanitize');
const { generateShortId } = require('../utils/idGenerator');
const { buildDisplayFields } = require('../utils/dateFormatter');

const router = express.Router();

const TEMPLATE_PATH = path.join(__dirname, '..', 'views', 'template.html');

// بنقرأ ملف التصميم مرة واحدة ونحتفظ بيه في الميموري (بدل ما نقرا من القرص
// في كل زيارة)، عشان الأداء يبقى أسرع مع آلاف الزيارات.
let templateCache = null;
function getTemplate() {
  if (!templateCache) {
    templateCache = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  }
  return templateCache;
}

const REQUIRED_FIELDS = [
  'brideName', 'groomName', 'brideNameAr', 'groomNameAr',
  'venueName', 'venueCity', 'weddingDateTime',
];

// POST /api/invitations — إنشاء دعوة جديدة
router.post('/api/invitations', async (req, res) => {
  try {
    const body = req.body || {};

    for (const field of REQUIRED_FIELDS) {
      if (!body[field] || String(body[field]).trim() === '') {
        return res.status(400).json({ error: 'من فضلك املأ كل الحقول المطلوبة.' });
      }
    }

    const weddingDateTime = new Date(body.weddingDateTime);
    if (Number.isNaN(weddingDateTime.getTime())) {
      return res.status(400).json({ error: 'تاريخ ووقت الفرح غير صحيح.' });
    }

    const brideName = sanitizeText(body.brideName, 60);
    const groomName = sanitizeText(body.groomName, 60);
    const brideNameAr = sanitizeText(body.brideNameAr, 60);
    const groomNameAr = sanitizeText(body.groomNameAr, 60);
    const venueName = sanitizeText(body.venueName, 100);
    const venueCity = sanitizeText(body.venueCity, 100);
    const venueMapQuery = sanitizeText(body.venueMapQuery, 140) || `${venueName}, ${venueCity}`;

    if (!brideName || !groomName || !brideNameAr || !groomNameAr || !venueName || !venueCity) {
      return res.status(400).json({ error: 'من فضلك تأكد إن كل الحقول متكتوبة بشكل صحيح.' });
    }

    // بنحاول نولّد كود فريد، ولو حصل تعارض نادر جدًا مع كود موجود بالفعل
    // (مستبعد جدًا بس ممكن) بنعيد المحاولة كذا مرة.
    let invitation = null;
    let attempts = 0;
    while (!invitation && attempts < 5) {
      attempts += 1;
      const shortId = generateShortId(7);
      try {
        invitation = await Invitation.create({
          shortId, brideName, groomName, brideNameAr, groomNameAr,
          venueName, venueCity, venueMapQuery, weddingDateTime,
        });
      } catch (err) {
        if (err.code === 11000) continue; // تعارض في الكود — جرب تاني
        throw err;
      }
    }

    if (!invitation) {
      return res.status(500).json({ error: 'حصل خطأ في توليد اللينك، حاول تاني.' });
    }

    return res.status(201).json({ id: invitation.shortId, path: `/i/${invitation.shortId}` });
  } catch (err) {
    console.error('Error creating invitation:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر، حاول تاني بعد شوية.' });
  }
});

// GET /i/:shortId — عرض دعوة معينة
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

    const html = getTemplate().replace(
      '__INVITATION_CONFIG_JSON__',
      JSON.stringify(config)
    );

    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('Error rendering invitation:', err);
    return res.status(500).send('حصل خطأ في السيرفر');
  }
});

module.exports = router;
