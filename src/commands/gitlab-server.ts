import { vcsServerFlags } from '../common/flags';
import { SourceType } from '../common/types';
import { getServerUrl, init } from '../common/utils';
import { GitlabServerApiManager } from '../vcs/gitlabServer/gitlab-server-api-manager';
import { GitlabServerRunner } from '../vcs/gitlabServer/gitlab-server-runner';
import Gitlab from './gitlab';

export default class GitlabServer extends Gitlab {
    static summary = 'Count active contributors for GitLab server (self-hosted) repos';

    static description =
        'This tool works with GitLab enterprise server v4 APIs, supported by server versions 13.x and higher. Note that earlier versions are out of support from GitLab, and thus are not supported here.';

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --token ghp_xxxx --repos bridgecrewio/checkov,try-bridgecrew/terragoat --hostname gitlab.mycompany.internal`,
        `$ <%= config.bin %> <%= command.id %> --token ghp_xxxx --groups bridgecrewio,try-bridgecrew,group/subgroup --hostname gitlab.mycompany.internal --port 9999`,
    ];

    static flags = {
        ...vcsServerFlags,
        ...Gitlab.flags,
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(GitlabServer);
        init(flags);

        const serverUrl = getServerUrl(flags.hostname, flags.port, flags.protocol);
        const baseUrl = `${serverUrl}/api/v4`;

        const sourceInfo = Gitlab.getSourceInfo(flags.token, flags['include-public'], baseUrl, SourceType.GitlabServer);

        const apiManager = new GitlabServerApiManager(sourceInfo, flags['ca-cert']);
        const runner = new GitlabServerRunner(sourceInfo, flags, apiManager);

        await runner.execute();
    }
}
