import MultiSigUtils from '../../../src/guard/multisig/MultiSigUtils';

describe('MultiSigUtils', () => {
  describe('publicKeyToProposition', () => {
    /**
     * @target MultiSigUtils.publicKeyToProposition should run without any error
     * @dependencies
     * @scenario
     * - run test with mocked public keys
     * @expected
     * - no error has been thrown
     */
    it('should run without any error', () => {
      MultiSigUtils.publicKeyToProposition([
        '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb8',
        '03074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364',
        '0300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee410',
        '023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e',
      ]);
    });
  });

  describe('comparePublishedCommitmentsToBeDiffer', () => {
    /**
     * @target MultiSigUtils.comparePublishedCommitmentsToBeDiffer should return
     * false when two published commitments are same
     * @dependencies
     * @scenario
     * - mock two similar commitments
     * - run test
     * - check retuned value
     * @expected
     * - returned value should be false
     */
    it('should return false when two published commitments are same', () => {
      const firstPublishedCommitment = {
        '0': [
          { a: '20', position: '0-0' },
          { a: '10', position: '0-3' },
          { a: '30', position: '0-11' },
        ],
        '1': [
          { a: '31', position: '0-1' },
          { a: '21', position: '0-4' },
          { a: '11', position: '0-12' },
        ],
        '2': [
          { a: '52', position: '0-5' },
          { a: '51', position: '0-9' },
          { a: '55', position: '0-13' },
        ],
      };
      const secondPublishedCommitment = {
        '1': [
          { a: '21', position: '0-4' },
          { a: '11', position: '0-12' },
          { a: '31', position: '0-1' },
        ],
        '2': [
          { a: '51', position: '0-9' },
          { a: '55', position: '0-13' },
          { a: '52', position: '0-5' },
        ],
        '0': [
          { a: '10', position: '0-3' },
          { a: '20', position: '0-0' },
          { a: '30', position: '0-11' },
        ],
      };
      const res = MultiSigUtils.comparePublishedCommitmentsToBeDiffer(
        firstPublishedCommitment,
        secondPublishedCommitment,
        3
      );
      expect(res).to.be.false;
    });

    /**
     * @target MultiSigUtils.comparePublishedCommitmentsToBeDiffer should return
     * true when two published commitments have different length
     * @dependencies
     * @scenario
     * - mock two commitments with different length
     * - run test
     * - check retuned value
     * @expected
     * - returned value should be true
     */
    it('should return true when two published commitments have different length', () => {
      const firstPublishedCommitment = {
        '0': [
          { a: '20', position: '0-0' },
          { a: '10', position: '0-3' },
          { a: '30', position: '0-11' },
        ],
        '1': [
          { a: '31', position: '0-1' },
          { a: '21', position: '0-4' },
          { a: '11', position: '0-12' },
        ],
        '2': [
          { a: '52', position: '0-5' },
          { a: '51', position: '0-9' },
          { a: '55', position: '0-13' },
        ],
      };
      const secondPublishedCommitment = {
        '1': [
          { a: '11', position: '0-12' },
          { a: '31', position: '0-1' },
        ],
        '2': [
          { a: '51', position: '0-9' },
          { a: '55', position: '0-13' },
          { a: '52', position: '0-5' },
        ],
        '0': [
          { a: '10', position: '0-3' },
          { a: '20', position: '0-0' },
          { a: '30', position: '0-11' },
        ],
      };
      const res = MultiSigUtils.comparePublishedCommitmentsToBeDiffer(
        firstPublishedCommitment,
        secondPublishedCommitment,
        3
      );
      expect(res).to.be.true;
    });

    /**
     * @target MultiSigUtils.comparePublishedCommitmentsToBeDiffer should return
     * true when two published commitments have different value
     * @dependencies
     * @scenario
     * - mock two commitments with different value
     * - run test
     * - check retuned value
     * @expected
     * - returned value should be true
     */
    it('should return true when two published commitments have different value', () => {
      const firstPublishedCommitment = {
        '0': [
          { a: '20', position: '0-0' },
          { a: '12', position: '0-3' },
          { a: '30', position: '0-11' },
        ],
        '1': [
          { a: '31', position: '0-1' },
          { a: '21', position: '0-4' },
          { a: '11', position: '0-12' },
        ],
        '2': [
          { a: '52', position: '0-5' },
          { a: '51', position: '0-9' },
          { a: '55', position: '0-13' },
        ],
      };
      const secondPublishedCommitment = {
        '1': [
          { a: '21', position: '0-4' },
          { a: '11', position: '0-12' },
          { a: '31', position: '0-1' },
        ],
        '2': [
          { a: '51', position: '0-9' },
          { a: '55', position: '0-13' },
          { a: '52', position: '0-5' },
        ],
        '0': [
          { a: '10', position: '0-3' },
          { a: '20', position: '0-0' },
          { a: '30', position: '0-11' },
        ],
      };
      const res = MultiSigUtils.comparePublishedCommitmentsToBeDiffer(
        firstPublishedCommitment,
        secondPublishedCommitment,
        3
      );
      expect(res).to.be.true;
    });
  });

  describe('compareSingleInputCommitmentsAreEquals', () => {
    /**
     * @target MultiSigUtils.compareSingleInputCommitmentsAreEquals should return
     * true when two commitments are same
     * @dependencies
     * @scenario
     * - mock two similar commitments
     * - run test
     * - check retuned value
     * @expected
     * - returned value should be true
     */
    it('should return true when two commitments are same', () => {
      const firstCommitments = [
        { a: '2', position: '0-2' },
        { a: '1', position: '0-1' },
        { a: '3', position: '0-3' },
      ];
      const secondCommitments = [
        { a: '3', position: '0-3' },
        { a: '2', position: '0-2' },
        { a: '1', position: '0-1' },
      ];
      const res = MultiSigUtils.compareSingleInputCommitmentsAreEquals(
        firstCommitments,
        secondCommitments
      );
      expect(res).to.be.true;
    });

    /**
     * @target MultiSigUtils.compareSingleInputCommitmentsAreEquals should return
     * false when two commitments are different
     * @dependencies
     * @scenario
     * - mock two different commitments
     * - run test
     * - check retuned value
     * @expected
     * - returned value should be false
     */
    it('should return false when two commitments are different', () => {
      const firstCommitments = [
        { a: '1', position: '0-2' },
        { a: '1', position: '0-1' },
        { a: '3', position: '0-3' },
      ];
      const secondCommitments = [
        { a: '3', position: '0-3' },
        { a: '2', position: '0-2' },
        { a: '1', position: '0-1' },
      ];
      const res = MultiSigUtils.compareSingleInputCommitmentsAreEquals(
        firstCommitments,
        secondCommitments
      );
      expect(res).to.be.false;
    });
  });

  describe('generatedCommitmentToPublishCommitment', () => {
    /**
     * @target MultiSigUtils.generatedCommitmentToPublishCommitment should return
     * published commitment from commitment json
     * @dependencies
     * @scenario
     * - mock commitment json
     * - run test
     * - check retuned value
     * @expected
     * - returned value should be expected published commitment
     */
    it('should return published commitment from commitment json', () => {
      const commitmentJson = {
        secretHints: {
          '1': [
            {
              hint: 'hint',
              pubkey: { op: '1', h: '2' },
              type: 'type',
              a: '1',
              secret: 'secret',
              position: '0-1',
            },
          ],
        },
        publicHints: {
          '1': [
            {
              hint: 'hint',
              pubkey: { op: '1', h: '2' },
              type: 'type',
              a: '1',
              position: '0-1',
            },
          ],
        },
      };
      const publishedCommitment =
        MultiSigUtils.generatedCommitmentToPublishCommitment(commitmentJson);
      expect(publishedCommitment).to.be.eql({
        '1': [{ a: '1', position: '0-1' }],
      });
    });
  });
});
