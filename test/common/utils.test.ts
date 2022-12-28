import { expect } from "chai";
import { Repo } from "../../src/common/types";
import { splitRepos } from '../../src/common/utils';

describe('utils', () => {
  it('parses the CSV repo list correctly', () => {
    const repos: Repo[] = splitRepos('org/repo1,org/repo2,org2/group/repo3');
    expect(repos).to.equal([
        {
            owner: 'org',
            name: 'repo1'
        },
        {
            owner: 'org',
            name: 'repo2'
        },
        {
            owner: 'org2/group',
            name: 'repo3'
        }
    ]);
  });
});
