import { BitbucketCommit, BitbucketRepoResponse } from "../bitbucket/bitbucket-types";

export interface BitbucketServerCommit extends BitbucketCommit {
    committer: {
        name: string,
        emailAddress: string
    },
    committerTimestamp: number
}

export interface BitbucketServerRepoResponse extends BitbucketRepoResponse {
    slug: string
    project: {
        key: string
    }
    public: boolean
}
