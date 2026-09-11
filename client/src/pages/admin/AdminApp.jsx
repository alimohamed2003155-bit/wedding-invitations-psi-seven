// لوحة التحكم — /admin
//
// التطبيق كله بيتحمّل كسول (React.lazy في App.jsx)، فزائر الموقع العادي
// عمره ما ينزّل كود اللوحة ولا مكتبة الرسوم البيانية.
//
// اللوحة دايمًا عربي RTL بغض النظر عن لغة الموقع — واحد بيستخدمها، وهي
// إنت.
import { useCallback, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  LayoutDashboard, Users, Receipt, FileText, MessageSquare,
  Settings, ScrollText, LogOut, Loader2, Menu, X, Music,
} from 'lucide-react';
import { adminApi } from '../../store/adminApi.js';
import AdminLogin from './AdminLogin.jsx';
import OverviewPage from './OverviewPage.jsx';
import ClientsPage from './ClientsPage.jsx';
import OrdersPage from './OrdersPage.jsx';
import InvitationsPage from './InvitationsPage.jsx';
import MusicPage from './MusicPage.jsx';
import SupportPage from './SupportPage.jsx';
import SettingsPage from './SettingsPage.jsx';
import AuditPage from './AuditPage.jsx';

const NAV = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'نظرة عامة' },
  { to: '/admin/clients', icon: Users, label: 'العملاء' },
  { to: '/admin/orders', icon: Receipt, label: 'الطلبات' },
  { to: '/admin/invitations', icon: FileText, label: 'الدعوات' },
  { to: '/admin/music', icon: Music, label: 'الموسيقى' },
  { to: '/admin/support', icon: MessageSquare, label: 'الدعم' },
  { to: '/admin/settings', icon: Settings, label: 'بيانات الدفع' },
  { to: '/admin/audit', icon: ScrollText, label: 'سجل الإجراءات' },
];

export default function AdminApp() {
  const dispatch = useDispatch();
  const location = useLocation();
  const [auth, setAuth] = useState(null); // null = بنشيك لسه
  const [navOpen, setNavOpen] = useState(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch('/admin/session', { credentials: 'include' });
      const data = await res.json();
      setAuth(!!data.authenticated);
    } catch {
      setAuth(false);
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  // اللوحة عربي دايمًا — بنظبط الاتجاه على الصفحة نفسها ونرجّعه زي ما كان
  // لما نخرج منها، عشان مانلخبطش لغة الموقع لو المستخدم كان بالإنجليزي.
  useEffect(() => {
    const prevDir = document.documentElement.dir;
    const prevLang = document.documentElement.lang;
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
    document.body.classList.add('bg-night');
    return () => {
      document.documentElement.dir = prevDir;
      document.documentElement.lang = prevLang;
      document.body.classList.remove('bg-night');
    };
  }, []);

  // قفل القايمة الجانبية بعد أي تنقل على الموبايل
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  async function logout() {
    await fetch('/admin/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Admin-Request': '1' },
    }).catch(() => {});
    // مسح كل الكاش عشان بيانات العملاء متفضلش في الذاكرة بعد الخروج
    dispatch(adminApi.util.resetApiState());
    setAuth(false);
  }

  if (auth === null) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-night text-[13px] text-ivory/50">
        <Loader2 size={16} className="animate-spin" /> بنتأكد من الجلسة...
      </div>
    );
  }

  if (!auth) return <AdminLogin onSuccess={() => { dispatch(adminApi.util.resetApiState()); setAuth(true); }} />;

  return (
    <div className="min-h-screen bg-night text-ivory" dir="rtl">
      <div className="mx-auto flex max-w-[1500px]">
        {/* القايمة الجانبية */}
        <aside
          className={`fixed inset-y-0 start-0 z-40 w-[232px] shrink-0 border-e border-line-lite bg-panel transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            navOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="flex h-full flex-col p-4">
            <div className="mb-6 flex items-center justify-between px-2 pt-2">
              <div>
                <div className="font-serif text-[17px] font-bold text-brass-soft">ميثاق</div>
                <div className="text-[11px] text-ivory/35">لوحة التحكم</div>
              </div>
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                className="text-ivory/50 hover:text-ivory lg:hidden"
              >
                <X size={17} />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {NAV.map(({ to, end, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-bold transition ${
                      isActive
                        ? 'bg-brass/15 text-brass-soft'
                        : 'text-ivory/55 hover:bg-ivory/[0.05] hover:text-ivory'
                    }`}
                >
                  <Icon size={15} /> {label}
                </NavLink>
              ))}
            </nav>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-bold text-ivory/45 transition hover:bg-error/10 hover:text-error"
            >
              <LogOut size={15} /> خروج
            </button>
          </div>
        </aside>

        {navOpen && (
          <button
            type="button"
            aria-label="اقفل القايمة"
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          />
        )}

        {/* المحتوى */}
        <main className="min-w-0 flex-1 p-5 lg:p-7">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-line-lite px-4 py-2 text-[12.5px] text-ivory/70 lg:hidden"
          >
            <Menu size={15} /> الأقسام
          </button>

          <Routes>
            <Route index element={<OverviewPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="invitations" element={<InvitationsPage />} />
            <Route path="music" element={<MusicPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
