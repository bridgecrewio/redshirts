import { BaseCounterClass } from '../../common/base-counter'
import { Contributor, ContributorMap, SourceType } from '../../common/types'
import { GithubCommit, GithubSourceInfo } from './types'

export class GithubCounter extends BaseCounterClass {
   githubSourceInfo: GithubSourceInfo

   constructor(githubSourceInfo: GithubSourceInfo) {
      super(SourceType.Github, ['noreply@github.com'])
      this.githubSourceInfo = githubSourceInfo
   }

   convertCommitsToContributors(commits: GithubCommit[]): ContributorMap {
      const contributorMap: ContributorMap = new Map()
      for (const commitObject of commits) {
         const { commit } = commitObject
         const email: string = commit?.author?.email
         const username: string = commit?.author?.name
         const lastCommitDate: string = commit?.author?.date
         if (email && !contributorMap.has(email)) {
            const contributor: Contributor = { email, username, lastCommitDate }
            contributorMap.set(email, contributor)
         }
      }

      return contributorMap
   }
}
