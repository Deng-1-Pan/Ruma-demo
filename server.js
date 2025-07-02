import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// 静态文件服务
app.use(express.static(path.join(__dirname, 'dist')));

// SPA支持 - 所有路由都返回index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running at:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${HOST}:${PORT}`);
  console.log(`   
   📱 Mobile & Other Devices: http://8.149.247.69:${PORT}`);
  console.log('\n✨ Ready to serve your React app!');
}); 