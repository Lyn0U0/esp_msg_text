import express from 'express';
import cors from 'cors';
import { createClient } from 'redis';
import iconv from 'iconv-lite';

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

/* 取得最新一筆並回傳 BIG5 HEX 字串 */
/* 取得最新一筆並回傳 BIG5 HEX 字串，若是 QR: 則直接傳明碼 */
app.get('/latest-big5', async (_, res) => {
  const data = await redis.hGetAll('notes');
  const ids = Object.keys(data);
  if (ids.length === 0) {
    return res.status(404).json({ error: 'no notes' });
  }
  // 找最新（字串排序）
  const latestId = ids.sort().pop();
  const text = data[latestId];

  // === 加這段判斷 ===
  if (text.startsWith('QR:')) {
    // 直接傳明碼
    return res.json({ note: text });
  }
  // =================

  // 其餘內容轉 BIG5 HEX
  const buf = iconv.encode(text, 'big5');
  const hex = buf.toString('hex').toUpperCase();

  res.json({ note: hex });
});

// 1) 回報狀態 （ESP POST 這裡）
app.post('/status', async (req, res) => {
  const msg = (req.body.message || '').trim();
  if (!msg) return res.status(400).json({ error: 'empty' });
  const entry = JSON.stringify({ ts: Date.now(), message: msg });

  // push 新訊息，保留最新 10 筆
  await redis.lPush('status', entry);
  await redis.lTrim('status', 0, 9);
  // 設整個 list 在 24 小時後自動過期
  await redis.expire('status', 24 * 3600);

  res.json({ ok: true });
});


// 2) 取得狀態清單
app.get('/status', async (_, res) => {
  const raw = await redis.lRange('status', 0, -1);
  // 轉成 JSON array
  const arr = raw.map(s => JSON.parse(s));
  res.json(arr);
});

app.listen(process.env.PORT || 3000, () =>
  console.log('API running')
);