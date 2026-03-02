/**
 * Documents Page
 * Document library with upload, listing, summarization, and deletion.
 */

import { api } from '../api.js';

export function renderDocumentsPage(container) {
    container.innerHTML = `
    <div class="page-container documents-page">
      <div class="page-header">
        <div>
          <h1>📄 Document Library</h1>
          <p>Upload and manage your research PDF documents. Each document is automatically processed, indexed, and tagged by AI.</p>
        </div>
        <div style="display:flex;gap:var(--space-sm)">
          <button class="btn btn-secondary" id="btn-ingest-existing" title="Index PDFs already in asset/doc folder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Ingest Existing
          </button>
        </div>
      </div>

      <!-- Upload Zone -->
      <div class="upload-zone" id="upload-zone">
        <input type="file" accept=".pdf" class="file-input" id="file-input" />
        <div class="upload-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <h3>Drop your PDF here or click to upload</h3>
        <p>Supported format: PDF • The document will be automatically processed and indexed</p>
        <div class="upload-progress" id="upload-progress">
          <div class="upload-status" id="upload-status">Processing document...</div>
          <div class="progress-bar-wrapper">
            <div class="progress-bar" id="progress-bar"></div>
          </div>
        </div>
      </div>

      <!-- Documents List -->
      <div id="documents-container">
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>
      </div>

      <!-- Summary Modal -->
      <div class="modal-overlay" id="summary-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 id="modal-title">Document Summary</h2>
            <button class="modal-close" id="modal-close">✕</button>
          </div>
          <div class="modal-body" id="modal-body">
            Loading...
          </div>
        </div>
      </div>
    </div>
  `;

    setupUpload();
    setupModal();
    setupIngestExisting();
    loadDocuments();
}

function setupUpload() {
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('file-input');

    // Drag and drop
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.name.toLowerCase().endsWith('.pdf')) {
            uploadFile(file);
        } else {
            window.showToast?.('Please upload a PDF file', 'error');
        }
    });

    // Click to upload
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) uploadFile(file);
        input.value = ''; // Reset so same file can be uploaded again
    });
}

async function uploadFile(file) {
    const progress = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const status = document.getElementById('upload-status');

    progress.classList.add('active');
    progressBar.style.width = '10%';
    status.textContent = `Uploading "${file.name}"...`;

    try {
        // Simulate progress stages
        const progressStages = [
            { pct: 20, msg: 'Extracting text from PDF...' },
            { pct: 40, msg: 'Splitting into knowledge chunks...' },
            { pct: 60, msg: 'Generating embeddings...' },
            { pct: 75, msg: 'Storing in vector database...' },
            { pct: 85, msg: 'AI is generating tags & summary...' },
        ];

        let stageIndex = 0;
        const progressInterval = setInterval(() => {
            if (stageIndex < progressStages.length) {
                progressBar.style.width = progressStages[stageIndex].pct + '%';
                status.textContent = progressStages[stageIndex].msg;
                stageIndex++;
            }
        }, 2000);

        const result = await api.uploadDocument(file);

        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        status.textContent = `✅ "${file.name}" processed successfully! (${result.chunk_count} chunks, ${result.tags?.length || 0} tags)`;

        window.showToast?.(`Document "${file.name}" uploaded and indexed!`, 'success');

        // Reload documents list after a brief pause
        setTimeout(() => {
            progress.classList.remove('active');
            loadDocuments();
        }, 2000);

    } catch (error) {
        progressBar.style.width = '0%';
        status.textContent = `❌ Error: ${error.message}`;
        window.showToast?.('Upload failed: ' + error.message, 'error');

        setTimeout(() => {
            progress.classList.remove('active');
        }, 3000);
    }
}

async function loadDocuments() {
    const container = document.getElementById('documents-container');

    try {
        const data = await api.getDocuments();
        const docs = data.documents || [];

        if (docs.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <h3>No documents yet</h3>
          <p>Upload a PDF document above to get started, or click "Ingest Existing" to process PDFs already in the asset/doc folder.</p>
        </div>
      `;
            return;
        }

        container.innerHTML = `
      <div class="documents-grid">
        ${docs.map(doc => renderDocumentCard(doc)).join('')}
      </div>
    `;

        // Attach event listeners
        docs.forEach(doc => {
            const summaryBtn = document.getElementById(`summary-btn-${doc.id}`);
            const deleteBtn = document.getElementById(`delete-btn-${doc.id}`);

            if (summaryBtn) {
                summaryBtn.addEventListener('click', () => showSummary(doc));
            }
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => deleteDocument(doc.id, doc.original_name));
            }
        });

    } catch (error) {
        container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <h3>Could not load documents</h3>
        <p>Make sure the backend server is running on port 8000. Error: ${error.message}</p>
      </div>
    `;
    }
}

function renderDocumentCard(doc) {
    const tags = doc.tags || [];
    const date = doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

    return `
    <div class="document-card">
      <div class="doc-header">
        <div class="doc-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div class="doc-actions">
          <button class="btn btn-secondary btn-sm" id="summary-btn-${doc.id}" title="View Summary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
              <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
            </svg>
            Summary
          </button>
          <button class="btn btn-danger btn-sm" id="delete-btn-${doc.id}" title="Delete Document">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="doc-title" title="${escapeAttr(doc.original_name)}">${escapeHtml(doc.original_name)}</div>

      <div class="doc-meta">
        <span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${date}
        </span>
        <span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          ${doc.page_count || 0} pages
        </span>
        <span>🧩 ${doc.chunk_count || 0} chunks</span>
        <span class="doc-status ${doc.status}">${doc.status === 'ready' ? '✅ Ready' : doc.status === 'processing' ? '⏳ Processing' : '❌ Error'}</span>
      </div>

      ${tags.length > 0 ? `
        <div class="tag-list">
          ${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function setupModal() {
    const modal = document.getElementById('summary-modal');
    const closeBtn = document.getElementById('modal-close');

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
}

function showSummary(doc) {
    const modal = document.getElementById('summary-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    title.textContent = doc.original_name;

    const tags = doc.tags || [];
    const tagsHtml = tags.length > 0
        ? `<div style="margin-bottom:var(--space-md)">
        <strong>Tags:</strong>
        <div class="tag-list" style="margin-top:var(--space-xs)">
          ${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>`
        : '';

    const summaryHtml = doc.summary
        ? formatMarkdown(doc.summary)
        : '<p style="color:var(--text-tertiary)">No summary available. The document may still be processing.</p>';

    body.innerHTML = `
    ${tagsHtml}
    <div style="border-top:1px solid var(--border-subtle);padding-top:var(--space-md);">
      <strong>Summary:</strong>
      <div style="margin-top:var(--space-sm)">${summaryHtml}</div>
    </div>
  `;

    modal.classList.add('active');
}

async function deleteDocument(docId, docName) {
    if (!confirm(`Are you sure you want to delete "${docName}"? This will also remove all indexed data.`)) return;

    try {
        await api.deleteDocument(docId);
        window.showToast?.(`Document "${docName}" deleted successfully`, 'success');
        loadDocuments();
    } catch (error) {
        window.showToast?.('Failed to delete: ' + error.message, 'error');
    }
}

function setupIngestExisting() {
    const btn = document.getElementById('btn-ingest-existing');
    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div> Processing...';

        try {
            const result = await api.ingestExisting();
            const processed = result.processed?.length || 0;
            const errors = result.errors?.length || 0;

            if (processed > 0) {
                window.showToast?.(`Processed ${processed} existing documents!`, 'success');
            } else if (errors > 0) {
                window.showToast?.(`${errors} documents failed to process`, 'error');
            } else {
                window.showToast?.('No new documents found to process', 'info');
            }

            loadDocuments();
        } catch (error) {
            window.showToast?.('Ingestion failed: ' + error.message, 'error');
        }

        btn.disabled = false;
        btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      Ingest Existing
    `;
    });
}

// Simple Markdown-to-HTML converter
function formatMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br/>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>\s*(<h[1-3]>)/g, '$1');
    html = html.replace(/(<\/h[1-3]>)\s*<\/p>/g, '$1');
    return html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
