import express from 'express';
import analyticsRouter from './routes/analytics.js';
import chatRouter from './routes/chat.js';
import importsRouter from './routes/imports.js';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config({ path: './server/.env' });

const app = express();
const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:8080';

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  }),
);

app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/chat', chatRouter);
app.use('/api/imports', importsRouter);
app.use('/api/analytics', analyticsRouter);

const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
