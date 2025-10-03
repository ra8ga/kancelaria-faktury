'use client';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { isValidNIP } from '@/lib/validation/nip';
import { formatPLN } from '@/lib/format/currency';
import { useMemo, useEffect, useState } from 'react';
import { round2 } from '@/lib/format/round';
import { useFieldArray } from 'react-hook-form';
import { nextInvoiceNumber } from '@/lib/numbering';
import { useRouter } from 'next/navigation';
import type { InvoiceData } from '@/lib/types/invoice';
import { formatIbanPL } from '@/lib/validation/nrb';
import { formatNip } from '@/lib/validation/nip';
import { formatPostalPL, isValidPostalPL } from '@/lib/validation/postal';
import { isValidStreetNumber, formatStreetNumber } from '@/lib/validation/address';
import { createInvoice } from '@/lib/api/invoices';

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
  sellerAddress: z.string().optional().refine((v) => !v || isValidStreetNumber(v), 'Nieprawidłowy adres (Ulica i numer)'),
  sellerPostal: z.string().optional().refine((v) => !v || isValidPostalPL(v), 'Nieprawidłowy kod pocztowy (NN-NNN)'),
  buyerName: z.string().min(1, 'Nazwa nabywcy jest wymagana'),
  buyerNip: z.string().refine((v) => isValidNIP(v), 'Nieprawidłowy NIP'),
  buyerAddress: z.string().optional().refine((v) => !v || isValidStreetNumber(v), 'Nieprawidłowy adres (Ulica i numer)'),
  buyerPostal: z.string().optional().refine((v) => !v || isValidPostalPL(v), 'Nieprawidłowy kod pocztowy (NN-NNN)'),
  items: z.array(itemSchema).min(1, 'Dodaj co najmniej jedną pozycję'),
  mpp: z.boolean().optional(),
});

export default function InvoiceForm() {
  const { register, handleSubmit, formState, watch, control, setValue } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoiceNumber: '',
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

  // Historia adresów dla datalist (CSR)
  const [addressHist, setAddressHist] = useState<string[]>([]);
  useEffect(() => {
    try {
      const rawHist = localStorage.getItem('addressHistory');
      const hist = rawHist ? (JSON.parse(rawHist) as string[]) : [];
      setAddressHist(hist);
    } catch {}
  }, []);
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

  const router = useRouter();
  const onSubmit = async (data: z.infer<typeof schema>) => {
    const invoiceData: InvoiceData = {
      number: data.invoiceNumber,
      seller: { name: data.sellerName, nip: data.sellerNip, address: [data.sellerAddress, data.sellerPostal].filter(Boolean).join(', ') },
      buyer: { name: data.buyerName, nip: data.buyerNip, address: [data.buyerAddress, data.buyerPostal].filter(Boolean).join(', ') },
      items: (data.items || []).map((it) => ({
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        unitPriceNet: it.unitPriceNet,
        vatRate: it.vatRate as 23 | 8 | 5 | 0 | 'ZW' | 'NP',
      })),
      issueDate: new Date().toISOString(),
      mpp: !!data.mpp,
      currency: 'PLN',
    };

    const rawSeller = localStorage.getItem('sellerSettings');
    let sellerBank: string | undefined;
    if (rawSeller) {
      try {
        const s = JSON.parse(rawSeller) as { bankAccount?: string };
        sellerBank = s.bankAccount ? formatIbanPL(s.bankAccount) : undefined;
      } catch {}
    }
    const withBank = sellerBank ? { ...invoiceData, seller: { ...invoiceData.seller, bankAccount: sellerBank } } : invoiceData;

    try {
      const created = await createInvoice(withBank);
      const finalNumber = created?.number || withBank.number;

      try {
        const toAdd: string[] = [];
        if (data.sellerAddress) toAdd.push(formatStreetNumber(data.sellerAddress));
        if (data.buyerAddress) toAdd.push(formatStreetNumber(data.buyerAddress));
        if (toAdd.length > 0) {
          const rawHist = localStorage.getItem('addressHistory');
          const hist = rawHist ? (JSON.parse(rawHist) as string[]) : [];
          let next = hist.slice();
          toAdd.forEach((addr) => {
            next = [addr, ...next.filter((h) => h !== addr)];
          });
          localStorage.setItem('addressHistory', JSON.stringify(next.slice(0, 10)));
        }
      } catch {}

      router.push(`/invoices/${encodeURIComponent(finalNumber)}`);
    } catch (e: any) {
      alert(`Nie udało się utworzyć faktury przez API: ${e?.message || e}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nowa Faktura</h1>
              <p className="text-gray-600 mt-1">Wystaw profesjonalną fakturę</p>
            </div>
            <Link
              href="/invoices"
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Powrót do listy
            </Link>
          </div>
        </div>
      </header>

      {/* Main Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Numer faktury */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm font-medium">1</span>
            Numer Faktury
          </h2>
          <div className="flex gap-3">
            <input
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              placeholder="FV/RRRR/MM/nnn"
              {...register('invoiceNumber')}
            />
            <button
              type="button"
              className="px-6 py-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium"
              onClick={() => setValue('invoiceNumber', defaultInvoiceNumber(), { shouldValidate: true })}
            >
              🎲 Generuj
            </button>
          </div>
          {formState.errors.invoiceNumber && (
            <div className="mt-2 text-red-600 text-sm flex items-center">
              <span className="mr-1">⚠️</span>
              {formState.errors.invoiceNumber.message as string}
            </div>
          )}
        </div>
      {/* Sprzedawca i Nabywca */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Sprzedawca */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm font-medium">2</span>
              Sprzedawca
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nazwa firmy</label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="Nazwa sprzedawcy"
                  {...register('sellerName')}
                />
                {formState.errors.sellerName && (
                  <div className="mt-2 text-red-600 text-sm flex items-center">
                    <span className="mr-1">⚠️</span>
                    {formState.errors.sellerName.message as string}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">NIP</label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="NIP"
                  {...register('sellerNip', {
                    setValueAs: (v) => formatNip(v || ''),
                  })}
                />
                {formState.errors.sellerNip && (
                  <div className="mt-2 text-red-600 text-sm flex items-center">
                    <span className="mr-1">⚠️</span>
                    {formState.errors.sellerNip.message as string}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ulica i numer</label>
                <input
                  list="addressList"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="np. Dąbrowskiego 12"
                  {...register('sellerAddress', {
                    setValueAs: (v) => formatStreetNumber(v || ''),
                  })}
                />
                {formState.errors.sellerAddress && (
                  <div className="mt-2 text-red-600 text-sm flex items-center">
                    <span className="mr-1">⚠️</span>
                    {formState.errors.sellerAddress.message as string}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kod pocztowy (NN-NNN)</label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="NN-NNN"
                  {...register('sellerPostal', {
                    setValueAs: (v) => formatPostalPL(v || ''),
                  })}
                />
                {formState.errors.sellerPostal && (
                  <div className="mt-2 text-red-600 text-sm flex items-center">
                    <span className="mr-1">⚠️</span>
                    {formState.errors.sellerPostal.message as string}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Nabywca */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm font-medium">3</span>
              Nabywca
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nazwa firmy</label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="Nazwa nabywcy"
                  {...register('buyerName')}
                />
                {formState.errors.buyerName && (
                  <div className="mt-2 text-red-600 text-sm flex items-center">
                    <span className="mr-1">⚠️</span>
                    {formState.errors.buyerName.message as string}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">NIP</label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="NIP"
                  {...register('buyerNip', {
                    setValueAs: (v) => formatNip(v || ''),
                  })}
                />
                {formState.errors.buyerNip && (
                  <div className="mt-2 text-red-600 text-sm flex items-center">
                    <span className="mr-1">⚠️</span>
                    {formState.errors.buyerNip.message as string}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ulica i numer</label>
                <input
                  list="addressList"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="np. Dąbrowskiego 12"
                  {...register('buyerAddress', {
                    setValueAs: (v) => formatStreetNumber(v || ''),
                  })}
                />
                {formState.errors.buyerAddress && (
                  <div className="mt-2 text-red-600 text-sm flex items-center">
                    <span className="mr-1">⚠️</span>
                    {formState.errors.buyerAddress.message as string}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <datalist id="addressList">
          {addressHist.map((h: string, i: number) => <option key={i} value={h} />)}
        </datalist>

      {/* Pozycje dynamiczne */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm font-medium">4</span>
            Pozycje Faktury
          </h2>

          {fields.map((field, index) => {
            const lineNet = round2((items?.[index]?.unitPriceNet || 0) * (items?.[index]?.quantity || 0));
            const lineVat = typeof items?.[index]?.vatRate === 'number' ? round2(lineNet * (Number(items?.[index]?.vatRate) / 100)) : 0;
            const lineGross = round2(lineNet + lineVat);
            return (
              <div key={field.id} className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-900">Pozycja {index + 1}</h3>
                  <button
                    type="button"
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                    onClick={() => remove(index)}
                  >
                    🗑️ Usuń
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa pozycji</label>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="Nazwa usługi/towaru"
                      {...register(`items.${index}.name`)}
                    />
                    {formState.errors.items?.[index]?.name && (
                      <div className="mt-1 text-red-600 text-sm flex items-center">
                        <span className="mr-1">⚠️</span>
                        {formState.errors.items?.[index]?.name?.message as string}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ilość</label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="1.00"
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                    {formState.errors.items?.[index]?.quantity && (
                      <div className="mt-1 text-red-600 text-sm flex items-center">
                        <span className="mr-1">⚠️</span>
                        {formState.errors.items?.[index]?.quantity?.message as string}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jedn.</label>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="szt."
                      {...register(`items.${index}.unit`)}
                    />
                    {formState.errors.items?.[index]?.unit && (
                      <div className="mt-1 text-red-600 text-sm flex items-center">
                        <span className="mr-1">⚠️</span>
                        {formState.errors.items?.[index]?.unit?.message as string}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cena netto</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="0.00"
                      {...register(`items.${index}.unitPriceNet`, { valueAsNumber: true })}
                    />
                    {formState.errors.items?.[index]?.unitPriceNet && (
                      <div className="mt-1 text-red-600 text-sm flex items-center">
                        <span className="mr-1">⚠️</span>
                        {formState.errors.items?.[index]?.unitPriceNet?.message as string}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">VAT</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      {...register(`items.${index}.vatRate`, { setValueAs: (v) => (v === 'ZW' || v === 'NP' ? v : Number(v)) })}
                    >
                      <option value={23}>23%</option>
                      <option value={8}>8%</option>
                      <option value={5}>5%</option>
                      <option value={0}>0%</option>
                      <option value={'ZW'}>ZW</option>
                      <option value={'NP'}>NP</option>
                    </select>
                    {formState.errors.items?.[index]?.vatRate && (
                      <div className="mt-1 text-red-600 text-sm flex items-center">
                        <span className="mr-1">⚠️</span>
                        {formState.errors.items?.[index]?.vatRate?.message as string}
                      </div>
                    )}
                  </div>
                </div>

                {/* Podsumowanie pozycji */}
                <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-gray-600">Netto</div>
                    <div className="font-semibold text-gray-900">{formatPLN(lineNet)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">VAT</div>
                    <div className="font-semibold text-gray-900">{formatPLN(lineVat)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Brutto</div>
                    <div className="font-semibold text-gray-900">{formatPLN(lineGross)}</div>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            className="w-full px-4 py-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium"
            onClick={() => append({ name: '', quantity: 1, unit: 'szt.', unitPriceNet: 0, vatRate: 23 })}
          >
            + Dodaj pozycję
          </button>
        </div>

        {/* Opcje dodatkowe */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Opcje dodatkowe</h2>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('mpp')}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="font-medium text-gray-900">Mechanizm Podzielonej Płatności (MPP)</span>
              <p className="text-sm text-gray-600">Włącz dla faktur z towarami objętymi MPP</p>
            </div>
          </label>
        </div>

        {/* Podsumowanie */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Podsumowanie Faktury</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-sm text-gray-600 mb-1">Suma netto</div>
              <div className="text-2xl font-bold text-gray-900">{formatPLN(totals.net)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-sm text-gray-600 mb-1">VAT</div>
              <div className="text-2xl font-bold text-gray-900">{formatPLN(totals.vat)}</div>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-center text-white">
              <div className="text-sm text-blue-100 mb-1">Suma brutto</div>
              <div className="text-2xl font-bold">{formatPLN(totals.gross)}</div>
            </div>
          </div>

          {/* Podsumowanie per stawka VAT */}
          {Object.keys(ratesSummary).length > 0 && (
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Szczegóły VAT</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.keys(ratesSummary).map((rate) => {
                  const vals = ratesSummary[rate];
                  return (
                    <div key={rate} className="border border-gray-200 rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-900 mb-2">Stawka: {rate}</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Netto:</span>
                          <span className="font-medium">{formatPLN(vals.net)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">VAT:</span>
                          <span className="font-medium">{formatPLN(vals.vat)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-gray-200">
                          <span className="text-gray-600">Brutto:</span>
                          <span className="font-semibold">{formatPLN(vals.gross)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Błędy globalne */}
        {formState.errors && Object.values(formState.errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-600 mr-2">⚠️</span>
              <div className="text-red-800 font-medium">Uzupełnij poprawnie wymagane pola</div>
            </div>
          </div>
        )}

        {/* Akcje */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold text-lg shadow-lg hover:shadow-xl"
          >
            💾 Zapisz Fakturę
          </button>
          <Link
            href="/invoices"
            className="px-6 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Anuluj
          </Link>
        </div>
      </form>
    </div>
  );
}

function defaultInvoiceNumber() {
  // Generate using local monthly sequence and prefix FV
  return nextInvoiceNumber({ prefix: 'FV' });
}