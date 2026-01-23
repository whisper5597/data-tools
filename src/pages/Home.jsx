import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ToolCard from '../components/ToolCard';

const Home = () => {
  const [maskOpacity, setMaskOpacity] = useState(0.4);

  const backgroundUrl = 'https://api.oick.cn/api/bing';

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = backgroundUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.error('Canvas context is not available');
        return;
      }

      canvas.width = canvas.height = 10;
      ctx.drawImage(img, 0, 0, 10, 10);

      const data = ctx.getImageData(0, 0, 10, 10).data;
      let total = 0;
      for (let i = 0; i < data.length; i += 4) {
        total += (data[i] + data[i+1] + data[i+2]) / 3;
      }

      const avg = total / (data.length / 4);
      console.log('avg', avg);
      setMaskOpacity(avg > 180 ? 0.3 : 0);
    };
  }, [backgroundUrl]);

  return (
    <div className="fixed inset-0 flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <main 
        className="relative flex-1 flex flex-col items-center justify-center p-8 bg-cover bg-center transition-all duration-1000 ease-in-out"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      >
        <div
          className="absolute inset-0 bg-black transition-opacity"
          style={{ opacity: maskOpacity }}
        ></div>
        <div className="relative max-w-4xl w-full text-center">
          <h1 className="text-5xl font-bold mb-4 text-white drop-shadow-lg hero-title">
            Data Tools
          </h1>

          <a
            href="https://www.larkoffice.com/invitation/page/add_contact/?token=1d2u0887-abe6-49fc-b77e-7b3791693f3a"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white text-lg drop-shadow-md inline-block mb-8 hero-title">
            有 good idea 可点击此处通过飞书留言～
          </a>
          
          <div className="flex justify-center items-center gap-8">
            <Link to="/jsonl-parser">
              <ToolCard title="JSONL 解析器" />
            </Link>
            <Link to="/jsonl-merger">
              <ToolCard title="JSONL 文件合并" />
            </Link>
            <Link to="/jsonl-filter">
              <ToolCard title="JSONL 条件过滤" />
            </Link>
            <Link to="/format-converter">
              <ToolCard title="格式转换" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;