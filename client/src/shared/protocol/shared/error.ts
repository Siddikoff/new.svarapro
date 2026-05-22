/**
 * Protocol-level error frame schema.
 *
 * Used both as a server-pushed event (`ERROR`) and as the failure shape
 * of `parseServerFrame`/`parseClientFrame`.
 */
import { z } from 'zod';

export const ProtocolErrorCodeSchema = z.enum([
  'bad_request',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'server_error',
  'protocol_violation',
  'unknown',
]);
export type ProtocolErrorCode = z.infer<typeof ProtocolErrorCodeSchema>;

export const ProtocolErrorSchema = z.object({
  code: ProtocolErrorCodeSchema.default('unknown'),
  message: z.string().min(1),
  /** Optional reference to the offending event for diagnostics. */
  ref: z.string().optional(),
  /** Optional structured details — never trusted as code-shaped data. */
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ProtocolError = z.infer<typeof ProtocolErrorSchema>;
