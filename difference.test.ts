import test from "node:test";
import { ReadableStream, TransformStream } from "node:stream/web";
import assert from "node:assert";

function difference<T>(primary: ReadableStream<T>, ...streams: ReadableStream<T>[]): ReadableStream<T> {

  const reader = primary.getReader();

  let latest = []



  return new ReadableStream<T>({

async pull(controller) {

  const { done, value } = await reader.read();

  if (done) {
    controller.close();
    return;
  }

 if (latest.length > 0 && latest.find((a) => a === value)) {
   
 }

  const 

  restReaders.forEach((reader, i) => {
    

  


  }
    })
  
  
      
}

test("simple difference", async () => {
  const a = ReadableStream.from([1, 2]);
  const b = ReadableStream.from([2,3]);

  const r = difference(a, b);

  const rArray = await Array.fromAsync(r);
  assert.deepEqual(rArray, [1]);
});

test.todo("example from lodash");

test.todo("cancelled output reading bubbles back to sources");

test.todo("source errors come down to result");
