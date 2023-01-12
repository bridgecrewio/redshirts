import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { VcsSourceInfo } from './types';
import { VcsApiManager } from './vcs-api-manager';
import Bottleneck from 'bottleneck';
import { getEnvVarWithDefault, LOGGER } from './utils';

const DEFAULT_MAX_REQUESTS_PER_SECOND = '20';
export const MAX_REQUESTS_PER_SECOND_VAR = 'REDSHIRTS_MAX_REQUESTS_PER_SECOND';
export abstract class ThrottledVcsApiManager extends VcsApiManager {
    requestsPerHour: number;
    bottleneck: Bottleneck;

    constructor(sourceInfo: VcsSourceInfo, requestsPerHour: number, certPath?: string) {
        super(sourceInfo, certPath);
        this.requestsPerHour = requestsPerHour;

        const rps = Number.parseInt(getEnvVarWithDefault(MAX_REQUESTS_PER_SECOND_VAR, DEFAULT_MAX_REQUESTS_PER_SECOND));
        LOGGER.debug(`Max requests per second: ${rps}`);
        const minTime = Math.ceil(1000 / rps);
        this.bottleneck = new Bottleneck({
            reservoir: requestsPerHour,
            reservoirRefreshInterval: 3600 * 1000,
            reservoirRefreshAmount: requestsPerHour,
            maxConcurrent: 1,
            minTime,
        });
    }

    async submitRequest(config: AxiosRequestConfig, _?: AxiosResponse): Promise<AxiosResponse> {
        try {
            const response = await this.bottleneck.schedule(() => this.axiosInstance.request(config));

            if (LOGGER.level === 'debug') {
                // check log level before we do an await unnecessarily
                LOGGER.debug(`Reservoir remaining: ${await this.bottleneck.currentReservoir()}`);
            }

            if (this.logApiResponses) {
                LOGGER.debug(response);
            }

            return response;
        } catch (error) {
            if (error instanceof AxiosError && this.logApiResponses) {
                LOGGER.debug('', { response: error.response });
            }

            throw error;
        }
    }
}
