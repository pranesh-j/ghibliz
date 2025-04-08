import React, { useState } from 'react';

export function StylePresets({ onSelectStyle }: { onSelectStyle?: (style: string) => void }) {
  const [selectedStyle, setSelectedStyle] = useState('ghibli');

  const presets = [
    { id: 'onepiece', name: 'Onepiece' },
    { id: 'cyberpunk', name: 'Cyberpunk' },
    { id: 'shinchan', name: 'Shinchan' },
    { id: 'solo', name: 'Solo Leveling' },
    { id: 'ghibli', name: 'Ghibli', isDefault: true },
    { id: 'pixar', name: 'Pixar' },
    { id: 'dragonball', name: 'Dragon Ball' },
    { id: 'manga', name: 'Manga' },
    { id: 'minecraft', name: 'Minecraft' },
    
    // Add more presets as needed
  ];

  const handleStyleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
    if (onSelectStyle) {
      onSelectStyle(styleId);
    }
  };

  // Updated grid column settings for exactly 9 items in a row on desktop
  const getGridColsClass = () => {
    // For mobile: 3 per row
    // For small screens: 5 per row
    // For medium screens: 6 per row
    // For large screens: 9 per row
    return "grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-9";
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-2 bg-white/90 backdrop-blur-sm rounded-xl border border-amber-100 shadow-sm p-3">
      <p className="text-center text-ghibli-dark text-xs mb-2">Choose your style</p>
      <div className={`grid ${getGridColsClass()} gap-2 justify-items-center`}>
        {presets.map((style) => (
          <div 
            key={style.id}
            className={`flex flex-col items-center cursor-pointer transition-all px-1 py-1 rounded ${
              selectedStyle === style.id 
                ? 'bg-amber-50 border border-amber-200' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => handleStyleSelect(style.id)}
          >
            <div className="relative w-12 h-12 rounded-md overflow-hidden border border-gray-200 bg-gray-50">
              {/* Use PNG images */}
              <img 
                src={`/style-icons/${style.id}.png`} 
                alt={style.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to colored background if image fails to load
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                  
                  // Create a colored div as placeholder
                  const parent = target.parentElement;
                  if (parent) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'w-full h-full';
                    
                    // Set different background colors based on style
                    if (style.id === 'ghibli') placeholder.className += ' bg-green-100';
                    else if (style.id === 'onepiece') placeholder.className += ' bg-blue-100';
                    else if (style.id === 'cyberpunk') placeholder.className += ' bg-purple-100';
                    else if (style.id === 'shinchan') placeholder.className += ' bg-yellow-100';
                    else if (style.id === 'solo') placeholder.className += ' bg-gray-100';
                    else if (style.id === 'pixar') placeholder.className += ' bg-red-100';
                    else if (style.id === 'dragonball') placeholder.className += ' bg-orange-100';
                    else if (style.id === 'manga') placeholder.className += ' bg-gray-200';
                    else if (style.id === 'minecraft') placeholder.className += ' bg-green-200';
                    else placeholder.className += ' bg-blue-200';
                    
                    parent.appendChild(placeholder);
                  }
                }}
              />
              
              {style.isDefault && (
                <div className="absolute top-0 left-0 bg-amber-400 text-white text-xs px-1 rounded-br text-[8px]">
                  Default
                </div>
              )}
              {selectedStyle === style.id && !style.isDefault && (
                <div className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center bg-amber-400 rounded-bl">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5">
                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <span className="text-xs text-ghibli-dark mt-1">{style.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}