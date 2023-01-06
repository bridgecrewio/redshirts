import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { GithubCommit, GithubRepoResponse } from './github-types';
import { Repo, VcsSourceInfo } from '../../common/types';
import { LOGGER } from '../../common/utils';
import { RateLimitVcsApiManager } from '../../common/rate-limit-vcs-api-manager';

const MAX_PAGE_SIZE = 100;
const API_VERSION = '2022-11-28';
const RATE_LIMIT_REMAINING_HEADER = 'x-ratelimit-remaining';
const RATE_LIMIT_RESET_HEADER = 'x-ratelimit-reset';
const RATE_LIMIT_ENDPOINT = 'rate_limit';
export class GithubApiManager extends RateLimitVcsApiManager {
    constructor(sourceInfo: VcsSourceInfo, certPath?: string) {
        super(sourceInfo, RATE_LIMIT_REMAINING_HEADER, RATE_LIMIT_RESET_HEADER, RATE_LIMIT_ENDPOINT, certPath);
    }

    _getAxiosConfiguration(): AxiosRequestConfig {
        return this._buildAxiosConfiguration(this.sourceInfo.url, {
            Accept: 'application/vnd.github.machine-man-preview+json',
            'X-GitHub-Api-Version': API_VERSION,
            Authorization: `Bearer ${this.sourceInfo.token}`,
        });
    }

    async getCommits(repo: Repo, sinceDate: Date): Promise<GithubCommit[]> {
        const repoPath = repo.owner + '/' + repo.name;
        const config: AxiosRequestConfig = {
            url: `repos/${repo.owner}/${repo.name}/commits`,
            method: 'GET',
            params: {
                // eslint-disable-next-line camelcase
                per_page: MAX_PAGE_SIZE,
                since: sinceDate.toISOString(),
            },
        };

        try {
            const result: AxiosResponse = await this.submitPaginatedRequest(config);
            const commits = result?.data || [];
            return commits;
        } catch (error) {
            if (
                error instanceof AxiosError &&
                error.response?.status === 409 &&
                error.response.data.message === 'Git Repository is empty.'
            ) {
                LOGGER.debug(`Repo ${repoPath} is empty`);
                return [];
            }

            throw error;
        }
    }

    async getUserRepos(): Promise<GithubRepoResponse[]> {
        const config: AxiosRequestConfig = {
            url: 'user/repos',
            method: 'GET',
            // eslint-disable-next-line camelcase
            params: { per_page: MAX_PAGE_SIZE },
        };
        const result: AxiosResponse = await this.submitPaginatedRequest(config);
        return result.data;
    }

    async getOrgRepos(org: string): Promise<GithubRepoResponse[]> {
        // first attempts as an org, then attempts as a user

        const config: AxiosRequestConfig = {
            url: `orgs/${org}/repos`,
            method: 'GET',
            // eslint-disable-next-line camelcase
            params: { per_page: MAX_PAGE_SIZE },
        };

        try {
            const result: AxiosResponse = await this.submitPaginatedRequest(config);
            return result.data;
        } catch (error) {
            if (error instanceof AxiosError && error.response?.status === 404) {
                LOGGER.debug(`Got 404 from /orgs/${org}/repos call - attempting a user call`);
                config.url = `/users/${org}/repos`;
                const result: AxiosResponse = await this.submitPaginatedRequest(config);
                return result.data;
            }

            throw error;
        }
    }

    async enrichRepo(repo: Repo): Promise<void> {
        const config: AxiosRequestConfig = {
            url: `repos/${repo.owner}/${repo.name}`,
            method: 'GET',
        };

        LOGGER.debug(`Submitting request to ${config.url}`);
        const response = await this.submitRequest(config);
        const data: GithubRepoResponse = response.data;
        repo.private = data.private;
    }
}
