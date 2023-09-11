# Cross-Chain Voting
Test POC cross-chain voting app between N blockchains. Each blockchain cast 1 vote between two candidates

## Features:
With N blockchains, the first blockchain aggregates the votes, while the other N-1 contracts on N-1 blockchains send votes. Each contract can cast only 1 vote. The result is stored in the first blockchain. Further logic can be implemented to allow multiple votes per blockchain or to broadcast the voting results, etc.

Each blockchain is a single `ganache-cli` process running on a different port. All have the same account with enough ETH for gas.

This setup simulates the behavior of an asynchronous messaging interface library that can be used to write cross-chain native contracts with unified logic across different blockchains. Because there is no security mechanism in place, this setup should be used for demonstration purposes only.

### Code files 

* `contracts/Voting.sol` : the voting app with a unified logic that applied to all of the participating blockchains
* `bridge.js`: the simple notary bridge service listening to all chains 
* `test.js` : the test scenario (deploy, init cross-chain session, and start cross-chain logic

### Run Test:
1. Clone this project and make sure `node` is installed:
```
git clone https://github.com/minhhn2910/cross-chain-voting.git
```

2. Install dependencies:

```
cd cross-chain-voting
npm install 
npm install -g ganache-cli # skip this if you already have ganache installed.
```

3. Run end-to-end test:

```
./run_experiment.sh
```

You should see some output like this :

```
session active contract 0 true
Blockchain  0  contract rank  0n
session active contract 1 true
Blockchain  1  contract rank  1n
session active contract 2 true
Blockchain  2  contract rank  2n
=================== Enter sessions ===================
session active contract  0 true
session active contract  1 false
session active contract  2 false
========= retry last message =========
Blockchain  1  retry sending message to contract  0xc010C027c557dB20F5A0cE653Cca257A3De24843
Blockchain  2  retry sending message to contract  0xc010C027c557dB20F5A0cE653Cca257A3De24843
... Other bridge logs
Blockchain 0 RecvMsg event session_id: 1234n receiver_rank: 0n data: 0x000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001
Blockchain 0 VoteCast event candidate: 1n sender_rank: 1n
Blockchain 0 VoteCast event candidate: 1n sender_rank: 2n
Blockchain 0 VotingResult event winner: 1n
session active contract  0 false
session active contract  1 false
session active contract  2 false
========= voting result =========
candiate 1's votes 0n
candiate 2's votes 2n

```

