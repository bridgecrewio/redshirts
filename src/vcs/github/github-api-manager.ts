import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { GithubCommit, GithubRepoResponse } from './github-types';
import { ApiManager } from '../../common/api-manager';
import { Repo, SourceInfo, SourceType } from '../../common/types';
import { getXDaysAgoDate } from '../../common/utils';

const MAX_PAGE_SIZE = 100;
export class GithubApiManager extends ApiManager {

   constructor(sourceInfo: SourceInfo, certPath?: string) {
      super(sourceInfo, SourceType.Github, certPath);
   }

   _getAxiosConfiguration(): AxiosRequestConfig {
      return this._buildAxiosConfiguration(this.sourceInfo.url, {
         Accept: 'application/vnd.github.machine-man-preview+json',
         Authorization: `Bearer ${this.sourceInfo.token}`,
      });
   }

   async getCommits(repo: Repo, numDays: number): Promise<GithubCommit[]> {
      const repoPath = repo.owner + '/' + repo.name;
      console.debug(`Getting commits for repo: ${repoPath}`);
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
      console.debug(`Found ${commits.length} commits`);
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
            console.debug(`Got 404 from /orgs/${org}/repos call - attempting a user call`);
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
