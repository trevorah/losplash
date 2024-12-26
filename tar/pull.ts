
export function pull(stream: ReadableStream, chunkCount: number) {
  const reader = stream.getReader()
  let i = 0;

  return new ReadableStream({
    async pull(controller) {
      if (i >= chunkCount) {
        reader.releaseLock()
        controller.close()
        return
      }
      const { done, value } = await reader.read()
      if (done) {
        controller.close()
        return
      }
      controller.enqueue(value)
      i++
    }
  })
}
