/**
 * Chat Page — Redesigned V2
 * Light chat area, teal user bubbles, AI globe avatar, timestamps,
 * + New search button, inline citation book icons with JS-positioned tooltip.
 */

import { api } from '../api.js';

let chatMessages = [];
let isLoading = false;
// Citation data store — maps source number to citation metadata
let citationDataStore = {};

export function renderChatPage(container) {
  container.innerHTML = `
    <div class="chat-page-v2">
      <!-- Chat Messages Area -->
      <div class="chat-body" id="chat-messages">
        <button class="btn-new-search" id="btn-new-search" title="Start a new search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New search
        </button>
        ${chatMessages.length === 0 ? renderWelcome() : ''}
      </div>

      <!-- Chat Input -->
      <div class="chat-input-bar">
        <form class="chat-input-row" id="chat-form">
          <textarea
            class="chat-input-v2"
            id="chat-input"
            placeholder="Ask a question about your research documents..."
            rows="1"
            autocomplete="off"
          ></textarea>
          <button type="submit" class="send-btn-v2" id="send-btn" title="Send message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      </div>

      <!-- Global Citation Tooltip (single shared element) -->
      <div class="cite-tooltip" id="cite-tooltip"></div>
    </div>
  `;

  if (chatMessages.length > 0) {
    renderAllMessages();
  }

  // Event listeners
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');

  form.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // New search button
  document.getElementById('btn-new-search').addEventListener('click', () => {
    chatMessages = [];
    citationDataStore = {};
    const messagesEl = document.getElementById('chat-messages');
    messagesEl.innerHTML = renderWelcome();
    input.focus();
  });

  // Pending question from home quick-ask
  if (window._pendingQuestion) {
    input.value = window._pendingQuestion;
    delete window._pendingQuestion;
    setTimeout(() => sendMessage(), 300);
  }

  // Setup global tooltip hover handlers via event delegation
  setupTooltipHandlers();
}

/* ─── Global Tooltip System ─── */
function setupTooltipHandlers() {
  const chatBody = document.getElementById('chat-messages');
  const tooltip = document.getElementById('cite-tooltip');
  let hideTimer = null;

  chatBody.addEventListener('mouseover', (e) => {
    const citeRef = e.target.closest('.cite-ref');
    if (!citeRef) return;

    clearTimeout(hideTimer);
    const sourceNum = parseInt(citeRef.dataset.source);
    const data = citationDataStore[sourceNum];

    const filename = data?.filename || 'Source ' + sourceNum;
    const title = data?.title || filename;
    const pages = data?.page_range || '—';
    const snippet = (data?.snippet || '').slice(0, 120);
    const docId = data?.doc_id || '';
    const firstPage = data?.pages?.[0] || 1;
    const year = data?.year || '';
    const doi = data?.doi || '';
    const publisher = data?.publisher || '';
    const author = data?.author || '';

    // Build metadata info lines
    let metaLines = [];
    if (year) metaLines.push(`📅 ${year}`);
    if (doi) metaLines.push(`🔗 DOI: <a href="https://doi.org/${escapeHtml(doi)}" target="_blank" class="cite-doi-link">${escapeHtml(doi)}</a>`);
    if (publisher) metaLines.push(`🏛️ ${escapeHtml(publisher)}`);

    tooltip.innerHTML = `
      <div class="cite-tooltip-header">
        <span class="cite-tooltip-num">${sourceNum}</span>
        <span class="cite-tooltip-title">${escapeHtml(title)}</span>
      </div>
      ${author ? `<div class="cite-tooltip-author">${escapeHtml(author)}</div>` : ''}
      <div class="cite-tooltip-badge">📄 USED FULL TEXT</div>
      <div class="cite-tooltip-meta">Pages ${escapeHtml(String(pages))}</div>
      ${metaLines.length ? `<div class="cite-tooltip-info">${metaLines.join(' &nbsp;·&nbsp; ')}</div>` : ''}
      ${snippet ? `<div class="cite-tooltip-snippet">${escapeHtml(snippet)}…</div>` : ''}
      <div class="cite-tooltip-actions">
        ${docId ? `<a class="cite-action-btn primary" href="/api/documents/${docId}/view#page=${firstPage}" target="_blank" title="Open PDF at cited page">📋 Details</a>` : `<span class="cite-action-btn primary disabled">📋 Details</span>`}
        ${docId ? `<a class="cite-action-btn" href="/api/documents/${docId}/download" download title="Download PDF file">📄 PDF</a>` : `<span class="cite-action-btn disabled">📄 PDF</span>`}
      </div>
    `;

    // Position tooltip above the badge using viewport coords
    const rect = citeRef.getBoundingClientRect();
    const tooltipWidth = 340;

    // Measure tooltip height by showing it off-screen first
    tooltip.style.left = '-9999px';
    tooltip.style.top = '-9999px';
    tooltip.style.width = tooltipWidth + 'px';
    tooltip.style.display = 'block';
    tooltip.style.visibility = 'hidden';

    const tooltipHeight = tooltip.offsetHeight;

    // Calculate final position
    let left = rect.left;
    let top = rect.top - tooltipHeight - 8;

    // Keep within viewport horizontally
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }
    if (left < 10) left = 10;

    // If not enough room above, show below
    if (top < 10) {
      top = rect.bottom + 8;
    }

    // Apply position and make visible
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.style.visibility = 'visible';
    tooltip.style.display = '';
    tooltip.classList.add('visible');
  });

  chatBody.addEventListener('mouseout', (e) => {
    const citeRef = e.target.closest('.cite-ref');
    if (!citeRef) return;
    hideTimer = setTimeout(() => {
      tooltip.classList.remove('visible');
      tooltip.style.display = 'none';
      tooltip.style.visibility = 'hidden';
    }, 200);
  });

  // Keep tooltip visible when hovering over the tooltip itself
  tooltip.addEventListener('mouseover', () => {
    clearTimeout(hideTimer);
  });

  tooltip.addEventListener('mouseout', () => {
    hideTimer = setTimeout(() => {
      tooltip.classList.remove('visible');
      tooltip.style.display = 'none';
      tooltip.style.visibility = 'hidden';
    }, 200);
  });
}

/* ─── Welcome Screen ─── */
function renderWelcome() {
  return `
    <div class="welcome-chat-v2">
      <div class="welcome-icon-v2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>
      <h2>What would you like to research?</h2>
      <p>Ask any question about your uploaded PDF documents. I'll search through them and provide answers with source citations.</p>
      <div class="suggestion-chips-v2">
        <button class="chip-v2" onclick="document.getElementById('chat-input').value=this.textContent;document.getElementById('chat-input').focus();">What are the key findings?</button>
        <button class="chip-v2" onclick="document.getElementById('chat-input').value=this.textContent;document.getElementById('chat-input').focus();">Summarize the methodology</button>
        <button class="chip-v2" onclick="document.getElementById('chat-input').value=this.textContent;document.getElementById('chat-input').focus();">What data was used?</button>
        <button class="chip-v2" onclick="document.getElementById('chat-input').value=this.textContent;document.getElementById('chat-input').focus();">Explain the conclusions</button>
      </div>
    </div>
  `;
}

/* ─── Messaging ─── */
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const question = input.value.trim();
  if (!question || isLoading) return;

  isLoading = true;
  sendBtn.disabled = true;

  const welcome = document.querySelector('.welcome-chat-v2');
  if (welcome) welcome.remove();

  addMessage('user', question);
  input.value = '';
  input.style.height = 'auto';

  showTypingIndicator();

  try {
    const result = await api.askQuestion(question);
    removeTypingIndicator();

    // Store citation data globally for tooltip lookups
    if (result.citations) {
      result.citations.forEach((c, i) => {
        const num = c.source_num || (i + 1);
        citationDataStore[num] = c;
      });
    }

    addMessage('ai', result.answer, result.citations);
  } catch (error) {
    removeTypingIndicator();
    addMessage('ai', `⚠️ Sorry, I encountered an error: ${error.message}. Make sure the backend is running and documents have been uploaded.`);
    window.showToast?.('Failed to get answer: ' + error.message, 'error');
  }

  isLoading = false;
  sendBtn.disabled = false;
  input.focus();
}

function addMessage(role, content, citations = []) {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  chatMessages.push({ role, content, citations, time });

  const messagesEl = document.getElementById('chat-messages');
  const el = createMessageElement(role, content, citations, time);
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function createMessageElement(role, content, citations = [], time = '') {
  const div = document.createElement('div');
  div.className = `msg-row ${role}`;

  if (role === 'user') {
    div.innerHTML = `
      <div class="msg-bubble user-bubble">
        <div class="msg-text">${escapeHtml(content)}</div>
        <div class="msg-time">${time}</div>
      </div>
      <div class="msg-avatar user-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
    `;
  } else {
    const formattedContent = formatMarkdownWithCitations(content, citations);
    div.innerHTML = `
      <div class="msg-avatar ai-avatar">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
      </div>
      <div class="msg-bubble ai-bubble">
        <div class="msg-text ai-text">${formattedContent}</div>
        <div class="msg-time">${time}</div>
      </div>
    `;
  }

  return div;
}

function renderAllMessages() {
  const messagesEl = document.getElementById('chat-messages');
  messagesEl.innerHTML = '';
  chatMessages.forEach(msg => {
    const el = createMessageElement(msg.role, msg.content, msg.citations, msg.time);
    messagesEl.appendChild(el);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/* ─── Typing Indicator ─── */
function showTypingIndicator() {
  const messagesEl = document.getElementById('chat-messages');
  const indicator = document.createElement('div');
  indicator.className = 'msg-row ai';
  indicator.id = 'typing-indicator';
  indicator.innerHTML = `
    <div class="msg-avatar ai-avatar">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
    </div>
    <div class="msg-bubble ai-bubble">
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>
  `;
  messagesEl.appendChild(indicator);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

/* ─── Markdown Formatter with Inline Citations ─── */
function formatMarkdownWithCitations(text, citations = []) {
  if (!text) return '';

  // Build lookup map
  const citationMap = {};
  citations.forEach((c, i) => {
    const num = c.source_num || (i + 1);
    citationMap[num] = c;
  });

  // Simple badge HTML
  function makeCiteSpan(num) {
    return `<span class="cite-ref" data-source="${num}">📖<sup>${num}</sup></span>`;
  }

  // Work on raw text first (before escaping)
  let raw = text;

  // Replace citation references BEFORE escaping
  raw = raw.replace(/\[([^\]]*?Source[^\]]*?)\]/gi, (match, inner) => {
    const nums = [];
    const sourceRegex = /Source\s*(\d+)/gi;
    let m;
    while ((m = sourceRegex.exec(inner)) !== null) {
      nums.push(parseInt(m[1]));
    }
    if (nums.length === 0) return match;
    return nums.map(n => `%%CITE_${n}%%`).join(' ');
  });

  // Remove horizontal rules
  raw = raw.replace(/^-{3,}$/gm, '');
  raw = raw.replace(/^\*{3,}$/gm, '');
  raw = raw.replace(/^_{3,}$/gm, '');

  // Remove blockquote markers but keep the text
  raw = raw.replace(/^>\s?/gm, '');

  // Remove emoji-only lines or stray emoji at line start used as decoration
  // (keep emojis that are part of actual text)

  // Clean stray periods/commas on their own lines
  raw = raw.replace(/^\s*[.,;]\s*$/gm, '');

  // Clean excessive blank lines (more than 2 → 2)
  raw = raw.replace(/\n{3,}/g, '\n\n');

  // Now split into lines and process
  const lines = raw.split('\n');
  let html = '';
  let inList = false;
  let listType = ''; // 'ul' or 'ol'

  // Helper: detect if a line is a table row (contains pipes)
  function isTableRow(line) {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.split('|').length >= 3;
  }

  // Helper: detect separator row like |---|---|
  function isTableSeparator(line) {
    return /^\|[\s\-:]+(\|[\s\-:]+)+\|$/.test(line.trim());
  }

  // Helper: parse cells from a table row
  function parseTableCells(line) {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip empty lines — they become paragraph breaks
    if (line.trim() === '') {
      if (inList) {
        html += `</${listType}>`;
        inList = false;
        listType = '';
      }
      html += '\n\n';
      continue;
    }

    // ─── Table detection ───
    if (isTableRow(line)) {
      if (inList) { html += `</${listType}>`; inList = false; listType = ''; }

      // Collect all consecutive table rows
      const tableLines = [];
      while (i < lines.length && (isTableRow(lines[i]) || isTableSeparator(lines[i]))) {
        tableLines.push(lines[i]);
        i++;
      }
      i--; // step back since the for loop will increment

      // Build HTML table
      let tableHtml = '<div class="table-wrapper"><table class="data-table">';
      let headerDone = false;
      let bodyStarted = false;

      for (const tl of tableLines) {
        if (isTableSeparator(tl)) {
          // Skip separator, but it marks the end of header
          headerDone = true;
          continue;
        }

        const cells = parseTableCells(tl);

        if (!headerDone) {
          // This is the header row
          tableHtml += '<thead><tr>';
          cells.forEach(cell => {
            tableHtml += `<th>${formatInline(cell)}</th>`;
          });
          tableHtml += '</tr></thead>';
          headerDone = true;
        } else {
          if (!bodyStarted) {
            tableHtml += '<tbody>';
            bodyStarted = true;
          }
          tableHtml += '<tr>';
          cells.forEach(cell => {
            tableHtml += `<td>${formatInline(cell)}</td>`;
          });
          tableHtml += '</tr>';
        }
      }

      if (bodyStarted) tableHtml += '</tbody>';
      tableHtml += '</table></div>';
      html += tableHtml;
      continue;
    }

    // Headers
    const h3Match = line.match(/^###\s+(.+)$/);
    const h2Match = !h3Match && line.match(/^##\s+(.+)$/);
    const h1Match = !h3Match && !h2Match && line.match(/^#\s+(.+)$/);

    if (h1Match || h2Match || h3Match) {
      if (inList) { html += `</${listType}>`; inList = false; listType = ''; }
      const level = h3Match ? 3 : h2Match ? 2 : 1;
      const content = (h3Match || h2Match || h1Match)[1];
      html += `<h${level}>${formatInline(content)}</h${level}>`;
      continue;
    }

    // Bullet list items
    const bulletMatch = line.match(/^\s*[-*•]\s+(.+)$/);
    if (bulletMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) html += `</${listType}>`;
        html += '<ul>';
        inList = true;
        listType = 'ul';
      }
      html += `<li>${formatInline(bulletMatch[1])}</li>`;
      continue;
    }

    // Numbered list items
    const numMatch = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (numMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) html += `</${listType}>`;
        html += '<ol>';
        inList = true;
        listType = 'ol';
      }
      html += `<li>${formatInline(numMatch[1])}</li>`;
      continue;
    }

    // Regular text line
    if (inList) { html += `</${listType}>`; inList = false; listType = ''; }
    html += `<p>${formatInline(line)}</p>`;
  }

  // Close any open list
  if (inList) html += `</${listType}>`;

  // Restore citation placeholders
  html = html.replace(/%%CITE_(\d+)%%/g, (_, num) => makeCiteSpan(parseInt(num)));

  // Final cleanup
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>\s*(<h[1-3]>)/g, '$1');
  html = html.replace(/(<\/h[1-3]>)\s*<\/p>/g, '$1');
  html = html.replace(/<p>\s*(<[uo]l>)/g, '$1');
  html = html.replace(/(<\/[uo]l>)\s*<\/p>/g, '$1');

  return html;
}

/** Format inline markdown: bold, italic, code, links */
function formatInline(text) {
  let s = escapeHtml(text);
  // Bold
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic (single *)
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // em dash
  s = s.replace(/—/g, '—');
  // Restore citation placeholders to pass through
  return s;
}

/* ─── Utilities ─── */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
