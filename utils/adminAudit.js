// utils/adminAudit.js
// تسجيل الإجراءات الإدارية. بينادى بعد ما الإجراء ينجح فعلًا.
//
// مقصود إنه مايرميش خطأ أبدًا: فشل الكتابة في السجل مايصحش يفشّل إجراء
// إداري نجح خلاص (تفعيل باقة عميل دافع مثلًا).
const AdminAudit = require('../models/AdminAudit');

/** بياخد IP الحقيقي لو الموقع ورا بروكسي (Vercel/Cloudflare) */
function ipOf(req) {
  const forwarded = String((req.headers && req.headers['x-forwarded-for']) || '');
  const first = forwarded.split(',')[0].trim();
  return (first || req.ip || '').slice(0, 60);
}

/**
 * @param {import('express').Request} req
 * @param {string} action مثلاً 'user.suspend'
 * @param {{type?: string, id?: string, label?: string}} target
 * @param {object} [meta] تفاصيل إضافية (قبل/بعد)
 */
function logAdminAction(req, action, target = {}, meta = {}) {
  AdminAudit.create({
    action,
    targetType: target.type || '',
    targetId: target.id ? String(target.id) : '',
    targetLabel: target.label || '',
    meta,
    ip: ipOf(req),
  }).catch((err) => {
    console.error('Failed to write admin audit entry:', err.message);
  });
}

module.exports = { logAdminAction };
