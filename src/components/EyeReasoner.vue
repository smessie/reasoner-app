<template>
  <MDBContainer>
    <h1>Eye Reasoner</h1>
    <MDBCard>
      <MDBCardBody class="w-100">
        <MDBCardTitle>Input: N3 Document</MDBCardTitle>
        <MDBCardText>
          <MDBInput
            label="Dataset URL"
            type="url"
            v-model="n3doc"
            style="margin-bottom: 1rem"
          />
          <MDBInput label="Query Document URL" type="url" v-model="n3query" />
        </MDBCardText>
        <MDBInput
          inputGroup
          :formOutline="false"
          wrapperClass="mb-3"
          v-model="command"
          placeholder="Command"
          aria-label="Command"
          aria-describedby="load-btn"
        >
          <MDBBtn color="primary" @click="load" id="load-btn">Load</MDBBtn>
        </MDBInput>
      </MDBCardBody>
    </MDBCard>
    <MDBCard>
      <MDBCardBody class="w-100">
        <MDBCardTitle>Output</MDBCardTitle>
        <MDBCardText>
          {{ n3doc }}
          <div class="output"></div>
        </MDBCardText>
      </MDBCardBody>
    </MDBCard>
  </MDBContainer>
</template>

<script>
import {
  MDBCard,
  MDBCardBody,
  MDBCardText,
  MDBCardTitle,
  MDBContainer,
  MDBInput,
  MDBBtn,
} from "mdb-vue-ui-kit";
import SWIPL from "@/assets/swipl-web";

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
      command: "main(['--wcache', 'http://josd.github.io/eye/reasoning/socrates', '.', './dataset.n3', '--query', './query.n3']).",
      yield: null,
    };
  },
  async created() {
    console.log("created");
    await this.run();
  },
  methods: {
    async run() {
      this.Module = {
        // Provide options for customization
        noInitialRun: true,
        arguments: [],
        locateFile: (file) => {
          return `/libs/${file}`;
        },
        preRun: [() => this.bindStdStreams(this.Module)],
      };

      SWIPL(this.Module).then((module) => {
        console.log("SWIPL loaded");
        console.log(module);
        console.log(this.Module);
      });
    },
    async load(event) {
      event.preventDefault();

      await this.fetchWrite("https://josd.github.io/eye/eye.pl", "eye.pl");
      await this.fetchWrite(this.n3doc, "dataset.n3");
      await this.fetchWrite(this.n3query, "query.n3");

      this.pl("set_prolog_flag(tty_control, true)");
      this.pl("set_prolog_flag(debug_on_error, false)");

      this.toplevel();
      this.query("consult('./eye.pl')");

      if (this.yield && this.yield.yield == "goal") {
        let query = this.command;
        this.command = "";
        // e.target.style.display = "none";

        if (!/\.\s*/.test(query)) {
          query += ".\n";
        }
        this.print_output(`?- ${query}\n`, "query");

        this.next(this.yield.resume(query));
      } else {
        alert("Not waiting for a query");
      }
    },
    bindStdStreams(module) {
      module.FS.init(
        undefined,
        (c) => this.write("stdout", c),
        (c) => this.write("stderr", c)
      );
    },
    write(to, c) {
      if (c) {
        this.buffers[to].push(c);
      }

      if (c == 10 || c == null) {
        this.flush(to);
      }
    },
    flush(to) {
      const line = String.fromCharCode.apply(null, this.buffers[to]);
      this.print_output(line, to);
      this.buffers[to] = [];
    },
    print_output(line, cls) {
      const output = document.getElementById("output");
      const node = document.createElement("span");
      node.className = cls;
      node.textContent = line;
      output.appendChild(node);
    },
    pl(s) {
      this.Module.prolog.call(s);
    },
    async fetchWrite(link, file) {
      const response = await fetch(link, { mode: "no-cors" }); // Added mode: 'no-cors' to avoid CORS errors
      await this.Module.FS.writeFile(file, await response.text());
    },
    query(query) {
      this.print_output(`?- ${query}.\n`, 'query');

      if (this.yield && this.yield.yield == "goal") {
        this.next(this.yield.resume(query));
      } else {
        alert("REPL is not waiting for a goal");
      }
    },
  },
};
</script>

<style scoped>
.stderr,
.stdout {
  white-space: pre-wrap;
  font-family: monospace;
  overflow-wrap: anywhere;
}
h1 {
  margin-top: 2rem;
}
.card {
  margin-bottom: 2rem;
}
</style>
