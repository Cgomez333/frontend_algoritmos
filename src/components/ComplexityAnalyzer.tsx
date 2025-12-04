import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { MermaidDiagram } from './MermaidDiagram';
import { Play, Loader2, Terminal, FileText, Activity, AlertCircle, CheckCircle, AlertTriangle, XCircle, Lightbulb } from 'lucide-react';
import { fetchEventSource } from '@microsoft/fetch-event-source';

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
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'fetching_report' | 'complete' | 'error'>('idle');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const handleAnalyze = async () => {
    if (!inputCode.trim()) return;

    setStatus('analyzing');
    setLogs([]);
    setReport(null);
    setErrorMsg(null);

    try {
      // 1. Start Analysis
      const startResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inputCode }),
      });

      if (!startResponse.ok) {
        throw new Error(`Failed to start analysis: ${startResponse.statusText}`);
      }

      const { analysis_id } = await startResponse.json();
      setLogs(prev => [...prev, `Analysis started. ID: ${analysis_id}`]);

      // 2. Listen for Progress (SSE)
      let capturedReportUrl: string | null = null;
      await new Promise<void>((resolve, reject) => {
        const ctrl = new AbortController();
        
        fetchEventSource(`/api/status?analysis_id=${analysis_id}`, {
          method: 'GET',
          signal: ctrl.signal,
          onopen(response) {
            if (response.ok) {
              return Promise.resolve();
            } else {
              return Promise.reject(new Error(`Failed to connect to SSE: ${response.statusText}`));
            }
          },
          onmessage(msg) {
            try {
              const data = JSON.parse(msg.data);
              
              // Format log message nicely
              let displayMsg = "";
              if (data.agent && data.state) {
                  displayMsg = `[${data.agent}] ${data.state}`;
                  if (data.summary) displayMsg += `: ${data.summary}`;
              } else {
                  displayMsg = typeof data === 'object' ? (data.message || data.status || JSON.stringify(data)) : String(data);
              }
              
              setLogs(prev => [...prev, `> ${displayMsg}`]);

              // Capture report URL if available (prefer report agent's artifact)
              if (data.artifacts && data.artifacts.json) {
                // If it's the report agent, this is definitely the one we want
                if (data.agent === 'report') {
                    capturedReportUrl = data.artifacts.json;
                } else if (!capturedReportUrl) {
                    // Keep other artifacts as backup if we haven't found the main one yet
                    capturedReportUrl = data.artifacts.json;
                }
              }

              // Strict completion check:
              // 1. Pipeline finished
              // 2. Report agent finished
              // 3. Explicit "completed" status (legacy)
              const isPipelineFinished = data.agent === 'pipeline' && data.state === 'finished';
              const isReportFinished = data.agent === 'report' && data.state === 'finished';
              const isLegacyCompleted = data.status === 'completed' || data.status === 'finished';

              if (isPipelineFinished || isReportFinished || isLegacyCompleted) {
                ctrl.abort();
                resolve();
              }
            } catch (e) {
              const logMessage = msg.data;
              setLogs(prev => [...prev, `> ${logMessage}`]);

              // Only abort on plain text if it explicitly says "Analysis complete" or similar specific phrase
              // Avoid generic "finished" which might appear in normal log text
              if (logMessage.toLowerCase().includes('analysis complete') || logMessage.toLowerCase().includes('pipeline finished')) {
                ctrl.abort();
                resolve();
              }
            }
          },
          onerror(err) {
            console.error("SSE Error:", err);
            ctrl.abort();
            reject(err);
          },
          onclose() {
             resolve();
          }
        });
      });

      // 3. Get Final Report
      setStatus('fetching_report');
      setLogs(prev => [...prev, 'Fetching final report...']);

      // Use captured URL or fallback to constructed URL
      const finalReportUrl = capturedReportUrl || `/api/analysis/${analysis_id}/agent/report/json`;
      const reportResponse = await fetch(finalReportUrl);
      
      if (!reportResponse.ok) {
        // Fallback to the old endpoint if the artifact one fails
        console.warn("Failed to fetch artifact report, trying default endpoint...");
        const fallbackResponse = await fetch(`/api/report/${analysis_id}`);
        if (!fallbackResponse.ok) {
           throw new Error(`Failed to fetch report: ${reportResponse.statusText}`);
        }
        const fallbackData = await fallbackResponse.json();
        setReport(fallbackData); // Assuming fallback has the old structure? Or maybe it's just empty.
      } else {
        const reportData = await reportResponse.json();
        
        // Handle different response structures
        // 1. reportData.data (standard API wrapper)
        // 2. reportData.report (LangSmith/Agent artifact structure)
        // 3. reportData (direct object)
        const finalReport = reportData.data || reportData.report || reportData;

        // Handle complexity_analysis structure variations
        // Sometimes it's nested in complexity_analysis, sometimes direct
        const complexityData = finalReport.complexity_analysis || finalReport;

        // Map to expected structure
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
      setLogs(prev => [...prev, 'Analysis complete!']);

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'An unexpected error occurred');
      setLogs(prev => [...prev, `Error: ${err.message}`]);
    }
  };

  const getValidationColor = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return 'text-green-400';
      case 'WEAK': return 'text-yellow-400';
      case 'REJECTED': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getValidationIcon = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'WEAK': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'REJECTED': return <XCircle className="w-5 h-5 text-red-400" />;
      default: return <Activity className="w-5 h-5 text-gray-400" />;
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
        <div className="flex items-center gap-2">
          {status === 'analyzing' && <span className="flex items-center gap-2 text-sm text-blue-400"><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</span>}
          {status === 'fetching_report' && <span className="flex items-center gap-2 text-sm text-purple-400"><Loader2 className="w-4 h-4 animate-spin" /> Generating Report...</span>}
          {status === 'complete' && <span className="text-sm text-green-400 font-medium">Analysis Complete</span>}
          {status === 'error' && <span className="text-sm text-red-400 font-medium">Error</span>}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: Input & Logs */}
        <div className="w-1/3 flex flex-col border-r border-gray-800 bg-gray-900/50">
          {/* Code Input */}
          <div className="flex-1 flex flex-col p-4 min-h-0">
            <label className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Source Code
            </label>
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
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Terminal className="w-3 h-3" /> System Logs
            </label>
            <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {logs.length === 0 && <span className="text-gray-600 italic">Ready to analyze...</span>}
              {logs.map((log, i) => (
                <div key={i} className="text-gray-400 break-words">
                  <span className="text-gray-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                  {log}
                </div>
              ))}
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
                  {getValidationIcon(report.validation?.status)}
                  <div>
                    <h3 className={`font-bold ${getValidationColor(report.validation?.status)}`}>
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

              {/* Diagrams */}
              {report.artifacts && Object.entries(report.artifacts).map(([key, artifact]) => (
                artifact.artifact_type === 'mermaid' && (
                  <div key={key} className="bg-white rounded-xl p-6 border border-gray-200 shadow-xl">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 capitalize">{key.replace(/_/g, ' ')}</h2>
                    <div className="overflow-x-auto">
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
