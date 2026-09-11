// scripts/cleanup-expired.js
// تنضيف الدعوات المجانية اللي عدى على معادها فترة محددة.
//
// الافتراضي **معاينة** — مبيمسحش أي حاجة إلا لو طلبت كده صراحةً
// بتأكيدين مع بعض. ده مقصود: السكريبت ده بيشتغل على قاعدة فيها
// عشرات الآلاف من الدعوات الحقيقية.
//
// الاستخدام:
//   npm run cleanup                              معاينة على القاعدة اللي في .env
//   npm run cleanup -- --env .env.production.local     معاينة على الإنتاج
//   npm run cleanup -- --days 2 --sample 10      معاينة بتفاصيل أكتر
//   npm run cleanup -- --apply --yes-i-am-sure   مسح فعلي (دفعة 1000)
//
// رابط قاعدة الإنتاج بيتحط في ملف مستقل (.env.production.local)
// مش في سطر الأوامر — عشان مايتسجّلش في تاريخ الأوامر.

const path = require('path');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

// لازم يتحمّل قبل أي ملف بيقرا process.env
const envFile = arg('--env', '.env');
require('dotenv').config({ path: path.join(__dirname, '..', envFile) });

const connectDB = require('../config/db');
const Invitation = require('../models/Invitation');
const SiteTotals = require('../models/SiteTotals');
const { cleanupExpiredInvitations, buildFilter, DEFAULT_GRACE_DAYS } = require('../utils/cleanupExpired');

const apply = process.argv.includes('--apply');
const sure = process.argv.includes('--yes-i-am-sure');
const graceDays = parseInt(arg('--days', DEFAULT_GRACE_DAYS), 10);
const limit = parseInt(arg('--limit', 1000), 10);
const sample = parseInt(arg('--sample', 5), 10);

/** بيوري اسم القاعدة والسيرفر من غير اليوزر والباسورد */
function describeUri(uri) {
  if (!uri) return '(مفيش MONGODB_URI في ' + envFile + ')';
  try {
    const noCreds = uri.replace(/\/\/[^@]+@/, '//***:***@');
    const dbName = (uri.split('/').pop() || '').split('?')[0];
    const host = (noCreds.match(/@([^/?]+)/) || [])[1] || '?';
    return `${dbName || '(بدون اسم)'}  @  ${host}`;
  } catch { return '(رابط غير مفهوم)'; }
}

const n = (x) => Number(x || 0).toLocaleString('en-US');
const pad = (label) => (label + ' '.repeat(24)).slice(0, 24);

(async () => {
  console.log('\n' + '='.repeat(58));
  console.log('  تنضيف الدعوات المنتهية');
  console.log('='.repeat(58));
  console.log('  ملف البيئة:   ' + envFile);
  console.log('  القاعدة:      ' + describeUri(process.env.MONGODB_URI));
  console.log('  الوضع:        ' + (apply && sure ? '⚠ مسح فعلي' : 'معاينة (مفيش مسح)'));
  console.log('  المهلة:       ' + graceDays + ' يوم بعد معاد الفرح');
  console.log('='.repeat(58) + '\n');

  if (apply && !sure) {
    console.log('طلبت --apply من غير --yes-i-am-sure.');
    console.log('ده مسح مش بيرجع — شغّل المعاينة الأول، وبعدين:');
    console.log('  npm run cleanup -- --env ' + envFile + ' --apply --yes-i-am-sure\n');
    process.exit(1);
  }

  await connectDB();

  const [total, premium, owned, drafts, published] = await Promise.all([
    Invitation.countDocuments({}),
    Invitation.countDocuments({ isPremium: true }),
    Invitation.countDocuments({ ownerId: { $ne: null } }),
    Invitation.countDocuments({ status: 'draft' }),
    Invitation.countDocuments({ status: { $ne: 'draft' } }),
  ]);

  console.log('صورة القاعدة دلوقتي:');
  console.log('  ' + pad('إجمالي الدعوات') + n(total));
  console.log('  ' + pad('مميزة (مدفوعة)') + n(premium) + '   ← محمية');
  console.log('  ' + pad('ليها حساب') + n(owned) + '   ← محمية');
  console.log('  ' + pad('مسودات') + n(drafts));

  const filter = buildFilter(graceDays);
  const matching = await Invitation.countDocuments(filter);

  console.log('\nالمرشّح للمسح:');
  console.log('  ' + pad('عدد الدعوات') + n(matching)
    + (total ? '   (' + Math.round((matching / total) * 100) + '% من الإجمالي)' : ''));
  console.log('  ' + pad('هيفضل في القاعدة') + n(total - matching));

  // توزيع بالسنة — يساعدك تتأكد إن الأرقام منطقية قبل أي مسح
  if (matching > 0) {
    const byYear = await Invitation.aggregate([
      { $match: filter },
      { $group: { _id: { $year: '$weddingDateTime' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    console.log('\n  حسب سنة الفرح:');
    byYear.forEach((r) => console.log('    ' + r._id + ':  ' + n(r.count)));

    if (sample > 0) {
      const rows = await Invitation.find(filter)
        .sort({ weddingDateTime: 1 }).limit(sample)
        .select('shortId brideNameAr groomNameAr weddingDateTime viewCount').lean();
      console.log('\n  عيّنة من الأقدم:');
      rows.forEach((r) => {
        const d = new Date(r.weddingDateTime).toISOString().slice(0, 10);
        const names = `${r.brideNameAr || ''} & ${r.groomNameAr || ''}`.trim();
        console.log(`    ${d}  ${String(r.shortId).padEnd(9)} ${r.viewCount || 0} مشاهدة   ${names}`);
      });
    }
  }

  const summary = await cleanupExpiredInvitations({ graceDays, dryRun: !(apply && sure), limit });

  console.log('\n' + (apply && sure ? '⚠ اتنفّذ:' : 'الدفعة الجاية (لو نفّذت):'));
  console.log('  ' + pad('دعوات') + n(summary.selected) + (apply && sure ? '   اتمسح: ' + n(summary.deleted) : ''));
  console.log('  ' + pad('مشاهداتها') + n(summary.views));
  console.log('  ' + pad('ردود حضور معاها') + n(summary.rsvps));
  console.log('  ' + pad('أجهزة هتختفي') + n(summary.creatorsGone));

  const totals = await SiteTotals.findOne({ key: 'default' }).lean();
  const archived = (totals && totals.archivedInvitations) || 0;
  const remaining = await Invitation.countDocuments({ status: { $ne: 'draft' } });

  console.log('\nالعداد اللي بيبان للزوار:');
  console.log('  ' + pad('موجود في القاعدة') + n(remaining));
  console.log('  ' + pad('محفوظ من المسح') + n(archived));
  console.log('  ' + pad('الظاهر للزوار') + n(remaining + archived) + '   ← ده اللي مش بينقص أبدًا');

  if (!(apply && sure)) {
    if (matching > 0) {
      const batches = Math.ceil(matching / limit);
      console.log('\nدي معاينة — مفيش أي حاجة اتمسحت.');
      console.log('للتنفيذ (' + batches + ' دفعة × ' + n(limit) + '):');
      console.log('  npm run cleanup -- --env ' + envFile + ' --days ' + graceDays
        + ' --limit ' + limit + ' --apply --yes-i-am-sure');
    } else {
      console.log('\nمفيش حاجة محتاجة تنضيف. القاعدة نضيفة.');
    }
  } else if (summary.deleted > 0 && summary.deleted < matching) {
    console.log('\nفاضل ' + n(matching - summary.deleted) + ' — شغّل نفس الأمر تاني للدفعة اللي بعدها.');
  }

  console.log('');
  process.exit(0);
})().catch((err) => {
  console.error('\nفشل: ' + err.message + '\n');
  process.exit(1);
});
