// utils/cleanupExpired.js
// تنضيف الدعوات المجانية اللي عدى على معادها فترة محددة.
//
// القواعد (متعمدة وضيقة):
//   1) المجانية بس — أي دعوة مميزة (العميل دفع فيها) عمرها ما تتمسح.
//   2) اللي ليها مالك مسجّل بتتستنى كمان — حتى لو مجانية، دي في
//      لوحة تحكمه وبيشوفها.
//   3) لازم يكون عدى على معاد الفرح المدة المحددة (يومين افتراضيًا).
//   4) لازم يكون ليها تاريخ فرح أصلاً — أي دعوة من غير تاريخ بتتستنى.
//
// وقبل أي مسح، أرقامها بتتضاف في SiteTotals عشان العداد اللي بيبان
// للزوار مايقلّش (models/SiteTotals.js).

const Invitation = require('../models/Invitation');
const Rsvp = require('../models/Rsvp');
const SiteTotals = require('../models/SiteTotals');

const DEFAULT_GRACE_DAYS = 2;

/** شرط الدعوات المرشحة للمسح */
function buildFilter(graceDays) {
  const cutoff = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000);
  return {
    isPremium: { $ne: true },     // المدفوعة عمرها ما تتمسح
    ownerId: null,                // ولا اللي ليها حساب
    weddingDateTime: { $ne: null, $lt: cutoff },
  };
}

/**
 * @param {{graceDays?: number, dryRun?: boolean, limit?: number}} options
 *   dryRun: بيحسب من غير ما يمسح — ده الوضع الافتراضي عن قصد.
 *   limit: أقصى عدد يتمسح في المرة الواحدة (عشان مانقفلش القاعدة).
 */
async function cleanupExpiredInvitations(options = {}) {
  const graceDays = Number.isFinite(options.graceDays) ? options.graceDays : DEFAULT_GRACE_DAYS;
  const dryRun = options.dryRun !== false;   // لازم تقول صراحةً إنك عايز تمسح
  const limit = Math.max(1, Math.min(5000, options.limit || 1000));

  const filter = buildFilter(graceDays);

  const doomed = await Invitation.find(filter)
    .sort({ weddingDateTime: 1 })   // الأقدم الأول
    .limit(limit)
    .select('shortId viewCount creatorDeviceId weddingDateTime')
    .lean();

  const totalMatching = await Invitation.countDocuments(filter);

  if (!doomed.length) {
    return {
      dryRun, graceDays, totalMatching: 0, selected: 0,
      views: 0, rsvps: 0, creatorsGone: 0, deleted: 0,
    };
  }

  const ids = doomed.map((d) => d._id);
  const shortIds = doomed.map((d) => d.shortId);
  const views = doomed.reduce((sum, d) => sum + (d.viewCount || 0), 0);

  const rsvps = await Rsvp.countDocuments({ shortId: { $in: shortIds } });

  // أجهزة هتختفي خالص: عملت دعوات كلها في قايمة المسح دي.
  // بنعدّها عشان رقم "المستخدمين" في الإحصائيات مايقلّش.
  const devices = [...new Set(doomed.map((d) => d.creatorDeviceId).filter(Boolean))];
  let creatorsGone = 0;
  if (devices.length) {
    const stillThere = await Invitation.distinct('creatorDeviceId', {
      creatorDeviceId: { $in: devices },
      _id: { $nin: ids },
    });
    creatorsGone = devices.length - stillThere.length;
  }

  const summary = {
    dryRun, graceDays, totalMatching, selected: doomed.length,
    views, rsvps, creatorsGone, deleted: 0,
    oldest: doomed[0] ? doomed[0].weddingDateTime : null,
    newest: doomed[doomed.length - 1] ? doomed[doomed.length - 1].weddingDateTime : null,
  };

  if (dryRun) return summary;

  // الترتيب مهم: بنحفظ الأرقام **قبل** المسح. لو المسح وقع في النص،
  // الأسوأ إن العداد يبقى أكبر من الحقيقة — وده أأمن بكتير من إن
  // الدعوات تروح والعداد ينزل قدام الزوار.
  await SiteTotals.updateOne(
    { key: 'default' },
    {
      $inc: {
        archivedInvitations: doomed.length,
        archivedViews: views,
        archivedCreators: creatorsGone,
        archivedRsvps: rsvps,
      },
      $set: { lastCleanupAt: new Date(), lastCleanupDeleted: doomed.length },
    },
    { upsert: true }
  );

  await Rsvp.deleteMany({ shortId: { $in: shortIds } });
  const res = await Invitation.deleteMany({ _id: { $in: ids } });
  summary.deleted = res.deletedCount || 0;

  return summary;
}

module.exports = { cleanupExpiredInvitations, buildFilter, DEFAULT_GRACE_DAYS };
