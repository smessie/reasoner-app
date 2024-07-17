import {fileURLToPath, URL} from "node:url";

import {defineConfig, loadEnv} from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd());
    return {
        base: process.env.BASE_URL || env.VITE_BASE_URL || "/",
        css: {
            devSourcemap: true,
        },
        plugins: [vue()],
        resolve: {
            alias: {
                "@": fileURLToPath(new URL("./src", import.meta.url)),
            },
        },
        // https://github.com/jonathanpmartins/v-money3/issues/70#issuecomment-1284503693
        optimizeDeps: {
            esbuildOptions: {
                target: ["es2020", "safari14"],
            },
        },
        build: {
            target: ["es2020", "safari14"],
        },
    }
});
