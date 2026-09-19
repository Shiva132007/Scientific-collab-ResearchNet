import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { globalSearch } from "../api/search";
import "./GlobalSearchModal.css";

export default function GlobalSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults(null);
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const handler = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await globalSearch(query.trim());
        setResults(res.data);
      } catch {
        setError("Failed to fetch search results.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (path) => {
    onClose();
    navigate(path);
  };

  const hasResults =
    results &&
    (results.researchers.length > 0 ||
      results.publications.length > 0 ||
      results.projects.length > 0 ||
      results.conferences.length > 0);

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-modal-header">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search researchers, publications, projects, conferences..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-modal-input"
          />
          {query && (
            <button className="search-clear-btn" onClick={() => setQuery("")}>
              ✕
            </button>
          )}
          <span className="search-kbd-tag">ESC</span>
        </div>

        <div className="search-modal-body">
          {loading && <p className="search-status">Searching network database...</p>}
          {error && <p className="search-status search-status--error">{error}</p>}

          {!query.trim() && !loading && (
            <div className="search-hint">
              <p>Type to search across all entities:</p>
              <div className="search-hint-tags">
                <span>👤 Researchers</span>
                <span>📄 Publications</span>
                <span>🔬 Projects</span>
                <span>🎙 Conferences</span>
              </div>
            </div>
          )}

          {results && !hasResults && !loading && (
            <p className="search-status">No matching results found for "{query}".</p>
          )}

          {results && hasResults && (
            <div className="search-results-list">
              {results.researchers.length > 0 && (
                <div className="search-group">
                  <h4>👤 Researchers ({results.researchers.length})</h4>
                  {results.researchers.map((r) => (
                    <div
                      key={r.id}
                      className="search-item"
                      onClick={() => handleSelect(`/discover?query=${encodeURIComponent(r.title)}`)}
                    >
                      <div className="search-item-info">
                        <strong>{r.title}</strong>
                        <span>{r.subtitle}</span>
                      </div>
                      <span className="search-item-arrow">→</span>
                    </div>
                  ))}
                </div>
              )}

              {results.publications.length > 0 && (
                <div className="search-group">
                  <h4>📄 Publications ({results.publications.length})</h4>
                  {results.publications.map((p) => (
                    <div
                      key={p.id}
                      className="search-item"
                      onClick={() => handleSelect(`/publications`)}
                    >
                      <div className="search-item-info">
                        <strong>{p.title}</strong>
                        <span>{p.subtitle}</span>
                      </div>
                      <span className="search-item-arrow">→</span>
                    </div>
                  ))}
                </div>
              )}

              {results.projects.length > 0 && (
                <div className="search-group">
                  <h4>🔬 Projects ({results.projects.length})</h4>
                  {results.projects.map((pr) => (
                    <div
                      key={pr.id}
                      className="search-item"
                      onClick={() => handleSelect(`/projects`)}
                    >
                      <div className="search-item-info">
                        <strong>{pr.title}</strong>
                        <span>{pr.subtitle}</span>
                      </div>
                      <span className="search-item-arrow">→</span>
                    </div>
                  ))}
                </div>
              )}

              {results.conferences.length > 0 && (
                <div className="search-group">
                  <h4>🎙 Conferences ({results.conferences.length})</h4>
                  {results.conferences.map((c) => (
                    <div
                      key={c.id}
                      className="search-item"
                      onClick={() => handleSelect(`/conferences`)}
                    >
                      <div className="search-item-info">
                        <strong>{c.title}</strong>
                        <span>{c.subtitle}</span>
                      </div>
                      <span className="search-item-arrow">→</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
