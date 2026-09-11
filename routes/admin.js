// routes/admin.js
// دخول وخروج لوحة التحكم بس. اللوحة نفسها بقت تطبيق React
// (client/src/pages/admin) وبياناتها كلها في routes/adminApi.js.
//
// المفتاح (ADMIN_SECRET) بيتبعت مرة واحدة هنا، وبعدها جلسة بكوكي httpOnly
// بتتابع الدخول (middleware/adminAuth.js) — بدل ما يفضل المفتاح متسجل في
// الـ URL (server logs، تاريخ المتصفح) في كل طلب.
const express = require('express');

const {
  isValidAdminKey, createAdminSession, destroyAdminSession, hasValidAdminSession,
} = require('../middleware/adminAuth');

const router = express.Router();

router.post('/admin/login', async (req, res) => {
  const key = req.body && req.body.key;
  if (!isValidAdminKey(key)) {
    // رسالة واحدة لكل حالات الفشل — من غير تفرقة بين "مفيش مفتاح متظبط
    // على السيرفر" و"المفتاح غلط"، عشان مانديش أي معلومة لحد بيجرّب.
    return res.status(401).json({ error: 'كلمة السر غلط.' });
  }
  try {
    await createAdminSession(req, res);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error creating admin session:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر.' });
  }
});

router.post('/admin/logout', async (req, res) => {
  try {
    await destroyAdminSession(req, res);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error destroying admin session:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر.' });
  }
});

// بترجع 200 دايمًا — واجهة اللوحة بتسأل الأول عشان تعرف تعرض شاشة الدخول
// ولا اللوحة، من غير ما تتعامل مع حالة خطأ.
router.get('/admin/session', async (req, res) => {
  const valid = await hasValidAdminSession(req);
  return res.json({ authenticated: valid });
});

module.exports = router;
