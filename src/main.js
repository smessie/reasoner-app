import { createApp } from "vue";
import App from "./App.vue";
import * as VueRouter from "vue-router";

import "./assets/main.css";
import "mdb-vue-ui-kit/css/mdb.min.css";

const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(),
    routes: [
        { path: "/", component: App, props: true },
    ],
});

const app = createApp(App);
app.use(router);
app.mount("#app");
