import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const typedTypeScriptConfigs = tseslint.configs.recommendedTypeChecked.map((config) => ({
  ...config,
  files: ["**/*.ts"],
}));

export default defineConfig(
  { ignores: ["dist/**", "coverage/**", "src/generated/**"] },
  eslint.configs.recommended,
  ...typedTypeScriptConfigs,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);
