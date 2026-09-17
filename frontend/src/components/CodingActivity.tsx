// ============================================================
// CodeQuest — Coding Activity Orchestrator
// Coordinates CodeEditor with Lesson Instructions, Tests, Hints,
// and Completion Progression
// ============================================================

import { useState, useEffect } from 'react';
import CodeEditor from './CodeEditor';
import { CodingActivityData } from '../../../shared/src/types';
import { playSound } from '../utils/audio';

interface CodingActivityProps {
  activity: CodingActivityData;
  onComplete: () => void;
  onGoToQuiz?: () => void;
}

export default function CodingActivity({
  activity,
  onComplete,
  onGoToQuiz,
}: CodingActivityProps) {
  const [currentCode, setCurrentCode] = useState(activity.starterCode || '');
  const [hintIndex, setHintIndex] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [passed, setPassed] = useState(false);
  const [testedOnce, setTestedOnce] = useState(false);
  const [outputResult, setOutputResult] = useState('');

  useEffect(() => {
    setCurrentCode(activity.starterCode || '');
    setHintIndex(0);
    setValidationErrors([]);
    setPassed(false);
    setTestedOnce(false);
    setOutputResult('');
  }, [activity]);

  const hints = activity.hints || [];

  const handleNextHint = () => {
    if (hintIndex < hints.length) {
      setHintIndex(hintIndex + 1);
    }
  };

  const handleRunAndValidate = (code: string, output: string, error?: string) => {
    setOutputResult(output);
    setTestedOnce(true);

    if (error) {
      setValidationErrors([error]);
      setPassed(false);
      playSound('wrong');
      return;
    }

    const errors: string[] = [];

    // Check validation regex patterns if provided
    if (activity.validationPatterns && activity.validationPatterns.length > 0) {
      for (const pattern of activity.validationPatterns) {
        const regex = new RegExp(pattern, 'm');
        if (!regex.test(code)) {
          errors.push(`Requirement not met: expected syntax matching pattern.`);
        }
      }
    }

    // Check expected output if specified
    if (activity.expectedOutput && activity.expectedOutput.trim()) {
      const cleanExpected = activity.expectedOutput.trim();
      const cleanActual = output.trim();
      if (!cleanActual.includes(cleanExpected)) {
        errors.push(`Output mismatch: expected "${cleanExpected}", but got "${cleanActual}"`);
      }
    }

    if (errors.length === 0) {
      setPassed(true);
      setValidationErrors([]);
      playSound('correct');
      onComplete();
    } else {
      setPassed(false);
      setValidationErrors(errors);
      playSound('wrong');
    }
  };

  return (
    <div className="coding-activity-container">
      {/* Top Banner / Instructions */}
      <div className="coding-briefing-card">
        <div className="briefing-header">
          <div className="briefing-title-group">
            <span className="briefing-icon">🎯</span>
            <h3 className="briefing-heading">Mission Objective</h3>
          </div>
          <span className={`briefing-tag lang-${activity.language}`}>
            {activity.language.toUpperCase()}
          </span>
        </div>

        <div className="briefing-instructions">
          {activity.instructions.split('\n').map((line, idx) => (
            <p key={idx} style={{ margin: '4px 0' }}>
              {line}
            </p>
          ))}
        </div>

        {/* Hints Section */}
        {hints.length > 0 && (
          <div className="coding-hints-section">
            <div className="flex-between mb-xs">
              <span className="hint-label">💡 Need a Hint? ({hintIndex}/{hints.length})</span>
              {hintIndex < hints.length && (
                <button className="btn btn-ghost btn-xs" onClick={handleNextHint}>
                  Reveal Hint {hintIndex + 1}
                </button>
              )}
            </div>

            {hintIndex > 0 && (
              <div className="hint-display-box">
                {hints.slice(0, hintIndex).map((hint, i) => (
                  <div key={i} className="hint-item">
                    <span className="hint-bullet">👉</span> {hint}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Code Editor Container */}
      <div className="coding-editor-panel">
        <CodeEditor
          initialCode={activity.starterCode || ''}
          language={activity.language}
          onChange={(code) => setCurrentCode(code)}
          onRun={(code, output, err) => handleRunAndValidate(code, output, err)}
          expectedOutput={activity.expectedOutput}
          minHeight="260px"
        />
      </div>

      {/* Validation Feedback & Completion Card */}
      {testedOnce && (
        <div className={`coding-feedback-card ${passed ? 'passed' : 'failed'}`}>
          {passed ? (
            <div className="feedback-success">
              <div className="feedback-badge">🎉 Outstanding! Code Accepted!</div>
              <p className="feedback-text">
                Your code ran cleanly, produced the expected output, and satisfied all programming rules!
              </p>
              {onGoToQuiz && (
                <button className="btn btn-primary btn-md mt-sm" onClick={onGoToQuiz}>
                  Take the Knowledge Quiz →
                </button>
              )}
            </div>
          ) : (
            <div className="feedback-failed">
              <div className="feedback-badge-fail">⚠️ Keep Going! Check your code:</div>
              <ul className="feedback-error-list">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
              {activity.solution && (
                <details className="solution-spoiler mt-sm">
                  <summary className="solution-summary">👀 Peek at Reference Solution</summary>
                  <pre className="solution-code"><code>{activity.solution}</code></pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
