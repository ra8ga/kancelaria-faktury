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

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}