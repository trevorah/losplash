import { ReadableStream } from "node:stream/web";
import { Readable } from "node:stream";
import fs from "node:fs";
import test from "node:test";
import { Chunker } from "./extract";
import { TextDecoder } from "node:util";
import { concatByteStream } from "./sink";
import assert = require("node:assert");

test("one-file", async () => {
  const tarStream = Readable.toWeb(
    fs.createReadStream("src/__tests__/fixtures/one-file.tar")
  );

  const files = await Array.fromAsync(
    tarStream.pipeThrough(extract()).pipeThrough(
      map(async (entry) => {
        const { header, body } = entry;
        const text = (
          await Array.fromAsync(body.pipeThrough(new TextDecoderStream()))
        ).join("");
        return { header, text };
      })
    )
  );

  assert.deepEqual(files, [
    {
      header: {
        name: "test.txt",
        mode: 0o644,
        uid: 501,
        gid: 20,
        size: 12,
        mtime: new Date(1387580181000),
        type: "file",
        linkname: null,
        uname: "maf",
        gname: "staff",
        devmajor: 0,
        devminor: 0,
        // pax: null
      },
      text: "hello world\n",
    },
  ]);
});

function map<T, U>(fn: (chunk: T) => Promise<U>): TransformStream<T, U> {
  return new TransformStream({
    async transform(chunk, controller) {
      controller.enqueue(await fn(chunk));
    },
  });
}
