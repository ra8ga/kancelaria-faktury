#!/usr/bin/env python3
"""
Prosty serwer Flask do przeglądania danych z SQLite (wersja używająca db-api)
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'db-api'))

from flask import Flask, render_template_string, jsonify, request
import json
from datetime import datetime
from database_api import create_database_api

app = Flask(__name__)
api = create_database_api('../db-api/dane_archiwalne.db')


# === Funkje pomocnicze używające db-api ===

def get_all_tables():
    """Pobierz listę wszystkich tabel"""
    return api.get_all_tables()


def get_table_schema(table_name):
    """Pobierz schemat tabeli"""
    info = api.get_table_info(table_name)
    return [{'name': col['name'], 'type': col['type'], 'not_null': col['not_null'], 'pk': col['default']} for col in info['columns']]


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


# === Szablony HTML ===

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Archiwum Danych - v1</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; }
        .header { background: #2c3e50; color: white; padding: 1rem; }
        .header h1 { font-size: 1.5rem; }
        .container { display: flex; max-width: 1600px; margin: 0 auto; }
        .sidebar { width: 350px; background: white; border-right: 1px solid #ddd; height: calc(100vh - 60px); overflow-y: auto; }
        .content { flex: 1; padding: 1rem; overflow-y: auto; height: calc(100vh - 60px); }
        .table-list { list-style: none; }
        .table-item { padding: 0.75rem 1rem; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s; }
        .table-item:hover { background: #f8f9fa; }
        .table-item.active { background: #e3f2fd; border-left: 3px solid #2196f3; }
        .table-name { font-weight: 500; font-size: 0.9rem; }
        .table-count { font-size: 0.8rem; color: #666; }
        .search-box { padding: 1rem; border-bottom: 1px solid #ddd; }
        .search-input { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
        .table-info { background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
        .table-grid { background: white; border-radius: 8px; overflow: hidden; }
        .table-grid table { width: 100%; border-collapse: collapse; }
        .table-grid th { background: #f8f9fa; padding: 0.75rem; text-align: left; font-weight: 600; border-bottom: 2px solid #dee2e6; }
        .table-grid td { padding: 0.75rem; border-bottom: 1px solid #dee2e6; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
        .table-grid tr:hover { background: #f8f9fa; }
        .pagination { display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1rem; }
        .pagination button { padding: 0.5rem 0.75rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px; }
        .pagination button:hover { background: #f8f9fa; }
        .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
        .pagination .current { background: #2196f3; color: white; border-color: #2196f3; }
        .loading { text-align: center; padding: 2rem; color: #666; }
        .no-data { text-align: center; padding: 2rem; color: #666; }
        .stats { display: flex; gap: 1rem; margin-top: 0.5rem; }
        .stat { font-size: 0.8rem; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Archiwum Danych - v1 (Surowe Dane)</h1>
    </div>

    <div class="container">
        <div class="sidebar">
            <div class="search-box">
                <input type="text" class="search-input" placeholder="Szukaj tabel..." id="tableSearch">
            </div>
            <ul class="table-list" id="tableList">
                <!-- Tabele zostaną załadowane przez JavaScript -->
            </ul>
        </div>

        <div class="content">
            <div id="content">
                <div class="loading">
                    <h2>Witaj w Archiwum Danych v1</h2>
                    <p>Wybierz tabelę z listy po lewej stronie, aby przeglądać dane.</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentTable = null;
        let currentPage = 1;
        let currentSearch = '';

        // Załaduj listę tabel
        async function loadTables() {
            try {
                const response = await fetch('/api/tables');
                const tables = await response.json();
                displayTables(tables);
            } catch (error) {
                console.error('Błąd ładowania tabel:', error);
            }
        }

        // Wyświetl listę tabel
        function displayTables(tables) {
            const tableList = document.getElementById('tableList');
            const searchTerm = document.getElementById('tableSearch').value.toLowerCase();

            const filteredTables = tables.filter(table =>
                table.name.toLowerCase().includes(searchTerm)
            );

            tableList.innerHTML = filteredTables.map(table => `
                <li class="table-item ${table.name === currentTable ? 'active' : ''}"
                    onclick="loadTable('${table.name}')">
                    <div class="table-name">${table.name}</div>
                    <div class="stats">
                        <span class="stat">${table.record_count} rekordów</span>
                    </div>
                </li>
            `).join('');
        }

        // Załaduj dane tabeli
        async function loadTable(tableName, page = 1, search = '') {
            currentTable = tableName;
            currentPage = page;
            currentSearch = search;

            try {
                const response = await fetch(`/api/table/${tableName}?page=${page}&search=${encodeURIComponent(search)}`);
                const result = await response.json();

                displayTableInfo(tableName, result.schema);
                displayTableData(result.data, result.pagination);

                // Zaktualizuj aktywną tabelę
                document.querySelectorAll('.table-item').forEach(item => {
                    item.classList.remove('active');
                });
                event?.target?.closest('.table-item')?.classList.add('active');

            } catch (error) {
                console.error('Błąd ładowania danych:', error);
                document.getElementById('content').innerHTML = '<div class="loading">Błąd ładowania danych</div>';
            }
        }

        // Wyświetl informacje o tabeli
        function displayTableInfo(tableName, schema) {
            const schemaHtml = schema.map(col =>
                `<span style="margin-right: 1rem; font-size: 0.8rem;">
                    <strong>${col.name}</strong> (${col.type})
                </span>`
            ).join('');

            return `
                <div class="table-info">
                    <h3>${tableName}</h3>
                    <div style="margin-top: 0.5rem; flex-wrap: wrap;">${schemaHtml}</div>
                </div>
            `;
        }

        // Wyświetl dane tabeli
        function displayTableData(data, pagination) {
            if (data.length === 0) {
                return '<div class="no-data">Brak danych w tabeli</div>';
            }

            const columns = Object.keys(data[0]);

            const tableHtml = `
                <div class="table-grid">
                    <table>
                        <thead>
                            <tr>
                                ${columns.map(col => `<th>${col}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(row => `
                                <tr>
                                    ${columns.map(col => `<td title="${row[col] || ''}">${row[col] || ''}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            const paginationHtml = createPagination(pagination);

            document.getElementById('content').innerHTML =
                displayTableInfo(currentTable, []) + tableHtml + paginationHtml;
        }

        // Stwórz paginację
        function createPagination(pagination) {
            if (pagination.total_pages <= 1) return '';

            let html = '<div class="pagination">';

            // Poprzednia strona
            if (pagination.page > 1) {
                html += `<button onclick="loadTable('${currentTable}', ${pagination.page - 1}, '${currentSearch}')">Poprzednia</button>`;
            }

            // Numery stron
            const startPage = Math.max(1, pagination.page - 2);
            const endPage = Math.min(pagination.total_pages, pagination.page + 2);

            for (let i = startPage; i <= endPage; i++) {
                const className = i === pagination.page ? 'current' : '';
                html += `<button class="${className}" onclick="loadTable('${currentTable}', ${i}, '${currentSearch}')">${i}</button>`;
            }

            // Następna strona
            if (pagination.page < pagination.total_pages) {
                html += `<button onclick="loadTable('${currentTable}', ${pagination.page + 1}, '${currentSearch}')">Następna</button>`;
            }

            html += `</div>`;
            return html;
        }

        // Wyszukiwanie tabel
        document.getElementById('tableSearch').addEventListener('input', loadTables);

        // Inicjalizacja
        loadTables();
    </script>
</body>
</html>
"""


# === Trasy Flask ===

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)


@app.route('/api/tables')
def api_tables():
    """API endpoint: pobierz listę tabel z informacjami o liczbie rekordów"""
    tables = api.get_all_tables()
    table_info = []

    for table_name in tables:
        info = api.get_table_info(table_name)
        table_info.append({
            'name': table_name,
            'record_count': info['row_count']
        })

    return jsonify(table_info)


@app.route('/api/table/<table_name>')
def api_table(table_name):
    """API endpoint: pobierz dane tabeli"""
    page = int(request.args.get('page', 1))
    search = request.args.get('search', '')

    # Pobierz informacje o tabeli
    info = api.get_table_info(table_name)
    schema = [{'name': col['name'], 'type': col['type']} for col in info['columns']]

    # Pobierz dane
    result = get_table_data(table_name, page, 50, search)

    return jsonify({
        'schema': schema,
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

    results = api.search_all_tables(query, limit_per_table=10)
    return jsonify(results)


# === Uruchomienie ===

if __name__ == '__main__':
    print("🚀 Uruchamianie serwera Archiwum Danych v1...")
    print("📊 Interfejs: http://localhost:5001")
    print("🔗 API: http://localhost:5001/api/")
    print("💾 Baza danych: db-api/dane_archiwalne.db")

    try:
        app.run(host='0.0.0.0', port=5001, debug=False)
    except KeyboardInterrupt:
        print("\n👋 Zamykanie serwera...")
    finally:
        api.close_connection()