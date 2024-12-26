import { ReadableStream } from "node:stream/web";
import { Readable } from "node:stream";
import fs from "node:fs";
import test from "node:test";
import { TextDecoder } from "node:util";
import { concatByteStream } from "./sink.ts";
import { Something } from "./something.ts";
import { Header as HeaderClass } from "./header.ts";

type FileType =
  | "file"
  | "link"
  | "symlink"
  | "directory"
  | "block-device"
  | "character-device"
  | "fifo"
  | "contiguous-file";

const fileTypeMapping: Record<string, FileType> = {
  "0": "file",
  "1": "link",
  "2": "symlink",
  "3": "character-device",
  "4": "block-device",
  "5": "directory",
  "6": "fifo",
  "7": "contiguous-file",
};

// enum FileTypeIndicator {
//   /** regular file */
//   REGTYPE = "0",
//   /** regular file */
//   AREGTYPE = "\0",
//   /** link */
//   LNKTYPE = "1",
//   /** reserved */
//   SYMTYPE = "2",
//   /** character special */
//   CHRTYPE = "3",
//   /** block special */
//   BLKTYPE = "4",
//   /** directory */
//   DIRTYPE = "5",
//   /** FIFO special */
//   FIFOTYPE = "6",
//   /** reserved */
//   CONTTYPE = "7",

//   /** Extended header referring to the next file in the archive */
//   XHDTYPE = "x",
//   /** Global extended header */
//   XGLTYPE = "g",
// }

type PosixHeader = {
  name: string;
  prefix: string;
  size: number;
  mode: number;
  mtime: number;
  // type: FileTypeIndicator;
  linkname: string | null;
  uid: number;
  gid: number;
  uname: string; // uname of entry owner. defaults to null
  gname: string; // gname of entry owner. defaults to null
  devmajor: number; // device major version. defaults to 0
  devminor: number; // device minor version. defaults to 0
};

type PaxHeader = {
  atime?: number;
  mtime?: number;
  path?: string;
  linkpath?: string;
  uname?: string;
  gname?: string;
  size?: number;
  uid?: number;
  gid?: number;
  unknownTags: Record<string, string>;
};

//   atime, mtime: all timestamps of a file in arbitrary resolution (most implementations use nanosecond granularity)
// path: path names of unlimited length and character set coding
// linkpath: symlink target names of unlimited length and character set coding
// uname, gname: user and group names of unlimited length and character set coding
// size: files with unlimited size (the historic tar format is 8 GB)
// uid, gid: userid and groupid without size limitation (the historic tar format was is limited to a max. id of 2097151)

export type Header = {
  name: string;
  size: number;
  mode: number;
  mtime: Date;
  type:
    | "file"
    | "link"
    | "symlink"
    | "directory"
    | "block-device"
    | "character-device"
    | "fifo"
    | "contiguous-file";
  linkname: string | null;
  uid: number;
  gid: number;
  uname: string; // uname of entry owner. defaults to null
  gname: string; // gname of entry owner. defaults to null
  devmajor: number; // device major version. defaults to 0
  devminor: number; // device minor version. defaults to 0
  // pax: null | PaxHeader;
};

export type Entry = {
  header: Header;
  body: ReadableStream<Uint8Array>;
};

export function extract(): TransformStream<Uint8Array, Entry> {
  const t = new TransformStream({});
  const segmentedStream = new Something(t.readable);

  const readable = new ReadableStream({
    async pull(controller) {
      const headerBin = await join(segmentedStream.next(512));
      const header = new HeaderClass(headerBin);
      // if (header.type === FileTypeIndicator.XHDTYPE) {
      //   // do special stuff
      // } else if (header.type === FileTypeIndicator.XGLTYPE) {
      //   // do special stuff
      // }

      const body = segmentedStream.next(header.fileSize);
      controller.enqueue({ header, body });
    },
  });

  return {
    writable: t.writable,
    readable,
  };
}


function createFileStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  maxByteLength: number
): ReadableStream<Uint8Array> {
  let enqueuedByteLength = 0;
  return new ReadableStream({
    pull: async (controller) => {
      if (enqueuedByteLength >= maxByteLength) {
        // handle the case where maxByteLength is 0
        controller.close();
        return;
      }

      const { done, value } = await reader.read();

      if (done || !value) {
        controller.close();
        return;
      }

      if (value.byteLength + enqueuedByteLength >= maxByteLength) {
        const trimmedChunk = value.subarray(
          0,
          maxByteLength - enqueuedByteLength
        );
        controller.enqueue(trimmedChunk);
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
  });
}

let utf8decoder = new TextDecoder();

function isEmpty(chunk: Uint8Array): boolean {
  return chunk.every((v) => v === 0x0);
}

export function parseHeader(view: Uint8Array): Header {
  const name = parseString(view.subarray(0, 100));
  const mode = parseOctal(view.subarray(100, 108)) as any;
  const uid = parseOctal(view.subarray(108, 116)) as any;
  const gid = parseOctal(view.subarray(116, 124));
  const size = parseOctal(view.subarray(124, 136));
  const lastModified = parseOctal(view.subarray(136, 148));
  const checksum = parseString(view.subarray(148, 156));
  const linkIndicator = parseString(view.subarray(156, 157));
  const type = fileTypeMapping[linkIndicator];
  const linkName = parseString(view.subarray(157, 257)) || null;
  const magic = parseString(view.subarray(257, 263));
  const version = parseString(view.subarray(263, 265));
  const uname = parseString(view.subarray(265, 297));
  const gname = parseString(view.subarray(297, 329));
  const devmajor = parseOctal(view.subarray(329, 337));
  const devminor = parseOctal(view.subarray(337, 345));
  const prefix = parseString(view.subarray(345, 500));

  return {
    name: prefix ? prefix + "/" + name : name,
    size,
    mode,
    uid,
    gid,
    mtime: new Date(lastModified * 1000),
    linkname: linkName,
    type,
    uname,
    gname,
    devmajor,
    devminor,
    // pax: null,
  };
}

export function decodeHeader(view: Uint8Array): PosixHeader {
  const name = parseString(view.subarray(0, 100));
  const mode = parseOctal(view.subarray(100, 108));
  const uid = parseOctal(view.subarray(108, 116));
  const gid = parseOctal(view.subarray(116, 124));
  const size = parseOctal(view.subarray(124, 136));
  const mtime = parseOctal(view.subarray(136, 148));
  const checksum = parseString(view.subarray(148, 156));
  const type = parseString(view.subarray(156, 157)) as FileTypeIndicator;
  const linkname = parseString(view.subarray(157, 257));
  const magic = parseString(view.subarray(257, 263));
  const version = parseString(view.subarray(263, 265));
  const uname = parseString(view.subarray(265, 297));
  const gname = parseString(view.subarray(297, 329));
  const devmajor = parseOctal(view.subarray(329, 337));
  const devminor = parseOctal(view.subarray(337, 345));
  const prefix = parseString(view.subarray(345, 500));

  return {
    name,
    prefix,
    size,
    mode,
    uid,
    gid,
    mtime,
    linkname,
    // type,
    uname,
    gname,
    devmajor,
    devminor,
  };
}

function decodePax(view: Uint8Array): PaxHeader {
  const str = utf8decoder.decode(view);
  const lines = str.split("\n");

  console.log(lines);

  const pax: PaxHeader = {
    unknownTags: {},
  };
  lines.forEach((line) => {
    if (!line) {
      return;
    }
    const spaceIndex = line.indexOf(" ");
    const size = parseInt(line.slice(0, spaceIndex), 10);
    const equalsIndex = line.indexOf("=");
    const key = line.slice(spaceIndex + 1, equalsIndex);
    const value = line.slice(equalsIndex + 1, size);

    switch (key) {
      case "atime":
        pax.atime = parseInt(value);
        break;
      case "mtime":
        pax.mtime = parseInt(value);
        break;
      case "path":
        pax.path = value;
        break;
      case "linkpath":
        pax.linkpath = value;
        break;
      case "uname":
        pax.uname = value;
        break;
      case "gname":
        pax.gname = value;
        break;
      case "size":
        pax.size = parseInt(value);
        break;
      case "uid":
        pax.uid = parseInt(value);
        break;
      case "gid":
        pax.gid = parseInt(value);
        break;
      default:
        pax.unknownTags[key] = value;
    }
  });
  return pax;
}

// function deriveHeader(
//   posixHeader: PosixHeader,
//   xPaxHeader: PaxHeader | null,
//   gPaxHeader: PaxHeader | null
// ): Header {
//   console.log({ posixHeader, xPaxHeader });
//   return {
//     name:
//       xPaxHeader?.path ??
//       (posixHeader.prefix
//         ? posixHeader.prefix + "/" + posixHeader.name
//         : posixHeader.name),
//     size: xPaxHeader?.size ?? posixHeader.size,
//     mode: posixHeader.mode,
//     mtime: new Date(posixHeader.mtime * 1000),
//     type: fileTypeMapping[posixHeader.type] as any,
//     linkname: posixHeader.linkname || null,
//     uid: xPaxHeader?.uid || posixHeader.uid,
//     gid: xPaxHeader?.gid || posixHeader.gid,
//     uname: xPaxHeader?.uname || posixHeader.uname,
//     gname: xPaxHeader?.gname || posixHeader.gname,
//     devmajor: posixHeader.devmajor,
//     devminor: posixHeader.devminor,
//     // pax: xPaxHeader,
//   };
// }

function parseString(view: Uint8Array): string {
  return utf8decoder.decode(trimNullTerminated(view));
}

function trimNullTerminated(view: Uint8Array) {
  const end = view.indexOf(0);
  if (end > -1) {
    return view.subarray(0, end);
  }

  return view;
}

function parseOctal(view: Uint8Array) {
  const str = utf8decoder.decode(view);
  const trimmed = str.trimEnd();
  return parseInt(trimmed, 8);
}



function join(stream: ReadableStream<Uint8Array>) {
  return concatByteStream(stream);
}
