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

const XlsxToJsonl = () => {
  const [file, setFile] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [linkColumns, setLinkColumns] = useState('');

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const targetFile = droppedFiles.find(f => f.name.endsWith('.xlsx'));

    if (!targetFile) {
      alert('只接受 .xlsx 文件。');
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
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const targetSheetName = sheetName || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[targetSheetName];
      if (!worksheet) {
        throw new Error(`Sheet "${targetSheetName}" not found.`);
      }

      const linkCols = linkColumns.split(',').map(s => s.trim()).filter(Boolean);
      const headerRow = (XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || []);
      const headerMap = new Map(headerRow.map((header, i) => [header, i]));
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (linkCols.length > 0) {
        jsonData.forEach((row, rowIndex) => {
          linkCols.forEach(colName => {
            const colIndex = headerMap.get(colName);
            if (row[colName] !== undefined && colIndex !== undefined) {
              const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex });
              const cell = worksheet[cellAddress];
              if (cell && cell.l && cell.l.Target) {
                row[colName] = cell.l.Target;
              }
            }
          });
        });
      }

      const jsonlContent = jsonData.map(obj => JSON.stringify(obj)).join('\n');
      const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const outputFileName = `${file.name.replace(/\.xlsx$/, '')}_${dayjs().format('YYYYMMDDHHmmss')}.jsonl`;
      a.download = outputFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
        <p className="text-gray-500">拖拽 .xlsx 文件到这里</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {renderFileDropzone()}
      
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <label htmlFor="sheetName" className="text-gray-700 dark:text-gray-300">Sheet 名称:</label>
          <input
            id="sheetName"
            type="text"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            placeholder="默认为第一页"
            className="p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 dark:border-gray-600"
          />
        </div>
        <div className="flex items-center space-x-4">
          <label htmlFor="linkColumns" className="text-gray-700 dark:text-gray-300">链接列:</label>
          <input
            id="linkColumns"
            type="text"
            value={linkColumns}
            onChange={(e) => setLinkColumns(e.target.value)}
            placeholder="列名，多个用英文逗号分隔，示例：url"
            className="p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 dark:border-gray-600 flex-grow"
          />
        </div>
      </div>

      <button
        onClick={handleConvert}
        disabled={isConverting || !file}
        className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isConverting ? '转换中...' : '转换为 JSONL'}
      </button>

      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default XlsxToJsonl;