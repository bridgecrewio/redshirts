import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Repo } from '../../common/types';
import { getXDaysAgoDate, LOGGER } from '../../common/utils';
import { VcsApiManager } from '../../common/vcs-api-manager';
import { BitbucketCommit, BitbucketRepoResponse, BitbucketUserRepoResponse, BitbucketWorkspaceResponse } from './bitbucket-types';
import { getBitbucketDateCompareFunction } from './bitbucket-utils';

const MAX_PAGE_SIZE = 100;

export class BitbucketApiManager extends VcsApiManager {

    _getAxiosConfiguration(): AxiosRequestConfig {
        return this._buildAxiosConfiguration(this.sourceInfo.url, {
            Authorization: `Basic ${Buffer.from(this.sourceInfo.token).toString('base64')}`,
        });
    }

    async getCommits(repo: Repo, numDays: number): Promise<BitbucketCommit[]> {
        const repoPath = repo.owner + '/' + repo.name;
        LOGGER.debug(`Getting commits for repo: ${repoPath}`);
        const config: AxiosRequestConfig = {
            url: `repositories/${repo.owner}/${repo.name}/commits`,
            method: 'GET',
            params: {
                pagelen: MAX_PAGE_SIZE,
            },
        };

        // Bitbucket does not support a 'since' filter, so we have to do it manually
        const filterfn = getBitbucketDateCompareFunction(getXDaysAgoDate(numDays));

        const result: AxiosResponse = await this.submitFilteredPaginatedRequest(config, filterfn);
        const commits = result?.data.values || [];
        LOGGER.debug(`Found ${commits.length} commits`);
        return commits;
    }

    async getUserRepos(): Promise<BitbucketRepoResponse[]> {
        const workspaces = await this.getWorkspaces();

        const repos = [];
        for (const workspace of workspaces) {
            // eslint-disable-next-line no-await-in-loop
            repos.push(...await this.getOrgRepos(workspace));
        }

        LOGGER.debug(`Found ${repos.length} repos across ${workspaces.length} workspaces`);

        return repos;
    }

    async getWorkspaces(): Promise<string[]> {
        // get the unique workspaces for the user's own repos and the workspaces of which they are a member
        const userRepos = await this.getUserRepoPermissions();

        const userWorkspaces = userRepos.map(r => r.repository && r.repository.full_name && r.repository.full_name.split('/')[0]).filter(r => r);

        LOGGER.debug(`Got the following workspaces from the user's repos: ${userWorkspaces}`);

        const config: AxiosRequestConfig = {
            url: 'workspaces',
            method: 'GET',
            params: { pagelen: MAX_PAGE_SIZE },
        };

        const result: AxiosResponse = await this.submitPaginatedRequest(config);
        const workspaces = result.data.values.map((w: BitbucketWorkspaceResponse) => w.slug);
        LOGGER.debug(`Got the following workspaces explicitly for the user: ${workspaces}`);

        return [...new Set([...workspaces, ...userWorkspaces])];
    }

    async getOrgRepos(workspace: string): Promise<BitbucketRepoResponse[]> {
        // the request is the same for a user or workspace, so we don't need to do anything extra
        const config: AxiosRequestConfig = {
            url: `repositories/${workspace}`,
            method: 'GET',
            params: { pagelen: MAX_PAGE_SIZE },
        };

        const result: AxiosResponse = await this.submitPaginatedRequest(config);
        return result.data.values;
    }

    async getUserRepoPermissions(): Promise<BitbucketUserRepoResponse[]> {
        const config: AxiosRequestConfig = {
            url: 'user/permissions/repositories',
            method: 'GET',
            params: { pagelen: MAX_PAGE_SIZE },
        };
        const result: AxiosResponse = await this.submitPaginatedRequest(config);
        return result.data.values;
    }

    hasMorePages(response: AxiosResponse): boolean {
        return response.data.next;
    }

    setNextPageConfig(config: AxiosRequestConfig, response: AxiosResponse): void {
        config.url = response.data.next;
    }

    appendDataPage(result: AxiosResponse, response: AxiosResponse): void {
        result.data.values = [...result.data.values, ...response.data.values];
    }

    setDataPage(result: AxiosResponse, data: any[]): void {
        result.data.values = data;
    }

    getDataPage(response: AxiosResponse): any[] {
        return response.data.values;
    }
}
