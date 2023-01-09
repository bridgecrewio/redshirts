# Local mode

If you wish, you can run the counting tool over repos you have cloned on your system. This can be an alternative when you have issues connecting to the VCS from your machine (e.g., due to VPN) or if your server has aggressive rate limiting that makes the tool take too long to run.

This is by far the fastest way to run the tool, but it has some specific limitations to be aware of:

-   You must have the repos cloned locally and you must be on the default branch (`git checkout <defaut branch>`)
-   The repos must be updated (i.e., run `git fetch && git pull` on the default branch)
-   There is no way to determine if the repo is public or private

These things may make the count differ from what you see once you connect the repo to the platform.

## Specifying directories

Use the `--directories` option to specify one or more directories to scan for git repos. Each directory will be traversed recursively until a `.git` file or directory is found, at which point the tool will look no deeper. This means that git submodules must be explicitly specified. This is the same way that the Prisma Cloud Code Security module processes repos. It also prevents us from time-consuming traversals of directories like `node_modules`, `venv`, etc. It is generally better to clone the submodule repo separately and count it independently.

You can also use the `--skip-directories` option to skip any particular directories within the directories of `--directories`.

You can use relative or absolute paths for these directories, but all paths you supply will be converted to absolute paths _before_ processing them.

This means that if you wish to skip a particular directory within another directory, you must provide an absolute path to the directory to skip. In other words, `--skip-directories dir1` will not skip all instances of `dir1`. It will only skip `/absolute/path/to/currentdirectory/dir1` if it happens to encounter it while traversing the `--dirs` list.

You can also use the `--directory-file` and `-skip-directory-file` options to list the directories to scan / skip via file. This is required if you have directories with a comma in the name.

### Examples

Assume we have the following directory structure on our system:

```
/
├── home
│   ├── documents
│   │   └── meeting_notes
│   ├── misc_repos
│   │   ├── hcl2
│   │   │   └── .git
│   │   └── terraformer
│   │       └── .git
│   ├── platform_repos
│   │   ├── backend
│   │   │   └── .git
│   │   └── frontend
│   │       ├── .git
│   │       └── submodule
│   │           └── .git
│   └── random_repo
│       └── .git
└── tmp
    ├── checkov
    │   └── .git
    └── terragoat
        └── .git
```

If we use absolute paths, the behavior is the same no matter what our current working directory is when we run the following commands:

| Arguments                                                                    | Directories / repos scanned                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `--directories /home/platform_repos`                                         | `backend`, `frontend` (but not `frontend/submodule`)                     |
| `--directories /home/platform_repos,/home/platform_repos/frontend/submodule` | `backend`, `frontend`, `frontend/submodule`                              |
| `--directories /home`                                                        | `hcl2`, `terraformer`, `backend`, `frontend`, `random_repo`              |
| `--directories /home --skip-directories /home/platform_repos`                | `hcl2`, `terraformer`, `random_repo`                                     |
| `--directories / --skip-directories /tmp/checkov`                            | `hcl2`, `terraformer`, `backend`, `frontend`, `random_repo`, `terragoat` |

If we use relative paths, the behavior depends on our current directory. For the following commands, assume our current working directory is `/home/platform_repos`.

| Arguments                                                         | Directories / repos scanned                                                                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `--directories .`                                                 | `backend`, `frontend`                                                                                                       |
| `--directories .,frontend/submodule`                              | `backend`, `frontend`, `frontend/submodule`                                                                                 |
| `--directories . --skip-directories frontend`                     | `backend`                                                                                                                   |
| `--directories /tmp --skip-directories checkov`                   | `checkov`, `terragoat` (`checkov` is not skipped, because we convert it to an absolute path based on the current directory) |
| `--directories .,/tmp --skip-directories frontend,/tmp/terragoat` | `backend`, `checkov`                                                                                                        |
