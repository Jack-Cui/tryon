import React, { useEffect, useState } from 'react';
import { getCoCreationId, getCoCreationIdWithUrlPriority, getCoCreationIdFromURL, isValidCoCreationId, clearCoCreationIdCache } from '../../utils/coCreationIdHelper';

const TestCoCreationId = () => {
  const [urlCoCreationId, setUrlCoCreationId] = useState<number | null>(null);
  const [cacheCoCreationId, setCacheCoCreationId] = useState<number | null>(null);
  const [finalCoCreationId, setFinalCoCreationId] = useState<number | null>(null);
  const [urlPriorityCoCreationId, setUrlPriorityCoCreationId] = useState<number | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');

  useEffect(() => {
    // 获取当前URL
    setCurrentUrl(window.location.href);
    
    // 测试各种获取方法
    const testUrlCoCreationId = getCoCreationIdFromURL();
    setUrlCoCreationId(testUrlCoCreationId);
    
    const testCacheCoCreationId = getCoCreationId(true);
    setCacheCoCreationId(testCacheCoCreationId);
    
    const testFinalCoCreationId = getCoCreationId(true);
    setFinalCoCreationId(testFinalCoCreationId);
    
    const testUrlPriorityCoCreationId = getCoCreationIdWithUrlPriority();
    setUrlPriorityCoCreationId(testUrlPriorityCoCreationId);
  }, []);

  const testUrls = [
    'http://dev_h5.ai1010.cn/home?co_creation_id=2',
    'http://dev_h5.ai1010.cn?co_creation_id=2',
    'http://dev_h5.ai1010.cn/login?co_creation_id=2',
    'http://dev_h5.ai1010.cn/home?co_creation_id=123',
    'http://dev_h5.ai1010.cn?co_creation_id=456',
  ];

  const testUrl = (url: string) => {
    // 模拟URL变化
    const newUrl = new URL(url);
    window.history.pushState({}, '', newUrl.pathname + newUrl.search);
    setCurrentUrl(window.location.href);
    
    // 重新测试
    const testUrlCoCreationId = getCoCreationIdFromURL();
    setUrlCoCreationId(testUrlCoCreationId);
    
    const testCacheCoCreationId = getCoCreationId(true);
    setCacheCoCreationId(testCacheCoCreationId);
    
    const testFinalCoCreationId = getCoCreationId(true);
    setFinalCoCreationId(testFinalCoCreationId);
    
    const testUrlPriorityCoCreationId = getCoCreationIdWithUrlPriority();
    setUrlPriorityCoCreationId(testUrlPriorityCoCreationId);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🧪 coCreationId 获取功能测试</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h3>📍 当前URL</h3>
        <p style={{ wordBreak: 'break-all', backgroundColor: '#fff', padding: '10px', borderRadius: '4px' }}>
          {currentUrl}
        </p>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
        <h3>🔍 测试结果</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <strong>从URL获取:</strong> 
            <span style={{ color: urlCoCreationId ? '#28a745' : '#dc3545' }}>
              {urlCoCreationId ? `✅ ${urlCoCreationId}` : '❌ null'}
            </span>
          </div>
          <div>
            <strong>从缓存获取:</strong> 
            <span style={{ color: cacheCoCreationId ? '#28a745' : '#dc3545' }}>
              {cacheCoCreationId ? `✅ ${cacheCoCreationId}` : '❌ null'}
            </span>
          </div>
          <div>
            <strong>最终结果:</strong> 
            <span style={{ color: finalCoCreationId ? '#28a745' : '#dc3545' }}>
              {finalCoCreationId ? `✅ ${finalCoCreationId}` : '❌ null'}
            </span>
          </div>
          <div>
            <strong>URL优先结果:</strong> 
            <span style={{ color: urlPriorityCoCreationId ? '#28a745' : '#dc3545' }}>
              {urlPriorityCoCreationId ? `✅ ${urlPriorityCoCreationId}` : '❌ null'}
            </span>
          </div>
          <div>
            <strong>是否有效:</strong> 
            <span style={{ color: isValidCoCreationId(finalCoCreationId) ? '#28a745' : '#dc3545' }}>
              {isValidCoCreationId(finalCoCreationId) ? '✅ 是' : '❌ 否'}
            </span>
          </div>
        </div>
      </div>

              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
          <h3>🧪 测试不同URL</h3>
          <p>点击下面的URL进行测试：</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {testUrls.map((url, index) => (
              <button
                key={index}
                onClick={() => testUrl(url)}
                style={{
                  padding: '10px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '12px'
                }}
              >
                {url}
              </button>
            ))}
          </div>
          
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                clearCoCreationIdCache();
                // 重新测试
                const testUrlCoCreationId = getCoCreationIdFromURL();
                setUrlCoCreationId(testUrlCoCreationId);
                const testCacheCoCreationId = getCoCreationId(true);
                setCacheCoCreationId(testCacheCoCreationId);
                const testFinalCoCreationId = getCoCreationId(true);
                setFinalCoCreationId(testFinalCoCreationId);
                const testUrlPriorityCoCreationId = getCoCreationIdWithUrlPriority();
                setUrlPriorityCoCreationId(testUrlPriorityCoCreationId);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🗑️ 清除缓存
            </button>
            <button
              onClick={() => {
                // 重新测试
                const testUrlCoCreationId = getCoCreationIdFromURL();
                setUrlCoCreationId(testUrlCoCreationId);
                const testCacheCoCreationId = getCoCreationId(true);
                setCacheCoCreationId(testCacheCoCreationId);
                const testFinalCoCreationId = getCoCreationId(true);
                setFinalCoCreationId(testFinalCoCreationId);
                const testUrlPriorityCoCreationId = getCoCreationIdWithUrlPriority();
                setUrlPriorityCoCreationId(testUrlPriorityCoCreationId);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔄 重新测试
            </button>
          </div>
        </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#d1ecf1', borderRadius: '8px' }}>
        <h3>📚 使用说明</h3>
        <ul>
          <li>支持从以下URL格式获取 <code>co_creation_id</code> 参数：</li>
          <li>• <code>http://dev_h5.ai1010.cn/home?co_creation_id=2</code></li>
          <li>• <code>http://dev_h5.ai1010.cn?co_creation_id=2</code></li>
          <li>• <code>http://dev_h5.ai1010.cn/login?co_creation_id=2</code></li>
          <li>优先级：服务器响应 - URL参数 - 缓存</li>
          <li>如果获取不到，会显示错误提示</li>
        </ul>
      </div>

      <div style={{ padding: '15px', backgroundColor: '#f8d7da', borderRadius: '8px' }}>
        <h3>⚠️ 注意事项</h3>
        <ul>
          <li>确保URL中包含有效的 <code>co_creation_id</code> 参数</li>
          <li>参数值必须是正整数</li>
          <li>如果测试失败，请检查浏览器控制台的错误信息</li>
        </ul>
      </div>
    </div>
  );
};

export default TestCoCreationId; 