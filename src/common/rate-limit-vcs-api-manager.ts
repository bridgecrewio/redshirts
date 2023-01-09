import { AxiosError, AxiosRequestConfig, AxiosResponse, RawAxiosRequestHeaders } from 'axios';
import { RateLimitStatus, RepoResponse, VcsSourceInfo } from './types';
import { getEnvVarWithDefault, LOGGER, sleepUntilDateTime } from './utils';
import https = require('https');
import { VcsApiManager } from './vcs-api-manager';

const REQUESTS_REMAINING_BUFFER_ENV_VAR = 'REDSHIRTS_REQUESTS_REMAINING_BUFFER';
const DEFAULT_REQUESTS_REMAINING_BUFFER = '5';
export abstract class RateLimitVcsApiManager extends VcsApiManager {
    rateLimitRemainingHeader: string;
    rateLimitResetHeader: string;
    rateLimitEndpoint?: string;
    lastResponse?: AxiosResponse;
    requestRemainingBuffer: number;

    constructor(
        sourceInfo: VcsSourceInfo,
        rateLimitRemainingHeader: string,
        rateLimitResetHeader: string,
        rateLimitEndpoint?: string,
        certPath?: string
    ) {
        super(sourceInfo, certPath);
        this.rateLimitRemainingHeader = rateLimitRemainingHeader;
        this.rateLimitResetHeader = rateLimitResetHeader;
        this.rateLimitEndpoint = rateLimitEndpoint;

        this.requestRemainingBuffer = Number.parseInt(
            getEnvVarWithDefault(REQUESTS_REMAINING_BUFFER_ENV_VAR, DEFAULT_REQUESTS_REMAINING_BUFFER)
        );
        LOGGER.debug(`Request remaining buffer: ${this.requestRemainingBuffer}`);
    }

    _buildAxiosConfiguration(baseURL: string, headers?: RawAxiosRequestHeaders): AxiosRequestConfig {
        return this.cert
            ? {
                  baseURL,
                  headers,
                  httpsAgent: new https.Agent({ ca: this.cert }),
              }
            : {
                  baseURL,
                  headers,
              };
    }

    abstract _getAxiosConfiguration(): any;
    abstract getOrgRepos(group: string): Promise<RepoResponse[]>;
    abstract getUserRepos(): Promise<RepoResponse[]>;

    async checkRateLimitStatus(): Promise<RateLimitStatus | undefined> {
        if (!this.rateLimitEndpoint) {
            return undefined;
        }

        const config: AxiosRequestConfig = {
            url: this.rateLimitEndpoint,
            method: 'GET',
        };

        // TODO remove - test code to hit rate limits
        // let requestNum = 0;
        // while (requestNum++ < 2000) {
        //     LOGGER.debug(`Submitting request ${requestNum}`);

        //     let r: AxiosResponse | undefined;

        //     try {
        //                 //         r = await this.submitRequest(config, r);
        //         console.debug(r.status);
        //         console.debug(Object.keys(r.headers));
        //     } catch (error) {
        //         console.debug('Caught error');
        //         console.debug(error);
        //         throw error;
        //     }
        // }

        const response = await this.axiosInstance.request(config);
        if (this.logApiResponses) {
            LOGGER.debug('', { response });
        }

        return this.getRateLimitStatus(response);
    }

    getRateLimitStatus(response?: AxiosResponse<any, any>): RateLimitStatus | undefined {
        // returns the rate limit status from this response, if present, otherwise from this.lastResponse, otherwise undefined
        const r = response || this.lastResponse || undefined;
        return r && this.rateLimitRemainingHeader in r.headers
            ? {
                  remaining: Number.parseInt(r.headers[this.rateLimitRemainingHeader]!),
                  reset: new Date(Number.parseInt(r.headers[this.rateLimitResetHeader]!) * 1000),
              }
            : undefined;
    }

    async submitRequest(config: AxiosRequestConfig, previousResponse?: AxiosResponse): Promise<AxiosResponse> {
        await this.handleRateLimit(previousResponse);
        try {
            this.lastResponse = await this.axiosInstance.request(config);
            if (this.logApiResponses) {
                LOGGER.debug('', { response: this.lastResponse });
            }

            return this.lastResponse;
        } catch (error) {
            if (error instanceof AxiosError) {
                if (error.response?.status === 429) {
                    // now we expect the rate limit details to be in the header, which will get checked in handleRateLimit on the following call
                    return this.submitRequest(config, error.response);
                }

                if (this.logApiResponses) {
                    LOGGER.debug('', { response: error.response });
                }
            }

            throw error;
        }
    }

    async handleRateLimit(response?: AxiosResponse): Promise<void> {
        // only explicitly check the rate limit status if we do not have a previous response yet
        // this prevents unnecessary calls to the check rate limit endpoint in the case where
        // rate limiting is not enabled or the system does not send data in the response headers consistently
        const rateLimitStatus = response
            ? this.getRateLimitStatus(response)
            : this.lastResponse
            ? this.getRateLimitStatus(this.lastResponse)
            : await this.checkRateLimitStatus();

        LOGGER.debug(`Rate limit remaining: ${rateLimitStatus ? rateLimitStatus.remaining : 'unknown'}`);
        // <= to handle a weird edge case I read about but coult not reproduce
        if (rateLimitStatus && rateLimitStatus.remaining <= this.requestRemainingBuffer) {
            LOGGER.warn('Hit rate limit for VCS');
            await sleepUntilDateTime(new Date(rateLimitStatus.reset!.getTime() + 10000)); // 10 second buffer
        }
    }
}
