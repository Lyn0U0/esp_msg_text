import express from 'express';
import cors from 'cors';
import { createClient } from 'redis';

const app = express();
app.use(cors());          // 允許前端跨網域呼叫
app.use(express.json());  // 解析 JSON

// 連 Valkey/Redis
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

// 新增筆記
app.post('/notes', async (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'empty' });

  const id = Date.now().toString();
  await redis.hSet('notes', id, text);
  res.json({ id, text });
});

// 讀取全部筆記
app.get('/notes', async (_, res) => {
  const data = await redis.hGetAll('notes');
  res.json(data);
});

app.listen(process.env.PORT || 3000, () =>
  console.log('API running')
);
