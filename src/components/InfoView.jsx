import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Users, ArrowLeft, ChevronDown } from 'lucide-react';

const InfoView = ({ onBack }) => {

  const [expanded, setExpanded] = useState('swap');

  const sections = [
    {
      id: 'swap',
      title: 'How to Swap',
      icon: <Zap size={20} />,
      content: '1. Browse items in the Explore feed.\n2. Swipe right to make an offer.\n3. Select one of your items to bid.\n4. If they accept, the chat unlocks!'
    },
    {
      id: 'safety',
      title: 'Safety Tips',
      icon: <Shield size={20} />,
      content: '• Meet in public, well-lit places.\n• Bring a friend if possible.\n• Inspect items thoroughly before trading.\n• Never share personal financial details.'
    },
    {
      id: 'guidelines',
      title: 'Community Guidelines',
      icon: <Users size={20} />,
      content: '• Be respectful and honest.\n• No illegal or prohibited items.\n• Honor your accepted trades.\n• Keep communication within the app.'
    }
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 scroll-container safe-area-bottom pb-32">
      <div className="px-6 py-8 flex items-center gap-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Information Hub</h2>
      </div>

      <div className="p-6 space-y-5">
        {sections.map(s => (
          <div key={s.id} className="border border-gray-100 rounded-[2.5rem] overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
            <button 
              onClick={() => setExpanded(expanded === s.id ? '' : s.id)}
              className="w-full flex items-center justify-between p-7 bg-white"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-cyan-500 flex items-center justify-center">{s.icon}</div>
                <span className="font-black text-gray-900 tracking-tight text-lg">{s.title}</span>
              </div>
              <ChevronDown size={22} className={`text-gray-300 transition-transform duration-500 ${expanded === s.id ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {expanded === s.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="p-8 pt-0 text-sm text-gray-600 font-medium leading-relaxed whitespace-pre-line border-t border-gray-50 bg-slate-50/50">
                    {s.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      
      <div className="p-6 text-center">
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">SwitchR v1.0.4</p>
      </div>
    </div>
  );
};

export default React.memo(InfoView);
