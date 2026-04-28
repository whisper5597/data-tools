import { useMemo, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import JSZip from 'jszip';
import SideNav from '../components/SideNav';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getBaseFileName = (fileName) => fileName.replace(/\.jsonl$/i, '');
const READ_CHUNK_SIZE = 1024 * 1024 * 4;

const analyzeFileChunks = async (file, linesPerChunk, onProgress) => {
  const chunkMetaList = [];
  let offset = 0;
  let lineStartByte = 0;
  let totalLines = 0;
  let currentChunkLineCount = 0;
  let currentChunkStartLine = 1;
  let currentChunkStartByte = 0;

  while (offset < file.size) {
    const buffer = await file.slice(offset, offset + READ_CHUNK_SIZE).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    for (let index = 0; index < bytes.length; index += 1) {
      if (bytes[index] !== 10) continue;

      const absoluteNewLineOffset = offset + index + 1;
      totalLines += 1;
      currentChunkLineCount += 1;

      if (currentChunkLineCount === linesPerChunk) {
        chunkMetaList.push({
          startLine: currentChunkStartLine,
          endLine: totalLines,
          lineCount: currentChunkLineCount,
          startByte: currentChunkStartByte,
          endByte: absoluteNewLineOffset,
        });
        currentChunkLineCount = 0;
        currentChunkStartLine = totalLines + 1;
        currentChunkStartByte = absoluteNewLineOffset;
      }

      lineStartByte = absoluteNewLineOffset;
    }

    offset += bytes.length;
    onProgress?.(Math.min(offset, file.size), file.size);
  }

  if (lineStartByte < file.size) {
    totalLines += 1;
    currentChunkLineCount += 1;
  }

  if (currentChunkLineCount > 0) {
    chunkMetaList.push({
      startLine: currentChunkStartLine,
      endLine: totalLines,
      lineCount: currentChunkLineCount,
      startByte: currentChunkStartByte,
      endByte: file.size,
    });
  }

  onProgress?.(file.size, file.size);

  return {
    totalLines,
    chunks: chunkMetaList,
  };
};

const JSONLSplitter = () => {
  const [file, setFile] = useState(null);
  const [linesPerChunk, setLinesPerChunk] = useState('1000');
  const [analysis, setAnalysis] = useState(null);
  const [analysisChunkSize, setAnalysisChunkSize] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const loadFile = useCallback(async (targetFile) => {
    if (!targetFile.name.toLowerCase().endsWith('.jsonl')) {
      setError('只接受 .jsonl 文件。');
      return;
    }

    setFile(targetFile);
    setAnalysis(null);
    setAnalysisChunkSize(0);
    setProgress(0);
    setError('');
  }, []);

  const handleDrop = useCallback(async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const droppedFile = Array.from(event.dataTransfer.files).find((item) =>
      item.name.toLowerCase().endsWith('.jsonl')
    );

    if (!droppedFile) {
      setError('请拖入一个 .jsonl 文件。');
      return;
    }

    await loadFile(droppedFile);
  }, [loadFile]);

  const handleFileChange = async (event) => {
    const targetFile = event.target.files?.[0];
    if (!targetFile) return;
    await loadFile(targetFile);
    event.target.value = '';
  };

  const chunkSize = useMemo(() => {
    const parsed = parseInt(linesPerChunk, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
  }, [linesPerChunk]);

  const chunks = analysis?.chunks ?? [];
  const hasFreshAnalysis = Boolean(analysis) && analysisChunkSize === chunkSize;

  const runAnalysis = useCallback(async () => {
    if (!file) {
      setError('请先上传一个 JSONL 文件。');
      return null;
    }

    if (!chunkSize) {
      setError('请填写大于 0 的每份行数。');
      return null;
    }

    setIsProcessing(true);
    setError('');
    setProgress(0);

    try {
      const result = await analyzeFileChunks(file, chunkSize, (loaded, total) => {
        if (!total) return;
        setProgress(Math.round((loaded / total) * 100));
      });

      setAnalysis(result);
      setAnalysisChunkSize(chunkSize);
      return result;
    } catch (e) {
      setError(`分析文件失败: ${e.message}`);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [file, chunkSize]);

  const handleSplitAndDownload = async () => {
    if (!file) {
      setError('请先上传一个 JSONL 文件。');
      return;
    }

    if (!chunkSize) {
      setError('请填写大于 0 的每份行数。');
      return;
    }

    setIsProcessing(true);
    setError('');
    setProgress(0);

    try {
      const currentAnalysis = hasFreshAnalysis ? analysis : await analyzeFileChunks(
        file,
        chunkSize,
        (loaded, total) => {
          if (!total) return;
          setProgress(Math.round((loaded / total) * 100));
        }
      );

      if (!currentAnalysis?.chunks.length) {
        setError('文件中没有可切分的行。');
        return;
      }

      setAnalysis(currentAnalysis);
      setAnalysisChunkSize(chunkSize);

      const zip = new JSZip();
      const baseName = getBaseFileName(file.name);

      currentAnalysis.chunks.forEach((chunk) => {
        const fileName = `${baseName}_${chunk.startLine}-${chunk.endLine}.jsonl`;
        zip.file(fileName, file.slice(chunk.startByte, chunk.endByte));
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_split_${chunkSize}_${dayjs().format('YYYYMMDDHHmmss')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(`打包下载失败: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <SideNav />
      <main className="ml-20 flex-1 p-8 flex flex-col overflow-auto">
        <h1 className="text-2xl font-bold mb-4">JSONL 按行切分</h1>

        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
            <div
              className="w-full h-40 p-4 border-2 border-dashed rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 flex items-center justify-center text-center"
            >
              {file ? (
                <div>
                  <p>已加载: {file.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatBytes(file.size)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500">将 JSONL 文件拖拽到此处</p>
                  <p className="text-sm text-gray-500 mt-1">或点击下方按钮选择文件</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-4">
              <label
                htmlFor="jsonl-split-file"
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 cursor-pointer"
              >
                选择文件
              </label>
              <input
                id="jsonl-split-file"
                type="file"
                accept=".jsonl"
                className="hidden"
                onChange={handleFileChange}
              />

              {file && (
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-red-500 text-white"
                  onClick={() => {
                    setFile(null);
                    setAnalysis(null);
                    setAnalysisChunkSize(0);
                    setProgress(0);
                    setError('');
                  }}
                >
                  清空
                </button>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
            <label htmlFor="lines-per-chunk" className="block text-sm font-medium mb-2">
              每个结果文件包含的行数
            </label>
            <input
              id="lines-per-chunk"
              type="number"
              min="1"
              className="w-full max-w-xs p-2 border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600"
              value={linesPerChunk}
              onChange={(event) => setLinesPerChunk(event.target.value)}
              placeholder="例如 1000"
            />
            <p className="text-sm text-gray-500 mt-2">
              输出文件名会追加行号区间后缀，例如 <code>sample_1-1000.jsonl</code>。
            </p>
            <p className="text-sm text-gray-500 mt-1">
              为避免大文件拖入时崩溃，文件只会在分析或导出时按 4MB 分块扫描。
            </p>
          </div>

          {error && (
            <div className="border border-red-300 text-red-500 rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
              {error}
            </div>
          )}

          {isProcessing && (
            <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">处理进度</h2>
                <span className="text-sm text-gray-500">{progress}%</span>
              </div>
              <div className="w-full h-3 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {file && chunkSize > 0 && hasFreshAnalysis && (
            <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
              <h2 className="text-lg font-semibold mb-3">切分预览</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-3 rounded bg-gray-50 dark:bg-gray-900">
                  <p className="text-sm text-gray-500">总行数</p>
                  <p className="text-xl font-semibold">{analysis.totalLines}</p>
                </div>
                <div className="p-3 rounded bg-gray-50 dark:bg-gray-900">
                  <p className="text-sm text-gray-500">每份行数</p>
                  <p className="text-xl font-semibold">{chunkSize}</p>
                </div>
                <div className="p-3 rounded bg-gray-50 dark:bg-gray-900">
                  <p className="text-sm text-gray-500">预计文件数</p>
                  <p className="text-xl font-semibold">{chunks.length}</p>
                </div>
              </div>

              <div className="max-h-72 overflow-auto border rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                    <tr>
                      <th className="px-4 py-2">文件名</th>
                      <th className="px-4 py-2">行数区间</th>
                      <th className="px-4 py-2">条数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunks.map((chunk) => {
                      const baseName = getBaseFileName(file.name);
                      const fileName = `${baseName}_${chunk.startLine}-${chunk.endLine}.jsonl`;

                      return (
                        <tr
                          key={fileName}
                          className="border-t border-gray-200 dark:border-gray-700"
                        >
                          <td className="px-4 py-2">{fileName}</td>
                          <td className="px-4 py-2">
                            {chunk.startLine} - {chunk.endLine}
                          </td>
                          <td className="px-4 py-2">{chunk.lineCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-50 mr-4"
              onClick={runAnalysis}
              disabled={!file || !chunkSize || isProcessing}
            >
              {isProcessing ? '处理中...' : '分析切分'}
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
              onClick={handleSplitAndDownload}
              disabled={!file || !chunkSize || isProcessing}
            >
              {isProcessing ? '打包中...' : '切分并下载 ZIP'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default JSONLSplitter;
