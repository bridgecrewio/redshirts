import { expect } from 'chai';
import { BitbucketServerApiManager } from '../../src/vcs/bitbucketServer/bitbucket-server-api-manager';
import BitbucketServer from '../../src/commands/bitbucket-server';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { restore } from 'sinon';
import { Repo } from '../../src/common/types';

let apiManager: BitbucketServerApiManager;
const sinceDate = new Date(1672380000000); // 2022-12-30 06:00:00 UTC
let stub: MockAdapter;

beforeEach(() => {
    apiManager = new BitbucketServerApiManager(BitbucketServer.getSourceInfo('', true, ''), 100000);
    stub = new MockAdapter(apiManager.axiosInstance);
});

describe('bitbucket server api rate limiting', () => {
    afterEach(() => {
        restore();
    });
});

describe('bitbucket server helpers', () => {
    it('detects the next page', () => {
        const response: AxiosResponse = {
            data: {},
            status: 0,
            statusText: '',
            headers: {},
            config: {},
        };
        expect(apiManager.hasMorePages(response)).to.not.be.ok; // ok for truthy values
        response.data.nextPageStart = 100;
        expect(apiManager.hasMorePages(response)).to.be.ok;
        response.data.nextPageStart = null;
        expect(apiManager.hasMorePages(response)).to.not.be.ok;
    });

    it('sets the next page config', () => {
        const response: AxiosResponse = {
            data: {
                nextPageStart: 100,
            },
            status: 0,
            statusText: '',
            headers: {},
            config: {},
        };

        const config: AxiosRequestConfig = {
            params: {},
        };
        apiManager.setNextPageConfig(config, response);

        expect(config.params.start).to.equal(100);
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

        expect(apiManager.getDataPage(response)).to.deep.equal([1, 2, 3]);
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

        apiManager.setDataPage(response, [4, 5, 6]);
        expect(apiManager.getDataPage(response)).to.deep.equal([4, 5, 6]);
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

        apiManager.appendDataPage(allPages, response);
        expect(allPages.data.values).to.deep.equal([1, 2, 3, 4, 5, 6]);
    });
});

describe('bitbucket server api queries', () => {
    it('fetches paginated commits and stops when an old commit is found', async () => {
        stub.onGet(`projects/owner/repos/repo/commits`, { params: { limit: 100 } }).replyOnce(200, {
            values: [
                {
                    author: {
                        emailAddress: 'user1@email.com',
                        name: 'user1',
                    },
                    authorTimestamp: new Date(2023, 0, 5).getTime(),
                },
                {
                    author: {
                        emailAddress: 'user2@email.com',
                        name: 'user2',
                    },
                    authorTimestamp: new Date(2023, 0, 4).getTime(),
                },
            ],
            nextPageStart: 2,
        });

        stub.onGet(`projects/owner/repos/repo/commits`, {
            params: {
                limit: 100,
                start: 2,
            },
        }).replyOnce(200, {
            values: [
                {
                    author: {
                        emailAddress: 'user1@email.com',
                        name: 'user1',
                    },
                    authorTimestamp: new Date(2023, 0, 3).getTime(),
                },
                {
                    author: {
                        emailAddress: 'user2@email.com',
                        name: 'user2',
                    },
                    authorTimestamp: new Date(2022, 11, 5).getTime(),
                },
            ],
        });

        const commits = await apiManager.getCommits({ owner: 'owner', name: 'repo', defaultBranch: 'main' }, sinceDate);
        expect(commits).to.have.length(3);
    });

    it('fetches paginated user repos', async () => {
        stub.onGet(`repos`, {
            params: { limit: 100 },
        }).replyOnce(200, {
            values: [
                {
                    slug: 'repo1',
                    public: false,
                    project: {
                        key: 'org1',
                    },
                },
                {
                    slug: 'repo2',
                    public: false,
                    project: {
                        key: 'org1',
                    },
                },
            ],
            nextPageStart: 2,
        });

        stub.onGet(`repos`, {
            params: { limit: 100, start: 2 },
        }).replyOnce(200, {
            values: [
                {
                    slug: 'repo3',
                    public: true,
                    project: {
                        key: 'org1',
                    },
                },
            ],
        });

        const repos = await apiManager.getUserRepos();
        expect(repos).to.have.length(3);
    });

    it('fetches paginated project repos', async () => {
        stub.onGet(`projects/org1/repos`, {
            params: { limit: 100 },
        }).replyOnce(200, {
            values: [
                {
                    slug: 'repo1',
                    public: false,
                    project: {
                        key: 'org1',
                    },
                },
                {
                    slug: 'repo2',
                    public: false,
                    project: {
                        key: 'org1',
                    },
                },
            ],
            nextPageStart: 2,
        });

        stub.onGet(`projects/org1/repos`, {
            params: { limit: 100, start: 2 },
        }).replyOnce(200, {
            values: [
                {
                    slug: 'repo3',
                    public: true,
                    project: {
                        key: 'org1',
                    },
                },
            ],
        });

        const repos = await apiManager.getOrgRepos('org1');
        expect(repos).to.have.length(3);
    });

    it('enriches repos', async () => {
        stub.onGet(`projects/org1/repos/repo1`).replyOnce(200, {
            name: 'repo1',
            slug: 'repo1',
            public: false,
            archived: false,
            project: {
                key: 'org1',
                public: false,
            },
        });

        stub.onGet(`projects/org2/repos/repo2`).replyOnce(200, {
            name: 'repo2',
            slug: 'repo2',
            public: true,
            archived: false,
            project: {
                key: 'org2',
                public: true,
            },
        });

        const repo1: Repo = {
            owner: 'org1',
            name: 'repo1',
        };

        await apiManager.enrichRepo(repo1);
        expect(repo1.private).to.be.true;

        const repo2: Repo = {
            owner: 'org2',
            name: 'repo2',
        };

        await apiManager.enrichRepo(repo2);
        expect(repo2.private).to.be.false;
    });
});
