import { AxiosError, AxiosRequestConfig, AxiosResponse, RawAxiosRequestHeaders } from 'axios';
import { RateLimitStatus, RepoResponse, VcsSourceInfo } from './types';
import { LOGGER, sleepUntilDateTime } from './utils';
import https = require('https')
import { VcsApiManager } from './vcs-api-manager';

export abstract class RateLimitVcsApiManager extends VcsApiManager {

    rateLimitRemainingHeader: string
    rateLimitResetHeader: string
    rateLimitEndpoint?: string
    lastResponse?: AxiosResponse

    constructor(sourceInfo: VcsSourceInfo, rateLimitRemainingHeader: string, rateLimitResetHeader: string, rateLimitEndpoint?: string, certPath?: string) {
        super(sourceInfo, certPath);
        this.rateLimitRemainingHeader = rateLimitRemainingHeader;
        this.rateLimitResetHeader = rateLimitResetHeader;
        this.rateLimitEndpoint = rateLimitEndpoint;
    }

    _buildAxiosConfiguration(baseURL: string, headers?: RawAxiosRequestHeaders): AxiosRequestConfig {
        return this.cert ? {
            baseURL,
            headers,
            httpsAgent: new https.Agent({ ca: this.cert })
        } : {
            baseURL,
            headers,
        };
    }

    abstract _getAxiosConfiguration(): any
    abstract getOrgRepos(group: string): Promise<RepoResponse[]>
    abstract getUserRepos(): Promise<RepoResponse[]>
    
    async checkRateLimitStatus(): Promise<RateLimitStatus | undefined> {

        if (!this.rateLimitEndpoint) {
            return undefined;
        }

        const config: AxiosRequestConfig = {
            url: this.rateLimitEndpoint,
            method: 'GET',
        };

        // let requestNum = 0;
        // while (requestNum++ < 2000) {
        //     LOGGER.debug(`Submitting request ${requestNum}`);

        //     let r: AxiosResponse | undefined;
            
        //     try {
        //         // eslint-disable-next-line no-await-in-loop
        //         r = await this.submitRequest(config, r);
        //         console.debug(r.status);
        //         console.debug(Object.keys(r.headers));
        //     } catch (error) {
        //         console.debug('Caught error');
        //         console.debug(error);
        //         throw error;
        //     }
        // }

        const response = await this.axiosInstance.request(config);

        return this.getRateLimitStatus(response);
    }

    getRateLimitStatus(response?: AxiosResponse<any, any>): RateLimitStatus | undefined {
        // returns the rate limit status from this response, if present, otherwise from this.lastResponse, otherwise undefined
        const r = response || this.lastResponse || undefined;
        return r && this.rateLimitRemainingHeader in r.headers ? {
            remaining: Number.parseInt(r.headers[this.rateLimitRemainingHeader]!),
            reset: new Date(Number.parseInt(r.headers[this.rateLimitResetHeader]!) * 1000)
        } : undefined;
    }

    async submitRequest(config: AxiosRequestConfig, previousResponse?: AxiosResponse): Promise<AxiosResponse> {
        await this.handleRateLimit(previousResponse);
        try {
            this.lastResponse = await this.axiosInstance.request(config);
            return this.lastResponse;
        } catch (error) {
            if (error instanceof AxiosError && error.response?.status === 429) {
                // now we expect the rate limit details to be in the header
                return this.submitRequest(config, error.response);
            }

            throw error;
        }
    }

    async handleRateLimit(response?: AxiosResponse): Promise<void> {
        const rateLimitStatus = this.getRateLimitStatus(response) || await this.checkRateLimitStatus();
        LOGGER.debug(`Rate limit remaining: ${rateLimitStatus ? rateLimitStatus.remaining : 'unknown'}`);
        // <= to handle a weird edge case I encountered but coult not reproduce
        // Not 0 for a small concurrency buffer for other uses of this token
        if (rateLimitStatus && rateLimitStatus.remaining <= 0) {
            LOGGER.warn('Hit rate limit for VCS');
            await sleepUntilDateTime(new Date(rateLimitStatus.reset!.getTime() + 10000)); // 10 second buffer
        }
    }
}
