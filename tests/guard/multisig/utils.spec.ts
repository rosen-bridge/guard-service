import MultiSigUtils from "../../../src/guard/multisig/MultiSigUtils";

describe('MultiSigUtils', () => {
    describe('publicKeyToProposition', () => {
        it('should run without any error', () => {
            const res = MultiSigUtils.publicKeyToProposition([
                '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb8',
                '03074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364',
                '0300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee410',
                '023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e',
            ]);
        })
    })
})
