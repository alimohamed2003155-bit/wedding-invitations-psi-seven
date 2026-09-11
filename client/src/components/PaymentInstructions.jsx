import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Smartphone, Landmark, Upload } from 'lucide-react';
import { useGetPaymentInfoQuery, useUploadPaymentProofMutation } from '../store/api.js';

function CopyRow({ label, value }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
      <span className="shrink-0 text-[13px] text-ink-dim">{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-[14.5px] font-bold text-ink" dir="auto">{value}</span>
        <button
          type="button"
          aria-label={t('payment.copy', { label })}
          onClick={() => {
            navigator.clipboard.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            });
          }}
          className="shrink-0 text-ink-dim hover:text-rose"
        >
          {copied ? <Check size={15} className="text-ok" /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}

export default function PaymentInstructions() {
  const { t } = useTranslation();
  const { data, isLoading } = useGetPaymentInfoQuery();
  const [uploadProof, { isLoading: uploading }] = useUploadPaymentProofMutation();
  const fileRef = useRef(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // عشان يقدر يختار نفس الملف تاني لو حب
    if (!file) return;
    setUploadError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      await uploadProof(formData).unwrap();
      setUploaded(true);
    } catch (err) {
      setUploadError(err?.data?.error || t('payment.uploadFailed'));
    }
  }

  if (isLoading || !data) return null;

  const isVodafone = data.method === 'vodafone';
  const v = data.vodafone || {};
  const b = data.bank || {};

  // لو صاحب الموقع لسه محطش البيانات، مانعرضش كارت فاضي
  const hasData = isVodafone ? !!v.number : !!(b.accountNumber || b.iban);
  if (!hasData) return null;

  return (
    <motion.div
      className="mx-auto mt-10 max-w-2xl rounded-[22px] border border-line bg-card p-7"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-5 flex items-center gap-2.5">
        {isVodafone ? <Smartphone size={18} className="text-rose" /> : <Landmark size={18} className="text-rose" />}
        <h2 className="font-serif text-xl font-bold text-ink">
          {isVodafone ? t('payment.vodafoneTitle') : t('payment.bankTitle')}
        </h2>
      </div>

      <div className="rounded-2xl border border-line/70 px-4 py-1">
        {isVodafone ? (
          <>
            <CopyRow label={t('payment.vodafoneNumber')} value={v.number} />
            <CopyRow label={t('payment.vodafoneHolder')} value={v.holderName} />
          </>
        ) : (
          <>
            <CopyRow label={t('payment.bank')} value={b.bankName} />
            <CopyRow label={t('payment.accountNameAr')} value={b.accountNameAr} />
            <CopyRow label={t('payment.accountNameEn')} value={b.accountNameEn} />
            <CopyRow label={t('payment.accountNumber')} value={b.accountNumber} />
            <CopyRow label={t('payment.iban')} value={b.iban} />
            <CopyRow label={t('payment.swift')} value={b.swift} />
            <CopyRow label={t('payment.address')} value={b.address} />
          </>
        )}
      </div>

      {(isVodafone ? v.note : b.note) && (
        <p className="mt-4 text-[13.5px] leading-relaxed text-ink-dim">{isVodafone ? v.note : b.note}</p>
      )}

      <p className="mt-4 text-[13.5px] leading-relaxed text-ink-dim">{t('payment.afterTransfer')}</p>

      {/* رفع الإيصال من الموقع نفسه — بيوصلك على طول في لوحة التحكم */}
      <div className="mt-5 rounded-2xl border border-dashed border-line bg-ivory/50 p-5 text-center">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onPickFile}
        />
        {uploaded ? (
          <div className="flex items-center justify-center gap-2 text-[14px] font-bold text-ok">
            <Check size={16} /> {t('payment.proofUploaded')}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-full bg-night px-6 py-3 font-bold text-ivory hover:bg-emerald disabled:opacity-60"
            >
              <Upload size={15} />
              {uploading ? t('payment.uploading') : t('payment.uploadProof')}
            </button>
            <p className="mt-2.5 text-[12.5px] text-ink-dim">{t('payment.proofHint')}</p>
          </>
        )}
        {uploadError && <p className="mt-3 text-[13px] text-error">{uploadError}</p>}
      </div>

      {/* زرار "ابعت الإيصال على واتساب" اتشال: الرفع من الموقع فوق
          بيوصل لوحة التحكم على طول، فالواتساب كان بيبعتر العميل بين
          طريقتين وبيخلي الإيصالات تيجي في مكانين مختلفين. */}
    </motion.div>
  );
}
