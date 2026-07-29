import { randomUUID } from 'crypto';

/** Generates string primary keys, matching the previous Prisma `@default(uuid())` format. */
export const genId = (): string => randomUUID();
