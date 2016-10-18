import debug from 'debug'
import { spawn, exec } from 'child_process'

const log = debug('pdf-merge')

export function merge(pdfFiles) {

	if(!Array.isArray(pdfFiles) || pdfFiles.length === 0) {
		throw new Error('pdfFiles must be an array of absolute file paths.')
	}

	const pdftk = spawn( 'pdftk', [...pdfFiles, 'cat', 'output', '-'] )

	const monitorInt = setInterval(() => {
		if (pdftk) {
			exec(`ps -p ${pdftk.pid} -o vsize=`, (err, stdout, stderr) => {
				if (err || stderr) {
					return log('error getting memory usage:', err || stderr)
				}
				log('memory usage:', parseInt(stdout, 10)/1024, 'Mb')
			})
		}
	}, 100)

	pdftk.on('exit', () => clearInterval(monitorInt))

	return pdftk.stdout
}
