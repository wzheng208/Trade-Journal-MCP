import express from 'express';
import chatRouter from './routes/chat.js';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

console.log('HTTP app not implemented yet');

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/chat', chatRouter);

const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
