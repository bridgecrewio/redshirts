/* eslint-disable camelcase */
import { expect } from 'chai';
import { GithubApiManager } from '../../src/vcs/github/github-api-manager';
import Github from '../../src/commands/github';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { spy, restore } from 'sinon';
import * as utils from '../../src/common/utils';
import { Repo } from '../../src/common/types';

let githubApiManager: GithubApiManager;
const sinceDate = new Date(1672380000000);
let stub: MockAdapter;

beforeEach(() => {
    githubApiManager = new GithubApiManager(Github.getSourceInfo('', true));
    stub = new MockAdapter(githubApiManager.axiosInstance);
    stub.onGet(githubApiManager.rateLimitEndpoint).reply(
        200,
        {},
        {
            'x-ratelimit-remaining': '10',
            'x-ratelimit-reset': '1672799029',
        }
    );
});

describe('github api rate limiting', () => {
    afterEach(() => {
        restore();
    });

    it('checks the rate limit status', async () => {
        const rateLimit = await githubApiManager.checkRateLimitStatus();
        expect(rateLimit).to.deep.equal({
            remaining: 10,
            reset: new Date(1672799029000),
        });
    });

    it('extracts rate limit from the response', () => {
        const response: AxiosResponse = {
            headers: {},
            data: undefined,
            status: 0,
            statusText: '',
            config: {},
        };
        expect(githubApiManager.getRateLimitStatus(response)).to.be.undefined;

        response.headers = {
            'x-ratelimit-remaining': '5',
            'x-ratelimit-reset': '1672799029',
        };
        expect(githubApiManager.getRateLimitStatus(response)).to.deep.equal({
            remaining: 5,
            reset: new Date(1672799029000),
        });
    });

    it('pauses when rate limit is reached via headers', async () => {
        const sleepSpy = spy(utils, 'sleepUntilDateTime');
        stub.onGet(`repos/owner/repo/commits`, { params: { per_page: 100, since: sinceDate.toISOString() } }).replyOnce(
            200,
            [
                {
                    author: {
                        login: 'user1',
                    },
                    commit: {
                        author: 'user1',
                        email: 'user1@email.com',
                        date: '2023-01-04T17:56:44Z',
                    },
                },
                {
                    author: {
                        login: 'user2',
                    },
                    commit: {
                        author: 'user2',
                        email: 'user2@email.com',
                        date: '2023-01-04T17:55:44Z',
                    },
                },
            ],
            {
                link: '<https://api.github.com/repositories/1234/commits?page=2>; rel="next", <https://api.github.com/repositories/1234/commits?page=2>; rel="last"',
                'x-ratelimit-remaining': '0',
                'x-ratelimit-reset': '1672799029',
            }
        );

        stub.onGet(`https://api.github.com/repositories/1234/commits?page=2`, {
            params: { per_page: 100, since: sinceDate.toISOString() },
        }).replyOnce(
            200,
            [
                {
                    author: {
                        login: 'user1',
                    },
                    commit: {
                        author: 'user1',
                        email: 'user1@email.com',
                        date: '2023-01-03T17:56:44Z',
                    },
                },
                {
                    author: {
                        login: 'user3',
                    },
                    commit: {
                        author: 'user3',
                        email: 'user3@email.com',
                        date: '2023-01-02T17:55:44Z',
                    },
                },
            ],
            {
                link: '<https://api.github.com/repositories/1234/commits?page=2>; rel="last"',
            }
        );

        const commits = await githubApiManager.getCommits({ owner: 'owner', name: 'repo' }, sinceDate);
        expect(commits).to.have.length(4);
        expect(sleepSpy.calledOnce).to.be.true;
    });

    it('handles unexpected 429 response', async () => {
        const sleepSpy = spy(utils, 'sleepUntilDateTime');
        stub.onGet(`repos/owner/repo/commits`, { params: { per_page: 100, since: sinceDate.toISOString() } }).replyOnce(
            200,
            [
                {
                    author: {
                        login: 'user1',
                    },
                    commit: {
                        author: 'user1',
                        email: 'user1@email.com',
                        date: '2023-01-04T17:56:44Z',
                    },
                },
                {
                    author: {
                        login: 'user2',
                    },
                    commit: {
                        author: 'user2',
                        email: 'user2@email.com',
                        date: '2023-01-04T17:55:44Z',
                    },
                },
            ],
            {
                link: '<https://api.github.com/repositories/1234/commits?page=2>; rel="next", <https://api.github.com/repositories/1234/commits?page=2>; rel="last"',
            }
        );

        stub.onGet(`https://api.github.com/repositories/1234/commits?page=2`, {
            params: { per_page: 100, since: sinceDate.toISOString() },
        }).replyOnce(429, undefined, {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '1672799029',
        });

        stub.onGet(`https://api.github.com/repositories/1234/commits?page=2`, {
            params: { per_page: 100, since: sinceDate.toISOString() },
        }).replyOnce(
            200,
            [
                {
                    author: {
                        login: 'user1',
                    },
                    commit: {
                        author: 'user1',
                        email: 'user1@email.com',
                        date: '2023-01-03T17:56:44Z',
                    },
                },
                {
                    author: {
                        login: 'user3',
                    },
                    commit: {
                        author: 'user3',
                        email: 'user3@email.com',
                        date: '2023-01-02T17:55:44Z',
                    },
                },
            ],
            {
                link: '<https://api.github.com/repositories/1234/commits?page=2>; rel="last"',
            }
        );

        const commits = await githubApiManager.getCommits({ owner: 'owner', name: 'repo' }, sinceDate);
        expect(commits).to.have.length(4);
        expect(sleepSpy.calledOnce).to.be.true;
    });
});

describe('github helpers', () => {
    it('detects the next page', () => {
        const response: AxiosResponse = {
            data: undefined,
            status: 0,
            statusText: '',
            headers: {},
            config: {},
        };
        expect(githubApiManager.hasMorePages(response)).to.be.false;
        response.headers.link =
            '<https://api.github.com/repositories/1234/commits?per_page=1&page=3>; rel="next", <https://api.github.com/repositories/1234/commits?per_page=1&page=6>; rel="last", <https://api.github.com/repositories/1234/commits?per_page=1&page=1>; rel="first", <https://api.github.com/repositories/1234/commits?per_page=1&page=1>; rel="prev"';
        expect(githubApiManager.hasMorePages(response)).to.be.true;
        response.headers.link =
            '<https://api.github.com/repositories/1234/commits?per_page=1&page=6>; rel="last", <https://api.github.com/repositories/1234/commits?per_page=1&page=1>; rel="first", <https://api.github.com/repositories/1234/commits?per_page=1&page=1>; rel="prev"';
        expect(githubApiManager.hasMorePages(response)).to.be.false;
    });

    it('sets the next page config', () => {
        const response: AxiosResponse = {
            data: undefined,
            status: 0,
            statusText: '',
            headers: {
                link: '<https://api.github.com/repositories/1234/commits?per_page=1&page=3>; rel="next", <https://api.github.com/repositories/1234/commits?per_page=1&page=6>; rel="last", <https://api.github.com/repositories/1234/commits?per_page=1&page=1>; rel="first", <https://api.github.com/repositories/1234/commits?per_page=1&page=1>; rel="prev"',
            },
            config: {},
        };

        const config: AxiosRequestConfig = {};
        githubApiManager.setNextPageConfig(config, response);

        expect(config.url).to.equal('https://api.github.com/repositories/1234/commits?per_page=1&page=3');
    });

    it('extracts data', () => {
        const response: AxiosResponse = {
            data: [1, 2, 3],
            status: 0,
            statusText: '',
            headers: {},
            config: {},
        };

        expect(githubApiManager.getDataPage(response)).to.deep.equal([1, 2, 3]);
    });

    it('sets data', () => {
        const response: AxiosResponse = {
            data: [1, 2, 3],
            status: 0,
            statusText: '',
            headers: {},
            config: {},
        };

        githubApiManager.setDataPage(response, [4, 5, 6]);
        expect(githubApiManager.getDataPage(response)).to.deep.equal([4, 5, 6]);
    });

    it('appends data', () => {
        const allPages: AxiosResponse = {
            data: [1, 2, 3],
            status: 0,
            statusText: '',
            headers: {},
            config: {},
        };

        const response: AxiosResponse = {
            data: [4, 5, 6],
            status: 0,
            statusText: '',
            headers: {},
            config: {},
        };

        githubApiManager.appendDataPage(allPages, response);
        expect(allPages.data).to.deep.equal([1, 2, 3, 4, 5, 6]);
    });
});

describe('github api queries', () => {
    it('fetches paginated commits', async () => {
        stub.onGet(`repos/owner/repo/commits`, { params: { per_page: 100, since: sinceDate.toISOString() } }).replyOnce(
            200,
            [
                {
                    author: {
                        login: 'user1',
                    },
                    commit: {
                        author: 'user1',
                        email: 'user1@email.com',
                        date: '2023-01-04T17:56:44Z',
                    },
                },
                {
                    author: {
                        login: 'user2',
                    },
                    commit: {
                        author: 'user2',
                        email: 'user2@email.com',
                        date: '2023-01-04T17:55:44Z',
                    },
                },
            ],
            {
                link: '<https://api.github.com/repositories/1234/commits?page=2>; rel="next", <https://api.github.com/repositories/1234/commits?page=2>; rel="last"',
            }
        );

        stub.onGet(`https://api.github.com/repositories/1234/commits?page=2`, {
            params: { per_page: 100, since: sinceDate.toISOString() },
        }).replyOnce(
            200,
            [
                {
                    author: {
                        login: 'user1',
                    },
                    commit: {
                        author: 'user1',
                        email: 'user1@email.com',
                        date: '2023-01-03T17:56:44Z',
                    },
                },
                {
                    author: {
                        login: 'user3',
                    },
                    commit: {
                        author: 'user3',
                        email: 'user3@email.com',
                        date: '2023-01-02T17:55:44Z',
                    },
                },
            ],
            {
                link: '<https://api.github.com/repositories/1234/commits?page=2>; rel="last"',
            }
        );

        const commits = await githubApiManager.getCommits({ owner: 'owner', name: 'repo' }, sinceDate);
        expect(commits).to.have.length(4);
    });

    it('fetches paginated user repos', async () => {
        stub.onGet(`user/repos`, { params: { per_page: 100 } }).replyOnce(
            200,
            [
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
            ],
            {
                link: '<https://api.github.com/user/repos?page=2>; rel="next", <https://api.github.com/user/repos?page=2>; rel="last"',
            }
        );

        stub.onGet(`https://api.github.com/user/repos?page=2`, { params: { per_page: 100 } }).replyOnce(
            200,
            [
                {
                    name: 'repo3',
                    owner: { login: 'owner3' },
                    private: true,
                },
            ],
            {
                link: '<https://api.github.com/user/repos?page=2>; rel="last"',
            }
        );

        const commits = await githubApiManager.getUserRepos();
        expect(commits).to.have.length(3);
    });

    it('fetches paginated org repos', async () => {
        stub.onGet(`orgs/org1/repos`, { params: { per_page: 100 } }).replyOnce(
            200,
            [
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
            ],
            {
                link: '<https://api.github.com/orgs/org1/repos?page=2>; rel="next", <https://api.github.com/orgs/org1/repos?page=2>; rel="last"',
            }
        );

        stub.onGet(`https://api.github.com/orgs/org1/repos?page=2`, { params: { per_page: 100 } }).replyOnce(
            200,
            [
                {
                    name: 'repo3',
                    owner: { login: 'org1' },
                    private: true,
                },
            ],
            {
                link: '<https://api.github.com/orgs/org1/repos?page=2>; rel="last"',
            }
        );

        const commits = await githubApiManager.getOrgRepos('org1');
        expect(commits).to.have.length(3);
    });

    it('enriches repos', async () => {
        stub.onGet(`repos/org1/repo1`).replyOnce(200, {
            id: 1234,
            node_id: '1234',
            name: 'repo1',
            full_name: 'org1/repo1',
            private: true,
            owner: {
                login: 'org1',
                id: 5678,
                node_id: '5678',
            },
            html_url: 'https://github.com/org1/repo1',
            archived: false,
            disabled: false,
            visibility: 'private',
        });

        stub.onGet(`repos/org2/repo2`).replyOnce(200, {
            id: 1234,
            node_id: '1234',
            name: 'repo2',
            full_name: 'org2/repo2',
            private: false,
            owner: {
                login: 'org2',
                id: 5678,
                node_id: '5678',
            },
            html_url: 'https://github.com/org2/repo2',
            archived: false,
            disabled: false,
            visibility: 'public',
        });

        const repo1: Repo = {
            owner: 'org1',
            name: 'repo1',
        };

        await githubApiManager.enrichRepo(repo1);
        expect(repo1.private).to.be.true;

        const repo2: Repo = {
            owner: 'org2',
            name: 'repo2',
        };

        await githubApiManager.enrichRepo(repo2);
        expect(repo2.private).to.be.false;
    });
});
