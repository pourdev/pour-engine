// Package-local stand-in for the pour monorepo's project config. The engine
// source under engine/ is a byte-identical copy of the monorepo's src/engine/
// — it imports '../config/project.config.js', and this file satisfies that
// import so the copy needs no edits. Keep engine.version in step with
// package.json's version.
export default {
  engine: {
    name: 'pour engine',
    version: '1.17.0',
  },
};
