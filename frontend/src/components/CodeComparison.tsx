// ============================================================
// CodeQuest — Code Comparison Component (Recommendation #2)
// Side-by-side / Multi-column View of Python, JavaScript, and Java
// ============================================================

import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { CodeComparisonSample } from '../../../shared/src/types';

export default function CodeComparison() {
  const [samples, setSamples] = useState<CodeComparisonSample[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedLang, setCopiedLang] = useState<string | null>(null);

  useEffect(() => {
    api.getComparisonSamples().then((res) => {
      if (res.data) setSamples(res.data);
    }).catch(console.error);
  }, []);

  const currentSample = samples[selectedIndex];

  const handleCopy = (code: string, lang: string) => {
    navigator.clipboard.writeText(code);
    setCopiedLang(lang);
    setTimeout(() => setCopiedLang(null), 2000);
  };

  if (!currentSample) return null;

  return (
    <div className="code-comparison-card">
      <div className="comparison-header">
        <div className="comparison-title-box">
          <span className="comparison-icon">🔄</span>
          <div>
            <h3 className="comparison-title">Multi-Language Code Comparison</h3>
            <p className="comparison-subtitle">See how the same concept looks across Python, JavaScript, and Java!</p>
          </div>
        </div>

        {/* Concept selector pills */}
        <div className="comparison-pills">
          {samples.map((s, idx) => (
            <button
              key={idx}
              className={`comparison-pill-btn ${idx === selectedIndex ? 'active' : ''}`}
              onClick={() => setSelectedIndex(idx)}
            >
              {s.concept}
            </button>
          ))}
        </div>
      </div>

      <div className="comparison-desc-banner">
        <strong>{currentSample.title}:</strong> {currentSample.description}
      </div>

      {/* 3-Column Side-by-Side Comparison */}
      <div className="comparison-columns-grid">
        {/* Python Column */}
        <div className="comparison-col theme-python">
          <div className="comparison-col-header">
            <span className="col-lang-tag">🐍 Python</span>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => handleCopy(currentSample.python, 'py')}
            >
              {copiedLang === 'py' ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
          <pre className="comparison-code-box"><code>{currentSample.python}</code></pre>
          <div className="comparison-footer-tip">
            💡 Indentation defines code blocks. Variables need no keyword or type prefix.
          </div>
        </div>

        {/* JavaScript Column */}
        <div className="comparison-col theme-javascript">
          <div className="comparison-col-header">
            <span className="col-lang-tag">⚡ JavaScript</span>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => handleCopy(currentSample.javascript, 'js')}
            >
              {copiedLang === 'js' ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
          <pre className="comparison-code-box"><code>{currentSample.javascript}</code></pre>
          <div className="comparison-footer-tip">
            💡 Uses <code>let</code> or <code>const</code>. Statements end with semicolons.
          </div>
        </div>

        {/* Java Column */}
        <div className="comparison-col theme-java">
          <div className="comparison-col-header">
            <span className="col-lang-tag">☕ Java</span>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => handleCopy(currentSample.java, 'java')}
            >
              {copiedLang === 'java' ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
          <pre className="comparison-code-box"><code>{currentSample.java}</code></pre>
          <div className="comparison-footer-tip">
            💡 Strictly typed (e.g. <code>String</code>, <code>int</code>). Requires a class and main method.
          </div>
        </div>
      </div>
    </div>
  );
}
