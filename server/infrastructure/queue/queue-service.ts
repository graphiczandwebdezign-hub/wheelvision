export interface JobQueue {
  add(name: string, data: Record<string, unknown>): Promise<string>;
}

export class InMemoryJobQueue implements JobQueue {
  async add(name: string, data: Record<string, unknown>): Promise<string> {
    const jobId = `job-${Date.now()}`;
    console.log(`[JobQueue] Queued job ${name} (${jobId}) with data:`, data);
    return jobId;
  }
}

export const queue = new InMemoryJobQueue();
