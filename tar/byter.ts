export function singleByter() {
  return new TransformStream({
    transform(chunk, controller) {
      for (let i = 0; i < chunk.length; i += chunk.ELEMENT_BYTE_SIZE) {
        const byte = chunk.viewFrom(i, i+chunk.ELEMENT_BYTE_SIZE); // not sure? could just do an assert
        controller.enqueue(byte);
      }
    }
  })
}
