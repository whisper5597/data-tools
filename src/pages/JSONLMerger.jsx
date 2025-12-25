import React, { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import SideNav from '../components/SideNav';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '../components/SortableItem';

const JSONLMerger = () => {
  const [files, setFiles] = useState([]);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const jsonlFiles = droppedFiles.filter(file => file.name.endsWith('.jsonl'));

    if (jsonlFiles.length !== droppedFiles.length) {
      alert('只接受 .jsonl 文件。其他文件已被忽略。');
    }

    const filesToAdd = [];
    for (const file of jsonlFiles) {
      const isDuplicate = files.some(existing => existing.file.name === file.name);
      if (isDuplicate) {
        if (window.confirm(`文件 "${file.name}" 已存在。要再次添加吗？`)) {
          filesToAdd.push({ id: `${file.name}-${Date.now()}-${Math.random()}`, file });
        }
      } else {
        filesToAdd.push({ id: `${file.name}-${Date.now()}-${Math.random()}`, file });
      }
    }

    if (filesToAdd.length > 0) {
      setFiles(prevFiles => [...prevFiles, ...filesToAdd]);
    }
  }, [files]);

  const handleDelete = (idToDelete) => {
    setFiles((currentFiles) => currentFiles.filter(file => file.id !== idToDelete));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleMerge = async () => {
    if (files.length === 0) {
      alert('请先添加要合并的 JSONL 文件。');
      return;
    }

    const contents = [];
    for (const { file } of files) {
      const text = await file.text();
      const trimmedText = text.trim();
      if (trimmedText) {
        contents.push(trimmedText);
      }
    }
    const mergedContent = contents.join('\n') + '\n';

    const blob = new Blob([mergedContent], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merged_${dayjs().format('YYYYMMDDHHmmss')}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFiles([]); // 合并成功后清空状态
  };

  return (
    <div className="fixed inset-0 flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100" onDragOver={handleDragOver} onDrop={handleDrop}>
      <SideNav />
      <main className="ml-20 flex-1 p-8 flex flex-col">
        <h1 className="text-2xl font-bold mb-4">JSONL 文件合并</h1>
        <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
          <div className="flex-1 p-4 overflow-auto">
            {files.length === 0 ? (
              <p className="text-gray-500">请将 JSONL 文件拖拽至页面任意位置。</p>
            ) : (
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={files.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  {files.map(fileData => <SortableItem key={fileData.id} id={fileData.id} name={fileData.file.name} onDelete={handleDelete} />)}
                </SortableContext>
              </DndContext>
            )}
          </div>
          <div className="p-4 border-t">
            <button className="px-4 py-2 rounded bg-blue-500 text-white" onClick={handleMerge}>合并</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default JSONLMerger;