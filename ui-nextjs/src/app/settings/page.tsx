'use client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { isValidIbanPL, formatIbanPL } from '@/lib/validation/nrb';
import { formatPostalPL, isValidPostalPL } from '@/lib/validation/postal';
import { isValidStreetNumber, formatStreetNumber } from '@/lib/validation/address';
import { useEffect, useState } from 'react';

const schema = z.object({
  name: z.string().min(2, 'Nazwa sprzedawcy jest wymagana'),
  nip: z.string().optional(),
  address: z.string().optional().refine((v) => !v || isValidStreetNumber(v), 'Nieprawidłowy format adresu (Ulica i numer)'),
  bankAccount: z.string().optional(),
  postal: z.string().optional(),
});

type SellerSettings = z.infer<typeof schema>;

export default function SettingsPage() {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<SellerSettings>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', nip: '', address: '', bankAccount: '', postal: '' },
  });

  // Load saved settings after mount to avoid SSR/CSR mismatch
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sellerSettings');
      if (raw) {
        const s = JSON.parse(raw) as Partial<SellerSettings>;
        reset({
          name: s.name || '',
          nip: s.nip || '',
          address: s.address || '',
          bankAccount: s.bankAccount || '',
          postal: s.postal || '',
        });
      }
    } catch {}
  }, [reset]);

  const [addressHist, setAddressHist] = useState<string[]>([]);
  useEffect(() => {
    try {
      const rawHist = localStorage.getItem('addressHistory');
      const hist = rawHist ? (JSON.parse(rawHist) as string[]) : [];
      setAddressHist(hist);
    } catch {}
  }, []);

  const onSubmit = (data: SellerSettings) => {
    try {
      const sanitized = {
        ...data,
        address: formatStreetNumber(data.address || ''),
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
      if (sanitized.address && !isValidStreetNumber(sanitized.address)) {
        alert('Nieprawidłowy format adresu (wymagane "Ulica i numer")');
        return;
      }
      localStorage.setItem('sellerSettings', JSON.stringify(sanitized));

      // Aktualizacja historii adresów (autouzupełnianie)
      try {
        if (sanitized.address) {
          const rawHist = localStorage.getItem('addressHistory');
          const hist = rawHist ? (JSON.parse(rawHist) as string[]) : [];
          const next = [sanitized.address, ...hist.filter((h) => h !== sanitized.address)].slice(0, 10);
          localStorage.setItem('addressHistory', JSON.stringify(next));
        }
      } catch {}

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
          <span className="text-sm font-medium">Ulica i numer</span>
          <input list="addressList" className="border p-2 rounded" placeholder="np. Dąbrowskiego 12" {...register('address', {
            setValueAs: (v) => formatStreetNumber(v || ''),
          })} />
          {errors.address && <span className="text-red-600 text-xs">{errors.address.message as string}</span>}
        </label>
        <datalist id="addressList">
          {addressHist.map((h, i) => <option key={i} value={h} />)}
        </datalist>
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