import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      ".wrangler/**",
      "node_modules/**",
      "playwright-report/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      import: importPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "object",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "import/first": "warn",
      "import/newline-after-import": "warn",
    },
    settings: {
      "import/resolver": {
        typescript: {},
      },
    },
  },
];

export default eslintConfig;
