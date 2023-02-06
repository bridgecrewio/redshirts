/* eslint-disable camelcase */
import { RepoResponse, VCSCommit } from '../../common/types';

export interface GitlabCommit extends VCSCommit {
    author_name: string;
    author_email: string;
    authored_date: string;
}

export interface GitlabRepoResponse extends RepoResponse {
    id?: number;
    name: string;
    path: string;
    namespace: {
        full_path: string;
    };
    visibility: 'private' | 'public';
}

export type GitlabGroupResponse = {
    id: number;
    full_path: string;
};
