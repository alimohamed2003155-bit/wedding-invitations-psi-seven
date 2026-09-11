// utils/templateFixes.js
// إصلاحات عرض بتتحقن فوق تصاميم Tilda من غير ما نلمس ملفات views/*.html
// (الملفات دي مصدّرة من Tilda، وأي تعديل مباشر فيها بيضيع لو اتصدّرت تاني).
//
// المشكلة اللي بتتصلح هنا:
// خانة الوقت في "برنامج حفل الزفاف" عرضها ثابت 75px وخطها 30px، والوقت
// بالعربي ("5:00 مساءً") أعرض من كده — فكان بينزل سطرين ويطبع فوق اسم
// الفقرة اللي تحته (أو فوق الوقت اللي بعده). ظاهرة في التلات تصاميم.
// الحل: نمنع الالتفاف، فالوقت يفضل سطر واحد ويتمدد على الجانبين (النص
// متوسّط أصلًا) بدل ما ينزل لتحت ويتداخل.

const TEMPLATE_FIX_SCRIPT = `
<script>
(function () {
  // أي عنصر نصه بيبدأ بوقت (5:00 ...) هو خانة وقت في جدول البرنامج
  var TIME_RE = /^\\s*\\d{1,2}:\\d{2}\\b/;

  function fixTimes() {
    var atoms = document.querySelectorAll('.tn-atom');
    for (var i = 0; i < atoms.length; i++) {
      var el = atoms[i];
      if (el.getAttribute('data-wda-time-fixed')) continue;
      var text = (el.textContent || '').trim();
      if (!TIME_RE.test(text)) continue;
      el.setAttribute('data-wda-time-fixed', '1');
      el.style.whiteSpace = 'nowrap';
      el.style.overflow = 'visible';
    }
  }

  // ===== الخريطة اللي بتتدفن تحت الرسمة =====
  // في قسم المكان، كل عناصر Tilda متظبط ليها z-index رقم (3 مثلاً) ما
  // عدا العنصر اللي بنحقن فيه الخريطة — طالع من التصدير بـ z-index:auto.
  // وكلهم position:absolute فوق بعض، فأي عنصر برقم بيتغطّى فوق الخريطة:
  // في قالب Viktor & Paula رسمة المبنى كانت مغطّية الخريطة بالكامل ومش
  // باين منها غير ركن صغير.
  // الحل: نرفع عنصر الخريطة فوق أعلى أخ ليه في نفس القسم.
  function fixMapLayer() {
    var maps = document.querySelectorAll('iframe[src*="google.com/maps"], iframe[src*="maps.google"]');
    for (var i = 0; i < maps.length; i++) {
      var host = maps[i].closest('[data-elem-id]');
      if (!host || host.getAttribute('data-wda-map-fixed')) continue;
      var rec = host.closest('.t-rec');
      if (!rec) continue;

      var top = 0;
      var siblings = rec.querySelectorAll('[data-elem-id]');
      for (var j = 0; j < siblings.length; j++) {
        var z = parseInt(getComputedStyle(siblings[j]).zIndex, 10);
        if (!isNaN(z) && z > top) top = z;
      }

      host.setAttribute('data-wda-map-fixed', '1');
      host.style.setProperty('z-index', String(top + 1), 'important');
      // ولو موقعه static لأي سبب، الـ z-index مش هيشتغل أصلاً
      if (getComputedStyle(host).position === 'static') {
        host.style.setProperty('position', 'relative', 'important');
      }
    }
  }

  fixTimes();
  fixMapLayer();
  document.addEventListener('DOMContentLoaded', function () { fixTimes(); fixMapLayer(); });
  window.addEventListener('load', function () { fixTimes(); fixMapLayer(); });

  // الأوقات بتتحقن من سكريبت التصميم نفسه بعد التحميل، فبنعيد المحاولة
  // شوية ثواني بدل ما نفترض إنها موجودة من أول لحظة.
  var tries = 0;
  var timer = setInterval(function () {
    fixTimes();
    fixMapLayer();
    if (++tries > 20) clearInterval(timer);
  }, 250);
})();
</script>
`;

/**
 * بتحقن أي HTML إضافي قبل قفل الـ body.
 * @param {string} html
 * @param {string} extra
 * @returns {string}
 */
function injectBeforeBodyEnd(html, extra) {
  if (!extra) return html;
  const closingBody = html.lastIndexOf('</body>');
  if (closingBody === -1) return html + extra;
  return html.slice(0, closingBody) + extra + html.slice(closingBody);
}

/**
 * بتحقن إصلاحات العرض قبل قفل الـ body.
 * @param {string} html
 * @returns {string}
 */
function injectTemplateFixes(html) {
  return injectBeforeBodyEnd(html, TEMPLATE_FIX_SCRIPT);
}

module.exports = { injectTemplateFixes, injectBeforeBodyEnd };
