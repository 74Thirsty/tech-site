"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
  title: string;
  id: string;
}

export default function MermaidDiagram({ chart, title, id }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function render() {
      if (!containerRef.current) return;

      try {
        const mermaid = (await import("mermaid")).default;
        if (!mounted) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#1a1a14",
            primaryTextColor: "#e9e8e2",
            primaryBorderColor: "#30302b",
            lineColor: "#d4f34a",
            secondaryColor: "#1a1a14",
            tertiaryColor: "#11110f",
            edgeLabelBackground: "#1a1a14",
            nodeBorder: "#30302b",
            clusterBkg: "#1a1a14",
            titleColor: "#d4f34a",
          },
          flowchart: { curve: "basis", padding: 20 },
          sequence: { mirrorActors: false, messageAlign: "center" },
        });

        containerRef.current.innerHTML = "";
        const { svg } = await mermaid.render(`mermaid-${id}-${Date.now()}`, chart);
        if (containerRef.current && mounted) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error("Mermaid render failed:", err);
        if (mounted) setError(true);
      }
    }

    render();
    return () => {
      mounted = false;
    };
  }, [chart, id]);

  if (error) {
    return (
      <figure className="article-mermaid">
        <figcaption className="mermaid-title">{title}</figcaption>
        <div className="mermaid-container">
          <pre style={{ color: "#aaa9a2", fontSize: "12px" }}>{chart}</pre>
        </div>
      </figure>
    );
  }

  return (
    <figure className="article-mermaid">
      <figcaption className="mermaid-title">{title}</figcaption>
      <div ref={containerRef} className="mermaid-container" suppressHydrationWarning />
    </figure>
  );
}
