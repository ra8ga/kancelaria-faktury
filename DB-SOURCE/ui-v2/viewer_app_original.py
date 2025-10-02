#!/usr/bin/env python3
"""
Inteligentna przeglądarka danych - widok logiczny po firmach
"""
from flask import Flask, render_template_string, jsonify, request
import sqlite3
from datetime import datetime

app = Flask(__name__)
DB_FILE = 'dane_archiwalne.db'


def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def get_companies():
    """Pobierz listę firm z ich podstawowymi danymi"""
    conn = get_db()
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
            cursor.execute(f"SELECT COUNT(*) FROM [{kontrahent_table}]")
            kontrahenci_count = cursor.fetchone()[0]

            # Policz dokumenty
            try:
                dok_table = f"{db_name}_Magazyn_dbo_dokTOW"
                cursor.execute(f"SELECT COUNT(*) FROM [{dok_table}]")
                dokumenty_count = cursor.fetchone()[0]
            except:
                dokumenty_count = 0

            companies.append({
                'id': db_name,
                'nazwa': firma[0],
                'nip': firma[1],
                'regon': firma[2],
                'miasto': miasto,
                'ulica': ulica,
                'kod': kod,
                'kontrahenci': kontrahenci_count,
                'dokumenty': dokumenty_count
            })

    conn.close()
    return companies


def get_company_contractors(company_id):
    """Pobierz kontrahentów danej firmy"""
    conn = get_db()
    cursor = conn.cursor()

    table = f"{company_id}_firma_dbo_SlwKONTRAHENT"
    cursor.execute(f"""
        SELECT ID, SYMBOL, NAZWA, NIP, MIASTO, ULICA, TELEFON, EMAIL
        FROM [{table}]
        ORDER BY NAZWA
    """)

    contractors = []
    for row in cursor.fetchall():
        contractors.append({
            'id': row[0],
            'symbol': row[1],
            'nazwa': row[2],
            'nip': row[3],
            'miasto': row[4],
            'ulica': row[5],
            'telefon': row[6],
            'email': row[7]
        })

    conn.close()
    return contractors


def get_company_documents(company_id, limit=50, search=None):
    """Pobierz dokumenty danej firmy"""
    conn = get_db()
    cursor = conn.cursor()

    table = f"{company_id}_Magazyn_dbo_dokTOW"

    where = ""
    params = []
    if search:
        where = "WHERE KONTRAHENT LIKE ? OR NR_ROZ LIKE ?"
        params = [f"%{search}%", f"%{search}%"]

    query = f"""
        SELECT ID, NR, NR_ROZ, DATA_WYSTAWIENIA, DATA_SPRZEDAZY,
               KONTRAHENT, NETTO, BRUTTO, UWAGI
        FROM [{table}]
        {where}
        ORDER BY DATA_WYSTAWIENIA DESC
        LIMIT ?
    """

    cursor.execute(query, params + [limit])

    documents = []
    for row in cursor.fetchall():
        documents.append({
            'id': row[0],
            'nr': row[1],
            'nr_roz': row[2],
            'data_wyst': row[3],
            'data_sprz': row[4],
            'kontrahent': row[5],
            'netto': float(row[6]) if row[6] else 0,
            'brutto': float(row[7]) if row[7] else 0,
            'uwagi': row[8]
        })

    conn.close()
    return documents


# HTML Template
HTML_TEMPLATE = '''
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Archiwum Firm - Przeglądarka</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        header {
            background: white;
            padding: 30px;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 30px;
            text-align: center;
        }

        h1 {
            font-size: 32px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 10px;
        }

        .subtitle {
            color: #666;
            font-size: 16px;
        }

        .view-selector {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin: 20px 0;
        }

        .view-btn {
            padding: 12px 24px;
            border: 2px solid #667eea;
            background: white;
            color: #667eea;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s;
        }

        .view-btn.active {
            background: #667eea;
            color: white;
        }

        .view-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102,126,234,0.3);
        }

        .companies-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .company-card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            cursor: pointer;
            transition: all 0.3s;
        }

        .company-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }

        .company-name {
            font-size: 20px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 12px;
        }

        .company-info {
            font-size: 14px;
            color: #666;
            margin-bottom: 6px;
        }

        .company-stats {
            display: flex;
            gap: 15px;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #eee;
        }

        .stat {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            color: #667eea;
            font-weight: 600;
        }

        .detail-view {
            display: none;
            background: white;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .detail-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
        }

        .back-btn {
            padding: 10px 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
        }

        .back-btn:hover {
            background: #5568d3;
        }

        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }

        .tab {
            padding: 12px 24px;
            background: #f5f5f5;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            color: #666;
            transition: all 0.3s;
        }

        .tab.active {
            background: #667eea;
            color: white;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }

        th {
            background: #f8f9fa;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #e9ecef;
        }

        td {
            padding: 12px;
            border-bottom: 1px solid #f0f0f0;
        }

        tr:hover {
            background: #f8f9ff;
        }

        .search-box {
            margin-bottom: 20px;
        }

        .search-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 15px;
        }

        .search-input:focus {
            outline: none;
            border-color: #667eea;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #999;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #667eea;
        }

        .amount {
            font-weight: 600;
            color: #28a745;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 Archiwum Firm</h1>
            <p class="subtitle">System zarządzania danymi archiwalnymi</p>
        </header>

        <!-- Lista firm -->
        <div id="companiesView">
            <div class="view-selector">
                <button class="view-btn active">Wszystkie firmy</button>
            </div>
            <div class="companies-grid" id="companiesGrid">
                <div class="loading">Ładowanie firm...</div>
            </div>
        </div>

        <!-- Szczegóły firmy -->
        <div id="detailView" class="detail-view">
            <div class="detail-header">
                <div>
                    <h2 id="companyDetailName"></h2>
                    <p id="companyDetailInfo" style="color: #666; margin-top: 8px;"></p>
                </div>
                <button class="back-btn" onclick="showCompanies()">← Powrót</button>
            </div>

            <div class="tabs">
                <button class="tab active" onclick="showTab('contractors')">👥 Kontrahenci</button>
                <button class="tab" onclick="showTab('documents')">📄 Dokumenty</button>
            </div>

            <!-- Kontrahenci -->
            <div id="contractorsTab" class="tab-content active">
                <div class="search-box">
                    <input type="text" class="search-input" id="contractorSearch"
                           placeholder="Szukaj kontrahenta...">
                </div>
                <div style="overflow-x: auto;">
                    <table id="contractorsTable">
                        <thead>
                            <tr>
                                <th>Symbol</th>
                                <th>Nazwa</th>
                                <th>NIP</th>
                                <th>Miasto</th>
                                <th>Kontakt</th>
                            </tr>
                        </thead>
                        <tbody id="contractorsBody"></tbody>
                    </table>
                </div>
            </div>

            <!-- Dokumenty -->
            <div id="documentsTab" class="tab-content">
                <div class="search-box">
                    <input type="text" class="search-input" id="documentSearch"
                           placeholder="Szukaj dokumentu...">
                </div>
                <div style="overflow-x: auto;">
                    <table id="documentsTable">
                        <thead>
                            <tr>
                                <th>Nr</th>
                                <th>Data wystawienia</th>
                                <th>Kontrahent</th>
                                <th>Netto</th>
                                <th>Brutto</th>
                            </tr>
                        </thead>
                        <tbody id="documentsBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentCompany = null;
        let allContractors = [];
        let allDocuments = [];

        // Załaduj firmy
        async function loadCompanies() {
            const resp = await fetch('/api/companies');
            const companies = await resp.json();

            const grid = document.getElementById('companiesGrid');
            grid.innerHTML = companies.map(c => `
                <div class="company-card" onclick="showCompanyDetail('${c.id}')">
                    <div class="company-name">${c.nazwa}</div>
                    <div class="company-info">📍 ${c.miasto || 'Brak lokalizacji'}</div>
                    <div class="company-info">🏢 NIP: ${c.nip || 'Brak'}</div>
                    <div class="company-stats">
                        <div class="stat">
                            <span>👥</span>
                            <span>${c.kontrahenci} kontrahentów</span>
                        </div>
                        <div class="stat">
                            <span>📄</span>
                            <span>${c.dokumenty} dokumentów</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Pokaż szczegóły firmy
        async function showCompanyDetail(companyId) {
            currentCompany = companyId;

            // Załaduj dane firmy
            const [companies, contractors, documents] = await Promise.all([
                fetch('/api/companies').then(r => r.json()),
                fetch(`/api/company/${companyId}/contractors`).then(r => r.json()),
                fetch(`/api/company/${companyId}/documents`).then(r => r.json())
            ]);

            const company = companies.find(c => c.id === companyId);
            allContractors = contractors;
            allDocuments = documents;

            // Zaktualizuj UI
            document.getElementById('companyDetailName').textContent = company.nazwa;
            document.getElementById('companyDetailInfo').textContent =
                `${company.miasto || ''} | NIP: ${company.nip || 'Brak'} | REGON: ${company.regon || 'Brak'}`;

            renderContractors(contractors);
            renderDocuments(documents);

            document.getElementById('companiesView').style.display = 'none';
            document.getElementById('detailView').style.display = 'block';
        }

        // Renderuj kontrahentów
        function renderContractors(contractors) {
            const tbody = document.getElementById('contractorsBody');
            tbody.innerHTML = contractors.map(c => `
                <tr>
                    <td><strong>${c.symbol || '-'}</strong></td>
                    <td>${c.nazwa}</td>
                    <td>${c.nip || '-'}</td>
                    <td>${c.miasto || '-'}</td>
                    <td>
                        ${c.telefon ? '📞 ' + c.telefon : ''}
                        ${c.email ? '<br>📧 ' + c.email : ''}
                    </td>
                </tr>
            `).join('');
        }

        // Renderuj dokumenty
        function renderDocuments(documents) {
            const tbody = document.getElementById('documentsBody');
            tbody.innerHTML = documents.map(d => `
                <tr>
                    <td><strong>${d.nr_roz || d.nr}</strong></td>
                    <td>${d.data_wyst ? new Date(d.data_wyst).toLocaleDateString('pl-PL') : '-'}</td>
                    <td>${d.kontrahent || '-'}</td>
                    <td class="amount">${d.netto.toFixed(2)} zł</td>
                    <td class="amount">${d.brutto.toFixed(2)} zł</td>
                </tr>
            `).join('');
        }

        // Wyszukiwanie kontrahentów
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('contractorSearch').addEventListener('input', (e) => {
                const search = e.target.value.toLowerCase();
                const filtered = allContractors.filter(c =>
                    c.nazwa.toLowerCase().includes(search) ||
                    (c.nip && c.nip.includes(search)) ||
                    (c.miasto && c.miasto.toLowerCase().includes(search))
                );
                renderContractors(filtered);
            });

            document.getElementById('documentSearch').addEventListener('input', (e) => {
                const search = e.target.value.toLowerCase();
                const filtered = allDocuments.filter(d =>
                    (d.nr_roz && d.nr_roz.toLowerCase().includes(search)) ||
                    (d.kontrahent && d.kontrahent.toLowerCase().includes(search))
                );
                renderDocuments(filtered);
            });
        });

        // Pokaż widok firm
        function showCompanies() {
            document.getElementById('companiesView').style.display = 'block';
            document.getElementById('detailView').style.display = 'none';
        }

        // Przełączanie zakładek
        function showTab(tabName) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

            event.target.classList.add('active');
            document.getElementById(tabName + 'Tab').classList.add('active');
        }

        // Inicjalizacja
        loadCompanies();
    </script>
</body>
</html>
'''


@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)


@app.route('/api/companies')
def api_companies():
    return jsonify(get_companies())


@app.route('/api/company/<company_id>/contractors')
def api_contractors(company_id):
    return jsonify(get_company_contractors(company_id))


@app.route('/api/company/<company_id>/documents')
def api_documents(company_id):
    search = request.args.get('search', '')
    return jsonify(get_company_documents(company_id, search=search if search else None))


if __name__ == '__main__':
    print("="*60)
    print("🏢 ARCHIWUM FIRM - Logiczna Przeglądarka")
    print("="*60)
    print("\n✨ Nowy interfejs z logiczną strukturą:")
    print("   • Widok per firma")
    print("   • Kontrahenci + Dokumenty w zakładkach")
    print("   • Wyszukiwanie w danych")
    print("\nSerwer: http://localhost:5002")
    print("\nNaciśnij Ctrl+C aby zatrzymać.\n")
    app.run(debug=True, host='0.0.0.0', port=5002)
