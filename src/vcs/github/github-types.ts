import { Commit, RepoResponse } from "../../common/types";

export type Author = {
   name: string
   email: string
   date: string
}

export interface GithubCommit extends Commit {
   author: {
      login: string
   }
   commit: {
      author: Author
   }
}

export interface GithubRepoResponse extends RepoResponse {
   name: string
   owner: {
      login: string
   }
   private?: boolean
}
