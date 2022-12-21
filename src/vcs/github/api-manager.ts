import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { GithubSourceInfo } from '../github/types'
import { ApiManager } from '../../common/api-manager'
import { SourceType } from '../../common/types'

export class GithubApiManager extends ApiManager {
   githubSourceInfo: GithubSourceInfo
   axiosInstance: AxiosInstance

   constructor(githubSourceInfo: GithubSourceInfo) {
      super(SourceType.Github)
      this.githubSourceInfo = githubSourceInfo
      this.axiosInstance = axios.create(this._getAxiosConfiguration())
   }

   // async getRepositories(): Promise<Repo[]> {}
   //
   // async getCommits(repo: Repo): Promise<Commit[]> {}

   async getUserRepos(): Promise<unknown[]> {
      const config: AxiosRequestConfig = {
         url: '/user/repos',
         method: 'GET',
         // eslint-disable-next-line camelcase
         params: { per_page: 100 },
      }
      const result: AxiosResponse = await this.paginationRequest(config)
      return result.data
   }

   async getUserOrgs(): Promise<unknown[]> {
      const config: AxiosRequestConfig = {
         url: '/user/orgs',
         method: 'GET',
         // eslint-disable-next-line camelcase
         params: { per_page: 100 },
      }
      const result: AxiosResponse = await this.paginationRequest(config)
      return result.data
   }

   _getAxiosConfiguration(): AxiosRequestConfig {
      return {
         baseURL: this.githubSourceInfo.url,
         headers: {
            Accept: 'application/vnd.github.machine-man-preview+json',
            Authorization: `Bearer ${this.githubSourceInfo.token}`,
         },
      }
   }

   async paginationRequest(config: AxiosRequestConfig) {
      let response = await this.axiosInstance.request(config)
      const result = response
      while (response.headers.link) {
         const pages = response.headers.link.split(',')
         const nextPage = pages.find((item) => item.includes('rel="next"'))
         if (nextPage) {
            const startPos = nextPage.indexOf('<') + 1
            const endPos = nextPage.indexOf('>', startPos)
            config.url = nextPage.slice(startPos, endPos)
            // eslint-disable-next-line no-await-in-loop
            response = await this.axiosInstance.request(config)
         } else {
            break
         }
      }

      return result
   }
}
