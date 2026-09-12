// config/db.js
const dns = require('dns');
const mongoose = require('mongoose');

// بعض الشبكات (خصوصًا على Windows) بتدّي الجهاز DNS server بعنوان IPv6
// link-local، ومحلل الـ DNS اللي Node بيستخدمه (c-ares) بيفشل في عمل
// SRV lookup (اللي مطلوب لـ mongodb+srv://) على عناوين زي دي، حتى لو
// نظام التشغيل نفسه بيحلها عادي. الحل: نضيف DNS servers عامة كـ fallback.
dns.setServers([...dns.getServers(), '8.8.8.8', '1.1.1.1']);



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
    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 8000, // فشل بسرعة بدل ما الطلبات تتكوم مستنية
      })
      .then((m) => {
        console.log('✅ MongoDB متصل بنجاح');
        // تصليح أي فهرس قديم مخالف للسكيما الحالية — بيشتغل مرة واحدة
        // لكل نسخة سيرفر، وفشله مايأثرش على أي طلب (utils/ensureIndexes.js)
        require('../utils/ensureIndexes')().catch(() => {});
        return m;
      })
      .catch((err) => {
        // مهم جدًا: لو فشل الاتصال، لازم نصفّر الـ promise المخزّن عشان
        // الطلب الجاي يحاول من الأول بدل ما يفضل عالق على نفس المحاولة
        // الفاشلة للأبد (وده كان بيحصل قبل كده — أي انقطاع مؤقت في قاعدة
        // البيانات كان بيوقف الموقع كله لحد ما يتعمل إعادة نشر يدوي).
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}

module.exports = connectDB;
