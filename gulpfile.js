const { src, dest, series } = require('gulp');

function buildNodeIcons() {
	return src('nodes/**/*.svg').pipe(dest('dist/nodes/'));
}

function buildCredentialIcons() {
	return src('credentials/**/*.svg').pipe(dest('dist/credentials/'));
}

function buildCodex() {
	return src('nodes/**/*.node.json').pipe(dest('dist/nodes/'));
}

function buildLib() {
	// Must land beside dist/lib/pagbank/PagBankEncryption.js (tsc output), not dist/pagbank/.
	return src('lib/**/*.js', { base: 'lib' }).pipe(dest('dist/lib'));
}

exports['build:icons'] = series(buildNodeIcons, buildCredentialIcons);
exports['build:lib'] = buildLib;
exports['build:all'] = series(buildNodeIcons, buildCredentialIcons, buildCodex, buildLib);
