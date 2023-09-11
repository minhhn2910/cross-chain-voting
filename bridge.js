const { Web3 } = require("web3");
const fs = require("fs");
const express = require('express');
require('dotenv').config({ path: "dev.env" })
console.log(process.env.RPC_NODE_1);
console.log(process.env.RPC_NODE_2);
const web3Node1 = new Web3(process.env.RPC_NODE_1);
const web3Node2 = new Web3(process.env.RPC_NODE_2);

const sender = "0x1Be31A94361a391bBaFB2a4CCd704F57dc04d4bb"; // Your Ganache address
const privateKey = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"; // Your Ganache private key

// ABI for the SendMessage event
const sendMessageEventSignature = web3Node1.eth.abi.encodeEventSignature({
    name: 'SendMessage',
    type: 'event',
    inputs: [
        { indexed: false, name: 'session_id', type: 'uint256' },
        { indexed: false, name: 'receiver_address', type: 'address' },
        { indexed: false, name: 'receiver_rank', type: 'uint256' },
        { indexed: false, name: 'data', type: 'bytes' }
    ]
});


file_name = "contracts/voting.json";
const json_output = JSON.parse(fs.readFileSync(file_name, "utf8"));
// console.log("json_output " , json_output);
contract_key = 'contracts/Voting.sol:Voting';
const contractABI = json_output.contracts[contract_key].abi;

async function processBlock(blockNumber) {
    const block = await web3Node1.eth.getBlock(blockNumber, true);
    for (const tx of block.transactions) {
        if (tx.to && tx.input !== '0x') { // Check if it's a contract call
            const receipt = await web3Node1.eth.getTransactionReceipt(tx.hash);
            for (const log of receipt.logs) {
                if (log.topics[0] === sendMessageEventSignature) {
                    const event = web3Node1.eth.abi.decodeLog([
                        { indexed: false, name: 'session_id', type: 'uint256' },
                        { indexed: false, name: 'receiver_address', type: 'address' },
                        { indexed: false, name: 'receiver_rank', type: 'uint256' },
                        { indexed: false, name: 'data', type: 'bytes' }
                    ], log.data, log.topics.slice(1));
                    console.log ("received event ", event.session_id, event.receiver_address, event.receiver_rank, event.data)
                    // submit a tx to rpm node at receiver rank
                    try {
                        const accounts = await web3Node1.eth.getAccounts();
                        receiver_web3_instance = web3Node1;

                        const receiver_contract = new receiver_web3_instance.eth.Contract(
                            contractABI,
                            event.receiver_address
                          );
                        const tx = await receiver_contract.methods.recv_message(event.session_id, event.data).send({
                            from: accounts[0],
                            gas: 2000000
                        });
                        console.log('Transaction sent to destination blockchain:', tx.transactionHash);
                    } catch (err) {
                        console.error('Error sending transaction to destination blockchain:', err);
                    }
                }
            }
        }
    }
}

let lastProcessedBlock = 0;

async function pollNewBlocks() {
    const latestBlock = await web3Node1.eth.getBlockNumber();
    while (lastProcessedBlock < latestBlock) {
        lastProcessedBlock++;
        await processBlock(lastProcessedBlock);
    }
    setTimeout(pollNewBlocks, 2000); // Check every 15 seconds
}

pollNewBlocks();
