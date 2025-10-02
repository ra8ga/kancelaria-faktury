# Plan frontendu (React/Next.js) — Prosta aplikacja do wystawiania faktur (PL)

## Cel
Stworzyć lekką aplikację web (Next.js + React), która pozwala szybko wystawiać, przeglądać i drukować (PDF) faktury zgodne z polską specyfiką (NIP, stawki VAT, MPP, numeracja, formaty PL).

## Założenia techniczne
- Next.js (App Router) + React + TypeScript
- Stylowanie: Tailwind CSS (lub CSS Modules) + prosty design system
- Formularze: React Hook Form + Zod (walidacje)
- Stan: lekki (Zustand) lub Server Actions dla prostych operacji
- Generowanie PDF: HTML -> PDF (np. `@react-pdf/renderer` lub serwerowo Puppeteer)
- Lokalizacja: `pl-PL` (formaty dat, walut, liczby) + teksty po polsku

## Strony (Next.js)
- `/` – Dashboard (ostatnie faktury, szybkie akcje)
- `/invoices` – Lista faktur (filtry: data, kontrahent, status)
- `/invoices/new` – Nowa faktura (formularz wieloetapowy lub pojedynczy)
- `/invoices/[id]` – Podgląd faktury (druk/PDF, duplikuj, korekta)
- `/clients` – Kontrahenci (lista, dodawanie, edycja)
- `/products` – Produkty/usługi (cennik, stawki VAT)
- `/settings` – Ustawienia (sprzedawca, numeracja, VAT, rachunek bankowy, szablony PDF)

## Kluczowe komponenty UI
- `InvoiceForm` – główny formularz faktury
  - Sekcja Sprzedawca (dane firmy, NIP, adres, rachunek bankowy)
  - Sekcja Nabywca (NIP, nazwa, adres; wyszukiwarka po NIP — opcjonalnie GUS)
  - Pozycje (nazwa, ilość, JM, cena netto/brutto, stawka VAT: 23/8/5/0/ZW/NP)
  - Podsumowanie (suma netto, VAT, brutto; zaokrąglenia PL)
  - Płatność (termin, metoda, MPP checkbox, nr rachunku)
  - Dodatkowe pola: UWAGI, informacje MPP/odwrotne obciążenie/WDT/WNT (opcjonalnie)
- `InvoiceItemsTable` – tabela pozycji z edycją inline
- `TaxSummary` – wyliczenia VAT (per stawka i sumarycznie)
- `InvoicePreview` – podgląd wydruku w układzie „Faktura VAT” PL
- `ClientPicker` – wybór/auto-uzupełnianie kontrahenta (NIP)
- `NumberingScheme` – podgląd wzorca numeracji (np. `FV/{YYYY}/{MM}/{SEQ}`)

## Polska specyfika i walidacje
- NIP: 10 cyfr + checksum (walidacja algorytmem w Zod; bez myślników)
- REGON (opcjonalnie), PESEL (dla osób fizycznych — opcjonalnie)
- Adres: format PL (kod pocztowy `NN-NNN`, miasto, ulica, nr)
- Rachunek bankowy: NRB (26 cyfr, prefix `PL` dla IBAN) + SWIFT/BIC (opc.)
- Stawki VAT: 23%, 8%, 5%, 0%, ZW (zwolniona), NP (nie podlega)
- MPP (Mechanizm Podzielonej Płatności): checkbox + informacja na fakturze
- Waluta domyślnie `PLN` (formatowanie `Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })`)
- Daty: `pl-PL`, wybór terminu płatności, data sprzedaży vs wystawienia
- Zaokrąglenia: zgodnie z ustawą o VAT, 2 miejsca po przecinku, sumy per stawka
- Prawidłowe oznaczenia: „Faktura VAT”, „Faktura korygująca”, „Faktura proforma” (opc.)
- GTU/PKWiU (opcjonalnie w przyszłości, etykiety pozycji)

## Numeracja faktur
- Konfigurowalny schemat: np. `FV/{YYYY}/{MM}/{SEQ}`, reset sekwencji co miesiąc/rok
- Walidacja unikalności numeru (lokalnie + docelowo w bazie)
- Podgląd generowanego numeru przy wypełnianiu formularza

## Generowanie PDF/druk
- Szablon PDF w układzie PL: nagłówek, dane stron, tabela pozycji, podsumowania VAT, stopka
- Wsparcie polskich znaków (fonty z diakrytykami, np. `Inter`, `Roboto`)
- Opcja „Drukuj” oraz „Pobierz PDF” z numerem faktury jako nazwą pliku
- Dodanie adnotacji MPP i informacji przelewowych w stopce

## Ustawienia
- Dane sprzedawcy: nazwa, NIP, adres, rachunek bankowy, e-mail
- Numeracja: wzorzec, reset, prefiksy/sufiksy
- VAT: domyślne stawki i tryb cen (netto/brutto jako wejście)
- Szablon PDF: logo, kolory, układ, podpisy
- Integracje (opcjonalnie): GUS/REGON po NIP, KSeF (w przyszłości)

## Integracje (opcjonalne / później)
- GUS (wyszukiwarka po NIP, autouzupełnianie nazwy i adresu)
- KSeF (Krajowy System e-Faktur) – eksport/firma docelowo; na start plan jako roadmapa

## Dostępność i UX
- Kontrast, klawiatura, etykiety ARIA dla formularzy
- Autocomplete i maski (NIP, NRB, kod pocztowy)
- Błędy walidacji po polsku, czytelne komunikaty

## Testy i jakość
- Jednostkowe: walidator NIP/NRB, logika sum VAT
- E2E (opc.): scenariusz wystawienia faktury i generowania PDF
- Lint/format: ESLint + Prettier + TypeScript strict

## Plan iteracyjny
1. MVP
   - Strony: `/invoices`, `/invoices/new`, `/settings`
   - Formularz: sprzedawca, nabywca, pozycje, podsumowania, MPP
   - Walidacje: NIP, kod pocztowy, NRB, kwoty
   - Numeracja: prosty schemat `FV/{YYYY}/{SEQ}`
   - PDF: podstawowy szablon PL + druk/pobierz
2. Rozszerzenia
   - Cennik produktów/usług, lista kontrahentów
   - Zaawansowana numeracja (miesięczna), korekty, proforma
   - Podsumowania VAT per stawka w PDF
   - Integracja GUS po NIP
3. Później
   - KSeF (eksport, komunikacja), GTU/PKWiU, wielowalutowość

## Dane przykładowe
- Sprzedawca: „Przykład Sp. z o.o.”, NIP: `1234563218`, NRB: `12 3456 7890 1234 5678 9012 3456`
- Nabywca: „Klient SA”, NIP: `5272645590`, kod pocztowy `00-001`
- Pozycje: „Usługa doradcza”, 10h, 200.00 PLN netto, VAT 23%

## Architektura folderów (frontend)
```
app/
  layout.tsx
  page.tsx (dashboard)
  invoices/
    page.tsx
    new/page.tsx
    [id]/page.tsx
  clients/
    page.tsx
  products/
    page.tsx
  settings/
    page.tsx
components/
  InvoiceForm.tsx
  InvoiceItemsTable.tsx
  TaxSummary.tsx
  InvoicePreview.tsx
lib/
  validation/
    nip.ts
    nrb.ts
    postalCode.ts
  format/
    currency.ts
    date.ts
  numbering/
    scheme.ts
styles/
  globals.css
```

## Notatki prawne (informacyjne)
- Plan ma charakter techniczny; zgodność z przepisami VAT należy weryfikować na bieżąco.
- KSeF i oznaczenia specjalne (GTU, procedury) mogą wymagać dodatkowych pól.