import axios, { AxiosInstance, AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
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
   abstract getCommits(repo: Repo, lastNDays: number): Promise<Commit[]>
   abstract getOrgRepos(group: string): Promise<RepoResponse[]> 
   abstract getUserRepos(): Promise<RepoResponse[]> 

}
