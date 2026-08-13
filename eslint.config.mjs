import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next";

// eslint-config-next v16 exports a ready-made flat config array.
export default defineConfig([
  globalIgnores([".next/**", "node_modules/**", "dist/**"]),
  ...next,
]);
