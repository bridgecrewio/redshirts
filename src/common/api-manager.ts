import { Repo, Commit } from './types'

export abstract class ApiManager {
   sourceType: string

   constructor(sourceType: string) {
      this.sourceType = sourceType
   }

   abstract _getAxiosConfiguration(): any

   // abstract getRepositories(): Promise<Repo[]>

   abstract getCommits(repo: Repo, lastNDays: number): Promise<Commit[] | []>
}
