/**
 * EduMentor AI – main.js
 * Handles all client-side logic:
 *   - Theme (dark/light) toggle with persistence
 *   - AI content generation via /api/learn
 *   - Markdown-to-HTML rendering
 *   - Structured section card rendering
 *   - Chat history sidebar management
 *   - Copy-to-clipboard
 *   - PDF download (print-based)
 *   - Toast notifications
 *   - Loading steps animation
 *   - Mobile sidebar toggle
 *   - Related topic click → auto-fill
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────────────────
   State
───────────────────────────────────────────────────────────────────────────── */
let currentSession  = null;    // { subject, topic, difficulty, raw, sections }
let chatHistory     = [];      // [{ id, subject, topic, difficulty, raw, sections, ts }]
let selectedDiff    = 'Beginner';
let loadingInterval = null;

const LOADING_STEPS = [
  '🔍 Analysing topic…',
  '🧠 Building explanation…',
  '📝 Generating revision notes…',
  '❓ Creating quiz questions…',
  '💡 Crafting study tips…',
  '✅ Finalising response…'
];

/* ─────────────────────────────────────────────────────────────────────────────
   DOM Refs
───────────────────────────────────────────────────────────────────────────── */
const dom = {
  themeToggle:    document.getElementById('themeToggle'),
  subjectInput:   document.getElementById('subjectInput'),
  topicInput:     document.getElementById('topicInput'),
  diffBtns:       document.querySelectorAll('.difficulty-btn'),
  generateBtn:    document.getElementById('generateBtn'),
  welcomeState:   document.getElementById('welcomeState'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingSteps:   document.getElementById('loadingSteps'),
  responseArea:   document.getElementById('responseArea'),
  historyList:    document.getElementById('historyList'),
  clearHistoryBtn:document.getElementById('clearHistoryBtn'),
  sidebarToggle:  document.getElementById('sidebarToggle'),
  sidebar:        document.getElementById('sidebar'),
  toastContainer: document.getElementById('toastContainer'),
  copyBtn:        document.getElementById('copyBtn'),
  downloadBtn:    document.getElementById('downloadBtn'),
  // Response card body targets
  resSubject:     document.getElementById('resSubject'),
  resTopic:       document.getElementById('resTopic'),
  resDiff:        document.getElementById('resDiff'),
  secExplanation: document.getElementById('secExplanation'),
  secNotes:       document.getElementById('secNotes'),
  secKeyPoints:   document.getElementById('secKeyPoints'),
  secQuiz:        document.getElementById('secQuiz'),
  secStudyTips:   document.getElementById('secStudyTips'),
  secMistakes:    document.getElementById('secMistakes'),
  secRelated:     document.getElementById('secRelated'),
  secSummary:     document.getElementById('secSummary'),
};

/* ─────────────────────────────────────────────────────────────────────────────
   Theme Management
───────────────────────────────────────────────────────────────────────────── */
function initTheme() {
  const stored = localStorage.getItem('edumentor-theme');
  const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(stored || system);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('edumentor-theme', theme);
  if (dom.themeToggle) {
    dom.themeToggle.innerHTML = theme === 'dark'
      ? '<i class="bi bi-sun-fill"></i>'
      : '<i class="bi bi-moon-fill"></i>';
    dom.themeToggle.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* ─────────────────────────────────────────────────────────────────────────────
   Difficulty Selector
───────────────────────────────────────────────────────────────────────────── */
function initDifficultyBtns() {
  dom.diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dom.diffBtns.forEach(b => b.className = 'difficulty-btn');
      const diff = btn.dataset.diff;
      selectedDiff = diff;
      btn.classList.add(`active-${diff.toLowerCase()}`);
    });
  });
  // Set default active
  const defaultBtn = document.querySelector('.difficulty-btn[data-diff="Beginner"]');
  if (defaultBtn) defaultBtn.classList.add('active-beginner');
}

/* ─────────────────────────────────────────────────────────────────────────────
   Loading Animation
───────────────────────────────────────────────────────────────────────────── */
function showLoading() {
  dom.welcomeState.style.display   = 'none';
  dom.responseArea.classList.remove('show');
  dom.loadingOverlay.classList.add('show');

  // Render step pills
  dom.loadingSteps.innerHTML = LOADING_STEPS.map((s, i) =>
    `<span class="loading-step" id="lstep${i}">${s}</span>`
  ).join('');

  let stepIdx = 0;
  clearInterval(loadingInterval);
  document.getElementById(`lstep${stepIdx}`).classList.add('active');

  loadingInterval = setInterval(() => {
    document.getElementById(`lstep${stepIdx}`)?.classList.remove('active');
    stepIdx = (stepIdx + 1) % LOADING_STEPS.length;
    document.getElementById(`lstep${stepIdx}`)?.classList.add('active');
  }, 1800);
}

function hideLoading() {
  clearInterval(loadingInterval);
  dom.loadingOverlay.classList.remove('show');
}

/* ─────────────────────────────────────────────────────────────────────────────
   Markdown → HTML (lightweight)
───────────────────────────────────────────────────────────────────────────── */
function mdToHtml(text) {
  if (!text) return '<p class="text-muted-custom">No content available.</p>';

  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:rgba(99,102,241,.1);padding:.1rem .35rem;border-radius:.3rem;font-size:.88em">$1</code>')
    // H3
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    // H2
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    // Unordered list items
    .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]*?<\/li>(\s*<li>[\s\S]*?<\/li>)*)/g, '<ul>$1</ul>')
    // Paragraphs (double newlines)
    .replace(/\n\n+/g, '</p><p>')
    // Wrap root text
    .replace(/^([^<])/, '<p>$1')
    .replace(/([^>])$/, '$1</p>')
    // Clean up empty tags
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<[hul])/g, '$1')
    .replace(/(<\/[hul][^>]*>)<\/p>/g, '$1');
}

/* ─────────────────────────────────────────────────────────────────────────────
   Section Renderers
───────────────────────────────────────────────────────────────────────────── */
function renderExplanation(text) {
  dom.secExplanation.innerHTML = mdToHtml(text);
}

function renderNotes(text) {
  if (!text) { dom.secNotes.innerHTML = '<p class="text-muted-custom">No revision notes generated.</p>'; return; }
  const lines = text.split('\n').filter(l => l.trim());
  const items = lines.map(l => {
    const clean = l.replace(/^[\-\*\d\.]+\s*/, '').trim();
    return clean
      ? `<li style="padding:.3rem 0;border-bottom:1px solid var(--border-color);list-style:none;display:flex;gap:.5rem;"><span style="color:var(--accent-purple);font-weight:700;flex-shrink:0;">▸</span><span>${clean}</span></li>`
      : '';
  }).join('');
  dom.secNotes.innerHTML = `<ul style="padding:0;margin:0;">${items}</ul>`;
}

function renderKeyPoints(text) {
  if (!text) { dom.secKeyPoints.innerHTML = '<p class="text-muted-custom">No key points generated.</p>'; return; }
  const lines = text.split('\n').filter(l => l.trim().replace(/^[\-\*\d\.]+\s*/, ''));
  const items = lines.map((l, i) => {
    const clean = l.replace(/^[\-\*\d\.]+\s*/, '').trim();
    return clean ? `
      <div style="display:flex;gap:.75rem;align-items:flex-start;padding:.625rem .875rem;background:rgba(99,102,241,.05);border-radius:.625rem;margin-bottom:.5rem;border-left:3px solid var(--accent-purple);">
        <span style="width:22px;height:22px;border-radius:50%;background:var(--grad-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:800;flex-shrink:0;">${i+1}</span>
        <span style="font-size:.9rem;color:var(--text-primary);">${clean}</span>
      </div>` : '';
  }).join('');
  dom.secKeyPoints.innerHTML = items;
}

function renderQuiz(text) {
  if (!text) { dom.secQuiz.innerHTML = '<p class="text-muted-custom">No quiz generated.</p>'; return; }

  // Split by question number patterns
  const qBlocks = text.split(/\n(?=\d+[\.\)])/);
  if (qBlocks.length < 2) {
    dom.secQuiz.innerHTML = mdToHtml(text);
    return;
  }

  const html = qBlocks.filter(b => b.trim()).map((block, i) => {
    const lines = block.trim().split('\n');
    const qLine = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
    const options = [];
    let correct = '';

    lines.slice(1).forEach(line => {
      const optMatch = line.match(/^([A-D][\.\)])\s*(.+)/i);
      const corrMatch = line.match(/✅\s*Correct\s*Answer\s*:\s*(.+)/i);
      if (optMatch)  options.push({ key: optMatch[1], text: optMatch[2].trim() });
      if (corrMatch) correct = corrMatch[1].trim();
    });

    const optHtml = options.map(o => {
      const isCorrect = correct && (correct.toUpperCase().startsWith(o.key.replace('.','').replace(')','').toUpperCase()));
      return `<div class="quiz-option${isCorrect ? ' correct' : ''}">${o.key} ${o.text}${isCorrect ? ' ✅' : ''}</div>`;
    }).join('');

    return `
      <div class="quiz-question">
        <div class="quiz-q-number">Question ${i+1}</div>
        <div class="quiz-q-text">${qLine}</div>
        <div class="quiz-options">${optHtml || mdToHtml(lines.slice(1).join('\n'))}</div>
      </div>`;
  }).join('');

  dom.secQuiz.innerHTML = html;
}

function renderStudyTips(text) {
  if (!text) { dom.secStudyTips.innerHTML = '<p class="text-muted-custom">No study tips generated.</p>'; return; }
  const tips = ['💡','🎯','📖','🔬','🧩','⏰','🗂️','🤝'];
  const lines = text.split('\n').filter(l => l.replace(/^[\-\*\d\.]+\s*/, '').trim());
  const html = lines.map((l, i) => {
    const clean = l.replace(/^[\-\*\d\.]+\s*/, '').trim();
    return clean ? `
      <div class="tip-item">
        <span class="tip-icon">${tips[i % tips.length]}</span>
        <span>${clean}</span>
      </div>` : '';
  }).join('');
  dom.secStudyTips.innerHTML = html;
}

function renderMistakes(text) {
  if (!text) { dom.secMistakes.innerHTML = '<p class="text-muted-custom">No common mistakes listed.</p>'; return; }
  const lines = text.split('\n').filter(l => l.replace(/^[\-\*\d\.]+\s*/, '').trim());
  const html = lines.map(l => {
    const clean = l.replace(/^[\-\*\d\.]+\s*/, '').trim();
    return clean ? `
      <div class="mistake-item">
        <span class="tip-icon">⚠️</span>
        <span>${clean}</span>
      </div>` : '';
  }).join('');
  dom.secMistakes.innerHTML = html;
}

function renderRelated(text, subject) {
  if (!text) { dom.secRelated.innerHTML = '<p class="text-muted-custom">No related topics found.</p>'; return; }
  const lines = text.split('\n').filter(l => l.replace(/^[\-\*\d\.]+\s*/, '').trim());
  const pills = lines.map(l => {
    const clean = l.replace(/^[\-\*\d\.]+\s*/, '').trim();
    return clean ? `<span class="related-pill" data-topic="${clean}" data-subject="${subject || ''}">${clean}</span>` : '';
  }).join('');
  dom.secRelated.innerHTML = `<div class="related-pills">${pills}</div>`;

  // Click a related topic → auto-fill form
  dom.secRelated.querySelectorAll('.related-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      dom.topicInput.value   = pill.dataset.topic;
      dom.subjectInput.value = pill.dataset.subject || dom.subjectInput.value;
      dom.topicInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dom.topicInput.focus();
      showToast('Topic pre-filled! Click Generate to learn.', 'info');
    });
  });
}

function renderSummary(text) {
  if (!text) { dom.secSummary.innerHTML = '<p class="text-muted-custom">No summary generated.</p>'; return; }
  dom.secSummary.innerHTML = `<div class="summary-box">${mdToHtml(text)}</div>`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Render Full Response
───────────────────────────────────────────────────────────────────────────── */
function renderResponse(data) {
  const { subject, topic, difficulty, sections } = data;

  // Header meta
  dom.resSubject.textContent = subject;
  dom.resTopic.textContent   = topic;
  dom.resDiff.textContent    = difficulty;

  // Sections
  renderExplanation(sections.explanation);
  renderNotes(sections.notes);
  renderKeyPoints(sections.key_points);
  renderQuiz(sections.quiz);
  renderStudyTips(sections.study_tips);
  renderMistakes(sections.mistakes);
  renderRelated(sections.related, subject);
  renderSummary(sections.summary);

  // Show response area
  dom.responseArea.classList.add('show');
}

/* ─────────────────────────────────────────────────────────────────────────────
   API Call – Generate Content
───────────────────────────────────────────────────────────────────────────── */
async function generateContent() {
  const subject    = dom.subjectInput.value.trim();
  const topic      = dom.topicInput.value.trim();
  const difficulty = selectedDiff;

  if (!subject) { showToast('Please enter a subject.', 'warning'); dom.subjectInput.focus(); return; }
  if (!topic)   { showToast('Please enter a topic.',   'warning'); dom.topicInput.focus();   return; }

  dom.generateBtn.disabled = true;
  showLoading();

  try {
    const res  = await fetch('/api/learn', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ subject, topic, difficulty })
    });

    const data = await res.json();
    hideLoading();

    if (!data.success) {
      showToast(data.error || 'Failed to get AI response.', 'error');
      dom.welcomeState.style.display = 'flex';
      return;
    }

    currentSession = data;
    renderResponse(data);
    addToHistory(data);
    showToast('Learning content generated successfully! 🎉', 'success');

  } catch (err) {
    hideLoading();
    console.error('API error:', err);
    showToast('Network error. Please check your connection.', 'error');
    dom.welcomeState.style.display = 'flex';
  } finally {
    dom.generateBtn.disabled = false;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Chat History
───────────────────────────────────────────────────────────────────────────── */
function addToHistory(data) {
  const entry = {
    id:         Date.now(),
    subject:    data.subject,
    topic:      data.topic,
    difficulty: data.difficulty,
    raw:        data.raw,
    sections:   data.sections,
    ts:         new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  chatHistory.unshift(entry);
  if (chatHistory.length > 30) chatHistory.pop();
  saveHistory();
  renderHistory();
}

function renderHistory() {
  if (!chatHistory.length) {
    dom.historyList.innerHTML = `
      <div class="sidebar-empty">
        <div style="font-size:2rem;margin-bottom:.5rem;">📚</div>
        <div>No sessions yet.<br>Start learning to see history here.</div>
      </div>`;
    return;
  }

  dom.historyList.innerHTML = chatHistory.map(item => {
    const badgeClass = `badge-${item.difficulty.toLowerCase()}`;
    return `
      <div class="history-item" data-id="${item.id}">
        <div class="history-item-subject">${escHtml(item.subject)}</div>
        <div class="history-item-topic">${escHtml(item.topic)}</div>
        <div class="history-item-meta">
          <span class="difficulty-badge ${badgeClass}">${item.difficulty}</span>
          <span>${item.ts}</span>
        </div>
      </div>`;
  }).join('');

  dom.historyList.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', () => {
      const id   = parseInt(el.dataset.id);
      const item = chatHistory.find(h => h.id === id);
      if (item) {
        dom.subjectInput.value = item.subject;
        dom.topicInput.value   = item.topic;
        setDifficulty(item.difficulty);
        currentSession = item;
        renderResponse(item);
        // On mobile close sidebar
        if (window.innerWidth <= 992) dom.sidebar.classList.remove('open');
        showToast(`Loaded: ${item.topic}`, 'info');
      }
    });
  });
}

function setDifficulty(diff) {
  selectedDiff = diff;
  dom.diffBtns.forEach(b => {
    b.className = 'difficulty-btn';
    if (b.dataset.diff === diff) b.classList.add(`active-${diff.toLowerCase()}`);
  });
}

function saveHistory() {
  try { localStorage.setItem('edumentor-history', JSON.stringify(chatHistory)); } catch (_) {}
}

function loadHistory() {
  try {
    const raw = localStorage.getItem('edumentor-history');
    if (raw) chatHistory = JSON.parse(raw);
  } catch (_) { chatHistory = []; }
  renderHistory();
}

function clearHistory() {
  chatHistory = [];
  saveHistory();
  renderHistory();
  showToast('History cleared.', 'info');
}

/* ─────────────────────────────────────────────────────────────────────────────
   Copy & Download
───────────────────────────────────────────────────────────────────────────── */
function copyResponse() {
  if (!currentSession) return;
  const text = currentSession.raw || '';
  navigator.clipboard.writeText(text).then(() => {
    showToast('Response copied to clipboard! 📋', 'success');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Response copied to clipboard! 📋', 'success');
  });
}

function downloadPDF() {
  if (!currentSession) return;
  const { subject, topic, difficulty } = currentSession;

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>EduMentor AI – ${topic}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1f2328; line-height: 1.7; }
        h1   { font-size: 1.6rem; color: #6366f1; margin-bottom: .25rem; }
        .meta { color: #666; font-size: .85rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #e5e7eb; }
        h2   { font-size: 1.15rem; color: #4f46e5; margin: 1.5rem 0 .6rem; padding-left: .75rem; border-left: 4px solid #6366f1; }
        ul   { padding-left: 1.5rem; }
        li   { margin-bottom: .3rem; }
        p    { margin-bottom: .75rem; }
        .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; font-size: .8rem; color: #aaa; text-align: center; }
      </style>
    </head>
    <body>
      <h1>📚 ${escHtml(topic)}</h1>
      <div class="meta">Subject: <strong>${escHtml(subject)}</strong> · Difficulty: <strong>${difficulty}</strong> · Generated by EduMentor AI</div>
      <div>${dom.responseArea.innerHTML}</div>
      <div class="footer">Generated by EduMentor AI – Powered by IBM watsonx.ai &amp; IBM Granite Foundation Models</div>
    </body>
    </html>`;

  const win = window.open('', '_blank');
  if (!win) { showToast('Please allow pop-ups to download PDF.', 'warning'); return; }
  win.document.write(printContent);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
  showToast('PDF download initiated! 📄', 'success');
}

/* ─────────────────────────────────────────────────────────────────────────────
   Toast Notifications
───────────────────────────────────────────────────────────────────────────── */
function showToast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast-custom ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  dom.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity .3s ease, transform .3s ease';
    toast.style.opacity    = '0';
    toast.style.transform  = 'translateX(110%)';
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─────────────────────────────────────────────────────────────────────────────
   Mobile Sidebar
───────────────────────────────────────────────────────────────────────────── */
function initSidebar() {
  if (dom.sidebarToggle) {
    dom.sidebarToggle.addEventListener('click', () => {
      dom.sidebar.classList.toggle('open');
    });
  }
  // Close sidebar on outside click (mobile)
  document.addEventListener('click', e => {
    if (window.innerWidth <= 992 &&
        dom.sidebar.classList.contains('open') &&
        !dom.sidebar.contains(e.target) &&
        e.target !== dom.sidebarToggle) {
      dom.sidebar.classList.remove('open');
    }
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   Subject Suggestions (Quick-fill)
───────────────────────────────────────────────────────────────────────────── */
const SUBJECT_SUGGESTIONS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
  'History', 'Geography', 'Economics', 'English Literature', 'Philosophy'
];

function initSubjectSuggestions() {
  const wrap = document.getElementById('subjectSuggestions');
  if (!wrap) return;
  wrap.innerHTML = SUBJECT_SUGGESTIONS.map(s =>
    `<span class="feature-pill" style="cursor:pointer;" data-val="${s}">${s}</span>`
  ).join('');
  wrap.querySelectorAll('.feature-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      dom.subjectInput.value = pill.dataset.val;
      dom.topicInput.focus();
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   Enter Key Support
───────────────────────────────────────────────────────────────────────────── */
function initKeyboard() {
  [dom.subjectInput, dom.topicInput].forEach(input => {
    if (input) input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generateContent(); }
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   Bootstrap (init everything)
───────────────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDifficultyBtns();
  initSidebar();
  initSubjectSuggestions();
  initKeyboard();
  loadHistory();

  if (dom.themeToggle)  dom.themeToggle.addEventListener('click', toggleTheme);
  if (dom.generateBtn)  dom.generateBtn.addEventListener('click', generateContent);
  if (dom.copyBtn)      dom.copyBtn.addEventListener('click', copyResponse);
  if (dom.downloadBtn)  dom.downloadBtn.addEventListener('click', downloadPDF);
  if (dom.clearHistoryBtn) dom.clearHistoryBtn.addEventListener('click', clearHistory);
});
