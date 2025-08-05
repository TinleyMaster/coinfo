import React, { useState } from 'react';

function SavedTokens({ savedTokens, onLoadToken, onDeleteToken, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt'); // updatedAt, name, price
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc

  // 格式化数字
  const formatNumber = (num) => {
    if (!num || num === 0) return 'N/A';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num?.toFixed(2) || 'N/A';
  };

  // 格式化日期
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 过滤和排序代币
  const filteredAndSortedTokens = savedTokens
    .filter(token => 
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = a.currentPrice || 0;
          bValue = b.currentPrice || 0;
          break;
        case 'marketCap':
          aValue = a.marketCap || 0;
          bValue = b.marketCap || 0;
          break;
        case 'priceChange24h':
          aValue = a.priceChange24h || 0;
          bValue = b.priceChange24h || 0;
          break;
        default: // updatedAt
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  return (
    <div className="saved-tokens-container">
      <div className="saved-tokens-header">
        <h2>📚 已保存的代币 ({savedTokens.length})</h2>
        <button 
          onClick={onRefresh}
          className="refresh-button"
          style={{
            background: 'linear-gradient(45deg, #17a2b8, #138496)',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9em'
          }}
        >
          🔄 刷新
        </button>
      </div>

      {/* 搜索和排序控件 */}
      <div className="tokens-controls" style={{marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
        <input
          type="text"
          placeholder="搜索代币名称或符号..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: '1',
            minWidth: '200px',
            padding: '10px 15px',
            borderRadius: '8px',
            border: '2px solid #4a5568',
            background: '#2d3748',
            color: '#e2e8f0',
            fontSize: '1em'
          }}
        />
        
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: '10px 15px',
            borderRadius: '8px',
            border: '2px solid #4a5568',
            background: '#2d3748',
            color: '#e2e8f0',
            fontSize: '1em'
          }}
        >
          <option value="updatedAt">按更新时间</option>
          <option value="name">按名称</option>
          <option value="price">按价格</option>
          <option value="marketCap">按市值</option>
          <option value="priceChange24h">按24h涨跌</option>
        </select>
        
        <button 
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          style={{
            padding: '10px 15px',
            borderRadius: '8px',
            border: '2px solid #4a5568',
            background: '#4a5568',
            color: '#e2e8f0',
            cursor: 'pointer',
            fontSize: '1em'
          }}
        >
          {sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
        </button>
      </div>

      {/* 代币列表 */}
      {filteredAndSortedTokens.length === 0 ? (
        <div className="no-tokens" style={{textAlign: 'center', padding: '40px', color: '#a0aec0'}}>
          {searchTerm ? '没有找到匹配的代币' : '还没有保存任何代币'}
        </div>
      ) : (
        <div className="tokens-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px'}}>
          {filteredAndSortedTokens.map((token) => (
            <div 
              key={token._id} 
              className="saved-token-card"
              style={{
                background: 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)',
                border: '1px solid #4a5568',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* 代币基本信息 */}
              <div className="token-header" style={{marginBottom: '15px'}}>
                <h3 style={{margin: '0 0 5px 0', color: '#ffc107'}}>
                  {token.name} ({token.symbol.toUpperCase()})
                </h3>
                <p style={{margin: '0', fontSize: '0.9em', color: '#a0aec0'}}>
                  保存时间: {formatDate(token.updatedAt)}
                </p>
              </div>

              {/* 价格信息 */}
              <div className="token-price-info" style={{marginBottom: '15px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                  <span style={{color: '#e2e8f0'}}>当前价格:</span>
                  <span style={{fontWeight: 'bold', color: '#4CAF50'}}>
                    ${token.currentPrice ? token.currentPrice.toFixed(6) : 'N/A'}
                  </span>
                </div>
                
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                  <span style={{color: '#e2e8f0'}}>市值:</span>
                  <span style={{color: '#e2e8f0'}}>${formatNumber(token.marketCap)}</span>
                </div>
                
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{color: '#e2e8f0'}}>24h变化:</span>
                  <span style={{
                    color: token.priceChange24h >= 0 ? '#4CAF50' : '#f44336',
                    fontWeight: 'bold'
                  }}>
                    {token.priceChange24h ? `${token.priceChange24h.toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* 额外信息 */}
              <div className="token-extra-info" style={{marginBottom: '15px', fontSize: '0.9em', color: '#a0aec0'}}>
                {token.contractAddress && (
                  <div style={{marginBottom: '5px'}}>
                    📋 合约: {token.contractAddress.slice(0, 10)}...
                  </div>
                )}
                {token.holderCount > 0 && (
                  <div style={{marginBottom: '5px'}}>
                    👥 持有者: {token.holderCount}+
                  </div>
                )}
                {token.rootDataInfo && (
                  <div>
                    💼 RootData: 有项目信息
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="token-actions" style={{display: 'flex', gap: '10px'}}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadToken(token.coinId);
                  }}
                  style={{
                    flex: '1',
                    background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                    color: 'white',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9em',
                    fontWeight: '600'
                  }}
                >
                  📊 查看详情
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`确定要删除 ${token.name} 吗？`)) {
                      onDeleteToken(token._id);
                    }
                  }}
                  style={{
                    background: 'linear-gradient(45deg, #f44336, #d32f2f)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 15px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9em'
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SavedTokens;