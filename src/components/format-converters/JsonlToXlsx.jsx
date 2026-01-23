import React, { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const JsonlToXlsx = () => {
  const [file, setFile] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState('');

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const targetFile = droppedFiles.find(f => f.name.endsWith('.jsonl'));

    if (!targetFile) {
      alert('只接受 .jsonl 文件。');
      return;
    }
    setFile(targetFile);
    setError('');
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleConvert = async () => {
    if (!file) {
      setError('请提供文件。');
      return;
    }

    setIsConverting(true);
    setError('');

    try {
      const text = await file.text();
      const lines = text.trim().split('\n').filter(l => l.trim());
      const data = lines.map(line => {
          try {
              const parsed = JSON.parse(line);
              // 只做一级展开
              const flatData = {};
              for (const key in parsed) {
                  if (typeof parsed[key] === 'object' && parsed[key] !== null) {
                      flatData[key] = JSON.stringify(parsed[key]);
                  } else {
                      flatData[key] = parsed[key];
                  }
              }
              return flatData;
          } catch (e) {
              console.error('Error parsing JSON line:', e);
              return {};
          }
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      const outputFileName = `${file.name.replace(/\.jsonl$/, '')}_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`;
      XLSX.writeFile(workbook, outputFileName);
    } catch (e) {
      setError(`处理文件时出错: ${e.message}`);
    }

    setIsConverting(false);
  };

  const renderFileDropzone = () => (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="w-full h-48 p-4 border-2 border-dashed rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 flex items-center justify-center text-center cursor-pointer"
    >
      {file ? (
        <div>
          <p>已加载: {file.name}</p>
          <p className="text-sm text-gray-500">{formatBytes(file.size)}</p>
        </div>
      ) : (
        <p className="text-gray-500">拖拽 .jsonl 文件到这里</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {renderFileDropzone()}
      
      <button
        onClick={handleConvert}
        disabled={isConverting || !file}
        className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isConverting ? '转换中...' : '转换为 XLSX'}
      </button>

      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default JsonlToXlsx;