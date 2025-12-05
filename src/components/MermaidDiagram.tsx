import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
  },
});

interface MermaidDiagramProps {
  chart: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !chart) {
        setError('No chart data provided');
        return;
      }

      setError(null);

      try {
        // Sanitize chart string to fix backend generation issues
        let sanitizedChart = chart
          .replace(/classDef call /g, 'classDef callNode ')
          .replace(/:::call/g, ':::callNode')
          .replace(/classDef default /g, 'classDef defaultStyle ')
          .replace(/:::default/g, ':::defaultStyle');

        // Ensure diagram has a type prefix
        const trimmed = sanitizedChart.trim();
        const hasValidPrefix = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|quadrantChart|requirementDiagram|gitGraph|mindmap|timeline)/i.test(trimmed);
        
        if (!hasValidPrefix) {
          sanitizedChart = 'graph TD\n' + sanitizedChart;
        }

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, sanitizedChart);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err: any) {
        console.error('Mermaid rendering failed:', err);
        console.error('Chart content:', chart?.substring(0, 200));
        setError(err.message || 'Error rendering diagram');
      }
    };

    renderDiagram();
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-red-600 font-medium text-sm">⚠️ Error rendering diagram</span>
          <button 
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs text-blue-600 hover:underline"
          >
            {showRaw ? 'Hide' : 'Show'} raw code
          </button>
        </div>
        <p className="text-xs text-gray-600 mb-2">{error}</p>
        {showRaw && (
          <pre className="text-xs bg-gray-200 p-2 rounded overflow-x-auto max-h-40 text-gray-800">
            {chart}
          </pre>
        )}
      </div>
    );
  }

  return <div ref={containerRef} className="mermaid-container overflow-x-auto min-h-[50px]" />;
};
