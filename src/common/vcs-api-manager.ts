import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, RawAxiosRequestHeaders } from 'axios';
import { RepoResponse, VcsSourceInfo } from './types';
import { getFileBuffer, LOGGER } from './utils';
import https = require('https')
import { ApiManager } from './api-manager';

export abstract class VcsApiManager extends ApiManager {
    sourceInfo: VcsSourceInfo;
    certPath?: string
    cert?: Buffer
    axiosInstance: AxiosInstance

    constructor(sourceInfo: VcsSourceInfo, certPath?: string) {
        super(sourceInfo);
        this.sourceInfo = sourceInfo;
        this.certPath = certPath;
        this.cert = certPath ? getFileBuffer(certPath) : undefined;
        this.axiosInstance = axios.create(this._getAxiosConfiguration());
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
    abstract submitRequest(config: AxiosRequestConfig, previousResponse?: AxiosResponse): Promise<AxiosResponse>

    hasMorePages(response: AxiosResponse): boolean {
        return response.headers.link !== undefined && response.headers.link.includes('rel="next"');
    }

    setNextPageConfig(config: AxiosRequestConfig, response: AxiosResponse): void {
        // updates the request config in place so that it can be used to fetch the next page
        const pages = response.headers.link!.split(',');
        const nextPage = pages.find((item) => item.includes('rel="next"'));
        if (nextPage) {
            const startPos = nextPage.indexOf('<') + 1;
            const endPos = nextPage.indexOf('>', startPos);
            config.url = nextPage.slice(startPos, endPos);
        } else {
            throw new Error(`Failed to get next page data from link: ${response.headers.link}`);
        }
    }

    appendDataPage(allPages: AxiosResponse, response: AxiosResponse): void {
        // fetches the page of data from the response and appends it to the result
        // APIs that have a different response structure should override this so that
        // the right array gets set
        allPages.data = [...allPages.data, ...response.data];
    }

    setDataPage(response: AxiosResponse, data: any[]): void {
        // sets the array as the data for the result page
        // APIs should override this to set a different field in the data object
        response.data = data;
    }

    getDataPage(response: AxiosResponse): any[] {
        return response.data;
    }

    async submitPaginatedRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
        // generic pagination handler for systems that returned standardized 'Link' headers
        LOGGER.debug(`Submitting request to ${config.url}`);
        let response = await this.submitRequest(config);
        const result = response;

        let page = 1;

        while (this.hasMorePages(response)) {
            this.setNextPageConfig(config, response);
            page++;

            LOGGER.debug(`Fetching page ${page} of request from ${config.url}`);
            // eslint-disable-next-line no-await-in-loop
            response = await this.submitRequest(config, response);
            this.appendDataPage(result, response);
        }

        return result;
    }

    async submitFilteredPaginatedRequest(config: AxiosRequestConfig, filterfn: (c: any) => boolean): Promise<AxiosResponse> {
        // same as the regular pagination logic, except this one will run the filter function on each
        // page of results, and if any of the elements in that page matches, then the function
        // will stop pagination, slice off that item and everything after it, and return. 
        // This means that the filter function must use the field by which the results for the 
        // request are sorted.
        LOGGER.debug(`Submitting filtered request to ${config.url}`);
        let response = await this.submitRequest(config);
        let dataPage = this.getDataPage(response);

        // this is safe because we control the definition
        // eslint-disable-next-line unicorn/no-array-callback-reference
        const oldCommitIndex = dataPage.findIndex(filterfn);

        if (oldCommitIndex !== -1) {
            LOGGER.debug(`Found truncation marker at index ${oldCommitIndex}`);
            this.setDataPage(response, dataPage.slice(0, oldCommitIndex));
            return response;
        }

        const result = response;

        let page = 1;

        while (this.hasMorePages(response)) {
            this.setNextPageConfig(config, response);
            page++;

            LOGGER.debug(`Fetching page ${page} of request from ${config.url}`);

            // eslint-disable-next-line no-await-in-loop
            response = await this.submitRequest(config, response);
            dataPage = this.getDataPage(response);

            // eslint-disable-next-line unicorn/no-array-callback-reference
            const oldCommitIndex = dataPage.findIndex(filterfn);

            if (oldCommitIndex === -1) {
                this.appendDataPage(result, response);
            } else {
                LOGGER.debug(`Found truncation marker at index ${oldCommitIndex}`);
                this.setDataPage(result, [...result.data.values, ...dataPage.slice(0, oldCommitIndex)]);
                break;
            }
        }

        return result;
    }
}
