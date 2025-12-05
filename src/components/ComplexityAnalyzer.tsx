import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { MermaidDiagram } from './MermaidDiagram';
import { Play, Loader2, Terminal, FileText, Activity, AlertCircle, CheckCircle, XCircle, Lightbulb, Upload } from 'lucide-react';
import { fetchEventSource } from '@microsoft/fetch-event-source';

// Helper function to safely convert any value to a displayable string
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(safeString).join(', ');
  if (typeof value === 'object') {
    if (value.message) return String(value.message);
    if (value.text) return String(value.text);
    if (value.name) return String(value.name);
    if (value.description) return String(value.description);
    if (value.value) return String(value.value);
    try { return JSON.stringify(value); } catch { return '[Object]'; }
  }
  return String(value);
};

// Agent icons and colors for the SSE logs
const AGENT_CONFIG: Record<string, { icon: string; color: string; name: string }> = {
  'parser': { icon: '📝', color: 'text-blue-400', name: 'Parser' },
  'analyzer': { icon: '🔍', color: 'text-purple-400', name: 'Analyzer' },
  'complexity': { icon: '📊', color: 'text-green-400', name: 'Complexity' },
  'validator': { icon: '✅', color: 'text-yellow-400', name: 'Validator' },
  'diagram': { icon: '📈', color: 'text-pink-400', name: 'Diagram' },
  'explainer': { icon: '💡', color: 'text-orange-400', name: 'Explainer' },
  'report': { icon: '📋', color: 'text-cyan-400', name: 'Report' },
  'pipeline': { icon: '⚙️', color: 'text-gray-400', name: 'Pipeline' },
};

const STATE_ICONS: Record<string, string> = {
  'started': '▶️',
  'running': '⚙️',
  'finished': '✅',
  'error': '❌',
  'skipped': '⏭️',
};

interface LogEntry {
  timestamp: Date;
  agent?: string;
  state?: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'agent';
  details?: string;
}

interface ComplexityMetric {
  big_o: string;
  omega?: string;
  theta?: string;
}

interface Artifact {
  artifact_type: string;
  content: string;
  metadata?: any;
}

interface CaseAnalysis {
  description: string;
  complexity: string;
}

interface DiagramData {
  type: string;
  name: string;
  description: string;
  mermaid: string;
  syntax_valid: boolean;
}

interface AnalysisReport {
  analysis_id: string;
  complexity_analysis: {
    complexity: {
      time: ComplexityMetric;
      space: ComplexityMetric;
    };
    cases?: {
      best?: CaseAnalysis;
      worst?: CaseAnalysis;
      average?: CaseAnalysis;
    };
    recurrence?: {
      relation: string;
      closed_form: string;
      solution_steps?: string[];
    };
  };
  explanation: string;
  artifacts?: {
    [key: string]: Artifact;
  };
  diagram?: {
    diagram?: DiagramData;
    diagrams?: DiagramData[];
  };
  validation?: {
    status: string;
    confidence: number;
    issues?: Array<{ severity: string; message: string }>;
  };
  hints?: Array<{ type: string; suggestion: string; details: string }>;
  spec?: { inputs: string[]; outputs: string[]; description: string };
  pseudocode_normalized?: string;
  invariant_or_rule?: string | { invariant: string };
}

const PREDEFINED_ALGORITHMS = [
  {
    name: "01. Búsqueda Lineal",
    code: `FUNCTION linearSearch(A, n, target)
BEGIN
    FOR i ← 1 TO n DO
        IF A[i] == target THEN
            RETURN i
        END
    END
    RETURN -1
END`
  },
  {
    name: "02. Suma de Array",
    code: `FUNCTION sumArray(A, n)
BEGIN
    sum ← 0
    FOR i ← 1 TO n DO
        sum ← sum + A[i]
    END
    RETURN sum
END`
  },
  {
    name: "03. BubbleSort",
    code: `FUNCTION bubbleSort(A, n)
BEGIN
    FOR i ← 1 TO n - 1 DO
        FOR j ← 1 TO n - i DO
            IF A[j] > A[j + 1] THEN
                temp ← A[j]
                A[j] ← A[j + 1]
                A[j + 1] ← temp
            END
        END
    END
    RETURN A
END`
  },
  {
    name: "04. InsertionSort",
    code: `FUNCTION insertionSort(A, n)
BEGIN
    FOR i ← 2 TO n DO
        key ← A[i]
        j ← i - 1
        WHILE j >= 1 AND A[j] > key DO
            A[j + 1] ← A[j]
            j ← j - 1
        END
        A[j + 1] ← key
    END
    RETURN A
END`
  },
  {
    name: "05. SelectionSort",
    code: `FUNCTION selectionSort(A, n)
BEGIN
    FOR i ← 1 TO n - 1 DO
        minIdx ← i
        FOR j ← i + 1 TO n DO
            IF A[j] < A[minIdx] THEN
                minIdx ← j
            END
        END
        temp ← A[i]
        A[i] ← A[minIdx]
        A[minIdx] ← temp
    END
    RETURN A
END`
  },
  {
    name: "06. Bucles Anidados Dependientes (Triangular)",
    code: `FUNCTION triangularSum(n)
BEGIN
    total ← 0
    FOR i ← 1 TO n DO
        FOR j ← 1 TO i DO
            total ← total + 1
        END
    END
    RETURN total
END`
  },
  {
    name: "07. Búsqueda Binaria",
    code: `FUNCTION binarySearch(A, n, target)
BEGIN
    left ← 1
    right ← n
    WHILE left <= right DO
        mid ← (left + right) / 2
        IF A[mid] == target THEN
            RETURN mid
        END
        IF A[mid] < target THEN
            left ← mid + 1
        ELSE
            right ← mid - 1
        END
    END
    RETURN -1
END`
  },
  {
    name: "08. Búsqueda Exponencial",
    code: `FUNCTION exponentialSearch(A, n, target)
BEGIN
    IF A[1] == target THEN
        RETURN 1
    END
    i ← 1
    WHILE i < n AND A[i] <= target DO
        i ← i * 2
    END
    RETURN binarySearch(A, min(i, n), target)
END`
  },
  {
    name: "09. MergeSort",
    code: `FUNCTION mergeSort(A, left, right)
BEGIN
    IF left < right THEN
        mid ← (left + right) / 2
        mergeSort(A, left, mid)
        mergeSort(A, mid + 1, right)
        merge(A, left, mid, right)
    END
    RETURN A
END

FUNCTION merge(A, left, mid, right)
BEGIN
    n1 ← mid - left + 1
    n2 ← right - mid
    FOR i ← 1 TO n1 DO
        L[i] ← A[left + i - 1]
    END
    FOR j ← 1 TO n2 DO
        R[j] ← A[mid + j]
    END
    i ← 1
    j ← 1
    k ← left
    WHILE i <= n1 AND j <= n2 DO
        IF L[i] <= R[j] THEN
            A[k] ← L[i]
            i ← i + 1
        ELSE
            A[k] ← R[j]
            j ← j + 1
        END
        k ← k + 1
    END
    RETURN A
END`
  },
  {
    name: "10. QuickSort",
    code: `FUNCTION quickSort(A, low, high)
BEGIN
    IF low < high THEN
        pivot ← partition(A, low, high)
        quickSort(A, low, pivot - 1)
        quickSort(A, pivot + 1, high)
    END
    RETURN A
END

FUNCTION partition(A, low, high)
BEGIN
    pivot ← A[high]
    i ← low - 1
    FOR j ← low TO high - 1 DO
        IF A[j] <= pivot THEN
            i ← i + 1
            temp ← A[i]
            A[i] ← A[j]
            A[j] ← temp
        END
    END
    temp ← A[i + 1]
    A[i + 1] ← A[high]
    A[high] ← temp
    RETURN i + 1
END`
  },
  {
    name: "11. Fibonacci Recursivo",
    code: `FUNCTION fibonacci(n)
BEGIN
    IF n <= 1 THEN
        RETURN n
    END
    RETURN fibonacci(n - 1) + fibonacci(n - 2)
END`
  },
  {
    name: "12. Factorial Recursivo",
    code: `FUNCTION factorial(n)
BEGIN
    IF n <= 1 THEN
        RETURN 1
    END
    RETURN n * factorial(n - 1)
END`
  },
  {
    name: "13. Fibonacci con DP",
    code: `FUNCTION fibonacciDP(n)
BEGIN
    LET F[0..n]
    F[0] ← 0
    F[1] ← 1
    FOR i ← 2 TO n DO
        F[i] ← F[i - 1] + F[i - 2]
    END
    RETURN F[n]
END`
  },
  {
    name: "14. BFS (Grafos)",
    code: `FUNCTION BFS(G, s, n)
BEGIN
    LET visited[1..n]
    LET queue[1..n]
    FOR i ← 1 TO n DO
        visited[i] ← FALSE
    END
    visited[s] ← TRUE
    enqueue(queue, s)
    WHILE NOT isEmpty(queue) DO
        u ← dequeue(queue)
        FOR EACH v IN adjacents(G, u) DO
            IF NOT visited[v] THEN
                visited[v] ← TRUE
                enqueue(queue, v)
            END
        END
    END
    RETURN visited
END`
  },
  {
    name: "15. DFS (Grafos)",
    code: `FUNCTION DFS(G, v, visited)
BEGIN
    visited[v] ← TRUE
    FOR EACH u IN adjacents(G, v) DO
        IF NOT visited[u] THEN
            DFS(G, u, visited)
        END
    END
    RETURN visited
END`
  },
  {
    name: "16. Multiplicación de Matrices",
    code: `FUNCTION matrixMultiply(A, B, n)
BEGIN
    LET C[1..n, 1..n]
    FOR i ← 1 TO n DO
        FOR j ← 1 TO n DO
            C[i, j] ← 0
            FOR k ← 1 TO n DO
                C[i, j] ← C[i, j] + A[i, k] * B[k, j]
            END
        END
    END
    RETURN C
END`
  },
];

const DEFAULT_CODE = PREDEFINED_ALGORITHMS[2].code;

export const ComplexityAnalyzer: React.FC = () => {
  const [inputCode, setInputCode] = useState(DEFAULT_CODE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'fetching_report' | 'complete' | 'error'>('idle');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const addLog = (entry: Omit<LogEntry, 'timestamp'>) => {
    setLogs(prev => [...prev, { ...entry, timestamp: new Date() }]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setInputCode(content);
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    if (!inputCode.trim()) return;

    setStatus('analyzing');
    setLogs([]);
    setReport(null);
    setErrorMsg(null);
    setCurrentAgent(null);

    try {
      // 1. Start Analysis
      addLog({ message: 'Iniciando análisis...', type: 'info' });
      
      const startResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inputCode }),
      });

      if (!startResponse.ok) {
        throw new Error(`Failed to start analysis: ${startResponse.statusText}`);
      }

      const { analysis_id } = await startResponse.json();
      addLog({ message: `Analysis ID: ${analysis_id}`, type: 'info' });

      // 2. Listen for Progress (SSE)
      let capturedReportUrl: string | null = null;
      
      await new Promise<void>((resolve, reject) => {
        const ctrl = new AbortController();
        
        fetchEventSource(`/api/status?analysis_id=${analysis_id}`, {
          method: 'GET',
          signal: ctrl.signal,
          
          onopen(response) {
            if (response.ok) {
              addLog({ message: 'Conectado al stream de progreso', type: 'success' });
              return Promise.resolve();
            } else {
              return Promise.reject(new Error(`Failed to connect to SSE: ${response.statusText}`));
            }
          },
          
          onmessage(msg) {
            try {
              // Skip empty messages
              if (!msg.data || msg.data.trim() === '') return;
              
              // Filter out source code that might leak into logs
              if (msg.data.includes('from typing import') || 
                  msg.data.includes('class ') && msg.data.includes('def ') ||
                  msg.data.includes('"""') ||
                  msg.data.length > 1000) {
                console.warn('Filtered large/code message from SSE');
                return;
              }

              const data = JSON.parse(msg.data);
              
              // Handle agent-based messages
              if (data.agent) {
                setCurrentAgent(data.agent);
                const agentConfig = AGENT_CONFIG[data.agent] || { icon: '📦', color: 'text-gray-400', name: data.agent };
                const stateIcon = STATE_ICONS[data.state] || '📋';
                
                let message = `${stateIcon} [${agentConfig.name}] ${data.state || 'processing'}`;
                if (data.summary) message += `: ${data.summary}`;
                
                let details = '';
                if (data.duration_ms) details += `Duración: ${data.duration_ms}ms`;
                if (data.complexity) details += ` | Complejidad: ${safeString(data.complexity)}`;
                
                addLog({
                  agent: data.agent,
                  state: data.state,
                  message,
                  type: data.state === 'error' ? 'error' : data.state === 'finished' ? 'success' : 'agent',
                  details: details || undefined
                });

                // Capture report URL
                if (data.artifacts?.json) {
                  if (data.agent === 'report') {
                    capturedReportUrl = data.artifacts.json;
                  } else if (!capturedReportUrl) {
                    capturedReportUrl = data.artifacts.json;
                  }
                }

                // Check for completion
                const isComplete = 
                  (data.agent === 'pipeline' && data.state === 'finished') ||
                  (data.agent === 'report' && data.state === 'finished');

                if (isComplete) {
                  setCurrentAgent(null);
                  ctrl.abort();
                  resolve();
                }
              } 
              // Handle status-based messages (legacy format)
              else if (data.status) {
                addLog({
                  message: `Status: ${data.status}`,
                  type: data.status === 'error' ? 'error' : 'info',
                  details: data.message
                });

                if (data.status === 'completed' || data.status === 'finished') {
                  ctrl.abort();
                  resolve();
                }
              }
              // Handle generic messages
              else if (data.message) {
                addLog({ message: data.message, type: 'info' });
              }
              // Handle progress updates
              else if (data.progress !== undefined) {
                addLog({ message: `Progreso: ${data.progress}%`, type: 'info' });
              }
              
            } catch (e) {
              // Plain text message
              const logMessage = msg.data?.trim();
              if (logMessage && logMessage.length < 500) {
                addLog({ message: logMessage, type: 'info' });
                
                if (logMessage.toLowerCase().includes('analysis complete') || 
                    logMessage.toLowerCase().includes('pipeline finished')) {
                  ctrl.abort();
                  resolve();
                }
              }
            }
          },
          
          onerror(err) {
            console.error("SSE Error:", err);
            addLog({ message: `Error de conexión: ${err}`, type: 'error' });
            ctrl.abort();
            reject(err);
          },
          
          onclose() {
            addLog({ message: 'Stream cerrado', type: 'info' });
            resolve();
          }
        });
      });

      // 3. Get Final Report
      setStatus('fetching_report');
      addLog({ message: 'Obteniendo reporte final...', type: 'info' });

      const finalReportUrl = capturedReportUrl || `/api/analysis/${analysis_id}/agent/report/json`;
      const reportResponse = await fetch(finalReportUrl);
      
      if (!reportResponse.ok) {
        console.warn("Failed to fetch artifact report, trying default endpoint...");
        const fallbackResponse = await fetch(`/api/report/${analysis_id}`);
        if (!fallbackResponse.ok) {
           throw new Error(`Failed to fetch report: ${reportResponse.statusText}`);
        }
        const fallbackData = await fallbackResponse.json();
        setReport(fallbackData);
      } else {
        const reportData = await reportResponse.json();
        
        const finalReport = reportData.data || reportData.report || reportData;
        const complexityData = finalReport.complexity_analysis || finalReport;

        const formattedReport: AnalysisReport = {
            analysis_id: reportData.analysis_id || analysis_id,
            complexity_analysis: {
                complexity: complexityData.complexity || finalReport.complexity,
                cases: complexityData.cases || finalReport.cases,
                recurrence: complexityData.recurrence || finalReport.recurrence
            },
            explanation: finalReport.explanation,
            artifacts: finalReport.artifacts,
            validation: finalReport.validation,
            hints: finalReport.hints,
            spec: finalReport.spec,
            pseudocode_normalized: finalReport.pseudocode_normalized,
            invariant_or_rule: finalReport.invariant_or_rule
        };
        
        setReport(formattedReport);
      }

      setStatus('complete');
      addLog({ message: '✅ Análisis completado exitosamente!', type: 'success' });

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'An unexpected error occurred');
      addLog({ message: `❌ Error: ${err.message}`, type: 'error' });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Algorithmic Complexity Analyzer
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {status === 'analyzing' && currentAgent && (
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full">
              <span className="text-lg">{AGENT_CONFIG[currentAgent]?.icon || '⚙️'}</span>
              <span className={`text-sm ${AGENT_CONFIG[currentAgent]?.color || 'text-gray-400'}`}>
                {AGENT_CONFIG[currentAgent]?.name || currentAgent}
              </span>
              <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
            </div>
          )}
          {status === 'analyzing' && !currentAgent && (
            <span className="flex items-center gap-2 text-sm text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Iniciando...
            </span>
          )}
          {status === 'fetching_report' && (
            <span className="flex items-center gap-2 text-sm text-purple-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Generando Reporte...
            </span>
          )}
          {status === 'complete' && (
            <span className="flex items-center gap-2 text-sm text-green-400 font-medium">
              <CheckCircle className="w-4 h-4" /> Análisis Completo
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-2 text-sm text-red-400 font-medium">
              <XCircle className="w-4 h-4" /> Error
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: Input & Logs */}
        <div className="w-1/3 flex flex-col border-r border-gray-800 bg-gray-900/50">
          {/* Code Input */}
          <div className="flex-1 flex flex-col p-4 min-h-0">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Source Code
              </label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Upload className="w-3 h-3" /> Upload File
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".txt,.py,.js,.ts,.cpp,.java,.c,.h"
              />
            </div>
            <select
              className="mb-2 bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              onChange={(e) => {
                const selected = PREDEFINED_ALGORITHMS.find(a => a.name === e.target.value);
                if (selected) setInputCode(selected.code);
              }}
              defaultValue={PREDEFINED_ALGORITHMS[2].name}
            >
              {PREDEFINED_ALGORITHMS.map(algo => (
                <option key={algo.name} value={algo.name}>{algo.name}</option>
              ))}
            </select>
            <textarea
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Paste your algorithm here..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              spellCheck={false}
            />
            <button
              onClick={handleAnalyze}
              disabled={status === 'analyzing' || status === 'fetching_report' || !inputCode.trim()}
              className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
            >
              {status === 'analyzing' || status === 'fetching_report' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              {status === 'analyzing' ? 'Processing...' : 'Analyze Complexity'}
            </button>
          </div>

          {/* Logs Console */}
          <div className="h-1/3 border-t border-gray-800 bg-black p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-3 h-3" /> System Logs
              </label>
              {currentAgent && (
                <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded-full animate-pulse">
                  {AGENT_CONFIG[currentAgent]?.icon} {AGENT_CONFIG[currentAgent]?.name || currentAgent}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {logs.length === 0 && <span className="text-gray-600 italic">Listo para analizar...</span>}
              {logs.map((log, i) => {
                const timeStr = log.timestamp.toLocaleTimeString();
                const typeColors = {
                  info: 'text-gray-400',
                  success: 'text-green-400',
                  error: 'text-red-400',
                  warning: 'text-yellow-400',
                  agent: log.agent ? (AGENT_CONFIG[log.agent]?.color || 'text-gray-400') : 'text-gray-400'
                };
                
                return (
                  <div key={i} className={`break-words ${typeColors[log.type]}`}>
                    <span className="text-gray-600 mr-2">[{timeStr}]</span>
                    <span>{log.message}</span>
                    {log.details && (
                      <span className="text-gray-500 ml-2 text-[10px]">({log.details})</span>
                    )}
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="flex-1 flex flex-col bg-gray-950 overflow-hidden">
          {report ? (
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Validation Status Banner */}
              <div className="flex items-center justify-between bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center gap-3">
                  {report.validation?.status?.toUpperCase() === 'APPROVED' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : report.validation?.status?.toUpperCase() === 'WEAK' ? (
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                  ) : report.validation?.status?.toUpperCase() === 'REJECTED' ? (
                    <XCircle className="w-5 h-5 text-red-400" />
                  ) : (
                    <Activity className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <h3 className={`font-bold ${
                      report.validation?.status?.toUpperCase() === 'APPROVED' ? 'text-green-400' :
                      report.validation?.status?.toUpperCase() === 'WEAK' ? 'text-yellow-400' :
                      report.validation?.status?.toUpperCase() === 'REJECTED' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      Analysis Status: {report.validation?.status || 'UNKNOWN'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Confidence: {report.validation?.confidence ? `${(report.validation.confidence * 100).toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>
                </div>
                {report.validation?.issues && report.validation.issues.length > 0 && (
                  <div className="text-xs text-gray-400 text-right">
                    {report.validation.issues.length} issues found
                  </div>
                )}
              </div>

              {/* Complexity Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-xl">
                  <h2 className="text-lg font-semibold text-gray-300 mb-2">Time Complexity</h2>
                  <div className="text-4xl font-bold text-white bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent inline-block">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {report.complexity_analysis?.complexity?.time?.theta 
                        ? `$${report.complexity_analysis.complexity.time.theta}$` 
                        : `$${report.complexity_analysis?.complexity?.time?.big_o || "O(?)"}$`}
                    </ReactMarkdown>
                  </div>
                  {report.complexity_analysis?.cases && (
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-gray-400 border-t border-gray-800 pt-4">
                      <div>
                        <span className="block font-semibold text-gray-500">Best</span>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {`$${report.complexity_analysis.cases.best?.complexity || '-'}$`}
                        </ReactMarkdown>
                      </div>
                      <div>
                        <span className="block font-semibold text-gray-500">Avg</span>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {`$${report.complexity_analysis.cases.average?.complexity || '-'}$`}
                        </ReactMarkdown>
                      </div>
                      <div>
                        <span className="block font-semibold text-gray-500">Worst</span>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {`$${report.complexity_analysis.cases.worst?.complexity || '-'}$`}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-xl">
                  <h2 className="text-lg font-semibold text-gray-300 mb-2">Space Complexity</h2>
                  <div className="text-4xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent inline-block">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {report.complexity_analysis?.complexity?.space?.big_o 
                        ? `$${report.complexity_analysis.complexity.space.big_o}$` 
                        : "O(?)"}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* Recurrence & Math Breakdown */}
              {report.complexity_analysis?.recurrence && (
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-xl">
                  <h2 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-800 pb-2">Mathematical Derivation</h2>
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-500 uppercase tracking-wider font-bold">Recurrence Relation</span>
                      <div className="text-xl text-blue-300 mt-1">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {`$${report.complexity_analysis.recurrence.relation}$`}
                        </ReactMarkdown>
                      </div>
                    </div>
                    {report.complexity_analysis.recurrence.solution_steps && (
                      <div>
                        <span className="text-sm text-gray-500 uppercase tracking-wider font-bold">Solution Steps</span>
                        <ul className="list-decimal list-inside mt-2 space-y-1 text-gray-400 text-sm">
                          {Array.isArray(report.complexity_analysis.recurrence.solution_steps) 
                            ? report.complexity_analysis.recurrence.solution_steps.map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))
                            : String(report.complexity_analysis.recurrence.solution_steps).split('\n').map((step, idx) => (
                                <li key={idx}>{step.replace(/^- /, '')}</li>
                              ))
                          }
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-xl">
                <h2 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-800 pb-2">Analysis Report</h2>
                
                {report.invariant_or_rule && (
                  <div className="mb-6 bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                    <h3 className="text-blue-400 font-bold text-sm uppercase mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" /> Invariant / Key Rule
                    </h3>
                    <p className="text-gray-300 text-sm italic">
                      {typeof report.invariant_or_rule === 'string' ? report.invariant_or_rule : report.invariant_or_rule.invariant}
                    </p>
                  </div>
                )}

                <div className="prose prose-invert max-w-none prose-p:text-gray-400 prose-headings:text-gray-200 prose-code:text-blue-300 prose-code:bg-blue-900/30 prose-code:px-1 prose-code:rounded">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {report.explanation}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Hints & Issues */}
              {report.hints && report.hints.length > 0 && (
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-xl">
                  <h2 className="text-lg font-semibold text-yellow-400 mb-4 border-b border-gray-800 pb-2 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" /> Suggestions for Improvement
                  </h2>
                  <div className="grid gap-4">
                    {report.hints.map((hint, idx) => (
                      <div key={idx} className="bg-yellow-900/10 border border-yellow-900/30 rounded-lg p-4">
                        <h4 className="font-bold text-yellow-200 text-sm mb-1">{hint.suggestion}</h4>
                        <p className="text-gray-400 text-sm">{hint.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagrams Section */}
              {report.diagram && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Diagramas
                  </h2>
                  
                  {/* Main Diagram */}
                  {report.diagram.diagram?.mermaid && report.diagram.diagram?.syntax_valid && (
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-300">
                            {report.diagram.diagram.name || 'Diagrama Principal'}
                          </h3>
                          <p className="text-sm text-gray-500">{report.diagram.diagram.description}</p>
                        </div>
                        <span className="px-2 py-1 text-xs rounded bg-blue-900 text-blue-300">
                          {report.diagram.diagram.type}
                        </span>
                      </div>
                      <div className="overflow-x-auto bg-white rounded-lg p-4">
                        <MermaidDiagram chart={report.diagram.diagram.mermaid} />
                      </div>
                    </div>
                  )}

                  {/* Additional Diagrams from diagrams array */}
                  {report.diagram.diagrams && report.diagram.diagrams.length > 0 && (
                    <div className="grid grid-cols-1 gap-6">
                      {report.diagram.diagrams.map((diag: any, index: number) => (
                        diag.syntax_valid && diag.mermaid && (
                          <div key={index} className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-300">
                                  {diag.name || `Diagrama ${index + 1}`}
                                </h3>
                                <p className="text-sm text-gray-500">{diag.description}</p>
                              </div>
                              <span className={`px-2 py-1 text-xs rounded ${
                                diag.type === 'recursion_tree' ? 'bg-green-900 text-green-300' :
                                diag.type === 'flowchart' ? 'bg-purple-900 text-purple-300' :
                                diag.type === 'call_tree' ? 'bg-orange-900 text-orange-300' :
                                'bg-gray-700 text-gray-300'
                              }`}>
                                {diag.type}
                              </span>
                            </div>
                            <div className="overflow-x-auto bg-white rounded-lg p-4">
                              <MermaidDiagram chart={diag.mermaid} />
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Legacy artifacts support */}
              {report.artifacts && Object.entries(report.artifacts).map(([key, artifact]: [string, any]) => (
                artifact.artifact_type === 'mermaid' && (
                  <div key={key} className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-xl">
                    <h2 className="text-lg font-semibold text-gray-300 mb-4 capitalize">{key.replace(/_/g, ' ')}</h2>
                    <div className="overflow-x-auto bg-white rounded-lg p-4">
                      <MermaidDiagram chart={artifact.content} />
                    </div>
                  </div>
                )
              ))}

              {/* Normalized Pseudocode */}
              {report.pseudocode_normalized && (
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-xl">
                  <h2 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-800 pb-2">Normalized Pseudocode</h2>
                  <pre className="bg-black rounded-lg p-4 overflow-x-auto text-sm font-mono text-green-400">
                    {report.pseudocode_normalized}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600 p-8 text-center">
              {status === 'error' ? (
                <div className="flex flex-col items-center gap-4 text-red-400">
                  <AlertCircle className="w-16 h-16 opacity-50" />
                  <p className="text-lg font-medium">{errorMsg}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Activity className="w-16 h-16 opacity-20" />
                  <p className="text-lg">Enter your code and start the analysis to see the results.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
