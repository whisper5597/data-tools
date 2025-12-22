import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ToolCard from '../components/ToolCard';

const Home = () => {
  const [backgroundUrl, setBackgroundUrl] = useState('');

  useEffect(() => {
    setBackgroundUrl('https://api.oick.cn/api/bing');
  }, []);

  return (
    <div className="fixed inset-0 flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <main 
        className="flex-1 flex flex-col items-center justify-center p-8 bg-cover bg-center transition-all duration-1000 ease-in-out"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      >
        {/* <div className="absolute inset-0 bg-black/30"></div> */}
        <div className="relative max-w-4xl w-full text-center">
          <h1 className="text-5xl font-bold mb-4 text-white drop-shadow-lg">
            Data Tools
          </h1>

          <a href="https://www.larkoffice.com/invitation/page/add_contact/?token=1d2u0887-abe6-49fc-b77e-7b3791693f3a" target="_blank" rel="noopener noreferrer" className="text-white text-lg drop-shadow-md inline-block mb-8">
            有 good idea 可点击此处通过飞书留言～
          </a>
          
          <div className="flex justify-center items-center gap-8">
            <Link to="/jsonl-parser">
              <ToolCard title="JSONL 解析器" />
            </Link>
            <Link to="/jsonl-merger">
              <ToolCard title="JSONL 文件合并" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;