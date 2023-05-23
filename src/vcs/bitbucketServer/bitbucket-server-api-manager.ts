import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Repo } from '../../common/types';
import { LOGGER } from '../../common/utils';
import { BitbucketApiManager } from '../bitbucket/bitbucket-api-manager';
import {
    BitbucketServerCommit,
    BitbucketServerRepoResponse,
    BitbucketServerVcsSourceInfo,
} from './bitbucket-server-types';
import { getBitbucketServerDateCompareFunction } from './bitbucket-server-utils';

const MAX_PAGE_SIZE = 100;

export class BitbucketServerApiManager extends BitbucketApiManager {
    _getAxiosConfiguration(): AxiosRequestConfig {
        const sourceInfo = this.sourceInfo as BitbucketServerVcsSourceInfo;

        const authType = sourceInfo.username ? 'Basic' : 'Bearer';
        LOGGER.debug(`Using ${authType} authentication for bitbucket server`);

        const authToken = sourceInfo.username
            ? Buffer.from(`${sourceInfo.username}:${sourceInfo.token}`).toString('base64')
            : sourceInfo.token;

        return this._buildAxiosConfiguration(this.sourceInfo.url, {
            Authorization: `${authType} ${authToken}`,
        });
    }

    async getCommits(repo: Repo, sinceDate: Date): Promise<BitbucketServerCommit[]> {
        const config: AxiosRequestConfig = {
            url: `projects/${repo.owner}/repos/${repo.name}/commits`,
            method: 'GET',
            params: {
                limit: MAX_PAGE_SIZE,
            },
        };

        // Bitbucket does not support a 'since' filter, so we have to do it manually
        const filterfn = getBitbucketServerDateCompareFunction(sinceDate);

        const result: AxiosResponse = await this.submitFilteredPaginatedRequest(config, filterfn);
        const commits = result?.data.values || [];
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

    async enrichRepo(repo: Repo): Promise<void> {
        const config: AxiosRequestConfig = {
            url: `projects/${repo.owner}/repos/${repo.name}`,
            method: 'GET',
        };

        LOGGER.debug(`Submitting request to ${config.url}`);
        const response = await this.submitRequest(config);
        const data: BitbucketServerRepoResponse = response.data;
        repo.private = !data.public;
    }

    hasMorePages(response: AxiosResponse): boolean {
        return response.data.nextPageStart;
    }

    setNextPageConfig(config: AxiosRequestConfig, response: AxiosResponse): void {
        config.params.start = response.data.nextPageStart;
    }
}
