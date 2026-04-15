// import type { Request, Response, NextFunction } from 'express';
// import { z } from 'zod';
// import { runChat } from './chat.service.js';

// const chatMessageSchema = z.object({
//   role: z.enum(['user', 'assistant']),
//   content: z.string().min(1),
// });

// const chatRequestSchema = z.object({
//   messages: z.array(chatMessageSchema).min(1),
// });

// export async function postChat(
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) {
//   try {
//     const userId = req.user.id;
//     const { messages } = chatRequestSchema.parse(req.body);

//     const result = await runChat({
//       userId,
//       messages,
//     });

//     res.json(result);
//   } catch (error) {
//     next(error);
//   }
// }

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { runChat } from './chat.service.js';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
});

export async function postChat(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { messages } = chatRequestSchema.parse(req.body);

    if (!req.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await runChat({
      userId: req.user.id,
      messages,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}