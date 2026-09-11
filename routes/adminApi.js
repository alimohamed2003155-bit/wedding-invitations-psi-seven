// routes/adminApi.js
// كل بيانات لوحة التحكم كـ JSON. الواجهة نفسها بقت React
// (client/src/pages/admin)، فالملف ده مالوش أي علاقة بالـ HTML.
//
// كل مسار هنا وراه requireAdminSession — اللي بيتأكد من جلسة الأدمن
// ومن هيدر X-Admin-Request (middleware/adminAuth.js).
const express = require('express');

const Invitation = require('../models/Invitation');
const User = require('../models/User');
const Order = require('../models/Order');
const Rsvp = require('../models/Rsvp');
const Session = require('../models/Session');
const SupportMessage = require('../models/SupportMessage');
const AdminAudit = require('../models/AdminAudit');
const Track = require('../models/Track');
const SiteTotals = require('../models/SiteTotals');
const { cleanupExpiredInvitations, DEFAULT_GRACE_DAYS } = require('../utils/cleanupExpired');
const { TEMPLATES } = require('../templates/registry');
const { getPackage, PACKAGES } = require('../packages/registry');
const { getPaymentSettings, updatePaymentSettings } = require('../utils/paymentSettings');
const { sanitizeText } = require('../utils/sanitize');
const { logAdminAction } = require('../utils/adminAudit');
const { requireAdminSession } = require('../middleware/adminAuth');

const router = express.Router();

// كل الأرباح بتتحسب بالعملتين على حدة — مفيش سعر صرف ثابت نعتمد عليه،
// وجمع جنيه على دولار في رقم واحد بيدي رقم كذّاب.
const CURRENCIES = ['EGP', 'USD'];

/** بيهرّب أي حرف خاص بالـ regex عشان نص البحث يتعامل كنص عادي */
function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** الفترة المطلوبة بالأيام — 7/30/90/365، والافتراضي 30 */
function periodOf(req) {
  const days = parseInt(req.query.period, 10);
  const allowed = [7, 30, 90, 365];
  const period = allowed.includes(days) ? days : 30;
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (period - 1));
  return { period, from };
}

/** بيحوّل نتيجة تجميع يومية لسلسلة كاملة من غير أيام ناقصة */
function fillDailySeries(rows, from, days, valueKeys) {
  const byDay = {};
  rows.forEach((r) => { byDay[r._id] = r; });

  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const row = byDay[key] || {};
    const point = { date: key };
    valueKeys.forEach((k) => { point[k] = row[k] || 0; });
    out.push(point);
  }
  return out;
}

/** تجميع يومي موحّد لأي مجموعة، بالتوقيت المحلي للسيرفر */
function dailyGroup(dateField, extraFields = {}) {
  return {
    $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}` } },
      count: { $sum: 1 },
      ...extraFields,
    },
  };
}

// ==========================================================================
// نظرة عامة — الأرقام الكبيرة + الرسوم البيانية
// ==========================================================================
router.get('/admin/api/overview', requireAdminSession, async (req, res) => {
  try {
    const { period, from } = periodOf(req);

    const [
      totalUsers, premiumUsers, blockedUsers, suspendedSubs,
      totalInvitations, draftInvitations, premiumInvitations,
      viewsAgg, totalRsvps, pendingOrders,
      revenueAll, revenuePeriod,
      usersSeries, invitationsSeries, ordersSeries, rsvpSeries,
      byTemplate, byPackage, byCountry,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ 'subscription.packageId': { $ne: null } }),
      User.countDocuments({ isBlocked: true }),
      User.countDocuments({ 'subscription.status': 'suspended' }),

      Invitation.countDocuments({ status: { $ne: 'draft' } }),
      Invitation.countDocuments({ status: 'draft' }),
      Invitation.countDocuments({ isPremium: true, status: { $ne: 'draft' } }),

      Invitation.aggregate([{ $group: { _id: null, total: { $sum: '$viewCount' } } }]),
      Rsvp.countDocuments({}),
      Order.countDocuments({ status: 'pending' }),

      // الأرباح = الطلبات المفعّلة بس (اللي استلمت فلوسها فعلًا)
      Order.aggregate([
        { $match: { status: 'activated' } },
        { $group: { _id: '$currency', total: { $sum: '$price' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { status: 'activated', activatedAt: { $gte: from } } },
        { $group: { _id: '$currency', total: { $sum: '$price' }, count: { $sum: 1 } } },
      ]),

      User.aggregate([{ $match: { createdAt: { $gte: from } } }, dailyGroup('createdAt')]),
      Invitation.aggregate([
        { $match: { createdAt: { $gte: from }, status: { $ne: 'draft' } } },
        dailyGroup('createdAt', { premium: { $sum: { $cond: ['$isPremium', 1, 0] } } }),
      ]),
      Order.aggregate([
        { $match: { status: 'activated', activatedAt: { $gte: from } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$activatedAt' } },
            count: { $sum: 1 },
            egp: { $sum: { $cond: [{ $eq: ['$currency', 'EGP'] }, '$price', 0] } },
            usd: { $sum: { $cond: [{ $eq: ['$currency', 'USD'] }, '$price', 0] } },
          },
        },
      ]),
      Rsvp.aggregate([
        { $match: { createdAt: { $gte: from } } },
        dailyGroup('createdAt', { yes: { $sum: { $cond: ['$attending', 1, 0] } } }),
      ]),

      Invitation.aggregate([
        { $match: { templateId: { $ne: null }, status: { $ne: 'draft' } } },
        { $group: { _id: '$templateId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Order.aggregate([
        { $match: { status: 'activated' } },
        { $group: { _id: '$packageId', count: { $sum: 1 }, egp: { $sum: { $cond: [{ $eq: ['$currency', 'EGP'] }, '$price', 0] } }, usd: { $sum: { $cond: [{ $eq: ['$currency', 'USD'] }, '$price', 0] } } } },
        { $sort: { count: -1 } },
      ]),
      User.aggregate([
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

    const revenueBy = (rows) => CURRENCIES.reduce((acc, c) => {
      const found = rows.find((r) => r._id === c);
      acc[c] = { total: found ? found.total : 0, orders: found ? found.count : 0 };
      return acc;
    }, {});

    return res.json({
      period,
      from,
      kpis: {
        users: totalUsers,
        premiumUsers,
        blockedUsers,
        suspendedSubs,
        invitations: totalInvitations,
        draftInvitations,
        premiumInvitations,
        views: viewsAgg[0] ? viewsAgg[0].total : 0,
        rsvps: totalRsvps,
        pendingOrders,
      },
      revenue: { all: revenueBy(revenueAll), period: revenueBy(revenuePeriod) },
      series: {
        users: fillDailySeries(usersSeries, from, period, ['count']),
        invitations: fillDailySeries(invitationsSeries, from, period, ['count', 'premium']),
        revenue: fillDailySeries(ordersSeries, from, period, ['count', 'egp', 'usd']),
        rsvps: fillDailySeries(rsvpSeries, from, period, ['count', 'yes']),
      },
      breakdown: {
        templates: byTemplate.map((r) => {
          const tpl = TEMPLATES.find((x) => x.id === r._id);
          return { id: r._id, label: (tpl && (tpl.name.ar || tpl.name.en)) || r._id, count: r.count };
        }),
        packages: byPackage.map((r) => {
          const pkg = getPackage(r._id);
          return {
            id: r._id,
            label: pkg ? (pkg.name.ar || pkg.name.en) : r._id,
            count: r.count, egp: r.egp, usd: r.usd,
          };
        }),
        countries: byCountry.map((r) => ({ id: r._id || '—', count: r.count })),
      },
    });
  } catch (err) {
    console.error('Error building admin overview:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

// ==========================================================================
// العملاء
// ==========================================================================
router.get('/admin/api/users', requireAdminSession, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 100);
    const status = String(req.query.status || 'all');
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const perPage = 25;

    const filter = {};
    if (q) {
      const re = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: re }, { email: re }];
    }
    if (status === 'premium') filter['subscription.packageId'] = { $ne: null };
    if (status === 'free') filter['subscription.packageId'] = null;
    if (status === 'suspended') filter['subscription.status'] = 'suspended';
    if (status === 'blocked') filter.isBlocked = true;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .select('name email country subscription isBlocked createdAt')
        .lean(),
      User.countDocuments(filter),
    ]);

    const ids = users.map((u) => u._id);
    const invCounts = await Invitation.aggregate([
      { $match: { ownerId: { $in: ids } } },
      {
        $group: {
          _id: '$ownerId',
          total: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 0, 1] } },
          premium: { $sum: { $cond: ['$isPremium', 1, 0] } },
          drafts: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
        },
      },
    ]);
    const byUser = invCounts.reduce((acc, r) => { acc[String(r._id)] = r; return acc; }, {});

    return res.json({
      page,
      perPage,
      total,
      pages: Math.max(1, Math.ceil(total / perPage)),
      users: users.map((u) => {
        const sub = u.subscription || {};
        const pkg = sub.packageId ? getPackage(sub.packageId) : null;
        const counts = byUser[String(u._id)] || { total: 0, premium: 0, drafts: 0 };
        return {
          id: String(u._id),
          name: u.name,
          email: u.email,
          country: u.country,
          isPremium: !!sub.packageId,
          isSuspended: sub.status === 'suspended',
          isBlocked: !!u.isBlocked,
          packageId: sub.packageId || null,
          packageName: pkg ? (pkg.name.ar || pkg.name.en) : null,
          invitationsLeft: sub.invitationsLeft || 0,
          activatedAt: sub.activatedAt || null,
          invitations: counts.total,
          premiumInvitations: counts.premium,
          drafts: counts.drafts,
          createdAt: u.createdAt,
        };
      }),
    });
  } catch (err) {
    console.error('Error listing users:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

// ملف العميل الكامل — كل حاجة عنه في طلب واحد
router.get('/admin/api/users/:id', requireAdminSession, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash').lean();
    if (!user) return res.status(404).json({ error: 'العميل ده مش موجود.' });

    const [invitations, orders, supportCount, sessions] = await Promise.all([
      Invitation.find({ ownerId: user._id })
        .sort({ createdAt: -1 }).limit(50)
        .select('shortId templateId brideNameAr groomNameAr weddingDateTime viewCount isPremium status createdAt')
        .lean(),
      Order.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50).lean(),
      SupportMessage.countDocuments({ userId: user._id }),
      Session.countDocuments({ userId: user._id, expiresAt: { $gt: new Date() } }),
    ]);

    const shortIds = invitations.map((i) => i.shortId);
    const rsvps = shortIds.length
      ? await Rsvp.aggregate([
        { $match: { shortId: { $in: shortIds } } },
        { $group: { _id: null, total: { $sum: 1 }, yes: { $sum: { $cond: ['$attending', 1, 0] } } } },
      ])
      : [];

    const sub = user.subscription || {};
    const pkg = sub.packageId ? getPackage(sub.packageId) : null;

    // إجمالي اللي دفعه فعلًا
    const paid = {};
    CURRENCIES.forEach((c) => {
      paid[c] = orders
        .filter((o) => o.status === 'activated' && o.currency === c)
        .reduce((sum, o) => sum + (o.price || 0), 0);
    });

    return res.json({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        country: user.country,
        createdAt: user.createdAt,
        isBlocked: !!user.isBlocked,
        blockedAt: user.blockedAt || null,
        activeSessions: sessions,
        subscription: {
          packageId: sub.packageId || null,
          packageName: pkg ? (pkg.name.ar || pkg.name.en) : null,
          invitationsLeft: sub.invitationsLeft || 0,
          activatedAt: sub.activatedAt || null,
          status: sub.packageId ? (sub.status || 'active') : 'none',
          suspendedAt: sub.suspendedAt || null,
          adminNote: sub.adminNote || '',
        },
      },
      totals: {
        invitations: invitations.filter((i) => i.status !== 'draft').length,
        drafts: invitations.filter((i) => i.status === 'draft').length,
        views: invitations.reduce((s, i) => s + (i.viewCount || 0), 0),
        rsvps: rsvps[0] ? rsvps[0].total : 0,
        rsvpYes: rsvps[0] ? rsvps[0].yes : 0,
        supportMessages: supportCount,
        paid,
      },
      invitations: invitations.map((i) => ({
        shortId: i.shortId,
        templateId: i.templateId,
        names: `${i.brideNameAr || ''} & ${i.groomNameAr || ''}`.trim(),
        weddingDate: i.weddingDateTime,
        views: i.viewCount || 0,
        isPremium: !!i.isPremium,
        isDraft: i.status === 'draft',
        createdAt: i.createdAt,
      })),
      orders: orders.map((o) => {
        const p = getPackage(o.packageId);
        return {
          id: String(o._id),
          packageId: o.packageId,
          packageName: p ? (p.name.ar || p.name.en) : o.packageId,
          price: o.price,
          currency: o.currency,
          status: o.status,
          paymentProofUrl: o.paymentProofUrl || null,
          createdAt: o.createdAt,
          activatedAt: o.activatedAt || null,
        };
      }),
    });
  } catch (err) {
    console.error('Error loading user profile:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

// التحكم في اشتراك العميل: إيقاف / تشغيل / إلغاء / تعديل الرصيد / منح باقة
router.patch('/admin/api/users/:id/subscription', requireAdminSession, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'العميل ده مش موجود.' });

    const action = String((req.body || {}).action || '');
    const sub = user.subscription || {};
    const before = {
      packageId: sub.packageId || null,
      invitationsLeft: sub.invitationsLeft || 0,
      status: sub.status || 'active',
    };

    if (action === 'suspend') {
      if (!sub.packageId) return res.status(400).json({ error: 'العميل ده مش مشترك أصلًا.' });
      user.subscription.status = 'suspended';
      user.subscription.suspendedAt = new Date();
    } else if (action === 'resume') {
      user.subscription.status = 'active';
      user.subscription.suspendedAt = null;
    } else if (action === 'cancel') {
      // إلغاء كامل — الرصيد بيروح والباقة بتتشال
      user.subscription = {
        packageId: null, invitationsLeft: 0, activatedAt: null,
        status: 'active', suspendedAt: null, adminNote: sub.adminNote || '',
      };
    } else if (action === 'grant') {
      const pkg = getPackage(String((req.body || {}).packageId || ''));
      if (!pkg) return res.status(400).json({ error: 'الباقة دي مش موجودة.' });
      user.subscription.packageId = pkg.id;
      user.subscription.invitationsLeft = (sub.invitationsLeft || 0) + pkg.invitations;
      user.subscription.activatedAt = new Date();
      user.subscription.status = 'active';
      user.subscription.suspendedAt = null;
    } else if (action === 'setCredits') {
      const credits = parseInt((req.body || {}).invitationsLeft, 10);
      if (Number.isNaN(credits) || credits < 0 || credits > 10000) {
        return res.status(400).json({ error: 'الرصيد لازم يكون رقم بين 0 و 10000.' });
      }
      user.subscription.invitationsLeft = credits;
    } else if (action === 'note') {
      user.subscription.adminNote = sanitizeText((req.body || {}).adminNote, 500);
    } else {
      return res.status(400).json({ error: 'الإجراء ده مش معروف.' });
    }

    user.markModified('subscription');
    await user.save();

    logAdminAction(req, `subscription.${action}`, {
      type: 'user', id: user._id, label: user.email,
    }, {
      before,
      after: {
        packageId: user.subscription.packageId,
        invitationsLeft: user.subscription.invitationsLeft,
        status: user.subscription.status,
      },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Error updating subscription:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

// حظر / رفع الحظر عن الحساب كله
router.patch('/admin/api/users/:id/block', requireAdminSession, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'العميل ده مش موجود.' });

    const blocked = !!(req.body || {}).blocked;
    user.isBlocked = blocked;
    user.blockedAt = blocked ? new Date() : null;
    await user.save();

    // الحظر لازم يشتغل فورًا: بنلغي كل جلساته المفتوحة، مش بس نمنع الدخول
    // الجديد — غير كده هيفضل داخل من التاب المفتوح لحد ما الكوكي تنتهي.
    let killedSessions = 0;
    if (blocked) {
      const result = await Session.deleteMany({ userId: user._id });
      killedSessions = result.deletedCount || 0;
    }

    logAdminAction(req, blocked ? 'user.block' : 'user.unblock', {
      type: 'user', id: user._id, label: user.email,
    }, { killedSessions });

    return res.json({ ok: true, killedSessions });
  } catch (err) {
    console.error('Error blocking user:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

// ==========================================================================
// الطلبات
// ==========================================================================
router.get('/admin/api/orders', requireAdminSession, async (req, res) => {
  try {
    const status = String(req.query.status || 'pending');
    const filter = ['pending', 'activated', 'cancelled'].includes(status) ? { status } : {};

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    const userIds = [...new Set(orders.map((o) => String(o.userId)))];
    const users = await User.find({ _id: { $in: userIds } }).select('name email country').lean();
    const byId = users.reduce((acc, u) => { acc[String(u._id)] = u; return acc; }, {});

    return res.json({
      orders: orders.map((o) => {
        const u = byId[String(o.userId)] || {};
        const pkg = getPackage(o.packageId);
        return {
          id: String(o._id),
          userId: String(o.userId),
          packageId: o.packageId,
          packageName: pkg ? (pkg.name.ar || pkg.name.en) : o.packageId,
          invitations: pkg ? pkg.invitations : 0,
          price: o.price,
          currency: o.currency,
          status: o.status,
          createdAt: o.createdAt,
          activatedAt: o.activatedAt || null,
          paymentProofUrl: o.paymentProofUrl || null,
          paymentProofAt: o.paymentProofAt || null,
          user: { name: u.name || '—', email: u.email || '—', country: u.country || '—' },
        };
      }),
    });
  } catch (err) {
    console.error('Error listing orders:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

router.post('/admin/api/orders/:id/activate', requireAdminSession, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'الطلب ده مش موجود.' });
    if (order.status !== 'pending') {
      return res.status(409).json({ error: 'الطلب ده متفعّل أو ملغي بالفعل.' });
    }

    const pkg = getPackage(order.packageId);
    if (!pkg) return res.status(400).json({ error: 'الباقة دي مش موجودة.' });

    const user = await User.findById(order.userId);
    if (!user) return res.status(404).json({ error: 'المستخدم ده مش موجود.' });

    // الرصيد بيتجمع مش بيتستبدل — لو اشترى باقة تانية، الدعوات بتتضاف
    const current = (user.subscription && user.subscription.invitationsLeft) || 0;
    user.subscription = {
      packageId: pkg.id,
      invitationsLeft: current + pkg.invitations,
      activatedAt: new Date(),
      status: 'active',
      suspendedAt: null,
      adminNote: (user.subscription && user.subscription.adminNote) || '',
    };
    await user.save();

    order.status = 'activated';
    order.activatedAt = new Date();
    await order.save();

    logAdminAction(req, 'order.activate', {
      type: 'order', id: order._id, label: user.email,
    }, { packageId: pkg.id, price: order.price, currency: order.currency, creditsAfter: user.subscription.invitationsLeft });

    return res.json({ ok: true, invitationsLeft: user.subscription.invitationsLeft });
  } catch (err) {
    console.error('Error activating order:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

// إلغاء طلب — سواء كان لسه معلّق أو **متفعّل ومدفوع**.
// لو كان متفعّل، بنسحب الرصيد اللي اتضاف منه كمان، وإلا يبقى الإلغاء
// على الورق بس والعميل ماشي بالباقة.
router.post('/admin/api/orders/:id/cancel', requireAdminSession, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'الطلب ده مش موجود.' });
    if (order.status === 'cancelled') {
      return res.status(409).json({ error: 'الطلب ده ملغي بالفعل.' });
    }

    const wasActivated = order.status === 'activated';
    let creditsRemoved = 0;

    if (wasActivated) {
      const pkg = getPackage(order.packageId);
      const user = await User.findById(order.userId);
      if (user && pkg) {
        const current = (user.subscription && user.subscription.invitationsLeft) || 0;
        // بنسحب بقدر الباقة، وبحد أدنى صفر — لو كان استهلك منها فعلاً،
        // اللي اتستهلك مش هيرجع (الدعوات اتعملت خلاص)
        creditsRemoved = Math.min(current, pkg.invitations);
        user.subscription.invitationsLeft = current - creditsRemoved;

        // مالهوش طلبات مفعّلة تانية؟ يبقى مفيش باقة أصلاً
        const otherActive = await Order.countDocuments({
          userId: user._id, status: 'activated', _id: { $ne: order._id },
        });
        if (otherActive === 0) {
          user.subscription.packageId = null;
          user.subscription.activatedAt = null;
        }
        user.markModified('subscription');
        await user.save();
      }
    }

    order.status = 'cancelled';
    await order.save();

    logAdminAction(req, wasActivated ? 'order.revoke' : 'order.cancel', {
      type: 'order', id: order._id,
    }, {
      packageId: order.packageId, price: order.price, currency: order.currency,
      wasActivated, creditsRemoved,
    });

    return res.json({ ok: true, wasActivated, creditsRemoved });
  } catch (err) {
    console.error('Error cancelling order:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

// ==========================================================================
// الدعوات
// ==========================================================================
router.get('/admin/api/invitations', requireAdminSession, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 100);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const perPage = 25;

    const filter = {};
    if (q) {
      const re = new RegExp(escapeRegex(q), 'i');
      filter.$or = [
        { shortId: re }, { brideName: re }, { groomName: re },
        { brideNameAr: re }, { groomNameAr: re }, { venueName: re },
      ];
    }

    const [invitations, total] = await Promise.all([
      Invitation.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .select('shortId templateId brideNameAr groomNameAr brideName groomName venueName weddingDateTime viewCount isPremium status ownerId createdAt')
        .lean(),
      Invitation.countDocuments(filter),
    ]);

    const ownerIds = [...new Set(invitations.map((i) => i.ownerId).filter(Boolean).map(String))];
    const owners = await User.find({ _id: { $in: ownerIds } }).select('name email').lean();
    const byOwner = owners.reduce((acc, u) => { acc[String(u._id)] = u; return acc; }, {});

    return res.json({
      page, perPage, total, pages: Math.max(1, Math.ceil(total / perPage)),
      invitations: invitations.map((i) => {
        const tpl = TEMPLATES.find((x) => x.id === i.templateId);
        const owner = i.ownerId ? byOwner[String(i.ownerId)] : null;
        return {
          shortId: i.shortId,
          templateName: tpl ? (tpl.name.ar || tpl.name.en) : (i.templateId || 'تصميم قديم'),
          namesAr: `${i.brideNameAr || ''} & ${i.groomNameAr || ''}`.trim(),
          namesEn: `${i.brideName || ''} & ${i.groomName || ''}`.trim(),
          venueName: i.venueName,
          weddingDate: i.weddingDateTime,
          views: i.viewCount || 0,
          isPremium: !!i.isPremium,
          isDraft: i.status === 'draft',
          owner: owner ? { id: String(i.ownerId), name: owner.name, email: owner.email } : null,
          createdAt: i.createdAt,
        };
      }),
    });
  } catch (err) {
    console.error('Error listing invitations:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

// ==========================================================================
// الدعم
// ==========================================================================
router.get('/admin/api/support', requireAdminSession, async (req, res) => {
  try {
    const threads = await SupportMessage.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$userId',
          lastMessage: { $first: '$body' },
          lastFrom: { $first: '$from' },
          lastAt: { $first: '$createdAt' },
          unread: { $sum: { $cond: [{ $and: [{ $eq: ['$from', 'user'] }, { $eq: ['$readByAdmin', false] }] }, 1, 0] } },
        },
      },
      { $sort: { lastAt: -1 } },
      { $limit: 100 },
    ]);

    const users = await User.find({ _id: { $in: threads.map((t) => t._id) } })
      .select('name email subscription isBlocked')
      .lean();
    const byId = users.reduce((acc, u) => { acc[String(u._id)] = u; return acc; }, {});

    return res.json({
      threads: threads.map((t) => {
        const u = byId[String(t._id)] || {};
        return {
          userId: String(t._id),
          name: u.name || '—',
          email: u.email || '—',
          isPremium: !!(u.subscription && u.subscription.packageId),
          isBlocked: !!u.isBlocked,
          lastMessage: t.lastMessage,
          lastFrom: t.lastFrom,
          lastAt: t.lastAt,
          unread: t.unread,
        };
      }),
    });
  } catch (err) {
    console.error('Error listing support threads:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

router.get('/admin/api/support/:userId', requireAdminSession, async (req, res) => {
  try {
    const messages = await SupportMessage.find({ userId: req.params.userId })
      .sort({ createdAt: 1 }).limit(200).lean();

    await SupportMessage.updateMany(
      { userId: req.params.userId, from: 'user', readByAdmin: false },
      { $set: { readByAdmin: true } }
    );

    return res.json({
      messages: messages.map((m) => ({
        id: String(m._id), from: m.from, body: m.body, createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    console.error('Error loading support thread:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

router.post('/admin/api/support/:userId', requireAdminSession, async (req, res) => {
  try {
    const body = sanitizeText(req.body && req.body.body, 2000);
    if (!body) return res.status(400).json({ error: 'اكتب الرد الأول.' });

    const msg = await SupportMessage.create({
      userId: req.params.userId, from: 'admin', body, readByAdmin: true,
    });

    return res.status(201).json({
      message: { id: String(msg._id), from: 'admin', body: msg.body, createdAt: msg.createdAt },
    });
  } catch (err) {
    console.error('Error replying to support thread:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

// ==========================================================================
// بيانات الدفع
// ==========================================================================
router.get('/admin/api/payment-settings', requireAdminSession, async (req, res) => {
  try {
    const doc = await getPaymentSettings();
    return res.json({
      vodafone: doc.vodafone || {},
      bank: doc.bank || {},
      whatsapp: doc.whatsapp || '',
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.error('Error loading payment settings:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

router.put('/admin/api/payment-settings', requireAdminSession, async (req, res) => {
  try {
    const doc = await updatePaymentSettings(req.body);
    logAdminAction(req, 'settings.payment', { type: 'settings', id: 'default' });
    return res.json({ ok: true, updatedAt: doc.updatedAt });
  } catch (err) {
    console.error('Error saving payment settings:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

// ==========================================================================
// الباقات المتاحة (للوحة عشان تعرف تمنح باقة يدويًا)
// ==========================================================================
router.get('/admin/api/packages', requireAdminSession, (req, res) => {
  res.json({
    packages: PACKAGES.map((p) => ({
      id: p.id,
      name: p.name.ar || p.name.en,
      invitations: p.invitations,
      priceEGP: p.price.EGP,
      priceUSD: p.price.USD,
    })),
  });
});

// ==========================================================================
// مكتبة الموسيقى — إنت بترفع الأغاني، والعملاء بيدوّروا فيها
// ==========================================================================
router.get('/admin/api/tracks', requireAdminSession, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 80);
    const filter = q
      ? { $or: ['title', 'artist', 'mood'].map((f) => ({ [f]: new RegExp(escapeRegex(q), 'i') })) }
      : {};
    const tracks = await Track.find(filter).sort({ createdAt: -1 }).limit(300).lean();
    return res.json({
      tracks: tracks.map((t) => ({
        id: String(t._id),
        title: t.title,
        artist: t.artist,
        mood: t.mood,
        url: t.url,
        duration: t.duration || 0,
        active: t.active !== false,
        createdAt: t.createdAt,
      })),
    });
  } catch (err) {
    console.error('Error listing tracks:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

// الملف نفسه بيترفع بـ POST /admin/api/tracks/upload (routes/uploads.js
// بيتحقق منه بنفس فحص الصوت العادي)، وده بيسجّل بياناته
router.post('/admin/api/tracks', requireAdminSession, async (req, res) => {
  try {
    const body = req.body || {};
    const title = sanitizeText(body.title, 120);
    const url = String(body.url || '');
    if (!title) return res.status(400).json({ error: 'اكتب اسم الأغنية.' });
    if (!/^https:\/\/res\.cloudinary\.com\//.test(url)) {
      return res.status(400).json({ error: 'رابط الملف مش مقبول.' });
    }

    const track = await Track.create({
      title,
      artist: sanitizeText(body.artist, 120),
      mood: sanitizeText(body.mood, 60),
      url,
      publicId: String(body.publicId || '').slice(0, 300),
      duration: Math.max(0, Math.min(36000, Number(body.duration) || 0)),
    });

    logAdminAction(req, 'track.add', { type: 'track', id: track._id, label: title });
    return res.status(201).json({ ok: true, id: String(track._id) });
  } catch (err) {
    console.error('Error adding track:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

router.patch('/admin/api/tracks/:id', requireAdminSession, async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) return res.status(404).json({ error: 'الأغنية دي مش موجودة.' });
    const body = req.body || {};
    if (body.title !== undefined) track.title = sanitizeText(body.title, 120) || track.title;
    if (body.artist !== undefined) track.artist = sanitizeText(body.artist, 120);
    if (body.mood !== undefined) track.mood = sanitizeText(body.mood, 60);
    if (body.active !== undefined) track.active = !!body.active;
    await track.save();
    logAdminAction(req, 'track.update', { type: 'track', id: track._id, label: track.title });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error updating track:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

// المسح بيشيلها من المكتبة بس. الدعوات اللي اختارتها بتفضل شغالة —
// الرابط متخزّن جوه الدعوة نفسها، مش مربوط بالسجل ده.
router.delete('/admin/api/tracks/:id', requireAdminSession, async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) return res.status(404).json({ error: 'الأغنية دي مش موجودة.' });
    await Track.deleteOne({ _id: track._id });
    logAdminAction(req, 'track.delete', { type: 'track', id: track._id, label: track.title });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting track:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

// ==========================================================================
// تنضيف الدعوات المنتهية
// ==========================================================================

// GET — معاينة بس: بيقولك هيتمسح إيه من غير ما يمسح أي حاجة
router.get('/admin/api/cleanup/preview', requireAdminSession, async (req, res) => {
  try {
    const graceDays = Math.max(0, Math.min(365, parseInt(req.query.graceDays, 10) || DEFAULT_GRACE_DAYS));
    const summary = await cleanupExpiredInvitations({ graceDays, dryRun: true, limit: 5000 });
    const totals = await SiteTotals.findOne({ key: 'default' }).lean();
    return res.json({
      ...summary,
      archived: totals ? {
        invitations: totals.archivedInvitations || 0,
        views: totals.archivedViews || 0,
        lastCleanupAt: totals.lastCleanupAt || null,
        lastCleanupDeleted: totals.lastCleanupDeleted || 0,
      } : null,
    });
  } catch (err) {
    console.error('Cleanup preview failed:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

// POST — التنفيذ الفعلي. بيطلب تأكيد نصي صريح في الجسم عشان طلب
// بالغلط (أو ضغطة زرار غلط) ماينفّذش مسح.
router.post('/admin/api/cleanup/run', requireAdminSession, async (req, res) => {
  try {
    const body = req.body || {};
    if (body.confirm !== 'DELETE') {
      return res.status(400).json({ error: 'محتاج تأكيد صريح.' });
    }
    const graceDays = Math.max(0, Math.min(365, parseInt(body.graceDays, 10) || DEFAULT_GRACE_DAYS));
    const limit = Math.max(1, Math.min(5000, parseInt(body.limit, 10) || 1000));

    const summary = await cleanupExpiredInvitations({ graceDays, dryRun: false, limit });

    logAdminAction(req, 'cleanup.run', { type: 'invitation', id: 'batch' }, {
      graceDays, deleted: summary.deleted, views: summary.views, rsvps: summary.rsvps,
    });

    return res.json(summary);
  } catch (err) {
    console.error('Cleanup run failed:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

// ==========================================================================
// سجل الإجراءات
// ==========================================================================
router.get('/admin/api/audit', requireAdminSession, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const perPage = 50;
    const [entries, total] = await Promise.all([
      AdminAudit.find({}).sort({ createdAt: -1 })
        .skip((page - 1) * perPage).limit(perPage).lean(),
      AdminAudit.countDocuments({}),
    ]);

    return res.json({
      page, perPage, total, pages: Math.max(1, Math.ceil(total / perPage)),
      entries: entries.map((e) => ({
        id: String(e._id),
        action: e.action,
        targetType: e.targetType,
        targetId: e.targetId,
        targetLabel: e.targetLabel,
        meta: e.meta || {},
        ip: e.ip,
        createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    console.error('Error loading audit log:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر' });
  }
});

module.exports = router;
