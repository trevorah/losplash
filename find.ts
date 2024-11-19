import { ReadableStream } from "node:stream/web";

export async function find<T>(
  stream: ReadableStream<T>,
  predicate: (chunk: T) => boolean,
): Promise<T | undefined> {
  const reader = stream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      reader.releaseLock();
      return undefined;
    }

    if (predicate(value)) {
      reader.releaseLock();
      return value;
    }
  }
}
