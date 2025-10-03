var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var index_default = {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const db = env.ARCHIWUM_DB;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (url.pathname === "/health") {
      return jsonResponse({ ok: true }, 200, corsHeaders);
    }
    if (url.pathname === "/api/companies_summary") {
      try {
        const results = await getCompaniesSummary(db);
        return jsonResponse(results, 200, corsHeaders);
      } catch (e) {
        return jsonResponse({ error: e.message }, 500, corsHeaders);
      }
    }
    if (url.pathname === "/api/database/stats") {
      try {
        const results = await getDatabaseStats(db);
        return jsonResponse(results, 200, corsHeaders);
      } catch (e) {
        return jsonResponse({ error: e.message }, 500, corsHeaders);
      }
    }
    if (url.pathname === "/api/companies") {
      try {
        const results = await getAllCompanies(db);
        return jsonResponse(results, 200, corsHeaders);
      } catch (e) {
        return jsonResponse({ error: e.message }, 500, corsHeaders);
      }
    }
    const companyMatch = url.pathname.match(/^\/api\/companies\/([^\/]+)/);
    if (companyMatch) {
      const companyId = companyMatch[1];
      if (url.pathname === `/api/companies/${companyId}`) {
        try {
          const results = await getCompanyDetails(db, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }
      if (url.pathname === `/api/companies/${companyId}/summary`) {
        try {
          const results = await getCompanyFinancialSummary(db, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }
      if (url.pathname === `/api/companies/${companyId}/documents`) {
        try {
          const limit = parseInt(url.searchParams.get("limit") || "50");
          const offset = parseInt(url.searchParams.get("offset") || "0");
          const results = await getCompanyDocuments(db, companyId, limit, offset);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }
      if (url.pathname === `/api/companies/${companyId}/documents/vat`) {
        try {
          const limit = parseInt(url.searchParams.get("limit") || "50");
          const results = await getCompanyVATDocuments(db, companyId, limit);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }
      if (url.pathname === `/api/companies/${companyId}/documents/tow`) {
        try {
          const limit = parseInt(url.searchParams.get("limit") || "50");
          const results = await getCompanyTOWDocuments(db, companyId, limit);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }
      if (url.pathname === `/api/companies/${companyId}/contractors`) {
        try {
          const limit = parseInt(url.searchParams.get("limit") || "100");
          const search = url.searchParams.get("search") || "";
          const results = await getCompanyContractors(db, companyId, limit, search);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }
      if (url.pathname === `/api/companies/${companyId}/contractors/geography`) {
        try {
          const results = await getCompanyContractorsGeography(db, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }
      if (url.pathname === `/api/companies/${companyId}/products`) {
        try {
          const limit = parseInt(url.searchParams.get("limit") || "100");
          const search = url.searchParams.get("search") || "";
          const results = await getCompanyProducts(db, companyId, limit, search);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }
      if (url.pathname === `/api/companies/${companyId}/products/categories`) {
        try {
          const results = await getCompanyProductCategories(db, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }
      if (url.pathname === `/api/companies/${companyId}/financial/payments`) {
        try {
          const unpaid = url.searchParams.get("unpaid") === "true";
          const results = await getCompanyPayments(db, companyId, unpaid);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }
      if (url.pathname === `/api/companies/${companyId}/financial/vat/rates`) {
        try {
          const results = await getCompanyVATRates(db, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }
      if (url.pathname === `/api/companies/${companyId}/warehouses`) {
        try {
          const results = await getCompanyWarehouses(db, companyId);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }
      if (url.pathname === `/api/companies/${companyId}/search/global`) {
        try {
          const query = url.searchParams.get("q") || "";
          const results = await globalSearch(db, companyId, query);
          return jsonResponse(results, 200, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: e.message }, 500, corsHeaders);
        }
      }
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
    }
    if (url.pathname === "/swagger.yaml" || url.pathname === "/openapi.yaml") {
      const swaggerYaml = `openapi: 3.0.3
info:
  title: Archiwum API
  description: REST API for accessing historical company data from migrated SQL Server databases.
  version: 1.0.0
servers:
  - url: http://archiwum-worker.ra8ga-archiwum.workers.dev
    description: Production server
paths:
  /health:
    get:
      summary: Health Check
      tags: [Health]
      responses:
        '200':
          description: API is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok:
                    type: boolean
              example:
                ok: true
  /api/companies_summary:
    get:
      summary: Get Companies Summary
      description: Returns summary of all companies with key metrics
      tags: [Companies]
      responses:
        '200':
          description: Successfully retrieved companies summary
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    db_name:
                      type: string
                    nazwa:
                      type: string
                    nip:
                      type: string
                    regon:
                      type: string
                    miasto:
                      type: string
                    ulica:
                      type: string
                    kod:
                      type: string
                    kontrahenci_count:
                      type: integer
                    dokumenty_count:
                      type: integer
components:
  schemas:
    CompanySummary:
      type: object
      properties:
        db_name: {type: string}
        nazwa: {type: string}
        nip: {type: string}
        regon: {type: string}
        miasto: {type: string}
        ulica: {type: string}
        kod: {type: string}
        kontrahenci_count: {type: integer}
        dokumenty_count: {type: integer}
tags:
  - name: Health
  - name: Companies`;
      return new Response(swaggerYaml, {
        headers: { "Content-Type": "application/x-yaml", ...corsHeaders }
      });
    }
    if (url.pathname === "/swagger" || url.pathname === "/") {
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
        <h1>\u{1F3DB}\uFE0F Archiwum API</h1>
        <p>REST API for Historical Company Data</p>
    </div>

    <div class="api-info">
        <strong>\u{1F680} Live API Base URL:</strong>
        <code>http://archiwum-worker.ra8ga-archiwum.workers.dev</code>
        <br>
        <small>Note: HTTP only (not HTTPS) for workers.dev subdomains</small>
    </div>

    <div id="swagger-ui"></div>

    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"><\/script>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"><\/script>
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
    <\/script>
</body>
</html>`;
      return new Response(swaggerHtml, {
        headers: { "Content-Type": "text/html", ...corsHeaders }
      });
    }
    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};
async function getCompaniesSummary(db) {
  const { results: firmaTables } = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_firma_dbo_FIRMA' ORDER BY name").all();
  const companies = [];
  for (const row of firmaTables) {
    const table = row.name;
    const dbName = table.replace("_firma_dbo_FIRMA", "");
    const { results: frows } = await db.prepare(`SELECT NAZWA, NIP, REGON FROM "${table}" LIMIT 1`).all();
    if (!frows || frows.length === 0) continue;
    const addrTable = `${dbName}_firma_dbo_ADRESY`;
    let miasto = null, ulica = null, kod = null;
    try {
      const { results: arows } = await db.prepare(`SELECT MIASTO, ULICA, KOD FROM "${addrTable}" LIMIT 1`).all();
      if (arows && arows.length) {
        miasto = arows[0].MIASTO ?? null;
        ulica = arows[0].ULICA ?? null;
        kod = arows[0].KOD ?? null;
      }
    } catch (_) {
    }
    const kontrTable = `${dbName}_firma_dbo_SlwKONTRAHENT`;
    let kontrahenciCount = 0;
    try {
      const { results: krows } = await db.prepare(`SELECT COUNT(*) AS cnt FROM "${kontrTable}"`).all();
      kontrahenciCount = krows && krows.length ? krows[0].cnt : 0;
    } catch (_) {
    }
    const dokTable = `${dbName}_Magazyn_dbo_dokTOW`;
    let dokumentyCount = 0;
    try {
      const { results: drows } = await db.prepare(`SELECT COUNT(*) AS cnt FROM "${dokTable}"`).all();
      dokumentyCount = drows && drows.length ? drows[0].cnt : 0;
    } catch (_) {
    }
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
__name(getCompaniesSummary, "getCompaniesSummary");
async function getDatabaseStats(db) {
  const { results: totalTables } = await db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE '_%'").all();
  const { results: companyTables } = await db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name LIKE '%_firma_dbo_FIRMA'").all();
  return {
    total_tables: totalTables[0]?.count || 0,
    total_companies: companyTables[0]?.count || 0,
    database_size: "~2MB",
    last_updated: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getDatabaseStats, "getDatabaseStats");
async function getAllCompanies(db) {
  return await getCompaniesSummary(db);
}
__name(getAllCompanies, "getAllCompanies");
async function getCompanyDetails(db, companyId) {
  const firmaTable = `${companyId}_firma_dbo_FIRMA`;
  const adresTable = `${companyId}_firma_dbo_ADRESY`;
  try {
    const { results: companyData } = await db.prepare(`SELECT * FROM "${firmaTable}" LIMIT 1`).all();
    let addressData = null;
    try {
      const { results: address } = await db.prepare(`SELECT * FROM "${adresTable}" LIMIT 1`).all();
      addressData = address[0] || null;
    } catch (_) {
    }
    return {
      company: companyData[0] || null,
      address: addressData,
      db_name: companyId
    };
  } catch (e) {
    throw new Error(`Company ${companyId} not found`);
  }
}
__name(getCompanyDetails, "getCompanyDetails");
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
    const { results: vatData } = await db.prepare(`SELECT COUNT(*) as count, SUM(CAST(COALESCE(n23, 0) AS REAL)) as netto, SUM(CAST(COALESCE(b23, 0) AS REAL)) as brutto FROM "${vatTable}"`).all();
    if (vatData.length > 0) {
      summary.vat_documents = vatData[0].count || 0;
      summary.total_netto = vatData[0].netto || 0;
      summary.total_brutto = vatData[0].brutto || 0;
    }
    const { results: towData } = await db.prepare(`SELECT COUNT(*) as count FROM "${towTable}"`).all();
    if (towData.length > 0) {
      summary.tow_documents = towData[0].count || 0;
    }
    const { results: kontrData } = await db.prepare(`SELECT COUNT(*) as count FROM "${kontrTable}"`).all();
    if (kontrData.length > 0) {
      summary.contractors = kontrData[0].count || 0;
    }
    summary.total_documents = summary.vat_documents + summary.tow_documents;
    summary.total_vat = summary.total_brutto - summary.total_netto;
  } catch (_) {
  }
  return summary;
}
__name(getCompanyFinancialSummary, "getCompanyFinancialSummary");
async function getCompanyDocuments(db, companyId, limit = 50, offset = 0) {
  const vatTable = `${companyId}_Magazyn_dbo_dokVAT`;
  const towTable = `${companyId}_Magazyn_dbo_dokTOW`;
  const documents = [];
  try {
    const { results: vatDocs } = await db.prepare(`SELECT 'VAT' as type, ID, DATA_DOK, WARTOSC_NETTO, WARTOSC_BRUTTO, KONTRAHENT_NAZWA, NR_ROZ FROM "${vatTable}" ORDER BY DATA_DOK DESC LIMIT ${limit} OFFSET ${offset}`).all();
    documents.push(...vatDocs);
  } catch (_) {
  }
  try {
    const { results: towDocs } = await db.prepare(`SELECT 'TOW' as type, ID, DATA_DOK, WARTOSC_NETTO, WARTOSC_BRUTTO, KONTRAHENT_NAZWA, NR_ROZ FROM "${towTable}" ORDER BY DATA_DOK DESC LIMIT ${limit} OFFSET ${offset}`).all();
    documents.push(...towDocs);
  } catch (_) {
  }
  return documents;
}
__name(getCompanyDocuments, "getCompanyDocuments");
async function getCompanyVATDocuments(db, companyId, limit = 50) {
  const vatTable = `${companyId}_Magazyn_dbo_dokVAT`;
  try {
    const { results: docs } = await db.prepare(`SELECT * FROM "${vatTable}" ORDER BY DATA_DOK DESC LIMIT ${limit}`).all();
    return docs;
  } catch (e) {
    return [];
  }
}
__name(getCompanyVATDocuments, "getCompanyVATDocuments");
async function getCompanyTOWDocuments(db, companyId, limit = 50) {
  const towTable = `${companyId}_Magazyn_dbo_dokTOW`;
  try {
    const { results: docs } = await db.prepare(`SELECT * FROM "${towTable}" ORDER BY DATA_DOK DESC LIMIT ${limit}`).all();
    return docs;
  } catch (e) {
    return [];
  }
}
__name(getCompanyTOWDocuments, "getCompanyTOWDocuments");
async function getCompanyContractors(db, companyId, limit = 100, search = "") {
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
__name(getCompanyContractors, "getCompanyContractors");
async function getCompanyContractorsGeography(db, companyId) {
  const kontrTable = `${companyId}_firma_dbo_SlwKONTRAHENT`;
  try {
    const { results: geography } = await db.prepare(`SELECT MIASTO, COUNT(*) as count FROM "${kontrTable}" WHERE MIASTO IS NOT NULL AND MIASTO != '' GROUP BY MIASTO ORDER BY count DESC`).all();
    return geography;
  } catch (e) {
    return [];
  }
}
__name(getCompanyContractorsGeography, "getCompanyContractorsGeography");
async function getCompanyProducts(db, companyId, limit = 100, search = "") {
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
__name(getCompanyProducts, "getCompanyProducts");
async function getCompanyProductCategories(db, companyId) {
  const categoriesTable = `${companyId}_Magazyn_dbo_slwDok_Kategorie`;
  try {
    const { results: categories } = await db.prepare(`SELECT * FROM "${categoriesTable}" ORDER BY NAZWA`).all();
    return categories;
  } catch (e) {
    return [];
  }
}
__name(getCompanyProductCategories, "getCompanyProductCategories");
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
__name(getCompanyPayments, "getCompanyPayments");
async function getCompanyVATRates(db, companyId) {
  const vatTable = `${companyId}_Magazyn_dbo_slwStawkiVAT`;
  try {
    const { results: rates } = await db.prepare(`SELECT * FROM "${vatTable}" ORDER BY STAWKA`).all();
    return rates;
  } catch (e) {
    return [];
  }
}
__name(getCompanyVATRates, "getCompanyVATRates");
async function getCompanyWarehouses(db, companyId) {
  const warehousesTable = `${companyId}_Magazyn_dbo_slwMagazyny`;
  try {
    const { results: warehouses } = await db.prepare(`SELECT * FROM "${warehousesTable}" ORDER BY NAZWA`).all();
    return warehouses;
  } catch (e) {
    return [];
  }
}
__name(getCompanyWarehouses, "getCompanyWarehouses");
async function globalSearch(db, companyId, query) {
  if (!query || query.length < 2) return { results: [], total: 0 };
  const results = {
    contractors: [],
    products: [],
    documents: [],
    total: 0
  };
  try {
    const { results: contractors } = await db.prepare(`SELECT 'contractor' as type, ID, NAZWA, MIASTO, NIP FROM "${companyId}_firma_dbo_SlwKONTRAHENT" WHERE NAZWA LIKE '%${query}%' OR NIP LIKE '%${query}%' LIMIT 20`).all();
    results.contractors = contractors;
  } catch (_) {
  }
  try {
    const { results: products } = await db.prepare(`SELECT 'product' as type, ID, NAZWA, SYMBOL FROM "${companyId}_Magazyn_dbo_slwTOWARY" WHERE NAZWA LIKE '%${query}%' OR SYMBOL LIKE '%${query}%' LIMIT 20`).all();
    results.products = products;
  } catch (_) {
  }
  try {
    const { results: documents } = await db.prepare(`SELECT 'document' as type, ID, NR_ROZ, KONTRAHENT_NAZWA, DATA_DOK FROM "${companyId}_Magazyn_dbo_dokVAT" WHERE NR_ROZ LIKE '%${query}%' OR KONTRAHENT_NAZWA LIKE '%${query}%' LIMIT 20`).all();
    results.documents = documents;
  } catch (_) {
  }
  results.total = results.contractors.length + results.products.length + results.documents.length;
  return results;
}
__name(globalSearch, "globalSearch");
async function getPaymentTypes(db, companyId) {
  const table = `${companyId}_Magazyn_dbo_DICT_PLATNOSCI_TYPY`;
  try {
    const { results: types } = await db.prepare(`SELECT * FROM "${table}" ORDER BY NAZWA`).all();
    return types;
  } catch (e) {
    return [];
  }
}
__name(getPaymentTypes, "getPaymentTypes");
async function getVATRates(db, companyId) {
  return await getCompanyVATRates(db, companyId);
}
__name(getVATRates, "getVATRates");
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}
__name(jsonResponse, "jsonResponse");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
