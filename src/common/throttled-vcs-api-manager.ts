import { AxiosRequestConfig, AxiosResponse, RawAxiosRequestHeaders } from 'axios';
import { RepoResponse, VcsSourceInfo } from './types';
import https = require('https')
import { VcsApiManager } from './vcs-api-manager';
import Bottleneck from 'bottleneck';
import { LOGGER } from './utils';


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
            minTime: 100
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
        const response = await this.bottleneck.schedule(() => this.axiosInstance.request(config));
        
        if (LOGGER.level === 'debug') {
            LOGGER.debug(`Reservoir remaining: ${await this.bottleneck.currentReservoir()}`);
        }
        
        return response;
    }
}
