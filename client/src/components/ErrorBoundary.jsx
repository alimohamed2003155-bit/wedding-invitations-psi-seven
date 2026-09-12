// آخر خط دفاع ضد الشاشة البيضا.
//
// في React، أي خطأ وقت الرسم بيشيل الشجرة كلها من الصفحة — يعني
// المستخدم بيقعد قصاد صفحة فاضية من غير ما يعرف حصل إيه ولا يقدر يعمل
// حاجة. الحاجز ده بيمسك الخطأ ويعرض رسالة مفهومة وزراير يكمّل بيها.
//
// مهم: الحاجز بيمسك أخطاء **الرسم** بس. أخطاء جوه المعالجات (onClick)
// ووعود مرفوضة مش بتعدي من هنا — دي بتتعالج في مكانها.
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // بيفضل في الكونسول عشان لو العميل بعتلنا صورة نعرف السبب
    console.error('انهيار في الواجهة:', error, info && info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ivory p-8 text-center">
        <p className="font-serif text-[19px] font-bold text-ink">حصلت مشكلة غير متوقعة</p>
        <p className="max-w-[420px] text-[13.5px] leading-[1.9] text-ink-dim">
          شكل في حاجة وقفت الصفحة. تعديلاتك المحفوظة زي ما هي — جرّب تعيد
          تحميل الصفحة، ولو المشكلة اتكررت كلّمنا وقولنا كنت بتعمل إيه بالظبط.
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-night px-6 py-2.5 text-[13px] font-bold text-ivory hover:bg-emerald"
          >
            إعادة تحميل الصفحة
          </button>
          <a
            href="/dashboard"
            className="rounded-full border border-line px-6 py-2.5 text-[13px] font-bold text-ink hover:border-ink/35"
          >
            رجوع للوحة التحكم
          </a>
        </div>
        {/* التفاصيل للفضول بس — مطوية عشان ماتخضّش العميل */}
        <details className="mt-3 max-w-[520px] text-start">
          <summary className="cursor-pointer text-[11.5px] text-ink-dim">تفاصيل تقنية</summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-ink/[0.05] p-3 text-[11px] text-ink-dim">
            {String(error && (error.stack || error.message || error))}
          </pre>
        </details>
      </div>
    );
  }
}
