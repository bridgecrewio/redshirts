import {expect, test} from '@oclif/test';

describe('github', () => {
  test
  .stdout()
  .command(['github'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world');
  });

  test
  .stdout()
  .command(['github', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff');
  });
});
