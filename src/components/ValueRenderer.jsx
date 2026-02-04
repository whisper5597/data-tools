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
