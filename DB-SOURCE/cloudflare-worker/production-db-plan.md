# Production Database Migration Plan

## Cel
Stworzenie produkcyjnej bazy danych z CRUD na podstawie archiwalnej bazy danych

## Checklist

### ✅ Faza 1: Nowa Baza Danych
- [x] Stwórz nową bazę D1: `archiwum-produkcja`
- [x] Zapisz database_id: `a4627ed8-c467-42eb-8469-e3c24eb28e83`
- [ ] Dodaj binding do wrangler.toml

### 🔄 Faza 2: Schema Migration
- [ ] Analiza struktury archiwalnej bazy
- [ ] Eksport schematu z bazy archiwum
- [ ] Import schematu do bazy produkcyjnej
- [ ] Weryfikacja struktury tabel

### ⚙️ Faza 3: API Enhancement
- [ ] Dodanie endpointów POST (Create)
- [ ] Dodanie endpointów PUT (Update)
- [ ] Dodanie endpointów DELETE (Delete)
- [ ] Walidacja danych wejściowych
- [ ] Obsługa błędów dla operacji CRUD

### 📚 Faza 4: Documentation
- [ ] Aktualizacja Swagger dla endpointów CRUD
- [ ] Przykłady request/response
- [ ] Dokumentacja pól wymaganych

### 🚀 Faza 5: Deployment
- [ ] Aktualizacja wrangler.toml
- [ ] Testowanie endpointów CRUD
- [ ] Wdrożenie produkcyjne
- [ ] Testy integracyjne z FE

## Nowe Endpointy CRUD

### Dokumenty
- `POST /api/companies/{companyId}/documents` - Create new document
- `PUT /api/companies/{companyId}/documents/{documentId}` - Update document
- `DELETE /api/companies/{companyId}/documents/{documentId}` - Delete document

### Kontrahenci
- `POST /api/companies/{companyId}/contractors` - Create new contractor
- `PUT /api/companies/{companyId}/contractors/{contractorId}` - Update contractor
- `DELETE /api/companies/{companyId}/contractors/{contractorId}` - Delete contractor

### Produkty
- `POST /api/companies/{companyId}/products` - Create new product
- `PUT /api/companies/{companyId}/products/{productId}` - Update product
- `DELETE /api/companies/{companyId}/products/{productId}` - Delete product

### Płatności
- `POST /api/companies/{companyId}/payments` - Create new payment
- `PUT /api/companies/{companyId}/payments/{paymentId}` - Update payment
- `DELETE /api/companies/{companyId}/payments/{paymentId}` - Delete payment

## Struktura Request Body

### Przykład Create Document
```json
{
  "type": "TOW",
  "data_dok": "2025-10-03",
  "wartosc_netto": 1000.00,
  "wartosc_brutto": 1230.00,
  "kontrahent_nazwa": "Kontrahent Sp. z o.o.",
  "nr_roz": "FV/2025/001"
}
```

### Przykład Create Contractor
```json
{
  "nazwa": "Nowa Firma",
  "nip": "1234567890",
  "miasto": "Warszawa",
  "ulica": "ul. Testowa 1",
  "kod": "00-100"
}
```

## Bezpieczeństwo
- [ ] Walidacja danych wejściowych
- [ ] Obsługa SQL injection
- [ ] Autentykacja (w przyszłości)
- [ ] Logowanie operacji CRUD

## Testy
- [ ] Testy jednostkowe dla CRUD
- [ ] Testy integracyjne
- [ ] Testy wydajności
- [ ] Testy bezpieczeństwa

## Status
**Ostatnia aktualizacja:** 2025-10-03
**Status:** Faza 1 - Nowa baza utworzona ✅