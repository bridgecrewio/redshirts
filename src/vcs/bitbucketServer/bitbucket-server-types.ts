import { VcsSourceInfo } from '../../common/types';
import { BitbucketAuthor, BitbucketCommit, BitbucketRepoResponse } from '../bitbucket/bitbucket-types';

export interface BitbucketServerVcsSourceInfo extends VcsSourceInfo {
    username?: string;
}

export interface BitbucketServerAuthor extends BitbucketAuthor {
    name: string;
    emailAddress: string;
}

export interface BitbucketServerCommit extends BitbucketCommit {
    author: BitbucketServerAuthor;
    authorTimestamp: number;
}

export interface BitbucketServerRepoResponse extends BitbucketRepoResponse {
    slug: string;
    project: {
        key: string;
    };
    public: boolean;
}
