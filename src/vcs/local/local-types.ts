import { RepoResponse, VCSCommit } from "../../common/types";

export interface LocalCommit extends VCSCommit {
    author: string
}

export interface LocalRepoResponse extends RepoResponse {
    path: string
    remoteUrl: string
}