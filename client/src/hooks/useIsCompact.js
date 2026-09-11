// هل إحنا على شاشة صغيرة (موبايل/تابلت رأسي)؟
//
// ليه هوك بدل ما نعتمد على كلاسات Tailwind بس: في المحرر الفرق مش شكلي.
// على الموبايل الشريط الجانبي بيبقى درج بينفتح ويتقفل، والمعاينة بتاخد
// عرض الشاشة كلها، وفيه عناصر بتتشال من الشريط العلوي خالص. ده منطق
// لازم JavaScript يعرفه، مش CSS بس.
//
// الحد 1023px = نفس حد `lg` في Tailwind، عشان الاتنين مايختلفوش أبدًا.
import { useEffect, useState } from 'react';

const QUERY = '(max-width: 1023px)';

export default function useIsCompact() {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = (e) => setCompact(e.matches);
    // بنقرا القيمة تاني هنا كمان — ممكن تكون اتغيّرت بين أول رسم و الـ effect
    setCompact(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return compact;
}
