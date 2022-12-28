/* eslint-disable camelcase */
import { Commit, RepoResponse } from "../../common/types";

export type BitbucketAuthor = {
    raw: string,
    user: {
        account_id: string
        nickname: string
    }
}

export interface BitbucketCommit extends Commit {
    author: BitbucketAuthor,
    date: string
}

export interface BitbucketUserRepoResponse {
    repository?: {
        full_name?: string
    }
}

export interface BitbucketRepoResponse extends RepoResponse {
    full_name: string
    is_private: boolean
}

export type BitbucketWorkspaceResponse = {
    slug: string
}
