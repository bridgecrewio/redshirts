import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Repo } from '../../common/types';
import { getXDaysAgoDate, LOGGER } from '../../common/utils';
import { BitbucketApiManager } from '../bitbucket/bitbucket-api-manager';
import { BitbucketServerCommit, BitbucketServerRepoResponse } from './bitbucket-server-types';
import { getBitbucketServerDateCompareFunction } from './bitbucket-server-utils';

const MAX_PAGE_SIZE = 100;

export class BitbucketServerApiManager extends BitbucketApiManager {

    async getCommits(repo: Repo, numDays: number): Promise<BitbucketServerCommit[]> {
        const repoPath = repo.owner + '/' + repo.name;
        LOGGER.debug(`Getting commits for repo: ${repoPath}`);
        const config: AxiosRequestConfig = {
            url: `projects/${repo.owner}/repos/${repo.name}/commits`,
            method: 'GET',
            params: {
                limit: MAX_PAGE_SIZE,
            },
        };

        // Bitbucket does not support a 'since' filter, so we have to do it manually
        const filterfn = getBitbucketServerDateCompareFunction(getXDaysAgoDate(numDays));

        const result: AxiosResponse = await this.submitFilteredPaginatedRequest(config, filterfn);
        const commits = result?.data.values || [];
        LOGGER.debug(`Found ${commits.length} commits`);
        return commits;
    }

    async getUserRepos(): Promise<BitbucketServerRepoResponse[]> {
        const config: AxiosRequestConfig = {
            url: 'repos',
            method: 'GET',
            params: { limit: MAX_PAGE_SIZE },
        };

        const result: AxiosResponse = await this.submitPaginatedRequest(config);

        return result.data.values;
    }

    async getOrgRepos(project: string): Promise<BitbucketServerRepoResponse[]> {
        // the request is the same for a user or workspace, so we don't need to do anything extra
        const config: AxiosRequestConfig = {
            url: `projects/${project}/repos`,
            method: 'GET',
            params: { limit: MAX_PAGE_SIZE },
        };

        const result: AxiosResponse = await this.submitPaginatedRequest(config);
        return result.data.values;
    }

    hasMorePages(response: AxiosResponse): boolean {
        return response.data.nextPageStart;
    }

    setNextPageConfig(config: AxiosRequestConfig, response: AxiosResponse): void {
        config.params.start = response.data.nextPageStart;
    }
}
