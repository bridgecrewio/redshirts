/* eslint-disable camelcase */
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiManager } from '../../common/api-manager';
import { Repo, SourceInfo, SourceType } from '../../common/types';
// import { getXDaysAgoDate } from '../../common/utils';
import { GitlabCommit, GitlabRepoResponse } from './gitlab-types';

const MAX_PAGE_SIZE = 100;

export class GitlabApiManager extends ApiManager {

   constructor(sourceInfo: SourceInfo, certPath?: string) {
      super(sourceInfo, SourceType.Gitlab, certPath);
   }

   // async getRepositories(): Promise<Repo[]> {}

   _getAxiosConfiguration(): AxiosRequestConfig {
      return this._buildAxiosConfiguration(this.sourceInfo.url, {
         Authorization: `Bearer ${this.sourceInfo.token}`,
         'Accept-Encoding': 'gzip,deflate,compress'
      });
   }

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   async getCommits(repo: Repo, lastNDays: number): Promise<GitlabCommit[]> {
      const repoPath = repo.owner + '/' + repo.name;
      console.debug(`Getting commits for repo: ${repoPath}`);
      const config: AxiosRequestConfig = {
         url: `projects/${encodeURIComponent(`${repo.owner}/${repo.name}`)}/repository/commits`,
         method: 'GET',
         params: {
            per_page: MAX_PAGE_SIZE,
           // TODO since: getXDaysAgoDate(lastNDays).toISOString(),
         },
      };

      const result: AxiosResponse = await this.paginationRequest(config);
      const commits = result?.data || [];
      console.debug(`Found ${commits.length} commits`);
      return commits;
   }

   async getUserRepos(): Promise<GitlabRepoResponse[]> {
      const config: AxiosRequestConfig = {
         url: '/user/repos',
         method: 'GET',
         params: { per_page: MAX_PAGE_SIZE },
      };
      const result: AxiosResponse = await this.paginationRequest(config);
      return result.data;
   }

   async getOrgRepos(group: string): Promise<GitlabRepoResponse[]> {
      const config: AxiosRequestConfig = {
         url: `groups/${encodeURIComponent(group)}/projects`,
         method: 'GET',
         params: {
            per_page: MAX_PAGE_SIZE,
            include_subgroups: true
         },
      };
      
      try {
         const result: AxiosResponse = await this.paginationRequest(config);
         return result.data;
      }
      catch (error) {
         if (error instanceof AxiosError && error.response?.status === 404) {
            console.debug(`Got 404 from ${config.url} call - attempting a user call`);
            config.url = `users/${encodeURIComponent(group)}/projects`;
            const result: AxiosResponse = await this.paginationRequest(config);
            return result.data;
         }

         throw error;
      }
   }

   async getUserOrgs(): Promise<unknown[]> {
      const config: AxiosRequestConfig = {
         url: '/user/orgs',
         method: 'GET',
         params: { per_page: MAX_PAGE_SIZE },
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
