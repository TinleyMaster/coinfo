import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenData, setTokenData] = useState(null);
  const [protocolData, setProtocolData] = useState(null);
  const [chainData, setChainData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAllContracts, setShowAllContracts] = useState(false); // 新增：控制合约地址展开状态

  const fetchTokenData = async () => {
    if (!tokenSymbol.trim()) {
      setError('请输入代币符号');
      return;
    }

    setLoading(true);
    setError('');
    setTokenData(null);
    setProtocolData(null);
    setChainData(null);

    try {
      // 首先搜索代币以获取正确的ID
      const searchResponse = await axios.get(
        `https://api.coingecko.com/api/v3/search?query=${tokenSymbol}`
      );
      
      console.log('Search Response:', searchResponse.data); // 调试日志
      
      const coins = searchResponse.data.coins;
      if (coins.length === 0) {
        setError('未找到相关代币，请检查代币符号');
        setLoading(false);
        return;
      }
      
      // 使用找到的第一个代币ID获取详细信息
      const coinId = coins[0].id;
      const coinName = coins[0].name;
      const coinSymbolLower = coins[0].symbol?.toLowerCase();
      console.log('Found coin ID:', coinId, 'Name:', coinName); // 调试日志
      
      // 获取代币详细信息（包括代币经济学数据）
      const coinDetailResponse = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true&sparkline=false`
      );
      
      // 获取价格数据
      const priceResponse = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`
      );

      // 获取DeFiLlama协议数据
      const protocolsResponse = await axios.get('https://api.llama.fi/protocols');
      const protocols = protocolsResponse.data;
      
      // 查找相关协议
      const relatedProtocols = protocols.filter(protocol => 
        protocol.name.toLowerCase().includes(tokenSymbol.toLowerCase()) ||
        protocol.symbol?.toLowerCase() === tokenSymbol.toLowerCase()
      );

      // 获取链TVL数据
      const chainsResponse = await axios.get('https://api.llama.fi/chains');
      
      // 获取RootData项目信息（投资团队和融资情况）
      let rootDataInfo = null;
      try {
        // 注意：您需要替换为实际的API密钥
        const API_KEY = 'Z6NlCXqyiO53Xv2WFNkTYIZi9KU2PQU8'; // 请替换为您的实际API密钥
        
        // 首先尝试通过项目名称搜索
        let searchQuery = coinName || tokenSymbol;
        
        // 如果有合约地址，优先使用合约地址查询
        const contractAddress = coinDetailResponse.data?.contract_address;
        
        let rootDataResponse;
        
        if (contractAddress) {
          // 使用合约地址查询
          rootDataResponse = await axios.get(
            'https://api.rootdata.com/open/get_item',
            {
              headers: {
                'apikey': API_KEY,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              params: {
                contract_address: contractAddress,
                include_team: true,
                include_investors: true
              }
            }
          );
        } else {
          // 尝试通过项目名称搜索（这需要先获取项目列表或使用搜索API）
          // 注意：RootData可能需要先搜索项目获取project_id，然后再查询详情
          console.log('尝试通过项目名称搜索:', searchQuery);
          
          // 如果RootData有搜索API，可以先搜索获取project_id
          // 然后再调用get_item API
          
          // 暂时跳过，因为没有project_id或contract_address
          throw new Error('需要project_id或contract_address参数');
        }
        
        console.log('RootData Response:', rootDataResponse.data);
        
        if (rootDataResponse.data && rootDataResponse.data.project_name) {
          rootDataInfo = rootDataResponse.data;
        }
      } catch (rootDataError) {
        console.log('RootData API调用失败:', rootDataError.message);
        if (rootDataError.response) {
          console.log('RootData API错误详情:', {
            status: rootDataError.response.status,
            statusText: rootDataError.response.statusText,
            data: rootDataError.response.data
          });
        }
        
        // 提供更详细的错误信息
        if (rootDataError.response?.status === 401) {
          console.log('API密钥无效，请检查API密钥是否正确');
        } else if (rootDataError.response?.status === 400) {
          console.log('请求参数错误，需要提供project_id或contract_address');
        } else if (rootDataError.response?.status === 404) {
          console.log('未找到对应的项目信息');
        }
        
        // 如果RootData API失败，不影响其他数据的显示
      }
      
      console.log('Coin Detail Data:', coinDetailResponse.data); // 调试日志
      console.log('RootData Info:', rootDataInfo); // 调试日志
      
      setTokenData({
        price: priceResponse.data,
        protocols: relatedProtocols,
        chains: chainsResponse.data,
        coinInfo: coins[0],
        coinDetail: coinDetailResponse.data,
        rootDataInfo: rootDataInfo // 添加RootData信息
      });

    } catch (err) {
      console.error('详细错误信息:', err);
      if (err.response) {
        console.error('API响应错误:', err.response.status, err.response.data);
        setError(`API请求失败: ${err.response.status} - ${err.response.statusText}`);
      } else if (err.request) {
        console.error('网络请求错误:', err.request);
        setError('网络连接失败，请检查网络连接');
      } else {
        console.error('其他错误:', err.message);
        setError(`获取数据失败: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 格式化融资金额
  const formatFundingAmount = (amount) => {
    if (!amount || amount === 0) return '未披露';
    if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
    if (amount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
    return `$${amount}`;
  };

  // 格式化融资轮次
  const formatFundingRound = (round) => {
    const roundMap = {
      'seed': '种子轮',
      'pre_seed': '种子前轮',
      'series_a': 'A轮',
      'series_b': 'B轮',
      'series_c': 'C轮',
      'strategic': '战略投资',
      'private': '私募',
      'public': '公募',
      'ido': 'IDO',
      'ico': 'ICO'
    };
    return roundMap[round?.toLowerCase()] || round || '未知轮次';
  };

  const formatNumber = (num) => {
    if (!num || num === 0) return 'N/A';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num?.toFixed(2) || 'N/A';
  };

  const formatSupply = (num) => {
    if (!num) return 'N/A';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toLocaleString();
  };

  const formatCommunityNumber = (num) => {
    if (!num || num === 0) return '暂无数据';
    return formatNumber(num);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>加密货币 DeFi 数据查询</h1>
        
        <div className="search-container">
          <input
            type="text"
            value={tokenSymbol}
            onChange={(e) => setTokenSymbol(e.target.value)}
            placeholder="输入代币名称或符号 (如: Bitcoin, BTC, Ethereum, ETH)"
            className="token-input"
            onKeyPress={(e) => e.key === 'Enter' && fetchTokenData()}
          />
          <button onClick={fetchTokenData} disabled={loading} className="search-button">
            {loading ? '查询中...' : '查询'}
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        {tokenData && (
          <div className="data-container">
            {/* 代币价格信息 */}
            {tokenData.price && Object.entries(tokenData.price).map(([coinId, data]) => (
              <div key={coinId} className="price-section">
                <div className="token-overview-card">
                  <h2>代币概览</h2>
                  
                  {/* 整合的信息网格 */}
                  <div className="overview-grid">
                    {/* 价格信息 */}
                    <div className="price-info-card">
                      <h4>💰 价格信息</h4>
                      <div className="price-details">
                        <div className="price-item">
                          <span className="price-label">当前价格:</span>
                          <span className="price-value">${data.usd}</span>
                        </div>
                        <div className="price-item">
                          <span className="price-label">市值:</span>
                          <span className="price-value">${formatNumber(data.usd_market_cap)}</span>
                        </div>
                        <div className="price-item">
                          <span className="price-label">24h交易量:</span>
                          <span className="price-value">${formatNumber(data.usd_24h_vol)}</span>
                        </div>
                        <div className="price-item">
                          <span className="price-label">24h变化:</span>
                          <span className={`price-value ${data.usd_24h_change >= 0 ? 'positive' : 'negative'}`}>
                            {data.usd_24h_change?.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 代币介绍 */}
                    {tokenData.coinDetail?.description?.en && (
                      <div className="token-description-card">
                        <h4>📖 代币介绍</h4>
                        <p className="description-text">
                          {tokenData.coinDetail.description.en.length > 300
                            ? tokenData.coinDetail.description.en.substring(0, 300) + '...'
                            : tokenData.coinDetail.description.en}
                        </p>
                      </div>
                    )}
                    
                    {/* 官方链接 */}
                    <div className="official-links-card">
                      <h4>🔗 官方链接</h4>
                      <div className="links-grid">
                        {tokenData.coinDetail?.links?.homepage?.[0] && (
                          <a href={tokenData.coinDetail.links.homepage[0]} target="_blank" rel="noopener noreferrer" className="link-item">
                            <span className="link-icon">🌐</span>
                            <span>官网</span>
                          </a>
                        )}
                        
                        {tokenData.coinDetail?.links?.whitepaper && (
                          <a href={tokenData.coinDetail.links.whitepaper} target="_blank" rel="noopener noreferrer" className="link-item">
                            <span className="link-icon">📄</span>
                            <span>白皮书</span>
                          </a>
                        )}
                        
                        {tokenData.coinDetail?.links?.repos_url?.github?.[0] && (
                          <a href={tokenData.coinDetail.links.repos_url.github[0]} target="_blank" rel="noopener noreferrer" className="link-item">
                            <span className="link-icon">💻</span>
                            <span>GitHub</span>
                          </a>
                        )}
                        
                        {tokenData.coinDetail?.links?.twitter_screen_name && (
                          <a href={`https://twitter.com/${tokenData.coinDetail.links.twitter_screen_name}`} target="_blank" rel="noopener noreferrer" className="link-item">
                            <span className="link-icon">🐦</span>
                            <span>Twitter</span>
                          </a>
                        )}
                        
                        {tokenData.coinDetail?.links?.telegram_channel_identifier && (
                          <a href={`https://t.me/${tokenData.coinDetail.links.telegram_channel_identifier}`} target="_blank" rel="noopener noreferrer" className="link-item">
                            <span className="link-icon">💬</span>
                            <span>Telegram</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 合约地址信息 - 单独显示在代币概览底部 */}
                  {(tokenData?.coinDetail?.contract_address || 
                    (tokenData?.coinDetail?.detail_platforms && 
                     Object.values(tokenData.coinDetail.detail_platforms).some(platform => platform.contract_address))) && (
                    <div className="contract-info-section" style={{marginTop: '25px', paddingTop: '20px', borderTop: '2px solid #4a5568'}}>
                      <h4 style={{color: '#ffc107', marginBottom: '15px', textAlign: 'center'}}>📋 合约地址</h4>
                      {tokenData.coinDetail.contract_address && (
                        <div className="contract-address" style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(255, 193, 7, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 193, 7, 0.3)'}}>
                          <span style={{color: '#e2e8f0', fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all', flex: 1}}>以太坊: {tokenData.coinDetail.contract_address}</span>
                          <button 
                            className="copy-button"
                            onClick={() => navigator.clipboard.writeText(tokenData.coinDetail.contract_address)}
                            title="复制地址"
                            style={{background: 'linear-gradient(45deg, #ffc107, #ffb300)', color: '#0f1419', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', fontWeight: '600'}}
                          >
                            📋 复制
                          </button>
                        </div>
                      )}
                      {!tokenData.coinDetail.contract_address && 
                       tokenData?.coinDetail?.detail_platforms && (
                        Object.entries(tokenData.coinDetail.detail_platforms)
                          .filter(([_, info]) => info.contract_address)
                          .slice(0, 1)
                          .map(([platform, info]) => (
                            <div key={platform} className="contract-address" style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(255, 193, 7, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 193, 7, 0.3)'}}>
                              <span style={{color: '#e2e8f0', fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all', flex: 1}}>{platform}: {info.contract_address}</span>
                              <button 
                                className="copy-button"
                                onClick={() => navigator.clipboard.writeText(info.contract_address)}
                                title="复制地址"
                                style={{background: 'linear-gradient(45deg, #ffc107, #ffb300)', color: '#0f1419', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', fontWeight: '600'}}
                              >
                                📋 复制
                              </button>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

          {/* 代币经济学模型 */}
          {tokenData.coinDetail && (
            <div className="data-section">
              <h2>代币经济学模型</h2>
              <div className="tokenomics-grid">
                <div className="tokenomics-card">
                  <h3>供应量信息</h3>
                  <p>总供应量: {formatSupply(tokenData.coinDetail.market_data?.total_supply)}</p>
                  <p>流通供应量: {formatSupply(tokenData.coinDetail.market_data?.circulating_supply)}</p>
                  <p>最大供应量: {formatSupply(tokenData.coinDetail.market_data?.max_supply)}</p>
                </div>
              </div>
            </div>
          )}

          {/* 相关协议信息 */}
          {tokenData.protocols.length > 0 && (
            <div className="data-section">
              <h2>相关协议 TVL</h2>
              <div className="protocols-grid">
                {tokenData.protocols.slice(0, 6).map((protocol) => (
                  <div key={protocol.id} className="protocol-card">
                    <h3>{protocol.name}</h3>
                    <p>TVL: ${formatNumber(protocol.tvl)}</p>
                    <p>链: {protocol.chains?.join(', ') || 'N/A'}</p>
                    <p>分类: {protocol.category || 'N/A'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 链TVL信息 */}
          <div className="data-section">
            <h2>主要链 TVL</h2>
            <div className="chains-grid">
              {tokenData.chains.slice(0, 8).map((chain) => (
                <div key={chain.name} className="chain-card">
                  <h3>{chain.name}</h3>
                  <p>TVL: ${formatNumber(chain.tvl)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
		)}
      </header>
    </div>
  );
}

export default App;