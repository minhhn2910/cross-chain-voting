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
  console.log("json_output " , json_output);
  contract_key = 'contracts/SimpleStorage.sol:SimpleStorage';
  const contract_abi = json_output.contracts[contract_key].abi;
  var bytecode = json_output.contracts[contract_key].bin;
  console.log("bytecode " , bytecode);
  console.log("abi " , contract_abi);

  const simpleStorage = new web3_instance.eth.Contract(contract_abi);

  var tx_receipt = await simpleStorage.deploy({data: bytecode}).send({
                                                from: address,
                                                gas: 5000000,
                                                gasPrice: '30000000000000'
                                              });

  console.log("Contract deployed at address", tx_receipt._address);

  const contract = new web3_instance.eth.Contract(
    contract_abi,
    tx_receipt._address
  );
  // const setTransaction = await web3_instance.eth.accounts.signTransaction(
  //   {
  //     to: tx_receipt._address,
  //     data: contract.methods.set(10).encodeABI(),
  //     gas: "1000000",
  //   },
  //   privateKey
  // );

  // const setReceipt = await web3_instance.eth.sendSignedTransaction(
  //   setTransaction.rawTransaction
  // );
  const setReceipt = await contract.methods.set(1234).send({from: address});
  console.log("Transaction hash:", setReceipt.transactionHash);

  const result = await contract.methods.get().call();
  console.log("Stored data:", result);
};

deploy(
  (file_name = "contracts/simple_storage.json"),
  (contract_name = "SimpleStorage"),
  (web3_instance = web3_chain1)
);

deploy(
  (file_name = "contracts/simple_storage.json"),
  (contract_name = "SimpleStorage"),
  (web3_instance = web3_chain2)
);

