const ProviderEngine = require("web3-provider-engine");
const RpcProvider = require("web3-provider-engine/subproviders/rpc.js");
const { TruffleArtifactAdapter } = require("@0x/sol-trace");
const { GanacheSubprovider } = require("@0x/subproviders");
const { ProfilerSubprovider } = require("@0x/sol-profiler");
const { CoverageSubprovider } = require("@0x/sol-coverage");
const { RevertTraceSubprovider } = require("@0x/sol-trace");

const mode = process.env.MODE;

const projectRoot = "";
const solcVersion = "0.4.24";
const defaultFromAddress = "0xb4124cEB3451635DAcedd11767f004d8a28c6eE7";
const isVerbose = true;
const artifactAdapter = new TruffleArtifactAdapter(projectRoot, solcVersion);
const provider = new ProviderEngine();

if (mode === "profile") {
  global.profilerSubprovider = new ProfilerSubprovider(
    artifactAdapter,
    defaultFromAddress,
    isVerbose
  );
  global.profilerSubprovider.stop();
  provider.addProvider(global.profilerSubprovider);
  provider.addProvider(new RpcProvider({ rpcUrl: "http://localhost:8545" }));
} else {
  if (mode === "coverage") {
    global.coverageSubprovider = new CoverageSubprovider(
      artifactAdapter,
      defaultFromAddress,
      isVerbose
    );
    provider.addProvider(global.coverageSubprovider);
  } else if (mode === "trace") {
    const revertTraceSubprovider = new RevertTraceSubprovider(
      artifactAdapter,
      defaultFromAddress,
      isVerbose
    );
    provider.addProvider(revertTraceSubprovider);
  }
  const ganahceSubprovider = new GanacheSubprovider();
  provider.addProvider(ganahceSubprovider);
}
provider.start(err => {
  if (err !== undefined) {
    console.log(err);
    process.exit(1);
  }
});
/**
 * HACK: Truffle providers should have `send` function, while `ProviderEngine` creates providers with `sendAsync`,
 * but it can be easily fixed by assigning `sendAsync` to `send`.
 */
provider.send = provider.sendAsync.bind(provider);

module.exports = {
  networks: {
    development: {
      provider,
      network_id: "*"
    }
  },
  compilers: {
    solc: {
      version: "0.4.24"
    }
  }
};
