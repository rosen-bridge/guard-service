import MultiSigUtils from '../../../src/guard/multisig/MultiSigUtils';
import { expect } from 'chai';

describe('MultiSigUtils', () => {
  describe('publicKeyToProposition', () => {
    it('should run without any error', () => {
      MultiSigUtils.publicKeyToProposition([
        '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb8',
        '03074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364',
        '0300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee410',
        '023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e',
      ]);
    });
  });

  describe('compareSingleInputCommitmentsAreEquals', () => {
    /**
     * Target: Test that compareSingleInputCommitmentsAreEquals return true in case of same commitments
     * Dependencies:
     *    -
     * Expected: test should return true
     */
    it('Should return true in case of same commitments', () => {
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
     * Target: Test that compareSingleInputCommitmentsAreEquals return false in case of different commitments
     * Dependencies:
     *    -
     * Expected: test should return false
     */
    it('Should return false in case of commitments are different from each other', () => {
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

  describe('comparePublishedCommitmentsToBeEquals', () => {
    /**
     * Target: Test that comparePublishedCommitmentsToBeEquals return true in case of two published commitment are the same
     * Dependencies:
     *    -
     * Expected: test should return true
     */
    it('Should return ture in case of two published commitment are the same', () => {
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
      const res = MultiSigUtils.comparePublishedCommitmentsToBeEquals(
        firstPublishedCommitment,
        secondPublishedCommitment,
        3
      );
      expect(res).to.be.true;
    });

    /**
     * Target: Test that comparePublishedCommitmentsToBeEquals return false in case of two published commitment are not
     *  the same length
     * Dependencies:
     *    -
     * Expected: test should return false
     */
    it('Should return false with different commitment length', () => {
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
      const res = MultiSigUtils.comparePublishedCommitmentsToBeEquals(
        firstPublishedCommitment,
        secondPublishedCommitment,
        3
      );
      expect(res).to.be.false;
    });

    /**
     * Target: Test that comparePublishedCommitmentsToBeEquals return false in case of two published commitment are have
     *  different commitment value
     * Dependencies:
     *    -
     * Expected: test should return false
     */
    it('Should return false with different commitment value', () => {
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
      const res = MultiSigUtils.comparePublishedCommitmentsToBeEquals(
        firstPublishedCommitment,
        secondPublishedCommitment,
        3
      );
      expect(res).to.be.false;
    });
  });

  describe('generatedCommitmentToPublishCommitment', () => {
    /**
     * Target: Test that generatedCommitmentToPublishCommitment return valid publishedCommitment
     * Dependencies:
     *    -
     * Expected: test should return valid publishedCommitment
     */
    it('Should return publishedCommitment form commitmentJson', () => {
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
