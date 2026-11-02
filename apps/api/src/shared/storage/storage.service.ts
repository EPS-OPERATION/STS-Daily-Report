// Object-storage abstraction. Modules depend on this interface, never on MinIO directly.
// PostgreSQL stores only key/filename/mime/size/metadata; bytes live in MinIO.

export interface UploadInput {
  key: string;
  body: Uint8Array | Buffer;
  contentType?: string;
}

export interface StorageService {
  upload(input: UploadInput): Promise<{ key: string }>;
  remove(key: string): Promise<void>;
  getPresignedUrl(key: string, expiresSeconds?: number): Promise<string>;
}
