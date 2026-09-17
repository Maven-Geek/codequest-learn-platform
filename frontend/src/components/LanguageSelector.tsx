// ============================================================
// CodeQuest — Language Selector Component
// 3-Card & Pill Switcher for Python, JavaScript, and Java
// ============================================================

import React from 'react';
import { CodingLanguage, CodingLanguageInfo } from '../../../shared/src/types';

interface LanguageSelectorProps {
  selectedLanguage: CodingLanguage;
  onSelectLanguage: (language: CodingLanguage) => void;
  compact?: boolean;
}

export const LANGUAGE_OPTIONS: CodingLanguageInfo[] = [
  {
    id: 'python',
    name: 'Python',
    icon: '🐍',
    badge: 'Easiest to Learn',
    tagline: 'Clean, readable & powerful',
    description: 'The world\'s #1 language for beginners, AI, robotics, and scientific discoveries. Reads like everyday English!',
    difficulty: 'Beginner',
    defaultTemplate: '# Write Python code here\nprint("Hello, Python!")\n'
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    icon: '⚡',
    badge: 'Web Standard',
    tagline: 'The language of the Internet',
    description: 'Powers every interactive website and web game in existence. Run code instantly in any browser!',
    difficulty: 'Intermediate',
    defaultTemplate: '// Write JavaScript code here\nconsole.log("Hello, JavaScript!");\n'
  },
  {
    id: 'java',
    name: 'Java',
    icon: '☕',
    badge: 'Enterprise Strong',
    tagline: 'Minecraft & Android Power',
    description: 'The legendary language behind Minecraft and mobile apps. Teaches strict typed discipline and solid coding habits.',
    difficulty: 'Advanced',
    defaultTemplate: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Java!");\n    }\n}\n'
  }
];

export default function LanguageSelector({
  selectedLanguage,
  onSelectLanguage,
  compact = false,
}: LanguageSelectorProps) {
  if (compact) {
    return (
      <div className="language-pill-group">
        {LANGUAGE_OPTIONS.map((lang) => {
          const isSelected = selectedLanguage === lang.id;
          return (
            <button
              key={lang.id}
              type="button"
              className={`language-pill-btn ${isSelected ? 'active' : ''} pill-${lang.id}`}
              onClick={() => onSelectLanguage(lang.id)}
            >
              <span className="lang-pill-icon">{lang.icon}</span>
              <span className="lang-pill-name">{lang.name}</span>
              {isSelected && <span className="lang-pill-check">✓</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="language-selector-grid">
      {LANGUAGE_OPTIONS.map((lang) => {
        const isSelected = selectedLanguage === lang.id;
        return (
          <div
            key={lang.id}
            className={`language-card ${isSelected ? 'selected' : ''} card-${lang.id}`}
            onClick={() => onSelectLanguage(lang.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectLanguage(lang.id)}
          >
            <div className="lang-card-header">
              <span className="lang-card-icon">{lang.icon}</span>
              <span className={`lang-difficulty-badge ${lang.difficulty.toLowerCase()}`}>
                {lang.difficulty}
              </span>
            </div>

            <h3 className="lang-card-title">{lang.name}</h3>
            <p className="lang-card-tagline">{lang.tagline}</p>
            <p className="lang-card-desc">{lang.description}</p>

            <div className="lang-card-footer">
              <span className="lang-badge-pill">{lang.badge}</span>
              <span className="lang-select-action">
                {isSelected ? 'Selected ✅' : 'Choose 🚀'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
