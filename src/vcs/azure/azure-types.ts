import { RepoResponse, VCSCommit } from "../../common/types";

export type AzureAuthor = {
    name: string
    email: string
    date: string
}

export interface AzureCommit extends VCSCommit {
    author: AzureAuthor
}

export interface AzureProjectsResponse {
    id: string,
    owner: string,
    name: string,
    visibility: 'private' | 'public'
}

export interface AzureRepoResponse extends RepoResponse {
    id: string
    owner: string
    name: string
    project: {
        visibility: 'private' | 'public'
    }
}
