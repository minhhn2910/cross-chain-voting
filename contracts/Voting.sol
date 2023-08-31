// SPDX-License-Identifier: MIT
/*
This is a simple voting contract that can be used to vote for two options.
It is used to demonstrate the crosschain communication standard between blockchains.
There is no security check in this contract, so it MUST NOT be used in production.
*/
pragma solidity ^0.8.0;

contract Voting {
    uint public winner;
    uint public voting_round;
    uint[2] public votes; // voting for two options
    bool public  session_active; // true if currently in a crosschain session
    uint public constant NUM_PEERS = 2;
    // mapping(uint => uint) public session_nonce; // nonce of recevied message each session, not implemented
    uint session_id = 1234;
    // simple tracking methods, only allow sending + receiving exact 1 message per session
    mapping(uint => bool) public message_received; // true if message is received from sender i
    mapping(uint => bool) public message_sent; // true if message is sent to receiver i

    struct CrosschainPeer{
        uint chainid;
        uint rank;
        address addr;
        // other properties
    }
    mapping(uint => CrosschainPeer) public crosschain_peers;
    uint public my_rank = 2**256 - 1;
    event VotingResult(uint winner);

    function recv_vote(uint candidate, uint voting_round) internal {
        votes[candidate] = votes[candidate] + 1;
    }

    function recv_message(uint session, bytes calldata data) external  {
        // require(session_active == true, "session not started");
        // TODO: Sender validation, session management
        (uint sender_rank, uint round_number, uint candiate) = abi.decode(data, (uint, uint, uint));
        message_received[sender_rank] = true;
        if (session_active)
            enter_session(); // main logic of session
    }
    function send_message(uint receiver_rank, bytes memory data) internal{
        address receiver_address = crosschain_peers[receiver_rank].addr;
        Voting(receiver_address).recv_message(session_id, data);
        message_sent[receiver_rank] = true;
    }
    function crosschain_init(address[2] memory peers) public{
        require(session_active == false, "session already started, finalize first");
        // data must be the same across all chains
        // use mapping to enable quierying rank by contract's own address
        // TODO: extra logic to get new unique session id each time the same across all chains
        crosschain_peers[0] = CrosschainPeer(1, 0, peers[0]);
        crosschain_peers[1] = CrosschainPeer(2, 1, peers[1]);

        session_active = true;
        clear_message_status();
    }
    function clear_message_status() internal {
        for (uint i = 0; i < NUM_PEERS; i++){
            message_received[i] = false;
            message_sent[i] = false;
        }
    }
    function enter_session() public{
        require(session_active == true, "session not started");
        if (my_rank != 0){
            // send votes to rank 0
            if (message_sent[0] == false){
                uint candidate = 1;
                send_message(0, abi.encodePacked(my_rank, uint(0), candidate));
                message_sent[0] = true;
            }
        } else {
            // wait for all votes
            for (uint i = 0; i < NUM_PEERS; i++){
                if (message_received[i] == false){
                    return;
                }
            }
            // all votes received, find winner
            if (votes[0] > votes[1]){
                winner = 0;
            } else {
                winner = 1;
            }
            emit VotingResult(winner);
            // Optional TODO : broacast winner to all peers
            crosschain_finalize();
        }
    }

    function crosschain_finalize() public{
        // reset session states
        session_active = false;
    }
    function voting_session(address[2] memory peers) public{
        crosschain_init(peers);
        voting_round = voting_round + 1;
        enter_session();
    }
    function get_result() public view returns (uint) {
        return winner;
    }
}
