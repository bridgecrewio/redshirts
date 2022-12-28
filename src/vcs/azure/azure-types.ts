/* eslint-disable camelcase */
import { Commit, RepoResponse } from "../../common/types";

export type AzureAuthor = {
    name: string
    email: string
    date: string
}

export interface AzureCommit extends Commit {
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
