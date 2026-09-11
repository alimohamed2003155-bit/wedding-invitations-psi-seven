import { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import AuthBar from './components/AuthBar.jsx';
import AuthModal from './components/AuthModal.jsx';
import GalleryPage from './pages/GalleryPage.jsx';
import CreateInvitationPage from './pages/CreateInvitationPage.jsx';
import PackagesPage from './pages/PackagesPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EditorPage from './pages/EditorPage.jsx';

// لوحة التحكم بتتحمّل كسول: زائر الموقع العادي عمره ما ينزّل كودها ولا
// مكتبة الرسوم البيانية اللي جواها (recharts).
const AdminApp = lazy(() => import('./pages/admin/AdminApp.jsx'));

export default function App() {
  const { pathname } = useLocation();
  // المحرر بياخد الشاشة كلها (شريط أدوات + معاينة بحجمها الحقيقي)،
  // ولوحة التحكم ليها شريطها الخاص — فشريط الحساب العلوي بيتشال منهم.
  const isFullScreen = pathname.startsWith('/editor/') || pathname.startsWith('/admin');

  return (
    <>
      {!isFullScreen && <AuthBar />}
      <Routes>
        <Route path="/" element={<GalleryPage />} />
        <Route path="/create/:templateId" element={<CreateInvitationPage />} />
        <Route path="/packages" element={<PackagesPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/editor/:shortId" element={<EditorPage />} />
        <Route
          path="/admin/*"
          element={(
            <Suspense fallback={<div className="min-h-screen bg-night" />}>
              <AdminApp />
            </Suspense>
          )}
        />
      </Routes>
      {!isFullScreen && <AuthModal />}
    </>
  );
}
