import test from "node:test";
import { ReadableStream, TransformStream } from "node:stream/web";
import assert from "node:assert";

function filter<T>(stream: ReadableStream<T>, predicate: (a: T) => boolean) {
  const t = new TransformStream<T, T>({
    async transform(chunk, controller) {
      if (predicate(chunk)) {
        controller.enqueue(chunk);
      }
    },
  });

  return stream.pipeThrough(t);
}

test("simple filter", async () => {
  const a = ReadableStream.from([1, 2, 3]);

  const b = filter(a, (a) => a > 1);

  const bArray = await Array.fromAsync(b);
  assert.deepEqual(bArray, [2, 3]);
});

test.todo("example from lodash");

test.todo("cancelled output reading bubbles back to sources");

test.todo("source errors come down to result");
