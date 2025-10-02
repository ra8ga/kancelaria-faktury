// Archiwum Danych v3 - Dashboard JavaScript

class DashboardManager {
    constructor() {
        this.charts = new Map();
        this.data = null;
        this.refreshInterval = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.refreshDashboard();
        });

        // Export button
        document.getElementById('exportAllBtn')?.addEventListener('click', () => {
            this.exportAllData();
        });

        // Company card interactions
        document.querySelectorAll('.company-card').forEach(card => {
            this.setupCompanyCard(card);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    setupCompanyCard(card) {
        const companyId = card.dataset.companyId;
        if (!companyId) return;

        // Refresh company button
        const refreshBtn = card.querySelector('[onclick*="refreshCompanyData"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.refreshCompanyData(companyId);
            });
        }

        // Export company button
        const exportBtn = card.querySelector('[onclick*="exportCompanyData"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportCompanyData(companyId);
            });
        }

        // Add hover effect for charts
        const canvas = card.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('mouseenter', () => {
                this.highlightCompany(companyId);
            });

            canvas.addEventListener('mouseleave', () => {
                this.unhighlightCompany(companyId);
            });
        }
    }

    async loadInitialData() {
        try {
            window.showLoading('Ładowanie danych dashboarda...');

            // Load companies summary
            const companiesData = await window.apiClient.get('/api/companies_summary');
            this.data = companiesData;

            // Update UI
            this.updateSummaryCards(companiesData);
            this.initializeCompanyCharts(companiesData);
            this.initializeComparisonChart(companiesData);
            this.initializeDistributionChart(companiesData);

            // Add stagger animation
            this.addStaggerAnimation();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            window.showNotification('Błąd ładowania danych: ' + error.message, 'error');
        } finally {
            window.hideLoading();
        }
    }

    updateSummaryCards(companies) {
        let totalDocuments = 0;
        let totalVAT = 0;
        let totalCustomers = 0;

        companies.forEach(company => {
            const summary = company.summary || company.financial_summary;
            totalDocuments += summary.total_documents || 0;
            totalVAT += summary.total_vat || 0;
            totalCustomers += company.kontrahenci_count || 0;
        });

        // Update with animation
        this.animateNumber('totalDocuments', totalDocuments);
        this.animateNumber('totalVAT', totalVAT, 'PLN');
        this.animateNumber('totalCustomers', totalCustomers);
    }

    animateNumber(elementId, targetValue, suffix = '') {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = 0;
        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);

            element.textContent = window.utils.formatNumber(currentValue) + suffix;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    initializeCompanyCharts(companies) {
        companies.forEach(company => {
            const canvas = document.getElementById(`chart-${company.db_name}`);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const trends = company.trends || [];

            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: trends.map(t => this.formatMonth(t.month)),
                    datasets: [{
                        label: 'Dokumenty',
                        data: trends.map(t => t.documents),
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#667eea',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            cornerRadius: 8,
                            titleFont: {
                                size: 14,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: 13
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: false
                        },
                        y: {
                            display: false,
                            beginAtZero: true
                        }
                    }
                }
            });

            this.charts.set(company.db_name, chart);
        });
    }

    initializeComparisonChart(companies) {
        const canvas = document.getElementById('comparisonChart');
        if (!canvas || !companies.length) return;

        const ctx = canvas.getContext('2d');
        const colors = window.chartHelper.getColors(companies.length);

        const datasets = companies.map((company, index) => {
            const trends = company.trends || [];
            return {
                label: company.nazwa || company.db_name,
                data: trends.map(t => t.documents),
                borderColor: colors[index],
                backgroundColor: colors[index] + '20',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            };
        });

        const labels = companies[0]?.trends?.map(t => this.formatMonth(t.month)) || [];

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: window.chartHelper.createDefaultOptions('line')
        });
    }

    initializeDistributionChart(companies) {
        const canvas = document.getElementById('distributionChart');
        if (!canvas || !companies.length) return;

        const ctx = canvas.getContext('2d');
        const colors = window.chartHelper.getColors(companies.length);

        const data = companies.map(company => {
            const summary = company.summary || company.financial_summary;
            return summary.total_brutto || 0;
        });

        const labels = companies.map(company => company.nazwa || company.db_name);

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = window.utils.formatCurrency(context.raw);
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    formatMonth(monthString) {
        const date = new Date(monthString + '-01');
        return date.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' });
    }

    addStaggerAnimation() {
        const cards = document.querySelectorAll('.company-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';

            setTimeout(() => {
                card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    highlightCompany(companyId) {
        // Highlight company in comparison chart
        const comparisonChart = Chart.getChart('comparisonChart');
        if (comparisonChart) {
            const datasetIndex = this.data.findIndex(c => c.db_name === companyId);
            if (datasetIndex !== -1) {
                comparisonChart.setActiveElements([{
                    datasetIndex: datasetIndex,
                    index: comparisonChart.data.datasets[datasetIndex].data.length - 1
                }]);
                comparisonChart.update();
            }
        }
    }

    unhighlightCompany(companyId) {
        const comparisonChart = Chart.getChart('comparisonChart');
        if (comparisonChart) {
            comparisonChart.setActiveElements([]);
            comparisonChart.update();
        }
    }

    async refreshDashboard() {
        try {
            window.showLoading('Odświeżanie danych...');

            // Clear existing charts
            this.charts.forEach(chart => chart.destroy());
            this.charts.clear();

            // Reload data
            await this.loadInitialData();

            window.showNotification('Dashboard odświeżony pomyślnie', 'success');

        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            window.showNotification('Błąd odświeżania: ' + error.message, 'error');
        } finally {
            window.hideLoading();
        }
    }

    async refreshCompanyData(companyId) {
        try {
            const spinnerId = `company-spinner-${companyId}`;
            window.loadingManager.showSpinner(spinnerId);

            // Get fresh data for this company
            const response = await window.apiClient.get(`/api/financial_summary/${companyId}`);

            // Update the UI
            this.updateCompanyCard(companyId, response);

            window.showNotification(`Dane firmy ${companyId} odświeżone`, 'success');

        } catch (error) {
            console.error('Error refreshing company data:', error);
            window.showNotification('Błąd odświeżania danych firmy', 'error');
        } finally {
            const spinnerId = `company-spinner-${companyId}`;
            window.loadingManager.hideSpinner(spinnerId);
        }
    }

    updateCompanyCard(companyId, data) {
        const card = document.querySelector(`[data-company-id="${companyId}"]`);
        if (!card) return;

        // Update summary numbers
        const documentsEl = card.querySelector('.summary-value[data-type="documents"]');
        const customersEl = card.querySelector('.summary-value[data-type="customers"]');

        if (documentsEl) {
            this.animateNumberElement(documentsEl, data.total_documents);
        }

        if (customersEl) {
            // Get customer count from companies data
            const company = this.data.find(c => c.db_name === companyId);
            if (company) {
                this.animateNumberElement(customersEl, company.kontrahenci_count || 0);
            }
        }

        // Add flash effect
        card.style.transition = 'background-color 0.3s ease';
        card.style.backgroundColor = '#f0f9ff';
        setTimeout(() => {
            card.style.backgroundColor = '';
        }, 1000);
    }

    animateNumberElement(element, targetValue) {
        const startValue = parseInt(element.textContent.replace(/[^0-9]/g, '')) || 0;
        const duration = 500;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
            element.textContent = window.utils.formatNumber(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    async exportCompanyData(companyId) {
        try {
            window.showLoading('Eksportowanie danych firmy...');

            const response = await window.apiClient.get(`/export/${companyId}/json`);
            const filename = `${companyId}-export-${window.utils.formatDate(new Date(), 'short')}.json`;

            await window.exportManager.exportToJson(response, filename);

            window.showNotification(`Dane firmy ${companyId} wyeksportowane`, 'success');

        } catch (error) {
            console.error('Error exporting company data:', error);
            window.showNotification('Błąd eksportu danych firmy', 'error');
        } finally {
            window.hideLoading();
        }
    }

    async exportAllData() {
        try {
            window.showLoading('Eksportowanie wszystkich danych...');

            if (!this.data) {
                throw new Error('Brak danych do eksportu');
            }

            const filename = `archiwum-dane-all-${window.utils.formatDate(new Date(), 'short')}.json`;
            await window.exportManager.exportToJson(this.data, filename);

            window.showNotification('Wszystkie dane wyeksportowane pomyślnie', 'success');

        } catch (error) {
            console.error('Error exporting all data:', error);
            window.showNotification('Błąd eksportu danych', 'error');
        } finally {
            window.hideLoading();
        }
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + R: Refresh dashboard
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            this.refreshDashboard();
        }

        // Ctrl/Cmd + E: Export all data
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            this.exportAllData();
        }

        // Ctrl/Cmd + D: Toggle dark mode
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            window.themeManager.toggleTheme();
        }
    }

    startAutoRefresh() {
        // Auto-refresh every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.refreshDashboard();
        }, 5 * 60 * 1000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    destroy() {
        this.stopAutoRefresh();
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.dashboardManager) {
        window.dashboardManager.destroy();
    }
});