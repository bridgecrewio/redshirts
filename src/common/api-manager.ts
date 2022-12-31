import { Repo, SourceInfo, VCSCommit } from './types';

export abstract class ApiManager {
    sourceInfo: SourceInfo

    constructor(sourceInfo: SourceInfo) {
        this.sourceInfo = sourceInfo;
    }

    abstract getCommits(repo: Repo, numDays: number): Promise<VCSCommit[]>
}
