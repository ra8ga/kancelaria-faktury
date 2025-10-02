# Sugestie rozwojowe – UI Next.js (kancelaria-faktury)

Poniżej lista propozycji usprawnień i zadań do rozważenia. Ujęte jako TODO, pogrupowane tematycznie.

## Walidacje i UX formularzy
- [ ] Rozszerzyć walidację pola „Ulica i numer” o częstsze warianty: „/”, „lok.”, „m.”, sufiksy typu „A”, „B” oraz normalizację spacji i kapitalizacji.
- [ ] Dodać autouzupełnianie miasta na podstawie kodu pocztowego (PNA), z walidacją spójności miasto↔kod.
- [ ] Opcjonalne autouzupełnianie nazw ulic po wybranym mieście (lokalna lista/caching).
- [ ] Maski/formatowanie dla telefonu; walidacja e-mail; spójne komunikaty błędów (inline + toast po zapisie).
- [ ] Ujednolicić placeholdery i etykiety: „Ulica i numer”, „Miasto”, „Kod pocztowy (NN-NNN)” w całej aplikacji.

## PDF i wydruk
- [ ] Spójna typografia (np. Inter/Roboto), marginesy (np. 10–12 mm), numeracja stron, nagłówki/separatory.
- [ ] Sekcja płatności: termin płatności (data lub dni), IBAN/NRB, MPP/split payment, forma płatności.
- [ ] Tabela pozycji: wyraźne kolumny netto/VAT/brutto; wsparcie stawek 0/3/8/23%; podsumowania per stawka.
- [ ] Konfigurowalne logo i stopka (np. adres kancelarii, REGON, dodatkowe uwagi).
- [ ] Eksport do A4/A5, stabilna nazwa pliku: „Faktura-{nr}.pdf”, polskie znaki w nazwach bezpiecznie transliterować.

## Formularz faktury i dane
- [ ] Szablony nabywców: zapamiętywanie w localStorage/IndexedDB (CRUD listy), szybkie wstawianie do formularza.
- [ ] Automatyczna numeracja faktur (FV/YYYY/MM/NNN) + kontrola duplikatów; podpowiedź kolejnego numeru.
- [ ] Obsługa rabatów (kwotowo/procentowo), jednostek miary, opcjonalnie PKWiU.
- [ ] Wyodrębnione pola „Miejscowość” i „Województwo” (jeśli wymagane na wydrukach/zgodnie z praktyką).

## Integracje i przechowywanie danych
- [ ] Weryfikacja NIP/REGON (np. GUS) – tryb offline: łagodne sprawdzenia; bez wysyłania sekretów; feature-flag.
- [ ] Migracja draftów z localStorage do IndexedDB (np. z użyciem Dexie) dla większej ilości danych i lepszej kontroli.
- [ ] Eksport/Import ustawień i szkiców (JSON) – prosty backup użytkownika.

## Testy i jakość
- [ ] Testy jednostkowe: schematy zod, walidatory (NIP, kod, IBAN, „Ulica i numer”), moduły utils.
- [ ] Testy e2e (Playwright): tworzenie faktury, zapis szkicu, druk/PDF, nieprawidłowe dane i komunikaty błędów.
- [ ] TypeScript: tryb bardziej restrykcyjny (strict), dopracowanie typów Invoice/Party.
- [ ] ESLint/Prettier: spójne reguły i automatyczna kontrola w CI.

## Wydajność
- [ ] Lazy load dla modułów cięższych (np. @react-pdf/renderer) i komponentów używanych rzadziej.
- [ ] Memoizacja kosztownych obliczeń (sumy pozycji, podsumowania VAT) i selektywne re-renderingi.
- [ ] Debounce/throttle dla autoformatowania pól i walidacji na input.

## Dostępność (a11y) i i18n
- [ ] ARIA dla formularzy, poprawne focus outlines, kontrasty zgodne z WCAG.
- [ ] i18n (pl/en): teksty w osobnych plikach, możliwość przełączenia języka.

## Bezpieczeństwo i prywatność
- [ ] Nie logować pełnych numerów rachunków ani innych wrażliwych danych w konsoli; redakcja w trybie debug.
- [ ] Walidacje defensywne po obu stronach (UI + generowanie PDF), sanity-check dla danych wejściowych.

## Roadmap – szybkie kroki
- [ ] (Tydzień 1) Testy jednostkowe i e2e + ujednolicenie typów/ESLint.
- [ ] (Tydzień 2) i18n podstawowe, dopracowanie layoutu PDF (typografia/marginesy/sekcje płatności).
- [ ] (Opcjonalnie) IndexedDB dla draftów i szablonów nabywców, import/eksport JSON.

---
Jeśli któryś punkt jest priorytetem, dodam konkretne zadania i wdrożę zmiany krok po kroku (z weryfikacją w podglądzie UI i bez wpływania na uruchomiony serwer deweloperski).