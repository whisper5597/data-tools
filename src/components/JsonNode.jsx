import React, { useState } from 'react';

const JsonNode = ({ nodeKey, value, onSelect, path = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);
  const isArray = Array.isArray(value);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSelect = () => {
    if (!isObject && !isArray) {
      onSelect({ value, path: [...path, nodeKey] });
    }
  };

  const getPreview = (val) => {
    if (isObject || isArray) {
      const values = Object.values(val)
        .filter(v => typeof v !== 'object' || v === null)
        .map(String);
      let preview = values.join(', ');
      if (preview.length > 50) {
        preview = preview.substring(0, 50) + '...';
      }
      return <span className="ml-2 text-gray-500">{preview}</span>;
    }
    return null;
  };

  if (isObject || isArray) {
    return (
      <div className="ml-4">
        <div className="flex items-center cursor-pointer" onClick={handleToggle}>
          <span className="mr-1">{isExpanded ? '▼' : '▶'}</span>
          <span className="font-semibold">{nodeKey}:</span>
          {!isExpanded && getPreview(value)}
        </div>
        {isExpanded && (
          <div className="ml-4 border-l border-gray-300 dark:border-gray-600">
            {Object.entries(value).map(([key, childValue]) => (
              <JsonNode key={key} nodeKey={key} value={childValue} onSelect={onSelect} path={[...path, nodeKey]} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ml-4 cursor-pointer" onClick={handleSelect}>
      <span className="font-semibold">{nodeKey}:</span>
      <span className="ml-2 text-blue-500">
        {String(value).length > 500
          ? `${String(value).substring(0, 500)}...`
          : String(value)}
      </span>
    </div>
  );
};

export default JsonNode;