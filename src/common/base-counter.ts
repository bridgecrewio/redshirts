// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Commit, Contributor, ContributorMap, OutputFormat, Repo, Report, SummaryReport } from './types';

export abstract class BaseCounter {
   sourceType: string;
   excludedUsers: string[];
   contributorsByUsername: ContributorMap;
   contributorsByRepo: Map<string, ContributorMap>;

   constructor(sourceType: string, excludedUsers: Array<string>) {
      this.sourceType = sourceType;
      this.excludedUsers = excludedUsers;
      this.contributorsByUsername = new Map();
      this.contributorsByRepo = new Map();
   }

   abstract aggregateCommitContributors(repo: Repo, commits: Commit[]): void

   addEmptyRepo(repo: Repo): void {
      // Adds a repo that has no commits to the aggregation
      const repoPath = repo.owner + '/' + repo.name;
      this.contributorsByRepo.set(repoPath, new Map());
   }
   
   addContributor(repoOwner: string, repoName: string, commit: Commit): void {
      // Adds a contributor for the repo and the global list, updating the contributor metadata if necessary (email and last commit)

      const repoPath = repoOwner + '/' + repoName;

      let repoContributors = this.contributorsByRepo.get(repoPath);

      if (!repoContributors) {
         console.debug(`Creating new contributors map for repo ${repoPath}`);
         repoContributors = new Map();
         this.contributorsByRepo.set(repoPath, repoContributors);
      }

      const { username, email, commitDate } = commit;

      // handle the 2 maps separately so that we can track commit dates per repo and globally
      this.upsertContributor(repoContributors, username, email, commitDate);      
      this.upsertContributor(this.contributorsByUsername, username, email, commitDate);
   }

   upsertContributor(contributorMap: ContributorMap, username: string, email: string, commitDate: string): void {
      const contributor = contributorMap.get(username);

      if (contributor) {
         contributor.emails.add(email);
         if (contributor.lastCommitDate < commitDate) {
            contributor.lastCommitDate = commitDate;
         }
      } else {
         console.debug(`Found new contributor: ${username}, ${email}`);
         contributorMap.set(username, {
            username,
            emails: new Set([email]),
            lastCommitDate: commitDate
         });
      }
   }
}
