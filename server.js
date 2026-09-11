// server.js
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/db');
const invitationsRouter = require('./routes/invitations');
const adminRouter = require('./routes/admin');
const adminApiRouter = require('./routes/adminApi');
const authRouter = require('./routes/auth');
const packagesRouter = require('./routes/packages');
const uploadsRouter = require('./routes/uploads');
const dashboardRouter = require('./routes/dashboard');
const editorRouter = require('./routes/editor');
const { ensureDeviceId, deviceInvitationLimiter } = require('./middleware/deviceLimiter');
const { attachUser } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// أمان أساسي على مستوى الـ HTTP headers، بما فيها Content-Security-Policy
// مضبوطة فعليًا (مش متقفلة) — بتسمح بس بالمصادر الخارجية اللي التصميم
// فعلاً محتاجها (سكريبت/تنسيق Tilda الأساسي للتصميم، خطوط جوجل، خريطة
// جوجل المضمّنة، وملفات الصوت/الفيديو الخلفية)، وتمنع أي حاجة تانية —
// ده خط دفاع إضافي (defense in depth) حتى لو حصل خطأ حقن مستقبلًا في
// أي مكان تاني من الكود.
// Tilda بتوزّع ملفات التصاميم على نطاقات فرعية كتير وبتغيّرها من وقت للتاني
// (static / static3 / optim / neo / ws / thb ...) وعلى أكتر من امتداد
// (.net/.com/.one). لما كنا بنسمح لأربع نطاقات محددة بس، شاشة الغلاف
// ("اضغط للفتح") كانت بتتكسر في التصاميم لأن سكريبت وصور Tilda الأساسية
// كانت بتتمنع — فالدعوة كانت بتفتح على طول من غير الغلاف. بنسمح هنا لنطاقات
// Tilda كلها (نطاق المزوّد نفسه اللي التصاميم متصدّرة منه أصلًا) بدل
// ملاحقة كل نطاق فرعي جديد يدويًا.
const TILDA_CDN_HOSTS = [
  'https://*.tildacdn.net',
  'https://*.tildacdn.com',
  'https://*.tildacdn.one',
  'https://*.tildacdn.pub',
];
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // 'unsafe-inline' لازم للسكريبتات المضمّنة جوه صفحات الدعوة نفسها
      // (إعداد اللغة/البيانات لكل دعوة) — تصعيبها لصفر يحتاج إعادة بناء
      // كامل لنظام القوالب بـ nonce/hash لكل سكريبت
      scriptSrc: ["'self'", "'unsafe-inline'", ...TILDA_CDN_HOSTS],
      // helmet بيحط script-src-attr 'none' افتراضيًا، وده بيمنع الـ
      // onload/onerror المكتوبين جوه وسوم الصور في تصاميم Tilda (بيعتمد
      // عليهم التحميل الكسول للصور). بنسمح بيهم هنا — نفس مستوى الخطورة
      // بتاع 'unsafe-inline' اللي مسموح أصلًا فوق، مش تنازل إضافي.
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', ...TILDA_CDN_HOSTS],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', ...TILDA_CDN_HOSTS, 'data:'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', ...TILDA_CDN_HOSTS],
      mediaSrc: ["'self'", 'https://res.cloudinary.com', 'https://pub-4dc8201144ca418fb604349c73e8c724.r2.dev'],
      connectSrc: ["'self'", ...TILDA_CDN_HOSTS],
      // 'self' لازم عشان المحرر المباشر بيعرض الدعوة نفسها جوه iframe من
      // نفس الأوريجن؛ google.com للخرايط المضمّنة جوه الدعوة.
      frameSrc: ["'self'", 'https://www.google.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// CORS: مقفول افتراضيًا لأي دومين خارجي — الموقع بتاعنا (الصفحة الرئيسية،
// صفحات الدعوات، لوحة التحكم) كله بيتقدّم من نفس الأوريجن، فمش محتاج CORS
// أصلًا عشان يشتغل (المتصفح مبيطبقش قيود CORS على طلبات نفس الأوريجن).
// لو محتاج تسمح لدومين خارجي معين (زي موقع تسويقي منفصل) يكلم الـ API،
// ضيفه في متغير البيئة ALLOWED_ORIGINS (مفصول بفاصلة).
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    // مفيش Origin header خالص (طلبات نفس الأوريجن، أو أدوات زي curl/Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());

// بنتأكد إن قاعدة البيانات متصلة قبل أي طلب يحتاجها فعليًا (إنشاء/عرض دعوة).
// المعاينة الحية وقائمة القوالب (/api/preview, /api/templates) مايحتاجوش
// قاعدة بيانات أصلًا، فبيفضلوا شغالين حتى لو حصلت مشكلة مؤقتة في الاتصال.
const requireDB = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection error:', err.message);
    res.status(503).json({ error: 'السيرفر مش قادر يوصل لقاعدة البيانات دلوقتي.' });
  }
};
app.use('/api/invitations', requireDB);
app.use('/api/public-stats', requireDB);
app.use('/i', requireDB);
app.use('/i', attachUser);
app.use('/admin', requireDB);
app.use('/api/auth', requireDB);
app.use('/api/packages', requireDB);
app.use('/api/uploads', requireDB);
app.use('/api/dashboard', requireDB);
app.use('/api/editor', requireDB);

// لو فيه جلسة دخول صالحة (كوكي wda_session)، بيحط req.user؛ غير كده
// req.user = null من غير ما يوقف الطلب (middleware/auth.js). مربوط بس
// بالمسارات اللي فعلاً محتاجة تعرف حالة الدخول — مش عالميًا على كل الموقع
// (زي الملفات الثابتة أو صفحة الدعوة نفسها)، عشان نفس فلسفة الأداء
// والمرونة اللي requireDB بتتبعها.
app.use(['/api/preview', '/preview-sample', '/api/invitations', '/api/auth', '/api/packages', '/api/uploads', '/api/dashboard', '/api/editor'], attachUser);

// الموقع التسويقي/فورم الإنشاء بقى React (client/) مبني بـ Vite — الملفات
// الثابتة الناتجة (client/dist) هي اللي بتتقدم هنا بدل public/ القديم.
// (ملحوظة: لو استضفت المشروع على Vercel، الفولدر ده بيتقدّم من الـ CDN
// بتاعهم مباشرة وبيتجاهل السطر ده تلقائيًا — راجع README لو مش فاهم ليه)
const CLIENT_DIST = path.join(__dirname, 'client', 'dist');
app.use(express.static(CLIENT_DIST));

// ====== الحماية من إساءة الاستخدام ======

// 1) خط دفاع أول سريع: حد عام تقريبي لكل IP (مفيد بالذات على سيرفر VPS
//    تقليدي شغال بنسخة واحدة طول الوقت في الذاكرة)
const ipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 30,                  // 30 محاولة كحد أقصى لكل IP كل 15 دقيقة
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جدًا من المحاولات من نفس الاتصال، حاول تاني بعد شوية.' },
});

// 2) خط الدفاع الأساسي والدقيق: حد لكل جهاز (متخزن في قاعدة البيانات، فبيشتغل
//    صح حتى لو السيرفر شغال على منصة سيرفرلس زي Vercel أو خلف أكتر من نسخة)
app.use('/api/invitations', ipLimiter, ensureDeviceId, deviceInvitationLimiter);

// حد خفيف على مستوى الـ IP لردود تأكيد الحضور — أعلى بكتير من حد الجهاز
// (middleware/deviceLimiter.js: rsvpLimiter) عمدًا، عشان ضيوف كتير بيردوا
// من نفس الشبكة (بيت العيلة، شبكة القاعة) ميتحظروش بالغلط.
const rsvpIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جدًا من المحاولات، حاول تاني بعد شوية.' },
});
app.use('/i/:shortId/rsvp', rsvpIpLimiter);

// المعاينة الحية بتتنادى كل شوية وهو بيكتب في الفورم، فمحتاجة سقف أعلى
// بكتير من إنشاء الدعوة الفعلي (مفيش حفظ في قاعدة البيانات هنا أصلًا)
const previewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'استنى شوية وجرب تاني.' },
});
app.use('/api/preview', previewLimiter);

// 3) لوحة التحكم بيها مفتاح سري واحد بيتقارن في كل طلب (routes/admin.js) —
//    من غير حد على عدد المحاولات، أي حد يقدر يجرب يخمّن المفتاح عدد لا
//    نهائي من المرات. الحد هنا منخفض عمدًا لأن الاستخدام الطبيعي للوحة
//    التحكم قليل جدًا مقارنة بباقي الموقع.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جدًا من المحاولات، حاول تاني بعد شوية.' },
});
app.use('/admin/login', adminLoginLimiter);

// اللوحة نفسها (بعد الدخول) بتطلب بيانات كتير — رسوم بيانية، قوايم،
// ملفات عملاء — فحدها لازم يكون واسع. المفتاح مبيتبعتش هنا أصلًا،
// فمفيش حاجة تتخمّن؛ الحد ده لمنع الإغراق بس.
const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جدًا من الطلبات، استنى شوية.' },
});
app.use('/admin/api', adminApiLimiter);

// 4) تسجيل/دخول: حد صارم لكل IP عشان يصعب تخمين باسورد حساب حد (brute force)
//    أو عمل حسابات وهمية بالجملة — أشد بكتير من أي limiter تاني في الموقع
//    لأن الاستخدام الطبيعي لصفحة الدخول قليل جدًا مقارنة ببقية الموقع.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جدًا من المحاولات، حاول تاني بعد شوية.' },
});
app.use('/api/auth', authLimiter);

// 5) الرفع: حد لكل IP عشان محدش يغرق مساحة التخزين (وفاتورتها) بملفات
//    كتير. الفحص الأمني نفسه في utils/uploadSecurity.js — ده حد الكمية بس.
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // ساعة
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'رفعت ملفات كتير في وقت قصير، استنى شوية وجرب تاني.' },
});
app.use('/api/uploads', uploadLimiter);

app.use('/', invitationsRouter);
app.use('/', adminRouter);
app.use('/', adminApiRouter);
app.use('/', authRouter);
app.use('/', packagesRouter);
app.use('/', uploadsRouter);
app.use('/', dashboardRouter);
app.use('/', editorRouter);

// أي GET route تاني مش API معروف بيرجع صفحة React (client/dist/index.html)
// عشان react-router يشتغل صح حتى لو حد عمل refresh على لينك زي /create/xyz
// (اللي مش ملف حقيقي على السيرفر، React نفسه هو اللي بيقرر يعرض إيه).
// ملحوظة: /admin نفسه مستثنى**ش** — لوحة التحكم بقت جزء من تطبيق React،
// فأي مسار زي /admin/clients لازم يرجّع صفحة React. المستثنى هو مسارات
// الـ API بتاعتها بس (/admin/api/…) وتسجيل الدخول والخروج.
const CLIENT_ROUTE_EXCLUDED_PREFIXES = [
  '/api', '/admin/api', '/admin/login', '/admin/logout', '/admin/session',
  '/i/', '/preview-sample',
];
app.get('*', (req, res, next) => {
  if (CLIENT_ROUTE_EXCLUDED_PREFIXES.some((p) => req.path.startsWith(p))) return next();
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

// صفحة 404 بسيطة لأي مسار تاني مش موجود (POST لمسار غلط، إلخ)
app.use((req, res) => {
  res.status(404).send('Not found');
});

// بنشغل app.listen بس لو الملف ده اتنفذ مباشرة (node server.js) —
// ده بيخلي نفس الكود يشتغل صح سواء على VPS تقليدي (app.listen) أو على
// منصة سيرفرلس زي Vercel (اللي بتاخد الـ app نفسه وتستخدمه من غير listen).
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 السيرفر شغال على http://localhost:${PORT}`);
  });
}

module.exports = app;
