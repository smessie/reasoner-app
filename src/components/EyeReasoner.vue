<template>
  <a href="https://github.com/smessie/reasoner-app"
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
            />
            <small class="text-danger" v-if="authError">{{ authError }}<br></small>
            <MDBBtn color="primary" @click="login" style="margin-top: 1rem">Login</MDBBtn>
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
              v-model="executeInBrowser"
              label="Execute in browser instead of on server"
              labelColor="primary"
            ></MDBSwitch>
          </div>
          <div style="margin-bottom: 1rem">
            <MDBSwitch
              v-model="isUrl"
              label="Via URL"
              labelColor="primary"
            ></MDBSwitch>
          </div>
          <div style="margin-bottom: 1rem">
            <MDBSwitch
                v-model="rdfSurfaces"
                label="Use RDF Surfaces"
                labelColor="primary"
                :disabled="outputPass !== 'undefined'"
            ></MDBSwitch>
          </div>
          <div class="input-group input-group-sm">
            <span class="input-group-text" id="outputPass">Implicit query</span>
            <select class="form-select" aria-label="Output" v-model="outputPass" aria-describedby="outputPass" style="padding-bottom: 0;" :disabled="rdfSurfaces">
              <option value="undefined" selected>None</option>
              <option value="derivations">Derivations only</option>
              <option value="deductive_closure">Deductive closure</option>
              <option value="deductive_closure_plus_rules">Deductive closure plus rules</option>
              <option value="grounded_deductive_closure_plus_rules">Grounded deductive closure plus rules</option>
            </select>
          </div>
          <div style="margin-bottom: 2rem">
            <small>Set this to none to be able to provide your own query or to use RDF surfaces.</small>
          </div>
          <MDBInput
            label="Dataset URL"
            type="url"
            v-model="n3docUrl"
            v-if="isUrl"
          />
          <small class="text-danger" v-if="isUrl && n3docUrlError">{{ n3docUrlError }}<br></small>
          <MDBInput
            label="Query Document URL"
            type="url"
            v-model="n3queryUrl"
            style="margin-top: 1rem"
            v-if="isUrl && !rdfSurfaces && outputPass === 'undefined'"
          />
          <small class="text-danger" v-if="isUrl && n3queryUrlError">{{ n3queryUrlError }}<br></small>

          <MDBTextarea
            label="N3 Document"
            v-model="n3doc"
            style="margin-bottom: 1rem"
            v-if="!isUrl"
          />
          <MDBTextarea label="N3 Query" v-model="n3query" v-if="!isUrl && !rdfSurfaces && outputPass === 'undefined'" />
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
import { n3reasoner as n3reasoner_js } from "eyereasoner";
import { n3reasoner as n3reasoner_server } from "eye-mock";

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
      n3query: "{ ?S ?P ?O . } => { ?S ?P ?O . } .",
      n3docUrl: "",
      n3queryUrl: `${window.location.origin}/outputAllTriplesDefaultQuery.n3`,
      output: "",
      isUrl: true,
      loggedIn: undefined,
      oidcIssuer: "",
      outputPass: "derivations",
      executeInBrowser: true,
      rdfSurfaces: false,
      authError: "",
      n3docUrlError: "",
      n3queryUrlError: "",
    };
  },
  created() {
    // Restore solid session
    handleIncomingRedirect({
      restorePreviousSession: true,
    }).then((info) => {
      this.loggedIn = info.webId;
    });

    // Restore input data
    this.$watch(
        () => this.$route.query,
        () => {
          if (this.$route.query.n3doc) {
            this.n3doc = this.$route.query.n3doc;
          }
          if (this.$route.query.n3query) {
            this.n3query = this.$route.query.n3query;
          }
          if (this.$route.query.n3docUrl) {
            this.n3docUrl = this.$route.query.n3docUrl;
          }
          if (this.$route.query.n3queryUrl) {
            this.n3queryUrl = this.$route.query.n3queryUrl;
          }
          if (this.$route.query.outputPass) {
            this.outputPass = this.$route.query.outputPass;
          }
          if (this.$route.query.isUrl !== undefined) {
            this.isUrl = this.$route.query.isUrl === "true";
          }
          if (this.$route.query.executeInBrowser !== undefined) {
            this.executeInBrowser = this.$route.query.executeInBrowser === "true";
          }
          if (this.$route.query.rdfSurfaces !== undefined) {
            this.rdfSurfaces = this.$route.query.rdfSurfaces === "true";
          }
        },
        { immediate: true }
    )
  },
  methods: {
    async execute(event) {
      event.preventDefault();
      this.output = "";
      this.n3docUrlError = "";
      this.n3queryUrlError = "";

      let n3doc = this.n3doc;
      let n3query = this.n3query;

      if (this.isUrl) {
        // Check if valid URLs
        try {
          new URL(this.n3docUrl);
        } catch (e) {
          this.n3docUrlError = "Enter a valid URL";
        }
        try {
          new URL(this.n3queryUrl);
        } catch (e) {
          this.n3queryUrlError = "Enter a valid URL";
        }

        n3doc = await fetch(this.n3docUrl, {
          cors: "cors",
        }).then((response) => {
          if (response.status !== 200) {
            this.n3docUrlError = `Error ${response.status}: ${response.statusText}`;
          }
          return response.text();
        });
        if (!this.rdfSurfaces) {
          n3query = await fetch(this.n3queryUrl, {
            cors: "cors",
          }).then((response) => {
            if (response.status !== 200) {
              this.n3queryUrlError = `Error ${response.status}: ${response.statusText}`;
            }
            return response.text();
          });
        }
      }
      if (this.n3docUrlError || this.n3queryUrlError) {
        return;
      }

      if (this.outputPass !== 'undefined') {
        n3query = undefined;
      }

      const n3reasoner = this.executeInBrowser ? n3reasoner_js : n3reasoner_server;
      let options = { blogic: this.rdfSurfaces, output: this.outputPass === 'undefined' ? undefined : this.outputPass, outputType: "string" };
      this.output = await n3reasoner(n3doc, n3query, options);
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
          clientName: "reasoner-app",
        }).catch((e) => {
          this.authError = e.message;
        });
      }
    },
    async logout() {
      await logout();
      this.loggedIn = undefined;
    },
    updateQueryParams() {
      this.$router.push({
        query: {
          isUrl: this.isUrl,
          executeInBrowser: this.executeInBrowser,
          rdfSurfaces: this.rdfSurfaces,
          outputPass: this.outputPass,
          n3doc: this.n3doc,
          n3query: this.n3query,
          n3docUrl: this.n3docUrl,
          n3queryUrl: this.n3queryUrl,
        },
      });
    },
  },
  watch: {
    n3doc: function () {
      this.updateQueryParams();
    },
    n3query: function () {
      this.updateQueryParams();
    },
    n3docUrl: function () {
      this.updateQueryParams();
    },
    n3queryUrl: function () {
      this.updateQueryParams();
    },
    isUrl: function () {
      this.updateQueryParams();
    },
    outputPass: function () {
      this.updateQueryParams();
    },
    executeInBrowser: function () {
      this.updateQueryParams();
    },
    rdfSurfaces: function () {
      this.updateQueryParams();
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
