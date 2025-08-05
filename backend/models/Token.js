const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  name: String,
  coinId: String,
  
  // 价格信息
  priceData: {
    usd: Number,
    usd_market_cap: Number,
    usd_24h_vol: Number,
    usd_24h_change: Number,
    last_updated: Date
  },
  
  // 代币详情
  coinDetail: {
    contract_address: String,
    description: Object,
    links: Object,
    market_data: Object,
    detail_platforms: Object
  },
  
  // 持有者信息
  holdersData: {
    token_address: String,
    chain_id: Number,
    holders: [{
      wallet_address: String,
      balance: String,
      first_acquired: Date,
      has_initiated_transfer: Boolean
    }],
    next_offset: String
  },
  
  // 协议信息
  protocols: [{
    id: String,
    name: String,
    tvl: Number,
    chains: [String],
    category: String
  }],
  
  // 链信息
  chains: [{
    name: String,
    tvl: Number
  }],
  
  // RootData信息
  // RootData信息
  rootDataInfo: {
    project_name: String,
    token_symbol: String,
    one_liner: String,
    description: String,
    active: Boolean,
    rootdataurl: String,
    project_id: Number,
    logo: String,
    establishment_date: String,
    tags: [String],
    investors: [Object], 
    similar_project: [Object], 
    social_media: Object
  },
  
  // 解锁数据
  // 移除或注释掉 unlockData 字段
  /*
  unlockData: {
    unlockProgress: Number,
    totalUnlocked: Number,
    totalLocked: Number,
    nextUnlock: Object,
    vestingSchedule: [Object]
  }
  */
}, {
  timestamps: true // 自动添加createdAt和updatedAt
});

// 创建复合索引
tokenSchema.index({ symbol: 1, createdAt: -1 });
tokenSchema.index({ 'coinDetail.contract_address': 1 });

module.exports = mongoose.model('Token', tokenSchema);