import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiManager } from '../../common/api-manager';
import { Repo, RepoResponse } from '../../common/types';
import { getXDaysAgoDate, LOGGER } from '../../common/utils';
import { LocalCommit } from './local-types';

export class LocalApiManager extends ApiManager {

    getOrgRepos(_: string): Promise<RepoResponse[]> {
        throw new Error('Method not implemented because this functionality does not work for local repos');
    }

    _getAxiosConfiguration(): AxiosRequestConfig {
        throw new Error('Method not implemented because this functionality does not work for local repos');
    }

    getUserRepos(): Promise<RepoResponse[]> {
        throw new Error('Method not implemented because this functionality does not work for local repos');
    }

    async getCommits(repo: Repo, numDays: number): Promise<LocalCommit[]> {
        return [];
    }
}
