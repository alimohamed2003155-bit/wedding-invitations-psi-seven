// middleware/deviceLimiter.js
const crypto = require('crypto');
const RateLimit = require('../models/RateLimit');

const COOKIE_NAME = 'wda_device_id';
const WINDOW_MS = 60 * 60 * 1000; // نافذة الساعة
const MAX_PER_WINDOW = 6;         // 6 دعوات كحد أقصى لكل جهاز في الساعة (عدّلها براحتك)
const MAX_RSVP_PER_WINDOW = 8;    // 8 ردود تأكيد حضور كحد أقصى لكل جهاز في الساعة

// مفتاح توقيع كود الجهاز. مشتق من سر الأدمن بملح ثابت عشان مانضيفش
// متغيّر بيئة جديد لازم يتحط على Vercel. لو السر اتغيّر، كل الأكواد
// القديمة بتبقى غير صالحة والأجهزة بتاخد أكواد جديدة — أسوأ نتيجة إن
// الناس تاخد رصيدها المجاني من أول وجديد، وده مش ضرر.
const DEVICE_SECRET = crypto.createHash('sha256')
  .update(`mithaq:device:${process.env.ADMIN_SECRET || 'local-dev-secret'}`)
  .digest();

/** توقيع قصير (HMAC) للكود — 22 حرف كفاية وميكبّرش الكوكي */
function signDeviceId(id) {
  return crypto.createHmac('sha256', DEVICE_SECRET).update(id).digest('base64url').slice(0, 22);
}

/**
 * بيقرا كود الجهاز من الكوكي ويتأكد إنه بتاعنا إحنا.
 *
 * ليه التوقيع أصلًا: من غيره أي حد يقدر يكتب أي قيمة في الكوكي —
 * يعني قيمة جديدة مع كل طلب، والرصيد المجاني اليومي مايخلصش أبدًا.
 * التوقيع بيخلي الكود الوحيد المقبول هو اللي إحنا أصدرناه.
 *
 * @returns {{ id: string|null, needsReissue: boolean }}
 */
function readDeviceId(raw) {
  const value = String(raw || '');
  // الشكل القديم: 32 حرف hex من غير توقيع. بنقبله ونوقّعه عشان
  // الناس اللي على الموقع دلوقتي ماتتصفّرش عدّاداتهم فجأة.
  if (/^[a-f0-9]{32}$/.test(value)) return { id: value, needsReissue: true };

  const dot = value.indexOf('.');
  if (dot <= 0) return { id: null, needsReissue: true };
  const id = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  if (!/^[a-f0-9]{32}$/.test(id)) return { id: null, needsReissue: true };

  const expected = signDeviceId(id);
  if (mac.length !== expected.length) return { id: null, needsReissue: true };
  const ok = crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected));
  return ok ? { id, needsReissue: false } : { id: null, needsReissue: true };
}

/**
 * بيدي كل جهاز/متصفح كوكي فريد (لو مش موجود) عشان نقدر نتعرف عليه لاحقًا،
 * حتى لو أكتر من جهاز شغالين على نفس الـ IP (زي شبكة بيت أو شركة).
 */
function ensureDeviceId(req, res, next) {
  const { id, needsReissue } = readDeviceId(req.cookies && req.cookies[COOKIE_NAME]);
  const deviceId = id || crypto.randomBytes(16).toString('hex');

  if (needsReissue) {
    res.cookie(COOKIE_NAME, `${deviceId}.${signDeviceId(deviceId)}`, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 365 * 24 * 60 * 60 * 1000, // سنة
      path: '/',
    });
  }
  req.deviceId = deviceId;
  next();
}

/**
 * بيمنع أي جهاز إنه يعمل دعوات أكتر من الحد المسموح بيه في الساعة.
 * البيانات متخزنة في MongoDB (مش في ذاكرة السيرفر) عشان تفضل شغالة صح
 * حتى لو السيرفر باعت طلبات لأكتر من نسخة (سيرفرلس) أو اتعمله إعادة تشغيل.
 */
async function deviceInvitationLimiter(req, res, next) {
  try {
    const deviceId = req.deviceId || req.ip || 'unknown';
    const now = Date.now();
    const windowStart = new Date(Math.floor(now / WINDOW_MS) * WINDOW_MS);
    const expiresAt = new Date(windowStart.getTime() + WINDOW_MS);

    const record = await RateLimit.findOneAndUpdate(
      { deviceId, windowStart },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, new: true }
    );

    if (record.count > MAX_PER_WINDOW) {
      return res.status(429).json({
        error: `وصلت للحد الأقصى المسموح به (${MAX_PER_WINDOW} دعوات في الساعة لكل جهاز). حاول تاني بعد شوية.`,
      });
    }

    return next();
  } catch (err) {
    console.error('Device limiter check failed:', err);
    // لو حصل عطل في فحص الحد نفسه (مش في استخدام المستخدم الفعلي)،
    // نسيب الطلب يكمل بدل ما نوقف الموقع كله بسبب مشكلة تقنية جانبية.
    return next();
  }
}

/**
 * بيمنع أي جهاز إنه يبعت ردود تأكيد حضور (RSVP) أكتر من الحد المسموح بيه
 * في الساعة — بيستخدم نفس الـ collection ونفس آلية العدّ الذرّي (atomic)
 * الخاصة بحد إنشاء الدعوات، لكن بمفتاح منفصل (بادئة "rsvp:") عشان الاتنين
 * ميشاركوش نفس الرصيد ومحتاجش أي تعديل في شكل الجدول نفسه.
 */
async function rsvpLimiter(req, res, next) {
  try {
    const deviceId = `rsvp:${req.deviceId || req.ip || 'unknown'}`;
    const now = Date.now();
    const windowStart = new Date(Math.floor(now / WINDOW_MS) * WINDOW_MS);
    const expiresAt = new Date(windowStart.getTime() + WINDOW_MS);

    const record = await RateLimit.findOneAndUpdate(
      { deviceId, windowStart },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, new: true }
    );

    if (record.count > MAX_RSVP_PER_WINDOW) {
      return res.status(429).json({
        error: `وصلت للحد الأقصى المسموح به من الردود. حاول تاني بعد شوية.`,
      });
    }

    return next();
  } catch (err) {
    console.error('RSVP limiter check failed:', err);
    return next();
  }
}

module.exports = {
  ensureDeviceId, deviceInvitationLimiter, rsvpLimiter, COOKIE_NAME,
  signDeviceId, readDeviceId,
};
