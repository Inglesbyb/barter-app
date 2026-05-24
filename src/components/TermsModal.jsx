import React from 'react';
import { motion } from 'framer-motion';

const TermsModal = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 to-blue-600" />
        <h2 className="text-3xl font-black text-gray-900 mb-6 tracking-tight">Safety First! 🛡️</h2>
        <div className="space-y-4 text-gray-600 font-medium mb-10">
          <p>SwitchR is a matching platform only. To ensure your safety while bartering:</p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center shrink-0"><span className="text-[10px] text-cyan-600 font-black">1</span></div>
              <span>Always meet in a <b>well-lit public place</b> (coffee shops, police station lobbies).</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center shrink-0"><span className="text-[10px] text-cyan-600 font-black">2</span></div>
              <span><b>Tell a friend</b> where you're going and share your location.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center shrink-0"><span className="text-[10px] text-cyan-600 font-black">3</span></div>
              <span><b>Never</b> share personal financial details or home address.</span>
            </li>
          </ul>
        </div>
        <button 
          onClick={onAccept}
          className="w-full py-5 bg-cyan-500 text-white rounded-2xl font-black text-lg hover:bg-cyan-600 shadow-xl shadow-cyan-500/20 active:scale-[0.98] transition-all"
        >
          I Understand & Agree
        </button>
      </motion.div>
    </div>
  );
};

export default React.memo(TermsModal);
