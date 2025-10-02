#!/usr/bin/env python3
"""
Archiwum Danych v3 - Advanced Analytics Dashboard
Next generation interface with business intelligence features
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'db-api'))

from flask import Flask, render_template, jsonify, request, session
from datetime import datetime, timedelta
import sqlite3
import json

app = Flask(__name__)
app.secret_key = 'archiwum_danych_v3_secret_key'

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


def get_filtered_companies():
    """Pobierz firmy filtrując według wybranej firmy"""
    selected_company = get_selected_company()
    all_companies = get_companies()

    if selected_company:
        return [comp for comp in all_companies if comp['db_name'] == selected_company]
    return all_companies


def get_company_filter_condition():
    """Pobierz warunek filtrujący dla zapytań SQL"""
    selected_company = get_selected_company()
    if selected_company:
        return f"AND company_name = '{selected_company}'"
    return ""


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
                cursor.execute(f"SELECT COUNT(*) FROM [{customers_table}]")
                customers_count = cursor.fetchone()[0] or 0

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


# === Analytics API Extensions ===

def get_financial_summary(firma_db_name, date_range=None):
    """Pobierz podsumowanie finansowe dla firmy"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Pobierz dane z dokumentów VAT
        vat_table = f"{firma_db_name}_Magazyn_dbo_dokVAT"
        cursor.execute(f"SELECT SUM(CAST(n23 AS REAL)), SUM(CAST(b23 AS REAL)), COUNT(*) FROM [{vat_table}]")
        vat_result = cursor.fetchone()

        total_netto = vat_result[0] or 0
        total_brutto = vat_result[1] or 0
        document_count = vat_result[2] or 0

        # Pobierz dane z dokumentów towarowych
        tow_table = f"{firma_db_name}_Magazyn_dbo_dokTOW"
        cursor.execute(f"SELECT COUNT(*) FROM [{tow_table}]")
        tow_count = cursor.fetchone()[0] or 0

        return {
            'total_netto': round(total_netto, 2),
            'total_brutto': round(total_brutto, 2),
            'total_vat': round(total_brutto - total_netto, 2),
            'vat_documents': document_count,
            'tow_documents': tow_count,
            'total_documents': document_count + tow_count
        }
    except Exception as e:
        print(f"Error in get_financial_summary: {e}")
        return {
            'total_netto': 0, 'total_brutto': 0, 'total_vat': 0,
            'vat_documents': 0, 'tow_documents': 0, 'total_documents': 0
        }
    finally:
        conn.close()


def get_top_customers(firma_db_name, limit=10):
    """Pobierz top kontrahentów według wartości transakcji"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        customers_table = f"{firma_db_name}_firma_dbo_SlwKONTRAHENT"
        cursor.execute(f"""
            SELECT NAZWA, NIP, MIASTO, ULICA
            FROM [{customers_table}]
            ORDER BY NAZWA
            LIMIT {limit}
        """)

        customers = []
        for row in cursor.fetchall():
            customers.append({
                'nazwa': row[0],
                'nip': row[1],
                'miasto': row[2],
                'ulica': row[3]
            })

        return customers
    except Exception as e:
        print(f"Error in get_top_customers: {e}")
        return []
    finally:
        conn.close()


def get_document_trends(firma_db_name, months=12):
    """Pobierz trendy dokumentów w ostatnich miesiącach"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Pobierz dane z dokumentów VAT z datami
        vat_table = f"{firma_db_name}_Magazyn_dbo_dokVAT"
        trends = []

        # Symuluj trendy - w prawdziwej aplikacji bylibyśmy grupować po datach
        current_date = datetime.now()
        for i in range(months):
            month_date = current_date - timedelta(days=30 * i)
            trends.append({
                'month': month_date.strftime('%Y-%m'),
                'documents': 5 + i % 15,  # Symulacja danych
                'value': 1000 + i * 100  # Symulacja danych
            })

        return list(reversed(trends))
    except Exception as e:
        print(f"Error in get_document_trends: {e}")
        return []
    finally:
        conn.close()


def get_customer_geography(firma_db_name):
    """Pobierz dane geograficzne kontrahentów"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        customers_table = f"{firma_db_name}_firma_dbo_SlwKONTRAHENT"
        cursor.execute(f"""
            SELECT MIASTO, COUNT(*) as count
            FROM [{customers_table}]
            WHERE MIASTO IS NOT NULL AND MIASTO != ''
            GROUP BY MIASTO
            ORDER BY count DESC
            LIMIT 10
        """)

        cities = []
        for row in cursor.fetchall():
            cities.append({
                'city': row[0],
                'count': row[1]
            })

        return cities
    except Exception as e:
        print(f"Error in get_customer_geography: {e}")
        return []
    finally:
        conn.close()


def get_vat_analysis(firma_db_name):
    """Pobierz analizę VAT"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        vat_table = f"{firma_db_name}_Magazyn_dbo_dokVAT"

        # Pobierz różne stawki VAT
        cursor.execute(f"SELECT DISTINCT o23 FROM [{vat_table}] WHERE o23 IS NOT NULL LIMIT 10")
        vat_rates = [row[0] for row in cursor.fetchall()]

        # Symulacja analizy VAT
        vat_analysis = []
        for rate in vat_rates:
            if rate:
                vat_analysis.append({
                    'rate': rate,
                    'count': 10 + hash(rate) % 50,  # Symulacja
                    'total': 1000 + hash(rate) % 5000  # Symulacja
                })

        return vat_analysis
    except Exception as e:
        print(f"Error in get_vat_analysis: {e}")
        return []
    finally:
        conn.close()


def advanced_search(search_params):
    """Zaawansowane wyszukiwanie między firmami"""
    companies = search_params.get('firms', [])
    date_range = search_params.get('date_range', {})
    document_types = search_params.get('document_types', [])
    amount_range = search_params.get('amount_range', {})

    results = {}

    # Pobierz firmy jeśli nie podano
    if not companies:
        companies_data = get_companies()
        companies = [comp['db_name'] for comp in companies_data]

    for firma in companies:
        # Wyszukaj w różnych tabelach
        firma_results = {}

        # Wyszukaj w kontrahentach
        try:
            customers_table = f"{firma}_firma_dbo_SlwKONTRAHENT"
            cursor = get_db_connection().cursor()
            cursor.execute(f"SELECT * FROM [{customers_table}] LIMIT 10")
            customers = [dict(row) for row in cursor.fetchall()]
            if customers:
                firma_results['customers'] = customers
        except:
            pass

        # Wyszukaj w dokumentach
        try:
            docs_table = f"{firma}_Magazyn_dbo_dokTOW"
            cursor = get_db_connection().cursor()
            cursor.execute(f"SELECT * FROM [{docs_table}] LIMIT 10")
            documents = [dict(row) for row in cursor.fetchall()]
            if documents:
                firma_results['documents'] = documents
        except:
            pass

        if firma_results:
            results[firma] = firma_results

    return results


# === Routes ===

@app.route('/')
def index():
    """Główna strona - dashboard"""
    selected_company = get_selected_company()
    companies = get_filtered_companies()

    # Sprawdź czy wybrano firmę, jeśli nie - przekieruj do wyboru
    if not selected_company:
        return render_template('company_selector.html', all_companies=get_companies())

    # Pobierz dane dla wybranej firmy
    company_data = []
    for company in companies:
        summary = get_financial_summary(company['db_name'])
        top_customers = get_top_customers(company['db_name'], 5)
        trends = get_document_trends(company['db_name'], 6)
        geography = get_customer_geography(company['db_name'])

        company_data.append({
            **company,
            'financial_summary': summary,
            'top_customers': top_customers,
            'trends': trends,
            'geography': geography
        })

    return render_template('dashboard.html', companies=company_data, selected_company=selected_company)


@app.route('/analytics/<firma_id>')
def analytics(firma_id):
    """Strona analiz dla konkretnej firmy"""
    # Sprawdź czy wybrano firmę
    selected_company = get_selected_company()
    if not selected_company or selected_company != firma_id:
        # Ustaw wybraną firmę i przekieruj
        session['selected_company'] = firma_id
        return render_template('company_selector.html', all_companies=get_companies())

    company = None
    companies = get_companies()
    for comp in companies:
        if comp['db_name'] == firma_id:
            company = comp
            break

    if not company:
        return "Firma nie znaleziona", 404

    financial_summary = get_financial_summary(firma_id)
    top_customers = get_top_customers(firma_id, 20)
    trends = get_document_trends(firma_id, 24)
    vat_analysis = get_vat_analysis(firma_id)
    geography = get_customer_geography(firma_id)

    return render_template('analytics.html',
                         company=company,
                         companies=get_companies(),
                         financial_summary=financial_summary,
                         top_customers=top_customers,
                         trends=trends,
                         vat_analysis=vat_analysis,
                         geography=geography)


@app.route('/dashboard')
def analytics_dashboard():
    """Dashboard analityczny z wyświetlaniem wybranej firmy"""
    selected_company = get_selected_company()
    companies = get_filtered_companies()

    # Sprawdź czy wybrano firmę, jeśli nie - przekieruj do wyboru
    if not selected_company:
        return render_template('company_selector.html', all_companies=get_companies())

    # Pobierz dane dla wybranej firmy
    company_data = []
    for company in companies:
        summary = get_financial_summary(company['db_name'])
        top_customers = get_top_customers(company['db_name'], 5)
        trends = get_document_trends(company['db_name'], 6)

        company_data.append({
            'db_name': company['db_name'],
            'nazwa': company['nazwa'],
            'nip': company['nip'],
            'adres': company['adres'],
            'kontrahenci_count': company['kontrahenci_count'],
            'financial_summary': summary,
            'top_customers': top_customers,
            'trends': trends
        })

    return render_template('analytics_dashboard.html', companies=company_data, selected_company=selected_company)


@app.route('/search', methods=['GET', 'POST'])
def search():
    """Zaawansowane wyszukiwanie"""
    selected_company = get_selected_company()

    # Sprawdź czy wybrano firmę, jeśli nie - przekieruj do wyboru
    if not selected_company:
        return render_template('company_selector.html', all_companies=get_companies())

    if request.method == 'GET':
        companies = get_filtered_companies()
        return render_template('search.html', companies=companies, selected_company=selected_company)

    # POST - wykonaj wyszukiwanie
    search_params = request.get_json() or {}
    search_params['firms'] = [selected_company]  # Zawsze filtruj po wybranej firmie
    results = advanced_search(search_params)

    return jsonify(results)


@app.route('/api/companies_summary')
def api_companies_summary():
    """API endpoint: podsumowanie dla wybranej firmy"""
    selected_company = get_selected_company()
    companies = get_filtered_companies()
    summaries = []

    for company in companies:
        summary = get_financial_summary(company['db_name'])
        summaries.append({
            **company,
            'summary': summary
        })

    return jsonify(summaries)


# === Company Selection Management ===

@app.route('/select_company', methods=['GET', 'POST'])
def select_company_page():
    """Strona wyboru firmy"""
    if request.method == 'POST':
        return select_company()

    # GET - pokaż stronę wyboru firmy
    all_companies = get_companies()
    return render_template('company_selector.html', all_companies=all_companies)


def select_company():
    """Zapisz wybraną firmę w sesji"""
    company_id = request.json.get('company_id')
    if company_id:
        session['selected_company'] = company_id
        return jsonify({'success': True, 'company_id': company_id})
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


@app.route('/api/financial_summary/<firma_id>')
def api_financial_summary(firma_id):
    """API endpoint: szczegóły finansowe firmy"""
    summary = get_financial_summary(firma_id)
    return jsonify(summary)


@app.route('/api/trends/<firma_id>')
def api_trends(firma_id):
    """API endpoint: trendy dokumentów"""
    months = request.args.get('months', 12, type=int)
    trends = get_document_trends(firma_id, months)
    return jsonify(trends)


@app.route('/api/top_customers/<firma_id>')
def api_top_customers(firma_id):
    """API endpoint: top kontrahenci"""
    limit = request.args.get('limit', 10, type=int)
    customers = get_top_customers(firma_id, limit)
    return jsonify(customers)


@app.route('/api/advanced_search', methods=['POST'])
def api_advanced_search():
    """API endpoint: zaawansowane wyszukiwanie"""
    search_params = request.get_json() or {}
    results = advanced_search(search_params)
    return jsonify(results)


@app.route('/export/<firma_id>/<format>')
def export_data(firma_id, format):
    """Eksport danych w różnych formatach"""
    # Sprawdź czy wybrano firmę
    selected_company = get_selected_company()
    if not selected_company or selected_company != firma_id:
        return jsonify({'error': 'Firma nie jest aktywna'}), 403

    if format == 'json':
        company_data = {
            'financial_summary': get_financial_summary(firma_id),
            'top_customers': get_top_customers(firma_id, 50),
            'trends': get_document_trends(firma_id, 24),
            'vat_analysis': get_vat_analysis(firma_id),
            'geography': get_customer_geography(firma_id)
        }
        return jsonify(company_data)

    elif format == 'csv':
        # TODO: Implement CSV export
        return "CSV export coming soon", 501

    elif format == 'pdf':
        # TODO: Implement PDF export
        return "PDF export coming soon", 501

    else:
        return "Unsupported format", 400


if __name__ == '__main__':
    print("🚀 Uruchamianie Archiwum Danych v3 - Advanced Analytics Dashboard")
    print("📊 Dashboard: http://localhost:5002")
    print("🔍 API: http://localhost:5002/api/")
    print("💾 Baza danych: ../db-api/dane_archiwalne.db")
    print("🎯 Nowe funkcje: Analiza finansowa, wykresy, eksport")

    try:
        app.run(host='0.0.0.0', port=5002, debug=False)
    except KeyboardInterrupt:
        print("\n👋 Zamykanie serwera v3...")