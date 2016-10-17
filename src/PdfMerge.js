import tmp from 'tmp'
import os from 'os'
import child from 'child_process'
import fs from 'fs'
import shellescape from 'shell-escape'

/**
 * Return a new instance of PDFMerge
 * @param pdfFiles
 * @param pdftkPath
 * @returns {PDFMerge}
 * @constructor
 */
class PDFMerge {
	constructor(pdfFiles, pdftkPath){
		if(!Array.isArray(pdfFiles) || pdfFiles.length === 0) {
			throw new Error('pdfFiles must be an array of absolute file paths.')
		}

		//Windows: Demand path to lib
		if(isWindowsPlatform()) {
			this.exec = child.execFile
			if(!pdftkPath || !fs.existsSync(pdftkPath)) {
				throw new Error('Path to PDFtk is incorrect.')
			}
			this.pdftkPath = pdftkPath
			this.isWin = true
		} else {
			this.exec = child.exec
		}

		//Array of files
		this.pdfFiles = pdfFiles

		//Get an available temporary filePath to be used in PDFtk
		this.tmpFilePath = tmp.tmpNameSync()

		//Setup Arguments to be used when calling PDFtk
		this.execArgs = this.assembleExecArgs(this)

		//Default Mode 'BUFFER'
		this.mode = 'BUFFER'

		//Default dont keep the temporary file
		this.keepTmpFile = false

		return this
	}

	/**
	 * Arguments for running PDFtk
	 * @returns {*}
	 */
	assembleExecArgs() {
		const { tmpFilePath } = this,
			execArgs = this.pdfFiles.map(file => this.isWin ? file : shellescape([file]))
		execArgs.push('cat', 'output', this.isWin ? tmpFilePath : shellescape([tmpFilePath]))
		return execArgs
	}


	/**
	 * Tells PDFMerge that we want a Buffer as our end result.
	 * @returns {PDFMerge}
	 */
	asBuffer() {
		this.mode = 'BUFFER'
		return this
	}

	/**
	 * Tells PDFMerge that we want a ReadStream as our end result.
	 * @returns {PDFMerge}
	 */
	asReadStream() {
		this.mode = 'READSTREAM'
		return this
	}

	/**
	 * Tells PDFMerge that we wish to store the merged PDF file as a new File, at given path.
	 * @param path
	 */
	asNewFile(path) {
		this.mode = 'NEWFILE'
		this.newFilePath = path
		return this
	}


	/**
	 * Tells PDFMerge to keep the temporary PDF file created by 'merge'
	 */
	keepTmpFile() {
		this.keepTmpFile = true
		return true
	}

	/**
	 * Run PDFMerge as a promise.
	 */
	promise() {
		return new Promise((resolve, reject) => {
			this.merge(function(error, result) {
				if (error) {
					return reject(error)
				}
				resolve(result)
			})
		})
	}

	/**
	 * Main function that runs the PDFtk merge command.
	 * @param callback
	 */
	merge(callback) {
		const {
			mode,
			keepTmpFile,
			tmpFilePath,
			newFilePath
		} = this

		//Windows or not, different syntax
		if(this.isWin) {
			this.exec(this.pdftkPath, this.execArgs, execCallbackHandler)
		} else {
			this.exec('pdftk ' + this.execArgs.join(' '), execCallbackHandler)
		}

		/**
		 * ErrorHandler for when PDFtk has been executed.
		 * @param error
		 * @returns {*}
		 */
		function execCallbackHandler(error, stdout, stderr) {
			if(error) {
				return callback(error)
			}

			/**
			 * BUFFER/NEWFILE processed the same way.
			 * For NEWFILE, it stores the buffer in a new file.
			 */
			if(mode === 'BUFFER' || mode === 'NEWFILE') {
				fs.readFile(tmpFilePath, function(error, buffer) {
					if(error) {
						return callback(error)
					}
					deleteFile()

					if(mode !== 'NEWFILE') {
						return callback(null, buffer)
					}

					fs.writeFile(newFilePath, buffer, function(error) {
						return callback(error, newFilePath)
					})
				})
			} else if(mode === 'READSTREAM') {
				var readStream = fs.createReadStream(tmpFilePath);
				callback(null, readStream);
				readStream.on('end', function() {
					deleteFile();
				});
			}
		}

		/**
		 * Cleanup the temporary file created through PDFtk.
		 * Don't cleanup if keepTmpFile === true
		 */
		function deleteFile() {
			if(!keepTmpFile) {
				fs.unlink(tmpFilePath, function() {})
			}
		}
	}

}

/**
 * Windows or not?
 * @returns {boolean}
 */
function isWindowsPlatform() {
	return os.type().indexOf('Windows') !== -1
}

/**
 * Escapes path if not windos
 * @returns {string}
 */
function escapePath(path) {
	return isWindowsPlatform() ? tmpFilePath : shellescape([tmpFilePath])
}

export default PDFMerge
