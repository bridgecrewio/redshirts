import { Repo } from '../../common/types';
import { LOGGER } from '../../common/utils';
import { BitbucketRunner } from '../bitbucket/bitbucket-runner';
import { BitbucketServerCommit, BitbucketServerRepoResponse } from './bitbucket-server-types';

export class BitbucketServerRunner extends BitbucketRunner {
    aggregateCommitContributors(repo: Repo, commits: BitbucketServerCommit[]): void {
        LOGGER.debug(`Processing commits for repo ${repo.owner}/${repo.name}`);
        for (const commitObject of commits) {
            const newCommit = {
                username: commitObject.author.name,
                email: commitObject.author.emailAddress,
                commitDate: new Date(commitObject.authorTimestamp).toISOString(),
            };

            this.addContributor(repo.owner, repo.name, newCommit);
        }
    }

    convertRepos(reposResponse: BitbucketServerRepoResponse[]): Repo[] {
        const filteredRepos: Repo[] = [];
        for (const repo of reposResponse) {
            filteredRepos.push({
                name: repo.slug,
                owner: repo.project.key,
                private: !repo.public,
            });
        }

        return filteredRepos;
    }
}
