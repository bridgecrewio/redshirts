import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, RawAxiosRequestHeaders } from 'axios';
import { Repo, Commit, SourceInfo, RepoResponse } from './types';
import { getFileBuffer } from './utils';
import https = require('https')

export abstract class ApiManager {
   sourceInfo: SourceInfo
   sourceType: string
   certPath?: string
   cert?: Buffer
   axiosInstance: AxiosInstance

   constructor(sourceInfo: SourceInfo, sourceType: string, certPath?: string) {
      this.sourceInfo = sourceInfo;
      this.sourceType = sourceType;
      this.certPath = certPath;
      this.cert = certPath ? getFileBuffer(certPath) : undefined;
      this.axiosInstance = axios.create(this._getAxiosConfiguration());
   }

   _buildAxiosConfiguration(baseURL: string, headers?: RawAxiosRequestHeaders): AxiosRequestConfig {
      return this.cert ? {
         baseURL,
         headers,
         httpsAgent: new https.Agent({ ca: this.cert })
      } : {
         baseURL,
         headers,
      };
   }

   abstract _getAxiosConfiguration(): any
   abstract getCommits(repo: Repo, numDays: number): Promise<Commit[]>
   abstract getOrgRepos(group: string): Promise<RepoResponse[]> 
   abstract getUserRepos(): Promise<RepoResponse[]> 

   async submitPaginatedRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
      // generic pagination handler for systems that returned standardized 'Link' headers
      console.debug(`Submitting request to ${config.url}`);
      let response = await this.axiosInstance.request(config);
      const result = response;
      while (response.headers.link) {
         const pages = response.headers.link.split(',');
         const nextPage = pages.find((item) => item.includes('rel="next"'));
         if (nextPage) {
            const startPos = nextPage.indexOf('<') + 1;
            const endPos = nextPage.indexOf('>', startPos);
            config.url = nextPage.slice(startPos, endPos);

            console.debug(`Fetching next page of request from ${config.url}`);

            // eslint-disable-next-line no-await-in-loop
            response = await this.axiosInstance.request(config);
            result.data = [...result.data, ...response.data];
         } else {
            break;
         }
      }

      console.debug(`Fetched ${result.data.length} total items`);

      return result;
   }

}
