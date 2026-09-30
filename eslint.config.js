import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

const bunGlobals = { ...globals.node, Bun: "readonly" };

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/coverage/**", "**/.vite/**", "**/drizzle/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: { globals: globals.node },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["apps/api/**/*.ts", "packages/env/**/*.ts", "tests/**/*.ts"],
    languageOptions: { globals: bunGlobals },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    files: ["apps/web/src/**/*.tsx"],
    plugins: { "react-refresh": reactRefresh },
    rules: {
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["apps/api/drizzle.config.ts", "apps/web/vite.config.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    },
  },
  eslintConfigPrettier,
);
