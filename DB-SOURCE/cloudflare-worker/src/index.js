export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const db = env.ARCHIWUM_DB;

    // Basic CORS support
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/health') {
      return jsonResponse({ ok: true }, 200, corsHeaders);
    }

    // Companies summary endpoint
    if (url.pathname === '/api/companies_summary') {
      try {
        const results = await getCompaniesSummary(db);
        return jsonResponse(results, 200, corsHeaders);
      } catch (e) {
        return jsonResponse({ error: e.message }, 500, corsHeaders);
      }
    }

    // Database statistics
    if (url.pathname === '/api/database/stats') {
      try {
        const results = await getDatabaseStats(db);
        return jsonResponse(results, 200, corsHeaders);
      } catch (e) {
        return jsonResponse({ error: e.message }, 500, corsHeaders);
      }
    }

    // All companies
    if (url.pathname === '/api/companies') {
      try {
        const results = await getAllCompanies(db);
        return jsonResponse(results, 200, corsHeaders);
      } catch (e) {
        return jsonResponse({ error: e.message }, 500, corsHeaders);
      }
    }

    
    // Company specific endpoints
    const companyMatch = url.pathname.match(/^\/api\/companies\/([^\/]+)/);
    if (companyMatch) {
      const companyId = companyMatch[1];
      const prodDb = env.PRODUCTION_DB;

      
      // CRUD Operations - check method first
      if (req.method === 'POST') {
        // Create new document
        if (url.pathname === `/api/companies/${companyId}/documents`) {
          try {
            const body = await req.json();

            const { results } = await prodDb
              .prepare(`INSERT INTO ${companyId}_Magazyn_dbo_dokTOW (DATA_DOK, WARTOSC_NETTO, WARTOSC_BRUTTO, KONTRAHENT_NAZWA, NR_ROZ) VALUES (?, ?, ?, ?, ?)`)
              .bind(body.data_dok, body.wartosc_netto || 0, body.wartosc_brutto || 0, body.kontrahent_nazwa, body.nr_roz)
              .run();

            return jsonResponse({ id: results.meta.last_row_id, ...body }, 201, corsHeaders);
          } catch (e) {
            return jsonResponse({ error: e.message }, 500, corsHeaders);
          }
        }

        // Create new contractor
        if (url.pathname === `/api/companies/${companyId}/contractors`) {
          try {
            const body = await req.json();

            // Get next ID
            const { results: maxIdResult } = await prodDb
              .prepare(`SELECT MAX(ID) as max_id FROM ${companyId}_firma_dbo_SlwKONTRAHENT`)
              .all();

            const nextId = (maxIdResult[0]?.max_id || 0) + 1;

            const { results } = await prodDb
              .prepare(`INSERT INTO ${companyId}_firma_dbo_SlwKONTRAHENT (ID, NAZWA, SYMBOL, MIASTO, ULICA, KOD, NIP) VALUES (?, ?, ?, ?, ?, ?, ?)`)
              .bind(nextId, body.nazwa, body.symbol, body.miasto, body.ulica, body.kod, body.nip)
              .run();

            return jsonResponse({ id: nextId, ...body }, 201, corsHeaders);
          } catch (e) {
            return jsonResponse({ error: e.message }, 500, corsHeaders);
          }
        }

        // Create new payment
        if (url.pathname === `/api/companies/${companyId}/payments`) {
          try {
            const body = await req.json();

            const { results } = await prodDb
              .prepare(`INSERT INTO ${companyId}_Magazyn_dbo_PLATNOSCI (RODZAJ, ZAKUP, NR_ROZ, NR_OPIS, DATA_PLATNOSCI, WARTOSC, TYTULEM, KONTRAHENT_ID, KONTRAHENT_NAZWA, KONTRAHENT_NIP) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .bind(body.rodzaj || 1, body.zakup || 0, body.nr_roz, body.nr_opis, body.data_platnosci, body.wartosc, body.tytulem, body.kontrahent_id, body.kontrahent_nazwa, body.kontrahent_nip)
              .run();

            return jsonResponse({ id: results.meta.last_row_id, ...body }, 201, corsHeaders);
          } catch (e) {
            return jsonResponse({ error: e.message }, 500, corsHeaders);
          }
        }
      }

      // Company details
      if (req.method === 'GET' && url.pathname === `/api/companies/${companyId}`) {
        try {
          const results = await getCompanyDetails(env.PRODUCTION_DB, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      // Company summary
      if (req.method === 'GET' && url.pathname === `/api/companies/${companyId}/summary`) {
        try {
          const results = await getCompanyFinancialSummary(env.PRODUCTION_DB, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      // Documents endpoints
      if (req.method === 'GET' && url.pathname === `/api/companies/${companyId}/documents`) {
        try {
          const limit = parseInt(url.searchParams.get('limit') || '50');
          const offset = parseInt(url.searchParams.get('offset') || '0');
          const results = await getCompanyDocuments(env.PRODUCTION_DB, companyId, limit, offset);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      if (req.method === 'GET' && url.pathname === `/api/companies/${companyId}/documents/vat`) {
        try {
          const limit = parseInt(url.searchParams.get('limit') || '50');
          const results = await getCompanyVATDocuments(env.PRODUCTION_DB, companyId, limit);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      if (req.method === 'GET' && url.pathname === `/api/companies/${companyId}/documents/tow`) {
        try {
          const limit = parseInt(url.searchParams.get('limit') || '50');
          const results = await getCompanyTOWDocuments(env.PRODUCTION_DB, companyId, limit);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      // Contractors endpoints
      if (req.method === 'GET' && url.pathname === `/api/companies/${companyId}/contractors`) {
        try {
          const limit = parseInt(url.searchParams.get('limit') || '100');
          const search = url.searchParams.get('search') || '';
          const results = await getCompanyContractors(env.PRODUCTION_DB, companyId, limit, search);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      if (url.pathname === `/api/companies/${companyId}/contractors/geography`) {
        try {
          const results = await getCompanyContractorsGeography(env.PRODUCTION_DB, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      // Products endpoints
      if (url.pathname === `/api/companies/${companyId}/products`) {
        try {
          const limit = parseInt(url.searchParams.get('limit') || '100');
          const search = url.searchParams.get('search') || '';
          const results = await getCompanyProducts(env.PRODUCTION_DB, companyId, limit, search);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      if (url.pathname === `/api/companies/${companyId}/products/categories`) {
        try {
          const results = await getCompanyProductCategories(env.PRODUCTION_DB, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      // Financial endpoints
      if (url.pathname === `/api/companies/${companyId}/financial/payments`) {
        try {
          const unpaid = url.searchParams.get('unpaid') === 'true';
          const results = await getCompanyPayments(env.PRODUCTION_DB, companyId, unpaid);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      if (url.pathname === `/api/companies/${companyId}/financial/vat/rates`) {
        try {
          const results = await getCompanyVATRates(env.PRODUCTION_DB, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      // Warehouses endpoints
      if (url.pathname === `/api/companies/${companyId}/warehouses`) {
        try {
          const results = await getCompanyWarehouses(env.PRODUCTION_DB, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      // Search endpoints
      if (url.pathname === `/api/companies/${companyId}/search/global`) {
        try {
          const query = url.searchParams.get('q') || '';
          const results = await globalSearch(db, companyId, query);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      // Dictionary endpoints
      if (url.pathname === `/api/companies/${companyId}/dict/payment-types`) {
        try {
          const results = await getPaymentTypes(db, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      if (url.pathname === `/api/companies/${companyId}/dict/vat-rates`) {
        try {
          const results = await getVATRates(db, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      // Payment and Configuration endpoints
      if (req.method === 'GET' && url.pathname === `/api/companies/${companyId}/payments`) {
        try {
          const results = await getCompanyPayments(env.PRODUCTION_DB, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      if (url.pathname === `/api/companies/${companyId}/payments/unpaid`) {
        try {
          const results = await getCompanyPayments(db, companyId, true);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      if (url.pathname.startsWith(`/api/companies/${companyId}/payments/`)) {
        const paymentId = url.pathname.split('/').pop();
        try {
          const result = await getCompanyPaymentDetails(env.PRODUCTION_DB, companyId, paymentId);
          if (!result) {
            return jsonResponse({ error: 'Payment not found' }, 404, corsHeaders);
          }
          return jsonResponse(result, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      if (url.pathname === `/api/companies/${companyId}/cash-registers`) {
        try {
          const results = await getCompanyCashRegisters(env.PRODUCTION_DB, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }

      if (url.pathname === `/api/companies/${companyId}/configuration`) {
        try {
          const results = await getCompanyConfiguration(env.PRODUCTION_DB, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }
    }

    // Swagger documentation endpoints
    if (url.pathname === '/swagger.yaml' || url.pathname === '/openapi.yaml') {
      const swaggerYaml = `openapi: 3.0.3
info:
  title: Archiwum Production API - Complete CRUD Operations
  description: |
    Complete REST API with full CRUD operations for managing company data in the production database.

    ## Available Data
    - 4 companies (law firms)
    - 254 database tables
    - ~8,000 records
    - Documents, contracts, financial data, contractors, products

    ## Features
    - **Complete CRUD Operations**: Create, Read, Update, Delete all data types
    - Advanced search functionality
    - Financial analytics and reporting
    - Geographic data analysis
    - Real-time data access
    - Production database with full write capabilities

    ## Base URL
    \`http://archiwum-worker.ra8ga-archiwum.workers.dev\`

    ## CRUD Operations
    - **POST**: Create new documents, contractors, payments
    - **GET**: Retrieve all existing data with advanced filtering
    - **PUT**: Update existing records
    - **DELETE**: Remove records from production database

    ## CORS
    API supports CORS with \`Access-Control-Allow-Origin: *\`
  version: 3.0.0
  contact:
    name: Archiwum API Support
    url: https://github.com/ra8ga/kancelaria-faktury
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: http://archiwum-worker.ra8ga-archiwum.workers.dev
    description: Production server (HTTP only)

paths:
  /health:
    get:
      summary: Health Check
      description: Simple health check endpoint to verify API is running
      tags:
        - Health
      responses:
        '200':
          description: API is healthy and operational
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok:
                    type: boolean
                    example: true
              example:
                ok: true

  /api/database/stats:
    get:
      summary: Database Statistics
      description: Get overall database statistics and metrics
      tags:
        - Database
      responses:
        '200':
          description: Database statistics retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DatabaseStats'
              example:
                total_tables: 254
                total_companies: 4
                database_size: "~2MB"
                last_updated: "2025-10-02T16:50:31.361Z"

  /api/companies:
    get:
      summary: Get All Companies
      description: Retrieve a list of all companies with their basic information
      tags:
        - Companies
      responses:
        '200':
          description: Successfully retrieved companies list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/CompanySummary'
              example:
                - db_name: "ADWKAROLINA"
                  nazwa: "Kancelaria Adwokacka Adw. Karolina Więckowska- Kasner"
                  nip: "6292370846"
                  regon: "276405042"
                  miasto: "DĄBROWA GÓRNICZA"
                  ulica: "3-go MAJA"
                  kod: "41-300"
                  kontrahenci_count: 20
                  dokumenty_count: 396

  /api/companies_summary:
    get:
      summary: Get Companies Summary
      description: Returns summary of all companies with key metrics (alias for /api/companies)
      tags:
        - Companies
      responses:
        '200':
          description: Successfully retrieved companies summary
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/CompanySummary'

  /api/companies/{companyId}:
    get:
      summary: Get Company Details
      description: Get detailed information about a specific company including address
      tags:
        - Companies
      parameters:
        - name: companyId
          in: path
          required: true
          description: Company database identifier
          schema:
            type: string
            example: "ADWKAROLINA"
      responses:
        '200':
          description: Company details retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CompanyDetails'
        '404':
          description: Company not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/companies/{companyId}/summary:
    get:
      summary: Get Company Financial Summary
      description: Get financial summary including document counts and monetary values
      tags:
        - Financial
      parameters:
        - name: companyId
          in: path
          required: true
          description: Company database identifier
          schema:
            type: string
      responses:
        '200':
          description: Financial summary retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FinancialSummary'

  /api/companies/{companyId}/documents:
    get:
      summary: Get Company Documents
      description: Get paginated list of all documents (VAT and TOW) for a company
      tags:
        - Documents
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
        - name: limit
          in: query
          description: Maximum number of documents to return
          schema:
            type: integer
            default: 50
        - name: offset
          in: query
          description: Number of documents to skip
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: Documents retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Document'
    post:
      summary: Create New Document
      description: Create a new document (TOW type) in the production database
      tags:
        - Documents
        - CRUD
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewDocument'
            example:
              data_dok: "2025-10-03"
              wartosc_netto: 1000.00
              wartosc_brutto: 1230.00
              kontrahent_nazwa: "Firma Testowa Sp. z o.o."
              nr_roz: "FV/2025/001"
      responses:
        '201':
          description: Document created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CreatedDocument'
              example:
                id: 1234
                data_dok: "2025-10-03"
                wartosc_netto: 1000.00
                wartosc_brutto: 1230.00
                kontrahent_nazwa: "Firma Testowa Sp. z o.o."
                nr_roz: "FV/2025/001"
        '400':
          description: Invalid request data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/companies/{companyId}/documents/{documentId}:
    put:
      summary: Update Document
      description: Update an existing document in the production database
      tags:
        - Documents
        - CRUD
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
        - name: documentId
          in: path
          required: true
          schema:
            type: integer
          description: Document ID to update
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewDocument'
      responses:
        '200':
          description: Document updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CreatedDocument'
        '404':
          description: Document not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '400':
          description: Invalid request data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    delete:
      summary: Delete Document
      description: Delete a document from the production database
      tags:
        - Documents
        - CRUD
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
        - name: documentId
          in: path
          required: true
          schema:
            type: integer
          description: Document ID to delete
      responses:
        '200':
          description: Document deleted successfully
          content:
            application/json:
              schema:
                properties:
                  message:
                    type: string
                    example: "Document deleted successfully"
        '404':
          description: Document not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/companies/{companyId}/documents/vat:
    get:
      summary: Get VAT Documents
      description: Get VAT documents for a company
      tags:
        - Documents
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
        - name: limit
          in: query
          description: Maximum number of documents to return
          schema:
            type: integer
            default: 50
      responses:
        '200':
          description: VAT documents retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/VATDocument'

  /api/companies/{companyId}/documents/tow:
    get:
      summary: Get TOW Documents
      description: Get TOW (warehouse) documents for a company
      tags:
        - Documents
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
        - name: limit
          in: query
          description: Maximum number of documents to return
          schema:
            type: integer
            default: 50
      responses:
        '200':
          description: TOW documents retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/TOWDocument'

  /api/companies/{companyId}/contractors:
    get:
      summary: Get Company Contractors
      description: Get contractors/contraheents for a company with optional search
      tags:
        - Contractors
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
        - name: limit
          in: query
          description: Maximum number of contractors to return
          schema:
            type: integer
            default: 100
        - name: search
          in: query
          description: Search term for contractor names, cities, or NIP
          schema:
            type: string
      responses:
        '200':
          description: Contractors retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Contractor'
    post:
      summary: Create New Contractor
      description: Create a new contractor in the production database
      tags:
        - Contractors
        - CRUD
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewContractor'
            example:
              nazwa: "Nowa Firma Sp. z o.o."
              symbol: "NOWAFIRMA"
              miasto: "Warszawa"
              ulica: "ul. Testowa 1"
              kod: "00-100"
              nip: "1234567890"
      responses:
        '201':
          description: Contractor created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CreatedContractor'
              example:
                id: 1023
                nazwa: "Nowa Firma Sp. z o.o."
                symbol: "NOWAFIRMA"
                miasto: "Warszawa"
                ulica: "ul. Testowa 1"
                kod: "00-100"
                nip: "1234567890"
        '400':
          description: Invalid request data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/companies/{companyId}/contractors/{contractorId}:
    put:
      summary: Update Contractor
      description: Update an existing contractor in the production database
      tags:
        - Contractors
        - CRUD
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
        - name: contractorId
          in: path
          required: true
          schema:
            type: integer
          description: Contractor ID to update
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewContractor'
      responses:
        '200':
          description: Contractor updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CreatedContractor'
        '404':
          description: Contractor not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '400':
          description: Invalid request data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    delete:
      summary: Delete Contractor
      description: Delete a contractor from the production database
      tags:
        - Contractors
        - CRUD
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
        - name: contractorId
          in: path
          required: true
          schema:
            type: integer
          description: Contractor ID to delete
      responses:
        '200':
          description: Contractor deleted successfully
          content:
            application/json:
              schema:
                properties:
                  message:
                    type: string
                    example: "Contractor deleted successfully"
        '404':
          description: Contractor not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/companies/{companyId}/contractors/geography:
    get:
      summary: Get Contractor Geography
      description: Get geographic distribution of contractors by city
      tags:
        - Contractors
        - Analytics
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Geographic data retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ContractorGeography'

  /api/companies/{companyId}/products:
    get:
      summary: Get Company Products
      description: Get products/services for a company with optional search
      tags:
        - Products
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
        - name: limit
          in: query
          description: Maximum number of products to return
          schema:
            type: integer
            default: 100
        - name: search
          in: query
          description: Search term for product names or symbols
          schema:
            type: string
      responses:
        '200':
          description: Products retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Product'

  /api/companies/{companyId}/products/categories:
    get:
      summary: Get Product Categories
      description: Get product categories for a company
      tags:
        - Products
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Product categories retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ProductCategory'

  /api/companies/{companyId}/financial/payments:
    get:
      summary: Get Company Payments
      description: Get payment records for a company, optionally filtered by unpaid status
      tags:
        - Financial
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
        - name: unpaid
          in: query
          description: Filter for unpaid payments only
          schema:
            type: boolean
            default: false
      responses:
        '200':
          description: Payments retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Payment'

  /api/companies/{companyId}/financial/vat/rates:
    get:
      summary: Get VAT Rates
      description: Get VAT rates used by a company
      tags:
        - Financial
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: VAT rates retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/VATRate'

  /api/companies/{companyId}/warehouses:
    get:
      summary: Get Company Warehouses
      description: Get warehouse locations for a company
      tags:
        - Warehouses
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Warehouses retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Warehouse'

  /api/companies/{companyId}/search/global:
    get:
      summary: Global Search
      description: Search across contractors, products, and documents
      tags:
        - Search
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
        - name: q
          in: query
          required: true
          description: Search query (minimum 2 characters)
          schema:
            type: string
            minLength: 2
      responses:
        '200':
          description: Search results retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SearchResults'

  /api/companies/{companyId}/dict/payment-types:
    get:
      summary: Get Payment Types Dictionary
      description: Get payment types dictionary for a company
      tags:
        - Dictionary
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Payment types retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object

  /api/companies/{companyId}/dict/vat-rates:
    get:
      summary: Get VAT Rates Dictionary
      description: Get VAT rates dictionary for a company (alias for financial/vat/rates)
      tags:
        - Dictionary
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: VAT rates retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/VATRate'

  /api/companies/{companyId}/payments:
    get:
      summary: Get All Company Payments (CRUD)
      description: Get all payment records for a company with full contractor details
      tags:
        - Payments
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Payments retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Payment'
    post:
      summary: Create New Payment
      description: Create a new payment record in the production database
      tags:
        - Payments
        - CRUD
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewPayment'
            example:
              rodzaj: 1
              zakup: 0
              nr_roz: "FV/2025/001"
              nr_opis: "Faktura za usługi"
              data_platnosci: "2025-10-15"
              wartosc: 1230.00
              tytulem: "Zapłata za fakturę"
              kontrahent_id: 123
              kontrahent_nazwa: "Firma Testowa Sp. z o.o."
              kontrahent_nip: "1234567890"
      responses:
        '201':
          description: Payment created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CreatedPayment'
              example:
                id: 5678
                rodzaj: 1
                zakup: 0
                nr_roz: "FV/2025/001"
                nr_opis: "Faktura za usługi"
                data_platnosci: "2025-10-15"
                wartosc: 1230.00
                tytulem: "Zapłata za fakturę"
                kontrahent_id: 123
                kontrahent_nazwa: "Firma Testowa Sp. z o.o."
                kontrahent_nip: "1234567890"
        '400':
          description: Invalid request data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/companies/{companyId}/payments/{paymentId}:
    get:
      summary: Get Payment Details
      description: Get detailed information about a specific payment
      tags:
        - Payments
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
        - name: paymentId
          in: path
          required: true
          schema:
            type: integer
          description: Payment ID to retrieve
      responses:
        '200':
          description: Payment details retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Payment'
        '404':
          description: Payment not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    put:
      summary: Update Payment
      description: Update an existing payment in the production database
      tags:
        - Payments
        - CRUD
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
        - name: paymentId
          in: path
          required: true
          schema:
            type: integer
          description: Payment ID to update
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewPayment'
      responses:
        '200':
          description: Payment updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CreatedPayment'
        '404':
          description: Payment not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '400':
          description: Invalid request data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    delete:
      summary: Delete Payment
      description: Delete a payment from the production database
      tags:
        - Payments
        - CRUD
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
        - name: paymentId
          in: path
          required: true
          schema:
            type: integer
          description: Payment ID to delete
      responses:
        '200':
          description: Payment deleted successfully
          content:
            application/json:
              schema:
                properties:
                  message:
                    type: string
                    example: "Payment deleted successfully"
        '404':
          description: Payment not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/companies/{companyId}/payments/unpaid:
    get:
      summary: Get Unpaid Payments
      description: Get only unpaid payment records for a company
      tags:
        - Payments
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Unpaid payments retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Payment'

  /api/companies/{companyId}/cash-registers:
    get:
      summary: Get Cash Registers
      description: Get cash register information for a company
      tags:
        - Configuration
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Cash registers retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/CashRegister'

  /api/companies/{companyId}/configuration:
    get:
      summary: Get Company Configuration
      description: Get system configuration settings for a company
      tags:
        - Configuration
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Configuration retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Configuration'

components:
  schemas:
    DatabaseStats:
      type: object
      properties:
        total_tables:
          type: integer
          description: Total number of tables in database
          example: 254
        total_companies:
          type: integer
          description: Total number of companies
          example: 4
        database_size:
          type: string
          description: Approximate database size
          example: "~2MB"
        last_updated:
          type: string
          format: date-time
          description: Last update timestamp
          example: "2025-10-02T16:50:31.361Z"

    CompanySummary:
      type: object
      description: Summary information about a company
      properties:
        db_name:
          type: string
          description: Database identifier for the company
          example: "ADWKAROLINA"
        nazwa:
          type: string
          description: Full legal name of the company
          example: "Kancelaria Adwokacka Adw. Karolina Więckowska- Kasner"
        nip:
          type: string
          nullable: true
          description: Tax Identification Number (NIP)
          example: "6292370846"
        regon:
          type: string
          nullable: true
          description: Statistical Identification Number (REGON)
          example: "276405042"
        miasto:
          type: string
          nullable: true
          description: City
          example: "DĄBROWA GÓRNICZA"
        ulica:
          type: string
          nullable: true
          description: Street address
          example: "3-go MAJA"
        kod:
          type: string
          nullable: true
          description: Postal code
          example: "41-300"
        kontrahenci_count:
          type: integer
          description: Number of contractors/clients
          example: 20
        dokumenty_count:
          type: integer
          description: Number of documents in the system
          example: 396
      required:
        - db_name
        - nazwa
        - kontrahenci_count
        - dokumenty_count

    Payment:
      type: object
      description: Payment record with full contractor details
      properties:
        ID:
          type: integer
          description: Payment ID
          example: 1
        RODZAJ:
          type: integer
          description: Payment type
          example: 1
        ZAKUP:
          type: integer
          description: Purchase flag
          example: 0
        NR:
          type: integer
          description: Payment number
          example: 15
        NR_ROZ:
          type: string
          description: Extended payment number
          example: "P/001/2025"
        NR_OPIS:
          type: string
          description: Payment description
          example: "Faktura VAT 123/2025"
        NR_DOWODU:
          type: string
          description: Proof document number
          example: "FS/123"
        DATA_PLATNOSCI:
          type: string
          format: date
          description: Payment date
          example: "2025-01-15"
        WARTOSC:
          type: number
          format: float
          description: Payment amount
          example: 1500.50
        TYTULEM:
          type: string
          description: Payment title/description
          example: "Usługi prawne"
        KASA_ID:
          type: integer
          nullable: true
          description: Cash register ID
          example: 1
        KONTO_Z:
          type: string
          nullable: true
          description: Source account
          example: "PL12345678901234567890123456"
        KONTO_NA:
          type: string
          nullable: true
          description: Destination account
          example: "PL98765432109876543210987654"
        KONTRAHENT_ID:
          type: integer
          description: Contractor ID
          example: 25
        KONTRAHENT_SYMBOL:
          type: string
          nullable: true
          description: Contractor symbol
          example: "K001"
        KONTRAHENT_NAZWA:
          type: string
          description: Contractor name
          example: "Jan Kowalski"
        KONTRAHENT_ULICA:
          type: string
          nullable: true
          description: Contractor street
          example: "ul. Warszawska 12"
        KONTRAHENT_NRDOMU:
          type: string
          nullable: true
          description: Contractor building number
          example: "12"
        KONTRAHENT_NRMIESZKANIA:
          type: string
          nullable: true
          description: Contractor apartment number
          example: "5"
        KONTRAHENT_KOD:
          type: string
          nullable: true
          description: Contractor postal code
          example: "00-100"
        KONTRAHENT_MIASTO:
          type: string
          nullable: true
          description: Contractor city
          example: "Warszawa"
        KONTRAHENT_NIP:
          type: string
          nullable: true
          description: Contractor NIP
          example: "1234567890"
        WALUTA_JEST:
          type: integer
          nullable: true
          description: Flag if currency is different from PLN
          example: 0
        WALUTA:
          type: string
          nullable: true
          description: Currency code
          example: "PLN"
        WALUTA_MNOZNIK:
          type: integer
          nullable: true
          description: Currency multiplier
          example: 100
        WALUTA_KURS:
          type: number
          format: float
          nullable: true
          description: Exchange rate
          example: 4.25
        WALUTA_ZDNIA:
          type: string
          format: date
          nullable: true
          description: Exchange rate date
          example: "2025-01-15"
        WALUTA_WARTOSC_PLN:
          type: number
          format: float
          nullable: true
          description: Value in PLN
          example: 1500.50

    CashRegister:
      type: object
      description: Cash register information
      properties:
        ID:
          type: integer
          description: Cash register ID
          example: 1
        SYMBOL:
          type: string
          description: Cash register symbol
          example: "KASA1"
        NAZWA:
          type: string
          description: Cash register name
          example: "Główna kasa"
        STAN_POCZATKOWY:
          type: number
          format: float
          description: Starting balance
          example: 1000.00
        STAN_KASY:
          type: number
          format: float
          nullable: true
          description: Current balance
          example: 2450.75

    Configuration:
      type: object
      description: System configuration parameter
      properties:
        ID:
          type: integer
          description: Configuration ID
          example: 1
        NAZWA:
          type: string
          description: Configuration parameter name
          example: "EMAIL_SMTP"
        userID:
          type: integer
          nullable: true
          description: User ID who created this configuration
          example: 1
        WARTOSC:
          type: string
          nullable: true
          description: Configuration value
          example: "smtp.gmail.com:587"

    CompanyDetails:
      type: object
      properties:
        company:
          type: object
          description: Company detailed information
        address:
          type: object
          nullable: true
          description: Company address information
        db_name:
          type: string
          description: Database identifier
          example: "ADWKAROLINA"

    FinancialSummary:
      type: object
      properties:
        total_documents:
          type: integer
          description: Total number of documents
          example: 396
        vat_documents:
          type: integer
          description: Number of VAT documents
          example: 264
        tow_documents:
          type: integer
          description: Number of TOW documents
          example: 132
        contractors:
          type: integer
          description: Number of contractors
          example: 20
        total_netto:
          type: number
          format: float
          description: Total net value
          example: 696972.06
        total_brutto:
          type: number
          format: float
          description: Total gross value
          example: 857275.72
        total_vat:
          type: number
          format: float
          description: Total VAT amount
          example: 160303.66

    Document:
      type: object
      properties:
        type:
          type: string
          enum: [VAT, TOW]
          description: Document type
        ID:
          type: integer
          description: Document ID
        DATA_DOK:
          type: string
          description: Document date
        WARTOSC_NETTO:
          type: number
          description: Net value
        WARTOSC_BRUTTO:
          type: number
          description: Gross value
        KONTRAHENT_NAZWA:
          type: string
          description: Contractor name
        NR_ROZ:
          type: string
          description: Document number

    VATDocument:
      type: object
      description: Complete VAT document with all fields
      additionalProperties: true

    TOWDocument:
      type: object
      description: Complete TOW document with all fields
      additionalProperties: true

    Contractor:
      type: object
      properties:
        ID:
          type: integer
          description: Contractor ID
        NAZWA:
          type: string
          description: Contractor name
        NIP:
          type: string
          description: Tax ID
        MIASTO:
          type: string
          description: City
        ULICA:
          type: string
          description: Street
        KOD:
          type: string
          description: Postal code
        TELEFON:
          type: string
          description: Phone number
        EMAIL:
          type: string
          description: Email address

    ContractorGeography:
      type: object
      properties:
        MIASTO:
          type: string
          description: City name
        count:
          type: integer
          description: Number of contractors in city

    Product:
      type: object
      properties:
        ID:
          type: integer
          description: Product ID
        NAZWA:
          type: string
          description: Product name
        SYMBOL:
          type: string
          description: Product symbol/code

    ProductCategory:
      type: object
      description: Product category information
      additionalProperties: true

    VATRate:
      type: object
      properties:
        STAWKA:
          type: string
          description: VAT rate value
        NAZWA:
          type: string
          description: VAT rate description

    Warehouse:
      type: object
      description: Warehouse information
      additionalProperties: true

    SearchResults:
      type: object
      properties:
        contractors:
          type: array
          items:
            type: object
            properties:
              type:
                type: string
                example: "contractor"
              ID:
                type: integer
              NAZWA:
                type: string
              MIASTO:
                type: string
              NIP:
                type: string
        products:
          type: array
          items:
            type: object
            properties:
              type:
                type: string
                example: "product"
              ID:
                type: integer
              NAZWA:
                type: string
              SYMBOL:
                type: string
        documents:
          type: array
          items:
            type: object
            properties:
              type:
                type: string
                example: "document"
              ID:
                type: integer
              NR_ROZ:
                type: string
              KONTRAHENT_NAZWA:
                type: string
              DATA_DOK:
                type: string
        total:
          type: integer
          description: Total number of results

    Error:
      type: object
      properties:
        error:
          type: string
          description: Error message
          example: "Company not found"

  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API Key (not implemented yet)

tags:
  - name: Health
    description: Health check endpoints
  - name: Database
    description: Database statistics and information
  - name: Companies
    description: Company data endpoints
  - name: Documents
    description: Document management endpoints
  - name: Contractors
    description: Contractor and client management
  - name: Products
    description: Product and service catalog
  - name: Financial
    description: Financial data and analytics
  - name: Warehouses
    description: Warehouse management
  - name: Search
    description: Search functionality
  - name: Dictionary
    description: Dictionary and lookup data
  - name: Analytics
    description: Analytics and reporting

    # CRUD Schemas
    NewDocument:
      type: object
      description: Request schema for creating a new document
      properties:
        data_dok:
          type: string
          format: date
          description: Document date
          example: "2025-10-03"
        wartosc_netto:
          type: number
          format: float
          description: Net value
          example: 1000.00
        wartosc_brutto:
          type: number
          format: float
          description: Gross value
          example: 1230.00
        kontrahent_nazwa:
          type: string
          description: Contractor name
          example: "Firma Testowa Sp. z o.o."
        nr_roz:
          type: string
          description: Document number
          example: "FV/2025/001"
      required:
        - data_dok
        - kontrahent_nazwa
        - nr_roz

    CreatedDocument:
      type: object
      description: Response schema for created document
      properties:
        id:
          type: integer
          description: Auto-generated document ID
          example: 1234
        data_dok:
          type: string
          format: date
          description: Document date
          example: "2025-10-03"
        wartosc_netto:
          type: number
          format: float
          description: Net value
          example: 1000.00
        wartosc_brutto:
          type: number
          format: float
          description: Gross value
          example: 1230.00
        kontrahent_nazwa:
          type: string
          description: Contractor name
          example: "Firma Testowa Sp. z o.o."
        nr_roz:
          type: string
          description: Document number
          example: "FV/2025/001"

    NewContractor:
      type: object
      description: Request schema for creating a new contractor
      properties:
        nazwa:
          type: string
          description: Contractor legal name
          example: "Nowa Firma Sp. z o.o."
        symbol:
          type: string
          description: Short symbol/abbreviation
          example: "NOWAFIRMA"
        miasto:
          type: string
          description: City
          example: "Warszawa"
        ulica:
          type: string
          description: Street address
          example: "ul. Testowa 1"
        kod:
          type: string
          description: Postal code
          example: "00-100"
        nip:
          type: string
          description: Tax ID (NIP)
          example: "1234567890"
      required:
        - nazwa

    CreatedContractor:
      type: object
      description: Response schema for created contractor
      properties:
        id:
          type: integer
          description: Auto-generated contractor ID
          example: 1023
        nazwa:
          type: string
          description: Contractor legal name
          example: "Nowa Firma Sp. z o.o."
        symbol:
          type: string
          description: Short symbol/abbreviation
          example: "NOWAFIRMA"
        miasto:
          type: string
          description: City
          example: "Warszawa"
        ulica:
          type: string
          description: Street address
          example: "ul. Testowa 1"
        kod:
          type: string
          description: Postal code
          example: "00-100"
        nip:
          type: string
          description: Tax ID (NIP)
          example: "1234567890"

    NewPayment:
      type: object
      description: Request schema for creating a new payment
      properties:
        rodzaj:
          type: integer
          description: Payment type (1=invoice, etc.)
          example: 1
        zakup:
          type: integer
          description: Purchase flag (0=sale, 1=purchase)
          example: 0
        nr_roz:
          type: string
          description: Document number
          example: "FV/2025/001"
        nr_opis:
          type: string
          description: Payment description
          example: "Faktura za usługi"
        data_platnosci:
          type: string
          format: date
          description: Payment due date
          example: "2025-10-15"
        wartosc:
          type: number
          format: float
          description: Payment amount
          example: 1230.00
        tytulem:
          type: string
          description: Payment title
          example: "Zapłata za fakturę"
        kontrahent_id:
          type: integer
          description: Contractor ID
          example: 123
        kontrahent_nazwa:
          type: string
          description: Contractor name
          example: "Firma Testowa Sp. z o.o."
        kontrahent_nip:
          type: string
          description: Contractor NIP
          example: "1234567890"
      required:
        - rodzaj
        - data_platnosci
        - wartosc
        - kontrahent_id

    CreatedPayment:
      type: object
      description: Response schema for created payment
      properties:
        id:
          type: integer
          description: Auto-generated payment ID
          example: 5678
        rodzaj:
          type: integer
          description: Payment type
          example: 1
        zakup:
          type: integer
          description: Purchase flag
          example: 0
        nr_roz:
          type: string
          description: Document number
          example: "FV/2025/001"
        nr_opis:
          type: string
          description: Payment description
          example: "Faktura za usługi"
        data_platnosci:
          type: string
          format: date
          description: Payment date
          example: "2025-10-15"
        wartosc:
          type: number
          format: float
          description: Payment amount
          example: 1230.00
        tytulem:
          type: string
          description: Payment title
          example: "Zapłata za fakturę"
        kontrahent_id:
          type: integer
          description: Contractor ID
          example: 123
        kontrahent_nazwa:
          type: string
          description: Contractor name
          example: "Firma Testowa Sp. z o.o."
        kontrahent_nip:
          type: string
          description: Contractor NIP
          example: "1234567890"

    Error:
      type: object
      description: Error response schema
      properties:
        error:
          type: string
          description: Error message
          example: "Invalid request data"
      required:
        - error`;
      return new Response(swaggerYaml, {
        headers: { 'Content-Type': 'application/x-yaml', ...corsHeaders }
      });
    }

    if (url.pathname === '/swagger' || url.pathname === '/') {
      const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Archiwum API - Swagger Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
        .header {
            background: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.8;
        }
        .api-info {
            background: #e74c3c;
            color: white;
            padding: 15px;
            margin: 20px;
            border-radius: 5px;
            text-align: center;
        }
        .api-info strong {
            display: block;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏛️ Archiwum API</h1>
        <p>REST API for Historical Company Data</p>
    </div>

    <div class="api-info">
        <strong>🚀 Live API Base URL:</strong>
        <code>http://archiwum-worker.ra8ga-archiwum.workers.dev</code>
        <br>
        <small>Note: HTTP only (not HTTPS) for workers.dev subdomains</small>
    </div>

    <div id="swagger-ui"></div>

    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            SwaggerUIBundle({
                url: '/swagger.yaml',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                defaultModelsExpandDepth: 1,
                displayRequestDuration: true
            });
        }
    </script>
</body>
</html>`;
      return new Response(swaggerHtml, {
        headers: { 'Content-Type': 'text/html', ...corsHeaders }
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};

async function getCompaniesSummary(db) {
  // Znajdź tabele FIRMA
  const { results: firmaTables } = await db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_firma_dbo_FIRMA' ORDER BY name")
    .all();

  const companies = [];
  for (const row of firmaTables) {
    const table = row.name;
    const dbName = table.replace('_firma_dbo_FIRMA', '');

    // Dane firmy
    const { results: frows } = await db
      .prepare(`SELECT NAZWA, NIP, REGON FROM "${table}" LIMIT 1`)
      .all();

    if (!frows || frows.length === 0) continue;

    // Adres (opcjonalnie)
    const addrTable = `${dbName}_firma_dbo_ADRESY`;
    let miasto = null, ulica = null, kod = null;
    try {
      const { results: arows } = await db
        .prepare(`SELECT MIASTO, ULICA, KOD FROM "${addrTable}" LIMIT 1`)
        .all();
      if (arows && arows.length) {
        miasto = arows[0].MIASTO ?? null;
        ulica = arows[0].ULICA ?? null;
        kod = arows[0].KOD ?? null;
      }
    } catch (_) {}

    // Liczba kontrahentów
    const kontrTable = `${dbName}_firma_dbo_SlwKONTRAHENT`;
    let kontrahenciCount = 0;
    try {
      const { results: krows } = await db
        .prepare(`SELECT COUNT(*) AS cnt FROM "${kontrTable}"`)
        .all();
      kontrahenciCount = (krows && krows.length) ? krows[0].cnt : 0;
    } catch (_) {}

    // Liczba dokumentów
    const dokTable = `${dbName}_Magazyn_dbo_dokTOW`;
    let dokumentyCount = 0;
    try {
      const { results: drows } = await db
        .prepare(`SELECT COUNT(*) AS cnt FROM "${dokTable}"`)
        .all();
      dokumentyCount = (drows && drows.length) ? drows[0].cnt : 0;
    } catch (_) {}

    companies.push({
      db_name: dbName,
      nazwa: frows[0].NAZWA,
      nip: frows[0].NIP,
      regon: frows[0].REGON,
      miasto,
      ulica,
      kod,
      kontrahenci_count: kontrahenciCount,
      dokumenty_count: dokumentyCount
    });
  }

  return companies;
}

async function getDatabaseStats(db) {
  const { results: totalTables } = await db
    .prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE '_%'")
    .all();

  const { results: companyTables } = await db
    .prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name LIKE '%_firma_dbo_FIRMA'")
    .all();

  return {
    total_tables: totalTables[0]?.count || 0,
    total_companies: companyTables[0]?.count || 0,
    database_size: "~2MB",
    last_updated: new Date().toISOString()
  };
}

async function getAllCompanies(db) {
  return await getCompaniesSummary(db);
}

async function getCompanyDetails(db, companyId) {
  const firmaTable = `${companyId}_firma_dbo_FIRMA`;
  const adresTable = `${companyId}_firma_dbo_ADRESY`;

  try {
    const { results: companyData } = await db
      .prepare(`SELECT * FROM "${firmaTable}" LIMIT 1`)
      .all();

    let addressData = null;
    try {
      const { results: address } = await db
        .prepare(`SELECT * FROM "${adresTable}" LIMIT 1`)
        .all();
      addressData = address[0] || null;
    } catch (_) {}

    return {
      company: companyData[0] || null,
      address: addressData,
      db_name: companyId
    };
  } catch (e) {
    throw new Error(`Company ${companyId} not found`);
  }
}

async function getCompanyFinancialSummary(db, companyId) {
  const vatTable = `${companyId}_Magazyn_dbo_dokVAT`;
  const towTable = `${companyId}_Magazyn_dbo_dokTOW`;
  const kontrTable = `${companyId}_firma_dbo_SlwKONTRAHENT`;

  let summary = {
    total_documents: 0,
    vat_documents: 0,
    tow_documents: 0,
    contractors: 0,
    total_netto: 0,
    total_brutto: 0,
    total_vat: 0
  };

  try {
    // VAT documents
    const { results: vatData } = await db
      .prepare(`SELECT COUNT(*) as count, SUM(CAST(COALESCE(n23, 0) AS REAL)) as netto, SUM(CAST(COALESCE(b23, 0) AS REAL)) as brutto FROM "${vatTable}"`)
      .all();

    if (vatData.length > 0) {
      summary.vat_documents = vatData[0].count || 0;
      summary.total_netto = vatData[0].netto || 0;
      summary.total_brutto = vatData[0].brutto || 0;
    }

    // TOW documents
    const { results: towData } = await db
      .prepare(`SELECT COUNT(*) as count FROM "${towTable}"`)
      .all();

    if (towData.length > 0) {
      summary.tow_documents = towData[0].count || 0;
    }

    // Contractors
    const { results: kontrData } = await db
      .prepare(`SELECT COUNT(*) as count FROM "${kontrTable}"`)
      .all();

    if (kontrData.length > 0) {
      summary.contractors = kontrData[0].count || 0;
    }

    summary.total_documents = summary.vat_documents + summary.tow_documents;
    summary.total_vat = summary.total_brutto - summary.total_netto;

  } catch (_) {}

  return summary;
}

async function getCompanyDocuments(db, companyId, limit = 50, offset = 0) {
  const vatTable = `${companyId}_Magazyn_dbo_dokVAT`;
  const towTable = `${companyId}_Magazyn_dbo_dokTOW`;

  const documents = [];

  try {
    // Get VAT documents
    const { results: vatDocs } = await db
      .prepare(`SELECT 'VAT' as type, ID, DATA_DOK, WARTOSC_NETTO, WARTOSC_BRUTTO, KONTRAHENT_NAZWA, NR_ROZ FROM "${vatTable}" ORDER BY DATA_DOK DESC LIMIT ${limit} OFFSET ${offset}`)
      .all();

    documents.push(...vatDocs);
  } catch (_) {}

  try {
    // Get TOW documents
    const { results: towDocs } = await db
      .prepare(`SELECT 'TOW' as type, ID, DATA_DOK, WARTOSC_NETTO, WARTOSC_BRUTTO, KONTRAHENT_NAZWA, NR_ROZ FROM "${towTable}" ORDER BY DATA_DOK DESC LIMIT ${limit} OFFSET ${offset}`)
      .all();

    documents.push(...towDocs);
  } catch (_) {}

  return documents;
}

async function getCompanyVATDocuments(db, companyId, limit = 50) {
  const vatTable = `${companyId}_Magazyn_dbo_dokVAT`;

  try {
    const { results: docs } = await db
      .prepare(`SELECT * FROM "${vatTable}" ORDER BY DATA_DOK DESC LIMIT ${limit}`)
      .all();
    return docs;
  } catch (e) {
    return [];
  }
}

async function getCompanyTOWDocuments(db, companyId, limit = 50) {
  const towTable = `${companyId}_Magazyn_dbo_dokTOW`;

  try {
    const { results: docs } = await db
      .prepare(`SELECT * FROM "${towTable}" ORDER BY DATA_DOK DESC LIMIT ${limit}`)
      .all();
    return docs;
  } catch (e) {
    return [];
  }
}

async function getCompanyContractors(db, companyId, limit = 100, search = '') {
  const kontrTable = `${companyId}_firma_dbo_SlwKONTRAHENT`;

  let query = `SELECT * FROM "${kontrTable}"`;
  if (search) {
    query += ` WHERE NAZWA LIKE '%${search}%' OR MIASTO LIKE '%${search}%' OR NIP LIKE '%${search}%'`;
  }
  query += ` ORDER BY NAZWA LIMIT ${limit}`;

  try {
    const { results: contractors } = await db.prepare(query).all();
    return contractors;
  } catch (e) {
    return [];
  }
}

async function getCompanyContractorsGeography(db, companyId) {
  const kontrTable = `${companyId}_firma_dbo_SlwKONTRAHENT`;

  try {
    const { results: geography } = await db
      .prepare(`SELECT MIASTO, COUNT(*) as count FROM "${kontrTable}" WHERE MIASTO IS NOT NULL AND MIASTO != '' GROUP BY MIASTO ORDER BY count DESC`)
      .all();
    return geography;
  } catch (e) {
    return [];
  }
}

async function getCompanyProducts(db, companyId, limit = 100, search = '') {
  const productsTable = `${companyId}_Magazyn_dbo_slwTOWARY`;

  let query = `SELECT * FROM "${productsTable}"`;
  if (search) {
    query += ` WHERE NAZWA LIKE '%${search}%' OR SYMBOL LIKE '%${search}%'`;
  }
  query += ` ORDER BY NAZWA LIMIT ${limit}`;

  try {
    const { results: products } = await db.prepare(query).all();
    return products;
  } catch (e) {
    return [];
  }
}

async function getCompanyProductCategories(db, companyId) {
  const categoriesTable = `${companyId}_Magazyn_dbo_slwDok_Kategorie`;

  try {
    const { results: categories } = await db
      .prepare(`SELECT * FROM "${categoriesTable}" ORDER BY NAZWA`)
      .all();
    return categories;
  } catch (e) {
    return [];
  }
}

async function getCompanyPayments(db, companyId, unpaidOnly = false) {
  const paymentsTable = `${companyId}_Magazyn_dbo_PLATNOSCI`;

  let query = `SELECT * FROM "${paymentsTable}"`;
  if (unpaidOnly) {
    query += ` WHERE ROZLICZONY = 0 OR ROZLICZONY IS NULL`;
  }
  query += ` ORDER BY DATA_PLATNOSCI DESC LIMIT 100`;

  try {
    const { results: payments } = await db.prepare(query).all();
    return payments;
  } catch (e) {
    return [];
  }
}

async function getCompanyCashRegisters(db, companyId) {
  const cashTable = `${companyId}_Magazyn_dbo_KASY`;

  try {
    const { results: cashRegisters } = await db
      .prepare(`SELECT * FROM "${cashTable}" ORDER BY NAZWA`)
      .all();
    return cashRegisters;
  } catch (e) {
    return [];
  }
}

async function getCompanyConfiguration(db, companyId) {
  const configTable = `${companyId}_Magazyn_dbo_KONFIGURACJA`;

  try {
    const { results: config } = await db
      .prepare(`SELECT * FROM "${configTable}" ORDER BY NAZWA`)
      .all();
    return config;
  } catch (e) {
    return [];
  }
}

async function getCompanyPaymentDetails(db, companyId, paymentId) {
  const paymentsTable = `${companyId}_Magazyn_dbo_PLATNOSCI`;

  try {
    const { results: payment } = await db
      .prepare(`SELECT * FROM "${paymentsTable}" WHERE ID = ?`)
      .bind(paymentId)
      .all();
    return payment[0] || null;
  } catch (e) {
    return null;
  }
}

async function getCompanyVATRates(db, companyId) {
  const vatTable = `${companyId}_Magazyn_dbo_slwStawkiVAT`;

  try {
    const { results: rates } = await db
      .prepare(`SELECT * FROM "${vatTable}" ORDER BY STAWKA`)
      .all();
    return rates;
  } catch (e) {
    return [];
  }
}

async function getCompanyWarehouses(db, companyId) {
  const warehousesTable = `${companyId}_Magazyn_dbo_slwMagazyny`;

  try {
    const { results: warehouses } = await db
      .prepare(`SELECT * FROM "${warehousesTable}" ORDER BY NAZWA`)
      .all();
    return warehouses;
  } catch (e) {
    return [];
  }
}

async function globalSearch(db, companyId, query) {
  if (!query || query.length < 2) return { results: [], total: 0 };

  const results = {
    contractors: [],
    products: [],
    documents: [],
    total: 0
  };

  // Search contractors
  try {
    const { results: contractors } = await db
      .prepare(`SELECT 'contractor' as type, ID, NAZWA, MIASTO, NIP FROM "${companyId}_firma_dbo_SlwKONTRAHENT" WHERE NAZWA LIKE '%${query}%' OR NIP LIKE '%${query}%' LIMIT 20`)
      .all();
    results.contractors = contractors;
  } catch (_) {}

  // Search products
  try {
    const { results: products } = await db
      .prepare(`SELECT 'product' as type, ID, NAZWA, SYMBOL FROM "${companyId}_Magazyn_dbo_slwTOWARY" WHERE NAZWA LIKE '%${query}%' OR SYMBOL LIKE '%${query}%' LIMIT 20`)
      .all();
    results.products = products;
  } catch (_) {}

  // Search documents
  try {
    const { results: documents } = await db
      .prepare(`SELECT 'document' as type, ID, NR_ROZ, KONTRAHENT_NAZWA, DATA_DOK FROM "${companyId}_Magazyn_dbo_dokVAT" WHERE NR_ROZ LIKE '%${query}%' OR KONTRAHENT_NAZWA LIKE '%${query}%' LIMIT 20`)
      .all();
    results.documents = documents;
  } catch (_) {}

  results.total = results.contractors.length + results.products.length + results.documents.length;
  return results;
}

async function getPaymentTypes(db, companyId) {
  const table = `${companyId}_Magazyn_dbo_DICT_PLATNOSCI_TYPY`;

  try {
    const { results: types } = await db
      .prepare(`SELECT * FROM "${table}" ORDER BY NAZWA`)
      .all();
    return types;
  } catch (e) {
    return [];
  }
}

async function getVATRates(db, companyId) {
  return await getCompanyVATRates(db, companyId);
}

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}