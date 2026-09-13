// routes/editor.js
// حفظ تخصيصات الدعوة. كل طلب هنا بيعدي على 3 فحوصات:
//   1) مسجّل دخول
//   2) الدعوة دي بتاعته هو (ownerId) — مش أي دعوة
//   3) الميزة دي مسموحة في باقته (packages/registry.js)
const express = require('express');

const Invitation = require('../models/Invitation');
const User = require('../models/User');
const Track = require('../models/Track');
const { requireAuth } = require('../middleware/auth');
const { packageHasFeature } = require('../packages/registry');
const { getTemplate } = require('../templates/registry');
const { generateShortId } = require('../utils/idGenerator');
const { buildInvitationDataFromRequest } = require('../utils/invitationData');
const { sanitizeText } = require('../utils/sanitize');
const {
  ALLOWED_FONTS, isAllowedFont, isAllowedMediaUrl, isSafeElemId, isSafeColor,
  sanitizeAddedItem, BUILT_IN_SEALS, SEAL_ELEM_ID,
} = require('../utils/customizations');
const { sanitizeShare, defaultShare } = require('../utils/shareTags');

const router = express.Router();

// أقصى عدد مسودات مفتوحة في نفس الوقت لكل عميل. المسودة مبتخصمش من
// الرصيد، فمن غير الحد ده حد يقدر يعمل آلاف الدعوات من غير ما يدفع.
const MAX_OPEN_DRAFTS = 5;

/** بيجيب الدعوة ويتأكد إنها بتاعت اللي طالبها وإنها مميزة */
async function loadOwnedInvitation(req, res) {
  const invitation = await Invitation.findOne({ shortId: req.params.shortId });
  if (!invitation) {
    res.status(404).json({ error: 'الدعوة دي مش موجودة.' });
    return null;
  }
  if (!invitation.ownerId || String(invitation.ownerId) !== req.user.id) {
    // نفس رد "مش موجودة" عشان محدش يعرف إن الكود ده لدعوة موجودة فعلاً
    res.status(404).json({ error: 'الدعوة دي مش موجودة.' });
    return null;
  }
  if (!invitation.isPremium) {
    res.status(403).json({ error: 'المحرر متاح للدعوات المميزة بس — اشترك في باقة.' });
    return null;
  }
  return invitation;
}

/** هل باقة العميل موقوفة من لوحة التحكم؟ */
function isSuspended(user) {
  return !!(user.subscription && user.subscription.status === 'suspended');
}

/** الميزات المتاحة في باقة المستخدم الحالية */
function featuresFor(user) {
  const packageId = user.subscription && user.subscription.packageId;
  if (!packageId) return [];
  // الباقة الموقوفة = مفيش ولا ميزة. الرصيد بيفضل محفوظ زي ما هو لحد ما
  // اللوحة تشغّلها تاني.
  if (isSuspended(user)) return [];
  return ['fonts', 'images', 'music', 'drag', 'videoToImage', 'sections', 'colors'].filter((f) =>
    packageHasFeature(packageId, f)
  );
}

/** البيانات الأساسية بالشكل اللي فورم المحرر بيتوقعه */
function detailsOf(invitation) {
  const d = invitation.weddingDateTime ? new Date(invitation.weddingDateTime) : null;
  const pad = (n) => String(n).padStart(2, '0');
  return {
    templateId: invitation.templateId,
    occasionType: invitation.occasionType,
    language: invitation.language,
    brideName: invitation.brideName,
    groomName: invitation.groomName,
    brideNameAr: invitation.brideNameAr,
    groomNameAr: invitation.groomNameAr,
    venueName: invitation.venueName,
    venueCity: invitation.venueCity,
    venueAddress: invitation.venueAddress || '',
    // لو العميل مادخلش لينك خرائط، السيرفر بيخزّن "اسم القاعة، المدينة"
    // كقيمة مشتقة. لو رجّعناها للفورم زي ما هي، هتفضل متعلقة بالقاعة
    // القديمة لما يغيّر اسم القاعة. فبنسيب الخانة فاضية وهي تتشتق من
    // جديد مع كل حفظ.
    venueMapQuery: invitation.venueMapQuery === `${invitation.venueName}, ${invitation.venueCity}`
      ? ''
      : (invitation.venueMapQuery || ''),
    contactName: invitation.contactName || '',
    contactPhone: invitation.contactPhone || '',
    // <input type="date"> عايز YYYY-MM-DD بالتوقيت المحلي، و toISOString
    // بيحوّل لـ UTC فبيرجّع اليوم اللي قبله لأي حفلة بالليل.
    weddingDate: d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '',
    timeline: (invitation.timeline || []).map((s) => ({ key: s.key, hour: s.hour })),
    hiddenSections: invitation.hiddenSections || [],
  };
}

// POST /api/editor/draft — العميل المشترك ضغط "استخدم القالب ده"
// بننشئ دعوة **مسودة** فورًا (عشان يبقى فيه shortId نفتح عليه المحرر)
// من غير ما نخصم من رصيده. الخصم بيحصل عند النشر بس.
router.post('/api/editor/draft', requireAuth, async (req, res) => {
  try {
    const template = getTemplate((req.body || {}).templateId);
    if (!template) return res.status(400).json({ error: 'القالب ده مش موجود.' });

    if (isSuspended(req.user)) {
      return res.status(403).json({ error: 'باقتك موقوفة مؤقتًا — كلّمنا من خانة الدعم.' });
    }

    const left = (req.user.subscription && req.user.subscription.invitationsLeft) || 0;
    if (left <= 0) {
      return res.status(403).json({ error: 'مافيش رصيد دعوات مميزة في باقتك.' });
    }

    const openDrafts = await Invitation.countDocuments({ ownerId: req.user.id, status: 'draft' });
    if (openDrafts >= MAX_OPEN_DRAFTS) {
      return res.status(429).json({
        error: `عندك ${openDrafts} مسودات مفتوحة — انشر واحدة أو امسحها الأول.`,
      });
    }

    // بيانات مبدئية معقولة عشان التصميم يتعرض من أول لحظة والعميل يشوف
    // شكله وهو بيملا — بيغيّرها كلها من تبويب "بيانات الدعوة".
    const inThreeMonths = new Date();
    inThreeMonths.setMonth(inThreeMonths.getMonth() + 3);
    const pad = (n) => String(n).padStart(2, '0');

    const data = await buildInvitationDataFromRequest({
      templateId: template.id,
      occasionType: template.occasionTypes[0],
      language: template.languages[0],
      brideName: 'Bride', groomName: 'Groom',
      brideNameAr: 'العروسة', groomNameAr: 'العريس',
      venueName: 'Venue', venueCity: 'City',
      weddingDate: `${inThreeMonths.getFullYear()}-${pad(inThreeMonths.getMonth() + 1)}-${pad(inThreeMonths.getDate())}`,
      timeline: template.timelineStages.map((key) => ({ key, hour: 18 })),
      hiddenSections: [],
    }, { skipMapNetwork: true, user: req.user });

    let invitation = null;
    let attempts = 0;
    while (!invitation && attempts < 5) {
      attempts += 1;
      try {
        invitation = await Invitation.create({
          shortId: generateShortId(7),
          creatorDeviceId: req.deviceId || null,
          ownerId: req.user.id,
          isPremium: true,
          status: 'draft',
          ...data,
        });
      } catch (err) {
        if (err.code === 11000) continue;
        throw err;
      }
    }
    if (!invitation) return res.status(500).json({ error: 'حصل خطأ في توليد اللينك، حاول تاني.' });

    return res.status(201).json({ shortId: invitation.shortId });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error creating draft:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر.' });
  }
});

// GET /api/editor/tracks?q= — مكتبة الموسيقى للبحث.
// لازم تكون قبل /api/editor/:shortId عشان "tracks" ماتتقراش كـ shortId.
router.get('/api/editor/tracks', requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 80);
    const filter = { active: true };
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(safe, 'i');
      filter.$or = [{ title: re }, { artist: re }, { mood: re }];
    }
    const tracks = await Track.find(filter).sort({ createdAt: -1 }).limit(80).lean();
    return res.json({
      tracks: tracks.map((t) => ({
        id: String(t._id),
        title: t.title,
        artist: t.artist,
        mood: t.mood,
        url: t.url,
        duration: t.duration || 0,
      })),
    });
  } catch (err) {
    console.error('Error listing tracks for editor:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر.' });
  }
});

// GET /api/editor/:shortId — بيانات المحرر (التخصيصات الحالية + المسموح)
router.get('/api/editor/:shortId', requireAuth, async (req, res) => {
  try {
    const invitation = await loadOwnedInvitation(req, res);
    if (!invitation) return undefined;

    return res.json({
      shortId: invitation.shortId,
      templateId: invitation.templateId,
      status: invitation.status,
      customizations: invitation.customizations || {},
      details: detailsOf(invitation),
      features: featuresFor(req.user),
      // الأقسام اللي القالب ده بيسمح بشيلها — المحرر بيبني منها لوحة
      // "أقسام الدعوة" بدل ما يبقى الكلام ده متاح وقت الإنشاء بس
      optionalSections: (getTemplate(invitation.templateId) || {}).optionalSections || [],
      fonts: ALLOWED_FONTS,
      // أختام التصاميم التلاتة — العميل يبدّل ختم دعوته بأي واحد فيهم
      seals: BUILT_IN_SEALS,
      sealElemId: SEAL_ELEM_ID,
      // العنوان والوصف اللي هيظهروا على واتساب لو العميل مكتبش حاجة —
      // المحرر بيعرضهم كـ placeholder فالعميل شايف الكارت الحقيقي من
      // غير ما يكتب حرف
      shareDefaults: defaultShare(invitation),
      invitationsLeft: (req.user.subscription && req.user.subscription.invitationsLeft) || 0,
    });
  } catch (err) {
    console.error('Error loading editor data:', err);
    return res.status(500).json({ error: 'حصل خطأ في السيرفر.' });
  }
});

// PATCH /api/editor/:shortId/details — بيانات الدعوة (أسماء/تاريخ/قاعة)
// بتعدي على نفس التحقق بتاع الإنشاء بالظبط (utils/invitationData.js)،
// فمفيش طريق جانبي بيدخل منه إدخال مش متفحوص.
router.patch('/api/editor/:shortId/details', requireAuth, async (req, res) => {
  try {
    const invitation = await loadOwnedInvitation(req, res);
    if (!invitation) return undefined;

    // القالب مبيتغيّرش من هنا — اللي عايز قالب تاني يعمل دعوة جديدة.
    // ownsTemplate: الدعوة دي مدفوعة وبتاعته أصلًا (loadOwnedInvitation
    // تأكدت من الاتنين)، فمش بنعيد فحص الباقة — غير كده أول ما رصيده
    // يخلص كان هيقف عن تعديل دعوته اللي دفع فيها.
    const data = await buildInvitationDataFromRequest(
      { ...(req.body || {}), templateId: invitation.templateId },
      { user: req.user, ownsTemplate: true }
    );

    Object.assign(invitation, data);
    await invitation.save();

    return res.json({ ok: true, details: detailsOf(invitation) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error saving invitation details:', err);
    return res.status(500).json({ error: 'حصل خطأ في الحفظ.' });
  }
});

// الحقول اللي لو العميل عدّل نص بيساويها، بنعدّل الحقل نفسه بدل ما
// نخزّن تعديل على عنصر واحد. السبب: اسم العروسة بيظهر في الشاشة
// الرئيسية وفي الفقرة وفي عنوان التاب — لو خزّناه كتعديل عنصر واحد بس،
// هيتغيّر في مكان ويفضل قديم في باقي الدعوة.
const PROPAGATED_FIELDS = [
  'brideNameAr', 'groomNameAr', 'brideName', 'groomName',
  'venueName', 'venueCity', 'venueAddress', 'contactName', 'contactPhone',
];

// PATCH /api/editor/:shortId/text — تعديل نص بالضغط عليه في الدعوة
router.patch('/api/editor/:shortId/text', requireAuth, async (req, res) => {
  try {
    const invitation = await loadOwnedInvitation(req, res);
    if (!invitation) return undefined;

    const { id, oldText } = req.body || {};
    if (!isSafeElemId(id)) return res.status(400).json({ error: 'العنصر ده مش معروف.' });

    // sanitizeText بيشيل أي وسوم/حروف تحكم — والنص بيتعرض كـ textContent
    // برضو وقت العرض، فالحماية من الحقن في طبقتين مش واحدة.
    const newText = sanitizeText((req.body || {}).newText, 600);
    if (!newText) return res.status(400).json({ error: 'النص مايصحش يبقى فاضي.' });

    const c0 = invitation.customizations || {};

    // نص العميل ضافه بنفسه؟ يبقى بيتعدّل في مكانه في قايمة المضاف،
    // مش في خريطة تعديلات نصوص التصميم — وإلا التعديل هيتكتب في مكان
    // والعرض هيقرا من مكان تاني ومش هيبان.
    if (id.indexOf('add_') === 0) {
      const addedId = id.slice(4);
      const list = (c0.added || []).map((item) => (
        String(item.id) === addedId ? { ...item, text: newText } : item
      ));
      invitation.customizations = { ...c0, added: list.map(sanitizeAddedItem).filter(Boolean) };
      invitation.markModified('customizations');
      await invitation.save();
      return res.json({
        ok: true,
        propagatedField: null,
        texts: invitation.customizations.texts || {},
        added: invitation.customizations.added,
        details: detailsOf(invitation),
      });
    }

    const previous = String(oldText || '').trim();
    const propagated = PROPAGATED_FIELDS.find(
      (f) => previous && String(invitation[f] || '').trim() === previous
    );

    if (propagated) {
      // النص ده هو حقل أساسي — نعدّله في مكانه الأصلي فيتغيّر في الدعوة كلها
      invitation[propagated] = newText;
      // ولو كان فيه تعديل قديم على نفس العنصر، بيتشال عشان مايغطّيش عليه
      if (invitation.customizations && invitation.customizations.texts) {
        delete invitation.customizations.texts[id];
        invitation.markModified('customizations');
      }
    } else {
      const c = invitation.customizations || {};
      // كل الحقول بتتنسخ بالاسم — أي حقل يتنسي هنا معناه إن التخصيص
      // بتاعه بيتمسح من غير ما حد يلاحظ أول ما العميل يعدّل أي كلمة.
      invitation.customizations = {
        fontFamily: c.fontFamily || '',
        audioUrl: c.audioUrl || '',
        audioStart: c.audioStart || 0,
        audioEnd: c.audioEnd || 0,
        offsets: { ...(c.offsets || {}) },
        images: { ...(c.images || {}) },
        sizes: { ...(c.sizes || {}) },
        colors: { ...(c.colors || {}) },
        rotations: { ...(c.rotations || {}) },
        calDay: c.calDay || 0,
        added: [...(c.added || [])],
        texts: { ...(c.texts || {}), [id]: newText },
        hidden: [...(c.hidden || [])],
        share: { ...(c.share || {}) },
      };
      invitation.markModified('customizations');
    }

    await invitation.save();

    return res.json({
      ok: true,
      // الواجهة محتاجة تعرف: التعديل مشي على حقل أساسي ولا على عنصر واحد؟
      // لو حقل، لازم تعيد تحميل الدعوة عشان باقي الأماكن تتحدّث.
      propagatedField: propagated || null,
      texts: (invitation.customizations && invitation.customizations.texts) || {},
      details: detailsOf(invitation),
    });
  } catch (err) {
    console.error('Error saving inline text:', err);
    return res.status(500).json({ error: 'حصل خطأ في الحفظ.' });
  }
});

// POST /api/editor/:shortId/publish — دلوقتي بس بيتخصم رصيد واحد
router.post('/api/editor/:shortId/publish', requireAuth, async (req, res) => {
  try {
    const invitation = await loadOwnedInvitation(req, res);
    if (!invitation) return undefined;

    if (invitation.status !== 'draft') {
      return res.json({ ok: true, alreadyPublished: true, path: `/i/${invitation.shortId}` });
    }

    if (isSuspended(req.user)) {
      return res.status(403).json({ error: 'باقتك موقوفة مؤقتًا — كلّمنا من خانة الدعم.' });
    }

    // الشرط جوه الاستعلام نفسه: لو بعت طلبين نشر في نفس اللحظة، واحد بس
    // هيلاقي رصيد ويخصم — مستحيل الرصيد ينزل تحت الصفر.
    const consumed = await User.findOneAndUpdate(
      { _id: req.user.id, 'subscription.invitationsLeft': { $gt: 0 } },
      { $inc: { 'subscription.invitationsLeft': -1 } },
      { new: true }
    );
    if (!consumed) {
      return res.status(403).json({ error: 'مافيش رصيد دعوات مميزة في باقتك.' });
    }

    invitation.status = 'published';
    invitation.publishedAt = new Date();
    try {
      await invitation.save();
    } catch (err) {
      // الحفظ وقع بعد ما خصمنا — نرجّع الرصيد بدل ما يضيع من العميل
      await User.updateOne({ _id: req.user.id }, { $inc: { 'subscription.invitationsLeft': 1 } });
      throw err;
    }

    return res.json({
      ok: true,
      path: `/i/${invitation.shortId}`,
      invitationsLeft: (consumed.subscription && consumed.subscription.invitationsLeft) || 0,
    });
  } catch (err) {
    console.error('Error publishing invitation:', err);
    return res.status(500).json({ error: 'حصل خطأ في النشر.' });
  }
});

// DELETE /api/editor/:shortId — مسح مسودة بس (الدعوة المنشورة مبتتمسحش
// من هنا: ممكن تكون متبعوتة لضيوف فعلاً)
router.delete('/api/editor/:shortId', requireAuth, async (req, res) => {
  try {
    const invitation = await loadOwnedInvitation(req, res);
    if (!invitation) return undefined;

    if (invitation.status !== 'draft') {
      return res.status(400).json({ error: 'الدعوة دي منشورة — مش هينفع تتمسح من هنا.' });
    }

    await Invitation.deleteOne({ _id: invitation._id });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting draft:', err);
    return res.status(500).json({ error: 'حصل خطأ في المسح.' });
  }
});

// PATCH /api/editor/:shortId — حفظ تخصيص واحد أو أكتر
router.patch('/api/editor/:shortId', requireAuth, async (req, res) => {
  try {
    const invitation = await loadOwnedInvitation(req, res);
    if (!invitation) return undefined;

    const allowed = featuresFor(req.user);
    const body = req.body || {};
    const current = invitation.customizations || {};
    const next = {
      fontFamily: current.fontFamily || '',
      audioUrl: current.audioUrl || '',
      audioStart: current.audioStart || 0,
      audioEnd: current.audioEnd || 0,
      offsets: { ...(current.offsets || {}) },
      images: { ...(current.images || {}) },
      // النصوص بتتعدّل من مسار /text لوحده — بنحافظ عليها هنا بس عشان
      // الحفظ التلقائي للتخصيصات التانية مايمسحهاش
      texts: { ...(current.texts || {}) },
      sizes: { ...(current.sizes || {}) },
      colors: { ...(current.colors || {}) },
      rotations: { ...(current.rotations || {}) },
      calDay: current.calDay || 0,
      added: [...(current.added || [])],
      hidden: [...(current.hidden || [])],
      share: { ...(current.share || {}) },
    };

    // كارت المشاركة (اللي بيظهر على واتساب)
    if (body.share !== undefined) {
      const clean = sanitizeShare(body.share);
      // الصورة بتترفع زي أي صورة تانية، فبتتبع نفس صلاحية الصور
      if (clean && clean.image && !allowed.includes('images')) {
        return res.status(403).json({ error: 'باقتك مافيهاش تغيير الصور.' });
      }
      next.share = clean || { title: '', description: '', image: '' };
    }

    // الخط
    if (body.fontFamily !== undefined) {
      if (!allowed.includes('fonts')) return res.status(403).json({ error: 'باقتك مافيهاش تغيير الخط.' });
      if (body.fontFamily && !isAllowedFont(body.fontFamily)) {
        return res.status(400).json({ error: 'الخط ده مش متاح.' });
      }
      next.fontFamily = body.fontFamily || '';
    }

    // الموسيقى
    if (body.audioUrl !== undefined) {
      if (!allowed.includes('music')) return res.status(403).json({ error: 'باقتك مافيهاش تغيير الموسيقى.' });
      if (body.audioUrl && !isAllowedMediaUrl(body.audioUrl)) {
        return res.status(400).json({ error: 'رابط الملف مش مقبول.' });
      }
      next.audioUrl = body.audioUrl || '';
    }

    // حدود قص الأغنية بالثواني
    if (body.audioStart !== undefined || body.audioEnd !== undefined) {
      if (!allowed.includes('music')) return res.status(403).json({ error: 'باقتك مافيهاش تغيير الموسيقى.' });
      const sec = (v, fallback) => {
        const n = Number(v);
        return Number.isFinite(n) && n >= 0 ? Math.min(36000, Math.round(n * 10) / 10) : fallback;
      };
      next.audioStart = sec(body.audioStart, next.audioStart || 0);
      next.audioEnd = sec(body.audioEnd, next.audioEnd || 0);
      // نهاية قبل البداية مالهاش معنى — بنلغي القص بدل ما نسيب قيمة غلط
      if (next.audioEnd && next.audioEnd <= next.audioStart) next.audioEnd = 0;
    }

    // الإزاحات (السحب)
    // استبدال كامل مش دمج: المحرر بيبعت الخريطة كاملة في كل حفظة، ولو
    // دمجنا كان "رجّع كل الأماكن زي الأصل" هيبان إنه اشتغل على الشاشة
    // والإزاحات القديمة تفضل في الداتابيز وترجع مع أول إعادة تحميل.
    if (body.offsets !== undefined) {
      if (!allowed.includes('drag')) return res.status(403).json({ error: 'باقتك مافيهاش تحريك النصوص.' });
      next.offsets = {};
      Object.keys(body.offsets || {}).forEach((id) => {
        if (!isSafeElemId(id)) return;
        const o = body.offsets[id] || {};
        next.offsets[id] = { dx: Number(o.dx) || 0, dy: Number(o.dy) || 0 };
      });
    }

    // الصور
    if (body.images !== undefined) {
      if (!allowed.includes('images')) return res.status(403).json({ error: 'باقتك مافيهاش تغيير الصور.' });
      Object.keys(body.images || {}).forEach((id) => {
        if (!isSafeElemId(id)) return;
        const url = body.images[id];
        if (url && isAllowedMediaUrl(url)) next.images[id] = url;
        else if (!url) delete next.images[id];
      });
    }

    // مقاس الخط لكل جملة — مش ميزة باقة، ده تنسيق دعوته هو.
    // استبدال كامل زي الإزاحات: أي مقاس مش موجود في اللي اتبعت معناه
    // إن العميل رجّعه لمقاس التصميم الأصلي.
    if (body.sizes !== undefined) {
      next.sizes = {};
      Object.keys(body.sizes || {}).forEach((id) => {
        if (!isSafeElemId(id)) return;
        const px = Number(body.sizes[id]);
        if (!Number.isFinite(px)) return;
        next.sizes[id] = Math.max(8, Math.min(200, Math.round(px)));
      });
    }

    // الألوان (مربعات الزي المقترح) — ميزة باقة زي ما هي معلن عليها
    if (body.colors !== undefined) {
      if (!allowed.includes('colors')) {
        return res.status(403).json({ error: 'تغيير الألوان مش في باقتك.' });
      }
      next.colors = {};
      Object.keys(body.colors || {}).forEach((id) => {
        if (!isSafeElemId(id) || !isSafeColor(body.colors[id])) return;
        next.colors[id] = String(body.colors[id]).toLowerCase();
      });
    }

    // زوايا الميل — زي المقاس: تنسيق العميل في دعوته، مش ميزة باقة.
    // استبدال كامل عشان "رجّع للأصل" يشتغل صح.
    if (body.rotations !== undefined) {
      next.rotations = {};
      Object.keys(body.rotations || {}).forEach((id) => {
        if (!isSafeElemId(id)) return;
        const deg = Number(body.rotations[id]);
        if (!Number.isFinite(deg)) return;
        next.rotations[id] = Math.max(-180, Math.min(180, Math.round(deg * 10) / 10));
      });
    }

    // اليوم المعلّم في نتيجة الشهر (1–31، و0 معناها يوم الفرح زي ما هو)
    if (body.calDay !== undefined) {
      const day = Math.round(Number(body.calDay));
      next.calDay = Number.isFinite(day) && day >= 1 && day <= 31 ? day : 0;
    }

    // النصوص المضافة — استبدال كامل، وكل عنصر بيتنضّف ويتحط في حدوده.
    // مش ميزة باقة لوحدها: أي صاحب دعوة مميزة يقدر يضيف كلام في دعوته.
    if (body.added !== undefined) {
      const list = Array.isArray(body.added) ? body.added : [];
      if (list.length > 60) {
        return res.status(400).json({ error: 'أقصى عدد نصوص مضافة 60.' });
      }
      next.added = list.map(sanitizeAddedItem).filter(Boolean);
    }

    // إخفاء عناصر مفردة (زرار السلة اللي بيظهر لما يضغط على أي جزء).
    // مش مربوط بميزة باقة: ده تعديل العميل في دعوته هو، زي تعديل النص
    // بالظبط. ميزة 'sections' في الباقات معناها إخفاء أقسام كاملة من
    // تبويب البيانات، وده حقل تاني خالص (invitation.hiddenSections).
    if (body.hidden !== undefined) {
      next.hidden = (body.hidden || []).filter(isSafeElemId).slice(0, 200);
    }

    invitation.customizations = next;
    invitation.markModified('customizations');
    await invitation.save();

    return res.json({ ok: true, customizations: next });
  } catch (err) {
    console.error('Error saving customizations:', err);
    return res.status(500).json({ error: 'حصل خطأ في الحفظ.' });
  }
});

module.exports = router;
