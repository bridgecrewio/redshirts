import { BaseCounter } from '../../common/base-counter';
import { Repo, SourceType } from '../../common/types';
import { GithubCommit, GithubSourceInfo } from './github-types';

export class GithubCounter extends BaseCounter {
   githubSourceInfo: GithubSourceInfo

   constructor(githubSourceInfo: GithubSourceInfo) {
      super(SourceType.Github, ['noreply@github.com']);
      this.githubSourceInfo = githubSourceInfo;
   }

   aggregateCommitContributors(repo: Repo, commits: GithubCommit[]): void {
      console.debug(`Processing commits for repo ${repo.owner}/${repo.name}`);
      for (const commitObject of commits.reverse()) {
         const { commit, author } = commitObject;
         const username = author.login; // we need to use this object, because the nested commit object has the display name at the time of the commit

         // TODO do we need null checks here?
         const email: string = commit?.author?.email;
         const commitDate: string = commit?.author?.date;

         this.addContributor(repo.owner, repo.name, username, email, commitDate);
      }
   }
}
