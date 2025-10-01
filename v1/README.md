# 📊 Archiwum Danych - SQL Server Backup

Kompletne archiwum danych zeksportowanych z 8 baz danych SQL Server wraz z interfejsem webowym do przeglądania.

## 📁 Zawartość

```
Archiwum/
├── README.md                       # Ta instrukcja
├── plan.md                         # Szczegółowy plan migracji
│
├── dane_archiwalne.db              # ⭐ Główna baza SQLite z wszystkimi danymi
├── schema_analysis.json            # Analiza struktury wszystkich baz
│
├── viewer_server.py                # 🌐 Serwer webowy do przeglądania danych
│
├── restore_databases.py            # Skrypt przywracania baz z .bak
├── analyze_schema.py               # Skrypt analizy struktury
├── export_to_sqlite.py             # Skrypt eksportu do SQLite
│
├── export_log.txt                  # Log z procesu eksportu
│
└── *.bak                           # 8 oryginalnych plików backup
```

## 🎯 Zmigrowane Bazy Danych

Łącznie **8 baz danych** w **4 zestawach**:

| Zestaw | Baza Firma | Baza Magazyn |
|--------|------------|--------------|
| ADWKAROLINA | ADWKAROLINA_firma (20 kontrahentów) | ADWKAROLINA_Magazyn (132 dokumenty) |
| ADWRyszardWięckowski | ADWRyszardWieckow_firma (32 kontrahentów) | ADWRyszardWieckow_Magazyn (400 dokumentów) |
| KarolinaWieckowskaKasnerDabrowskiego | Karolina_firma (3 kontrahentów) | Karolina_Magazyn (62 dokumenty) |
| Ryszardryczałt | Ryszard_firma (49 kontrahentów) | Ryszard_Magazyn (551 dokumentów) |

### Statystyki

- **Łączna liczba tabel:** 252 (147 z danymi)
- **Łączna liczba rekordów:** 7,495
- **Rozmiar bazy SQLite:** 1.43 MB
- **Data eksportu:** 2025-10-01

## 🚀 Jak Używać

### 1. Przeglądanie Danych (Najszybsza Metoda)

```bash
# Uruchom serwer webowy
python3 viewer_server.py

# Otwórz w przeglądarce
open http://localhost:5001
```

Przeglądarka oferuje:
- ✅ Lista wszystkich tabel z licznikami rekordów
- ✅ Wyszukiwanie tabel po nazwie
- ✅ Przeglądanie zawartości każdej tabeli
- ✅ Wyszukiwanie w danych
- ✅ Paginacja wyników
- ✅ Responsywny interfejs

### 2. Bezpośrednie Zapytania SQL

```bash
# Otwórz bazę w SQLite
sqlite3 dane_archiwalne.db

# Przykładowe zapytania:
.tables                              # Lista wszystkich tabel
.schema ADWKAROLINA_firma_dbo_SlwKONTRAHENT  # Struktura tabeli

# Wyświetl wszystkich kontrahentów
SELECT NAZWA, NIP, MIASTO
FROM ADWKAROLINA_firma_dbo_SlwKONTRAHENT;

# Wyświetl dokumenty VAT
SELECT dokID, n23, o23
FROM ADWKAROLINA_Magazyn_dbo_dokVAT
LIMIT 10;
```

### 3. Eksport do CSV

```python
import sqlite3
import csv

conn = sqlite3.connect('dane_archiwalne.db')
cursor = conn.cursor()

# Eksportuj wybraną tabelę
cursor.execute("SELECT * FROM ADWKAROLINA_firma_dbo_SlwKONTRAHENT")

with open('kontrahenci.csv', 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow([desc[0] for desc in cursor.description])
    writer.writerows(cursor.fetchall())

conn.close()
```

## 📊 Struktura Danych

### Bazy "Firma"

Zawierają dane korporacyjne:
- **FIRMA** - informacje o firmie (NIP, REGON, adresy)
- **SlwKONTRAHENT** - kontrahenci (klienci i dostawcy)
- **FIRMAKONTA** - konta bankowe
- **slwWaluta** - waluty i kursy
- **slwGrupyKh** - grupy kontrahentów

### Bazy "Magazyn"

Zawierają dane operacyjne:
- **dokTOW** - dokumenty towarowe (faktury, WZ, PZ)
- **dokVAT** - rejestry VAT
- **lstDokTOW** - pozycje dokumentów
- **PLATNOSCI** - płatności
- **slwTOWARY** - słownik towarów
- **slwFormyPlatnosci** - formy płatności
- **slwStawkiVAT** - stawki VAT

## 🔍 Wyszukiwanie Danych

### Przykład: Znajdź wszystkie faktury z 2024

```sql
SELECT
    dokID,
    NR,
    DATA_WYSTAWIENIA,
    KONTRAHENT
FROM ADWRyszardWieckow_Magazyn_dbo_dokTOW
WHERE DATA_WYSTAWIENIA LIKE '2024%';
```

### Przykład: Kontrahenci z określonego miasta

```sql
SELECT NAZWA, NIP, ULICA
FROM ADWKAROLINA_firma_dbo_SlwKONTRAHENT
WHERE MIASTO = 'Warszawa';
```

### Przykład: Suma wartości VAT

```sql
SELECT SUM(CAST(n23 AS REAL)) as suma_netto
FROM Ryszard_Magazyn_dbo_dokVAT;
```

## 🔧 Dodatkowe Narzędzia

### Ponowna Migracja

Jeśli chcesz ponownie zmigrować dane:

```bash
# 1. Uruchom SQL Server w Docker
docker run -e "ACCEPT_EULA=1" -e "MSSQL_SA_PASSWORD=MyStrong@Pass123" \
  -p 1433:1433 --name sqlserver -d \
  mcr.microsoft.com/azure-sql-edge:latest

# 2. Skopiuj pliki .bak do kontenera
docker exec sqlserver mkdir -p /var/opt/mssql/backup
for file in *.bak; do docker cp "$file" sqlserver:/var/opt/mssql/backup/; done

# 3. Przywróć bazy
python3 restore_databases.py

# 4. Przeanalizuj strukturę
python3 analyze_schema.py

# 5. Eksportuj do SQLite
python3 export_to_sqlite.py

# 6. Zatrzymaj kontener
docker stop sqlserver && docker rm sqlserver
```

## 📝 Konwencja Nazewnictwa

Tabele w SQLite mają nazwy w formacie:
```
{NazwaBazy}_{Schema}_{Tabela}
```

Przykłady:
- `ADWKAROLINA_firma_dbo_SlwKONTRAHENT`
- `Ryszard_Magazyn_dbo_dokTOW`
- `Karolina_firma_dbo_FIRMA`

## 🛡️ Bezpieczeństwo

- ✅ Dane są przechowywane lokalnie
- ✅ Brak połączenia z internetem podczas przeglądania
- ✅ Oryginalne pliki .bak zachowane
- ✅ Wszystkie hasła są lokalne (nie współdzielone)

## 📦 Backup i Archiwizacja

### Tworzenie archiwum ZIP

```bash
# Kompresuj całe archiwum
zip -r archiwum_danych_$(date +%Y%m%d).zip . -x "*.bak"

# Lub z plikami .bak
zip -r archiwum_danych_pelne_$(date +%Y%m%d).zip .
```

### Backup do chmury

```bash
# Google Drive, Dropbox, iCloud, etc.
# Skopiuj dane_archiwalne.db do swojej chmury
```

## 🐛 Rozwiązywanie Problemów

### Serwer nie startuje

```bash
# Sprawdź czy port 5000 jest wolny
lsof -i :5000

# Uruchom na innym porcie
python3 viewer_server.py  # edytuj port w pliku
```

### Błąd "database is locked"

```bash
# Zamknij wszystkie połączenia z bazą
# Upewnij się, że tylko jedna aplikacja korzysta z bazy
```

### Polskie znaki nie wyświetlają się

```bash
# Sprawdź encoding przy eksporcie
# SQLite powinno używać UTF-8 (domyślnie OK)
```

## 📞 Kontakt i Wsparcie

W razie pytań lub problemów:
1. Sprawdź `plan.md` - szczegółowy opis procesu
2. Zobacz `export_log.txt` - logi z eksportu
3. Przeanalizuj `schema_analysis.json` - pełna struktura baz

## 📄 Licencja

Dane prywatne. Nie udostępniać publicznie.

---

**Data utworzenia:** 2025-10-01
**Źródło:** SQL Server 2019 / Azure SQL Edge
**Format docelowy:** SQLite 3
**Narzędzia:** Python 3, Flask, pymssql
