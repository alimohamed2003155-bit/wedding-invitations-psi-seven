# wedding-invitations

منصة لإنشاء دعوات زفاف/خطوبة شخصية، لكل دعوة لينك فريد خاص بيها.

## التشغيل محليًا

### الباك إند (Express + MongoDB)

```bash
npm install
cp .env.example .env   # واملأ القيم الحقيقية جواه
npm run dev
```

السيرفر بيشتغل افتراضيًا على `http://localhost:3000`.

### الفرونت إند (React — `client/`)

الموقع التسويقي/فورم الإنشاء (`/` و`/create/:templateId`) مبني بـ React + Redux Toolkit + Vite، وبيتقدم من نفس سيرفر Express (من `client/dist` بعد البناء). صفحات الدعوة النهائية (`views/*.html`) ولوحة التحكم (`/admin`) لسه HTML عادي زي ما كانوا، من غير أي تغيير.

**وقت التطوير** (Hot reload على أي تعديل في React، محتاج الباك إند شغال في تاب تاني):
```bash
npm run client:install   # مرة واحدة بس
npm run client:dev       # فاتح على http://localhost:5173، وبيعمل proxy لـ /api على Express
```

**قبل أي تشغيل إنتاج (`npm start`)**، لازم تبني نسخة React الجاهزة الأول:
```bash
npm run client:build     # بيطلع client/dist اللي Express بيقدمها
npm start
```

## متغيرات البيئة (.env)

راجع `.env.example` لشرح كل متغير. أهمها:

- `MONGODB_URI` — رابط الاتصال بقاعدة بيانات MongoDB (إجباري).
- `ADMIN_SECRET` — كلمة سر لوحة التحكم. بتتدخل مرة واحدة في صفحة دخول
  `/admin/stats` (مش في الـ URL) وبعدها جلسة بكوكي httpOnly بتتابعها
  (`middleware/adminAuth.js`) — بيفضل صالح 24 ساعة.
- `ALLOWED_ORIGINS` — اختياري؛ دومينات خارجية (لو فيه) مسموح لها تتواصل مع
  الـ API عبر CORS. الموقع نفسه (الصفحة الرئيسية وصفحات الدعوات ولوحة
  التحكم) بيشتغل صح من غيره تمامًا، لأنه كله من نفس الأوريجن.

## هيكل المشروع

- `server.js` — نقطة الدخول: الأمان (helmet/CSP/CORS)، الـ rate limiting،
  وربط كل الـ routes، وتقديم `client/dist` (React) مع SPA fallback.
- `client/` — الموقع التسويقي/فورم الإنشاء (React + Redux Toolkit + Vite).
  راجع قسم "التشغيل محليًا" فوق.
- `routes/invitations.js` — إنشاء/عرض/معاينة الدعوات + تأكيد الحضور (RSVP)
  + فحص القوالب المميزة (`isPremium`, راجع `templates/registry.js`).
- `routes/auth.js` — تسجيل/دخول/خروج المستخدمين (حسابات، مش الأدمن).
- `routes/admin.js` — لوحة تحكم بمفتاح سري واحد (جلسة بكوكي، مش في الـ URL).
- `middleware/auth.js` — جلسات المستخدمين (`req.user`).
- `middleware/adminAuth.js` — جلسة لوحة التحكم.
- `middleware/deviceLimiter.js` — حد الإنشاء لكل جهاز (كوكي، من غير حساب).
- `models/` — سكيمات Mongoose (Invitation، Rsvp، RateLimit، User، Session،
  AdminSession).
- `templates/registry.js` — سجل كل تصاميم الدعوات المتاحة، وهل كل واحد
  مجاني ولا محتاج تسجيل دخول (`isPremium`). لإضافة تصميم جديد: حط ملفه في
  `views/`، وضيف سطر جديد هنا — من غير ما تلمس أي كود تاني في السيرفر أو
  الفورم.
- `views/*.html` — ملفات التصاميم نفسها. كل واحد فيه سكريبت
  `window.WEDDING_CONFIG` بيتحقن من السيرفر وقت الطلب.
- `i18n/` — كل النصوص الثابتة (عربي/إنجليزي/فرنساوي)، ونص فقرة الدعوة
  الرئيسية حسب اللغة والمناسبة.
- `utils/` — أدوات مشتركة: توليد اللينكات القصيرة، تنسيق التاريخ، تنضيف
  المدخلات، تحويل لينكات الخرائط، ورندر صفحة الدعوة النهائية.

## النشر (Vercel)

المشروع مبني عشان يشتغل على منصة سيرفرلس زي Vercel — الاتصال بقاعدة
البيانات متخزّن (cached) بين الطلبات بدل ما يتفتح اتصال جديد في كل مرة.
