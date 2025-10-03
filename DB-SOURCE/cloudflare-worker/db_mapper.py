#!/usr/bin/env python3
"""
Database Schema Mapper for Archiwum API
Maps all tables and creates comprehensive endpoint design
"""
import sqlite3
import json
import re
from collections import defaultdict

class DatabaseSchemaMapper:
    def __init__(self, db_path):
        self.db_path = db_path
        self.schema = {}
        self.companies = []
        self.table_groups = defaultdict(list)

    def connect(self):
        return sqlite3.connect(self.db_path)

    def analyze_schema(self):
        """Analyze complete database schema"""
        conn = self.connect()
        cursor = conn.cursor()

        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        all_tables = [row[0] for row in cursor.fetchall()]

        # Group tables by company and type
        for table in all_tables:
            if table.startswith('_'):
                continue  # Skip system tables

            # Extract company and table type
            if '_firma_' in table:
                parts = table.split('_firma_')
                company = parts[0]
                table_type = parts[1]
            elif '_Magazyn_' in table:
                parts = table.split('_Magazyn_')
                company = parts[0]
                table_type = parts[1]
            else:
                continue

            self.table_groups[company].append({
                'name': table,
                'type': table_type,
                'category': 'firma' if '_firma_' in table else 'magazyn'
            })

        # Get companies info
        for company in self.table_groups.keys():
            company_info = self.get_company_info(cursor, company)
            self.companies.append(company_info)

        # Analyze each table structure
        for company, tables in self.table_groups.items():
            if company not in self.schema:
                self.schema[company] = {}

            for table_info in tables:
                table_name = table_info['name']
                structure = self.get_table_structure(cursor, table_name)
                sample_data = self.get_sample_data(cursor, table_name)
                record_count = self.get_record_count(cursor, table_name)

                self.schema[company][table_info['type']] = {
                    'full_name': table_name,
                    'structure': structure,
                    'sample_data': sample_data,
                    'record_count': record_count,
                    'category': table_info['category']
                }

        conn.close()
        return self.schema

    def get_company_info(self, cursor, company):
        """Get company information"""
        try:
            firma_table = f"{company}_firma_dbo_FIRMA"
            cursor.execute(f"SELECT NAZWA, NIP, REGON FROM [{firma_table}] LIMIT 1")
            row = cursor.fetchone()
            if row:
                return {
                    'db_name': company,
                    'nazwa': row[0],
                    'nip': row[1],
                    'regon': row[2]
                }
        except:
            pass
        return {'db_name': company, 'nazwa': company, 'nip': None, 'regon': None}

    def get_table_structure(self, cursor, table_name):
        """Get table structure"""
        try:
            cursor.execute(f"PRAGMA table_info([{table_name}])")
            columns = []
            for row in cursor.fetchall():
                columns.append({
                    'name': row[1],
                    'type': row[2],
                    'notnull': bool(row[3]),
                    'default': row[4],
                    'pk': bool(row[5])
                })
            return columns
        except:
            return []

    def get_sample_data(self, cursor, table_name, limit=3):
        """Get sample data from table"""
        try:
            cursor.execute(f"SELECT * FROM [{table_name}] LIMIT {limit}")
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()

            sample = []
            for row in rows:
                row_dict = dict(zip(columns, row))
                sample.append(row_dict)

            return sample
        except:
            return []

    def get_record_count(self, cursor, table_name):
        """Get record count for table"""
        try:
            cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
            return cursor.fetchone()[0]
        except:
            return 0

    def generate_api_endpoints(self):
        """Generate comprehensive API endpoints"""
        endpoints = {
            'core': [
                '/health',
                '/api/companies_summary',
                '/api/companies/{company_id}',
                '/api/companies/{company_id}/summary'
            ],
            'documents': [],
            'contractors': [],
            'products': [],
            'financial': [],
            'warehouses': [],
            'payments': [],
            'dictionary': []
        }

        for company in self.schema.keys():
            endpoints['documents'].extend([
                f'/api/companies/{company}/documents',
                f'/api/companies/{company}/documents/vat',
                f'/api/companies/{company}/documents/tow',
                f'/api/companies/{company}/documents/notes',
                f'/api/companies/{company}/documents/search',
                f'/api/companies/{company}/documents/{{document_id}}'
            ])

            endpoints['contractors'].extend([
                f'/api/companies/{company}/contractors',
                f'/api/companies/{company}/contractors/search',
                f'/api/companies/{company}/contractors/{{contractor_id}}',
                f'/api/companies/{company}/contractors/geography'
            ])

            endpoints['products'].extend([
                f'/api/companies/{company}/products',
                f'/api/companies/{company}/products/categories',
                f'/api/companies/{company}/products/warehouses',
                f'/api/companies/{company}/products/search',
                f'/api/companies/{company}/products/{{product_id}}',
                f'/api/companies/{company}/products/{{product_id}}/prices'
            ])

            endpoints['financial'].extend([
                f'/api/companies/{company}/financial/summary',
                f'/api/companies/{company}/financial/payments',
                f'/api/companies/{company}/financial/payments/unpaid',
                f'/api/companies/{company}/financial/vat/rates',
                f'/api/companies/{company}/financial/trends'
            ])

            endpoints['warehouses'].extend([
                f'/api/companies/{company}/warehouses',
                f'/api/companies/{company}/warehouses/movements',
                f'/api/companies/{company}/warehouses/inventory'
            ])

            endpoints['payments'].extend([
                f'/api/companies/{company}/payments',
                f'/api/companies/{company}/payments/history',
                f'/api/companies/{company}/payment-methods'
            ])

            endpoints['dictionary'].extend([
                f'/api/companies/{company}/dict/payment-types',
                f'/api/companies/{company}/dict/transaction-types',
                f'/api/companies/{company}/dict/vat-rates',
                f'/api/companies/{company}/dict/currencies',
                f'/api/companies/{company}/dict/units'
            ])

        return endpoints

    def generate_openapi_spec(self):
        """Generate OpenAPI specification"""
        endpoints = self.generate_api_endpoints()

        spec = {
            "openapi": "3.0.3",
            "info": {
                "title": "Archiwum API - Complete Database Access",
                "description": f"Complete REST API for accessing {len(self.companies)} companies with {sum(len(tables) for tables in self.table_groups.values())} tables",
                "version": "2.0.0"
            },
            "servers": [
                {"url": "http://archiwum-worker.ra8ga-archiwum.workers.dev", "description": "Production server"}
            ],
            "paths": {},
            "components": {
                "schemas": {}
            }
        }

        # Add paths for each endpoint
        for category, paths in endpoints.items():
            for path in paths:
                if '{document_id}' in path or '{contractor_id}' in path or '{product_id}' in path:
                    continue  # Skip individual item endpoints for now

                spec["paths"][path] = {
                    "get": {
                        "summary": self.generate_endpoint_summary(path, category),
                        "tags": [category.capitalize()],
                        "responses": {
                            "200": {
                                "description": "Successful response",
                                "content": {
                                    "application/json": {
                                        "schema": self.generate_response_schema(path, category)
                                    }
                                }
                            }
                        }
                    }
                }

        return spec

    def generate_endpoint_summary(self, path, category):
        """Generate endpoint summary"""
        if 'companies' in path and '{company_id}' in path:
            if 'summary' in path:
                return f"Get financial summary for company"
            elif 'documents' in path:
                return f"Get documents for company"
            elif 'contractors' in path:
                return f"Get contractors for company"
            elif 'products' in path:
                return f"Get products for company"
            elif 'financial' in path:
                return f"Get financial data for company"
        elif 'companies' in path:
            return "Get all companies"
        return f"Get {category} data"

    def generate_response_schema(self, path, category):
        """Generate response schema"""
        if 'companies' in path and '{company_id}' not in path:
            return {"type": "array", "items": {"$ref": "#/components/schemas/Company"}}
        elif 'summary' in path:
            return {"$ref": "#/components/schemas/FinancialSummary"}
        else:
            return {"type": "array", "items": {"type": "object"}}

    def save_analysis(self, filename='database_analysis.json'):
        """Save complete analysis to file"""
        analysis = {
            'companies': self.companies,
            'schema': self.schema,
            'table_groups': dict(self.table_groups),
            'api_endpoints': self.generate_api_endpoints(),
            'openapi_spec': self.generate_openapi_spec()
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(analysis, f, ensure_ascii=False, indent=2, default=str)

        return analysis

if __name__ == "__main__":
    # Usage
    db_path = 'dane_archiwalne.db'
    mapper = DatabaseSchemaMapper(db_path)

    print("🔍 Analyzing database schema...")
    schema = mapper.analyze_schema()

    print(f"📊 Found {len(mapper.companies)} companies:")
    for company in mapper.companies:
        print(f"  - {company['nazwa']} ({company['db_name']})")

    total_tables = sum(len(tables) for tables in mapper.table_groups.values())
    print(f"📋 Total tables: {total_tables}")

    print("🚀 Generating API endpoints...")
    endpoints = mapper.generate_api_endpoints()
    for category, paths in endpoints.items():
        print(f"  {category}: {len(paths)} endpoints")

    print("💾 Saving analysis...")
    analysis = mapper.save_analysis('database_analysis.json')

    print("✅ Database analysis complete!")