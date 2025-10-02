'use client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { isValidNIP } from '@/lib/validation/nip';
import { formatPLN } from '@/lib/format/currency';
import { useMemo, useEffect } from 'react';
import { round2 } from '@/lib/format/round';
import { useFieldArray } from 'react-hook-form';
import { nextInvoiceNumber } from '@/lib/numbering';
import { useRouter } from 'next/navigation';
import type { InvoiceData } from '@/lib/types/invoice';
import { formatIbanPL } from '@/lib/validation/nrb';
import { formatNip } from '@/lib/validation/nip';
import { formatPostalPL, isValidPostalPL } from '@/lib/validation/postal';

const itemSchema = z.object({
  name: z.string().min(1, 'Nazwa pozycji jest wymagana'),
  quantity: z.number().min(0.001, 'Ilość > 0'),
  unit: z.string().min(1, 'Jednostka wymagana'),
  unitPriceNet: z.number().min(0, 'Cena >= 0'),
  vatRate: z.union([z.literal(23), z.literal(8), z.literal(5), z.literal(0), z.literal('ZW'), z.literal('NP')]),
});

const schema = z.object({
  invoiceNumber: z.string().regex(/^FV\/\d{4}\/\d{2}\/\d{3}$/, 'Format numeru: FV/RRRR/MM/nnn'),
  sellerName: z.string().min(1, 'Nazwa sprzedawcy jest wymagana'),
  sellerNip: z.string().refine((v) => isValidNIP(v), 'Nieprawidłowy NIP'),
  sellerAddress: z.string().optional(),
  sellerPostal: z.string().optional().refine((v) => !v || isValidPostalPL(v), 'Nieprawidłowy kod pocztowy (NN-NNN)'),
  buyerName: z.string().min(1, 'Nazwa nabywcy jest wymagana'),
  buyerNip: z.string().refine((v) => isValidNIP(v), 'Nieprawidłowy NIP'),
  buyerAddress: z.string().optional(),
  buyerPostal: z.string().optional().refine((v) => !v || isValidPostalPL(v), 'Nieprawidłowy kod pocztowy (NN-NNN)'),
  items: z.array(itemSchema).min(1, 'Dodaj co najmniej jedną pozycję'),
  mpp: z.boolean().optional(),
});

export default function InvoiceForm() {
  const { register, handleSubmit, formState, watch, control, setValue } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoiceNumber: defaultInvoiceNumber(),
      sellerName: '',
      sellerNip: '',
      sellerAddress: '',
      sellerPostal: '',
      buyerName: '',
      buyerNip: '',
      buyerAddress: '',
      buyerPostal: '',
      items: [{ name: '', quantity: 1, unit: 'szt.', unitPriceNet: 0, vatRate: 23 }],
      mpp: false,
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const items = watch('items');
  // Prefill seller from settings (localStorage)
  // Load once on mount and set values if available
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sellerSettings');
      if (raw) {
        const s = JSON.parse(raw) as { name?: string; nip?: string; address?: string; postal?: string };
        if (s?.name) setValue('sellerName', s.name, { shouldValidate: true });
        if (s?.nip) setValue('sellerNip', s.nip, { shouldValidate: true });
        if (s?.address) setValue('sellerAddress', s.address, { shouldValidate: false });
        if (s?.postal) setValue('sellerPostal', s.postal, { shouldValidate: true });
      }
    } catch {}
  }, [setValue]);
  const totals = useMemo(() => {
    const netRaw = items?.reduce((acc, it) => acc + it.unitPriceNet * it.quantity, 0) || 0;
    const vatRaw = items?.reduce((acc, it) => {
      if (typeof it.vatRate === 'number') return acc + it.unitPriceNet * it.quantity * (it.vatRate / 100);
      return acc; // ZW/NP
    }, 0) || 0;
    const net = round2(netRaw);
    const vat = round2(vatRaw);
    const gross = round2(net + vat);
    return { net, vat, gross };
  }, [items]);

  type Item = z.infer<typeof itemSchema>;
  const ratesSummary = useMemo(() => {
    const summary: Record<string, { net: number; vat: number; gross: number }> = {};
    (items || ([] as Item[])).forEach((it: Item) => {
      const lineNet = round2((it.unitPriceNet || 0) * (it.quantity || 0));
      const rateKey = typeof it.vatRate === 'number' ? `${it.vatRate}%` : it.vatRate;
      const lineVat = typeof it.vatRate === 'number' ? round2(lineNet * (Number(it.vatRate) / 100)) : 0;
      const lineGross = round2(lineNet + lineVat);
      const prev = summary[rateKey] || { net: 0, vat: 0, gross: 0 };
      summary[rateKey] = {
        net: round2(prev.net + lineNet),
        vat: round2(prev.vat + lineVat),
        gross: round2(prev.gross + lineGross),
      };
    });
    return summary;
  }, [items]);

  const onSubmit = (data: z.infer<typeof schema>) => {
    const invoiceData: InvoiceData = {
      number: data.invoiceNumber,
      seller: { name: data.sellerName, nip: data.sellerNip, address: [data.sellerAddress, data.sellerPostal].filter(Boolean).join(', ') },
      buyer: { name: data.buyerName, nip: data.buyerNip, address: [data.buyerAddress, data.buyerPostal].filter(Boolean).join(', ') },
      items: (data.items || []).map((it) => ({
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        unitPriceNet: it.unitPriceNet,
        vatRate: it.vatRate as any,
      })),
      issueDate: new Date().toISOString(),
      mpp: !!data.mpp,
      currency: 'PLN',
    };

    try {
      // persist invoice and include seller bank from settings if available
      const rawSeller = localStorage.getItem('sellerSettings');
      let sellerBank: string | undefined;
      if (rawSeller) {
        const s = JSON.parse(rawSeller) as { bankAccount?: string };
        sellerBank = s.bankAccount ? formatIbanPL(s.bankAccount) : undefined;
      }
      const withBank = sellerBank ? { ...invoiceData, seller: { ...invoiceData.seller, bankAccount: sellerBank } } : invoiceData;
      localStorage.setItem(`invoice:${invoiceData.number}`, JSON.stringify(withBank));
    } catch {}

    const router = useRouter();
    router.push(`/invoices/${encodeURIComponent(invoiceData.number)}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid gap-4">
      {/* Numer faktury */}
      <fieldset className="grid gap-2">
        <legend className="font-semibold">Numer faktury</legend>
        <div className="flex gap-2">
          <input className="border p-2 flex-1" placeholder="FV/RRRR/MM/nnn" {...register('invoiceNumber')} />
          <button type="button" className="bg-gray-100 border px-3 py-2 rounded" onClick={() => setValue('invoiceNumber', defaultInvoiceNumber(), { shouldValidate: true })}>
            Generuj
          </button>
        </div>
        {formState.errors.invoiceNumber && (
          <div className="text-red-600 text-xs">{formState.errors.invoiceNumber.message as string}</div>
        )}
      </fieldset>
      {/* Sprzedawca/Nabywca */}
      <fieldset className="grid gap-2">
        <legend className="font-semibold">Sprzedawca</legend>
        <input className="border p-2" placeholder="Nazwa" {...register('sellerName')} />
        {formState.errors.sellerName && (
          <div className="text-red-600 text-xs">{formState.errors.sellerName.message as string}</div>
        )}
        <label className="grid gap-1">
          <span className="text-sm font-medium">NIP</span>
          <input className="border p-2" placeholder="NIP" {...register('sellerNip', {
            setValueAs: (v) => formatNip(v || ''),
          })} />
          {formState.errors.sellerNip && (
            <div className="text-red-600 text-xs">{formState.errors.sellerNip.message as string}</div>
          )}
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">Adres</span>
          <textarea className="border p-2 rounded" rows={2} placeholder="Ulica i miejscowość" {...register('sellerAddress')} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">Kod pocztowy (NN-NNN)</span>
          <input className="border p-2 rounded" placeholder="NN-NNN" {...register('sellerPostal', {
            setValueAs: (v) => formatPostalPL(v || ''),
          })} />
          {formState.errors.sellerPostal && (
            <div className="text-red-600 text-xs">{formState.errors.sellerPostal.message as string}</div>
          )}
        </label>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="font-semibold">Nabywca</legend>
        <input className="border p-2" placeholder="Nazwa" {...register('buyerName')} />
        {formState.errors.buyerName && (
          <div className="text-red-600 text-xs">{formState.errors.buyerName.message as string}</div>
        )}
        <label className="grid gap-1">
          <span className="text-sm font-medium">NIP</span>
          <input className="border p-2" placeholder="NIP" {...register('buyerNip', {
            setValueAs: (v) => formatNip(v || ''),
          })} />
          {formState.errors.buyerNip && (
            <div className="text-red-600 text-xs">{formState.errors.buyerNip.message as string}</div>
          )}
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">Adres</span>
          <textarea className="border p-2 rounded" rows={2} placeholder="Ulica i miejscowość" {...register('buyerAddress')} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">Kod pocztowy (NN-NNN)</span>
          <input className="border p-2 rounded" placeholder="NN-NNN" {...register('buyerPostal', {
            setValueAs: (v) => formatPostalPL(v || ''),
          })} />
          {formState.errors.buyerPostal && (
            <div className="text-red-600 text-xs">{formState.errors.buyerPostal.message as string}</div>
          )}
        </label>
      </fieldset>

      {/* Pozycje dynamiczne */}
      <fieldset className="grid gap-3">
        <legend className="font-semibold">Pozycje</legend>
        {fields.map((field, index) => {
          const lineNet = round2((items?.[index]?.unitPriceNet || 0) * (items?.[index]?.quantity || 0));
          const lineVat = typeof items?.[index]?.vatRate === 'number' ? round2(lineNet * (Number(items?.[index]?.vatRate) / 100)) : 0;
          const lineGross = round2(lineNet + lineVat);
          return (
            <div key={field.id} className="grid gap-2 p-3 border rounded">
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                <input className="border p-2 sm:col-span-2" placeholder="Nazwa pozycji" {...register(`items.${index}.name`)} />
                {formState.errors.items?.[index]?.name && (
                  <div className="text-red-600 text-xs sm:col-span-6">{formState.errors.items?.[index]?.name?.message as string}</div>
                )}
                <input type="number" step="0.001" className="border p-2" placeholder="Ilość" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                {formState.errors.items?.[index]?.quantity && (
                  <div className="text-red-600 text-xs sm:col-span-6">{formState.errors.items?.[index]?.quantity?.message as string}</div>
                )}
                <input className="border p-2" placeholder="Jednostka" {...register(`items.${index}.unit`)} />
                {formState.errors.items?.[index]?.unit && (
                  <div className="text-red-600 text-xs sm:col-span-6">{formState.errors.items?.[index]?.unit?.message as string}</div>
                )}
                <input type="number" step="0.01" className="border p-2" placeholder="Cena netto" {...register(`items.${index}.unitPriceNet`, { valueAsNumber: true })} />
                {formState.errors.items?.[index]?.unitPriceNet && (
                  <div className="text-red-600 text-xs sm:col-span-6">{formState.errors.items?.[index]?.unitPriceNet?.message as string}</div>
                )}
                <select className="border p-2" {...register(`items.${index}.vatRate`, { setValueAs: (v) => (v === 'ZW' || v === 'NP' ? v : Number(v)) })}>
                  <option value={23}>23%</option>
                  <option value={8}>8%</option>
                  <option value={5}>5%</option>
                  <option value={0}>0%</option>
                  <option value={'ZW'}>ZW</option>
                  <option value={'NP'}>NP</option>
                </select>
                {formState.errors.items?.[index]?.vatRate && (
                  <div className="text-red-600 text-xs sm:col-span-6">{formState.errors.items?.[index]?.vatRate?.message as string}</div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-gray-600">Netto</div>
                  <div className="font-semibold">{formatPLN(lineNet)}</div>
                </div>
                <div>
                  <div className="text-gray-600">VAT</div>
                  <div className="font-semibold">{formatPLN(lineVat)}</div>
                </div>
                <div>
                  <div className="text-gray-600">Brutto</div>
                  <div className="font-semibold">{formatPLN(lineGross)}</div>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" className="text-red-600 text-sm" onClick={() => remove(index)}>Usuń pozycję</button>
              </div>
            </div>
          );
        })}
        <div>
          <button type="button" className="bg-gray-100 border px-3 py-2 rounded" onClick={() => append({ name: '', quantity: 1, unit: 'szt.', unitPriceNet: 0, vatRate: 23 })}>
            + Dodaj pozycję
          </button>
        </div>
      </fieldset>

      {/* MPP */}
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" {...register('mpp')} />
        Mechanizm Podzielonej Płatności (MPP)
      </label>

      {/* Podsumowanie */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-sm text-gray-600">Suma netto</div>
          <div className="font-semibold">{formatPLN(totals.net)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">VAT</div>
          <div className="font-semibold">{formatPLN(totals.vat)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Suma brutto</div>
          <div className="font-semibold">{formatPLN(totals.gross)}</div>
        </div>
      </div>

      {/* Podsumowanie per stawka VAT */}
      {Object.keys(ratesSummary).length > 0 && (
        <div className="grid gap-2">
          <div className="font-semibold">Podsumowanie per stawka VAT</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {Object.keys(ratesSummary).map((rate) => {
              const vals = ratesSummary[rate];
              return (
                <div key={rate} className="border rounded p-2">
                  <div className="text-sm text-gray-600">Stawka: {rate}</div>
                  <div className="flex justify-between text-sm"><span>Netto</span><span className="font-semibold">{formatPLN(vals.net)}</span></div>
                  <div className="flex justify-between text-sm"><span>VAT</span><span className="font-semibold">{formatPLN(vals.vat)}</span></div>
                  <div className="flex justify-between text-sm"><span>Brutto</span><span className="font-semibold">{formatPLN(vals.gross)}</span></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Błędy */}
      {formState.errors && (
        <div className="text-red-600 text-sm">
          {Object.values(formState.errors).length > 0 && 'Uzupełnij poprawnie wymagane pola.'}
        </div>
      )}

      {/* Akcje */}
      <button type="submit" className="bg-black text-white px-4 py-2 rounded">Zapisz szkic</button>
    </form>
  );
}

function defaultInvoiceNumber() {
  // Generate using local monthly sequence and prefix FV
  return nextInvoiceNumber({ prefix: 'FV' });
}