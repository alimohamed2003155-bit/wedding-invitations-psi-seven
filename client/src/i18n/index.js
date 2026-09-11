// i18n/index.js
// إعداد الترجمة. العربي هو الأساسي — الموقع بيفتح عليه لأي زائر جديد،
// والإنجليزي بيتختار من زرار اللغة وبيتحفظ في المتصفح عشان يفضل مختار.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './translations.js';

const STORAGE_KEY = 'wda_lang';
export const SUPPORTED = ['ar', 'en'];
export const DEFAULT_LANG = 'ar';

function readStoredLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED.includes(saved) ? saved : DEFAULT_LANG;
  } catch {
    // بعض المتصفحات بتمنع التخزين (تصفح خاص) — نرجع للأساسي عادي
    return DEFAULT_LANG;
  }
}

/** بتظبط اتجاه الصفحة ولغتها على وسم <html> */
export function applyDocumentLang(lang) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', dir);
}

export function setLanguage(lang) {
  const next = SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;
  i18n.changeLanguage(next);
  applyDocumentLang(next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* التخزين مش متاح — التغيير هيفضل شغال للجلسة دي بس */
  }
}

const initialLang = readStoredLang();

i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  fallbackLng: DEFAULT_LANG,
  interpolation: { escapeValue: false }, // React بيهرّب النصوص لوحده
});

applyDocumentLang(initialLang);

export default i18n;
