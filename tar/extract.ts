import {
  ReadableStream,
  DecompressionStream,
  ReadableStreamBYOBReader,
  TransformStream,
} from "node:stream/web";
import { TextDecoder } from "node:util";
import { PushStream } from "./push";
import { CutoffStream } from "./cutoff";

export type Entry = {
  name: string;
  body: ReadableStream<Uint8Array>;
};

export class Chunker extends TransformStream<Uint8Array, Uint8Array> {
  private size: number;

  private _buffer: Uint8Array;

  constructor() {
    super({
      transform(chunk, controller) {
        if (chunk.length > 512) {
          for (let offset = 0; offset < chunk.length; offset += 512) {
            controller.enqueue(new Uint8Array(chunk.buffer, offset, 512));
          }
        }
      },
    });

    this.size = 512;

    const buffer = new ArrayBuffer(512);
    this._buffer = new Uint8Array(buffer);
  }
}

type State =
  | {
      name: "READING_HEADER";
    }
  | {
      name: "READING_BODY";
      fileStream: PushStream<Uint8Array>;
      processedBytes: number;
      fileSizeBytes: number;
    };

export class ExtractTarStream extends TransformStream<Uint8Array, Entry> {
  constructor() {
    let state: State = { name: "READING_HEADER" };
    super({
      async transform(chunk, controller) {
        console.log({state})
        if (state.name === "READING_HEADER") {
          const header = parseHeader(chunk);
         
          const fileStream = new PushStream<Uint8Array>();
          controller.enqueue({
            name: header.name,
            body: fileStream,
          });
          state = {
            name: "READING_BODY",
            fileSizeBytes: (header as any).fileSize,
            processedBytes: 0,
            fileStream,
          };
        } else if (state.name === "READING_BODY") {
          if (state.fileSizeBytes >= state.processedBytes) {
            controller.error(new Error("Impossible state"))
            return;
          }

          if (chunk.byteLength + state.processedBytes >= state.fileSizeBytes) {
            const smallerChunkSize = state.fileSizeBytes - state.processedBytes;

            const smallerChunk = chunk.subarray(0, smallerChunkSize);

            await state.fileStream.push(smallerChunk);
            state.fileStream.end();
            state = { name: "READING_HEADER" };
          } else {
            await state.fileStream.push(chunk);

            state.processedBytes += chunk.byteLength;
          }
        }
      },
      start(controller) {
        controller.desiredSize;
      },
    });
  }
}

let utf8decoder = new TextDecoder();

function parseHeader(view: Uint8Array): Omit<Entry, "body"> {
  const name = utf8decoder.decode(trimNullTerminated(view.subarray(0, 100)));
  const mode = utf8decoder.decode(trimNullTerminated(view.subarray(100, 108)));
  const ownerId = utf8decoder.decode(
    trimNullTerminated(view.subarray(108, 116))
  );
  const groupId = utf8decoder.decode(
    trimNullTerminated(view.subarray(116, 124))
  );
  const fileSize = parseNumeric(view.subarray(124, 136));
  const lastModified = utf8decoder.decode(
    trimNullTerminated(view.subarray(136, 148))
  );
  const checksum = utf8decoder.decode(
    trimNullTerminated(view.subarray(148, 156))
  );
  const linkIndicator = utf8decoder.decode(
    trimNullTerminated(view.subarray(156, 157))
  );
  const linkName = utf8decoder.decode(
    trimNullTerminated(view.subarray(157, 257))
  );

  return {
    name,
    mode,
    ownerId,
    groupId,
    fileSize,
    lastModified,
    checksum,
    linkIndicator,
    linkName,
  } as any;
}

function trimNullTerminated(view: Uint8Array) {
  const end = view.indexOf(0);
  if (end > -1) {
    return view.subarray(0, end);
  }

  return view;
}

function parseNumeric(view: Uint8Array) {
  const str = utf8decoder.decode(view);
  const trimmed = str.trimEnd();
  return parseInt(trimmed, 8);
}
