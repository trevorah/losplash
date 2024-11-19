import test from "node:test";
import { ReadableStream, TransformStream } from "node:stream/web";
import assert from "node:assert";
import { find } from "./find.ts";
import { enforceSorted } from "./enforceSorted.ts";

function chunk<T>(size: number): TransformStream<T, T[]> {
  let batch: T[] = [];

  return new TransformStream<T, T[]>({
    async transform(chunk, controller) {
      batch.push(chunk);
      if (batch.length >= size) {
        controller.enqueue(batch);
        batch = [];
      }
    },
    async flush(controller) {
      if (batch.length > 0) {
        controller.enqueue(batch);
      }
    },
  });
}

test("easy chunk", async () => {
  const input = ReadableStream.from(["a", "b", "c", "d"]);

  const output = input.pipeThrough(chunk(2));

  assert.deepEqual(await Array.fromAsync(output), [
    ["a", "b"],
    ["c", "d"],
  ]);
});

test("chunk with a size of 3", async () => {
  const input = ReadableStream.from(["a", "b", "c", "d"]);

  const output = input.pipeThrough(chunk(3));

  assert.deepEqual(await Array.fromAsync(output), [["a", "b", "c"], ["d"]]);
});

test.todo("example from lodash");

test.todo("cancelled output reading bubbles back to sources");

test.todo("source errors come down to result");
