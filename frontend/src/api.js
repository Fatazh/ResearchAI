/**
 * API Client Module
 * Handles all communication with the FastAPI backend.
 */

const API_BASE = '/api';

async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    };

    // Remove Content-Type for FormData (file uploads)
    if (config.body instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    const response = await fetch(url, config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

export const api = {
    // Documents
    async uploadDocument(file) {
        const formData = new FormData();
        formData.append('file', file);
        return request('/documents/upload', { method: 'POST', body: formData });
    },

    async getDocuments() {
        return request('/documents');
    },

    async getDocument(docId) {
        return request(`/documents/${docId}`);
    },

    async deleteDocument(docId) {
        return request(`/documents/${docId}`, { method: 'DELETE' });
    },

    async ingestExisting() {
        return request('/documents/ingest-existing', { method: 'POST' });
    },

    async getStats() {
        return request('/documents/stats');
    },

    // Query & Chat
    async askQuestion(question, topK = 5) {
        return request('/query', {
            method: 'POST',
            body: JSON.stringify({ question, top_k: topK }),
        });
    },

    // Summarize
    async summarizeDocument(docId) {
        return request('/summarize', {
            method: 'POST',
            body: JSON.stringify({ doc_id: docId }),
        });
    },

    // Chat History
    async getChatHistory() {
        return request('/chat-history');
    },

    // Health
    async healthCheck() {
        return request('/health');
    },
};
