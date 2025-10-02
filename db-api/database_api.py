#!/usr/bin/env python3
"""
Database API - Warstwa dostępu do danych dla archiwum SQLite
Udostępnia standardowe operacje na bazie danych dla wszystkich aplikacji UI
"""
import sqlite3
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime


class DatabaseAPI:
    """Główna klasa API do obsługi bazy danych archiwum"""

    def __init__(self, db_path: str = 'dane_archiwalne.db'):
        self.db_path = db_path
        self.connection = None

    def get_connection(self) -> sqlite3.Connection:
        """Pobierz połączenie z bazą danych"""
        if not self.connection:
            self.connection = sqlite3.connect(self.db_path)
            self.connection.row_factory = sqlite3.Row
        return self.connection

    def close_connection(self):
        """Zamknij połączenie z bazą danych"""
        if self.connection:
            self.connection.close()
            self.connection = None

    # === Operacje na tabelach ===

    def get_all_tables(self) -> List[str]:
        """Pobierz listę wszystkich tabel w bazie danych"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_metadata'
            ORDER BY name
        """)
        tables = [row[0] for row in cursor.fetchall()]
        return tables

    def get_table_info(self, table_name: str) -> Dict[str, Any]:
        """Pobierz szczegółowe informacje o tabeli"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Pobierz schemat tabeli
        cursor.execute(f"PRAGMA table_info([{table_name}])")
        columns = []
        for row in cursor.fetchall():
            columns.append({
                'name': row[1],
                'type': row[2],
                'not_null': bool(row[3]),
                'default': row[4],
                'pk': bool(row[5])
            })

        # Pobierz liczbę rekordów
        cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
        row_count = cursor.fetchone()[0]

        # Pobierz przykładowe dane (pierwsze 3 rekordy)
        cursor.execute(f"SELECT * FROM [{table_name}] LIMIT 3")
        sample_data = []
        for row in cursor.fetchall():
            sample_data.append(dict(row))

        return {
            'name': table_name,
            'columns': columns,
            'row_count': row_count,
            'sample_data': sample_data
        }

    # === Operacje na danych ===

    def get_table_data(self, table_name: str, limit: int = 100, offset: int = 0,
                      search: Optional[str] = None, where_clause: Optional[str] = None) -> Dict[str, Any]:
        """Pobierz dane z tabeli z opcjonalnym wyszukiwaniem i paginacją"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Budowanie zapytania
        base_query = f"SELECT * FROM [{table_name}]"
        count_query = f"SELECT COUNT(*) FROM [{table_name}]"

        where_conditions = []
        params = []

        if search:
            # Pobierz nazwy kolumn do wyszukiwania
            cursor.execute(f"PRAGMA table_info([{table_name}])")
            columns = [row[1] for row in cursor.fetchall() if row[2].upper() in ['TEXT', 'NVARCHAR', 'VARCHAR']]

            if columns:
                search_conditions = []
                for col in columns:
                    search_conditions.append(f"[{col}] LIKE ?")
                    params.append(f"%{search}%")
                where_conditions.append(f"({' OR '.join(search_conditions)})")

        if where_clause:
            where_conditions.append(where_clause)

        if where_conditions:
            base_query += " WHERE " + " AND ".join(where_conditions)
            count_query += " WHERE " + " AND ".join(where_conditions)

        # Dodaj paginację
        base_query += " LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        # Wykonaj zapytania
        cursor.execute(base_query, params)
        data = [dict(row) for row in cursor.fetchall()]

        cursor.execute(count_query, params[:-2])  # Bez limit i offset
        total_count = cursor.fetchone()[0]

        return {
            'data': data,
            'total_count': total_count,
            'limit': limit,
            'offset': offset,
            'has_more': offset + len(data) < total_count
        }

    # === Operacje na firmach ===

    def get_companies(self) -> List[Dict[str, Any]]:
        """Pobierz listę firm z ich podstawowymi danymi"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Znajdź wszystkie tabele FIRMA
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name LIKE '%_firma_dbo_FIRMA'
            ORDER BY name
        """)

        companies = []
        for row in cursor.fetchall():
            table = row[0]
            db_name = table.split('_firma_dbo_FIRMA')[0]

            # Pobierz dane firmy
            cursor.execute(f"SELECT NAZWA, NIP, REGON FROM [{table}] LIMIT 1")
            firma = cursor.fetchone()

            if firma:
                # Pobierz adres z tabeli ADRESY
                addr_table = f"{db_name}_firma_dbo_ADRESY"
                try:
                    cursor.execute(f"SELECT MIASTO, ULICA, KOD FROM [{addr_table}] LIMIT 1")
                    adres = cursor.fetchone()
                    miasto = adres[0] if adres else None
                    ulica = adres[1] if adres else None
                    kod = adres[2] if adres else None
                except:
                    miasto, ulica, kod = None, None, None

                # Policz kontrahentów
                kontrahent_table = f"{db_name}_firma_dbo_SlwKONTRAHENT"
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM [{kontrahent_table}]")
                    kontrahenci_count = cursor.fetchone()[0]
                except:
                    kontrahenci_count = 0

                # Policz dokumenty
                try:
                    dok_table = f"{db_name}_Magazyn_dbo_dokTOW"
                    cursor.execute(f"SELECT COUNT(*) FROM [{dok_table}]")
                    dokumenty_count = cursor.fetchone()[0]
                except:
                    dokumenty_count = 0

                companies.append({
                    'db_name': db_name,
                    'nazwa': firma[0],
                    'nip': firma[1],
                    'regon': firma[2],
                    'miasto': miasto,
                    'ulica': ulica,
                    'kod': kod,
                    'kontrahenci_count': kontrahenci_count,
                    'dokumenty_count': dokumenty_count
                })

        return companies

    def get_company_details(self, db_name: str) -> Dict[str, Any]:
        """Pobierz szczegółowe informacje o firmie"""
        conn = self.get_connection()
        cursor = conn.cursor()

        details = {
            'db_name': db_name,
            'firma': None,
            'adres': None,
            'kontrahenci': [],
            'dokumenty': [],
            'tables': []
        }

        # Pobierz dane firmy
        firma_table = f"{db_name}_firma_dbo_FIRMA"
        try:
            cursor.execute(f"SELECT * FROM [{firma_table}] LIMIT 1")
            firma = cursor.fetchone()
            if firma:
                details['firma'] = dict(firma)
        except:
            pass

        # Pobierz adres
        addr_table = f"{db_name}_firma_dbo_ADRESY"
        try:
            cursor.execute(f"SELECT * FROM [{addr_table}] LIMIT 1")
            adres = cursor.fetchone()
            if adres:
                details['adres'] = dict(adres)
        except:
            pass

        # Pobierz kontrahentów
        kontrahent_table = f"{db_name}_firma_dbo_SlwKONTRAHENT"
        try:
            cursor.execute(f"SELECT * FROM [{kontrahent_table}] LIMIT 20")
            kontrahenci = cursor.fetchall()
            details['kontrahenci'] = [dict(k) for k in kontrahenci]
        except:
            pass

        # Pobierz dokumenty
        dok_table = f"{db_name}_Magazyn_dbo_dokTOW"
        try:
            cursor.execute(f"SELECT * FROM [{dok_table}] LIMIT 20")
            dokumenty = cursor.fetchall()
            details['dokumenty'] = [dict(d) for d in dokumenty]
        except:
            pass

        # Pobierz wszystkie tabele dla tej firmy
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name LIKE ?
            ORDER BY name
        """, (f"{db_name}%",))

        tables = []
        for row in cursor.fetchall():
            table_name = row[0]
            cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
            count = cursor.fetchone()[0]
            tables.append({'name': table_name, 'count': count})

        details['tables'] = tables

        return details

    # === Statystyki i metadane ===

    def get_database_stats(self) -> Dict[str, Any]:
        """Pobierz statystyki całej bazy danych"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Pobierz listę tabel
        tables = self.get_all_tables()

        total_records = 0
        tables_with_data = 0
        table_stats = []

        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM [{table}]")
            count = cursor.fetchone()[0]
            total_records += count
            if count > 0:
                tables_with_data += 1

            table_stats.append({
                'name': table,
                'record_count': count
            })

        return {
            'total_tables': len(tables),
            'tables_with_data': tables_with_data,
            'total_records': total_records,
            'tables': table_stats
        }

    def get_schema_analysis(self) -> Dict[str, Any]:
        """Pobierz wcześniejszą analizę schematu z pliku JSON"""
        try:
            with open('schema_analysis.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"error": "Schema analysis file not found"}

    # === Wyszukiwanie ===

    def search_all_tables(self, query: str, limit_per_table: int = 10) -> Dict[str, List[Dict]]:
        """Przeszukaj wszystkie tekstowe kolumny we wszystkich tabelach"""
        conn = self.get_connection()
        cursor = conn.cursor()

        results = {}
        tables = self.get_all_tables()

        for table in tables:
            # Pobierz kolumny tekstowe
            cursor.execute(f"PRAGMA table_info([{table}])")
            text_columns = [row[1] for row in cursor.fetchall()
                           if row[2].upper() in ['TEXT', 'NVARCHAR', 'VARCHAR', 'CHAR']]

            if text_columns:
                # Buduj zapytanie wyszukiwania
                search_conditions = [f"[{col}] LIKE ?" for col in text_columns]
                search_query = f"""
                    SELECT * FROM [{table}]
                    WHERE {' OR '.join(search_conditions)}
                    LIMIT {limit_per_table}
                """

                params = [f"%{query}%"] * len(text_columns)

                try:
                    cursor.execute(search_query, params)
                    matches = cursor.fetchall()
                    if matches:
                        results[table] = [dict(row) for row in matches]
                except:
                    continue

        return results


# === Funkcje pomocnicze ===

def create_database_api(db_path: str = 'dane_archiwalne.db') -> DatabaseAPI:
    """Stwórz instancję Database API"""
    return DatabaseAPI(db_path)


# === Przykładowe użycie ===

if __name__ == "__main__":
    # Przykładowe użycie API
    api = create_database_api()

    print("=== STATYSTYKI BAZY DANYCH ===")
    stats = api.get_database_stats()
    print(f"Tabele: {stats['total_tables']}")
    print(f"Rekordy: {stats['total_records']}")

    print("\n=== FIRMY ===")
    companies = api.get_companies()
    for company in companies:
        print(f"{company['nazwa']} ({company['db_name']}) - {company['kontrahenci_count']} kontrahentów")

    print("\n=== Przykładowe tabele ===")
    tables = api.get_all_tables()[:5]
    for table in tables:
        info = api.get_table_info(table)
        print(f"{table}: {info['row_count']} rekordów")

    api.close_connection()