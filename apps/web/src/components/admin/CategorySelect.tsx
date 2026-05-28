'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight as ChevronRightIcon, Check, Search, X, Pin } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  target_year?: number | null;
}

interface CategorySelectProps {
  categories: Category[];
  value: number | string;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
}

export function CategorySelect({
  categories,
  value,
  onChange,
  className = '',
  placeholder = 'Select category'
}: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});
  const [expandedMainCats, setExpandedMainCats] = useState<Record<number, boolean>>({});
  const [expandedSubCats, setExpandedSubCats] = useState<Record<number, boolean>>({});

  const numericValue = typeof value === 'string' ? parseInt(value) || 0 : value;

  const selectedCat = categories.find(c => c.id === numericValue);
  const selectedCatName = selectedCat ? selectedCat.name : placeholder;

  const [isMounted, setIsMounted] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);

  const updatePins = () => {
    try {
      const stored = localStorage.getItem('pinnedCategoryIds');
      if (stored) {
        setPinnedIds(JSON.parse(stored));
      } else {
        setPinnedIds([]);
      }
    } catch (e) {
      setPinnedIds([]);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    updatePins();

    window.addEventListener('storage', updatePins);
    window.addEventListener('pinned-categories-changed', updatePins);
    return () => {
      window.removeEventListener('storage', updatePins);
      window.removeEventListener('pinned-categories-changed', updatePins);
    };
  }, []);

  const getCategoryPath = (cat: Category): string => {
    const path: string[] = [cat.name];
    let parentId = cat.parent_id;
    while (parentId) {
      const parent = categories.find(c => c.id === parentId);
      if (parent) {
        path.unshift(parent.name);
        parentId = parent.parent_id;
      } else {
        break;
      }
    }
    return path.join(' > ');
  };

  const pinnedCategories = categories.filter(c => pinnedIds.includes(c.id));
  const filteredPinnedCategories = pinnedCategories.filter(c => 
    c.name.toLowerCase().includes(catSearch.toLowerCase().trim())
  );

  // Clear search on close
  useEffect(() => {
    if (!isOpen) {
      setCatSearch('');
    }
  }, [isOpen]);

  const getVisibleCategoryIds = () => {
    const query = catSearch.toLowerCase().trim();
    if (!query) return null;
    
    const matchingIds = new Set<number>();
    
    categories.forEach(c => {
      if (c.name.toLowerCase().includes(query)) {
        matchingIds.add(c.id);
      }
    });

    const visibleIds = new Set<number>();
    matchingIds.forEach(id => {
      let currId: number | null = id;
      while (currId !== null) {
        visibleIds.add(currId);
        const cat = categories.find(c => c.id === currId);
        currId = cat ? cat.parent_id : null;
      }
    });

    return visibleIds;
  };

  const visibleCatIds = getVisibleCategoryIds();
  const isSearchActive = !!catSearch.trim();
  const hasMatches = !isSearchActive || (visibleCatIds && visibleCatIds.size > 0);

  const renderCategoryTree = (catsToRender: Category[]) => {
    const mainCats = catsToRender.filter(c => c.parent_id === null).sort((a, b) => a.name.localeCompare(b.name));
    return mainCats.map(mainCat => {
      if (visibleCatIds && !visibleCatIds.has(mainCat.id)) return null;

      const subCats = categories.filter(sub => sub.parent_id === mainCat.id).sort((a, b) => a.name.localeCompare(b.name));
      const isMainExpanded = isSearchActive ? true : expandedMainCats[mainCat.id];
      return (
        <div key={mainCat.id}>
          <div className="flex items-stretch">
            {subCats.length > 0 ? (
              <div
                className="pl-4 pr-1 flex items-center justify-center cursor-pointer hover:bg-white/5 text-gray-400"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedMainCats(prev => ({ ...prev, [mainCat.id]: !prev[mainCat.id] }));
                }}
              >
                {isMainExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
              </div>
            ) : (
              <div className="pl-4 pr-1 w-8 flex items-center justify-center"></div>
            )}
            <div
              className={`flex-1 pr-4 py-1.5 text-xs cursor-pointer transition-colors flex justify-between items-center ${numericValue === mainCat.id ? 'text-emerald-400 bg-emerald-500/10 font-medium' : 'text-gray-300 hover:bg-white/5'}`}
              onClick={() => {
                onChange(mainCat.id);
                setIsOpen(false);
              }}
            >
              {mainCat.name}
              {numericValue === mainCat.id && <Check className="w-3.5 h-3.5" />}
            </div>
          </div>
          {isMainExpanded && subCats.length > 0 && (
            <div className="mb-1 bg-black/20">
              {subCats.map(subCat => {
                if (visibleCatIds && !visibleCatIds.has(subCat.id)) return null;

                const topics = categories.filter(topic => topic.parent_id === subCat.id).sort((a, b) => a.name.localeCompare(b.name));
                const isSubExpanded = isSearchActive ? true : expandedSubCats[subCat.id];
                return (
                  <div key={subCat.id}>
                    <div className="flex items-stretch">
                      {topics.length > 0 ? (
                        <div
                          className="pl-8 pr-1 flex items-center justify-center cursor-pointer hover:bg-white/5 text-gray-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedSubCats(prev => ({ ...prev, [subCat.id]: !prev[subCat.id] }));
                          }}
                        >
                          {isSubExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                        </div>
                      ) : (
                        <div className="pl-8 pr-1 w-12 flex items-center justify-center"></div>
                      )}
                      <div
                        className={`flex-1 pr-4 py-1.5 text-xs cursor-pointer transition-colors flex justify-between items-center ${numericValue === subCat.id ? 'text-emerald-400 bg-emerald-500/10 font-medium' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                        onClick={() => {
                          onChange(subCat.id);
                          setIsOpen(false);
                        }}
                      >
                        {subCat.name}
                        {numericValue === subCat.id && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                    {isSubExpanded && topics.length > 0 && (
                      <div className="mb-0.5 bg-black/30">
                        {topics.map(topic => {
                          if (visibleCatIds && !visibleCatIds.has(topic.id)) return null;
                          return (
                            <div
                              key={topic.id}
                              className={`pl-14 pr-4 py-1.5 text-xs cursor-pointer transition-colors flex justify-between items-center ${numericValue === topic.id ? 'text-emerald-400 bg-emerald-500/10 font-medium' : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'}`}
                              onClick={() => {
                                onChange(topic.id);
                                setIsOpen(false);
                              }}
                            >
                              {topic.name}
                              {numericValue === topic.id && <Check className="w-3.5 h-3.5" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={className || "w-full flex justify-between items-center text-left bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-lg px-3 py-2 text-xs text-white outline-none transition-colors"}
      >
        <span className={numericValue === 0 ? "text-gray-400 truncate" : "text-white font-medium truncate"}>
          {selectedCatName}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 mt-1 w-full max-h-80 bg-slate-900 border border-white/10 rounded-lg shadow-2xl flex flex-col overflow-hidden">
            <div className="p-2 border-b border-white/5 bg-slate-950/60 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search categories..."
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
                autoFocus
              />
              {catSearch && (
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); setCatSearch(''); }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-60 py-1 scrollbar-thin">
              {!hasMatches ? (
                <div className="px-4 py-3 text-xs text-gray-500 text-center">
                  No categories found
                </div>
              ) : (
                <>
                  {/* Pinned Categories Section */}
                  {isMounted && filteredPinnedCategories.length > 0 && (
                    <div className="mb-2 border-b border-white/10 pb-2">
                      <div className="px-3 py-1 text-slate-500 font-bold text-[10px] tracking-wider uppercase flex items-center gap-1.5 mb-1 select-none">
                        <Pin className="w-3.5 h-3.5 fill-slate-500 rotate-[45deg]" />
                        PINNED
                      </div>
                      <div className="space-y-0.5">
                        {filteredPinnedCategories.map(cat => {
                          const path = getCategoryPath(cat);
                          return (
                            <div
                              key={`pinned-dropdown-${cat.id}`}
                              className={`px-6 py-1.5 text-xs cursor-pointer transition-colors flex justify-between items-center ${numericValue === cat.id ? 'text-emerald-400 bg-emerald-500/10 font-medium' : 'text-gray-300 hover:bg-white/5'}`}
                              onClick={() => {
                                onChange(cat.id);
                                setIsOpen(false);
                              }}
                            >
                              <div className="truncate flex flex-col min-w-0 flex-1">
                                <span className="font-medium text-white truncate">{cat.name}</span>
                                {path !== cat.name && (
                                  <span className="text-[10px] text-gray-500 truncate mt-0.5">{path}</span>
                                )}
                              </div>
                              {numericValue === cat.id && <Check className="w-3.5 h-3.5 shrink-0 ml-2" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {[1, 2, 3, 4, 5].map(year => {
                    const yearCats = categories.filter(c => c.target_year === year);
                    if (yearCats.length === 0) return null;
                    if (visibleCatIds && !yearCats.some(c => visibleCatIds.has(c.id))) return null;
                    
                    const isExpanded = isSearchActive ? true : expandedYears[year];
                    return (
                      <div key={year} className="mb-0.5">
                        <div
                          className="px-3 py-1.5 flex items-center gap-1.5 cursor-pointer hover:bg-white/5 text-emerald-400 font-semibold text-xs transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
                          }}
                        >
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                          Year {year}
                        </div>
                        {isExpanded && (
                          <div className="mb-0.5">
                            {renderCategoryTree(yearCats)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(() => {
                    const otherCats = categories.filter(c => !c.target_year);
                    if (otherCats.length === 0) return null;
                    if (visibleCatIds && !otherCats.some(c => visibleCatIds.has(c.id))) return null;
                    return (
                      <div className="mb-0.5 mt-1.5 pt-1.5 border-t border-white/5">
                        <div className="px-3 py-1.5 flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                          <div className="w-3 h-3" />
                          Global / Other
                        </div>
                        <div>
                          {renderCategoryTree(otherCats)}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
