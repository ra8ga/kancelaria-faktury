#!/usr/bin/env python3
"""
Prosty serwer Flask do przeglądania danych z SQLite
"""
from flask import Flask, render_template_string, jsonify, request
import sqlite3
import json
from datetime import datetime

app = Flask(__name__)
DB_FILE = 'dane_archiwalne.db'


def get_db():
    """Połącz z bazą SQLite"""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def get_all_tables():
    """Pobierz listę wszystkich tabel"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_metadata'
        ORDER BY name
    """)
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()
    return tables


def get_table_schema(table_name):
    """Pobierz schemat tabeli"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info([{table_name}])")
    columns = []
    for row in cursor.fetchall():
        columns.append({
            'name': row[1],
            'type': row[2],
            'not_null': row[3],
            'pk': row[5]
        })
    conn.close()
    return columns


def get_table_data(table_name, page=1, per_page=50, search=None):
    """Pobierz dane z tabeli z paginacją i wyszukiwaniem"""
    conn = get_db()
    cursor = conn.cursor()

    # Pobierz nazwy kolumn
    columns = get_table_schema(table_name)
    col_names = [col['name'] for col in columns]

    # Buduj zapytanie z wyszukiwaniem
    where_clause = ""
    params = []

    if search:
        # Wyszukaj w wszystkich kolumnach tekstowych
        search_conditions = []
        for col in col_names:
            search_conditions.append(f"CAST([{col}] AS TEXT) LIKE ?")
        where_clause = f"WHERE {' OR '.join(search_conditions)}"
        params = [f"%{search}%"] * len(col_names)

    # Liczba wszystkich rekordów
    count_sql = f"SELECT COUNT(*) FROM [{table_name}] {where_clause}"
    cursor.execute(count_sql, params)
    total_count = cursor.fetchone()[0]

    # Pobierz dane z paginacją
    offset = (page - 1) * per_page
    data_sql = f"""
        SELECT * FROM [{table_name}]
        {where_clause}
        LIMIT ? OFFSET ?
    """
    cursor.execute(data_sql, params + [per_page, offset])

    rows = []
    for row in cursor.fetchall():
        rows.append(dict(row))

    conn.close()

    return {
        'columns': col_names,
        'data': rows,
        'total': total_count,
        'page': page,
        'per_page': per_page,
        'total_pages': (total_count + per_page - 1) // per_page
    }


# HTML Template
HTML_TEMPLATE = '''
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Przeglądarka Danych Archiwalnych</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f7;
            color: #1d1d1f;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        header {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 10px;
        }

        .meta-info {
            font-size: 14px;
            color: #666;
        }

        .layout {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 20px;
        }

        .sidebar {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            height: fit-content;
            position: sticky;
            top: 20px;
        }

        .sidebar h2 {
            font-size: 18px;
            margin-bottom: 15px;
            color: #1d1d1f;
        }

        .table-search {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d2d2d7;
            border-radius: 8px;
            font-size: 14px;
            margin-bottom: 15px;
        }

        .table-list {
            max-height: 600px;
            overflow-y: auto;
        }

        .table-item {
            padding: 10px 12px;
            cursor: pointer;
            border-radius: 6px;
            margin-bottom: 4px;
            font-size: 13px;
            transition: background 0.2s;
        }

        .table-item:hover {
            background: #f5f5f7;
        }

        .table-item.active {
            background: #007aff;
            color: white;
        }

        .table-badge {
            display: inline-block;
            background: #e8e8ed;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            margin-left: 8px;
            color: #666;
        }

        .table-item.active .table-badge {
            background: rgba(255,255,255,0.3);
            color: white;
        }

        .content {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .content-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #d2d2d7;
        }

        .content-header h2 {
            font-size: 20px;
            font-weight: 600;
        }

        .search-box {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .search-input {
            padding: 8px 12px;
            border: 1px solid #d2d2d7;
            border-radius: 8px;
            font-size: 14px;
            min-width: 300px;
        }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-primary {
            background: #007aff;
            color: white;
        }

        .btn-primary:hover {
            background: #0051d5;
        }

        .btn-secondary {
            background: #f5f5f7;
            color: #1d1d1f;
        }

        .btn-secondary:hover {
            background: #e8e8ed;
        }

        .table-wrapper {
            overflow-x: auto;
            margin-bottom: 20px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }

        th {
            background: #f5f5f7;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            position: sticky;
            top: 0;
            white-space: nowrap;
        }

        td {
            padding: 10px 12px;
            border-bottom: 1px solid #f5f5f7;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        tr:hover {
            background: #fafafa;
        }

        .pagination {
            display: flex;
            gap: 10px;
            align-items: center;
            justify-content: center;
        }

        .page-info {
            color: #666;
            font-size: 14px;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }

        .empty-state h3 {
            font-size: 18px;
            margin-bottom: 10px;
        }

        @media (max-width: 900px) {
            .layout {
                grid-template-columns: 1fr;
            }

            .sidebar {
                position: static;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 Przeglądarka Danych Archiwalnych</h1>
            <div class="meta-info">
                <span id="totalTables">Ładowanie...</span> •
                <span id="totalRecords">Ładowanie...</span> •
                <span id="exportDate">Ładowanie...</span>
            </div>
        </header>

        <div class="layout">
            <aside class="sidebar">
                <h2>Tabele</h2>
                <input type="text" class="table-search" id="tableSearch" placeholder="Szukaj tabeli...">
                <div class="table-list" id="tableList">
                    <div class="loading">Ładowanie tabel...</div>
                </div>
            </aside>

            <main class="content">
                <div class="empty-state" id="emptyState">
                    <h3>Wybierz tabelę</h3>
                    <p>Kliknij na tabelę z listy po lewej stronie, aby zobaczyć jej zawartość</p>
                </div>

                <div id="tableContent" style="display: none;">
                    <div class="content-header">
                        <h2 id="currentTableName"></h2>
                        <div class="search-box">
                            <input type="text" class="search-input" id="dataSearch" placeholder="Szukaj w danych...">
                            <button class="btn btn-primary" onclick="searchData()">Szukaj</button>
                            <button class="btn btn-secondary" onclick="clearSearch()">Wyczyść</button>
                        </div>
                    </div>

                    <div class="table-wrapper">
                        <table id="dataTable">
                            <thead id="tableHead"></thead>
                            <tbody id="tableBody"></tbody>
                        </table>
                    </div>

                    <div class="pagination">
                        <button class="btn btn-secondary" onclick="prevPage()" id="prevBtn">« Poprzednia</button>
                        <span class="page-info" id="pageInfo"></span>
                        <button class="btn btn-secondary" onclick="nextPage()" id="nextBtn">Następna »</button>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <script>
        let currentTable = null;
        let currentPage = 1;
        let currentSearch = '';
        let allTables = [];

        // Ładuj metadane
        async function loadMetadata() {
            const resp = await fetch('/api/metadata');
            const data = await resp.json();
            document.getElementById('totalTables').textContent = `${data.total_tables} tabel`;
            document.getElementById('totalRecords').textContent = `${data.total_rows} rekordów`;
            document.getElementById('exportDate').textContent = `Eksport: ${data.export_date}`;
        }

        // Ładuj listę tabel
        async function loadTables() {
            const resp = await fetch('/api/tables');
            allTables = await resp.json();
            renderTables(allTables);
        }

        // Renderuj listę tabel
        function renderTables(tables) {
            const list = document.getElementById('tableList');
            list.innerHTML = tables.map(table => `
                <div class="table-item" onclick="selectTable('${table.name}')">
                    ${formatTableName(table.name)}
                    <span class="table-badge">${table.row_count}</span>
                </div>
            `).join('');
        }

        // Formatuj nazwę tabeli
        function formatTableName(name) {
            // Usuń prefix bazy danych dla czytelności
            const parts = name.split('_dbo_');
            if (parts.length === 2) {
                return `<strong>${parts[0]}</strong><br><small style="color:#666">${parts[1]}</small>`;
            }
            return name;
        }

        // Wyszukiwanie w liście tabel
        document.getElementById('tableSearch').addEventListener('input', (e) => {
            const search = e.target.value.toLowerCase();
            const filtered = allTables.filter(t =>
                t.name.toLowerCase().includes(search)
            );
            renderTables(filtered);
        });

        // Wybierz tabelę
        async function selectTable(tableName) {
            currentTable = tableName;
            currentPage = 1;
            currentSearch = '';
            document.getElementById('dataSearch').value = '';

            // Zaktualizuj UI
            document.querySelectorAll('.table-item').forEach(el => {
                el.classList.remove('active');
            });
            event.target.closest('.table-item').classList.add('active');

            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('tableContent').style.display = 'block';
            document.getElementById('currentTableName').textContent = tableName;

            await loadTableData();
        }

        // Ładuj dane tabeli
        async function loadTableData() {
            const resp = await fetch(`/api/table/${currentTable}?page=${currentPage}&search=${encodeURIComponent(currentSearch)}`);
            const data = await resp.json();

            // Renderuj nagłówki
            const thead = document.getElementById('tableHead');
            thead.innerHTML = `<tr>${data.columns.map(col => `<th>${col}</th>`).join('')}</tr>`;

            // Renderuj dane
            const tbody = document.getElementById('tableBody');
            if (data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="100" style="text-align:center;padding:40px;color:#666">Brak danych</td></tr>';
            } else {
                tbody.innerHTML = data.data.map(row => `
                    <tr>${data.columns.map(col => `<td title="${escapeHtml(String(row[col] || ''))}">${escapeHtml(String(row[col] || ''))}</td>`).join('')}</tr>
                `).join('');
            }

            // Zaktualizuj paginację
            document.getElementById('pageInfo').textContent = `Strona ${data.page} z ${data.total_pages} (${data.total} rekordów)`;
            document.getElementById('prevBtn').disabled = data.page === 1;
            document.getElementById('nextBtn').disabled = data.page === data.total_pages;
        }

        // Wyszukiwanie w danych
        function searchData() {
            currentSearch = document.getElementById('dataSearch').value;
            currentPage = 1;
            loadTableData();
        }

        function clearSearch() {
            currentSearch = '';
            document.getElementById('dataSearch').value = '';
            currentPage = 1;
            loadTableData();
        }

        // Paginacja
        function prevPage() {
            if (currentPage > 1) {
                currentPage--;
                loadTableData();
            }
        }

        function nextPage() {
            currentPage++;
            loadTableData();
        }

        // Helper: escape HTML
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Obsługa Enter w wyszukiwaniu
        document.getElementById('dataSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchData();
        });

        // Inicjalizacja
        loadMetadata();
        loadTables();
    </script>
</body>
</html>
'''


@app.route('/')
def index():
    """Główna strona"""
    return render_template_string(HTML_TEMPLATE)


@app.route('/api/metadata')
def api_metadata():
    """Endpoint: metadane"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM _metadata")
    metadata = {row[0]: row[1] for row in cursor.fetchall()}
    conn.close()

    # Formatuj datę
    if 'export_date' in metadata:
        dt = datetime.fromisoformat(metadata['export_date'])
        metadata['export_date'] = dt.strftime('%Y-%m-%d %H:%M')

    return jsonify(metadata)


@app.route('/api/tables')
def api_tables():
    """Endpoint: lista tabel"""
    tables = get_all_tables()
    conn = get_db()
    cursor = conn.cursor()

    result = []
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM [{table}]")
        count = cursor.fetchone()[0]
        result.append({'name': table, 'row_count': count})

    conn.close()
    return jsonify(result)


@app.route('/api/table/<table_name>')
def api_table_data(table_name):
    """Endpoint: dane tabeli"""
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')

    data = get_table_data(table_name, page=page, search=search if search else None)
    return jsonify(data)


if __name__ == '__main__':
    print("="*60)
    print("PRZEGLĄDARKA DANYCH ARCHIWALNYCH")
    print("="*60)
    print("\nSerwer uruchamia się na: http://localhost:5000")
    print("\nOtwórz przeglądarkę i przejdź do tego adresu.")
    print("Naciśnij Ctrl+C aby zatrzymać serwer.\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
