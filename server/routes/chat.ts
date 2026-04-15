import { Router } from 'express';
import { postChat } from 'server/modules/chat/chat.controller.js';
import { requireSupabaseAuth } from 'server/middleware/requireSupabaseAuth.js';

const router = Router();

router.post('/', requireSupabaseAuth, postChat);

export default router;
