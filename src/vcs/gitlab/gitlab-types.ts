/* eslint-disable camelcase */
import { Commit, RepoResponse } from "../../common/types";

export type GitlabAuthor = {
    name: string
    email: string
    date: string
}

export interface GitlabCommit extends Commit {
    // TODO gitlab commits do not have a username. Need to handle?
    committer_name: string,
    committer_email: string,
    committed_date: string
}

export interface GitlabRepoResponse extends RepoResponse {
    id?: number
    name: string
    path: string
    namespace: {
        full_path: string
    }
    visibility: "private" | "public"
}

export type GitlabGroupResponse = {
    id: number
    full_path: string
}