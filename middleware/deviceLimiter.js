// middleware/deviceLimiter.js
const crypto = require('crypto');
const RateLimit = require('../models/RateLimit');

const COOKIE_NAME = 'wda_device_id';
const WINDOW_MS = 60 * 60 * 1000; // نافذة الساعة
const MAX_PER_WINDOW = 6;         // 6 دعوات كحد أقصى لكل جهاز في الساعة (عدّلها براحتك)

/**
 * بيدي كل جهاز/متصفح كوكي فريد (لو مش موجود) عشان نقدر نتعرف عليه لاحقًا،
 * حتى لو أكتر من جهاز شغالين على نفس الـ IP (زي شبكة بيت أو شركة).
 */
function ensureDeviceId(req, res, next) {
  let deviceId = req.cookies && req.cookies[COOKIE_NAME];
  if (!deviceId) {
    deviceId = crypto.randomBytes(16).toString('hex');
    res.cookie(COOKIE_NAME, deviceId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 365 * 24 * 60 * 60 * 1000, // سنة
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

module.exports = { ensureDeviceId, deviceInvitationLimiter, COOKIE_NAME };
