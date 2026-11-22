'use client';

import React from 'react';
import {
  AudioLines,
  Image as ImageIcon,
  Maximize2,
  Music2,
  Type,
} from 'lucide-react';
import {
  AspectRatioId,
  AudioAsset,
  BackgroundConfig,
  BrandingConfig,
  ExportResolutionId,
  LeftSidebarTab,
  VisualizerTemplateId,
} from '@/lib/types';
import { AspectRatioPanel } from './panels/AspectRatioPanel';
import { AudioPanel } from './panels/AudioPanel';
import { BackgroundPanel } from './panels/BackgroundPanel';
import { BrandingPanel } from './panels/BrandingPanel';
import { TemplatesPanel } from './panels/TemplatesPanel';

interface LeftSidebarProps {
  activeTab: LeftSidebarTab;
  onSelectTab: (tab: LeftSidebarTab) => void;
  audio: AudioAsset | null;
  isDecodingAudio: boolean;
  audioError: string | null;
  onSelectAudioFile: (file: File) => void;
  onLoadDemoTrack: () => void;
  onRemoveAudio: () => void;
  selectedTemplateId: VisualizerTemplateId;
  onSelectTemplate: (id: VisualizerTemplateId) => void;
  background: BackgroundConfig;
  onChangeBackground: (next: BackgroundConfig) => void;
  onUploadBackgroundImage: (file: File) => void;
  onResetBackground: () => void;
  branding: BrandingConfig;
  onChangeBranding: (next: BrandingConfig) => void;
  onUploadLogo: (file: File) => void;
  onRemoveLogo: () => void;
  aspectRatio: AspectRatioId;
  resolution: ExportResolutionId;
  onSelectRatio: (ratio: AspectRatioId) => void;
}

const TABS: Array<{ id: LeftSidebarTab; label: string; icon: typeof Music2 }> = [
  { id: 'audio', label: 'Audio', icon: Music2 },
  { id: 'templates', label: 'Templates', icon: AudioLines },
  { id: 'backgrounds', label: 'Backdrop', icon: ImageIcon },
  { id: 'branding', label: 'Branding', icon: Type },
  { id: 'canvas', label: 'Ratio', icon: Maximize2 },
];

export function LeftSidebar(props: LeftSidebarProps) {
  const { activeTab, onSelectTab } = props;

  return (
    <aside
      aria-label="Design and Customization"
      className="liquid-glass rounded-2xl flex flex-col lg:flex-row overflow-hidden w-full lg:w-[308px] xl:w-[360px] shrink-0 min-h-0"
    >
      {/* Vertical Icon Rail (horizontal on smaller screens) */}
      <nav
        aria-label="Studio sections"
        className="flex lg:flex-col items-center justify-around lg:justify-start gap-1 p-2 border-b lg:border-b-0 lg:border-r border-slate-200/75 bg-white/40 shrink-0"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 w-14 py-2 px-1 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                active
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/75'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-[10px] font-medium whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Active Panel Content */}
      <div className="flex-1 overflow-y-auto studio-scroll p-4 min-h-0">
        {activeTab === 'audio' && (
          <AudioPanel
            audio={props.audio}
            isDecoding={props.isDecodingAudio}
            error={props.audioError}
            onSelectFile={props.onSelectAudioFile}
            onLoadDemoTrack={props.onLoadDemoTrack}
            onRemoveAudio={props.onRemoveAudio}
          />
        )}
        {activeTab === 'templates' && (
          <TemplatesPanel
            selectedTemplateId={props.selectedTemplateId}
            onSelectTemplate={props.onSelectTemplate}
          />
        )}
        {activeTab === 'backgrounds' && (
          <BackgroundPanel
            background={props.background}
            onChange={props.onChangeBackground}
            onUploadCustomImage={props.onUploadBackgroundImage}
            onResetBackground={props.onResetBackground}
          />
        )}
        {activeTab === 'branding' && (
          <BrandingPanel
            branding={props.branding}
            onChange={props.onChangeBranding}
            onUploadLogo={props.onUploadLogo}
            onRemoveLogo={props.onRemoveLogo}
          />
        )}
        {activeTab === 'canvas' && (
          <AspectRatioPanel
            selectedRatio={props.aspectRatio}
            resolution={props.resolution}
            onSelectRatio={props.onSelectRatio}
          />
        )}
      </div>
    </aside>
  );
}
