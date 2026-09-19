import { useState, useEffect, useRef } from "react";
import AppShell from "../components/AppShell";
import { getNetworkGraph } from "../api/collaborations";
import { useToast } from "../components/ToastContext";
import "./NetworkGraph.css";

const COLOR_PALETTE = [
  "#4f7fff", "#7c3aed", "#10b981", "#f59e0b",
  "#ec4899", "#06b6d4", "#8b5cf6", "#f97316"
];

export default function NetworkGraph() {
  const { showToast } = useToast();
  const svgRef = useRef(null);

  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Physics & Filter States
  const [minWeight, setMinWeight] = useState(1);
  const [selectedInst, setSelectedInst] = useState("all");
  const [selectedNode, setSelectedNode] = useState(null);

  // Canvas Viewport transform
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState(null);

  // Simulated node positions state
  const [nodePositions, setNodePositions] = useState({});

  const exportGraphAsPNG = () => {
    if (!svgRef.current) return;
    try {
      const svgElement = svgRef.current;
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 1200;
      const ctx = canvas.getContext("2d");
      const img = new Image();

      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.fillStyle = "#090d16";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        const a = document.createElement("a");
        a.download = `collaboration-network-graph-${Date.now()}.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
        showToast("Collaboration network graph exported as PNG image!", "success");
      };

      img.src = url;
    } catch {
      showToast("Failed to export graph image.", "error");
    }
  };

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const res = await getNetworkGraph();
      const rawNodes = res.data.nodes;
      const rawLinks = res.data.links;

      // Assign initial circle coordinates in a balanced force layout circle
      const width = 800;
      const height = 600;
      const radius = 220;
      const initialPos = {};

      rawNodes.forEach((node, idx) => {
        const angle = (idx / rawNodes.length) * 2 * Math.PI;
        initialPos[node.id] = {
          x: width / 2 + radius * Math.cos(angle) + (Math.random() - 0.5) * 40,
          y: height / 2 + radius * Math.sin(angle) + (Math.random() - 0.5) * 40,
        };
      });

      setGraphData({ nodes: rawNodes, links: rawLinks });
      setNodePositions(initialPos);
      setError("");
    } catch {
      setError("Failed to load collaboration network graph.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  // Run a lightweight force-directed simulation step when positions load
  useEffect(() => {
    if (!graphData.nodes.length) return;

    let pos = { ...nodePositions };
    const width = 800;
    const height = 600;

    for (let iter = 0; iter < 40; iter++) {
      // Repulsion between all node pairs
      for (let i = 0; i < graphData.nodes.length; i++) {
        for (let j = i + 1; j < graphData.nodes.length; j++) {
          const n1 = graphData.nodes[i].id;
          const n2 = graphData.nodes[j].id;
          if (!pos[n1] || !pos[n2]) continue;

          let dx = pos[n2].x - pos[n1].x;
          let dy = pos[n2].y - pos[n1].y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (dist < 180) {
            let force = (180 - dist) / dist * 1.5;
            pos[n1].x -= dx * force * 0.05;
            pos[n1].y -= dy * force * 0.05;
            pos[n2].x += dx * force * 0.05;
            pos[n2].y += dy * force * 0.05;
          }
        }
      }

      // Spring attraction along links
      graphData.links.forEach((link) => {
        const sourcePos = pos[link.source];
        const targetPos = pos[link.target];
        if (sourcePos && targetPos) {
          let dx = targetPos.x - sourcePos.x;
          let dy = targetPos.y - sourcePos.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          let force = (dist - 120) * 0.04;

          sourcePos.x += dx * force * 0.1;
          sourcePos.y += dy * force * 0.1;
          targetPos.x -= dx * force * 0.1;
          targetPos.y -= dy * force * 0.1;
        }
      });

      // Keep within bounds
      graphData.nodes.forEach((n) => {
        if (pos[n.id]) {
          pos[n.id].x = Math.max(60, Math.min(width - 60, pos[n.id].x));
          pos[n.id].y = Math.max(60, Math.min(height - 60, pos[n.id].y));
        }
      });
    }

    setNodePositions(pos);
  }, [graphData.nodes.length]);

  // Unique Institutions & color mapping
  const institutions = Array.from(new Set(graphData.nodes.map((n) => n.institution)));
  const instColors = {};
  institutions.forEach((inst, idx) => {
    instColors[inst] = COLOR_PALETTE[idx % COLOR_PALETTE.length];
  });

  // Filter nodes & links
  const filteredLinks = graphData.links.filter((l) => l.weight >= minWeight);
  const activeNodeIds = new Set();
  filteredLinks.forEach((l) => {
    activeNodeIds.add(l.source);
    activeNodeIds.add(l.target);
  });

  const filteredNodes = graphData.nodes.filter((n) => {
    const matchesInst = selectedInst === "all" || n.institution === selectedInst;
    const matchesWeight = minWeight === 1 || activeNodeIds.has(n.id);
    return matchesInst && matchesWeight;
  });

  // Pan and Drag Handlers
  const handleMouseDown = (e) => {
    if (draggedNodeId) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (draggedNodeId) {
      // Dragging node
      const svg = e.currentTarget.getBoundingClientRect();
      const mouseX = (e.clientX - svg.left - pan.x) / zoom;
      const mouseY = (e.clientY - svg.top - pan.y) / zoom;
      setNodePositions((prev) => ({
        ...prev,
        [draggedNodeId]: { x: mouseX, y: mouseY },
      }));
    } else if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNodeId(null);
  };

  return (
    <AppShell>
      <div className="network-page">
        <header className="network-header">
          <div>
            <span className="dashboard-badge">Network Analytics</span>
            <h1 className="network-title">Scientific Collaboration Graph</h1>
            <p className="network-subtitle">
              Interactive force-directed graph illustrating co-authorship relationships, joint projects, and cross-institutional connections.
            </p>
          </div>

          <div className="network-controls">
            <label className="network-filter-label">
              <span>Min Joint Papers / Projects: <strong>{minWeight}</strong></span>
              <input
                type="range"
                min="1"
                max="5"
                value={minWeight}
                onChange={(e) => setMinWeight(parseInt(e.target.value))}
                className="network-range"
              />
            </label>

            <select
              value={selectedInst}
              onChange={(e) => setSelectedInst(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Institutions ({institutions.length})</option>
              {institutions.map((inst) => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>

            <div className="network-zoom-btns">
              <button onClick={exportGraphAsPNG} className="network-export-btn">
                📸 Export PNG
              </button>
              <button onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))} className="notif-mark-all-btn">
                🔍 +
              </button>
              <button onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))} className="notif-mark-all-btn">
                🔍 -
              </button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="notif-mark-all-btn">
                Reset View
              </button>
            </div>
          </div>
        </header>

        {error && <p className="pub-error">{error}</p>}

        {loading ? (
          <p className="pub-loading">Building collaboration network graph...</p>
        ) : (
          <div className="network-container">
            {/* SVG Visualizer Canvas */}
            <div
              className="network-canvas-wrapper"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <svg ref={svgRef} className="network-svg" viewBox="0 0 800 600">
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  {/* Edges */}
                  {filteredLinks.map((link) => {
                    const p1 = nodePositions[link.source];
                    const p2 = nodePositions[link.target];
                    if (!p1 || !p2) return null;

                    const isHighlighted =
                      selectedNode &&
                      (selectedNode.id === link.source || selectedNode.id === link.target);

                    return (
                      <g key={link.id}>
                        <line
                          x1={p1.x}
                          y1={p1.y}
                          x2={p2.x}
                          y2={p2.y}
                          stroke={isHighlighted ? "#4f7fff" : "rgba(148, 163, 184, 0.25)"}
                          strokeWidth={Math.min(link.weight * 1.5, 6)}
                          strokeDasharray={link.types.includes("project_team") ? "4 2" : "none"}
                        />
                        {/* Animated energy pulse line */}
                        <line
                          x1={p1.x}
                          y1={p1.y}
                          x2={p2.x}
                          y2={p2.y}
                          stroke={isHighlighted ? "#7c3aed" : "rgba(79, 127, 255, 0.6)"}
                          strokeWidth={Math.min(link.weight * 1.2, 4)}
                          className="network-link-pulse"
                        />
                      </g>
                    );
                  })}

                  {/* Nodes */}
                  {filteredNodes.map((node) => {
                    const pos = nodePositions[node.id] || { x: 400, y: 300 };
                    const isSelected = selectedNode?.id === node.id;
                    const nodeColor = instColors[node.institution] || "#4f7fff";
                    const nodeRadius = 14 + Math.min(node.pub_count * 2, 16);

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNode(node);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggedNodeId(node.id);
                        }}
                        className="network-node-group"
                      >
                        {/* Glow halo if selected */}
                        {isSelected && (
                          <circle r={nodeRadius + 8} fill="rgba(79, 127, 255, 0.25)" stroke="#4f7fff" strokeWidth="2" />
                        )}

                        <circle
                          r={nodeRadius}
                          fill={nodeColor}
                          stroke="#1e293b"
                          strokeWidth="3"
                          className="network-node-circle"
                        />

                        <text
                          y={nodeRadius + 14}
                          textAnchor="middle"
                          className="network-node-label"
                        >
                          {node.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Network Legend */}
              <div className="network-legend">
                <div className="network-legend-title">Institutions</div>
                {institutions.slice(0, 5).map((inst) => (
                  <div key={inst} className="network-legend-item">
                    <span
                      className="network-legend-dot"
                      style={{ background: instColors[inst] }}
                    />
                    <span>{inst}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Node Details Inspection Sidebar */}
            {selectedNode && (
              <aside className="network-sidebar">
                <div className="network-sidebar-header">
                  <h3>{selectedNode.label}</h3>
                  <button onClick={() => setSelectedNode(null)} className="collab-modal-close">
                    ✕
                  </button>
                </div>

                <div className="network-sidebar-body">
                  <p className="network-sidebar-inst">
                    🏛 <strong>Institution:</strong> {selectedNode.institution}
                  </p>
                  {selectedNode.department && (
                    <p className="network-sidebar-inst">
                      🔬 <strong>Department:</strong> {selectedNode.department}
                    </p>
                  )}

                  <div className="profile-stats-grid" style={{ marginTop: "12px" }}>
                    <div className="profile-stat-box">
                      <span className="profile-stat-num">{selectedNode.pub_count}</span>
                      <span className="profile-stat-label">Papers</span>
                    </div>
                    <div className="profile-stat-box">
                      <span className="profile-stat-num">{selectedNode.proj_count}</span>
                      <span className="profile-stat-label">Projects</span>
                    </div>
                  </div>

                  {selectedNode.interests && (
                    <div style={{ marginTop: "14px" }}>
                      <strong style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Research Interests:
                      </strong>
                      <div className="profile-skill-tags" style={{ marginTop: "6px" }}>
                        {selectedNode.interests.split(",").map((tag, i) => (
                          <span key={i} className="profile-tag">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedNode.skills && (
                    <div style={{ marginTop: "14px" }}>
                      <strong style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Skills & Methodology:
                      </strong>
                      <div className="profile-skill-tags" style={{ marginTop: "6px" }}>
                        {selectedNode.skills.split(",").map((skill, i) => (
                          <span key={i} className="profile-tag profile-tag--skill">
                            {skill.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
