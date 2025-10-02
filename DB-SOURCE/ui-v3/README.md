# 🚀 UI-v3 - Advanced Analytics Dashboard

Next generation interface dla archiwum danych firmowych z zaawansowanymi funkcjami analitycznymi, wizualizacjami i eksportem.

## 🎯 Główne Cechy

### 📊 Dashboard Analityczny
- **Karty z metrykami** - kluczowe wskaźniki w czasie rzeczywistym
- **Interaktywne wykresy** - trendy, porównania, analizy
- **Widok firmowy** - karty firm z podsumowaniami finansowymi
- **Geografia kontrahentów** - mapa rozmieszczenia klientów

### 🔍 Zaawansowane Wyszukiwanie
- **Wyszukiwanie wielokryterialne** - firmy, daty, kwoty, typy dokumentów
- **Zapisane zapytania** - ulubione wyszukiwania
- **Historia wyszukiwania** - szybki dostęp do poprzednich wyników
- **Szybkie filtry** - gotowe preset wyszukiwań

### 📈 Analiza Biznesowa
- **Analiza finansowa** - sumy VAT, przychody, trendy
- **Top kontrahenci** - ranking klientów według obrotów
- **Analiza geograficzna** - rozkład kontrahentów według lokalizacji
- **Trendy czasowe** - miesięczne i roczne analizy

### 🎨 Nowoczesny Interfejs
- **Responsive design** - optymalizacja mobile i desktop
- **Dark/Light mode** - przełączanie motywów
- **Animacje i mikrointerakcje** - płynne przejścia
- **Bootstrap 5** - nowoczesny framework CSS

### 📤 Funkcje Eksportu
- **Eksport JSON** - pełne dane strukturalne
- **Eksport CSV** - dane tabelaryczne
- **Eksport PDF** - raporty gotowe do druku
- **API endpoints** - integracja z zewnętrznymi systemami

## 🛠️ Technologie

### Backend
- **Python 3** + **Flask**
- **SQLite** (przez db-api)
- **REST API** - endpoints dla analityki

### Frontend
- **HTML5** + **CSS3** + **JavaScript ES6+**
- **Bootstrap 5** - framework UI
- **Chart.js** - wykresy i wizualizacje
- **Font Awesome** - ikony

### Architektura
- **SPA (Single Page Application)**
- **Component-based architecture**
- **API-first design**
- **Progressive Enhancement**

## 📁 Struktura Projektu

```
ui-v3/
├── 📄 README.md                   # Ta dokumentacja
├── 📄 v3-plan.md                  # Szczegółowy plan rozwoju
├── 🐍 app.py                      # Główna aplikacja Flask
├── 📁 static/
│   ├── 📁 css/
│   │   ├── main.css              # Główne style
│   │   ├── dashboard.css         # Style dashboarda
│   │   └── themes.css            # Motywy (dark/light)
│   ├── 📁 js/
│   │   ├── main.js               # Główny JavaScript
│   │   └── dashboard.js          # Logika dashboarda
│   └── 📁 images/                # Zasoby graficzne
├── 📁 templates/
│   ├── 📄 base.html              # Bazowy szablon
│   ├── 📄 dashboard.html         # Główny dashboard
│   ├── 📄 analytics.html         # Analiza szczegółowa firmy
│   └── 📄 search.html            # Wyszukiwanie zaawansowane
└── 📁 components/               # Komponenty reużywalne
```

## 🚀 Szybki Start

### 1. Uruchomienie aplikacji
```bash
cd ui-v3
python3 app.py
```

### 2. Otwórz w przeglądarce
```
http://localhost:5002
```

### 3. Główne funkcje dostępne z poziomu UI:
- **Dashboard** - http://localhost:5002/
- **Wyszukiwanie** - http://localhost:5002/search
- **Analiza firm** - http://localhost:5002/analytics/{firma_id}

## 📊 Funkcjonalności

### Dashboard Główny
- **Podsumowanie dla wszystkich firm**
- **Karty metryk z animowanymi licznikami**
- **Wykresy trendów dla każdej firmy**
- **Porównanie między firmami**
- **Automatyczne odświeżanie (5 min)**

### Analiza Szczegółowa
- **Dane finansowe firmy** (netto, VAT, brutto)
- **Wykresy trendów (24 miesiące)**
- **Analiza VAT według stawek**
- **Top kontrahenci z akcjami**
- **Geografia kontrahentów**
- **Eksport danych firmy**

### Wyszukiwanie Zaawansowane
- **Filtry po firmach** - wybór konkretnych podmiotów
- **Zakresy dat** - analiza okresów czasowych
- **Typy dokumentów** - faktury, WZ, PZ itp.
- **Zakresy kwotowe** - filtrowanie po wartościach
- **Słowo kluczowe** - wyszukiwanie pełnotekstowe
- **Zapisywanie zapytań** - ulubione filtry

## 🎨 Design System

### Kolory
- **Primary**: #2563eb (Blue 600)
- **Secondary**: #7c3aed (Purple 600)
- **Success**: #10b981 (Green 500)
- **Warning**: #f59e0b (Amber 500)
- **Danger**: #ef4444 (Red 500)

### Komponenty
- **Cards** - Material Design z hover effects
- **Charts** - Chart.js z responsywnością
- **Tables** - Bootstrap z sortowaniem
- **Forms** - Walidacja i mikrointerakcje

### Motywy
- **Light** - domyślny jasny motyw
- **Dark** - ciemny motyw dla pracy nocnej
- **Sepia** - ciepły motyw relaksujący dla oczu
- **High Contrast** - zwiększona dostępność

## 📈 API Endpoints

### Dashboard
```
GET /api/companies_summary          # Podsumowanie firm
GET /api/financial_summary/{id}    # Finanse firmy
GET /api/trends/{id}               # Trendy dokumentów
GET /api/top_customers/{id}        # Top kontrahenci
```

### Wyszukiwanie
```
POST /api/advanced_search          # Zaawansowane wyszukiwanie
GET  /api/search/suggestions       # Sugestie wyszukiwania
POST /api/search/save              # Zapisz zapytanie
```

### Eksport
```
GET /export/{id}/json              # Eksport JSON
GET /export/{id}/csv               # Eksport CSV
GET /export/{id}/pdf               # Eksport PDF
```

## 🔧 Konfiguracja

### Środowisko deweloperskie
```python
# app.py
app.run(host='0.0.0.0', port=5002, debug=True)
```

### Środowisko produkcyjne
```python
# Z użyciem Gunicorn
gunicorn -w 4 -b 0.0.0.0:5002 app:app
```

### Zmienne środowiskowe
```bash
export FLASK_ENV=production
export DATABASE_PATH=../db-api/dane_archiwalne.db
export DEBUG=False
```

## 🎯 Użycie

### Podstawowe operacje
1. **Dashboard** - przeglądaj podsumowania firm
2. **Kliknij firmę** - przejdź do szczegółowej analizy
3. **Użyj wyszukiwania** - znajdź konkretne dane
4. **Eksportuj wyniki** - pobierz dane w różnych formatach

### Skróty klawiszowe
- **Ctrl/Cmd + R** - odśwież dashboard
- **Ctrl/Cmd + E** - eksportuj wszystkie dane
- **Ctrl/Cmd + D** - przełącz tryb ciemny/jasny

### Wyszukiwanie zaawansowane
1. **Wybierz firmy** - zaznacz interesujące Cię podmioty
2. **Ustaw zakres dat** - filtruj po okresie
3. **Dodaj kryteria** - typy dokumentów, kwoty
4. **Zapisz zapytanie** - użyj ponownie w przyszłości

## 📊 Przykładowe Użycia

### Znalezienie wszystkich faktury z ostatnich 30 dni
1. Przejdź do wyszukiwania zaawansowanego
2. Wybierz wszystkie firmy
3. Ustaw zakres dat: ostatnie 30 dni
4. Typ dokumentu: FV
5. Kliknij "Szukaj"

### Analiza kontrahentów z Warszawy
1. Przejdź do analizy firmy
2. Sprawdź sekcję "Geografia Kontrahentów"
3. Kliknij na wykresie "Warszawa"
4. Zobacz listę kontrahentów z tego miasta

### Eksport danych firmy
1. Przejdź do analizy firmy
2. Kliknij "Eksportuj analizę"
3. Wybierz format (JSON/CSV/PDF)
4. Pobierz plik

## 🔮 Rozwój i Planowane Funkcje

### v3.1 (Short term)
- [ ] **Real-time updates** - WebSocket
- [ ] **Advanced filters** - więcej opcji filtrowania
- [ ] **Custom dashboards** - użytkownicy mogą tworzyć własne dashboardy
- [ ] **Data validation** - sprawdzanie jakości danych

### v3.2 (Medium term)
- [ ] **Machine Learning** - predykcje trendów
- [ ] **Advanced exports** - Excel z wykresami
- [ ] **User management** - konta użytkowników
- [ ] **API versioning** - stabilne API

### v4.0 (Long term)
- [ ] **Multi-tenant** - wsparcie dla wielu organizacji
- [ ] **Real-time collaboration** - wielu użytkowników jednocześnie
- [ ] **Advanced analytics** - statystyka zaawansowana
- [ ] **Mobile app** - natywna aplikacja mobilna

## 🐛 Debugowanie

### Narzędzia deweloperskie
- **Chrome DevTools** - debugging frontend
- **Flask debug mode** - debugging backend
- **SQLite Browser** - przeglądanie bazy danych
- **Postman** - testowanie API

### Logi
```python
# W app.py
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.info('Application started')
```

### Testowanie API
```bash
# Test dashboard API
curl http://localhost:5002/api/companies_summary

# Test wyszukiwania
curl -X POST http://localhost:5002/api/advanced_search \
  -H "Content-Type: application/json" \
  -d '{"firms": ["ADWKAROLINA"], "search_text": "test"}'
```

## 📚 Dokumentacja Techniczna

### Kluczowe komponenty
- **DashboardManager** - zarządzanie dashboardem
- **SearchManager** - obsługa wyszukiwania
- **AnalyticsManager** - analiza danych
- **ThemeManager** - zarządzanie motywami
- **ExportManager** - eksport danych

### Architektura JavaScript
- **ES6 Modules** - nowoczesny JavaScript
- **Async/Await** - obsługa operacji asynchronicznych
- **Event-driven** - obsługa zdarzeń
- **Component-based** - komponenty reużywalne

### Performance
- **Lazy loading** - ładowanie na żądanie
- **Caching** - pamięć podręczna wyników
- **Debouncing** - optymalizacja wyszukiwania
- **Virtual scrolling** - dla dużych list

## 🤝 Współpraca

### Development workflow
1. **Fork** repozytorium
2. **Feature branch** - gałąź dla nowych funkcji
3. **Pull request** - code review
4. **Tests** - jednostkowe i integracyjne
5. **Deploy** - automatyczne wdrożenie

### Code standards
- **Python PEP 8** - standard kodu Python
- **JavaScript ESLint** - standard kodu JS
- **Bootstrap** - konsystentny UI
- **Accessibility** - WCAG 2.1 AA

---

**Status**: ✅ **W PRODUKCJI**
**Wersja**: 3.0.0
**Data wydania**: 2025-10-01
**Autor**: AI Assistant
**Technologia**: Python, Flask, JavaScript, Chart.js