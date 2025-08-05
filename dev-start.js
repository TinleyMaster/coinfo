const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动 CoinInfo 开发环境...');

// 启动后端
console.log('📡 启动后端服务...');
const backend = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// 等待3秒后启动前端
setTimeout(() => {
  console.log('🌐 启动前端服务...');
  const frontend = spawn('npm', ['start'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit',
    shell: true
  });

  frontend.on('error', (err) => {
    console.error('前端启动失败:', err);
  });
}, 3000);

backend.on('error', (err) => {
  console.error('后端启动失败:', err);
});

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n正在关闭服务...');
  backend.kill();
  process.exit();
});