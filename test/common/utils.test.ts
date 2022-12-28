import { expect } from "chai";
import { Repo } from "../../src/common/types";
import { getRepoListFromParams, repoMatches, splitRepos } from '../../src/common/utils';

describe('utils', () => {
    it('parses the CSV repo list correctly', () => {
        const repos: Repo[] = splitRepos('org/repo1, org/repo2, org2/group/repo3', 2, 99);
        expect(repos).to.have.deep.members([
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

    it('fails parsing if the number of path parts is incorrect', () => {
        expect(() => splitRepos('org/repo1,org/repo2,org2/group/repo3', 2, 2)).to.throw(Error);
    });

    it('correctly matches repos by owner and name', () => {
        const repo1: Repo = {
            owner: 'owner',
            name: 'name',
            private: true
        };

        const repo2: Repo = {
            owner: 'owner',
            name: 'name',
            private: false
        };

        const repo3: Repo = {
            owner: 'other',
            name: 'name',
            private: true
        };

        expect(repoMatches(repo1, repo2)).to.be.true;
        expect(repoMatches(repo1, repo3)).to.be.false;
    });

    it('gets a repo list from a string or file', () => {
        expect(getRepoListFromParams(2, 2)).to.have.length(0);
        expect(getRepoListFromParams(2, 2, 'org1/repo1,org2/repo2')).to.have.deep.members(
            [
                {
                    owner: "org1",
                    name: "repo1"
                },
                {
                    owner: "org2",
                    name: "repo2"
                }
            ]).and.to.have.length(2);

        expect(getRepoListFromParams(2, 2, undefined, 'test/resources/repos1.txt')).to.have.deep.members(
            [
                {
                    owner: "org1",
                    name: "repo1"
                },
                {
                    owner: "org2222",
                    name: "repo2222"
                }
            ]).and.to.have.length(2);
        
        expect(getRepoListFromParams(2, 2, 'org1/repo1,org2/repo2', 'test/resources/repos1.txt')).to.have.deep.members(
            [
                {
                    owner: "org1",
                    name: "repo1"
                },
                {
                    owner: "org2",
                    name: "repo2"
                }
            ]).and.to.have.length(2);
    });
});
