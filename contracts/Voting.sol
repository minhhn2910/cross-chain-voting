// SPDX-License-Identifier: MIT
/*
This is a simple voting contract that can be used to vote for two options.
It is used to demonstrate a testing proof of concept for the crosschain communication library between blockchains.
There is no security check in this contract, so it MUST NOT be used in production.
*/
pragma solidity ^0.8.0;

contract Voting {
    uint public winner = 2 ** 256 - 1;
    uint public voting_round;
    uint[2] public votes; // voting for two options
    uint[2] public last_round_votes; // voting result of last round, for debugging purpose
    bool public session_active; // true if currently in a crosschain session
    // mapping(uint => uint) public session_nonce; // nonce of received message each session, not implemented
    uint session_id = 1234;
    // simple tracking methods, only allow sending + receiving exact 1 message per session
    mapping(uint => bool) public message_received; // true if message is received from sender i
    mapping(uint => bool) public message_sent; // true if message is sent to receiver i

    struct CrosschainPeer {
        uint chainid;
        uint rank;
        address addr;
        // other properties
    }
    struct Message {
        uint256 sessionId;
        address receiverAddress;
        uint256 receiverRank;
        bytes data;
    }

    CrosschainPeer[] public crosschain_peers;
    uint public my_rank = 2 ** 256 - 1;

    event VotingResult(uint winner);
    event VoteCast(uint candidate, uint sender_rank);
    event SendMessage(
        uint session_id,
        address receiver_address,
        uint receiver_rank,
        bytes data
    );
    event RecvMessage(uint session_id, uint receiver_rank, bytes data);

    function recv_vote(uint candidate, uint voting_round) public {
        votes[candidate] = votes[candidate] + 1;
    }

    function recv_message(uint session, bytes calldata data) external {
        // require(session_active == true, "session not started");
        // TODO: Sender validation, session management
        emit RecvMessage(session_id, my_rank, data);
        (uint sender_rank, uint round_number, uint candidate) = abi.decode(
            data,
            (uint, uint, uint)
        );
        if (message_received[sender_rank]) return; // no double voting
        message_received[sender_rank] = true;
        emit VoteCast(candidate, sender_rank);
        votes[candidate] += 1;
        if (session_active) enter_session(); // main logic of session
    }

    Message public last_message; // simple retry logic

    function retry_last_message() public {
        emit SendMessage(
            last_message.sessionId,
            last_message.receiverAddress,
            last_message.receiverRank,
            last_message.data
        );
    }

    function send_message(uint receiver_rank, bytes memory data) public {
        address receiver_address = crosschain_peers[receiver_rank].addr;
        // TODO: retry logic
        emit SendMessage(session_id, receiver_address, receiver_rank, data);
        last_message = Message({
            sessionId: session_id,
            receiverAddress: receiver_address,
            receiverRank: receiver_rank,
            data: data
        });
        // Voting(receiver_address).recv_message(session_id, data); adding to debug for single chain
        message_sent[receiver_rank] = true;
    }

    function crosschain_init(address[] memory peers, uint _my_rank) public {
        require(
            session_active == false,
            "session already started, finalize first"
        );
        // data must be the same across all chains
        // use mapping to enable quierying rank by contract's own address
        // TODO: extra logic to get new unique session id each time the same across all chains
        delete crosschain_peers;
        my_rank = _my_rank; // init my rank
        for (uint i = 0; i < peers.length; i++) {
            crosschain_peers.push(
                CrosschainPeer({chainid: i + 1, rank: i, addr: peers[i]})
            );
        }
        session_active = true;
        clear_message_status();
    }

    function clear_message_status() internal {
        for (uint i = 0; i < crosschain_peers.length; i++) {
            message_received[i] = false;
            message_sent[i] = false;
        }
    }

    function enter_session() public {
        require(session_active == true, "session not started");
        if (my_rank != 0) {
            // send votes to rank 0
            if (message_sent[0] == false) {
                uint candidate = 1;
                if (my_rank > 2) candidate = 0;
                send_message(0, abi.encodePacked(my_rank, uint(0), candidate));
                message_sent[0] = true;
            }
            crosschain_finalize();
        } else {
            // wait for all votes, except rank 0
            for (uint i = 1; i < crosschain_peers.length; i++) {
                if (message_received[i] == false) {
                    return;
                }
            }
            // all votes received, find winner
            if (votes[0] >= votes[1]) {
                winner = 0;
            } else {
                winner = 1;
            }
            emit VotingResult(winner);
            // Optional TODO : broacast winner to all peers
            crosschain_finalize();
        }
    }

    function crosschain_finalize() public {
        // reset session states
        session_active = false;
        delete crosschain_peers;
        // clear the votes
        clear_votes();
    }

    function clear_votes() public {
        last_round_votes[0] = votes[0];
        last_round_votes[1] = votes[1];
        votes[0] = 0;
        votes[1] = 0;
    }

    function voting_session(address[] memory peers, uint _my_rank) public {
        crosschain_init(peers, _my_rank);
        voting_round = voting_round + 1;
        enter_session();
    }

    function get_result() public view returns (uint) {
        return winner;
    }
}
