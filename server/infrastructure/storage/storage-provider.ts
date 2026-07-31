import fs from 'node:fs/promises';
import path from 'node:path';

export interface StorageProvider {
  upload(key: string, data: Buffer, mimeType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export class LocalStorageProvider implements StorageProvider {
  private readonly uploadDir = path.join(process.cwd(), 'storage');

  async upload(key: string, data: Buffer, _mimeType: string): Promise<string> {
    const filePath = path.join(this.uploadDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    return `/storage/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    const filePath = path.join(this.uploadDir, key);
    return await fs.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    await fs.unlink(filePath).catch(() => {});
  }
}

export const storage = new LocalStorageProvider();
