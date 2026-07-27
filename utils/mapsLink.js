// utils/mapsLink.js
// العميل ممكن يلصق أي حاجة في خانة "المكان على خرائط جوجل": لينك مصغّر
// (maps.app.goo.gl)، لينك كامل فيه إحداثيات، أو مجرد اسم/عنوان نصي. الهدف
// إننا نحوّل أي حاجة من دول لرابط تضمين (iframe embed) شغال دايمًا، بدل ما
// نفترض شكل واحد بس وتفضل الخريطة فاضية لو العميل لصق حاجة غير متوقعة.

const FETCH_TIMEOUT_MS = 6000;

function isUrl(str) {
  return /^https?:\/\//i.test(String(str || '').trim());
}

/**
 * بيحاول يستخرج (خط عرض، خط طول) من رابط جوجل مابس بأي شكل شائع من أشكاله.
 * @param {string} url
 * @returns {{lat:string, lng:string}|null}
 */
function extractCoordsFromUrl(url) {
  // الشكل الشائع في لينكات المشاركة: /@24.7136,46.6753,15z
  let m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: m[1], lng: m[2] };

  // شكل تاني بيظهر في لينكات الأماكن التفصيلية: !3d24.7136!4d46.6753
  m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m) return { lat: m[1], lng: m[2] };

  // شكل query صريح: ?q=24.7136,46.6753 أو &destination=24.7136,46.6753
  m = url.match(/[?&](?:q|query|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: m[1], lng: m[2] };

  return null;
}

/**
 * بيحاول يستخرج اسم المكان من مسار لينك جوجل مابس، مثلاً من:
 * https://www.google.com/maps/place/Beldi+Country+Club/@...
 * @param {string} url
 * @returns {string|null}
 */
function extractPlaceNameFromUrl(url) {
  const m = url.match(/\/maps\/place\/([^/@]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1].replace(/\+/g, ' '));
  } catch {
    return null;
  }
}

/**
 * بيتابع أي إعادة توجيه (redirect) لرابط مصغّر (زي maps.app.goo.gl) ويرجع
 * الرابط النهائي بعد التتبع. لو فشل الاتصال أو الوقت خلص، بيرجع null بهدوء
 * (من غير ما يوقف باقي العملية) عشان دايمًا يكون فيه fallback جاهز.
 * @param {string} url
 * @returns {Promise<string|null>}
 */
async function resolveRedirect(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WeddingInviteBot/1.0)' },
    });
    clearTimeout(timeout);
    return response.url || null;
  } catch {
    return null;
  }
}

function textEmbed(text) {
  const q = encodeURIComponent(text);
  return {
    embedSrc: `https://www.google.com/maps?q=${q}&output=embed`,
    directLink: `https://www.google.com/maps/search/?api=1&query=${q}`,
  };
}

function coordsEmbed(lat, lng, directLink) {
  return {
    embedSrc: `https://www.google.com/maps?q=${lat},${lng}&output=embed`,
    directLink: directLink || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  };
}

const SHORT_LINK_HOSTS = ['maps.app.goo.gl', 'goo.gl', 'g.co'];

/**
 * النقطة الرئيسية: بتاخد أي مدخل من العميل (رابط أو نص) وترجع رابط تضمين
 * (iframe) صحيح دايمًا، بالإضافة لرابط "افتح في خرائط جوجل" مباشر.
 *
 * @param {object} p
 * @param {string} p.raw - النص أو اللينك اللي كتبه العميل (ممكن يكون فاضي)
 * @param {string} p.venueName - اسم القاعة (fallback لو مفيش مدخل)
 * @param {string} p.venueCity - المدينة (fallback لو مفيش مدخل)
 * @param {boolean} [p.skipNetwork] - لو true، مبيتابعش أي لينك مصغّر عبر
 *   الشبكة (مستخدم في المعاينة الحية عشان تفضل سريعة وهو بيكتب؛ التتبع
 *   الفعلي للينكات المصغّرة بيحصل مرة واحدة بس وقت الحفظ النهائي للدعوة)
 * @returns {Promise<{embedSrc: string, directLink: string}>}
 */
async function resolveMapInput({ raw, venueName, venueCity, skipNetwork }) {
  const trimmed = String(raw || '').trim();
  const fallbackText = [venueName, venueCity].filter(Boolean).join(', ');

  if (!trimmed) {
    return textEmbed(fallbackText || 'Google Maps');
  }

  if (!isUrl(trimmed)) {
    // مجرد نص (اسم مكان أو عنوان) — أسهل وأضمن حالة
    return textEmbed(trimmed);
  }

  let workingUrl = trimmed;
  let host = '';
  try {
    host = new URL(trimmed).hostname.replace(/^www\./, '');
  } catch {
    // لينك مش صالح الصياغة أصلًا — نتعامل معاه كنص عادي بدل ما نكسر كل حاجة
    return textEmbed(fallbackText || trimmed);
  }

  // لينكات مضمّنة جاهزة من الأساس (نادر، بس لو حصل نستخدمها زي ما هي)
  if (workingUrl.includes('/maps/embed')) {
    return { embedSrc: workingUrl, directLink: trimmed };
  }

  // لينكات مصغّرة محتاجة نتابع الـ redirect بتاعها الأول عشان نوصل للرابط
  // الحقيقي اللي فيه الإحداثيات — بنعملها بس وقت الحفظ الفعلي، مش في كل
  // ضغطة كيبورد وقت المعاينة الحية
  if (!skipNetwork && SHORT_LINK_HOSTS.includes(host)) {
    const resolved = await resolveRedirect(workingUrl);
    if (resolved) workingUrl = resolved;
  }

  const coords = extractCoordsFromUrl(workingUrl);
  if (coords) {
    return coordsEmbed(coords.lat, coords.lng, trimmed);
  }

  const placeName = extractPlaceNameFromUrl(workingUrl);
  if (placeName) {
    return { embedSrc: textEmbed(placeName).embedSrc, directLink: trimmed };
  }

  // آخر حل: مفيش إحداثيات أو اسم مكان قدرنا نستخرجه، بس اللينك يفضل صحيح
  // للفتح المباشر، وللتضمين نستخدم اسم القاعة/المدينة كأقرب تقريب
  return { embedSrc: textEmbed(fallbackText || trimmed).embedSrc, directLink: trimmed };
}

module.exports = { resolveMapInput, isUrl, extractCoordsFromUrl, extractPlaceNameFromUrl };
