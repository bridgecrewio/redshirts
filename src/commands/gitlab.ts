/* eslint-disable no-await-in-loop */
import { Command, Flags } from '@oclif/core';
import { AxiosError } from 'axios';
import { commonFlags } from '../common/flags';
import { printSummary } from '../common/output';
import { Repo, SourceInfo } from '../common/types';
import { readRepoFile, splitRepos, stringToArr } from '../common/utils';
import { GitlabApiManager } from '../vcs/gitlab/gitlab-api-manager';
import { GitlabCounter } from '../vcs/gitlab/gitlab-counter';
import { GitlabCommit, GitlabRepoResponse } from '../vcs/gitlab/gitlab-types';

export default class Gitlab extends Command {
  static description = 'Count active contributors for GitLab repos'

   static examples = [
      `$ <%= config.bin %> <%= command.id %> --token glpat_xxxx --repos bridgecrewio/checkov,group/subgroup/terragoat`,
      `$ <%= config.bin %> <%= command.id %> --token glpat_xxxx --groups bridgecrewio,try-bridgecrew`,
   ]

   static flags = {
      token: Flags.string({
         char: 't',
         description: 'Gitlab personal access token. This token must be tied to a user that has sufficient visibility of the repo(s) being counted.',
         required: true,
      }),
      groups: Flags.string({
         description: 'Usernames or groups for which to fetch repos. These values must be the namespace name or slug, as it appears in GitLab URLs, not the display name, which might be different. Takes precendence over the --repos option.',
         required: false,
      }),
      //  TODO handled with a param in the API
      // includeSubgroups: Flags.boolean({ 
      //   description: ''
      // })
      ...commonFlags,
   }

   async run(): Promise<void> {
      const { flags } = await this.parse(Gitlab);
      let repos: Repo[] = [];
      const gitlabSourceInfo: SourceInfo = {
         url: 'https://gitlab.com/api/v4',
         token: flags.token,
      };
      const gitlabApi = new GitlabApiManager(gitlabSourceInfo, flags.cert);
      const gitlabCounter = new GitlabCounter();

      // fetch all repos for specified orgs
      if (flags.groups) {
         const groups = stringToArr(flags.groups);
         for (const group of groups) {
            console.debug(`Getting repos for group ${group}`);
            try {
              const orgRepos = (await gitlabApi.getGroupRepos(group));
              repos.push(...this.filterRepos(orgRepos));
            } catch (error) {
              if (error instanceof AxiosError) {
                console.error(`Error getting repos for the group ${group}: ${error.message}`);
              } else {
                console.error(`Error getting repos for the group ${group}:`);
                console.error(error);
             }
            }
         }
      } else if (flags.repos) {
        repos = splitRepos(flags.repos);
     } else if (flags.repoFile) {
        repos = readRepoFile(flags.repoFile);
     } else {
         const userRepos = await gitlabApi.getUserRepos();
         repos = this.filterRepos(userRepos);
      }

      for (const repo of repos) {
         try {
            const commits: GitlabCommit[] = await gitlabApi.getCommits(repo, flags.days);
            gitlabCounter.aggregateCommitContributors(repo, commits);
         } catch (error) {
            if (error instanceof AxiosError) {
               console.error(`Failed to get commits for repo ${repo.owner}/${repo.name}. Reason: ${error.response?.data?.message}`);
            }
         }
      }

      printSummary(gitlabCounter, flags.output);
   }

   filterRepos(reposResponse: GitlabRepoResponse[]): Repo[] {
      const filteredRepos: Repo[] = [];
      for (const repo of reposResponse) {
         filteredRepos.push({
            name: repo.path,
            owner: repo.namespace.full_path,
            private: repo.visibility === 'private'
         });
      }

      return filteredRepos;
   }
}
