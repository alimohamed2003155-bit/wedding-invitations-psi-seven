import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';
import { adminApi } from './adminApi';
import uiReducer from './uiSlice';
import adminReducer from './adminSlice';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
    ui: uiReducer,
    admin: adminReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware, adminApi.middleware),
});
