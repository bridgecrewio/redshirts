# Advanced configuration

## Rate limiting

Different VCSes have different rate limiting mechanisms. This page describes them and how Redshirts attempts to avoid hitting rate limits, or recovering if it happens anyways.

### GitHub.com, GitLab.com

GitHub.com and GitLab.com return rate limit details in the response headers for every API call. Thus, we always know how many API calls are left in our current rate limit, and when it resets. It is possible that other users of this same token are consuming the rate limit at the same time, and thus it is possible that the rate limit response is not perfectly accurate. Redshirts will stop and wait for the rate limit reset timer when there is a small, but nonzero, number of requests remaining, according to the response header. You can control this value with the environment variable `REDSHIRTS_REQUESTS_REMAINING_BUFFER`. You can set it to `0` if you are certain that the token you provide is not in use anywhere else.

### GitHub server

If you enabled rate limiting on your GitHub server, then it will be applied in the exact same was as for GitHub.com. If rate limiting is not enabled, then Redshirts will not throttle requests.

### GitLab server and Azure DevOps

GitLab server and Azure DevOps do not consistently send rate limit details in response headers. If they are present, the tool will honor them as with github.com and gitlab.com, above. If they are not present, the only way to know if we hit a rate limit is with the rate limit response code of 429. At that point, the tool will pause until the rate limit refreshes. `REDSHIRTS_REQUESTS_REMAINING_BUFFER` will also be used if the API response contains the rate limit information.

### Bitbucket.org

Bitbucket.org provides a request limit of 1000 requests per hour, refreshed on a rolling per-minute basis. This means that if we make 1000 requests in one minute, then we cannot make more requests for one hour. At that point, we can then make 1000 requests again. If we make 500 requests in one minute, and 500 requests 10 minutes from now, then we will refresh to 500 requests in one hour.

The tool will attempt to burst requests as fast as possible while also tracking and honoring the refresh rate. For example, if the tool is able to send 5 requests per second (due to network speed limitations, etc), then it will send 5 requests per second until hitting the 1000 request limit, pause until the initial requests start refreshing, and then continue.

You can control this in two ways:

-   The `--requests-per-hour` option, which allows you to override the default value of 1000.
-   The `REDSHIRTS_MAX_REQUESTS_PER_SECOND` environment variable, which allows you to apply a persistent throttle on the speed of burst requests. Changing this value will add a delay between every API call, and will increase the overall runtime of the tool.

If you are consistently hitting rate limits, we recommend first reducing the `--requests-per-hour` option before throttling the requests per second.

### Bitbucket server

Bitbucket server ultimately works the same as bitbucket.org, but you configure the rate limiting differently in the server. It is unique in that you specify a "token bucket size" and "refill rate". To translate this to requests per hour, you must calculate how many requests a client can submit in an hour without being limited. This is basically equal to the refill rate, which is the number of requests per second we can submit indefinitely without being limited. The requests per hour is then the refill rate \* 3600

The same tuning options for bitbucket.org apply to bitbucket server.

## Viewing API request and git log details

If you wish to enable extra-verbose logging, including all of the API response bodies and `git log` output (if running the `local` command), set the environment variable `REDSHIRTS_LOG_API_RESPONSES` to `true`. Note that depending on the VCS, this may result in sensitive information (your token) in the output.
