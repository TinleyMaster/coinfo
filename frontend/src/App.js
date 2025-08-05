import React, { useState } from 'react';
import axios from 'axios';
import './App.css';
import SavedTokens from './SavedTokens'; // 新增组件

function App() {
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenData, setTokenData] = useState(null);
  const [protocolData, setProtocolData] = useState(null);
  const [chainData, setChainData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAllContracts, setShowAllContracts] = useState(false);
  const [tokenHolders, setTokenHolders] = useState(null);
  const [holdersLoading, setHoldersLoading] = useState(false);
  
  // 新增状态
  const [savedTokens, setSavedTokens] = useState([]);
  const [showSavedTokens, setShowSavedTokens] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // 后端API基础URL
  const API_BASE_URL = 'http://localhost:5000/api';

  // 加载已保存的代币列表
  React.useEffect(() => {
    fetchSavedTokens();
  }, []);

  // 获取已保存的代币列表
  const fetchSavedTokens = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tokens`);
      setSavedTokens(response.data);
    } catch (error) {
      console.error('获取已保存代币失败:', error);
    }
  };

  // 保存代币数据到数据库
  const saveTokenData = async () => {
    if (!tokenData || !tokenData.coinInfo) {
      setSaveMessage('没有可保存的代币数据');
      return;
    }

    setSaveLoading(true);
    setSaveMessage('');

    try {
      const tokenToSave = {
        coinId: tokenData.coinInfo.id,
        symbol: tokenData.coinInfo.symbol,
        name: tokenData.coinInfo.name,
        currentPrice: tokenData.price ? Object.values(tokenData.price)[0]?.usd : null,
        marketCap: tokenData.price ? Object.values(tokenData.price)[0]?.usd_market_cap : null,
        volume24h: tokenData.price ? Object.values(tokenData.price)[0]?.usd_24h_vol : null,
        priceChange24h: tokenData.price ? Object.values(tokenData.price)[0]?.usd_24h_change : null,
        contractAddress: tokenData.coinDetail?.contract_address || 
          (tokenData.coinDetail?.detail_platforms && 
           Object.values(tokenData.coinDetail.detail_platforms)
             .find(platform => platform.contract_address)?.contract_address),
        totalSupply: tokenData.coinDetail?.market_data?.total_supply,
        circulatingSupply: tokenData.coinDetail?.market_data?.circulating_supply,
        maxSupply: tokenData.coinDetail?.market_data?.max_supply,
        description: tokenData.coinDetail?.description?.en,
        homepage: tokenData.coinDetail?.links?.homepage?.[0],
        whitepaper: tokenData.coinDetail?.links?.whitepaper,
        github: tokenData.coinDetail?.links?.repos_url?.github?.[0],
        twitter: tokenData.coinDetail?.links?.twitter_screen_name,
        telegram: tokenData.coinDetail?.links?.telegram_channel_identifier,
        rootDataInfo: tokenData.rootDataInfo,
        unlockData: tokenData.unlockData,
        holderCount: tokenHolders?.holders?.length || 0,
        topHolders: tokenHolders?.holders?.slice(0, 10) || []
      };

      const response = await axios.post(`${API_BASE_URL}/tokens`, tokenToSave);
      
      if (response.data.success) {
        setSaveMessage('代币数据保存成功！');
        fetchSavedTokens(); // 刷新已保存列表
      } else {
        setSaveMessage('保存失败: ' + response.data.message);
      }
    } catch (error) {
      console.error('保存代币数据失败:', error);
      if (error.response?.status === 409) {
        setSaveMessage('该代币已存在，数据已更新');
        fetchSavedTokens();
      } else {
        setSaveMessage('保存失败: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setSaveLoading(false);
      // 3秒后清除消息
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // 删除已保存的代币
  const deleteSavedToken = async (tokenId) => {
    try {
      await axios.delete(`${API_BASE_URL}/tokens/${tokenId}`);
      setSavedTokens(savedTokens.filter(token => token._id !== tokenId));
    } catch (error) {
      console.error('删除代币失败:', error);
    }
  };

  // 加载已保存的代币数据
  const loadSavedToken = async (coinId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tokens/${coinId}`);
      const savedToken = response.data;
      
      // 重构数据格式以匹配现有的tokenData结构
      const reconstructedData = {
        price: {
          [savedToken.coinId]: {
            usd: savedToken.currentPrice,
            usd_market_cap: savedToken.marketCap,
            usd_24h_vol: savedToken.volume24h,
            usd_24h_change: savedToken.priceChange24h
          }
        },
        coinInfo: {
          id: savedToken.coinId,
          symbol: savedToken.symbol,
          name: savedToken.name
        },
        coinDetail: {
          contract_address: savedToken.contractAddress,
          market_data: {
            total_supply: savedToken.totalSupply,
            circulating_supply: savedToken.circulatingSupply,
            max_supply: savedToken.maxSupply
          },
          description: {
            en: savedToken.description
          },
          links: {
            homepage: savedToken.homepage ? [savedToken.homepage] : [],
            whitepaper: savedToken.whitepaper,
            repos_url: {
              github: savedToken.github ? [savedToken.github] : []
            },
            twitter_screen_name: savedToken.twitter,
            telegram_channel_identifier: savedToken.telegram
          }
        },
        rootDataInfo: savedToken.rootDataInfo,
        unlockData: savedToken.unlockData,
        protocols: [],
        chains: []
      };
      
      setTokenData(reconstructedData);
      setTokenSymbol(savedToken.symbol);
      
      // 如果有持有者数据，也加载它
      if (savedToken.topHolders && savedToken.topHolders.length > 0) {
        setTokenHolders({
          token_address: savedToken.contractAddress,
          chain_id: 1,
          holders: savedToken.topHolders
        });
      }
      
      setShowSavedTokens(false);
    } catch (error) {
      console.error('加载已保存代币失败:', error);
    }
  };

  // 添加代币持有者数据的函数
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

// 定义获取代币数据的函数
const handleFetchTokenData = async () => {
    if (!tokenSymbol.trim()) {
      setError('请输入代币符号');
      return;
    }

    setLoading(true);
    setError('');
    setTokenData(null);
    setProtocolData(null);
    setChainData(null);
    setSaveMessage(''); // 清除之前的保存消息

    try {
      // 🔥 新增：首先检查数据库是否已有该代币数据
      console.log('正在检查数据库中是否存在代币:', tokenSymbol);
      
      try {
        // 通过符号搜索数据库中的代币
        const dbResponse = await axios.get(`${API_BASE_URL}/tokens`);
        const savedTokens = dbResponse.data.data; // 使用 dbResponse.data.data
        
        // 查找匹配的代币
        const existingToken = savedTokens.find(token => 
          token.symbol?.toUpperCase() === tokenSymbol.toUpperCase() ||
          token.name?.toLowerCase() === tokenSymbol.toLowerCase() ||
          token.coinId?.toLowerCase() === tokenSymbol.toLowerCase()
        );
        
        if (existingToken) {
          console.log('✅ 在数据库中找到代币数据，直接加载:', existingToken.symbol);
          setSaveMessage('📂 从数据库加载已保存的数据');
          
          // 重构数据格式（使用正确的字段映射）
          const reconstructedData = {
            price: {
              [existingToken.coinId]: {
                usd: existingToken.priceData?.usd || 0,
                usd_market_cap: existingToken.priceData?.usd_market_cap || 0,
                usd_24h_vol: existingToken.priceData?.usd_24h_vol || 0,
                usd_24h_change: existingToken.priceData?.usd_24h_change || 0
              }
            },
            coinInfo: {
              id: existingToken.coinId,
              symbol: existingToken.symbol,
              name: existingToken.name
            },
            coinDetail: existingToken.coinDetail || {
              contract_address: '',
              market_data: {
                total_supply: null,
                circulating_supply: null,
                max_supply: null
              },
              description: { en: '' },
              links: {}
            },
            rootDataInfo: existingToken.rootDataInfo,
            protocols: existingToken.protocols || [],
            chains: existingToken.chains || []
          };
          
          setTokenData(reconstructedData);
          setTokenSymbol(existingToken.symbol);
          
          // 加载持有者数据
          if (existingToken.holdersData?.holders) {
            setTokenHolders(existingToken.holdersData);
          }
          
          setLoading(false);
          setTimeout(() => setSaveMessage(''), 3000);
          return; // 直接返回，不再调用API
        } else {
          console.log('❌ 数据库中未找到代币数据，将调用API查询');
          setSaveMessage('🔍 数据库中无此代币，正在从API获取最新数据...');
        }
      } catch (dbError) {
        console.log('数据库查询失败，继续API查询:', dbError.message);
        setSaveMessage('⚠️ 数据库查询失败，正在从API获取数据...');
      }

      // 🔥 原有的API查询逻辑保持不变
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
      console.log('协议数据:', protocolsResponse?.data);
      
      const relatedProtocols = protocols.filter(protocol => 
        protocol.name.toLowerCase().includes(tokenSymbol.toLowerCase()) ||
        protocol.symbol?.toLowerCase() === tokenSymbol.toLowerCase()
      );

      // 获取链TVL数据
      const chainsResponse = await axios.get('https://api.llama.fi/chains');
      console.log('链数据:', chainsResponse?.data);
      
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
        let searchQuery = coinName || tokenSymbol;
        const contractAddress = coinDetailResponse.data?.contract_address;
        
        console.log('=== RootData API 调试信息 ===');
        console.log('搜索查询:', searchQuery);
        console.log('合约地址:', contractAddress);
        console.log('代币ID:', coinId);
        
        // 检查是否为原生代币
        const isNativeToken = [
          'bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot', 
          'avalanche-2', 'polygon', 'binancecoin', 'chainlink'
        ].includes(coinId);
        
        let rootDataResponse;
        
        if (contractAddress) {
          // 有合约地址的代币，使用合约地址查询
          rootDataResponse = await axios.post(
            `${API_BASE_URL}/rootdata/get_item`,
            {
              contract_address: contractAddress,
              include_team: true,
              include_investors: true
            }
          );
        } else if (isNativeToken) {
          // 原生代币，使用代币符号查询
          console.log('原生代币，尝试通过符号搜索:', coinSymbolLower?.toUpperCase());
          
          // 为原生代币创建符号映射
          const nativeTokenSymbols = {
            'bitcoin': 'BTC',
            'ethereum': 'ETH', 
            'solana': 'SOL',
            'cardano': 'ADA',
            'polkadot': 'DOT',
            'avalanche-2': 'AVAX',
            'polygon': 'MATIC',
            'binancecoin': 'BNB',
            'chainlink': 'LINK'
          };
          
          const tokenSymbolForSearch = nativeTokenSymbols[coinId] || coinSymbolLower?.toUpperCase();
          
          // 尝试使用符号搜索
          try {
            rootDataResponse = await axios.post(
              `${API_BASE_URL}/rootdata/search_projects`,
              {
                symbol: tokenSymbolForSearch,
                include_team: true,
                include_investors: true
              }
            );
          } catch (searchError) {
            console.log('符号搜索失败，尝试项目名称搜索:', searchQuery);
            rootDataResponse = await axios.post(
              `${API_BASE_URL}/rootdata/search_by_name`,
              {
                project_name: searchQuery,
                include_team: true,
                include_investors: true
              }
            );
          }
        } else {
          console.log('尝试通过项目名称搜索:', searchQuery);
          // 对于其他没有合约地址的代币，尝试名称搜索
          rootDataResponse = await axios.post(
            `${API_BASE_URL}/rootdata/search_by_name`,
            {
              project_name: searchQuery,
              include_team: true,
              include_investors: true
            }
          );
        }
        
        console.log('RootData API 响应:', rootDataResponse?.data);
        console.log('RootData响应:', rootDataResponse?.data);
        
        // 处理API返回的数据结构
        if (rootDataResponse && rootDataResponse.data) {
          if (rootDataResponse.data.data && rootDataResponse.data.data.project_name) {
            rootDataInfo = rootDataResponse.data.data;
          } else if (Array.isArray(rootDataResponse.data.data) && rootDataResponse.data.data.length > 0) {
            // 如果返回的是搜索结果数组，取第一个匹配的项目
            rootDataInfo = rootDataResponse.data.data[0];
          }
        }
        
        console.log('处理后的 rootDataInfo:', rootDataInfo);
        
      } catch (rootDataError) {
        console.error('RootData API调用失败 - 详细错误:', rootDataError);
        console.error('错误响应:', rootDataError.response?.data);
        console.error('错误状态:', rootDataError.response?.status);
        
        // 如果API调用失败，为原生代币提供基本信息
        const isNativeToken = [
          'bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot', 
          'avalanche-2', 'polygon', 'binancecoin', 'chainlink'
        ].includes(coinId);
        
        if (isNativeToken) {
          console.log('为原生代币提供基本信息');
          rootDataInfo = {
            project_name: coinName,
            symbol: coinSymbolLower?.toUpperCase(),
            type: 'native_token',
            blockchain: coinName,
            description: `${coinName} 是 ${coinName} 区块链的原生代币`
          };
        }
      }
      
      console.log('Coin Detail Data:', coinDetailResponse.data);
      console.log('RootData Info:', rootDataInfo);
      
      // 创建代币数据对象
      const newTokenData = {
        price: priceResponse.data,
        protocols: relatedProtocols,
        chains: chainsResponse.data,
        coinInfo: coins[0],
        coinDetail: coinDetailResponse.data,
        rootDataInfo: rootDataInfo,
        unlockData: unlockData
      };
      
      // 设置代币数据
      setTokenData(newTokenData);
      
      // 获取持有者信息
      const contractAddress = coinDetailResponse.data?.contract_address || 
        (coinDetailResponse.data?.detail_platforms && 
         Object.values(coinDetailResponse.data.detail_platforms)
           .find(platform => platform.contract_address)?.contract_address);
      
      let currentHoldersData = null;
      if (contractAddress) {
        console.log('找到合约地址，开始获取持有者信息:', contractAddress);
        currentHoldersData = await fetchTokenHolders(contractAddress, 1);
        console.log('持有者数据:', currentHoldersData);
        // 注意：这里需要等待fetchTokenHolders完成后再获取最新的holders数据
        // 由于setState是异步的，我们需要在fetchTokenHolders函数中返回数据
      } else {
        console.log('未找到合约地址，无法获取持有者信息');
        setTokenHolders(null);
      }

      // 🔥 关键修改：在数据获取完成后自动保存到数据库
      console.log('开始自动保存数据到数据库...');
      console.log('保存的数据结构:', {
        tokenData: newTokenData,
        holdersData: currentHoldersData,
        protocols: relatedProtocols?.length || 0,
        chains: chainsResponse?.data?.length || 0,
        rootDataInfo: rootDataInfo ? 'exists' : 'null'
      });
      await autoSaveTokenData(newTokenData, currentHoldersData);

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

  // 新增：自动保存代币数据的函数
  const autoSaveTokenData = async (tokenDataToSave, holdersData = null) => {
    if (!tokenDataToSave || !tokenDataToSave.coinInfo) {
      console.log('没有可保存的代币数据');
      return;
    }

    setSaveLoading(true);
    setSaveMessage('正在保存数据...');

    try {
      const priceInfo = tokenDataToSave.price ? Object.values(tokenDataToSave.price)[0] : {};
      
      const tokenToSave = {
        coinId: tokenDataToSave.coinInfo.id,
        symbol: tokenDataToSave.coinInfo.symbol,
        name: tokenDataToSave.coinInfo.name,
        
        // 按照数据库模型结构保存价格数据
        priceData: {
          usd: priceInfo?.usd || 0,
          usd_market_cap: priceInfo?.usd_market_cap || 0,
          usd_24h_vol: priceInfo?.usd_24h_vol || 0,
          usd_24h_change: priceInfo?.usd_24h_change || 0,
          last_updated: new Date()
        },
        
        // 按照数据库模型结构保存代币详情
        coinDetail: {
          contract_address: tokenDataToSave.coinDetail?.contract_address || 
            (tokenDataToSave.coinDetail?.detail_platforms && 
             Object.values(tokenDataToSave.coinDetail.detail_platforms)
               .find(platform => platform.contract_address)?.contract_address),
          description: tokenDataToSave.coinDetail?.description || {},
          links: tokenDataToSave.coinDetail?.links || {},
          market_data: {
            total_supply: tokenDataToSave.coinDetail?.market_data?.total_supply,
            circulating_supply: tokenDataToSave.coinDetail?.market_data?.circulating_supply,
            max_supply: tokenDataToSave.coinDetail?.market_data?.max_supply
          },
          detail_platforms: tokenDataToSave.coinDetail?.detail_platforms || {}
        },
        
        rootDataInfo: tokenDataToSave.rootDataInfo,
        protocols: tokenDataToSave.protocols || [],
        chains: tokenDataToSave.chains || [],
        holdersData: {
          holders: holdersData?.holders || [],
          token_address: holdersData?.token_address || '',
          chain_id: holdersData?.chain_id || 1
        }
      };

      console.log('准备保存的数据:', {
        symbol: tokenToSave.symbol,
        priceData: tokenToSave.priceData,
        marketData: tokenToSave.coinDetail.market_data,
        holdersCount: tokenToSave.holdersData.holders.length,
        protocolsCount: tokenToSave.protocols?.length || 0,
        chainsCount: tokenToSave.chains?.length || 0,
        hasRootData: !!tokenToSave.rootDataInfo
      });

      const response = await axios.post(`${API_BASE_URL}/tokens`, tokenToSave);
      
      if (response.data.success) {
        setSaveMessage('✅ 数据已自动保存到数据库');
        fetchSavedTokens();
        console.log('代币数据自动保存成功');
      } else {
        setSaveMessage('⚠️ 自动保存失败: ' + response.data.message);
      }
    } catch (error) {
      console.error('自动保存代币数据失败:', error);
      if (error.response?.status === 409) {
        setSaveMessage('✅ 代币已存在，数据已更新');
        fetchSavedTokens();
      } else {
        setSaveMessage('❌ 自动保存失败: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setSaveLoading(false);
      setTimeout(() => setSaveMessage(''), 5000);
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

  // 添加获取代币持有者的函数
  const fetchTokenHolders = async (contractAddress, chainId = 1) => {
    if (!contractAddress) {
      console.log('没有合约地址，无法获取持有者信息');
      return null;
    }

    setHoldersLoading(true);
    try {
      console.log('正在获取持有者信息:', { contractAddress, chainId });
      const response = await axios.get(
        `https://api.sim.dune.com/v1/evm/token-holders/${chainId}/${contractAddress}`,
        {
          headers: {
            'X-Sim-Api-Key': 'sim_rfUzqqB5XME2ow3yKOEPOrY9OUTeXW95'
          }
        }
      );
      
      console.log('Dune API Response Status:', response.status);
      console.log('Dune API Response Data:', response.data);
      
      if (response.data && response.data.holders) {
        setTokenHolders(response.data);
        return response.data;
      } else {
        console.log('API响应中没有holders数据');
        return null;
      }
    } catch (error) {
      console.error('获取代币持有者失败:', error);
      console.error('错误详情:', error.response?.data);
      return null;
    } finally {
      setHoldersLoading(false);
    }
  };

  // 格式化代币余额
  const formatTokenBalance = (balance, decimals = 18) => {
    if (!balance) return '0';
    const balanceNum = parseFloat(balance) / Math.pow(10, decimals);
    if (balanceNum >= 1e9) return (balanceNum / 1e9).toFixed(2) + 'B';
    if (balanceNum >= 1e6) return (balanceNum / 1e6).toFixed(2) + 'M';
    if (balanceNum >= 1e3) return (balanceNum / 1e3).toFixed(2) + 'K';
    return balanceNum.toFixed(2);
  };

  // 格式化钱包地址
  const formatWalletAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
            onKeyPress={(e) => e.key === 'Enter' && handleFetchTokenData()}
          />
          <button onClick={handleFetchTokenData} disabled={loading} className="search-button">
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
                
                {/* 新增：代币持有者信息卡片 */}
                <div className="tokenomics-card holders-info-card">
                  <h3>👥 代币持有者</h3>
                  {holdersLoading ? (
                    <div className="loading-spinner">加载中...</div>
                  ) : tokenHolders ? (
                    <div className="holders-content">
                      <div className="holders-summary">
                        <p><strong>合约地址:</strong> {formatWalletAddress(tokenHolders.token_address)}</p>
                        <p><strong>链ID:</strong> {tokenHolders.chain_id}</p>
                        <p><strong>持有者数量:</strong> {tokenHolders.holders?.length || 0}+</p>
                      </div>
                      
                      {tokenHolders.holders && tokenHolders.holders.length > 0 && (
                        <div className="holders-list">
                          <h4>🏆 主要持有者</h4>
                          {tokenHolders.holders.slice(0, 5).map((holder, index) => (
                            <div key={index} className="holder-item">
                              <div className="holder-rank">#{index + 1}</div>
                              <div className="holder-details">
                                <div className="holder-address">
                                  <span className="address-text">{formatWalletAddress(holder.wallet_address)}</span>
                                  <button 
                                    className="copy-button-small"
                                    onClick={() => navigator.clipboard.writeText(holder.wallet_address)}
                                    title="复制完整地址"
                                  >
                                    📋
                                  </button>
                                </div>
                                <div className="holder-balance">
                                  <strong>{formatTokenBalance(holder.balance)}</strong> 代币
                                </div>
                                <div className="holder-info">
                                  <span className="first-acquired">
                                    首次获得: {new Date(holder.first_acquired).toLocaleDateString('zh-CN')}
                                  </span>
                                  <span className={`transfer-status ${holder.has_initiated_transfer ? 'active' : 'inactive'}`}>
                                    {holder.has_initiated_transfer ? '🔄 活跃' : '💤 静态'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {tokenHolders.next_offset && (
                        <div className="holders-pagination">
                          <p className="pagination-info">还有更多持有者数据...</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="no-holders-data">
                      <p>暂无持有者数据</p>
                      <p className="data-note">需要合约地址才能获取持有者信息</p>
                    </div>
                  )}
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
