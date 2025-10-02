#!/usr/bin/env python3
"""
Archiwum Danych v0 - Prosty interfejs przeglądania
Podstawowy interfejs do wyboru firmy i przeglądania kontrahentów z dokumentami
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'db-api'))

from flask import Flask, render_template, jsonify, request, session
from datetime import datetime, timedelta
import sqlite3
import json

app = Flask(__name__)
app.secret_key = 'archiwum_danych_v0_secret_key'

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db-api', 'dane_archiwalne.db')

def get_db_connection():
    """Create a new database connection for each request"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_selected_company():
    """Pobierz wybraną firmę z sesji lub zwróć None"""
    return session.get('selected_company')

def get_companies():
    """Pobierz listę firm z ich podstawowymi danymi"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Znajdź wszystkie tabele FIRMY
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name LIKE '%_firma_dbo_FIRMA'
            ORDER BY name
        """)

        companies = []
        for row in cursor.fetchall():
            table = row[0]
            db_name = table.replace('_firma_dbo_FIRMA', '')

            # Pobierz dane firmy
            cursor.execute(f"SELECT NAZWA, NIP, REPREZENTANT FROM [{table}] LIMIT 1")
            firma_row = cursor.fetchone()

            if firma_row:
                # Pobierz liczbę kontrahentów
                customers_table = f"{db_name}_firma_dbo_SlwKONTRAHENT"
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM [{customers_table}]")
                    customers_count = cursor.fetchone()[0] or 0
                except:
                    customers_count = 0

                companies.append({
                    'db_name': db_name,
                    'nazwa': firma_row['NAZWA'],
                    'adres': firma_row['REPREZENTANT'] or '',
                    'nip': firma_row['NIP'],
                    'kontrahenci_count': customers_count
                })

        return companies
    finally:
        conn.close()

def get_customers(firma_db_name, limit=100, offset=0, search=''):
    """Pobierz kontrahentów dla wybranej firmy"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        customers_table = f"{firma_db_name}_firma_dbo_SlwKONTRAHENT"

        if search:
            cursor.execute(f"""
                SELECT NAZWA, NIP, MIASTO, ULICA, KOD, ID
                FROM [{customers_table}]
                WHERE NAZWA LIKE ? OR MIASTO LIKE ? OR NIP LIKE ?
                ORDER BY NAZWA
                LIMIT ? OFFSET ?
            """, (f'%{search}%', f'%{search}%', f'%{search}%', limit, offset))
        else:
            cursor.execute(f"""
                SELECT NAZWA, NIP, MIASTO, ULICA, KOD, ID
                FROM [{customers_table}]
                ORDER BY NAZWA
                LIMIT ? OFFSET ?
            """, (limit, offset))

        customers = []
        for row in cursor.fetchall():
            customers.append({
                'id': row['ID'],
                'nazwa': row['NAZWA'],
                'nip': row['NIP'],
                'miasto': row['MIASTO'],
                'ulica': row['ULICA'],
                'kod_pocztowy': row['KOD']
            })

        # Pobierz całkowitą liczbę
        if search:
            cursor.execute(f"""
                SELECT COUNT(*) FROM [{customers_table}]
                WHERE NAZWA LIKE ? OR MIASTO LIKE ? OR NIP LIKE ?
            """, (f'%{search}%', f'%{search}%', f'%{search}%'))
        else:
            cursor.execute(f"SELECT COUNT(*) FROM [{customers_table}]")

        total_count = cursor.fetchone()[0]

        return {
            'customers': customers,
            'total_count': total_count,
            'current_page': offset // limit + 1,
            'per_page': limit
        }
    except Exception as e:
        print(f"Error in get_customers: {e}")
        return {'customers': [], 'total_count': 0, 'current_page': 1, 'per_page': limit}
    finally:
        conn.close()

def get_customer_documents(firma_db_name, customer_id, customer_name):
    """Pobierz dokumenty powiązane z kontrahentem"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        documents = []

        # Dokumenty VAT
        vat_table = f"{firma_db_name}_Magazyn_dbo_dokVAT"
        try:
            cursor.execute(f"""
                SELECT Numer, DataWyst, NNETTO, BRUTTO, VAT, TYP, Opis
                FROM [{vat_table}]
                WHERE ODBIORCA = ? OR SPRZEDAWCA = ?
                ORDER BY DataWyst DESC
                LIMIT 50
            """, (customer_name, customer_name))

            for row in cursor.fetchall():
                documents.append({
                    'numer': row['Numer'],
                    'data_wyst': row['DataWyst'],
                    'netto': row['NNETTO'],
                    'brutto': row['BRUTTO'],
                    'vat': row['VAT'],
                    'typ': row['TYP'],
                    'opis': row['Opis'],
                    'rodzaj': 'Dokument VAT'
                })
        except Exception as e:
            print(f"Error getting VAT documents: {e}")

        # Dokumenty Towarowe
        tow_table = f"{firma_db_name}_Magazyn_dbo_dokTOW"
        try:
            cursor.execute(f"""
                SELECT Numer, DataWyst, KWOTA, TYP, Opis
                FROM [{tow_table}]
                WHERE KONTRAHENT = ? OR Opis LIKE ?
                ORDER BY DataWyst DESC
                LIMIT 50
            """, (customer_name, f'%{customer_name}%'))

            for row in cursor.fetchall():
                documents.append({
                    'numer': row['Numer'],
                    'data_wyst': row['DataWyst'],
                    'netto': row['KWOTA'],
                    'brutto': row['KWOTA'],
                    'vat': 0,
                    'typ': row['TYP'],
                    'opis': row['Opis'],
                    'rodzaj': 'Dokument Towarowy'
                })
        except Exception as e:
            print(f"Error getting TOW documents: {e}")

        return documents
    except Exception as e:
        print(f"Error in get_customer_documents: {e}")
        return []
    finally:
        conn.close()

# === Routes ===

@app.route('/')
def index():
    """Główna strona - wybór firmy"""
    selected_company = get_selected_company()

    if not selected_company:
        return render_template('company_selector.html', all_companies=get_companies())

    # Przekieruj do listy kontrahentów
    companies = get_companies()
    current_company = None
    for company in companies:
        if company['db_name'] == selected_company:
            current_company = company
            break

    if not current_company:
        return render_template('company_selector.html', all_companies=companies)

    # Pobierz pierwszą stronę kontrahentów
    customers_data = get_customers(selected_company, 50, 0, '')

    return render_template('customers.html',
                         company=current_company,
                         customers_data=customers_data,
                         current_page=1,
                         search='',
                         all_companies=get_companies())

@app.route('/customers')
def customers():
    """Lista kontrahentów"""
    selected_company = get_selected_company()

    if not selected_company:
        return render_template('company_selector.html', all_companies=get_companies())

    companies = get_companies()
    current_company = None
    for company in companies:
        if company['db_name'] == selected_company:
            current_company = company
            break

    if not current_company:
        return render_template('company_selector.html', all_companies=companies)

    # Parametry paginacji i wyszukiwania
    page = request.args.get('page', 1, type=int)
    per_page = 50
    offset = (page - 1) * per_page
    search = request.args.get('search', '').strip()

    customers_data = get_customers(selected_company, per_page, offset, search)

    return render_template('customers.html',
                         company=current_company,
                         customers_data=customers_data,
                         current_page=page,
                         search=search,
                         all_companies=get_companies())

@app.route('/customer_documents/<int:customer_id>')
def customer_documents(customer_id):
    """Dokumenty kontrahenta"""
    selected_company = get_selected_company()

    if not selected_company:
        return jsonify({'error': 'Nie wybrano firmy'}), 400

    customer_name = request.args.get('name', '')
    if not customer_name:
        return jsonify({'error': 'Brak nazwy kontrahenta'}), 400

    documents = get_customer_documents(selected_company, customer_id, customer_name)
    return jsonify({'documents': documents})

@app.route('/select_company', methods=['GET', 'POST'])
def select_company():
    """Zapisz wybraną firmę w sesji"""
    if request.method == 'GET':
        return render_template('company_selector.html', all_companies=get_companies())

    company_id = request.json.get('company_id')
    if company_id:
        session['selected_company'] = company_id
        return jsonify({'success': True, 'company_id': company_id})
    return jsonify({'success': False}), 400

@app.route('/quick_company_change', methods=['POST'])
def quick_company_change():
    """Szybka zmiana firmy z sidebara"""
    company_id = request.json.get('company_id')
    if company_id:
        session['selected_company'] = company_id
        return jsonify({'success': True, 'redirect': '/customers'})
    return jsonify({'success': False}), 400

@app.route('/clear_company_selection', methods=['POST'])
def clear_company_selection():
    """Wyczyść wybór firmy"""
    session.pop('selected_company', None)
    return jsonify({'success': True})

@app.route('/get_current_company')
def get_current_company():
    """Pobierz aktualnie wybraną firmę"""
    selected_company = get_selected_company()
    all_companies = get_companies()

    current_company = None
    if selected_company:
        for company in all_companies:
            if company['db_name'] == selected_company:
                current_company = company
                break

    return jsonify({
        'selected_company': selected_company,
        'company_info': current_company
    })

if __name__ == '__main__':
    print("🚀 Uruchamianie Archiwum Danych v0 - Prosty interfejs przeglądania")
    print("📊 Dashboard: http://localhost:5003")
    print("🔍 Wybór firmy i kontrahenci")
    print("💾 Baza danych: ../db-api/dane_archiwalne.db")
    print("🎯 Prosty interfejs: Firmy → Kontrahenci → Dokumenty")
    print("🔄 Tryb debugowania włączony - auto-reload przy zmianach")

    try:
        app.run(host='0.0.0.0', port=5003, debug=True, use_reloader=True)
    except KeyboardInterrupt:
        print("\n👋 Zamykanie serwera v0...")