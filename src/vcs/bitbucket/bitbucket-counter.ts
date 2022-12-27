import { BaseCounter } from '../../common/base-counter';
import { Repo, SourceType } from '../../common/types';
import { BitbucketCommit } from './bitbucket-types';
import { extractEmailFromRawUser } from './bitbucket-utils';

export class BitbucketCounter extends BaseCounter {

   constructor() {
      super(SourceType.Bitbucket, ['noreply@github.com']); // TODO emails
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
}
