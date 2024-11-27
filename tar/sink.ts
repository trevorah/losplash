import {
  ReadableStream,
  DecompressionStream,
  ReadableStreamBYOBReader,
  TransformStream,
} from "node:stream/web";

export const sink = async <T>(stream: ReadableStream<T>) => {
  const chunks: T[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return chunks;
};

export function concat(views: ArrayBufferView[]) {
  let length = 0;
  for (const v of views) length += v.byteLength;

  let buf = new Uint8Array(length);
  let offset = 0;
  for (const v of views) {
    const uint8view = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
    buf.set(uint8view, offset);
    offset += uint8view.byteLength;
  }

  return buf;
}

export const concatByteStream = async (
  stream: ReadableStream<Uint8Array>
): Promise<Uint8Array> => concat(await sink(stream));
