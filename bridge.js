const { Web3 } = require("web3");
const fs = require("fs");
const express = require('express');
require('dotenv').config({ path: "dev.env" })
console.log(process.env.RPC_NODES);
var rpc_nodes = process.env.RPC_NODES.split(",");
var web3_instances = [];
for (var i = 0; i < rpc_nodes.length; i++) {
    rpc_nodes[i] = rpc_nodes[i].trim();
    web3_instances.push(new Web3(rpc_nodes[i]));
}



// ABI for the SendMessage event
const sendMessageEventSignature = web3_instances[0].eth.abi.encodeEventSignature({
    name: 'SendMessage',
    type: 'event',
    inputs: [
        { indexed: false, name: 'session_id', type: 'uint256' },
        { indexed: false, name: 'receiver_address', type: 'address' },
        { indexed: false, name: 'receiver_rank', type: 'uint256' },
        { indexed: false, name: 'data', type: 'bytes' }
    ]
});
const receiveMessageEventSignature = web3_instances[0].eth.abi.encodeEventSignature({
    name: 'SendMessage',
    type: 'event',
    inputs: [
        { indexed: false, name: 'session_id', type: 'uint256' },
        { indexed: false, name: 'receiver_address', type: 'address' },
        { indexed: false, name: 'receiver_rank', type: 'uint256' },
        { indexed: false, name: 'data', type: 'bytes' }
    ]
});
const voteCastEventSignature = web3_instances[0].eth.abi.encodeEventSignature({
    name: 'VoteCast',
    type: 'event',
    inputs: [
        { indexed: false, name: 'candidate', type: 'uint256' },
        { indexed: false, name: 'sender_rank', type: 'uint256' }
    ]
});
const VotingResultEventSignature = web3_instances[0].eth.abi.encodeEventSignature({
    name: 'VotingResult',
    type: 'event',
    inputs: [
        { indexed: false, name: 'winner', type: 'uint256' }
    ]
});

file_name = "contracts/voting.json";
const json_output = JSON.parse(fs.readFileSync(file_name, "utf8"));
// console.log("json_output " , json_output);
contract_key = 'contracts/Voting.sol:Voting';
const contractABI = json_output.contracts[contract_key].abi;

async function processBlock(blockNumber, web3_instance, chain_id) {
    const block = await web3_instance.eth.getBlock(blockNumber, true);

    for (const tx of block.transactions) {
        if (tx.to && tx.input !== '0x') { // Check if it's a contract call
            const receipt = await web3_instance.eth.getTransactionReceipt(tx.hash);
            for (const log of receipt.logs) {
                if (log.topics[0] === sendMessageEventSignature) {
                    const event = web3_instance.eth.abi.decodeLog([
                        { indexed: false, name: 'session_id', type: 'uint256' },
                        { indexed: false, name: 'receiver_address', type: 'address' },
                        { indexed: false, name: 'receiver_rank', type: 'uint256' },
                        { indexed: false, name: 'data', type: 'bytes' }
                    ], log.data, log.topics.slice(1));
                    console.log(
                        "Blockchain", chain_id,
                        "SendMsg event",
                        "session_id:", event.session_id,
                        "receiver_address:", event.receiver_address,
                        "receiver_rank:", event.receiver_rank,
                        "data:", event.data
                    );
                    // submit a tx to rpm node at receiver rank
                    try {
                        const receiver_web3_instance = web3_instances[event.receiver_rank];
                        const accounts = await receiver_web3_instance.eth.getAccounts();
                        const receiver_contract = new receiver_web3_instance.eth.Contract(
                            contractABI,
                            event.receiver_address
                          );
                        const tx = await receiver_contract.methods.recv_message(event.session_id, event.data).send({
                            from: accounts[0],
                            gas: 2000000
                        });
                        console.log('Transaction sent from ', chain_id,' to destination blockchain:', event.receiver_rank, tx.transactionHash);
                    } catch (err) {
                        console.error('Error sending transaction to destination blockchain:', err);
                    }
                }
                if (log.topics[0] === receiveMessageEventSignature){
                    const event = web3_instance.eth.abi.decodeLog([
                        { indexed: false, name: 'session_id', type: 'uint256' },
                        { indexed: false, name: 'receiver_address', type: 'address' },
                        { indexed: false, name: 'receiver_rank', type: 'uint256' },
                        { indexed: false, name: 'data', type: 'bytes' }
                    ], log.data, log.topics.slice(1));
                    console.log(
                        "Blockchain", chain_id,
                        "RecvMsg event",
                        "session_id:", event.session_id,
                        "receiver_address:", event.receiver_address,
                        "receiver_rank:", event.receiver_rank,
                        "data:", event.data
                    );
                }
                if (log.topics[0] === voteCastEventSignature){
                    const event = web3_instance.eth.abi.decodeLog([
                        { indexed: false, name: 'candidate', type: 'uint256' },
                        { indexed: false, name: 'sender_rank', type: 'uint256' }
                    ], log.data, log.topics.slice(1));
                    console.log(
                        "Blockchain", chain_id,
                        "VoteCast event",
                        "candidate:", event.candidate,
                        "sender_rank:", event.sender_rank
                    );
                }
                if (log.topics[0] === VotingResultEventSignature){
                    const event = web3_instance.eth.abi.decodeLog([
                        { indexed: false, name: 'winner', type: 'uint256' }
                    ], log.data, log.topics.slice(1));
                    console.log(
                        "Blockchain", chain_id,
                        "VotingResult event",
                        "winner:", event.winner
                    );
                }

            }
        }
    }
}

var lastProcessedBlocks = new Array(web3_instances.length).fill(0);

async function pollNewBlocks() {
    for (var i = 0; i < web3_instances.length; i++) {
        const latestBlock = await web3_instances[i].eth.getBlockNumber();
        // console.log("Process latest block " + latestBlock + " on chain " + i);
        while (lastProcessedBlocks[i] < latestBlock) {
            lastProcessedBlocks[i]++;
            await processBlock(lastProcessedBlocks[i], web3_instances[i], i);
        }
    }
    setTimeout(pollNewBlocks, 2000); // Check every 15 seconds
}
console.log(" Listening for new events...")
pollNewBlocks();
