// routes/uploads.js
// رفع الصور والصوت. الملف بيعدي على السيرفر الأول عشان نفحصه فعليًا
// (utils/uploadSecurity.js) قبل ما يوصل Cloudinary — لو سمحنا للمتصفح
// يرفع مباشرة، مكناش هنقدر نمنع ملف خبيث قبل ما يتخزن.
const express = require('express');
const multer = require('multer');

const { getCloudinary, isCloudinaryReady } = require('../config/cloudinary');
const { validateImage, validateAudio, MAX_AUDIO_BYTES } = require('../utils/uploadSecurity');
const { requireAuth } = require('../middleware/auth');
const { requireAdminSession } = require('../middleware/adminAuth');
const Order = require('../models/Order');

const router = express.Router();

// الملف بيتخزن في الذاكرة مؤقتًا (مش على القرص) عشان نفحصه ونرفعه
// ونرميه. الحد هنا خط دفاع أول — multer بيقطع الطلب قبل ما يتقرا كله.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES, files: 1 },
});

/** بيرفع البافر لـ Cloudinary ويرجع الرابط النهائي */
function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

/** رسالة موحدة لو المفاتيح مش متظبطة */
function ensureReady(res) {
  if (isCloudinaryReady()) return true;
  res.status(503).json({ error: 'خدمة رفع الملفات مش متظبطة على السيرفر دلوقتي.' });
  return false;
}

// POST /api/uploads/image — صورة عامة (صور الدعوة)
router.post('/api/uploads/image', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!ensureReady(res)) return undefined;
    if (!req.file) return res.status(400).json({ error: 'مفيش ملف مرفوع.' });

    const check = await validateImage(req.file.buffer);
    if (!check.ok) return res.status(400).json({ error: check.error });

    const result = await uploadBuffer(req.file.buffer, {
      folder: `mithaq/users/${req.user.id}/images`,
      resource_type: 'image',
      // إعادة الترميز: Cloudinary بيعيد بناء الصورة من الأول، فأي بيانات
      // مدسوسة جواها (سكريبت، ميتاداتا خبيثة) بتتشال في الطريق.
      transformation: [{ width: 2000, height: 2000, crop: 'limit', fetch_format: 'auto', quality: 'auto' }],
      // مانسمحش لـ Cloudinary يخمّن النوع من الاسم
      format: check.mime === 'image/png' ? 'png' : 'jpg',
    });

    return res.status(201).json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    console.error('Image upload failed:', err);
    return res.status(500).json({ error: 'الرفع فشل، حاول تاني.' });
  }
});

// POST /api/uploads/audio — موسيقى الدعوة
router.post('/api/uploads/audio', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!ensureReady(res)) return undefined;
    if (!req.file) return res.status(400).json({ error: 'مفيش ملف مرفوع.' });

    const check = await validateAudio(req.file.buffer);
    if (!check.ok) return res.status(400).json({ error: check.error });

    const result = await uploadBuffer(req.file.buffer, {
      folder: `mithaq/users/${req.user.id}/audio`,
      resource_type: 'video', // Cloudinary بيعامل الصوت تحت video
    });

    return res.status(201).json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    console.error('Audio upload failed:', err);
    return res.status(500).json({ error: 'الرفع فشل، حاول تاني.' });
  }
});

// POST /admin/api/tracks/upload — رفع أغنية لمكتبة الموسيقى.
// نفس فحص الصوت العادي بالظبط (نوع حقيقي + حجم)، بس صلاحيته للأدمن.
router.post('/admin/api/tracks/upload', requireAdminSession, upload.single('file'), async (req, res) => {
  try {
    if (!ensureReady(res)) return undefined;
    if (!req.file) return res.status(400).json({ error: 'مفيش ملف مرفوع.' });

    const check = await validateAudio(req.file.buffer);
    if (!check.ok) return res.status(400).json({ error: check.error });

    const result = await uploadBuffer(req.file.buffer, {
      folder: 'mithaq/library/music',
      resource_type: 'video', // Cloudinary بيعامل الصوت تحت video
    });

    return res.status(201).json({
      url: result.secure_url,
      publicId: result.public_id,
      // Cloudinary بيرجّع المدة بالثواني — بنستخدمها كحدود للقص
      duration: Math.round(result.duration || 0),
    });
  } catch (err) {
    console.error('Track upload failed:', err);
    return res.status(500).json({ error: 'الرفع فشل، حاول تاني.' });
  }
});

// POST /api/uploads/payment-proof — صورة إيصال التحويل
// بتتربط بالطلب المعلّق بتاع العميل عشان تظهر لك في لوحة التحكم.
router.post('/api/uploads/payment-proof', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!ensureReady(res)) return undefined;
    if (!req.file) return res.status(400).json({ error: 'مفيش ملف مرفوع.' });

    const check = await validateImage(req.file.buffer);
    if (!check.ok) return res.status(400).json({ error: check.error });

    const order = await Order.findOne({ userId: req.user.id, status: 'pending' }).sort({ createdAt: -1 });
    if (!order) {
      return res.status(400).json({ error: 'مفيش طلب باقة مستني — اطلب الباقة الأول.' });
    }

    const result = await uploadBuffer(req.file.buffer, {
      folder: `mithaq/payment-proofs/${req.user.id}`,
      resource_type: 'image',
      transformation: [{ width: 2000, height: 2000, crop: 'limit', fetch_format: 'auto', quality: 'auto' }],
      format: check.mime === 'image/png' ? 'png' : 'jpg',
    });

    order.paymentProofUrl = result.secure_url;
    order.paymentProofAt = new Date();
    await order.save();

    return res.status(201).json({ ok: true, url: result.secure_url });
  } catch (err) {
    console.error('Payment proof upload failed:', err);
    return res.status(500).json({ error: 'الرفع فشل، حاول تاني.' });
  }
});

// لو الملف أكبر من الحد، multer بيرمي خطأ خاص — بنرد برسالة مفهومة
// بدل ما الطلب يقع بشكل غامض.
router.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'حجم الملف كبير جدًا.' });
  }
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: 'الملف مرفوض.' });
  }
  return next(err);
});

module.exports = router;
