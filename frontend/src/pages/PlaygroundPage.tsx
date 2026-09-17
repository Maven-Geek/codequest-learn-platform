// ============================================================
// CodeQuest — Code Playground / Sandbox Page (Recommendation #1)
// Free-form coding sandbox with live execution, language switching,
// comparison drawer, and snippet spell book integration
// ============================================================

import { useState, useEffect } from 'react';
import CodeEditor from '../components/CodeEditor';
import LanguageSelector, { LANGUAGE_OPTIONS } from '../components/LanguageSelector';
import CodeComparison from '../components/CodeComparison';
import SnippetLibrary from '../components/SnippetLibrary';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { CodingLanguage } from '../../../shared/src/types';

export default function PlaygroundPage() {
  const { user, updatePreferredLanguage } = useAuth();
  const [language, setLanguage] = useState<CodingLanguage>(user?.preferred_coding_language || 'python');
  const [activeTab, setActiveTab] = useState<'editor' | 'comparison' | 'snippets'>('editor');
  const [activeCode, setActiveCode] = useState<string>('');

  useEffect(() => {
    const selected = LANGUAGE_OPTIONS.find((l) => l.id === language);
    setActiveCode(selected?.defaultTemplate || '');
  }, [language]);

  const handleLanguageChange = (newLang: CodingLanguage) => {
    setLanguage(newLang);
    updatePreferredLanguage(newLang);
  };

  const handleRun = async () => {
    try {
      await api.updateStreak();
    } catch {
      // ignore
    }
  };

  const loadTemplate = (type: 'hello' | 'loop' | 'func' | 'calc') => {
    if (language === 'python') {
      if (type === 'hello') setActiveCode('print("Hello from CodeQuest! 🚀")\n');
      if (type === 'loop') setActiveCode('for i in range(1, 6):\n    print(f"Counting: {i}")\n');
      if (type === 'func') setActiveCode('def greet(name):\n    return f"Welcome, {name}!"\n\nprint(greet("Explorer"))\n');
      if (type === 'calc') setActiveCode('def add(a, b):\n    return a + b\n\nprint("5 + 7 =", add(5, 7))\n');
    } else if (language === 'javascript') {
      if (type === 'hello') setActiveCode('console.log("Hello from CodeQuest! 🚀");\n');
      if (type === 'loop') setActiveCode('for (let i = 1; i <= 5; i++) {\n    console.log("Counting: " + i);\n}\n');
      if (type === 'func') setActiveCode('function greet(name) {\n    return "Welcome, " + name + "!";\n}\nconsole.log(greet("Explorer"));\n');
      if (type === 'calc') setActiveCode('function add(a, b) {\n    return a + b;\n}\nconsole.log("5 + 7 = " + add(5, 7));\n');
    } else if (language === 'java') {
      if (type === 'hello') setActiveCode('public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from CodeQuest! 🚀");\n    }\n}\n');
      if (type === 'loop') setActiveCode('public class Main {\n    public static void main(String[] args) {\n        for (int i = 1; i <= 5; i++) {\n            System.out.println("Counting: " + i);\n        }\n    }\n}\n');
      if (type === 'func') setActiveCode('public class Main {\n    public static String greet(String name) {\n        return "Welcome, " + name + "!";\n    }\n    public static void main(String[] args) {\n        System.out.println(greet("Explorer"));\n    }\n}\n');
      if (type === 'calc') setActiveCode('public class Main {\n    public static int add(int a, int b) {\n        return a + b;\n    }\n    public static void main(String[] args) {\n        System.out.println("5 + 7 = " + add(5, 7));\n    }\n}\n');
    }
  };

  const handleDownload = () => {
    const ext = language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'java';
    const blob = new Blob([activeCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codequest_playground.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      {/* Hero Banner */}
      <div
        className="card mb-lg"
        style={{
          background: 'linear-gradient(135deg, #2b8a3e, #0b7285)',
          color: 'white',
          padding: 'var(--space-xl)',
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
        }}
      >
        <div className="flex-between">
          <div>
            <h1 style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: 'var(--space-xs)' }}>
              🧪 Code Playground
            </h1>
            <p style={{ opacity: 0.9, margin: 0, maxWidth: '600px' }}>
              Your free-form laboratory! Experiment with Python, JavaScript, or Java, run live code, test ideas, and save your favorite snippets.
            </p>
          </div>

          <div className="playground-stats-pill">
            <span>🔥 Streak: {user?.coding_streak_count || 0} Days</span>
          </div>
        </div>
      </div>

      {/* Top Controls: Language Switcher + Navigation Tabs */}
      <div className="flex-between mb-lg flex-wrap gap-md">
        <LanguageSelector
          selectedLanguage={language}
          onSelectLanguage={handleLanguageChange}
          compact
        />

        <div className="tab-group-pills">
          <button
            className={`tab-pill-btn ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            💻 Editor & Console
          </button>
          <button
            className={`tab-pill-btn ${activeTab === 'comparison' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparison')}
          >
            🔄 3-Way Comparison
          </button>
          <button
            className={`tab-pill-btn ${activeTab === 'snippets' ? 'active' : ''}`}
            onClick={() => setActiveTab('snippets')}
          >
            📖 Spell Book
          </button>
        </div>
      </div>

      {/* Tab: Editor */}
      {activeTab === 'editor' && (
        <div>
          {/* Quick Template Buttons & Actions Bar */}
          <div className="playground-action-bar mb-md">
            <div className="template-buttons">
              <span className="template-label">Templates:</span>
              <button className="btn btn-ghost btn-xs" onClick={() => loadTemplate('hello')}>
                👋 Hello World
              </button>
              <button className="btn btn-ghost btn-xs" onClick={() => loadTemplate('loop')}>
                🔄 Loop 1..5
              </button>
              <button className="btn btn-ghost btn-xs" onClick={() => loadTemplate('func')}>
                🧙 Function
              </button>
              <button className="btn btn-ghost btn-xs" onClick={() => loadTemplate('calc')}>
                🧮 Calculator
              </button>
            </div>

            <div className="playground-right-actions">
              <button className="btn btn-ghost btn-xs" onClick={handleDownload}>
                💾 Download File
              </button>
            </div>
          </div>

          {/* Code Editor */}
          <CodeEditor
            initialCode={activeCode}
            language={language}
            onChange={(c) => setActiveCode(c)}
            onRun={handleRun}
            minHeight="350px"
          />
        </div>
      )}

      {/* Tab: Code Comparison */}
      {activeTab === 'comparison' && (
        <div className="mt-md">
          <CodeComparison />
        </div>
      )}

      {/* Tab: Spell Book */}
      {activeTab === 'snippets' && (
        <div className="mt-md">
          <SnippetLibrary
            activeLanguage={language}
            onInsertCode={(code) => {
              setActiveCode(code);
              setActiveTab('editor');
            }}
          />
        </div>
      )}
    </div>
  );
}
