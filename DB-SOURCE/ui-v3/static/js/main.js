// Archiwum Danych v3 - Main JavaScript

// Theme Management
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupThemeToggle();
        this.setupSystemPreference();
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.currentTheme = theme;
        this.updateThemeToggleIcon();
    }

    toggleTheme() {
        const themes = ['light', 'dark', 'sepia'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.applyTheme(themes[nextIndex]);
    }

    updateThemeToggleIcon() {
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            const icons = {
                'light': 'fas fa-moon',
                'dark': 'fas fa-sun',
                'sepia': 'fas fa-coffee'
            };
            icon.className = icons[this.currentTheme] || 'fas fa-moon';
        }
    }

    setupThemeToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleTheme());
        }
    }

    setupSystemPreference() {
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeQuery.addListener((e) => {
                if (!localStorage.getItem('theme')) {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }
}

// Loading Management
class LoadingManager {
    constructor() {
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingSpinners = new Map();
    }

    show(message = 'Ładowanie...') {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('d-none');
            const messageEl = this.loadingOverlay.querySelector('.loading-spinner p');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
    }

    hide() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('d-none');
        }
    }

    showSpinner(id) {
        const spinner = document.createElement('div');
        spinner.className = 'spinner-border spinner-border-sm text-primary me-2';
        spinner.setAttribute('role', 'status');
        spinner.innerHTML = '<span class="visually-hidden">Ładowanie...</span>';

        const container = document.getElementById(id);
        if (container) {
            this.loadingSpinners.set(id, spinner);
            container.appendChild(spinner);
        }
    }

    hideSpinner(id) {
        const spinner = this.loadingSpinners.get(id);
        if (spinner) {
            spinner.remove();
            this.loadingSpinners.delete(id);
        }
    }
}

// Notification System
class NotificationManager {
    constructor() {
        this.container = this.createContainer();
    }

    createContainer() {
        const container = document.createElement('div');
        container.className = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            max-width: 400px;
        `;
        document.body.appendChild(container);
        return container;
    }

    show(message, type = 'info', duration = 5000) {
        const notification = this.createNotification(message, type);
        this.container.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            this.remove(notification);
        }, duration);

        return notification;
    }

    createNotification(message, type) {
        const colors = {
            'success': '#10b981',
            'error': '#ef4444',
            'warning': '#f59e0b',
            'info': '#3b82f6'
        };

        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.style.cssText = `
            background: ${colors[type] || colors.info};
            color: white;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            cursor: pointer;
        `;

        notification.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div class="me-3">${message}</div>
                <button class="btn-close btn-close-white" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        return notification;
    }

    remove(notification) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
}

// API Client
class ApiClient {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
        this.loadingManager = new LoadingManager();
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async get(endpoint) {
        return this.request(endpoint);
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
}

// Chart Helper
class ChartHelper {
    static getColors(count = 4) {
        const colors = [
            '#667eea', '#f59e0b', '#10b981', '#ef4444',
            '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6'
        ];
        return colors.slice(0, count);
    }

    static createDefaultOptions(type = 'line') {
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: type === 'pie' ? 'bottom' : 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                }
            }
        };

        if (type === 'line' || type === 'bar') {
            baseOptions.scales = {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            };
        }

        return baseOptions;
    }

    static formatNumber(num) {
        return new Intl.NumberFormat('pl-PL').format(num);
    }

    static formatCurrency(num) {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: 'PLN'
        }).format(num);
    }
}

// Export Manager
class ExportManager {
    constructor(apiClient) {
        this.api = apiClient;
    }

    async exportToJson(data, filename = 'export.json') {
        const jsonData = JSON.stringify(data, null, 2);
        this.downloadFile(jsonData, filename, 'application/json');
    }

    async exportToCsv(data, filename = 'export.csv') {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Data must be a non-empty array');
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',')
                    ? `"${value}"`
                    : value;
            }).join(','))
        ].join('\n');

        this.downloadFile(csvContent, filename, 'text/csv');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
}

// Utility Functions
const Utils = {
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Format date
    formatDate(date, format = 'short') {
        const options = {
            'short': { year: 'numeric', month: 'short', day: 'numeric' },
            'long': { year: 'numeric', month: 'long', day: 'numeric' },
            'time': { hour: '2-digit', minute: '2-digit' }
        };
        return new Intl.DateTimeFormat('pl-PL', options[format]).format(new Date(date));
    },

    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy text: ', err);
            return false;
        }
    },

    // Get URL parameters
    getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },

    // Set URL parameter without reload
    setUrlParam(key, value) {
        const url = new URL(window.location);
        url.searchParams.set(key, value);
        window.history.replaceState({}, '', url);
    }
};

// Initialize global instances
window.themeManager = new ThemeManager();
window.loadingManager = new LoadingManager();
window.notificationManager = new NotificationManager();
window.apiClient = new ApiClient();
window.exportManager = new ExportManager(window.apiClient);
window.chartHelper = ChartHelper;
window.utils = Utils;

// Global functions
window.showNotification = (message, type, duration) => {
    return window.notificationManager.show(message, type, duration);
};

window.showLoading = (message) => {
    window.loadingManager.show(message);
};

window.hideLoading = () => {
    window.loadingManager.hide();
};

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Add page animations
    document.body.classList.add('fade-in');
});

// Export data button handler
document.getElementById('exportData')?.addEventListener('click', async () => {
    try {
        window.loadingManager.show('Eksportowanie danych...');

        const response = await window.apiClient.get('/api/companies_summary');
        await window.exportManager.exportToJson(response, `archiwum-dane-${utils.formatDate(new Date(), 'short')}.json`);

        window.showNotification('Dane wyeksportowane pomyślnie', 'success');
    } catch (error) {
        window.showNotification('Błąd eksportu danych: ' + error.message, 'error');
    } finally {
        window.loadingManager.hide();
    }
});

// Handle navigation
document.addEventListener('click', (e) => {
    if (e.target.matches('.nav-link') || e.target.closest('.nav-link')) {
        const link = e.target.matches('.nav-link') ? e.target : e.target.closest('.nav-link');

        // Add loading state for navigation
        if (!link.href.includes('#') && link.href !== window.location.href) {
            window.loadingManager.show('Ładowanie strony...');
        }
    }
});

// Handle form submissions
document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (form.tagName === 'FORM') {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn?.textContent;

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Przetwarzanie...';
        }

        try {
            // Handle form submission based on data-action
            const action = form.dataset.action;
            if (action) {
                await handleFormAction(form, action);
            }
        } catch (error) {
            window.showNotification('Błąd formularza: ' + error.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }
});

async function handleFormAction(form, action) {
    // This can be extended to handle different form actions
    console.log('Form action:', action, form);
}