import adapter from "@sveltejs/adapter-static";

/** @type {import("@sveltejs/kit").Config} */
const config = {
  kit: {
    adapter: adapter({
      pages: "build",
      assets: "build",
      fallback: undefined,
      precompress: true,
      strict: true,
    }),
    prerender: {
      crawl: true,
      entries: ["*"],
    },
  },
};

export default config;
