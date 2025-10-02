// Archiwum Danych v0 - Główne funkcje

let currentCustomerId = null;
let currentCustomerName = null;

document.addEventListener('DOMContentLoaded', function() {
    updateCompanyDisplay();
    setupCustomerSelection();
    setupDocumentLoading();
    setupSearch();
    setupCompanyChange();
});

function updateCompanyDisplay() {
    fetch('/get_current_company')
        .then(response => response.json())
        .then(data => {
            if (data.company_info) {
                updateHeader(data.company_info);
            }
        })
        .catch(error => console.error('Error:', error));
}

function updateHeader(company) {
    const header = document.querySelector('.header');
    if (header) {
        header.innerHTML = `
            <h1>📋 Archiwum Danych</h1>
            <div class="company-info">
                <strong>Firma:</strong> ${company.nazwa || company.db_name} |
                <span>NIP: ${company.nip || 'brak'}</span> |
                <span>Kontrahenci: ${company.kontrahenci_count || 0}</span>
            </div>
        `;
    }
}

function setupCustomerSelection() {
    document.querySelectorAll('.customer-item').forEach(item => {
        item.addEventListener('click', function() {
            selectCustomer(this);
        });
    });
}

function selectCustomer(element) {
    // Usuń aktywną klasę z innych elementów
    document.querySelectorAll('.customer-item').forEach(item => {
        item.classList.remove('active');
    });

    // Dodaj aktywną klasę
    element.classList.add('active');

    // Pobierz dane kontrahenta
    currentCustomerId = element.dataset.customerId;
    currentCustomerName = element.dataset.customerName;

    // Załaduj dokumenty
    loadCustomerDocuments(currentCustomerId, currentCustomerName);
}

function loadCustomerDocuments(customerId, customerName) {
    const documentsList = document.querySelector('.documents-list');
    if (!documentsList) return;

    // Pokaż loading
    documentsList.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner"></i>
            Ładowanie dokumentów...
        </div>
    `;

    // Pobierz dokumenty
    fetch(`/customer_documents/${customerId}?name=${encodeURIComponent(customerName)}`)
        .then(response => response.json())
        .then(data => {
            if (data.documents && data.documents.length > 0) {
                renderDocuments(data.documents);
            } else {
                renderEmptyDocuments();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            renderErrorDocuments();
        });
}

function renderDocuments(documents) {
    const documentsList = document.querySelector('.documents-list');

    let html = '';
    documents.forEach(doc => {
        html += `
            <div class="document-item">
                <div class="document-type">${doc.rodzaj}</div>
                <div class="document-header">
                    <div class="document-number">${doc.numer || 'Brak numeru'}</div>
                    <div class="document-date">${formatDate(doc.data_wyst)}</div>
                </div>
                ${doc.opis ? `<div class="document-description">${doc.opis}</div>` : ''}
                <div class="document-amounts">
                    <div class="amount">
                        <i class="fas fa-chart-line"></i>
                        Netto: <strong>${formatAmount(doc.netto)}</strong>
                    </div>
                    <div class="amount">
                        <i class="fas fa-calculator"></i>
                        Brutto: <strong>${formatAmount(doc.brutto)}</strong>
                    </div>
                    ${doc.vat > 0 ? `
                    <div class="amount">
                        <i class="fas fa-percentage"></i>
                        VAT: <strong>${formatAmount(doc.vat)}</strong>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    });

    documentsList.innerHTML = html;
}

function renderEmptyDocuments() {
    const documentsList = document.querySelector('.documents-list');
    documentsList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-file-alt"></i>
            <h3>Brak dokumentów</h3>
            <p>Nie znaleziono dokumentów powiązanych z tym kontrahentem</p>
        </div>
    `;
}

function renderErrorDocuments() {
    const documentsList = document.querySelector('.documents-list');
    documentsList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Błąd ładowania</h3>
            <p>Nie udało się załadować dokumentów. Spróbuj ponownie.</p>
        </div>
    `;
}

function setupSearch() {
    const searchInput = document.getElementById('customerSearch');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                performSearch();
            }, 500);
        });

        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
}

function performSearch() {
    const searchInput = document.getElementById('customerSearch');
    const searchTerm = searchInput.value.trim();

    const url = new URL(window.location);
    if (searchTerm) {
        url.searchParams.set('search', searchTerm);
        url.searchParams.set('page', '1');
    } else {
        url.searchParams.delete('search');
    }

    window.location.href = url.toString();
}

function setupCompanyChange() {
    const changeCompanyBtn = document.getElementById('changeCompanyBtn');
    if (changeCompanyBtn) {
        changeCompanyBtn.addEventListener('click', function() {
            window.location.href = '/select_company';
        });
    }
}

function setupDocumentLoading() {
    // Automatycznie wybierz pierwszego kontrahenta jeśli nie ma aktywnego
    setTimeout(() => {
        if (!currentCustomerId && !document.querySelector('.empty-state')) {
            const firstCustomer = document.querySelector('.customer-item');
            if (firstCustomer) {
                selectCustomer(firstCustomer);
            }
        }
    }, 100);
}

function formatDate(dateStr) {
    if (!dateStr) return 'Brak daty';

    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return dateStr; // Zwróć oryginał jeśli nie jest poprawną datą
        }
        return date.toLocaleDateString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return dateStr;
    }
}

function formatAmount(amount) {
    if (!amount || amount === 0) return '0,00 zł';

    try {
        const num = parseFloat(amount);
        if (isNaN(num)) return '0,00 zł';

        return num.toLocaleString('pl-PL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' zł';
    } catch (e) {
        return '0,00 zł';
    }
}

// Funkcje dla selektora firm
function selectCompany(companyId) {
    fetch('/select_company', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            company_id: companyId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/';
        } else {
            showNotification('Nie udało się wybrać firmy', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Wystąpił błąd', 'error');
    });
}

// Szybka zmiana firmy z sidebara
function quickCompanyChange() {
    const select = document.getElementById('companySelect');
    const selectedCompanyId = select.value;

    if (selectedCompanyId) {
        fetch('/quick_company_change', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                company_id: selectedCompanyId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Zmieniono firmę', 'success');
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 500);
            } else {
                showNotification('Nie udało się zmienić firmy', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Wystąpił błąd', 'error');
        });
    }
}

function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type === 'error' ? 'danger' : type} position-fixed top-0 end-0 m-3`;
    toast.style.zIndex = '9999';
    toast.style.minWidth = '250px';
    toast.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
        ${message}
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}