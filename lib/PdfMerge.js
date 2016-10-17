'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _tmp = require('tmp');

var _tmp2 = _interopRequireDefault(_tmp);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _shellEscape = require('shell-escape');

var _shellEscape2 = _interopRequireDefault(_shellEscape);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Return a new instance of PDFMerge
 * @param pdfFiles
 * @param pdftkPath
 * @returns {PDFMerge}
 * @constructor
 */
var PDFMerge = function () {
	function PDFMerge(pdfFiles, pdftkPath) {
		_classCallCheck(this, PDFMerge);

		if (!Array.isArray(pdfFiles) || pdfFiles.length === 0) {
			throw new Error('pdfFiles must be an array of absolute file paths.');
		}

		//Windows: Demand path to lib
		if (isWindowsPlatform()) {
			this.exec = _child_process2.default.execFile;
			if (!pdftkPath || !_fs2.default.existsSync(pdftkPath)) {
				throw new Error('Path to PDFtk is incorrect.');
			}
			this.pdftkPath = pdftkPath;
			this.isWin = true;
		} else {
			this.exec = _child_process2.default.exec;
		}

		//Array of files
		this.pdfFiles = pdfFiles;

		//Get an available temporary filePath to be used in PDFtk
		this.tmpFilePath = _tmp2.default.tmpNameSync();

		//Setup Arguments to be used when calling PDFtk
		this.execArgs = this.assembleExecArgs(this);

		//Default Mode 'BUFFER'
		this.mode = 'BUFFER';

		//Default dont keep the temporary file
		this.keepTmpFile = false;

		return this;
	}

	/**
  * Arguments for running PDFtk
  * @returns {*}
  */


	_createClass(PDFMerge, [{
		key: 'assembleExecArgs',
		value: function assembleExecArgs() {
			var mode = this.mode;
			var tmpFilePath = this.tmpFilePath;
			var isStream = mode === 'READSTREAM';
			var execArgs = this.pdfFiles.map(escapePath);
			execArgs.push('cat');
			execArgs.push('output', isStream ? '-' : escapePath(tmpFilePath));

			return execArgs;
		}

		/**
   * Tells PDFMerge that we want a Buffer as our end result.
   * @returns {PDFMerge}
   */

	}, {
		key: 'asBuffer',
		value: function asBuffer() {
			this.mode = 'BUFFER';
			return this;
		}

		/**
   * Tells PDFMerge that we want a ReadStream as our end result.
   * @returns {PDFMerge}
   */

	}, {
		key: 'asReadStream',
		value: function asReadStream() {
			this.mode = 'READSTREAM';
			return this;
		}

		/**
   * Tells PDFMerge that we wish to store the merged PDF file as a new File, at given path.
   * @param path
   */

	}, {
		key: 'asNewFile',
		value: function asNewFile(path) {
			this.mode = 'NEWFILE';
			this.newFilePath = path;
			return this;
		}

		/**
   * Tells PDFMerge to keep the temporary PDF file created by 'merge'
   */

	}, {
		key: 'keepTmpFile',
		value: function keepTmpFile() {
			this.keepTmpFile = true;
			return true;
		}

		/**
   * Run PDFMerge as a promise.
   */

	}, {
		key: 'promise',
		value: function promise() {
			var _this = this;

			return new Promise(function (resolve, reject) {
				_this.merge(function (error, result) {
					if (error) {
						return reject(error);
					}
					resolve(result);
				});
			});
		}

		/**
   * Main function that runs the PDFtk merge command.
   * @param callback
   */

	}, {
		key: 'merge',
		value: function merge(callback) {
			var mode = this.mode;
			var keepTmpFile = this.keepTmpFile;
			var tmpFilePath = this.tmpFilePath;
			var newFilePath = this.newFilePath;

			//Windows or not, different syntax

			if (this.isWin) {
				this.exec(this.pdftkPath, this.execArgs, execCallbackHandler);
			} else {
				this.exec('pdftk ' + this.execArgs.join(' '), execCallbackHandler);
			}

			/**
    * ErrorHandler for when PDFtk has been executed.
    * @param error
    * @returns {*}
    */
			function execCallbackHandler(error, stdout, stderr) {
				if (error) {
					return callback(error);
				}

				/**
     * BUFFER/NEWFILE processed the same way.
     * For NEWFILE, it stores the buffer in a new file.
     */
				if (mode === 'BUFFER' || mode === 'NEWFILE') {
					_fs2.default.readFile(tmpFilePath, function (error, buffer) {
						if (error) {
							return callback(error);
						}
						deleteFile(tmpFilePath);

						if (mode !== 'NEWFILE') {
							return callback(null, buffer);
						}

						_fs2.default.writeFile(newFilePath, buffer, function (error) {
							return callback(error, newFilePath);
						});
					});
				} else if (mode === 'READSTREAM') {
					callback(null, stdout);
				}
			}

			/**
    * Cleanup the temporary file created through PDFtk.
    * Don't cleanup if keepTmpFile === true
    */
			function deleteFile(tmpFilePath) {
				if (!keepTmpFile) {
					_fs2.default.unlink(tmpFilePath, function () {});
				}
			}
		}
	}]);

	return PDFMerge;
}();

/**
 * Windows or not?
 * @returns {boolean}
 */


function isWindowsPlatform() {
	return _os2.default.type().indexOf('Windows') !== -1;
}

/**
 * Escapes path if not windos
 * @returns {string}
 */
function escapePath(path) {
	return isWindowsPlatform() ? path : (0, _shellEscape2.default)([path]);
}

exports.default = PDFMerge;