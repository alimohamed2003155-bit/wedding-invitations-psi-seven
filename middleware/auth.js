// middleware/auth.js
// جلسات تسجيل الدخول — نفس فلسفة middleware/deviceLimiter.js (كوكي فريد +
// سجل في MongoDB) بدل JWT، عشان نقدر نلغي أي جلسة فورًا من السيرفر (تسجيل
// خروج حقيقي)، ومتسقة مع تصميم المشروع للعمل صح على منصة سيرفرلس زي Vercel.
const crypto = require('crypto');
const connectDB = require('../config/db');
const User = require('../models/User');
const Session = require('../models/Session');

const SESSION_COOKIE_NAME = 'wda_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 يوم

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_DURATION_MS,
});

/**
 * بتنشئ جلسة دخول جديدة لمستخدم (بعد تسجيل أو دخول ناجح)، وتحط الكوكي في الرد.
 * @param {import('express').Response} res
 * @param {string} userId
 */
async function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex'); // 256-bit، عشوائي وغير قابل للتخمين
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await Session.create({ token, userId, expiresAt });
  res.cookie(SESSION_COOKIE_NAME, token, cookieOptions());
}

/**
 * بتلغي الجلسة الحالية فعليًا من الداتابيز (مش بس مسح الكوكي) — تسجيل خروج حقيقي.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function destroySession(req, res) {
  const token = req.cookies && req.cookies[SESSION_COOKIE_NAME];
  if (token) {
    try { await Session.deleteOne({ token }); } catch { /* تجاهل، المهم مسح الكوكي في كل الأحوال */ }
  }
  res.clearCookie(SESSION_COOKIE_NAME);
}

/**
 * بتحط req.user لو فيه جلسة صالحة، وإلا req.user = null — من غير ما توقف
 * الطلب في أي الحالتين (fail-open لزائر مجهول)، حتى لو حصل عطل في الاتصال
 * بالداتابيز، بنفس فلسفة catch-and-continue الموجودة في deviceInvitationLimiter.
 */
async function attachUser(req, res, next) {
  req.user = null;
  try {
    const token = req.cookies && req.cookies[SESSION_COOKIE_NAME];
    if (!token) return next();

    // لازم نستدعيها هنا صراحة (مش بس نعتمد إن requireDB اتنادت قبلها على
    // نفس المسار) — بعض المسارات اللي محتاجة تعرف حالة الدخول (زي
    // /api/preview) أصلًا من غير requireDB، فمن غيرها استعلامات Mongoose
    // هتفضل معلقة (buffered) لحد ما تعدي مهلة الاتصال الافتراضية.
    await connectDB();

    const session = await Session.findOne({ token });
    if (!session || session.expiresAt <= new Date()) return next();

    const user = await User.findById(session.userId).select('email name country subscription isBlocked');
    if (!user) return next();

    // حساب محظور من لوحة التحكم = زائر مجهول. الحظر بيمسح جلساته وقتها،
    // والفحص ده خط دفاع تاني لو اتعمل حظر وجلسة اتعملت في نفس اللحظة.
    if (user.isBlocked) {
      try { await Session.deleteOne({ token }); } catch { /* مش مهم */ }
      return next();
    }

    req.user = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      country: user.country,
      subscription: user.subscription || null,
    };
  } catch (err) {
    console.error('attachUser check failed:', err.message);
  }
  return next();
}

/** بيتستخدم بس على الـ routes اللي فعلاً لازم تسجيل دخول ليها */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'لازم تسجل الدخول الأول.' });
  }
  return next();
}

module.exports = { attachUser, requireAuth, createSession, destroySession, SESSION_COOKIE_NAME };
