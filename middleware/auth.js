// middleware/auth.js
// جلسات تسجيل الدخول.
//
// الهدف: العميل يفضل مسجّل دخول فترة طويلة من غير ما يعيد كل شوية،
// وفي نفس الوقت لو الكوكي اتسرق يبقى الضرر محدود ومكشوف.
//
// الطريقة (نفس اللي البنوك والمنصات الكبيرة بتعملها):
//   • التوكن عشوائي 256-bit، بيتخزن **بصمته** بس في الداتابيز.
//   • الصلاحية بتتجدد مع الاستخدام (sliding) — اللي بيدخل من وقت
//     للتاني مبيتطلبش منه دخول تاني أبدًا.
//   • التوكن بيتدوّر كل فترة حتى والجلسة شغالة، فأي نسخة مسروقة
//     بتبطل لوحدها.
//   • لو توكن قديم اتستخدم بعد فترة السماح → يبقى فيه نسختين من نفس
//     الجلسة، يعني سرقة → بنلغي الجلسة كلها فورًا.
//   • سقف مطلق للجلسة مهما اتجددت.
//
// ملحوظة مقصودة: مابنربطش الجلسة بالـ User-Agent زي جلسة الأدمن.
// متصفحات العملاء بتتحدّث لوحدها والـ User-Agent بيتغيّر معاها، فالربط
// ده كان هيطلّع ناس برّه حساباتها من غير سبب — وده عكس المطلوب بالظبط.
// الحماية هنا جاية من التدوير وكشف إعادة الاستخدام، وهما أقوى وأدق.
const crypto = require('crypto');
const connectDB = require('../config/db');
const User = require('../models/User');
const Session = require('../models/Session');

const SESSION_COOKIE_NAME = 'wda_session';

const DAY = 24 * 60 * 60 * 1000;

// الصلاحية المتجددة: العميل يقعد 90 يوم من غير ما يفتح الموقع وبرضو
// يلاقي نفسه مسجّل. وأي زيارة بتبدأ العد من أول وجديد.
const SESSION_SLIDING_MS = 90 * DAY;
// السقف المطلق: سنة من أول تسجيل دخول، مهما اتجددت.
const SESSION_ABSOLUTE_MS = 365 * DAY;
// التوكن بيتدوّر كل يوم استخدام — مش كل طلب (ده كان هيعمل كتابة في
// الداتابيز مع كل صورة على الصفحة، وهيكسر الطلبات المتوازية).
const ROTATE_EVERY_MS = 1 * DAY;
// بعد التدوير، التوكن القديم بيفضل مقبول دقيقتين: الطلبات اللي كانت
// طايرة في نفس اللحظة بتكمّل عادي بدل ما تفشل.
const ROTATION_GRACE_MS = 2 * 60 * 1000;
// تمديد الصلاحية بيتكتب كل 6 ساعات على الأكثر — التمديد مع كل طلب
// كان هيبقى كتابة في الداتابيز مع كل ضغطة من غير أي فايدة.
const TOUCH_EVERY_MS = 6 * 60 * 60 * 1000;

/** بصمة التوكن — ده اللي بيتخزن، مش التوكن نفسه */
const hashToken = (raw) => crypto.createHash('sha256').update(String(raw)).digest('hex');

const newToken = () => crypto.randomBytes(32).toString('hex'); // 256-bit

const cookieOptions = (maxAge = SESSION_SLIDING_MS) => ({
  httpOnly: true,          // الجافاسكريبت في الصفحة عمره ما يشوفه (حماية من XSS)
  sameSite: 'lax',         // مبيتبعتش مع طلبات جاية من مواقع تانية (حماية من CSRF)
  secure: process.env.NODE_ENV === 'production', // HTTPS بس
  path: '/',
  maxAge,
});

/**
 * جلسة دخول جديدة (بعد تسجيل أو دخول ناجح).
 * @param {import('express').Response} res
 * @param {string} userId
 */
async function createSession(res, userId) {
  const raw = newToken();
  const now = Date.now();
  await Session.create({
    tokenHash: hashToken(raw),
    familyId: crypto.randomBytes(16).toString('hex'),
    userId,
    createdAt: new Date(now),
    lastUsedAt: new Date(now),
    rotatedAt: new Date(now),
    expiresAt: new Date(now + SESSION_SLIDING_MS),
    absoluteExpiresAt: new Date(now + SESSION_ABSOLUTE_MS),
  });
  res.cookie(SESSION_COOKIE_NAME, raw, cookieOptions());
}

/** بتلغي الجلسة فعليًا من الداتابيز (مش بس مسح الكوكي) — خروج حقيقي */
async function destroySession(req, res) {
  const raw = req.cookies && req.cookies[SESSION_COOKIE_NAME];
  if (raw) {
    const h = hashToken(raw);
    try {
      // بنلغي العيلة كلها: لو الجلسة اتدوّرت، مايبقاش فيه توكن قديم
      // لسه شغال في فترة السماح
      const s = await Session.findOne({ $or: [{ tokenHash: h }, { prevTokenHash: h }, { token: raw }] });
      if (s && s.familyId) await Session.deleteMany({ familyId: s.familyId });
      else if (s) await Session.deleteOne({ _id: s._id });
    } catch { /* تجاهل، المهم مسح الكوكي في كل الأحوال */ }
  }
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
}

/**
 * بيدوّر على الجلسة من التوكن، وبيتصرف في الحالات الخاصة.
 * @returns {Promise<{session: object|null, reused: boolean, legacy: boolean}>}
 */
async function findSession(raw) {
  const h = hashToken(raw);

  const current = await Session.findOne({ tokenHash: h });
  if (current) return { session: current, reused: false, legacy: false };

  // توكن قديم بعد تدوير
  const rotated = await Session.findOne({ prevTokenHash: h });
  if (rotated) {
    const inGrace = rotated.graceUntil && rotated.graceUntil > new Date();
    // جوه فترة السماح = طلب كان طاير وقت التدوير، عادي جدًا.
    // بعدها = نسختين من نفس الجلسة شغالين، يعني الكوكي اتسرق.
    return { session: inGrace ? rotated : null, reused: !inGrace, legacy: false };
  }

  // جلسة من النسخة القديمة (التوكن كان متخزن نص صريح)
  const old = await Session.findOne({ token: raw });
  if (old) return { session: old, reused: false, legacy: true };

  return { session: null, reused: false, legacy: false };
}

/**
 * بتحط req.user لو فيه جلسة صالحة، وإلا req.user = null — من غير ما
 * توقف الطلب في أي الحالتين (fail-open لزائر مجهول)، حتى لو حصل عطل في
 * الاتصال بالداتابيز.
 */
async function attachUser(req, res, next) {
  req.user = null;
  try {
    const raw = req.cookies && req.cookies[SESSION_COOKIE_NAME];
    if (!raw) return next();

    // لازم نستدعيها هنا صراحة (مش بس نعتمد إن requireDB اتنادت قبلها على
    // نفس المسار) — بعض المسارات اللي محتاجة تعرف حالة الدخول (زي
    // /api/preview) أصلًا من غير requireDB، فمن غيرها استعلامات Mongoose
    // هتفضل معلقة (buffered) لحد ما تعدي مهلة الاتصال الافتراضية.
    await connectDB();

    const { session, reused, legacy } = await findSession(raw);

    // ===== كوكي مسروق =====
    if (reused) {
      console.warn('Session reuse detected — revoking family');
      const stolen = await Session.findOne({ prevTokenHash: hashToken(raw) });
      if (stolen && stolen.familyId) await Session.deleteMany({ familyId: stolen.familyId });
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      return next();
    }

    if (!session) return next();

    const now = new Date();
    if (session.expiresAt <= now
      || (session.absoluteExpiresAt && session.absoluteExpiresAt <= now)) {
      return next();
    }

    const user = await User.findById(session.userId).select('email name country subscription isBlocked');
    if (!user) return next();

    // حساب محظور من لوحة التحكم = زائر مجهول. الحظر بيمسح جلساته وقتها،
    // والفحص ده خط دفاع تاني لو اتعمل حظر وجلسة اتعملت في نفس اللحظة.
    if (user.isBlocked) {
      try {
        if (session.familyId) await Session.deleteMany({ familyId: session.familyId });
        else await Session.deleteOne({ _id: session._id });
      } catch { /* مش مهم */ }
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      return next();
    }

    req.user = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      country: user.country,
      subscription: user.subscription || null,
    };

    // ===== تجديد الصلاحية والتدوير =====
    // بيحصلوا بعد ما نحط req.user: لو فشلت الكتابة لأي سبب، العميل
    // بيفضل داخل عادي والطلب بيكمّل.
    await renew(res, session, legacy, raw);
  } catch (err) {
    console.error('attachUser check failed:', err.message);
  }
  return next();
}

/** تمديد الصلاحية + تدوير التوكن لما ييجي معادهم */
async function renew(res, session, legacy, raw) {
  try {
    const now = Date.now();
    const rotatedAt = session.rotatedAt ? session.rotatedAt.getTime() : 0;
    const lastUsed = session.lastUsedAt ? session.lastUsedAt.getTime() : 0;

    // الجلسة القديمة (توكن نص صريح) بتتحوّل للشكل الجديد على طول
    const mustRotate = legacy || (now - rotatedAt >= ROTATE_EVERY_MS);
    const mustTouch = now - lastUsed >= TOUCH_EVERY_MS;
    if (!mustRotate && !mustTouch) return;

    // السقف المطلق بيحكم التمديد — الجلسة مبتعديهوش مهما اتجددت
    const cap = session.absoluteExpiresAt
      ? session.absoluteExpiresAt.getTime()
      : session.createdAt.getTime() + SESSION_ABSOLUTE_MS;
    const nextExpiry = new Date(Math.min(now + SESSION_SLIDING_MS, cap));

    if (!mustRotate) {
      await Session.updateOne(
        { _id: session._id },
        { $set: { lastUsedAt: new Date(now), expiresAt: nextExpiry } }
      );
      return;
    }

    const nextRaw = newToken();
    const update = {
      $set: {
        tokenHash: hashToken(nextRaw),
        prevTokenHash: legacy ? hashToken(raw) : (session.tokenHash || null),
        graceUntil: new Date(now + ROTATION_GRACE_MS),
        rotatedAt: new Date(now),
        lastUsedAt: new Date(now),
        expiresAt: nextExpiry,
        familyId: session.familyId || crypto.randomBytes(16).toString('hex'),
        absoluteExpiresAt: session.absoluteExpiresAt || new Date(cap),
      },
    };
    // الجلسة القديمة: بنشيل التوكن الصريح خالص بعد التحويل
    if (legacy) update.$unset = { token: '' };

    // الشرط على rotatedAt بيمنع طلبين متوازيين إنهم يدوّروا مرتين —
    // الأول بس هو اللي بينجح، والتاني بيكمّل بتوكنه القديم في فترة
    // السماح
    const result = await Session.updateOne(
      { _id: session._id, rotatedAt: session.rotatedAt },
      update
    );
    if (result.modifiedCount === 1) {
      const maxAge = Math.max(0, nextExpiry.getTime() - now);
      res.cookie(SESSION_COOKIE_NAME, nextRaw, cookieOptions(maxAge));
    }
  } catch (err) {
    // فشل التجديد مايصحش يطلّع العميل برّه — جلسته لسه صالحة
    console.error('Session renew failed:', err.message);
  }
}

/** بيتستخدم بس على الـ routes اللي فعلاً لازم تسجيل دخول ليها */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'لازم تسجل الدخول الأول.' });
  }
  return next();
}

module.exports = {
  attachUser,
  requireAuth,
  createSession,
  destroySession,
  SESSION_COOKIE_NAME,
  // للاختبارات
  hashToken,
  SESSION_SLIDING_MS,
  SESSION_ABSOLUTE_MS,
  ROTATE_EVERY_MS,
  ROTATION_GRACE_MS,
};
