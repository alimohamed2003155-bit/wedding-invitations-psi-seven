// routes/packages.js
// عرض الباقات بسعر عملة المستخدم، وتسجيل طلب شراء.
// الدفع نفسه بيتم برّه الموقع دلوقتي، والتفعيل يدوي من لوحة التحكم
// (routes/admin.js) — الطلب هنا بيسجّل نية الشراء بس.
const express = require('express');

const Order = require('../models/Order');
const { getPackage, packagesForCountry, currencyForCountry } = require('../packages/registry');
const { requireAuth } = require('../middleware/auth');
const { getPaymentSettings, publicPaymentInfo } = require('../utils/paymentSettings');

const router = express.Router();

// GET /api/packages — الباقات بالعملة المناسبة.
//
// الأسعار مبتظهرش لزائر مش مسجّل خالص. السبب عملي مش تسويقي: السعر
// نفسه بيختلف حسب دولة العميل (جنيه للمصريين، دولار لغيرهم)، ودولته
// بتتعرف من حسابه. فلو وريناه أسعار قبل ما يسجّل، هنبقى بنوريه سعر
// ممكن يتغيّر قدامه بعد التسجيل — وده أسوأ من إننا نستناه يسجّل.
router.get('/api/packages', (req, res) => {
  if (!req.user) {
    return res.json({ requiresAuth: true, packages: [], currency: null, subscription: null });
  }
  const country = req.user.country;
  return res.json({
    requiresAuth: false,
    packages: packagesForCountry(country, req.query.lang),
    currency: currencyForCountry(country),
    subscription: req.user.subscription || null,
  });
});

// GET /api/packages/payment-info — بيانات التحويل حسب بلد العميل:
// المصري بيشوف فودافون كاش، وغيره بيشوف الحساب البنكي. البيانات نفسها
// بتتحكم فيها من لوحة التحكم (utils/paymentSettings.js).
router.get('/api/packages/payment-info', requireAuth, async (req, res) => {
  try {
    const doc = await getPaymentSettings();
    return res.json(publicPaymentInfo(doc, req.user.country));
  } catch (err) {
    console.error('Error loading payment info:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر.' });
  }
});

// POST /api/packages/order — تسجيل طلب شراء (محتاج تسجيل دخول)
router.post('/api/packages/order', requireAuth, async (req, res) => {
  try {
    const pkg = getPackage(req.body && req.body.packageId);
    if (!pkg) {
      return res.status(400).json({ error: 'الباقة دي مش موجودة.' });
    }

    const currency = currencyForCountry(req.user.country);

    // لو عنده طلب معلّق لنفس الباقة، مانعملش طلب جديد فوقه
    const existing = await Order.findOne({
      userId: req.user.id,
      packageId: pkg.id,
      status: 'pending',
    });
    if (existing) {
      return res.status(200).json({ ok: true, orderId: String(existing._id), alreadyPending: true });
    }

    const order = await Order.create({
      userId: req.user.id,
      packageId: pkg.id,
      currency,
      price: pkg.price[currency],
    });

    return res.status(201).json({ ok: true, orderId: String(order._id) });
  } catch (err) {
    console.error('Error creating order:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر، حاول تاني بعد شوية.' });
  }
});

module.exports = router;
