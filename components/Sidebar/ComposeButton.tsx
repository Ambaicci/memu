'use client';

interface ComposeButtonProps {
  onClick: () => void;
}

export default function ComposeButton({ onClick }: ComposeButtonProps) {
  return (
    <button
      onClick={onClick}
      className="mx-4 mb-5 bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d] text-white rounded-lg py-2.5 px-4 text-[13.5px] font-medium flex items-center justify-center gap-2 hover:from-[#2d2d2d] hover:to-[#3d3d3d] transition-all duration-200 shadow-sm flex-shrink-0"
    >
      <span className="text-base leading-none">+</span>
      Write a memu
    </button>
  );
}