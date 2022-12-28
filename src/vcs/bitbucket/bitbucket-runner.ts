import { BaseRunner } from '../../common/base-runner';
import { Repo, SourceInfo } from '../../common/types';
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
        console.debug(`Processing commits for repo ${repo.owner}/${repo.name}`);
        for (const commitObject of commits) {
            const { author, date } = commitObject;
            const email = extractEmailFromRawUser(author.raw);

            commitObject.username = author.user.nickname;
            commitObject.commitDate = date;
            commitObject.email = email || 'unknown_email';

            this.addContributor(repo.owner, repo.name, commitObject);
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
