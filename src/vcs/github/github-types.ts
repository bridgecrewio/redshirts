import { Commit } from "../../common/types";

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

export type GithubRepoResponse = {
   name: string
   owner: {
      login: string
   }
   private?: boolean
}
