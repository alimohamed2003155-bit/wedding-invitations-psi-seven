// store/adminSlice.js
// حالة واجهة لوحة التحكم (فلاتر، فترة، اللي مفتوح دلوقتي).
// البيانات نفسها كلها في adminApi — هنا اختيارات المستخدم بس.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // فترة الرسوم البيانية بالأيام
  period: 30,
  // فلاتر قايمة العملاء
  usersQuery: '',
  usersStatus: 'all', // all | premium | free | suspended | blocked
  usersPage: 1,
  // العميل المفتوح ملفه
  openUserId: null,
  // فلتر الطلبات
  ordersStatus: 'pending',
  // بحث الدعوات
  invitationsQuery: '',
  invitationsPage: 1,
  // محادثة الدعم المفتوحة
  openThreadId: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setPeriod: (s, a) => { s.period = a.payload; },
    setUsersQuery: (s, a) => { s.usersQuery = a.payload; s.usersPage = 1; },
    setUsersStatus: (s, a) => { s.usersStatus = a.payload; s.usersPage = 1; },
    setUsersPage: (s, a) => { s.usersPage = a.payload; },
    openUser: (s, a) => { s.openUserId = a.payload; },
    closeUser: (s) => { s.openUserId = null; },
    setOrdersStatus: (s, a) => { s.ordersStatus = a.payload; },
    setInvitationsQuery: (s, a) => { s.invitationsQuery = a.payload; s.invitationsPage = 1; },
    setInvitationsPage: (s, a) => { s.invitationsPage = a.payload; },
    openThread: (s, a) => { s.openThreadId = a.payload; },
  },
});

export const {
  setPeriod, setUsersQuery, setUsersStatus, setUsersPage,
  openUser, closeUser, setOrdersStatus,
  setInvitationsQuery, setInvitationsPage, openThread,
} = adminSlice.actions;

export default adminSlice.reducer;
