import { Repo, VcsSourceInfo } from '../../common/types';
import { LOGGER } from '../../common/utils';
import { VcsRunner } from '../../common/vcs-runner';
import { BitbucketApiManager } from './bitbucket-api-manager';
import { BitbucketCommit, BitbucketRepoResponse } from './bitbucket-types';
import { extractEmailFromRawUser } from './bitbucket-utils';

export class BitbucketRunner extends VcsRunner {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(sourceInfo: VcsSourceInfo, flags: any, apiManager: BitbucketApiManager) {
        super(sourceInfo, [], [], flags, apiManager);
    }

    aggregateCommitContributors(repo: Repo, commits: BitbucketCommit[]): void {
        LOGGER.debug(`Processing commits for repo ${repo.owner}/${repo.name}`);
        for (const commitObject of commits) {
            const { author, date } = commitObject;
            const email = extractEmailFromRawUser(author.raw);

            const newCommit = {
                username: author.user.nickname,
                email: email || author.raw,
                commitDate: date,
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
                defaultBranch: repo.mainbranch.name,
            });
        }

        return filteredRepos;
    }
}
