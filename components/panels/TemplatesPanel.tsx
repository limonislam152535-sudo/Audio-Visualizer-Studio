'use client';

import React, { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { VISUALIZER_CATEGORIES, VISUALIZER_TEMPLATES } from '@/lib/constants';
import { VisualizerCategory, VisualizerTemplateId } from '@/lib/types';
import { TemplateThumbnail } from './TemplateThumbnail';

interface TemplatesPanelProps {
  selectedTemplateId: VisualizerTemplateId;
  onSelectTemplate: (id: VisualizerTemplateId) => void;
}

export function TemplatesPanel({
  selectedTemplateId,
  onSelectTemplate,
}: TemplatesPanelProps) {
  const [activeCategory, setActiveCategory] = useState<VisualizerCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return VISUALIZER_TEMPLATES.filter((t) => {
      const catMatch = activeCategory === 'All' || t.category === activeCategory;
      const textMatch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold text-slate-900">
          Visualizer Templates
        </h2>
        <span className="text-xs font-mono-tabular text-slate-500">
          {filtered.length} / {VISUALIZER_TEMPLATES.length}
        </span>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search
          className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search 20 templates..."
          aria-label="Search visualizer templates"
          className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/85 border border-slate-200/90 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
        />
      </div>

      {/* Category Filter Tabs */}
      <div
        role="tablist"
        aria-label="Visualizer template categories"
        className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-200/55"
      >
        {VISUALIZER_CATEGORIES.map((cat) => {
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 gap-2.5">
        {filtered.map((template) => {
          const isSelected = template.id === selectedTemplateId;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template.id)}
              aria-pressed={isSelected}
              className={`group text-left rounded-2xl p-2 transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                isSelected
                  ? 'bg-white border-sky-500 shadow-sm shadow-sky-500/10'
                  : 'bg-white/65 border-slate-200/80 hover:bg-white hover:border-slate-300'
              }`}
            >
              <div className="relative overflow-hidden rounded-xl">
                <TemplateThumbnail template={template} isSelected={isSelected} />
                {isSelected && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center shadow">
                    <Check className="w-3 h-3" aria-hidden="true" />
                  </span>
                )}
              </div>
              <div className="px-1 pt-2 pb-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {template.name}
                  </span>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                    {template.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                  {template.description}
                </p>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl bg-white/60 border border-slate-200/80 p-6 text-center">
            <p className="text-xs font-medium text-slate-700">
              No templates match &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('All');
              }}
              className="mt-2 text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
