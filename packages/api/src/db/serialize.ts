/** Maps a lean() Mongoose document's `_id` to `id` and drops `__v`, matching the previous Prisma response shape. */
export function toId(doc: Record<string, any>): Record<string, any> & { id: string } {
  const { _id, __v, ...rest } = doc;
  return { id: _id, ...rest };
}

export function toIds(docs: Record<string, any>[]): (Record<string, any> & { id: string })[] {
  return docs.map(toId);
}
