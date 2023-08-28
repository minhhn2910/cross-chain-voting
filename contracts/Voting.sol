pragma solidity ^0.8.0;

contract Voting {
    uint public winner;
    uint public votingRound;
    uint[2] public votes;

    function voting_round() public {
        votingRound = votingRound + 1;
    }

    function get_result() public view returns (uint) {
        return winner;
    }
}
