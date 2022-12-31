import { ApiManager } from '../../common/api-manager';
import { Repo } from '../../common/types';
import { getXDaysAgoDate } from '../../common/utils';
import { LocalCommit } from './local-types';

// TODO author or committer?
// const GIT_LOG_COMMAND = 'git log --all --date=raw --format="--commit--%nauthor:%an%nemail:%ae%ndate:%at%n"';

export class LocalApiManager extends ApiManager {

    async getCommits(_: Repo, numDays: number): Promise<LocalCommit[]> {
        const sinceDate = getXDaysAgoDate(numDays).getTime();
        return [];
    }
}
