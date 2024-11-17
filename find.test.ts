import test from "node:test";
import { ReadableStream, TransformStream } from "node:stream/web";
import assert from "node:assert";

async function find<T>(
  stream: ReadableStream<T>,
  predicate: (chunk: T) => boolean,
): Promise<T | undefined> {
  const reader = stream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return undefined;
    }

    if (predicate(value)) {
      reader.releaseLock();
      return value;
    }
  }
}

test("simple find", async () => {
  const a = ReadableStream.from([1, 2, 3]);
  

  const r = await find(a, (a) => a > 1);

  
  assert.deepEqual(r, 2);
});

test("find leaves the stream readable", async () => {
  const a = ReadableStream.from([1, 2, 3]);
  await find(a, (a) => a > 1);
  const r = await find(a, (a) => a > 1);
  assert.deepEqual(r, 3);
  })

test.todo("example from lodash");

test.todo("cancelled output reading bubbles back to sources");

test.todo("source errors come down to result");
