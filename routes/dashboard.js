// routes/dashboard.js
// لوحة العميل: دعواته، إحصائياتها، ردود الحضور اللي وصلته، حالة اشتراكه،
// ومحادثة الدعم. كل حاجة هنا محصورة على بيانات صاحب الحساب نفسه بس.
const express = require('express');

const Invitation = require('../models/Invitation');
const Rsvp = require('../models/Rsvp');
const SupportMessage = require('../models/SupportMessage');
const { requireAuth } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');
const { getPackage } = require('../packages/registry');

const router = express.Router();

// GET /api/dashboard — ملخص كامل للعميل
router.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const invitations = await Invitation.find({ ownerId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('shortId templateId brideNameAr groomNameAr brideName groomName weddingDateTime viewCount isPremium status createdAt')
      .lean();

    const shortIds = invitations.map((i) => i.shortId);

    // عدد ردود الحضور لكل دعوة (استعلام واحد بدل استعلام لكل دعوة)
    const rsvpCounts = await Rsvp.aggregate([
      { $match: { shortId: { $in: shortIds } } },
      { $group: { _id: { shortId: '$shortId', attending: '$attending' }, count: { $sum: 1 } } },
    ]);

    const countsByShortId = {};
    rsvpCounts.forEach((row) => {
      const id = row._id.shortId;
      if (!countsByShortId[id]) countsByShortId[id] = { yes: 0, no: 0 };
      if (row._id.attending) countsByShortId[id].yes = row.count;
      else countsByShortId[id].no = row.count;
    });

    const sub = req.user.subscription || {};
    const pkg = sub.packageId ? getPackage(sub.packageId) : null;

    const totals = invitations.reduce(
      (acc, inv) => {
        acc.views += inv.viewCount || 0;
        const c = countsByShortId[inv.shortId] || { yes: 0, no: 0 };
        acc.rsvpYes += c.yes;
        acc.rsvpNo += c.no;
        return acc;
      },
      { views: 0, rsvpYes: 0, rsvpNo: 0 }
    );

    const unreadSupport = await SupportMessage.countDocuments({
      userId: req.user.id,
      from: 'admin',
      readByUser: false,
    });

    return res.json({
      user: { name: req.user.name, email: req.user.email, country: req.user.country },
      subscription: {
        packageId: sub.packageId || null,
        packageName: pkg ? pkg.name : null,
        features: pkg ? pkg.features : [],
        invitationsLeft: sub.invitationsLeft || 0,
        activatedAt: sub.activatedAt || null,
      },
      totals: { invitations: invitations.length, ...totals },
      unreadSupport,
      invitations: invitations.map((inv) => ({
        shortId: inv.shortId,
        templateId: inv.templateId,
        names: {
          ar: `${inv.brideNameAr || ''} & ${inv.groomNameAr || ''}`.trim(),
          en: `${inv.brideName || ''} & ${inv.groomName || ''}`.trim(),
        },
        weddingDate: inv.weddingDateTime,
        views: inv.viewCount || 0,
        rsvp: countsByShortId[inv.shortId] || { yes: 0, no: 0 },
        isPremium: !!inv.isPremium,
        // 'draft' = لسه متنشرتش (الدعوات القديمة مفيهاش الحقل ده أصلًا،
        // فبتتحسب منشورة زي ما هي بالظبط)
        isDraft: inv.status === 'draft',
        createdAt: inv.createdAt,
        url: `/i/${inv.shortId}`,
      })),
    });
  } catch (err) {
    console.error('Error loading dashboard:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر.' });
  }
});

// GET /api/dashboard/rsvps/:shortId — ردود الحضور بالتفصيل لدعوة واحدة
router.get('/api/dashboard/rsvps/:shortId', requireAuth, async (req, res) => {
  try {
    // بنتأكد إن الدعوة دي بتاعته فعلاً قبل ما نرجّع أي بيانات ضيوف
    const owns = await Invitation.exists({ shortId: req.params.shortId, ownerId: req.user.id });
    if (!owns) return res.status(404).json({ error: 'الدعوة دي مش موجودة.' });

    const rsvps = await Rsvp.find({ shortId: req.params.shortId })
      .sort({ createdAt: -1 })
      .limit(500)
      .select('guestName attending note createdAt')
      .lean();

    return res.json({ rsvps });
  } catch (err) {
    console.error('Error loading rsvps:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر.' });
  }
});

// ===== الدعم =====

// GET /api/dashboard/support — محادثة العميل
router.get('/api/dashboard/support', requireAuth, async (req, res) => {
  try {
    const messages = await SupportMessage.find({ userId: req.user.id })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    // أي رسالة من الأدمن بيتعلّم عليها مقروءة بمجرد ما يفتح المحادثة
    await SupportMessage.updateMany(
      { userId: req.user.id, from: 'admin', readByUser: false },
      { $set: { readByUser: true } }
    );

    return res.json({
      messages: messages.map((m) => ({
        id: String(m._id),
        from: m.from,
        body: m.body,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    console.error('Error loading support thread:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر.' });
  }
});

// POST /api/dashboard/support — العميل يبعت رسالة
router.post('/api/dashboard/support', requireAuth, async (req, res) => {
  try {
    const body = sanitizeText(req.body && req.body.body, 2000);
    if (!body) return res.status(400).json({ error: 'اكتب رسالتك الأول.' });

    const msg = await SupportMessage.create({
      userId: req.user.id,
      from: 'user',
      body,
      readByUser: true,
    });

    return res.status(201).json({
      message: { id: String(msg._id), from: 'user', body: msg.body, createdAt: msg.createdAt },
    });
  } catch (err) {
    console.error('Error sending support message:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر.' });
  }
});

module.exports = router;
