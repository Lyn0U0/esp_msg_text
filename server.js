import express from 'express';
import cors from 'cors';
import { createClient } from 'redis';

const app = express();
app.use(cors());
app.use(express.json());

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

/* 讀取全部 */
app.get('/notes', async (_, res) => {
  const data = await redis.hGetAll('notes');
  res.json(data);
});

/* 新增 */
app.post('/notes', async (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'empty' });

  const id = Date.now().toString();
  await redis.hSet('notes', id, text);
  res.json({ id, text });
});

/* 更新 */
app.put('/notes/:id', async (req, res) => {
  const { id } = req.params;
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'empty' });

  const exists = await redis.hExists('notes', id);
  if (!exists) return res.status(404).json({ error: 'not found' });

  await redis.hSet('notes', id, text);
  res.json({ id, text });
});

/* 刪除 */
app.delete('/notes/:id', async (req, res) => {
  const { id } = req.params;
  await redis.hDel('notes', id);
  res.status(204).end();
});

app.listen(process.env.PORT || 3000, () =>
  console.log('API running')
);
