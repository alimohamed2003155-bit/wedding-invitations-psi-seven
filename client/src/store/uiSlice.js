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
  },
  reducers: {
    openAuthModal(state, action) {
      state.authModalOpen = true;
      state.authModalTab = action.payload || 'login';
    },
    closeAuthModal(state) {
      state.authModalOpen = false;
    },
  },
});

export const { openAuthModal, closeAuthModal } = uiSlice.actions;
export default uiSlice.reducer;
