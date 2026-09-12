import { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import AuthBar from './components/AuthBar.jsx';
import AuthModal from './components/AuthModal.jsx';
import WelcomeGate from './components/WelcomeGate.jsx';
import GalleryPage from './pages/GalleryPage.jsx';
import CreateInvitationPage from './pages/CreateInvitationPage.jsx';
import PackagesPage from './pages/PackagesPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EditorPage from './pages/EditorPage.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

/**
 * استيراد كسول بيعرف يصحّى نفسه.
 *
 * الملف الكسول اسمه فيه بصمة المحتوى، فبيتغيّر مع كل رفع. تاب مفتوح من
 * قبل الرفع بيفضل يطلب الاسم القديم اللي اتشال — الاستيراد بيفشل
 * والصفحة بتطلع بيضا. هنا بنجرّب تاني مرة، ولو فشلت بنعيد تحميل الصفحة
 * من السيرفر مرة واحدة بس عشان تيجي بأسماء الملفات الجديدة.
 */
function lazyWithReload(factory, key) {
  return lazy(() => factory().catch(() => factory().catch((err) => {
    const flag = 'mithaq:chunk-reload:' + key;
    let tried = false;
    try { tried = sessionStorage.getItem(flag) === '1'; } catch { /* تصفح خاص */ }
    if (tried) throw err;
    try { sessionStorage.setItem(flag, '1'); } catch { /* */ }
    window.location.reload();
    // بنرجّع وعد مش بيخلص عشان React مايرسمش حاجة والصفحة بتتحمّل
    return new Promise(() => {});
  })));
}

// لوحة التحكم بتتحمّل كسول: زائر الموقع العادي عمره ما ينزّل كودها ولا
// مكتبة الرسوم البيانية اللي جواها (recharts).
const AdminApp = lazyWithReload(() => import('./pages/admin/AdminApp.jsx'), 'admin');

export default function App() {
  const { pathname } = useLocation();
  // المحرر بياخد الشاشة كلها (شريط أدوات + معاينة بحجمها الحقيقي)،
  // ولوحة التحكم ليها شريطها الخاص — فشريط الحساب العلوي بيتشال منهم.
  const isFullScreen = pathname.startsWith('/editor/') || pathname.startsWith('/admin');

  return (
    <ErrorBoundary>
      {!isFullScreen && <AuthBar />}
      <Routes>
        <Route path="/" element={<GalleryPage />} />
        <Route path="/create/:templateId" element={<CreateInvitationPage />} />
        <Route path="/packages" element={<PackagesPage />} />
        <Route path="/checkout/:packageId" element={<CheckoutPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/editor/:shortId" element={<EditorPage />} />
        <Route
          path="/admin/*"
          element={(
            // حاجز خاص بلوحة التحكم كمان: لو ملفها الكسول فشل، الخطأ
            // ميوقعش الموقع كله
            <ErrorBoundary>
              <Suspense fallback={<div className="min-h-screen bg-night" />}>
                <AdminApp />
              </Suspense>
            </ErrorBoundary>
          )}
        />
      </Routes>
      {!isFullScreen && <AuthModal />}
      {/* برّه الشرط بالقصد: التسجيل ممكن يحصل وهو في المحرر أو لوحته */}
      <WelcomeGate />
    </ErrorBoundary>
  );
}
