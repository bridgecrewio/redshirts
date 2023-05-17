import { Command, Flags } from '@oclif/core';
import { CLIError } from '@oclif/errors';
import { commonFlags } from '../common/flags';
import { HelpGroup, SourceType } from '../common/types';
import { deleteFlagKey, init } from '../common/utils';
import { LocalApiManager } from '../vcs/local/local-api-manager';
import { LocalRunner } from '../vcs/local/local-runner';

export default class Local extends Command {
    static summary = 'Count active contributors in local directories using `git log`';

    static description =
        'Note that `local` mode has no way to determine if a repo is public or private. Thus, all repos will be counted, and this may cause different behavior in the platform, which does not include public repos in the contributor count.';

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --repos . --skip-repos ./terragoat`,
        `$ <%= config.bin %> <%= command.id %> --repos ~/repos,/tmp/repo,/tmp/repo/submodule`,
    ];

    static flags = {
        directories: Flags.string({
            description:
                '(One of --directories or --directory-file is required.) A comma-separated list of relative or absolute paths to directories on the file system that contain git repositories. The tool will traverse this directory recursively, stopping at any directories with a .git directory (the root of a repo) - it will not traverse more deeply than that. This means that if you have a repo with a submodule, you should specify the submodule directory explicitly here. If you have directories with commas in the name, use the --directory-file option. If you specify --directories, --directory-file is ignored.',
            required: false,
            aliases: ['dirs'],
            char: 'd',
            helpGroup: HelpGroup.REPO_SPEC,
        }),
        'directory-file': Flags.string({
            description:
                '(One of --directories or --directory-file is required.) A file containing a list of directories to scan, one per line. See --directories for more details.',
            required: false,
            aliases: ['dir-file'],
            helpGroup: HelpGroup.REPO_SPEC,
        }),
        'skip-directories': Flags.string({
            description:
                'A comma-separated list of relative or absolute paths of directories within the directories of --directories to skip. Relative paths are based on the directory from which you run the tool, not relative to the directories in the --directory list. It is recommended to use absolute paths for skipping directories. Once any skipped directory is reached, traversing of that part of the directory tree immediately stops.',
            required: false,
            aliases: ['skip-dirs'],
            helpGroup: HelpGroup.REPO_SPEC,
        }),
        'skip-directory-file': Flags.string({
            description:
                'A file containing a list of directories to scan, one per line. See --skip-directories for more details.',
            required: false,
            aliases: ['skip-dir-file'],
            helpGroup: HelpGroup.REPO_SPEC,
        }),
        ...deleteFlagKey(commonFlags, 'include-public', 'ca-cert'),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Local);
        init(flags, this.config);

        if (!(flags.directories || flags['directory-file'])) {
            throw new CLIError('At least one of --directories or --directory-file is required for running locally.');
        }

        const sourceInfo = {
            sourceType: SourceType.Local,
            url: '',
            token: '',
            repoTerm: 'repo',
            orgTerm: 'directory',
            orgFlagName: '',
            minPathLength: 1,
            maxPathLength: 9999,
        };

        const apiManager = new LocalApiManager(sourceInfo);
        const runner = new LocalRunner(sourceInfo, flags, apiManager);

        await runner.execute();
    }
}
