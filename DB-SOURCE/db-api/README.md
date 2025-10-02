# 🗄️ DB-API - Warstwa Danych Archiwum

Warstwa dostępu do danych (Data Access Layer) dla projektu Archiwum Danych. Udostępnia unified API do operacji na bazie SQLite z danymi zmigrowanymi z SQL Server.

## 📁 Zawartość

```
db-api/
├── 📄 README.md                    # Ta dokumentacja
├── 🗄️ dane_archiwalne.db           # Główna baza SQLite (1.43MB)
├── 📊 schema_analysis.json         # Analiza struktury baz (547KB)
├── 📝 export_log.txt              # Log z migracji (30KB)
├── 🔗 database_api.py             # Główne API dostępu do danych
├── 🔧 restore_databases.py        # Skrypt przywracania backupów SQL Server
├── 🔍 analyze_schema.py           # Skrypt analizy struktury
├── 📤 export_to_sqlite.py         # Skrypt eksportu do SQLite
└── 💡 example_queries.py          # Przykładowe zapytania SQL
```

## 🎯 Przeznaczenie

Ta warstwa stanowi **źródło danych** dla aplikacji UI:
- **ui-v1/** - Prosty interfejs webowy
- **ui-v2/** - Zaawansowany interfejs firmowy

## 🔧 Sposób Użycia

### Podstawowe operacje

```python
from database_api import create_database_api

# Stwórz instancję API
api = create_database_api()

# Pobierz listę firm
companies = api.get_companies()
for company in companies:
    print(f"{company['nazwa']} - {company['kontrahenci_count']} kontrahentów")

# Pobierz dane z tabeli
data = api.get_table_data('ADWKAROLINA_firma_dbo_SlwKONTRAHENT', limit=50)
print(f"Znaleziono {data['total_count']} rekordów")

# Zamknij połączenie
api.close_connection()
```

### Wyszukiwanie

```python
# Przeszukaj wszystkie tabele
results = api.search_all_tables("Warszawa")
for table, matches in results.items():
    print(f"Tabela {table}: {len(matches)} trafień")
```

### Statystyki

```python
# Pobierz statystyki bazy
stats = api.get_database_stats()
print(f"Łącznie tabel: {stats['total_tables']}")
print(f"Łącznie rekordów: {stats['total_records']}")
```

## 📊 Dostępne Metody API

### Podstawowe operacje na tabelach
- `get_all_tables()` - Lista wszystkich tabel
- `get_table_info(table_name)` - Informacje o tabeli (kolumny, typy, liczba rekordów)
- `get_table_data(table_name, limit, offset, search)` - Dane z paginacją i wyszukiwaniem

### Operacje na firmach
- `get_companies()` - Lista firm z statystykami
- `get_company_details(db_name)` - Szczegóły firmy (kontrahenci, dokumenty)

### Wyszukiwanie i statystyki
- `search_all_tables(query)` - Wyszukiwanie we wszystkich tabelach
- `get_database_stats()` - Statystyki całej bazy
- `get_schema_analysis()` - Wczytanie analizy schematu z JSON

## 🗃️ Struktura Danych

Baza zawiera dane z 4 zestawów firmowych:

| Firma | Baza Firma | Baza Magazyn | Tabele | Rekordy |
|-------|------------|--------------|--------|---------|
| ADWKAROLINA | ADWKAROLINA_firma | ADWKAROLINA_Magazyn | 63 | 416 |
| ADWRyszardWięckowski | ADWRyszardWieckow_firma | ADWRyszardWieckow_Magazyn | 63 | 934 |
| KarolinaWieckowskaKasnerDabrowskiego | Karolina_firma | Karolina_Magazyn | 63 | 191 |
| Ryszardryczałt | Ryszard_firma | Ryszard_Magazyn | 63 | 1954 |

**Łącznie:** 252 tabele, 7,495 rekordów

## 🔄 Proces Migracji (Historyczny)

1. **Przywrócenie backupów**: `restore_databases.py`
2. **Analiza struktury**: `analyze_schema.py` → `schema_analysis.json`
3. **Eksport do SQLite**: `export_to_sqlite.py` → `dane_archiwalne.db`
4. **Logowanie**: `export_log.txt`

## 🎛️ Konfiguracja

### Ścieżka do bazy danych
Domyślnie API używa `dane_archiwalne.db` w bieżącym katalogu. Można zmienić:

```python
api = DatabaseAPI('sciezka/do/innej/bazy.db')
```

### Parametry połączenia
API używa wbudowanego w Python SQLite3 z domyślnymi ustawieniami:
- Row factory: `sqlite3.Row` (dostęp przez nazwy kolumn)
- Timeout: domyślny
- Tryb: domyślny (odczyt/zapis)

## 🔒 Bezpieczeństwo

- ✅ **Lokalna baza danych** - brak połączeń zewnętrznych
- ✅ **Tylko odczyt dla UI** - warstwa API kontroluje operacje
- ✅ **Brak wstrzykiwania SQL** - użycie parametryzowanych zapytań
- ✅ **Kontrola dostępu** - API jako jedyna ścieżka do danych

## 📈 Wydajność

- **Indeksy**: baza zachowuje oryginalne indeksy z SQL Server
- **Paginacja**: domyślnie 100 rekordów na stronę
- **Wyszukiwanie**: ograniczone do kolumn tekstowych
- **Połączenia**: poolowane przez instancję API

## 🐛 Debugowanie

### Logowanie zapytań
```python
# Włącz tryb debugowania
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Sprawdzanie poprawności bazy
```python
# Sprawdź czy baza jest poprawna
api = create_database_api()
stats = api.get_database_stats()
print(f"Baza zawiera {stats['total_records']} rekordów")
```

## 🔮 Rozwój

### Możliwe rozszerzenia API
1. **Cache'ing** - pamięć podręczna dla częstych zapytań
2. **Async operations** - asynchroniczne operacje na bazie
3. **Transactions** - zarządzanie transakcjami
4. **Backup/Restore** - automatyczne kopie zapasowe
5. **Export formats** - dodatkowe formaty eksportu

### Nowe metody
```python
# Przykładowe rozszerzenia
def export_to_csv(table_name, filepath):
    """Eksport tabeli do CSV"""
    pass

def backup_database(backup_path):
    """Utwórz kopię zapasową bazy"""
    pass

def get_table_relationships():
    """Pobierz relacje między tabelami"""
    pass
```

## 📞 Wsparcie

W razie problemów:
1. Sprawdź `export_log.txt` - log z migracji
2. Sprawdź `schema_analysis.json` - pełna struktura baz
3. Użyj `example_queries.py` - przykładowe zapytania
4. Skontaktuj się z administratorem systemu

---

**Status**: ✅ **PRODUKCYJNY**
**Wersja**: 1.0
**Data**: 2025-10-01
**Odpowiedzialny**: Warstwa danych dla aplikacji UI