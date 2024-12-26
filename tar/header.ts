const utf8decoder = new TextDecoder();


export class Header {
  header: Uint8Array;

  constructor(header: Uint8Array) {
    this.header = header;
  }

  get name(): string {
    return utf8decoder.decode(trimNullTerminated(this.header.subarray(0, 100)));
  }

  get mode(): string {
    return utf8decoder.decode(trimNullTerminated(this.header.subarray(100, 108)));
  }

  get ownerId(): string { 
    return utf8decoder.decode(
      trimNullTerminated(this.header.subarray(108, 116))
    );
  }

  get groupId(): string {
    return utf8decoder.decode(
      trimNullTerminated(this.header.subarray(116, 124))
    );
  }

  get fileSize(): number {
    return parseNumeric(this.header.subarray(124, 136));
  }

  get lastModified(): string {
    return utf8decoder.decode(
      trimNullTerminated(this.header.subarray(136, 148))
    );
  }

  get checksum(): number {
    return parseNumeric(this.header.subarray(148, 156));
  }
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
