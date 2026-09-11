import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// السيرفر الحقيقي (Express) شغال على 3000 — أي حاجة API بتتعمل لها proxy
// وقت التطوير عشان المتصفح يشوف أوريجن واحد بس، زي بالظبط اللي هيحصل في
// الإنتاج (React مبني بيتقدم من نفس Express)، فمفيش حاجة CORS تتلمس خالص.
// ملحوظة: /admin نفسه **مش** هنا — لوحة التحكم صفحة React، فلازم Vite
// يقدّمها هو. اللي بيتعمل له proxy هو الـ API بتاعها بس.
const API_TARGETS = [
  '/api', '/admin/api', '/admin/login', '/admin/logout', '/admin/session',
  '/i', '/preview-sample',
];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: Object.fromEntries(
      API_TARGETS.map((p) => [p, { target: 'http://localhost:3000', changeOrigin: true }])
    ),
  },
});
