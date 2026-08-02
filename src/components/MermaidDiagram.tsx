"use client";

import { useEffect, useRef } from "react";

interface MermaidDiagramProps {
  chart: string;
  title: string;
  id: string;
}

export default function MermaidDiagram({ chart, title, id }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    async function render() {
      if (!containerRef.current) return;
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

      const { svg } = await mermaid.render(`mermaid-${id}`, chart);
      if (containerRef.current && mounted) {
        containerRef.current.innerHTML = svg;
      }
    }

    render();
    return () => { mounted = false; };
  }, [chart, id]);

  return (
    <figure className="article-mermaid">
      <figcaption className="mermaid-title">{title}</figcaption>
      <div ref={containerRef} className="mermaid-container" />
    </figure>
  );
}
