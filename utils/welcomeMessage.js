// utils/welcomeMessage.js
// رسالة ترحيب بتتحط في صندوق رسايل العميل أول ما يسجّل.
//
// ليه في صندوق الرسايل مش بوب-أب بس: الشاشة اللي بتظهر وقت التسجيل
// بتروح بمجرد ما يقفلها. الرسالة دي بتفضل مستنياه في حسابه، وبتفتح
// خط كلام معاه من غير ما يبدأ هو — واللي بيرد على رسالة بيقرب خطوة
// من إنه يشتري. وكمان بتخليه يعرف إن وراها ناس بتتكلم، مش موقع أوتوماتيك.
//
// بتتكتب كأنها من صاحب الموقع (from: 'admin')، وبتظهر في لوحة التحكم
// عندك عادي عشان لو رد تشوف رده في سياقه.
const SupportMessage = require('../models/SupportMessage');

/** الاسم الأول بس — "أهلًا يا محمد" أدفى من الاسم الرباعي */
function firstName(full) {
  return String(full || '').trim().split(/\s+/)[0] || '';
}

function welcomeBody(name) {
  const who = firstName(name);
  return [
    `أهلًا بيك${who ? ' يا ' + who : ''} في ميثاق 🤍`,
    '',
    'حسابك جاهز. تقدر تبدأ تعمل دعوتك دلوقتي من أي تصميم، ولينك الدعوة',
    'بيبقى شغال على طول وتبعته لضيوفك زي ما هو.',
    '',
    'ولو حبيت تخلي الدعوة على مزاجك بالظبط — تغيّر الخط والصور والموسيقى،',
    'وتحرّك أي كلام مكانه — دي بتيجي مع الباقات، وتقدر تشوفها من صفحة',
    'الباقات في أي وقت.',
    '',
    'وأي حاجة تحتاجها أو مش فاهمها، ابعتلي هنا في نفس المكان ده وهرد عليك.',
  ].join('\n');
}

/**
 * بتحط رسالة الترحيب. مقصود إنها مترميش خطأ أبدًا: لو فشلت لأي سبب،
 * التسجيل نفسه لازم يكمّل عادي — رسالة ترحيب مايصحّش توقف حساب جديد.
 * @param {{_id: any, name?: string}} user
 */
function sendWelcomeMessage(user) {
  if (!user || !user._id) return Promise.resolve();
  return SupportMessage.create({
    userId: user._id,
    from: 'admin',
    body: welcomeBody(user.name),
    // متقرّية من ناحيتك: دي مش رسالة محتاجة ردك، وماينفعش تظهرلك
    // كأن فيه عميل مستنيك
    readByAdmin: true,
    readByUser: false,
  }).catch((err) => {
    console.error('Welcome message failed:', err.message);
  });
}

module.exports = { sendWelcomeMessage, welcomeBody, firstName };
