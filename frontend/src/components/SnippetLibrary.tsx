// ============================================================
// CodeQuest — Snippet Library & Spell Book (Recommendation #4)
// Collectible recipes and user-saved code snippets
// ============================================================

import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { CodeSnippet, CodingLanguage } from '../../../shared/src/types';

interface SnippetLibraryProps {
  onInsertCode?: (code: string) => void;
  activeLanguage?: CodingLanguage;
}

export default function SnippetLibrary({
  onInsertCode,
  activeLanguage = 'python',
}: SnippetLibraryProps) {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [selectedLang, setSelectedLang] = useState<string>(activeLanguage);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const loadSnippets = async () => {
    try {
      const res = await api.getCodingSnippets(selectedLang === 'all' ? undefined : selectedLang);
      if (res.data) setSnippets(res.data);
    } catch (err) {
      console.error('Failed to load snippets:', err);
    }
  };

  useEffect(() => {
    loadSnippets();
  }, [selectedLang]);

  const handleCopy = (id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newCode) return;
    try {
      await api.saveCodingSnippet({
        title: newTitle,
        language: selectedLang === 'all' ? 'python' : selectedLang,
        code: newCode,
        description: newDesc,
      });
      setShowAddModal(false);
      setNewTitle('');
      setNewCode('');
      setNewDesc('');
      loadSnippets();
    } catch (err) {
      console.error('Failed to save snippet:', err);
    }
  };

  const filtered = snippets.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase())) ||
      s.code.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="snippet-library-card">
      <div className="snippet-header">
        <div className="snippet-title-group">
          <span className="spell-book-icon">📖</span>
          <div>
            <h3 className="snippet-main-title">Code Spell Book & Snippets</h3>
            <p className="snippet-subtitle">Collectible coding recipes and shortcuts you can reference anytime!</p>
          </div>
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          + Save Snippet
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="snippet-toolbar">
        <div className="snippet-lang-filters">
          {['all', 'python', 'javascript', 'java'].map((lang) => (
            <button
              key={lang}
              className={`snippet-filter-btn ${selectedLang === lang ? 'active' : ''}`}
              onClick={() => setSelectedLang(lang)}
            >
              {lang === 'all' ? '🌐 All' : lang === 'python' ? '🐍 Python' : lang === 'javascript' ? '⚡ JavaScript' : '☕ Java'}
            </button>
          ))}
        </div>

        <input
          type="text"
          className="form-input snippet-search-input"
          placeholder="🔍 Search snippets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Snippet Cards Grid */}
      <div className="snippet-grid">
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
            <span className="empty-state-emoji">📜</span>
            <p>No snippets found. Save your first code snippet!</p>
          </div>
        ) : (
          filtered.map((snip) => (
            <div key={snip.id} className={`snippet-card theme-${snip.language}`}>
              <div className="snippet-card-top">
                <div className="snippet-card-title-box">
                  <span className="snippet-card-lang-icon">
                    {snip.language === 'python' ? '🐍' : snip.language === 'javascript' ? '⚡' : '☕'}
                  </span>
                  <span className="snippet-card-title">{snip.title}</span>
                </div>
                {snip.is_spell_book && <span className="spell-tag">✨ Spell Book</span>}
              </div>

              {snip.description && <p className="snippet-card-desc">{snip.description}</p>}

              <pre className="snippet-card-code"><code>{snip.code}</code></pre>

              <div className="snippet-card-actions">
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => handleCopy(snip.id, snip.code)}
                >
                  {copiedId === snip.id ? '✓ Copied' : '📋 Copy'}
                </button>
                {onInsertCode && (
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => onInsertCode(snip.code)}
                  >
                    ⬇ Insert to Editor
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Snippet Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>✨ Add to Spell Book</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group mb-md">
                <label className="form-label">Snippet Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. List Filter or Loop Counter"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group mb-md">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="What does this snippet do?"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div className="form-group mb-md">
                <label className="form-label">Code</label>
                <textarea
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono, monospace)', minHeight: '120px' }}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save to Spell Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
