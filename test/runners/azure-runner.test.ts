import { expect } from 'chai';
import { AzureCommit, AzureProjectsResponse, AzureRepoResponse } from '../../src/vcs/azure/azure-types';
import { AzureRunner } from '../../src/vcs/azure/azure-runner';
import { ContributorMap, Repo } from '../../src/common/types';
import { AzureApiManager } from '../../src/vcs/azure/azure-api-manager';
import AzureDevOps from '../../src/commands/azuredevops';
import { stub, restore, spy } from 'sinon';
import { getDefaultFlags } from '../helpers/test-utils';
import { commonFlags } from '../../src/common/flags';
import * as utils from '../../src/common/utils';
import { EOL } from 'node:os';
import { CLIError } from '@oclif/errors';

const sourceInfoPublic = AzureDevOps.getSourceInfo('', true);
const sourceInfoPrivate = AzureDevOps.getSourceInfo('', false);

// these tests cover most of the vcs-runner functionality, so for now we will not repeat them for all VCSes
// except for where there are differences (bitbucket and ADO)

describe('azure required arguments', () => {
    it('throws an error if no orgs, projects, or repos are specified', () => {
        expect(() => AzureDevOps.checkRequiredParams({})).to.throw(CLIError);
    });

    it('does not throw an error if orgs, projects, or repos are specified', () => {
        expect(() => AzureDevOps.checkRequiredParams({ orgs: '1' })).to.not.throw(CLIError);
        expect(() => AzureDevOps.checkRequiredParams({ projects: '1' })).to.not.throw(CLIError);
        expect(() => AzureDevOps.checkRequiredParams({ repos: '1' })).to.not.throw(CLIError);
        expect(() => AzureDevOps.checkRequiredParams({ 'repo-file': '1' })).to.not.throw(CLIError);
    });
});

describe('azure runner repo conversion', () => {
    it('converts the repo response into generic repos', () => {
        const repos: AzureRepoResponse[] = [
            {
                id: '1',
                owner: 'org1/project1',
                name: 'repo1',
                project: { visibility: 'private' },
            },
            {
                id: '2',
                owner: 'org1/project2',
                name: 'repo2',
                project: { visibility: 'private' },
            },
            {
                id: '3',
                owner: 'org2/project1',
                name: 'repo3',
                project: { visibility: 'public' },
            },
        ];

        expect(new AzureRunner(null!, null!, null!).convertRepos(repos))
            .to.have.length(3)
            .and.to.have.deep.members([
                {
                    name: 'repo1',
                    owner: 'org1/project1',
                    private: true,
                },
                {
                    name: 'repo2',
                    owner: 'org1/project2',
                    private: true,
                },
                {
                    name: 'repo3',
                    owner: 'org2/project1',
                    private: false,
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
        const commits: AzureCommit[][] = [
            [
                {
                    author: {
                        name: 'user1',
                        email: 'user1@email.com',
                        date: '2022-12-27T23:16:02Z',
                    },
                },
                {
                    author: {
                        name: 'user1',
                        email: 'user2@email.com',
                        date: '2022-12-26T23:16:02Z',
                    },
                },
                {
                    author: {
                        name: 'user1',
                        email: 'user1@email.com',
                        date: '2022-12-25T23:16:02Z',
                    },
                },
                {
                    author: {
                        name: 'user1',
                        email: 'user1@noreply.com',
                        date: '2022-12-25T23:16:02Z',
                    },
                },
                {
                    author: {
                        name: 'user1',
                        email: 'user1@no-reply.com',
                        date: '2022-12-25T23:16:02Z',
                    },
                },
            ],
            [
                {
                    author: {
                        name: 'user3',
                        email: 'user3@email.com',
                        date: '2022-12-27T23:16:02Z',
                    },
                },
                {
                    author: {
                        name: 'user1',
                        email: 'user1@email.com',
                        date: '2022-12-26T23:16:02Z',
                    },
                },
                {
                    author: {
                        name: 'user2',
                        email: 'user2@email.com',
                        date: '2022-12-25T23:16:02Z',
                    },
                },
            ],
        ];

        const runner = new AzureRunner(null!, null!, null!);

        for (const [i, repo] of repos.entries()) {
            runner.aggregateCommitContributors(repo, commits[i]);
        }

        expect(runner.contributorsByEmail.size).to.equal(5);
        expect(runner.contributorsByEmail.get('user1@email.com')?.lastCommitDate).to.equal(commits[0][0].author.date);
        expect(runner.contributorsByEmail.get('user2@email.com')?.lastCommitDate).to.equal(commits[0][1].author.date);
        expect(runner.contributorsByEmail.get('user3@email.com')?.lastCommitDate).to.equal(commits[1][0].author.date);

        const repo1 = runner.contributorsByRepo.get('org1/repo1') as ContributorMap;
        expect(repo1.size).to.equal(4);
        expect(repo1.get('user1@email.com')?.lastCommitDate).to.equal(commits[0][0].author.date);
        expect(repo1.get('user2@email.com')?.lastCommitDate).to.equal(commits[0][1].author.date);

        const repo2 = runner.contributorsByRepo.get('org2/repo2') as ContributorMap;
        expect(repo2.size).to.equal(3);
        expect(repo2.get('user1@email.com')?.lastCommitDate).to.equal(commits[1][1].author.date);
        expect(repo2.get('user2@email.com')?.lastCommitDate).to.equal(commits[1][2].author.date);
        expect(repo2.get('user3@email.com')?.lastCommitDate).to.equal(commits[1][0].author.date);
    });
});

describe('azure repo param validation', () => {
    let apiManager: AzureApiManager;

    afterEach(() => {
        restore();
    });

    it('logs a warning if --repos and --skip-repos are both used', async () => {
        const sourceInfo = sourceInfoPublic;
        apiManager = new AzureApiManager(sourceInfo);

        const loggerSpy = spy();
        utils.LOGGER.warn = loggerSpy;

        const flags = {
            ...getDefaultFlags(commonFlags),
            repos: 'org/project/repo',
            'repo-file': 'file1',
        };

        const runner = new AzureRunner(sourceInfo, flags, apiManager);

        await runner.getRepoList();

        expect(
            loggerSpy.calledOnceWith('You specified both "--repos" and "--repo-file". "--repo-file" will be ignored.')
        ).to.be.true;
    });

    it('logs a warning if --repo-file and --skip-repo-file are both used', async () => {
        const sourceInfo = sourceInfoPublic; // using public will skip the call to get repo details
        apiManager = new AzureApiManager(sourceInfo);

        const loggerSpy = spy();
        utils.LOGGER.warn = loggerSpy;

        const flags = {
            ...getDefaultFlags(commonFlags),
            repos: 'org/project/repo',
            'skip-repos': 'org/project/repo',
            'skip-repo-file': 'file1',
        };

        const runner = new AzureRunner(sourceInfo, flags, apiManager);

        await runner.getRepoList();

        expect(
            loggerSpy.calledOnceWith(
                'You specified both "--skip-repos" and "--skip-repo-file". "--skip-repo-file" will be ignored.'
            )
        ).to.be.true;
    });
});

describe('azure get repo list', () => {
    let apiManager: AzureApiManager;

    afterEach(() => {
        restore();
    });

    it('converts projects to repos with include-public', async () => {
        const sourceInfo = sourceInfoPublic;
        apiManager = new AzureApiManager(sourceInfo);
        stub(apiManager, 'getProjectRepos')
            .withArgs({ owner: 'org1', name: 'project1' } as AzureProjectsResponse)
            .resolves([
                {
                    id: '',
                    name: 'repo1',
                    owner: 'org1/project1',
                    project: { visibility: 'private' },
                },
                {
                    id: '',
                    name: 'repo2',
                    owner: 'org1/project1',
                    project: { visibility: 'private' },
                },
            ])
            .withArgs({ owner: 'org1', name: 'project2' } as AzureProjectsResponse)
            .resolves([
                {
                    id: '',
                    name: 'repo1',
                    owner: 'org1/project2',
                    project: { visibility: 'public' },
                },
                {
                    id: '',
                    name: 'repo2',
                    owner: 'org1/project2',
                    project: { visibility: 'public' },
                },
            ])
            .withArgs({ owner: 'org2', name: 'project1' } as AzureProjectsResponse)
            .resolves([
                {
                    id: '',
                    name: 'repo1',
                    owner: 'org2/project1',
                    project: { visibility: 'private' },
                },
            ]);

        const flags = {
            ...getDefaultFlags(commonFlags),
            projects: 'org1/project1,org1/project2,org2/project1',
        };

        const runner = new AzureRunner(sourceInfo, flags, apiManager);

        const repos = await runner.getRepoList();

        expect(repos).to.deep.equal([
            {
                name: 'repo1',
                owner: 'org1/project1',
                private: true,
            },
            {
                name: 'repo2',
                owner: 'org1/project1',
                private: true,
            },
            {
                name: 'repo1',
                owner: 'org1/project2',
                private: false,
            },
            {
                name: 'repo2',
                owner: 'org1/project2',
                private: false,
            },
            {
                name: 'repo1',
                owner: 'org2/project1',
                private: true,
            },
        ]);
    });

    it('converts projects to repos without include-public', async () => {
        const sourceInfo = sourceInfoPrivate;
        apiManager = new AzureApiManager(sourceInfo);
        stub(apiManager, 'getProjectRepos')
            .withArgs({ owner: 'org1', name: 'project1' } as AzureProjectsResponse)
            .resolves([
                {
                    id: '',
                    name: 'repo1',
                    owner: 'org1/project1',
                    project: { visibility: 'private' },
                },
                {
                    id: '',
                    name: 'repo2',
                    owner: 'org1/project1',
                    project: { visibility: 'private' },
                },
            ])
            .withArgs({ owner: 'org1', name: 'project2' } as AzureProjectsResponse)
            .resolves([
                {
                    id: '',
                    name: 'repo1',
                    owner: 'org1/project2',
                    project: { visibility: 'public' },
                },
                {
                    id: '',
                    name: 'repo2',
                    owner: 'org1/project2',
                    project: { visibility: 'public' },
                },
            ])
            .withArgs({ owner: 'org2', name: 'project1' } as AzureProjectsResponse)
            .resolves([
                {
                    id: '',
                    name: 'repo1',
                    owner: 'org2/project1',
                    project: { visibility: 'private' },
                },
            ]);

        const flags = {
            ...getDefaultFlags(commonFlags),
            projects: 'org1/project1,org1/project2,org2/project1',
        };

        const runner = new AzureRunner(sourceInfo, flags, apiManager);

        const repos = await runner.getRepoList();

        expect(repos).to.deep.equal([
            {
                name: 'repo1',
                owner: 'org1/project1',
                private: true,
            },
            {
                name: 'repo2',
                owner: 'org1/project1',
                private: true,
            },
            {
                name: 'repo1',
                owner: 'org2/project1',
                private: true,
            },
        ]);
    });

    it('converts azure orgs to repos with include-public', async () => {
        const sourceInfo = sourceInfoPublic;
        apiManager = new AzureApiManager(sourceInfo);

        stub(apiManager, 'getOrgProjects')
            .withArgs('org1')
            .resolves([
                {
                    id: '1',
                    owner: 'org1',
                    name: 'project1',
                    visibility: 'private',
                },
                {
                    id: '2',
                    owner: 'org1',
                    name: 'project2',
                    visibility: 'public',
                },
            ])
            .withArgs('org2')
            .resolves([
                {
                    id: '3',
                    owner: 'org2',
                    name: 'project1',
                    visibility: 'private',
                },
            ]);

        stub(apiManager, 'getProjectRepos')
            .withArgs({ id: '1', owner: 'org1', name: 'project1', visibility: 'private' })
            .resolves([
                {
                    id: '',
                    name: 'repo1',
                    owner: 'org1/project1',
                    project: { visibility: 'private' },
                },
                {
                    id: '',
                    name: 'repo2',
                    owner: 'org1/project1',
                    project: { visibility: 'private' },
                },
            ])
            .withArgs({ id: '2', owner: 'org1', name: 'project2', visibility: 'public' })
            .resolves([
                {
                    id: '',
                    name: 'repo1',
                    owner: 'org1/project2',
                    project: { visibility: 'public' },
                },
                {
                    id: '',
                    name: 'repo2',
                    owner: 'org1/project2',
                    project: { visibility: 'public' },
                },
            ])
            .withArgs({ id: '3', owner: 'org2', name: 'project1', visibility: 'private' })
            .resolves([
                {
                    id: '',
                    name: 'repo1',
                    owner: 'org2/project1',
                    project: { visibility: 'private' },
                },
            ]);

        const flags = {
            ...getDefaultFlags(commonFlags),
            orgs: 'org1,org2',
        };

        const runner = new AzureRunner(sourceInfo, flags, apiManager);

        const repos = await runner.getRepoList();

        expect(repos).to.deep.equal([
            {
                name: 'repo1',
                owner: 'org1/project1',
                private: true,
            },
            {
                name: 'repo2',
                owner: 'org1/project1',
                private: true,
            },
            {
                name: 'repo1',
                owner: 'org1/project2',
                private: false,
            },
            {
                name: 'repo2',
                owner: 'org1/project2',
                private: false,
            },
            {
                name: 'repo1',
                owner: 'org2/project1',
                private: true,
            },
        ]);
    });

    it('converts projects to repos without include-public', async () => {
        const sourceInfo = sourceInfoPrivate;
        apiManager = new AzureApiManager(sourceInfo);
        stub(apiManager, 'getProjectRepos')
            .withArgs({ owner: 'org1', name: 'project1' } as AzureProjectsResponse)
            .resolves([
                {
                    id: '',
                    name: 'repo1',
                    owner: 'org1/project1',
                    project: { visibility: 'private' },
                },
                {
                    id: '',
                    name: 'repo2',
                    owner: 'org1/project1',
                    project: { visibility: 'private' },
                },
            ])
            .withArgs({ owner: 'org1', name: 'project2' } as AzureProjectsResponse)
            .resolves([
                {
                    id: '',
                    name: 'repo1',
                    owner: 'org1/project2',
                    project: { visibility: 'public' },
                },
                {
                    id: '',
                    name: 'repo2',
                    owner: 'org1/project2',
                    project: { visibility: 'public' },
                },
            ])
            .withArgs({ owner: 'org2', name: 'project1' } as AzureProjectsResponse)
            .resolves([
                {
                    id: '',
                    name: 'repo1',
                    owner: 'org2/project1',
                    project: { visibility: 'private' },
                },
            ]);

        const flags = {
            ...getDefaultFlags(commonFlags),
            projects: 'org1/project1,org1/project2,org2/project1',
        };

        const runner = new AzureRunner(sourceInfo, flags, apiManager);

        const repos = await runner.getRepoList();

        expect(repos).to.deep.equal([
            {
                name: 'repo1',
                owner: 'org1/project1',
                private: true,
            },
            {
                name: 'repo2',
                owner: 'org1/project1',
                private: true,
            },
            {
                name: 'repo1',
                owner: 'org2/project1',
                private: true,
            },
        ]);
    });

    it('converts azure orgs to repos without include-public', async () => {
        const sourceInfo = sourceInfoPrivate;
        apiManager = new AzureApiManager(sourceInfo);

        stub(apiManager, 'getOrgProjects')
            .withArgs('org1')
            .resolves([
                {
                    id: '1',
                    owner: 'org1',
                    name: 'project1',
                    visibility: 'private',
                },
                {
                    id: '2',
                    owner: 'org1',
                    name: 'project2',
                    visibility: 'public',
                },
            ])
            .withArgs('org2')
            .resolves([
                {
                    id: '3',
                    owner: 'org2',
                    name: 'project1',
                    visibility: 'private',
                },
            ]);

        stub(apiManager, 'getProjectRepos')
            .withArgs({ id: '1', owner: 'org1', name: 'project1', visibility: 'private' })
            .resolves([
                {
                    id: '',
                    name: 'repo1',
                    owner: 'org1/project1',
                    project: { visibility: 'private' },
                },
                {
                    id: '',
                    name: 'repo2',
                    owner: 'org1/project1',
                    project: { visibility: 'private' },
                },
            ])
            .withArgs({ id: '2', owner: 'org1', name: 'project2', visibility: 'public' })
            .resolves([
                {
                    id: '',
                    name: 'repo1',
                    owner: 'org1/project2',
                    project: { visibility: 'public' },
                },
                {
                    id: '',
                    name: 'repo2',
                    owner: 'org1/project2',
                    project: { visibility: 'public' },
                },
            ])
            .withArgs({ id: '3', owner: 'org2', name: 'project1', visibility: 'private' })
            .resolves([
                {
                    id: '',
                    name: 'repo1',
                    owner: 'org2/project1',
                    project: { visibility: 'private' },
                },
            ]);

        const flags = {
            ...getDefaultFlags(commonFlags),
            orgs: 'org1,org2',
        };

        const runner = new AzureRunner(sourceInfo, flags, apiManager);

        const repos = await runner.getRepoList();

        expect(repos).to.deep.equal([
            {
                name: 'repo1',
                owner: 'org1/project1',
                private: true,
            },
            {
                name: 'repo2',
                owner: 'org1/project1',
                private: true,
            },
            {
                name: 'repo1',
                owner: 'org2/project1',
                private: true,
            },
        ]);
    });

    it('gets repo metadata without --include-public', async () => {
        const sourceInfo = sourceInfoPrivate;
        apiManager = new AzureApiManager(sourceInfo);

        const repo: Repo = {
            owner: 'org/project',
            name: 'repo',
        };

        stub(apiManager, 'enrichRepo')
            .withArgs(repo)
            .callsFake(async (r: Repo): Promise<void> => {
                r.private = true;
            });

        const flags = {
            ...getDefaultFlags(commonFlags),
            repos: 'org/project/repo',
        };

        const runner = new AzureRunner(sourceInfo, flags, apiManager);

        const repos = await runner.getRepoList();

        expect(repos).to.deep.equal([
            {
                name: 'repo',
                owner: 'org/project',
                private: true,
            },
        ]);
    });

    it('does not get repo metadata with --include-public', async () => {
        const sourceInfo = sourceInfoPublic;
        apiManager = new AzureApiManager(sourceInfo);

        const enrichSpy = spy(apiManager, 'enrichRepo');

        const flags = {
            ...getDefaultFlags(commonFlags),
            repos: 'org/project/repo',
        };

        const runner = new AzureRunner(sourceInfo, flags, apiManager);

        const repos = await runner.getRepoList();

        expect(enrichSpy.notCalled).to.be.true;
        expect(repos).to.deep.equal([
            {
                name: 'repo',
                owner: 'org/project',
            },
        ]);
    });

    it('reads repos from a file', async () => {
        const sourceInfo = sourceInfoPublic;
        apiManager = new AzureApiManager(sourceInfo);

        stub(utils, 'getFileContents').callsFake(
            (_: string): string => `org1/project1/repo1${EOL}org1/project1/repo2${EOL}`
        );

        const flags = {
            ...getDefaultFlags(commonFlags),
            'repo-file': 'file',
        };

        const runner = new AzureRunner(sourceInfo, flags, apiManager);

        const repos = await runner.getRepoList();

        expect(repos).to.deep.equal([
            {
                name: 'repo1',
                owner: 'org1/project1',
            },
            {
                name: 'repo2',
                owner: 'org1/project1',
            },
        ]);
    });

    it('handles a complex combination of orgs, projects, and repos', async () => {
        const sourceInfo = sourceInfoPrivate;
        apiManager = new AzureApiManager(sourceInfo);

        // we have every skip combination here:
        // - skip a project within an org (org2/project1)
        // - skip a repo within an org (org1/project1/repo1)
        // - skip a repo within a project (org3/project1/repo1)
        // - skip a repo that was specified directly (org4/project3/repo1)
        // - skip skip a public project that came from an org (org2/project2)
        // - skip a public project that came from a --project (org5/project1)
        // - skip a public repo that came from a --repo (org4/project2/repo1)
        // - skip orgs, projects, and repos that were not specified

        // this test should also work without changes when we implement
        // "Filter azure repo visibility at the project level"
        // https://github.com/bridgecrewio/redshirts/issues/22

        const flags = {
            ...getDefaultFlags(commonFlags),
            orgs: 'org1,org2',
            projects: 'org3/project1,org5/project1',
            repos: 'org3/project2/repo1,org4/project1/repo1,org4/project2/repo1,org4/project3/repo1',
            'skip-projects': 'org2/project1',
            'skip-repos': 'org1/project1/repo1,org3/project1/repo1,org4/project3/repo1',
        };

        type TestOrg = {
            [org: string]: {
                [project: string]: {
                    visibility: 'public' | 'private';
                    repos: string[];
                };
            };
        };

        const orgsProjectsRepos: TestOrg = {
            org1: {
                project1: {
                    visibility: 'private',
                    repos: [
                        'repo1', // skip due to skip repos
                        'repo2',
                    ],
                },
                project2: {
                    // skip due to public
                    visibility: 'public',
                    repos: ['repo1', 'repo2'],
                },
            },
            org2: {
                project1: {
                    // skip due to skip project
                    visibility: 'private',
                    repos: ['repo1', 'repo2'],
                },
                project2: {
                    visibility: 'public', // skip due to public
                    repos: ['repo1', 'repo2'],
                },
            },
            org3: {
                project1: {
                    visibility: 'private',
                    repos: [
                        'repo1', // skip due to skip repos
                        'repo2',
                    ],
                },
                project2: {
                    visibility: 'private',
                    repos: [
                        'repo1',
                        'repo2', // skip due to not specified
                    ],
                },
                project3: {
                    // skip due to not specified
                    visibility: 'private',
                    repos: ['repo1', 'repo2'],
                },
            },
            org4: {
                project1: {
                    visibility: 'public',
                    repos: [
                        'repo1', // skip due to public
                        'repo2', // skip due to not specified (and public)
                    ],
                },
                project2: {
                    visibility: 'private',
                    repos: [
                        'repo1',
                        'repo2', // skip due to not specified (and public)
                    ],
                },
                project3: {
                    visibility: 'private',
                    repos: [
                        'repo1', // skip due to skip repos
                    ],
                },
            },
            org5: {
                project1: {
                    // skip due to public
                    visibility: 'public',
                    repos: ['repo1'],
                },
            },
            org6: {
                // skip due to not specified
                project1: {
                    visibility: 'private',
                    repos: ['repo1'],
                },
            },
        };

        stub(apiManager, 'enrichRepo').callsFake(async (r: Repo): Promise<void> => {
            const [org, project] = r.owner.split('/');
            r.private = orgsProjectsRepos[org][project].visibility === 'private';
        });

        stub(apiManager, 'getProjectRepos').callsFake(
            async (p: AzureProjectsResponse): Promise<AzureRepoResponse[]> => {
                const { owner, name } = p;
                const repoOwner = `${owner}/${name}`;
                const testProject = orgsProjectsRepos[owner][name];
                return testProject.repos.map((repoName: string) => {
                    return {
                        id: repoName, // not used
                        name: repoName,
                        owner: repoOwner,
                        project: { visibility: testProject.visibility },
                    };
                });
            }
        );

        stub(apiManager, 'getOrgProjects').callsFake(async (o: string): Promise<AzureProjectsResponse[]> => {
            const testOrg = orgsProjectsRepos[o];
            return Object.keys(testOrg).map((p: string) => {
                return {
                    id: p, // not used
                    owner: o,
                    name: p,
                    visibility: testOrg[p].visibility,
                };
            });
        });

        const runner = new AzureRunner(sourceInfo, flags, apiManager);

        const repos = await runner.getRepoList();

        expect(repos).to.deep.equal([
            {
                name: 'repo2',
                owner: 'org1/project1',
                private: true,
            },
            {
                name: 'repo2',
                owner: 'org3/project1',
                private: true,
            },
            {
                name: 'repo1',
                owner: 'org3/project2',
                private: true,
            },
            {
                name: 'repo1',
                owner: 'org4/project2',
                private: true,
            },
        ]);
    });
});
