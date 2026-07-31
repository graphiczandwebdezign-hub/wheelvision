export abstract class BaseService<TRepository> {
  protected constructor(protected readonly repository: TRepository) {}
}
