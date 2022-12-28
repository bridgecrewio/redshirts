import { Commit, RepoResponse } from "../../common/types";

export type GithubAuthor = {
    name: string
    email: string
    date: string
}

export interface GithubCommit extends Commit {
    author: {
        login: string
    }
    commit: {
        author: GithubAuthor
    }
}

export interface GithubRepoResponse extends RepoResponse {
    name: string
    owner: {
        login: string
    }
    private?: boolean
}
