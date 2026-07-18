// config/db.js
const mongoose = require('mongoose');

// بنكاش الاتصال في متغير عام عشان لو السيرفر شغال على منصة سيرفرلس
// (زي Vercel)، ونفس النسخة اتنادت تاني على نفس الاتصال، مانفتحش اتصال
// جديد بقاعدة البيانات في كل مرة (ده أداء أهم بكتير في بيئة سيرفرلس).
let cached = global._mongooseConn;
if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error(
        'MONGODB_URI مش موجود في متغيرات البيئة — راجع .env.example.'
      );
    }
    mongoose.set('strictQuery', true);
    cached.promise = mongoose.connect(uri).then((m) => {
      console.log('✅ MongoDB متصل بنجاح');
      return m;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
