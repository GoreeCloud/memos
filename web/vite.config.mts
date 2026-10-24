import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const configDirectory = dirname(fileURLToPath(import.meta.url));

// Read the repository's lifecycle declaration at build time rather than
// embedding a stage literal in UI code. This is source metadata, not proof
// of the running deployment's qualification or promoted state.
const platformManifest = readFileSync(resolve(configDirectory, "../goreecloud.platform.yaml"), "utf8");
const lifecycleEntries = [...platformManifest.matchAll(/^lifecycle:\s*([a-z][a-z-]*)\s*$/gm)];
const qualificationEntries = [...platformManifest.matchAll(/^ {2}qualification_state:\s*([a-z][a-z-]*)\s*$/gm)];
if (lifecycleEntries.length !== 1 || qualificationEntries.length !== 1) {
  throw new Error("GoreeCloud lifecycle metadata is absent or ambiguous");
}
const lifecycleStage = lifecycleEntries[0][1];
const qualificationState = qualificationEntries[0][1];
if (!["forge", "seal", "anchor"].includes(lifecycleStage) || !["not-qualified", "qualified"].includes(qualificationState)) {
  throw new Error("Unrecognized GoreeCloud lifecycle or qualification metadata");
}

let devProxyServer = "http://localhost:8081";
if (process.env.DEV_PROXY_SERVER && process.env.DEV_PROXY_SERVER.length > 0) {
  console.log("Use devProxyServer from environment: ", process.env.DEV_PROXY_SERVER);
  devProxyServer = process.env.DEV_PROXY_SERVER;
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    "import.meta.env.VITE_GOREECLOUD_PLATFORM_LIFECYCLE": JSON.stringify(lifecycleStage),
    "import.meta.env.VITE_GOREECLOUD_PLATFORM_QUALIFICATION": JSON.stringify(qualificationState),
  },
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3001,
    proxy: {
      "^/api/v1/sse": {
        target: devProxyServer,
        xfwd: true,
        // SSE requires no response buffering and longer timeout.
        timeout: 0,
      },
      "^/api": {
        target: devProxyServer,
        xfwd: true,
      },
      "^/memos.api.v1": {
        target: devProxyServer,
        xfwd: true,
      },
      "^/file": {
        target: devProxyServer,
        xfwd: true,
      },
    },
  },
  resolve: {
    alias: {
      "@/": `${resolve(configDirectory, "src")}/`,
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "utils-vendor",
              test: /node_modules[\\/](dayjs|lodash-es)([\\/]|$)/,
            },
            {
              name: "leaflet-vendor",
              test: /node_modules[\\/]leaflet([\\/]|$)/,
            },
          ],
        },
      },
    },
  },
});
