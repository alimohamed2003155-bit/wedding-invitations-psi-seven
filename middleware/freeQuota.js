// middleware/freeQuota.js
// رصيد الدعوات المجانية اليومي.
//
// القاعدة: 3 دعوات مجانية لكل جهاز في اليوم. خلصوا؟ يستنى بكرة أو
// ياخد باقة. المشترك مالوش دعوة بالحد ده خالص — دعواته بتتخصم من
// رصيد باقته، مش من المجاني.
//
// ===== ليه بالشكل ده بالظبط =====
//
// مفيش طريقة تتعرف بيها على "جهاز" على الويب بشكل مضمون 100% — أي حد
// يقدر يمسح الكوكيز أو يفتح نافذة خفية. أي حد يقولك غير كده بيبيعلك
// وهم. اللي ينفع فعلاً هو طبقات، كل طبقة بتغلّي التحايل شوية، من غير
// ما نأذي حد بيستخدم الموقع عادي:
//
//   1) كود الجهاز في كوكي **موقّع** (middleware/deviceLimiter.js).
//      التوقيع مش عشان نمنع المسح — ده مستحيل — لكن عشان نمنع الأسهل
//      منه بكتير: إن المتصفح يبعت قيمة مخترعة جديدة مع كل طلب،
//      وساعتها العدّاد مايوصلش لـ3 أبدًا.
//
//   2) الحساب كمان لو مسجّل دخول. ده بيقفل أكتر حالة واقعية: عميل
//      داخل بحسابه ومسح الكوكيز. الحساب محتاج إيميل مختلف كل مرة،
//      فالتحايل بيبقى متعب فعلاً مش ضغطة زرار.
//
//   3) الحد بيرجع كل يوم، مش مدى الحياة.
//      يعني أسوأ حالة تحايل = واحد أخد دعوات مجانية زيادة، مش عميل
//      حقيقي اتقفل عليه الموقع للأبد. الضرر في الاتجاه الصح.
//
// ===== وليه مفيش حد على الـIP =====
//
// بصمة الـIP بتتخزن (للمتابعة في لوحة التحكم بعدين)، بس **مش**
// بنمنع بيها.
//
// السبب: شبكات المحمول في مصر بتشتغل بـCGNAT — آلاف المشتركين ورا
// عنوان واحد. أي حد يومي على الـIP واطي كفاية إنه يوقف متحايل، هو
// كمان واطي كفاية إنه يقفل على عملاء حقيقيين على فودافون أو أورنج
// من غير ما نعرف. والخسارة هنا مش رسالة خطأ — دي بيعة ضاعت وعميل
// حاسس إن الموقع باظ. المتحايل أرخص علينا من عميل اتمنع.
//
// اللي شغال على مستوى الـIP هو حدود المعدّل العامة الموجودة أصلًا
// في server.js (30 طلب كل ربع ساعة)، وهي حدود سرعة مش رصيد.
//
// التوقيت بتوقيت القاهرة بالقصد: لما نقول "جرّب بكرة" لازم تكون بكرة
// بتاعت العميل، مش بتاعت السيرفر.

const crypto = require('crypto');
const Invitation = require('../models/Invitation');

/** 3 دعوات مجانية لكل جهاز (ولكل حساب) في اليوم */
const FREE_PER_DAY = 3;

const TZ = 'Africa/Cairo';

const IP_SECRET = crypto.createHash('sha256')
  .update(`mithaq:ip:${process.env.ADMIN_SECRET || 'local-dev-secret'}`)
  .digest();

/**
 * بصمة الـIP. بنخزّن البصمة بس — العنوان نفسه عمره ما بيتكتب في أي
 * مكان. من غير المفتاح، مفيش طريقة ترجع منها للعنوان.
 */
function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHmac('sha256', IP_SECRET).update(String(ip)).digest('hex').slice(0, 32);
}

/** كام ملّي ثانية فاضلة على نص الليل بتوقيت القاهرة */
function msUntilMidnight(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(now);
  const get = (type) => Number((parts.find((p) => p.type === type) || {}).value || 0);
  const secondsIntoDay = get('hour') * 3600 + get('minute') * 60 + get('second');
  return (86400 - secondsIntoDay) * 1000;
}

/** بداية النهارده بتوقيت القاهرة، كوقت عالمي جاهز للاستعلام */
function startOfToday(now = new Date()) {
  return new Date(now.getTime() - (86400 * 1000 - msUntilMidnight(now)));
}

/**
 * كام دعوة مجانية اتعملت النهارده من الجهاز ده أو من الحساب ده.
 * بناخد الأكبر فيهم: يعني مسح الكوكيز وهو مسجّل دخول مايديش رصيد جديد.
 *
 * @returns {Promise<{used:number, limit:number, remaining:number,
 *   resetsInMs:number, blocked:boolean}>}
 */
async function freeQuotaFor(deviceId, userId) {
  const dayStart = startOfToday();
  const base = { isPremium: { $ne: true }, createdAt: { $gte: dayStart } };

  const [byDevice, byAccount] = await Promise.all([
    deviceId ? Invitation.countDocuments({ ...base, creatorDeviceId: deviceId }) : 0,
    userId ? Invitation.countDocuments({ ...base, ownerId: userId }) : 0,
  ]);

  const used = Math.max(byDevice, byAccount);
  return {
    used,
    limit: FREE_PER_DAY,
    remaining: Math.max(0, FREE_PER_DAY - used),
    resetsInMs: msUntilMidnight(),
    blocked: used >= FREE_PER_DAY,
  };
}

/**
 * بيوقف إنشاء دعوة مجانية جديدة لو الرصيد اليومي خلص.
 * المشترك بيعدّي من غير ما يتفحص أصلًا — رصيده في باقته.
 *
 * لازم يتحط **بعد** ensureDeviceId عشان req.deviceId يكون موجود.
 *
 * ملحوظة مقصودة: العدّ بيقرا الدعوات الموجودة فعلاً، فلو اتبعت طلبين
 * في نفس الجزء من الثانية ممكن يعدّوا الاتنين على رصيد واحد. سبنا
 * كده بالقصد: البديل (عدّاد ذرّي منفصل) بيتزوّد مع كل محاولة — يعني
 * غلطة في الفورم كانت هتاكل من رصيد العميل، وده أسوأ بكتير من إن حد
 * ياخد دعوة زيادة بالمكر. وفيه سقف تاني فوقه أصلًا: 6 دعوات في
 * الساعة لكل جهاز (middleware/deviceLimiter.js).
 */
function requireFreeQuota(hasPackage) {
  return async function checkFreeQuota(req, res, next) {
    try {
      // البصمة بتتخزن على الدعوة في كل الأحوال — للمتابعة بس، مفيش
      // منع بيها (اقرا السبب فوق)
      req.ipHash = hashIp(req.ip);
      if (hasPackage(req.user)) return next();

      const quota = await freeQuotaFor(req.deviceId, req.user && req.user.id);
      req.freeQuota = quota;

      if (!quota.blocked) return next();

      const hours = Math.max(1, Math.ceil(quota.resetsInMs / 3600000));
      return res.status(403).json({
        // الكود ده اللي الواجهة بتتعرف بيه على الحالة وتعرض الترقية
        code: 'FREE_QUOTA',
        error: 'خلصت دعواتك المجانية النهارده. جرّب بكرة، أو خد باقة'
          + ' وتعدّل في دعوتك زي ما إنت عايز.',
        limit: quota.limit,
        used: quota.used,
        resetsInHours: hours,
      });
    } catch (err) {
      // عطل في الفحص نفسه مش سبب إننا نوقف الموقع — بنعدّي الطلب
      console.error('Free quota check failed:', err);
      return next();
    }
  };
}

module.exports = {
  requireFreeQuota, freeQuotaFor, hashIp, msUntilMidnight, startOfToday,
  FREE_PER_DAY,
};
