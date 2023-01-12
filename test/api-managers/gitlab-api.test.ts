/* eslint-disable camelcase */
import { expect } from 'chai';
import { GitlabApiManager } from '../../src/vcs/gitlab/gitlab-api-manager';
import Gitlab from '../../src/commands/gitlab';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { spy, restore } from 'sinon';
import * as utils from '../../src/common/utils';
import { Repo } from '../../src/common/types';

let gitlabApiManager: GitlabApiManager;
const sinceDate = new Date(1672380000000);
let stub: MockAdapter;

beforeEach(() => {
    gitlabApiManager = new GitlabApiManager(Gitlab.getSourceInfo('', true));
    stub = new MockAdapter(gitlabApiManager.axiosInstance);
    stub.onGet(gitlabApiManager.rateLimitEndpoint).reply(
        200,
        {
            id: 1,
        },
        {
            'ratelimit-remaining': '10',
            'ratelimit-reset': '1672799029',
        }
    );
});

describe('gitlab api rate limiting', () => {
    afterEach(() => {
        restore();
    });

    it('checks the rate limit status', async () => {
        const rateLimit = await gitlabApiManager.checkRateLimitStatus();
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
        expect(gitlabApiManager.getRateLimitStatus(response)).to.be.undefined;

        response.headers = {
            'ratelimit-remaining': '5',
            'ratelimit-reset': '1672799029',
        };
        expect(gitlabApiManager.getRateLimitStatus(response)).to.deep.equal({
            remaining: 5,
            reset: new Date(1672799029000),
        });
    });

    it('pauses when rate limit is reached via headers', async () => {
        const sleepSpy = spy(utils, 'sleepUntilDateTime');
        stub.onGet('projects/owner%2Frepo/repository/commits', {
            params: { per_page: 100, since: sinceDate.toISOString() },
        }).replyOnce(
            200,
            [
                {
                    committer_name: 'user1',
                    committer_email: 'user1@email.com',
                    committed_date: '2023-01-11T15:32:11.000+00:00',
                },
                {
                    committer_name: 'user2',
                    committer_email: 'user2@email.com',
                    committed_date: '2023-01-12T15:32:11.000+00:00',
                },
            ],
            {
                link: '<https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=2&per_page=10&trailers=false>; rel="next", <https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=1&per_page=10&trailers=false>; rel="first", <https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=2&per_page=10&trailers=false>; rel="last"',
                'ratelimit-remaining': '0',
                'ratelimit-reset': '1672799029',
            }
        );

        stub.onGet(
            'https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=2&per_page=10&trailers=false',
            {
                params: { per_page: 100, since: sinceDate.toISOString() },
            }
        ).replyOnce(
            200,
            [
                {
                    committer_name: 'user1',
                    committer_email: 'user1@email.com',
                    committed_date: '2023-01-11T15:32:11.000+00:00',
                },
                {
                    committer_name: 'user2',
                    committer_email: 'user2@email.com',
                    committed_date: '2023-01-12T15:32:11.000+00:00',
                },
            ],
            {
                link: '<https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=1&per_page=10&trailers=false>; rel="prev", <https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=1&per_page=10&trailers=false>; rel="first", <https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=2&per_page=10&trailers=false>; rel="last"',
            }
        );

        const commits = await gitlabApiManager.getCommits({ owner: 'owner', name: 'repo' }, sinceDate);
        expect(commits).to.have.length(4);
        expect(sleepSpy.calledOnce).to.be.true;
    });
});

describe('gitlab helpers', () => {
    it('detects the next page', () => {
        const response: AxiosResponse = {
            data: undefined,
            status: 0,
            statusText: '',
            headers: {},
            config: {},
        };
        expect(gitlabApiManager.hasMorePages(response)).to.be.false;
        response.headers.link =
            '<https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=2&per_page=10&trailers=false>; rel="next", <https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=1&per_page=10&trailers=false>; rel="first", <https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=2&per_page=10&trailers=false>; rel="last"';
        expect(gitlabApiManager.hasMorePages(response)).to.be.true;
        response.headers.link =
            '<https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=1&per_page=10&trailers=false>; rel="prev", <https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=1&per_page=10&trailers=false>; rel="first", <https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=2&per_page=10&trailers=false>; rel="last"';
        expect(gitlabApiManager.hasMorePages(response)).to.be.false;
    });

    it('sets the next page config', () => {
        const response: AxiosResponse = {
            data: undefined,
            status: 0,
            statusText: '',
            headers: {
                link: '<https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=1&per_page=10&trailers=false>; rel="next", <https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=1&per_page=10&trailers=false>; rel="first", <https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=2&per_page=10&trailers=false>; rel="last"',
            },
            config: {},
        };

        const config: AxiosRequestConfig = {};
        gitlabApiManager.setNextPageConfig(config, response);

        expect(config.url).to.equal(
            'https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=1&per_page=10&trailers=false'
        );
    });

    it('extracts data', () => {
        const response: AxiosResponse = {
            data: [1, 2, 3],
            status: 0,
            statusText: '',
            headers: {},
            config: {},
        };

        expect(gitlabApiManager.getDataPage(response)).to.deep.equal([1, 2, 3]);
    });

    it('sets data', () => {
        const response: AxiosResponse = {
            data: [1, 2, 3],
            status: 0,
            statusText: '',
            headers: {},
            config: {},
        };

        gitlabApiManager.setDataPage(response, [4, 5, 6]);
        expect(gitlabApiManager.getDataPage(response)).to.deep.equal([4, 5, 6]);
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

        gitlabApiManager.appendDataPage(allPages, response);
        expect(allPages.data).to.deep.equal([1, 2, 3, 4, 5, 6]);
    });
});

describe('gitlab api queries', () => {
    it('fetches paginated commits', async () => {
        stub.onGet('projects/owner%2Frepo/repository/commits', {
            params: { per_page: 100, since: sinceDate.toISOString() },
        }).replyOnce(
            200,
            [
                {
                    committer_name: 'user1',
                    committer_email: 'user1@email.com',
                    committed_date: '2023-01-11T15:32:11.000+00:00',
                },
                {
                    committer_name: 'user2',
                    committer_email: 'user2@email.com',
                    committed_date: '2023-01-12T15:32:11.000+00:00',
                },
            ],
            {
                link: '<https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=2&per_page=10&trailers=false>; rel="next", <https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=1&per_page=10&trailers=false>; rel="first", <https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=2&per_page=10&trailers=false>; rel="last"',
            }
        );

        stub.onGet(
            'https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=2&per_page=10&trailers=false',
            {
                params: { per_page: 100, since: sinceDate.toISOString() },
            }
        ).replyOnce(
            200,
            [
                {
                    committer_name: 'user1',
                    committer_email: 'user1@email.com',
                    committed_date: '2023-01-11T15:32:11.000+00:00',
                },
                {
                    committer_name: 'user2',
                    committer_email: 'user2@email.com',
                    committed_date: '2023-01-12T15:32:11.000+00:00',
                },
            ],
            {
                link: '<https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=1&per_page=10&trailers=false>; rel="prev", <https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=1&per_page=10&trailers=false>; rel="first", <https://gitlab.com/api/v4/projects/owner%2Frepo/repository/commits?id=owner%2Frepo&order=default&page=2&per_page=10&trailers=false>; rel="last"',
            }
        );

        const commits = await gitlabApiManager.getCommits({ owner: 'owner', name: 'repo' }, sinceDate);
        expect(commits).to.have.length(4);
    });

    it('fetches paginated user groups', async () => {
        stub.onGet(`groups`, { params: { per_page: 100, simple: true } }).replyOnce(
            200,
            [
                {
                    id: '1',
                    full_path: 'gitlab_group_1',
                },
                {
                    id: '2',
                    full_path: 'gitlab_group_2',
                },
            ],
            {
                link: '<https://gitlab.com/api/v4/groups?order_by=name&owned=false&page=2&per_page=2&simple=true&sort=asc&statistics=false&with_custom_attributes=false>; rel="next", <https://gitlab.com/api/v4/groups?order_by=name&owned=false&page=1&per_page=2&simple=true&sort=asc&statistics=false&with_custom_attributes=false>; rel="first", <https://gitlab.com/api/v4/groups?order_by=name&owned=false&page=3&per_page=2&simple=true&sort=asc&statistics=false&with_custom_attributes=false>; rel="last"',
            }
        );

        stub.onGet(
            `https://gitlab.com/api/v4/groups?order_by=name&owned=false&page=2&per_page=2&simple=true&sort=asc&statistics=false&with_custom_attributes=false`,
            { params: { per_page: 100, simple: true } }
        ).replyOnce(
            200,
            [
                {
                    id: '1',
                    full_path: 'gitlab_group_1',
                },
                {
                    id: '2',
                    full_path: 'gitlab_group_2',
                },
            ],
            {
                link: '<https://gitlab.com/api/v4/groups?order_by=name&owned=false&page=2&per_page=2&simple=true&sort=asc&statistics=false&with_custom_attributes=false>; rel="last"',
            }
        );

        const groups = await gitlabApiManager.getGroups();
        expect(groups).to.have.length(4);
    });

    it('fetches paginated group repos', async () => {
        stub.onGet(`groups/group1%2Fsubgroup1/projects`, {
            params: { per_page: 100, include_subgroups: true },
        }).replyOnce(
            200,
            [
                {
                    name: 'privaterepo',
                    path: 'privaterepo',
                    visibility: 'private',
                    namespace: {
                        full_path: 'gitlab_group_1',
                    },
                },
            ],
            {
                link: '<https://gitlab.com/api/v4/groups?order_by=name&owned=false&page=2&per_page=2&simple=true&sort=asc&statistics=false&with_custom_attributes=false>; rel="last"',
            }
        );

        const repos = await gitlabApiManager.getOrgRepos('group1/subgroup1', true);
        expect(repos).to.have.length(1);
    });

    it('fetches paginated user repos', async () => {
        stub.onGet(`groups`, { params: { per_page: 100, simple: true } }).replyOnce(200, [
            {
                id: '1',
                full_path: 'gitlab_group_1',
            },
            {
                id: '2',
                full_path: 'gitlab_group_1/gitlab_subgroup_1',
            },
        ]);

        stub.onGet(`groups/gitlab_group_1/projects`, { params: { per_page: 100, include_subgroups: false } }).replyOnce(
            200,
            [
                {
                    name: 'privaterepo',
                    path: 'privaterepo',
                    visibility: 'private',
                    namespace: {
                        full_path: 'gitlab_group_1',
                    },
                },
            ]
        );

        stub.onGet(`groups/gitlab_group_1%2Fgitlab_subgroup_1/projects`, {
            params: { per_page: 100, include_subgroups: false },
        }).replyOnce(200, [
            {
                name: 'privaterepo2',
                path: 'privaterepo2',
                visibility: 'private',
                namespace: {
                    full_path: 'gitlab_group_1/gitlab_subgroup_1',
                },
            },
        ]);

        stub.onGet(`users/1/projects`, { params: { per_page: 100 } }).replyOnce(200, [
            {
                name: 'privaterepo3',
                path: 'privaterepo3',
                visibility: 'private',
                namespace: {
                    full_path: 'gitlab_group_2',
                },
            },
        ]);
        const repos = await gitlabApiManager.getUserRepos();
        expect(repos).to.have.length(3);
    });

    it('enriches repos', async () => {
        stub.onGet(`projects/org1%2Frepo1`).replyOnce(200, {
            id: 1,
            name: 'repo1',
            path: 'repo1',
            namespace: {
                full_path: 'org1',
            },
            visibility: 'private',
        });

        stub.onGet(`projects/org2%2Frepo2`).replyOnce(200, {
            id: 2,
            name: 'repo2',
            path: 'repo2',
            namespace: {
                full_path: 'org2',
            },
            visibility: 'public',
        });

        const repo1: Repo = {
            owner: 'org1',
            name: 'repo1',
        };

        await gitlabApiManager.enrichRepo(repo1);
        expect(repo1.private).to.be.true;

        const repo2: Repo = {
            owner: 'org2',
            name: 'repo2',
        };

        await gitlabApiManager.enrichRepo(repo2);
        expect(repo2.private).to.be.false;
    });
});
