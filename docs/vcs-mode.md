# VCS mode

In VCS mode, the tool will use your personal access token (see [Authentication](#authentication)) to connect to the VCS and obtain real-time commit data. This is the most accurate and comprehensive mode, and we recommend using it as a first choice. The tool supports the same systems as Prisma Cloud Code Security:

-   GitHub and GitHub enterprise server
-   Bitbucket and Bitbucket server
-   GitLab and GitLab server
-   Azure DevOps (Azure Repos)

## Specifying repositories

You can select repos to count in multiple ways. The tool understands the different grouping structures within each VCS. For example, GitHub has a flat structure, where organizations or users are at the top level and repos are within an org / user, while GitLab allows you to create groups and subgroups, and create repos within any level of the group hierarchy. The tool provides VCS-specific options to allow you to count repos in as fine-grained a way as possible.

Note that different VCSes use different terms for these concepts:

| VCS                          | Structure                                                          |
| ---------------------------- | ------------------------------------------------------------------ |
| GitHub.com and GitHub server | Organization -> Repository                                         |
| Bitbucket.org                | Workspace -> Repository                                            |
| Bitbucket server             | Project -> Repository                                              |
| GitLab.com and GitLab server | Group [-> subgroup -> subsubgroup ...] -> Project (AKA repository) |
| Azure DevOps                 | Organization -> Project -> Repository                              |

The tool accepts VCS-native arguments (e.g., `--orgs` for GitHub, `--workspaces` for bitbucket.org). In some cases, we may use more general terms in a VCS agnostic way. For example, if you see the term "organization" in these docs, it may refer to Bitbucket workspaces, which are conceptually identical for the purposes of this tool.

Generally, for each VCS, you can provide a list of orgs / workspaces / groups as well as a list of repos, and you can also skip individual repos within those. If the VCS supports repos tied to a user (not an org), you can also provide a username in place of the org name.

In general, you can also provide none of these arguments (e.g., no `--orgs`, no `--repos`) to make the tool fetch as many repos as it can using the provided token, and count all of them. This is similar to the list if repos you would see in the Prisma Cloud platform while configuring a new VCS integration. However, due to some of the differences between personal access tokens and the oauth tokens used by the platform, this list may not match exactly, and in some cases may not be possible to retrieve at all. We recommend at least specifying `--orgs`, `--workspaces`, etc. See the VCS-specific help text for more details.

See the examples below for more details.

For repositories to include / skip (and for projects, for Azure DevOps), you can also specify the list in a file, which may be easier when working with large numbers of repos and when you cannot specify organizations for some reason.

By default, this tool will exclude any public repo, same as the Prisma Cloud platform. You can override this behavior with the `--include-public` flag if you wish to include these for any reason. Note that some VCSes have an "internal" visibility, which is between public and private. These are considered private repos for the purpose of counting contributors.

### Examples

In the examples below, note that we are not worrying about the public / private repo distinction, unless noted. Just remember that by default, public repos will be excluded. Some arguments, like `--token`, are omitted for brevity.

Note that the order in which you specify these options does not matter. The tool will collect all matching repos and then subtract all matching "skip" repos.

**Two GitHub orgs**

`redshirts github --orgs mygithuborg,anotherorg`

**Two GitHub orgs, including public repos**

`redshirts github --orgs mygithuborg,anotherorg --include-public`

**One Bitbucket workspace plus two other repos**

`redshirts bitbucket --workspaces myworkspace --repos user1/repo1,anotherworkspace/anotherepo`

**One GitLab group and all its subgroups**

`redshirts gitlab --groups somegroup`

**Two GitLab subgroups (and their subgroups) of a GitLab group**

`redshirts gitlab --groups somegroup/subgroup1,somegroup/subgroup2`

**One GitLab group and all its subgroups, except for one repo**

`redshirts gitlab --groups somegroup --skip-repos somegroup/repo1`

**One Bitbucket workspace, except one repo, plus one other repo**

`redshirts bitbucket --workspaces myworkspace --repos user1/repo1 --skip-repo myworkspace/repo-to-skip`

**One Azure DevOps org, plus one project from another org**

`redshirts azuredevops --orgs myorg --projects anotherorg/project1`

**One Azure DevOps org, plus one project from another org, plus one repo from another project, and skip some repos**

`redshirts azuredevops --orgs myorg --projects anotherorg/project1 --repos anotherorg/project2/repo2 --skip-repos myorg/project1/repo-to-skip,anotherorg/project1/repo-to-skip`

**One Azure DevOps org, but skip one project within that org, but include one repo within that project**

_This is not possible directly, because of the logic described above - we will collect all the repos first, and then subtract all the "skip" repos. To accomplish this, you can more granularly specify what to include:_

`redshirts azuredevops --repos myorg/project-to-skip/repo-to-include --projects myorg/project2,myorg/project3,myorg/project4`

## Authentication

This tool requires a personal access token for your respective VCS. Different VCSes have different names for the same concept, and the specific capabilities of these tokens vary by VCS. Generally these tokens require read access to organization, user, and repo data. The exact granularity of access that you can grant varies by VCS. See the VCS-specific help text below for more information.

Every VCS requires a token, which you can pass via the `--token` argument or the environment variable `REDSHIRTS_TOKEN`. Some VCSes may require additional parameters (e.g., a username).

## Connectivity

If you are behind a corporate VPN, this tool may not be able to reach the VCS APIs. If you encounter SSL-related errors in the output of a command, you will likely either need to disable your VPN or private the certificate chain for the VCS. See [this page](https://www.baeldung.com/linux/ssl-certificates) for different options to obtain the certificate chain file (`.pem` file) to use with the `--ca-cert` option. Note that the VCS API hostname may differ from the hostname you normally use in a browser:

| VCS           | API hostname for cert chain |
| ------------- | --------------------------- |
| github.com    | api.github.com              |
| bitbucket.org | api.bitbucket.org           |
| gitlab.com    | gitlab.com                  |
| Azure DevOps  | dev.azure.com               |

For any server / self-hosted versions, the API hostname is the same as the server hostname.

## Rate limiting

This tool will attempt to work within the rate limits of the VCS. The exact rate limiting mechanism differs by VCS, and in some cases the tool cannot perfectly avoid hitting a rate limit. The tool will respond to being rate limited by pausing or backing off, and continuing later.

See [advanced](./advanced.md) for more information on rate limiting.

## Self-hosted server

To connect to a self-hosted or on-prem VCS, you must provide the hostname of your server, and optionally the protocol and port for any non-standard values. Specifically, you must specify if the protocol is `HTTP` and if the port is not `443` for `HTTPS` or `80` for `HTTP`.

Here are some examples of different arguments you can provide and the resulting server URL:

| Arguments                                              | Server URL                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------- |
| `--host git.mycompany.com`                             | `https://git.mycompany.com` (HTTPS is default; port 443 is implicit) |
| `--host git.mycompany.com --protocol http`             | `http://git.mycompany.com` (port 80 is implicit)                     |
| `--host git.mycompany.com --port 9999`                 | `https://git.mycompany.com:9999`                                     |
| `--host git.mycompany.com --protocol http --port 9999` | `http://git.mycompany.com:9999`                                      |
