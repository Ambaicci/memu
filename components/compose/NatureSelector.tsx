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
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-3 flex items-center gap-1.5">
        NATURE <Info size={12} className="text-gray-400" />
      </label>
      <div className="flex gap-2 flex-wrap">
        {natureOptions.map((opt) => (
          <div key={opt.id} className="relative group">
            <button
              onClick={() => {
                triggerHaptic('selection');
                onChange(opt.id);
              }}
              className={`text-xs font-bold px-4 py-2.5 rounded-full transition-all border btn-press ${
                selectedNature === opt.id
                  ? opt.style + ' shadow-sm scale-105 ring-2 ring-offset-1 ring-gray-200'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
            {/* Tooltip */}
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