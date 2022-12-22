import { Commit, SourceInfo } from '../../common/types'

export type author = {
   name: string
   email: string
   date: string
}

export interface GithubSourceInfo extends SourceInfo {
   orgs?: string[]
}

export interface GithubCommit extends Commit {
   author: {
      login: string
   }
   commit: {
      author: author
   }
}
