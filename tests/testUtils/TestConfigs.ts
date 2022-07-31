class TestConfigs {

    // cardano configs
    static cardano = {
        currentSlot: 8040020,
        blockchainHeight: 200000
    }

    // ergo configs
    static ergo = {
        blockchainHeight: 100000
    }

    // guards configs
    static guardsSecret = [
        {
            "guardId": 0,
            "secretKey": "362c0577375db44de71560d863eaa76c0bc0043a42fb9bc384ebcdc29bd4ccc9"
        },
        {
            "guardId": 2,
            "secretKey": "63b55292623afdfdd46f93c96b6acc9df765a3febca0f3a602bc70ad479f3a00"
        },
        {
            "guardId": 3,
            "secretKey": "07850e55adb5e7ee0d184f221e0379f119061ece2effacfe5a3f596dc108fb8e"
        },
        {
            "guardId": 4,
            "secretKey": "a37b0f0eb52557a78c2f26f8f5ec4830976eca2cded189aba76ebff01f5c8d28"
        },
        {
            "guardId": 5,
            "secretKey": "b87761b8f8b0f4ba25e70a9b6648a13440057466ea07b4820a81b16ae1712753"
        },
        {
            "guardId": 6,
            "secretKey": "7e0c7913b56b66e5db536b59dc9037dbb38f22c2aa68fd437d5f7dbb1bc51001"
        }
    ]

    // guards configs
    static p2p = {
        peerIdFilePath: config.get<string>('p2p.peerIdFilePath')
    }

}

export default TestConfigs
