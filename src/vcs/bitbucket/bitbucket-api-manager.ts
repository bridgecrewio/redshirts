import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiManager } from '../../common/api-manager';
import { Repo, SourceInfo, SourceType } from '../../common/types';
import { getXDaysAgoDate } from '../../common/utils';
import { BitbucketCommit, BitbucketRepoResponse, BitbucketUserRepoResponse, BitbucketWorkspaceResponse } from './bitbucket-types';
import { getBitbucketDateCompareFunction } from './bitbucket-utils';

const MAX_PAGE_SIZE = 100;

export class BitbucketApiManager extends ApiManager {

    constructor(sourceInfo: SourceInfo, certPath?: string) {
        super(sourceInfo, SourceType.Bitbucket, certPath);
    }

    _getAxiosConfiguration(): AxiosRequestConfig {
        return this._buildAxiosConfiguration(this.sourceInfo.url, {
            Authorization: `Basic ${Buffer.from(this.sourceInfo.token).toString('base64')}`,
        });
    }

    async getCommits(repo: Repo, numDays: number): Promise<BitbucketCommit[]> {
        const repoPath = repo.owner + '/' + repo.name;
        console.debug(`Getting commits for repo: ${repoPath}`);
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
        console.debug(`Found ${commits.length} commits`);
        return commits;
    }

    async getUserRepos(): Promise<BitbucketRepoResponse[]> {
        const workspaces = await this.getWorkspaces();

        const repos = [];
        for (const workspace of workspaces) {
            // eslint-disable-next-line no-await-in-loop
            repos.push(...await this.getOrgRepos(workspace));
        }

        console.debug(`Found ${repos.length} repos across ${workspaces.length} workspaces`);

        return repos;
    }

    async getWorkspaces(): Promise<string[]> {
        // get the unique workspaces for the user's own repos and the workspaces of which they are a member
        const userRepos = await this.getUserRepoPermissions();

        const userWorkspaces = userRepos.map(r => r.repository && r.repository.full_name && r.repository.full_name.split('/')[0]).filter(r => r);

        console.debug(`Got the following workspaces from the user's repos: ${userWorkspaces}`);

        const config: AxiosRequestConfig = {
            url: 'workspaces',
            method: 'GET',
            params: { pagelen: MAX_PAGE_SIZE },
        };

        const result: AxiosResponse = await this.submitPaginatedRequest(config);
        const workspaces = result.data.values.map((w: BitbucketWorkspaceResponse) => w.slug);
        console.debug(`Got the following workspaces explicitly for the user: ${workspaces}`);

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

    async submitPaginatedRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
        console.debug(`Submitting request to ${config.url}`);
        let response = await this.axiosInstance.request(config);
        const result = response;
        while (response.data.next) {
            config.url = response.data.next;

            console.debug(`Fetching next page of request from ${config.url}`);

            // eslint-disable-next-line no-await-in-loop
            response = await this.axiosInstance.request(config);
            result.data.values = [...result.data.values, ...response.data.values];
        }

        console.debug(`Fetched ${result.data.values.length} total items`);

        return result;
    }

    async submitFilteredPaginatedRequest(config: AxiosRequestConfig, filterfn: (c: BitbucketCommit) => boolean): Promise<AxiosResponse> {
        // same as the regular pagination logic, except this one will run the filter function on each
        // page of results, and if any of the elements in that page matches, then the function
        // will stop pagination, slice off that item and everything after it, and return. 
        // This means that the filter function must use the field by which the results for the 
        // request are sorted.

        console.debug(`Submitting truncated request to ${config.url}`);
        let response = await this.axiosInstance.request(config);

        // this is safe because we control the definition
        // eslint-disable-next-line unicorn/no-array-callback-reference
        const oldCommitIndex = (response.data.values as BitbucketCommit[]).findIndex(filterfn);

        if (oldCommitIndex !== -1) {
            console.debug(`Found truncation marker at index ${oldCommitIndex}`);
            response.data.values = response.data.values.slice(0, oldCommitIndex);
        }

        const result = response;

        while (response.data.next) {
            config.url = response.data.next;

            console.debug(`Fetching next page of request from ${config.url}`);

            // eslint-disable-next-line no-await-in-loop
            response = await this.axiosInstance.request(config);

            // eslint-disable-next-line unicorn/no-array-callback-reference
            const oldCommitIndex = (response.data.values as BitbucketCommit[]).findIndex(filterfn);

            if (oldCommitIndex === -1) {
                result.data.values = [...result.data.values, ...response.data.values];
            } else {
                console.debug(`Found truncation marker at index ${oldCommitIndex}`);
                result.data.values = [...result.data.values, ...response.data.values.slice(0, oldCommitIndex)];
                break;
            }
        }

        console.debug(`Fetched ${result.data.values.length} total items`);

        return result;
    }
}
