'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, ArrowRight } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'memu' | 'doc' | 'slide' | 'sheet' | 'handle' | 'space' | 'board';
  icon: React.ReactNode;
  color: string;
  path: string;
  timestamp?: string;
  preview?: string;
}

interface GlobalSearchProps {
  dark?: boolean;
}

export default function GlobalSearch({ dark = false }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('recent_searches');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecent(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Listen for openSearch event from keyboard shortcuts
  useEffect(() => {
    const handleOpenSearch = () => setIsOpen(true);
    window.addEventListener('openSearch', handleOpenSearch);
    return () => window.removeEventListener('openSearch', handleOpenSearch);
  }, []);

  // Filter results based on query
  useEffect(() => {
    if (query.length > 0) {
      // In a real implementation, this would be an API call
      // For now, we'll show no results to demonstrate empty state
      setResults([]);
    } else {
      setResults([]);
    }
    setSelectedIndex(-1);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
      // Arrow navigation
      if (isOpen) {
        const items = query.length > 0 ? results : recent.map(r => ({ title: r } as any));
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, -1));
        }
        if (e.key === 'Enter' && selectedIndex >= 0) {
          e.preventDefault();
          const item = query.length > 0 ? results[selectedIndex] : recent[selectedIndex];
          if (item) {
            handleSelect(item);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, query, results, recent, selectedIndex]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: any) => {
    // Add to recent searches
    if (query.trim()) {
      const newRecent = [query, ...recent.filter(r => r !== query)].slice(0, 5);
      setRecent(newRecent);
      localStorage.setItem('recent_searches', JSON.stringify(newRecent));
    }

    if (result.path) {
      window.location.href = result.path;
    } else if (typeof result === 'string') {
      setQuery(result);
    }
    setIsOpen(false);
    setQuery('');
  };

  // Conditional styles for dark mode
  const searchBtnClass = dark
    ? 'flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-white/80 text-[13px]'
    : 'flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f2f1ee] hover:bg-[#e8e7e3] transition text-[#777] text-[13px]';

  const kbdClass = dark
    ? 'text-[10px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded border border-white/10'
    : 'text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#e8e7e3]';

  return (
    <>
      {/* Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={searchBtnClass}
      >
        <Search size={14} strokeWidth={2} />
        <span className="hidden md:inline">Search...</span>
        <kbd className={kbdClass}>⌘K</kbd>
      </button>

      {/* Mobile Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`lg:hidden p-2 rounded-lg transition ${dark ? 'hover:bg-white/10 text-white/80' : 'hover:bg-[#f2f1ee] text-[#777]'}`}
      >
        <Search size={18} strokeWidth={2} />
      </button>

      {/* Search Modal — TOP-RIGHT POSITION */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 backdrop-blur-sm"
          style={{ minWidth: '100vw', minHeight: '100vh' }}
          onClick={() => {
            setIsOpen(false);
            setQuery('');
          }}
        >
          <div
            ref={containerRef}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideDown mt-4 mr-4"
            style={{
              width: 'min(90vw, 672px)',
              minWidth: 'min(90vw, 672px)',
              maxWidth: '672px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 p-4 border-b border-[#e8e7e3]">
              <Search size={18} className="text-[#aaa]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search memus, documents, contacts..."
                className="flex-1 text-[15px] outline-none bg-transparent"
                autoFocus
              />
              {query && (
                <button onClick={() => setQuery('')} className="p-1 rounded hover:bg-[#f2f1ee]">
                  <X size={14} className="text-[#aaa]" />
                </button>
              )}
              <kbd className="text-[11px] px-2 py-1 bg-[#f2f1ee] rounded text-[#777]">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {query.length === 0 ? (
                recent.length > 0 ? (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-[#aaa]" />
                        <span className="text-[11px] font-medium text-[#777] uppercase tracking-wide">Recent</span>
                      </div>
                      <button
                        onClick={() => {
                          setRecent([]);
                          localStorage.removeItem('recent_searches');
                        }}
                        className="text-[11px] text-[#4f46e5] hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="space-y-1">
                      {recent.map((item, idx) => (
                        <button
                          key={item}
                          onClick={() => handleSelect(item)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition ${
                            selectedIndex === idx ? 'bg-[#ede9fe]' : 'hover:bg-[#f2f1ee]'
                          }`}
                        >
                          <Clock size={14} className="text-[#aaa]" />
                          <span className="text-[14px] text-[#0f0f0f]">{item}</span>
                          <ArrowRight size={12} className="ml-auto text-[#aaa]" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Search size={32} className="text-[#aaa] mx-auto mb-3" />
                    <div style={{ width: '280px', margin: '0 auto 16px auto' }}>
                      <p className="text-[14px] text-[#777]">Search for anything</p>
                      <p className="text-[12px] text-[#aaa] mt-1">Try searching for memus, documents, or contacts</p>
                    </div>
                  </div>
                )
              ) : results.length === 0 ? (
                <div className="p-8 text-center">
                  <Search size={32} className="text-[#aaa] mx-auto mb-3" />
                  <div style={{ width: '280px', margin: '0 auto 16px auto' }}>
                    <p className="text-[14px] text-[#777]">No results found for "{query}"</p>
                  </div>
                  <p className="text-[12px] text-[#aaa]">Try searching for something else</p>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Search size={14} className="text-[#aaa]" />
                    <span className="text-[11px] font-medium text-[#777] uppercase tracking-wide">
                      Results for "{query}"
                    </span>
                  </div>
                  <div className="space-y-1">
                    {results.map((result, idx) => (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition ${
                          selectedIndex === idx ? 'bg-[#ede9fe]' : 'hover:bg-[#f2f1ee]'
                        }`}
                      >
                        <div className="mt-0.5">{result.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-medium text-[#0f0f0f]">{result.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f2f1ee] text-[#777]">
                              {result.type}
                            </span>
                          </div>
                          <div className="text-[12px] text-[#777] mt-0.5">{result.subtitle}</div>
                          {result.preview && (
                            <div className="text-[11px] text-[#aaa] mt-1 line-clamp-1">{result.preview}</div>
                          )}
                        </div>
                        {result.timestamp && (
                          <div className="text-[10px] text-[#aaa] flex-shrink-0">{result.timestamp}</div>
                        )}
                        <ArrowRight size={12} className="text-[#aaa] flex-shrink-0 opacity-0 group-hover:opacity-100 transition" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[#e8e7e3] bg-memu-canvas flex items-center justify-between text-[10px] text-[#aaa]">
              <div className="flex items-center gap-3">
                <span>↑↓ to navigate</span>
                <span>↵ to select</span>
                <span>ESC to close</span>
              </div>
              <div className="flex items-center gap-1">
                <span>⌘K to search</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.2s ease-out; }
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </>
  );
}