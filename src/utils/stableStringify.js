'use strict';

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }

  const keys = Object.keys(value).sort();
  const entries = keys.map((key) => {
    return JSON.stringify(key) + ':' + stableStringify(value[key]);
  });

  return '{' + entries.join(',') + '}';
}

module.exports = {
  stableStringify,
};
