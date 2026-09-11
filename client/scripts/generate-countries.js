// scripts/generate-countries.js
// بيولّد src/data/countries.js من مكتبة world-countries (npm run generate:countries).
// بنولّده مرة بدل ما نستورد المكتبة كاملة وقت التشغيل، لأنها بتجيب معاها
// بيانات كتير مش محتاجينها (عملات، حدود، إحداثيات، لغات...) وبتضاعف حجم
// الـ bundle النهائي بدون أي داعي — إحنا محتاجين بس كود الدولة، اسمها
// بالعربي، وعلمها.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import countries from 'world-countries';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// بنولّد الاسم بالعربي والإنجليزي مع بعض عشان القايمة تشتغل في اللغتين
const options = countries
  .map((c) => ({
    value: c.cca2,
    ar: `${c.flag} ${c.translations.ara?.common || c.name.common}`,
    en: `${c.flag} ${c.name.common}`,
  }))
  .sort((a, b) => a.en.localeCompare(b.en, 'en'));

const outPath = path.join(__dirname, '..', 'src', 'data', 'countries.js');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  `// ⚠️ اتولد تلقائيًا من مكتبة world-countries — متعدلش الملف ده يدوي.\n` +
    `// لتحديثه: npm run generate:countries (scripts/generate-countries.js)\n` +
    `export const COUNTRY_OPTIONS = ${JSON.stringify(options, null, 2)};\n`
);

console.log(`✅ wrote ${options.length} countries to ${outPath}`);
