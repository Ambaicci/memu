'use client';

import { ArrowLeft, Home, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface NavigationHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  onBack?: () => void;
  onHome?: () => void;
  showBack?: boolean;
  showHome?: boolean;
}

export default function NavigationHeader({
  breadcrumbs,
  onBack,
  onHome,
  showBack = true,
  showHome = true,
}: NavigationHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      if (breadcrumbs.length > 1) {
        const previousCrumb = breadcrumbs[breadcrumbs.length - 2];
        if (previousCrumb.href) {
          router.push(previousCrumb.href);
        } else {
          router.push('/');
        }
      } else {
        router.push('/');
      }
    }
  };

  const handleHome = () => {
    if (onHome) {
      onHome();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-memu-canvas/80 backdrop-blur-sm border-b border-gray-200/60 px-4 md:px-6 py-2 md:py-3">
      <div className="flex items-center gap-3">
        {/* Back Button */}
        {showBack && (
          <button
            onClick={handleBack}
            className="p-1.5 rounded-md hover:bg-gray-100 transition text-gray-500 hover:text-blue-600 group"
            title="Go back"
          >
            <ArrowLeft size={18} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Home Button */}
        {showHome && (
          <button
            onClick={handleHome}
            className="p-1.5 rounded-md hover:bg-gray-100 transition text-gray-500 hover:text-blue-600 group"
            title="Go home"
          >
            <Home size={18} strokeWidth={2} className="group-hover:scale-105 transition-transform" />
          </button>
        )}

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[11px] md:text-[13px] overflow-x-auto whitespace-nowrap">
          {breadcrumbs.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight size={12} strokeWidth={2} className="text-gray-300 flex-shrink-0" />
              )}
              <span
                onClick={() => item.href && router.push(item.href)}
                className={`text-gray-500 font-medium ${
                  item.href
                    ? 'hover:text-blue-600 cursor-pointer transition-colors'
                    : 'text-gray-700'
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}