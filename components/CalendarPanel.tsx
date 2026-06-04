'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, 
  Clock, Video, Users, X, ChevronDown, Phone, Video as VideoIcon 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  event_type: 'call' | 'meeting' | 'reminder';
  participants: string[];
  description?: string;
  date: number;        // day of month (derived)
  time: string;        // formatted start time
  duration?: string;   // computed
}

interface CalendarPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatEventTime = (start: string, end: string, allDay: boolean) => {
  if (allDay) return 'All day';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endStr = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${startStr} – ${endStr}`;
};

const computeDuration = (start: string, end: string) => {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours}h ${minutes}m`;
};

const getEventColorForBorder = (type: string): string => {
  switch (type) {
    case 'call': return '#4f46e5';
    case 'meeting': return '#059669';
    default: return '#d97706';
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

const getJoinButtonStyle = (type: string): string => {
  switch (type) {
    case 'call':
      return 'bg-gradient-to-r from-[#4f46e5] to-[#6366f1] hover:from-[#6366f1] hover:to-[#818cf8] text-white';
    case 'meeting':
      return 'bg-gradient-to-r from-[#059669] to-[#10b981] hover:from-[#10b981] hover:to-[#34d399] text-white';
    default:
      return 'bg-gradient-to-r from-[#d97706] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#fbbf24] text-white';
  }
};

export default function CalendarPanel({ isGuest, requireAuth }: CalendarPanelProps = {}) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [eventsMap, setEventsMap] = useState<Record<number, CalendarEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventStart, setNewEventStart] = useState('09:00');
  const [newEventEnd, setNewEventEnd] = useState('10:00');
  const [newEventType, setNewEventType] = useState<'call' | 'meeting' | 'reminder'>('meeting');
  const [newEventParticipants, setNewEventParticipants] = useState('');
  const [newEventAllDay, setNewEventAllDay] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  // Fetch events for the current month
  const fetchEvents = useCallback(async () => {
    if (!currentUserId) return;
    const supabase = createClient();
    setLoading(true);
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
      setLoading(false);
      return;
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
        start_time: ev.start_time,
        end_time: ev.end_time,
        all_day: ev.all_day,
        event_type: ev.event_type,
        participants: ev.participants || [],
        description: ev.description,
        date: day,
        time: timeStr,
        duration,
      });
    }
    setEventsMap(map);
    setLoading(false);
  }, [currentUserId, currentMonth, currentYear]);

  useEffect(() => {
    if (currentUserId) fetchEvents();
  }, [fetchEvents, currentUserId]);

  const handleDateClick = (date: number) => {
    setSelectedDate(date);
    const events = eventsMap[date] || [];
    setSelectedEvents(events);
    if (events.length > 0) setShowEventModal(true);
    else {
      // If no events, open add event modal pre-filled with this date
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
      alert('Please enter a title');
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
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        all_day: newEventAllDay,
        event_type: newEventType,
        participants: newEventParticipants.split(',').map(p => p.trim()).filter(p => p),
      });
    if (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    } else {
      setShowAddModal(false);
      resetAddForm();
      fetchEvents();
    }
  };

  const resetAddForm = () => {
    setNewEventTitle('');
    setNewEventDate('');
    setNewEventStart('09:00');
    setNewEventEnd('10:00');
    setNewEventType('meeting');
    setNewEventParticipants('');
    setNewEventAllDay(false);
  };

  const handleJoinEvent = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    alert(`Joining ${event.title}... 🎥`);
  };

  const handleDeleteEvent = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this event?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
    if (error) alert('Failed to delete event');
    else {
      fetchEvents();
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
        <div key={`empty-${i}`} className="bg-[#fafaf8] min-h-[100px] p-2 border border-[#e8e7e3] rounded-lg" />
      );
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const events = eventsMap[d] || [];
      const isToday = isCurrentMonth && d === todayDate;
      let borderStyle = {};
      if (events.length === 1) {
        const color = getEventColorForBorder(events[0].event_type);
        borderStyle = { borderTopWidth: '1px', borderTopColor: color + '40' };
      } else if (events.length >= 2) {
        const gradientColors = events.map(e => getEventColorForBorder(e.event_type) + '40').join(', ');
        borderStyle = { borderTopWidth: '1px', borderImage: `linear-gradient(to right, ${gradientColors}) 1` };
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
          <div className={`text-[13px] font-medium mb-1.5 ${isToday ? 'text-[#4f46e5]' : 'text-[#3a3a3a]'}`}>{d}</div>
          <div className="space-y-1">
            {events.slice(0, 2).map((event) => (
              <div key={event.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                event.event_type === 'call' ? 'bg-[#e0e7ff] text-[#4338ca]' :
                event.event_type === 'meeting' ? 'bg-[#d1fae5] text-[#059669]' :
                'bg-[#fef3c7] text-[#d97706]'
              }`}>
                {event.time} {event.title}
              </div>
            ))}
            {events.length > 2 && <div className="text-[9px] text-[#777] px-1.5">+{events.length - 2} more</div>}
          </div>
        </div>
      );
    }
    return calendarDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Calendar</h1>
            <p className="text-[13px] text-[#777] mt-1">Schedule calls, meetings, and reminders</p>
          </div>
          <button onClick={handleAddEventClick} className="flex items-center gap-2 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl px-4 py-2.5 text-[13px] font-medium hover:shadow-lg transition">
            <Plus size={15} /> Add Event
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <button onClick={handlePrevMonth} className="p-2 border border-[#e8e7e3] rounded-lg hover:border-[#777] transition"><ChevronLeft size={18} /></button>
            <span className="text-[18px] font-medium text-[#0f0f0f]">{monthNames[currentMonth]} {currentYear}</span>
            <button onClick={handleNextMonth} className="p-2 border border-[#e8e7e3] rounded-lg hover:border-[#777] transition"><ChevronRight size={18} /></button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { const now = new Date(); setCurrentMonth(now.getMonth()); setCurrentYear(now.getFullYear()); setSelectedDate(now.getDate()); }} className="px-4 py-1.5 text-[13px] border border-[#e8e7e3] rounded-lg hover:border-[#777]">Today</button>
            <button onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')} className="px-4 py-1.5 text-[13px] border border-[#e8e7e3] rounded-lg hover:border-[#777] flex items-center gap-1">{viewMode === 'month' ? 'Month' : 'Week'} <ChevronDown size={12} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map(day => <div key={day} className="bg-[#f2f1ee] p-2 text-center text-[11px] font-medium text-[#777] rounded-lg">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">{renderCalendar()}</div>

        <div className="mt-8">
          <h3 className="text-[15px] font-medium text-[#0f0f0f] mb-3 flex items-center gap-2"><CalendarIcon size={16} className="text-[#777]" /> Upcoming</h3>
          {Object.keys(eventsMap).length === 0 ? (
            <div className="text-center text-[#777] py-8">No upcoming events. Click on a date to add one.</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(eventsMap).slice(0, 5).map(([date, events]) => (
                <div key={date} className="bg-white border border-[#e8e7e3] rounded-xl p-4 hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="sm:min-w-[80px]"><div className="text-[14px] font-medium text-[#0f0f0f]">{monthNames[currentMonth]} {date}</div><div className="text-[10px] text-[#777]">{new Date(currentYear, currentMonth, parseInt(date)).toLocaleDateString('en-US', { weekday: 'short' })}</div></div>
                    <div className="flex-1 space-y-2">
                      {events.map(event => (
                        <div key={event.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-[#fafaf8] rounded-lg hover:shadow-sm transition">
                          <div className={`p-2 rounded-lg w-fit ${getEventColor(event.event_type)}`}>
                            {event.event_type === 'call' ? <Phone size={14} /> : event.event_type === 'meeting' ? <Users size={14} /> : <Clock size={14} />}
                          </div>
                          <div className="flex-1"><div className="text-[14px] font-medium text-[#0f0f0f]">{event.title}</div><div className="text-[11px] text-[#777] flex flex-wrap items-center gap-3 mt-1"><span>{event.time}</span>•<span>{event.duration}</span>•<span>{event.participants?.join(', ') || 'No participants'}</span></div></div>
                          <button onClick={(e) => handleJoinEvent(event, e)} className={`px-4 py-1.5 rounded-lg text-[11px] font-medium transition flex items-center gap-1.5 ${getJoinButtonStyle(event.event_type)}`}>{event.event_type === 'call' ? <VideoIcon size={12} /> : <Users size={12} />} Join</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && selectedEvents.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEventModal(false)}>
          <div className="bg-white rounded-2xl w-[450px] max-w-[90%] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[#e8e7e3] flex justify-between items-center"><h3 className="text-[18px] font-['Playfair_Display']">Events on {monthNames[currentMonth]} {selectedDate}</h3><button onClick={() => setShowEventModal(false)}><X size={18} /></button></div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {selectedEvents.map(event => (
                <div key={event.id} className={`p-4 rounded-xl border ${getEventColor(event.event_type)} hover:shadow-md transition`}>
                  <div className="flex justify-between items-start mb-2"><div className="flex items-center gap-2">{event.event_type === 'call' ? <Phone size={14} /> : event.event_type === 'meeting' ? <Users size={14} /> : <Clock size={14} />}<span className="text-[15px] font-medium">{event.title}</span></div><span className="text-[12px] text-[#777]">{event.time}</span></div>
                  <div className="text-[12px] text-[#777] space-y-1 ml-7"><div>Duration: {event.duration}</div><div>Participants: {event.participants?.join(', ') || 'None'}</div></div>
                  <div className="flex gap-2 mt-3 ml-7"><button onClick={(e) => handleJoinEvent(event, e)} className={`text-[11px] font-medium px-4 py-1.5 rounded-lg flex items-center gap-1.5 ${getJoinButtonStyle(event.event_type)}`}>{event.event_type === 'call' ? <VideoIcon size={12} /> : <Users size={12} />} Join</button><button onClick={(e) => handleDeleteEvent(event.id, e)} className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300">Delete</button></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowAddModal(false); resetAddForm(); }}>
          <div className="bg-white rounded-2xl w-[450px] max-w-[90%] shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Add New Event</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Event title" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} className="w-full border border-[#e8e7e3] rounded-lg px-3 py-2 text-sm" />
              <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} className="w-full border border-[#e8e7e3] rounded-lg px-3 py-2 text-sm" />
              <label className="flex items-center gap-2"><input type="checkbox" checked={newEventAllDay} onChange={e => setNewEventAllDay(e.target.checked)} /> All day</label>
              {!newEventAllDay && <div className="flex gap-2"><input type="time" value={newEventStart} onChange={e => setNewEventStart(e.target.value)} className="flex-1 border border-[#e8e7e3] rounded-lg px-3 py-2 text-sm" /><input type="time" value={newEventEnd} onChange={e => setNewEventEnd(e.target.value)} className="flex-1 border border-[#e8e7e3] rounded-lg px-3 py-2 text-sm" /></div>}
              <select value={newEventType} onChange={e => setNewEventType(e.target.value as any)} className="w-full border border-[#e8e7e3] rounded-lg px-3 py-2 text-sm"><option value="call">Call</option><option value="meeting">Meeting</option><option value="reminder">Reminder</option></select>
              <input type="text" placeholder="Participants (comma separated)" value={newEventParticipants} onChange={e => setNewEventParticipants(e.target.value)} className="w-full border border-[#e8e7e3] rounded-lg px-3 py-2 text-sm" />
              <div className="flex justify-end gap-2 pt-2"><button onClick={() => { setShowAddModal(false); resetAddForm(); }} className="px-4 py-2 border rounded-lg">Cancel</button><button onClick={handleCreateEvent} className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg">Save</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}