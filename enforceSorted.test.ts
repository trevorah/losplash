import test from "node:test";
import { ReadableStream, TransformStream } from "node:stream/web";
import assert from "node:assert";
import { find } from "./find.ts";
import { enforceSorted } from "./enforceSorted.ts";


test("sorted stream stays sorted", async () => {
  const input = ReadableStream.from(['a', 'b', 'c']);

  const output = await Array.fromAsync(input.pipeThrough(enforceSorted((a, b) => a.localeCompare(b))))


  assert.deepEqual(output, ['a', 'b', 'c']);
});

test.todo("example from lodash");

test.todo("cancelled output reading bubbles back to sources");

test.todo("source errors come down to result");
