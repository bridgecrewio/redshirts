import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { GithubCommit, GithubRepoResponse } from './github-types';
import { ApiManager } from '../../common/api-manager';
import { Repo } from '../../common/types';
import { getXDaysAgoDate, LOGGER } from '../../common/utils';

const MAX_PAGE_SIZE = 100;
const API_VERSION = '2022-11-28';
export class GithubApiManager extends ApiManager {

    _getAxiosConfiguration(): AxiosRequestConfig {
        return this._buildAxiosConfiguration(this.sourceInfo.url, {
            Accept: 'application/vnd.github.machine-man-preview+json',
            'X-GitHub-Api-Version': API_VERSION,
            Authorization: `Bearer ${this.sourceInfo.token}`,
        });
    }

    async getCommits(repo: Repo, numDays: number): Promise<GithubCommit[]> {
        const repoPath = repo.owner + '/' + repo.name;
        LOGGER.debug(`Getting commits for repo: ${repoPath}`);
        const config: AxiosRequestConfig = {
            url: `repos/${repo.owner}/${repo.name}/commits`,
            method: 'GET',
            params: {
                // eslint-disable-next-line camelcase
                per_page: MAX_PAGE_SIZE,
                since: getXDaysAgoDate(numDays).toISOString(),
            },
        };

        const result: AxiosResponse = await this.submitPaginatedRequest(config);
        const commits = result?.data || [];
        LOGGER.debug(`Found ${commits.length} commits`);
        return commits;
    }

    async getUserRepos(): Promise<GithubRepoResponse[]> {
        const config: AxiosRequestConfig = {
            url: '/user/repos',
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
            url: `/orgs/${org}/repos`,
            method: 'GET',
            // eslint-disable-next-line camelcase
            params: { per_page: MAX_PAGE_SIZE },
        };

        try {
            const result: AxiosResponse = await this.submitPaginatedRequest(config);
            return result.data;
        }
        catch (error) {
            if (error instanceof AxiosError && error.response?.status === 404) {
                LOGGER.debug(`Got 404 from /orgs/${org}/repos call - attempting a user call`);
                config.url = `/users/${org}/repos`;
                const result: AxiosResponse = await this.submitPaginatedRequest(config);
                return result.data;
            }

            throw error;
        }
    }

    async getUserOrgs(): Promise<unknown[]> {
        const config: AxiosRequestConfig = {
            url: '/user/orgs',
            method: 'GET',
            // eslint-disable-next-line camelcase
            params: { per_page: MAX_PAGE_SIZE },
        };
        const result: AxiosResponse = await this.submitPaginatedRequest(config);
        return result.data;
    }
}
