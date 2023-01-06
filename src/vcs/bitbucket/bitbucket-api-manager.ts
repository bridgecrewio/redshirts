import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ThrottledVcsApiManager } from '../../common/throttled-vcs-api-manager';
import { Repo } from '../../common/types';
import { LOGGER, mapIterable } from '../../common/utils';
import {
    BitbucketCommit,
    BitbucketRepoResponse,
    BitbucketUserRepoResponse,
    BitbucketWorkspaceResponse,
} from './bitbucket-types';
import { getBitbucketDateCompareFunction } from './bitbucket-utils';

const MAX_PAGE_SIZE = 100;

export class BitbucketApiManager extends ThrottledVcsApiManager {
    _getAxiosConfiguration(): AxiosRequestConfig {
        return this._buildAxiosConfiguration(this.sourceInfo.url, {
            Authorization: `Basic ${Buffer.from(this.sourceInfo.token).toString('base64')}`,
        });
    }

    async getCommits(repo: Repo, sinceDate: Date): Promise<BitbucketCommit[]> {
        const repoPath = repo.owner + '/' + repo.name;
        const config: AxiosRequestConfig = {
            url: `repositories/${repo.owner}/${repo.name}/commits`,
            method: 'GET',
            params: {
                pagelen: MAX_PAGE_SIZE,
            },
        };

        if (repo.defaultBranch) {
            config.params.include = repo.defaultBranch;
        } else {
            LOGGER.debug(
                `The repo ${repoPath} does not have a known default branch, so commits from all branches will be included. Was there an error earlier on?`
            );
        }

        // Bitbucket does not support a 'since' filter, so we have to do it manually
        const filterfn = getBitbucketDateCompareFunction(sinceDate);

        const result: AxiosResponse = await this.submitFilteredPaginatedRequest(config, filterfn);
        const commits = result?.data.values || [];
        return commits;
    }

    async getUserRepos(): Promise<BitbucketRepoResponse[]> {
        const workspaces = await this.getWorkspaces();

        const repos = [];
        for (const workspace of workspaces) {
            repos.push(...(await this.getOrgRepos(workspace)));
        }

        LOGGER.debug(`Found ${repos.length} repos across ${workspaces.length} workspaces`);

        return repos;
    }

    async getWorkspaces(): Promise<string[]> {
        // get the unique workspaces for the user's own repos and the workspaces of which they are a member
        const userRepos = await this.getUserRepoPermissions();

        const userWorkspaces = new Set(
            userRepos
                .map((r) => r.repository && r.repository.full_name && r.repository.full_name.split('/')[0])
                .filter((r) => r)
        );

        LOGGER.debug(`Got the following workspaces from the user's repos: ${mapIterable(userWorkspaces, (w) => w)}`);

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

    async enrichRepo(repo: Repo): Promise<void> {
        const config: AxiosRequestConfig = {
            url: `repositories/${repo.owner}/${repo.name}`,
            method: 'GET',
        };

        LOGGER.debug(`Submitting request to ${config.url}`);
        const response = await this.submitRequest(config);
        const data: BitbucketRepoResponse = response.data;
        repo.private = data.is_private;
        repo.defaultBranch = data.mainbranch.name;
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
