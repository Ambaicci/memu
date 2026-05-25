'use client';

import { useState } from 'react';
import SpaceHeader from './SpaceHeader';
import SpaceChat from './SpaceChat';
import SpaceFiles from './SpaceFiles';
import SpaceCalls from './SpaceCalls';
import SpaceTasks from './SpaceTasks';
import SpaceBoards from './SpaceBoards';
import SpaceMembers from './SpaceMembers';
import SpaceMemus from './SpaceMemus';
import BoardView from '../boards/BoardView';

interface Space {
  id: string;
  name: string;
  description: string;
  color: string;
  memberCount: number;
  messageCount: number;
  lastActive: string;
}

interface Message {
  id: number;
  from: string;
  initials: string;
  color: string;
  textColor: string;
  text: string;
  time: string;
  mine: boolean;
}

interface FileItem {
  id: string;
  name: string;
  type: 'doc' | 'sheet' | 'slide' | 'image' | 'pdf' | 'video' | 'audio' | 'archive';
  size: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface Call {
  id: string;
  title: string;
  time: string;
  date: string;
  participants: string[];
  type: 'scheduled' | 'recurring';
  isVideo?: boolean;
}

interface Task {
  id: string;
  title: string;
  assignedTo: string;
  dueDate: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

interface Board {
  id: string;
  name: string;
  description: string;
  color: string;
  memberCount: number;
  messageCount: number;
  lastActive: string;
  isPrivate: boolean;
  members: Array<{
    id: string;
    name: string;
    handle: string;
    initials: string;
    color: string;
    textColor: string;
    role: 'owner' | 'member';
  }>;
  messages: Message[];
}

interface SpaceViewProps {
  space: Space;
  onBack: () => void;
  onUpdateSpace: (space: Space) => void;
}

// Demo data for different spaces
const spaceData: Record<string, {
  messages: Message[];
  files: FileItem[];
  calls: Call[];
  tasks: Task[];
  boards: Board[];
}> = {
  work: {
    messages: [
      { id: 1, from: 'Aisha Kimani', initials: 'AK', color: '#e1f5ee', textColor: '#0f6e56', text: 'Good morning team — board deck review at 2PM.', time: '8:02 AM', mine: false },
      { id: 2, from: 'David Osei', initials: 'DO', color: '#ede9fe', textColor: '#5b21b6', text: "I'll have the product section ready.", time: '8:14 AM', mine: false },
      { id: 3, from: 'You', initials: 'JM', color: '#1a1a1a', textColor: 'white', text: "Perfect. Let's meet at 1:45 for a dry run.", time: '8:20 AM', mine: true },
      { id: 4, from: 'Tobias Nguyen', initials: 'TN', color: '#f0f9ff', textColor: '#0369a1', text: 'Staging is stable now.', time: '9:11 AM', mine: false },
    ],
    files: [
      { id: '1', name: 'Q4 Strategy Document.pdf', type: 'pdf', size: '2.4 MB', uploadedBy: 'Aisha', uploadedAt: 'Yesterday' },
      { id: '2', name: 'Product Roadmap 2025.pptx', type: 'slide', size: '5.1 MB', uploadedBy: 'David', uploadedAt: '2 days ago' },
    ],
    calls: [
      { id: '1', title: 'Product Sync', time: '2:00 PM', date: new Date().toISOString().split('T')[0], participants: ['Aisha', 'David', 'Tobias'], type: 'scheduled', isVideo: true },
    ],
    tasks: [
      { id: '1', title: 'Finalize Q4 budget', assignedTo: 'Aisha', dueDate: 'Tomorrow', completed: false, priority: 'high', createdAt: 'Today' },
      { id: '2', title: 'Review product roadmap', assignedTo: 'David', dueDate: 'Friday', completed: false, priority: 'medium', createdAt: 'Today' },
    ],
    boards: [],
  },
  friends: {
    messages: [
      { id: 1, from: 'Amara', initials: 'AM', color: '#ecfdf5', textColor: '#065f46', text: 'Sunday at Cultiva? 🌿', time: 'Saturday', mine: false },
      { id: 2, from: 'Kofi', initials: 'KO', color: '#fef3c7', textColor: '#92400e', text: "I'm in!", time: 'Saturday', mine: false },
      { id: 3, from: 'You', initials: 'JM', color: '#1a1a1a', textColor: 'white', text: '4ish works for me.', time: 'Saturday', mine: true },
    ],
    files: [],
    calls: [],
    tasks: [],
    boards: [],
  },
  family: {
    messages: [
      { id: 1, from: 'Mum', initials: 'MM', color: '#fce7f3', textColor: '#9d174d', text: 'Did you book your flight?', time: '2 days ago', mine: false },
      { id: 2, from: 'You', initials: 'JM', color: '#1a1a1a', textColor: 'white', text: 'Yes Mum! Flying in on the 23rd.', time: '2 days ago', mine: true },
    ],
    files: [],
    calls: [],
    tasks: [],
    boards: [],
  },
  design: {
    messages: [
      { id: 1, from: 'David Osei', initials: 'DO', color: '#ede9fe', textColor: '#5b21b6', text: 'The mockups are ready for review.', time: 'Monday', mine: false },
      { id: 2, from: 'You', initials: 'JM', color: '#1a1a1a', textColor: 'white', text: "Let's review them together.", time: 'Monday', mine: true },
    ],
    files: [],
    calls: [],
    tasks: [],
    boards: [],
  },
};

type ToolType = 'chat' | 'memus' | 'files' | 'calls' | 'tasks' | 'boards' | 'members';

export default function SpaceView({ space, onBack, onUpdateSpace }: SpaceViewProps) {
  const [activeTool, setActiveTool] = useState<ToolType>('chat');
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  
  const data = spaceData[space.id] || { messages: [], files: [], calls: [], tasks: [], boards: [] };

  // If a board is selected, show BoardView
  if (selectedBoard) {
    return (
      <BoardView 
        board={selectedBoard}
        onBack={() => setSelectedBoard(null)}
        currentUser="You"
      />
    );
  }

  const renderToolContent = () => {
    switch (activeTool) {
      case 'chat':
        return <SpaceChat spaceId={space.id} spaceName={space.name} initialMessages={data.messages} />;
      case 'memus':
        return <SpaceMemus spaceId={space.id} spaceName={space.name} />;
      case 'files':
        return <SpaceFiles spaceId={space.id} initialFiles={data.files} />;
      case 'calls':
        return <SpaceCalls spaceId={space.id} initialCalls={data.calls} />;
      case 'tasks':
        return <SpaceTasks spaceId={space.id} initialTasks={data.tasks} />;
      case 'boards':
        return <SpaceBoards spaceId={space.id} initialBoards={data.boards} onOpenBoard={setSelectedBoard} />;
      case 'members':
        return <SpaceMembers spaceId={space.id} spaceName={space.name} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fafaf8]">
      <SpaceHeader
        spaceName={space.name}
        spaceColor={space.color}
        memberCount={space.memberCount}
        activeTool={activeTool}
        onBack={onBack}
        onToolChange={setActiveTool}
      />
      <div className="flex-1 overflow-y-auto p-6">
        {renderToolContent()}
      </div>
    </div>
  );
}