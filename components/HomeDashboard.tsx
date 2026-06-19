'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  MessageSquare, Users, Cloud, FileText, Presentation, 
  Sparkles, ArrowRight, Calendar
} from 'lucide-react';

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  is_featured: boolean;
  created_at: string;
}

const features = [
  { 
    id: 'memus',
    icon: <MessageSquare size={24} />,
    label: 'Memus',
    color: 'from-indigo-500 to-purple-600',
    border: 'border-indigo-200',
  },
  { 
    id: 'spaces',
    icon: <Users size={24} />,
    label: 'Spaces',
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-200',
  },
  { 
    id: 'airshare',
    icon: <Cloud size={24} />,
    label: 'AirShare',
    color: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-200',
  },
  { 
    id: 'docs',
    icon: <FileText size={24} />,
    label: 'Docs',
    color: 'from-amber-500 to-orange-600',
    border: 'border-amber-200',
  },
  { 
    id: 'slides',
    icon: <Presentation size={24} />,
    label: 'Slides',
    color: 'from-rose-500 to-pink-600',
    border: 'border-rose-200',
  },
];

export default function HomeDashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (data) setPosts(data);
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 animate-page-enter overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-6 shadow-lg shadow-indigo-500/30">
            <Sparkles size={16} />
            Welcome to MEMU
          </div>
          <h1 className="font-serif text-4xl md:text-6xl font-bold text-gray-900 mb-4 leading-tight">
            Communication that<br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              makes sense
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            See exactly where your messages are. No guessing. No anxiety. Just clarity.
          </p>
        </div>

        {/* ORBITAL ILLUSTRATION CENTER */}
        <div 
          className="orbit-container relative w-[360px] h-[360px] md:w-[600px] md:h-[600px] mx-auto mb-20 flex items-center justify-center" 
          style={{ perspective: '1000px', '--orbit-radius': '160px' } as React.CSSProperties}
        >
          
          {/* Soft orbit rings */}
          <div className="absolute inset-12 md:inset-20 rounded-full border-2 border-dashed border-indigo-200/40 animate-spin-slow" />
          <div className="absolute inset-20 md:inset-32 rounded-full border border-purple-200/30" />

          {/* Orbiting container */}
          <div className="absolute inset-0 animate-orbit" style={{ transformStyle: 'preserve-3d' }}>
            {features.map((feature, idx) => {
              const angle = (idx * 360) / features.length;
              return (
                <div
                  key={feature.id}
                  className="absolute top-1/2 left-1/2"
                  style={{
                    // Uses the CSS variable for responsive radius!
                    transform: `rotate(${angle}deg) translateX(var(--orbit-radius))`,
                    transformOrigin: '0 0',
                  }}
                >
                  {/* Counter-rotate wrapper to keep card upright */}
                  <div 
                    className="relative animate-counter-orbit"
                    style={{
                      transform: `translate(-50%, -50%)`,
                    }}
                  >
                    {/* Flip card container */}
                    <div 
                      className="flip-card"
                      style={{
                        width: '80px',
                        height: '80px',
                        animationDelay: `${idx * 0.4}s`,
                      }}
                    >
                      <div className="flip-card-inner">
                        {/* FRONT */}
                        <div className={`flip-card-face flip-card-front bg-white rounded-2xl border-2 ${feature.border} shadow-xl flex flex-col items-center justify-center p-2`}>
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white shadow-md`}>
                            {feature.icon}
                          </div>
                          <div className="text-[9px] font-bold text-gray-700 mt-1">{feature.label}</div>
                        </div>
                        {/* BACK */}
                        <div className={`flip-card-face flip-card-back bg-white rounded-2xl border-2 ${feature.border} shadow-xl flex flex-col items-center justify-center p-2`}>
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white shadow-md`}>
                            {feature.icon}
                          </div>
                          <div className="text-[9px] font-bold text-gray-700 mt-1">{feature.label}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CENTRAL: Person at Computer */}
          <div className="relative z-10 bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-100 animate-pulse-slow">
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-32 h-20 md:w-48 md:h-32 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-2 md:p-3">
                <div className="relative h-full bg-white rounded-md p-2">
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-indigo-200 rounded w-3/4" />
                    <div className="h-1.5 bg-purple-200 rounded w-1/2" />
                    <div className="h-1.5 bg-emerald-200 rounded w-2/3" />
                    <div className="flex gap-1 mt-2">
                      <div className="h-4 flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded" />
                      <div className="h-4 flex-1 bg-gray-200 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="w-16 h-10 md:w-24 md:h-16 bg-gradient-to-b from-indigo-600 to-indigo-700 rounded-t-2xl" />
                <div className="absolute -top-8 md:-top-10 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 bg-gradient-to-b from-amber-200 to-amber-300 rounded-full">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-12 md:w-16 h-4 md:h-5 bg-gradient-to-b from-amber-800 to-amber-900 rounded-t-full" />
                  <div className="absolute top-4 left-2 md:top-5 md:left-3 w-1 h-1 md:w-1.5 md:h-1.5 bg-gray-800 rounded-full" />
                  <div className="absolute top-4 right-2 md:top-5 md:right-3 w-1 h-1 md:w-1.5 md:h-1.5 bg-gray-800 rounded-full" />
                  <div className="absolute bottom-2 md:bottom-3 left-1/2 -translate-x-1/2 w-3 md:w-4 h-1.5 md:h-2 border-b-2 border-gray-800 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-16">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl btn-press"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mx-auto mb-3 shadow-md`}>
                {feature.icon}
              </div>
              <div className="text-sm font-bold text-gray-900 mb-1">{feature.label}</div>
            </div>
          ))}
        </div>

        {/* Recent Updates */}
        {posts.length > 0 && (
          <div className="mb-12">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Sparkles size={24} className="text-indigo-600" />
              What's New
            </h2>
            <div className="space-y-4">
              {posts.map((post, idx) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl p-5 md:p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer btn-press animate-slide-up"
                  style={{ animationDelay: `${idx * 100}ms`, opacity: 0 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      post.is_featured ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {post.is_featured ? 'Featured' : 'Update'}
                    </span>
                    <span className="text-sm text-gray-400 flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(post.created_at)}
                    </span>
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">{post.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-8 md:p-12 text-center text-white animate-fade-in-scale">
          <h3 className="font-serif text-3xl font-bold mb-3">Ready to experience clarity?</h3>
          <p className="text-indigo-100 max-w-md mx-auto mb-6">
            Start communicating with confidence today.
          </p>
          <button className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-semibold text-sm hover:shadow-xl hover:-translate-y-0.5 transition-all btn-press inline-flex items-center gap-2">
            Get Started
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Post Modal */}
      {selectedPost && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedPost(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-in-scale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-8">
              <h2 className="font-serif text-2xl font-bold text-gray-900 mb-4">{selectedPost.title}</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{selectedPost.content}</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Responsive Orbit Radius */
        .orbit-container {
          --orbit-radius: 160px;
        }
        @media (min-width: 768px) {
          .orbit-container {
            --orbit-radius: 260px;
          }
        }

        /* Orbit: Cards revolve around center */
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-orbit {
          animation: orbit 30s linear infinite;
        }

        /* Counter-Orbit: Keeps cards upright while revolving */
        @keyframes counter-orbit {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(-360deg); }
        }
        .animate-counter-orbit {
          animation: counter-orbit 30s linear infinite;
        }

        /* Flip: Card rotates around Y-axis */
        @keyframes flip {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }

        .flip-card {
          position: relative;
          transform-style: preserve-3d;
          animation: flip 4s ease-in-out infinite;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
        }
        .flip-card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 40s linear infinite;
        }

        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}