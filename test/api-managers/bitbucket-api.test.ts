/* eslint-disable camelcase */
import { expect } from 'chai';
import { BitbucketApiManager } from '../../src/vcs/bitbucket/bitbucket-api-manager';
import Bitbucket from '../../src/commands/bitbucket';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { restore } from 'sinon';
import { Repo } from '../../src/common/types';

let bitbucketApiManager: BitbucketApiManager;
const sinceDate = new Date(1672380000000); // 2022-12-30 06:00:00 UTC
let stub: MockAdapter;

beforeEach(() => {
    bitbucketApiManager = new BitbucketApiManager(Bitbucket.getSourceInfo('', true), 100000);
    stub = new MockAdapter(bitbucketApiManager.axiosInstance);
});

describe('bitbucket api rate limiting', () => {
    afterEach(() => {
        restore();
    });
});

describe('bitbucket helpers', () => {
    it('detects the next page', () => {
        const response: AxiosResponse = {
            data: {},
            status: 0,
            statusText: '',
            headers: {},
            config: {},
        };
        expect(bitbucketApiManager.hasMorePages(response)).to.not.be.ok; // ok for truthy values
        response.data.next = 'https://link-to-next';
        expect(bitbucketApiManager.hasMorePages(response)).to.be.ok;
    });

    it('sets the next page config', () => {
        const response: AxiosResponse = {
            data: {
                next: 'https://link-to-next',
            },
            status: 0,
            statusText: '',
            headers: {},
            config: {},
        };

        const config: AxiosRequestConfig = {};
        bitbucketApiManager.setNextPageConfig(config, response);

        expect(config.url).to.equal('https://link-to-next');
    });

    it('extracts data', () => {
        const response: AxiosResponse = {
            data: {
                values: [1, 2, 3],
            },
            status: 0,
            statusText: '',
            headers: {},
            config: {},
        };

        expect(bitbucketApiManager.getDataPage(response)).to.deep.equal([1, 2, 3]);
    });

    it('sets data', () => {
        const response: AxiosResponse = {
            data: {
                values: [1, 2, 3],
            },
            status: 0,
            statusText: '',
            headers: {},
            config: {},
        };

        bitbucketApiManager.setDataPage(response, [4, 5, 6]);
        expect(bitbucketApiManager.getDataPage(response)).to.deep.equal([4, 5, 6]);
    });

    it('appends data', () => {
        const allPages: AxiosResponse = {
            data: {
                values: [1, 2, 3],
            },
            status: 0,
            statusText: '',
            headers: {},
            config: {},
        };

        const response: AxiosResponse = {
            data: {
                values: [4, 5, 6],
            },
            status: 0,
            statusText: '',
            headers: {},
            config: {},
        };

        bitbucketApiManager.appendDataPage(allPages, response);
        expect(allPages.data.values).to.deep.equal([1, 2, 3, 4, 5, 6]);
    });
});

describe('bitbucket api queries', () => {
    it('fetches paginated commits and stops when an old commit is found', async () => {
        stub.onGet(`repositories/owner/repo/commits`).replyOnce(200, {
            values: [
                {
                    author: {
                        raw: 'User 1 <user1@email.com>',
                        user: {
                            account_id: '1234',
                            nickname: 'user1',
                        },
                    },
                    date: '2023-01-05T23:44:52+00:00',
                },
                {
                    author: {
                        raw: 'User 2 <user2@email.com>',
                        user: {
                            account_id: '1234',
                            nickname: 'user2',
                        },
                    },
                    date: '2023-01-04T23:44:52+00:00',
                },
            ],
            next: 'https://api.bitbucket.org/2.0/repositories/mikeurbanski1/terragoat-mu/commits?ctx=1234&page=2',
        });

        stub.onGet(
            `https://api.bitbucket.org/2.0/repositories/mikeurbanski1/terragoat-mu/commits?ctx=1234&page=2`
        ).replyOnce(200, {
            values: [
                {
                    author: {
                        raw: 'User 1 <user1@email.com>',
                        user: {
                            account_id: '1234',
                            nickname: 'user1',
                        },
                    },
                    date: '2023-01-05T23:44:52+00:00',
                },
                {
                    author: {
                        raw: 'User 2 <user2@email.com>',
                        user: {
                            account_id: '1234',
                            nickname: 'user2',
                        },
                    },
                    date: '2022-11-04T23:44:52+00:00', // old commit
                },
            ],
        });

        const commits = await bitbucketApiManager.getCommits(
            { owner: 'owner', name: 'repo', defaultBranch: 'main' },
            sinceDate
        );
        expect(commits).to.have.length(3);
    });

    it('fetches paginated user workspaces', async () => {
        stub.onGet(`user/permissions/repositories`).replyOnce(200, {
            values: [
                {
                    repository: {
                        full_name: 'workspace1/repo1',
                    },
                },
                {
                    repository: {
                        full_name: 'workspace1/repo2',
                    },
                },
            ],
            next: 'user/permissions/repositories/next',
        });

        stub.onGet(`user/permissions/repositories/next`).replyOnce(200, {
            values: [
                {
                    repository: {
                        full_name: 'workspace2/repo1',
                    },
                },
            ],
        });

        stub.onGet(`workspaces`).replyOnce(200, {
            values: [
                {
                    slug: 'workspace2',
                },
                {
                    slug: 'workspace3',
                },
            ],
            next: 'workspaces/next',
        });

        stub.onGet(`workspaces/next`).replyOnce(200, {
            values: [
                {
                    slug: 'workspace4',
                },
            ],
        });

        const workspaces = await bitbucketApiManager.getWorkspaces();
        expect(workspaces).to.have.length(4);
    });

    it('fetches paginated workspace repos', async () => {
        stub.onGet(`repositories/workspace1`).replyOnce(200, {
            values: [
                {
                    full_name: 'workspace1/repo1',
                    is_private: true,
                    mainbranch: {
                        name: 'main',
                    },
                },
                {
                    full_name: 'workspace1/repo2',
                    is_private: true,
                    mainbranch: {
                        name: 'main',
                    },
                },
            ],
            next: 'repositories/workspace1/next',
        });

        stub.onGet(`repositories/workspace1/next`).replyOnce(200, {
            values: [
                {
                    full_name: 'workspace1/repo3',
                    is_private: false,
                    mainbranch: {
                        name: 'master',
                    },
                },
            ],
        });

        const commits = await bitbucketApiManager.getOrgRepos('workspace1');
        expect(commits).to.have.length(3);
    });

    it('enriches repos', async () => {
        stub.onGet(`repositories/org1/repo1`).replyOnce(200, {
            name: 'repo1',
            slug: 'repo1',
            full_name: 'org1/repo1',
            private: true,
            workspace: {
                slug: 'org1',
            },
            is_private: true,
            mainbranch: {
                name: 'master',
            },
        });

        stub.onGet(`repositories/org2/repo2`).replyOnce(200, {
            name: 'repo2',
            slug: 'repo2',
            full_name: 'org2/repo2',
            private: true,
            workspace: {
                slug: 'org2',
            },
            is_private: false,
            mainbranch: {
                name: 'main',
            },
        });

        const repo1: Repo = {
            owner: 'org1',
            name: 'repo1',
        };

        await bitbucketApiManager.enrichRepo(repo1);
        expect(repo1.private).to.be.true;
        expect(repo1.defaultBranch).to.equal('master');

        const repo2: Repo = {
            owner: 'org2',
            name: 'repo2',
        };

        await bitbucketApiManager.enrichRepo(repo2);
        expect(repo2.private).to.be.false;
        expect(repo2.defaultBranch).to.equal('main');
    });
});
