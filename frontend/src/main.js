/**
 * Main Application Entry Point
 * Handles SPA routing and page initialization.
 */

import { renderHomePage } from './pages/home.js';
import { renderChatPage } from './pages/chat.js';
import { renderDocumentsPage } from './pages/documents.js';

// Simple hash-based router
const routes = {
    '/': renderHomePage,
    '/chat': renderChatPage,
    '/documents': renderDocumentsPage,
};

function navigateTo(path) {
    window.location.hash = path;
}

function getRoute() {
    const hash = window.location.hash.slice(1) || '/';
    return hash;
}

function setActiveNav(page) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) {
            link.classList.add('active');
        }
    });
}

async function router() {
    const path = getRoute();
    const mainContent = document.getElementById('main-content');
    const renderFn = routes[path] || routes['/'];

    // Determine active page
    let pageName = 'home';
    if (path === '/chat') pageName = 'chat';
    else if (path === '/documents') pageName = 'documents';

    setActiveNav(pageName);

    // Add fade-out animation
    mainContent.style.opacity = '0';
    mainContent.style.transform = 'translateY(10px)';

    await new Promise(r => setTimeout(r, 150));

    // Render page
    renderFn(mainContent);

    // Add fade-in animation
    requestAnimationFrame(() => {
        mainContent.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        mainContent.style.opacity = '1';
        mainContent.style.transform = 'translateY(0)';
    });
}

// Toast notification system
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;flex-shrink:0;">
      ${type === 'success' ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
            : type === 'error' ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
                : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'}
    </svg>
    <span>${message}</span>
  `;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Make showToast globally available
window.showToast = showToast;
window.navigateTo = navigateTo;

// Listen for hash changes
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);
