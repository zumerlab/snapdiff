// Node-only entry — safe to import from vitest.config.js without dragging
// browser-only modules (vitest, @vitest/browser/context) into the Node loader.
//
// Browser-side specs import `defineDemoSuite` from '@zumer/snapdiff/vitest/suite'.

export { snapDiffCommands } from './commands.js'
