import { AxiosRequestConfig } from 'axios';
import { GithubApiManager } from '../github/github-api-manager';

export class GithubServerApiManager extends GithubApiManager {
    _getAxiosConfiguration(): AxiosRequestConfig {
        return this._buildAxiosConfiguration(this.sourceInfo.url, {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${this.sourceInfo.token}`
        });
    }
}
