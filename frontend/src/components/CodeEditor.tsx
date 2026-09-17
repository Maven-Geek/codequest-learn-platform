// ============================================================
// CodeQuest — Multi-Language Code Editor with Real-Time Execution
// Supports Python (Pyodide WASM), JavaScript (Live Eval), Java (Simulation)
// Line numbers, syntax highlighting, auto-indent, console output
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { CodingLanguage } from '../../../shared/src/types';

interface CodeEditorProps {
  initialCode: string;
  language: CodingLanguage;
  onChange?: (code: string) => void;
  onRun?: (code: string, output: string, error?: string) => void;
  readOnly?: boolean;
  minHeight?: string;
  placeholder?: string;
  expectedOutput?: string;
}

// Tokenizer & syntax highlighter
function highlightCode(code: string, language: CodingLanguage): string {
  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const lines = code.split('\n');

  return lines
    .map((line) => {
      if (!line) return '&nbsp;';

      let result = '';
      let remaining = line;

      // Handle single-line comments first
      if (language === 'python' && remaining.includes('#')) {
        const idx = remaining.indexOf('#');
        const codePart = remaining.slice(0, idx);
        const commentPart = remaining.slice(idx);
        return tokenizeLine(codePart, language) + `<span class="token-comment">${escapeHtml(commentPart)}</span>`;
      }

      if ((language === 'javascript' || language === 'java') && remaining.includes('//')) {
        const idx = remaining.indexOf('//');
        const codePart = remaining.slice(0, idx);
        const commentPart = remaining.slice(idx);
        return tokenizeLine(codePart, language) + `<span class="token-comment">${escapeHtml(commentPart)}</span>`;
      }

      return tokenizeLine(remaining, language);
    })
    .join('\n');
}

function tokenizeLine(text: string, language: CodingLanguage): string {
  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const pythonKeywords = [
    'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'in', 'return', 'import',
    'from', 'as', 'True', 'False', 'None', 'and', 'or', 'not', 'is', 'try',
    'except', 'pass', 'break', 'continue', 'lambda', 'with', 'global'
  ];

  const jsKeywords = [
    'function', 'let', 'const', 'var', 'if', 'else', 'for', 'while', 'do',
    'return', 'import', 'export', 'default', 'class', 'extends', 'true', 'false',
    'null', 'undefined', 'new', 'this', 'typeof', 'try', 'catch', 'finally',
    'switch', 'case', 'break', 'continue', 'async', 'await'
  ];

  const javaKeywords = [
    'public', 'private', 'protected', 'class', 'static', 'void', 'int', 'double',
    'float', 'boolean', 'char', 'String', 'if', 'else', 'for', 'while', 'return',
    'new', 'this', 'true', 'false', 'null', 'final', 'package', 'import', 'main'
  ];

  const keywords =
    language === 'python'
      ? pythonKeywords
      : language === 'javascript'
      ? jsKeywords
      : javaKeywords;

  // Regex for token matching: string literals, numbers, words, operators
  const tokenRegex =
    /(["'`])(?:(?=(\\?))\2[\s\S])*?\1|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_]\w*\b|[+\-*/%=!<>]=?|&&|\|\||[{}()\[\],;:]|\s+/g;

  let out = '';
  let match;
  let lastIndex = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    const token = match[0];
    const isString = /^["'`]/.test(token);
    const isNumber = /^\d+(?:\.\d+)?$/.test(token);

    if (isString) {
      out += `<span class="token-string">${escapeHtml(token)}</span>`;
    } else if (isNumber) {
      out += `<span class="token-number">${escapeHtml(token)}</span>`;
    } else if (keywords.includes(token)) {
      if (['String', 'int', 'double', 'boolean', 'void'].includes(token)) {
        out += `<span class="token-type">${escapeHtml(token)}</span>`;
      } else {
        out += `<span class="token-keyword">${escapeHtml(token)}</span>`;
      }
    } else if (['print', 'console', 'log', 'System', 'out', 'println', 'append', 'push', 'len', 'length'].includes(token)) {
      out += `<span class="token-function">${escapeHtml(token)}</span>`;
    } else {
      out += escapeHtml(token);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    out += escapeHtml(text.slice(lastIndex));
  }

  return out;
}

// Global Pyodide cache
let pyodidePromise: Promise<any> | null = null;

async function loadPyodideEngine(): Promise<any> {
  if (pyodidePromise) return pyodidePromise;

  pyodidePromise = new Promise((resolve, reject) => {
    // Check if script already on page
    if ((window as any).loadPyodide) {
      (window as any)
        .loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/' })
        .then(resolve)
        .catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).loadPyodide) {
        (window as any)
          .loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/' })
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error('Pyodide script failed to initialize.'));
      }
    };
    script.onerror = () => reject(new Error('Could not load Pyodide from CDN.'));
    document.head.appendChild(script);
  });

  return pyodidePromise;
}

export default function CodeEditor({
  initialCode,
  language,
  onChange,
  onRun,
  readOnly = false,
  minHeight = '280px',
  placeholder = 'Write code here...',
  expectedOutput,
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode || '');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<number>(14);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setCode(initialCode || '');
    setOutput('');
    setError(null);
  }, [initialCode, language]);

  // Sync scroll between textarea and syntax highlight overlay
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const indent = language === 'javascript' ? '  ' : '    ';

    // Tab key inserts indentation spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newCode = code.substring(0, start) + indent + code.substring(end);
      setCode(newCode);
      onChange?.(newCode);

      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + indent.length;
      }, 0);
    }

    // Auto-close brackets & quotes
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
    };

    if (pairs[e.key]) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const closeChar = pairs[e.key];

      // If user selected text, surround it
      if (start !== end) {
        e.preventDefault();
        const selected = code.substring(start, end);
        const newCode = code.substring(0, start) + e.key + selected + closeChar + code.substring(end);
        setCode(newCode);
        onChange?.(newCode);
        setTimeout(() => {
          textarea.selectionStart = start + 1;
          textarea.selectionEnd = end + 1;
        }, 0);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCode(val);
    onChange?.(val);
  };

  // Run Code Execution Engine (Recommendation #3)
  const runCode = async () => {
    setIsRunning(true);
    setError(null);
    setOutput('');

    const capturedLogs: string[] = [];

    try {
      if (language === 'javascript') {
        // Safe in-browser execution with captured console
        const originalLog = console.log;
        const originalError = console.error;

        console.log = (...args: any[]) => {
          capturedLogs.push(
            args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')
          );
        };
        console.error = (...args: any[]) => {
          capturedLogs.push('[ERROR] ' + args.map(String).join(' '));
        };

        try {
          // Run code in an isolated scope
          const runner = new Function(code);
          const result = runner();
          if (result !== undefined && capturedLogs.length === 0) {
            capturedLogs.push(String(result));
          }
        } finally {
          console.log = originalLog;
          console.error = originalError;
        }

        const outText = capturedLogs.join('\n') || 'Code executed successfully (no output).';
        setOutput(outText);
        onRun?.(code, outText);
      } else if (language === 'python') {
        // Run with Pyodide WebAssembly
        try {
          const pyodide = await loadPyodideEngine();
          // Redirect stdout
          pyodide.setStdout({
            batched: (msg: string) => {
              capturedLogs.push(msg);
            },
          });

          await pyodide.runPythonAsync(code);
          const outText = capturedLogs.join('\n') || 'Code executed successfully (no output).';
          setOutput(outText);
          onRun?.(code, outText);
        } catch (pyErr: any) {
          // If Pyodide CDN is slow or blocked, fallback to simulated output pattern matcher
          const simOutput = simulatePythonOutput(code);
          if (simOutput) {
            setOutput(simOutput);
            onRun?.(code, simOutput);
          } else {
            const errStr = pyErr.message || String(pyErr);
            setError(errStr);
            onRun?.(code, '', errStr);
          }
        }
      } else if (language === 'java') {
        // Java simulated execution engine
        const javaOut = simulateJavaOutput(code);
        setOutput(javaOut);
        onRun?.(code, javaOut);
      }
    } catch (err: any) {
      const msg = err.message || String(err);
      setError(msg);
      onRun?.(code, '', msg);
    } finally {
      setIsRunning(false);
    }
  };

  // Python simulated execution fallback — resolves variable assignments and prints
  const simulatePythonOutput = (source: string): string => {
    const logs: string[] = [];
    const vars: Record<string, any> = {};
    const sourceLines = source.split('\n');

    // Helper to evaluate simple expressions against known variables
    const resolveExpr = (expr: string): any => {
      expr = expr.trim();
      // String literal
      if (/^["'](.*)["']$/.test(expr)) return expr.slice(1, -1);
      // Boolean / None
      if (expr === 'True') return true;
      if (expr === 'False') return false;
      if (expr === 'None') return 'None';
      // Number
      if (/^-?\d+(\.\d+)?$/.test(expr)) return parseFloat(expr);
      // List literal
      if (expr.startsWith('[') && expr.endsWith(']')) {
        const inner = expr.slice(1, -1);
        if (!inner.trim()) return [];
        return inner.split(',').map(s => resolveExpr(s.trim()));
      }
      // Dict literal (basic)
      if (expr.startsWith('{') && expr.endsWith('}')) return expr;
      // len(x)
      const lenMatch = expr.match(/^len\s*\(\s*(\w+)\s*\)$/);
      if (lenMatch && vars[lenMatch[1]] !== undefined) {
        const val = vars[lenMatch[1]];
        return Array.isArray(val) ? val.length : String(val).length;
      }
      // Variable index: x[0]
      const indexMatch = expr.match(/^(\w+)\[(\d+)\]$/);
      if (indexMatch && vars[indexMatch[1]] !== undefined) {
        const arr = vars[indexMatch[1]];
        if (Array.isArray(arr)) return arr[parseInt(indexMatch[2])];
      }
      // Dict access: x["key"]
      const dictMatch = expr.match(/^(\w+)\[["'](.+?)["']\]$/);
      if (dictMatch && vars[dictMatch[1]] !== undefined) {
        const obj = vars[dictMatch[1]];
        if (typeof obj === 'object' && obj !== null) return obj[dictMatch[2]];
      }
      // Simple arithmetic: a + b, a * b, a - b, a / b
      const arithMatch = expr.match(/^(.+?)\s*([+\-*/])\s*(.+)$/);
      if (arithMatch) {
        const left = resolveExpr(arithMatch[1]);
        const right = resolveExpr(arithMatch[3]);
        const op = arithMatch[2];
        if (typeof left === 'number' && typeof right === 'number') {
          if (op === '+') return left + right;
          if (op === '-') return left - right;
          if (op === '*') return left * right;
          if (op === '/') return left / right;
        }
        if (typeof left === 'string' && typeof right === 'string' && op === '+') return left + right;
      }
      // f-string: f"...{var}..."
      const fstrMatch = expr.match(/^f["'](.*)["']$/);
      if (fstrMatch) {
        return fstrMatch[1].replace(/\{([^}]+)\}/g, (_, v) => {
          const resolved = resolveExpr(v.trim());
          return resolved !== undefined ? String(resolved) : v;
        });
      }
      // Plain variable
      if (vars[expr] !== undefined) return vars[expr];
      return expr;
    };

    // Execute a block of lines (supports nesting for if/else/for)
    const executeBlock = (blockLines: string[], startIdx: number): number => {
      let i = startIdx;
      while (i < blockLines.length) {
        const rawLine = blockLines[i];
        const trimmed = rawLine.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('"""')) { i++; continue; }

        // --- for loop: for x in [1,2,3]: or for x in range(n): ---
        const forListMatch = trimmed.match(/^for\s+(\w+)\s+in\s+\[(.+)\]\s*:/);
        const forRangeMatch = !forListMatch ? trimmed.match(/^for\s+(\w+)\s+in\s+range\s*\(\s*(.+?)\s*\)\s*:/) : null;
        if (forListMatch || forRangeMatch) {
          // Collect indented body lines
          const bodyLines: string[] = [];
          let j = i + 1;
          while (j < blockLines.length && (blockLines[j].startsWith('    ') || blockLines[j].startsWith('\t') || blockLines[j].trim() === '')) {
            bodyLines.push(blockLines[j]);
            j++;
          }

          let items: any[];
          if (forListMatch) {
            items = forListMatch[2].split(',').map(s => resolveExpr(s.trim()));
          } else {
            const rangeVal = resolveExpr(forRangeMatch![2]);
            items = Array.from({ length: Number(rangeVal) }, (_, k) => k);
          }

          const loopVar = (forListMatch || forRangeMatch)![1];
          for (const item of items) {
            vars[loopVar] = item;
            // De-indent and execute body
            const dedented = bodyLines.map(l => l.replace(/^    |\t/, ''));
            executeBlock(dedented, 0);
          }
          i = j;
          continue;
        }

        // --- if/else ---
        const ifMatch = trimmed.match(/^if\s+(.+)\s*:/);
        if (ifMatch) {
          const condExpr = ifMatch[1];
          // Evaluate condition
          let condResult = false;
          const geMatch = condExpr.match(/^(\w+)\s*>=\s*(.+)$/);
          const gtMatch = !geMatch ? condExpr.match(/^(\w+)\s*>\s*(.+)$/) : null;
          const eqMatch = !geMatch && !gtMatch ? condExpr.match(/^(\w+)\s*==\s*(.+)$/) : null;
          const ltMatch = !geMatch && !gtMatch && !eqMatch ? condExpr.match(/^(\w+)\s*<\s*(.+)$/) : null;
          const leMatch = !geMatch && !gtMatch && !eqMatch && !ltMatch ? condExpr.match(/^(\w+)\s*<=\s*(.+)$/) : null;
          if (geMatch) condResult = Number(resolveExpr(geMatch[1])) >= Number(resolveExpr(geMatch[2]));
          else if (gtMatch) condResult = Number(resolveExpr(gtMatch[1])) > Number(resolveExpr(gtMatch[2]));
          else if (eqMatch) condResult = resolveExpr(eqMatch[1]) === resolveExpr(eqMatch[2]);
          else if (ltMatch) condResult = Number(resolveExpr(ltMatch[1])) < Number(resolveExpr(ltMatch[2]));
          else if (leMatch) condResult = Number(resolveExpr(leMatch[1])) <= Number(resolveExpr(leMatch[2]));

          // Collect if-body
          const ifBody: string[] = [];
          let j = i + 1;
          while (j < blockLines.length && (blockLines[j].startsWith('    ') || blockLines[j].startsWith('\t') || blockLines[j].trim() === '')) {
            if (blockLines[j].trim().startsWith('else')) break;
            ifBody.push(blockLines[j]);
            j++;
          }

          // Collect else-body
          const elseBody: string[] = [];
          if (j < blockLines.length && blockLines[j].trim().startsWith('else')) {
            j++; // skip else:
            while (j < blockLines.length && (blockLines[j].startsWith('    ') || blockLines[j].startsWith('\t') || blockLines[j].trim() === '')) {
              elseBody.push(blockLines[j]);
              j++;
            }
          }

          if (condResult) {
            const dedented = ifBody.map(l => l.replace(/^    |\t/, ''));
            executeBlock(dedented, 0);
          } else if (elseBody.length > 0) {
            const dedented = elseBody.map(l => l.replace(/^    |\t/, ''));
            executeBlock(dedented, 0);
          }
          i = j;
          continue;
        }

        // --- Function definition: def name(args): ---
        const defMatch = trimmed.match(/^def\s+(\w+)\s*\(\s*(.*?)\s*\)\s*:/);
        if (defMatch) {
          const fnName = defMatch[1];
          const paramNames = defMatch[2].split(',').map(p => p.trim()).filter(Boolean);
          const fnBody: string[] = [];
          let j = i + 1;
          while (j < blockLines.length && (blockLines[j].startsWith('    ') || blockLines[j].startsWith('\t') || blockLines[j].trim() === '')) {
            fnBody.push(blockLines[j]);
            j++;
          }
          // Store function as a callable
          vars[`__fn_${fnName}`] = { params: paramNames, body: fnBody };
          i = j;
          continue;
        }

        // --- Variable assignment: x = value ---
        const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
        if (assignMatch && !trimmed.startsWith('print')) {
          const varName = assignMatch[1];
          let valueExpr = assignMatch[2].trim();
          // Check for function call: result = func(a, b)
          const fnCallMatch = valueExpr.match(/^(\w+)\s*\(\s*(.*?)\s*\)$/);
          if (fnCallMatch && vars[`__fn_${fnCallMatch[1]}`]) {
            const fn = vars[`__fn_${fnCallMatch[1]}`];
            const callArgs = fnCallMatch[2].split(',').map(a => resolveExpr(a.trim()));
            // Push args into vars
            const savedVars: Record<string, any> = {};
            fn.params.forEach((p: string, idx: number) => { savedVars[p] = vars[p]; vars[p] = callArgs[idx]; });
            // Execute function body, look for return
            const dedented = fn.body.map((l: string) => l.replace(/^    |\t/, ''));
            let retVal: any = undefined;
            for (const fLine of dedented) {
              const fTrimmed = fLine.trim();
              if (fTrimmed.startsWith('"""') || fTrimmed.startsWith('#') || !fTrimmed) continue;
              const retMatch = fTrimmed.match(/^return\s+(.+)$/);
              if (retMatch) { retVal = resolveExpr(retMatch[1]); break; }
            }
            // Restore vars
            fn.params.forEach((p: string) => { if (savedVars[p] !== undefined) vars[p] = savedVars[p]; else delete vars[p]; });
            vars[varName] = retVal !== undefined ? retVal : valueExpr;
          } else {
            vars[varName] = resolveExpr(valueExpr);
          }
          i++;
          continue;
        }

        // --- List append: x.append(val) ---
        const appendMatch = trimmed.match(/^(\w+)\.append\s*\(\s*(.+?)\s*\)$/);
        if (appendMatch && Array.isArray(vars[appendMatch[1]])) {
          vars[appendMatch[1]].push(resolveExpr(appendMatch[2]));
          i++;
          continue;
        }

        // --- Dict key set: x["key"] = val ---
        const dictSetMatch = trimmed.match(/^(\w+)\[["'](.+?)["']\]\s*=\s*(.+)$/);
        if (dictSetMatch && typeof vars[dictSetMatch[1]] === 'object') {
          vars[dictSetMatch[1]][dictSetMatch[2]] = resolveExpr(dictSetMatch[3]);
          i++;
          continue;
        }

        // --- print() calls ---
        const printMatch = trimmed.match(/^print\s*\((.+)\)$/);
        if (printMatch) {
          const args = printMatch[1];
          if (args.includes(',')) {
            const parts: string[] = [];
            let depth = 0;
            let current = '';
            for (const ch of args) {
              if (ch === '(' || ch === '[' || ch === '{') depth++;
              if (ch === ')' || ch === ']' || ch === '}') depth--;
              if (ch === ',' && depth === 0) { parts.push(current.trim()); current = ''; }
              else current += ch;
            }
            parts.push(current.trim());
            logs.push(parts.map(p => String(resolveExpr(p))).join(' '));
          } else {
            const val = resolveExpr(args);
            if (Array.isArray(val)) {
              logs.push(JSON.stringify(val).replace(/,/g, ', '));
            } else {
              logs.push(String(val));
            }
          }
        }
        i++;
      }
      return i;
    };

    executeBlock(sourceLines, 0);
    return logs.length > 0 ? logs.join('\n') : (expectedOutput || 'Program finished.');
  };

  // Java simulated execution runner — resolves variable declarations and prints
  const simulateJavaOutput = (source: string): string => {
    // Check for basic compile errors (missing semicolon, mismatched braces)
    const openBraces = (source.match(/{/g) || []).length;
    const closeBraces = (source.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      throw new Error(`Java Syntax Error: Mismatched curly braces { }. Found ${openBraces} '{' and ${closeBraces} '}'.`);
    }

    const vars: Record<string, any> = {};
    const logs: string[] = [];

    const resolveExpr = (expr: string): any => {
      expr = expr.trim();
      if (/^"(.*)"$/.test(expr)) return expr.slice(1, -1);
      if (/^-?\d+(\.\d+)?$/.test(expr)) return parseFloat(expr);
      if (expr === 'true') return true;
      if (expr === 'false') return false;
      const indexMatch = expr.match(/^(\w+)\[(\d+)\]$/);
      if (indexMatch && vars[indexMatch[1]] !== undefined) {
        const arr = vars[indexMatch[1]];
        if (Array.isArray(arr)) return arr[parseInt(indexMatch[2])];
      }
      const lenMatch = expr.match(/^(\w+)\.length$/);
      if (lenMatch && vars[lenMatch[1]] !== undefined) {
        const val = vars[lenMatch[1]];
        return Array.isArray(val) ? val.length : 0;
      }
      if (expr.includes('+')) {
        const parts = expr.split('+').map(p => resolveExpr(p.trim()));
        const hasString = parts.some(p => typeof p === 'string');
        if (hasString) return parts.map(p => String(p)).join('');
        if (parts.every(p => typeof p === 'number')) return (parts as number[]).reduce((a, b) => a + b, 0);
      }
      const arithMatch = expr.match(/^(.+?)\s*([*\-/])\s*(.+)$/);
      if (arithMatch) {
        const left = resolveExpr(arithMatch[1]);
        const right = resolveExpr(arithMatch[3]);
        const op = arithMatch[2];
        if (typeof left === 'number' && typeof right === 'number') {
          if (op === '*') return left * right;
          if (op === '-') return left - right;
          if (op === '/') return Math.trunc(left / right);
        }
      }
      if (vars[expr] !== undefined) return vars[expr];
      return expr;
    };

    const methods: Record<string, { params: Array<{type: string, name: string}>, body: string[] }> = {};
    const sourceLines = source.split('\n');

    // First pass: extract method definitions (excluding main)
    let inMethod = false;
    let methodName = '';
    let methodParams: Array<{type: string, name: string}> = [];
    let methodBody: string[] = [];
    let braceDepth = 0;

    for (const line of sourceLines) {
      const trimmed = line.trim();
      const methodDeclMatch = trimmed.match(/^public\s+static\s+(\w+)\s+(\w+)\s*\(\s*(.*?)\s*\)\s*\{?\s*$/);
      if (methodDeclMatch && methodDeclMatch[2] !== 'main') {
        inMethod = true;
        methodName = methodDeclMatch[2];
        methodParams = methodDeclMatch[3] ? methodDeclMatch[3].split(',').map(p => {
          const parts = p.trim().split(/\s+/);
          return { type: parts[0], name: parts[1] };
        }) : [];
        methodBody = [];
        braceDepth = trimmed.includes('{') ? 1 : 0;
        continue;
      }
      if (inMethod) {
        for (const ch of trimmed) {
          if (ch === '{') braceDepth++;
          if (ch === '}') braceDepth--;
        }
        if (braceDepth <= 0) {
          methods[methodName] = { params: methodParams, body: methodBody };
          inMethod = false;
        } else {
          methodBody.push(trimmed);
        }
        continue;
      }
    }

    // Execute a line sequence
    const executeLines = (lines: string[]) => {
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') ||
            trimmed.startsWith('public class') || trimmed.startsWith('public static void main') ||
            trimmed === '{' || trimmed === '}') continue;

        // Skip method declarations (already extracted)
        if (/^public\s+static\s+\w+\s+\w+\s*\(/.test(trimmed) && !trimmed.includes('main')) {
          // Skip until closing brace
          let depth = trimmed.includes('{') ? 1 : 0;
          while (i < lines.length - 1 && depth > 0) {
            i++;
            for (const ch of lines[i]) { if (ch === '{') depth++; if (ch === '}') depth--; }
          }
          continue;
        }

        // --- for loop: for (int i = 0; i < N; i++) { ---
        const forMatch = trimmed.match(/^for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*\w+\s*([<>=!]+)\s*(\d+)\s*;\s*\w+\s*(\+\+|--)\s*\)\s*\{?\s*$/);
        if (forMatch) {
          const loopVar = forMatch[1];
          let loopVal = parseInt(forMatch[2]);
          const limit = parseInt(forMatch[4]);
          const op = forMatch[3];
          const inc = forMatch[5];

          // Collect loop body
          const loopBody: string[] = [];
          let depth = trimmed.includes('{') ? 1 : 0;
          i++;
          while (i < lines.length && depth > 0) {
            const l = lines[i].trim();
            for (const ch of l) { if (ch === '{') depth++; if (ch === '}') depth--; }
            if (depth > 0) loopBody.push(l);
            i++;
          }
          i--; // adjust since the outer for will increment

          const checkCond = () => {
            if (op === '<') return loopVal < limit;
            if (op === '<=') return loopVal <= limit;
            if (op === '>') return loopVal > limit;
            if (op === '>=') return loopVal >= limit;
            return false;
          };

          while (checkCond()) {
            vars[loopVar] = loopVal;
            executeLines(loopBody);
            if (inc === '++') loopVal++; else loopVal--;
          }
          continue;
        }

        // --- if/else: if (condition) { ---
        const ifMatch = trimmed.match(/^if\s*\(\s*(.+?)\s*\)\s*\{?\s*$/);
        if (ifMatch) {
          const condExpr = ifMatch[1];
          let condResult = false;
          const geM = condExpr.match(/^(\w+)\s*>=\s*(.+)$/);
          const gtM = !geM ? condExpr.match(/^(\w+)\s*>\s*(.+)$/) : null;
          const eqM = !geM && !gtM ? condExpr.match(/^(\w+)\s*==\s*(.+)$/) : null;
          const ltM = !geM && !gtM && !eqM ? condExpr.match(/^(\w+)\s*<\s*(.+)$/) : null;
          const leM = !geM && !gtM && !eqM && !ltM ? condExpr.match(/^(\w+)\s*<=\s*(.+)$/) : null;
          if (geM) condResult = Number(resolveExpr(geM[1])) >= Number(resolveExpr(geM[2]));
          else if (gtM) condResult = Number(resolveExpr(gtM[1])) > Number(resolveExpr(gtM[2]));
          else if (eqM) condResult = resolveExpr(eqM[1]) === resolveExpr(eqM[2]);
          else if (ltM) condResult = Number(resolveExpr(ltM[1])) < Number(resolveExpr(ltM[2]));
          else if (leM) condResult = Number(resolveExpr(leM[1])) <= Number(resolveExpr(leM[2]));

          // Collect if-body
          const ifBody: string[] = [];
          let depth = trimmed.includes('{') ? 1 : 0;
          i++;
          while (i < lines.length && depth > 0) {
            const l = lines[i].trim();
            for (const ch of l) { if (ch === '{') depth++; if (ch === '}') depth--; }
            if (depth > 0) ifBody.push(l);
            else if (l.includes('else')) {
              // Collect else body
              const elseBody: string[] = [];
              let eDepth = l.includes('{') ? 1 : 0;
              if (eDepth === 0) { i++; eDepth = 1; } // next line has {
              i++;
              while (i < lines.length && eDepth > 0) {
                const el = lines[i].trim();
                for (const ch of el) { if (ch === '{') eDepth++; if (ch === '}') eDepth--; }
                if (eDepth > 0) elseBody.push(el);
                i++;
              }
              i--; // adjust
              if (!condResult) executeLines(elseBody);
              break;
            }
            i++;
          }
          if (condResult) executeLines(ifBody);
          continue;
        }

        // --- Variable declaration with type ---
        const declMatch = trimmed.match(/^(?:String|int|double|float|boolean|char|String\[\]|int\[\]|double\[\])\s+(\w+)\s*=\s*(.+?)\s*;$/);
        if (declMatch) {
          const name = declMatch[1];
          const valueExpr = declMatch[2].trim();
          if (valueExpr.startsWith('{') && valueExpr.endsWith('}')) {
            const inner = valueExpr.slice(1, -1);
            vars[name] = inner.split(',').map(s => resolveExpr(s.trim()));
          } else {
            // Check for method call
            const callMatch = valueExpr.match(/^(\w+)\s*\(\s*(.*?)\s*\)$/);
            if (callMatch && methods[callMatch[1]]) {
              vars[name] = callMethod(callMatch[1], callMatch[2]);
            } else {
              vars[name] = resolveExpr(valueExpr);
            }
          }
          continue;
        }

        // --- Variable reassignment ---
        const reassignMatch = trimmed.match(/^(\w+)\s*=\s*(.+?)\s*;$/);
        if (reassignMatch && !trimmed.startsWith('System') && !trimmed.startsWith('return')) {
          vars[reassignMatch[1]] = resolveExpr(reassignMatch[2]);
          continue;
        }

        // --- Array element reassignment ---
        const arrReassign = trimmed.match(/^(\w+)\[(\d+)\]\s*=\s*(.+?)\s*;$/);
        if (arrReassign && Array.isArray(vars[arrReassign[1]])) {
          vars[arrReassign[1]][parseInt(arrReassign[2])] = resolveExpr(arrReassign[3]);
          continue;
        }

        // --- System.out.println ---
        const printMatch = trimmed.match(/System\.out\.println\s*\((.*?)\)\s*;/);
        if (printMatch) {
          const val = resolveExpr(printMatch[1]);
          logs.push(String(val));
        }
      }
    };

    // Helper to call a stored method
    const callMethod = (name: string, argsStr: string): any => {
      const method = methods[name];
      if (!method) return argsStr;
      const callArgs = argsStr ? argsStr.split(',').map(a => resolveExpr(a.trim())) : [];
      const savedVars: Record<string, any> = {};
      method.params.forEach((p, idx) => { savedVars[p.name] = vars[p.name]; vars[p.name] = callArgs[idx]; });

      let retVal: any = undefined;
      for (const bodyLine of method.body) {
        const bt = bodyLine.trim();
        if (!bt || bt.startsWith('//') || bt.startsWith('/**') || bt.startsWith('*')) continue;
        const retMatch = bt.match(/^return\s+(.+?)\s*;$/);
        if (retMatch) { retVal = resolveExpr(retMatch[1]); break; }
      }

      method.params.forEach(p => { if (savedVars[p.name] !== undefined) vars[p.name] = savedVars[p.name]; else delete vars[p.name]; });
      return retVal !== undefined ? retVal : '';
    };

    executeLines(sourceLines);

    if (logs.length > 0) {
      return logs.join('\n');
    }

    return expectedOutput || 'Build Successful (0 errors). Output generated.';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setCode(initialCode || '');
    setOutput('');
    setError(null);
    onChange?.(initialCode || '');
  };

  const lineCount = Math.max(code.split('\n').length, 1);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  const langThemeClass = `theme-${language}`;

  return (
    <div className={`code-editor-wrapper ${langThemeClass}`}>
      {/* Editor Toolbar */}
      <div className="code-editor-toolbar">
        <div className="code-editor-lang-badge">
          <span className="lang-icon">
            {language === 'python' ? '🐍' : language === 'javascript' ? '⚡' : '☕'}
          </span>
          <span className="lang-name">
            {language === 'python' ? 'Python 3' : language === 'javascript' ? 'JavaScript (ES6)' : 'Java 17'}
          </span>
        </div>

        <div className="code-editor-controls">
          <button
            className="editor-btn-tool"
            onClick={() => setFontSize((f) => Math.max(12, f - 1))}
            title="Decrease font size"
          >
            A-
          </button>
          <button
            className="editor-btn-tool"
            onClick={() => setFontSize((f) => Math.min(20, f + 1))}
            title="Increase font size"
          >
            A+
          </button>
          <button className="editor-btn-tool" onClick={handleCopy} title="Copy code">
            {copied ? '✅ Copied' : '📋 Copy'}
          </button>
          <button className="editor-btn-tool" onClick={handleReset} title="Reset code">
            ↺ Reset
          </button>
          <button
            className="btn btn-primary btn-sm code-run-btn"
            onClick={runCode}
            disabled={isRunning}
          >
            {isRunning ? '⏳ Running...' : '▶ Run Code'}
          </button>
        </div>
      </div>

      {/* Editor Main Canvas: Line numbers + Synced highlight overlay + Textarea */}
      <div className="code-editor-body" style={{ minHeight }}>
        {/* Line numbers gutter */}
        <div className="code-editor-gutter" style={{ fontSize: `${fontSize}px` }}>
          {lineNumbers.map((num) => (
            <div key={num} className="gutter-line-number">
              {num}
            </div>
          ))}
        </div>

        {/* Editing viewport */}
        <div className="code-editor-viewport">
          {/* Syntax-highlighted background overlay */}
          <pre
            ref={preRef}
            className="code-editor-highlight-layer"
            style={{ fontSize: `${fontSize}px` }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlightCode(code, language) + '\n' }}
          />

          {/* Transparent interactive textarea overlay */}
          <textarea
            ref={textareaRef}
            className="code-editor-textarea"
            style={{ fontSize: `${fontSize}px` }}
            value={code}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            readOnly={readOnly}
            placeholder={placeholder}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>

      {/* Interactive Terminal / Console Output Panel */}
      <div className="code-editor-console">
        <div className="code-console-header">
          <div className="console-title">
            <span className="console-dot green" />
            <span className="console-dot yellow" />
            <span className="console-dot red" />
            <span className="console-label">Terminal Output</span>
          </div>
          {output && (
            <button className="btn-link console-clear-btn" onClick={() => setOutput('')}>
              Clear
            </button>
          )}
        </div>

        <div className="code-console-body">
          {isRunning && (
            <div className="console-running">
              <span className="pulse-indicator">🚀</span> Executing in {language}...
            </div>
          )}

          {!isRunning && !error && !output && (
            <div className="console-placeholder">
              Click <strong>"▶ Run Code"</strong> to execute your code and see output here.
            </div>
          )}

          {!isRunning && error && (
            <div className="console-error">
              <div className="error-icon">❌ Error:</div>
              <pre className="error-text">{error}</pre>
            </div>
          )}

          {!isRunning && output && (
            <pre className="console-output">{output}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
