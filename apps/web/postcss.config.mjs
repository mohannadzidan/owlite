import path from "path";

const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    [path.join(process.cwd(), "postcss-flex-gap-polyfill.cjs")]: {},
  },
};

export default config;
