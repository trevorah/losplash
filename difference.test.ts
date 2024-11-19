import test from "node:test";
import { ReadableStream, TransformStream } from "node:stream/web";
import assert from "node:assert";
import { find } from "./find.ts";
import { enforceSorted } from "./enforceSorted.ts";

function differenceWith<T>(
  source: ReadableStream<T>,
  stream1: ReadableStream<T>,
  comparator: (a: T, b: T) => number,
): ReadableStream<T> {
  const reader = source.pipeThrough(enforceSorted(comparator)).getReader();

  let latest: T | undefined;

  return new ReadableStream<T>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          controller.close();
          return;
        }

        if (latest === undefined || comparator(latest, value) > 0) {
          latest = await find(stream1, (a) => comparator(value, a) <= 0);
        }

        if (latest === undefined) {
          controller.close();
        }

        if (latest !== value) {
          controller.enqueue(value);
          return;
        }
      }
    },
  });
}

test("simple difference", async () => {
  const a = ReadableStream.from([1, 2]);
  const b = ReadableStream.from([2, 3]);

  const r = differenceWith(a, b, (a, b) => a - b);

  const rArray = await Array.fromAsync(r);
  assert.deepEqual(rArray, [1]);
});

test.todo("example from lodash");

test.todo("cancelled output reading bubbles back to sources");

test.todo("source errors come down to result");
