

export class Something {

  constructor(stream: ReadableStream) {
    this.stream = stream;
    this.reader = stream.getReader();
  }

  stream: ReadableStream;
  bytesRead: number;
  bytesReserved: number;
  
  reader: ReadableStreamDefaultReader;

  waitFor(bytes: number) {
    
    promises[promises.length + bytes] = Promise.withResolvers()
    
    
  }

  next(length) {
    
    const self = this;

    const offsetStart = self.bytesRead;
    const offsetEnd = offsetStart + length;


    
    const subStream = new ReadableStream({
     async pull(controller) {

       while (self.bytesRead < offsetStart) {
         await self.waitForNext
       }

       
       await self.waitFor(length);

       const { done, value } = await self.reader.read();
       if (done) {
         controller.close();
         self.destroyPending();
         return;
       }

       if (value.length > remaining)
         
       
       
       
       

    
  }

}