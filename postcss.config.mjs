import path from "path";

const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // Absolute path so Turbopack resolves the plugin from the project root
    // even when the compiled postcss config runs from .next/build/
    [path.join(process.cwd(), "postcss-flex-gap-polyfill.cjs")]: {},
  },
};

export default config;
