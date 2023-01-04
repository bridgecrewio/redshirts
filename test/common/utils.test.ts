import { Flags } from "@oclif/core";
import { expect } from "chai";
import { Protocol, Repo } from "../../src/common/types";
import { deleteFlagKey, getRepoListFromParams, getServerUrl, repoMatches, splitAndCombine, splitRepos } from '../../src/common/utils';

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

    it('splits and combines', () => {
        expect(splitAndCombine('author:abc', ':', 2)).to.deep.equal(['author', 'abc']);
        expect(splitAndCombine('author:abc:xyz', ':', 2)).to.deep.equal(['author', 'abc:xyz']);
        expect(splitAndCombine('author', ':', 2)).to.deep.equal(['author']);
    });

    it('deletes a key', () => {

        const flags = {
            a: Flags.integer(),
            b: Flags.boolean(),
            c: Flags.string()
        };

        expect(deleteFlagKey(flags, 'b', 'c', 'd')).to.deep.equal({a: Flags.integer()});
    });

    it('generates a server URL', () => {
        expect(getServerUrl('xyz.com')).to.equal('https://xyz.com');
        expect(() => getServerUrl('https://xyz.com')).to.throw(Error);
        expect(() => getServerUrl('http://xyz.com')).to.throw(Error);
        expect(getServerUrl('xyz.com', undefined, Protocol.HTTP)).to.equal('http://xyz.com');
        expect(getServerUrl('xyz.com', undefined, Protocol.HTTPS)).to.equal('https://xyz.com');
        expect(getServerUrl('xyz.com', 123, Protocol.HTTPS)).to.equal('https://xyz.com:123');
    });
});

// describe('commit aggregation', () => {
//     it('aggregates contributors', () => {
//         const repos: Repo[] = [
//             {
//                 owner: "org1",
//                 name: "repo1"
//             },
//             {
//                 owner: "org2",
//                 name: "repo2"
//             }
//         ];

//         // 2D array to match repo array
//         const commits: Commit[][] = [
//             [
//                 {
//                     username: 'user1',
//                     email: 'user1@email.com',
//                     commitDate: '2022-12-28T16:36:16.351Z'
//                 },
//                 {
//                     username: 'user2',
//                     email: 'user2@email.com',
//                     commitDate: '2022-12-27T12:36:16.351Z'
//                 },
//                 {
//                     username: 'user1',
//                     email: 'user1@email.com',
//                     commitDate: '2022-12-27T16:36:16.351Z'
//                 }
//             ],
//             [
//                 {
//                     username: 'user3',
//                     email: 'user1@email.com',
//                     commitDate: '2022-12-30T16:36:16.351Z'
//                 },
//                 {
//                     username: 'user1',
//                     email: 'user1@email.com',
//                     commitDate: '2022-12-29T16:36:16.351Z'
//                 },
//                 {
//                     username: 'user2',
//                     email: 'user2@email.com',
//                     commitDate: '2022-12-24T12:36:16.351Z'
//                 }
//             ]
//         ];

//         // need an instance
//         const runner = new GithubRunner(null!, null!, null!);

//         for (const [i, repo] of repos.entries()) {
//             for (const commit of commits[i]) {
//                 runner.addContributor(repo.owner, repo.name, commit);
//             }
//         }

//         expect(runner.contributorsByUsername.size).to.equal(3);
//         expect(runner.contributorsByUsername.get('user1')?.lastCommitDate).to.equal('2022-12-29T16:36:16.351Z');
//         expect(runner.contributorsByUsername.get('user2')?.lastCommitDate).to.equal('2022-12-27T12:36:16.351Z');
//         expect(runner.contributorsByUsername.get('user3')?.lastCommitDate).to.equal('2022-12-30T16:36:16.351Z');

//         const repo1 = runner.contributorsByRepo.get('org1/repo1') as ContributorMap;
//         expect(repo1.size).to.equal(2);
//         expect(repo1.get('user1')?.lastCommitDate).to.equal('2022-12-28T16:36:16.351Z');
//         expect(repo1.get('user2')?.lastCommitDate).to.equal('2022-12-27T12:36:16.351Z');

//         const repo2 = runner.contributorsByRepo.get('org2/repo2') as ContributorMap;
//         expect(repo2.size).to.equal(3);
//         expect(repo2.get('user1')?.lastCommitDate).to.equal('2022-12-29T16:36:16.351Z');
//         expect(repo2.get('user2')?.lastCommitDate).to.equal('2022-12-24T12:36:16.351Z');
//         expect(repo2.get('user3')?.lastCommitDate).to.equal('2022-12-30T16:36:16.351Z');
//     });

//     it('aggregates repos with no contributors', () => {
//         const repos: Repo[] = [
//             {
//                 owner: "org1",
//                 name: "repo1"
//             }
//         ];

//         // need an instance
//         const runner = new GithubRunner(null!, null!, null!);

//         for (const [i, repo] of repos.entries()) {
//             for (const commit of commits[i]) {
//                 runner.addContributor(repo.owner, repo.name, commit);
//             }
//         }

//         expect(runner.contributorsByUsername.size).to.equal(3);
//         expect(runner.contributorsByUsername.get('user1')?.lastCommitDate).to.equal('2022-12-29T16:36:16.351Z');
//         expect(runner.contributorsByUsername.get('user2')?.lastCommitDate).to.equal('2022-12-27T12:36:16.351Z');
//         expect(runner.contributorsByUsername.get('user3')?.lastCommitDate).to.equal('2022-12-30T16:36:16.351Z');

//         const repo1 = runner.contributorsByRepo.get('org1/repo1') as ContributorMap;
//         expect(repo1.size).to.equal(2);
//         expect(repo1.get('user1')?.lastCommitDate).to.equal('2022-12-28T16:36:16.351Z');
//         expect(repo1.get('user2')?.lastCommitDate).to.equal('2022-12-27T12:36:16.351Z');

//         const repo2 = runner.contributorsByRepo.get('org2/repo2') as ContributorMap;
//         expect(repo2.size).to.equal(3);
//         expect(repo2.get('user1')?.lastCommitDate).to.equal('2022-12-29T16:36:16.351Z');
//         expect(repo2.get('user2')?.lastCommitDate).to.equal('2022-12-24T12:36:16.351Z');
//         expect(repo2.get('user3')?.lastCommitDate).to.equal('2022-12-30T16:36:16.351Z');
//     });
// });
