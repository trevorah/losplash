import { singleByter } from "./byter.ts";

export class Something {
  bytesRead: number;
  bytesReserved: number;
  reader: ReadableStreamDefaultReader;
  nextPromise: PromiseWithResolvers<void>;

  constructor(stream: ReadableStream) {
    this.reader = stream.pipeThrough(singleByter()).getReader();
    this.bytesRead = 0;
    this.bytesReserved = 0;
    this.nextPromise = Promise.withResolvers();
  }

  next(length: number) {
    const offsetStart = this.bytesReserved;
    const offsetEnd = offsetStart + length;
    this.bytesReserved += length;

    const self = this;

    return new ReadableStream({
      async pull(controller) {
        while (self.bytesRead < offsetStart) {
          await self.nextPromise.promise;
        }

        if (self.bytesRead >= offsetEnd) {
          controller.close();
          return;
        }

        const { done, value } = await self.reader.read();
        if (done) {
          controller.close();
          self.nextPromise.reject(new Error("EOF"));
          return;
        }

        controller.enqueue(value);
        self.bytesRead += value.length;
        self.nextPromise.resolve();
        self.nextPromise = Promise.withResolvers();
      },
    });
  }
}
