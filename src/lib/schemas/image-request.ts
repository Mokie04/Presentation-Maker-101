import { z } from 'zod';

/** Image sources a client may request; the provider picks its own default when omitted. */
export const imageSourceSchema = z.enum(['ai', 'pexels', 'auto']);
