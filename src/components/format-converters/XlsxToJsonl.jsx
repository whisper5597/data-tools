import React, { useState, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Select } from 'antd';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const SortableFieldItem = ({ id, field, index, onToggle, onRename }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 'auto',
    boxShadow: isDragging ? '0 4px 8px rgba(0,0,0,0.1)' : 'none',
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div {...attributes} {...listeners} className="cursor-grab touch-none p-1">
        <GripVertical size={16} className="text-gray-400" />
      </div>
      <input
        type="checkbox"
        checked={field.isSelected}
        onChange={() => onToggle(index)}
        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
      />
      <label className="flex-1 text-sm font-medium truncate" title={field.name}>{field.name}</label>
      <label htmlFor={`custom-name-${index}`} className="text-sm text-gray-500 dark:text-gray-400">字段名:</label>
      <input
        id={`custom-name-${index}`}
        type="text"
        value={field.customName}
        onChange={(e) => onRename(index, e.target.value)}
        placeholder={field.name}
        className="w-1/3 p-1 text-sm border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

const XlsxToJsonl = () => {
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState([]);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [sheetNames, setSheetNames] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    const extractHeadersAndSheetNames = async () => {
      if (!file) {
        setFields([]);
        setSheetNames([]);
        setSheetName('');
        return;
      }
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const newSheetNames = workbook.SheetNames;
        setSheetNames(newSheetNames);

        let targetSheetName = sheetName;
        if (!targetSheetName || !newSheetNames.includes(targetSheetName)) {
          targetSheetName = newSheetNames[0] || '';
          setSheetName(targetSheetName);
        }
        
        if (targetSheetName) {
          const worksheet = workbook.Sheets[targetSheetName];
          if (!worksheet) {
            setFields([]);
            setError(`Sheet "${targetSheetName}" not found.`);
            return;
          }
          const header = (XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || []);
          setFields(header.map(name => ({
            name,
            isSelected: true,
            customName: name,
          })));
          setError('');
        } else {
          setFields([]);
          setError('XLSX 文件中没有找到任何 sheet 页。');
        }
      } catch (e) {
        setError(`提取表头时出错: ${e.message}`);
        setFields([]);
        setSheetNames([]);
      }
    };
    extractHeadersAndSheetNames();
  }, [file, sheetName]);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const targetFile = droppedFiles.find(f => f.name.endsWith('.xlsx'));

    if (!targetFile) {
      alert('只接受 .xlsx 文件。');
      return;
    }
    setSheetName('');
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
    const selectedFields = fields.filter(f => f.isSelected);
    if (selectedFields.length === 0) {
      setError('请至少选择一个要转换的列。');
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

      const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const headerRow = allData[0] || [];
      const dataRows = allData.slice(1);
      
      const headerIndexMap = new Map(headerRow.map((h, i) => [h, i]));
      
      const jsonData = dataRows.map((row, rowIndex) => {
        const obj = {};
        selectedFields.forEach(field => {
          const colIndex = headerIndexMap.get(field.name);
          if (colIndex !== undefined) {
            const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex });
            const cell = worksheet[cellAddress];
            let value = row[colIndex];
            
            if (cell && cell.l && cell.l.Target) {
              value = cell.l.Target;
            }
            
            if (value !== undefined) {
              obj[field.customName] = value;
            }
          }
        });
        return obj;
      });

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

  const handleFieldToggle = (index) => {
    const newFields = [...fields];
    newFields[index].isSelected = !newFields[index].isSelected;
    setFields(newFields);
  };

  const handleRenameField = (index, newName) => {
      const newFields = [...fields];
      newFields[index].customName = newName;
      setFields(newFields);
  };

  const handleSelectAll = () => {
      setFields(fields.map(f => ({ ...f, isSelected: true })));
  };

  const handleClearAll = () => {
      setFields(fields.map(f => ({ ...f, isSelected: false })));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex(item => item.name === active.id);
        const newIndex = items.findIndex(item => item.name === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
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

  const renderFieldSelection = () => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">自定义转换字段</h3>
            <div className="space-x-2">
                <button onClick={handleSelectAll} className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">全选</button>
                <button onClick={handleClearAll} className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">清空</button>
            </div>
        </div>
        <div className="p-2 border rounded-lg bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-600">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields.map(f => f.name)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {fields.map((field, index) => (
                  <SortableFieldItem
                    key={field.name}
                    id={field.name}
                    field={field}
                    index={index}
                    onToggle={handleFieldToggle}
                    onRename={handleRenameField}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {renderFileDropzone()}
      
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <label htmlFor="sheetName" className="text-gray-700 dark:text-gray-300">Sheet 名称:</label>
          <Select
            id="sheetName"
            value={sheetName}
            onChange={(value) => setSheetName(value)}
            style={{ width: 240 }}
            disabled={sheetNames.length === 0}
            options={sheetNames.map(name => ({ value: name, label: name }))}
          />
        </div>
      </div>

      {fields.length > 0 && renderFieldSelection()}

      <button
        onClick={handleConvert}
        disabled={isConverting || !file || fields.filter(f => f.isSelected).length === 0}
        className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isConverting ? '转换中...' : '转换为 JSONL'}
      </button>

      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default XlsxToJsonl;