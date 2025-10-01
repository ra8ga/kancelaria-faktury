#!/usr/bin/env python3
"""
Skrypt do przywracania baz danych SQL Server z plików .bak
"""
import pymssql
import time

# Konfiguracja połączenia
SERVER = 'localhost'
USER = 'sa'
PASSWORD = 'MyStrong@Pass123'
BACKUP_PATH = '/var/opt/mssql/backup'
DATA_PATH = '/var/opt/mssql/data'

# Definicja baz do przywrócenia
DATABASES = [
    {
        'backup_file': 'ADWKAROLINA_firma.bak',
        'database_name': 'ADWKAROLINA_firma',
    },
    {
        'backup_file': 'ADWKAROLINA_Magazyn.bak',
        'database_name': 'ADWKAROLINA_Magazyn',
    },
    {
        'backup_file': 'ADWRyszardWięckowski_firma.bak',
        'database_name': 'ADWRyszardWieckow_firma',
    },
    {
        'backup_file': 'ADWRyszardWięckowski_Magazyn.bak',
        'database_name': 'ADWRyszardWieckow_Magazyn',
    },
    {
        'backup_file': 'KarolinaWieckowskaKasnerDabrowskiego_firma.bak',
        'database_name': 'Karolina_firma',
    },
    {
        'backup_file': 'KarolinaWieckowskaKasnerDabrowskiego_Magazyn.bak',
        'database_name': 'Karolina_Magazyn',
    },
    {
        'backup_file': 'Ryszardryczałt_firma.bak',
        'database_name': 'Ryszard_firma',
    },
    {
        'backup_file': 'Ryszardryczałt_Magazyn.bak',
        'database_name': 'Ryszard_Magazyn',
    },
]


def get_file_list(cursor, backup_file):
    """Pobiera listę logicznych plików z backupu"""
    sql = f"RESTORE FILELISTONLY FROM DISK = '{BACKUP_PATH}/{backup_file}'"
    cursor.execute(sql)
    files = []
    for row in cursor:
        files.append({
            'logical_name': row[0],
            'physical_name': row[1],
            'type': row[2]
        })
    return files


def restore_database(cursor, backup_file, database_name):
    """Przywraca bazę danych z backupu"""
    print(f"\n{'='*60}")
    print(f"Przywracanie: {database_name} z {backup_file}")
    print(f"{'='*60}")

    # Pobierz strukturę plików
    files = get_file_list(cursor, backup_file)
    print(f"Znaleziono plików: {len(files)}")
    for f in files:
        print(f"  - {f['logical_name']} ({f['type']})")

    # Przygotuj klauzulę MOVE
    move_clauses = []
    for f in files:
        if f['type'] == 'D':  # Data file
            new_path = f"{DATA_PATH}/{database_name}.mdf"
        else:  # Log file
            new_path = f"{DATA_PATH}/{database_name}_log.ldf"
        move_clauses.append(f"MOVE '{f['logical_name']}' TO '{new_path}'")

    move_statement = ', '.join(move_clauses)

    # Przywróć bazę danych
    restore_sql = f"""
    RESTORE DATABASE [{database_name}]
    FROM DISK = '{BACKUP_PATH}/{backup_file}'
    WITH {move_statement},
    REPLACE,
    RECOVERY
    """

    try:
        print(f"Wykonywanie RESTORE DATABASE...")
        cursor.execute(restore_sql)

        # Poczekaj na zakończenie
        while cursor.nextset():
            pass

        print(f"✓ Baza {database_name} przywrócona pomyślnie!")
        return True

    except Exception as e:
        print(f"✗ Błąd podczas przywracania {database_name}: {e}")
        return False


def verify_databases(cursor):
    """Weryfikuje czy wszystkie bazy zostały przywrócone"""
    print(f"\n{'='*60}")
    print("WERYFIKACJA PRZYWRÓCONYCH BAZ DANYCH")
    print(f"{'='*60}")

    cursor.execute("SELECT name, state_desc, create_date FROM sys.databases WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')")

    print(f"\n{'Database':<30} {'Status':<15} {'Created':<20}")
    print("-" * 65)

    for row in cursor:
        print(f"{row[0]:<30} {row[1]:<15} {str(row[2]):<20}")


def main():
    print("="*60)
    print("SKRYPT PRZYWRACANIA BAZ DANYCH SQL SERVER")
    print("="*60)

    try:
        # Połącz z SQL Server
        print("\nŁączenie z SQL Server...")
        conn = pymssql.connect(
            server=SERVER,
            user=USER,
            password=PASSWORD,
            database='master',
            autocommit=True
        )
        cursor = conn.cursor()
        print("✓ Połączono z SQL Server")

        # Przywróć wszystkie bazy
        successful = 0
        failed = 0

        for db in DATABASES:
            if restore_database(cursor, db['backup_file'], db['database_name']):
                successful += 1
            else:
                failed += 1
            time.sleep(1)  # Krótka pauza między operacjami

        # Podsumowanie
        print(f"\n{'='*60}")
        print("PODSUMOWANIE")
        print(f"{'='*60}")
        print(f"Pomyślnie przywrócono: {successful}")
        print(f"Błędy: {failed}")

        # Weryfikacja
        verify_databases(cursor)

        cursor.close()
        conn.close()
        print("\n✓ Zakończono!")

    except Exception as e:
        print(f"\n✗ Błąd krytyczny: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == '__main__':
    exit(main())
