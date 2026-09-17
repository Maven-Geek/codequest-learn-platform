# Add Multi-Language Coding Lessons (Python, JavaScript, Java)

Extend CodeQuest with a full **Coding Lab** feature where learners select a programming language (Python, JavaScript, or Java) and work through structured coding lessons with real code editors, syntax-appropriate environments, validation, and progression.

## User Review Required

> [!IMPORTANT]
> **New Activity Type**: This introduces a new `coding` activity type alongside the existing `drag-drop`, `puzzle`, `pattern`, and `game` types. Existing lessons are **not** modified — all coding content lives in new levels/lessons.

> [!IMPORTANT]
> **No Server-Side Code Execution**: Code is validated client-side using pattern matching, AST-like checks, and expected output comparison. This avoids the security risks and infrastructure costs of running arbitrary user code on the server. The editor simulates a console output panel.

> [!WARNING]
> **Database Migration**: A new `coding_language` column is added to the `lessons` table, and new levels (5, 6, 7) with their lessons and quizzes are seeded. This is non-destructive to existing data.

## Open Questions

1. **Language preference persistence**: Should the learner's selected language be stored in their user profile (database column) so it persists across sessions, or is session-based (localStorage) sufficient?
2. **Sidebar navigation**: Should "Coding Lab" appear as a separate sidebar item, or should the coding lessons be integrated into the existing Level Map alongside the drag-drop levels?
3. **Age appropriateness**: The current platform targets ages 6–12 with block-based puzzles. The text-based coding lessons will be most suitable for ages 10+. Should we add a prerequisite (e.g., complete Level 3) before unlocking the Coding Lab?

---

## Proposed Changes

### Shared Types

#### [MODIFY] [types.ts](file:///c:/Users/Imago%20DEI/Documents/Part%20Five%20-%20Materials/Rain%20Semester/CPE%20508/learn-platform/shared/src/types.ts)

- Add `'coding'` to the `ActivityType` union
- Add `CodingLanguage` type: `'python' | 'javascript' | 'java'`
- Add `CodingActivityData` interface with fields:
  - `language: CodingLanguage` — which language this lesson uses
  - `instructions: string` — what the learner should do
  - `starterCode: string` — pre-filled code template
  - `expectedOutput: string` — the expected console output
  - `solution: string` — the full correct solution (for hints)
  - `validationPatterns: string[]` — regex patterns the code must match (e.g., must use `let`, must declare a function)
  - `hints: string[]` — progressive hint system
  - `concept: string` — the programming concept being taught (e.g., "variables", "arrays", "loops")
- Add `CodingActivityData` to the `ActivityData` union type

---

### Backend — Database & Seed Data

#### [MODIFY] [database.ts](file:///c:/Users/Imago%20DEI/Documents/Part%20Five%20-%20Materials/Rain%20Semester/CPE%20508/learn-platform/backend/src/database.ts)

- **Schema migration**: Add `coding_language TEXT` column to `lessons` table (nullable, only used for coding-type lessons)
- **New function** `seedCodingLessons()`: Creates 3 new levels and seeds all coding lessons:

**Level 5 — "The Variable Vault" (3 lessons per language = 9 total)**

| # | Lesson Title | Concept | What They Code |
|---|---|---|---|
| 1 | Declaring Variables | Variables & assignment | Declare variables of different types, print them |
| 2 | Data Types Explorer | Strings, numbers, booleans | Create variables of each type, check types |
| 3 | Variable Operations | Arithmetic & string concatenation | Perform math operations, combine strings |

**Level 6 — "The Data Structure Den" (3 lessons per language = 9 total)**

| # | Lesson Title | Concept | What They Code |
|---|---|---|---|
| 1 | Lists & Arrays | Arrays/Lists basics | Create a list, add items, access by index |
| 2 | Dictionaries & Objects | Key-value data | Create a dictionary/object, access properties |
| 3 | Data Structure Challenge | Combined | Build a mini contact book with arrays + objects |

**Level 7 — "The Logic Laboratory" (3 lessons per language = 9 total)**

| # | Lesson Title | Concept | What They Code |
|---|---|---|---|
| 1 | If/Else Decisions | Conditionals | Write an age-checker program |
| 2 | Loop the Loop | For/While loops | Print patterns, sum numbers |
| 3 | Function Factory | Functions | Create and call reusable functions |

Each lesson has language-specific variants. Example for "Declaring Variables":

```
Python:
  starterCode: "# Declare a variable called 'name' and set it to your name\n\n# Declare a variable called 'age' and set it to your age\n\n# Print both variables\n"
  expectedOutput: contains "name" and "age" variable assignments using =, and print()
  
JavaScript:
  starterCode: "// Declare a variable called 'name' and set it to your name\n\n// Declare a variable called 'age' and set it to your age\n\n// Print both variables using console.log()\n"
  expectedOutput: contains let/const declarations and console.log()

Java:
  starterCode: "public class Main {\n  public static void main(String[] args) {\n    // Declare a String variable called 'name'\n\n    // Declare an int variable called 'age'\n\n    // Print both variables\n  }\n}"
  expectedOutput: contains String/int declarations and System.out.println()
```

- **Quiz seeding**: Each lesson gets 2-3 quiz questions about the specific concept in the specific language
- **Badge seeding**: New badges for each language track ("Python Pioneer 🐍", "JavaScript Ninja ⚡", "Java Knight ☕")

#### [MODIFY] [lessons.ts](file:///c:/Users/Imago%20DEI/Documents/Part%20Five%20-%20Materials/Rain%20Semester/CPE%20508/learn-platform/backend/src/routes/lessons.ts)

- Update `normalizeLessonActivityData()` to handle `activity_type === 'coding'` — parse `activity_data` JSON and include `coding_language`
- Add `GET /api/coding/languages` — returns the 3 supported languages with metadata (name, icon, description)
- Add `POST /api/coding/validate` — validates submitted code against the lesson's `validationPatterns` and `expectedOutput` server-side (pattern matching only, no execution)

---

### Frontend — New Components

#### [NEW] [CodeEditor.tsx](file:///c:/Users/Imago%20DEI/Documents/Part%20Five%20-%20Materials/Rain%20Semester/CPE%20508/learn-platform/frontend/src/components/CodeEditor.tsx)

A rich, syntax-highlighted code editor component with:

- **Syntax highlighting**: Built-in tokenizer for Python, JavaScript, and Java using regex-based highlighting (no external library needed — uses a `<textarea>` overlaid on a `<pre><code>` block with token coloring)
- **Language-specific themes**:
  - Python: Blue/green theme with 🐍 icon
  - JavaScript: Yellow/amber theme with ⚡ icon  
  - Java: Red/orange theme with ☕ icon
- **Line numbers**: Displayed in a gutter column
- **Tab support**: Tab key inserts proper indentation (2 spaces for JS, 4 for Python, 4 for Java)
- **Auto-closing**: Brackets, parentheses, and quotes
- **Error highlighting**: Red underline on lines with syntax issues
- **Console output panel**: A dark terminal-like panel below the editor showing simulated output
- **Toolbar**: Run button, Reset button, Hint button, language indicator badge
- **Responsive**: Works on tablet and mobile with adjusted sizing

#### [NEW] [LanguageSelector.tsx](file:///c:/Users/Imago%20DEI/Documents/Part%20Five%20-%20Materials/Rain%20Semester/CPE%20508/learn-platform/frontend/src/components/LanguageSelector.tsx)

A premium language selection card UI:

- Three large, animated cards for Python 🐍, JavaScript ⚡, Java ☕
- Each card shows: language name, icon, short description, difficulty indicator
- Hover animations (lift + glow in language theme color)
- Selected state with check badge
- Saves selection to localStorage
- Shown when learner navigates to `/coding` or at the top of the coding level map

#### [NEW] [CodingActivity.tsx](file:///c:/Users/Imago%20DEI/Documents/Part%20Five%20-%20Materials/Rain%20Semester/CPE%20508/learn-platform/frontend/src/components/CodingActivity.tsx)

Wrapper component for coding lessons that orchestrates:

- Displays lesson instructions in a "briefing card" panel alongside the code editor
- Manages the hint system (progressive reveal of 3 hints)
- Client-side code validation:
  - Runs `validationPatterns` (regex array) against the user's code
  - Checks for syntax patterns specific to the language
  - Simulates output by matching expected patterns
- Shows success/failure feedback with animations
- Calls `onComplete()` when validation passes

---

### Frontend — New Pages

#### [NEW] [CodingLabPage.tsx](file:///c:/Users/Imago%20DEI/Documents/Part%20Five%20-%20Materials/Rain%20Semester/CPE%20508/learn-platform/frontend/src/pages/CodingLabPage.tsx)

The main Coding Lab hub page:

- Header with "Coding Lab 🧪" branding
- `LanguageSelector` component at the top (if no language selected yet)
- Once a language is selected, shows the coding levels (5, 6, 7) filtered to that language
- Level cards with progress tracking (same style as `LevelMapPage`)
- Ability to switch language at any time via a language toggle in the header
- Routing: `/coding` → lab page, `/coding/lesson/:id` → coding lesson

#### [MODIFY] [LessonPage.tsx](file:///c:/Users/Imago%20DEI/Documents/Part%20Five%20-%20Materials/Rain%20Semester/CPE%20508/learn-platform/frontend/src/pages/LessonPage.tsx)

- Add handling for `activity_type === 'coding'` in the activity tab:
  - Renders `<CodingActivity>` instead of `<DragDropActivity>` or `<CodingPuzzle>`
  - Passes `activity_data` with language-specific `starterCode`, `validationPatterns`, etc.
  - The "Learn" tab shows the explanation with syntax-highlighted code examples

---

### Frontend — Navigation & Routing

#### [MODIFY] [App.tsx](file:///c:/Users/Imago%20DEI/Documents/Part%20Five%20-%20Materials/Rain%20Semester/CPE%20508/learn-platform/frontend/src/App.tsx)

- Add route: `/coding` → `<CodingLabPage />`  (learner-only)
- Add route: `/coding/lesson/:id` → `<LessonPage />`  (reuses existing LessonPage, which now handles coding activities)

#### [MODIFY] [Sidebar.tsx](file:///c:/Users/Imago%20DEI/Documents/Part%20Five%20-%20Materials/Rain%20Semester/CPE%20508/learn-platform/frontend/src/components/Sidebar.tsx)

- Add "Coding Lab 💻" nav item for learner role between "Dashboard" and "Profile"

#### [MODIFY] [client.ts](file:///c:/Users/Imago%20DEI/Documents/Part%20Five%20-%20Materials/Rain%20Semester/CPE%20508/learn-platform/frontend/src/api/client.ts)

- Add `getCodingLanguages()` API method
- Add `validateCode(lessonId, code, language)` API method
- Add `getCodingLessons(language)` API method to fetch lessons filtered by coding language

---

### Frontend — Styles

#### [MODIFY] [index.css](file:///c:/Users/Imago%20DEI/Documents/Part%20Five%20-%20Materials/Rain%20Semester/CPE%20508/learn-platform/frontend/src/index.css)

Add new CSS sections for:

- **Code editor styles**: Monospace font (JetBrains Mono from Google Fonts), line numbers, syntax token colors, gutter, cursor
- **Console panel**: Dark terminal aesthetic with green text, blinking cursor
- **Language selector cards**: Gradient borders, hover glow effects, selection animations
- **Coding Lab page**: Layout for side-by-side instruction + editor panels
- **Syntax highlighting token classes**: `.token-keyword`, `.token-string`, `.token-number`, `.token-comment`, `.token-function`, `.token-type`, `.token-operator`
- **Language-specific themes**: `.theme-python`, `.theme-javascript`, `.theme-java` with distinct color palettes

---

## Curriculum Content Detail

### Variables (Level 5, Lesson 1 — per language)

| Aspect | Python 🐍 | JavaScript ⚡ | Java ☕ |
|--------|----------|-------------|--------|
| **Declaration** | `name = "Alex"` | `let name = "Alex";` | `String name = "Alex";` |
| **Numbers** | `age = 10` | `let age = 10;` | `int age = 10;` |
| **Booleans** | `is_cool = True` | `let isCool = true;` | `boolean isCool = true;` |
| **Print** | `print(name)` | `console.log(name);` | `System.out.println(name);` |
| **Naming** | `snake_case` | `camelCase` | `camelCase` |

### Data Structures (Level 6 — per language)

| Aspect | Python 🐍 | JavaScript ⚡ | Java ☕ |
|--------|----------|-------------|--------|
| **List/Array** | `fruits = ["apple", "banana"]` | `let fruits = ["apple", "banana"];` | `String[] fruits = {"apple", "banana"};` |
| **Access** | `fruits[0]` | `fruits[0]` | `fruits[0]` |
| **Dict/Object** | `person = {"name": "Alex"}` | `let person = {name: "Alex"};` | `HashMap<String, String>` |
| **Length** | `len(fruits)` | `fruits.length` | `fruits.length` |

### Simple Programming Tasks (Level 7 — per language)

| Aspect | Python 🐍 | JavaScript ⚡ | Java ☕ |
|--------|----------|-------------|--------|
| **If/Else** | `if age >= 18:` | `if (age >= 18) {` | `if (age >= 18) {` |
| **For Loop** | `for i in range(5):` | `for (let i = 0; i < 5; i++) {` | `for (int i = 0; i < 5; i++) {` |
| **Function** | `def greet(name):` | `function greet(name) {` | `static void greet(String name) {` |

---

## Recommendations: What Could Still Be Added

> [!TIP]
> These are features that would take the Coding Lab to the next level after the core implementation is complete.

### 🔥 High Priority Additions

1. **Code Playground / Sandbox Page** — A free-form editor where learners can write any code in their chosen language without lesson constraints. Great for experimentation.

2. **Code Comparison View** — A side-by-side panel showing the same program in all 3 languages simultaneously, helping learners understand language differences.

3. **Real-Time Code Execution** — Integrate a WebAssembly-based interpreter (e.g., Pyodide for Python, built-in eval for JS) so learners see actual output instead of pattern-matched simulated output.

4. **Code Snippet Library** — A collectible "spell book" where learners save and revisit code snippets they've written. Each snippet becomes a card they can reference.

### 🎮 Gamification Additions

5. **Coding Challenges / Daily Quests** — Timed coding challenges that award bonus XP. E.g., "Write a function that adds two numbers — in under 2 minutes!"

6. **Code Golf Leaderboard** — Track who can solve a problem with the fewest characters/lines. Teaches code efficiency.

7. **Language Mastery Badges** — Tiered badges per language: Bronze (complete Level 5), Silver (Level 6), Gold (Level 7) per language.

8. **Streak System** — Track consecutive days of coding practice with fire 🔥 streak counters.

### 📚 Content Additions

9. **Error Debugging Lessons** — Present broken code and have learners find and fix bugs. Different bugs per language (IndentationError in Python, missing semicolons in Java, etc.).

10. **Mini-Projects** — Multi-step guided projects like "Build a Calculator" or "Create a To-Do List" that combine variables, data structures, and functions.

11. **Pseudo-code to Real Code** — Teach algorithm thinking by showing pseudo-code first, then having learners translate to their chosen language.

12. **Comment & Documentation Lessons** — Teach good coding habits: writing comments, docstrings (Python), JSDoc (JavaScript), Javadoc (Java).

### 👥 Social & Collaborative

13. **Peer Code Review** — Let learners share solutions and review each other's code (teacher-moderated).

14. **Teacher-Created Challenges** — Allow teachers to create custom coding challenges with custom validation patterns.

15. **Parent Progress Reports for Coding** — Extend parent dashboard to show which languages their child is learning and their progress per language.

### 🛠️ Technical Additions

16. **Offline Mode** — Cache coding lessons for offline use (Service Worker + IndexedDB).

17. **Code Auto-Save** — Persist work-in-progress code so learners don't lose their work if they navigate away.

18. **Accessibility** — Screen reader support for the code editor, keyboard-only navigation, high-contrast mode.

---

## Verification Plan

### Automated Tests

```bash
# Build check — ensure TypeScript compiles with new types
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit
```

### Manual Verification

1. **Database seeding**: Start the backend and verify new levels (5, 6, 7) and all 27 coding lessons are created
2. **Language selector**: Navigate to `/coding`, verify all 3 language cards render with correct theming
3. **Code editor**: Open a coding lesson, verify:
   - Syntax highlighting works for all 3 languages
   - Line numbers display correctly
   - Tab indentation works (4 spaces for Python/Java, 2 for JS)
   - Run button validates code and shows output
   - Hints reveal progressively
4. **Lesson flow**: Complete a coding activity → quiz → verify progress is recorded
5. **Responsive**: Test on mobile viewport (375px) — editor should stack below instructions
6. **Cross-language**: Verify switching languages shows different lessons with correct syntax in starter code
