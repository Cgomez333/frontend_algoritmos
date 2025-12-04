import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

interface MermaidDiagramProps {
  chart: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && chart) {
      // Sanitize chart string to fix backend generation issues
      // Fix: 'call' is a reserved keyword in Mermaid, but backend uses it as a class name
      const sanitizedChart = chart
        .replace(/classDef call /g, 'classDef callNode ') // Fix definition
        .replace(/:::call/g, ':::callNode');              // Fix usage

      mermaid.render(`mermaid-${Date.now()}`, sanitizedChart).then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      }).catch((error) => {
        console.error('Mermaid rendering failed:', error);
        if (containerRef.current) {
            containerRef.current.innerHTML = `<div class="text-red-500">Error rendering diagram</div>`;
        }
      });
    }
  }, [chart]);

  return <div ref={containerRef} className="mermaid-container overflow-x-auto" />;
};
