import React, { useState, useCallback, useEffect, useMemo } from "react";
import SideNav from "../components/SideNav";
import JsonNode from "../components/JsonNode";
import TraceDialog from "../components/TraceDialog";

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

  const parsedJson = useMemo(() => {
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
  }, [content]);

  const selectedValue = useMemo(() => {
    if (!selectedPath || !parsedJson || !Array.isArray(parsedJson)) {
      return null;
    }

    const currentData = parsedJson[currentLineIndex];
    if (!currentData) return null;

    try {
      let value = currentData;
      for (const key of selectedPath.slice(1)) {
        value = value[key];
      }
      return value;
    } catch {
      return null;
    }
  }, [parsedJson, currentLineIndex, selectedPath]);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setContent(e.target.result);
        setTextareaValue(`已加载文件: ${file.name}`);
        setCurrentLineIndex(0);
      };
      reader.readAsText(file);
    }
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handlePrevious = () => {
    setCurrentLineIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (parsedJson && Array.isArray(parsedJson)) {
      setCurrentLineIndex((prev) => Math.min(parsedJson.length - 1, prev + 1));
    }
  };

  const handleGoTo = () => {
    const lineNum = parseInt(goToLine, 10);
    if (!isNaN(lineNum) && parsedJson && Array.isArray(parsedJson)) {
      const targetIndex = lineNum - 1;
      if (targetIndex >= 0 && targetIndex < parsedJson.length) {
        setCurrentLineIndex(targetIndex);
      } else {
        alert(`无效的行号。请输入 1 到 ${parsedJson.length} 之间的数字。`);
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

  const handleSelect = ({ value, path }) => {
    setSelectedPath(path);
  };

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
              setContent(e.target.value);
              setTextareaValue(e.target.value);
              setCurrentLineIndex(0);
            }}
          ></textarea>
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

          {parsedJson && Array.isArray(parsedJson) && parsedJson.length > 0 && (
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
                disabled={currentLineIndex === parsedJson.length - 1}
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
                {`第 ${currentLineIndex + 1} / ${parsedJson.length} 条`}
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
                  const currentData =
                    parsedJson && Array.isArray(parsedJson)
                      ? parsedJson[currentLineIndex]
                      : parsedJson;
                  if (currentData) {
                    return (
                      <JsonNode
                        nodeKey={`Line ${currentLineIndex + 1}`}
                        value={currentData}
                        onSelect={handleSelect}
                      />
                    );
                  }
                  return <p className="text-gray-500">未加载数据</p>;
                })()}
              </div>
              <div className="w-1/2 p-4 overflow-auto">
                <h2 className="text-lg font-semibold mb-2">内容</h2>
                <div className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-4 rounded">
                  {selectedValue !== null
                    ? String(selectedValue)
                    : "在左侧选择一个值以在此处显示。"}
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
                  const currentLine =
                    parsedJson && Array.isArray(parsedJson)
                      ? parsedJson[currentLineIndex]
                      : null;
                  if (currentLine) {
                    const fields = traceField
                      .split("||")
                      .map((f) => f.trim().replace("line.", ""));
                    let traceData = null;
                    for (const field of fields) {
                      if (
                        currentLine &&
                        typeof currentLine === "object" &&
                        field in currentLine
                      ) {
                        traceData = currentLine[field];
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
