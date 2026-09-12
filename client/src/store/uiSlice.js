// store/uiSlice.js
// حالة واجهة عابرة للمكوّنات (مودال الدخول/التسجيل) — مكوّنات بعيدة عن بعض
// في الشجرة (زرار "سجل" في الهيدر، وقفل التصميم المميز في المعرض) لازم
// تقدر تفتح نفس المودال، فده أنسب مكان لـ Redux بدل تمرير props/context يدوي.
import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    authModalOpen: false,
    authModalTab: 'login', // 'login' | 'register'
    // اسم العميل اللي لسه مسجّل — وجوده معناه نعرض شاشة الترحيب.
    // في الحالة مش في localStorage: دي لحظة واحدة مش تفضيل بيتحفظ.
    welcomeFor: null,
  },
  reducers: {
    openAuthModal(state, action) {
      state.authModalOpen = true;
      state.authModalTab = action.payload || 'login';
    },
    closeAuthModal(state) {
      state.authModalOpen = false;
    },
    showWelcome(state, action) {
      state.welcomeFor = action.payload || '';
    },
    hideWelcome(state) {
      state.welcomeFor = null;
    },
  },
});

export const {
  openAuthModal, closeAuthModal, showWelcome, hideWelcome,
} = uiSlice.actions;
export default uiSlice.reducer;
