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
const { ensureDeviceId, deviceInvitationLimiter } = require('./middleware/deviceLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// أمان أساسي على مستوى الـ HTTP headers
// (contentSecurityPolicy متقفلة هنا لأن تصميم الدعوة بيحمّل فيديو وخطوط من
// سيرفرات خارجية (tildacdn.net) — لو حبيت تشددها لاحقًا، ظبط القيم في CSP directives)
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
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
app.use('/admin', requireDB);
app.use('/i', requireDB);

// صفحة إنشاء الدعوة + أي ملفات ثابتة تانية
// (ملحوظة: لو استضفت المشروع على Vercel، فولدر public بيتقدّم من الـ CDN
// بتاعهم مباشرة وبيتجاهل السطر ده تلقائيًا — راجع README لو مش فاهم ليه)
app.use(express.static(path.join(__dirname, 'public')));

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

app.use('/', invitationsRouter);

// صفحة 404 بسيطة لأي مسار مش موجود
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
