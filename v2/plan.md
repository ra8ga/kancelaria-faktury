# Plan migracji baz danych z SQL Server .bak

## Cel
Wyeksportować dane z 8 plików backup SQL Server (.bak) do uniwersalnego formatu oraz stworzyć interfejs do przeglądania danych, aby nie stracić żadnych informacji.

## Inwentaryzacja plików

### Bazy danych do migracji:
1. **ADWKAROLINA_firma.bak** (2.7MB)
2. **ADWKAROLINA_Magazyn.bak** (4.2MB)
3. **ADWRyszardWięckowski_firma.bak** (2.7MB)
4. **ADWRyszardWięckowski_Magazyn.bak** (4.8MB)
5. **KarolinaWieckowskaKasnerDabrowskiego_firma.bak** (2.8MB)
6. **KarolinaWieckowskaKasnerDabrowskiego_Magazyn.bak** (4.1MB)
7. **Ryszardryczałt_firma.bak** (2.7MB)
8. **Ryszardryczałt_Magazyn.bak** (5.0MB)

**Łącznie:** 4 zestawy (firma + magazyn) dla różnych podmiotów

## Architektura rozwiązania

```
.bak files (SQL Server)
    ↓
Docker SQL Server 2019
    ↓
Skrypty eksportujące (Python)
    ↓
SQLite database (pojedynczy plik)
    ↓
HTML/JavaScript viewer (przeglądarka)
```

## Szczegółowy plan działania

### FAZA 1: Przygotowanie środowiska

#### 1.1 Uruchomienie SQL Server w Docker
- [ ] Pobrać obraz SQL Server 2019 dla macOS (ARM/x86)
- [ ] Uruchomić kontener z SQL Server
- [ ] Skonfigurować hasło SA
- [ ] Zweryfikować połączenie z SQL Server
- [ ] Skopiować pliki .bak do kontenera

#### 1.2 Instalacja narzędzi Python
- [ ] Sprawdzić dostępność Python 3
- [ ] Zainstalować biblioteki: `pyodbc` lub `pymssql`
- [ ] Zainstalować `sqlite3` (wbudowany w Python)
- [ ] Zainstalować `pandas` do eksportu danych

### FAZA 2: Przywracanie baz danych

#### 2.1 Analiza struktury backupów
- [ ] Dla każdego pliku .bak:
  - [ ] Odczytać strukturę backup (RESTORE FILELISTONLY)
  - [ ] Sprawdzić nazwy logicznych plików
  - [ ] Zapisać informacje o strukturze

#### 2.2 Przywrócenie baz danych
- [ ] ADWKAROLINA_firma.bak → ADWKAROLINA_firma
- [ ] ADWKAROLINA_Magazyn.bak → ADWKAROLINA_Magazyn
- [ ] ADWRyszardWięckowski_firma.bak → ADWRyszardWieckow_firma
- [ ] ADWRyszardWięckowski_Magazyn.bak → ADWRyszardWieckow_Magazyn
- [ ] KarolinaWieckowskaKasnerDabrowskiego_firma.bak → Karolina_firma
- [ ] KarolinaWieckowskaKasnerDabrowskiego_Magazyn.bak → Karolina_Magazyn
- [ ] Ryszardryczałt_firma.bak → Ryszard_firma
- [ ] Ryszardryczałt_Magazyn.bak → Ryszard_Magazyn

#### 2.3 Weryfikacja przywrócenia
- [ ] Sprawdzić czy wszystkie bazy są online
- [ ] Dla każdej bazy:
  - [ ] Wylistować tabele
  - [ ] Policzyć rekordy w każdej tabeli
  - [ ] Zapisać statystyki

### FAZA 3: Analiza struktury danych

#### 3.1 Mapowanie schematów
- [ ] Dla każdej bazy wyeksportować:
  - [ ] Listę tabel
  - [ ] Kolumny każdej tabeli (nazwa, typ, nullable)
  - [ ] Klucze główne
  - [ ] Klucze obce (relacje)
  - [ ] Indeksy
  - [ ] Triggery i procedury składowane

#### 3.2 Identyfikacja typów danych
- [ ] Zmapować typy SQL Server na typy SQLite:
  - `nvarchar` → `TEXT`
  - `int`, `bigint` → `INTEGER`
  - `decimal`, `money` → `REAL`
  - `datetime` → `TEXT` (ISO format)
  - `bit` → `INTEGER` (0/1)

### FAZA 4: Eksport do SQLite

#### 4.1 Stworzenie struktury bazy SQLite
- [ ] Utworzyć plik `dane_archiwalne.db`
- [ ] Dla każdej bazy SQL Server:
  - [ ] Dodać prefiks do nazw tabel (np. `adwkarolina_firma_SlwKONTRAHENT`)
  - [ ] Utworzyć tabele z odpowiednimi typami
  - [ ] Utworzyć indeksy

#### 4.2 Migracja danych
- [ ] Dla każdej tabeli w każdej bazie:
  - [ ] Wyeksportować dane partiami (10000 rekordów)
  - [ ] Przekonwertować typy danych
  - [ ] Wstawić do SQLite
  - [ ] Zapisać liczbę zmigrowanych rekordów
  - [ ] Logować ewentualne błędy

#### 4.3 Weryfikacja integralności
- [ ] Porównać liczby rekordów SQL Server vs SQLite
- [ ] Sprawdzić czy wszystkie kolumny zawierają dane
- [ ] Zweryfikować przykładowe rekordy
- [ ] Stworzyć raport z migracji

### FAZA 5: Eksport dodatkowy (backup formaty)

#### 5.1 Eksport do CSV
- [ ] Dla każdej tabeli wyeksportować plik CSV
- [ ] Użyć kodowania UTF-8 z BOM
- [ ] Struktura: `{baza}_{tabela}.csv`
- [ ] Zapakować do archiwum ZIP

#### 5.2 Eksport do JSON
- [ ] Wyeksportować każdą tabelę jako JSON
- [ ] Format: array of objects
- [ ] Struktura: `{baza}_{tabela}.json`

### FAZA 6: Dokumentacja danych

#### 6.1 Słownik danych
- [ ] Stworzyć plik `slownik_danych.md`:
  - [ ] Opis każdej bazy danych
  - [ ] Opis każdej tabeli i jej przeznaczenia
  - [ ] Opis kolumn
  - [ ] Relacje między tabelami
  - [ ] Przykładowe zapytania

#### 6.2 Statystyki
- [ ] Stworzyć `statystyki.md`:
  - [ ] Liczba rekordów w każdej tabeli
  - [ ] Rozmiary danych
  - [ ] Zakresy dat (jeśli występują)
  - [ ] Unikalne wartości w kluczowych kolumnach

### FAZA 7: Interfejs webowy

#### 7.1 Backend (Python Flask - opcjonalnie)
- [ ] Prosty serwer do serwowania danych z SQLite
- [ ] API endpoints do pobierania danych
- [ ] Wyszukiwanie i filtrowanie

#### 7.2 Frontend (HTML/JavaScript)
- [ ] Stworzyć `viewer.html`:
  - [ ] Lista wszystkich baz i tabel
  - [ ] Przeglądanie rekordów (paginacja)
  - [ ] Wyszukiwanie po wszystkich polach
  - [ ] Filtrowanie danych
  - [ ] Sortowanie kolumn
  - [ ] Eksport widoku do CSV
  - [ ] Responsywny design (mobile-friendly)

#### 7.3 Funkcje zaawansowane
- [ ] Podgląd relacji między tabelami
- [ ] Wizualizacja podstawowych statystyk
- [ ] Historia wyszukiwań
- [ ] Eksport wybranych rekordów

### FAZA 8: Testy i weryfikacja końcowa

#### 8.1 Testy funkcjonalne
- [ ] Sprawdzić czy wszystkie dane są dostępne
- [ ] Przetestować wyszukiwanie
- [ ] Przetestować filtrowanie
- [ ] Przetestować eksport

#### 8.2 Testy wydajnościowe
- [ ] Sprawdzić czas ładowania dużych tabel
- [ ] Zoptymalizować zapytania SQLite
- [ ] Dodać indeksy gdzie potrzeba

#### 8.3 Dokumentacja użytkownika
- [ ] Stworzyć `README.md`:
  - [ ] Jak otworzyć viewer
  - [ ] Jak wyszukiwać dane
  - [ ] Gdzie znajdują się pliki danych
  - [ ] Jak zrobić backup

### FAZA 9: Czyszczenie i pakowanie

#### 9.1 Struktura końcowa katalogów
```
Archiwum/
├── plan.md (ten plik)
├── README.md (instrukcja)
├── slownik_danych.md
├── statystyki.md
├── dane_archiwalne.db (główna baza SQLite)
├── viewer.html (interfejs webowy)
├── backup_oryginalne/
│   ├── ADWKAROLINA_firma.bak
│   ├── ADWKAROLINA_Magazyn.bak
│   └── ... (pozostałe .bak)
├── eksport_csv/
│   └── wszystkie_tabele.zip
├── eksport_json/
│   └── wszystkie_tabele.zip
└── logi/
    ├── migracja.log
    └── weryfikacja.log
```

#### 9.2 Czyszczenie
- [ ] Zatrzymać i usunąć kontener Docker
- [ ] Przenieść oryginalne .bak do `backup_oryginalne/`
- [ ] Usunąć pliki tymczasowe
- [ ] Zweryfikować kompletność danych

#### 9.3 Backup końcowy
- [ ] Utworzyć archiwum ZIP z wszystkimi danymi
- [ ] Zweryfikować poprawność archiwum
- [ ] Opcjonalnie: upload do chmury

## Technologie i narzędzia

### Wymagane:
- Docker Desktop (dostępny ✓)
- Python 3.x (dostępny ✓)
- Biblioteki Python: pymssql, pandas, sqlite3

### Opcjonalne:
- Flask (jeśli potrzebny backend)
- Chart.js (wizualizacje w viewerze)

## Szacowany czas realizacji

- Faza 1-2: 30 min (setup Docker + przywracanie)
- Faza 3: 15 min (analiza struktury)
- Faza 4: 30 min (migracja do SQLite)
- Faza 5: 15 min (eksport CSV/JSON)
- Faza 6: 20 min (dokumentacja)
- Faza 7: 45 min (interfejs webowy)
- Faza 8: 15 min (testy)
- Faza 9: 10 min (czyszczenie)

**Łącznie:** ~3 godziny

## Potencjalne problemy i rozwiązania

### Problem 1: Polskie znaki w nazwach
**Rozwiązanie:** Użyć UTF-8 we wszystkich eksportach, w SQLite użyć PRAGMA encoding

### Problem 2: Błędy przy przywracaniu .bak
**Rozwiązanie:** Użyć WITH MOVE do relokacji plików, WITH REPLACE do nadpisania

### Problem 3: Duże tabele
**Rozwiązanie:** Eksport partiami (chunking), użyć transakcji w SQLite

### Problem 4: Nieznana struktura danych
**Rozwiązanie:** Najpierw pełna analiza, potem migracja z logowaniem

## Kryteria sukcesu

✓ Wszystkie 8 baz danych przywrócone
✓ 100% danych zmigrowane do SQLite
✓ Wszystkie tabele dostępne w viewerze
✓ Możliwość wyszukiwania i eksportu
✓ Kompletna dokumentacja
✓ Backup w wielu formatach (SQLite, CSV, JSON)
