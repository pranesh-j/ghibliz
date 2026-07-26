"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import ImageService, { CustomStyle } from '@/services/imageService';
import { useToast } from '@/components/ui/toast';

const BUILT_IN_STYLES = [
  { id: 'onepiece', name: 'Onepiece' },
  { id: 'cyberpunk', name: 'Cyberpunk' },
  { id: 'shinchan', name: 'Shinchan' },
  { id: 'solo', name: 'Solo Leveling' },
  { id: 'ghibli', name: 'Ghibli', isDefault: true },
  { id: 'pixar', name: 'Pixar' },
  { id: 'dragonball', name: 'Dragon Ball' },
  { id: 'manga', name: 'Manga' },
  { id: 'minecraft', name: 'Minecraft' },
];

// Deterministic gradient per display_name so the tile color is stable across renders
function getCustomStyleGradient(name: string): string {
  const gradients = [
    'from-rose-300 to-amber-200',
    'from-violet-300 to-pink-200',
    'from-sky-300 to-emerald-200',
    'from-orange-300 to-yellow-200',
    'from-teal-300 to-cyan-200',
    'from-fuchsia-300 to-rose-200',
    'from-amber-300 to-lime-200',
    'from-indigo-300 to-sky-200',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return gradients[Math.abs(hash) % gradients.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

interface StylePresetsProps {
  onSelectStyle?: (style: string) => void;
  isAuthenticated: boolean;
}

export function StylePresets({ onSelectStyle, isAuthenticated }: StylePresetsProps) {
  const { toast } = useToast();

  const [selectedStyle, setSelectedStyle] = useState('ghibli');
  const [defaultChanged, setDefaultChanged] = useState(false);

  const [customStyles, setCustomStyles] = useState<CustomStyle[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);

  const [creating, setCreating] = useState(false);
  const [inputOpen, setInputOpen] = useState(false);
  const [description, setDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch user's custom styles when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setCustomStyles([]);
      return;
    }
    setLoadingCustom(true);
    ImageService.fetchCustomStyles()
      .then(setCustomStyles)
      .catch(() => {
        // Silent — not blocking
      })
      .finally(() => setLoadingCustom(false));
  }, [isAuthenticated]);

  // Focus input when panel opens
  useEffect(() => {
    if (inputOpen) inputRef.current?.focus();
  }, [inputOpen]);

  const handleStyleSelect = useCallback((styleId: string) => {
    if (!defaultChanged) setDefaultChanged(true);
    setSelectedStyle(styleId);
    onSelectStyle?.(styleId);
  }, [defaultChanged, onSelectStyle]);

  const handleOpenCreate = () => {
    if (!isAuthenticated) {
      toast({ title: 'Sign in required', description: 'Please sign in to create custom styles.', variant: 'info' });
      return;
    }
    setInputOpen(true);
  };

  const handleCloseCreate = () => {
    setInputOpen(false);
    setDescription('');
  };

  const handleCreate = async () => {
    const trimmed = description.trim();
    if (!trimmed) return;

    setCreating(true);
    try {
      const newStyle = await ImageService.createCustomStyle(trimmed);
      setCustomStyles((prev) => [newStyle, ...prev]);
      handleStyleSelect(newStyle.style_key);
      handleCloseCreate();
      toast({ title: `"${newStyle.display_name}" created`, description: 'Your custom style is ready to use.', variant: 'success' });
    } catch (err: any) {
      const msg = err?.response?.data?.error;
      if (err?.response?.status === 429) {
        toast({ title: 'Daily limit reached', description: msg || 'Come back tomorrow to create more styles.', variant: 'warning' });
      } else {
        toast({ title: 'Could not create style', description: msg || 'Please try again.', variant: 'error' });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, style: CustomStyle) => {
    e.stopPropagation();
    try {
      await ImageService.deleteCustomStyle(style.id);
      setCustomStyles((prev) => prev.filter((s) => s.id !== style.id));
      if (selectedStyle === style.style_key) {
        handleStyleSelect('ghibli');
      }
      toast({ title: 'Style deleted', variant: 'info' });
    } catch {
      toast({ title: 'Could not delete style', description: 'Please try again.', variant: 'error' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') handleCloseCreate();
  };

  const hasCustomStyles = customStyles.length > 0;

  return (
    <div className="w-full max-w-3xl mx-auto mt-2 bg-white/90 backdrop-blur-sm rounded-xl border border-amber-100 shadow-sm p-3">
      {/* ── Built-in styles ── */}
      <p className="text-center text-ghibli-dark text-xs mb-2">Choose your style</p>
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-9 gap-2 justify-items-center">
        {BUILT_IN_STYLES.map((style) => (
          <BuiltInCard
            key={style.id}
            style={style}
            isSelected={selectedStyle === style.id}
            defaultChanged={defaultChanged}
            onClick={() => handleStyleSelect(style.id)}
          />
        ))}
      </div>

      {/* ── Custom styles section (authenticated users) ── */}
      {isAuthenticated && (
        <div className="mt-3 pt-3 border-t border-amber-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-ghibli-dark/70">Your styles</p>
            {!inputOpen && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 border border-amber-300 hover:border-amber-400 rounded-full px-2 py-0.5 transition-colors"
                aria-label="Create custom style"
              >
                <Plus className="w-3 h-3" />
                Create style
              </button>
            )}
          </div>

          {/* Custom style cards */}
          {loadingCustom ? (
            <div className="flex justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            </div>
          ) : (
            <div className={`grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-9 gap-2 justify-items-center ${!hasCustomStyles ? 'hidden' : ''}`}>
              {customStyles.map((style) => (
                <CustomStyleCard
                  key={style.id}
                  style={style}
                  isSelected={selectedStyle === style.style_key}
                  onSelect={() => handleStyleSelect(style.style_key)}
                  onDelete={(e) => handleDelete(e, style)}
                />
              ))}
            </div>
          )}

          {!loadingCustom && !hasCustomStyles && !inputOpen && (
            <p className="text-center text-xs text-ghibli-dark/40 py-1">
              No custom styles yet — create one!
            </p>
          )}

          {/* Create style input panel */}
          {inputOpen && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
              <p className="text-xs text-ghibli-dark/70 mb-1.5">Describe the style you want</p>
              <input
                ref={inputRef}
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. vintage 80s anime poster, K-pop idol aesthetic…"
                maxLength={500}
                disabled={creating}
                className="w-full text-sm rounded-md border border-amber-200 bg-white px-3 py-2 text-ghibli-dark placeholder:text-ghibli-dark/30 focus:outline-none focus:ring-1 focus:ring-amber-300 disabled:opacity-60"
              />
              <div className="flex gap-2 mt-2 justify-end">
                <button
                  onClick={handleCloseCreate}
                  disabled={creating}
                  className="text-xs px-3 py-1.5 rounded-md border border-gray-200 text-ghibli-dark/60 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !description.trim()}
                  className="text-xs px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 min-w-[100px] justify-center"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    'Create Style'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

interface BuiltInCardProps {
  style: { id: string; name: string; isDefault?: boolean };
  isSelected: boolean;
  defaultChanged: boolean;
  onClick: () => void;
}

function BuiltInCard({ style, isSelected, defaultChanged, onClick }: BuiltInCardProps) {
  return (
    <div
      className={`flex flex-col items-center cursor-pointer px-1 py-1 rounded style-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      style={{ minHeight: '64px' }}
    >
      <div className="relative w-12 h-12 rounded-md overflow-hidden border border-gray-200 bg-gray-50 style-item-image">
        <img
          src={`/style-icons/${style.id}.webp`}
          alt={style.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              const placeholder = document.createElement('div');
              placeholder.className = `w-full h-full ${
                style.id === 'ghibli' ? 'bg-green-100' :
                style.id === 'onepiece' ? 'bg-blue-100' :
                style.id === 'cyberpunk' ? 'bg-purple-100' :
                style.id === 'shinchan' ? 'bg-yellow-100' :
                style.id === 'solo' ? 'bg-gray-100' :
                style.id === 'pixar' ? 'bg-red-100' :
                style.id === 'dragonball' ? 'bg-orange-100' :
                style.id === 'manga' ? 'bg-gray-200' :
                style.id === 'minecraft' ? 'bg-green-200' : 'bg-blue-200'
              }`;
              parent.appendChild(placeholder);
            }
          }}
        />
        {style.isDefault && !defaultChanged && (
          <div className="absolute top-0 left-0 bg-amber-400 text-white text-[8px] px-1 rounded-br">
            Default
          </div>
        )}
        {isSelected && (defaultChanged || !style.isDefault) && (
          <div className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center bg-amber-400 rounded-bl">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5">
              <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      <span className="text-xs text-ghibli-dark mt-1 text-center leading-tight">{style.name}</span>
    </div>
  );
}

interface CustomStyleCardProps {
  style: CustomStyle;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function CustomStyleCard({ style, isSelected, onSelect, onDelete }: CustomStyleCardProps) {
  const gradient = getCustomStyleGradient(style.display_name);
  const initials = getInitials(style.display_name);

  return (
    <div
      className={`flex flex-col items-center cursor-pointer px-1 py-1 rounded style-item group ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      style={{ minHeight: '64px' }}
    >
      <div className="relative w-12 h-12 rounded-md overflow-hidden border border-gray-200 style-item-image">
        {/* Gradient tile with initials */}
        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <span className="text-white text-sm font-semibold drop-shadow-sm select-none">{initials}</span>
        </div>

        {/* Delete button — visible on hover */}
        <button
          onClick={onDelete}
          className="absolute top-0 left-0 w-full h-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          aria-label={`Delete ${style.display_name}`}
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Selected checkmark */}
        {isSelected && (
          <div className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center bg-amber-400 rounded-bl pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5">
              <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      <span className="text-xs text-ghibli-dark mt-1 text-center leading-tight max-w-[52px] truncate">
        {style.display_name}
      </span>
    </div>
  );
}
