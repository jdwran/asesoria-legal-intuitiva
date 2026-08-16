import { env } from "cloudflare:workers";

type R2ObjectBody = {
  arrayBuffer(): Promise<ArrayBuffer>;
};

type R2Bucket = {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
};

function caseFileBucket() {
  const bucket = (env as unknown as { FILES?: R2Bucket }).FILES;
  if (!bucket || typeof bucket.put !== "function" || typeof bucket.get !== "function") {
    throw new Error("Case file storage is unavailable.");
  }
  return bucket;
}

export function caseFileObjectKey(userId: string, fileId: string) {
  if (!/^[a-zA-Z0-9-]{1,160}$/u.test(userId) || !/^[a-zA-Z0-9-]{1,160}$/u.test(fileId)) {
    throw new Error("Invalid case file storage identity.");
  }
  return `users/${userId}/files/${fileId}`;
}

export async function putEncryptedCaseFile(objectKey: string, content: Uint8Array) {
  await caseFileBucket().put(objectKey, content, {
    httpMetadata: { contentType: "application/octet-stream" },
  });
}

export async function getEncryptedCaseFile(objectKey: string) {
  const object = await caseFileBucket().get(objectKey);
  if (!object) return null;
  return new Uint8Array(await object.arrayBuffer());
}

export async function deleteEncryptedCaseFile(objectKey: string) {
  await caseFileBucket().delete(objectKey);
}
