'use client';

interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: string;
  className?: string;
  circle?: boolean;
}

export default function SkeletonLoader({ 
  width = 'w-full', 
  height = 'h-4', 
  rounded = 'rounded-md', 
  className = '', 
  circle = false 
}: SkeletonProps) {
  return (
    <>
      <div 
        className={`
          bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 
          bg-[length:200%_100%]
          ${circle ? 'rounded-full' : rounded} 
          ${width} 
          ${height} 
          ${className}
        `}
        style={{ animation: 'shimmer 2s infinite linear' }}
      />
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
}