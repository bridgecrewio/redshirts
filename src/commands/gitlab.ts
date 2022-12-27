import { Flags } from '@oclif/core';
import { commonFlags } from '../common/flags';
import { RedshirtsCommand } from '../common/redshirts-command';
import { HelpGroup, Repo, } from '../common/types';
import { GitlabApiManager } from '../vcs/gitlab/gitlab-api-manager';
import { GitlabCounter } from '../vcs/gitlab/gitlab-counter';
import { GitlabRepoResponse } from '../vcs/gitlab/gitlab-types';

export default class Gitlab extends RedshirtsCommand {
  static description = 'Count active contributors for GitLab repos'

  static examples = [
    `$ <%= config.bin %> <%= command.id %> --token glpat_xxxx --repos bridgecrewio/checkov,group/subgroup/terragoat`,
    `$ <%= config.bin %> <%= command.id %> --token glpat_xxxx --groups bridgecrewio,try-bridgecrew,group/subgroup`,
  ]

  static flags = {
    token: Flags.string({
      char: 't',
      description: 'Gitlab personal access token. This token must be tied to a user that has sufficient visibility of the repo(s) being counted.',
      required: true,
      helpGroup: HelpGroup.AUTH
    }),
    groups: Flags.string({
      description: 'Group names and / or usernames for which to fetch repos. These values must be the namespace slug, as it appears in GitLab URLs, not the display name, which might be different. For groups, includes all subgroups. For users, this will only include repos owned by that user. Use the --repos option to add additional specific repos on top of those in the specified group(s). Use the --skip-repos option to exclude individual repos that are a part of these group(s).',
      required: false,
      helpGroup: HelpGroup.REPO_SPEC
    }),
    ...commonFlags,
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Gitlab);

    const sourceInfo = {
      url: 'https://gitlab.com/api/v4',
      token: flags.token,
      repoTerm: 'project',
      orgTerm: 'group',
      orgFlagName: 'groups'
    };

    const apiManager = new GitlabApiManager(sourceInfo, flags['ca-cert']);
    const counter = new GitlabCounter();

    await this.execute(flags, sourceInfo, apiManager, counter);
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
