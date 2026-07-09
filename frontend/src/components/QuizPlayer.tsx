// ============================================================
// CodeQuest — Quiz Player Component
// ============================================================

import { useState } from 'react';

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: number;
  question_text: string;
  options: QuizOption[];
}

interface QuizPlayerProps {
  questions: Question[];
  quizId: number;
  onSubmit: (answers: { question_id: number; selected_index: number }[]) => void;
}

export default function QuizPlayer({ questions, quizId, onSubmit }: QuizPlayerProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackCorrect, setFeedbackCorrect] = useState(false);

  const question = questions[currentQ];
  const selectedIndex = answers[question.id];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  const selectAnswer = (index: number) => {
    if (showFeedback) return;

    setAnswers(prev => ({ ...prev, [question.id]: index }));

    // Show instant feedback
    const isCorrect = question.options[index].isCorrect;
    setFeedbackCorrect(isCorrect);
    setShowFeedback(true);

    setTimeout(() => {
      setShowFeedback(false);
      if (currentQ < totalQuestions - 1) {
        setCurrentQ(prev => prev + 1);
      }
    }, 1200);
  };

  const handleSubmit = () => {
    const formattedAnswers = Object.entries(answers).map(([questionId, selectedIndex]) => ({
      question_id: parseInt(questionId),
      selected_index: selectedIndex,
    }));
    onSubmit(formattedAnswers);
  };

  const progress = ((currentQ + 1) / totalQuestions) * 100;

  return (
    <div className="quiz-container">
      {/* Progress */}
      <div className="mb-lg">
        <div className="flex-between mb-sm">
          <span className="text-muted" style={{ fontFamily: 'var(--font-display)' }}>
            Question {currentQ + 1} of {totalQuestions}
          </span>
          <span className="text-muted">{answeredCount}/{totalQuestions} answered</span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="quiz-question">
        <h3 className="quiz-question-text">{question.question_text}</h3>

        <div className="quiz-options">
          {question.options.map((option, i) => {
            const isSelected = selectedIndex === i;
            let extraClass = '';
            if (showFeedback && isSelected) {
              extraClass = option.isCorrect ? 'correct' : 'incorrect';
            }
            if (showFeedback && option.isCorrect && !isSelected) {
              extraClass = 'correct';
            }

            return (
              <div
                key={i}
                className={`quiz-option ${isSelected && !showFeedback ? 'selected' : ''} ${extraClass}`}
                onClick={() => selectAnswer(i)}
                style={{ cursor: showFeedback ? 'default' : 'pointer' }}
              >
                <div className="quiz-option-marker">
                  {showFeedback && isSelected ? (feedbackCorrect ? '✓' : '✗') :
                   showFeedback && option.isCorrect ? '✓' :
                   String.fromCharCode(65 + i)}
                </div>
                <span>{option.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div className={`alert ${feedbackCorrect ? 'alert-success' : 'alert-error'} mt-md`} style={{ textAlign: 'center' }}>
          {feedbackCorrect ? '🎉 Correct! Great job!' : '😊 Not quite, but keep trying!'}
        </div>
      )}

      {/* Navigation & Submit */}
      <div className="flex gap-md mt-xl">
        <button
          className="btn btn-ghost"
          onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
          disabled={currentQ === 0 || showFeedback}
        >
          ← Previous
        </button>

        <div style={{ flex: 1 }} />

        {currentQ < totalQuestions - 1 ? (
          <button
            className="btn btn-primary"
            onClick={() => setCurrentQ(prev => prev + 1)}
            disabled={selectedIndex === undefined || showFeedback}
          >
            Next →
          </button>
        ) : (
          <button
            className="btn btn-success btn-lg"
            onClick={handleSubmit}
            disabled={answeredCount < totalQuestions || showFeedback}
          >
            🏆 Submit Quiz
          </button>
        )}
      </div>

      {/* Question dots */}
      <div className="flex-center gap-sm mt-lg">
        {questions.map((q, i) => (
          <div
            key={q.id}
            onClick={() => !showFeedback && setCurrentQ(i)}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: i === currentQ
                ? 'var(--color-primary)'
                : answers[q.id] !== undefined
                ? 'var(--color-accent-green)'
                : 'var(--color-surface-light)',
              cursor: showFeedback ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
