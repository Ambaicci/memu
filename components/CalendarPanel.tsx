'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Video,
  Users,
  X,
  ChevronDown,
  Phone,
  Video as VideoIcon,
  Filter,
  Heart,
  Plane,
  Briefcase,
  Utensils,
  Gift,
  Star,
  Activity,
  Coffee,
  Share2,
  Search,
  Link as LinkIcon,
  Send,
  Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  event_type: string;
  participants: string[];
  created_by?: string;
  date: number;
  time: string;
  duration?: string;
}

interface CalendarPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

const eventTypes = [
  { id: 'meeting', label: 'Meeting', icon: <Users size={16} />, color: 'bg-emerald-500', border: 'border-emerald-200/60', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { id: 'call', label: 'Call', icon: <Phone size={16} />, color: 'bg-blue-500', border: 'border-blue-200/60', badge: 'bg-blue-50 text-blue-700 border-blue-100' },
  { id: 'date', label: 'Date', icon: <Heart size={16} />, color: 'bg-rose-500', border: 'border-rose-200/60', badge: 'bg-rose-50 text-rose-700 border-rose-100' },
  { id: 'travel', label: 'Travel', icon: <Plane size={16} />, color: 'bg-sky-500', border: 'border-sky-200/60', badge: 'bg-sky-50 text-sky-700 border-sky-100' },
  { id: 'appointment', label: 'Appointment', icon: <Briefcase size={16} />, color: 'bg-indigo-500', border: 'border-indigo-200/60', badge: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  { id: 'birthday', label: 'Birthday', icon: <Gift size={16} />, color: 'bg-amber-500', border: 'border-amber-200/60', badge: 'bg-amber-50 text-amber-700 border-amber-100' },
  { id: 'deadline', label: 'Deadline', icon: <Clock size={16} />, color: 'bg-red-500', border: 'border-red-200/60', badge: 'bg-red-50 text-red-700 border-red-100' },
  { id: 'personal', label: 'Personal', icon: <Star size={16} />, color: 'bg-purple-500', border: 'border-purple-200/60', badge: 'bg-purple-50 text-purple-700 border-purple-100' },
  { id: 'work', label: 'Work', icon: <Activity size={16} />, color: 'bg-cyan-500', border: 'border-cyan-200/60', badge: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  { id: 'social', label: 'Social', icon: <Coffee size={16} />, color: 'bg-pink-500', border: 'border-pink-200/60', badge: 'bg-pink-50 text-pink-700 border-pink-100' },
  { id: 'reminder', label: 'Reminder', icon: <Clock size={16} />, color: 'bg-orange-500', border: 'border-orange-200/60', badge: 'bg-orange-50 text-orange-700 border-orange-100' },
  { id: 'custom', label: 'Custom', icon: <Star size={16} />, color: 'bg-gray-500', border: 'border-gray-200/60', badge: 'bg-gray-50 text-gray-700 border-gray-100' },
];

const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatEventTime = (start: string, end: string, allDay: boolean) => {
  if (allDay) return 'All day';
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const computeDuration = (start: string, end: string) => {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours}h ${minutes}m`;
};

const getEventTypeById = (id: string) => eventTypes.find(t => t.id === id) || eventTypes[0];

export default function CalendarPanel({ isGuest, requireAuth }: CalendarPanelProps = {}) {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [eventToShare, setEventToShare] = useState<CalendarEvent | null>(null);
  const [shareHandle, setShareHandle] = useState('');
  const [shareSearchResults, setShareSearchResults] = useState<any[]>([]);
  const [searchingHandles, setSearchingHandles] = useState(false);
  const [sharingEvent, setSharingEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventStart, setNewEventStart] = useState('09:00');
  const [newEventEnd, setNewEventEnd] = useState('10:00');
  const [newEventType, setNewEventType] = useState('meeting');
  const [newEventParticipants, setNewEventParticipants] = useState('');
  const [newEventAllDay, setNewEventAllDay] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  const { data: eventsMap = {}, isLoading } = useQuery({
    queryKey: ['calendar-events', currentUserId, currentMonth, currentYear],
    queryFn: async () => {
      if (!currentUserId) return {};
      const supabase = createClient();

      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', currentUserId)
        .gte('start_time', startOfMonth.toISOString())
        .lte('start_time', endOfMonth.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching calendar events:', error);
        return {};
      }

      const map: Record<number, CalendarEvent[]> = {};
      for (const ev of data) {
        const start = new Date(ev.start_time);
        const day = start.getDate();
        const timeStr = formatEventTime(ev.start_time, ev.end_time, ev.all_day);
        const duration = computeDuration(ev.start_time, ev.end_time);
        if (!map[day]) map[day] = [];
        map[day].push({
          id: ev.id,
          title: ev.title,
          description: ev.description,
          start_time: ev.start_time,
          end_time: ev.end_time,
          all_day: ev.all_day,
          event_type: ev.event_type,
          participants: ev.participants || [],
          created_by: ev.created_by,
          date: day,
          time: timeStr,
          duration,
        });
      }
      return map;
    },
    enabled: !!currentUserId,
    staleTime: 60 * 1000,
  });

  const handleDateClick = (date: number) => {
    setSelectedDate(date);
    const events = eventsMap[date] || [];
    setSelectedEvents(events);
    if (events.length > 0) setShowEventModal(true);
    else {
      const year = currentYear;
      const month = currentMonth;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      setNewEventDate(dateStr);
      setShowAddModal(true);
    }
  };

  const handleAddEventClick = () => {
    if (isGuest && requireAuth) {
      requireAuth('add event', () => setShowAddModal(true));
    } else {
      setNewEventDate(
        `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDate || 1).padStart(2, '0')}`
      );
      setShowAddModal(true);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEventTitle.trim()) {
      showToast('Please enter a title', 'error');
      return;
    }
    if (!newEventDate) return;
    const supabase = createClient();
    const startDateTime = new Date(`${newEventDate}T${newEventAllDay ? '00:00' : newEventStart}`);
    let endDateTime = new Date(`${newEventDate}T${newEventAllDay ? '23:59' : newEventEnd}`);
    if (endDateTime <= startDateTime) {
      endDateTime = new Date(startDateTime.getTime() + 3600000);
    }
    const { error } = await supabase.from('calendar_events').insert({
      user_id: currentUserId,
      title: newEventTitle,
      description: newEventDescription,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      all_day: newEventAllDay,
      event_type: newEventType,
      participants: newEventParticipants.split(',').map((p) => p.trim()).filter((p) => p),
    });
    if (error) {
      console.error('Error creating event:', error);
      showToast('Failed to create event', 'error');
    } else {
      showToast('Event created', 'success');
      setShowAddModal(false);
      resetAddForm();
      queryClient.invalidateQueries({ queryKey: ['calendar-events', currentUserId, currentMonth, currentYear] });
    }
  };

  const handleShareEvent = async (event: CalendarEvent) => {
    setEventToShare(event);
    setShowShareModal(true);
  };

  const handleSearchHandles = async () => {
    if (!shareHandle.trim() || shareHandle.length < 2) {
      setShareSearchResults([]);
      return;
    }
    setSearchingHandles(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .or(`full_name.ilike.%${shareHandle}%,username.ilike.%${shareHandle}%`)
      .neq('id', currentUserId || '')
      .limit(5);
    if (!error && data) setShareSearchResults(data);
    else setShareSearchResults([]);
    setSearchingHandles(false);
  };

  useEffect(() => {
    const debounce = setTimeout(handleSearchHandles, 300);
    return () => clearTimeout(debounce);
  }, [shareHandle]);

  const handleSendShare = async (recipientId: string, recipientUsername: string) => {
    if (!eventToShare) return;
    setSharingEvent(true);
    const supabase = createClient();

    const shareData = {
      event_id: eventToShare.id,
      title: eventToShare.title,
      description: eventToShare.description,
      start_time: eventToShare.start_time,
      end_time: eventToShare.end_time,
      event_type: eventToShare.event_type,
      shared_by: currentUserId,
      shared_with: recipientId,
    };

    const { error } = await supabase.from('event_shares').insert(shareData);

    if (error) {
      showToast('Failed to share event', 'error');
    } else {
      showToast(`Event shared with @${recipientUsername}`, 'success');
      setShowShareModal(false);
      setShareHandle('');
      setShareSearchResults([]);
    }
    setSharingEvent(false);
  };

  const resetAddForm = () => {
    setNewEventTitle('');
    setNewEventDescription('');
    setNewEventDate('');
    setNewEventStart('09:00');
    setNewEventEnd('10:00');
    setNewEventType('meeting');
    setNewEventParticipants('');
    setNewEventAllDay(false);
  };

  const handleJoinEvent = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    showToast(`Joining ${event.title}...`, 'info');
  };

  const handleDeleteEvent = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this event?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
    if (error) showToast('Failed to delete event', 'error');
    else {
      showToast('Event deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['calendar-events', currentUserId, currentMonth, currentYear] });
      setShowEventModal(false);
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else setCurrentMonth(currentMonth - 1);
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else setCurrentMonth(currentMonth + 1);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
    const todayDate = today.getDate();

    const calendarDays = [];
    // Empty cells: solid gray background
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(
        <div key={`empty-${i}`} className="bg-gray-100 min-h-[90px] p-2 border border-gray-200 rounded-xl" />
      );
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const events = eventsMap[d] || [];
      const isToday = isCurrentMonth && d === todayDate;
      const borderClass = events.length > 0 ? getEventTypeById(events[0].event_type).border : 'border-gray-200';

      calendarDays.push(
        <div
          key={d}
          onClick={() => handleDateClick(d)}
          className={`min-h-[90px] p-2 border rounded-xl cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden ${borderClass} ${
            selectedDate === d ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white hover:bg-gray-50'
          } ${isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''} btn-press`}
        >
          <div className={`text-[13px] font-semibold mb-1.5 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>{d}</div>
          <div className="space-y-1">
            {events.slice(0, 2).map((event) => {
              const eventType = getEventTypeById(event.event_type);
              return (
                <div key={event.id} className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium border ${eventType.badge}`}>
                  {event.time} {event.title}
                </div>
              );
            })}
            {events.length > 2 && <div className="text-[9px] text-gray-400 px-1.5 font-medium">+{events.length - 2} more</div>}
          </div>
        </div>
      );
    }
    return calendarDays;
  };

  const totalEvents = Object.values(eventsMap).flat().length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-memu-canvas animate-page-enter">
      {/* HEADER SECTION */}
      <div className="px-6 md:px-10 pt-8 pb-4 w-full">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <CalendarIcon size={20} strokeWidth={2} className="text-white" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Calendar</h1>
            </div>
            <div className="flex flex-wrap gap-3 mt-1">
              <span className="text-sm text-gray-500 font-medium">{totalEvents} events this month</span>
            </div>
          </div>

          <button
            onClick={handleAddEventClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-bridge text-white rounded-xl text-sm font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md btn-press"
          >
            <Plus size={16} strokeWidth={2} /> Add Event
          </button>
        </div>
      </div>

      {/* CALENDAR CONTROLS */}
      <div className="px-6 md:px-10 pb-4 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevMonth}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition text-gray-500 hover:text-blue-600 btn-press"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <span className="text-lg font-semibold text-gray-900">{monthNames[currentMonth]} {currentYear}</span>
            <button
              onClick={handleNextMonth}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition text-gray-500 hover:text-blue-600 btn-press"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const now = new Date();
                setCurrentMonth(now.getMonth());
                setCurrentYear(now.getFullYear());
                setSelectedDate(now.getDate());
              }}
              className="px-4 py-2 text-xs font-medium border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition btn-press"
            >
              Today
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition btn-press"
            >
              {viewMode === 'month' ? 'Month' : 'Week'} <ChevronDown size={12} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="bg-gray-100 p-2 text-center text-[11px] font-semibold text-gray-500 rounded-xl uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">{renderCalendar()}</div>
      </div>

      {/* UPCOMING EVENTS — NO BACKDROP BLUR */}
      <div className="px-6 md:px-10 py-4 border-t border-gray-200/60 bg-white w-full">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
          <CalendarIcon size={14} strokeWidth={2} className="text-blue-600" /> Upcoming Events
        </h3>
        {totalEvents === 0 ? (
          <div className="text-center text-gray-400 py-8 bg-white rounded-2xl border border-gray-100">
            <p className="text-sm font-medium">No upcoming events. Click on a date to add one.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scroll">
            {Object.entries(eventsMap)
              .slice(0, 5)
              .map(([date, events], idx) => (
                <div
                  key={date}
                  className={`bg-white rounded-xl border ${getEventTypeById(events[0].event_type).border} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 p-4 animate-slide-up btn-press`}
                  style={{ animationDelay: `${idx * 80}ms`, opacity: 0 }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="sm:min-w-[80px]">
                      <div className="text-sm font-semibold text-gray-900">{monthNames[currentMonth]} {date}</div>
                      <div className="text-[11px] text-gray-400 font-medium">
                        {new Date(currentYear, currentMonth, parseInt(date)).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {events.map((event) => {
                        const eventType = getEventTypeById(event.event_type);
                        return (
                          <div key={event.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all group">
                            <div className={`p-2 rounded-lg w-fit transition-all group-hover:scale-105 border ${eventType.badge}`}>
                              {eventType.icon}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-900">{event.title}</div>
                              <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-3 mt-1 font-medium">
                                <span>{event.time}</span> • <span>{event.duration}</span> •{' '}
                                <span>{event.participants?.join(', ') || 'No participants'}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => handleJoinEvent(event, e)}
                                className="px-3 py-1.5 rounded-full text-[10px] font-medium bg-gradient-to-r from-blue-600 to-bridge text-white hover:shadow-md hover:-translate-y-0.5 transition-all shadow-sm flex items-center gap-1.5 btn-press"
                              >
                                {event.event_type === 'call' ? <VideoIcon size={10} strokeWidth={2} /> : <Users size={10} strokeWidth={2} />}{' '}
                                Join
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShareEvent(event);
                                }}
                                className="px-3 py-1.5 rounded-full text-[10px] font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all shadow-sm flex items-center gap-1.5 btn-press"
                              >
                                <Share2 size={10} strokeWidth={2} /> Share
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* EVENT MODAL */}
      {showEventModal && selectedEvents.length > 0 && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
          onClick={() => setShowEventModal(false)}
          style={{ minHeight: '100vh', backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-in-scale border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900 tracking-tight">
                Events on {monthNames[currentMonth]} {selectedDate}
              </h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {selectedEvents.map((event) => {
                const eventType = getEventTypeById(event.event_type);
                return (
                  <div key={event.id} className={`p-4 rounded-xl border ${eventType.border} bg-white hover:shadow-md transition-all`}>
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`p-2 rounded-lg border ${eventType.badge}`}>{eventType.icon}</div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{event.title}</div>
                        <div className="text-xs text-gray-500 font-medium">{event.time}</div>
                      </div>
                    </div>
                    {event.description && <div className="text-xs text-gray-600 mb-2 ml-11 font-medium">{event.description}</div>}
                    <div className="text-xs text-gray-500 space-y-1 ml-11 font-medium">
                      <div>Duration: {event.duration}</div>
                      <div>Participants: {event.participants?.join(', ') || 'None'}</div>
                    </div>
                    <div className="flex gap-2 mt-3 ml-11">
                      <button
                        onClick={(e) => handleJoinEvent(event, e)}
                        className="text-xs font-medium px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-bridge text-white hover:shadow-md hover:-translate-y-0.5 transition-all shadow-sm flex items-center gap-1.5 btn-press"
                      >
                        {event.event_type === 'call' ? <VideoIcon size={10} strokeWidth={2} /> : <Users size={10} strokeWidth={2} />} Join
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareEvent(event);
                        }}
                        className="text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all flex items-center gap-1.5 btn-press"
                      >
                        <Share2 size={10} strokeWidth={2} /> Share
                      </button>
                      <button
                        onClick={(e) => handleDeleteEvent(event.id, e)}
                        className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-50 text-gray-500 hover:bg-rose-50 hover:text-rose-600 transition-all border border-gray-100 btn-press"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ADD EVENT MODAL */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
          onClick={() => {
            setShowAddModal(false);
            resetAddForm();
          }}
          style={{ minHeight: '100vh', backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-in-scale border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Add New Event</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetAddForm();
                }}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text"
                placeholder="Event title"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
              />
              <textarea
                placeholder="Description (optional)"
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition resize-none"
                rows={3}
              />
              <input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
              />
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={newEventAllDay}
                  onChange={(e) => setNewEventAllDay(e.target.checked)}
                  className="rounded border-gray-200"
                />{' '}
                All day
              </label>
              {!newEventAllDay && (
                <div className="flex gap-3">
                  <input
                    type="time"
                    value={newEventStart}
                    onChange={(e) => setNewEventStart(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                  />
                  <input
                    type="time"
                    value={newEventEnd}
                    onChange={(e) => setNewEventEnd(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">Event Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {eventTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setNewEventType(type.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all btn-press ${
                        newEventType === type.id ? `${type.badge} border-current` : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {type.icon}
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                placeholder="Participants (comma separated)"
                value={newEventParticipants}
                onChange={(e) => setNewEventParticipants(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
              />
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetAddForm();
                  }}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition btn-press"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition btn-press"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHARE EVENT MODAL */}
      {showShareModal && eventToShare && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
          onClick={() => setShowShareModal(false)}
          style={{ minHeight: '100vh', backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-in-scale border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Share Event</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-sm font-semibold text-gray-900">{eventToShare.title}</div>
                <div className="text-xs text-gray-500 mt-1">{eventToShare.time} • {eventToShare.duration}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                  Search for Memu user
                </label>
                <div className="relative">
                  <Search size={16} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={shareHandle}
                    onChange={(e) => setShareHandle(e.target.value)}
                    placeholder="Enter handle or name..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                  />
                </div>
              </div>
              {shareSearchResults.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Select user to share with:</label>
                  {shareSearchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSendShare(user.id, user.username)}
                      disabled={sharingEvent}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-blue-200 transition-all btn-press disabled:opacity-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                        {(user.full_name || user.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-semibold text-gray-900">{user.full_name || user.username}</div>
                        <div className="text-xs text-gray-500">@{user.username}.memu</div>
                      </div>
                      {sharingEvent ? <Loader2 size={16} className="animate-spin text-gray-400" /> : <Send size={16} className="text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
              {searchingHandles && (
                <div className="flex justify-center py-4">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition btn-press"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 10px; }
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