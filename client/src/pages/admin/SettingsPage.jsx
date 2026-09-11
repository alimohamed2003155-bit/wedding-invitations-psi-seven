// بيانات الدفع اللي بتظهر للعميل بعد ما يطلب باقة.
// المصريين بيشوفوا فودافون كاش، وغيرهم بيشوفوا الحساب البنكي.
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Smartphone, Landmark, MessageCircle, Check } from 'lucide-react';
import {
  useGetPaymentSettingsQuery, useSavePaymentSettingsMutation,
} from '../../store/adminApi.js';
import { Panel, Btn, Field, Spinner, fmtDate } from '../../components/admin/ui.jsx';

export default function SettingsPage() {
  const { data, isLoading } = useGetPaymentSettingsQuery();
  const [save, { isLoading: saving, isSuccess }] = useSavePaymentSettingsMutation();
  const { register, handleSubmit, reset, formState } = useForm({ defaultValues: {} });

  useEffect(() => {
    if (data) {
      reset({
        vodafone: data.vodafone || {},
        bank: data.bank || {},
        whatsapp: data.whatsapp || '',
      });
    }
  }, [data, reset]);

  if (isLoading) return <Spinner />;

  return (
    <form onSubmit={handleSubmit((v) => save(v))} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[21px] font-bold text-ivory">بيانات الدفع</h1>
          <p className="mt-0.5 text-[12.5px] text-ivory/45">
            دي البيانات اللي العميل بيشوفها بالظبط لما يطلب باقة.
            {data?.updatedAt && ` آخر تعديل: ${fmtDate(data.updatedAt, true)}`}
          </p>
        </div>
        <Btn
          tone="gold"
          icon={isSuccess && !formState.isDirty ? Check : Save}
          loading={saving}
          onClick={handleSubmit((v) => save(v))}
        >
          {isSuccess && !formState.isDirty ? 'اتحفظ' : 'احفظ التعديلات'}
        </Btn>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="فودافون كاش" subtitle="بيظهر للعملاء المصريين">
          <div className="space-y-3.5">
            <Field label="رقم المحفظة" placeholder="01xxxxxxxxx" {...register('vodafone.number')} />
            <Field label="اسم صاحب المحفظة" {...register('vodafone.holderName')} />
            <Field label="ملاحظة للعميل" placeholder="اكتب اسمك في تعليق التحويل..." {...register('vodafone.note')} />
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-ivory/[0.04] p-3 text-[11.5px] text-ivory/50">
            <Smartphone size={13} className="mt-0.5 shrink-0" />
            العميل بيحوّل وبيرفع صورة التحويل من الموقع، وبتوصلك في قسم الطلبات.
          </p>
        </Panel>

        <Panel title="الحساب البنكي" subtitle="بيظهر لأي عميل برّه مصر">
          <div className="space-y-3.5">
            <Field label="اسم البنك" {...register('bank.bankName')} />
            <Field label="اسم الحساب بالعربي" {...register('bank.accountNameAr')} />
            <Field label="اسم الحساب بالإنجليزي" {...register('bank.accountNameEn')} />
            <Field label="رقم الحساب" {...register('bank.accountNumber')} />
            <Field label="IBAN" {...register('bank.iban')} />
            <Field label="SWIFT / BIC" {...register('bank.swift')} />
            <Field label="عنوان البنك" {...register('bank.address')} />
            <Field label="ملاحظة للعميل" {...register('bank.note')} />
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-ivory/[0.04] p-3 text-[11.5px] text-ivory/50">
            <Landmark size={13} className="mt-0.5 shrink-0" />
            اسم الحساب بيظهر بالعربي والإنجليزي مع العنوان — زي ما البنوك بتطلب في التحويلات الدولية.
          </p>
        </Panel>
      </div>

      <Panel title="واتساب الدعم" subtitle="لو حطيته، بيظهر للعميل كطريقة تواصل سريعة">
        <Field label="رقم الواتساب (بكود الدولة)" placeholder="201xxxxxxxxx" {...register('whatsapp')} />
        <p className="mt-3 flex items-start gap-2 text-[11.5px] text-ivory/45">
          <MessageCircle size={13} className="mt-0.5 shrink-0" />
          سيبه فاضي لو مش عايز تعرض رقم — خانة الدعم جوه الموقع بتفضل شغالة عادي.
        </p>
      </Panel>
    </form>
  );
}
