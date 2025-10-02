# Checklista implementacji — Frontend (React/Next.js) faktury PL

## Inicjalizacja projektu
- [x] Zainicjować Next.js (App Router, TypeScript)
- [ ] Dodać Tailwind CSS i podstawowy design system
- [x] Skonfigurować ESLint + Prettier (TS strict)
- [x] Skonfigurować aliasy ścieżek `@/`
- [ ] Dodać Husky i pre-commit (opcjonalnie)
- [x] Dodać skrypt 'typecheck' w package.json

## Zależności
- [x] Zainstalować React Hook Form + Zod (walidacje)
- [x] Zainstalować Zustand (lekki stan)
- [x] Zainstalować generator PDF (`@react-pdf/renderer` lub Puppeteer)
- [x] Zainstalować date-fns z lokalizacją `pl`
- [x] Zainstalować bibliotekę/implementację NRB/IBAN (PL)

## Struktura aplikacji (App Router)
- [x] Utworzyć `app/layout.tsx` z lokalizacją `pl-PL`
- [x] Utworzyć `app/page.tsx` (dashboard)
- [x] Utworzyć `app/invoices/page.tsx` (lista faktur)
- [x] Utworzyć `app/invoices/new/page.tsx` (nowa faktura)
- [x] Utworzyć `app/invoices/[id]/page.tsx` (podgląd/druk)
- [x] Utworzyć `app/settings/page.tsx` (ustawienia)

## Komponenty UI
- [x] Utworzyć `InvoiceForm` (sprzedawca, nabywca, pozycje, płatność)
- [ ] Utworzyć `InvoiceItemsTable` (tabela pozycji, edycja inline)
- [x] Utworzyć `TaxSummary` (podsumowanie: netto/VAT/brutto, per stawka)
- [ ] Utworzyć `InvoicePreview` (podgląd wydruku/PDF)
- [ ] Utworzyć `ClientPicker` (wyszukiwanie/auto-uzupełnianie po NIP)
- [ ] Utworzyć `NumberingScheme` (podgląd numeru faktury)
- [x] Wyświetlić rachunek sprzedawcy w podglądzie faktury

## Walidacje i formaty (PL)
- [x] Zaimplementować walidator NIP (10 cyfr + checksum)
- [x] Zaimplementować walidator NRB/IBAN (26 cyfr, `PL`)
- [ ] Zaimplementować walidator kodu pocztowego `NN-NNN`
- [x] Formatowanie waluty `PLN` (Intl.NumberFormat)
- [ ] Formatowanie dat `pl-PL` (date-fns/Intl)
- [x] Zaokrąglanie kwot (2 miejsca, zasady PL)

## Logika VAT i MPP
- [x] Obsłużyć stawki VAT: 23%, 8%, 5%, 0%, ZW, NP
- [x] Wyliczenia per stawka i suma łączna (VAT, netto, brutto)
- [x] Checkbox MPP i adnotacja „Mechanizm Podzielonej Płatności” na fakturze

## Numeracja faktur
- [x] Zdefiniować wzorzec numeracji `FV/{YYYY}/{MM}/{SEQ}`
- [x] Zaimplementować generator numeru (reset sekwencji miesięcznie)
- [ ] Walidować unikalność numeru (lokalnie/mock API)

## Dane i stan
- [ ] Utworzyć store (Zustand) dla faktury i ustawień
- [x] Auto-zapis szkicu faktury w `localStorage`
- [ ] Dodać mock API dla listy faktur (CRUD minimalny)

## PDF i druk
- [ ] Stworzyć szablon PDF w układzie PL (nagłówek/tabela/stopka)
- [ ] Włączyć polskie fonty (diakrytyki)
- [x] Dodać akcję „Drukuj”
- [ ] Dodać akcję „Pobierz PDF” (z numerem w nazwie)

## Ustawienia
- [x] Formularz danych sprzedawcy (nazwa, NIP, adres, rachunek)
- [ ] Konfiguracja numeracji (prefiks/sufiks, reset)
- [ ] Domyślne stawki VAT i tryb cen (netto/brutto)
- [ ] Personalizacja PDF (logo, kolory, układ)

## UX i dostępność
- [x] Maski dla NIP
- [x] Maski dla NRB/IBAN (PL)
- [ ] Maski/format dla kodu pocztowego (NN-NNN)
- [x] Komunikaty błędów po polsku
- [ ] Obsługa klawiatury i etykiety ARIA

## Testy i jakość
- [ ] Testy jednostkowe: NIP/NRB/kod pocztowy, logika VAT i zaokrągleń
- [ ] E2E: scenariusz wystawienia faktury i generacji PDF
- [ ] Włączyć ESLint/Prettier w CI (opcjonalnie)

## Dane przykładowe
- [ ] Dodać przykładowych kontrahentów, sprzedawcę i pozycje (PL)

## Budowa i wdrożenie
- [ ] Skonfigurować `build` i `start` (Next.js)
- [ ] Przygotować `Dockerfile` (opcjonalnie)
- [ ] Wdrożenie (Vercel/Cloudflare Pages) — opcjonalnie

## Roadmapa integracji (opcjonalnie)
- [ ] Integracja GUS po NIP (autofill danych kontrahenta)
- [ ] Przygotowanie pod KSeF (eksport, komunikacja w przyszłości)

## Rozszerzenia i opcje zaawansowane
- [ ] PWA i tryb offline (cache danych, synchronizacja po odzyskaniu połączenia)
- [ ] Autoryzacja i role (NextAuth; role: właściciel, księgowy, użytkownik)
- [ ] API i baza danych (CRUD faktur/kontrahentów; integracja z istniejącym `db-api`/Cloudflare Worker)
- [ ] Typy faktur rozszerzone (proforma, zaliczkowa/końcowa, korekta, duplikat)
- [ ] Procedury podatkowe (WDT/WNT, odwrotne obciążenie/NP, OSS/IOSS — opcjonalnie)
- [ ] Numeracja zaawansowana (serie per oddział, per typ, roczny/miesięczny reset, wykrywanie luk/duplikatów)
- [ ] Wielowalutowość (kursy NBP tabela A, zapis kursu na fakturze, przeliczenia VAT)
- [ ] i18n (wielojęzyczność interfejsu; domyślnie `pl`, opcjonalnie `en`)
- [ ] Import/eksport (CSV/XLSX dla kontrahentów/produktów; eksport danych do archiwum)
- [ ] Druk/PDF rozszerzenia (podpisy, pieczątka, załączniki, QR dla przelewu — standard PL)
- [ ] Integracje płatności (link do przelewu, BLIK/PayByLink — opcjonalnie)
- [ ] Audyt i zgodność (log zmian, RODO: polityka prywatności, retencja danych)
- [ ] Monitoring/logowanie (Sentry, logi błędów i użycia)
- [ ] Wydajność (code splitting, lazy loading, wirtualizacja tabel)
- [ ] UX (skrótowe akcje, duplikacja faktury, wzorce pozycji/cennik, auto-komplet)
- [ ] DevOps (zmienne środowiskowe, sekrety, preview deploy, backup eksportów)