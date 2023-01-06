import { AxiosError, AxiosRequestConfig } from 'axios';
import { RateLimitStatus } from '../../common/types';
import { LOGGER } from '../../common/utils';
import { GithubApiManager } from '../github/github-api-manager';

export class GithubServerApiManager extends GithubApiManager {
    _getAxiosConfiguration(): AxiosRequestConfig {
        return this._buildAxiosConfiguration(this.sourceInfo.url, {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${this.sourceInfo.token}`
        });
    }

    async checkRateLimitStatus(): Promise<RateLimitStatus | undefined> {

        // the github server rate limit endpoint returns a 404 if rate limiting is not enabled

        const config: AxiosRequestConfig = {
            url: this.rateLimitEndpoint,
            method: 'GET',
        };

        try {
            const response = await this.axiosInstance.request(config);
            if (this.logApiResponses) {
                LOGGER.debug('', { response });
            }

            return this.getRateLimitStatus(response);
        } catch (error) {
            if (error instanceof AxiosError && error.response?.data.message === 'Rate limiting is not enabled.') {
                return undefined;
            }

            throw error;
        }
    }
}
