/* editor-runtime.js
 * بيشتغل جوه صفحة الدعوة نفسها (جوه الـ iframe) وقت التحرير بس.
 * السيرفر بيحقنه لصاحب الدعوة لوحده (utils/renderInvitation.js) — الضيف
 * عمره ما يحمّله.
 *
 * مسؤولياته:
 *   - يخلي النصوص قابلة للسحب (interact.js)
 *   - يخلي الصور قابلة للضغط عشان تتغير
 *   - يبلّغ الصفحة الأم (React) بأي تغيير عن طريق postMessage
 *   - يطبّق التغييرات فورًا قبل ما تتحفظ (معاينة لحظية)
 */
(function () {
  'use strict';

  var state = {
    offsets: {}, selected: null,
    // التحرير (اختيار وكتابة) منفصل عن السحب: الباقة الأساسية عندها
    // التحرير من غير السحب
    editingOn: false, dragEnabled: false, imagesEnabled: false,
    // { host, target, before } وقت ما العميل بيكتب جوه عنصر
    writing: null,
    // وقت آخر سحبة — عشان الضغطة اللي بعدها ماتفتحش الكتابة
    lastDragEnd: 0,
    // { elemId: { text, size } } زي ما التصميم طالع بالظبط — أساس
    // "رجوع للخلف": لما نلغي تعديل نص أو مقاس، بنرجّع من هنا
    originals: {},
    // شاشة الغلاف ظاهرة في وضع التحرير ولا مخفية
    coverVisible: false,
  };

  // ===== التواصل مع الصفحة الأم =====
  function send(type, payload) {
    parent.postMessage({ source: 'mithaq-editor', type: type, payload: payload || {} }, window.location.origin);
  }

  // ===== ستايل أدوات التحرير (بيتشال عند الحفظ النهائي) =====
  var style = document.createElement('style');
  style.textContent = [
    // الحدود بتبان عند المرور بالماوس بس. لو سيبناها ظاهرة على كل عنصر
    // طول الوقت، الدعوة بتبقى مليانة خطوط متقطعة والعميل مبيشوفش تصميمه.
    '.wda-editable{ outline:2px dashed transparent; outline-offset:3px; cursor:grab; transition:outline-color .12s, background .12s; }',
    '.wda-editable:hover{ outline-color:rgba(201,162,74,.9) !important; background:rgba(201,162,74,.07); }',
    '.wda-selected{ outline:2.5px solid #c9a24a !important; outline-offset:3px; background:rgba(201,162,74,.05); }',
    '.wda-dragging{ cursor:grabbing !important; opacity:.85; }',
    '.wda-img-editable{ outline:2px dashed transparent; outline-offset:3px; cursor:pointer; transition:outline-color .12s; }',
    '.wda-img-editable:hover{ outline-color:rgba(201,120,138,.9) !important; }',
    '.wda-badge{',
    '  position:fixed; inset-inline-start:50%; transform:translateX(-50%); top:12px; z-index:2147483646;',
    '  background:#08130f; color:#e6c684; font-family:system-ui,sans-serif; font-size:12.5px;',
    '  padding:8px 18px; border-radius:999px; border:1px solid rgba(230,198,132,.4);',
    '  pointer-events:none; white-space:nowrap;',
    '}',
    // ===== شريط الأيقونات اللي بيطلع فوق أي جزء يتضغط عليه =====
    '.wda-tools{',
    '  position:absolute; z-index:2147483647; display:flex; gap:4px; padding:4px;',
    '  background:#08130f; border:1px solid rgba(230,198,132,.45); border-radius:999px;',
    '  box-shadow:0 8px 24px -8px rgba(0,0,0,.6); transform:translate(-50%,-100%);',
    '  opacity:0; pointer-events:none; transition:opacity .12s ease;',
    '}',
    '.wda-tools.on{ opacity:1; pointer-events:auto; }',
    '.wda-tools button{',
    '  width:30px; height:30px; display:flex; align-items:center; justify-content:center;',
    '  border:0; border-radius:50%; background:transparent; color:#e6c684; cursor:pointer; padding:0;',
    '}',
    '.wda-tools button:hover{ background:rgba(230,198,132,.18); }',
    '.wda-tools button.danger{ color:#e88b7a; }',
    '.wda-tools button.danger:hover{ background:rgba(232,139,122,.18); }',
    '.wda-tools svg{ width:15px; height:15px; }',
    // العنصر وهو بيتكتب فيه
    '.wda-writing{',
    '  outline:2.5px solid #e6c684 !important; outline-offset:3px;',
    '  background:rgba(230,198,132,.10); cursor:text !important;',
    '  min-width:24px; white-space:pre-wrap;',
    '}',
    '.wda-hidden-el{ display:none !important; }',
    // شاشة الغلاف: عناصرها بتفضل مركونة فوق الدعوة (top:0, z-index:990)
    // حتى وهي مقفولة، فأي ضغطة في أول الصفحة كانت بتروحلها هي مش للكلام
    // اللي تحتها. بنشيلها خالص في وضع التحرير، ولها زرار مستقل تفتحه بيه
    // لما تحب تعدّل عليها هي نفسها.
    '.wda-cover-off{ display:none !important; }',
    // الخريطة المدمجة iframe جوه صفحة تانية — بتبلع أي ضغطة قبل ما
    // توصل للمحرر، فكان مستحيل تختارها. في وضع التحرير بنقفل التفاعل
    // معاها (مش محتاجه وإنت بتعدّل أصلاً) فالضغطة توصل لنا.
    '.wda-editable iframe, .wda-editable video{ pointer-events:none !important; }',
  ].join('\n');
  document.head.appendChild(style);

  // أيقونات Lucide (نفس مكتبة أيقونات الموقع) — محطوطة كـ SVG جوّه
  // الملف لأن الصفحة دي تصميم Tilda عادي، مفيش React جواها تستورد منها،
  // و الـ CSP بتاعنا مبيسمحش بتحميل سكريبت من أي CDN.
  var ICON_PENCIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>';
  var ICON_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  var ICON_IMAGE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
  var ICON_PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>';

  var badge = document.createElement('div');
  badge.className = 'wda-badge';
  badge.textContent = 'وضع التحرير';
  document.body.appendChild(badge);

  function setBadge(text) {
    badge.textContent = text;
  }

  // ===== تصنيف العناصر =====
  /**
   * عنصر "حي" = التصميم بيعيد كتابة نصه لوحده (العداد التنازلي).
   * الكتابة جواه مستحيلة عمليًا: السكريبت بيمسح اللي تكتبه كل ثانية.
   * فبنسمح بتحريكه وتكبيره، بس مش بالكتابة فيه.
   */
  function isLiveElement(el) {
    if (['days', 'hours', 'minutes', 'seconds'].indexOf(el.id) !== -1) return true;
    return !!el.querySelector('#days, #hours, #minutes, #seconds');
  }

  /** عنصر الخريطة — ليه تحكّم خاص (لينك مكان) مش كتابة */
  function isMapElement(el) {
    if (el.querySelector('iframe[src*="google.com/maps"], iframe[src*="maps.google"]')) return true;
    return !!el.querySelector('a[href*="google.com/maps"], a[href*="maps.app.goo.gl"]');
  }

  /**
   * عنصر "مركّب" = جوّه تركيب HTML مش نص عادي (canvas، أقسام، روابط…).
   *
   * ليه ده مهم جدًا: الكتابة عندنا بتحط textContent، وده بيمسح كل
   * العناصر اللي جوه. حتة "اخدش لتظهر التاريخ" مثلاً عنصر واحد جواه
   * <style> و<div> و<canvas> — أول ما تكتب فيه، الخدش بيختفي خالص
   * والكلام بيرجع لخط النظام الوحش. ونفس الحكاية مع قسم RSVP والخريطة.
   *
   * القاعدة: <br> بس مسموح (سطور في فقرة عادية)، أي عنصر تاني معناه
   * إن ده تركيب — بيتحرك ويتكبّر، بس مبيتكتبش فيه.
   */
  function isRichElement(el) {
    var target = textTarget(el);
    var kids = target.children;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].tagName !== 'BR') return true;
    }
    return false;
  }

  function elementKind(el) {
    if (isMapElement(el)) return 'map';
    if (isLiveElement(el)) return 'live';
    // الفيديو (خلفية أول سيكشن) — ينفع يتبدّل بصورة
    if (el.querySelector('video')) return 'video';
    var img = el.tagName === 'IMG' ? el : el.querySelector('img');
    // الحد 12 مش 40: الزخارف الصغيرة (16px) كانت مستبعدة خالص
    if (img && img.offsetHeight > 12) return 'image';
    if (isRichElement(el)) return 'rich';
    return 'text';
  }

  /** rgb(...) → #rrggbb — منتقي اللون في المتصفح بيقبل hex بس */
  function rgbToHex(value) {
    var m = String(value || '').match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return '';
    return '#' + [m[1], m[2], m[3]].map(function (n) {
      return ('0' + parseInt(n, 10).toString(16)).slice(-2);
    }).join('');
  }

  /** مساحة العنصر — بنستخدمها نختار الأصغر (الأكثر تحديدًا) عند الضغط */
  function areaOf(el) {
    var r = el.getBoundingClientRect();
    return r.width * r.height;
  }

  /**
   * كل العناصر اللي ينفع تتحرك وتتكبّر: نصوص وصور وخرايط وعدادات.
   * قبل كده كانت النصوص بس، فنص عناصر التصميم (الصور خصوصًا) مكانتش
   * بتتحرك من مكانها خالص.
   */
  function movableElements() {
    var out = [];
    var nodes = document.querySelectorAll('[data-elem-id]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.closest('.wda-badge') || el.closest('.wda-tools')) continue;
      if (el.classList.contains('wda-hidden-el')) continue;
      if (!el.offsetHeight) continue;
      // بناخد أصغر عنصر عشان مانسحبش أقسام كاملة بالغلط
      if (el.querySelector('[data-elem-id]')) continue;
      var text = (el.innerText || '').trim();
      var img = el.tagName === 'IMG' ? el : el.querySelector('img');
      var video = el.querySelector('video');
      // لازم يكون فيه نص أو صورة أو فيديو — العناصر الفاضية مالهاش لازمة.
      // الفيديو كان مستبعد خالص قبل كده (مالوش نص ولا img)، عشان كده
      // خلفية أول سيكشن مكانش ينفع يتعمل فيها أي حاجة.
      if (!text && !video && !(img && img.offsetHeight > 12)) continue;
      if (text.length > 600) continue;
      out.push(el);
    }
    return out;
  }

  /** اللي ينفع تكتب فيه بس — من غير العدادات والخرايط والصور */
  function editableTextElements() {
    return movableElements().filter(function (el) {
      return elementKind(el) === 'text';
    });
  }

  function editableImages() {
    var out = [];
    var nodes = document.querySelectorAll('[data-elem-id]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var img = el.tagName === 'IMG' ? el : el.querySelector('img');
      if (img && img.offsetHeight > 40) out.push(el);
    }
    return out;
  }

  function elemId(el) {
    return el.getAttribute('data-elem-id');
  }

  function currentOffset(el) {
    var id = elemId(el);
    return state.offsets[id] || { dx: 0, dy: 0 };
  }

  function applyOffset(el, dx, dy) {
    el.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
    el.style.transition = 'none';
  }

  // ===== السحب =====
  /**
   * بيعلّم النصوص الظاهرة دلوقتي. بينادى أكتر من مرة عن قصد: الدعوة بتفتح
   * على شاشة "اضغط للفتح" وكل المحتوى تحتها مخفي (ارتفاعه صفر)، فأول مسح
   * بيلاقي صفر عناصر. بنعيد المسح لما المستخدم يفتح الدعوة أو التصميم
   * يحقن عناصر جديدة.
   */
  function markText() {
    // ملحوظة مهمة: التعليم ده مربوط بـ editingOn مش بالسحب.
    // قبل كده كان مربوط بميزة "drag"، يعني عميل الباقة الأساسية (اللي
    // مافيهاش سحب) مكانش يقدر يعدّل ولا كلمة واحدة — التحرير كله كان
    // مقفول عليه بالغلط.
    if (!state.editingOn) return;
    // عنصر بقى مخفي (الغلاف اتقفل مثلًا) لازم يخرج من دايرة التحرير،
    // غير كده يفضل قابل للسحب وهو مش ظاهر أصلًا
    document.querySelectorAll('.wda-editable').forEach(function (el) {
      if (!el.offsetHeight) el.classList.remove('wda-editable');
    });
    // كل حاجة بتتحرك — مش النصوص بس. الصور كانت مستثناة خالص قبل كده،
    // وهي نص عناصر التصميم تقريبًا.
    movableElements().forEach(function (el) {
      el.setAttribute('data-wda-kind', elementKind(el));
      // بنحفظ النص والمقاس الأصليين أول مرة نشوف العنصر فيها — من
      // غيرهم "رجوع للخلف" مش هيعرف يرجّع العنصر لأصله لما نلغي تعديل.
      var oid = elemId(el);
      if (oid && !(oid in state.originals)) {
        var tg = textTarget(el);
        state.originals[oid] = {
          text: (tg.innerText || '').trim(),
          size: Math.round(parseFloat(getComputedStyle(tg).fontSize) || 0),
        };
      }
      if (el.classList.contains('wda-editable')) return;
      el.classList.add('wda-editable');
      // (الكلاس بيتشال ويترجع مع وضع المعاينة، فبنعلّم بسمة مستقلة عشان
      // مانركبش أكتر من مستمع على نفس العنصر)
    });
  }

  // ===== توجيه الضغطة =====
  // مستمع واحد على الصفحة كلها بدل مستمع على كل عنصر. السبب: في
  // التصاميم فيه صور خلفية كبيرة قاعدة فوق النصوص، فالضغطة كانت بتروح
  // للخلفية والنص اللي تحتها ميتحددش أبدًا (ده كان بيحصل في قسم الحدث
  // في قالب Viktor & Paula).
  // elementsFromPoint بترجّع كل العناصر تحت المؤشر مش الأعلى بس، فبنختار
  // منهم الأصغر مساحةً — وده دايمًا الأكثر تحديدًا (النص مش الخلفية).
  document.addEventListener('click', function (e) {
    if (!state.editingOn || !e.isTrusted) return;
    if (e.target.closest && e.target.closest('.wda-tools')) return;
    if (Date.now() - state.lastDragEnd < 250) return;

    var stack = document.elementsFromPoint(e.clientX, e.clientY) || [];
    var found = [];
    for (var i = 0; i < stack.length; i++) {
      var cand = stack[i].closest ? stack[i].closest('.wda-editable') : null;
      if (cand && found.indexOf(cand) === -1) found.push(cand);
    }

    if (!found.length) { if (!state.writing) select(null); return; }

    // الترتيب: الصور آخر حاجة، وبعدين الأصغر مساحةً.
    //
    // ليه الاتنين مع بعض:
    //   - "الصور آخر حاجة" عشان النص اللي تحت صورة خلفية يتحدد هو مش
    //     الخلفية (قسم الحدث في Viktor & Paula).
    //   - "الأصغر" عشان لو اتنين نص فوق بعض، الأكثر تحديدًا يكسب.
    // من غير الشرط الأول، الرسمة اللي جنب الخريطة كانت بتكسبها لأنها
    // أصغر منها بشوية.
    found.sort(function (a, b) {
      var ai = a.getAttribute('data-wda-kind') === 'image' ? 1 : 0;
      var bi = b.getAttribute('data-wda-kind') === 'image' ? 1 : 0;
      if (ai !== bi) return ai - bi;
      return areaOf(a) - areaOf(b);
    });
    var best = found[0];

    if (state.writing && state.writing.host === best) return;
    e.preventDefault();
    e.stopPropagation();
    select(best);
    // الكتابة للنصوص العادية بس. العداد التصميم بيعيد كتابته كل ثانية،
    // والعناصر المركّبة (الخدش/RSVP/الخريطة) الكتابة بتدهس تركيبها،
    // والصور مالهاش نص — دول بيتحركوا ويتكبّروا من الشريط الجانبي.
    if (elementKind(best) === 'text') startWriting(best);
  }, true);

  /** بيفتح التحرير (تعليم العناصر + الضغط عليها) — من غير سحب */
  function enableEditing() {
    if (state.editingOn) return;
    state.editingOn = true;
    markText();
  }

  /** السحب ميزة باقة لوحدها — بتتفتح فوق التحرير */
  function enableDragging() {
    if (state.dragEnabled || typeof window.interact !== 'function') return;
    enableEditing();
    state.dragEnabled = true;

    // interact بيشتغل بمُحدِّد CSS، فأي عنصر ياخد الكلاس بعدين بيبقى
    // قابل للسحب تلقائيًا من غير تسجيل جديد.
    window.interact('.wda-editable').draggable({
      inertia: false,
      autoScroll: true,
      listeners: {
        start: function (event) {
          event.target.classList.add('wda-dragging');
          // بنصوّر الأماكن قبل السحبة عشان "رجوع للخلف" يرجّع مكان
          // العنصر قبل ما تمسكه، مش بعد أول تحريكة
          state.offsetsBeforeDrag = JSON.parse(JSON.stringify(state.offsets));
          select(event.target);
        },
        move: function (event) {
          var el = event.target;
          var o = currentOffset(el);
          var dx = o.dx + event.dx;
          var dy = o.dy + event.dy;
          state.offsets[elemId(el)] = { dx: dx, dy: dy };
          applyOffset(el, dx, dy);
          setBadge('تحريك: ' + Math.round(dx) + ' × ' + Math.round(dy));
        },
        end: function (event) {
          event.target.classList.remove('wda-dragging');
          // الضغطة اللي بتيجي بعد السحب على طول مالهاش لازمة — من غير
          // العلم ده كل سحبة كانت هتفتح الكتابة في آخرها
          state.lastDragEnd = Date.now();
          setBadge('وضع التحرير');
          send('offsets', { offsets: state.offsets, before: state.offsetsBeforeDrag });
          state.offsetsBeforeDrag = null;
        },
      },
    });
  }

  function disableDragging() {
    if (!state.dragEnabled) return;
    state.dragEnabled = false;
    if (typeof window.interact === 'function') window.interact('.wda-editable').unset();
    document.querySelectorAll('.wda-editable').forEach(function (el) {
      el.classList.remove('wda-editable');
    });
  }

  // ===== شريط الأيقونات =====
  var tools = document.createElement('div');
  tools.className = 'wda-tools';
  tools.innerHTML =
    '<button type="button" data-act="edit" title="عدّل النص">' + ICON_PENCIL + '</button>' +
    '<button type="button" data-act="delete" class="danger" title="احذف">' + ICON_TRASH + '</button>';
  document.body.appendChild(tools);

  // mousedown مش click: الضغط على الزرار وهو النص متفتوح للكتابة كان
  // بيشيل التركيز من العنصر الأول فيتقفل قبل ما الضغطة تتسجّل.
  tools.addEventListener('mousedown', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var act = btn.getAttribute('data-act');
    if (act === 'edit') startWriting(state.selected);
    else if (act === 'done') stopWriting(true);
    else if (act === 'delete') removeElement(state.selected);
    else if (act === 'image') send('pick-image', { id: elemId(state.selected) });
    else if (act === 'map') send('pick-map', { id: elemId(state.selected) });
  });

  /** بيحط الشريط فوق العنصر ويبدّل أيقوناته حسب نوعه */
  function showTools(el, mode) {
    if (!el) { tools.classList.remove('on'); return; }
    var kind = el.getAttribute('data-wda-kind') || 'text';

    var first;
    if (mode === 'writing') {
      first = '<button type="button" data-act="done" title="خلصت">' + ICON_CHECK + '</button>';
    } else if (kind === 'image' || kind === 'video') {
      first = '<button type="button" data-act="image" title="'
        + (kind === 'video' ? 'حط صورة مكان الفيديو' : 'غيّر الصورة') + '">' + ICON_IMAGE + '</button>';
    } else if (kind === 'map') {
      first = '<button type="button" data-act="map" title="غيّر المكان">' + ICON_PIN + '</button>';
    } else if (kind === 'live' || kind === 'rich') {
      // العداد والعناصر المركّبة (الخدش، RSVP) بيتحركوا ويتكبّروا بس —
      // الكتابة جواهم بتدهس تركيبهم
      first = '';
    } else {
      first = '<button type="button" data-act="edit" title="عدّل النص">' + ICON_PENCIL + '</button>';
    }

    tools.innerHTML = first
      + '<button type="button" data-act="delete" class="danger" title="احذف">' + ICON_TRASH + '</button>';

    var r = el.getBoundingClientRect();
    tools.style.left = (r.left + window.scrollX + r.width / 2) + 'px';
    tools.style.top = (r.top + window.scrollY - 8) + 'px';
    tools.classList.add('on');
  }

  function hideTools() { tools.classList.remove('on'); }

  // الشريط بيفضل ملزوق بالعنصر مع أي تمرير أو تغيير حجم
  window.addEventListener('scroll', function () {
    if (state.selected && tools.classList.contains('on')) {
      showTools(state.selected, state.writing ? 'writing' : 'idle');
    }
  }, { passive: true });
  window.addEventListener('resize', function () {
    if (state.selected) showTools(state.selected, state.writing ? 'writing' : 'idle');
  });

  // ===== الكتابة جوه العنصر نفسه =====
  /**
   * أعمق عنصر شايل النص فعلاً.
   *
   * في تصاميم Tilda النص جوه .tn-atom، بس أحيانًا جواه غلاف تاني
   * (<div> أو <span> واحد شايل نفس النص). لو كتبنا على الغلاف الخارجي
   * بنمسح الداخلي بستايله — وده اللي كان بيخلي الخط يرجع وحش. فبننزل
   * لحد آخر عنصر نصه هو نفس النص كله.
   */
  function textTarget(el) {
    var node = el.querySelector('.tn-atom') || el;
    var guard = 0;
    while (guard++ < 6) {
      var kids = [];
      for (var i = 0; i < node.children.length; i++) {
        if (node.children[i].tagName !== 'BR') kids.push(node.children[i]);
      }
      if (kids.length !== 1) break;
      var only = kids[0];
      if ((only.textContent || '').trim() !== (node.textContent || '').trim()) break;
      node = only;
    }
    return node;
  }

  /**
   * بيحط نص في عنصر بأمان: textContent مش innerHTML أبدًا.
   * ولو النص فيه سطور، بنخلي العنصر يحترمها بـ pre-wrap بدل ما
   * نحقن <br> — كده مفيش أي طريق لـ HTML يدخل التصميم.
   */
  function setText(target, text) {
    target.textContent = text;
    if (String(text).indexOf('\n') !== -1) {
      target.style.whiteSpace = 'pre-wrap';
    }
  }

  function startWriting(el) {
    if (!el || state.writing) return;
    var target = textTarget(el);
    state.writing = { host: el, target: target, before: (target.innerText || '').trim() };

    // العنصر لازم يخرج من دايرة السحب وهو بيتكتب، غير كده interact.js
    // هيخطف الماوس ومش هتقدر تحدد ولا تحط المؤشر في نص الكلام.
    el.classList.remove('wda-editable');
    el.classList.add('wda-writing');

    // plaintext-only بيمنع لصق HTML منسّق جوه التصميم؛ ولو المتصفح
    // مش داعمه بنرجع لـ true ونعقّم اللصق بإيدنا تحت.
    try { target.contentEditable = 'plaintext-only'; } catch (err) { target.contentEditable = 'true'; }
    if (target.contentEditable !== 'plaintext-only') target.contentEditable = 'true';

    target.focus();
    var range = document.createRange();
    range.selectNodeContents(target);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    target.addEventListener('keydown', onWriteKey);
    target.addEventListener('paste', onWritePaste);
    target.addEventListener('blur', onWriteBlur);

    setBadge('اكتب... واضغط Enter لما تخلص');
    showTools(el, 'writing');
  }

  function onWriteKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); stopWriting(true); }
    if (e.key === 'Escape') { e.preventDefault(); stopWriting(false); }
  }

  // Ctrl+Z / Ctrl+Shift+Z وإنت واقف جوه الدعوة.
  // لازم يتمسك هنا ويتبعت للصفحة الأم: التركيز بيكون جوه الـ iframe،
  // فالاختصار عمره ما هيوصل لمستمع الصفحة الأم لوحده.
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey) || String(e.key).toLowerCase() !== 'z') return;
    e.preventDefault();
    if (state.writing) stopWriting(true);
    send('history', { redo: !!e.shiftKey });
  }, true);

  /** اللصق بيتحوّل لنص خام دايمًا — مفيش أي وسوم بتدخل التصميم */
  function onWritePaste(e) {
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, String(text || '').replace(/\s+/g, ' '));
  }

  function onWriteBlur() { stopWriting(true); }

  function stopWriting(save) {
    var w = state.writing;
    if (!w) return;
    state.writing = null;

    w.target.removeEventListener('keydown', onWriteKey);
    w.target.removeEventListener('paste', onWritePaste);
    w.target.removeEventListener('blur', onWriteBlur);
    w.target.contentEditable = 'false';
    w.host.classList.remove('wda-writing');

    // بنلمّ المسافات الزيادة بس ونسيب السطور زي ما هي — الفقرات
    // اللي فيها <br> كانت بتتلم في سطر واحد ويضيع تنسيقها.
    var after = (w.target.innerText || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

    if (!save || !after) {
      setText(w.target, w.before); // إلغاء أو نص فاضي = رجوع للأصل
    } else if (after !== w.before) {
      setText(w.target, after);
      send('text-change', { id: elemId(w.host), oldText: w.before, newText: after });
    }

    if (state.editingOn) w.host.classList.add('wda-editable');
    setBadge('وضع التحرير');
    showTools(w.host, 'idle');
  }

  // ===== الحذف =====
  function removeElement(el) {
    if (!el) return;
    if (state.writing) stopWriting(false);
    el.classList.add('wda-hidden-el');
    hideTools();
    state.selected = null;
    send('hide', { id: elemId(el) });
    setBadge('اتحذف — تقدر ترجّعه من الشريط الجانبي');
    setTimeout(function () { setBadge('وضع التحرير'); }, 2600);
  }

  // ===== الاختيار =====
  function select(el) {
    if (state.writing && state.writing.host !== el) stopWriting(true);
    if (state.selected) state.selected.classList.remove('wda-selected');
    state.selected = el;
    if (el) {
      el.classList.add('wda-selected');
      showTools(el, 'idle');
      var target = textTarget(el);
      send('selected', {
        id: elemId(el),
        kind: el.getAttribute('data-wda-kind') || 'text',
        text: (el.innerText || '').trim().slice(0, 120),
        // المقاس الحالي فعليًا زي ما المتصفح بيرسمه — عشان السلايدر
        // يبدأ من مكان صح مش من رقم مفترض
        fontSize: Math.round(parseFloat(getComputedStyle(target).fontSize) || 0),
        isImage: !!el.getAttribute('data-wda-img'),
        // لون الخلفية الحالي بصيغة hex — عشان منتقي اللون يبدأ صح
        bgColor: rgbToHex(getComputedStyle(el.querySelector('.tn-atom') || el).backgroundColor),
      });
    } else {
      hideTools();
      send('selected', { id: null });
    }
  }

  // (إلغاء الاختيار عند الضغط على فاضي بقى جوه موجّه الضغطة فوق)

  /**
   * بتحط صورة في عنصر — سواء كان صورة عادية أو خلفية أو **فيديو**.
   * الفيديو بيتخفي وبيتحط مكانه <img> بنفس المقاس (بنبنيه بـ
   * createElement مش innerHTML).
   */
  function applyImageTo(host, url) {
    var video = host.querySelector('video');
    if (video) {
      if (video.pause) video.pause();
      video.style.display = 'none';
      var shot = host.querySelector('[data-wda-video-img]');
      if (!shot) {
        shot = document.createElement('img');
        shot.setAttribute('data-wda-video-img', '1');
        shot.style.width = '100%';
        shot.style.height = '100%';
        shot.style.objectFit = 'cover';
        shot.style.display = 'block';
        video.parentNode.insertBefore(shot, video);
      }
      shot.src = url;
      return;
    }

    var img = host.tagName === 'IMG' ? host : host.querySelector('img');
    if (img) {
      img.setAttribute('data-original', url);
      img.src = url;
    }
    var bg = host.querySelector('.tn-atom') || host;
    if (bg && getComputedStyle(bg).backgroundImage !== 'none') {
      bg.style.backgroundImage = 'url("' + url + '")';
    }
  }

  // ===== الصور =====
  function markImages() {
    if (!state.imagesEnabled) return;
    document.querySelectorAll('.wda-img-editable').forEach(function (el) {
      if (!el.offsetHeight) el.classList.remove('wda-img-editable');
    });
    editableImages().forEach(function (el) {
      if (el.getAttribute('data-wda-img')) {
        el.classList.add('wda-img-editable');
        return;
      }
      // الاختيار نفسه بقى في markText (بيغطي كل الأنواع)، فهنا بنعلّم
      // الصورة بس عشان الشريط يعرف يعرض زرار تغيير الصورة
      el.setAttribute('data-wda-img', '1');
      el.classList.add('wda-img-editable');
    });
  }

  function enableImageEditing() {
    state.imagesEnabled = true;
    markImages();
  }

  function disableImageEditing() {
    state.imagesEnabled = false;
    document.querySelectorAll('[data-wda-img]').forEach(function (el) {
      el.classList.remove('wda-img-editable');
    });
  }

  // ===== شاشة الغلاف =====
  /**
   * سجل الغلاف = العنصر اللي جواه زرار الدخول (.popup-enter). التلات
   * تصاميم كلها بتستخدم نفس الكلاس ده، فمفيش داعي نعرف رقم كل سجل.
   */
  function coverRecord() {
    var enter = document.querySelector('.popup-enter');
    return enter ? enter.closest('.t-rec') : null;
  }

  function setCoverVisible(on) {
    var rec = coverRecord();
    if (!rec) return;
    state.coverVisible = !!on;
    rec.classList.toggle('wda-cover-off', !on);
    if (on) window.scrollTo({ top: 0, behavior: 'smooth' });
    // عناصر الغلاف بتدخل وتخرج من دايرة التحرير مع الزرار ده
    select(null);
    rescan();
    send('cover', { visible: state.coverVisible, exists: true });
  }

  // إعادة المسح: التصميم بيكشف عناصر بعد فتح الغلاف وبعد التمرير، فبنفضل
  // نراجع كل شوية بدل ما نفترض إن كل حاجة ظهرت من أول لحظة.
  var lastCounts = '';
  function rescan() {
    markText();
    markImages();
    // العدّاد بيتحدّث مع ظهور العناصر (صور Tilda بتتحمّل كسول)، فبنبلّغ
    // الشريط الجانبي بس لما الرقم يتغيّر فعلاً.
    var texts = document.querySelectorAll('.wda-editable').length;
    var imgs = document.querySelectorAll('.wda-img-editable').length;
    var key = texts + '/' + imgs;
    if (key !== lastCounts) {
      lastCounts = key;
      send('ready', { textCount: texts, imageCount: imgs });
    }
  }

  document.addEventListener('click', function () { setTimeout(rescan, 400); }, true);
  window.addEventListener('scroll', function () { rescan(); }, { passive: true });
  setInterval(rescan, 1200);

  // ===== صوت واحد بس في نفس الوقت =====
  // الدعوة فيها موسيقاها، والشريط الجانبي فيه معاينة المكتبة ومشغّل
  // القص. الكل كان بيشتغل مع بعض ويطلع صوتين فوق بعض. بنبلّغ الصفحة
  // الأم أول ما أي صوت هنا يبدأ، وهي بتسكّت اللي عندها.
  document.addEventListener('play', function (e) {
    var el = e && e.target;
    if (!el || (el.tagName !== 'AUDIO' && el.tagName !== 'VIDEO')) return;
    // الفيديوهات الصامتة (خلفيات التصميم) مالهاش دعوة
    if (el.muted || el.volume === 0) return;
    send('audio-playing', {});
    // ولو فيه صوت تاني هنا نفسه شغال، بنوقفه
    var all = document.querySelectorAll('audio, video');
    for (var i = 0; i < all.length; i++) {
      if (all[i] !== el && !all[i].paused && !all[i].muted) {
        try { all[i].pause(); } catch (err) { /* */ }
      }
    }
  }, true);

  // ===== أوامر جاية من الصفحة الأم =====
  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin) return;
    var msg = event.data || {};
    if (msg.source !== 'mithaq-shell') return;

    var p = msg.payload || {};

    // قايمة المحذوفات كاملة من الشريط الجانبي (بعد حذف أو استرجاع)
    if (msg.type === 'apply-hidden') {
      var hidden = p.hidden || [];
      document.querySelectorAll('.wda-hidden-el').forEach(function (el) {
        if (hidden.indexOf(el.getAttribute('data-elem-id')) === -1) {
          el.classList.remove('wda-hidden-el');
        }
      });
      hidden.forEach(function (hid) {
        var el = document.querySelector('[data-elem-id="' + hid + '"]');
        if (el) el.classList.add('wda-hidden-el');
      });
      rescan();
    }

    // نص اتعدّل من بره (أو اترجّع) — بنطبّقه على العنصر
    if (msg.type === 'set-text' && p.id) {
      var host = document.querySelector('[data-elem-id="' + p.id + '"]');
      if (host) textTarget(host).textContent = p.text;
    }

    if (msg.type === 'init') {
      state.offsets = p.offsets || {};
      // المقاسات المحفوظة بتتطبّق inline في وضع التحرير (زي الإزاحات)،
      // لأن قاعدة الـ CSS المحقونة بـ !important هتغلب على المعاينة
      // اللحظية وإنت بتحرّك السلايدر
      Object.keys(p.sizes || {}).forEach(function (sid) {
        var host = document.querySelector('[data-elem-id="' + sid + '"]');
        if (!host) return;
        textTarget(host).style.setProperty('font-size', p.sizes[sid] + 'px', 'important');
        host.style.setProperty('font-size', p.sizes[sid] + 'px', 'important');
      });
      Object.keys(p.colors || {}).forEach(function (cid) {
        var host = document.querySelector('[data-elem-id="' + cid + '"]');
        if (!host) return;
        (host.querySelector('.tn-atom') || host).style.setProperty('background-color', p.colors[cid], 'important');
        host.style.setProperty('background-color', p.colors[cid], 'important');
      });
      (p.hidden || []).forEach(function (hid) {
        var el = document.querySelector('[data-elem-id="' + hid + '"]');
        if (el) el.classList.add('wda-hidden-el');
      });
      // نطبّق الإزاحات المحفوظة على طول
      Object.keys(state.offsets).forEach(function (id) {
        var el = document.querySelector('[data-elem-id="' + id + '"]');
        if (el) applyOffset(el, state.offsets[id].dx, state.offsets[id].dy);
      });
      // النصوص المضافة بتتبني من سكريبت التخصيصات وقت التحميل —
      // هنا بنفتح التفاعل معاها عشان تتمسك وتتعدّل
      document.querySelectorAll('[data-wda-added]').forEach(function (el) {
        el.style.pointerEvents = 'auto';
      });

      // الغلاف بيتشال من الطريق أول ما المحرر يفتح
      var rec = coverRecord();
      if (rec) rec.classList.add('wda-cover-off');
      send('cover', { visible: false, exists: !!rec });

      // التحرير مفتوح لأي صاحب دعوة مميزة — حتى الباقة الأساسية.
      // السحب هو اللي ميزة باقة لوحدها.
      enableEditing();
      if (p.features && p.features.indexOf('drag') !== -1) enableDragging();
      if (p.features && p.features.indexOf('images') !== -1) enableImageEditing();
      send('caps', { canDrag: state.dragEnabled, canImages: state.imagesEnabled });
      rescan(); // بيبعت العدّاد بنفسه
    }

    if (msg.type === 'set-font') {
      var id = 'wda-live-font';
      var old = document.getElementById(id);
      if (old) old.remove();
      if (p.font) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=' + p.font.replace(/ /g, '+') + ':wght@400;700&display=swap';
        document.head.appendChild(link);
        var st = document.createElement('style');
        st.id = id;
        st.textContent = ".t-text,.t-title,.t-descr,.t-name,.tn-atom{font-family:'" + p.font + "',sans-serif !important;}";
        document.head.appendChild(st);
      }
    }

    if (msg.type === 'set-image' && p.id && p.url) {
      var host = document.querySelector('[data-elem-id="' + p.id + '"]');
      if (host) applyImageTo(host, p.url);
    }

    // معاينة لحظية للون (مربعات الزي المقترح)
    if (msg.type === 'set-color' && p.id) {
      var cHost = document.querySelector('[data-elem-id="' + p.id + '"]');
      if (cHost) {
        var cAtom = cHost.querySelector('.tn-atom') || cHost;
        if (p.color) {
          cAtom.style.setProperty('background-color', p.color, 'important');
          cHost.style.setProperty('background-color', p.color, 'important');
        } else {
          cAtom.style.removeProperty('background-color');
          cHost.style.removeProperty('background-color');
        }
      }
    }

    if (msg.type === 'set-audio' && p.url) {
      var audio = document.getElementById('invitation-audio');
      if (audio) {
        var src = audio.querySelector('source');
        if (src) src.src = p.url;
        audio.src = p.url;
        audio.load();
      }
    }

    // الشريط الجانبي بيشغّل أغنية (معاينة أو قص) — بنسكّت اللي جوه
    // الدعوة عشان مايبقاش فيه صوتين مع بعض
    if (msg.type === 'pause-audio') {
      var all = document.querySelectorAll('audio, video');
      for (var ai = 0; ai < all.length; ai++) {
        try { if (!all[ai].paused) all[ai].pause(); } catch (e) { /* */ }
      }
    }

    if (msg.type === 'toggle-tools') {
      if (p.on) {
        enableEditing();
        enableImageEditing();
        badge.style.display = '';
      } else {
        // وضع المعاينة: كل أثر للتحرير بيختفي عشان يشوف شكل الضيف بالظبط
        if (state.writing) stopWriting(true);
        select(null);
        state.editingOn = false;
        disableDragging();
        disableImageEditing();
        document.querySelectorAll('.wda-editable').forEach(function (el) {
          el.classList.remove('wda-editable');
        });
        badge.style.display = 'none';
      }
    }

    // الشريط الجانبي بيحرّك بالأسهم بكسل بكسل — بيبعت الخريطة كاملة
    // وإحنا بنعيد تطبيقها (أرخص وأأمن من تتبع كل عنصر لوحده).
    if (msg.type === 'apply-offsets') {
      var incoming = p.offsets || {};
      Object.keys(state.offsets).forEach(function (oldId) {
        if (!incoming[oldId]) {
          var stale = document.querySelector('[data-elem-id="' + oldId + '"]');
          if (stale) stale.style.transform = '';
        }
      });
      state.offsets = incoming;
      Object.keys(incoming).forEach(function (oid) {
        var el = document.querySelector('[data-elem-id="' + oid + '"]');
        if (el) applyOffset(el, incoming[oid].dx, incoming[oid].dy);
      });
    }

    if (msg.type === 'toggle-cover') setCoverVisible(!!p.on);

    // ===== النصوص المضافة =====
    // البناء نفسه بيتم بنفس الدالة اللي الضيف بيشوف بيها الدعوة
    // (utils/customizations.js بيعرّضها على window) — مصدر واحد، فاللي
    // بتشوفه وإنت بتعدّل هو اللي هيتشاف بالظبط.
    if (msg.type === 'apply-added') {
      if (typeof window.__wdaApplyAdded === 'function') {
        window.__wdaApplyAdded(p.added || []);
        // في وضع التحرير لازم تتمسك وتتضغط
        document.querySelectorAll('[data-wda-added]').forEach(function (el) {
          el.style.pointerEvents = 'auto';
        });
        rescan();
      }
    }

    // إضافة نص جديد: بيتحط في نص الشاشة الحالية عشان يبان قدام العميل
    // على طول من غير ما يدوّر عليه
    if (msg.type === 'add-text') {
      var docW = document.documentElement.scrollWidth || window.innerWidth;
      var item = {
        id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text: p.text || 'اكتب هنا',
        xPct: 50,
        y: Math.round(window.scrollY + window.innerHeight / 2),
        size: 22,
        color: '#333333',
        align: 'center',
      };
      send('added-new', { item: item, docWidth: docW });
    }

    // ===== رجوع للخلف / إعادة =====
    // بتاخد نسخة كاملة من التخصيصات وتطبّقها على الدعوة مرة واحدة.
    // أي عنصر مش موجود في النسخة دي بيرجع لأصله من state.originals —
    // وده اللي بيخلي إلغاء تعديل نص أو مقاس يرجّع الشكل الأصلي فعلاً
    // بدل ما يسيبه على آخر قيمة.
    if (msg.type === 'restore') {
      var c = p.customizations || {};
      if (state.writing) stopWriting(false);

      // 1) النصوص
      var texts = c.texts || {};
      Object.keys(state.originals).forEach(function (oid) {
        var host = document.querySelector('[data-elem-id="' + oid + '"]');
        if (!host) return;
        var want = (oid in texts) ? texts[oid] : state.originals[oid].text;
        var tg = textTarget(host);
        if ((tg.innerText || '').trim() !== want) setText(tg, want);
      });

      // 2) المقاسات
      var sizes = c.sizes || {};
      Object.keys(state.originals).forEach(function (oid) {
        var host = document.querySelector('[data-elem-id="' + oid + '"]');
        if (!host) return;
        var tg = textTarget(host);
        if (oid in sizes) {
          tg.style.setProperty('font-size', sizes[oid] + 'px', 'important');
          host.style.setProperty('font-size', sizes[oid] + 'px', 'important');
        } else {
          tg.style.removeProperty('font-size');
          host.style.removeProperty('font-size');
        }
      });

      // 3) الإزاحات
      Object.keys(state.offsets).forEach(function (oid) {
        if (!(c.offsets || {})[oid]) {
          var stale = document.querySelector('[data-elem-id="' + oid + '"]');
          if (stale) stale.style.transform = '';
        }
      });
      state.offsets = c.offsets || {};
      Object.keys(state.offsets).forEach(function (oid) {
        var el = document.querySelector('[data-elem-id="' + oid + '"]');
        if (el) applyOffset(el, state.offsets[oid].dx, state.offsets[oid].dy);
      });

      // 4) المخفي
      var hidden = c.hidden || [];
      document.querySelectorAll('.wda-hidden-el').forEach(function (el) {
        if (hidden.indexOf(el.getAttribute('data-elem-id')) === -1) {
          el.classList.remove('wda-hidden-el');
        }
      });
      hidden.forEach(function (hid) {
        var el = document.querySelector('[data-elem-id="' + hid + '"]');
        if (el) el.classList.add('wda-hidden-el');
      });

      // 5) الصور
      Object.keys(c.images || {}).forEach(function (iid) {
        var host = document.querySelector('[data-elem-id="' + iid + '"]');
        if (host) applyImageTo(host, c.images[iid]);
      });

      // 6) الألوان
      Object.keys(state.originals).forEach(function (oid) {
        var h = document.querySelector('[data-elem-id="' + oid + '"]');
        if (!h) return;
        var a = h.querySelector('.tn-atom') || h;
        var want = (c.colors || {})[oid];
        if (want) {
          a.style.setProperty('background-color', want, 'important');
          h.style.setProperty('background-color', want, 'important');
        } else {
          a.style.removeProperty('background-color');
          h.style.removeProperty('background-color');
        }
      });

      // 7) النصوص المضافة (إضافة أو حذف بيترجعوا من هنا)
      if (typeof window.__wdaApplyAdded === 'function') {
        window.__wdaApplyAdded(c.added || []);
        document.querySelectorAll('[data-wda-added]').forEach(function (el) {
          el.style.pointerEvents = 'auto';
        });
      }

      select(null);
      rescan();
    }

    // معاينة لحظية لمقاس الخط وإنت بتحرّك السلايدر
    if (msg.type === 'set-size' && p.id) {
      var sHost = document.querySelector('[data-elem-id="' + p.id + '"]');
      if (sHost) {
        var sTarget = textTarget(sHost);
        if (p.size) {
          sTarget.style.setProperty('font-size', p.size + 'px', 'important');
          sHost.style.setProperty('font-size', p.size + 'px', 'important');
        } else {
          // فاضي = رجّعه لمقاس التصميم الأصلي
          sTarget.style.removeProperty('font-size');
          sHost.style.removeProperty('font-size');
        }
        if (state.selected === sHost) showTools(sHost, state.writing ? 'writing' : 'idle');
      }
    }

    if (msg.type === 'reset-offsets') {
      Object.keys(state.offsets).forEach(function (oid) {
        var el = document.querySelector('[data-elem-id="' + oid + '"]');
        if (el) el.style.transform = '';
      });
      state.offsets = {};
      send('offsets', { offsets: {} });
    }
  });

  // ===== التبليغ إن السكريبت جاهز =====
  // مانستناش حدث load: تصاميم Tilda بتفضل بتحمّل موارد خارجية (خطوط،
  // صور من الـ CDN) وممكن واحد منها يعلّق، فالحدث ميحصلش خالص والمحرر
  // يفضل ميت. بنبلّغ فورًا ونعيد التبليغ لحد ما الأم ترد بـ init.
  var announced = false;
  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (m.source === 'mithaq-shell' && m.type === 'init') announced = true;
  });

  var tries = 0;
  var announceTimer = setInterval(function () {
    if (announced || ++tries > 40) return clearInterval(announceTimer);
    send('loaded', {});
    return undefined;
  }, 500);
  send('loaded', {});
})();
