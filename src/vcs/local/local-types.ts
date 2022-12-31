import { RepoResponse, VCSCommit } from "../../common/types";

export interface LocalCommit extends VCSCommit {
    name: string
    email: string
    timestamp: number
}

export interface LocalRepoResponse extends RepoResponse {
    path: string
}