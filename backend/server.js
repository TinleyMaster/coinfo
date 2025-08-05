const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios'); // 添加axios依赖
require('dotenv').config();

const Token = require('./models/Token');

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coininfo', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB连接成功'))
.catch(err => console.error('❌ MongoDB连接失败:', err));

// API路由

// 保存代币数据
app.post('/api/tokens', async (req, res) => {
  try {
    const tokenData = req.body;
    
    // 检查是否已存在相同symbol的最新记录
    const existingToken = await Token.findOne({ 
      symbol: tokenData.symbol 
    }).sort({ createdAt: -1 });
    
    // 如果存在且是今天的数据，则更新；否则创建新记录
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let savedToken;
    
    if (existingToken && existingToken.createdAt >= today) {
      // 更新今天的记录
      savedToken = await Token.findByIdAndUpdate(
        existingToken._id,
        { ...tokenData, updatedAt: new Date() },
        { new: true }
      );
      console.log(`📝 更新代币数据: ${tokenData.symbol}`);
    } else {
      // 创建新记录
      const token = new Token(tokenData);
      savedToken = await token.save();
      console.log(`💾 保存新代币数据: ${tokenData.symbol}`);
    }
    
    res.status(201).json({
      success: true,
      message: '数据保存成功',
      data: savedToken
    });
  } catch (error) {
    console.error('保存数据失败:', error);
    res.status(500).json({
      success: false,
      message: '保存数据失败',
      error: error.message
    });
  }
});

// 获取代币历史数据
app.get('/api/tokens/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 10, page = 1 } = req.query;
    
    const tokens = await Token.find({ 
      symbol: symbol.toUpperCase() 
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Token.countDocuments({ 
      symbol: symbol.toUpperCase() 
    });
    
    res.json({
      success: true,
      data: tokens,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据失败',
      error: error.message
    });
  }
});

// 获取所有保存的代币列表
app.get('/api/tokens', async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    
    // 获取每个symbol的最新记录
    const tokens = await Token.aggregate([
      {
        $sort: { symbol: 1, createdAt: -1 }
      },
      {
        $group: {
          _id: '$symbol',
          latestRecord: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$latestRecord' }
      },
      {
        $sort: { updatedAt: -1 }
      },
      {
        $skip: (parseInt(page) - 1) * parseInt(limit)
      },
      {
        $limit: parseInt(limit)
      }
    ]);
    
    const totalSymbols = await Token.distinct('symbol');
    
    res.json({
      success: true,
      data: tokens,
      pagination: {
        total: totalSymbols.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalSymbols.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取代币列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取代币列表失败',
      error: error.message
    });
  }
});

// 删除代币数据
app.delete('/api/tokens/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedToken = await Token.findByIdAndDelete(id);
    
    if (!deletedToken) {
      return res.status(404).json({
        success: false,
        message: '未找到要删除的数据'
      });
    }
    
    res.json({
      success: true,
      message: '数据删除成功',
      data: deletedToken
    });
  } catch (error) {
    console.error('删除数据失败:', error);
    res.status(500).json({
      success: false,
      message: '删除数据失败',
      error: error.message
    });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API服务运行正常',
    timestamp: new Date().toISOString()
  });
});

// 添加一个查看所有保存数据的路路由
app.get('/api/tokens/debug', async (req, res) => {
  try {
    const tokens = await Token.find().sort({ updatedAt: -1 }).limit(10);
    res.json({
      success: true,
      count: await Token.countDocuments(),
      tokens: tokens
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// RootData API代理路由
app.post('/api/rootdata/get_item', async (req, res) => {
  try {
    const API_KEY = 'Z6NlCXqyiO53Xv2WFNkTYIZi9KU2PQU8';
    
    console.log('RootData代理请求:', req.body);
    
    const response = await axios.post(
      'https://api.rootdata.com/open/get_item',
      req.body,
      {
        headers: {
          'apikey': API_KEY,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10秒超时
      }
    );
    
    console.log('RootData API响应:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('RootData API代理错误:', error.message);
    if (error.response) {
      console.error('错误响应:', error.response.status, error.response.data);
      res.status(error.response.status).json({
        success: false,
        error: 'RootData API调用失败',
        details: error.response.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'RootData API网络错误',
        details: error.message
      });
    }
  }
});

// 添加其他RootData API代理路由
app.post('/api/rootdata/search_projects', async (req, res) => {
  try {
    const API_KEY = 'Z6NlCXqyiO53Xv2WFNkTYIZi9KU2PQU8';
    
    const response = await axios.post(
      'https://api.rootdata.com/open/search_projects',
      req.body,
      {
        headers: {
          'apikey': API_KEY,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('RootData搜索API错误:', error.message);
    res.status(500).json({
      success: false,
      error: 'RootData搜索API调用失败',
      details: error.message
    });
  }
});

app.post('/api/rootdata/search_by_name', async (req, res) => {
  try {
    const API_KEY = 'Z6NlCXqyiO53Xv2WFNkTYIZi9KU2PQU8';
    
    const response = await axios.post(
      'https://api.rootdata.com/open/search_by_name',
      req.body,
      {
        headers: {
          'apikey': API_KEY,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('RootData名称搜索API错误:', error.message);
    res.status(500).json({
      success: false,
      error: 'RootData名称搜索API调用失败',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
});