import { useState } from "react";
import "./AnalyticsCharts.css";

const YEARLY_DATA = [
  { year: "2021", count: 12, label: "12 Papers" },
  { year: "2022", count: 19, label: "19 Papers" },
  { year: "2023", count: 28, label: "28 Papers" },
  { year: "2024", count: 42, label: "42 Papers" },
  { year: "2025", count: 65, label: "65 Papers" },
  { year: "2026", count: 84, label: "84 Papers" },
];

const TYPE_DATA = [
  { type: "Journal Article", count: 45, color: "#4f7fff" },
  { type: "Conference Paper", count: 32, color: "#7c3aed" },
  { type: "Book Chapter", count: 12, color: "#10b981" },
  { type: "Preprint", count: 8, color: "#f59e0b" },
];

export default function AnalyticsCharts() {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const maxCount = Math.max(...YEARLY_DATA.map((d) => d.count));
  const totalTypes = TYPE_DATA.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="analytics-grid">
      {/* Chart 1: Publication Timeline Bar Chart */}
      <div className="analytics-card">
        <div className="analytics-card-header">
          <div className="analytics-card-title">
            <span>📈 Publication Output Timeline</span>
          </div>
          <span className="analytics-badge">2021 – 2026</span>
        </div>

        <div className="analytics-chart-box">
          {hoveredBar && (
            <div className="chart-tooltip">
              <strong>{hoveredBar.year}:</strong> {hoveredBar.count} Publications
            </div>
          )}

          <svg className="chart-svg" viewBox="0 0 400 200">
            {/* Grid lines */}
            <line x1="40" y1="30" x2="380" y2="30" className="chart-axis" />
            <line x1="40" y1="80" x2="380" y2="80" className="chart-axis" />
            <line x1="40" y1="130" x2="380" y2="130" className="chart-axis" />
            <line x1="40" y1="170" x2="380" y2="170" stroke="rgba(148, 163, 184, 0.4)" strokeWidth="1.5" />

            {/* Bars */}
            {YEARLY_DATA.map((d, i) => {
              const x = 55 + i * 54;
              const barHeight = (d.count / maxCount) * 125;
              const y = 170 - barHeight;

              return (
                <g key={d.year}>
                  <rect
                    x={x}
                    y={y}
                    width="32"
                    height={barHeight}
                    rx="6"
                    fill="url(#barGradient)"
                    className="chart-bar"
                    onMouseEnter={() => setHoveredBar(d)}
                    onMouseLeave={() => setHoveredBar(null)}
                  />
                  <text x={x + 16} y="188" textAnchor="middle" className="chart-label">
                    {d.year}
                  </text>
                  <text x={x + 16} y={y - 6} textAnchor="middle" className="chart-label" fill="#4f7fff">
                    {d.count}
                  </text>
                </g>
              );
            })}

            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f7fff" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Chart 2: Publication Types Distribution Donut */}
      <div className="analytics-card">
        <div className="analytics-card-header">
          <div className="analytics-card-title">
            <span>📚 Publication Types Breakdown</span>
          </div>
          <span className="analytics-badge">{totalTypes} Total</span>
        </div>

        <div className="analytics-chart-box" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg className="chart-svg" viewBox="0 0 200 200" style={{ maxWidth: "190px" }}>
            {/* Simple Clean Donut Segments */}
            {(() => {
              let accumulatedAngle = 0;
              return TYPE_DATA.map((item) => {
                const percentage = item.count / totalTypes;
                const strokeDasharray = `${percentage * 377} 377`;
                const strokeDashoffset = -accumulatedAngle * 377;
                accumulatedAngle += percentage;

                const isSelected = selectedCategory === "all" || selectedCategory === item.type;

                return (
                  <circle
                    key={item.type}
                    cx="100"
                    cy="100"
                    r="60"
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth={isSelected ? "22" : "14"}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    opacity={isSelected ? 1 : 0.35}
                    style={{ transition: "all 0.3s ease", cursor: "pointer" }}
                    onClick={() => setSelectedCategory(selectedCategory === item.type ? "all" : item.type)}
                  />
                );
              });
            })()}
            <text x="100" y="96" textAnchor="middle" className="chart-label" fill="#f8fafc" fontSize="18" fontWeight="800">
              {totalTypes}
            </text>
            <text x="100" y="114" textAnchor="middle" className="chart-label">
              Records
            </text>
          </svg>
        </div>

        <div className="analytics-legend-grid">
          {TYPE_DATA.map((item) => (
            <div
              key={item.type}
              className="analytics-legend-item"
              style={{ cursor: "pointer", opacity: selectedCategory === "all" || selectedCategory === item.type ? 1 : 0.5 }}
              onClick={() => setSelectedCategory(selectedCategory === item.type ? "all" : item.type)}
            >
              <span className="analytics-legend-dot" style={{ background: item.color }} />
              <span>{item.type} ({item.count})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
