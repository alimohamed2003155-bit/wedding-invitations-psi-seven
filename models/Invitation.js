// models/Invitation.js
const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  shortId: { type: String, required: true, unique: true, index: true },

  brideName: { type: String, required: true, maxlength: 80 },
  groomName: { type: String, required: true, maxlength: 80 },
  brideNameAr: { type: String, required: true, maxlength: 80 },
  groomNameAr: { type: String, required: true, maxlength: 80 },

  venueName: { type: String, required: true, maxlength: 120 },
  venueCity: { type: String, required: true, maxlength: 120 },
  venueMapQuery: { type: String, maxlength: 160 },

  // مصدر الحقيقة الوحيد للمعاد — كل الأشكال التانية (فرنساوي/عربي/عداد) بتتحسب منه وقت العرض
  weddingDateTime: { type: Date, required: true },

  viewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Invitation', invitationSchema);
