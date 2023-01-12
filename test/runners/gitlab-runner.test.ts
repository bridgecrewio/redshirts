/* eslint-disable camelcase */
import { expect } from 'chai';
import { GitlabCommit, GitlabRepoResponse } from '../../src/vcs/gitlab/gitlab-types';
import { GitlabRunner } from '../../src/vcs/gitlab/gitlab-runner';
import { ContributorMap, Repo } from '../../src/common/types';
import { GitlabApiManager } from '../../src/vcs/gitlab/gitlab-api-manager';
import Gitlab from '../../src/commands/gitlab';
import { stub, restore, spy } from 'sinon';
import { getDefaultFlags } from '../helpers/test-utils';
import { commonFlags } from '../../src/common/flags';
import * as utils from '../../src/common/utils';
import { EOL } from 'node:os';

const sourceInfoPublic = Gitlab.getSourceInfo('', true);
const sourceInfoPrivate = Gitlab.getSourceInfo('', false);

// these tests cover most of the vcs-runner functionality, so for now we will not repeat them for all VCSes
// except for where there are differences (bitbucket and ADO)

describe('gitlab runner repo conversion', () => {
    it('converts the repo response into generic repos', () => {
        const repos: GitlabRepoResponse[] = [
            {
                name: 'repo1',
                path: 'repo1',
                namespace: { full_path: 'group1' },
                visibility: 'private',
            },
            {
                name: 'repo2',
                path: 'repo2',
                namespace: { full_path: 'group1/subgroup1' },
                visibility: 'private',
            },
            {
                name: 'repo3',
                path: 'repo3',
                namespace: { full_path: 'group1/subgroup1/anothersubgroup' },
                visibility: 'private',
            },
            {
                name: 'repo4',
                path: 'repo4',
                namespace: { full_path: 'group1' },
                visibility: 'public',
            },
        ];

        expect(new GitlabRunner(null!, null!, null!).convertRepos(repos))
            .to.have.length(4)
            .and.to.have.deep.members([
                {
                    name: 'repo1',
                    owner: 'group1',
                    private: true,
                },
                {
                    name: 'repo2',
                    owner: 'group1/subgroup1',
                    private: true,
                },
                {
                    name: 'repo3',
                    owner: 'group1/subgroup1/anothersubgroup',
                    private: true,
                },
                {
                    name: 'repo4',
                    owner: 'group1',
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
        const commits: GitlabCommit[][] = [
            [
                {
                    author_name: 'user1',
                    author_email: 'user1@email.com',
                    authored_date: '2022-12-28T12:36:16.351Z',
                },
                {
                    author_name: 'user2',
                    author_email: 'user2@email.com',
                    authored_date: '2022-12-27T12:36:16.351Z',
                },
                {
                    author_name: 'user1',
                    author_email: 'user1@email.com',
                    authored_date: '2022-12-26T12:36:16.351Z',
                },
                {
                    author_name: 'user1',
                    author_email: 'user1@no-reply.com',
                    authored_date: '2022-12-25T12:36:16.351Z',
                },
                {
                    author_name: 'user1',
                    author_email: 'user1@noreply.com',
                    authored_date: '2022-12-24T12:36:16.351Z',
                },
            ],
            [
                {
                    author_name: 'user3',
                    author_email: 'user3@email.com',
                    authored_date: '2022-12-28T12:36:16.351Z',
                },
                {
                    author_name: 'user1',
                    author_email: 'user1@email.com',
                    authored_date: '2022-12-27T12:36:16.351Z',
                },
                {
                    author_name: 'user2',
                    author_email: 'user2@email.com',
                    authored_date: '2022-12-26T12:36:16.351Z',
                },
            ],
        ];

        const runner = new GitlabRunner(null!, null!, null!);

        for (const [i, repo] of repos.entries()) {
            runner.aggregateCommitContributors(repo, commits[i]);
        }

        expect(runner.contributorsByEmail.size).to.equal(3);
        expect(runner.contributorsByEmail.get('user1@email.com')?.lastCommitDate).to.equal(commits[0][0].authored_date);
        expect(runner.contributorsByEmail.get('user2@email.com')?.lastCommitDate).to.equal(commits[0][1].authored_date);
        expect(runner.contributorsByEmail.get('user3@email.com')?.lastCommitDate).to.equal(commits[1][0].authored_date);

        const repo1 = runner.contributorsByRepo.get('org1/repo1') as ContributorMap;
        expect(repo1.size).to.equal(2);
        expect(repo1.get('user1@email.com')?.lastCommitDate).to.equal(commits[0][0].authored_date);
        expect(repo1.get('user2@email.com')?.lastCommitDate).to.equal(commits[0][1].authored_date);

        const repo2 = runner.contributorsByRepo.get('org2/repo2') as ContributorMap;
        expect(repo2.size).to.equal(3);
        expect(repo2.get('user1@email.com')?.lastCommitDate).to.equal(commits[1][1].authored_date);
        expect(repo2.get('user2@email.com')?.lastCommitDate).to.equal(commits[1][2].authored_date);
        expect(repo2.get('user3@email.com')?.lastCommitDate).to.equal(commits[1][0].authored_date);
    });
});

describe('github repo param validation', () => {
    let apiManager: GitlabApiManager;

    afterEach(() => {
        restore();
    });

    it('logs a warning if --repos and --skip-repos are both used', async () => {
        const sourceInfo = sourceInfoPublic;
        apiManager = new GitlabApiManager(sourceInfo);

        const loggerSpy = spy();
        utils.LOGGER.warn = loggerSpy;

        const flags = {
            ...getDefaultFlags(commonFlags),
            repos: 'org/repo',
            'repo-file': 'file1',
        };

        const runner = new GitlabRunner(sourceInfo, flags, apiManager);

        await runner.getRepoList();

        expect(
            loggerSpy.calledOnceWith('You specified both "--repos" and "--repo-file". "--repo-file" will be ignored.')
        ).to.be.true;
    });

    it('logs a warning if --repo-file and --skip-repo-file are both used', async () => {
        const sourceInfo = sourceInfoPublic; // using public will skip the call to get repo details
        apiManager = new GitlabApiManager(sourceInfo);

        const loggerSpy = spy();
        utils.LOGGER.warn = loggerSpy;

        const flags = {
            ...getDefaultFlags(commonFlags),
            repos: 'org/repo',
            'skip-repos': 'org/repo',
            'skip-repo-file': 'file1',
        };

        const runner = new GitlabRunner(sourceInfo, flags, apiManager);

        await runner.getRepoList();

        expect(
            loggerSpy.calledOnceWith(
                'You specified both "--skip-repos" and "--skip-repo-file". "--skip-repo-file" will be ignored.'
            )
        ).to.be.true;
    });
});

// describe('github and generic VCS get repo list', () => {
//     let apiManager: GitlabApiManager;

//     afterEach(() => {
//         restore();
//     });

//     it('converts orgs to repos with include-public', async () => {
//         const sourceInfo = sourceInfoPublic;
//         apiManager = new GitlabApiManager(sourceInfo);
//         stub(apiManager, 'getOrgRepos')
//             .withArgs('org1')
//             .resolves([
//                 {
//                     name: 'repo1',
//                     owner: { login: 'org1' },
//                     private: true,
//                 },
//             ])
//             .withArgs('org2')
//             .resolves([
//                 {
//                     name: 'repo1',
//                     owner: { login: 'org2' },
//                     private: true,
//                 },
//                 {
//                     name: 'repo2',
//                     owner: { login: 'org2' },
//                     private: false,
//                 },
//             ]);

//         const flags = {
//             ...getDefaultFlags(commonFlags),
//             orgs: 'org1,org2',
//         };

//         const runner = new GitlabRunner(sourceInfo, flags, apiManager);

//         const repos = await runner.getRepoList();

//         expect(repos).to.deep.equal([
//             {
//                 name: 'repo1',
//                 owner: 'org1',
//                 private: true,
//             },
//             {
//                 name: 'repo1',
//                 owner: 'org2',
//                 private: true,
//             },
//             {
//                 name: 'repo2',
//                 owner: 'org2',
//                 private: false,
//             },
//         ]);
//     });

//     it('converts orgs to repos without include-public', async () => {
//         const sourceInfo = sourceInfoPrivate;
//         apiManager = new GitlabApiManager(sourceInfo);
//         stub(apiManager, 'getOrgRepos')
//             .withArgs('org1')
//             .resolves([
//                 {
//                     name: 'repo1',
//                     owner: { login: 'org1' },
//                     private: true,
//                 },
//             ])
//             .withArgs('org2')
//             .resolves([
//                 {
//                     name: 'repo1',
//                     owner: { login: 'org2' },
//                     private: true,
//                 },
//                 {
//                     name: 'repo2',
//                     owner: { login: 'org2' },
//                     private: false,
//                 },
//             ]);

//         const flags = {
//             ...getDefaultFlags(commonFlags),
//             orgs: 'org1,org2',
//         };

//         const runner = new GitlabRunner(sourceInfo, flags, apiManager);

//         const repos = await runner.getRepoList();

//         expect(repos).to.deep.equal([
//             {
//                 name: 'repo1',
//                 owner: 'org1',
//                 private: true,
//             },
//             {
//                 name: 'repo1',
//                 owner: 'org2',
//                 private: true,
//             },
//         ]);
//     });

//     it('gets repo metadata without --include-public', async () => {
//         const sourceInfo = sourceInfoPrivate;
//         apiManager = new GitlabApiManager(sourceInfo);

//         const repo: Repo = {
//             owner: 'org',
//             name: 'repo',
//         };

//         stub(apiManager, 'enrichRepo')
//             .withArgs(repo)
//             .callsFake(async (r: Repo): Promise<void> => {
//                 r.private = true;
//             });

//         const flags = {
//             ...getDefaultFlags(commonFlags),
//             repos: 'org/repo',
//         };

//         const runner = new GitlabRunner(sourceInfo, flags, apiManager);

//         const repos = await runner.getRepoList();

//         expect(repos).to.deep.equal([
//             {
//                 name: 'repo',
//                 owner: 'org',
//                 private: true,
//             },
//         ]);
//     });

//     it('does not get repo metadata with --include-public', async () => {
//         const sourceInfo = sourceInfoPublic;
//         apiManager = new GitlabApiManager(sourceInfo);

//         const enrichSpy = spy(apiManager, 'enrichRepo');

//         const flags = {
//             ...getDefaultFlags(commonFlags),
//             repos: 'org/repo',
//         };

//         const runner = new GitlabRunner(sourceInfo, flags, apiManager);

//         const repos = await runner.getRepoList();

//         expect(enrichSpy.notCalled).to.be.true;
//         expect(repos).to.deep.equal([
//             {
//                 name: 'repo',
//                 owner: 'org',
//             },
//         ]);
//     });

//     it('reads repos from a file', async () => {
//         const sourceInfo = sourceInfoPublic;
//         apiManager = new GitlabApiManager(sourceInfo);

//         stub(utils, 'getFileContents').callsFake((_: string): string => `org1/repo1${EOL}org1/repo2${EOL}`);

//         const flags = {
//             ...getDefaultFlags(commonFlags),
//             'repo-file': 'file',
//         };

//         const runner = new GitlabRunner(sourceInfo, flags, apiManager);

//         const repos = await runner.getRepoList();

//         expect(repos).to.deep.equal([
//             {
//                 name: 'repo1',
//                 owner: 'org1',
//             },
//             {
//                 name: 'repo2',
//                 owner: 'org1',
//             },
//         ]);
//     });

//     it('gets user repos when no other repos are specified', async () => {
//         const sourceInfo = sourceInfoPrivate;
//         apiManager = new GitlabApiManager(sourceInfoPrivate);

//         stub(apiManager, 'getUserRepos').resolves([
//             {
//                 name: 'repo1',
//                 owner: { login: 'org1' },
//                 private: true,
//             },
//             {
//                 name: 'repo2',
//                 owner: { login: 'org1' },
//                 private: false,
//             },
//         ]);

//         const enrichSpy = spy(apiManager, 'enrichRepo');

//         const flags = {
//             ...getDefaultFlags(commonFlags),
//         };

//         const runner = new GitlabRunner(sourceInfo, flags, apiManager);

//         const repos = await runner.getRepoList();

//         // also check that we removed the private one and did not need enrichRepos
//         expect(enrichSpy.notCalled).to.be.true;
//         expect(repos).to.deep.equal([
//             {
//                 name: 'repo1',
//                 owner: 'org1',
//                 private: true,
//             },
//         ]);
//     });

//     it('removes skipped repos', async () => {
//         const sourceInfo = sourceInfoPrivate;
//         apiManager = new GitlabApiManager(sourceInfoPrivate);

//         stub(apiManager, 'getUserRepos').resolves([
//             {
//                 name: 'repo1',
//                 owner: { login: 'org1' },
//                 private: true,
//             },
//             {
//                 name: 'repo2',
//                 owner: { login: 'org1' },
//                 private: true,
//             },
//         ]);

//         const flags = {
//             ...getDefaultFlags(commonFlags),
//             'skip-repos': 'org1/repo2',
//         };

//         const runner = new GitlabRunner(sourceInfo, flags, apiManager);

//         const repos = await runner.getRepoList();

//         expect(repos).to.deep.equal([
//             {
//                 name: 'repo1',
//                 owner: 'org1',
//                 private: true,
//             },
//         ]);
//     });

//     it('combines orgs and repos and skipped repos', async () => {
//         const sourceInfo = sourceInfoPrivate;
//         apiManager = new GitlabApiManager(sourceInfoPrivate);

//         stub(apiManager, 'getOrgRepos').resolves([
//             {
//                 name: 'repo1',
//                 owner: { login: 'org1' },
//                 private: false,
//             },
//             {
//                 name: 'repo2',
//                 owner: { login: 'org1' },
//                 private: true,
//             },
//         ]);

//         stub(apiManager, 'enrichRepo')
//             .withArgs({ owner: 'org2', name: 'repo1' })
//             .callsFake(async (r: Repo): Promise<void> => {
//                 r.private = true;
//             });

//         const flags = {
//             ...getDefaultFlags(commonFlags),
//             orgs: 'org1',
//             repos: 'org2/repo1',
//             'skip-repos': 'org1/repo2',
//         };

//         const runner = new GitlabRunner(sourceInfo, flags, apiManager);

//         const repos = await runner.getRepoList();

//         // also test that we remove the public repo, and enrich the --repo repo to see that it's private
//         expect(repos).to.deep.equal([
//             {
//                 name: 'repo1',
//                 owner: 'org2',
//                 private: true,
//             },
//         ]);
//     });
// });
