// store/api.js
// كل تواصل مع الباك إند (Express) من هنا بس — RTK Query بيدير الـ
// loading/error/caching state تلقائيًا بدل fetch يدوي في كل مكوّن.
// credentials:'include' ضروري عشان كوكي الجلسة (httpOnly، middleware/auth.js
// في الباك إند) يتبعت مع كل الطلبات، حتى وقت التطوير لما React بيتقدم من
// بورت Vite (5173) والـ API متعمل له proxy لبورت Express (3000).
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({ baseUrl: '/api', credentials: 'include' });

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Me', 'Packages', 'Dashboard', 'Support', 'Editor'],
  endpoints: (builder) => ({
    // بنبعت اللغة عشان أسماء التصاميم وأوصافها وأسماء الأقسام ترجع مترجمة
    getTemplates: builder.query({
      query: (lang = 'en') => `/templates?lang=${encodeURIComponent(lang)}`,
    }),
    getPublicStats: builder.query({
      query: () => '/public-stats',
    }),
    getMe: builder.query({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),
    login: builder.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    register: builder.mutation({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    logout: builder.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      invalidatesTags: ['Me'],
    }),
    // بيرجع HTML خام (صفحة الدعوة الكاملة) مش JSON — لازم responseHandler
    // مخصص عشان RTK Query يقراه كنص بدل ما يحاول يعمل JSON.parse عليه.
    preview: builder.mutation({
      query: (body) => ({
        url: '/preview',
        method: 'POST',
        body,
        responseHandler: (response) => response.text(),
      }),
    }),
    createInvitation: builder.mutation({
      query: (body) => ({ url: '/invitations', method: 'POST', body }),
      invalidatesTags: ['Packages'],
    }),
    // الباقات بتتقفل على حالة تسجيل الدخول (العملة والرصيد بيتغيروا)،
    // فبنربطها بـ Me عشان تتحدّث لوحدها بعد الدخول أو الخروج.
    getPackages: builder.query({
      query: (lang = 'en') => `/packages?lang=${encodeURIComponent(lang)}`,
      providesTags: ['Packages', 'Me'],
    }),
    orderPackage: builder.mutation({
      query: (body) => ({ url: '/packages/order', method: 'POST', body }),
      invalidatesTags: ['Packages'],
    }),
    getPaymentInfo: builder.query({
      query: () => '/packages/payment-info',
      providesTags: ['Me'],
    }),
    getDashboard: builder.query({
      query: () => '/dashboard',
      providesTags: ['Dashboard'],
    }),
    getRsvps: builder.query({
      query: (shortId) => `/dashboard/rsvps/${shortId}`,
    }),
    getSupport: builder.query({
      query: () => '/dashboard/support',
      providesTags: ['Support'],
    }),
    sendSupportMessage: builder.mutation({
      query: (body) => ({ url: '/dashboard/support', method: 'POST', body }),
      invalidatesTags: ['Support', 'Dashboard'],
    }),
    uploadPaymentProof: builder.mutation({
      query: (formData) => ({ url: '/uploads/payment-proof', method: 'POST', body: formData }),
      invalidatesTags: ['Packages'],
    }),

    // ===== المحرر المباشر =====
    // بيرجع التخصيصات المحفوظة + الميزات المسموحة في باقة المستخدم +
    // قايمة الخطوط. الباك إند هو اللي بيقرر المسموح، مش الواجهة.
    getEditor: builder.query({
      query: (shortId) => `/editor/${shortId}`,
      providesTags: ['Editor'],
    }),
    saveCustomizations: builder.mutation({
      query: ({ shortId, ...body }) => ({ url: `/editor/${shortId}`, method: 'PATCH', body }),
      // مش بنعمل invalidate لـ Editor عشان المحرر مايعملش reload للـ iframe
      // بعد كل حفظ — الحالة المحلية أحدث من السيرفر أصلاً.
      invalidatesTags: ['Dashboard'],
    }),
    // العميل المشترك بيضغط "استخدم القالب ده" فبنعمله مسودة على طول
    // ونوديه المحرر — من غير ما نخصم من رصيده لحد ما ينشر.
    createDraft: builder.mutation({
      query: (body) => ({ url: '/editor/draft', method: 'POST', body }),
      invalidatesTags: ['Dashboard'],
    }),
    // تعديل نص بالضغط عليه جوه الدعوة. السيرفر بيقرر: لو النص ده اسم
    // عروسة/قاعة، بيعدّل الحقل نفسه (فيتغيّر في الدعوة كلها) ويرجّع
    // propagatedField؛ غير كده بيخزّنه كتعديل على العنصر ده لوحده.
    saveText: builder.mutation({
      query: ({ shortId, ...body }) => ({ url: `/editor/${shortId}/text`, method: 'PATCH', body }),
      invalidatesTags: ['Dashboard'],
    }),
    saveDetails: builder.mutation({
      query: ({ shortId, ...body }) => ({
        url: `/editor/${shortId}/details`, method: 'PATCH', body,
      }),
      invalidatesTags: ['Dashboard'],
    }),
    publishInvitation: builder.mutation({
      query: (shortId) => ({ url: `/editor/${shortId}/publish`, method: 'POST' }),
      invalidatesTags: ['Dashboard', 'Me', 'Packages', 'Editor'],
    }),
    deleteDraft: builder.mutation({
      query: (shortId) => ({ url: `/editor/${shortId}`, method: 'DELETE' }),
      invalidatesTags: ['Dashboard'],
    }),
    // مكتبة الموسيقى اللي الأدمن بيرفعها
    getLibraryTracks: builder.query({
      query: (q = '') => `/editor/tracks?q=${encodeURIComponent(q)}`,
    }),
    uploadImage: builder.mutation({
      query: (formData) => ({ url: '/uploads/image', method: 'POST', body: formData }),
    }),
    uploadAudio: builder.mutation({
      query: (formData) => ({ url: '/uploads/audio', method: 'POST', body: formData }),
    }),
  }),
});

export const {
  useGetTemplatesQuery,
  useGetPublicStatsQuery,
  useGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  usePreviewMutation,
  useCreateInvitationMutation,
  useGetPackagesQuery,
  useOrderPackageMutation,
  useGetPaymentInfoQuery,
  useGetDashboardQuery,
  useGetRsvpsQuery,
  useGetSupportQuery,
  useSendSupportMessageMutation,
  useUploadPaymentProofMutation,
  useGetEditorQuery,
  useSaveCustomizationsMutation,
  useCreateDraftMutation,
  useSaveDetailsMutation,
  useSaveTextMutation,
  usePublishInvitationMutation,
  useDeleteDraftMutation,
  useGetLibraryTracksQuery,
  useUploadImageMutation,
  useUploadAudioMutation,
} = api;
