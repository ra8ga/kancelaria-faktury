#!/usr/bin/env python3
"""
Skrypt do analizy struktury przywróconych baz danych
"""
import pymssql
import json

SERVER = 'localhost'
USER = 'sa'
PASSWORD = 'MyStrong@Pass123'

DATABASES = [
    'ADWKAROLINA_firma',
    'ADWKAROLINA_Magazyn',
    'ADWRyszardWieckow_firma',
    'ADWRyszardWieckow_Magazyn',
    'Karolina_firma',
    'Karolina_Magazyn',
    'Ryszard_firma',
    'Ryszard_Magazyn',
]


def get_tables(cursor, database):
    """Pobiera listę tabel z bazy danych"""
    # Najpierw pobierz nazwy tabel
    sql = f"""
    SELECT TABLE_SCHEMA, TABLE_NAME
    FROM [{database}].INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
    """
    cursor.execute(sql)
    table_list = [(row[0], row[1]) for row in cursor]

    # Teraz policz rekordy dla każdej tabeli
    tables = []
    for schema, name in table_list:
        try:
            count_sql = f"SELECT COUNT(*) FROM [{database}].[{schema}].[{name}]"
            cursor.execute(count_sql)
            count = cursor.fetchone()[0]
        except:
            count = 0

        tables.append({
            'schema': schema,
            'name': name,
            'row_count': count
        })
    return tables


def get_columns(cursor, database, schema, table):
    """Pobiera informacje o kolumnach tabeli"""
    sql = f"""
    SELECT
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
    FROM [{database}].INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '{schema}' AND TABLE_NAME = '{table}'
    ORDER BY ORDINAL_POSITION
    """
    cursor.execute(sql)
    columns = []
    for row in cursor:
        columns.append({
            'name': row[0],
            'type': row[1],
            'max_length': row[2],
            'nullable': row[3],
            'default': row[4]
        })
    return columns


def main():
    print("="*80)
    print("ANALIZA STRUKTURY BAZ DANYCH")
    print("="*80)

    try:
        conn = pymssql.connect(
            server=SERVER,
            user=USER,
            password=PASSWORD,
            database='master'
        )
        cursor = conn.cursor()

        all_data = {}
        total_tables = 0
        total_rows = 0

        for database in DATABASES:
            print(f"\n{'='*80}")
            print(f"Baza: {database}")
            print(f"{'='*80}")

            tables = get_tables(cursor, database)
            print(f"\nZnaleziono tabel: {len(tables)}")

            db_data = {
                'database': database,
                'tables': []
            }

            for table in tables:
                table_name = f"{table['schema']}.{table['name']}"
                print(f"\n  Tabela: {table_name}")
                print(f"    Rekordów: {table['row_count']:,}")

                columns = get_columns(cursor, database, table['schema'], table['name'])
                print(f"    Kolumn: {len(columns)}")

                # Pokaż pierwsze 5 kolumn
                for i, col in enumerate(columns[:5]):
                    nullable = "NULL" if col['nullable'] == 'YES' else "NOT NULL"
                    max_len = f"({col['max_length']})" if col['max_length'] else ""
                    print(f"      - {col['name']}: {col['type']}{max_len} {nullable}")

                if len(columns) > 5:
                    print(f"      ... i {len(columns) - 5} więcej")

                table_info = {
                    'schema': table['schema'],
                    'name': table['name'],
                    'full_name': table_name,
                    'row_count': table['row_count'],
                    'columns': columns
                }
                db_data['tables'].append(table_info)

                total_tables += 1
                total_rows += table['row_count']

            all_data[database] = db_data

        # Zapisz do JSON
        with open('schema_analysis.json', 'w', encoding='utf-8') as f:
            json.dump(all_data, f, indent=2, ensure_ascii=False, default=str)

        print(f"\n{'='*80}")
        print("PODSUMOWANIE")
        print(f"{'='*80}")
        print(f"Przeanalizowanych baz: {len(DATABASES)}")
        print(f"Łączna liczba tabel: {total_tables}")
        print(f"Łączna liczba rekordów: {total_rows:,}")
        print(f"\n✓ Analiza zapisana do: schema_analysis.json")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"\n✗ Błąd: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == '__main__':
    exit(main())
