
import {  TransformStream } from "node:stream/web";


export function enforceSorted<T>(compare: (a: T, b: T) => number): TransformStream<T> {
  let isFirstChunk = true;
  let previous: T | undefined;

  return new TransformStream<T, T>({
    async transform(chunk, controller) {
      if (isFirstChunk) {
        isFirstChunk = false;
        previous = chunk;
        controller.enqueue(chunk);
        return;
      }
      const result = compare(previous, chunk);
      if (result > 0) {
        throw new Error("out of order");
      }

      previous = chunk;
      controller.enqueue(chunk);
    },
  });
}

