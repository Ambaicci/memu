'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  MessageSquare,
  Users,
  Cloud,
  FileText,
  Presentation,
  Sparkles,
  ArrowRight,
  Calendar,
  TrendingUp,
  Zap,
  CheckCircle,
  Clock,
  BarChart3,
  Globe,
  Inbox,
  Layers,
  Send,
  Eye,
  Shield
} from 'lucide-react';
import { GlossyHero, GlossyBadge, GlossyButton, GlossyCard } from '@/components/ui';

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  is_featured: boolean;
  created_at: string;
}

interface HomeDashboardProps {
  onNavigate?: (panel: any) => void;
}

// Updated feature cards with new color palette
const features = [
  {
    id: 'memus',
    icon: <MessageSquare size={24} strokeWidth={2} />,
    label: 'Memus',
    desc: 'Smart messaging with tracking',
    color: 'from-blue-600 to-bridge',
    bg: 'bg-blue-50/80',
    border: 'border-blue-100',
    textColor: 'text-blue-600',
  },
  {
    id: 'spaces',
    icon: <Layers size={24} strokeWidth={2} />,
    label: 'Spaces',
    desc: 'Collaborate in real-time',
    color: 'from-bridge to-purple-500',
    bg: 'bg-purple-50/80',
    border: 'border-purple-100',
    textColor: 'text-purple-600',
  },
  {
    id: 'airshare',
    icon: <Cloud size={24} strokeWidth={2} />,
    label: 'AirShare',
    desc: 'Share files instantly',
    color: 'from-blue-400 to-cyan-500',
    bg: 'bg-cyan-50/80',
    border: 'border-cyan-100',
    textColor: 'text-cyan-600',
  },
  {
    id: 'docs',
    icon: <FileText size={24} strokeWidth={2} />,
    label: 'Docs',
    desc: 'Create beautiful documents',
    color: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-50/80',
    border: 'border-amber-100',
    textColor: 'text-amber-600',
  },
  {
    id: 'slides',
    icon: <Presentation size={24} strokeWidth={2} />,
    label: 'Slides',
    desc: 'Design stunning presentations',
    color: 'from-rose-400 to-pink-500',
    bg: 'bg-rose-50/80',
    border: 'border-rose-100',
    textColor: 'text-rose-600',
  },
];

// Updated stats with new palette
const stats = [
  { icon: <Send size={18} strokeWidth={2} />, label: 'Memus Sent', value: '1,234', color: 'from-blue-500 to-bridge' },
  { icon: <CheckCircle size={18} strokeWidth={2} />, label: 'Response Rate', value: '94%', color: 'from-bridge to-purple-500' },
  { icon: <Clock size={18} strokeWidth={2} />, label: 'Avg Response', value: '2.4h', color: 'from-amber-400 to-orange-400' },
  { icon: <Users size={18} strokeWidth={2} />, label: 'Connections', value: '48', color: 'from-teal-400 to-cyan-400' },
];

export default function HomeDashboard({ onNavigate }: HomeDashboardProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
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
      year: 'numeric',
    });
  };

  const handleFeatureClick = (featureId: string) => {
    if (!onNavigate) return;
    switch (featureId) {
      case 'memus':
        onNavigate('home');
        break;
      case 'spaces':
        onNavigate('spaces');
        break;
      case 'airshare':
        onNavigate('airshare');
        break;
      case 'docs':
        onNavigate('docs');
        break;
      case 'slides':
        onNavigate('slides');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-memu-canvas to-white animate-page-enter overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Glossy Hero Section */}
        <GlossyHero glowColor="bridge" size="lg" className="mb-12">
          <div className="text-center">
            <GlossyBadge variant="gold" size="md" glow className="mb-5">
              <Sparkles size={14} strokeWidth={2} />
              <span className="ml-1.5">Welcome to MEMU</span>
            </GlossyBadge>

            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight tracking-tight">
              Communication that <br />
              <span className="bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
                makes sense
              </span>
            </h1>

            <p className="text-white/70 text-base md:text-lg max-w-2xl mx-auto mt-4 font-light leading-relaxed">
              See exactly where your messages are. No guessing. No anxiety. Just clarity.
            </p>

            <GlossyButton
              variant="primary"
              size="md"
              icon={<ArrowRight size={16} strokeWidth={2} />}
              onClick={() => onNavigate?.('home')}
              className="mt-6"
            >
              Go to Inbox
            </GlossyButton>
          </div>
        </GlossyHero>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-slide-up"
              style={{ animationDelay: `${idx * 80}ms`, opacity: 0 }}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center text-white mb-3 shadow-sm`}>
                {stat.icon}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-0.5">{stat.value}</div>
              <div className="text-xs text-gray-500 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Feature Cards */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 rounded-full bg-blue-500" />
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
              Your Workspace
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {features.map((feature, idx) => (
              <button
                key={feature.id}
                onClick={() => handleFeatureClick(feature.id)}
                className={`group relative bg-white border ${feature.border} rounded-2xl p-5 text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg btn-press animate-slide-up`}
                style={{ animationDelay: `${idx * 80}ms`, opacity: 0 }}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mx-auto mb-3 shadow-md group-hover:scale-105 transition-transform`}>
                  {feature.icon}
                </div>
                <div className={`text-sm font-bold text-gray-900 mb-1 ${feature.textColor}`}>
                  {feature.label}
                </div>
                <div className="text-[10px] text-gray-500 font-medium">{feature.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Updates */}
        {posts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 rounded-full bg-purple-500" />
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                What's New
              </h2>
            </div>

            <div className="space-y-4">
              {posts.map((post, idx) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer btn-press animate-slide-up"
                  style={{ animationDelay: `${idx * 80}ms`, opacity: 0 }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide ${
                        post.is_featured
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {post.is_featured && <Sparkles size={10} strokeWidth={2} className="text-blue-500" />}
                      {post.is_featured ? 'Featured' : 'Update'}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
                      <Calendar size={12} strokeWidth={2} />
                      {formatDate(post.created_at)}
                    </span>
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1.5">{post.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{post.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA Section - Glossy but more subtle */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-bridge to-purple-700 rounded-3xl p-8 md:p-12 text-center shadow-2xl">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border border-white/5">
              <Globe size={28} strokeWidth={2} className="text-white/80" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Ready to experience clarity?</h3>
            <p className="text-white/70 text-sm max-w-md mx-auto mb-6 font-light">
              Start communicating with confidence today.
            </p>
            <GlossyButton
              variant="primary"
              size="md"
              icon={<ArrowRight size={16} strokeWidth={2} />}
              onClick={() => onNavigate?.('home')}
            >
              Go to Inbox
            </GlossyButton>
          </div>
        </div>
      </div>

      {/* Post Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-in-scale border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-8">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{selectedPost.title}</h2>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>
              {selectedPost.is_featured && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-semibold tracking-wide mb-4">
                  <Sparkles size={10} strokeWidth={2} className="text-blue-500" />
                  Featured
                </span>
              )}
              <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">{selectedPost.content}</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}