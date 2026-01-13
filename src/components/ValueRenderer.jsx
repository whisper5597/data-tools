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
    return /\.(jpg|jpeg|png|gif|bmp|svg)$/i.test(url);
  };

  if (value === null || value === undefined) {
    return "在左侧选择一个值以在此处显示。";
  }

  if (isUrl(value)) {
    if (isImageUrl(value)) {
      return (
        <div>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline break-all"
          >
            {value}
          </a>
          <div className="mt-2 relative min-h-[50px]">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded text-gray-500">
                Loading image...
              </div>
            )}
            <img
              src={value}
              key={value}
              alt="preview"
              className="max-w-full h-auto rounded"
              onLoad={() => setIsLoading(false)}
              style={{ visibility: isLoading ? "hidden" : "visible" }}
            />
          </div>
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
