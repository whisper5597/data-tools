import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import SideNav from "../components/SideNav";
import JsonNode from "../components/JsonNode";
import TraceDialog from "../components/TraceDialog";
import ValueRenderer from "../components/ValueRenderer";

const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024;
const INDEX_CHUNK_SIZE = 4 * 1024 * 1024;

const formatFileSize = (size) => {
  if (size >= 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

const JSONLParser = () => {
  const [mode, setMode] = useState("normal"); // 'normal' or 'trace'
  const [content, setContent] = useState("");
  const [selectedPath, setSelectedPath] = useState(null);
  const [traceField, setTraceField] = useState(
    "line.messages || line.conversation"
  );
  const [textareaValue, setTextareaValue] = useState("");
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [goToLine, setGoToLine] = useState("");
  const [goToIndex, setGoToIndex] = useState("");
  const [copyStatus, setCopyStatus] = useState("复制");
  const [largeFileInfo, setLargeFileInfo] = useState(null);
  const [lineCount, setLineCount] = useState(0);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);
  const [indexError, setIndexError] = useState("");
  const [currentLineData, setCurrentLineData] = useState(null);
  const [currentLineError, setCurrentLineError] = useState("");
  const [isLineLoading, setIsLineLoading] = useState(false);

  const fileRef = useRef(null);
  const lineStartOffsetsRef = useRef([0]);
  const scanJobRef = useRef(0);
  const lineLoadJobRef = useRef(0);
  const lastLineReadKeyRef = useRef("");

  const resetLargeFileState = useCallback(() => {
    scanJobRef.current += 1;
    lineLoadJobRef.current += 1;
    lastLineReadKeyRef.current = "";
    fileRef.current = null;
    lineStartOffsetsRef.current = [0];
    setLargeFileInfo(null);
    setLineCount(0);
    setIsIndexing(false);
    setIndexProgress(0);
    setIndexError("");
    setCurrentLineData(null);
    setCurrentLineError("");
    setIsLineLoading(false);
  }, []);

  const buildLineIndex = useCallback(async (file, jobId) => {
    const offsets = [0];
    lineStartOffsetsRef.current = offsets;
    setIsIndexing(true);
    setIndexProgress(0);
    setIndexError("");

    let position = 0;
    let lastByte = null;

    try {
      while (position < file.size) {
        if (scanJobRef.current !== jobId) return;

        const end = Math.min(position + INDEX_CHUNK_SIZE, file.size);
        const buffer = await file.slice(position, end).arrayBuffer();
        const bytes = new Uint8Array(buffer);

        for (let i = 0; i < bytes.length; i += 1) {
          if (bytes[i] === 10) {
            offsets.push(position + i + 1);
          }
        }

        if (bytes.length > 0) {
          lastByte = bytes[bytes.length - 1];
        }

        position = end;
        setLineCount(Math.max(0, offsets.length - 1));
        setIndexProgress(Math.round((position / file.size) * 100));

        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      if (scanJobRef.current !== jobId) return;

      const finalLineCount =
        file.size === 0 ? 0 : lastByte === 10 ? offsets.length - 1 : offsets.length;
      setLineCount(finalLineCount);
      setIndexProgress(100);
    } catch (error) {
      if (scanJobRef.current === jobId) {
        console.error("Build JSONL index failed:", error);
        setIndexError("建立大文件索引失败，请确认文件可读。");
      }
    } finally {
      if (scanJobRef.current === jobId) {
        setIsIndexing(false);
      }
    }
  }, []);

  const startLargeFileMode = useCallback(
    (file) => {
      const jobId = scanJobRef.current + 1;
      scanJobRef.current = jobId;
      lineLoadJobRef.current += 1;
      lastLineReadKeyRef.current = "";
      fileRef.current = file;
      lineStartOffsetsRef.current = [0];

      setContent("");
      setSelectedPath(null);
      setTextareaValue(`已加载大文件: ${file.name}`);
      setCurrentLineIndex(0);
      setLargeFileInfo({ name: file.name, size: file.size });
      setLineCount(0);
      setCurrentLineData(null);
      setCurrentLineError("");
      setIsLineLoading(false);

      buildLineIndex(file, jobId);
    },
    [buildLineIndex]
  );

  const readLargeFileLine = useCallback(
    async (lineIndex) => {
      const file = fileRef.current;
      const offsets = lineStartOffsetsRef.current;
      const start = offsets[lineIndex];
      const nextStart = offsets[lineIndex + 1];

      if (!file || start === undefined || (nextStart === undefined && isIndexing)) {
        return;
      }

      const end = nextStart ?? file.size;
      const readKey = `${lineIndex}:${start}:${end}`;
      if (lastLineReadKeyRef.current === readKey) {
        return;
      }
      lastLineReadKeyRef.current = readKey;

      const jobId = lineLoadJobRef.current + 1;
      lineLoadJobRef.current = jobId;
      setIsLineLoading(true);
      setCurrentLineError("");

      try {
        const rawLine = await file.slice(start, end).text();
        const line = rawLine.replace(/\r?\n$/, "");

        if (lineLoadJobRef.current !== jobId) return;

        if (!line.trim()) {
          setCurrentLineData({
            error: `Line ${lineIndex + 1} is empty`,
            content: line,
          });
          return;
        }

        try {
          setCurrentLineData(JSON.parse(line));
        } catch {
          setCurrentLineData({
            error: `Line ${lineIndex + 1} is not valid JSON`,
            content: line,
          });
        }
      } catch (error) {
        if (lineLoadJobRef.current === jobId) {
          console.error("Read JSONL line failed:", error);
          setCurrentLineError("读取当前行失败。");
          setCurrentLineData(null);
        }
      } finally {
        if (lineLoadJobRef.current === jobId) {
          setIsLineLoading(false);
        }
      }
    },
    [isIndexing]
  );

  const parsedJson = useMemo(() => {
    if (largeFileInfo) return null;
    if (!content) return null;

    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      const lines = content.trim().split("\n");

      const parsedLines = lines
        .map((line, index) => {
          if (!line.trim()) return null;
          try {
            return JSON.parse(line);
          } catch {
            return {
              error: `Line ${index + 1} is not valid JSON`,
              content: line,
            };
          }
        })
        .filter(Boolean);

      if (parsedLines.length > 0 && parsedLines.some((l) => !l.error)) {
        return parsedLines;
      }

      return { error: "Invalid JSON or JSONL format" };
    }
  }, [content, largeFileInfo]);

  const currentData = useMemo(() => {
    if (largeFileInfo) return currentLineData;
    if (parsedJson && Array.isArray(parsedJson)) {
      return parsedJson[currentLineIndex];
    }
    return parsedJson;
  }, [currentLineData, currentLineIndex, largeFileInfo, parsedJson]);

  const selectedValue = useMemo(() => {
    if (!selectedPath || !currentData) {
      return null;
    }

    try {
      let value = currentData;
      for (const key of selectedPath.slice(1)) {
        value = value[key];
      }
      return value;
    } catch {
      return null;
    }
  }, [currentData, selectedPath]);

  const navigableTotal = largeFileInfo
    ? lineCount
    : parsedJson && Array.isArray(parsedJson)
      ? parsedJson.length
      : 0;
  const hasNavigableData = navigableTotal > 0;

  const handleCopy = () => {
    if (selectedValue === null || selectedValue === undefined) return;

    const textToCopy =
      typeof selectedValue === "object"
        ? JSON.stringify(selectedValue, null, 2)
        : String(selectedValue);

    navigator.clipboard.writeText(textToCopy).then(
      () => {
        setCopyStatus("已复制!");
        setTimeout(() => setCopyStatus("复制"), 1000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
        setCopyStatus("失败");
        setTimeout(() => setCopyStatus("复制"), 1000);
      }
    );
  };

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size >= LARGE_FILE_THRESHOLD) {
        startLargeFileMode(file);
        return;
      }

      resetLargeFileState();
      const reader = new FileReader();
      reader.onload = (e) => {
        setContent(e.target.result);
        setTextareaValue(`已加载文件: ${file.name}`);
        setCurrentLineIndex(0);
        setSelectedPath(null);
      };
      reader.readAsText(file);
    }
  }, [resetLargeFileState, startLargeFileMode]);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handlePrevious = () => {
    setCurrentLineIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (hasNavigableData) {
      setCurrentLineIndex((prev) => Math.min(navigableTotal - 1, prev + 1));
    }
  };

  const handleGoTo = () => {
    const lineNum = parseInt(goToLine, 10);
    if (!isNaN(lineNum) && hasNavigableData) {
      const targetIndex = lineNum - 1;
      if (targetIndex >= 0 && targetIndex < navigableTotal) {
        setCurrentLineIndex(targetIndex);
      } else if (largeFileInfo && isIndexing) {
        alert(`当前已索引到 ${navigableTotal} 行，请等待索引继续推进后再跳转。`);
      } else {
        alert(`无效的行号。请输入 1 到 ${navigableTotal} 之间的数字。`);
      }
    }
    setGoToLine("");
  };

  const handleGoToIndex = () => {
    const indexNum = parseInt(goToIndex, 10);
    if (!isNaN(indexNum)) {
      const element = document.getElementById(`trace-dialog-${indexNum}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        alert(`无效的索引。请输入一个有效的索引。`);
      }
    }
    setGoToIndex("");
  };

  const handleSelect = ({ path }) => {
    setSelectedPath(path);
  };

  useEffect(() => {
    if (!largeFileInfo || lineCount === 0) return;

    if (currentLineIndex >= lineCount) {
      setCurrentLineIndex(Math.max(0, lineCount - 1));
      return;
    }

    readLargeFileLine(currentLineIndex);
  }, [currentLineIndex, largeFileInfo, lineCount, readLargeFileLine]);

  useEffect(() => {
    window.addEventListener("drop", handleDrop);
    window.addEventListener("dragover", handleDragOver);

    return () => {
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("dragover", handleDragOver);
    };
  }, [handleDrop, handleDragOver]);

  return (
    <div className="fixed inset-0 flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <SideNav />
      <main className="ml-20 flex-1 p-8 flex flex-col overflow-auto">
        <h1 className="text-2xl font-bold mb-4">JSONL 解析</h1>

        {/* Dropzone and Input */}
        <div className="mb-4">
          <textarea
            className="w-full p-4 border-2 border-dashed rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
            placeholder="请将 JSONL 或 JSON 文件拖拽至页面任意位置，或在此处粘贴 JSON 内容"
            rows="1"
            value={textareaValue}
            onChange={(e) => {
              resetLargeFileState();
              setContent(e.target.value);
              setTextareaValue(e.target.value);
              setCurrentLineIndex(0);
              setSelectedPath(null);
            }}
          ></textarea>
          {largeFileInfo && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <span>
                大文件模式：{largeFileInfo.name}（{formatFileSize(largeFileInfo.size)}），
                {isIndexing
                  ? `正在建立行索引 ${indexProgress}% ，已发现 ${lineCount} 行`
                  : `索引完成，共 ${lineCount} 行`}
              </span>
              <span className="ml-2">当前仅按需读取单行内容，避免一次性载入完整文件。</span>
            </div>
          )}
          {indexError && (
            <p className="mt-2 text-sm text-red-500">{indexError}</p>
          )}
        </div>

        {/* Mode Switcher & Navigation Controls */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <button
              className={`px-4 py-2 rounded-l-lg ${
                mode === "normal"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
              onClick={() => setMode("normal")}
            >
              常规解析
            </button>
            <button
              className={`px-4 py-2 rounded-r-lg ${
                mode === "trace"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
              onClick={() => setMode("trace")}
            >
              模型轨迹
            </button>
          </div>

          {hasNavigableData && (
            <div className="flex items-center space-x-2">
              {mode === "trace" && (
                <>
                  <input
                    type="number"
                    className="p-2 border rounded-lg w-24 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    value={goToIndex}
                    onChange={(e) => setGoToIndex(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGoToIndex()}
                    placeholder="索引"
                  />
                  <button
                    className="px-4 py-2 rounded bg-blue-500 text-white"
                    onClick={handleGoToIndex}
                  >
                    定位
                  </button>
                </>
              )}
              <button
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
                onClick={handlePrevious}
                disabled={currentLineIndex === 0}
              >
                上一条
              </button>
              <button
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
                onClick={handleNext}
                disabled={currentLineIndex >= navigableTotal - 1}
              >
                下一条
              </button>
              <input
                type="number"
                className="p-2 border rounded-lg w-24 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                value={goToLine}
                onChange={(e) => setGoToLine(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGoTo()}
                placeholder="行号"
              />
              <button
                className="px-4 py-2 rounded bg-blue-500 text-white"
                onClick={handleGoTo}
              >
                跳转
              </button>
              <span className="text-gray-600 dark:text-gray-400">
                {`第 ${currentLineIndex + 1} / ${navigableTotal} 条`}
              </span>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex border rounded-lg overflow-hidden">
          {mode === "normal" ? (
            <div className="flex w-full">
              <div className="w-1/2 border-r p-4 overflow-auto">
                <h2 className="text-lg font-semibold mb-2">结构</h2>
                {(() => {
                  if (currentData) {
                    return (
                      <JsonNode
                        nodeKey={`Line ${currentLineIndex + 1}`}
                        value={currentData}
                        onSelect={handleSelect}
                      />
                    );
                  }
                  if (isLineLoading) {
                    return <p className="text-gray-500">正在读取当前行...</p>;
                  }
                  if (currentLineError) {
                    return <p className="text-red-500">{currentLineError}</p>;
                  }
                  return <p className="text-gray-500">未加载数据</p>;
                })()}
              </div>
              <div className="w-1/2 p-4 overflow-auto">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-semibold">内容</h2>
                  <button
                    className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                    onClick={handleCopy}
                    disabled={selectedValue === null || selectedValue === undefined}
                  >
                    {copyStatus}
                  </button>
                </div>
                <div className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-4 rounded">
                  <ValueRenderer value={selectedValue} />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full p-4 flex flex-col bg-gray-50 dark:bg-gray-800">
              <div className="mb-4">
                <label
                  htmlFor="trace-field"
                  className="block text-sm font-medium mb-1"
                >
                  自定义轨迹对话字段
                </label>
                <input
                  type="text"
                  id="trace-field"
                  className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  value={traceField}
                  onChange={(e) => setTraceField(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-auto">
                {(() => {
                  if (currentData) {
                    const fields = traceField
                      .split("||")
                      .map((f) => f.trim().replace("line.", ""));
                    let traceData = null;
                    for (const field of fields) {
                      if (
                        currentData &&
                        typeof currentData === "object" &&
                        field in currentData
                      ) {
                        traceData = currentData[field];
                        break;
                      }
                    }

                    if (Array.isArray(traceData)) {
                      return (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-2">
                            Line {currentLineIndex + 1}
                          </h3>
                          {traceData.map((dialog, i) => (
                            <TraceDialog
                              key={i}
                              id={`trace-dialog-${i}`}
                              role={dialog.role}
                              content={dialog.content}
                              index={i}
                            />
                          ))}
                        </div>
                      );
                    }
                  }
                  if (isLineLoading) {
                    return <p className="text-gray-500">正在读取当前行...</p>;
                  }
                  if (currentLineError) {
                    return <p className="text-red-500">{currentLineError}</p>;
                  }
                  return (
                    <p className="text-gray-500">加载 JSONL 数据以查看轨迹。</p>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default JSONLParser;
