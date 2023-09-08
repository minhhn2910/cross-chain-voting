const { Web3 } = require("web3");
const fs = require("fs");

// Connect to the Ganache

var web3_chain1 = new Web3("http://localhost:8545");
var web3_chain2 = new Web3("http://localhost:8646");

// console.log(web3);

const address = "0x1Be31A94361a391bBaFB2a4CCd704F57dc04d4bb"; // Your Ganache address
const privateKey = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"; // Your Ganache private key

const deploy = async function (file_name, contract_name, web3_instance) {
  const json_output = JSON.parse(fs.readFileSync(file_name, "utf8"));
  // console.log("json_output " , json_output);
  contract_key = 'contracts/Voting.sol:Voting';
  const contract_abi = json_output.contracts[contract_key].abi;
  var bytecode = json_output.contracts[contract_key].bin;
  // console.log("bytecode " , bytecode);
  // console.log("abi " , contract_abi);

  const votingInterface = new web3_instance.eth.Contract(contract_abi);

  var tx_receipt = await votingInterface.deploy({data: bytecode}).send({
                                                from: address,
                                                gas: 5000000,
                                                gasPrice: '30000000000000'
                                              });

  console.log("Contract deployed at address", tx_receipt._address);

  const contract_1 = new web3_instance.eth.Contract(
    contract_abi,
    tx_receipt._address
  );

  tx_receipt = await votingInterface.deploy({data: bytecode}).send({
    from: address,
    gas: 5000000,
    gasPrice: '30000000000000'
  });

  console.log("Contract deployed at address", tx_receipt._address);
  const contract_2 = new web3_instance.eth.Contract(
    contract_abi,
    tx_receipt._address
  );


  console.log("init contract_1");
  console.log([contract_1._address, contract_2._address])
  await contract_1.methods.crosschain_init([contract_1._address, contract_2._address]).send({from: address, gas: 5000000});
  console.log("init contract_2");
  await contract_2.methods.crosschain_init([contract_1._address, contract_2._address]).send({from: address, gas: 5000000});
  console.log("session active contract_1", await contract_1.methods.session_active().call());
  console.log("session active contract_2", await contract_2.methods.session_active().call());
  console.log("enter sessions");

  await contract_2.methods.enter_session().send({from: address, gas: 5000000});
  console.log("session active contract_1", await contract_1.methods.session_active().call());
  console.log("session active contract_2", await contract_2.methods.session_active().call());

  console.log("voting result");
  const result_1 = await contract_1.methods.votes(0).call();
  console.log("result_1", result_1);
  const result_2 = await contract_1.methods.votes(1).call();
  console.log("result_2", result_2);
  /*
  const setReceipt = await contract.methods.set(1234).send({from: address});
  console.log("Transaction hash:", setReceipt.transactionHash);

  const result = await contract.methods.get().call();
  console.log("Stored data:", result);
  */
};

deploy(
  (file_name = "contracts/voting.json"),
  (contract_name = "SimpleStorage"),
  (web3_instance = web3_chain1)
);

// deploy(
//   (file_name = "contracts/voting.json"),
//   (contract_name = "SimpleStorage"),
//   (web3_instance = web3_chain2)
// );

