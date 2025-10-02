#!/usr/bin/env python3
"""
Inteligentna przeglądarka danych - widok logiczny po firmach (wersja używająca db-api)
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'db-api'))

from flask import Flask, render_template_string, jsonify, request
from database_api import create_database_api
from datetime import datetime

app = Flask(__name__)
api = create_database_api('../db-api/dane_archiwalne.db')


# === Funkcje pomocnicze używające db-api ===

def get_companies():
    """Pobierz listę firm z ich podstawowymi danymi"""
    return api.get_companies()


def get_company_details(db_name):
    """Pobierz szczegółowe informacje o firmie"""
    return api.get_company_details(db_name)


def get_table_data(table_name, page=1, per_page=50, search=None):
    """Pobierz dane z tabeli z paginacją i wyszukiwaniem"""
    offset = (page - 1) * per_page
    result = api.get_table_data(table_name, limit=per_page, offset=offset, search=search)

    return {
        'data': result['data'],
        'total': result['total_count'],
        'page': page,
        'per_page': per_page,
        'total_pages': (result['total_count'] + per_page - 1) // per_page
    }


def search_all_tables(query, limit_per_table=20):
    """Przeszukaj wszystkie tabele"""
    return api.search_all_tables(query, limit_per_table)


# === Szablony HTML ===

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Archiwum Danych - v2</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f8f9fa; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
        .header p { opacity: 0.9; }
        .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        .companies-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .company-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.1); transition: transform 0.3s, box-shadow 0.3s; cursor: pointer; }
        .company-card:hover { transform: translateY(-5px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
        .company-header { display: flex; align-items: center; margin-bottom: 1rem; }
        .company-icon { width: 48px; height: 48px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 1rem; font-size: 1.5rem; }
        .company-title { flex: 1; }
        .company-name { font-size: 1.1rem; font-weight: 600; color: #2c3e50; margin-bottom: 0.25rem; }
        .company-nip { font-size: 0.9rem; color: #6c757d; }
        .company-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
        .stat-item { text-align: center; padding: 0.75rem; background: #f8f9fa; border-radius: 8px; }
        .stat-number { font-size: 1.5rem; font-weight: 600; color: #667eea; }
        .stat-label { font-size: 0.8rem; color: #6c757d; margin-top: 0.25rem; }
        .company-address { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e9ecef; font-size: 0.9rem; color: #6c757d; }
        .detail-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; }
        .modal-content { background: white; border-radius: 12px; width: 90%; max-width: 1000px; max-height: 80vh; margin: 2rem auto; overflow: hidden; display: flex; flex-direction: column; }
        .modal-header { padding: 1.5rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; display: flex; justify-content: space-between; align-items: center; }
        .modal-title { font-size: 1.3rem; font-weight: 600; }
        .close-btn { background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; padding: 0.5rem; }
        .modal-tabs { display: flex; background: #f8f9fa; border-bottom: 1px solid #dee2e6; }
        .tab-btn { padding: 1rem 1.5rem; background: none; border: none; cursor: pointer; font-weight: 500; color: #6c757d; border-bottom: 2px solid transparent; transition: all 0.3s; }
        .tab-btn.active { color: #667eea; border-bottom-color: #667eea; }
        .tab-btn:hover { background: #e9ecef; }
        .modal-body { flex: 1; overflow-y: auto; padding: 1.5rem; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .data-table { background: white; border-radius: 8px; overflow: hidden; border: 1px solid #dee2e6; }
        .data-table table { width: 100%; border-collapse: collapse; }
        .data-table th { background: #f8f9fa; padding: 1rem; text-align: left; font-weight: 600; border-bottom: 2px solid #dee2e6; }
        .data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #dee2e6; }
        .data-table tr:hover { background: #f8f9fa; }
        .pagination { display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1.5rem; }
        .pagination button { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; background: white; cursor: pointer; border-radius: 6px; transition: all 0.3s; }
        .pagination button:hover:not(:disabled) { background: #f8f9fa; }
        .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
        .pagination .current { background: #667eea; color: white; border-color: #667eea; }
        .search-box { margin-bottom: 1rem; }
        .search-input { width: 100%; padding: 0.75rem; border: 1px solid #dee2e6; border-radius: 8px; font-size: 1rem; }
        .loading { text-align: center; padding: 3rem; color: #6c757d; }
        .loading-spinner { border: 3px solid #f3f3f3; border-top: 3px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .no-data { text-align: center; padding: 3rem; color: #6c757d; }
        .table-info { background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
        .table-name { font-weight: 600; font-size: 1.1rem; margin-bottom: 0.5rem; }
        .table-description { color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏢 Archiwum Danych - v2 (Widok Firmowy)</h1>
        <p>Inteligentny interfejs do przeglądania danych firmowych</p>
    </div>

    <div class="container">
        <div id="companiesGrid" class="companies-grid">
            <!-- Karty firm zostaną załadowane przez JavaScript -->
        </div>
    </div>

    <!-- Modal szczegółów firmy -->
    <div id="detailModal" class="detail-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle" class="modal-title">Szczegóły Firmy</h2>
                <button class="close-btn" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-tabs">
                <button class="tab-btn active" onclick="switchTab('overview')">Przegląd</button>
                <button class="tab-btn" onclick="switchTab('customers')">Kontrahenci</button>
                <button class="tab-btn" onclick="switchTab('documents')">Dokumenty</button>
                <button class="tab-btn" onclick="switchTab('tables')">Tabele</button>
            </div>
            <div class="modal-body">
                <div id="overviewTab" class="tab-content active">
                    <div id="overviewContent">
                        <!-- Zawartość przeglądu -->
                    </div>
                </div>
                <div id="customersTab" class="tab-content">
                    <div class="search-box">
                        <input type="text" class="search-input" placeholder="Szukaj kontrahentów..." id="customerSearch">
                    </div>
                    <div id="customersContent">
                        <!-- Kontrahenci -->
                    </div>
                </div>
                <div id="documentsTab" class="tab-content">
                    <div class="search-box">
                        <input type="text" class="search-input" placeholder="Szukaj dokumentów..." id="documentSearch">
                    </div>
                    <div id="documentsContent">
                        <!-- Dokumenty -->
                    </div>
                </div>
                <div id="tablesTab" class="tab-content">
                    <div id="tablesContent">
                        <!-- Tabele -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentCompany = null;
        let currentTablePage = {};

        // Załaduj listę firm
        async function loadCompanies() {
            try {
                const response = await fetch('/api/companies');
                const companies = await response.json();
                displayCompanies(companies);
            } catch (error) {
                console.error('Błąd ładowania firm:', error);
            }
        }

        // Wyświetl karty firm
        function displayCompanies(companies) {
            const grid = document.getElementById('companiesGrid');

            grid.innerHTML = companies.map(company => `
                <div class="company-card" onclick="showCompanyDetails('${company.db_name}')">
                    <div class="company-header">
                        <div class="company-icon">🏢</div>
                        <div class="company-title">
                            <div class="company-name">${company.nazwa || 'Brak nazwy'}</div>
                            <div class="company-nip">NIP: ${company.nip || 'Brak'}</div>
                        </div>
                    </div>
                    <div class="company-stats">
                        <div class="stat-item">
                            <div class="stat-number">${company.kontrahenci_count || 0}</div>
                            <div class="stat-label">Kontrahenci</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${company.dokumenty_count || 0}</div>
                            <div class="stat-label">Dokumenty</div>
                        </div>
                    </div>
                    ${company.miasto || company.ulica ? `
                        <div class="company-address">
                            📍 ${[company.ulica, company.miasto, company.kod].filter(Boolean).join(', ')}
                        </div>
                    ` : ''}
                </div>
            `).join('');
        }

        // Pokaż szczegóły firmy
        async function showCompanyDetails(dbName) {
            currentCompany = dbName;

            try {
                const response = await fetch(`/api/company/${dbName}`);
                const details = await response.json();

                document.getElementById('modalTitle').textContent = details.nazwa || dbName;
                displayOverview(details);
                displayCustomers(details.kontrahenci || []);
                displayDocuments(details.dokumenty || []);
                displayTables(details.tables || []);

                document.getElementById('detailModal').style.display = 'block';

            } catch (error) {
                console.error('Błąd ładowania szczegółów firmy:', error);
            }
        }

        // Wyświetl przegląd firmy
        function displayOverview(details) {
            const overviewContent = document.getElementById('overviewContent');

            const firmaInfo = details.firma || {};
            const adresInfo = details.adres || {};

            overviewContent.innerHTML = `
                <div class="table-info">
                    <div class="table-name">Podstawowe informacje</div>
                    <div style="margin-top: 1rem;">
                        <p><strong>Nazwa:</strong> ${firmaInfo.NAZWA || 'Brak'}</p>
                        <p><strong>NIP:</strong> ${firmaInfo.NIP || 'Brak'}</p>
                        <p><strong>REGON:</strong> ${firmaInfo.REGON || 'Brak'}</p>
                        <p><strong>Adres:</strong> ${[adresInfo.ULICA, adresInfo.MIASTO, adresInfo.KOD].filter(Boolean).join(', ') || 'Brak'}</p>
                    </div>
                </div>

                <div class="table-info" style="margin-top: 1rem;">
                    <div class="table-name">Statystyki</div>
                    <div style="margin-top: 1rem;">
                        <p><strong>Liczba kontrahentów:</strong> ${details.kontrahenci ? details.kontrahenci.length : 0}</p>
                        <p><strong>Liczba dokumentów:</strong> ${details.dokumenty ? details.dokumenty.length : 0}</p>
                        <p><strong>Liczba tabel:</strong> ${details.tables ? details.tables.length : 0}</p>
                    </div>
                </div>
            `;
        }

        // Wyświetl kontrahentów
        function displayCustomers(customers) {
            const content = document.getElementById('customersContent');

            if (customers.length === 0) {
                content.innerHTML = '<div class="no-data">Brak kontrahentów</div>';
                return;
            }

            const columns = Object.keys(customers[0]);

            content.innerHTML = `
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${customers.slice(0, 20).map(customer =>
                                `<tr>${columns.map(col => `<td>${customer[col] || ''}</td>`).join('')}</tr>`
                            ).join('')}
                        </tbody>
                    </table>
                </div>
                ${customers.length > 20 ? `<p style="margin-top: 1rem; text-align: center; color: #6c757d;">Pokazano pierwsze 20 z ${customers.length} kontrahentów</p>` : ''}
            `;
        }

        // Wyświetl dokumenty
        function displayDocuments(documents) {
            const content = document.getElementById('documentsContent');

            if (documents.length === 0) {
                content.innerHTML = '<div class="no-data">Brak dokumentów</div>';
                return;
            }

            const columns = Object.keys(documents[0]);

            content.innerHTML = `
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${documents.slice(0, 20).map(doc =>
                                `<tr>${columns.map(col => `<td>${doc[col] || ''}</td>`).join('')}</tr>`
                            ).join('')}
                        </tbody>
                    </table>
                </div>
                ${documents.length > 20 ? `<p style="margin-top: 1rem; text-align: center; color: #6c757d;">Pokazano pierwsze 20 z ${documents.length} dokumentów</p>` : ''}
            `;
        }

        // Wyświetl tabele
        function displayTables(tables) {
            const content = document.getElementById('tablesContent');

            if (tables.length === 0) {
                content.innerHTML = '<div class="no-data">Brak tabel</div>';
                return;
            }

            content.innerHTML = `
                <div style="display: grid; gap: 1rem;">
                    ${tables.map(table => `
                        <div class="table-info" style="cursor: pointer;" onclick="showTableData('${table.name}')">
                            <div class="table-name">${table.name}</div>
                            <div class="table-description">Liczba rekordów: ${table.count}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Pokaż dane tabeli
        async function showTableData(tableName) {
            if (!currentTablePage[tableName]) {
                currentTablePage[tableName] = 1;
            }

            try {
                const response = await fetch(`/api/table/${tableName}?page=${currentTablePage[tableName]}`);
                const result = await response.json();

                displayTableData(tableName, result.data, result.pagination);

            } catch (error) {
                console.error('Błąd ładowania danych tabeli:', error);
            }
        }

        // Wyświetl dane tabeli w modalu
        function displayTableData(tableName, data, pagination) {
            const modalHtml = `
                <div style="background: white; border-radius: 12px; max-height: 80vh; overflow: hidden;">
                    <div style="padding: 1.5rem; background: #f8f9fa; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center;">
                        <h3>${tableName}</h3>
                        <button onclick="this.closest('.detail-modal').style.display='none'" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">✕</button>
                    </div>
                    <div style="padding: 1.5rem; max-height: 60vh; overflow-y: auto;">
                        <div class="data-table">
                            <table>
                                <thead>
                                    <tr>${Object.keys(data[0] || {}).map(col => `<th>${col}</th>`).join('')}</tr>
                                </thead>
                                <tbody>
                                    ${data.map(row =>
                                        `<tr>${Object.keys(row).map(col => `<td title="${row[col] || ''}">${row[col] || ''}</td>`).join('')}</tr>`
                                    ).join('')}
                                </tbody>
                            </table>
                        </div>
                        ${createPagination(tableName, pagination)}
                    </div>
                </div>
            `;

            // Stwórz tymczasowy modal
            const tempModal = document.createElement('div');
            tempModal.className = 'detail-modal';
            tempModal.style.display = 'block';
            tempModal.innerHTML = modalHtml;
            document.body.appendChild(tempModal);
        }

        // Stwórz paginację
        function createPagination(tableName, pagination) {
            if (pagination.total_pages <= 1) return '';

            let html = '<div class="pagination">';

            if (pagination.page > 1) {
                html += `<button onclick="loadTablePage('${tableName}', ${pagination.page - 1})">Poprzednia</button>`;
            }

            const startPage = Math.max(1, pagination.page - 2);
            const endPage = Math.min(pagination.total_pages, pagination.page + 2);

            for (let i = startPage; i <= endPage; i++) {
                const className = i === pagination.page ? 'current' : '';
                html += `<button class="${className}" onclick="loadTablePage('${tableName}', ${i})">${i}</button>`;
            }

            if (pagination.page < pagination.total_pages) {
                html += `<button onclick="loadTablePage('${tableName}', ${pagination.page + 1})">Następna</button>`;
            }

            html += '</div>';
            return html;
        }

        // Załaduj stronę tabeli
        async function loadTablePage(tableName, page) {
            currentTablePage[tableName] = page;
            await showTableData(tableName);
        }

        // Przełącz zakładkę
        function switchTab(tabName) {
            // Ukryj wszystkie zakładki
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // Pokaż wybraną zakładkę
            document.getElementById(tabName + 'Tab').classList.add('active');
            event.target.classList.add('active');
        }

        // Zamknij modal
        function closeModal() {
            document.getElementById('detailModal').style.display = 'none';
            currentCompany = null;
            currentTablePage = {};
        }

        // Wyszukiwanie kontrahentów
        document.getElementById('customerSearch')?.addEventListener('input', async function(e) {
            const searchTerm = e.target.value.toLowerCase();
            if (!currentCompany || searchTerm.length < 2) return;

            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
                const results = await response.json();

                // Filtruj wyniki dla kontrahentów aktualnej firmy
                const customerTable = `${currentCompany}_firma_dbo_SlwKONTRAHENT`;
                const customers = results[customerTable] || [];

                displayCustomers(customers);
            } catch (error) {
                console.error('Błąd wyszukiwania:', error);
            }
        });

        // Wyszukiwanie dokumentów
        document.getElementById('documentSearch')?.addEventListener('input', async function(e) {
            const searchTerm = e.target.value.toLowerCase();
            if (!currentCompany || searchTerm.length < 2) return;

            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
                const results = await response.json();

                // Filtruj wyniki dla dokumentów aktualnej firmy
                const documentTable = `${currentCompany}_Magazyn_dbo_dokTOW`;
                const documents = results[documentTable] || [];

                displayDocuments(documents);
            } catch (error) {
                console.error('Błąd wyszukiwania:', error);
            }
        });

        // Zamknij modal przy kliknięciu poza zawartością
        window.onclick = function(event) {
            if (event.target.classList.contains('detail-modal')) {
                event.target.style.display = 'none';
                currentCompany = null;
                currentTablePage = {};
            }
        }

        // Inicjalizacja
        loadCompanies();
    </script>
</body>
</html>
"""


# === Trasy Flask ===

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)


@app.route('/api/companies')
def api_companies():
    """API endpoint: pobierz listę firm"""
    companies = get_companies()
    return jsonify(companies)


@app.route('/api/company/<db_name>')
def api_company(db_name):
    """API endpoint: pobierz szczegóły firmy"""
    details = get_company_details(db_name)
    return jsonify(details)


@app.route('/api/table/<table_name>')
def api_table(table_name):
    """API endpoint: pobierz dane tabeli"""
    page = int(request.args.get('page', 1))

    result = get_table_data(table_name, page, 50)

    return jsonify({
        'data': result['data'],
        'pagination': {
            'page': result['page'],
            'per_page': result['per_page'],
            'total': result['total'],
            'total_pages': result['total_pages']
        }
    })


@app.route('/api/search')
def api_search():
    """API endpoint: wyszukaj we wszystkich tabelach"""
    query = request.args.get('q', '')
    if len(query) < 2:
        return jsonify({'error': 'Zapytanie musi mieć co najmniej 2 znaki'})

    results = search_all_tables(query, 20)
    return jsonify(results)


# === Uruchomienie ===

if __name__ == '__main__':
    print("🚀 Uruchamianie inteligentnej przeglądarki danych v2...")
    print("🏢 Interfejs firmowy: http://localhost:5000")
    print("🔗 API: http://localhost:5000/api/")
    print("💾 Baza danych: db-api/dane_archiwalne.db")

    try:
        app.run(host='0.0.0.0', port=5000, debug=False)
    except KeyboardInterrupt:
        print("\n👋 Zamykanie serwera...")
    finally:
        api.close_connection()