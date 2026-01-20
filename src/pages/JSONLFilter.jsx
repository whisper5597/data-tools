import React, { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import SideNav from '../components/SideNav';

// Helper to get nested property, e.g., getProperty({ a: { b: 5 } }, 'a.b') returns 5
const getProperty = (obj, path) => {
  if (!path) return undefined;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const JSONLFilter = () => {
  const [mode, setMode] = useState('single'); // 'single' or 'double'
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [condition, setCondition] = useState('');
  const [keyForSetB, setKeyForSetB] = useState('');
  const [filterResult, setFilterResult] = useState(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const [error, setError] = useState('');

  const handleDrop = useCallback((event, fileSlot) => {
    event.preventDefault();
    event.stopPropagation();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const jsonlFile = droppedFiles.find(file => file.name.endsWith('.jsonl'));

    if (!jsonlFile) {
      alert('只接受 .jsonl 文件。');
      return;
    }

    if (mode === 'single') {
      setFileA(jsonlFile);
    } else {
      if (fileSlot === 'A') {
        setFileA(jsonlFile);
      } else if (fileSlot === 'B') {
        setFileB(jsonlFile);
      }
    }
    setFilterResult(null);
    setError('');
  }, [mode]);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleFilter = async () => {
    setIsFiltering(true);
    setError('');
    setFilterResult(null);

    if (mode === 'single') {
      if (!fileA || !condition) {
        setError('请提供文件和过滤条件。');
        setIsFiltering(false);
        return;
      }
      
      try {
        const text = await fileA.text();
        const lines = text.trim().split('\n').filter(l => l.trim());
        const originalCount = lines.length;
        const keptLines = [];
        
        const filterFn = new Function('line', `try { return ${condition}; } catch (e) { console.error('Filter condition error:', e); return false; }`);

        for (const lineStr of lines) {
          try {
            const line = JSON.parse(lineStr);
            if (filterFn(line)) {
              keptLines.push(lineStr);
            }
          } catch (e) {
            console.error('Error parsing JSON line:', e);
          }
        }
        
        setFilterResult({
          originalCount,
          finalCount: keptLines.length,
          filteredCount: originalCount - keptLines.length,
          keptLines,
        });

      } catch (e) {
        setError(`处理文件时出错: ${e.message}`);
      }

    } else { // double mode
      if (!fileA || !fileB || !keyForSetB || !condition) {
        setError('请提供两个文件、右侧文件取值字段和过滤条件。');
        setIsFiltering(false);
        return;
      }

      try {
        // Build set from file B
        const textB = await fileB.text();
        const linesB = textB.trim().split('\n').filter(l => l.trim());
        const setB = new Set();
        for (const lineStr of linesB) {
          try {
            const line = JSON.parse(lineStr);
            const value = getProperty(line, keyForSetB);
            if (value !== undefined) {
              setB.add(value);
            }
          } catch (e) {
            console.error('Error parsing JSON line from file B:', e);
          }
        }

        // Filter file A
        const textA = await fileA.text();
        const linesA = textA.trim().split('\n').filter(l => l.trim());
        const originalCount = linesA.length;
        const keptLines = [];

        const filterFn = new Function('lineA', 'setB', `try { return ${condition}; } catch (e) { console.error('Filter condition error:', e); return false; }`);

        for (const lineStr of linesA) {
          try {
            const lineA = JSON.parse(lineStr);
            if (filterFn(lineA, setB)) {
              keptLines.push(lineStr);
            }
          } catch (e) {
            console.error('Error parsing JSON line from file A:', e);
          }
        }

        setFilterResult({
          originalCount,
          finalCount: keptLines.length,
          filteredCount: originalCount - keptLines.length,
          keptLines,
        });

      } catch (e) {
        setError(`处理文件时出错: ${e.message}`);
      }
    }

    setIsFiltering(false);
  };

  const handleExport = () => {
    if (!filterResult || !fileA) return;

    const { keptLines, finalCount } = filterResult;
    const mergedContent = keptLines.join('\n') + '\n';
    const blob = new Blob([mergedContent], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const originalFileName = fileA.name.replace(/\.jsonl$/, '');
    a.download = `${originalFileName}_${finalCount}_${dayjs().format('YYYYMMDDHHmmss')}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetState = () => {
    setFileA(null);
    setFileB(null);
    setFilterResult(null);
    setError('');
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    resetState();
  };

  const renderFileDropzone = (file, onDrop, placeholder) => (
    <div
      onDrop={onDrop}
      onDragOver={handleDragOver}
      className="w-full h-32 p-4 border-2 border-dashed rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 flex items-center justify-center text-center cursor-pointer"
    >
      {file ? (
        <div>
          <p>已加载: {file.name}</p>
          <p className="text-sm text-gray-500">{formatBytes(file.size)}</p>
        </div>
      ) : (
        <p className="text-gray-500">{placeholder}</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <SideNav />
      <main className="ml-20 flex-1 p-8 flex flex-col overflow-auto">
        <h1 className="text-2xl font-bold mb-4">JSONL 条件过滤</h1>

        <div className="flex justify-start items-center mb-4">
          <button
            className={`px-4 py-2 rounded-l-lg ${mode === 'single' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            onClick={() => handleModeChange('single')}
          >
            单文件过滤
          </button>
          <button
            className={`px-4 py-2 rounded-r-lg ${mode === 'double' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            onClick={() => handleModeChange('double')}
          >
            双文件对比过滤
          </button>
        </div>

        {mode === 'single' ? (
          <div className="space-y-4">
            {renderFileDropzone(fileA, (e) => handleDrop(e), '将 JSONL 文件拖拽至此')}
            <div>
              <label htmlFor="condition-single" className="block text-sm font-medium mb-1">过滤条件</label>
              <input
                type="text"
                id="condition-single"
                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="例如，想保存所有 passRate 大于 0 的行，输入: line.passRate > 0"
              />
               <p className="text-xs text-gray-500 mt-1">
                使用 <code>line</code> 代表文件中的每一行数据 (JSON对象)。
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex space-x-4">
              <div className="w-1/2">
                {renderFileDropzone(fileA, (e) => handleDrop(e, 'A'), '将主文件 (文件A) 拖拽至此')}
              </div>
              <div className="w-1/2">
                {renderFileDropzone(fileB, (e) => handleDrop(e, 'B'), '将条件文件 (文件B) 拖拽至此')}
              </div>
            </div>
            <div>
              <label htmlFor="keyForSetB" className="block text-sm font-medium mb-1">右侧文件生成Set所用字段</label>
              <input
                type="text"
                id="keyForSetB"
                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                value={keyForSetB}
                onChange={(e) => setKeyForSetB(e.target.value)}
                placeholder="通常选取唯一标识字段，例如: prompt_id"
              />
            </div>
            <div>
              <label htmlFor="condition-double" className="block text-sm font-medium mb-1">过滤条件</label>
              <input
                type="text"
                id="condition-double"
                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="例如，想保存所有 prompt_id 不在 setB 中的行，输入: !setB.has(lineA.prompt_id)"
              />
              <p className="text-xs text-gray-500 mt-1">
                使用 <code>lineA</code> 代表主文件中的行, <code>setB</code> 代表从条件文件生成的 Set.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4">
          <button
            className="px-4 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
            onClick={handleFilter}
            disabled={isFiltering}
          >
            {isFiltering ? '过滤中...' : '开始过滤'}
          </button>
          {filterResult && (
            <button
              className="ml-4 px-4 py-2 rounded bg-green-500 text-white"
              onClick={handleExport}
            >
              导出过滤结果
            </button>
          )}
        </div>

        {error && <p className="mt-4 text-red-500">{error}</p>}

        {filterResult && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 className="text-lg font-semibold mb-2">过滤预览</h3>
            <p>原文件行数: {filterResult.originalCount}</p>
            <p>过滤行数: {filterResult.filteredCount}</p>
            <p>最终保留行数: {filterResult.finalCount}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default JSONLFilter;