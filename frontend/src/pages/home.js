/**
 * Home Page
 * Landing page with hero, stats, features & quick-ask search box.
 */

import { api } from '../api.js';

export function renderHomePage(container) {
    container.innerHTML = `
    <div class="page-container">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-badge">
          <span class="pulse-dot"></span>
          RAG-Powered Research Assistant
        </div>
        <h1 class="hero-title">
          Your Research,<br/>
          <span class="gradient-text">Supercharged with AI</span>
        </h1>
        <p class="hero-subtitle">
          Upload your PDF documents and let AI do the heavy lifting. Ask questions, get instant answers with citations, and discover insights across your entire research library.
        </p>
        <div class="hero-actions">
          <a href="#/chat" class="btn btn-primary btn-lg" id="hero-start-chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Start Researching
          </a>
          <a href="#/documents" class="btn btn-secondary btn-lg" id="hero-upload-docs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload Documents
          </a>
        </div>
      </section>

      <!-- Stats -->
      <section class="stats-grid" id="stats-grid">
        <div class="stat-card">
          <div class="stat-icon docs">📄</div>
          <div class="stat-number" id="stat-docs">—</div>
          <div class="stat-label">Documents Indexed</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon chats">💬</div>
          <div class="stat-number" id="stat-chats">—</div>
          <div class="stat-label">Questions Answered</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon chunks">🧩</div>
          <div class="stat-number" id="stat-chunks">—</div>
          <div class="stat-label">Knowledge Chunks</div>
        </div>
      </section>

      <!-- Quick Ask -->
      <section class="quick-ask-section">
        <h2 class="section-title">Ask Your Research</h2>
        <form class="quick-ask-box" id="quick-ask-form">
          <input
            type="text"
            class="quick-ask-input"
            id="quick-ask-input"
            placeholder="Ask anything about your research documents..."
            autocomplete="off"
          />
          <button type="submit" class="quick-ask-btn" id="quick-ask-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <span>Ask</span>
          </button>
        </form>
      </section>

      <!-- Features -->
      <section class="features-section">
        <h2 class="section-title">Powered by Advanced AI</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon" style="background:rgba(var(--accent-primary-rgb),0.12);color:var(--accent-tertiary);">🔍</div>
            <h3>Contextual Q&A</h3>
            <p>Ask natural language questions and get precise answers directly from your PDF documents with source citations.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon" style="background:rgba(var(--accent-cyan-rgb),0.12);color:var(--accent-cyan);">📋</div>
            <h3>Smart Summarization</h3>
            <p>Instantly generate comprehensive summaries of any uploaded document, highlighting key findings and methodologies.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon" style="background:rgba(var(--accent-emerald-rgb),0.12);color:var(--accent-emerald);">🏷️</div>
            <h3>Automated Tagging</h3>
            <p>AI automatically identifies and assigns relevant topic tags to your documents without any manual input.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon" style="background:rgba(var(--accent-rose-rgb),0.12);color:var(--accent-rose);">🌐</div>
            <h3>Cross-Language</h3>
            <p>Ask questions in any language and get answers synthesized from your documents, regardless of their original language.</p>
          </div>
        </div>
      </section>
    </div>
  `;

    // Load stats
    loadStats();

    // Quick ask form
    const form = document.getElementById('quick-ask-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('quick-ask-input');
        const question = input.value.trim();
        if (question) {
            // Navigate to chat with the question
            window._pendingQuestion = question;
            window.location.hash = '/chat';
        }
    });
}

async function loadStats() {
    try {
        const stats = await api.getStats();
        document.getElementById('stat-docs').textContent = stats.document_count || 0;
        document.getElementById('stat-chats').textContent = stats.chat_count || 0;
        document.getElementById('stat-chunks').textContent = stats.total_chunks || 0;
    } catch (e) {
        // Backend might not be running yet
        document.getElementById('stat-docs').textContent = '0';
        document.getElementById('stat-chats').textContent = '0';
        document.getElementById('stat-chunks').textContent = '0';
    }
}
