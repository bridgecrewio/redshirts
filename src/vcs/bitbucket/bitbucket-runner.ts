import { BaseRunner } from '../../common/base-runner';
import { Repo, SourceInfo } from '../../common/types';
import { LOGGER } from '../../common/utils';
import { BitbucketApiManager } from './bitbucket-api-manager';
import { BitbucketCommit, BitbucketRepoResponse } from './bitbucket-types';
import { extractEmailFromRawUser } from './bitbucket-utils';

export class BitbucketRunner extends BaseRunner {

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(sourceInfo: SourceInfo, flags: any, apiManager: BitbucketApiManager) {
        super(sourceInfo, ['noreply@github.com'], flags, apiManager); // TODO emails
    }

    aggregateCommitContributors(repo: Repo, commits: BitbucketCommit[]): void {
        // TODO exclude emails
        LOGGER.debug(`Processing commits for repo ${repo.owner}/${repo.name}`);
        for (const commitObject of commits) {
            const { author, date } = commitObject;
            const email = extractEmailFromRawUser(author.raw);

            const newCommit = {
                username: author.user.nickname,
                email: email || 'unknown_email',
                commitDate: date
            };

            this.addContributor(repo.owner, repo.name, newCommit);
        }
    }

    convertRepos(reposResponse: BitbucketRepoResponse[]): Repo[] {
        const filteredRepos: Repo[] = [];
        for (const repo of reposResponse) {
            const nameParts = repo.full_name.split('/');
            filteredRepos.push({
                name: nameParts[1],
                owner: nameParts[0],
                private: repo.is_private,
            });
        }

        return filteredRepos;
    }
}
