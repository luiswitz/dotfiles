'use strict';

// Glint 1.5.2 calculates transformed template locations using the original
// source. That is incorrect once a multi-byte character appears before a later
// <template> tag. This preload applies typed-ember/glint#842 at runtime until a
// project upgrades to a release containing that fix.

const path = require('node:path');
const Module = require('node:module');

const originalLoad = Module._load;
const targetSuffix = path.join(
  '@glint',
  'environment-ember-template-imports',
  '-private',
  'environment',
  'preprocess.js',
);

Module._load = function glintPreprocessFix(request, parent, isMain) {
  const filename = Module._resolveFilename(request, parent, isMain);
  const loaded = originalLoad.apply(this, arguments);

  if (
    typeof filename !== 'string' ||
    !filename.endsWith(targetSuffix) ||
    loaded.__glintMultibyteFixApplied
  ) {
    return loaded;
  }

  const packageRoot = path.resolve(path.dirname(filename), '..', '..');
  const packageJson = originalLoad(path.join(packageRoot, 'package.json'), parent, false);

  // Later releases contain the upstream fix and must remain untouched.
  if (packageJson.version !== '1.5.2') {
    return loaded;
  }

  const localRequire = Module.createRequire(filename);
  const { GLOBAL_TAG } = localRequire('./common');
  const { Preprocessor } = localRequire('content-tag');
  const parser = new Preprocessor();
  const templateStart = `[${GLOBAL_TAG}\``;
  const templateEnd = '`]';
  const buffers = new Map();

  function getBuffer(value) {
    let buffer = buffers.get(value);
    if (!buffer) {
      buffer = Buffer.from(value);
      buffers.set(value, buffer);
    }
    return buffer;
  }

  function byteToCharIndex(value, byteOffset) {
    return getBuffer(value).subarray(0, byteOffset).toString().length;
  }

  loaded.preprocess = function preprocess(source, sourcePath) {
    const templates = parser.parse(source, { filename: sourcePath });
    const templateLocations = [];
    const sourceBuffer = getBuffer(source);
    let contents = '';
    let sourceOffsetBytes = 0;
    let deltaBytes = 0;

    for (const template of templates) {
      const startTagLengthBytes = template.startRange.end - template.startRange.start;
      const endTagLengthBytes = template.endRange.end - template.endRange.start;
      const startTagOffsetBytes = template.startRange.start;
      const endTagOffsetBytes = template.endRange.start;
      const transformedStartBytes = startTagOffsetBytes - deltaBytes;

      contents = contents.concat(
        sourceBuffer.subarray(sourceOffsetBytes, startTagOffsetBytes).toString(),
        templateStart,
      );
      deltaBytes += startTagLengthBytes - templateStart.length;

      const transformedEndBytes = endTagOffsetBytes - deltaBytes + templateEnd.length;
      const templateContent = sourceBuffer
        .subarray(startTagOffsetBytes + startTagLengthBytes, endTagOffsetBytes)
        .toString();
      const escapedTemplateContent = templateContent
        .replaceAll('$', '\\$')
        .replaceAll('`', '\\`');
      deltaBytes += templateContent.length - escapedTemplateContent.length;

      contents = contents.concat(escapedTemplateContent, templateEnd);
      deltaBytes += endTagLengthBytes - templateEnd.length;
      sourceOffsetBytes = endTagOffsetBytes + endTagLengthBytes;

      templateLocations.push({
        startTagOffset: byteToCharIndex(source, startTagOffsetBytes),
        endTagOffset: byteToCharIndex(source, endTagOffsetBytes),
        startTagLength: byteToCharIndex(source, startTagLengthBytes),
        endTagLength: byteToCharIndex(source, endTagLengthBytes),
        transformedStart: byteToCharIndex(contents, transformedStartBytes),
        transformedEnd: byteToCharIndex(contents, transformedEndBytes),
      });
    }

    contents = contents.concat(sourceBuffer.subarray(sourceOffsetBytes).toString());
    return { contents, data: { templateLocations } };
  };

  Object.defineProperty(loaded, '__glintMultibyteFixApplied', { value: true });
  return loaded;
};
