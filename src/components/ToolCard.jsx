import React from 'react';
import { ArrowRight } from 'lucide-react';

const ToolCard = ({ title, style }) => {
  return (
    <div 
      className="relative w-64 h-40 p-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out border border-white/30 dark:border-gray-700/50 group" 
      style={style}
    >
      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">点击进入工具</p>
      <div className="absolute bottom-6 right-6">
        <ArrowRight className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
      </div>
    </div>
  );
};

export default ToolCard;