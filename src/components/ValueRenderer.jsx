import React, { useState } from "react";

export default function ValueRenderer({ value }) {
  const [isLoading, setIsLoading] = useState(true);

  const isUrl = (string) => {
    if (typeof string !== "string") return false;
    try {
      new URL(string);
      return true;
    } catch (e) {
      console.error("URL validation error:", e);
      return false;
    }
  };


  const isImageUrl = (url) => {
    if (typeof url !== "string") return false;
    return /\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i.test(url);
  };

  const isBase64Image = (string) => {
    if (typeof string !== "string") return false;
    return string.startsWith("data:image/") && string.includes(";base64,");
  };

  const openBase64ImageInNewTab = (e) => {
    e.preventDefault();
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(`<html><head><title>Image Preview</title></head><body style="margin:0; background:#222;"><img src="${value}" style="max-width:100%; display:block; margin:auto;"></body></html>`);
      newWindow.document.close();
    }
  };

  const isHtml = (str) => {
    if (typeof str !== "string") return false;

    const trimmed = str.trim();

    // ✅ 更宽松一点：允许前面有空白/BOM/注释
    if (!/<!DOCTYPE html>/i.test(trimmed)) return false;

    // ✅ 用解析兜底
    const doc = new DOMParser().parseFromString(trimmed, "text/html");

    return doc.documentElement?.tagName.toLowerCase() === "html";
  };

  const openHtmlInNewTab = () => {
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(value);
      newWindow.document.close();
    }
  };

  if (value === null || value === undefined) {
    return "在左侧选择一个值以在此处显示。";
  }

  if (isBase64Image(value)) {
    return (
      <div>
        <div className="mb-2 relative min-h-[50px]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded text-gray-500">
              Loading image...
            </div>
          )}
          <img
            src={value}
            key={value}
            alt="preview"
            className="max-w-full h-auto rounded cursor-pointer"
            onLoad={() => setIsLoading(false)}
            onClick={openBase64ImageInNewTab}
            style={{ visibility: isLoading ? "hidden" : "visible" }}
          />
        </div>
        <a
          href="#"
          onClick={openBase64ImageInNewTab}
          className="text-blue-500 hover:underline break-all"
        >
          {value}
        </a>
      </div>
    );
  }

  if (isHtml(value)) {
    return (
      <div className="flex flex-col border rounded-md overflow-hidden shadow-sm my-2 border-gray-200">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase">HTML Preview</span>
          <button
            type="button"
            onClick={openHtmlInNewTab}
            className="px-3 py-1 text-xs font-medium bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors shadow-sm"
          >
            在新标签页中查看
          </button>
        </div>
        <div className="p-3 bg-white overflow-auto max-h-[450px]">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all font-mono m-0">
            {value}
          </pre>
        </div>
      </div>
    );
  }

  if (isUrl(value)) {
    if (isImageUrl(value)) {
      return (
        <div>
          <div className="mt-2 relative min-h-[50px]">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded text-gray-500">
                Loading image...
              </div>
            )}
            <a href={value} target="_blank" rel="noopener noreferrer">
              <img
                src={value}
                key={value}
                alt="preview"
                className="max-w-full h-auto rounded cursor-pointer"
                onLoad={() => setIsLoading(false)}
                style={{ visibility: isLoading ? "hidden" : "visible" }}
              />
            </a>
          </div>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline break-all"
          >
            {value}
          </a>
        </div>
      );
    }
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline break-all"
      >
        {value}
      </a>
    );
  }

  return String(value);
}
