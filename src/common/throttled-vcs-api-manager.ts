import { AxiosRequestConfig, AxiosResponse, RawAxiosRequestHeaders } from 'axios';
import { RepoResponse, VcsSourceInfo } from './types';
import { LOGGER } from './utils';
import https = require('https')
import { VcsApiManager } from './vcs-api-manager';
import Bottleneck from 'bottleneck';


export abstract class ThrottledVcsApiManager extends VcsApiManager {
    requestsPerHour: number
    bottleneck: Bottleneck

    constructor(sourceInfo: VcsSourceInfo, requestsPerHour: number, certPath?: string) {
        super(sourceInfo, certPath);
        this.requestsPerHour = requestsPerHour;
        this.bottleneck = new Bottleneck({
            reservoir: requestsPerHour,
            reservoirRefreshInterval: 3600 * 1000,
            reservoirRefreshAmount: requestsPerHour,
            maxConcurrent: 1,
            minTime: Math.ceil(1000 * 60 * 60 / requestsPerHour)  // delay time in ms between requests
        });
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

    async submitRequest(config: AxiosRequestConfig, _?: AxiosResponse): Promise<AxiosResponse> {
        return this.bottleneck.schedule(() => this.axiosInstance.request(config));
    }

    async submitPaginatedRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
        // generic pagination handler for systems that returned standardized 'Link' headers
                
        LOGGER.debug(`Submitting page 1 of request to ${config.url}`);
        let response = await this.submitRequest(config);
        const result = response;

        let page = 1;

        while (this.hasMorePages(response)) {
            this.setNextPageConfig(config, response);
            page++;

            LOGGER.debug(`Fetching page ${page} of request from ${config.url}`);
            // eslint-disable-next-line no-await-in-loop
            response = await this.bottleneck.schedule(() => this.axiosInstance.request(config));
            this.appendDataPage(result, response);
        }

        return result;
    }
}
