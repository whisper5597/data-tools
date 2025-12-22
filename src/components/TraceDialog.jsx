import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import remarkBreaks from 'remark-breaks';

const CustomCodeBlock = ({ node, inline, className, children, ...props }) => {
  const [buttonText, setButtonText] = useState('复制');
  const match = /language-(\w+)/.exec(className || '');

  if (inline || !match) {
    return <code className={className} {...props}>{children}</code>;
  }

  const getTextFromNode = (n) => {
    if (n.type === 'text') {
      return n.value;
    }
    if (n.children && Array.isArray(n.children)) {
      return n.children.map(getTextFromNode).join('');
    }
    return '';
  };

  const codeText = node.children.map(getTextFromNode).join('');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setButtonText('已复制!');
    setTimeout(() => {
      setButtonText('复制');
    }, 2000);
  };

  return (
    <div className="relative my-2">
      <pre className={`${className} p-4 rounded-lg overflow-x-auto`}>
        <code {...props}>{children}</code>
      </pre>
      <button
        className="absolute top-2 right-2 text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-500"
        onClick={handleCopy}
      >
        {buttonText}
      </button>
    </div>
  );
};

const TraceDialog = ({ role, content, index, id }) => {
  const [isMd, setIsMd] = useState(true);

  const roleColor = {
    system: 'bg-green-100 dark:bg-green-900',
    assistant: 'bg-white dark:bg-gray-800',
    user: 'bg-blue-100 dark:bg-blue-900',
  };

  return (
    <div id={id} className={`p-4 rounded-lg mb-4 ${roleColor[role] || 'bg-gray-100 dark:bg-gray-700'}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold capitalize">{role}</span>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-4">索引：{index}</span>
          <button 
            className={`text-xs px-2 py-1 rounded ${isMd ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}
            onClick={() => setIsMd(true)}
          >
            MD
          </button>
          <button 
            className={`text-xs px-2 py-1 rounded ml-2 ${!isMd ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}
            onClick={() => setIsMd(false)}
          >
            常规
          </button>
        </div>
      </div>
      <div className="prose dark:prose-invert">
        {isMd ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              code: CustomCodeBlock,
            }}
          >
            {content}
          </ReactMarkdown>
        ) : (
          <div className="whitespace-pre-wrap text-sm break-all">{JSON.stringify(content).slice(1, -1)}</div>
        )}
      </div>
    </div>
  );
};

export default TraceDialog;