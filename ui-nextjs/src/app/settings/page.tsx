"use client";
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { isValidIbanPL, formatIbanPL } from '@/lib/validation/nrb';
import { formatPostalPL, isValidPostalPL } from '@/lib/validation/postal';

const schema = z.object({
  name: z.string().min(2, 'Nazwa sprzedawcy jest wymagana'),
  nip: z.string().optional(),
  address: z.string().optional(),
  bankAccount: z.string().optional(),
  postal: z.string().optional(),
});

type SellerSettings = z.infer<typeof schema>;

export default function SettingsPage() {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<SellerSettings>({
    resolver: zodResolver(schema),
    defaultValues: (() => {
      try {
        const raw = localStorage.getItem('sellerSettings');
        if (raw) return JSON.parse(raw) as SellerSettings;
      } catch {}
      return { name: '', nip: '', address: '', bankAccount: '', postal: '' };
    })(),
  });

  const onSubmit = (data: SellerSettings) => {
    try {
      const sanitized = {
        ...data,
        bankAccount: formatIbanPL(data.bankAccount || ''),
        postal: formatPostalPL(data.postal || ''),
      };
      if (sanitized.bankAccount && !isValidIbanPL(sanitized.bankAccount)) {
        alert('Nieprawidłowy NRB/IBAN (PL)');
        return;
      }
      if (sanitized.postal && !isValidPostalPL(sanitized.postal)) {
        alert('Nieprawidłowy kod pocztowy (NN-NNN)');
        return;
      }
      localStorage.setItem('sellerSettings', JSON.stringify(sanitized));
      alert('Zapisano ustawienia sprzedawcy');
    } catch {
      alert('Nie udało się zapisać ustawień');
    }
  };

  const clear = () => {
    try {
      localStorage.removeItem('sellerSettings');
      reset({ name: '', nip: '', address: '', bankAccount: '', postal: '' });
    } catch {}
  };

  return (
    <main className="p-6 grid gap-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">Ustawienia sprzedawcy</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm font-medium">Nazwa sprzedawcy</span>
          <input className="border p-2 rounded" {...register('name')} />
          {errors.name && <span className="text-red-600 text-xs">{errors.name.message}</span>}
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">NIP</span>
          <input className="border p-2 rounded" {...register('nip')} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">Adres</span>
          <textarea className="border p-2 rounded" rows={3} {...register('address')} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">Numer rachunku (NRB/IBAN)</span>
          <input className="border p-2 rounded" {...register('bankAccount', {
            setValueAs: (v) => formatIbanPL(v || ''),
          })} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">Kod pocztowy (NN-NNN)</span>
          <input className="border p-2 rounded" {...register('postal', {
            setValueAs: (v) => formatPostalPL(v || ''),
          })} />
        </label>
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Zapisz</button>
          <button type="button" onClick={clear} className="px-4 py-2 bg-gray-200 rounded">Wyczyść</button>
        </div>
      </form>
      <p className="text-sm text-gray-600">Te dane są używane do autouzupełniania pola sprzedawcy w formularzu faktury.</p>
    </main>
  );
}