/* eslint-disable camelcase */
import { RepoResponse, VCSCommit } from '../../common/types';

export interface BitbucketAuthor {
    raw: string;
    user: {
        account_id: string;
        nickname: string;
    };
}

export interface BitbucketCommit extends VCSCommit {
    author: BitbucketAuthor;
    date: string;
}

export interface BitbucketUserRepoResponse {
    repository?: {
        full_name?: string;
    };
}

export interface BitbucketRepoResponse extends RepoResponse {
    full_name: string;
    is_private: boolean;
    mainbranch: {
        name: string;
    };
}

export type BitbucketWorkspaceResponse = {
    slug: string;
};
