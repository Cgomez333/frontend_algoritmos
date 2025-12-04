import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { MermaidDiagram } from './MermaidDiagram';
import { Play, Square, Loader2, Trash2, RefreshCw } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

export const LangGraphViewer: React.FC = () => {
  const [inputCode, setInputCode] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [markdownContent, setMarkdownContent] = useState('');
  const [diagramCode, setDiagramCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'streaming' | 'complete' | 'error'>('idle');

  const handleAnalyze = async () => {
    if (!inputCode.trim()) return;

    setStatus('processing');
    setLogs([]);
    setMarkdownContent('');
    setDiagramCode('');

    try {
      // In a real app, this would be your backend URL
      // const response = await fetch('http://127.0.0.1:5000/api/analizar', {
      //   method: 'POST',
      //   body: JSON.stringify({ code: inputCode }),
      //   headers: { 'Content-Type': 'application/json' }
      // });

      // Mocking the response for demonstration
      setStatus('streaming');
      addLog('Starting analysis...');
      
      // Simulate streaming delay
      setTimeout(() => {
        addLog('Parser started...');
        setMarkdownContent('**Analysis Started**\n\nAnalyzing your code structure...');
      }, 500);

      setTimeout(() => {
        addLog('Detected pattern: Recursive loop');
        setMarkdownContent((prev) => prev + '\n\n- Detected recursive loop in function `factorial`.\n- Checking base case...');
      }, 1500);

      setTimeout(() => {
        addLog('Generating diagram...');
        setDiagramCode(`graph TD
    A[Start] --> B{Is n <= 1?}
    B -- Yes --> C[Return 1]
    B -- No --> D[Return n * factorial(n-1)]
    D --> B`);
        setMarkdownContent((prev) => prev + '\n\n### Flow Diagram Generated\nSee the visualization below.');
        setStatus('complete');
        addLog('Analysis complete.');
      }, 3000);

      // Real SSE implementation would look like this:
      /*
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error('No reader available');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        // Parse chunk and update state
        // ...
      }
      */

    } catch (error) {
      console.error(error);
      setStatus('error');
      addLog('Error occurred during analysis.', 'error');
    }
  };

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString(), message, type }]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white p-6 gap-6">
      <header className="flex justify-between items-center border-b border-gray-700 pb-4">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          LangGraph Explorer
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setStatus('idle');
              setLogs([]);
              setMarkdownContent('');
              setDiagramCode('');
              setInputCode('');
            }}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Reset"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            status === 'idle' ? 'bg-gray-700 text-gray-300' :
            status === 'processing' || status === 'streaming' ? 'bg-blue-900 text-blue-200 animate-pulse' :
            status === 'complete' ? 'bg-green-900 text-green-200' :
            'bg-red-900 text-red-200'
          }`}>
            {status.toUpperCase()}
          </span>
        </div>
      </header>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left Panel: Input & Logs */}
        <div className="w-1/3 flex flex-col gap-4">
          <div className="flex-1 flex flex-col bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-3 bg-gray-750 border-b border-gray-700 font-medium text-sm text-gray-400">
              Input Code
            </div>
            <textarea
              className="flex-1 bg-gray-900 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Paste your code here..."
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
            />
            <div className="p-3 border-t border-gray-700 bg-gray-800">
              <button
                onClick={handleAnalyze}
                disabled={status === 'processing' || status === 'streaming'}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {status === 'processing' || status === 'streaming' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <><Play className="w-4 h-4" /> Analyze Agent</>
                )}
              </button>
            </div>
          </div>

          <div className="h-1/3 bg-gray-800 rounded-xl border border-gray-700 flex flex-col overflow-hidden">
            <div className="p-3 bg-gray-750 border-b border-gray-700 font-medium text-sm text-gray-400 flex justify-between items-center">
              <span>Live Logs</span>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">SSE Stream</span>
                <button 
                  onClick={() => setLogs([])}
                  className="text-gray-500 hover:text-white transition-colors"
                  title="Clear Logs"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-gray-500">[{log.timestamp}]</span>
                  <span className={
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    'text-blue-300'
                  }>{log.message}</span>
                </div>
              ))}
              {logs.length === 0 && <span className="text-gray-600 italic">Waiting for events...</span>}
            </div>
          </div>
        </div>

        {/* Right Panel: Visualization */}
        <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 flex flex-col overflow-hidden">
          <div className="p-3 bg-gray-750 border-b border-gray-700 font-medium text-sm text-gray-400">
            Agent Output
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Markdown Section */}
            {markdownContent && (
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{markdownContent}</ReactMarkdown>
              </div>
            )}

            {/* Diagram Section */}
            {diagramCode && (
              <div className="bg-white rounded-lg p-4 shadow-lg">
                <h3 className="text-gray-800 font-bold mb-2 text-sm uppercase tracking-wider">Flow Visualization</h3>
                <MermaidDiagram chart={diagramCode} />
              </div>
            )}

            {!markdownContent && !diagramCode && (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                <Square className="w-12 h-12 opacity-20" />
                <p>Run an analysis to see the agent's output here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
