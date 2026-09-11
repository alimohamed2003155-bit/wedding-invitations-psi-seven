// middleware/adminAuth.js
// جلسة لوحة التحكم — بديل آمن لتمرير ADMIN_SECRET في كل طلب عبر الـ URL
// (?key=...، اللي كان بيتسجل في server logs وتاريخ المتصفح). المستخدم بيدخل
// المفتاح مرة واحدة (POST /admin/login)، وبعدها كوكي httpOnly بيتابع الجلسة.
//
// طبقات الحماية هنا، وكل واحدة بتغطي حاجة مختلفة:
//   1) الكوكي httpOnly    → جافاسكريبت (وأي XSS) مش شايفة التوكن أصلًا
//   2) sameSite: 'strict' → المتصفح مبيبعتش الكوكي من أي موقع تاني خالص
//   3) هيدر X-Admin-Request → أي طلب من موقع تاني لازم يعدي على preflight،
//      والـ CORS بتاعنا بيرفضه. ده بيقفل CSRF حتى لو الـ sameSite اتحايل عليه
//   4) بصمة المتصفح       → كوكي متسروق ومستخدم من جهاز تاني بيترفض
//   5) خمول 60 دقيقة      → لوحة مفتوحة ومنسية بتقفل لوحدها
const crypto = require('crypto');
const connectDB = require('../config/db');
const AdminSession = require('../models/AdminSession');

const ADMIN_COOKIE_NAME = 'wda_admin_session';
// 24 ساعة — أقصر بكتير من جلسة المستخدم العادي لأنه مفتاح مشترك عالي الصلاحية
const ADMIN_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
// أقصى مدة خمول قبل ما الجلسة تلغي نفسها
const ADMIN_IDLE_TIMEOUT_MS = 60 * 60 * 1000;
// الهيدر اللي كل طلب من اللوحة لازم يبعته (client/src/store/adminApi.js)
const ADMIN_REQUEST_HEADER = 'x-admin-request';

const cookieOptions = () => ({
  httpOnly: true,
  // 'strict' مش 'lax': اللوحة مبيتفتحش عليها لينكات من برّه، فمفيش أي
  // سبب يخلي المتصفح يبعت كوكي الأدمن مع طلب جاي من موقع تاني.
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: ADMIN_SESSION_DURATION_MS,
  path: '/',
});

/** بصمة خفيفة للمتصفح — مش سر، مجرد حاجة تتغيّر لو الكوكي اتنقل لجهاز تاني */
function fingerprintOf(req) {
  const ua = String((req.headers && req.headers['user-agent']) || '');
  return crypto.createHash('sha256').update(ua).digest('hex').slice(0, 32);
}

/**
 * مقارنة آمنة لكلمة السر (بتاخد نفس الوقت في كل الحالات) عشان تمنع أي محاولة
 * تخمين تعتمد على قياس زمن الاستجابة (timing attack).
 */
function isValidAdminKey(providedKey) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return false; // لو مفيش كلمة سر متظبطة أصلًا، اللوحة مقفولة تمامًا لأي حد
  // بنقارن hash الاتنين مش النص نفسه: كده الطولين متساويين دايمًا،
  // فحتى طول كلمة السر مبيتسربش من وقت الاستجابة.
  const a = crypto.createHash('sha256').update(String(providedKey || '')).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

async function createAdminSession(req, res) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_MS);
  await AdminSession.create({
    token,
    expiresAt,
    fingerprint: fingerprintOf(req),
    lastSeenAt: new Date(),
  });
  res.cookie(ADMIN_COOKIE_NAME, token, cookieOptions());
}

async function destroyAdminSession(req, res) {
  const token = req.cookies && req.cookies[ADMIN_COOKIE_NAME];
  if (token) {
    try { await AdminSession.deleteOne({ token }); } catch { /* تجاهل، المهم مسح الكوكي في كل الأحوال */ }
  }
  res.clearCookie(ADMIN_COOKIE_NAME, { path: '/' });
}

/**
 * بيتحقق من الجلسة ويحدّث آخر نشاط.
 * @returns {Promise<boolean>}
 */
async function hasValidAdminSession(req) {
  try {
    const token = req.cookies && req.cookies[ADMIN_COOKIE_NAME];
    if (!token) return false;
    await connectDB();

    const session = await AdminSession.findOne({ token });
    if (!session) return false;

    const now = new Date();
    if (session.expiresAt <= now) return false;

    // خمول طويل = الجلسة خلاص
    const lastSeen = session.lastSeenAt || session.createdAt || now;
    if (now - new Date(lastSeen) > ADMIN_IDLE_TIMEOUT_MS) {
      await AdminSession.deleteOne({ _id: session._id });
      return false;
    }

    // البصمة اتغيّرت = الكوكي بيتستخدم من متصفح تاني
    // (الجلسات القديمة مالهاش بصمة محفوظة، فبنعديها)
    if (session.fingerprint && session.fingerprint !== fingerprintOf(req)) {
      await AdminSession.deleteOne({ _id: session._id });
      return false;
    }

    // تحديث آخر نشاط — مش بننتظره عشان ميبطّأش كل طلب
    AdminSession.updateOne({ _id: session._id }, { $set: { lastSeenAt: now } }).catch(() => {});
    return true;
  } catch (err) {
    console.error('Admin session check failed:', err.message);
    return false;
  }
}

/**
 * بيتأكد إن فيه جلسة أدمن صالحة قبل أي مسار API محمي؛ 401 لو لأ.
 * وكمان بيرفض أي طلب مش جاي من اللوحة نفسها (حماية CSRF).
 */
async function requireAdminSession(req, res, next) {
  // الطلبات اللي بتغيّر حاجة لازم تحمل الهيدر. القراءة كمان بنطلبه منها
  // عشان مايتسربش أي بيانات عملاء لصفحة تانية بـ <script src> أو ما شابه.
  if (req.headers[ADMIN_REQUEST_HEADER] !== '1') {
    return res.status(403).json({ error: 'الطلب ده مرفوض.' });
  }
  const valid = await hasValidAdminSession(req);
  if (!valid) return res.status(401).json({ error: 'لازم تسجل دخول للوحة التحكم الأول.' });
  return next();
}

module.exports = {
  isValidAdminKey, createAdminSession, destroyAdminSession,
  hasValidAdminSession, requireAdminSession,
  ADMIN_COOKIE_NAME, ADMIN_REQUEST_HEADER,
};
