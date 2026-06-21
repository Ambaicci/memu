import { NatureOption } from './types';

export const natureOptions: NatureOption[] = [
  { 
    id: 'fyi', 
    label: 'FYI', 
    desc: 'No action required. Just for your information.', 
    style: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200' 
  },
  { 
    id: 'decide', 
    label: 'Decide', 
    desc: 'I need your decision or approval on this.', 
    style: 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200' 
  },
  { 
    id: 'resolve', 
    label: 'Resolve', 
    desc: 'Requires discussion to solve a problem.', 
    style: 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200' 
  },
  { 
    id: 'urgent', 
    label: 'Urgent', 
    desc: 'Time-sensitive. Needs immediate attention.', 
    style: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' 
  },
];