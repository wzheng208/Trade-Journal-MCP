import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';

function getBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export async function requireSupabaseAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = getBearerToken(req.header('authorization'));

    if (!token) {
      res.status(401).json({ error: 'Missing bearer token' });
      return;
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired auth token' });
      return;
    }

    req.user = {
      id: data.user.id,
      email: data.user.email ?? null,
    };

    next();
  } catch (error) {
    next(error);
  }
}
