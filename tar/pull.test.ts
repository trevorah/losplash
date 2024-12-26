import { test } from "node:test";
import { ReadableStream, TransformStream } from "node:stream/web"
import { pull } from "./pull.ts";
import assert from "node:assert";

test("simple", async () => {
  const input = ReadableStream.from(["a", "b", "c", "d"]);
  const output = pull(input, 2);
  assert.deepEqual(await Array.fromAsync(output), ["a", "b"]);
  })