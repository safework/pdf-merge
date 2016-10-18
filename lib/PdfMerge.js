'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.merge = merge;

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _child_process = require('child_process');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var log = (0, _debug2.default)('pdf-merge');

function merge(pdfFiles) {

	if (!Array.isArray(pdfFiles) || pdfFiles.length === 0) {
		throw new Error('pdfFiles must be an array of absolute file paths.');
	}

	var pdftk = (0, _child_process.spawn)('pdftk', [].concat(_toConsumableArray(pdfFiles), ['cat', 'output', '-']));

	var monitorInt = setInterval(function () {
		if (pdftk) {
			(0, _child_process.exec)('ps -p ' + pdftk.pid + ' -o vsize=', function (err, stdout, stderr) {
				if (err || stderr) {
					return log('error getting memory usage:', err || stderr);
				}
				log('memory usage:', parseInt(stdout, 10) / 1024, 'Mb');
			});
		}
	}, 100);

	pdftk.on('exit', function () {
		return clearInterval(monitorInt);
	});

	return pdftk.stdout;
}