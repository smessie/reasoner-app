<template>
  <a href="https://github.com/smessie/SWIPL-WASM-Example"
    ><img
      loading="lazy"
      width="149"
      height="149"
      src="/forkme_right_gray.png"
      class="attachment-full size-full fork"
      alt="Fork me on GitHub"
      data-recalc-dims="1"
  /></a>
  <MDBContainer>
    <h1>Eye Reasoner</h1>
    <MDBCard>
      <MDBCardBody class="w-100">
        <MDBCardTitle>Authentication</MDBCardTitle>
        <MDBCardText>
          <div v-if="loggedIn">
            <p class="text-success">
              You are logged in as <em>{{ loggedIn }}</em
              >.
            </p>
            <MDBBtn color="primary" @click="logout">Logout</MDBBtn>
          </div>
          <div v-else>
            <MDBInput
              v-model="oidcIssuer"
              label="OIDC Issuer"
              type="text"
              required
              style="margin-bottom: 1rem"
            />
            <MDBBtn color="primary" @click="login">Login</MDBBtn>
          </div>
        </MDBCardText>
      </MDBCardBody>
    </MDBCard>
    <MDBCard>
      <MDBCardBody class="w-100">
        <MDBCardTitle>Input: N3 Document</MDBCardTitle>
        <MDBCardText>
          <div style="margin-bottom: 1rem">
            <MDBSwitch
              v-model="isUrl"
              label="Via URL"
              labelColor="primary"
            ></MDBSwitch>
          </div>
          <div style="margin-bottom: 1rem">
            <MDBSwitch
              v-model="onlyDerivations"
              label="Only output derivations"
              labelColor="primary"
            ></MDBSwitch>
          </div>
          <MDBInput
            label="Dataset URL"
            type="url"
            v-model="n3docUrl"
            style="margin-bottom: 1rem"
            v-if="isUrl"
          />
          <MDBInput
            label="Query Document URL"
            type="url"
            v-model="n3queryUrl"
            v-if="isUrl"
          />

          <MDBTextarea
            label="N3 Document"
            v-model="n3doc"
            style="margin-bottom: 1rem"
            v-if="!isUrl"
          />
          <MDBTextarea label="N3 Query" v-model="n3query" v-if="!isUrl" />
        </MDBCardText>

        <MDBBtn color="primary" @click="execute" id="execute-btn"
          >Execute
        </MDBBtn>
      </MDBCardBody>
    </MDBCard>
    <MDBCard>
      <MDBCardBody class="w-100">
        <MDBCardTitle>Output</MDBCardTitle>
        <MDBCardText>
          <pre>{{ output }}</pre>
        </MDBCardText>
      </MDBCardBody>
    </MDBCard>
  </MDBContainer>
</template>

<script>
import {
  MDBBtn,
  MDBCard,
  MDBCardBody,
  MDBCardText,
  MDBCardTitle,
  MDBContainer,
  MDBInput,
  MDBSwitch,
  MDBTextarea,
} from "mdb-vue-ui-kit";
import {
  getDefaultSession,
  handleIncomingRedirect,
  login,
  fetch,
  logout,
} from "@inrupt/solid-client-authn-browser";

export default {
  name: "EyeReasoner",
  components: {
    MDBContainer,
    MDBCard,
    MDBCardBody,
    MDBCardTitle,
    MDBCardText,
    MDBInput,
    MDBBtn,
    MDBSwitch,
    MDBTextarea,
  },
  data() {
    return {
      buffers: {
        stdout: [],
        stderr: [],
      },
      Module: undefined,
      n3doc: "",
      n3query: "",
      n3docUrl: "",
      n3queryUrl: "",
      output: "",
      isUrl: true,
      loggedIn: undefined,
      oidcIssuer: "",
      onlyDerivations: true,
    };
  },
  created() {
    handleIncomingRedirect({
      restorePreviousSession: true,
    }).then((info) => {
      this.loggedIn = info.webId;
    });
  },
  methods: {
    async execute(event) {
      event.preventDefault();
      this.output = "";

      // Document and query to body of request
      const inputBody = [];
      inputBody.push(
        `${encodeURIComponent("task")}=${encodeURIComponent(
          this.onlyDerivations ? "derivations" : "deductive_closure"
        )}`
      );
      inputBody.push(
        `${encodeURIComponent("system")}=${encodeURIComponent("eye")}`
      );

      if (this.isUrl) {
        const n3doc = await fetch(this.n3docUrl, {
          cors: "cors",
        }).then((response) => response.text());
        const n3query = await fetch(this.n3queryUrl, {
          cors: "cors",
        }).then((response) => response.text());

        inputBody.push(
          `${encodeURIComponent("formula")}=${encodeURIComponent(
            `${n3doc}\n${n3query}`
          )}`
        );
      } else {
        inputBody.push(
          `${encodeURIComponent("formula")}=${encodeURIComponent(
            `${this.n3doc}\n${this.n3query}`
          )}`
        );
      }

      let result = await fetch("http://ppr.cs.dal.ca:3002/n3", {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: inputBody.join("&"),
        method: "POST",
        credentials: "omit",
      });
      const body = await result.body;
      // Read all the data from the ReadableStream
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let data = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        data += decoder.decode(value);
      }
      // String to JSON
      const json = JSON.parse(data);
      if (json.success) {
        this.output = json.success;
      } else {
        this.output = json.error;
      }
      console.log(json.success);
    },
    async login() {
      await handleIncomingRedirect();

      // 2. Start the Login Process if not already logged in.
      if (!getDefaultSession().info.isLoggedIn) {
        await login({
          // Specify the URL of the user's Solid Identity Provider;
          // e.g., "https://login.inrupt.com".
          oidcIssuer: this.oidcIssuer,
          // Specify the URL the Solid Identity Provider should redirect the user once logged in,
          // e.g., the current page for a single-page app.
          redirectUrl: window.location.href,
          // Provide a name for the application when sending to the Solid Identity Provider
          clientName: "SWIPL-WASM-Example",
        });
      }
    },
    async logout() {
      await logout();
      this.loggedIn = undefined;
    },
  },
};
</script>

<style scoped>
h1 {
  margin-top: 2rem;
}

.card {
  margin-bottom: 2rem;
}

.fork {
  float: right;
  margin-top: -2em;
}
</style>
