// مكتبة الموسيقى — إنت بترفع الأغاني هنا، والعملاء بيدوّروا فيها
// ويختاروا منها في محرر الدعوة.
//
// ليه المكتبة من عندك: حقوق الموسيقى. خدمات زي Spotify مبتسمحش
// بتشغيل الأغنية كاملة في موقع تاني، فالأغاني اللي بترفعها إنت هي
// اللي معروف مصدرها ومسؤوليتها واضحة.
import { useRef, useState } from 'react';
import { Music, Upload, Trash2, Eye, EyeOff, Search, Loader2, Plus } from 'lucide-react';
import {
  useGetTracksQuery, useAddTrackMutation, useUpdateTrackMutation,
  useDeleteTrackMutation, useUploadTrackFileMutation,
} from '../../store/adminApi.js';
import {
  Panel, Badge, Btn, Field, Table, Row, Cell, Spinner, Empty, fmtDate,
} from '../../components/admin/ui.jsx';
import { tooBig, sizeError, uploadError, MAX_UPLOAD_LABEL } from '../../lib/uploadLimits.js';

/** ثواني → د:ث */
function fmtDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function MusicPage() {
  const [q, setQ] = useState('');
  const { data, isLoading, isFetching } = useGetTracksQuery(q);
  const [addTrack, { isLoading: adding }] = useAddTrackMutation();
  const [updateTrack] = useUpdateTrackMutation();
  const [deleteTrack] = useDeleteTrackMutation();
  const [uploadFile, { isLoading: uploading }] = useUploadTrackFileMutation();

  const fileRef = useRef(null);
  const [form, setForm] = useState({ title: '', artist: '', mood: '' });
  const [pending, setPending] = useState(null); // الملف المرفوع اللي مستني بياناته
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    // الفحص قبل الرفع: المنصة بترفض أي حاجة أكبر من كده قبل ما توصل
    // السيرفر، فالرسالة اللي كانت بتطلع مكنتش ليها علاقة بالسبب
    if (tooBig(file)) { setError(sizeError(file)); return; }
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadFile(fd).unwrap();
      setPending(res);
      // اسم الملف اقتراح مبدئي للعنوان — بيوفّر كتابة
      if (!form.title) {
        setForm((f) => ({ ...f, title: file.name.replace(/\.[^.]+$/, '').slice(0, 120) }));
      }
    } catch (err) {
      setError(uploadError(err));
    }
  }

  async function save() {
    if (!pending || !form.title.trim()) return;
    setError('');
    try {
      await addTrack({ ...form, ...pending }).unwrap();
      setPending(null);
      setForm({ title: '', artist: '', mood: '' });
    } catch (err) {
      setError(err?.data?.error || 'الحفظ فشل، جرّب تاني.');
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-[21px] font-bold text-ivory">مكتبة الموسيقى</h1>
        <p className="mt-0.5 text-[12.5px] text-ivory/45">
          الأغاني اللي بترفعها هنا بتظهر للعملاء في المحرر — بيدوّروا فيها، يسمعوها، ويقصّوا المقطع اللي عايزينه.
        </p>
      </div>

      {error && <div className="rounded-xl bg-error/15 px-4 py-3 text-[12.5px] text-error">{error}</div>}

      {/* الرفع */}
      <Panel title="ضيف أغنية" subtitle={`MP3 أو M4A أو OGG — لحد ${MAX_UPLOAD_LABEL}`}>
        <input ref={fileRef} type="file" accept="audio/*" onChange={onPickFile} hidden />

        {!pending ? (
          <Btn tone="gold" icon={Upload} loading={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? 'بيترفع...' : 'اختار ملف الأغنية'}
          </Btn>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ok/40 bg-ok/[0.07] p-3">
              <Music size={15} className="text-ok" />
              <span className="text-[12.5px] text-ok">الملف اترفع ({fmtDuration(pending.duration)})</span>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio controls src={pending.url} className="h-8 flex-1 min-w-[220px]" />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                label="اسم الأغنية"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <Field
                label="الفنان (اختياري)"
                value={form.artist}
                onChange={(e) => setForm({ ...form, artist: e.target.value })}
              />
              <Field
                label="التصنيف"
                placeholder="هادية · فرح · عربي · أجنبي"
                value={form.mood}
                onChange={(e) => setForm({ ...form, mood: e.target.value })}
                hint="بيسهّل على العميل يلاقيها في البحث"
              />
            </div>

            <div className="flex gap-2">
              <Btn tone="gold" icon={Plus} loading={adding} disabled={!form.title.trim()} onClick={save}>
                ضيفها للمكتبة
              </Btn>
              <Btn onClick={() => { setPending(null); setForm({ title: '', artist: '', mood: '' }); }}>
                إلغاء
              </Btn>
            </div>
          </div>
        )}
      </Panel>

      {/* القايمة */}
      <Panel
        title={data ? `${data.tracks.length} أغنية` : 'المكتبة'}
        subtitle={isFetching ? 'بيحدّث...' : undefined}
      >
        <div className="mb-4 flex items-center gap-2">
          <Search size={15} className="text-ivory/35" />
          <Field
            placeholder="ابحث بالاسم أو الفنان أو التصنيف..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1"
          />
        </div>

        {isLoading ? <Spinner /> : !data || data.tracks.length === 0 ? (
          <Empty>مفيش أغاني في المكتبة لسه — ارفع أول واحدة من فوق.</Empty>
        ) : (
          <Table head={['الأغنية', 'التصنيف', 'المدة', 'تسمع', 'الحالة', '']}>
            {data.tracks.map((tr) => (
              <Row key={tr.id}>
                <Cell>
                  <div className="font-bold text-ivory">{tr.title}</div>
                  <div className="text-[11px] text-ivory/40">
                    {tr.artist || '—'} · {fmtDate(tr.createdAt)}
                  </div>
                </Cell>
                <Cell>{tr.mood ? <Badge tone="gold">{tr.mood}</Badge> : <span className="text-ivory/30">—</span>}</Cell>
                <Cell className="whitespace-nowrap font-mono text-[11.5px] text-ivory/60">{fmtDuration(tr.duration)}</Cell>
                <Cell>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio controls preload="none" src={tr.url} className="h-8 w-[180px]" />
                </Cell>
                <Cell>
                  <Badge tone={tr.active ? 'ok' : 'muted'}>{tr.active ? 'ظاهرة' : 'مخفية'}</Badge>
                </Cell>
                <Cell>
                  {confirmId === tr.id ? (
                    <div className="flex gap-1.5">
                      <Btn
                        tone="danger" size="sm"
                        onClick={async () => { await deleteTrack(tr.id); setConfirmId(null); }}
                      >
                        أكيد
                      </Btn>
                      <Btn size="sm" onClick={() => setConfirmId(null)}>لأ</Btn>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <Btn
                        size="sm"
                        icon={tr.active ? EyeOff : Eye}
                        onClick={() => updateTrack({ id: tr.id, active: !tr.active })}
                      >
                        {tr.active ? 'اخفيها' : 'رجّعها'}
                      </Btn>
                      <Btn tone="danger" size="sm" icon={Trash2} onClick={() => setConfirmId(tr.id)}>
                        امسح
                      </Btn>
                    </div>
                  )}
                </Cell>
              </Row>
            ))}
          </Table>
        )}

        <p className="mt-4 flex items-start gap-2 rounded-xl bg-ivory/[0.04] p-3 text-[11.5px] text-ivory/45">
          <Loader2 size={12} className="mt-0.5 shrink-0 opacity-0" />
          مسح أغنية بيشيلها من المكتبة بس — الدعوات اللي اختارتها قبل كده بتفضل شغالة عادي،
          لأن رابط الملف متخزّن جوه الدعوة نفسها.
        </p>
      </Panel>
    </div>
  );
}
