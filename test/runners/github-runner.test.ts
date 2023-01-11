import { expect } from 'chai';
import { GithubCommit, GithubRepoResponse } from '../../src/vcs/github/github-types';
import { GithubRunner } from '../../src/vcs/github/github-runner';
import { ContributorMap, Repo } from '../../src/common/types';
import { GithubApiManager } from '../../src/vcs/github/github-api-manager';
import Github from '../../src/commands/github';
import { stub, restore, spy } from 'sinon';
import { getDefaultFlags } from '../helpers/test-utils';
import { commonFlags } from '../../src/common/flags';
import * as utils from '../../src/common/utils';
import { EOL } from 'node:os';

const sourceInfoPublic = Github.getSourceInfo('', true);
const sourceInfoPrivate = Github.getSourceInfo('', false);

// these tests cover most of the vcs-runner functionality, so for now we will not repeat them for all VCSes
// except for where there are differences (bitbucket and ADO)

describe('github runner repo conversion', () => {
    it('converts the repo response into generic repos', () => {
        const repos: GithubRepoResponse[] = [
            {
                name: 'repo1',
                owner: { login: 'owner1' },
                private: true,
            },
            {
                name: 'repo2',
                owner: { login: 'owner2' },
                private: true,
            },
            {
                name: 'repo3',
                owner: { login: 'owner3' },
                private: false,
            },
        ];

        expect(new GithubRunner(null!, null!, null!).convertRepos(repos))
            .to.have.length(3)
            .and.to.have.deep.members([
                {
                    name: 'repo1',
                    owner: 'owner1',
                    private: true,
                },
                {
                    name: 'repo2',
                    owner: 'owner2',
                    private: true,
                },
                {
                    name: 'repo3',
                    owner: 'owner3',
                    private: false,
                },
            ]);
    });

    // TODO filter emails
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
        const commits: GithubCommit[][] = [
            [
                {
                    author: { login: 'user1' },
                    commit: {
                        author: {
                            name: 'user1',
                            email: 'user1@email.com',
                            date: '2022-12-28T16:36:16.351Z',
                        },
                    },
                },
                {
                    author: { login: 'user2' },
                    commit: {
                        author: {
                            name: 'user2',
                            email: 'user2@email.com',
                            date: '2022-12-27T12:36:16.351Z',
                        },
                    },
                },
                {
                    author: { login: 'user1' },
                    commit: {
                        author: {
                            name: 'user1',
                            email: 'user1@email.com',
                            date: '2022-12-27T16:36:16.351Z',
                        },
                    },
                },
                {
                    author: { login: 'user1' },
                    commit: {
                        author: {
                            name: 'noreply',
                            email: 'doesntcount@no-reply.com',
                            date: '2022-12-27T16:35:16.351Z',
                        },
                    },
                },
                {
                    author: { login: 'user1' },
                    commit: {
                        author: {
                            name: 'noreply',
                            email: 'alsodoesntcount@noreply.com',
                            date: '2022-12-27T16:34:16.351Z',
                        },
                    },
                },
            ],
            [
                {
                    author: { login: 'user3' },
                    commit: {
                        author: {
                            name: 'user3',
                            email: 'user3@email.com',
                            date: '2022-12-30T16:36:16.351Z',
                        },
                    },
                },
                {
                    author: { login: 'user1' },
                    commit: {
                        author: {
                            name: 'user1',
                            email: 'user1@email.com',
                            date: '2022-12-29T16:36:16.351Z',
                        },
                    },
                },
                {
                    author: { login: 'user2' },
                    commit: {
                        author: {
                            name: 'user2',
                            email: 'user2@email.com',
                            date: '2022-12-24T12:36:16.351Z',
                        },
                    },
                },
            ],
        ];

        const runner = new GithubRunner(null!, null!, null!);

        for (const [i, repo] of repos.entries()) {
            runner.aggregateCommitContributors(repo, commits[i]);
        }

        expect(runner.contributorsByEmail.size).to.equal(3);
        expect(runner.contributorsByEmail.get('user1@email.com')?.lastCommitDate).to.equal('2022-12-29T16:36:16.351Z');
        expect(runner.contributorsByEmail.get('user2@email.com')?.lastCommitDate).to.equal('2022-12-27T12:36:16.351Z');
        expect(runner.contributorsByEmail.get('user3@email.com')?.lastCommitDate).to.equal('2022-12-30T16:36:16.351Z');

        const repo1 = runner.contributorsByRepo.get('org1/repo1') as ContributorMap;
        expect(repo1.size).to.equal(2);
        expect(repo1.get('user1@email.com')?.lastCommitDate).to.equal('2022-12-28T16:36:16.351Z');
        expect(repo1.get('user2@email.com')?.lastCommitDate).to.equal('2022-12-27T12:36:16.351Z');

        const repo2 = runner.contributorsByRepo.get('org2/repo2') as ContributorMap;
        expect(repo2.size).to.equal(3);
        expect(repo2.get('user1@email.com')?.lastCommitDate).to.equal('2022-12-29T16:36:16.351Z');
        expect(repo2.get('user2@email.com')?.lastCommitDate).to.equal('2022-12-24T12:36:16.351Z');
        expect(repo2.get('user3@email.com')?.lastCommitDate).to.equal('2022-12-30T16:36:16.351Z');
    });
});

describe('github repo param validation', () => {
    let githubApiManager: GithubApiManager;

    afterEach(() => {
        restore();
    });

    it('logs a warning if --repos and --skip-repos are both used', async () => {
        const sourceInfo = sourceInfoPublic;
        githubApiManager = new GithubApiManager(sourceInfo);

        const loggerSpy = spy();
        utils.LOGGER.warn = loggerSpy;

        const flags = {
            ...getDefaultFlags(commonFlags),
            repos: 'org/repo',
            'repo-file': 'file1',
        };

        const githubRunner = new GithubRunner(sourceInfo, flags, githubApiManager);

        await githubRunner.getRepoList();

        expect(
            loggerSpy.calledOnceWith('You specified both "--repos" and "--repo-file". "--repo-file" will be ignored.')
        ).to.be.true;
    });

    it('logs a warning if --repo-file and --skip-repo-file are both used', async () => {
        const sourceInfo = sourceInfoPublic; // using public will skip the call to get repo details
        githubApiManager = new GithubApiManager(sourceInfo);

        const loggerSpy = spy();
        utils.LOGGER.warn = loggerSpy;

        const flags = {
            ...getDefaultFlags(commonFlags),
            repos: 'org/repo',
            'skip-repos': 'org/repo',
            'skip-repo-file': 'file1',
        };

        const githubRunner = new GithubRunner(sourceInfo, flags, githubApiManager);

        await githubRunner.getRepoList();

        expect(
            loggerSpy.calledOnceWith(
                'You specified both "--skip-repos" and "--skip-repo-file". "--skip-repo-file" will be ignored.'
            )
        ).to.be.true;
    });
});

describe('github runner repo fetching', () => {
    let githubApiManager: GithubApiManager;

    afterEach(() => {
        restore();
    });

    it('converts orgs to repos with include-public', async () => {
        const sourceInfo = sourceInfoPublic;
        githubApiManager = new GithubApiManager(sourceInfo);
        stub(githubApiManager, 'getOrgRepos')
            .withArgs('org1')
            .resolves([
                {
                    name: 'repo1',
                    owner: { login: 'org1' },
                    private: true,
                },
            ])
            .withArgs('org2')
            .resolves([
                {
                    name: 'repo1',
                    owner: { login: 'org2' },
                    private: true,
                },
                {
                    name: 'repo2',
                    owner: { login: 'org2' },
                    private: false,
                },
            ]);

        const flags = {
            ...getDefaultFlags(commonFlags),
            orgs: 'org1,org2',
        };

        const githubRunner = new GithubRunner(sourceInfo, flags, githubApiManager);

        const repos = await githubRunner.getRepoList();

        expect(repos).to.deep.equal([
            {
                name: 'repo1',
                owner: 'org1',
                private: true,
            },
            {
                name: 'repo1',
                owner: 'org2',
                private: true,
            },
            {
                name: 'repo2',
                owner: 'org2',
                private: false,
            },
        ]);
    });

    it('converts orgs to repos without include-public', async () => {
        const sourceInfo = sourceInfoPrivate;
        githubApiManager = new GithubApiManager(sourceInfo);
        stub(githubApiManager, 'getOrgRepos')
            .withArgs('org1')
            .resolves([
                {
                    name: 'repo1',
                    owner: { login: 'org1' },
                    private: true,
                },
            ])
            .withArgs('org2')
            .resolves([
                {
                    name: 'repo1',
                    owner: { login: 'org2' },
                    private: true,
                },
                {
                    name: 'repo2',
                    owner: { login: 'org2' },
                    private: false,
                },
            ]);

        const flags = {
            ...getDefaultFlags(commonFlags),
            orgs: 'org1,org2',
        };

        const githubRunner = new GithubRunner(sourceInfo, flags, githubApiManager);

        const repos = await githubRunner.getRepoList();

        expect(repos).to.deep.equal([
            {
                name: 'repo1',
                owner: 'org1',
                private: true,
            },
            {
                name: 'repo1',
                owner: 'org2',
                private: true,
            },
        ]);
    });

    it('gets repo metadata without --include-public', async () => {
        const sourceInfo = sourceInfoPrivate;
        githubApiManager = new GithubApiManager(sourceInfo);

        const repo: Repo = {
            owner: 'org',
            name: 'repo',
        };

        stub(githubApiManager, 'enrichRepo')
            .withArgs(repo)
            .callsFake(async (r: Repo): Promise<void> => {
                r.private = true;
            });

        const flags = {
            ...getDefaultFlags(commonFlags),
            repos: 'org/repo',
        };

        const githubRunner = new GithubRunner(sourceInfo, flags, githubApiManager);

        const repos = await githubRunner.getRepoList();

        expect(repos).to.deep.equal([
            {
                name: 'repo',
                owner: 'org',
                private: true,
            },
        ]);
    });

    it('does not get repo metadata with --include-public', async () => {
        const sourceInfo = sourceInfoPublic;
        githubApiManager = new GithubApiManager(sourceInfo);

        const enrichSpy = spy(githubApiManager, 'enrichRepo');

        const flags = {
            ...getDefaultFlags(commonFlags),
            repos: 'org/repo',
        };

        const githubRunner = new GithubRunner(sourceInfo, flags, githubApiManager);

        const repos = await githubRunner.getRepoList();

        expect(enrichSpy.notCalled).to.be.true;
        expect(repos).to.deep.equal([
            {
                name: 'repo',
                owner: 'org',
            },
        ]);
    });

    it('reads repos from a file', async () => {
        const sourceInfo = sourceInfoPublic;
        githubApiManager = new GithubApiManager(sourceInfo);

        stub(utils, 'getFileContents').callsFake((_: string): string => `org1/repo1${EOL}org1/repo2${EOL}`);

        const flags = {
            ...getDefaultFlags(commonFlags),
            'repo-file': 'file',
        };

        const githubRunner = new GithubRunner(sourceInfo, flags, githubApiManager);

        const repos = await githubRunner.getRepoList();

        expect(repos).to.deep.equal([
            {
                name: 'repo1',
                owner: 'org1',
            },
            {
                name: 'repo2',
                owner: 'org1',
            },
        ]);
    });

    it('gets user repos when no other repos are specified', async () => {
        const sourceInfo = sourceInfoPrivate;
        githubApiManager = new GithubApiManager(sourceInfoPrivate);

        stub(githubApiManager, 'getUserRepos').resolves([
            {
                name: 'repo1',
                owner: { login: 'org1' },
                private: true,
            },
            {
                name: 'repo2',
                owner: { login: 'org1' },
                private: false,
            },
        ]);

        const enrichSpy = spy(githubApiManager, 'enrichRepo');

        const flags = {
            ...getDefaultFlags(commonFlags),
        };

        const githubRunner = new GithubRunner(sourceInfo, flags, githubApiManager);

        const repos = await githubRunner.getRepoList();

        // also check that we removed the private one and did not need enrichRepos
        expect(enrichSpy.notCalled).to.be.true;
        expect(repos).to.deep.equal([
            {
                name: 'repo1',
                owner: 'org1',
                private: true,
            },
        ]);
    });

    it('removes skipped repos', async () => {
        const sourceInfo = sourceInfoPrivate;
        githubApiManager = new GithubApiManager(sourceInfoPrivate);

        stub(githubApiManager, 'getUserRepos').resolves([
            {
                name: 'repo1',
                owner: { login: 'org1' },
                private: true,
            },
            {
                name: 'repo2',
                owner: { login: 'org1' },
                private: true,
            },
        ]);

        const flags = {
            ...getDefaultFlags(commonFlags),
            'skip-repos': 'org1/repo2',
        };

        const githubRunner = new GithubRunner(sourceInfo, flags, githubApiManager);

        const repos = await githubRunner.getRepoList();

        expect(repos).to.deep.equal([
            {
                name: 'repo1',
                owner: 'org1',
                private: true,
            },
        ]);
    });

    it('combines orgs and repos and skipped repos', async () => {
        const sourceInfo = sourceInfoPrivate;
        githubApiManager = new GithubApiManager(sourceInfoPrivate);

        stub(githubApiManager, 'getOrgRepos').resolves([
            {
                name: 'repo1',
                owner: { login: 'org1' },
                private: false,
            },
            {
                name: 'repo2',
                owner: { login: 'org1' },
                private: true,
            },
        ]);

        stub(githubApiManager, 'enrichRepo')
            .withArgs({ owner: 'org2', name: 'repo1' })
            .callsFake(async (r: Repo): Promise<void> => {
                r.private = true;
            });

        const flags = {
            ...getDefaultFlags(commonFlags),
            orgs: 'org1',
            repos: 'org2/repo1',
            'skip-repos': 'org1/repo2',
        };

        const githubRunner = new GithubRunner(sourceInfo, flags, githubApiManager);

        const repos = await githubRunner.getRepoList();

        // also test that we remove the public repo, and enrich the --repo repo to see that it's private
        expect(repos).to.deep.equal([
            {
                name: 'repo1',
                owner: 'org2',
                private: true,
            },
        ]);
    });
});
