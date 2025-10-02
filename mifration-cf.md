Migracja do Cloudflare D1 — Plan i Checklista

Cel i zakres
- Przenieść lokalną bazę SQLite (`db-api/dane_archiwalne.db`) do Cloudflare D1.
- Udostępnić REST API przez Cloudflare Workers, aby UI (v1/v2/v3) korzystało z danych w chmurze.
- Zachować zgodność schematu, nazewnictwa tabel i funkcjonalności (wyszukiwanie, analityka, eksport).

Wymagania wstępne
- Konto Cloudflare i zainstalowany `wrangler` (CLI).
- Dostęp do lokalnego pliku SQLite: `db-api/dane_archiwalne.db`.
- Node.js (dla Workers) oraz Python (lokalne testy, opcjonalnie).

Architektura docelowa
- Cloudflare D1: baza danych (SQL, kompatybilna z SQLite).
- Cloudflare Worker: lekka warstwa API (HTTP), powiązana z D1 (binding).
- UI (Flask): wywołuje endpointy Workera zamiast lokalnego SQLite (przez `API_BASE_URL`).
- Opcjonalnie: Cloudflare R2 na backupy dumpów SQL.

Plan migracji danych (D1)
1) Przygotowanie dumpu z lokalnej SQLite
   - Pełen dump (schema + data):
     ```bash
     sqlite3 db-api/dane_archiwalne.db ".dump" > dump.sql
     ```
   - Alternatywnie rozdzielenie:
     ```bash
     sqlite3 db-api/dane_archiwalne.db ".schema" > schema.sql
     # Wyodrębnij INSERTy do osobnego pliku data.sql (np. grep/sed)
     ```
   - Uwaga: SQLite typy jak `ntext` są mapowane do `TEXT`; PRAGMA/triggerów nie używamy w D1.

2) Utworzenie bazy D1
   ```bash
   wrangler login
   wrangler d1 create archiwum-danych
   ```

3) Import schematu i danych
   - Import schematu:
     ```bash
     wrangler d1 execute archiwum-danych --file schema.sql --remote
     ```
   - Import danych (w partiach, jeśli duże):
     ```bash
     # Podział na części (przykład):
     split -l 5000 data.sql data_part_
     for f in data_part_*; do wrangler d1 execute archiwum-danych --file "$f" --remote; done
     ```
   - Alternatywnie jednym plikiem:
     ```bash
     wrangler d1 execute archiwum-danych --file dump.sql --remote
     ```

4) Weryfikacja poprawności
   - Porównanie liczności rekordów dla kluczowych tabel (np. `dokTOW`, `dokVAT`, `SlwKONTRAHENT`):
     ```bash
     wrangler d1 execute archiwum-danych --remote --command "SELECT COUNT(*) AS cnt FROM ADWKAROLINA_Magazyn_dbo_dokTOW;"
     wrangler d1 execute archiwum-danych --remote --command "SELECT COUNT(*) AS cnt FROM ADWKAROLINA_Magazyn_dbo_dokVAT;"
     wrangler d1 execute archiwum-danych --remote --command "SELECT COUNT(*) AS cnt FROM ADWKAROLINA_firma_dbo_SlwKONTRAHENT;"
     ```
   - Oczekiwane wartości na bazie eksportu: `dokTOW=132`, `dokVAT=264`, `SlwKONTRAHENT=20` (dla ADWKAROLINA; analogicznie dla pozostałych baz).

Warstwa API (Cloudflare Worker)
- Konfiguracja bindingu w `wrangler.toml`:
  ```toml
  [[d1_databases]]
  binding = "ARCHIWUM_DB"
  database_name = "archiwum-danych"
  database_id = "<ID-z-wranglera>"
  ```
- Minimalny Worker (przykład):
  ```js
  export default {
    async fetch(req, env) {
      const url = new URL(req.url);
      const db = env.ARCHIWUM_DB;

      if (url.pathname === '/api/companies_summary') {
        const q = `
          SELECT db_name, nazwa, nip, regon, miasto, ulica, kod,
                 kontrahenci_count, dokumenty_count
          FROM companies_summary_view
        `; // Możesz utworzyć widok w D1 lub budować zapytanie dynamicznie
        const { results } = await db.prepare(q).all();
        return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
      }

      return new Response('Not found', { status: 404 });
    }
  };
  ```
- Endpointy do odwzorowania (zgodnie z `ui-v3/README.md`):
  - `GET /api/companies_summary`
  - `GET /api/financial_summary/{id}`
  - `GET /api/trends/{id}`
  - `GET /api/top_customers/{id}`
  - `POST /api/advanced_search`

Integracja UI
- Dodaj zmienną środowiskową `API_BASE_URL` w aplikacjach Flask i używaj jej do kierowania zapytań do Workera.
- Mapuj istniejące wywołania w `ui-v3/app.py` na endpointy Workera (bez zmian w logice UI).
- Dla `ui-v1`/`ui-v2`: opcjonalnie zapewnij kompatybilne endpointy lub utrzymuj lokalny tryb offline.

Bezpieczeństwo i CORS
- Ogranicz dostęp do Workera przez CORS (do zaufanych domen).
- Nie przechowuj wrażliwych danych; D1 zawiera dane publiczne archiwalne.
- Monitoruj limity zapytań (Cloudflare) i rozważ cache (KV/Cache API) dla statycznych wyników.

Backup i rollback
- Backup: trzymaj `dump.sql` w R2 lub lokalnie (wersjonowanie).
- Rollback: w razie problemów, usuń bazę D1 i ponownie zaimportuj z dumpa.
- Utrzymuj skrypty importu/eksportu jako część repozytorium.

Cutover (przełączenie produkcji)
- Tryb równoległy: działają jednocześnie lokalna SQLite (offline) i D1 (online) do czasu pełnej weryfikacji.
- Przełącz `API_BASE_URL` w konfiguracji na produkcyjny Worker.
- Testy end‑to‑end i smoke testy po przełączeniu.

Wydajność i indeksy
- Upewnij się, że `CREATE INDEX` zostały zaimportowane; w razie potrzeby dodaj brakujące indeksy w D1.
- Optymalizuj zapytania (agregacje, widoki) pod najczęściej używane endpointy.
- Rozważ cache na poziomie Workera (krótkie TTL dla dashboardów).

Harmonogram (propozycja)
- Dzień 1: Przygotowanie dumpów, utworzenie D1, import schematu.
- Dzień 2: Import danych, weryfikacja liczności, utworzenie Workera.
- Dzień 3: Implementacja i testy endpointów, CORS, cache.
- Dzień 4: Integracja UI, testy E2E, przygotowanie cutover.
- Dzień 5: Cutover, monitoring, ewentualne poprawki.

Checklista (do odhaczania)
- [ ] Zainstaluj `wrangler` i zaloguj się (`wrangler login`).
- [ ] Utwórz bazę D1 (`wrangler d1 create archiwum-danych`).
- [ ] Wygeneruj `schema.sql` i `data.sql` (lub `dump.sql`).
- [ ] Oczyść dump z nieobsługiwanych instrukcji (PRAGMA, TRIGGER jeśli występują).
- [ ] Podziel duży plik danych na mniejsze części (`split`).
- [ ] Zaimportuj schemat do D1 (`wrangler d1 execute --file schema.sql`).
- [ ] Zaimportuj dane do D1 (partiami lub całością).
- [ ] Zweryfikuj `COUNT(*)` dla kluczowych tabel (np. `dokTOW`, `dokVAT`, `SlwKONTRAHENT`).
- [ ] Skonfiguruj `wrangler.toml` z bindingiem D1.
- [ ] Zaimplementuj minimalny Worker i przetestuj dostęp.
- [ ] Dodaj endpointy: companies_summary, financial_summary/{id}, trends/{id}, top_customers/{id}, advanced_search.
- [ ] Skonfiguruj CORS i (opcjonalnie) cache w Workerze.
- [ ] Zintegruj UI-v3 z Worker API (`API_BASE_URL`).
- [ ] Wykonaj testy E2E UI → Worker → D1.
- [ ] Przygotuj backupy (`dump.sql`) w R2/lokalnie.
- [ ] Przeprowadź cutover (przełączenie na D1) i smoke testy.
- [ ] Udokumentuj wynik i ewentualne różnice względem lokalnej SQLite.

Uruchomienie Workera (szybki start)
- Skonfiguruj `cloudflare-worker/wrangler.toml` (uzupełnij `database_id`).
- Uruchom lokalnie: `wrangler dev` w folderze `cloudflare-worker/`.
- Testy API:
  - `GET http://localhost:8787/health` → oczekiwane `{ ok: true }`
  - `GET http://localhost:8787/api/companies_summary` → lista firm z metrykami
- Po imporcie do D1 zweryfikuj liczności przez `wrangler d1 execute ... --command "SELECT COUNT(*) ..."`.