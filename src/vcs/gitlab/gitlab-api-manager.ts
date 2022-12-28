/* eslint-disable camelcase */
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiManager } from '../../common/api-manager';
import { Repo, SourceInfo, SourceType } from '../../common/types';
import { getXDaysAgoDate } from '../../common/utils';
import { GitlabCommit, GitlabGroupResponse, GitlabRepoResponse } from './gitlab-types';

const MAX_PAGE_SIZE = 100;

export class GitlabApiManager extends ApiManager {

    constructor(sourceInfo: SourceInfo, certPath?: string) {
        super(sourceInfo, SourceType.Gitlab, certPath);
    }

    _getAxiosConfiguration(): AxiosRequestConfig {
        return this._buildAxiosConfiguration(this.sourceInfo.url, {
            Authorization: `Bearer ${this.sourceInfo.token}`,
            'Accept-Encoding': 'gzip,deflate,compress'
        });
    }

    async getCommits(repo: Repo, numDays: number): Promise<GitlabCommit[]> {
        const repoPath = repo.owner + '/' + repo.name;
        console.debug(`Getting commits for repo: ${repoPath}`);
        const config: AxiosRequestConfig = {
            url: `projects/${encodeURIComponent(`${repo.owner}/${repo.name}`)}/repository/commits`,
            method: 'GET',
            params: {
                per_page: MAX_PAGE_SIZE,
                since: getXDaysAgoDate(numDays).toISOString(),
            },
        };

        const result: AxiosResponse = await this.submitPaginatedRequest(config);
        const commits = result?.data || [];
        console.debug(`Found ${commits.length} commits`);
        return commits;
    }

    async getUserRepos(): Promise<GitlabRepoResponse[]> {
        const groups = await this.getGroups();

        const groupRepos = [];

        for (const group of groups) {
            // eslint-disable-next-line no-await-in-loop
            const repos = await this.getOrgRepos(group.full_path, false);
            groupRepos.push(...repos);
        }

        console.debug(`Found ${groupRepos.length} repos in group memberships`);

        const userId = await this.getUserId();

        const config: AxiosRequestConfig = {
            url: `/users/${userId}/projects`,
            method: 'GET',
            params: {
                per_page: MAX_PAGE_SIZE,
                simple: true
            },
        };
        const result: AxiosResponse = await this.submitPaginatedRequest(config);
        const userRepos: GitlabRepoResponse[] = result.data;

        console.debug(`Found ${userRepos.length} user repos`);

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
        console.debug(`Found ${result.data.length} explicit group memberships`);

        return result.data;
    }

    async getOrgRepos(group: string, includeSubgroups = true): Promise<GitlabRepoResponse[]> {
        const config: AxiosRequestConfig = {
            url: `groups/${encodeURIComponent(group)}/projects`,
            method: 'GET',
            params: {
                per_page: MAX_PAGE_SIZE,
                include_subgroups: includeSubgroups,
                simple: true
            },
        };

        try {
            const result: AxiosResponse = await this.submitPaginatedRequest(config);
            return result.data;
        }
        catch (error) {
            if (error instanceof AxiosError && error.response?.status === 404) {
                console.debug(`Got 404 from ${config.url} call - attempting a user call`);
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
}
