const { src, dest, series } = require('gulp');

function buildIcons() {
	return src('nodes/**/*.svg')
		.pipe(dest('dist/nodes/'));
}

function buildLib() {
	// Must land beside dist/lib/pagbank/PagBankEncryption.js (tsc output), not dist/pagbank/.
	return src('lib/**/*.js', { base: 'lib' }).pipe(dest('dist/lib'));
}

exports['build:icons'] = buildIcons;
exports['build:lib'] = buildLib;
exports['build:all'] = series(buildIcons, buildLib);
