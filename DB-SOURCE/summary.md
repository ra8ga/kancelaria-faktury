Archiwum Danych — podsumowanie projektu

Cel
- Migracja 8 baz SQL Server (.bak) do jednej bazy SQLite
- Udostępnienie warstwy danych (db-api) i kilku wersji interfejsu UI
- Zapewnienie łatwego przeglądania, analizy i eksportu danych

Kluczowe foldery
- db-api/ — baza `dane_archiwalne.db`, API (`database_api.py`), logi i skrypty ETL
- ui-v0/ — prosty interfejs (Flask) do wyboru firmy i przeglądania kontrahentów/dokumentów
- ui-v1/ — surowy viewer tabel (Flask), lista tabel + wyszukiwanie + paginacja
- ui-v2/ — widok firmowy (Flask) z inteligentnym pobieraniem adresów, integracja z db-api
- ui-v3/ — Advanced Analytics Dashboard (Flask + Bootstrap + Chart.js), dashboard, analityka, wyszukiwanie, eksport

Warstwa danych (db-api)
- `dane_archiwalne.db` — główna baza SQLite (ok. 1.43 MB)
- `database_api.py` — zunifikowane API dostępu do danych i metod analitycznych
- `schema_analysis.json` — pełna analiza struktury (ok. 252 tabel, 147 z danymi)
- `export_log.txt` — szczegółowy log migracji (ETL)
- Skrypty: `restore_databases.py`, `analyze_schema.py`, `export_to_sqlite.py`, `example_queries.py`

Statystyki danych (po migracji)
- Bazy: 8
- Tabele: 252 (147 z danymi)
- Rekordy: ~7,495
- Rozmiar SQLite: ~1.43 MB
- Kompresja względem *.bak: ~95%

UI — wersje i przeznaczenie
- v0: podstawowy interfejs, wybór firmy i proste widoki (port domyślny Flask)
- v1: przeglądanie surowych tabel; szybka nawigacja po wszystkich danych
- v2: widok logiczny per firma; lepsze zapytania i adresy z tabeli `ADRESY`
- v3: nowoczesny dashboard analityczny; karty KPI, wykresy, zaawansowane wyszukiwanie; eksport JSON/CSV/PDF; endpointy REST

Uruchamianie (skrót)
- v1: `python3 viewer_server.py` (UI surowych tabel)
- v2: `python3 viewer_app.py` (widok firmowy)
- v3: `python3 app.py` i otwórz `http://localhost:5002` (dashboard, wyszukiwanie, analityka)

Najważniejsze pliki
- `README.md` (root) — historia projektu i instrukcje uruchomienia
- `ui-v3/README.md` — dokumentacja v3, funkcje, endpointy i design system
- `db-api/README.md` — opis warstwy danych i sposobu użycia API
- `schema_analysis.json` — analiza struktury i typów danych
- `export_log.txt` — pełny log procesu eksportu
- `PODSUMOWANIE.md` (v1/v2) — status migracji i metryki

Architektura i technologie
- Backend: Python 3 + Flask, SQLite
- Frontend: HTML/CSS/JS, Bootstrap 5, Chart.js
- Projekt: API-first, architektura komponentowa, Progressive Enhancement

Rekomendacje użycia
- Do szybkiego przeglądu: uruchom v1 (surowe dane) lub v2 (widok firmowy)
- Do analiz i raportów: użyj v3 (dashboard analityczny, eksport)
- Do zapytań i integracji: korzystaj z `db-api/database_api.py`

Migracja do Cloudflare D1
- Baza danych pomyślnie przeniesiona do Cloudflare D1
- 254 tabel, ~8,000 rekordów, 2.09 MB
- Worker API gotowy do wdrożenia (wymaga rejestracji workers.dev)
- Dostęp przez REST API: `/api/companies_summary`, `/health`
- Szczegółowy status: `D1_MIGRATION_STATUS.md`

Status
- Projekt ukończony sukcesem (v1/v2); v3 — rozwinięty interfejs analityczny
- Dodatkowo: migracja do chmury Cloudflare D1 zakończona