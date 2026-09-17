// ============================================================
// CodeQuest — Multi-Language Coding Curriculum & Seed Data
// Levels 5, 6, 7 (Python, JavaScript, Java) + Recommendations 1-12
// ============================================================

import { CodingLanguage, CodingActivityData } from '../../shared/src/types';

export async function ensureCodingCurriculumExists(query: (text: string, params?: any[]) => Promise<any>): Promise<void> {
  // 1. Schema updates
  try {
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_coding_language TEXT DEFAULT 'python'`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS coding_streak_count INTEGER DEFAULT 0`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_coding_streak_date DATE DEFAULT NULL`);
    await query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS coding_language TEXT DEFAULT NULL`);

    // Allow 'coding' in lessons activity_type
    await query(`
      DO $$
      BEGIN
        ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_activity_type_check;
        ALTER TABLE lessons ADD CONSTRAINT lessons_activity_type_check 
          CHECK(activity_type IN ('drag-drop', 'puzzle', 'pattern', 'game', 'coding'));
      EXCEPTION
        WHEN OTHERS THEN NULL;
      END $$;
    `);

    // Create code_snippets table (Recommendation #4)
    await query(`
      CREATE TABLE IF NOT EXISTS code_snippets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        language TEXT NOT NULL CHECK(language IN ('python', 'javascript', 'java')),
        code TEXT NOT NULL,
        description TEXT,
        is_spell_book BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create coding_challenges table (Recommendation #5 & #6)
    await query(`
      CREATE TABLE IF NOT EXISTS coding_challenges (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        language TEXT NOT NULL CHECK(language IN ('python', 'javascript', 'java')),
        difficulty TEXT NOT NULL CHECK(difficulty IN ('Easy', 'Medium', 'Hard')),
        prompt TEXT NOT NULL,
        starter_code TEXT NOT NULL,
        solution_pattern TEXT,
        expected_output TEXT,
        xp_reward INTEGER NOT NULL DEFAULT 50,
        time_limit_seconds INTEGER DEFAULT 180,
        is_daily BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create challenge_submissions table (Recommendation #6 Code Golf Leaderboard)
    await query(`
      CREATE TABLE IF NOT EXISTS challenge_submissions (
        id SERIAL PRIMARY KEY,
        challenge_id INTEGER NOT NULL REFERENCES coding_challenges(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code TEXT NOT NULL,
        code_length INTEGER NOT NULL,
        execution_time_ms INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('✅ Coding database tables & migrations verified');
  } catch (err) {
    console.error('Migration warning (non-fatal):', err);
  }

  // 2. Seed Levels 5, 6, 7
  let level5Id: number;
  let level6Id: number;
  let level7Id: number;

  const l5 = await query('SELECT id FROM levels WHERE order_index = 5');
  if (l5.rows.length === 0) {
    const res = await query(
      `INSERT INTO levels (title, order_index, description, icon_emoji) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['The Variable Vault', 5, 'Unlock the secrets of real text coding! Master variables, data types, and arithmetic operations in Python, JavaScript, or Java.', '🔐']
    );
    level5Id = res.rows[0].id;
  } else {
    level5Id = l5.rows[0].id;
  }

  const l6 = await query('SELECT id FROM levels WHERE order_index = 6');
  if (l6.rows.length === 0) {
    const res = await query(
      `INSERT INTO levels (title, order_index, description, icon_emoji) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['The Data Structure Den', 6, 'Store, sort, and organize treasure! Master lists, arrays, dictionaries, and key-value objects.', '📦']
    );
    level6Id = res.rows[0].id;
  } else {
    level6Id = l6.rows[0].id;
  }

  const l7 = await query('SELECT id FROM levels WHERE order_index = 7');
  if (l7.rows.length === 0) {
    const res = await query(
      `INSERT INTO levels (title, order_index, description, icon_emoji) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['The Logic Laboratory', 7, 'Command computer intelligence! Master if-statements, repeating loops, custom functions, and real mini-projects!', '⚡']
    );
    level7Id = res.rows[0].id;
  } else {
    level7Id = l7.rows[0].id;
  }

  // 3. Seed Lessons definition generator
  interface LessonDef {
    levelId: number;
    orderIndex: number;
    title: string;
    explanation: string;
    example: string;
    language: CodingLanguage;
    activityData: CodingActivityData;
    quizQuestions: { question: string; options: { text: string; isCorrect: boolean }[] }[];
  }

  const lessonDefs: LessonDef[] = [
    // ============================================================
    // LEVEL 5 — PYTHON
    // ============================================================
    {
      levelId: level5Id,
      orderIndex: 1,
      title: 'Python: Declaring Variables 🐍',
      language: 'python',
      explanation: `# Declaring Variables in Python 🐍\n\nA **variable** is a labeled box in computer memory that stores information.\n\nIn Python, creating a variable is super simple: you write the name, an equals sign \`=\`, and the value!\n\n### Rules for Python Variables:\n- Variable names use **snake_case** (lowercase letters with underscores: \`hero_name\`, \`player_score\`).\n- Text values are called **strings** and are wrapped in quotes: \`"Alex"\`.\n- Numbers don't need quotes: \`42\` or \`99.5\`.\n- Comments start with \`#\` and explain what code does (Recommendation #12: Good documentation habits!).`,
      example: `\`\`\`python
# Storing a hero's name and level
hero_name = "Pixel Knight"
hero_level = 5

# Printing the values to the console
print("Hero:", hero_name)
print("Level:", hero_level)
\`\`\``,
      activityData: {
        language: 'python',
        instructions: '1. Create a variable named `hero_name` and set it to `"Nova"`.\n2. Create a variable named `gem_count` and set it to `10`.\n3. Print both variables using `print(hero_name)` and `print(gem_count)`.',
        starterCode: `# Write your Python variable declarations below!\n# Step 1: hero_name = "Nova"\n\n# Step 2: gem_count = 10\n\n# Step 3: print them\n`,
        solution: `hero_name = "Nova"\ngem_count = 10\nprint(hero_name)\nprint(gem_count)`,
        expectedOutput: `Nova\n10`,
        validationPatterns: [
          'hero_name\\s*=\\s*["\']Nova["\']',
          'gem_count\\s*=\\s*10',
          'print\\s*\\(\\s*hero_name\\s*\\)',
          'print\\s*\\(\\s*gem_count\\s*\\)'
        ],
        hints: [
          'Assign variables using the single equals sign: variable_name = value',
          'Text like "Nova" must have quotation marks around it.',
          'Use print(hero_name) and print(gem_count) on separate lines.'
        ],
        concept: 'variables',
        isDocumentationLesson: true
      },
      quizQuestions: [
        {
          question: 'How do you create a variable called `score` with value 100 in Python?',
          options: [
            { text: 'score = 100', isCorrect: true },
            { text: 'var score == 100;', isCorrect: false },
            { text: 'score: 100', isCorrect: false },
            { text: 'make score 100', isCorrect: false }
          ]
        },
        {
          question: 'How do you write a comment in Python?',
          options: [
            { text: 'Starting the line with #', isCorrect: true },
            { text: 'Starting the line with //', isCorrect: false },
            { text: 'Starting the line with <!--', isCorrect: false },
            { text: 'Starting the line with /*', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level5Id,
      orderIndex: 2,
      title: 'Python: Data Types Explorer 🔍',
      language: 'python',
      explanation: `# Exploring Python Data Types 🔍\n\nPython has different types for different kinds of data:\n\n1. **\`str\` (String)**: Text enclosed in quotes, e.g., \`"CodeQuest"\`\n2. **\`int\` (Integer)**: Whole numbers, e.g., \`42\`, \`-5\`\n3. **\`float\` (Floating Point)**: Decimal numbers, e.g., \`3.14\`, \`0.75\`\n4. **\`bool\` (Boolean)**: Either \`True\` or \`False\` (notice capital T and F!)\n\nYou can check any variable's type using Python's built-in \`type()\` function!`,
      example: `\`\`\`python
username = "Aria"      # str
level = 12             # int
health_ratio = 98.5    # float
is_invincible = True   # bool

print(type(username))  # <class 'str'>
print(type(level))     # <class 'int'>
print(is_invincible)   # True
\`\`\``,
      activityData: {
        language: 'python',
        instructions: '1. Create `quest_name = "Dragon Mountain"`\n2. Create `gold_reward = 250`\n3. Create `is_active = True`\n4. Print `quest_name`, `gold_reward`, and `is_active`',
        starterCode: `# Explore data types in Python!\nquest_name = ""\ngold_reward = 0\nis_active = False\n\n# Set correct values and print them\n`,
        solution: `quest_name = "Dragon Mountain"\ngold_reward = 250\nis_active = True\nprint(quest_name)\nprint(gold_reward)\nprint(is_active)`,
        expectedOutput: `Dragon Mountain\n250\nTrue`,
        validationPatterns: [
          'quest_name\\s*=\\s*["\']Dragon Mountain["\']',
          'gold_reward\\s*=\\s*250',
          'is_active\\s*=\\s*True',
          'print\\s*\\(\\s*quest_name\\s*\\)'
        ],
        hints: [
          'Strings must be in quotes: "Dragon Mountain"',
          'Numbers need no quotes: 250',
          'In Python, Boolean True must have an uppercase T: True'
        ],
        concept: 'data_types'
      },
      quizQuestions: [
        {
          question: 'Which of the following is a valid Python Boolean?',
          options: [
            { text: 'True', isCorrect: true },
            { text: 'true', isCorrect: false },
            { text: '"True"', isCorrect: false },
            { text: 'YES', isCorrect: false }
          ]
        },
        {
          question: 'What data type is the number 15.5 in Python?',
          options: [
            { text: 'float', isCorrect: true },
            { text: 'int', isCorrect: false },
            { text: 'str', isCorrect: false },
            { text: 'bool', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level5Id,
      orderIndex: 3,
      title: 'Python: Variable Math & Strings 🧮',
      language: 'python',
      explanation: `# Math & String Operations in Python 🧮\n\nVariables can be combined and calculated!\n\n### Arithmetic Operators:\n- \`+\` Addition: \`10 + 5\` → \`15\`\n- \`-\` Subtraction: \`10 - 5\` → \`5\`\n- \`*\` Multiplication: \`10 * 5\` → \`50\`\n- \`/\` Division: \`10 / 2\` → \`5.0\`\n\n### String Concatenation & f-strings:\nYou can join strings using \`+\` or format with f-strings:\n\`f"Hello {name}!"\``,
      example: `\`\`\`python
base_damage = 25
bonus = 15
total_damage = base_damage + bonus
print(f"Total damage dealt: {total_damage}")
\`\`\``,
      activityData: {
        language: 'python',
        instructions: '1. Create `crystals = 15`\n2. Create `multiplier = 3`\n3. Calculate `total_crystals = crystals * multiplier`\n4. Print `total_crystals`',
        starterCode: `# Calculate total crystals\ncrystals = 15\nmultiplier = 3\n\n# Calculate total_crystals and print it\n`,
        solution: `crystals = 15\nmultiplier = 3\ntotal_crystals = crystals * multiplier\nprint(total_crystals)`,
        expectedOutput: `45`,
        validationPatterns: [
          'crystals\\s*=\\s*15',
          'multiplier\\s*=\\s*3',
          'total_crystals\\s*=\\s*crystals\\s*\\*\\s*multiplier',
          'print\\s*\\(\\s*total_crystals\\s*\\)'
        ],
        hints: [
          'Use the * asterisk symbol for multiplication in Python.',
          'Store the result in total_crystals = crystals * multiplier',
          'Print the answer using print(total_crystals).'
        ],
        concept: 'operations'
      },
      quizQuestions: [
        {
          question: 'What is the symbol for multiplication in Python?',
          options: [
            { text: '*', isCorrect: true },
            { text: 'x', isCorrect: false },
            { text: 'X', isCorrect: false },
            { text: '^', isCorrect: false }
          ]
        },
        {
          question: 'What will "Code" + "Quest" produce in Python?',
          options: [
            { text: '"CodeQuest"', isCorrect: true },
            { text: '"Code Quest"', isCorrect: false },
            { text: 'An error', isCorrect: false },
            { text: '0', isCorrect: false }
          ]
        }
      ]
    },

    // ============================================================
    // LEVEL 5 — JAVASCRIPT
    // ============================================================
    {
      levelId: level5Id,
      orderIndex: 4,
      title: 'JavaScript: Declaring Variables ⚡',
      language: 'javascript',
      explanation: `# Declaring Variables in JavaScript ⚡\n\nIn modern JavaScript, we declare variables using **\`let\`** (for values that can change) or **\`const\`** (for constants that never change).\n\n### Key Rules:\n- We use **camelCase** for naming: \`playerName\`, \`highScore\`.\n- Statements usually end with a semicolon \`;\`.\n- To print output in JavaScript, we use **\`console.log()\`**!`,
      example: `\`\`\`javascript
// Declare hero and score
let heroName = "Bolt";
let currentScore = 150;

console.log(heroName);
console.log(currentScore);
\`\`\``,
      activityData: {
        language: 'javascript',
        instructions: '1. Declare `let heroName = "Bolt";`\n2. Declare `let gemCount = 20;`\n3. Print both variables using `console.log(heroName);` and `console.log(gemCount);`',
        starterCode: `// Write your JavaScript code below!\n// Step 1: let heroName = "Bolt";\n\n// Step 2: let gemCount = 20;\n\n// Step 3: console.log both\n`,
        solution: `let heroName = "Bolt";\nlet gemCount = 20;\nconsole.log(heroName);\nconsole.log(gemCount);`,
        expectedOutput: `Bolt\n20`,
        validationPatterns: [
          '(?:let|const|var)\\s+heroName\\s*=\\s*["\']Bolt["\']',
          '(?:let|const|var)\\s+gemCount\\s*=\\s*20',
          'console\\.log\\s*\\(\\s*heroName\\s*\\)',
          'console\\.log\\s*\\(\\s*gemCount\\s*\\)'
        ],
        hints: [
          'Remember the keyword "let" before the variable name.',
          'Use console.log(variable) to output to the screen in JavaScript.',
          'Text strings should be inside double or single quotes.'
        ],
        concept: 'variables'
      },
      quizQuestions: [
        {
          question: 'Which keyword is used to declare a reassignable variable in modern JavaScript?',
          options: [
            { text: 'let', isCorrect: true },
            { text: 'def', isCorrect: false },
            { text: 'variable', isCorrect: false },
            { text: 'dim', isCorrect: false }
          ]
        },
        {
          question: 'How do you display output in the console in JavaScript?',
          options: [
            { text: 'console.log()', isCorrect: true },
            { text: 'print()', isCorrect: false },
            { text: 'System.out.print()', isCorrect: false },
            { text: 'echo()', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level5Id,
      orderIndex: 5,
      title: 'JavaScript: Data Types & Strings 🔍',
      language: 'javascript',
      explanation: `# JavaScript Data Types & Template Literals ⚡\n\nJavaScript has primitive types:\n- **\`string\`**: \`"Hello"\` or \`'World'\`\n- **\`number\`**: \`42\` or \`3.14\`\n- **\`boolean\`**: \`true\` or \`false\` (lowercase in JS!)\n\n### Template Literals ✨\nUse backticks \`\` \` \`\` to insert variables directly using \`\${variable}\`:\n\`\`\`javascript\nlet hero = "Kai";\nconsole.log(\`Hero: \${hero}\`);\n\`\`\``,
      example: `\`\`\`javascript
let spell = "Fireball";
let manaCost = 35;
let isReady = true;

console.log(\`Spell \${spell} costs \${manaCost} mana. Ready? \${isReady}\`);
\`\`\``,
      activityData: {
        language: 'javascript',
        instructions: '1. Create `let spell = "Frost Nova";`\n2. Create `let manaCost = 45;`\n3. Create `let isReady = true;`\n4. Print each with `console.log()`',
        starterCode: `// JavaScript Data Types\nlet spell = "";\nlet manaCost = 0;\nlet isReady = false;\n\n// Update and print them!\n`,
        solution: `let spell = "Frost Nova";\nlet manaCost = 45;\nlet isReady = true;\nconsole.log(spell);\nconsole.log(manaCost);\nconsole.log(isReady);`,
        expectedOutput: `Frost Nova\n45\ntrue`,
        validationPatterns: [
          'spell\\s*=\\s*["\']Frost Nova["\']',
          'manaCost\\s*=\\s*45',
          'isReady\\s*=\\s*true',
          'console\\.log\\s*\\(\\s*spell\\s*\\)'
        ],
        hints: [
          'Boolean values in JavaScript are lowercase: true and false.',
          'Assign spell = "Frost Nova"',
          'Log each value with console.log()'
        ],
        concept: 'data_types'
      },
      quizQuestions: [
        {
          question: 'How is a Boolean true written in JavaScript?',
          options: [
            { text: 'true (all lowercase)', isCorrect: true },
            { text: 'True (capital T)', isCorrect: false },
            { text: 'TRUE (all caps)', isCorrect: false },
            { text: '"true" in quotes', isCorrect: false }
          ]
        },
        {
          question: 'What symbol surrounds JavaScript template literals?',
          options: [
            { text: 'Backticks `', isCorrect: true },
            { text: 'Double quotes "', isCorrect: false },
            { text: 'Parentheses ()', isCorrect: false },
            { text: 'Curly braces {}', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level5Id,
      orderIndex: 6,
      title: 'JavaScript: Math & Operations 🧮',
      language: 'javascript',
      explanation: `# Arithmetic Operations in JavaScript ⚡\n\nJavaScript supports standard math:\n- \`+\` addition\n- \`-\` subtraction\n- \`*\` multiplication\n- \`/\` division\n- \`%\` modulo (remainder of division!)\n\n### Example:\n\`\`\`javascript\nlet speed = 10;\nlet boost = 5;\nlet totalSpeed = speed * boost;\nconsole.log(totalSpeed); // 50\n\`\`\``,
      example: `\`\`\`javascript
let potionPrice = 12;
let quantity = 4;
let totalCost = potionPrice * quantity;
console.log("Total gold needed: " + totalCost);
\`\`\``,
      activityData: {
        language: 'javascript',
        instructions: '1. Create `let coins = 50;`\n2. Create `let reward = 25;`\n3. Calculate `let totalCoins = coins + reward;`\n4. Output with `console.log(totalCoins);`',
        starterCode: `// Calculate total coins\nlet coins = 50;\nlet reward = 25;\n\n// Add them together and print\n`,
        solution: `let coins = 50;\nlet reward = 25;\nlet totalCoins = coins + reward;\nconsole.log(totalCoins);`,
        expectedOutput: `75`,
        validationPatterns: [
          'coins\\s*=\\s*50',
          'reward\\s*=\\s*25',
          'totalCoins\\s*=\\s*coins\\s*\\+\\s*reward',
          'console\\.log\\s*\\(\\s*totalCoins\\s*\\)'
        ],
        hints: [
          'Use the + operator to sum coins and reward.',
          'Save to let totalCoins = coins + reward;',
          'Print using console.log(totalCoins);'
        ],
        concept: 'operations'
      },
      quizQuestions: [
        {
          question: 'What does 10 % 3 return in JavaScript?',
          options: [
            { text: '1 (the remainder)', isCorrect: true },
            { text: '3', isCorrect: false },
            { text: '3.33', isCorrect: false },
            { text: '0', isCorrect: false }
          ]
        },
        {
          question: 'Which operator adds two numbers together?',
          options: [
            { text: '+', isCorrect: true },
            { text: '&', isCorrect: false },
            { text: 'add()', isCorrect: false },
            { text: '++', isCorrect: false }
          ]
        }
      ]
    },

    // ============================================================
    // LEVEL 5 — JAVA
    // ============================================================
    {
      levelId: level5Id,
      orderIndex: 7,
      title: 'Java: Declaring Typed Variables ☕',
      language: 'java',
      explanation: `# Declaring Variables in Java ☕\n\nJava is a **strongly-typed** programming language. That means every variable must declare its **data type** upfront before its name!\n\n### Common Java Types:\n- **\`String\`**: Text in double quotes: \`String name = "Knight";\` (notice capital S!)\n- **\`int\`**: Integers: \`int score = 100;\`\n- **\`double\`**: Decimal numbers: \`double speed = 4.5;\`\n- **\`boolean\`**: Booleans: \`boolean isHero = true;\`\n\nIn Java, every statement **must end with a semicolon \`;\`**!`,
      example: `\`\`\`java
public class Main {
    public static void main(String[] args) {
        String heroName = "Arthur";
        int heroLevel = 10;
        
        System.out.println(heroName);
        System.out.println(heroLevel);
    }
}
\`\`\``,
      activityData: {
        language: 'java',
        instructions: 'Inside `main()`:\n1. Declare `String heroName = "Arthur";`\n2. Declare `int energy = 100;`\n3. Print both using `System.out.println(heroName);` and `System.out.println(energy);`',
        starterCode: `public class Main {\n    public static void main(String[] args) {\n        // Declare String heroName = "Arthur";\n        \n        // Declare int energy = 100;\n        \n        // Print both variables\n        \n    }\n}`,
        solution: `public class Main {\n    public static void main(String[] args) {\n        String heroName = "Arthur";\n        int energy = 100;\n        System.out.println(heroName);\n        System.out.println(energy);\n    }\n}`,
        expectedOutput: `Arthur\n100`,
        validationPatterns: [
          'String\\s+heroName\\s*=\\s*["\']Arthur["\']\\s*;',
          'int\\s+energy\\s*=\\s*100\\s*;',
          'System\\.out\\.println\\s*\\(\\s*heroName\\s*\\)\\s*;',
          'System\\.out\\.println\\s*\\(\\s*energy\\s*\\)\\s*;'
        ],
        hints: [
          'Java types come first: String heroName = "Arthur"; (note the uppercase S in String)',
          'Integers use lowercase "int": int energy = 100;',
          'Always finish every line with a semicolon ;'
        ],
        concept: 'variables'
      },
      quizQuestions: [
        {
          question: 'What keyword represents whole numbers in Java?',
          options: [
            { text: 'int', isCorrect: true },
            { text: 'number', isCorrect: false },
            { text: 'Integer', isCorrect: false },
            { text: 'num', isCorrect: false }
          ]
        },
        {
          question: 'What character MUST end almost every Java instruction?',
          options: [
            { text: 'Semicolon ;', isCorrect: true },
            { text: 'Period .', isCorrect: false },
            { text: 'Colon :', isCorrect: false },
            { text: 'Comma ,', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level5Id,
      orderIndex: 8,
      title: 'Java: Data Types & Output 🔍',
      language: 'java',
      explanation: `# Java Data Types & System.out.println ☕\n\nJava uses \`System.out.println()\` to print text and move to the next line.\n\n### Primary Java Types:\n| Type | Example | Description |\n|---|---|---|\n| \`String\` | \`"Excalibur"\` | Text with capital S |\n| \`int\` | \`75\` | 32-bit whole number |\n| \`double\` | \`19.99\` | Precise decimal |\n| \`boolean\` | \`true\` / \`false\` | Logical flag |`,
      example: `\`\`\`java
public class Main {
    public static void main(String[] args) {
        String sword = "Excalibur";
        int power = 99;
        boolean isLegendary = true;

        System.out.println(sword);
        System.out.println(power);
        System.out.println(isLegendary);
    }
}
\`\`\``,
      activityData: {
        language: 'java',
        instructions: '1. Declare `String sword = "Excalibur";`\n2. Declare `int power = 99;`\n3. Declare `boolean isLegendary = true;`\n4. Print all three using `System.out.println()`',
        starterCode: `public class Main {\n    public static void main(String[] args) {\n        // Declare sword, power, and isLegendary\n        \n        // Print them\n        \n    }\n}`,
        solution: `public class Main {\n    public static void main(String[] args) {\n        String sword = "Excalibur";\n        int power = 99;\n        boolean isLegendary = true;\n        System.out.println(sword);\n        System.out.println(power);\n        System.out.println(isLegendary);\n    }\n}`,
        expectedOutput: `Excalibur\n99\ntrue`,
        validationPatterns: [
          'String\\s+sword\\s*=\\s*["\']Excalibur["\']\\s*;',
          'int\\s+power\\s*=\\s*99\\s*;',
          'boolean\\s+isLegendary\\s*=\\s*true\\s*;',
          'System\\.out\\.println'
        ],
        hints: [
          'Make sure String has a capital S and boolean is all lowercase.',
          'Remember semicolons at the end of each statement.',
          'Use System.out.println() for each variable.'
        ],
        concept: 'data_types'
      },
      quizQuestions: [
        {
          question: 'How is the String type spelled in Java?',
          options: [
            { text: 'String (Capital S)', isCorrect: true },
            { text: 'string (lowercase s)', isCorrect: false },
            { text: 'str', isCorrect: false },
            { text: 'Text', isCorrect: false }
          ]
        },
        {
          question: 'What method prints a line in Java?',
          options: [
            { text: 'System.out.println()', isCorrect: true },
            { text: 'print()', isCorrect: false },
            { text: 'console.write()', isCorrect: false },
            { text: 'out.printLine()', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level5Id,
      orderIndex: 9,
      title: 'Java: Arithmetic & Calculations 🧮',
      language: 'java',
      explanation: `# Math in Java ☕\n\nJava handles calculations with familiar arithmetic symbols:\n- \`+\` Addition\n- \`-\` Subtraction\n- \`*\` Multiplication\n- \`/\` Division (integer division drops remainder: \`7 / 2\` is \`3\`!)\n\n### Example:\n\`\`\`java
int shield = 30;
int armor = 20;
int defense = shield + armor; // 50
System.out.println(defense);
\`\`\``,
      example: `\`\`\`java
public class Main {
    public static void main(String[] args) {
        int baseCoins = 80;
        int bonusCoins = 40;
        int totalCoins = baseCoins + bonusCoins;
        System.out.println(totalCoins);
    }
}
\`\`\``,
      activityData: {
        language: 'java',
        instructions: '1. Declare `int potions = 6;`\n2. Declare `int healPerPotion = 25;`\n3. Declare `int totalHeal = potions * healPerPotion;`\n4. Output `System.out.println(totalHeal);`',
        starterCode: `public class Main {\n    public static void main(String[] args) {\n        // Calculate total heal\n        \n    }\n}`,
        solution: `public class Main {\n    public static void main(String[] args) {\n        int potions = 6;\n        int healPerPotion = 25;\n        int totalHeal = potions * healPerPotion;\n        System.out.println(totalHeal);\n    }\n}`,
        expectedOutput: `150`,
        validationPatterns: [
          'int\\s+potions\\s*=\\s*6\\s*;',
          'int\\s+healPerPotion\\s*=\\s*25\\s*;',
          'int\\s+totalHeal\\s*=\\s*potions\\s*\\*\\s*healPerPotion\\s*;',
          'System\\.out\\.println\\s*\\(\\s*totalHeal\\s*\\)\\s*;'
        ],
        hints: [
          'Use the * sign for multiplying: potions * healPerPotion',
          'Declare totalHeal with type int.',
          'Print using System.out.println(totalHeal);'
        ],
        concept: 'operations'
      },
      quizQuestions: [
        {
          question: 'What is the result of 7 / 2 with Java integer division?',
          options: [
            { text: '3 (fraction truncated)', isCorrect: true },
            { text: '3.5', isCorrect: false },
            { text: '4', isCorrect: false },
            { text: 'Error', isCorrect: false }
          ]
        },
        {
          question: 'How do you concatenate a String and an int in Java?',
          options: [
            { text: '"Level: " + level', isCorrect: true },
            { text: '"Level: " & level', isCorrect: false },
            { text: '"Level: " . level', isCorrect: false },
            { text: 'concat("Level: ", level)', isCorrect: false }
          ]
        }
      ]
    },

    // ============================================================
    // LEVEL 6 — PYTHON: DATA STRUCTURES
    // ============================================================
    {
      levelId: level6Id,
      orderIndex: 1,
      title: 'Python: Lists & Indexing 📋',
      language: 'python',
      explanation: `# Lists in Python 📋\n\nA **list** lets you store multiple items in a single variable! Lists use square brackets \`[]\` with items separated by commas.\n\n### Indexing (Starting at 0!):\nComputers count from zero:\n- \`spells = ["Fireball", "Heal", "Shield"]\`\n- \`spells[0]\` is \`"Fireball"\`\n- \`spells[1]\` is \`"Heal"\`\n- \`spells.append("Teleport")\` adds an item to the end!`,
      example: `\`\`\`python
inventory = ["Map", "Compass", "Torch"]
print(inventory[0])  # Prints: Map

inventory.append("Potion")
print(len(inventory))  # Prints: 4
\`\`\``,
      activityData: {
        language: 'python',
        instructions: '1. Create a list: `treasures = ["Gold", "Ruby", "Diamond"]`\n2. Add `"Emerald"` using `treasures.append("Emerald")`\n3. Print the first treasure: `print(treasures[0])`\n4. Print the entire list: `print(treasures)`',
        starterCode: `# Python Lists\ntreasures = ["Gold", "Ruby", "Diamond"]\n\n# Append "Emerald" and print\n`,
        solution: `treasures = ["Gold", "Ruby", "Diamond"]\ntreasures.append("Emerald")\nprint(treasures[0])\nprint(treasures)`,
        expectedOutput: `Gold\n['Gold', 'Ruby', 'Diamond', 'Emerald']`,
        validationPatterns: [
          'treasures\\s*=\\s*\\[.*"Gold".*"Ruby".*"Diamond".*\\]',
          'treasures\\.append\\s*\\(\\s*["\']Emerald["\']\\s*\\)',
          'print\\s*\\(\\s*treasures\\[0\\]\\s*\\)',
          'print\\s*\\(\\s*treasures\\s*\\)'
        ],
        hints: [
          'Remember list indices start at 0: treasures[0] gets Gold.',
          'Use treasures.append("Emerald") to add a new item.',
          'print(treasures) prints the full list.'
        ],
        concept: 'lists'
      },
      quizQuestions: [
        {
          question: 'What index accesses the FIRST element of a Python list?',
          options: [
            { text: '0', isCorrect: true },
            { text: '1', isCorrect: false },
            { text: '-1', isCorrect: false },
            { text: 'first', isCorrect: false }
          ]
        },
        {
          question: 'Which method adds an item to the end of a Python list?',
          options: [
            { text: 'append()', isCorrect: true },
            { text: 'push()', isCorrect: false },
            { text: 'add()', isCorrect: false },
            { text: 'insert_end()', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level6Id,
      orderIndex: 2,
      title: 'Python: Dictionaries & Key-Value 📖',
      language: 'python',
      explanation: `# Dictionaries in Python 📖\n\nA **dictionary** stores pairs of **keys** and **values** using curly braces \`{}\`.\n\nThink of a real dictionary: you look up a word (the key) to find its definition (the value)!\n\n### Example:\n\`\`\`python
player = {
    "name": "Luna",
    "score": 450,
    "has_key": True
}

# Accessing a value by key:
print(player["name"])  # Luna

# Updating a value:
player["score"] = 500
\`\`\``,
      example: `\`\`\`python
weapon = {"name": "Frost Bow", "damage": 85}
print(weapon["name"])
weapon["durability"] = 100
print(weapon)
\`\`\``,
      activityData: {
        language: 'python',
        instructions: '1. Create dictionary `player = {"name": "Echo", "level": 5}`\n2. Add `"rank": "Captain"` to the dictionary: `player["rank"] = "Captain"`\n3. Print `player["name"]`\n4. Print `player["rank"]`',
        starterCode: `# Create player dictionary\nplayer = {\n    "name": "Echo",\n    "level": 5\n}\n\n# Add rank and print name & rank\n`,
        solution: `player = {\n    "name": "Echo",\n    "level": 5\n}\nplayer["rank"] = "Captain"\nprint(player["name"])\nprint(player["rank"])`,
        expectedOutput: `Echo\nCaptain`,
        validationPatterns: [
          'player\\s*=\\s*\\{.*"name"\\s*:\\s*["\']Echo["\'].*\\}',
          'player\\[["\']rank["\']\\]\\s*=\\s*["\']Captain["\']',
          'print\\s*\\(\\s*player\\[["\']name["\']\\]\\s*\\)',
          'print\\s*\\(\\s*player\\[["\']rank["\']\\]\\s*\\)'
        ],
        hints: [
          'Access or set keys with square brackets: player["rank"] = "Captain"',
          'Keys in dictionaries are strings surrounded by quotes.',
          'Print with print(player["name"]) and print(player["rank"]).'
        ],
        concept: 'dictionaries'
      },
      quizQuestions: [
        {
          question: 'What symbols surround a Python dictionary?',
          options: [
            { text: 'Curly braces { }', isCorrect: true },
            { text: 'Square brackets [ ]', isCorrect: false },
            { text: 'Parentheses ( )', isCorrect: false },
            { text: 'Angle brackets < >', isCorrect: false }
          ]
        },
        {
          question: 'How do you look up the "gold" value in `bag = {"gold": 50}`?',
          options: [
            { text: 'bag["gold"]', isCorrect: true },
            { text: 'bag.gold()', isCorrect: false },
            { text: 'bag[0]', isCorrect: false },
            { text: 'bag{"gold"}', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level6Id,
      orderIndex: 3,
      title: 'Python: Pseudo-Code to Real Code 📜',
      language: 'python',
      explanation: `# Pseudo-Code to Real Code! 📜 (Recommendation #11)\n\n**Pseudo-code** is an algorithm written in plain English before you write real code. Professional programmers use it every day to plan their logic!\n\n### The Algorithm:\n\`\`\`text\nALGORITHM: Quest Inventory Calculator\n1. START with inventory list having "Potion" and "Shield"\n2. ADD "Crystal Key" to inventory\n3. COUNT total items in inventory\n4. DISPLAY total count\n\`\`\`\nNow let's translate it directly into real Python!`,
      example: `\`\`\`python
# Plain English plan:
# 1. Store hero health as 100
# 2. Subtract 25 damage
# 3. Print remaining health

health = 100
health = health - 25
print("Health:", health)
\`\`\``,
      activityData: {
        language: 'python',
        instructions: 'Translate the pseudo-code into Python:\n1. `inventory = ["Potion", "Shield"]`\n2. `inventory.append("Crystal Key")`\n3. `total_items = len(inventory)`\n4. `print(total_items)`',
        starterCode: `# Translate pseudo-code to real Python!\n# 1. inventory = ["Potion", "Shield"]\n# 2. inventory.append("Crystal Key")\n# 3. total_items = len(inventory)\n# 4. print(total_items)\n`,
        solution: `inventory = ["Potion", "Shield"]\ninventory.append("Crystal Key")\ntotal_items = len(inventory)\nprint(total_items)`,
        expectedOutput: `3`,
        validationPatterns: [
          'inventory\\s*=\\s*\\[.*"Potion".*"Shield".*\\]',
          'inventory\\.append\\s*\\(\\s*["\']Crystal Key["\']\\s*\\)',
          'total_items\\s*=\\s*len\\s*\\(\\s*inventory\\s*\\)',
          'print\\s*\\(\\s*total_items\\s*\\)'
        ],
        hints: [
          'len(inventory) counts how many items are currently in the list.',
          'Use inventory.append("Crystal Key") for step 2.',
          'print(total_items) displays 3!'
        ],
        concept: 'algorithms',
        isPseudoCodeLesson: true
      },
      quizQuestions: [
        {
          question: 'What is pseudo-code?',
          options: [
            { text: 'A plain-language plan for your program logic before writing real code', isCorrect: true },
            { text: 'Broken computer code with viruses', isCorrect: false },
            { text: 'A secret code only robots speak', isCorrect: false },
            { text: 'A programming language like Python', isCorrect: false }
          ]
        },
        {
          question: 'What built-in function returns the length of a list in Python?',
          options: [
            { text: 'len()', isCorrect: true },
            { text: 'size()', isCorrect: false },
            { text: 'count()', isCorrect: false },
            { text: 'length()', isCorrect: false }
          ]
        }
      ]
    },

    // ============================================================
    // LEVEL 6 — JAVASCRIPT: DATA STRUCTURES
    // ============================================================
    {
      levelId: level6Id,
      orderIndex: 4,
      title: 'JavaScript: Arrays & Methods 📋',
      language: 'javascript',
      explanation: `# Arrays in JavaScript 📋\n\nAn **array** stores an ordered list of values in square brackets \`[]\`.\n\n### Methods & Properties:\n- \`heroes[0]\` accesses the first item (0-indexed)\n- \`heroes.push("Vortex")\` adds an item to the end!\n- \`heroes.length\` gives the count of elements in the array!`,
      example: `\`\`\`javascript
let spells = ["Spark", "Blizzard", "Thunder"];
console.log(spells[0]); // Spark

spells.push("Solar Flare");
console.log(spells.length); // 4
\`\`\``,
      activityData: {
        language: 'javascript',
        instructions: '1. Create `let party = ["Warrior", "Mage", "Rogue"];`\n2. Add `"Healer"` with `party.push("Healer");`\n3. Print first member with `console.log(party[0]);`\n4. Print total count with `console.log(party.length);`',
        starterCode: `// JavaScript Arrays\nlet party = ["Warrior", "Mage", "Rogue"];\n\n// Push "Healer", print party[0], print party.length\n`,
        solution: `let party = ["Warrior", "Mage", "Rogue"];\nparty.push("Healer");\nconsole.log(party[0]);\nconsole.log(party.length);`,
        expectedOutput: `Warrior\n4`,
        validationPatterns: [
          'party\\s*=\\s*\\[.*"Warrior".*"Mage".*"Rogue".*\\]',
          'party\\.push\\s*\\(\\s*["\']Healer["\']\\s*\\)',
          'console\\.log\\s*\\(\\s*party\\[0\\]\\s*\\)',
          'console\\.log\\s*\\(\\s*party\\.length\\s*\\)'
        ],
        hints: [
          'Use party.push("Healer") to add an element in JS (unlike append in Python).',
          'Access length using party.length without parentheses.',
          'party[0] gets the first element: "Warrior".'
        ],
        concept: 'arrays'
      },
      quizQuestions: [
        {
          question: 'How do you add an item to the end of a JavaScript array?',
          options: [
            { text: 'array.push(item)', isCorrect: true },
            { text: 'array.append(item)', isCorrect: false },
            { text: 'array.add(item)', isCorrect: false },
            { text: 'array.insert(item)', isCorrect: false }
          ]
        },
        {
          question: 'How do you get the number of items in a JavaScript array?',
          options: [
            { text: 'array.length', isCorrect: true },
            { text: 'len(array)', isCorrect: false },
            { text: 'array.count()', isCorrect: false },
            { text: 'array.size', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level6Id,
      orderIndex: 5,
      title: 'JavaScript: Objects & Properties 📖',
      language: 'javascript',
      explanation: `# Objects in JavaScript 📖\n\nJavaScript **objects** represent real-world entities with properties (key: value pairs):\n\n\`\`\`javascript
let spaceship = {
    model: "Star Cruiser",
    shields: 100,
    warpDrive: true
};

// Access with dot notation or brackets:
console.log(spaceship.model); // "Star Cruiser"

// Update or add property:
spaceship.shields = 80;
\`\`\``,
      example: `\`\`\`javascript
let hero = { name: "Aria", hp: 120 };
console.log(hero.name);
hero.hp = 150;
console.log(hero.hp);
\`\`\``,
      activityData: {
        language: 'javascript',
        instructions: '1. Create object `let robot = { name: "Circuit", battery: 100 };`\n2. Set `robot.battery = 90;`\n3. Print `console.log(robot.name);`\n4. Print `console.log(robot.battery);`',
        starterCode: `// JavaScript Objects\nlet robot = {\n    name: "Circuit",\n    battery: 100\n};\n\n// Update battery to 90 and print both\n`,
        solution: `let robot = {\n    name: "Circuit",\n    battery: 100\n};\nrobot.battery = 90;\nconsole.log(robot.name);\nconsole.log(robot.battery);`,
        expectedOutput: `Circuit\n90`,
        validationPatterns: [
          'robot\\s*=\\s*\\{.*name:.*["\']Circuit["\'].*battery:\\s*100.*\\}',
          'robot\\.battery\\s*=\\s*90',
          'console\\.log\\s*\\(\\s*robot\\.name\\s*\\)',
          'console\\.log\\s*\\(\\s*robot\\.battery\\s*\\)'
        ],
        hints: [
          'Use dot notation to modify properties: robot.battery = 90;',
          'Print with console.log(robot.name);',
          'Remember object keys can be written without quotes in JS!'
        ],
        concept: 'objects'
      },
      quizQuestions: [
        {
          question: 'How do you access the "speed" property of `car = { speed: 60 }`?',
          options: [
            { text: 'car.speed', isCorrect: true },
            { text: 'car->speed', isCorrect: false },
            { text: 'car::speed', isCorrect: false },
            { text: 'car(speed)', isCorrect: false }
          ]
        },
        {
          question: 'Can a JavaScript object contain both numbers and strings?',
          options: [
            { text: 'Yes, objects can contain any mix of data types', isCorrect: true },
            { text: 'No, all values must be the same type', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level6Id,
      orderIndex: 6,
      title: 'JavaScript: Pseudo-Code Translation 📜',
      language: 'javascript',
      explanation: `# Translating Pseudo-Code to JavaScript! 📜 (Recommendation #11)\n\nLet's take an algorithm and turn it into real JavaScript code:\n\n\`\`\`text\nALGORITHM: Team Health Checker\n1. INITIALIZE party array with "Knight", "Archer"\n2. PUSH "Wizard" into party\n3. STORE total party size in count variable\n4. LOG the total party size\n\`\`\``,
      example: `\`\`\`javascript
// Pseudo-code:
// Create cart with item price 20
// Add tax 5
// Print total

let price = 20;
let tax = 5;
let total = price + tax;
console.log(total); // 25
\`\`\``,
      activityData: {
        language: 'javascript',
        instructions: 'Translate the algorithm:\n1. `let team = ["Knight", "Archer"];`\n2. `team.push("Wizard");`\n3. `let count = team.length;`\n4. `console.log(count);`',
        starterCode: `// Translate the algorithm into JavaScript!\nlet team = ["Knight", "Archer"];\n\n// 1. push "Wizard"\n// 2. let count = team.length\n// 3. console.log(count)\n`,
        solution: `let team = ["Knight", "Archer"];\nteam.push("Wizard");\nlet count = team.length;\nconsole.log(count);`,
        expectedOutput: `3`,
        validationPatterns: [
          'team\\s*=\\s*\\[.*"Knight".*"Archer".*\\]',
          'team\\.push\\s*\\(\\s*["\']Wizard["\']\\s*\\)',
          '(?:let|const|var)\\s+count\\s*=\\s*team\\.length',
          'console\\.log\\s*\\(\\s*count\\s*\\)'
        ],
        hints: [
          'Use team.push("Wizard") to add the wizard.',
          'Save length in let count = team.length;',
          'Log count with console.log(count);'
        ],
        concept: 'algorithms',
        isPseudoCodeLesson: true
      },
      quizQuestions: [
        {
          question: 'Why do software engineers use pseudo-code?',
          options: [
            { text: 'To plan algorithms clearly without worrying about syntax details first', isCorrect: true },
            { text: 'Because computers understand English directly', isCorrect: false },
            { text: 'To make programs run faster', isCorrect: false }
          ]
        },
        {
          question: 'What is the length of `["a", "b", "c"]` in JavaScript?',
          options: [
            { text: '3', isCorrect: true },
            { text: '2', isCorrect: false },
            { text: '4', isCorrect: false }
          ]
        }
      ]
    },

    // ============================================================
    // LEVEL 6 — JAVA: DATA STRUCTURES
    // ============================================================
    {
      levelId: level6Id,
      orderIndex: 7,
      title: 'Java: Arrays & Length 📋',
      language: 'java',
      explanation: `# Arrays in Java ☕\n\nIn Java, an **array** holds a fixed number of values of a single specified type:\n\n\`\`\`java
String[] weapons = {"Sword", "Bow", "Staff"};
System.out.println(weapons[0]); // "Sword"
System.out.println(weapons.length); // 3
\`\`\`\n\nArrays in Java use square brackets \`[]\` next to the type, and curly braces \`{}\` for inline initialization!`,
      example: `\`\`\`java
public class Main {
    public static void main(String[] args) {
        int[] scores = {100, 85, 92};
        System.out.println("First: " + scores[0]);
        System.out.println("Total: " + scores.length);
    }
}
\`\`\``,
      activityData: {
        language: 'java',
        instructions: '1. Declare `String[] artifacts = {"Shield", "Crown", "Relic"};`\n2. Print the first item: `System.out.println(artifacts[0]);`\n3. Print the array length: `System.out.println(artifacts.length);`',
        starterCode: `public class Main {\n    public static void main(String[] args) {\n        // Declare String[] artifacts and print artifacts[0] and artifacts.length\n        \n    }\n}`,
        solution: `public class Main {\n    public static void main(String[] args) {\n        String[] artifacts = {"Shield", "Crown", "Relic"};\n        System.out.println(artifacts[0]);\n        System.out.println(artifacts.length);\n    }\n}`,
        expectedOutput: `Shield\n3`,
        validationPatterns: [
          'String\\s*\\[\\]\\s+artifacts\\s*=\\s*\\{.*["\']Shield["\'].*["\']Crown["\'].*["\']Relic["\'].*\\}\\s*;',
          'System\\.out\\.println\\s*\\(\\s*artifacts\\[0\\]\\s*\\)\\s*;',
          'System\\.out\\.println\\s*\\(\\s*artifacts\\.length\\s*\\)\\s*;'
        ],
        hints: [
          'Java arrays are initialized with curly braces: String[] artifacts = {"Shield", "Crown", "Relic"};',
          'In Java, array length is a property: artifacts.length (no parentheses!).',
          'Index 0 accesses the first element: artifacts[0].'
        ],
        concept: 'arrays'
      },
      quizQuestions: [
        {
          question: 'How do you declare an array of integers in Java?',
          options: [
            { text: 'int[] numbers = {1, 2, 3};', isCorrect: true },
            { text: 'array numbers = [1, 2, 3];', isCorrect: false },
            { text: 'List<int> numbers = (1, 2, 3);', isCorrect: false }
          ]
        },
        {
          question: 'How do you check an array\'s size in Java?',
          options: [
            { text: 'array.length', isCorrect: true },
            { text: 'array.length()', isCorrect: false },
            { text: 'array.size()', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level6Id,
      orderIndex: 8,
      title: 'Java: Working with Elements 📖',
      language: 'java',
      explanation: `# Modifying Java Array Elements ☕\n\nYou can reassign elements in an existing Java array using their index:\n\n\`\`\`java
String[] party = {"Knight", "Squire"};
party[1] = "Paladin"; // Upgraded!
System.out.println(party[1]); // Paladin
\`\`\``,
      example: `\`\`\`java
public class Main {
    public static void main(String[] args) {
        int[] levels = {1, 1, 1};
        levels[0] = 5;
        System.out.println(levels[0]);
    }
}
\`\`\``,
      activityData: {
        language: 'java',
        instructions: '1. Create `int[] inventory = {10, 20, 30};`\n2. Update the second element (index 1) to 50: `inventory[1] = 50;`\n3. Print `System.out.println(inventory[1]);`',
        starterCode: `public class Main {\n    public static void main(String[] args) {\n        // int[] inventory = {10, 20, 30};\n        \n        // Update index 1 to 50 and print it\n        \n    }\n}`,
        solution: `public class Main {\n    public static void main(String[] args) {\n        int[] inventory = {10, 20, 30};\n        inventory[1] = 50;\n        System.out.println(inventory[1]);\n    }\n}`,
        expectedOutput: `50`,
        validationPatterns: [
          'int\\s*\\[\\]\\s+inventory\\s*=\\s*\\{.*10.*20.*30.*\\}\\s*;',
          'inventory\\[1\\]\\s*=\\s*50\\s*;',
          'System\\.out\\.println\\s*\\(\\s*inventory\\[1\\]\\s*\\)\\s*;'
        ],
        hints: [
          'Remember index 1 is the SECOND item in the array.',
          'inventory[1] = 50;',
          'System.out.println(inventory[1]);'
        ],
        concept: 'arrays'
      },
      quizQuestions: [
        {
          question: 'Which index refers to the second element in a Java array?',
          options: [
            { text: '1', isCorrect: true },
            { text: '2', isCorrect: false },
            { text: '0', isCorrect: false }
          ]
        },
        {
          question: 'Can a Java `int[]` array hold a String?',
          options: [
            { text: 'No, all elements in int[] must be integers', isCorrect: true },
            { text: 'Yes, Java arrays can hold any type together', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level6Id,
      orderIndex: 9,
      title: 'Java: Pseudo-Code Translation 📜',
      language: 'java',
      explanation: `# Algorithm Planning to Java ☕ (Recommendation #11)\n\nLet's plan and execute a crystal collector algorithm:\n\n\`\`\`text\nALGORITHM: Vault Security Check\n1. DECLARE integer array vaultCodes with 101, 202, 303\n2. REASSIGN vaultCodes[0] to 999\n3. PRINT vaultCodes[0]\n\`\`\``,
      example: `\`\`\`java
public class Main {
    public static void main(String[] args) {
        int[] vaultCodes = {101, 202, 303};
        vaultCodes[0] = 999;
        System.out.println(vaultCodes[0]);
    }
}
\`\`\``,
      activityData: {
        language: 'java',
        instructions: 'Translate the algorithm:\n1. `int[] vaultCodes = {101, 202, 303};`\n2. `vaultCodes[0] = 999;`\n3. `System.out.println(vaultCodes[0]);`',
        starterCode: `public class Main {\n    public static void main(String[] args) {\n        // Translate algorithm to Java\n        \n    }\n}`,
        solution: `public class Main {\n    public static void main(String[] args) {\n        int[] vaultCodes = {101, 202, 303};\n        vaultCodes[0] = 999;\n        System.out.println(vaultCodes[0]);\n    }\n}`,
        expectedOutput: `999`,
        validationPatterns: [
          'int\\s*\\[\\]\\s+vaultCodes\\s*=\\s*\\{.*101.*202.*303.*\\}\\s*;',
          'vaultCodes\\[0\\]\\s*=\\s*999\\s*;',
          'System\\.out\\.println\\s*\\(\\s*vaultCodes\\[0\\]\\s*\\)\\s*;'
        ],
        hints: [
          'Declare int[] vaultCodes = {101, 202, 303};',
          'vaultCodes[0] = 999;',
          'System.out.println(vaultCodes[0]);'
        ],
        concept: 'algorithms',
        isPseudoCodeLesson: true
      },
      quizQuestions: [
        {
          question: 'What does index [0] target in an array?',
          options: [
            { text: 'The very first element', isCorrect: true },
            { text: 'The last element', isCorrect: false },
            { text: 'A random element', isCorrect: false }
          ]
        },
        {
          question: 'What is the type of {101, 202, 303} in Java?',
          options: [
            { text: 'int[]', isCorrect: true },
            { text: 'String[]', isCorrect: false },
            { text: 'double[]', isCorrect: false }
          ]
        }
      ]
    },

    // ============================================================
    // LEVEL 7 — PYTHON: LOGIC, LOOPS, MINI-PROJECT & DEBUGGING
    // ============================================================
    {
      levelId: level7Id,
      orderIndex: 1,
      title: 'Python: If/Else & The Bug Detective 🔍🐞',
      language: 'python',
      explanation: `# Conditionals & Error Debugging in Python 🐍 (Recommendation #9)\n\nIn Python, **\`if\`** and **\`else\`** let your program make choices based on boolean conditions.\n\n### Indentation is Crucial!\nPython uses indentation (4 spaces) instead of brackets. If your code isn't indented, Python gives an **\`IndentationError\`**!\n\n\`\`\`python
score = 85
if score >= 70:
    print("Quest Passed! ⭐")
else:
    print("Try Again! 🔄")
\`\`\``,
      example: `\`\`\`python
energy = 20
if energy > 50:
    print("Sprint!")
else:
    print("Rest...")
\`\`\``,
      activityData: {
        language: 'python',
        instructions: '🐞 **BUG DETECTIVE!** The code below has a syntax bug: the `if` and `else` lines are missing colons `:`, and indentation is broken! Find and fix the errors so it correctly prints `"Access Granted"` when `level >= 5`.',
        starterCode: `# FIX THE BUGS! 🐞\n# 1. Add missing colons : after if and else\n# 2. Indent the print statements properly!\n\nlevel = 7\nif level >= 5\nprint("Access Granted")\nelse\nprint("Access Denied")\n`,
        solution: `level = 7\nif level >= 5:\n    print("Access Granted")\nelse:\n    print("Access Denied")`,
        expectedOutput: `Access Granted`,
        validationPatterns: [
          'if\\s+level\\s*>=\\s*5\\s*:',
          'print\\s*\\(\\s*["\']Access Granted["\']\\s*\\)',
          'else\\s*:'
        ],
        hints: [
          'In Python, every if and else statement MUST end with a colon :',
          'Lines inside the if and else block must be indented (4 spaces).',
          'When level = 7, 7 >= 5 is True, so it prints "Access Granted".'
        ],
        concept: 'conditionals',
        isDebuggingLesson: true
      },
      quizQuestions: [
        {
          question: 'What punctuation character must follow an `if` condition in Python?',
          options: [
            { text: 'Colon :', isCorrect: true },
            { text: 'Semicolon ;', isCorrect: false },
            { text: 'Comma ,', isCorrect: false },
            { text: 'Curly brace {', isCorrect: false }
          ]
        },
        {
          question: 'How does Python know which lines belong inside an if block?',
          options: [
            { text: 'By the indentation (spaces) at the start of each line', isCorrect: true },
            { text: 'By curly braces { }', isCorrect: false },
            { text: 'By parenthesized keywords', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level7Id,
      orderIndex: 2,
      title: 'Python: Loops & Iteration 🔄',
      language: 'python',
      explanation: `# Loops in Python 🔄\n\nA **\`for\` loop** allows you to repeat instructions without copying and pasting!\n\n### Range Loop:\n\`\`\`python
# Repeats 5 times (i = 0, 1, 2, 3, 4)
for i in range(5):
    print("Step", i)
\`\`\`\n\n### Looping Over a List:\n\`\`\`python
gems = ["Ruby", "Sapphire", "Topaz"]
for gem in gems:
    print("Found:", gem)
\`\`\``,
      example: `\`\`\`python
total = 0
for number in [10, 20, 30]:
    total = total + number
print("Total sum:", total) # 60
\`\`\``,
      activityData: {
        language: 'python',
        instructions: '1. Create `total = 0`\n2. Write a loop: `for n in [5, 10, 15]:`\n3. Inside the loop: `total = total + n`\n4. After the loop: `print(total)`',
        starterCode: `# Calculate total using a for loop\ntotal = 0\n\n# Write the loop here\n\n# Print total\n`,
        solution: `total = 0\nfor n in [5, 10, 15]:\n    total = total + n\nprint(total)`,
        expectedOutput: `30`,
        validationPatterns: [
          'total\\s*=\\s*0',
          'for\\s+\\w+\\s+in\\s+\\[.*5.*10.*15.*\\]\\s*:',
          'total\\s*=\\s*total\\s*\\+\\s*\\w+',
          'print\\s*\\(\\s*total\\s*\\)'
        ],
        hints: [
          'Write: for n in [5, 10, 15]: (don\'t forget the colon!)',
          'Indent the inside: total = total + n',
          'Print total outside the loop at the very end.'
        ],
        concept: 'loops'
      },
      quizQuestions: [
        {
          question: 'What numbers will `range(3)` generate in Python?',
          options: [
            { text: '0, 1, 2', isCorrect: true },
            { text: '1, 2, 3', isCorrect: false },
            { text: '0, 1, 2, 3', isCorrect: false }
          ]
        },
        {
          question: 'What does the `break` keyword do in a loop?',
          options: [
            { text: 'Immediately exits the loop', isCorrect: true },
            { text: 'Skips to the next round', isCorrect: false },
            { text: 'Restarts the computer', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level7Id,
      orderIndex: 3,
      title: 'Python: Functions & Mini-Project Calculator 🏗️',
      language: 'python',
      explanation: `# Functions & Mini-Project: Smart Calculator! 🏗️ (Recommendation #10 & #12)\n\nA **function** is a reusable block of code defined with \`def\`.\n\nGood documentation includes a **docstring** (\`"""..."""\`) explaining what the function does (Recommendation #12):\n\n\`\`\`python
def calculate_loot(chests, coins_per_chest):
    """Calculates total coins found across chests."""
    return chests * coins_per_chest

total = calculate_loot(4, 25)
print(total) # 100
\`\`\``,
      example: `\`\`\`python
def add(a, b):
    """Add two numbers."""
    return a + b

print(add(15, 20)) # 35
\`\`\``,
      activityData: {
        language: 'python',
        instructions: '🏗️ **MINI-PROJECT: SMART CALCULATOR**\n1. Define `def add_scores(base, bonus):` with docstring `"""Add scores."""`\n2. Return `base + bonus`\n3. Call `result = add_scores(50, 30)`\n4. Output `print(result)`',
        starterCode: `# Build your Mini-Project Calculator function!\n# 1. Define add_scores(base, bonus)\n# 2. Return base + bonus\n# 3. Call and print result\n`,
        solution: `def add_scores(base, bonus):\n    """Add scores."""\n    return base + bonus\n\nresult = add_scores(50, 30)\nprint(result)`,
        expectedOutput: `80`,
        validationPatterns: [
          'def\\s+add_scores\\s*\\(\\s*base\\s*,\\s*bonus\\s*\\)\\s*:',
          'return\\s+base\\s*\\+\\s*bonus',
          'add_scores\\s*\\(\\s*50\\s*,\\s*30\\s*\\)',
          'print\\s*\\(\\s*result\\s*\\)'
        ],
        hints: [
          'Start with: def add_scores(base, bonus):',
          'Return the sum with: return base + bonus',
          'Call result = add_scores(50, 30) and print(result).'
        ],
        concept: 'functions',
        isMiniProject: true,
        isDocumentationLesson: true
      },
      quizQuestions: [
        {
          question: 'Which keyword defines a function in Python?',
          options: [
            { text: 'def', isCorrect: true },
            { text: 'function', isCorrect: false },
            { text: 'func', isCorrect: false },
            { text: 'make', isCorrect: false }
          ]
        },
        {
          question: 'What statement sends a value back from a function to the caller?',
          options: [
            { text: 'return', isCorrect: true },
            { text: 'send', isCorrect: false },
            { text: 'output', isCorrect: false },
            { text: 'yield_back', isCorrect: false }
          ]
        }
      ]
    },

    // ============================================================
    // LEVEL 7 — JAVASCRIPT: LOGIC, LOOPS, MINI-PROJECT & DEBUGGING
    // ============================================================
    {
      levelId: level7Id,
      orderIndex: 4,
      title: 'JavaScript: If/Else & Debug Detective 🔍🐞',
      language: 'javascript',
      explanation: `# Conditionals & Bug Hunting in JavaScript ⚡ (Recommendation #9)\n\nIn JavaScript, we write conditionals with parentheses and curly braces:\n\n\`\`\`javascript
let energy = 75;
if (energy >= 50) {
    console.log("Ready to battle!");
} else {
    console.log("Recharge needed...");
}
\`\`\`\n\nCommon bugs in JavaScript: missing curly braces \`{}\` or using single equals \`=\` (assignment) instead of \`===\` (equality comparison)!`,
      example: `\`\`\`javascript
let points = 90;
if (points >= 70) {
    console.log("Passed!");
} else {
    console.log("Failed!");
}
\`\`\``,
      activityData: {
        language: 'javascript',
        instructions: '🐞 **BUG DETECTIVE!** The code below has mismatched brackets and a broken condition. Fix it so it prints `"Level Cleared"` when `stars >= 3`.',
        starterCode: `// FIX THE BUGS! 🐞\nlet stars = 4;\nif stars >= 3 {\n    console.log("Level Cleared")\nelse\n    console.log("Try Again")\n}\n`,
        solution: `let stars = 4;\nif (stars >= 3) {\n    console.log("Level Cleared");\n} else {\n    console.log("Try Again");\n}`,
        expectedOutput: `Level Cleared`,
        validationPatterns: [
          'if\\s*\\(\\s*stars\\s*>=\\s*3\\s*\\)',
          'console\\.log\\s*\\(\\s*["\']Level Cleared["\']\\s*\\)',
          'else\\s*\\{'
        ],
        hints: [
          'In JavaScript, if conditions must be inside parentheses: if (stars >= 3)',
          'Each block needs its own curly braces: { ... } else { ... }',
          'When stars is 4, 4 >= 3 is true!'
        ],
        concept: 'conditionals',
        isDebuggingLesson: true
      },
      quizQuestions: [
        {
          question: 'What surrounds the condition in a JavaScript `if` statement?',
          options: [
            { text: 'Parentheses ( )', isCorrect: true },
            { text: 'Square brackets [ ]', isCorrect: false },
            { text: 'Colons : :', isCorrect: false }
          ]
        },
        {
          question: 'Which operator strictly compares equality in JavaScript?',
          options: [
            { text: '===', isCorrect: true },
            { text: '=', isCorrect: false },
            { text: 'equals', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level7Id,
      orderIndex: 5,
      title: 'JavaScript: Loops & Repetition 🔄',
      language: 'javascript',
      explanation: `# Loops in JavaScript ⚡\n\nStandard \`for\` loops in JavaScript use three parts:\n\`for (let i = 0; i < 5; i++)\`\n1. Initializer: \`let i = 0\`\n2. Condition: \`i < 5\`\n3. Increment: \`i++\` (adds 1 every loop)\n\n\`\`\`javascript
for (let i = 1; i <= 3; i++) {
    console.log("Round " + i);
}
\`\`\``,
      example: `\`\`\`javascript
let sum = 0;
for (let i = 1; i <= 3; i++) {
    sum += i;
}
console.log(sum); // 6
\`\`\``,
      activityData: {
        language: 'javascript',
        instructions: '1. Create `let total = 0;`\n2. Loop 3 times: `for (let i = 1; i <= 3; i++)`\n3. Inside the loop add: `total += 10;`\n4. Output: `console.log(total);`',
        starterCode: `// Count total with a for loop\nlet total = 0;\n\n// Write for loop here\n\n// Print total\n`,
        solution: `let total = 0;\nfor (let i = 1; i <= 3; i++) {\n    total += 10;\n}\nconsole.log(total);`,
        expectedOutput: `30`,
        validationPatterns: [
          'total\\s*=\\s*0',
          'for\\s*\\(\\s*let\\s+i\\s*=\\s*1\\s*;\\s*i\\s*<=\\s*3\\s*;\\s*i\\+\\+\\s*\\)',
          'total\\s*(\\+=|\\=\\s*total\\s*\\+\\s*)10',
          'console\\.log\\s*\\(\\s*total\\s*\\)'
        ],
        hints: [
          'Syntax: for (let i = 1; i <= 3; i++) { ... }',
          'Inside the braces: total += 10; or total = total + 10;',
          'console.log(total) outside the loop.'
        ],
        concept: 'loops'
      },
      quizQuestions: [
        {
          question: 'What does `i++` do in a loop?',
          options: [
            { text: 'Increments i by 1', isCorrect: true },
            { text: 'Doubles i', isCorrect: false },
            { text: 'Resets i to 0', isCorrect: false }
          ]
        },
        {
          question: 'How many times will `for (let i = 0; i < 4; i++)` execute?',
          options: [
            { text: '4 times (i = 0, 1, 2, 3)', isCorrect: true },
            { text: '5 times', isCorrect: false },
            { text: '3 times', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level7Id,
      orderIndex: 6,
      title: 'JavaScript: Functions & Mini-Project Calculator 🏗️',
      language: 'javascript',
      explanation: `# Functions & JSDoc Documentation! ⚡ (Recommendation #10 & #12)\n\nIn JavaScript, functions group reusable code. We can document them using **JSDoc comments**:\n\n\`\`\`javascript
/**
 * Multiplies energy by bonus multiplier.
 * @param {number} energy 
 * @param {number} multiplier 
 * @returns {number}
 */
function boost(energy, multiplier) {
    return energy * multiplier;
}

let power = boost(20, 3);
console.log(power); // 60
\`\`\``,
      example: `\`\`\`javascript
function calculateScore(level, gems) {
    return (level * 10) + gems;
}
console.log(calculateScore(3, 15)); // 45
\`\`\``,
      activityData: {
        language: 'javascript',
        instructions: '🏗️ **MINI-PROJECT: SCORE CALCULATOR**\n1. Define `function calculateScore(level, gems)`\n2. Inside return `(level * 10) + gems;`\n3. Call `let finalScore = calculateScore(5, 20);`\n4. Output `console.log(finalScore);`',
        starterCode: `// Mini-Project: Score Calculator\n// 1. function calculateScore(level, gems)\n// 2. return (level * 10) + gems;\n// 3. call with (5, 20) and log finalScore\n`,
        solution: `function calculateScore(level, gems) {\n    return (level * 10) + gems;\n}\nlet finalScore = calculateScore(5, 20);\nconsole.log(finalScore);`,
        expectedOutput: `70`,
        validationPatterns: [
          'function\\s+calculateScore\\s*\\(\\s*level\\s*,\\s*gems\\s*\\)',
          'return\\s+.*level\\s*\\*\\s*10.*\\+.*gems',
          'calculateScore\\s*\\(\\s*5\\s*,\\s*20\\s*\\)',
          'console\\.log\\s*\\(\\s*finalScore\\s*\\)'
        ],
        hints: [
          'Define with: function calculateScore(level, gems) { ... }',
          'return (level * 10) + gems;',
          'let finalScore = calculateScore(5, 20); console.log(finalScore);'
        ],
        concept: 'functions',
        isMiniProject: true,
        isDocumentationLesson: true
      },
      quizQuestions: [
        {
          question: 'How do you define a named function in JavaScript?',
          options: [
            { text: 'function myFunc() { }', isCorrect: true },
            { text: 'def myFunc():', isCorrect: false },
            { text: 'fn myFunc() { }', isCorrect: false }
          ]
        },
        {
          question: 'What style of documentation comments does JavaScript use?',
          options: [
            { text: 'JSDoc with /** ... */', isCorrect: true },
            { text: 'Docstrings with """', isCorrect: false },
            { text: '# comments only', isCorrect: false }
          ]
        }
      ]
    },

    // ============================================================
    // LEVEL 7 — JAVA: LOGIC, LOOPS, MINI-PROJECT & DEBUGGING
    // ============================================================
    {
      levelId: level7Id,
      orderIndex: 7,
      title: 'Java: If/Else & The Bug Detective 🔍🐞',
      language: 'java',
      explanation: `# Conditionals & Debugging in Java ☕ (Recommendation #9)\n\nIn Java, **if** statements test boolean conditions:\n\n\`\`\`java
int shield = 80;
if (shield >= 50) {
    System.out.println("Shield Healthy");
} else {
    System.out.println("Shield Low!");
}
\`\`\`\n\n### Common Java Bugs:\n- Missing semicolons \`;\` on statements\n- Missing type declarations on variables\n- Missing parentheses around if conditions`,
      example: `\`\`\`java
public class Main {
    public static void main(String[] args) {
        int keys = 3;
        if (keys > 0) {
            System.out.println("Gate Unlocked!");
        } else {
            System.out.println("Locked!");
        }
    }
}
\`\`\``,
      activityData: {
        language: 'java',
        instructions: '🐞 **BUG DETECTIVE!** Fix the missing semicolon and broken if statement condition so it compiles and prints `"Hero Active"` when `health > 0`.',
        starterCode: `public class Main {\n    public static void main(String[] args) {\n        // FIX THE BUGS! 🐞\n        int health = 100\n        if health > 0 {\n            System.out.println("Hero Active");\n        }\n    }\n}`,
        solution: `public class Main {\n    public static void main(String[] args) {\n        int health = 100;\n        if (health > 0) {\n            System.out.println("Hero Active");\n        }\n    }\n}`,
        expectedOutput: `Hero Active`,
        validationPatterns: [
          'int\\s+health\\s*=\\s*100\\s*;',
          'if\\s*\\(\\s*health\\s*>\\s*0\\s*\\)',
          'System\\.out\\.println\\s*\\(\\s*["\']Hero Active["\']\\s*\\)\\s*;'
        ],
        hints: [
          'Add a semicolon after int health = 100;',
          'Surround the if condition with parentheses: if (health > 0)',
          'Check that all curly braces match.'
        ],
        concept: 'conditionals',
        isDebuggingLesson: true
      },
      quizQuestions: [
        {
          question: 'What happens in Java if you forget a semicolon at the end of a line?',
          options: [
            { text: 'A compilation error occurs and the program won\'t run', isCorrect: true },
            { text: 'Java automatically guesses and adds it', isCorrect: false },
            { text: 'The computer beeps but runs anyway', isCorrect: false }
          ]
        },
        {
          question: 'What surrounds the condition in a Java if statement?',
          options: [
            { text: 'Parentheses ( )', isCorrect: true },
            { text: 'Curly braces { }', isCorrect: false },
            { text: 'Square brackets [ ]', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level7Id,
      orderIndex: 8,
      title: 'Java: Loops & Counter 🔄',
      language: 'java',
      explanation: `# For Loops in Java ☕\n\nA Java \`for\` loop controls repetition:\n\n\`\`\`java
for (int i = 0; i < 3; i++) {
    System.out.println("Powerup " + i);
}
\`\`\`\n\nNotice we declare the loop variable type: \`int i = 0\`!`,
      example: `\`\`\`java
public class Main {
    public static void main(String[] args) {
        int total = 0;
        for (int i = 1; i <= 3; i++) {
            total = total + 10;
        }
        System.out.println(total);
    }
}
\`\`\``,
      activityData: {
        language: 'java',
        instructions: '1. Declare `int energy = 0;`\n2. Loop 3 times: `for (int i = 1; i <= 3; i++)`\n3. Inside add: `energy = energy + 15;`\n4. Print `System.out.println(energy);`',
        starterCode: `public class Main {\n    public static void main(String[] args) {\n        // Calculate energy in loop\n        int energy = 0;\n        \n        // Write for loop\n        \n        // Print energy\n        \n    }\n}`,
        solution: `public class Main {\n    public static void main(String[] args) {\n        int energy = 0;\n        for (int i = 1; i <= 3; i++) {\n            energy = energy + 15;\n        }\n        System.out.println(energy);\n    }\n}`,
        expectedOutput: `45`,
        validationPatterns: [
          'int\\s+energy\\s*=\\s*0\\s*;',
          'for\\s*\\(\\s*int\\s+i\\s*=\\s*1\\s*;\\s*i\\s*<=\\s*3\\s*;\\s*i\\+\\+\\s*\\)',
          'energy\\s*=\\s*energy\\s*\\+\\s*15\\s*;',
          'System\\.out\\.println\\s*\\(\\s*energy\\s*\\)\\s*;'
        ],
        hints: [
          'Java for loop format: for (int i = 1; i <= 3; i++) { ... }',
          'energy = energy + 15;',
          'System.out.println(energy); outside the loop.'
        ],
        concept: 'loops'
      },
      quizQuestions: [
        {
          question: 'How do you declare the loop variable in a Java for loop?',
          options: [
            { text: 'for (int i = 0; ...)', isCorrect: true },
            { text: 'for (i = 0; ...)', isCorrect: false },
            { text: 'for (var i = 0; ...)', isCorrect: false }
          ]
        },
        {
          question: 'What separates the three statements in a Java for loop header?',
          options: [
            { text: 'Semicolons ;', isCorrect: true },
            { text: 'Commas ,', isCorrect: false },
            { text: 'Colons :', isCorrect: false }
          ]
        }
      ]
    },

    {
      levelId: level7Id,
      orderIndex: 9,
      title: 'Java: Methods & Mini-Project Calculator 🏗️',
      language: 'java',
      explanation: `# Methods & Javadoc in Java ☕ (Recommendation #10 & #12)\n\nIn Java, functions are called **methods**. Methods inside \`Main\` are defined with \`static\`:\n\n\`\`\`java
/**
 * Calculates total crystals given bags and crystals per bag.
 */
public static int multiply(int a, int b) {
    return a * b;
}
\`\`\`\n\nNotice the method declares the **return type** (\`int\`) and the type of each parameter!`,
      example: `\`\`\`java
public class Main {
    public static int add(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        int sum = add(20, 30);
        System.out.println(sum); // 50
    }
}
\`\`\``,
      activityData: {
        language: 'java',
        instructions: '🏗️ **MINI-PROJECT: DAMAGE CALCULATOR**\n1. Add a method `public static int calculateDamage(int base, int boost)` that returns `base + boost;`\n2. In `main`, call `int totalDamage = calculateDamage(60, 25);`\n3. Output `System.out.println(totalDamage);`',
        starterCode: `public class Main {\n    // 1. Declare public static int calculateDamage(int base, int boost)\n    \n    public static void main(String[] args) {\n        // 2. Call calculateDamage(60, 25) and print totalDamage\n        \n    }\n}`,
        solution: `public class Main {\n    public static int calculateDamage(int base, int boost) {\n        return base + boost;\n    }\n\n    public static void main(String[] args) {\n        int totalDamage = calculateDamage(60, 25);\n        System.out.println(totalDamage);\n    }\n}`,
        expectedOutput: `85`,
        validationPatterns: [
          'public\\s+static\\s+int\\s+calculateDamage\\s*\\(\\s*int\\s+base\\s*,\\s*int\\s+boost\\s*\\)',
          'return\\s+base\\s*\\+\\s*boost\\s*;',
          'calculateDamage\\s*\\(\\s*60\\s*,\\s*25\\s*\\)',
          'System\\.out\\.println\\s*\\(\\s*totalDamage\\s*\\)\\s*;'
        ],
        hints: [
          'Method signature: public static int calculateDamage(int base, int boost) { return base + boost; }',
          'In main: int totalDamage = calculateDamage(60, 25);',
          'System.out.println(totalDamage);'
        ],
        concept: 'functions',
        isMiniProject: true,
        isDocumentationLesson: true
      },
      quizQuestions: [
        {
          question: 'What is a function called when defined inside a Java class?',
          options: [
            { text: 'A Method', isCorrect: true },
            { text: 'A Routine', isCorrect: false },
            { text: 'A Procedure', isCorrect: false }
          ]
        },
        {
          question: 'What does `public static void` mean when defining a Java method?',
          options: [
            { text: 'It returns nothing (void)', isCorrect: true },
            { text: 'It returns an integer', isCorrect: false },
            { text: 'It cannot be called', isCorrect: false }
          ]
        }
      ]
    }
  ];

  // Insert or update all 27 coding lessons
  for (const def of lessonDefs) {
    const checkLesson = await query(
      `SELECT id FROM lessons WHERE level_id = $1 AND title = $2`,
      [def.levelId, def.title]
    );

    let lessonId: number;
    if (checkLesson.rows.length === 0) {
      const inserted = await query(
        `INSERT INTO lessons (level_id, order_index, title, explanation, example, activity_type, activity_data, coding_language, is_published)
         VALUES ($1, $2, $3, $4, $5, 'coding', $6, $7, true) RETURNING id`,
        [
          def.levelId,
          def.orderIndex,
          def.title,
          def.explanation,
          def.example,
          JSON.stringify(def.activityData),
          def.language
        ]
      );
      lessonId = inserted.rows[0].id;
      console.log(`📝 Added Coding Lesson: ${def.title}`);
    } else {
      lessonId = checkLesson.rows[0].id;
      await query(
        `UPDATE lessons SET 
           explanation = $1, 
           example = $2, 
           activity_type = 'coding',
           activity_data = $3, 
           coding_language = $4,
           order_index = $5
         WHERE id = $6`,
        [
          def.explanation,
          def.example,
          JSON.stringify(def.activityData),
          def.language,
          def.orderIndex,
          lessonId
        ]
      );
    }

    // Ensure quiz exists
    const checkQuiz = await query('SELECT id FROM quizzes WHERE lesson_id = $1', [lessonId]);
    let quizId: number;
    if (checkQuiz.rows.length === 0) {
      const qRes = await query('INSERT INTO quizzes (lesson_id, passing_score) VALUES ($1, 70) RETURNING id', [lessonId]);
      quizId = qRes.rows[0].id;
    } else {
      quizId = checkQuiz.rows[0].id;
    }

    // Ensure questions exist
    for (let i = 0; i < def.quizQuestions.length; i++) {
      const qq = def.quizQuestions[i];
      const checkQuestion = await query(
        'SELECT id FROM quiz_questions WHERE quiz_id = $1 AND question_text = $2',
        [quizId, qq.question]
      );
      if (checkQuestion.rows.length === 0) {
        await query(
          'INSERT INTO quiz_questions (quiz_id, question_text, options, order_index) VALUES ($1, $2, $3, $4)',
          [quizId, qq.question, JSON.stringify(qq.options), i + 1]
        );
      }
    }
  }

  // 4. Seed Badges for Coding Mastery (Recommendation #7, #8, #9, #10)
  const codingBadges = [
    { name: 'Python Pioneer — Bronze', description: 'Mastered Variables & Data Types in Python!', icon_emoji: '🐍', criteria: 'complete_python_level_5' },
    { name: 'Python Pioneer — Silver', description: 'Mastered Lists & Dictionaries in Python!', icon_emoji: '🐍', criteria: 'complete_python_level_6' },
    { name: 'Python Pioneer — Gold', description: 'Mastered Logic & Functions in Python!', icon_emoji: '👑', criteria: 'complete_python_level_7' },

    { name: 'JavaScript Ninja — Bronze', description: 'Mastered Variables & Operations in JavaScript!', icon_emoji: '⚡', criteria: 'complete_javascript_level_5' },
    { name: 'JavaScript Ninja — Silver', description: 'Mastered Arrays & Objects in JavaScript!', icon_emoji: '⚡', criteria: 'complete_javascript_level_6' },
    { name: 'JavaScript Ninja — Gold', description: 'Mastered Logic & Functions in JavaScript!', icon_emoji: '⚡', criteria: 'complete_javascript_level_7' },

    { name: 'Java Knight — Bronze', description: 'Mastered Strong Typing in Java!', icon_emoji: '☕', criteria: 'complete_java_level_5' },
    { name: 'Java Knight — Silver', description: 'Mastered Arrays & Elements in Java!', icon_emoji: '☕', criteria: 'complete_java_level_6' },
    { name: 'Java Knight — Gold', description: 'Mastered Methods & Loops in Java!', icon_emoji: '☕', criteria: 'complete_java_level_7' },

    { name: 'Code Streaker', description: 'Coded 3 consecutive days in the Coding Lab!', icon_emoji: '🔥', criteria: 'coding_streak_3' },
    { name: 'Bug Buster', description: 'Found and resolved a tricky syntax error!', icon_emoji: '🐞', criteria: 'debug_lesson_completed' },
    { name: 'Project Architect', description: 'Completed a real-world coding mini-project!', icon_emoji: '🏗️', criteria: 'mini_project_completed' },
    { name: 'Code Golfer', description: 'Solved a daily coding challenge with ultra-compact code!', icon_emoji: '⛳', criteria: 'code_golf_completed' }
  ];

  for (const b of codingBadges) {
    const exists = await query('SELECT id FROM badges WHERE name = $1', [b.name]);
    if (exists.rows.length === 0) {
      await query(
        'INSERT INTO badges (name, description, icon_emoji, criteria) VALUES ($1, $2, $3, $4)',
        [b.name, b.description, b.icon_emoji, b.criteria]
      );
    }
  }

  // 5. Seed Daily Quests / Coding Challenges (Recommendation #5 & #6)
  const defaultChallenges = [
    {
      title: 'Sum of Two Numbers',
      language: 'python',
      difficulty: 'Easy',
      prompt: 'Write code to store num1 = 15, num2 = 25, and print their sum!',
      starter_code: '# Python: Sum two numbers\nnum1 = 15\nnum2 = 25\n\n# Calculate and print sum\n',
      solution_pattern: 'print\\s*\\(\\s*(?:num1\\s*\\+\\s*num2|40)\\s*\\)',
      expected_output: '40',
      xp_reward: 50,
      time_limit_seconds: 120
    },
    {
      title: 'String Length Counter',
      language: 'javascript',
      difficulty: 'Easy',
      prompt: 'Declare word = "CodeQuest", compute its length, and print it with console.log()!',
      starter_code: '// JavaScript: String length\nlet word = "CodeQuest";\n\n// Print length\n',
      solution_pattern: 'console\\.log\\s*\\(\\s*(?:word\\.length|9)\\s*\\)',
      expected_output: '9',
      xp_reward: 50,
      time_limit_seconds: 120
    },
    {
      title: 'Max Number Finder',
      language: 'java',
      difficulty: 'Medium',
      prompt: 'In Java, given a = 42 and b = 88, use Math.max(a, b) or an if statement to print the larger number!',
      starter_code: 'public class Main {\n    public static void main(String[] args) {\n        int a = 42;\n        int b = 88;\n        // Print the larger number\n        \n    }\n}',
      solution_pattern: 'System\\.out\\.println\\s*\\(\\s*(?:Math\\.max\\(a,\\s*b\\)|b|88)\\s*\\)',
      expected_output: '88',
      xp_reward: 75,
      time_limit_seconds: 180
    }
  ];

  for (const ch of defaultChallenges) {
    const exists = await query('SELECT id FROM coding_challenges WHERE title = $1 AND language = $2', [ch.title, ch.language]);
    if (exists.rows.length === 0) {
      await query(
        `INSERT INTO coding_challenges (title, language, difficulty, prompt, starter_code, solution_pattern, expected_output, xp_reward, time_limit_seconds, is_daily)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
        [ch.title, ch.language, ch.difficulty, ch.prompt, ch.starter_code, ch.solution_pattern, ch.expected_output, ch.xp_reward, ch.time_limit_seconds]
      );
    }
  }

  // 6. Seed Spell Book Snippets for admin user (Recommendation #4)
  const adminUser = await query('SELECT id FROM users WHERE username = $1', ['admin']);
  if (adminUser.rows.length > 0) {
    const adminId = adminUser.rows[0].id;
    const starterSnippets = [
      {
        title: 'Python: Fast List Doubler',
        language: 'python',
        code: 'numbers = [1, 2, 3, 4, 5]\ndoubled = [n * 2 for n in numbers]\nprint(doubled)',
        description: 'Demonstrates Python list comprehension syntax.'
      },
      {
        title: 'JavaScript: Array Filter Evens',
        language: 'javascript',
        code: 'const nums = [1, 2, 3, 4, 5, 6];\nconst evens = nums.filter(n => n % 2 === 0);\nconsole.log(evens);',
        description: 'Filters an array keeping only even numbers using arrow function.'
      },
      {
        title: 'Java: Standard Main Boilerplate',
        language: 'java',
        code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Ready to code!");\n    }\n}',
        description: 'The standard entry point class for any Java application.'
      }
    ];

    for (const snip of starterSnippets) {
      const snipExists = await query('SELECT id FROM code_snippets WHERE title = $1', [snip.title]);
      if (snipExists.rows.length === 0) {
        await query(
          `INSERT INTO code_snippets (user_id, title, language, code, description, is_spell_book)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [adminId, snip.title, snip.language, snip.code, snip.description]
        );
      }
    }
  }

  console.log('🌟 Multi-language Coding Curriculum successfully initialized!');
}
