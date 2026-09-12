// المحرر المباشر — /editor/:shortId
//
// الفكرة: الدعوة الحقيقية بتتعرض جوه iframe (نفس الـ HTML اللي الضيف
// هيشوفه بالظبط)، والشريط الجانبي ده مجرد "ريموت كنترول" بيبعت أوامر
// للـ iframe بـ postMessage. كده مفيش نسخة تانية من التصميم ممكن تفرق
// عن الأصل، وملفات views/*.html مبتتلمسش خالص.
//
// الأمان: كل ميزة بتتقفل مرتين — هنا في الواجهة (للشكل) وفي
// routes/editor.js على السيرفر (للجد). الواجهة مش مصدر ثقة.
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight, Type, ImageIcon, Music, Move, Lock, Check, Loader2,
  Smartphone, Monitor, PenLine, RotateCcw, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Upload, AlertCircle, Crown, FileText,
  Rocket, Trash2, ExternalLink, Copy, MousePointerClick, Undo2,
  PlayCircle, RotateCw, Layers, ALargeSmall, Minus, Plus, CalendarDays, Sparkles,
  MapPin, Redo2, Palette, Stamp, TypeOutline, Share2,
} from 'lucide-react';
import {
  useGetEditorQuery,
  useSaveCustomizationsMutation,
  useSaveTextMutation,
  useSaveDetailsMutation,
  usePublishInvitationMutation,
  useDeleteDraftMutation,
  useUploadImageMutation,
  useUploadAudioMutation,
} from '../store/api.js';
import MusicPanel from '../components/editor/MusicPanel.jsx';
import SharePanel from '../components/editor/SharePanel.jsx';
import BigScreenNotice, { hintDismissed } from '../components/editor/BigScreenNotice.jsx';
import useIsCompact from '../hooks/useIsCompact.js';
import { tooBig, sizeError, uploadError } from '../lib/uploadLimits.js';

const SHELL = 'mithaq-shell';
const RUNTIME = 'mithaq-editor';

// ===== درج الأدوات على الموبايل =====
// الدرج ليه وضعين بس: مقفول (المقبض + التبويبات ظاهرين) ومفتوح.
//
// المعاينة بتسيب تحتها مساحة **الجزء الظاهر دايمًا** بس (المقبض
// والتبويبات)، مش ارتفاع الدرج وهو مفتوح. يعني لما الدرج يفتح بيعدّي
// فوق الدعوة بدل ما يزقّها ويغيّر مقاسها — ده اللي كل محرر على الموبايل
// بيعمله، وبيمنع الدعوة إنها ترقص كل ما تفتح لوحة.
const SHEET_PEEK_FALLBACK = 118; // لحد ما القياس الحقيقي يحصل
const SHEET_PANEL = '44vh';      // ارتفاع محتوى الدرج وهو مفتوح

// التبويبات اللي مالهاش feature مش مميزات باقة — دي تعديل العميل في
// دعوته هو (النص، البيانات)، وأي صاحب دعوة مميزة لازم يقدر يعملها.
// مفيش تبويب "بيانات" خالص: كل كلام في الدعوة بيتعدّل بالضغط عليه،
// والتاريخ بيتعدّل بنتيجة بتفتح لما تضغط عليه.
const TABS = [
  { id: 'inline', icon: MousePointerClick, feature: null, label: 'editor.tabInline' },
  { id: 'font', icon: Type, feature: 'fonts', label: 'editor.tabFont' },
  { id: 'photos', icon: ImageIcon, feature: 'images', label: 'editor.tabPhotos' },
  { id: 'music', icon: Music, feature: 'music', label: 'editor.tabMusic' },
  { id: 'layout', icon: Move, feature: 'drag', label: 'editor.tabLayout' },
  // كارت المشاركة مش ميزة باقة: كل صاحب دعوة مميزة لازم يقدر يظبط
  // شكل لينكه على واتساب — ده جزء من دعوته مش إضافة
  { id: 'share', icon: Share2, feature: null, label: 'editor.tabShare' },
];

/** الكلام ده تاريخ؟ (فيه سنة زي 2027) — ساعتها بنفتحله نتيجة بدل كتابة */
const looksLikeDate = (text) => /\b20\d{2}\b/.test(String(text || ''));

/**
 * خانة المكان: بتقبل لينك خرائط جوجل كامل، أو لينك مصغّر، أو مجرد
 * اسم مكان — السيرفر بيحوّلهم كلهم لخريطة مدمجة (utils/mapsLink.js).
 * الحفظ بضغطة صريحة مش تلقائي، لأنه بيعيد تحميل الدعوة.
 */
function MapField({ value, busy, onSave }) {
  const { t } = useTranslation();
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);

  return (
    <div className="flex flex-col gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSave(text); }}
        placeholder={t('editor.mapPlaceholder')}
        maxLength={300}
        className="w-full rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-ink focus:border-emerald focus:outline-none"
      />
      <button
        type="button"
        disabled={busy || text === value}
        onClick={() => onSave(text)}
        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald px-4 py-2 text-[12.5px] font-bold text-ivory hover:brightness-110 disabled:opacity-45"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
        {t('editor.mapSave')}
      </button>
    </div>
  );
}

/** قسم مقفول — بيبان مكان الأداة بدل ما تختفي، عشان العميل يعرف إن في أكتر */
function LockedPanel() {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-dashed border-line bg-ivory/60 p-6 text-center">
      <Lock size={20} className="mx-auto text-ink-dim" />
      <p className="mt-3 text-[13.5px] text-ink-dim">{t('editor.locked')}</p>
      <Link
        to="/packages"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-brass to-brass-soft px-5 py-2.5 text-[13px] font-extrabold text-[#241608] hover:brightness-105"
      >
        <Crown size={13} /> {t('editor.lockedCta')}
      </Link>
    </div>
  );
}

export default function EditorPage() {
  const { shortId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const { data, isLoading, isError, refetch } = useGetEditorQuery(shortId);
  const [saveCustomizations, { isLoading: isSaving }] = useSaveCustomizationsMutation();
  const [saveText] = useSaveTextMutation();
  const [saveDetails] = useSaveDetailsMutation();
  const [publishInvitation, { isLoading: publishing }] = usePublishInvitationMutation();
  const [deleteDraft, { isLoading: deleting }] = useDeleteDraftMutation();
  const [uploadImage, { isLoading: uploadingImage }] = useUploadImageMutation();
  const [uploadAudio, { isLoading: uploadingAudio }] = useUploadAudioMutation();

  const iframeRef = useRef(null);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);

  // بيتغيّر بعد حفظ البيانات الأساسية عشان الـ iframe يعيد التحميل
  // ويعرض الأسماء والتاريخ الجداد فورًا.
  const [frameKey, setFrameKey] = useState(0);
  const [copied, setCopied] = useState(false);
  // وضع التشغيل: بنحمّل الدعوة زي ما الضيف بيشوفها بالظبط (من غير
  // ?edit=1) — يعني شاشة الغلاف والموسيقى والأنميشن كلها بتشتغل من الأول.
  const [playing, setPlaying] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [hasCover, setHasCover] = useState(false);
  const [tab, setTab] = useState('inline');
  const [device, setDevice] = useState('mobile');
  // ===== وضع الموبايل =====
  const compact = useIsCompact();
  // الدرج بيفتح مقفول: أول حاجة العميل يشوفها هي دعوته كاملة، مش لوحة
  // أدوات نصها مقصوص. المقبض قدامه وواضح إنه بيتسحب.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showBigScreenHint, setShowBigScreenHint] = useState(false);
  // ارتفاع الجزء الظاهر من الدرج — بيتقاس فعليًا مش بالتخمين، لأنه
  // بيفرق حسب اللغة وحسب وجود زرار الغلاف من عدمه
  const peekRef = useRef(null);
  const [peekH, setPeekH] = useState(SHEET_PEEK_FALLBACK);
  const [selected, setSelected] = useState(null);
  const [pickedImage, setPickedImage] = useState(null);
  const [counts, setCounts] = useState(null);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [textSaving, setTextSaving] = useState(false);

  // النسخة الشغالة من التخصيصات — بنعدّل عليها فورًا ونحفظ بعدين
  const [draft, setDraft] = useState(null);

  // ===== الرجوع للخلف =====
  // المبدأ: قبل أي تعديل بنصوّر الحالة كاملة (لقطة)، والرجوع بيرجّع
  // اللقطة دي بالكامل. لقطات مش أوامر — لأن الأوامر لازم كل واحد منها
  // يعرف يلغي نفسه صح، ومع 6 أنواع تعديل مختلفة ده مصدر أخطاء. اللقطة
  // صح دايمًا مهما كان التعديل.
  const draftRef = useRef(null);
  const detailsRef = useRef(null);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  // بيخلي الأزرار تعيد الرسم لما الأكوام تتغير (الأكوام نفسها في ref
  // عشان نقراها فورًا جوه المعالجات من غير ما نستنى إعادة رسم)
  const [histTick, setHistTick] = useState(0);

  useEffect(() => { draftRef.current = draft; }, [draft]);
  useEffect(() => { detailsRef.current = data?.details || null; }, [data]);

  const features = useMemo(() => data?.features || [], [data]);
  const has = useCallback((f) => features.includes(f), [features]);

  /** لقطة من كل حاجة ممكن تتغيّر */
  const snapshot = useCallback(() => ({
    customizations: draftRef.current ? JSON.parse(JSON.stringify(draftRef.current)) : null,
    details: detailsRef.current ? { ...detailsRef.current } : null,
  }), []);

  /** بتتنادى **قبل** أي تعديل */
  const remember = useCallback(() => {
    if (!draftRef.current) return;
    pastRef.current.push(snapshot());
    // أي تعديل جديد بيلغي مسار الإعادة — زي أي محرر محترم
    futureRef.current = [];
    // 60 خطوة كفاية جدًا، وبتمنع الذاكرة تكبر بلا حدود
    if (pastRef.current.length > 60) pastRef.current.shift();
    setHistTick((n) => n + 1);
  }, [snapshot]);

  // ===== إرسال أمر للـ iframe =====
  const post = useCallback((type, payload) => {
    const win = iframeRef.current?.contentWindow;
    if (win) win.postMessage({ source: SHELL, type, payload: payload || {} }, window.location.origin);
  }, []);

  // أول ما البيانات توصل، نجهّز النسخة الشغالة
  useEffect(() => {
    if (data && !draft) {
      const c = data.customizations || {};
      setDraft({
        fontFamily: c.fontFamily || '',
        audioUrl: c.audioUrl || '',
        audioStart: c.audioStart || 0,
        audioEnd: c.audioEnd || 0,
        offsets: c.offsets || {},
        images: c.images || {},
        texts: c.texts || {},
        sizes: c.sizes || {},
        colors: c.colors || {},
        added: c.added || [],
        hidden: c.hidden || [],
        share: {
          title: (c.share && c.share.title) || '',
          description: (c.share && c.share.description) || '',
          image: (c.share && c.share.image) || '',
        },
      });
    }
  }, [data, draft]);

  // النصيحة بتظهر مرة واحدة أول ما المحرر يفتح فعلاً على شاشة صغيرة —
  // بعد ما البيانات توصل، عشان ماتظهرش فوق شاشة تحميل.
  useEffect(() => {
    if (compact && data && !hintDismissed()) setShowBigScreenHint(true);
  }, [compact, data]);

  // على الموبايل: أول ما العميل يضغط على جزء في الدعوة، الأدوات بتاعته
  // لازم تطلعله من غير ما يدوّر — زي أي محرر على الموبايل.
  useEffect(() => {
    if (compact && selected) setSheetOpen(true);
  }, [compact, selected]);

  // وضع التشغيل بياخد الشاشة كلها — الدرج مالوش لازمة وهو شغال
  useEffect(() => {
    if (playing) setSheetOpen(false);
  }, [playing]);

  // قياس الجزء الظاهر من الدرج (المقبض + التبويبات)
  useEffect(() => {
    const el = peekRef.current;
    if (!compact || !el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setPeekH(el.offsetHeight));
    ro.observe(el);
    setPeekH(el.offsetHeight);
    return () => ro.disconnect();
  }, [compact, playing]);

  // خطوط قايمة الاختيار بتتحمّل هنا بس (مش في index.html) عشان باقي
  // صفحات الموقع متتحمّلش 13 خط من غير داعي.
  useEffect(() => {
    if (!data?.fonts?.length) return undefined;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${data.fonts
      .map((f) => `family=${f.replace(/ /g, '+')}:wght@400;700`)
      .join('&')}&display=swap`;
    document.head.appendChild(link);
    return () => link.remove();
  }, [data]);

  // ===== استقبال رسائل الـ iframe =====
  useEffect(() => {
    function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      const msg = event.data || {};
      if (msg.source !== RUNTIME) return;
      const p = msg.payload || {};

      // الدعوة خلّصت تحميل — التجهيز نفسه في useEffect تحت، لأن ممكن
      // الـ iframe يخلص قبل ما بيانات المحرر توصل من السيرفر (أو العكس)
      if (msg.type === 'loaded') setRuntimeReady(true);
      if (msg.type === 'ready') setCounts({ texts: p.textCount, images: p.imageCount });
      if (msg.type === 'cover') { setCoverOpen(!!p.visible); setHasCover(!!p.exists); }
      if (msg.type === 'selected') {
        setSelected(p.id
          ? {
            id: p.id, kind: p.kind || 'text', text: p.text,
            fontSize: p.fontSize, bgColor: p.bgColor,
          }
          : null);
      }

      // نص جديد اتعمل جوه الدعوة — بنسجّله ونبنيه
      if (msg.type === 'added-new' && p.item) {
        rememberRef.current();
        setDraft((d) => {
          if (!d) return d;
          const next = [...(d.added || []), p.item];
          postRef.current('apply-added', { added: next });
          return { ...d, added: next };
        });
        setDirty(true);
      }

      // Ctrl+Z اتضغط وهو واقف جوه الدعوة
      if (msg.type === 'history') {
        if (p.redo) redoRef.current(); else undoRef.current();
      }

      // ضغط على أيقونة المكان في الخريطة
      if (msg.type === 'pick-map') {
        setSelected((s) => (s ? { ...s, kind: 'map' } : s));
        setTab('inline');
        setError('');
      }
      if (msg.type === 'offsets') {
        // السحبة بدأت من مكان معروف — بنسجّله قبل ما نحفظ الجديد
        if (p.before) {
          const b = p.before;
          setDraft((d) => {
            if (d) {
              pastRef.current.push({
                customizations: { ...JSON.parse(JSON.stringify(d)), offsets: b },
                details: detailsRef.current ? { ...detailsRef.current } : null,
              });
              futureRef.current = [];
              if (pastRef.current.length > 60) pastRef.current.shift();
            }
            return d;
          });
          setHistTick((n) => n + 1);
        }
        setDraft((d) => (d ? { ...d, offsets: p.offsets || {} } : d));
        setDirty(true);
      }
      if (msg.type === 'pick-image') {
        setPickedImage(p.id);
        setTab('photos');
        setError('');
      }

      // العميل عدّل نص بالضغط عليه جوه الدعوة
      if (msg.type === 'text-change') {
        rememberRef.current();
        saveTextRef.current(p);
      }

      // العميل ضغط على أيقونة الحذف
      if (msg.type === 'hide' && p.id) {
        rememberRef.current();
        setDraft((d) => {
          if (!d || d.hidden.includes(p.id)) return d;
          return { ...d, hidden: [...d.hidden, p.id] };
        });
        setDirty(true);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [post]);

  // حفظ النص المعدّل. في ref عشان مستمع الرسايل يفضل مستقر (بيتسجّل
  // مرة واحدة) ومع ذلك يشوف أحدث نسخة من الدالة.
  // رسايل الـ iframe بتوصل من مستمع مستقر، فبنوصّلها بأحدث نسخة من
  // الدوال عن طريق ref بدل ما نعيد تسجيل المستمع كل مرة
  const rememberRef = useRef(() => {});
  rememberRef.current = remember;
  // آخر عنصر اتغيّر مقاسه — عشان سحبة السلايدر تتسجّل كخطوة واحدة
  const sizeAnchorRef = useRef(null);
  const colorAnchorRef = useRef(null);
  const trimAnchorRef = useRef(null);
  const undoRef = useRef(() => {});
  const redoRef = useRef(() => {});
  const postRef = useRef(() => {});
  postRef.current = post;

  const saveTextRef = useRef(() => {});
  saveTextRef.current = async ({ id, oldText, newText }) => {
    setError('');
    setTextSaving(true);
    try {
      const res = await saveText({ shortId, id, oldText, newText }).unwrap();
      // لازم نزامن النسخة المحلية بالرد. لو سبناها قديمة، الحفظ
      // التلقائي اللي بعده بيبعت القايمة القديمة ويدهس التعديل اللي
      // لسه اتحفظ — وده كان بيحصل فعلاً مع النصوص المضافة.
      setDraft((d) => (d ? {
        ...d,
        texts: res.texts || {},
        added: res.added !== undefined ? res.added : d.added,
      } : d));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2200);
      // لو اللي اتعدّل حقل أساسي (اسم عروسة، قاعة...) فهو ظاهر في أكتر
      // من مكان في الدعوة — لازم نعيد التحميل عشان كله يتحدّث مع بعض.
      if (res.propagatedField) reloadFrame();
    } catch (err) {
      setError(err?.data?.error || t('editor.errorSave'));
      // رجّع النص الأصلي في الدعوة عشان مايفضلش شايف تعديل ماتحفظش
      post('set-text', { id, text: oldText });
    } finally {
      setTextSaving(false);
    }
  };

  // التجهيز بيحصل لما الطرفين يبقوا جاهزين — أيًا كان مين وصل الأول
  useEffect(() => {
    if (!runtimeReady || !draft) return;
    post('init', {
      offsets: draft.offsets, hidden: draft.hidden, sizes: draft.sizes,
      colors: draft.colors, features,
    });
    if (draft.fontFamily) post('set-font', { font: draft.fontFamily });
    // مرة واحدة بس عند الجاهزية — بعد كده كل تغيير بيتبعت لحظيًا لوحده
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtimeReady, !!draft, features]);

  // ===== الحفظ التلقائي =====
  useEffect(() => {
    if (!dirty || !draft) return undefined;
    const timer = setTimeout(async () => {
      try {
        // بنبعت اللي الباقة سامحة بيه بس — السيرفر بيرفض الباقي أصلاً
        const body = {};
        if (has('fonts')) body.fontFamily = draft.fontFamily;
        if (has('music')) {
          body.audioUrl = draft.audioUrl;
          body.audioStart = draft.audioStart || 0;
          body.audioEnd = draft.audioEnd || 0;
        }
        if (has('drag')) body.offsets = draft.offsets;
        if (has('images')) body.images = draft.images;
        if (has('colors')) body.colors = draft.colors;
        // الإخفاء والمقاس مش مميزات باقة — دول تنسيق العميل في دعوته هو
        body.hidden = draft.hidden;
        body.sizes = draft.sizes;
        body.added = draft.added;
        body.share = draft.share;
        await saveCustomizations({ shortId, ...body }).unwrap();
        setDirty(false);
        setError('');
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2200);
      } catch {
        setError(t('editor.errorSave'));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [dirty, draft, has, saveCustomizations, shortId, t]);

  // تحذير لو المستخدم قفل الصفحة وفي حاجة لسه بتتحفظ
  useEffect(() => {
    if (!dirty) return undefined;
    function warn(e) { e.preventDefault(); e.returnValue = ''; }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // ===== الأفعال =====
  function chooseFont(font) {
    remember();
    setDraft((d) => ({ ...d, fontFamily: font }));
    post('set-font', { font });
    setDirty(true);
  }

  async function onImageFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !pickedImage) return;
    setError('');
    if (tooBig(file)) { setError(sizeError(file)); return; }
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadImage(fd).unwrap();
      remember(); // بعد نجاح الرفع — عشان رفعة فاشلة ماتسجّلش خطوة
      setDraft((d) => ({ ...d, images: { ...d.images, [pickedImage]: res.url } }));
      post('set-image', { id: pickedImage, url: res.url });
      setDirty(true);
    } catch (err) {
      setError(uploadError(err, t));
    }
  }

  async function onAudioFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    // الفحص هنا قبل ما نبعت: العميل ياخد الرسالة الصح فورًا بدل ما
    // يستنى الملف يترفع كله وبعدين يترفض
    if (tooBig(file)) { setError(sizeError(file)); return; }
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadAudio(fd).unwrap();
      remember();
      setDraft((d) => ({ ...d, audioUrl: res.url }));
      post('set-audio', { url: res.url });
      setDirty(true);
    } catch (err) {
      setError(uploadError(err, t));
    }
  }

  /** صورة كارت المشاركة — بتترفع زي أي صورة بس مبتتحطش في التصميم */
  async function onShareImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    if (tooBig(file)) { setError(sizeError(file)); return; }
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadImage(fd).unwrap();
      remember();
      setDraft((d) => ({ ...d, share: { ...(d.share || {}), image: res.url } }));
      setDirty(true);
    } catch (err) {
      setError(uploadError(err, t));
    }
  }

  /** تحريك العنصر المختار بالبكسل من الأسهم */
  function nudge(dx, dy) {
    if (!selected) return;
    remember();
    setDraft((d) => {
      const cur = d.offsets[selected.id] || { dx: 0, dy: 0 };
      const next = { ...d.offsets, [selected.id]: { dx: cur.dx + dx, dy: cur.dy + dy } };
      post('apply-offsets', { offsets: next });
      return { ...d, offsets: next };
    });
    setDirty(true);
  }

  /**
   * بترجّع لقطة كاملة: التخصيصات + البيانات الأساسية.
   * البيانات الأساسية (أسماء/تاريخ/قاعة) بتتغيّر بإعادة بناء الدعوة،
   * فلو اتغيّرت في اللقطة بنعيد تحميل الإطار؛ غير كده بنطبّق على
   * الدعوة من غير إعادة تحميل عشان الرجوع يبقى فوري.
   */
  const applySnapshot = useCallback(async (snap) => {
    if (!snap || !snap.customizations) return;
    setError('');
    setTextSaving(true);
    try {
      const detailsChanged = snap.details && detailsRef.current
        && JSON.stringify(snap.details) !== JSON.stringify(detailsRef.current);

      setDraft(snap.customizations);
      draftRef.current = snap.customizations;

      const body = {
        shortId,
        hidden: snap.customizations.hidden,
        sizes: snap.customizations.sizes,
        added: snap.customizations.added,
      };
      if (has('fonts')) body.fontFamily = snap.customizations.fontFamily;
      if (has('music')) {
        body.audioUrl = snap.customizations.audioUrl;
        body.audioStart = snap.customizations.audioStart || 0;
        body.audioEnd = snap.customizations.audioEnd || 0;
      }
      if (has('drag')) body.offsets = snap.customizations.offsets;
      if (has('images')) body.images = snap.customizations.images;
      await saveCustomizations(body).unwrap();

      if (detailsChanged) {
        await saveDetails({ shortId, ...snap.details }).unwrap();
        await refetch();
        reloadFrame();
      } else {
        post('restore', { customizations: snap.customizations });
        post('set-font', { font: snap.customizations.fontFamily || '' });
        setSelected(null);
      }
      setDirty(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1800);
    } catch (err) {
      setError(err?.data?.error || t('editor.errorSave'));
    } finally {
      setTextSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortId, has, saveCustomizations, saveDetails, refetch, post, t]);

  const undo = useCallback(async () => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(snapshot());
    setHistTick((n) => n + 1);
    await applySnapshot(prev);
  }, [applySnapshot, snapshot]);

  const redo = useCallback(async () => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(snapshot());
    setHistTick((n) => n + 1);
    await applySnapshot(next);
  }, [applySnapshot, snapshot]);

  // الاختصار بيتمسك جوه الدعوة كمان وبيتبعت من هناك (التركيز بيكون
  // في الـ iframe وقتها)، فبنوصّل أحدث نسخة من الدوال بـ ref
  undoRef.current = undo;
  redoRef.current = redo;

  // اختصارات الكيبورد — Ctrl+Z و Ctrl+Shift+Z (و Cmd على الماك)
  useEffect(() => {
    function onKey(e) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      // لو بيكتب جوه الدعوة، سيب المتصفح يعمل undo بتاع النص نفسه
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  /** مقاس الخط للعنصر المختار — null يعني رجّعه لمقاس التصميم */
  function setSize(px) {
    if (!selected) return;
    // السلايدر بيبعت عشرات القيم وهو بيتحرك — لو سجّلنا كل واحدة،
    // الرجوع للخلف هيحتاج 40 ضغطة عشان يلغي حركة واحدة. فبنسجّل
    // اللقطة مرة واحدة عند أول تغيير في العنصر ده.
    if (sizeAnchorRef.current !== selected.id) {
      sizeAnchorRef.current = selected.id;
      remember();
    }
    post('set-size', { id: selected.id, size: px });
    setDraft((d) => {
      const sizes = { ...d.sizes };
      if (px) sizes[selected.id] = px;
      else delete sizes[selected.id];
      return { ...d, sizes };
    });
    // السلايدر بيحرّك العنصر فعليًا، فالمقاس الظاهر لازم يتابعه
    setSelected((s) => (s ? { ...s, fontSize: px || s.fontSize } : s));
    setDirty(true);
  }

  /**
   * أي حقل من بيانات الدعوة الأساسية (تاريخ، لينك مكان).
   * دي الحاجات اللي مش بتتكتب كنص عادي لأن ورا كل واحدة منطق:
   * التاريخ بيحرّك العداد التنازلي، واللينك بيبني الخريطة المدمجة.
   */
  async function changeDetail(patch) {
    if (!data?.details) return;
    remember();
    setError('');
    setTextSaving(true);
    try {
      await saveDetails({ shortId, ...data.details, ...patch }).unwrap();
      await refetch();
      reloadFrame();
    } catch (err) {
      setError(err?.data?.error || t('editor.errorSave'));
    } finally {
      setTextSaving(false);
    }
  }

  /** لون خلفية العنصر المختار (مربعات الزي المقترح مثلاً) */
  function setColor(hex) {
    if (!selected) return;
    if (colorAnchorRef.current !== selected.id) {
      colorAnchorRef.current = selected.id;
      remember();
    }
    post('set-color', { id: selected.id, color: hex });
    setDraft((d) => {
      const colors = { ...(d.colors || {}) };
      if (hex) colors[selected.id] = hex;
      else delete colors[selected.id];
      return { ...d, colors };
    });
    setSelected((s) => (s ? { ...s, bgColor: hex || s.bgColor } : s));
    setDirty(true);
  }

  /** اختار أغنية من المكتبة — القص بيتصفّر لأنها أغنية تانية */
  function pickTrack(url) {
    remember();
    setDraft((d) => ({ ...d, audioUrl: url, audioStart: 0, audioEnd: 0 }));
    post('set-audio', { url });
    setDirty(true);
  }

  /** حدود قص الأغنية — سحبة السلايدر بتتسجّل كخطوة واحدة */
  function setTrim({ start, end }) {
    if (trimAnchorRef.current !== (draft && draft.audioUrl)) {
      trimAnchorRef.current = draft && draft.audioUrl;
      remember();
    }
    setDraft((d) => ({ ...d, audioStart: start, audioEnd: end }));
    setDirty(true);
  }

  /** بدّل ختم الغلاف بختم تصميم تاني */
  function chooseSeal(url) {
    if (!data?.sealElemId) return;
    remember();
    post('set-image', { id: data.sealElemId, url });
    setDraft((d) => ({ ...d, images: { ...d.images, [data.sealElemId]: url } }));
    setDirty(true);
  }

  /** رجّع جزء اتحذف */
  function restoreHidden(id) {
    remember();
    setDraft((d) => {
      const next = d.hidden.filter((x) => x !== id);
      post('apply-hidden', { hidden: next });
      return { ...d, hidden: next };
    });
    setDirty(true);
  }

  function resetOffsets() {
    remember();
    post('reset-offsets', {});
    setDraft((d) => ({ ...d, offsets: {} }));
    setDirty(true);
  }

  /** شغّل الدعوة من الأول زي ما الضيف هيشوفها بالظبط */
  function play() {
    setPlaying(true);
    setRuntimeReady(false);
    setSelected(null);
    setCounts(null);
    setFrameKey((k) => k + 1);
  }

  function stopPlaying() {
    setPlaying(false);
    setRuntimeReady(false);
    setSelected(null);
    setCounts(null);
    setFrameKey((k) => k + 1);
  }

  /** إعادة التشغيل من أول وجديد وهو في وضع التشغيل */
  function replay() {
    setFrameKey((k) => k + 1);
  }

  function toggleCover() {
    const next = !coverOpen;
    setCoverOpen(next);
    post('toggle-cover', { on: next });
  }


  /** بعد حفظ البيانات الأساسية: الـ iframe لازم يتبني من الأول */
  function reloadFrame() {
    setRuntimeReady(false);
    setSelected(null);
    setCounts(null);
    setFrameKey((k) => k + 1);
  }

  async function publish() {
    setError('');
    try {
      await publishInvitation(shortId).unwrap();
      await refetch();
    } catch (err) {
      setError(err?.data?.error || t('editor.errorSave'));
    }
  }

  async function discardDraft() {
    if (!window.confirm(t('editor.discardConfirm'))) return;
    try {
      await deleteDraft(shortId).unwrap();
      navigate('/dashboard');
    } catch (err) {
      setError(err?.data?.error || t('editor.errorSave'));
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/i/${shortId}`).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2000); },
      () => setError(t('editor.errorSave'))
    );
  }

  // ===== حالات التحميل =====
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-ink-dim">
        <Loader2 size={17} className="animate-spin" /> {t('editor.loading')}
      </div>
    );
  }
  if (isError || !data || !draft) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertCircle size={26} className="text-ink-dim" />
        <p className="text-ink-dim">{t('editor.noAccess')}</p>
        <Link to="/dashboard" className="text-rose underline">{t('editor.back')}</Link>
      </div>
    );
  }

  const activeTab = TABS.find((x) => x.id === tab);
  // التبويب اللي مالوش feature (بيانات الدعوة) مفتوح دايمًا
  const tabUnlocked = !activeTab.feature || has(activeTab.feature);
  const isDraft = data.status === 'draft';

  // ===== حالة الحفظ في صورة مختصرة (للموبايل) =====
  const saveState = (isSaving || textSaving)
    ? { icon: <Loader2 size={13} className="animate-spin" />, tone: 'text-ink-dim', label: t('editor.saving') }
    : dirty
      ? { icon: <span className="h-1.5 w-1.5 rounded-full bg-brass" />, tone: 'text-brass', label: t('editor.unsaved') }
      : { icon: <Check size={13} />, tone: 'text-ok', label: justSaved ? t('editor.saved') : t('editor.allSaved') };

  return (
    // dvh مش vh: على الموبايل شريط عنوان المتصفح بيدخل ويطلع، و vh
    // بيحسبه غلط فيطلع جزء من الصفحة تحت الشاشة
    <div className="flex h-dvh flex-col overflow-hidden bg-ivory">
      {/* النصيحة بتظهر فوق كل حاجة على الموبايل */}
      <AnimatePresence>
        {showBigScreenHint && <BigScreenNotice onClose={() => setShowBigScreenHint(false)} />}
      </AnimatePresence>

      {/* ===== الشريط العلوي — نسخة الموبايل: سطر واحد، عمره ما يلف ===== */}
      {compact ? (
        <header className="flex shrink-0 items-center gap-2 border-b border-line bg-card px-3 py-2">
          <Link
            to="/dashboard"
            aria-label={t('editor.back')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-dim active:bg-ink/5"
          >
            <ArrowRight size={17} />
          </Link>

          <span className={`inline-flex min-w-0 items-center gap-1.5 text-[12px] ${saveState.tone}`}>
            {saveState.icon}
            <span className="truncate">{saveState.label}</span>
          </span>

          <span className="flex-1" />

          {playing ? (
            <>
              <button
                type="button"
                onClick={replay}
                aria-label={t('editor.replay')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-dim active:bg-ink/5"
              >
                <RotateCw size={15} />
              </button>
              <button
                type="button"
                onClick={stopPlaying}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-night px-3.5 py-2 text-[12.5px] font-bold text-ivory"
              >
                <PenLine size={13} /> {t('editor.editShort')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={play}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-l from-brass to-brass-soft px-4 py-2 text-[12.5px] font-extrabold text-[#241608]"
            >
              <PlayCircle size={14} /> {t('editor.playShort')}
            </button>
          )}
        </header>
      ) : (
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-5 py-3">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-[13px] text-ink-dim hover:text-rose">
            <ArrowRight size={15} /> {t('editor.back')}
          </Link>
          <span className="hidden font-serif text-[15px] font-bold text-ink sm:inline">{t('editor.title')}</span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* حالة الحفظ */}
          <span className="min-w-[110px] text-end text-[12.5px]">
            {isSaving || textSaving ? (
              <span className="inline-flex items-center gap-1.5 text-ink-dim">
                <Loader2 size={12} className="animate-spin" /> {t('editor.saving')}
              </span>
            ) : dirty ? (
              <span className="text-brass">{t('editor.unsaved')}</span>
            ) : justSaved ? (
              <span className="inline-flex items-center gap-1.5 text-ok">
                <Check size={12} /> {t('editor.saved')}
              </span>
            ) : (
              <span className="text-ink-dim">{t('editor.allSaved')}</span>
            )}
          </span>

          {/* الجهاز */}
          <div className="flex rounded-full border border-line p-0.5">
            {[
              { id: 'mobile', icon: Smartphone },
              { id: 'desktop', icon: Monitor },
            ].map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setDevice(id)}
                title={t(`editor.${id}`)}
                className={`rounded-full px-3 py-1.5 ${device === id ? 'bg-night text-ivory' : 'text-ink-dim hover:text-ink'}`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          {/* رجوع للخلف / إعادة */}
          {!playing && (
            <div className="flex rounded-full border border-line p-0.5">
              <button
                type="button"
                onClick={undo}
                disabled={pastRef.current.length === 0 || textSaving}
                title={`${t('editor.undo')} (Ctrl+Z)`}
                className="rounded-full px-3 py-1.5 text-ink-dim transition hover:bg-ink/5 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Undo2 size={14} />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={futureRef.current.length === 0 || textSaving}
                title={`${t('editor.redo')} (Ctrl+Shift+Z)`}
                className="rounded-full px-3 py-1.5 text-ink-dim transition hover:bg-ink/5 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Redo2 size={14} />
              </button>
            </div>
          )}

          {/* شاشة الغلاف — بتتشال من الطريق افتراضيًا، وده زرار فتحها */}
          {hasCover && !playing && (
            <button
              type="button"
              onClick={toggleCover}
              title={t('editor.coverHint')}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-bold transition ${
                coverOpen
                  ? 'border-brass bg-brass/15 text-[#7a5a1a]'
                  : 'border-line text-ink-dim hover:border-ink/30 hover:text-ink'
              }`}
            >
              <Layers size={13} /> {t('editor.cover')}
            </button>
          )}

          {/* تشغيل الدعوة من الأول */}
          {playing ? (
            <>
              <button
                type="button"
                onClick={replay}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-[12.5px] font-bold text-ink-dim hover:border-ink/30 hover:text-ink"
              >
                <RotateCw size={13} /> {t('editor.replay')}
              </button>
              <button
                type="button"
                onClick={stopPlaying}
                className="inline-flex items-center gap-1.5 rounded-full bg-night px-4 py-2 text-[12.5px] font-bold text-ivory hover:bg-emerald"
              >
                <PenLine size={13} /> {t('editor.backToEdit')}
              </button>
            </>
          ) : (
            <motion.button
              type="button"
              onClick={play}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-l from-brass to-brass-soft px-5 py-2.5 text-[12.5px] font-extrabold text-[#241608] shadow-[0_6px_18px_-8px_rgba(201,162,74,.9)]"
            >
              {/* لمعة بتعدي على الزرار عند المرور */}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-600 group-hover:translate-x-full" />
              <PlayCircle size={15} /> {t('editor.play')}
            </motion.button>
          )}
        </div>
      </header>
      )}

      {/* ===== شريط النشر ===== */}
      {/* المسودة مبتخصمش من رصيد الباقة ومحدش شايفها غير صاحبها — الخصم
          والنشر بيحصلوا مع بعض بضغطة واحدة هنا. */}
      {compact ? (
        isDraft ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-brass/40 bg-gradient-to-l from-night to-[#16281f] px-3 py-2 text-ivory">
            <FileText size={14} className="shrink-0 text-brass-soft" />
            <span className="min-w-0 flex-1 truncate text-[12px]">
              <b className="font-bold">{t('editor.draftShort')}</b>
              <span className="text-ivory/60"> · {t('editor.draftSubtitle', { count: data.invitationsLeft })}</span>
            </span>
            <button
              type="button"
              onClick={discardDraft}
              disabled={deleting}
              aria-label={t('editor.discard')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ivory/25 text-ivory/70 disabled:opacity-50"
            >
              <Trash2 size={13} />
            </button>
            <button
              type="button"
              onClick={publish}
              disabled={publishing}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-l from-brass to-brass-soft px-3.5 py-2 text-[12px] font-extrabold text-[#241608] disabled:opacity-60"
            >
              {publishing ? <Loader2 size={12} className="animate-spin" /> : <Rocket size={12} />}
              {t('editor.publishShort')}
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2 border-b border-line bg-ok/[0.07] px-3 py-1.5">
            <Check size={13} className="shrink-0 text-ok" />
            <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-ok">
              {t('editor.publishedShort')}
            </span>
            <button
              type="button"
              onClick={copyLink}
              aria-label={t('result.copy')}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink active:bg-ink/5"
            >
              {copied ? <Check size={13} className="text-ok" /> : <Copy size={13} />}
            </button>
            <a
              href={`/i/${shortId}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('dash.open')}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-night text-ivory"
            >
              <ExternalLink size={13} />
            </a>
          </div>
        )
      ) : isDraft ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-brass/40 bg-gradient-to-l from-night to-[#16281f] px-5 py-3 text-ivory">
          <div className="flex items-center gap-2.5">
            <FileText size={16} className="text-brass-soft" />
            <div>
              <div className="text-[13.5px] font-bold">{t('editor.draftTitle')}</div>
              <div className="text-[12px] text-ivory/65">
                {t('editor.draftSubtitle', { count: data.invitationsLeft })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={discardDraft}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-full border border-ivory/25 px-4 py-2 text-[12.5px] font-bold text-ivory/80 hover:border-error hover:text-error disabled:opacity-50"
            >
              <Trash2 size={13} /> {t('editor.discard')}
            </button>
            <button
              type="button"
              onClick={publish}
              disabled={publishing}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-brass to-brass-soft px-5 py-2.5 text-[12.5px] font-extrabold text-[#241608] hover:brightness-105 disabled:opacity-60"
            >
              {publishing ? <Loader2 size={13} className="animate-spin" /> : <Rocket size={13} />}
              {t('editor.publish')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-ok/[0.07] px-5 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ok">
            <Check size={13} /> {t('editor.publishedTitle')}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-[12.5px] font-bold text-ink hover:bg-ink/5"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? t('result.copied') : t('result.copy')}
            </button>
            <a
              href={`/i/${shortId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-night px-4 py-1.5 text-[12.5px] font-bold text-ivory hover:bg-emerald"
            >
              <ExternalLink size={12} /> {t('dash.open')}
            </a>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* ===== الشريط الجانبي ===== */}
        {/* على الشاشات الصغيرة الشريط بيتحول لدرج سفلي بدل ما يختفي —
            العميل لازم يقدر يعدّل من الموبايل برضو */}
        <aside
          hidden={playing}
          className={`flex flex-col border-line bg-card ${
            compact
              ? 'fixed inset-x-0 bottom-0 z-30 rounded-t-[22px] border-t shadow-[0_-12px_40px_-16px_rgba(0,0,0,.38)]'
              : 'shrink-0 lg:w-[400px] xl:w-[440px] lg:border-e'
          }`}
        >
          {/* ===== مقبض الدرج + الأدوات السريعة — موبايل بس ===== */}
          {/* الأدوات اللي كانت مزنوقة في الشريط العلوي (رجوع/إعادة/الغلاف)
              مكانها هنا: قريبة من الإيد، وسطر واحد مايزحمش الشاشة. */}
          <div ref={peekRef} className="shrink-0">
          {compact && (
            <div className="px-3 pt-2">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-ink/15" />
              <div className="flex items-center gap-1.5 pb-2">
                <button
                  type="button"
                  onClick={() => setSheetOpen((v) => !v)}
                  aria-expanded={sheetOpen}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.06] px-3 py-1.5 text-[12px] font-bold text-ink"
                >
                  {sheetOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  {t('editor.tools')}
                </button>

                <span className="flex-1" />

                <button
                  type="button"
                  onClick={undo}
                  disabled={pastRef.current.length === 0 || textSaving}
                  aria-label={t('editor.undo')}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-dim disabled:opacity-30"
                >
                  <Undo2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={futureRef.current.length === 0 || textSaving}
                  aria-label={t('editor.redo')}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-dim disabled:opacity-30"
                >
                  <Redo2 size={14} />
                </button>
                {hasCover && (
                  <button
                    type="button"
                    onClick={toggleCover}
                    aria-label={t('editor.cover')}
                    aria-pressed={coverOpen}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                      coverOpen ? 'border-brass bg-brass/15 text-[#7a5a1a]' : 'border-line text-ink-dim'
                    }`}
                  >
                    <Layers size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          <nav className={`flex shrink-0 border-line ${compact ? 'border-y' : 'border-b'}`}>
            {TABS.map(({ id, icon: Icon, feature, label }) => (
              <button
                key={id}
                type="button"
                // على الموبايل الضغط على تبويب بيفتح الدرج كمان، والضغط
                // على التبويب المفتوح بيقفله — أسرع طريق للدعوة ورجوع
                onClick={() => {
                  if (compact && tab === id) setSheetOpen((v) => !v);
                  else if (compact) setSheetOpen(true);
                  setTab(id);
                }}
                className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 font-bold transition ${
                  compact ? 'px-1 py-2.5 text-[10.5px]' : 'gap-1.5 py-3.5 text-[11.5px]'
                } ${tab === id ? 'text-rose' : 'text-ink-dim hover:text-ink'}`}
              >
                <Icon size={compact ? 15 : 16} />
                <span className="w-full truncate text-center">{t(label)}</span>
                {feature && !has(feature) && (
                  <Lock size={9} className={`absolute text-ink-dim ${compact ? 'end-1 top-1.5' : 'end-2 top-2.5'}`} />
                )}
                {tab === id && (
                  <motion.span layoutId="editor-tab" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-rose" />
                )}
              </button>
            ))}
          </nav>
          </div>

          {/* محتوى الدرج — بيتطوي لصفر على الموبايل لما يتقفل */}
          <div
            className={compact
              ? 'overflow-hidden transition-[height] duration-300 ease-out'
              : 'flex min-h-0 flex-1 flex-col'}
            style={compact ? { height: sheetOpen ? SHEET_PANEL : 0 } : undefined}
          >
          <div className={compact ? 'h-full overflow-y-auto p-4' : 'min-h-0 flex-1 overflow-y-auto p-5'}>
            {error && (
              <div className="mb-4 rounded-xl bg-error/10 px-4 py-3 text-[12.5px] text-error">{error}</div>
            )}

            {!tabUnlocked ? (
              <LockedPanel />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                >
                  {/* ---- تعديل مباشر ---- */}
                  {/* flex عشان نقدر نقدّم لوحة العنصر المختار على الشرح
                      في وضع الموبايل (order) من غير ما نكرر الكود */}
                  {tab === 'inline' && (
                    <div className="flex flex-col">
                      <h2 className="mb-1.5 font-serif text-[16px] font-bold text-ink">{t('editor.inlineTitle')}</h2>
                      <p className="mb-4 text-[12.5px] text-ink-dim">{t('editor.inlineHint')}</p>

                      {/* شرح الأيقونتين بنفس شكلهم جوه الدعوة */}
                      <div className="space-y-2.5 rounded-2xl border border-line bg-ivory/60 p-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-night text-brass-soft">
                            <Check size={14} />
                          </span>
                          <span className="text-[12.5px] text-ink">{t('editor.inlineEditIcon')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-night text-[#e88b7a]">
                            <Trash2 size={14} />
                          </span>
                          <span className="text-[12.5px] text-ink">{t('editor.inlineDeleteIcon')}</span>
                        </div>
                      </div>

                      {/* التلميح ده بيتكلم عن Enter و Esc — مالوش لازمة
                          على الموبايل، ومكانه في درج قصير غالي */}
                      {!compact && (
                        <p className="mt-3 rounded-xl bg-emerald/[0.07] px-4 py-3 text-[12px] text-ink-dim">
                          {t('editor.inlineTip')}
                        </p>
                      )}

                      {/* أضف نص جديد فوق التصميم */}
                      <button
                        type="button"
                        onClick={() => post('add-text', {})}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-dashed border-rose/50 bg-rose/[0.04] py-3 text-[13px] font-bold text-rose transition hover:border-rose hover:bg-rose/[0.09]"
                      >
                        <TypeOutline size={15} /> {t('editor.addText')}
                      </button>
                      <p className="mt-2 text-center text-[11.5px] text-ink-dim">{t('editor.addTextHint')}</p>

                      {draft.added?.length > 0 && (
                        <p className="mt-1.5 text-center text-[11.5px] font-bold text-rose">
                          {t('editor.addedCount', { count: draft.added.length })}
                        </p>
                      )}

                      {/* ===== لوحة العنصر المختار ===== */}
                      {/* دي اللي شالت فورم البيانات: بتتغيّر حسب اللي
                          ضغطت عليه — مقاس لأي كلام، ونتيجة لو اللي
                          ضغطت عليه تاريخ (عشان العداد التنازلي يتبعه). */}
                      <AnimatePresence mode="wait">
                        {selected ? (
                          <motion.div
                            key={selected.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            // على الموبايل الدرج قصير — أدوات الجزء اللي
                            // العميل لسه ضاغط عليه لازم تبقى أول حاجة
                            // يشوفها، مش تحت أربع فقرات شرح
                            className={`rounded-2xl border border-rose/40 bg-rose/[0.04] p-4 ${
                              compact ? 'order-first mb-4' : 'mt-5'
                            }`}
                          >
                            <div className="mb-3 flex items-center gap-2">
                              <Sparkles size={13} className="text-rose" />
                              <span className="text-[12.5px] font-bold text-ink">{t('editor.selectedTitle')}</span>
                            </div>

                            <p className="mb-3 line-clamp-2 rounded-lg bg-card px-3 py-2 text-[12.5px] text-ink-dim">
                              {selected.text || '—'}
                            </p>

                            {/* العناصر المركّبة: الكتابة جواها بتدهس تركيبها */}
                            {selected.kind === 'rich' && (
                              <p className="mb-4 rounded-xl bg-brass/[0.10] px-3.5 py-2.5 text-[11.5px] text-[#7a5a1a]">
                                {t('editor.richHint')}
                              </p>
                            )}

                            {/* الباقة الأساسية: تعديل النص أيوه، تحريك لأ */}
                            {!has('drag') && (
                              <p className="mb-4 flex items-start gap-1.5 rounded-xl bg-ink/[0.05] px-3.5 py-2.5 text-[11.5px] text-ink-dim">
                                <Lock size={11} className="mt-0.5 shrink-0" /> {t('editor.dragLocked')}
                              </p>
                            )}

                            {/* المكان: لينك خرائط جوجل */}
                            {selected.kind === 'map' && (
                              <div className="mb-4 rounded-xl border border-emerald/40 bg-emerald/[0.07] p-3">
                                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-emerald">
                                  <MapPin size={12} /> {t('editor.mapTitle')}
                                </div>
                                <MapField
                                  value={data.details?.venueMapQuery || ''}
                                  busy={textSaving}
                                  onSave={(v) => changeDetail({ venueMapQuery: v })}
                                />
                                <p className="mt-2 text-[11px] text-ink-dim">{t('editor.mapHint')}</p>
                              </div>
                            )}

                            {/* التاريخ: نتيجة مش خانة كتابة */}
                            {(selected.kind === 'live' || looksLikeDate(selected.text)) && data.details?.weddingDate && (
                              <div className="mb-4 rounded-xl border border-brass/40 bg-brass/[0.07] p-3">
                                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-[#7a5a1a]">
                                  <CalendarDays size={12} /> {t('editor.dateTitle')}
                                </div>
                                <input
                                  type="date"
                                  defaultValue={data.details.weddingDate}
                                  onChange={(e) => changeDetail({ weddingDate: e.target.value })}
                                  className="w-full rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-ink focus:border-brass focus:outline-none"
                                />
                                <p className="mt-2 text-[11px] text-ink-dim">
                                  {selected.kind === 'live' ? t('editor.liveHint') : t('editor.dateHint')}
                                </p>
                              </div>
                            )}

                            {/* اللون — لمربعات الزي المقترح وأي خلفية ملوّنة */}
                            {selected.bgColor && (
                              <div className="mb-4 rounded-xl border border-line bg-card p-3">
                                <div className="mb-2.5 flex items-center justify-between">
                                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-ink">
                                    <Palette size={13} /> {t('editor.colorTitle')}
                                  </span>
                                  {!has('colors') && <Lock size={11} className="text-ink-dim" />}
                                </div>
                                {has('colors') ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={draft.colors?.[selected.id] || selected.bgColor}
                                      onChange={(e) => setColor(e.target.value)}
                                      className="h-9 w-14 cursor-pointer rounded-lg border border-line bg-transparent p-0.5"
                                    />
                                    <span className="font-mono text-[12px] text-ink-dim">
                                      {(draft.colors?.[selected.id] || selected.bgColor).toUpperCase()}
                                    </span>
                                    {draft.colors?.[selected.id] && (
                                      <button
                                        type="button"
                                        onClick={() => setColor(null)}
                                        className="ms-auto inline-flex items-center gap-1 text-[11.5px] font-bold text-ink-dim hover:text-rose"
                                      >
                                        <RotateCcw size={11} /> {t('editor.colorReset')}
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[11.5px] text-ink-dim">{t('editor.colorLocked')}</p>
                                )}
                              </div>
                            )}

                            {/* مقاس الخط */}
                            {selected.kind !== 'image' && selected.kind !== 'video' && (
                              <>
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-ink">
                                    <ALargeSmall size={13} /> {t('editor.sizeTitle')}
                                  </span>
                                  <span className="font-mono text-[12px] text-ink-dim">{selected.fontSize}px</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSize(Math.max(8, (selected.fontSize || 16) - 1))}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-ink hover:border-rose hover:text-rose"
                                  >
                                    <Minus size={13} />
                                  </button>
                                  <input
                                    type="range"
                                    min="8"
                                    max="120"
                                    value={selected.fontSize || 16}
                                    onChange={(e) => setSize(Number(e.target.value))}
                                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-line accent-rose"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setSize(Math.min(200, (selected.fontSize || 16) + 1))}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-ink hover:border-rose hover:text-rose"
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>

                                {draft.sizes[selected.id] && (
                                  <button
                                    type="button"
                                    onClick={() => setSize(null)}
                                    className="mt-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-ink-dim hover:text-rose"
                                  >
                                    <RotateCcw size={11} /> {t('editor.sizeReset')}
                                  </button>
                                )}
                              </>
                            )}
                          </motion.div>
                        ) : (
                          <p className="mt-5 rounded-2xl border border-dashed border-line px-4 py-5 text-center text-[12px] text-ink-dim">
                            {t('editor.selectedNone')}
                          </p>
                        )}
                      </AnimatePresence>

                      {/* المحذوفات — لازم يكون فيه طريق رجوع واضح */}
                      <div className="mt-5">
                        <h3 className="mb-2 text-[12.5px] font-bold text-ink">
                          {t('editor.hiddenTitle')} ({draft.hidden.length})
                        </h3>
                        {draft.hidden.length === 0 ? (
                          <p className="text-[12px] text-ink-dim">{t('editor.hiddenEmpty')}</p>
                        ) : (
                          <div className="space-y-1.5">
                            {draft.hidden.map((id) => (
                              <div
                                key={id}
                                className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2"
                              >
                                <span className="truncate font-mono text-[11px] text-ink-dim">{id}</span>
                                <button
                                  type="button"
                                  onClick={() => restoreHidden(id)}
                                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11.5px] font-bold text-ink hover:border-emerald hover:text-emerald"
                                >
                                  <Undo2 size={11} /> {t('editor.restore')}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ---- الخط ---- */}
                  {tab === 'font' && (
                    <>
                      <h2 className="mb-1.5 font-serif text-[16px] font-bold text-ink">{t('editor.fontTitle')}</h2>
                      <p className="mb-4 text-[12.5px] text-ink-dim">{t('editor.fontHint')}</p>
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => chooseFont('')}
                          className={`w-full rounded-xl border px-4 py-3 text-start text-[13px] ${
                            !draft.fontFamily ? 'border-rose bg-rose/5 font-bold text-ink' : 'border-line text-ink-dim hover:border-ink/25'
                          }`}
                        >
                          {t('editor.fontNone')}
                        </button>
                        {(data.fonts || []).map((font) => (
                          <button
                            key={font}
                            type="button"
                            onClick={() => chooseFont(font)}
                            style={{ fontFamily: `'${font}', serif` }}
                            className={`w-full rounded-xl border px-4 py-3 text-start text-[15px] ${
                              draft.fontFamily === font
                                ? 'border-rose bg-rose/5 text-ink'
                                : 'border-line text-ink hover:border-ink/25'
                            }`}
                          >
                            {font} — أحمد و سارة
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* ---- الصور ---- */}
                  {tab === 'photos' && (
                    <>
                      <h2 className="mb-1.5 font-serif text-[16px] font-bold text-ink">{t('editor.photosTitle')}</h2>
                      <p className="mb-4 text-[12.5px] text-ink-dim">{t('editor.photosHint')}</p>

                      <div
                        className={`rounded-xl border px-4 py-3 text-[12.5px] ${
                          pickedImage ? 'border-rose/50 bg-rose/5 font-bold text-ink' : 'border-dashed border-line text-ink-dim'
                        }`}
                      >
                        {pickedImage ? t('editor.photosSelected') : t('editor.photosPick')}
                      </div>

                      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onImageFile} hidden />
                      <button
                        type="button"
                        disabled={!pickedImage || uploadingImage}
                        onClick={() => imageInputRef.current?.click()}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-night px-5 py-3 text-[13px] font-bold text-ivory hover:bg-emerald disabled:opacity-40"
                      >
                        {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {uploadingImage ? t('editor.photoUploading') : t('editor.photoUpload')}
                      </button>

                      {/* ختم الغلاف — بدّله بختم أي تصميم تاني */}
                      {data.seals?.length > 0 && (
                        <div className="mt-6 rounded-2xl border border-line bg-ivory/60 p-4">
                          <h3 className="mb-1 flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
                            <Stamp size={13} /> {t('editor.sealTitle')}
                          </h3>
                          <p className="mb-3 text-[11.5px] text-ink-dim">{t('editor.sealHint')}</p>
                          <div className="grid grid-cols-3 gap-2">
                            {data.seals.map((seal) => {
                              const active = draft.images?.[data.sealElemId] === seal.url;
                              return (
                                <button
                                  key={seal.id}
                                  type="button"
                                  onClick={() => chooseSeal(seal.url)}
                                  title={seal.label.ar}
                                  className={`rounded-xl border p-2 transition ${
                                    active ? 'border-rose bg-rose/[0.07]' : 'border-line hover:border-ink/25'
                                  }`}
                                >
                                  <img src={seal.url} alt={seal.label.ar} className="aspect-square w-full object-contain" />
                                  <span className="mt-1 block truncate text-[10px] text-ink-dim">{seal.label.ar}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {Object.keys(draft.images).length > 0 && (
                        <div className="mt-5 grid grid-cols-3 gap-2">
                          {Object.entries(draft.images).map(([id, url]) => (
                            <img key={id} src={url} alt="" className="aspect-square rounded-lg border border-line object-cover" />
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* ---- الموسيقى ---- */}
                  {tab === 'music' && (
                    <MusicPanel
                      audioUrl={draft.audioUrl}
                      audioStart={draft.audioStart || 0}
                      audioEnd={draft.audioEnd || 0}
                      uploading={uploadingAudio}
                      onPick={pickTrack}
                      onTrim={setTrim}
                      onUpload={onAudioFile}
                    />
                  )}

                  {/* ---- كارت المشاركة ---- */}
                  {tab === 'share' && (
                    <SharePanel
                      share={draft.share || {}}
                      defaults={data.shareDefaults || {}}
                      canImages={has('images')}
                      uploading={uploadingImage}
                      onUploadImage={onShareImage}
                      onChange={(next) => {
                        remember();
                        setDraft((d) => ({ ...d, share: next }));
                        setDirty(true);
                      }}
                    />
                  )}

                  {/* ---- تحريك النص ---- */}
                  {tab === 'layout' && (
                    <>
                      <h2 className="mb-1.5 font-serif text-[16px] font-bold text-ink">{t('editor.layoutTitle')}</h2>
                      <p className="mb-4 text-[12.5px] text-ink-dim">{t('editor.layoutHint')}</p>

                      <div className="rounded-xl border border-line bg-ivory/60 p-4">
                        <p className="mb-3 text-[12.5px] text-ink-dim">
                          {selected ? t('editor.layoutSelected', { text: selected.text }) : t('editor.layoutNone')}
                        </p>

                        {/* لوحة الأسهم */}
                        <div className="mx-auto grid w-[132px] grid-cols-3 gap-1.5">
                          <span />
                          <button type="button" disabled={!selected} onClick={() => nudge(0, -2)} className="rounded-lg border border-line bg-card py-2 hover:border-rose disabled:opacity-40">
                            <ChevronUp size={14} className="mx-auto" />
                          </button>
                          <span />
                          <button type="button" disabled={!selected} onClick={() => nudge(-2, 0)} className="rounded-lg border border-line bg-card py-2 hover:border-rose disabled:opacity-40">
                            <ChevronLeft size={14} className="mx-auto" />
                          </button>
                          <button type="button" disabled={!selected} onClick={() => nudge(0, 0)} className="rounded-lg border border-line bg-card py-2 text-[10px] text-ink-dim disabled:opacity-40">
                            {selected ? `${Math.round(draft.offsets[selected.id]?.dx || 0)},${Math.round(draft.offsets[selected.id]?.dy || 0)}` : '0,0'}
                          </button>
                          <button type="button" disabled={!selected} onClick={() => nudge(2, 0)} className="rounded-lg border border-line bg-card py-2 hover:border-rose disabled:opacity-40">
                            <ChevronRight size={14} className="mx-auto" />
                          </button>
                          <span />
                          <button type="button" disabled={!selected} onClick={() => nudge(0, 2)} className="rounded-lg border border-line bg-card py-2 hover:border-rose disabled:opacity-40">
                            <ChevronDown size={14} className="mx-auto" />
                          </button>
                          <span />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={resetOffsets}
                        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-line px-5 py-2.5 text-[12.5px] font-bold text-ink-dim hover:border-error hover:text-error"
                      >
                        <RotateCcw size={13} /> {t('editor.layoutReset')}
                      </button>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          </div>

          {/* عدّاد العناصر على الديسكتوب بس — على الموبايل كل بكسل محسوب */}
          {counts && !compact && (
            <div className="shrink-0 border-t border-line px-5 py-3 text-[11.5px] text-ink-dim">
              {t('editor.elementsFound', { texts: counts.texts, images: counts.images })}
            </div>
          )}
        </aside>

        {/* ===== المعاينة ===== */}
        <main
          className={`flex min-w-0 flex-1 flex-col items-center overflow-auto bg-[repeating-linear-gradient(45deg,#0000_0_10px,#00000005_10px_20px)] ${
            compact ? 'p-2.5' : 'p-5'
          }`}
          // بنسيب مساحة الجزء الظاهر من الدرج بس — الدرج وهو مفتوح بيعدّي
          // فوق الدعوة، فالمقاس مابيتغيّرش وإحنا بنفتح ونقفل
          style={compact && !playing ? { paddingBottom: peekH } : undefined}
        >
          {playing && (
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-night px-4 py-1.5 text-[12px] font-bold text-brass-soft">
              <PlayCircle size={12} /> {t('editor.playingHint')}
            </p>
          )}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className={`w-full overflow-hidden border border-line bg-card shadow-[0_18px_50px_-20px_rgba(0,0,0,.35)] ${
              compact ? 'rounded-[18px]' : 'rounded-[26px]'
            }`}
            // على الموبايل الشاشة نفسها هي المقاس — أي عرض ثابت هنا كان
            // بيخلي الصفحة أعرض من الجهاز، فالمتصفح يصغّر كل حاجة ويطلع
            // شريط تمرير أفقي. `min()` بتمنع ده نهائيًا.
            style={{
              width: compact ? '100%' : (device === 'mobile' ? 'min(390px, 100%)' : '100%'),
              maxWidth: '100%',
              height: '100%',
              minHeight: compact ? 420 : 560,
            }}
          >
            <iframe
              // الـ key بيجبر المتصفح يبني الإطار من الأول — وده اللي
              // بيخلي "إعادة التشغيل" تعيد الأنميشن والموسيقى فعلاً بدل
              // ما تسيب الصفحة زي ما هي
              key={`${playing ? 'play' : 'edit'}-${frameKey}`}
              ref={iframeRef}
              title={t('editor.title')}
              // في وضع التشغيل بنحمّل نفس لينك الضيف بالظبط — من غير
              // ?edit=1 فمفيش سكريبت تحرير أصلاً بيتحقن
              src={playing ? `/i/${shortId}` : `/i/${shortId}?edit=1`}
              className="h-full w-full border-0"
            />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
