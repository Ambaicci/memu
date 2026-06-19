'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, 
  Clock, Video, Users, X, ChevronDown, Phone, Video as VideoIcon, Filter,
  Heart, Plane, Briefcase, Utensils, Gift, Star, Activity, Coffee,
  Share2, Search, Link as LinkIcon, Send, Loader2
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

// EXPANDED EVENT TYPES - Including Custom/Open option
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
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(date).padStart(2,'0')}`;
      setNewEventDate(dateStr);
      setShowAddModal(true);
    }
  };

  const handleAddEventClick = () => {
    if (isGuest && requireAuth) {
      requireAuth('add event', () => setShowAddModal(true));
    } else {
      setNewEventDate(`${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(selectedDate || 1).padStart(2,'0')}`);
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
    const { error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: currentUserId,
        title: newEventTitle,
        description: newEventDescription,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        all_day: newEventAllDay,
        event_type: newEventType,
        participants: newEventParticipants.split(',').map(p => p.trim()).filter(p => p),
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
    
    // Create a shareable link/event notification
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

    const { error } = await supabase
      .from('event_shares')
      .insert(shareData);

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
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
    const todayDate = today.getDate();

    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(
        <div key={`empty-${i}`} className="bg-gray-50/50 min-h-[90px] p-2 border border-gray-100 rounded-xl" />
      );
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const events = eventsMap[d] || [];
      const isToday = isCurrentMonth && d === todayDate;
      const borderClass = events.length > 0 ? getEventTypeById(events[0].event_type).border : 'border-gray-100';
      
      calendarDays.push(
        <div
          key={d}
          onClick={() => handleDateClick(d)}
          className={`min-h-[90px] p-2 border-[1px] rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden ${borderClass} ${
            selectedDate === d ? 'bg-indigo-50 border-indigo-200 shadow-md' : 'bg-white hover:bg-gray-50'
          } ${isToday ? 'ring-2 ring-indigo-400 ring-offset-1' : ''} btn-press`}
        >
          <div className={`text-[13px] font-bold mb-1.5 ${isToday ? 'text-indigo-600' : 'text-gray-900'}`}>{d}</div>
          <div className="space-y-1">
            {events.slice(0, 2).map((event) => {
              const eventType = getEventTypeById(event.event_type);
              return (
                <div key={event.id} className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-semibold border ${eventType.badge}`}>
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
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-memu-canvas animate-page-enter">
      {/* Header Section */}
      <div className="px-6 md:px-10 pt-8 pb-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                <CalendarIcon size={22} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold uppercase tracking-wider">Schedule</span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold text-gray-900 leading-tight">Calendar</h1>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="text-sm text-gray-500 font-medium">{totalEvents} events this month</span>
            </div>
          </div>
          
          <button
            onClick={handleAddEventClick}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full text-sm font-semibold hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg btn-press"
          >
            <Plus size={16} strokeWidth={2.5} /> Add Event
          </button>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="px-6 md:px-10 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <button onClick={handlePrevMonth} className="w-9 h-9 border border-gray-200 rounded-xl flex items-center justify-center hover:border-gray-300 hover:bg-gray-50 transition-all text-gray-500 btn-press">
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <span className="text-lg font-bold text-gray-900">{monthNames[currentMonth]} {currentYear}</span>
            <button onClick={handleNextMonth} className="w-9 h-9 border border-gray-200 rounded-xl flex items-center justify-center hover:border-gray-300 hover:bg-gray-50 transition-all text-gray-500 btn-press">
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { const now = new Date(); setCurrentMonth(now.getMonth()); setCurrentYear(now.getFullYear()); setSelectedDate(now.getDate()); }} className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all btn-press">
              Today
            </button>
            <button onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all btn-press">
              {viewMode === 'month' ? 'Month' : 'Week'} <ChevronDown size={12} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map(day => (
            <div key={day} className="bg-gray-50 p-2 text-center text-[11px] font-bold text-gray-400 rounded-xl uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">{renderCalendar()}</div>
      </div>

      {/* Upcoming Events - Fixed Height Section */}
      <div className="px-6 md:px-10 py-6 border-t border-gray-200 bg-white/50 backdrop-blur-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
          <CalendarIcon size={16} strokeWidth={2.5} className="text-indigo-600" /> Upcoming Events
        </h3>
        {totalEvents === 0 ? (
          <div className="text-center text-gray-400 py-8 bg-white rounded-2xl border border-gray-100 animate-fade-in-scale">
            <p className="text-sm font-medium">No upcoming events. Click on a date to add one.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {Object.entries(eventsMap).slice(0, 5).map(([date, events], idx) => (
              <div key={date} className={`bg-white rounded-2xl border-[1px] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${getEventTypeById(events[0].event_type).border} p-4 animate-slide-up btn-press`} style={{ animationDelay: `${idx * 80}ms`, opacity: 0 }}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="sm:min-w-[80px]">
                    <div className="text-sm font-bold text-gray-900">{monthNames[currentMonth]} {date}</div>
                    <div className="text-[11px] text-gray-400 font-medium">{new Date(currentYear, currentMonth, parseInt(date)).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {events.map(event => {
                      const eventType = getEventTypeById(event.event_type);
                      return (
                        <div key={event.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all group">
                          <div className={`p-2 rounded-lg w-fit transition-all group-hover:scale-105 border ${eventType.badge}`}>
                            {eventType.icon}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900">{event.title}</div>
                            <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-3 mt-1 font-medium">
                              <span>{event.time}</span> • <span>{event.duration}</span> • <span>{event.participants?.join(', ') || 'No participants'}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={(e) => handleJoinEvent(event, e)} className="px-4 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md flex items-center gap-2 btn-press">
                              {event.event_type === 'call' ? <VideoIcon size={12} strokeWidth={2.5} /> : <Users size={12} strokeWidth={2.5} />} Join
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleShareEvent(event); }} className="px-4 py-2 rounded-full text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all shadow-sm flex items-center gap-2 btn-press">
                              <Share2 size={12} strokeWidth={2.5} /> Share
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
     
      {/* Event Modal - ALWAYS CENTERED */}
      {showEventModal && selectedEvents.length > 0 && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setShowEventModal(false)}>
          <div className="bg-white rounded-3xl w-[450px] max-w-full shadow-2xl border border-gray-200 animate-fade-in-scale max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-serif font-semibold text-gray-900">Events on {monthNames[currentMonth]} {selectedDate}</h3>
              <button onClick={() => setShowEventModal(false)} className="w-9 h-9 border border-gray-200 rounded-xl flex items-center justify-center hover:border-gray-300 hover:bg-gray-50 transition-all text-gray-500 btn-press">
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
            <div className="p-6 space-y-3 overflow-y-auto flex-1">
              {selectedEvents.map(event => {
                const eventType = getEventTypeById(event.event_type);
                return (
                  <div key={event.id} className={`p-4 rounded-2xl border-[1px] ${eventType.border} bg-white hover:shadow-lg transition-all btn-press`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${eventType.badge}`}>
                          {eventType.icon}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{event.title}</div>
                          <div className="text-[11px] text-gray-400 font-medium">{event.time}</div>
                        </div>
                      </div>
                    </div>
                    {event.description && (
                      <div className="text-xs text-gray-600 mb-2 ml-11 font-medium">{event.description}</div>
                    )}
                    <div className="text-xs text-gray-500 space-y-1 ml-11 font-medium">
                      <div>Duration: {event.duration}</div>
                      <div>Participants: {event.participants?.join(', ') || 'None'}</div>
                    </div>
                    <div className="flex gap-2 mt-3 ml-11">
                      <button onClick={(e) => handleJoinEvent(event, e)} className="text-xs font-semibold px-4 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md flex items-center gap-2 btn-press">
                        {event.event_type === 'call' ? <VideoIcon size={12} strokeWidth={2.5} /> : <Users size={12} strokeWidth={2.5} />} Join
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleShareEvent(event); }} className="text-xs font-semibold px-3 py-2 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all btn-press flex items-center gap-1.5">
                        <Share2 size={12} strokeWidth={2.5} /> Share
                      </button>
                      <button onClick={(e) => handleDeleteEvent(event.id, e)} className="text-xs font-semibold px-3 py-2 rounded-full bg-gray-50 text-gray-500 hover:bg-rose-50 hover:text-rose-600 transition-all border border-gray-100 btn-press">
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

      {/* Add Event Modal - ALWAYS CENTERED */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => { setShowAddModal(false); resetAddForm(); }}>
          <div className="bg-white rounded-3xl w-[450px] max-w-full shadow-2xl border border-gray-200 p-6 animate-fade-in-scale max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex-shrink-0 mb-5">
              <h3 className="text-lg font-serif font-semibold text-gray-900">Add New Event</h3>
            </div>
            <div className="space-y-4 overflow-y-auto flex-1">
              <input type="text" placeholder="Event title" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
              <textarea placeholder="Description (optional)" value={newEventDescription} onChange={e => setNewEventDescription(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none" rows={3} />
              <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" checked={newEventAllDay} onChange={e => setNewEventAllDay(e.target.checked)} className="rounded border-gray-200" /> All day
              </label>
              {!newEventAllDay && (
                <div className="flex gap-2">
                  <input type="time" value={newEventStart} onChange={e => setNewEventStart(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                  <input type="time" value={newEventEnd} onChange={e => setNewEventEnd(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Event Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {eventTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setNewEventType(type.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all btn-press ${
                        newEventType === type.id 
                          ? `${type.badge} border-current` 
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {type.icon}
                      <span className="text-xs font-semibold">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <input type="text" placeholder="Participants (comma separated)" value={newEventParticipants} onChange={e => setNewEventParticipants(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
            </div>
            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => { setShowAddModal(false); resetAddForm(); }} className="px-5 py-3 rounded-full text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all border border-gray-200 btn-press">
                Cancel
              </button>
              <button onClick={handleCreateEvent} className="px-5 py-3 rounded-full text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg btn-press">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Event Modal - ALWAYS CENTERED */}
      {showShareModal && eventToShare && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-3xl w-[450px] max-w-full shadow-2xl border border-gray-200 p-6 animate-fade-in-scale max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex-shrink-0 mb-5">
              <h3 className="text-lg font-serif font-semibold text-gray-900 mb-2">Share Event</h3>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-sm font-bold text-gray-900">{eventToShare.title}</div>
                <div className="text-xs text-gray-500 mt-1">{eventToShare.time} • {eventToShare.duration}</div>
              </div>
            </div>
            <div className="space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Search for Memu user</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={shareHandle}
                    onChange={(e) => setShareHandle(e.target.value)}
                    placeholder="Enter handle or name..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
              {shareSearchResults.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select user to share with:</label>
                  {shareSearchResults.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleSendShare(user.id, user.username)}
                      disabled={sharingEvent}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-indigo-200 transition-all btn-press disabled:opacity-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {(user.full_name || user.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-semibold text-gray-900">{user.full_name || user.username}</div>
                        <div className="text-xs text-gray-500">@{user.username}.memu</div>
                      </div>
                      {sharingEvent ? <Loader2 size={16} className="animate-spin text-gray-400" /> : <Send size={16} className="text-indigo-600" />}
                    </button>
                  ))}
                </div>
              )}
              {searchingHandles && (
                <div className="flex justify-center py-4">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setShowShareModal(false)} className="px-5 py-3 rounded-full text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all border border-gray-200 btn-press">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
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