import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx';
import Home from './pages/Home.jsx';
import JSONLParser from './pages/JSONLParser.jsx';
import JSONLMerger from './pages/JSONLMerger.jsx';
import './index.css';
import 'highlight.js/styles/github-dark.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'jsonl-parser',
        element: <JSONLParser />,
      },
      {
        path: 'jsonl-merger',
        element: <JSONLMerger />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
