import test from "node:test";
import { ReadableStream } from "node:stream/web";
import assert from "node:assert";

function concat<T>(...streams: (ReadableStream<T> | T | T[])[]) {
  const readers = streams.map((stream) => {
    if (stream instanceof ReadableStream) {
      return stream.getReader();
    }
    if (Array.isArray(stream)) {
      return ReadableStream.from(stream).getReader();
    }
    return ReadableStream.from([stream]).getReader();
  });

  const result = new ReadableStream<T>({
    async pull(controller) {
      for (let reader of readers) {
        const { done, value } = await reader.read();
        if (!done) {
          controller.enqueue(value);
          return;
        }
      }

      controller.close();
    },
  });
  return result;
}

test("simple concat", async () => {
  const a = ReadableStream.from([1, 2]);
  const b = ReadableStream.from([3, 4]);

  const c = concat(a, b);

  const cArray = await Array.fromAsync(c);

  assert.deepEqual(cArray, [1, 2, 3, 4]);
});

test("concat with empty streams", async () => {
  const a = ReadableStream.from([]);
  const b = ReadableStream.from([]);
  const c = concat(a, b);

  const cArray = await Array.fromAsync(c);
  assert.deepEqual(cArray, []);
});

test("concat with multiple streams", async () => {
  const a = ReadableStream.from([1, 2]);
  const b = ReadableStream.from([3, 4]);
  const c = ReadableStream.from([5, 6]);
  const d = concat(a, b, c);

  const dArray = await Array.fromAsync(d);
  assert.deepEqual(dArray, [1, 2, 3, 4, 5, 6]);
});

test("example from lodash", async () => {
  const a = ReadableStream.from([1]);
  const r = concat(a, 2, [3], [[4]]);

  const rArray = await Array.fromAsync(r);
  assert.deepEqual(rArray, [1, 2, 3, [4]]);
});

test.todo("cancelled output reading bubbles back to sources");

test.todo("source errors come down to result");
