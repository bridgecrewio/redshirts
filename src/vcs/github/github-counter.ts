import { BaseCounterClass } from '../../common/base-counter'
import { Contributor, SourceType } from '../../common/types'
import { GithubCommit, GithubSourceInfo } from './types'

export class GithubCounter extends BaseCounterClass {
   githubSourceInfo: GithubSourceInfo

   constructor(githubSourceInfo: GithubSourceInfo) {
      super(SourceType.Github, ['noreply@github.com'])
      this.githubSourceInfo = githubSourceInfo
   }

   convertCommitsToContributors(commits: GithubCommit[]): Contributor[] {
      
      const contributors: Contributor[] = [];

      for (const commitObject of commits) {
         const { commit } = commitObject
         const email: string = commit?.author?.email
         const name: string = commit?.author?.name
         const lastCommitDate: string = commit?.author?.date
         if (email && !contributorMap.has(email)) {
            const contributor: Contributor = { email, name, lastCommitDate }
            contributorMap.set(email, contributor)
         }
      }
   }
}
