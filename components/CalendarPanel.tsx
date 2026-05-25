'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Video, Users, X, ChevronDown, Phone, Video as VideoIcon } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  date: number;
  type: 'call' | 'meeting' | 'reminder';
  participants?: string[];
  duration?: string;
}

// Demo events
const eventsData: Record<number, CalendarEvent[]> = {
  5: [{ id: '1', title: 'Product Sync', time: '2:00 PM', date: 5, type: 'call', participants: ['Aisha', 'David', 'Tobias'], duration: '45 min' }],
  9: [{ id: '2', title: 'Client Review', time: '4:30 PM', date: 9, type: 'meeting', participants: ['Nairobi Design Co.'], duration: '1 hour' }],
  12: [{ id: '3', title: '1:1 with Maria', time: '10:00 AM', date: 12, type: 'call', participants: ['Maria Santos'], duration: '30 min' }],
  14: [
    { id: '4', title: 'Board Deck Review', time: '11:00 AM', date: 14, type: 'meeting', participants: ['Aisha', 'Exec Team'], duration: '1 hour' },
    { id: '5', title: 'Team Lunch', time: '1:00 PM', date: 14, type: 'reminder', participants: ['Design Squad'], duration: '1 hour' }
  ],
  17: [{ id: '6', title: 'Today\'s Standup', time: '9:30 AM', date: 17, type: 'call', participants: ['Product Team'], duration: '30 min' }],
  21: [{ id: '7', title: 'memu v1 Launch', time: '10:00 AM', date: 21, type: 'call', participants: ['All Hands'], duration: '2 hours' }],
  28: [{ id: '8', title: 'Q4 Review', time: '3:00 PM', date: 28, type: 'meeting', participants: ['Finance', 'Leadership'], duration: '1.5 hours' }],
  30: [{ id: '9', title: 'Design Review', time: '2:00 PM', date: 30, type: 'call', participants: ['David', 'Nairobi Design Co.'], duration: '45 min' }],
};

const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface CalendarPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

const getEventColorForBorder = (event: CalendarEvent): string => {
  switch (event.type) {
    case 'call': return '#4f46e5';
    case 'meeting': return '#059669';
    default: return '#d97706';
  }
};

const getJoinButtonStyle = (type: string): string => {
  switch (type) {
    case 'call':
      return 'bg-gradient-to-r from-[#4f46e5] to-[#6366f1] hover:from-[#6366f1] hover:to-[#818cf8] text-white shadow-sm hover:shadow-md';
    case 'meeting':
      return 'bg-gradient-to-r from-[#059669] to-[#10b981] hover:from-[#10b981] hover:to-[#34d399] text-white shadow-sm hover:shadow-md';
    default:
      return 'bg-gradient-to-r from-[#d97706] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#fbbf24] text-white shadow-sm hover:shadow-md';
  }
};

export default function CalendarPanel({ isGuest, requireAuth }: CalendarPanelProps = {}) {
  const [currentMonth, setCurrentMonth] = useState(4); // May 2025 (0-indexed)
  const [currentYear, setCurrentYear] = useState(2025);
  const [selectedDate, setSelectedDate] = useState<number | null>(17);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (date: number) => {
    setSelectedDate(date);
    const events = eventsData[date] || [];
    setSelectedEvents(events);
    if (events.length > 0) {
      setShowEventModal(true);
    }
  };

  const handleAddEvent = () => {
    if (isGuest && requireAuth) {
      requireAuth('add event', () => alert('Add event coming soon! ✨'));
    } else {
      alert('Add event coming soon! ✨');
    }
  };

  const handleJoinEvent = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    alert(`Joining ${event.title}... 🎥`);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
    const todayDate = today.getDate();

    const calendarDays = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(
        <div key={`empty-${i}`} className="bg-[#fafaf8] min-h-[100px] p-2 border border-[#e8e7e3] rounded-lg">
          <div className="text-[12.5px] text-[#aaa]"></div>
        </div>
      );
    }

    // Actual days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const events = eventsData[d] || [];
      const isToday = isCurrentMonth && d === todayDate;
      
      let borderStyle = {};
      if (events.length === 1) {
        const color = getEventColorForBorder(events[0]);
        borderStyle = {
          borderTopWidth: '1px',
          borderTopColor: color + '40'
        };
      } else if (events.length >= 2) {
        const gradientColors = events.map(e => getEventColorForBorder(e) + '40').join(', ');
        borderStyle = {
          borderTopWidth: '1px',
          borderImage: `linear-gradient(to right, ${gradientColors}) 1`
        };
      }

      calendarDays.push(
        <div
          key={d}
          onClick={() => handleDateClick(d)}
          className={`min-h-[100px] p-2 border border-[#e8e7e3] rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden ${
            selectedDate === d ? 'bg-[#ede9fe] border-[#4f46e5]' : 'bg-white hover:border-[#d0cfc9]'
          } ${isToday ? 'ring-1 ring-[#4f46e5] ring-inset' : ''}`}
          style={borderStyle}
        >
          <div className={`text-[13px] font-medium mb-1.5 ${isToday ? 'text-[#4f46e5]' : 'text-[#3a3a3a]'}`}>
            {d}
          </div>
          <div className="space-y-1">
            {events.slice(0, 2).map((event) => (
              <div
                key={event.id}
                className={`text-[10px] px-1.5 py-0.5 rounded truncate transition-all duration-200 ${
                  event.type === 'call'
                    ? 'bg-[#e0e7ff] text-[#4338ca]'
                    : event.type === 'meeting'
                    ? 'bg-[#d1fae5] text-[#059669]'
                    : 'bg-[#fef3c7] text-[#d97706]'
                }`}
              >
                {event.time} {event.title}
              </div>
            ))}
            {events.length > 2 && (
              <div className="text-[9px] text-[#777] px-1.5">
                +{events.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return calendarDays;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone size={14} />;
      case 'meeting':
        return <Users size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'call':
        return 'bg-[#e0e7ff] text-[#4338ca] border-[#c7d2fe]';
      case 'meeting':
        return 'bg-[#d1fae5] text-[#059669] border-[#a7f3d0]';
      default:
        return 'bg-[#fef3c7] text-[#d97706] border-[#fde68a]';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Calendar</h1>
              <p className="text-[13px] text-[#777] mt-1">Schedule calls, meetings, and reminders</p>
            </div>
            <button
              onClick={handleAddEvent}
              className="flex items-center gap-2 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl px-4 py-2.5 text-[13px] font-medium hover:shadow-lg transition-all duration-200"
            >
              <Plus size={15} />
              Add Event
            </button>
          </div>

          {/* Calendar Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevMonth}
                className="p-2 border border-[#e8e7e3] rounded-lg hover:border-[#777] transition-all duration-200 hover:shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-[18px] font-medium text-[#0f0f0f]">
                {monthNames[currentMonth]} {currentYear}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-2 border border-[#e8e7e3] rounded-lg hover:border-[#777] transition-all duration-200 hover:shadow-sm"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const today = new Date();
                  setCurrentMonth(today.getMonth());
                  setCurrentYear(today.getFullYear());
                  setSelectedDate(today.getDate());
                }}
                className="px-4 py-1.5 text-[13px] border border-[#e8e7e3] rounded-lg hover:border-[#777] transition-all duration-200"
              >
                Today
              </button>
              <div className="relative">
                <button
                  onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
                  className="px-4 py-1.5 text-[13px] border border-[#e8e7e3] rounded-lg hover:border-[#777] transition-all duration-200 flex items-center gap-1"
                >
                  {viewMode === 'month' ? 'Month' : 'Week'}
                  <ChevronDown size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="bg-[#f2f1ee] p-2 text-center text-[11px] font-medium text-[#777] tracking-wide rounded-lg">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {renderCalendar()}
          </div>

          {/* Upcoming Events Section */}
          <div className="mt-8">
            <h3 className="text-[15px] font-medium text-[#0f0f0f] mb-3 flex items-center gap-2">
              <CalendarIcon size={16} className="text-[#777]" />
              Upcoming
            </h3>
            <div className="space-y-2">
              {Object.entries(eventsData).slice(0, 5).map(([date, events]) => (
                <div key={date} className="bg-white border border-[#e8e7e3] rounded-xl p-4 hover:shadow-md hover:border-[#d0cfc9] transition-all duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="sm:min-w-[80px]">
                      <div className="text-[14px] font-medium text-[#0f0f0f]">May {date}</div>
                      <div className="text-[10px] text-[#777]">
                        {new Date(2025, currentMonth, parseInt(date)).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {events.map((event) => (
                        <div key={event.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-[#fafaf8] rounded-lg hover:shadow-sm transition">
                          <div className={`p-2 rounded-lg w-fit ${getEventColor(event.type)}`}>
                            {getEventIcon(event.type)}
                          </div>
                          <div className="flex-1">
                            <div className="text-[14px] font-medium text-[#0f0f0f]">{event.title}</div>
                            <div className="text-[11px] text-[#777] flex flex-wrap items-center gap-3 mt-1">
                              <span>{event.time}</span>
                              <span>•</span>
                              <span>{event.duration}</span>
                              <span>•</span>
                              <span>{event.participants?.join(', ')}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleJoinEvent(event, e)}
                            className={`px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 flex items-center gap-1.5 ${getJoinButtonStyle(event.type)}`}
                          >
                            {event.type === 'call' ? <VideoIcon size={12} /> : <Users size={12} />}
                            Join
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && selectedEvents.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEventModal(false)}>
          <div className="bg-white rounded-2xl w-[450px] max-w-[90%] shadow-2xl animate-slideDown" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-[#e8e7e3] flex items-center justify-between">
              <h3 className="text-[18px] font-['Playfair_Display'] text-[#0f0f0f]">
                Events on May {selectedDate}
              </h3>
              <button onClick={() => setShowEventModal(false)} className="p-1 rounded-lg hover:bg-[#f2f1ee] transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {selectedEvents.map((event) => (
                <div key={event.id} className={`p-4 rounded-xl border ${getEventColor(event.type)} transition-all duration-200 hover:shadow-md`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getEventIcon(event.type)}
                      <span className="text-[15px] font-medium text-[#0f0f0f]">{event.title}</span>
                    </div>
                    <span className="text-[12px] text-[#777]">{event.time}</span>
                  </div>
                  <div className="text-[12px] text-[#777] space-y-1 ml-7">
                    <div>📅 Duration: {event.duration}</div>
                    <div>👥 Participants: {event.participants?.join(', ')}</div>
                  </div>
                  <button
                    onClick={(e) => handleJoinEvent(event, e)}
                    className={`mt-3 ml-7 text-[11px] font-medium px-4 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 ${getJoinButtonStyle(event.type)}`}
                  >
                    {event.type === 'call' ? <VideoIcon size={12} /> : <Users size={12} />}
                    Join Event
                  </button>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-[#e8e7e3] flex justify-end">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-1.5 text-[13px] text-[#777] hover:text-[#0f0f0f] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}