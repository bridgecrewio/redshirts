/* eslint-disable camelcase */
import { expect } from 'chai';
import { BitbucketCommit, BitbucketRepoResponse } from '../../src/vcs/bitbucket/bitbucket-types';
import { BitbucketRunner } from '../../src/vcs/bitbucket/bitbucket-runner';
import { ContributorMap, Repo } from '../../src/common/types';
import Bitbucket from '../../src/commands/bitbucket';
import { stub, restore, spy } from 'sinon';
import { getDefaultFlags } from '../helpers/test-utils';
import { commonFlags } from '../../src/common/flags';
import { BitbucketApiManager } from '../../src/vcs/bitbucket/bitbucket-api-manager';

const sourceInfoPublic = Bitbucket.getSourceInfo('', true);
const sourceInfoPrivate = Bitbucket.getSourceInfo('', false);

// just covering the differences from github / generic VCS runners

describe('bitbucket runner repo conversion', () => {
    it('converts the repo response into generic repos', () => {
        const repos: BitbucketRepoResponse[] = [
            {
                full_name: 'owner1/repo1',
                is_private: true,
                mainbranch: {
                    name: 'main',
                },
            },
            {
                full_name: 'owner2/repo2',
                is_private: true,
                mainbranch: {
                    name: 'main',
                },
            },
            {
                full_name: 'owner3/repo3',
                is_private: false,
                mainbranch: {
                    name: 'master',
                },
            },
        ];

        expect(new BitbucketRunner(null!, null!, null!).convertRepos(repos))
            .to.have.length(3)
            .and.to.have.deep.members([
                {
                    name: 'repo1',
                    owner: 'owner1',
                    private: true,
                    defaultBranch: 'main',
                },
                {
                    name: 'repo2',
                    owner: 'owner2',
                    private: true,
                    defaultBranch: 'main',
                },
                {
                    name: 'repo3',
                    owner: 'owner3',
                    private: false,
                    defaultBranch: 'master',
                },
            ]);
    });

    it('aggregates contributors', () => {
        const repos: Repo[] = [
            {
                owner: 'org1',
                name: 'repo1',
            },
            {
                owner: 'org2',
                name: 'repo2',
            },
        ];

        // 2D array to match repo array
        const commits: BitbucketCommit[][] = [
            [
                {
                    author: {
                        raw: 'User 1 <user1@email.com>',
                        user: {
                            account_id: '1234',
                            nickname: 'user1',
                        },
                    },
                    date: '2022-01-05T23:44:52+00:00',
                },
                {
                    author: {
                        raw: 'User 2 <user2@email.com>',
                        user: {
                            account_id: '1234',
                            nickname: 'user2',
                        },
                    },
                    date: '2022-01-04T23:44:52+00:00',
                },
                {
                    author: {
                        raw: 'User 1 <user1@email.com>',
                        user: {
                            account_id: '1234',
                            nickname: 'user1',
                        },
                    },
                    date: '2022-01-03T23:44:52+00:00',
                },
                {
                    author: {
                        raw: 'User 1 <user1@no-reply.com>',
                        user: {
                            account_id: '1234',
                            nickname: 'user1',
                        },
                    },
                    date: '2022-01-02T23:44:52+00:00',
                },
                {
                    author: {
                        raw: 'User 1 <user1@noreply.com>',
                        user: {
                            account_id: '1234',
                            nickname: 'user1',
                        },
                    },
                    date: '2022-01-01T23:44:52+00:00',
                },
            ],
            [
                {
                    author: {
                        raw: 'User 3 <user3@email.com>',
                        user: {
                            account_id: '1234',
                            nickname: 'user3',
                        },
                    },
                    date: '2022-01-05T23:44:52+00:00',
                },
                {
                    author: {
                        raw: 'User 1 <user1@email.com>',
                        user: {
                            account_id: '1234',
                            nickname: 'user1',
                        },
                    },
                    date: '2022-01-04T23:44:52+00:00',
                },
                {
                    author: {
                        raw: 'User 2 <user2@email.com>',
                        user: {
                            account_id: '1234',
                            nickname: 'user2',
                        },
                    },
                    date: '2022-01-03T23:44:52+00:00',
                },
            ],
        ];

        const runner = new BitbucketRunner(null!, null!, null!);

        for (const [i, repo] of repos.entries()) {
            runner.aggregateCommitContributors(repo, commits[i]);
        }

        expect(runner.contributorsByEmail.size).to.equal(5);
        expect(runner.contributorsByEmail.get('user1@email.com')?.lastCommitDate).to.equal(commits[0][0].date);
        expect(runner.contributorsByEmail.get('user2@email.com')?.lastCommitDate).to.equal(commits[0][1].date);
        expect(runner.contributorsByEmail.get('user3@email.com')?.lastCommitDate).to.equal(commits[1][0].date);

        const repo1 = runner.contributorsByRepo.get('org1/repo1') as ContributorMap;
        expect(repo1.size).to.equal(4);
        expect(repo1.get('user1@email.com')?.lastCommitDate).to.equal(commits[0][0].date);
        expect(repo1.get('user2@email.com')?.lastCommitDate).to.equal(commits[0][1].date);

        const repo2 = runner.contributorsByRepo.get('org2/repo2') as ContributorMap;
        expect(repo2.size).to.equal(3);
        expect(repo2.get('user1@email.com')?.lastCommitDate).to.equal(commits[1][1].date);
        expect(repo2.get('user2@email.com')?.lastCommitDate).to.equal(commits[1][2].date);
        expect(repo2.get('user3@email.com')?.lastCommitDate).to.equal(commits[1][0].date);
    });
});

describe('bitbucket get repo list', () => {
    let apiManager: BitbucketApiManager;

    afterEach(() => {
        restore();
    });

    it('gets repo metadata without --include-public', async () => {
        const sourceInfo = sourceInfoPrivate;
        apiManager = new BitbucketApiManager(sourceInfo, 100000);

        const repo: Repo = {
            owner: 'org',
            name: 'repo',
        };

        stub(apiManager, 'enrichRepo')
            .withArgs(repo)
            .callsFake(async (r: Repo): Promise<void> => {
                r.private = true;
                r.defaultBranch = 'main';
            });

        const flags = {
            ...getDefaultFlags(commonFlags),
            repos: 'org/repo',
        };

        const runner = new BitbucketRunner(sourceInfo, flags, apiManager);

        const repos = await runner.getRepoList();

        expect(repos).to.deep.equal([
            {
                name: 'repo',
                owner: 'org',
                private: true,
                defaultBranch: 'main',
            },
        ]);
    });

    it('gets repo metadata with --include-public', async () => {
        const sourceInfo = sourceInfoPublic;
        apiManager = new BitbucketApiManager(sourceInfo, 100000);

        const repo: Repo = {
            owner: 'org',
            name: 'repo',
        };

        stub(apiManager, 'enrichRepo')
            .withArgs(repo)
            .callsFake(async (r: Repo): Promise<void> => {
                r.private = true;
                r.defaultBranch = 'main';
            });

        const flags = {
            ...getDefaultFlags(commonFlags),
            repos: 'org/repo',
        };

        const runner = new BitbucketRunner(sourceInfo, flags, apiManager);

        const repos = await runner.getRepoList();

        expect(repos).to.deep.equal([
            {
                name: 'repo',
                owner: 'org',
                private: true,
                defaultBranch: 'main',
            },
        ]);
    });

    it('gets user repos when no other repos are specified', async () => {
        const sourceInfo = sourceInfoPrivate;
        apiManager = new BitbucketApiManager(sourceInfoPrivate, 10000);

        stub(apiManager, 'getWorkspaces').resolves(['workspace1', 'workspace2']);

        stub(apiManager, 'getOrgRepos')
            .withArgs('workspace1')
            .resolves([
                {
                    full_name: 'workspace1/repo1',
                    is_private: true,
                    mainbranch: {
                        name: 'main',
                    },
                },
            ])
            .withArgs('workspace2')
            .resolves([
                {
                    full_name: 'workspace2/repo1',
                    is_private: true,
                    mainbranch: {
                        name: 'main',
                    },
                },
            ]);

        const enrichSpy = spy(apiManager, 'enrichRepo');

        const flags = {
            ...getDefaultFlags(commonFlags),
        };

        const runner = new BitbucketRunner(sourceInfo, flags, apiManager);

        const repos = await runner.getRepoList();

        // also check that we removed the private one and did not need enrichRepos
        expect(enrichSpy.notCalled).to.be.true;
        expect(repos).to.deep.equal([
            {
                name: 'repo1',
                owner: 'workspace1',
                private: true,
                defaultBranch: 'main',
            },
            {
                name: 'repo1',
                owner: 'workspace2',
                private: true,
                defaultBranch: 'main',
            },
        ]);
    });
});
