// تبويب الموسيقى في المحرر: مكتبة بحث + رفع من عندك + قص المقطع.
//
// القص بيتخزن كحدود (من الثانية كام للثانية كام) من غير إعادة ترميز
// للملف — يعني العميل يقدر يعدّله في أي وقت، والملف بيفضل واحد.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, Music, Upload, Loader2, Play, Pause, Check, Scissors, RotateCcw,
} from 'lucide-react';
import { useGetLibraryTracksQuery } from '../../store/api.js';
import { claimAudio, registerAudio } from '../../lib/soloAudio.js';

/** ثواني → د:ث */
function fmt(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function MusicPanel({
  audioUrl, audioStart, audioEnd, onPick, onTrim, onUpload, uploading,
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const { data, isFetching } = useGetLibraryTracksQuery(q);
  const fileRef = useRef(null);
  const audioRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);
  const [duration, setDuration] = useState(0);

  // مدة الأغنية المختارة — منها بنعرف حدود القص.
  // لو الأغنية من المكتبة، مدتها محفوظة معاها من ساعة الرفع فبنستخدمها
  // على طول (السلايدر يظهر فورًا)؛ ولو العميل رفع ملفه بنقراها منه.
  const known = data?.tracks?.find((tr) => tr.url === audioUrl);
  useEffect(() => {
    if (!audioUrl) { setDuration(0); return undefined; }
    if (known?.duration > 0) { setDuration(known.duration); return undefined; }

    const probe = new Audio();
    probe.preload = 'metadata';
    probe.src = audioUrl;
    const onMeta = () => setDuration(Math.round(probe.duration || 0));
    probe.addEventListener('loadedmetadata', onMeta);
    return () => probe.removeEventListener('loadedmetadata', onMeta);
  }, [audioUrl, known?.duration]);

  function preview(track) {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio();
      // العنصر ده مش في الصفحة (new Audio)، فحارس "صوت واحد" مش
      // بيشوفه من الـ DOM — بنسجّله عنده بإيدينا.
      registerAudio(audioRef.current);
      // وأول ما يقف لأي سبب (حد شغّل حاجة تانية، أو الأغنية خلصت)
      // الزرار يرجع لشكله الصح
      audioRef.current.addEventListener('pause', () => setPlayingId(null));
      audioRef.current.addEventListener('ended', () => setPlayingId(null));
    }
    // أي صوت تاني شغال (الدعوة نفسها أو مشغّل القص) بيسكت الأول
    claimAudio(audioRef.current);
    audioRef.current.src = track.url;
    audioRef.current.play().catch(() => setPlayingId(null));
    setPlayingId(track.id);
  }

  useEffect(() => () => audioRef.current?.pause(), []);

  const end = audioEnd || duration;

  return (
    <>
      <h2 className="mb-1.5 font-serif text-[16px] font-bold text-ink">{t('editor.musicTitle')}</h2>
      <p className="mb-4 text-[12.5px] text-ink-dim">{t('editor.musicLibHint')}</p>

      {/* البحث في المكتبة */}
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-line px-3">
        <Search size={14} className="shrink-0 text-ink-dim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('editor.musicSearch')}
          className="w-full bg-transparent py-2.5 text-[13px] text-ink placeholder:text-ink-dim/70 focus:outline-none"
        />
        {isFetching && <Loader2 size={13} className="shrink-0 animate-spin text-ink-dim" />}
      </div>

      <div className="max-h-64 space-y-1.5 overflow-y-auto">
        {data?.tracks?.length === 0 && (
          <p className="py-4 text-center text-[12px] text-ink-dim">{t('editor.musicEmpty')}</p>
        )}
        {data?.tracks?.map((track) => {
          const active = audioUrl === track.url;
          return (
            <div
              key={track.id}
              className={`flex items-center gap-2 rounded-xl border p-2.5 transition ${
                active ? 'border-rose bg-rose/[0.06]' : 'border-line hover:border-ink/25'
              }`}
            >
              <button
                type="button"
                onClick={() => preview(track)}
                title={t('editor.musicPreview')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-night text-ivory hover:bg-emerald"
              >
                {playingId === track.id ? <Pause size={13} /> : <Play size={13} />}
              </button>

              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold text-ink">{track.title}</div>
                <div className="truncate text-[11px] text-ink-dim">
                  {[track.artist, track.mood, fmt(track.duration)].filter(Boolean).join(' · ')}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onPick(track.url)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-bold ${
                  active ? 'bg-rose text-white' : 'border border-line text-ink hover:border-rose hover:text-rose'
                }`}
              >
                {active ? <Check size={12} /> : t('editor.musicUse')}
              </button>
            </div>
          );
        })}
      </div>

      {/* رفع من عندك */}
      <input ref={fileRef} type="file" accept="audio/*" onChange={onUpload} hidden />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-line py-2.5 text-[12.5px] font-bold text-ink hover:border-ink/35 disabled:opacity-50"
      >
        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        {uploading ? t('editor.photoUploading') : t('editor.musicUpload')}
      </button>
      {/* الحد لازم يبان **قبل** ما يختار ملف — مش بعد ما يستنى الرفع ويفشل */}
      <p className="mt-2 text-center text-[11.5px] text-ink-dim">{t('editor.musicHint')}</p>

      {/* القص */}
      {audioUrl && (
        <div className="mt-5 rounded-2xl border border-line bg-ivory/60 p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
            <Scissors size={13} /> {t('editor.trimTitle')}
          </div>
          <p className="mb-3 text-[11.5px] text-ink-dim">{t('editor.trimHint')}</p>

          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={audioUrl} className="mb-3 w-full" />

          {duration > 0 ? (
            <>
              <div className="mb-1.5 flex items-center justify-between text-[11.5px] text-ink-dim">
                <span>{t('editor.trimFrom')}</span>
                <span className="font-mono text-ink">{fmt(audioStart)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={duration}
                step="1"
                value={Math.min(audioStart, duration)}
                onChange={(e) => onTrim({ start: Number(e.target.value), end: audioEnd })}
                className="mb-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-rose"
              />

              <div className="mb-1.5 flex items-center justify-between text-[11.5px] text-ink-dim">
                <span>{t('editor.trimTo')}</span>
                <span className="font-mono text-ink">{fmt(end)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={duration}
                step="1"
                value={Math.min(end, duration)}
                onChange={(e) => onTrim({ start: audioStart, end: Number(e.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-rose"
              />

              {(audioStart > 0 || audioEnd > 0) && (
                <button
                  type="button"
                  onClick={() => onTrim({ start: 0, end: 0 })}
                  className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-ink-dim hover:text-rose"
                >
                  <RotateCcw size={11} /> {t('editor.trimReset')}
                </button>
              )}
            </>
          ) : (
            <p className="flex items-center gap-1.5 text-[12px] text-ink-dim">
              <Music size={12} /> {t('editor.trimLoading')}
            </p>
          )}
        </div>
      )}
    </>
  );
}
