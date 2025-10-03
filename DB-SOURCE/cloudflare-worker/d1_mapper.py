#!/usr/bin/env python3
"""
Cloudflare D1 Schema Mapper for Archiwum API
Analyzes D1 database and generates comprehensive endpoints
"""
import subprocess
import json
import re
from collections import defaultdict

class D1SchemaMapper:
    def __init__(self):
        self.account_id = "f69d84520904e4266f75a0f0827c1144"
        self.db_name = "archiwum-danych"
        self.companies = []
        self.table_groups = defaultdict(list)
        self.schema = {}

    def run_d1_query(self, query):
        """Execute D1 query via wrangler"""
        try:
            import os
            env = os.environ.copy()
            env['CLOUDFLARE_ACCOUNT_ID'] = self.account_id

            cmd = [
                'wrangler', 'd1', 'execute', self.db_name,
                '--remote', '--command', query
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, cwd='.', env=env)
            if result.returncode != 0:
                print(f"Error executing query: {query}")
                print(f"Error: {result.stderr}")
                return None

            # Parse JSON output
            lines = result.stdout.strip().split('\n')
            for line in lines:
                if line.startswith('[') or line.startswith('{'):
                    return json.loads(line)

            return None
        except Exception as e:
            print(f"Exception running query: {e}")
            return None

    def analyze_companies(self):
        """Analyze companies in database"""
        print("🔍 Analyzing companies...")

        # Get company tables
        query = "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_firma_dbo_FIRMA' ORDER BY name"
        result = self.run_d1_query(query)

        if not result:
            print("❌ Failed to get company tables")
            return

        company_tables = [row['name'] for row in result['results']]
        print(f"📋 Found {len(company_tables)} company tables")

        for table in company_tables:
            company_name = table.replace('_firma_dbo_FIRMA', '')

            # Get company info
            company_query = f"SELECT NAZWA, NIP, REGON FROM \"{table}\" LIMIT 1"
            company_result = self.run_d1_query(company_query)

            if company_result and company_result['results']:
                company_data = company_result['results'][0]
                self.companies.append({
                    'db_name': company_name,
                    'nazwa': company_data.get('NAZWA', company_name),
                    'nip': company_data.get('NIP'),
                    'regon': company_data.get('REGON')
                })
                print(f"  ✅ {company_data.get('NAZWA', company_name)}")

    def analyze_tables(self):
        """Analyze all tables in database"""
        print("📊 Analyzing all tables...")

        query = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_%' ORDER BY name"
        result = self.run_d1_query(query)

        if not result:
            print("❌ Failed to get tables")
            return

        all_tables = [row['name'] for row in result['results']]
        print(f"📋 Found {len(all_tables)} total tables")

        # Group tables by company
        for table in all_tables:
            if '_firma_' in table:
                parts = table.split('_firma_')
                company = parts[0]
                table_type = parts[1]
                category = 'firma'
            elif '_Magazyn_' in table:
                parts = table.split('_Magazyn_')
                company = parts[0]
                table_type = parts[1]
                category = 'magazyn'
            else:
                continue

            self.table_groups[company].append({
                'name': table,
                'type': table_type,
                'category': category
            })

        print(f"🏢 Grouped tables for {len(self.table_groups)} companies")

    def get_table_structure(self, table_name):
        """Get table structure"""
        query = f"PRAGMA table_info(\"{table_name}\")"
        result = self.run_d1_query(query)

        if not result:
            return []

        columns = []
        for row in result['results']:
            columns.append({
                'name': row['name'],
                'type': row['type'],
                'notnull': bool(row['notnull']),
                'default': row['dflt_value'],
                'pk': bool(row['pk'])
            })

        return columns

    def get_record_count(self, table_name):
        """Get record count for table"""
        query = f"SELECT COUNT(*) as count FROM \"{table_name}\""
        result = self.run_d1_query(query)

        if not result or not result['results']:
            return 0

        return result['results'][0]['count']

    def get_sample_data(self, table_name, limit=2):
        """Get sample data from table"""
        query = f"SELECT * FROM \"{table_name}\" LIMIT {limit}"
        result = self.run_d1_query(query)

        if not result or not result['results']:
            return []

        return result['results']

    def analyze_detailed_structure(self):
        """Analyze detailed structure of key tables"""
        print("🔍 Analyzing detailed table structure...")

        for company, tables in self.table_groups.items():
            if company not in self.schema:
                self.schema[company] = {}

            print(f"  📁 {company}:")

            for table_info in tables[:10]:  # Limit to first 10 tables per company
                table_name = table_info['name']
                table_type = table_info['type']

                structure = self.get_table_structure(table_name)
                record_count = self.get_record_count(table_name)
                sample_data = self.get_sample_data(table_name)

                self.schema[company][table_type] = {
                    'full_name': table_name,
                    'structure': structure,
                    'record_count': record_count,
                    'sample_data': sample_data,
                    'category': table_info['category']
                }

                if record_count > 0:
                    print(f"    ✅ {table_type}: {record_count} records")

    def generate_comprehensive_endpoints(self):
        """Generate comprehensive API endpoints"""
        print("🚀 Generating comprehensive API endpoints...")

        endpoints = {
            'core': [
                {'path': '/health', 'method': 'GET', 'description': 'Health check'},
                {'path': '/api/companies', 'method': 'GET', 'description': 'Get all companies'},
                {'path': '/api/companies/{company_id}', 'method': 'GET', 'description': 'Get company details'},
                {'path': '/api/companies/{company_id}/summary', 'method': 'GET', 'description': 'Get company summary'},
                {'path': '/api/database/stats', 'method': 'GET', 'description': 'Get database statistics'}
            ],
            'documents': [],
            'contractors': [],
            'products': [],
            'financial': [],
            'warehouses': [],
            'payments': [],
            'analytics': [],
            'search': []
        }

        # Generate endpoints for each company
        for company in self.table_groups.keys():
            base = f'/api/companies/{company}'

            # Documents endpoints
            endpoints['documents'].extend([
                {'path': f'{base}/documents', 'method': 'GET', 'description': f'Get all documents for {company}'},
                {'path': f'{base}/documents/vat', 'method': 'GET', 'description': f'Get VAT documents for {company}'},
                {'path': f'{base}/documents/tow', 'method': 'GET', 'description': f'Get TOW documents for {company}'},
                {'path': f'{base}/documents/notes', 'method': 'GET', 'description': f'Get document notes for {company}'},
                {'path': f'{base}/documents/search', 'method': 'GET', 'description': f'Search documents for {company}'},
                {'path': f'{base}/documents/{{document_id}}', 'method': 'GET', 'description': f'Get specific document for {company}'},
                {'path': f'{base}/documents/{{document_id}}/items', 'method': 'GET', 'description': f'Get document items for {company}'}
            ])

            # Contractors endpoints
            endpoints['contractors'].extend([
                {'path': f'{base}/contractors', 'method': 'GET', 'description': f'Get all contractors for {company}'},
                {'path': f'{base}/contractors/search', 'method': 'GET', 'description': f'Search contractors for {company}'},
                {'path': f'{base}/contractors/{{contractor_id}}', 'method': 'GET', 'description': f'Get specific contractor for {company}'},
                {'path': f'{base}/contractors/geography', 'method': 'GET', 'description': f'Get contractor geography for {company}'},
                {'path': f'{base}/contractors/groups', 'method': 'GET', 'description': f'Get contractor groups for {company}'}
            ])

            # Products endpoints
            endpoints['products'].extend([
                {'path': f'{base}/products', 'method': 'GET', 'description': f'Get all products for {company}'},
                {'path': f'{base}/products/search', 'method': 'GET', 'description': f'Search products for {company}'},
                {'path': f'{base}/products/{{product_id}}', 'method': 'GET', 'description': f'Get specific product for {company}'},
                {'path': f'{base}/products/categories', 'method': 'GET', 'description': f'Get product categories for {company}'},
                {'path': f'{base}/products/warehouses', 'method': 'GET', 'description': f'Get product warehouses for {company}'},
                {'path': f'{base}/products/{{product_id}}/prices', 'method': 'GET', 'description': f'Get product prices for {company}'}
            ])

            # Financial endpoints
            endpoints['financial'].extend([
                {'path': f'{base}/financial/summary', 'method': 'GET', 'description': f'Get financial summary for {company}'},
                {'path': f'{base}/financial/payments', 'method': 'GET', 'description': f'Get payments for {company}'},
                {'path': f'{base}/financial/payments/unpaid', 'method': 'GET', 'description': f'Get unpaid payments for {company}'},
                {'path': f'{base}/financial/vat/rates', 'method': 'GET', 'description': f'Get VAT rates for {company}'},
                {'path': f'{base}/financial/vat/analysis', 'method': 'GET', 'description': f'Get VAT analysis for {company}'},
                {'path': f'{base}/financial/trends', 'method': 'GET', 'description': f'Get financial trends for {company}'}
            ])

            # Warehouses endpoints
            endpoints['warehouses'].extend([
                {'path': f'{base}/warehouses', 'method': 'GET', 'description': f'Get warehouses for {company}'},
                {'path': f'{base}/warehouses/movements', 'method': 'GET', 'description': f'Get warehouse movements for {company}'},
                {'path': f'{base}/warehouses/inventory', 'method': 'GET', 'description': f'Get warehouse inventory for {company}'},
                {'path': f'{base}/warehouses/{{warehouse_id}}', 'method': 'GET', 'description': f'Get specific warehouse for {company}'}
            ])

            # Payments endpoints
            endpoints['payments'].extend([
                {'path': f'{base}/payments', 'method': 'GET', 'description': f'Get payments for {company}'},
                {'path': f'{base}/payments/history', 'method': 'GET', 'description': f'Get payment history for {company}'},
                {'path': f'{base}/payment-methods', 'method': 'GET', 'description': f'Get payment methods for {company}'},
                {'path': f'{base}/payments/{{payment_id}}', 'method': 'GET', 'description': f'Get specific payment for {company}'}
            ])

            # Analytics endpoints
            endpoints['analytics'].extend([
                {'path': f'{base}/analytics/overview', 'method': 'GET', 'description': f'Get analytics overview for {company}'},
                {'path': f'{base}/analytics/documents/trends', 'method': 'GET', 'description': f'Get document trends for {company}'},
                {'path': f'{base}/analytics/revenue', 'method': 'GET', 'description': f'Get revenue analytics for {company}'},
                {'path': f'{base}/analytics/top-products', 'method': 'GET', 'description': f'Get top products for {company}'},
                {'path': f'{base}/analytics/top-contractors', 'method': 'GET', 'description': f'Get top contractors for {company}'}
            ])

            # Search endpoints
            endpoints['search'].extend([
                {'path': f'{base}/search/global', 'method': 'GET', 'description': f'Global search for {company}'},
                {'path': f'{base}/search/documents', 'method': 'GET', 'description': f'Search documents for {company}'},
                {'path': f'{base}/search/contractors', 'method': 'GET', 'description': f'Search contractors for {company}'},
                {'path': f'{base}/search/products', 'method': 'GET', 'description': f'Search products for {company}'}
            ])

        return endpoints

    def generate_implementation_plan(self):
        """Generate implementation plan for API"""
        endpoints = self.generate_comprehensive_endpoints()

        total_endpoints = sum(len(category) for category in endpoints.values())
        print(f"📈 Generated {total_endpoints} total endpoints:")

        for category, items in endpoints.items():
            print(f"  {category}: {len(items)} endpoints")

        return {
            'companies': self.companies,
            'table_groups': dict(self.table_groups),
            'schema': self.schema,
            'endpoints': endpoints,
            'statistics': {
                'total_companies': len(self.companies),
                'total_tables': sum(len(tables) for tables in self.table_groups.values()),
                'total_endpoints': total_endpoints,
                'categories': list(endpoints.keys())
            }
        }

    def save_analysis(self, filename='d1_analysis.json'):
        """Save complete analysis"""
        analysis = self.generate_implementation_plan()

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(analysis, f, ensure_ascii=False, indent=2, default=str)

        print(f"💾 Analysis saved to {filename}")
        return analysis

if __name__ == "__main__":
    mapper = D1SchemaMapper()

    print("🚀 Starting Cloudflare D1 Database Analysis")
    print("="*50)

    mapper.analyze_companies()
    mapper.analyze_tables()
    mapper.analyze_detailed_structure()

    analysis = mapper.save_analysis()

    print("="*50)
    print("✅ D1 Analysis Complete!")
    print(f"📊 Found {analysis['statistics']['total_companies']} companies")
    print(f"📋 Found {analysis['statistics']['total_tables']} tables")
    print(f"🚀 Generated {analysis['statistics']['total_endpoints']} API endpoints")