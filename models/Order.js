// models/Order.js
// طلب شراء باقة. دلوقتي الدفع بيتم برّه الموقع (إنستاباي/فودافون كاش/واتساب)
// والتفعيل يدوي من لوحة التحكم — فالطلب ده بيسجّل نية الشراء عشان تظهر
// لصاحب الموقع ويفعّلها. لما نضيف بوابة دفع أوتوماتيك بعدين، هي اللي
// هتغيّر status لـ paid من غير ما نغيّر باقي النظام.
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  packageId: { type: String, required: true },      // basic | plus | pro
  currency: { type: String, required: true },       // EGP | USD
  price: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'activated', 'cancelled'],
    default: 'pending',
    index: true,
  },
  // صورة إيصال التحويل اللي العميل بيرفعها (routes/uploads.js) — بتظهرلك
  // في لوحة التحكم جنب الطلب عشان تراجعها قبل التفعيل
  paymentProofUrl: { type: String, default: null },
  paymentProofAt: { type: Date, default: null },

  activatedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
