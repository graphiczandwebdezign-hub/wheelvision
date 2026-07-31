import type { PrismaClient } from '@prisma/client';

/**
 * The PrismaClient surface available inside an interactive transaction —
 * identical to the client except connection/transaction management, which
 * the transaction runner owns.
 */
export type RepositoryTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export abstract class BaseRepository {
  protected constructor(protected readonly prisma: PrismaClient) {}

  /**
   * Run a set of operations inside a single database transaction. All
   * queries issued through the provided client commit or roll back together.
   */
  protected async withTransaction<R>(
    operation: (tx: RepositoryTransaction) => Promise<R>,
  ): Promise<R> {
    return this.prisma.$transaction((tx: RepositoryTransaction) => operation(tx));
  }
}
