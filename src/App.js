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
  const [showAllContracts, setShowAllContracts] = useState(false);

  // 添加格式化解锁日期的函数
  const formatUnlockDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 添加计算距离解锁时间的函数
  const getDaysUntilUnlock = (dateString) => {
    if (!dateString) return null;
    const unlockDate = new Date(dateString);
    const today = new Date();
    const diffTime = unlockDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

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
      
      console.log('Search Response:', searchResponse.data);
      
      const coins = searchResponse.data.coins;
      if (coins.length === 0) {
        setError('未找到相关代币，请检查代币符号');
        setLoading(false);
        return;
      }
      
      const coinId = coins[0].id;
      const coinName = coins[0].name;
      const coinSymbolLower = coins[0].symbol?.toLowerCase();
      console.log('Found coin ID:', coinId, 'Name:', coinName);
      
      // 获取代币详细信息
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
      
      const relatedProtocols = protocols.filter(protocol => 
        protocol.name.toLowerCase().includes(tokenSymbol.toLowerCase()) ||
        protocol.symbol?.toLowerCase() === tokenSymbol.toLowerCase()
      );

      // 获取链TVL数据
      const chainsResponse = await axios.get('https://api.llama.fi/chains');
      
      // 获取代币解锁信息（模拟数据）
      let unlockData = null;
      try {
        const contractAddress = coinDetailResponse.data?.contract_address;
        
        if (contractAddress || coinSymbolLower) {
          // 这里使用模拟数据，实际使用时需要替换为真实API
          unlockData = {
            nextUnlock: {
              date: '2024-03-15',
              amount: 1000000,
              percentage: 5.2,
              category: 'Team'
            },
            totalLocked: 15000000,
            totalUnlocked: 85000000,
            unlockProgress: 85,
            vestingSchedule: [
              { date: '2024-01-15', amount: 2000000, category: 'Investors', status: 'completed' },
              { date: '2024-03-15', amount: 1000000, category: 'Team', status: 'upcoming' },
              { date: '2024-06-15', amount: 1500000, category: 'Ecosystem', status: 'upcoming' }
            ]
          };
        }
      } catch (unlockError) {
        console.log('获取解锁信息失败:', unlockError.message);
      }
      
      // 获取RootData项目信息
      let rootDataInfo = null;
      try {
        const API_KEY = 'Z6NlCXqyiO53Xv2WFNkTYIZi9KU2PQU8';
        let searchQuery = coinName || tokenSymbol;
        const contractAddress = coinDetailResponse.data?.contract_address;
        
        let rootDataResponse;
        
        if (contractAddress) {
          // 使用代理路径，避免 CORS 问题
          rootDataResponse = await axios.post(
            '/open/get_item',  // 相对路径，通过 package.json 代理
            {
              contract_address: contractAddress,
              include_team: true,
              include_investors: true
            },
            {
              headers: {
                'apikey': API_KEY,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            }
          );
        } else {
          console.log('尝试通过项目名称搜索:', searchQuery);
          throw new Error('需要project_id或contract_address参数');
        }
        
        console.log('RootData Response:',JSON.stringify(rootDataResponse.data));
        
        // 修正：API返回的数据结构是 {data: {project_name: ...}, result: 200}
        if (rootDataResponse.data && rootDataResponse.data.data && rootDataResponse.data.data.project_name) {
          rootDataInfo = rootDataResponse.data.data;  // 取data.data部分
        }
      } catch (rootDataError) {
        console.log('RootData API调用失败:', rootDataError.message);
      }
        //rootDataInfo = rootDataResponse.data;

      
      console.log('Coin Detail Data:', coinDetailResponse.data);
      console.log('RootData Info:', rootDataInfo);
      
      setTokenData({
        price: priceResponse.data,
        protocols: relatedProtocols,
        chains: chainsResponse.data,
        coinInfo: coins[0],
        coinDetail: coinDetailResponse.data,
        rootDataInfo: rootDataInfo,
        unlockData: unlockData // 添加解锁数据
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
                  
                  {/* 合约地址信息 */}
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
                
                {/* 新增：代币解锁信息卡片 */}
                {tokenData.unlockData && (
                  <div className="tokenomics-card unlock-info-card">
                    <h3>🔓 解锁信息</h3>
                    
                    {/* 解锁进度 */}
                    <div className="unlock-progress">
                      <div className="progress-header">
                        <span>解锁进度</span>
                        <span className="progress-percentage">{tokenData.unlockData.unlockProgress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{width: `${tokenData.unlockData.unlockProgress}%`}}
                        ></div>
                      </div>
                      <div className="progress-details">
                        <p>已解锁: {formatSupply(tokenData.unlockData.totalUnlocked)}</p>
                        <p>待解锁: {formatSupply(tokenData.unlockData.totalLocked)}</p>
                      </div>
                    </div>
                    
                    {/* 下次解锁信息 */}
                    {tokenData.unlockData.nextUnlock && (
                      <div className="next-unlock">
                        <h4>📅 下次解锁</h4>
                        <div className="unlock-details">
                          <p><strong>日期:</strong> {formatUnlockDate(tokenData.unlockData.nextUnlock.date)}</p>
                          <p><strong>数量:</strong> {formatSupply(tokenData.unlockData.nextUnlock.amount)}</p>
                          <p><strong>占比:</strong> {tokenData.unlockData.nextUnlock.percentage}%</p>
                          <p><strong>类别:</strong> {tokenData.unlockData.nextUnlock.category}</p>
                          {getDaysUntilUnlock(tokenData.unlockData.nextUnlock.date) !== null && (
                            <p className="days-until">
                              <strong>倒计时:</strong> {getDaysUntilUnlock(tokenData.unlockData.nextUnlock.date)} 天
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* 解锁时间表 */}
                    {tokenData.unlockData.vestingSchedule && tokenData.unlockData.vestingSchedule.length > 0 && (
                      <div className="vesting-schedule">
                        <h4>📋 解锁时间表</h4>
                        <div className="schedule-list">
                          {tokenData.unlockData.vestingSchedule.slice(0, 5).map((unlock, index) => (
                            <div key={index} className={`schedule-item ${unlock.status}`}>
                              <div className="schedule-date">{formatUnlockDate(unlock.date)}</div>
                              <div className="schedule-details">
                                <span className="schedule-amount">{formatSupply(unlock.amount)}</span>
                                <span className="schedule-category">{unlock.category}</span>
                              </div>
                              <div className={`schedule-status ${unlock.status}`}>
                                {unlock.status === 'completed' ? '✅ 已完成' : '⏳ 待解锁'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

          {/* RootData 融资信息和团队信息 */}
          {tokenData.rootDataInfo && (
            <div className="data-section">
              <h2>💼 项目信息 (RootData)</h2>
              <div className="rootdata-grid">
                
                {/* 项目基本信息 */}
                <div className="rootdata-card">
                  <h3>📊 项目概况</h3>
                  <div className="project-basic-info">
                    <p><strong>项目名称:</strong> {tokenData.rootDataInfo.project_name || 'N/A'}</p>
                    <p><strong>代币符号:</strong> {tokenData.rootDataInfo.token_symbol || 'N/A'}</p>
                    <p><strong>项目简介:</strong> {tokenData.rootDataInfo.one_liner || 'N/A'}</p>
                    <p><strong>项目描述:</strong> {tokenData.rootDataInfo.description || 'N/A'}</p>
                    <p><strong>成立时间:</strong> {tokenData.rootDataInfo.establishment_date || 'N/A'}</p>
                    <p><strong>项目状态:</strong> {tokenData.rootDataInfo.active ? '活跃' : '非活跃'}</p>
                    {tokenData.rootDataInfo.social_media?.website && (
                      <p><strong>官网:</strong> <a href={tokenData.rootDataInfo.social_media.website.trim()} target="_blank" rel="noopener noreferrer" style={{color: '#4CAF50'}}>{tokenData.rootDataInfo.social_media.website.trim()}</a></p>
                    )}
                    {tokenData.rootDataInfo.rootdataurl && (
                      <p><strong>RootData链接:</strong> <a href={tokenData.rootDataInfo.rootdataurl.trim()} target="_blank" rel="noopener noreferrer" style={{color: '#4CAF50'}}>查看详情</a></p>
                    )}
                  </div>
                </div>

                {/* 项目标签 */}
                {tokenData.rootDataInfo.tags && tokenData.rootDataInfo.tags.length > 0 && (
                  <div className="rootdata-card">
                    <h3>🏷️ 项目标签</h3>
                    <div className="tags-container">
                      {tokenData.rootDataInfo.tags.map((tag, index) => (
                        <span key={index} className="project-tag" style={{background: '#4CAF50', color: 'white', padding: '4px 8px', borderRadius: '12px', margin: '2px', display: 'inline-block', fontSize: '0.9em'}}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 投资机构 */}
                {tokenData.rootDataInfo.investors && tokenData.rootDataInfo.investors.length > 0 && (
                  <div className="rootdata-card">
                    <h3>🏛️ 投资机构</h3>
                    <div className="investors-grid">
                      {tokenData.rootDataInfo.investors.map((investor, index) => (
                        <div key={index} className="investor-card" style={{border: '1px solid #4a5568', borderRadius: '8px', padding: '12px', margin: '8px 0'}}>
                          {investor.logo && (
                            <img src={investor.logo.trim()} alt={investor.name} style={{width: '40px', height: '40px', borderRadius: '50%', marginBottom: '8px'}} onError={(e) => e.target.style.display = 'none'} />
                          )}
                          <p className="investor-name" style={{fontWeight: 'bold', marginBottom: '4px'}}>{investor.name || 'N/A'}</p>
                          <p className="investor-type" style={{fontSize: '0.9em', color: '#a0aec0'}}>
                            {investor.type === 1 ? '交易所' : investor.type === 2 ? '投资机构' : '其他'}
                            {investor.lead_investor === 1 && ' (领投)'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 相似项目 */}
                {tokenData.rootDataInfo.similar_project && tokenData.rootDataInfo.similar_project.length > 0 && (
                  <div className="rootdata-card">
                    <h3>🔗 相似项目</h3>
                    <div className="similar-projects-grid">
                      {tokenData.rootDataInfo.similar_project.slice(0, 6).map((project, index) => (
                        <div key={index} className="similar-project-card" style={{border: '1px solid #4a5568', borderRadius: '8px', padding: '12px', margin: '8px 0'}}>
                          {project.logo && (
                            <img src={project.logo.trim()} alt={project.project_name} style={{width: '32px', height: '32px', borderRadius: '50%', marginBottom: '8px'}} onError={(e) => e.target.style.display = 'none'} />
                          )}
                          <p className="project-name" style={{fontWeight: 'bold', marginBottom: '4px'}}>{project.project_name}</p>
                          <p className="project-desc" style={{fontSize: '0.9em', color: '#a0aec0'}}>{project.brief_description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 社交媒体链接 */}
                {tokenData.rootDataInfo.social_media && (
                  <div className="rootdata-card">
                    <h3>🌐 社交媒体</h3>
                    <div className="social-links">
                      {tokenData.rootDataInfo.social_media.website && (
                        <a href={tokenData.rootDataInfo.social_media.website.trim()} target="_blank" rel="noopener noreferrer" className="social-link" style={{display: 'inline-block', margin: '4px 8px', padding: '8px 12px', background: '#4CAF50', color: 'white', borderRadius: '6px', textDecoration: 'none'}}>🌐 官网</a>
                      )}
                      {tokenData.rootDataInfo.social_media.github && (
                        <a href={tokenData.rootDataInfo.social_media.github.trim()} target="_blank" rel="noopener noreferrer" className="social-link" style={{display: 'inline-block', margin: '4px 8px', padding: '8px 12px', background: '#333', color: 'white', borderRadius: '6px', textDecoration: 'none'}}>💻 GitHub</a>
                      )}
                      {tokenData.rootDataInfo.social_media.X && (
                        <a href={tokenData.rootDataInfo.social_media.X.trim()} target="_blank" rel="noopener noreferrer" className="social-link" style={{display: 'inline-block', margin: '4px 8px', padding: '8px 12px', background: '#1DA1F2', color: 'white', borderRadius: '6px', textDecoration: 'none'}}>🐦 Twitter</a>
                      )}
                      {tokenData.rootDataInfo.social_media.medium && (
                        <a href={tokenData.rootDataInfo.social_media.medium.trim()} target="_blank" rel="noopener noreferrer" className="social-link" style={{display: 'inline-block', margin: '4px 8px', padding: '8px 12px', background: '#00ab6c', color: 'white', borderRadius: '6px', textDecoration: 'none'}}>📝 Medium</a>
                      )}
                      {tokenData.rootDataInfo.social_media.coingecko && (
                        <a href={`https://www.coingecko.com/en/coins/${tokenData.rootDataInfo.social_media.coingecko}`} target="_blank" rel="noopener noreferrer" className="social-link" style={{display: 'inline-block', margin: '4px 8px', padding: '8px 12px', background: '#8dc647', color: 'white', borderRadius: '6px', textDecoration: 'none'}}>🦎 CoinGecko</a>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
        )}
      </header>
    </div>
  );
}

export default App;