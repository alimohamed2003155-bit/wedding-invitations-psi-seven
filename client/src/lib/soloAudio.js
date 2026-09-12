// صوت واحد بس في نفس الوقت.
//
// المشكلة: في المحرر فيه تلات مصادر صوت مستقلة —
//   1) موسيقى الدعوة نفسها (جوه الـ iframe)
//   2) معاينة أغاني المكتبة في الشريط الجانبي
//   3) مشغّل القص (audio controls) تحت السلايدرات
// كل واحد مبيعرفش عن التاني حاجة، فالعميل كان بيضغط تشغيل على أغنية
// والدعوة شغالة، فيسمع الاتنين فوق بعض ومش فاهم إزاي يسكّت واحدة.
//
// الحل: مسجّل واحد. أي صوت قبل ما يشتغل بيقول للمسجّل، والمسجّل بيسكّت
// اللي قبله — سواء كان في الصفحة أو جوه الـ iframe.
//
// بنسمع على حدث play في مرحلة الالتقاط كمان، فأي عنصر صوت جديد
// يتضاف بعدين بيتحكم فيه تلقائيًا من غير ما حد يفتكر يسجّله.

/** بتتنادى عشان نسكّت صوت الدعوة جوه الـ iframe */
let pauseFrame = () => {};

/** المحرر بيسجّل بيها طريقة الكلام مع الـ iframe */
export function setFramePauser(fn) {
  pauseFrame = typeof fn === 'function' ? fn : () => {};
}

// عناصر مش في الصفحة (new Audio) — دي مبتظهرش في أي بحث في الـ DOM،
// فلازم تتسجّل بإيدينا وإلا هتفضل شغالة ومحدش شايفها. ومعاينة أغاني
// المكتبة بالظبط من النوع ده.
const detached = new Set();

/** بيسجّل عنصر صوت مش موجود في الصفحة */
export function registerAudio(el) {
  if (el) detached.add(el);
  return () => detached.delete(el);
}

/** بيسكّت كل الأصوات ما عدا اللي بيشتغل دلوقتي */
function pauseOthers(except) {
  const stop = (el) => {
    if (!el || el === except || el.muted || el.paused) return;
    try { el.pause(); } catch { /* */ }
  };
  document.querySelectorAll('audio, video').forEach(stop);
  detached.forEach(stop);
}

/**
 * بيتنادى قبل أي تشغيل من الشريط الجانبي.
 * @param {HTMLMediaElement|null} el العنصر اللي هيشتغل (لو موجود)
 */
export function claimAudio(el) {
  pauseOthers(el || null);
  pauseFrame();
}

let installed = false;

/**
 * بيركّب الحارس مرة واحدة. أي عنصر صوت في الصفحة يبدأ يشتغل، بيسكّت
 * الباقي ويسكّت الدعوة — حتى لو مين كتب الكود نسي ينادي claimAudio.
 */
export function installSoloAudio() {
  if (installed || typeof document === 'undefined') return () => {};
  installed = true;

  const onPlay = (e) => {
    const el = e.target;
    if (!el || (el.tagName !== 'AUDIO' && el.tagName !== 'VIDEO')) return;
    if (el.muted) return;
    pauseOthers(el);
    pauseFrame();
  };

  document.addEventListener('play', onPlay, true);
  return () => {
    document.removeEventListener('play', onPlay, true);
    installed = false;
  };
}
