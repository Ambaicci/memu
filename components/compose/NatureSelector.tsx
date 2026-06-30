'use client';

import { Info } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { natureOptions } from './constants';

interface NatureSelectorProps {
  selectedNature: string;
  onChange: (nature: string) => void;
}

export default function NatureSelector({ selectedNature, onChange }: NatureSelectorProps) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 block mb-3 flex items-center gap-1.5 tracking-wide">
        Nature <Info size={12} className="text-gray-400" />
      </label>
      <div className="flex gap-2 flex-wrap">
        {natureOptions.map((opt) => (
          <div key={opt.id} className="relative group">
            <button
              onClick={() => {
                triggerHaptic('selection');
                onChange(opt.id);
              }}
              className={`
                text-xs font-semibold px-4 py-2 rounded-full transition-all border btn-press
                ${
                  selectedNature === opt.id
                    ? `${opt.style} shadow-sm scale-105 ring-2 ring-offset-1 ring-blue-200/60`
                    : 'bg-white text-gray-600 border-gray-200/60 hover:border-gray-300 hover:bg-gray-50/80'
                }
              `}
            >
              {opt.label}
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
              {opt.desc}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}