/* eslint-disable camelcase */
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { RateLimitVcsApiManager } from '../../common/rate-limit-vcs-api-manager';
import { Repo, VcsSourceInfo } from '../../common/types';
import { LOGGER } from '../../common/utils';
import { GitlabCommit, GitlabGroupResponse, GitlabRepoResponse } from './gitlab-types';

const MAX_PAGE_SIZE = 100;
const RATE_LIMIT_REMAINING_HEADER = 'ratelimit-remaining';
const RATE_LIMIT_RESET_HEADER = 'ratelimit-reset';
const RATE_LIMIT_ENDPOINT = 'user';

export class GitlabApiManager extends RateLimitVcsApiManager {

    constructor(sourceInfo: VcsSourceInfo, certPath?: string) {
        super(sourceInfo, RATE_LIMIT_REMAINING_HEADER, RATE_LIMIT_RESET_HEADER, RATE_LIMIT_ENDPOINT, certPath);
    }

    _getAxiosConfiguration(): AxiosRequestConfig {
        return this._buildAxiosConfiguration(this.sourceInfo.url, {
            Authorization: `Bearer ${this.sourceInfo.token}`,
            'Accept-Encoding': 'gzip,deflate,compress'
        });
    }

    async getCommits(repo: Repo, sinceDate: Date): Promise<GitlabCommit[]> {

        const repoPath = repo.owner + '/' + repo.name;
        LOGGER.debug(`Getting commits for repo: ${repoPath}`);
        const config: AxiosRequestConfig = {
            url: `projects/${encodeURIComponent(`${repo.owner}/${repo.name}`)}/repository/commits`,
            method: 'GET',
            params: {
                per_page: MAX_PAGE_SIZE,
                since: sinceDate.toISOString(),
            },
        };

        const result: AxiosResponse = await this.submitPaginatedRequest(config);
        const commits = result?.data || [];
        LOGGER.debug(`Found ${commits.length} commits`);
        return commits;
    }

    async getUserRepos(): Promise<GitlabRepoResponse[]> {
        const groups = await this.getGroups();

        const groupRepos = [];

        for (const group of groups) {
            // the groups call lists subgroups separately, so we don't need to get subgroups
            const repos = await this.getOrgRepos(group.full_path, false);
            groupRepos.push(...repos);
        }

        LOGGER.debug(`Found ${groupRepos.length} repos in group memberships`);

        const userId = await this.getUserId();

        const config: AxiosRequestConfig = {
            url: `/users/${userId}/projects`,
            method: 'GET',
            params: {
                per_page: MAX_PAGE_SIZE
            },
        };
        const result: AxiosResponse = await this.submitPaginatedRequest(config);
        const userRepos: GitlabRepoResponse[] = result.data;

        LOGGER.debug(`Found ${userRepos.length} user repos`);

        return [...userRepos, ...groupRepos];
    }

    async getGroups(): Promise<GitlabGroupResponse[]> {

        const config: AxiosRequestConfig = {
            url: 'groups',
            method: 'GET',
            params: {
                per_page: MAX_PAGE_SIZE,
                simple: true
            },
        };

        const result: AxiosResponse = await this.submitPaginatedRequest(config);
        LOGGER.debug(`Found ${result.data.length} explicit group memberships`);

        return result.data;
    }

    async getOrgRepos(group: string, includeSubgroups = true): Promise<GitlabRepoResponse[]> {
        const config: AxiosRequestConfig = {
            url: `groups/${encodeURIComponent(group)}/projects`,
            method: 'GET',
            params: {
                per_page: MAX_PAGE_SIZE,
                include_subgroups: includeSubgroups
            },
        };

        try {
            const result: AxiosResponse = await this.submitPaginatedRequest(config);
            return result.data;
        }
        catch (error) {
            if (error instanceof AxiosError && error.response?.status === 404) {
                LOGGER.debug(`Got 404 from ${config.url} call - attempting a user call`);
                config.url = `users/${encodeURIComponent(group)}/projects`;
                const result: AxiosResponse = await this.submitPaginatedRequest(config);
                return result.data;
            }

            throw error;
        }
    }

    async getUserId(): Promise<number> {
        const config: AxiosRequestConfig = {
            url: '/user',
            method: 'GET',
            params: { per_page: MAX_PAGE_SIZE },
        };
        const result: AxiosResponse = await this.axiosInstance.request(config);
        return result.data.id;
    }

    async enrichRepo(repo: Repo): Promise<void> {
        const config: AxiosRequestConfig = {
            url: `projects/${encodeURIComponent(`${repo.owner}/${repo.name}`)}`,
            method: 'GET'
        };

        LOGGER.debug(`Submitting request to ${config.url}`);
        const response = await this.submitRequest(config);
        const data: GitlabRepoResponse = response.data;
        repo.private = data.visibility !== 'public';
    }
}
