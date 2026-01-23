import React, { useState, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

// --- SVG Icons ---
const HomeIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z" />
  </svg>
);

const ParserIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
  </svg>
);

const MergerIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 4h-4l-4-4-4 4H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 12l-4-4h3V9h2v3h3l-4 4z"/>
  </svg>
);

const FilterIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
  </svg>
);

const ConverterIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
  </svg>
);

const navItems = [
  { to: '/', text: '首页', icon: HomeIcon },
  { to: '/jsonl-parser', text: 'JSONL 解析', icon: ParserIcon },
  { to: '/jsonl-merger', text: 'JSONL 文件合并', icon: MergerIcon },
  { to: '/jsonl-filter', text: 'JSONL 条件过滤', icon: FilterIcon },
  { to: '/format-converter', text: '格式转换', icon: ConverterIcon },
];

const SideNav = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTextVisible, setIsTextVisible] = useState(false);
  const location = useLocation();
  const timerRef = useRef(null);

  const handleMouseEnter = () => {
    setIsExpanded(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setIsTextVisible(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsTextVisible(false);
    setIsExpanded(false);
  };

  return (
    <nav
      className={`fixed h-full flex flex-col bg-white dark:bg-gray-800 shadow-lg z-10 transition-all duration-300 ease-in-out ${isExpanded ? 'w-64' : 'w-20'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex flex-col items-center flex-1 p-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center w-full h-12 px-4 rounded-lg mb-2 transition-all duration-200
                ${isActive
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
                ${!isExpanded ? 'justify-center' : ''}`
              }
              title={isExpanded ? '' : item.text}
            >
              <item.icon className="w-6 h-6 flex-shrink-0" />
              <span className={`ml-4 whitespace-nowrap transition-opacity duration-200 ${isTextVisible && isExpanded ? 'opacity-100' : 'opacity-0'} ${isExpanded ? '' : 'hidden'}`}>
                {item.text}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default SideNav;