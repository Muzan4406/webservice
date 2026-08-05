// Plesk Node.js startup file.
//
// Plesk commonly expects a startup file named app.js in the application root.
// The production server itself is the self-contained CommonJS bundle.
require("./artifacts/api-server/dist/index.cjs");