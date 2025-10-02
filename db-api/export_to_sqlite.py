#!/usr/bin/env python3
"""
Skrypt do eksportu danych z SQL Server do SQLite
"""
import pymssql
import sqlite3
import json
import sys
from datetime import datetime, date
from decimal import Decimal

SERVER = 'localhost'
USER = 'sa'
PASSWORD = 'MyStrong@Pass123'
SQLITE_DB = 'dane_archiwalne.db'
BATCH_SIZE = 1000

# Mapowanie typów SQL Server -> SQLite
TYPE_MAPPING = {
    'int': 'INTEGER',
    'bigint': 'INTEGER',
    'smallint': 'INTEGER',
    'tinyint': 'INTEGER',
    'bit': 'INTEGER',
    'decimal': 'REAL',
    'numeric': 'REAL',
    'money': 'REAL',
    'smallmoney': 'REAL',
    'float': 'REAL',
    'real': 'REAL',
    'nvarchar': 'TEXT',
    'varchar': 'TEXT',
    'nchar': 'TEXT',
    'char': 'TEXT',
    'text': 'TEXT',
    'ntext': 'TEXT',
    'datetime': 'TEXT',
    'smalldatetime': 'TEXT',
    'date': 'TEXT',
    'time': 'TEXT',
    'image': 'BLOB',
    'binary': 'BLOB',
    'varbinary': 'BLOB',
}


def map_sql_type(sql_type):
    """Mapuje typ SQL Server na typ SQLite"""
    sql_type_lower = sql_type.lower()
    return TYPE_MAPPING.get(sql_type_lower, 'TEXT')


def sanitize_table_name(database, schema, table):
    """Tworzy bezpieczną nazwę tabeli dla SQLite"""
    # Usuń znaki diakrytyczne i specjalne
    name = f"{database}_{schema}_{table}"
    # Zamień niedozwolone znaki
    name = name.replace('.', '_').replace(' ', '_').replace('-', '_')
    return name


def convert_value(value):
    """Konwertuje wartości SQL Server na format SQLite"""
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, bytes):
        return value
    return str(value) if not isinstance(value, (int, float)) else value


def create_sqlite_table(sqlite_cursor, table_name, columns):
    """Tworzy tabelę w SQLite"""
    col_definitions = []
    for col in columns:
        sqlite_type = map_sql_type(col['type'])
        nullable = "" if col['nullable'] == 'YES' else " NOT NULL"
        col_definitions.append(f"[{col['name']}] {sqlite_type}{nullable}")

    create_sql = f"""
    CREATE TABLE IF NOT EXISTS [{table_name}] (
        {', '.join(col_definitions)}
    )
    """

    try:
        sqlite_cursor.execute(create_sql)
        return True
    except Exception as e:
        print(f"  ✗ Błąd tworzenia tabeli: {e}")
        return False


def export_table_data(mssql_cursor, sqlite_conn, database, schema, table, table_name, columns, row_count):
    """Eksportuje dane z tabeli SQL Server do SQLite"""
    if row_count == 0:
        print(f"    Pusta tabela, pomijam")
        return 0

    # Pobierz dane partiami
    col_names = [col['name'] for col in columns]
    col_names_escaped = [f"[{name}]" for name in col_names]

    select_sql = f"SELECT {', '.join(col_names_escaped)} FROM [{database}].[{schema}].[{table}]"

    try:
        mssql_cursor.execute(select_sql)

        # Wstaw dane do SQLite partiami
        placeholders = ', '.join(['?' for _ in col_names])
        insert_sql = f"INSERT INTO [{table_name}] VALUES ({placeholders})"

        sqlite_cursor = sqlite_conn.cursor()
        inserted = 0
        batch = []

        for row in mssql_cursor:
            # Konwertuj wartości
            converted_row = tuple(convert_value(val) for val in row)
            batch.append(converted_row)

            if len(batch) >= BATCH_SIZE:
                sqlite_cursor.executemany(insert_sql, batch)
                sqlite_conn.commit()
                inserted += len(batch)
                print(f"    Wstawiono {inserted:,} / {row_count:,} rekordów...", end='\r')
                batch = []

        # Wstaw pozostałe rekordy
        if batch:
            sqlite_cursor.executemany(insert_sql, batch)
            sqlite_conn.commit()
            inserted += len(batch)

        print(f"    ✓ Wstawiono {inserted:,} rekordów       ")
        return inserted

    except Exception as e:
        print(f"    ✗ Błąd eksportu danych: {e}")
        import traceback
        traceback.print_exc()
        return 0


def main():
    print("="*80)
    print("EKSPORT DANYCH DO SQLITE")
    print("="*80)

    # Wczytaj analizę schematów
    try:
        with open('schema_analysis.json', 'r', encoding='utf-8') as f:
            schema_data = json.load(f)
    except Exception as e:
        print(f"✗ Błąd wczytywania schema_analysis.json: {e}")
        return 1

    # Połącz z SQL Server
    try:
        print("\nŁączenie z SQL Server...")
        mssql_conn = pymssql.connect(
            server=SERVER,
            user=USER,
            password=PASSWORD,
            database='master'
        )
        mssql_cursor = mssql_conn.cursor()
        print("✓ Połączono z SQL Server")
    except Exception as e:
        print(f"✗ Błąd połączenia z SQL Server: {e}")
        return 1

    # Utwórz bazę SQLite
    try:
        print(f"\nTworzenie bazy SQLite: {SQLITE_DB}")
        sqlite_conn = sqlite3.connect(SQLITE_DB)
        sqlite_cursor = sqlite_conn.cursor()
        # Optymalizacje SQLite
        sqlite_cursor.execute("PRAGMA journal_mode=WAL")
        sqlite_cursor.execute("PRAGMA synchronous=NORMAL")
        sqlite_cursor.execute("PRAGMA cache_size=10000")
        sqlite_cursor.execute("PRAGMA temp_store=MEMORY")
        print("✓ Baza SQLite utworzona")
    except Exception as e:
        print(f"✗ Błąd tworzenia bazy SQLite: {e}")
        return 1

    # Eksportuj każdą bazę i tabelę
    total_tables = 0
    total_rows = 0
    successful_tables = 0

    for database_name, db_data in schema_data.items():
        print(f"\n{'='*80}")
        print(f"Baza: {database_name}")
        print(f"{'='*80}")

        tables = db_data['tables']
        print(f"Tabel do eksportu: {len(tables)}")

        for table in tables:
            total_tables += 1
            table_name = sanitize_table_name(
                database_name,
                table['schema'],
                table['name']
            )

            print(f"\n  [{total_tables}] {table['full_name']} → {table_name}")
            print(f"    Rekordów: {table['row_count']:,}")

            # Utwórz tabelę
            if not create_sqlite_table(sqlite_cursor, table_name, table['columns']):
                continue

            # Eksportuj dane
            exported = export_table_data(
                mssql_cursor,
                sqlite_conn,
                database_name,
                table['schema'],
                table['name'],
                table_name,
                table['columns'],
                table['row_count']
            )

            if exported > 0:
                successful_tables += 1
                total_rows += exported

    # Utwórz tabelę metadanych
    print(f"\n{'='*80}")
    print("Tworzenie tabeli metadanych...")
    sqlite_cursor.execute("""
    CREATE TABLE IF NOT EXISTS _metadata (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)

    metadata = [
        ('export_date', datetime.now().isoformat()),
        ('source_system', 'SQL Server (Azure SQL Edge)'),
        ('total_databases', str(len(schema_data))),
        ('total_tables', str(total_tables)),
        ('total_rows', str(total_rows)),
        ('successful_tables', str(successful_tables)),
    ]

    sqlite_cursor.executemany(
        "INSERT OR REPLACE INTO _metadata (key, value) VALUES (?, ?)",
        metadata
    )
    sqlite_conn.commit()

    # Podsumowanie
    print(f"\n{'='*80}")
    print("PODSUMOWANIE EKSPORTU")
    print(f"{'='*80}")
    print(f"Przeanalizowano baz: {len(schema_data)}")
    print(f"Tabele pomyślnie wyeksportowane: {successful_tables} / {total_tables}")
    print(f"Łączna liczba rekordów: {total_rows:,}")
    print(f"Plik SQLite: {SQLITE_DB}")

    # Sprawdź rozmiar pliku
    import os
    size_mb = os.path.getsize(SQLITE_DB) / (1024 * 1024)
    print(f"Rozmiar pliku: {size_mb:.2f} MB")

    # Zamknij połączenia
    mssql_cursor.close()
    mssql_conn.close()
    sqlite_conn.close()

    print("\n✓ Eksport zakończony!")
    return 0


if __name__ == '__main__':
    exit(main())
