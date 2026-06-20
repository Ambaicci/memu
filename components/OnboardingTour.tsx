'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, Check, Sparkles } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Memu!',
    description: 'Let\'s take a quick tour to help you get started. Memu is a new kind of messaging app that makes communication crystal clear.',
    icon: '👋'
  },
  {
    id: 'nature',
    title: 'The Nature of Your Message',
    description: 'Every memu has a "Nature" - it tells the recipient what you need from them. FYI (just info), Decide (need a decision), Resolve (let\'s solve this), or Urgent (time-sensitive).',
    icon: '🎯'
  },
  {
    id: 'compose',
    title: 'Compose Your First Memu',
    description: 'Tap the + button to create a memu. Add recipients, choose the nature, write your message, and send. It\'s that simple!',
    icon: '✍️'
  },
  {
    id: 'inbox',
    title: 'Your Inbox',
    description: 'All your incoming memus appear here. Each one shows the sender, subject, nature, and when it arrived. Pull down to refresh!',
    icon: '📬'
  },
  {
    id: 'spaces',
    title: 'Spaces',
    description: 'Spaces are like team channels. Create a space for your project, invite members, and collaborate together in one place.',
    icon: '🌌'
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'You\'re ready to start using Memu. Remember: clear communication starts with clear intent. Happy memuing!',
    icon: '🎉'
  }
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleNext = () => {
    triggerHaptic('selection');
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    triggerHaptic('success');
    setIsVisible(false);
    setTimeout(() => {
      // Mark tour as completed in localStorage
      localStorage.setItem('memu_tour_completed', 'true');
      onComplete();
    }, 300);
  };

  const handleSkip = () => {
    triggerHaptic('light');
    setIsVisible(false);
    setTimeout(() => {
      localStorage.setItem('memu_tour_completed', 'true');
      onComplete();
    }, 300);
  };

  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleSkip}
      />

      {/* Tour Card */}
      <div 
        className={`fixed inset-x-4 bottom-4 md:inset-x-auto md:left-1/2 md:bottom-1/2 md:-translate-x-1/2 md:translate-y-1/2 md:w-[500px] max-w-[500px] z-[101] transition-all duration-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Progress Bar */}
          <div className="h-1 bg-gray-100">
            <div 
              className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-2xl shadow-lg">
                {step.icon}
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-gray-900">{step.title}</h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Step {currentStep + 1} of {tourSteps.length}
                </p>
              </div>
            </div>
            <button 
              onClick={handleSkip}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all btn-press"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            <p className="text-sm text-gray-700 leading-relaxed mb-6">
              {step.description}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3">
              {currentStep > 0 && (
                <button 
                  onClick={() => {
                    triggerHaptic('light');
                    setCurrentStep(currentStep - 1);
                  }}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all btn-press"
                >
                  Back
                </button>
              )}
              
              <div className="flex-1" />

              {currentStep === tourSteps.length - 1 ? (
                <button 
                  onClick={handleComplete}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md btn-press"
                >
                  <Check size={16} strokeWidth={2.5} />
                  Get Started
                </button>
              ) : (
                <>
                  <button 
                    onClick={handleSkip}
                    className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all btn-press"
                  >
                    Skip Tour
                  </button>
                  <button 
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md btn-press"
                  >
                    Next
                    <ChevronRight size={16} strokeWidth={2.5} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Step Indicators */}
          <div className="px-6 pb-4 flex justify-center gap-1.5">
            {tourSteps.map((_, idx) => (
              <div 
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep 
                    ? 'w-8 bg-gradient-to-r from-indigo-600 to-purple-600' 
                    : idx < currentStep 
                      ? 'w-1.5 bg-indigo-300' 
                      : 'w-1.5 bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}