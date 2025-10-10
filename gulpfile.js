const { src, dest, series } = require('gulp');

function buildIcons() {
	return src('nodes/**/*.svg')
		.pipe(dest('dist/'));
}

function buildLib() {
	return src('lib/**/*')
		.pipe(dest('dist/'));
}

exports['build:icons'] = buildIcons;
exports['build:lib'] = buildLib;
exports['build:all'] = series(buildIcons, buildLib);
