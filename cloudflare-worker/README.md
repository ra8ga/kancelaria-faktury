# Archiwum Worker (Cloudflare D1)

Minimalny Worker z endpointem `/api/companies_summary` opartym o Cloudflare D1.

## Wymagania
- Konto Cloudflare
- Zainstalowany `wrangler` (CLI)

## Konfiguracja
1. Zaloguj się:
   ```bash
   wrangler login
   ```
2. Utwórz bazę D1:
   ```bash
   wrangler d1 create archiwum-danych
   ```
3. Uzupełnij `database_id` w `cloudflare-worker/wrangler.toml` wartością zwróconą przez polecenie powyżej.

## Import bazy (SQLite → D1)
1. Wygeneruj dump:
   ```bash
   sqlite3 db-api/dane_archiwalne.db ".dump" > dump.sql
   ```
2. (Opcjonalnie) rozdziel na `schema.sql` i `data.sql`:
   ```bash
   sqlite3 db-api/dane_archiwalne.db ".schema" > schema.sql
   # Wyodrębnij INSERTy z dump.sql do data.sql (np. grep/sed)
   ```
3. Importuj do D1:
   ```bash
   wrangler d1 execute archiwum-danych --file schema.sql --remote
   wrangler d1 execute archiwum-danych --file data.sql --remote
   # Lub jednym plikiem:
   wrangler d1 execute archiwum-danych --file dump.sql --remote
   ```

## Uruchomienie
```bash
cd cloudflare-worker
wrangler dev
```

Testy:
- Health: `GET http://localhost:8787/health`
- Podsumowanie firm: `GET http://localhost:8787/api/companies_summary`

## Integracja z UI
- Skonfiguruj w aplikacjach UI zmienną `API_BASE_URL` na adres Workera.
- Endpoint `/api/companies_summary` jest zgodny z wymaganiami UI-v3 (lista firm + metryki).

## Uwaga
- Jeśli import jest duży, podziel `data.sql` na części: `split -l 5000 data.sql data_part_`.
- Upewnij się, że indeksy (`CREATE INDEX`) zostały zaimportowane dla lepszej wydajności.