export abstract class BaseRepository<T, TCreate, TUpdate> {
  protected constructor(protected readonly prisma: T) {}

  protected async withTransaction<R>(operation: () => Promise<R>): Promise<R> {
    return operation();
  }
}
