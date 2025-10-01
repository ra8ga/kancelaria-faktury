#!/usr/bin/env python3
"""
Przykładowe zapytania do bazy danych archiwalnych
"""
import sqlite3

DB_FILE = 'dane_archiwalne.db'


def get_connection():
    """Połącz z bazą SQLite"""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def example_1_all_contractors():
    """Przykład 1: Wyświetl wszystkich kontrahentów ze wszystkich baz"""
    print("="*80)
    print("PRZYKŁAD 1: Wszyscy kontrahenci")
    print("="*80)

    conn = get_connection()
    cursor = conn.cursor()

    # Znajdź wszystkie tabele z kontrahentami
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name LIKE '%SlwKONTRAHENT%'
    """)

    tables = [row[0] for row in cursor.fetchall()]

    all_contractors = []
    for table in tables:
        database = table.split('_dbo_')[0]
        cursor.execute(f"SELECT ID, SYMBOL, NAZWA, MIASTO FROM [{table}]")
        for row in cursor.fetchall():
            all_contractors.append({
                'database': database,
                'id': row[0],
                'symbol': row[1],
                'name': row[2],
                'city': row[3]
            })

    print(f"\nZnaleziono {len(all_contractors)} kontrahentów w {len(tables)} bazach\n")
    print(f"{'Baza':<30} {'Symbol':<15} {'Nazwa':<40} {'Miasto':<20}")
    print("-" * 105)

    for c in all_contractors[:20]:  # Pokaż pierwsze 20
        print(f"{c['database']:<30} {c['symbol']:<15} {c['name']:<40} {c['city'] or 'N/A':<20}")

    if len(all_contractors) > 20:
        print(f"... i {len(all_contractors) - 20} więcej")

    conn.close()


def example_2_documents_by_database():
    """Przykład 2: Statystyki dokumentów per baza"""
    print("\n" + "="*80)
    print("PRZYKŁAD 2: Statystyki dokumentów")
    print("="*80 + "\n")

    conn = get_connection()
    cursor = conn.cursor()

    # Znajdź wszystkie tabele z dokumentami
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name LIKE '%dokTOW%'
        ORDER BY name
    """)

    print(f"{'Baza':<35} {'Liczba dokumentów':<20} {'Tabela VAT':<35} {'Rekordy VAT':<15}")
    print("-" * 105)

    for row in cursor.fetchall():
        table_name = row[0]
        database = table_name.replace('_dbo_dokTOW', '')

        # Policz dokumenty
        cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
        doc_count = cursor.fetchone()[0]

        # Policz rekordy VAT
        vat_table = table_name.replace('dokTOW', 'dokVAT')
        try:
            cursor.execute(f"SELECT COUNT(*) FROM [{vat_table}]")
            vat_count = cursor.fetchone()[0]
        except:
            vat_count = 0

        print(f"{database:<35} {doc_count:<20} {vat_table:<35} {vat_count:<15}")

    conn.close()


def example_3_search_by_city():
    """Przykład 3: Wyszukaj kontrahentów z konkretnego miasta"""
    city = "Warszawa"

    print("\n" + "="*80)
    print(f"PRZYKŁAD 3: Kontrahenci z miasta: {city}")
    print("="*80 + "\n")

    conn = get_connection()
    cursor = conn.cursor()

    # Znajdź wszystkie tabele z kontrahentami
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name LIKE '%SlwKONTRAHENT%'
    """)

    found = 0
    for row in cursor.fetchall():
        table_name = row[0]
        database = table_name.split('_dbo_')[0]

        cursor.execute(f"SELECT SYMBOL, NAZWA, ULICA FROM [{table_name}] WHERE MIASTO = ?", (city,))
        results = cursor.fetchall()

        if results:
            print(f"\n📍 {database}:")
            for r in results:
                print(f"   • {r[1]} ({r[0]}) - {r[2] or 'brak adresu'}")
                found += 1

    if found == 0:
        print(f"Nie znaleziono kontrahentów w mieście {city}")
    else:
        print(f"\n✓ Znaleziono łącznie {found} kontrahentów")

    conn.close()


def example_4_payment_forms():
    """Przykład 4: Statystyki form płatności"""
    print("\n" + "="*80)
    print("PRZYKŁAD 4: Formy płatności w systemie")
    print("="*80 + "\n")

    conn = get_connection()
    cursor = conn.cursor()

    # Znajdź pierwszą tabelę z formami płatności
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name LIKE '%slwFormyPlatnosci%'
        LIMIT 1
    """)

    table = cursor.fetchone()[0]
    cursor.execute(f"SELECT NAZWA, RODZAJ, TERMIN FROM [{table}]")

    print(f"{'Forma płatności':<40} {'Rodzaj':<10} {'Termin (dni)':<15}")
    print("-" * 65)

    for row in cursor.fetchall():
        print(f"{row[0]:<40} {row[1]:<10} {row[2] or 'N/A':<15}")

    conn.close()


def example_5_vat_rates():
    """Przykład 5: Stawki VAT używane w systemie"""
    print("\n" + "="*80)
    print("PRZYKŁAD 5: Stawki VAT")
    print("="*80 + "\n")

    conn = get_connection()
    cursor = conn.cursor()

    # Znajdź pierwszą tabelę ze stawkami VAT
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name LIKE '%slwStawkiVAT%'
        LIMIT 1
    """)

    table = cursor.fetchone()[0]
    cursor.execute(f"SELECT SYMBOL, NAZWA, WARTOSC FROM [{table}] ORDER BY SYMBOL")

    print(f"{'Symbol':<10} {'Nazwa':<30} {'Wartość (%)':<15}")
    print("-" * 55)

    for row in cursor.fetchall():
        print(f"{row[0]:<10} {row[1]:<30} {row[2] if row[2] is not None else 'N/A':<15}")

    conn.close()


def main():
    print("\n" + "="*80)
    print("PRZYKŁADOWE ZAPYTANIA DO BAZY ARCHIWALNEJ")
    print("="*80)

    try:
        example_1_all_contractors()
        example_2_documents_by_database()
        example_3_search_by_city()
        example_4_payment_forms()
        example_5_vat_rates()

        print("\n" + "="*80)
        print("✓ Wszystkie przykłady wykonane pomyślnie!")
        print("="*80 + "\n")

    except Exception as e:
        print(f"\n✗ Błąd: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
