import { Repo, SourceInfo, VCSCommit } from './types';

export const LOG_API_RESPONSES_ENV = 'REDSHIRT_LOG_API_RESPONSES';
export abstract class ApiManager {
    sourceInfo: SourceInfo;
    logApiResponses: boolean;

    constructor(sourceInfo: SourceInfo) {
        this.sourceInfo = sourceInfo;
        this.logApiResponses = process.env[LOG_API_RESPONSES_ENV]?.toLowerCase() === 'true';
    }

    abstract getCommits(repo: Repo, sinceDate: Date): Promise<VCSCommit[]>;
}
