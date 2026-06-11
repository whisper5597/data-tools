import { useCallback, useMemo, useRef, useState } from 'react';
import SideNav from '../components/SideNav';

const MIME_OPTIONS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

const mimeToExtension = (mimeType) => {
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  };
  return map[mimeType] || 'png';
};

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(blob);
  });

const getDataUrlMeta = (dataUrl) => {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.*)$/s);
  if (!match) return null;
  return {
    mimeType: match[1],
    base64: match[2],
  };
};

const ImageBase64Converter = () => {
  const [urlInput, setUrlInput] = useState('');
  const [base64Input, setBase64Input] = useState('');
  const [fallbackMimeType, setFallbackMimeType] = useState('image/png');
  const [dataUrl, setDataUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState('复制 Base64');
  const fileInputRef = useRef(null);

  const base64Output = useMemo(() => {
    const meta = getDataUrlMeta(dataUrl);
    return meta?.base64 || '';
  }, [dataUrl]);

  const resetMessage = () => {
    setError('');
    setStatus('');
  };

  const updateResult = useCallback((nextDataUrl, nextSourceName = 'image') => {
    const meta = getDataUrlMeta(nextDataUrl);
    if (!meta || !meta.mimeType.startsWith('image/')) {
      throw new Error('仅支持图片类型的 Base64 数据。');
    }

    setDataUrl(nextDataUrl);
    setMimeType(meta.mimeType);
    setSourceName(nextSourceName);
  }, []);

  const handleFile = useCallback(
    async (file) => {
      resetMessage();
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setError('请选择图片文件。');
        return;
      }

      setIsLoading(true);
      try {
        const nextDataUrl = await blobToDataUrl(file);
        updateResult(nextDataUrl, file.name);
        setStatus('已从本地文件生成 Base64。');
      } catch (nextError) {
        setError(nextError.message || '读取本地图片失败。');
      } finally {
        setIsLoading(false);
      }
    },
    [updateResult]
  );

  const handleClipboardRead = async () => {
    resetMessage();
    setIsLoading(true);

    try {
      if (navigator.clipboard?.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find((type) => type.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const nextDataUrl = await blobToDataUrl(blob);
            updateResult(nextDataUrl, 'clipboard-image');
            setStatus('已从剪切板图片生成 Base64。');
            return;
          }
        }
      }

      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text.trim()) {
          if (convertBase64Text(text)) {
            setStatus('剪切板中未发现图片，已按 Base64 文本解析。');
          }
          return;
        }
      }

      setError('剪切板中没有可用的图片或 Base64 文本。');
    } catch (nextError) {
      console.error('Read clipboard failed:', nextError);
      setError('读取剪切板失败，请确认浏览器权限或手动粘贴。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlLoad = async () => {
    resetMessage();
    const imageUrl = urlInput.trim();
    if (!imageUrl) {
      setError('请输入图片链接。');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`请求失败：${response.status}`);
      }

      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error('链接返回的内容不是图片。');
      }

      const nextDataUrl = await blobToDataUrl(blob);
      updateResult(nextDataUrl, imageUrl.split('/').pop() || 'remote-image');
      setStatus('已从图片链接生成 Base64。');
    } catch (nextError) {
      console.error('Load image URL failed:', nextError);
      setError('读取图片链接失败，可能是链接无效或目标站点未允许跨域访问。');
    } finally {
      setIsLoading(false);
    }
  };

  const convertBase64Text = (text = base64Input) => {
    resetMessage();
    const trimmed = text.trim();
    if (!trimmed) {
      setError('请输入 Base64 内容。');
      return;
    }

    const normalized = trimmed.startsWith('data:')
      ? trimmed
      : `data:${fallbackMimeType};base64,${trimmed.replace(/\s/g, '')}`;

    try {
      updateResult(normalized, 'base64-image');
      setBase64Input(trimmed);
      setStatus('已将 Base64 转为图片预览。');
      return true;
    } catch (nextError) {
      setError(nextError.message || 'Base64 格式不正确。');
      return false;
    }
  };

  const handleCopy = async (text, nextLabel) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(nextLabel);
      setTimeout(() => setCopyStatus('复制 Base64'), 1200);
    } catch (nextError) {
      console.error('Copy failed:', nextError);
      setError('复制失败，请手动选择内容复制。');
    }
  };

  const handleDownload = () => {
    if (!dataUrl) return;

    const extension = mimeToExtension(mimeType);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${sourceName || 'image'}.${extension}`;
    link.click();
  };

  return (
    <div className="fixed inset-0 flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <SideNav />
      <main className="ml-20 flex-1 p-8 flex flex-col overflow-auto">
        <h1 className="text-2xl font-bold mb-4">图片 / Base64 转换</h1>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-lg font-semibold mb-4">图片转 Base64</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">本地图片</label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleFile(event.target.files?.[0])}
                  />
                  <button
                    type="button"
                    className="px-4 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    选择图片
                  </button>
                  <span className="text-sm text-gray-500">支持 png、jpg、webp、gif、svg 等图片。</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">剪切板图片</label>
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
                  onClick={handleClipboardRead}
                  disabled={isLoading}
                >
                  从剪切板读取
                </button>
              </div>

              <div>
                <label htmlFor="image-url" className="block text-sm font-medium mb-2">
                  图片链接
                </label>
                <div className="flex gap-2">
                  <input
                    id="image-url"
                    type="url"
                    className="flex-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    value={urlInput}
                    onChange={(event) => setUrlInput(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleUrlLoad()}
                    placeholder="https://example.com/image.png"
                  />
                  <button
                    type="button"
                    className="px-4 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
                    onClick={handleUrlLoad}
                    disabled={isLoading}
                  >
                    读取
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  如果目标站点未开放 CORS，浏览器会阻止读取图片内容。
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-lg font-semibold mb-4">Base64 转图片</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label htmlFor="fallback-mime" className="text-sm font-medium">
                  无 data URL 前缀时按
                </label>
                <select
                  id="fallback-mime"
                  className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                  value={fallbackMimeType}
                  onChange={(event) => setFallbackMimeType(event.target.value)}
                >
                  {MIME_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                className="w-full min-h-40 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 font-mono text-sm"
                value={base64Input}
                onChange={(event) => setBase64Input(event.target.value)}
                placeholder="粘贴 data:image/png;base64,... 或纯 Base64 内容"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
                  onClick={() => convertBase64Text()}
                  disabled={isLoading}
                >
                  转为图片
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700"
                  onClick={() => {
                    setBase64Input('');
                    resetMessage();
                  }}
                >
                  清空输入
                </button>
              </div>
            </div>
          </section>
        </div>

        {(status || error || isLoading) && (
          <div className="mt-4">
            {isLoading && <p className="text-sm text-gray-500">处理中...</p>}
            {status && <p className="text-sm text-green-600 dark:text-green-400">{status}</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        <section className="mt-6 flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 flex flex-col min-h-96">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">图片预览</h2>
              <button
                type="button"
                className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
                onClick={handleDownload}
                disabled={!dataUrl}
              >
                下载图片
              </button>
            </div>

            <div className="flex-1 rounded-lg bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-auto p-4">
              {dataUrl ? (
                <img src={dataUrl} alt="preview" className="max-w-full max-h-full rounded shadow" />
              ) : (
                <p className="text-gray-500">选择图片或输入 Base64 后在这里预览。</p>
              )}
            </div>

            {dataUrl && (
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                <span>来源：{sourceName}</span>
                <span className="ml-4">类型：{mimeType}</span>
                <span className="ml-4">Base64 长度：{base64Output.length}</span>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 flex flex-col min-h-96">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Base64 输出</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
                  onClick={() => handleCopy(base64Output, '已复制!')}
                  disabled={!base64Output}
                >
                  {copyStatus}
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
                  onClick={() => handleCopy(dataUrl, '已复制 Data URL!')}
                  disabled={!dataUrl}
                >
                  复制 Data URL
                </button>
              </div>
            </div>

            <textarea
              readOnly
              className="flex-1 w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 font-mono text-sm"
              value={base64Output}
              placeholder="转换结果会显示在这里。"
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default ImageBase64Converter;
