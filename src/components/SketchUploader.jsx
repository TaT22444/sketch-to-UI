import React, { useState, useRef } from 'react';

export default function SketchUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const [generatedUI, setGeneratedUI] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('html');
  const [codeVisible, setCodeVisible] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gpt');
  const fileInputRef = useRef(null);

  // getViewportMetaを定義
  const getViewportMeta = () => {
    if (!generatedUI || !generatedUI.deviceType) return 'width=device-width, initial-scale=1.0';
    
    switch(generatedUI.deviceType) {
      case 'mobile':
        return 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      case 'tablet':
        return 'width=device-width, initial-scale=1.0';
      default: // desktop
        return 'width=device-width, initial-scale=1.0';
    }
  };

  // HTMLコードを整形する関数
  const formatHTML = (html) => {
    if (!html) return '';
    
    let formatted = '';
    let indent = 0;
    
    // タグを分割
    const tags = html.split(/(<[^>]+>)/g);
    
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      
      // 空のタグはスキップ
      if (!tag.trim()) continue;
      
      // 閉じタグの場合はインデントを減らす
      if (tag.match(/^<\//)) {
        indent--;
      }
      
      // インデントを追加
      formatted += '  '.repeat(Math.max(0, indent)) + tag + '\n';
      
      // 自己完結タグでなく、開始タグの場合はインデントを増やす
      if (!tag.match(/^<\//) && !tag.match(/\/>$/) && tag.match(/^</)) {
        indent++;
      }
    }
    
    return formatted;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 画像ファイルのみ許可
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルのみアップロードできます');
      return;
    }

    // プレビュー画像を設定
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target.result);
    };
    reader.readAsDataURL(file);

    // エラーメッセージをクリア
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);

    const file = fileInputRef.current.files[0];
    if (!file) {
      setError('スケッチ画像を選択してください');
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('model', selectedModel);

    try {
      console.log('APIリクエスト開始: /api/upload');
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('APIレスポンスステータス:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('APIエラーレスポンス:', errorText);
        
        let errorMessage = 'アップロードに失敗しました';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // JSONでない場合はテキストをそのまま表示
          errorMessage = `エラー (${response.status}): ${errorText.substring(0, 100)}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('APIレスポンス成功:', Object.keys(data));
      setGeneratedUI(data);
    } catch (err) {
      console.error('エラー詳細:', err);
      setError(err.message || 'APIリクエスト中にエラーが発生しました');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setPreviewImage(null);
    setGeneratedUI(null);
    setError(null);
    setCodeVisible(true);
    fileInputRef.current.value = '';
  };

  // デバイスタイプに基づいてiframeのスタイルを決定
  const getPreviewStyle = () => {
    if (!generatedUI || !generatedUI.deviceType) return {};
    
    switch(generatedUI.deviceType) {
      case 'mobile':
        return {
          width: '375px',
          height: '667px',
          margin: '0 auto',
          display: 'block',
          border: '12px solid #333',
          borderRadius: '24px'
        };
      case 'tablet':
        return {
          width: '768px',
          height: '1024px',
          margin: '0 auto',
          display: 'block',
          border: '12px solid #333',
          borderRadius: '12px'
        };
      default: // desktop
        return {
          width: '100%',
          height: '500px'
        };
    }
  };

  // デバイスタイプに基づいてラベルを取得
  const getDeviceLabel = () => {
    if (!generatedUI || !generatedUI.deviceType) return '';
    
    switch(generatedUI.deviceType) {
      case 'mobile':
        return 'スマートフォン (375x667px)';
      case 'tablet':
        return 'タブレット (768x1024px)';
      default:
        return 'デスクトップ';
    }
  };

  // 共通のCSSリセットとフォント
  const baseCSS = `
/* Google Fontsのインポート */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+JP:wght@300;400;500;700&display=swap');

/* リセットCSS */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  color: #333;
  min-height: 100vh;
  background-color: #fff;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

button {
  cursor: pointer;
  font-family: inherit;
}

a {
  text-decoration: none;
  color: #3b82f6;
  transition: color 0.2s ease;
}

a:hover {
  color: #2563eb;
}

/* 共通の要素スタイル */
h1, h2, h3, h4, h5, h6 {
  margin-bottom: 0.5em;
  line-height: 1.2;
  font-weight: 600;
}

p {
  margin-bottom: 1em;
}

/* 基本的なユーティリティクラス */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.flex-wrap { flex-wrap: wrap; }

.grid { display: grid; }

.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.mt-8 { margin-top: 2rem; }
.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-8 { margin-bottom: 2rem; }

.p-1 { padding: 0.25rem; }
.p-2 { padding: 0.5rem; }
.p-4 { padding: 1rem; }
.p-8 { padding: 2rem; }

.rounded { border-radius: 0.25rem; }
.rounded-md { border-radius: 0.375rem; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-full { border-radius: 9999px; }

.shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); }
.shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }

/* アニメーション */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

/* 一般的なボタンスタイル */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
  border: none;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #6b7280;
  color: white;
  border: none;
}

.btn-secondary:hover {
  background-color: #4b5563;
}

.btn-outline {
  background-color: transparent;
  border: 1px solid #d1d5db;
  color: #4b5563;
}

.btn-outline:hover {
  border-color: #9ca3af;
  color: #1f2937;
}

/* フォームコントロール */
.form-control {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  line-height: 1.5;
  color: #1f2937;
  background-color: #fff;
  background-clip: padding-box;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus {
  border-color: #3b82f6;
  outline: 0;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
}

/* 結果レイアウト */
.result-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.preview-section, .code-section {
  background-color: #fff;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  padding: 1rem;
}

.preview-section {
  display: flex;
  flex-direction: column;
}

.code-section {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.code-content {
  flex: 1;
  overflow: auto;
  background-color: #f9fafb;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
  padding: 1rem;
}

.code-content pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}

.code-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1rem;
}

.code-tab {
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.code-tab:hover {
  color: #3b82f6;
}

.code-tab.active {
  color: #3b82f6;
  border-bottom: 2px solid #3b82f6;
}

.ai-thinking h4 {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  color: #374151;
}

.ai-thinking p {
  font-size: 0.875rem;
  line-height: 1.5;
  color: #4b5563;
}

/* レスポンシブ対応 */
@media (max-width: 1024px) {
  .result-layout {
    grid-template-columns: 1fr;
  }
}

/* ナビゲーション */
.nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.nav-item {
  padding: 0.5rem;
}

/* モデル選択スタイル */
.model-selector {
  margin-bottom: 1.5rem;
  background-color: #f9fafb;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.model-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.model-options {
  display: flex;
  gap: 1rem;
}

.model-option {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e5e7eb;
  background-color: white;
}

.model-option.selected {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

.model-option input {
  margin-right: 0.5rem;
}

.model-name {
  font-weight: 500;
}

/* レスポンシブグリッド */
@media (max-width: 768px) {
  .grid-cols-2, .grid-cols-3, .grid-cols-4 {
    grid-template-columns: 1fr;
  }

  .model-options {
    flex-direction: column;
    gap: 0.5rem;
  }
}
`;

  const LoadingIndicator = () => (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="spinner">
          <div className="spinner-dot"></div>
          <div className="spinner-dot"></div>
          <div className="spinner-dot"></div>
        </div>
        <div className="loading-message">
          <h3>処理中...</h3>
          <p>スケッチを解析しコードを生成しています</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="sketch-uploader">
      {!generatedUI ? (
        <>
          <div className="upload-container">
            <h2>スケッチからコードへ</h2>
            <p>手書きUIスケッチをアップロードしてコードに変換</p>
            
            <form onSubmit={handleSubmit}>
              <div className="model-selector">
                <label className="model-label">AIモデル選択:</label>
                <div className="model-options">
                  <label className={`model-option ${selectedModel === 'gpt' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="model"
                      value="gpt"
                      checked={selectedModel === 'gpt'}
                      onChange={() => setSelectedModel('gpt')}
                    />
                    <span className="model-name">GPT-4o</span>
                  </label>
                  <label className={`model-option ${selectedModel === 'claude' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="model"
                      value="claude"
                      checked={selectedModel === 'claude'}
                      onChange={() => setSelectedModel('claude')}
                    />
                    <span className="model-name">Claude</span>
                  </label>
                </div>
              </div>

              <div className="file-input-container">
                {!previewImage ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="file-input-button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    スケッチを選択
                  </button>
                ) : (
                  <div className="preview-container">
                    <img src={previewImage} alt="アップロードされたスケッチ" className="preview-image" />
                    <div className="preview-actions">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        className="file-input-button"
                      >
                        変更
                      </button>
                      <button
                        type="submit"
                        disabled={isUploading}
                        className="submit-button"
                      >
                        {isUploading ? (
                          <>
                            <span className="submit-spinner"></span>
                            処理中...
                          </>
                        ) : 'UI生成'}
                      </button>
                    </div>
                  </div>
                )}
                
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="file-input"
                />
              </div>
              
              {error && <div className="error-message">{error}</div>}
            </form>
            
            {isUploading && <LoadingIndicator />}
          </div>
        </>
      ) : (
        <div className="result-container">
          <h2>生成されたUI</h2>
          
          <div className="result-layout">
            <div className="preview-section">
              {generatedUI.deviceType && (
                <div className="device-type-label">
                  <span>{getDeviceLabel()}</span>
                </div>
              )}
              
              <iframe
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta name="viewport" content="${getViewportMeta()}">
                      <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src * data:; style-src 'unsafe-inline' 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline' 'self'; connect-src 'self';">
                      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet">
                      <style>
                        ${baseCSS}
                        ${generatedUI.css}
                      </style>
                    </head>
                    <body>
                      ${generatedUI.html}
                      <script>${generatedUI.js}</script>
                    </body>
                  </html>
                `}
                title="生成されたUI"
                className="preview-iframe"
                style={getPreviewStyle()}
              />
              
              <div className="preview-actions">
                <button 
                  onClick={() => setCodeVisible(!codeVisible)}
                  className="view-code-button"
                >
                  {codeVisible ? 'コードを隠す' : 'コードを表示'}
                </button>
                
                <button
                  onClick={() => {
                    const blob = new Blob([
                      `<!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="UTF-8">
                          <meta name="viewport" content="${getViewportMeta()}">
                          <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src * data:; style-src 'unsafe-inline' 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline' 'self'; connect-src 'self';">
                          <title>生成されたUI</title>
                          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet">
                          <style>
                            ${baseCSS}
                            ${generatedUI.css}
                          </style>
                        </head>
                        <body>
                          ${generatedUI.html}
                          <script>${generatedUI.js}</script>
                        </body>
                      </html>`
                    ], { type: 'text/html' });
                    
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'generated-ui.html';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="download-button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  HTMLをダウンロード
                </button>
                
                <button onClick={handleReset} className="reset-button">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
                    <polyline points="1 4 1 10 7 10"></polyline>
                    <polyline points="23 20 23 14 17 14"></polyline>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                  </svg>
                  新しいスケッチ
                </button>
              </div>
            </div>
            
            {codeVisible && (
              <div className="code-section">
                <div className="code-tabs">
                  <button 
                    className={`code-tab ${activeTab === 'html' ? 'active' : ''}`}
                    onClick={() => setActiveTab('html')}
                  >
                    HTML
                  </button>
                  <button 
                    className={`code-tab ${activeTab === 'css' ? 'active' : ''}`}
                    onClick={() => setActiveTab('css')}
                  >
                    CSS
                  </button>
                  <button 
                    className={`code-tab ${activeTab === 'js' ? 'active' : ''}`}
                    onClick={() => setActiveTab('js')}
                  >
                    JavaScript
                  </button>
                  <button 
                    className={`code-tab ${activeTab === 'thinking' ? 'active' : ''}`}
                    onClick={() => setActiveTab('thinking')}
                  >
                    AI分析
                  </button>
                </div>
                
                <div className="code-content">
                  {activeTab === 'html' && (
                    <pre><code>{formatHTML(generatedUI.html)}</code></pre>
                  )}
                  {activeTab === 'css' && (
                    <pre><code>{generatedUI.css || '/* CSSコードが生成されていません */'}</code></pre>
                  )}
                  {activeTab === 'js' && (
                    <pre><code>{generatedUI.js || '// JavaScriptコードが生成されていません'}</code></pre>
                  )}
                  {activeTab === 'thinking' && (
                    <div className="ai-thinking">
                      <h4>スケッチ分析</h4>
                      <p>{generatedUI.analysis || 'スケッチの分析情報がありません'}</p>
                      <h4>変換プロセス</h4>
                      <p>{generatedUI.reasoning || '変換プロセスの情報がありません'}</p>
                      <h4>検出デバイスタイプ</h4>
                      <p>{generatedUI.deviceType || 'デスクトップ'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 