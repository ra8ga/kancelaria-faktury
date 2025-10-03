CR aplikacji (ui-nextjs)

Streszczenie
- Aplikacja została przełączona z localStorage na integrację z realnym API dla faktur (createInvoice, getInvoiceById).
- Generator numerów został odcięty od localStorage; docelowo numer ma nadawać backend.
- W widoku szczegółów faktury usunięto logikę odczytu z localStorage i zaktualizowano komunikat błędu.
- Ogólny stan kodu jest czytelny, z dobrą separacją warstw (components, lib, app). Zalecane są usprawnienia w typowaniu, obsłudze błędów, walidacji i spójności identyfikatorów faktur.

Mocne strony
- Jasna struktura projektu: /src/app (routy), /src/components (UI), /src/lib (logika).
- Minimalna i prosta integracja z API poprzez fetch.
- Wyraźna decyzja architektoniczna: faktury nie są przechowywane w przeglądarce.

Obszary do poprawy (wysoki priorytet)
- Spójność identyfikatora faktury: URL używa zakodowanego numeru (np. FV%2F2025%2F10%2F013). Rekomendacja: rozdzielić „id” (np. UUID lub liczba nadawana przez backend) od „number”, i używać „id” w URL. Pozwoli to uniknąć problemów ze znakami specjalnymi.
- Obsługa błędów i stanów sieci: dodać globalny handler błędów API, komunikaty użytkownika (toast), retry dla przerywanych połączeń, spójne mapowanie statusów HTTP (400/404/409/500).
- Walidacja formularza: uzupełnić walidację (np. zod/yup) dla pól faktury i adresów; zapobiegać wysyłaniu niekompletnych/niepoprawnych danych.
- Typowanie domenowe: wprowadzić wspólne typy (np. Invoice, Seller, Buyer, LineItem) w jednym miejscu (src/lib/types.ts) i używać ich w API kliencie oraz komponentach. Zmniejszy to ryzyko rozjazdów.

Obszary do poprawy (średni priorytet)
- API client: wydzielić warstwę klienta HTTP (np. src/lib/api/client.ts) z obsługą Base URL, timeoutów (AbortController), nagłówków, parsowania i błędów. invoices.ts może z tego korzystać.
- UI/UX stanów: wskaźniki ładowania (spinner na submit i na szczegółach), blokada podwójnego wysyłania (disabled przycisku).
- Seller settings: obecnie pozostają lokalnie; docelowo rozważyć ich migrację do backendu (z autoryzacją) albo wyraźnie oznaczyć, że to ustawienia tylko lokalne.
- Testy: dodać testy jednostkowe (walidacje, utils), integracyjne (API client), e2e (Playwright dla głównych przepływów: tworzenie faktury, podgląd).

Uwagi do konkretnych plików
- /Users/rafalfurmaga/Downloads/kancelaria-faktury/ui-nextjs/src/lib/api/invoices.ts
  - Dodaj timeout przez AbortController, spójne zwracanie błędów (Error z message i code), oraz walidację odpowiedzi (np. zod schema).
  - Rozważ parametryzację ścieżek (np. baza URL w jednym miejscu) i ujednolicenie nagłówków.
- /Users/rafalfurmaga/Downloads/kancelaria-faktury/ui-nextjs/src/components/InvoiceForm.tsx
  - Zapewnij blokadę wielokrotnego submitu, pokaż loader i komunikaty o błędach przy niepowodzeniu zapisu.
  - Dodaj walidację przed wywołaniem createInvoice; zwracaj użytkownikowi czytelne wskazówki.
  - Po udanym zapisie używaj id zwróconego przez backend (zamiast number) w nawigacji, jeśli wprowadzimy rozdzielenie id/number.
- /Users/rafalfurmaga/Downloads/kancelaria-faktury/ui-nextjs/src/app/invoices/[id]/page.tsx
  - Jeżeli zostaniemy przy „number” w URL, upewnij się, że dekodowanie id jest poprawne i odporne na znaki specjalne.
  - Dodaj stan ładowania i bardziej szczegółowe komunikaty (404 vs 500), opcję „spróbuj ponownie”.
- /Users/rafalfurmaga/Downloads/kancelaria-faktury/ui-nextjs/src/lib/numbering/index.ts
  - Obecna logika klientowa ma charakter tymczasowy. Docelowo numer powinien nadawać backend atomowo (transakcje, deduplikacja, konflikt 409 dla duplikatów).

Bezpieczeństwo i konfiguracja
- Upewnij się, że w frontendzie nie wyciekają żadne sekrety; NEXT_PUBLIC_API_BASE_URL jest ok, ale klucze i tokeny muszą pozostać po stronie serwera.
- Dodaj obsługę CORS po stronie backendu; frontend powinien używać relatywnych ścieżek przez reverse proxy kiedy to możliwe.

Rekomendacje techniczne (krótkoterminowe)
- Wprowadzić typy domenowe w src/lib/types.ts i użyć ich w całym kodzie.
- Rozdzielić id i number w modelu faktury i w routingu.
- Dodać AbortController z timeoutem i ujednolicone błędy w api client.
- Dodać walidację formularza (zod/yup) i stany ładowania/disabled.

Rekomendacje techniczne (średnioterminowe)
- Testy: unit/integration/e2e z CI.
- Logger i telemetry (np. Sentry) dla błędów produkcyjnych.
- Migracja sellerSettings do backendu z autoryzacją.

Następne kroki
- Potwierdzić kontrakt API (POST /api/invoices -> zwraca { id, number, ... }, GET /api/invoices/:id).
- Wdrożyć rozdzielenie id/number w UI oraz backend.
- Dodać walidacje i obsługę stanów sieciowych.
- Przygotować zestaw testów i pipeline CI do lint/test/build.