// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

contract KeyValue {

    event SetValue(string key, string value);

    constructor() {}

    function setValue(string calldata key, string calldata value) external { 
        emit SetValue(key, value); 
    }
}
