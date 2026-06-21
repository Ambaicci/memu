'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  MessageSquare, Users, Cloud, FileText, Presentation, 
  Sparkles, ArrowRight, Calendar, TrendingUp, Zap, 
  CheckCircle, Clock, BarChart3, Globe
} from 'lucide-react';

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

const features = [
  { 
    id: 'memus',
    icon: <MessageSquare size={24} />,
    label: 'Memus',
    desc: 'Smart messaging with tracking',
    color: 'from-indigo-500 to-purple-600',
    border: 'border-indigo-200',
    bg: 'bg-indigo-50',
  },
  { 
    id: 'spaces',
    icon: <Users size={24} />,
    label: 'Spaces',
    desc: 'Collaborate in real-time',
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
  },
  { 
    id: 'airshare',
    icon: <Cloud size={24} />,
    label: 'AirShare',
    desc: 'Share files instantly',
    color: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-200',
    bg: 'bg-cyan-50',
  },
  { 
    id: 'docs',
    icon: <FileText size={24} />,
    label: 'Docs',
    desc: 'Create beautiful documents',
    color: 'from-amber-500 to-orange-600',
    border: 'border-amber-200',
    bg: 'bg-amber-50',
  },
  { 
    id: 'slides',
    icon: <Presentation size={24} />,
    label: 'Slides',
    desc: 'Design stunning presentations',
    color: 'from-rose-500 to-pink-600',
    border: 'border-rose-200',
    bg: 'bg-rose-50',
  },
];

const stats = [
  { icon: <CheckCircle size={20} />, label: 'Messages Sent', value: '1,234', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { icon: <Clock size={20} />, label: 'Time Saved', value: '48h', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { icon: <TrendingUp size={20} />, label: 'Productivity', value: '+32%', color: 'text-purple-600', bg: 'bg-purple-50' },
  { icon: <Zap size={20} />, label: 'Response Rate', value: '94%', color: 'text-amber-600', bg: 'bg-amber-50' },
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
      year: 'numeric' 
    });
  };

  const handleFeatureClick = (featureId: string) => {
    if (!onNavigate) return;
    
    switch (featureId) {
      case 'memus':
        onNavigate('home'); // Go to inbox
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
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 animate-page-enter overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold mb-6 shadow-lg shadow-indigo-500/30 animate-fade-in-scale">
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${idx * 100}ms`, opacity: 0 }}
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <div className={stat.color}>{stat.icon}</div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-xs text-gray-500 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Feature Cards Grid */}
        <div className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Zap size={24} className="text-indigo-600" />
            Your Workspace
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {features.map((feature, idx) => (
              <button
                key={feature.id}
                onClick={() => handleFeatureClick(feature.id)}
                className="group bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl btn-press animate-slide-up"
                style={{ animationDelay: `${idx * 100}ms`, opacity: 0 }}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mx-auto mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <div className="text-sm font-bold text-gray-900 mb-1">{feature.label}</div>
                <div className="text-[10px] text-gray-500">{feature.desc}</div>
              </button>
            ))}
          </div>
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
                  className="bg-white/80 backdrop-blur-sm border border-white/30 rounded-2xl p-5 md:p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer btn-press animate-slide-up"
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
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-8 md:p-12 text-center text-white animate-fade-in-scale shadow-2xl shadow-indigo-500/30">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
            <Globe size={32} className="text-white" />
          </div>
          <h3 className="font-serif text-3xl font-bold mb-3">Ready to experience clarity?</h3>
          <p className="text-indigo-100 max-w-md mx-auto mb-6">
            Start communicating with confidence today.
          </p>
          <button 
            onClick={() => onNavigate?.('home')}
            className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-semibold text-sm hover:shadow-xl hover:-translate-y-0.5 transition-all btn-press inline-flex items-center gap-2"
          >
            Go to Inbox
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