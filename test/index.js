
import { merge } from '../src/PdfMerge'
import { createWriteStream } from 'fs'
import { resolve } from 'path'

const outStream = merge([
  resolve(__dirname, './in1.pdf'),
  resolve(__dirname, './in2.pdf')
])

outStream.pipe(createWriteStream(resolve(__dirname, './out.pdf')))
