<template>
  <div class="container">

    <div class="output"></div>


    <script src="/libs/swipl-web.js"></script>
  </div>
</template>

<script>
export default {
  name: "EyeReasoner",
  data() {
    return {
      buffers: {
        stdout: [],
        stderr: [],
      },
    };
  },
  methods: {
    async run() {
      let Prolog;
      const Module = {
        // Provide options for customization
        noInitialRun: true,
        arguments: [],
        locateFile: (file) => {
          return `libs/${file}`;
        },
        preRun: [() => this.bindStdStreams(Module)],
      };

      SWIPL(Module).then((module) => {
        Prolog = Module.prolog;

        // Start using Prolog
      })
    },
    bindStdStreams(module) {
      module.FS.init(undefined, (c) => this.write("stdout", c), (c) => this.write("stderr", c));
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
      const node = document.createElement("span");
      node.className = cls;
      node.textContent = line;
      this.output.insertBefore(node, document.getElementById("more"));
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
</style>
