const { Web3 } = require("web3");
const fs = require("fs");
require("dotenv").config({ path: "dev.env" });
// Connect to the Ganache

console.log(process.env.RPC_NODES);
var rpc_nodes = process.env.RPC_NODES.split(",");
var web3_instances = [];
for (var i = 0; i < rpc_nodes.length; i++) {
  rpc_nodes[i] = rpc_nodes[i].trim();
  web3_instances.push(new Web3(rpc_nodes[i]));
}

let sender = process.env.SENDER_ADDRESS;

async function pollNewBlocks() {
  setTimeout(pollNewBlocks, 2000); // Check every 15 seconds
}

async function poll_voting_result(contract_instances) {
  let all_session_active = false;
  for (var i = 0; i < contract_instances.length; i++) {
    session_active = await contract_instances[i].methods
      .session_active()
      .call();
    all_session_active = all_session_active || session_active;
    console.log("session active contract ", i, session_active);
  }

  if (all_session_active == false) {
    console.log("========= voting result =========");
    const result_1 = await contract_instances[0].methods
      .last_round_votes(0)
      .call();
    console.log("candiate 1's votes", result_1);
    const result_2 = await contract_instances[0].methods
      .last_round_votes(1)
      .call();
    console.log("candiate 2's votes", result_2);
    return;
  } else {
    console.log("========= retry last message =========");
    for (var i = 1; i < contract_instances.length; i++) {
      console.log(
        "Blockchain ",
        i,
        " retry sending message to contract ",
        contract_instances[i]._address
      );
      await contract_instances[i].methods
        .retry_last_message()
        .send({ from: sender, gas: 5000000 });
    }

    setTimeout(poll_voting_result, 4000, contract_instances); // Check and retry every 4 seconds
  }
}

const deploy_multiple_chain = async function (json_contract, web3_instances) {
  const json_output = JSON.parse(fs.readFileSync(json_contract, "utf8"));
  // console.log("json_output " , json_output);
  contract_key = "contracts/Voting.sol:Voting";
  const contract_abi = json_output.contracts[contract_key].abi;
  var bytecode = json_output.contracts[contract_key].bin;

  var contract_instances = [];
  for (var i = 0; i < web3_instances.length; i++) {
    web3_instance = web3_instances[i];
    const votingInterface = new web3_instance.eth.Contract(contract_abi);
    const tx_receipt = await votingInterface.deploy({ data: bytecode }).send({
      from: sender,
      gas: 5000000,
      gasPrice: "30000000000000",
    });
    const contract_instance = new web3_instance.eth.Contract(
      contract_abi,
      tx_receipt._address
    );
    contract_instances.push(contract_instance);
    console.log(
      "Blockchain ",
      i,
      " Contract deployed at address",
      tx_receipt._address
    );
  }

  const contract_addresses = contract_instances.map((obj) => obj._address);
  for (var i = 0; i < web3_instances.length; i++) {
    await contract_instances[i].methods
      .crosschain_init(contract_addresses, i)
      .send({ from: sender, gas: 5000000 });
    console.log("init contract on chain ", i);
  }

  for (var i = 0; i < web3_instances.length; i++) {
    console.log(
      "session active contract",
      i,
      await contract_instances[i].methods.session_active().call()
    );
    console.log(
      "Blockchain ",
      i,
      " contract rank ",
      await contract_instances[i].methods.my_rank().call()
    );
  }

  console.log("=================== Enter sessions ===================");
  for (var i = 0; i < web3_instances.length; i++) {
    await contract_instances[i].methods
      .enter_session()
      .send({ from: sender, gas: 5000000 });
  }

  poll_voting_result(contract_instances);
};

deploy_multiple_chain("contracts/voting.json", web3_instances);
