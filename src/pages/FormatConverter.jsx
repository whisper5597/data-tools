import React, { useState } from 'react';
import SideNav from '../components/SideNav';
import XlsxToJsonl from '../components/format-converters/XlsxToJsonl';
import JsonlToXlsx from '../components/format-converters/JsonlToXlsx';

const converters = {
  'xlsx2jsonl': {
    name: 'XLSX 转 JSONL',
    component: <XlsxToJsonl />,
  },
  'jsonl2xlsx': {
    name: 'JSONL 转 XLSX',
    component: <JsonlToXlsx />,
  },
};

const FormatConverter = () => {
  const [activeConverter, setActiveConverter] = useState('xlsx2jsonl');

  return (
    <div className="fixed inset-0 flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <SideNav />
      <main className="ml-20 flex-1 p-8 flex flex-col">
        <h1 className="text-2xl font-bold mb-4">格式转换</h1>
        
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {Object.keys(converters).map((key) => (
              <button
                key={key}
                onClick={() => setActiveConverter(key)}
                className={`${
                  activeConverter === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {converters[key].name}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-6 flex-1 overflow-y-auto">
          {converters[activeConverter].component}
        </div>
      </main>
    </div>
  );
};

export default FormatConverter;