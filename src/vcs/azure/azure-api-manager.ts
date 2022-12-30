import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiManager } from '../../common/api-manager';
import { Repo, RepoResponse } from '../../common/types';
import { getXDaysAgoDate, LOGGER } from '../../common/utils';
// import { getXDaysAgoDate } from '../../common/utils';
import { AzureCommit, AzureProjectsResponse, AzureRepoResponse } from './azure-types';

const MAX_PAGE_SIZE = 100;
const API_VERSION = '7.1-preview.1';

export class AzureApiManager extends ApiManager {

    getUserRepos(): Promise<RepoResponse[]> {
        throw new Error('Method not implemented because this functionality does not work for Azure with PATs.');
    }

    _getAxiosConfiguration(): AxiosRequestConfig {
        return this._buildAxiosConfiguration(this.sourceInfo.url, {
            Authorization: `Basic ${Buffer.from(this.sourceInfo.token).toString('base64')}`,
        });
    }

    async getCommits(repo: Repo, numDays: number): Promise<AzureCommit[]> {
        const repoPath = repo.owner + '/' + repo.name;
        const [org, project] = repo.owner.split('/', 2);
        LOGGER.debug(`Getting commits for repo: ${repoPath}`);
        const config: AxiosRequestConfig = {
            url: `${org}/${project}/_apis/git/repositories/${repo.name}/commits`,
            method: 'GET',
            params: {
                $top: MAX_PAGE_SIZE,
                'searchCriteria.fromDate': getXDaysAgoDate(numDays).toISOString(),
                'api-version': API_VERSION
            },
        };

        const result: AxiosResponse = await this.submitPaginatedRequest(config);
        const commits = result?.data.value || [];
        LOGGER.debug(`Found ${commits.length} commits`);
        return commits;
    }

    async getOrgRepos(org: string): Promise<AzureRepoResponse[]> {

        const projects = await this.getOrgProjects(org);

        const repos: AzureRepoResponse[] = [];

        for (const project of projects) {
            // eslint-disable-next-line no-await-in-loop
            repos.push(...await this.getProjectRepos(project));
        }

        // org / owner does not come explicitly as a field
        return repos;
    }

    async getOrgProjects(org: string): Promise<AzureProjectsResponse[]> {
        const config: AxiosRequestConfig = {
            url: `${org}/_apis/projects`,
            method: 'GET',
            params: {
                $top: MAX_PAGE_SIZE,
                'api-version': API_VERSION
            },
        };

        const result: AxiosResponse = await this.submitPaginatedRequest(config);

        return result.data.value.map((p: AzureProjectsResponse) => {
            p.owner = org;
            return p;
        });
    }

    async getProjectRepos(project: AzureProjectsResponse): Promise<AzureRepoResponse[]> {
        const { owner, name } = project;
        const repoOwner = `${owner}/${name}`;
        LOGGER.debug(`Getting repositories for project: ${repoOwner}`);
        const config: AxiosRequestConfig = {
            url: `${owner}/${name}/_apis/git/repositories`,
            method: 'GET',
            params: {
                'api-version': API_VERSION
            },
        };

        const response = await this.axiosInstance.request(config);
        return response.data.value.map((p: AzureRepoResponse) => {
            p.owner = repoOwner;
            return p;
        });
    }

    async submitPaginatedRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
        LOGGER.debug(`Submitting request to ${config.url}`);
        let response = await this.axiosInstance.request(config);

        let total: number = response.data.count;

        const result = response;
        while (response.data.count > 0) {
            config.params.$skip = total;

            LOGGER.debug(`Fetching next page of request from ${config.url}`);

            // eslint-disable-next-line no-await-in-loop
            response = await this.axiosInstance.request(config);
            result.data.value = [...result.data.value, ...response.data.value];
            total += result.data.count;
        }

        LOGGER.debug(`Fetched ${result.data.value.length} total items`);

        return result;
    }
}
