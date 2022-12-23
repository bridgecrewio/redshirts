import { AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import { Repo, Commit } from './types';
import { readFile } from './utils';
import https = require('https')

export abstract class ApiManager {
   sourceType: string
   certPath?: string
   cert?: Buffer

   constructor(sourceType: string, certPath?: string) {
      this.sourceType = sourceType;
      this.certPath = certPath;
      this.cert = certPath ? readFile(certPath) : undefined;
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

   // abstract getRepositories(): Promise<Repo[]>

   abstract getCommits(repo: Repo, lastNDays: number): Promise<Commit[] | []>
}
