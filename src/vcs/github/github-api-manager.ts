import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { GithubSourceInfo, GithubCommit, RepoResponse } from './github-types';
import { ApiManager } from '../../common/api-manager';
import { Repo, SourceType } from '../../common/types';
import { getXDaysAgoDate } from '../../common/utils';

export class GithubApiManager extends ApiManager {
   githubSourceInfo: GithubSourceInfo
   axiosInstance: AxiosInstance

   constructor(githubSourceInfo: GithubSourceInfo, certPath?: string) {
      super(SourceType.Github, certPath);
      this.githubSourceInfo = githubSourceInfo;

      this.axiosInstance = axios.create(this._getAxiosConfiguration());
   }

   // async getRepositories(): Promise<Repo[]> {}

   _getAxiosConfiguration(): AxiosRequestConfig {
      return this._buildAxiosConfiguration(this.githubSourceInfo.url, {
         Accept: 'application/vnd.github.machine-man-preview+json',
         Authorization: `Bearer ${this.githubSourceInfo.token}`,
      });
   }

   async getCommits(repo: Repo, lastNDays: number): Promise<GithubCommit[]> {
      const repoPath = repo.owner + '/' + repo.name;
      console.debug(`Getting commits for repo: ${repoPath}`);
      const config: AxiosRequestConfig = {
         url: `repos/${repo.owner}/${repo.name}/commits`,
         method: 'GET',
         params: {
            // eslint-disable-next-line camelcase
            per_page: 100,
            since: getXDaysAgoDate(lastNDays).toISOString(),
         },
      };

      const result: AxiosResponse = await this.paginationRequest(config);
      const commits = result?.data || [];
      console.debug(`Found ${commits.length} commits`);
      return commits;
   }

   async getUserRepos(): Promise<RepoResponse[]> {
      const config: AxiosRequestConfig = {
         url: '/user/repos',
         method: 'GET',
         // eslint-disable-next-line camelcase
         params: { per_page: 100 },
      };
      const result: AxiosResponse = await this.paginationRequest(config);
      return result.data;
   }

   async getOrgRepos(org: string): Promise<RepoResponse[]> {
      const config: AxiosRequestConfig = {
         url: `/orgs/${org}/repos`,
         method: 'GET',
         // eslint-disable-next-line camelcase
         params: { per_page: 100 },
      };
      const result: AxiosResponse = await this.paginationRequest(config);
      return result.data;
   }

   async getUserOrgs(): Promise<unknown[]> {
      const config: AxiosRequestConfig = {
         url: '/user/orgs',
         method: 'GET',
         // eslint-disable-next-line camelcase
         params: { per_page: 100 },
      };
      const result: AxiosResponse = await this.paginationRequest(config);
      return result.data;
   }

   async paginationRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
      let response = await this.axiosInstance.request(config);
      const result = response;
      while (response.headers.link) {
         const pages = response.headers.link.split(',');
         const nextPage = pages.find((item) => item.includes('rel="next"'));
         if (nextPage) {
            const startPos = nextPage.indexOf('<') + 1;
            const endPos = nextPage.indexOf('>', startPos);
            config.url = nextPage.slice(startPos, endPos);
            // eslint-disable-next-line no-await-in-loop
            response = await this.axiosInstance.request(config);
            result.data = [...result.data, ...response.data];
         } else {
            break;
         }
      }

      return result;
   }
}